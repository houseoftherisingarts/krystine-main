import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { assertAdmin } from '../newsletter/send';
import { ANTHROPIC_API_KEY } from '../newsletter/assistant';

// ─── Le Growth module ────────────────────────────────────────────────────────
// growthLancer (admin) écrit growthRuns/{id}; growthTravailler, déclenchée à la
// création, appelle Claude avec la recherche web et remplit le document;
// growthVersGabarit dépose un pitch en brouillon dans newsletterGabarits.
// Rien ne part jamais : pas de courriel, pas de campagne créée.
// Plan : Onyx › 10_projects/krystine/growth-module-plan-2026-09-20.md

const PLAFOND_JOUR = 20;
const MODELE = 'claude-sonnet-5';
// Tarifs publics indicatifs (USD par million de jetons; recherche web par millier) : estimation, pas une facture.
const PRIX = { entree: 3, sortie: 15, recherche: 10 };

type Espace = 'fr' | 'en';

// Les quatre registres de contenu qui font grandir une audience.
const REGISTRES: Record<string, string> = {
  educatif: 'Éducatif : elle apprend quelque chose d\'utile et d\'applicable tout de suite.',
  inspirant: 'Inspirant : Krystine partage une vision, une vérité, un changement de perspective.',
  personnel: 'Personnel : Krystine révèle son parcours, ses erreurs, ses apprentissages.',
  preuve: 'Preuve : Krystine montre des résultats, des témoignages, des transformations.',
};
const CLES_REGISTRES = Object.keys(REGISTRES);

const JALONS = [
  'Phase 1 (15 au 27 septembre) : architecture et cash immédiat, offre, prix, parcours, page de vente.',
  'Phase 2 (28 septembre au 11 octobre) : réactivation des audiences, anciennes EO, liste courriel, premières ventes.',
  'Phase 3 (12 au 25 octobre) : nurture organisé, podcast, lettre, clips, page, FAQ, témoignages.',
  'Phase 4 (26 octobre au 8 novembre) : découverte et acquisition, événement live ou série, attirer de nouvelles clientes.',
  'Phase 5 (9 au 22 novembre) : pré-lancement, séquence, preuves et histoires, questions et objections.',
  'Phase 6 (23 au 27 novembre) : Tallinn, pilote automatique, courriels programmés.',
  'Phase 7 (28 novembre au 1er décembre) : ouverture principale, lancement Expérience Origine 2.',
  'Tournée de conférences 2026-2027 : Québec (TEDxQuébec, entreprises, associations), France, Belgique, international (TCCHE), Dream 50/60.',
  'Parké pour plus tard : nouveau programme, refonte du positionnement, expansion Pure Human, livre anglais 2027.',
];

