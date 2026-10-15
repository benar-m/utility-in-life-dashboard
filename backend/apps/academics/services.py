from django.db import transaction
from rest_framework import serializers

from .models import ClassEnrollment


def financial_defaults_for_class(class_group):
    if class_group.cost_amount is None:
        return {
            "financial_status": ClassEnrollment.FinancialStatus.NOT_CONFIGURED,
            "balance_due": None,
        }
    return {
        "financial_status": ClassEnrollment.FinancialStatus.PENDING,
        "balance_due": class_group.cost_amount,
    }


@transaction.atomic
def assign_student_to_class(student, class_group, *, actor=None):
    active_count = class_group.enrollments.filter(status=ClassEnrollment.Status.ACTIVE).count()
    existing = ClassEnrollment.objects.filter(
        class_group=class_group,
        student=student,
    ).first()
    if (
        class_group.capacity
        and active_count >= class_group.capacity
        and not (existing and existing.status == ClassEnrollment.Status.ACTIVE)
    ):
        raise serializers.ValidationError({"class_id": "This class is at capacity."})

    defaults = financial_defaults_for_class(class_group)
    if existing:
        if existing.status != ClassEnrollment.Status.ACTIVE:
            existing.status = ClassEnrollment.Status.ACTIVE
            existing.financial_status = defaults["financial_status"]
            existing.balance_due = defaults["balance_due"]
            existing.save(update_fields=("status", "financial_status", "balance_due"))
        from apps.payments.services import ensure_invoice_for_enrollment

        ensure_invoice_for_enrollment(existing, actor=actor or class_group.created_by)
        return existing, False

    enrollment = ClassEnrollment.objects.create(
        class_group=class_group,
        student=student,
        **defaults,
    )
    from apps.payments.services import ensure_invoice_for_enrollment

    ensure_invoice_for_enrollment(enrollment, actor=actor or class_group.created_by)
    return enrollment, True
