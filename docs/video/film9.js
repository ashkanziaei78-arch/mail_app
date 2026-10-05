/* ===========================================================================
   میلینگ پرس — نسخه عمودی ۹:۱۶. ۱۰۸۰×۱۹۲۰، ۳۰fps، ۱۵۰ ثانیه.
   قلاب‌ها از HOOKS.md (مهارت hormozi-hooks) آمده‌اند.
   هر حالت تصویر تابع محضِ زمان است: window.SEEK(t).
   =========================================================================== */
const DUR = 150, FPS = 30;
const layers = document.getElementById("layers");
const headBox = document.getElementById("head");
const headH = headBox.querySelector(".h"), headS = headBox.querySelector(".s");
const capBox = document.getElementById("cap"), capC = capBox.querySelector(".c");
const chipBox = document.getElementById("chip"), chipS = chipBox.querySelector("span");
const curtain = document.getElementById("curtain");
const scrim = document.getElementById("scrim"), scrimTop = document.getElementById("scrimTop");

const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const S = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)));
const eo = p => 1 - Math.pow(1 - p, 3);
const eio = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const ob = p => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);
const lp = (a, b, p) => a + (b - a) * p;
const px = v => v.toFixed(2) + "px";
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const add = (parent, tag, cls, html) => { const n = el(tag, cls, html); parent.appendChild(n); return n; };

function scene(a, b, fi = 0.45, fo = 0.45) {
  const n = add(layers, "div", "scene");
  n.__vis = t => {
    if (t < a - 0.02 || t > b + 0.02) { n.style.display = "none"; n.style.opacity = 0; return 0; }
    n.style.display = "block";
    const o = Math.min(S(t, a, a + fi), 1 - S(t, b - fo, b));
    n.style.opacity = o.toFixed(4);
    return o;
  };
  return n;
}

/* ---------------------------------------------------------------
   متن‌ها — تیتر بالا، زیرنویس پایین، نشان مرحله
   --------------------------------------------------------------- */
const HEADS = [
  { a: 1.0,  b: 7.0,  h: "نامه‌تان کجا گیر کرده؟" },
  { a: 8.0,  b: 12.6, h: "مخاطب‌ها پخش‌اند." },
  { a: 13.5, b: 18.1, h: "ابزارش زجرآور است." },
  { a: 19.0, b: 23.6, h: "نمی‌دانید چه کسی دیدش." },
  { a: 24.5, b: 29.1, h: "محرمانه، محرمانه نمی‌ماند." },
  { a: 30.0, b: 34.6, h: "نامه در صف امضا می‌ماند." },
  { a: 49.0, b: 63.2, h: "نُه کار، در یک سامانه." },
  { a: 64.6, b: 71.6, h: "دفترچه مخاطبان", sm: 1 },
  { a: 72.6, b: 79.6, h: "سربرگ خودِ سازمان", sm: 1 },
  { a: 80.6, b: 87.6, h: "نامه به اسم هر نفر", sm: 1 },
  { a: 88.6, b: 95.6, h: "گردش تأیید", sm: 1 },
  { a: 96.6, b: 103.6, h: "تأیید از روی گوشی", sm: 1 },
  { a: 104.6, b: 111.6, h: "چهار کانال ابلاغ", sm: 1 },
  { a: 112.6, b: 119.6, h: "نامه محرمانه", sm: 1 },
  { a: 120.6, b: 127.6, h: "گزارش و پیگیری", sm: 1 },
  { a: 128.6, b: 135.6, h: "دسترسی و امنیت", sm: 1 },
];
const CAPS = [
  { a: 3.4,  b: 7.0,  c: "هر دبیرخانه‌ای این پنج مشکل را می‌شناسد." },
  { a: 9.6,  b: 12.8, c: "گوشی · اتوماسیون · زونکن · اکسل" },
  { a: 15.0, b: 18.3, c: "فونت درهم، تاریخ میلادی، دکمه‌های ریز." },
  { a: 20.6, b: 23.8, c: "کپی می‌شود، فوروارد می‌شود، رد می‌زند." },
  { a: 26.0, b: 29.3, c: "پاکتِ باز، روی میزِ هر کسی." },
  { a: 31.6, b: 34.8, c: "شنبه نوشته شد، چهارشنبه امضا شد. (نمونه)" },
  { a: 43.6, b: 47.6, c: "یک نامه بنویسید؛ به اسم هر نفر، در چهار کانال، با یک امضا از روی گوشی." },
  { a: 66.4, b: 71.8, c: "همه شماره‌ها یک‌جا — با ورود گروهی از اکسل." },
  { a: 74.4, b: 79.8, c: "سربرگ و کادرهای نامه را خودتان می‌چینید." },
  { a: 82.4, b: 87.8, c: "یک متن می‌نویسید؛ برای هر نفر با نام و سمت خودش می‌رود." },
  { a: 90.4, b: 95.8, c: "مسیر امضا را خودتان تعریف می‌کنید." },
  { a: 98.4, b: 103.8, c: "تأییدکننده همان‌جا می‌زند «تأیید». لازم نیست وارد سامانه شود." },
  { a: 106.4, b: 111.8, c: "پیامک، بله، تلگرام و ایتا — در یک ارسال." },
  { a: 114.4, b: 119.8, c: "لینک شخصی و کد دسترسی، در همان یک پیامک." },
  { a: 122.4, b: 127.8, c: "چند تا رسید، چند تا باز شد، چند تا پاسخ داد." },
  { a: 130.4, b: 135.8, c: "دسترسی هر کاربر به هر منو، جداگانه. هر اقدام ثبت می‌شود." },
];
const CHIPS = [
  { a: 7.8,  b: 12.9, x: "مشکل ۱ از ۵" },
  { a: 13.3, b: 18.4, x: "مشکل ۲ از ۵" },
  { a: 18.8, b: 23.9, x: "مشکل ۳ از ۵" },
  { a: 24.3, b: 29.4, x: "مشکل ۴ از ۵" },
  { a: 29.8, b: 34.9, x: "مشکل ۵ از ۵" },
  { a: 48.6, b: 63.4, x: "قابلیت‌ها در یک نگاه" },
  { a: 64.4, b: 71.9, x: "۱ از ۹" },
  { a: 72.4, b: 79.9, x: "۲ از ۹" },
  { a: 80.4, b: 87.9, x: "۳ از ۹" },
  { a: 88.4, b: 95.9, x: "۴ از ۹" },
  { a: 96.4, b: 103.9, x: "۵ از ۹" },
  { a: 104.4, b: 111.9, x: "۶ از ۹" },
  { a: 112.4, b: 119.9, x: "۷ از ۹" },
  { a: 120.4, b: 127.9, x: "۸ از ۹" },
  { a: 128.4, b: 135.9, x: "۹ از ۹" },
];

