/* Under One Roof — catalog data.
   Placeholder catalog: 5 categories x 6 pieces. Swap names, copy and prices
   for the real catalog; `art` drives the illustrated product renderer in art.js
   and can be replaced by `image: 'path/to/cutout.png'` once photography exists. */
window.UOR = window.UOR || {};

UOR.palettes = {
  // textile palettes (torans, hangings, garlands)
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
  { slug: 'torans',    no: '01', title: 'Doorway', accent: 'Torans',
    blurb: 'Stitched bands and hand-cut flaps that dress a doorway for every arrival.',
    feature: 'haveli-toran' },
  { slug: 'hangings',  no: '02', title: 'Wall & Door', accent: 'Hangings',
    blurb: 'Mandalas, rings and bell cascades, strung bead by bead.',
    feature: 'moon-mandala' },
  { slug: 'garlands',  no: '03', title: 'Toran', accent: 'Garlands',
    blurb: 'Soft swags of pom-poms, leaves and tassels for festive days and ordinary ones.',
    feature: 'pompom-swag' },
  { slug: 'oxidised',  no: '04', title: 'Oxidised', accent: 'Jewelry',
    blurb: 'Darkened silver-look metal, chased and beaded by hand.',
    feature: 'temple-jhumka' },
  { slug: 'gold-silver', no: '05', title: 'Gold & Silver-tone', accent: 'Jewelry',
    blurb: 'Warm gold and cool silver finishes on everyday heirloom shapes.',
    feature: 'lotus-jhumka' }
];

