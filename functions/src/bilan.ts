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

interface Journee { sessions: number; nouveaux: number; quizCommence: number; quizFini: number; pub: number; campagnes: Record<string, number> }
async function journees(jours: string[]): Promise<Journee> {
  const db = getFirestore();
  const r: Journee = { sessions: 0, nouveaux: 0, quizCommence: 0, quizFini: 0, pub: 0, campagnes: {} };
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
    verdict: alertes.length ? 'alerte' : 'ok',
    toutFonctionne: { alertes, pepinsHier: pepinsH, pepinsOuverts, quizARattraper: aRattraper, controles: filet?.controles.length ?? 0 },
    veilleChiffres: {
      visites: jH?.sessions ?? null, nouveauxNavigateurs: jH?.nouveaux ?? null,
      quizCommences: jH?.quizCommence ?? null, quizFinis: jH?.quizFini ?? null, resultatsEnregistres: resH,
      inscriptions: insH?.total ?? null, vraimentNouvelles: insH?.nouvelles ?? null, dejaConnues: insH?.connues ?? null, parSource: insH?.parSource ?? {},
      ventes: venH?.n ?? null, montantVentes: venH?.montant ?? null, titresVentes: venH?.titres ?? [],
      shopify: shopH, visitesPub: jH?.pub ?? null, campagnes: jH?.campagnes ?? {}, desabonnements: desH,
    },
    septJours: {
      visites: j7?.sessions ?? null, quizCommences: j7?.quizCommence ?? null, quizFinis: j7?.quizFini ?? null, resultatsEnregistres: res7,
      inscriptions: ins7?.total ?? null, vraimentNouvelles: ins7?.nouvelles ?? null, ventes: ven7?.n ?? null, montantVentes: ven7?.montant ?? null,
      shopify: shop7, visitesPub: j7?.pub ?? null, desabonnements: des7,
    },
    surveiller,
  };
}

export type Bilan = Awaited<ReturnType<typeof calculerBilan>>;

const n = (v: number | null | undefined) => (v == null ? '?' : v.toLocaleString('fr-CA'));
const argent = (v: number | null | undefined) => (v == null ? '?' : v.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' }));

export function texteBilan(b: Bilan): string {
  const v = b.veilleChiffres;
  const s = b.septJours;
  const dateHier = new Date(`${b.veille}T12:00:00Z`).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const etat = b.toutFonctionne.alertes.length
    ? `À vérifier :\n${b.toutFonctionne.alertes.map((a) => `• ${a}`).join('\n')}`
    : `Oui. Les ${b.toutFonctionne.controles} vérifications du site sont bonnes (pages, case anti-robot, connexion, quiz).`;
  const sources = Object.entries(v.parSource).sort((a, c) => c[1] - a[1]).map(([k, x]) => `${k} ${x}`).join(', ');
  const camp = Object.entries(v.campagnes).sort((a, c) => c[1] - a[1]).slice(0, 3).map(([k, x]) => `${k} ${x}`).join(', ');
  const lignes = [
    'Bonjour Krystine,',
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
    `Désabonnements : ${n(v.desabonnements)} · 7 jours : ${n(s.desabonnements)}`,
    '',
    `3. À surveiller : ${b.surveiller}`,
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
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB', secrets: [...MAIL_SECRETS] },
  async (req) => {
    assertAdmin(req);
    const b = await calculerBilan();
    const texte = await rangerEtEnvoyerBilan(b, req.data?.envoyer !== false);
    return { verdict: b.verdict, texte };
  },
);
