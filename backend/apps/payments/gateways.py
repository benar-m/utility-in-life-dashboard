import base64
import json
import uuid
from dataclasses import dataclass
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone


class PaymentGatewayError(Exception):
    """A provider request failed or returned an unusable response."""


@dataclass(frozen=True)
class StkPushResponse:
    merchant_request_id: str
    checkout_request_id: str
    response_code: str
    response_description: str
    customer_message: str
    raw_response: dict


class MockMpesaGateway:
    """Daraja-shaped local adapter. It never performs a network request."""

    name = "mock"

    def initiate_stk_push(
        self,
        *,
        phone_number: str,
        amount: Decimal,
        account_reference: str,
        description: str,
        external_reference: str,
        customer_name: str = "",
        callback_url: str = "",
    ) -> StkPushResponse:
        merchant_id = f"MOCK-MERCHANT-{uuid.uuid4().hex[:16].upper()}"
        checkout_id = f"ws_CO_{timezone.now():%Y%m%d%H%M%S}{uuid.uuid4().hex[:8]}"
        raw_response = {
            "MerchantRequestID": merchant_id,
            "CheckoutRequestID": checkout_id,
            "ResponseCode": "0",
            "ResponseDescription": "Success. Request accepted for processing",
            "CustomerMessage": "A mock M-Pesa prompt has been sent to your phone.",
            "ExternalReference": external_reference,
            "request": {
                "BusinessShortCode": "174379",
                "TransactionType": "CustomerPayBillOnline",
                "Amount": str(amount),
                "PartyA": phone_number,
                "PhoneNumber": phone_number,
                "CallBackURL": callback_url or "/api/v1/payments/mpesa/callback/",
                "AccountReference": account_reference,
                "TransactionDesc": description[:32],
            },
        }
        return StkPushResponse(
            merchant_request_id=merchant_id,
            checkout_request_id=checkout_id,
            response_code="0",
            response_description=raw_response["ResponseDescription"],
            customer_message=raw_response["CustomerMessage"],
            raw_response=raw_response,
        )

    def refund(self, *, provider_reference: str, amount: Decimal, reason: str) -> dict:
        return {
            "ResultCode": 0,
            "ResultDesc": "Mock reversal completed successfully",
            "OriginatorConversationID": f"MOCK-REV-{uuid.uuid4().hex[:20].upper()}",
            "TransactionID": provider_reference,
            "Amount": str(amount),
            "Remarks": reason[:100],
        }


class PayHeroGateway:
    """Small stdlib-only adapter for PayHero's M-Pesa STK endpoint."""

    name = "payhero"

    def initiate_stk_push(
        self,
        *,
        phone_number: str,
        amount: Decimal,
        account_reference: str,
        description: str,
        external_reference: str,
        customer_name: str = "",
        callback_url: str = "",
    ) -> StkPushResponse:
        if amount != amount.to_integral_value():
            raise PaymentGatewayError("PayHero M-Pesa prompts require a whole KES amount.")
        if not callback_url.startswith("https://"):
            raise PaymentGatewayError(
                "Set a public HTTPS PAYHERO_CALLBACK_BASE_URL before enabling PayHero prompts."
            )

        username = settings.PAYHERO_USERNAME
        password = settings.PAYHERO_PASSWORD
        channel_id = settings.PAYHERO_CHANNEL_ID
        if not username or not password or not channel_id:
            raise PaymentGatewayError("PayHero credentials and channel ID are not configured.")

        auth = base64.b64encode(f"{username}:{password}".encode()).decode("ascii")
        payload = {
            "amount": int(amount),
            "phone_number": phone_number,
            "channel_id": int(channel_id) if str(channel_id).isdigit() else channel_id,
            "provider": "m-pesa",
            "external_reference": external_reference,
            "customer_name": customer_name,
            "callback_url": callback_url,
        }
        request = Request(
            f"{settings.PAYHERO_API_BASE_URL.rstrip('/')}/api/v2/payments",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=settings.PAYHERO_REQUEST_TIMEOUT) as response:
                result = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            raise PaymentGatewayError(
                "PayHero could not accept the M-Pesa prompt request."
            ) from exc

        if not isinstance(result, dict):
            raise PaymentGatewayError(
                "PayHero returned an invalid response for the prompt request."
            )
        checkout_id = result.get("CheckoutRequestID") or result.get("checkout_request_id")
        merchant_id = result.get("reference") or result.get("Reference") or result.get("id")
        succeeded = result.get("success") is True
        if not succeeded or not checkout_id or not merchant_id:
            raise PaymentGatewayError(
                str(result.get("message") or result.get("detail") or "PayHero rejected the prompt.")
            )
        customer_message = str(
            result.get("customer_message") or "Approve the M-Pesa prompt on your phone."
        )
        return StkPushResponse(
            merchant_request_id=str(merchant_id)[:64],
            checkout_request_id=str(checkout_id)[:64],
            response_code="0",
            response_description=str(result.get("status") or "QUEUED"),
            customer_message=customer_message,
            raw_response=result,
        )

    def refund(self, *, provider_reference: str, amount: Decimal, reason: str) -> dict:
        raise PaymentGatewayError(
            "PayHero refunds are not configured. Process this refund in the provider portal."
        )


def get_gateway():
    if settings.PAYMENT_GATEWAY == "payhero":
        return PayHeroGateway()
    return MockMpesaGateway()
