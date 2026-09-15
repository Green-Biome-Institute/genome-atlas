
/* ================= CHEMISTRY ================= */
const CHEM = DATA.chem || null;
const SSR  = DATA.ssr  || null;
const nfl = n => n==null ? '' : n.toLocaleString('en-US');

const CHEMLOOK = {
  p450:           ['Cytochrome P450',       'oxidation'],
  UDPGT:          ['Glycosyltransferase',   'adds sugars'],
  Transferase:    ['BAHD acyltransferase',  'adds acyl groups'],
  FAD_binding_4:  ['FAD oxidoreductase',    'alkaloid routes'],
  Chal_sti_synt:  ['Type III PKS',          'flavonoids'],
  Methyltransf_2: ['O-methyltransferase',   'adds methyl'],
  Terpene_synth:  ['Terpene synthase',      'terpenes'],
  BBE:            ['Berberine bridge',      'alkaloids'],
  Str_synth:      ['Strictosidine syn.',    'indole alkaloids'],
  SQHop_cyclase:  ['Oxidosqualene cyclase', 'triterpenes']
};
const CHEMBLURB = {
  p450: TXT('chem.blurb.p450'),
  UDPGT: TXT('chem.blurb.UDPGT'),
  Transferase: TXT('chem.blurb.Transferase'),
  FAD_binding_4: TXT('chem.blurb.FAD_binding_4'),
  Chal_sti_synt: TXT('chem.blurb.Chal_sti_synt'),
  Methyltransf_2: TXT('chem.blurb.Methyltransf_2'),
  Terpene_synth: TXT('chem.blurb.Terpene_synth'),
  BBE: TXT('chem.blurb.BBE'),
  Str_synth: TXT('chem.blurb.Str_synth'),
  SQHop_cyclase: TXT('chem.blurb.SQHop_cyclase')
};
const CHEMBIG = ['p450','UDPGT','Transferase','FAD_binding_4','Chal_sti_synt','Methyltransf_2'];

function quart(a){ const s=a.slice().sort((x,y)=>x-y), q=f=>s[Math.min(s.length-1,Math.floor(f*(s.length-1)))];
  return [q(0.25), q(0.5), q(0.75)]; }

const chem = { sort:'tot' };

function drawChem(){
  const el = $('#chemCv'); if(!el || !CHEM) return;
  const fams = CHEM.fams, rows = CHEM.rows.slice();
  const tot = r => r.v.reduce((x,y)=>x+y,0);
  rows.sort(chem.sort==='name' ? (a,b)=>a.n.localeCompare(b.n) : (a,b)=>tot(b)-tot(a));
  const LAB=182, PADR=10, PADT=6, PADB=22, RH=26, GAP=2;
  const W = Math.max(640, el.parentNode.clientWidth);
  const cwid = (W-LAB-PADR)/rows.length;
  const H = PADT + fams.length*RH + PADB;
  const dpr = Math.min(devicePixelRatio||1, 2);
  el.width = W*dpr; el.height = H*dpr; el.style.height = H+'px';
  const g = el.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const ramp = ['--cq1','--cq2','--cq3','--cq4','--cq5','--cq6'].map(cv);
  const absent = cv('--sunken'), ink2 = cv('--ink-2'), ink3 = cv('--ink-3');
  // Each row is scaled to its own maximum. P450 runs to the hundreds and
  // oxidosqualene cyclase to single digits: on one shared scale every row but
  // the first would read as blank, which hides the thing this chart is for.
  const maxes = fams.map((_,i)=>Math.max(...rows.map(r=>r.v[i]))||1);
  g.font='11.5px "IBM Plex Sans",system-ui,sans-serif'; g.textBaseline='middle';
  fams.forEach((f,i)=>{
    const y = PADT + i*RH;
    g.fillStyle=ink2; g.textAlign='right';
    g.fillText((CHEMLOOK[f]||[f])[0], LAB-12, y+RH/2);
    rows.forEach((r,j)=>{
      const v=r.v[i], x=LAB+j*cwid;
      if(!v) g.fillStyle=absent;
      else { const t=Math.log(1+v)/Math.log(1+maxes[i]);
             g.fillStyle=ramp[Math.min(ramp.length-1, Math.floor(t*ramp.length))]; }
      g.fillRect(x, y+GAP/2, Math.max(1,cwid-0.6), RH-GAP);
    });
  });
  g.fillStyle=ink3; g.textAlign='left'; g.font='11px "IBM Plex Sans",system-ui,sans-serif';
  g.fillText(rows.length+' plants, ordered by '+(chem.sort==='name'?'name':'total genes'), LAB, H-PADB/2-1);
  const cells = rows.length*fams.length; let gaps=0;
  rows.forEach(r=>r.v.forEach(v=>{ if(!v) gaps++; }));
  $('#chemGaps').textContent = gaps
    ? nfl(cells-gaps)+' of '+nfl(cells)+' cells filled ('+(100*(cells-gaps)/cells).toFixed(1)+'%)'
    : 'every cell filled';
  el._hit = {rows, fams, LAB, cwid, RH, PADT};
}

