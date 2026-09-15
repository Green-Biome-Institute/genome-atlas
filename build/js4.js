/* ================= BUSCO MATRIX ================= */
const QC = { C:'--q-comp', D:'--q-dup', F:'--q-frag', M:'--q-miss', '.':'--rule-soft' };
const QNAME = { C:'Complete', D:'Duplicated', F:'Fragmented', M:'Missing', '.':'Not scored' };
const bu = { set:'Viridiplantae', sortP:'complete', sortG:'missing', wide:false, cells:null };
$$('#bSet button').forEach(b => b.onclick = () => {
  $$('#bSet button').forEach(x => x.setAttribute('aria-pressed', String(x===b)));
  bu.set = b.dataset.s; drawBusco(); });
$('#bSortP').onchange = e => { bu.sortP = e.target.value; drawBusco(); };
$('#bSortG').onchange = e => { bu.sortG = e.target.value; drawBusco(); };

function buscoModel(){
  const genes = MX.busco.sets[bu.set] || [];
  // A plant can be scored against one lineage set and not the other, so the column
  // list is per set. An unscored plant is left out rather than drawn as a grey band.
  const allIdx = MX.busco.idx;
  const cols = [];
  for(let j=0;j<allIdx.length;j++){
    for(const gn of genes){ if(gn.s[j] !== '.'){ cols.push(j); break; } }
  }
  const idx = cols.map(j => allIdx[j]), n = cols.length;
  const at = (gn,i) => gn.s[cols[i]];
  const stat = genes.map(gn => { let c=0,d=0,f=0,m=0;
    for(let i=0;i<n;i++){ const s = at(gn,i); if(s==='C')c++; else if(s==='D')d++; else if(s==='F')f++; else if(s==='M')m++; }
    return {c,d,f,m,scored:c+d+f+m}; });
  const pStat = idx.map((_,i) => { let c=0,sc=0;
    for(const gn of genes){ const s = at(gn,i); if(s==='.') continue; sc++; if(s==='C'||s==='D') c++; }
    return sc? c/sc : 0; });
  let gOrder = genes.map((_,i)=>i);
  if(bu.sortG==='missing') gOrder.sort((a,b) => (stat[b].m+stat[b].f)-(stat[a].m+stat[a].f));
  else if(bu.sortG==='complete') gOrder.sort((a,b) => (stat[b].c+stat[b].d)-(stat[a].c+stat[a].d));
  let pOrder = idx.map((_,j)=>j);
  const plantOf = j => P[idx[j]];
  // a plant is a barcode gap if it is assembled and BUSCO-scored but has no
  // column in the barcode matrix
  const noBc = idx.map(pi => { const p = P[pi]; return !(p && p.mx && p.mx.barcode !== undefined); });
  if(bu.sortP==='complete') pOrder.sort((a,b) => pStat[b]-pStat[a]);
  else if(bu.sortP==='name') pOrder.sort((a,b) => (plantOf(a).name||'').localeCompare(plantOf(b).name||''));
  else if(bu.sortP==='barcode') pOrder.sort((a,b) => (noBc[b]-noBc[a]) || (pStat[b]-pStat[a]));
  else pOrder.sort((a,b) => ((plantOf(a).family||'zz')+plantOf(a).name).localeCompare((plantOf(b).family||'zz')+plantOf(b).name));
  return { genes, idx, cols, at, stat, pStat, gOrder, pOrder, plantOf, noBc };
}
function drawBusco(){
  const cvs = $('#buscoCv'); if(!cvs.offsetParent) return;
  const M = buscoModel(), { genes, gOrder, pOrder, stat, plantOf, noBc, at } = M;
  const rows = gOrder.length, cols = pOrder.length;
  const names = pOrder.map(j => plantOf(j).name || '');
  const band = bu.wide ? labelBand(names) : 8;
  const H = Math.min(720, Math.max(340, rows*1.35)) + (bu.wide ? band : 0);
  wideOn(cvs, bu.wide);
  const pad = { l:8, t:34, r:8, b:band };
  const { g, w, h } = fitX(cvs, H, bu.wide ? pad.l+pad.r+cols*WIDE_CELL : 0);
  const cw = (w-pad.l-pad.r)/cols, ch = (h-pad.t-pad.b)/rows;
  g.clearRect(0,0,w,h);
  for(let ri=0; ri<rows; ri++){ const gn = genes[gOrder[ri]];
    for(let ci=0; ci<cols; ci++){ const s = at(gn, pOrder[ci]);
      g.fillStyle = cv(QC[s]||'--rule-soft');
      g.fillRect(pad.l+ci*cw, pad.t+ri*ch, Math.max(1,cw-(cw>3?0.6:0)), Math.max(1,ch-(ch>3?0.4:0))); } }
  // marker strip: which of these assemblies still have no barcode result
  const nGap = noBc.filter(Boolean).length;
  for(let ci=0; ci<cols; ci++){
    if(!noBc[pOrder[ci]]) continue;
    g.fillStyle = cv('--q-frag');
    g.fillRect(pad.l+ci*cw, pad.t-9, Math.max(1.5,cw-(cw>3?0.6:0)), 6);
  }
  g.fillStyle = cv('--ink-3'); g.font='600 10px "IBM Plex Sans",sans-serif'; g.textAlign='left'; g.textBaseline='alphabetic';
  g.fillText(`${cols} ASSEMBLIES \u2192`, pad.l, 13);
  g.textAlign='right'; g.fillText(`${rows} ${bu.set.toUpperCase()} ORTHOLOGUES \u2193`, w-pad.r, 13);
  if(bu.wide) colLabels(g, i => pad.l+i*cw+cw/2, pad.t+rows*ch+9, names, i => noBc[pOrder[i]]);
  $('#ctBusco').textContent = cols;
  $('#buGap').innerHTML = !nGap ? '' :
    `<div class="card panel" style="padding:16px 18px;margin-top:14px">
       <h4>Awaiting a barcode search <span style="color:var(--ink-3);font-weight:500">&middot; ${nGap}</span></h4>
       <p style="font-size:11.5px;color:var(--ink-3);margin:0 0 8px;line-height:1.45">Assembled and BUSCO-scored, but with no column in the barcode matrix. The search needs only the assembly, so every one of these can be run today.</p>
       ${pOrder.filter(j=>noBc[j]).map(j=>{ const p=plantOf(j);
         return `<div class="rowitem"><span class="nm">${esc(p.name)}</span><span class="vv mono" style="font-size:10.5px">${esc(p.id)}</span></div>`; }).join('')}
     </div>`;
  bu.cells = { pad, cw, ch, rows, cols, M };
  const worst = gOrder.slice(0, 14).map(i => ({ gn:genes[i], s:stat[i] }));
  $('#buscoTop').innerHTML = worst.map(({gn,s}) => { const miss = s.scored? (s.m+s.f)/s.scored : 0;
    return `<a class="rowitem" href="${gn.u||'#'}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit" title="${esc(gn.d||'')}">
      <span class="nm">${esc(gn.d || gn.g)}</span><span class="vv">${Math.round(miss*100)}%</span>
      <span class="bb"><i style="width:${(miss*100).toFixed(1)}%;background:var(--q-frag)"></i></span></a>`; }).join('')
    + `<p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0;line-height:1.45">${TXT('busco.caption.missing-share')}</p>`;
}
(function(){
  const cvs = $('#buscoCv');
  cvs.addEventListener('mousemove', e => {
    if(!bu.cells) return; const b = cvs.getBoundingClientRect();
    const { pad, cw, ch, rows, cols, M } = bu.cells;
    const ci = Math.floor((e.clientX-b.left-pad.l)/cw), ri = Math.floor((e.clientY-b.top-pad.t)/ch);
    if(ci<0||ci>=cols||ri<0||ri>=rows){ hideTip(); return; }
    const gn = M.genes[M.gOrder[ri]], p = M.plantOf(M.pOrder[ci]), s = M.at(gn, M.pOrder[ci]);
    const stt = M.stat[M.gOrder[ri]];
    showTip(`<div class="th"><div><div class="tn" style="font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:12px">${esc(gn.g)}</div>
      <div class="tc">${esc(gn.d||'')}</div></div></div>
      <dl><dt>Plant</dt><dd style="font-style:italic">${esc(p.name)}</dd>
      <dt>Status</dt><dd style="color:${cv(QC[s]||'--ink-3')}">${esc(QNAME[s]||'not reported')}</dd>
      <dt>Complete across set</dt><dd>${stt.scored?Math.round((stt.c+stt.d)/stt.scored*100):0}%</dd></dl>`, e.clientX, e.clientY);
  });
  cvs.addEventListener('mouseleave', hideTip);
  cvs.addEventListener('click', e => { if(!bu.cells) return; const b = cvs.getBoundingClientRect();
    const { pad, cw, cols, M } = bu.cells; const ci = Math.floor((e.clientX-b.left-pad.l)/cw);
    if(ci>=0&&ci<cols) openPlant(M.plantOf(M.pOrder[ci])); });
})();

