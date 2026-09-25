-- The club's opening year and its court hire rates.
ALTER TABLE "SiteSettings" ADD COLUMN "foundedYear" INTEGER;
ALTER TABLE "SiteSettings" ADD COLUMN "rentalRates" JSONB;

-- Tournaments held at the club.
CREATE TYPE "TournamentOrganizer" AS ENUM ('FRT', 'TENIS10', 'SPORTYA', 'CLUB', 'ALTUL');

CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "organizer" "TournamentOrganizer" NOT NULL,
    "category" JSONB,
    "summary" JSONB,
    "startsOn" DATE,
    "endsOn" DATE,
    "registrationUrl" TEXT,
    "resultsUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");
CREATE INDEX "Tournament_startsOn_idx" ON "Tournament"("startsOn");

-- Elite Tenis Club opens every day, 08:00–23:00 (court hire). The first version showed the
-- lesson hours as the club's hours; only that original value is replaced.
UPDATE "SiteSettings"
SET "workingHours" = '[{"label": {"en": "Every day", "ro": "Zilnic"}, "hours": {"en": "08:00–23:00", "ro": "08:00–23:00"}}]'::jsonb
WHERE "workingHours" = '[{"label": {"en": "Monday–Friday", "ro": "Luni–vineri"}, "hours": {"en": "08:00–21:00", "ro": "08:00–21:00"}}, {"label": {"en": "Saturday", "ro": "Sâmbătă"}, "hours": {"en": "08:00–14:00", "ro": "08:00–14:00"}}, {"label": {"en": "Sunday", "ro": "Duminică"}, "hours": {"en": "closed", "ro": "închis"}}]'::jsonb;

-- The home page tells the club's story first; the new sections are added by the seed.
UPDATE "Scene" SET "order" = CASE "key"
    WHEN 'deschiderea' THEN 1
    WHEN 'cifre' THEN 3
    WHEN 'programe' THEN 5
    WHEN 'academia' THEN 6
    WHEN 'manifest' THEN 8
    WHEN 'echipa' THEN 9
    WHEN 'metoda' THEN 10
    WHEN 'clubul' THEN 12
    WHEN 'galerie' THEN 13
    WHEN 'lectii' THEN 15
    WHEN 'intrebari' THEN 16
    WHEN 'rezervare' THEN 17
    ELSE "order"
END;
