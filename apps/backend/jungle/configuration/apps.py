from django.apps import AppConfig


class ConfigurationConfig(AppConfig):
    name = "jungle.configuration"
    label = "configuration"
    verbose_name = "Configurare și feature flags"

    def ready(self) -> None:
        from django.db.models.signals import post_migrate

        from jungle.configuration.services import ensure_flag_rows

        post_migrate.connect(ensure_flag_rows, sender=self)
