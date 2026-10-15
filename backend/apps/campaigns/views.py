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

from apps.accounts.permissions import IsOwnerOrAdmin

from .models import EnrollmentApplication, EnrollmentCampaign
from .serializers import (
    ApplicationRejectSerializer,
    EnrollmentApplicationSerializer,
    EnrollmentCampaignSerializer,
    PublicApplicationCreateSerializer,
    PublicCampaignSerializer,
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

    @extend_schema(request=None, responses=EnrollmentApplicationSerializer)
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        application = accept_application(self.get_object().pk, request.user)
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
            EnrollmentCampaign.objects.select_related("target_class__subject"),
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
