// Le moteur d'offres : à partir de la fiche d'une membre, de ses habitudes de
// navigation et de ce qu'elle possède déjà, calcule l'UNE offre qui lui revient.
//
// Fonction pure, sans Firestore ni réseau : offrePour() ne lit et n'écrit
// rien elle-même, pour rester lisible d'un coup d'œil et vérifiable par
// offres.test.mjs sans base de données. C'est le composant appelant (par
// exemple OffrePersonnalisee.tsx) qui rassemble le contexte et écrit le
// résultat dans habitudes/{uid}.offre.
//
// L'ORDRE DES RÈGLES NE SE NÉGOCIE PAS (Alex, 10 septembre 2026) : la
// première qui s'applique gagne, et une offre ne se propose jamais pour ce
// que la personne possède déjà.

/** Une formation telle que la rend getFormationsPubliees() : de quoi lire un
 *  dosha ou un prix réel sans jamais coder un identifiant en dur. */
export interface FormationCatalogue {
  id: string;
  titre: string;
  statut: 'masque' | 'publie';
  prix: number | null;
  lienFiche?: string;
}

/** Une formation déjà possédée, telle que la rend getMesFormations(). */
export interface FormationPossedee {
  id: string;
  titre: string;
}

export interface ContexteOffre {
  /** Le dosha dominant choisi au quiz (MemberDoc.dosha), tel quel. */
  dosha?: string;
  /** L'ouverture du compte (MemberDoc.joinedAt), en millisecondes. */
  joinedAtMs?: number;
  /** L'instant du calcul; par défaut Date.now(), à fixer dans les tests. */
  maintenantMs?: number;
  /** Les pages ouvertes par grande famille (Habitudes.familles). */
  familles: Record<string, number>;
  /** Les formations publiées, pour lire un dosha plutôt que deviner un identifiant. */
  formationsPubliees: FormationCatalogue[];
  /** Les formations déjà possédées : jamais proposer ce qu'elle a déjà. */
  formationsPossedees: FormationPossedee[];
  /** Vrai si une commande du site existe déjà pour cette personne (clientOrders). */
  aCommandeBoutique: boolean;
}

export interface Offre {
  id: string;
  intertitre: string;
  titre: string;
  texte: string;
  bouton: string;
  destination: string;
}

const JOUR_MS = 24 * 60 * 60 * 1000;
const SEUIL_VISITES = 3;

// Le programme Vata correspond à cette formation précise (kajabi-2148687644,
// migration Kajabi du 28 août 2026) : c'est l'exemple qu'Alex a donné, avec
// sa propre page de vente /vata plutôt que la fiche /cours générique.
const FORMATION_VATA_ID = 'kajabi-2148687644';
const DESTINATION_VATA = '/vata';

const normaliser = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const contient = (texte: string, mot: string): boolean => normaliser(texte).includes(normaliser(mot));

/** Une phrase de prix, seulement quand il vient vraiment de la fiche formation. */
function phrasePrix(prix: number | null | undefined): string {
  return typeof prix === 'number' ? ` Elle se donne à ${prix} $, en un seul palier.` : '';
}

function possedeVata(possedees: FormationPossedee[]): boolean {
  return possedees.some((f) => f.id === FORMATION_VATA_ID);
}

/** Vrai si l'une des formations possédées appartient à cette famille (par son titre). */
function possedeFormationNommee(possedees: FormationPossedee[], mots: string[]): boolean {
  return possedees.some((f) => mots.some((mot) => contient(f.titre, mot)));
}

/** Une formation publiée, pas encore possédée, dont le titre porte le dosha. */
function formationPourDosha(dosha: string, publiees: FormationCatalogue[], possedees: FormationPossedee[]): FormationCatalogue | null {
  const idsPossedes = new Set(possedees.map((f) => f.id));
  return publiees.find((f) => f.statut === 'publie' && !idsPossedes.has(f.id) && contient(f.titre, dosha)) || null;
}

const TEXTES_DOSHA: Record<string, string> = {
  pitta: "Votre quiz vous place du côté de Pitta, le dosha du feu et de la précision. Cette formation reprend les rituels qui rafraîchissent et adoucissent ce tempérament, pour tempérer la chaleur sans l'éteindre.",
  kapha: "Votre quiz vous place du côté de Kapha, le dosha de la terre et de l'eau. Cette formation reprend les rituels qui allègent et activent ce tempérament, pour retrouver du mouvement sans brusquer le corps.",
};

