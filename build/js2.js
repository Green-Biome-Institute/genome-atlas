/* ================= DETAIL DRAWER ================= */
function mt(k, v, pctlArr, raw){
  const has = v!=null && v!=='';
  let extra = '';
  if(has && pctlArr){ const q = pctile(pctlArr, raw);
    if(q!=null) extra = `<div class="pctl"><i style="left:calc(${q}% - 1.5px)"></i></div><div class="rk">${q}th percentile of ${pctlArr.length}</div>`; }
  return `<div class="mt"><span class="k">${esc(k)}</span>
    <span class="v${has?'':' na'}">${has?esc(v):'not run'}</span>${extra}</div>`;
}
function donut(label, arr, total){
  const [C,S,D,F,M] = arr;
  if(C==null) return '';
  const segs = [['Complete, single-copy', S, 'var(--q-comp)'],['Duplicated', D, 'var(--q-dup)'],['Fragmented', F, 'var(--q-frag)'],['Missing', M, 'var(--q-miss)']]
    .filter(s => s[1]!=null && s[1] > 0);
  const r = 26, c = 2*Math.PI*r; let off = 0;
  const paths = segs.map(([n,v,col]) => { const len = c*(v/100); const el =
    `<circle cx="34" cy="34" r="${r}" fill="none" stroke="${col}" stroke-width="11" stroke-dasharray="${Math.max(0,len-2).toFixed(2)} ${(c-Math.max(0,len-2)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 34 34)"><title>${esc(n)}: ${v}%</title></circle>`;
    off += len; return el; }).join('');
  return `<div class="donut"><svg width="68" height="68" viewBox="0 0 68 68">${paths}</svg>
    <div class="dl"><b>${C}% complete</b><span>${label}</span>
    <span style="color:var(--ink-3);font-size:10.5px">${total?nf(total)+' orthologues searched':''}</span></div></div>`;
}
function bloomRing(months){
  if(!months || !months.length) return '';
  const set = new Set(months), L='JFMAMJJASOND'.split('');
  const cells = L.map((ch,i) => { const on = set.has(i+1); const a = (i/12)*2*Math.PI - Math.PI/2, b = ((i+1)/12)*2*Math.PI - Math.PI/2;
    const R=25, r=15, cx=28, cy=28;
    const p = [cx+R*Math.cos(a),cy+R*Math.sin(a),cx+R*Math.cos(b),cy+R*Math.sin(b),cx+r*Math.cos(b),cy+r*Math.sin(b),cx+r*Math.cos(a),cy+r*Math.sin(a)].map(n=>n.toFixed(2));
    return `<path d="M${p[0]},${p[1]} A${R},${R} 0 0 1 ${p[2]},${p[3]} L${p[4]},${p[5]} A${r},${r} 0 0 0 ${p[6]},${p[7]} Z" fill="${on?'var(--accent)':'var(--sunken)'}"/>`;
  }).join('');
  const labs = L.map((ch,i) => { const a = ((i+0.5)/12)*2*Math.PI - Math.PI/2;
    return `<text x="${(28+32*Math.cos(a)).toFixed(1)}" y="${(28+32*Math.sin(a)+2.6).toFixed(1)}" font-size="6" text-anchor="middle" fill="var(--ink-3)">${ch}</text>`; }).join('');
  return `<svg width="72" height="72" viewBox="-4 -4 72 72" aria-hidden="true">${cells}${labs}</svg>`;
}
let curPlant = null;
/* Chemistry and marker records, keyed by the same plant id as the sheet. Both
   payloads are merged into the bundle at assembly time; a plant that has not
   been scanned yet simply has no entry and the section is omitted. */
const CHEMBY = Object.fromEntries(((DATA.chem||{}).rows||[]).map(r=>[r.c,r]));
const SSRBY  = (DATA.ssr||{}).per || {};

