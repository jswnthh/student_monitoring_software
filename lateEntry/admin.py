from django.contrib import admin
from .models import Student

@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['id', 'student_name', 'roll_no']  # or whatever fields your model has
    search_fields = ['student_name', 'roll_no']
    list_filter = ['dept']  # Assuming 'dept' is a field in your Student model
    ordering = ['roll_no']  # Order by roll_no or any other field you prefer    

