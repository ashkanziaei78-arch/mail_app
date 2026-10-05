/* ===========================================================================
   میلینگ پرس — ویدیو تبلیغاتی، دقیقاً بر پایهٔ docs/video/SCRIPT-VO.md
   شانزده صحنه · ۲:۱۲ · ۱۰۸۰×۱۹۲۰ · ۳۰fps
   هر حالت تصویر تابعِ محضِ زمان است: window.SEEK(t)
   =========================================================================== */
const DUR = 132, FPS = 30;
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
const add = (parent, tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  parent.appendChild(n); return n;
};
/* تصادفِ Seed‌دار — رندر باید قطعی بماند */
let _s = 1337;
const rnd = () => (_s = (_s * 1664525 + 1013904223) % 4294967296) / 4294967296;

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
   PART 4 — متن روی تصویر
   --------------------------------------------------------------- */
const HEADS = [
  { a: 1.0,  b: 3.5,  h: "شمارهٔ مخاطب کجاست؟" },
  { a: 3.9,  b: 6.2,  h: "نامه دیده شد؟" },
  { a: 6.6,  b: 8.8,  h: "امضایش چه شد؟" },
  { a: 9.6,  b: 16.6, h: "مخاطب‌ها پخش‌اند." },
  { a: 17.6, b: 24.6, h: "هر نامه، یک کانال.", sm: 1 },
  { a: 25.6, b: 33.6, h: "زنجیرهٔ کاغذی." },
  { a: 34.6, b: 40.6, h: "و بعد… انتظار." },
  { a: 41.6, b: 47.4, h: "نامه کجاست؟" },
  { a: 49.6, b: 54.0, h: "چرا هنوز؟" },
  { a: 65.6, b: 72.6, h: "دفترچهٔ مخاطبان", sm: 1 },
  { a: 73.6, b: 80.6, h: "سربرگ و کادرهای نامه", sm: 1 },
  { a: 81.6, b: 89.6, h: "نامه به اسم هر نفر", sm: 1 },
  { a: 90.6, b: 97.6, h: "تأیید و امضا", sm: 1 },
  { a: 98.6, b: 106.6, h: "پیگیری", sm: 1 },
  { a: 107.6, b: 114.6, h: "داشبورد و گزارش", sm: 1 },
  { a: 116.2, b: 121.4, h: "از کاغذ… به دیجیتال." },
];
const CAPS = [
  { a: 9.9,  b: 16.8, c: "گوشی · اتوماسیون · زونکن · اکسل" },
  { a: 18.6, b: 24.8, c: "همیشه مشخص نیست چه کسی، کِی، آن را دیده است." },
  { a: 26.4, b: 33.8, c: "چاپ · امضا · مهر · دبیرخانه · ارسال" },
  { a: 35.6, b: 40.8, c: "۳ روز در انتظار امضا (نمونه)" },
  { a: 43.6, b: 47.6, c: "پیگیری، سخت‌تر از چیزی است که باید باشد." },
  { a: 61.2, b: 64.8, c: "مکاتبات سازمانی، دیجیتال و قابل‌پیگیری." },
  { a: 67.6, b: 72.8, c: "یک دفترچه برای کل سازمان — با ورود گروهی از اکسل." },
  { a: 75.6, b: 80.8, c: "شماره · تاریخ شمسی · پیوست · جدول · تصویر · امضا" },
  { a: 83.6, b: 89.8, c: "یک متن می‌نویسید؛ برای هر نفر با نام خودش می‌رود." },
  { a: 92.6, b: 97.8, c: "مسیر امضا را خودتان می‌چینید؛ تأیید از روی گوشی." },
  { a: 100.6, b: 106.8, c: "لینک شخصی و کد دسترسی، در همان یک پیامک." },
  { a: 109.6, b: 114.8, c: "تقویم شمسی، فیلترهای آماده، گزارش قابل‌خروجی." },
];
const CHIPS = [
  { a: 9.4,  b: 16.9, x: "مشکل ۱ از ۵" },
  { a: 17.4, b: 24.9, x: "مشکل ۲ از ۵" },
  { a: 25.4, b: 33.9, x: "مشکل ۳ از ۵" },
  { a: 34.4, b: 40.9, x: "مشکل ۴ از ۵" },
  { a: 41.4, b: 47.9, x: "مشکل ۵ از ۵" },
  { a: 65.4, b: 72.9, x: "۱ از ۶" },
  { a: 73.4, b: 80.9, x: "۲ از ۶" },
  { a: 81.4, b: 89.9, x: "۳ از ۶" },
  { a: 90.4, b: 97.9, x: "۴ از ۶" },
  { a: 98.4, b: 106.9, x: "۵ از ۶" },
  { a: 107.4, b: 114.9, x: "۶ از ۶" },
];
function band(list, t, node, write) {
  let a = null;
  for (const c of list) if (t >= c.a - 0.6 && t <= c.b + 0.6) a = c;
  if (!a) { node.style.opacity = 0; return; }
  node.style.opacity = Math.min(S(t, a.a, a.a + 0.5), 1 - S(t, a.b, a.b + 0.4)).toFixed(4);
  node.style.transform = `translateY(${((1 - eo(S(t, a.a, a.a + 0.8))) * 24).toFixed(2)}px)`;
  write(a);
}

