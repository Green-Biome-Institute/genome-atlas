
/* ================= PLASTOMES (chloroplast handover payload) =================
   Ported from the chloroplast thread's plastome_tab.html with the plate logic
   unchanged: the payload is the whole interface, and the five plates were built
   to PLASTOME_TAB_BRIEF.md and already checked. Changes here are integration
   only -- element ids namespaced to cp*, the outer IIFE turned into a function
   the atlas boots, and the per-plant card gained the OGDRAW plate for the plant
   it is showing. Numbers, wording and limitation lines are theirs.           */
function renderPlastomes2(){
"use strict";
var D = DATA.cp2; if(!D) return;
var R = D.rows, M = D.meta, S = D.stats, REF = D.ref;
var NS = "http://www.w3.org/2000/svg";

/* ---------- helpers ---------------------------------------------------- */
function f(n){ return n==null ? "n/a" : Number(n).toLocaleString("en-US"); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
/* italicise the epithets, leave rank abbreviations roman */
function sci(name){
  var rank = /^(subsp\.|var\.|ssp\.|f\.|×)$/;
  return String(name||"").split(" ").map(function(w){
    return rank.test(w) ? esc(w) : '<em class="sci">'+esc(w)+"</em>"; }).join(" ");
}
function el(tag, attrs, text){
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) if (attrs[k]!=null) e.setAttribute(k, attrs[k]);
  if (text!=null) e.textContent = text;
  return e;
}
function kb(n){ return (n/1000).toFixed(n%1000===0?0:1)+" kb"; }

/* ---------- scope band ------------------------------------------------- */
(function(){
  var cells = [
    ["plastomes", f(M.n), M.nfam + " families"],
    ["all four regions", f(M.nq), (M.n-M.nq) + " without, all explained below"],
    ["median length", f(S.L.med), f(S.L.min)+"–"+f(S.L.max)+" bp"],
    ["genes annotated", f(S.ng.med), S.ng.min+"–"+S.ng.max+" per plastome"],
    ["OGDRAW plates", f(M.og), (M.n-M.og)+" still to render"]
  ];
  document.getElementById("cpScope").innerHTML = cells.map(function(c){
    return '<div><div class="k">'+c[0]+'</div><div class="v">'+c[1]+'</div><div class="n">'+c[2]+"</div></div>";
  }).join("");
})();

/* ---------- Plate 1: per-plant card ------------------------------------ */
var byCode = {};
R.forEach(function(r){ byCode[r.c] = r; });

(function(){
  var sel = document.getElementById("cpSel");
  R.slice().sort(function(a,b){ return a.n.localeCompare(b.n); }).forEach(function(r){
    var o = document.createElement("option");
    o.value = r.c; o.textContent = r.n + (r.q ? "" : "  · no IR");
    sel.appendChild(o);
  });
  sel.addEventListener("change", function(){ draw(sel.value); });
  /* default to a plant with a story: the widest inverted repeat in the set */
  var start = R.filter(function(r){ return r.q; })
               .sort(function(a,b){ return b.ir - a.ir; })[0].c;
  sel.value = start; draw(start);
})();

function draw(code){
  var r = byCode[code];
  document.getElementById("cpName").innerHTML = sci(r.n);
  cpPlate(r);
  var bits = [r.fam];
  if (r.com) {                                     /* the sheet sometimes carries the same common name twice */
    var seen = {}, cn = [];
    r.com.split(/\s*,\s*/).forEach(function(w){
      var k = w.toLowerCase().replace(/[^a-z]/g,"");
      if (k && !seen[k]) { seen[k] = 1; cn.push(w); } });
    bits.push(cn.join(", "));
  }
  if (r.cnps) bits.push("CNPS " + r.cnps);
  bits.push(r.tier.replace("tier","tier "));
  document.getElementById("cpMeta").innerHTML = esc(bits.filter(Boolean).join("  ·  "));

  var stats = [
    ["total length", f(r.L)+" bp", r.L>S.L.med ? "above the set median" : (r.L<S.L.med ? "below the set median" : "the set median")],
    ["GC", r.gc.toFixed(2)+"%", "set spans "+S.gc.min+"–"+S.gc.max+"%"],
    ["distinct genes", f(r.ng), (r.cds+r.trn+r.rrn)+" annotated features: "+r.cds+" coding, "+r.trn+" tRNA, "+r.rrn+" rRNA"
      + (r.q ? ", and every gene inside the repeat is annotated in both copies" : "")
      + (r.status === "withdrawn" ? ". Withdrawn from submission pending reassembly; the counts are current" : "")]
  ];
  if (r.q) stats.push(["inverted repeat", f(r.ir)+" bp", "each of two copies"]);
  else stats.push(["single copy", f(r.L)+" bp", "no repeat annotated"]);
  document.getElementById("cpStats").innerHTML = stats.map(function(s){
    return '<div class="pstat"><div class="k">'+s[0]+'</div><div class="v">'+s[1]+'</div><div class="n">'+esc(s[2])+"</div></div>";
  }).join("");

  document.getElementById("cpFlag").innerHTML = (r.flag||[]).map(function(t){
    return '<div class="pflag">'+t+"</div>"; }).join("");

  drawMolecule(r);

  var lines = [];
  lines.push("record   " + r.sid);
  lines.push("length   " + f(r.L) + " bp" + (r.q ? "   (LSC " + f(r.lsc) + " + IR " + f(r.ir) + " × 2 + SSC " + f(r.ssc) + ")" : ""));
  if (r.q) r.reg.forEach(function(g){
    lines.push(pad(g[0],9) + f(((g[1]-1)%r.L)+1) + " – " + f(((g[2]-1)%r.L)+1) + "   " + f(g[3]) + " bp");
  });
  if (r.bp) lines.push("bioproj  " + r.bp + "   biosample " + r.bs);
  document.getElementById("cpSeq").textContent = lines.join("\n");

  var lim;
  if (r.q) lim = TXT('plastomes.note.boundaries-geseq');
  else lim = TXT('plastomes.note.no-inverted-repeat');
  document.getElementById("cpLim").textContent = lim;
}
function pad(s,n){ s = String(s); while (s.length < n) s += " "; return s; }

function drawMolecule(r){
  var svg = document.getElementById("cpDiag");
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  var W = 980, L = 12, Rr = 968, IW = Rr - L;
  var H = r.q ? 250 : 130, BY = r.q ? 96 : 20, BH = 40;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  var x = function(bp){ return L + IW * (bp / r.L); };

  var segs;
  if (r.q) {
    var acc = 0;
    segs = r.reg.map(function(g){ var s = {k:g[0], off:acc, len:g[3], a:g[1], b:g[2]}; acc += g[3]; return s; });
  } else {
    segs = [{k:"single copy", off:0, len:r.L, a:1, b:r.L}];
  }
  var fill = {LSC:"var(--lsc)", IRA:"var(--ir)", IRB:"var(--ir)", SSC:"var(--ssc)"};

  segs.forEach(function(s){
    var x0 = x(s.off), w = IW * (s.len / r.L);
    svg.appendChild(el("rect", {x:x0, y:BY, width:Math.max(w,1), height:BH,
      fill: fill[s.k] || "var(--ink-2)", rx:2}));
    if (w > 62) {
      svg.appendChild(el("text", {x:x0+w/2, y:BY+17, "text-anchor":"middle", "font-size":11,
        fill:"#fff", "font-weight":600, class:"s"}, s.k === "IRA" || s.k === "IRB" ? "IR" : s.k));
      svg.appendChild(el("text", {x:x0+w/2, y:BY+31, "text-anchor":"middle", "font-size":10.5,
        fill:"#fff", "fill-opacity":.85}, f(s.len)));
    } else if (w > 16) {
      svg.appendChild(el("text", {x:x0+w/2, y:BY+24, "text-anchor":"middle", "font-size":9.5,
        fill:"#fff", "font-weight":600, class:"s"}, s.k === "SSC" ? "SSC" : ""));
    }
  });
  /* labels that must live under the bar, packed into rows so none collide */
  var below = [];
  segs.forEach(function(s){
    var w = IW * (s.len / r.L);
    if (w <= 62 && s.k === "SSC")
      below.push({x:x(s.off)+w/2, t:"SSC " + f(s.len), col:"var(--ssc)", lead:true, w:78});
  });

  if (!r.q) {
    ruler(svg, x, r.L, L, Rr, r.q);
    return;
  }

  /* boundary genes, at their real spans, staggered so labels do not collide */
  var rows = [{lab:38, gy:46}, {lab:64, gy:72}];
  var used = [];
  r.jn.forEach(function(j, i){
    var jx = x(segs[i].off + segs[i].len);
    svg.appendChild(el("line", {x1:jx, y1:BY-6, x2:jx, y2:BY+BH+6,
      stroke:"var(--ink-3)", "stroke-width":1, "stroke-dasharray":"2 2"}));
    var lab = j.a.replace(/IR[AB]/,"IR") + "→" + j.b.replace(/IR[AB]/,"IR");
    below.push({x:jx, t:lab + "  " + f(((segs[i].off + segs[i].len - 1) % r.L) + 1),
                col:"var(--ink-3)", lead:false, w:112});

    var genes = j.g.filter(function(g){ return g[0].indexOf("-fragment") < 0; });
    genes.forEach(function(g){
      var a = g[1], b = g[2];
      var o1 = ((a - r.reg[0][1]) % r.L + r.L) % r.L;
      var o2 = o1 + (b - a);
      var gx = x(o1), gw = Math.max(IW * ((b - a) / r.L), 3);
      var slot = 0, box = [gx - 34, gx + gw + 34];
      for (var t = 0; t < used.length; t++) {
        if (used[t].r === 0 && !(box[1] < used[t].a || box[0] > used[t].b)) { slot = 1; break; }
      }
      used.push({r:slot, a:box[0], b:box[1]});
      var row = rows[slot];
      svg.appendChild(el("rect", {x:gx, y:row.gy, width:gw, height:10, rx:2, fill:"var(--ink-2)"}));
      svg.appendChild(el("line", {x1:gx + gw/2, y1:row.gy + 10, x2:gx + gw/2, y2:BY,
        stroke:"var(--ink-2)", "stroke-width":1, "stroke-opacity":.5}));
      var tw = g[0].length * 6.2, tx = Math.min(Math.max(gx + gw/2, L + tw/2), Rr - tw/2);
      svg.appendChild(el("text", {x:tx, y:row.lab, "text-anchor":"middle", "font-size":11,
        fill:"var(--ink)", "font-style":"italic"}, g[0]));
    });
  });
  if (!used.length) {
    svg.appendChild(el("text", {x:L, y:64, "font-size":11.5, fill:"var(--ink-3)", class:"s"},
      TXT('plastomes.note.no-boundary-gene')));
  }

  /* pack the under-bar labels into as few rows as will hold them without touching */
  below.sort(function(a,b){ return (b.lead?1:0) - (a.lead?1:0) || a.x - b.x; });
  var lanes = [];
  below.forEach(function(b){
    b.cx = Math.min(Math.max(b.x, L + b.w/2), Rr - b.w/2);
    var lane = 0;
    while (lanes[lane] != null && b.cx - b.w/2 < lanes[lane] + 8) lane++;
    lanes[lane] = b.cx + b.w/2;
    b.lane = lane;
  });
  below.forEach(function(b){
    var y = BY + BH + 16 + b.lane * 15;
    if (b.lead) {
      svg.appendChild(el("line", {x1:b.x, y1:BY+BH+1, x2:b.x, y2:y-13, stroke:b.col, "stroke-width":1}));
      if (Math.abs(b.cx - b.x) > 1)
        svg.appendChild(el("line", {x1:b.x, y1:y-13, x2:b.cx, y2:y-9, stroke:b.col, "stroke-width":1}));
    }
    svg.appendChild(el("text", {x:b.cx, y:y, "text-anchor":"middle", "font-size":9.5,
      fill:b.col, "font-weight": b.lead ? 600 : 400}, b.t));
  });

  ruler(svg, x, r.L, L, Rr, r.q);
}

function ruler(svg, x, L, x0, x1, quad){
  var Y = quad ? 190 : 74;
  svg.appendChild(el("line", {x1:x0, y1:Y, x2:x1, y2:Y, stroke:"var(--rule)", "stroke-width":1}));
  var step = 20000;
  for (var bp = 0; bp <= L; bp += step) {
    var px = x(bp);
    svg.appendChild(el("line", {x1:px, y1:Y, x2:px, y2:Y+5, stroke:"var(--rule)", "stroke-width":1}));
    svg.appendChild(el("text", {x:px, y:Y+19, "text-anchor":"middle", "font-size":10, fill:"var(--ink-3)"},
      (bp/1000) + ""));
  }
  svg.appendChild(el("text", {x:x1, y:Y+36, "text-anchor":"end", "font-size":10, fill:"var(--ink-3)", class:"s"},
    quad ? "kilobases from the start of the large single copy" : "kilobases"));
}

/* ---------- Plate 2: the ribbon ---------------------------------------- */
(function(){
  var q = R.filter(function(r){ return r.q; })
           .sort(function(a,b){ return b.ssc - a.ssc || a.L - b.L; });
  var svg = document.getElementById("cpRibbon");
  var W = 980, PL = 8, PR = 8, IW = W - PL - PR;
  var RH = 4, GAP = 1.1, TOP = 26;
  var H = TOP + q.length * (RH + GAP) + 46;
  var maxL = Math.max.apply(null, R.map(function(r){ return r.L; }));
  var x = function(bp){ return PL + IW * (bp / maxL); };
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("width", W);

  /* top ruler */
  for (var bp = 0; bp <= maxL; bp += 20000) {
    var px = x(bp);
    svg.appendChild(el("line", {x1:px, y1:TOP-8, x2:px, y2:H-40, stroke:"var(--rule-soft)", "stroke-width":1}));
    svg.appendChild(el("text", {x:px, y:TOP-13, "text-anchor":"middle", "font-size":10, fill:"var(--ink-3)"}, (bp/1000)+""));
  }
  svg.appendChild(el("text", {x:PL, y:12, "font-size":10, fill:"var(--ink-3)", class:"s"}, "kilobases"));

  var fill = {LSC:"var(--lsc)", IRA:"var(--ir)", IRB:"var(--ir)", SSC:"var(--ssc)"};
  q.forEach(function(r, i){
    var y = TOP + i * (RH + GAP), acc = 0;
    var g = el("g", {});
    g.appendChild(el("title", {}, r.n + ": " + f(r.L) + " bp; LSC " + f(r.lsc) + ", IR " + f(r.ir) + " ×2, SSC " + f(r.ssc)));
    g.appendChild(el("rect", {x:PL, y:y - GAP/2, width:IW, height:RH + GAP,
      fill:"transparent", class:"cprow"}));
    r.reg.forEach(function(s){
      g.appendChild(el("rect", {x:x(acc), y:y, width:Math.max(IW*(s[3]/maxL),0.6), height:RH,
        fill:fill[s[0]] || "var(--accent)"}));
      acc += s[3];
    });
    svg.appendChild(g);
  });

  /* baseline axis */
  var BY = H - 36;
  svg.appendChild(el("line", {x1:PL, y1:BY, x2:x(maxL), y2:BY, stroke:"var(--rule)", "stroke-width":1}));
  for (var bp2 = 0; bp2 <= maxL; bp2 += 20000) {
    svg.appendChild(el("line", {x1:x(bp2), y1:BY, x2:x(bp2), y2:BY+5, stroke:"var(--rule)", "stroke-width":1}));
    svg.appendChild(el("text", {x:x(bp2), y:BY+18, "text-anchor":"middle", "font-size":10, fill:"var(--ink-3)"}, (bp2/1000)+""));
  }

  document.getElementById("cpRibbonNote").innerHTML =
    TXT('plastomes.note.ribbon', {max: f(S.ssc.max), min: f(S.ssc.min),
        amber: R.filter(function(r){ return r.q && r.ssc < 8000; }).length});
})();

/* ---------- Plate 3: junction census ----------------------------------- */
(function(){
  var svg = document.getElementById("cpCensus"), C = D.cen;
  var W = 980, PL = 116, PR = 20, IW = W - PL - PR;
  var BLOCK = 86, TOP = 16, H = TOP + C.length * BLOCK + 30;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("width", W);
  var RARE = 6;                       /* an outcome seen this few times or fewer */

  C.forEach(function(c, i){
    var y = TOP + i * BLOCK;
    svg.appendChild(el("text", {x:PL-12, y:y+22, "text-anchor":"end", "font-size":12.5,
      fill:"var(--ink)", "font-weight":600, class:"s"}, c.lab));
    svg.appendChild(el("text", {x:PL-12, y:y+37, "text-anchor":"end", "font-size":10,
      fill:"var(--ink-3)"}, "n = " + c.tot));
    var acc = 0, below = [];
    c.items.forEach(function(it){
      var name = it[0], n = it[1], w = IW * (n / c.tot), x0 = PL + acc;
      var rare = n <= RARE, none = name === "none";
      var g = el("g", {});
      g.appendChild(el("title", {}, (none ? "no gene crosses this boundary" : name) + ": " + n + " of " + c.tot + " plants"));
      g.appendChild(el("rect", {x:x0, y:y+6, width:Math.max(w,1.2), height:30, rx:1.5,
        fill: rare ? "var(--s2)" : (none ? "var(--sunken)" : "var(--muted)"),
        stroke: none ? "var(--rule)" : "none", "stroke-width": none ? 1 : 0}));
      svg.appendChild(g);
      if (w > 74 && !rare) {
        svg.appendChild(el("text", {x:x0+w/2, y:y+20, "text-anchor":"middle", "font-size":11.5,
          fill:"var(--ink)", "font-style": none ? "normal" : "italic"}, none ? "no gene crosses" : name));
        svg.appendChild(el("text", {x:x0+w/2, y:y+32, "text-anchor":"middle", "font-size":10,
          fill:"var(--ink-2)"}, n + " of " + c.tot));
      } else if (rare) {
        below.push({x:x0 + w/2, name:name, n:n});
      }
      acc += w;
    });
    /* the rare outcomes are slivers at this width, so they are named on one line
       beneath the bar, with a bracket back to the stretch of bar they occupy */
    if (below.length) {
      var bx0 = Math.min.apply(null, below.map(function(b){ return b.x; })) - 1;
      var bx1 = Math.max.apply(null, below.map(function(b){ return b.x; })) + 1;
      svg.appendChild(el("path", {d:"M"+bx0+" "+(y+38)+" L"+bx0+" "+(y+44)+" L"+bx1+" "+(y+44)+" L"+bx1+" "+(y+38),
        fill:"none", stroke:"var(--s2)", "stroke-width":1}));
      var tt = el("text", {x:W-PR, y:y+58, "text-anchor":"end", "font-size":11, fill:"var(--s2)"});
      tt.appendChild(el("tspan", {class:"s"}, "rare outcomes:  "));
      below.forEach(function(b, k){
        if (k) tt.appendChild(el("tspan", {}, "   \u00b7   "));
        tt.appendChild(el("tspan", {"font-style":"italic"}, b.name));
        tt.appendChild(el("tspan", {}, " \u00d7" + b.n));
      });
      svg.appendChild(tt);
    }
  });

  document.getElementById("cpCensusNote").innerHTML =
    TXT('plastomes.note.census');
})();

/* ---------- Plate 4: against published values --------------------------- */
(function(){
  var svg = document.getElementById("cpRef");
  var W = 980, PL = 128, PR = 150, IW = W - PL - PR;
  var rows = [
    {k:"total length", ours:S.L,   theirs:REF.L,   scope:M.n + " records"},
    {k:"large single copy", ours:S.lsc, theirs:REF.lsc, scope:M.nq + " with all four regions"},
    {k:"short single copy", ours:S.ssc, theirs:REF.ssc, scope:M.nq + " with all four regions"},
    {k:"inverted repeat", ours:S.ir,  theirs:REF.ir,  scope:M.nq + " with all four regions"}
  ];
  var BLOCK = 92, TOP = 30, H = TOP + rows.length * BLOCK + 24;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("width", W);
  var lo = 0, hi = 0;
  rows.forEach(function(r){ hi = Math.max(hi, r.theirs.max, r.ours.max); });
  var x = function(v){ return PL + IW * ((v - lo) / (hi - lo)); };

  /* shared axis */
  for (var v = 0; v <= hi; v += 25000) {
    svg.appendChild(el("line", {x1:x(v), y1:TOP-10, x2:x(v), y2:H-24, stroke:"var(--rule-soft)", "stroke-width":1}));
    svg.appendChild(el("text", {x:x(v), y:TOP-16, "text-anchor":"middle", "font-size":10, fill:"var(--ink-3)"}, (v/1000)+""));
  }
  svg.appendChild(el("text", {x:PL-14, y:TOP-16, "text-anchor":"end", "font-size":10,
    fill:"var(--ink-3)", class:"s"}, "kilobases"));

  rows.forEach(function(r, i){
    var y = TOP + i * BLOCK + 18;
    svg.appendChild(el("text", {x:PL-14, y:y+4, "text-anchor":"end", "font-size":12.5,
      fill:"var(--ink)", "font-weight":600, class:"s"}, r.k));
    svg.appendChild(el("text", {x:PL-14, y:y+19, "text-anchor":"end", "font-size":10, fill:"var(--ink-3)"}, r.scope));

    /* published range: pale band */
    var t = r.theirs;
    svg.appendChild(el("rect", {x:x(t.min), y:y-16, width:x(t.max)-x(t.min), height:32, rx:3,
      fill:"var(--sunken)"}));
    var bw = x(t.max) - x(t.min), inside = bw > 140;
    svg.appendChild(el("text", {x:inside ? x(t.min)+5 : x(t.min)-6, y:y+28,
      "text-anchor": inside ? "start" : "end", "font-size":9.5, fill:"var(--ink-3)"}, f(t.min)));
    svg.appendChild(el("text", {x:inside ? x(t.max)-5 : x(t.max)+6, y:y+28,
      "text-anchor": inside ? "end" : "start", "font-size":9.5, fill:"var(--ink-3)"}, f(t.max)));
    if (t.med != null) {
      svg.appendChild(el("line", {x1:x(t.med), y1:y-16, x2:x(t.med), y2:y+16,
        stroke:"var(--ink-3)", "stroke-width":1.5, "stroke-dasharray":"3 2"}));
      svg.appendChild(el("text", {x:x(t.med)+6, y:y-19, "font-size":9.5,
        fill:"var(--ink-3)"}, "their median " + f(t.med)));
    }

    /* ours: whisker + IQR + median notch */
    var o = r.ours;
    svg.appendChild(el("line", {x1:x(o.min), y1:y, x2:x(o.max), y2:y, stroke:"var(--accent)", "stroke-width":1.4}));
    svg.appendChild(el("line", {x1:x(o.min), y1:y-6, x2:x(o.min), y2:y+6, stroke:"var(--accent)", "stroke-width":1.4}));
    svg.appendChild(el("line", {x1:x(o.max), y1:y-6, x2:x(o.max), y2:y+6, stroke:"var(--accent)", "stroke-width":1.4}));
    svg.appendChild(el("rect", {x:x(o.q1), y:y-8, width:Math.max(x(o.q3)-x(o.q1),2), height:16, rx:2,
      fill:"var(--accent)"}));
    svg.appendChild(el("line", {x1:x(o.med), y1:y-11, x2:x(o.med), y2:y+11, stroke:"var(--surface)", "stroke-width":2}));

    svg.appendChild(el("text", {x:W-PR+14, y:y-1, "font-size":11, fill:"var(--ink-2)"},
      "ours  " + f(o.min) + "–" + f(o.max)));
    svg.appendChild(el("text", {x:W-PR+14, y:y+13, "font-size":11, fill:"var(--ink-3)"},
      "median " + f(o.med)));
  });

  document.getElementById("cpRefNote").innerHTML =
    TXT('plastomes.note.reference', {cite: esc(REF.cite), scope: esc(REF.note),
        shorter: R.filter(function(r){ return r.q && r.ssc < REF.ssc.min; }).length,
        ourmin: f(S.ssc.min), refmin: f(REF.ssc.min), nq: M.nq})
})();

/* ---------- Plate 5: GC ------------------------------------------------- */
(function(){
  var svg = document.getElementById("cpGC");
  var W = 980, PL = 40, PR = 40, IW = W - PL - PR, H = 250, BASE = 188;
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("width", W);
  var lo = 33.5, hi = 39.5;
  var x = function(v){ return PL + IW * ((v - lo) / (hi - lo)); };

  /* published band for angiosperm plastomes */
  svg.appendChild(el("rect", {x:x(35), y:34, width:x(38)-x(35), height:BASE-34, fill:"var(--sunken)"}));
  svg.appendChild(el("text", {x:(x(35)+x(38))/2, y:26, "text-anchor":"middle", "font-size":10.5,
    fill:"var(--ink-3)", class:"s"}, "35–38%, an orientation band for typical angiosperm plastomes"));

  /* beeswarm */
  var pts = R.map(function(r){ return {v:r.gc, n:r.n, c:r.c}; }).sort(function(a,b){ return a.v-b.v; });
  var cols = [];
  var Rr = 3.2;
  pts.forEach(function(p){
    var px = x(p.v), lvl = 0;
    while (cols[lvl] != null && px - cols[lvl] < Rr*2 - 0.4) lvl++;
    cols[lvl] = px;
    p.px = px; p.py = BASE - 8 - lvl * (Rr*2 - 0.6);
  });
  pts.forEach(function(p){
    var g = el("g", {});
    g.appendChild(el("title", {}, p.n + ": " + p.v.toFixed(2) + "% GC"));
    g.appendChild(el("circle", {cx:p.px, cy:p.py, r:Rr, fill:"var(--accent)", "fill-opacity":.8}));
    svg.appendChild(g);
  });

  /* median marker */
  svg.appendChild(el("line", {x1:x(S.gc.med), y1:34, x2:x(S.gc.med), y2:BASE, stroke:"var(--s2)", "stroke-width":1.5}));
  svg.appendChild(el("text", {x:x(S.gc.med), y:BASE+34, "text-anchor":"middle", "font-size":10.5, fill:"var(--s2)"},
    "median here " + S.gc.med.toFixed(2) + "%"));

  /* axis */
  svg.appendChild(el("line", {x1:PL, y1:BASE, x2:PL+IW, y2:BASE, stroke:"var(--rule)", "stroke-width":1}));
  for (var v = 34; v <= 39.5; v += 0.5) {
    svg.appendChild(el("line", {x1:x(v), y1:BASE, x2:x(v), y2:BASE+5, stroke:"var(--rule)", "stroke-width":1}));
    svg.appendChild(el("text", {x:x(v), y:BASE+19, "text-anchor":"middle", "font-size":10, fill:"var(--ink-3)"},
      v.toFixed(1)));
  }
  svg.appendChild(el("text", {x:PL+IW, y:BASE+52, "text-anchor":"end", "font-size":10, fill:"var(--ink-3)", class:"s"},
    "% GC"));

  document.getElementById("cpGCNote").innerHTML =
    "All " + M.n + " records. The collection spans " + S.gc.min + "% to " + S.gc.max + "% across " + M.nfam
    + " families, and " + R.filter(function(r){ return r.gc >= 35 && r.gc <= 38; }).length + " fall inside the "
    + "band. The three dots to its left also have no inverted repeat: two <em class=\"sci\">Hesperocyparis</em> "
    + "and the <em class=\"sci\">Astragalus</em>. GC is computed from each submitted sequence, so it counts "
    + "ambiguity codes too.";
})();

}

