/* Under One Roof — "The Paper Atelier" behaviours: motion mode (full / calm), torn edges,
   placing things onto the page as they arrive, doodles drawing in, film-strip dragging,
   ingredient pills, sticky-note toasts, parallax and the scroll-drawn thread.
   One requestAnimationFrame loop; only transform and opacity are animated. */
window.UOR = window.UOR || {};
(function () {
  var root = document.documentElement;

  // ---- motion: follow the device unless the visitor chose otherwise in the footer
  var KEY = 'uor-motion', mq = matchMedia('(prefers-reduced-motion: reduce)');
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function mode() { var s = stored(); return s === 'full' || s === 'calm' ? s : (mq.matches ? 'calm' : 'full'); }
  function apply() { root.dataset.motion = mode(); document.dispatchEvent(new CustomEvent('uor:motion')); }
  apply();
  mq.addEventListener('change', apply);
  UOR.calm = function () { return root.dataset.motion === 'calm'; };
  UOR.setMotion = function (m) { try { localStorage.setItem(KEY, m); } catch (e) { /* storage blocked */ } apply(); };

  // ---- the rubber-stamp ink texture (.rubber uses filter:url(#ink)); a missing filter would hide them
  if (!document.getElementById('ink')) {
    document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">' +
      '<filter id="ink"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4"/></filter></svg>');
  }

  // ---- seeded randomness, so torn edges and tilts look the same on every visit
  function seeded(s) {
    var h = 2166136261;
    for (var c = 0; c < s.length; c++) { h ^= s.charCodeAt(c); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  UOR.seeded = seeded;

  // ---- torn paper: a ragged clip-path along every edge, sized to the element
  function tear(el, i) {
    var w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return;
    var r = seeded((el.textContent || '') + i), pts = [], x, y, deep = el.dataset.tear === 'deep' ? 2.2 : 1;
    for (x = 0; x < w; x += 5 + r() * 7) pts.push([x, r() * 2.4 * deep]);
    pts.push([w, r() * 2]);
    for (y = 0; y < h; y += 4 + r() * 5) pts.push([w - r() * 3.4 * deep, y]);
    for (x = w; x > 0; x -= 5 + r() * 7) pts.push([x, h - r() * 2.4 * deep]);
    pts.push([0, h - r() * 2]);
    for (y = h; y > 0; y -= 4 + r() * 5) pts.push([r() * 3.4 * deep, y]);
    el.style.clipPath = 'polygon(' + pts.map(function (p) { return p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px'; }).join(',') + ')';
  }
  UOR.tearAll = function (scope) {
    (scope || document).querySelectorAll('.strip, [data-tear]').forEach(function (el, i) {
      if (!el.style.getPropertyValue('--r') && !el.hasAttribute('data-flat')) {
        var r = seeded(el.textContent + 'r' + i);
        el.style.setProperty('--r', ((r() - .5) * 4).toFixed(2) + 'deg'); // −2° … 2°
      }
      tear(el, i);
    });
  };
  var tearT;
  window.addEventListener('resize', function () { clearTimeout(tearT); tearT = setTimeout(function () { UOR.tearAll(); }, 200); });
  if (document.fonts) document.fonts.ready.then(function () { UOR.tearAll(); }); // text width changes when fonts arrive

  // ---- botanical sprigs (line-drawn mango leaves, a marigold): UOR.sprig('mango' | 'marigold')
  function leaf(x, y, a, s) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + a + ') scale(' + s + ')"><path d="M0 0 C 14 -11, 42 -13, 66 0 C 42 13, 14 11, 0 0 Z" fill="rgba(94,107,58,.1)" stroke="currentColor" stroke-width="1.3"/><path d="M2 0 L 60 0" stroke="currentColor" stroke-width=".8" fill="none"/></g>';
  }
  var SPRIGS = {
    mango: ['0 0 220 300', '<path d="M110 296 C 104 230, 124 160, 104 18" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      leaf(108, 250, -150, 1.05) + leaf(110, 210, -30, 1) + leaf(112, 168, -152, .95) + leaf(114, 128, -28, .9) + leaf(110, 88, -148, .85) + leaf(106, 52, -40, .75) + leaf(104, 20, -95, .7)],
    marigold: ['0 0 160 300', (function () {
      var g = '<path d="M80 300 C 82 250, 76 200, 80 150" fill="none" stroke="currentColor" stroke-width="1.4"/>' + leaf(80, 240, -150, .8) + leaf(80, 210, -30, .7), k;
      for (k = 0; k < 16; k++) g += '<ellipse cx="80" cy="96" rx="9" ry="22" transform="rotate(' + (k * 22.5) + ' 80 118)" fill="rgba(176,141,87,.18)" stroke="#B08D57" stroke-width="1.1"/>';
      for (k = 0; k < 12; k++) g += '<ellipse cx="80" cy="106" rx="6" ry="13" transform="rotate(' + (k * 30 + 15) + ' 80 118)" fill="rgba(163,52,31,.12)" stroke="#A3341F" stroke-width=".9"/>';
      return g + '<circle cx="80" cy="118" r="7" fill="#B08D57" opacity=".7"/>';
    })()]
  };
  UOR.sprig = function (kind, cls) {
    var s = SPRIGS[kind] || SPRIGS.mango;
    return '<svg class="sprig ' + (cls || '') + '" viewBox="' + s[0] + '" aria-hidden="true" focusable="false">' + s[1] + '</svg>';
  };

  // ---- a product as a taped clipping (heart, stock stamp, name linking to href)
  var TAPES = ['tc', 'tl t-gold', 'tr t-moss', 'tc t-plain', 'tl'];
  UOR.clip = function (p, href, i) {
    var t = UOR.t, stock = p.stock && p.stock !== 'in_stock' ? p.stock : '';
    var badge = stock ? '<span class="rubber sm' + (stock === 'sold_out' ? '' : ' ink') + '" aria-hidden="true">' + t(stock === 'sold_out' ? 'stock.sold' : 'stock.mto') + '</span>' : '';
    return '<article class="clip place" id="p-' + p.id + '" style="--r:' + ((((i * 37) % 9) - 4) * .5).toFixed(1) + 'deg">' +
      '<span class="tape ' + TAPES[i % 5] + '"></span>' + badge +
      '<span class="clip-win" style="--bg:' + p.bg + ';--pad:' + [8, 22, 36][(i * 7) % 3] + '%">' + UOR.art(p) + '</span>' +
      '<span class="clip-row"><span class="at-label">' + t('card.no') + ' ' + String(i + 1).padStart(2, '0') + '</span>' + UOR.heartBtn(p) + '</span>' +
      '<h3 class="clip-name"><a href="' + href + '">' + UOR.esc(p.name) + '</a></h3>' +
      '<p class="clip-mini">' + UOR.esc(p.mini) + '</p>' +
      (stock ? '<span class="sr-only">' + t(stock === 'sold_out' ? 'stock.sold' : 'stock.mto') + '</span>' : '') + '</article>';
  };

  // ---- placing: .place elements drop onto the page as they scroll in (staggered per group)
  var placeIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; });
    batch.forEach(function (e, k) {
      if (!e.target.style.getPropertyValue('--d')) e.target.style.setProperty('--d', (k * 75) + 'ms');
      e.target.classList.add('placed');
      placeIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 }) : null;
  var drawIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); drawIO.unobserve(e.target); } });
  }, { threshold: .4 }) : null;
  UOR.observe = function (scope) {
    scope = scope || document;
    scope.querySelectorAll('.doodle path').forEach(function (p) { p.setAttribute('pathLength', '1'); });
    scope.querySelectorAll('.place:not(.placed)').forEach(function (el) { placeIO ? placeIO.observe(el) : el.classList.add('placed'); });
    scope.querySelectorAll('.doodle:not(.drawn)').forEach(function (el) { drawIO ? drawIO.observe(el) : el.classList.add('drawn'); });
  };

  // ---- film strips: drag with a mouse (touch scrolls natively), snap when let go
  document.addEventListener('pointerdown', function (e) {
    var track = e.target.closest('.film-track');
    if (!track || e.pointerType !== 'mouse' || e.button !== 0) return;
    var x0 = e.clientX, s0 = track.scrollLeft, moved = false;
    function move(ev) {
      if (Math.abs(ev.clientX - x0) > 4) { moved = true; track.classList.add('dragging'); }
      track.scrollLeft = s0 - (ev.clientX - x0);
    }
    function up() {
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up);
      track.classList.remove('dragging');
      if (moved) track.addEventListener('click', function stop(ev) { ev.preventDefault(); ev.stopPropagation(); track.removeEventListener('click', stop, true); }, true);
    }
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up);
  });

  // ---- ingredient pills: one open at a time per list
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.pill-btn'); if (!b) return;
    var pill = b.closest('.pill'), open = !pill.classList.contains('open');
    pill.parentElement.querySelectorAll('.pill.open').forEach(function (p) { p.classList.remove('open'); p.querySelector('.pill-btn').setAttribute('aria-expanded', 'false'); });
    pill.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
  });

  // ---- same-page view transition with a safety net: if the browser can't run it (or stalls),
  // the change still happens within 300ms, just without the morph
  UOR.viewSwap = function (fn) {
    var ran = false;
    function go() { if (!ran) { ran = true; fn(); } }
    if (!document.startViewTransition || UOR.calm()) { go(); return; }
    try {
      var t = document.startViewTransition(go), quiet = function () {};
      // a skipped transition is fine (the change still happened); keep it out of the console
      [t.ready, t.finished, t.updateCallbackDone].forEach(function (p) { if (p) p.catch(quiet); });
    } catch (e) { go(); return; }
    setTimeout(go, 300);
  };

  // ---- sticky-note toast
  var noteEl, noteT;
  UOR.note = function (msg) {
    if (!noteEl) { noteEl = document.createElement('div'); noteEl.className = 'note-toast'; noteEl.setAttribute('role', 'status'); document.body.appendChild(noteEl); }
    noteEl.textContent = msg; noteEl.classList.remove('show'); void noteEl.offsetWidth; noteEl.classList.add('show');
    clearTimeout(noteT); noteT = setTimeout(function () { noteEl.classList.remove('show'); }, 2600);
  };

  // ---- one rAF loop: cursor parallax ([data-depth] inside [data-parallax]) and scroll threads
  var mx = 0, my = 0, tx = 0, ty = 0, dirty = true, scenes = [], threads = [];
  UOR.parallax = function (scene) { scenes.push({ el: scene, layers: [].slice.call(scene.querySelectorAll('[data-depth]')), x: 0, y: 0 }); };
  // a thread drawn with stroke-dashoffset as its section scrolls through the viewport
  UOR.scrollThread = function (path, box) { var L = path.getTotalLength(); path.style.strokeDasharray = L + ' ' + L; threads.push({ p: path, box: box, L: L, shown: -1 }); dirty = true; };
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; dirty = true;
  }, { passive: true });
  window.addEventListener('scroll', function () { dirty = true; }, { passive: true });
  function frame() {
    var calm = UOR.calm();
    tx += ((calm ? 0 : mx) - tx) * .08; ty += ((calm ? 0 : my) - ty) * .08;
    var moving = Math.abs(tx - (calm ? 0 : mx)) > .001 || Math.abs(ty - (calm ? 0 : my)) > .001;
    if (dirty || moving) {
      scenes.forEach(function (s) {
        s.layers.forEach(function (l) {
          var d = +l.dataset.depth; // max ±12px at depth 1
          l.style.transform = 'translate3d(' + (tx * 24 * d).toFixed(2) + 'px,' + (ty * 24 * d).toFixed(2) + 'px,0)';
        });
      });
      threads.forEach(function (t) {
        var r = t.box.getBoundingClientRect(), vh = innerHeight;
        var p = calm ? 1 : Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .2)));
        if (Math.abs(p - t.shown) > .0005) { t.p.style.strokeDashoffset = (t.L * (1 - p)).toFixed(1); t.shown = p; }
      });
      dirty = false;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.addEventListener('uor:motion', function () { dirty = true; });
})();
