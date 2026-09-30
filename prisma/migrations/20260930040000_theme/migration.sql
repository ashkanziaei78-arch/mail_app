-- تم رنگی انتخابی سازمان.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "themeId" TEXT;
