// ─── Le courriel du résultat du quiz (/quiz) ─────────────────────────────────
// Module pur (aucun appel Firebase) : il rend l'objet, le HTML et le texte du
// courriel envoyé par `envoyerResultatQuiz` (quiz.ts). Langage du site : crème
// #f4efe6, encre #1c1712, titres en serif, picto du dosha. Aucun italique.

export type Dosha = 'vata' | 'pitta' | 'kapha';

const SITE = 'https://www.krystinestlaurent.ca';

export const NOM_COURANT: Record<Dosha, string> = { vata: 'Vent', pitta: 'Feu', kapha: 'Terre' };
const NOM_AYURVEDA: Record<Dosha, string> = { vata: 'Vata', pitta: 'Pitta', kapha: 'Kapha' };

// Les deux premières phrases de la carte de Krystine, recopiées mot pour mot
// de CARTE_DOMINANCE (src/pages/QuizLoeuvre.tsx). Toute retouche se fait aux
// deux endroits.
const CARTE: Record<Dosha, [string, string]> = {
  vata: [
    'Le mental part dans tous les sens. Le sommeil devient plus fragile.',
    'Lorsque le vent prend trop de place, tout devient plus difficile à tenir ensemble.',
  ],
  pitta: [
    'Impatience, irritabilité, et le soir, le feu tarde à s’apaiser.',
    'À force d’intensité, même ce qui nous fait avancer peut finir par nous brûler.',
  ],
  kapha: [
    'Le matin démarre lentement. L’élan tarde à venir et les choses s’accumulent plus facilement.',
    'Lorsque tout devient plus lourd, ce n’est pas toujours qu’il faut faire plus.',
  ],
};

const DIRECTION: Record<Dosha, string> = {
  vata: 'Enraciner, réchauffer et apaiser.',
  pitta: 'Rafraîchir, apaiser et adoucir.',
  kapha: 'Activer et stimuler.',
};

// Les deux clés tirées des livres de Krystine, par dosha (validées le 2 oct. 2026).
// Texte et page de référence; modifier ici seulement.
export const CLES_RESULTAT: Record<Dosha, { texte: string; source: string }[]> = {
  vata: [
    { texte: 'La clé pour apaiser vata : la régularité.', source: 'Nature & Ayurveda, p. 130' },
    { texte: 'Commencer plutôt la journée en consommant quelque chose de chaud', source: 'Nature & Ayurveda, p. 268' },
  ],
  pitta: [
    { texte: 'Opter pour la modération, ralentir le rythme', source: 'Nature & Ayurveda, p. 135' },
    { texte: 'l’excès de feu s’apaise rapidement grâce à une connexion avec l’eau, les lacs, les rivières et la paix de mère Nature', source: 'Féminité & Ayurveda, p. 234' },
  ],
  kapha: [
    { texte: 'Le matin, se lever avant 6 heures', source: 'Nature & Ayurveda, p. 141' },
    { texte: 'pour débuter, marcher au moins 15 minutes chaque jour. Il est important de bouger', source: 'Nature & Ayurveda, p. 141' },
  ],
};

// ─── L'algorithme du résultat (validé par Krystine le 2 oct. 2026) ──────────
// Pourcentages par bonds de 10. D1 ≥ D2 ≥ D3; à égalité, le Vent passe avant
// le Feu, qui passe avant la Terre (« le Vent domine toujours »).
//   équilibre : D1 − D3 ≤ 10       → profil-equilibre
//   double    : D1 = D2            → profil-double + second-<D2>
//   teintée   : D1 − D2 = 10       → profil-teinte + second-<D2>
//   nette     : D1 − D2 ≥ 20       → profil-net
// Miroir côté navigateur : lireProfil dans src/pages/QuizLoeuvre.tsx.
export type Branche = 'equilibre' | 'double' | 'teinte' | 'net';
const PRIORITE: Dosha[] = ['vata', 'pitta', 'kapha'];
const COURANT_TAG: Record<Dosha, string> = { vata: 'vent', pitta: 'feu', kapha: 'terre' };
/** L'étiquette qui fait entrer dans la suite de lecture du dominant. */
export const ETIQUETTE_SUITE: Record<Dosha, string> = { vata: 'suite-vent', pitta: 'suite-feu', kapha: 'suite-terre' };
/** Les dominances qui ont déjà leur séquence de suite (les autres reçoivent la liste d'attente). */
export const SUITE_PRETE: Record<Dosha, boolean> = { vata: true, pitta: false, kapha: false };

