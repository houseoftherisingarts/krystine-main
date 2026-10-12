import { onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { assertAdmin } from './newsletter/send';

// ─── Le chemin vers VATA Essentiel (Krystine, 12 oct. 2026) ─────────────────
// « On devrait commencer à créer des stats pour le funnel VATA. » Chaque étape
// du chemin est lue là où le site l'enregistre déjà :
//   quiz commencé, résultat vu       vh_jours (objectifs quiz_commence, quiz_resultat_vu)
//   résultat enregistré              doshaResults
//   entrée dans une série de lettres sequences/suite-{vent,feu,terre}-quiz/inscrits
//   lettre envoyée, ouverte, cliquée newsletters/{id}/envois, ouvertures (humaines), clics
//   visite venue d'une lettre        vh_jours (campagnes suite-*)
//   page /vata, page /paiement/vata  vh_jours (pages, formulaires)
//   achat                            achatsFormations/{uid}/formations/kajabi-2148687644
// Le résultat est rangé dans sante/entonnoirVata (lu par l'admin et par Iris),
// chaque matin et à la demande. Aucun envoi, aucune écriture ailleurs.

const SITE_VH = 'krystine';
const FUSEAU = 'America/Toronto';
const VATA = 'kajabi-2148687644';
const SERIES = [
  { id: 'suite-vent-quiz', source: 'suite-vent', nom: 'Vent' },
  { id: 'suite-feu-quiz', source: 'suite-feu', nom: 'Feu' },
  { id: 'suite-terre-quiz', source: 'suite-terre', nom: 'Terre' },
];

const jourDe = (d: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: FUSEAU }).format(d);
const decaler = (jour: string, n: number) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
function minuit(jour: string): Date {
  const midi = new Date(`${jour}T12:00:00Z`);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, timeZoneName: 'longOffset' })
    .formatToParts(midi).find((p) => p.type === 'timeZoneName')?.value.replace('GMT', '') || '-05:00';
  return new Date(`${jour}T00:00:00${off === '' ? 'Z' : off}`);
}
const millis = (v: unknown): number | null => {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'string') { const t = Date.parse(v); return Number.isNaN(t) ? null : t; }
  return null;
};

interface Lettre { cle: string; titre: string; envoyees: number; ouvertes: number; cliquees: number }
interface Serie { nom: string; entrees: number; sorties: number; lettres: Lettre[]; visites: number; ventes: number }
export interface Periode {
  de: string; a: string;
  quizCommences: number; resultatsVus: number; resultatsEnregistres: number;
  entreesSeries: number; series: Serie[];
  visitesDepuisLettres: number;
  vuesVata: number; luesJusquAuBas: number;
  vuesPaiement: number; formulairesPaiement: number; departsVersLaCaisse: number;
  ventes: { n: number; montant: number; detail: { le: string; prenom: string; chemin: string; montant: number }[] };
}

function chemin(via: string, lettre: string): string {
  const serie = SERIES.find((s) => s.source === via);
  const no = /^l(\d+)$/.exec(lettre)?.[1];
  if (serie) return `série ${serie.nom}${no ? `, lettre ${no}` : ''}`;
  if (no) return `lettre ${no}`;
  if (via === 'quiz') return 'après le quiz';
  return via || 'directement';
}

