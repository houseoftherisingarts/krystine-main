// Amorce les trois sondages de l'onglet « Aider » (Alex, septembre 2026) :
// technique-2026-09, formations-2026-09, accompagnement-2026-09. Écrit
// directement dans Firestore par REST avec un jeton gcloud (même patron que
// scripts/qa/skins-coffres.mjs et scripts/qa/admin-jeton.mjs) : le compte
// gcloud actif doit avoir un rôle d'écriture sur Firestore du projet.
//   node scripts/seed-sondages.mjs
import { execSync } from 'node:child_process';

const PROJET = 'krystinestlaurent-87566';
const gtoken = execSync('gcloud auth print-access-token').toString().trim();

// Encodeur générique JS → valeur Firestore REST (récursif) : évite de
// retaper à la main les 30 questions des trois sondages.
function wrap(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(wrap) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, wrap(vv)])) } };
  throw new Error(`type non géré: ${typeof v}`);
}

async function fsdoc(path, obj) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents/${path}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${gtoken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: wrap(obj).mapValue.fields }),
  });
  if (!r.ok) { console.error('firestore', path, r.status, await r.text()); process.exitCode = 1; return; }
  console.log('écrit', path);
}

const q = (id, type, texte, extra = {}) => ({ id, type, texte, obligatoire: true, ...extra });
const facultatif = (question) => ({ ...question, obligatoire: false });

