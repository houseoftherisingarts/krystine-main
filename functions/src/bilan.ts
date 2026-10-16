import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { MAIL_SECRETS, createTransporter, fromAddr, REPLY_TO } from './newsletter/mail';
import { assertAdmin } from './newsletter/send';
import { calculerFilet } from './filet';
import { jetonShopify, SECRETS_SHOPIFY } from './shopify/jeton';

// ─── Le bilan du matin (Krystine, 6 oct. 2026) ──────────────────────────────
// « Une tâche chaque matin pour s'assurer que tout fonctionne et aller
// chercher les stats. » Le filet (filet.ts) vérifie les pages et les clés;
// le bilan ajoute les chiffres de la veille et des 7 derniers jours, et part
// chaque matin à Krystine, à elle seule. Il est rangé dans sante/bilanDuMatin
// (le dernier, lu par le tableau de bord de l'admin) et dans
// sante/bilanDuMatin/jours/{AAAA-MM-JJ} (l'historique).
// Chaque chiffre est lu à part : un chiffre qui échoue s'affiche « ? » sans
// empêcher le reste du bilan de partir.

const BILAN_A = 'krystine@inspiratanature.com';
const SITE_VH = 'krystine';
const FUSEAU = 'America/Toronto';

const jourDe = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: FUSEAU }).format(d);
const decaler = (jour: string, n: number) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Minuit à Montréal pour une date AAAA-MM-JJ. */
function minuit(jour: string): Date {
  const midi = new Date(`${jour}T12:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, timeZoneName: 'longOffset' })
    .formatToParts(midi).find((p) => p.type === 'timeZoneName')?.value.replace('GMT', '') || '-05:00';
  return new Date(`${jour}T00:00:00${off === '' ? 'Z' : off}`);
}

async function sur<T>(f: () => Promise<T>): Promise<T | null> {
  try { return await f(); } catch (e) { console.warn('[bilan]', (e as Error).message); return null; }
}

const ts = (d: Date) => Timestamp.fromDate(d);

async function compterEntre(col: string, champ: string, de: Date, a: Date): Promise<number> {
  const s = await getFirestore().collection(col).where(champ, '>=', ts(de)).where(champ, '<', ts(a)).count().get();
  return s.data().count;
}

interface Inscriptions { total: number; nouvelles: number; connues: number; parSource: Record<string, number> }
/** Les fiches d'infolettre créées dans la fenêtre; « nouvelle » = adresse jamais vue dans la liste avant. */
async function inscriptions(de: Date, a: Date): Promise<Inscriptions> {
  const db = getFirestore();
  const snap = await db.collection('newsletter').where('subscribedAt', '>=', ts(de)).where('subscribedAt', '<', ts(a)).get();
  const r: Inscriptions = { total: snap.size, nouvelles: 0, connues: 0, parSource: {} };
  const vues = new Set<string>();
  for (const d of snap.docs) {
    const src = String(d.get('source') || 'inconnue');
    r.parSource[src] = (r.parSource[src] || 0) + 1;
    const email = String(d.get('email') || '').toLowerCase();
    if (!email || vues.has(email)) continue;
    vues.add(email);
    const autres = await db.collection('newsletter').where('email', '==', email).limit(10).get();
    const avant = autres.docs.some((x) => x.id !== d.id && ((x.get('subscribedAt') as Timestamp | undefined)?.toMillis() ?? 0) < de.getTime());
    if (avant) r.connues++; else r.nouvelles++;
  }
  return r;
}

interface Journee { sessions: number; nouveaux: number; quizCommence: number; quizFini: number; pub: number; infolettre: number; campagnes: Record<string, number>; affiche: number; accepte: number; refuse: number }
async function journees(jours: string[]): Promise<Journee> {
  const db = getFirestore();
  const r: Journee = { sessions: 0, nouveaux: 0, quizCommence: 0, quizFini: 0, pub: 0, infolettre: 0, campagnes: {}, affiche: 0, accepte: 0, refuse: 0 };
  // Les choix faits sur la bannière des témoins (vh_consentement, compteur anonyme posé le 13 oct. 2026).
  const choix = await db.getAll(...jours.map((j) => db.doc(`vh_consentement/${SITE_VH}_${j}`)));
  for (const d of choix) { r.affiche += Number(d.get('affiche')) || 0; r.accepte += Number(d.get('accepte')) || 0; r.refuse += Number(d.get('refuse')) || 0; }
  const docs = await db.getAll(...jours.map((j) => db.doc(`vh_jours/${SITE_VH}_${j}`)));
  for (const d of docs) {
    if (!d.exists) continue;
    const x = d.data() || {};
    r.sessions += Number(x.sessions) || 0;
    r.nouveaux += Number(x.nouveaux) || 0;
    for (const o of Object.values((x.objectifs || {}) as Record<string, { n?: number; nom?: string }>)) {
      if (o.nom === 'quiz_commence') r.quizCommence += o.n || 0;
      if (o.nom === 'quiz_resultat_vu') r.quizFini += o.n || 0;
    }
    for (const c of Object.values((x.campagnes || {}) as Record<string, { n?: number; source?: string; campagne?: string }>)) {
      // Les liens des infolettres portent aussi des utm : ils se comptent à part, jamais comme de la publicité.
      // Les séries de lettres (suite-vent, accueil-vata...) et le courriel du résultat du quiz aussi :
      // le 13 oct. 2026, elles gonflaient « visites venues de la publicité » (19 au lieu de 3).
      const src = c.source || '';
      if (src === 'infolettre' || /^(suite-|accueil-|courriel)/.test(src)) { r.infolettre += c.n || 0; continue; }
      r.pub += c.n || 0;
      const nom = [c.source, c.campagne].filter(Boolean).join(' · ') || 'sans nom';
      r.campagnes[nom] = (r.campagnes[nom] || 0) + (c.n || 0);
    }
  }
  return r;
}

/** Le chemin d'une vente, en mots (champs via et viaLettre posés par la caisse). */
function provenance(via: string, lettre: string): string {
  const serie: Record<string, string> = { 'suite-vent': 'Vent', 'suite-feu': 'Feu', 'suite-terre': 'Terre' };
  const noLettre = /^l(\d+)$/.exec(lettre)?.[1];
  if (serie[via]) return `série de lettres ${serie[via]}${noLettre ? `, lettre ${noLettre}` : ''}`;
  if (noLettre) return `lettre ${noLettre}`;
  if (via === 'quiz') return 'après le quiz';
  if (via) return via;
  return 'chemin inconnu';
}

/** Une vente test (1 $ avant taxes) ne compte jamais dans les chiffres. */
const estTest = (centsHT: number) => centsHT > 0 && centsHT <= 100;

/**
 * Les ventes Stripe du site, comme les compte l'admin : formations
 * (achatsFormations, avec sessionId),
 * paquets de niskas et pourboires. Montants taxes comprises, ventes test
 * de 1 $ exclues (elles gonflaient le total, 12 oct. 2026).
 */
interface LigneVente { jour: string; montant: number; titre: string }
async function ventes(de: Date, a: Date): Promise<{ n: number; montant: number; titres: string[]; detail: LigneVente[] }> {
  const db = getFirestore();
  // Les niskas et les pourboires ne font jamais tomber le compte des formations.
  const ouVide = <T,>(p: Promise<T>) => p.catch(() => null);
  const [parAchat, niskas, pourboires] = await Promise.all([
    db.collectionGroup('formations').where('acheteLe', '>=', ts(de)).where('acheteLe', '<', ts(a)).get(),
    ouVide(db.collection('pointsEvents').where('kind', '==', 'achat-niskas').get()),
    ouVide(db.collection('pourboires').where('at', '>=', ts(de)).where('at', '<', ts(a)).get()),
  ]);
  const lignes: LigneVente[] = [];
  const jourDeTs = (t: unknown) => { const d = (t as { toDate?: () => Date })?.toDate?.(); return d ? jourDe(d) : ''; };
  const vus = new Set<string>();
  for (const d of parAchat.docs) {
    if (d.ref.parent.parent?.parent.id !== 'achatsFormations' || !d.get('sessionId') || vus.has(d.ref.path)) continue;
    vus.add(d.ref.path);
    const total = typeof d.get('total') === 'number' ? Number(d.get('total')) / 100 : Number(d.get('montant')) || 0;
    const ht = typeof d.get('montantHT') === 'number' ? Number(d.get('montantHT')) : Math.round(total * 100);
    if (estTest(ht)) continue;
    const titre = String(d.get('titre') || d.ref.id);
    lignes.push({ jour: jourDeTs(d.get('acheteLe')), montant: total, titre: `${titre} (${provenance(String(d.get('via') || ''), String(d.get('viaLettre') || ''))})` });
  }
  for (const d of niskas?.docs || []) {
    const quand = d.get('at')?.toDate?.() as Date | undefined;
    if (!quand || quand < de || quand >= a) continue;
    const montant = Number(d.get('meta.total')) / 100 || Number(d.get('meta.montant')) || 0;
    if (estTest(Math.round(montant * 100))) continue;
    lignes.push({ jour: jourDe(quand), montant, titre: `${d.get('amount') || ''} niskas` });
  }
  for (const d of pourboires?.docs || []) lignes.push({ jour: jourDeTs(d.get('at')), montant: Number(d.get('montant')) || 0, titre: 'pourboire du direct' });
  lignes.sort((x, y) => x.jour.localeCompare(y.jour));
  return {
    n: lignes.length,
    montant: Math.round(lignes.reduce((s, l) => s + l.montant, 0) * 100) / 100,
    titres: lignes.map((l) => l.titre),
    detail: lignes,
  };
}

interface CommandeShopify { nom: string; numero: number; montant: number; cree: Date }
/**
 * Les commandes lues directement dans Shopify (16 oct. 2026, Krystine : « tes stats
 * de Shopify ne sont pas à jour ») : le webhook en manquait. Montant = total actuel
 * de la commande (remboursements déduits), commandes annulées et tests exclus.
 */
async function commandesShopifyEntre(de: Date, a: Date): Promise<CommandeShopify[]> {
  const { shop, token } = await jetonShopify();
  const q = `created_at:>='${de.toISOString()}' created_at:<'${a.toISOString()}'`;
  const toutes: CommandeShopify[] = [];
  let apres: string | null = null;
  for (let page = 0; page < 40; page++) {
    const resp = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
      method: 'POST',
      headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query($q: String!, $apres: String) { orders(first: 250, after: $apres, query: $q, sortKey: CREATED_AT) {
          nodes { name number createdAt cancelledAt test currentTotalPriceSet { shopMoney { amount } } }
          pageInfo { hasNextPage endCursor } } }`,
        variables: { q, apres },
      }),
    });
    if (!resp.ok) throw new Error(`Shopify ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const json = (await resp.json()) as {
      data?: { orders: { nodes: { name: string; number: number; createdAt: string; cancelledAt: string | null; test: boolean; currentTotalPriceSet: { shopMoney: { amount: string } } }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } };
      errors?: { message: string }[];
    };
    if (json.errors?.length || !json.data) throw new Error(`Shopify : ${(json.errors || []).map((e) => e.message).join('; ').slice(0, 300)}`);
    for (const o of json.data.orders.nodes) {
      const montant = Number(o.currentTotalPriceSet.shopMoney.amount) || 0;
      if (o.cancelledAt || o.test || montant <= 1) continue;
      toutes.push({ nom: o.name, numero: o.number, montant, cree: new Date(o.createdAt) });
    }
    if (!json.data.orders.pageInfo.hasNextPage) break;
    apres = json.data.orders.pageInfo.endCursor;
  }
  return toutes;
}

/** Les commandes Shopify d'une fenêtre, prises dans la liste lue directement (sinon dans le webhook). */
function shopifyDans(liste: CommandeShopify[], de: Date, a: Date) {
  const vraies = liste.filter((o) => o.cree >= de && o.cree < a).sort((x, y) => x.numero - y.numero);
  return {
    n: vraies.length,
    montant: Math.round(vraies.reduce((s, o) => s + o.montant, 0) * 100) / 100,
    commandes: vraies.map((o) => ({ nom: o.nom, montant: o.montant })),
  };
}

/** Shopify par le webhook (secours) : seulement si le webhook a rangé au moins une commande dans les 30 derniers jours. */
async function shopify(de: Date, a: Date, il30: Date): Promise<{ n: number; montant: number; commandes: { nom: string; montant: number }[] } | null> {
  const col = getFirestore().collection('shopifyOrders');
  if ((await col.where('createdAt', '>=', ts(il30)).limit(1).get()).empty) return null;
  const snap = await col.where('createdAt', '>=', ts(de)).where('createdAt', '<', ts(a)).get();
  // Une commande annulée ou une commande test à 1 $ n'est pas une vente.
  const vraies = snap.docs.filter((d) => !d.get('cancelledAt') && (Number(d.get('totalPrice')) || 0) > 1);
  return {
    n: vraies.length,
    montant: Math.round(vraies.reduce((s, d) => s + (Number(d.get('totalPrice')) || 0), 0) * 100) / 100,
    commandes: vraies
      .sort((x, y) => (Number(x.get('orderNumber')) || 0) - (Number(y.get('orderNumber')) || 0))
      .map((d) => ({ nom: String(d.get('name') || d.id), montant: Number(d.get('totalPrice')) || 0 })),
  };
}

/** Les commentaires de la pastille « Un commentaire ? Écrivez-nous » (collection bugs, functions/src/pepin.ts), dernières 24 h. */
const TYPES_COMMENTAIRE: Record<string, string> = {
  technique: 'Quelque chose bloque',
  aime: 'J’aime ce que je vois',
  idee: 'Une idée',
  introuvable: 'Je ne trouve pas ce que je cherche',
};
const SOURCES_DEMANDE: Record<string, string> = {
  conferenciere: 'conférence',
  'conference-tour': 'tournée de conférences',
  'medias-entrevue': 'entrevue',
  courriel: 'reçue par courriel',
};
/** Une personne qui attend une réponse, avec le nombre de jours d'attente (du plus ancien au plus récent dans le bilan). */
interface Attente { jours: number; qui: string; quoi: string; ou: string; texte: string }
interface Commentaires { parType: Record<string, number>; lignes: string[]; nonTraites: number; enAttente: string[]; soutien: string[]; quiAttend: Attente[] }
async function commentaires(de: Date): Promise<Commentaires> {
  const db = getFirestore();
  const snap = await db.collection('bugs').where('cree', '>=', ts(de)).orderBy('cree', 'desc').get();
  const parType: Record<string, number> = Object.fromEntries(Object.values(TYPES_COMMENTAIRE).map((t) => [t, 0]));
  const tries = snap.docs.slice().sort((a, b) => Number(b.get('type') === 'technique' || !b.get('type')) - Number(a.get('type') === 'technique' || !a.get('type')));
  const lignes = tries.map((d) => {
    const type = TYPES_COMMENTAIRE[String(d.get('type') || 'technique')] || TYPES_COMMENTAIRE.technique;
    parType[type] = (parType[type] || 0) + 1;
    const qui = String(d.get('nom') || '').trim() || String(d.get('courriel') || '').trim();
    const texte = String(d.get('texte') || '').replace(/\s+/g, ' ').trim();
    return `${type} · ${d.get('page') || 'page inconnue'}${qui ? ` · ${qui}` : ''} : ${texte.slice(0, 140)}${texte.length > 140 ? '…' : ''}`;
  });
  const nonTraites = (await db.collection('bugs').where('statut', 'in', ['nouveau', 'en_cours']).count().get()).data().count;
  // Tout ce qui attend encore une réponse, avec son âge (demande de Krystine, 7 oct. 2026).
  const depuis = (t: unknown) => {
    const ms = (t as { toMillis?: () => number })?.toMillis?.();
    if (!ms) return '';
    const j = Math.floor((Date.now() - ms) / 86_400_000);
    return j <= 0 ? 'aujourd’hui' : j === 1 ? 'depuis hier' : `depuis ${j} jours`;
  };
  const attente = await db.collection('bugs').where('statut', 'in', ['nouveau', 'en_cours']).get();
  const enAttente = attente.docs
    .sort((a, b) => ((a.get('cree')?.toMillis?.() || 0) - (b.get('cree')?.toMillis?.() || 0)))
    .slice(0, 12)
    .map((d) => {
      const qui = String(d.get('nom') || '').trim() || String(d.get('courriel') || '').trim() || 'Une visiteuse';
      const texte = String(d.get('texte') || d.get('description') || '').replace(/\s+/g, ' ').trim();
      return `${qui} (${depuis(d.get('cree'))}, ${d.get('page') || 'page inconnue'}) : ${texte.slice(0, 110)}${texte.length > 110 ? '…' : ''}`;
    });
  const conv = await db.collection('conversations').where('unreadByAdmin', '>', 0).get();
  const soutien = conv.docs.map((d) => {
    const qui = String(d.get('memberName') || '').trim() || String(d.get('memberEmail') || '').trim() || 'Une cliente';
    const dernier = String(d.get('lastMessage') || '').replace(/\s+/g, ' ').trim();
    return `${qui} (${d.get('unreadByAdmin')} message(s) non lu(s)${depuis(d.get('lastMessageAt')) ? `, ${depuis(d.get('lastMessageAt'))}` : ''})${dernier ? ` : ${dernier.slice(0, 100)}` : ''}`;
  });

  // Toutes les personnes qui attendent, réunies et triées du plus ancien au plus récent (Krystine, 14 oct. 2026 : « c'est tout croche »).
  const jours = (t: unknown) => {
    const ms = (t as { toMillis?: () => number })?.toMillis?.();
    return ms ? Math.max(0, Math.floor((Date.now() - ms) / 86_400_000)) : 0;
  };
  const quiAttend: Attente[] = [
    ...attente.docs.map((d) => ({
      jours: jours(d.get('cree')),
      qui: String(d.get('nom') || '').trim() || String(d.get('courriel') || '').trim() || 'Une visiteuse',
      quoi: 'commentaire sur le site',
      ou: `page ${d.get('page') || 'inconnue'}, admin, onglet Commentaires des visiteuses`,
      texte: coupe(String(d.get('texte') || d.get('description') || ''), 110),
    })),
    ...conv.docs.map((d) => ({
      jours: jours(d.get('lastMessageAt')),
      qui: String(d.get('memberName') || '').trim() || String(d.get('memberEmail') || '').trim() || 'Une cliente',
      quoi: `${d.get('unreadByAdmin')} message(s) au soutien non lu(s)`,
      ou: 'admin, onglet Messages',
      texte: coupe(String(d.get('lastMessage') || ''), 100),
    })),
  ];
  const demandes = await sur(() => db.collection('bookingRequests').where('status', '==', 'new').get());
  for (const d of demandes?.docs || []) {
    const org = String(d.get('organization') || '').trim();
    quiAttend.push({
      jours: jours(d.get('createdAt')),
      qui: (String(d.get('name') || '').trim() || 'Quelqu’un') + (org ? `, ${org}` : ''),
      quoi: `demande encore au statut « Nouvelle » (${SOURCES_DEMANDE[String(d.get('source'))] || d.get('source') || 'formulaire'})`,
      ou: 'admin, onglet Demandes',
      texte: coupe(String(d.get('demande') || d.get('message') || ''), 100),
    });
  }
  quiAttend.sort((x, y) => y.jours - x.jours);
  return { parType, lignes, nonTraites, enAttente, soutien, quiAttend };
}

/** La vérification complète du site (scripts/qa/verif-complete.mjs, sur l'ordinateur de Krystine, vers 5 h 45). */
interface Verif { le: Date; pages: number; verifications: number; ok: number; anomalies: { page: string; appareil: string; probleme: string }[] }
async function verifComplete(): Promise<Verif | null> {
  const d = await getFirestore().doc('sante/verifComplete').get();
  if (!d.exists) return null;
  const le = (d.get('le') as Timestamp | undefined)?.toDate();
  if (!le || Date.now() - le.getTime() > 3 * 3600 * 1000) return null;
  return {
    le,
    pages: Number(d.get('pages')) || 0,
    verifications: Number(d.get('verifications')) || 0,
    ok: Number(d.get('ok')) || 0,
    anomalies: ((d.get('anomalies') || []) as Verif['anomalies']).map((a) => ({ page: a.page, appareil: a.appareil, probleme: a.probleme })),
  };
}

/** La veille de nuit des occasions de conférences (~/.iris/veille-conferences, sur l'ordinateur de Krystine, vers 2 h; consigne d'Eric Edmeades du 8 oct. 2026). */
interface Occasion { nom: string; type: string; lieu: string; date: string; dateLimite: string; langue: string; sujet: string; lien: string }
async function veilleConferences(): Promise<{ nouvelles: Occasion[]; total: number } | null> {
  const d = await getFirestore().doc('sante/veilleConferences').get();
  if (!d.exists) return null;
  const le = (d.get('le') as Timestamp | undefined)?.toDate();
  if (!le || Date.now() - le.getTime() > 12 * 3600 * 1000) return null;
  return { nouvelles: (d.get('nouvelles') || []) as Occasion[], total: Number(d.get('total')) || 0 };
}

/** Un titre trop long ou une page lente est à améliorer, pas une panne. */
const estMineure = (probleme: string) => /^(titre trop long|chargement lent)/.test(probleme);

/** « À optimiser aujourd'hui » : au plus 5 points classés par impact, lus dans vh_jours (VexelHotjar) et la vérification complète. Une donnée absente ne produit aucune ligne. */
const coupe = (t: string, max: number) => { const x = t.replace(/\s+/g, ' ').trim(); return x.length > max ? `${x.slice(0, max)}…` : x; };
const fois = (k: number) => (k > 1 ? `${k} fois` : '1 fois');
async function aOptimiser(sept: string[], verif: Verif | null): Promise<{ points: string[]; clics: string[]; accueil: string[] }> {
  const db = getFirestore();
  const docs = await db.getAll(...sept.map((j) => db.doc(`vh_jours/${SITE_VH}_${j}`)));
  const hierI = sept.length - 1;
  type Pt = { score: number; ligne: string };
  const pts: Pt[] = [];
  const nom = (page: string, p?: { path?: string; titre?: string }) => String(p?.path || p?.titre || page);

  // Éléments avec clics de rage ou sans effet.
  const elements = new Map<string, { page: string; tx: string; s: string; hierR: number; r: number; hierM: number; m: number }>();
  // Erreurs, formulaires, défilement.
  const erreurs = new Map<string, { msg: string; path: string; hier: number; n: number }>();
  const forms = new Map<string, { path: string; champ: string; abandons: number; soumis: number }>();
  const defil = new Map<string, { path: string; n: number; quart: number }>();
  // L'accueil vu par les visiteuses, chaque jour (Krystine, 16 oct. 2026 : « ça devrait
  // faire partie de l'analyse au quotidien, toujours ») : jusqu'où elles descendent,
  // si la porte du quiz est cliquée, et ce qui prend les clics à sa place.
  const acc = { vues: 0, n: 0, b10: 0, b25: 0, morts: 0, quiz: 0, clics: new Map<string, number>() };
  docs.forEach((d, i) => {
    if (!d.exists) return;
    const x = d.data() || {};
    for (const [page, p] of Object.entries((x.pages || {}) as Record<string, any>)) {
      for (const [k, e] of Object.entries((p.elements || {}) as Record<string, any>)) {
        const cle = `${page}.${k}`;
        const a = elements.get(cle) || { page: nom(page, p), tx: String(e.tx || ''), s: String(e.s || ''), hierR: 0, r: 0, hierM: 0, m: 0 };
        a.r += Number(e.r) || 0; a.m += Number(e.m) || 0;
        if (i === hierI) { a.hierR += Number(e.r) || 0; a.hierM += Number(e.m) || 0; }
        elements.set(cle, a);
      }
      if (/^\/accueil\/?$/.test(String(p.path || ''))) {
        acc.vues += Number(p.vues) || 0; acc.n += Number(p.scrollN) || 0; acc.morts += Number(p.morts) || 0;
        acc.b10 += Number(p.scroll?.b10) || 0; acc.b25 += Number(p.scroll?.b25) || 0;
        for (const e of Object.values((p.elements || {}) as Record<string, any>)) {
          const tx = String(e.tx || e.s || '').replace(/\s+/g, ' ').trim();
          const k = Number(e.n) || 0;
          if (/besoin en ce moment/i.test(tx)) acc.quiz += k;
          else if (k) acc.clics.set(tx, (acc.clics.get(tx) || 0) + k);
        }
      }
      const nScroll = Number(p.scrollN) || 0;
      if (nScroll) {
        const dd = defil.get(page) || { path: nom(page, p), n: 0, quart: 0 };
        dd.n += nScroll; dd.quart += Number(p.scroll?.b25) || 0;
        defil.set(page, dd);
      }
    }
    for (const e of Object.values((x.erreursListe || {}) as Record<string, any>)) {
      // Bruit sans conséquence pour les visiteuses : robots des messageries qui testent les liens des lettres, navigation privée.
      if (/Object Not Found Matching Id|Database deleted by request of the user/.test(String(e.msg || ''))) continue;
      // Une même erreur qui ne change que par un numéro (Id:2, Id:3…) se compte une seule fois.
      const k = `${e.path}|${String(e.msg || '').replace(/\d+/g, '#')}`;
      const a = erreurs.get(k) || { msg: String(e.msg || ''), path: String(e.path || ''), hier: 0, n: 0 };
      a.n += Number(e.n) || 0;
      if (i === hierI) a.hier += Number(e.n) || 0;
      erreurs.set(k, a);
    }
    for (const [k, f] of Object.entries((x.formulaires || {}) as Record<string, any>)) {
      const a = forms.get(k) || { path: String(f.path || ''), champ: '', abandons: 0, soumis: 0 };
      a.abandons += Number(f.abandons) || 0; a.soumis += Number(f.soumis) || 0;
      if (f.dernierChamp) a.champ = String(f.dernierChamp);
      forms.set(k, a);
    }
  });

  // Seuls les petits défauts de la vérification (titres longs, pages lentes) viennent ici :
  // les vraies pannes sont déjà dans « Ce qui est vraiment cassé », une seule fois.
  if (verif) {
    for (const l of regrouper(verif.anomalies.filter((a) => estMineure(a.probleme)))) {
      pts.push({ score: 20, ligne: `Trouvé ce matin dans la vérification du site : ${l}.` });
    }
  }
  for (const e of erreurs.values()) {
    if (!e.n) continue;
    pts.push({ score: 500 + e.n, ligne: `Une erreur technique survient sur ${e.path || 'le site'} : « ${coupe(e.msg, 90)} » (${fois(e.hier)} hier, ${fois(e.n)} sur 7 jours).` });
  }
  // Les clics de frustration ont leur propre rubrique, toujours présente (demande de Krystine, 6 oct. 2026).
  // Seulement ce qui compte : au moins 1 clic hier, ou au moins 3 sur 7 jours (le bruit à 0 hier et 1 sur la semaine ne sort plus).
  const clics = [...elements.values()]
    .filter((e) => e.hierR + e.hierM >= 1 || e.r + e.m >= 3)
    .sort((a, b) => (b.hierR * 10 + b.hierM * 5 + b.r * 3 + b.m) - (a.hierR * 10 + a.hierM * 5 + a.r * 3 + a.m))
    .slice(0, 5)
    .map((e) => {
      const compte = (rage: number, sans: number) => {
        const p = [rage ? `${rage} de rage` : '', sans ? `${sans} sans effet` : ''].filter(Boolean);
        return p.length ? p.join(' et ') : 'aucun';
      };
      return `Sur ${e.page}, « ${coupe(e.tx || e.s, 60)} » : hier, ${compte(e.hierR, e.hierM)}; sur 7 jours, ${compte(e.r, e.m)}.`;
    });
  for (const f of forms.values()) {
    if (f.abandons < 3 || f.abandons <= f.soumis) continue;
    pts.push({ score: 60 + f.abandons, ligne: `Le formulaire de ${f.path || 'une page'} est souvent abandonné (${f.abandons} abandons contre ${f.soumis} ${f.soumis > 1 ? 'envois' : 'envoi'} sur 7 jours${f.champ ? `, souvent au champ « ${coupe(f.champ, 40)} »` : ''}).` });
  }
  for (const dd of defil.values()) {
    if (dd.n < 20 || dd.quart / dd.n >= 0.5) continue;
    const quittent = Math.round((1 - dd.quart / dd.n) * 100);
    pts.push({ score: 40 + quittent / 10, ligne: `Sur ${dd.path}, ${quittent} % des visiteuses partent avant d’avoir vu le premier quart de la page (${dd.n} visites sur 7 jours).` });
  }
  const accueil: string[] = [];
  if (acc.vues || acc.n) {
    const pc = (x: number) => (acc.n ? Math.round((x / acc.n) * 100) : 0);
    accueil.push(`${acc.vues} visites. ${pc(acc.b10)} % descendent au-delà du premier écran, ${pc(acc.b25)} % atteignent le premier quart de la page (${acc.n} défilements mesurés).`);
    accueil.push(`La porte du quiz (« De quoi ai-je besoin en ce moment ? ») : ${acc.quiz ? fois(acc.quiz) : 'aucun clic'}.${acc.quiz ? '' : ' La porte principale ne travaille pas.'}`);
    const autres = [...acc.clics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tx, k]) => `« ${coupe(tx, 40)} » (${k})`);
    if (autres.length) accueil.push(`Les clics vont plutôt à : ${autres.join(', ')}.`);
    if (acc.morts) accueil.push(`${acc.morts} clics sans effet sur la page.`);
  }
  return { points: pts.sort((a, b) => b.score - a.score).slice(0, 5).map((p) => p.ligne), clics, accueil };
}

export async function calculerBilan(filetDeja?: Awaited<ReturnType<typeof calculerFilet>>) {
  const db = getFirestore();
  const aujourdhui = jourDe(new Date());
  const hier = decaler(aujourdhui, -1);
  const sept = Array.from({ length: 7 }, (_, i) => decaler(aujourdhui, -7 + i));
  const debutHier = minuit(hier);
  const debutAujourdhui = minuit(aujourdhui);
  const debut7 = minuit(sept[0]);
  const il30 = minuit(decaler(aujourdhui, -30));
  // Le mois en cours, jusqu'à hier inclus (le 1er du mois, c'est le mois qui vient de finir).
  const moisDebut = `${hier.slice(0, 8)}01`;
  const debutMois = minuit(moisDebut);

  // Les revenus mois par mois de l'année financière, jusqu'à hier inclus (Krystine, 16 oct. 2026 :
  // « on doit mettre les revenus mensuels aussi, clairement » et « mon année financière commence en novembre »).
  const anHier = Number(hier.slice(0, 4));
  const moisHier = Number(hier.slice(5, 7));
  const anDebut = moisHier >= 11 ? anHier : anHier - 1;
  const moisListe = Array.from({ length: ((moisHier - 11 + 12) % 12) + 1 }, (_, i) => {
    const k = 10 + i; // novembre = 10 (base 0)
    return `${anDebut + Math.floor(k / 12)}-${String((k % 12) + 1).padStart(2, '0')}-01`;
  });
  const debutAnnee = minuit(moisListe[0]);
  const commandesAnnee = await sur(() => commandesShopifyEntre(debutAnnee, debutAujourdhui));
  const shopDirect = (de: Date, a: Date) => (commandesAnnee ? Promise.resolve(shopifyDans(commandesAnnee, de, a)) : shopify(de, a, il30));
  const revenusMensuels = await Promise.all(moisListe.map(async (debut, i) => {
    const fin = i + 1 < moisListe.length ? minuit(moisListe[i + 1]) : debutAujourdhui;
    const [site, boutique] = await Promise.all([sur(() => ventes(minuit(debut), fin)), sur(() => shopDirect(minuit(debut), fin))]);
    return {
      mois: debut.slice(0, 7),
      site: site?.montant ?? null,
      ventesSite: site?.n ?? null,
      boutique: boutique?.montant ?? null,
      commandes: boutique?.n ?? null,
      total: site && boutique ? Math.round((site.montant + boutique.montant) * 100) / 100 : null,
    };
  }));
  const [venMois, shopMois] = await Promise.all([
    sur(() => ventes(debutMois, debutAujourdhui)),
    sur(() => shopDirect(debutMois, debutAujourdhui)),
  ]);
  const [filet, jH, j7, insH, ins7, resH, res7, venH, ven7, shopH, shop7, desH, des7, pepinsH, pepinsOuverts, aRattraper] = await Promise.all([
    filetDeja ? Promise.resolve(filetDeja) : sur(calculerFilet),
    sur(() => journees([hier])),
    sur(() => journees(sept)),
    sur(() => inscriptions(debutHier, debutAujourdhui)),
    sur(() => inscriptions(debut7, debutAujourdhui)),
    sur(() => compterEntre('doshaResults', 'createdAt', debutHier, debutAujourdhui)),
    sur(() => compterEntre('doshaResults', 'createdAt', debut7, debutAujourdhui)),
    sur(() => ventes(debutHier, debutAujourdhui)),
    sur(() => ventes(debut7, debutAujourdhui)),
    sur(() => shopDirect(debutHier, debutAujourdhui)),
    sur(() => shopDirect(debut7, debutAujourdhui)),
    sur(() => compterEntre('newsletter', 'unsubscribedAt', debutHier, debutAujourdhui)),
    sur(() => compterEntre('newsletter', 'unsubscribedAt', debut7, debutAujourdhui)),
    sur(() => compterEntre('bugs', 'cree', debutHier, debutAujourdhui)),
    sur(async () => (await db.collection('bugs').where('statut', '==', 'nouveau').count().get()).data().count),
    sur(async () => (await db.collection('quizTentatives').where('statut', '==', 'a-rattraper').count().get()).data().count),
  ]);
  const [verif, comm, conferences] = await Promise.all([
    sur(verifComplete),
    // Même fenêtre que le reste du bilan : depuis hier 0 h.
    sur(() => commentaires(debutHier)),
    sur(veilleConferences),
  ]);
  const optimiser = await sur(() => aOptimiser(sept, verif));

  const alertes = filet ? filet.controles.filter((c) => c.etat === 'alerte').map((c) => `${c.nom} : ${c.detail}`) : ['Le filet n’a pas pu tourner'];
  // Iris déconnectée de Firebase sur l'ordinateur de Krystine (signalé par scripts/qa/verif-complete.mjs) : en tête des alertes.
  const connexion = await sur(async () => (await db.doc('sante/irisConnexion').get()).data());
  const signaleLe = (connexion?.le as Timestamp | undefined)?.toDate();
  // Le signal arrive par la porte publique du site : il ne compte que si la vérification du matin manque vraiment.
  if (!verif && connexion && connexion.ok === false && signaleLe && Date.now() - signaleLe.getTime() < 12 * 3600 * 1000) {
    alertes.unshift('Iris n’est plus connectée à Firebase sur votre ordinateur : la vérification du site de ce matin n’a pas pu être rangée, et Iris ne peut plus lire vos chiffres ni publier. Ouvrez Iris et écrivez « reconnecte Firebase ».');
  }

  // La ligne « à surveiller » : la première chose qui mérite un regard.
  let surveiller = 'Rien de particulier ce matin.';
  if (alertes.length) surveiller = `Le site : ${alertes[0]}.`;
  else if ((aRattraper ?? 0) > 0) surveiller = `${aRattraper} personne(s) ont fait le quiz sans recevoir leur résultat : à rattraper dans l’admin, onglet Quiz Dosha.`;
  else if ((pepinsH ?? 0) > 0) surveiller = `${pepinsH} pépin(s) signalé(s) hier : à lire dans l’admin, onglet Problèmes techniques.`;
  else if (desH != null && insH && desH > Math.max(5, insH.total)) surveiller = `Plus de désabonnements (${desH}) que d’inscriptions (${insH.total}) hier.`;
  else if (jH && jH.quizCommence >= 10 && jH.quizFini < jH.quizCommence * 0.3) surveiller = `Beaucoup de quiz commencés (${jH.quizCommence}) pour peu de résultats vus (${jH.quizFini}).`;

  return {
    le: Timestamp.now(),
    jour: aujourdhui,
    veille: hier,
    septDebut: sept[0],
    // Une page en panne, une ressource cassée ou un parcours bloqué compte comme une alerte; un titre trop long ou une page lente, non.
    verdict: alertes.length || (verif?.anomalies.some((a) => !estMineure(a.probleme)) ?? false) ? 'alerte' : 'ok',
    toutFonctionne: { alertes, pepinsHier: pepinsH, pepinsOuverts, quizARattraper: aRattraper, controles: filet?.controles.length ?? 0 },
    veilleChiffres: {
      visites: jH?.sessions ?? null, nouveauxNavigateurs: jH?.nouveaux ?? null,
      quizCommences: jH?.quizCommence ?? null, quizFinis: jH?.quizFini ?? null, resultatsEnregistres: resH,
      inscriptions: insH?.total ?? null, vraimentNouvelles: insH?.nouvelles ?? null, dejaConnues: insH?.connues ?? null, parSource: insH?.parSource ?? {},
      ventes: venH?.n ?? null, montantVentes: venH?.montant ?? null, titresVentes: venH?.titres ?? [], detailVentes: venH?.detail ?? [],
      shopify: shopH, visitesPub: jH?.pub ?? null, visitesInfolettre: jH?.infolettre ?? null, affiche: jH?.affiche ?? null, accepte: jH?.accepte ?? null, refuse: jH?.refuse ?? null, campagnes: jH?.campagnes ?? {}, desabonnements: desH,
    },
    septJours: {
      visites: j7?.sessions ?? null, quizCommences: j7?.quizCommence ?? null, quizFinis: j7?.quizFini ?? null, resultatsEnregistres: res7,
      inscriptions: ins7?.total ?? null, vraimentNouvelles: ins7?.nouvelles ?? null, ventes: ven7?.n ?? null, montantVentes: ven7?.montant ?? null, titresVentes: ven7?.titres ?? [], detailVentes: ven7?.detail ?? [],
      nouveauxNavigateurs: j7?.nouveaux ?? null, campagnes: j7?.campagnes ?? {}, parSource: ins7?.parSource ?? {},
      shopify: shop7, visitesPub: j7?.pub ?? null, visitesInfolettre: j7?.infolettre ?? null, affiche: j7?.affiche ?? null, accepte: j7?.accepte ?? null, refuse: j7?.refuse ?? null, desabonnements: des7,
    },
    moisEnCours: {
      debut: moisDebut,
      ventes: venMois?.n ?? null, montantVentes: venMois?.montant ?? null, detailVentes: venMois?.detail ?? [],
      shopify: shopMois ? { n: shopMois.n, montant: shopMois.montant } : null,
    },
    revenusMensuels,
    sourceBoutique: commandesAnnee ? 'shopify' : 'webhook',
    surveiller,
    verifComplete: verif,
    commentaires: comm,
    aOptimiser: optimiser?.points ?? null,
    clicsFrustration: optimiser?.clics ?? null,
    lectureAccueil: optimiser?.accueil ?? null,
    conferences,
  };
}

export type Bilan = Awaited<ReturnType<typeof calculerBilan>>;

const n = (v: number | null | undefined) => (v == null ? '?' : v.toLocaleString('fr-CA'));
/** La bannière des témoins : sur les onglets où elle s'est affichée (le dénominateur), combien ont accepté, refusé ou rien choisi. */
const banniere = (f: number | null | undefined, a: number | null | undefined, r: number | null | undefined) => {
  if (f == null || a == null || r == null) return 'non mesurée';
  if (!f) return 'aucun affichage compté';
  const sans = Math.max(0, f - a - r);
  const pc = (x: number) => `${Math.round((x / f) * 100)} %`;
  return `sur ${n(f)} affichages, ${n(a)} acceptations (${pc(a)}), ${n(r)} refus (${pc(r)}), ${n(sans)} sans choix (${pc(sans)})`;
};
const argent = (v: number | null | undefined) => (v == null ? '?' : v.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' }));

/** Une même anomalie sur plusieurs pages ou appareils tient sur une seule ligne. */
function regrouper(anomalies: { page: string; appareil: string; probleme: string }[]): string[] {
  const parProbleme = new Map<string, Map<string, string[]>>();
  for (const a of anomalies) {
    const pages = parProbleme.get(a.probleme) || new Map<string, string[]>();
    pages.set(a.page, [...(pages.get(a.page) || []), a.appareil]);
    parProbleme.set(a.probleme, pages);
  }
  return [...parProbleme].map(([probleme, pages]) => {
    const ou = [...pages].map(([page, apps]) => `${page} (${apps.length === 3 ? 'les trois appareils' : apps.join(', ')})`).join(', ');
    return `${ou} : ${probleme}`;
  });
}

const jourLong = (j: string) => new Date(`${j}T12:00:00Z`).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const jourCourt = (j: string) => new Date(`${j}T12:00:00Z`).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const pluriel = (k: number | null | undefined, mot: string, mots = `${mot}s`) => (k == null ? `? ${mots}` : `${n(k)} ${k > 1 ? mots : mot}`);
const VH = 'VexelHotjar, personnes ayant accepté les témoins seulement';
const BASE = 'base du site, tout le monde';

/**
 * Le texte du bilan (refait le 14 oct. 2026, Krystine : « c'est tout croche »).
 * L'ordre : qui attend une réponse, ce qui est vraiment cassé, l'argent, la liste
 * et le quiz, ce qui est à améliorer, les occasions de conférences. Chaque point
 * n'apparaît qu'une fois; chaque chiffre a une seule source, nommée entre parenthèses.
 */
export function texteBilan(b: Bilan): string {
  const v = b.veilleChiffres;
  const s = b.septJours;
  const m = b.moisEnCours;
  const c = b.commentaires;
  const hierTxt = `hier, ${jourLong(b.veille)}`;
  const memeMois = b.septDebut.slice(0, 7) === b.veille.slice(0, 7);
  const septTxt = `7 derniers jours, du ${memeMois ? String(Number(b.septDebut.slice(8))) : jourCourt(b.septDebut)} au ${jourCourt(b.veille)}`;

  // ── 1. Qui attend une réponse ──
  const attentes = c?.quiAttend ?? [];
  const attendDepuis = (j: number) => (j <= 0 ? 'aujourd’hui' : j === 1 ? 'depuis 1 jour' : `depuis ${j} jours`);
  const bloc1: string[] = [];
  if (!c) bloc1.push('Les commentaires, les messages et les demandes n’ont pas pu être lus ce matin.');
  else if (!attentes.length) bloc1.push('Tout le monde a reçu sa réponse sur le site.');
  else bloc1.push(...attentes.map((a) => `• ${attendDepuis(a.jours)} : ${a.qui}, ${a.quoi} (${a.ou})${a.texte ? ` : « ${a.texte} »` : ''}`));
  if ((b.toutFonctionne.quizARattraper ?? 0) > 0) {
    bloc1.push(`• ${pluriel(b.toutFonctionne.quizARattraper, 'personne a', 'personnes ont')} fait le quiz sans recevoir le résultat (admin, onglet Quiz Dosha).`);
  }
  if (c) {
    const types = Object.entries(c.parType).filter(([, x]) => x > 0).map(([t, x]) => `${t} ${x}`).join(', ');
    bloc1.push(`Commentaires reçus depuis hier 0 h : ${n(c.lignes.length)}${types ? ` (${types})` : ''}. Encore ouverts au total : ${n(c.nonTraites)}.`);
  }
  bloc1.push('Les réponses aux lettres qui tombent dans les pourriels de teamksl se vérifient à part : Iris lance chaque matin scripts/courriel/pourriels-teamksl.sh (avec --ramener, elle les remet dans la boîte de réception).');

  // ── 2. Ce qui est vraiment cassé ──
  const vc = b.verifComplete;
  const graves = vc ? vc.anomalies.filter((a) => !estMineure(a.probleme)) : [];
  const irisDeconnectee = b.toutFonctionne.alertes.some((a) => a.startsWith('Iris n’est plus connectée'));
  const bloc2: string[] = [];
  for (const a of b.toutFonctionne.alertes) {
    if (a.startsWith('Iris n’est plus connectée')) bloc2.push(`• ${a}`);
    else if (a.startsWith('Le filet n’a pas pu tourner')) bloc2.push('• Le filet du matin (pages, clés, quiz) n’a pas pu tourner. Geste : ouvrez Iris et écrivez « relance le filet du matin ».');
    else bloc2.push(`• ${a}. Geste : ouvrez Iris et écrivez « regarde le filet du matin ».`);
  }
  if (!vc && !irisDeconnectee) {
    bloc2.push('• La vérification complète du site n’a pas tourné ce matin (l’ordinateur était sans doute éteint ou endormi à 5 h 45). Geste : ouvrez Iris et écrivez « lance la vérification complète du site » (elle lance node scripts/qa/verif-complete.mjs et range le résultat).');
  }
  if (graves.length) {
    bloc2.push(...regrouper(graves).slice(0, 20).map((l) => `• ${l}`));
    bloc2.push('Geste : ouvrez Iris et écrivez « corrige les anomalies de la vérification du site ».');
  }
  if (!bloc2.length) bloc2.push(`Tout fonctionne : les ${b.toutFonctionne.controles} vérifications du filet sont bonnes (pages, case anti-robot, connexion, quiz).`);
  if (vc) bloc2.push(`Le site en entier : ${n(vc.pages)} pages vérifiées ce matin sur téléphone, tablette et ordinateur${graves.length ? `, ${pluriel(graves.length, 'panne')} ci-dessus` : ', tout s’affiche'}.`);

  // ── 3. L'argent ──
  const ventesSite = (k: number | null, montant: number | null) => (k ? `${pluriel(k, 'vente')}, ${argent(montant)}` : `${pluriel(k, 'vente')}`);
  const shop = (x: { n: number; montant: number } | null | undefined) => (x ? (x.n ? `${pluriel(x.n, 'commande')}, ${argent(x.montant)}` : '0 commande') : null);
  const ligneVente = (l: { jour: string; montant: number; titre: string }) => `   • ${l.jour ? `${jourCourt(l.jour)} : ` : ''}${l.titre} : ${argent(l.montant)}`;
  const avant7 = (m?.detailVentes ?? []).filter((l) => l.jour && l.jour < b.septDebut);
  const nomMois = new Date(`${m?.debut ?? b.veille}T12:00:00Z`).toLocaleDateString('fr-CA', { month: 'long', timeZone: 'UTC' });
  const bloc3: string[] = [
    `Site = formations, niskas et pourboires, taxes comprises (ventes test de 1 $ exclues). Boutique = commandes lues directement dans Shopify, taxes et livraison comprises, remboursements déduits${b.sourceBoutique === 'webhook' ? ' (Shopify n’a pas répondu ce matin : chiffres du webhook, possiblement incomplets)' : ''}.`,
    `${hierTxt[0].toUpperCase()}${hierTxt.slice(1)}`,
    `• Site : ${ventesSite(v.ventes, v.montantVentes)}`,
    ...(v.detailVentes ?? []).map(ligneVente),
    ...(shop(v.shopify) ? [`• Boutique : ${shop(v.shopify)}`, ...(v.shopify?.commandes ?? []).map((o) => `   • commande ${o.nom} : ${argent(o.montant)}`)] : []),
    `${septTxt[0].toUpperCase()}${septTxt.slice(1)}`,
    `• Site : ${ventesSite(s.ventes, s.montantVentes)}`,
    ...(s.detailVentes ?? []).map(ligneVente),
    ...(shop(s.shopify) ? [`• Boutique : ${shop(s.shopify)}`] : []),
    ...(m ? [
      `Mois ${/^[aeiou]/.test(nomMois) ? 'd’' : 'de '}${nomMois}, du 1er au ${jourCourt(b.veille)}`,
      `• Site : ${ventesSite(m.ventes, m.montantVentes)}`,
      ...(avant7.length ? ['   Plus tôt ce mois-ci :', ...avant7.map(ligneVente)] : []),
      ...(shop(m.shopify) ? [`• Boutique : ${shop(m.shopify)}`] : []),
    ] : []),
  ];
  const rm = b.revenusMensuels ?? [];
  if (rm.length) {
    const nomDe = (mois: string) => new Date(`${mois}-15T12:00:00Z`).toLocaleDateString('fr-CA', { month: 'long', timeZone: 'UTC' });
    const somme = (k: 'site' | 'boutique' | 'total') => (rm.some((r) => r[k] == null) ? null : Math.round(rm.reduce((x, r) => x + (r[k] ?? 0), 0) * 100) / 100);
    bloc3.push(
      `Revenus mois par mois, année financière ${rm[0].mois.slice(0, 4)}-${Number(rm[0].mois.slice(0, 4)) + 1} (du 1er novembre au 31 octobre; boutique + site = total)`,
      ...rm.map((r, i) => `• ${nomDe(r.mois)}${i === rm.length - 1 ? ` (au ${jourCourt(b.veille)})` : ''} : boutique ${argent(r.boutique)}${r.commandes != null ? ` (${pluriel(r.commandes, 'commande')})` : ''} + site ${argent(r.site)} = ${argent(r.total)}`),
      `• Total de l’année financière, du 1er novembre ${rm[0].mois.slice(0, 4)} au ${jourCourt(b.veille)} : boutique ${argent(somme('boutique'))} + site ${argent(somme('site'))} = ${argent(somme('total'))}`,
      'Le site ne compte que les ventes payées sur krystinestlaurent.ca; les cours vendus dans Kajabi avant sa fermeture (30 août 2026) n’y sont pas.',
    );
  }

  // ── 4. La liste et le quiz ──
  const sources = Object.entries(v.parSource).sort((a, x) => x[1] - a[1]).map(([k, x]) => `${k} ${x}`).join(', ');
  const camp = Object.entries(v.campagnes).sort((a, x) => x[1] - a[1]).slice(0, 3).map(([k, x]) => `${k} ${x}`).join(', ');
  const paire = (h: number | null | undefined, sj: number | null | undefined) => `hier ${n(h)} · 7 jours ${n(sj)}`;
  const aNoter: string[] = [];
  if (v.desabonnements != null && v.inscriptions != null && v.desabonnements > Math.max(5, v.inscriptions)) aNoter.push(`Plus de désabonnements (${v.desabonnements}) que d’inscriptions (${v.inscriptions}) hier.`);
  if (v.quizCommences != null && v.quizFinis != null && v.quizCommences >= 10 && v.quizFinis < v.quizCommences * 0.3) aNoter.push(`Beaucoup de quiz commencés (${v.quizCommences}) pour peu de résultats vus (${v.quizFinis}) hier, chez les personnes ayant accepté les témoins.`);
  const bloc4: string[] = [
    `Chaque ligne : ${hierTxt}, puis les ${septTxt}.`,
    `• Quiz terminés (résultat rangé) : ${paire(v.resultatsEnregistres, s.resultatsEnregistres)} (${BASE})`,
    `• Inscriptions à l’infolettre : hier ${n(v.inscriptions)}, dont ${pluriel(v.vraimentNouvelles, 'vraiment nouvelle', 'vraiment nouvelles')}${sources ? ` (${sources})` : ''} · 7 jours ${n(s.inscriptions)}, dont ${pluriel(s.vraimentNouvelles, 'nouvelle')} (${BASE})`,
    `• Désabonnements : ${paire(v.desabonnements, s.desabonnements)} (${BASE})`,
    `• Visites : ${paire(v.visites, s.visites)} (${VH})`,
    `• Nouveaux navigateurs : ${paire(v.nouveauxNavigateurs, s.nouveauxNavigateurs)} (${VH})`,
    `• Quiz commencés : ${paire(v.quizCommences, s.quizCommences)} (${VH})`,
    `• Résultats du quiz vus à l’écran : ${paire(v.quizFinis, s.quizFinis)} (${VH})`,
    `• Visites venues d’un courriel (infolettre ou série de lettres) : ${paire(v.visitesInfolettre, s.visitesInfolettre)} (${VH})`,
    `• Visites venues de la publicité : ${paire(v.visitesPub, s.visitesPub)}${camp ? `, hier : ${camp}` : ''} (${VH})`,
    `Les chiffres VexelHotjar ne voient qu’une partie des visiteuses. La bannière des témoins, hier : ${banniere(v.affiche, v.accepte, v.refuse)}; sur 7 jours : ${banniere(s.affiche, s.accepte, s.refuse)}. Un affichage = un onglet où la bannière est apparue, pas une personne.`,
    ...aNoter.map((l) => `À noter : ${l}`),
  ];

  // ── 5. À améliorer ──
  const bloc5: string[] = [];
  if (b.clicsFrustration) {
    bloc5.push('Clics de frustration (au moins 1 hier ou au moins 3 sur 7 jours, VexelHotjar) :');
    bloc5.push(...(b.clicsFrustration.length ? b.clicsFrustration.map((l) => `• ${l}`) : ['• 0 élément au-dessus de ce seuil.']));
  }
  if (b.lectureAccueil) {
    bloc5.push('L’accueil vu par les visiteuses (7 jours, VexelHotjar) :');
    bloc5.push(...(b.lectureAccueil.length ? b.lectureAccueil.map((l) => `• ${l}`) : ['• Aucune visite mesurée sur l’accueil.']));
  }
  if (b.aOptimiser) {
    bloc5.push('À optimiser aujourd’hui :');
    bloc5.push(...(b.aOptimiser.length ? b.aOptimiser.map((l) => `• ${l}`) : ['• Les comportements d’hier ne montrent rien de précis à corriger.']));
  }
  if (!bloc5.length) bloc5.push('Les comportements des visiteuses n’ont pas pu être lus ce matin.');

  // ── 6. Occasions de conférences ──
  const bloc6 = !b.conferences
    ? ['La veille de 2 h n’a pas tourné cette nuit (l’ordinateur était sans doute éteint ou endormi). Geste : ouvrez Iris et écrivez « lance la veille des conférences » (elle lance bash ~/.iris/veille-conferences/lancer.sh).']
    : b.conferences.nouvelles.length === 0
      ? [`Cette nuit : 0 nouvelle occasion (${n(b.conferences.total)} occasions suivies au total).`]
      : b.conferences.nouvelles.map((o) => `• ${o.nom} (${[o.type, o.lieu, o.langue].filter(Boolean).join(', ')}) · date : ${o.date || 'non indiquée'} · date limite : ${o.dateLimite || 'non indiquée'} · ${o.sujet} · ${o.lien}`);

  // ── En bref ──
  const casses = bloc2.filter((l) => l.startsWith('• ')).length;
  const plusVieux = attentes[0];
  const venteHier = (v.montantVentes ?? 0) + (v.shopify?.montant ?? 0);
  const enBref = [
    attentes.length ? `${pluriel(attentes.length, 'personne attend', 'personnes attendent')} une réponse (la plus ancienne ${attendDepuis(plusVieux.jours)})` : 'tout le monde a sa réponse',
    casses ? `${pluriel(casses, 'point cassé', 'points cassés')} ou à relancer` : 'tout fonctionne',
    `ventes d’hier : ${argent(Math.round(venteHier * 100) / 100)}`,
  ].join(' · ');

  const lignes = [
    'Bonjour Krystine,',
    '',
    `En bref : ${enBref}.`,
    '',
    '1. Qui attend une réponse (du plus ancien au plus récent)',
    ...bloc1,
    '',
    '2. Ce qui est vraiment cassé',
    ...bloc2,
    '',
    '3. L’argent',
    ...bloc3,
    '',
    '4. La liste et le quiz',
    ...bloc4,
    '',
    '5. À améliorer',
    ...bloc5,
    '',
    '6. Occasions de conférences (veille de la nuit)',
    ...bloc6,
    '',
    'Le même bilan est dans l’admin, au tableau de bord.',
    '',
    'L’équipe',
  ];
  return lignes.join('\n');
}

export async function rangerEtEnvoyerBilan(b: Bilan, envoyer = true) {
  const db = getFirestore();
  const texte = texteBilan(b);
  await db.doc('sante/bilanDuMatin').set({ ...b, texte, rangeLe: FieldValue.serverTimestamp() });
  await db.doc(`sante/bilanDuMatin/jours/${b.jour}`).set({ ...b, texte });
  if (!envoyer) return texte;
  await createTransporter().sendMail({
    from: fromAddr('Le bilan du matin'),
    replyTo: REPLY_TO,
    to: BILAN_A,
    subject: b.verdict === 'alerte' ? 'Bilan du matin : un point à vérifier sur le site' : 'Bilan du matin : tout fonctionne',
    text: texte,
  });
  return texte;
}

// Le même bilan, à la demande, depuis l'admin ou par Iris. Le courriel ne
// part jamais qu'à Krystine.
export const lancerBilan = onCall(
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB', secrets: [...MAIL_SECRETS, ...SECRETS_SHOPIFY] },
  async (req) => {
    assertAdmin(req);
    const b = await calculerBilan();
    const texte = await rangerEtEnvoyerBilan(b, req.data?.envoyer !== false);
    return { verdict: b.verdict, texte };
  },
);
