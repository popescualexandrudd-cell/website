from django.apps import AppConfig


class AIConfig(AppConfig):
    name = "jungle.ai"
    label = "ai"
    verbose_name = "Inteligența artificială"

    def ready(self) -> None:
        from jungle.ai import tools  # noqa: F401 - registers the club's tools
