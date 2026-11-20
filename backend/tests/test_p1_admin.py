from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from apps.academics.models import ClassEnrollment, ClassGroup, Subject, TeacherSubject
from apps.accounts.models import Student, TeacherProfile, User, UserInvitation
from apps.campaigns.models import EnrollmentApplication, EnrollmentCampaign
from apps.payments.models import Payment
from apps.resources.models import Resource, ResourceInterest
from tests.conftest import client_for

pytestmark = pytest.mark.django_db


# --- Classes -----------------------------------------------------------------


def test_admin_edits_class_details_teacher_and_timetable(billing_data):
    class_group = billing_data["class_group"]
    other = TeacherProfile.objects.create(
        user=User.objects.create_user(
            email="t2@example.com", password="Teacher-password-2026!", role=User.Role.TEACHER
        )
    )
    TeacherSubject.objects.create(teacher=other, subject=class_group.subject)
    response = client_for(billing_data["owner"]).patch(
        f"/api/v1/classes/{class_group.id}/",
        {
            "name": "Grade 6 Maths (evening)",
            "teacher_id": other.id,
            "schedule_days": [1, 3],
            "schedule_start_time": "18:00",
            "schedule_end_time": "19:00",
        },
        format="json",
    )

    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["name"] == "Grade 6 Maths (evening)"
    assert body["teacher"]["id"] == other.id
    assert [rule["weekday"] for rule in body["schedule_rules"]] == [1, 3]


def test_class_edit_guards(billing_data):
    url = f"/api/v1/classes/{billing_data['class_group'].id}/"
    owner = client_for(billing_data["owner"])
    stranger = TeacherProfile.objects.create(
        user=User.objects.create_user(
            email="t3@example.com", password="Teacher-password-2026!", role=User.Role.TEACHER
        )
    )

    assert owner.patch(url, {"capacity": 0}, format="json").status_code == 400
    assert owner.patch(url, {"teacher_id": stranger.id}, format="json").status_code == 400
    assert owner.patch(url, {"schedule_days": [1]}, format="json").status_code == 400
    assert owner.patch(url, {"status": "PAUSED"}, format="json").json()["status"] == "PAUSED"


def test_roster_and_withdraw(billing_data):
    class_url = f"/api/v1/classes/{billing_data['class_group'].id}"
    owner = client_for(billing_data["owner"])

    roster = owner.get(f"{class_url}/roster/").json()
    assert [entry["student"]["name"] for entry in roster] == ["Amina Kamau"]
    withdrawn = owner.post(
        f"{class_url}/withdraw/", {"enrollment_id": roster[0]["id"]}, format="json"
    )

    assert withdrawn.json()["status"] == "WITHDRAWN"
    assert owner.get(f"{class_url}/roster/").json() == []


# --- Students ----------------------------------------------------------------


def new_student(**overrides):
    payload = {
        "first_name": "Zawadi",
        "last_name": "Mutua",
        "grade_level": "Form 2",
        "guardian_name": "Ruth Mutua",
        "guardian_email": "ruth@example.com",
    }
    payload.update(overrides)
    return payload


def test_duplicate_student_is_flagged_until_confirmed(billing_data):
    owner = client_for(billing_data["owner"])
    assert owner.post("/api/v1/students/", new_student(), format="json").status_code == 201

    again = owner.post("/api/v1/students/", new_student(first_name="zawadi"), format="json")
    assert again.status_code == 400
    assert "already registered" in str(again.json()["detail"])

    confirmed = owner.post("/api/v1/students/", new_student(confirm_duplicate=True), format="json")
    assert confirmed.status_code == 201
    assert Student.objects.filter(first_name="Zawadi").count() == 2


def test_edit_student_and_guardian_phone(billing_data):
    owner = client_for(billing_data["owner"])
    created = owner.post("/api/v1/students/", new_student(), format="json").json()

    response = owner.patch(
        f"/api/v1/students/{created['id']}/",
        {"grade_level": "Form 3", "guardian_phone": "0712345678"},
        format="json",
    )

    assert response.status_code == 200
    assert response.json()["grade_level"] == "Form 3"
    assert response.json()["primary_guardian"]["phone"] == "0712345678"


def test_archive_then_restore(billing_data):
    owner = client_for(billing_data["owner"])
    student = billing_data["student"]
    owner.post(f"/api/v1/students/{student.id}/archive/")

    restored = owner.post(f"/api/v1/students/{student.id}/restore/")

    assert restored.json()["status"] == "ACTIVE"
    student.user.refresh_from_db()
    assert student.user.is_active
    enrollments = owner.get(f"/api/v1/students/{student.id}/enrollments/").json()
    assert enrollments[0]["status"] == "WITHDRAWN"