/* The annotated OGDRAW figure for whichever plant the card is showing. It is the
   same image the plant drawer uses, so it costs nothing extra to draw here. */
function cpPlate(r){
  var host = document.getElementById('cpPlate'); if(!host) return;
  var p = byId[r.c], k = p && p.cpimg;
  if(k && CPIMG[k]){
    host.innerHTML = '<div class="lab">the annotated map</div>' +
      '<button class="cpimg" data-full="' + esc(k) + '"><img src="' + CPIMG[k] +
      '" alt="Annotated chloroplast genome map of ' + esc(r.n) + '" loading="lazy"></button>';
    host.querySelector('.cpimg').onclick = function(){
      var lb = document.getElementById('lightbox');
      lb.querySelector('img').src = CPIMG[k]; lb.classList.add('on'); };
  } else {
    host.innerHTML = '<div class="lab">the annotated map</div>' +
      '<div class="nomap"><svg viewBox="0 0 60 60" aria-hidden="true">' +
      '<circle cx="30" cy="30" r="23"/><circle cx="30" cy="30" r="11"/></svg>' +
      '<div><div class="t">No OGDRAW plate yet.</div><div class="d">The record is annotated and every ' +
      'measurement on this card comes from it; only the drawing is outstanding.</div></div></div>';
  }
}

