from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.academics.models import ClassGroup, Subject

from .models import Resource, ResourceInterest


class ResourceSerializer(serializers.ModelSerializer):
    subject_id = serializers.PrimaryKeyRelatedField(
        source="subject",
        queryset=Subject.objects.filter(is_active=True),
        required=False,
        allow_null=True,
        write_only=True,
    )
    subject = serializers.SerializerMethodField()
    resource_type_label = serializers.CharField(source="get_resource_type_display", read_only=True)

    class Meta:
        model = Resource
        fields = (
            "id",
            "title",
            "description",
            "subject",
            "subject_id",
            "grade_level",
            "resource_type",
            "resource_type_label",
            "price_amount",
            "currency",
            "download_url",
            "is_published",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "subject")

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_subject(self, obj):
        if obj.subject is None:
            return None
        return {"id": obj.subject_id, "name": obj.subject.name}

    def validate_download_url(self, value):
        if value and not value.lower().startswith("https://"):
            raise serializers.ValidationError("Resource links must use HTTPS.")
        return value


class PublicResourceSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    resource_type_label = serializers.CharField(source="get_resource_type_display", read_only=True)

    class Meta:
        model = Resource
        fields = (
            "id",
            "title",
            "description",
            "subject",
            "grade_level",
            "resource_type",
            "resource_type_label",
            "price_amount",
            "currency",
        )

    @extend_schema_field(serializers.CharField())
    def get_subject(self, obj):
        return obj.subject.name if obj.subject else "General"


class PublicClassSerializer(serializers.ModelSerializer):
    subject = serializers.CharField(source="subject.name", read_only=True)
    term = serializers.CharField(source="term.name", read_only=True)
    teacher = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField()
    enrolled_count = serializers.IntegerField(read_only=True)
    remaining_seats = serializers.SerializerMethodField()
    cost_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        allow_null=True,
        read_only=True,
    )

    class Meta:
        model = ClassGroup
        fields = (
            "id",
            "name",
            "subject",
            "grade_level",
            "term",
            "teacher",
            "schedule",
            "capacity",
            "enrolled_count",
            "remaining_seats",
            "cost_amount",
            "currency",
        )

    def get_teacher(self, obj):
        return obj.primary_teacher.user.get_full_name()

    def get_schedule(self, obj):
        rules = obj.schedule_rules.all()
        return [
            {
                "weekday": rule.weekday,
                "day": rule.get_weekday_display(),
                "start_time": rule.start_time.strftime("%H:%M"),
                "end_time": rule.end_time.strftime("%H:%M"),
            }
            for rule in rules
        ]

    def get_remaining_seats(self, obj):
        if obj.capacity is None:
            return None
        return max(obj.capacity - getattr(obj, "enrolled_count", 0), 0)


class ResourceInterestSerializer(serializers.ModelSerializer):
    resource_id = serializers.PrimaryKeyRelatedField(
        source="resource",
        queryset=Resource.objects.filter(is_published=True),
        write_only=True,
        required=True,
    )
    resource = serializers.SerializerMethodField(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ResourceInterest
        fields = (
            "id",
            "resource_id",
            "resource",
            "student_name",
            "email",
            "phone",
            "notes",
            "status",
            "status_label",
            "created_at",
        )
        read_only_fields = ("id", "resource", "status_label", "created_at")

    @extend_schema_field(serializers.DictField())
    def get_resource(self, obj):
        return {"id": obj.resource_id, "title": obj.resource.title}


class PublicResourceInterestSerializer(serializers.ModelSerializer):
    resource_id = serializers.PrimaryKeyRelatedField(
        source="resource",
        queryset=Resource.objects.filter(is_published=True),
        write_only=True,
    )

    class Meta:
        model = ResourceInterest
        fields = ("resource_id", "student_name", "email", "phone", "notes")
