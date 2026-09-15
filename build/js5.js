/* ================= OVERVIEW ================= */
const CNT = {
  total: P.length,
  released: P.filter(p=>p.released===true).length,
  held: P.filter(p=>p.released===false).length,
  families: FAMS.length,
  cp: P.filter(p=>p.cp.size!=null).length,
  cpmaps: P.filter(p=>p.cpimg).length,
  asm: P.filter(p=>p.asm.n50!=null).length,
  busco: P.filter(p=>p.bV[0]!=null).length,
  failed: P.filter(p=>p.failed).length,
  bioproj: new Set(P.map(p=>p.acc.bioproject).filter(Boolean)).size,
  sra: P.filter(p=>p.acc.sra).length,
  tf: P.filter(p=>p.ann.tf!=null).length,
  genera: new Set(P.map(p=>p.genus).filter(Boolean)).size,
  // Assemblies submitted to NCBI. This used to be a hardcoded 153 because the
  // sheet's accession column read "Submitted to NCBI, processing" on 194 rows and
  // overcounted. That column has since been reconciled against the submission
  // portal record by record, so the figure is now read straight off the sheet, and
  // it still matches, exactly, the number of assemblies carried through the
  // per-gene Viridiplantae BUSCO run.
  submitted: P.filter(p=>!/not submitted/i.test(p.acc.assembly||'')).length,
  // Of those, the ones that have come back with a WGS accession we can link.
  accession: P.filter(p=>p.acc.assembly_url).length,
  // Plastome records lodged with GenBank: those awaiting processing plus those
  // awaiting processing, corrected or not. Excludes the 23 withdrawn.
  cpsub: (DATA.cp2 && DATA.cp2.meta && DATA.cp2.meta.nWithGenBank)
    ? DATA.cp2.meta.nWithGenBank
    : P.filter(p=>p.stages[5]).length,
  cpcirc: P.filter(p=>p.cpst&&p.cpst.complete).length,
  cpann: P.filter(p=>p.cpst&&p.cpst.ann).length,
  cpwait: P.filter(p=>p.cpst&&p.cpst.complete&&!p.cpst.ann).length,
  cpopen: P.filter(p=>p.cpst&&!p.cpst.complete).length,
};
const totalBases = P.reduce((t,p)=>t+(p.asm.total||0),0);
const totalGb = P.reduce((t,p)=>t+(p.seq.gb||0),0);