/* ---------- Plate: genes that come and go ------------------------------
   Presence of the 25 variable genes, read from the submitted feature tables.
   The point is not that we found losses. It is that the losses land on families
   where the literature already put them, which is a check on the pipeline. The
   one pattern that does NOT have that support is named as unverified.          */
function renderGeneLoss(){
  var host = document.getElementById("cpLoss");
  var P2 = DATA.cp2;
  if (!host || !P2 || !P2.vgenes) return;
  var rows = P2.rows, GEN = P2.vgenes;

  // established in the plastome literature; the atlas says which and does not
  // dress up the rest as discovery
  var KNOWN = { rps16:1, accD:1, ycf1:1, infA:1, clpP1:1, rpl22:1, rpl23:1, ycf2:1,
                ndhA:1, ndhB:1, ndhD:1, ndhE:1, ndhF:1, ndhG:1, ndhH:1, ndhI:1,
                ndhJ:1, ndhK:1, rps12:1, rpl32:1 };
  var FLAG = { "trnE-UUC": "absent in every Asteraceae here and nowhere else, which is too clean; "
                         + "check against the raw output before trusting it" };

  var lost = [], kept = [];
  GEN.forEach(function(g){
    var miss = rows.filter(function(r){ return (r.ga||[]).indexOf(g) >= 0; });
    var have = rows.length - miss.length;
    if (have <= 8) kept.push({ g:g, n:have,
          fams: tally(rows.filter(function(r){ return (r.ga||[]).indexOf(g) < 0; })) });
    else if (miss.length) lost.push({ g:g, n:miss.length, fams: tally(miss) });
  });
  lost.sort(function(a,b){ return b.n - a.n; });
  kept.sort(function(a,b){ return b.n - a.n; });

  function tally(rs){
    var c = {}; rs.forEach(function(r){ c[r.fam] = (c[r.fam]||0)+1; });
    return Object.keys(c).sort(function(a,b){ return c[b]-c[a]; })
                  .map(function(f){ return f + " " + c[f]; });
  }
  function row(o, verb){
    var flag = FLAG[o.g];
    return '<div class="crow"><span class="ccn"><span class="mono">' + esc(o.g) + '</span>'
      + (flag ? '<small style="color:var(--q-dup)">not established</small>'
              : (KNOWN[o.g] ? '<small>a documented loss</small>' : '<small>&nbsp;</small>'))
      + '</span><span style="grid-column:2/-1;font-size:13px;color:var(--ink-2);line-height:1.5">'
      + '<b>' + verb + ' ' + o.n + '</b> &middot; ' + esc(o.fams.join(", "))
      + (flag ? '<br><span style="color:var(--q-dup);font-size:12px">' + esc(flag) + '</span>' : '')
      + '</span></div>';
  }

  host.innerHTML =
    '<div class="cmphead"><span>gene</span><span style="grid-column:2/-1">where it is missing, by family</span></div>'
    + lost.map(function(o){ return row(o, "absent in"); }).join('')
    + (kept.length ? '<div class="cmphead" style="margin-top:22px"><span>gene</span>'
        + '<span style="grid-column:2/-1">carried by only a few, and they are the same few</span></div>'
        + kept.map(function(o){ return row(o, "present in"); }).join('') : '');

  document.getElementById("cpLossFoot").innerHTML =
    TXT('plastomes.note.gene-loss');
}
