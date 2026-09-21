// ─── VexelHotjar sur les pages statiques ────────────────────────────────────
// L'accueil, /speaking, /communaute et la liste d'attente sont des pages HTML
// servies telles quelles, sans l'application React ni sa bannière de
// consentement. Ce fichier se compile en un script autonome
// (scripts/vexelhotjar-statique.mjs → public/vh/vexelhotjar.js) que ces pages
// chargent en module. Il ne démarre que si le consentement aux témoins a déjà
// été donné dans l'application, et il surveille son arrivée si la page reste
// ouverte. Les réglages de l'admin se lisent par l'API REST de Firestore,
// puisque settings/vexelhotjar est en lecture publique.

import { demarrerVexelHotjar } from './tracker';

const SITE = 'krystine';
const PROJET = 'krystinestlaurent-87566';
const CLE_CONSENTEMENT = 'inspirata.consent.v1';
const DEFAUT = { actif: true, echantillonReplay: 0.25, exclure: ['/admin'] };

interface Champ { booleanValue?: boolean; doubleValue?: number; integerValue?: string; arrayValue?: { values?: { stringValue?: string }[] } }

async function reglages(): Promise<typeof DEFAUT> {
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/settings/vexelhotjar`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return DEFAUT;
    const f: Record<string, Champ> = (await r.json()).fields || {};
    const part = f.echantillonReplay?.doubleValue ?? (f.echantillonReplay?.integerValue !== undefined ? Number(f.echantillonReplay.integerValue) : undefined);
    return {
      actif: f.actif?.booleanValue ?? DEFAUT.actif,
      echantillonReplay: part ?? DEFAUT.echantillonReplay,
      exclure: (f.exclure?.arrayValue?.values || []).map(v => v.stringValue || '').filter(Boolean),
    };
  } catch { return DEFAUT; }
}

const consenti = (): boolean => { try { return localStorage.getItem(CLE_CONSENTEMENT) === 'accepted'; } catch { return false; } };

let lance = false;
async function lancer() {
  if (lance) return;
  lance = true;
  const r = await reglages();
  if (!r.actif) return;
  demarrerVexelHotjar({ site: SITE, exclure: r.exclure, echantillonReplay: r.echantillonReplay, chargerReplay: () => import('./replay') });
}

if (consenti()) {
  lancer();
} else {
  window.addEventListener('storage', e => { if (e.key === CLE_CONSENTEMENT && consenti()) lancer(); });
  let essais = 0;
  const minuterie = window.setInterval(() => {
    essais += 1;
    if (consenti()) { window.clearInterval(minuterie); lancer(); } else if (essais > 40) window.clearInterval(minuterie);
  }, 3000);
}
