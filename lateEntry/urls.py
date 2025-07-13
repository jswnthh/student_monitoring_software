from django.urls import path
from . import views

urlpatterns = [
    path('', views.scan_view, name='scan'),
    #path('api/student/<str:barcode_hash>/', views.get_student_by_hash, name='get_student_by_hash'),
    path('api/student/<str:roll_no>/', views.get_student_by_roll_no),
    path('api/check-student/', views.check_student_exists, name='check_student_exists'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path("api/record-late-entries/", views.record_late_entries, name="record_late_entries"),
    path('api/recorded-students/', views.recorded_students_api, name='recorded_students_api'),
    path('api/student-history/', views.student_history_api, name='student-history'),


]