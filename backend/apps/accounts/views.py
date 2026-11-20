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
    TeacherUpdateSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ("status", "grade_level")
    search_fields = (
        "first_name",
        "last_name",
        "grade_level",
        "studentguardian__guardian__user__first_name",
        "studentguardian__guardian__user__last_name",
        "studentguardian__guardian__user__email",
        "studentguardian__guardian__user__phone",
    )
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

    @extend_schema(request=None, responses=StudentSerializer)
    @action(detail=True, methods=["post"])
    def restore(self, request, pk=None):
        """Undo an archive. Class places are not restored; reassign them as needed."""
        student = self.get_object()
        if student.status == Student.Status.ACTIVE:
            return Response(StudentSerializer(student).data)
        student.status = Student.Status.ACTIVE
        student.save(update_fields=("status", "updated_at"))
        if student.user_id and student.user.has_usable_password():
            student.user.is_active = True
            student.user.save(update_fields=("is_active",))
        return Response(StudentSerializer(self.get_queryset().get(pk=student.pk)).data)

    @extend_schema(request=None, responses=ClassEnrollmentSerializer(many=True))
    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        student = self.get_object()
        enrollments = student.class_enrollments.select_related("class_group").order_by(
            "-enrolled_at"
        )
        return Response(ClassEnrollmentSerializer(enrollments, many=True).data)


class TeacherViewSet(viewsets.ModelViewSet):
    serializer_class = TeacherSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "patch", "head", "options"]
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

    @extend_schema(request=TeacherUpdateSerializer, responses=TeacherSerializer)
    def partial_update(self, request, *args, **kwargs):
        teacher = self.get_object()
        serializer = TeacherUpdateSerializer(teacher, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TeacherSerializer(self.get_queryset().get(pk=teacher.pk)).data)


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