function band(list, t, node, write) {
  let a = null;
  for (const c of list) if (t >= c.a - 0.6 && t <= c.b + 0.6) a = c;
  if (!a) { node.style.opacity = 0; return; }
  const o = Math.min(S(t, a.a, a.a + 0.5), 1 - S(t, a.b, a.b + 0.4));
  node.style.opacity = o.toFixed(4);
  node.style.transform = `translateY(${((1 - eo(S(t, a.a, a.a + 0.8))) * 24).toFixed(2)}px)`;
  write(a);
}

/* =========================================================================
   صحنه ۰ — قلاب (۰–۷٫۵)
   ========================================================================= */
{
  const sc = scene(0, 7.6, 0.8, 0.5);
  const halo = add(sc, "div");
  halo.style.cssText = "position:absolute;left:50%;top:960px;width:1300px;height:1300px;margin:-650px 0 0 -650px;border-radius:50%;background:radial-gradient(circle,rgba(95,192,224,.12),rgba(95,192,224,0) 62%)";
  const sh = add(sc, "div", "sheet");
  sh.style.cssText = "left:300px;top:700px;width:480px;height:660px";
  sh.innerHTML = `<div class="hd"><div class="mk">م</div><b>پارک علم و فناوری یزد</b></div>
    <div class="ln" style="width:85%"></div><div class="ln" style="width:92%"></div>
    <div class="ln" style="width:74%"></div><div class="ln" style="width:88%"></div>
    <div class="ln" style="width:52%"></div>`;
  sc.__r = t => {
    halo.style.opacity = (0.4 + 0.6 * S(t, 0, 3)).toFixed(3);
    const p = eo(S(t, 0.2, 2.2));
    sh.style.opacity = S(t, 0.2, 1.0).toFixed(3);
    sh.style.transform = `translateY(${lp(-420, 0, p).toFixed(1)}px) rotate(${lp(-9, -2.5, p).toFixed(2)}deg) scale(${lp(0.85, 1, p).toFixed(3)})`;
  };
}

