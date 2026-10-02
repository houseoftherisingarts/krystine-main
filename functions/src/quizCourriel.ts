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
    'Quand le vent prend trop de place, tout devient plus difficile à tenir ensemble.',
  ],
  pitta: [
    'Impatience, irritabilité, et le soir, le feu tarde à s’apaiser.',
    'À force d’intensité, même ce qui nous fait avancer peut finir par nous brûler.',
  ],
  kapha: [
    'Le matin démarre lentement. L’élan tarde à venir et les choses s’accumulent plus facilement.',
    'Quand tout devient plus lourd, ce n’est pas toujours qu’il faut faire plus.',
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
    { texte: 'La clé pour apaiser vata : la régularité.', source: 'Nature & Ayurveda, p. 131' },
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

export function sujetResultat(d: Dosha): string {
  return `Votre lecture du quiz : dominance ${NOM_COURANT[d]}`;
}

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const ENCRE = '#1c1712';
const DOUX = '#3a2f23';
const LAITON = '#7d6330';
const FILET = '#d9ccb4';

export function renderResultatHtml(r: ResultatQuiz): string {
  const d = r.dominant;
  const [p1, p2] = CARTE[d];
  const libelle = (t: string) => `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${LAITON};">${t}</p>`;
  const filet = `<tr><td style="padding:0 40px;"><div style="height:1px;background:${FILET};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>`;

  const stats = (['vata', 'pitta', 'kapha'] as Dosha[]).map(x => `
    <td align="center" width="33%" style="padding:0 6px;">
      <img src="${PICTO[x]}" width="34" height="34" alt="" style="display:block;margin:0 auto 6px;border:0;" />
      <div style="font-family:${SERIF};font-weight:300;font-size:26px;color:${ENCRE};">${entier(r.pourcentages[x])}%</div>
      <div style="margin-top:4px;font-family:${SANS};font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:${DOUX};">${NOM_COURANT[x]}</div>
    </td>`).join('');

  const cles = CLES_RESULTAT[d].map(c => `
    <p style="margin:0 0 6px;font-family:${SERIF};font-weight:300;font-size:19px;line-height:1.5;color:${ENCRE};">« ${esc(c.texte)} »</p>
    <p style="margin:0 0 20px;font-family:${SANS};font-size:12px;color:${DOUX};">${esc(c.source)}</p>`).join('');

  const suite = r.suite || !r.lienSuite ? '' : `
    ${filet}
    <tr><td align="center" style="padding:30px 40px 6px;">
      <a href="${esc(r.lienSuite)}" style="display:inline-block;background:${ENCRE};color:#f4efe6;font-family:${SANS};font-size:12px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:16px 28px;">Recevoir la suite de ma lecture</a>
      <p style="margin:14px 0 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${DOUX};">Des repères adaptés à votre résultat, par courriel. Un clic suffit.</p>
    </td></tr>`;

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(sujetResultat(d))}</title></head>
<body style="margin:0;padding:0;background:#f4efe6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#faf6ee;border:1px solid #c9b48a;">
  <tr><td style="padding:40px 40px 8px;font-family:${SANS};font-size:15px;line-height:1.8;color:${ENCRE};">Bonjour ${esc(r.prenom)},</td></tr>

  <tr><td align="center" style="padding:24px 40px 8px;">
    <img src="${PICTO[d]}" width="88" height="88" alt="" style="display:block;margin:0 auto 18px;border:0;" />
    ${libelle('Votre dominance aujourd’hui')}
    <h1 style="margin:0;font-family:${SERIF};font-weight:300;font-size:46px;line-height:1;color:${ENCRE};">${NOM_COURANT[d]}</h1>
  </td></tr>

  <tr><td style="padding:26px 34px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${stats}</tr></table>
  </td></tr>

  ${filet}
  <tr><td style="padding:30px 40px 6px;">
    <p style="margin:0 0 12px;font-family:${SERIF};font-weight:300;font-size:21px;line-height:1.45;color:${ENCRE};">${esc(p1)}</p>
    <p style="margin:0 0 18px;font-family:${SANS};font-size:15px;line-height:1.8;color:${DOUX};">${esc(p2)}</p>
    <p style="margin:0;font-family:${SANS};font-size:13px;line-height:1.7;color:${DOUX};">Dans le langage de l’Ayurveda, cette dominance est appelée ${NOM_AYURVEDA[d]}.</p>
  </td></tr>

  <tr><td style="padding:28px 40px 26px;">
    ${libelle('La direction')}
    <p style="margin:0;font-family:${SERIF};font-weight:300;font-size:22px;line-height:1.4;color:${ENCRE};">${DIRECTION[d]}</p>
  </td></tr>

  ${filet}
  <tr><td style="padding:30px 40px 6px;">
    ${libelle('Deux clés tirées de Nature &amp; Ayurveda')}
    ${cles}
  </td></tr>
  ${suite}

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
  const d = r.dominant;
  const [p1, p2] = CARTE[d];
  const l: string[] = [
    `Bonjour ${r.prenom},`,
    '',
    `Votre dominance aujourd'hui : ${NOM_COURANT[d]}`,
    `Vent ${entier(r.pourcentages.vata)} % · Feu ${entier(r.pourcentages.pitta)} % · Terre ${entier(r.pourcentages.kapha)} %`,
    '',
    p1,
    p2,
    '',
    `Dans le langage de l'Ayurveda, cette dominance est appelée ${NOM_AYURVEDA[d]}.`,
    '',
    'La direction',
    DIRECTION[d],
    '',
    'Deux clés tirées de Nature & Ayurveda',
    ...CLES_RESULTAT[d].map(c => `« ${c.texte} » (${c.source})`),
  ];
  if (!r.suite && r.lienSuite) l.push('', `Recevoir la suite de ma lecture : ${r.lienSuite}`);
  l.push('', 'Krystine St-Laurent · krystinestlaurent.ca',
    'Vous recevez ce courriel parce que vous avez demandé votre résultat au quiz sur krystinestlaurent.ca.');
  return l.join('\n');
}
