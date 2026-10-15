from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import GuardianProfile, Student, StudentGuardian, TeacherProfile, User, UserInvitation


@admin.register(User)
class UtilityUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("email", "first_name", "last_name", "phone")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal information", {"fields": ("first_name", "last_name", "phone")}),
        ("Platform role", {"fields": ("role", "must_change_password")}),
        (
            "Django permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "role",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )


admin.site.register(Student)
admin.site.register(GuardianProfile)
admin.site.register(StudentGuardian)
admin.site.register(TeacherProfile)


@admin.register(UserInvitation)
class UserInvitationAdmin(admin.ModelAdmin):
    list_display = ("email", "role", "current_status", "expires_at", "invited_by", "created_at")
    list_filter = ("role", "accepted_at", "revoked_at")
    search_fields = ("email", "user__first_name", "user__last_name")
    readonly_fields = (
        "id",
        "user",
        "email",
        "role",
        "token_digest",
        "expires_at",
        "accepted_at",
        "revoked_at",
        "invited_by",
        "created_at",
    )

    @admin.display(description="Status")
    def current_status(self, obj):
        return obj.status

    def has_add_permission(self, request):
        return False