/* =========================================================================
   مشکل ۱ — مخاطب‌ها پخش‌اند (۷٫۵–۱۳)
   ========================================================================= */
{
  const sc = scene(7.5, 13.1, 0.4, 0.45);
  const DEF = [
    { t: "گوشی همکار", s: "سه شماره، یکی بی‌نام", r: ["حاج‌آقا رئیس", "۰۹۱۳ …"], x: 60, y: 500, dx: -320 },
    { t: "اتوماسیون اداری", s: "آخرین به‌روزرسانی ۱۴۰۲", r: ["اداره کل", "۳۱ مخاطب"], x: 550, y: 500, dx: 320 },
    { t: "زونکن کاغذی", s: "۲۱۰ برگ، دست‌نویس", r: ["شماره تماس", "روی کاغذ"], x: 60, y: 900, dx: -320 },
    { t: "فایل اکسل", s: "مخاطبین_نهایی۳.xlsx", r: ["ردیف تکراری", "۴۷"], x: 550, y: 900, dx: 320 },
  ];
  const cards = DEF.map((d, i) => {
    const n = add(sc, "div", "isl");
    n.style.left = px(d.x); n.style.top = px(d.y);
    n.innerHTML = `<b>${d.t}</b><i>${d.s}</i><span class="row"><span>${d.r[0]}</span><span dir="ltr">${d.r[1]}</span></span>`;
    n.__d = d; n.__at = 7.9 + i * 0.42; return n;
  });
  const XS = [[502, 630], [502, 1030], [262, 828], [742, 828]];
  const xs = XS.map((p, i) => {
    const n = add(sc, "div", "xmark");
    n.style.left = px(p[0]); n.style.top = px(p[1]);
    n.__at = 10.2 + i * 0.22; return n;
  });
  sc.__r = t => {
    cards.forEach(n => {
      const p = eo(S(t, n.__at, n.__at + 0.8));
      n.style.opacity = p.toFixed(3);
      n.style.transform = `translateX(${(n.__d.dx * (1 - p)).toFixed(1)}px) scale(${lp(0.9, 1, p).toFixed(3)})`;
    });
    xs.forEach(n => {
      const p = S(t, n.__at, n.__at + 0.4);
      n.style.opacity = p.toFixed(3);
      n.style.transform = `scale(${lp(1.7, 1, ob(p)).toFixed(3)})`;
    });
  };
}

/* =========================================================================
   مشکل ۲ — ابزار زمخت (۱۳–۱۸٫۵)
   ========================================================================= */
{
  const sc = scene(13.0, 18.6, 0.4, 0.45);
  const win = add(sc, "div"); win.id = "legacy9";
  const NM = ["Ahmadi R.", "Karimi M.", "Sadeghi H.", "Tehrani A.", "Mousavi K.", "Rezaei S.",
              "Jafari N.", "Hosseini B.", "Najafi F.", "Zare M.", "Eskandari P.", "Gholami V."];
  const rows = NM.map((n, i) =>
    `<tr><td class="ltr">${1400 + i}</td><td>${n}</td><td class="ltr">0912${9990000 + i * 7}</td>
     <td class="ltr">2026-0${(i % 9) + 1}-1${i % 9}</td><td class="ltr">DRAFT</td><td class="ltr">${(i % 3) ? "N/A" : "OK"}</td></tr>`).join("");
  win.innerHTML = `<div class="tb">سامانه مکاتبات اداری — نسخه ۳٫۲٫۱۴ (Build 2011)</div>
    <div class="mb"><span>فایل</span><span>ویرایش</span><span>نمایش</span><span>ابزار</span><span>راهنما</span></div>
    <div class="tl">${"<i></i>".repeat(11)}</div>
    <div style="padding:8px 10px"><table>
      <tr><th>کد</th><th>نام</th><th>تلفن</th><th>Date</th><th>Status</th><th>Flag</th></tr>${rows}</table></div>`;
  const cur = add(sc, "div"); cur.id = "cur9";
  cur.innerHTML = `<div class="miss"></div>
    <svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.6L10.5 19z" fill="#fff" stroke="#111" stroke-width="1.2"/></svg>`;
  const miss = cur.querySelector(".miss");
  const PATH = [
    { t: 13.6, x: 540, y: 980 }, { t: 14.7, x: 930, y: 620, click: 1 },
    { t: 15.9, x: 300, y: 1180 }, { t: 16.8, x: 880, y: 620, click: 1 },
    { t: 18.0, x: 520, y: 900 },
  ];
  sc.__r = t => {
    win.style.transform = `scale(${lp(1.04, 1, eo(S(t, 13.0, 15.0))).toFixed(4)})`;
    let i = 0; while (i < PATH.length - 1 && t > PATH[i + 1].t) i++;
    const A = PATH[i], B = PATH[Math.min(i + 1, PATH.length - 1)];
    const p = B === A ? 1 : eio(S(t, A.t, B.t));
    cur.style.opacity = S(t, 13.3, 13.6).toFixed(3);
    cur.style.transform = `translate(${lp(A.x, B.x, p).toFixed(1)}px,${lp(A.y, B.y, p).toFixed(1)}px)`;
    let mo = 0, ms = 1;
    for (const k of PATH) if (k.click) { const q = S(t, k.t, k.t + 0.7); if (q > 0 && q < 1) { mo = 1 - q; ms = lp(0.5, 1.6, q); } }
    miss.style.opacity = mo.toFixed(3); miss.style.transform = `scale(${ms.toFixed(3)})`;
  };
}

