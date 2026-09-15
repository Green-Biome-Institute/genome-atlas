const DATA = __BUNDLE__;
const CPIMG = __CPIMG__;
const P = DATA.plants, MX = DATA.mx;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
// Where the "more information" button on each plant sends people. Change here.
// Set in the ATLAS Settings tab of the master workbook, key contact.email.
const SET = DATA.settings || {};
const REF = DATA.refs || {};
const CONTACT_EMAIL = SET['contact.email'] || '';
// One published figure, one row in the sheet. RF looks it up wherever it is quoted.
const RF = k => REF[k] || {};
// MONTH_LONG, not MONTHS: js6 already declares a short-form MONTHS.
const MONTH_LONG = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
// Strings that are built in code rather than sitting in the page template. Same
// ATLAS Copy tab as everything else. Placeholders look like {n} and are filled
// from the second argument. assemble.py checks every key used here at build time,
// so a deleted row stops the build instead of rendering a blank line.
const TXT = (k, vals) => {
  let s = (DATA.copy || {})[k];
  if (s === undefined) { console.error('missing copy key: ' + k); return ''; }
  if (vals) for (const a in vals) s = s.split('{' + a + '}').join(vals[a]);
  return s;
};
const longDate = iso => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||''));
  return m ? `${+m[3]} ${MONTH_LONG[+m[2]-1]} ${m[1]}` : String(iso||'');
};
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- formatting ---------- */
const nf = n => n==null||!isFinite(n) ? null : n.toLocaleString('en-US',{maximumFractionDigits:0});
const trim = (v,d) => { const s = v.toFixed(d); return s.replace(/\.0+$/,''); };
const bp = n => { if(n==null||!isFinite(n)) return null;
  if(n>=1e9) return trim(n/1e9,2)+' Gb';
  if(n>=1e6) return trim(n/1e6, n>=1e8?0:1)+' Mb';
  if(n>=1e3) return trim(n/1e3, n>=1e5?0:1)+' kb'; return nf(n)+' bp'; };
const pc = n => n==null||!isFinite(n) ? null : n.toFixed(n<10?1:0)+'%';
const dec = (n,d=2) => n==null||!isFinite(n) ? null : n.toFixed(d);

const RANKS = ['1A','1B.1','1B.2','1B.3','2A','2B.1','2B.2','2B.3','3','4','4.2','4.3','N/A'];
const RANKVAR = {'1A':'--r1a','1B.1':'--r1b1','1B.2':'--r1b2','1B.3':'--r1b3','4':'--r4','4.2':'--r4','4.3':'--r4','3':'--r4'};
const rankColor = r => `var(${RANKVAR[r]||'--rna'})`;
const rankOrder = r => { const i = RANKS.indexOf(r); return i<0 ? 99 : i; };
const RANKTEXT = {'1A':TXT('rank.1A'), '1B.1':TXT('rank.1B.1'), '1B.2':TXT('rank.1B.2'),
                  '1B.3':TXT('rank.1B.3'), '4.2':TXT('rank.4.2'), '4.3':TXT('rank.4.3')};

/* ---------- derived ---------- */
P.forEach((p,i) => { p.i = i;
  p.gsize = p.gs.hap || p.asm.total || null;
  p.bComp = p.bV[0]!=null ? p.bV[0] : (p.bE[0]!=null ? p.bE[0] : null);
  p.hero = p.photos[0] || null;
  p.heroCredit = (p.pc && p.pc[0]) || null;
  p.search = [p.name,p.common,p.family,p.genus,p.id,p.cnps,p.acc.bioproject,p.acc.biosample,p.acc.sra,p.coll,p.src&&p.src.label].filter(Boolean).join(' ').toLowerCase();
});
const byId = Object.fromEntries(P.map(p=>[p.id,p]));
const FAM = {};
P.forEach(p => { if(p.family) (FAM[p.family] ||= []).push(p); });
const FAMS = Object.entries(FAM).sort((a,b) => b[1].length-a[1].length || a[0].localeCompare(b[0]));

