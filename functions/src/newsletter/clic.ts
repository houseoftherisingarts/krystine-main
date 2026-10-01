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
// Un lien d'intérêt porte `?interet=<clé>` : le clic pose l'étiquette
// `interet-<clé>` sur la fiche de la personne (Krystine, 27 sept. 2026), pour
// qu'elle puisse ensuite écrire seulement à celles qui ont levé la main.
const INTERET = /^[a-z0-9-]{2,30}$/;

const domaineAmi = (h: string) => DOMAINES.some(d => h === d || h.endsWith('.' + d));

export const clic = onRequest(
  { region: 'us-central1', maxInstances: 10 },
  async (req, res) => {
    const n = String(req.query.n || '');
    const s = String(req.query.s || '');
    const d = String(req.query.d || '');
    let u = String(req.query.u || '');
    if (d && /^[A-Za-z0-9_-]{1,4000}$/.test(d)) u = Buffer.from(d, 'base64url').toString('utf8');
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
        const avant = await personne.get();
        const deja = avant.exists;
        const maintenant = Date.now();
        // Les robots de sécurité des boîtes d'entreprise et d'université ouvrent
        // TOUS les liens d'un courriel en quelques secondes pour les vérifier
        // (constaté le 27 sept. 2026 : BNC, UdeM, ULaval...). Trois liens
        // différents en moins de dix secondes, aucune personne ne le fait : la
        // fiche est marquée robot pour cette lettre, ses étiquettes d'intérêt
        // posées par cette lettre sont retirées, et plus rien ne s'y ajoute.
        const liensAvant: string[] = avant.get('liens') || [];
        const heures: number[] = [...(avant.get('heures') || []), maintenant];
        const liensApres = Array.from(new Set([...liensAvant, destination]));
        const debut = Math.min(...heures);
        const robot = avant.get('robot') === true || (liensApres.length >= 3 && maintenant - debut < 10_000);
        await personne.set({ at: FieldValue.serverTimestamp(), liens: FieldValue.arrayUnion(destination), heures: FieldValue.arrayUnion(maintenant), ...(robot ? { robot: true } : {}) }, { merge: true });
        const etiquettesDe = (u: string) => {
          const params = new URL(u).searchParams;
          return [
            ...params.getAll('interet').filter(x => INTERET.test(x)).map(x => `interet-${x}`),
            ...params.getAll('preference').filter(x => INTERET.test(x)).map(x => `preference-${x}`),
          ];
        };
        if (robot) {
          if (avant.get('robot') !== true) {
            const aRetirer = Array.from(new Set(liensApres.flatMap(etiquettesDe)));
            if (aRetirer.length) await db.doc(`newsletter/${s}`).update({ tags: FieldValue.arrayRemove(...aRetirer) }).catch(() => { /* fiche disparue */ });
            await db.doc(`newsletters/${n}`).set({ stats: { clicks: FieldValue.increment(-1), clicsRobots: FieldValue.increment(1) } }, { merge: true });
          }
        } else {
          const h = createHash('sha1').update(destination).digest('hex').slice(0, 12);
          // Jamais `stats: {}` : avec merge, une carte vide REMPLACE tous les
          // compteurs de la lettre (ils s'effaçaient au deuxième clic d'une même
          // personne, corrigé le 27 sept. 2026).
          await db.doc(`newsletters/${n}`).set({
            ...(deja ? {} : { stats: { clicks: FieldValue.increment(1) } }),
            clicsLiens: { [h]: { n: FieldValue.increment(1), url: destination } },
          }, { merge: true });
          // `?interet=` pose le motif, `?preference=` la façon d'avancer; une
          // préférence ne devient jamais un intérêt pour une offre.
          const etiquettes = etiquettesDe(destination);
          if (etiquettes.length) {
            await db.doc(`newsletter/${s}`).update({ tags: FieldValue.arrayUnion(...etiquettes) }).catch(() => { /* fiche disparue */ });
          }
          await noterOuverture(n, s, true);
        }
      } catch (e) {
        console.warn('[clic]', n, s, e);
      }
    }
    res.set('Cache-Control', 'no-store');
    res.redirect(302, destination);
  },
);