export function offrePour(ctx: ContexteOffre): Offre {
  const maintenant = ctx.maintenantMs ?? Date.now();
  const dosha = ctx.dosha ? normaliser(ctx.dosha) : '';
  const familles = ctx.familles || {};

  // a) Son dosha est Vata et elle n'a pas encore le programme.
  if (dosha === 'vata' && !possedeVata(ctx.formationsPossedees)) {
    const formation = ctx.formationsPubliees.find((f) => f.id === FORMATION_VATA_ID) || null;
    return {
      id: 'dosha-vata',
      intertitre: 'Ce qui vous ressemble',
      titre: 'Le Programme Vata, pensé pour vous',
      texte: `Votre quiz vous place du côté de Vata, le dosha du mouvement et de l'air. Ce programme reprend les rituels qui ancrent et réchauffent ce tempérament, avec les leçons audio et les guides de Krystine pour les suivre à votre rythme.${phrasePrix(formation?.prix)}`,
      bouton: 'Découvrir le Programme Vata',
      destination: DESTINATION_VATA,
    };
  }

  // b) Son dosha est Pitta ou Kapha et une formation publiée lui correspond
  // déjà : lue dans la collection plutôt que codée en dur, puisqu'aucun
  // identifiant fixe n'existe encore pour ces deux-là.
  if (dosha === 'pitta' || dosha === 'kapha') {
    const formation = formationPourDosha(dosha, ctx.formationsPubliees, ctx.formationsPossedees);
    if (formation) {
      return {
        id: `dosha-${dosha}`,
        intertitre: 'Ce qui vous ressemble',
        titre: `${formation.titre}, pensé pour vous`,
        texte: `${TEXTES_DOSHA[dosha]}${phrasePrix(formation.prix)}`,
        bouton: `Découvrir ${formation.titre}`,
        destination: formation.lienFiche || `/cours/${formation.id}`,
      };
    }
  }

  // c) La famille Origine ouverte trois fois, sans qu'elle possède quoi que
  // ce soit de ce côté (Foyer ou Expérience Origine).
  if ((familles['Origine'] || 0) >= SEUIL_VISITES && !possedeFormationNommee(ctx.formationsPossedees, ['origine', 'foyer'])) {
    return {
      id: 'origine',
      intertitre: 'Ce qui vous ramène ici',
      titre: "L'Expérience Origine vous attend",
      texte: "Vous revenez souvent du côté d'Origine. Ce parcours de douze semaines reprend, avec Krystine, ce que vous êtes déjà venue chercher : lire, trier et retrouver ses propres repères.",
      bouton: "Découvrir l'Expérience Origine",
      destination: '/origine',
    };
  }

  // d) La famille Boutique ouverte trois fois, sans aucune commande du site.
  if ((familles['Boutique'] || 0) >= SEUIL_VISITES && !ctx.aCommandeBoutique) {
    return {
      id: 'boutique',
      intertitre: 'Ce qui vous ramène ici',
      titre: "Un coup d'œil sur la boutique",
      texte: "La boutique vous a déjà arrêtée plus d'une fois. Les huiles et les rituels de Krystine s'y trouvent, prêts à commander quand le moment sera le vôtre.",
      bouton: 'Aller à la boutique',
      destination: '/boutique',
    };
  }

  // e) La famille Podcast et médias ouverte trois fois.
  if ((familles['Podcast et médias'] || 0) >= SEUIL_VISITES) {
    return {
      id: 'podcast',
      intertitre: 'Ce qui vous ramène ici',
      titre: 'Les rediffusions vous attendent',
      texte: 'Vous revenez souvent écouter Krystine. Les rediffusions de « Santé ! La Vie ! » et les saisons complètes se retrouvent au même endroit, pour continuer où vous en étiez.',
      bouton: 'Écouter les rediffusions',
      destination: '/podcast',
    };
  }

  // f) Un compte de moins de sept jours : le coffre de bienvenue, comme aujourd'hui.
  if (typeof ctx.joinedAtMs === 'number' && maintenant - ctx.joinedAtMs < 7 * JOUR_MS) {
    return {
      id: 'bienvenue',
      intertitre: 'Bienvenue chez vous',
      titre: 'Votre coffre de bienvenue vous attend',
      texte: "Votre compte vient tout juste de s'ouvrir. Le coffre de bienvenue et les premiers repères du site se trouvent dans votre espace, prêts à être découverts à votre rythme.",
      bouton: 'Ouvrir mon espace',
      destination: '/compte',
    };
  }

  // g) Rien de tout cela : une offre douce, sans pression ni compte à
  // rebours inventé. L'Expérience Origine 2 est une vraie liste d'attente
  // décidée par Krystine (aucun prix : le champ reste vide tant qu'elle
  // n'en fixe pas un).
  return {
    id: 'origine2',
    intertitre: 'Ce qui se prépare pour vous',
    titre: "L'Expérience Origine 2 ouvre en janvier",
    texte: 'Douze semaines avec Krystine pour retrouver vos propres repères. Inscrivez-vous à la liste d’attente et vous recevrez l’invitation avant toute annonce publique.',
    bouton: "Découvrir l'Expérience",
    destination: '/origine-2',
  };
}
