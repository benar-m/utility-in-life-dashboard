from django.contrib import admin

from .models import (
    Invoice,
    Payment,
    PaymentAttempt,
    Receipt,
    ReconciliationIssue,
    ReconciliationRun,
    Refund,
    StudentAccessRestriction,
)

admin.site.register(Invoice)
admin.site.register(PaymentAttempt)
admin.site.register(Payment)
admin.site.register(Receipt)
admin.site.register(Refund)
admin.site.register(StudentAccessRestriction)
admin.site.register(ReconciliationRun)
admin.site.register(ReconciliationIssue)
