from datetime import date, time

from django.core.management.base import BaseCommand

from apps.academics.models import AcademicTerm, ClassGroup, ScheduleRule, Subject
from apps.accounts.models import TeacherProfile, User
from apps.campaigns.models import EnrollmentCampaign
from apps.resources.models import Resource


class Command(BaseCommand):
    help = "Create a small local catalogue for trying the student hub and admin dashboard."

    def handle(self, *args, **options):
        owner = self._user(
            email="owner@utilityinlife.local",
            password="Demo-password-2026!",
            role=User.Role.OWNER,
            first_name="Solani",
            last_name="Coordinator",
        )
        teacher_user = self._user(
            email="teacher@utilityinlife.local",
            password="Demo-password-2026!",
            role=User.Role.TEACHER,
            first_name="Miriam",
            last_name="Otieno",
        )
        teacher, _ = TeacherProfile.objects.get_or_create(user=teacher_user)

        subjects = {
            name: Subject.objects.get_or_create(name=name, defaults={"is_active": True})[0]
            for name in ("Mathematics", "English", "Biology")
        }
        term, _ = AcademicTerm.objects.get_or_create(
            name="2026 Holiday Learning",
            defaults={
                "starts_on": date(2026, 10, 26),
                "ends_on": date(2026, 12, 18),
                "is_active": True,
            },
        )

        classes = [
            self._class(
                owner,
                teacher,
                subjects["Mathematics"],
                term,
                name="Mathematics Boost · Form 3",
                grade_level="Form 3",
                cost_amount="4500.00",
                days=(ScheduleRule.Weekday.MONDAY, ScheduleRule.Weekday.WEDNESDAY),
                start=time(16, 0),
                end=time(17, 30),
            ),
            self._class(
                owner,
                teacher,
                subjects["English"],
                term,
                name="English Confidence · Grade 8",
                grade_level="Grade 8",
                cost_amount="3500.00",
                days=(ScheduleRule.Weekday.TUESDAY, ScheduleRule.Weekday.THURSDAY),
                start=time(17, 0),
                end=time(18, 0),
            ),
        ]

        resources = [
            (
                "KCSE Mathematics Past Paper Pack",
                "EXAM_PAPER",
                subjects["Mathematics"],
                "Form 4",
                "750.00",
            ),
            ("English Grammar Quick Notes", "NOTES", subjects["English"], "Grade 8", None),
            ("Biology Holiday Study Guide", "STUDY_GUIDE", subjects["Biology"], "Form 2", "500.00"),
        ]
        for title, resource_type, subject, grade_level, price_amount in resources:
            Resource.objects.get_or_create(
                title=title,
                defaults={
                    "description": (
                        "A focused, student-friendly resource for the next study session."
                    ),
                    "resource_type": resource_type,
                    "subject": subject,
                    "grade_level": grade_level,
                    "price_amount": price_amount,
                    "currency": "KES",
                    "is_published": True,
                    "created_by": owner,
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo catalogue ready."))
        self.stdout.write("Admin login: owner@utilityinlife.local / Demo-password-2026!")
        self.stdout.write("Public student hub: http://localhost:5173/")
        self.stdout.write(f"Classes: {len(classes)} · Resources: {len(resources)}")

    @staticmethod
    def _user(*, email, password, role, first_name, last_name):
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "role": role,
                "first_name": first_name,
                "last_name": last_name,
                "is_active": True,
            },
        )
        if created:
            user.set_password(password)
            user.save(update_fields=("password",))
        return user

    @staticmethod
    def _class(owner, teacher, subject, term, *, name, grade_level, cost_amount, days, start, end):
        class_group, _ = ClassGroup.objects.get_or_create(
            name=name,
            term=term,
            defaults={
                "subject": subject,
                "grade_level": grade_level,
                "primary_teacher": teacher,
                "capacity": 20,
                "cost_amount": cost_amount,
                "currency": "KES",
                "status": ClassGroup.Status.ACTIVE,
                "created_by": owner,
            },
        )
        for weekday in days:
            ScheduleRule.objects.get_or_create(
                class_group=class_group,
                weekday=weekday,
                start_time=start,
                defaults={"end_time": end},
            )
        EnrollmentCampaign.objects.get_or_create(
            target_class=class_group,
            status=EnrollmentCampaign.Status.OPEN,
            defaults={
                "title": f"Enroll in {class_group.name}",
                "description": "Choose this class and we will help you get started.",
                "created_by": owner,
            },
        )
        return class_group
