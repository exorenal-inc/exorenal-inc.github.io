/* product page: drag-to-turn viewer, still at the isometric frame */
(function () {
  document.querySelectorAll(".spin[data-frames]").forEach(function (el) {
    var base = el.dataset.src, img = el.querySelector("img"), list = el.dataset.list ? el.dataset.list.split(",") : null;
    var n = list ? list.length : +el.dataset.frames;
    var hint = el.parentNode.querySelector(".hint"), frames = null, cur = +(el.dataset.start || 0);
    function src(i) { return list ? base.replace("{n}", list[i]) : base.replace("{n}", String(i + 1).padStart(2, "0")); }
    function load() { if (frames) return; frames = []; for (var i = 0; i < n; i++) { var im = new Image(); im.decoding = "async"; im.src = src(i); frames.push(im); } }
    function show(i) { load(); cur = ((i % n) + n) % n; img.src = frames[cur].src; }
    function used() { if (hint) hint.classList.add("gone"); }
    el.addEventListener("pointerenter", load, { once: true }); el.addEventListener("focus", load, { once: true });
    var down = false, x0 = 0, f0 = 0, step = 10;
    el.addEventListener("pointerdown", function (e) { load(); down = true; x0 = e.clientX; f0 = cur; step = Math.max(6, el.clientWidth / n / 1.1); el.setPointerCapture(e.pointerId); el.classList.add("dragging"); });
    el.addEventListener("pointermove", function (e) { if (!down) return; var f = f0 - Math.round((e.clientX - x0) / step); if (f !== f0) used(); show(f); });
    function up() { down = false; el.classList.remove("dragging"); }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") { used(); show(cur + 1); e.preventDefault(); } if (e.key === "ArrowRight") { used(); show(cur - 1); e.preventDefault(); } });
  });
})();
