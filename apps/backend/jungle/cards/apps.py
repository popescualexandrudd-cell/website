from django.apps import AppConfig


class CardsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "jungle.cards"
    verbose_name = "Carduri de membru"

    def ready(self) -> None:
        from jungle.cards import services, wallet

        services.on_card_changed(wallet.refresh)
