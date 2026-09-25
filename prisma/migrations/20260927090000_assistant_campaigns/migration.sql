-- The AI assistant can be switched off from the admin.
ALTER TABLE "SiteSettings" ADD COLUMN "assistantEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Where each booking, assessment request and message came from (campaign, search, social).
ALTER TABLE "Booking" ADD COLUMN "attribution" JSONB;
ALTER TABLE "WaitlistEntry" ADD COLUMN "attribution" JSONB;
ALTER TABLE "ContactMessage" ADD COLUMN "attribution" JSONB;
