---
workflow: product-launch-video
flow: automation
storyboard: no
message: "مکاتبات سازمانی، از اولین کلیک تا آخرین امضا، دیجیتال و قابل‌پیگیری"
destination: youtube-embed
aspect: 1920x1080
language: fa
audience: "مدیریت پارک علم و فناوری + سرمایه‌گذاران و داوران رویدادهای پارک"
length: 110s
angle: problem-agitate-solve
vo_mode: restructured
voice: "fish-audio · male 25–35 · standard Persian · calm, intelligent, confident"
style_preset: blue-professional
---

## Intent

A promotional film for «میلینگ پرس» (Mailing Press), the organisational correspondence system, made for a science and technology park. It plays for park management (who buy for their own secretariat and correspond with resident companies) and for investors and judges at park events (who need to see a real, working product, not a mock-up). Order: PROBLEM → AGITATION → SOLUTION → FEATURES → BENEFITS → CTA. The product name never appears before the reveal. Professional, modern, trustworthy, minimal, direct; no empty slogans and no unprovable claims.

## Assets

- capture/assets/*.png — real screens of the running app (local demo instance, seed data). Inventory: capture/extracted/asset-descriptions.md.
- assets/fonts/vazirmatn-variable.woff2 — the app's own UI font.

## Customizations

- Persian VO, generated with Fish Audio. The text carries selective diacritics (only where they help pronunciation) and correct zero-width non-joiners. Voice directions sit outside the speakable text (vo/lines.json → `direction`).
- Music and SFX synthesized in code (minimal cinematic piano → tension → brighter → subtle electronic + piano → cinematic rise). Beat grid in beats.json. Mix −14 LUFS.
- Problem scenes: code-built vector illustration. Software scenes: real screenshots only.
- Studio rules from the user: every frame is a pure function of time; seeded noise only; banned defaults (centered title on gradient, fade-everything, corner labels, frame borders, glow on UI chrome, generic particle bursts); something new every 2–4 s; contact-sheet scoring loop until every score is 8+.

## Notes

- Never claim a capability the code does not have. Not in the product: email sending, WhatsApp sending, certificate-based (PKI) digital signature, a standalone form builder.
- Bale, Telegram and Eitaa only **notify approvers**. Letters reach recipients by **SMS with a personal link** (+ access code for confidential letters).
- The demo org in the screenshots is the seed «پارک علم و فناوری یزد». It is demo data, not a customer claim.
