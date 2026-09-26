import { onRequest } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// ─── Le taux d'ouverture ─────────────────────────────────────────────────────
// Chaque infolettre part avec une image d'un point, propre à la personne et à
// l'envoi. Quand la boîte de réception charge l'image, cette fonction compte
// l'ouverture une seule fois par personne, puis rend l'image. Les messageries
// qui bloquent les images ne comptent pas, ce qui est vrai partout : le taux
// se lit comme un plancher, jamais comme une mesure exacte.
//
// Automatique ou humaine (26 septembre 2026) : Apple Mail (protection de la
// vie privée) et plusieurs filtres de sécurité chargent l'image à l'arrivée du
// courriel, avant toute lecture. 47 des 48 « ouvertures » de la lettre aux
// fondatrices sont tombées dans les douze secondes de l'envoi. Une ouverture
// dans les deux minutes qui suivent l'envoi à cette personne (ou avant même
// que l'envoi soit noté) compte donc comme automatique; une visite plus tard,
// ou un clic (voir clic.ts), compte comme humaine.

const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
export const SEUIL_AUTO_MS = 2 * 60 * 1000;

/** Juge et note une ouverture. `humaineCertaine` : un clic prouve la lecture. */
export async function noterOuverture(n: string, s: string, humaineCertaine = false): Promise<void> {
  const db = getFirestore();
  const lettre = db.doc(`newsletters/${n}`);
  const marque = db.doc(`newsletters/${n}/ouvertures/${s}`);
  let auto = false;
  if (!humaineCertaine) {
    const envoi = await db.doc(`newsletters/${n}/envois/${s}`).get();
    const envoyeA = envoi.exists ? envoi.get('at')?.toMillis?.() : undefined;
    auto = envoyeA === undefined || Date.now() - envoyeA < SEUIL_AUTO_MS;
  }
  const m = await marque.get();
  if (!m.exists) {
    await marque.set({ at: FieldValue.serverTimestamp(), auto, ...(auto ? {} : { humaine: true }) });
    await lettre.set({ stats: { opens: FieldValue.increment(1), [auto ? 'opensAuto' : 'opensHumaines']: FieldValue.increment(1) } }, { merge: true });
    if (!auto) await db.doc(`newsletter/${s}`).set({ derniereOuvertureLe: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }
  // Déjà vue par une machine : la vraie lecture, plus tard, se compte aussi.
  if (!auto && m.get('auto') === true && m.get('humaine') !== true) {
    await marque.set({ humaine: true, humaineAt: FieldValue.serverTimestamp() }, { merge: true });
    await lettre.set({ stats: { opensHumaines: FieldValue.increment(1) } }, { merge: true });
    await db.doc(`newsletter/${s}`).set({ derniereOuvertureLe: FieldValue.serverTimestamp() }, { merge: true });
  }
}

export const ouverture = onRequest(
  { region: 'us-central1', cors: true, maxInstances: 10 },
  async (req, res) => {
    const n = String(req.query.n || '');
    const s = String(req.query.s || '');
    res.set('Cache-Control', 'no-store, max-age=0');
    res.set('Content-Type', 'image/gif');
    if (n && s && /^[A-Za-z0-9_-]{1,64}$/.test(n) && /^[A-Za-z0-9_-]{1,64}$/.test(s)) {
      try { await noterOuverture(n, s); } catch (e) { console.warn('[ouverture]', n, s, e); }
    }
    res.status(200).send(GIF);
  },
);
