"""Database guarantees for R-041 (ADR-0004): 30-minute grid and allowed durations.

Club time is always a whole number of hours away from UTC, so the grid can be checked in UTC.
The event room (session type "event") may be booked for longer than 180 minutes (Q34).
"""

from django.db import migrations

CHECKS = """
ALTER TABLE bookings_booking
  ADD CONSTRAINT booking_on_grid CHECK (
    EXTRACT(SECOND FROM starts_at) = 0 AND EXTRACT(MINUTE FROM starts_at) IN (0, 30)
    AND EXTRACT(SECOND FROM ends_at) = 0 AND EXTRACT(MINUTE FROM ends_at) IN (0, 30)
  ),
  ADD CONSTRAINT booking_allowed_duration CHECK (
    session_type = 'event'
    OR (EXTRACT(EPOCH FROM (ends_at - starts_at)) BETWEEN 3600 AND 10800
        AND MOD(EXTRACT(EPOCH FROM (ends_at - starts_at))::integer, 1800) = 0)
  );
ALTER TABLE bookings_classsession
  ADD CONSTRAINT class_on_grid CHECK (
    EXTRACT(SECOND FROM starts_at) = 0 AND EXTRACT(MINUTE FROM starts_at) IN (0, 30)
  );
"""

REVERSE = """
ALTER TABLE bookings_booking DROP CONSTRAINT booking_on_grid, DROP CONSTRAINT booking_allowed_duration;
ALTER TABLE bookings_classsession DROP CONSTRAINT class_on_grid;
"""


class Migration(migrations.Migration):
    dependencies = [("bookings", "0001_initial")]

    operations = [migrations.RunSQL(CHECKS, reverse_sql=REVERSE)]
