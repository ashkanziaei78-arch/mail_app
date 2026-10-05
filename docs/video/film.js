/* ===========================================================================
   میلینگ پرس — فیلم معرفی. ۱۹۲۰×۱۰۸۰، ۳۰fps، ۱۷۰ ثانیه.
   هر حالت تصویر تابعِ محضِ زمان است: window.SEEK(t) هر فریم را بازتولید می‌کند.
   =========================================================================== */
const DUR = 170, FPS = 30;
const layers = document.getElementById("layers");
const capBox = document.getElementById("cap");
const capBig = capBox.querySelector(".big");
const capSub = capBox.querySelector(".sub");
const curtain = document.getElementById("curtain");
const sheetWrap = document.getElementById("sheetWrap");

/* ---------- ریاضیات زمان ---------- */
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const S = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)));
const eo = p => 1 - Math.pow(1 - p, 3);
const ei = p => p * p * p;
const eio = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const ob = p => { const c = 1.70158 + 1; return 1 + c * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2); };
const lp = (a, b, p) => a + (b - a) * p;
const px = v => v.toFixed(2) + "px";

const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
const add = (parent, tag, cls, html) => { const n = el(tag, cls, html); parent.appendChild(n); return n; };

/** یک لایه صحنه که فقط در بازه خودش دیده می‌شود. */
function scene(a, b, fi = 0.5, fo = 0.5) {
  const n = add(layers, "div", "scene");
  n.dataset.a = a; n.dataset.b = b;
  n.__vis = t => {
    if (t < a - 0.02 || t > b + 0.02) { n.style.display = "none"; n.style.opacity = 0; return 0; }
    n.style.display = "block";
    const o = Math.min(S(t, a, a + fi), 1 - S(t, b - fo, b));
    n.style.opacity = o.toFixed(4);
    return o;
  };
  return n;
}

/* ---------- زیرنویس مرکزی ---------- */
const CAPS = [
  { a: 1.4,  b: 4.8,   y: 830, big: "یک نامه رسمی." },
  { a: 5.9,  b: 15.6,  y: 92,  big: "شماره‌ها کجایند؟", sub: "گوشی · اتوماسیون · کاغذ · اکسل", subAt: 8.6 },
  { a: 17.4, b: 25.6,  y: 908, big: "کار مهم است. ابزارش نباید زجرآور باشد." },
  { a: 28.4, b: 35.6,  y: 92,  big: "چه کسی این نامه را دید؟", sub: "چه کسی فرستادش جلوتر؟", subAt: 31.2 },
  { a: 38.2, b: 45.6,  y: 92,  big: "محرمانه، یعنی فقط گیرنده.", sub: "نه هر کسی که پاکت دستش افتاد.", subAt: 41.0 },
  { a: 47.6, b: 54.6,  y: 92,  big: "نامه آماده است. فقط امضا مانده." },
  { a: 70.2, b: 78.4,  y: 905, big: "یک دفترچه. برای کل سازمان." },
  { a: 82.0, b: 90.4,  y: 905, big: "فارسی. شمسی. تمیز." },
  { a: 94.0, b: 104.4, y: 905, big: "هر اقدام ثبت می‌شود. هر دسترسی تعیین‌شده است." },
  { a: 107.5, b: 116.4, y: 905, big: "لینک شخصی، کد دسترسی، و ثبت اینکه چه کسی بازش کرد." },
  { a: 119.6, b: 123.8, y: 905, big: "کارتابل، روی گوشیِ خودِ تأییدکننده." },
  { a: 133.0, b: 140.4, y: 905, big: "و بالاخره معلوم است نامه به کجا رسید." },
  { a: 144.0, b: 155.2, y: 905, big: "روی گوشی هم همین است.", sub: "بدون نصب، بدون کلاس آموزشی.", subAt: 147.5 },
];
function renderCaps(t) {
  let active = null;
  for (const c of CAPS) if (t >= c.a - 0.6 && t <= c.b + 0.6) active = c;
  if (!active) { capBox.style.opacity = 0; return; }
  const o = Math.min(S(t, active.a, active.a + 0.55), 1 - S(t, active.b, active.b + 0.45));
  capBox.style.opacity = o.toFixed(4);
  capBox.style.top = px(active.y);
  const rise = (1 - eo(S(t, active.a, active.a + 0.8))) * 26;
  capBox.style.transform = `translateY(${rise.toFixed(2)}px)`;
  if (capBig.textContent !== active.big) capBig.textContent = active.big;
  const subTxt = active.sub || "";
  if (capSub.textContent !== subTxt) capSub.textContent = subTxt;
  capSub.style.opacity = active.sub ? S(t, active.subAt ?? active.a, (active.subAt ?? active.a) + 0.6).toFixed(3) : 0;
}

/* ---------- نشان مشکل / پاسخ ---------- */
const CHIPS = [
  { a: 5.4,  b: 15.8, tx: "مشکل ۱", side: "r" },
  { a: 16.6, b: 25.8, tx: "مشکل ۲", side: "r" },
  { a: 27.0, b: 35.8, tx: "مشکل ۳", side: "r" },
  { a: 37.0, b: 45.8, tx: "مشکل ۴", side: "r" },
  { a: 46.6, b: 54.8, tx: "مشکل ۵", side: "r" },
  { a: 67.4, b: 78.8, tx: "پاسخِ مشکل ۱ — پراکندگی مخاطبان", side: "r" },
  { a: 79.6, b: 90.8, tx: "پاسخِ مشکل ۲ — ظاهر و زبان", side: "r" },
  { a: 91.6, b: 104.8, tx: "پاسخِ مشکل ۳ — امنیت", side: "r" },
  { a: 105.6, b: 116.8, tx: "پاسخِ مشکل ۴ — محرمانگی", side: "r" },
  { a: 117.6, b: 130.8, tx: "پاسخِ مشکل ۵ — صف امضا", side: "r" },
];
const chipNode = add(layers, "div", "prob-chip");
chipNode.style.right = "72px"; chipNode.style.top = "62px";
function renderChip(t) {
  let a = null;
  for (const c of CHIPS) if (t >= c.a - 0.5 && t <= c.b + 0.5) a = c;
  if (!a) { chipNode.style.opacity = 0; return; }
  chipNode.style.opacity = Math.min(S(t, a.a, a.a + 0.4), 1 - S(t, a.b, a.b + 0.35)).toFixed(3);
  if (chipNode.textContent !== a.tx) chipNode.textContent = a.tx;
}

/* =========================================================================
   بازیگر ثابت فیلم: یک برگه نامه
   ========================================================================= */
