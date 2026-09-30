-- کادرهای تازه سربرگ: نام امضاکننده، تصویر، جدول اکسل و فهرست پیوست‌ها.
ALTER TYPE "mailing"."FieldType" ADD VALUE IF NOT EXISTS 'SIGNER_NAME';
ALTER TYPE "mailing"."FieldType" ADD VALUE IF NOT EXISTS 'IMAGE';
ALTER TYPE "mailing"."FieldType" ADD VALUE IF NOT EXISTS 'TABLE';
ALTER TYPE "mailing"."FieldType" ADD VALUE IF NOT EXISTS 'ATTACHMENTS';
