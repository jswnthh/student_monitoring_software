from django.apps import AppConfig


class LateEntryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'lateEntry'

    def ready(self):
        import lateEntry.signals  
