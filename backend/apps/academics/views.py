from datetime import date

from django.db import transaction
from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsOwnerOrAdmin
from apps.campaigns.models import EnrollmentCampaign
from apps.campaigns.serializers import campaign_public_url

from .attendance import (
    AttendanceSaveSerializer,
    attendance_summary,
    lesson_sheet,
    parse_range,
    save_attendance,
)
from .models import (
    AcademicTerm,
    ClassEnrollment,
    ClassGroup,
    ScheduleRule,
    Subject,
    TeacherSubject,
)
from .portal_serializers import MeetingLinkSerializer
from .serializers import (
    AcademicTermSerializer,
    ClassCostSerializer,
    ClassGroupSerializer,
    ClassUpdateSerializer,
    RosterEntrySerializer,
    SubjectSerializer,
)


class SubjectViewSet(
    mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    """Anyone signed in can list subjects; only admins add, rename, retire or merge them.

    `?include_retired=1` (admins) also lists retired subjects.
    """

    serializer_class = SubjectSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = Subject.objects.order_by("name")
        if self.request.query_params.get("include_retired") and self.request.user.role in (
            "OWNER",
            "ADMIN",
        ):
            return queryset
        return queryset.filter(is_active=True)

    def get_permissions(self):
        if self.action in ("create", "partial_update", "update", "merge"):
            return [IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        name = serializer.validated_data.get("name")
        if (
            name
            and Subject.objects.filter(name__iexact=name.strip())
            .exclude(pk=serializer.instance.pk)
            .exists()
        ):
            raise serializers.ValidationError(
                {"name": "Another subject already has this name. Merge them instead."}
            )
        serializer.save()

    @extend_schema(
        request=inline_serializer("SubjectMerge", {"into_id": serializers.IntegerField()}),
        responses=SubjectSerializer,
    )
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def merge(self, request, pk=None):
        """Move everything that uses this subject onto another, then remove it."""
        from apps.resources.models import Resource

        source = self.get_object()
        target = (
            Subject.objects.filter(pk=request.data.get("into_id")).exclude(pk=source.pk).first()
        )
        if target is None:
            return Response(
                {"detail": "Choose a different subject to merge into."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for link in TeacherSubject.objects.filter(subject=source):
            TeacherSubject.objects.get_or_create(teacher=link.teacher, subject=target)
        TeacherSubject.objects.filter(subject=source).delete()
        ClassGroup.objects.filter(subject=source).update(subject=target)
        Resource.objects.filter(subject=source).update(subject=target)
        source.delete()
        return Response(SubjectSerializer(target).data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        name = " ".join(serializer.validated_data["name"].split())
        if name.islower():
            name = name.title()
        subject = Subject.objects.filter(name__iexact=name).first()
        created = subject is None
        if created:
            subject = Subject.objects.create(name=name)
        elif not subject.is_active:
            subject.is_active = True
            subject.save(update_fields=("is_active",))
        return Response(
            SubjectSerializer(subject).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AcademicTermViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicTermSerializer
    permission_classes = [IsOwnerOrAdmin]
    pagination_class = None
    http_method_names = ["get", "post", "patch", "head", "options"]
    queryset = AcademicTerm.objects.order_by("-starts_on")


class ClassGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ClassGroupSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ("status", "subject", "primary_teacher")
    search_fields = ("name", "subject__name", "grade_level")
    ordering = ("name",)

    def get_queryset(self):
        return (
            ClassGroup.objects.select_related("subject", "term", "primary_teacher__user")
            .prefetch_related(
                Prefetch(
                    "schedule_rules",
                    queryset=ScheduleRule.objects.order_by("weekday", "start_time"),
                ),
                Prefetch(
                    "enrollments",
                    queryset=ClassEnrollment.objects.select_related("student"),
                ),
            )
            .annotate(
                enrolled_count=Count(
                    "enrollments",
                    filter=Q(enrollments__status=ClassEnrollment.Status.ACTIVE),
                    distinct=True,
                )
            )
        )

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name="ClassEnrollmentLinkResponse",
            fields={
                "campaign_id": serializers.IntegerField(),
                "public_url": serializers.URLField(),
            },
        ),
    )
    @action(detail=True, methods=["post"], url_path="enrollment-link")
    def enrollment_link(self, request, pk=None):
        class_group = self.get_object()
        campaign, _ = EnrollmentCampaign.objects.get_or_create(
            target_class=class_group,
            status=EnrollmentCampaign.Status.OPEN,
            defaults={
                "title": f"Enroll in {class_group.name}",
                "description": (
                    f"Apply to join {class_group.name}. An administrator will review your details."
                ),
                "created_by": request.user,
            },
        )
        return Response(
            {
                "campaign_id": campaign.pk,
                "public_url": campaign_public_url(campaign),
            }
        )

    @extend_schema(request=ClassCostSerializer, responses=ClassGroupSerializer)
    @action(detail=True, methods=["post"], url_path="cost")
    @transaction.atomic
    def cost(self, request, pk=None):
        class_group = self.get_object()
        serializer = ClassCostSerializer(class_group, data=request.data)
        serializer.is_valid(raise_exception=True)
        apply_to_active = serializer.validated_data.pop("apply_to_active_enrollments", True)
        class_group = serializer.save()

        if apply_to_active:
            enrollments = class_group.enrollments.filter(
                status=ClassEnrollment.Status.ACTIVE,
                financial_status__in=(
                    ClassEnrollment.FinancialStatus.NOT_CONFIGURED,
                    ClassEnrollment.FinancialStatus.PENDING,
                ),
            )
            if class_group.cost_amount is None:
                enrollments.update(
                    financial_status=ClassEnrollment.FinancialStatus.NOT_CONFIGURED,
                    balance_due=None,
                )
            else:
                enrollments.update(
                    financial_status=ClassEnrollment.FinancialStatus.PENDING,
                    balance_due=class_group.cost_amount,
                )
            from apps.payments.services import ensure_invoice_for_enrollment

            invoice_enrollments = class_group.enrollments.select_related(
                "class_group", "student"
            ).filter(
                status=ClassEnrollment.Status.ACTIVE,
                financial_status=ClassEnrollment.FinancialStatus.PENDING,
            )
            for enrollment in invoice_enrollments:
                ensure_invoice_for_enrollment(enrollment, actor=request.user)

        output = ClassGroupSerializer(self.get_queryset().get(pk=class_group.pk))
        return Response(output.data, status=status.HTTP_200_OK)

    @extend_schema(request=MeetingLinkSerializer, responses=ClassGroupSerializer)
    @action(detail=True, methods=["post"], url_path="meeting-link")
    def meeting_link(self, request, pk=None):
        class_group = self.get_object()
        serializer = MeetingLinkSerializer(class_group, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ClassGroupSerializer(self.get_queryset().get(pk=class_group.pk)).data)

    @extend_schema(request=ClassUpdateSerializer, responses=ClassGroupSerializer)
    def partial_update(self, request, *args, **kwargs):
        class_group = self.get_object()
        serializer = ClassUpdateSerializer(class_group, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ClassGroupSerializer(self.get_queryset().get(pk=class_group.pk)).data)

    @extend_schema(request=None, responses=RosterEntrySerializer(many=True))
    @action(detail=True, methods=["get"])
    def roster(self, request, pk=None):
        class_group = self.get_object()
        enrollments = (
            class_group.enrollments.select_related("student")
            .filter(status=ClassEnrollment.Status.ACTIVE)
            .order_by("student__first_name", "student__last_name")
        )
        return Response(RosterEntrySerializer(enrollments, many=True).data)

    @extend_schema(
        request=inline_serializer("WithdrawRequest", {"enrollment_id": serializers.IntegerField()}),
        responses=RosterEntrySerializer,
    )
    @action(detail=True, methods=["post"])
    def withdraw(self, request, pk=None):
        class_group = self.get_object()
        enrollment = class_group.enrollments.filter(
            pk=request.data.get("enrollment_id"), status=ClassEnrollment.Status.ACTIVE
        ).first()
        if enrollment is None:
            return Response(
                {"detail": "That student isn't actively enrolled in this class."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        enrollment.status = ClassEnrollment.Status.WITHDRAWN
        enrollment.save(update_fields=("status",))
        return Response(RosterEntrySerializer(enrollment).data)

    @extend_schema(request=AttendanceSaveSerializer, responses={200: None})
    @action(detail=True, methods=["get", "post"])
    def attendance(self, request, pk=None):
        """GET ?date=YYYY-MM-DD returns the lesson sheet; POST saves it."""
        class_group = self.get_object()
        if request.method == "GET":
            try:
                lesson_date = date.fromisoformat(request.query_params.get("date", ""))
            except ValueError:
                lesson_date = timezone.localdate()
            return Response(lesson_sheet(class_group, lesson_date))
        serializer = AttendanceSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            save_attendance(
                class_group,
                serializer.validated_data["lesson_date"],
                serializer.validated_data["records"],
                request.user,
            )
        )


class AttendanceSummaryView(APIView):
    permission_classes = [IsOwnerOrAdmin]

    @extend_schema(responses={200: None})
    def get(self, request):
        start, end = parse_range(request.query_params)
        class_id = request.query_params.get("class_id") or None
        return Response(attendance_summary(start, end, class_id))