function buildOverview(){
  // Three rows drifting left at the same speed. They start at different points
  // in the cycle so they are not aligned, but they travel together.
  (function drift(){
    const mos = $('#mosaic'); if(!mos) return;
    const shuffled = a => a.slice().sort(() => Math.random() - 0.5);
    const ph = shuffled(P.filter(p => p.hero));
    const mp = shuffled(P.filter(p => p.cpimg && CPIMG[p.cpimg]));
    if(!ph.length) return;
    const ROWS = 3, PER = 10, GAP = 4, ACROSS = 6, SPEED = 7;  // SPEED in px/sec
    let pi = 0, mi = 0;

    const tile = kind => {
      const d = document.createElement('div');
      if(kind === 'map' && mi < mp.length){
        const p = mp[mi++];
        d.className = 'mztile mzmap'; d.title = p.name;
        const img = document.createElement('img');
        img.src = CPIMG[p.cpimg]; img.loading = 'lazy';
        img.alt = 'Chloroplast genome map of ' + p.name;
        d.appendChild(img);
      } else {
        const p = ph[pi++ % ph.length];
        d.className = 'mztile'; d.title = p.name;
        d.style.backgroundImage = "url('" + p.hero + "')";
      }
      return d;
    };

    mos.innerHTML = '';
    const tracks = [];
    for(let r = 0; r < ROWS; r++){
      const row = document.createElement('div'); row.className = 'mzrow';
      const tr  = document.createElement('div'); tr.className  = 'mztrack';
      // Offset the map slot per row, or both rows land a map in the same column.
      for(let i = 0; i < PER; i++) tr.appendChild(tile((i + r * 3) % 4 === 3 ? 'map' : 'photo'));
      // A second identical copy, so translateX(-50%) lands on the frame it started
      // on. Tiles carry their gap as margin rather than flex gap, or the halfway
      // point falls half a gap short and the loop ticks once a cycle.
      [...tr.children].forEach(n => tr.appendChild(n.cloneNode(true)));
      row.appendChild(tr); mos.appendChild(row); tracks.push(tr);
    }

    const PHASE = tracks.map(() => Math.random());
    const fit = () => {
      const w = mos.clientWidth; if(!w) return;
      const t = (w - (ACROSS - 1) * GAP) / ACROSS;
      mos.style.setProperty('--mzt', t.toFixed(2) + 'px');
      const dur = PER * (t + GAP) / SPEED;
      tracks.forEach((tr, r) => {
        tr.style.animationDuration = dur.toFixed(1) + 's';
        tr.style.animationDelay = (-dur * PHASE[r]).toFixed(1) + 's';
      });
    };
    fit();
    if(window.ResizeObserver) new ResizeObserver(fit).observe(mos);
  })();

  // The hero copy is written from the bundle rather than typed into the template,
  // so a payload swap or a re-run cannot leave a headline claim behind. The old
  // one said "218 genomes", which was never true: 218 were sequenced, 174 assembled.
  const nRare = P.filter(p => /^1B/.test(p.cnps||'')).length;
  const nAsm  = P.filter(p => p.stages[2]).length;
  const nCp   = P.filter(p => p.stages[5]).length;
  const nCirc = P.filter(p => (p.cpst||{}).complete).length;
  const nFail = CNT.failed;
  $('#heroBrow').textContent = TXT('overview.eyebrow',
    {total: CNT.total, families: CNT.families, genera: CNT.genera});
  $('#lede').innerHTML = TXT('overview.lede', {rare: nf(nRare), total: CNT.total,
    assembled: nf(nAsm), circles: nf(nCirc), annotated: nf(nCp)});

  const stats = [
    [totalGb>=1000 ? (totalGb/1000).toFixed(1)+' Tb' : nf(totalGb)+' Gb', 'raw sequence generated'],
    [CNT.total, 'plants sequenced'],
    [CNT.released, 'with sequence data released',
      CNT.held ? `the other ${CNT.held} release January 2027` : null],
    [CNT.submitted, 'nuclear assemblies submitted', `from ${CNT.asm} drafts`],
    [CNT.cpsub, 'chloroplast assemblies submitted', `from ${nCirc} closed circles`],
  ];
  $('#statgrid').innerHTML = stats.map(([v,k,sub]) =>
    `<div class="stat"><span class="v num">${esc(v)}</span><span class="k">${esc(k)}</span>${
      sub ? `<span class="s">${esc(sub)}</span>` : ''}</div>`).join('');

  const rc = {}; P.forEach(p => { const r = p.cnps||'N/A'; rc[r] = (rc[r]||0)+1; });
  const rEntries = Object.entries(rc).sort((a,b)=>rankOrder(a[0])-rankOrder(b[0]));
  const rMax = Math.max(...rEntries.map(e=>e[1]));
  $('#rankChart').innerHTML = rEntries.map(([r,n]) =>
    `<button class="rankrow" data-r="${esc(r==='N/A'?'':r)}" style="width:100%;text-align:left" title="${esc(RANKTEXT[r]||'')}">
      <span class="mono" style="font-size:12px">${esc(r)}</span>
      <span class="rb" style="width:${(n/rMax*100).toFixed(1)}%;background:${rankColor(r)}"></span>
      <span class="rn">${n}</span></button>`).join('')
    + `<p style="font-size:11.5px;color:var(--ink-3);margin:12px 0 0;line-height:1.45">${
        TXT('overview.rankchart.caption', {rare: nRare, total: CNT.total})}</p>`;
  $$('#rankChart .rankrow').forEach(b => b.onclick = () => {
    st.rank = b.dataset.r; st.fam=''; st.has=''; st.q=''; st.sel=null;
    $('#fRank').value = st.rank; $('#fFam').value=''; $('#fHas').value=''; $('#q').value='';
    go('plants'); renderWall(); });

  const STAGES = [['Sequencing &amp; QC', 0],['Genome size estimate', 1],['Chloroplast genome', 5],['Draft assembly', 2],['BUSCO completeness', 3],['Gene annotation', 4]];
  $('#funnel').innerHTML = STAGES.map(([lbl,i],step) => { const n = P.filter(p=>p.stages[i]).length;
    return `<div class="step"><span class="no">${String(step+1).padStart(2,'0')}</span><span class="lbl">${lbl}</span>
      <span class="val">${n} / ${P.length}</span><span class="trk"><i style="width:${(n/P.length*100).toFixed(1)}%"></i></span></div>`; }).join('');

  const fMax = FAMS[0][1].length;
  $('#famList').innerHTML = FAMS.slice(0,14).map(([f,a]) =>
    `<button class="rowitem" data-f="${esc(f)}"><span class="nm">${esc(f)}</span><span class="vv">${a.length}</span>
      <span class="bb"><i style="width:${(a.length/fMax*100).toFixed(1)}%"></i></span></button>`).join('')
    + `<p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0">Plus ${FAMS.length-14} more families with fewer plants each.</p>`;
  $$('#famList .rowitem').forEach(b => b.onclick = () => {
    st.fam = b.dataset.f; st.rank=''; st.has=''; st.q=''; st.sel=null;
    $('#fFam').value = st.fam; $('#fRank').value=''; $('#fHas').value=''; $('#q').value='';
    go('plants'); renderWall(); });

  const M2 = (DATA.cp2 && DATA.cp2.meta) || {nProc:0,nSubmitted:0,nWithdrawn:0,nWithGenBank:0,dupCds:0,dupRecords:0};
  $('#pending').innerHTML = [
    TXT('overview.note.embargo',   {held: CNT.held}),
    TXT('overview.note.plastomes', {annotated: CNT.cpann,
        quad: DATA.cp2 ? DATA.cp2.meta.nq : 0, waiting: CNT.cpwait}),
    TXT('overview.note.provenance',{dated: esc(DATA.built)})
  ].map(s=>`<li>${s}</li>`).join('');
}

