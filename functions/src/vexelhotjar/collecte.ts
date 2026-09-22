import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { gunzipSync, gzipSync } from 'zlib';
import {
  SITES_PERMIS, ORIGINES_DEV, HOTES_PERMIS, TAILLE_MAX_LOT, TAILLE_MAX_REPLAY, EVENEMENTS_MAX, DOC_EXCLUSIONS, DOC_REGLAGES, CACHE_REGLAGES_MS,
  texte, cheminSur, nombre, hash, jourDe, deviceDe, hoteDe, adresseDe, chaineDe,
} from './commun';

// ─── La collecte : lots d'événements et morceaux d'enregistrement ───────────
// Voir commun.ts pour la vue d'ensemble du module.

// La cadence se compte par instance et par adresse (240 lots la minute); la
// borne ferme reste maxInstances × 240. Le compteur se vide de ses entrées
// mortes dès qu'il grossit, pour que la mémoire ne suive pas le nombre
// d'adresses vues dans la journée.
const cadence = new Map<string, { n: number; t: number }>();
function tropVite(ip: string): boolean {
  const cle = hash((ip || 'inconnue') + jourDe(Date.now()));
  const now = Date.now();
  if (cadence.size > 5000) {
    for (const [k, v] of cadence) if (now - v.t > 60_000) cadence.delete(k);
  }
  const e = cadence.get(cle);
  if (!e || now - e.t > 60_000) { cadence.set(cle, { n: 1, t: now }); return false; }
  e.n += 1;
  return e.n > 240;
}

// Débit global de l'instance, toutes adresses confondues : l'adresse IP
// derrière l'hébergement se lit à sa place dans x-forwarded-for, mais un
// appel direct à l'URL run.app de la fonction peut en forger une par requête
// et contourner la cadence par adresse; ce plafond et la cadence par session
// bornent ce qu'un tel appel peut écrire.
const DEBIT_GLOBAL_PAR_MIN = 3000;
let debit = { n: 0, t: 0 };
function tropDeMonde(): boolean {
  const now = Date.now();
  if (now - debit.t > 60_000) debit = { n: 0, t: now };
  debit.n += 1;
  return debit.n > DEBIT_GLOBAL_PAR_MIN;
}

// L'hôte annoncé par le navigateur (Origin, sinon Referer) doit être le site.
function hotePermis(req: { get: (h: string) => string | undefined }): boolean {
  const hote = hoteDe(req.get('origin') || req.get('referer') || '');
  return HOTES_PERMIS.includes(hote);
}

// Le corps se borne avant d'être décompressé et relu : la taille brute, puis
// la taille décompressée (un petit gzip peut cacher des gigaoctets).
function corpsDe(req: { rawBody?: Buffer; body?: unknown }): unknown {
  let buf = req.rawBody;
  if (!buf || !buf.length) {
    if (typeof req.body === 'string') buf = Buffer.from(req.body);
    else if (req.body && typeof req.body === 'object') return req.body;
    else return null;
  }
  if (buf.length > TAILLE_MAX_REPLAY) throw new Error('corps trop gros');
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf, { maxOutputLength: TAILLE_MAX_REPLAY });
  return JSON.parse(buf.toString('utf8'));
}

// Ce que l'admin a réglé, relu au plus une fois par cinq minutes par
// instance : la mesure allumée ou non et les chemins à ignorer
// (settings/vexelhotjar), et les adresses de Krystine et d'Alex
// (vh_prive/exclusions). Mesure éteinte ou adresse hors compte : le lot
// reçoit un 204 sans rien écrire; un chemin ignoré perd ses événements.
interface Reglages { actif: boolean; exclure: string[]; ips: Set<string>; t: number }
let reglages: Reglages = { actif: true, exclure: [], ips: new Set(), t: 0 };
async function lireReglages(db: FirebaseFirestore.Firestore): Promise<Reglages> {
  if (Date.now() - reglages.t < CACHE_REGLAGES_MS) return reglages;
  try {
    const [r, x] = await Promise.all([
      db.collection(DOC_REGLAGES[0]).doc(DOC_REGLAGES[1]).get(),
      db.collection(DOC_EXCLUSIONS[0]).doc(DOC_EXCLUSIONS[1]).get(),
    ]);
    const liste = (x.data()?.ips || []) as { ip?: unknown }[];
    const exclure = (Array.isArray(r.data()?.exclure) ? r.data()!.exclure : []) as unknown[];
    reglages = {
      actif: r.exists ? r.data()!.actif !== false : true,
      exclure: exclure.map(c => texte(c, 200)).filter(c => c.startsWith('/')),
      ips: new Set(liste.map(e => String(e?.ip || '').trim()).filter(Boolean)),
      t: Date.now(),
    };
  } catch (e) {
    console.error('[vexelhotjar] réglages illisibles', (e as Error).message);
    reglages = { ...reglages, t: Date.now() };
  }
  return reglages;
}
const cheminIgnore = (path: string, exclure: string[]) => exclure.some(p => path === p || path.startsWith(p.endsWith('/') ? p : p + '/'));

