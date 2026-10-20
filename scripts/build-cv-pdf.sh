#!/usr/bin/env bash
# Prints cv.html to cv.pdf with headless Chrome (or Edge). Rerun after editing cv.html.
# Usage: scripts/build-cv-pdf.sh [url]   (defaults to a local server on port 8765, e.g. npx http-server -p 8765)
set -euo pipefail

url="${1:-http://localhost:8765/cv.html}"
root="$(cd "$(dirname "$0")/.." && pwd)"

for candidate in \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "$(command -v google-chrome || true)" \
  "$(command -v chromium || true)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then browser="$candidate"; break; fi
done
: "${browser:?No Chrome, Edge or Chromium found}"

out="$root/cv.pdf"
# Chrome on Windows wants a Windows path for the output file.
if command -v cygpath >/dev/null; then out="$(cygpath -w "$out")"; fi

"$browser" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=5000 \
  --print-to-pdf="$out" "$url"
echo "Wrote $out"
