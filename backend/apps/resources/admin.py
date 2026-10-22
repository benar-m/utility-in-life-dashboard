from django.contrib import admin

from .models import Resource, ResourceInterest


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "resource_type",
        "subject",
        "grade_level",
        "price_amount",
        "is_published",
    )
    list_filter = ("is_published", "resource_type", "subject")
    search_fields = ("title", "description", "grade_level")


@admin.register(ResourceInterest)
class ResourceInterestAdmin(admin.ModelAdmin):
    list_display = ("student_name", "resource", "email", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("student_name", "email", "resource__title")
