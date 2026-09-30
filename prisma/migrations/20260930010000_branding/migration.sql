-- نشان سازمان، نشان تب مرورگر و بنرهای صفحه ورود.
ALTER TABLE "mailing"."Organization" ADD COLUMN IF NOT EXISTS "logoPath" TEXT;
ALTER TABLE "mailing"."Organization" ADD COLUMN IF NOT EXISTS "faviconPath" TEXT;
ALTER TABLE "mailing"."Organization" ADD COLUMN IF NOT EXISTS "bannersJson" JSONB;
