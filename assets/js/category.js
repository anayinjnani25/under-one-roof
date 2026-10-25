/* Under One Roof — category page: the needle swirls down a stitched milestone path. */
UOR.ready.then(function () {
  var reduced = UOR.reduced();
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var cat = UOR.cat(UOR.query('c')) || UOR.categories[0];
  var items = UOR.inCat(cat.slug);
  UOR.chrome('products');
  UOR.waContext = 'Hi Under One Roof! I have a question about your ' + UOR.en(cat, 'title') + ' ' + UOR.en(cat, 'accent') + '.';

  document.title = cat.title + ' ' + cat.accent + ' — Under One Roof';
  document.querySelector('.cat-no').textContent = UOR.t('cat.entry', { no: cat.no, n: items.length });
  document.querySelector('.cat-title').innerHTML = cat.title + ' <em>' + cat.accent + '</em>';
  document.querySelector('.cat-blurb').textContent = cat.blurb;
  document.querySelector('.cat-tabs').innerHTML = UOR.categories.map(function (c) {
    return '<a class="chip" href="category.html?c=' + c.slug + '"' + (c === cat ? ' aria-current="page" aria-pressed="true"' : ' aria-pressed="false"') + '>' + c.title + ' ' + c.accent + '</a>';
  }).join('');

  var swirl = document.querySelector('.swirl');
  var svg = document.querySelector('.swirl-svg');
  swirl.insertAdjacentHTML('beforeend', items.map(function (p, i) {
    return '<span class="swirl-stamp" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<div class="swirl-node" style="--tilt:' + (i % 2 ? .8 : -.8) + 'deg">' + UOR.card(p, UOR.productHref(p), i + 1) + '</div>';
  }).join(''));
  var nodes = [].slice.call(swirl.querySelectorAll('.swirl-node'));
  var stamps = [].slice.call(swirl.querySelectorAll('.swirl-stamp'));

  var pts = [], cum = [], maxY = [], nodeIdx = [], total = 0, revealShown = 0, revealTarget = 0, running = false;
  var needleG, maskPath;

  // small seeded random numbers, so a shelf's thread takes the same route on every visit
  function seeded(s) {
    var h = 2166136261;
    for (var c = 0; c < s.length; c++) { h ^= s.charCodeAt(c); h = Math.imul(h, 16777619); }
    return function () { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }

  // A sweep from A to B that uses the whole page: it swings out towards one edge, crosses
  // to the other, then settles into B, with a stitched knot halfway. A shelf alternates
  // which edge it visits first, so the thread weaves back and forth across the screen.
  function sweep(A, B, rnd, Wc, H) {
    var dir = B[0] >= A[0] ? 1 : -1, dy = Math.max(B[1] - A[1], 220);
    var L = 18, R = Wc - 18, behind = dir > 0 ? L : R, ahead = dir > 0 ? R : L;
    var first = rnd() < .5 ? behind : ahead, second = first === behind ? ahead : behind;
    var y1 = A[1] + dy * (.28 + rnd() * .1), y2 = Math.min(A[1] + dy * (.68 + rnd() * .12), H - 30);
    var P = [A, [A[0] + (first - A[0]) * (.82 + rnd() * .12), y1], [B[0] + (second - B[0]) * (.82 + rnd() * .12), y2], B];
    // Catmull-Rom through the waypoints, with a knot halfway along the long crossing
    var poly = [], ext = [P[0]].concat(P, [P[P.length - 1]]);
    for (var s = 1; s < ext.length - 2; s++) {
      var p0 = ext[s - 1], p1 = ext[s], p2 = ext[s + 1], p3 = ext[s + 2];
      for (var k = (s === 1 ? 0 : 1); k <= 40; k++) {
        var t = k / 40, t2 = t * t, t3 = t2 * t;
        var pt = [0, 1].map(function (c) {
          return .5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
        });
        poly.push(pt);
        if (s === 2 && k === 20) poly.push({ knot: pt });
      }
    }
    follow(poly);
  }

  // walk the points ~4px apart; a knot becomes a small stitched loop
  function follow(poly) {
    var cur = pts.length ? pts[pts.length - 1] : null;
    function lineTo(P) {
      if (!cur) { pts.push(P); cur = P; return; }
      var L = Math.hypot(P[0] - cur[0], P[1] - cur[1]), n = Math.max(1, Math.ceil(L / 4));
      for (var k = 1; k <= n; k++) pts.push([cur[0] + (P[0] - cur[0]) * k / n, cur[1] + (P[1] - cur[1]) * k / n]);
      cur = P;
    }
    poly.forEach(function (e) {
      if (!e.knot) { lineTo(e); return; }
      lineTo(e.knot);
      var q = pts[Math.max(0, pts.length - 3)], ux = cur[0] - q[0], uy = cur[1] - q[1], ul = Math.hypot(ux, uy) || 1, R = 11;
      ux /= ul; uy /= ul;
      for (var s = 1; s <= 28; s++) {
        var th = s / 28 * Math.PI * 2;
        pts.push([cur[0] + R * Math.sin(th) * ux - R * (1 - Math.cos(th)) * uy, cur[1] + R * Math.sin(th) * uy + R * (1 - Math.cos(th)) * ux]);
      }
      cur = pts[pts.length - 1];
    });
  }

  // Phones: the thread runs down a left-hand spine with the cards to its right.
  // Wider screens: the thread swings across the whole page; cards sit left, middle-right,
  // right, middle-left (repeating) with their stamp on the side facing the middle.
  var ACROSS = [0, .64, 1, .36];
  function build() {
    var Wc = swirl.clientWidth, mobile = Wc < 640;
    var spine = mobile ? 26 : Wc / 2;
    var cw = mobile ? Wc - 64 : clamp(Wc * .2, 240, 330);
    nodes.forEach(function (n) { n.style.width = cw + 'px'; });
    // tallest card (long names wrap, more so in Telugu and Hindi)
    var ch = nodes.reduce(function (h, n) { return Math.max(h, n.querySelector('.pcard').offsetHeight); }, 0);
    var lift = cw * .34; // pop-out art rises this far above each card
    var top0 = 140 + lift + ch / 2;
    var centers = [], marks = [];
    if (mobile) {
      items.forEach(function (p, i) {
        var y = top0 + i * (ch + lift + 34);
        centers.push([spine + 38 + cw / 2, y]);
        marks.push([spine + (i % 2 ? 6 : -6), y]);
      });
    } else {
      var art = cw * .62;                // the pop-out art is 24% wider than the card
      var off = art + 30;                // stamp sits just past the art, on the side facing the middle
      var m = art + 6, span = Wc - 2 * m;
      var reach = 2 * (off + 24) + 16;   // closer than this side by side, two cards (plus stamps) would collide
      var stack = ch + lift + 34;       // so the lower one has to clear the upper one completely
      var step = ch * .42 + lift * .4 + 26; // otherwise each piece still sits a little below the last
      items.forEach(function (p, i) {
        var x = m + ACROSS[i % 4] * span, y = i ? centers[i - 1][1] + step : top0;
        centers.forEach(function (c) { if (Math.abs(c[0] - x) < reach) y = Math.max(y, c[1] + stack); });
        var dir = x < Wc / 2 ? 1 : -1;
        centers.push([x, y]);
        marks.push([x + dir * off, y + ch * .18]);
      });
    }
    nodes.forEach(function (n, i) { n.style.left = centers[i][0] + 'px'; n.style.top = centers[i][1] + 'px'; });
    stamps.forEach(function (s, i) { s.style.left = marks[i][0] + 'px'; s.style.top = marks[i][1] + 'px'; });
    var H = centers[centers.length - 1][1] + ch / 2 + 90;
    swirl.style.height = H + 'px';

    // sample the path between milestones (phones: S-curves with a loop; wide: edge-to-edge sweeps)
    pts = []; nodeIdx = [];
    var start = [spine, 40], loopR = mobile ? 15 : 30;
    centers = marks;
    function segment(A, B, loop, n) {
      for (var k = (pts.length ? 1 : 0); k <= n; k++) {
        var t = k / n, x = A[0] + (B[0] - A[0]) * easeInOut(t), y = A[1] + (B[1] - A[1]) * t;
        if (loop) {
          var lp = clamp((t - .36) / .28, 0, 1);
          if (lp > 0 && lp < 1) {
            var th = lp * Math.PI * 2, ux = B[0] - A[0], uy = B[1] - A[1], ul = Math.hypot(ux, uy);
            ux /= ul; uy /= ul;
            var nx = uy, ny = -ux, side = B[0] > A[0] ? 1 : -1;
            x += loopR * Math.sin(th) * ux + loopR * (1 - Math.cos(th)) * nx * side;
            y += loopR * Math.sin(th) * uy + loopR * (1 - Math.cos(th)) * ny * side;
          }
        }
        pts.push([x, y]);
      }
    }
    if (mobile) {
      segment(start, centers[0], false, 60);
      nodeIdx.push(pts.length - 1);
      for (var i = 1; i < centers.length; i++) { segment(centers[i - 1], centers[i], true, 160); nodeIdx.push(pts.length - 1); }
      segment(centers[centers.length - 1], [spine, H - 20], false, 60);
    } else {
      // wide screens: big sweeps edge to edge between milestones (same shelf, same route every visit)
      var rnd = seeded(cat.slug);
      sweep(start, centers[0], rnd, Wc, H);
      nodeIdx.push(pts.length - 1);
      for (var q = 1; q < centers.length; q++) { sweep(centers[q - 1], centers[q], rnd, Wc, H); nodeIdx.push(pts.length - 1); }
      sweep(centers[centers.length - 1], [spine, H - 20], rnd, Wc, H);
    }

    cum = [0]; maxY = [pts[0][1]];
    for (var j = 1; j < pts.length; j++) {
      cum[j] = cum[j - 1] + Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]);
      maxY[j] = Math.max(maxY[j - 1], pts[j][1]);
    }
    total = cum[cum.length - 1];

    var d = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    svg.setAttribute('viewBox', '0 0 ' + Wc + ' ' + H);
    svg.innerHTML =
      '<defs><mask id="reveal" maskUnits="userSpaceOnUse" x="-60" y="-60" width="' + (Wc + 120) + '" height="' + (H + 120) + '">' +
      '<path id="reveal-path" d="' + d + '" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/></mask></defs>' +
      // ghost guide so the route reads before it is stitched
      '<path d="' + d + '" fill="none" stroke="#C9B18C" stroke-width="1.4" stroke-dasharray="2 7" stroke-linecap="round" opacity=".9"/>' +
      '<g mask="url(#reveal)"><path d="' + d + '" fill="none" stroke="#A3341F" stroke-width="3.2" stroke-dasharray="13 8" stroke-linecap="round"/></g>' +
      spool(start[0], start[1]) +
      '<g class="needle"><g transform="rotate(0)">' +
      '<path d="M-6,-3 L38,-2.2 Q50,-.6 56,0 Q50,.6 38,2.2 L-6,3 A3 3 0 0 1 -6,-3 Z M-1.5,0 a3.2 1.3 0 1 0 6.4 0 a3.2 1.3 0 1 0 -6.4 0 Z" fill="#B9B4AA" fill-rule="evenodd" stroke="#5f5a52" stroke-width=".7"/>' +
      '<path d="M4,-1.6 L36,-1.3" stroke="#fff" stroke-width=".8" opacity=".8"/></g></g>';
    maskPath = svg.querySelector('#reveal-path');
    maskPath.style.strokeDasharray = total + ' ' + (total + 10);
    needleG = svg.querySelector('.needle');
    if (reduced) { revealShown = revealTarget = total; needleG.style.display = 'none'; }
    draw();
  }

  function spool(x, y) {
    return '<g transform="translate(' + (x - 22) + ',' + (y - 40) + ')">' +
      '<rect x="-6" y="44" width="56" height="6" rx="3" fill="#C9B18C"/>' +
      '<ellipse cx="22" cy="40" rx="18" ry="5" fill="#FFFDF8" stroke="#C9B18C"/>' +
      '<rect x="8" y="10" width="28" height="30" fill="#A3341F"/>' +
      '<path d="M8 16 Q22 22 36 18 M8 23 Q22 29 36 25 M8 30 Q22 36 36 32" stroke="#5E1C10" stroke-width=".8" fill="none" opacity=".6"/>' +
      '<ellipse cx="22" cy="10" rx="18" ry="5" fill="#FFFDF8" stroke="#C9B18C"/>' +
      '<rect x="20" y="-2" width="4" height="12" fill="#B39B74"/></g>';
  }

  function idxAtLength(len) {
    var lo = 0, hi = cum.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] < len) lo = mid + 1; else hi = mid; }
    return lo;
  }

  function draw() {
    if (!maskPath) return;
    maskPath.style.strokeDashoffset = (total - revealShown).toFixed(1);
    var i = idxAtLength(revealShown), p = pts[i], q = pts[Math.max(0, i - 3)];
    var ang = Math.atan2(p[1] - q[1], p[0] - q[0]) * 180 / Math.PI;
    if (needleG && !reduced) {
      needleG.setAttribute('transform', 'translate(' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ')');
      needleG.firstChild.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ') translate(-50,0)');
      needleG.style.opacity = revealShown >= total - 2 ? 0 : 1;
    }
    stamps.forEach(function (s, k) { s.classList.toggle('lit', reduced || i >= nodeIdx[k]); });  }

  function tick() {
    var d = revealTarget - revealShown;
    revealShown = Math.abs(d) < .5 ? revealTarget : revealShown + d * .14;
    draw();
    if (revealShown !== revealTarget) requestAnimationFrame(tick); else running = false;
  }

  // single scroll listener: one progress value (needle depth) for this section
  var queued = false;
  function onScroll() {
    queued = false;
    var vh = innerHeight, r = swirl.getBoundingClientRect();
    UOR.headSolid(scrollY > 10);
    nodes.forEach(function (n) { if (n.getBoundingClientRect().top < vh * .92) n.classList.add('seen'); });
    if (reduced || !pts.length) return;
    var targetY = vh * .62 - r.top;
    var lo = 0, hi = maxY.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (maxY[mid] < targetY) lo = mid + 1; else hi = mid; }
    revealTarget = targetY <= maxY[0] ? 0 : cum[lo];
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { build(); onScroll(); }, 150); });

  build();
  onScroll();
  revealShown = revealTarget; draw();
  if (document.fonts) document.fonts.ready.then(function () { build(); onScroll(); });

  // arriving from a homepage card: bring that piece into view and mark it
  if (location.hash.indexOf('#p-') === 0) {
    var el = document.getElementById(location.hash.slice(1));
    if (el) {
      setTimeout(function () {
        el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        el.classList.add('flash');
      }, 200);
    }
  }
});
