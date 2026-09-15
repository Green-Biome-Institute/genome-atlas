/* ================= BLOOM YEAR ================= */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const bl = { color:'family', sort:'start', cells:null };
const TAU2 = Math.PI*2;
function polarPt(cx,cy,r,t){ const a=t*TAU2-Math.PI/2; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }

function bloomSet(){
  // bm is a 1-12 month list; a range that wraps the new year is kept as a wrap
  return P.filter(p => p.bm && p.bm.length).map(p => {
    const m = p.bm.slice().sort((a,b)=>a-b);
    let s = m[0]-1, e = m[m.length-1];            // half-open, in months
    if(m.length>1 && (m[m.length-1]-m[0]) > 7){   // Nov-Feb style wrap
      const gap = [];
      for(let i=1;i<m.length;i++) if(m[i]-m[i-1]>1) gap.push(i);
      if(gap.length===1){ s = m[gap[0]]-1; e = m[gap[0]-1]+12; }
    }
    return { p, s:s/12, len:Math.max((e-s)/12, 1/24) };
  });
}
// Three named families plus a neutral "other". The ring puts every colour on
// screen at once, so this is an all-pairs case: the validated trio is the cap.
const BLOOMFAM = () => { const c={}; P.forEach(p=>{ if(p.family) c[p.family]=(c[p.family]||0)+1; });
  return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]); };
function bloomColor(p, famTop){
  if(bl.color==='rank'){ const r=(p.cnps||'');
    return r.startsWith('1B.1') ? cv('--r1b1') : r.startsWith('1B.2') ? cv('--r1b2')
         : r.startsWith('1B.3') ? cv('--r1b3') : r.startsWith('4') ? cv('--r4') : cv('--rna'); }
  if(bl.color==='status') return p.failed ? cv('--q-frag') : p.released===false ? cv('--q-dup') : cv('--q-comp');
  const i = famTop.indexOf(p.family);
  return i<0 ? cv('--rule') : cv(CATV[i%CATV.length]);
}
const CATV = ['--s1','--s2','--s3'];

