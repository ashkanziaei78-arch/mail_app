# راهنمای API

همه مسیرها زیر `/api` هستند. احراز هویت با کوکی نشست `ms_session` (HttpOnly، امضاشده با HMAC-SHA256) انجام می‌شود.

قالب پاسخ همیشه یکسان است:

```json
{ "ok": true,  "data": { } }
{ "ok": false, "error": "پیام خطا به فارسی" }
```

کدهای وضعیت: `401` وارد نشده، `403` بدون مجوز، `404` یافت نشد، `409` تعارض (تکراری/وضعیت نادرست)، `413` فایل بزرگ، `415` نوع فایل نامعتبر، `422` داده نامعتبر، `502` خطای درگاه پیامک.

## احراز هویت

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` — کوکی نشست را ست می‌کند |
| POST | `/api/auth/logout` | پایان نشست |

## مخاطبین

| متد | مسیر | مجوز | توضیح |
|---|---|---|---|
| GET | `/api/contacts?q=&take=` | `contacts.read` | جست‌وجو در دفترچه‌های قابل دسترس کاربر |
| POST | `/api/contacts` | `contacts.write` | ثبت مخاطب |
| PATCH | `/api/contacts/{id}` | `contacts.write` | ویرایش |
| DELETE | `/api/contacts/{id}` | `contacts.delete` | حذف نرم |
| POST | `/api/contacts/import` | `contacts.write` | `multipart/form-data` با `file` (CSV) و `visibility` |
| GET | `/api/contacts/export` | `contacts.read` | خروجی CSV با BOM (سازگار با اکسل فارسی) |

بدنه ثبت/ویرایش مخاطب:

```json
{
  "visibility": "PUBLIC | PRIVATE",
  "firstName": "حسین", "lastName": "موسوی",
  "formalTitle": "جناب آقای دکتر",
  "mobilePhone": "09121110003",
  "landlinePhone": null, "email": null,
  "province": "یزد", "city": "یزد", "address": null, "notes": null,
  "smsConsent": true, "status": "ACTIVE",
  "organizationName": "دانشگاه یزد", "jobTitle": "معاون پژوهشی", "jobCategory": "آموزش عالی",
  "tagIds": ["uuid", "…"]
}
```

شماره همراه پیش از ذخیره نرمال می‌شود (`+98`، `0098`، ارقام فارسی و فاصله‌ها پذیرفته و به `09xxxxxxxxx` تبدیل می‌شوند).

## برچسب و گروه

| متد | مسیر | مجوز |
|---|---|---|
| GET / POST | `/api/tags` | `contacts.read` / `tags.write` |
| DELETE | `/api/tags/{id}` | `tags.write` (حذف نرم؛ مخاطب حذف نمی‌شود) |
| GET / POST | `/api/groups` | `contacts.read` / `groups.write` |
| POST | `/api/groups/{id}` | `groups.write` — تازه‌سازی اعضای گروه هوشمند |
| DELETE | `/api/groups/{id}` | `groups.write` |

## سربرگ و قالب نامه

| متد | مسیر | مجوز | توضیح |
|---|---|---|---|
| GET / POST | `/api/letterheads` | `campaigns.read` / `letterheads.write` | POST از نوع `multipart/form-data`: `name`, `file`, `footerFile?`, `isDefault?` |
| PATCH | `/api/letterheads/{id}` | `letterheads.write` | `{ status?, isDefault? }` |
| GET / POST | `/api/templates` | `campaigns.read` / `templates.write` | `{ name, bodyHtml }` |
| DELETE | `/api/templates/{id}` | `templates.write` | بایگانی |

## کمپین‌ها

| متد | مسیر | مجوز |
|---|---|---|
| GET / POST | `/api/campaigns` | `campaigns.read` / `campaigns.write` |
| PATCH / DELETE | `/api/campaigns/{id}` | `campaigns.write` |
| POST | `/api/campaigns/{id}/actions` | بسته به عملیات |

بدنه `actions` با کلید `action` مشخص می‌شود:

| action | مجوز | ورودی اضافه | کار |
|---|---|---|---|
| `setRecipients` | `campaigns.write` | `contactIds[]`, `groupIds[]`, `tagIds[]`, `tagMode: AND\|OR`, `append` | ساخت/افزودن فهرست مخاطبین |
| `removeRecipient` | `campaigns.write` | `recipientId` | حذف یک مخاطب از کمپین |
| `overrideLetter` | `campaigns.write` | `recipientId`, `bodyHtml\|null` | متن اختصاصی یک مخاطب |
| `generate` | `campaigns.write` | — | تولید سند اختصاصی + لینک کوتاه (ایدمپوتنت) |
| `submit` | `campaigns.write` | — | تولید اسناد و ارسال برای تأیید |
| `approve` / `reject` | `campaigns.approve` | `reason` (برای reject) | تأیید یا رد نامه |
| `send` / `retryFailed` | `campaigns.send` | — | ارسال پیامک / تلاش مجدد ناموفق‌ها |
| `cancel` | `campaigns.write` | — | لغو کمپین و پیامک‌های در صف |
| `clone` | `campaigns.write` | — | ساخت کمپین جدید از روی این کمپین |

## پیامک و گزارش

| متد | مسیر | مجوز | توضیح |
|---|---|---|---|
| POST | `/api/sms-settings` | `sms.settings` | `{ providerName, senderNumber, apiKey }` — کلید خالی یعنی کلید قبلی حفظ شود |
| PUT | `/api/sms-settings` | `sms.settings` | `{ phone, text }` — ارسال آزمایشی |
| GET | `/api/reports/export?from=&to=&status=` | `reports.read` | خروجی CSV گزارش ارسال |

## کاربران

| متد | مسیر | مجوز |
|---|---|---|
| POST | `/api/users` | `users.manage` |
| PATCH | `/api/users/{id}` | `users.manage` — `{ role?, status?, departmentId?, password? }` |

## صفحه عمومی نامه

`GET /l/{code}` — بدون احراز هویت. `code` ده کاراکتر تصادفی از الفبای base58 است
(`crypto.randomBytes`، بدون کاراکترهای شبیه‌هم). برای نامه محرمانه، فرم کد دسترسی نمایش داده می‌شود
و پس از تأیید، کوکی امضاشده‌ای فقط برای مسیر همان نامه صادر می‌گردد.
