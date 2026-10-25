/* Under One Roof — homepage: pixel field, spool-and-needle sequence, shelf, lanes. */
UOR.ready.then(function () {
  var C = { cream: '#F6EFE2', paper: '#EFE2C9', beige: '#C9B18C', brown: '#6B5339', ink: '#2C2217', rust: '#A3341F' };
  var reduced = UOR.reduced();

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function backOut(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  UOR.chrome('home');

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  }

  // =====================================================================
  // 1. Opening sequence. One canvas, one progress value (0 → 1) mapped to
  //    phases: spin/unspool → needle in → threading → travel + reveal → tear.
  // =====================================================================
  var PH = {
    spin: [0, .74], tip: [0, .30], needleIn: [.06, .30], thread: [.30, .42],
    travel: [.42, .74], brand: [.56, .64], eyebrow: [.60, .70], sub: [.64, .72], tear: [.80, .98]
  };
  var intro = document.querySelector('.intro');
  var stage = document.querySelector('.intro-stage');
  var canvas = document.querySelector('.intro-canvas');
  var hint = document.querySelector('.scroll-hint');
  var ctx = canvas.getContext('2d');
  var buf = document.createElement('canvas'), bctx = buf.getContext('2d');
  var W = 0, H = 0, dpr = 1, G = {}, pieces = [];
  var pTarget = 0, pShown = 0, introDone = false;
  var pointer = { x: -9999, y: -9999, on: false };
  var px = null, pxCount = 0, spacing = 26, pxEnabled = true, pxSettled = false;
  var ctrl = { x: 0, y: 0, vx: 0, vy: 0, init: false };
  var running = false, frameCost = [], downgrades = 0;

  var lowEnd = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory && navigator.deviceMemory <= 2);

  function rngFrom(seed) {
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function layout() {
    var r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    [canvas, buf].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var mobile = W < 700;
    var fs = mobile ? Math.min(W * .118, 64) : Math.min(W * .1, 132, H * .16);
    var cy = H * (mobile ? .45 : .46);
    G = {
      mobile: mobile, fs: fs, cy: cy,
      ny: cy + fs * .5,
      sx: mobile ? W * .17 : Math.max(W * .12, 110), sy: H * (mobile ? .82 : .8),
      s: mobile ? Math.min(W * .15, 62) : Math.min(H * .11, 100),
      L: mobile ? W * .42 : Math.min(W * .26, 360),
      tx: mobile ? W * .28 : W * .3,
      exEnd: mobile ? W * .72 : W * .7
    };
    G.tw = Math.max(1.8, G.s * .03);

    // pixel field
    spacing = (G.mobile ? 30 : 26) * (lowEnd ? 1.5 : 1) * Math.pow(1.35, downgrades);
    var cols = Math.ceil(W / spacing) + 1, rows = Math.ceil(H / spacing) + 1;
    pxCount = cols * rows;
    px = new Float32Array(pxCount * 4);
    var ox = (W - (cols - 1) * spacing) / 2, oy = (H - (rows - 1) * spacing) / 2, i = 0;
    for (var yy = 0; yy < rows; yy++) for (var xx = 0; xx < cols; xx++) {
      px[i++] = ox + xx * spacing; px[i++] = oy + yy * spacing; px[i++] = 0; px[i++] = 0;
    }

    // torn pieces: jittered grid whose shared edges get the same jagged line
    var rnd = rngFrom(20251025), gc = mobile ? 2 : 3, gr = mobile ? 3 : 2, pts = [];
    for (var y = 0; y <= gr; y++) {
      pts[y] = [];
      for (var x = 0; x <= gc; x++) {
        var edgeX = x === 0 || x === gc, edgeY = y === 0 || y === gr;
        pts[y][x] = [x / gc * W + (edgeX ? (x ? 40 : -40) : (rnd() - .5) * W / gc * .5),
                     y / gr * H + (edgeY ? (y ? 40 : -40) : (rnd() - .5) * H / gr * .5)];
      }
    }
    var edges = {};
    function jag(a, b, key) {
      if (edges[key]) return edges[key];
      var out = [a], n = 14, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
      for (var k = 1; k < n; k++) {
        var t = k / n, amp = (rnd() - .5) * Math.min(26, len * .06);
        out.push([a[0] + dx * t + nx * amp, a[1] + dy * t + ny * amp]);
      }
      out.push(b);
      return (edges[key] = out);
    }
    function edge(y1, x1, y2, x2) {
      var key = [y1, x1, y2, x2].join(), rev = [y2, x2, y1, x1].join();
      if (edges[rev]) return edges[rev].slice().reverse();
      return jag(pts[y1][x1], pts[y2][x2], key);
    }
    pieces = [];
    for (var py = 0; py < gr; py++) for (var pxi = 0; pxi < gc; pxi++) {
      var poly = [].concat(edge(py, pxi, py, pxi + 1), edge(py, pxi + 1, py + 1, pxi + 1).slice(1),
        edge(py + 1, pxi + 1, py + 1, pxi).slice(1), edge(py + 1, pxi, py, pxi).slice(1));
      var mx = 0, my = 0;
      poly.forEach(function (q) { mx += q[0]; my += q[1]; });
      mx /= poly.length; my /= poly.length;
      var ddx = mx - W / 2, ddy = my - H / 2, dl = Math.hypot(ddx, ddy) || 1, dist = Math.max(W, H) * (.75 + rnd() * .5);
      pieces.push({ poly: poly, cx: mx, cy: my, dx: ddx / dl * dist, dy: ddy / dl * dist + H * .15, rot: (rnd() - .5) * 1.1, delay: rnd() * .18 });
    }
    ctrl.init = false;
    pxSettled = false;
  }

  // ---- drawing helpers --------------------------------------------------
  function ellipse(c, x, y, rx, ry, fill, stroke) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }

  function drawPixels(c) {
    var R = G.mobile ? 110 : 150, R2 = R * R, push = G.mobile ? 20 : 28, size = G.mobile ? 2.4 : 2.8;
    var maxD = 0, p = pointer, live = p.on && !reduced;
    c.fillStyle = 'rgba(201,177,140,.75)';
    c.beginPath();
    for (var i = 0; i < pxCount * 4; i += 4) {
      var hx = px[i], hy = px[i + 1], tx = 0, ty = 0;
      if (live) {
        var dx = hx - p.x, dy = hy - p.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          var d = Math.sqrt(d2) || 1, fall = 1 - d / R;
          fall = fall * fall * (3 - 2 * fall); // smoothstep falloff
          tx = dx / d * fall * push; ty = dy / d * fall * push;
        }
      }
      if (!reduced) {
        var ex = tx - px[i + 2], ey = ty - px[i + 3];
        px[i + 2] += ex * .12; px[i + 3] += ey * .12;
        var m = Math.abs(ex) + Math.abs(ey);
        if (m > maxD) maxD = m;
      }
      c.rect(hx + px[i + 2] - size / 2, hy + px[i + 3] - size / 2, size, size);
    }
    c.fill();
    pxSettled = maxD < .05;
  }

  function drawSpool(c, spin, unspool) {
    var x = G.sx, y = G.sy, s = G.s;
    var rx = s * .62, ry = s * .16, th = s * .08, rw = s * (.5 - .13 * unspool);
    var topY = y - s * .55, botY = y + s * .55;
    // ground shadow + holder
    ellipse(c, x, y + s * .9, s * 1.05, s * .1, 'rgba(44,34,23,.12)');
    c.fillStyle = '#B39B74';
    c.beginPath(); c.roundRect(x - s * .9, y + s * .66, s * 1.8, s * .2, 4); c.fill();
    c.fillStyle = C.beige;
    c.beginPath(); c.roundRect(x - s * .9, y + s * .62, s * 1.8, s * .17, 4); c.fill();
    c.fillStyle = '#B39B74';
    c.fillRect(x - s * .045, y - s * .5, s * .09, s * 1.15);
    // bottom flange
    ellipse(c, x, botY + th, rx, ry, '#E4DACA');
    c.fillStyle = '#EFE8DC'; c.fillRect(x - rx, botY, rx * 2, th);
    ellipse(c, x, botY, rx, ry, '#FFFDF8', 'rgba(107,83,57,.35)');
    // wound thread core
    var g = c.createLinearGradient(x - rw, 0, x + rw, 0);
    g.addColorStop(0, '#5E1C10'); g.addColorStop(.32, '#C24F37'); g.addColorStop(.55, C.rust); g.addColorStop(1, '#5E1C10');
    c.fillStyle = g; c.fillRect(x - rw, topY, rw * 2, botY - topY);
    ellipse(c, x, botY, rw, ry * rw / rx, g);
    c.save();
    c.beginPath(); c.rect(x - rw, topY, rw * 2, botY - topY); c.clip();
    c.strokeStyle = 'rgba(40,12,6,.38)'; c.lineWidth = 1;
    var gap = s * .075, h = botY - topY, off = ((spin / (Math.PI * 2)) * gap * 3) % gap;
    for (var k = -2; k * gap < h + gap; k++) {
      var ly = topY + k * gap + off;
      c.beginPath(); c.moveTo(x - rw, ly); c.quadraticCurveTo(x, ly + gap * .9, x + rw, ly + gap * .35); c.stroke();
    }
    c.restore();
    // top flange
    ellipse(c, x, topY, rx, ry, '#E4DACA');
    c.fillStyle = '#EFE8DC'; c.fillRect(x - rx, topY - th, rx * 2, th);
    ellipse(c, x, topY - th, rx, ry, '#FFFDF8', 'rgba(107,83,57,.35)');
    ellipse(c, x + Math.cos(spin) * rx * .62, topY - th + Math.sin(spin) * ry * .62, s * .045, s * .02, '#D8CCB6');
    ellipse(c, x, topY - th, s * .1, s * .03, '#9C8460');
    c.fillStyle = '#B39B74'; c.fillRect(x - s * .045, topY - th - s * .3, s * .09, s * .3);
    ellipse(c, x, topY - th - s * .3, s * .07, s * .03, C.beige);
    return { x: x + rw, y: y + Math.sin(spin * .35) * s * .3 };
  }

  function needlePath(c, L, hw) {
    var back = -L * .07, tip = L * .93;
    c.beginPath();
    c.moveTo(back + hw, -hw);
    c.lineTo(tip - L * .28, -hw * .85);
    c.quadraticCurveTo(tip - L * .06, -hw * .3, tip, 0);
    c.quadraticCurveTo(tip - L * .06, hw * .3, tip - L * .28, hw * .85);
    c.lineTo(back + hw, hw);
    c.arc(back + hw, 0, hw, Math.PI / 2, Math.PI * 1.5);
    c.closePath();
    c.ellipse(0, 0, L * .032, hw * .42, 0, 0, Math.PI * 2);
  }

  function drawNeedle(c, ex, ey, a) {
    var L = G.L, hw = Math.max(3.2, L * .019);
    c.save(); c.translate(ex, ey); c.rotate(a);
    c.save(); c.translate(3, 7); needlePath(c, L, hw); c.fillStyle = 'rgba(44,34,23,.14)'; c.fill('evenodd'); c.restore();
    var g = c.createLinearGradient(0, -hw, 0, hw);
    g.addColorStop(0, '#F7F5F1'); g.addColorStop(.45, '#B9B4AA'); g.addColorStop(1, '#6E6A62');
    needlePath(c, L, hw); c.fillStyle = g; c.fill('evenodd');
    c.strokeStyle = 'rgba(60,56,50,.7)'; c.lineWidth = .8; c.stroke();
    c.beginPath(); c.moveTo(L * .05, -hw * .38); c.lineTo(L * .7, -hw * .3);
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.stroke();
    c.restore();
  }

  function thread(c, pts, w) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) c.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.strokeStyle = C.rust; c.lineWidth = w || G.tw; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }

  var EYEBROW = 'No. 01 — A journal of handmade things';
  var SUB = 'Torans, garlands & jewelry — stitched by hand, kept under one roof.';

  function drawBrand(c, p) {
    var fs = G.fs, cx = W / 2, cy = G.cy;
    var a = seg(p, PH.brand[0], PH.brand[1]);
    if (a > 0) {
      var sc = .72 + .28 * backOut(a);
      c.save(); c.globalAlpha = clamp(a * 1.6, 0, 1);
      c.translate(cx, cy); c.scale(sc, sc);
      c.textBaseline = 'alphabetic';
      var f1 = '400 ' + fs + 'px Fraunces, Georgia, serif', f2 = 'italic 300 ' + fs + 'px Fraunces, Georgia, serif';
      c.font = f1; var w1 = c.measureText('Under ').width, w3 = c.measureText(' Roof').width;
      c.font = f2; var w2 = c.measureText('One').width;
      var x0 = -(w1 + w2 + w3) / 2;
      c.fillStyle = C.ink; c.font = f1; c.fillText('Under ', x0, 0);
      c.fillStyle = C.rust; c.font = f2; c.fillText('One', x0 + w1, 0);
      c.fillStyle = C.ink; c.font = f1; c.fillText(' Roof', x0 + w1 + w2, 0);
      c.restore();
    }
    var e = seg(p, PH.eyebrow[0], PH.eyebrow[1]);
    if (e > 0) {
      var efs = Math.max(11, fs * .13), n = Math.ceil(EYEBROW.length * e);
      c.font = efs + 'px "Special Elite", "Courier New", monospace';
      c.fillStyle = C.brown; c.textBaseline = 'alphabetic';
      var txt = EYEBROW.toUpperCase();
      // measure full width so typing grows left-to-right from a fixed start
      var track = efs * .22, total = 0;
      for (var i = 0; i < txt.length; i++) total += c.measureText(txt[i]).width + track;
      var sx = cx - total / 2, yy = cy - fs * .95;
      for (var k = 0; k < n; k++) { c.fillText(txt[k], sx, yy); sx += c.measureText(txt[k]).width + track; }
      if (e < 1 || (performance.now() / 500 | 0) % 2) c.fillRect(sx + 2, yy - efs * .8, efs * .5, efs * .95);
    }
    var s = seg(p, PH.sub[0], PH.sub[1]);
    if (s > 0) {
      var sfs = Math.max(17, fs * .24);
      c.font = 'italic 400 ' + sfs + 'px "Cormorant Garamond", Georgia, serif';
      c.fillStyle = C.brown; c.textAlign = 'center'; c.globalAlpha = easeOut(s);
      var y0 = G.ny + sfs * 1.9 + (1 - easeOut(s)) * 10;
      if (c.measureText(SUB).width > W * .86) {
        var cut = SUB.indexOf('—');
        c.fillText(SUB.slice(0, cut).trim(), cx, y0);
        c.fillText(SUB.slice(cut).trim(), cx, y0 + sfs * 1.25);
      } else c.fillText(SUB, cx, y0);
      c.textAlign = 'left'; c.globalAlpha = 1;
    }
  }

  function scene(c, p) {
    c.fillStyle = C.cream; c.fillRect(0, 0, W, H);
    if (pxEnabled) drawPixels(c);

    var sp = seg(p, PH.spin[0], PH.spin[1]);
    var spin = easeInOut(sp) * 34;
    var exit = drawSpool(c, spin, sp);

    // needle position
    var nIn = easeOut(seg(p, PH.needleIn[0], PH.needleIn[1]));
    var tr = seg(p, PH.travel[0], PH.travel[1]), trE = easeInOut(tr);
    var ex = tr > 0 ? lerp(G.tx, G.exEnd, trE) : lerp(-G.L * 1.05, G.tx, nIn);
    var bob = tr > 0 && tr < 1 ? Math.sin(tr * Math.PI * 9) : 0;
    var ey = G.ny + bob * 3;
    var ang = bob * .05 + (1 - nIn) * -.12;

    // thread geometry
    var th = seg(p, PH.thread[0], PH.thread[1]);
    var wait = [G.tx - 4, G.ny + G.fs * .55], anchor, sagScale;
    if (th <= 0) {
      var tp = easeInOut(seg(p, PH.tip[0], PH.tip[1]));
      anchor = [lerp(exit.x + 30, wait[0], tp), lerp(exit.y - 10, wait[1], tp) + Math.sin(tp * Math.PI) * -30];
      sagScale = 1;
    } else if (th < 1) {
      var te = easeInOut(th);
      anchor = [lerp(wait[0], ex + 3, te), lerp(wait[1], ey - G.fs * .2, te)];
      sagScale = 1;
    } else {
      anchor = [G.tx, G.ny];
      sagScale = .8 - trE * .25;
    }
    // sagging control point, spring-follows its target every frame
    var mx = (exit.x + anchor[0]) / 2, my = (exit.y + anchor[1]) / 2;
    var dist = Math.hypot(anchor[0] - exit.x, anchor[1] - exit.y);
    var tgx = mx + dist * .05, tgy = my + Math.min(160, dist * .32) * sagScale;
    if (!ctrl.init || reduced) { ctrl.x = tgx; ctrl.y = tgy; ctrl.vx = ctrl.vy = 0; ctrl.init = true; }
    ctrl.vx = (ctrl.vx + (tgx - ctrl.x) * .08) * .84;
    ctrl.vy = (ctrl.vy + (tgy - ctrl.y) * .08) * .84;
    ctrl.x += ctrl.vx; ctrl.y += ctrl.vy;
    thread(c, [[exit.x, exit.y], [ctrl.x, ctrl.y], anchor]);

    if (th <= 0) { // frayed loose tip
      c.save(); c.strokeStyle = C.rust; c.lineWidth = 1;
      for (var f = -1; f <= 1; f++) { c.beginPath(); c.moveTo(anchor[0], anchor[1]); c.lineTo(anchor[0] + 5 + f, anchor[1] - 6 + f * 3); c.stroke(); }
      c.restore();
    }

    if (th >= 1) {
      // running stitch from the threading point to the needle, then through the eye
      var sw = Math.max(2.4, G.fs * .045), dash = G.fs * .2, gap = G.fs * .13, x = G.tx, end = ex - 6;
      c.strokeStyle = C.rust; c.lineWidth = sw; c.lineCap = 'round';
      c.beginPath();
      while (x < end) { c.moveTo(x, G.ny); c.lineTo(Math.min(x + dash, end), G.ny); x += dash + gap; }
      c.stroke();
      thread(c, [[Math.max(G.tx, end - 2), G.ny], [ex, ey]]);
      // short tail through the eye, swinging with the bob
      thread(c, [[ex, ey], [ex + 6 + bob * 2, ey - G.fs * .16], [ex + 2 + bob * 4, ey - G.fs * .26]]);
    }
    drawNeedle(c, ex, ey, ang);
    drawBrand(c, p);
  }

  function drawTear(t) {
    scene(bctx, pShown);
    ctx.clearRect(0, 0, W, H);
    var crack = easeOut(seg(t, 0, .18)), fly = seg(t, .12, 1);
    pieces.forEach(function (pc) {
      var ft = Math.pow(seg(fly, pc.delay, 1), 1.7);
      var dx = (pc.cx - W / 2) * .025 * crack + pc.dx * ft, dy = (pc.cy - H / 2) * .025 * crack + pc.dy * ft;
      var alpha = 1 - seg(ft, .45, 1);
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(pc.cx + dx, pc.cy + dy); ctx.rotate(pc.rot * (ft + crack * .03)); ctx.translate(-pc.cx, -pc.cy);
      ctx.beginPath();
      pc.poly.forEach(function (q, i) { i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
      ctx.closePath();
      ctx.shadowColor = 'rgba(44,34,23,.28)'; ctx.shadowBlur = 24 * crack; ctx.shadowOffsetY = 10 * crack;
      ctx.fillStyle = C.paper; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.save(); ctx.clip(); ctx.drawImage(buf, 0, 0, W, H); ctx.restore();
      ctx.strokeStyle = 'rgba(255,251,242,.95)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    });
  }

  function render() {
    var t0 = performance.now();
    if (pShown >= .995 && !reduced) {
      if (!introDone) { ctx.clearRect(0, 0, W, H); introDone = true; stage.classList.add('done'); }
      return;
    }
    if (introDone) { introDone = false; stage.classList.remove('done'); }
    var tear = reduced ? 0 : seg(pShown, PH.tear[0], PH.tear[1]);
    if (tear > 0) drawTear(tear); else scene(ctx, pShown);
    // performance budget: thin out (then drop) the pixel field if frames run long
    if (!reduced && pxEnabled) {
      frameCost.push(performance.now() - t0);
      if (frameCost.length >= 24) {
        var avg = frameCost.reduce(function (a, b) { return a + b; }, 0) / frameCost.length;
        frameCost = [];
        if (avg > 9) { if (downgrades < 2) { downgrades++; layout(); } else pxEnabled = false; }
      }
    }
  }

  function tick() {
    var d = pTarget - pShown;
    pShown = Math.abs(d) < .0004 ? pTarget : pShown + d * .16;
    render();
    var springMoving = Math.abs(ctrl.vx) + Math.abs(ctrl.vy) > .02;
    var typing = pShown > PH.eyebrow[0] && pShown < PH.tear[0]; // caret blink
    if (!introDone && (pShown !== pTarget || !pxSettled || springMoving || typing)) requestAnimationFrame(tick);
    else running = false;
  }
  function kick() {
    if (reduced) { render(); return; }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  function setPointer(x, y) {
    pointer.x = x; pointer.y = y; pointer.on = true;
    if (!introDone) kick();
  }
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    setPointer(e.clientX, e.clientY);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', function () { pointer.on = false; kick(); });
  window.addEventListener('touchstart', function (e) { var t = e.touches[0]; setPointer(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchmove', function (e) { var t = e.touches[0]; setPointer(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchend', function () { pointer.on = false; kick(); }, { passive: true });

  // =====================================================================
  // 2. Shop front + collection
  // =====================================================================
  var catGrid = document.querySelector('.cat-grid');
  catGrid.innerHTML = UOR.categories.map(function (c) {
    var n = UOR.inCat(c.slug).length, f = UOR.byId(c.feature);
    return '<li><a class="cat-card" href="category.html?c=' + c.slug + '">' +
      '<span class="label"><span>No. ' + c.no + '</span><span>' + n + ' pieces</span></span>' +
      '<div class="cat-art">' + UOR.art(f) + '</div>' +
      '<h3>' + c.title + ' <em>' + c.accent + '</em></h3><p>' + c.blurb + '</p>' +
      '<span class="open">Open entry →</span></a></li>';
  }).join('');

  var grid = document.querySelector('.pgrid');
  grid.innerHTML = UOR.products.map(function (p, i) {
    return '<li data-cat="' + p.cat + '">' + UOR.card(p, UOR.catHref(p), i + 1) + '</li>';
  }).join('');
  var chips = document.querySelector('.chips');
  chips.innerHTML = '<button class="chip" type="button" data-f="all" aria-pressed="true">All</button>' +
    UOR.categories.map(function (c) { return '<button class="chip" type="button" data-f="' + c.slug + '" aria-pressed="false">' + c.accent + (c.slug === 'oxidised' ? ' · Oxidised' : c.slug === 'gold-silver' ? ' · Gold & Silver' : '') + '</button>'; }).join('');
  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    chips.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b); });
    grid.querySelectorAll('li').forEach(function (li) { li.hidden = b.dataset.f !== 'all' && li.dataset.cat !== b.dataset.f; });
  });

  // =====================================================================
  // 3. Multi-lane carousel: each lane moves only under its own hover/wheel/drag
  // =====================================================================
  var dock = document.querySelector('.dock');
  var lanesEl = dock.querySelector('.lanes');
  var dockHint = dock.querySelector('.dock-hint');
  var LANES = 3, lanes = [], lanesRunning = false, travelled = 0;
  var desktop = window.matchMedia('(min-width: 900px)');
  for (var li = 0; li < LANES; li++) {
    var items = UOR.products.filter(function (p, i) { return i % LANES === li; });
    var html = items.map(function (p) {
      return '<a class="lane-item" style="--bg:' + p.bg + '" href="' + UOR.productHref(p) + '" draggable="false">' + UOR.art(p) + '<span>' + UOR.esc(p.name) + '</span></a>';
    }).join('');
    var lane = document.createElement('div');
    lane.className = 'lane';
    lane.setAttribute('aria-label', 'Product lane ' + (li + 1));
    lane.innerHTML = '<div class="lane-track">' + html + '<div aria-hidden="true">' + html + '</div></div>';
    lane.querySelectorAll('[aria-hidden] a').forEach(function (a) { a.tabIndex = -1; });
    lanesEl.appendChild(lane);
    lanes.push({ el: lane, track: lane.firstChild, off: li * 46, vel: 0, hover: false, drag: null, h: 0 });
  }
  function measureLanes() { lanes.forEach(function (l) { l.h = l.track.scrollHeight / 2; place(l); }); }
  function place(l) {
    if (l.h) l.off = ((l.off % l.h) + l.h) % l.h;
    l.track.style.transform = 'translate3d(0,' + (-l.off).toFixed(2) + 'px,0)';
  }
  function interacted(d) {
    dockHint.classList.add('gone');
    travelled += Math.abs(d);
    if (travelled > 160) dock.classList.add('ready');
  }
  function lanesTick() {
    var any = false;
    lanes.forEach(function (l) {
      if (l.drag) { any = true; return; }
      var drift = l.hover && !reduced ? .55 : 0;
      l.vel += (drift - l.vel) * (l.hover ? .05 : .06);
      if (Math.abs(l.vel) > .01) { l.off += l.vel; interacted(l.vel); place(l); any = true; }
      else l.vel = 0;
      if (l.hover) any = true;
    });
    if (any) requestAnimationFrame(lanesTick); else lanesRunning = false;
  }
  function kickLanes() { if (!lanesRunning) { lanesRunning = true; requestAnimationFrame(lanesTick); } }
  lanes.forEach(function (l) {
    var el = l.el;
    el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { l.hover = true; kickLanes(); } });
    el.addEventListener('pointerleave', function () { l.hover = false; kickLanes(); });
    el.addEventListener('wheel', function (e) {
      e.preventDefault(); // this lane takes the wheel; the page and other lanes stay put
      var d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (reduced) { l.off += d; place(l); interacted(d); return; }
      l.vel += d * .09; kickLanes();
    }, { passive: false });
    el.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      l.drag = { y: e.clientY, last: e.clientY, t: performance.now(), v: 0, moved: 0, id: e.pointerId };
      kickLanes();
    });
    el.addEventListener('pointermove', function (e) {
      var d = l.drag; if (!d || d.id !== e.pointerId) return;
      var dy = e.clientY - d.last, now = performance.now();
      d.moved += Math.abs(dy);
      if (d.moved > 6 && !el.hasPointerCapture(e.pointerId)) el.setPointerCapture(e.pointerId);
      d.v = -dy / Math.max(1, now - d.t) * 16; d.last = e.clientY; d.t = now;
      l.off -= dy; place(l); interacted(dy);
    });
    function up(e) {
      var d = l.drag; if (!d) return;
      l.drag = null;
      if (d.moved > 6) {
        l.vel = reduced ? 0 : d.v;
        l.suppress = performance.now() + 120; // a drag is not a click on the thumbnail under it
      }
      kickLanes();
    }
    el.addEventListener('click', function (ev) {
      if (l.suppress > performance.now()) { ev.preventDefault(); ev.stopPropagation(); }
    }, true);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
  dock.querySelector('.dock-min').addEventListener('click', function () {
    var min = dock.classList.toggle('min');
    this.setAttribute('aria-expanded', !min);
    this.textContent = min ? '+' : '–';
  });

  // =====================================================================
  // 4. One scroll listener drives everything scroll-linked on this page
  // =====================================================================
  var foot = document.querySelector('.site-foot');
  var shelf = document.querySelector('#shelf');
  var scrollQueued = false;
  function onScroll() {
    scrollQueued = false;
    var r = intro.getBoundingClientRect();
    var range = intro.offsetHeight - stage.offsetHeight;
    pTarget = reduced || range <= 0 ? (reduced ? .74 : 1) : clamp(-r.top / range, 0, 1);
    hint.classList.toggle('gone', pTarget > .01 || reduced);
    UOR.headSolid(reduced ? scrollY > 10 : pTarget > .97);
    document.body.classList.toggle('intro-live', !reduced && pTarget < .97);
    if (!reduced) kick();

    var vh = innerHeight;
    if (shelf.getBoundingClientRect().top < vh * .5) dock.classList.add('ready');
    if (desktop.matches) {
      var footTop = foot.getBoundingClientRect().top;
      dock.classList.toggle('show', (reduced ? r.bottom < vh * .6 : pTarget >= .99) && footTop > vh - 30);
    }
  }
  window.addEventListener('scroll', function () { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); } }, { passive: true });

  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { layout(); measureLanes(); onScroll(); render(); }, 120);
  });

  // ---- boot
  document.documentElement.classList.add(reduced ? 'reduced' : 'motion');
  layout();
  if (reduced) { pShown = pTarget = .74; }
  onScroll();
  pShown = pTarget;
  render();
  measureLanes();
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('400 40px Fraunces'), document.fonts.load('italic 300 40px Fraunces'),
      document.fonts.load('20px "Special Elite"'), document.fonts.load('italic 20px "Cormorant Garamond"')
    ]).then(function () { render(); measureLanes(); }, function () {});
  }
  window.addEventListener('load', measureLanes);
});