function drawBloom(){
  const cvs = $('#bloomCv'); if(!cvs || !cvs.offsetParent) return;
  let rows = bloomSet();
  const famTop = BLOOMFAM();
  if(bl.sort==='start') rows.sort((a,b)=> a.s-b.s || a.len-b.len);
  else if(bl.sort==='length') rows.sort((a,b)=> b.len-a.len);
  else if(bl.sort==='family') rows.sort((a,b)=> (a.p.family||'zz').localeCompare(b.p.family||'zz') || a.s-b.s);
  else rows.sort((a,b)=> (a.p.name||'').localeCompare(b.p.name||''));

  const size = Math.max(360, Math.min(680, (cvs.parentElement.clientWidth||700)-32));
  const { g, w, h } = fit(cvs, size);
  const c = w/2, cy = h/2;
  const rOut = Math.min(c, cy) - 34, rIn = Math.min(c,cy)*0.30;
  const band = (rOut-rIn)/Math.max(1,rows.length);
  g.clearRect(0,0,w,h);

  // month grid
  g.strokeStyle = cv('--rule-soft'); g.lineWidth = 1;
  for(let m=0;m<12;m++){ const [x,y]=polarPt(c,cy,rOut+6,m/12);
    g.beginPath(); g.moveTo(...polarPt(c,cy,rIn-6,m/12)); g.lineTo(x,y); g.stroke(); }
  g.fillStyle = cv('--ink-3'); g.font = '600 11px "IBM Plex Sans",sans-serif';
  g.textAlign='center'; g.textBaseline='middle';
  for(let m=0;m<12;m++){ const [x,y]=polarPt(c,cy,rOut+19,(m+0.5)/12); g.fillText(MONTHS[m],x,y); }

  rows.forEach((r,i) => {
    const r0 = rIn + i*band, r1 = r0 + Math.max(0.9, band-0.35);
    g.strokeStyle = bloomColor(r.p, famTop);
    g.lineWidth = Math.max(0.9, r1-r0);
    g.beginPath();
    g.arc(c, cy, (r0+r1)/2, r.s*TAU2-Math.PI/2, (r.s+r.len)*TAU2-Math.PI/2);
    g.stroke();
  });

  // per-month counts, drawn as a faint inner dial
  const cnt = new Array(12).fill(0);
  rows.forEach(r => { for(let k=0;k<12;k++){ const t=(k+0.5)/12;
    let s=r.s, e=r.s+r.len; if(t>=s&&t<e || t+1>=s&&t+1<e) cnt[k]++; } });
  const mx = Math.max(1, ...cnt);
  for(let m=0;m<12;m++){
    const rr = rIn*0.94*(cnt[m]/mx);
    g.fillStyle = cv('--accent-soft');
    g.beginPath(); g.moveTo(c,cy);
    g.arc(c, cy, rr, m/12*TAU2-Math.PI/2, (m+1)/12*TAU2-Math.PI/2); g.closePath(); g.fill();
  }
  g.fillStyle = cv('--ink-2'); g.font='600 13px "IBM Plex Sans",sans-serif';
  g.fillText(rows.length+' plants', c, cy-8);
  g.fillStyle = cv('--ink-3'); g.font='500 10.5px "IBM Plex Sans",sans-serif';
  g.fillText('in bloom', c, cy+8);

  bl.cells = { rows, c, cy, rIn, rOut, band };
  $('#ctBloom').textContent = rows.length;
  $('#bloomCount').textContent = rows.length + ' of ' + P.length + ' plants have a recorded bloom period';
  $('#bloomLegend').innerHTML = bl.color==='family'
    ? famTop.map((f,i)=>`<span><i style="background:var(${CATV[i%CATV.length]})"></i>${esc(f)}</span>`).join('')
      + `<span><i style="background:var(--rule)"></i>other families</span>`
    : bl.color==='rank'
      ? `<span><i style="background:var(--q-miss)"></i>Rank 1B, rare, threatened or endangered</span><span><i style="background:var(--q-comp)"></i>Rank 4, watch list</span><span><i style="background:var(--rule)"></i>unranked</span>`
      : `<span><i style="background:var(--q-comp)"></i>released</span><span><i style="background:var(--q-dup)"></i>embargoed</span><span><i style="background:var(--q-frag)"></i>assembly failed</span>`;
  const peak = cnt.indexOf(Math.max(...cnt));
  $('#bloomTop').innerHTML = MONTHS.map((m,i) =>
    `<div class="rowitem"><span class="nm">${m}</span><span class="vv">${cnt[i]}</span>
      <span class="bb"><i style="width:${(cnt[i]/mx*100).toFixed(1)}%"></i></span></div>`).join('')
    + `<p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0;line-height:1.45">Peak is <b>${MONTHS[peak]}</b>, with ${cnt[peak]} of ${rows.length} in flower. Each ring is one plant; the arc is the months it blooms. Useful for planning field surveys and permitted sampling.</p>`;
}
(function(){
  const cvs = $('#bloomCv'); if(!cvs) return;
  const hit = e => { if(!bl.cells) return null;
    const b = cvs.getBoundingClientRect();
    const x = e.clientX-b.left-bl.cells.c, y = e.clientY-b.top-bl.cells.cy;
    const rad = Math.hypot(x,y);
    const i = Math.floor((rad - bl.cells.rIn)/bl.cells.band);
    if(i<0 || i>=bl.cells.rows.length) return null;
    let t = (Math.atan2(y,x)+Math.PI/2)/TAU2; if(t<0) t+=1;
    const r = bl.cells.rows[i];
    const inArc = (t>=r.s && t<r.s+r.len) || (t+1>=r.s && t+1<r.s+r.len);
    return inArc ? r : null; };
  cvs.addEventListener('mousemove', e => { const r = hit(e);
    if(!r){ hideTip(); cvs.style.cursor='default'; return; }
    cvs.style.cursor='pointer';
    showTip(plantTip(r.p, [['Blooms', r.p.bloom||'not recorded'], ['Rarity', r.p.cnps||'unranked'],
      ['Family', r.p.family||'not recorded']]), e.clientX, e.clientY); });
  cvs.addEventListener('mouseleave', hideTip);
  cvs.addEventListener('click', e => { const r = hit(e); if(r) openPlant(r.p); });
})();

