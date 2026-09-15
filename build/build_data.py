import sys, os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
_os.chdir(HERE)   # every path below is relative to this folder
from provenance import source as _src, collector as _coll
import openpyxl, re, json, math, os, base64
from collections import Counter, defaultdict

# The master workbook. Drop a newer export in beside this script under the same
# name, or set GBI_WORKBOOK to point somewhere else.
XL = _os.environ.get('GBI_WORKBOOK', 'GBI_Annotation_Pipeline_ATLAS.xlsx')
wb=openpyxl.load_workbook(XL, read_only=True, data_only=True)

# ---------------------------------------------------------------- ATLAS tabs
# Four control tabs, all read BY KEY rather than by column position. RESULTS
# needs 29 header assertions because it is positional; these do not, so rows can
# be inserted, sorted or annotated in the sheet without breaking the build.
def _tab(name):
    # Google renames imported tabs after the CSV file, so "ATLAS Copy" arrives as
    # "ATLAS_Copy". Match on a normalised name rather than making a human fix it.
    def norm(s): return str(s).strip().lower().replace('_', ' ').replace('-', ' ')
    match = next((t for t in wb.sheetnames if norm(t) == norm(name)), None)
    if match is None:
        raise SystemExit(f'MISSING TAB: "{name}". The atlas needs it. '
                         f'Underscores and capitalisation do not matter, but the words do. '
                         f'Tabs present: {wb.sheetnames}')
    rows = [r for r in wb[match].iter_rows(values_only=True)]
    hdr_i = next((i for i, r in enumerate(rows)
                  if r and str(r[0] or "").strip().lower() in ('key', 'itak family')), None)
    if hdr_i is None:
        raise SystemExit(f'TAB "{name}" has no header row starting with "key".')
    head = [str(c or "").strip().lower() for c in rows[hdr_i]]
    out = []
    for r in rows[hdr_i + 1:]:
        if not r or all(c is None or str(c).strip() == '' for c in r):
            continue
        out.append({head[i]: r[i] for i in range(min(len(head), len(r)))})
    return out

def _s(v):
    return '' if v is None else str(v).strip()

COPY = {}
for r in _tab('ATLAS Copy'):
    k = _s(r.get('key'))
    if k: COPY[k] = _s(r.get('text'))

REFS = {}
for r in _tab('ATLAS Comparisons'):
    k = _s(r.get('key'))
    if not k: continue
    v = r.get('value')
    REFS[k] = {'n': (None if v in (None, '') else int(v)),
               'what': _s(r.get('what it is')), 'label': _s(r.get('label shown')),
               'src': _s(r.get('source')), 'url': _s(r.get('url')),
               'got': _s(r.get('retrieved')), 'note': _s(r.get('note'))}

TFREF = [[_s(r.get('itak family')), _s(r.get('planttfdb family')),
          int(r.get('arabidopsis') or 0), int(r.get('grape') or 0), _s(r.get('note'))]
         for r in _tab('ATLAS Regulators') if _s(r.get('itak family'))]

SETTINGS = {}
for r in _tab('ATLAS Settings'):
    k = _s(r.get('key'))
    if k: SETTINGS[k] = _s(r.get('value'))

print(f'ATLAS tabs: {len(COPY)} copy strings, {len(REFS)} comparisons, '
      f'{len(TFREF)} regulator families, {len(SETTINGS)} settings')


def s(v):
    if v is None: return None
    t=str(v).strip()
    # The sheet uses em dashes as an appositive ("No - fragmented assembly").
    # The atlas sets no em dashes anywhere, so recast them as a colon on read.
    t=re.sub(r'\s*\u2014\s*', ': ', t)
    return t if t and t.lower() not in ('none','nan','#div/0!','n/a','na','-','—','x','') else None
def num(v):
    if v is None: return None
    if isinstance(v,bool): return None
    if isinstance(v,(int,float)):
        return None if (isinstance(v,float) and math.isnan(v)) else v
    t=str(v).replace(',','').replace('%','').strip()
    try: return float(t)
    except: return None
def pctf(v):   # fraction 0-1 -> percent
    n=num(v)
    return None if n is None else round(n*100,2) if n<=1.0001 else round(n,2)

