from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.academics.models import ClassEnrollment, ClassGroup
from apps.academics.services import assign_student_to_class
from apps.accounts.serializers import StudentSerializer

from .models import EnrollmentApplication


@transaction.atomic
def accept_application(application_id, reviewer):
    application = (
        EnrollmentApplication.objects.select_for_update()
        .select_related("campaign__target_class", "created_student")
        .get(pk=application_id)
    )
    if application.status == EnrollmentApplication.Status.ACCEPTED:
        return application
    if application.status == EnrollmentApplication.Status.REJECTED:
        raise serializers.ValidationError("A rejected application cannot be accepted.")

    target_class = application.campaign.target_class
    if target_class:
        if target_class.status != ClassGroup.Status.ACTIVE:
            raise serializers.ValidationError("The requested class is not active.")
        active_count = target_class.enrollments.filter(status=ClassEnrollment.Status.ACTIVE).count()
        if target_class.capacity and active_count >= target_class.capacity:
            raise serializers.ValidationError("The requested class is at capacity.")

    student_serializer = StudentSerializer(
        data={
            "first_name": application.first_name,
            "last_name": application.last_name,
            "grade_level": application.grade_level,
            "guardian_name": application.guardian_name,
            "guardian_email": application.guardian_email,
            "guardian_phone": application.guardian_phone,
        }
    )
    student_serializer.is_valid(raise_exception=True)
    student = student_serializer.save()

    if target_class:
        assign_student_to_class(student, target_class, actor=reviewer)

    application.status = EnrollmentApplication.Status.ACCEPTED
    application.created_student = student
    application.reviewed_by = reviewer
    application.reviewed_at = timezone.now()
    application.rejection_reason = ""
    application.save(
        update_fields=(
            "status",
            "created_student",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
        )
    )
    return application


@transaction.atomic
def reject_application(application_id, reviewer, reason=""):
    application = EnrollmentApplication.objects.select_for_update().get(pk=application_id)
    if application.status == EnrollmentApplication.Status.ACCEPTED:
        raise serializers.ValidationError("An accepted application cannot be rejected.")
    if application.status == EnrollmentApplication.Status.REJECTED:
        return application
    application.status = EnrollmentApplication.Status.REJECTED
    application.reviewed_by = reviewer
    application.reviewed_at = timezone.now()
    application.rejection_reason = reason
    application.save(update_fields=("status", "reviewed_by", "reviewed_at", "rejection_reason"))
    return application
