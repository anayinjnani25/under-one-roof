/* Under One Roof — Supabase backend: catalog, wishlist sync, reviews.
   Everything degrades gracefully: if Supabase is unreachable the site runs on the
   bundled catalog in data.js and keeps the wishlist in the browser. */
(function () {
  var cfg = UOR.SUPABASE, sb = null;
  try {
    if (window.supabase && cfg) sb = window.supabase.createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } });
  } catch (e) { sb = null; }
  UOR.sb = sb;

  function timeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]);
  }

  // image_url may be a full URL or just a file name inside the storage bucket
  function imageUrl(v) {
    if (!v) return undefined;
    if (/^https?:\/\//.test(v)) return v;
    return cfg.url + '/storage/v1/object/public/' + cfg.imageBucket + '/' + v.replace(/^\/+/, '');
  }

  var JEWELRY = { jhumka: 1, chandbali: 1, hoops: 1, necklace: 1, bangle: 1, pendant: 1 };
  function colorsFor(p) {
    var ok = (p.colors || []).filter(function (k) { return UOR.palettes[k]; });
    if (ok.length) return ok;
    return [JEWELRY[(p.art || {}).type] ? 'gold' : 'rust'];
  }

  // ---- catalog ------------------------------------------------------
  function loadCatalog() {
    if (!sb) return Promise.reject(new Error('Supabase client unavailable'));
    return timeout(Promise.all([
      sb.from('categories').select('slug,no,title,accent,blurb,care,feature_product_id').order('sort'),
      sb.from('products').select('id,category_slug,name,mini,description,price,colors,art,bg,image_url').order('sort')
    ]), 6000).then(function (r) {
      if (r[0].error || r[1].error) throw (r[0].error || r[1].error);
      if (!r[0].data.length || !r[1].data.length) throw new Error('catalog is empty');
      var care = {};
      var cats = r[0].data.map(function (c) {
        care[c.slug] = c.care;
        return { slug: c.slug, no: c.no, title: c.title, accent: c.accent, blurb: c.blurb, feature: c.feature_product_id };
      });
      var slugs = {};
      cats.forEach(function (c) { slugs[c.slug] = 1; });
      var prods = r[1].data.filter(function (p) { return slugs[p.category_slug]; }).map(function (p) {
        return {
          cat: p.category_slug, id: p.id, name: p.name, mini: p.mini, desc: p.description, price: p.price,
          art: p.art && p.art.type ? p.art : { type: 'pendant', style: 'coin' },
          colors: colorsFor(p), bg: p.bg, image: imageUrl(p.image_url)
        };
      });
      // a category's feature piece must exist; otherwise use its first product
      cats.forEach(function (c) {
        if (!prods.some(function (p) { return p.id === c.feature && p.cat === c.slug; })) {
          var first = prods.filter(function (p) { return p.cat === c.slug; })[0];
          c.feature = first ? first.id : null;
        }
      });
      UOR.categories = cats.filter(function (c) { return c.feature; });
      UOR.products = prods;
      UOR.care = care;
      UOR.source = 'supabase';
    });
  }

  UOR.ready = loadCatalog().catch(function (e) {
    UOR.source = 'bundled';
    if (window.console) console.warn('[Under One Roof] Using the bundled catalog:', e && e.message);
  });

  // ---- wishlist sync (anonymous Supabase user per browser) ------------
  var userP = null, anonOff = false;
  function currentUser() {
    if (!sb) return Promise.resolve(null);
    return sb.auth.getSession().then(function (r) { return r.data.session ? r.data.session.user : null; });
  }
  function ensureUser() {
    if (!sb) return Promise.reject(new Error('offline'));
    if (anonOff) return Promise.reject(new Error('Anonymous sign-ins are disabled'));
    if (!userP) {
      userP = currentUser().then(function (u) {
        if (u) return u;
        return sb.auth.signInAnonymously().then(function (r) {
          if (r.error) {
            if (/anonymous sign-ins are disabled/i.test(r.error.message)) anonOff = true; // don't retry on every heart
            throw r.error;
          }
          return r.data.user;
        });
      });
      userP.catch(function () { userP = null; });
    }
    return userP;
  }

  function pushLocal(user, ids) {
    if (!ids.length) return Promise.resolve();
    return sb.from('wishlist_items').upsert(ids.map(function (id) { return { user_id: user.id, product_id: id }; }),
      { onConflict: 'user_id,product_id', ignoreDuplicates: true });
  }

  // pull the saved list on load (only if this browser already has a visitor id)
  function pullWishlist() {
    return currentUser().then(function (u) {
      if (!u) return;
      return sb.from('wishlist_items').select('product_id').order('created_at', { ascending: false }).then(function (r) {
        if (r.error) throw r.error;
        var remote = r.data.map(function (x) { return x.product_id; }).filter(UOR.byId);
        var local = UOR.wish.all();
        var localOnly = local.filter(function (id) { return remote.indexOf(id) < 0; });
        UOR.wish.replace(localOnly.concat(remote));
        return pushLocal(u, localOnly.filter(UOR.byId));
      });
    }).catch(function (e) { if (window.console) console.info('[Under One Roof] Wishlist sync paused:', e && e.message); });
  }

  UOR.wish.onToggle = function (id, on) {
    if (!sb) return;
    ensureUser().then(function (u) {
      if (on) return pushLocal(u, [id]);
      return sb.from('wishlist_items').delete().eq('user_id', u.id).eq('product_id', id);
    }).then(function (r) {
      if (r && r.error) throw r.error;
    }).catch(function (e) {
      // anonymous sign-ins switched off, or offline: the wishlist stays in this browser
      if (window.console) console.info('[Under One Roof] Wishlist saved in this browser only:', e && e.message);
    });
  };

  if (sb) UOR.ready.then(function () {
    // first save from this browser: upload anything hearted before sync existed
    currentUser().then(function (u) {
      if (u) return pullWishlist();
      if (UOR.wish.all().length) return ensureUser().then(function (nu) { return pushLocal(nu, UOR.wish.all().filter(UOR.byId)); });
    }).catch(function () {});
  });

  // ---- reviews -------------------------------------------------------
  UOR.reviews = {
    list: function (productId) {
      if (!sb) return Promise.resolve([]);
      return timeout(sb.from('reviews').select('name,rating,body,created_at')
        .eq('product_id', productId).order('created_at', { ascending: false }).limit(50), 6000)
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    submit: function (productId, review) {
      if (!sb) return Promise.reject(new Error('Reviews are offline right now.'));
      return timeout(sb.from('reviews').insert({ product_id: productId, name: review.name, rating: review.rating, body: review.body }), 8000)
        .then(function (r) { if (r.error) throw r.error; });
    }
  };
})();
