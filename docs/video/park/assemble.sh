#!/usr/bin/env bash
# Assemble index.html from STORYBOARD.md with the product-launch-video assembler,
# then point GSAP at the vendored copy (render must not touch the network).
set -euo pipefail
cd "$(dirname "$0")"
SKILL="${PLV_SKILL:-$HOME/.claude/skills/product-launch-video}"
node "$SKILL/scripts/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes . "$@"
python3 - <<'PY'
import re
s = open("index.html").read()
s = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/gsap@[^"]+"[^>]*></script>', '<script src="assets/vendor/gsap.min.js"></script>', s)
open("index.html", "w").write(s)
PY
