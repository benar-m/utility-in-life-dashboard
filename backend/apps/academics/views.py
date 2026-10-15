from django.db import transaction
from django.db.models import Count, Prefetch
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsOwnerOrAdmin
from apps.campaigns.models import EnrollmentCampaign
from apps.campaigns.serializers import campaign_public_url

from .models import ClassEnrollment, ClassGroup, ScheduleRule, Subject
from .serializers import ClassCostSerializer, ClassGroupSerializer, SubjectSerializer


class SubjectViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    queryset = Subject.objects.filter(is_active=True)


class ClassGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ClassGroupSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "head", "options"]
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
            .annotate(enrolled_count=Count("enrollments", distinct=True))
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