function renderChem(){
  if(!CHEM){ return; }
  const fams = CHEM.fams, rows = CHEM.rows, N = rows.length;
  const idx = Object.fromEntries(fams.map((f,i)=>[f,i]));
  const colOf = f => rows.map(r=>r.v[idx[f]]);
  const presentIn = f => colOf(f).filter(v=>v>0).length;
  const allBig = rows.filter(r=>CHEMBIG.every(f=>r.v[idx[f]]>0)).length;
  const allTen = rows.filter(r=>r.v.every(v=>v>0)).length;

  $('#chemCount').textContent = N+' plants · '+fams.length+' families';
  $('#ctChem').textContent = N;

  // family rows
  $('#fams').innerHTML = fams.map((f,i)=>({f,i,med:quart(colOf(f))[1]}))
    .sort((a,b)=>b.med-a.med).map(o=>{
      const look = CHEMLOOK[o.f]||[o.f,''], p = presentIn(o.f), pct=(100*p/N).toFixed(1);
      return '<div class="famrow"><div><h4>'+esc(look[0])+'</h4><div class="makes">'+
        (CHEMBLURB[o.f]||'')+'</div></div><div class="rt"><div class="n">'+nfl(o.med)+'</div>'+
        '<div class="nl">matches, typical plant</div><div class="cov"><i style="width:'+pct+'%"></i></div>'+
        '<div class="covl">'+p+' of '+N+' plants</div></div></div>';
    }).join('');

  // profile
  const sel = $('#pfSel');
  sel.innerHTML = rows.map(r=>r).sort((a,b)=>a.n.localeCompare(b.n))
    .map(r=>'<option value="'+esc(r.c)+'">'+esc(r.n)+'</option>').join('');
  const MAXV = Math.max(...rows.map(r=>Math.max(...r.v)));
  function drawProfile(code){
    const r = rows.find(x=>x.c===code); if(!r) return;
    $('#pfName').textContent = r.n;
    const present = r.v.filter(v=>v>0).length, sum = r.v.reduce((a,b)=>a+b,0);
    $('#pfMeta').textContent = present+' of '+fams.length+' families present · '+nfl(sum)+' protein matches in total';
    const order = fams.map((_,i)=>i).sort((a,b)=>r.v[b]-r.v[a]);
    // area proportional to count: a disc of twice the area means twice the genes
    $('#pfBub').innerHTML = order.map(i=>{
      const v=r.v[i], look=CHEMLOOK[fams[i]]||[fams[i],''];
      const d = v ? Math.max(26, Math.sqrt(v/MAXV)*92) : 26;
      return '<div class="bcell" title="'+esc(look[0])+': '+nfl(v)+' genes"><span class="bdisc'+(v?'':' zero')+
        '" style="width:'+d.toFixed(0)+'px;height:'+d.toFixed(0)+'px">'+(v?nfl(v):'0')+'</span>'+
        '<span class="bname">'+esc(look[0])+'</span><span class="bmakes">'+esc(look[1])+'</span></div>';
    }).join('');
    $('#pfFoot').textContent = TXT('chem.footnote.disc-area');
  }
  const start = rows.some(r=>r.c==='Bnevi') ? 'Bnevi' : rows[0].c;
  sel.value = start; drawProfile(start);
  sel.onchange = () => drawProfile(sel.value);

  // literature comparison, our side computed from the data
  const q = f => quart(colOf(f));
  // Published counts live in the ATLAS Comparisons tab. A blank value there means
  // no agreed figure, and the row draws no published bar.
  const cmpRow = (name, key, col, max) => {
    const r = RF(key);
    return {n:name, sub:r.label || '', pub:(r.n == null ? null : r.n), k:col, max:max};
  };
  const CMP = [
    cmpRow('Cytochrome P450',        'chem.p450', 'p450',          800),
    cmpRow('UDP-glycosyltransferase','chem.ugt',  'UDPGT',         800),
    cmpRow('Terpene synthase',       'chem.tps',  'Terpene_synth', 120),
    cmpRow('BAHD acyltransferase',   'chem.bahd', 'Transferase',   800)
  ];
  $('#chemCmp').innerHTML = CMP.map(c=>{
    const [lo,med,hi] = q(c.k);
    const pubBar = c.pub==null
      ? '<span class="tr"></span><span class="cvv" style="color:var(--ink-3)">n/a</span>'
      : '<span class="tr"><i style="width:'+(100*c.pub/c.max).toFixed(1)+'%"></i></span><span class="cvv">'+c.pub+'</span>';
    return '<div class="crow"><span class="ccn">'+esc(c.n)+'<small>'+esc(c.sub)+'</small></span>'+
      '<span class="cbar pub">'+pubBar+'</span>'+
      '<span class="cbar us"><span class="tr"><i style="width:'+(100*med/c.max).toFixed(1)+'%"></i>'+
      '<b style="left:'+(100*lo/c.max).toFixed(1)+'%"></b><b style="left:'+(100*hi/c.max).toFixed(1)+'%"></b>'+
      '</span><span class="cvv">'+nfl(med)+'</span></span></div>';
  }).join('') + '<p class="foot" style="margin-top:14px">The dark bar is the median across '+N+
    ' plants; the two faint ticks mark the middle half of the collection. Bars within a row share a scale; rows do not.</p>';


  drawChem();
  const cel = $('#chemCv');
  cel.addEventListener('mousemove', ev => {
    const hit = cel._hit; if(!hit) return;
    const b = cel.getBoundingClientRect();
    const j = Math.floor((ev.clientX-b.left-hit.LAB)/hit.cwid), i = Math.floor((ev.clientY-b.top-hit.PADT)/hit.RH);
    if(j<0||j>=hit.rows.length||i<0||i>=hit.fams.length){ hideTip(); return; }
    const r = hit.rows[j], look = CHEMLOOK[hit.fams[i]]||[hit.fams[i]];
    showTip('<div class="tn">'+esc(r.n)+'</div>'+esc(look[0])+': <b class="mono">'+nfl(r.v[i])+'</b> genes', ev.clientX, ev.clientY);
  });
  cel.addEventListener('mouseleave', hideTip);
  cel.addEventListener('click', ev => {
    const hit = cel._hit; if(!hit) return;
    const b = cel.getBoundingClientRect();
    const j = Math.floor((ev.clientX-b.left-hit.LAB)/hit.cwid);
    if(j<0||j>=hit.rows.length) return;
    const p = byId[hit.rows[j].c]; if(p) openPlant(p);
  });
  $$('#chemSort button').forEach(b => b.onclick = () => {
    chem.sort = b.dataset.s;
    $$('#chemSort button').forEach(o => o.setAttribute('aria-pressed', String(o===b)));
    drawChem();
  });
}

