from django.core.management.base import BaseCommand

from apps.payments.models import Invoice
from apps.payments.services import expire_stale_attempts, mark_overdue_invoices


class Command(BaseCommand):
    help = "Mark unpaid invoices past their due date as overdue and expire stale M-Pesa prompts."

    def handle(self, *args, **options):
        overdue = mark_overdue_invoices()
        expired = sum(
            expire_stale_attempts(invoice)
            for invoice in Invoice.objects.filter(attempts__status="PENDING").distinct()
        )
        self.stdout.write(
            f"Marked {overdue} invoice(s) overdue; expired {expired} stale prompt(s)."
        )
