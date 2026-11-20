"""Attendance: lesson sheets for teachers/admins and the summary behind the charts.

Attendance rate = (present + late) / (records that aren't excused).
"""

from collections import defaultdict
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import serializers

from .models import AttendanceRecord, ClassEnrollment, ClassGroup

ATTENDED = (AttendanceRecord.Status.PRESENT, AttendanceRecord.Status.LATE)


def rate(attended, counted):
    return round(attended / counted * 100, 1) if counted else None


class AttendanceEntrySerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=AttendanceRecord.Status.choices)
    note = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")


class AttendanceSaveSerializer(serializers.Serializer):
    lesson_date = serializers.DateField()
    records = AttendanceEntrySerializer(many=True, allow_empty=False)

    def validate_lesson_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Attendance can't be recorded for a future date.")
        return value


def lesson_sheet(class_group, lesson_date):
    """Roster for a lesson, with any status already recorded."""
    existing = {
        record.student_id: record
        for record in class_group.attendance.filter(lesson_date=lesson_date)
    }
    enrollments = (
        class_group.enrollments.select_related("student")
        .filter(status=ClassEnrollment.Status.ACTIVE)
        .order_by("student__first_name", "student__last_name")
    )
    scheduled = class_group.schedule_rules.filter(weekday=lesson_date.weekday()).exists()
    return {
        "class_id": class_group.id,
        "class_name": class_group.name,
        "lesson_date": lesson_date,
        "is_scheduled_day": scheduled,
        "is_recorded": bool(existing),
        "students": [
            {
                "student_id": enrollment.student_id,
                "name": str(enrollment.student),
                "status": existing[enrollment.student_id].status
                if enrollment.student_id in existing
                else None,
                "note": existing[enrollment.student_id].note
                if enrollment.student_id in existing
                else "",
            }
            for enrollment in enrollments
        ],
    }


@transaction.atomic
def save_attendance(class_group, lesson_date, records, user):
    roster = set(
        class_group.enrollments.filter(status=ClassEnrollment.Status.ACTIVE).values_list(
            "student_id", flat=True
        )
    )
    unknown = [entry["student_id"] for entry in records if entry["student_id"] not in roster]
    if unknown:
        raise serializers.ValidationError(
            {"records": "Some students aren't enrolled in this class."}
        )
    for entry in records:
        AttendanceRecord.objects.update_or_create(
            class_group=class_group,
            student_id=entry["student_id"],
            lesson_date=lesson_date,
            defaults={
                "status": entry["status"],
                "note": entry.get("note", ""),
                "recorded_by": user,
            },
        )
    return lesson_sheet(class_group, lesson_date)


def parse_range(params, default_days=30):
    today = timezone.localdate()
    try:
        end = date.fromisoformat(params.get("end")) if params.get("end") else today
        start = (
            date.fromisoformat(params.get("start"))
            if params.get("start")
            else end - timedelta(days=default_days - 1)
        )
    except ValueError as exc:
        raise serializers.ValidationError("Dates must look like 2026-11-20.") from exc
    if start > end:
        raise serializers.ValidationError("The start date must be before the end date.")
    if (end - start).days > 366:
        raise serializers.ValidationError("Choose a range of a year or less.")
    return start, end


def attendance_summary(start, end, class_id=None):
    records = AttendanceRecord.objects.filter(lesson_date__range=(start, end))
    if class_id:
        records = records.filter(class_group_id=class_id)

    totals = {status.value: 0 for status in AttendanceRecord.Status}
    for row in records.values("status").annotate(n=Count("id")):
        totals[row["status"]] = row["n"]
    counted = sum(totals.values()) - totals["EXCUSED"]
    attended = totals["PRESENT"] + totals["LATE"]

    by_day = defaultdict(lambda: {status.value: 0 for status in AttendanceRecord.Status})
    for row in records.values("lesson_date", "status").annotate(n=Count("id")):
        by_day[row["lesson_date"]][row["status"]] = row["n"]
    days = []
    cursor = start
    while cursor <= end:
        counts = by_day.get(cursor)
        if counts:
            day_counted = sum(counts.values()) - counts["EXCUSED"]
            days.append(
                {
                    "date": cursor,
                    **{key.lower(): value for key, value in counts.items()},
                    "rate": rate(counts["PRESENT"] + counts["LATE"], day_counted),
                }
            )
        else:
            days.append(
                {"date": cursor, "present": 0, "late": 0, "absent": 0, "excused": 0, "rate": None}
            )
        cursor += timedelta(days=1)

    by_class = []
    class_rows = (
        records.values("class_group_id", "class_group__name")
        .annotate(
            attended=Count("id", filter=Q(status__in=ATTENDED)),
            counted=Count("id", filter=~Q(status=AttendanceRecord.Status.EXCUSED)),
            lessons=Count("lesson_date", distinct=True),
        )
        .order_by("class_group__name")
    )
    for row in class_rows:
        by_class.append(
            {
                "class_id": row["class_group_id"],
                "name": row["class_group__name"],
                "lessons": row["lessons"],
                "rate": rate(row["attended"], row["counted"]),
            }
        )

    absentees = []
    student_rows = (
        records.values("student_id", "student__first_name", "student__last_name")
        .annotate(
            absences=Count("id", filter=Q(status=AttendanceRecord.Status.ABSENT)),
            attended=Count("id", filter=Q(status__in=ATTENDED)),
            counted=Count("id", filter=~Q(status=AttendanceRecord.Status.EXCUSED)),
        )
        .filter(absences__gt=0)
        .order_by("-absences", "student__first_name")[:8]
    )
    for row in student_rows:
        absentees.append(
            {
                "student_id": row["student_id"],
                "name": f"{row['student__first_name']} {row['student__last_name']}".strip(),
                "absences": row["absences"],
                "rate": rate(row["attended"], row["counted"]),
            }
        )

    return {
        "start": start,
        "end": end,
        "totals": {key.lower(): value for key, value in totals.items()},
        "rate": rate(attended, counted),
        "by_day": days,
        "by_class": by_class,
        "frequent_absentees": absentees,
    }


def attendance_today():
    """Lessons scheduled today, how many have attendance, and today's rate."""
    today = timezone.localdate()
    scheduled = ClassGroup.objects.filter(
        status=ClassGroup.Status.ACTIVE, schedule_rules__weekday=today.weekday()
    ).distinct()
    recorded = AttendanceRecord.objects.filter(lesson_date=today)
    counted = recorded.exclude(status=AttendanceRecord.Status.EXCUSED).count()
    return {
        "lessons_scheduled": scheduled.count(),
        "lessons_recorded": recorded.values("class_group_id").distinct().count(),
        "rate": rate(recorded.filter(status__in=ATTENDED).count(), counted),
    }
