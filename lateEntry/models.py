from django.db import models


class Student(models.Model):
    barcode_hash = models.CharField(max_length=20, unique=True)
    roll_no = models.CharField(max_length=20, unique=True)
    student_name = models.CharField(max_length=100)
    DOB = models.DateField()
    gender = models.CharField(max_length=10)
    student_no = models.CharField(max_length=15)
    blood_group = models.CharField(max_length=5)
    parent_name = models.CharField(max_length=100)
    parent_no = models.CharField(max_length=15)

    def __str__(self):
        return f"{self.student_name} ({self.roll_no})"

