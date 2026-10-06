# میلینگ پرس: پرامپت‌های تصویر وکتور (خروجی PROMPT 02)

> **کاربرد:** این پرامپت‌ها برای وقتی است که بخواهید وکتورهای فیلم را با ابزار تولید تصویر
> (Firefly، Midjourney، Ideogram و مانند آن) در نسخه‌ای «رندرشده» دوباره بسازید.
> وکتورهای فعلیِ فیلم همین طراحی‌ها هستند که در کد کشیده شده‌اند (`compositions/frames/01–07, 15`).
>
> **قاعده:** همهٔ تصویرها عضو یک Visual System واحدند: یک پرسپکتیو، یک ضخامت خط، یک نور، یک عمق و یک پالت.
>
> **ترتیب پرامپت نهایی:** `MASTER STYLE` + `PALETTE` + پرامپت هر صحنه + `NEGATIVE`.

---

## MASTER STYLE

```
Premium modern corporate vector illustration, minimalist enterprise SaaS aesthetic,
clean geometric composition, high-end corporate technology visual language,
flat vector illustration with subtle 3D depth, soft gradients, precise geometric shapes,
smooth rounded edges, professional infographic language, subtle cinematic lighting from the upper left,
generous clean negative space on the right third of the frame (reserved for right-to-left Persian headline),
sophisticated enterprise software commercial style, one consistent straight-on perspective,
uniform 4px rounded line weight, consistent soft depth, no photorealism, no stock-photo look,
no visual clutter, 16:9 horizontal composition
```

## PALETTE: رنگ‌های رسمی خود اپ (`src/app/globals.css`)

```
strict palette: deep navy #0A2233 (lines, ink), paper canvas #F5F7FA (background),
white #FFFFFF (object fills), cool gray #C9D4E1 (text lines, rails), slate #4E5D74 (secondary),
brand teal #0F5C7A (ONLY in solution / product scenes), muted gold #8A6412 (ONLY on a seal, under 3% of the frame).
Problem scenes use navy + grays only, no teal.
```

## NEGATIVE (به همه اضافه شود)

```
NO TEXT, NO RANDOM LETTERS, NO GIBBERISH, NO FAKE UI TEXT, NO WATERMARK, NO LOGO, NO BRAND NAME,
NO PHOTOREALISM, NO STOCK IMAGE LOOK, NO EXCESSIVE DETAILS, NO VISUAL CLUTTER, NO DISTORTED OBJECTS,
NO DEFORMED HANDS, NO UNNECESSARY PEOPLE, NO RANDOM ICONS, NO RANDOM SYMBOLS, NO LOW-QUALITY VECTOR,
NO PIXELATED ELEMENTS, NO MESSENGER LOGOS, NO NEON GLOW, NO GRADIENT TITLE CARD
```

---

## صحنه به صحنه

| کد | صحنه | پرامپت |
|---|---|---|
| V01 | ۱. قلاب | `A single white letter sheet on the left third, its recipient field an empty dashed box, a small eye symbol with a question mark at the lower corner, a pen hovering above an unsigned dotted signature line, a desk phone handset vibrating with two thin sound arcs beside it, navy line art on paper canvas` |
| V02 | ۲. مخاطب پراکنده | `One contact card breaking into three fragments that fly toward three separate objects in a row: a cluster of three smartphones at slightly different angles, a spreadsheet grid with one highlighted cell, a spiral paper notebook with handwritten wavy lines; the objects do not connect; navy line art, white fills` |
| V03 | ۳. کانال‌های پراکنده | `A letter on the right and a single person avatar on the left joined by four separate dotted curved lanes; one dark packet travels on the top lane, a hollow packet returns on a lower lane; a double check-mark dissolving into a question mark near the avatar; no app logos` |
| V04 | ۴. زنجیرهٔ کاغذی | `Five stations evenly spaced on a dotted horizontal rail, right to left: printer, signed sheet with pen, rubber stamp pressing down, secretariat paper tray, envelope; a small sheet hopping between stations; muted, slightly tired mood` |
| V05 | ۵. انتظار | `A wall clock with motion-blurred hands, a sheet resting untouched in a paper tray, a stack of calendar day cards peeling upward; quiet, still composition, lots of empty space` |
| V06 | ۶. پیگیری | `A simple organization chart of six rounded desk cards connected by thin gray lines, a magnifying glass with a question mark hopping between the cards and finding nothing; faint, low-contrast mood` |
| V07 | ۷. سؤال بزرگ | `Full-bleed deep navy field, one white outlined sheet of paper floating and slowly turning on the left third, cinematic and minimal, empty right two thirds` |
| V08 | ۸. ورود (اختیاری) | `The same sheet breaking into a precise grid of small rounded square tiles that flow along gentle curves and assemble into the outline of a software window; background transitioning from navy to paper canvas; first appearance of brand teal on the tiles` |
| V15a | ۱۵. هاب پارک | `A teal rounded hub in the center surrounded by eight small white building cards on an ellipse, thin spokes, small teal dots traveling outward, tiny teal check marks on each building; orderly, calm, confident` |
| V15b | ۱۵. کاغذ در برابر دیجیتال | `Two parallel horizontal lanes: the upper lane solid teal with five filled dots and a token that has reached the end with a check mark; the lower lane dotted gray with five hollow dots and a hollow token stuck at the second dot; clean comparison infographic` |

**صحنه‌های ۹ تا ۱۴ و ۱۶ وکتور نمی‌خواهند.** در آن‌ها فقط اسکرین‌شات واقعی نرم‌افزار به کار رفته است.

## چک‌لیست هم‌خوانی پیش از استفاده

- ضخامت خط و شعاع گوشه در همهٔ تصویرها یکی باشد.
- فیروزه‌ای در V01 تا V07 دیده نشود. رنگ با محصول وارد می‌شود.
- سمت راست قاب برای تیتر فارسی خالی بماند.
- هیچ متن، لوگو یا نماد پیام‌رسانی وارد تصویر نشده باشد. نام کانال‌ها در فیلم به‌صورت متن فارسیِ HTML می‌آید.
