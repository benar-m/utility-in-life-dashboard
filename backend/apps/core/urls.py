from django.urls import path

from .views import (
    activity_feed,
    dashboard_summary,
    health_check,
    organization_settings,
    report_export,
    reports,
    search,
)

urlpatterns = [
    path("health/", health_check, name="health"),
    path("dashboard/summary/", dashboard_summary, name="dashboard-summary"),
    path("dashboard/activity/", activity_feed, name="dashboard-activity"),
    path("search/", search, name="search"),
    path("reports/summary/", reports, name="reports-summary"),
    path("reports/export/<slug:kind>/", report_export, name="reports-export"),
    path("settings/organization/", organization_settings, name="organization-settings"),
]