const sheet = add(sheetWrap, "div", "sheet");
sheet.innerHTML = `
  <div class="hd">
    <div class="mk">م</div>
    <div class="tx"><b>پارک علم و فناوری</b><i>دبیرخانه مرکزی</i></div>
  </div>
  <div class="meta"><span>شماره: ۱۴۰۴/۲۳۱</span><span>تاریخ: ۱۴۰۴/۰۷/۱۳</span></div>
  <div class="to">جناب آقای مهندس —</div>
  <div class="ln" style="width:100%"></div><div class="ln" style="width:92%"></div>
  <div class="ln" style="width:97%"></div><div class="ln" style="width:70%"></div>
  <div class="ln" style="width:88%"></div><div class="ln" style="width:48%"></div>
  <div class="sig"><div class="nm">مدیرکل</div><div class="cv"></div></div>`;
const stamp = add(sheet, "div", "stamp", "محرمانه");

function renderSheet(t) {
  let x = 0, y = 0, s = 0.62, ry = 0, rz = 0, o = 0;
  if (t < 5.2) {                                   /* گشایش */
    o = S(t, 0.5, 1.8) * (1 - S(t, 5.0, 5.2) * 0);
    s = lp(0.58, 0.64, eio(S(t, 0, 5)));
    ry = lp(-17, 9, S(t, 0, 5));
    y = lp(16, -8, eio(S(t, 0, 5)));
  } else if (t < 16.5) {                           /* مشکل ۱ — جزیره‌ها */
    o = 1;
    const p = eo(S(t, 5.2, 6.4));
    s = lp(0.64, 0.56, p); y = lp(-8, 18, p);
    ry = lp(9, 0, p) + Math.sin((t - 5) * 0.9) * 2.2;
    o = 1 - S(t, 16.0, 16.5);
  } else if (t < 26.6) { o = 0; }                  /* مشکل ۲ — نرم‌افزار قدیمی */
  else if (t < 36.6) {                             /* مشکل ۳ — نسخه‌ها */
    o = S(t, 26.6, 27.3);
    s = lp(0.40, 0.46, eo(S(t, 26.6, 28.4)));
    y = lp(40, 10, eo(S(t, 26.6, 28.4)));
    rz = lp(-2.5, 0, eo(S(t, 26.6, 28.4)));
  } else if (t < 46.4) {                           /* مشکل ۴ — محرمانه */
    s = 0.46; y = 10; o = 1;
    y = lp(10, -34, eio(S(t, 36.6, 38.4)));
    const into = eio(S(t, 41.4, 43.2));            /* رفتن داخل پاکت */
    y = lp(y, 186, into);
    s = lp(0.46, 0.33, into);
    o = 1 - S(t, 42.9, 43.4);
  } else if (t < 55.0) {                           /* مشکل ۵ — صف امضا */
    const DESKS = [1570, 1240, 910, 580, 250];
    const HOPS = [[46.7, 47.4], [48.9, 49.6], [50.9, 51.6], [52.9, 53.6]];
    let idx = 0, hopP = 0;
    for (let i = 0; i < HOPS.length; i++) if (t >= HOPS[i][0]) { idx = i; hopP = S(t, HOPS[i][0], HOPS[i][1]); }
    const from = idx === 0 ? 1920 : DESKS[idx - 1];
    const to = DESKS[idx];
    x = lp(from, to, eio(hopP)) - 960;
    const arc = Math.sin(Math.PI * hopP) * 150;
    y = 100 - arc;
    s = 0.34; rz = lp(6, -3, hopP) * (1 - hopP * 0.4);
    o = S(t, 46.4, 46.8) * (1 - S(t, 54.4, 54.9));
  } else if (t < 55.2) { o = 0; }
  else if (t < 66) {                               /* پرده دوم — برآمدن */
    const p = eio(S(t, 56.6, 60.0));
    o = S(t, 56.6, 57.3) * (1 - S(t, 59.8, 61.0));
    s = lp(0.26, 0.60, p); y = lp(620, -50, p); ry = lp(26, 0, p); rz = lp(7, 0, p);
  } else { o = 0; }

  sheetWrap.style.opacity = o.toFixed(4);
  sheetWrap.style.display = o <= 0.002 ? "none" : "block";
  sheetWrap.style.transform =
    `perspective(2200px) translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(${s.toFixed(4)})`;

  /* مهر محرمانه */
  const sp = S(t, 37.0, 37.5);
  const settle = eo(S(t, 37.0, 37.9));
  stamp.style.opacity = (sp * (1 - S(t, 42.9, 43.3))).toFixed(3);
  stamp.style.transform = `rotate(${lp(-26, -13, settle).toFixed(2)}deg) scale(${lp(2.9, 1, settle).toFixed(3)})`;
}

/* =========================================================================
   صحنه ۰ — گشایش (۰–۵)
   ========================================================================= */
{
  const sc = scene(0, 5.3, 0.9, 0.5);
  const halo = add(sc, "div");
  halo.style.cssText = "position:absolute;left:50%;top:50%;width:1300px;height:1300px;margin:-650px 0 0 -650px;border-radius:50%;background:radial-gradient(circle,rgba(95,192,224,.10),rgba(95,192,224,0) 62%)";
  sc.__r = t => { halo.style.opacity = (0.4 + 0.6 * S(t, 0, 3)).toFixed(3); };
}

