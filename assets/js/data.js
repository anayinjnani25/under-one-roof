/* Under One Roof — design palettes plus the BUNDLED catalog.
   The live catalog is the `categories` / `products` tables in Supabase (backend.js
   loads them and replaces UOR.categories / UOR.products). This copy is only the
   offline fallback and the source for supabase/seed.sql. `art` drives the
   illustrated renderer in art.js; a product's `image_url` in Supabase overrides it. */
window.UOR = window.UOR || {};

UOR.palettes = {
  // textile palettes (clothes, potlis, torans, bandhanwar)
  rust:    { name: 'Rust & Cream', main: '#A3341F', alt: '#F6EFE2', trim: '#C9B18C', dark: '#6B2214', metal: 'gold' },
  ink:     { name: 'Ink & Gold',   main: '#2C2217', alt: '#C9B18C', trim: '#B8913A', dark: '#120d08', metal: 'gold' },
  earth:   { name: 'Earth',        main: '#6B5339', alt: '#E6D5B4', trim: '#A3341F', dark: '#3f3020', metal: 'oxidised' },
  natural: { name: 'Natural',      main: '#C9B18C', alt: '#F6EFE2', trim: '#6B5339', dark: '#8a7556', metal: 'silver' },
  // jewelry palettes (metal + bead accent)
  'oxidised':       { name: 'Oxidised · rust beads', metal: 'oxidised', bead: '#A3341F' },
  'oxidised-pearl': { name: 'Oxidised · pearls',     metal: 'oxidised', bead: '#F3EADB' },
  'gold':           { name: 'Gold-tone · rust beads', metal: 'gold',   bead: '#A3341F' },
  'gold-pearl':     { name: 'Gold-tone · pearls',     metal: 'gold',   bead: '#F3EADB' },
  'silver':         { name: 'Silver-tone · rust beads', metal: 'silver', bead: '#A3341F' },
  'silver-pearl':   { name: 'Silver-tone · pearls',     metal: 'silver', bead: '#F3EADB' }
};

UOR.metals = {
  gold:     { base: '#B8913A', hi: '#E3C77E', lo: '#7A5A1E' },
  silver:   { base: '#B3B0A8', hi: '#ECEAE4', lo: '#77746C' },
  oxidised: { base: '#5E5A53', hi: '#9A958A', lo: '#2F2C28' }
};

UOR.categories = [
  { slug: 'sarees',         no: '01', title: 'Draped', accent: 'Sarees',
    blurb: 'Six yards and more, with borders and pallus worth unfolding slowly.',
    feature: 'temple-border-saree' },
  { slug: 'dress-material', no: '02', title: 'Dress', accent: 'Material',
    blurb: 'Unstitched sets of top, bottom and dupatta, ready for your own tailor.',
    feature: 'block-print-set' },
  { slug: 'coord-sets',     no: '03', title: 'Co-ord', accent: 'Sets',
    blurb: 'A top and bottom cut from the same cloth, made to be worn together.',
    feature: 'printed-coord' },
  { slug: 'gowns',          no: '04', title: 'Flowing', accent: 'Gowns',
    blurb: 'Floor-length flares for weddings, poojas and every evening in between.',
    feature: 'anarkali-gown' },
  { slug: 'indowestern',    no: '05', title: 'Indo-western', accent: 'Jewellery',
    blurb: 'Light pieces that sit as well with a dress as with a kurta.',
    feature: 'pearl-hoops' },
  { slug: 'temple',         no: '06', title: 'Temple', accent: 'Jewellery',
    blurb: 'Gold-tone pieces shaped after the old temple motifs.',
    feature: 'temple-jhumka' },
  { slug: 'oxidised',       no: '07', title: 'Oxidised', accent: 'Jewellery',
    blurb: 'Darkened silver-look metal, chased and beaded by hand.',
    feature: 'crescent-chandbali' },
  { slug: 'potlis',         no: '08', title: 'Potli', accent: 'Bags',
    blurb: 'Drawstring pouches, embroidered and beaded, to carry with festive clothes.',
    feature: 'embroidered-potli' },
  { slug: 'torans',         no: '09', title: 'Doorway', accent: 'Torans',
    blurb: 'Stitched bands and hand-cut flaps that dress a doorway for every arrival.',
    feature: 'haveli-toran' },
  { slug: 'bandhanwar',     no: '10', title: 'Festive', accent: 'Bandhanwar',
    blurb: 'Soft swags of pom-poms and tassels to hang across a door or a wall.',
    feature: 'pompom-swag' }
];