(function () {
  var TEX = ['rust', 'ink', 'earth', 'natural'];
  var OX = ['oxidised', 'oxidised-pearl'];
  var GS = ['gold', 'gold-pearl', 'silver', 'silver-pearl'];
  var BG = { paper: '#EFE2C9', deep: '#E6D5B4', sand: '#DCC8A5', blush: '#EBD3C3', oat: '#E4D9C6' };

  function P(cat, id, name, mini, price, art, colors, bg, desc) {
    return { cat: cat, id: id, name: name, mini: mini, price: price, art: art, colors: colors, bg: BG[bg], desc: desc };
  }

  UOR.products = [
    P('torans', 'haveli-toran', 'Haveli Doorway Toran', 'Seven flaps, mirror-stitched band', 2450,
      { type: 'toran', flaps: 7, shape: 'tri', bells: true }, TEX, 'paper',
      'A cotton band edged in running stitch, set with tiny mirrors, and hung with seven pointed flaps. Each flap ends in a small brass-tone bell, so the doorway answers softly when someone walks through.'),
    P('torans', 'mirrorwork-toran', 'Mirrorwork Scallop Toran', 'Round scallops with tiny mirrors', 2850,
      { type: 'toran', flaps: 6, shape: 'round', bells: false }, ['ink', 'rust', 'natural'], 'blush',
      'Six rounded scallops, each one framed in chain stitch around a hand-set mirror. A quieter, fuller toran that suits a wide doorway or a bare wall above a bed.'),
    P('torans', 'leaf-toran', 'Mango Leaf Toran', 'Hand-cut leaves, festive welcome', 1650,
      { type: 'toran', flaps: 9, shape: 'leaf', bells: false }, ['earth', 'rust', 'natural'], 'deep',
      'Nine fabric leaves, cut and edged by hand, after the mango-leaf torans hung for weddings and new beginnings. Light enough to hang with a single nail.'),
    P('torans', 'bell-toran', 'Little Bells Toran', 'Chimes softly when doors open', 1950,
      { type: 'toran', flaps: 5, shape: 'tri', bells: true, strings: 2 }, ['rust', 'earth'], 'oat',
      'Five flaps with bead strings between them, each string finished with a little bell. Made for the door you use most.'),
    P('torans', 'paisley-toran', 'Paisley Panel Toran', 'Embroidered paisleys on cotton', 3200,
      { type: 'toran', flaps: 5, shape: 'leaf', bells: false, big: true }, ['ink', 'rust'], 'sand',
      'Five generous paisley panels worked in dense satin stitch. It takes our makers close to a week, and you can see every day of it.'),
    P('torans', 'threshold-toran', 'Festival Threshold Toran', 'Long tassels, beaded band', 2650,
      { type: 'toran', flaps: 8, shape: 'round', tassels: true }, ['rust', 'natural', 'ink'], 'paper',
      'A beaded band with eight scallops and long cotton tassels that sway in a draught. Our brightest piece, made for festival weeks.'),

    P('hangings', 'moon-mandala', 'Moon Mandala Hanging', 'Petal mandala with bead strands', 1850,
      { type: 'hanging', motif: 'mandala', strands: 5 }, TEX, 'deep',
      'An eight-petal mandala stitched over a stiffened cotton disc, with five bead strands falling below. Hang it on a door, a wall, or the end of a bookshelf.'),
    P('hangings', 'bell-cascade', 'Bell Cascade Hanging', 'Brass bells in falling rows', 2250,
      { type: 'hanging', motif: 'bells', strands: 7 }, ['ink', 'rust', 'earth'], 'paper',
      'Seven strands of knotted thread, each one carrying a row of little bells that get smaller towards the end. It sounds like rain on a tin roof, quietly.'),
    P('hangings', 'sunwheel', 'Sunwheel Door Hanging', 'Stitched rays around mirror', 1450,
      { type: 'hanging', motif: 'sun', strands: 3 }, ['rust', 'natural'], 'blush',
      'A round mirror ringed with stitched rays and three short tassel strands. A small, bright piece for a small, dark corner.'),
    P('hangings', 'twin-ring', 'Twin Ring Hanging', 'Two hoops, thread-wrapped', 1650,
      { type: 'hanging', motif: 'rings', strands: 5 }, ['earth', 'ink', 'natural'], 'oat',
      'Two wooden hoops, wrapped tightly in thread and joined with a single knot, with bead strands below. Simple and steady.'),
    P('hangings', 'tassel-fall', 'Tassel Fall Hanging', 'Cotton tassels on wooden bead', 1200,
      { type: 'hanging', motif: 'tassels', strands: 5 }, ['natural', 'rust'], 'sand',
      'Five cotton tassels gathered under one carved wooden bead. Our smallest hanging, often bought in pairs for a cupboard or a car mirror.'),
    P('hangings', 'seed-bead', 'Seed Bead Wall Hanging', 'Thousands of tiny beads', 2800,
      { type: 'hanging', motif: 'diamond', strands: 7 }, ['ink', 'rust', 'earth'], 'deep',
      'A diamond panel built from thousands of seed beads, stitched one at a time, with seven fringe strands. Heavy, glinting and slow to make.'),

    P('garlands', 'pompom-swag', 'Pom-pom Swag Garland', 'Woolly pom-poms, three swags', 1250,
      { type: 'garland', style: 'pompom', swags: 3 }, TEX, 'paper',
      'Three soft swags of hand-wound wool pom-poms, with tassels at every join. Drape it over a doorway, a mantel or a window.'),
    P('garlands', 'leaf-bead', 'Leaf & Bead Garland', 'Felt leaves on bead string', 980,
      { type: 'garland', style: 'leaf', swags: 2 }, ['earth', 'natural', 'rust'], 'oat',
      'Felt leaves strung between wooden beads in two easy swags. Pairs well with a toran above the same door.'),
    P('garlands', 'bell-chain', 'Bell Chain Garland', 'Little bells between knots', 1150,
      { type: 'garland', style: 'bell', swags: 2 }, ['ink', 'rust'], 'blush',
      'A knotted cord with a little bell between every knot. It moves in the smallest breeze.'),
    P('garlands', 'long-latkan', 'Long Latkan Garland', 'Tassels at staggered lengths', 1450,
      { type: 'garland', style: 'latkan' }, ['rust', 'natural', 'earth'], 'deep',
      'Latkans, the long beaded tassels of Indian doorways, hung at staggered lengths from a single cord.'),
    P('garlands', 'bunting', 'Tassel Bunting Garland', 'Stitched flags, cheerful drape', 650,
      { type: 'garland', style: 'bunting', swags: 2 }, ['rust', 'ink', 'natural'], 'sand',
      'Small stitched cotton flags with a tassel under each one. Light, cheerful and easy to move from room to room.'),
    P('garlands', 'festive-arch', 'Festive Arch Garland', 'One deep swag, many tassels', 1800,
      { type: 'garland', style: 'pompom', swags: 1 }, ['rust', 'earth'], 'paper',
      'One deep swag, heavy with pom-poms and tassels, sized for a main door or a wedding arch.'),

    P('oxidised', 'temple-jhumka', 'Temple Jhumka', 'Domed bells, beaded fringe', 890,
      { type: 'jhumka' }, OX, 'deep',
      'Domed jhumkas with a flower stud, a chased band and a fringe of small beads. Light for their size and easy to wear all day.'),
    P('oxidised', 'crescent-chandbali', 'Crescent Chandbali', 'Moon-shaped, pearl-edged drops', 1150,
      { type: 'chandbali' }, ['oxidised-pearl', 'oxidised'], 'oat',
      'Crescent-moon chandbalis edged with a row of beads, finished dark so the chased detail stands out.'),
    P('oxidised', 'coin-choker', 'Tribal Coin Choker', 'Hammered coins on a curve', 1600,
      { type: 'necklace', style: 'coin' }, OX, 'paper',
      'Hammered coins hung along a curved collar, after the old coin necklaces of Rajasthan. Sits close at the base of the neck.'),
    P('oxidised', 'engraved-cuff', 'Engraved Cuff Bangle', 'Dot-chased, open, adjustable', 750,
      { type: 'bangle', style: 'dots', count: 1 }, OX, 'blush',
      'An open cuff, chased with rows of dots by hand. Gently adjustable to fit most wrists.'),
    P('oxidised', 'sun-disc', 'Sun Disc Pendant', 'Rayed disc, long chain', 680,
      { type: 'pendant', style: 'sun' }, OX, 'sand',
      'A rayed sun disc with a single bead at its centre, on a long fine chain.'),
    P('oxidised', 'hoop-drops', 'Little Hoop Drops', 'Everyday hoops with beads', 450,
      { type: 'hoops' }, OX, 'deep',
      'Small hoops with three beads hanging at the bottom. The pair our makers wear themselves.'),

    P('gold-silver', 'lotus-jhumka', 'Lotus Jhumka', 'Lotus stud, bell, fringe', 1250,
      { type: 'jhumka', lotus: true }, GS, 'blush',
      'A lotus stud above a classic bell, with a bead fringe that catches the light as you move.'),
    P('gold-silver', 'filigree-chandbali', 'Filigree Chandbali', 'Lace-like crescents, light wear', 1450,
      { type: 'chandbali', filigree: true }, GS, 'paper',
      'Open filigree crescents, shaped by hand and finished with a beaded edge. Much lighter than they look.'),
    P('gold-silver', 'drop-choker', 'Teardrop Choker', 'Graduated drops, centre stone', 2400,
      { type: 'necklace', style: 'drops' }, GS, 'deep',
      'Teardrops that grow towards a larger centre stone, along a curved collar. Made for weddings and kept for years.'),
    P('gold-silver', 'rope-bangles', 'Twisted Rope Bangles', 'A pair, rope-twist finish', 980,
      { type: 'bangle', style: 'rope', count: 2 }, GS, 'oat',
      'Two rope-twist bangles, sold as a pair. Wear them together or stacked with others.'),
    P('gold-silver', 'coin-pendant', 'Old Coin Pendant', 'Stamped coin, fine chain', 820,
      { type: 'pendant', style: 'coin' }, GS, 'sand',
      'A stamped coin pendant with a beaded rim, on a fine chain.'),
    P('gold-silver', 'pearl-hoops', 'Pearl Fringe Hoops', 'Hoops dressed in seed pearls', 650,
      { type: 'hoops', fringe: true }, ['gold-pearl', 'silver-pearl', 'gold', 'silver'], 'blush',
      'Medium hoops with a fringe of beads along the lower curve.')
  ];

  UOR.care = {
    torans: 'Cotton and thread with glass mirrors and metal bells. Dust gently; spot clean only.',
    hangings: 'Thread, beads and wood. Keep out of strong direct sun to protect the colours.',
    garlands: 'Wool, felt and cotton. Shake out gently and store flat between seasons.',
    oxidised: 'Oxidised alloy, nickel-free. Keep dry and store in the cloth pouch it arrives in.',
    'gold-silver': 'Plated alloy, nickel-free. Avoid perfume and water to keep the finish bright.'
  };

  // Sample reviews: placeholders until real customer reviews are collected.
  UOR.reviewPool = [
    { name: 'Meera S.', rating: 5, text: 'Even nicer in person. You can see the stitches, which is exactly what I wanted.' },
    { name: 'Aarav K.', rating: 5, text: 'Arrived well wrapped with a handwritten note. Hung it the same evening.' },
    { name: 'Nandini R.', rating: 4, text: 'Lovely work. The colour is a little deeper than the picture, which I prefer.' },
    { name: 'Ishita P.', rating: 5, text: 'Bought one for my mother and then went back for another for myself.' },
    { name: 'Kabir M.', rating: 4, text: 'Took a few days to arrive but worth the wait. Very well made.' },
    { name: 'Zoya F.', rating: 5, text: 'Light, comfortable and gets compliments every time.' },
    { name: 'Rohan D.', rating: 5, text: 'Our doorway finally looks like ours. The bells are a nice touch.' },
    { name: 'Tara V.', rating: 4, text: 'Beautiful and clearly handmade. Small variations make it feel special.' },
    { name: 'Anika J.', rating: 5, text: 'Exactly as described. I keep finding new little details in it.' }
  ];

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
  UOR.price = function (n) { return '₹' + n.toLocaleString('en-IN'); };
})();
