from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Student
from apps.accounts.permissions import IsLinkedStudent, IsTeacher

from .models import ClassEnrollment, ClassGroup, ScheduleRule
from .portal_serializers import (
    MeetingLinkSerializer,
    StudentPortalClassSerializer,
    StudentPortalSummarySerializer,
    TeacherPortalClassSerializer,
    TeacherPortalSummarySerializer,
)


def portal_class_queryset(enrollment_queryset):
    return ClassGroup.objects.select_related(
        "subject",
        "term",
        "primary_teacher__user",
    ).prefetch_related(
        Prefetch(
            "schedule_rules",
            queryset=ScheduleRule.objects.order_by("weekday", "start_time"),
        ),
        Prefetch(
            "enrollments",
            queryset=enrollment_queryset.select_related("student"),
            to_attr="portal_enrollments",
        ),
    )


class TeacherPortalClassViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ClassGroup.objects.none()
    serializer_class = TeacherPortalClassSerializer
    permission_classes = [IsTeacher]
    filterset_fields = ("status",)
    search_fields = ("name", "subject__name", "grade_level")
    ordering = ("name",)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        enrollments = ClassEnrollment.objects.filter(status=ClassEnrollment.Status.ACTIVE)
        return portal_class_queryset(enrollments).filter(primary_teacher__user=self.request.user)

    @extend_schema(
        request=MeetingLinkSerializer,
        responses=TeacherPortalClassSerializer,
    )
    @action(detail=True, methods=["patch"], url_path="meeting-link")
    def meeting_link(self, request, pk=None):
        class_group = self.get_object()
        serializer = MeetingLinkSerializer(class_group, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        output = TeacherPortalClassSerializer(class_group, context={"request": request})
        return Response(output.data)


class StudentPortalClassViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ClassGroup.objects.none()
    serializer_class = StudentPortalClassSerializer
    permission_classes = [IsLinkedStudent]
    filterset_fields = ("status",)
    ordering = ("name",)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        student = self.request.user.student_profile
        enrollments = ClassEnrollment.objects.filter(
            student=student,
            status=ClassEnrollment.Status.ACTIVE,
        )
        return (
            portal_class_queryset(enrollments)
            .filter(
                enrollments__student=student,
                enrollments__status=ClassEnrollment.Status.ACTIVE,
                status=ClassGroup.Status.ACTIVE,
            )
            .distinct()
        )


class TeacherPortalSummaryView(APIView):
    permission_classes = [IsTeacher]

    @extend_schema(responses=TeacherPortalSummarySerializer)
    def get(self, request):
        classes = ClassGroup.objects.filter(
            primary_teacher__user=request.user,
            status=ClassGroup.Status.ACTIVE,
        )
        return Response(
            {
                "assigned_classes": classes.count(),
                "active_students": ClassEnrollment.objects.filter(
                    class_group__in=classes,
                    status=ClassEnrollment.Status.ACTIVE,
                    student__status=Student.Status.ACTIVE,
                )
                .values("student_id")
                .distinct()
                .count(),
                "weekly_lessons": ScheduleRule.objects.filter(class_group__in=classes).count(),
                "missing_meeting_links": classes.filter(default_meeting_url="").count(),
            }
        )


class StudentPortalSummaryView(APIView):
    permission_classes = [IsLinkedStudent]

    @extend_schema(responses=StudentPortalSummarySerializer)
    def get(self, request):
        student = request.user.student_profile
        from apps.payments.services import active_restrictions

        restriction = active_restrictions(student).first()
        enrollments = ClassEnrollment.objects.filter(
            student=student,
            status=ClassEnrollment.Status.ACTIVE,
            class_group__status=ClassGroup.Status.ACTIVE,
        )
        return Response(
            {
                "student_name": str(student),
                "grade_level": student.grade_level,
                "active_classes": enrollments.count(),
                "weekly_lessons": ScheduleRule.objects.filter(
                    class_group__enrollments__in=enrollments
                )
                .distinct()
                .count(),
                "pending_balance_classes": enrollments.filter(
                    financial_status=ClassEnrollment.FinancialStatus.PENDING
                ).count(),
                "access_restricted": restriction is not None,
                "restriction_reason": restriction.get_reason_display() if restriction else None,
            }
        )
