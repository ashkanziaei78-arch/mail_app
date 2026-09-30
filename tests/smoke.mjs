/**
 * دود-تست سرتاسری: ورود، صفحه‌ها، ساخت نامه، گردش تأیید، ارسال و لینک عمومی.
 * روی نسخه محلی با دیتابیس آزمایشی اجرا می‌شود.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let cookie = "";
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    redirect: "manual",
    headers: {
      ...(options.headers ?? {}),
      ...(cookie ? { cookie } : {}),
      ...(options.body && !(options.body instanceof FormData) ? { "content-type": "application/json", origin: BASE } : { origin: BASE }),
    },
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) cookie = c.split(";")[0];
  return res;
}

async function json(path, options) {
  const res = await req(path, options);
  const text = await res.text();
  try { return { status: res.status, body: JSON.parse(text) }; }
  catch { return { status: res.status, body: text.slice(0, 200) }; }
}

async function login(email, password = "Mailing@1404") {
  cookie = "";
  const r = await json("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return r;
}

const pages = [
  "/dashboard", "/campaigns", "/campaigns?tab=sent", "/campaigns?tab=received", "/campaigns?tab=inflight",
  "/campaigns?q=دعوت", "/contacts", "/approvals", "/reports", "/reports?from=2026-01-01&to=2026-12-31",
  "/letterheads", "/tags", "/help", "/settings/users", "/settings/workflow", "/settings/access",
  "/settings/branding", "/settings/sms", "/account/security", "/tools/short-links",
];

(async () => {
  // ---------- ورود ----------
  const admin = await login("admin@mailing.local");
  record("ورود مدیر سازمان", admin.status === 200 && admin.body.ok === true, `status=${admin.status}`);

  // ---------- صفحه‌ها ----------
  for (const page of pages) {
    const res = await req(page);
    record(`صفحه ${page}`, res.status === 200, `status=${res.status}`);
  }

  // ---------- اعلان‌ها ----------
  const notif = await json("/api/notifications");
  record("API اعلان کارتابل", notif.status === 200 && typeof notif.body?.data?.pending === "number",
    `pending=${notif.body?.data?.pending}`);

  // ---------- ساخت نامه ----------
  const created = await json("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({ name: `نامه آزمایشی ${Date.now()}`, subject: "آزمایش سرتاسری" }),
  });
  const campaignId = created.body?.data?.id;
  record("ساخت نامه", created.status === 200 && Boolean(campaignId), `status=${created.status}`);

  if (campaignId) {
    // متن نامه با شکست صفحه و تراز دوطرفه
    const body = '<div style="text-align: justify">بخش اول نامه آزمایشی.</div><hr class="page-break" /><div>بخش دوم در صفحه دوم.</div>';
    const saved = await json(`/api/campaigns/${campaignId}`, {
      method: "PATCH",
      body: JSON.stringify({ letter: { bodyHtml: body, subject: "آزمایش", senderName: "مدیر آزمایشی" } }),
    });
    record("ذخیره متن نامه (چندصفحه‌ای)", saved.status === 200, `status=${saved.status}`);

    // انتخاب مخاطبین با برچسب
    const tags = await json("/api/tags");
    const tagId = tags.body?.data?.[0]?.id ?? tags.body?.data?.tags?.[0]?.id;
    const setR = await json(`/api/campaigns/${campaignId}/actions`, {
      method: "POST",
      body: JSON.stringify({ action: "setRecipients", tagIds: tagId ? [tagId] : [], tagMode: "OR" }),
    });
    record("انتخاب مخاطبین با برچسب", setR.status === 200 && (setR.body?.data?.count ?? 0) > 0,
      `count=${setR.body?.data?.count}`);

    // ارسال برای تأیید
    const submit = await json(`/api/campaigns/${campaignId}/actions`, {
      method: "POST", body: JSON.stringify({ action: "submit" }),
    });
    record("ارسال برای تأیید", submit.status === 200 && submit.body?.data?.status === "PENDING_APPROVAL",
      `status=${submit.body?.data?.status ?? submit.status}`);

    // مرحله اول گردش «رئیس اداره» است؛ معاون هنوز نباید بتواند تأیید کند
    await login("manager@mailing.local");
    const tooSoon = await json(`/api/campaigns/${campaignId}/actions`, {
      method: "POST", body: JSON.stringify({ action: "approve" }),
    });
    record("معاون نمی‌تواند مرحله رئیس اداره را تأیید کند", tooSoon.status === 403, `status=${tooSoon.status}`);

    const approver = await login("dept@mailing.local");
    record("ورود رئیس اداره", approver.status === 200 && approver.body.ok === true, `status=${approver.status}`);
    const inbox = await json("/api/notifications");
    record("نامه در کارتابل رئیس اداره", (inbox.body?.data?.pending ?? 0) > 0, `pending=${inbox.body?.data?.pending}`);

    const approve = await json(`/api/campaigns/${campaignId}/actions`, {
      method: "POST", body: JSON.stringify({ action: "approve" }),
    });
    record("تأیید مرحله اول", approve.status === 200, `status=${approve.status} → ${approve.body?.data?.status}`);

    // بازگشت به مدیر برای ادامه تأیید و ارسال
    await login("admin@mailing.local");
    let state = await json(`/api/campaigns/${campaignId}/actions`, {
      method: "POST", body: JSON.stringify({ action: "approve" }),
    });
    for (let i = 0; i < 4 && state.body?.data?.status === "PENDING_APPROVAL"; i++) {
      state = await json(`/api/campaigns/${campaignId}/actions`, {
        method: "POST", body: JSON.stringify({ action: "approve" }),
      });
    }
    record("تأیید نهایی", state.body?.data?.status === "APPROVED", `status=${state.body?.data?.status}`);

    const send = await json(`/api/campaigns/${campaignId}/actions`, {
      method: "POST", body: JSON.stringify({ action: "send" }),
    });
    record("ارسال پیامک (درگاه آزمایشی)", send.status === 200 && (send.body?.data?.sent ?? 0) > 0,
      `sent=${send.body?.data?.sent} failed=${send.body?.data?.failed}`);

    // لینک عمومی نامه
    const page = await req(`/campaigns/${campaignId}`);
    record("صفحه نامه بعد از ارسال", page.status === 200, `status=${page.status}`);
  }

  // ---------- کنترل دسترسی ----------
  const user = await login("user@mailing.local");
  record("ورود کاربر عادی", user.status === 200 && user.body.ok === true, `status=${user.status}`);
  const deniedPages = ["/settings/users", "/settings/access", "/settings/sms", "/approvals", "/reports"];
  for (const page of deniedPages) {
    const res = await req(page);
    // صفحه‌هایی که loading.tsx دارند استریم می‌شوند، پس ریدایرکت داخل بدنه می‌آید نه در وضعیت HTTP
    const text = res.status === 200 ? await res.text() : "";
    const denied = res.status === 307 || res.status === 302 || text.includes("denied");
    record(`کاربر عادی نباید ${page} را ببیند`, denied, `status=${res.status}`);
  }
  const deleteTry = await json("/api/contacts/00000000-0000-0000-0000-000000000000", { method: "DELETE" });
  record("کاربر عادی نمی‌تواند مخاطب حذف کند", deleteTry.status === 403, `status=${deleteTry.status}`);

  const deptAdmin = await login("dept@mailing.local");
  record("ورود مدیر واحد", deptAdmin.body?.ok === true);
  const deptDelete = await json("/api/contacts/00000000-0000-0000-0000-000000000000", { method: "DELETE" });
  record("مدیر واحد نمی‌تواند مخاطب حذف کند", deptDelete.status === 403, `status=${deptDelete.status}`);

  // ---------- ذخیره دسترسی‌ها ----------
  await login("admin@mailing.local");
  const usersList = await json("/api/users");
  const target = (usersList.body?.data ?? []).find?.((u) => u.email === "pr@mailing.local");
  if (target) {
    const perm = await json(`/api/users/${target.id}/permissions`, {
      method: "POST", body: JSON.stringify({ codes: ["contacts.read", "campaigns.read", "reports.read"] }),
    });
    record("ذخیره دسترسی‌های یک کاربر", perm.status === 200, `status=${perm.status}`);
  }

  // ---------- خلاصه ----------
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} تست موفق`);
  if (failed.length) {
    console.log("ناموفق‌ها:");
    for (const f of failed) console.log(` - ${f.name} (${f.detail})`);
    process.exit(1);
  }
})();