/* =========================================================================
   صحنه ۱ — مشکل ۱: مخاطب پخش است (۵–۱۶)
   ========================================================================= */
{
  const sc = scene(5.2, 16.5, 0.45, 0.55);
  const ICON = {
    phone: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5.5h4"/></svg>',
    auto:  '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></svg>',
    paper: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>',
    excel: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16M15 4v16"/></svg>',
  };
  const DEF = [
    { k: "phone", t: "گوشی همکار", l: 212,  y: 150, dx: -430, rows: [["حاج‌آقا رئیس", "۰۹۱۳ ۴۵۲ …"], ["آقای مهندس", "۰۹۱۲ ۷۷۱ …"], ["؟ (بی‌نام)", "۰۹۳۵ ۱۰۹ …"]] },
    { k: "auto",  t: "اتوماسیون اداری", l: 1376, y: 150, dx: 430, rows: [["اداره کل", "۳۱ مخاطب"], ["واحد مالی", "۱۲ مخاطب"], ["به‌روزرسانی", "۱۴۰۲"]] },
    { k: "paper", t: "زونکن کاغذی", l: 212, y: 622, dx: -430, rows: [["نامه‌های ۱۴۰۳", "۲۱۰ برگ"], ["شماره تماس", "دست‌نویس"], ["آخرین بازبینی", "—"]] },
    { k: "excel", t: "فایل اکسل", l: 1376, y: 622, dx: 430, rows: [["مخاطبین_نهایی۳", "۳۰۰ ردیف"], ["تکراری", "۴۷ ردیف"], ["شماره ناقص", "۱۹ ردیف"]] },
  ];
  const cards = DEF.map((d, i) => {
    const n = add(sc, "div", "island");
    n.style.left = px(d.l); n.style.top = px(d.y);
    n.innerHTML = `<div class="ih">${ICON[d.k]}<b>${d.t}</b></div>` +
      d.rows.map(r => `<div class="row"><span>${r[0]}</span><span dir="ltr">${r[1]}</span></div>`).join("");
    n.__d = d; n.__at = 5.7 + i * 0.72;
    return n;
  });
  /* خط‌های نقطه‌چین قطع‌شده بین جزیره‌ها */
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("id", "linksSvg"); svg.setAttribute("viewBox", "0 0 1920 1080");
  sc.appendChild(svg);
  const P = [[377, 268], [1541, 268], [377, 740], [1541, 740]];
  const EDGES = [[0, 1], [2, 3], [0, 2], [1, 3]];
  const segs = [], crosses = [];
  EDGES.forEach((e, i) => {
    const [x1, y1] = P[e[0]], [x2, y2] = P[e[1]];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    [[lp(x1, mx, 0.30), lp(y1, my, 0.30), lp(x1, mx, 0.80), lp(y1, my, 0.80)],
     [lp(x2, mx, 0.30), lp(y2, my, 0.30), lp(x2, mx, 0.80), lp(y2, my, 0.80)]].forEach(c => {
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", c[0]); ln.setAttribute("y1", c[1]);
      ln.setAttribute("x2", c[2]); ln.setAttribute("y2", c[3]);
      ln.setAttribute("stroke", "rgba(95,192,224,.55)");
      ln.setAttribute("stroke-width", "2.5");
      ln.setAttribute("stroke-dasharray", "7 12");
      ln.setAttribute("stroke-linecap", "round");
      svg.appendChild(ln);
      segs.push({ ln, x0: c[0], y0: c[1], x1: c[2], y1: c[3], at: 7.4 + i * 0.5 });
    });
    const g = document.createElementNS(NS, "g");
    const inner = document.createElementNS(NS, "g");
    inner.innerHTML = `<circle r="22" fill="rgba(179,48,63,.18)" stroke="rgba(255,120,120,.75)" stroke-width="2"/>
      <path d="M-8,-8 L8,8 M8,-8 L-8,8" stroke="#ff8f8f" stroke-width="3.2" stroke-linecap="round"/>`;
    g.setAttribute("transform", `translate(${mx},${my})`);
    g.appendChild(inner);
    svg.appendChild(g);
    crosses.push({ g: inner, at: 10.6 + i * 0.26 });
  });
  sc.__r = t => {
    cards.forEach(n => {
      const p = eo(S(t, n.__at, n.__at + 0.95));
      const drift = Math.sin((t - n.__at) * 0.55 + n.__at) * 7;
      n.style.opacity = p.toFixed(3);
      n.style.transform = `translate(${(n.__d.dx * (1 - p)).toFixed(1)}px,${(drift * p).toFixed(1)}px) scale(${lp(0.9, 1, p).toFixed(3)})`;
    });
    segs.forEach(s => {
      const p = eo(S(t, s.at, s.at + 0.85));
      s.ln.setAttribute("x2", lp(s.x0, s.x1, p).toFixed(1));
      s.ln.setAttribute("y2", lp(s.y0, s.y1, p).toFixed(1));
      s.ln.style.opacity = (p * 0.85).toFixed(3);
    });
    crosses.forEach(c => {
      const p = S(t, c.at, c.at + 0.4);
      c.g.style.opacity = p.toFixed(3);
      c.g.setAttribute("transform", `scale(${lp(1.8, 1, ob(p)).toFixed(3)})`);
    });
  };
}

/* =========================================================================
   صحنه ۲ — مشکل ۲: ابزار زمخت (۱۶–۲۶)
   ========================================================================= */
{
  const sc = scene(16.4, 26.2, 0.5, 0.6);
  const win = add(sc, "div"); win.id = "legacy";
  const ROWS = [];
  const NM = ["Ahmadi R.", "Karimi M.", "Sadeghi H.", "Tehrani A.", "Mousavi K.", "Rezaei S.",
              "Jafari N.", "Hosseini B.", "Najafi F.", "Zare M.", "Eskandari P.", "Gholami V.",
              "Soltani D.", "Abbasi L.", "Kazemi T.", "Farahani Z."];
  for (let i = 0; i < 16; i++) {
    ROWS.push(`<tr><td class="ltr">${1400 + i}</td><td>${NM[i]}</td><td class="ltr">0912${(9990000 + i * 7)}</td>
      <td class="ltr">2026-0${(i % 9) + 1}-1${i % 9}</td><td class="ltr">DRAFT</td><td>شماره ${2300 + i * 3}</td>
      <td class="ltr">${(i % 3) ? "N/A" : "OK"}</td><td>اداره کل</td></tr>`);
  }
  win.innerHTML = `
    <div class="tb">سامانه مکاتبات اداری — نسخه ۳٫۲٫۱۴ (Build 2011)</div>
    <div class="mb"><span>فایل</span><span>ویرایش</span><span>نمایش</span><span>ابزار</span><span>پنجره</span><span>راهنما</span></div>
    <div class="tools">${"<i></i>".repeat(14)}</div>
    <div style="padding:8px 10px"><table>
      <tr><th>کد</th><th>نام</th><th>تلفن</th><th>Date</th><th>Status</th><th>شماره نامه</th><th>Flag</th><th>واحد</th></tr>
      ${ROWS.join("")}
    </table></div>`;
  const cur = add(sc, "div"); cur.id = "cursor";
  cur.innerHTML = `<div class="miss"></div>
    <svg viewBox="0 0 24 24"><path d="M5 3l14 8-6 1.6L10.5 19z" fill="#fff" stroke="#111" stroke-width="1.2"/></svg>`;
  const PATH = [
    { t: 17.6, x: 820, y: 470 }, { t: 18.9, x: 1374, y: 255, click: 1 },
    { t: 20.5, x: 1080, y: 640 }, { t: 21.6, x: 1306, y: 255, click: 1 },
    { t: 23.4, x: 740, y: 360 }, { t: 24.8, x: 600, y: 300 },
  ];
  const miss = cur.querySelector(".miss");
  sc.__r = t => {
    win.style.transform = `scale(${lp(1.03, 1.0, eo(S(t, 16.4, 18.0))).toFixed(4)})`;
    let i = 0;
    while (i < PATH.length - 1 && t > PATH[i + 1].t) i++;
    const A = PATH[i], B = PATH[Math.min(i + 1, PATH.length - 1)];
    const p = B === A ? 1 : eio(S(t, A.t, B.t));
    cur.style.opacity = S(t, 17.0, 17.4).toFixed(3);
    cur.style.transform = `translate(${lp(A.x, B.x, p).toFixed(1)}px,${lp(A.y, B.y, p).toFixed(1)}px)`;
    let mo = 0, ms = 1;
    for (const k of PATH) if (k.click) { const q = S(t, k.t, k.t + 0.7); if (q > 0 && q < 1) { mo = 1 - q; ms = lp(0.5, 1.5, q); } }
    miss.style.opacity = mo.toFixed(3);
    miss.style.transform = `scale(${ms.toFixed(3)})`;
  };
}

