// La boutique s'organise autour de la saison en cours (Krystine, 4 oct. 2026 :
// « ça devrait être les essentiels de la saison »). La saison change toute
// seule par la date, à l'heure de Montréal (America/Toronto) :
//   · Vata (Vent et Espace), la saison froide : du 22 septembre au 31 janvier
//   · Kapha (Eau et Terre), le printemps : du 1er février au 20 juin
//   · Pitta (Feu et Eau), l'été : du 21 juin au 21 septembre
//
// POUR CHANGER LES PRODUITS D'UNE SAISON : modifier la liste `essentiels`
// ci-dessous (handles Shopify). Le premier est la vedette (l'huile de la
// dominance), les suivants forment la rangée; seuls les trois premiers
// disponibles s'affichent. Un produit masqué dans /admin ou épuisé partout
// est sauté tout seul, le suivant prend sa place.

import { DOSHA_ACCENT, type DoshaKey } from './doshaReading';
import { modeApercu } from './apercuBoutique';

export interface Essentiel {
  handle: string;
  /** Une phrase sur ce que le produit apporte à la dominance. */
  pourquoiFR: string;
  pourquoiEN: string;
}

export interface Vedette extends Essentiel {
  libelleFR: string;
  libelleEN: string;
}

export interface SaisonBoutique {
  dosha: DoshaKey;
  couleur: string;
  saisonFR: string;
  saisonEN: string;
  doshaFR: string; // nom + éléments, toujours ensemble
  doshaEN: string;
  periodeFR: string;
  periodeEN: string;
  introFR: string;
  introEN: string;
  vedette: Vedette;
  essentiels: Essentiel[];
}

