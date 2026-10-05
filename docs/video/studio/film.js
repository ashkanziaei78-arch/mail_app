/* ===========================================================================
   میلینگ پِرِس — طراحیِ تازه، از صفر.
   زبانِ بصری: کاغذِ تحریریه. تیترها هم‌تراز با شبکه (هرگز وسط‌چین)، متن با
   wipe باز می‌شود (هرگز fade)، گذرها با لغزشِ ورق ساخته می‌شوند.
   قراردادِ رندر: هر فریم تابعِ محضِ window.seek(t) است. نویزِ Seed‌دار.
   =========================================================================== */
const DUR = 126, FPS = 30;
const layers = document.getElementById("layers");
const paper = document.getElementById("paper");
const ink = document.getElementById("ink");

const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const S = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)));
const snap = p => (p >= 1 ? 1 : 1 - Math.pow(2, -11 * p));          /* فرودِ قاطع */
const eio = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const ob = p => 1 + 2.4 * Math.pow(p - 1, 3) + 1.4 * Math.pow(p - 1, 2);
const lp = (a, b, p) => a + (b - a) * p;
const px = v => v.toFixed(2) + "px";
const add = (p_, tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  p_.appendChild(n); return n;
};
/* mulberry32 — تنها منبعِ تصادف، تا رندر قطعی بماند */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260401);

/** متن با wipe از راست باز می‌شود، نه با fade. */
function wipe(el, p, rise = 14) {
  const q = snap(cl(p));
  el.style.clipPath = `inset(0 0 0 ${((1 - q) * 100).toFixed(2)}%)`;
  el.style.transform = `translateY(${((1 - q) * rise).toFixed(2)}px)`;
  el.style.visibility = p <= 0 ? "hidden" : "visible";
}
/** خط‌کش از راست کشیده می‌شود. */
function drawRule(el, p, w) {
  const q = snap(cl(p));
  el.style.width = px(w * q);
  el.style.visibility = p <= 0 ? "hidden" : "visible";
}
function scene(a, b) {
  const n = add(layers, "div", "scene");
  n.__a = a; n.__b = b;
  n.__vis = t => {
    const on = t >= a - 0.02 && t <= b + 0.02;
    n.style.display = on ? "block" : "none";
    return on ? 1 : 0;
  };
  return n;
}

/* =========================================================================
   ۱ — قلاب (۰–۱۱٫۵)
   ========================================================================= */
{
  const sc = scene(0, 11.6);
  const Q = [
    { tx: "شمارهٔ مخاطب کجاست؟", y: 430, at: 0.7 },
    { tx: "نامه دیده شد؟",        y: 800, at: 3.1 },
    { tx: "امضایش چه شد؟",        y: 1170, at: 5.3 },
  ];
  const mark = add(sc, "div", "rule acc");
  mark.style.cssText += ";top:300px;height:10px";
  const qs = Q.map(q => {
    const n = add(sc, "div", "d1", q.tx);
    n.style.cssText += `;top:${q.y}px;font-size:112px`;
    const u = add(sc, "div", "rule acc");
    u.style.top = px(q.y + 140); u.style.height = "5px";
    return { n, u, q };
  });
  const r = add(sc, "div", "rule"); r.style.top = "1470px";
  const call = add(sc, "div", "body",
    "اگر این سه سؤال برایتان آشناست،<br>این ویدیو برای شماست.");
  call.style.top = "1530px";
  sc.__r = t => {
    drawRule(mark, S(t, 0.12, 0.45), 300);
    qs.forEach(({ n, u, q }) => {
      wipe(n, S(t, q.at, q.at + 0.55), 18);
      drawRule(u, S(t, q.at + 0.28, q.at + 0.82), 210);
    });
    drawRule(r, S(t, 7.3, 7.9), 936);
    wipe(call, S(t, 7.6, 8.3), 16);
  };
}

