// ─── Les alias jetables, côté navigateur ─────────────────────────────────────
// Miroir exact de `functions/src/newsletter/robots.ts`. Les deux listes
// existent parce que les formulaires publics écrivent encore dans Firestore
// depuis le client (`addNewsletterSubscriber`), sans passer par une fonction :
// la garde doit donc vivre des deux côtés. `src/lib/robots.test.mjs` casse dès
// que les deux fichiers divergent, comme pour les autres constantes doublées
// du dépôt (coffresConfig, pointsConfig).
//
// Aucun import ici : le test charge ce fichier tel quel avec node.
//
// Rappel : proton.me et protonmail.com sont des boîtes ordinaires et n'ont
// rien à faire dans cette liste. Seuls les domaines d'alias y figurent.
export const DOMAINES_ALIAS: Record<string, string> = {
  // Proton Pass — alias masqués
  'passmail.com':      'Proton Pass',
  'passmail.net':      'Proton Pass',
  'passinbox.com':     'Proton Pass',
  'passfwd.com':       'Proton Pass',
  // SimpleLogin (Proton) — domaines d'alias
  'simplelogin.com':   'SimpleLogin',
  'simplelogin.co':    'SimpleLogin',
  'simplelogin.io':    'SimpleLogin',
  'slmail.me':         'SimpleLogin',
  'aleeas.com':        'SimpleLogin',
  // DuckDuckGo Email Protection
  'duck.com':          'DuckDuckGo Email Protection',
  // Mozilla Firefox Relay
  'mozmail.com':       'Firefox Relay',
  'relay.firefox.com': 'Firefox Relay',
  // addy.io (ex-AnonAddy)
  'anonaddy.com':      'addy.io',
  'anonaddy.me':       'addy.io',
  'addy.io':           'addy.io',
  // Boîtes publiques jetables
  'guerrillamail.com': 'boîte jetable',
  'mailinator.com':    'boîte jetable',
  'yopmail.com':       'boîte jetable',
  'temp-mail.org':     'boîte jetable',
  '10minutemail.com':  'boîte jetable',
};

/** Le domaine d'alias d'une adresse, ou null si l'adresse est ordinaire. */
export function domaineAlias(email: string): string | null {
  const brut = String(email || '').trim().toLowerCase();
  const at = brut.lastIndexOf('@');
  if (at < 0) return null;
  const hote = brut.slice(at + 1);
  if (DOMAINES_ALIAS[hote]) return hote;
  // Firefox Relay sert ses alias sur des sous-domaines (xxx.mozmail.com).
  const parts = hote.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (DOMAINES_ALIAS[parent]) return parent;
  }
  return null;
}

/** Le motif écrit sur la fiche, dans le format posé à la main le 21 septembre 2026. */
export function raisonAlias(domaine: string): string {
  return `alias jetable ${domaine} (${DOMAINES_ALIAS[domaine]})`;
}
