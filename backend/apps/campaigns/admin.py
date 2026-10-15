from django.contrib import admin

from .models import EnrollmentApplication, EnrollmentCampaign


@admin.register(EnrollmentCampaign)
class EnrollmentCampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "target_class", "closes_at", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "target_class__name")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(EnrollmentApplication)
class EnrollmentApplicationAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "campaign", "status", "created_at")
    list_filter = ("status", "campaign")
    search_fields = ("first_name", "last_name", "guardian_email")
    readonly_fields = ("created_at", "reviewed_at")
