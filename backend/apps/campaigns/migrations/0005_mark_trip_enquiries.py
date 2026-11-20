from django.db import migrations


def mark_trip_enquiries(apps, schema_editor):
    EnrollmentCampaign = apps.get_model("campaigns", "EnrollmentCampaign")
    EnrollmentCampaign.objects.filter(
        target_class__isnull=True, title="Academic trip and event enquiries"
    ).update(kind="ENQUIRY")


class Migration(migrations.Migration):
    dependencies = [("campaigns", "0004_campaign_kind")]

    operations = [migrations.RunPython(mark_trip_enquiries, migrations.RunPython.noop)]