/* ================= MARKERS ================= */
function mkDiagram(t, hostId, big){
  const host = $(hostId); if(!host) return;
  const unit = t.motif.replace(/\((\w+)\).*/,'$1'), reps = +t.repeats;
  const prod = +t.product_bp, fw = t.forward.length, rv = t.reverse.length;
  const repbp = unit.length*reps;
  const X0 = big?40:30, X1 = big?860:870, W = X1-X0, Y = big?74:46, H = big?30:28;
  const px = bp => X0 + W*bp/prod;
  const fEnd = px(fw), rStart = px(prod-rv);
  const rS = px((prod-repbp)/2), rE = px((prod+repbp)/2);
  let s = '<rect x="'+X0+'" y="'+Y+'" width="'+W+'" height="'+H+'" rx="4" fill="var(--sunken)"/>'+
    '<rect x="'+X0+'" y="'+Y+'" width="'+(fEnd-X0)+'" height="'+H+'" rx="4" fill="var(--s1)"/>'+
    '<rect x="'+rStart+'" y="'+Y+'" width="'+(X1-rStart)+'" height="'+H+'" rx="4" fill="var(--s1)"/>'+
    '<rect x="'+rS+'" y="'+Y+'" width="'+(rE-rS)+'" height="'+H+'" rx="4" fill="var(--accent)"/>';
  for(let i=0;i<reps;i++){ const xx = rS + (rE-rS)*i/reps;
    s += '<line x1="'+xx.toFixed(1)+'" y1="'+Y+'" x2="'+xx.toFixed(1)+'" y2="'+(Y+H)+
         '" stroke="var(--surface)" stroke-width="0.7" opacity=".55"/>'; }
  if(big){
    s += '<text class="lbl" x="'+((X0+fEnd)/2)+'" y="'+(Y-10)+'" text-anchor="middle" fill="var(--s1)">forward primer</text>'+
         '<text class="sm" x="'+((X0+fEnd)/2)+'" y="'+(Y+H+16)+'" text-anchor="middle">'+fw+' bases</text>'+
         '<text class="lbl" x="'+((rStart+X1)/2)+'" y="'+(Y-10)+'" text-anchor="middle" fill="var(--s1)">reverse primer</text>'+
         '<text class="sm" x="'+((rStart+X1)/2)+'" y="'+(Y+H+16)+'" text-anchor="middle">'+rv+' bases</text>'+
         '<text class="lbl" x="'+((rS+rE)/2)+'" y="'+(Y-10)+'" text-anchor="middle" fill="var(--accent)">'+unit+' repeated '+reps+' times</text>'+
         '<text class="sm" x="'+((rS+rE)/2)+'" y="'+(Y+H+16)+'" text-anchor="middle">'+repbp+' bases, '+Math.round(100*repbp/prod)+'% of the product</text>'+
         '<line x1="'+X0+'" y1="'+(Y+H+38)+'" x2="'+X1+'" y2="'+(Y+H+38)+'" stroke="var(--rule)"/>'+
         '<line x1="'+X0+'" y1="'+(Y+H+33)+'" x2="'+X0+'" y2="'+(Y+H+43)+'" stroke="var(--rule)"/>'+
         '<line x1="'+X1+'" y1="'+(Y+H+33)+'" x2="'+X1+'" y2="'+(Y+H+43)+'" stroke="var(--rule)"/>'+
         '<text class="sm" x="'+((X0+X1)/2)+'" y="'+(Y+H+56)+'" text-anchor="middle">whole product: '+prod+' base pairs</text>';
  } else {
    s += '<text class="lbl" x="'+((rS+rE)/2)+'" y="'+(Y-11)+'" text-anchor="middle" fill="var(--accent)">'+unit+' × '+reps+'</text>'+
         '<text class="sm" x="'+((X0+fEnd)/2)+'" y="'+(Y+H+15)+'" text-anchor="middle">fwd</text>'+
         '<text class="sm" x="'+((rStart+X1)/2)+'" y="'+(Y+H+15)+'" text-anchor="middle">rev</text>'+
         '<text class="sm" x="'+((rS+rE)/2)+'" y="'+(Y+H+15)+'" text-anchor="middle">'+repbp+' bases, '+Math.round(100*repbp/prod)+'% of the product</text>'+
         '<line x1="'+X0+'" y1="'+(Y+H+34)+'" x2="'+X1+'" y2="'+(Y+H+34)+'" stroke="var(--rule)"/>'+
         '<text class="sm" x="'+((X0+X1)/2)+'" y="'+(Y+H+51)+'" text-anchor="middle">'+prod+' bp</text>';
  }
  host.innerHTML = s;
}

