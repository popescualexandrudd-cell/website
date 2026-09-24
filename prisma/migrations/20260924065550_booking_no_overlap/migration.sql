-- Two exclusive lessons (individual or semi-private) can never overlap, including
-- the break between lessons: "blockedUntil" = "endsAt" + break at booking time.
-- Group enrolments share a session, so they are excluded from the constraint.
-- Only active states block time; cancelled, done and no-show bookings free it.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_blockedUntil_after_start"
  CHECK ("endsAt" > "startsAt" AND "blockedUntil" >= "endsAt");

ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (tstzrange("startsAt", "blockedUntil", '[)') WITH &&)
  WHERE ("groupScheduleId" IS NULL AND "status" IN ('IN_ASTEPTARE', 'CONFIRMATA'));

-- Singletons: settings and coach profile always live in row 1.
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_singleton" CHECK ("id" = 1);
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_singleton" CHECK ("id" = 1);