/* =========================================================================
   ۲ — چهار جا، یک سازمان (۱۱٫۵–۱۹٫۲)
   ========================================================================= */
{
  const sc = scene(11.5, 19.3);
  const idx = add(sc, "div", "idx", "<u></u><span>۰۱ — پراکندگیِ مخاطبان</span>");
  idx.style.top = "300px";
  const h = add(sc, "div", "d2", "چهار جا.<br>یک سازمان.");
  h.style.top = "370px";
  const SRC = [
    { b: "گوشیِ همکار", i: "سه شماره، یکی بی‌نام", x: 86, y: 760, w: 470, r: -2.2, at: 12.2, dx: -300 },
    { b: "اتوماسیونِ اداری", i: "آخرین به‌روزرسانی ۱۴۰۲", x: 520, y: 980, w: 480, r: 1.6, at: 12.8, dx: 300 },
    { b: "زونکنِ کاغذی", i: "۲۱۰ برگ، دست‌نویس", x: 110, y: 1230, w: 455, r: 1.1, at: 13.4, dx: -300 },
    { b: "فایلِ اکسل", i: "مخاطبین_نهایی۳.xlsx", x: 495, y: 1455, w: 495, r: -1.4, at: 14.0, dx: 300, tag: "۴۷ ردیفِ تکراری" },
  ];
  const cards = SRC.map(d => {
    const n = add(sc, "div", "src",
      `${d.tag ? `<span class="tag">${d.tag}</span>` : ""}<b>${d.b}</b><i>${d.i}</i>`);
    n.style.left = px(d.x); n.style.top = px(d.y); n.style.width = px(d.w);
    n.__d = d; return n;
  });
  /* خطِ قرمزِ قطع‌شده بینِ کارت‌ها */
  const brk = [
    { x: 300, y: 905, w: 180, at: 15.2 },
    { x: 560, y: 1150, w: 150, at: 15.6 },
    { x: 300, y: 1385, w: 190, at: 16.0 },
  ].map(d => {
    const n = add(sc, "div", "strike");
    n.style.cssText += `;left:${d.x}px;top:${d.y}px;height:5px;opacity:.85`;
    n.__d = d; return n;
  });
  sc.__r = t => {
    wipe(idx, S(t, 11.7, 12.2), 0);
    wipe(h, S(t, 11.9, 12.5), 20);
    cards.forEach(n => {
      const d = n.__d, p = snap(S(t, d.at, d.at + 0.7));
      n.style.transform = `translateX(${(d.dx * (1 - p)).toFixed(1)}px) rotate(${d.r}deg)`;
      n.style.clipPath = `inset(0 0 ${((1 - p) * 100).toFixed(1)}% 0)`;
      n.style.visibility = p <= 0 ? "hidden" : "visible";
    });
    brk.forEach(n => {
      const d = n.__d, p = snap(S(t, d.at, d.at + 0.4));
      n.style.width = px(d.w * p);
      n.style.visibility = p <= 0 ? "hidden" : "visible";
    });
  };
}

/* =========================================================================
   ۳ — کانال‌ها (۱۹٫۲–۲۴)
   ========================================================================= */
{
  const sc = scene(19.2, 24.1);
  const idx = add(sc, "div", "idx", "<u></u><span>۰۲ — کانال‌های پراکنده</span>");
  idx.style.top = "300px";
  const h = add(sc, "div", "d2", "نامه می‌رود.<br>پاسخ، جای دیگر.");
  h.style.top = "370px";
  const SL = [
    { x: 120, y: 790, w: 600, at: 19.8, dx: 420 },
    { x: 300, y: 1070, w: 640, at: 20.4, dx: 460 },
    { x: 150, y: 1350, w: 580, at: 21.0, dx: 400 },
  ];
  const slips = SL.map(d => {
    const n = add(sc, "div", "src",
      `<b style="font-size:28px;color:#4A5862">پیام</b>
       <i style="margin-top:14px">▬▬▬▬▬▬▬▬ ▬▬▬▬▬<br>▬▬▬▬▬▬ ▬▬▬</i>`);
    n.style.left = px(d.x); n.style.top = px(d.y); n.style.width = px(d.w);
    const q = add(n, "div", null, "؟");
    q.style.cssText = "position:absolute;left:28px;top:50%;margin-top:-34px;font-size:68px;font-weight:900;color:var(--accent)";
    n.__d = d; n.__q = q; return n;
  });
  sc.__r = t => {
    wipe(idx, S(t, 19.4, 19.9), 0);
    wipe(h, S(t, 19.5, 20.1), 20);
    slips.forEach(n => {
      const d = n.__d, p = snap(S(t, d.at, d.at + 0.65));
      n.style.transform = `translateX(${(d.dx * (1 - p)).toFixed(1)}px)`;
      n.style.visibility = p <= 0 ? "hidden" : "visible";
      const qp = ob(S(t, d.at + 0.8, d.at + 1.2));
      n.__q.style.opacity = S(t, d.at + 0.8, d.at + 1.0).toFixed(2);
      n.__q.style.transform = `scale(${lp(1.9, 1, qp).toFixed(2)})`;
    });
  };
}

