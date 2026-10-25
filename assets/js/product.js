/* Under One Roof — product detail: jello-spring object, sliding info panel, reviews. */
(function () {
  var reduced = UOR.reduced();
  var p = UOR.byId(UOR.query('id')) || UOR.products[0];
  var cat = UOR.cat(p.cat);
  UOR.chrome(p.cat === 'torans' || p.cat === 'garlands' ? p.cat : (p.cat === 'oxidised' || p.cat === 'gold-silver') ? 'jewelry' : 'shop');

  var $ = function (s) { return document.querySelector(s); };
  document.title = p.name + ' — Under One Roof';
  $('.crumbs').innerHTML = '<a href="index.html#shelf">Shelf</a> / <a href="category.html?c=' + cat.slug + '">' + cat.title + ' ' + cat.accent + '</a> / <span aria-current="page">' + UOR.esc(p.name) + '</span>';
  $('.pd-cat').textContent = 'Entry No. ' + cat.no + ' — ' + cat.title + ' ' + cat.accent;
  $('.pd-name').textContent = p.name;
  $('.pd-mini').textContent = p.mini;
  $('.pd-desc').textContent = p.desc;
  $('.pd-care').textContent = UOR.care[p.cat];
  $('.pd-price').textContent = UOR.price(p.price);
  $('.pd-actions').insertAdjacentHTML('beforeend', UOR.heartBtn(p));

  // ---- colour options
  var jelly = $('.jelly'), current = p.colors[0];
  function paint() {
    jelly.innerHTML = UOR.art(p, current);
    $('.swatch-name').textContent = UOR.palettes[current].name;
    document.querySelectorAll('.swatch').forEach(function (s) { s.setAttribute('aria-checked', s.dataset.k === current); s.tabIndex = s.dataset.k === current ? 0 : -1; });
  }
  $('.swatches').innerHTML = p.colors.map(function (k) {
    return '<button class="swatch" type="button" role="radio" data-k="' + k + '" aria-label="' + UOR.palettes[k].name + '" style="background:' + UOR.swatch(k) + '"></button>';
  }).join('');
  $('.swatches').addEventListener('click', function (e) {
    var b = e.target.closest('.swatch'); if (!b) return;
    current = b.dataset.k; paint(); nudge(1);
  });
  $('.swatches').addEventListener('keydown', function (e) {
    var i = p.colors.indexOf(current), d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    current = p.colors[(i + d + p.colors.length) % p.colors.length]; paint();
    $('.swatch[data-k="' + current + '"]').focus();
  });
  paint();

  // ---- jello spring on the object
  var S = { r: 0, vr: 0, k: 0, vk: 0, s: 0, vs: 0 }, running = false, last = null;
  function step() {
    S.vr = (S.vr - S.r * .09) * .9; S.r += S.vr;
    S.vk = (S.vk - S.k * .12) * .86; S.k += S.vk;
    S.vs = (S.vs - S.s * .14) * .84; S.s += S.vs;
    jelly.style.transform = 'rotate(' + S.r.toFixed(2) + 'deg) skewX(' + S.k.toFixed(2) + 'deg) scale(' + (1 - S.s * .5).toFixed(4) + ',' + (1 + S.s).toFixed(4) + ')';
    var e = Math.abs(S.r) + Math.abs(S.vr) + Math.abs(S.k) + Math.abs(S.vk) + Math.abs(S.s) * 50 + Math.abs(S.vs) * 50;
    if (e > .01) requestAnimationFrame(step); else { running = false; jelly.style.transform = ''; }
  }
  function go() { if (!running && !reduced) { running = true; requestAnimationFrame(step); } }
  function nudge(mult) {
    var dir = Math.random() > .5 ? 1 : -1;
    S.vr += dir * 2.6 * mult; S.vk -= dir * 2 * mult; S.vs -= .025 * mult; go();
  }
  var stage = $('.pd-stage');
  stage.addEventListener('pointermove', function (e) {
    var now = performance.now();
    if (last && now - last.t < 80) {
      var dt = Math.max(8, now - last.t), vx = (e.clientX - last.x) / dt, vy = (e.clientY - last.y) / dt;
      S.vr += clamp(vx * 1.1, -2.2, 2.2);
      S.vk += clamp(-vx * .8, -1.6, 1.6);
      S.vs += clamp(Math.abs(vy) * .004, 0, .012) * -1;
      go();
    }
    last = { x: e.clientX, y: e.clientY, t: now };
  });
  stage.addEventListener('pointerleave', function () { last = null; });
  stage.addEventListener('click', function () { nudge(1.4); });
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---- sliding info panel
  var panels = $('.panels'), tabs = [].slice.call(document.querySelectorAll('.tab'));
  var prev = $('.panel-nav .prev'), next = $('.panel-nav .next');
  function goPanel(i) { panels.scrollTo({ left: i * panels.clientWidth, behavior: reduced ? 'auto' : 'smooth' }); }
  function active() { return Math.round(panels.scrollLeft / Math.max(1, panels.clientWidth)); }
  function syncTabs() {
    var a = active();
    tabs.forEach(function (t, i) { t.setAttribute('aria-selected', i === a); t.tabIndex = i === a ? 0 : -1; });
    prev.disabled = a === 0; next.disabled = a === tabs.length - 1;
  }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { goPanel(i); }); });
  $('.tabs').addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    var i = clamp(active() + d, 0, tabs.length - 1); goPanel(i); tabs[i].focus();
  });
  prev.addEventListener('click', function () { goPanel(active() - 1); });
  next.addEventListener('click', function () { goPanel(active() + 1); });
  var pt; panels.addEventListener('scroll', function () { cancelAnimationFrame(pt); pt = requestAnimationFrame(syncTabs); }, { passive: true });
  syncTabs();

  $('.add-bag').addEventListener('click', function () {
    UOR.wish.add(p.id);
    UOR.toast('Checkout opens soon — saved to your wishlist for now');
  });

  // ---- reviews (static sample set until real reviews exist)
  var n = UOR.products.indexOf(p), pool = UOR.reviewPool, revs = [0, 1, 2].map(function (k) { return pool[(n * 2 + k * 3) % pool.length]; });
  var avg = revs.reduce(function (a, r) { return a + r.rating; }, 0) / revs.length;
  function stars(v) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= Math.round(v) ? '★' : '☆'; return s; }
  $('.rev-summary').innerHTML = '<span class="stars" aria-hidden="true">' + stars(avg) + '</span> <span class="label">' + avg.toFixed(1) + ' / 5 · ' + revs.length + ' notes</span>';
  $('.review-list').innerHTML = revs.map(function (r) {
    return '<li class="review"><span class="stars" role="img" aria-label="' + r.rating + ' out of 5">' + stars(r.rating) + '</span><p>' + UOR.esc(r.text) + '</p><span class="label">— ' + UOR.esc(r.name) + '</span></li>';
  }).join('');

  // ---- related
  $('.rel-title').innerHTML = 'More <em>' + cat.accent.toLowerCase() + '</em>';
  $('.rel-grid').innerHTML = UOR.inCat(p.cat).filter(function (q) { return q !== p; }).slice(0, 4).map(function (q) {
    return '<li>' + UOR.card(q, UOR.productHref(q)) + '</li>';
  }).join('');

  var queued = false;
  window.addEventListener('scroll', function () {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; UOR.headSolid(scrollY > 10); });
  }, { passive: true });
  UOR.headSolid(scrollY > 10);
})();