function drawSizeHist(){
  const cvs = $('#sizeHist'); if(!cvs.offsetParent) return;
  const { g, w, h } = fit(cvs, 190);
  const vals = P.map(p => p.gs.hap).filter(v=>v!=null&&isFinite(v)&&v>0);
  const lo = Math.min(...vals), hi = Math.max(...vals), NB = 26;
  const bins = Array.from({length:NB},()=>[]);
  P.forEach(p => { const v = p.gs.hap; if(v==null||!isFinite(v)||v<=0) return;
    const i = Math.min(NB-1, Math.floor((v-lo)/((hi-lo)||1)*NB)); bins[i].push(p); });
  const mx = Math.max(...bins.map(b=>b.length));
  const pad = { l:34, r:8, t:8, b:30 };
  const iw = w-pad.l-pad.r, ih = h-pad.t-pad.b, bw = iw/NB;
  g.clearRect(0,0,w,h);
  g.strokeStyle = cv('--rule-soft'); g.fillStyle = cv('--ink-3'); g.font='10px "IBM Plex Mono",monospace';
  g.textAlign='right'; g.textBaseline='middle';
  for(let i=0;i<=3;i++){ const v = Math.round(mx/3*i), y = pad.t+ih-(v/mx)*ih;
    g.beginPath(); g.moveTo(pad.l,y); g.lineTo(pad.l+iw,y); g.stroke(); g.fillText(v, pad.l-7, y); }
  bins.forEach((b,i) => { if(!b.length) return; const bh = (b.length/mx)*ih;
    g.fillStyle = cv('--accent');
    const x = pad.l+i*bw, y = pad.t+ih-bh, r = Math.min(4, bw/2-1, bh);
    g.beginPath(); g.moveTo(x+1, pad.t+ih); g.lineTo(x+1, y+r); g.quadraticCurveTo(x+1, y, x+1+r, y);
    g.lineTo(x+bw-1-r, y); g.quadraticCurveTo(x+bw-1, y, x+bw-1, y+r); g.lineTo(x+bw-1, pad.t+ih); g.closePath(); g.fill(); });
  g.fillStyle = cv('--ink-3'); g.textAlign='center'; g.textBaseline='top'; g.font='10px "IBM Plex Mono",monospace';
  for(let i=0;i<=4;i++){ const v = lo+(hi-lo)*(i/4); g.fillText(bp(v), pad.l+iw*(i/4), pad.t+ih+8); }
  cvs.__bins = { bins, pad, bw, ih };
}
$('#sizeHist').addEventListener('mousemove', e => {
  const d = $('#sizeHist').__bins; if(!d) return;
  const b = $('#sizeHist').getBoundingClientRect();
  const i = Math.floor((e.clientX-b.left-d.pad.l)/d.bw);
  if(i<0||i>=d.bins.length||!d.bins[i].length){ hideTip(); return; }
  const list = d.bins[i];
  showTip(`<dl style="border:0"><dt style="grid-column:1/3;color:var(--ink);font-weight:600;text-align:left">${list.length} plant${list.length>1?'s':''} in this size band</dt>
    ${list.slice(0,7).map(p=>`<dt style="grid-column:1/3;text-align:left;font-style:italic">${esc(p.name)}</dt>`).join('')}
    ${list.length>7?`<dt style="grid-column:1/3;text-align:left">+ ${list.length-7} more</dt>`:''}</dl>`, e.clientX, e.clientY);
});
$('#sizeHist').addEventListener('mouseleave', hideTip);