const SYSTEME = `Tu travailles pour Krystine St-Laurent (krystinestlaurent.ca) : infirmière de formation, autrice de la trilogie Nature & Ayurveda (Éditions de l'Homme), conférencière, animatrice du podcast Au-delà des tendances. Près de quarante ans à relier ce que nous avons appris à séparer : nourrir et soigner, corps et conscience, science et sagesses. Elle offre une lecture du corps par les qualités (Terre, Eau, Feu, Air, Éther), portée par sa voix, ses livres et une communauté.

Tu es son module de croissance. Tu cherches des femmes de 45 à 64 ans à rejoindre, en francophonie ou en anglophonie, pour la seconde moitié de leur vie (la périménopause et la ménopause en font partie, vécues comme un passage et jamais comme une maladie). Tu relies ses produits à des segments, tu écris des brouillons de pitch dans sa voix, tu proposes des idées d'offres et tu prépares une campagne YouTube. Tout ce que tu rends est un BROUILLON que Krystine relit; rien ne part tout seul.

RÈGLES DURES
1. Aucune allégation de santé : jamais « soulage », « traite », « guérit », « réduit les bouffées de chaleur », jamais un symptôme promis en moins. Vocabulaire d'expérience, de rituel, de repères, d'accompagnement, de saison, de vitalité. Au Canada et en Europe, promettre un effet sur un état de santé est interdit sans autorisation.
2. Ciblage publicitaire : Google interdit de cibler d'après un état de santé. Les audiences partent de la démographie, des affinités, des contextes et des mots du quotidien, jamais du symptôme ni du mot « ménopause » comme critère de ciblage.
3. Aucun prix inventé. Les prix du catalogue sont les seuls prix de Krystine; un prix absent reste absent. Les prix comparables d'acteurs du marché portent toujours leur source.
4. Chaque chiffre porte une source lue pendant la recherche (URL) ou la mention « estimation du modèle ».
5. Sa voix : vouvoiement; aucun tiret cadratin; jamais « ce n'est pas X, c'est Y »; « nous » et jamais « on » pour Krystine et son équipe; phrases entières et inégales, jamais la phrase hachée en fragments; le concret avant l'abstrait; des suggestions plutôt que des ordres; jamais d'urgence commerciale ni de bien-être générique. Mots à protéger : Fil lumineux, Foyer d'Origine, Expérience Origine (toujours en entier, jamais « Origine » seul), Qualités, Matière, Vivant, Corps comme instrument, Trilogie. Angles interdits : développement personnel générique, Ayurveda superficiel, abonnement générique, le mot « chair ».
6. Les textes destinés au public sont dans la langue de l'espace demandé (français pour la francophonie, anglais pour l'anglophonie); le reste (raisons, notes) reste en français simple.
7. Utilise la recherche web pour lire des pages fraîches (marché, acteurs, coûts publicitaires, mots-clés) avant d'écrire, sans dépasser huit recherches. Dis ce que tu n'as pas trouvé.

LES QUATRE REGISTRES DE CONTENU
Une audience fidèle se construit avec quatre registres, et n'en publier qu'un seul la fait plafonner.
- ${REGISTRES.educatif}
- ${REGISTRES.inspirant}
- ${REGISTRES.personnel}
- ${REGISTRES.preuve}
Pour chaque registre demandé, la partie « contenus » rend trois idées taillées pour le PREMIER segment que tu décris : un titre accrocheur, l'angle en une phrase, un format suggéré pris parmi ceux qui te sont donnés, et un appel à l'action doux (jamais d'urgence, jamais d'impératif sec). Le registre dominant, quand il est nommé, mène le cycle : ses idées passent en premier et pèsent le plus dans le mix.
La partie « mixSemaine » propose une semaine de publications qui alterne les registres au lieu d'en répéter un, par exemple deux éducatifs, un inspirant, un personnel et une preuve. Les règles dures ci-dessus tiennent partout : aucune allégation de santé, aucun prix inventé, et tout reste un brouillon que Krystine relit.

Rends ton résultat une seule fois avec l'outil rendre_resultat.`;

const OUTIL: Anthropic.Tool = {
  name: 'rendre_resultat',
  description: 'Le résultat complet de la recherche, à afficher tel quel dans l\'admin de Krystine.',
  input_schema: {
    type: 'object',
    required: ['segments', 'associations', 'pitchs', 'contenus', 'mixSemaine', 'offres', 'campagne', 'sources'],
    properties: {
      segments: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'object', required: ['nom', 'portrait', 'dejaEssaye', 'ceQuiFaitDireOui', 'taille', 'motsTapes', 'affinite'], properties: {
        nom: { type: 'string' }, portrait: { type: 'string', description: 'Ce qu\'elle vit à ce moment de sa vie, raconté comme une expérience' },
        dejaEssaye: { type: 'string' }, ceQuiFaitDireOui: { type: 'string' },
        taille: { type: 'string', description: 'Taille estimée avec sa source ou « estimation du modèle »' },
        motsTapes: { type: 'array', items: { type: 'string' } }, affinite: { type: 'string', description: 'Affinité avec l\'œuvre de Krystine, en une phrase' },
      } } },
      associations: { type: 'array', items: { type: 'object', required: ['segment', 'entree', 'coeur', 'suite', 'raison'], properties: {
        segment: { type: 'string' }, entree: { type: 'string' }, coeur: { type: 'string' }, suite: { type: 'string' }, raison: { type: 'string' },
      } } },
      pitchs: { type: 'array', items: { type: 'object', required: ['segment', 'titre', 'accroches', 'texte', 'script15s'], properties: {
        segment: { type: 'string' }, titre: { type: 'string', description: 'Deux lignes au plus' },
        accroches: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
        texte: { type: 'string', description: 'Le brouillon complet, paragraphes séparés par une ligne vide, dans la voix de Krystine' },
        script15s: { type: 'string' },
      } } },
      contenus: { type: 'array', description: 'Un bloc par registre demandé, dans l\'ordre reçu, le dominant en premier', items: { type: 'object', required: ['registre', 'idees'], properties: {
        registre: { type: 'string', enum: CLES_REGISTRES },
        idees: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', required: ['titre', 'angle', 'format', 'appel'], properties: {
          titre: { type: 'string', description: 'Le titre accrocheur, deux lignes au plus' },
          angle: { type: 'string', description: 'L\'angle en une phrase entière' },
          format: { type: 'string', description: 'Un format pris parmi ceux fournis dans la consigne' },
          appel: { type: 'string', description: 'Un appel à l\'action doux, jamais une urgence' },
        } } },
      } } },
      mixSemaine: { type: 'array', minItems: 4, maxItems: 7, description: 'La semaine de publications, un registre par entrée, en variant', items: { type: 'object', required: ['jour', 'registre', 'quoi'], properties: {
        jour: { type: 'string', description: 'Lundi, mardi… ou « Jour 1 »' },
        registre: { type: 'string', enum: CLES_REGISTRES },
        quoi: { type: 'string', description: 'Ce qui se publie ce jour-là, en quelques mots' },
      } } },
      offres: { type: 'array', minItems: 4, maxItems: 10, items: { type: 'object', required: ['nom', 'colonne', 'marche', 'description', 'prixObserves', 'jalon'], properties: {
        nom: { type: 'string' }, colonne: { type: 'string', enum: ['A', 'B'], description: 'A : Krystine présente en personne; B : rapporte sans elle' },
        marche: { type: 'string' }, description: { type: 'string' },
        prixObserves: { type: 'string', description: 'Plancher et plafond observés chez des acteurs comparables, avec la source, ou « non trouvé »' },
        jalon: { type: 'string', description: 'Le jalon du plan auquel l\'idée se rattache' },
      } } },
      campagne: { type: 'object', required: ['audiences', 'formats', 'budgetIndicatif', 'accroches', 'scripts', 'interdits', 'modeEmploi'], properties: {
        audiences: { type: 'array', items: { type: 'string' } }, formats: { type: 'array', items: { type: 'string' } },
        budgetIndicatif: { type: 'string' }, accroches: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
        scripts: { type: 'array', items: { type: 'object', required: ['duree', 'texte'], properties: { duree: { type: 'string', enum: ['6 s', '15 s', '30 s'] }, texte: { type: 'string' } } } },
        interdits: { type: 'array', items: { type: 'string' } }, modeEmploi: { type: 'array', items: { type: 'string' }, description: 'Dix lignes au plus pour poser la campagne dans Google Ads' },
      } },
      sources: { type: 'array', items: { type: 'object', required: ['titre', 'url'], properties: { titre: { type: 'string' }, url: { type: 'string' }, note: { type: 'string' } } } },
    },
  },
};

