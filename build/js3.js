/* ================= CANVAS HELPERS ================= */
function fit(cv, h){
  const dpr = Math.min(2, devicePixelRatio||1), w = cv.parentElement.clientWidth - 32;
  cv.width = Math.max(280, w*dpr); cv.height = h*dpr;
  cv.style.width = Math.max(280,w)+'px'; cv.style.height = h+'px';
  const g = cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  return { g, w: Math.max(280,w), h };
}
const tipEl = $('#tip');
function showTip(html, x, y){
  tipEl.innerHTML = html; tipEl.classList.add('on');
  const r = tipEl.getBoundingClientRect();
  let L = x+16, T = y+16;
  if(L + r.width > innerWidth-10) L = x - r.width - 16;
  if(T + r.height > innerHeight-10) T = Math.max(10, y - r.height - 16);
  tipEl.style.left = L+'px'; tipEl.style.top = T+'px';
}
const hideTip = () => tipEl.classList.remove('on');
function plantTip(p, rows){
  const img = p.hero || p.dmap;
  return `<div class="th">${img?`<div class="tp" style="background-image:url('${img}')"></div>`:''}
    <div><div class="tn">${esc(p.name)}</div><div class="tc">${esc(p.common||'')}${p.family?'<br>'+esc(p.family):''}</div></div></div>
    <dl>${rows.filter(Boolean).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}
/* sequential blue ramp, 0..1 */
const SEQ = ['--seq-100','--seq-200','--seq-300','--seq-400','--seq-500','--seq-600','--seq-700'];
function seqColor(t){ if(t==null) return cv('--rule');
  const dark = matchMedia('(prefers-color-scheme: dark)').matches ? root.getAttribute('data-theme')!=='light' : root.getAttribute('data-theme')==='dark';
  const idx = Math.round(Math.max(0,Math.min(1,t)) * (SEQ.length-1));
  return cv(SEQ[dark ? (SEQ.length-1-idx) : idx]);
}

/* Wide mode: the matrix stops squeezing to the pane and takes the width its
   columns actually need, so every column can carry a readable angled label.
   The .chartwrap scrolls horizontally around it. */
const WIDE_CELL = 17, LABEL_ANGLE = 60, LABEL_MAX = 30;
function fitX(cvs, h, wantW){
  const dpr = Math.min(2, devicePixelRatio||1);
  const avail = Math.max(280, cvs.parentElement.clientWidth - 32);
  const w = Math.max(avail, wantW||0);
  cvs.width = w*dpr; cvs.height = h*dpr;
  cvs.style.width = w+'px'; cvs.style.height = h+'px';
  const g = cvs.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0);
  return { g, w, h };
}
function wideOn(cvs, on){
  const wrap = cvs.parentElement;
  wrap.classList.toggle('wide', !!on);
  if(!on) wrap.scrollLeft = 0;
}
const LABEL_FONT = 'italic 500 10px "IBM Plex Sans",sans-serif';
const clipName = n => n.length>LABEL_MAX ? n.slice(0,LABEL_MAX-1)+'\u2026' : n;
let _mg = null;
const measureCtx = () => (_mg ||= document.createElement('canvas').getContext('2d'));
/* Height the angled labels actually need, measured rather than guessed --
   a 30-character binomial is a lot wider than a character count suggests. */
function labelBand(names){
  const g = measureCtx(); g.font = LABEL_FONT;
  let w = 0;
  for(const n of names) w = Math.max(w, g.measureText(clipName(n)).width);
  return Math.ceil(w * Math.sin(LABEL_ANGLE*Math.PI/180)) + 20;
}
function colLabels(g, xs, y, names, hi){
  g.save();
  g.font = LABEL_FONT; g.textAlign = 'right'; g.textBaseline = 'middle';
  names.forEach((nm,i) => {
    g.save(); g.translate(xs(i), y); g.rotate(-LABEL_ANGLE*Math.PI/180);
    g.fillStyle = (hi && hi(i)) ? cv('--accent') : cv('--ink-2');
    g.fillText(clipName(nm), 0, 0);
    g.restore();
  });
  g.restore();
}

/* ================= LANDSCAPE ================= */
// [key, label, accessor, formatter, log scale, group]
// The plastome axes read the annotation payload only. The sheet also carries a
// plastome size on all 218 rows, but it is unverified and was not produced the same
// way, so mixing the two into one axis would put two different measurements on one
// scale. A plant with no annotated record simply has no point on these axes.
const kb1 = v => (v/1000).toFixed(v>=100000?0:1)+' kb';
const AXES = [
  ['gsize','Estimated genome size', p=>p.gs.hap, bp, true, 'Assembly'],
  ['n50','Contig N50', p=>p.asm.n50, bp, true, 'Assembly'],
  ['total','Assembly total length', p=>p.asm.total, bp, true, 'Assembly'],
  ['busco','BUSCO complete (Viridiplantae)', p=>p.bV[0], v=>v+'%', false, 'Assembly'],
  ['contigs','Number of contigs', p=>p.asm.contigs, nf, true, 'Assembly'],
  ['het','Heterozygosity', p=>p.gs.het, v=>dec(v,3)+'%', false, 'Assembly'],
  ['gc','GC content', p=>p.asm.gc, v=>v+'%', false, 'Assembly'],
  ['orfs','Long candidate ORFs', p=>p.ann.orfs, nf, true, 'Annotation'],
  ['tf','TF-like ORFs', p=>p.ann.tf, nf, true, 'Annotation'],
  ['masked','Repeat-masked share', p=>p.ann.pctMasked, pc, false, 'Annotation'],
  ['chemTot','Medicinal-family protein matches', p=>p.xc&&p.xc.tot, nf, true, 'Chemistry'],
  ['chemP450','Cytochrome P450 matches', p=>p.xc&&p.xc.p450, nf, true, 'Chemistry'],
  ['chemUGT','Glycosyltransferase matches', p=>p.xc&&p.xc.ugt, nf, true, 'Chemistry'],
  ['chemTPS','Terpene synthase matches', p=>p.xc&&p.xc.tps, nf, true, 'Chemistry'],
  ['chemFam','Enzyme families present', p=>p.xc&&p.xc.fam, v=>v+' of 10', false, 'Chemistry'],
  ['ssrDens','Microsatellites per Mb', p=>p.xs&&p.xs.dens, v=>dec(v,0)+'/Mb', false, 'Markers'],
  ['ssrTot','Microsatellites found', p=>p.xs&&p.xs.ssr, nf, true, 'Markers'],
  ['ssrMk','Markers with primer pairs', p=>p.xs&&p.xs.mk, nf, true, 'Markers'],
  ['ssrMdens','Markers per Mb', p=>p.xs&&p.xs.mdens, v=>dec(v,1)+'/Mb', false, 'Markers'],
  ['cpsize','Plastome length', p=>p.xp&&p.xp.L, bp, false, 'Plastome'],
  ['cpgenes','Plastome distinct genes', p=>p.xp&&p.xp.ng, nf, false, 'Plastome'],
  ['cpgc','Plastome GC', p=>p.xp&&p.xp.gc, v=>dec(v,2)+'%', false, 'Plastome'],
  ['cpir','Inverted repeat length', p=>p.xp&&p.xp.ir, kb1, false, 'Plastome'],
  ['cpssc','Short single copy length', p=>p.xp&&p.xp.ssc, kb1, false, 'Plastome'],
  ['cplsc','Large single copy length', p=>p.xp&&p.xp.lsc, kb1, false, 'Plastome'],
  ['cpirs',TXT('landscape.axis.cpirs'), p=>p.xp&&p.xp.irs, v=>dec(v,1)+'%', false, 'Plastome'],
  ['cpcds','Plastome coding genes', p=>p.xp&&p.xp.cds, nf, false, 'Plastome'],
];
const AX = Object.fromEntries(AXES.map(a=>[a[0],a]));
const ls = { x:'gsize', y:'n50', r:'busco', hlFam:'', box:null, pts:[] };
// group the options so twenty-seven axes stay navigable
const AXGROUPS = [...new Set(AXES.map(a=>a[5]))];
const axOptions = () => AXGROUPS.map(gr =>
  `<optgroup label="${esc(gr)}">` + AXES.filter(a=>a[5]===gr)
    .map(a=>`<option value="${a[0]}">${esc(a[1])}</option>`).join('') + '</optgroup>').join('');
['axX','axY','axR'].forEach((id,k) => {
  const el = $('#'+id);
  el.innerHTML = axOptions();
  el.value = [ls.x, ls.y, ls.r][k];
  el.onchange = () => { ls[['x','y','r'][k]] = el.value; drawScatter(); };
});
$('#hlFam').innerHTML = '<option value="">Highlight a family&hellip;</option>' + FAMS.map(([f,a])=>`<option value="${esc(f)}">${esc(f)} (${a.length})</option>`).join('');
$('#hlFam').onchange = e => { ls.hlFam = e.target.value; drawScatter(); };
$('#lsReset').onclick = () => { ls.box = null; st.sel = null; ls.hlFam=''; $('#hlFam').value=''; drawScatter(); renderWall(); };

function drawScatter(){
  const cvs = $('#scatter'); if(!cvs.offsetParent) return;
  const { g, w, h } = fit(cvs, 520);
  const AXx = AX[ls.x], AXy = AX[ls.y], AXr = AX[ls.r];
  const pad = { l:76, r:22, t:18, b:54 };
  const iw = w-pad.l-pad.r, ih = h-pad.t-pad.b;
  const rows = P.map(p => ({ p, x:AXx[2](p), y:AXy[2](p), r:AXr[2](p) })).filter(d => d.x!=null && d.y!=null && isFinite(d.x) && isFinite(d.y) && (!AXx[4] || d.x>0) && (!AXy[4] || d.y>0));
  const useLogX = AXx[4], useLogY = AXy[4];
  const tx = v => useLogX ? Math.log10(v) : v, ty = v => useLogY ? Math.log10(v) : v;
  const xs = rows.map(d=>tx(d.x)), ys = rows.map(d=>ty(d.y));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const px = ((x1-x0)||1)*0.06, py = ((y1-y0)||1)*0.08;
  const X = v => pad.l + (tx(v)-(x0-px))/((x1+px)-(x0-px))*iw;
  const Y = v => pad.t + ih - (ty(v)-(y0-py))/((y1+py)-(y0-py))*ih;
  const rvals = rows.map(d=>d.r).filter(v=>v!=null&&isFinite(v));
  const r0 = rvals.length?Math.min(...rvals):0, r1 = rvals.length?Math.max(...rvals):1;
  const RAD = v => v==null||!isFinite(v) ? 3.4 : 4 + Math.sqrt((v-r0)/((r1-r0)||1))*11;
  const NORM = v => v==null||!isFinite(v) ? null : (v-r0)/((r1-r0)||1);

  g.clearRect(0,0,w,h);
  g.strokeStyle = cv('--rule-soft'); g.lineWidth = 1; g.fillStyle = cv('--ink-3');
  g.font = '11px "IBM Plex Mono", monospace'; g.textAlign='right'; g.textBaseline='middle';
  const ticks = (lo,hi,log) => { let out=[];
    if(log){ // 1-2-5 decades, so a range narrower than one decade still gets labelled
      for(let e=Math.floor(lo)-1; e<=Math.ceil(hi)+1; e++)
        for(const m of [1,2,5]){ const v=m*Math.pow(10,e); const L=Math.log10(v); if(L>=lo&&L<=hi) out.push(v); }
      out.sort((a,b)=>a-b);
      while(out.length>8) out = out.filter((_,i)=>i%2===0);
    } else { const st=(hi-lo)/5||1; for(let i=0;i<=5;i++) out.push(lo+st*i); }
    return out; };
  ticks(y0-py, y1+py, useLogY).forEach(v => { const yy = Y(v);
    if(yy<pad.t-2||yy>pad.t+ih+2) return;
    g.beginPath(); g.moveTo(pad.l,yy); g.lineTo(pad.l+iw,yy); g.stroke();
    g.fillText(AXy[3](v)||'', pad.l-9, yy); });
  g.textAlign='center'; g.textBaseline='top';
  ticks(x0-px, x1+px, useLogX).forEach(v => { const xx = X(v);
    if(xx<pad.l-2||xx>pad.l+iw+2) return;
    g.beginPath(); g.moveTo(xx,pad.t); g.lineTo(xx,pad.t+ih); g.stroke();
    g.fillText(AXx[3](v)||'', xx, pad.t+ih+9); });
  g.strokeStyle = cv('--rule'); g.beginPath(); g.moveTo(pad.l,pad.t+ih); g.lineTo(pad.l+iw,pad.t+ih); g.moveTo(pad.l,pad.t); g.lineTo(pad.l,pad.t+ih); g.stroke();
  g.fillStyle = cv('--ink-2'); g.font = '600 11px "IBM Plex Sans", sans-serif';
  g.fillText(AXx[1].toUpperCase(), pad.l+iw/2, h-17);
  g.save(); g.translate(16, pad.t+ih/2); g.rotate(-Math.PI/2); g.textBaseline='middle'; g.fillText(AXy[1].toUpperCase(), 0, 0); g.restore();

  ls.pts = [];
  const inBox = d => !ls.box || (d.px>=Math.min(ls.box.x0,ls.box.x1) && d.px<=Math.max(ls.box.x0,ls.box.x1) && d.py>=Math.min(ls.box.y0,ls.box.y1) && d.py<=Math.max(ls.box.y0,ls.box.y1));
  rows.forEach(d => { d.px = X(d.x); d.py = Y(d.y); d.rad = RAD(d.r); ls.pts.push(d); });
  const dim = ls.hlFam || ls.box;
  rows.forEach(d => {
    const hit = (!ls.hlFam || d.p.family===ls.hlFam) && inBox(d);
    g.beginPath(); g.arc(d.px, d.py, d.rad, 0, 7);
    g.globalAlpha = dim ? (hit?1:.13) : .88;
    g.fillStyle = seqColor(NORM(d.r)); g.fill();
    g.globalAlpha = dim ? (hit?1:.13) : 1;
    g.lineWidth = 2; g.strokeStyle = cv('--surface'); g.stroke();
  });
  g.globalAlpha = 1;
  if(ls.box){ g.strokeStyle = cv('--accent'); g.setLineDash([4,3]); g.lineWidth=1.5;
    g.strokeRect(Math.min(ls.box.x0,ls.box.x1), Math.min(ls.box.y0,ls.box.y1), Math.abs(ls.box.x1-ls.box.x0), Math.abs(ls.box.y1-ls.box.y0)); g.setLineDash([]); }

  // Several axes exist for a subset of the collection -- chemistry for the plants
  // with a proteome, markers for the ones the SSR scan has reached, plastome
  // measurements for the annotated records. Say so, rather than letting a sparse
  // cloud read as a sparse collection.
  const cover = a => P.filter(p => { const v = a[2](p); return v!=null && isFinite(v); }).length;
  const cx = cover(AXx), cy = cover(AXy);
  const bothMeasured = P.filter(p => {
    const a = AXx[2](p), c = AXy[2](p);
    return a!=null && isFinite(a) && c!=null && isFinite(c);
  }).length;
  const hiddenZero = bothMeasured - rows.length;
  $('#lsCount').textContent = `${rows.length} plants have both measurements`
    + ((cx<P.length || cy<P.length)
       ? `. ${AXx[1][0].toUpperCase()+AXx[1].slice(1).toLowerCase()} exists for ${cx}, ${AXy[1].toLowerCase()} for ${cy}` : '')
    + (hiddenZero > 0
       ? `. ${hiddenZero} more measured zero, which a log scale cannot place` : '');
  $('#lsLegend').innerHTML =
    `<span style="font-weight:600;color:var(--ink-2)">Circle size &amp; colour: ${esc(AXr[1])}</span>`
    + [0,.25,.5,.75,1].map(t=>`<span><i style="background:${seqColor(t)}"></i>${esc(AXr[3](r0+(r1-r0)*t)||'')}</span>`).join('');
}
(function(){
  const cvs = $('#scatter'); let drag=null;
  const at = e => { const b = cvs.getBoundingClientRect(); return { x:e.clientX-b.left, y:e.clientY-b.top }; };
  const near = (mx,my) => { let best=null, bd=1e9;
    for(const d of ls.pts){ const dd = (d.px-mx)**2 + (d.py-my)**2; if(dd < Math.max(d.rad+6,11)**2 && dd < bd){ bd=dd; best=d; } }
    return best; };
  cvs.addEventListener('mousemove', e => {
    const {x,y} = at(e);
    if(drag){ ls.box = {x0:drag.x, y0:drag.y, x1:x, y1:y}; drawScatter(); return; }
    const d = near(x,y);
    if(!d){ hideTip(); cvs.style.cursor='crosshair'; return; }
    cvs.style.cursor='pointer';
    showTip(plantTip(d.p, [[AX[ls.x][1], AX[ls.x][3](d.x)], [AX[ls.y][1], AX[ls.y][3](d.y)],
      d.r!=null?[AX[ls.r][1], AX[ls.r][3](d.r)]:null, d.p.cnps?['Rarity rank','CRPR '+d.p.cnps]:null]), e.clientX, e.clientY);
  });
  cvs.addEventListener('mouseleave', hideTip);
  cvs.addEventListener('mousedown', e => { const {x,y} = at(e); if(near(x,y)) return; drag = {x,y}; });
  addEventListener('mouseup', e => { if(!drag) return; const {x,y} = at(e); const moved = Math.abs(x-drag.x)>6 && Math.abs(y-drag.y)>6;
    drag = null;
    if(!moved){ ls.box=null; st.sel=null; }
    else { st.sel = new Set(ls.pts.filter(d => d.px>=Math.min(ls.box.x0,ls.box.x1)&&d.px<=Math.max(ls.box.x0,ls.box.x1)&&d.py>=Math.min(ls.box.y0,ls.box.y1)&&d.py<=Math.max(ls.box.y0,ls.box.y1)).map(d=>d.p.i)); }
    drawScatter(); renderWall(); });
  cvs.addEventListener('click', e => { const {x,y} = at(e); const d = near(x,y); if(d) openPlant(d.p); });
})();
