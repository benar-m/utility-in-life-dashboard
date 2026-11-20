from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from apps.academics.models import Subject


class Resource(models.Model):
    class ResourceType(models.TextChoices):
        EXAM_PAPER = "EXAM_PAPER", "Exam paper"
        NOTES = "NOTES", "Notes"
        BOOK = "BOOK", "Book"
        STUDY_GUIDE = "STUDY_GUIDE", "Study guide"
        OTHER = "OTHER", "Other"

    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    subject = models.ForeignKey(
        Subject,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="resources",
    )
    grade_level = models.CharField(max_length=64, blank=True)
    resource_type = models.CharField(
        max_length=24,
        choices=ResourceType.choices,
        default=ResourceType.NOTES,
    )
    price_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    currency = models.CharField(
        max_length=3,
        default="KES",
        validators=[RegexValidator(r"^[A-Z]{3}$", "Use a three-letter currency code.")],
    )
    download_url = models.URLField(blank=True)
    is_published = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_resources",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "title")

    def __str__(self) -> str:
        return self.title


class ResourceInterest(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        CONTACTED = "CONTACTED", "Contacted"
        FULFILLED = "FULFILLED", "Fulfilled"
        DECLINED = "DECLINED", "Declined"

    resource = models.ForeignKey(
        Resource,
        on_delete=models.PROTECT,
        related_name="interests",
    )
    student_name = models.CharField(max_length=180)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=("status", "created_at"))]

    def __str__(self) -> str:
        return f"{self.student_name} · {self.resource}"
