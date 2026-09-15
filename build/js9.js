
/* ================= PER-PLANT CARDS: regulators, BUSCO, barcodes =================
   The same card the chemistry, marker and plastome tabs use, applied to the three
   matrix views. A matrix answers "how does the collection look"; these answer
   "what did THIS plant get", which is the question anyone arriving from the wall
   actually has. Each reads the matrix already in the bundle -- no new data.     */

function fillSel(id, list, valOf, labOf, start){
  const sel = $(id); if(!sel) return null;
  sel.innerHTML = list.slice().sort((a,b)=>labOf(a).localeCompare(labOf(b)))
    .map(x=>`<option value="${esc(valOf(x))}">${esc(labOf(x))}</option>`).join('');
  sel.value = start != null ? start : sel.options[0] && sel.options[0].value;
  return sel;
}
const statTile = (k,v,n) => `<div class="pstat"><div class="k">${esc(k)}</div><div class="v">${v}</div><div class="sn">${esc(n||'')}</div></div>`;
const med = arr => { const a = arr.slice().sort((x,y)=>x-y); if(!a.length) return 0;
  const m = a.length>>1; return a.length%2 ? a[m] : (a[m-1]+a[m])/2; };

/* ---------------- Regulators ---------------- */
function renderTFCard(){
  if(!MX.tf || !MX.tf.families.length) return;
  const F = MX.tf.families, N = MX.tf.plants.length;
  const withTF = P.filter(p => p.mx && p.mx.tf != null);
  if(!withTF.length) return;
  // family medians across the collection, computed once
  const MEDS = F.map(f => med(f.v));
  const TOTALS = MX.tf.plants.map((_,j) => F.reduce((t,f)=>t+f.v[j],0));
  const ranked = TOTALS.slice().sort((a,b)=>b-a);
  const sel = fillSel('#tfpSel', withTF, p=>p.id, p=>p.name,
    (withTF.find(p=>p.genus==='Berberis')||withTF[0]).id);
  if(!sel) return;
  function draw(id){
    const p = byId[id]; if(!p || !p.mx || p.mx.tf==null) return;
    const j = p.mx.tf;
    const rows = F.map((f,i)=>({f:f.f, t:f.t, v:f.v[j], m:MEDS[i]})).filter(r=>r.v>0)
                  .sort((a,b)=>b.v-a.v);
    const tot = TOTALS[j], rank = ranked.indexOf(tot)+1;
    const big = rows[0];
    $('#tfpName').textContent = p.name;
    $('#tfpMeta').textContent = `${p.family||'family not recorded'} · ${rows.length} of ${F.length} families detected`;
    $('#tfpStats').innerHTML =
      statTile('Regulatory genes', nf(tot), 'transcription factors and regulators') +
      statTile('Families found', rows.length, `of ${F.length} iTAK looks for`) +
      statTile('Largest family', esc(big.f), `${nf(big.v)} genes`) +
      statTile('Rank in the set', rank + ordinal(rank), `of ${N} plants profiled`);
    const maxv = Math.max(...rows.map(r=>Math.max(r.v, r.m)));
    $('#tfpBody').innerHTML = '<div class="lab">every family found, ranked</div><div class="famcmp">' +
      rows.map(r => {
        const over = r.m>0 ? r.v/r.m : null;
        return `<div class="fcrow" title="${esc(r.f)}: ${nf(r.v)} in this plant, collection median ${nf(Math.round(r.m))}">
          <span class="fcn">${esc(r.f)}<small>${r.t==='TR'?'regulator':'transcription factor'}</small></span>
          <span class="fcbar"><i style="width:${(100*r.v/maxv).toFixed(1)}%"></i>
            <b style="left:${(100*r.m/maxv).toFixed(1)}%" title="collection median"></b></span>
          <span class="fcv">${nf(r.v)}</span>
          <span class="fcm">${over==null ? '' : (over>=1 ? '×'+over.toFixed(1) : '×'+over.toFixed(2))}</span>
        </div>`; }).join('') + '</div>';
    $('#tfpLim').innerHTML = TXT('tf.note.per-plant', {n: N});
  }
  draw(sel.value); sel.onchange = () => draw(sel.value);
}
const ordinal = n => (n%100>=11&&n%100<=13) ? 'th' : ({1:'st',2:'nd',3:'rd'}[n%10] || 'th');

