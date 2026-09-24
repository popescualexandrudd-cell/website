/*
  Warnings:

  - You are about to drop the column `artKey` on the `PageHeader` table. All the data in the column will be lost.
  - You are about to drop the column `artKey` on the `Program` table. All the data in the column will be lost.
  - You are about to drop the column `artKey` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `artKeySecondary` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `ballSize` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `ballX` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `ballY` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `imageAlt` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `imageId` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `imageMobileId` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `imageSecondaryId` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `imageSecondaryMobileId` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `textPosDesktop` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `textPosMobile` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `tone` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `transition` on the `Scene` table. All the data in the column will be lost.
  - You are about to drop the column `veil` on the `Scene` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Scene" DROP CONSTRAINT "Scene_imageId_fkey";

-- DropForeignKey
ALTER TABLE "Scene" DROP CONSTRAINT "Scene_imageMobileId_fkey";

-- DropForeignKey
ALTER TABLE "Scene" DROP CONSTRAINT "Scene_imageSecondaryId_fkey";

-- DropForeignKey
ALTER TABLE "Scene" DROP CONSTRAINT "Scene_imageSecondaryMobileId_fkey";

-- AlterTable
ALTER TABLE "PageHeader" DROP COLUMN "artKey";

-- AlterTable
ALTER TABLE "Program" DROP COLUMN "artKey";

-- AlterTable
ALTER TABLE "Scene" DROP COLUMN "artKey",
DROP COLUMN "artKeySecondary",
DROP COLUMN "ballSize",
DROP COLUMN "ballX",
DROP COLUMN "ballY",
DROP COLUMN "imageAlt",
DROP COLUMN "imageId",
DROP COLUMN "imageMobileId",
DROP COLUMN "imageSecondaryId",
DROP COLUMN "imageSecondaryMobileId",
DROP COLUMN "textPosDesktop",
DROP COLUMN "textPosMobile",
DROP COLUMN "tone",
DROP COLUMN "transition",
DROP COLUMN "veil";

-- DropEnum
DROP TYPE "SceneTransition";

-- DropEnum
DROP TYPE "TextPosition";

-- DropEnum
DROP TYPE "TextTone";

-- The home page sections were renamed in the 3D redesign; their texts stay as edited.
UPDATE "Scene" SET "key" = 'rezervare'
WHERE "key" = 'constelatia' AND NOT EXISTS (SELECT 1 FROM "Scene" WHERE "key" = 'rezervare');
UPDATE "Scene" SET "key" = 'antrenorul'
WHERE "key" = 'impreuna' AND NOT EXISTS (SELECT 1 FROM "Scene" WHERE "key" = 'antrenorul');
