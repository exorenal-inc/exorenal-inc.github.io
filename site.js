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
      setTimeout(function () { location.href = href; }, 200);
    });
  }

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
})();