export interface Profil { ordre: [Dosha, Dosha, Dosha]; branche: Branche; etiquettes: string[] }

export function lireProfil(p: { vata: number; pitta: number; kapha: number }): Profil {
  const dix = (d: Dosha) => Math.round((Number(p[d]) || 0) / 10) * 10;
  // Tri stable : à égalité, l'ordre de PRIORITE tient.
  const ordre = [...PRIORITE].sort((a, b) => dix(b) - dix(a)) as [Dosha, Dosha, Dosha];
  const [d1, d2, d3] = ordre;
  const second = `second-${COURANT_TAG[d2]}`;
  if (dix(d1) - dix(d3) <= 10) return { ordre, branche: 'equilibre', etiquettes: ['profil-equilibre'] };
  if (dix(d1) === dix(d2)) return { ordre, branche: 'double', etiquettes: ['profil-double', second] };
  if (dix(d1) - dix(d2) === 10) return { ordre, branche: 'teinte', etiquettes: ['profil-teinte', second] };
  return { ordre, branche: 'net', etiquettes: ['profil-net'] };
}

// ─── La nomenclature (règle absolue de Krystine, 3 oct. 2026) ───────────────
// Nous portons les cinq éléments (Espace, Vent, Feu, Eau, Terre), unis en
// trois doshas. Chaque fois qu'une dominance est nommée, ses éléments
// l'accompagnent. Miroir côté navigateur : src/pages/QuizLoeuvre.tsx.
export const ELEMENTS: Record<Dosha, string> = { vata: 'Vent et Espace', pitta: 'Feu et Eau', kapha: 'Eau et Terre' };
/** « Vata (Vent et Espace) » */
export const nomme = (d: Dosha) => `${NOM_AYURVEDA[d]} (${ELEMENTS[d]})`;

// Les textes approuvés par Krystine le 3 oct. 2026 (écran et courriel, mot pour mot).
const COURANT_PAIRE: Record<string, string> = {
  'vata-pitta': 'Vent et Feu', 'vata-kapha': 'Vent et Terre', 'pitta-kapha': 'Feu et Terre',
};
export const EXPLICATION_DOUBLE = 'Nous sommes faits des cinq éléments : l’Espace, le Vent, le Feu, l’Eau et la Terre. Ils s’unissent en trois doshas : Vata (Vent et Espace), Pitta (Feu et Eau) et Kapha (Eau et Terre). Chez la plupart d’entre nous, deux doshas prennent plus de place que le troisième, l’un dominant, l’autre secondaire : l’Ayurveda appelle cela un type mixte.';
const PAIRE: Record<string, { phrase: string; direction: string }> = {
  'vata-pitta': {
    phrase: 'C’est l’image du vent qui souffle sur le feu : lorsque Vata (Vent et Espace) s’emporte, il attise Pitta (Feu et Eau). La première chose à apaiser, c’est Vata.',
    direction: 'Enraciner, rafraîchir et apaiser.',
  },
  'vata-kapha': {
    phrase: 'Vata (Vent et Espace) disperse et Kapha (Eau et Terre) alourdit : un jour tout s’agite, le lendemain plus rien n’avance. La chaleur et la régularité aident les deux.',
    direction: 'Réchauffer, puis activer doucement.',
  },
  'pitta-kapha': {
    phrase: 'Pitta (Feu et Eau) pousse et Kapha (Eau et Terre) retient : beaucoup d’intensité, avec de la lenteur à se mettre en mouvement. Rafraîchir Pitta et activer Kapha vont ensemble.',
    direction: 'Rafraîchir, apaiser et activer.',
  },
};
export const EQUILIBRE = {
  carte: 'Vata (Vent et Espace), Pitta (Feu et Eau) et Kapha (Eau et Terre) sont presque à égalité, donc plutôt équilibrés. Cependant, avec le froid et les journées chargées, Vata peut très bien se mettre à dominer.',
  ayurveda: 'Dans le langage de l’Ayurveda, Vata (Vent et Espace), Pitta (Feu et Eau) et Kapha (Eau et Terre) sont ici presque à égalité.',
  direction: 'Garder le centre : observer, puis ajuster doucement.',
  suite: 'Les lettres qui suivent parlent de Vata, puisque nous sommes en saison Vata.',
};

