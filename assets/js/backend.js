/* Under One Roof — Supabase backend: catalog, shopper accounts, wishlist sync, reviews.
   Everything degrades gracefully: if Supabase is unreachable the site runs on the
   bundled catalog in data.js, and guests always keep their wishlist in the browser. */
(function () {
  var cfg = UOR.SUPABASE, sb = null;
  try {
    if (window.supabase && cfg) {
      sb = window.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
  } catch (e) { sb = null; }
  UOR.sb = sb;

  function log(msg, e) { if (window.console) console.info('[Under One Roof] ' + msg, e && e.message ? e.message : e || ''); }
  function timeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]);
  }
  function unwrap(r) { if (r && r.error) throw r.error; return r; }

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
      sb.from('categories').select('slug,no,title,accent,blurb,care,feature_product_id,i18n').order('sort'),
      sb.from('products').select('id,category_slug,name,mini,description,colors,art,bg,image_url,i18n').order('sort')
    ]), 6000).then(function (r) {
      if (r[0].error || r[1].error) throw (r[0].error || r[1].error);
      if (!r[0].data.length || !r[1].data.length) throw new Error('catalog is empty');
      var care = {};
      // pick a field in the chosen language, falling back to the English column
      function tr(row, field) { var x = row.i18n && row.i18n[UOR.lang]; return x && x[field] ? x[field] : row[field]; }
      var cats = r[0].data.map(function (c) {
        care[c.slug] = tr(c, 'care');
        return {
          slug: c.slug, no: c.no, title: tr(c, 'title'), accent: tr(c, 'accent'), blurb: tr(c, 'blurb'), feature: c.feature_product_id,
          en: { title: c.title, accent: c.accent, blurb: c.blurb }
        };
      });
      var slugs = {};
      cats.forEach(function (c) { slugs[c.slug] = 1; });
      var prods = r[1].data.filter(function (p) { return slugs[p.category_slug]; }).map(function (p) {
        return {
          cat: p.category_slug, id: p.id, name: tr(p, 'name'), mini: tr(p, 'mini'), desc: tr(p, 'description'),
          en: { name: p.name, mini: p.mini, desc: p.description }, // WhatsApp messages to the shop use these
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

  // ---- accounts -------------------------------------------------------
  var session = null, profile = null, listeners = [], recovering = false, resolveAuth;
  var authReady = new Promise(function (r) { resolveAuth = r; });

  function member() { return session && session.user && !session.user.is_anonymous ? session.user : null; }
  // where auth emails / Google send people back to (works on localhost and on GitHub Pages)
  function back(rel) { return new URL(rel || 'account.html', location.href).href; }

  function emit() {
    paintHeader();
    listeners.forEach(function (cb) { try { cb(member(), profile); } catch (e) { log('auth listener failed', e); } });
  }

  function loadProfile() {
    var u = member();
    if (!u) { profile = null; return Promise.resolve(null); }
    return sb.from('profiles').select('display_name').eq('id', u.id).maybeSingle().then(function (r) {
      profile = (r.data) || { display_name: null };
      return profile;
    }, function () { profile = { display_name: null }; return profile; });
  }

  function displayName() {
    var u = member();
    if (!u) return null;
    return (profile && profile.display_name) || (u.email ? u.email.split('@')[0] : UOR.t('nav.account'));
  }

  function paintHeader() {
    var u = member();
    document.querySelectorAll('.acct-link').forEach(function (a) {
      var label = a.querySelector('.acct-label');
      if (label) label.textContent = u ? displayName().split(/\s+/)[0] : UOR.t('nav.signin'); // first name keeps the nav short
      a.setAttribute('aria-label', u ? UOR.t('nav.accountAria', { name: displayName() }) : UOR.t('nav.signinAria'));
      a.classList.toggle('in', !!u);
    });
  }
  UOR.paintAccount = paintHeader;

  UOR.auth = {
    ready: authReady,
    user: member,
    profile: function () { return profile; },
    name: displayName,
    recovering: function () { return recovering; },
    onChange: function (cb) { listeners.push(cb); },
    signIn: function (email, password) {
      return sb.auth.signInWithPassword({ email: email, password: password }).then(unwrap);
    },
    signUp: function (email, password, name, next) {
      return sb.auth.signUp({
        email: email, password: password,
        options: { data: { display_name: name }, emailRedirectTo: back(next) }
      }).then(unwrap).then(function (r) {
        // with email confirmation on, an existing address comes back as a user with no identities
        var u = r.data.user;
        if (u && u.identities && u.identities.length === 0) throw new Error('User already registered');
        return { needsConfirm: !r.data.session };
      });
    },
    google: function (next) {
      return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back(next) } }).then(unwrap);
    },
    sendReset: function (email) {
      return sb.auth.resetPasswordForEmail(email, { redirectTo: back('account.html') }).then(unwrap);
    },
    setPassword: function (password) {
      return sb.auth.updateUser({ password: password }).then(unwrap).then(function () { recovering = false; emit(); });
    },
    setName: function (name) {
      var u = member();
      return sb.from('profiles').update({ display_name: name }).eq('id', u.id).then(unwrap)
        .then(function () { profile = { display_name: name }; emit(); });
    },
    signOut: function () { return sb.auth.signOut().then(unwrap); },
    // which sign-in providers are switched on in the Supabase dashboard
    providers: function () {
      if (!sb) return Promise.resolve({});
      return timeout(fetch(cfg.url + '/auth/v1/settings', { headers: { apikey: cfg.key } }).then(function (r) { return r.json(); }), 5000)
        .then(function (s) { return s.external || {}; }, function () { return {}; });
    }
  };

  if (sb) {
    var first = true;
    sb.auth.onAuthStateChange(function (event, s) {
      var was = member() && member().id;
      session = s;
      if (event === 'PASSWORD_RECOVERY') recovering = true;
      // never await Supabase calls inside this callback; hop out of it first
      setTimeout(function () {
        var now = member() && member().id;
        if (event === 'SIGNED_OUT' && was) UOR.wish.replace([]); // shared devices: don't leave a member's list behind
        loadProfile().then(function () {
          if (now && (now !== was || first)) pullWishlist();
          first = false;
          emit();
          resolveAuth();
        });
      }, 0);
    });
  } else {
    resolveAuth();
  }

  // ---- wishlist sync (members only; guests keep it in the browser) ------
  // new rows only; existing rows are changed with updateItem (members may update qty/colour, nothing else)
  function insertItems(items) {
    var u = member();
    if (!u || !items.length) return Promise.resolve();
    return sb.from('wishlist_items').upsert(items.map(function (e) {
      return { user_id: u.id, product_id: e.id, qty: e.qty, colour: e.colour };
    }), { onConflict: 'user_id,product_id', ignoreDuplicates: true }).then(unwrap);
  }
  function updateItem(e) {
    var u = member();
    if (!u) return Promise.resolve();
    return sb.from('wishlist_items').update({ qty: e.qty, colour: e.colour }).eq('user_id', u.id).eq('product_id', e.id).then(unwrap);
  }

  // merge on sign-in: guest pieces join the account; where both have a piece, the higher quantity wins
  function pullWishlist() {
    return sb.from('wishlist_items').select('product_id,qty,colour').order('created_at', { ascending: false }).then(unwrap).then(function (r) {
      var remote = r.data.filter(function (x) { return UOR.byId(x.product_id); })
        .map(function (x) { return { id: x.product_id, qty: x.qty, colour: x.colour }; });
      var byId = {};
      remote.forEach(function (e) { byId[e.id] = e; });
      var localOnly = [], raise = [];
      UOR.wish.items().forEach(function (l) {
        if (!UOR.byId(l.id)) return;
        var m = byId[l.id];
        if (!m) localOnly.push(l);
        else if (l.qty > m.qty) { m.qty = l.qty; m.colour = l.colour || m.colour; raise.push(m); } // the guest's choice is the more recent one
      });
      UOR.wish.replace(localOnly.concat(remote));
      return Promise.all([insertItems(localOnly)].concat(raise.map(updateItem)));
    }).catch(function (e) { log('Wishlist sync paused:', e); });
  }

  UOR.wish.onToggle = function (id, on, entry) {
    var u = member();
    if (!u) return;
    (on ? insertItems([entry || UOR.wish.get(id)]) : sb.from('wishlist_items').delete().eq('user_id', u.id).eq('product_id', id).then(unwrap))
      .catch(function (e) { log('Wishlist change not saved to your account:', e); });
  };

  // quantity steppers fire quickly: send one update per piece once clicking settles
  var pending = {};
  UOR.wish.onUpdate = function (entry) {
    if (!member()) return;
    clearTimeout(pending[entry.id]);
    pending[entry.id] = setTimeout(function () {
      delete pending[entry.id];
      var latest = UOR.wish.get(entry.id);
      if (latest) updateItem(latest).catch(function (e) { log('Quantity not saved to your account:', e); });
    }, 350);
  };

  // ---- reviews -------------------------------------------------------
  UOR.reviews = {
    // approved reviews, plus the signed-in member's own pending one (RLS decides)
    list: function (productId) {
      if (!sb) return Promise.resolve([]);
      return timeout(sb.from('reviews').select('name,rating,body,created_at,approved,user_id')
        .eq('product_id', productId).order('created_at', { ascending: false }).limit(50), 6000)
        .then(unwrap).then(function (r) { return r.data; });
    },
    mine: function () {
      var u = member();
      if (!u) return Promise.resolve([]);
      return sb.from('reviews').select('product_id,rating,body,approved,created_at')
        .eq('user_id', u.id).order('created_at', { ascending: false }).then(unwrap).then(function (r) { return r.data; });
    },
    submit: function (productId, review) {
      if (!member()) return Promise.reject(new Error(UOR.t('rev.signin')));
      return timeout(sb.from('reviews').insert({ product_id: productId, name: review.name, rating: review.rating, body: review.body }), 8000)
        .then(function (r) {
          if (r.error && r.error.code === '23505') { var dup = new Error(UOR.t('rev.already')); dup.code = 'dup'; throw dup; }
          unwrap(r);
        });
    }
  };
})();
