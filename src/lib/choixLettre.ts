// Les choix d'une lettre (Krystine, 27 sept. 2026) : quatre motifs d'intérêt
// et deux façons d'avancer. La lettre montre une grille légère de carrés à
// cocher; un clic ouvre /mes-choix avec ce carré déjà coché, où la lectrice
// coche les autres et envoie. Les clés doivent rester celles de
// functions/src/newsletter/choix.ts.
export type GroupeChoix = 'interet' | 'preference';
export interface OptionChoix { groupe: GroupeChoix; cle: string; libelle: string; phrase: string; texte: string }

export const QUESTIONS_CHOIX: Record<GroupeChoix, string> = {
  interet: 'Qu’est-ce qui vous appelle en ce moment?',
  preference: 'Et comment aimez-vous avancer?',
};

export const OPTIONS_CHOIX: OptionChoix[] = [
  { groupe: 'interet', cle: 'choisir', libelle: 'Choisir', phrase: 'Je veux mieux discerner ce qui me convient.', texte: 'Nous recevons tellement de réponses, de conseils et de directions qu’il devient parfois difficile de reconnaître ce qui nous convient vraiment.' },
  { groupe: 'interet', cle: 'rythme', libelle: 'Retrouver mon rythme', phrase: 'Je veux mieux écouter ce que mon corps me montre.', texte: 'Nos rythmes changent avec les saisons, les périodes de vie et ce que nous traversons. J’ai envie de mieux les comprendre et les respecter.' },
  { groupe: 'interet', cle: 'rester-entiere', libelle: 'Rester entière', phrase: 'Je veux retrouver mes repères quand tout me tire dans plusieurs directions.', texte: 'Nous pouvons facilement nous disperser entre l’information, les exigences, les rôles et tout ce qui réclame notre attention.' },
  { groupe: 'interet', cle: 'relier', libelle: 'Relier', phrase: 'Je veux comprendre autrement ce que je vis.', texte: 'J’ai envie d’explorer les liens entre le corps, la nature, la science, les savoirs et l’expérience humaine plutôt que de tout regarder séparément.' },
  { groupe: 'preference', cle: 'autonomie', libelle: 'Avancer à ma façon', phrase: 'J’aime avancer seule, à mon rythme.', texte: 'Je préfère recevoir des idées, des repères et des ressources que je peux explorer librement.' },
  { groupe: 'preference', cle: 'accompagnement', libelle: 'Être accompagnée', phrase: 'J’aime être accompagnée lorsque je veux aller plus loin.', texte: 'Un cadre, une progression et une présence m’aident à approfondir et à intégrer ce que je découvre.' },
];
