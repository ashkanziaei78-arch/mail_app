/* داده آزمایشی فارسی — اجرا: npm run db:seed */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "../src/lib/rbac";

const prisma = new PrismaClient();

const PERMISSION_LABELS: Record<string, string> = {
  "contacts.read": "مشاهده مخاطبین",
  "contacts.write": "ثبت و ویرایش مخاطب",
  "contacts.delete": "حذف مخاطب",
  "contacts.read_all_private": "مشاهده دفترچه‌های خصوصی",
  "tags.write": "مدیریت برچسب‌ها",
  "groups.write": "مدیریت گروه‌ها",
  "letterheads.write": "مدیریت سربرگ‌ها",
  "templates.write": "مدیریت قالب نامه",
  "campaigns.read": "مشاهده کمپین‌ها",
  "campaigns.write": "ساخت و ویرایش کمپین",
  "campaigns.approve": "تأیید نامه",
  "campaigns.send": "ارسال پیامک",
  "sms.settings": "تنظیمات درگاه پیامک",
  "reports.read": "مشاهده گزارش‌ها",
  "users.manage": "مدیریت کاربران",
  "orgs.manage": "مدیریت سازمان‌ها",
};

const CONTACTS = [
  ["جناب آقای", "رضا", "کریمی", "09121110001", "پارک علم و فناوری یزد", "رئیس پارک", "یزد", ["مدیران_استان", "حامیان_فناوری"]],
  ["سرکار خانم", "مریم", "حسینی", "09121110002", "شرکت فناوران کویر", "مدیرعامل", "یزد", ["صنایع_یزد", "حامیان_فناوری"]],
  ["جناب آقای دکتر", "حسین", "موسوی", "09121110003", "دانشگاه یزد", "معاون پژوهشی", "یزد", ["مدیران_استان"]],
  ["جناب آقای", "حسن", "رضایی", "09121110004", "اتاق بازرگانی یزد", "دبیر", "یزد", ["صنایع_یزد"]],
  ["سرکار خانم", "زهرا", "نوری", "09121110005", "بنیاد ملی فناوری", "کارشناس روابط بین‌الملل", "تهران", ["روابط_بین_الملل", "اعضای_بنیاد"]],
  ["جناب آقای", "علی", "صادقی", "09121110006", "شرکت دانش‌بنیان آرمان", "مدیر فنی", "اصفهان", ["حامیان_فناوری"]],
  ["سرکار خانم دکتر", "فاطمه", "احمدی", "09121110007", "مرکز نوآوری کویر", "مدیر شتاب‌دهنده", "یزد", ["صنایع_یزد", "دعوت_همایش"]],
  ["جناب آقای", "محمد", "جعفری", "09121110008", "سازمان صمت استان یزد", "معاون صنایع", "یزد", ["مدیران_استان", "دعوت_همایش"]],
] as const;

const TEMPLATE_BODY = `<p>{{عنوان}} {{نام_کامل}}</p>
<p>{{سمت}} {{سازمان}}</p>
<p>با سلام و احترام،</p>
<p>بدین‌وسیله از جناب‌عالی دعوت می‌شود تا در <strong>همایش سالانه فناوری استان یزد</strong> که در تاریخ ۱۵ مهرماه در محل پارک علم و فناوری برگزار می‌گردد، حضور به هم رسانید.</p>
<p>حضور ارزشمند شما موجب غنای بیشتر این رویداد خواهد بود.</p>
<p>با تشکر</p>`;