export async function calculerPeriode(de: string, a: string): Promise<Periode> {
  const db = getFirestore();
  const debut = minuit(de).getTime();
  const fin = minuit(decaler(a, 1)).getTime();
  const dans = (v: unknown) => { const t = millis(v); return t !== null && t >= debut && t < fin; };
  const jours: string[] = [];
  for (let j = de; j <= a; j = decaler(j, 1)) jours.push(j);

  const p: Periode = {
    de, a, quizCommences: 0, resultatsVus: 0, resultatsEnregistres: 0, entreesSeries: 0, series: [],
    visitesDepuisLettres: 0, vuesVata: 0, luesJusquAuBas: 0, vuesPaiement: 0, formulairesPaiement: 0, departsVersLaCaisse: 0,
    ventes: { n: 0, montant: 0, detail: [] },
  };

  // Le site : quiz, visites venues des lettres, pages /vata et /paiement/vata.
  const visitesParSource: Record<string, number> = {};
  const docs = await db.getAll(...jours.map((j) => db.doc(`vh_jours/${SITE_VH}_${j}`)));
  for (const d of docs) {
    if (!d.exists) continue;
    const x = d.data() || {};
    for (const o of Object.values((x.objectifs || {}) as Record<string, { n?: number; nom?: string }>)) {
      if (o.nom === 'quiz_commence') p.quizCommences += o.n || 0;
      if (o.nom === 'quiz_resultat_vu') p.resultatsVus += o.n || 0;
    }
    for (const c of Object.values((x.campagnes || {}) as Record<string, { n?: number; source?: string }>)) {
      if (SERIES.some((s) => s.source === c.source)) {
        p.visitesDepuisLettres += c.n || 0;
        visitesParSource[c.source!] = (visitesParSource[c.source!] || 0) + (c.n || 0);
      }
    }
    for (const pg of Object.values((x.pages || {}) as Record<string, { path?: string; vues?: number; scroll?: Record<string, number> }>)) {
      if (pg.path === '/vata') { p.vuesVata += pg.vues || 0; p.luesJusquAuBas += pg.scroll?.b90 || 0; }
      if (pg.path === '/paiement/vata') p.vuesPaiement += pg.vues || 0;
    }
    for (const f of Object.values((x.formulaires || {}) as Record<string, { path?: string; debuts?: number; soumis?: number }>)) {
      if (f.path === '/paiement/vata') { p.formulairesPaiement += f.debuts || 0; p.departsVersLaCaisse += f.soumis || 0; }
    }
  }

  // Les résultats du quiz enregistrés.
  p.resultatsEnregistres = (await db.collection('doshaResults')
    .where('createdAt', '>=', Timestamp.fromMillis(debut)).where('createdAt', '<', Timestamp.fromMillis(fin)).count().get()).data().count;

  // Les achats de VATA Essentiel (vraies ventes Stripe, sans les essais à 1 $).
  const achats = await db.collectionGroup('formations')
    .where('acheteLe', '>=', Timestamp.fromMillis(debut)).where('acheteLe', '<', Timestamp.fromMillis(fin)).get();
  const ventesParSource: Record<string, number> = {};
  for (const d of achats.docs) {
    if (d.id !== VATA || d.ref.parent.parent?.parent.id !== 'achatsFormations' || !d.get('sessionId')) continue;
    const ht = typeof d.get('montantHT') === 'number' ? Number(d.get('montantHT')) : Math.round((Number(d.get('montant')) || 0) * 100);
    if (ht > 0 && ht <= 100) continue;
    const montant = typeof d.get('total') === 'number' ? Number(d.get('total')) / 100 : Number(d.get('montant')) || 0;
    const via = String(d.get('via') || '');
    ventesParSource[via] = (ventesParSource[via] || 0) + 1;
    const membre = (await db.doc(`members/${d.ref.parent.parent!.id}`).get()).data() as { displayName?: string } | undefined;
    p.ventes.detail.push({
      le: jourDe(new Date(millis(d.get('acheteLe')) || 0)),
      prenom: String(membre?.displayName || '').split(/\s+/)[0] || 'Une acheteuse',
      chemin: chemin(via, String(d.get('viaLettre') || '')),
      montant,
    });
  }
  p.ventes.n = p.ventes.detail.length;
  p.ventes.montant = Math.round(p.ventes.detail.reduce((s, v) => s + v.montant, 0) * 100) / 100;

  // Les trois séries de lettres : entrées, lettres envoyées, ouvertes, cliquées.
  for (const s of SERIES) {
    const seq = await db.doc(`sequences/${s.id}`).get();
    if (!seq.exists) continue;
    const etapes = ((seq.get('etapes') || []) as { cle: string; titre?: string; newsletterId: string }[]);
    const inscrits = await seq.ref.collection('inscrits').get();
    const serie: Serie = { nom: s.nom, entrees: 0, sorties: 0, lettres: [], visites: visitesParSource[s.source] || 0, ventes: ventesParSource[s.source] || 0 };
    for (const i of inscrits.docs) {
      if (dans(i.get('debuteLe'))) serie.entrees += 1;
      if (dans(i.get('sortie.le'))) serie.sorties += 1;
    }
    for (const e of etapes) {
      const envoyees = inscrits.docs.filter((i) => dans(i.get(`envoyes.${e.cle}`))).length;
      let ouvertes = 0; let cliquees = 0;
      if (e.newsletterId) {
        const [ouv, cl] = await Promise.all([
          db.collection(`newsletters/${e.newsletterId}/ouvertures`).get(),
          db.collection(`newsletters/${e.newsletterId}/clics`).get(),
        ]);
        const robots = new Set(cl.docs.filter((c) => c.get('robot') === true).map((c) => c.id));
        ouvertes = ouv.docs.filter((o) => o.get('humaine') === true && !robots.has(o.id) && (dans(o.get('at')) || dans(o.get('humaineAt')))).length;
        cliquees = cl.docs.filter((c) => !robots.has(c.id) && dans(c.get('at'))).length;
      }
      serie.lettres.push({ cle: e.cle, titre: String(e.titre || e.cle).replace(/\s*\(.*\)\s*$/, ''), envoyees, ouvertes, cliquees });
    }
    p.entreesSeries += serie.entrees;
    p.series.push(serie);
  }
  return p;
}

export async function calculerEntonnoir() {
  const aujourdhui = jourDe(new Date());
  const hier = decaler(aujourdhui, -1);
  const [septJours, trenteJours] = await Promise.all([
    calculerPeriode(decaler(aujourdhui, -7), hier),
    calculerPeriode(decaler(aujourdhui, -30), hier),
  ]);
  const doc = { le: Timestamp.now(), jour: aujourdhui, septJours, trenteJours };
  await getFirestore().doc('sante/entonnoirVata').set(doc);
  return doc;
}

export const entonnoirVataMatin = onSchedule(
  { schedule: '20 6 * * *', timeZone: FUSEAU, region: 'us-central1', timeoutSeconds: 300, memory: '512MiB' },
  async () => { await calculerEntonnoir(); },
);

export const lancerEntonnoirVata = onCall(
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB' },
  async (req) => { assertAdmin(req); return calculerEntonnoir(); },
);
