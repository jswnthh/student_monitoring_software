from django.shortcuts import render
from django.http import JsonResponse
from .models import Student

def scan_view(request):
    if request.method == 'POST':
        # Handle form submission or other POST logic here
        pass
    return render(request, 'lateEntry/scan.html')


def get_student_by_hash(request, barcode_hash):
    try:
        student = Student.objects.get(barcode_hash=barcode_hash)
        data = {
            'id':student.barcode_hash,
            'name': student.student_name,
            'roll_no': student.roll_no,
            'DOB': student.DOB.strftime('%Y-%m-%d'),  # Format date as string
            'dept':getattr(student, 'dept', 'N/A'),  # Assuming dept is an attribute
            'year':getattr(student, 'year', 'N/A'),  # Assuming year is an attribute
            'student_no': student.student_no,
            'blood_group': student.blood_group,
            'parent_name': student.parent_name,
            'parent_no': student.parent_no,
        }

        return JsonResponse({
            'success': True,
            'student': data
        })
    except Student.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Student not found'
        }, status=404)  