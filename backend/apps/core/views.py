import logging

from django.db import DatabaseError, connection
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.academics.models import ClassGroup
from apps.accounts.models import Student, TeacherProfile
from apps.accounts.permissions import IsOwnerOrAdmin

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
            "attendance_today": None,
        }
    )
