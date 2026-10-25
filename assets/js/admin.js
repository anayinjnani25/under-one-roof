/* Under One Roof — shop admin (admin.html). English only.
   Who may change what is decided by Supabase row-level security (private.is_admin());
   the checks here only decide what to show. */
(function () {
  // features that can be switched off without touching anything else
  var FEATURES = { customers: true };

  UOR.lang = 'en'; document.documentElement.lang = 'en'; // admin is English-only, whatever the shop language
  var sb = UOR.sb, esc = UOR.esc;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  var STOCK = { in_stock: 'In stock', made_to_order: 'Made to order', sold_out: 'Sold out' };
  var LANG2 = ['te', 'hi'];
  var me = null, cats = [], products = [], collections = [], reviews = [], notifs = [], booted = false;

  function view(name) {
    $('.ad-loading').hidden = true;
    $$('[data-view]').forEach(function (s) { s.hidden = s.dataset.view !== name; });
    $('.ad-tools').hidden = name !== 'admin';
  }
  function say(el, msg, kind) { el.textContent = msg || ''; el.className = el.className.replace(/\s?(ok|err)\b/g, '') + (kind ? ' ' + kind : ''); }
  function online(note) {
    if (navigator.onLine !== false) return true;
    say(note, "You're offline, so this can't be saved. Reconnect and try again.", 'err');
    return false;
  }
  function fail(note, e) {
    var m = (e && e.message) || String(e || '');
    if (/row-level security|permission denied|42501/i.test(m)) m = "Supabase refused this change. Is your account still an admin?";
    else if (/Failed to fetch|NetworkError|timeout/i.test(m)) m = "Couldn't reach Supabase. Check the connection and try again.";
    else if (/duplicate key/i.test(m)) m = 'That id is already used. Pick another.';
    say(note, m, 'err');
  }
  function unwrap(r) { if (r && r.error) throw r.error; return r; }
  function fmtDate(iso) { return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
  function catName(slug) { var c = cats.filter(function (x) { return x.slug === slug; })[0]; return c ? c.title + ' ' + c.accent : slug; }

  // a product row as the drawing code expects it
  function shape(r) {
    var colors = (r.colors || []).filter(function (k) { return UOR.palettes[k]; });
    return {
      id: r.id, name: r.name, bg: r.bg || '#EFE2C9', colors: colors.length ? colors : ['rust'],
      art: r.art && UOR.ART_TYPES.indexOf(r.art.type) > -1 ? r.art : { type: 'pendant', style: 'coin' },
      image: UOR.imageUrl(r.image_url)
    };
  }
  function thumb(r) { return '<span class="ad-thumb" style="--bg:' + esc(r.bg || '#EFE2C9') + '">' + UOR.art(shape(r)) + '</span>'; }

  // ---- auth gate -------------------------------------------------------
  function check() {
    var u = UOR.auth.user();
    if (!sb) { view('signin'); say($('.ad-signin .form-note'), "Supabase couldn't load. Check the connection and reload.", 'err'); return; }
    if (!u) { view('signin'); return; }
    sb.from('admins').select('user_id').eq('user_id', u.id).maybeSingle().then(function (r) {
      if (r.error || !r.data) { view('denied'); return; }
      me = u;
      $('.ad-who').textContent = u.email || '';
      view('admin');
      if (!booted) { booted = true; boot(); }
    }, function () { view('denied'); });
  }
  UOR.auth.ready.then(check);
  UOR.auth.onChange(function () {
    var u = UOR.auth.user();
    if (booted && (!u || u.id !== me.id)) location.reload(); // signed out or switched account: start clean
    else if (!booted) check();
  });

  $('.ad-signin').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target, note = $('.form-note', f), email = f.email.value.trim(), pw = f.password.value;
    if (!email || !pw) { say(note, 'Enter your email and password.', 'err'); return; }
    if (!online(note)) return;
    say(note, 'Signing in…');
    UOR.auth.signIn(email, pw).then(function () { say(note, ''); }, function (err) {
      var m = (err && err.message) || '';
      say(note, /invalid login credentials/i.test(m) ? "That email and password don't match." :
        /email not confirmed/i.test(m) ? 'Confirm your email first, using the link we sent you.' :
        /rate limit|too many/i.test(m) ? 'Too many attempts. Wait a few minutes and try again.' :
        /fetch|network/i.test(m) ? "Couldn't reach the server. Check your connection." : m, 'err');
    });
  });
  $('.ad-google').addEventListener('click', function () { UOR.auth.google('admin.html').catch(function (e) { fail($('.ad-signin .form-note'), e); }); });
  $$('.ad-out').forEach(function (b) { b.addEventListener('click', function () { UOR.auth.signOut().then(function () { location.reload(); }); }); });

  // ---- tabs ------------------------------------------------------------
  function tab(name, focus) {
    $$('.ad-tab').forEach(function (b) {
      var on = b.dataset.tab === name;
      b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
      $('#' + b.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) b.focus();
    });
    if (history.replaceState) history.replaceState(null, '', '#' + name);
  }
  $('.ad-tabs').addEventListener('click', function (e) { var b = e.target.closest('.ad-tab'); if (b) tab(b.dataset.tab); });
  $('.ad-tabs').addEventListener('keydown', function (e) {
    var all = $$('.ad-tab').filter(function (b) { return !b.hidden; }), i = all.indexOf(document.activeElement);
    if (i < 0) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); tab(all[(i + 1) % all.length].dataset.tab, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); tab(all[(i - 1 + all.length) % all.length].dataset.tab, true); }
  });

  function boot() {
    $('#t-customers').hidden = !FEATURES.customers;
    var start = location.hash.slice(1);
    tab(['products', 'collections', 'reviews', 'customers'].indexOf(start) > -1 && !(start === 'customers' && !FEATURES.customers) ? start : 'products');
    sb.from('categories').select('slug,title,accent').order('sort').then(unwrap).then(function (r) {
      cats = r.data;
      var opts = cats.map(function (c) { return '<option value="' + c.slug + '">' + esc(c.title + ' ' + c.accent) + '</option>'; }).join('');
      $('.p-shelf').insertAdjacentHTML('beforeend', opts);
      $('.p-form').category_slug.innerHTML = opts;
      return loadProducts();
    }).then(loadCollections).catch(function (e) { fail($('.p-count'), e); });
    loadReviews();
    loadNotifs();
    if (FEATURES.customers) loadCustomers();
  }

  // ---- products ------------------------------------------------------------
  function loadProducts() {
    return sb.from('products').select('*').order('sort').order('name').then(unwrap).then(function (r) {
      products = r.data; paintProducts(); fillPicker();
    });
  }
  function paintProducts() {
    var q = $('.p-search').value.trim().toLowerCase(), shelf = $('.p-shelf').value, pub = $('.p-pub').value, stock = $('.p-stock').value;
    var rows = products.filter(function (r) {
      return (!q || (r.name + ' ' + r.id).toLowerCase().indexOf(q) > -1) && (!shelf || r.category_slug === shelf) &&
        (!pub || (pub === 'yes') === r.published) && (!stock || r.stock_status === stock);
    });
    $('.p-count').textContent = rows.length + ' of ' + products.length + ' products';
    $('.p-rows').innerHTML = rows.map(function (r) {
      return '<tr data-id="' + esc(r.id) + '"><td>' + thumb(r) + '</td>' +
        '<td><strong>' + esc(r.name) + '</strong><small>' + esc(r.id) + '</small></td>' +
        '<td>' + esc(catName(r.category_slug)) + '</td>' +
        '<td><span class="ad-pill s-' + r.stock_status + '">' + STOCK[r.stock_status] + '</span></td>' +
        '<td>' + (r.published ? '<span class="ad-pill s-pub">Shown</span>' : '<span class="ad-pill s-hid">Hidden</span>') + '</td>' +
        '<td>' + r.sort + '</td>' +
        '<td class="ad-actions"><button class="link-btn p-edit" type="button">Edit</button>' +
        (r.published ? '<button class="link-btn p-del" type="button">Remove</button>' : '<button class="link-btn p-show" type="button">Publish</button><button class="link-btn p-del" type="button">Delete…</button>') + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="ad-empty">No products match.</td></tr>';
  }
  ['.p-search', '.p-shelf', '.p-pub', '.p-stock'].forEach(function (s) { $(s).addEventListener('input', paintProducts); });
  $('.p-rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-id]'); if (!tr) return;
    var r = products.filter(function (x) { return x.id === tr.dataset.id; })[0];
    if (e.target.closest('.p-edit')) openProduct(r);
    else if (e.target.closest('.p-del')) openDelete(r);
    else if (e.target.closest('.p-show')) {
      if (!online($('.p-count'))) return;
      sb.from('products').update({ published: true }).eq('id', r.id).then(unwrap).then(function () { r.published = true; paintProducts(); UOR.toast('Published'); }, function (err) { fail($('.p-count'), err); });
    }
  });

  // dialogs: <dialog> with a close button; Esc closes natively
  function openDlg(d) { if (d.showModal) d.showModal(); else d.setAttribute('open', ''); }
  function closeDlg(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-dlg-close]'); if (b) closeDlg(b.closest('dialog')); });

  // ---- product editor
  var pf = $('.p-form'), editing = null, photo = null; // photo: { full: Blob, small: Blob|null, ext } waiting to upload, or 'clear'
  pf.art_type.innerHTML = UOR.ART_TYPES.map(function (t) { return '<option>' + t + '</option>'; }).join('');
  $('.p-colours').innerHTML = Object.keys(UOR.palettes).map(function (k) {
    return '<label class="ad-swatch"><input type="checkbox" name="colours" value="' + k + '"><span style="background:' + UOR.swatch(k) + '"></span>' + esc(UOR.palNameEn(k)) + '</label>';
  }).join('');

  function openProduct(r) {
    editing = r || null; photo = null;
    pf.reset(); say($('.p-note'), '');
    $('#p-dialog-h').textContent = r ? 'Edit ' + r.name : 'New product';
    pf.id.readOnly = !!r;
    var x = r || { id: '', category_slug: cats[0] && cats[0].slug, stock_status: 'in_stock', sort: (products.length + 1) * 10, bg: '#EFE2C9', published: true, colors: ['rust'], art: { type: 'toran' }, i18n: {} };
    pf.id.value = x.id; pf.category_slug.value = x.category_slug; pf.stock_status.value = x.stock_status;
    pf.sort.value = x.sort; pf.bg.value = /^#[0-9a-f]{6}$/i.test(x.bg || '') ? x.bg : '#efe2c9'; pf.published.checked = !!x.published;
    pf.name.value = x.name || ''; pf.mini.value = x.mini || ''; pf.description.value = x.description || '';
    LANG2.forEach(function (l) {
      var t = (x.i18n || {})[l] || {};
      pf[l + '_name'].value = t.name || ''; pf[l + '_mini'].value = t.mini || ''; pf[l + '_description'].value = t.description || '';
    });
    $$('input[name=colours]', pf).forEach(function (c) { c.checked = (x.colors || []).indexOf(c.value) > -1; });
    var art = x.art || {}, extra = {};
    Object.keys(art).forEach(function (k) { if (k !== 'type') extra[k] = art[k]; });
    pf.art_type.value = UOR.ART_TYPES.indexOf(art.type) > -1 ? art.type : 'pendant';
    pf.art_extra.value = Object.keys(extra).length ? JSON.stringify(extra) : '';
    preview();
    openDlg($('.p-dialog'));
  }
  $('.p-new').addEventListener('click', function () { openProduct(null); });

  function formRow() {
    var colours = $$('input[name=colours]:checked', pf).map(function (c) { return c.value; });
    var extra = {};
    if (pf.art_extra.value.trim()) { try { extra = JSON.parse(pf.art_extra.value); } catch (e) { extra = null; } }
    return { colours: colours, extra: extra };
  }
  function preview() {
    var f = formRow();
    var img = photo === 'clear' ? null : photo ? URL.createObjectURL(photo.full) : editing && editing.image_url;
    var art = Object.assign({}, f.extra || {}, { type: pf.art_type.value });
    var p = shape({ id: pf.id.value || 'new', name: pf.name.value, bg: pf.bg.value, colors: f.colours, art: art, image_url: photo ? null : img });
    if (photo && photo !== 'clear') p.image = img;
    $('.p-preview').style.setProperty('--bg', pf.bg.value);
    $('.p-preview').innerHTML = UOR.art(p);
    $('.p-photo-clear').hidden = !(photo && photo !== 'clear') && !(editing && editing.image_url && photo !== 'clear');
  }
  pf.addEventListener('input', function (e) { if (!/^(te_|hi_)|description|mini|name|sort|id$/.test(e.target.name)) preview(); });
  $('.p-photo-clear').addEventListener('click', function () { photo = 'clear'; pf.photo.value = ''; preview(); });

  // resize in the browser: longest side ≤ max, WebP where the browser can make it
  function resize(file, max) {
    return (window.createImageBitmap ? createImageBitmap(file) : new Promise(function (res, rej) {
      var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(file);
    })).then(function (img) {
      var s = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(res, 'image/webp', 0.86); });
    });
  }
  pf.photo.addEventListener('change', function () {
    var file = pf.photo.files[0]; if (!file) return;
    if (!/^image\//.test(file.type)) { say($('.p-note'), 'Choose an image file.', 'err'); return; }
    say($('.p-note'), 'Preparing the photo…');
    Promise.all([resize(file, 1600), resize(file, 600)]).then(function (b) {
      var webp = b[0] && b[0].type === 'image/webp';
      photo = { full: b[0], small: webp ? b[1] : null, ext: webp ? 'webp' : 'png' };
      say($('.p-note'), 'Photo ready (' + Math.round(b[0].size / 1024) + ' KB). It uploads when you save.', 'ok');
      preview();
    }, function () { say($('.p-note'), "That image couldn't be read. Try a JPG or PNG.", 'err'); });
  });

  function uploadPhoto(id) {
    if (!photo || photo === 'clear') return Promise.resolve(photo === 'clear' ? null : undefined);
    var stem = id + '-' + Date.now(), bucket = sb.storage.from(UOR.SUPABASE.imageBucket);
    var name = photo.ext === 'webp' ? stem + '@1600.webp' : stem + '.png';
    var up = [bucket.upload(name, photo.full, { contentType: photo.full.type, cacheControl: '31536000', upsert: false })];
    if (photo.small) up.push(bucket.upload(stem + '@600.webp', photo.small, { contentType: 'image/webp', cacheControl: '31536000', upsert: false }));
    return Promise.all(up).then(function (rs) { rs.forEach(unwrap); return name; });
  }

  pf.addEventListener('submit', function (e) {
    e.preventDefault();
    var note = $('.p-note'), f = formRow(), id = pf.id.value.trim();
    if (!online(note)) return;
    if (!/^[a-z0-9-]{2,60}$/.test(id)) { say(note, 'Id: 2–60 lowercase letters, numbers or dashes.', 'err'); pf.id.focus(); return; }
    if (!editing && products.some(function (x) { return x.id === id; })) { say(note, 'That id is already used.', 'err'); pf.id.focus(); return; }
    if (!pf.name.value.trim() || !pf.mini.value.trim() || !pf.description.value.trim()) { say(note, 'Fill in the English name, short line and description.', 'err'); return; }
    if (!f.colours.length) { say(note, 'Pick at least one colour.', 'err'); return; }
    if (f.extra === null || typeof f.extra !== 'object' || Array.isArray(f.extra)) { say(note, 'Extra drawing settings must be JSON like {"style":"coin"}.', 'err'); pf.art_extra.focus(); return; }
    var i18n = Object.assign({}, editing && editing.i18n || {});
    LANG2.forEach(function (l) {
      var t = Object.assign({}, i18n[l] || {});
      ['name', 'mini', 'description'].forEach(function (k) { var v = pf[l + '_' + k].value.trim(); if (v) t[k] = v; else delete t[k]; });
      if (Object.keys(t).length) i18n[l] = t; else delete i18n[l];
    });
    var row = {
      category_slug: pf.category_slug.value, name: pf.name.value.trim(), mini: pf.mini.value.trim(), description: pf.description.value.trim(),
      colors: f.colours, bg: pf.bg.value.toUpperCase(), art: Object.assign({}, f.extra, { type: pf.art_type.value }),
      published: pf.published.checked, sort: parseInt(pf.sort.value, 10) || 0, stock_status: pf.stock_status.value, i18n: i18n
    };
    $('.p-save').disabled = true; say(note, 'Saving…');
    uploadPhoto(id).then(function (img) {
      if (img !== undefined) row.image_url = img;
      return editing ? sb.from('products').update(row).eq('id', id).select().single() : sb.from('products').insert(Object.assign({ id: id }, row)).select().single();
    }).then(unwrap).then(function (r) {
      // a replaced or removed photo: tidy the old files out of the bucket
      var old = editing && editing.image_url;
      if (old && old !== r.data.image_url && !/^https?:/.test(old)) sb.storage.from(UOR.SUPABASE.imageBucket).remove([old, old.replace('@1600.webp', '@600.webp')]);
      if (editing) products[products.indexOf(editing)] = r.data; else products.push(r.data);
      paintProducts(); fillPicker(); closeDlg($('.p-dialog'));
      UOR.toast(editing ? 'Saved' : 'Product added');
    }).catch(function (err) { fail(note, err); }).then(function () { $('.p-save').disabled = false; });
  });

  // ---- remove: hide (default) or delete permanently
  var deleting = null;
  function openDelete(r) {
    deleting = r;
    $('.d-what').innerHTML = 'What should happen to <strong>' + esc(r.name) + '</strong>?';
    $('.d-confirm').checked = false; $('.d-forever').disabled = true; say($('.d-note'), '');
    $('.d-hide').hidden = !r.published;
    $('.d-usage').textContent = 'Checking where it is used…';
    sb.rpc('product_usage', { pid: r.id }).then(unwrap).then(function (x) {
      var u = x.data;
      $('.d-usage').textContent = 'It is on ' + u.wishlists + ' shopper wishlist' + (u.wishlists === 1 ? '' : 's') + ', has ' + u.reviews + ' review' + (u.reviews === 1 ? '' : 's') +
        ' and is in ' + u.collections + ' collection' + (u.collections === 1 ? '' : 's') + '; all of those links and reviews are deleted with it.';
    }, function () { $('.d-usage').textContent = 'It is removed from every wishlist and collection, and its reviews are deleted.'; });
    openDlg($('.d-dialog'));
    setTimeout(function () { ($('.d-hide').hidden ? $('.d-confirm') : $('.d-hide')).focus(); }, 30);
  }
  $('.d-confirm').addEventListener('change', function () { $('.d-forever').disabled = !this.checked; });
  $('.d-hide').addEventListener('click', function () {
    var note = $('.d-note'); if (!online(note)) return;
    sb.from('products').update({ published: false }).eq('id', deleting.id).then(unwrap).then(function () {
      deleting.published = false; paintProducts(); closeDlg($('.d-dialog')); UOR.toast('Hidden from the shop');
    }, function (e) { fail(note, e); });
  });
  $('.d-forever').addEventListener('click', function () {
    var note = $('.d-note'); if (!online(note) || !$('.d-confirm').checked) return;
    sb.from('products').delete().eq('id', deleting.id).select('id').then(unwrap).then(function (r) {
      if (!r.data.length) throw new Error('permission denied');
      // its uploaded photos go too (full-size and the small copy)
      var img = deleting.image_url;
      if (img && !/^https?:/.test(img)) sb.storage.from(UOR.SUPABASE.imageBucket).remove([img, img.replace('@1600.webp', '@600.webp')]);
      products.splice(products.indexOf(deleting), 1); paintProducts(); fillPicker(); closeDlg($('.d-dialog')); UOR.toast('Deleted permanently');
      loadCollections();
    }, function (e) { fail(note, e); });
  });

  // ---- collections ---------------------------------------------------------
  function status(c) {
    var now = new Date();
    if (!c.published) return ['Draft', 's-hid'];
    if (c.starts_at && new Date(c.starts_at) > now) return ['Scheduled', 's-made_to_order'];
    if (c.ends_at && new Date(c.ends_at) <= now) return ['Ended', 's-sold_out'];
    return ['Live', 's-pub'];
  }
  function loadCollections() {
    return sb.from('collections').select('*, collection_products(product_id, sort)').order('sort').then(unwrap).then(function (r) {
      collections = r.data.map(function (c) {
        c.ids = (c.collection_products || []).sort(function (a, b) { return a.sort - b.sort; }).map(function (x) { return x.product_id; });
        return c;
      });
      paintCollections();
    }).catch(function (e) { $('.c-list').innerHTML = '<li class="empty-card">Collections could not load: ' + esc(e.message) + '</li>'; });
  }
  function byId(id) { return products.filter(function (x) { return x.id === id; })[0]; }
  function paintCollections() {
    $('.c-list').innerHTML = collections.map(function (c) {
      var s = status(c), cover = byId(c.cover_product_id || c.ids[0]);
      return '<li class="ad-card" data-slug="' + esc(c.slug) + '">' + (cover ? thumb(cover) : '<span class="ad-thumb"></span>') +
        '<div><strong>' + esc(c.title) + '</strong> <span class="ad-pill ' + s[1] + '">' + s[0] + '</span>' + (c.show_banner ? ' <span class="ad-pill">Homepage banner</span>' : '') +
        '<small>' + c.ids.length + ' pieces · ' + (c.starts_at ? 'from ' + fmtDate(c.starts_at) : 'no start date') + (c.ends_at ? ' to ' + fmtDate(c.ends_at) : '') + '</small>' +
        '<small><a href="collection.html?c=' + encodeURIComponent(c.slug) + '" target="_blank" rel="noopener">collection.html?c=' + esc(c.slug) + '</a></small></div>' +
        '<button class="btn btn-ghost c-edit" type="button">Edit</button></li>';
    }).join('') || '<li class="empty-card">No collections yet. Make one to group pieces for a festival or a season.</li>';
  }
  $('.c-list').addEventListener('click', function (e) {
    var li = e.target.closest('[data-slug]');
    if (li && e.target.closest('.c-edit')) openCollection(collections.filter(function (c) { return c.slug === li.dataset.slug; })[0]);
  });

  var cf = $('.c-form'), cEditing = null, pieces = [];
  function fillPicker() {
    $('#c-pick-list').innerHTML = products.map(function (p) { return '<option value="' + esc(p.name + ' — ' + p.id) + '">'; }).join('');
    cf.cover_product_id.innerHTML = '<option value="">First piece in the list</option>' +
      products.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('');
  }
  function toLocal(iso) {
    if (!iso) return '';
    var d = new Date(iso), z = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + 'T' + z(d.getHours()) + ':' + z(d.getMinutes());
  }
  function openCollection(c) {
    cEditing = c || null;
    cf.reset(); say($('.c-note'), '');
    $('#c-dialog-h').textContent = c ? 'Edit ' + c.title : 'New collection';
    cf.slug.readOnly = !!c;
    $('.c-delete').hidden = !c;
    var x = c || { title: '', slug: '', blurb: '', i18n: {}, sort: (collections.length + 1) * 10, ids: [] };
    cf.title.value = x.title; cf.slug.value = x.slug; cf.blurb.value = x.blurb || ''; cf.sort.value = x.sort;
    LANG2.forEach(function (l) { var t = (x.i18n || {})[l] || {}; cf[l + '_title'].value = t.title || ''; cf[l + '_blurb'].value = t.blurb || ''; });
    cf.starts_at.value = toLocal(x.starts_at); cf.ends_at.value = toLocal(x.ends_at);
    cf.cover_product_id.value = x.cover_product_id || '';
    cf.published.checked = !!x.published; cf.show_banner.checked = !!x.show_banner;
    pieces = x.ids.slice();
    paintPieces();
    openDlg($('.c-dialog'));
  }
  $('.c-new').addEventListener('click', function () { openCollection(null); });
  cf.title.addEventListener('input', function () {
    if (!cEditing) cf.slug.value = cf.title.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  });

  function paintPieces(focusId, which) {
    $('.c-pieces').innerHTML = pieces.map(function (id, i) {
      var p = byId(id);
      return '<li draggable="true" data-id="' + esc(id) + '">' + (p ? thumb(p) : '') + '<span class="c-piece-name">' + esc(p ? p.name : id) + (p && !p.published ? ' <small>(hidden)</small>' : '') + '</span>' +
        '<button type="button" class="c-up" aria-label="Move ' + esc(p ? p.name : id) + ' up"' + (i ? '' : ' disabled') + '>↑</button>' +
        '<button type="button" class="c-down" aria-label="Move ' + esc(p ? p.name : id) + ' down"' + (i < pieces.length - 1 ? '' : ' disabled') + '>↓</button>' +
        '<button type="button" class="c-rm" aria-label="Remove ' + esc(p ? p.name : id) + '">×</button></li>';
    }).join('') || '<li class="ad-empty">No pieces yet. Add some above.</li>';
    if (focusId) { var b = $('.c-pieces [data-id="' + focusId + '"] .' + which); if (b && !b.disabled) b.focus(); }
  }
  cf.querySelector('.c-pick').addEventListener('change', function () {
    var v = this.value, id = (v.split(' — ').pop() || '').trim();
    if (!byId(id)) { var hit = products.filter(function (p) { return p.name.toLowerCase() === v.trim().toLowerCase(); })[0]; id = hit && hit.id; }
    if (id && pieces.indexOf(id) < 0) { pieces.push(id); paintPieces(); }
    this.value = '';
  });
  $('.c-pieces').addEventListener('click', function (e) {
    var li = e.target.closest('li[data-id]'); if (!li) return;
    var i = pieces.indexOf(li.dataset.id);
    if (e.target.closest('.c-up') && i > 0) { pieces.splice(i - 1, 0, pieces.splice(i, 1)[0]); paintPieces(li.dataset.id, 'c-up'); }
    else if (e.target.closest('.c-down') && i < pieces.length - 1) { pieces.splice(i + 1, 0, pieces.splice(i, 1)[0]); paintPieces(li.dataset.id, 'c-down'); }
    else if (e.target.closest('.c-rm')) { pieces.splice(i, 1); paintPieces(); }
  });
  // drag to reorder
  var dragId = null;
  $('.c-pieces').addEventListener('dragstart', function (e) { var li = e.target.closest('li[data-id]'); if (!li) return; dragId = li.dataset.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  $('.c-pieces').addEventListener('dragover', function (e) {
    var li = e.target.closest('li[data-id]'); if (!li || !dragId || li.dataset.id === dragId) return;
    e.preventDefault();
    var from = pieces.indexOf(dragId), to = pieces.indexOf(li.dataset.id);
    pieces.splice(to, 0, pieces.splice(from, 1)[0]);
    paintPieces();
    var d = $('.c-pieces [data-id="' + dragId + '"]'); if (d) d.classList.add('dragging');
  });
  $('.c-pieces').addEventListener('drop', function (e) { e.preventDefault(); });
  $('.c-pieces').addEventListener('dragend', function () { dragId = null; paintPieces(); });

  cf.addEventListener('submit', function (e) {
    e.preventDefault();
    var note = $('.c-note'), slug = cf.slug.value.trim();
    if (!online(note)) return;
    if (!cf.title.value.trim()) { say(note, 'Give the collection a title.', 'err'); cf.title.focus(); return; }
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) { say(note, 'Slug: 2–40 lowercase letters, numbers or dashes.', 'err'); cf.slug.focus(); return; }
    if (!cEditing && collections.some(function (c) { return c.slug === slug; })) { say(note, 'That slug is already used.', 'err'); return; }
    var starts = cf.starts_at.value ? new Date(cf.starts_at.value).toISOString() : null, ends = cf.ends_at.value ? new Date(cf.ends_at.value).toISOString() : null;
    if (starts && ends && ends <= starts) { say(note, 'The end has to be after the start.', 'err'); cf.ends_at.focus(); return; }
    if (cf.published.checked && !pieces.length) { say(note, 'Add at least one piece before publishing.', 'err'); return; }
    var i18n = Object.assign({}, cEditing && cEditing.i18n || {});
    LANG2.forEach(function (l) {
      var t = {}, ti = cf[l + '_title'].value.trim(), bl = cf[l + '_blurb'].value.trim();
      if (ti) t.title = ti; if (bl) t.blurb = bl;
      if (Object.keys(t).length) i18n[l] = t; else delete i18n[l];
    });
    var row = { title: cf.title.value.trim(), blurb: cf.blurb.value.trim(), i18n: i18n, cover_product_id: cf.cover_product_id.value || null,
      published: cf.published.checked, show_banner: cf.show_banner.checked, sort: parseInt(cf.sort.value, 10) || 0, starts_at: starts, ends_at: ends };
    $('.c-save').disabled = true; say(note, 'Saving…');
    (cEditing ? sb.from('collections').update(row).eq('slug', slug) : sb.from('collections').insert(Object.assign({ slug: slug }, row))).then(unwrap)
      .then(function () { return sb.from('collection_products').delete().eq('collection_slug', slug).then(unwrap); })
      .then(function () {
        return pieces.length ? sb.from('collection_products').insert(pieces.map(function (id, i) { return { collection_slug: slug, product_id: id, sort: (i + 1) * 10 }; })).then(unwrap) : null;
      })
      .then(function () { return row.show_banner ? sb.from('collections').update({ show_banner: false }).neq('slug', slug).eq('show_banner', true).then(unwrap) : null; }) // one banner at a time
      .then(function () { closeDlg($('.c-dialog')); UOR.toast('Collection saved'); return loadCollections(); })
      .catch(function (err) { fail(note, err); }).then(function () { $('.c-save').disabled = false; });
  });
  $('.c-delete').addEventListener('click', function () {
    var note = $('.c-note');
    if (!cEditing || !online(note) || !confirm('Delete the collection "' + cEditing.title + '"? The pieces themselves stay in the shop.')) return;
    sb.from('collections').delete().eq('slug', cEditing.slug).then(unwrap).then(function () {
      closeDlg($('.c-dialog')); UOR.toast('Collection deleted'); loadCollections();
    }, function (e) { fail(note, e); });
  });

  // ---- reviews -------------------------------------------------------------
  function loadReviews() {
    return sb.from('reviews').select('id,product_id,name,rating,body,approved,created_at').order('created_at', { ascending: false }).limit(300)
      .then(unwrap).then(function (r) { reviews = r.data; paintReviews(); })
      .catch(function (e) { $('.r-list').innerHTML = '<li class="empty-card">Reviews could not load: ' + esc(e.message) + '</li>'; });
  }
  function paintReviews(flash) {
    var f = $('.r-filter').value, pending = reviews.filter(function (r) { return !r.approved; }).length;
    var n = $('#t-reviews .tab-n'); n.textContent = pending; n.hidden = !pending;
    var list = reviews.filter(function (r) { return f === 'all' || (f === 'pending') === !r.approved; });
    $('.r-list').innerHTML = list.map(function (r) {
      var p = byId(r.product_id) || UOR.byId(r.product_id);
      return '<li class="ad-card r-card' + (r.id === flash ? ' flash' : '') + '" id="rv-' + r.id + '" data-id="' + r.id + '">' +
        '<div><strong>' + esc(r.name) + '</strong> <span class="r-stars" aria-label="' + r.rating + ' out of 5">' + '★★★★★'.slice(0, r.rating) + '<span>' + '★★★★★'.slice(r.rating) + '</span></span>' +
        ' <span class="ad-pill ' + (r.approved ? 's-pub">Approved' : 's-made_to_order">Awaiting approval') + '</span>' +
        '<small>on <a href="product.html?id=' + encodeURIComponent(r.product_id) + '#reviews" target="_blank" rel="noopener">' + esc(p ? p.name : r.product_id) + '</a> · ' + fmtDate(r.created_at) + '</small>' +
        '<p class="r-body">' + esc(r.body) + '</p></div>' +
        '<div class="r-acts">' + (r.approved ? '<button class="btn btn-ghost r-hide" type="button">Unapprove</button>' : '<button class="btn r-ok" type="button">Approve</button>') +
        '<button class="btn btn-ghost r-no" type="button">' + (r.approved ? 'Delete' : 'Reject') + '</button></div></li>';
    }).join('') || '<li class="empty-card">' + (f === 'pending' ? 'Nothing waiting. New reviews show up here and in the bell.' : 'No reviews yet.') + '</li>';
  }
  $('.r-filter').addEventListener('change', function () { paintReviews(); });
  $('.r-list').addEventListener('click', function (e) {
    var li = e.target.closest('[data-id]'); if (!li) return;
    var r = reviews.filter(function (x) { return x.id === li.dataset.id; })[0], note = $('.p-count');
    if (!r || !online(note)) return;
    if (e.target.closest('.r-ok') || e.target.closest('.r-hide')) {
      var to = !r.approved;
      sb.from('reviews').update({ approved: to }).eq('id', r.id).then(unwrap).then(function () {
        r.approved = to; paintReviews(); markRead(notifFor(r.id)); UOR.toast(to ? 'Approved: it shows on the product page' : 'Unapproved');
      }, function (err) { UOR.toast('Not saved: ' + err.message); });
    } else if (e.target.closest('.r-no')) {
      if (!confirm('Delete this review from ' + r.name + '? This can\'t be undone.')) return;
      sb.from('reviews').delete().eq('id', r.id).then(unwrap).then(function () {
        reviews.splice(reviews.indexOf(r), 1); paintReviews(); markRead(notifFor(r.id)); UOR.toast('Review deleted');
      }, function (err) { UOR.toast('Not deleted: ' + err.message); });
    }
  });

  // ---- notifications (bell): unread rows from public.notifications, live over Realtime
  function notifFor(refId) { return notifs.filter(function (n) { return n.ref_id === refId; })[0]; }
  function paintBell() {
    var n = notifs.length, c = $('.bell-count');
    c.textContent = n > 99 ? '99+' : n; c.hidden = !n;
    $('.bell').setAttribute('aria-label', n ? 'Notifications, ' + n + ' unread' : 'Notifications, none unread');
    $('.bell-list').innerHTML = notifs.map(function (x) {
      return '<li><button type="button" class="bell-item" data-id="' + x.id + '"><span>' + esc(x.title) + '</span><small>' + fmtDate(x.created_at) + '</small></button></li>';
    }).join('') || '<li class="bell-none">You\'re all caught up.</li>';
    $('.mark-all').hidden = !n;
  }
  function loadNotifs() {
    sb.from('notifications').select('id,kind,ref_id,title,created_at').is('read_at', null).order('created_at', { ascending: false }).limit(100)
      .then(unwrap).then(function (r) { notifs = r.data; paintBell(); }).catch(function () { paintBell(); });
    sb.channel('admin-notifications').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, function (msg) {
      var row = msg.new || {};
      if (msg.eventType === 'INSERT' && !row.read_at && !notifs.some(function (x) { return x.id === row.id; })) {
        notifs.unshift(row); paintBell(); UOR.toast(row.title);
        if (row.kind === 'review') loadReviews();
      } else if (msg.eventType === 'UPDATE' && row.read_at) { // read in another tab
        notifs = notifs.filter(function (x) { return x.id !== row.id; }); paintBell();
      }
    }).subscribe();
  }
  // optimistic: the count drops at once; the row is marked read on the server so it stays gone
  function markRead(n) {
    if (!n) return;
    notifs = notifs.filter(function (x) { return x !== n; }); paintBell();
    sb.from('notifications').update({ read_at: new Date().toISOString(), read_by: me.id }).eq('id', n.id).then(unwrap)
      .catch(function () { notifs.unshift(n); paintBell(); UOR.toast("Couldn't mark it read. Check the connection."); });
  }
  function setBell(open) {
    $('.bell').setAttribute('aria-expanded', open); $('.bell-panel').hidden = !open;
    if (open) { var f = $('.bell-item') || $('.mark-all:not([hidden])'); if (f) f.focus(); }
  }
  $('.bell').addEventListener('click', function () { setBell($('.bell-panel').hidden); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.bell-wrap')) setBell(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('.bell-panel').hidden) { setBell(false); $('.bell').focus(); } });
  $('.bell-list').addEventListener('click', function (e) {
    var b = e.target.closest('.bell-item'); if (!b) return;
    var n = notifs.filter(function (x) { return String(x.id) === b.dataset.id; })[0];
    setBell(false); markRead(n);
    if (n && n.kind === 'review') {
      tab('reviews'); $('.r-filter').value = 'pending'; paintReviews(n.ref_id);
      var card = document.getElementById('rv-' + n.ref_id);
      if (card) { card.scrollIntoView({ block: 'center' }); var ok = card.querySelector('.r-ok'); if (ok) ok.focus(); }
    }
  });
  $('.mark-all').addEventListener('click', function () {
    var was = notifs; notifs = []; paintBell(); setBell(false);
    sb.from('notifications').update({ read_at: new Date().toISOString(), read_by: me.id }).is('read_at', null).then(unwrap)
      .catch(function () { notifs = was; paintBell(); UOR.toast("Couldn't mark them read. Check the connection."); });
  });

  // ---- customers (FEATURES.customers) ---------------------------------------
  function loadCustomers() {
    sb.rpc('admin_customers').then(unwrap).then(function (r) {
      $('.cu-rows').innerHTML = r.data.map(function (c) {
        return '<tr><td>' + esc(c.display_name || '—') + '</td><td>' + esc(c.email || '') + '</td><td>' + fmtDate(c.joined) + '</td><td>' + c.wishlist + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="ad-empty">No members yet.</td></tr>';
    }).catch(function (e) { $('.cu-rows').innerHTML = '<tr><td colspan="4" class="ad-empty">Could not load: ' + esc(e.message) + '</td></tr>'; });
  }

  // offline message for the admin is about saving, not browsing
  UOR.offlineBar();
  $('.offline-bar').textContent = "You're offline. Changes can't be saved until you reconnect.";
})();
