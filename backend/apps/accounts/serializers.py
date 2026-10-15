import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.academics.models import Subject, TeacherSubject

from .models import (
    GuardianProfile,
    Student,
    StudentGuardian,
    TeacherProfile,
    User,
    UserInvitation,
)


class CurrentUserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "full_name", "role", "profile_id")

    @extend_schema_field(serializers.CharField())
    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_profile_id(self, obj):
        if obj.role == User.Role.TEACHER:
            return getattr(getattr(obj, "teacher_profile", None), "pk", None)
        if obj.role == User.Role.GUARDIAN:
            return getattr(getattr(obj, "guardian_profile", None), "pk", None)
        if obj.role == User.Role.STUDENT:
            return getattr(getattr(obj, "student_profile", None), "pk", None)
        return None


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"])
        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=attrs["password"],
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid email or password.")
        attrs["user"] = user
        return attrs


class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    guardian_name = serializers.CharField(write_only=True, required=False)
    guardian_email = serializers.EmailField(write_only=True, required=False)
    guardian_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    primary_guardian = serializers.SerializerMethodField()
    portal_status = serializers.SerializerMethodField()
    account_email = serializers.SerializerMethodField()
    payment_restriction = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "grade_level",
            "status",
            "joined_at",
            "guardian_name",
            "guardian_email",
            "guardian_phone",
            "primary_guardian",
            "portal_status",
            "account_email",
            "payment_restriction",
        )
        read_only_fields = ("id", "joined_at")

    @extend_schema_field(serializers.CharField())
    def get_full_name(self, obj):
        return str(obj)

    @extend_schema_field(
        serializers.DictField(child=serializers.CharField(allow_blank=True), allow_null=True)
    )
    def get_primary_guardian(self, obj):
        link = next((link for link in obj.studentguardian_set.all() if link.is_primary), None)
        if link is None:
            return None
        user = link.guardian.user
        return {
            "name": user.get_full_name() or user.email,
            "email": user.email,
            "phone": user.phone,
        }

    @extend_schema_field(serializers.CharField())
    def get_portal_status(self, obj):
        if obj.user is None:
            return "NOT_INVITED"
        if obj.user.is_active:
            return "ACTIVE"
        if any(invitation.is_usable for invitation in obj.user.invitations.all()):
            return "INVITED"
        return "INACTIVE"

    @extend_schema_field(serializers.EmailField(allow_null=True))
    def get_account_email(self, obj):
        return obj.user.email if obj.user else None

    @extend_schema_field(serializers.DictField(allow_null=True))
    def get_payment_restriction(self, obj):
        from apps.payments.services import active_restrictions

        restriction = active_restrictions(obj).first()
        if restriction is None:
            return None
        return {
            "id": str(restriction.pk),
            "scope": restriction.scope,
            "reason": restriction.reason,
            "note": restriction.note,
            "restricted_until": restriction.restricted_until,
        }

    def validate(self, attrs):
        if self.instance is None:
            required = ("guardian_name", "guardian_email")
            missing = [field for field in required if not attrs.get(field)]
            if missing:
                raise serializers.ValidationError(
                    {field: "This field is required." for field in missing}
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        guardian_name = validated_data.pop("guardian_name")
        guardian_email = User.objects.normalize_email(validated_data.pop("guardian_email"))
        guardian_phone = validated_data.pop("guardian_phone", "")
        guardian_user = User.objects.filter(email__iexact=guardian_email).first()

        if guardian_user and guardian_user.role != User.Role.GUARDIAN:
            raise serializers.ValidationError(
                {"guardian_email": "This email already belongs to a non-guardian account."}
            )

        name_parts = guardian_name.strip().split(maxsplit=1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        if guardian_user is None:
            guardian_user = User.objects.create_user(
                email=guardian_email,
                first_name=first_name,
                last_name=last_name,
                phone=guardian_phone,
                role=User.Role.GUARDIAN,
                is_active=False,
            )
        else:
            changed_fields = []
            if guardian_phone and not guardian_user.phone:
                guardian_user.phone = guardian_phone
                changed_fields.append("phone")
            if changed_fields:
                guardian_user.save(update_fields=changed_fields)

        guardian, _ = GuardianProfile.objects.get_or_create(user=guardian_user)
        student = Student.objects.create(**validated_data)
        StudentGuardian.objects.create(student=student, guardian=guardian)
        return student


class TeacherSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    account_email = serializers.EmailField(source="user.email", read_only=True)
    account_phone = serializers.CharField(source="user.phone", read_only=True)
    subjects = serializers.SerializerMethodField()
    assigned_classes = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = TeacherProfile
        fields = (
            "id",
            "display_name",
            "account_email",
            "account_phone",
            "subjects",
            "status",
            "assigned_classes",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    @extend_schema_field(serializers.CharField())
    def get_display_name(self, obj):
        return obj.user.get_full_name() or obj.user.email

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_subjects(self, obj):
        return [link.subject.name for link in obj.subject_links.all()]


class InvitationSerializer(serializers.ModelSerializer):
    status = serializers.CharField(read_only=True)
    invited_by = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()

    class Meta:
        model = UserInvitation
        fields = (
            "id",
            "email",
            "role",
            "status",
            "expires_at",
            "accepted_at",
            "revoked_at",
            "invited_by",
            "student_id",
            "created_at",
        )

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_invited_by(self, obj):
        if obj.invited_by is None:
            return None
        return obj.invited_by.get_full_name() or obj.invited_by.email

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_student_id(self, obj):
        return getattr(getattr(obj.user, "student_profile", None), "pk", None)


class InvitationIssuedSerializer(InvitationSerializer):
    acceptance_url = serializers.SerializerMethodField()

    class Meta(InvitationSerializer.Meta):
        fields = (*InvitationSerializer.Meta.fields, "acceptance_url")

    @extend_schema_field(serializers.URLField())
    def get_acceptance_url(self, obj):
        return f"{settings.FRONTEND_URL}/accept-invitation/{self.context['raw_token']}"


class InvitationCreateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=301, required=False)
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=User.Role.choices)
    phone = serializers.CharField(max_length=32, required=False, allow_blank=True)
    subject_names = serializers.ListField(
        child=serializers.CharField(max_length=100),
        required=False,
        allow_empty=False,
    )
    student_id = serializers.PrimaryKeyRelatedField(
        source="student",
        queryset=Student.objects.filter(status=Student.Status.ACTIVE),
        write_only=True,
        required=False,
    )

    def validate_email(self, value):
        return User.objects.normalize_email(value)

    def validate(self, attrs):
        inviter = self.context["request"].user
        allowed_roles = {
            User.Role.TEACHER,
            User.Role.GUARDIAN,
            User.Role.STUDENT,
        }
        if inviter.role == User.Role.OWNER:
            allowed_roles.add(User.Role.ADMIN)
        if attrs["role"] not in allowed_roles:
            raise serializers.ValidationError(
                {"role": "You are not allowed to invite an account with this role."}
            )
        if attrs["role"] == User.Role.TEACHER and not attrs.get("subject_names"):
            raise serializers.ValidationError(
                {"subject_names": "Add at least one subject for a teacher invitation."}
            )
        student = attrs.get("student")
        if attrs["role"] == User.Role.STUDENT:
            if student is None:
                raise serializers.ValidationError(
                    {"student_id": "Select the student record this login belongs to."}
                )
            attrs["full_name"] = str(student)
        elif student is not None:
            raise serializers.ValidationError(
                {"student_id": "A student record can only be used for a student invitation."}
            )
        elif not attrs.get("full_name"):
            raise serializers.ValidationError({"full_name": "This field is required."})
        existing = User.objects.filter(email__iexact=attrs["email"]).first()
        if existing and (existing.is_active or existing.role != attrs["role"]):
            raise serializers.ValidationError(
                {"email": "An account with this email already exists."}
            )
        if student and student.user_id and student.user_id != getattr(existing, "id", None):
            raise serializers.ValidationError(
                {"student_id": "This student already has a different portal account."}
            )
        linked_student = getattr(existing, "student_profile", None) if existing else None
        if linked_student and linked_student.pk != getattr(student, "pk", None):
            raise serializers.ValidationError(
                {"email": "This account is already linked to a different student."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        inviter = self.context["request"].user
        subject_names = validated_data.pop("subject_names", [])
        student = validated_data.pop("student", None)
        full_name = validated_data.pop("full_name").strip()
        name_parts = full_name.split(maxsplit=1)
        email = validated_data["email"]
        role = validated_data["role"]
        phone = validated_data.get("phone", "")

        user = User.objects.select_for_update().filter(email__iexact=email).first()
        if user is None:
            user = User.objects.create_user(
                email=email,
                first_name=name_parts[0],
                last_name=name_parts[1] if len(name_parts) > 1 else "",
                phone=phone,
                role=role,
                is_active=False,
                must_change_password=True,
            )
        else:
            if user.is_active or user.role != role:
                raise serializers.ValidationError(
                    {"email": "An account with this email already exists."}
                )
            user.first_name = name_parts[0]
            user.last_name = name_parts[1] if len(name_parts) > 1 else ""
            user.phone = phone
            user.must_change_password = True
            user.save(update_fields=("first_name", "last_name", "phone", "must_change_password"))

        if role == User.Role.TEACHER:
            teacher, _ = TeacherProfile.objects.get_or_create(
                user=user,
                defaults={"status": TeacherProfile.Status.INVITED},
            )
            if teacher.status != TeacherProfile.Status.INVITED:
                teacher.status = TeacherProfile.Status.INVITED
                teacher.save(update_fields=("status", "updated_at"))
            unique_names = {name.strip() for name in subject_names if name.strip()}
            subjects = []
            for name in sorted(unique_names):
                subject, _ = Subject.objects.get_or_create(
                    name__iexact=name,
                    defaults={"name": name},
                )
                subjects.append(subject)
            TeacherSubject.objects.filter(teacher=teacher).exclude(subject__in=subjects).delete()
            for subject in subjects:
                TeacherSubject.objects.get_or_create(teacher=teacher, subject=subject)
        elif role == User.Role.GUARDIAN:
            GuardianProfile.objects.get_or_create(user=user)
        elif role == User.Role.STUDENT:
            student = Student.objects.select_for_update().get(pk=student.pk)
            if student.user_id and student.user_id != user.pk:
                raise serializers.ValidationError(
                    {"student_id": "This student already has a different portal account."}
                )
            student.user = user
            student.save(update_fields=("user", "updated_at"))

        now = timezone.now()
        UserInvitation.objects.filter(
            user=user,
            accepted_at__isnull=True,
            revoked_at__isnull=True,
        ).update(revoked_at=now)

        raw_token = secrets.token_urlsafe(32)
        invitation = UserInvitation.objects.create(
            user=user,
            email=email,
            role=role,
            token_digest=UserInvitation.digest_token(raw_token),
            expires_at=now + timedelta(hours=settings.INVITATION_EXPIRY_HOURS),
            invited_by=inviter,
        )
        self.raw_token = raw_token
        acceptance_url = f"{settings.FRONTEND_URL}/accept-invitation/{raw_token}"
        transaction.on_commit(
            lambda: send_mail(
                "You have been invited to Utility in Life",
                (
                    f"Hello {full_name},\n\n"
                    f"Use this link to set your password and activate your account:\n"
                    f"{acceptance_url}\n\n"
                    f"This invitation expires in {settings.INVITATION_EXPIRY_HOURS} hours."
                ),
                settings.DEFAULT_FROM_EMAIL,
                [email],
            ),
            robust=True,
        )
        return invitation


class InvitationAcceptanceSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirmation = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirmation"]:
            raise serializers.ValidationError(
                {"password_confirmation": "The passwords do not match."}
            )
        digest = UserInvitation.digest_token(self.context["token"])
        invitation = (
            UserInvitation.objects.select_related("user").filter(token_digest=digest).first()
        )
        if invitation is None or not invitation.is_usable:
            raise serializers.ValidationError(
                {"token": "This invitation is invalid or has expired."}
            )
        validate_password(attrs["password"], user=invitation.user)
        attrs["invitation"] = invitation
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        invitation = (
            UserInvitation.objects.select_for_update()
            .select_related("user")
            .get(pk=self.validated_data["invitation"].pk)
        )
        if not invitation.is_usable:
            raise serializers.ValidationError(
                {"token": "This invitation is invalid or has expired."}
            )
        user = invitation.user
        user.set_password(self.validated_data["password"])
        user.is_active = True
        user.must_change_password = False
        user.save(update_fields=("password", "is_active", "must_change_password"))
        if user.role == User.Role.TEACHER:
            TeacherProfile.objects.filter(user=user).update(status=TeacherProfile.Status.ACTIVE)
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=("accepted_at",))
        return invitation