/* =========================================================================
   ۴ — زنجیرهٔ کاغذی (۲۴–۳۳)
   ========================================================================= */
{
  const sc = scene(24, 33.1);
  const idx = add(sc, "div", "idx", "<u></u><span>۰۳ — زنجیرهٔ کاغذی</span>");
  idx.style.top = "300px";
  const h = add(sc, "div", "d2", "پنج ایستگاه.<br>و بعد، دوباره از اول.");
  h.style.top = "370px";
  const NAMES = ["چاپ", "امضا", "مهر", "دبیرخانه", "ارسال"];
  const AT = [25.0, 25.9, 26.8, 27.7, 28.6];
  const rows = NAMES.map((nm, i) => {
    const n = add(sc, "div", "step",
      `<span class="no">۰${i + 1}</span><b>${nm}</b><span class="mk">✓</span>`);
    n.style.top = px(720 + i * 112);
    n.__mk = n.querySelector(".mk"); n.__at = AT[i]; return n;
  });
  const ret = add(sc, "div"); ret.id = "ret";
  ret.style.top = "760px";
  const rh = add(sc, "div"); rh.id = "retHead";
  rh.style.cssText += ";left:60px;top:742px";
  const back = add(sc, "div", "body", "و بعد، همین مسیر، در جهتِ برگشت.");
  back.style.top = "1340px";
  sc.__r = t => {
    wipe(idx, S(t, 24.2, 24.7), 0);
    wipe(h, S(t, 24.3, 24.9), 20);
    rows.forEach(n => {
      wipe(n, S(t, n.__at - 0.5, n.__at + 0.1), 10);
      const mp = S(t, n.__at, n.__at + 0.3);
      n.__mk.style.opacity = mp.toFixed(2);
      n.__mk.style.transform = `scale(${lp(2.1, 1, ob(mp)).toFixed(2)}) rotate(${lp(-18, -7, ob(mp)).toFixed(1)}deg)`;
    });
    const rp = snap(S(t, 30.0, 31.0));
    ret.style.height = px(560 * rp);
    ret.style.visibility = rp <= 0 ? "hidden" : "visible";
    rh.style.opacity = S(t, 30.8, 31.1).toFixed(2);
    wipe(back, S(t, 31.2, 31.9), 14);
  };
}

