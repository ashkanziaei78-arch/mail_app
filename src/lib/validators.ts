import { z } from "zod";

export const contactInput = z.object({
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  firstName: z.string().trim().min(1, "نام الزامی است.").max(80),
  lastName: z.string().trim().min(1, "نام خانوادگی الزامی است.").max(80),
  formalTitle: z.string().trim().max(40).optional().nullable(),
  mobilePhone: z.string().trim().max(20).optional().nullable(),
  landlinePhone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("ایمیل معتبر نیست.").max(200).optional().nullable().or(z.literal("")),
  province: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  address: z.string().trim().max(400).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  smsConsent: z.boolean().default(true),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  organizationName: z.string().trim().max(160).optional().nullable(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
  jobCategory: z.string().trim().max(120).optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(50).default([]),
});

export type ContactInput = z.infer<typeof contactInput>;
