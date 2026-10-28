"""Write sitemap.xml: every shop page and every published piece, for Google Search Console.

The list of pieces and collections is read live from Supabase with the public (publishable)
key, so it always matches what the shop shows. stamp-assets.py runs this; offline, the
pieces bundled in assets/js/data.js are used instead.
"""
import json
import pathlib
import re
import time
import urllib.request
from xml.sax.saxutils import escape

SITE = 'https://anayinjnani25.github.io/under-one-roof/'
root = pathlib.Path(__file__).resolve().parent.parent
config = (root / 'assets' / 'js' / 'config.js').read_text(encoding='utf-8')
api = re.search(r"url: '([^']+)'", config).group(1)
key = re.search(r"key: '([^']+)'", config).group(1)


def rows(path):
    req = urllib.request.Request(api + '/rest/v1/' + path, headers={'apikey': key})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


data = (root / 'assets' / 'js' / 'data.js').read_text(encoding='utf-8')
shelves = re.findall(r"slug: '([\w-]+)'", data)
try:
    pieces = [p['id'] for p in rows('products?select=id&published=eq.true&order=sort')]
    collections = [c['slug'] for c in rows('collections?select=slug')]
except Exception as e:  # offline: fall back to the catalogue bundled with the site
    print('sitemap: Supabase unreachable (%s), using data.js' % e)
    pieces = re.findall(r"\bid: '([\w-]+)'", data)
    collections = []

pages = ['', 'about.html', 'blog.html', 'faq.html', 'contact.html']
pages += ['category.html?c=' + s for s in shelves]
pages += ['product.html?id=' + p for p in pieces]
pages += ['collection.html?c=' + c for c in collections]


def alt(href, lang):
    return href + ('&' if '?' in href else '?') + 'lang=' + lang


today = time.strftime('%Y-%m-%d')
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
for page in pages:
    href = SITE + page
    out.append('  <url><loc>%s</loc><lastmod>%s</lastmod>' % (escape(href), today))
    for lang, url in (('en', href), ('te', alt(href, 'te')), ('hi', alt(href, 'hi')), ('x-default', href)):
        out.append('    <xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (lang, escape(url)))
    out.append('  </url>')
out.append('</urlset>')
(root / 'sitemap.xml').write_text('\n'.join(out) + '\n', encoding='utf-8', newline='\n')
print('sitemap.xml: %d pages' % len(pages))
