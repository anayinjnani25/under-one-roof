/* Under One Roof — category page: the needle swirls down a stitched milestone path. */
UOR.ready.then(function () {
  var reduced = UOR.reduced();
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeInOut(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  var cat = UOR.cat(UOR.query('c')) || UOR.categories[0];
  var items = UOR.inCat(cat.slug);
  UOR.chrome('products');

  document.title = cat.title + ' ' + cat.accent + ' — Under One Roof';
  document.querySelector('.cat-no').textContent = 'Entry No. ' + cat.no + ' — ' + items.length + ' pieces';
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

  // The thread runs down a spine; stamps (milestones) sit on it and the cards hang off
  // to either side (desktop) or to the right of a left-hand spine (phones).
  function build() {
    var Wc = swirl.clientWidth, mobile = Wc < 640;
    var spine = mobile ? 26 : Wc / 2, lane = mobile ? 0 : 56;
    var cw = mobile ? Wc - 64 : Math.min(260, Wc / 2 - lane - 8);
    nodes.forEach(function (n) { n.style.width = cw + 'px'; });
    var ch = nodes[0].querySelector('.pcard').offsetHeight;
    var lift = cw * .34; // pop-out art rises this far above each card
    var gapY = mobile ? ch + lift + 34 : ch * .6 + lift * .5 + 30, top0 = 140 + lift + ch / 2;
    var centers = [], marks = [];
    items.forEach(function (p, i) {
      var y = top0 + i * gapY, side = i % 2 ? 1 : -1;
      centers.push(mobile ? [spine + 38 + cw / 2, y] : [spine + side * (lane + cw / 2), y]);
      marks.push(mobile ? [spine + (i % 2 ? 6 : -6), y] : [spine + side * 18, y]);
    });
    nodes.forEach(function (n, i) { n.style.left = centers[i][0] + 'px'; n.style.top = centers[i][1] + 'px'; });
    stamps.forEach(function (s, i) { s.style.left = marks[i][0] + 'px'; s.style.top = marks[i][1] + 'px'; });
    var H = centers[centers.length - 1][1] + ch / 2 + 90;
    swirl.style.height = H + 'px';

    // sample the path: S-curves between milestones with a stitched loop at each midpoint
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
    segment(start, centers[0], false, 60);
    nodeIdx.push(pts.length - 1);
    for (var i = 1; i < centers.length; i++) { segment(centers[i - 1], centers[i], true, 160); nodeIdx.push(pts.length - 1); }
    segment(centers[centers.length - 1], [spine, H - 20], false, 60);

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
    stamps.forEach(function (s, k) { s.classList.toggle('lit', reduced || i >= nodeIdx[k]); });
  }

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
