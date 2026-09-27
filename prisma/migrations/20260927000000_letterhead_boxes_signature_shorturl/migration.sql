-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE 'SIGNATURE';

-- AlterTable
ALTER TABLE "LetterheadField" ADD COLUMN     "align" TEXT NOT NULL DEFAULT 'right',
ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#111827',
ADD COLUMN     "fontFamily" TEXT NOT NULL DEFAULT 'Vazirmatn',
ADD COLUMN     "fontSize" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "fontWeight" TEXT NOT NULL DEFAULT '400',
ADD COLUMN     "height" DOUBLE PRECISION NOT NULL DEFAULT 8,
ADD COLUMN     "lineHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.8,
ADD COLUMN     "width" DOUBLE PRECISION NOT NULL DEFAULT 40,
ADD COLUMN     "x" DOUBLE PRECISION NOT NULL DEFAULT 8,
ADD COLUMN     "y" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signatureImagePath" TEXT;

-- CreateTable
CREATE TABLE "ShortUrl" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "label" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "lastClickAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ShortUrl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShortUrl_code_key" ON "ShortUrl"("code");

-- CreateIndex
CREATE INDEX "ShortUrl_organizationId_createdAt_idx" ON "ShortUrl"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ShortUrl" ADD CONSTRAINT "ShortUrl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadedFile_organizationId_kind_idx" ON "UploadedFile"("organizationId", "kind");

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

