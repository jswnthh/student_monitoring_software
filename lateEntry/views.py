from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Student, LateArrival, LateSummary
from datetime import timedelta, date

import json


def scan_view(request):
    if request.method == 'POST':
        # Handle form submission or other POST logic here
        pass
    return render(request, 'lateEntry/scan.html')


def get_student_by_roll_no(request, roll_no):
    try:
        student = Student.objects.get(roll_no=roll_no)
        data = {
            #'id':student.barcode_hash,
            'name': student.student_name,
            'roll_no': student.roll_no,
            'DOB': student.DOB.strftime('%Y-%m-%d'),  # Format date as string
            'dept':getattr(student, 'dept', 'N/A'),  # Assuming dept is an attribute
            'year':getattr(student, 'year', 'N/A'),  # Assuming year is an attribute
            'student_no': student.student_no,
            'blood_group': student.blood_group,
            'parent_name': student.parent_name,
            'parent_no': student.parent_no,
            'dept' : student.dept,
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
    
def dashboard_view(request):
    # Logic for the dashboard view
    return render(request, 'lateEntry/dashboard.html')  

def check_student_exists(request):
    roll_no = request.GET.get('roll_no', '').strip()
    try:
        student = Student.objects.get(roll_no=roll_no)
        return JsonResponse({'exists': True, 'name': student.student_name})
    except Student.DoesNotExist:
        return JsonResponse({'exists': False})
    

@csrf_exempt
def record_late_entries(request):
    if request.method == 'POST':
        print("Recording late entries")
        try:
            data = json.loads(request.body)
            roll_nos = data.get('roll_nos', [])
            today = date.today()

            for roll_no in roll_nos:
                try:
                    student = Student.objects.get(roll_no=roll_no)
                    LateArrival.objects.create(student=student, date=today)
                except Student.DoesNotExist:
                    continue  

            return JsonResponse({'success': True})
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})

    return JsonResponse({'success': False, 'error': 'Invalid method'})

def recorded_students_api(request):
    from datetime import date
    today = date.today()

    summaries = LateSummary.objects.filter(date=today).select_related('student')

    data = []
    for s in summaries:
        data.append({
            'name': s.student.student_name,
            'roll_no': s.student.roll_no,
            'late_entries': s.late_count
        })

    return JsonResponse({'students': data})

def student_history_api(request):
    roll_no = request.GET.get('roll_no')
    week_offset = int(request.GET.get('week', 0))  # default to current week

    print(f"Received roll_no: {roll_no}, week_offset: {week_offset}")  # 🔍 Debug

    try:
        student = Student.objects.get(roll_no=roll_no)
    except Student.DoesNotExist:
        print("Student not found")  # 🔍 Debug
        return JsonResponse({'history': []})

    today = date.today()
    current = today - timedelta(weeks=week_offset)

    # Go back day-by-day to get 6 non-Sunday days for this specific week
    days = []
    i = 0
    while len(days) < 6:
        d = current - timedelta(days=i)
        if d.weekday() != 6:  # Skip Sunday
            days.append(d)
        i += 1

    days.reverse()  # Oldest first
    print(f"Dates considered: {days}")

    data = []
    for d in days:
        summary = LateSummary.objects.filter(student=student, date=d).first()
        print(f"{d}: {summary.late_count if summary else 'No entry'}")
        data.append({
            'date': d.strftime('%d %b'),
            'count': summary.late_count if summary else 0
        })

    return JsonResponse({'history': data})


