from rest_framework.permissions import BasePermission

from .models import User


class IsOwnerOrAdmin(BasePermission):
    message = "Only owners and administrators can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in {User.Role.OWNER, User.Role.ADMIN}
        )


class IsTeacher(BasePermission):
    message = "Only teachers can access the teacher portal."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.TEACHER
            and hasattr(request.user, "teacher_profile")
        )


class IsLinkedStudent(BasePermission):
    message = "Only students linked to a student record can access the student portal."

    def has_permission(self, request, view):
        is_linked_student = bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.STUDENT
            and hasattr(request.user, "student_profile")
        )
        if not is_linked_student:
            return False
        from apps.payments.models import StudentAccessRestriction
        from apps.payments.services import active_restrictions

        return (
            not active_restrictions(request.user.student_profile)
            .filter(scope=StudentAccessRestriction.Scope.FULL_PORTAL)
            .exists()
        )