const INTERDITS = /\b(gu[ée]rit?|gu[ée]rison|traite(ment)?s? (de|des|la|les) (bouff|sympt|m[ée]nopause)|soulage|r[ée]duit les (bouff|sympt)|cures?|heals?|cure|treats?|relieves?|reduces? (hot flashes|symptoms))\b/i;

function texteDe(v: unknown): string { return JSON.stringify(v ?? ''); }

// ─── growthLancer ────────────────────────────────────────────────────────────
export const growthLancer = onCall({ timeoutSeconds: 60, memory: '256MiB' }, async (request) => {
  const email = assertAdmin(request);
  const { espace, intention, audienceId, produitIds, formatId, registres, registreDominant } = (request.data || {}) as
    { espace: Espace; intention: string; audienceId: string; produitIds: string[]; formatId: string | null; registres?: string[]; registreDominant?: string | null };
  if (espace !== 'fr' && espace !== 'en') throw new HttpsError('invalid-argument', 'espace doit être fr ou en');
  if (!['segments', 'pitchs', 'offres', 'campagne'].includes(intention)) throw new HttpsError('invalid-argument', 'intention inconnue');
  if (!audienceId) throw new HttpsError('invalid-argument', 'Choisissez une audience.');
  if (!Array.isArray(produitIds) || !produitIds.length) throw new HttpsError('invalid-argument', 'Cochez au moins un produit.');
  // Les registres : on garde ceux qu'on connaît, et les quatre par défaut.
  const regs = (Array.isArray(registres) ? registres.filter(r => CLES_REGISTRES.includes(r)) : []);
  const registresRetenus = regs.length ? regs : CLES_REGISTRES;
  const dominant = registreDominant && registresRetenus.includes(registreDominant) ? registreDominant : null;

  const db = getFirestore();
  const debut = new Date(); debut.setHours(0, 0, 0, 0);
  const jour = await db.collection('growthRuns').where('creeLe', '>=', Timestamp.fromDate(debut)).count().get();
  if (jour.data().count >= PLAFOND_JOUR) throw new HttpsError('resource-exhausted', `Le plafond de ${PLAFOND_JOUR} recherches par jour est atteint. Le compteur repart à minuit.`);

  const [aud, fmt, cat] = await Promise.all([
    db.collection('growthPresets').doc(audienceId).get(),
    formatId ? db.collection('growthPresets').doc(formatId).get() : Promise.resolve(null),
    db.collection('growthCatalogue').get(),
  ]);
  if (!aud.exists) throw new HttpsError('not-found', 'Audience introuvable');
  const produits = cat.docs.filter(d => produitIds.includes(d.id)).map(d => ({ id: d.id, ...d.data() }));
  if (!produits.length) throw new HttpsError('not-found', 'Aucun des produits cochés n\'existe dans le catalogue.');

  const ref = await db.collection('growthRuns').add({
    espace, intention, par: email,
    audience: aud.data(), produits, format: fmt && fmt.exists ? fmt.data() : null,
    registres: registresRetenus, registreDominant: dominant,
    statut: 'en_attente', progression: 'En file, la recherche démarre dans quelques secondes.',
    creeLe: FieldValue.serverTimestamp(),
  });
  return { runId: ref.id };
});