const SHEET_HTML = `<div class="hd"><div class="mk">م</div><b>پارک علم و فناوری یزد</b></div>
  <div class="ln" style="width:86%"></div><div class="ln" style="width:93%"></div>
  <div class="ln" style="width:70%"></div><div class="ln" style="width:88%"></div>
  <div class="ln" style="width:52%"></div>`;
const MARK = `<svg viewBox="0 0 48 48" fill="none">
  <rect x="5" y="11" width="38" height="26" rx="5" stroke="#9FD6EC" stroke-width="2.6"/>
  <path d="M6.5 14.5 24 27 41.5 14.5" stroke="#9FD6EC" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="13" y="39.5" width="22" height="3.6" rx="1.8" fill="#E3C06B"/></svg>`;

/* =========================================================================
   SCENE 01 — Hook (۰:۰۰–۰:۰۹)
   ========================================================================= */
{
  const sc = scene(0, 9.1, 0.8, 0.5);
  const halo = add(sc, "div");
  halo.style.cssText = "position:absolute;left:50%;top:980px;width:1250px;height:1250px;margin:-625px 0 0 -625px;border-radius:50%;background:radial-gradient(circle,rgba(95,192,224,.11),rgba(95,192,224,0) 62%)";
  const sh = add(sc, "div", "sheet", SHEET_HTML);
  sh.style.cssText = "left:300px;top:650px;width:480px;height:660px";
  const sweep = add(sh, "div");
  sweep.style.cssText = "position:absolute;z-index:4;left:-60%;top:0;width:60%;height:100%;background:linear-gradient(90deg,rgba(95,192,224,0),rgba(95,192,224,.42),rgba(95,192,224,0));opacity:0";
  sc.__r = t => {
    halo.style.opacity = (0.35 + 0.65 * S(t, 0, 3)).toFixed(3);
    const p = eo(S(t, 0.2, 2.6));
    sh.style.opacity = S(t, 0.2, 1.0).toFixed(3);
    sh.style.transform = `translateY(${lp(-60, 0, p).toFixed(1)}px) rotate(${lp(-7, -2, p).toFixed(2)}deg) scale(${lp(0.9, 1, p).toFixed(3)}) perspective(1600px) rotateY(${lp(-10, 0, p).toFixed(2)}deg)`;
    /* با هر سؤال، یک گذرِ نور روی برگه */
    let o = 0, x = -60;
    for (const at of [1.1, 4.0, 6.7]) {
      const q = S(t, at, at + 0.9);
      if (q > 0 && q < 1) { o = Math.sin(Math.PI * q); x = lp(-60, 110, q); }
    }
    sweep.style.opacity = o.toFixed(3);
    sweep.style.left = x.toFixed(1) + "%";
  };
}

