/* exorenal — shared: mobile menu, language, page change */
(function () {
  /* always open a page at the top (unless a #section is asked for) */
  try { history.scrollRestoration = "manual"; } catch (e) {}
  if (!location.hash) window.scrollTo(0, 0);
  addEventListener("pageshow", function (e) { if (e.persisted && !location.hash) window.scrollTo(0, 0); document.documentElement.classList.remove("pg-leave"); });

  /* page change effect */
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, root = document.documentElement;
  if (!reduce) {
    root.classList.add("pg-enter");
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove("pg-enter"); }); });
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href]"); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
      var href = a.getAttribute("href"); if (!/\.html(#.*)?$/.test(href) || href.indexOf("#") > -1 && href.split("#")[0] === location.pathname.split("/").pop()) return;
      e.preventDefault(); root.classList.add("pg-leave");
      setTimeout(function () { location.href = href; }, 260);
    });
  }


  /* nav: liquid pill (after the saved language is applied) */
  setTimeout(function () {
    var box = document.querySelector(".nav-links"); if (!box) return;
    var links = [].slice.call(box.querySelectorAll("a")), cur = box.querySelector('a[aria-current="page"]');
    var blob = document.createElement("span"); blob.className = "blob"; blob.setAttribute("aria-hidden", "true");
    box.appendChild(blob); box.classList.add("has-blob");
    var pos = null, tm;
    function edges(a) { var b = box.getBoundingClientRect(), r = a.getBoundingClientRect(); return { l: r.left - b.left, r: b.right - r.right }; }
    function place(e, animate) {
      if (!animate) blob.style.transition = "none";
      if (pos && animate) { blob.classList.toggle("go-r", e.l > pos.l); blob.classList.toggle("go-l", e.l < pos.l);
        if (e.l !== pos.l) { blob.classList.add("squish"); clearTimeout(tm); tm = setTimeout(function () { blob.classList.remove("squish"); }, 450); } }
      blob.style.setProperty("--l", e.l + "px"); blob.style.setProperty("--r", e.r + "px"); pos = e;
      if (!animate) { blob.offsetWidth; blob.style.transition = ""; }
    }
    function moveTo(a, hover) {
      if (!a) { blob.classList.remove("on", "hover"); return; }
      var e = edges(a); if (!blob.classList.contains("on")) { place(e, false); blob.classList.add("on"); } else place(e, true);
      blob.classList.toggle("hover", !!hover && a !== cur);
    }
    // arrive: flow from the item clicked on the previous page
    var from = null; try { from = sessionStorage.getItem("navFrom"); sessionStorage.removeItem("navFrom"); } catch (e) {}
    var prev = from && links.filter(function (a) { return a.getAttribute("href") === from; })[0];
    if (cur && prev && prev !== cur && !reduce) { place(edges(prev), false); blob.classList.add("on"); requestAnimationFrame(function () { requestAnimationFrame(function () { moveTo(cur); }); }); }
    else moveTo(cur);
    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () { moveTo(a, true); });
      a.addEventListener("click", function () { try { if (cur) sessionStorage.setItem("navFrom", cur.getAttribute("href")); } catch (e) {} moveTo(a); blob.classList.remove("hover"); });
    });
    box.addEventListener("mouseleave", function () { moveTo(cur); });

    addEventListener("resize", function () { if (cur) place(edges(cur), false); });
    // language switch changes the menu widths: let the pill follow
    if (window.MutationObserver) new MutationObserver(function () { var h = box.querySelector("a:hover"); if (cur || h) place(edges(h || cur), true); }).observe(box, { childList: true, subtree: true, characterData: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (cur && !box.matches(":hover")) place(edges(cur), false); });
  }, 0);

  var bg = document.getElementById("burger"), sh = document.getElementById("sheet");
  if (bg && sh) {
    bg.addEventListener("click", function () { var o = sh.hidden; sh.hidden = !o; bg.setAttribute("aria-expanded", String(o)); });
    sh.addEventListener("click", function (e) { if (e.target.closest("a")) { sh.hidden = true; bg.setAttribute("aria-expanded", "false"); } });
  }
  var bEn = document.getElementById("lang-en"), bKo = document.getElementById("lang-ko");
  window.exoLangHooks = window.exoLangHooks || [];
  function setLang(l) {
    document.querySelectorAll("[data-ko]").forEach(function (el) { if (el.dataset.en == null) el.dataset.en = el.innerHTML; el.innerHTML = l === "ko" ? el.dataset.ko : el.dataset.en; });
    document.querySelectorAll("[data-ko-ph]").forEach(function (el) { if (el.dataset.enPh == null) el.dataset.enPh = el.placeholder; el.placeholder = l === "ko" ? el.dataset.koPh : el.dataset.enPh; });
    document.documentElement.lang = l; bEn.setAttribute("aria-pressed", String(l === "en")); bKo.setAttribute("aria-pressed", String(l === "ko"));
    try { localStorage.setItem("exo-lang", l); } catch (e) {}
    window.exoLangHooks.forEach(function (f) { f(l); });
  }
  window.exoSetLang = setLang;
  bEn.addEventListener("click", function () { setLang("en"); });
  bKo.addEventListener("click", function () { setLang("ko"); });
  document.addEventListener("DOMContentLoaded", function () {
    try { if (localStorage.getItem("exo-lang") === "ko") setLang("ko"); } catch (e) {}
  });

  /* contact form: sends through FormSubmit (no server needed).
     Test inbox for now; switch FORM_TO to info@exorenal.com when the exorenal.com domain is connected. */
  var FORM_TO = "naekyun@exorenal.com";
  document.addEventListener("submit", function (e) {
    var f = e.target; if (!f.matches("#contact-form")) return;
    e.preventDefault();
    var ko = document.documentElement.lang === "ko", n = document.getElementById("form-note"), btn = f.querySelector("button[type=submit]");
    function say(msg, ok) { n.hidden = false; n.textContent = msg; n.classList.toggle("ok", !!ok); n.classList.toggle("err", !ok); }
    var name = f.elements.name.value.trim(), mail = f.elements.email.value.trim(), msg = f.elements.message.value.trim();
    if (f.elements._honey && f.elements._honey.value) return;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || !msg) {
      say(ko ? "이름, 이메일, 문의 내용을 모두 적어 주세요." : "Please fill in your name, email and message.", false); return;
    }
    var t = f.querySelector("input[name=topic]:checked"), topic = t ? (t.dataset.en || t.id.replace("t-", "")) : "General";
    btn.disabled = true; say(ko ? "보내는 중입니다…" : "Sending…", true);
    fetch("https://formsubmit.co/ajax/" + FORM_TO, {
      method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ _subject: "[exorenal.com] " + topic + " inquiry from " + name, _template: "table",
        Topic: topic, Name: name, Organization: f.elements.org.value.trim(), email: mail, Message: msg, Page_language: ko ? "Korean" : "English" })
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!(r.ok && String(j.success) === "true")) throw new Error(j.message || ("HTTP " + r.status)); }); })
      .then(function () {
        f.reset(); say(ko ? "보내 주셔서 감사합니다. 확인하고 곧 답장드리겠습니다." : "Thank you. We'll read your message and get back to you soon.", true);
      })
      .catch(function (err) {
        var m = String(err && err.message || "");
        if (window.console) console.warn("[contact form]", m);
        if (/activat/i.test(m)) { say(ko ? "폼 활성화가 필요합니다. " + FORM_TO + " 메일함에서 FormSubmit의 'Activate Form' 메일을 열어 버튼을 눌러 주세요." : "This form needs to be activated: open the 'Activate Form' email from FormSubmit at " + FORM_TO + ".", false); return; }
        say(ko ? "전송하지 못했습니다. 잠시 뒤 다시 시도하시거나 " + FORM_TO + "로 메일을 보내 주세요." : "Something went wrong. Please try again, or email us at " + FORM_TO + ".", false);
      })
      .then(function () { btn.disabled = false; });
  });
})();


