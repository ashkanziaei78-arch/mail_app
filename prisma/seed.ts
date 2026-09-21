/* داده آزمایشی فارسی — اجرا: npm run db:seed */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS } from "../src/lib/rbac";

const prisma = new PrismaClient();

/** گذرواژه داده آزمایشی — با سیاست گذرواژه سامانه سازگار است. */
const SEED_PASSWORD = "Mailing@1404";

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

  const password = await bcrypt.hash(SEED_PASSWORD, 10);
  const users = await Promise.all(
    [
      { fullName: "مدیر کل سامانه", email: "root@mailing.local", role: "SUPER_ADMIN" as const, departmentId: null },
      { fullName: "رضا احمدی", email: "admin@mailing.local", role: "ORG_ADMIN" as const, departmentId: departments[0].id },
      { fullName: "سمیه کاظمی", email: "approver@mailing.local", role: "APPROVER" as const, departmentId: departments[1].id },
      { fullName: "امیر توکلی", email: "user@mailing.local", role: "USER" as const, departmentId: departments[0].id },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        // در محیط تولید گذرواژه حساب موجود بازنویسی نمی‌شود؛ در توسعه بازنشانی می‌گردد
        update: process.env.NODE_ENV === "production"
          ? {}
          : { passwordHash: password, failedLoginCount: 0, lockedUntil: null, mustChangePassword: false, status: "ACTIVE" },
        create: { ...u, organizationId: organization.id, passwordHash: password, mustChangePassword: false },
      }),
    ),
  );
  const [, orgAdmin] = users;

  // --- سمت‌های سازمانی و گردش تأیید ---
  const positionSpecs = [
    { name: "مدیرکل", rank: 10, canApprove: true, canSign: true },
    { name: "معاون", rank: 20, canApprove: true, canSign: true },
    { name: "رئیس اداره", rank: 30, canApprove: true, canSign: false },
    { name: "کارشناس مسئول", rank: 40, canApprove: false, canSign: false },
    { name: "کارشناس", rank: 50, canApprove: false, canSign: false },
  ];
  const positions = await Promise.all(
    positionSpecs.map((spec) =>
      prisma.position.upsert({
        where: { organizationId_name: { organizationId: organization.id, name: spec.name } },
        update: {},
        create: { ...spec, organizationId: organization.id },
      }),
    ),
  );
  const positionByName = (name: string) => positions.find((p) => p.name === name)!.id;

  const existingWorkflow = await prisma.workflow.findFirst({
    where: { organizationId: organization.id, name: "گردش استاندارد دبیرخانه" },
  });
  if (!existingWorkflow) {
    await prisma.workflow.create({
      data: {
        organizationId: organization.id,
        name: "گردش استاندارد دبیرخانه",
        isDefault: true,
        steps: {
          create: [
            { positionId: positionByName("رئیس اداره"), order: 1, label: "بررسی اداره" },
            { positionId: positionByName("معاون"), order: 2, label: "تأیید معاونت" },
            { positionId: positionByName("مدیرکل"), order: 3, label: "تأیید نهایی" },
          ],
        },
      },
    });
  }

  // سمت کاربران نمونه
  await prisma.user.update({ where: { email: "admin@mailing.local" }, data: { positionId: positionByName("مدیرکل"), mobilePhone: "09120000001" } });
  await prisma.user.update({ where: { email: "approver@mailing.local" }, data: { positionId: positionByName("معاون"), mobilePhone: "09120000002" } });
  await prisma.user.update({ where: { email: "user@mailing.local" }, data: { positionId: positionByName("کارشناس"), mobilePhone: "09120000003" } });

  const tagNames = ["مدیران_استان", "حامیان_فناوری", "صنایع_یزد", "اعضای_بنیاد", "دعوت_همایش", "روابط_بین_الملل", "اتاق_بازرگانی"];
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

  // گروهی با اعضای متعدد تا انتخاب هشتگی محسوس باشد
  const chamberTag = tagId("اتاق_بازرگانی");
  for (let i = 1; i <= 20; i++) {
    const mobile = `0912999${String(i).padStart(4, "0")}`;
    if (await prisma.contact.findFirst({ where: { organizationId: organization.id, mobilePhone: mobile } })) continue;
    await prisma.contact.create({
      data: {
        organizationId: organization.id,
        createdByUserId: orgAdmin.id,
        visibility: "PUBLIC",
        formalTitle: i % 2 === 0 ? "سرکار خانم" : "جناب آقای",
        firstName: `عضو ${i}`,
        lastName: "اتاق بازرگانی",
        mobilePhone: mobile,
        city: "یزد",
        province: "یزد",
        organizations: {
          create: { organizationId: organization.id, organizationName: "اتاق بازرگانی یزد", jobTitle: "عضو هیئت نمایندگان", isPrimary: true },
        },
        tags: { create: [{ tagId: chamberTag }] },
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

  // --- سربرگ نمونه با فیلدهای قابل تعریف ---
  let letterhead = await prisma.letterhead.findFirst({ where: { organizationId: organization.id, isDefault: true } });
  if (!letterhead) {
    letterhead = await prisma.letterhead.create({
      data: {
        organizationId: organization.id,
        name: "سربرگ رسمی — دفتر مرکزی",
        fileUrl: "/hero.png", // نمونه؛ در عمل مدیر تصویر واقعی را آپلود می‌کند
        isDefault: true,
        versions: { create: { fileUrl: "/hero.png", version: 1 } },
        fields: {
          create: [
            { key: "letterNumber", label: "شماره نامه", type: "TEXT", area: "HEADER", required: true, placeholder: "۱۴۰۴/۱۲۳", sortOrder: 0 },
            { key: "letterDate", label: "تاریخ نامه", type: "DATE", area: "HEADER", required: true, helpText: "با تقویم شمسی انتخاب کنید.", sortOrder: 1 },
            { key: "attachmentCount", label: "تعداد پیوست", type: "NUMBER", area: "HEADER", sortOrder: 2 },
            { key: "urgency", label: "فوریت", type: "SELECT", area: "HEADER", optionsJson: ["عادی", "فوری", "آنی"], defaultValue: "عادی", sortOrder: 3 },
            { key: "secretariatNote", label: "یادداشت دبیرخانه", type: "TEXTAREA", area: "FOOTER", helpText: "روی نامه چاپ نمی‌شود مگر در متن درجش کنید.", sortOrder: 4 },
            { key: "agenda", label: "دستور جلسه", type: "RICH_TEXT", area: "BODY", helpText: "می‌توانید فهرست و جدول بگذارید.", sortOrder: 5 },
          ],
        },
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

  console.log(`✅ آماده شد — ${CONTACTS.length} مخاطب، ${tags.length} برچسب، ${departments.length} واحد، ${positions.length} سمت.

حساب‌های ورود (گذرواژه همه: ${SEED_PASSWORD})
  root@mailing.local      مدیر کل سامانه
  admin@mailing.local     مدیر سازمان
  approver@mailing.local  تأییدکننده
  user@mailing.local      کاربر عادی
`);
}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
