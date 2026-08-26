/* ------------------------------------------------------------------
   Fill in, commit, done. Both values below are safe in public code:
   the publishable key only grants what your row-level security allows.
   The Stripe secret key never appears here — it lives in Supabase
   under Edge Functions → Secrets.
   ------------------------------------------------------------------ */
window.SHOP_CONFIG = {
  SUPABASE_URL: "https://txbdeczovyjfceclybnv.supabase.co",
  SUPABASE_KEY: "sb_publishable_pe-LYay6ANVwlh7ImsGRWQ_8__hK5d5",   // Settings → API Keys → Publishable

  BRAND:    "Carlisz",     // shown inside the redaction bar
  CURRENCY: "eur",
  LOCALE:   "en-IE",

  // Absolute URL of the deployed site. Used to build QR targets and the
  // URLs Stripe returns to. No trailing slash.
  // For a repo named carliszfam.github.io, this is correct as written.
  SITE_URL: "https://carlisz.online",
};
