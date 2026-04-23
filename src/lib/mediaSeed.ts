// Hardcoded media catalog — every image URL the site references so the
// admin Médiathèque can index them for browsing + download.
// ─────────────────────────────────────────────────────────────────────────────
// Keep this in sync with src/content.ts (ASSETS + media.book.*) and any
// inline image reference on the site (layout logos, page heroes, etc.). To
// add a new hardcoded image, list it here; the admin "Préréférencer les
// médias du site" button inserts new rows and skips URLs already present,
// so re-running is cheap and Krystine's metadata edits are preserved.

export interface MediaSeedEntry {
  url: string;
  name: string;
  category: string;
}

export const SITE_MEDIA_SEED: MediaSeedEntry[] = [
  // ── Logos ──
  { category: 'logo', name: 'Krystine · Logo principal',      url: 'https://storage.googleapis.com/inspirata/Vata/1%20(1).png' },
  { category: 'logo', name: 'Inspirata · Goutte dorée',        url: 'https://storage.googleapis.com/inspirata/Base%20site/Golden%20drop%20inpirata.png' },
  { category: 'logo', name: 'Inspirata · Nav dorée',           url: 'https://storage.googleapis.com/inspirata/Base%20site/inspirata%20logo%202%20%20golden.png' },

  // ── Portraits Krystine ──
  { category: 'founder', name: 'Krystine · Portrait fondatrice',   url: 'https://storage.googleapis.com/inspirata/Gemini_Generated_Image_99odj99odj99odj9.png' },
  { category: 'founder', name: 'Krystine · Noir sur beige',        url: 'https://storage.googleapis.com/inspirata/black%20on%20beige%20krystine.jpg' },
  { category: 'founder', name: 'Krystine · Red NG',                url: 'https://storage.googleapis.com/origine1/krystine%20red%20NG.webp' },

  // ── Accueil / bannières ──
  { category: 'home', name: 'Boutique · Defripante Noël',       url: 'https://storage.googleapis.com/inspirata/defripante_xmas.png' },
  { category: 'home', name: 'Ayurveda · Rituel',                url: 'https://storage.googleapis.com/inspirata/rituel%208.png' },
  { category: 'home', name: 'Podcast · Krystine',               url: 'https://storage.googleapis.com/inspirata/krystine%20podcast.png' },
  { category: 'home', name: 'Formations · Bannière Origine',    url: 'https://storage.googleapis.com/origine1/banner%20origine%20enveloppe.jpg' },
  { category: 'home', name: 'Médias · Hero',                     url: 'https://storage.googleapis.com/inspirata/Base%20site/Gemini_Generated_Image_2cz8f92cz8f92cz8.png' },

  // ── Livres (trilogie) ──
  { category: 'books', name: 'Nature & Ayurveda · Couverture',   url: 'https://storage.googleapis.com/inspirata/Livres/nature%20ayurveda%20front.jpg' },
  { category: 'books', name: 'Féminité & Ayurveda · Couverture', url: 'https://storage.googleapis.com/inspirata/Livres/feminite%20ayurveda%20front.jpg' },
  { category: 'books', name: 'Féminité & Ayurveda · Page 2',     url: 'https://storage.googleapis.com/inspirata/Livres/page%202%20fem.avif' },
  { category: 'books', name: 'Nature & Ayurveda · Page 2',       url: 'https://storage.googleapis.com/inspirata/Livres/page%202.avif' },

  // ── Produits ──
  { category: 'products', name: 'Huiles Dosha · Groupe',         url: 'https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp' },

  // ── Chakras (décor) ──
  { category: 'chakras', name: 'Chakra · Couronne (Sahasrara)',   url: 'https://storage.googleapis.com/inspirata/Chakras/483-4834340_sahasrara-chakra-symbol-png-png-download-crown-chakra.png' },
  { category: 'chakras', name: 'Chakra · Racine (Muladhara)',     url: 'https://storage.googleapis.com/inspirata/Chakras/root-chakra-muladhara-of-golden-red-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png' },
  { category: 'chakras', name: 'Chakra · Sacré (Svadhisthana)',   url: 'https://storage.googleapis.com/inspirata/Chakras/sacral-chakra-svadhisthana-of-golden-orange-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png' },
  { category: 'chakras', name: 'Chakra · Plexus solaire (Manipura)', url: 'https://storage.googleapis.com/inspirata/Chakras/solar-plexus-chakra-manipura-of-golden-yellow-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png' },
  { category: 'chakras', name: 'Chakra · Troisième œil (Ajna)',   url: 'https://storage.googleapis.com/inspirata/Chakras/third-eye-chakra-ajna-of-golden-dark-blue-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png' },

  // ── Assets statiques (/public) ──
  // URLs are rendered from the site's own origin at runtime, so they'll be
  // relative when viewed in the admin. We keep them absolute here so the
  // <img> tags resolve from anywhere the admin is loaded.
  { category: 'public', name: 'Bannière Krystine (public/)',     url: '/krystine-banner.png' },
  { category: 'public', name: 'Footer · Jacques-Cartier',         url: '/footer-jacques-cartier.jpg' },
];

// Category display metadata for the admin filter bar.
export const MEDIA_CATEGORIES: Array<{ id: string; label: string; icon: string }> = [
  { id: 'all',      label: 'Toutes',       icon: 'fa-layer-group' },
  { id: 'logo',     label: 'Logos',        icon: 'fa-certificate' },
  { id: 'founder',  label: 'Portraits',    icon: 'fa-user' },
  { id: 'home',     label: 'Accueil',      icon: 'fa-image' },
  { id: 'books',    label: 'Livres',       icon: 'fa-book' },
  { id: 'products', label: 'Produits',     icon: 'fa-basket-shopping' },
  { id: 'chakras',  label: 'Chakras',      icon: 'fa-sun' },
  { id: 'public',   label: 'Statiques',    icon: 'fa-folder' },
  { id: 'upload',   label: 'Téléversés',   icon: 'fa-cloud-arrow-up' },
];