// ─── vhCollecter : la porte d'entrée du script ──────────────────────────────


export const vhCollecter = onRequest(
  { region: 'us-central1', memory: '256MiB', maxInstances: 6, timeoutSeconds: 30 },
  async (req, res) => {
    const origine = req.get('origin') || '';
    if (ORIGINES_DEV.includes(origine)) {
      res.set('Access-Control-Allow-Origin', origine);
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    // GET /api/vh?moi : l'adresse de qui appelle, vue d'ici, par le même
    // chemin que les lots (l'hébergement, puis cette fonction), pour que le
    // bouton « Exclure cette adresse » de l'admin pose la bonne.
    if (req.method === 'GET') {
      if (!('moi' in req.query)) { res.status(404).send(''); return; }
      res.set('Cache-Control', 'no-store');
      res.json({ ip: adresseDe(req), chaine: chaineDe(req), pays: texte(req.get('x-country-code') || '', 2) || null });
      return;
    }
    if (req.method !== 'POST') { res.status(405).send(''); return; }
    if (!hotePermis(req)) { res.status(403).send(''); return; }

    const ip = adresseDe(req);
    if (tropVite(ip)) { res.status(429).send(''); return; }

    let d: any;
    try { d = corpsDe(req); } catch { res.status(400).send(''); return; }
    if (!d || typeof d !== 'object' || d.v !== 1) { res.status(400).send(''); return; }

    const site = texte(d.site, 40);
    const sid = texte(d.sid, 64);
    if (tropVite('sid:' + sid) || tropDeMonde()) { res.status(429).send(''); return; }
    if (!SITES_PERMIS.includes(site) || !/^[a-z0-9-]{8,64}$/.test(sid)) { res.status(400).send(''); return; }

    const db = getFirestore();
    const r = await lireReglages(db);
    if (!r.actif || (ip && r.ips.has(ip))) { res.status(204).send(''); return; }
    const pays = texte(req.get('x-country-code') || req.get('cf-ipcountry') || '', 2).toUpperCase() || undefined;
    const recu = Date.now();

    try {
      if (d.t === 'replay') {
        await recevoirReplay(db, site, sid, d, recu);
      } else {
        await recevoirLot(db, site, sid, d, recu, pays, r.exclure);
      }
    } catch (e) {
      console.error('[vexelhotjar] lot refusé', (e as Error).message);
      res.status(400).send('');
      return;
    }
    res.status(204).send('');
  },
);

async function recevoirLot(db: FirebaseFirestore.Firestore, site: string, sid: string, d: any, recu: number, pays?: string, exclure: string[] = []) {
  const ev: unknown[] = Array.isArray(d.ev) ? d.ev.slice(0, EVENEMENTS_MAX) : [];
  if (!ev.length) return;
  if (Buffer.byteLength(JSON.stringify(ev)) > TAILLE_MAX_LOT) throw new Error('lot trop gros');

  const parcours: string[] = Array.isArray(d.parcours) ? d.parcours.slice(0, 60).map((p: unknown) => texte(p, 200)) : [];
  const vid = texte(d.vid, 64) || undefined;

  // Les événements sont nettoyés champ par champ : rien d'autre que ce que
  // le script est censé envoyer n'entre dans la base.
  const propres = (ev.map((e: any) => nettoyer(e)).filter(Boolean) as DocumentData[]).filter(e => !cheminIgnore(e.path, exclure));
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
  const path = cheminSur(e.path);
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
        clos: e.clos ? 1 : 0,   // 1 : la vue de page est close (changement de page ou fermeture); 0 : l'onglet passe à l'arrière-plan
        pages: nombre(e.pages, 0, 1000),
        fin: !!e.fin,
        vw: nombre(e.vw, 200, 10000, 1280),
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
        r: !!e.r, m: !!e.m, ia: !!e.ia,
        obj: texte(e.obj, 40) || null,
        niv: e.niv === 'gros' ? 'gros' : 'petit',
      };
    case 'mouv': {
      const pts = Array.isArray(e.pts) ? e.pts.slice(0, 800).map((n: unknown) => nombre(n, 0, 200000)) : [];
      // nrm: 1 quand le traceur a déjà mis y en dix-millièmes de la hauteur
      // du document au moment de chaque point; sinon hd sert à le faire ici.
      return { ...base, vw: nombre(e.vw, 200, 10000, 1280), hd: nombre(e.hd, 0, 200000), nrm: e.nrm ? 1 : 0, pts };
    }
    case 'erreur':
      return { ...base, msg: texte(e.msg, 200), src: texte(e.src, 200), ligne: nombre(e.ligne, 0, 1e6) };
    case 'form':
      return { ...base, s: texte(e.s, 300), etat: texte(e.etat, 10), champ: texte(e.champ, 80) };
    case 'objectif':
      return { ...base, nom: texte(e.nom, 40), niv: e.niv === 'gros' ? 'gros' : 'petit' };
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