/* ================= PLASTID GALLERY ================= */
// Eleven gene classes cannot be told apart by colour, so the rings do not try.
// Strand is the radial band (and is toned to match); the four standard barcode
// loci are the only genes picked out, in the accent.
const REGC={LSC:'--seq-200',IRB:'--seq-600',SSC:'--seq-200',IRA:'--seq-600'};
const pl = { sort:'size', size:150, mode:'plate' };
function arcPath2(cx,cy,r0,r1,t0,len){
  len=Math.min(len,0.9999); const t1=t0+len, big=len>0.5?1:0;
  const [ax,ay]=polarPt(cx,cy,r1,t0), [bx,by]=polarPt(cx,cy,r1,t1),
        [c2,d2]=polarPt(cx,cy,r0,t1), [e2,f2]=polarPt(cx,cy,r0,t0);
  return `M${ax.toFixed(2)},${ay.toFixed(2)}A${r1},${r1} 0 ${big} 1 ${bx.toFixed(2)},${by.toFixed(2)}`
       + `L${c2.toFixed(2)},${d2.toFixed(2)}A${r0},${r0} 0 ${big} 0 ${e2.toFixed(2)},${f2.toFixed(2)}Z`; }
function ringSVG(p, size){
  const R = p.ring; if(!R) return '';
  const c=size/2, out=size*0.455, mid=size*0.372, inr=size*0.312, g0=size*0.225, g1=size*0.298;
  const q=[];
  q.push(`<circle cx="${c}" cy="${c}" r="${((mid+inr)/2).toFixed(2)}" fill="none" stroke="var(--rule-soft)" stroke-width="${(mid-inr).toFixed(2)}"/>`);
  for(const tag of ['LSC','IRB','SSC','IRA']){ const a=R.r[tag]; if(!a) continue;
    q.push(`<path d="${arcPath2(c,c,g0,g1,a[0],a[1])}" fill="var(${REGC[tag]})"/>`); }
  for(const gn of R.g){ const [name,t0,len,rev,cls,isBc]=gn;
    const r0 = rev?inr:mid, r1 = rev?mid:out;
    const w = Math.max(len, size>260?0.0016:0.0032);
    q.push(`<path d="${arcPath2(c,c,r0,r1,t0,w)}" fill="var(${isBc?'--accent':(rev?'--seq-400':'--seq-600')})"${
      isBc?` stroke="var(--accent)" stroke-width="${size>260?1.3:0.8}"`:''}><title>${esc(name)}${isBc?' (barcode locus)':''}</title></path>`); }
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img"
    aria-label="Chloroplast genome map of ${esc(p.name)}, ${nf(R.L)} base pairs, ${R.g.length} genes">${q.join('')}</svg>`;
}
function irBp(p){ return p.ring && p.ring.r.IRB ? p.ring.r.IRB[1]*p.ring.L : null; }
function renderPlastomes(){
  const host = $('#plateWall'); if(!host) return;
  // 182 plants now carry an OGDRAW plate; 105 carry a schematic ring. The contact
  // sheet shows whichever the toggle asks for, over whichever plants have it.
  let L = pl.mode==='ring' ? P.filter(p => p.ring) : P.filter(p => p.cpimg && CPIMG[p.cpimg]);
  // Sort keys read the plastome payload where there is one, so the plate view can
  // order all 182 rather than only the 105 that have a ring.
  const CPR = Object.fromEntries(((DATA.cp2||{}).rows||[]).map(r=>[r.c,r]));
  const pL = p => (CPR[p.id]||{}).L ?? (p.ring ? p.ring.L : null) ?? p.cp.size;
  const pG = p => (CPR[p.id]||{}).ng ?? (p.ring ? p.ring.g.length : null) ?? p.cp.genes;
  const pI = p => (CPR[p.id]||{}).ir ?? irBp(p);
  const dn = v => v==null ? -Infinity : v;
  const S = { size:(a,b)=>dn(pL(b))-dn(pL(a)), genes:(a,b)=>dn(pG(b))-dn(pG(a)),
    ir:(a,b)=>dn(pI(b))-dn(pI(a)), name:(a,b)=>a.name.localeCompare(b.name),
    family:(a,b)=>(a.family||'zz').localeCompare(b.family||'zz')||a.name.localeCompare(b.name) };
  L.sort(S[pl.sort]||S.size);
  const sz = pl.size;
  host.style.gridTemplateColumns = `repeat(auto-fill,minmax(${sz}px,1fr))`;
  host.innerHTML = L.map(p => `<button class="plate" data-id="${esc(p.id)}">
      ${pl.mode==='ring' ? ringSVG(p, sz)
        : `<img src="${CPIMG[p.cpimg]}" alt="Annotated chloroplast genome map of ${esc(p.name)}" loading="lazy">`}
      <span class="pn">${esc(p.name)}</span>
      <span class="pm">${nf(pL(p))} bp${pG(p)!=null?` &middot; ${pG(p)} genes`:''}</span>
    </button>`).join('');
  $$('#plateWall .plate').forEach(b => {
    b.onclick = () => openPlant(byId[b.dataset.id]);
    b.onmouseenter = e => { const p = byId[b.dataset.id]; const ir = pI(p), r = CPR[p.id];
      showTip(plantTip(p, [['Plastome', nf(pL(p))+' bp'], ['Genes', pG(p)],
        ['Inverted repeat', ir ? nf(Math.round(ir))+' bp' : 'none annotated'],
        ['Structure', r ? (r.q ? 'quadripartite' : 'no inverted repeat')
          : (p.cp.quad && /^Yes/i.test(p.cp.quad) ? 'quadripartite' : 'partial / fragmented')]]),
        e.clientX, e.clientY); };
    b.onmouseleave = hideTip;
  });
  const irs = L.map(pI).filter(Boolean), lens = L.map(pL).filter(Boolean), gs = L.map(pG).filter(v=>v!=null);
  $('#plastCount').textContent = `${L.length} ${pl.mode==='ring'?'schematic rings':'annotated maps'} · ${nf(Math.min(...lens))}–${nf(Math.max(...lens))} bp`;
  $('#plastStats').innerHTML = [
    ['Plates in this view', L.length],
    ['All four regions', L.filter(p=>CPR[p.id] ? CPR[p.id].q : (p.ring && Object.keys(p.ring.r).length===4)).length],
    ['Inverted repeat', nf(Math.round(Math.min(...irs)))+'–'+nf(Math.round(Math.max(...irs)))+' bp'],
    ['Genes per plastome', Math.min(...gs)+'–'+Math.max(...gs)],
  ].map(([k,v])=>`<div class="rowitem"><span class="nm">${esc(k)}</span><span class="vv">${esc(String(v))}</span></div>`).join('')
   + (pl.mode==='ring'
      ? `<p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0;line-height:1.45">Every ring is rotated to the same origin, the start of the large single-copy region, so they compare to each other rather than to an arbitrary start. Outer band is the forward strand, inner the reverse. Dark arcs are the two inverted repeats. Green genes are the four barcode loci the barcode tab searches for. Drawn for the ${P.filter(x=>x.ring).length} records whose per-gene coordinates were parsed.</p>`
      : `<p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0;line-height:1.45">The GeSeq/Chlo\u00eb OGDRAW figures as rendered, one per record. Click any plate to open that plant. Switch to <b>schematic rings</b> for the same set redrawn to a common origin, better for comparing structure than reading gene names.</p>`)
}