def test_search_students_by_guardian_phone(billing_data):
    owner = client_for(billing_data["owner"])
    owner.post("/api/v1/students/", new_student(guardian_phone="0722000111"), format="json")

    results = owner.get("/api/v1/students/?search=0722000111").json()["results"]

    assert [row["first_name"] for row in results] == ["Zawadi"]


# --- Teachers ----------------------------------------------------------------


def test_edit_teacher_subjects_and_deactivate_rules(billing_data):
    owner = client_for(billing_data["owner"])
    teacher = billing_data["class_group"].primary_teacher
    Subject.objects.create(name="Physics")
    url = f"/api/v1/teachers/{teacher.id}/"

    dropping = owner.patch(url, {"subject_names": ["Physics"]}, format="json")
    assert dropping.status_code == 400  # still teaches an active Mathematics class
    unknown = owner.patch(url, {"subject_names": ["Mathematics", "Astrology"]}, format="json")
    assert unknown.status_code == 400
    ok = owner.patch(
        url, {"subject_names": ["Mathematics", "physics"], "phone": "0700111222"}, format="json"
    )
    assert sorted(ok.json()["subjects"]) == ["Mathematics", "Physics"]
    assert ok.json()["account_phone"] == "0700111222"
    assert owner.patch(url, {"status": "INACTIVE"}, format="json").status_code == 400


# --- Applications and enquiries ----------------------------------------------


def make_application(owner, target_class=None, kind=EnrollmentCampaign.Kind.ENROLLMENT):
    campaign = EnrollmentCampaign.objects.create(
        title="Intake", target_class=target_class, created_by=owner, kind=kind
    )
    return EnrollmentApplication.objects.create(
        campaign=campaign,
        first_name="Baraka",
        last_name="Ochieng",
        grade_level="Grade 6",
        guardian_name="Joy Ochieng",
        guardian_email="joy@example.com",
    )


def test_accept_into_another_class_or_none(billing_data):
    owner = billing_data["owner"]
    full_class = ClassGroup.objects.create(
        name="Full class",
        subject=billing_data["class_group"].subject,
        grade_level="Grade 6",
        term=billing_data["class_group"].term,
        primary_teacher=billing_data["class_group"].primary_teacher,
        capacity=1,
        created_by=owner,
    )
    ClassEnrollment.objects.create(class_group=full_class, student=billing_data["other_student"])
    application = make_application(owner, target_class=full_class)
    client = client_for(owner)

    blocked = client.post(f"/api/v1/applications/{application.id}/accept/")
    assert blocked.status_code == 400
    moved = client.post(
        f"/api/v1/applications/{application.id}/accept/",
        {"class_id": billing_data["class_group"].id},
        format="json",
    )
    assert moved.status_code == 200, moved.json()
    student = Student.objects.get(first_name="Baraka")
    assert student.class_enrollments.get().class_group == billing_data["class_group"]

    other = EnrollmentApplication.objects.create(
        campaign=application.campaign,
        first_name="Neema",
        last_name="Ochieng",
        grade_level="Grade 6",
        guardian_name="Joy Ochieng",
        guardian_email="joy@example.com",
    )
    none = client.post(
        f"/api/v1/applications/{other.id}/accept/", {"class_id": None}, format="json"
    )
    assert none.status_code == 200
    assert not Student.objects.get(first_name="Neema").class_enrollments.exists()


def test_enquiries_need_an_explicit_class_to_accept(billing_data):
    application = make_application(billing_data["owner"], kind=EnrollmentCampaign.Kind.ENQUIRY)

    response = client_for(billing_data["owner"]).post(
        f"/api/v1/applications/{application.id}/accept/"
    )

    assert response.status_code == 400
    assert "enquiry" in str(response.json())


def test_trip_enquiry_records_parent_name_and_kind(billing_data):
    response = APIClient().post(
        "/api/v1/public/self-enroll/",
        {
            "service": "EVENT",
            "first_name": "Trip",
            "last_name": "Kid",
            "grade_level": "Grade 7",
            "guardian_name": "Akinyi Parent",
            "contact_email": "akinyi@example.com",
        },
        format="json",
    )

    assert response.status_code == 201
    application = EnrollmentApplication.objects.get()
    assert application.guardian_name == "Akinyi Parent"
    assert application.campaign.kind == EnrollmentCampaign.Kind.ENQUIRY


def test_public_enrollment_page_knows_a_class_is_full(billing_data):
    class_group = billing_data["class_group"]
    class_group.capacity = 1
    class_group.save()
    campaign = EnrollmentCampaign.objects.create(
        title="Intake", target_class=class_group, created_by=billing_data["owner"]
    )

    response = APIClient().get(f"/api/v1/public/enrollment/{campaign.public_id}/")

    assert response.json()["target_class"]["is_full"] is True


# --- Invitations -------------------------------------------------------------


