-- عکس پروفایل کاربر: یا مسیر فایل آپلودی، یا شناسه یکی از طرح‌های گالری (avatar:<id>).
-- IF NOT EXISTS چون ستون روی محیط تولید دستی اضافه شد تا ورود همان لحظه درست شود.
ALTER TABLE "mailing"."User" ADD COLUMN IF NOT EXISTS "avatarPath" TEXT;