function histoSVG(id, data, xlab, cls){
  const svg = $(id); if(!svg) return;
  const W=420,H=200,L=38,R=10,T=12,B=40;
  const max = Math.max(...data.map(d=>d[1])), bw=(W-L-R)/data.length;
  let s='';
  [0,max/2,max].forEach(v=>{ const yy = H-B-(H-T-B)*v/max;
    s += '<line class="ax" x1="'+L+'" y1="'+yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+yy.toFixed(1)+'" opacity=".45"/>'+
         '<text class="sm" x="'+(L-6)+'" y="'+(yy+3.5).toFixed(1)+'" text-anchor="end">'+Math.round(v)+'</text>'; });
  data.forEach((d,i)=>{ const h=(H-T-B)*d[1]/max;
    s += '<rect class="'+cls+'" x="'+(L+i*bw+1.5).toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+(bw-3).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="2"/>';
    if(i%2===0) s += '<text class="sm" x="'+(L+i*bw+bw/2).toFixed(1)+'" y="'+(H-B+15)+'" text-anchor="middle">'+d[0]+'</text>'; });
  s += '<line class="ax" x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'"/>'+
       '<text class="sm" x="'+((L+W-R)/2)+'" y="'+(H-6)+'" text-anchor="middle">'+xlab+'</text>';
  svg.innerHTML = s;
}

