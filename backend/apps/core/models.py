from django.conf import settings
from django.db import models


class OrganizationSettings(models.Model):
    """Single row of school-wide details shown on the public site and to staff."""

    name = models.CharField(max_length=120, default="Shuleni Online")
    contact_phone = models.CharField(max_length=32, blank=True)
    contact_email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    paybill_display = models.CharField(
        max_length=120,
        blank=True,
        help_text="Shown to parents, e.g. 'Paybill 123456, account = invoice number'. "
        "Gateway credentials stay in server settings.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "organization settings"

    def __str__(self) -> str:
        return self.name

    @classmethod
    def load(cls):
        instance, _ = cls.objects.get_or_create(
            pk=1, defaults={"contact_phone": settings.PUBLIC_CONTACT_PHONE}
        )
        return instance
