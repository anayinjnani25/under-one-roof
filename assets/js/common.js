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
  var PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.9-3.8 3.9-5.8 7.5-5.8s6.6 2 7.5 5.8" stroke-linecap="round"/></svg>';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  UOR.esc = esc;

  // ---- wishlist store: local first (instant, optimistic), synced to Supabase by backend.js
  // Each entry is { id, qty, colour }. Older saves were bare product ids; they're upgraded on load.
  var KEY = 'uor-wishlist', QTY_MAX = 20;
  var wish = [];
  function clampQty(n) { n = Math.round(+n) || 1; return n < 1 ? 1 : n > QTY_MAX ? QTY_MAX : n; }
  function normal(e) {
    if (typeof e === 'string') e = { id: e };
    if (!e || typeof e.id !== 'string') return null;
    return { id: e.id, qty: clampQty(e.qty), colour: typeof e.colour === 'string' && e.colour ? e.colour : null };
  }
  function dedupe(list) {
    var seen = {};
    return list.map(normal).filter(function (e) { if (!e || seen[e.id]) return false; seen[e.id] = 1; return true; });
  }
  try { wish = dedupe(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { wish = []; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(wish)); } catch (e) { /* storage blocked: keep in memory */ } }
  function find(id) { for (var i = 0; i < wish.length; i++) if (wish[i].id === id) return i; return -1; }
  // a saved colour must still exist for that piece; otherwise use its first colour
  function colourFor(id, key) {
    var p = UOR.byId(id);
    if (!p) return key || null;
    return key && p.colors.indexOf(key) > -1 ? key : p.colors[0];
  }
  UOR.QTY_MAX = QTY_MAX;
  UOR.wish = {
    has: function (id) { return find(id) > -1; },
    all: function () { return wish.map(function (e) { return e.id; }); },
    items: function () { return wish.map(function (e) { return { id: e.id, qty: e.qty, colour: colourFor(e.id, e.colour) }; }); },
    get: function (id) { var i = find(id); return i < 0 ? null : { id: id, qty: wish[i].qty, colour: colourFor(id, wish[i].colour) }; },
    // heart: add (qty 1) or remove
    toggle: function (id, colour) {
      var i = find(id), on = i < 0;
      if (on) wish.unshift({ id: id, qty: 1, colour: colourFor(id, colour) }); else wish.splice(i, 1);
      save(); sync();
      if (this.onToggle) this.onToggle(id, on, on ? wish[0] : null);
      return on;
    },
    add: function (id) { if (!this.has(id)) this.toggle(id); },
    remove: function (id) { if (this.has(id)) this.toggle(id); },
    // add or update quantity / colour; returns the saved entry
    set: function (id, change) {
      var i = find(id), e;
      if (i < 0) {
        e = { id: id, qty: clampQty(change.qty), colour: colourFor(id, change.colour) };
        wish.unshift(e); save(); sync();
        if (this.onToggle) this.onToggle(id, true, e);
        return e;
      }
      e = wish[i];
      if (change.qty != null) e.qty = clampQty(change.qty);
      if (change.colour) e.colour = colourFor(id, change.colour);
      save(); sync();
      if (this.onUpdate) this.onUpdate(e);
      return e;
    },
    replace: function (list) { wish = dedupe(list); save(); sync(); },
    onToggle: null,
    onUpdate: null
  };

  function wishCount() { return wish.filter(function (e) { return UOR.byId(e.id); }).length; }
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
      b.setAttribute('aria-label', UOR.t(on ? 'heart.remove' : 'heart.add', { name: b.dataset.name }));
    });
    renderDrawer();
    document.dispatchEvent(new CustomEvent('uor:wish')); // pages showing the list repaint on this
  }

  UOR.heartBtn = function (p) {
    var on = UOR.wish.has(p.id);
    return '<button class="heart" type="button" data-id="' + p.id + '" data-name="' + esc(p.name) + '" aria-pressed="' + on + '" aria-label="' + esc(UOR.t(on ? 'heart.remove' : 'heart.add', { name: p.name })) + '">' + HEART + '</button>';
  };

  // ---- stock: 'in_stock' | 'made_to_order' | 'sold_out' (set from the admin page)
  UOR.soldOut = function (p) { return !!p && p.stock === 'sold_out'; };
  UOR.stockBadge = function (p) {
    if (!p || !p.stock || p.stock === 'in_stock') return '';
    var sold = p.stock === 'sold_out';
    return '<span class="stock-badge' + (sold ? ' is-sold' : '') + '">' + UOR.t(sold ? 'stock.sold' : 'stock.mto') + '</span>';
  };

  // one delegated listener for every heart on the page (optimistic: UI first)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.heart[data-id]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    // sold-out pieces can be taken off the wishlist but not added to it
    if (!UOR.wish.has(b.dataset.id) && UOR.soldOut(UOR.byId(b.dataset.id))) { UOR.toast(UOR.t('stock.cantAdd')); return; }
    var on = UOR.wish.toggle(b.dataset.id, b.dataset.colour); // product page sets data-colour to the chosen colour
    if (on && !UOR.reduced()) {
      document.querySelectorAll('.heart[data-id="' + b.dataset.id + '"]').forEach(function (h) {
        h.classList.remove('pulse'); void h.offsetWidth; h.classList.add('pulse');
      });
    }
    UOR.toast(UOR.t(on ? 'wish.saved' : 'wish.removed'));
  });

  // ---- product card (section 6 rules: image pops out, heart only, name + mini, no price)
  UOR.card = function (p, href, n) {
    var num = n != null ? n : UOR.products.indexOf(p) + 1;
    return '<article class="pcard" style="--bg:' + p.bg + '" data-id="' + p.id + '" id="p-' + p.id + '">' +
      '<div class="pcard-chrome" aria-hidden="true"><i></i><i></i><i></i><span class="label">' + UOR.t('card.no') + ' ' + String(num).padStart(2, '0') + '</span></div>' +
      '<div class="pcard-frame"><div class="pcard-art">' + UOR.art(p) + '</div></div>' +
      '<div class="pcard-row">' + UOR.stockBadge(p) + UOR.heartBtn(p) + '</div>' +
      '<h3 class="pcard-name"><a href="' + href + '">' + esc(p.name) + '</a></h3>' +
      '<p class="pcard-mini">' + esc(p.mini) + '</p>' +
      '</article>';
  };
  UOR.catHref = function (p) { return 'category.html?c=' + p.cat + '#p-' + p.id; };
  UOR.productHref = function (p) { return 'product.html?id=' + p.id; };

  // ---- header / footer / drawer
  var CHEVRON = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>';
  var SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
  var IS_MAC = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);

  // active: 'products' (shelf + product pages), 'categories', 'blog', 'about', 'contact', 'account'
  function langOptions() {
    return Object.keys(UOR.LANGS).map(function (l) {
      return '<option value="' + l + '"' + (l === UOR.lang ? ' selected' : '') + ' lang="' + l + '">' + UOR.LANGS[l] + '</option>';
    }).join('');
  }
  function langButtons() {
    return Object.keys(UOR.LANGS).map(function (l) {
      return '<button type="button" class="lang-opt" data-lang="' + l + '" lang="' + l + '" aria-pressed="' + (l === UOR.lang) + '">' + UOR.LANGS[l] + '</button>';
    }).join('');
  }

  function header(active) {
    var t = UOR.t;
    var links = [
      ['index.html#shelf', t('nav.categories'), 'categories'],
      ['blog.html', t('nav.blog'), 'blog'],
      ['about.html', t('nav.about'), 'about'],
      ['contact.html', t('nav.contact'), 'contact']
    ];
    var shelves = UOR.categories.map(function (c) {
      return '<li><a href="category.html?c=' + c.slug + '">' + c.title + ' ' + c.accent + '</a></li>';
    }).join('');
    return '<a class="brand" href="index.html" aria-label="' + esc(t('nav.home')) + '">' +
      '<img class="brand-mark" src="' + UOR.LOGO + '" alt="" width="34" height="34">' +
      '<span class="brand-word" lang="en">' + WORDMARK + '</span></a>' +
      '<nav class="site-nav" aria-label="' + esc(t('nav.main')) + '">' +
      '<div class="nav-panel" id="nav-panel">' +
      '<ul class="nav-links">' +
      '<li class="has-menu"><button class="nav-top menu-toggle' + (active === 'products' ? ' is-current' : '') + '" type="button" aria-expanded="false" aria-controls="menu-products">' + t('nav.products') + CHEVRON + '</button>' +
      '<ul class="menu" id="menu-products">' + shelves + '<li class="menu-all"><a href="index.html#collection">' + t('nav.every') + '</a></li></ul></li>' +
      links.map(function (l) {
        return '<li><a class="nav-top" href="' + l[0] + '"' + (active === l[2] ? ' aria-current="page"' : '') + '>' + l[1] + '</a></li>';
      }).join('') +
      '</ul>' +
      '<div class="panel-lang" role="group" aria-label="' + esc(t('nav.lang')) + '"><span class="label">' + t('nav.lang') + '</span>' + langButtons() + '</div>' +
      '</div>' +
      '<div class="nav-tools">' +
      '<label class="lang-pick"><span class="sr-only">' + t('nav.lang') + '</span><select aria-label="' + esc(t('nav.lang')) + '">' + langOptions() + '</select></label>' +
      '<a class="acct-link" href="account.html"' + (active === 'account' ? ' aria-current="page"' : '') + ' aria-label="' + esc(t('nav.signinAria')) + '">' + PERSON +
      '<span class="acct-label">' + t('nav.signin') + '</span></a>' +
      '<button class="wish-btn" type="button" aria-haspopup="dialog" aria-controls="wishlist">' + HEART +
      '<span class="nav-opt">' + t('nav.wishlist') + '</span><span class="wish-count" data-n="' + wishCount() + '">' + wishCount() + '</span>' +
      '<span class="sr-only">' + t('nav.wishItems') + '</span></button>' +
      '<button class="search-btn" type="button" aria-haspopup="dialog" aria-controls="search" aria-keyshortcuts="' + (IS_MAC ? 'Meta+K' : 'Control+K') + '">' + SEARCH +
      '<span class="search-word">' + t('nav.search') + '</span><kbd>' + (IS_MAC ? '⌘K' : 'Ctrl K') + '</kbd></button>' +
      '<button class="menu-btn" type="button" aria-expanded="false" aria-controls="nav-panel" aria-label="' + esc(t('nav.menuOpen')) + '"><span></span><span></span><span></span></button>' +
      '</div></nav>';
  }
  // language switch: header select (wide screens) and buttons in the menu panel
  document.addEventListener('change', function (e) { if (e.target.closest('.lang-pick select')) UOR.setLang(e.target.value); });
  document.addEventListener('click', function (e) { var b = e.target.closest('.lang-opt[data-lang]'); if (b) UOR.setLang(b.dataset.lang); });

  // ---- header behaviour: Products dropdown, mobile panel ---------------
  var navMQ = window.matchMedia('(max-width: 1240px)');
  function initNav() {
    var head = document.querySelector('.site-head');
    var item = head.querySelector('.has-menu'), toggle = item.querySelector('.menu-toggle'), menu = item.querySelector('.menu');
    var panel = head.querySelector('.nav-panel'), menuBtn = head.querySelector('.menu-btn');
    var hoverT;
    function links() { return [].slice.call(menu.querySelectorAll('a')); }
    function setMenu(open, focusFirst) {
      item.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open);
      if (open && focusFirst) links()[0].focus();
    }
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    // hover opens on desktop pointers only; the panel layout uses click/tap
    item.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse' || navMQ.matches) return;
      clearTimeout(hoverT); setMenu(true);
    });
    item.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse' || navMQ.matches) return;
      hoverT = setTimeout(function () { setMenu(false); }, 160);
    });
    toggle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenu(true, true); }
    });
    menu.addEventListener('keydown', function (e) {
      var all = links(), i = all.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (i <= 0) toggle.focus(); else all[i - 1].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); all[0].focus(); }
      else if (e.key === 'End') { e.preventDefault(); all[all.length - 1].focus(); }
    });
    item.addEventListener('focusout', function (e) {
      if (!navMQ.matches && !item.contains(e.relatedTarget)) setMenu(false);
    });

    function setPanel(open) {
      panel.classList.toggle('open', open);
      head.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', open);
      menuBtn.setAttribute('aria-label', UOR.t(open ? 'nav.menuClose' : 'nav.menuOpen'));
      document.documentElement.classList.toggle('nav-locked', open);
      if (open) setTimeout(function () { toggle.focus(); }, 50);
    }
    menuBtn.addEventListener('click', function () { setPanel(!panel.classList.contains('open')); });
    // following an in-page link (e.g. index.html#shelf) should close the panel
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) { setPanel(false); setMenu(false); } });
    navMQ.addEventListener('change', function () { setPanel(false); setMenu(false); });

    document.addEventListener('click', function (e) {
      if (!item.contains(e.target) && !navMQ.matches) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (item.classList.contains('open')) { var inMenu = menu.contains(document.activeElement); setMenu(false); if (inMenu) toggle.focus(); }
      else if (panel.classList.contains('open')) { setPanel(false); menuBtn.focus(); }
    });
  }

  // ---- search overlay (Ctrl/⌘ + K) -------------------------------------
  var searchEl = null, searchOpener = null;
  function catName(slug) { var c = UOR.cat(slug); return c ? c.title + ' ' + c.accent : ''; }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function buildSearch() {
    searchEl = document.createElement('div');
    searchEl.className = 'search-layer';
    searchEl.innerHTML = '<div class="search-scrim" data-search-close></div>' +
      '<div class="search-box" id="search" role="dialog" aria-modal="true" aria-label="' + esc(UOR.t('search.dialog')) + '">' +
      '<div class="search-field">' + SEARCH +
      '<input type="search" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list" placeholder="' + esc(UOR.t('search.ph')) + '" autocomplete="off" spellcheck="false">' +
      '<button class="search-esc" type="button" data-search-close aria-label="' + esc(UOR.t('search.close')) + '"><kbd>Esc</kbd></button></div>' +
      '<ul class="search-results" id="search-results" role="listbox" aria-label="' + esc(UOR.t('search.results')) + '"></ul>' +
      '<p class="search-foot"><span><kbd>↑</kbd><kbd>↓</kbd> ' + UOR.t('search.move') + '</span><span><kbd>Enter</kbd> ' + UOR.t('search.open') + '</span><span><kbd>Esc</kbd> ' + UOR.t('search.closeHint') + '</span></p></div>';
    document.body.appendChild(searchEl);
    var input = searchEl.querySelector('input'), list = searchEl.querySelector('.search-results');
    var hits = [], cur = 0;

    function paint() {
      var q = norm(input.value).trim(), words = q.split(/\s+/).filter(Boolean);
      if (!words.length) {
        hits = UOR.categories.map(function (c) { return { cat: c }; });
      } else {
        hits = UOR.products.map(function (p) {
          // shoppers may type in English even on the Telugu/Hindi site, so search both
          var name = norm(p.name), hay = name + ' ' + norm(p.mini) + ' ' + norm(catName(p.cat)) + ' ' + norm(p.desc) + ' ' + norm(UOR.en(p, 'name')) + ' ' + norm(UOR.en(p, 'mini'));
          if (!words.every(function (w) { return hay.indexOf(w) > -1; })) return null;
          var score = words.reduce(function (s, w) { return s + (name.indexOf(w) === 0 ? 3 : name.indexOf(w) > -1 ? 2 : 0); }, 0);
          return { p: p, score: score };
        }).filter(Boolean).sort(function (a, b) { return b.score - a.score; }).slice(0, 8);
      }
      cur = 0;
      if (!hits.length) {
        list.innerHTML = '<li class="search-empty">' + UOR.t('search.none', { q: esc(input.value.trim()) }) + '</li>';
        input.removeAttribute('aria-activedescendant');
        return;
      }
      list.innerHTML = (words.length ? '' : '<li class="search-hint" role="presentation">' + UOR.t('search.browse') + '</li>') + hits.map(function (h, i) {
        if (h.cat) {
          var f = UOR.byId(h.cat.feature);
          return '<li role="option" id="sr-' + i + '" class="search-hit"><a href="category.html?c=' + h.cat.slug + '" tabindex="-1">' +
            '<span class="sr-thumb" style="--bg:' + (f ? f.bg : 'var(--paper)') + '">' + (f ? UOR.art(f) : '') + '</span>' +
            '<span class="sr-text"><strong>' + h.cat.title + ' <em>' + h.cat.accent + '</em></strong><small>' + UOR.t('search.pieces', { n: UOR.inCat(h.cat.slug).length }) + '</small></span></a></li>';
        }
        return '<li role="option" id="sr-' + i + '" class="search-hit"><a href="' + UOR.productHref(h.p) + '" tabindex="-1">' +
          '<span class="sr-thumb" style="--bg:' + h.p.bg + '">' + UOR.art(h.p) + '</span>' +
          '<span class="sr-text"><strong>' + esc(h.p.name) + '</strong><small>' + esc(h.p.mini) + ' · ' + esc(catName(h.p.cat)) + '</small></span></a></li>';
      }).join('');
      mark();
    }
    function mark() {
      var opts = list.querySelectorAll('[role="option"]');
      opts.forEach(function (o, i) { o.setAttribute('aria-selected', i === cur); });
      if (opts[cur]) { input.setAttribute('aria-activedescendant', opts[cur].id); opts[cur].scrollIntoView({ block: 'nearest' }); }
    }
    input.addEventListener('input', paint);
    input.addEventListener('keydown', function (e) {
      var n = list.querySelectorAll('[role="option"]').length;
      if (e.key === 'ArrowDown' && n) { e.preventDefault(); cur = (cur + 1) % n; mark(); }
      else if (e.key === 'ArrowUp' && n) { e.preventDefault(); cur = (cur - 1 + n) % n; mark(); }
      else if (e.key === 'Enter' && n) {
        e.preventDefault();
        var a = list.querySelectorAll('[role="option"] a')[cur];
        if (a) location.href = a.getAttribute('href');
      }
    });
    list.addEventListener('pointermove', function (e) {
      var li = e.target.closest('[role="option"]'); if (!li) return;
      var i = [].indexOf.call(list.querySelectorAll('[role="option"]'), li);
      if (i !== cur) { cur = i; mark(); }
    });
    searchEl.addEventListener('click', function (e) { if (e.target.closest('[data-search-close]')) closeSearch(); });
    // keep Tab inside the dialog
    searchEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [input, searchEl.querySelector('.search-esc')];
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    });
    searchEl.paint = paint;
  }
  function openSearch() {
    if (!searchEl) buildSearch();
    if (searchEl.classList.contains('open')) { searchEl.querySelector('input').focus(); return; }
    searchOpener = document.activeElement;
    var input = searchEl.querySelector('input');
    input.value = '';
    searchEl.paint();
    searchEl.classList.add('open');
    document.documentElement.classList.add('nav-locked');
    setTimeout(function () { input.focus(); }, 30);
  }
  function closeSearch() {
    if (!searchEl || !searchEl.classList.contains('open')) return;
    searchEl.classList.remove('open');
    if (!document.querySelector('.nav-panel.open')) document.documentElement.classList.remove('nav-locked');
    if (searchOpener && searchOpener.focus) searchOpener.focus();
  }
  UOR.openSearch = openSearch;
  document.addEventListener('click', function (e) { if (e.target.closest('.search-btn')) openSearch(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === 'k' || e.key === 'K')) {
      if (!UOR.categories || !document.querySelector('.search-btn')) return;
      e.preventDefault();
      if (searchEl && searchEl.classList.contains('open')) closeSearch(); else openSearch();
    } else if (e.key === 'Escape') closeSearch();
  });

  function footer() {
    var t = UOR.t;
    return '<div class="wrap"><div class="foot-grid">' +
      '<div><a class="brand" href="index.html"><img class="brand-mark" src="' + UOR.LOGO + '" alt="" width="34" height="34"><span class="brand-word" lang="en">' + WORDMARK + '</span></a>' +
      '<p style="margin-top:16px;max-width:26em;color:var(--brown)">' + t('foot.blurb') + '</p></div>' +
      '<div><h4>' + t('foot.shelf') + '</h4><ul>' + UOR.categories.map(function (c) {
        return '<li><a href="category.html?c=' + c.slug + '">' + c.title + ' ' + c.accent + '</a></li>';
      }).join('') + '</ul></div>' +
      '<div><h4>' + t('foot.visit') + '</h4><ul><li><a href="index.html#collection">' + t('foot.every') + '</a></li><li><a href="about.html">' + t('foot.about') + '</a></li><li><a href="blog.html">' + t('foot.journal') + '</a></li><li><a href="faq.html">' + t('foot.faq') + '</a></li><li><a href="contact.html">' + t('foot.contact') + '</a></li><li><a href="contact.html#custom">' + t('foot.custom') + '</a></li><li><a href="account.html">' + t('foot.account') + '</a></li><li><button class="wish-btn" type="button" style="padding:0;font-family:var(--f-body);font-size:inherit;letter-spacing:0;text-transform:none">' + t('foot.wishlist') + '</button></li></ul></div>' +
      '</div><div class="foot-note label"><span>© ' + new Date().getFullYear() + ' Under One Roof</span><span>' + t('foot.made') + '</span></div></div>';
  }

  function drawerShell() {
    var d = document.createElement('div');
    d.innerHTML = '<div class="scrim" data-close></div>' +
      '<aside class="drawer" id="wishlist" role="dialog" aria-modal="true" aria-labelledby="wish-title">' +
      '<div class="drawer-head"><h2 id="wish-title">' + UOR.t('wish.title') + '</h2><button class="drawer-close" type="button" data-close aria-label="' + esc(UOR.t('wish.close')) + '">×</button></div>' +
      '<ul class="drawer-list wish-rows"></ul>' + orderFoot() + '</aside>';
    while (d.firstChild) document.body.appendChild(d.firstChild);
  }

  // ---- wishlist rows, shared by the drawer and the account page --------
  function wishEntries() {
    return UOR.wish.items().map(function (e) { var p = UOR.byId(e.id); return p ? { p: p, qty: e.qty, colour: e.colour, sold: UOR.soldOut(p) } : null; }).filter(Boolean);
  }
  function orderable(rows) { return rows.filter(function (r) { return !r.sold; }); }
  UOR.stepper = function (qty, label, id) {
    var data = id ? ' data-id="' + id + '"' : '';
    return '<div class="qty" role="group" aria-label="' + esc(UOR.t('wish.qtyOf', { name: label })) + '">' +
      '<button class="qty-btn" type="button" data-step="-1"' + data + ' aria-label="' + esc(UOR.t('wish.fewer')) + '"' + (qty <= 1 ? ' disabled' : '') + '>−</button>' +
      '<output class="qty-val" aria-live="polite">' + qty + '</output>' +
      '<button class="qty-btn" type="button" data-step="1"' + data + ' aria-label="' + esc(UOR.t('wish.more')) + '"' + (qty >= QTY_MAX ? ' disabled' : '') + '>+</button></div>';
  };
  function orderFoot() {
    return '<div class="order-foot"><p class="order-sum"></p>' +
      '<a class="btn wa-order" href="contact.html" target="_blank" rel="noopener">' + UOR.WA_ICON + '<span>' + UOR.t('wish.order') + '</span></a>' +
      '<p class="order-note">' + UOR.t('wish.orderNote') + '</p></div>';
  }
  UOR.orderFoot = orderFoot;
  function summary(list) {
    var units = list.reduce(function (n, e) { return n + e.qty; }, 0);
    return UOR.t(list.length === 1 ? 'wish.piece' : 'wish.pieces', { n: list.length }) + ' · ' + UOR.t(units === 1 ? 'wish.item' : 'wish.items', { n: units });
  }
  // keep keyboard focus on the same control after a row list is redrawn
  function focusKey(el) {
    if (!el || !el.dataset || !el.dataset.id) return null;
    return el.dataset.id + '|' + (el.dataset.step || (el.classList.contains('wish-remove') ? 'remove' : ''));
  }
  UOR.renderWishRows = function (list) {
    if (!list) return;
    var key = list.contains(document.activeElement) ? focusKey(document.activeElement) : null;
    var rows = wishEntries();
    if (!rows.length) {
      list.innerHTML = '<li class="drawer-empty"><span class="stamp">' + UOR.t('wish.emptyStamp') + '</span>' + UOR.t('wish.emptyText') + '</li>';
    } else {
      list.innerHTML = rows.map(function (r) {
        var p = r.p;
        return '<li class="drawer-item' + (r.sold ? ' is-sold' : '') + '"><a class="drawer-thumb" href="' + UOR.productHref(p) + '" style="--bg:' + p.bg + '" tabindex="-1" aria-hidden="true">' + UOR.art(p, r.colour) + '</a>' +
          '<div class="wish-info"><a class="wish-name" href="' + UOR.productHref(p) + '">' + esc(p.name) + '</a>' +
          '<small>' + esc(UOR.palName(r.colour)) + '</small>' +
          (r.sold ? '<p class="sold-note">' + UOR.stockBadge(p) + ' ' + UOR.t('stock.leftOut') + '</p>' : '') +
          '<div class="wish-controls">' + (r.sold ? '' : UOR.stepper(r.qty, p.name, p.id)) +
          '<button class="wish-remove" type="button" data-id="' + p.id + '" aria-label="' + esc(UOR.t('wish.removeAria', { name: p.name })) + '">' + UOR.t('wish.remove') + '</button></div></div></li>';
      }).join('');
    }
    if (key) {
      var parts = key.split('|'), sel = parts[1] === 'remove' ? '.wish-remove' : '[data-step="' + parts[1] + '"]';
      var el = list.querySelector(sel + '[data-id="' + parts[0] + '"]');
      if (el && !el.disabled) el.focus(); else { var any = list.querySelector('[data-id="' + parts[0] + '"]:not([disabled])'); if (any) any.focus(); }
    }
    // order footer(s) next to this list
    var foot = list.parentElement.querySelector('.order-foot');
    if (foot) {
      var ok = orderable(rows);
      foot.querySelector('.order-sum').textContent = !rows.length ? UOR.t('wish.empty') : !ok.length ? UOR.t('stock.allSold') : summary(ok);
      var btn = foot.querySelector('.wa-order');
      btn.classList.toggle('is-disabled', !ok.length);
      btn.setAttribute('aria-disabled', !ok.length);
      if (UOR.wa()) btn.href = UOR.wa(orderText(ok));
      else { btn.href = 'contact.html'; btn.removeAttribute('target'); }
    }
  };

  // the WhatsApp order message (always English, so the shop can read it);
  // stays under ~1800 characters by dropping links first
  function orderText(rows) {
    var first = UOR.auth && UOR.auth.user && UOR.auth.user() && UOR.auth.name ? (UOR.auth.name() || '').split(/\s+/)[0] : '';
    var head = 'Hi Under One Roof!' + (first ? ' I\'m ' + first + '.' : '') + ' I\'d like to order these pieces. Could you share the price and availability?';
    var units = rows.reduce(function (n, r) { return n + r.qty; }, 0);
    var tail = 'Total: ' + units + (units === 1 ? ' item' : ' items');
    function build(withLinks, upto) {
      var lines = rows.slice(0, upto).map(function (r, i) {
        var line = (i + 1) + '. ' + UOR.en(r.p, 'name') + (r.colour ? ' (' + UOR.palNameEn(r.colour) + ')' : '') + ' × ' + r.qty;
        return withLinks ? line + '\n   ' + new URL(UOR.productHref(r.p), location.href).href : line;
      });
      if (upto < rows.length) lines.push('…and ' + (rows.length - upto) + ' more pieces from my wishlist');
      return head + '\n\n' + lines.join('\n') + '\n\n' + tail;
    }
    var text = build(true, rows.length);
    if (text.length > 1800) text = build(false, rows.length);
    for (var n = rows.length - 1; text.length > 1800 && n > 0; n--) text = build(false, n);
    return text;
  }
  UOR.orderText = function () { return orderText(orderable(wishEntries())); }; // sold-out pieces are left out

  function renderDrawer() { UOR.renderWishRows(document.querySelector('.drawer-list')); }

  // stepper, Remove and Order controls anywhere a wishlist row list is shown
  document.addEventListener('click', function (e) {
    var step = e.target.closest('.qty-btn[data-id]');
    if (step) {
      var cur = UOR.wish.get(step.dataset.id);
      if (cur) UOR.wish.set(step.dataset.id, { qty: cur.qty + (+step.dataset.step) });
      return;
    }
    var rm = e.target.closest('.wish-remove[data-id]');
    if (rm) {
      var p = UOR.byId(rm.dataset.id);
      UOR.wish.remove(rm.dataset.id);
      UOR.toast(UOR.t('wish.removedNamed', { name: p ? p.name : '' }));
      return;
    }
    var order = e.target.closest('.wa-order');
    if (order) {
      if (order.classList.contains('is-disabled')) {
        e.preventDefault();
        UOR.toast(UOR.t(wishEntries().length ? 'stock.allSold' : 'wish.addFirst'));
        return;
      }
      if (UOR.wa()) order.href = UOR.wa(UOR.orderText()); // latest quantities and name
      var left = wishEntries().filter(function (r) { return r.sold; }).length;
      if (left) UOR.toast(UOR.t('stock.someLeft', { n: left }));
    }
  });

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

  // ---- WhatsApp ------------------------------------------------------
  UOR.WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89a11.82 11.82 0 0 0-3.48-8.41Z"/></svg>';
  // wa.me link with a ready-to-send message, or null while no number is configured
  UOR.wa = function (text) {
    var digits = String((UOR.WHATSAPP || {}).number || '').replace(/\D/g, '');
    if (digits.length < 8) return null;
    return 'https://wa.me/' + digits + (text ? '?text=' + encodeURIComponent(text) : '');
  };
  // pages can set what the corner button pre-fills (e.g. the product being viewed)
  UOR.waContext = 'Hi Under One Roof! I have a question.';
  function waFloat() {
    if (!UOR.wa() || document.querySelector('.wa-float')) return;
    var a = document.createElement('a');
    a.className = 'wa-float';
    a.target = '_blank'; a.rel = 'noopener';
    a.href = UOR.wa(UOR.waContext);
    a.setAttribute('aria-label', UOR.t('wa.chat'));
    a.innerHTML = UOR.WA_ICON + '<span class="wa-tip" aria-hidden="true">' + UOR.t('wa.tip') + '</span>';
    // read the context at click time so it reflects the page's latest state
    a.addEventListener('click', function () { a.href = UOR.wa(UOR.waContext); });
    document.body.appendChild(a);
  }

  // ---- recently viewed: last 8 pieces opened, newest first, this browser only
  var RECENT_KEY = 'uor-recent';
  UOR.recent = {
    list: function () {
      try { return (JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') || []).filter(function (id) { return typeof id === 'string'; }); }
      catch (e) { return []; }
    },
    add: function (id) {
      var l = this.list().filter(function (x) { return x !== id; });
      l.unshift(id);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(l.slice(0, 8))); } catch (e) { /* storage blocked */ }
    },
    clear: function () { try { localStorage.removeItem(RECENT_KEY); } catch (e) { /* ignore */ } }
  };
  // strip of small cards just above the footer; skips the piece currently open and hides when empty
  UOR.renderRecent = function (currentId) {
    var foot = document.querySelector('.site-foot');
    if (!foot) return;
    var sec = document.querySelector('.recent');
    var items = UOR.recent.list().filter(function (id) { return id !== currentId; }).map(UOR.byId).filter(Boolean);
    if (!items.length) { if (sec) sec.remove(); return; }
    if (!sec) {
      sec = document.createElement('section');
      sec.className = 'recent';
      sec.setAttribute('aria-labelledby', 'recent-h');
      foot.parentNode.insertBefore(sec, foot);
    }
    sec.innerHTML = '<div class="wrap"><div class="recent-head"><h2 id="recent-h">' + UOR.t('recent.title') + '</h2>' +
      '<button class="link-btn recent-clear" type="button">' + UOR.t('recent.clear') + '</button></div>' +
      '<ul class="recent-row">' + items.map(function (p) {
        return '<li><a class="recent-card" href="' + UOR.productHref(p) + '" style="--bg:' + p.bg + '"><span class="recent-art">' + UOR.art(p) + '</span>' +
          '<span class="recent-name">' + esc(p.name) + '</span></a></li>';
      }).join('') + '</ul></div>';
  };
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.recent-clear')) return;
    UOR.recent.clear();
    var sec = document.querySelector('.recent');
    if (sec) sec.remove();
  });

  // ---- offline: a small banner; the shop keeps running on the bundled catalog
  UOR.offlineBar = function (msgKey) {
    var bar = document.createElement('div');
    bar.className = 'offline-bar'; bar.setAttribute('role', 'status'); bar.hidden = navigator.onLine !== false;
    bar.textContent = UOR.t(msgKey || 'off.msg');
    document.body.appendChild(bar);
    function paint() { bar.hidden = navigator.onLine !== false; document.body.classList.toggle('is-offline', !bar.hidden); }
    window.addEventListener('online', paint);
    window.addEventListener('offline', paint);
    paint();
  };

  UOR.chrome = function (active) {
    UOR.offlineBar();
    var h = document.querySelector('.site-head');
    h.innerHTML = header(active);
    initNav();
    var f = document.querySelector('.site-foot');
    if (f) f.innerHTML = footer();
    drawerShell();
    renderDrawer();
    waFloat();
    UOR.applyStatic(document);
    UOR.renderRecent(null); // product pages redraw it to skip the piece that's open
    if (UOR.paintAccount) UOR.paintAccount();
  };

  // header turns solid once the page has moved; called from each page's single scroll handler
  UOR.headSolid = function (on) {
    var h = document.querySelector('.site-head');
    if (h) h.classList.toggle('solid', on);
  };

  UOR.query = function (k) { return new URLSearchParams(location.search).get(k); };
})();
