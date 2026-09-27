"""Make the table(s) append-only at database level (ADR-0004)."""

from django.db import migrations

from jungle.core.db import append_only


class Migration(migrations.Migration):
    dependencies = [("configuration", "0001_initial")]

    operations = [*append_only("configuration_configversion")]