/* =========================================================================
   صحنه ۳ — مشکل ۳: نسخه‌های بی‌شمار (۲۶–۳۶)
   ========================================================================= */
{
  const sc = scene(26.5, 36.4, 0.5, 0.55);
  const POS = [
    { x: -640, y: -170, r: -9,  w: "واحد مالی",  at: 27.8 },
    { x:  640, y: -190, r:  8,  w: "روابط عمومی", at: 28.4 },
    { x: -720, y:  180, r:  6,  w: "؟",           at: 29.3, q: 1 },
    { x:  700, y:  190, r: -7,  w: "پیمانکار",    at: 30.0, fwd: 1 },
    { x: -380, y:  300, r: 11,  w: "بایگانی",     at: 30.8 },
    { x:  370, y:  320, r: -12, w: "؟",           at: 31.5, q: 1 },
  ];
  const nodes = POS.map(d => {
    const n = add(sc, "div", "copy");
    n.innerHTML = `<div class="cl" style="width:100%"></div><div class="cl" style="width:84%"></div>
      <div class="cl" style="width:92%"></div><div class="cl" style="width:62%"></div>
      <div class="cl" style="width:88%"></div><div class="cl" style="width:40%"></div>
      <div class="who" style="${d.q ? "color:#B3303F;font-size:22px" : ""}">${d.w}</div>
      ${d.fwd ? '<div class="tagf">فوروارد ۳ بار</div>' : ""}`;
    n.style.left = px(960 - 105); n.style.top = px(540 - 146);
    n.__d = d; return n;
  });
  sc.__r = t => {
    nodes.forEach(n => {
      const d = n.__d, p = eo(S(t, d.at, d.at + 1.0));
      n.style.opacity = (p * 0.96).toFixed(3);
      n.style.transform = `translate(${(d.x * p).toFixed(1)}px,${(d.y * p).toFixed(1)}px) rotate(${(d.r * p).toFixed(2)}deg) scale(${lp(0.75, 1, p).toFixed(3)})`;
    });
  };
}

/* =========================================================================
   صحنه ۴ — مشکل ۴: نامه محرمانه (۳۶–۴۶)
   ========================================================================= */
{
  const sc = scene(36.5, 46.3, 0.5, 0.6);
  const beam = add(sc, "div"); beam.id = "beam";
  const env = add(sc, "div"); env.id = "env";
  env.innerHTML = `<div class="peek">
      <div class="pl" style="width:40%;margin-top:64px"></div><div class="pl" style="width:100%"></div>
      <div class="pl" style="width:88%"></div><div class="pl" style="width:95%"></div>
      <div class="pl" style="width:64%"></div>
      <div class="pstamp">محرمانه</div></div>
    <div class="body"></div><div class="flap"></div>`;
  const flap = env.querySelector(".flap");
  const desk = add(sc, "div", "desk");
  desk.style.cssText = "left:50%;top:50%;width:1240px;height:14px;margin:286px 0 0 -620px;opacity:0";
  sc.__r = t => {
    const up = eio(S(t, 40.4, 42.0));
    env.style.opacity = S(t, 40.4, 41.0).toFixed(3);
    env.style.transform = `translateY(${lp(780, 150, up).toFixed(1)}px) scale(${lp(0.8, 1, up).toFixed(3)})`;
    flap.style.transform = `rotateX(${lp(-6, -158, eio(S(t, 41.2, 42.6))).toFixed(1)}deg)`;
    desk.style.opacity = S(t, 42.2, 43.2).toFixed(3);
    beam.style.opacity = (S(t, 43.6, 44.8) * 1.6 * (1 - S(t, 45.8, 46.3))).toFixed(3);
    beam.style.transform = `rotate(${lp(18, 11, eo(S(t, 43.6, 45.4))).toFixed(2)}deg)`;
  };
}

/* =========================================================================
   صحنه ۵ — مشکل ۵: صف امضا (۴۶–۵۵)
   ========================================================================= */
{
  const sc = scene(46.3, 55.0, 0.45, 0.5);
  const q = add(sc, "div"); q.id = "queue";
  const LBL = ["کارشناس", "رئیس اداره", "معاون", "مدیرکل", "دبیرخانه"];
  const XS = [1570, 1240, 910, 580, 250];
  const slabs = XS.map((x, i) => {
    const n = add(q, "div", "slab");
    n.style.left = px(x - 125);
    n.innerHTML = `<b>${LBL[i]}</b><span class="stk"></span>`;
    n.__at = 46.5 + i * 0.22; n.__stk = n.querySelector(".stk"); return n;
  });
  const cal = add(sc, "div"); cal.id = "cal";
  cal.innerHTML = `<div class="dw">شنبه</div><div class="dd">۱۴۰۴/۰۷/۱۳</div>
    <div class="cnt">۰</div><div class="cl">روز در انتظار امضا <i style="font-style:normal;opacity:.75">(نمونه)</i></div>`;
  const dw = cal.querySelector(".dw"), dd = cal.querySelector(".dd"), cnt = cal.querySelector(".cnt");
  const DAYS = [["شنبه", "۱۴۰۴/۰۷/۱۳", "۰"], ["یکشنبه", "۱۴۰۴/۰۷/۱۴", "۱"], ["دوشنبه", "۱۴۰۴/۰۷/۱۵", "۲"],
                ["سه‌شنبه", "۱۴۰۴/۰۷/۱۶", "۲"], ["چهارشنبه", "۱۴۰۴/۰۷/۱۷", "۳"]];
  const FLIP = [46.6, 48.8, 50.8, 52.8, 54.0];
  sc.__r = t => {
    slabs.forEach(n => {
      const p = eo(S(t, n.__at, n.__at + 0.7));
      n.style.opacity = p.toFixed(3);
      n.style.transform = `translateY(${((1 - p) * 40).toFixed(1)}px)`;
    });
    const PASSED = [47.4, 49.6, 51.6, 53.6, 99];
    slabs.forEach((n, i) => { n.__stk.style.opacity = (S(t, PASSED[i], PASSED[i] + 0.6) * 0.9).toFixed(3); });
    cal.style.opacity = S(t, 47.0, 47.8).toFixed(3);
    let k = 0; for (let i = 0; i < FLIP.length; i++) if (t >= FLIP[i]) k = i;
    const fp = S(t, FLIP[k], FLIP[k] + 0.35);
    if (dw.textContent !== DAYS[k][0]) { dw.textContent = DAYS[k][0]; dd.textContent = DAYS[k][1]; cnt.textContent = DAYS[k][2]; }
    dw.style.transform = `translateY(${((1 - eo(fp)) * -18).toFixed(1)}px)`;
    dw.style.opacity = (0.25 + 0.75 * eo(fp)).toFixed(3);
    cnt.style.transform = `scale(${lp(1.25, 1, ob(fp)).toFixed(3)})`;
  };
}

/* =========================================================================
   پرده دوم — معرفی (۵۶٫۵–۶۶)
   ========================================================================= */
