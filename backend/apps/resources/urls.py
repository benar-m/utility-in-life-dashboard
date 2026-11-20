from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    PublicCatalogView,
    PublicResourceInterestView,
    ResourceAccessView,
    ResourceInterestViewSet,
    ResourceViewSet,
    StudentResourceListView,
    TeacherResourceViewSet,
)

router = DefaultRouter()
router.register("resources", ResourceViewSet, basename="resource")
router.register("resource-interests", ResourceInterestViewSet, basename="resource-interest")
router.register("portal/teacher/resources", TeacherResourceViewSet, basename="teacher-resource")

urlpatterns = [
    path("public/catalog/", PublicCatalogView.as_view(), name="public-catalog"),
    path("portal/student/resources/", StudentResourceListView.as_view(), name="student-resources"),
    path("resources/<int:pk>/access/", ResourceAccessView.as_view(), name="resource-access"),
    path(
        "public/resource-interests/",
        PublicResourceInterestView.as_view(),
        name="public-resource-interest",
    ),
    *router.urls,
]