/* ================= NOTES ================= */
$('#notesBody').innerHTML = `
<div class="panels">
  <div class="card panel" style="grid-column:1/-1">
    <h3>Where the data comes from</h3>
    <p class="note">${TXT('notes.caption.where-data-comes-from')}</p>
    <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6">${TXT('notes.sources.per-plant', {dated: esc(DATA.built)})}</p>
    <p style="font-size:13.5px;color:var(--ink-2);line-height:1.6">${TXT('notes.sources.images')}</p>
    <p style="font-size:13px;color:var(--ink-3);line-height:1.65;margin-top:12px"><b style="color:var(--ink-2)">Photographs by</b><br>${
      [...new Set(P.flatMap(p=>p.pc||[]).map(c=>c.replace(/^\d{4}\s+/,'').trim()).filter(Boolean))]
        .sort((a,b)=>a.toLowerCase().localeCompare(b.toLowerCase())).map(esc).join(' \u00b7 ')
    }</p>
    <p style="font-size:12px;color:var(--ink-3);line-height:1.55;margin-top:10px">${TXT('notes.sources.licence')}</p>
  </div>
</div>
<div class="panels"><div class="card panel" style="grid-column:1/-1">
  <h3>Where the published comparisons come from</h3>
  <p class="note">${TXT('notes.caption.comparisons')}</p>
  <div class="tblwrap"><table class="wrapcells"><thead><tr><th>Comparison</th><th>Source</th><th>What it counts</th></tr></thead><tbody>
    <tr><td>Regulator families</td><td class="mono"><a href="https://planttfdb.gao-lab.org/" target="_blank" rel="noopener">PlantTFDB v5.0</a></td>
        <td>${TXT('notes.compare.regulators', {ath: RF('tf.arabidopsis').label, vvi: RF('tf.grape').label})}</td></tr>
    <tr><td>Medicinal enzyme families</td><td class="mono"><a href="https://doi.org/10.1104/pp.104.039826" target="_blank" rel="noopener">Nelson 2004</a>, <a href="https://doi.org/10.1186/gb-2001-2-2-reviews3004" target="_blank" rel="noopener">Ross 2001</a>, <a href="https://doi.org/10.1093/gbe/evz142" target="_blank" rel="noopener">Jiang 2019</a></td>
        <td>${TXT('notes.compare.enzymes', {p450: nf(RF('chem.p450').n), ugt: nf(RF('chem.ugt').n), tps: RF('chem.tps').label})}</td></tr>
    <tr><td>Microsatellites</td><td class="mono">published genome-wide SSR survey</td>
        <td>${TXT('notes.compare.microsatellites')}</td></tr>
    <tr><td>Published corpus</td><td class="mono"><a href="https://ngdc.cncb.ac.cn/cgir/" target="_blank" rel="noopener">CGIR</a>, <a href="https://rareplants.cnps.org/search?mode=results&amp;form=advanced&amp;crpr=1B" target="_blank" rel="noopener">CNPS RPI</a></td>
        <td>${TXT('notes.compare.corpus', {cgir: nf(RF('corpus.cgir').n), cgirDate: longDate(RF('corpus.cgir').got), cnpsDate: longDate(RF('corpus.cnps.1B').got), oneB: nf(RF('corpus.cnps.1B').n), b1: nf(RF('corpus.cnps.1B.1').n), b2: nf(RF('corpus.cnps.1B.2').n), b3: nf(RF('corpus.cnps.1B.3').n)})}</td></tr>
  </tbody></table></div>
</div></div>
<div class="panels"><div class="card panel" style="grid-column:1/-1">
  <h3>Pipeline &amp; software</h3>
  <p class="note">${TXT('notes.caption.pipeline')}</p>
  <div class="tblwrap"><table>
    <thead><tr><th>Stage</th><th>Software</th><th>What it produces</th><th>Plants</th></tr></thead>
    <tbody>
      <tr><td>1 · Sequencing &amp; QC</td><td class="mono">FastQC, TrimGalore</td><td>Trimmed paired-end reads</td><td class="num">${P.filter(p=>p.stages[0]).length}</td></tr>
      <tr><td>2 · Genome size &amp; ploidy</td><td class="mono">GenomeScope, Smudgeplot</td><td>Haploid size, heterozygosity, ploidy</td><td class="num">${P.filter(p=>p.stages[1]).length}</td></tr>
      <tr><td>3 · Assembly</td><td class="mono">ABySS, QUAST</td><td>Draft nuclear contigs and metrics</td><td class="num">${P.filter(p=>p.stages[2]).length}</td></tr>
      <tr><td>3d · Completeness</td><td class="mono">BUSCO (viridiplantae, eukaryota odb10)</td><td>Per-gene completeness scores</td><td class="num">${P.filter(p=>p.stages[3]).length}</td></tr>
      <tr><td>4 · Annotation</td><td class="mono">RepeatMasker, TransDecoder, OrthoFinder, iTAK</td><td>Masked repeats, ORFs, orthogroups, transcription-factor families</td><td class="num">${P.filter(p=>p.stages[4]).length}</td></tr>
      <tr><td>5 · Plastid</td><td class="mono">GetOrganelle, GeSeq / Chloë</td><td>Complete chloroplast genome and annotation</td><td class="num">${P.filter(p=>p.stages[5]).length}</td></tr>
      <tr><td>6 · Chemistry scan</td><td class="mono">HMMER hmmsearch, Pfam-A</td><td>${TXT('notes.pipeline.chem')}</td><td class="num">${DATA.chem ? DATA.chem.rows.length : 0}</td></tr>
      <tr><td>7 · Marker scan</td><td class="mono">MISA-convention SSR search, Primer3-style design</td><td>${TXT('notes.pipeline.markers')}</td><td class="num">${DATA.ssr ? DATA.ssr.tot.plants : 0}</td></tr>
    </tbody></table></div>
</div></div>
<div class="panels"><div class="card panel" style="grid-column:1/-1">
  <h3>Reading these numbers honestly</h3>
  <ul class="pending">
    <li>${TXT('notes.honestly.draft-short-read')}</li>
    <li>${TXT('notes.honestly.counts-scale')}</li>
    <li>${TXT('notes.honestly.barcode-matches')}</li>
    <li>${TXT('notes.honestly.enzyme-proteins')}</li>
    <li>${TXT('notes.honestly.primers-designed')}</li>
    <li>${TXT('notes.honestly.measured-vs-estimated')}</li>
  </ul>
</div></div>`;