function openPlant(p, push=true){
  if(!p) return;
  curPlant = p;
  const A = p.acc;
  // Several accession cells hold a submission status sentence rather than an accession.
  const ACCRE = /^(PRJ|SAM|SR[RXPS]|GC[AF]_|[A-Z]{2,6}\d{6,})/;
  const accChip = (t, v, url) => { if(!v) return '';
    if(url) return `<a class="acc" href="${url}" target="_blank" rel="noopener"><span class="t">${t}</span><span class="v">${esc(v)}</span></a>`;
    // Some cells point at private storage instead of an accession; say "pending" publicly.
    if(/s3|bucket|console\.aws/i.test(v)) v = TXT('plant.acc.not-submitted');
    const isAcc = ACCRE.test(v.trim());
    return `<span class="acc dim"><span class="t">${t}</span><span class="v"${isAcc?'':' style="font-family:inherit;font-size:11.5px;font-style:italic"'}>${esc(isAcc ? v : v.replace(/\.$/,''))}</span></span>`; };
  const who = [...new Set((p.pc||[]).filter(Boolean))];
  const gal = p.photos.length ? `<div class="gallery">${p.photos.map((u,i) => { const c = p.pc && p.pc[i];
      return `<a href="${p.calflora}" target="_blank" rel="noopener" style="background-image:url('${u}')" title="${c?'\u00a9 '+esc(c)+' \u00b7 CC BY-NC 4.0 \u00b7 via Calflora':'via Calflora'}" aria-label="Photograph of ${esc(p.name)}${c?' by '+esc(c.replace(/^\d{4}\s+/,'')):''}, on Calflora">${c?`<span class="phcred">\u00a9 ${esc(c)}</span>`:''}</a>`; }).join('')}</div>
      <p class="credit">${who.length?`Photograph${p.photos.length>1?'s':''} &copy; ${who.map(c=>esc(c)).join(', ')}, via `:'Photographs &copy; their contributors, via '}<a href="${p.calflora}" target="_blank" rel="noopener">Calflora</a>, under <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noopener">CC&nbsp;BY-NC&nbsp;4.0</a>. Not modified except for scaling. Click through for the full set and each photograph's own licence.</p>` : '';

  const seq = [
    mt('Sequencing files', p.seq.files!=null?nf(p.seq.files):null),
    mt('Raw data', p.seq.gb!=null?dec(p.seq.gb,1)+' Gb':null, pop('gb',x=>x.seq.gb), p.seq.gb),
    mt('Coverage', p.seq.cov!=null?dec(p.seq.cov,0)+'×':null, pop('cov',x=>x.seq.cov), p.seq.cov),
    mt('Read length', p.seq.len!=null?nf(p.seq.len)+' bp':null),
    mt('Reads processed', p.seq.proc!=null?nf(p.seq.proc):null),
    mt('Reads removed in trim', p.seq.rem!=null?nf(p.seq.rem):null),
    mt('Raw GC', p.seq.gc!=null?p.seq.gc+'%':null),
  ].join('');
  const gsz = [
    mt('Estimated haploid genome', bp(p.gs.hap), pop('hap',x=>x.gs.hap), p.gs.hap),
    mt('Unique (non-repetitive)', pc(p.gs.uniq), pop('uniq',x=>x.gs.uniq), p.gs.uniq),
    mt('Heterozygosity', p.gs.het!=null?dec(p.gs.het,3)+'%':null, pop('het',x=>x.gs.het), p.gs.het),
    mt('k-mer coverage', dec(p.gs.kcov,1)),
    mt('Read error rate', p.gs.err!=null?dec(p.gs.err,3)+'%':null),
    mt('Proposed ploidy', p.gs.ploidy),
  ].join('');
  const asm = [
    mt('Assembler', p.asm.tool ? p.asm.tool + (p.asm.kmer?' · k='+p.asm.kmer:'') : null),
    mt('Total length', bp(p.asm.total), pop('tot',x=>x.asm.total), p.asm.total),
    mt('Contigs', p.asm.contigs!=null?nf(p.asm.contigs):null, pop('ctg',x=>x.asm.contigs), p.asm.contigs),
    mt('N50', bp(p.asm.n50), pop('n50',x=>x.asm.n50), p.asm.n50),
    mt('Largest contig', bp(p.asm.largest), pop('lg',x=>x.asm.largest), p.asm.largest),
    mt('L50', p.asm.l50!=null?nf(p.asm.l50):null),
    mt('GC content', p.asm.gc!=null?p.asm.gc+'%':null),
    mt("N's per 100 kbp", dec(p.asm.nper100k,0)),
  ].join('');
  const ann = [
    mt('Repeat-masked', pc(p.ann.pctMasked), pop('msk',x=>x.ann.pctMasked), p.ann.pctMasked),
    mt('Bases masked', bp(p.ann.masked)),
    mt('Predicted genes', p.ann.genes!=null?nf(p.ann.genes):null),
    mt('Long candidate ORFs', p.ann.orfs!=null?nf(p.ann.orfs):null, pop('orf',x=>x.ann.orfs), p.ann.orfs),
    mt('TF-like ORFs', p.ann.tf!=null?nf(p.ann.tf):null, pop('tf',x=>x.ann.tf), p.ann.tf),
    mt('Proteins in orthogroups', p.og.inOG!=null?nf(p.og.inOG):null),
    mt('Species-specific orthogroups', p.og.spOG!=null?nf(p.og.spOG):null),
    mt('In orthogroups', pc(p.og.pctOG)),
  ].join('');
  const bcBoxes = Object.entries(p.bc).map(([g,v]) => {
    const prs = (v||'').split(/,\s*/).map(s=>s.trim()).filter(Boolean);
    return `<div class="bcbox"><div class="g">${esc(g)}
      <span class="chip ghost">${prs.length?prs.length+' primer'+(prs.length>1?'s':''):'none'}</span></div>
      <div class="prs">${prs.length?prs.map(x=>`<span class="pr">${esc(x)}</span>`).join(''):'<span style="font-size:11.5px;color:var(--ink-3)">No exact primer match found</span>'}</div></div>`;
  }).join('');
  // Only 105 of the 218 plastomes carry a GenBank annotation, and the OGDRAW figure
  // is drawn from that annotation -- so most plants have no map. Say which of the
  // three reasons applies rather than showing an unexplained empty box.
  const cpWhy = (() => {
    const st = p.cpst;
    if(!st) return [TXT('plant.cp.none.title'), TXT('plant.cp.none.body')];
    if(st.complete && !st.ann) return [TXT('plant.cp.unannotated.title'),
      TXT('plant.cp.unannotated.body',
          {n: P.filter(x=>x.cpst&&x.cpst.complete&&!x.cpst.ann).length})];
    if(!st.complete) return [TXT('plant.cp.notclosed.title'), TXT('plant.cp.notclosed.body')];
    return [TXT('plant.cp.nofigure.title'), ''];
  })();
  const cpImage = p.cpimg && CPIMG[p.cpimg]
    ? `<button class="cpimg" data-full="${esc(p.cpimg)}"><img src="${CPIMG[p.cpimg]}" alt="Annotated chloroplast genome map of ${esc(p.name)}" loading="lazy"></button>`
    : `<div class="nomap"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="23"/><circle cx="30" cy="30" r="11"/></svg>
        <div><div class="t">${esc(cpWhy[0])}</div>${cpWhy[1]?`<div class="d">${esc(cpWhy[1])}</div>`:''}</div></div>`;
  // Where an annotated record exists its own measurements are used; the sheet's
  // plastome columns are unverified and are shown only for plants the annotation
  // round did not reach.
  const X = p.xp;
  const cpStats = (X ? [
    mt('Plastome length', bp(X.L), pop('cpL',x=>x.xp&&x.xp.L), X.L),
    mt('GC content', dec(X.gc,2)+'%', pop('cpGC',x=>x.xp&&x.xp.gc), X.gc),
    mt('Distinct genes', nf(X.ng), pop('cpNG',x=>x.xp&&x.xp.ng), X.ng),
    mt('Coding / tRNA', X.cds+' / '+X.trn),
    mt('Large single copy', X.lsc!=null?bp(X.lsc):null, pop('cpLSC',x=>x.xp&&x.xp.lsc), X.lsc),
    mt('Inverted repeat', X.ir!=null?bp(X.ir)+' \u00d7 2':null, pop('cpIR',x=>x.xp&&x.xp.ir), X.ir),
    mt('Short single copy', X.ssc!=null?bp(X.ssc):null, pop('cpSSC',x=>x.xp&&x.xp.ssc), X.ssc),
    mt('Structure', X.q ? 'Quadripartite' : 'No inverted repeat annotated'),
  ] : [
    mt('Plastome size', bp(p.cp.size), pop('cps',x=>x.cp.size), p.cp.size),
    mt('Annotated genes', p.cp.genes!=null?nf(p.cp.genes):null, pop('cpg',x=>x.cp.genes), p.cp.genes),
    mt('Assembly contigs', p.cp.contigs!=null?nf(p.cp.contigs):null),
    mt('Quadripartite structure', p.cp.quad),
    mt('Seed reference', p.cp.seed),
  ]).join('');

  const chemRec = CHEMBY[p.id];
  const chemSect = chemRec ? `<div class="sect"><h3>6 &#183; Medicinal-compound chemistry<span class="n">HMMER against Pfam-A</span></h3>
    <div class="tiles">${DATA.chem.fams.map((f,i)=>mt((CHEMLOOK[f]||[f])[0], chemRec.v[i]!=null?nf(chemRec.v[i]):null)).join('')}</div>
    <p class="dnote">Protein counts from HMM matches in the predicted proteome. They show the machinery is present; they do not show a compound is made, and they are not comparable between plants.</p></div>` : '';
  const ssrRec = SSRBY[p.id];
  const ssrSect = ssrRec ? `<div class="sect"><h3>7 &#183; Fingerprint markers<span class="n">microsatellite scan and primer design</span></h3>
    <div class="tiles">${[
      mt('Repeats found', nf(ssrRec.ssr)),
      mt('Markers designed', nf(ssrRec.designed)),
      mt('Shortlisted', nf(ssrRec.short)),
      mt('Product range', ssrRec.bp[0]+'\u2013'+ssrRec.bp[1]+' bp'),
      mt('Sequence scanned', ssrRec.mb+' Mb'),
      mt('Best marker', ssrRec.top.motif)
    ].join('')}</div>
    <p class="dnote">Best-ranked pair &#8212; forward <span class="mono">${esc(ssrRec.top.forward)}</span>, reverse <span class="mono">${esc(ssrRec.top.reverse)}</span>, product ${esc(ssrRec.top.product_bp)} bp. Designed and screened in silico; not yet tested at a bench.</p></div>` : '';

  $('#dbody').innerHTML = `
    <div class="dhead">
      <div>
        <p class="eyebrow">${esc(p.family||'Family not recorded')}${p.genus?' · '+esc(p.genus):''}</p>
        <h2>${esc(p.name)}</h2>
        <div class="cn">${esc(p.common||'No common name recorded')}</div>
        <div class="dmeta">
          <span class="chip rank" style="background:${rankColor(p.cnps)}" title="${esc(RANKTEXT[p.cnps]||'California Rare Plant Rank')}">CRPR ${esc(p.cnps||'n/a')}</span>
          ${p.bloom?`<span class="chip ghost">Blooms ${esc(p.bloom)}</span>`:''}
          ${p.voucher?`<span class="chip ghost mono">${esc(p.voucher)}</span>`:''}
          <span class="chip ghost">${p.done}/6 stages</span>
          ${p.failed?'<span class="chip lock">Assembly failed</span>':''}
        </div>
        <p class="askrow"><a class="askbtn" href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Information request: '+p.name)}&body=${encodeURIComponent("I'd like more information about "+p.name+(p.common?' ('+p.common+')':'')+'.\n\n')}">Ask us about this plant</a></p>
        ${p.calflora?`<p style="margin:11px 0 0;font-size:13px"><a href="${p.calflora}" target="_blank" rel="noopener">View on Calflora &rarr;</a></p>`:''}
      </div>
      ${p.dmap?`<div class="dmap"><img src="${p.dmap}" alt="California distribution map for ${esc(p.name)}" loading="lazy"><div class="cap">California range</div></div>`
              :(p.bm.length?`<div style="display:flex;justify-content:center">${bloomRing(p.bm)}</div>`:'')}
    </div>
    ${p.released===false?`<div class="embargo"><b>Held until 31 January 2027.</b> Sequence data for this plant is submitted but embargoed at NCBI. Its metrics are shown here and counted in project totals; the sequences themselves become public on that date.</div>`:''}
    ${gal}
    <div class="accrow">
      ${accChip('BioProject', A.bioproject, A.bioproject_url)}
      ${accChip('BioSample', A.biosample, A.biosample_url)}
      ${accChip('SRA', A.sra, A.sra_url)}
      ${accChip('Genome assembly', A.assembly, A.assembly_url)}
      ${accChip('Chloroplast', ({
          'withdrawn'         : TXT('plant.cp.status.withdrawn'),
          'submitted'         : TXT('plant.cp.status.submitted'),
          'processing-unfixed': TXT('plant.cp.status.processing-unfixed')
        }[p.xp && p.xp.status]) || A.plastid,
        (p.xp && p.xp.status) ? null : A.plastid_url)}
    </div>

    <div class="sect"><h3>1 · Sequencing<span class="n">Illumina NovaSeq 6000, paired-end</span></h3><div class="tiles">${seq}</div></div>
    <div class="sect"><h3>2 · Genome size &amp; ploidy<span class="n">GenomeScope, Smudgeplot</span></h3><div class="tiles">${gsz}</div></div>
    <div class="sect"><h3>3 · Assembly<span class="n">ABySS, QUAST</span></h3><div class="tiles">${asm}</div></div>
    ${p.bV[0]!=null||p.bE[0]!=null?`<div class="sect"><h3>Completeness<span class="n">BUSCO odb10</span></h3>
      <div class="donuts">${donut('Viridiplantae', p.bV, p.bV[0]!=null?425:null)}${donut('Eukaryota', p.bE, p.bE[0]!=null?255:null)}</div></div>`:''}
    <div class="sect"><h3>4 · Annotation<span class="n">RepeatMasker, TransDecoder, OrthoFinder, PlantTFDB</span></h3><div class="tiles">${ann}</div></div>
    <div class="sect"><h3>DNA barcode primer sites<span class="n">exact matches in the assembly</span></h3><div class="bcgrid">${bcBoxes}</div></div>
    <div class="sect"><h3>5 · Chloroplast genome<span class="n">GetOrganelle, GeSeq / Chloë</span></h3>
      <div class="cpwrap">${cpImage}<div class="tiles" style="grid-template-columns:1fr">${cpStats}</div></div></div>
    ${chemSect}
    ${ssrSect}
  `;
  const cpb = $('#dbody .cpimg');
  if(cpb) cpb.onclick = () => { const lb = $('#lightbox'); lb.querySelector('img').src = CPIMG[cpb.dataset.full]; lb.classList.add('on'); };
  $('#scrim').classList.add('on'); $('#drawer').classList.add('on'); $('#drawer').scrollTop = 0; $('#drawer').focus();
  if(push) location.hash = '#/plant/' + encodeURIComponent(p.id);
}
function closeDrawer(push=true){
  $('#scrim').classList.remove('on'); $('#drawer').classList.remove('on'); curPlant = null;
  if(push && location.hash.startsWith('#/plant')) location.hash = '#/' + curView;
}
$('#closeD').onclick = () => closeDrawer();
$('#scrim').onclick = () => closeDrawer();
$('#lightbox').onclick = () => $('#lightbox').classList.remove('on');
function step(d){ if(!curPlant) return; const a = filtered(); let i = a.findIndex(x => x.id===curPlant.id);
  if(i<0){ i = 0; } else { i = (i + d + a.length) % a.length; } openPlant(a[i]); }