/* =========================================================================
   مشکل ۳ — نمی‌دانید چه کسی دیدش (۱۸٫۵–۲۴)
   ========================================================================= */
{
  const sc = scene(18.5, 24.1, 0.4, 0.45);
  const POS = [
    { x: -250, y: -230, r: -9,  w: "واحد مالی", at: 19.1 },
    { x:  250, y: -180, r:  8,  w: "روابط عمومی", at: 19.6 },
    { x: -280, y:  120, r:  7,  w: "؟", q: 1, at: 20.1 },
    { x:  270, y:  170, r: -8,  w: "پیمانکار", fwd: 1, at: 20.6 },
    { x:  -40, y:  370, r: 11,  w: "؟", q: 1, at: 21.2 },
  ];
  const nodes = POS.map(d => {
    const n = add(sc, "div", "sheet");
    n.style.cssText = "left:50%;top:940px;width:330px;height:452px;margin:-226px 0 0 -165px";
    n.innerHTML = `<div class="ln" style="margin-top:30px;width:86%"></div><div class="ln" style="width:94%"></div>
      <div class="ln" style="width:70%"></div><div class="ln" style="width:90%"></div>
      <div class="ln" style="width:46%"></div>
      <div class="who" style="${d.q ? "color:#C0392B;font-size:30px" : ""}">${d.w}</div>
      ${d.fwd ? '<div class="fwd">فوروارد ۳ بار</div>' : ""}`;
    n.__d = d; return n;
  });
  sc.__r = t => {
    nodes.forEach(n => {
      const d = n.__d, p = eo(S(t, d.at, d.at + 0.9));
      n.style.opacity = (p * 0.97).toFixed(3);
      n.style.transform = `translate(${(d.x * p).toFixed(1)}px,${(d.y * p).toFixed(1)}px) rotate(${(d.r * p).toFixed(2)}deg) scale(${lp(0.72, 1, p).toFixed(3)})`;
    });
  };
}

/* =========================================================================
   مشکل ۴ — نامه محرمانه (۲۴–۲۹٫۵)
   ========================================================================= */
{
  const sc = scene(24.0, 29.6, 0.4, 0.45);
  const peek = add(sc, "div", "sheet");
  peek.style.cssText = "left:255px;top:560px;width:570px;height:520px";
  peek.innerHTML = `<div class="ln" style="margin-top:120px;width:40%"></div><div class="ln" style="width:92%"></div>
    <div class="ln" style="width:84%"></div><div class="ln" style="width:70%"></div>`;
  const stamp = add(peek, "div", "stamp9", "محرمانه");
  stamp.style.cssText += ";top:32px;right:34px";
  const envBody = add(sc, "div");
  envBody.style.cssText = "position:absolute;z-index:3;left:195px;top:900px;width:690px;height:460px;border-radius:14px;background:linear-gradient(170deg,#E8E2D4,#CFC7B4);box-shadow:0 46px 100px rgba(0,0,0,.6)";
  const flap = add(sc, "div");
  flap.style.cssText = "position:absolute;z-index:4;left:195px;top:900px;width:690px;height:260px;background:linear-gradient(175deg,#DED7C6,#C4BCA8);clip-path:polygon(0 0,100% 0,50% 100%);transform-origin:50% 0";
  const desk = add(sc, "div");
  desk.style.cssText = "position:absolute;z-index:2;left:110px;top:1356px;width:860px;height:16px;border-radius:8px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.02));opacity:0";
  sc.__r = t => {
    const sp = S(t, 24.6, 25.1), settle = eo(S(t, 24.6, 25.5));
    stamp.style.opacity = sp.toFixed(3);
    stamp.style.transform = `rotate(${lp(-26, -12, settle).toFixed(2)}deg) scale(${lp(2.6, 1, settle).toFixed(3)})`;
    flap.style.transform = `rotateX(${lp(-6, -158, eio(S(t, 25.8, 27.2))).toFixed(1)}deg)`;
    desk.style.opacity = S(t, 26.8, 27.8).toFixed(3);
    const lift = eio(S(t, 26.0, 28.2));
    peek.style.transform = `translateY(${lp(60, 0, lift).toFixed(1)}px)`;
  };
}

