from django.contrib import admin
from .models import *

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_name', 'roll_no']  # or whatever fields your model has
    search_fields = ['student_name', 'roll_no']
    list_filter = ['dept']  # Assuming 'dept' is a field in your Student model
    ordering = ['roll_no']  # Order by roll_no or any other field you prefer    

@admin.register(LateArrival)
class LateArrivalAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_name', 'roll_no', 'date']  # Adjust as needed
    search_fields = ['student__student_name', 'student__roll_no']
    list_filter = ['date']
    ordering = ['-date']  # Shows latest entries first

    def student_name(self, obj):
        return obj.student.student_name

    def roll_no(self, obj):
        return obj.student.roll_no

@admin.register(LateSummary)
class LateSummaryAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_name', 'roll_no', 'date', 'late_count']
    search_fields = ['student__student_name', 'student__roll_no']
    list_filter = ['date']
    ordering = ['-date']

    def student_name(self, obj):
        return obj.student.student_name 
    
    def roll_no(self, obj):
        return obj.student.roll_no
    