/* =========================================================================
   ۵ — انتظار (۳۳–۳۷٫۶)
   ========================================================================= */
{
  const sc = scene(33, 38.5);
  const idx = add(sc, "div", "idx", "<u></u><span>۰۴ — انتظار</span>");
  idx.style.top = "300px";
  const h = add(sc, "div", "d1", "و بعد،<br>انتظار.");
  h.style.top = "420px";
  const day = add(sc, "div", "d3", "شنبه");
  day.style.top = "1000px";
  const r = add(sc, "div", "rule"); r.style.top = "1110px";
  const big = add(sc, "div", "d1", "۳ روز");
  big.style.cssText += ";top:1170px;font-size:208px;color:var(--accent)";
  const note = add(sc, "div", "body", "در انتظارِ امضا <span style='font-size:28px'>(نمونه)</span>");
  note.style.top = "1470px";
  const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه"];
  const FL = [33.4, 34.2, 35.0, 35.8, 36.5];
  const NUM = ["۰ روز", "۱ روز", "۲ روز", "۲ روز", "۳ روز"];
  sc.__r = t => {
    wipe(idx, S(t, 33.1, 33.6), 0);
    wipe(h, S(t, 33.2, 33.9), 22);
    let k = 0; for (let i = 0; i < FL.length; i++) if (t >= FL[i]) k = i;
    if (day.textContent !== DAYS[k]) { day.textContent = DAYS[k]; big.textContent = NUM[k]; }
    const fp = S(t, FL[k], FL[k] + 0.22);
    wipe(day, Math.max(0.001, fp), 10);
    big.style.transform = `scale(${lp(1.1, 1, ob(fp)).toFixed(3)})`;
    big.style.visibility = t >= 33.5 ? "visible" : "hidden";
    big.style.clipPath = "none";
    drawRule(r, S(t, 33.5, 34.1), 936);
    wipe(note, S(t, 33.9, 34.5), 12);
  };
}

/* =========================================================================
   ۶ — سؤال (۳۷٫۶–۴۴٫۲)  — رویِ زمینهٔ مرکّب
   ========================================================================= */
{
  const sc = scene(37.6, 45.0);
  sc.classList.add("onink");
  sc.style.background = "var(--ink)";
  const h = add(sc, "div", "d1", "چرا هنوز<br>برای این فرآیند،<br>کاغذ مصرف می‌کنیم؟");
  h.style.cssText += ";top:600px;font-size:118px";
  const r = add(sc, "div", "rule acc"); r.style.top = "1120px"; r.style.height = "6px";
  const sub = add(sc, "div", "d3", "و چقدر از وقتِ سازمان<br>صرفِ همین رفت‌وبرگشت می‌شود؟");
  sub.style.cssText += ";top:1240px;color:#9FAEB8;font-weight:600";
  sc.__r = t => {
    wipe(h, S(t, 38.3, 39.4), 26);
    drawRule(r, S(t, 39.6, 40.4), 420);
    wipe(sub, S(t, 40.8, 41.8), 18);
  };
}

/* =========================================================================
   ۷ — مُهر و نام (۴۴٫۲–۵۶)  — رویِ زمینهٔ مرکّب
   ========================================================================= */
{
  const sc = scene(44.2, 56.9);
  sc.classList.add("onink");
  sc.style.background = "var(--ink)";
  const pre = add(sc, "div", "d3", "از اولین کلیک،<br>تا آخرین امضا.");
  pre.style.top = "400px";
  const pr2 = add(sc, "div", "d2", "دیجیتال شود چه؟");
  pr2.style.cssText += ";top:620px";
  const prl = add(sc, "div", "rule acc"); prl.style.cssText += ";top:790px;height:6px";
  const seal = add(sc, "div", "seal", "<span>م پ</span>");
  seal.style.cssText += ";right:72px;top:700px";
  const ring = add(sc, "div", "sealRing");
  ring.style.cssText += ";right:72px;top:700px";
  const wm = add(sc, "div", "d1", "میلینگ پِرِس");
  wm.style.cssText += ";top:1140px;font-size:128px";
  const lat = add(sc, "div", "body", "MAILING PRESS");
  lat.style.cssText += ";top:1300px;direction:ltr;text-align:right;letter-spacing:10px;font-weight:700;color:var(--accent)";
  const tag = add(sc, "div", "body", "مکاتباتِ سازمانی — دیجیتال و قابلِ پیگیری.");
  tag.style.top = "1400px";
  const br = add(sc, "div", "rule acc"); br.style.cssText += ";top:1560px;height:5px";
  sc.__r = t => {
    wipe(pre, S(t, 44.6, 45.6), 20);
    wipe(pr2, S(t, 46.9, 47.8), 22);
    drawRule(prl, S(t, 48.3, 49.1), 480);
    const fade = (1 - S(t, 49.4, 50.0)).toFixed(2);
    pre.style.opacity = fade; pr2.style.opacity = fade; prl.style.opacity = fade;
    /* فشارِ مُهر: تند فرود می‌آید، یک ضربه، بعد حلقه پخش می‌شود */
    const sp = S(t, 50.1, 50.45);
    const settle = ob(S(t, 50.1, 50.9));
    seal.style.opacity = sp > 0 ? 1 : 0;
    seal.style.transform = `scale(${lp(3.4, 1, settle).toFixed(3)}) rotate(${lp(-16, -6, settle).toFixed(1)}deg)`;
    const rp = S(t, 50.42, 51.5);
    ring.style.opacity = (rp > 0 && rp < 1 ? (1 - rp) * 0.8 : 0).toFixed(3);
    ring.style.transform = `scale(${lp(1, 1.9, rp).toFixed(3)}) rotate(-6deg)`;
    wipe(wm, S(t, 50.7, 51.6), 22);
    wipe(lat, S(t, 51.3, 52.0), 14);
    wipe(tag, S(t, 52.4, 53.2), 14);
    drawRule(br, S(t, 53.0, 53.9), 560);
  };
}

