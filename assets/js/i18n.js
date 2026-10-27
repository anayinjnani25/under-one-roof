/* Under One Roof — language: English (default), Telugu, Hindi.
   Strings live in i18n-strings.js (UOR.I18N). Interface text in scripts uses
   UOR.t('key', vars); static page text uses data-i18n="key" attributes, whose
   English stays in the HTML and is swapped only for te / hi.
   WhatsApp messages to the shop always stay in English. */
window.UOR = window.UOR || {};

(function () {
  var LANGS = { en: 'English', te: 'తెలుగు', hi: 'हिंदी' };
  var SHORT = { en: 'EN', te: 'తె', hi: 'हि' };
  var KEY = 'uor-lang';
  var fromUrl = new URLSearchParams(location.search).get('lang');
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
  var lang = LANGS[fromUrl] ? fromUrl : LANGS[stored] ? stored : 'en';
  if (LANGS[fromUrl]) { try { localStorage.setItem(KEY, fromUrl); } catch (e) { /* ignore */ } }
  document.documentElement.lang = lang;
  // Telugu and Devanagari fonts are only fetched when that language is in use
  if (lang !== 'en') {
    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'assets/css/fonts-' + lang + '.css'; // hosted on the site (tools/fetch-fonts.py)
    document.head.appendChild(font);
  }

  var D = UOR.I18N || { en: {} };
  UOR.lang = lang;
  UOR.LANGS = LANGS;
  UOR.LANG_SHORT = SHORT;
  UOR.locale = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' }[lang];

  // t('wish.qtyOf', { name: 'Lotus Jhumka' }) → current language, falling back to English, then the key
  UOR.t = function (key, vars) {
    var s = D[lang] && D[lang][key];
    if (s == null) s = D.en && D.en[key];
    if (s == null) s = key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  };

  UOR.setLang = function (next) {
    if (!LANGS[next] || next === lang) return;
    try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
    var u = new URL(location.href);
    if (u.searchParams.has('lang')) u.searchParams.set('lang', next); // keep a shared ?lang= link consistent
    if (u.href === location.href) location.reload(); else location.href = u.href;
  };

  // swap static page text: data-i18n (innerHTML, may contain <em>), data-i18n-ph (placeholder),
  // data-i18n-aria (aria-label), data-i18n-content (meta content)
  UOR.applyStatic = function (root) {
    if (lang === 'en') return;
    var dict = D[lang] || {};
    (root || document).querySelectorAll('[data-i18n],[data-i18n-ph],[data-i18n-aria],[data-i18n-content]').forEach(function (el) {
      var k;
      if ((k = el.getAttribute('data-i18n')) && dict[k] != null) el.innerHTML = dict[k];
      if ((k = el.getAttribute('data-i18n-ph')) && dict[k] != null) el.setAttribute('placeholder', dict[k]);
      if ((k = el.getAttribute('data-i18n-aria')) && dict[k] != null) el.setAttribute('aria-label', dict[k]);
      if ((k = el.getAttribute('data-i18n-content')) && dict[k] != null) el.setAttribute('content', dict[k]);
    });
  };

  // English value of a catalog field (product/category), for WhatsApp messages to the shop
  UOR.en = function (o, field) { return o && o.en && o.en[field] != null ? o.en[field] : o && o[field]; };

  // colour names: shown in the chosen language, sent to WhatsApp in English
  UOR.palName = function (key) {
    var p = UOR.palettes && UOR.palettes[key];
    if (!p) return '';
    var s = D[lang] && D[lang]['pal.' + key];
    return s != null ? s : p.name;
  };
  UOR.palNameEn = function (key) { return UOR.palettes && UOR.palettes[key] ? UOR.palettes[key].name : ''; };

  UOR.date = function (d, opts) {
    try { return new Date(d).toLocaleDateString(UOR.locale, opts || { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return new Date(d).toDateString(); }
  };
})();
