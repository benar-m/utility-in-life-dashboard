from django.db.models import Count, Prefetch
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.academics.models import ClassGroup, ScheduleRule
from apps.accounts.permissions import IsOwnerOrAdmin

from .models import Resource, ResourceInterest
from .serializers import (
    PublicClassSerializer,
    PublicResourceInterestSerializer,
    PublicResourceSerializer,
    ResourceInterestSerializer,
    ResourceSerializer,
)


class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "post", "patch", "head", "options"]
    filterset_fields = ("is_published", "resource_type", "subject")
    search_fields = ("title", "description", "grade_level", "subject__name")
    ordering = ("-created_at", "title")

    def get_queryset(self):
        return Resource.objects.select_related("subject")

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ResourceInterestViewSet(
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ResourceInterestSerializer
    permission_classes = [IsOwnerOrAdmin]
    http_method_names = ["get", "patch", "head", "options"]
    filterset_fields = ("status", "resource")
    ordering = ("-created_at",)

    def get_queryset(self):
        return ResourceInterest.objects.select_related("resource")


class PublicCatalogView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses={200: None},
    )
    def get(self, request):
        classes = (
            ClassGroup.objects.filter(status=ClassGroup.Status.ACTIVE)
            .select_related("subject", "term", "primary_teacher__user")
            .prefetch_related(
                Prefetch(
                    "schedule_rules",
                    queryset=ScheduleRule.objects.order_by("weekday", "start_time"),
                )
            )
            .annotate(enrolled_count=Count("enrollments", distinct=True))
            .order_by("subject__name", "name")
        )
        resources = Resource.objects.filter(is_published=True).select_related("subject")
        return Response(
            {
                "classes": PublicClassSerializer(classes, many=True).data,
                "resources": PublicResourceSerializer(resources, many=True).data,
            }
        )


class PublicResourceInterestView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_catalog"

    @extend_schema(request=PublicResourceInterestSerializer, responses={201: None})
    def post(self, request):
        serializer = PublicResourceInterestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        interest = serializer.save()
        return Response({"id": interest.id, "status": "PENDING"}, status=status.HTTP_201_CREATED)
