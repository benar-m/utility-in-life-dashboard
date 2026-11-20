"""Reporting: time series and breakdowns for the Reports page, plus CSV exports."""

import csv
from collections import defaultdict
from datetime import timedelta
from decimal import Decimal

from django.db.models import F, Sum
from django.http import HttpResponse
from django.utils import timezone

from apps.academics.models import AttendanceRecord, ClassEnrollment
from apps.campaigns.models import ProgramRegistration
from apps.payments.models import Invoice, Payment, Refund


def buckets(start, end):
    """Daily buckets for a month or less, weekly (Monday-start) beyond that."""
    if (end - start).days <= 31:
        days = [start + timedelta(days=offset) for offset in range((end - start).days + 1)]
        return "day", days, lambda d: d
    first = start - timedelta(days=start.weekday())
    weeks = []
    cursor = first
    while cursor <= end:
        weeks.append(cursor)
        cursor += timedelta(days=7)
    return "week", weeks, lambda d: d - timedelta(days=d.weekday())


def local_date(value):
    return timezone.localtime(value).date()


def series(start, end, rows, key):
    """Sum (date, amount) rows into buckets; returns [{period, value}]."""
    unit, periods, bucket_of = buckets(start, end)
    totals = defaultdict(Decimal)
    for when, amount in rows:
        totals[bucket_of(when)] += Decimal(amount or 0)
    return unit, [{"period": period, key: totals.get(period, Decimal("0"))} for period in periods]


def reports_summary(start, end):
    start_dt = timezone.make_aware(timezone.datetime.combine(start, timezone.datetime.min.time()))
    end_dt = timezone.make_aware(
        timezone.datetime.combine(end + timedelta(days=1), timezone.datetime.min.time())
    )

    payments = Payment.objects.filter(paid_at__gte=start_dt, paid_at__lt=end_dt)
    refunds = Refund.objects.filter(
        status=Refund.Status.SUCCEEDED, processed_at__gte=start_dt, processed_at__lt=end_dt
    )
    collection_rows = [(local_date(p.paid_at), p.amount) for p in payments] + [
        (local_date(r.processed_at), -r.amount) for r in refunds
    ]
    unit, collections = series(start, end, collection_rows, "collected")

    invoices = Invoice.objects.filter(issued_at__gte=start_dt, issued_at__lt=end_dt).exclude(
        status=Invoice.Status.VOID
    )
    invoiced_total = invoices.aggregate(total=Sum("total_amount"))["total"] or Decimal("0")
    collected_total = sum((row["collected"] for row in collections), Decimal("0"))

    outstanding = defaultdict(Decimal)
    open_invoices = Invoice.objects.exclude(
        status__in=(Invoice.Status.VOID, Invoice.Status.PAID)
    ).select_related("enrollment__class_group")
    for invoice in open_invoices:
        name = invoice.enrollment.class_group.name if invoice.enrollment_id else "One-off charges"
        outstanding[name] += invoice.total_amount - invoice.amount_paid
    outstanding_by_class = sorted(
        (
            {"name": name, "outstanding": amount}
            for name, amount in outstanding.items()
            if amount > 0
        ),
        key=lambda row: row["outstanding"],
        reverse=True,
    )

    methods = (
        payments.values("method")
        .annotate(total=Sum(F("amount") - F("amount_refunded")))
        .order_by("method")
    )
    method_labels = dict(Payment.Method.choices)

    enrollments = ClassEnrollment.objects.filter(enrolled_at__gte=start_dt, enrolled_at__lt=end_dt)
    _, enrollment_series = series(
        start, end, [(local_date(e.enrolled_at), 1) for e in enrollments], "count"
    )
    registrations = ProgramRegistration.objects.filter(
        created_at__gte=start_dt, created_at__lt=end_dt
    )
    _, registration_series = series(
        start, end, [(local_date(r.created_at), 1) for r in registrations], "count"
    )

    return {
        "start": start,
        "end": end,
        "unit": unit,
        "totals": {
            "invoiced": invoiced_total,
            "collected": collected_total,
            "outstanding": sum(outstanding.values(), Decimal("0")),
            "new_enrollments": enrollments.count(),
            "new_registrations": registrations.count(),
        },
        "collections": collections,
        "outstanding_by_class": outstanding_by_class[:8],
        "payment_methods": [
            {"method": row["method"], "label": method_labels[row["method"]], "total": row["total"]}
            for row in methods
        ],
        "enrollments": [
            {"period": row["period"], "count": int(row["count"])} for row in enrollment_series
        ],
        "registrations": [
            {"period": row["period"], "count": int(row["count"])} for row in registration_series
        ],
    }


