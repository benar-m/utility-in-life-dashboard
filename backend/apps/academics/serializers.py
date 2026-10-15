from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.accounts.models import Student, TeacherProfile

from .models import AcademicTerm, ClassEnrollment, ClassGroup, ScheduleRule, Subject, TeacherSubject
from .services import assign_student_to_class, financial_defaults_for_class


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ("id", "name")


class ScheduleRuleSerializer(serializers.ModelSerializer):
    weekday_label = serializers.CharField(source="get_weekday_display", read_only=True)

    class Meta:
        model = ScheduleRule
        fields = ("id", "weekday", "weekday_label", "start_time", "end_time")


class ClassGroupSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(write_only=True)
    term_name = serializers.CharField(write_only=True)
    term_starts_on = serializers.DateField(write_only=True)
    term_ends_on = serializers.DateField(write_only=True)
    teacher_id = serializers.PrimaryKeyRelatedField(
        source="primary_teacher",
        queryset=TeacherProfile.objects.filter(status=TeacherProfile.Status.ACTIVE),
        write_only=True,
    )
    student_ids = serializers.PrimaryKeyRelatedField(
        source="students_to_enroll",
        queryset=Student.objects.filter(status=Student.Status.ACTIVE),
        many=True,
        write_only=True,
        required=False,
    )
    schedule_days = serializers.ListField(
        child=serializers.ChoiceField(choices=ScheduleRule.Weekday.choices),
        write_only=True,
        allow_empty=False,
    )
    schedule_start_time = serializers.TimeField(write_only=True)
    schedule_end_time = serializers.TimeField(write_only=True)
    subject = SubjectSerializer(read_only=True)
    term = serializers.SerializerMethodField()
    teacher = serializers.SerializerMethodField()
    schedule_rules = ScheduleRuleSerializer(many=True, read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassGroup
        fields = (
            "id",
            "name",
            "subject",
            "subject_name",
            "grade_level",
            "term",
            "term_name",
            "term_starts_on",
            "term_ends_on",
            "teacher",
            "teacher_id",
            "capacity",
            "cost_amount",
            "currency",
            "default_meeting_url",
            "status",
            "student_ids",
            "schedule_days",
            "schedule_start_time",
            "schedule_end_time",
            "schedule_rules",
            "enrolled_count",
            "created_at",
        )
        read_only_fields = ("id", "cost_amount", "currency", "created_at")

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

    @extend_schema_field(serializers.IntegerField())
    def get_enrolled_count(self, obj):
        annotated_count = getattr(obj, "enrolled_count", None)
        if annotated_count is not None:
            return annotated_count
        return obj.enrollments.count()

    def validate_default_meeting_url(self, value):
        if value and not value.lower().startswith("https://"):
            raise serializers.ValidationError("Meeting links must use HTTPS.")
        return value

    def validate(self, attrs):
        starts_on = attrs["term_starts_on"]
        ends_on = attrs["term_ends_on"]
        if ends_on < starts_on:
            raise serializers.ValidationError({"term_ends_on": "Term end must be after its start."})
        if attrs["schedule_end_time"] <= attrs["schedule_start_time"]:
            raise serializers.ValidationError(
                {"schedule_end_time": "Class end time must be after its start."}
            )
        capacity = attrs.get("capacity")
        students = attrs.get("students_to_enroll", [])
        if capacity and len(students) > capacity:
            raise serializers.ValidationError(
                {"student_ids": "Selected students exceed the class capacity."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        subject_name = validated_data.pop("subject_name").strip()
        term_name = validated_data.pop("term_name").strip()
        term_starts_on = validated_data.pop("term_starts_on")
        term_ends_on = validated_data.pop("term_ends_on")
        students = validated_data.pop("students_to_enroll", [])
        schedule_days = sorted(set(validated_data.pop("schedule_days")))
        start_time = validated_data.pop("schedule_start_time")
        end_time = validated_data.pop("schedule_end_time")
        teacher = validated_data["primary_teacher"]

        subject, _ = Subject.objects.get_or_create(
            name__iexact=subject_name,
            defaults={"name": subject_name},
        )
        if not TeacherSubject.objects.filter(teacher=teacher, subject=subject).exists():
            raise serializers.ValidationError(
                {"teacher_id": "The selected teacher is not assigned to this subject."}
            )

        term = AcademicTerm.objects.filter(name__iexact=term_name).first()
        if term and (term.starts_on != term_starts_on or term.ends_on != term_ends_on):
            raise serializers.ValidationError(
                {"term_name": "A term with this name already exists with different dates."}
            )
        if term is None:
            term = AcademicTerm.objects.create(
                name=term_name,
                starts_on=term_starts_on,
                ends_on=term_ends_on,
            )

        class_group = ClassGroup.objects.create(
            subject=subject,
            term=term,
            created_by=self.context["request"].user,
            **validated_data,
        )
        ScheduleRule.objects.bulk_create(
            [
                ScheduleRule(
                    class_group=class_group,
                    weekday=weekday,
                    start_time=start_time,
                    end_time=end_time,
                )
                for weekday in schedule_days
            ]
        )
        financial_defaults = financial_defaults_for_class(class_group)
        ClassEnrollment.objects.bulk_create(
            [
                ClassEnrollment(
                    class_group=class_group,
                    student=student,
                    **financial_defaults,
                )
                for student in students
            ]
        )
        from apps.payments.services import ensure_invoice_for_enrollment

        for enrollment in class_group.enrollments.select_related("class_group", "student"):
            ensure_invoice_for_enrollment(
                enrollment,
                actor=self.context["request"].user,
            )
        return class_group


class ClassCostSerializer(serializers.ModelSerializer):
    currency = serializers.CharField(max_length=3)
    apply_to_active_enrollments = serializers.BooleanField(default=True, write_only=True)

    class Meta:
        model = ClassGroup
        fields = ("cost_amount", "currency", "apply_to_active_enrollments")

    def validate_currency(self, value):
        return value.strip().upper()


class StudentClassAssignmentSerializer(serializers.Serializer):
    class_id = serializers.PrimaryKeyRelatedField(
        source="class_group",
        queryset=ClassGroup.objects.filter(status=ClassGroup.Status.ACTIVE),
    )

    def save(self, **kwargs):
        enrollment, _ = assign_student_to_class(
            self.context["student"],
            self.validated_data["class_group"],
            actor=self.context.get("actor"),
        )
        return enrollment


class ClassEnrollmentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source="class_group.name", read_only=True)
    student_name = serializers.CharField(source="student.__str__", read_only=True)

    class Meta:
        model = ClassEnrollment
        fields = (
            "id",
            "class_group",
            "class_name",
            "student",
            "student_name",
            "status",
            "financial_status",
            "balance_due",
            "enrolled_at",
        )
