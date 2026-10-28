/* Under One Roof — the product page gallery and its "peel and place" transition.
   The picture on the stage peels away like a photo lifted off the page while the next one is
   put down, settles, and is taped in place; a short red stitch runs across as they change hands.
   Only transform and opacity are animated (plus the stitch's dash), every move can be
   interrupted, and calm mode / "reduce motion" gets a plain 200ms cross-fade. */
window.UOR = window.UOR || {};
UOR.gallery = function (o) {
  // o: { stage, jelly, thumbs, dots, live, name, onChange(slide, i) }
  var t = UOR.t, stage = o.stage, jelly = o.jelly;
  var slides = [], cur = -1, curEl = null, moving = [], drag = null;
  var EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)', EASE_PEEL = 'cubic-bezier(.45, 0, .2, 1)';
  function calm() { return UOR.reduced ? UOR.reduced() : false; }

  // ---- the stage's extra layers: contact shadow, tape, the stitch
  stage.insertAdjacentHTML('afterbegin', '<span class="pd-shadow" aria-hidden="true"></span>');
  stage.insertAdjacentHTML('beforeend',
    '<span class="pd-tape" aria-hidden="true"></span>' +
    '<svg class="pd-stitch" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
    '<defs><mask id="stitch-m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="420" height="80">' +
    '<path class="stitch-reveal" d="M -4 34 C 60 6, 120 54, 200 30 S 340 8, 404 28" pathLength="1" fill="none" stroke="#fff" stroke-width="12"/></mask></defs>' +
    '<path d="M -4 34 C 60 6, 120 54, 200 30 S 340 8, 404 28" fill="none" stroke="#A3341F" stroke-width="2.6" stroke-dasharray="11 7" stroke-linecap="round" mask="url(#stitch-m)"/></svg>');
  var shadow = stage.querySelector('.pd-shadow'), tape = stage.querySelector('.pd-tape');
  var stitch = stage.querySelector('.pd-stitch'), reveal = stage.querySelector('.stitch-reveal');

  function slideEl(s) {
    var el = document.createElement('div');
    el.className = 'pd-slide';
    el.innerHTML = s.html();
    return el;
  }
  // where a photo's visible part starts, as a fraction of its height (0 for opaque photos, or
  // when the image can't be read back)
  function firstSolidRow(img) {
    if (img._solidTop != null) return img._solidTop;
    try {
      var N = 64, c = document.createElement('canvas'); c.width = c.height = N;
      var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, N, N);
      var d = g.getImageData(0, 0, N, N).data;
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) return (img._solidTop = y / N);
    } catch (e) { /* not readable */ }
    return (img._solidTop = 0);
  }
  // stick the tape on the picture's real top edge (pieces sit at different heights in the square)
  function placeTape(el) {
    var art = el.querySelector('.art'); if (!art) return;
    var w = el.clientWidth, h = el.clientHeight, top = 0;
    try {
      if (art.tagName.toLowerCase() === 'svg') {
        var vb = art.viewBox.baseVal, bb = art.getBBox(), sc = Math.min(w / vb.width, h / vb.height);
        top = (h - vb.height * sc) / 2 + (bb.y - vb.y) * sc;
      } else if (art.naturalWidth) {
        var s2 = Math.min(w / art.naturalWidth, h / art.naturalHeight);
        top = (h - art.naturalHeight * s2) / 2 + firstSolidRow(art) * art.naturalHeight * s2; // skip a cut-out's see-through top
      } else { art.addEventListener('load', function () { if (el === curEl) placeTape(el); }, { once: true }); return; }
    } catch (e) { return; }
    tape.style.top = Math.max(0, top - 8) + 'px';
  }
  function preload(i) {
    var s = slides[(i + slides.length) % slides.length];
    if (s && s.url && !s.loaded) { var im = new Image(); im.decoding = 'async'; im.src = s.url; s.loaded = true; }
  }
  function announce() {
    var s = slides[cur];
    o.live.textContent = t('pd.picOf', { n: cur + 1, total: slides.length }) + (s.alt ? ': ' + s.alt : '');
  }

  // ---- thumbnails (taped polaroids) and phone dots
  function paintThumbs() {
    var many = slides.length > 1;
    o.thumbs.hidden = o.dots.hidden = !many;
    stage.tabIndex = many ? 0 : -1;
    if (many) { stage.setAttribute('role', 'group'); stage.setAttribute('aria-roledescription', t('pd.galleryRole')); stage.setAttribute('aria-label', t('pd.gallery', { name: o.name })); }
    o.thumbs.innerHTML = slides.map(function (s, i) {
      return '<button type="button" class="pd-thumb" data-i="' + i + '" style="--r:' + [-3, 2.5, -1.5, 3, -2.5, 1.5][i % 6] + 'deg" aria-label="' +
        UOR.esc(t('pd.picOf', { n: i + 1, total: slides.length }) + (s.alt ? ': ' + s.alt : '')) + '"><span class="pd-thumb-win" style="--bg:' + (s.bg || 'var(--aged)') + '">' + s.thumb() + '</span></button>';
    }).join('');
    o.dots.innerHTML = slides.map(function () { return '<i></i>'; }).join('');
    mark();
  }
  function mark() {
    [].forEach.call(o.thumbs.children, function (b, i) {
      b.classList.toggle('on', i === cur);
      if (i === cur) {
        b.setAttribute('aria-current', 'true');
        // keep the active polaroid in view when the row scrolls (phones), without moving the page
        var row = o.thumbs, l = b.offsetLeft - row.offsetLeft, r = l + b.offsetWidth;
        if (l < row.scrollLeft || r > row.scrollLeft + row.clientWidth) row.scrollTo({ left: l - row.clientWidth / 2 + b.offsetWidth / 2, behavior: calm() ? 'auto' : 'smooth' });
      } else b.removeAttribute('aria-current');
    });
    [].forEach.call(o.dots.children, function (d, i) { d.classList.toggle('on', i === cur); });
  }

  // ---- the transition ---------------------------------------------------
  function stopMoving() {
    // anything still in flight: the leaving picture is dropped, the arriving one is frozen where
    // it is (so the next move starts from exactly what's on screen: no jump, no flash)
    moving.forEach(function (m) {
      if (m.leaving) { m.anim.cancel(); m.el.remove(); }
      else { try { m.anim.commitStyles(); } catch (e) { /* element already gone */ } m.anim.cancel(); }
    });
    moving = [];
  }
  function show(i, how) {
    how = how || {};
    i = (i + slides.length) % slides.length;
    if (i === cur && !how.force) return;
    var dir = how.dir || (i > cur ? 1 : -1), prev = curEl, first = cur < 0;
    stopMoving();
    cur = i; curEl = slideEl(slides[i]);
    jelly.appendChild(curEl);
    placeTape(curEl);
    mark(); if (!first) announce();
    preload(i + 1); preload(i - 1);
    if (o.onChange && !how.silent) o.onChange(slides[i], i);
    if (first || how.instant || !prev || !curEl.animate) { if (prev && prev !== curEl) prev.remove(); return; }

    if (calm()) { // a plain cross-fade
      var fi = curEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' });
      var fo = prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear', fill: 'forwards' });
      moving.push({ el: curEl, anim: fi }, { el: prev, anim: fo, leaving: true });
      fo.onfinish = function () { prev.remove(); };
      return;
    }

    // the leaving picture peels up from its bottom edge (the tape holds the top) and slides away
    var start = prev.style.transform || 'none', startOp = prev.style.opacity || 1;
    prev.style.transformOrigin = '50% 4%';
    var out = prev.animate([
      { transform: start, opacity: startOp },
      { transform: 'perspective(1100px) translate3d(' + dir * 6 + '%, -2%, 0) rotateX(16deg) rotateZ(' + dir * 2.5 + 'deg) scale(.985)', opacity: 1, offset: .3 },
      { transform: 'perspective(1100px) translate3d(' + dir * 58 + '%, -7%, 0) rotateX(46deg) rotateY(' + (-dir * 16) + 'deg) rotateZ(' + dir * 10 + 'deg) scale(.9)', opacity: 0 }
    ], { duration: 640, easing: EASE_PEEL, fill: 'forwards' });
    out.onfinish = function () { prev.remove(); };
    moving.push({ el: prev, anim: out, leaving: true });

    // the arriving picture is put down: from a polaroid in the row, or dropped in from above
    var frames;
    if (how.from) {
      var r = how.from.getBoundingClientRect(), s = jelly.getBoundingClientRect();
      var dx = r.left + r.width / 2 - (s.left + s.width / 2), dy = r.top + r.height / 2 - (s.top + s.height / 2), sc = Math.max(.08, r.width / s.width);
      var tilt = parseFloat(getComputedStyle(how.from).getPropertyValue('--r')) || 0;
      frames = [
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sc + ') rotate(' + tilt + 'deg)', opacity: 1 },
        { transform: 'translate(0, -1.5%) scale(1.015) rotate(' + dir * .6 + 'deg)', opacity: 1, offset: .72 },
        { transform: 'none', opacity: 1 }
      ];
    } else {
      frames = [
        { transform: 'translate3d(' + (-dir * 7) + '%, -11%, 0) rotate(' + (-dir * 5) + 'deg) scale(1.05)', opacity: 0 },
        { transform: 'translate3d(0, 1.2%, 0) rotate(' + dir * .8 + 'deg) scale(1)', opacity: 1, offset: .58 },
        { transform: 'translate3d(0, -.4%, 0) rotate(' + (-dir * .3) + 'deg)', opacity: 1, offset: .8 },
        { transform: 'none', opacity: 1 }
      ];
    }
    var inn = curEl.animate(frames, { duration: how.from ? 680 : 720, delay: how.from ? 0 : 70, easing: EASE_OUT, fill: 'backwards' });
    var arrived = curEl;
    inn.onfinish = function () { arrived.style.transform = ''; arrived.style.opacity = ''; };
    moving.push({ el: curEl, anim: inn });

    // its shadow tightens as it lands; the tape sticks down; the stitch runs across
    shadow.animate([{ transform: 'scale(1.35)', opacity: .35 }, { transform: 'scale(1)', opacity: 1 }], { duration: 640, delay: 120, easing: EASE_OUT, fill: 'backwards' });
    tape.animate([{ transform: 'translateX(-50%) rotate(-3deg) scaleX(.2)', opacity: 0 }, { transform: 'translateX(-50%) rotate(-3deg) scaleX(1.06)', opacity: .9, offset: .7 }, { transform: 'translateX(-50%) rotate(-3deg) scaleX(1)', opacity: .85 }],
      { duration: 280, delay: 520, easing: EASE_OUT, fill: 'backwards' });
    reveal.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 400, delay: 60, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'both' });
    stitch.animate([{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: 760, delay: 60, easing: 'linear', fill: 'both' });
  }

  // ---- ways to move: polaroids, keys, swipes
  o.thumbs.addEventListener('click', function (e) {
    var b = e.target.closest('.pd-thumb'); if (!b) return;
    var i = +b.dataset.i; if (i === cur) return;
    show(i, { from: calm() ? null : b.querySelector('.pd-thumb-win'), dir: i > cur ? 1 : -1 });
  });
  stage.addEventListener('keydown', function (e) {
    if (slides.length < 2 || e.target !== stage) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, { dir: 1 }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, { dir: -1 }); }
  });
  // touch: the picture follows the finger, then goes to the next one or springs back
  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' || slides.length < 2) return;
    stopMoving();
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, id: e.pointerId, horiz: null };
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.horiz === null && Math.abs(dx) + Math.abs(dy) > 8) drag.horiz = Math.abs(dx) > Math.abs(dy);
    if (!drag.horiz) return;
    drag.dx = dx;
    curEl.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx * .025) + 'deg)';
  });
  function release(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag; drag = null;
    if (!d.horiz) return;
    o.suppressClick = performance.now() + 150; // a swipe is not a tap on the picture
    var v = d.dx / Math.max(1, performance.now() - d.t);
    // a long drag, or a quick flick that still travelled a little way
    if (Math.abs(d.dx) > 56 || (Math.abs(v) > .45 && Math.abs(d.dx) > 32)) show(cur + (d.dx < 0 ? 1 : -1), { dir: d.dx < 0 ? 1 : -1 });
    else if (curEl.animate) {
      var back = curEl.animate([{ transform: curEl.style.transform }, { transform: 'none' }], { duration: 320, easing: EASE_OUT });
      curEl.style.transform = '';
      moving.push({ el: curEl, anim: back });
    } else curEl.style.transform = '';
  }
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);

  return {
    set: function (list, keepIndex) { // (re)load the pictures; keeps the one on screen when it can
      slides = list;
      var i = Math.min(Math.max(0, keepIndex || 0), slides.length - 1);
      cur = -1;
      if (curEl) curEl.remove();
      jelly.querySelectorAll('.pd-slide').forEach(function (el) { el.remove(); });
      curEl = null;
      paintThumbs();
      show(i, { instant: true, silent: true });
    },
    go: function (i, how) { show(i, how); },
    index: function () { return cur; },
    find: function (fn) { for (var i = 0; i < slides.length; i++) if (fn(slides[i])) return i; return -1; },
    swiped: function () { return (o.suppressClick || 0) > performance.now(); }
  };
};
