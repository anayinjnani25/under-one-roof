"""Bundle and minify the site's scripts and styles into assets/dist/.

Every page loads two scripts: dist/core.js (the same on every page, so browsers cache it
once) and its own small dist/<page>.js; and one stylesheet: dist/site.css (dist/admin.css on
the admin page). Edit the source files in assets/js and assets/css as before, then run
    python tools/stamp-assets.py
which runs this build first. JavaScript is minified with terser (fetched by npx, needs Node);
without Node the files are simply joined, which still works, just a little larger.
"""
import pathlib
import re
import shutil
import subprocess

root = pathlib.Path(__file__).resolve().parent.parent
js, css, dist = root / 'assets' / 'js', root / 'assets' / 'css', root / 'assets' / 'dist'
dist.mkdir(exist_ok=True)

# order matters: each file relies on the ones before it
CORE = ['../vendor/supabase-2.45.4.min.js', 'config.js', 'i18n-strings.js', 'i18n.js', 'data.js', 'art.js',
        'common.js', 'backend.js', 'atelier.js']
PAGES = ['home', 'product', 'category', 'collection', 'account', 'pages', 'admin']
STYLES = {'site.css': ['fonts.css', 'style.css', 'atelier.css'], 'admin.css': ['fonts.css', 'style.css', 'admin.css']}

npx = shutil.which('npx') or shutil.which('npx.cmd')


def minify_js(src):
    if not npx:
        return src
    r = subprocess.run([npx, '--yes', 'terser@5.36.0', '--compress', '--mangle', '--comments', 'false'],
                       input=src.encode('utf-8'), capture_output=True)
    if r.returncode != 0:
        print('  terser failed, keeping the file unminified:', r.stderr.decode()[:200])
        return src
    return r.stdout.decode('utf-8')


def minify_css(src):
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)       # comments
    src = re.sub(r'\s+', ' ', src)                          # whitespace runs
    src = re.sub(r'\s*([{};])\s*', r'\1', src)               # around braces and semicolons
    return src.replace(';}', '}').strip() + '\n'


def write(name, text):
    (dist / name).write_text(text, encoding='utf-8', newline='\n')
    print(f'  dist/{name}: {len(text.encode("utf-8")) // 1024} KB')


print('building assets/dist' + ('' if npx else ' (no Node found: joining without minifying)'))
vendor = (js / CORE[0]).read_text(encoding='utf-8')          # already minified
ours = ';\n'.join((js / f).read_text(encoding='utf-8') for f in CORE[1:])
write('core.js', vendor + ';\n' + minify_js(ours))
EXTRA = {'product': ['gallery.js']}  # files bundled in front of a page's own script
for page in PAGES:
    src = ';\n'.join((js / f).read_text(encoding='utf-8') for f in EXTRA.get(page, []) + [page + '.js'])
    write(page + '.js', minify_js(src))
for out, parts in STYLES.items():
    write(out, minify_css('\n'.join((css / p).read_text(encoding='utf-8') for p in parts)))
