-- The 3D technique lab is no longer part of the site: its switch in the settings goes, and the
-- lab's texts are dropped from the method section.
ALTER TABLE "SiteSettings" DROP COLUMN "labEnabled";

UPDATE "Scene" SET "extra" = ("extra" - 'labTitle' - 'labIntro')
WHERE "key" = 'metoda' AND "extra" IS NOT NULL AND jsonb_typeof("extra") = 'object';
