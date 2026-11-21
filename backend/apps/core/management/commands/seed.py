"""Fill a database with a realistic term of activity for Shuleni Online.

Everything is dated relative to today, so the dashboard, reports and attendance pages always
show a live-looking last ten weeks. Invoices, payments and refunds go through the real payment
services, then get backdated, so balances and statuses are exactly what the app would produce.

    python manage.py seed            # refuses if seed data is already there
    python manage.py seed --reset    # wipe school data first (keeps owner/admin logins)
"""

import random
import secrets
import string
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.academics.models import (
    AcademicTerm,
    AttendanceRecord,
    ClassEnrollment,
    ClassGroup,
    ScheduleRule,
    Subject,
    TeacherSubject,
)
from apps.accounts.models import (
    GuardianProfile,
    Student,
    StudentGuardian,
    TeacherProfile,
    User,
    UserInvitation,
)
from apps.campaigns.models import (
    EnrollmentApplication,
    EnrollmentCampaign,
    Program,
    ProgramRegistration,
)
from apps.core.models import OrganizationSettings
from apps.payments.models import (
    Invoice,
    Payment,
    PaymentAttempt,
    Receipt,
    ReconciliationIssue,
    ReconciliationRun,
    Refund,
    StudentAccessRestriction,
)
from apps.payments.services import (
    issue_manual_invoice,
    record_manual_payment,
    refresh_invoice,
    refund_payment,
)
from apps.resources.models import Resource, ResourceAccessGrant, ResourceInterest

MAIN_TERM = "2026 Term 3 Tuition"
HOLIDAY_TERM = "2026 December Holiday Programme"
STAFF_DOMAIN = "shulenionline.test"
FAMILY_DOMAIN = "mail.test"

SUBJECTS = ("Mathematics", "English", "Kiswahili", "Biology", "Chemistry", "Physics", "Geography")

TEACHERS = (
    ("Grace", "Wanjiku", ("Mathematics",)),
    ("Daniel", "Ochieng", ("Mathematics", "Physics")),
    ("Mercy", "Chepkoech", ("Chemistry", "Biology")),
    ("Peter", "Kamau", ("English",)),
    ("Fatuma", "Abdi", ("Kiswahili",)),
    ("Samuel", "Mutiso", ("Geography", "Biology")),
)

M, TU, W, TH, F, SA = range(6)
# name, subject, grade, teacher index, fee, capacity, [(weekday, start, end)], has meeting link
TERM_CLASSES = (
    (
        "Form 3 Mathematics",
        "Mathematics",
        "Form 3",
        0,
        3200,
        24,
        [(M, "16:30", "18:00"), (W, "16:30", "18:00")],
        True,
    ),
    (
        "Form 4 Mathematics · KCSE Revision",
        "Mathematics",
        "Form 4",
        0,
        3800,
        25,
        [(TU, "17:00", "18:30"), (TH, "17:00", "18:30")],
        True,
    ),
    (
        "Grade 8 Mathematics",
        "Mathematics",
        "Grade 8",
        1,
        2400,
        20,
        [(M, "16:00", "17:00"), (TH, "16:00", "17:00")],
        True,
    ),
    (
        "Form 3 Physics",
        "Physics",
        "Form 3",
        1,
        3200,
        20,
        [(W, "17:00", "18:30"), (F, "17:00", "18:30")],
        True,
    ),
    (
        "Form 4 Chemistry",
        "Chemistry",
        "Form 4",
        2,
        3600,
        22,
        [(TU, "17:00", "18:30"), (SA, "10:00", "11:30")],
        True,
    ),
    (
        "Form 2 Biology",
        "Biology",
        "Form 2",
        2,
        2800,
        20,
        [(F, "16:00", "17:30"), (SA, "08:30", "10:00")],
        False,
    ),
    (
        "Grade 8 English",
        "English",
        "Grade 8",
        3,
        2200,
        20,
        [(TU, "16:00", "17:00"), (TH, "16:00", "17:00")],
        True,
    ),
    (
        "Form 3 English · Composition & Set Books",
        "English",
        "Form 3",
        3,
        2600,
        20,
        [(SA, "11:00", "12:30")],
        True,
    ),
    (
        "Grade 7 Kiswahili",
        "Kiswahili",
        "Grade 7",
        4,
        1900,
        18,
        [(M, "16:00", "17:00"), (W, "16:00", "17:00")],
        True,
    ),
    ("Form 2 Geography", "Geography", "Form 2", 5, 2400, 18, [(SA, "14:00", "15:30")], False),
)
HOLIDAY_CLASSES = (
    (
        "December Intensive · Form 4 Mathematics",
        "Mathematics",
        "Form 4",
        1,
        8000,
        20,
        [(M, "09:00", "11:00"), (W, "09:00", "11:00"), (F, "09:00", "11:00")],
        True,
    ),
    (
        "December Intensive · Grade 8 English & Kiswahili",
        "English",
        "Grade 8",
        3,
        6000,
        18,
        [(TU, "09:00", "11:00"), (TH, "09:00", "11:00")],
        False,
    ),
)
# Term classes bill monthly; holiday intensives are one fee. Some classes keep worse attendance
# than others (a late Friday slot, an early Saturday one), so the per-class rates differ.
CLASS_ATTENDANCE = {"Form 3 Physics": -0.3, "Form 2 Biology": -0.16, "Grade 8 English": -0.12}
# Students per grade and the classes each grade can join.
GRADES = {"Grade 7": 9, "Grade 8": 15, "Form 2": 12, "Form 3": 20, "Form 4": 17}

