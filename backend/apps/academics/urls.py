from django.urls import path
from rest_framework.routers import DefaultRouter

from .portal_views import (
    StudentPortalClassViewSet,
    StudentPortalSummaryView,
    TeacherPortalClassViewSet,
    TeacherPortalSummaryView,
)
from .views import ClassGroupViewSet, SubjectViewSet

router = DefaultRouter()
router.register("subjects", SubjectViewSet, basename="subject")
router.register("classes", ClassGroupViewSet, basename="class")
router.register(
    "portal/teacher/classes",
    TeacherPortalClassViewSet,
    basename="teacher-portal-class",
)
router.register(
    "portal/student/classes",
    StudentPortalClassViewSet,
    basename="student-portal-class",
)

urlpatterns = [
    path(
        "portal/teacher/summary/",
        TeacherPortalSummaryView.as_view(),
        name="teacher-portal-summary",
    ),
    path(
        "portal/student/summary/",
        StudentPortalSummaryView.as_view(),
        name="student-portal-summary",
    ),
    *router.urls,
]