/* Statement text fills word by word as you scroll (.say) */
(function () {
  function init() {
    var says = Array.prototype.slice.call(document.querySelectorAll(".say"));
    if (!says.length) return;
    function split(el) { el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + "</span>"; }).join(" "); }
    function light() {
      var vh = innerHeight;
      says.forEach(function (el) {
        var r = el.getBoundingClientRect(); if (r.bottom < -vh || r.top > vh * 2) return;
        var ws = el.querySelectorAll(".w"), st = vh * 0.9, en = (vh - r.height) / 2 + vh * 0.1, p = Math.min(1, Math.max(0, (st - r.top) / Math.max(1, st - en))), n = Math.round(p * ws.length);
        for (var i = 0; i < ws.length; i++) ws[i].classList.toggle("lit", i < n);
      });
    }
    says.forEach(split); light();
    var t = false; addEventListener("scroll", function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; light(); }); } }, { passive: true });
    addEventListener("resize", light);
    (window.exoLangHooks = window.exoLangHooks || []).push(function () { says.forEach(split); light(); });
  }
  if (document.readyState !== "loading") init(); else document.addEventListener("DOMContentLoaded", init);
})();

/* Photo banners: reveal text when they come into view */
(function () {
  var ph = document.querySelectorAll(".photo"); if (!ph.length) return;
  if (!("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js");
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } }); }, { threshold: 0.35 });
  ph.forEach(function (p) { io.observe(p); });
})();

