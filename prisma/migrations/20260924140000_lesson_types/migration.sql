-- Programmes (Inițiere, Competiție, Amatori) are now separate from the lessons that are booked
-- (LessonType: individual, for two, for three, group, biomechanical analysis), each with the
-- durations the client can choose. Fixed weekly group sessions are gone: every lesson takes the
-- coach's time exclusively, so the no-overlap guard now covers every active booking.

-- The guard referenced "groupScheduleId"; drop it before the column and recreate it below.
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_no_overlap";

-- Several people used to book the same weekly group session, so their rows shared one time
-- range. From now on a group lesson is booked once for the whole group and every active booking
-- holds the time exclusively: keep the first booking of each shared range, close the others.
UPDATE "Booking" AS b
SET "status" = 'ANULATA_ANTRENOR',
    "cancelledAt" = NOW(),
    "cancelReason" = 'Grupele cu orar fix au fost înlocuite de lecțiile de grup rezervate pentru tot grupul.'
WHERE b."groupScheduleId" IS NOT NULL
  AND b."status" IN ('IN_ASTEPTARE', 'CONFIRMATA')
  AND EXISTS (
    SELECT 1 FROM "Booking" AS o
    WHERE o."id" <> b."id"
      AND o."status" IN ('IN_ASTEPTARE', 'CONFIRMATA')
      AND tstzrange(o."startsAt", o."blockedUntil", '[)') && tstzrange(b."startsAt", b."blockedUntil", '[)')
      AND (o."groupScheduleId" IS NULL OR o."createdAt" < b."createdAt" OR (o."createdAt" = b."createdAt" AND o."id" < b."id"))
  );

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_groupScheduleId_fkey";

-- DropForeignKey
ALTER TABLE "GroupSchedule" DROP CONSTRAINT "GroupSchedule_locationId_fkey";

-- DropForeignKey
ALTER TABLE "GroupSchedule" DROP CONSTRAINT "GroupSchedule_programId_fkey";

-- DropForeignKey
ALTER TABLE "PricingPlan" DROP CONSTRAINT "PricingPlan_programId_fkey";

-- DropIndex
DROP INDEX "Booking_groupScheduleId_startsAt_idx";

-- DropIndex
DROP INDEX "PricingPlan_programId_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "groupScheduleId",
ADD COLUMN     "durationMin" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "lessonTypeId" TEXT;

-- AlterTable
ALTER TABLE "PricingPlan" DROP COLUMN "programId",
ADD COLUMN     "lessonTypeId" TEXT;

-- AlterTable
ALTER TABLE "Program" DROP COLUMN "durationMin",
DROP COLUMN "format",
DROP COLUMN "maxParticipants";

-- DropTable
DROP TABLE "GroupSchedule";

-- DropEnum
DROP TYPE "ProgramFormat";

-- CreateTable
CREATE TABLE "LessonType" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "minParticipants" INTEGER NOT NULL DEFAULT 1,
    "maxParticipants" INTEGER NOT NULL DEFAULT 1,
    "durations" INTEGER[] DEFAULT ARRAY[60, 90, 120]::INTEGER[],
    "hourlyRate" DECIMAL(10,2),
    "priceUnit" "PriceUnit" NOT NULL DEFAULT 'LECTIE',
    "order" INTEGER NOT NULL DEFAULT 0,
    "bookableOnline" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonType_slug_key" ON "LessonType"("slug");

-- CreateIndex
CREATE INDEX "LessonType_order_idx" ON "LessonType"("order");

-- CreateIndex
CREATE INDEX "PricingPlan_lessonTypeId_idx" ON "PricingPlan"("lessonTypeId");

-- AddForeignKey
ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_lessonTypeId_fkey" FOREIGN KEY ("lessonTypeId") REFERENCES "LessonType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_lessonTypeId_fkey" FOREIGN KEY ("lessonTypeId") REFERENCES "LessonType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Two active lessons can never overlap, including the break after each one.
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_no_overlap"
  EXCLUDE USING gist (tstzrange("startsAt", "blockedUntil", '[)') WITH &&)
  WHERE ("status" IN ('IN_ASTEPTARE', 'CONFIRMATA'));

-- Location: county and postal code for the structured address.
ALTER TABLE "Location" ADD COLUMN "region" TEXT,
ADD COLUMN "postalCode" TEXT;
