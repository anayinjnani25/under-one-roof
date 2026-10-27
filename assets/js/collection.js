/* Under One Roof — one curated collection: collection.html?c=<slug>.
   Collections are made on the admin page; only live ones (published, inside their dates) show. */
UOR.ready.then(function () {
  var t = UOR.t;
  var $ = function (s) { return document.querySelector(s); };
  UOR.chrome('products');
  window.addEventListener('scroll', function () { UOR.headSolid(scrollY > 10); }, { passive: true });
  UOR.headSolid(scrollY > 10);

  var slug = UOR.query('c');
  UOR.collections().then(function (list) {
    var c = list.filter(function (x) { return x.slug === slug; })[0];
    if (!c) {
      $('.col-title').textContent = t('col.goneShort');
      $('.col-missing').hidden = false;
      return;
    }
    document.title = c.title + ' — Under One Roof';
    $('.col-title').textContent = c.title;
    $('.col-blurb').textContent = c.blurb;
    $('.col-count').textContent = t('search.pieces', { n: c.ids.length });
    var cover = UOR.byId(c.cover);
    if (cover) {
      $('.col-cover').innerHTML = '<div class="polaroid place" style="--r:-4deg"><span class="tape tc t-gold"></span>' +
        '<div class="window" style="--bg:' + cover.bg + '"></div><div class="breakout cutout">' + UOR.art(cover) + '</div>' +
        '<div class="caption"><span class="at-script">' + UOR.esc(cover.name) + '</span></div></div>';
    }
    UOR.waContext = 'Hi Under One Roof! I have a question about the ' + c.title + ' collection.';
    $('.col-grid').innerHTML = c.ids.map(function (id, i) {
      var p = UOR.byId(id);
      return '<li>' + UOR.clip(p, UOR.productHref(p), i) + '</li>';
    }).join('');
    UOR.tearAll(); UOR.observe();
  });
});
