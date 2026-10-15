from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.models import Student

from .models import ClassGroup
from .serializers import ScheduleRuleSerializer, SubjectSerializer


class PortalClassSerializer(serializers.ModelSerializer):
    subject = SubjectSerializer(read_only=True)
    term = serializers.SerializerMethodField()
    teacher = serializers.SerializerMethodField()
    schedule_rules = ScheduleRuleSerializer(many=True, read_only=True)

    @extend_schema_field(serializers.DictField())
    def get_term(self, obj):
        return {
            "id": obj.term_id,
            "name": obj.term.name,
            "starts_on": obj.term.starts_on,
            "ends_on": obj.term.ends_on,
        }

    @extend_schema_field(serializers.DictField())
    def get_teacher(self, obj):
        user = obj.primary_teacher.user
        return {
            "id": obj.primary_teacher_id,
            "name": user.get_full_name() or user.email,
        }


class TeacherRosterStudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ("id", "full_name", "grade_level", "status")

    @extend_schema_field(serializers.CharField())
    def get_full_name(self, obj):
        return str(obj)


class TeacherPortalClassSerializer(PortalClassSerializer):
    roster = serializers.SerializerMethodField()
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassGroup
        fields = (
            "id",
            "name",
            "subject",
            "grade_level",
            "term",
            "teacher",
            "schedule_rules",
            "default_meeting_url",
            "status",
            "roster",
            "enrolled_count",
        )

    @extend_schema_field(TeacherRosterStudentSerializer(many=True))
    def get_roster(self, obj):
        students = [enrollment.student for enrollment in obj.portal_enrollments]
        return TeacherRosterStudentSerializer(students, many=True).data

    @extend_schema_field(serializers.IntegerField())
    def get_enrolled_count(self, obj):
        return len(obj.portal_enrollments)


class StudentPortalClassSerializer(PortalClassSerializer):
    financial_status = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    meeting_ready = serializers.SerializerMethodField()
    access_restricted = serializers.SerializerMethodField()
    restriction_reason = serializers.SerializerMethodField()
    can_attend = serializers.SerializerMethodField()

    class Meta:
        model = ClassGroup
        fields = (
            "id",
            "name",
            "subject",
            "grade_level",
            "term",
            "teacher",
            "schedule_rules",
            "status",
            "financial_status",
            "balance_due",
            "currency",
            "meeting_ready",
            "access_restricted",
            "restriction_reason",
            "can_attend",
        )

    @extend_schema_field(serializers.CharField())
    def get_financial_status(self, obj):
        enrollment = next(iter(obj.portal_enrollments), None)
        return enrollment.financial_status if enrollment else "NOT_CONFIGURED"

    @extend_schema_field(serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True))
    def get_balance_due(self, obj):
        enrollment = next(iter(obj.portal_enrollments), None)
        return enrollment.balance_due if enrollment else None

    @extend_schema_field(serializers.BooleanField())
    def get_meeting_ready(self, obj):
        return bool(obj.default_meeting_url)

    def get_active_restriction(self, obj):
        if not hasattr(self, "_active_restriction"):
            from apps.payments.services import active_restrictions

            request = self.context.get("request")
            student = getattr(getattr(request, "user", None), "student_profile", None)
            self._active_restriction = (
                active_restrictions(student).first() if student is not None else None
            )
        return self._active_restriction

    @extend_schema_field(serializers.BooleanField())
    def get_access_restricted(self, obj):
        return self.get_active_restriction(obj) is not None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_restriction_reason(self, obj):
        restriction = self.get_active_restriction(obj)
        return restriction.get_reason_display() if restriction else None

    @extend_schema_field(serializers.BooleanField())
    def get_can_attend(self, obj):
        return bool(obj.default_meeting_url) and self.get_active_restriction(obj) is None


class MeetingLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassGroup
        fields = ("default_meeting_url",)

    def validate_default_meeting_url(self, value):
        if value and not value.lower().startswith("https://"):
            raise serializers.ValidationError("Meeting links must use HTTPS.")
        return value


class TeacherPortalSummarySerializer(serializers.Serializer):
    assigned_classes = serializers.IntegerField()
    active_students = serializers.IntegerField()
    weekly_lessons = serializers.IntegerField()
    missing_meeting_links = serializers.IntegerField()


class StudentPortalSummarySerializer(serializers.Serializer):
    student_name = serializers.CharField()
    grade_level = serializers.CharField()
    active_classes = serializers.IntegerField()
    weekly_lessons = serializers.IntegerField()
    pending_balance_classes = serializers.IntegerField()
    access_restricted = serializers.BooleanField()
    restriction_reason = serializers.CharField(allow_null=True)
