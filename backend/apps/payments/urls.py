from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    InvoiceViewSet,
    MpesaCallbackView,
    PayHeroCallbackView,
    PaymentAttemptViewSet,
    PaymentSummaryView,
    PaymentViewSet,
    ReceiptViewSet,
    ReconciliationIssueViewSet,
    ReconciliationRunViewSet,
    RefundViewSet,
    RestrictionViewSet,
)

router = DefaultRouter()
router.register("payments/invoices", InvoiceViewSet, basename="invoice")
router.register("payments/attempts", PaymentAttemptViewSet, basename="payment-attempt")
router.register("payments/transactions", PaymentViewSet, basename="payment")
router.register("payments/receipts", ReceiptViewSet, basename="receipt")
router.register("payments/refunds", RefundViewSet, basename="refund")
router.register("payments/restrictions", RestrictionViewSet, basename="payment-restriction")
router.register(
    "payments/reconciliations",
    ReconciliationRunViewSet,
    basename="payment-reconciliation",
)
router.register(
    "payments/reconciliation-issues",
    ReconciliationIssueViewSet,
    basename="payment-reconciliation-issue",
)

urlpatterns = [
    path("payments/summary/", PaymentSummaryView.as_view(), name="payment-summary"),
    path("payments/mpesa/callback/", MpesaCallbackView.as_view(), name="mpesa-callback"),
    path(
        "payments/mpesa/payhero/<str:callback_token>/",
        PayHeroCallbackView.as_view(),
        name="payhero-callback",
    ),
    *router.urls,
]