const MARK = `<svg viewBox="0 0 48 48" fill="none">
  <rect x="5" y="11" width="38" height="26" rx="5" stroke="#9FD6EC" stroke-width="2.6"/>
  <path d="M6.5 14.5 24 27 41.5 14.5" stroke="#9FD6EC" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="13" y="39.5" width="22" height="3.6" rx="1.8" fill="#E3C06B"/></svg>`;
{
  const sc = scene(56.5, 66.2, 0.4, 0.7);
  const glow = add(sc, "div");
  glow.style.cssText = "position:absolute;left:50%;top:50%;width:1500px;height:1100px;margin:-550px 0 0 -750px;border-radius:50%;background:radial-gradient(circle,rgba(95,192,224,.16),rgba(95,192,224,0) 60%)";
  const lg = add(sc, "div", "logo");
  lg.style.cssText = "position:absolute;left:0;right:0;top:400px";
  lg.innerHTML = `<div class="mark">${MARK}</div><div class="wm"><b>میلینگ پرس</b><i>MAILING PRESS</i></div>`;
  const tag = add(sc, "div");
  tag.style.cssText = "position:absolute;left:0;right:0;top:648px;text-align:center;font-size:38px;color:#BFD4E2;font-weight:500";
  tag.textContent = "نامه‌نگاری سازمانی — از نوشتن تا رسیدن";
  const mark = lg.querySelector(".mark"), wm = lg.querySelector(".wm");
  sc.__r = t => {
    glow.style.opacity = (S(t, 57.0, 60.0) * 0.9).toFixed(3);
    const p = eo(S(t, 60.0, 61.2));
    lg.style.opacity = p.toFixed(3);
    mark.style.transform = `scale(${lp(0.55, 1, ob(S(t, 60.0, 61.4))).toFixed(3)}) rotate(${lp(-14, 0, eo(S(t, 60.0, 61.4))).toFixed(2)}deg)`;
    wm.style.transform = `translateX(${((1 - eo(S(t, 60.4, 61.8))) * -70).toFixed(1)}px)`;
    wm.style.opacity = S(t, 60.4, 61.4).toFixed(3);
    const tp = S(t, 62.2, 63.1);
    tag.style.opacity = tp.toFixed(3);
    tag.style.transform = `translateY(${((1 - eo(tp)) * 18).toFixed(1)}px)`;
  };
}

