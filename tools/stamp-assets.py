"""Stamp a version onto every local CSS/JS link in the site's HTML pages.

Browsers (and GitHub Pages' 10-minute cache) can otherwise mix old and new files
right after a deploy, e.g. a fresh data.js with a stale product.js. Run this
before each commit that changes anything in assets/:

    python tools/stamp-assets.py
"""
import pathlib
import re
import time

root = pathlib.Path(__file__).resolve().parent.parent
version = time.strftime('%Y%m%d%H%M')
pattern = re.compile(r'((?:href|src)="assets/(?:css|js)/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"')

for page in sorted(root.glob('*.html')):
    text = page.read_text(encoding='utf-8')
    stamped, count = pattern.subn(lambda m: m.group(1) + '?v=' + version + '"', text)
    if stamped != text:
        page.write_text(stamped, encoding='utf-8', newline='')
    print(f'{page.name}: {count} links -> v={version}')
