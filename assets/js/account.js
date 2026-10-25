/* Under One Roof — account page: sign in / up, Google, reset, profile. */
UOR.ready.then(function () {
  UOR.chrome('account');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var views = [].slice.call(document.querySelectorAll('.acct-view'));

  // only same-site page paths are allowed as a destination after signing in
  var next = UOR.query('next');
  if (!next || !/^[a-z0-9._-]+\.html(\?[^#\s]*)?(#[\w-]*)?$/i.test(next)) next = null;
  var backTo = next || 'account.html';

  function show(name) {
    $('.acct-loading').hidden = true;
    views.forEach(function (v) { v.hidden = v.dataset.view !== name; });
  }

  function friendly(e) {
    var m = (e && e.message) || '';
    if (/invalid login credentials/i.test(m)) return 'That email and password don\'t match.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first. The link is in your inbox.';
    if (/already registered/i.test(m)) return 'There\'s already an account with that email. Sign in instead.';
    if (/provider is not enabled|unsupported provider/i.test(m)) return 'Google sign-in isn\'t switched on yet. Use email for now.';
    if (/rate limit|too many/i.test(m)) return 'Too many emails sent just now. Try again in a little while.';
    if (/password should be|weak password|at least/i.test(m)) return 'Choose a password of 8 characters or more.';
    if (/timeout|fetch|network/i.test(m)) return 'Couldn\'t reach the shop. Check your connection and try again.';
    return m || 'Something went wrong. Please try again.';
  }
  function say(form, msg, kind) {
    var n = $('.form-note', form);
    n.textContent = msg; n.className = 'form-note' + (kind ? ' ' + kind : '');
  }
  function busy(form, on, label) {
    var b = $('button[type="submit"]', form);
    if (!b) return;
    if (on) { b.dataset.label = b.textContent; b.textContent = label || 'One moment…'; }
    else if (b.dataset.label) b.textContent = b.dataset.label;
    b.disabled = on;
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // ---- tabs
  var tabs = [$('#tab-in'), $('#tab-up')];
  function pick(i) {
    tabs.forEach(function (t, k) {
      t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = k !== i;
    });
  }
  tabs.forEach(function (t, i) { t.addEventListener('click', function () { pick(i); }); });
  $('.auth-card .tabs').addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var i = tabs[0].getAttribute('aria-selected') === 'true' ? 1 : 0;
    pick(i); tabs[i].focus();
  });
  if (UOR.query('mode') === 'signup') pick(1);

  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) {
      var email = $('#pane-in [name=email]').value;
      show(go.dataset.go);
      if (go.dataset.go === 'reset') { $('[data-form=reset] [name=email]').value = email; $('[data-form=reset] [name=email]').focus(); }
    }
  });

  // ---- sign in
  var signin = $('[data-form=signin]');
  signin.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = signin.email.value.trim(), pw = signin.password.value;
    if (!validEmail(email)) return say(signin, 'Enter your email address.', 'err');
    if (!pw) return say(signin, 'Enter your password.', 'err');
    busy(signin, true, 'Signing in…');
    UOR.auth.signIn(email, pw).then(function () {
      say(signin, '');
      if (next) location.href = next;
    }, function (err) { say(signin, friendly(err), 'err'); }).then(function () { busy(signin, false); });
  });

  // ---- create account
  var signup = $('[data-form=signup]');
  signup.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = signup.elements.name.value.trim(), email = signup.email.value.trim(), pw = signup.password.value;
    if (!name) return say(signup, 'Tell us your name.', 'err');
    if (!validEmail(email)) return say(signup, 'Enter a valid email address.', 'err');
    if (pw.length < 8) return say(signup, 'Choose a password of 8 characters or more.', 'err');
    busy(signup, true, 'Creating…');
    UOR.auth.signUp(email, pw, name, backTo).then(function (r) {
      if (r.needsConfirm) { signup.reset(); say(signup, 'Nearly done. Click the link we\'ve sent to ' + email + ' to confirm your account.', 'ok'); }
      else if (next) location.href = next;
    }, function (err) { say(signup, friendly(err), 'err'); }).then(function () { busy(signup, false); });
  });

  // ---- Google (button shows only once the provider is switched on in Supabase)
  var gBtn = $('[data-action=google]'), gOr = gBtn.previousElementSibling;
  gBtn.hidden = gOr.hidden = true;
  UOR.auth.providers().then(function (p) { gBtn.hidden = gOr.hidden = !p.google; });
  gBtn.addEventListener('click', function () {
    var note = $('.google-note');
    UOR.auth.google(backTo).catch(function (err) { note.textContent = friendly(err); note.className = 'form-note google-note err'; });
  });

  // ---- reset
  var reset = $('[data-form=reset]');
  reset.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = reset.email.value.trim();
    if (!validEmail(email)) return say(reset, 'Enter your email address.', 'err');
    busy(reset, true, 'Sending…');
    UOR.auth.sendReset(email).then(function () {
      say(reset, 'If there\'s an account for ' + email + ', a reset link is on its way.', 'ok');
    }, function (err) { say(reset, friendly(err), 'err'); }).then(function () { busy(reset, false); });
  });

  var newpass = $('[data-form=newpass]');
  newpass.addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = newpass.password.value;
    if (pw.length < 8) return say(newpass, 'Choose a password of 8 characters or more.', 'err');
    busy(newpass, true, 'Saving…');
    UOR.auth.setPassword(pw).then(function () { UOR.toast('Password saved'); render(); },
      function (err) { say(newpass, friendly(err), 'err'); }).then(function () { busy(newpass, false); });
  });

  // ---- member view
  var profileForm = $('[data-form=profile]');
  profileForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = profileForm.elements.name.value.trim();
    if (!name) return say(profileForm, 'Your name can\'t be empty.', 'err');
    busy(profileForm, true, 'Saving…');
    UOR.auth.setName(name).then(function () { say(profileForm, 'Saved.', 'ok'); },
      function (err) { say(profileForm, friendly(err), 'err'); }).then(function () { busy(profileForm, false); });
  });
  $('[data-action=signout]').addEventListener('click', function () {
    UOR.auth.signOut().then(function () { UOR.toast('Signed out'); }, function (err) { UOR.toast(friendly(err)); });
  });

  function stars(v) { var s = ''; for (var i = 1; i <= 5; i++) s += i <= v ? '★' : '☆'; return s; }
  // same rows, steppers and WhatsApp order button as the wishlist drawer
  var wishBox = $('.acct-wishlist');
  wishBox.insertAdjacentHTML('beforeend', UOR.orderFoot());
  function paintWish() {
    $('.stat-wish').textContent = UOR.wish.all().filter(UOR.byId).length;
    UOR.renderWishRows($('.my-wish'));
  }
  function paintNotes() {
    var list = $('.my-notes');
    list.innerHTML = '<li class="empty-card slim"><p>Fetching your notes…</p></li>';
    UOR.reviews.mine().then(function (rows) {
      $('.stat-notes').textContent = rows.length;
      list.innerHTML = rows.length ? rows.map(function (r) {
        var p = UOR.byId(r.product_id);
        return '<li class="my-note">' +
          (p ? '<a class="note-thumb" href="' + UOR.productHref(p) + '" style="--bg:' + p.bg + '" tabindex="-1" aria-hidden="true">' + UOR.art(p) + '</a>' : '<span class="note-thumb"></span>') +
          '<div class="note-body"><div class="note-top"><a class="note-name" href="' + (p ? UOR.productHref(p) : '#') + '">' + UOR.esc(p ? p.name : r.product_id) + '</a>' +
          '<span class="pill ' + (r.approved ? 'pub' : 'wait') + '">' + (r.approved ? 'Published' : 'Awaiting approval') + '</span></div>' +
          '<span class="stars" role="img" aria-label="' + r.rating + ' out of 5">' + stars(r.rating) + '</span>' +
          '<p>' + UOR.esc(r.body) + '</p></div></li>';
      }).join('') : '<li class="empty-card slim"><p class="empty-title">No notes yet</p><p>Brought a piece home? Open it in the shop and leave a few words under <em>Reviews</em>.</p></li>';
    }, function () { list.innerHTML = '<li class="empty-card slim"><p>Your notes couldn\'t load just now.</p></li>'; });
  }

  function render() {
    var u = UOR.auth.user();
    if (UOR.auth.recovering() && u) return show('recover');
    if (!u) {
      var cur = views.filter(function (v) { return !v.hidden; })[0];
      if (!cur || cur.dataset.view === 'member' || cur.dataset.view === 'recover') show('guest');
      return;
    }
    if (next && !UOR.auth.recovering()) { location.href = next; return; } // e.g. back from Google or an email link
    show('member');
    var full = UOR.auth.name() || '';
    $('.hello-name').textContent = full.split(/\s+/)[0] || full;
    $('.avatar').textContent = (full.trim()[0] || '?').toUpperCase();
    $('.acct-email').textContent = u.email || '';
    $('.acct-email-input').value = u.email || '';
    $('.stat-since').textContent = u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—';
    profileForm.elements.name.value = (UOR.auth.profile() && UOR.auth.profile().display_name) || '';
    paintWish(); paintNotes();
  }

  // keep the wishlist panel in step with changes made here, in the drawer, or merged on sign-in
  document.addEventListener('uor:wish', function () { if (!$('[data-view=member]').hidden) paintWish(); });

  UOR.auth.onChange(render);
  UOR.auth.ready.then(render);
  window.addEventListener('scroll', function () { UOR.headSolid(scrollY > 10); }, { passive: true });
});
