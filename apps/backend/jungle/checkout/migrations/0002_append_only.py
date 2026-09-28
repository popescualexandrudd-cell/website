"""What the kiosks' Hardware Bridges signed is kept as it came (ADR-0009, ADR-0013)."""

from django.db import migrations

from jungle.core.db import append_only


class Migration(migrations.Migration):
    dependencies = [("checkout", "0001_initial")]

    operations = [*append_only("checkout_cashevent")]
