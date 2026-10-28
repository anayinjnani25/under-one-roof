/* Under One Roof — product detail: jello-spring object, sliding info panel, sharing,
   suggestions, reviews. Text on screen follows the chosen language; WhatsApp messages
   to the shop stay in English (UOR.en / UOR.palNameEn). */
// first paint, before the live catalog arrives: the name and short line from the catalog bundled with
// the site (English only; Telugu/Hindi names come from Supabase). The block below redraws them.
(function () {
  var early = UOR.lang === 'en' && UOR.byId && UOR.byId(UOR.query ? UOR.query('id') : null);
  if (!early) return;
  var set = function (s, v) { var el = document.querySelector(s); if (el && !el.textContent.trim()) el.textContent = v; };
  set('.pd-name', early.name);
  set('.pd-mini', early.mini.toLowerCase());
})();

UOR.ready.then(function () {
  var t = UOR.t;
  var reduced = UOR.reduced();
  var p = UOR.byId(UOR.query('id')) || UOR.products[0];
  var cat = UOR.cat(p.cat);
  UOR.chrome('products');
  var pageUrl = location.href.split('#')[0].replace(/[?&]lang=\w+/, '');
  UOR.waContext = 'Hi Under One Roof! I have a question about the ' + UOR.en(p, 'name') + ': ' + pageUrl;
  UOR.recent.add(p.id);
  UOR.renderRecent(p.id);

  var $ = function (s, el) { return (el || document).querySelector(s); };
  document.title = p.name + ' — Under One Roof';
  $('.crumbs').innerHTML = '<a href="index.html#shelf">' + t('pd.shelf') + '</a> / <a href="category.html?c=' + cat.slug + '">' + cat.title + ' ' + cat.accent + '</a> / <span aria-current="page">' + UOR.esc(p.name) + '</span>';
  $('.pd-cat').textContent = t('pd.entry', { no: cat.no, cat: cat.title + ' ' + cat.accent });
  $('.pd-name').textContent = p.name;
  $('.pd-mini').textContent = UOR.lang === 'en' ? p.mini.toLowerCase() : p.mini;
  // botanicals behind the piece: mango leaves for doorway pieces, marigolds for the rest
  var leafy = { torans: 1, bandhanwar: 1 }[p.cat];
  $('.pd-sprigs').innerHTML = UOR.sprig(leafy ? 'mango' : 'marigold', 'sp-a') + UOR.sprig(leafy ? 'marigold' : 'mango', 'sp-b');
  $('.pd-dot-piece').innerHTML = UOR.art(p);
  $('.pd-dot-piece').style.setProperty('--bg', p.bg);
  $('.pd-desc').textContent = p.desc;
  $('.pd-care').textContent = UOR.care[p.cat];
  $('meta[name="description"]').setAttribute('content', p.mini + '. ' + p.desc);

  // product details for Google (no price: prices are shared on WhatsApp)
  var ld = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: p.name, description: p.desc, sku: p.id,
    image: p.image ? new URL(p.image, location.href).href : UOR.SITE + 'assets/logo/og.jpg',
    category: cat.title + ' ' + cat.accent,
    brand: { '@type': 'Brand', name: 'Under One Roof' },
    url: document.querySelector('link[rel="canonical"]').href // this language's address (see common.js)
  };
  var ldTag = document.createElement('script');
  ldTag.type = 'application/ld+json';
  ldTag.textContent = JSON.stringify(ld);
  document.head.appendChild(ldTag);
  var sold = UOR.soldOut(p);
  if (p.stock && p.stock !== 'in_stock') {
    $('.pd-mini').insertAdjacentHTML('afterend', '<p class="pd-stock">' + UOR.stockBadge(p) + ' ' + t(sold ? 'stock.soldNote' : 'stock.mtoNote') + '</p>');
  }

  // prices aren't shown: shoppers ask for them on WhatsApp, with the piece and colour pre-filled
  var priceBtn = $('.wa-price');
  $('.wa-ico', priceBtn).innerHTML = UOR.WA_ICON;
  function priceAsk() {
    return 'Hi Under One Roof! Could you tell me the price of the ' + UOR.en(p, 'name') +
      (current ? ' in ' + UOR.palNameEn(current) : '') + '? ' + pageUrl;
  }
  if (UOR.wa()) {
    priceBtn.addEventListener('click', function () { priceBtn.href = UOR.wa(priceAsk()); }); // picks up the latest colour
  } else {
    priceBtn.removeAttribute('target'); priceBtn.removeAttribute('rel'); // no number set: fall back to the Contact page
  }
  $('.pd-actions').insertAdjacentHTML('beforeend', UOR.heartBtn(p));
  $('.pd-wa').insertAdjacentHTML('beforeend', '<button class="strip share-btn" type="button" data-type="serif" data-flat>' + UOR.WA_ICON + '<span>' + t('pd.share') + '</span></button>');

  // ---- colour options (start on the colour already saved in the wishlist, if any)
  var saved = UOR.wish.get(p.id);
  var jelly = $('.jelly'), current = saved ? saved.colour : p.colors[0];
  var customLink = $('.custom-link');

  // ---- the gallery (gallery.js). Pieces with photos show their photos (the product's own photo
  // first, then the extra ones); pieces without show their drawing in each of their colours.
  var gallery = UOR.gallery({
    stage: $('.pd-stage'), jelly: jelly, thumbs: $('.pd-thumbs'), dots: $('.pd-dots'), live: $('.pd-live'), name: p.name,
    onChange: function (s) { if (s.colour && s.colour !== current && p.colors.indexOf(s.colour) > -1) { current = s.colour; paint(true); } }
  });
  function photoSlide(ph) {
    var img = function (lazy) { return '<img class="art" src="' + UOR.esc(ph.url) + '" alt="" decoding="async" crossorigin="anonymous"' + (lazy ? ' loading="lazy"' : '') + '>'; };
    return { url: ph.url, colour: ph.colour, alt: ph.alt || p.name, bg: p.bg, html: function () { return img(false); }, thumb: function () { return img(true); } };
  }
  function drawnSlides() {
    return p.colors.map(function (k) {
      return { colour: k, alt: UOR.palName(k), bg: p.bg, html: function () { return UOR.art(p, k); }, thumb: function () { return UOR.art(p, k); } };
    });
  }
  var cover = p.image ? [photoSlide({ url: p.image, colour: null, alt: p.name })] : [];
  var slides = cover.length ? cover : drawnSlides();
  // start on the picture of the colour already chosen (from the wishlist), else the first
  gallery.set(slides, Math.max(0, slides.findIndex(function (s) { return s.colour === current; })));
  UOR.productImages(p.id).then(function (extra) {
    if (!extra.length) return;
    var photos = cover.concat(extra.map(photoSlide));
    var keep = cover.length ? gallery.index() : Math.max(0, photos.findIndex(function (s) { return s.colour === current; }));
    slides = photos;
    gallery.set(photos, keep);
  });

  function paint(fromGallery) {
    // a colour chip jumps to that colour's picture when there is one
    if (!fromGallery) {
      var gi = gallery.find(function (s) { return s.colour === current; });
      if (gi > -1 && gi !== gallery.index()) gallery.go(gi);
    }
    $('.swatch-name').textContent = UOR.palName(current);
    var heart = $('.pd-actions .heart');
    if (heart) heart.dataset.colour = current; // the heart saves the colour on screen
    document.querySelectorAll('.swatch').forEach(function (s) { s.setAttribute('aria-checked', s.dataset.k === current); s.tabIndex = s.dataset.k === current ? 0 : -1; });
    if (UOR.wa()) priceBtn.href = UOR.wa(priceAsk());
    customLink.href = 'contact.html?custom=' + encodeURIComponent(p.id) + '&colour=' + encodeURIComponent(current) + '#custom';
    $('.pd-dot-price').style.setProperty('--bg', UOR.swatch(current)); // the price pill shows the colour being asked about
    var alt = $('.pd-sold-alt a');
    if (alt) alt.href = customLink.href;
  }
  $('.swatches').innerHTML = p.colors.map(function (k) {
    return '<button class="swatch" type="button" role="radio" data-k="' + k + '" aria-label="' + UOR.esc(UOR.palName(k)) + '" style="background:' + UOR.swatch(k) + '"></button>';
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

  // ---- share with family: native share sheet on phones, otherwise WhatsApp with no fixed number
  $('.share-btn').addEventListener('click', function () {
    var text = t('pd.shareText', { name: p.name, mini: p.mini, colour: UOR.palName(current) });
    var phone = window.matchMedia('(pointer: coarse)').matches;
    function viaWhatsApp() { window.open('https://wa.me/?text=' + encodeURIComponent(text + ' ' + pageUrl), '_blank', 'noopener'); }
    if (phone && navigator.share) {
      navigator.share({ title: p.name, text: text, url: pageUrl }).catch(function (err) {
        if (!err || err.name !== 'AbortError') viaWhatsApp(); // cancelled share sheets stay cancelled
      });
    } else viaWhatsApp();
  });

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
  stage.addEventListener('click', function () { if (!gallery.swiped()) nudge(1.4); });
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // (details sit in ingredient pills; atelier.js opens and closes them)

  // ---- quantity + Add to wishlist
  var qty = saved ? saved.qty : 1, qtyBox = $('.pd-qty');
  function paintQty() { qtyBox.innerHTML = UOR.stepper(qty, p.name); }
  paintQty();
  qtyBox.addEventListener('click', function (e) {
    var b = e.target.closest('.qty-btn'); if (!b) return;
    qty = Math.min(UOR.QTY_MAX, Math.max(1, qty + (+b.dataset.step)));
    var which = b.dataset.step;
    paintQty();
    var again = qtyBox.querySelector('[data-step="' + which + '"]');
    (again && !again.disabled ? again : qtyBox.querySelector('.qty-btn:not([disabled])')).focus();
  });
  if (sold) {
    // sold out: no adding; point to a custom version instead
    qtyBox.hidden = true;
    var addBtn = $('.add-bag');
    addBtn.disabled = true; addBtn.classList.add('is-sold');
    addBtn.textContent = t('stock.sold');
    $('.pd-actions').insertAdjacentHTML('afterend', '<p class="pd-sold-alt"><a href="' + customLink.getAttribute('href') + '">' + t('stock.custom') + '</a></p>');
  }
  $('.add-bag').addEventListener('click', function () {
    if (sold) return;
    var had = UOR.wish.has(p.id);
    UOR.wish.set(p.id, { qty: qty, colour: current });
    UOR.toast(t(had ? 'pd.updated' : 'pd.added', { n: qty, name: p.name }));
  });
  // keep the stepper in step with changes made from the wishlist drawer
  document.addEventListener('uor:wish', function () {
    var e = UOR.wish.get(p.id);
    if (e && e.qty !== qty && !qtyBox.contains(document.activeElement)) { qty = e.qty; paintQty(); }
  });

  // ---- reviews (Supabase; only approved ones are readable)
  function stars(v) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= Math.round(v) ? '★' : '☆'; return s; }
  var mineDone = false;
  function renderReviews(all) {
    var me = UOR.auth.user();
    var mine = me ? all.filter(function (r) { return r.user_id === me.id; })[0] : null;
    var revs = all.filter(function (r) { return r.approved; });
    mineDone = !!mine;
    gate();
    if (mine && !mine.approved) {
      // the member's own note, visible only to them until it's approved
      revs = [mine].concat(revs);
    }
    if (!revs.length) {
      $('.rev-summary').innerHTML = '<span class="label">' + t('rev.none') + '</span>';
      $('.review-list').innerHTML = '<li class="review review-empty"><p>' + t('rev.noneText') + '</p></li>';
      return;
    }
    var pub = revs.filter(function (r) { return r.approved; });
    if (pub.length) {
      var avg = pub.reduce(function (a, r) { return a + r.rating; }, 0) / pub.length;
      $('.rev-summary').innerHTML = '<span class="stars" aria-hidden="true">' + stars(avg) + '</span> <span class="label">' +
        t(pub.length === 1 ? 'rev.summary1' : 'rev.summary', { avg: avg.toFixed(1), n: pub.length }) + '</span>';
      ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: pub.length };
      ldTag.textContent = JSON.stringify(ld);
    } else $('.rev-summary').innerHTML = '<span class="label">' + t('rev.noPub') + '</span>';
    $('.review-list').innerHTML = revs.map(function (r) {
      return '<li class="review' + (r.approved ? '' : ' pending') + '"><span class="stars" role="img" aria-label="' + UOR.esc(t('rev.outOf', { n: r.rating })) + '">' + stars(r.rating) + '</span><p>' + UOR.esc(r.body) + '</p><span class="label">— ' + UOR.esc(r.name) + ' · ' + UOR.date(r.created_at) +
        (r.approved ? '' : ' · <span class="pending-tag">' + t('rev.awaiting') + '</span>') + '</span></li>';
    }).join('');
  }
  function loadReviews() {
    UOR.reviews.list(p.id).then(renderReviews, function () {
      $('.rev-summary').innerHTML = '';
      $('.review-list').innerHTML = '<li class="review review-empty"><p>' + t('rev.error') + '</p></li>';
    });
  }
  $('.review-list').innerHTML = '<li class="review review-empty"><p>' + t('rev.fetching') + '</p></li>';

  // the form is for signed-in members, once per piece
  var form = $('.review-form'), note = form.querySelector('.form-note');
  $('.gate-link').href = 'account.html?next=' + encodeURIComponent('product.html?id=' + p.id + '#reviews');
  function gate() {
    var me = UOR.auth.user();
    $('.review-gate').hidden = !!me;
    form.hidden = !me || mineDone;
    if (me && !form.elements.name.value) form.elements.name.value = UOR.auth.name() || '';
  }
  UOR.auth.ready.then(function () { gate(); loadReviews(); });
  UOR.auth.onChange(function () { mineDone = false; gate(); loadReviews(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form), name = String(fd.get('name') || '').trim(), body = String(fd.get('body') || '').trim(), rating = +fd.get('rating');
    note.className = 'form-note';
    if (fd.get('website')) { form.reset(); note.textContent = t('rev.thanks'); return; } // bot trap
    if (!rating) { note.textContent = t('rev.chooseRating'); note.classList.add('err'); return; }
    if (!name) { note.textContent = t('rev.addName'); note.classList.add('err'); form.elements.name.focus(); return; }
    if (body.length < 3) { note.textContent = t('rev.fewWords'); note.classList.add('err'); form.elements.body.focus(); return; }
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = t('rev.sending');
    UOR.reviews.submit(p.id, { name: name, rating: rating, body: body }).then(function () {
      form.reset();
      UOR.toast(t('rev.thanks'));
      loadReviews();
    }, function (err) {
      var known = err && (err.code === 'dup' || err.message === t('rev.signin'));
      note.textContent = known ? err.message : t('rev.failed');
      note.classList.add('err');
    }).then(function () { btn.disabled = false; btn.textContent = t('rev.send'); });
  });

  // ---- "You might also like": other shelves that go together, same colours first.
  // Deterministic per piece, so it doesn't reshuffle on reload.
  var PAIRS = {
    sarees: ['temple', 'potlis'], 'dress-material': ['indowestern', 'potlis'], 'coord-sets': ['indowestern', 'oxidised'], gowns: ['temple', 'potlis'],
    indowestern: ['coord-sets', 'gowns'], temple: ['sarees', 'gowns'], oxidised: ['coord-sets', 'sarees'], potlis: ['sarees', 'gowns'],
    torans: ['bandhanwar'], bandhanwar: ['torans']
  };
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var paired = PAIRS[p.cat] || [];
  var also = UOR.products.filter(function (q) { return q.cat !== p.cat; }).map(function (q) {
    var shared = q.colors.filter(function (k) { return p.colors.indexOf(k) > -1; }).length;
    var score = (paired.indexOf(q.cat) > -1 ? 100 : 0) + (shared ? 10 + shared : 0);
    return { q: q, score: score, tie: hash(p.id + '|' + q.id) };
  }).sort(function (a, b) { return b.score - a.score || a.tie - b.tie; }).slice(0, 4);
  $('.also-grid').innerHTML = also.map(function (x, i) { return '<li>' + UOR.clip(x.q, UOR.productHref(x.q), UOR.products.indexOf(x.q)) + '</li>'; }).join('');

  // ---- same shelf
  $('.rel-title').innerHTML = t('pd.more', { x: UOR.lang === 'en' ? cat.accent.toLowerCase() : cat.accent });
  $('.rel-grid').innerHTML = UOR.inCat(p.cat).filter(function (q) { return q !== p; }).slice(0, 4).map(function (q) {
    return '<li>' + UOR.clip(q, UOR.productHref(q), UOR.products.indexOf(q)) + '</li>';
  }).join('');
  $('.related').hidden = !$('.rel-grid').children.length; // the only piece on its shelf
  UOR.tearAll(); UOR.observe();

  var queued = false;
  window.addEventListener('scroll', function () {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; UOR.headSolid(scrollY > 10); });
  }, { passive: true });
  UOR.headSolid(scrollY > 10);
});