MON={'jan':1,'feb':2,'mar':3,'apr':4,'may':5,'jun':6,'jul':7,'aug':8,'sep':9,'oct':10,'nov':11,'dec':12}
def months(t):
    if not t: return []
    hits=[MON[m[:3].lower()] for m in re.findall(r'[A-Za-z]+', t) if m[:3].lower() in MON]
    if not hits: return []
    if len(hits)==1: return hits
    a,b=hits[0],hits[-1]
    return list(range(a,b+1)) if a<=b else list(range(a,13))+list(range(1,b+1))

res=wb['RESULTS']; rows=list(res.iter_rows(values_only=True))
data=[r for r in rows[3:] if r and r[0]]

# Every index below is positional. The sheet has already gained two column blocks
# (chemistry CN-CP, markers CQ-CV) which pushed Location/Contact from CN/CO to
# CW/CX; a silent shift like that is unrecoverable downstream, so assert the
# header text at every index this file reads before reading any of it.
HDR = rows[2]
EXPECT = {0:'Plant prefix', 2:'Name', 3:'BioProject', 6:'Genome Assembly Accession',
          7:'Chloroplast GenBank', 10:'Common Name', 11:'Accession #', 12:'Calflora Link',
          13:'Taxonomy/info', 14:'CNPS classification', 15:'Bloom period',
          16:'# seq files', 25:'kmer used', 26:'haploid length', 33:'Assembler used',
          35:'# contigs', 44:'V: Complete BUSCOs', 50:'E: Complete BUSCOs',
          57:'proposed ploidy', 60:'bases masked', 63:'# predicted genes', 64:'rbcL',
          68:'# long candidate ORFs', 82:'Number of putative transcription-factor',
          84:'Number of contigs', 86:'# of genes', 88:'plastome size',
          100:'Location', 101:'Contact person and email'}
for i, want in EXPECT.items():
    got = str(HDR[i] or '') if i < len(HDR) else ''
    if not got.strip().startswith(want):
        raise SystemExit(f'COLUMN SHIFT at index {i}: expected header to start '
                         f'{want!r}, sheet says {got.strip()[:60]!r}. Fix the '
                         f'indices in build_data.py before rebuilding.')
print('header check: all %d indices match' % len(EXPECT))
def g(r,i): return r[i] if i<len(r) else None

def fmt_rank(v):
    if v is None: return None
    if isinstance(v,float) and v==int(v): v=int(v)
    t=str(v).strip().upper().replace(' ','')
    return t or None

def pick_rank(a,b):
    # prefer the more specific rank (one carrying a threat extension like 4.2 over bare 4)
    if a and b and a!=b:
        return b if ('.' in b and '.' not in a) else a
    return a or b

wf=list(wb['WEBSITE Front'].iter_rows(values_only=True))
rel={}; rank2={}
for r in wf[1:]:
    if not (r and r[0]): continue
    k=str(r[0]).strip().lower()
    if r[5]: rel[k]= str(r[5]).strip().lower()=='yes'
    if r[2]: rank2[k]=fmt_rank(r[2])

cred=json.load(open('calflora_credits.json'))   # url + photographer, one snapshot
photos={k:[x['u'] for x in v] for k,v in cred.items()}
pcred ={k:[x['credit'] for x in v] for k,v in cred.items()}
cpmap=json.load(open('cp_map2.json'))         # imgkey -> plantid, 182 OGDRAW plates
cp_by_plant={v:k for k,v in cpmap.items()}

FAM=re.compile(r'Family:\s*([A-Za-z]+)')
NCBI='https://www.ncbi.nlm.nih.gov/'
# A WGS master accession is 4-6 letters + 6 or more digits (JCASBW000000000) and
# the sheet often carries a trailing status, e.g. "JCASBW000000000 (processing)".
# Link the accession, keep the status in the display string.
WGS = re.compile(r'^([A-Z]{4,6}\d{6,})\b')
IDRE = re.compile(r'^(PRJ[A-Z]{2}\d+|SAM[A-Z]?\d+|[DES]RR\d+|GC[AF]_\d+\.\d+)\b')
def acclink(kind,v):
    if not v: return None
    v=v.strip()
    m = IDRE.match(v)
    if m:
        return {'bioproject':NCBI+'bioproject/','biosample':NCBI+'biosample/','sra':NCBI+'sra/',
                'assembly':NCBI+'datasets/genome/','plastid':NCBI+'nuccore/'}[kind]+m.group(1)
    m = WGS.match(v)
    if m and kind in ('assembly','plastid'):
        return NCBI+'nuccore/'+m.group(1)
    return None