// ─── growthTravailler ────────────────────────────────────────────────────────
export const growthTravailler = onDocumentCreated(
  { document: 'growthRuns/{id}', secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 540, memory: '1GiB' },
  async (event) => {
    const snap = event.data; if (!snap) return;
    const ref = snap.ref; const run = snap.data() as any;
    if (run.statut !== 'en_attente') return;
    if (!ANTHROPIC_API_KEY.value() || ANTHROPIC_API_KEY.value() === 'PLACEHOLDER') {
      await ref.update({ statut: 'erreur', erreur: 'La clé Anthropic manque : firebase functions:secrets:set ANTHROPIC_API_KEY' }); return;
    }
    await ref.update({ statut: 'en_cours', progression: 'Lecture du marché et rédaction en cours (une à trois minutes).' });

    const espace: Espace = run.espace === 'en' ? 'en' : 'fr';
    const catalogue = (run.produits || []).map((p: any) => `- ${p.nom} (colonne ${p.colonne}${p.prix != null ? `, ${p.prix === 0 ? 'gratuit' : p.prix + ' $'}` : ', prix non public'}) : ${p.description}${p.adresse ? ` [krystinestlaurent.ca${p.adresse}]` : ''}`).join('\n');
    const a = run.audience || {};
    const f = run.format;
    const consigne = [
      `ESPACE : ${espace === 'fr' ? 'Francophonie (Québec, France, Belgique, Suisse romande). Textes publics en français.' : 'Anglophonie (Canada anglais, États-Unis, Royaume-Uni, Australie). Textes publics en anglais.'}`,
      `INTENTION PRINCIPALE : ${run.intention} (rends tout de même chaque partie du résultat, en soignant d'abord celle-ci).`,
      `AUDIENCE DE DÉPART : ${a.nom}. ${a.description}\nPays et langue : ${a.pays}. Âges : ${a.ages}. Affinités : ${a.affinites}. Contextes : ${a.contextes}. Mots du quotidien : ${a.motsCles}.${a.remarketing ? ' Remarketing sur les listes autorisées du site.' : ''}`,
      f ? `FORMAT PUBLICITAIRE RETENU : ${f.nom} (${f.duree}; ${f.budgetJour}; ${f.cout}). Accroche : ${f.accroche}` : 'FORMAT PUBLICITAIRE : à proposer parmi Shorts, InStream désactivable et Demand Gen.',
      `REGISTRES DE CONTENU DEMANDÉS (un bloc « contenus » pour chacun, dans cet ordre) :\n${registresDemandes.map(k => `- ${REGISTRES[k]}`).join('\n')}${dominantDuRun ? `\nRegistre dominant de ce cycle : ${REGISTRES[dominantDuRun]} Ses idées passent en premier et pèsent le plus dans la semaine.` : '\nAucun registre dominant : équilibre les quatre.'}\nFormats utilisables dans les idées : ${f ? f.nom : 'Shorts, InStream désactivable, Demand Gen'}, publication écrite, épisode de podcast, infolettre, direct.`,
      `PRODUITS À ASSOCIER (les seuls) :\n${catalogue}`,
      `LE PLAN DE KRYSTINE (jalons à citer dans les offres) :\n${JALONS.map(j => `- ${j}`).join('\n')}`,
      `Date du jour : ${new Date().toISOString().slice(0, 10)}.`,
    ].join('\n\n');

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let reponse: Anthropic.Message;
    try {
      reponse = await client.messages.create({
        model: MODELE,
        max_tokens: 16000,
        system: SYSTEME,
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 } as any, OUTIL],
        messages: [{ role: 'user', content: consigne }],
      });
    } catch (e: any) {
      const msg = String(e?.message || '');
      const lisible = /credit balance|billing/i.test(msg) ? 'Le crédit du compte Anthropic est épuisé. Alex le recharge et tout repart.'
        : e?.status === 401 ? 'La clé Anthropic est refusée. Alex la remplace et tout repart.'
        : e?.status === 429 || /overloaded/i.test(msg) ? 'Le modèle est très sollicité. Relancez dans quelques minutes.'
        : `La recherche n'a pas abouti (${msg.slice(0, 160) || 'erreur inconnue'}).`;
      await ref.update({ statut: 'erreur', erreur: lisible, termineLe: FieldValue.serverTimestamp() }); return;
    }

    const appel = reponse.content.find((c: any) => c.type === 'tool_use' && c.name === 'rendre_resultat') as any;
    const u: any = reponse.usage || {};
    const recherches = Number(u.server_tool_use?.web_search_requests || 0);
    const cout = {
      entree: u.input_tokens || 0, sortie: u.output_tokens || 0, recherches,
      dollars: Math.round(((u.input_tokens || 0) / 1e6 * PRIX.entree + (u.output_tokens || 0) / 1e6 * PRIX.sortie + recherches / 1000 * PRIX.recherche) * 100) / 100,
      modele: MODELE,
    };
    if (!appel) {
      await ref.update({ statut: 'erreur', erreur: 'Le modèle n\'a rien rendu de structuré. Relancez la recherche.', cout, termineLe: FieldValue.serverTimestamp() }); return;
    }
    const r = appel.input as any;
    // Relecture des interdits : on n'efface rien, on signale.
    const avertissements: string[] = [];
    for (const p of r.pitchs || []) { if (INTERDITS.test(texteDe(p))) avertissements.push(`Le pitch « ${p.titre} » contient un mot d'allégation de santé : à relire avant usage.`); }
    for (const s of r.campagne?.scripts || []) { if (INTERDITS.test(String(s.texte))) avertissements.push(`Le script ${s.duree} de la campagne contient un mot d'allégation de santé : à relire.`); }
    // Les sources citées par la recherche web, en plus de celles du modèle.
    const vues = new Map<string, string>();
    for (const c of reponse.content as any[]) {
      if (c.type === 'web_search_tool_result' && Array.isArray(c.content)) for (const x of c.content) if (x.type === 'web_search_result' && x.url) vues.set(x.url, x.title || x.url);
    }
    const sources = [...(r.sources || [])];
    for (const [url, titre] of vues) if (!sources.some((s: any) => s.url === url)) sources.push({ titre, url, note: 'page lue pendant la recherche' });

    await ref.update({
      statut: 'termine', progression: 'Terminé.',
      resultat: { segments: r.segments || [], associations: r.associations || [], pitchs: r.pitchs || [], offres: r.offres || [], campagne: r.campagne || null, sources, avertissements },
      cout, termineLe: FieldValue.serverTimestamp(),
    });
  },
);