/* =========================================================================
   ورقِ مرکّب: صحنه‌های ۶، ۷ و ۱۰ پشتِ خودشان زمینه دارند و مثلِ یک ورق
   از پایین بالا می‌آیند. بنابراین #ink دیگر لازم نیست.
   ========================================================================= */
ink.style.display = "none";

/** ورق را از پایین می‌راند بالا، و در زمانِ خروج از بالا بیرون می‌بَرَد. */
function sheet(el, t, inA, inB, outA, outB) {
  let y = 1920 * (1 - snap(S(t, inA, inB)));
  if (outA != null) y -= 1920 * snap(S(t, outA, outB));
  el.style.transform = `translateY(${y.toFixed(1)}px)`;
}

/* =========================================================================
   گوشی روی کاغذ — یک قابِ آیفون، چند نمای درونی
   ========================================================================= */
const PH = { w: 568, h: 1229, x: 256 };
const IMG_W = PH.w - 18, VP_H = PH.h - 18 - 76;

function makePhone(sc, shots) {
  const el = add(sc, "div", "ph");
  el.style.cssText += `;left:${PH.x}px;width:${PH.w}px;height:${PH.h}px`;
  const scr = add(el, "div", "screen");
  const vps = {};
  for (const [key, file] of Object.entries(shots)) {
    const vp = add(scr, "div", "vp");
    const im = add(vp, "img");
    im.src = `shots/${file}.png`;
    vp.__img = im;
    vp.style.display = "none";
    vps[key] = vp;
  }
  add(scr, "div", "status",
    `<span class="t">۹:۴۱</span><span class="ic"><i></i><i></i><i class="b"></i></span>`);
  add(el, "div", "island");
  return { el, vps };
}
/** نمای فعّال را انتخاب می‌کند، زوم می‌کند تا رابط خوانا شود، و آرام می‌لغزاند. */
function showVp(ph, key, h, z, f0, f1, p) {
  for (const [k, vp] of Object.entries(ph.vps)) vp.style.display = k === key ? "block" : "none";
  const vp = ph.vps[key];
  if (!vp) return;
  const w = IMG_W * z, sc = w / 1170;
  vp.__img.style.width = px(w);
  vp.__img.style.left = px(-(w - IMG_W) / 2);
  const span = Math.max(0, h * sc - VP_H);
  vp.__img.style.transform = `translateY(${(-span * lp(f0, f1, eio(cl(p)))).toFixed(1)}px)`;
}