/* =========================================================================
   SCENE 02 — Scattered Contacts (۰:۰۹–۰:۱۷)
   ========================================================================= */
{
  const sc = scene(9.0, 17.1, 0.4, 0.45);
  const DEF = [
    { t: "گوشی همکار", s: "سه شماره، یکی بی‌نام", r: ["حاج‌آقا رئیس", "۰۹۱۳ …"], x: 60, y: 700, dx: -330 },
    { t: "اتوماسیون اداری", s: "آخرین به‌روزرسانی ۱۴۰۲", r: ["اداره کل", "۳۱ مخاطب"], x: 550, y: 700, dx: 330 },
    { t: "زونکن کاغذی", s: "۲۱۰ برگ، دست‌نویس", r: ["شماره تماس", "روی کاغذ"], x: 60, y: 1100, dx: -330 },
    { t: "فایل اکسل", s: "مخاطبین_نهایی۳.xlsx", r: ["ردیف تکراری", "۴۷"], x: 550, y: 1100, dx: 330 },
  ];
  const cards = DEF.map((d, i) => {
    const n = add(sc, "div", "isl",
      `<b>${d.t}</b><i>${d.s}</i><span class="row"><span>${d.r[0]}</span><span dir="ltr">${d.r[1]}</span></span>`);
    n.style.left = px(d.x); n.style.top = px(d.y);
    n.__d = d; n.__at = 9.4 + i * 0.42; return n;
  });
  const xs = [[502, 777], [502, 1177], [257, 977], [747, 977]].map((p, i) => {
    const n = add(sc, "div", "xmark");
    n.style.left = px(p[0]); n.style.top = px(p[1]);
    n.__at = 12.3 + i * 0.22; return n;
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
   SCENE 03 — Multiple Channels (۰:۱۷–۰:۲۵)
   ========================================================================= */
{
  const sc = scene(17.0, 25.1, 0.4, 0.45);
  const POS = [{ x: 80, y: 560 }, { x: 570, y: 940 }, { x: 140, y: 1320 }];
  const bubbles = POS.map((p, i) => {
    const n = add(sc, "div", "bubble",
      `<div class="bl" style="width:88%"></div><div class="bl" style="width:64%"></div><div class="bl" style="width:76%;margin-bottom:0"></div>`);
    n.style.left = px(p.x); n.style.top = px(p.y);
    n.__at = 17.5 + i * 0.5; return n;
  });
  const qms = POS.map((p, i) => {
    const n = add(sc, "div", "qm", "؟");
    n.style.left = px(p.x + (i === 1 ? -60 : 450));
    n.style.top = px(p.y + 56);
    n.__at = 19.6 + i * 0.9; return n;
  });
  const sh = add(sc, "div", "sheet");
  sh.style.cssText = "left:0;top:0;width:170px;height:234px";
  sh.innerHTML = `<div class="ln" style="margin-top:26px;width:82%"></div><div class="ln" style="width:92%"></div><div class="ln" style="width:58%"></div>`;
  const STOPS = [[470, 600], [430, 980], [520, 1360]];
  sc.__r = t => {
    bubbles.forEach(n => {
      const p = eo(S(t, n.__at, n.__at + 0.7));
      n.style.opacity = p.toFixed(3);
      n.style.transform = `translateY(${((1 - p) * 40).toFixed(1)}px) scale(${lp(0.92, 1, p).toFixed(3)})`;
    });
    qms.forEach(n => {
      const p = S(t, n.__at, n.__at + 0.4);
      n.style.opacity = (p * 0.95).toFixed(3);
      n.style.transform = `scale(${lp(1.6, 1, ob(p)).toFixed(3)})`;
    });
    /* برگه بین حباب‌ها جابه‌جا می‌شود */
    const HOPS = [[18.6, 19.4], [20.4, 21.3], [22.2, 23.1]];
    let i = 0, hp = 0;
    for (let k = 0; k < HOPS.length; k++) if (t >= HOPS[k][0]) { i = k; hp = S(t, HOPS[k][0], HOPS[k][1]); }
    const from = i === 0 ? [470, 220] : STOPS[i - 1];
    const to = STOPS[i];
    const arc = Math.sin(Math.PI * hp) * 90 * (i % 2 ? -1 : 1);
    sh.style.opacity = S(t, 18.2, 18.6).toFixed(3);
    sh.style.transform = `translate(${(lp(from[0], to[0], eio(hp)) + arc).toFixed(1)}px,${lp(from[1], to[1], eio(hp)).toFixed(1)}px) rotate(${(lp(6, -4, hp)).toFixed(2)}deg)`;
  };
}

/* =========================================================================
   SCENE 04 — Paper Workflow (۰:۲۵–۰:۳۴)
   ========================================================================= */
{
  const sc = scene(25.0, 34.1, 0.4, 0.45);
  const IC = {
    print: '<svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="6"/><rect x="3" y="9" width="18" height="8" rx="2"/><rect x="6" y="15" width="12" height="6"/></svg>',
    sign:  '<svg viewBox="0 0 24 24"><path d="M3 16c3 .4 4-7 6.5-7S12 17 14 17s3-3 6-3"/><path d="M3 21h18"/></svg>',
    stamp: '<svg viewBox="0 0 24 24"><path d="M9 3h6v4l2 4H7l2-4z"/><rect x="5" y="13" width="14" height="4" rx="1"/><path d="M4 21h16"/></svg>',
    desk:  '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 5v14"/></svg>',
    send:  '<svg viewBox="0 0 24 24"><path d="M21 3 3 10l7 3 3 7z"/><path d="M10 13 21 3"/></svg>',
  };
  const DEF = [["چاپ", "print"], ["امضا", "sign"], ["مهر", "stamp"], ["دبیرخانه", "desk"], ["ارسال", "send"]];
  const YS = [600, 760, 920, 1080, 1240];
  const sts = DEF.map((d, i) => {
    const n = add(sc, "div", "station", `<span class="ic">${IC[d[1]]}</span><b>${d[0]}</b>`);
    n.style.top = px(YS[i]);
    n.__at = 25.4 + i * 0.42; return n;
  });
  const sh = add(sc, "div", "sheet");
  sh.style.cssText = "left:50%;width:150px;height:206px;margin-left:-370px;top:0;z-index:6";
  sh.innerHTML = `<div class="ln" style="margin-top:22px;width:80%"></div><div class="ln" style="width:90%"></div><div class="ln" style="width:56%"></div>`;
  const back = add(sc, "div");
  back.style.cssText = `position:absolute;left:150px;top:${YS[0] + 20}px;width:6px;height:${YS[4] - YS[0] + 60}px;border-radius:3px;background:linear-gradient(180deg,rgba(255,154,146,.9),rgba(255,154,146,.25));opacity:0`;
  const backHead = add(sc, "div");
  backHead.style.cssText = `position:absolute;left:135px;top:${YS[0] + 2}px;width:0;height:0;
    border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:24px solid rgba(255,154,146,.9);opacity:0`;
  const backTail = add(sc, "div");
  backTail.style.cssText = `position:absolute;left:150px;top:${YS[4] + 76}px;width:300px;height:6px;border-radius:3px;background:rgba(255,154,146,.35);opacity:0`;
  sc.__r = t => {
    sts.forEach(n => {
      const p = eo(S(t, n.__at, n.__at + 0.6));
      n.style.opacity = p.toFixed(3);
      n.style.transform = `translateY(${((1 - p) * 28).toFixed(1)}px)`;
    });
    const HOPS = [[27.6, 28.1], [28.5, 29.0], [29.4, 29.9], [30.3, 30.8], [31.2, 31.7]];
    let i = -1, hp = 1;
    for (let k = 0; k < HOPS.length; k++) if (t >= HOPS[k][0]) { i = k; hp = S(t, HOPS[k][0], HOPS[k][1]); }
    let y;
    if (i < 0) y = 380;
    else y = lp(i === 0 ? 380 : YS[i - 1] - 44, YS[i] - 44, eio(hp));
    /* برگشت: برگه دوباره بالا می‌رود */
    const ret = eio(S(t, 32.3, 33.4));
    y = lp(y, 380, ret);
    sh.style.opacity = S(t, 27.2, 27.6).toFixed(3);
    sh.style.transform = `translateY(${y.toFixed(1)}px) translateX(${(ret * -90).toFixed(1)}px) rotate(${lp(0, -8, ret).toFixed(2)}deg)`;
    const bo = (S(t, 31.9, 32.5) * 0.9).toFixed(3);
    back.style.opacity = bo; backHead.style.opacity = bo; backTail.style.opacity = bo;
    sts.forEach((n, k) => {
      const on = i >= k && t < 32.2;
      n.style.borderColor = on ? "rgba(95,192,224,.45)" : "rgba(255,255,255,.15)";
    });
  };
}

/* =========================================================================
   SCENE 05 — Waiting (۰:۳۴–۰:۴۱)
   ========================================================================= */
{
  const sc = scene(34.0, 41.1, 0.4, 0.45);
  const cal = add(sc, "div"); cal.id = "calv";
  cal.style.top = "520px";
  cal.innerHTML = `<div class="dw">شنبه</div><div class="cnt">۰</div><div class="cl">روز در انتظار امضا (نمونه)</div>`;
  const dw = cal.querySelector(".dw"), cnt = cal.querySelector(".cnt");
  const DAYS = [["شنبه", "۰"], ["یکشنبه", "۱"], ["دوشنبه", "۲"], ["سه‌شنبه", "۲"], ["چهارشنبه", "۳"]];
  const FLIP = [34.6, 35.9, 37.1, 38.3, 39.4];
  const desk = add(sc, "div");
  desk.style.cssText = "position:absolute;left:140px;right:140px;top:1330px;height:14px;border-radius:7px;background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.02))";
  const sh = add(sc, "div", "sheet", SHEET_HTML);
  sh.style.cssText = "left:50%;width:380px;height:522px;margin-left:-190px;top:810px";
  sc.__r = t => {
    cal.style.opacity = S(t, 34.3, 35.0).toFixed(3);
    let k = 0; for (let i = 0; i < FLIP.length; i++) if (t >= FLIP[i]) k = i;
    const fp = S(t, FLIP[k], FLIP[k] + 0.3);
    if (dw.textContent !== DAYS[k][0]) { dw.textContent = DAYS[k][0]; cnt.textContent = DAYS[k][1]; }
    dw.style.transform = `translateY(${((1 - eo(fp)) * -18).toFixed(1)}px)`;
    dw.style.opacity = (0.3 + 0.7 * eo(fp)).toFixed(3);
    cnt.style.transform = `scale(${lp(1.24, 1, ob(fp)).toFixed(3)})`;
    sh.style.opacity = S(t, 34.3, 34.9).toFixed(3);
    sh.style.transform = `rotate(-1.5deg)`;
    desk.style.opacity = S(t, 34.5, 35.2).toFixed(3);
  };
}

/* =========================================================================
   SCENE 06 — Tracking Problem (۰:۴۱–۰:۴۸)
   ========================================================================= */
{
  const sc = scene(41.0, 48.1, 0.4, 0.5);
  const COLS = 5, ROWS = 5, BW = 160, BH = 190, GX = 24, GY = 22;
  const L0 = (1080 - (COLS * BW + (COLS - 1) * GX)) / 2, T0 = 470;
  const bins = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const n = add(sc, "div", "binder", "<i></i>");
    n.style.left = px(L0 + c * (BW + GX));
    n.style.top = px(T0 + r * (BH + GY));
    n.style.width = px(BW); n.style.height = px(BH);
    n.__k = r * COLS + c; bins.push(n);
  }
  /* چهار سؤال، چهار پوشه بیرون می‌آید و خاکستری برمی‌گردد */
  const PULLS = [{ k: 7, at: 42.0 }, { k: 13, at: 43.3 }, { k: 11, at: 44.6 }, { k: 18, at: 45.9 }];
  sc.__r = t => {
    bins.forEach(n => {
      const intro = eo(S(t, 41.1 + (n.__k % 5) * 0.05, 41.6 + (n.__k % 5) * 0.05));
      let out = 0, lit = 0;
      for (const p of PULLS) if (p.k === n.__k) {
        const q = S(t, p.at, p.at + 0.45);
        const back = S(t, p.at + 0.8, p.at + 1.3);
        out = (q - back);
        lit = q * (1 - back);
      }
      n.style.opacity = (intro * (0.5 + 0.5 * lit + 0.2 * out)).toFixed(3);
      n.style.transform = `translateY(${(out * -40).toFixed(1)}px) scale(${lp(0.94, 1, intro).toFixed(3)})`;
      n.style.borderColor = lit > 0.3 ? "rgba(95,192,224,.6)" : "rgba(255,255,255,.09)";
      n.style.background = lit > 0.3
        ? "linear-gradient(180deg,#1E4A66,#123247)"
        : "linear-gradient(180deg,#1C3346,#102333)";
    });
  };
}

/* =========================================================================
   SCENE 07 — Big Question (۰:۴۸–۰:۵۵)
   ========================================================================= */
{
  const sc = scene(48.0, 55.0, 0.5, 0.6);
  const glow = add(sc, "div");
  glow.style.cssText = "position:absolute;left:50%;top:1000px;width:1300px;height:1300px;margin:-650px 0 0 -650px;border-radius:50%;background:radial-gradient(circle,rgba(95,192,224,.14),rgba(95,192,224,0) 60%)";
  const sh = add(sc, "div", "sheet", SHEET_HTML);
  sh.style.cssText = "left:50%;width:440px;height:605px;margin-left:-220px;top:700px";
  sc.__r = t => {
    glow.style.opacity = (S(t, 48.4, 51.5) * 0.9 * (1 - S(t, 53.6, 54.6))).toFixed(3);
    const p = eo(S(t, 48.2, 50.4));
    sh.style.opacity = (S(t, 48.2, 48.8) * (1 - S(t, 53.4, 54.4))).toFixed(3);
    sh.style.transform = `scale(${lp(0.88, 1, p).toFixed(3)}) rotate(${lp(-3, 0, p).toFixed(2)}deg)`;
  };
}

/* =========================================================================
   SCENE 08 — Reveal: ذرات، رابط، نشان (۰:۵۵–۰:۶۵)
   ========================================================================= */
{
  const sc = scene(55.2, 65.6, 0.3, 0.8);
  const field = add(sc, "div"); field.id = "particles";
  /* مقصد: دورِ قابِ گوشی؛ مبدأ: پراکنده و Seed‌دار */
  const PH = { x: 200, y: 240, w: 680, h: 1471 };
  const P = [];
  const N = 160;
  for (let i = 0; i < N; i++) {
    const n = add(field, "span");
    const u = i / N;
    let tx, ty;
    if (u < 0.25) { tx = PH.x + (u / 0.25) * PH.w; ty = PH.y; }
    else if (u < 0.5) { tx = PH.x + PH.w; ty = PH.y + ((u - 0.25) / 0.25) * PH.h; }
    else if (u < 0.75) { tx = PH.x + PH.w - ((u - 0.5) / 0.25) * PH.w; ty = PH.y + PH.h; }
    else { tx = PH.x; ty = PH.y + PH.h - ((u - 0.75) / 0.25) * PH.h; }
    P.push({ n, sx: rnd() * 1080, sy: 400 + rnd() * 1300, tx, ty, d: rnd() * 0.9 });
  }
  const lg = add(sc, "div", "logo9");
  lg.style.top = "560px";
  lg.innerHTML = `<div class="mk">${MARK}</div><b>میلینگ پرس</b><i>MAILING PRESS</i>`;
  sc.__r = t => {
    const gather = eio(S(t, 55.4, 58.6));
    const fade = S(t, 58.2, 59.4);
    P.forEach(p => {
      const g = eio(cl((gather * 1.9) - p.d));
      p.n.style.transform = `translate(${lp(p.sx, p.tx, g).toFixed(1)}px,${lp(p.sy, p.ty, g).toFixed(1)}px) scale(${lp(2.2, 1, g).toFixed(2)})`;
      p.n.style.opacity = (Math.min(1, g * 2) * (1 - fade)).toFixed(3);
    });
    const lp_ = eo(S(t, 59.8, 61.2));
    lg.style.opacity = (lp_ * (1 - S(t, 64.6, 65.6))).toFixed(3);
    lg.querySelector(".mk").style.transform = `scale(${lp(0.55, 1, ob(S(t, 59.8, 61.4))).toFixed(3)}) rotate(${lp(-14, 0, eo(S(t, 59.8, 61.4))).toFixed(2)}deg)`;
  };
}

/* =========================================================================
   SCENES 09–14 — قابلیت‌ها روی گوشیِ واقعی (۰:۵۷–۱:۱۵)
   گوشی از لحظهٔ Reveal می‌ماند و فقط صفحه‌اش عوض می‌شود: شیءِ حامل.
   ========================================================================= */
{
  const sc = scene(57.4, 115.8, 0.7, 0.6);
  const PH = { x: 200, y: 240, w: 680, h: 1471 };
  const TOPBAR = 92;
  const VIS = PH.h - 22 - TOPBAR;

  const ph = add(sc, "div", "ph");
  ph.style.cssText = `left:${PH.x}px;top:${PH.y}px;width:${PH.w}px;height:${PH.h}px`;
  ph.innerHTML = `<div class="screen"><div class="vp"></div>
      <div class="status"><span class="t">۹:۴۱</span><span class="ic"><i></i><i></i><i class="b"></i></span></div>
      <div class="island"></div><div class="home"></div></div>
    <div class="btn" style="right:-6px;top:300px;height:150px"></div>
    <div class="btn" style="left:-6px;top:250px;height:80px"></div>
    <div class="btn" style="left:-6px;top:370px;height:130px"></div>`;
  const vp = ph.querySelector(".vp");
  const imgs = [add(vp, "img"), add(vp, "img")];

  /* f/o = [کسری از مسیر اسکرول، بزرگ‌نمایی] */
  const SHOTS = [
    { a: 58.6, b: 66.0, s: "dashboard",   f: [0.00, 1.00], o: [0.26, 1.04] },
    { a: 65.4, b: 73.6, s: "contacts",    f: [0.02, 1.00], o: [0.30, 1.05] },
    { a: 73.1, b: 81.4, s: "letterheads", f: [0.02, 1.06], o: [0.55, 1.16] },
    { a: 80.9, b: 85.8, s: "compose",     f: [0.02, 1.05], o: [0.44, 1.00] },
    { a: 85.3, b: 90.4, s: "campaign",    f: [0.10, 1.00], o: [0.50, 1.06] },
    { a: 89.9, b: 93.8, s: "workflow",    f: [0.02, 1.06], o: [0.58, 1.16] },
    { a: 93.3, b: 96.6, s: "approvals",   f: [0.04, 1.18], o: [0.26, 1.08] },
    { a: 96.1, b: 98.6, s: "letter",      f: [0.74, 1.14], o: [0.86, 1.22] },
    { a: 98.1, b: 102.8, s: "campaigns",  f: [0.02, 1.06], o: [0.40, 1.16] },
    { a: 102.3, b: 107.3, s: "gate",      f: [0.06, 1.22], o: [0.34, 1.08] },
    { a: 106.8, b: 115.4, s: "reports",   f: [0.02, 1.00], o: [0.34, 1.04] },
  ];
  SHOTS.forEach((s, i) => { s.layer = i % 2; });

  /* ضربهٔ «تأیید» روی خودِ دکمه */
  const tap = add(sc, "div", "tapring");
  tap.style.cssText += ";width:190px;height:190px";
  const TAP_ANCHOR = { px: 0.70, py: 0.185 };
  let shotBox = null;

  /* چهار نشانِ کانالِ ابلاغ — بدون لوگوی برند، فقط نام */
  const chans = add(sc, "div"); chans.id = "chans"; chans.style.top = "1440px";
  ["پیامک", "بله", "تلگرام", "ایتا"].forEach(x => add(chans, "div", null, x));
  const chanKids = [...chans.children];

  /* خطِ زمانِ پیگیری: تحویل شد ← باز شد ← پاسخ داد */
  const tl = add(sc, "div");
  tl.style.cssText = "position:absolute;z-index:710;left:70px;right:70px;top:1430px;opacity:0;will-change:opacity,transform";
  tl.innerHTML = `<div style="position:relative;height:12px;border-radius:6px;background:rgba(255,255,255,.12)">
      <div id="tlfill" style="position:absolute;right:0;top:0;height:12px;border-radius:6px;width:0;background:linear-gradient(270deg,#5FC0E0,#2E8BC0)"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:18px;font-size:30px;font-weight:800;color:#A9C1D1">
      <span id="tl3">پاسخ داد</span><span id="tl2">باز شد</span><span id="tl1">تحویل شد</span>
    </div>`;
  const tlfill = tl.querySelector("#tlfill");
  const tlm = [tl.querySelector("#tl1"), tl.querySelector("#tl2"), tl.querySelector("#tl3")];

  /* کارتِ پیامک: لینک و کد در یک پیام */
  const smsCard = add(sc, "div"); smsCard.id = "smsCard"; smsCard.style.top = "1410px";
  smsCard.innerHTML = `<div class="from">میلینگ پرس</div>
    <p>نامه شماره ۱۴۰۴/۲۳۱ برای جنابعالی صادر شد.<br>
    لینک: mp.ir/l/FmMX3d — کد دسترسی: <b>۴۹۲۸۷۱</b></p>`;

  sc.__r = t => {
    const o = Math.min(S(t, 57.6, 59.0), 1 - S(t, 115.2, 115.8));
    ph.style.opacity = o.toFixed(3);
    ph.style.transform = `scale(${lp(0.97, 1, eo(S(t, 57.6, 59.6))).toFixed(3)})`;

    const used = [0, 0];
    shotBox = null;
    for (const s of SHOTS) {
      const vis = Math.min(S(t, s.a, s.a + 0.55), 1 - S(t, s.b - 0.55, s.b));
      if (vis <= 0.002) continue;
      const im = imgs[s.layer];
      const src = "shots9/" + s.s + ".png";
      if (!im.src.endsWith(src)) im.src = src;
      const p = eio(S(t, s.a, s.b));
      const z = lp(s.f[1], s.o[1], p);
      const natH = im.naturalWidth ? (PH.w - 22) * im.naturalHeight / im.naturalWidth : VIS;
      const range = Math.max(0, natH * z - VIS);
      const ty = -range * lp(s.f[0], s.o[0], p) / z;
      im.style.transformOrigin = "50% 0";
      im.style.transform = `scale(${z.toFixed(4)}) translateY(${ty.toFixed(1)}px)`;
      im.style.opacity = vis.toFixed(3);
      if (s.s === "approvals") shotBox = { z, ty, natH };
      used[s.layer] = 1;
    }
    imgs.forEach((im, i) => { if (!used[i]) im.style.opacity = 0; });

    /* SCENE 11 — نشان‌های کانال */
    const co = Math.min(S(t, 87.2, 87.9), 1 - S(t, 89.8, 90.4));
    chans.style.opacity = co.toFixed(3);
    chans.style.display = co <= 0.002 ? "none" : "flex";
    chanKids.forEach((k, i) => {
      const at = 87.4 + i * 0.36;
      const p = ob(S(t, at, at + 0.5));
      k.style.transform = `scale(${lp(0.72, 1, p).toFixed(3)})`;
      k.style.opacity = S(t, at, at + 0.28).toFixed(3);
      k.classList.toggle("on", t >= at + 0.42);
    });

    /* SCENE 12 — ضربهٔ تأیید */
    const tp = S(t, 94.6, 95.5);
    tap.style.opacity = (tp > 0 && tp < 1 ? 1 - tp : 0).toFixed(3);
    if (shotBox) {
      const cx = PH.x + PH.w / 2 + (TAP_ANCHOR.px * (PH.w - 22) - (PH.w - 22) / 2) * shotBox.z;
      const cy = PH.y + 11 + TOPBAR + (TAP_ANCHOR.py * shotBox.natH + shotBox.ty) * shotBox.z;
      tap.style.left = px(cx - 95); tap.style.top = px(cy - 95);
    }
    tap.style.transform = `scale(${lp(0.3, 1.3, tp).toFixed(3)})`;

    /* SCENE 13 — خطِ زمانِ پیگیری */
    const to_ = Math.min(S(t, 99.0, 99.7), 1 - S(t, 102.0, 102.6));
    tl.style.opacity = to_.toFixed(3);
    tl.style.transform = `translateY(${((1 - eo(S(t, 99.0, 100.0))) * 26).toFixed(1)}px)`;
    const AT = [99.6, 100.5, 101.4];
    tlfill.style.width = (eio(S(t, 99.6, 101.8)) * 100).toFixed(1) + "%";
    tlm.forEach((m, i) => {
      const on = S(t, AT[i], AT[i] + 0.3);
      m.style.color = on > 0.5 ? "#DCEBF5" : "#64798A";
    });

    /* SCENE 13 — کارتِ پیامک */
    const so = Math.min(S(t, 103.6, 104.3), 1 - S(t, 106.4, 107.0));
    smsCard.style.opacity = so.toFixed(3);
    smsCard.style.transform = `translateY(${((1 - eo(S(t, 103.6, 104.6))) * 36).toFixed(1)}px)`;
  };
}

/* =========================================================================
   SCENE 15 — Transformation: کاغذ در برابر دیجیتال (۱:۱۵–۱:۲۲)
   ========================================================================= */
{
  const sc = scene(115.2, 122.2, 0.5, 0.5);
  const ROWS = [["۱", "چاپ"], ["۲", "امضا"], ["۳", "مهر"], ["۴", "دبیرخانه"], ["۵", "ارسال"]];
  const rowsHtml = ROWS.map(r => `<div class="row"><span class="dot">${r[0]}</span><span class="lbl">${r[1]}</span></div>`).join("");
  const paper = add(sc, "div", "half paper", rowsHtml);
  paper.style.top = "520px";
  const pl = add(sc, "div", null, "کاغذ");
  pl.style.cssText = "position:absolute;left:62px;right:62px;top:450px;font-size:32px;font-weight:800;color:#9AA7B2;text-align:center;opacity:0";
  const DIG = [["۱", "نوشتن"], ["۲", "تأیید"], ["۳", "ابلاغ"], ["۴", "پیگیری"], ["۵", "گزارش"]];
  const digital = add(sc, "div", "half digital",
    DIG.map(r => `<div class="row"><span class="dot">${r[0]}</span><span class="lbl">${r[1]}</span></div>`).join(""));
  digital.style.top = "1080px";
  const dl = add(sc, "div", null, "دیجیتال");
  dl.style.cssText = "position:absolute;left:62px;right:62px;top:1010px;font-size:32px;font-weight:800;color:#9FD6EC;text-align:center;opacity:0";
  const wipe = add(sc, "div"); wipe.id = "wipe";
  sc.__r = t => {
    const pin = eo(S(t, 115.4, 116.3));
    const dim = S(t, 118.4, 119.6);
    paper.style.opacity = (pin * (1 - 0.68 * dim)).toFixed(3);
    paper.style.transform = `translateY(${((1 - pin) * -26).toFixed(1)}px) scale(${lp(1, 0.97, dim).toFixed(3)})`;
    pl.style.opacity = (pin * (1 - 0.68 * dim)).toFixed(3);
    const din = eo(S(t, 116.4, 117.4));
    digital.style.opacity = (din * (1 + 0.0 * dim)).toFixed(3);
    digital.style.transform = `translateY(${((1 - din) * 34).toFixed(1)}px) scale(${lp(1, 1.03, dim).toFixed(3)})`;
    dl.style.opacity = din.toFixed(3);
    const wp = S(t, 118.2, 119.8);
    wipe.style.opacity = (wp > 0 && wp < 1 ? 1 : 0).toFixed(3);
    wipe.style.top = px(lp(450, 1540, eio(wp)));
  };
}

/* =========================================================================
   SCENE 16 — Final CTA (۱:۲۲–۲:۱۲ در تایم‌لاین کامل، اینجا ۱:۲۲–۲:۱۲)
   ========================================================================= */
{
  const sc = scene(121.8, 132.0, 0.6, 1.2);
  const L = ["کمتر کاغذ.", "کمتر انتظار.", "کمتر پیگیری."];
  const lines = L.map((x, i) => {
    const n = add(sc, "div", "ctaline", x);
    n.style.top = px(520 + i * 110);
    n.__at = 122.4 + i * 0.55; return n;
  });
  const big = add(sc, "div", null, "کنترلِ بیشتر."); big.id = "ctaBig";
  big.style.top = "620px";
  const lg = add(sc, "div", "logo9");
  lg.style.top = "900px";
  lg.innerHTML = `<div class="mk">${MARK}</div><b>میلینگ پرس</b><i>MAILING PRESS</i>`;
  const tag = add(sc, "div", null, "مکاتبات سازمانی، دیجیتال و قابل‌پیگیری.");
  tag.style.cssText = "position:absolute;left:56px;right:56px;top:1420px;text-align:center;font-size:40px;font-weight:700;color:#9FC3D8;opacity:0";
  const url = add(sc, "div", null, "mailing-system-chi.vercel.app");
  url.style.cssText = "position:absolute;left:0;right:0;top:1560px;text-align:center;font-size:34px;font-weight:700;color:#E3C06B;direction:ltr;opacity:0";

  sc.__r = t => {
    const out = S(t, 124.6, 125.4);
    lines.forEach(n => {
      const p = eo(S(t, n.__at, n.__at + 0.6));
      n.style.opacity = (p * (1 - out)).toFixed(3);
      n.style.transform = `translateY(${((1 - p) * 22).toFixed(1)}px)`;
    });
    const bp = S(t, 125.4, 126.2);
    big.style.opacity = (bp * (1 - S(t, 127.4, 128.2))).toFixed(3);
    big.style.transform = `scale(${lp(0.88, 1, ob(bp)).toFixed(3)})`;
    const lgp = eo(S(t, 128.0, 129.4));
    lg.style.opacity = lgp.toFixed(3);
    lg.querySelector(".mk").style.transform = `scale(${lp(0.8, 1, ob(S(t, 128.0, 129.6))).toFixed(3)})`;
    [[tag, 129.6], [url, 130.3]].forEach(([n, at]) => {
      const q = S(t, at, at + 0.7);
      n.style.opacity = q.toFixed(3);
      n.style.transform = `translateY(${((1 - eo(q)) * 20).toFixed(1)}px)`;
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
  const onUi = Math.min(S(t, 58.0, 59.4), 1 - S(t, 115.0, 115.8));
  scrim.style.opacity = Math.max(onUi, 0.5).toFixed(3);
  scrimTop.style.opacity = Math.max(onUi, 0.45).toFixed(3);
  /* یک ثانیه سکوت و سیاهی پیش از Reveal (PART 9) */
  const black = Math.max(
    Math.min(S(t, 54.0, 54.6), 1 - S(t, 55.2, 55.8)),
    1 - S(t, 0, 0.6),
    S(t, 130.8, 132)
  );
  curtain.style.opacity = black.toFixed(4);
};
window.FILM = { DUR, FPS };
window.SEEK(0);
