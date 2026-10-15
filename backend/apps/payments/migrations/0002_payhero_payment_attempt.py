from django.db import migrations, models


def add_legacy_external_references(apps, schema_editor):
    PaymentAttempt = apps.get_model("payments", "PaymentAttempt")
    for attempt in PaymentAttempt.objects.filter(external_reference__isnull=True).iterator():
        attempt.external_reference = f"LEGACY-{attempt.pk}"
        attempt.save(update_fields=("external_reference",))


class Migration(migrations.Migration):
    dependencies = [("payments", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="paymentattempt",
            name="provider",
            field=models.CharField(
                choices=[("mock", "Mock"), ("payhero", "PayHero")],
                default="mock",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="external_reference",
            field=models.CharField(max_length=64, null=True),
        ),
        migrations.AddField(
            model_name="paymentattempt",
            name="callback_token_hash",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.RunPython(add_legacy_external_references, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="paymentattempt",
            name="external_reference",
            field=models.CharField(max_length=64, unique=True),
        ),
    ]