/* =========================================================================
   مشکل ۵ — صف امضا (۲۹٫۵–۳۵)
   ========================================================================= */
{
  const sc = scene(29.5, 35.1, 0.4, 0.5);
  const LBL = ["کارشناس", "رئیس اداره", "معاون", "مدیرکل"];
  const YS = [620, 840, 1060, 1280];
  const desks = YS.map((y, i) => {
    const n = add(sc, "div", "deskv");
    n.style.top = px(y);
    n.innerHTML = `<b>${LBL[i]}</b>`;
    n.__at = 29.7 + i * 0.2; return n;
  });
  const sh = add(sc, "div", "sheet");
  sh.style.cssText = "left:50%;width:230px;height:316px;margin-left:-115px;top:0";
  sh.innerHTML = `<div class="ln" style="margin-top:28px;width:84%"></div><div class="ln" style="width:92%"></div>
    <div class="ln" style="width:66%"></div><div class="ln" style="width:88%"></div>`;
  const cal = add(sc, "div"); cal.id = "calv";
  cal.innerHTML = `<div class="dw">شنبه</div><div class="cnt">۰</div><div class="cl">روز در انتظار امضا (نمونه)</div>`;
  const dw = cal.querySelector(".dw"), cnt = cal.querySelector(".cnt");
  const DAYS = [["شنبه", "۰"], ["یکشنبه", "۱"], ["دوشنبه", "۲"], ["سه‌شنبه", "۲"], ["چهارشنبه", "۳"]];
  const FLIP = [30.0, 31.3, 32.4, 33.3, 34.1];
  const HOPS = [[30.1, 30.6], [31.4, 31.9], [32.5, 33.0], [33.6, 34.1]];
  sc.__r = t => {
    desks.forEach(n => {
      const p = eo(S(t, n.__at, n.__at + 0.6));
      n.style.opacity = p.toFixed(3);
      n.style.transform = `translateY(${((1 - p) * 30).toFixed(1)}px)`;
    });
    let idx = 0, hp = 0;
    for (let i = 0; i < HOPS.length; i++) if (t >= HOPS[i][0]) { idx = i; hp = S(t, HOPS[i][0], HOPS[i][1]); }
    const from = idx === 0 ? 300 : YS[idx - 1] - 300;
    const to = YS[idx] - 300;
    const y = lp(from, to, eio(hp));
    sh.style.opacity = S(t, 29.8, 30.1).toFixed(3);
    sh.style.transform = `translateY(${y.toFixed(1)}px) rotate(${(lp(5, -2, hp) * (1 - hp * 0.5)).toFixed(2)}deg)`;
    cal.style.opacity = S(t, 30.4, 31.0).toFixed(3);
    let k = 0; for (let i = 0; i < FLIP.length; i++) if (t >= FLIP[i]) k = i;
    const fp = S(t, FLIP[k], FLIP[k] + 0.3);
    if (dw.textContent !== DAYS[k][0]) { dw.textContent = DAYS[k][0]; cnt.textContent = DAYS[k][1]; }
    dw.style.transform = `translateY(${((1 - eo(fp)) * -16).toFixed(1)}px)`;
    cnt.style.transform = `scale(${lp(1.22, 1, ob(fp)).toFixed(3)})`;
  };
}

/* =========================================================================
   معرفی — راه‌حل (۳۶٫۲–۴۸)
   ========================================================================= */
const MARK = `<svg viewBox="0 0 48 48" fill="none">
  <rect x="5" y="11" width="38" height="26" rx="5" stroke="#9FD6EC" stroke-width="2.6"/>
  <path d="M6.5 14.5 24 27 41.5 14.5" stroke="#9FD6EC" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="13" y="39.5" width="22" height="3.6" rx="1.8" fill="#E3C06B"/></svg>`;
{
  const sc = scene(36.2, 48.2, 0.5, 0.7);
  const glow = add(sc, "div");
  glow.style.cssText = "position:absolute;left:50%;top:860px;width:1200px;height:1200px;margin:-600px 0 0 -600px;border-radius:50%;background:radial-gradient(circle,rgba(95,192,224,.17),rgba(95,192,224,0) 62%)";
  const sh = add(sc, "div", "sheet");
  sh.style.cssText = "left:330px;top:620px;width:420px;height:578px";
  sh.innerHTML = `<div class="hd"><div class="mk">م</div><b>پارک علم و فناوری یزد</b></div>
    <div class="ln" style="width:86%"></div><div class="ln" style="width:93%"></div>
    <div class="ln" style="width:70%"></div><div class="ln" style="width:88%"></div>`;
  const lg = add(sc, "div", "logo9");
  lg.style.top = "640px";
  lg.innerHTML = `<div class="mk">${MARK}</div><b>میلینگ پرس</b><i>MAILING PRESS</i>`;
  sc.__r = t => {
    glow.style.opacity = (S(t, 36.6, 39.5) * 0.9).toFixed(3);
    const rise = eio(S(t, 36.6, 39.6));
    sh.style.opacity = (S(t, 36.6, 37.3) * (1 - S(t, 39.8, 40.9))).toFixed(3);
    sh.style.transform = `translateY(${lp(620, 0, rise).toFixed(1)}px) rotate(${lp(7, 0, rise).toFixed(2)}deg) scale(${lp(0.7, 1, rise).toFixed(3)})`;
    const p = eo(S(t, 40.2, 41.6));
    lg.style.opacity = p.toFixed(3);
    lg.querySelector(".mk").style.transform = `scale(${lp(0.6, 1, ob(S(t, 40.2, 41.8))).toFixed(3)}) rotate(${lp(-12, 0, eo(S(t, 40.2, 41.8))).toFixed(2)}deg)`;
  };
}

