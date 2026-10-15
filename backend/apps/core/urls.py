from django.urls import path

from .views import dashboard_summary, health_check

urlpatterns = [
    path("health/", health_check, name="health"),
    path("dashboard/summary/", dashboard_summary, name="dashboard-summary"),
]
