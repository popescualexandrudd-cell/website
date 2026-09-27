from django.apps import AppConfig


class LeagueConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "jungle.league"
    verbose_name = "Liga Jungle"

    def ready(self) -> None:
        from jungle.league import integration

        integration.connect()
