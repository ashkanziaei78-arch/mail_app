-- حاشیه متن روی سربرگ: تصویر سربرگ پس‌زمینه برگه می‌شود و متن روی آن می‌نشیند.
ALTER TABLE "Letterhead" ADD COLUMN IF NOT EXISTS "marginTopMm" INTEGER NOT NULL DEFAULT 45;
ALTER TABLE "Letterhead" ADD COLUMN IF NOT EXISTS "marginBottomMm" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Letterhead" ADD COLUMN IF NOT EXISTS "marginSideMm" INTEGER NOT NULL DEFAULT 20;
