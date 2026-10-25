/* Under One Roof — illustrated product cut-outs.
   Every product is drawn as a background-free SVG object (viewBox 200x200) from its
   `art` spec, so the catalog works before photography exists. When real cut-out
   images are ready, give the product an `image` field and UOR.art returns an <img>. */
window.UOR = window.UOR || {};

(function () {
  var uid = 0;

  function rng(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5; var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f(n) { return Math.round(n * 10) / 10; }

  function grad(id, m) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + m.hi + '"/><stop offset=".45" stop-color="' + m.base + '"/>' +
      '<stop offset="1" stop-color="' + m.lo + '"/></linearGradient>';
  }
  function bead(x, y, r, fill, stroke) {
    return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + r + '" fill="' + fill + '"' +
      (stroke ? ' stroke="' + stroke + '" stroke-width=".8"' : '') + '/>' +
      '<circle cx="' + f(x - r * 0.35) + '" cy="' + f(y - r * 0.35) + '" r="' + f(r * 0.3) + '" fill="#fff" opacity=".45"/>';
  }
  function bell(x, y, s, g, lo) {
    return '<path d="M' + f(x - s) + ',' + f(y + s * 1.5) + ' C' + f(x - s) + ',' + f(y + s * 0.2) + ' ' + f(x - s * 0.5) + ',' + f(y) + ' ' + f(x) + ',' + f(y) +
      ' C' + f(x + s * 0.5) + ',' + f(y) + ' ' + f(x + s) + ',' + f(y + s * 0.2) + ' ' + f(x + s) + ',' + f(y + s * 1.5) + ' Z" fill="url(#' + g + ')" stroke="' + lo + '" stroke-width=".7"/>' +
      '<circle cx="' + f(x) + '" cy="' + f(y + s * 1.75) + '" r="' + f(s * 0.32) + '" fill="' + lo + '"/>';
  }
  function tassel(x, y, len, col, dark) {
    var s = '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="2.6" fill="' + dark + '"/>' +
      '<rect x="' + f(x - 3) + '" y="' + f(y + 2) + '" width="6" height="4" rx="1.5" fill="' + dark + '"/>';
    for (var i = -3; i <= 3; i++) {
      s += '<line x1="' + f(x + i * 0.6) + '" y1="' + f(y + 6) + '" x2="' + f(x + i * 1.6) + '" y2="' + f(y + 6 + len - Math.abs(i) * 1.2) +
        '" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round"/>';
    }
    return s;
  }
  function strand(x, y0, y1, beadCol, cord, gap, end) {
    var s = '<line x1="' + f(x) + '" y1="' + f(y0) + '" x2="' + f(x) + '" y2="' + f(y1) + '" stroke="' + cord + '" stroke-width="1"/>';
    for (var y = y0 + gap; y < y1 - 2; y += gap) s += bead(x, y, 2.4, beadCol);
    return s + (end || '');
  }

  // ---- textiles ---------------------------------------------------------
  function toran(a, pal, m, g, r) {
    var s = '', k = a.flaps, x0 = 8, w = 184 / k, top = 58;
    var L = a.big ? 84 : (a.shape === 'round' ? 52 : 66);
    var fills = [pal.alt, pal.trim];
    var ty = a.tassels ? 4 : 18;
    s += '<g transform="translate(0,' + ty + ')">';
    s += '<path d="M2,32 Q100,38 198,32" stroke="' + pal.dark + '" stroke-width="1.4" fill="none"/>';
    s += '<circle cx="12" cy="33" r="4.5" fill="none" stroke="' + pal.dark + '" stroke-width="1.6"/><circle cx="188" cy="33" r="4.5" fill="none" stroke="' + pal.dark + '" stroke-width="1.6"/>';
    // strings / bells between flaps sit behind the flaps
    if (a.bells || a.strings) {
      for (var j = 1; j < k; j++) {
        var sx = x0 + j * w, end = top + L * (a.strings ? 0.95 : 0.7);
        s += strand(sx, top, end, j % 2 ? pal.trim : pal.alt, pal.dark, 7, bell(sx, end, 4, g, m.lo));
      }
    }
    for (var i = 0; i < k; i++) {
      var a0 = x0 + i * w + 1, a1 = x0 + (i + 1) * w - 1, cx = (a0 + a1) / 2, d, tipY, cy;
      if (a.shape === 'round') {
        var rr = (a1 - a0) / 2, y1 = top + L * 0.45;
        d = 'M' + f(a0) + ',' + top + ' L' + f(a1) + ',' + top + ' L' + f(a1) + ',' + f(y1) + ' A' + f(rr) + ' ' + f(rr) + ' 0 0 1 ' + f(a0) + ',' + f(y1) + ' Z';
        tipY = y1 + rr; cy = top + (tipY - top) * 0.55;
      } else if (a.shape === 'leaf') {
        tipY = top + L;
        d = 'M' + f(cx) + ',' + top + ' C' + f(a1 + 3) + ',' + f(top + L * 0.3) + ' ' + f(cx + w * 0.25) + ',' + f(top + L * 0.8) + ' ' + f(cx) + ',' + f(tipY) +
          ' C' + f(cx - w * 0.25) + ',' + f(top + L * 0.8) + ' ' + f(a0 - 3) + ',' + f(top + L * 0.3) + ' ' + f(cx) + ',' + top + ' Z';
        cy = top + L * 0.42;
      } else {
        tipY = top + L;
        d = 'M' + f(a0) + ',' + top + ' L' + f(a1) + ',' + top + ' L' + f(cx) + ',' + f(tipY) + ' Z';
        cy = top + L * 0.32;
      }
      var fill = fills[i % 2];
      s += '<path d="' + d + '" fill="' + fill + '" stroke="' + pal.dark + '" stroke-width="1"/>';
      s += '<path d="' + d + '" transform="translate(' + f(cx) + ',' + f(cy) + ') scale(.72) translate(' + f(-cx) + ',' + f(-cy) + ')" fill="none" stroke="' + (fill === pal.alt ? pal.main : pal.alt) + '" stroke-width="1.3" stroke-dasharray="3 2.5" vector-effect="non-scaling-stroke"/>';
      if (a.shape === 'leaf') s += '<line x1="' + f(cx) + '" y1="' + (top + 4) + '" x2="' + f(cx) + '" y2="' + f(tipY - 8) + '" stroke="' + pal.dark + '" stroke-width=".8" opacity=".6"/>';
      if (a.big) {
        s += '<circle cx="' + f(cx) + '" cy="' + f(cy + 8) + '" r="7" fill="none" stroke="' + pal.main + '" stroke-width="2.4"/>';
      }
      s += '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="3.2" fill="url(#' + g + ')" stroke="' + pal.dark + '" stroke-width=".6"/>';
      if (a.tassels) s += tassel(cx, tipY, 30 + r() * 6, i % 2 ? pal.main : pal.trim, pal.dark);
      else if (a.bells && !a.strings) s += bell(cx, tipY, 4.4, g, m.lo);
      else s += bead(cx, tipY + 3, 2.8, pal.main, pal.dark);
    }
    // band last so it covers flap tops
    s += '<rect x="6" y="36" width="188" height="24" rx="3" fill="' + pal.main + '" stroke="' + pal.dark + '" stroke-width="1"/>';
    s += '<rect x="10" y="40" width="180" height="16" rx="2" fill="none" stroke="' + pal.alt + '" stroke-width="1.2" stroke-dasharray="4 3"/>';
    for (var n = 0; n < 8; n++) {
      var mx = 18 + n * 23.4;
      s += '<circle cx="' + f(mx) + '" cy="48" r="3.4" fill="url(#' + g + ')" stroke="' + pal.alt + '" stroke-width="1"/>';
      if (n < 7) s += '<path d="M' + f(mx + 11.7) + ',44 l3,4 l-3,4 l-3,-4 Z" fill="' + pal.trim + '"/>';
    }
    return s + '</g>';
  }

  function hanging(a, pal, m, g, r) {
    var s = '', cx = 100, bottom;
    s += '<circle cx="100" cy="12" r="6.5" fill="none" stroke="url(#' + g + ')" stroke-width="3"/>';
    s += '<line x1="100" y1="18.5" x2="100" y2="40" stroke="' + pal.dark + '" stroke-width="1.4"/>';
    if (a.motif === 'mandala' || a.motif === 'sun') {
      var cy = 74;
      if (a.motif === 'sun') {
        for (var i = 0; i < 16; i++) {
          var t = i / 16 * Math.PI * 2, t1 = t - 0.16, t2 = t + 0.16;
          s += '<path d="M' + f(cx + Math.cos(t1) * 18) + ',' + f(cy + Math.sin(t1) * 18) + ' L' + f(cx + Math.cos(t) * 36) + ',' + f(cy + Math.sin(t) * 36) +
            ' L' + f(cx + Math.cos(t2) * 18) + ',' + f(cy + Math.sin(t2) * 18) + ' Z" fill="' + (i % 2 ? pal.trim : pal.main) + '" stroke="' + pal.dark + '" stroke-width=".6"/>';
        }
        s += '<circle cx="100" cy="' + cy + '" r="19" fill="' + pal.alt + '" stroke="' + pal.dark + '" stroke-width="1"/>';
        s += '<circle cx="100" cy="' + cy + '" r="13" fill="url(#' + g + ')" stroke="' + pal.main + '" stroke-width="1.5"/>';
        s += '<circle cx="100" cy="' + cy + '" r="16" fill="none" stroke="' + pal.main + '" stroke-width="1" stroke-dasharray="2.5 2"/>';
        bottom = cy + 30;
      } else {
        s += '<circle cx="100" cy="' + cy + '" r="33" fill="' + pal.main + '" stroke="' + pal.dark + '" stroke-width="1.2"/>';
        s += '<circle cx="100" cy="' + cy + '" r="29" fill="none" stroke="' + pal.alt + '" stroke-width="1.2" stroke-dasharray="3 2.5"/>';
        for (var p = 0; p < 8; p++) {
          var ang = p * 45;
          s += '<ellipse cx="100" cy="' + (cy - 15) + '" rx="5.5" ry="10" fill="' + (p % 2 ? pal.alt : pal.trim) + '" stroke="' + pal.dark + '" stroke-width=".6" transform="rotate(' + ang + ' 100 ' + cy + ')"/>';
        }
        s += '<circle cx="100" cy="' + cy + '" r="7.5" fill="url(#' + g + ')" stroke="' + pal.alt + '" stroke-width="1.2"/>';
        bottom = cy + 33;
      }
    } else if (a.motif === 'rings') {
      s += '<circle cx="100" cy="62" r="21" fill="none" stroke="' + pal.main + '" stroke-width="7"/>';
      s += '<circle cx="100" cy="62" r="21" fill="none" stroke="' + pal.alt + '" stroke-width="7" stroke-dasharray="1.2 2.6" opacity=".7"/>';
      s += '<circle cx="100" cy="100" r="15" fill="none" stroke="' + pal.trim + '" stroke-width="6"/>';
      s += '<circle cx="100" cy="100" r="15" fill="none" stroke="' + pal.dark + '" stroke-width="6" stroke-dasharray="1.2 2.6" opacity=".35"/>';
      s += '<circle cx="100" cy="84" r="3.5" fill="' + pal.dark + '"/>';
      bottom = 115;
    } else if (a.motif === 'bells') {
      s += '<rect x="56" y="40" width="88" height="7" rx="3.5" fill="' + pal.dark + '"/>';
      s += '<rect x="56" y="40" width="88" height="7" rx="3.5" fill="none" stroke="' + pal.trim + '" stroke-width="1" stroke-dasharray="3 3"/>';
      bottom = 47;
    } else if (a.motif === 'tassels') {
      s += '<ellipse cx="100" cy="56" rx="15" ry="16" fill="' + pal.dark + '"/>';
      s += '<path d="M88,50 Q100,45 112,50 M86,58 Q100,53 114,58 M88,65 Q100,61 112,65" stroke="' + pal.trim + '" stroke-width="1.2" fill="none"/>';
      bottom = 70;
    } else { // diamond
      s += '<path d="M100,40 L140,82 L100,124 L60,82 Z" fill="' + pal.main + '" stroke="' + pal.dark + '" stroke-width="1.2"/>';
      for (var yy = 48; yy <= 116; yy += 7) {
        var half = 40 - Math.abs(yy - 82) * (40 / 42) - 5;
        for (var xx = -half; xx <= half; xx += 7) s += '<circle cx="' + f(100 + xx) + '" cy="' + yy + '" r="2" fill="' + ((Math.round(xx / 7) + yy / 7) % 2 ? pal.trim : pal.alt) + '"/>';
      }
      bottom = 124;
    }
    var n = a.strands, spread = a.motif === 'bells' ? 40 : 30;
    for (var k = 0; k < n; k++) {
      var tt = n === 1 ? 0.5 : k / (n - 1);
      var x = cx - spread + tt * spread * 2;
      var len = 186 - bottom - Math.abs(tt - 0.5) * 34 - 8;
      var y1 = bottom + len;
      if (a.motif === 'bells') {
        s += '<line x1="' + f(x) + '" y1="' + bottom + '" x2="' + f(x) + '" y2="' + f(y1) + '" stroke="' + pal.dark + '" stroke-width="1"/>';
        for (var b = 0, by = bottom + 14; by < y1; by += 24, b++) s += bell(x, by, 6 - b * 0.9, g, m.lo);
      } else if (a.motif === 'tassels' || a.motif === 'sun') {
        var tl = a.motif === 'sun' ? 40 : 56;
        s += strand(x, bottom, bottom + (len - tl) * 0.5, pal.trim, pal.dark, 7, '');
        s += tassel(x, bottom + (len - tl) * 0.5, tl, k % 2 ? pal.trim : pal.main, pal.dark);
      } else {
        s += strand(x, bottom, y1, k % 2 ? pal.trim : pal.alt, pal.dark, 6.5, bell(x, y1, 4, g, m.lo));
      }
    }
    return s;
  }

  function quad(p0, c, p1, t) {
    var u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
  }

  function garland(a, pal, m, g, r) {
    var s = '', cols = [pal.main, pal.trim, pal.alt];
    if (a.style === 'latkan') {
      s += '<path d="M6,30 Q100,46 194,30" stroke="' + pal.dark + '" stroke-width="2" fill="none"/>';
      var lens = [62, 96, 128, 148, 128, 96, 62];
      for (var i = 0; i < 7; i++) {
        var x = 20 + i * 26.6, y0 = 30 + 16 * (1 - Math.pow((x - 100) / 94, 2)) * 0.98;
        var y1 = y0 + lens[i] - 30;
        s += strand(x, y0, y1, cols[i % 3], pal.dark, 7, '');
        s += '<path d="M' + f(x - 5) + ',' + f(y1 + 8) + ' L' + f(x) + ',' + f(y1 - 2) + ' L' + f(x + 5) + ',' + f(y1 + 8) + ' Z" fill="url(#' + g + ')"/>';
        s += tassel(x, y1 + 8, 24, cols[(i + 1) % 3] === pal.alt ? pal.main : cols[(i + 1) % 3], pal.dark);
      }
      return s;
    }
    var n = a.swags || 2, span = 188 / n, depth = n === 1 ? 74 : n === 2 ? 52 : 40;
    for (var w = 0; w < n; w++) {
      var p0 = [6 + w * span, 34], p1 = [6 + (w + 1) * span, 34], c = [(p0[0] + p1[0]) / 2, 34 + depth * 2];
      s += '<path d="M' + p0[0] + ',' + p0[1] + ' Q' + c[0] + ',' + c[1] + ' ' + p1[0] + ',' + p1[1] + '" stroke="' + pal.dark + '" stroke-width="1.6" fill="none"/>';
      var items = n === 1 ? 11 : n === 2 ? 7 : 5;
      for (var j = 1; j < items; j++) {
        var q = quad(p0, c, p1, j / items), col = cols[(j + w) % 3];
        if (a.style === 'pompom') {
          var pr = n === 1 ? 8 : 7;
          s += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + pr + '" fill="' + col + '" stroke="' + col + '" stroke-width="3" stroke-dasharray="1 1.6"/>';
          s += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="' + (pr + 1.4) + '" fill="none" stroke="' + pal.dark + '" stroke-width=".5" opacity=".35"/>';
          if (n === 1 && j % 2 === 0) s += tassel(q[0], q[1] + pr + 1, 22, pal.main === col ? pal.trim : pal.main, pal.dark);
        } else if (a.style === 'leaf') {
          var rot = (j % 2 ? 1 : -1) * 35 + 90;
          s += '<g transform="translate(' + f(q[0]) + ',' + f(q[1]) + ') rotate(' + rot + ')"><path d="M0,0 C6,-6 16,-5 22,0 C16,5 6,6 0,0 Z" fill="' + (j % 2 ? pal.main : pal.trim) + '" stroke="' + pal.dark + '" stroke-width=".6"/><line x1="1" y1="0" x2="19" y2="0" stroke="' + pal.alt + '" stroke-width=".7"/></g>';
          s += bead(q[0], q[1], 3, pal.alt, pal.dark);
        } else if (a.style === 'bell') {
          s += '<circle cx="' + f(q[0]) + '" cy="' + f(q[1]) + '" r="3" fill="' + pal.main + '"/>';
          s += '<line x1="' + f(q[0]) + '" y1="' + f(q[1]) + '" x2="' + f(q[0]) + '" y2="' + f(q[1] + 10) + '" stroke="' + pal.dark + '" stroke-width="1"/>' + bell(q[0], q[1] + 10, 5.5, g, m.lo);
        } else { // bunting
          var bw = 9;
          s += '<path d="M' + f(q[0] - bw) + ',' + f(q[1]) + ' L' + f(q[0] + bw) + ',' + f(q[1]) + ' L' + f(q[0]) + ',' + f(q[1] + 26) + ' Z" fill="' + col + '" stroke="' + pal.dark + '" stroke-width=".8"/>';
          s += '<path d="M' + f(q[0] - bw + 3.5) + ',' + f(q[1] + 2.5) + ' L' + f(q[0] + bw - 3.5) + ',' + f(q[1] + 2.5) + ' L' + f(q[0]) + ',' + f(q[1] + 19) + ' Z" fill="none" stroke="' + (col === pal.alt ? pal.main : pal.alt) + '" stroke-width="1" stroke-dasharray="2 1.8"/>';
          s += tassel(q[0], q[1] + 27, 12, pal.dark === col ? pal.trim : pal.dark, pal.dark);
        }
      }
    }
    for (var e = 0; e <= n; e++) {
      var ax = 6 + e * span;
      s += '<circle cx="' + f(ax) + '" cy="34" r="3.5" fill="' + pal.dark + '"/>';
      if (e > 0 && e < n) s += tassel(ax, 36, 40, pal.main, pal.dark);
    }
    return '<g transform="translate(0,' + (n === 1 ? 6 : 26) + ')">' + s + '</g>';
  }

  // ---- jewelry ----------------------------------------------------------
  function flower(cx, cy, rr, g, lo, beadCol, lotus) {
    var s = '';
    for (var i = 0; i < 6; i++) {
      var t = i / 6 * Math.PI * 2 - Math.PI / 2;
      if (lotus) s += '<ellipse cx="' + f(cx) + '" cy="' + f(cy - rr) + '" rx="' + f(rr * 0.45) + '" ry="' + f(rr) + '" fill="url(#' + g + ')" stroke="' + lo + '" stroke-width=".5" transform="rotate(' + (i * 60) + ' ' + f(cx) + ' ' + f(cy) + ')"/>';
      else s += '<circle cx="' + f(cx + Math.cos(t) * rr) + '" cy="' + f(cy + Math.sin(t) * rr) + '" r="' + f(rr * 0.75) + '" fill="url(#' + g + ')" stroke="' + lo + '" stroke-width=".5"/>';
    }
    return s + bead(cx, cy, rr * 0.6, beadCol, lo);
  }

  function jhumka(a, pal, m, g) {
    var s = '';
    [58, 142].forEach(function (cx) {
      s += flower(cx, 36, 6, g, m.lo, pal.bead, a.lotus);
      s += '<line x1="' + cx + '" y1="44" x2="' + cx + '" y2="62" stroke="url(#' + g + ')" stroke-width="2.5"/><circle cx="' + cx + '" cy="53" r="3" fill="none" stroke="' + m.base + '" stroke-width="1.5"/>';
      s += '<path d="M' + (cx - 27) + ',114 C' + (cx - 27) + ',84 ' + (cx - 14) + ',64 ' + cx + ',64 C' + (cx + 14) + ',64 ' + (cx + 27) + ',84 ' + (cx + 27) + ',114 Z" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".8"/>';
      s += '<path d="M' + (cx - 19) + ',104 C' + (cx - 18) + ',84 ' + (cx - 9) + ',72 ' + cx + ',72 C' + (cx + 9) + ',72 ' + (cx + 18) + ',84 ' + (cx + 19) + ',104" fill="none" stroke="' + m.hi + '" stroke-width="1" stroke-dasharray="1.5 2.5" opacity=".9"/>';
      s += '<path d="M' + (cx - 11) + ',96 Q' + cx + ',84 ' + (cx + 11) + ',96" fill="none" stroke="' + m.lo + '" stroke-width="1"/>';
      s += bead(cx, 88, 3.4, pal.bead, m.lo);
      s += '<circle cx="' + cx + '" cy="62" r="4" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".6"/>';
      s += '<rect x="' + (cx - 29) + '" y="111" width="58" height="7" rx="3.5" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".6"/>';
      for (var i = -4; i <= 4; i++) s += '<circle cx="' + f(cx + i * 6) + '" cy="114.5" r="1.4" fill="' + m.hi + '"/>';
      for (var j = -4; j <= 4; j++) {
        var x = cx + j * 6.2, len = 14 + (4 - Math.abs(j)) * 2.2;
        s += '<line x1="' + f(x) + '" y1="118" x2="' + f(x) + '" y2="' + f(118 + len) + '" stroke="' + m.base + '" stroke-width="1"/>' +
          '<circle cx="' + f(x) + '" cy="' + f(118 + len * 0.45) + '" r="1.5" fill="' + m.base + '"/>' + bead(x, 118 + len + 2.5, 3, pal.bead, m.lo);
      }
    });
    return '<g transform="translate(0,14)">' + s + '</g>';
  }

  function chandbali(a, pal, m, g) {
    var s = '';
    [58, 142].forEach(function (cx) {
      var cy = 82, R = 31, ri = 37, ic = cy - Math.sqrt(ri * ri - R * R);
      s += flower(cx, 30, 5.5, g, m.lo, pal.bead, false);
      s += '<line x1="' + cx + '" y1="37" x2="' + cx + '" y2="56" stroke="url(#' + g + ')" stroke-width="2.4"/>';
      s += '<path d="M' + (cx - 12) + ',' + (cy - 2) + ' C' + (cx - 12) + ',' + (cy - 16) + ' ' + (cx - 6) + ',' + (cy - 24) + ' ' + cx + ',' + (cy - 24) + ' C' + (cx + 6) + ',' + (cy - 24) + ' ' + (cx + 12) + ',' + (cy - 16) + ' ' + (cx + 12) + ',' + (cy - 2) + ' Z" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".6"/>';
      // outer bead fringe
      for (var i = 0; i <= 12; i++) {
        var t = (12 + i * (156 / 12)) * Math.PI / 180;
        s += bead(cx + Math.cos(t) * (R + 4.5), cy + Math.sin(t) * (R + 4.5), 2.8, pal.bead, m.lo);
      }
      s += '<path d="M' + (cx - R) + ',' + cy + ' A' + R + ' ' + R + ' 0 0 0 ' + (cx + R) + ',' + cy + ' A' + ri + ' ' + ri + ' 0 0 1 ' + (cx - R) + ',' + cy + ' Z" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".8"/>';
      for (var k = 1; k < 10; k++) {
        var x = cx - R + k * (2 * R / 10), dx = x - cx;
        var yo = cy + Math.sqrt(R * R - dx * dx), yi = ic + Math.sqrt(ri * ri - dx * dx), ym = (yo + yi) / 2;
        s += a.filigree
          ? '<circle cx="' + f(x) + '" cy="' + f(ym) + '" r="' + f(Math.max(1.4, (yo - yi) * 0.3)) + '" fill="none" stroke="' + m.lo + '" stroke-width=".9"/>'
          : '<circle cx="' + f(x) + '" cy="' + f(ym) + '" r="1.3" fill="' + m.hi + '"/>';
      }
      s += '<path d="M' + cx + ',' + (cy + R + 9) + ' c-4,6 -4,11 0,13 c4,-2 4,-7 0,-13 Z" fill="' + pal.bead + '" stroke="' + m.lo + '" stroke-width=".6"/>';
    });
    return '<g transform="translate(0,20)">' + s + '</g>';
  }

  function hoops(a, pal, m, g) {
    var s = '';
    [60, 140].forEach(function (cx) {
      var cy = 96, R = 32;
      s += '<path d="M' + cx + ',' + (cy - R) + ' l0,-10" stroke="' + m.base + '" stroke-width="2"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="url(#' + g + ')" stroke-width="5.5"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="' + m.hi + '" stroke-width="1" stroke-dasharray="1 5" opacity=".9"/>';
      if (a.fringe) {
        for (var i = 0; i <= 10; i++) {
          var t = (20 + i * 14) * Math.PI / 180;
          s += bead(cx + Math.cos(t) * (R + 5), cy + Math.sin(t) * (R + 5), 2.9, pal.bead, m.lo);
        }
      } else {
        [-11, 0, 11].forEach(function (dx, j) {
          var by = cy + Math.sqrt(R * R - dx * dx), len = j === 1 ? 16 : 10;
          s += '<line x1="' + (cx + dx) + '" y1="' + f(by) + '" x2="' + (cx + dx) + '" y2="' + f(by + len) + '" stroke="' + m.base + '" stroke-width="1"/>' + bead(cx + dx, by + len + 3, 3.6, pal.bead, m.lo);
        });
      }
    });
    return s;
  }

  function cubic(p, t) {
    var u = 1 - t;
    return [u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6],
            u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]];
  }

  function necklace(a, pal, m, g) {
    var c = [26, 24, 36, 128, 164, 128, 174, 24], s = '';
    var d = 'M26,24 C36,128 164,128 174,24';
    var pend = '';
    for (var i = 0; i < 11; i++) {
      var t = 0.14 + i * 0.072, q = cubic(c, t), w = 1 - Math.abs(t - 0.5) * 2.4;
      if (a.style === 'coin') {
        var r = 6 + w * 5 + (i === 5 ? 3 : 0);
        pend += '<line x1="' + f(q[0]) + '" y1="' + f(q[1]) + '" x2="' + f(q[0]) + '" y2="' + f(q[1] + 4) + '" stroke="' + m.base + '" stroke-width="1.2"/>' +
          '<circle cx="' + f(q[0]) + '" cy="' + f(q[1] + 4 + r) + '" r="' + f(r) + '" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".7"/>' +
          '<circle cx="' + f(q[0]) + '" cy="' + f(q[1] + 4 + r) + '" r="' + f(r * 0.62) + '" fill="none" stroke="' + m.lo + '" stroke-width=".7"/>' +
          (i % 2 === 1 || i === 5 ? bead(q[0], q[1] + 4 + r, Math.max(1.4, r * 0.28), pal.bead) : '');
      } else {
        var h = 9 + w * 10 + (i === 5 ? 10 : 0), x = q[0], y = q[1] + 2;
        pend += '<path d="M' + f(x) + ',' + f(y) + ' C' + f(x + h * 0.5) + ',' + f(y + h * 0.5) + ' ' + f(x + h * 0.42) + ',' + f(y + h) + ' ' + f(x) + ',' + f(y + h) +
          ' C' + f(x - h * 0.42) + ',' + f(y + h) + ' ' + f(x - h * 0.5) + ',' + f(y + h * 0.5) + ' ' + f(x) + ',' + f(y) + ' Z" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".7"/>' +
          bead(x, y + h * 0.66, Math.max(1.6, h * 0.17), pal.bead, m.lo);
      }
    }
    s += '<path d="' + d + '" fill="none" stroke="' + m.lo + '" stroke-width="9" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="url(#' + g + ')" stroke-width="7" stroke-linecap="round"/>';
    s += '<path d="' + d + '" fill="none" stroke="' + m.hi + '" stroke-width="1.6" stroke-dasharray="2 3" stroke-linecap="round"/>';
    s += pend;
    s += '<circle cx="26" cy="22" r="3" fill="' + m.base + '"/><circle cx="174" cy="22" r="3" fill="' + m.base + '"/>';
    return '<g transform="translate(0,' + (a.style === 'coin' ? 26 : 22) + ')">' + s + '</g>';
  }

  function bangle(a, pal, m, g) {
    var s = '', count = a.count || 1;
    for (var b = 0; b < count; b++) {
      var cy = count === 1 ? 100 : 86 + b * 30, extra = a.style === 'dots' ? ' pathLength="100" stroke-dasharray="90 10" stroke-dashoffset="-5"' : '';
      s += '<ellipse cx="100" cy="' + cy + '" rx="72" ry="33" fill="none" stroke="' + m.lo + '" stroke-width="15"' + extra + '/>';
      s += '<ellipse cx="100" cy="' + cy + '" rx="72" ry="33" fill="none" stroke="url(#' + g + ')" stroke-width="13"' + extra + '/>';
      if (a.style === 'rope') {
        s += '<ellipse cx="100" cy="' + cy + '" rx="72" ry="33" fill="none" stroke="' + m.lo + '" stroke-width="13" stroke-dasharray="3 4" opacity=".55"/>';
        s += '<ellipse cx="100" cy="' + (cy - 3) + '" rx="71" ry="31" fill="none" stroke="' + m.hi + '" stroke-width="1.6" stroke-dasharray="3 4"/>';
      } else {
        s += '<ellipse cx="100" cy="' + (cy - 3) + '" rx="71" ry="31" fill="none" stroke="' + m.hi + '" stroke-width="1.4"' + extra + '/>';
        for (var i = 0; i < 28; i++) {
          var t = i / 28 * Math.PI * 2;
          if (Math.cos(t) > 0.93) continue;
          s += '<circle cx="' + f(100 + Math.cos(t) * 72) + '" cy="' + f(cy + Math.sin(t) * 33) + '" r="1.6" fill="' + m.lo + '"/>';
        }
        s += bead(100 + 72 * Math.cos(0.32), cy + 33 * Math.sin(0.32), 5.5, pal.bead, m.lo) + bead(100 + 72 * Math.cos(-0.32), cy + 33 * Math.sin(-0.32), 5.5, pal.bead, m.lo);
      }
    }
    return s;
  }

  function pendant(a, pal, m, g) {
    var s = '';
    s += '<path d="M38,10 Q66,92 100,104 M162,10 Q134,92 100,104" fill="none" stroke="' + m.base + '" stroke-width="2.4" stroke-dasharray=".5 3.2" stroke-linecap="round"/>';
    s += '<rect x="96" y="102" width="8" height="10" rx="3" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".6"/>';
    var cy = 144;
    if (a.style === 'sun') {
      for (var i = 0; i < 18; i++) {
        var t = i / 18 * Math.PI * 2, t1 = t - 0.13, t2 = t + 0.13;
        s += '<path d="M' + f(100 + Math.cos(t1) * 21) + ',' + f(cy + Math.sin(t1) * 21) + ' L' + f(100 + Math.cos(t) * (i % 2 ? 31 : 36)) + ',' + f(cy + Math.sin(t) * (i % 2 ? 31 : 36)) +
          ' L' + f(100 + Math.cos(t2) * 21) + ',' + f(cy + Math.sin(t2) * 21) + ' Z" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".5"/>';
      }
      s += '<circle cx="100" cy="' + cy + '" r="22" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".8"/>';
      s += '<circle cx="100" cy="' + cy + '" r="16" fill="none" stroke="' + m.lo + '" stroke-width=".8" stroke-dasharray="1.5 2"/>';
      s += bead(100, cy, 6.5, pal.bead, m.lo);
    } else {
      s += '<circle cx="100" cy="' + cy + '" r="30" fill="url(#' + g + ')" stroke="' + m.lo + '" stroke-width=".8"/>';
      for (var k = 0; k < 30; k++) {
        var tk = k / 30 * Math.PI * 2;
        s += '<circle cx="' + f(100 + Math.cos(tk) * 26) + '" cy="' + f(cy + Math.sin(tk) * 26) + '" r="1.5" fill="' + m.hi + '"/>';
      }
      s += '<circle cx="100" cy="' + cy + '" r="19" fill="none" stroke="' + m.lo + '" stroke-width="1"/>';
      for (var p = 0; p < 5; p++) s += '<ellipse cx="100" cy="' + (cy - 7) + '" rx="3.4" ry="6.5" fill="none" stroke="' + m.lo + '" stroke-width="1" transform="rotate(' + (p * 72) + ' 100 ' + cy + ')"/>';
      s += bead(100, cy, 3.2, pal.bead, m.lo);
    }
    return s;
  }

  var DRAW = { toran: toran, hanging: hanging, garland: garland, jhumka: jhumka, chandbali: chandbali, hoops: hoops, necklace: necklace, bangle: bangle, pendant: pendant };
  UOR.ART_TYPES = Object.keys(DRAW); // the admin page offers these

  UOR.art = function (product, palKey, cls) {
    var key = palKey || product.colors[0];
    if (product.image) {
      // photos uploaded from the admin page come as name@1600.webp plus a name@600.webp copy
      var set = /@1600\.webp$/.test(product.image)
        ? ' srcset="' + product.image.replace(/@1600\.webp$/, '@600.webp') + ' 600w, ' + product.image + ' 1600w" sizes="(max-width: 700px) 60vw, 480px"' : '';
      return '<img class="art ' + (cls || '') + '" src="' + product.image + '"' + set + ' alt="" draggable="false" loading="lazy" decoding="async">';
    }
    var pal = UOR.palettes[key], m = UOR.metals[pal.metal], g = 'g' + (++uid);
    var body = DRAW[product.art.type](product.art, pal, m, g, rng(product.id));
    return '<svg class="art ' + (cls || '') + '" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><defs>' + grad(g, m) + '</defs>' + body + '</svg>';
  };

  UOR.swatch = function (key) {
    var pal = UOR.palettes[key];
    if (pal.bead) return 'linear-gradient(135deg,' + UOR.metals[pal.metal].base + ' 0 58%,' + pal.bead + ' 58% 100%)';
    return 'linear-gradient(135deg,' + pal.main + ' 0 58%,' + pal.alt + ' 58% 100%)';
  };
})();
