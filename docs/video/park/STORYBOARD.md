---
format: 1920x1080
duration: 127s
message: "مکاتبات سازمانی، از اولین کلیک تا آخرین امضا، دیجیتال و قابل‌پیگیری"
arc: Hook → Problem ×6 → Big question → Reveal → Features ×6 → Transformation → CTA
audience: مدیریت پارک علم و فناوری + سرمایه‌گذاران و داوران
mode: autonomous
music: synthesized in code (music.py) — minimal cinematic piano → tension → bright → subtle electronic + piano → cinematic rise
captions: skipped (Persian Fish Audio VO has no word timestamps; short on-screen copy carries the key words)
---

## Video direction

Colour is the story: the problem scenes use only the app's navy ink (#0a2233) and greys on the paper canvas
(#f5f7fa); the teal (#0f5c7a) first appears at the reveal and then belongs to the product. Gold (#8a6412) shows up
once, on the QR seal. One face (Vazirmatn, the app's own font): 800–850 for display, 500–600 for UI copy. Display
lines are right-aligned on the grid (RTL), never centred, and always open with a right-to-left clip-path wipe, never a
fade. Problem scenes use code-drawn line vectors (4px stroke, rounded joins). Product scenes use real 2× screenshots of
the running app inside a plain window card with a 1px border and no glow. Punch-ins target the exact UI region the VO
names. Something new lands every 2–4 s. All randomness comes from seeded mulberry32. Every frame is a pure function of t.

## Frame 1 — Hook: three questions

- src: compositions/frames/01-hook.html
- duration: 9.8s
- transition_in: cut
- status: animated
- scene: three familiar questions stack right-aligned beside a letter whose recipient, seen-mark and signature are blank; a phone starts ringing
- voiceover: "شُمارهٔ مُخاطَب کجاست؟ نامه دیده شد؟ امضایَش چه شد؟ اگر جوابِ این سه سؤال، هر بار یک تماسِ تلفنی است؛ این ویدیو برای شماست."
- blueprint: kinetic-type-beats (Problem relay, adapted: right-aligned stack instead of centre)

Scene 1 (0–2.5s): the page draws in on the left; «مخاطب کجاست؟» wipes in on the right; the dashed recipient field pops with a «؟».
Scene 2 (2.5–4.2s): Q1 dims; «نامه دیده شد؟» wipes in; the eye marker springs onto the page.
Scene 3 (4.2–6.0s): «امضا شد؟» wipes in; the pen hovers over the dashed signature line and never signs.
Scene 4 (6.0–9.8s): Q1 and Q2 recede; the handset rings beside «هر بار، یک تماسِ تلفنی.»

## Frame 2 — Scattered contacts

- src: compositions/frames/02-contacts.html
- duration: 6.0s
- transition_in: cut
- status: animated
- scene: one contact card shatters into three places — a phone, an Excel grid, a paper notebook
- voiceover: "اطّلاعاتِ مُخاطَبان، گاهی در گوشیِ چند نفر است؛ گاهی در یک فایلِ اکسل؛ و گاهی فقط روی کاغذ."
- blueprint: constellation-hub (inverted: the hub scatters)

## Frame 3 — Multiple channels

- src: compositions/frames/03-channels.html
- duration: 6.4s
- transition_in: cut
- status: animated
- scene: one letter leaves on four separate lanes (WhatsApp, Telegram, email, in person); replies return on different lanes; read-ticks turn into question marks
- voiceover: "نامه از یک کانال می‌رَوَد و پاسخش از کانالی دیگر می‌آید؛ و همیشه معلوم نیست چه کسی، کِی، آن را دیده است."
- blueprint: compose

## Frame 4 — Paper workflow

- src: compositions/frames/04-paper.html
- duration: 7.4s
- transition_in: cut
- status: animated
- scene: a sheet travels a five-station chain (print, sign, stamp, secretariat, send), then rides the same chain back
- voiceover: "چاپ. امضا. مُهر. دبیرخانه. ارسال… و همین مسیر، یک بارِ دیگر، برای برگشت."
- blueprint: spatial-pan-stations

## Frame 5 — Waiting

- src: compositions/frames/05-waiting.html
- duration: 4.2s
- transition_in: cut
- status: animated
- scene: the sheet sits in a tray; a wall clock runs and calendar days peel; «انتظار…»
- voiceover: "و در این میان، تنها کاری که می‌شود کرد، انتظار است."
- blueprint: compose (deliberate hold)

## Frame 6 — Tracking problem

- src: compositions/frames/06-tracking.html
- duration: 7.2s
- transition_in: cut
- status: animated
- scene: an org chart of desks; a «؟» marker hops from desk to desk looking for the letter
- voiceover: "نامه کجاست؟ دستِ چه کسی است؟ چه کسی هنوز اقدامی نکرده؟ پیگیری، سخت‌تر از آن است که باید باشد."
- blueprint: spatial-pan-stations (desks as stations)

## Frame 7 — The big question

- src: compositions/frames/07-question.html
- duration: 4.6s
- transition_in: cut
- status: animated
- scene: full-bleed ink; one line, right-aligned: «چرا هنوز کاغذ؟»
- voiceover: "چرا هنوز برای این فرآیند، کاغذ مصرف می‌کنیم؟"
- blueprint: kinetic-type-beats (single held beat)

## Frame 8 — Reveal

- src: compositions/frames/08-reveal.html
- duration: 9.4s
- transition_in: cut
- status: animated
- scene: sheets break into a seeded grid of digital particles that flow into a window; the real dashboard wipes in; the «م» mark presses like a stamp; «میلینگ پرس»
- voiceover: "اَمّا اگر تمامِ این فرآیند، از اوّلین کلیک تا آخرین امضا، دیجیتال شود چه؟ اینجاست که میلینگ پِرِس وارد می‌شود."
- blueprint: logo-assemble-lockup + depth-scatter-assemble

## Frame 9 — Contacts

- src: compositions/frames/09-contacts.html
- duration: 6.3s
- transition_in: cut
- status: animated
- scene: real contacts screen; punch-in on «ورود گروهی»; tag chips with counts slide over
- voiceover: "یک دفترچهٔ مُخاطَبانِ واحد برای کُلِّ سازمان؛ ورودِ گروهی از اکسل، و انتخابِ یک‌جا با برچسب."
- blueprint: device-surface-showcase + coordinate-target-zoom

## Frame 10 — Letterhead

- src: compositions/frames/10-letterhead.html
- duration: 5.5s
- transition_in: cut
- status: animated
- scene: the real letter's letterhead and auto number, cropped large
- voiceover: "سربرگِ رسمیِ خودِ سازمان؛ و شمارهٔ نامه‌ای که سامانه خودش می‌دهد."
- blueprint: coordinate-target-zoom

## Frame 11 — Letter builder

- src: compositions/frames/11-builder.html
- duration: 6.7s
- transition_in: cut
- status: animated
- scene: the real 6-step compose wizard; one letter fans out into personalised copies carrying real recipient names
- voiceover: "نامه را یک بار می‌نویسید؛ سامانه برای هر مُخاطَب، نسخه‌ای جداگانه با نام و سِمَتِ خودِ او می‌سازد."
- blueprint: grid-card-assemble

## Frame 12 — Approval & signature

- src: compositions/frames/12-approval.html
- duration: 12.5s
- transition_in: cut
- status: animated
- scene: the real approval chain turns green step by step; the approver's phone receives the request (SMS, Bale, Telegram, Eitaa) and taps تأیید; then the letter's signature and QR seal
- voiceover: "مسیرِ تأیید را بر اساسِ سِمَت‌ها می‌چینید. تأییدکننده با پیامک، بَله، تلگرام یا ایتا خبردار می‌شود و از روی گوشی تأیید می‌کند. و نامه با امضا و مُهرِ کیوآر می‌رود؛ هر تغییری در متن، آشکار می‌شود."
- blueprint: device-surface-showcase + camera-journey

## Frame 13 — Tracking

- src: compositions/frames/13-tracking.html
- duration: 8.6s
- transition_in: cut
- status: animated
- scene: the recipient opens the letter on a phone; the sender's recipient table shows delivered / opened / responded; three counters climb
- voiceover: "گیرنده، نامه را با پیامک و لینکِ شخصیِ خودش باز می‌کند. و از این لحظه، همه‌چیز قابلِ پیگیری است: تحویل، بازشدن، و پاسخِ گیرنده."
- blueprint: device-surface-showcase + counting-dynamic-scale

## Frame 14 — Reports

- src: compositions/frames/14-reports.html
- duration: 5.6s
- transition_in: cut
- status: animated
- scene: the real reports page; push in across the KPI tiles
- voiceover: "گزارش‌ها، وضعیّتِ همهٔ نامه‌ها را یک‌جا نشان می‌دهند؛ بی‌آنکه کسی تلفن بزند."
- blueprint: camera-journey

## Frame 15 — Transformation

- src: compositions/frames/15-transform.html
- duration: 8.0s
- transition_in: cut
- status: animated
- scene: split stage: the grey paper chain on one side, the teal digital path on the other; «از کاغذ… به دیجیتال.»
- voiceover: "برای پارک، یعنی مکاتبه با شرکت‌های مستقر، بی‌کاغذ و با سابقهٔ کامل. آنچه روزها طول می‌کشید، می‌تواند در همان روز تمام شود."
- blueprint: compose (split comparison)

## Frame 16 — CTA

- src: compositions/frames/16-cta.html
- duration: 18.8s
- transition_in: cut
- status: animated
- scene: four rhythmic lines; the stamp-press lockup «میلینگ پرس» + tagline; a live-demo invitation card
- voiceover: "کمتر کاغذ. کمتر انتظار. کمتر پیگیری. کنترلِ بیشتر. میلینگ پِرِس. مکاتباتِ سازمانی، دیجیتال و قابلِ پیگیری. این سامانه همین حالا کار می‌کند. بیست دقیقه وقت بدهید؛ یک نامهٔ واقعی با سربرگِ خودتان می‌فرستیم و مسیرش را زنده می‌بینید."
- blueprint: kinetic-type-beats (CTA) + logo-assemble-lockup
