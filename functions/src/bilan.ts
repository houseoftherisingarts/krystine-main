import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { MAIL_SECRETS, createTransporter, fromAddr, REPLY_TO } from './newsletter/mail';
import { assertAdmin } from './newsletter/send';
import { calculerFilet } from './filet';

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

interface Journee { sessions: number; nouveaux: number; quizCommence: number; quizFini: number; pub: number; infolettre: number; campagnes: Record<string, number> }
async function journees(jours: string[]): Promise<Journee> {
  const db = getFirestore();
  const r: Journee = { sessions: 0, nouveaux: 0, quizCommence: 0, quizFini: 0, pub: 0, infolettre: 0, campagnes: {} };
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
      if (c.source === 'infolettre') { r.infolettre += c.n || 0; continue; }
      r.pub += c.n || 0;
      const nom = [c.source, c.campagne].filter(Boolean).join(' · ') || 'sans nom';
      r.campagnes[nom] = (r.campagnes[nom] || 0) + (c.n || 0);
    }
  }
  return r;
}

/** Les ventes de formations Stripe (achatsFormations/{uid}/formations/{id}, avec sessionId). */
async function ventes(de: Date, a: Date): Promise<{ n: number; montant: number; titres: string[] }> {
  const snap = await getFirestore().collectionGroup('formations').where('acheteLe', '>=', ts(de)).where('acheteLe', '<', ts(a)).get();
  const vraies = snap.docs.filter((d) => d.ref.parent.parent?.parent.id === 'achatsFormations' && !!d.get('sessionId'));
  return {
    n: vraies.length,
    montant: vraies.reduce((s, d) => s + (Number(d.get('montant')) || 0), 0),
    titres: vraies.map((d) => String(d.get('titre') || d.ref.id)),
  };
}

/** Shopify : seulement si le webhook a rangé au moins une commande dans les 30 derniers jours. */
async function shopify(de: Date, a: Date, il30: Date): Promise<{ n: number; montant: number } | null> {
  const col = getFirestore().collection('shopifyOrders');
  if ((await col.where('createdAt', '>=', ts(il30)).limit(1).get()).empty) return null;
  const snap = await col.where('createdAt', '>=', ts(de)).where('createdAt', '<', ts(a)).get();
  return { n: snap.size, montant: snap.docs.reduce((s, d) => s + (Number(d.get('totalPrice')) || 0), 0) };
}

/** Les commentaires de la pastille « Un commentaire ? Écrivez-nous » (collection bugs, functions/src/pepin.ts), dernières 24 h. */
const TYPES_COMMENTAIRE: Record<string, string> = {
  technique: 'Quelque chose bloque',
  aime: 'J’aime ce que je vois',
  idee: 'Une idée',
  introuvable: 'Je ne trouve pas ce que je cherche',
};
interface Commentaires { parType: Record<string, number>; lignes: string[]; nonTraites: number }
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
  return { parType, lignes, nonTraites };
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

