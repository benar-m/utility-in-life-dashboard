"""Recent activity across the platform (dashboard feed + notification bell) and global search."""

from django.db.models import Max, Q

from apps.academics.models import AttendanceRecord, ClassEnrollment, ClassGroup
from apps.accounts.models import Student, TeacherProfile
from apps.campaigns.models import EnrollmentApplication, ProgramRegistration
from apps.payments.models import Payment
from apps.resources.models import ResourceInterest


def money(amount, currency="KES"):
    return f"{currency} {amount:,.0f}"


def recent_activity(limit=30):
    events = []
    for r in ProgramRegistration.objects.order_by("-created_at")[:limit]:
        events.append(
            {
                "type": "registration",
                "title": f"New registration: {r.student_name}",
                "detail": " · ".join(
                    (r.get_level_display(), r.get_study_mode_display(), r.parent_phone)
                ),
                "at": r.created_at,
                "link": "/registrations",
            }
        )
    for a in EnrollmentApplication.objects.select_related("campaign").order_by("-created_at")[
        :limit
    ]:
        kind = "Enquiry" if a.campaign.kind == "ENQUIRY" else "Application"
        events.append(
            {
                "type": "application",
                "title": f"{kind}: {a.first_name} {a.last_name}",
                "detail": a.campaign.title,
                "at": a.created_at,
                "link": "/students",
            }
        )
    for p in Payment.objects.select_related("attempt__invoice__student").order_by("-paid_at")[
        :limit
    ]:
        events.append(
            {
                "type": "payment",
                "title": f"Payment received: {money(p.amount, p.currency)}",
                "detail": f"{p.attempt.invoice.student} · {p.get_method_display()} · "
                f"{p.attempt.invoice.number}",
                "at": p.paid_at,
                "link": "/payments",
            }
        )
    for e in ClassEnrollment.objects.select_related("student", "class_group").order_by(
        "-enrolled_at"
    )[:limit]:
        events.append(
            {
                "type": "enrollment",
                "title": f"{e.student} joined {e.class_group.name}",
                "detail": e.class_group.grade_level,
                "at": e.enrolled_at,
                "link": f"/classes/{e.class_group_id}",
            }
        )
    for i in ResourceInterest.objects.select_related("resource").order_by("-created_at")[:limit]:
        events.append(
            {
                "type": "resource_request",
                "title": f"Resource request: {i.resource.title}",
                "detail": f"{i.student_name} · {i.email}",
                "at": i.created_at,
                "link": "/resources",
            }
        )
    lessons = (
        AttendanceRecord.objects.values("class_group_id", "class_group__name", "lesson_date")
        .annotate(
            at=Max("recorded_at"),
            absent=Max("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
        )
        .order_by("-at")[:limit]
    )
    for lesson in lessons:
        events.append(
            {
                "type": "attendance",
                "title": f"Attendance taken: {lesson['class_group__name']}",
                "detail": f"Lesson on {lesson['lesson_date']:%a %d %b}",
                "at": lesson["at"],
                "link": "/attendance",
            }
        )
    events.sort(key=lambda event: event["at"], reverse=True)
    return events[:limit]


def global_search(query, per_type=5):
    query = query.strip()
    if len(query) < 2:
        return []
    digits = query.replace(" ", "")
    results = []
    students = (
        Student.objects.filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(studentguardian__guardian__user__email__icontains=query)
            | Q(studentguardian__guardian__user__phone__icontains=digits)
        )
        .distinct()
        .order_by("first_name")[:per_type]
    )
    results += [
        {
            "type": "student",
            "title": str(s),
            "detail": f"{s.grade_level} · {s.get_status_display()}",
            "link": f"/students/{s.id}",
        }
        for s in students
    ]
    teachers = (
        TeacherProfile.objects.select_related("user")
        .filter(
            Q(user__first_name__icontains=query)
            | Q(user__last_name__icontains=query)
            | Q(user__email__icontains=query)
        )
        .order_by("user__first_name")[:per_type]
    )
    results += [
        {
            "type": "teacher",
            "title": t.user.get_full_name() or t.user.email,
            "detail": t.user.email,
            "link": "/teachers",
        }
        for t in teachers
    ]
    classes = (
        ClassGroup.objects.select_related("subject")
        .filter(Q(name__icontains=query) | Q(subject__name__icontains=query))
        .order_by("name")[:per_type]
    )
    results += [
        {
            "type": "class",
            "title": c.name,
            "detail": f"{c.subject.name} · {c.get_status_display()}",
            "link": f"/classes/{c.id}",
        }
        for c in classes
    ]
    registrations = ProgramRegistration.objects.filter(
        Q(student_name__icontains=query)
        | Q(parent_name__icontains=query)
        | Q(parent_phone__icontains=digits)
    ).order_by("-created_at")[:per_type]
    results += [
        {
            "type": "registration",
            "title": r.student_name,
            "detail": f"Registration · {r.parent_phone}",
            "link": "/registrations",
        }
        for r in registrations
    ]
    return results
