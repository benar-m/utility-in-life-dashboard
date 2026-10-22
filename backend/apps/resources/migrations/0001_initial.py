from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("academics", "0002_classenrollment_balance_due_classgroup_cost_amount_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Resource",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=180)),
                ("description", models.TextField(blank=True)),
                ("grade_level", models.CharField(blank=True, max_length=64)),
                ("resource_type", models.CharField(choices=[("EXAM_PAPER", "Exam paper"), ("NOTES", "Notes"), ("BOOK", "Book"), ("STUDY_GUIDE", "Study guide"), ("OTHER", "Other")], default="NOTES", max_length=24)),
                ("price_amount", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True, validators=[django.core.validators.MinValueValidator(0)])),
                ("currency", models.CharField(default="KES", max_length=3, validators=[django.core.validators.RegexValidator("^[A-Z]{3}$", "Use a three-letter currency code.")])),
                ("download_url", models.URLField(blank=True)),
                ("is_published", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_resources", to=settings.AUTH_USER_MODEL)),
                ("subject", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="resources", to="academics.subject")),
            ],
            options={"ordering": ("-created_at", "title")},
        ),
        migrations.CreateModel(
            name="ResourceInterest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("student_name", models.CharField(max_length=180)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(blank=True, max_length=32)),
                ("notes", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("CONTACTED", "Contacted"), ("FULFILLED", "Fulfilled"), ("DECLINED", "Declined")], default="PENDING", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("resource", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="interests", to="resources.resource")),
            ],
            options={"ordering": ("-created_at",), "indexes": [models.Index(fields=["status", "created_at"], name="resources_re_status_6d1d25_idx")]},
        ),
    ]