GIRLS = (
    "Wanjiru Achieng Chebet Zawadi Neema Faith Mercy Purity Tabitha Joy Esther Lydia Cynthia "
    "Eunice Gloria Imani Linet Michelle Natasha Rehema Sharon Valerie Wambui Aisha Tamara Sifa "
    "Keziah Stacy Brenda Ivy Hope Nelly Dorcas Halima Zuri Shantel Abigail Nyokabi Atieno "
    "Jebet Mumbua Nasimiyu Precious Ruth Hadija"
).split()
BOYS = (
    "Amani Brian Daniel Hassan Ian Kevin Oscar Shadrack Victor Wesley Baraka Dennis Felix "
    "Kelvin Nathan Prince Trevor Yusuf Ryan Ethan Mark Collins Allan Gift Elvis Jayden Fadhili "
    "Kipkemboi Otieno Mutua Kimani Brayden Emmanuel Joshua Hamisi Lemayian Tevin Ochieng"
).split()
SURNAMES = (
    "Kamau Otieno Mwangi Njoroge Kariuki Mutua Musyoka Kiprop Kiplagat Cheruiyot Wafula Barasa "
    "Wekesa Omondi Odhiambo Hassan Abdi Mohamed Gitau Waweru Kimani Ndung'u Maina Karanja Okoth "
    "Owino Mburu Kiptoo Rotich Langat Koech Simiyu Mutiso Kilonzo Ngugi Onyango Juma Salim "
    "Sankale Nyaga Wairimu Muriuki Achieng Kibet Makori Nyamweya Ouma"
).split()
MOTHERS = (
    "Jane Mary Lucy Margaret Rose Agnes Catherine Josephine Elizabeth Beatrice Florence "
    "Caroline Winnie Susan Pauline Fatma Amina Zainab Ann Lilian Joyce Teresia Grace Nancy"
).split()
FATHERS = (
    "John Peter Joseph David James Samuel Stephen Francis Charles Patrick George Moses Paul "
    "Richard Omar Ibrahim Geoffrey Simon Kennedy Wilson"
).split()


def hhmm(value):
    hours, minutes = value.split(":")
    return time(int(hours), int(minutes))


