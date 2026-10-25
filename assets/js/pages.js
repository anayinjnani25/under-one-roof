/* Under One Roof — simple content pages: blog, about, contact.
   Each page sets <body data-page="…">; this file draws the shared chrome and
   whatever that page needs from the catalog or Supabase. */
UOR.ready.then(function () {
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

  // ---- contact: compose a message, then hand it to WhatsApp
  if (page === 'contact') {
    var form = $('.wa-form'), note = $('.form-note', form), btn = $('.wa-go', form);
    $('.wa-ico', btn).innerHTML = UOR.WA_ICON;
    // tell shoppers whose name they'll see in WhatsApp, so the chat doesn't look unfamiliar
    var cfg = UOR.WHATSAPP || {};
    if (UOR.wa() && cfg.chatName) {
      $('.wa-who').innerHTML = 'In WhatsApp you\'ll be chatting with <strong>' + UOR.esc(cfg.chatName) + '</strong> (' + UOR.esc(cfg.number) + ').';
      $('.wa-who').hidden = false;
    }
    if (!UOR.wa()) {
      // no number configured yet: say so instead of offering a dead button
      btn.disabled = true;
      note.textContent = 'WhatsApp chat is being set up. Please check back soon.';
      form.querySelectorAll('input, select, textarea').forEach(function (el) { el.disabled = true; });
    }
    UOR.auth.ready.then(function () {
      if (UOR.auth.user() && !form.elements.name.value) form.elements.name.value = (UOR.auth.name() || '').split(/\s+/)[0];
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements, name = f.name.value.trim(), topic = f.topic.value, msg = f.message.value.trim();
      note.className = 'form-note';
      if (!msg) { note.textContent = 'Write a few words first.'; note.classList.add('err'); f.message.focus(); return; }
      var text = 'Hi Under One Roof!' + (name ? ' I\'m ' + name + '.' : '') + (topic ? ' This is about ' + topic + '.' : '') + '\n\n' + msg;
      var url = UOR.wa(text);
      if (!url) return;
      var win = window.open(url, '_blank');
      if (win) win.opener = null;
      else location.href = url; // pop-up blocked: open in this tab instead
      note.textContent = 'WhatsApp is opening. Press send there to reach us.';
      note.classList.add('ok');
    });
  }
});