/* =========================================================================
   تخته قابلیت‌ها (۴۸–۶۴)
   ========================================================================= */
const FEATURES = [
  ["۱", "دفترچه مخاطبان", "همه شماره‌ها یک‌جا"],
  ["۲", "سربرگ سازمان", "سربرگ و کادرهای دلخواه"],
  ["۳", "نامه به اسم هر نفر", "یک متن، صدها نامه"],
  ["۴", "گردش تأیید", "مسیر امضا را خودتان بچینید"],
  ["۵", "تأیید از گوشی", "بدون ورود به سامانه"],
  ["۶", "چهار کانال ابلاغ", "پیامک · بله · تلگرام · ایتا"],
  ["۷", "نامه محرمانه", "لینک شخصی با کد دسترسی"],
  ["۸", "گزارش و پیگیری", "رسید، باز شد، پاسخ داد"],
  ["۹", "دسترسی و امنیت", "هر کاربر، دسترسی خودش"],
];
{
  const sc = scene(48.0, 64.4, 0.5, 0.7);
  const CW = 452, CH = 188, GX = 24, GY = 22;
  const L0 = (1080 - (2 * CW + GX)) / 2, T0 = 390;
  const cards = FEATURES.map((f, i) => {
    const n = add(sc, "div", "fcard");
    const row = Math.floor(i / 2), col = i % 2;
    const last = i === 8;
    n.style.left = px(last ? (1080 - CW) / 2 : L0 + col * (CW + GX));
    n.style.top = px(T0 + row * (CH + GY));
    n.innerHTML = `<span class="n">${f[0]}</span><span class="t"><b>${f[1]}</b><i>${f[2]}</i></span>`;
    n.__at = 49.4 + i * 1.26; return n;
  });
  sc.__r = t => {
    const out = eio(S(t, 62.6, 64.4));
    cards.forEach(n => {
      const p = ob(S(t, n.__at, n.__at + 0.68));
      n.style.opacity = (S(t, n.__at, n.__at + 0.38) * (1 - out)).toFixed(3);
      n.style.transform = `translateY(${((1 - p) * 32).toFixed(1)}px) scale(${(lp(0.88, 1, p) * lp(1, 0.92, out)).toFixed(3)})`;
    });
  };
}