/* ================= THE COLLECTION ================= */
function renderCollection(){
  const host = $('#collBody'); if(!host) return;
  const byColl = {}, bySrc = {};
  P.forEach(p => {
    if(p.coll) (byColl[p.coll] ||= []).push(p);
    const s = p.src && p.src.label;
    if(s) (bySrc[s] ||= { kind:p.src.kind, list:[] }).list.push(p);
  });
  const KIND = [['garden',TXT('collection.kind.garden')],
                ['agency',TXT('collection.kind.agency')],
                ['nursery',TXT('collection.kind.nursery')],
                ['lab',TXT('collection.kind.lab')],
                ['wild','Collected in the field']];
  const colls = Object.entries(byColl).sort((a,b)=>b[1].length-a[1].length);
  // st.q is matched against a lowercased search string, so normalise on the way in
  const jump = (q) => { const j = JSON.stringify(q).replace(/"/g,'&quot;');
    return `onclick="st.q=${JSON.stringify(q.toLowerCase()).replace(/"/g,'&quot;')};st.sel=null;$('#q').value=${j};go('plants');renderWall();"`; };

  host.innerHTML = `
   <div class="card panel collcard">
     <h4>The people who collected these plants</h4>
     <p class="sub">Every genome here began as tissue somebody went and got. ${colls.reduce((t,c)=>t+c[1].length,0)} of the ${P.length} plants have a named contributor on record.</p>
     <div class="credits">${colls.map(([who,list]) => `
       <button class="credit-card" ${jump(who)}>
         <span class="cnum">${list.length}</span>
         <span class="cwho">${esc(who)}</span>
         <span class="cwhat">${esc([...new Set(list.map(p=>p.family).filter(Boolean))].slice(0,3).join(', '))}${
           new Set(list.map(p=>p.family).filter(Boolean)).size>3?'…':''}</span>
       </button>`).join('')}</div>
   </div>
   ${KIND.map(([k,label]) => { const items = Object.entries(bySrc).filter(([,v])=>v.kind===k)
        .sort((a,b)=>b[1].list.length-a[1].list.length);
      if(!items.length) return '';
      const n = items.reduce((t,i)=>t+i[1].list.length,0);
      return `<div class="card panel collcard">
        <h4>${label} <span class="cct">${n} plant${n===1?'':'s'}</span></h4>
        <div class="srcgrid">${items.map(([name,v]) => `
          <button class="srcitem" ${jump(name)}>
            <span class="sn">${esc(name)}</span><span class="sv">${v.list.length}</span>
          </button>`).join('')}</div>
      </div>`; }).join('')}
   <div class="card panel collcard">
     <h4>What is deliberately not here</h4>
     <ul class="tight">
       <li><b>No email addresses.</b> The spreadsheet stores contributors as name and email together; only the name is carried through.</li>
       <li><b>No site coordinates.</b> Two rows record precise collection coordinates. These are endangered plants, and a precise locality is a collection risk, so localities are shown no finer than a named place and county.</li>
       <li><b>Abbreviations are expanded on a best reading</b> of the sheet. Worth a check by someone who knows the collections.</li>
     </ul>
   </div>`;
  $('#ctColl').textContent = colls.length;
}

$('#blColor') && ($('#blColor').onchange = e => { bl.color = e.target.value; drawBloom(); });
$('#blSort')  && ($('#blSort').onchange  = e => { bl.sort  = e.target.value; drawBloom(); });
$$('#plMode button').forEach(b => b.onclick = () => { pl.mode = b.dataset.m;
  $$('#plMode button').forEach(o => o.setAttribute('aria-pressed', String(o===b)));
  renderPlastomes(); });
$('#plSort')  && ($('#plSort').onchange  = e => { pl.sort  = e.target.value; renderPlastomes(); });
$('#plSize')  && ($('#plSize').onchange  = e => { pl.size  = +e.target.value; renderPlastomes(); });

/* Fit / Labelled toggle on the three matrix views */
[['#buWide', bu, drawBusco], ['#bcWide', bc, drawBarcode], ['#tfWide', tf, drawTF]]
  .forEach(([sel, state, draw]) => {
    const box = $(sel); if(!box) return;
    $$(sel+' button').forEach(b => b.onclick = () => {
      $$(sel+' button').forEach(x => x.setAttribute('aria-pressed', String(x===b)));
      state.wide = b.dataset.w === '1';
      draw();
    });
  });
