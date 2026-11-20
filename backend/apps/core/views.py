import logging

from django.db import DatabaseError, connection
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.academics.attendance import attendance_today, parse_range
from apps.academics.models import ClassGroup
from apps.accounts.models import Student, TeacherProfile
from apps.accounts.permissions import IsOwnerOrAdmin

from .activity import global_search, recent_activity
from .models import OrganizationSettings
from .reports import EXPORTS, export_csv, reports_summary

logger = logging.getLogger(__name__)


@extend_schema(
    responses={
        200: OpenApiResponse(description="Application and database are ready."),
        503: OpenApiResponse(description="Database is unavailable."),
    }
)
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health_check(request):
    """Report process and database readiness without exposing configuration."""

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        logger.exception("Health check database query failed")
        return Response({"status": "unavailable"}, status=503)

    return Response({"status": "ok"})


@extend_schema(responses={200: OpenApiResponse(description="Role-scoped dashboard totals.")})
@api_view(["GET"])
@permission_classes([IsOwnerOrAdmin])
def dashboard_summary(request):
    return Response(
        {
            "active_students": Student.objects.filter(status=Student.Status.ACTIVE).count(),
            "active_teachers": TeacherProfile.objects.filter(
                status=TeacherProfile.Status.ACTIVE
            ).count(),
            "active_classes": ClassGroup.objects.filter(status=ClassGroup.Status.ACTIVE).count(),
            "attendance_today": attendance_today(),
        }
    )


class OrganizationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganizationSettings
        fields = (
            "name",
            "contact_phone",
            "contact_email",
            "address",
            "paybill_display",
            "updated_at",
        )
        read_only_fields = ("updated_at",)


@extend_schema(request=OrganizationSettingsSerializer, responses=OrganizationSettingsSerializer)
@api_view(["GET", "PATCH"])
@permission_classes([IsOwnerOrAdmin])
def organization_settings(request):
    instance = OrganizationSettings.load()
    if request.method == "PATCH":
        serializer = OrganizationSettingsSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(OrganizationSettingsSerializer(instance).data)


@extend_schema(responses={200: OpenApiResponse(description="Latest events, newest first.")})
@api_view(["GET"])
@permission_classes([IsOwnerOrAdmin])
def activity_feed(request):
    return Response(recent_activity())


@extend_schema(responses={200: OpenApiResponse(description="Matching records across types.")})
@api_view(["GET"])
@permission_classes([IsOwnerOrAdmin])
def search(request):
    return Response(global_search(request.query_params.get("q", "")))


@extend_schema(responses={200: OpenApiResponse(description="Charts for the Reports page.")})
@api_view(["GET"])
@permission_classes([IsOwnerOrAdmin])
def reports(request):
    start, end = parse_range(request.query_params, default_days=90)
    return Response(reports_summary(start, end))


@extend_schema(responses={200: OpenApiResponse(description="CSV file.")})
@api_view(["GET"])
@permission_classes([IsOwnerOrAdmin])
def report_export(request, kind):
    if kind not in EXPORTS:
        return Response({"detail": "Unknown report."}, status=404)
    start, end = parse_range(request.query_params, default_days=90)
    return export_csv(kind, start, end)
