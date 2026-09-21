import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { ADMIN_EMAILS } from '../newsletter/send';
import {
  POINTS_CLICS_MAX, POINTS_MOUV_MAX, RETENTION_LOTS_JOURS, RETENTION_SESSIONS_JOURS, RETENTION_JOURS_JOURS,
  texte, hash, clePage, jourDe, heureDe, deviceDe, hoteDe, TAGS_INTERACTIFS, type Device,
} from './commun';

type Compteurs = Record<string, number>;
interface Journee {
  compteurs: Compteurs;                       // champs plats à incrémenter (chemin pointé)
  textes: Record<string, string>;             // champs texte à poser (chemin pointé)
}
interface Carte {
  clics: DocumentData[];
  mouv: number[];
  vues: number;
  scroll: Compteurs;
}

function inc(j: Journee, chemin: string, n = 1) { j.compteurs[chemin] = (j.compteurs[chemin] || 0) + n; }

async function agreger(db: FirebaseFirestore.Firestore, maxLots = 400): Promise<number> {
  const snap = await db.collection('vh_lots').where('agrege', '==', false).orderBy('recu').limit(maxLots).get();
  if (snap.empty) return 0;

  const journees = new Map<string, Journee>();
  const cartes = new Map<string, Carte>();
  const journee = (cle: string) => {
    let j = journees.get(cle);
    if (!j) { j = { compteurs: {}, textes: {} }; journees.set(cle, j); }
    return j;
  };
  const carte = (cle: string) => {
    let c = cartes.get(cle);
    if (!c) { c = { clics: [], mouv: [], vues: 0, scroll: {} }; cartes.set(cle, c); }
    return c;
  };

  for (const doc of snap.docs) {
    const lot = doc.data();
    const site = lot.site as string;
    for (const e of (lot.ev as DocumentData[]) || []) {
      const jour = jourDe(e.ts);
      const J = journee(`${site}_${jour}`);
      const page = clePage(e.path);
      J.textes[`pages.${page}.path`] = e.path;
      const device: Device = e.device || deviceDe(e.vw || 1280);
      const cleCarte = `${site}_${jour}_${device}_${page}`;

      switch (e.t) {
        case 'vue': {
          inc(J, 'vues');
          inc(J, `pages.${page}.vues`);
          inc(J, `heures.h${heureDe(e.ts)}`);
          inc(J, `appareils.${device}`);
          if (e.titre) J.textes[`pages.${page}.titre`] = e.titre;
          if (e.premier) {
            inc(J, 'sessions');
            if (lot.nouveau) inc(J, 'nouveaux');
            inc(J, `entrees.${page}`);
            const hote = hoteDe(e.ref);
            inc(J, `sources.${hote ? hash(hote) : 'direct'}.n`);
            J.textes[`sources.${hote ? hash(hote) : 'direct'}.nom`] = hote || 'Accès direct';
            if (e.utm?.utm_source) {
              const k = hash(e.utm.utm_source + '|' + (e.utm.utm_campaign || ''));
              inc(J, `campagnes.${k}.n`);
              J.textes[`campagnes.${k}.source`] = e.utm.utm_source;
              J.textes[`campagnes.${k}.campagne`] = e.utm.utm_campaign || '';
            }
          }
          carte(cleCarte).vues += 1;
          break;
        }
        case 'sortie': {
          inc(J, 'dureeMs', e.duree);
          inc(J, `pages.${page}.dureeMs`, e.duree);
          inc(J, `pages.${page}.sorties`, e.fin ? 1 : 0);
          if (e.fin && e.pages <= 1) inc(J, 'rebonds');
          if (e.fin) inc(J, 'fins');
          // Le défilement se compte en paliers de 5 % atteints : la carte de
          // défilement lit ensuite « 62 % des visites ont vu ce palier ».
          const C = carte(cleCarte);
          for (let b = 0; b <= 100; b += 5) {
            if (e.scrollMax >= b) { inc(J, `pages.${page}.scroll.b${b}`); C.scroll[`b${b}`] = (C.scroll[`b${b}`] || 0) + 1; }
          }
          inc(J, `pages.${page}.scrollN`);
          break;
        }
        case 'clic': {
          inc(J, 'clics');
          inc(J, `pages.${page}.clics`);
          if (e.r) { inc(J, 'rage'); inc(J, `pages.${page}.rage`); }
          if (e.m) { inc(J, 'morts'); inc(J, `pages.${page}.morts`); }
          if (e.obj) { inc(J, `objectifs.${hash(e.obj)}.n`); J.textes[`objectifs.${hash(e.obj)}.nom`] = e.obj; }
          // Le palmarès des éléments ne retient que ce qui se clique pour
          // vrai (liens, boutons, champs, objectifs) : la carte garde tous
          // les points, mais un document par jour ne peut pas grossir avec
          // chaque paragraphe qu'une visiteuse a effleuré.
          if (TAGS_INTERACTIFS.has(e.tg) || e.obj) {
            const k = hash(e.s);
            inc(J, `pages.${page}.elements.${k}.n`);
            if (e.r) inc(J, `pages.${page}.elements.${k}.r`);
            if (e.m) inc(J, `pages.${page}.elements.${k}.m`);
            J.textes[`pages.${page}.elements.${k}.s`] = e.s;
            J.textes[`pages.${page}.elements.${k}.tx`] = e.tx || '';
            if (e.href) J.textes[`pages.${page}.elements.${k}.href`] = e.href;
          }
          carte(cleCarte).clics.push({ s: e.s, tx: e.tx || '', ex: +e.ex.toFixed(3), ey: +e.ey.toFixed(3), vx: +e.vx.toFixed(3), dy: Math.round(e.dy), hd: Math.round(e.hd), r: e.r, m: e.m });
          break;
        }
        case 'mouv': {
          const C = carte(cleCarte);
          if (C.mouv.length < POINTS_MOUV_MAX * 2) C.mouv.push(...(e.pts as number[]).slice(0, POINTS_MOUV_MAX * 2 - C.mouv.length));
          break;
        }
        case 'erreur': {
          const k = hash(e.msg + '|' + e.src);
          inc(J, 'erreurs');
          inc(J, `erreursListe.${k}.n`);
          J.textes[`erreursListe.${k}.msg`] = e.msg;
          J.textes[`erreursListe.${k}.src`] = e.src;
          J.textes[`erreursListe.${k}.path`] = e.path;
          break;
        }
        case 'form': {
          const k = hash(e.path + '|' + e.s);
          const etat = e.etat === 'debut' ? 'debuts' : e.etat === 'soumis' ? 'soumis' : 'abandons';
          inc(J, `formulaires.${k}.${etat}`);
          J.textes[`formulaires.${k}.s`] = e.s;
          J.textes[`formulaires.${k}.path`] = e.path;
          if (etat === 'abandons' && e.champ) J.textes[`formulaires.${k}.dernierChamp`] = e.champ;
          break;
        }
        case 'objectif': {
          inc(J, `objectifs.${hash(e.nom)}.n`);
          J.textes[`objectifs.${hash(e.nom)}.nom`] = e.nom;
          break;
        }
      }
    }
  }

  // Les journées s'écrivent par mise à jour pointée (update avec chemins),
  // ce qui laisse Firestore incrémenter sans relire. Le document est créé
  // vide d'abord si besoin.
  for (const [cle, J] of journees) {
    const ref = db.collection('vh_jours').doc(cle);
    const [site, jour] = [cle.slice(0, cle.indexOf('_')), cle.slice(cle.indexOf('_') + 1)];
    await ref.set({ site, jour }, { merge: true });
    const maj: DocumentData = {};
    for (const [chemin, n] of Object.entries(J.compteurs)) maj[chemin] = FieldValue.increment(n);
    for (const [chemin, t] of Object.entries(J.textes)) maj[chemin] = t;
    maj.maj = Timestamp.now();
    // Firestore plafonne un update à 500 champs : on découpe.
    const entrees = Object.entries(maj);
    for (let i = 0; i < entrees.length; i += 450) {
      await ref.update(Object.fromEntries(entrees.slice(i, i + 450)));
    }
  }

  for (const [cle, C] of cartes) {
    const ref = db.collection('vh_cartes').doc(cle);
    const actuel = await ref.get();
    const d = actuel.exists ? actuel.data() as DocumentData : {};
    const [site, jour, device] = cle.split('_');
    const clics = ((d.clics as DocumentData[]) || []).concat(C.clics).slice(-POINTS_CLICS_MAX);
    const mouv = ((d.mouv as number[]) || []).concat(C.mouv).slice(-POINTS_MOUV_MAX * 2);
    const scroll: Compteurs = { ...(d.scroll || {}) };
    for (const [b, n] of Object.entries(C.scroll)) scroll[b] = (scroll[b] || 0) + n;
    await ref.set({
      site, jour, device, page: cle.split('_').slice(3).join('_'),
      clics, mouv, scroll,
      vues: (d.vues || 0) + C.vues,
      nClics: (d.nClics || 0) + C.clics.length,
      maj: Timestamp.now(),
    });
  }

  const batch = db.batch();
  for (const doc of snap.docs) batch.update(doc.ref, { agrege: true });
  await batch.commit();
  return snap.size;
}