$('#prevP').onclick = () => step(-1); $('#nextP').onclick = () => step(1);
$('#citeBtn').onclick = () => { if(!curPlant) return; const p = curPlant;
  const bits = [`Green Biome Institute. ${p.name}${p.common?' ('+p.common+')':''}: draft genome and chloroplast assembly.`,
    p.acc.bioproject?`NCBI BioProject ${p.acc.bioproject}.`:null, p.acc.biosample?`BioSample ${p.acc.biosample}.`:null,
    p.acc.sra?`SRA ${p.acc.sra}.`:null, p.calflora?`Taxon reference: ${p.calflora}`:null].filter(Boolean).join(' ');
  navigator.clipboard?.writeText(bits).then(()=>{ const b=$('#citeBtn'); b.textContent='Copied'; setTimeout(()=>b.textContent='Copy citation',1400); }); };
addEventListener('keydown', e => {
  if(e.key==='Escape'){ if($('#lightbox').classList.contains('on')) $('#lightbox').classList.remove('on'); else closeDrawer(); }
  if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
  if(e.key==='/'){ e.preventDefault(); go('plants'); $('#q').focus(); }
  if(curPlant && (e.key==='j'||e.key==='ArrowRight')) step(1);
  if(curPlant && (e.key==='k'||e.key==='ArrowLeft')) step(-1);
});