/* Section snap + greyed neighbours on pages with <main data-snap>; snapping starts at [data-snap-from] if set */
(function () {
  var main = document.querySelector("main[data-snap]"); if (!main) return;
  var root = document.documentElement, all = Array.prototype.slice.call(main.children).filter(function (e) { return e.tagName === "SECTION"; });
  var from = main.querySelector("[data-snap-from]"), i0 = from ? all.indexOf(from) : 1, secs = all.slice(i0), t = false;
  secs.forEach(function (s) { s.classList.add("sn"); });
  function gate() { if (from) root.classList.toggle("free", from.getBoundingClientRect().top > innerHeight * 0.55); }
  function pick() {
    t = false; gate(); var mid = (76 + innerHeight * 0.86) / 2, best = null, d = 1e9;
    secs.forEach(function (s) { var r = s.getBoundingClientRect(), c = Math.abs((r.top + r.bottom) / 2 - mid); if (c < d) { d = c; best = s; } });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) { var last = secs[secs.length - 1]; if (last && last.getBoundingClientRect().top < innerHeight) best = last; }
    secs.forEach(function (s) { s.classList.toggle("here", s === best); });
    if (best) best.classList.add("seen");
  }
  gate(); root.classList.add("js", "snap");
  addEventListener("scroll", function () { if (!t) { t = true; requestAnimationFrame(pick); } }, { passive: true });
  addEventListener("resize", pick); pick();
})();

/* News list: category filter + pager (9 per page) */
(function () {
  var list = document.querySelector("[data-pager]"); if (!list) return;
  var all = Array.prototype.slice.call(list.children), per = 9, cur = "all", items = all;
  var bar = document.querySelector(".nfilter");
  var nav = document.createElement("nav"); nav.className = "pager"; nav.setAttribute("aria-label", "News pages");
  list.parentNode.insertBefore(nav, list.nextSibling);
  // every card gets the size of the biggest one, and the list keeps the height of a full page,
  // so the cards and the page numbers stay put when switching pages, filters or language
  function lock() {
    var hid = all.map(function (it) { return it.hidden; });
    list.style.removeProperty("--card-h"); all.forEach(function (it) { it.hidden = false; });
    var h = 0; all.forEach(function (it) { h = Math.max(h, it.getBoundingClientRect().height); });
    all.forEach(function (it, i) { it.hidden = hid[i]; });
    var cs = getComputedStyle(list), cols = cs.gridTemplateColumns.split(" ").filter(Boolean).length || 1, gap = parseFloat(cs.rowGap) || 0, rows = Math.ceil(per / cols);
    list.style.setProperty("--card-h", Math.ceil(h) + "px");
    list.style.minHeight = Math.ceil(rows * h + (rows - 1) * gap) + "px";
  }
  setTimeout(lock, 0);
  addEventListener("resize", lock);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(lock);
  if (window.MutationObserver) new MutationObserver(function () { clearTimeout(lock.t); lock.t = setTimeout(lock, 30); }).observe(list, { childList: true, subtree: true, characterData: true });
  function show(n) {
    var pages = Math.ceil(items.length / per);
    all.forEach(function (it) { it.hidden = true; });
    items.forEach(function (it, i) { it.hidden = Math.floor(i / per) !== n; });
    if (pages < 2) { nav.innerHTML = ""; return; }
    var h = '<button type="button" data-p="' + (n - 1) + '" aria-label="Previous"' + (n === 0 ? " disabled" : "") + '>&lsaquo;</button>';
    for (var i = 0; i < pages; i++) h += '<button type="button" data-p="' + i + '"' + (i === n ? ' aria-current="page"' : "") + '>' + (i + 1) + '</button>';
    h += '<button type="button" data-p="' + (n + 1) + '" aria-label="Next"' + (n === pages - 1 ? " disabled" : "") + '>&rsaquo;</button>';
    nav.innerHTML = h;
  }
  function filter(c) {
    cur = c; items = c === "all" ? all : all.filter(function (it) { return (" " + it.dataset.cat + " ").indexOf(" " + c + " ") > -1; });
    if (bar) bar.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.f === c)); });
    show(0);
  }
  if (bar) {
    bar.querySelectorAll("button").forEach(function (b) {
      var f = b.dataset.f, n = f === "all" ? all.length : all.filter(function (it) { return (" " + it.dataset.cat + " ").indexOf(" " + f + " ") > -1; }).length;
      b.querySelector("small").textContent = n; if (!n) b.hidden = true;
    });
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; filter(b.dataset.f);
      try { history.replaceState(null, "", b.dataset.f === "all" ? location.pathname : "#" + b.dataset.f); } catch (err) {}
    });
  }
  nav.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b || b.disabled) return; show(+b.dataset.p); window.scrollTo({ top: 0, behavior: "smooth" }); });
  var h0 = location.hash.slice(1); filter(/^(event|press|award|video|paper)$/.test(h0) ? h0 : "all");
})();

