/* Under One Roof — simple content pages: resources, blog, about, contact.
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

  // ---- resources: care text comes from the catalog (UOR.care, editable in Supabase)
  if (page === 'resources') {
    var groups = [
      { slugs: ['torans'], title: 'Torans' },
      { slugs: ['hangings'], title: 'Wall & door hangings' },
      { slugs: ['garlands'], title: 'Toran garlands' },
      { slugs: ['oxidised', 'gold-silver'], title: 'Jewelry' }
    ];
    $('.care-grid').innerHTML = groups.map(function (g) {
      var cats = g.slugs.map(UOR.cat).filter(Boolean);
      if (!cats.length) return '';
      var f = UOR.byId(cats[0].feature);
      return '<article class="care-card">' +
        (f ? '<div class="care-thumb" style="--bg:' + f.bg + '">' + UOR.art(f) + '</div>' : '') +
        '<div><h3>' + g.title + '</h3>' +
        cats.map(function (c) {
          return (cats.length > 1 ? '<p class="care-sub">' + c.title + '</p>' : '') + '<p>' + UOR.esc(UOR.care[c.slug] || '') + '</p>';
        }).join('') +
        '<a class="care-link" href="category.html?c=' + cats[0].slug + '">See the shelf →</a></div></article>';
    }).join('');
  }

  // ---- contact form
  if (page === 'contact') {
    var form = $('.contact-form'), note = $('.form-note', form), btn = $('button[type="submit"]', form);
    // signed-in members get their name and email filled in
    function prefill() {
      var me = UOR.auth.user();
      if (!me) return;
      if (!form.elements.email.value) form.elements.email.value = me.email || '';
      if (!form.elements.name.value) form.elements.name.value = UOR.auth.name() || '';
    }
    UOR.auth.ready.then(prefill);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = form.elements;
      var msg = { name: f.name.value.trim(), email: f.email.value.trim(), topic: f.topic.value, message: f.message.value.trim() };
      note.className = 'form-note';
      if (f.website.value) { form.reset(); note.textContent = 'Thank you. We\'ll write back soon.'; note.classList.add('ok'); return; } // bot trap
      if (!msg.name) { note.textContent = 'Tell us your name.'; note.classList.add('err'); f.name.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(msg.email)) { note.textContent = 'Add an email so we can reply.'; note.classList.add('err'); f.email.focus(); return; }
      if (msg.message.length < 5) { note.textContent = 'Write a few words about what you need.'; note.classList.add('err'); f.message.focus(); return; }
      btn.disabled = true; btn.textContent = 'Sending…';
      UOR.contact.send(msg).then(function () {
        form.reset();
        prefill();
        note.textContent = 'Thank you, ' + msg.name.split(/\s+/)[0] + '. Your note is with us and we\'ll reply by email.';
        note.classList.add('ok');
      }, function () {
        note.textContent = 'That didn\'t send. Check your connection and try again.';
        note.classList.add('err');
      }).then(function () { btn.disabled = false; btn.textContent = 'Send message'; });
    });
  }
});