def test_invitation_link_can_be_checked_before_use(billing_data):
    owner = client_for(billing_data["owner"])
    issued = owner.post(
        "/api/v1/users/invitations/",
        {
            "email": "new.teacher@example.com",
            "full_name": "New Teacher",
            "role": "TEACHER",
            "subject_names": ["Mathematics"],
        },
        format="json",
    ).json()
    token = issued["acceptance_url"].rsplit("/", 1)[-1]
    anonymous = APIClient()

    assert anonymous.get(f"/api/v1/auth/invitations/{token}/accept/").json()["status"] == "pending"
    UserInvitation.objects.update(revoked_at="2026-01-01T00:00:00Z")
    gone = anonymous.get(f"/api/v1/auth/invitations/{token}/accept/")
    assert gone.status_code == 410
    assert gone.json()["status"] == "revoked"
    assert anonymous.get("/api/v1/auth/invitations/nonsense/accept/").json()["status"] == "invalid"


# --- Resources ---------------------------------------------------------------


def paid_resource(owner, **overrides):
    defaults = {
        "title": "Paper",
        "price_amount": Decimal("200"),
        "download_url": "https://drive.example.com/p",
        "is_published": True,
        "created_by": owner,
    }
    defaults.update(overrides)
    return Resource.objects.create(**defaults)


def test_resource_links_must_be_https_and_requested_resources_cannot_be_deleted(billing_data):
    owner = client_for(billing_data["owner"])
    bad = owner.post(
        "/api/v1/resources/",
        {"title": "Notes", "resource_type": "NOTES", "download_url": "http://x.example/n.pdf"},
        format="json",
    )
    assert bad.status_code == 400

    resource = paid_resource(billing_data["owner"])
    ResourceInterest.objects.create(resource=resource, student_name="A", email="a@example.com")
    assert owner.delete(f"/api/v1/resources/{resource.id}/").status_code == 400
    lonely = paid_resource(billing_data["owner"], title="Unused")
    assert owner.delete(f"/api/v1/resources/{lonely.id}/").status_code == 204


def test_granting_an_access_request_unlocks_the_resource(billing_data):
    resource = paid_resource(billing_data["owner"], subject=Subject.objects.create(name="Art"))
    interest = ResourceInterest.objects.create(
        resource=resource, student_name="Amina", email="student@example.com"
    )
    access_url = f"/api/v1/resources/{resource.id}/access/"
    student = client_for(billing_data["student_user"])
    assert student.get(access_url).status_code == 403

    granted = client_for(billing_data["owner"]).post(
        f"/api/v1/resource-interests/{interest.id}/grant/"
    )

    assert granted.json()["status"] == "FULFILLED"
    assert student.get(access_url).status_code == 200


def test_grant_needs_a_matching_student_account(billing_data):
    resource = paid_resource(billing_data["owner"])
    interest = ResourceInterest.objects.create(
        resource=resource, student_name="Who", email="nobody@example.com"
    )

    response = client_for(billing_data["owner"]).post(
        f"/api/v1/resource-interests/{interest.id}/grant/"
    )

    assert response.status_code == 400


# --- Payments ----------------------------------------------------------------


def test_cash_payment_can_be_reversed(billing_data):
    owner = client_for(billing_data["owner"])
    invoice = billing_data["invoice"]
    owner.post(
        f"/api/v1/payments/invoices/{invoice.id}/record/",
        {"method": "CASH", "amount": "500.00"},
        format="json",
    )
    payment = Payment.objects.get(method="CASH")

    response = owner.post(
        f"/api/v1/payments/transactions/{payment.id}/refund/",
        {"amount": "500.00", "reason": "Recorded against the wrong invoice"},
        format="json",
    )

    assert response.status_code == 201, response.json()
    invoice.refresh_from_db()
    assert invoice.amount_paid == Decimal("0")
    payment.refresh_from_db()
    assert payment.status == Payment.Status.REFUNDED


def test_enrolled_count_ignores_withdrawn_students(billing_data):
    owner = client_for(billing_data["owner"])
    class_url = f"/api/v1/classes/{billing_data['class_group'].id}"
    enrollment_id = owner.get(f"{class_url}/roster/").json()[0]["id"]

    owner.post(f"{class_url}/withdraw/", {"enrollment_id": enrollment_id}, format="json")

    assert owner.get(f"{class_url}/").json()["enrolled_count"] == 0


def test_paused_class_link_stops_taking_applications(billing_data):
    class_group = billing_data["class_group"]
    campaign = EnrollmentCampaign.objects.create(
        title="Intake", target_class=class_group, created_by=billing_data["owner"]
    )
    class_group.status = ClassGroup.Status.PAUSED
    class_group.save()

    response = APIClient().get(f"/api/v1/public/enrollment/{campaign.public_id}/")

    assert response.status_code == 410
