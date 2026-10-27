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
    try { document.startViewTransition(go); } catch (e) { go(); return; }
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
