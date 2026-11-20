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


class ProgramRegistration(models.Model):
    """Public sign-up for a holiday/tuition program (replaces the Google Form)."""

    class Level(models.TextChoices):
        GRADE_6 = "GRADE_6", "Grade 6"
        GRADE_7 = "GRADE_7", "Grade 7"
        GRADE_8 = "GRADE_8", "Grade 8"
        GRADE_9 = "GRADE_9", "Grade 9"
        GRADE_10 = "GRADE_10", "Grade 10"
        FORM_2 = "FORM_2", "Form 2"
        FORM_3 = "FORM_3", "Form 3"
        FORM_4 = "FORM_4", "Form 4"
        IGCSE_7 = "IGCSE_7", "IGCSE Year 7"
        IGCSE_8 = "IGCSE_8", "IGCSE Year 8"
        IGCSE_9 = "IGCSE_9", "IGCSE Year 9"
        IGCSE_10 = "IGCSE_10", "IGCSE Year 10"
        IGCSE_11 = "IGCSE_11", "IGCSE Year 11"
        OTHER = "OTHER", "Other"

    class StudyMode(models.TextChoices):
        ONLINE_INDIVIDUAL = "ONLINE_INDIVIDUAL", "Individualized online"
        FACE_TO_FACE_INDIVIDUAL = "FACE_TO_FACE_INDIVIDUAL", "Individualized face to face"
        ONLINE_GROUP = "ONLINE_GROUP", "Group online"

    class Status(models.TextChoices):
        NEW = "NEW", "New"
        CONTACTED = "CONTACTED", "Contacted"
        ENROLLED = "ENROLLED", "Enrolled"
        DECLINED = "DECLINED", "Declined"

    SUBJECT_CHOICES = (
        ("MATHEMATICS", "Mathematics"),
        ("BIOLOGY", "Biology"),
        ("CHEMISTRY", "Chemistry"),
        ("PHYSICS", "Physics"),
        ("KISWAHILI", "Kiswahili"),
        ("GEOGRAPHY", "Geography"),
        ("ENGLISH", "English"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_name = models.CharField(max_length=200)
    parent_name = models.CharField(max_length=200)
    level = models.CharField(max_length=16, choices=Level.choices)
    level_other = models.CharField(max_length=100, blank=True)
    study_mode = models.CharField(max_length=32, choices=StudyMode.choices)
    subjects = models.JSONField(default=list)
    subjects_other = models.CharField(max_length=200, blank=True)
    parent_phone = models.CharField(max_length=32)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("status", "created_at"))]

    def __str__(self) -> str:
        return f"{self.student_name} ({self.get_level_display()})"


class Program(models.Model):
    """A public intake (e.g. a holiday program) announced on the landing and registration pages."""

    title = models.CharField(max_length=120)
    audience = models.CharField(max_length=200, blank=True)
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("starts_on",)
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_on__gte=models.F("starts_on")),
                name="campaigns_program_ends_after_start",
            )
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.starts_on:%d %b} – {self.ends_on:%d %b %Y})"
