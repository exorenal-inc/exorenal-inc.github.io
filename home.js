/* home: scroll-turned machine, statement fill, places gallery */
(function () {
  var N = 36, show = document.getElementById("show"), img = document.getElementById("frame"), bar = document.getElementById("bar"), deg = document.getElementById("deg");
  var cos = Array.prototype.slice.call(document.querySelectorAll(".co"));
  var frames = [], cur = 0, ticking = false;
  for (var i = 0; i < N; i++) { var im = new Image(); im.decoding = "async"; im.src = "img/spin/xk-" + String(i + 1).padStart(2, "0") + ".webp"; frames.push(im); }
  function update() {
    ticking = false;
    var r = show.getBoundingClientRect(), span = show.offsetHeight - innerHeight;
    var p = Math.min(1, Math.max(0, -r.top / (span || 1)));
    var f = Math.min(N - 1, Math.round(p * (N - 1)));
    if (f !== cur) { cur = f; img.src = frames[f].src; }
    bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
    deg.textContent = Math.round(p * 360) + "°";
    var active = 0; cos.forEach(function (c, k) { if (p >= +c.dataset.at) active = k; });
    cos.forEach(function (c, k) { c.classList.toggle("on", k === active); });
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update); update();

  var gal = document.getElementById("gal"), gp = document.getElementById("g-prev"), gn = document.getElementById("g-next");
  if (gal) {
    function stepW() { var s = gal.querySelector(".slide"); return s ? s.getBoundingClientRect().width + 20 : 400; }
    function edge() { gp.disabled = gal.scrollLeft < 8; gn.disabled = gal.scrollLeft + gal.clientWidth > gal.scrollWidth - 8; }
    gp.addEventListener("click", function () { gal.scrollBy({ left: -stepW(), behavior: "smooth" }); });
    gn.addEventListener("click", function () { gal.scrollBy({ left: stepW(), behavior: "smooth" }); });
    gal.addEventListener("scroll", edge, { passive: true }); edge();
  }
})();