/* =========================================================================
   پرده سوم — پاسخ، مشکل‌به‌مشکل (۶۶–۱۴۱)
   یک پنجره ثابت است و محتوایش عوض می‌شود: همان «شیء حامل» بین صحنه‌ها.
   ========================================================================= */
{
  const sc = scene(66.4, 141.4, 0.6, 0.6);

  /* --- جزیره‌های پرده اول که به هم می‌رسند --- */
  const MERGE = [
    { x: -690, y: -330, t: "گوشی همکار" }, { x: 690, y: -330, t: "اتوماسیون" },
    { x: -690, y: 300, t: "زونکن کاغذی" }, { x: 690, y: 300, t: "فایل اکسل" },
  ];
  const mini = MERGE.map(d => {
    const n = add(sc, "div", "island");
    n.style.cssText = "left:50%;top:50%;width:300px;margin:-60px 0 0 -150px;z-index:620";
    n.innerHTML = `<div class="ih"><b style="font-size:27px">${d.t}</b></div>`;
    n.__d = d; return n;
  });

  /* --- پنجره مرورگر --- */
  const fr = add(sc, "div", "frame");
  fr.innerHTML = `<div class="bar"><u></u><u></u><u></u><s>mailing-press.ir</s></div><div class="vp"></div>`;
  const vp = fr.querySelector(".vp");
  const imgs = [add(vp, "img"), add(vp, "img")];

  const RECT = [
    { t: 67.0, r: [344, 150, 1232] }, { t: 104.6, r: [344, 150, 1232] },
    { t: 105.9, r: [96, 196, 936] }, { t: 116.9, r: [96, 196, 936] },
    { t: 118.1, r: [344, 150, 1232] }, { t: 123.9, r: [344, 150, 1232] },
    { t: 125.1, r: [96, 196, 936] }, { t: 130.9, r: [96, 196, 936] },
    { t: 132.1, r: [344, 150, 1232] }, { t: 141.4, r: [344, 150, 1232] },
  ];
  const SHOTS = [
    { a: 67.2, b: 74.6, s: "contacts",  f: [1.00, .92, .22], o: [1.24, .86, .40] },
    { a: 74.0, b: 80.3, s: "campaign",  f: [1.10, .88, .22], o: [1.30, .80, .34] },
    { a: 79.7, b: 85.2, s: "dashboard", f: [1.16, .90, .24], o: [1.00, .92, .34] },
    { a: 84.6, b: 88.0, s: "dashboard-dark", f: [1.02, .92, .30], o: [1.14, .88, .24] },
    { a: 87.4, b: 92.3, s: "campaigns", f: [1.20, .88, .20], o: [1.04, .92, .32] },
    { a: 91.7, b: 97.3, s: "access",    f: [1.04, .90, .24], o: [1.28, .84, .38] },
    { a: 96.7, b: 100.9, s: "users",    f: [1.24, .86, .26], o: [1.04, .92, .34] },
    { a: 100.3, b: 106.3, s: "sms",     f: [1.04, .90, .22], o: [1.26, .86, .30] },
    { a: 105.7, b: 111.6, s: "gate",    f: [1.70, .50, .50], o: [2.15, .50, .52] },
    { a: 111.0, b: 118.3, s: "letter",  f: [1.45, .50, .20], o: [1.08, .50, .40] },
    { a: 117.7, b: 124.4, s: "workflow", f: [1.02, .90, .26], o: [1.26, .80, .46] },
    { a: 123.8, b: 132.3, s: "approvals", f: [1.22, .86, .26], o: [1.02, .92, .32] },
    { a: 131.7, b: 137.0, s: "reports",  f: [1.02, .90, .22], o: [1.24, .84, .32] },
    { a: 136.4, b: 141.4, s: "reports2", f: [1.20, .86, .30], o: [1.02, .92, .38] },
  ];
  SHOTS.forEach((s, i) => { s.layer = i % 2; });

  /* --- برچسب‌ها و حلقه‌های تأکید --- */
  const CO = [
    { a: 69.4, b: 74.0, i: 0, tx: "ورود گروهی از اکسل" },
    { a: 70.8, b: 74.0, i: 1, tx: "#اتاق_بازرگانی — ۴۳ مخاطب", gold: 1 },
    { a: 75.6, b: 79.0, i: 0, tx: "یک نامه، برای هرکس با نام خودش" },
    { a: 81.4, b: 84.4, i: 0, tx: "راست‌به‌چپ، تاریخ شمسی" },
    { a: 85.6, b: 87.4, i: 0, tx: "حالت تیره" },
    { a: 88.4, b: 90.6, i: 0, tx: "ارسالی · دریافتی · در گردش" },
    { a: 93.2, b: 96.6, i: 0, tx: "دسترسی هر کاربر به هر منو" },
    { a: 97.8, b: 100.2, i: 0, tx: "ورود دومرحله‌ای و قفل حساب" },
    { a: 101.6, b: 104.6, i: 0, tx: "کلید درگاه رمزنگاری‌شده ذخیره می‌شود", gold: 1 },
    { a: 112.6, b: 116.6, i: 2, tx: "هر بازکردن ثبت می‌شود: چه کسی، چه زمانی" },
    { a: 119.4, b: 123.6, i: 0, tx: "پیش‌نویس ← رئیس اداره ← معاون ← مدیرکل ← ارسال" },
    { a: 133.4, b: 136.2, i: 0, tx: "تقویم شمسی، فیلترهای آماده" },
    { a: 137.6, b: 140.6, i: 1, tx: "ارسال موفق ← باز شد ← پاسخ داد", gold: 1 },
  ];
  const CO_Y = [250, 332, 884];
  const coNodes = CO.map(c => {
    const n = add(sc, "div", "callout" + (c.gold ? " gold" : ""));
    n.textContent = c.tx; n.__c = c;
    n.style.left = "120px"; n.style.top = px(CO_Y[c.i]); return n;
  });

  /* --- گوشی: پیامک محرمانه --- */
  const phS = add(sc, "div", "ph"); phS.id = "smsPhone";
  phS.style.cssText = "left:1256px;top:168px;width:392px;height:680px";
  phS.innerHTML = `<div class="notch"></div>
    <div class="vp" style="background:linear-gradient(180deg,#F4F7F9,#E7EDF1);padding-top:64px"></div>`;
  const smsVp = phS.querySelector(".vp");
  add(smsVp, "div", null, "پیام‌ها").style.cssText = "text-align:center;font-size:21px;font-weight:800;color:#44586A;margin-bottom:14px";
  const bub = add(smsVp, "div", "smsbub");
  bub.style.cssText += ";top:120px";
  bub.innerHTML = `<b>میلینگ پرس</b><br>نامه شماره ۱۴۰۴/۲۳۱ برای جنابعالی صادر شد.<br>
    لینک: mp.ir/l/FmMX3d<br>کد دسترسی: <b>۴۹۲۸۷۱</b>`;
  const bub2 = add(smsVp, "div", "smsbub");
  bub2.style.cssText += ";top:330px;background:#DDE4E9;color:#5B7384;font-size:17px";
  bub2.innerHTML = "۱۰۰۰۸۶۶۳<br>پیام پیشین — ۱۴۰۴/۰۶/۳۰";
  const bubNote = add(smsVp, "div");
  bubNote.style.cssText = "position:absolute;right:18px;left:18px;top:470px;text-align:center;font-size:19px;color:#44586A;font-weight:800";
  bubNote.textContent = "یک پیامک — لینک و کد با هم";

  /* --- گوشی: کارتابل تأیید --- */
  const phU = add(sc, "div", "ph");
  phU.style.cssText = "left:1256px;top:168px;width:392px;height:680px";
  phU.innerHTML = `<div class="notch"></div><div class="vp"><img src="shots/m-approvals.png" alt=""></div>`;
  const tap = add(phU, "div");
  tap.style.cssText = "position:absolute;z-index:6;left:50%;top:430px;width:150px;height:150px;margin-left:-75px;border-radius:50%;border:4px solid #8FE3C4;opacity:0";

  /* --- نشان کانال‌های ابلاغ --- */
  const chan = add(sc, "div", "chan");
  chan.style.cssText = "left:96px;width:936px;top:866px;justify-content:center";
  ["پیامک", "بله", "تلگرام", "ایتا"].forEach(x => add(chan, "div", null, x));
  const chanKids = [...chan.children];

  /* --- تقویم: ۳ روز ← ۳ دقیقه --- */
  const cal2 = add(sc, "div");
  cal2.style.cssText = "position:absolute;z-index:700;left:150px;top:360px;width:440px;border-radius:20px;padding:26px 30px;text-align:center;background:rgba(7,20,32,.9);border:1px solid rgba(201,162,39,.45);opacity:0";
  cal2.innerHTML = `<div style="font-size:26px;color:#9FB6C6">از آماده‌شدن تا امضا</div>
    <div style="margin-top:12px"><span id="old3" style="font-size:52px;font-weight:900;color:#8FA9BA;position:relative">۳ روز</span></div>
    <div id="new3" style="margin-top:8px;font-size:62px;font-weight:900;color:#E3C06B">۳ دقیقه</div>
    <div style="font-size:20px;color:#8FA9BA;margin-top:6px">(نمونه)</div>`;
  const old3 = cal2.querySelector("#old3"), new3 = cal2.querySelector("#new3");
  const strike = add(old3, "span");
  strike.style.cssText = "position:absolute;left:0;top:52%;height:4px;background:#B3303F;width:0;border-radius:2px";

  function rectAt(t) {
    let i = 0; while (i < RECT.length - 1 && t > RECT[i + 1].t) i++;
    const A = RECT[i], B = RECT[Math.min(i + 1, RECT.length - 1)];
    const p = B === A ? 1 : eio(S(t, A.t, B.t));
    return [lp(A.r[0], B.r[0], p), lp(A.r[1], B.r[1], p), lp(A.r[2], B.r[2], p)];
  }

  sc.__r = t => {
    /* جزیره‌ها به مرکز می‌آیند و در پنجره حل می‌شوند */
    const mp = eio(S(t, 66.6, 68.6));
    mini.forEach(n => {
      const d = n.__d;
      n.style.opacity = ((1 - S(t, 67.6, 68.8)) * S(t, 66.5, 66.9)).toFixed(3);
      n.style.transform = `translate(${(d.x * (1 - mp)).toFixed(1)}px,${(d.y * (1 - mp)).toFixed(1)}px) scale(${lp(1, 0.35, mp).toFixed(3)})`;
    });

    const [L, T, Wd] = rectAt(t);
    fr.style.left = px(L); fr.style.top = px(T); fr.style.width = px(Wd);
    vp.style.height = px(Wd / 1.6);
    const fo = Math.min(S(t, 67.0, 68.2), 1 - S(t, 141.0, 141.4));
    fr.style.opacity = fo.toFixed(3);
    fr.style.transform = `scale(${lp(0.93, 1, eo(S(t, 66.8, 68.4))).toFixed(4)})`;

    const used = [0, 0];
    for (const s of SHOTS) {
      const o = Math.min(S(t, s.a, s.a + 0.6), 1 - S(t, s.b - 0.6, s.b));
      if (o <= 0.002) continue;
      const im = imgs[s.layer];
      const src = "shots/" + s.s + ".png";
      if (!im.src.endsWith(src)) im.src = src;
      const p = eio(S(t, s.a, s.b));
      const z = lp(s.f[0], s.o[0], p), cx = lp(s.f[1], s.o[1], p), cy = lp(s.f[2], s.o[2], p);
      im.style.transformOrigin = `${(cx * 100).toFixed(2)}% ${(cy * 100).toFixed(2)}%`;
      im.style.transform = `scale(${z.toFixed(4)})`;
      im.style.opacity = o.toFixed(3);
      used[s.layer] = 1;
    }
    imgs.forEach((im, i) => { if (!used[i]) im.style.opacity = 0; });

    coNodes.forEach(n => {
      const c = n.__c;
      const o = Math.min(S(t, c.a, c.a + 0.45), 1 - S(t, c.b, c.b + 0.4));
      n.style.opacity = o.toFixed(3);
      n.style.transform = `translateY(${((1 - eo(S(t, c.a, c.a + 0.7))) * 20).toFixed(1)}px)`;
    });

    /* گوشی پیامک (مشکل ۴) */
    const so = Math.min(S(t, 105.9, 106.8), 1 - S(t, 115.8, 116.6));
    phS.style.opacity = so.toFixed(3);
    phS.style.display = so <= 0.002 ? "none" : "block";
    phS.style.transform = `translateY(${((1 - eo(S(t, 105.9, 107.2))) * 70).toFixed(1)}px)`;
    const bp = eo(S(t, 107.0, 107.8));
    bub.style.opacity = bp.toFixed(3);
    bub.style.transform = `translateY(${((1 - bp) * 26).toFixed(1)}px) scale(${lp(0.94, 1, bp).toFixed(3)})`;
    bub2.style.opacity = (S(t, 107.6, 108.3) * 0.85).toFixed(3);
    bubNote.style.opacity = S(t, 108.8, 109.5).toFixed(3);

    /* گوشی کارتابل (مشکل ۵) */
    const uo = Math.min(S(t, 125.1, 126.0), 1 - S(t, 130.2, 130.9));
    phU.style.opacity = uo.toFixed(3);
    phU.style.display = uo <= 0.002 ? "none" : "block";
    phU.style.transform = `translateY(${((1 - eo(S(t, 125.1, 126.4))) * 70).toFixed(1)}px)`;
    const tp = S(t, 126.9, 127.7);
    tap.style.opacity = (tp > 0 && tp < 1 ? 1 - tp : 0).toFixed(3);
    tap.style.transform = `scale(${lp(0.3, 1.25, tp).toFixed(3)})`;

    /* کانال‌ها */
    const co = Math.min(S(t, 125.3, 126.0), 1 - S(t, 128.2, 128.8));
    chan.style.opacity = co.toFixed(3);
    chan.style.display = co <= 0.002 ? "none" : "flex";
    chanKids.forEach((k, i) => {
      const at = 125.5 + i * 0.38;
      const p = ob(S(t, at, at + 0.55));
      k.style.transform = `scale(${lp(0.75, 1, p).toFixed(3)})`;
      k.style.opacity = S(t, at, at + 0.3).toFixed(3);
      k.classList.toggle("on", t >= at + 0.45);
    });

    /* تقویم ۳ روز ← ۳ دقیقه */
    const ko = Math.min(S(t, 128.6, 129.3), 1 - S(t, 130.3, 130.9));
    cal2.style.opacity = ko.toFixed(3);
    strike.style.width = (eo(S(t, 129.2, 129.7)) * 100).toFixed(1) + "%";
    old3.style.opacity = (1 - 0.45 * S(t, 129.6, 130.0)).toFixed(3);
    const np = ob(S(t, 129.7, 130.3));
    new3.style.opacity = S(t, 129.7, 130.0).toFixed(3);
    new3.style.transform = `scale(${lp(0.7, 1, np).toFixed(3)})`;
  };

  /* --- کارت ثبت وقایع (امنیت) --- */
  const audit = add(sc, "div");
  audit.style.cssText = "position:absolute;z-index:705;left:120px;top:470px;width:620px;border-radius:18px;padding:22px 26px;background:rgba(5,16,26,.93);border:1px solid rgba(95,192,224,.3);box-shadow:0 40px 90px rgba(0,0,0,.6);opacity:0";
  audit.innerHTML = `<div style="font-size:24px;font-weight:800;color:#DCEBF5;margin-bottom:14px">ثبت وقایع</div>` +
    [["۰۹:۱۲", "رضا احمدی", "نامه ۱۴۰۴/۲۳۱ را ساخت"],
     ["۰۹:۴۰", "رئیس اداره", "نامه را تأیید کرد"],
     ["۱۰:۰۳", "معاون", "نامه را تأیید کرد"],
     ["۱۰:۱۱", "سامانه", "۴۵ پیامک به درگاه تحویل شد"]]
      .map(r => `<div style="display:flex;gap:18px;font-size:21px;color:#A9C1D1;padding:9px 0;border-top:1px dashed rgba(255,255,255,.12)">
        <span style="color:#E3C06B;font-variant-numeric:tabular-nums">${r[0]}</span>
        <span style="font-weight:700;color:#DCEBF5;min-width:140px">${r[1]}</span><span>${r[2]}</span></div>`).join("");
  const baseR = sc.__r;
  sc.__r = t => {
    baseR(t);
    const o = Math.min(S(t, 98.4, 99.2), 1 - S(t, 103.4, 104.2));
    audit.style.opacity = o.toFixed(3);
    audit.style.transform = `translateY(${((1 - eo(S(t, 98.4, 99.6))) * 26).toFixed(1)}px)`;
  };
}

