from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("payments", "0002_payhero_payment_attempt"),
        ("payments", "0002_reconciliationissue_resolution_note_and_more"),
    ]

    operations = []
