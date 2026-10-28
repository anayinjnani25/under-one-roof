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
  document.querySelector('.cat-no').textContent = UOR.t(items.length === 1 ? 'cat.entry1' : 'cat.entry', { no: cat.no, n: items.length });
  document.querySelector('.cat-title').innerHTML = cat.title + ' <em>' + cat.accent + '</em>';
  document.querySelector('.cat-blurb').textContent = cat.blurb;
  // the shelf's word, huge and faint behind the first screen
  document.querySelector('.cat-giant').textContent = UOR.lang === 'en' ? cat.accent.toLowerCase() : cat.accent;
  // the other shelves, as torn word strips (this one inked)
  document.querySelector('.cat-tabs').innerHTML = UOR.categories.map(function (c) {
    return '<a class="strip" href="category.html?c=' + c.slug + '"' + (c === cat ? ' aria-current="page" data-tone="ink" data-type="serif"' : ' data-tone="aged" data-type="type"') + '>' + c.title + ' ' + c.accent + '</a>';
  }).join('');
  UOR.tearAll();

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

  // Route from A to B that never passes behind a card (or another stamp) and never crosses the
  // thread already drawn. Candidate curves bend through a waypoint anywhere across the page;
  // of the ones that stay clear, the widest sweep wins, so the thread still covers the screen.
  function catmull(P, n) {
    var out = [], ext = [P[0]].concat(P, [P[P.length - 1]]);
    for (var s = 1; s < ext.length - 2; s++) {
      var p0 = ext[s - 1], p1 = ext[s], p2 = ext[s + 1], p3 = ext[s + 2];
      for (var k = (s === 1 ? 0 : 1); k <= n; k++) {
        var t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(function (c) {
          return .5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
        }));
      }
    }
    return out;
  }
  function crosses(a, b, c, d) { // do segments ab and cd properly intersect?
    function o(p, q, r) { var v = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); return v > 1e-9 ? 1 : v < -1e-9 ? -1 : 0; }
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
  }
  var CELL = 60, grid = {};
  function cellsOf(a, b) {
    var out = [], x0 = Math.floor(Math.min(a[0], b[0]) / CELL), x1 = Math.floor(Math.max(a[0], b[0]) / CELL);
    var y0 = Math.floor(Math.min(a[1], b[1]) / CELL), y1 = Math.floor(Math.max(a[1], b[1]) / CELL);
    for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) out.push(x + ',' + y);
    return out;
  }
  function addSegs(path) {
    for (var i = 1; i < path.length; i++) {
      var sg = [path[i - 1], path[i]];
      cellsOf(sg[0], sg[1]).forEach(function (k) { (grid[k] = grid[k] || []).push(sg); });
    }
  }
  // weighted so that, if nothing is perfect, a hairpin or tight gap is given up long before a
  // card overlap (50 a point) or a crossing (1000)
  function violations(path, A, boxes, Wc, H) {
    var bad = 0, i, j;
    for (i = 0; i < path.length; i++) {
      var q = path[i];
      if (q[0] < 6 || q[0] > Wc - 6 || q[1] < 4 || q[1] > H - 4) bad += 50;
      for (j = 0; j < boxes.length; j++) { var bx = boxes[j]; if (q[0] > bx[0] && q[0] < bx[2] && q[1] > bx[1] && q[1] < bx[3]) { bad += 50; break; } }
    }
    // no hairpins: the thread never turns back on itself sharply
    for (i = 4; i < path.length - 4; i++) {
      var ux = path[i][0] - path[i - 4][0], uy = path[i][1] - path[i - 4][1], vx = path[i + 4][0] - path[i][0], vy = path[i + 4][1] - path[i][1];
      var ul = Math.hypot(ux, uy), vl = Math.hypot(vx, vy);
      if (ul > 1 && vl > 1 && (ux * vx + uy * vy) / (ul * vl) < -0.2) { bad += 3; break; } // a turn sharper than ~100°
    }
    // keep a clear gap: no part runs within GAP of another part of the thread (itself or earlier legs)
    var GAP = 26;
    for (i = 0; i < path.length; i += 2) {
      for (j = i + 16; j < path.length; j += 2) if (Math.hypot(path[i][0] - path[j][0], path[i][1] - path[j][1]) < GAP) { bad += 3; i = path.length; break; }
    }
    for (i = 0; i < path.length; i += 2) {
      var qx = path[i][0], qy = path[i][1];
      if (Math.hypot(qx - A[0], qy - A[1]) < 50) continue; // leaving A, it is bound to be near the thread arriving at A
      var near = false;
      cellsOf([qx - GAP, qy - GAP], [qx + GAP, qy + GAP]).forEach(function (k) {
        (grid[k] || []).forEach(function (sg) { if (!near && Math.hypot(sg[1][0] - qx, sg[1][1] - qy) < GAP) near = true; });
      });
      if (near) { bad += 3; break; }
    }
    for (i = 2; i < path.length; i++) for (j = 1; j < i - 1; j++) {   // the curve crossing itself
      if (crosses(path[j - 1], path[j], path[i - 1], path[i])) { bad += 1000; i = path.length; break; }
    }
    for (i = 1; i < path.length; i++) {
      var s0 = path[i - 1], s1 = path[i], seen = [];
      cellsOf(s0, s1).forEach(function (k) {
        (grid[k] || []).forEach(function (sg) {
          if (seen.indexOf(sg) > -1) return; seen.push(sg);
          // the thread already drawn ends at A: touching it there is not a crossing
          if (Math.hypot(sg[1][0] - A[0], sg[1][1] - A[1]) < 6 || Math.hypot(sg[0][0] - A[0], sg[0][1] - A[1]) < 6) return;
          if (crosses(s0, s1, sg[0], sg[1])) bad += 1000;
        });
      });
    }
    return bad;
  }
  function route(A, B, boxes, Wc, H) {
    var lo = Math.min(A[1], B[1]), hi = Math.max(A[1], B[1]), dy = hi - lo;
    var ys = dy >= 120 ? [lo + dy * .25, lo + dy * .5, lo + dy * .75, hi + 60] : [hi + 60, hi + 120, hi + 180, (A[1] + B[1]) / 2];
    var xs = [.03, .1, .2, .32, .44, .56, .68, .8, .9, .97].map(function (f) { return f * Wc; }).concat([(A[0] + B[0]) / 2]);
    // clear horizontal corridors: heights where a line across the whole page touches no card
    var corridors = [], run = null;
    for (var y = Math.max(20, lo - 260); y <= Math.min(H - 20, hi + 260); y += 8) {
      var free = !boxes.some(function (bx) { return y > bx[1] && y < bx[3]; });
      if (free && !run) run = [y, y]; else if (free) run[1] = y; else if (run) { corridors.push((run[0] + run[1]) / 2); run = null; }
    }
    if (run) corridors.push((run[0] + run[1]) / 2);
    var cands = [catmull([A, B], 50)];
    xs.forEach(function (x) { ys.concat(corridors).forEach(function (y) { cands.push(catmull([A, [x, Math.min(y, H - 30)], B], 40)); }); });
    // two bends anywhere in the band around A and B (a fixed pseudo-random set, so the route is
    // the same on every visit): these find the wide swings between staggered cards
    var r = 2166136261 ^ Math.round(A[0] * 7 + B[1] * 13);
    function rnd() { r = Math.imul(r ^ (r >>> 15), 2246822507); r = Math.imul(r ^ (r >>> 13), 3266489909); r ^= r >>> 16; return (r >>> 0) / 4294967296; }
    var top = Math.max(20, lo - 220), bot = Math.min(H - 30, hi + 220);
    for (var k = 0; k < 240; k++) {
      cands.push(catmull([A, [Wc * (.03 + rnd() * .94), top + rnd() * (bot - top)], [Wc * (.03 + rnd() * .94), top + rnd() * (bot - top)], B], 30));
    }
    // wider sweeps: out to one side along a corridor, across to the other, then into B
    var edges = [.04 * Wc, .96 * Wc];
    corridors.forEach(function (cy) {
      edges.forEach(function (x1) { edges.forEach(function (x2) {
        if (x1 !== x2) cands.push(catmull([A, [x1, cy], [x2, cy], B], 34));
      }); });
      cands.push(catmull([A, [edges[0], cy], B], 40), catmull([A, [edges[1], cy], B], 40));
    });
    var best = null, bestScore = -Infinity, fallback = null, fewest = Infinity;
    cands.forEach(function (c) {
      var v = violations(c, A, boxes, Wc, H);
      // how far the curve swings away from the straight line A-B (bigger = covers more of the page)
      var dev = 0, len = 0, ax = B[0] - A[0], ay = B[1] - A[1], al = Math.hypot(ax, ay) || 1;
      for (var i = 0; i < c.length; i++) {
        dev = Math.max(dev, Math.abs((c[i][0] - A[0]) * ay - (c[i][1] - A[1]) * ax) / al);
        if (i) len += Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
      }
      var score = dev - len * .04;
      if (!v && score > bestScore) { best = c; bestScore = score; }
      if (v < fewest) { fewest = v; fallback = c; }
    });
    var path = best || fallback;
    addSegs(path);
    follow(path);
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
    var Wc = swirl.clientWidth, mobile = Wc < 840; // below this the cards can't leave room for a clear route
    var spine = mobile ? 26 : Wc / 2;
    var cw = mobile ? Math.min(Wc - 64, 420) : clamp(Wc * .2, 240, 330);
    nodes.forEach(function (n) { n.style.width = cw + 'px'; });
    swirl.classList.toggle('narrow', mobile); // the column layout keeps each piece's art inside the card's width
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
    // each card's real box, pop-out art included, measured from layout (offsets ignore the
    // reveal animation's transforms); the node is centred on its point by translate(-50%,-50%)
    function boxOf(el, node) {
      var x = 0, y = 0;
      for (var e = el; e && e !== node; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
      x += node.offsetLeft - node.offsetWidth / 2; y += node.offsetTop - node.offsetHeight / 2;
      return [x, y, x + el.offsetWidth, y + el.offsetHeight];
    }
    var cardBoxes = nodes.map(function (n) {
      var a = boxOf(n.querySelector('.pcard'), n), b = boxOf(n.querySelector('.pcard-art'), n);
      return [Math.min(a[0], b[0]) - 8, Math.min(a[1], b[1]) - 8, Math.max(a[2], b[2]) + 8, Math.max(a[3], b[3]) + 8]; // +8: the slight tilt
    });
    var H = centers[centers.length - 1][1] + ch / 2 + 90;
    swirl.style.height = H + 'px';

    // sample the path between milestones (phones: gentle S-curves down the spine; wide: routed sweeps)
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
      for (var i = 1; i < centers.length; i++) { segment(centers[i - 1], centers[i], false, 160); nodeIdx.push(pts.length - 1); }
      segment(centers[centers.length - 1], [spine, H - 20], false, 60);
    } else {
      // wide screens: wide sweeps that keep clear of every card and never cross themselves
      grid = {};
      var pad = 16, boxes = cardBoxes.map(function (c) { return [c[0] - pad, c[1] - pad, c[2] + pad, c[3] + pad]; });
      var stampBoxes = centers.map(function (mk) { return [mk[0] - 26, mk[1] - 26, mk[0] + 26, mk[1] + 26]; });
      var legs = [[start, centers[0], 0]];
      for (var q = 1; q < centers.length; q++) legs.push([centers[q - 1], centers[q], q]);
      legs.push([centers[centers.length - 1], [spine, H - 20], -1]);
      legs.forEach(function (leg, li) {
        // other stamps are obstacles too (not the two this leg joins)
        var obs = boxes.concat(stampBoxes.filter(function (b, k) { return k !== leg[2] && k !== leg[2] - 1 && !(leg[2] === -1 && k === centers.length - 1); }));
        route(leg[0], leg[1], obs, Wc, H);
        if (li < legs.length - 1) nodeIdx.push(pts.length - 1);
      });
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
  // a card that changes size (a late font, a long Telugu name) gets the route re-planned around it
  if ('ResizeObserver' in window) {
    var sizes = new WeakMap();
    var ro = new ResizeObserver(function (entries) {
      var changed = entries.some(function (e) { var h = Math.round(e.contentRect.height), was = sizes.get(e.target); sizes.set(e.target, h); return was !== undefined && was !== h; });
      if (changed) { clearTimeout(rt); rt = setTimeout(function () { build(); onScroll(); }, 120); }
    });
    nodes.forEach(function (n) { ro.observe(n.querySelector('.pcard')); });
  }

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