/* =========================================================================
   ۸ — سازوکار (۵۶–۱۰۰٫۷): هفت ضرب، هر ضرب یک قابلیتِ واقعی
   ========================================================================= */
{
  const sc = scene(56, 100.8);

  const idx = add(sc, "div", "idx", "<u></u><span>چگونه کار می‌کند</span>");
  idx.style.top = "300px";

  /* هفت ضرب — متنِ تیتر و پنجرهٔ زمانی */
  const B = [
    { a: 56.3, b: 60.8, h: "یک دفترچهٔ مخاطبان،<br>برایِ <span class='acc'>کلِّ سازمان</span>.", k: "contacts", ih: 7374, z: 1.5, f: [0.05, 0.34], lay: "A" },
    { a: 60.8, b: 66.4, h: "سربرگِ خودِ سازمان،<br>با کادرهایِ <span class='acc'>دلخواهِ شما</span>.", k: "letterheads", ih: 2532, z: 1.45, f: [0.1, 0.8], lay: "B" },
    { a: 66.4, b: 74.8, h: "یک نامه می‌نویسید —<br>به اسمِ <span class='acc'>هر نفر</span>.", k: "compose", ih: 3201, z: 1.55, f: [0.08, 0.72], lay: "A" },
    { a: 74.8, b: 81.4, h: "مسیرِ تأیید را<br>خودتان می‌چینید.", k: "approvals", ih: 2532, z: 1.45, f: [0.05, 0.75], lay: "B" },
    { a: 81.4, b: 87.2, h: "ابلاغ در <span class='acc'>چهار کانال</span>،<br>با یک ارسال.", k: null, lay: "A" },
    { a: 87.2, b: 94.4, h: "محرمانه: لینکِ شخصی<br>و کدِ دسترسی.", k: "gate", ih: 2532, z: 1.35, f: [0.05, 0.6], lay: "A" },
    { a: 94.4, b: 100.7, h: "تحویل. باز شدن.<br>پاسخِ گیرنده.", k: "reports", ih: 14694, z: 1.5, f: [0.03, 0.17], lay: "B" },
  ];
  /* چیدمانِ A: تیتر بالا، گوشی پایین.  چیدمانِ B: گوشی بالا، تیتر پایین. */
  const LAY = { A: { head: 352, idx: 300, ph: 600, rot: -1.1 }, B: { head: 1588, idx: 1536, ph: 268, rot: 1.3 } };
  const heads = B.map(d => {
    const n = add(sc, "div", "d3", d.h);
    n.style.top = px(LAY[d.lay].head);
    return n;
  });

  const ph = makePhone(sc, {
    contacts: "contacts", letterheads: "letterheads", compose: "compose",
    approvals: "approvals", gate: "gate", reports: "reports",
  });

  /* حلقهٔ لمس — سرِ هر ضرب، یک بار */
  const tap = add(sc, "div", "tap");
  tap.style.cssText += `;width:120px;height:120px`;

  /* ضربِ سوم: کارتِ «نسخه‌هایِ ساخته‌شده» از چپ می‌آید */
  const dup = add(sc, "div", "src", "<b>۱۲ نسخه ساخته شد</b><i>برایِ هر مخاطب، با نام و سِمَتِ خودش</i>");
  dup.style.cssText += `;left:30px;top:1560px;width:540px;z-index:5`;

  /* ضربِ پنجم: چهار کانال، با وقفهٔ یکسان */
  const CH = ["پیامک", "بله", "تلگرام", "ایتا"];
  const chips = CH.map((c, i) => {
    const n = add(sc, "div", "chip", c);
    n.style.cssText += `;right:72px;top:${660 + i * 215}px;font-size:46px;padding:18px 34px`;
    const r = add(sc, "div", "rule acc");
    r.style.cssText += `;top:${660 + i * 215 + 44}px;right:300px;height:5px`;
    return { n, r };
  });
  const one = add(sc, "div", "d2", "یک ارسال.");
  one.style.cssText += `;top:1600px`;

  sc.__r = t => {
    let k = 0;
    for (let i = 0; i < B.length; i++) if (t >= B[i].a) k = i;
    const d = B[k];

    const L = LAY[d.lay];
    idx.style.top = px(L.idx);
    wipe(idx, S(t, Math.max(56.2, d.a + 0.05), Math.max(56.7, d.a + 0.5)), 0);

    heads.forEach((n, i) => { n.style.display = i === k ? "block" : "none"; });
    wipe(heads[k], S(t, d.a + 0.1, d.a + 0.7), 18);

    /* گوشی: در ضربِ کانال‌ها از صحنه بیرون می‌رود */
    const off = k === 4;
    ph.el.style.display = off ? "none" : "block";
    if (!off) {
      const inP = snap(S(t, d.a, d.a + 0.6));
      ph.el.style.top = px(L.ph);
      ph.el.style.transform =
        `translateY(${((1 - inP) * 110).toFixed(1)}px) rotate(${(L.rot * inP).toFixed(2)}deg)`;
      ph.el.style.opacity = inP.toFixed(2);
      showVp(ph, d.k, d.ih, d.z, d.f[0], d.f[1], S(t, d.a + 0.5, d.b - 0.2));
      const tp = S(t, d.a + 0.6, d.a + 1.1);
      tap.style.display = tp > 0 && tp < 1 ? "block" : "none";
      tap.style.left = px(PH.x + 170); tap.style.top = px(L.ph + 330);
      tap.style.opacity = (1 - tp).toFixed(2);
      tap.style.transform = `scale(${lp(0.25, 1.35, eio(tp)).toFixed(3)})`;
    } else {
      tap.style.display = "none";
    }

    /* کارتِ نسخه‌ها فقط در ضربِ سوم */
    const dp = snap(S(t, 70.4, 71.1));
    dup.style.display = t >= 70.3 && t < 74.7 ? "block" : "none";
    dup.style.transform = `translateX(${(-460 * (1 - dp)).toFixed(1)}px) rotate(-1.4deg)`;

    /* چهار کانال */
    chips.forEach(({ n, r }, i) => {
      const at = 82.0 + i * 0.62;
      const p = snap(S(t, at, at + 0.4));
      n.style.display = off ? "block" : "none";
      r.style.display = off ? "block" : "none";
      n.style.opacity = p.toFixed(2);
      n.style.transform = `translateX(${(-70 * (1 - p)).toFixed(1)}px)`;
      r.style.width = px(510 * snap(S(t, at + 0.15, at + 0.6)));
    });
    one.style.display = off ? "block" : "none";
    if (off) wipe(one, S(t, 84.9, 85.6), 18);
  };
}

