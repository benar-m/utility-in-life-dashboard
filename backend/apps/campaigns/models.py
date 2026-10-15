import uuid

from django.conf import settings
from django.db import models


class EnrollmentCampaign(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        OPEN = "OPEN", "Open"
        CLOSED = "CLOSED", "Closed"

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    target_class = models.ForeignKey(
        "academics.ClassGroup",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="enrollment_campaigns",
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    closes_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_enrollment_campaigns",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        constraints = [
            models.UniqueConstraint(
                fields=("target_class",),
                condition=models.Q(status="OPEN"),
                name="campaigns_one_open_per_class",
            )
        ]

    def __str__(self) -> str:
        return self.title


class EnrollmentApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        EnrollmentCampaign,
        on_delete=models.PROTECT,
        related_name="applications",
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    grade_level = models.CharField(max_length=64)
    student_email = models.EmailField(blank=True)
    guardian_name = models.CharField(max_length=301)
    guardian_email = models.EmailField()
    guardian_phone = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_student = models.ForeignKey(
        "accounts.Student",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="source_applications",
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_enrollment_applications",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("status", "created_at")),
            models.Index(fields=("guardian_email", "created_at")),
        ]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} — {self.campaign}"
