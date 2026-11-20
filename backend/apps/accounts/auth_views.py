from django.conf import settings
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserInvitation
from .serializers import (
    CurrentUserSerializer,
    InvitationAcceptanceSerializer,
    LoginSerializer,
    StudentRegistrationSerializer,
)

User = get_user_model()


def set_refresh_cookie(response, token):
    response.set_cookie(
        settings.JWT_REFRESH_COOKIE_NAME,
        str(token),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.JWT_REFRESH_COOKIE_SECURE,
        samesite="Lax",
        path="/api/v1/auth/",
    )


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        responses=inline_serializer(
            name="CsrfTokenResponse",
            fields={"csrf_token": serializers.CharField()},
        )
    )
    def get(self, request):
        return Response({"csrf_token": get_token(request._request)})


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(
        request=LoginSerializer,
        responses=inline_serializer(
            name="LoginResponse",
            fields={
                "access": serializers.CharField(),
                "user": CurrentUserSerializer(),
            },
        ),
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(refresh.access_token),
                "user": CurrentUserSerializer(user).data,
            }
        )
        set_refresh_cookie(response, refresh)
        return response


@method_decorator(csrf_protect, name="dispatch")
class StudentRegistrationView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(
        request=StudentRegistrationSerializer,
        responses=inline_serializer(
            name="StudentRegistrationResponse",
            fields={
                "access": serializers.CharField(),
                "user": CurrentUserSerializer(),
            },
        ),
    )
    def post(self, request):
        serializer = StudentRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "access": str(refresh.access_token),
                "user": CurrentUserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, refresh)
        return response


@method_decorator(csrf_protect, name="dispatch")
class RefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    @extend_schema(
        request=None,
        responses=inline_serializer(
            name="RefreshResponse",
            fields={
                "access": serializers.CharField(),
                "user": CurrentUserSerializer(),
            },
        ),
    )
    def post(self, request):
        raw_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if not raw_token:
            return Response(
                {"detail": "Refresh token is missing."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(raw_token)
            user = User.objects.get(pk=old_refresh[settings.SIMPLE_JWT["USER_ID_CLAIM"]])
            if not user.is_active:
                raise User.DoesNotExist
            old_refresh.blacklist()
            new_refresh = RefreshToken.for_user(user)
        except (TokenError, User.DoesNotExist, KeyError):
            return Response(
                {"detail": "Refresh token is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        response = Response(
            {
                "access": str(new_refresh.access_token),
                "user": CurrentUserSerializer(user).data,
            }
        )
        set_refresh_cookie(response, new_refresh)
        return response


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(request=None, responses={204: None})
    def post(self, request):
        raw_token = request.COOKIES.get(settings.JWT_REFRESH_COOKIE_NAME)
        if raw_token:
            try:
                RefreshToken(raw_token).blacklist()
            except TokenError:
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(
            settings.JWT_REFRESH_COOKIE_NAME,
            path="/api/v1/auth/",
            samesite="Lax",
        )
        return response


@method_decorator(csrf_protect, name="dispatch")
class InvitationAcceptanceView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "invitation_accept"

    @extend_schema(
        request=InvitationAcceptanceSerializer,
        responses=inline_serializer(
            name="InvitationAcceptanceResponse",
            fields={"detail": serializers.CharField()},
        ),
    )
    @extend_schema(responses={200: None, 410: None})
    def get(self, request, token):
        """Let the accept page say up front whether the link still works."""
        invitation = UserInvitation.objects.filter(
            token_digest=UserInvitation.digest_token(token)
        ).first()
        if invitation is None or not invitation.is_usable:
            state = invitation.status.lower() if invitation else "invalid"
            return Response({"status": state}, status=status.HTTP_410_GONE)
        return Response({"status": "pending", "email": invitation.email, "role": invitation.role})

    def post(self, request, token):
        serializer = InvitationAcceptanceSerializer(
            data=request.data,
            context={"token": token},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Your account is active. You can now sign in."})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=CurrentUserSerializer)
    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)
