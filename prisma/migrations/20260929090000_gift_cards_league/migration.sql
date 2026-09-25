-- CreateEnum
CREATE TYPE "GiftCardStatus" AS ENUM ('CERERE', 'ACTIVA', 'FOLOSITA', 'ANULATA');

-- CreateEnum
CREATE TYPE "MatchWinner" AS ENUM ('A', 'B');

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "giftCardsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "googleRating" DOUBLE PRECISION,
ADD COLUMN     "googleReviewCount" INTEGER,
ADD COLUMN     "googleReviewUrl" TEXT,
ADD COLUMN     "leagueEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "seededAssets" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "status" "GiftCardStatus" NOT NULL DEFAULT 'CERERE',
    "lessonTypeId" TEXT,
    "durationMin" INTEGER,
    "lessons" INTEGER,
    "amountRon" INTEGER,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "message" TEXT,
    "gdprConsent" BOOLEAN NOT NULL,
    "gdprConsentAt" TIMESTAMP(3) NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "attribution" JSONB,
    "internalNotes" TEXT,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" DATE,
    "sentAt" TIMESTAMP(3),
    "redeemedAt" TIMESTAMP(3),
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmateurPlayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "level" "Level" NOT NULL,
    "slots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "singles" BOOLEAN NOT NULL DEFAULT true,
    "doubles" BOOLEAN NOT NULL DEFAULT false,
    "inLeague" BOOLEAN NOT NULL DEFAULT false,
    "lookingForPartner" BOOLEAN NOT NULL DEFAULT false,
    "listed" BOOLEAN NOT NULL DEFAULT false,
    "about" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "gdprConsent" BOOLEAN NOT NULL,
    "gdprConsentAt" TIMESTAMP(3) NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "attribution" JSONB,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmateurPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueSeason" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "startsOn" DATE,
    "endsOn" DATE,
    "rules" JSONB,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "pointsWin" INTEGER NOT NULL DEFAULT 3,
    "pointsLoss" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMatch" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "division" TEXT,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "playedOn" DATE,
    "score" TEXT,
    "winner" "MatchWinner",
    "walkover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_code_key" ON "GiftCard"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_bookingId_key" ON "GiftCard"("bookingId");

-- CreateIndex
CREATE INDEX "GiftCard_status_createdAt_idx" ON "GiftCard"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AmateurPlayer_approved_listed_idx" ON "AmateurPlayer"("approved", "listed");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSeason_slug_key" ON "LeagueSeason"("slug");

-- CreateIndex
CREATE INDEX "LeagueMatch_seasonId_playedOn_idx" ON "LeagueMatch"("seasonId", "playedOn");

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_lessonTypeId_fkey" FOREIGN KEY ("lessonTypeId") REFERENCES "LessonType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCard" ADD CONSTRAINT "GiftCard_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatch" ADD CONSTRAINT "LeagueMatch_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "LeagueSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatch" ADD CONSTRAINT "LeagueMatch_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "AmateurPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMatch" ADD CONSTRAINT "LeagueMatch_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "AmateurPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Elite Tenis Club: the club's own data on an existing site ─────────────────────────────
-- Every update below replaces only a value the first version shipped and nobody edited.

-- Opening hours from the club's rate flyer: courts are hired 08:00–01:00.
UPDATE "SiteSettings"
SET "workingHours" = '[{"label": {"en": "Every day", "ro": "Zilnic"}, "hours": {"en": "08:00–01:00", "ro": "08:00–01:00"}}]'::jsonb
WHERE "workingHours" = '[{"label": {"en": "Every day", "ro": "Zilnic"}, "hours": {"en": "08:00–23:00", "ro": "08:00–23:00"}}]'::jsonb;

-- Court hire rates (summer from the flyer, winter 10 lei more per hour).
UPDATE "SiteSettings"
SET "rentalRates" = $j${"ro": "### Tarife de vară (de la 1 mai)\n\n| Tarif pe oră | 08:00–17:00 | 17:00–01:00 |\n| --- | --- | --- |\n| Teren afară, luni–vineri | 40 lei | 80 lei |\n| Teren în sală, luni–vineri | 50 lei | 80 lei |\n| Weekend, tarif unic | 50 lei | 80 lei |\n\n### Tarife de iarnă\n\nIarna, fiecare oră costă cu 10 lei mai mult.\n\n| Tarif pe oră | 08:00–17:00 | 17:00–01:00 |\n| --- | --- | --- |\n| Teren afară, luni–vineri | 50 lei | 90 lei |\n| Teren în sală, luni–vineri | 60 lei | 90 lei |\n| Weekend, tarif unic | 60 lei | 90 lei |\n\n**Joacă mereu cu mingi noi.** Închiriezi în weekend cel puțin 2 ore de teren și primești cadou o cutie de 4 mingi Dunlop ATP Championship. Oferta e valabilă doar pentru rezervările făcute direct la club.", "en": "### Summer rates (from 1 May)\n\n| Rate per hour | 08:00–17:00 | 17:00–01:00 |\n| --- | --- | --- |\n| Outdoor court, Monday–Friday | 40 lei | 80 lei |\n| Indoor court, Monday–Friday | 50 lei | 80 lei |\n| Weekend, single rate | 50 lei | 80 lei |\n\n### Winter rates\n\nIn winter every hour costs 10 lei more.\n\n| Rate per hour | 08:00–17:00 | 17:00–01:00 |\n| --- | --- | --- |\n| Outdoor court, Monday–Friday | 50 lei | 90 lei |\n| Indoor court, Monday–Friday | 60 lei | 90 lei |\n| Weekend, single rate | 60 lei | 90 lei |\n\n**Always play with new balls.** Book a court for at least 2 hours at the weekend and get a can of 4 Dunlop ATP Championship balls as a gift. Only for bookings made directly with the club."}$j$::jsonb
WHERE "rentalRates" IS NULL OR "rentalRates" = '{"en": "[DE COMPLETAT]", "ro": "[DE COMPLETAT]"}'::jsonb;