/* =========================================================================
   ۹ — نتیجه (۱۰۰٫۸–۱۱۳٫۲)
   ========================================================================= */
{
  const sc = scene(100.8, 113.2);
  const idx = add(sc, "div", "idx", "<u></u><span>نتیجه</span>");
  idx.style.top = "300px";

  const was = add(sc, "div", "d3", "پیش از این: چند روز.");
  was.style.top = "390px";
  const str = add(sc, "div", "strike");
  str.style.cssText += `;right:72px;top:424px;height:7px`;
  const now = add(sc, "div", "d1", "همان روز.");
  now.style.cssText += `;top:500px;color:var(--accent)`;
  const r = add(sc, "div", "rule"); r.style.top = "700px";
  const lead = add(sc, "div", "d3", "همان کار، <span class='acc'>بدونِ رفت‌وبرگشتِ کاغذی</span>.");
  lead.style.top = "726px";

  const FOUR = ["کمتر کاغذ.", "کمتر انتظار.", "کمتر پیگیری.", "کنترلِ بیشتر."];
  const rows = FOUR.map((tx, i) => {
    const n = add(sc, "div", "d2", tx);
    n.style.top = px(862 + i * 240);
    if (i === 3) n.classList.add("acc");
    const u = add(sc, "div", "rule");
    u.style.cssText += `;top:${862 + i * 240 + 116}px`;
    if (i === 3) u.classList.add("acc");
    return { n, u };
  });

  sc.__r = t => {
    wipe(idx, S(t, 101.0, 101.5), 0);
    wipe(was, S(t, 101.2, 101.9), 16);
    str.style.width = px(560 * snap(S(t, 102.5, 103.1)));
    wipe(now, S(t, 103.2, 104.1), 24);
    drawRule(r, S(t, 104.4, 105.2), 936);
    wipe(lead, S(t, 105.4, 106.2), 16);
    rows.forEach(({ n, u }, i) => {
      const at = 107.2 + i * 1.2;
      wipe(n, S(t, at, at + 0.42), 20);
      drawRule(u, S(t, at + 0.2, at + 0.7), i === 3 ? 520 : 330);
    });
  };
}

