from django.urls import path
from rest_framework.routers import DefaultRouter

from .auth_views import (
    CsrfTokenView,
    InvitationAcceptanceView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    StudentRegistrationView,
)
from .views import InvitationViewSet, StudentViewSet, TeacherViewSet

router = DefaultRouter()
router.register("students", StudentViewSet, basename="student")
router.register("teachers", TeacherViewSet, basename="teacher")
router.register("users/invitations", InvitationViewSet, basename="invitation")

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/register/", StudentRegistrationView.as_view(), name="auth-register"),
    path("auth/refresh/", RefreshView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path(
        "auth/invitations/<str:token>/accept/",
        InvitationAcceptanceView.as_view(),
        name="invitation-accept",
    ),
    *router.urls,
]