export const vhAgreger = onSchedule(
  { schedule: 'every 15 minutes', timeZone: 'America/Toronto', memory: '512MiB', timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    let total = 0;
    for (let i = 0; i < 8; i += 1) {
      const n = await agreger(db);
      total += n;
      if (n < 400) break;
    }
    if (total) console.log(`[vexelhotjar] ${total} lots agrégés`);
  },
);

function exigerAdmin(req: { auth?: { token: { email?: string; email_verified?: boolean } } }) {
  const email = String(req.auth?.token.email || '').toLowerCase();
  if (!req.auth || !ADMIN_EMAILS.includes(email) || !req.auth.token.email_verified) {
    throw new HttpsError('permission-denied', "Réservé à l'admin.");
  }
}

export const vhAgregerMaintenant = onCall(
  { region: 'us-central1', memory: '512MiB', timeoutSeconds: 300, cors: true },
  async (req) => {
    exigerAdmin(req);
    const db = getFirestore();
    let total = 0;
    for (let i = 0; i < 6; i += 1) {
      const n = await agreger(db);
      total += n;
      if (n < 400) break;
    }
    return { lots: total };
  },
);

export const vhEffacerSession = onCall(
  { region: 'us-central1', cors: true },
  async (req) => {
    exigerAdmin(req);
    const sid = texte((req.data || {}).sid, 64);
    if (!/^[a-z0-9-]{8,64}$/.test(sid)) throw new HttpsError('invalid-argument', 'Session inconnue.');
    const db = getFirestore();
    await getStorage().bucket().deleteFiles({ prefix: `vh/replays/${sid}/` }).catch(() => {});
    await db.collection('vh_sessions').doc(sid).delete();
    return { ok: true };
  },
);