/** Ce que l'écran et le courriel affichent, selon la branche. */
export interface Lecture {
  branche: Branche;
  /** Les doshas montrés sous le grand mot (1, 2 ou 3). */
  montres: Dosha[];
  libelle: string;
  titre: string;
  /** La ligne sous le grand mot, sans les pictos (le picto précède chaque nom). */
  noms: string[];
  carte: string[];
  ayurveda: string;
  direction: string;
  /** Sous la carte (écran et courriel). */
  sousCarte: string;
  /** Vers la suite (courriel seulement). */
  versSuite: string;
}

export function lireLecture(p: { vata: number; pitta: number; kapha: number }, dominant?: Dosha): Lecture {
  const pr = lireProfil(p);
  const vide = p.vata + p.pitta + p.kapha <= 0;
  const [d1, d2] = vide && dominant ? [dominant, dominant] : pr.ordre;
  const branche: Branche = vide ? 'net' : pr.branche;
  if (branche === 'equilibre') {
    return {
      branche, montres: ['vata', 'pitta', 'kapha'], libelle: 'Votre lecture aujourd’hui', titre: 'Équilibre',
      noms: [nomme('vata'), nomme('pitta'), nomme('kapha')], carte: [EQUILIBRE.carte], ayurveda: EQUILIBRE.ayurveda,
      direction: EQUILIBRE.direction, sousCarte: '',
      versSuite: SUITE_PRETE[d1] && d1 === 'vata' ? EQUILIBRE.suite : '',
    };
  }
  if (branche === 'double') {
    const k = `${d1}-${d2}`;
    return {
      branche, montres: [d1, d2], libelle: 'Vos deux dominances aujourd’hui', titre: COURANT_PAIRE[k],
      noms: [nomme(d1), nomme(d2)], carte: [EXPLICATION_DOUBLE, PAIRE[k].phrase],
      ayurveda: `Dans le langage de l’Ayurveda, ces deux dominances s’appellent ${nomme(d1)} et ${nomme(d2)}.`,
      direction: PAIRE[k].direction,
      sousCarte: `Votre lecture montre deux dominances à égalité : ${nomme(d1)} et ${nomme(d2)}.`,
      versSuite: SUITE_PRETE[d1] && d1 === 'vata'
        ? `Les lettres qui suivent parlent de Vata, puisque nous sommes en saison Vata, et ${NOM_AYURVEDA[d2]} y trouve sa place.`
        : '',
    };
  }
  return {
    branche, montres: [d1], libelle: 'Votre dominance aujourd’hui', titre: NOM_COURANT[d1],
    noms: [`${NOM_AYURVEDA[d1]} (${ELEMENTS[d1]})`], carte: [...CARTE[d1]],
    ayurveda: `Dans le langage de l’Ayurveda, cette dominance est appelée ${nomme(d1)}.`,
    direction: DIRECTION[d1],
    sousCarte: branche === 'teinte' ? `Votre lecture montre aussi une part importante de ${nomme(d2)}.` : '',
    versSuite: branche === 'teinte' && SUITE_PRETE[d1]
      ? `Les lettres qui suivent partent de ${nomme(d1)}, parce qu’il domine aujourd’hui, mais ${nomme(d2)} y joue souvent un rôle.`
      : '',
  };
}

/** Au-dessus du bouton VATA Essentiel, pour toutes les lectures. */
export const RAISON_VATA = 'Nous sommes en saison Vata : chacune de nous porte de Vata (Vent et Espace) en ce moment.';

export const LIEN_ATTENTE: Record<Dosha, string | null> = {
  vata: null,
  pitta: `${SITE}/liste-attente?programme=pitta`,
  kapha: `${SITE}/liste-attente?programme=kapha`,
};