/* percentile rank of a value within the non-null population of a field */
const POP = {};
function pop(key, get){ return POP[key] ||= P.map(get).filter(v=>v!=null&&isFinite(v)).sort((a,b)=>a-b); }
function pctile(arr, v){ if(v==null||!arr.length) return null;
  let lo=0,hi=arr.length; while(lo<hi){const m=(lo+hi)>>1; if(arr[m]<v) lo=m+1; else hi=m;}
  return Math.round(lo/(arr.length-1||1)*100); }

/* ---------- theme ---------- */
const root = document.documentElement;
function applyTheme(t){ if(t==='auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme',t);
  try{ localStorage.setItem('gbi-theme',t); }catch(e){}
  $('#themeLbl').textContent = t==='auto'?'Theme: auto':(t==='dark'?'Theme: dark':'Theme: light');
  requestAnimationFrame(()=>{ cssCache={}; redrawAll(); }); }
let theme='auto'; try{ theme = localStorage.getItem('gbi-theme')||'auto'; }catch(e){}
applyTheme(theme);
$('#themeBtn').onclick = () => { theme = theme==='auto'?'light':theme==='light'?'dark':'auto'; applyTheme(theme); };

let cssCache = {};
function cv(name){ return cssCache[name] ||= getComputedStyle(root).getPropertyValue(name).trim(); }

/* ---------- routing ---------- */
const VIEWS = ['overview','plants','plastomes','landscape','busco','barcode','tf','chem','markers','bloom','collection','notes'];
let curView = 'overview';
function go(v, push=true){ if(!VIEWS.includes(v)) v='overview';
  curView = v;
  $$('.view').forEach(s => s.classList.toggle('on', s.id === 'v'+'-'+v));
  $$('.navbtn').forEach(b => b.setAttribute('aria-current', b.dataset.v===v ? 'page' : 'false'));
  if(push && location.hash.slice(2).split('/')[0] !== v) location.hash = '#/'+v;
  window.scrollTo(0,0); redrawAll(); }
$$('.navbtn').forEach(b => b.onclick = () => go(b.dataset.v));