class Command(BaseCommand):
    help = "Seed a realistic term of students, classes, attendance, payments and enquiries."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing school data first. Owner and admin accounts are kept.",
        )
        parser.add_argument(
            "--allow-production",
            action="store_true",
            help="Permit --reset when DEBUG is off.",
        )
        parser.add_argument(
            "--password",
            default="Shuleni-2026!",
            help="Password for the sample logins this command prints.",
        )
        parser.add_argument("--random-seed", type=int, default=2026)

    def handle(self, *args, **options):
        if options["reset"] and not settings.DEBUG and not options["allow_production"]:
            raise CommandError("Refusing to --reset with DEBUG off. Add --allow-production.")
        if not options["reset"] and AcademicTerm.objects.filter(name=MAIN_TERM).exists():
            raise CommandError("Seed data is already present. Run with --reset to rebuild it.")

        self.rng = random.Random(options["random_seed"])
        self.password = options["password"]
        self.now = timezone.now()
        self.today = timezone.localdate()
        self.used_emails = set(User.objects.values_list("email", flat=True))
        self.used_refs = set()

        with transaction.atomic():
            if options["reset"]:
                self.reset()
            self.seed()

    # ------------------------------------------------------------------ helpers
    def at(self, day, hour=None, minute=None):
        """An aware datetime on `day`, at a plausible office hour unless given."""
        hour = self.rng.randint(7, 20) if hour is None else hour
        minute = self.rng.randint(0, 59) if minute is None else minute
        moment = timezone.make_aware(datetime.combine(day, time(hour, minute)))
        return min(moment, self.now - timedelta(minutes=self.rng.randint(5, 90)))

    def phone(self):
        prefix = f"07{self.rng.choice('0111222499')}{self.rng.randint(0, 9)}"
        return f"{prefix}{self.rng.randint(100000, 999999)}"

    def email(self, first, last, domain):
        base = f"{first}.{last}".lower().replace("'", "")
        candidate, n = f"{base}@{domain}", 1
        while candidate in self.used_emails:
            n += 1
            candidate = f"{base}{n}@{domain}"
        self.used_emails.add(candidate)
        return candidate

    def user(self, first, last, role, domain, *, login=False, phone=""):
        user = User(
            email=self.email(first, last, domain),
            first_name=first,
            last_name=last,
            role=role,
            phone=phone,
            is_active=True,
        )
        if login:
            user.set_password(self.password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    @staticmethod
    def hundreds(amount):
        return (amount / 100).quantize(Decimal("1")) * 100

    def ref(self, method):
        while True:
            if method == Payment.Method.MPESA:
                value = "T" + "".join(self.rng.choices(string.ascii_uppercase + string.digits, k=9))
            elif method == Payment.Method.BANK:
                value = f"FT26{self.rng.randint(10_000_000, 99_999_999)}"
            else:
                value = f"CSH-{self.rng.randint(1000, 9999)}"
            if value not in self.used_refs:
                self.used_refs.add(value)
                return value

    def lesson_days(self, class_group, start, end):
        weekdays = {rule.weekday: rule for rule in class_group.schedule_rules.all()}
        day = start
        while day <= end:
            rule = weekdays.get(day.weekday())
            if rule and day not in self.public_holidays:
                yield day, rule
            day += timedelta(days=1)

    # ------------------------------------------------------------------ reset
    def reset(self):
        for model in (
            ReconciliationIssue,
            ReconciliationRun,
            Refund,
            Receipt,
            Payment,
            PaymentAttempt,
            StudentAccessRestriction,
            Invoice,
            AttendanceRecord,
            ResourceAccessGrant,
            ResourceInterest,
            Resource,
            EnrollmentApplication,
            EnrollmentCampaign,
            ProgramRegistration,
            Program,
            ClassEnrollment,
            ScheduleRule,
            ClassGroup,
            TeacherSubject,
            AcademicTerm,
            Subject,
            StudentGuardian,
            Student,
            GuardianProfile,
            TeacherProfile,
            UserInvitation,
        ):
            model.objects.all().delete()
        removed, _ = (
            User.objects.exclude(role__in=(User.Role.OWNER, User.Role.ADMIN))
            .exclude(is_superuser=True)
            .delete()
        )
        # Staff accounts this command created on an earlier run.
        removed += User.objects.filter(email__iendswith=f"@{STAFF_DOMAIN}").delete()[0]
        self.used_emails = set(User.objects.values_list("email", flat=True))
        self.stdout.write(f"Cleared school data ({removed} non-staff rows removed).")

    # ------------------------------------------------------------------ seed
    def seed(self):
        rng = self.rng
        term_start = self.today - timedelta(weeks=11, days=self.today.weekday())  # a Monday
        self.term_start = term_start
        self.public_holidays = {date(self.today.year, 10, 10), date(self.today.year, 10, 20)}

        self.owner = User.objects.filter(role=User.Role.OWNER, is_active=True).order_by(
            "id"
        ).first() or self.user("Esther", "Nduta", User.Role.OWNER, STAFF_DOMAIN, login=True)
        admin = self.user(
            "Lilian", "Wairimu", User.Role.ADMIN, STAFF_DOMAIN, login=True, phone=self.phone()
        )
        self.org_settings()

        subjects = {name: Subject.objects.create(name=name) for name in SUBJECTS}
        main = AcademicTerm.objects.create(
            name=MAIN_TERM, starts_on=term_start, ends_on=self.today + timedelta(days=6)
        )
        holiday_start = self.today + timedelta(days=(7 - self.today.weekday()) % 7 + 7)
        holiday = AcademicTerm.objects.create(
            name=HOLIDAY_TERM, starts_on=holiday_start, ends_on=holiday_start + timedelta(days=24)
        )

        teachers = []
        for index, (first, last, taught) in enumerate(TEACHERS):
            user = self.user(
                first, last, User.Role.TEACHER, STAFF_DOMAIN, login=index == 0, phone=self.phone()
            )
            profile = TeacherProfile.objects.create(user=user)
            for name in taught:
                TeacherSubject.objects.create(teacher=profile, subject=subjects[name])
            teachers.append(profile)
        User.objects.filter(role=User.Role.TEACHER).update(
            date_joined=self.at(term_start - timedelta(days=20))
        )

        invited = User.objects.create(
            email=self.email("Brian", "Kiplagat", STAFF_DOMAIN),
            first_name="Brian",
            last_name="Kiplagat",
            role=User.Role.TEACHER,
            is_active=False,
        )
        invited.set_unusable_password()
        invited.save()
        TeacherProfile.objects.create(user=invited, status=TeacherProfile.Status.INVITED)
        UserInvitation.objects.create(
            user=invited,
            email=invited.email,
            role=User.Role.TEACHER,
            token_digest=UserInvitation.digest_token(secrets.token_urlsafe(32)),
            expires_at=self.now + timedelta(days=5),
            invited_by=self.owner,
        )

        def make_class(spec, term):
            name, subject, grade, teacher, fee, capacity, slots, has_link = spec
            code = "-".join("".join(rng.choices(string.ascii_lowercase, k=n)) for n in (3, 4, 3))
            group = ClassGroup.objects.create(
                name=name,
                subject=subjects[subject],
                grade_level=grade,
                term=term,
                primary_teacher=teachers[teacher],
                capacity=capacity,
                cost_amount=Decimal(fee),
                default_meeting_url=f"https://meet.google.com/{code}" if has_link else "",
                created_by=self.owner,
            )
            for weekday, start, end in slots:
                ScheduleRule.objects.create(
                    class_group=group, weekday=weekday, start_time=hhmm(start), end_time=hhmm(end)
                )
            ClassGroup.objects.filter(pk=group.pk).update(
                created_at=self.at(term.starts_on - timedelta(days=14))
            )
            return group

        term_classes = [make_class(spec, main) for spec in TERM_CLASSES]
        holiday_classes = [make_class(spec, holiday) for spec in HOLIDAY_CLASSES]
        by_grade = {}
        for group in term_classes:
            by_grade.setdefault(group.grade_level, []).append(group)

        students = self.families(by_grade, admin)
        self.attendance(term_classes)
        self.holiday_signups(students, holiday_classes)
        self.money(admin)
        self.campaigns(term_classes, holiday_classes, students)
        self.registrations()
        self.programs(holiday)
        self.resources(subjects, teachers, students)
        self.report(admin, teachers[0], students)

    def org_settings(self):
        org = OrganizationSettings.load()
        defaults = {
            "contact_phone": "0711 482 905",
            "contact_email": f"hello@{STAFF_DOMAIN}",
            "address": "Valley Arcade, Gitanga Road, Lavington, Nairobi",
            "paybill_display": "Paybill 4078211 · Account: your invoice number",
        }
        for field, value in defaults.items():
            if not getattr(org, field):
                setattr(org, field, value)
        org.save()

    def families(self, by_grade, admin):
        rng = self.rng
        grade_pool = [grade for grade, count in GRADES.items() for _ in range(count)]
        rng.shuffle(grade_pool)
        students, self.enrollments = [], []
        self.showcase = {}
        self.attendance_habit = {}
        self.pay_profile = {}
        self.cutoff = {}  # enrollments that ended: no lessons or bills after this day
        capacity = {group.pk: group.capacity for groups in by_grade.values() for group in groups}

        while grade_pool:
            surname = rng.choice(SURNAMES)
            is_mother = rng.random() < 0.68
            guardian_first = rng.choice(MOTHERS if is_mother else FATHERS)
            phone = self.phone()
            guardian_user = self.user(
                guardian_first,
                surname,
                User.Role.GUARDIAN,
                FAMILY_DOMAIN,
                login="guardian" not in self.showcase,
                phone=phone,
            )
            self.showcase.setdefault("guardian", guardian_user)
            guardian = GuardianProfile.objects.create(user=guardian_user)
            pays = rng.choices(("punctual", "late", "instalments", "struggling"), (50, 22, 18, 10))[
                0
            ]
            children = 2 if rng.random() < 0.16 and len(grade_pool) > 1 else 1
            for _ in range(children):
                grade = grade_pool.pop()
                is_girl = rng.random() < 0.52
                first = rng.choice(GIRLS if is_girl else BOYS)
                joined = self.term_start - timedelta(days=rng.randint(0, 6))
                if rng.random() < 0.18:  # joined mid-term
                    joined = self.term_start + timedelta(days=rng.randint(10, 60))
                student = Student.objects.create(
                    first_name=first, last_name=surname, grade_level=grade
                )
                if grade.startswith("Form") and rng.random() < 0.45:
                    login = "student" not in self.showcase and grade == "Form 3"
                    account = self.user(
                        first, surname, User.Role.STUDENT, FAMILY_DOMAIN, login=login
                    )
                    if login:
                        self.showcase["student"] = account
                    student.user = account
                    student.save(update_fields=("user",))
                StudentGuardian.objects.create(
                    student=student,
                    guardian=guardian,
                    relationship="Mother" if is_mother else "Father",
                )
                Student.objects.filter(pk=student.pk).update(
                    created_at=self.at(joined), joined_at=joined
                )
                User.objects.filter(pk=guardian_user.pk).update(date_joined=self.at(joined))

                self.pay_profile[student.pk] = pays
                # Attendance habit: most students are steady, a handful struggle.
                roll = rng.random()
                self.attendance_habit[student.pk] = (
                    rng.uniform(0.9, 0.99)
                    if roll < 0.7
                    else rng.uniform(0.78, 0.9)
                    if roll < 0.9
                    else rng.uniform(0.5, 0.72)
                )
                options = [g for g in by_grade[grade] if capacity[g.pk] > 0]
                picks = rng.sample(options, k=min(len(options), rng.choice((1, 1, 2, 2, 3))))
                for group in picks:
                    capacity[group.pk] -= 1
                    self.enroll(student, group, joined)
                students.append(student)
        # A few students who stopped coming.
        for student in rng.sample(students, 4):
            Student.objects.filter(pk=student.pk).update(status=Student.Status.INACTIVE)
            student.status = Student.Status.INACTIVE
            student.class_enrollments.update(status=ClassEnrollment.Status.WITHDRAWN)
            stopped = self.today - timedelta(days=rng.randint(15, 45))
            for pk in student.class_enrollments.values_list("pk", flat=True):
                self.cutoff[pk] = stopped
        active = list(
            ClassEnrollment.objects.filter(status=ClassEnrollment.Status.ACTIVE).values_list(
                "pk", flat=True
            )
        )
        for pk in rng.sample(active, 3):
            ClassEnrollment.objects.filter(pk=pk).update(status=ClassEnrollment.Status.PAUSED)
            self.cutoff[pk] = self.today - timedelta(days=rng.randint(8, 20))
        return students

    def enroll(self, student, group, joined):
        enrollment = ClassEnrollment.objects.create(class_group=group, student=student)
        enrolled_at = self.at(joined, hour=self.rng.randint(8, 19))
        ClassEnrollment.objects.filter(pk=enrollment.pk).update(enrolled_at=enrolled_at)
        self.enrollments.append((enrollment, enrolled_at))
        return enrollment

    def attendance(self, term_classes):
        rng = self.rng
        now_local = timezone.localtime(self.now)
        cutoff = self.cutoff
        records, lessons = [], []
        for group in term_classes:
            recorder = group.primary_teacher.user
            enrollments = list(group.enrollments.select_related("student"))
            offset = CLASS_ATTENDANCE.get(group.name, 0)
            for day, rule in self.lesson_days(group, self.term_start, self.today):
                if day == self.today and rule.end_time > now_local.time():
                    continue  # lesson hasn't finished yet
                if day != self.today and rng.random() < 0.04:
                    continue  # the odd lesson the teacher forgot to mark
                lessons.append((group.pk, day, rule.end_time))
                for enrollment in enrollments:
                    if timezone.localdate(enrollment.enrolled_at) > day:
                        continue
                    if day > cutoff.get(enrollment.pk, self.today):
                        continue
                    habit = self.attendance_habit[enrollment.student_id] + offset
                    roll = rng.random()
                    if roll < habit:
                        status = "LATE" if rng.random() < 0.07 else "PRESENT"
                    else:
                        status = "EXCUSED" if rng.random() < 0.28 else "ABSENT"
                    note = ""
                    if status == "EXCUSED":
                        note = rng.choice(
                            ("Unwell", "School function", "Travelling", "Hospital visit")
                        )
                    elif status == "LATE":
                        note = rng.choice(("", "", "Connection issues", "Joined 15 min late"))
                    records.append(
                        AttendanceRecord(
                            class_group=group,
                            student=enrollment.student,
                            lesson_date=day,
                            status=status,
                            note=note,
                            recorded_by=recorder,
                        )
                    )
        AttendanceRecord.objects.bulk_create(records, batch_size=500)
        # recorded_at is auto_now; move it to just after each lesson ended.
        for group_id, day, end in lessons:
            ended = timezone.make_aware(datetime.combine(day, end))
            marked = min(ended + timedelta(minutes=rng.randint(3, 75)), self.now)
            AttendanceRecord.objects.filter(class_group_id=group_id, lesson_date=day).update(
                recorded_at=marked
            )
        self.attendance_count = len(records)

    def holiday_signups(self, students, holiday_classes):
        rng = self.rng
        for group in holiday_classes:
            pool = [
                s for s in students if s.grade_level == group.grade_level and s.status == "ACTIVE"
            ]
            for student in rng.sample(pool, min(len(pool), rng.randint(7, 11))):
                self.enroll(student, group, self.today - timedelta(days=rng.randint(0, 13)))

    def money(self, admin):
        self.recorders = [self.owner, admin, admin]
        self.payment_count = 0
        self.mpesa_payments = []
        for enrollment, enrolled_at in self.enrollments:
            enrollment.refresh_from_db()
            group = enrollment.class_group
            profile = self.pay_profile[enrollment.student_id]
            if group.term.name == HOLIDAY_TERM:
                due = group.term.starts_on - timedelta(days=2)
                issued = min(enrolled_at + timedelta(hours=2), self.now - timedelta(minutes=20))
                self.bill(enrollment, issued, due, f"{group.name} · programme fee", profile)
                continue
            # One invoice per calendar month the student is in class, issued on the 1st.
            stop = self.cutoff.get(enrollment.pk, self.today)
            month = max(timezone.localdate(enrolled_at), self.term_start + timedelta(days=3))
            month = month.replace(day=1)
            while month <= stop:
                first_of_month = self.at(month, hour=8, minute=0)
                issued = max(enrolled_at + timedelta(hours=1), first_of_month)
                due = timezone.localdate(issued) + timedelta(days=9)
                self.bill(enrollment, issued, due, f"{group.name} · {month:%B} fees", profile)
                month = (month + timedelta(days=32)).replace(day=1)

        rng = self.rng
        # One duplicate M-Pesa payment refunded, one cash entry reversed in part.
        for payment, reason in zip(
            rng.sample(self.mpesa_payments, 2),
            ("Parent paid twice for the same month", "Class dropped after the first week"),
            strict=True,
        ):
            payment.refresh_from_db()
            refund = refund_payment(
                payment=payment,
                amount=(payment.amount / 2).quantize(Decimal("1")),
                reason=reason,
                actor=self.owner,
                record_only=True,
            )
            when = min(payment.paid_at + timedelta(days=rng.randint(1, 5)), self.now)
            Refund.objects.filter(pk=refund.pk).update(processed_at=when, created_at=when)

        # Two long-overdue families have their class links paused.
        overdue = (
            Invoice.objects.filter(status=Invoice.Status.OVERDUE, amount_paid=0)
            .values_list("student", flat=True)
            .distinct()
        )
        for student_id in list(overdue)[:2]:
            StudentAccessRestriction.objects.create(
                student_id=student_id,
                reason=StudentAccessRestriction.Reason.OVERDUE_PAYMENT,
                note="Class fee unpaid for over three weeks. Parent reminded by phone.",
                created_by=self.owner,
                restricted_from=self.now - timedelta(days=rng.randint(2, 8)),
            )

    def bill(self, enrollment, issued, due, description, profile):
        """Issue one invoice and record the payments this family would have made against it."""
        rng = self.rng
        invoice = issue_manual_invoice(
            student=enrollment.student,
            enrollment=enrollment,
            total_amount=enrollment.class_group.cost_amount,
            description=description,
            due_date=due,
            actor=self.owner,
        )
        Invoice.objects.filter(pk=invoice.pk).update(issued_at=issued, created_at=issued)
        total = invoice.total_amount
        half = self.hundreds(total / 2)
        if profile == "punctual":
            plan = [(total, rng.randint(0, 8))]
        elif profile == "late":
            plan = [(total, rng.randint(6, 28))]
        elif profile == "instalments":
            plan = [(half, rng.randint(0, 6)), (total - half, rng.randint(12, 30))]
        else:
            plan = [(half, rng.randint(5, 25))] if rng.random() < 0.5 else []
        guardian = enrollment.student.guardians.select_related("user").first()
        for amount, delay in plan:
            paid_day = timezone.localdate(issued) + timedelta(days=delay)
            if paid_day > self.today:
                break
            paid_at = self.at(paid_day, hour=rng.randint(7, 21))
            if paid_at <= issued:
                paid_at = min(issued + timedelta(minutes=rng.randint(20, 240)), self.now)
            if paid_at >= self.now:
                break
            method = rng.choices(
                (Payment.Method.MPESA, Payment.Method.BANK, Payment.Method.CASH), (78, 12, 10)
            )[0]
            payment = record_manual_payment(
                invoice=invoice,
                amount=amount,
                method=method,
                reference=self.ref(method),
                note=""
                if method == Payment.Method.MPESA
                else rng.choice(("", "Paid at the office")),
                actor=rng.choice(self.recorders),
            )
            phone = ""
            if method == Payment.Method.MPESA and guardian and guardian.user.phone:
                phone = "254" + guardian.user.phone[1:]
                self.mpesa_payments.append(payment)
            Payment.objects.filter(pk=payment.pk).update(
                paid_at=paid_at, created_at=paid_at, phone_number=phone
            )
            PaymentAttempt.objects.filter(pk=payment.attempt_id).update(
                created_at=paid_at, completed_at=paid_at
            )
            Receipt.objects.filter(payment=payment).update(issued_at=paid_at)
            self.payment_count += 1
        invoice.refresh_from_db()
        refresh_invoice(invoice)

    def campaigns(self, term_classes, holiday_classes, students):
        rng = self.rng
        open_for = [term_classes[0], term_classes[6], *holiday_classes]
        campaigns = []
        for group in open_for:
            campaign = EnrollmentCampaign.objects.create(
                title=f"Join {group.name}",
                description=(
                    f"Live online lessons with {group.primary_teacher.user.get_full_name()}. "
                    "Small groups, weekly practice and a progress note for parents at the end."
                ),
                target_class=group,
                created_by=self.owner,
                closes_at=self.now + timedelta(days=rng.randint(6, 20)),
            )
            campaigns.append(campaign)
        trip = EnrollmentCampaign.objects.create(
            title="Hell's Gate & Lake Naivasha Geography Field Trip",
            kind=EnrollmentCampaign.Kind.ENQUIRY,
            description=(
                "A one-day trip for Form 2–4 students: gorge walk, geothermal plant and a boat "
                "ride on the lake. Leave your details and we'll call with costs and dates."
            ),
            created_by=self.owner,
        )
        EnrollmentCampaign.objects.create(
            title="Join Form 2 Biology",
            description="Second intake for the term.",
            target_class=term_classes[5],
            status=EnrollmentCampaign.Status.CLOSED,
            created_by=self.owner,
        )

        def apply(campaign, days_ago, status, *, student=None, reason=""):
            girl = rng.random() < 0.5
            first, last = (
                (student.first_name, student.last_name)
                if student
                else (rng.choice(GIRLS if girl else BOYS), rng.choice(SURNAMES))
            )
            parent = rng.choice(MOTHERS + FATHERS)
            created = self.at(self.today - timedelta(days=days_ago))
            application = EnrollmentApplication.objects.create(
                campaign=campaign,
                first_name=first,
                last_name=last,
                grade_level=campaign.target_class.grade_level
                if campaign.target_class
                else rng.choice(("Form 2", "Form 3")),
                guardian_name=f"{parent} {last}",
                guardian_email=self.email(parent, last, FAMILY_DOMAIN),
                guardian_phone=self.phone(),
                notes=rng.choice(
                    (
                        "",
                        "",
                        "Prefers evening lessons.",
                        "Sitting KCSE next year, weak in algebra.",
                        "Sibling already in one of your classes.",
                        "Can we pay in two instalments?",
                    )
                ),
                status=status,
                created_student=student,
                reviewed_by=self.owner if status != "PENDING" else None,
                rejection_reason=reason,
            )
            reviewed = (
                created + timedelta(hours=rng.randint(3, 40)) if status != "PENDING" else None
            )
            EnrollmentApplication.objects.filter(pk=application.pk).update(
                created_at=created, reviewed_at=reviewed and min(reviewed, self.now)
            )

        for campaign in campaigns:
            group = campaign.target_class
            members = [e.student for e in group.enrollments.select_related("student")[:2]]
            for student in members:
                apply(
                    campaign,
                    rng.randint(14, 60) if group.term.name == MAIN_TERM else rng.randint(0, 12),
                    "ACCEPTED",
                    student=student,
                )
            for _ in range(rng.randint(1, 3)):
                apply(campaign, rng.randint(0, 6), "PENDING")
        apply(
            campaigns[0],
            33,
            "REJECTED",
            reason="Student is in Form 1. Offered a place in next year's Form 2 class.",
        )
        apply(
            campaigns[1],
            9,
            "REJECTED",
            reason="Class is full this term; added to the January waiting list.",
        )
        for days in (1, 4, 11):
            apply(trip, days, "PENDING")

    def registrations(self):
        rng = self.rng
        levels = [c for c, _ in ProgramRegistration.Level.choices if c != "OTHER"]
        subjects = [c for c, _ in ProgramRegistration.SUBJECT_CHOICES]
        for _ in range(30):
            days_ago = int(rng.triangular(0, 50, 2))
            status = (
                "NEW"
                if days_ago < 5
                else rng.choices(("NEW", "CONTACTED", "ENROLLED", "DECLINED"), (1, 4, 5, 2))[0]
            )
            last = rng.choice(SURNAMES)
            level = rng.choice(levels)
            registration = ProgramRegistration.objects.create(
                student_name=f"{rng.choice(GIRLS + BOYS)} {last}",
                parent_name=f"{rng.choice(MOTHERS + FATHERS)} {last}",
                level=level,
                study_mode=rng.choices(
                    [c for c, _ in ProgramRegistration.StudyMode.choices], (3, 2, 6)
                )[0],
                subjects=rng.sample(subjects, rng.choice((1, 1, 2, 2, 3))),
                subjects_other="Computer Studies" if rng.random() < 0.06 else "",
                parent_phone=self.phone(),
                status=status,
            )
            ProgramRegistration.objects.filter(pk=registration.pk).update(
                created_at=self.at(self.today - timedelta(days=days_ago))
            )

    def programs(self, holiday):
        Program.objects.create(
            title="December Holiday Tuition",
            audience="Grade 6 to Form 4 and IGCSE · online and face to face",
            starts_on=holiday.starts_on,
            ends_on=holiday.ends_on,
        )
        january = date(self.today.year + 1, 1, 10)
        Program.objects.create(
            title="Term 1 Weekend Classes",
            audience="Form 2 to Form 4 · Saturday mornings online",
            starts_on=january,
            ends_on=january + timedelta(weeks=11),
        )

    def resources(self, subjects, teachers, students):
        rng = self.rng
        catalogue = (
            (
                "KCSE Mathematics Papers 1 & 2 · 2021–2025 with marking schemes",
                "EXAM_PAPER",
                "Mathematics",
                "Form 4",
                750,
                None,
            ),
            (
                "Quadratic expressions and equations · worked notes",
                "NOTES",
                "Mathematics",
                "Form 3",
                None,
                0,
            ),
            (
                "Grade 8 Mathematics revision booklet (CBC)",
                "STUDY_GUIDE",
                "Mathematics",
                "Grade 8",
                450,
                None,
            ),
            ("Waves and sound · summary notes", "NOTES", "Physics", "Form 3", None, 1),
            ("KCSE Chemistry practicals guide", "STUDY_GUIDE", "Chemistry", "Form 4", 600, None),
            ("Organic chemistry I · quick reference", "NOTES", "Chemistry", "Form 4", None, 2),
            ("Gaseous exchange in plants and animals", "NOTES", "Biology", "Form 2", None, 2),
            (
                "KCSE Biology Paper 3 practicals · past papers",
                "EXAM_PAPER",
                "Biology",
                "Form 4",
                500,
                None,
            ),
            (
                "Blossoms of the Savannah · set book guide",
                "STUDY_GUIDE",
                "English",
                "Form 4",
                400,
                None,
            ),
            ("A Doll's House · set book guide", "STUDY_GUIDE", "English", "Form 3", 400, None),
            (
                "Twenty model compositions with examiner comments",
                "BOOK",
                "English",
                "Form 3",
                350,
                None,
            ),
            ("Comprehension practice set · Grade 8", "NOTES", "English", "Grade 8", None, 3),
            ("Sarufi na matumizi ya lugha · Gredi ya 7", "NOTES", "Kiswahili", "Grade 7", None, 4),
            ("Weather and climate · map work exercises", "NOTES", "Geography", "Form 2", None, 5),
            (
                "IGCSE Extended Mathematics · topic tests",
                "EXAM_PAPER",
                "Mathematics",
                "IGCSE Year 10",
                900,
                None,
            ),
        )
        items = []
        for index, (title, kind, subject, grade, price, teacher) in enumerate(catalogue):
            author = teachers[teacher].user if teacher is not None else self.owner
            resource = Resource.objects.create(
                title=title,
                description=rng.choice(
                    (
                        "Clear, exam-focused material used in our live lessons.",
                        "Short explanations, worked examples and practice questions with answers.",
                        "Printable PDF. Work through one section per week alongside class.",
                    )
                ),
                resource_type=kind,
                subject=subjects[subject],
                grade_level=grade,
                price_amount=Decimal(price) if price else None,
                is_published=index != len(catalogue) - 1,
                created_by=author,
            )
            Resource.objects.filter(pk=resource.pk).update(
                created_at=self.at(self.term_start + timedelta(days=rng.randint(0, 60)))
            )
            items.append(resource)

        paid = [r for r in items if r.price_amount and r.is_published]
        for _ in range(11):
            resource = rng.choice(paid)
            student = rng.choice(
                [s for s in students if s.grade_level == resource.grade_level] or students
            )
            status = rng.choices(("PENDING", "CONTACTED", "FULFILLED", "DECLINED"), (4, 3, 4, 1))[0]
            guardian = student.guardians.select_related("user").first().user
            interest = ResourceInterest.objects.create(
                resource=resource,
                student_name=str(student),
                email=guardian.email,
                phone=guardian.phone,
                notes=rng.choice(("", "", "Will pay by M-Pesa.", "Need it before the mock exams.")),
                status=status,
            )
            ResourceInterest.objects.filter(pk=interest.pk).update(
                created_at=self.at(self.today - timedelta(days=rng.randint(0, 30)))
            )
            if status == "FULFILLED":
                ResourceAccessGrant.objects.get_or_create(
                    resource=resource, student=student, defaults={"granted_by": self.owner}
                )

    def report(self, admin, teacher, students):
        counts = Invoice.objects.values_list("status", flat=True)
        overdue = sum(1 for status in counts if status == Invoice.Status.OVERDUE)
        self.stdout.write(self.style.SUCCESS("Seeded Shuleni Online."))
        self.stdout.write(
            f"  {len(students)} students · {ClassGroup.objects.count()} classes · "
            f"{self.attendance_count} attendance marks · "
            f"{len(counts)} invoices ({overdue} overdue) · "
            f"{self.payment_count} payments · {ProgramRegistration.objects.count()} registrations"
        )
        self.stdout.write(f"  Sign in with password {self.password}:")
        self.stdout.write(
            f"    owner     {self.owner.email} (keeps its password if it already existed)"
        )
        for label, user in (
            ("admin", admin),
            ("teacher", teacher.user),
            ("guardian", self.showcase.get("guardian")),
            ("student", self.showcase.get("student")),
        ):
            if user:
                self.stdout.write(f"    {label:<9} {user.email}")