export const SAISONS: Record<DoshaKey, SaisonBoutique> = {
  vata: {
    dosha: 'vata',
    couleur: DOSHA_ACCENT.vata,
    saisonFR: 'La saison froide',
    saisonEN: 'The cold season',
    doshaFR: 'Vata (Vent et Espace)',
    doshaEN: 'Vata (Wind and Space)',
    periodeFR: 'Du 22 septembre au 31 janvier',
    periodeEN: 'September 22 to January 31',
    introFR:
      "L'air devient sec, le vent se lève et tout s'accélère. Vata (Vent et Espace) prend de la place : la peau tiraille, le sommeil devient plus léger, le mental court. Pour traverser ces mois-là, le corps demande de la chaleur, de l'huile et des gestes répétés chaque jour.",
    introEN:
      'The air turns dry, the wind rises and everything speeds up. Vata (Wind and Space) takes up room: skin feels tight, sleep gets lighter, the mind races. To get through these months, the body asks for warmth, oil and gestures repeated every day.',
    vedette: {
      handle: 'huile-corporelle-apaisante-vata-3',
      libelleFR: "L'huile de la saison froide",
      libelleEN: 'The oil of the cold season',
      pourquoiFR: 'Une huile qui enveloppe et nourrit la peau que Vata (Vent et Espace) assèche, et qui ramène le mental dans le corps.',
      pourquoiEN: 'An oil that wraps and nourishes the skin Vata (Wind and Space) dries out, and brings the mind back into the body.',
    },
    essentiels: [
      { handle: 'serum-visage-defripant', pourquoiFR: 'Le visage est le premier exposé au vent et au froid. Le sérum le nourrit lorsque Vata (Vent et Espace) le fait tirailler.', pourquoiEN: 'The face is the first exposed to wind and cold. The serum nourishes it when Vata (Wind and Space) makes it feel tight.' },
      { handle: 'huile-nasale-nez-zen', pourquoiFR: "Le chauffage assèche l'air de la maison. Huiler le nez garde l'intérieur souple pendant la saison de Vata (Vent et Espace).", pourquoiEN: 'Heating dries the air at home. Oiling the nose keeps the inside supple through the Vata (Wind and Space) season.' },
      { handle: 'repose-yeux-inspirata', pourquoiFR: 'Un poids doux et le noir complet : les yeux se reposent, et le mental que Vata (Vent et Espace) fait courir ralentit enfin.', pourquoiEN: 'A gentle weight and full darkness: the eyes rest, and the mind Vata (Wind and Space) keeps racing finally slows down.' },
      { handle: 'gratte-langue-cuivre', pourquoiFR: 'Deux minutes au lever, chaque jour à la même heure : un repère fixe, ce dont Vata (Vent et Espace) a le plus besoin.', pourquoiEN: 'Two minutes on waking, every day at the same time: a fixed landmark, what Vata (Wind and Space) needs most.' },
    ],
  },
  kapha: {
    dosha: 'kapha',
    couleur: DOSHA_ACCENT.kapha,
    saisonFR: 'Le printemps',
    saisonEN: 'Spring',
    doshaFR: 'Kapha (Eau et Terre)',
    doshaEN: 'Kapha (Water and Earth)',
    periodeFR: 'Du 1er février au 20 juin',
    periodeEN: 'February 1 to June 20',
    introFR:
      "La lumière revient, la neige fond et la terre se gorge d'eau. Le corps suit le même mouvement : il s'alourdit, se congestionne, traîne un peu le matin. Kapha (Eau et Terre) domine, et ce qu'il demande, c'est de bouger, d'alléger et de réveiller la circulation.",
    introEN:
      'The light returns, the snow melts and the earth fills with water. The body follows the same movement: it grows heavy, congested, a little slow in the morning. Kapha (Water and Earth) leads, and what it asks for is movement, lightness and a circulation woken up.',
    vedette: {
      handle: 'huile-corporelle-energisante-kapha',
      libelleFR: "L'huile du printemps",
      libelleEN: 'The oil of spring',
      pourquoiFR: 'Une huile tonique pour secouer la lourdeur du printemps et remettre en mouvement ce que Kapha (Eau et Terre) ralentit.',
      pourquoiEN: 'A toning oil to shake off the heaviness of spring and set back in motion what Kapha (Water and Earth) slows down.',
    },
    essentiels: [
      { handle: 'gratte-langue-cuivre', pourquoiFR: 'Au réveil, la langue est souvent chargée lorsque Kapha (Eau et Terre) domine. La gratter allège la bouche dès le matin.', pourquoiEN: 'On waking, the tongue is often coated when Kapha (Water and Earth) leads. Scraping it lightens the mouth first thing.' },
      { handle: 'synergie-huiles-essentielles-d-stress', pourquoiFR: "Lorsque Kapha (Eau et Terre) alourdit l'humeur, une odeur qui change l'air de la pièce aide à garder l'esprit clair.", pourquoiEN: 'When Kapha (Water and Earth) weighs on the mood, a scent that changes the air of the room helps keep the mind clear.' },
      { handle: 'roll-on-d-stress', pourquoiFR: "Un petit flacon dans le sac pour garder le cap lorsque l'élan s'enlise, ce qui arrive vite au printemps de Kapha (Eau et Terre).", pourquoiEN: 'A small bottle in your bag to stay on course when momentum bogs down, which happens fast in the Kapha (Water and Earth) spring.' },
      { handle: 'la-sportive', pourquoiFR: 'Pour accompagner la remise en mouvement que demande Kapha (Eau et Terre) au printemps.', pourquoiEN: 'To support the return to movement Kapha (Water and Earth) asks for in spring.' },
    ],
  },
  pitta: {
    dosha: 'pitta',
    couleur: DOSHA_ACCENT.pitta,
    saisonFR: "L'été",
    saisonEN: 'Summer',
    doshaFR: 'Pitta (Feu et Eau)',
    doshaEN: 'Pitta (Fire and Water)',
    periodeFR: 'Du 21 juin au 21 septembre',
    periodeEN: 'June 21 to September 21',
    introFR:
      "La chaleur s'installe, le soleil tape et tout s'échauffe vite, la peau comme l'humeur. Pitta (Feu et Eau) domine. Le corps cherche la fraîcheur, la douceur et un peu d'ombre; ces essentiels l'aident à la trouver.",
    introEN:
      'The heat settles in, the sun beats down and everything warms up fast, the skin as much as the mood. Pitta (Fire and Water) leads. The body looks for coolness, softness and a little shade; these essentials help it find them.',
    vedette: {
      handle: 'huile-corporelle-rafraichissante-pitta',
      libelleFR: "L'huile de l'été",
      libelleEN: 'The oil of summer',
      pourquoiFR: 'Une huile qui rafraîchit et adoucit la peau que le soleil et Pitta (Feu et Eau) échauffent.',
      pourquoiEN: 'An oil that cools and softens the skin the sun and Pitta (Fire and Water) heat up.',
    },
    essentiels: [
      { handle: 'brume-apres-soleil-apaisante', pourquoiFR: 'Elle rafraîchit et apaise la peau lorsque la chaleur et Pitta (Feu et Eau) la font chauffer.', pourquoiEN: 'It cools and soothes the skin when heat and Pitta (Fire and Water) warm it up.' },
      { handle: 'brume-equilibrante-a-leau-de-neroli', pourquoiFR: 'Une bruine douce qui calme le feu du visage pendant la saison de Pitta (Feu et Eau).', pourquoiEN: 'A soft mist that calms the fire of the face during the Pitta (Fire and Water) season.' },
      { handle: 'repose-yeux-inspirata', pourquoiFR: "La lumière de l'été échauffe les yeux. Quelques minutes dans le noir les reposent et calment Pitta (Feu et Eau).", pourquoiEN: 'Summer light heats the eyes. A few minutes in the dark rests them and calms Pitta (Fire and Water).' },
      { handle: 'gratte-langue-cuivre', pourquoiFR: 'Un geste simple au réveil pour une bouche fraîche, que Pitta (Feu et Eau) apprécie lorsque la chaleur dure.', pourquoiEN: 'A simple gesture on waking for a fresh mouth, which Pitta (Fire and Water) welcomes when the heat lasts.' },
    ],
  },
};