/* =========================================================================
   پرده چهارم — همیشه در دسترس (۱۴۱–۱۵۶)
   ========================================================================= */
{
  const sc = scene(141.0, 156.0, 0.7, 0.7);
  const ph = add(sc, "div", "ph");
  ph.style.cssText = "left:1190px;top:116px;width:392px;height:848px";
  ph.innerHTML = `<div class="notch"></div><div class="vp"><img src="shots/m-dashboard.png" alt=""></div>`;
  const sheetUp = add(ph, "div");
  sheetUp.style.cssText = "position:absolute;z-index:7;left:0;right:0;bottom:0;padding:26px 24px 34px;border-radius:26px 26px 0 0;background:#F6F8FA;color:#0B1A26;box-shadow:0 -20px 50px rgba(0,0,0,.35)";
  sheetUp.innerHTML = `<div style="font-size:20px;color:#5B7384">مرورگر</div>
    <div style="margin-top:14px;display:flex;align-items:center;gap:14px">
      <div style="width:58px;height:58px;border-radius:14px;background:linear-gradient(160deg,#0F5C7A,#0A2233);display:grid;place-items:center">
        <svg viewBox="0 0 48 48" width="34" height="34" fill="none">
          <rect x="5" y="11" width="38" height="26" rx="5" stroke="#9FD6EC" stroke-width="3"/>
          <path d="M6.5 14.5 24 27 41.5 14.5" stroke="#9FD6EC" stroke-width="3" stroke-linecap="round"/></svg></div>
      <div><b style="display:block;font-size:23px">میلینگ پرس</b>
        <i style="font-style:normal;font-size:17px;color:#5B7384">mailing-press.ir</i></div></div>
    <div style="margin-top:20px;padding:14px;border-radius:14px;background:#0F5C7A;color:#fff;text-align:center;font-size:21px;font-weight:800">افزودن به صفحه اصلی</div>`;

  const grid = add(sc, "div");
  grid.style.cssText = "position:absolute;left:250px;top:300px;width:690px;border-radius:34px;padding:34px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.13);opacity:0";
  grid.innerHTML = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:28px">` +
    Array.from({ length: 8 }, (_, i) => `<div style="height:116px;border-radius:26px;background:rgba(255,255,255,.07)"></div>`).join("") + `</div>`;
  const slot = grid.querySelectorAll("div > div")[5];
  const fly = add(sc, "div");
  fly.style.cssText = "position:absolute;z-index:720;width:116px;height:116px;border-radius:26px;background:linear-gradient(160deg,#0F5C7A,#0A2233);border:1px solid rgba(255,255,255,.16);display:grid;place-items:center;opacity:0;box-shadow:0 30px 60px rgba(0,0,0,.55)";
  fly.innerHTML = `<svg viewBox="0 0 48 48" width="62" height="62" fill="none">
    <rect x="5" y="11" width="38" height="26" rx="5" stroke="#9FD6EC" stroke-width="2.8"/>
    <path d="M6.5 14.5 24 27 41.5 14.5" stroke="#9FD6EC" stroke-width="2.8" stroke-linecap="round"/>
    <rect x="13" y="39.5" width="22" height="3.6" rx="1.8" fill="#E3C06B"/></svg>`;
  const lbl = add(sc, "div");
  lbl.style.cssText = "position:absolute;z-index:721;font-size:20px;font-weight:700;color:#DCEBF5;opacity:0;text-align:center;width:160px";

  sc.__r = t => {
    ph.style.opacity = Math.min(S(t, 141.2, 142.2), 1 - S(t, 155.2, 156.0)).toFixed(3);
    ph.style.transform = `translateY(${((1 - eo(S(t, 141.2, 143.0))) * 90).toFixed(1)}px) scale(${lp(0.95, 1, eo(S(t, 141.2, 143.2))).toFixed(3)})`;
    const sp = eio(S(t, 145.0, 146.0));
    sheetUp.style.transform = `translateY(${((1 - sp) * 360).toFixed(1)}px)`;
    sheetUp.style.opacity = (S(t, 145.0, 145.4) * (1 - S(t, 148.6, 149.2))).toFixed(3);
    grid.style.opacity = Math.min(S(t, 148.0, 149.0), 1 - S(t, 155.0, 155.8)).toFixed(3);
    const fp = eio(S(t, 148.8, 150.6));
    const x0 = 1190 + 24, y0 = 116 + 848 - 180;
    const r = slot.getBoundingClientRect();
    const x1 = r.left, y1 = r.top;
    const o = Math.min(S(t, 148.8, 149.1), 1 - S(t, 155.0, 155.8));
    fly.style.opacity = o.toFixed(3);
    fly.style.left = px(lp(x0, x1 || 600, fp)); fly.style.top = px(lp(y0, y1 || 560, fp));
    fly.style.transform = `scale(${lp(0.5, 1, fp).toFixed(3)}) rotate(${lp(-10, 0, fp).toFixed(2)}deg)`;
    lbl.style.opacity = Math.min(S(t, 150.8, 151.4), 1 - S(t, 155.0, 155.8)).toFixed(3);
    lbl.style.left = px((x1 || 600) - 22); lbl.style.top = px((y1 || 560) + 128);
    lbl.textContent = "میلینگ پرس";
  };
}