/* ---------------- BUSCO ---------------- */
const bup = { set:'Viridiplantae' };
let bupCells = [];
function renderBuscoCard(){
  if(!MX.busco) return;
  const withB = P.filter(p => p.mx && p.mx.busco != null);
  if(!withB.length) return;
  const sel = fillSel('#bupSel', withB, p=>p.id, p=>p.name, withB[0].id);
  if(!sel) return;
  const NAMES = { C:'Complete', D:'Duplicated', F:'Fragmented', M:'Missing', '.':'Not scored' };
  function draw(id){
    const p = byId[id]; if(!p) return;
    const j = p.mx.busco, genes = MX.busco.sets[bup.set] || [];
    const st = genes.map(g => g.s[j]);
    const c = {C:0,D:0,F:0,M:0,'.':0}; st.forEach(x => c[x] = (c[x]||0)+1);
    const n = genes.length, pct = v => n ? (100*v/n).toFixed(1)+'%' : 'n/a';
    $('#bupName').textContent = p.name;
    $('#bupMeta').textContent = TXT('busco.meta.lineage', {set: bup.set, n: nf(n)});
    $('#bupStats').innerHTML =
      statTile('Complete', pct(c.C+c.D), `${nf(c.C+c.D)} of ${nf(n)} recovered`) +
      statTile('Duplicated', pct(c.D), `${nf(c.D)} found more than once`) +
      statTile('Fragmented', pct(c.F), `${nf(c.F)} partial`) +
      statTile('Missing', pct(c.M), `${nf(c.M)} not found`);
    // genes this assembly missed that most others recovered -- the ones a
    // fragmented draft loses rather than the ones nobody ever gets
    const cols = MX.busco.plants.length;
    const rare = genes.map((g,i) => {
      if(st[i] !== 'M') return null;
      let ok = 0, scored = 0;
      for(let k=0;k<cols;k++){ const v = g.s[k]; if(v==='.') continue; scored++; if(v==='C'||v==='D') ok++; }
      return scored ? {g:g.g, d:g.d, u:g.u, share: ok/scored} : null;
    }).filter(Boolean).filter(r=>r.share>=0.5).sort((a,b)=>b.share-a.share).slice(0,12);
    // the grid is 425 cells; the hover carries the gene's name, because a BUSCO id
    // on its own tells nobody anything
    bupCells = genes.map((g,i)=>({ g, s:st[i] }));
    $('#bupBody').innerHTML =
      '<div class="lab">' + TXT('busco.label.every-gene') + '</div>' +
      `<div class="bucells" id="bupGrid">${genes.map((g,i)=>`<i class="q${st[i]==='.'?'N':st[i]}" data-i="${i}"></i>`).join('')}</div>` +
      `<div class="bulegend"><span><i class="qC"></i>Complete</span><span><i class="qD"></i>Duplicated</span><span><i class="qF"></i>Fragmented</span><span><i class="qM"></i>Missing</span></div>` +
      (rare.length ? `<div class="lab" style="margin-top:22px">${TXT('busco.label.missed-here', {n: rare.length, of: c.M>rare.length ? ' of '+c.M+' misses' : ''})}</div>` +
        '<div class="misslist">' + rare.map(r =>
          `<a class="missrow" href="${r.u||'#'}" target="_blank" rel="noopener">
            <span class="mgn">${esc(r.d || r.g)}<small class="mono">${esc(r.g)}</small></span>
            <span class="mbar"><i style="width:${(100*r.share).toFixed(1)}%"></i></span>
            <span class="mpc">${Math.round(100*r.share)}%</span></a>`).join('') +
        '</div><p class="foot" style="margin:12px 0 0">' + TXT('busco.foot.percentage') + '</p>' : (c.M ? '<p class="foot" style="margin-top:20px">All ' + c.M + ' genes this assembly '+
          'missed are ones most other assemblies also miss, so nothing here is a gap unique to this draft.</p>' : ''));
    $('#bupLim').innerHTML = TXT('busco.note.per-plant');
  }
  draw(sel.value); sel.onchange = () => draw(sel.value);
  // delegated so it survives every redraw of the grid
  const body = $('#bupBody');
  body.addEventListener('mousemove', ev => {
    const cell = ev.target.closest('#bupGrid i'); if(!cell){ hideTip(); return; }
    const r = bupCells[+cell.dataset.i]; if(!r) return;
    showTip(`<div class="th"><div><div class="tn" style="font-style:normal;font-family:'IBM Plex Sans',sans-serif;font-size:13px">${esc(r.g.d || r.g.g)}</div>
      <div class="tc mono">${esc(r.g.g)}</div></div></div>
      <dl><dt>In this assembly</dt><dd style="color:${cv(QC[r.s]||'--ink-3')}">${esc(NAMES[r.s]||'not reported')}</dd></dl>`,
      ev.clientX, ev.clientY);
  });
  body.addEventListener('mouseleave', hideTip);
  $$('#bupSet button').forEach(b => b.onclick = () => { bup.set = b.dataset.s;
    $$('#bupSet button').forEach(o => o.setAttribute('aria-pressed', String(o===b)));
    draw(sel.value); });
}

