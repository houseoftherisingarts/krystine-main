// Vata / Pitta / Kapha ritual recommendations.
// ─────────────────────────────────────────────────────────────────────────────
// Transcribed from Krystine's "Guide Rituels Inspirata Ayurveda — Partie 1".
// Used on the quiz result screen AND in the client-portal Dosha tab so the
// member can return to their ritual at any time (and export it as a PDF).

export type DoshaName = 'Vata' | 'Pitta' | 'Kapha';

export interface Ritual {
  titleFR: string;    titleEN: string;
  subtitleFR: string; subtitleEN: string;
  momentFR: string;   momentEN: string;
  stepsFR: string[];  stepsEN: string[];
  accent: string; // dosha accent color, used across UI cards + the PDF header
}

export const RITUALS: Record<DoshaName, Ritual> = {
  Vata: {
    titleFR: 'Rituel du soir',
    titleEN: 'Evening ritual',
    subtitleFR: "Automassage apaisant à l'Huile Corporelle Apaisante VATA",
    subtitleEN: 'Soothing self-massage with the Soothing Vata Body Oil',
    momentFR: 'Le soir, avant le coucher',
    momentEN: 'Evening, before bed',
    stepsFR: [
      "Avant de vous coucher, prenez un moment pour un automassage des plus relaxants.",
      "Prenez une pompe de l'Huile Corporelle Apaisante VATA et massez vos avant-bras et vos jambes.",
      "Laissez vos muscles se détendre et sentez votre esprit se bercer, porté par les douces odeurs de lavande et de mélisse.",
    ],
    stepsEN: [
      'Before bed, take a moment for a deeply relaxing self-massage.',
      'Take a pump of the Soothing Vata Body Oil and massage your forearms and legs.',
      'Let your muscles soften and your mind drift into the gentle scents of lavender and lemon balm.',
    ],
    accent: '#8F9779',
  },
  Pitta: {
    titleFR: 'Rituel matinal',
    titleEN: 'Morning ritual',
    subtitleFR: "Automassage rafraîchissant à l'Huile Corporelle Rafraîchissante PITTA",
    subtitleEN: 'Cooling self-massage with the Refreshing Pitta Body Oil',
    momentFR: 'Le matin, sous la douche',
    momentEN: 'Morning, in the shower',
    stepsFR: [
      "Durant la douche matinale à l'eau fraîche, une fois le corps lavé, déposez une petite quantité d'Huile Corporelle Rafraîchissante PITTA et mélangez-la à l'eau pour un massage frais et tonifiant.",
      "Prenez le temps de masser pour bien faire pénétrer l'huile.",
      "Sortez ensuite de la douche et épongez, ou rincez à l'eau un peu plus froide pour un effet rafraîchissant.",
      "Environ 10 minutes plus tard, la peau aura absorbé l'huile et vous pourrez vous habiller sans risquer de tâcher vos vêtements.",
    ],
    stepsEN: [
      'During a cool morning shower, once your body is washed, apply a small amount of the Refreshing Pitta Body Oil and blend it with the water for a fresh, tonifying massage.',
      'Take your time to massage so the oil penetrates.',
      'Step out and pat dry, or rinse with slightly cooler water for an even fresher finish.',
      'About 10 minutes later, the skin will have absorbed the oil and you can dress without staining your clothes.',
    ],
    accent: '#BC4A3C',
  },
  Kapha: {
    titleFR: 'Rituel matinal',
    titleEN: 'Morning ritual',
    subtitleFR: "Automassage vigoureux à l'Huile Corporelle Énergisante KAPHA",
    subtitleEN: 'Vigorous self-massage with the Energizing Kapha Body Oil',
    momentFR: 'Le matin, après le brossage à sec et la douche',
    momentEN: 'Morning, after dry brushing and showering',
    stepsFR: [
      "Commencez par le brossage à sec avant la douche (environ 3 fois par semaine).",
      "Après la douche, le corps encore enduit d'eau et les pores ouverts, prenez une petite quantité d'Huile Corporelle Énergisante KAPHA et massez les bras, la poitrine et le ventre avec des mouvements vigoureux pour activer la circulation.",
      "Reprenez un peu d'huile au besoin et massez sous les aisselles en levant le bras, avec des mouvements dirigés vers le coeur.",
      "Massez le contour des seins et de la poitrine, idem pour le ventre.",
      "Environ 10 minutes plus tard, la peau aura absorbé l'huile et vous pourrez vous habiller.",
    ],
    stepsEN: [
      'Start with dry brushing before your shower (about three times a week).',
      'After showering, while the body is still damp and pores are open, take a small amount of the Energizing Kapha Body Oil and massage arms, chest and belly with vigorous strokes to wake circulation.',
      'Reapply as needed and massage under the arms, raising the arm and sweeping strokes toward the heart.',
      'Massage around the chest and belly.',
      'About 10 minutes later, the skin will have absorbed the oil and you can dress.',
    ],
    accent: '#4A7C9D',
  },
};

export function ritualForDosha(name: string): Ritual | undefined {
  // Accept any casing / trailing whitespace from upstream data.
  const key = (name || '').trim();
  const canonical = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  return (RITUALS as Record<string, Ritual>)[canonical];
}
