from django.apps import AppConfig


class ScreensConfig(AppConfig):
    name = "jungle.screens"
    verbose_name = "Ecrane (terenuri și lobby)"

    def ready(self) -> None:
        from jungle.screens import signals  # noqa: F401 - connects the "changed" notices
