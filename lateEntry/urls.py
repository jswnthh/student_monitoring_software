from django.urls import path
from . import views

urlpatterns = [
    path('', views.scan_view, name='scan'),
    path('api/student/<str:barcode_hash>/', views.get_student_by_hash, name='get_student_by_hash'),
]