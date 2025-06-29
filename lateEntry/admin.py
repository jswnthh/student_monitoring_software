from django.contrib import admin
from .models import Student

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_name', 'roll_no', 'barcode_hash')
    search_fields = ('student_name', 'roll_no', 'barcode_hash')

