from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.timezone import now
from .models import LateArrival, LateSummary

def callback(sender, instance, created, **kwargs):
    if created:
        print(f"New late arrival recorded for {instance.student.student_name} on {instance.date}")

@receiver(post_save, sender=LateArrival)
def update_late_summary(sender, instance, created, **kwargs):
    if created:
        student = instance.student
        date = instance.date  # Assuming 'date' is stored in LateArrival

        summary, created_summary = LateSummary.objects.get_or_create(
            student=student,
            date=date,
            defaults={'late_count': 1}
        )

        if not created_summary:
            summary.late_count += 1
            summary.save()