/* =========================================================================
   نُه بند — بررسی یکی‌یکی (۶۴–۱۳۶)
   یک گوشی ثابت است و صفحه‌هایش عوض می‌شود: همان «شیء حامل».
   ========================================================================= */
{
  const sc = scene(63.6, 136.4, 0.6, 0.6);
  const PH = { x: 270, y: 440, w: 540, h: 900 };
  const ph = add(sc, "div", "ph");
  ph.style.cssText = `left:${PH.x}px;top:${PH.y}px;width:${PH.w}px;height:${PH.h}px`;
  ph.innerHTML = `<div class="vp"></div><div class="bar"></div><div class="notch"></div>`;
  const vp = ph.querySelector(".vp");
  const imgs = [add(vp, "img"), add(vp, "img")];

  /* f/o = کسری از مسیر اسکرول صفحه؛ z = بزرگ‌نمایی */
  const SHOTS = [
    { a: 64.0, b: 72.6, s: "contacts",    f: [0.02, 1.00], o: [0.30, 1.04] },
    { a: 72.0, b: 80.6, s: "letterheads", f: [0.02, 1.08], o: [0.55, 1.18] },
    { a: 80.0, b: 84.8, s: "compose",     f: [0.02, 1.06], o: [0.42, 1.00] },
    { a: 84.2, b: 88.6, s: "campaign",    f: [0.08, 1.00], o: [0.52, 1.06] },
    { a: 88.0, b: 96.6, s: "workflow",    f: [0.02, 1.08], o: [0.60, 1.18] },
    { a: 96.0, b: 104.6, s: "approvals",  f: [0.04, 1.22], o: [0.34, 1.08] },
    { a: 104.0, b: 112.6, s: "sms",       f: [0.04, 1.00], o: [0.52, 1.05] },
    { a: 112.0, b: 116.8, s: "gate",      f: [0.06, 1.26], o: [0.38, 1.10] },
    { a: 116.2, b: 120.6, s: "letter",    f: [0.00, 1.16], o: [0.40, 1.00] },
    { a: 120.0, b: 128.6, s: "reports",   f: [0.02, 1.00], o: [0.34, 1.04] },
    { a: 128.0, b: 132.8, s: "access",    f: [0.04, 1.00], o: [0.38, 1.05] },
    { a: 132.2, b: 136.4, s: "users",     f: [0.02, 1.08], o: [0.44, 1.00] },
  ];
  SHOTS.forEach((s, i) => { s.layer = i % 2; });

  /* ضربه روی «تأیید» (بند ۵) */
  const tap = add(sc, "div", "tapring");
  tap.style.cssText += ";width:170px;height:170px";
  /* لنگرِ دکمه «تأیید» در مختصاتِ خودِ عکس (کسری از عرض و ارتفاع) */
  const TAP_ANCHOR = { px: 0.70, py: 0.185 };
  let shotBox = null;   /* {z, ty, natH} نمای فعلی، برای جای‌گذاری لنگر */

  /* نشان چهار کانال (بند ۶) */
  const chans = add(sc, "div"); chans.id = "chans"; chans.style.top = "1382px";
  ["پیامک", "بله", "تلگرام", "ایتا"].forEach(x => add(chans, "div", null, x));
  const chanKids = [...chans.children];

  /* کارت پیامک (بند ۷) */
  const smsCard = add(sc, "div"); smsCard.id = "smsCard"; smsCard.style.top = "1370px";
  smsCard.innerHTML = `<div class="from">میلینگ پرس</div>
    <p>نامه شماره ۱۴۰۴/۲۳۱ برای جنابعالی صادر شد.<br>
    لینک: mp.ir/l/FmMX3d — کد دسترسی: <b>۴۹۲۸۷۱</b></p>`;

  sc.__r = t => {
    const o = Math.min(S(t, 63.8, 65.0), 1 - S(t, 135.6, 136.4));
    ph.style.opacity = o.toFixed(3);
    ph.style.transform = `translateY(${((1 - eo(S(t, 63.8, 65.4))) * 60).toFixed(1)}px) scale(${lp(0.95, 1, eo(S(t, 63.8, 65.4))).toFixed(3)})`;

    const used = [0, 0];
    for (const s of SHOTS) {
      const vis = Math.min(S(t, s.a, s.a + 0.55), 1 - S(t, s.b - 0.55, s.b));
      if (vis <= 0.002) continue;
      const im = imgs[s.layer];
      const src = "shots9/" + s.s + ".png";
      if (!im.src.endsWith(src)) im.src = src;
      const p = eio(S(t, s.a, s.b));
      const z = lp(s.f[1], s.o[1], p);
      const natH = im.naturalWidth ? PH.w * im.naturalHeight / im.naturalWidth : PH.h;
      const range = Math.max(0, natH * z - PH.h);
      const ty = -range * lp(s.f[0], s.o[0], p) / z;
      im.style.transformOrigin = "50% 0";
      im.style.transform = `scale(${z.toFixed(4)}) translateY(${ty.toFixed(1)}px)`;
      im.style.opacity = vis.toFixed(3);
      if (s.s === "approvals") shotBox = { z, ty, natH };
      used[s.layer] = 1;
    }
    imgs.forEach((im, i) => { if (!used[i]) im.style.opacity = 0; });

    /* بند ۵ — ضربه تأیید، دقیقاً روی خودِ دکمه */
    const tp = S(t, 99.6, 100.5);
    tap.style.opacity = (tp > 0 && tp < 1 ? 1 - tp : 0).toFixed(3);
    if (shotBox) {
      const cx = PH.x + PH.w / 2 + (TAP_ANCHOR.px * PH.w - PH.w / 2) * shotBox.z;
      const cy = PH.y + 48 + (TAP_ANCHOR.py * shotBox.natH + shotBox.ty) * shotBox.z;
      tap.style.left = px(cx - 85); tap.style.top = px(cy - 85);
    }
    tap.style.transform = `scale(${lp(0.3, 1.3, tp).toFixed(3)})`;

    /* بند ۶ — کانال‌ها */
    const co = Math.min(S(t, 107.4, 108.1), 1 - S(t, 111.6, 112.3));
    chans.style.opacity = co.toFixed(3);
    chans.style.display = co <= 0.002 ? "none" : "flex";
    chanKids.forEach((k, i) => {
      const at = 107.6 + i * 0.4;
      const p = ob(S(t, at, at + 0.55));
      k.style.transform = `scale(${lp(0.72, 1, p).toFixed(3)})`;
      k.style.opacity = S(t, at, at + 0.3).toFixed(3);
      k.classList.toggle("on", t >= at + 0.45);
    });

    /* بند ۷ — کارت پیامک */
    const so = Math.min(S(t, 113.4, 114.2), 1 - S(t, 115.9, 116.5));
    smsCard.style.opacity = so.toFixed(3);
    smsCard.style.transform = `translateY(${((1 - eo(S(t, 113.4, 114.4))) * 40).toFixed(1)}px)`;
  };
}