/** « À optimiser aujourd'hui » : au plus 5 points classés par impact, lus dans vh_jours (VexelHotjar) et la vérification complète. Une donnée absente ne produit aucune ligne. */
const coupe = (t: string, max: number) => { const x = t.replace(/\s+/g, ' ').trim(); return x.length > max ? `${x.slice(0, max)}…` : x; };
const fois = (k: number) => (k > 1 ? `${k} fois` : '1 fois');
async function aOptimiser(sept: string[], verif: Verif | null): Promise<{ points: string[]; clics: string[] }> {
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

  // Défauts trouvés ce matin sur le site en entier (les titres longs et les pages lentes passent en dernier).
  if (verif) {
    for (const l of regrouper(verif.anomalies)) {
      pts.push({ score: /titre trop long|chargement lent/.test(l) ? 20 : 1000, ligne: `Trouvé ce matin dans la vérification du site : ${l}.` });
    }
  }
  for (const e of erreurs.values()) {
    if (!e.n) continue;
    pts.push({ score: 500 + e.n, ligne: `Une erreur technique survient sur ${e.path || 'le site'} : « ${coupe(e.msg, 90)} » (${fois(e.hier)} hier, ${fois(e.n)} sur 7 jours).` });
  }
  // Les clics de frustration ont leur propre rubrique, toujours présente (demande de Krystine, 6 oct. 2026).
  const clics = [...elements.values()]
    .filter((e) => e.r + e.m > 0)
    .sort((a, b) => (b.hierR * 10 + b.hierM * 5 + b.r * 3 + b.m) - (a.hierR * 10 + a.hierM * 5 + a.r * 3 + a.m))
    .slice(0, 5)
    .map((e) => `Sur ${e.page}, « ${coupe(e.tx || e.s, 60)} » : ${e.hierR} clic(s) de rage et ${e.hierM} clic(s) sans effet hier, ${e.r} et ${e.m} sur 7 jours.`);
  for (const f of forms.values()) {
    if (f.abandons < 3 || f.abandons <= f.soumis) continue;
    pts.push({ score: 60 + f.abandons, ligne: `Le formulaire de ${f.path || 'une page'} est souvent abandonné (${f.abandons} abandons contre ${f.soumis} envois sur 7 jours${f.champ ? `, souvent au champ « ${coupe(f.champ, 40)} »` : ''}).` });
  }
  for (const dd of defil.values()) {
    if (dd.n < 20 || dd.quart / dd.n >= 0.5) continue;
    const quittent = Math.round((1 - dd.quart / dd.n) * 100);
    pts.push({ score: 40 + quittent / 10, ligne: `Sur ${dd.path}, ${quittent} % des visiteuses partent avant d’avoir vu le premier quart de la page (${dd.n} visites sur 7 jours).` });
  }
  return { points: pts.sort((a, b) => b.score - a.score).slice(0, 5).map((p) => p.ligne), clics };
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
    sur(() => shopify(debutHier, debutAujourdhui, il30)),
    sur(() => shopify(debut7, debutAujourdhui, il30)),
    sur(() => compterEntre('newsletter', 'unsubscribedAt', debutHier, debutAujourdhui)),
    sur(() => compterEntre('newsletter', 'unsubscribedAt', debut7, debutAujourdhui)),
    sur(() => compterEntre('bugs', 'cree', debutHier, debutAujourdhui)),
    sur(async () => (await db.collection('bugs').where('statut', '==', 'nouveau').count().get()).data().count),
    sur(async () => (await db.collection('quizTentatives').where('statut', '==', 'a-rattraper').count().get()).data().count),
  ]);
  const [verif, comm] = await Promise.all([
    sur(verifComplete),
    sur(() => commentaires(new Date(Date.now() - 24 * 3600 * 1000))),
  ]);
  const optimiser = await sur(() => aOptimiser(sept, verif));

  const alertes = filet ? filet.controles.filter((c) => c.etat === 'alerte').map((c) => `${c.nom} : ${c.detail}`) : ['Le filet n’a pas pu tourner'];

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
    // Une page en panne, une ressource cassée ou un parcours bloqué compte comme une alerte; un titre trop long ou une page lente, non.
    verdict: alertes.length || (verif?.anomalies.some((a) => !/^(titre trop long|chargement lent)/.test(a.probleme)) ?? false) ? 'alerte' : 'ok',
    toutFonctionne: { alertes, pepinsHier: pepinsH, pepinsOuverts, quizARattraper: aRattraper, controles: filet?.controles.length ?? 0 },
    veilleChiffres: {
      visites: jH?.sessions ?? null, nouveauxNavigateurs: jH?.nouveaux ?? null,
      quizCommences: jH?.quizCommence ?? null, quizFinis: jH?.quizFini ?? null, resultatsEnregistres: resH,
      inscriptions: insH?.total ?? null, vraimentNouvelles: insH?.nouvelles ?? null, dejaConnues: insH?.connues ?? null, parSource: insH?.parSource ?? {},
      ventes: venH?.n ?? null, montantVentes: venH?.montant ?? null, titresVentes: venH?.titres ?? [],
      shopify: shopH, visitesPub: jH?.pub ?? null, visitesInfolettre: jH?.infolettre ?? null, campagnes: jH?.campagnes ?? {}, desabonnements: desH,
    },
    septJours: {
      visites: j7?.sessions ?? null, quizCommences: j7?.quizCommence ?? null, quizFinis: j7?.quizFini ?? null, resultatsEnregistres: res7,
      inscriptions: ins7?.total ?? null, vraimentNouvelles: ins7?.nouvelles ?? null, ventes: ven7?.n ?? null, montantVentes: ven7?.montant ?? null,
      shopify: shop7, visitesPub: j7?.pub ?? null, visitesInfolettre: j7?.infolettre ?? null, desabonnements: des7,
    },
    surveiller,
    verifComplete: verif,
    commentaires: comm,
    aOptimiser: optimiser?.points ?? null,
    clicsFrustration: optimiser?.clics ?? null,
  };
}

export type Bilan = Awaited<ReturnType<typeof calculerBilan>>;

const n = (v: number | null | undefined) => (v == null ? '?' : v.toLocaleString('fr-CA'));
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