-- The greens of the club's logo, in place of the template's colours.
UPDATE "SiteSettings" SET "colorBrand" = '#16351b' WHERE "colorBrand" = '#0f3b2f';
UPDATE "SiteSettings" SET "colorAccent" = '#3a7a1e' WHERE "colorAccent" = '#c24f1d';

-- The club's Google reviews (updated by hand from the admin).
UPDATE "SiteSettings" SET "googleRating" = 4.5, "googleReviewCount" = 257
WHERE "googleRating" IS NULL AND "googleReviewCount" IS NULL;

-- The opening line of the club's own site.
UPDATE "Scene"
SET "title" = $j${"ro": "Experiență de elită în lumea tenisului.", "en": "An elite experience in the world of tennis."}$j$::jsonb,
    "body" = jsonb_build_object(
      'ro', replace("body"->>'ro', 'Academia de tenis de la ', 'Școală de tenis pentru copii și adulți la '),
      'en', replace("body"->>'en', 'The tennis academy at ', 'A tennis school for children and adults at ')
    )
WHERE "key" = 'deschiderea' AND "title" = '{"en": "Learn. Play. Compete.", "ro": "Învață. Joacă. Concurează."}'::jsonb;

-- The reviews published on elitetenisclub.ro replace the template's examples.
UPDATE "Testimonial"
SET "author" = $j$Adrian M.$j$, "role" = $j${"ro": "Profesor", "en": "Teacher"}$j$::jsonb, "text" = $j${"ro": "Fetele mele gemene de 5 ani sunt la începutul călătoriei lor în tenis, și acest club a fost alegerea perfectă pentru ele. Antrenorii sunt răbdători și pricepuți, iar fiecare antrenament este plin de zâmbete și entuziasm.", "en": "My five-year-old twin girls are at the start of their tennis journey, and this club was the perfect choice for them. The coaches are patient and skilled, and every session is full of smiles and enthusiasm."}$j$::jsonb, "isExample" = false,
    "published" = true, "consent" = true, "consentAt" = CURRENT_TIMESTAMP
WHERE "id" = 'seed-testimonial-01' AND "isExample" = true;

UPDATE "Testimonial"
SET "author" = $j$Cristian$j$, "role" = $j${"ro": "Manager firmă", "en": "Company manager"}$j$::jsonb, "text" = $j${"ro": "Am participat la competițiile organizate de acest club și am fost impresionat de nivelul lor de organizare și profesionalism. Sunt un club care se preocupă cu adevărat de dezvoltarea tenisului la toate nivelurile.", "en": "I have taken part in the competitions this club organises and was impressed by how well organised and professional they are. They are a club that truly cares about developing tennis at every level."}$j$::jsonb, "isExample" = false,
    "published" = true, "consent" = true, "consentAt" = CURRENT_TIMESTAMP
WHERE "id" = 'seed-testimonial-02' AND "isExample" = true;

UPDATE "Testimonial"
SET "author" = $j$[DE COMPLETAT]$j$, "role" = $j${"ro": "Părinte", "en": "Parent"}$j$::jsonb, "text" = $j${"ro": "Ceea ce m-a impresionat cel mai mult este modul în care antrenorii din acest club lucrează cu copiii mici. Fiul meu se distrează enorm la [DE COMPLETAT]", "en": "What impressed me most is the way the coaches at this club work with young children. My son has an enormous amount of fun at [DE COMPLETAT]"}$j$::jsonb, "isExample" = false,
    "published" = false, "consent" = false, "consentAt" = NULL
WHERE "id" = 'seed-testimonial-03' AND "isExample" = true;

UPDATE "Testimonial"
SET "author" = $j$[DE COMPLETAT]$j$, "role" = $j${"ro": "[DE COMPLETAT]", "en": "[DE COMPLETAT]"}$j$::jsonb, "text" = $j${"ro": "Orele private cu antrenorul au făcut o diferență semnificativă în abilitățile mele. Recomand cu încredere [DE COMPLETAT]", "en": "The private lessons with the coach made a significant difference to my game. I can confidently recommend [DE COMPLETAT]"}$j$::jsonb, "isExample" = false,
    "published" = false, "consent" = false, "consentAt" = NULL
WHERE "id" = 'seed-testimonial-04' AND "isExample" = true;