// ─── growthVersGabarit ───────────────────────────────────────────────────────
export const growthVersGabarit = onCall({ timeoutSeconds: 60, memory: '256MiB' }, async (request) => {
  assertAdmin(request);
  const { runId, index } = (request.data || {}) as { runId: string; index: number };
  if (!runId || typeof index !== 'number') throw new HttpsError('invalid-argument', 'runId et index sont requis');
  const db = getFirestore();
  const snap = await db.collection('growthRuns').doc(runId).get();
  if (!snap.exists) throw new HttpsError('not-found', 'Recherche introuvable');
  const run = snap.data() as any;
  const pitch = run.resultat?.pitchs?.[index];
  if (!pitch) throw new HttpsError('not-found', 'Ce pitch n\'existe pas dans la recherche.');
  const lang = run.espace === 'en' ? 'en' : 'fr';
  const paragraphes = String(pitch.texte || '').split(/\n\s*\n/).map((t: string) => t.trim()).filter(Boolean);
  const blocks = [
    { type: 'heading', content: { text: pitch.titre, level: 1, align: 'left' } },
    ...paragraphes.map((text: string) => ({ type: 'paragraph', content: { text } })),
  ];
  const ref = await db.collection('newsletterGabarits').add({
    nom: `${pitch.segment} · ${pitch.titre}`.slice(0, 120), categorie: 'Growth',
    title: pitch.titre, subject: String(pitch.accroches?.[0] || pitch.titre).slice(0, 60), preheader: String(pitch.accroches?.[1] || ''),
    fromName: 'Krystine St-Laurent', blocks, audience: { mode: 'all' }, couverture: 'aucune', couvertureUrl: null, signature: true,
    lang, bandeau: null, fond: null, lettreDor: null, source: { growthRun: runId, index },
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return { gabaritId: ref.id };
});
