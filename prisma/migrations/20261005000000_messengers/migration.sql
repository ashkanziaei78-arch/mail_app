-- پیام‌رسان‌های تازه کنار بله: تلگرام و ایتا.
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "telegramBotTokenEncrypted" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "eitaaTokenEncrypted" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "eitaaChatId" TEXT;
