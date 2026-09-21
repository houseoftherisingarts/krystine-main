import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { gunzipSync, gzipSync } from 'zlib';
import { createHash } from 'crypto';
import { ADMIN_EMAILS } from './newsletter/send';

// ─── VexelHotjar : la mesure du comportement des visiteurs ──────────────────
// Le module maison qui remplace Hotjar : le petit script du site
// (src/vexelhotjar/tracker.ts) envoie ses lots d'événements ici, à l'adresse
// /api/vh que l'hébergement réécrit vers cette fonction. Rien ne part du
// navigateur avant le consentement aux témoins, aucune adresse IP n'est
// gardée, et les enregistrements de session masquent tout ce qui se tape.
//
// Trois portes et deux horloges :
//   vhCollecter          reçoit les lots (clics, vues, défilement, erreurs,
//                        formulaires) et les morceaux d'enregistrement rrweb
//   vhAgreger            toutes les 15 minutes, fond les lots dans les
//                        journées (vh_jours) et les cartes (vh_cartes)
//   vhAgregerMaintenant  le bouton « Rafraîchir » de l'admin, même travail
//   vhEffacerSession     l'admin retire une session et son enregistrement
//   vhPurger             chaque nuit, jette ce qui a dépassé sa durée de vie
//
// Collections : vh_lots (brut, quelques jours), vh_sessions (une fiche par
// visite, 90 jours), vh_jours (une fiche par jour et par site, 400 jours),
// vh_cartes (les points des cartes de chaleur par page, appareil et jour).
// Les enregistrements vivent dans Storage sous vh/replays/<session>/<n>.json.gz.

const SITES_PERMIS = ['krystine'];
const ORIGINES_DEV = ['http://localhost:5173', 'http://localhost:5199', 'http://127.0.0.1:5173'];
const TAILLE_MAX_LOT = 1_000_000;         // un lot d'événements ne dépasse jamais 1 Mo
const TAILLE_MAX_REPLAY = 6_000_000;      // un morceau d'enregistrement, gzippé ou non
const EVENEMENTS_MAX = 600;
const POINTS_CLICS_MAX = 4000;            // par carte (page × appareil × jour)
const POINTS_MOUV_MAX = 3000;
const RETENTION_LOTS_JOURS = 3;
const RETENTION_SESSIONS_JOURS = 90;
const RETENTION_JOURS_JOURS = 400;

type Device = 'mobile' | 'tablette' | 'ordinateur';

// ─── Petites mains ──────────────────────────────────────────────────────────

const texte = (v: unknown, max: number): string => String(v ?? '').slice(0, max);
const nombre = (v: unknown, min: number, max: number, defaut = 0): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, n));
};
// Hexadécimal seulement : la clé sert de segment de chemin dans un update() pointé.
const hash = (s: string): string => createHash('sha1').update(s).digest('hex').slice(0, 10);

/** Une clé de champ Firestore sûre pour un chemin de page : /formations/vata → formations_vata. */
function clePage(path: string): string {
  const c = path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  return c || 'accueil';
}

function jourDe(ms: number): string {
  // Le jour se compte à l'heure de Montréal, comme le reste de l'admin.
  return new Date(ms).toLocaleDateString('sv-SE', { timeZone: 'America/Toronto' });
}

const FORMAT_HEURE = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', hour: '2-digit', hourCycle: 'h23' });
function heureDe(ms: number): number {
  return Number(FORMAT_HEURE.format(new Date(ms))) || 0;
}
const TAGS_INTERACTIFS = new Set(['a', 'button', 'input', 'select', 'textarea', 'label', 'summary', 'video', 'audio']);

function deviceDe(vw: number): Device {
  if (vw < 768) return 'mobile';
  if (vw < 1100) return 'tablette';
  return 'ordinateur';
}