/* ================= BOOT ================= */
function redrawAll(){
  if(curView==='overview') drawSizeHist();
  if(curView==='landscape') drawScatter();
  if(curView==='busco') drawBusco();
  if(curView==='barcode') drawBarcode();
  if(curView==='tf') drawTF();
  if(curView==='bloom') drawBloom();
  if(curView==='chem') drawChem();
}
$('#fFam').innerHTML = '<option value="">All families</option>' + FAMS.map(([f,a])=>`<option value="${esc(f)}">${esc(f)} (${a.length})</option>`).join('');
const rankSet = [...new Set(P.map(p=>p.cnps).filter(Boolean))].sort((a,b)=>rankOrder(a)-rankOrder(b));
$('#fRank').innerHTML = '<option value="">All rarity ranks</option>' + rankSet.map(r=>`<option value="${esc(r)}">${esc(r)} &middot; ${P.filter(p=>p.cnps===r).length} plants</option>`).join('');
// Nav counts were previously set inside each view's draw function, so a tab that
// had not been opened yet showed a blank chip. Fill them all once, up front.
function navCounts(){
  const set = (id, v) => { const el = $(id); if(el) el.textContent = v; };
  set('#ctPlants', P.length);
  // match what drawBusco actually draws: matrix columns with at least one scored
  // cell in the default lineage set, not every plant that has a summary row
  const bg = (MX.busco.sets['Viridiplantae']||[]);
  set('#ctBusco', MX.busco.plants.filter((_,j)=>bg.some(g=>g.s[j]!=='.')).length);
  set('#ctBc', MX.barcode.plants.length);
  set('#ctTf', MX.tf.plants.length);
  set('#ctBloom', P.filter(p=>p.bm && p.bm.length).length);
  set('#ctPlast', (DATA.cp2 ? DATA.cp2.meta.n : P.filter(p=>p.cpimg).length));
}

