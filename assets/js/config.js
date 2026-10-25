/* Supabase connection. The publishable key is meant to be public: row level
   security in the database decides what it can read and write. Never put the
   service_role / secret key in this file. */
window.UOR = window.UOR || {};
UOR.SUPABASE = {
  url: 'https://udgpsxfixpvededukhod.supabase.co',
  key: 'sb_publishable_dz-TgH7l8F--YHiAN4MzIA_Ul8uK28x',
  imageBucket: 'product-images'
};

/* WhatsApp chat. Put the shop's WhatsApp number here with the country code,
   e.g. '+91 98765 43210'. While it's empty, the floating WhatsApp button stays
   hidden and the Contact page says chat is coming soon. */
UOR.WHATSAPP = {
  number: '+91 88678 48787',
  // the name shoppers will see at the top of the WhatsApp chat
  chatName: 'Mitali S Rao'
  // Previous number (temporarily swapped out, may return):
  //   number: '+91 99675 96601', chatName: 'Sunitha Collection Pochampali'
};
