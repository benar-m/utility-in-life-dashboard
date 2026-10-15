from django.contrib import admin

from .models import AcademicTerm, ClassEnrollment, ClassGroup, ScheduleRule, Subject, TeacherSubject

admin.site.register(Subject)
admin.site.register(AcademicTerm)
admin.site.register(TeacherSubject)
admin.site.register(ClassGroup)
admin.site.register(ClassEnrollment)
admin.site.register(ScheduleRule)