/* ================= BARCODE ================= */
const bc = { grp:null, wide:false };
const BCG = [...new Set(MX.barcode.primers.map(p=>p.grp).filter(Boolean))];
bc.grp = BCG[0];
$('#bcGrp').innerHTML = BCG.map(g=>`<button data-g="${esc(g)}" aria-pressed="${g===bc.grp}">${esc(g)}</button>`).join('');
$$('#bcGrp button').forEach(b => b.onclick = () => {
  $$('#bcGrp button').forEach(x=>x.setAttribute('aria-pressed', String(x===b))); bc.grp = b.dataset.g; drawBarcode(); });

function drawBarcode(){
  const cvs = $('#bcCv'); if(!cvs.offsetParent) return;
  const prs = MX.barcode.primers.filter(p => p.grp === bc.grp);
  const idx = MX.barcode.idx;
  // All 144 columns carry a result: 76 from the v2 sheet, 68 from the instance harvest.
  // The sheet's 18 empty placeholder columns are dropped upstream, not drawn as zeros.
  const tested = MX.barcode.tested || idx.map((_,j)=>j);
  const cols = tested.length;
  const uni = prs.map(p => tested.filter(j=>p.v[j]>0).length / (cols||1));
  const order = prs.map((_,i)=>i).sort((a,b) => uni[b]-uni[a]);
  const pOrder = tested.slice().sort((a,b) => {
    const sa = prs.reduce((t,p)=>t+(p.v[a]>0?1:0),0), sb = prs.reduce((t,p)=>t+(p.v[b]>0?1:0),0);
    return sb-sa; });
  const rows = order.length;
  const bcName = j => (P[idx[j]] && P[idx[j]].name) || MX.barcode.plants[j] || '';
  const names = pOrder.map(bcName);
  const band = bc.wide ? labelBand(names) : 10;
  const H = Math.max(180, Math.min(620, rows*22+40)) + (bc.wide ? band : 0);
  wideOn(cvs, bc.wide);
  const pad = { l:112, t:26, r:10, b:band };
  const { g, w, h } = fitX(cvs, H, bc.wide ? pad.l+pad.r+cols*WIDE_CELL : 0);
  const cw = (w-pad.l-pad.r)/(cols||1), ch = (h-pad.t-pad.b)/(rows||1);
  g.clearRect(0,0,w,h);
  const maxv = Math.max(1, ...prs.flatMap(p=>p.v));
  for(let ri=0; ri<rows; ri++){ const pr = prs[order[ri]];
    g.fillStyle = cv('--ink-2'); g.font='500 11px "IBM Plex Mono",monospace'; g.textAlign='right'; g.textBaseline='middle';
    g.fillText(pr.p.length>15?pr.p.slice(0,14)+'…':pr.p, pad.l-9, pad.t+ri*ch+ch/2);
    for(let ci=0; ci<cols; ci++){ const v = pr.v[pOrder[ci]];
      g.fillStyle = v>0 ? seqColor(Math.min(1, 0.35 + (v/maxv)*0.65)) : cv('--rule-soft');
      g.fillRect(pad.l+ci*cw, pad.t+ri*ch+1, Math.max(1,cw-0.7), Math.max(2,ch-3)); } }
  g.fillStyle = cv('--ink-3'); g.font='600 10px "IBM Plex Sans",sans-serif'; g.textAlign='left'; g.textBaseline='alphabetic';
  g.fillText(`${cols} GENOMES TESTED →`, pad.l, 15);
  g.textAlign='right'; g.fillText(`${rows} ${bc.grp.toUpperCase()} PRIMERS ↓`, w-pad.r, 15);
  if(bc.wide) colLabels(g, i => pad.l+i*cw+cw/2, pad.t+rows*ch+9, names,
                        i => ((MX.barcode.src||[])[pOrder[i]] || 'v2 sheet') !== 'v2 sheet');
  bc.cells = { pad, cw, ch, rows, cols, prs, order, pOrder, idx };
  $('#bcCount').textContent = `${MX.barcode.primers.length} unique primers across ${BCG.length} loci, searched in ${cols} assemblies`;
  $('#ctBc').textContent = cols;
  // R and Y are IUPAC ambiguity codes (A/G and C/T), not bases. The search matched them
  // as literal characters, so their 0% is an artefact of the method, not a property of the
  // primer. They are shown, named as not evaluated, and kept out of the ranking.
  const DEGEN = /[RYSWKMBDHVN]/;
  const rank = order.filter(i => !DEGEN.test(prs[i].seq||''));
  const skipped = order.filter(i => DEGEN.test(prs[i].seq||''));
  $('#bcTop').innerHTML = rank.slice(0,16).map(i => { const pr = prs[i], u = uni[i];
    return `<div class="rowitem" title="${esc(pr.seq||'')}"><span class="nm mono" style="font-size:11.5px">${esc(pr.p)}</span>
      <span class="vv">${Math.round(u*100)}%</span><span class="bb"><i style="width:${(u*100).toFixed(1)}%"></i></span></div>`; }).join('')
    + (skipped.length ? `<div class="rowitem" style="opacity:.55;margin-top:8px;border-top:1px solid var(--rule-soft);padding-top:9px">
        <span class="nm mono" style="font-size:11.5px">${skipped.map(i=>esc(prs[i].p)).join(', ')}</span>
        <span class="vv" style="font-size:10px;letter-spacing:.06em">NOT EVALUATED</span><span class="bb"></span></div>
      <p style="font-size:11.5px;color:var(--ink-3);margin:7px 0 0;line-height:1.45">${skipped.length} primer${skipped.length===1?'':'s'} carry IUPAC ambiguity codes (R = A or G, Y = C or T). The search read them as literal letters, so their result is a property of the method rather than of the primer. They are excluded from the ranking until the search is re-run with ambiguity-aware matching.</p>` : '')
    + `<p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0;line-height:1.45">The bar is how many of the tested assemblies contain an exact match to that primer. One near 100% would be the first to try across this flora; one near zero would need redesigning. Neither has been run at a bench.</p>`;
}
(function(){
  const cvs = $('#bcCv');
  cvs.addEventListener('mousemove', e => {
    if(!bc.cells) return; const b = cvs.getBoundingClientRect();
    const { pad, cw, ch, rows, cols, prs, order, pOrder, idx } = bc.cells;
    const ci = Math.floor((e.clientX-b.left-pad.l)/cw), ri = Math.floor((e.clientY-b.top-pad.t)/ch);
    if(ci<0||ci>=cols||ri<0||ri>=rows){ hideTip(); return; }
    const pr = prs[order[ri]], p = P[idx[pOrder[ci]]], v = pr.v[pOrder[ci]];
    showTip(`<div class="th"><div><div class="tn" style="font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:12px">${esc(pr.p)}</div>
      <div class="tc mono" style="word-break:break-all">${esc((pr.seq||'').slice(0,44))}</div></div></div>
      <dl><dt>Locus</dt><dd>${esc(pr.grp)}</dd><dt>Plant</dt><dd style="font-style:italic">${esc(p.name)}</dd>
      <dt>Exact matches</dt><dd>${v}</dd></dl>`, e.clientX, e.clientY);
  });
  cvs.addEventListener('mouseleave', hideTip);
  cvs.addEventListener('click', e => { if(!bc.cells) return; const b = cvs.getBoundingClientRect();
    const { pad, cw, cols, pOrder, idx } = bc.cells; const ci = Math.floor((e.clientX-b.left-pad.l)/cw);
    if(ci>=0&&ci<cols) openPlant(P[idx[pOrder[ci]]]); });
})();