EXPORTS = {
    "payments": (
        ["Paid at", "Receipt", "Invoice", "Student", "Method", "Reference", "Amount", "Refunded"],
        lambda start_dt, end_dt: (
            [
                timezone.localtime(p.paid_at).strftime("%Y-%m-%d %H:%M"),
                getattr(getattr(p, "receipt", None), "number", ""),
                p.attempt.invoice.number,
                str(p.attempt.invoice.student),
                p.get_method_display(),
                p.provider_reference,
                p.amount,
                p.amount_refunded,
            ]
            for p in Payment.objects.filter(paid_at__gte=start_dt, paid_at__lt=end_dt)
            .select_related("attempt__invoice__student", "receipt")
            .order_by("paid_at")
        ),
    ),
    "invoices": (
        [
            "Issued",
            "Invoice",
            "Student",
            "Class",
            "Description",
            "Total",
            "Paid",
            "Due date",
            "Status",
        ],
        lambda start_dt, end_dt: (
            [
                timezone.localtime(i.issued_at).strftime("%Y-%m-%d"),
                i.number,
                str(i.student),
                i.enrollment.class_group.name if i.enrollment_id else "",
                i.description,
                i.total_amount,
                i.amount_paid,
                i.due_date,
                i.get_status_display(),
            ]
            for i in Invoice.objects.filter(issued_at__gte=start_dt, issued_at__lt=end_dt)
            .select_related("student", "enrollment__class_group")
            .order_by("issued_at")
        ),
    ),
    "attendance": (
        ["Lesson date", "Class", "Student", "Status", "Note"],
        lambda start_dt, end_dt: (
            [a.lesson_date, a.class_group.name, str(a.student), a.get_status_display(), a.note]
            for a in AttendanceRecord.objects.filter(
                lesson_date__gte=start_dt.date(), lesson_date__lt=end_dt.date()
            )
            .select_related("class_group", "student")
            .order_by("lesson_date", "class_group__name")
        ),
    ),
    "enrollments": (
        ["Enrolled", "Class", "Student", "Status", "Financial status", "Balance due"],
        lambda start_dt, end_dt: (
            [
                timezone.localtime(e.enrolled_at).strftime("%Y-%m-%d"),
                e.class_group.name,
                str(e.student),
                e.get_status_display(),
                e.get_financial_status_display(),
                e.balance_due if e.balance_due is not None else "",
            ]
            for e in ClassEnrollment.objects.filter(
                enrolled_at__gte=start_dt, enrolled_at__lt=end_dt
            )
            .select_related("class_group", "student")
            .order_by("enrolled_at")
        ),
    ),
    "registrations": (
        ["Received", "Student", "Parent", "Phone", "Level", "Mode", "Subjects", "Status"],
        lambda start_dt, end_dt: (
            [
                timezone.localtime(r.created_at).strftime("%Y-%m-%d %H:%M"),
                r.student_name,
                r.parent_name,
                r.parent_phone,
                r.level_other if r.level == "OTHER" else r.get_level_display(),
                r.get_study_mode_display(),
                ", ".join(
                    [dict(ProgramRegistration.SUBJECT_CHOICES).get(s, s) for s in r.subjects]
                    + ([r.subjects_other] if r.subjects_other else [])
                ),
                r.get_status_display(),
            ]
            for r in ProgramRegistration.objects.filter(
                created_at__gte=start_dt, created_at__lt=end_dt
            ).order_by("created_at")
        ),
    ),
}


def safe_cell(value):
    """Stop spreadsheet formula injection: names come from public forms."""
    if isinstance(value, str) and value[:1] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + value
    return value


def export_csv(kind, start, end):
    header, rows = EXPORTS[kind]
    start_dt = timezone.make_aware(timezone.datetime.combine(start, timezone.datetime.min.time()))
    end_dt = timezone.make_aware(
        timezone.datetime.combine(end + timedelta(days=1), timezone.datetime.min.time())
    )
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="shuleni-{kind}-{start}-to-{end}.csv"'
    response.write("﻿")  # so Excel opens UTF-8 names correctly
    writer = csv.writer(response)
    writer.writerow(header)
    for row in rows(start_dt, end_dt):
        writer.writerow([safe_cell(value) for value in row])
    return response
