import { onRequest } from 'firebase-functions/v2/https';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { noterOuverture } from './ouverture';

// ─── Les clics d'une infolettre (26 septembre 2026) ──────────────────────────
// Chaque lien de la lettre passe par https://www.krystinestlaurent.ca/c, sur le
// domaine même de l'expéditeur (jamais un raccourcisseur), qui note le clic
// puis renvoie aussitôt vers la vraie page. Un clic prouve aussi une lecture
// humaine. Pour ne pas servir de relais à n'importe quelle adresse, la
// destination doit figurer dans la lettre elle-même ou être sur un domaine de
// Krystine; sinon, la personne arrive sur l'accueil.

const ACCUEIL = 'https://www.krystinestlaurent.ca/accueil';
const DOMAINES = ['krystinestlaurent.ca', 'inspiratanature.com'];
const ID = /^[A-Za-z0-9_-]{1,64}$/;

const domaineAmi = (h: string) => DOMAINES.some(d => h === d || h.endsWith('.' + d));

export const clic = onRequest(
  { region: 'us-central1', maxInstances: 10 },
  async (req, res) => {
    const n = String(req.query.n || '');
    const s = String(req.query.s || '');
    const u = String(req.query.u || '');
    let destination = ACCUEIL;
    const lettre = ID.test(n) ? await getFirestore().doc(`newsletters/${n}`).get().catch(() => null) : null;
    try {
      const url = new URL(u);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        const permise = domaineAmi(url.hostname)
          || (!!lettre?.exists && JSON.stringify(lettre.get('blocks') || []).includes(JSON.stringify(u).slice(1, -1)));
        if (permise) destination = url.toString();
      }
    } catch { /* adresse illisible : l'accueil */ }

    // Rien ne s'écrit pour une lettre inconnue ni pour une personne qui n'a
    // pas reçu cette lettre.
    const recue = lettre?.exists && ID.test(s)
      ? (await getFirestore().doc(`newsletters/${n}/envois/${s}`).get().catch(() => null))?.exists
      : false;
    if (recue && destination !== ACCUEIL) {
      try {
        const db = getFirestore();
        const h = createHash('sha1').update(destination).digest('hex').slice(0, 12);
        const personne = db.doc(`newsletters/${n}/clics/${s}`);
        const deja = (await personne.get()).exists;
        await personne.set({ at: FieldValue.serverTimestamp(), liens: FieldValue.arrayUnion(destination) }, { merge: true });
        await db.doc(`newsletters/${n}`).set({
          stats: { ...(deja ? {} : { clicks: FieldValue.increment(1) }) },
          clicsLiens: { [h]: { n: FieldValue.increment(1), url: destination } },
        }, { merge: true });
        await noterOuverture(n, s, true);
      } catch (e) {
        console.warn('[clic]', n, s, e);
      }
    }
    res.set('Cache-Control', 'no-store');
    res.redirect(302, destination);
  },
);
