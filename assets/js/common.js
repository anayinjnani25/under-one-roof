/* Under One Roof — shared chrome: header, footer, wishlist, product cards. */
window.UOR = window.UOR || {};

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  UOR.reduced = function () { return reduced.matches; };

  // Logo lives in one file. Replace assets/logo/mark.svg (and the wordmark text
  // below, if the real logo includes the name) and every placement updates.
  UOR.LOGO = 'assets/logo/mark.svg';
  var WORDMARK = 'Under <em>One</em> Roof';

  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.8 4.2 7.2 4.2c2 0 3.6 1.1 4.8 2.9 1.2-1.8 2.8-2.9 4.8-2.9 3.4 0 5.6 3.4 4.4 6.9-1.7 4.8-9.2 9.4-9.2 9.4z"/></svg>';
  UOR.HEART = HEART;

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  UOR.esc = esc;

  // ---- wishlist store: local first (instant, optimistic), synced to Supabase by backend.js
  var KEY = 'uor-wishlist';
  var wish = [];
  try { wish = JSON.parse(localStorage.getItem(KEY) || '[]').filter(function (id) { return typeof id === 'string'; }); } catch (e) { wish = []; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(wish)); } catch (e) { /* storage blocked: keep in memory */ } }
  UOR.wish = {
    has: function (id) { return wish.indexOf(id) > -1; },
    all: function () { return wish.slice(); },
    toggle: function (id) {
      var on = !this.has(id);
      if (on) wish.unshift(id); else wish.splice(wish.indexOf(id), 1);
      save(); sync(id);
      if (this.onToggle) this.onToggle(id, on);
      return on;
    },
    add: function (id) { if (!this.has(id)) this.toggle(id); },
    replace: function (ids) {
      wish = ids.filter(function (id, i) { return ids.indexOf(id) === i; });
      save(); sync();
    },
    onToggle: null
  };

  function wishCount() { return wish.filter(UOR.byId).length; }
  function sync() {
    var n = wishCount();
    document.querySelectorAll('.wish-count').forEach(function (el) {
      el.textContent = n; el.dataset.n = n;
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      setTimeout(function () { el.classList.remove('bump'); }, 400);
    });
    document.querySelectorAll('.heart[data-id]').forEach(function (b) {
      var on = UOR.wish.has(b.dataset.id);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + b.dataset.name + (on ? ' from' : ' to') + ' wishlist');
    });
    renderDrawer();
  }

  UOR.heartBtn = function (p) {
    var on = UOR.wish.has(p.id);
    return '<button class="heart" type="button" data-id="' + p.id + '" data-name="' + esc(p.name) + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Remove ' : 'Add ') + esc(p.name) + (on ? ' from' : ' to') + ' wishlist">' + HEART + '</button>';
  };

  // one delegated listener for every heart on the page (optimistic: UI first)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.heart[data-id]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var on = UOR.wish.toggle(b.dataset.id);
    if (on && !UOR.reduced()) {
      document.querySelectorAll('.heart[data-id="' + b.dataset.id + '"]').forEach(function (h) {
        h.classList.remove('pulse'); void h.offsetWidth; h.classList.add('pulse');
      });
    }
    UOR.toast(on ? 'Saved to your wishlist' : 'Removed from your wishlist');
  });

  // ---- product card (section 6 rules: image pops out, heart only, name + mini, no price)
  UOR.card = function (p, href, n) {
    var num = n != null ? n : UOR.products.indexOf(p) + 1;
    return '<article class="pcard" style="--bg:' + p.bg + '" data-id="' + p.id + '" id="p-' + p.id + '">' +
      '<div class="pcard-chrome" aria-hidden="true"><i></i><i></i><i></i><span class="label">No. ' + String(num).padStart(2, '0') + '</span></div>' +
      '<div class="pcard-frame"><div class="pcard-art">' + UOR.art(p) + '</div></div>' +
      '<div class="pcard-row">' + UOR.heartBtn(p) + '</div>' +
      '<h3 class="pcard-name"><a href="' + href + '">' + esc(p.name) + '</a></h3>' +
      '<p class="pcard-mini">' + esc(p.mini) + '</p>' +
      '</article>';
  };
  UOR.catHref = function (p) { return 'category.html?c=' + p.cat + '#p-' + p.id; };
  UOR.productHref = function (p) { return 'product.html?id=' + p.id; };

  // ---- header / footer / drawer
  function header(active) {
    var links = [
      ['index.html#shelf', 'Shop', 'shop'],
      ['category.html?c=torans', 'Torans', 'torans'],
      ['category.html?c=garlands', 'Garlands', 'garlands'],
      ['category.html?c=oxidised', 'Jewelry', 'jewelry']
    ];
    return '<a class="brand" href="index.html" aria-label="Under One Roof — home">' +
      '<img class="brand-mark" src="' + UOR.LOGO + '" alt="" width="34" height="34">' +
      '<span class="brand-word">' + WORDMARK + '</span></a>' +
      '<nav class="site-nav" aria-label="Main">' +
      links.map(function (l, i) {
        return '<a class="' + (i ? 'nav-opt' : '') + '" href="' + l[0] + '"' + (active === l[2] ? ' aria-current="page"' : '') + '>' + l[1] + '</a>';
      }).join('') +
      '<button class="wish-btn" type="button" aria-haspopup="dialog" aria-controls="wishlist">' + HEART +
      '<span class="nav-opt">Wishlist</span><span class="wish-count" data-n="' + wishCount() + '">' + wishCount() + '</span>' +
      '<span class="sr-only"> items in wishlist</span></button></nav>';
  }

  function footer() {
    return '<div class="wrap"><div class="foot-grid">' +
      '<div><a class="brand" href="index.html"><img class="brand-mark" src="' + UOR.LOGO + '" alt="" width="34" height="34"><span class="brand-word">' + WORDMARK + '</span></a>' +
      '<p style="margin-top:16px;max-width:26em;color:var(--brown)">Torans, garlands, hangings and jewelry, every piece made by hand in small batches. No two come out quite the same.</p></div>' +
      '<div><h4>The shelf</h4><ul>' + UOR.categories.map(function (c) {
        return '<li><a href="category.html?c=' + c.slug + '">' + c.title + ' ' + c.accent + '</a></li>';
      }).join('') + '</ul></div>' +
      '<div><h4>Visit</h4><ul><li><a href="index.html#collection">Every piece</a></li><li><button class="wish-btn" type="button" style="padding:0;font-family:var(--f-body);font-size:inherit;letter-spacing:0;text-transform:none">Your wishlist</button></li></ul></div>' +
      '</div><div class="foot-note label"><span>© ' + new Date().getFullYear() + ' Under One Roof</span><span>Made by hand · Stitched in rust</span></div></div>';
  }

  function drawerShell() {
    var d = document.createElement('div');
    d.innerHTML = '<div class="scrim" data-close></div>' +
      '<aside class="drawer" id="wishlist" role="dialog" aria-modal="true" aria-labelledby="wish-title">' +
      '<div class="drawer-head"><h2 id="wish-title">Wish<em>list</em></h2><button class="drawer-close" type="button" data-close aria-label="Close wishlist">×</button></div>' +
      '<ul class="drawer-list"></ul></aside>';
    while (d.firstChild) document.body.appendChild(d.firstChild);
  }

  function renderDrawer() {
    var list = document.querySelector('.drawer-list');
    if (!list) return;
    var items = wish.map(UOR.byId).filter(Boolean); // skip pieces no longer in the catalog
    if (!items.length) {
      list.innerHTML = '<li class="drawer-empty"><span class="stamp">Nothing<br>saved<br>yet</span>Tap the heart on any piece to keep it here.</li>';
      return;
    }
    list.innerHTML = items.map(function (p) {
      return '<li class="drawer-item"><div class="drawer-thumb" style="--bg:' + p.bg + '">' + UOR.art(p) + '</div>' +
        '<div><a href="' + UOR.productHref(p) + '">' + esc(p.name) + '</a><small>' + esc(p.mini) + '</small></div>' + UOR.heartBtn(p) + '</li>';
    }).join('');
  }

  var lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    document.querySelector('.drawer').classList.add('open');
    document.querySelector('.scrim').classList.add('open');
    setTimeout(function () { document.querySelector('.drawer-close').focus(); }, 60);
  }
  function closeDrawer() {
    var d = document.querySelector('.drawer');
    if (!d || !d.classList.contains('open')) return;
    d.classList.remove('open');
    document.querySelector('.scrim').classList.remove('open');
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('.wish-btn')) openDrawer();
    else if (e.target.closest('[data-close]')) closeDrawer();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });

  var toastEl, toastT;
  UOR.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast'; toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  };

  UOR.chrome = function (active) {
    var h = document.querySelector('.site-head');
    h.innerHTML = header(active);
    var f = document.querySelector('.site-foot');
    if (f) f.innerHTML = footer();
    drawerShell();
    renderDrawer();
  };

  // header turns solid once the page has moved; called from each page's single scroll handler
  UOR.headSolid = function (on) {
    var h = document.querySelector('.site-head');
    if (h) h.classList.toggle('solid', on);
  };

  UOR.query = function (k) { return new URLSearchParams(location.search).get(k); };
})();
