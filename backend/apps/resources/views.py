from django.db.models import Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.academics.models import ClassEnrollment, ClassGroup, ScheduleRule, TeacherSubject
from apps.accounts.models import Student, User
from apps.accounts.permissions import IsLinkedStudent, IsOwnerOrAdmin, IsTeacher

from .models import Resource, ResourceAccessGrant, ResourceInterest
from .serializers import (
    PublicClassSerializer,
    PublicResourceInterestSerializer,
    PublicResourceSerializer,
    ResourceInterestSerializer,
    ResourceSerializer,
)


class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    filterset_fields = ("is_published", "resource_type", "subject")
    search_fields = ("title", "description", "grade_level", "subject__name")
    ordering = ("-created_at", "title")

    def get_queryset(self):
        return Resource.objects.select_related("subject")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        resource = self.get_object()
        if resource.interests.exists():
            return Response(
                {
                    "detail": "Students have requested this resource, so it can't be deleted. "
                    "Unpublish it instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        resource.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResourceInterestViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ResourceInterestSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ("status", "resource")
    ordering = ("-created_at",)

    def get_queryset(self):
        return ResourceInterest.objects.select_related("resource")

    @extend_schema(request=None, responses=ResourceInterestSerializer)
    @action(detail=True, methods=["post"])
    def grant(self, request, pk=None):
        """Give the requester access: match their email to a student account (or a guardian's
        only child), record the grant and mark the request fulfilled."""
        interest = self.get_object()
        student = Student.objects.filter(user__email__iexact=interest.email).first()
        if student is None:
            children = Student.objects.filter(
                studentguardian__guardian__user__email__iexact=interest.email,
                status=Student.Status.ACTIVE,
            ).distinct()
            student = children.first() if children.count() == 1 else None
        if student is None:
            return Response(
                {
                    "detail": f"No single student account matches {interest.email}. Invite the "
                    "student to the portal first, then grant access."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        ResourceAccessGrant.objects.get_or_create(
            resource=interest.resource, student=student, defaults={"granted_by": request.user}
        )
        interest.status = ResourceInterest.Status.FULFILLED
        interest.save(update_fields=("status", "updated_at"))
        return Response(ResourceInterestSerializer(interest).data)


class PublicCatalogView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: None},
    )
    def get(self, request):
        classes = (
            ClassGroup.objects.filter(status=ClassGroup.Status.ACTIVE)
            .select_related("subject", "term", "primary_teacher__user")
            .prefetch_related(
                Prefetch(
                    "schedule_rules",
                    queryset=ScheduleRule.objects.order_by("weekday", "start_time"),
                )
            )
            .annotate(
                enrolled_count=Count(
                    "enrollments",
                    filter=Q(enrollments__status=ClassEnrollment.Status.ACTIVE),
                    distinct=True,
                )
            )
            .order_by("subject__name", "name")
        )
        resources = Resource.objects.filter(is_published=True).select_related("subject")
        return Response(
            {
                "classes": PublicClassSerializer(classes, many=True).data,
                "resources": PublicResourceSerializer(resources, many=True).data,
            }
        )


class PublicResourceInterestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_catalog"

    @extend_schema(request=PublicResourceInterestSerializer, responses={201: None})
    def post(self, request):
        serializer = PublicResourceInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        interest = serializer.save()
        return Response({"id": interest.id, "status": "PENDING"}, status=status.HTTP_201_CREATED)


ACCESS_DENIED_MESSAGE = (
    "This resource is for enrolled students. Request access and we'll get back to you."
)


def can_open_resource(user, resource):
    """Free resources: any signed-in user. Paid: staff, or students enrolled in that subject."""
    if resource.price_amount is None or resource.price_amount == 0:
        return True
    if user.role in (User.Role.OWNER, User.Role.ADMIN, User.Role.TEACHER):
        return True
    if ResourceAccessGrant.objects.filter(resource=resource, student__user=user).exists():
        return True
    if resource.subject_id is None:
        return False
    return ClassEnrollment.objects.filter(
        student__user=user,
        status=ClassEnrollment.Status.ACTIVE,
        class_group__subject_id=resource.subject_id,
    ).exists()


class ResourceAccessView(APIView):
    """Returns a published resource's link to signed-in users who may open it."""

    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: None, 403: None})
    def get(self, request, pk):
        resource = get_object_or_404(Resource, pk=pk, is_published=True)
        if not can_open_resource(request.user, resource):
            return Response(
                {"detail": ACCESS_DENIED_MESSAGE},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({"id": resource.id, "download_url": resource.download_url})


class TeacherResourceViewSet(viewsets.ModelViewSet):
    """Teachers manage their own resources, only for subjects they teach."""

    serializer_class = ResourceSerializer
    permission_classes = [IsTeacher]
    http_method_names = ["get", "post", "patch", "head", "options"]
    ordering = ("-created_at",)

    def get_queryset(self):
        return Resource.objects.select_related("subject").filter(created_by=self.request.user)

    def _check_subject(self, serializer):
        subject = serializer.validated_data.get("subject")
        profile = self.request.user.teacher_profile
        # A subject counts if it's on the teacher's profile or they teach a class in it.
        teaches = (
            TeacherSubject.objects.filter(teacher=profile, subject=subject).exists()
            or ClassGroup.objects.filter(primary_teacher=profile, subject=subject)
            .exclude(status=ClassGroup.Status.ARCHIVED)
            .exists()
        )
        if subject is None or not teaches:
            raise ValidationError({"subject_id": "Choose one of the subjects you teach."})

    def perform_create(self, serializer):
        self._check_subject(serializer)
        # Pricing is an admin decision; teacher resources are free to their students.
        serializer.validated_data.pop("price_amount", None)
        serializer.save(created_by=self.request.user, price_amount=None)

    def perform_update(self, serializer):
        if "subject" in serializer.validated_data:
            self._check_subject(serializer)
        serializer.validated_data.pop("price_amount", None)
        serializer.save()


class StudentResourceListView(APIView):
    """Published resources, flagged with whether this student can open each one."""

    permission_classes = [IsLinkedStudent]

    @extend_schema(responses={200: None})
    def get(self, request):
        subject_ids = set(
            ClassEnrollment.objects.filter(
                student__user=request.user, status=ClassEnrollment.Status.ACTIVE
            ).values_list("class_group__subject_id", flat=True)
        )
        resources = Resource.objects.filter(is_published=True).select_related("subject")
        rows = []
        for resource in resources:
            row = PublicResourceSerializer(resource).data
            row["can_open"] = can_open_resource(request.user, resource)
            row["for_my_subjects"] = resource.subject_id in subject_ids
            rows.append(row)
        rows.sort(key=lambda row: (not row["for_my_subjects"], not row["can_open"], row["title"]))
        return Response(rows)
