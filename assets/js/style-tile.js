/* style.html — fills the style tile with real pieces from the bundled catalog and wires the
   demos (paint chips, heart stitch, fly-to-wishlist, page turn, card → poster transition). */
(function () {
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rnd = UOR.seeded('paper-atelier');

  // ---- botanical sprigs: line-drawn mango leaves and a marigold
  function leaf(x, y, a, s) {
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + a + ') scale(' + s + ')"><path d="M0 0 C 14 -11, 42 -13, 66 0 C 42 13, 14 11, 0 0 Z" fill="rgba(94,107,58,.1)" stroke="currentColor" stroke-width="1.3"/><path d="M2 0 L 60 0" stroke="currentColor" stroke-width=".8" fill="none"/></g>';
  }
  var SPRIGS = {
    mango: '<path d="M110 296 C 104 230, 124 160, 104 18" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      leaf(108, 250, -150, 1.05) + leaf(110, 210, -30, 1) + leaf(112, 168, -152, .95) + leaf(114, 128, -28, .9) + leaf(110, 88, -148, .85) + leaf(106, 52, -40, .75) + leaf(104, 20, -95, .7),
    marigold: (function () {
      var g = '<path d="M80 300 C 82 250, 76 200, 80 150" fill="none" stroke="currentColor" stroke-width="1.4"/>' + leaf(80, 240, -150, .8) + leaf(80, 210, -30, .7);
      for (var k = 0; k < 16; k++) g += '<ellipse cx="80" cy="96" rx="9" ry="22" transform="rotate(' + (k * 22.5) + ' 80 118)" fill="rgba(176,141,87,.18)" stroke="#B08D57" stroke-width="1.1"/>';
      for (k = 0; k < 12; k++) g += '<ellipse cx="80" cy="106" rx="6" ry="13" transform="rotate(' + (k * 30 + 15) + ' 80 118)" fill="rgba(163,52,31,.12)" stroke="#A3341F" stroke-width=".9"/>';
      return g + '<circle cx="80" cy="118" r="7" fill="#B08D57" opacity=".7"/>';
    })()
  };
  $$('[data-sprig]').forEach(function (s) {
    var k = s.dataset.sprig;
    s.setAttribute('viewBox', k === 'mango' ? '0 0 220 300' : '0 0 160 300');
    s.innerHTML = SPRIGS[k];
  });

  // ---- cut-out art from the catalog
  $$('[data-art]').forEach(function (el) { var p = UOR.byId(el.dataset.art); if (p) el.innerHTML = UOR.art(p); });

  // ---- word strips: tones and type styles vary, seeded so they never change between visits
  var TONES = ['', 'aged', 'news', 'kraft', '', 'aged', 'ink', '', 'news', 'thread'];
  var TYPES = ['serif', 'type', 'caps', 'bold', '', 'serif', 'type', 'caps'];
  function strips(list, startTone) {
    return list.map(function (w, i) {
      var tone = TONES[(i * 7 + startTone) % TONES.length], type = TYPES[(i * 5 + startTone) % TYPES.length];
      return '<span class="strip place" data-tone="' + tone + '" data-type="' + type + '">' + esc(w) + '</span>';
    }).join('');
  }
  $('.strips-light').innerHTML = strips(['made slowly', 'stitched by hand', 'for your doorway', 'mirror & thread', 'a gift that stays', 'one bead at a time',
    'festival mornings', 'the sound of little bells', 'hand-cut leaves', 'welcome home', 'grandmother’s pattern', 'under one roof', 'thread, then patience', 'for the ones who notice'], 0);
  $('.strips-night').innerHTML = strips(['every doorway deserves a welcome', 'made slowly', 'no two alike', 'mirror catches morning light',
    'the knot you can’t see holds everything', 'cotton, felt & little bells', 'stitched for the festival', 'a garland for the threshold',
    'patterns older than the house', 'handed down, hung up', 'oxidised, on purpose', 'a little gold for the everyday', 'the thread remembers'], 3)
    .replace(/data-tone="(ink|thread)"/g, 'data-tone="aged"');

  // ---- postage-stamp shelf tiles
  $('.stamps').innerHTML = UOR.categories.map(function (c, i) {
    var p = UOR.byId(c.feature) || UOR.inCat(c.slug)[0];
    return '<a class="postage place" href="category.html?c=' + c.slug + '" style="--r:' + ((i % 2 ? 1 : -1) * (1 + i * .4)).toFixed(1) + 'deg">' +
      '<span class="tape ' + ['tc', 'tl t-gold', 'tr t-moss', 'tc t-plain', 'tl'][i] + '"></span>' +
      '<span class="postage-in" style="--bg:' + p.bg + '">' + UOR.art(p) + '<span class="postage-val">No. ' + c.no + '</span>' +
      '<span class="strip" data-type="serif" data-flat>' + esc(c.title + ' ' + c.accent) + '</span></span></a>';
  }).join('');

  // ---- film strip
  $('.film-track').innerHTML = UOR.products.slice(0, 14).map(function (p, i) {
    return '<a class="film-frame" href="product.html?id=' + p.id + '" style="--bg:' + p.bg + '" draggable="false">' + UOR.art(p) + '<span>' + String(i + 1).padStart(2, '0') + ' · ' + esc(p.name) + '</span></a>';
  }).join('');

  // ---- product poster
  var pp = UOR.byId('leaf-toran'), colour = pp.colors[0], wishN = 0;
  $('.p-name').textContent = pp.name;
  $('.p-mini').textContent = pp.mini.toLowerCase();
  $('.p-desc').textContent = pp.desc;
  function paintPoster() {
    $('.p-art').innerHTML = UOR.art(pp, colour);
    $('.p-colour').textContent = 'Colour · ' + UOR.palNameEn(colour);
    $$('.paint button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.k === colour); });
  }
  $('.paint').innerHTML = pp.colors.map(function (k) { return '<button type="button" role="radio" data-k="' + k + '" style="--c:' + UOR.swatch(k) + '" aria-label="' + esc(UOR.palNameEn(k)) + '"></button>'; }).join('');
  $('.paint').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { colour = b.dataset.k; paintPoster(); } });
  paintPoster();
  var cat = UOR.cat(pp.cat);
  var PILLS = [
    ['The piece', 'about', pp.desc, pp.bg, UOR.art(pp)],
    ['Colours', pp.colors.length + ' to choose from', pp.colors.map(UOR.palNameEn).join(', ') + '.', UOR.swatch(pp.colors[0]), ''],
    ['Size', 'made to fit', 'Standard doorway width. Ask on WhatsApp for a custom length.', '#E9DDC7', ''],
    ['Care', 'keep it bright', (UOR.care && UOR.care[pp.cat]) || 'Dust gently; keep away from damp.', '#DCE5C9', '']
  ];
  $('.p-pills').innerHTML = PILLS.map(function (x, i) {
    return '<div class="pill place"><button class="pill-btn" type="button" aria-expanded="false" aria-controls="pill-' + i + '"><span class="pill-dot" style="--bg:' + x[3] + '">' + x[4] + '</span>' +
      '<span class="pill-name">' + esc(x[0]) + '<small>' + esc(x[1]) + '</small></span><span class="pill-plus" aria-hidden="true"></span></button>' +
      '<div class="pill-more" id="pill-' + i + '"><div><p>' + esc(x[2]) + '</p></div></div></div>';
  }).join('');

  // heart: a thread loop stitches round it
  $('.heart').addEventListener('click', function () {
    var on = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', on);
    this.classList.remove('stitch'); void this.offsetWidth;
    if (on) this.classList.add('stitch');
    UOR.note(on ? 'Saved — it’s on your wishlist' : 'Taken off your wishlist');
  });
  // add to wishlist: a tiny cut-out flies to the wishlist pin
  $('.add').addEventListener('click', function () {
    var pin = $('.wish-n');
    function done() { wishN++; pin.textContent = wishN; pin.classList.remove('bump'); void pin.offsetWidth; pin.classList.add('bump'); setTimeout(function () { pin.classList.remove('bump'); }, 450); UOR.note('Added to your wishlist — ' + pp.name); }
    var src = $('.p-art'), a = src.getBoundingClientRect(), b = pin.getBoundingClientRect();
    if (UOR.calm() || !src.animate) { done(); return; }
    var fly = src.cloneNode(true);
    fly.style.cssText = 'position:fixed;left:' + a.left + 'px;top:' + a.top + 'px;width:' + a.width + 'px;z-index:140;pointer-events:none;margin:0';
    document.body.appendChild(fly);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    fly.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
      { transform: 'translate(' + dx * .45 + 'px,' + (dy * .45 - 120) + 'px) scale(.45) rotate(-12deg)', opacity: 1, offset: .5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.06) rotate(-24deg)', opacity: .2 }
    ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = function () { fly.remove(); done(); };
  });

  // ---- collage grid with word-strip filter chips
  var picks = ['haveli-toran', 'moon-mandala', 'temple-jhumka', 'pompom-swag', 'bell-cascade', 'lotus-jhumka', 'mirrorwork-toran', 'long-latkan', 'crescent-chandbali', 'sunwheel', 'rope-bangles', 'bunting'];
  $('.chips-row').innerHTML = ['all', 'torans', 'hangings', 'garlands', 'jewelry'].map(function (c, i) {
    return '<button class="strip chip-f" type="button" data-f="' + c + '" data-type="' + (i ? 'type' : 'serif') + '" data-tone="' + (i ? 'aged' : 'ink') + '" aria-pressed="' + !i + '">' + c + '</button>';
  }).join('');
  $('.collage').innerHTML = picks.map(function (id, i) {
    var p = UOR.byId(id), tall = [1, 0, 2, 0, 1, 2, 0, 1, 0, 2, 1, 0][i];
    var badge = i === 4 ? '<span class="rubber sm" aria-label="Sold out">sold<br>out</span>' : i === 9 ? '<span class="rubber sm ink" aria-label="Made to order">made to<br>order</span>' : '';
    return '<a class="clip place" data-cat="' + p.cat + '" href="product.html?id=' + p.id + '" style="--r:' + ((rnd() - .5) * 4).toFixed(2) + 'deg">' +
      '<span class="tape ' + ['tc', 'tl t-gold', 'tr t-moss', 'tc t-plain'][i % 4] + '"></span>' + badge +
      '<span class="win" style="--bg:' + p.bg + ';display:block;padding:' + [0, 18, 36][tall] + 'px 0">' + UOR.art(p) + '</span>' +
      '<h4>' + esc(p.name) + '</h4><p>' + esc(p.mini) + '</p></a>';
  }).join('');
  $('.chips-row').addEventListener('click', function (e) {
    var b = e.target.closest('.chip-f'); if (!b) return;
    $$('.chip-f').forEach(function (x) { x.setAttribute('aria-pressed', x === b); x.dataset.tone = x === b ? 'ink' : 'aged'; });
    var f = b.dataset.f;
    function apply() { $$('.clip').forEach(function (c) { c.hidden = !(f === 'all' || c.dataset.cat === f || (f === 'jewelry' && /oxidised|gold-silver/.test(c.dataset.cat))); }); }
    UOR.viewSwap(apply);
  });
  $$('.clip').forEach(function (c, i) { c.style.viewTransitionName = 'clip-' + i; });

  // ---- page turn
  $('.book .back').innerHTML = '<span class="at-label">the back of the page</span>';
  $('.turn').addEventListener('click', function () {
    var b = $('.book'), t = b.classList.toggle('turned');
    this.firstChild.textContent = t ? '← turn it back ' : 'turn the page →';
  });

  // ---- card → poster (same-document view transition; the shop uses cross-document ones)
  var vtIds = ['bell-toran', 'sun-disc', 'festive-arch'], opener = null;
  $('.vt-row').innerHTML = vtIds.map(function (id, i) {
    var p = UOR.byId(id);
    return '<button class="vt-card" type="button" data-id="' + id + '" style="--r:' + [-3, 2, -1.5][i] + 'deg" aria-label="Open ' + esc(p.name) + '"><span class="win" style="--bg:' + p.bg + '">' + UOR.art(p) + '</span></button>';
  }).join('');
  var poster = $('.vt-poster');
  var swap = UOR.viewSwap;
  $('.vt-row').addEventListener('click', function (e) {
    var b = e.target.closest('.vt-card'); if (!b) return;
    var p = UOR.byId(b.dataset.id); opener = b;
    var art = b.querySelector('.art'); art.style.viewTransitionName = 'piece';
    swap(function () {
      art.style.viewTransitionName = '';
      $('.vt-art').innerHTML = UOR.art(p);
      $('.vt-art .art').style.viewTransitionName = 'piece';
      $('.vt-cat').textContent = UOR.cat(p.cat).title + ' ' + UOR.cat(p.cat).accent;
      $('#vt-name').textContent = p.name; $('.vt-mini').textContent = p.mini.toLowerCase();
      poster.hidden = false; document.documentElement.style.overflow = 'hidden';
    });
    setTimeout(function () { $('.close-vt').focus(); }, 50);
  });
  function closePoster() {
    if (poster.hidden) return;
    var art = opener.querySelector('.art');
    swap(function () {
      $('.vt-art .art').style.viewTransitionName = '';
      art.style.viewTransitionName = 'piece';
      poster.hidden = true; document.documentElement.style.overflow = '';
    });
    setTimeout(function () { art.style.viewTransitionName = ''; opener.focus(); }, 800);
  }
  $('.close-vt').addEventListener('click', closePoster);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePoster(); });

  // ---- the thread through the motion section, drawn as you scroll
  var sec = $('.thread-sec'), tsvg = $('.motion-thread');
  function drawThread() {
    var w = sec.offsetWidth, h = sec.offsetHeight, d = 'M -10 ' + (h * .12);
    for (var k = 1; k <= 4; k++) {
      var y = h * (.12 + k * .2), x = k % 2 ? w * .96 : w * .04;
      d += ' C ' + (k % 2 ? w * .4 : w * .6) + ' ' + (y - h * .22) + ', ' + x + ' ' + (y - h * .12) + ', ' + x + ' ' + y;
    }
    tsvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    tsvg.innerHTML = '<defs><mask id="mt" maskUnits="userSpaceOnUse" x="-40" y="-40" width="' + (w + 80) + '" height="' + (h + 80) + '"><path class="mt" d="' + d + '" fill="none" stroke="#fff" stroke-width="14"/></mask></defs>' +
      '<path class="thread-ghost" d="' + d + '"/><g mask="url(#mt)"><path class="thread-live" d="' + d + '"/></g>';
    UOR.scrollThread(tsvg.querySelector('.mt'), sec);
  }
  drawThread();

  // ---- motion switch in the footer
  function paintSwitch() { $$('.motion-switch button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.m === document.documentElement.dataset.motion); }); }
  $('.motion-switch').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { UOR.setMotion(b.dataset.m); paintSwitch(); UOR.note(b.dataset.m === 'calm' ? 'Calm mode: everything stays still' : 'Full motion is on'); } });
  paintSwitch();

  UOR.parallax($('.hero'));
  UOR.tearAll();
  UOR.observe();
})();
