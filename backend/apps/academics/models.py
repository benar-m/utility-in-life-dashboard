from django.conf import settings
from django.core.validators import MinValueValidator, RegexValidator
from django.db import models

from apps.accounts.models import Student, TeacherProfile


class Subject(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class AcademicTerm(models.Model):
    name = models.CharField(max_length=100, unique=True)
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-starts_on", "name")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_on__gte=models.F("starts_on")),
                name="academics_term_valid_dates",
            )
        ]

    def __str__(self) -> str:
        return self.name


class TeacherSubject(models.Model):
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name="subject_links",
    )
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="teacher_links")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("teacher", "subject"),
                name="academics_teacher_subject_unique",
            )
        ]

    def __str__(self) -> str:
        return f"{self.teacher}: {self.subject}"


class ClassGroup(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        ARCHIVED = "ARCHIVED", "Archived"

    name = models.CharField(max_length=150)
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="classes")
    grade_level = models.CharField(max_length=64)
    term = models.ForeignKey(AcademicTerm, on_delete=models.PROTECT, related_name="classes")
    primary_teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.PROTECT,
        related_name="classes",
    )
    capacity = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    cost_amount = models.DecimalField(
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
    default_meeting_url = models.URLField(blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_classes",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name",)

    def __str__(self) -> str:
        return self.name


class ClassEnrollment(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        COMPLETED = "COMPLETED", "Completed"
        WITHDRAWN = "WITHDRAWN", "Withdrawn"

    class FinancialStatus(models.TextChoices):
        NOT_CONFIGURED = "NOT_CONFIGURED", "Not configured"
        PENDING = "PENDING", "Pending"
        CLEARED = "CLEARED", "Cleared"
        WAIVED = "WAIVED", "Waived"

    class_group = models.ForeignKey(
        ClassGroup,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="class_enrollments")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    financial_status = models.CharField(
        max_length=24,
        choices=FinancialStatus.choices,
        default=FinancialStatus.NOT_CONFIGURED,
    )
    balance_due = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=("class_group", "student"),
                name="academics_class_student_unique",
            )
        ]

    def __str__(self) -> str:
        return f"{self.student} in {self.class_group}"


class ScheduleRule(models.Model):
    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    class_group = models.ForeignKey(
        ClassGroup,
        on_delete=models.CASCADE,
        related_name="schedule_rules",
    )
    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        ordering = ("weekday", "start_time")
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="academics_schedule_valid_times",
            ),
            models.UniqueConstraint(
                fields=("class_group", "weekday", "start_time"),
                name="academics_class_schedule_unique",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.class_group} on {self.get_weekday_display()} at {self.start_time}"