async function main() {
  console.log("⏳ در حال ساخت داده آزمایشی…");

  await prisma.$transaction(
    PERMISSIONS.map((code) =>
      prisma.permission.upsert({
        where: { code },
        update: { label: PERMISSION_LABELS[code] ?? code },
        create: { code, label: PERMISSION_LABELS[code] ?? code },
      }),
    ),
  );

  const organization = await prisma.organization.upsert({
    where: { slug: "yazd-park" },
    update: {},
    create: { name: "پارک علم و فناوری یزد", slug: "yazd-park", description: "سازمان نمونه برای داده آزمایشی" },
  });

  const departments = await Promise.all(
    ["روابط عمومی", "دبیرخانه", "امور بین‌الملل", "حراست"].map((name) =>
      prisma.department.upsert({
        where: { organizationId_name: { organizationId: organization.id, name } },
        update: {},
        create: { organizationId: organization.id, name },
      }),
    ),
  );

  const password = await bcrypt.hash("Admin@12345", 10);
  const users = await Promise.all(
    [
      { fullName: "مدیر کل سامانه", email: "root@mailing.local", role: "SUPER_ADMIN" as const, departmentId: null },
      { fullName: "رضا احمدی", email: "admin@mailing.local", role: "ORG_ADMIN" as const, departmentId: departments[0].id },
      { fullName: "سمیه کاظمی", email: "approver@mailing.local", role: "APPROVER" as const, departmentId: departments[1].id },
      { fullName: "امیر توکلی", email: "user@mailing.local", role: "USER" as const, departmentId: departments[0].id },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, organizationId: organization.id, passwordHash: password },
      }),
    ),
  );
  const [, orgAdmin] = users;

  const tagNames = ["مدیران_استان", "حامیان_فناوری", "صنایع_یزد", "اعضای_بنیاد", "دعوت_همایش", "روابط_بین_الملل"];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { organizationId_name: { organizationId: organization.id, name } },
        update: {},
        create: { organizationId: organization.id, name },
      }),
    ),
  );
  const tagId = (name: string) => tags.find((t) => t.name === name)!.id;

  for (const [formalTitle, firstName, lastName, mobilePhone, orgName, jobTitle, city, contactTags] of CONTACTS) {
    const existing = await prisma.contact.findFirst({ where: { organizationId: organization.id, mobilePhone } });
    if (existing) continue;
    await prisma.contact.create({
      data: {
        organizationId: organization.id,
        createdByUserId: orgAdmin.id,
        visibility: "PUBLIC",
        formalTitle, firstName, lastName, mobilePhone, city, province: city,
        organizations: {
          create: { organizationId: organization.id, organizationName: orgName, jobTitle, isPrimary: true },
        },
        tags: { create: contactTags.map((name) => ({ tagId: tagId(name) })) },
        history: { create: { changedById: orgAdmin.id, changeType: "CREATE", diffJson: { source: "seed" } } },
      },
    });
  }

  const smartMembers = await prisma.contact.findMany({
    where: { organizationId: organization.id, tags: { some: { tagId: tagId("مدیران_استان") } } },
    select: { id: true },
  });
  const existingGroup = await prisma.group.findFirst({ where: { organizationId: organization.id, name: "مدیران استان یزد" } });
  if (!existingGroup) {
    await prisma.group.create({
      data: {
        organizationId: organization.id,
        name: "مدیران استان یزد",
        type: "SMART",
        filterJson: { tagIds: [tagId("مدیران_استان")], tagMode: "OR" },
        members: { create: smartMembers.map((m) => ({ contactId: m.id })) },
      },
    });
  }

  const existingTemplate = await prisma.letterTemplate.findFirst({ where: { organizationId: organization.id, name: "قالب دعوت‌نامه رسمی" } });
  if (!existingTemplate) {
    await prisma.letterTemplate.create({
      data: { organizationId: organization.id, name: "قالب دعوت‌نامه رسمی", bodyHtml: TEMPLATE_BODY },
    });
  }

  const existingSms = await prisma.smsProviderConfig.findFirst({ where: { organizationId: organization.id } });
  if (!existingSms) {
    await prisma.smsProviderConfig.create({
      data: { organizationId: organization.id, providerName: "console", apiKeyEncrypted: "", senderNumber: "10008663", isDefault: true },
    });
  }

  console.log(`✅ آماده شد — ${CONTACTS.length} مخاطب، ${tags.length} برچسب، ${departments.length} واحد.

حساب‌های ورود (گذرواژه همه: Admin@12345)
  root@mailing.local      مدیر کل سامانه
  admin@mailing.local     مدیر سازمان
  approver@mailing.local  تأییدکننده
  user@mailing.local      کاربر عادی
`);
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