/* =========================================================================
   ۱۰ — دعوت (۱۱۲٫۲–۱۲۶): ورقِ مرکّب از پایین بالا می‌آید
   ========================================================================= */
{
  const sc = scene(112.2, DUR);
  sc.classList.add("onink");
  sc.style.background = "var(--ink)";

  const seal = add(sc, "div", "seal", "<span>م پ</span>");
  seal.style.cssText += ";right:72px;top:300px;width:190px;height:190px;border-width:6px";
  seal.querySelector("span").style.fontSize = "38px";
  seal.style.transform = "rotate(-6deg)";

  const wm = add(sc, "div", "d1", "میلینگ پِرِس");
  wm.style.cssText += ";top:560px;font-size:112px";
  const lat = add(sc, "div", "body", "MAILING PRESS");
  lat.style.cssText += ";top:710px;direction:ltr;text-align:right;letter-spacing:10px;font-weight:700;color:var(--accent)";
  const sub = add(sc, "div", "d3", "مکاتباتِ سازمانی،<br>دیجیتال و قابلِ پیگیری.");
  sub.style.top = "810px";
  const r = add(sc, "div", "rule ink"); r.style.top = "1030px";

  const q = add(sc, "div", "d2", "دبیرخانه دارید؟");
  q.style.top = "1100px";
  const of1 = add(sc, "div", "body", "یک نامهٔ واقعی با سربرگِ خودتان می‌فرستیم.");
  of1.style.top = "1240px";
  const big = add(sc, "div", "d1", "۲۰ دقیقه");
  big.style.cssText += ";top:1330px;font-size:132px;color:var(--accent)";
  const url = add(sc, "div", "body", "mailing-system-chi.vercel.app");
  url.style.cssText += ";top:1560px;direction:ltr;text-align:right;font-weight:700;color:var(--white);letter-spacing:1px";
  const ur = add(sc, "div", "rule acc"); ur.style.cssText += ";top:1630px;height:5px";

  sc.__r = t => {
    sheet(sc, t, 112.3, 113.1);
    const sp = ob(S(t, 113.3, 114.0));
    seal.style.opacity = S(t, 113.3, 113.5).toFixed(2);
    seal.style.transform = `scale(${lp(2.6, 1, sp).toFixed(3)}) rotate(${lp(-18, -6, sp).toFixed(1)}deg)`;
    wipe(wm, S(t, 113.6, 114.5), 22);
    wipe(lat, S(t, 114.2, 114.9), 14);
    wipe(sub, S(t, 114.9, 115.8), 18);
    drawRule(r, S(t, 116.4, 117.2), 936);
    wipe(q, S(t, 118.5, 119.2), 20);
    wipe(of1, S(t, 119.6, 120.4), 16);
    wipe(big, S(t, 121.0, 121.9), 26);
    wipe(url, S(t, 122.6, 123.4), 14);
    drawRule(ur, S(t, 123.0, 123.8), 620);
  };
}

/* =========================================================================
   موتورِ seek — هر فریم تابعِ محضِ زمان است
   ========================================================================= */
const SCENES = [...layers.children].filter(n => n.classList.contains("scene"));
/* ورقِ مرکّبِ صحنه‌های ۶ و ۷ */
SCENES[5].__sheet = t => sheet(SCENES[5], t, 37.7, 38.4);
SCENES[6].__sheet = t => sheet(SCENES[6], t, 44.2, 44.9, 56.0, 56.8);

window.seek = function (t) {
  const tt = cl(t, 0, DUR);
  for (const s of SCENES) {
    if (!s.__vis(tt)) continue;
    if (s.__sheet) s.__sheet(tt);
    s.__r(tt);
  }
};
window.DUR = DUR; window.FPS = FPS;
window.seek(0);