function renderMarkers(){
  if(!SSR) return;
  const T = SSR.tot, E = SSR.ex;
  $('#ctMk').textContent = T.plants;

  $('#mkFunnel').innerHTML = [
    ['Repeats found', nfl(T.ssr), 'every microsatellite in '+T.plants+' genomes'],
    ['With primers', nfl(T.mk), 'a primer pair could be designed'],
    ['Right size and type', nfl(SSR.scoreable), 'short enough to size precisely in a standard lab machine'],
    ['Shortlisted', nfl(T.short), '30 per plant, ranked', 1]
  ].map(s=>'<div class="fstep'+(s[3]?' last':'')+'"><div class="k">'+s[0]+'</div><div class="v">'+s[1]+
      '</div><div class="sn">'+s[2]+'</div></div>').join('');

  mkDiagram(E, '#mkdiag', true);
  $('#mkcap').innerHTML = '<b>'+esc(E.name)+'</b> · marker <span class="mono">'+esc(E.marker)+'</span><br>'+
    'forward <span class="mono">'+esc(E.forward)+'</span> · reverse <span class="mono">'+esc(E.reverse)+'</span><br>'+
    'Both primers melt at '+E.tm_f+'°C, so one annealing temperature runs the pair.';

  // alleles
  const unit = E.motif.replace(/\((\w+)\).*/,'$1'), reps = +E.repeats, prod = +E.product_bp;
  // Labelled by repeat count, never by plant. Only the first row is measured: it is
  // the repeat this assembly actually carries. The rest are what the same primer pair
  // would return at fewer copies, which is the whole point of the figure.
  $('#alleles').innerHTML = [reps, reps-7, reps-14, reps-22].map((r,i)=>{
    const bp = prod - (reps-r)*unit.length;
    return '<div class="al"><span class="who">'+(i===0
        ? r+' repeats <b>in this assembly</b>'
        : r+' repeats')+'</span>'+
      '<span class="bar"><i style="width:'+(100*bp/prod).toFixed(1)+'%"></i></span>'+
      '<span class="bp">'+bp+' bp</span></div>';
  }).join('');

  // motif compare
  const NM={2:'two-letter',3:'three-letter',4:'four-letter',5:'five-letter',6:'six-letter'};
  const KEYS=[['2','di'],['3','tri'],['4','tetra'],['5','penta'],['6','hexa']];
  const maxF = Math.max(...KEYS.map(k=>SSR.cls[k[1]]||0)), maxS = Math.max(...KEYS.map(k=>SSR.shortcls[k[0]]||0));
  $('#motifCmp').innerHTML = KEYS.map(kv=>{
    const f = SSR.cls[kv[1]]||0, sh = SSR.shortcls[kv[0]]||0;
    return '<div class="mrow"><span class="mn">'+NM[kv[0]]+'</span>'+
      '<span class="tr a"><i style="width:'+(100*f/maxF).toFixed(1)+'%"></i></span>'+
      '<span class="tr b"><i style="width:'+(100*sh/maxS).toFixed(1)+'%"></i></span></div>'+
      '<div class="mrow" style="border:0;padding:0 0 6px"><span></span>'+
      '<span class="mn" style="font-size:11px;color:var(--ink-3)">'+nfl(f)+'</span>'+
      '<span class="mn" style="font-size:11px;color:var(--ink-3)">'+nfl(sh)+'</span></div>';
  }).join('');

  // per-plant profile
  const PER = SSR.per;
  const codes = Object.keys(PER).sort((a,b)=>PER[a].n.localeCompare(PER[b].n));
  const sel = $('#spSel');
  sel.innerHTML = codes.map(c=>'<option value="'+esc(c)+'">'+esc(PER[c].n)+'</option>').join('');
  const CLSNAME={2:'two-letter',3:'three-letter',4:'four-letter',5:'five-letter',6:'six-letter'};
  function drawSP(code){
    const p = PER[code]; if(!p) return;
    sel.value = code;
    $('#spName').textContent = p.n;
    const mix = Object.keys(p.cls).map(k=>p.cls[k]+' '+CLSNAME[k]).join(', ');
    $('#spMeta').textContent = nfl(p.mb)+' Mb scanned · shortlist: '+mix;
    $('#spStats').innerHTML = [
      ['Repeats found', nfl(p.ssr), 'in this genome'],
      ['Markers designed', nfl(p.designed), 'with a full primer pair'],
      ['Shortlisted', nfl(p.short), 'candidates, ranked, ready to test'],
      ['Product range', p.bp[0]+'–'+p.bp[1], 'base pairs']
    ].map(s=>'<div class="pstat"><div class="k">'+s[0]+'</div><div class="v">'+s[1]+'</div><div class="sn">'+s[2]+'</div></div>').join('');
    $('#spFlag').innerHTML = p.q==='prov'
      ? '<div class="pflag">This assembly is '+p.mb+' Mb, well below the rest of the collection. These markers are provisional.</div>' : '';
    mkDiagram(p.top, '#spDiag', false);
    $('#spSeq').innerHTML = '<span class="mono">'+esc(p.top.marker)+'</span><br>'+
      'forward <span class="mono">'+esc(p.top.forward)+'</span> ('+p.top.tm_f+' °C)<br>'+
      'reverse <span class="mono">'+esc(p.top.reverse)+'</span> ('+p.top.tm_r+' °C)';
  }
  drawSP(codes.includes('Bnevi') ? 'Bnevi' : codes[0]);
  sel.onchange = () => drawSP(sel.value);

  histoSVG('#hbp',  SSR.hist_bp,  'product size (bp)', 'hbar');
  histoSVG('#hrep', SSR.hist_rep, 'repeat units',      'hbar2');

  // per-plant yield
  const yr = SSR.rows.slice().sort((a,b)=>b.mk-a.mk), maxMk = yr[0].mk;
  $('#yield').innerHTML = yr.map(r=>'<div class="yrow'+(r.q==='prov'?' prov':'')+'" data-c="'+esc(r.c)+
    '" title="'+esc(r.n)+': '+nfl(r.mk)+' markers from '+r.mb+' Mb"><span class="ynm">'+esc(r.n)+'</span>'+
    '<span class="tr"><i style="width:'+Math.max(0.4,100*r.mk/maxMk).toFixed(2)+'%"></i></span>'+
    '<span class="yv">'+nfl(r.mk)+'</span></div>').join('');
  $('#yield').onclick = ev => { const row = ev.target.closest('.yrow'); if(!row) return;
    const c = row.dataset.c; if(PER[c]){ drawSP(c); $('#spName').scrollIntoView({block:'center',behavior:'smooth'}); } };

}
