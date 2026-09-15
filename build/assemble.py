import json, base64, os, glob, re, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
DIR = sys.argv[1] if len(sys.argv) > 1 else 'cpimg2'
OUT = sys.argv[2] if len(sys.argv) > 2 else 'GBI_Genome_Atlas.html'
B = json.load(open('bundle.json'))
# The chemistry and marker payloads are built by their own scripts and merged in
# here, so a finished SSR run only means dropping a new ssr_payload.json and
# re-assembling -- there is still exactly one data contract, DATA.
for key, path in (('chem','chem/chem_real.json'), ('ssr','ssr/ssr_payload.json'), ('cp2','cp2/payload.json')):
    if os.path.exists(path):
        B[key] = json.load(open(path))
        print('merged', key, 'from', path)
    else:
        print('WARNING: no', path, '-- the', key, 'view will be empty')

# ------------------------------------------------- copy from the ATLAS tabs
# Every editable string in the body is an @@key@@ token filled from the sheet.
# A key that is missing, or one in the sheet that nothing uses, stops the build:
# a blank heading on a public page is worse than a failed build on your machine.
def fill_copy(text, copy, where):
    used, missing = set(), []
    def sub(m):
        k = m.group(1)
        if k not in copy:
            missing.append(k); return m.group(0)
        used.add(k); return copy[k]
    out = re.sub(r'@@([A-Za-z0-9_.\-]+)@@', sub, text)
    if missing:
        raise SystemExit('MISSING COPY KEYS in %s (add them to the ATLAS Copy tab):\n  %s'
                         % (where, '\n  '.join(sorted(set(missing)))))
    return out, used

COPY = B.get('copy', {})

bundle = json.dumps(B, separators=(',',':'))
cp = {}
# A partial upload of the plate folder used to build cleanly and publish an atlas
# with no chloroplast figures at all: a green tick over a broken page. Refuse
# instead. Pass 'none' as the directory if a plate-less build is ever wanted.
if DIR != 'none' and not glob.glob(DIR + '/*.webp'):
    raise SystemExit(
        f'NO PLATE IMAGES FOUND in "{DIR}/".\n'
        f'The atlas expects 182 .webp files there, one per plant.\n'
        f'If you uploaded them in batches, one of the batches did not land.\n'
        f'Check build/cpimg2 in the repository, then run the workflow again.')
if DIR != 'none':
    for f in sorted(glob.glob(DIR + '/*.webp')):
        k = os.path.basename(f)[:-5]
        cp[k] = 'data:image/webp;base64,' + base64.b64encode(open(f,'rb').read()).decode()
js = '\n'.join(open(f'js{i}.js').read() for i in (1,2,3,4,6,7,8,9,5))
js = js.replace('__BUNDLE__', bundle).replace('__CPIMG__', json.dumps(cp, separators=(',',':')))
# The artifact wrapper owns <head>, so we cannot declare a charset. Emit pure ASCII
# so the page renders identically however it is served or opened from disk.
jesc = lambda m: '\\u%04x' % ord(m.group(0))
hesc = lambda m: '&#%d;' % ord(m.group(0))
js = re.sub(r'[^\x00-\x7f]', jesc, js)
html = ''.join(open(f).read() for f in ('tpl_head.html','tpl_css2.html','tpl_body.html'))
html, used = fill_copy(html, COPY, 'tpl_body.html')
# Strings built in code call TXT('key'). Check those keys here too, so a deleted
# row is a failed build rather than a console error nobody sees on a live page.
js_keys = set(re.findall(r"TXT\(\s*'([A-Za-z0-9_.\-]+)'", js))
js_missing = sorted(js_keys - set(COPY))
if js_missing:
    raise SystemExit('MISSING COPY KEYS used by TXT() in the JavaScript '
                     '(add them to the ATLAS Copy tab):\n  ' + '\n  '.join(js_missing))
print(f'copy: {len(js_keys)} keys read by TXT() in code')
used |= js_keys
spare = sorted(set(COPY) - used)
if spare:
    raise SystemExit('UNUSED COPY KEYS: these rows are in the ATLAS Copy tab but nothing\n'
                     'in the atlas reads them, so editing them would do nothing:\n  '
                     + '\n  '.join(spare))
print(f'copy: {len(used)} strings filled from the sheet')
html = re.sub(r'[^\x00-\x7f]', hesc, html) + '<script>\n' + js + '\n</script>\n'
assert all(ord(c) < 128 for c in html), 'non-ascii leaked'
open(OUT,'w').write(html)
mb = os.path.getsize(OUT)/1e6
print(f'built {mb:.2f} MB  ({len(cp)} plastome maps embedded)')

