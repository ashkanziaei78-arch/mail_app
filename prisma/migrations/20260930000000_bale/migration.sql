-- اتصال به ربات بله: توکن ربات در سطح سازمان، شناسه گفت‌وگو در سطح کاربر.
ALTER TABLE "mailing"."Organization" ADD COLUMN IF NOT EXISTS "baleBotTokenEncrypted" TEXT;
ALTER TABLE "mailing"."User" ADD COLUMN IF NOT EXISTS "baleChatId" TEXT;
