-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('PROPRIETAR', 'EDITOR');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('CERERE', 'INSTANT');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('COPII', 'JUNIORI', 'ADULTI', 'TOATE');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('INCEPATOR', 'INTERMEDIAR', 'AVANSAT', 'COMPETITIE', 'TOATE');

-- CreateEnum
CREATE TYPE "ProgramFormat" AS ENUM ('INDIVIDUAL', 'SEMI_PRIVAT', 'GRUPA', 'EVENIMENT');

-- CreateEnum
CREATE TYPE "PriceUnit" AS ENUM ('LECTIE', 'PERSOANA', 'LUNA', 'PACHET', 'EVENIMENT');

-- CreateEnum
CREATE TYPE "Surface" AS ENUM ('ZGURA', 'HARD', 'IARBA', 'SINTETIC', 'COVOR');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('DOTARE_BAZA', 'SERVICIU_ANTRENOR', 'ECHIPAMENT');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('CIORNA', 'PUBLICAT');

-- CreateEnum
CREATE TYPE "FaqCategory" AS ENUM ('INCEPUT', 'ECHIPAMENT', 'COPII', 'PROGRAM_PLATA', 'TEREN_VREME', 'COMPETITIE');

-- CreateEnum
CREATE TYPE "GalleryCategory" AS ENUM ('LECTII', 'GRUPE', 'TURNEE', 'TERENURI', 'EVENIMENTE');

