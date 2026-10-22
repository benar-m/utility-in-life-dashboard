from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EnrollmentApplicationViewSet,
    EnrollmentCampaignViewSet,
    PublicApplicationCreateView,
    PublicCampaignView,
    PublicSelfEnrollView,
)

router = DefaultRouter()
router.register("campaigns", EnrollmentCampaignViewSet, basename="campaign")
router.register("applications", EnrollmentApplicationViewSet, basename="application")

urlpatterns = [
    path(
        "public/enrollment/<uuid:public_id>/",
        PublicCampaignView.as_view(),
        name="public-enrollment",
    ),
    path(
        "public/enrollment/<uuid:public_id>/applications/",
        PublicApplicationCreateView.as_view(),
        name="public-enrollment-application",
    ),
    path(
        "public/self-enroll/",
        PublicSelfEnrollView.as_view(),
        name="public-self-enroll",
    ),
    *router.urls,
]
