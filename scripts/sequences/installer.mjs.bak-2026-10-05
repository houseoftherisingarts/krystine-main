#!/usr/bin/env node
// Pose dans Firestore le calendrier maître du lancement (les sept phases du
// plan KSL Automne 2026 de Krystine) et la séquence d'accueil de l'Expérience
// Origine 2 avec ses cinq lettres, écrites d'avance dans sa voix.
//
//   node scripts/sequences/installer.mjs            essai à blanc
//   node scripts/sequences/installer.mjs --ecrire   écrit dans Firestore
//
// Idempotent : les lettres portent un identifiant stable (seq-origine2-<cle>),
// donc relancer le script met à jour au lieu de créer des doublons. La
// séquence reste EN PAUSE (`actif: false`) : rien ne part tant que Krystine
// n'a pas relu les cinq lettres et allumé l'interrupteur dans son admin.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const PROJET = 'krystinestlaurent-87566';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;
const ECRIRE = process.argv.includes('--ecrire');

const jeton = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
const api = async (methode, chemin, corps) => {
  const r = await fetch(`${BASE}${chemin}`, {
    method: methode,
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const d = await r.json();
  if (d.error) throw new Error(`${methode} ${chemin} : ${JSON.stringify(d.error).slice(0, 300)}`);
  return d;
};

// Encodage des valeurs pour l'API REST de Firestore.
const enc = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
  return { stringValue: String(v) };
};
const champs = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, enc(v)]));

// ── Les sept phases du lancement, telles que Krystine les a dessinées ──────
const LANCEMENT = {
  titre: 'Lancement · Expérience Origine 2',
  phases: [
    { n: 1, titre: 'Architecture et argent immédiat', sousTitre: 'Poser l\'offre, les prix et la page qui vend', du: '2026-09-15', au: '2026-09-27',
      objectifs: ['Finaliser l\'offre et les prix', 'Créer les parcours clientes', 'Mettre à jour la page de vente', 'Configurer Stripe et les automatismes', 'Poser le calendrier maître', 'Tester l\'achat complet'], lettres: [] },
    { n: 2, titre: 'Réactivation des audiences', sousTitre: 'Reparler à celles qui ont déjà dit oui une fois', du: '2026-09-28', au: '2026-10-11',
      objectifs: ['Écrire aux anciennes de l\'Expérience Origine', 'Reprendre la liste courriel', 'Ouvrir les conversations et les offres', 'Aller chercher les premières ventes', 'Ajuster ce qui ne mord pas'], lettres: [] },
    { n: 3, titre: 'Nurture organisé', sousTitre: 'Nourrir chaque semaine, sans rien vendre encore', du: '2026-10-12', au: '2026-10-25',
      objectifs: ['Podcast, lettre et clips au même rythme', 'Page, foire aux questions et témoignages', 'Courriels et automatismes en place', 'Accueil des nouvelles acheteuses'], lettres: [] },
    { n: 4, titre: 'Découverte et acquisition', sousTitre: 'Faire entrer du monde neuf', du: '2026-10-26', au: '2026-11-08',
      objectifs: ['Un direct ou une série d\'événements', 'Attirer de nouvelles clientes', 'Convertir celles qui hésitent', 'Suivre chaque personne intéressée'], lettres: [] },
    { n: 5, titre: 'Pré-lancement', sousTitre: 'Tout est écrit avant le départ', du: '2026-11-09', au: '2026-11-22',
      objectifs: ['Écrire la séquence de lancement au complet', 'Rassembler les preuves et les histoires', 'Répondre d\'avance aux objections', 'Tout tester et finaliser'], lettres: [] },
    { n: 6, titre: 'Tallinn', sousTitre: 'La semaine où rien ne doit dépendre d\'elle', du: '2026-11-23', au: '2026-11-27',
      objectifs: ['Les lettres de la semaine sont déjà écrites et relues', 'Le service aux clientes est couvert', 'Aucun gros changement sur le site', 'Décision à prendre avec Alex : envoi à la main depuis Tallinn ou envoi programmé pour cette semaine seulement'], lettres: [] },
    { n: 7, titre: 'Ouverture principale', sousTitre: 'La vente s\'ouvre pour de bon', du: '2026-11-28', au: '2026-12-01',
      objectifs: ['Ouvrir la vente de l\'Expérience Origine 2', 'Tenir un direct si le besoin se présente', 'Suivre et relancer', 'Accueillir les nouvelles clientes'], lettres: [] },
  ],
};

// ── Les lettres de la séquence, converties en blocs du composeur ──────────
const bloc = (b) => {
  const { type, ...reste } = b;
  return { type, content: reste };
};

const data = JSON.parse(readFileSync(join(ICI, 'accueil-origine2.json'), 'utf8'));
const maintenant = new Date();

const plan = [];
for (const l of data.lettres) {
  const id = `seq-origine2-${l.cle}`;
  plan.push({
    chemin: `/newsletters/${id}`,
    doc: {
      title: l.titre,
      subject: l.subject,
      preheader: l.preheader,
      fromName: 'Krystine St-Laurent',
      blocks: l.blocs.map(bloc),
      status: 'draft',
      role: 'sequence',
      lang: 'fr',
      couverture: 'aucune',
      signature: true,
      fond: '#FFFFFF',
      bandeau: l.bandeau,
      audience: { mode: 'emails', emails: [] },
      auteur: 'installateur-sequences',
      createdAt: maintenant,
      updatedAt: maintenant,
    },
  });
}
plan.push({
  chemin: `/sequences/${data.sequence.id}`,
  doc: {
    titre: data.sequence.titre,
    actif: data.sequence.actif,
    declencheur: data.sequence.declencheur,
    etapes: data.lettres.map(l => ({ cle: l.cle, titre: l.titre, delaiHeures: l.delaiHeures, newsletterId: `seq-origine2-${l.cle}` })),
    creeLe: maintenant,
    maj: maintenant,
  },
});
plan.push({ chemin: '/etat/lancementOrigine2', doc: { ...LANCEMENT, maj: maintenant } });

console.log(`${ECRIRE ? 'Écriture' : 'Essai à blanc'} · ${plan.length} document(s)\n`);
for (const p of plan) {
  const apercu = p.doc.subject || p.doc.titre || p.doc.title || '';
  console.log(`  ${p.chemin}${apercu ? `  — ${apercu}` : ''}`);
  if (!ECRIRE) continue;
  // PATCH crée ou met à jour; le masque limite l'écriture aux champs posés ici,
  // pour ne jamais effacer ce que Krystine aurait changé ailleurs dans le doc.
  const masque = Object.keys(p.doc).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  await api('PATCH', `${p.chemin}?${masque}`, { fields: champs(p.doc) });
}

if (!ECRIRE) {
  console.log('\n(relancer avec --ecrire pour poser ces documents)');
} else {
  console.log('\nPosé. La séquence est EN PAUSE : Krystine relit les cinq lettres dans');
  console.log('l\'admin › Infolettre › Séquences, puis allume l\'interrupteur.');
}