export interface ResultatQuiz {
  prenom: string;
  dominant: Dosha;
  pourcentages: { vata: number; pitta: number; kapha: number };
  suite: boolean;
  /** Lien « Recevoir la suite de ma lecture » en un clic, quand suite === false. */
  lienSuite?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Les adresses des pictos viennent d'une table fixe, jamais d'une valeur reçue.
const PICTO: Record<Dosha, string> = {
  vata: `${SITE}/quiz/pictos/vata.png`,
  pitta: `${SITE}/quiz/pictos/pitta.png`,
  kapha: `${SITE}/quiz/pictos/kapha.png`,
};
const entier = (n: number) => String(Math.min(100, Math.max(0, Math.round(Number(n) || 0))));

export function sujetResultat(d: Dosha, pourcentages?: { vata: number; pitta: number; kapha: number }): string {
  const l = pourcentages ? lireLecture(pourcentages, d) : null;
  if (l && l.branche === 'equilibre') return 'Votre lecture du quiz : équilibre entre Vata, Pitta et Kapha';
  if (l && l.branche === 'double') return `Votre lecture du quiz : deux dominances, ${l.noms.join(' et ')}`;
  return `Votre lecture du quiz : dominance ${nomme(l ? l.montres[0] : d)}`;
}

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const ENCRE = '#1c1712';
const DOUX = '#3a2f23';
const LAITON = '#7d6330';
const FILET = '#d9ccb4';

export function renderResultatHtml(r: ResultatQuiz): string {
  const L = lireLecture(r.pourcentages, r.dominant);
  const d = L.montres[0];
  const attente = LIEN_ATTENTE[d];
  const libelle = (t: string) => `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${LAITON};">${t}</p>`;
  const filet = `<tr><td style="padding:0 40px;"><div style="height:1px;background:${FILET};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>`;
  const grand = L.montres.length === 1 ? 88 : L.montres.length === 2 ? 64 : 52;
  const medaillons = L.montres.map(x => `<img src="${PICTO[x]}" width="${grand}" height="${grand}" alt="" style="display:inline-block;margin:0 6px 18px;border:0;" />`).join('');
  // Sous le grand mot : petit picto (20 px) + nom, pour chaque dosha montré.
  const noms = L.montres.map((x, i) => `<span style="white-space:nowrap;"><img src="${PICTO[x]}" width="20" height="20" alt="" style="display:inline-block;vertical-align:middle;margin:0 6px 0 0;border:0;" /><span style="vertical-align:middle;">${esc(L.noms[i])}</span></span>`).join(`<span style="vertical-align:middle;color:${LAITON};"> &nbsp;·&nbsp; </span>`);

  const stats = (['vata', 'pitta', 'kapha'] as Dosha[]).map(x => `
    <td align="center" width="33%" style="padding:0 6px;">
      <img src="${PICTO[x]}" width="34" height="34" alt="" style="display:block;margin:0 auto 6px;border:0;" />
      <div style="font-family:${SERIF};font-weight:300;font-size:26px;color:${ENCRE};">${entier(r.pourcentages[x])}%</div>
      <div style="margin-top:4px;font-family:${SANS};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${DOUX};">${NOM_COURANT[x]}</div>
    </td>`).join('');

  const cles = CLES_RESULTAT[d].map(c => `
    <p style="margin:0 0 6px;font-family:${SERIF};font-weight:300;font-size:19px;line-height:1.5;color:${ENCRE};">« ${esc(c.texte)} »</p>
    <p style="margin:0 0 20px;font-family:${SANS};font-size:12px;color:${DOUX};">${esc(c.source)}</p>`).join('');

  // La carte : la première phrase en serif, les suivantes en corps (double : l'explication, puis la paire).
  const carte = L.branche === 'double'
    ? `<p style="margin:0 0 16px;font-family:${SANS};font-size:15px;line-height:1.8;color:${DOUX};">${esc(L.carte[0])}</p>
    <p style="margin:0 0 18px;font-family:${SERIF};font-weight:300;font-size:21px;line-height:1.45;color:${ENCRE};">${esc(L.carte[1])}</p>`
    : L.carte.map((t, i) => i === 0
      ? `<p style="margin:0 0 ${L.carte.length > 1 ? 12 : 18}px;font-family:${SERIF};font-weight:300;font-size:21px;line-height:1.45;color:${ENCRE};">${esc(t)}</p>`
      : `<p style="margin:0 0 18px;font-family:${SANS};font-size:15px;line-height:1.8;color:${DOUX};">${esc(t)}</p>`).join('\n    ');

  const suite = r.suite || !r.lienSuite ? '' : `
    ${filet}
    <tr><td align="center" style="padding:30px 40px 6px;">
      <a href="${esc(r.lienSuite)}" style="display:inline-block;background:${ENCRE};color:#f4efe6;font-family:${SANS};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:16px 28px;">Recevoir la suite de ma lecture</a>
      <p style="margin:14px 0 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${DOUX};">Des repères adaptés à votre résultat, par courriel. Un clic suffit.</p>
    </td></tr>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(sujetResultat(r.dominant, r.pourcentages))}</title></head>
<body style="margin:0;padding:0;background:#f4efe6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#faf6ee;border:1px solid #c9b48a;">
  <tr><td style="padding:40px 40px 8px;font-family:${SANS};font-size:15px;line-height:1.8;color:${ENCRE};">Bonjour ${esc(r.prenom)},</td></tr>

  <tr><td align="center" style="padding:24px 40px 8px;">
    <div>${medaillons}</div>
    ${libelle(L.libelle)}
    <h1 style="margin:0;font-family:${SERIF};font-weight:300;font-size:46px;line-height:1.05;color:${ENCRE};">${esc(L.titre)}</h1>
    <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;line-height:1.9;color:${DOUX};">${noms}</p>
  </td></tr>

  <tr><td style="padding:26px 34px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${stats}</tr></table>
  </td></tr>

  ${filet}
  <tr><td style="padding:30px 40px 6px;">
    ${carte}
    <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.7;color:${DOUX};">${esc(L.ayurveda)}</p>
    ${L.sousCarte ? `<p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.8;color:${ENCRE};">${esc(L.sousCarte)}</p>` : ''}
  </td></tr>

  <tr><td style="padding:28px 40px 26px;">
    ${libelle('La direction')}
    <p style="margin:0;font-family:${SERIF};font-weight:300;font-size:22px;line-height:1.4;color:${ENCRE};">${esc(L.direction)}</p>
    ${L.versSuite ? `<p style="margin:18px 0 0;font-family:${SANS};font-size:15px;line-height:1.8;color:${DOUX};">${esc(L.versSuite)}</p>` : ''}
  </td></tr>

  ${filet}
  <tr><td style="padding:30px 40px 6px;">
    ${libelle('Deux clés tirées de Nature &amp; Ayurveda')}
    ${cles}
  </td></tr>
  ${suite}
  ${attente ? `<tr><td align="center" style="padding:${suite ? '14px' : '30px'} 40px 6px;">
      <a href="${esc(attente)}" style="font-family:${SANS};font-size:13px;line-height:1.7;color:${ENCRE};text-decoration:underline;">Rejoindre la liste d’attente du programme ${nomme(d)}</a>
    </td></tr>` : ''}

  <tr><td style="padding:34px 40px 36px;">
    <div style="height:1px;background:${FILET};line-height:1px;font-size:1px;margin-bottom:20px;">&nbsp;</div>
    <p style="margin:0 0 6px;font-family:${SANS};font-size:12px;letter-spacing:0.08em;color:${ENCRE};">Krystine St-Laurent · <a href="${SITE}" style="color:${ENCRE};text-decoration:underline;">krystinestlaurent.ca</a></p>
    <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.7;color:${DOUX};">Vous recevez ce courriel parce que vous avez demandé votre résultat au quiz sur krystinestlaurent.ca.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

export function renderResultatTexte(r: ResultatQuiz): string {
  const L = lireLecture(r.pourcentages, r.dominant);
  const d = L.montres[0];
  const l: string[] = [
    `Bonjour ${r.prenom},`,
    '',
    `${L.libelle} : ${L.titre}`,
    L.noms.join(' · '),
    `Vent ${entier(r.pourcentages.vata)} % · Feu ${entier(r.pourcentages.pitta)} % · Terre ${entier(r.pourcentages.kapha)} %`,
    '',
    ...L.carte,
    '',
    L.ayurveda,
    ...(L.sousCarte ? ['', L.sousCarte] : []),
    '',
    'La direction',
    L.direction,
    ...(L.versSuite ? ['', L.versSuite] : []),
    '',
    'Deux clés tirées de Nature & Ayurveda',
    ...CLES_RESULTAT[d].map(c => `« ${c.texte} » (${c.source})`),
  ];
  if (!r.suite && r.lienSuite) l.push('', `Recevoir la suite de ma lecture : ${r.lienSuite}`);
  const attenteTxt = LIEN_ATTENTE[d];
  if (attenteTxt) l.push('', `Rejoindre la liste d’attente du programme ${nomme(d)} : ${attenteTxt}`);
  l.push('', 'Krystine St-Laurent · krystinestlaurent.ca',
    'Vous recevez ce courriel parce que vous avez demandé votre résultat au quiz sur krystinestlaurent.ca.');
  return l.join('\n');
}