/* =========================================================================
   پرده پنجم — دعوت (۱۵۶–۱۷۰)
   ========================================================================= */
{
  const sc = scene(155.8, 170.0, 0.8, 1.2);
  const lg = add(sc, "div", "logo");
  lg.style.cssText = "position:absolute;left:0;right:0;top:330px";
  lg.innerHTML = `<div class="mark">${MARK}</div><div class="wm"><b>میلینگ پرس</b><i>MAILING PRESS</i></div>`;
  const l1 = add(sc, "div", null, "نامه‌ای که گم نمی‌شود.");
  l1.style.cssText = "position:absolute;left:0;right:0;top:560px;text-align:center;font-size:44px;font-weight:700;color:#DCEBF5";
  const l2 = add(sc, "div", null, "دموی بیست‌دقیقه‌ای، با سربرگ و گردش تأیید خودِ سازمان شما");
  l2.style.cssText = "position:absolute;left:0;right:0;top:648px;text-align:center;font-size:31px;color:#9FB6C6";
  const ch = add(sc, "div", "chan");
  ch.style.cssText = "left:0;right:0;top:736px;justify-content:center";
  ["پیامک", "بله", "تلگرام", "ایتا"].forEach(x => add(ch, "div", null, x).style.cssText = "font-size:25px;padding:10px 20px");
  const url = add(sc, "div", null, "mailing-system-chi.vercel.app");
  url.style.cssText = "position:absolute;left:0;right:0;top:880px;text-align:center;font-size:30px;font-weight:700;color:#E3C06B;direction:ltr;letter-spacing:.5px";
  sc.__r = t => {
    const p = eo(S(t, 156.2, 157.6));
    lg.style.opacity = p.toFixed(3);
    lg.querySelector(".mark").style.transform = `scale(${lp(0.8, 1, ob(S(t, 156.2, 157.8))).toFixed(3)})`;
    [[l1, 158.0], [l2, 158.9], [ch, 159.8], [url, 160.8]].forEach(([n, at]) => {
      const q = S(t, at, at + 0.8);
      n.style.opacity = q.toFixed(3);
      n.style.transform = `translateY(${((1 - eo(q)) * 20).toFixed(1)}px)`;
    });
  };
}

/* =========================================================================
   موتور: SEEK(t) همه‌چیز را از نو می‌سازد
   ========================================================================= */
/* پرده تیره پای قاب تا زیرنویس روی رابط خوانا بماند */
const scrim = add(layers, "div");
scrim.style.cssText = "position:absolute;z-index:799;left:0;right:0;bottom:0;height:330px;pointer-events:none;background:linear-gradient(180deg,rgba(4,14,22,0),rgba(4,14,22,.72) 42%,rgba(4,14,22,.93) 100%)";

const SCENES = [...layers.querySelectorAll(".scene")];
window.SEEK = function (t) {
  for (const s of SCENES) { const o = s.__vis(t); if (o > 0 && s.__r) s.__r(t); }
  renderSheet(t);
  renderCaps(t);
  renderChip(t);
  scrim.style.opacity = Math.min(S(t, 67.6, 69.0), 1 - S(t, 155.0, 156.0)).toFixed(3);
  /* یک ثانیه سیاهی بین پرده اول و معرفی + فید باز/بسته فیلم */
  const black = Math.max(
    Math.min(S(t, 54.9, 55.5), 1 - S(t, 56.1, 56.8)),
    1 - S(t, 0, 0.7),
    S(t, 168.6, 170)
  );
  curtain.style.opacity = black.toFixed(4);
};
window.FILM = { DUR, FPS };
window.SEEK(0);
