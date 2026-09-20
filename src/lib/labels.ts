import type { CampaignStatus, RecipientStatus, SmsStatus, Visibility } from "@prisma/client";
import type { Tone } from "@/components/ui/primitives";

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "پیش‌نویس", tone: "neutral" },
  PENDING_APPROVAL: { label: "در انتظار تأیید", tone: "warn" },
  APPROVED: { label: "تأییدشده", tone: "info" },
  PROCESSING: { label: "در حال ارسال", tone: "info" },
  COMPLETED: { label: "تکمیل‌شده", tone: "success" },
  CANCELLED: { label: "لغوشده", tone: "neutral" },
  FAILED: { label: "ناموفق", tone: "danger" },
};

export const RECIPIENT_STATUS: Record<RecipientStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "در صف تولید", tone: "neutral" },
  DOCUMENT_GENERATED: { label: "نامه تولید شد", tone: "info" },
  SMS_QUEUED: { label: "پیامک در صف", tone: "info" },
  SMS_SENT: { label: "پیامک ارسال شد", tone: "success" },
  SMS_DELIVERED: { label: "تحویل شد", tone: "success" },
  SMS_FAILED: { label: "ارسال ناموفق", tone: "danger" },
  SKIPPED: { label: "نادیده گرفته شد", tone: "warn" },
};

export const SMS_STATUS: Record<SmsStatus, { label: string; tone: Tone }> = {
  QUEUED: { label: "در صف", tone: "neutral" },
  SENT: { label: "ارسال‌شده", tone: "success" },
  DELIVERED: { label: "تحویل‌شده", tone: "success" },
  FAILED: { label: "ناموفق", tone: "danger" },
  CANCELLED: { label: "لغوشده", tone: "neutral" },
};

export const VISIBILITY: Record<Visibility, { label: string; tone: Tone }> = {
  PUBLIC: { label: "دفترچه عمومی", tone: "info" },
  PRIVATE: { label: "دفترچه خصوصی", tone: "neutral" },
};