/* ---------------- Barcodes ---------------- */
function renderBarcodeCard(){
  if(!MX.barcode) return;
  const withBc = P.filter(p => p.mx && p.mx.barcode != null);
  if(!withBc.length) return;
  const prs = MX.barcode.primers, cols = MX.barcode.plants.length;
  // universality, over the assemblies actually tested
  const UNI = prs.map(pr => pr.v.filter(v => v>0).length / cols);
  const sel = fillSel('#bcpSel', withBc, p=>p.id, p=>p.name, withBc[0].id);
  if(!sel) return;
  function draw(id){
    const p = byId[id]; if(!p) return;
    const j = p.mx.barcode;
    const hits = prs.map((pr,i) => ({...pr, n:pr.v[j], uni:UNI[i]}));
    const nHit = hits.filter(h=>h.n>0).length;
    const byLoc = {};
    hits.forEach(h => (byLoc[h.grp||'other'] ||= []).push(h));
    const loci = Object.keys(byLoc);
    const lociHit = loci.filter(g => byLoc[g].some(h=>h.n>0));
    const src = (MX.barcode.src||[])[j] || 'v2 sheet';
    $('#bcpName').textContent = p.name;
    $('#bcpMeta').textContent = `${lociHit.length} of ${loci.length} barcode loci reachable · counts from the ${src}`;
    $('#bcpStats').innerHTML =
      statTile('Primers that bind', nHit, `of ${prs.length} tested`) +
      statTile(TXT('barcode.tile.loci-exact-match'), lociHit.length + ' of ' + loci.length, lociHit.join(', ') || 'none') +
      statTile('Total binding sites', nf(hits.reduce((t,h)=>t+h.n,0)), 'exact matches in the assembly') +
      statTile('Best-supported locus', esc(lociHit.sort((a,b)=>byLoc[b].filter(h=>h.n>0).length-byLoc[a].filter(h=>h.n>0).length)[0] || 'none'),
               'most primers binding');
    $('#bcpBody').innerHTML = '<div class="lab">primer by primer, locus by locus</div>' +
      '<div class="bcgrid2">' + loci.map(g => {
        const rows = byLoc[g].slice().sort((a,b)=>b.n-a.n || b.uni-a.uni);
        const hit = rows.filter(r=>r.n>0).length;
        return `<div class="bcbox2"><div class="bh">${esc(g)}<span class="chip ghost">${hit} of ${rows.length}</span></div>` +
          rows.map(r => `<div class="bcrow${r.n>0?' on':''}" title="${esc(r.seq||'')}">
            <span class="bp2 mono">${esc(r.p)}</span>
            <span class="bu"><i style="width:${(100*r.uni).toFixed(1)}%"></i></span>
            <span class="bn mono">${r.n>0?nf(r.n):'0'}</span></div>`).join('') + '</div>'; }).join('') +
      '</div>';
    $('#bcpLim').innerHTML = TXT('barcode.note.per-plant');
  }
  draw(sel.value); sel.onchange = () => draw(sel.value);
}