(function () {
  var TEX = ['rust', 'ink', 'earth', 'natural'];
  var BG = { paper: '#EFE2C9', deep: '#E6D5B4', sand: '#DCC8A5', blush: '#EBD3C3', oat: '#E4D9C6' };

  function P(cat, id, name, mini, art, colors, bg, desc) {
    return { cat: cat, id: id, name: name, mini: mini, art: art, colors: colors, bg: BG[bg], desc: desc };
  }

  UOR.products = [
    P('sarees', 'temple-border-saree', 'Temple Border Saree', 'Contrast border, rich pallu',
      { type: 'saree' }, ['rust', 'ink', 'earth'], 'blush',
      'A saree with a broad contrast border running down both sides and a pallu banded in zari-look stripes. Ask us on WhatsApp for the fabric, length and blouse piece of each colour.'),
    P('dress-material', 'block-print-set', 'Block Print Dress Material', 'Top, bottom and dupatta, unstitched',
      { type: 'fabric' }, ['rust', 'ink', 'natural'], 'paper',
      'A printed length for the top, a plain length for the bottom and a dupatta with tasselled ends, sold together and unstitched, so it can be tailored exactly to you.'),
    P('coord-sets', 'printed-coord', 'Printed Co-ord Set', 'Easy top with straight pants',
      { type: 'coord' }, ['earth', 'rust', 'ink'], 'oat',
      'A relaxed top and straight pants cut from the same printed cloth, with contrast bands at the hems. Wear them together, or apart with what you already have.'),
    P('gowns', 'anarkali-gown', 'Flared Anarkali Gown', 'Floor-length, full flare',
      { type: 'gown' }, ['ink', 'rust', 'earth'], 'deep',
      'A fitted bodice opening into a deep, many-panelled flare, finished with a heavy border at the hem. Ask us on WhatsApp for sizes and fabric.'),
    P('indowestern', 'pearl-hoops', 'Pearl Fringe Hoops', 'Hoops dressed in seed pearls',
      { type: 'hoops', fringe: true }, ['gold-pearl', 'silver-pearl', 'gold', 'silver'], 'blush',
      'Light hoops with a fringe of seed pearls that moves when you do. Easy with a dress, a kurta or a saree.'),
    P('temple', 'temple-jhumka', 'Temple Jhumka', 'Domed bells, beaded fringe',
      { type: 'jhumka' }, ['gold', 'gold-pearl'], 'deep',
      'Domed jhumkas in a warm gold tone, with a fringe of beads below, after the jewellery carved on temple walls.'),
    P('oxidised', 'crescent-chandbali', 'Crescent Chandbali', 'Moon-shaped, pearl-edged drops',
      { type: 'chandbali' }, ['oxidised-pearl', 'oxidised'], 'oat',
      'Crescent-moon chandbalis in darkened silver-look metal, edged with small pearls. Light for their size, so you can wear them all evening.'),
    P('potlis', 'embroidered-potli', 'Embroidered Potli Bag', 'Drawstring pouch, beaded hem',
      { type: 'potli' }, ['rust', 'ink', 'natural'], 'sand',
      'A gathered drawstring potli with an embroidered flower on the front, a beaded edge and tasselled strings. Big enough for a phone, keys and a little more.'),
    P('torans', 'haveli-toran', 'Haveli Doorway Toran', 'Seven flaps, mirror-stitched band',
      { type: 'toran', flaps: 7, shape: 'tri', bells: true }, TEX, 'paper',
      'A cotton band edged in running stitch, set with tiny mirrors, and hung with seven pointed flaps. Each flap ends in a small brass-tone bell, so the doorway answers softly when someone walks through.'),
    P('bandhanwar', 'pompom-swag', 'Pom-pom Swag Garland', 'Woolly pom-poms, three swags',
      { type: 'garland', style: 'pompom', swags: 3 }, TEX, 'paper',
      'Three soft swags of hand-wound wool pom-poms, with tassels at every join. Drape it over a doorway, a mantel or a window.')
  ];

  UOR.care = {
    sarees: 'Dry clean the first few times. Store folded in a cotton cloth and refold now and then.',
    'dress-material': 'Wash before stitching to settle the colours. Gentle hand wash in cold water.',
    'coord-sets': 'Gentle hand wash in cold water, inside out. Dry in shade.',
    gowns: 'Dry clean only. Hang on a padded hanger, away from direct sun.',
    indowestern: 'Plated alloy, nickel-free. Avoid perfume and water to keep the finish bright.',
    temple: 'Plated alloy, nickel-free. Keep dry and store in the cloth pouch it arrives in.',
    oxidised: 'Oxidised alloy, nickel-free. Keep dry and store in the cloth pouch it arrives in.',
    potlis: 'Spot clean only. Store stuffed with tissue so it keeps its shape.',
    torans: 'Cotton and thread with glass mirrors and metal bells. Dust gently; spot clean only.',
    bandhanwar: 'Wool, felt and cotton. Shake out gently and store flat between seasons.'
  };

  UOR.byId = function (id) {
    for (var i = 0; i < UOR.products.length; i++) if (UOR.products[i].id === id) return UOR.products[i];
    return null;
  };
  UOR.cat = function (slug) {
    for (var i = 0; i < UOR.categories.length; i++) if (UOR.categories[i].slug === slug) return UOR.categories[i];
    return null;
  };
  UOR.inCat = function (slug) {
    return UOR.products.filter(function (p) { return p.cat === slug; });
  };
})();