// ─── La purge : chaque donnée a sa durée de vie ─────────────────────────────

async function effacerRequete(q: FirebaseFirestore.Query, apres?: (d: FirebaseFirestore.QueryDocumentSnapshot) => Promise<void>): Promise<number> {
  let total = 0;
  for (;;) {
    const snap = await q.limit(300).get();
    if (snap.empty) return total;
    if (apres) for (const d of snap.docs) await apres(d);
    const batch = q.firestore.batch();
    for (const d of snap.docs) batch.delete(d.ref);
    await batch.commit();
    total += snap.size;
    if (snap.size < 300) return total;
  }
}

export const vhPurger = onSchedule(
  { schedule: 'every day 04:10', timeZone: 'America/Toronto', memory: '512MiB', timeoutSeconds: 540 },
  async () => {
    const db = getFirestore();
    const bucket = getStorage().bucket();
    const limite = (jours: number) => Timestamp.fromMillis(Date.now() - jours * 86_400_000);
    const lots = await effacerRequete(db.collection('vh_lots').where('agrege', '==', true).where('recu', '<', limite(RETENTION_LOTS_JOURS)));
    const sessions = await effacerRequete(
      db.collection('vh_sessions').where('debut', '<', limite(RETENTION_SESSIONS_JOURS)),
      async (d) => { if (d.get('enregistre')) await bucket.deleteFiles({ prefix: `vh/replays/${d.id}/` }).catch(() => {}); },
    );
    const jours = await effacerRequete(db.collection('vh_jours').where('jour', '<', jourDe(Date.now() - RETENTION_JOURS_JOURS * 86_400_000)));
    const cartes = await effacerRequete(db.collection('vh_cartes').where('jour', '<', jourDe(Date.now() - RETENTION_JOURS_JOURS * 86_400_000)));
    console.log(`[vexelhotjar] purge : ${lots} lots, ${sessions} sessions, ${jours} journées, ${cartes} cartes`);
  },
);
