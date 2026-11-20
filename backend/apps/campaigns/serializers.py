import re

from django.conf import settings
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.academics.models import ClassGroup

from .models import EnrollmentApplication, EnrollmentCampaign, Program, ProgramRegistration


def campaign_public_url(campaign):
    return f"{settings.FRONTEND_URL}/enroll/{campaign.public_id}"


class EnrollmentCampaignSerializer(serializers.ModelSerializer):
    target_class_id = serializers.PrimaryKeyRelatedField(
        source="target_class",
        queryset=ClassGroup.objects.filter(status=ClassGroup.Status.ACTIVE),
        required=False,
        allow_null=True,
        write_only=True,
    )
    target_class = serializers.SerializerMethodField()
    public_url = serializers.SerializerMethodField()
    application_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = EnrollmentCampaign
        fields = (
            "id",
            "public_id",
            "title",
            "description",
            "target_class_id",
            "target_class",
            "status",
            "closes_at",
            "public_url",
            "application_count",
            "created_at",
        )
        read_only_fields = ("id", "public_id", "created_at")

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_target_class(self, obj):
        if obj.target_class is None:
            return None
        return {
            "id": obj.target_class_id,
            "name": obj.target_class.name,
        }

    @extend_schema_field(serializers.URLField())
    def get_public_url(self, obj):
        return campaign_public_url(obj)

    def validate(self, attrs):
        closes_at = attrs.get("closes_at")
        if closes_at and closes_at <= timezone.now():
            raise serializers.ValidationError({"closes_at": "Closing time must be in the future."})
        target_class = attrs.get("target_class")
        if (
            target_class
            and EnrollmentCampaign.objects.filter(
                target_class=target_class,
                status=EnrollmentCampaign.Status.OPEN,
            ).exists()
        ):
            raise serializers.ValidationError(
                {"target_class_id": "This class already has an open enrollment link."}
            )
        return attrs

    def create(self, validated_data):
        return EnrollmentCampaign.objects.create(
            created_by=self.context["request"].user,
            **validated_data,
        )


class PublicCampaignSerializer(serializers.ModelSerializer):
    target_class = serializers.SerializerMethodField()
    accepts_applications = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentCampaign
        fields = (
            "public_id",
            "title",
            "description",
            "target_class",
            "closes_at",
            "accepts_applications",
        )

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_target_class(self, obj):
        if obj.target_class is None:
            return None
        class_group = obj.target_class
        return {
            "name": class_group.name,
            "subject": class_group.subject.name,
            "grade_level": class_group.grade_level,
            "cost_amount": (
                format(class_group.cost_amount, ".2f")
                if class_group.cost_amount is not None
                else None
            ),
            "currency": class_group.currency,
            "is_full": bool(
                class_group.capacity
                and class_group.enrollments.filter(status="ACTIVE").count() >= class_group.capacity
            ),
            "teacher": class_group.primary_teacher.user.get_full_name(),
            "schedule": [
                {
                    "weekday": rule.get_weekday_display(),
                    "start_time": rule.start_time.strftime("%H:%M"),
                    "end_time": rule.end_time.strftime("%H:%M"),
                }
                for rule in class_group.schedule_rules.all()
            ],
        }

    @extend_schema_field(serializers.BooleanField())
    def get_accepts_applications(self, obj):
        return obj.status == EnrollmentCampaign.Status.OPEN and (
            obj.closes_at is None or obj.closes_at > timezone.now()
        )


class PublicApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrollmentApplication
        fields = (
            "first_name",
            "last_name",
            "grade_level",
            "student_email",
            "guardian_name",
            "guardian_email",
            "guardian_phone",
            "notes",
        )

    def validate(self, attrs):
        campaign = self.context["campaign"]
        duplicate = EnrollmentApplication.objects.filter(
            campaign=campaign,
            first_name__iexact=attrs["first_name"].strip(),
            last_name__iexact=attrs["last_name"].strip(),
            guardian_email__iexact=attrs["guardian_email"],
            status=EnrollmentApplication.Status.PENDING,
        ).exists()
        if duplicate:
            raise serializers.ValidationError(
                "A pending application for this student already exists."
            )
        return attrs

    def create(self, validated_data):
        return EnrollmentApplication.objects.create(
            campaign=self.context["campaign"],
            **validated_data,
        )