function boot(){
  const steps = [['navCounts', navCounts], ['overview', buildOverview], ['corpus', renderCorpus], ['wall', renderWall], ['plastomes', renderPlastomes], ['plastomes2', renderPlastomes2], ['geneLoss', renderGeneLoss], ['tfCard', renderTFCard], ['tfCompare', renderTFCompare], ['buscoCard', renderBuscoCard], ['barcodeCard', renderBarcodeCard], ['chem', renderChem], ['markers', renderMarkers], ['collection', renderCollection], ['route', route], ['downloads', initDownloads]];
  for(const [name, fn] of steps){
    try{ fn(); }
    catch(err){ console.error('GBI Atlas: ' + name + ' failed', err); }
  }
}
boot();
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(redrawAll, 140); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { cssCache = {}; redrawAll(); });

/* =============== What this adds to the public record =====================
   Three published counts, each from a resource that states its own scope, put
   beside what this collection holds. Every share below is computed at the
   level of distinct taxon names, not plants, because the public counts are
   per species and several plants here are the same taxon sequenced twice.
   The caveats are not decoration: two of the three comparisons are between
   things held to different standards, and the copy says so.                 */
function renderCorpus(){
  // Published figures come from the ATLAS Comparisons tab, so each one is written
  // in the sheet once and read here, in the Method table and in the footnote below.
  const R = RF;
  const CORPUS = [
  { k:'plastome',
    label:'Chloroplast genomes',
    pubN:R('corpus.cgir').n, pubWhat:R('corpus.cgir').label,
    ours:p => p.stages[5],
    ourWhat:'taxa here with an annotated plastome',
    like:true },
  { k:'ca',
    label:'California rank 1B plants',
    pubN:R('corpus.cnps.1B').n, pubWhat:R('corpus.cnps.1B').label,
    ours:p => /^1B/.test(p.cnps||''),
    ourWhat:'rank 1B taxa here',
    like:true },
];
  const taxa = f => new Set(P.filter(p => p.name && f(p)).map(p => p.name)).size;
  const rows = CORPUS.map(c => ({ ...c, n: taxa(c.ours) }));
  const cp = rows.find(r => r.k==='plastome'), ca = rows.find(r => r.k==='ca');

  // Only the two like-for-like rows get a shared bar scale. A bar asserts comparability
  // whatever the prose underneath it says, so the nuclear row gets a card instead.
  const bar = c => {
    const pct = 100 * c.n / c.pubN;
    return '<div class="crow"><span class="ccn">' + esc(c.label)
      + '<small>' + esc(c.pubWhat) + '</small></span>'
      + '<span class="cbar pub"><span class="tr"><i style="width:100%"></i></span>'
      + '<span class="cvv">' + nf(c.pubN) + (c.floor ? '+' : '') + '</span></span>'
      + '<span class="cbar us"><span class="tr"><i style="width:'
      + Math.max(0.6, pct).toFixed(1) + '%"></i></span>'
      + '<span class="cvv">' + nf(c.n) + '</span></span></div>'
      + '<div class="crow" style="border:0;padding-top:0"><span></span><span></span>'
      + '<span style="font-size:11.5px;color:var(--ink-3)">'
      + TXT('overview.corpus.share',
             {pct: (c.floor ? '~' : '') + pct.toFixed(1), what: esc(c.ourWhat)})
      + '</span></div>';
  };

  // The threat suffix split. The two columns do different jobs, at every row.
  // Left is the published universe, so the suffix bars are drawn on the parent's
  // denominator and nest inside the 1B bar: they show how the statewide total splits.
  // Right is our coverage rate of whatever that row's universe is, so a suffix bar is
  // drawn on its OWN rank total, matching the caption beneath it. Scaling the right
  // suffix bars on the parent instead made them nest, but it put the bar and its own
  // caption on different denominators, and the eye reads the bar. A suffix bar running
  // longer than the 1B bar above it is correct: coverage of 1B.1 is better than
  // coverage of 1B overall.
  const sub = (label, note, n, pubN, scaleN) =>
    '<div class="crow csub"><span class="ccn">' + esc(label)
    + '<small>' + esc(note) + '</small></span>'
    + '<span class="cbar pub"><span class="tr"><i style="width:'
    + (100 * pubN / scaleN).toFixed(1) + '%"></i></span>'
    + '<span class="cvv">' + nf(pubN) + '</span></span>'
    + '<span class="cbar us"><span class="tr"><i style="width:'
    + Math.max(0.6, 100 * n / pubN).toFixed(1) + '%"></i></span>'
    + '<span class="cvv">' + nf(n) + '</span></span></div>'
    + '<div class="crow csub" style="border:0;padding-top:0"><span></span><span></span>'
    + '<span style="font-size:11.5px;color:var(--ink-3)">'
    + TXT('overview.corpus.suffix-share',
           {pct: (100 * n / pubN).toFixed(1), total: nf(pubN)}) + '</span></div>';

  const SUF = [
    ['1B.1', R('corpus.cnps.1B.1').label, R('corpus.cnps.1B.1').n],
    ['1B.2', R('corpus.cnps.1B.2').label, R('corpus.cnps.1B.2').n],
  ];
  const caSubs = SUF.map(([lab, note, pubN]) =>
    sub(lab, note, taxa(p => p.cnps === lab), pubN, ca.pubN)).join('')
    + '<div class="crow csub" style="border:0;padding-top:0"><span></span><span></span>'
    + '<span style="font-size:11.5px;color:var(--ink-3)">'
    + TXT('overview.corpus.remainder', {n: taxa(p => p.cnps === '1B.3'),
          label: R('corpus.cnps.1B.3').label, statewide: nf(R('corpus.cnps.1B.3').n)})
    + '</span></div>';

  $('#corpus').innerHTML =
    '<div class="cmphead"><span></span><span>already published</span><span>this collection</span></div>'
    + bar(cp) + bar(ca) + caSubs;
  $('#corpusFoot').innerHTML =
    '<b>Both rows are counted the same way on each side: distinct taxa.</b> The ' + cp.n
    + ' plastomes are closed and annotated to what CGIR counts. The 1B figures are the '
    + 'Inventory\'s own totals for each rank, not the "more than 1,000" the ranks page quotes, '
    + 'so the shares are exact rather than approximate.'
    + '<br><br><span style="color:var(--ink-3)">Sources: '
    + ['corpus.cgir','corpus.cnps.1B'].map(k => {
        const r = R(k);
        return '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.src)
             + '</a>' + (r.got ? ', retrieved ' + longDate(r.got) : '');
      }).join('. ') + '.</span>';
}
