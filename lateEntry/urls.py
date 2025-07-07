from django.urls import path
from . import views

urlpatterns = [
    path('', views.scan_view, name='scan'),
    #path('api/student/<str:barcode_hash>/', views.get_student_by_hash, name='get_student_by_hash'),
    path('api/student/<str:roll_no>/', views.get_student_by_roll_no)

]