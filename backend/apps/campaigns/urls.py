from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EnrollmentApplicationViewSet,
    EnrollmentCampaignViewSet,
    ProgramRegistrationViewSet,
    PublicApplicationCreateView,
    PublicCampaignView,
    PublicProgramRegistrationCreateView,
    PublicRegistrationOptionsView,
    PublicSelfEnrollView,
    PublicSiteView,
)

router = DefaultRouter()
router.register("campaigns", EnrollmentCampaignViewSet, basename="campaign")
router.register("applications", EnrollmentApplicationViewSet, basename="application")
router.register("registrations", ProgramRegistrationViewSet, basename="registration")

urlpatterns = [
    path("public/site/", PublicSiteView.as_view(), name="public-site"),
    path(
        "public/registrations/options/",
        PublicRegistrationOptionsView.as_view(),
        name="public-registration-options",
    ),
    path(
        "public/registrations/",
        PublicProgramRegistrationCreateView.as_view(),
        name="public-registration",
    ),
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