/* =========================================================================
   دعوت (۱۳۶–۱۵۰)
   ========================================================================= */
{
  const sc = scene(136.0, 150.0, 0.8, 1.2);
  const lg = add(sc, "div", "logo9");
  lg.style.top = "470px";
  lg.innerHTML = `<div class="mk">${MARK}</div><b>میلینگ پرس</b><i>MAILING PRESS</i>`;
  const l1 = add(sc, "div", null, "دبیرخانه دارید؟");
  l1.style.cssText = "position:absolute;left:62px;right:62px;top:1010px;text-align:center;font-size:58px;font-weight:800;color:#fff";
  const l2 = add(sc, "div", null, "یک نامه واقعی با سربرگ خودتان بفرستیم — بیست دقیقه.");
  l2.style.cssText = "position:absolute;left:62px;right:62px;top:1110px;text-align:center;font-size:38px;line-height:1.6;color:#9FC3D8";
  const ch = add(sc, "div");
  ch.style.cssText = "position:absolute;left:0;right:0;top:1290px;display:flex;gap:16px;justify-content:center";
  ["پیامک", "بله", "تلگرام", "ایتا"].forEach(x => {
    const n = add(ch, "div", null, x);
    n.style.cssText = "padding:13px 24px;border-radius:15px;font-size:30px;font-weight:800;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.17)";
  });
  const url = add(sc, "div", null, "mailing-system-chi.vercel.app");
  url.style.cssText = "position:absolute;left:0;right:0;top:1450px;text-align:center;font-size:36px;font-weight:700;color:#E3C06B;direction:ltr";
  sc.__r = t => {
    const p = eo(S(t, 136.4, 137.8));
    lg.style.opacity = p.toFixed(3);
    lg.querySelector(".mk").style.transform = `scale(${lp(0.78, 1, ob(S(t, 136.4, 138.0))).toFixed(3)})`;
    [[l1, 138.2], [l2, 139.0], [ch, 139.9], [url, 140.9]].forEach(([n, at]) => {
      const q = S(t, at, at + 0.8);
      n.style.opacity = q.toFixed(3);
      n.style.transform = `translateY(${((1 - eo(q)) * 22).toFixed(1)}px)`;
    });
  };
}

/* =========================================================================
   موتور
   ========================================================================= */
const SCENES = [...layers.querySelectorAll(".scene")];
window.SEEK = function (t) {
  for (const s of SCENES) { const o = s.__vis(t); if (o > 0 && s.__r) s.__r(t); }
  band(HEADS, t, headBox, a => {
    if (headH.textContent !== a.h) headH.textContent = a.h;
    headH.classList.toggle("sm", !!a.sm);
    headS.textContent = "";
  });
  band(CAPS, t, capBox, a => { if (capC.textContent !== a.c) capC.textContent = a.c; });
  band(CHIPS, t, chipBox, a => { if (chipS.textContent !== a.x) chipS.textContent = a.x; });
  /* پرده‌های تیره فقط وقتی متن روی تصویر می‌نشیند */
  const onUi = Math.min(S(t, 64.0, 65.2), 1 - S(t, 135.4, 136.2));
  scrim.style.opacity = Math.max(onUi, 0.55).toFixed(3);
  scrimTop.style.opacity = Math.max(onUi, 0.5).toFixed(3);
  const black = Math.max(
    Math.min(S(t, 34.9, 35.4), 1 - S(t, 35.9, 36.5)),
    1 - S(t, 0, 0.6),
    S(t, 148.6, 150)
  );
  curtain.style.opacity = black.toFixed(4);
};
window.FILM = { DUR, FPS };
window.SEEK(0);