/* ================= TF ================= */
const tf = { mode:'all', sortP:'total', wide:false };
$$('#tfMode button').forEach(b => b.onclick = () => {
  $$('#tfMode button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); tf.mode = b.dataset.m; drawTF(); });
$('#tfSortP').onchange = e => { tf.sortP = e.target.value; drawTF(); };

function drawTF(){
  const cvs = $('#tfCv'); if(!cvs.offsetParent) return;
  const idx = MX.tf.idx, fams = MX.tf.families;
  let cols = idx.map((_,j)=>j);
  if(tf.mode !== 'all') cols = cols.filter(j => P[idx[j]].genus === tf.mode);
  const totals = {}; cols.forEach(j => totals[j] = fams.reduce((t,f)=>t+(f.v[j]||0),0));
  cols.sort(tf.sortP==='total' ? (a,b)=>totals[b]-totals[a] : (a,b)=>(P[idx[a]].name||'').localeCompare(P[idx[b]].name||''));
  const fTot = fams.map(f => cols.reduce((t,j)=>t+(f.v[j]||0),0));
  const fOrder = fams.map((_,i)=>i).sort((a,b)=>fTot[b]-fTot[a]).slice(0,44);
  const rows = fOrder.length, nc = cols.length;
  const names = cols.map(j => (P[idx[j]] && P[idx[j]].name) || '');
  const band = tf.wide ? labelBand(names) : 10;
  const H = Math.max(300, Math.min(700, rows*14+46)) + (tf.wide ? band : 0);
  wideOn(cvs, tf.wide);
  const pad = { l:132, t:26, r:10, b:band };
  const { g, w, h } = fitX(cvs, H, tf.wide ? pad.l+pad.r+nc*WIDE_CELL : 0);
  const cw = (w-pad.l-pad.r)/(nc||1), ch = (h-pad.t-pad.b)/(rows||1);
  g.clearRect(0,0,w,h);
  for(let ri=0; ri<rows; ri++){ const f = fams[fOrder[ri]];
    const rowMax = Math.max(1, ...cols.map(j=>f.v[j]||0));
    if(ch>=9){ g.fillStyle = cv('--ink-2'); g.font='500 10.5px "IBM Plex Sans",sans-serif'; g.textAlign='right'; g.textBaseline='middle';
      g.fillText(f.f.length>19?f.f.slice(0,18)+'…':f.f, pad.l-9, pad.t+ri*ch+ch/2); }
    for(let ci=0; ci<nc; ci++){ const v = f.v[cols[ci]]||0;
      g.fillStyle = v>0 ? seqColor(v/rowMax) : cv('--rule-soft');
      g.fillRect(pad.l+ci*cw, pad.t+ri*ch+0.5, Math.max(1,cw-0.6), Math.max(1.5,ch-1.6)); } }
  g.fillStyle = cv('--ink-3'); g.font='600 10px "IBM Plex Sans",sans-serif'; g.textAlign='left'; g.textBaseline='alphabetic';
  g.fillText(`${nc} PLANTS →`, pad.l, 15);
  g.textAlign='right'; g.fillText(`TOP ${rows} TF FAMILIES ↓`, w-pad.r, 15);
  if(tf.wide) colLabels(g, i => pad.l+i*cw+cw/2, pad.t+rows*ch+9, names,
                        i => P[idx[cols[i]]] && P[idx[cols[i]]].genus === 'Arctostaphylos');
  tf.cells = { pad, cw, ch, rows, nc, fams, fOrder, cols, idx };
  $('#tfCount').textContent = `${nc} plants · ${fams.length} families detected · shaded within each row`;
  $('#ctTf').textContent = nc;
  const maxT = Math.max(1, ...fOrder.map(i=>fTot[i]));
  $('#tfTop').innerHTML = fOrder.slice(0,16).map(i =>
    `<div class="rowitem"><span class="nm">${esc(fams[i].f)}</span><span class="vv">${nf(fTot[i])}</span>
      <span class="bb"><i style="width:${(fTot[i]/maxT*100).toFixed(1)}%"></i></span></div>`).join('')
    + `<p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0;line-height:1.45">Each bar is the total number of predicted regulator-like ORFs in that family, across the plants shown. Counts come from draft assemblies, so they track assembly quality as well as biology. Compare within a genus rather than across distant families.</p>`;
}
(function(){
  const cvs = $('#tfCv');
  cvs.addEventListener('mousemove', e => {
    if(!tf.cells) return; const b = cvs.getBoundingClientRect();
    const { pad, cw, ch, rows, nc, fams, fOrder, cols, idx } = tf.cells;
    const ci = Math.floor((e.clientX-b.left-pad.l)/cw), ri = Math.floor((e.clientY-b.top-pad.t)/ch);
    if(ci<0||ci>=nc||ri<0||ri>=rows){ hideTip(); return; }
    const f = fams[fOrder[ri]], p = P[idx[cols[ci]]];
    showTip(plantTip(p, [['TF family', f.f], ['Members predicted', nf(f.v[cols[ci]]||0)],
      ['Total TF-like ORFs', p.ann.tf!=null?nf(p.ann.tf):'n/a']]), e.clientX, e.clientY);
  });
  cvs.addEventListener('mouseleave', hideTip);
  cvs.addEventListener('click', e => { if(!tf.cells) return; const b = cvs.getBoundingClientRect();
    const { pad, cw, nc, cols, idx } = tf.cells; const ci = Math.floor((e.clientX-b.left-pad.l)/cw);
    if(ci>=0&&ci<nc) openPlant(P[idx[cols[ci]]]); });
})();

/* =============== Regulators: beside two finished genomes ==================
   Published counts are PlantTFDB v5.0 species pages for Arabidopsis thaliana
   (2,296 TFs) and Vitis vinifera (1,276 TFs). Names differ between iTAK, which
   produced our counts, and PlantTFDB, so the pairing below is by hand and only
   for families where the two clearly mean the same thing. Where the rules
   genuinely disagree the row is marked rather than dropped.                  */
// Per-family published counts come from the ATLAS Regulators tab of the master
// workbook: [iTAK family, PlantTFDB family, Arabidopsis, grape, note].
const TFREF = (DATA.tfref || []).map(r => [r[0], r[1], r[2], r[3], r[4] || null]);

function renderTFCompare(){
  const F = MX.tf.families, byName = {};
  F.forEach(f => { byName[f.f] = f; });
  const med = f => { const v = (byName[f]||{v:[]}).v.filter(x=>x); if(!v.length) return null;
    const s = v.slice().sort((a,b)=>a-b); const m = s.length>>1;
    return s.length%2 ? s[m] : Math.round((s[m-1]+s[m])/2); };
  const rows = TFREF.map(r => ({ n:r[0], ref:r[1], a:r[2], v:r[3], us:med(r[0]), flag:r[4] }))
                    .filter(r => r.us != null);
  const max = Math.max(...rows.map(r => Math.max(r.a, r.v, r.us)));
  const bar = (val, cls) => '<span class="cbar '+cls+'"><span class="tr"><i style="width:'
    + (100*val/max).toFixed(1) + '%"></i></span><span class="cvv">' + nf(val) + '</span></span>';
  $('#tfCmp').innerHTML = rows.map(r =>
    '<div class="crow c4"><span class="ccn">' + esc(r.n)
      + (r.flag ? '<small>counted differently by the two tools</small>'
                : (r.ref !== r.n ? '<small>PlantTFDB: ' + esc(r.ref) + '</small>' : ''))
    + '</span>' + bar(r.a,'ref') + bar(r.v,'ref') + bar(r.us,'us') + '</div>').join('');

  const agree = rows.filter(r => !r.flag);
  const within = agree.filter(r => r.us >= Math.min(r.a,r.v)*0.5 && r.us <= Math.max(r.a,r.v)*2).length;
  $('#tfCmpFoot').innerHTML = TXT('tf.footnote.comparison',
    {plants: MX.tf.plants.length, agree: agree.length, within: within});
}
