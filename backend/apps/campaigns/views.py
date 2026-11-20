from django.conf import settings
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsOwnerOrAdmin

from .models import EnrollmentApplication, EnrollmentCampaign, Program, ProgramRegistration
from .serializers import (
    ApplicationAcceptSerializer,
    ApplicationRejectSerializer,
    EnrollmentApplicationSerializer,
    EnrollmentCampaignSerializer,
    ProgramRegistrationSerializer,
    ProgramRegistrationStatusSerializer,
    PublicApplicationCreateSerializer,
    PublicCampaignSerializer,
    PublicProgramSerializer,
    PublicSelfEnrollSerializer,
    level_group,
)
from .services import accept_application, reject_application


class EnrollmentCampaignViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = EnrollmentCampaignSerializer
    permission_classes = [IsOwnerOrAdmin]
    filterset_fields = ("status",)
    ordering = ("-created_at",)

    def get_queryset(self):
        return (
            EnrollmentCampaign.objects.select_related("target_class")
            .annotate(application_count=Count("applications"))
            .order_by("-created_at")
        )


class EnrollmentApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = EnrollmentApplicationSerializer
    permission_classes = [IsOwnerOrAdmin]
    filterset_fields = ("status", "campaign")
    search_fields = (
        "first_name",
        "last_name",
        "guardian_name",
        "guardian_email",
        "campaign__title",
    )
    ordering = ("-created_at",)

    def get_queryset(self):
        return EnrollmentApplication.objects.select_related(
            "campaign__target_class",
            "created_student",
        )

    @extend_schema(request=ApplicationAcceptSerializer, responses=EnrollmentApplicationSerializer)
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        serializer = ApplicationAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        override = (
            {"target_class": serializer.validated_data["class_id"]}
            if "class_id" in serializer.validated_data
            else {}
        )
        application = accept_application(self.get_object().pk, request.user, **override)
        return Response(EnrollmentApplicationSerializer(application).data)

    @extend_schema(
        request=ApplicationRejectSerializer,
        responses=EnrollmentApplicationSerializer,
    )
    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        serializer = ApplicationRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = reject_application(
            self.get_object().pk,
            request.user,
            serializer.validated_data.get("reason", ""),
        )
        return Response(EnrollmentApplicationSerializer(application).data)


class PublicCampaignView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses=PublicCampaignSerializer)
    def get(self, request, public_id):
        campaign = get_object_or_404(
            EnrollmentCampaign.objects.select_related(
                "target_class__subject", "target_class__primary_teacher__user"
            ).prefetch_related("target_class__schedule_rules"),
            public_id=public_id,
            status=EnrollmentCampaign.Status.OPEN,
        )
        if campaign.closes_at and campaign.closes_at <= timezone.now():
            return Response(
                {"detail": "This enrollment form is closed."},
                status=status.HTTP_410_GONE,
            )
        return Response(PublicCampaignSerializer(campaign).data)


class PublicApplicationCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_enrollment"

    @extend_schema(
        request=PublicApplicationCreateSerializer,
        responses={201: EnrollmentApplicationSerializer},
    )
    def post(self, request, public_id):
        campaign = get_object_or_404(
            EnrollmentCampaign.objects.select_related("target_class"),
            public_id=public_id,
            status=EnrollmentCampaign.Status.OPEN,
        )
        if campaign.closes_at and campaign.closes_at <= timezone.now():
            return Response(
                {"detail": "This enrollment form is closed."},
                status=status.HTTP_410_GONE,
            )
        serializer = PublicApplicationCreateSerializer(
            data=request.data,
            context={"campaign": campaign},
        )
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response(
            EnrollmentApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class PublicSelfEnrollView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_enrollment"

    @extend_schema(
        request=PublicSelfEnrollSerializer,
        responses={201: EnrollmentApplicationSerializer},
    )
    def post(self, request):
        serializer = PublicSelfEnrollSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        class_group = data.pop("class_group", None)
        service = data.pop("service")
        contact_email = data.pop("contact_email")
        contact_phone = data.pop("contact_phone", "")
        preferred_times = data.pop("preferred_times", "")
        notes = data.pop("notes", "")

        owner = (
            User.objects.filter(
                role__in=(User.Role.OWNER, User.Role.ADMIN),
                is_active=True,
            )
            .order_by("id")
            .first()
        )
        if owner is None:
            return Response(
                {"detail": "Enrollment is not available yet. Please try again shortly."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if class_group:
            campaign, _ = EnrollmentCampaign.objects.get_or_create(
                target_class=class_group,
                status=EnrollmentCampaign.Status.OPEN,
                defaults={
                    "title": f"Enroll in {class_group.name}",
                    "description": f"Request a place in {class_group.name}.",
                    "created_by": owner,
                },
            )
        else:
            titles = {
                "ONE_ON_ONE": "One-on-one lesson enquiries",
                "EVENT": "Academic trip and event enquiries",
            }
            campaign, _ = EnrollmentCampaign.objects.get_or_create(
                target_class=None,
                title=titles[service],
                status=EnrollmentCampaign.Status.OPEN,
                defaults={
                    "description": "Student-led enquiries.",
                    "created_by": owner,
                    "kind": (
                        EnrollmentCampaign.Kind.ENQUIRY
                        if service == "EVENT"
                        else EnrollmentCampaign.Kind.ENROLLMENT
                    ),
                },
            )

        duplicate = EnrollmentApplication.objects.filter(
            campaign=campaign,
            first_name__iexact=data["first_name"].strip(),
            last_name__iexact=data["last_name"].strip(),
            guardian_email__iexact=contact_email,
            status=EnrollmentApplication.Status.PENDING,
        ).exists()
        if duplicate:
            return Response(
                {"detail": "A pending request for this student already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        application = EnrollmentApplication.objects.create(
            campaign=campaign,
            first_name=data["first_name"].strip(),
            last_name=data["last_name"].strip(),
            grade_level=data["grade_level"].strip(),
            student_email="",
            guardian_name=data.get("guardian_name", "").strip()
            or f"{data['first_name'].strip()} {data['last_name'].strip()}".strip(),
            guardian_email=contact_email,
            guardian_phone=contact_phone,
            notes="\n".join(
                part
                for part in (
                    f"Preferred times: {preferred_times}" if preferred_times else "",
                    f"{service.replace('_', ' ').title()} request.",
                    notes.strip(),
                )
                if part
            ),
        )
        return Response(
            EnrollmentApplicationSerializer(application).data,
            status=status.HTTP_201_CREATED,
        )


class ProgramRegistrationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Staff review of public registrations; only the follow-up status can change."""

    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "patch", "head", "options"]
    queryset = ProgramRegistration.objects.all()
    filterset_fields = ("status", "level", "study_mode")
    search_fields = ("student_name", "parent_name", "parent_phone")
    ordering = ("-created_at",)

    def get_serializer_class(self):
        if self.action == "partial_update":
            return ProgramRegistrationStatusSerializer
        return ProgramRegistrationSerializer

    def partial_update(self, request, *args, **kwargs):
        super().partial_update(request, *args, **kwargs)
        return Response(ProgramRegistrationSerializer(self.get_object()).data)


class PublicProgramRegistrationCreateView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_enrollment"

    @extend_schema(
        request=ProgramRegistrationSerializer,
        responses={201: ProgramRegistrationSerializer},
    )
    def post(self, request):
        serializer = ProgramRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        registration = serializer.save()
        return Response(
            ProgramRegistrationSerializer(registration).data,
            status=status.HTTP_201_CREATED,
        )


class PublicSiteView(APIView):
    """Contact details and the current public intake for the landing page."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses={200: None})
    def get(self, request):
        program = (
            Program.objects.filter(is_published=True, ends_on__gte=timezone.localdate())
            .order_by("starts_on")
            .first()
        )
        return Response(
            {
                "contact_phone": settings.PUBLIC_CONTACT_PHONE,
                "program": PublicProgramSerializer(program).data if program else None,
            }
        )


class PublicRegistrationOptionsView(APIView):
    """Choices for the public registration form, so the frontend never duplicates them."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(responses={200: None})
    def get(self, request):
        return Response(
            {
                "levels": [
                    {"value": value, "label": label, "group": level_group(value)}
                    for value, label in ProgramRegistration.Level.choices
                ],
                "study_modes": [
                    {"value": value, "label": label}
                    for value, label in ProgramRegistration.StudyMode.choices
                ],
                "subjects": [
                    {"value": value, "label": label}
                    for value, label in ProgramRegistration.SUBJECT_CHOICES
                ],
            }
        )