export function texteBilan(b: Bilan): string {
  const v = b.veilleChiffres;
  const s = b.septJours;
  const dateHier = new Date(`${b.veille}T12:00:00Z`).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const etat = b.toutFonctionne.alertes.length
    ? `À vérifier :\n${b.toutFonctionne.alertes.map((a) => `• ${a}`).join('\n')}`
    : `Oui. Les ${b.toutFonctionne.controles} vérifications du site sont bonnes (pages, case anti-robot, connexion, quiz).`;
  const sources = Object.entries(v.parSource).sort((a, c) => c[1] - a[1]).map(([k, x]) => `${k} ${x}`).join(', ');
  const camp = Object.entries(v.campagnes).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k, x]) => `${k} ${x}`).join(', ');
  const vc = b.verifComplete;
  const siteEntier = !vc
    ? ['Le site en entier : la vérification complète de ce matin n’a pas tourné (l’ordinateur était sans doute éteint ou endormi).']
    : vc.anomalies.length === 0
      ? [`Le site en entier : ${n(vc.pages)} pages vérifiées sur téléphone, tablette et ordinateur, tout est bon.`]
      : [
        `Le site en entier : ${n(vc.pages)} pages vérifiées sur téléphone, tablette et ordinateur, ${n(vc.anomalies.length)} anomalie(s) :`,
        ...regrouper(vc.anomalies).slice(0, 20).map((l) => `• ${l}`),
      ];
  const c = b.commentaires;
  const blocCommentaires = !c
    ? ['Les commentaires n’ont pas pu être lus ce matin.']
    : c.lignes.length === 0
      ? ['Aucun commentaire hier.', `Encore non traités au total : ${n(c.nonTraites)}.`]
      : [
        Object.entries(c.parType).map(([t, x]) => `${t} : ${x}`).join(' · '),
        ...c.lignes.map((l) => `• ${l}`),
        `Encore non traités au total : ${n(c.nonTraites)} (admin, onglet Commentaires des visiteuses).`,
      ];
  const lignes = [
    'Bonjour Krystine,',
    '',
    ...siteEntier,
    '',
    '1. Tout fonctionne ?',
    etat,
    `Quiz à rattraper (résultat non reçu) : ${n(b.toutFonctionne.quizARattraper)}. Pépins signalés hier : ${n(b.toutFonctionne.pepinsHier)} (encore ouverts au total : ${n(b.toutFonctionne.pepinsOuverts)}).`,
    '',
    `2. Les chiffres d’hier (${dateHier}), puis des 7 derniers jours`,
    `Visites : ${n(v.visites)} · 7 jours : ${n(s.visites)}`,
    `Quiz commencés : ${n(v.quizCommences)}, résultats vus : ${n(v.quizFinis)}, résultats enregistrés : ${n(v.resultatsEnregistres)} · 7 jours : ${n(s.quizCommences)} commencés, ${n(s.quizFinis)} vus, ${n(s.resultatsEnregistres)} enregistrés`,
    `Inscriptions à l’infolettre : ${n(v.inscriptions)}, dont ${n(v.vraimentNouvelles)} vraiment nouvelles${sources ? ` (${sources})` : ''} · 7 jours : ${n(s.inscriptions)}, dont ${n(s.vraimentNouvelles)} nouvelles`,
    `Ventes de formations : ${n(v.ventes)} (${argent(v.montantVentes)})${v.titresVentes.length ? `, ${v.titresVentes.join(', ')}` : ''} · 7 jours : ${n(s.ventes)} (${argent(s.montantVentes)})`,
    ...(v.shopify || s.shopify ? [`Commandes de la boutique : ${n(v.shopify?.n)} (${argent(v.shopify?.montant)}) · 7 jours : ${n(s.shopify?.n)} (${argent(s.shopify?.montant)})`] : []),
    `Visites venues de la publicité : ${n(v.visitesPub)}${camp ? ` (${camp})` : ''} · 7 jours : ${n(s.visitesPub)}`,
    `Visites venues d’une infolettre : ${n(v.visitesInfolettre)} · 7 jours : ${n(s.visitesInfolettre)}`,
    `Désabonnements : ${n(v.desabonnements)} · 7 jours : ${n(s.desabonnements)}`,
    '',
    `3. Les commentaires des visiteuses (dernières 24 h)`,
    ...blocCommentaires,
    '',
    `4. À surveiller : ${b.surveiller}`,
    '',
    ...(b.clicsFrustration ? ['5. Clics de frustration (rage et sans effet)', ...(b.clicsFrustration.length ? b.clicsFrustration.map((l) => `• ${l}`) : ['Aucun clic de frustration hier ni dans les 7 derniers jours.']), ''] : []),
    ...(b.aOptimiser ? ['6. À optimiser aujourd’hui', ...(b.aOptimiser.length ? b.aOptimiser.map((l) => `• ${l}`) : ['Rien de précis à corriger dans les comportements d’hier.']), ''] : []),
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
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB', secrets: [...MAIL_SECRETS] },
  async (req) => {
    assertAdmin(req);
    const b = await calculerBilan();
    const texte = await rangerEtEnvoyerBilan(b, req.data?.envoyer !== false);
    return { verdict: b.verdict, texte };
  },
);