function hoteDe(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// Une cadence par adresse (hachée avec un sel du jour, jamais gardée) :
// 240 requêtes par minute et par instance, largement au-dessus d'une vraie
// visite, assez bas pour qu'un script qui boucle ne remplisse pas la base.
const cadence = new Map<string, { n: number; t: number }>();
function tropVite(ip: string): boolean {
  const cle = hash(ip + jourDe(Date.now()));
  const now = Date.now();
  const e = cadence.get(cle);
  if (!e || now - e.t > 60_000) { cadence.set(cle, { n: 1, t: now }); return false; }
  e.n += 1;
  return e.n > 240;
}

function corpsDe(req: { rawBody?: Buffer; body?: unknown }): unknown {
  let buf = req.rawBody;
  if (!buf || !buf.length) {
    if (typeof req.body === 'string') buf = Buffer.from(req.body);
    else if (req.body && typeof req.body === 'object') return req.body;
    else return null;
  }
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
  return JSON.parse(buf.toString('utf8'));
}

// ─── vhCollecter : la porte d'entrée du script ──────────────────────────────

export const vhCollecter = onRequest(
  { region: 'us-central1', memory: '256MiB', maxInstances: 6, timeoutSeconds: 30 },
  async (req, res) => {
    const origine = req.get('origin') || '';
    if (ORIGINES_DEV.includes(origine)) {
      res.set('Access-Control-Allow-Origin', origine);
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send(''); return; }

    const ip = (req.get('x-forwarded-for') || req.ip || '').split(',')[0].trim();
    if (tropVite(ip)) { res.status(429).send(''); return; }

    let d: any;
    try { d = corpsDe(req); } catch { res.status(400).send(''); return; }
    if (!d || typeof d !== 'object' || d.v !== 1) { res.status(400).send(''); return; }

    const site = texte(d.site, 40);
    const sid = texte(d.sid, 64);
    if (!SITES_PERMIS.includes(site) || !/^[a-z0-9-]{8,64}$/.test(sid)) { res.status(400).send(''); return; }

    const db = getFirestore();
    const pays = texte(req.get('x-country-code') || req.get('cf-ipcountry') || '', 2).toUpperCase() || undefined;
    const recu = Date.now();

    try {
      if (d.t === 'replay') {
        await recevoirReplay(db, site, sid, d, recu);
      } else {
        await recevoirLot(db, site, sid, d, recu, pays);
      }
    } catch (e) {
      console.error('[vexelhotjar] lot refusé', (e as Error).message);
      res.status(400).send('');
      return;
    }
    res.status(204).send('');
  },
);

async function recevoirLot(db: FirebaseFirestore.Firestore, site: string, sid: string, d: any, recu: number, pays?: string) {
  const ev: unknown[] = Array.isArray(d.ev) ? d.ev.slice(0, EVENEMENTS_MAX) : [];
  if (!ev.length) return;
  if (JSON.stringify(ev).length > TAILLE_MAX_LOT) throw new Error('lot trop gros');

  const parcours: string[] = Array.isArray(d.parcours) ? d.parcours.slice(0, 60).map((p: unknown) => texte(p, 200)) : [];
  const vid = texte(d.vid, 64) || undefined;

  // Les événements sont nettoyés champ par champ : rien d'autre que ce que
  // le script est censé envoyer n'entre dans la base.
  const propres = ev.map((e: any) => nettoyer(e)).filter(Boolean) as DocumentData[];
  if (!propres.length) return;

  const premier = propres.find(e => e.t === 'vue');
  const sorties = propres.filter(e => e.t === 'sortie');
  const nbClics = propres.filter(e => e.t === 'clic').length;
  const rage = propres.filter(e => e.t === 'clic' && e.r).length;
  const mort = propres.filter(e => e.t === 'clic' && e.m).length;
  const erreurs = propres.filter(e => e.t === 'erreur').length;
  const dureeMs = sorties.reduce((s, e) => s + (e.duree || 0), 0);
  const debut = Math.min(...propres.map(e => e.ts));
  const fin = Math.max(...propres.map(e => e.ts));

  const lot = db.collection('vh_lots').doc();
  const session = db.collection('vh_sessions').doc(sid);
  const existante = await session.get();
  const batch = db.batch();
  batch.set(lot, { site, sid, vid: vid || null, nouveau: !!d.nouveau, recu: Timestamp.fromMillis(recu), jour: jourDe(recu), ev: propres, agrege: false });

  const fiche: DocumentData = {
    site, sid,
    fin: Timestamp.fromMillis(fin),
    nbClics: FieldValue.increment(nbClics),
    rage: FieldValue.increment(rage),
    mort: FieldValue.increment(mort),
    erreurs: FieldValue.increment(erreurs),
    dureeMs: FieldValue.increment(dureeMs),
  };
  if (parcours.length) { fiche.parcours = parcours; fiche.nbPages = parcours.length; }
  if (vid) fiche.vid = vid;
  if (pays) fiche.pays = pays;
  if (premier) {
    if (premier.premier) {
      fiche.debut = Timestamp.fromMillis(premier.ts);
      fiche.jour = jourDe(premier.ts);
      fiche.device = premier.device;
      fiche.vw = premier.vw;
      fiche.lang = premier.lang || null;
      fiche.ref = premier.ref || null;
      fiche.utm = premier.utm || null;
      fiche.nouveau = !!d.nouveau;
      fiche.entree = premier.path;
    }
    const derniere = propres.filter(e => e.t === 'vue').pop();
    if (derniere) fiche.derniere = derniere.path;
  }
  // Une session dont la première vue s'est perdue garde tout de même une
  // date de début, posée une seule fois et jamais reculée ni avancée.
  if (!existante.exists || !existante.get('debut')) { fiche.debut = fiche.debut || Timestamp.fromMillis(debut); fiche.jour = fiche.jour || jourDe(debut); }
  batch.set(session, fiche, { merge: true });
  await batch.commit();
}

function nettoyer(e: any): DocumentData | null {
  if (!e || typeof e !== 'object') return null;
  const t = texte(e.t, 10);
  const ts = nombre(e.ts, 1_600_000_000_000, 4_000_000_000_000, 0);
  const path = texte(e.path, 200) || '/';
  const pv = texte(e.pv, 40);
  if (!ts || !pv) return null;
  const base = { t, ts, path, pv };
  switch (t) {
    case 'vue': {
      const vw = nombre(e.vw, 200, 10000, 1280);
      const utm = e.utm && typeof e.utm === 'object'
        ? Object.fromEntries(Object.entries(e.utm).slice(0, 5).map(([k, v]) => [texte(k, 20), texte(v, 80)]))
        : null;
      return {
        ...base,
        titre: texte(e.titre, 120),
        ref: texte(e.ref, 300),
        vw, vh: nombre(e.vh, 200, 10000, 800),
        device: deviceDe(vw),
        lang: texte(e.lang, 8),
        premier: !!e.premier,
        utm: utm && Object.keys(utm).length ? utm : null,
      };
    }
    case 'sortie':
      return {
        ...base,
        duree: nombre(e.duree, 0, 6 * 3600_000),
        scrollMax: nombre(e.scrollMax, 0, 100),
        pages: nombre(e.pages, 0, 1000),
        fin: !!e.fin,
      };
    case 'clic':
      return {
        ...base,
        s: texte(e.s, 300),
        tx: texte(e.tx, 60),
        href: texte(e.href, 300),
        tg: texte(e.tg, 12),
        ex: nombre(e.ex, 0, 1), ey: nombre(e.ey, 0, 1),
        vx: nombre(e.vx, 0, 1), dy: nombre(e.dy, 0, 200000), hd: nombre(e.hd, 0, 200000),
        vw: nombre(e.vw, 200, 10000, 1280),
        r: !!e.r, m: !!e.m,
        obj: texte(e.obj, 40) || null,
      };
    case 'mouv': {
      const pts = Array.isArray(e.pts) ? e.pts.slice(0, 800).map((n: unknown) => nombre(n, 0, 200000)) : [];
      return { ...base, vw: nombre(e.vw, 200, 10000, 1280), pts };
    }
    case 'erreur':
      return { ...base, msg: texte(e.msg, 200), src: texte(e.src, 200), ligne: nombre(e.ligne, 0, 1e6) };
    case 'form':
      return { ...base, s: texte(e.s, 300), etat: texte(e.etat, 10), champ: texte(e.champ, 80) };
    case 'objectif':
      return { ...base, nom: texte(e.nom, 40) };
    default:
      return null;
  }
}

async function recevoirReplay(db: FirebaseFirestore.Firestore, site: string, sid: string, d: any, recu: number) {
  const seq = nombre(d.seq, 0, 100000);
  const events = d.events;
  if (!Array.isArray(events) || !events.length) return;
  const json = JSON.stringify(events);
  if (json.length > TAILLE_MAX_REPLAY) throw new Error('morceau trop gros');
  const gz = gzipSync(Buffer.from(json));
  const fichier = getStorage().bucket().file(`vh/replays/${sid}/${String(seq).padStart(5, '0')}.json.gz`);
  await fichier.save(gz, { contentType: 'application/gzip', resumable: false, metadata: { cacheControl: 'private, max-age=0' } });
  const ref = db.collection('vh_sessions').doc(sid);
  const fiche = await ref.get();
  const maj: DocumentData = {
    site, sid,
    enregistre: true,
    chunks: FieldValue.increment(1),
    octets: FieldValue.increment(gz.length),
    replayMaj: Timestamp.fromMillis(recu),
  };
  // La date de début vient du premier lot d'événements; si l'enregistrement
  // arrive avant lui, elle se pose ici et le lot ne la déplacera pas.
  if (!fiche.exists || !fiche.get('debut')) { maj.debut = Timestamp.fromMillis(recu); maj.jour = jourDe(recu); }
  await ref.set(maj, { merge: true });
}

// ─── L'agrégation : des lots aux journées et aux cartes ─────────────────────

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
