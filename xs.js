/* Scroll story: turn (r01→r65, 5° steps), stats on the right, settle front, then dive into the screen (z01→z59).
   While diving, the render frame is kept larger than the window on every side where the machine is cut,
   so the cut edge is never on screen. The screen ends up filling the window, then shrinks into the tablet card. */
(function () {
  var sec = document.getElementById("xs"); if (!sec) return;
  var FW = 1800, FH = 1242;                     // frame aspect (all sizes share it)
  var NR = 65, NZ = 59;
  var QZ = window.XS_QUADS || [], QR = window.XS_QROT || [], BB = window.XS_BBOX || {};
  var pin = sec.querySelector(".xs-pin"), intro = sec.querySelector(".xs-intro"), mach = sec.querySelector(".xs-mach"), img = document.getElementById("xsframe");
  var refl = document.getElementById("xsrefl"), ui = sec.querySelector(".xs-quad.ui"), glass = sec.querySelector(".xs-quad.glass");
  var stats = Array.prototype.slice.call(sec.querySelectorAll(".xst")), statsBox = sec.querySelector(".xs-stats"); var tag = sec.querySelector(".xs-tag");
  var flat = sec.querySelector(".xs-flat"), copy = sec.querySelector(".xs-copy"), foot = sec.querySelector(".xs-foot"), bar = sec.querySelector(".xs-foot .bar i");
  var BX = .0267, BY = .0413; // black bezel inside the glass: sides / top-bottom

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a)); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function eio(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function solve(A, b) { var n = b.length; for (var i = 0; i < n; i++) { var m = i; for (var r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; var t = A[i]; A[i] = A[m]; A[m] = t; t = b[i]; b[i] = b[m]; b[m] = t; for (r = i + 1; r < n; r++) { var f = A[r][i] / A[i][i]; for (var c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } } var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; } return x; }
  function m3d(w, h, P) { var S = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = []; for (var i = 0; i < 4; i++) { var x = S[i][0], y = S[i][1], X = P[i][0], Y = P[i][1]; A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X); A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y); } var k = solve(A, b); return "matrix3d(" + [k[0], k[3], 0, k[6], k[1], k[4], 0, k[7], 0, 0, 1, 0, k[2], k[5], 0, 1].join(",") + ")"; }
  function bil(q, u, v) { var a = q[0], b = q[1], c = q[2], d = q[3]; return [(1 - u) * (1 - v) * a[0] + u * (1 - v) * b[0] + u * v * c[0] + (1 - u) * v * d[0], (1 - u) * (1 - v) * a[1] + u * (1 - v) * b[1] + u * v * c[1] + (1 - u) * v * d[1]]; }
  function inner(q) { return [bil(q, BX, BY), bil(q, 1 - BX, BY), bil(q, 1 - BX, 1 - BY), bil(q, BX, 1 - BY)]; }
  function qc(q) { return [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4]; }
  function qw(q) { return ((q[1][0] - q[0][0]) + (q[2][0] - q[3][0])) / 2; }
  function qh(q) { return ((q[3][1] - q[0][1]) + (q[2][1] - q[1][1])) / 2; }

  // ---- frames: pick a size for this screen, load the 10° set first, then fill in
  var names = [], i;
  for (i = 1; i <= NR; i++) names.push("r" + String(i).padStart(2, "0"));
  for (i = 1; i <= NZ; i++) names.push("z" + String(i).padStart(2, "0"));
  var tagR = "m", tagZ = "m", cache = [], ready = [];
  function tagFor(px) { return px <= 1300 ? "s" : px <= 1950 ? "m" : "l"; }
  function src(k) { return "img/hero/" + (k < NR ? tagR : tagZ) + "/" + names[k] + ".webp"; }
  function load(k) { if (cache[k]) return; var im = new Image(); im.decoding = "async"; im.onload = function () { ready[k] = true; if (k === want) show(k); }; im.src = src(k); cache[k] = im; }
  function loadAll() {
    var order = [], k;
    for (k = 0; k < names.length; k += 2) order.push(k);
    for (k = 1; k < names.length; k += 2) order.push(k);
    var n = 0; (function next() { var end = Math.min(order.length, n + 6); for (; n < end; n++) load(order[n]); if (n < order.length) setTimeout(next, 120); })();
  }
  // while diving only fall back to an earlier (wider) frame, so a cut edge can never come into view
  function nearest(k) { if (ready[k]) return k; for (var d = 1; d < 8; d++) { if (ready[k - d] && (k < NR || k - d >= NR)) return k - d; if (k < NR && ready[k + d] && k + d < NR) return k + d; } return -1; }

  // ---- layout + the dive schedule
  var L = {}, want = 0, shown = -1;
  function layout() {
    // label box = its real text width, so number + label centre exactly under the line above
    stats.forEach(function (s) { var sp = s.querySelector("span"); if (!sp) return; sp.style.width = ""; var r = document.createRange(); r.selectNodeContents(sp); var w = 0; Array.prototype.forEach.call(r.getClientRects(), function (c) { w = Math.max(w, c.width); }); if (w) sp.style.width = Math.ceil(w + 1) + "px"; });
    var W = pin.clientWidth, H = pin.clientHeight, mob = W <= 960, dpr = Math.min(window.devicePixelRatio || 1, 3);
    var mw = Math.min(W * (mob ? .98 : .6), (H - (mob ? 280 : 250)) * FW / FH, 1000), mh = mw * FH / FW;
    mach.style.setProperty("--mw", mw + "px");
    var top0 = mob ? H * .46 - mh / 2 : H * .58 - mh / 2;
    var ib = intro.offsetTop + intro.offsetHeight + (mob ? 4 : 8), s0 = Math.max(.5, Math.min(1, (H - ib - 40) / mh));
    // flat card (outer glass incl. bezel) at the end
    var qa = qw(QZ[NZ - 1]) * FW / (qh(QZ[NZ - 1]) * FH);
    // copy + card sit together as one block, centred under the menu bar; the card never gets oversized
    var ch = copy.offsetHeight || (mob ? 130 : 150), gap = mob ? 28 : 40, navH = mob ? 76 : 90;
    var fw = Math.min(W * (mob ? .92 : .5), (H - navH - ch - gap - (mob ? 60 : 70)) * qa, 860), fh = fw / qa;
    var top = navH + Math.max(0, (H - navH - (ch + gap + fh)) / 2);
    copy.style.top = top + "px"; var fy = top + ch + gap;
    // the dive: screen width grows from its resting size to fill the window
    var x1 = W / 2 - mw / 2, q0 = QZ[0], c0 = qc(q0);
    var ax0 = x1 + c0[0] * mw, ay0 = top0 + c0[1] * mh, sw0 = qw(q0) * mw;
    var endW = fw, axE = W / 2, ayE = fy + fh / 2;   // the screen lands exactly on the card
    var steps = 160, plan = [], fi = 0, maxBox = mw;
    for (var j = 0; j <= steps; j++) {
      var t = j / steps, e = eio(t);
      var swt = sw0 * Math.pow(endW / sw0, e), ax = lerp(ax0, axE, e), ay = lerp(ay0, ayE, e);
      // choose the furthest frame whose cut edges stay outside the window
      var best = fi;
      for (var k = fi; k < NZ; k++) {
        var q = QZ[k], s = swt / (qw(q) * mw), c = qc(q), bw = mw * s, bh = mh * s, Lx = ax - c[0] * bw, Ty = ay - c[1] * bh, b = BB["z" + String(k + 1).padStart(2, "0")] || [0, 0, 1, 1], ok = true;
        if (b[0] <= .003 && Lx > -1) ok = false;
        if (b[2] >= .997 && Lx + bw < W + 1) ok = false;
        if (b[1] <= .003 && Ty > -1) ok = false;
        if (b[3] >= .997 && Ty + bh < H + 1) ok = false;
        if (ok) best = k; else break;
      }
      fi = best;
      var qq = QZ[fi], ss = swt / (qw(qq) * mw), cc = qc(qq);
      plan.push({ k: fi, s: ss, x: ax - cc[0] * mw * ss, y: ay - cc[1] * mh * ss, sw: swt, ax: ax, ay: ay });
      maxBox = Math.max(maxBox, mw * ss);
    }
    tagR = tagFor(mw * dpr * 1.05); tagZ = tagFor(Math.min(maxBox, W * 1.4) * dpr);
    L = { W: W, H: H, mob: mob, mw: mw, mh: mh, top0: top0, y0: ib, s0: s0, plan: plan, fw: fw, fh: fh, fy: fy };
    // numbers sit centred above the machine, the label to the right of each number
    statsBox.style.left = "50%"; var shh = stats[0] ? stats[0].offsetHeight : 80; statsBox.style.top = Math.max(mob ? 120 : 140, top0 + .137 * mh - shh / 2 - (mob ? 22 : 36)) + "px";
    // one line that ties the three numbers together, between the menu bar and the numbers
    if (tag) { var sTop = parseFloat(statsBox.style.top), nb = mob ? 76 : 90, th = tag.offsetHeight; tag.style.top = Math.max(nb + 12, sTop - (mob ? 58 : 94) - th) + "px"; }
    if (!cache.length) { load(0); load(NR - 1); load(NR); loadAll(); }
    shown = -1; update();
  }

  var pos = null; // {rot:true,x,y,s} or {sw,ax,ay}
  function place(n) {
    if (!pos) return; var tx, ty, sc;
    if (n < NR || pos.rot) { tx = pos.x; ty = pos.y; sc = pos.s; }
    else { var q = QZ[n - NR], c = qc(q); sc = pos.sw / (qw(q) * L.mw); tx = pos.ax - c[0] * L.mw * sc; ty = pos.ay - c[1] * L.mh * sc; }
    mach.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + sc + ")";
  }
  function show(k) {
    var n = nearest(k); if (n < 0) return; place(n); if (n === shown) return; shown = n;
    img.src = cache[n].src;
    if (refl) { refl.src = cache[n].src; }
    var zi = n - NR;
    if (zi >= 0 && QZ[zi]) {
      var P = QZ[zi].map(function (c) { return [c[0] * L.mw, c[1] * L.mh]; });
      ui.style.transform = m3d(2048, 1280, inner(QZ[zi]).map(function (c) { return [c[0] * L.mw, c[1] * L.mh]; }));
      glass.style.transform = m3d(1000, 1000, P);
      ui.style.visibility = glass.style.visibility = "visible";
    } else if (QR[n]) {
      ui.style.visibility = "hidden"; glass.style.visibility = "visible";
      glass.style.transform = m3d(1000, 1000, QR[n].map(function (c) { return [c[0] * L.mw, c[1] * L.mh]; }));
    } else ui.style.visibility = glass.style.visibility = "hidden";
    // the glare drifts across the glass as the machine turns, and settles during the dive
    glass.style.setProperty("--g", (n < NR ? 34 + 38 * n / (NR - 1) : lerp(72, 62, (n - NR) / (NZ - 1))).toFixed(1) + "%");
    // faint floor reflection under the turning machine: mirror about the lowest point of the machine
    if (refl) {
      var b = BB[names[n]];
      if (b && n < NR) { var yb = b[3]; refl.style.top = ((2 * yb - 1) * L.mh) + "px"; refl.style.setProperty("--yb", (yb * 100) + "%"); refl.style.setProperty("--yf", ((yb - .22) * 100) + "%"); }
    }
  }

  function update() {
    if (!L.W) return;
    var r = sec.getBoundingClientRect(), span = sec.offsetHeight - L.H, p = clamp(-r.top / (span || 1));
    var io = seg(p, .02, .1); intro.style.opacity = 1 - io; intro.style.transform = "translateY(" + (-40 * io) + "px)"; intro.style.pointerEvents = io > .5 ? "none" : "";
    // stats while turning
    var win = [[.12, .25], [.25, .38], [.38, .51]];
    stats.forEach(function (s, i) { var t = seg(p, win[i][0], win[i][1]), a = t < .25 ? t / .25 : t > .75 ? (1 - t) / .25 : 1; if (t <= 0 || t >= 1) a = 0; s.style.opacity = a; var y = (t < .5 ? 1 : -1) * 16 * (1 - a); s.style.transform = "translate(-50%," + (y - s.offsetHeight / 2) + "px)"; });

    if (tag) {
      var ta = Math.min(seg(p, .09, .13), 1 - seg(p, .52, .56)); tag.style.opacity = ta; tag.style.transform = "translate(-50%," + (16 * (1 - ta)) + "px)";
      tag.querySelectorAll("span").forEach(function (w, i) { var t = seg(p, win[i][0], win[i][1]); w.classList.toggle("on", t > .12 && t < .88); });
    }
    var zt = seg(p, .56, .8), k, tx, ty, sc;
    var e1 = ease(seg(p, .02, .12)), s1 = lerp(L.s0, 1, e1), y1 = lerp(L.y0, L.top0, e1), x1 = L.W / 2 - L.mw * s1 / 2;
    if (zt <= 0) {
      k = Math.round(ease(seg(p, .03, .52)) * (NR - 1)); pos = { rot: true, x: x1, y: y1, s: s1 };
    } else {
      var st = L.plan[Math.round(zt * (L.plan.length - 1))];
      k = NR + st.k; pos = { sw: st.sw, ax: st.ax, ay: st.ay };
    }
    want = k; show(k);
    if (refl) refl.style.display = "none"; // fake mirror removed; a real KeyShot reflection pass can go here
    // the screen lights up early in the dive; a soft glare slides across the glass
    ui.style.opacity = ease(seg(p, .6, .68));
    // the screen has landed on the card: swap to the crisp card and let the machine fade away
    flat.style.width = L.fw + "px"; flat.style.height = L.fh + "px"; flat.style.left = (L.W - L.fw) / 2 + "px"; flat.style.top = L.fy + "px";
    flat.style.padding = (L.fh * BY) + "px " + (L.fw * BX) + "px";
    flat.style.opacity = seg(p, .79, .81); mach.style.opacity = 1 - seg(p, .81, .86);
    var co = ease(seg(p, .86, .93)); copy.style.opacity = co; copy.style.transform = "translateY(" + (24 * (1 - co)) + "px)";
    bar.style.transform = "scaleX(" + p.toFixed(3) + ")"; foot.style.opacity = p > .78 ? 0 : 1;
  }
  var tk = false;
  addEventListener("scroll", function () { if (!tk) { tk = true; requestAnimationFrame(function () { tk = false; update(); }); } }, { passive: true });
  addEventListener("resize", layout); layout();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  function lang(l) { var s = "img/ui-treat-" + (l === "ko" ? "ko" : "en") + ".webp"; sec.querySelectorAll("img[data-ui]").forEach(function (im) { im.src = s; }); requestAnimationFrame(function () { layout(); dispatchEvent(new Event("scroll")); }); }
  (window.exoLangHooks = window.exoLangHooks || []).push(lang);
  lang(document.documentElement.lang);
})();
