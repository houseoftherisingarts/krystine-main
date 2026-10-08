// Les Dimanches d'Origine (décision de Krystine, 8 octobre 2026) : trois
// directs ouverts à toutes, sur inscription, à 9 h, heure du Québec. Chaque
// dimanche est aussi un document `liveEvents/{id}` (même identifiant, même
// étiquette), créé par scripts/dimanches/creer-evenements.mjs : c'est lui qui
// déclenche la confirmation, les rappels et la rediffusion. Une inscription
// porte les trois étiquettes, donc une seule suffit pour les trois dimanches.

export const SERIE_DIMANCHES = 'dimanches-origine';

export interface Dimanche {
  id: string;
  tag: string;
  mot: string;
  /** L'heure exacte, 9 h à Montréal (UTC−4 avant le 1er novembre, UTC−5 ensuite). */
  iso: string;
  titre: string;
  ligne: string;
}

export const DIMANCHES: Dimanche[] = [
  { id: 'dimanche-origine-lire', tag: 'dimanche-origine-lire', mot: 'LIRE', iso: '2026-10-25T13:00:00Z',
    titre: 'Ce que le corps essaie de dire', ligne: 'Apprendre à voir ce qui circule en soi, avant de vouloir changer quoi que ce soit.' },
  { id: 'dimanche-origine-trier', tag: 'dimanche-origine-trier', mot: 'TRIER', iso: '2026-11-01T14:00:00Z',
    titre: 'Ce qui vous appartient vraiment', ligne: 'Retrouver ses propres repères, distinguer ce qui nourrit de ce qui encombre.' },
  { id: 'dimanche-origine-ancrer', tag: 'dimanche-origine-ancrer', mot: 'ANCRER', iso: '2026-11-08T14:00:00Z',
    titre: 'Ce qui tient dans la durée', ligne: 'Installer les gestes, les rythmes et les choix qui soutiennent au quotidien.' },
];

/** Les étiquettes posées à l'inscription : la série et chacun des trois directs. */
export const ETIQUETTES_DIMANCHES = [SERIE_DIMANCHES, ...DIMANCHES.map(d => d.tag)];

/** Le lien personnel qu'une inscrite transmet à une amie. La provenance du
 *  site (src/lib/provenance.ts) le lit : source « amie », campagne
 *  « dimanches », contenu = la fiche de l'inscrite (en minuscules). */
export const lienAmie = (abonneId: string) =>
  `https://www.krystinestlaurent.ca/dimanches?via=amie&utm_campaign=dimanches&utm_content=${encodeURIComponent(abonneId.toLowerCase())}`;