-- CreateEnum
CREATE TYPE "ExceptionType" AS ENUM ('BLOCAT', 'DISPONIBIL_EXTRA');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('IN_ASTEPTARE', 'CONFIRMATA', 'ANULATA_CLIENT', 'ANULATA_ANTRENOR', 'EFECTUATA', 'NEPREZENTARE');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('SITE', 'ADMIN', 'TELEFON', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('NOU', 'CONTACTAT', 'INSCRIS', 'ARHIVAT');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('NOU', 'CITIT', 'ARHIVAT');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('IN_ASTEPTARE', 'TRIMIS', 'ESUAT');

-- CreateEnum
CREATE TYPE "TextPosition" AS ENUM ('STANGA_SUS', 'STANGA_CENTRU', 'STANGA_JOS', 'DREAPTA_SUS', 'DREAPTA_CENTRU', 'DREAPTA_JOS', 'CENTRU_SUS', 'CENTRU', 'CENTRU_JOS');

-- CreateEnum
CREATE TYPE "TextTone" AS ENUM ('INCHIS', 'DESCHIS');

-- CreateEnum
CREATE TYPE "SceneTransition" AS ENUM ('DIZOLVARE', 'ZOOM_LENT', 'ZOOM_MINGE', 'NORI', 'PERGAMENT', 'MASCA_PENSULA', 'CURCUBEU', 'NOAPTE');

-- CreateEnum
CREATE TYPE "LegalKind" AS ENUM ('CONFIDENTIALITATE', 'TERMENI', 'COOKIES');

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "brandName" TEXT NOT NULL,
    "monogram" TEXT NOT NULL,
    "tagline" JSONB NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "tiktokUrl" TEXT,
    "seoTitle" JSONB NOT NULL,
    "seoDescription" JSONB NOT NULL,
    "bookingMode" "BookingMode" NOT NULL DEFAULT 'CERERE',
    "freeCancelHours" INTEGER NOT NULL DEFAULT 24,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 12,
    "horizonDays" INTEGER NOT NULL DEFAULT 60,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 10,
    "slotStepMinutes" INTEGER NOT NULL DEFAULT 30,
    "firstLessonText" JSONB NOT NULL,
    "paymentMethods" JSONB NOT NULL,
    "workingHours" JSONB NOT NULL,
    "legalForm" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "legalCui" TEXT NOT NULL,
    "legalRegNo" TEXT,
    "legalAddress" TEXT NOT NULL,
    "enEnabled" BOOLEAN NOT NULL DEFAULT true,
    "umamiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reviewInvitesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "newsletterEnabled" BOOLEAN NOT NULL DEFAULT true,
    "retentionMonths" INTEGER NOT NULL DEFAULT 24,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Bucharest',
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "story" JSONB NOT NULL,
    "philosophy" JSONB NOT NULL,
    "results" JSONB,
    "yearsExperience" INTEGER,
    "languages" JSONB NOT NULL,
    "photoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "issuer" TEXT NOT NULL,
    "year" INTEGER,
    "imageId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "indexName" JSONB NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "ctaLabel" JSONB,
    "ctaHref" TEXT,
    "extra" JSONB,
    "imageAlt" JSONB NOT NULL,
    "artKey" TEXT NOT NULL,
    "artKeySecondary" TEXT,
    "imageId" TEXT,
    "imageMobileId" TEXT,
    "imageSecondaryId" TEXT,
    "imageSecondaryMobileId" TEXT,
    "textPosDesktop" "TextPosition" NOT NULL DEFAULT 'STANGA_CENTRU',
    "textPosMobile" "TextPosition" NOT NULL DEFAULT 'CENTRU_JOS',
    "tone" "TextTone" NOT NULL DEFAULT 'INCHIS',
    "veil" BOOLEAN NOT NULL DEFAULT false,
    "ballX" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "ballY" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "ballSize" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "transition" "SceneTransition" NOT NULL DEFAULT 'DIZOLVARE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "focusPoints" JSONB NOT NULL,
    "audience" "Audience" NOT NULL DEFAULT 'TOATE',
    "level" "Level" NOT NULL DEFAULT 'TOATE',
    "format" "ProgramFormat" NOT NULL DEFAULT 'INDIVIDUAL',
    "durationMin" INTEGER,
    "maxParticipants" INTEGER,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "artKey" TEXT,
    "imageId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "bookableOnline" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "name" JSONB NOT NULL,
    "price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "unit" "PriceUnit" NOT NULL DEFAULT 'LECTIE',
    "sessions" INTEGER,
    "validityDays" INTEGER,
    "includes" JSONB,
    "highlighted" BOOLEAN NOT NULL DEFAULT false,
    "isPackage" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "mapUrl" TEXT,
    "directions" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "surface" "Surface" NOT NULL,
    "count" INTEGER,
    "coveredInWinter" BOOLEAN,
    "floodlights" BOOLEAN,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Court_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "locationId" TEXT,
    "type" "FacilityType" NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB,
    "illustration" TEXT,
    "imageId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "role" JSONB NOT NULL,
    "text" JSONB NOT NULL,
    "photoId" TEXT,
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "isExample" BOOLEAN NOT NULL DEFAULT false,
    "bookingId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "alt" JSONB NOT NULL,
    "caption" JSONB,
    "category" "GalleryCategory" NOT NULL DEFAULT 'LECTII',
    "hasMinors" BOOLEAN NOT NULL DEFAULT false,
    "parentalConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "excerpt" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "coverId" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'CIORNA',
    "publishedAt" TIMESTAMP(3),
    "seoTitle" JSONB,
    "seoDescription" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "category" "FaqCategory" NOT NULL DEFAULT 'INCEPUT',
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "programId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "kind" "LegalKind" NOT NULL,
    "title" JSONB NOT NULL,
    "body" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "reviewedByLawyer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageHeader" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" JSONB NOT NULL,
    "intro" JSONB NOT NULL,
    "artKey" TEXT,
    "imageId" TEXT,
    "imageAlt" JSONB,
    "seoTitle" JSONB,
    "seoDescription" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "blurDataURL" TEXT NOT NULL,
    "alt" JSONB NOT NULL,
    "size" INTEGER NOT NULL,
    "variants" JSONB NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "locationId" TEXT,
    "validFrom" DATE,
    "validTo" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "type" "ExceptionType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupSchedule" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "membersCount" INTEGER NOT NULL DEFAULT 0,
    "seasonFrom" DATE,
    "seasonTo" DATE,
    "locationId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "locationId" TEXT,
    "courtId" TEXT,
    "groupScheduleId" TEXT,
    "clientId" TEXT,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "blockedUntil" TIMESTAMPTZ(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'IN_ASTEPTARE',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 1,
    "declaredLevel" "Level",
    "message" TEXT,
    "forMinor" BOOLEAN NOT NULL DEFAULT false,
    "parentName" TEXT,
    "childFirstName" TEXT,
    "childAge" INTEGER,
    "gdprConsent" BOOLEAN NOT NULL,
    "gdprConsentAt" TIMESTAMP(3) NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "cancelTokenHash" TEXT NOT NULL,
    "reviewTokenHash" TEXT,
    "source" "BookingSource" NOT NULL DEFAULT 'SITE',
    "internalNotes" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "completedAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "reviewInviteAt" TIMESTAMP(3),
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistEntry" (
    "id" TEXT NOT NULL,
    "programId" TEXT,
    "preferences" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "forMinor" BOOLEAN NOT NULL DEFAULT false,
    "childAge" INTEGER,
    "consent" BOOLEAN NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'NOU',
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "activePlanId" TEXT,
    "sessionsRemaining" INTEGER,
    "packageValidUntil" DATE,
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'EDITOR',
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'NOU',
    "consent" BOOLEAN NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmTokenHash" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribeTokenHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ro',
    "consentAt" TIMESTAMP(3) NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'IN_ASTEPTARE',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "bookingId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Certification_order_idx" ON "Certification"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_key_key" ON "Scene"("key");

-- CreateIndex
CREATE INDEX "Scene_order_idx" ON "Scene"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Program_slug_key" ON "Program"("slug");

-- CreateIndex
CREATE INDEX "Program_order_idx" ON "Program"("order");

-- CreateIndex
CREATE INDEX "Program_active_idx" ON "Program"("active");

-- CreateIndex
CREATE INDEX "PricingPlan_programId_idx" ON "PricingPlan"("programId");

-- CreateIndex
CREATE INDEX "PricingPlan_order_idx" ON "PricingPlan"("order");

-- CreateIndex
CREATE INDEX "Court_locationId_idx" ON "Court"("locationId");

-- CreateIndex
CREATE INDEX "Facility_type_order_idx" ON "Facility"("type", "order");

-- CreateIndex
CREATE INDEX "Testimonial_published_order_idx" ON "Testimonial"("published", "order");

-- CreateIndex
CREATE INDEX "GalleryItem_published_order_idx" ON "GalleryItem"("published", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE INDEX "Post_status_publishedAt_idx" ON "Post"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Faq_category_order_idx" ON "Faq"("category", "order");

-- CreateIndex
CREATE INDEX "Faq_showOnHome_idx" ON "Faq"("showOnHome");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_kind_key" ON "LegalPage"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "PageHeader_key_key" ON "PageHeader"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Media_path_key" ON "Media"("path");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE INDEX "AvailabilityRule_weekday_idx" ON "AvailabilityRule"("weekday");

-- CreateIndex
CREATE INDEX "AvailabilityException_date_idx" ON "AvailabilityException"("date");

-- CreateIndex
CREATE INDEX "GroupSchedule_programId_idx" ON "GroupSchedule"("programId");

-- CreateIndex
CREATE INDEX "GroupSchedule_weekday_idx" ON "GroupSchedule"("weekday");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_code_key" ON "Booking"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_cancelTokenHash_key" ON "Booking"("cancelTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reviewTokenHash_key" ON "Booking"("reviewTokenHash");

-- CreateIndex
CREATE INDEX "Booking_startsAt_idx" ON "Booking"("startsAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_email_idx" ON "Booking"("email");

-- CreateIndex
CREATE INDEX "Booking_groupScheduleId_startsAt_idx" ON "Booking"("groupScheduleId", "startsAt");

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "WaitlistEntry_status_idx" ON "WaitlistEntry"("status");

-- CreateIndex
CREATE INDEX "WaitlistEntry_email_idx" ON "WaitlistEntry"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_name_idx" ON "Client"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmTokenHash_key" ON "NewsletterSubscriber"("confirmTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeTokenHash_key" ON "NewsletterSubscriber"("unsubscribeTokenHash");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "EmailLog_status_nextAttemptAt_idx" ON "EmailLog"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_imageMobileId_fkey" FOREIGN KEY ("imageMobileId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_imageSecondaryId_fkey" FOREIGN KEY ("imageSecondaryId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_imageSecondaryMobileId_fkey" FOREIGN KEY ("imageSecondaryMobileId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_coverId_fkey" FOREIGN KEY ("coverId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Faq" ADD CONSTRAINT "Faq_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageHeader" ADD CONSTRAINT "PageHeader_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSchedule" ADD CONSTRAINT "GroupSchedule_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupSchedule" ADD CONSTRAINT "GroupSchedule_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_groupScheduleId_fkey" FOREIGN KEY ("groupScheduleId") REFERENCES "GroupSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitlistEntry" ADD CONSTRAINT "WaitlistEntry_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_activePlanId_fkey" FOREIGN KEY ("activePlanId") REFERENCES "PricingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