/* Contact: preselect topic from ?topic= */
(function () {
  var m = location.search.match(/[?&]topic=([a-z]+)/); if (!m) return;
  var el = document.getElementById("t-" + m[1]); if (el) el.checked = true;
})();

/* Zoomable map: buttons, double-click, drag to pan, pinch on touch */
(function () {
  document.querySelectorAll("[data-zoom]").forEach(function (box) {
    var L = box.querySelector(".zl"), s = 1, x = 0, y = 0, MAX = 4;
    function clamp() { var w = box.clientWidth, h = box.clientHeight; x = Math.min(0, Math.max(w - w * s, x)); y = Math.min(0, Math.max(h - h * s, y)); }
    function apply(anim) { clamp(); L.style.transition = anim ? "transform .3s ease" : "none"; L.style.transform = "translate(" + x + "px," + y + "px) scale(" + s + ")"; L.style.setProperty("--zs", 1 / s); box.classList.toggle("zoomed", s > 1.01); }
    function zoomAt(ns, cx, cy, anim) { ns = Math.min(MAX, Math.max(1, ns)); x = cx - (cx - x) * ns / s; y = cy - (cy - y) * ns / s; s = ns; apply(anim); }
    function center() { return [box.clientWidth / 2, box.clientHeight / 2]; }
    box.querySelector(".zctl").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return; var c = center();
      if (b.dataset.z === "in") zoomAt(s * 1.6, c[0], c[1], true);
      else if (b.dataset.z === "out") zoomAt(s / 1.6, c[0], c[1], true);
      else { var p = box.querySelector(".asnpin"), px = p.offsetLeft, py = p.offsetTop; s = 3; x = c[0] - px * s; y = c[1] - py * s; apply(true); }
    });
    L.addEventListener("dblclick", function (e) { var r = box.getBoundingClientRect(); zoomAt(s > 1.01 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top, true); });
    var pts = {}, last = null, pinch = null;
    box.addEventListener("pointerdown", function (e) { if (e.target.closest(".zctl")) return; pts[e.pointerId] = [e.clientX, e.clientY]; box.setPointerCapture(e.pointerId); last = [e.clientX, e.clientY]; });
    box.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId]) return; pts[e.pointerId] = [e.clientX, e.clientY]; var ids = Object.keys(pts), r = box.getBoundingClientRect();
      if (ids.length === 2) { var a = pts[ids[0]], b = pts[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]), cx = (a[0] + b[0]) / 2 - r.left, cy = (a[1] + b[1]) / 2 - r.top;
        if (pinch) zoomAt(s * d / pinch, cx, cy, false); pinch = d; return; }
      if (s > 1.01 && last) { x += e.clientX - last[0]; y += e.clientY - last[1]; apply(false); } last = [e.clientX, e.clientY];
    });
    function up(e) { delete pts[e.pointerId]; pinch = null; last = null; }
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    addEventListener("resize", function () { apply(false); });
  });

  /* language toggle: liquid pill */
  setTimeout(function () {
    var box = document.querySelector(".nav .lang"); if (!box) return;
    var btns = [].slice.call(box.querySelectorAll("button"));
    var blob = document.createElement("span"); blob.className = "blob"; blob.setAttribute("aria-hidden", "true");
    box.appendChild(blob); box.classList.add("has-blob");
    var pos = null, tm;
    function edges(a) { var b = box.getBoundingClientRect(), r = a.getBoundingClientRect(); return { l: r.left - b.left, r: b.right - r.right }; }
    function sync(animate) {
      var a = box.querySelector('button[aria-pressed="true"]'); if (!a) return;
      var e = edges(a);
      if (!animate || !pos) { blob.style.transition = "none"; }
      else { blob.classList.toggle("go-r", e.l > pos.l); blob.classList.toggle("go-l", e.l < pos.l);
        if (e.l !== pos.l) { blob.classList.add("squish"); clearTimeout(tm); tm = setTimeout(function () { blob.classList.remove("squish"); }, 380); } }
      blob.style.setProperty("--l", e.l + "px"); blob.style.setProperty("--r", e.r + "px"); pos = e; blob.classList.add("on");
      if (!animate) { blob.offsetWidth; blob.style.transition = ""; }
    }
    sync(false);
    if (window.MutationObserver) new MutationObserver(function () { sync(true); }).observe(box, { attributes: true, subtree: true, attributeFilter: ["aria-pressed"] });

    addEventListener("resize", function () { sync(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sync(false); });
  }, 0);

  /* chips: dark pill flows between choices (news filter, contact topics) */
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function liquidChips(box, items, isOn) {
    if (!box) return;
    var blob = document.createElement("span"); blob.className = "lq"; blob.setAttribute("aria-hidden", "true");
    box.insertBefore(blob, box.firstChild); box.classList.add("lq-box");
    var pos = null, tm;
    function edges(a) { var b = box.getBoundingClientRect(), r = a.getBoundingClientRect(); return { l: r.left - b.left, r: b.right - r.right, t: r.top - b.top, b: b.bottom - r.bottom }; }
    function sync(animate) {
      var a = items().filter(isOn)[0]; if (!a || !a.offsetParent) { blob.classList.remove("on"); return; }
      var e = edges(a);
      if (!animate || !pos || reduce) blob.style.transition = "none";
      else { blob.classList.toggle("go-r", e.l > pos.l); blob.classList.toggle("go-l", e.l < pos.l);
        if (e.l !== pos.l || e.t !== pos.t) { blob.classList.add("squish"); clearTimeout(tm); tm = setTimeout(function () { blob.classList.remove("squish"); }, 380); } }
      ["l", "r", "t", "b"].forEach(function (k) { blob.style.setProperty("--" + k, e[k] + "px"); }); pos = e; blob.classList.add("on");
      if (!animate || reduce) { blob.offsetWidth; blob.style.transition = ""; }
    }
    sync(false);
    if (window.MutationObserver) new MutationObserver(function () { sync(true); }).observe(box, { attributes: true, subtree: true, attributeFilter: ["aria-pressed", "hidden"], childList: true, characterData: true });
    box.addEventListener("change", function () { sync(true); });

    addEventListener("resize", function () { sync(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { sync(false); });
  }
  setTimeout(function () {
    var nf = document.querySelector(".nfilter");
    liquidChips(nf, function () { return [].slice.call(nf ? nf.querySelectorAll("button") : []); }, function (b) { return b.getAttribute("aria-pressed") === "true"; });
    var ch = document.querySelector(".chips");
    liquidChips(ch, function () { return [].slice.call(ch ? ch.querySelectorAll("label > span") : []); }, function (s) { var i = s.previousElementSibling; return !!(i && i.checked); });
  }, 0);


  /* papers: show all / show less */
  document.querySelectorAll(".papers-more").forEach(function (b) {
    b.addEventListener("click", function () { var box = b.closest(".papers"), open = !box.classList.contains("open"); box.classList.toggle("open", open); b.setAttribute("aria-expanded", String(open)); });
  });
})();