class PublicSelfEnrollSerializer(serializers.Serializer):
    service = serializers.ChoiceField(choices=("CLASS", "ONE_ON_ONE", "EVENT"))
    class_id = serializers.PrimaryKeyRelatedField(
        source="class_group",
        queryset=ClassGroup.objects.filter(status=ClassGroup.Status.ACTIVE),
        required=False,
        allow_null=True,
    )
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    grade_level = serializers.CharField(max_length=64)
    guardian_name = serializers.CharField(max_length=301, required=False, allow_blank=True)
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    preferred_times = serializers.CharField(max_length=500, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=2000, required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs["service"] == "CLASS" and not attrs.get("class_group"):
            raise serializers.ValidationError({"class_id": "Choose a class to continue."})
        return attrs


class EnrollmentApplicationSerializer(serializers.ModelSerializer):
    campaign = serializers.SerializerMethodField()
    requested_class = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = EnrollmentApplication
        fields = (
            "id",
            "campaign",
            "requested_class",
            "student_name",
            "first_name",
            "last_name",
            "grade_level",
            "student_email",
            "guardian_name",
            "guardian_email",
            "guardian_phone",
            "notes",
            "status",
            "created_student",
            "reviewed_at",
            "rejection_reason",
            "created_at",
        )

    @extend_schema_field(serializers.DictField())
    def get_campaign(self, obj):
        return {"id": obj.campaign_id, "title": obj.campaign.title, "kind": obj.campaign.kind}

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_requested_class(self, obj):
        if obj.campaign.target_class is None:
            return None
        return {
            "id": obj.campaign.target_class_id,
            "name": obj.campaign.target_class.name,
        }

    @extend_schema_field(serializers.CharField())
    def get_student_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip()


class ApplicationRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class ProgramRegistrationSerializer(serializers.ModelSerializer):
    subjects = serializers.ListField(
        child=serializers.ChoiceField(choices=ProgramRegistration.SUBJECT_CHOICES),
        allow_empty=True,
    )

    class Meta:
        model = ProgramRegistration
        fields = (
            "id",
            "student_name",
            "parent_name",
            "level",
            "level_other",
            "study_mode",
            "subjects",
            "subjects_other",
            "parent_phone",
            "status",
            "created_at",
        )
        read_only_fields = ("id", "status", "created_at")

    def validate_parent_phone(self, value):
        digits = re.sub(r"[\s-]", "", value)
        if not re.fullmatch(r"(\+?254|0)[17]\d{8}", digits):
            raise serializers.ValidationError(
                "Enter a valid Kenyan phone number, e.g. 0712 345 678."
            )
        return digits

    def validate(self, attrs):
        if (
            attrs.get("level") == ProgramRegistration.Level.OTHER
            and not attrs.get("level_other", "").strip()
        ):
            raise serializers.ValidationError({"level_other": "Please specify the level."})
        if not attrs.get("subjects") and not attrs.get("subjects_other", "").strip():
            raise serializers.ValidationError({"subjects": "Select at least one subject."})
        attrs["subjects"] = list(dict.fromkeys(attrs.get("subjects", [])))
        return attrs


class ProgramRegistrationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramRegistration
        fields = ("status",)


class PublicProgramSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = Program
        fields = ("title", "audience", "starts_on", "ends_on", "status")

    @extend_schema_field(serializers.ChoiceField(choices=("upcoming", "running")))
    def get_status(self, obj):
        return "running" if obj.starts_on <= timezone.localdate() else "upcoming"


LEVEL_GROUPS = (("GRADE_", "CBC / CBE"), ("FORM_", "8-4-4 (KCSE)"), ("IGCSE_", "IGCSE"))


def level_group(value):
    return next((label for prefix, label in LEVEL_GROUPS if value.startswith(prefix)), None)


class ApplicationAcceptSerializer(serializers.Serializer):
    """Optionally place the student in a different class, or in none ("class_id": null)."""

    class_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassGroup.objects.filter(status=ClassGroup.Status.ACTIVE),
        required=False,
        allow_null=True,
    )
