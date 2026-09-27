"""Database-level guarantees shared by several apps (ADR-0004)."""

from __future__ import annotations

from django.db import migrations

_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION jungle_forbid_modification() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'table % is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;
"""


def append_only(table: str) -> list[migrations.RunSQL]:
    """Migration operations that make `table` append-only (no UPDATE, no DELETE)."""
    trigger = f"{table}_append_only"
    return [
        migrations.RunSQL(_FUNCTION_SQL, reverse_sql=migrations.RunSQL.noop),
        migrations.RunSQL(
            f"CREATE TRIGGER {trigger} BEFORE UPDATE OR DELETE ON {table} "
            f"FOR EACH ROW EXECUTE FUNCTION jungle_forbid_modification();",
            reverse_sql=f"DROP TRIGGER IF EXISTS {trigger} ON {table};",
        ),
    ]