plants=[]
for r in data:
    name=s(g(r,2)) or s(g(r,0))
    tax=s(g(r,13)) or ''
    fm=FAM.search(tax)
    cal=s(g(r,12)) or ''
    mm=re.search(r'crn=(\d+)',cal); crn=mm.group(1) if mm else None
    pid=s(g(r,0))
    rawB=str(g(r,44) or '')
    failed='assembly failed' in rawB.lower()
    bloom=s(g(r,15))
    p={
      'id':pid, 'name':name,
      'genus':(name.split()[0] if name else None),
      'family':(fm.group(1) if fm else None),
      'common':s(g(r,10)),
      'cnps': pick_rank(fmt_rank(g(r,14)), rank2.get((name or '').strip().lower())),
      'voucher':s(g(r,11)),
      'bloom':bloom, 'bm':months(bloom),
      'crn':crn,
      'calflora':(f'https://www.calflora.org/app/taxon?crn={crn}' if crn else None),
      'photos':photos.get(crn) or [],
      'pc':pcred.get(crn) or [],
      'dmap':(f'https://d2yo0ezu2b1v2y.cloudfront.net/dmap/{crn}.jpg' if crn else None),
      'released':rel.get((name or '').strip().lower()),
      'failed':failed,
      'cpimg':cp_by_plant.get(pid),
      'acc':{k:s(g(r,i)) for k,i in [('bioproject',3),('biosample',4),('sra',5),('assembly',6),('plastid',7)]},
      'seq':{'files':num(g(r,16)),'gb':num(g(r,17)),'cov':num(g(r,18)),
             'proc':num(g(r,20)),'rem':num(g(r,21)),'pctRem':num(g(r,22)),
             'len':num(g(r,23)),'gc':num(g(r,24))},
      'gs':{'kmer':num(g(r,25)),'hap':num(g(r,26)),'uniq':pctf(g(r,27)),'het':num(g(r,28)),
            'kcov':num(g(r,29)),'err':num(g(r,30)),'dup':num(g(r,31)),'ploidy':s(g(r,57))},
      'asm':{'tool':s(g(r,33)),'kmer':num(g(r,34)),'contigs':num(g(r,35)),'largest':num(g(r,36)),
             'total':num(g(r,37)),'gc':num(g(r,38)),'n50':num(g(r,39)),'ng50':num(g(r,40)),
             'l50':num(g(r,41)),'lg50':num(g(r,42)),'nper100k':num(g(r,43))},
      'bV':[pctf(g(r,44+i)) for i in range(5)],
      'bE':[pctf(g(r,50+i)) for i in range(5)],
      'ann':{'masked':num(g(r,60)),'pctMasked':pctf(g(r,61)),'genes':num(g(r,63)),
             'orfs':num(g(r,68)),'tf':num(g(r,82))},
      'bc':{k:s(g(r,i)) for k,i in [('rbcL',64),('matK',65),('trnH-psbA',66),('ITS',67)]},
      'og':{'inOG':num(g(r,71)),'unass':num(g(r,72)),'pctOG':num(g(r,73)),'nOG':num(g(r,74)),
            'pctOGsp':num(g(r,75)),'spOG':num(g(r,76)),'inSpOG':num(g(r,77)),'pctSpOG':num(g(r,78))},
      'cp':{'contigs':num(g(r,84)),'seed':s(g(r,85)),'genes':num(g(r,86)),
            'quad':s(g(r,87)),'size':num(g(r,88)),'largest':num(g(r,89))},
      # Location and Contact are sanitised here: no email addresses, and no site
      # coordinates -- these are endangered plants and a precise locality is a
      # collection risk. The raw strings never enter the bundle.
      'src':(lambda t:{'label':t[0],'kind':t[1]})(_src(s(g(r,100)))),
      'coll':_coll(s(g(r,101))),
    }
    for k in ('bioproject','biosample','sra','assembly','plastid'):
        p['acc'][k+'_url']=acclink(k,p['acc'][k])
    st=[]
    st.append(bool(p['seq']['gb']))
    st.append(bool(p['gs']['hap']))
    st.append(bool(p['asm']['n50']))
    st.append(p['bV'][0] is not None)
    st.append(bool(p['ann']['genes'] or p['ann']['orfs']))
    st.append(bool(p['cp']['size']))
    # 2026-09-01: CHLOROPLAST_v2 column R was headed "Arctostaphylos montereyensis"
    # but holds the record for A. montana ssp. ravenii. RESULTS CI inherited the error.
    # Mirrors the three sheet edits made the same day; harmless once the corrected
    # workbook lands, because it sets the same values the sheet will then carry.
    if p['id'] == 'HBG025_Amonter': p['cp']['genes'] = None
    if p['id'] == 'Amont':          p['cp']['genes'] = 114.0
    p['stages']=st
    p['done']=sum(st)
    plants.append(p)