/** Comment l'utiliser : un ou deux gestes concrets par produit, avec le moment de la journée. */
export const USAGES: Record<string, { FR: string; EN: string }> = {
  'huile-corporelle-apaisante-vata-3': {
    FR: "Chaque jour, et matin et soir si possible : à la sortie de la douche ou avant d'aller au lit, de 10 à 20 minutes de massage. Pressée ? La poitrine, les mains et les pieds.",
    EN: 'Every day, morning and evening if possible: out of the shower or before bed, 10 to 20 minutes of massage. In a hurry? The chest, the hands and the feet.',
  },
  'huile-corporelle-energisante-kapha': {
    FR: 'Le matin, à la sortie de la douche : un automassage vif et actif, des pieds vers le cœur, quelques minutes suffisent.',
    EN: 'In the morning, out of the shower: a brisk, active self-massage, from the feet toward the heart; a few minutes are enough.',
  },
  'huile-corporelle-rafraichissante-pitta': {
    FR: 'Trois fois par semaine environ, le soir à la sortie de la douche ou avant le coucher, avec des gestes lents et sans trop presser.',
    EN: 'About three times a week, in the evening out of the shower or before bed, with slow strokes and little pressure.',
  },
  'serum-visage-defripant': {
    FR: 'Le soir, une ou deux pompes sur le visage et le cou propres, en lissant du centre vers l’extérieur. Le matin aussi lorsque l’air est très sec.',
    EN: 'In the evening, one or two pumps on a clean face and neck, smoothing from the centre outward. In the morning too when the air is very dry.',
  },
  'huile-nasale-nez-zen': {
    FR: "Matin et soir, une goutte sur le bout du petit doigt, massée doucement à l'entrée de chaque narine.",
    EN: 'Morning and evening, one drop on the tip of the little finger, gently massaged at the entrance of each nostril.',
  },
  'repose-yeux-inspirata': {
    FR: 'Posé sur les yeux fermés, une dizaine de minutes en fin de journée ou au moment du coucher.',
    EN: 'Laid over closed eyes, ten minutes or so at the end of the day or at bedtime.',
  },
  'gratte-langue-cuivre': {
    FR: "Au lever, avant de boire ou de manger : de l'arrière vers l'avant de la langue, tout en douceur, de 4 à 7 fois en rinçant entre chaque passage.",
    EN: 'On waking, before drinking or eating: from the back to the front of the tongue, very gently, 4 to 7 times, rinsing between passes.',
  },
  'synergie-huiles-essentielles-d-stress': {
    FR: 'Quelques gouttes dans le diffuseur, le matin, dans la pièce où vous passez la journée.',
    EN: 'A few drops in the diffuser in the morning, in the room where you spend the day.',
  },
  'roll-on-d-stress': {
    FR: "Sur l'intérieur des poignets ou derrière la nuque, puis trois longues respirations. Aussi souvent que nécessaire dans la journée.",
    EN: 'On the inside of the wrists or behind the neck, then three long breaths. As often as needed through the day.',
  },
  'la-sportive': {
    FR: 'Après l’effort ou en fin de journée, massée sur les muscles qui ont travaillé.',
    EN: 'After exercise or at the end of the day, massaged into the muscles that worked.',
  },
  'brume-apres-soleil-apaisante': {
    FR: 'Après une journée au soleil, vaporisée sur la peau propre, aussi souvent que vous en avez envie.',
    EN: 'After a day in the sun, sprayed on clean skin, as often as you like.',
  },
  'brume-equilibrante-a-leau-de-neroli': {
    FR: "Au réveil, quelques vaporisations sur le visage, ou juste avant l'huile visage.",
    EN: 'On waking, a few sprays on the face, or just before the face oil.',
  },
};

/** La dominance de la saison à une date donnée, à l'heure de Montréal. */
export function doshaDeLaDate(date = new Date()): DoshaKey {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', month: 'numeric', day: 'numeric' }).formatToParts(date);
  const m = Number(parts.find(p => p.type === 'month')?.value);
  const j = Number(parts.find(p => p.type === 'day')?.value);
  if (m >= 10 || m === 1 || (m === 9 && j >= 22)) return 'vata';
  if (m < 6 || (m === 6 && j <= 20)) return 'kapha';
  return 'pitta';
}

/** La saison affichée. En aperçu seulement, ?saison=vata|pitta|kapha la force. */
export function saisonCourante(): SaisonBoutique {
  if (typeof window !== 'undefined' && modeApercu()) {
    const forcee = new URLSearchParams(window.location.search).get('saison');
    if (forcee === 'vata' || forcee === 'pitta' || forcee === 'kapha') return SAISONS[forcee];
  }
  return SAISONS[doshaDeLaDate()];
}

/** Ordre d'affichage des familles sous les essentiels (ids de collections.ts). */
export const ORDRE_FAMILLES = ['huiles-corporelles', 'visage-sens', 'serenite', 'solaires-saisons', 'rituels', 'bibliotheque'];