function route(){ const h = location.hash.replace(/^#\/?/,'').split('/');
  if(h[0]==='plant' && byId[decodeURIComponent(h[1]||'')]){ openPlant(byId[decodeURIComponent(h[1])], false); return; }
  closeDrawer(false); go(h[0]||'overview', false); }
addEventListener('hashchange', route);

/* ---------- wall ---------- */
const st = { q:'', fam:'', rank:'', has:'', sort:'name', sel:null };
function filtered(){
  let a = P.filter(p => {
    if(st.q && !p.search.includes(st.q)) return false;
    if(st.fam && p.family !== st.fam) return false;
    if(st.rank && p.cnps !== st.rank) return false;
    if(st.sel && !st.sel.has(p.i)) return false;
    switch(st.has){
      case 'released': return p.released === true;
      case 'held': return p.released === false;
      case 'cp': return !!p.cpimg;
      case 'cpwait': return !!(p.cpst && p.cpst.complete && !p.cpst.ann);
      case 'cpnone': return !!(p.cpst && !p.cpst.complete);
      case 'chem': return !!p.xc;
      case 'ssr': return !!p.xs;
      case 'asm': return p.asm.n50 != null;
      case 'busco': return p.bV[0] != null;
      case 'tf': return !!(p.mx && p.mx.tf != null);
      case 'failed': return p.failed;
    }
    return true; });
  const dn = (v) => v==null ? -Infinity : v;
  const S = {
    name: (a,b) => (a.name||'').localeCompare(b.name||''),
    done: (a,b) => b.done-a.done || (a.name||'').localeCompare(b.name||''),
    gs:   (a,b) => dn(b.gsize)-dn(a.gsize),
    n50:  (a,b) => dn(b.asm.n50)-dn(a.asm.n50),
    busco:(a,b) => dn(b.bComp)-dn(a.bComp),
    cpsize:(a,b)=> dn(b.cp.size)-dn(a.cp.size),
    tf:   (a,b) => dn(b.ann.tf)-dn(a.ann.tf),
    chem: (a,b) => dn(b.xc&&b.xc.tot)-dn(a.xc&&a.xc.tot),
    ssrd: (a,b) => dn(b.xs&&b.xs.dens)-dn(a.xs&&a.xs.dens),
    cpir: (a,b) => dn(b.xp&&b.xp.ir)-dn(a.xp&&a.xp.ir),
    rank: (a,b) => rankOrder(a.cnps)-rankOrder(b.cnps) || (a.name||'').localeCompare(b.name||''),
  };
  return a.sort(S[st.sort] || S.name);
}
const STAGENAMES = ['Sequencing','Genome size','Assembly','BUSCO','Annotation','Chloroplast'];
// Six pips read faster than an arc at tile size, and say WHICH stage ran, not just how many.
function pips(p){ return `<span class="pips" title="${esc(p.stages.map((v,i)=>(v?'\u2713 ':'\u2013 ')+STAGENAMES[i]).join('\n'))}" aria-label="${p.done} of 6 pipeline stages complete">`
  + p.stages.map(v=>`<i class="${v?'on':''}"></i>`).join('') + '</span>'; }
function tileHTML(p){
  const ph = p.hero ? `<div class="ph" style="background-image:url('${p.hero}')">${p.heroCredit?`<span class="phcred">\u00a9 ${esc(p.heroCredit)}</span>`:''}</div>`
    : p.dmap ? `<div class="ph map" style="background-image:url('${p.dmap}')"></div>`
    : `<div class="ph none">${esc((p.genus||'?')[0])}</div>`;
  return `<button class="tile" data-id="${esc(p.id)}">
    ${ph}${p.released===false?'<span class="lockbadge">Held</span>':''}
    <div class="meta">
      <span class="sci">${esc(p.name)}</span>
      <span class="com">${esc(p.common||'No common name')}</span>
      <span class="foot">
        <span class="chip rank" style="background:${rankColor(p.cnps)}">${esc(p.cnps||'n/a')}</span>
        ${pips(p)}
      </span>
    </div></button>`;
}
function renderWall(){
  const a = filtered();
  $('#wall').innerHTML = a.length ? a.map(tileHTML).join('') : '<p class="empty">No plants match those filters.</p>';
  $('#wallCount').textContent = a.length===P.length ? `${P.length} plants` : `${a.length} of ${P.length}`;
  $('#ctPlants').textContent = a.length;
  $$('#wall .tile').forEach(t => t.onclick = () => openPlant(byId[t.dataset.id]));
}
$('#q').oninput = e => { st.q = e.target.value.trim().toLowerCase(); renderWall(); };
$('#fFam').onchange = e => { st.fam = e.target.value; renderWall(); };
$('#fRank').onchange = e => { st.rank = e.target.value; renderWall(); };
$('#fHas').onchange = e => { st.has = e.target.value; renderWall(); };
$('#fSort').onchange = e => { st.sort = e.target.value; renderWall(); };
$('#luckyBtn').onclick = () => openPlant(P[Math.floor(Math.random()*P.length)]);
$('#csvBtn').onclick = () => {
  const rows = filtered();
  const cols = [['Plant ID','id'],['Scientific name','name'],['Common name','common'],['Family','family'],['CNPS rank','cnps'],['Bloom','bloom'],
    ['Released','released'],['BioProject',p=>p.acc.bioproject],['BioSample',p=>p.acc.biosample],['SRA',p=>p.acc.sra],
    ['Genome size (bp)',p=>p.gs.hap],['Assembly total (bp)',p=>p.asm.total],['Contigs',p=>p.asm.contigs],['N50 (bp)',p=>p.asm.n50],['L50',p=>p.asm.l50],
    ['BUSCO V complete (%)',p=>p.bV[0]],['BUSCO E complete (%)',p=>p.bE[0]],['Repeat masked (%)',p=>p.ann.pctMasked],
    ['Predicted genes',p=>p.ann.genes],['Long ORFs',p=>p.ann.orfs],['TF-like ORFs',p=>p.ann.tf],
    ['Plastome size (bp)',p=>p.cp.size],['Plastome genes',p=>p.cp.genes],['Calflora',p=>p.calflora]];
  const q = v => { v = v==null?'':String(v); return /[",\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; };
  const csv = [cols.map(c=>c[0]).join(',')].concat(rows.map(p =>
    cols.map(c => q(typeof c[1]==='function' ? c[1](p) : p[c[1]])).join(','))).join('\n');
  saveFile('gbi_genome_atlas.csv', csv);
};
/* Saving a file: inside the artifact viewer only the downloads capability can
   hand a file to the viewer; opened as a local file, a blob link is fine. */
let DL = null, dlReady = false;
// Deferred and fully guarded: nothing in the boot path may depend on this resolving,
// and a host that throws here must not take the rest of the app down with it.
function initDownloads(){
  try{
    if(window.claude && typeof window.claude.use === 'function'){
      Promise.resolve(window.claude.use('downloads'))
        .then(d => { DL = d; dlReady = true; if(!d) $('#csvBtn').style.display = 'none'; })
        .catch(() => { dlReady = true; $('#csvBtn').style.display = 'none'; });
    } else { dlReady = true; }
  }catch(e){ dlReady = true; }
}
function flash(msg){ const b = $('#csvBtn'), t = b.textContent; b.textContent = msg;
  setTimeout(() => { b.textContent = t === msg ? 'Export CSV' : t; }, 1800); }
async function saveFile(filename, text){
  if(DL){
    try { await DL.save({ filename, data: text }); flash('Saved'); }
    catch(err){ const c = err && err.code;
      flash(c === 'declined' ? 'Export CSV' : c === 'rate_limited' ? 'Try again in a moment' : 'Export unavailable'); }
    return;
  }
  if(window.claude && dlReady){ flash('Export unavailable'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type:'text/csv' }));
  a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------- derived scalars from the three payloads ----------
   The chemistry, marker and plastome payloads are merged into the bundle at
   assembly time and are keyed by the same plant id as the sheet. Flattening the
   handful of scalars each contributes onto the plant object here -- once, at
   load -- is what lets the landscape, the wall sort and the CSV export read them
   like any other measurement, and means a payload swap needs no other change. */
(function(){
  const CH = DATA.chem, SS = DATA.ssr, CP = DATA.cp2;
  if(CH){
    const fi = Object.fromEntries(CH.fams.map((f,i)=>[f,i]));
    const byc = Object.fromEntries(CH.rows.map(r=>[r.c,r]));
    for(const p of P){ const r = byc[p.id]; if(!r) continue;
      p.xc = { tot: r.v.reduce((a,b)=>a+b,0),
               fam: r.v.filter(v=>v>0).length,
               p450: r.v[fi.p450], ugt: r.v[fi.UDPGT], tps: r.v[fi.Terpene_synth],
               pks: r.v[fi.Chal_sti_synt] }; }
  }
  if(SS){
    const byc = Object.fromEntries((SS.rows||[]).map(r=>[r.c,r]));
    for(const p of P){ const r = byc[p.id]; if(!r) continue;
      const per = (SS.per||{})[p.id];
      p.xs = { ssr: r.ssr, mk: r.mk, mb: r.mb,
               dens: r.mb ? r.ssr/r.mb : null,
               mdens: r.mb ? r.mk/r.mb : null,
               short: per ? per.short : null, prov: r.q === 'prov' }; }
  }
  if(CP){
    const byc = Object.fromEntries(CP.rows.map(r=>[r.c,r]));
    for(const p of P){ const r = byc[p.id]; if(!r) continue;
      p.xp = { L: r.L, gc: r.gc, ng: r.ng, cds: r.cds, trn: r.trn, rrn: r.rrn,
               lsc: r.lsc, ssc: r.ssc, ir: r.ir, q: !!r.q,
               // submission state after the 1 September 2026 annotation repair:
               // 156 records went back to GenBank, 23 were withdrawn for reassembly
               status: r.status || null,
               // share of the molecule taken up by the two repeat copies: the one
               // plastome number that is a ratio rather than a length, and the one
               // the IR-expansion question turns on
               irs: (r.ir!=null && r.L) ? 200*r.ir/r.L : null }; }
  }
})();
