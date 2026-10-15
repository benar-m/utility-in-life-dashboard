from django.db import transaction
from django.db.models import Count, Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.academics.models import ClassEnrollment, TeacherSubject
from apps.academics.serializers import (
    ClassEnrollmentSerializer,
    StudentClassAssignmentSerializer,
)

from .models import Student, StudentGuardian, TeacherProfile, UserInvitation
from .permissions import IsOwnerOrAdmin
from .serializers import (
    InvitationCreateSerializer,
    InvitationIssuedSerializer,
    InvitationSerializer,
    StudentSerializer,
    TeacherSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ("status", "grade_level")
    search_fields = ("first_name", "last_name", "grade_level")
    ordering_fields = ("first_name", "last_name", "joined_at")
    ordering = ("first_name", "last_name")

    def get_queryset(self):
        return Student.objects.select_related("user").prefetch_related(
            Prefetch(
                "studentguardian_set",
                queryset=StudentGuardian.objects.select_related("guardian__user"),
            ),
            "user__invitations",
        )

    @extend_schema(
        request=StudentClassAssignmentSerializer,
        responses=ClassEnrollmentSerializer,
    )
    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        student = self.get_object()
        if student.status != Student.Status.ACTIVE:
            return Response(
                {"detail": "Only active students can be assigned to a class."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = StudentClassAssignmentSerializer(
            data=request.data,
            context={"student": student, "actor": request.user},
        )
        serializer.is_valid(raise_exception=True)
        enrollment = serializer.save()
        return Response(ClassEnrollmentSerializer(enrollment).data)

    @extend_schema(request=None, responses=StudentSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def archive(self, request, pk=None):
        student = self.get_object()
        student.status = Student.Status.INACTIVE
        student.save(update_fields=("status", "updated_at"))
        student.class_enrollments.filter(status=ClassEnrollment.Status.ACTIVE).update(
            status=ClassEnrollment.Status.WITHDRAWN
        )
        if student.user_id:
            student.user.is_active = False
            student.user.save(update_fields=("is_active",))
        return Response(StudentSerializer(student).data)


class TeacherViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "head", "options"]
    filterset_fields = ("status",)
    search_fields = ("user__first_name", "user__last_name", "user__email")
    ordering = ("user__first_name", "user__last_name")

    def get_queryset(self):
        return (
            TeacherProfile.objects.select_related("user")
            .prefetch_related(
                Prefetch(
                    "subject_links",
                    queryset=TeacherSubject.objects.select_related("subject"),
                )
            )
            .annotate(assigned_classes=Count("classes", distinct=True))
        )


class InvitationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = ("role",)
    ordering_fields = ("created_at", "expires_at")
    ordering = ("-created_at",)

    def get_queryset(self):
        return UserInvitation.objects.select_related("invited_by", "user__student_profile")

    def get_serializer_class(self):
        if self.action == "create":
            return InvitationCreateSerializer
        return InvitationSerializer

    @extend_schema(
        request=InvitationCreateSerializer,
        responses={201: InvitationIssuedSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invitation = serializer.save()
        output = InvitationIssuedSerializer(
            invitation,
            context={"raw_token": serializer.raw_token},
        )
        return Response(output.data, status=status.HTTP_201_CREATED)
