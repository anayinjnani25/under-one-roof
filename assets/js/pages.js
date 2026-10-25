/* Under One Roof — simple content pages: blog, about, contact, faq.
   Each page sets <body data-page="…">; this file draws the shared chrome and
   whatever that page needs. Messages sent to the shop's WhatsApp stay in English. */
UOR.ready.then(function () {
  var t = UOR.t;
  var page = document.body.dataset.page;
  UOR.chrome(page);
  var $ = function (s, el) { return (el || document).querySelector(s); };

  window.addEventListener('scroll', function () { UOR.headSolid(scrollY > 10); }, { passive: true });
  UOR.headSolid(scrollY > 10);

  // decorative product illustrations: <div data-art="product-id">
  document.querySelectorAll('[data-art]').forEach(function (el) {
    var p = UOR.byId(el.dataset.art);
    if (p) el.innerHTML = UOR.art(p);
  });

  function openWhatsApp(text) {
    var url = UOR.wa(text);
    if (!url) { location.href = 'contact.html'; return false; }
    var win = window.open(url, '_blank');
    if (win) win.opener = null;
    else location.href = url; // pop-up blocked: open in this tab instead
    return true;
  }
  function say(note, msg, kind) { note.textContent = msg; note.className = 'form-note' + (kind ? ' ' + kind : ''); }

  // ---- contact: chat form + custom order request
  if (page === 'contact') {
    var form = $('.wa-form'), note = $('.form-note', form);
    document.querySelectorAll('.wa-ico').forEach(function (el) { el.innerHTML = UOR.WA_ICON; });
    customOrder(); // build the custom form first, so the "not set up yet" state below covers it too
    // tell shoppers whose name they'll see in WhatsApp, so the chat doesn't look unfamiliar
    var cfg = UOR.WHATSAPP || {};
    if (UOR.wa() && cfg.chatName) {
      $('.wa-who').innerHTML = t('ct.who', { name: '<strong>' + UOR.esc(cfg.chatName) + '</strong>', number: UOR.esc(cfg.number) });
      $('.wa-who').hidden = false;
    }
    if (!UOR.wa()) {
      // no number configured yet: say so instead of offering dead buttons
      document.querySelectorAll('.wa-form, .custom-form').forEach(function (f) {
        f.querySelector('.wa-go').disabled = true;
        say(f.querySelector('.form-note'), t('ct.soon'));
        f.querySelectorAll('input, select, textarea, button').forEach(function (el) { el.disabled = true; });
      });
    }
    UOR.auth.ready.then(function () {
      if (UOR.auth.user() && !form.elements.name.value) form.elements.name.value = (UOR.auth.name() || '').split(/\s+/)[0];
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, name = f.name.value.trim(), topic = f.topic.value, msg = f.message.value.trim();
      if (!msg) { say(note, t('ct.needMsg'), 'err'); f.message.focus(); return; }
      var text = 'Hi Under One Roof!' + (name ? ' I\'m ' + name + '.' : '') + (topic ? ' This is about ' + topic + '.' : '') + '\n\n' + msg;
      if (openWhatsApp(text)) say(note, t('ct.opening'), 'ok');
    });
  }

  function customOrder() {
    var cf = $('.custom-form');
    if (!cf) return;
    var f = cf.elements, cnote = $('.form-note', cf);
    var JEWELRY = { oxidised: 1, 'gold-silver': 1 };
    // option values are English (they go into the WhatsApp message); labels follow the page language
    var SIZES = {
      wide: [['As shown', 'cu.s.asShown'], ['Wider', 'cu.s.wider'], ['Narrower', 'cu.s.narrower'], ['Exact measurement', 'cu.s.exact']],
      long: [['As shown', 'cu.s.asShown'], ['Longer', 'cu.s.longer'], ['Shorter', 'cu.s.shorter'], ['Exact measurement', 'cu.s.exact']],
      jewel: [['As shown', 'cu.s.asShown'], ['Smaller', 'cu.s.smaller'], ['Larger', 'cu.s.larger']],
      none: [['Described in the notes', 'cu.s.notes'], ['Exact measurement', 'cu.s.exact']]
    };
    var qty = 1, qtyBox = $('.cu-qty', cf);

    // base piece, grouped by shelf
    f.base.innerHTML = '<option value="">' + t('cu.choose') + '</option>' +
      UOR.categories.map(function (c) {
        return '<optgroup label="' + UOR.esc(c.title + ' ' + c.accent) + '">' +
          UOR.inCat(c.slug).map(function (p) { return '<option value="' + p.id + '">' + UOR.esc(p.name) + '</option>'; }).join('') + '</optgroup>';
      }).join('') +
      '<option value="new">' + t('cu.new') + '</option>';

    function piece() { return UOR.byId(f.base.value); }
    function sizeKind() {
      var p = piece();
      if (!p) return 'none';
      if (JEWELRY[p.cat]) return 'jewel';
      return p.cat === 'hangings' ? 'long' : 'wide';
    }
    function fillColours(keep) {
      var p = piece();
      var keys = p ? p.colors : [];
      f.colour.innerHTML = (p ? '' : '<option value="">' + t('cu.colourLater') + '</option>') +
        keys.map(function (k) { return '<option value="' + k + '">' + UOR.esc(UOR.palName(k)) + '</option>'; }).join('') +
        '<option value="other">' + t('cu.otherColour') + '</option>';
      if (keep && keys.indexOf(keep) > -1) f.colour.value = keep;
      syncColour();
    }
    function fillSizes() {
      f.size.innerHTML = SIZES[sizeKind()].map(function (s) { return '<option value="' + s[0] + '">' + t(s[1]) + '</option>'; }).join('');
      syncSize();
    }
    function syncColour() { $('.colour-other', cf).hidden = f.colour.value !== 'other'; }
    function syncSize() { $('.size-measure', cf).hidden = /^As shown$|^Described/.test(f.size.value); }
    function paintQty() { qtyBox.innerHTML = UOR.stepper(qty, t('cu.qty')); }
    f.base.addEventListener('change', function () { fillColours(); fillSizes(); });
    f.colour.addEventListener('change', syncColour);
    f.size.addEventListener('change', syncSize);
    qtyBox.addEventListener('click', function (e) {
      var b = e.target.closest('.qty-btn'); if (!b) return;
      qty = Math.min(UOR.QTY_MAX, Math.max(1, qty + (+b.dataset.step)));
      var which = b.dataset.step; paintQty();
      var again = qtyBox.querySelector('[data-step="' + which + '"]');
      (again && !again.disabled ? again : qtyBox.querySelector('.qty-btn:not([disabled])')).focus();
    });
    f.needBy.min = new Date().toISOString().slice(0, 10);

    // arriving from "Request a custom version" on a piece: ?custom=<id>&colour=<key>
    var pre = UOR.query('custom');
    if (pre && UOR.byId(pre)) f.base.value = pre;
    fillColours(UOR.query('colour'));
    fillSizes();
    paintQty();
    if (pre) setTimeout(function () { $('#custom').scrollIntoView({ block: 'start' }); }, 50);

    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var p = piece(), isNew = f.base.value === 'new';
      var colourOther = f.colourOther.value.trim(), measure = f.measure.value.trim(), notes = f.notes.value.trim();
      if (!p && !isNew) { say(cnote, t('cu.errBase'), 'err'); f.base.focus(); return; }
      if (f.colour.value === 'other' && !colourOther) { say(cnote, t('cu.errColour'), 'err'); f.colourOther.focus(); return; }
      if (f.size.value === 'Exact measurement' && !measure) { say(cnote, t('cu.errMeasure'), 'err'); f.measure.focus(); return; }
      if (isNew && notes.length < 5) { say(cnote, t('cu.errNotes'), 'err'); f.notes.focus(); return; }

      var lines = ['Hi Under One Roof! I\'d like a custom piece.', ''];
      lines.push('Base piece: ' + (p ? UOR.en(p, 'name') + ' (' + new URL(UOR.productHref(p), location.href).href.replace(/[?&]lang=\w+/, '') + ')' : 'Something new'));
      lines.push('Colour: ' + (f.colour.value === 'other' ? 'Another colour — ' + colourOther : f.colour.value ? UOR.palNameEn(f.colour.value) : 'To decide together'));
      lines.push('Size: ' + f.size.value + (measure && !/^As shown$|^Described/.test(f.size.value) ? ' — ' + measure : ''));
      lines.push('Quantity: ' + qty);
      var occasion = f.occasion.value.trim(), date = f.needBy.value;
      if (date) lines.push('Needed by: ' + new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + (occasion ? ' (' + occasion + ')' : ''));
      else if (occasion) lines.push('Occasion: ' + occasion);
      if (notes) lines.push('Notes: ' + notes);
      if (openWhatsApp(lines.join('\n'))) say(cnote, t('ct.opening'), 'ok');
    });
  }

  // ---- FAQ accordion (open the question or section named in the URL)
  if (page === 'faq') {
    var faqWa = $('.faq-wa');
    $('.wa-ico', faqWa).innerHTML = UOR.WA_ICON;
    if (UOR.wa()) faqWa.href = UOR.wa('Hi Under One Roof! I have a question.');
    else { faqWa.removeAttribute('target'); faqWa.removeAttribute('rel'); }

    function setOpen(btn, open) {
      btn.setAttribute('aria-expanded', open);
      document.getElementById(btn.getAttribute('aria-controls')).hidden = !open;
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('.faq-q'); if (!b) return;
      setOpen(b, b.getAttribute('aria-expanded') !== 'true');
    });
    function fromHash() {
      var el = location.hash && document.getElementById(location.hash.slice(1));
      if (!el) return;
      var btns = el.classList.contains('faq-item') ? [el.querySelector('.faq-q')] : [].slice.call(el.querySelectorAll('.faq-q'));
      btns.forEach(function (b) { setOpen(b, true); });
      el.scrollIntoView({ block: 'start' });
    }
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }
});