const SONDAGES = [
  {
    id: 'technique-2026-09',
    ordre: 1,
    theme: 'technique',
    titre: 'Votre expérience du site',
    sousTitre: 'Dix questions pour que tout roule, du téléphone au paiement.',
    questions: [
      q('q1', 'choix', 'Sur quel appareil utilisez-vous surtout le site ?', { options: ['Téléphone', 'Tablette', 'Ordinateur portable', 'Ordinateur de bureau'] }),
      q('q2', 'echelle', 'Le site se charge et répond…', { min: 1, max: 5, etiquettes: ['Très lentement', 'Très vite'] }),
      q('q3', 'choix', 'Avez-vous rencontré un problème technique ce mois-ci ?', { options: ['Non', 'Une fois', 'Plusieurs fois'] }),
      facultatif(q('q4', 'multi', 'Si oui, où ?', { options: ['Connexion', 'Paiement', 'Vidéos ou audios', 'Infolettre', 'Roue et niskas', 'Foyer', 'Ailleurs'] })),
      q('q5', 'echelle', 'Trouvez-vous facilement ce que vous cherchez ?', { min: 1, max: 5, etiquettes: ['Jamais', 'Toujours'] }),
      q('q6', 'echelle', 'La lecture des vidéos et des audios est…', { min: 1, max: 5, etiquettes: ['Pénible', 'Impeccable'] }),
      q('q7', 'choix', 'Les courriels du site arrivent-ils dans votre boîte principale ?', { options: ['Oui', 'Parfois dans les indésirables', 'Je ne les reçois pas', 'Je ne sais pas'] }),
      q('q8', 'choix', 'Quelle partie du site utilisez-vous le plus ?', { options: ['Formations', 'Podcast', 'Roue quotidienne et niskas', 'Foyer', 'Boutique', 'Livres'] }),
      facultatif(q('q9', 'texte', 'Qu\'est-ce qui vous agace le plus sur le site aujourd\'hui ?')),
      facultatif(q('q10', 'texte', 'Une chose à améliorer en priorité ?')),
    ],
  },
  {
    id: 'formations-2026-09',
    ordre: 2,
    theme: 'formation',
    titre: 'Ce que vous voulez apprendre',
    sousTitre: 'Pour bâtir les prochaines formations autour de vous.',
    questions: [
      q('q1', 'choix', 'Où en êtes-vous avec l\'Ayurveda ?', { options: ['Je découvre', 'Je pratique un peu', 'Je pratique régulièrement', 'Je l\'enseigne ou l\'intègre à mon travail'] }),
      q('q2', 'choix', 'Quel format vous convient le mieux ?', { options: ['Vidéo courte de 5 à 10 minutes', 'Vidéo longue de 30 à 60 minutes', 'Audio à écouter en marchant', 'Texte et carnet PDF', 'Rencontre en direct'] }),
      q('q3', 'choix', 'Combien de temps par semaine pouvez-vous consacrer à une formation ?', { options: ['Moins de 30 minutes', 'De 30 minutes à 1 heure', 'De 1 à 3 heures', 'Plus de 3 heures'] }),
      q('q4', 'multi', 'Quels sujets vous appellent ?', { options: ['Alimentation par saison', 'Plantes et herboristerie', 'Aromathérapie', 'Gestion du stress', 'Sommeil', 'Digestion', 'Cycles féminins et ménopause', 'Rituels du quotidien'] }),
      q('q5', 'choix', 'Préférez-vous avancer seule ou en groupe ?', { options: ['Seule, à mon rythme', 'En groupe, avec des dates', 'Un mélange des deux'] }),
      q('q6', 'choix', 'Quel prix vous semble juste pour une masterclass de deux heures ?', { options: ['Moins de 50 $', 'De 50 à 100 $', 'De 100 à 200 $', 'Plus de 200 $'] }),
      facultatif(q('q7', 'multi', 'Qu\'est-ce qui vous retient d\'acheter une formation ?', { options: ['Le prix', 'Le manque de temps', 'Je ne sais pas par où commencer', 'J\'attends une promotion', 'Rien, j\'attends la prochaine'] })),
      q('q8', 'choix', 'Une formation suivie ici a-t-elle changé quelque chose dans votre quotidien ?', { options: ['Oui, beaucoup', 'Oui, un peu', 'Pas encore', 'Je n\'en ai pas suivi'] }),
      facultatif(q('q9', 'texte', 'Quel sujet aimeriez-vous que Krystine enseigne ensuite ?')),
      facultatif(q('q10', 'texte', 'Qu\'est-ce qui vous aiderait à terminer une formation commencée ?')),
    ],
  },
  {
    id: 'accompagnement-2026-09',
    ordre: 3,
    theme: 'accompagnement',
    titre: 'Ce dont vous avez besoin',
    sousTitre: 'L\'infolettre, le podcast, le Foyer : dites-nous ce qui compte.',
    questions: [
      q('q1', 'choix', 'Pourquoi êtes-vous ici, avant tout ?', { options: ['Prendre soin de ma santé', 'Comprendre mon corps', 'Trouver du calme', 'Approfondir ma pratique ou mon métier', 'Faire partie d\'une communauté'] }),
      q('q2', 'choix', 'À quelle fréquence aimez-vous recevoir l\'infolettre ?', { options: ['Chaque semaine', 'Deux fois par mois', 'Une fois par mois', 'Seulement pour les grandes nouvelles'] }),
      q('q3', 'choix', 'Le podcast, vous l\'écoutez…', { options: ['Chaque épisode', 'De temps en temps', 'Jamais', 'Je ne le connaissais pas'] }),
      q('q4', 'choix', 'Le Foyer d\'Origine vous intéresse ?', { options: ['J\'en fais partie', 'Oui, je pense y entrer', 'Je ne comprends pas encore ce que c\'est', 'Non'] }),
      facultatif(q('q5', 'multi', 'Qu\'attendez-vous d\'une communauté ?', { options: ['Des échanges entre membres', 'Des réponses de Krystine', 'Des rendez-vous en direct', 'Des défis et rituels partagés', 'Rien de particulier'] })),
      q('q6', 'multi', 'Quels produits vous intéressent le plus ?', { options: ['Huiles et soins', 'Livres', 'Formations en ligne', 'Retraites', 'Conférences'] }),
      q('q7', 'choix', 'Parlez-vous de Krystine autour de vous ?', { options: ['Souvent', 'Parfois', 'Jamais', 'Je ne saurais pas comment'] }),
      q('q8', 'choix', 'Comment nous avez-vous connus ?', { options: ['Les livres', 'Le podcast', 'Une conférence ou un salon', 'Les réseaux sociaux', 'Une amie', 'Une recherche Google'] }),
      facultatif(q('q9', 'texte', 'Qu\'est-ce qui manque encore pour vous ici ?')),
      facultatif(q('q10', 'texte', 'Une chose que vous aimeriez dire à Krystine ?')),
    ],
  },
];

for (const s of SONDAGES) {
  const { id, ...data } = s;
  await fsdoc(`sondages/${id}`, {
    titre: data.titre,
    sousTitre: data.sousTitre,
    theme: data.theme,
    recompense: 10,
    actif: true,
    ordre: data.ordre,
    questions: data.questions,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
console.log('terminé —', SONDAGES.map((s) => s.id).join(', '));