# ---- matrices ----
RINGS=json.load(open('rings.json'))
M=json.load(open('matrices.json'))
def norm(x): return re.sub(r'[^a-z]','',(x or '').lower())
byname={}; byid={}
for i,p in enumerate(plants):
    byname.setdefault(norm(p['name']),i); byid.setdefault(norm(p['id']),i)
def resolve(label):
    m=re.match(r'^(.*?)\s*\(([^)]+)\)\s*$', label or '')
    if m:
        j=byid.get(norm(m.group(2)))
        if j is not None: return j
        j=byname.get(norm(m.group(1)))
        if j is not None: return j
    return byname.get(norm(label))
for key in ('busco','barcode','tf'):
    M[key]['idx']=[resolve(l) for l in M[key]['plants']]
    miss=sum(1 for x in M[key]['idx'] if x is None)
    print(key,'unresolved',miss)
    for i,pi in enumerate(M[key]['idx']):
        if pi is not None: plants[pi].setdefault('mx',{})[key]=i

pub=Counter(p['released'] for p in plants)
print('plants',len(plants),'released',dict(pub),'failed',sum(1 for p in plants if p['failed']))
print('avg stages',round(sum(p['done'] for p in plants)/len(plants),2))
print('cp imgs linked',sum(1 for p in plants if p['cpimg']))
nr=0
for p in plants:
    r=RINGS.get(p['id'])
    if r: p['ring']=r; nr+=1
print('rings attached',nr)

# Plastid status, per plant, from the transition folder's own inventory: whether a
# circle closed, whether it is quadripartite, and whether it carries a GenBank
# annotation. Only the annotated ones have an OGDRAW figure, so this is what lets
# the page say WHY a plant has no map instead of showing a blank grey box.
# The chloroplast handover's payload is authoritative for every plant it covers:
# 179 annotated plastomes, 174 of them quadripartite. cp/allcp.json is the older,
# wider inventory and is used only for the plants the payload does not reach, so
# that a plant with no annotation can still say WHY it has no map.
CP2 = {r['c']: r for r in json.load(open('cp2/payload.json'))['rows']}
ALLCP = {x['pid']: x for x in json.load(open('cp/allcp.json'))}
for p in plants:
    r = CP2.get(p['id'])
    if r:
        p['cpst'] = {'complete': True, 'ann': True, 'quad': bool(r.get('q')),
                     'og': bool(r.get('og'))}
    else:
        a = ALLCP.get(p['id'])
        if a:
            p['cpst'] = {'complete': bool(a.get('complete')), 'ann': False,
                         'quad': bool(a.get('quad')), 'og': False}
from collections import Counter as _C
print('plastid status', dict(_C(
    ('annotated' if x['cpst']['ann'] else ('circle, unannotated' if x['cpst']['complete'] else 'did not close'))
    for x in plants if 'cpst' in x)))
print('  with an OGDRAW plate', sum(1 for x in plants if x.get('cpimg')))

# Stage 6 of the pipeline used to be "the sheet carries a plastome size", which is
# true of all 218 rows and therefore says nothing. It is now "an annotated
# plastome exists", which is what the chloroplast payload actually establishes.
for p in plants:
    p['stages'][5] = bool(p.get('cpst', {}).get('ann'))
    p['done'] = sum(p['stages'])
print('stage 6 (annotated plastome)', sum(1 for p in plants if p['stages'][5]),
      '| avg stages now', round(sum(p['done'] for p in plants)/len(plants), 2))
import datetime, os
# Derived, never a literal: the atlas states its own provenance and a hardcoded
# date silently goes stale the moment the sheet is replaced.
_src_date = datetime.date.fromtimestamp(os.path.getmtime(XL)).isoformat()
json.dump({'plants':plants,'mx':M,'built':_src_date,
           'builtOn':datetime.date.today().isoformat(),
           'copy':COPY,'refs':REFS,'tfref':TFREF,'settings':SETTINGS},
          open('bundle.json','w'), separators=(',',':'))
print('source sheet dated', _src_date)
print('bundle MB', round(os.path.getsize('bundle.json')/1e6,2))
