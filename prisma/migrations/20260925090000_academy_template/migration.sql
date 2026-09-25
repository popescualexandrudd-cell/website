-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGINE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('GATA', 'IN_PROCESARE', 'EROARE');

-- CreateEnum
CREATE TYPE "BallStage" AS ENUM ('ROSU', 'PORTOCALIU', 'VERDE', 'GALBEN');

-- CreateEnum
CREATE TYPE "ResultLevel" AS ENUM ('REGIONAL', 'NATIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "WaitlistKind" AS ENUM ('LISTA', 'EVALUARE');

-- DropForeignKey
ALTER TABLE "CoachProfile" DROP CONSTRAINT "CoachProfile_photoId_fkey";

-- DropIndex
DROP INDEX "Certification_order_idx";

-- AlterTable
ALTER TABLE "Certification" ADD COLUMN     "coachId" TEXT;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "durationSec" DOUBLE PRECISION,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "kind" "MediaKind" NOT NULL DEFAULT 'IMAGINE',
ADD COLUMN     "poster" JSONB,
ADD COLUMN     "processingAt" TIMESTAMP(3),
ADD COLUMN     "status" "MediaStatus" NOT NULL DEFAULT 'GATA';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "colorAccent" TEXT NOT NULL DEFAULT '#c24f1d',
ADD COLUMN     "colorBrand" TEXT NOT NULL DEFAULT '#0f3b2f',
ADD COLUMN     "heroImageId" TEXT,
ADD COLUMN     "heroVideoId" TEXT,
ADD COLUMN     "labEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "logoId" TEXT;

-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "childFirstName" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "kind" "WaitlistKind" NOT NULL DEFAULT 'LISTA';


-- CreateTable
CREATE TABLE "Coach" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" JSONB NOT NULL,
    "title" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "story" JSONB NOT NULL,
    "philosophy" JSONB,
    "results" JSONB,
    "specialties" JSONB NOT NULL,
    "yearsExperience" INTEGER,
    "languages" JSONB NOT NULL,
    "photoId" TEXT,
    "videoId" TEXT,
    "isHead" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coach_pkey" PRIMARY KEY ("id")
);

-- The single coach profile becomes the head coach of the team, with the same texts and photo,
-- and keeps its certifications.
INSERT INTO "Coach" (
    "id", "slug", "name", "role", "title", "summary", "story", "philosophy", "results",
    "specialties", "yearsExperience", "languages", "photoId", "isHead", "order", "active",
    "createdAt", "updatedAt"
)
SELECT
    'coach' || substr(md5(random()::text || clock_timestamp()::text), 1, 20),
    coalesce(
        nullif(trim(both '-' from regexp_replace(
            lower(translate("name", 'ăâîșțĂÂÎȘȚ', 'aaistaaist')), '[^a-z0-9]+', '-', 'g'
        )), ''),
        'antrenor'
    ),
    "name",
    '{"ro": "Antrenor principal", "en": "Head coach"}'::jsonb,
    "title",
    "title",
    "story",
    "philosophy",
    "results",
    '{"ro": [], "en": []}'::jsonb,
    "yearsExperience",
    "languages",
    "photoId",
    true,
    0,
    true,
    "createdAt",
    CURRENT_TIMESTAMP
FROM "CoachProfile";

UPDATE "Certification" SET "coachId" = (SELECT "id" FROM "Coach" ORDER BY "order" LIMIT 1);

DROP TABLE "CoachProfile";

-- Home page sections of the academy: two sections keep their texts under a new key, the ones
-- that spoke for a single coach give way to the team, the junior academy and the gallery
-- (added by the seed).
UPDATE "Scene" SET "key" = 'manifest' WHERE "key" = 'filozofia';
UPDATE "Scene" SET "key" = 'clubul' WHERE "key" = 'terenul';
DELETE FROM "Scene" WHERE "key" IN ('antrenorul', 'prima-lectie', 'locurile');
UPDATE "Scene" SET "order" = CASE "key"
    WHEN 'deschiderea' THEN 1
    WHEN 'manifest' THEN 2
    WHEN 'cifre' THEN 3
    WHEN 'programe' THEN 4
    WHEN 'academia' THEN 5
    WHEN 'echipa' THEN 6
    WHEN 'metoda' THEN 7
    WHEN 'clubul' THEN 8
    WHEN 'galerie' THEN 9
    WHEN 'lectii' THEN 10
    WHEN 'intrebari' THEN 11
    WHEN 'rezervare' THEN 12
    ELSE "order" + 20
END;

-- CreateTable
CREATE TABLE "AcademyGroup" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "stage" "BallStage",
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "level" "Level" NOT NULL DEFAULT 'TOATE',
    "summary" JSONB NOT NULL,
    "focusPoints" JSONB NOT NULL,
    "sessionsPerWeek" INTEGER,
    "sessionMinutes" INTEGER,
    "schedule" JSONB,
    "monthlyFee" DECIMAL(10,2),
    "maxPlayers" INTEGER,
    "imageId" TEXT,
    "programId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Result" (
    "id" TEXT NOT NULL,
    "athlete" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "placement" JSONB NOT NULL,
    "date" DATE NOT NULL,
    "level" "ResultLevel" NOT NULL DEFAULT 'NATIONAL',
    "isMinor" BOOLEAN NOT NULL DEFAULT true,
    "parentalConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coach_slug_key" ON "Coach"("slug");

-- CreateIndex
CREATE INDEX "Coach_order_idx" ON "Coach"("order");

-- CreateIndex
CREATE UNIQUE INDEX "AcademyGroup_slug_key" ON "AcademyGroup"("slug");

-- CreateIndex
CREATE INDEX "AcademyGroup_order_idx" ON "AcademyGroup"("order");

-- CreateIndex
CREATE INDEX "Result_published_date_idx" ON "Result"("published", "date");

-- CreateIndex
CREATE INDEX "Certification_coachId_order_idx" ON "Certification"("coachId", "order");

-- CreateIndex
CREATE INDEX "Media_kind_status_idx" ON "Media"("kind", "status");

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_heroVideoId_fkey" FOREIGN KEY ("heroVideoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSettings" ADD CONSTRAINT "SiteSettings_heroImageId_fkey" FOREIGN KEY ("heroImageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGroup" ADD CONSTRAINT "AcademyGroup_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademyGroup" ADD CONSTRAINT "AcademyGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AcademyGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
