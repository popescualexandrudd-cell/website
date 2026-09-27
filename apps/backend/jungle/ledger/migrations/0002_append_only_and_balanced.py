"""The ledger in the database itself (ADR-0004, ADR-0009): append-only tables, and every
transaction balanced (entries sum to zero, at least two entries) when the database
transaction commits."""

from django.db import migrations

from jungle.core.db import append_only

BALANCED_SQL = """
CREATE OR REPLACE FUNCTION jungle_ledger_balanced() RETURNS trigger AS $$
DECLARE
    total bigint;
    lines integer;
BEGIN
    SELECT COALESCE(SUM(amount), 0), COUNT(*) INTO total, lines
    FROM ledger_ledgerentry WHERE transaction_id = NEW.transaction_id;
    IF total <> 0 OR lines < 2 THEN
        RAISE EXCEPTION 'ledger transaction % is not balanced (sum %, % entries)',
            NEW.transaction_id, total, lines USING ERRCODE = 'check_violation';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entry_balanced
AFTER INSERT ON ledger_ledgerentry
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION jungle_ledger_balanced();
"""

REVERSE_SQL = """
DROP TRIGGER IF EXISTS ledger_entry_balanced ON ledger_ledgerentry;
DROP FUNCTION IF EXISTS jungle_ledger_balanced();
"""


class Migration(migrations.Migration):
    dependencies = [("ledger", "0001_initial")]

    operations = [
        *append_only("ledger_ledgertransaction"),
        *append_only("ledger_ledgerentry"),
        *append_only("ledger_payment"),
        migrations.RunSQL(BALANCED_SQL, reverse_sql=REVERSE_SQL),
    ]
