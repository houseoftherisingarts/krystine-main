// Le plan du mois de Krystine, du 22 septembre au 22 octobre 2026 : trois
// chantiers dictés par Alex le 22 septembre, découpés en étapes qui se cochent
// à mesure. Ce fichier ne porte que le texte; l'état coché, les dates et les
// notes vivent dans Firestore (planAutomne/mois-2026-10), pour que Krystine
// et Alex cochent depuis n'importe où sans qu'on touche au code.
//
// Les identifiants sont stables et ne se renomment jamais une fois en ligne :
// c'est par eux que Firestore retrouve une case cochée. c2.f3 est la troisième
// étape du bloc F du deuxième chantier.
//
// Les repères sous les étapes viennent d'une recherche faite le 22 septembre
// 2026 (pages officielles lues, prix croisés, chaque affirmation repassée par
// un vérificateur). Un prix change vite : la date compte.
//
// Aucun tiret cadratin, rien en italique : c'est la règle de la maison.

/** Qui fait le geste. « Ensemble » veut dire une décision à deux. */
export type Qui = 'Krystine' | 'Alex' | 'Ensemble';

/** Une référence cliquable sous l'étape : la vidéo, le dépôt ou la page d'où vient l'idée. */
export interface Lien {
  texte: string;
  url: string;
}

export interface Etape {
  id: string;
  texte: string;
  qui: Qui;
  /** Un fait vérifié, un chiffre, une source : ce qu'il faut savoir pour faire le geste. */
  repere?: string;
  /** Les références, ouvertes dans un nouvel onglet. */
  liens?: Lien[];
}

export interface Bloc {
  lettre: string;
  titre: string;
  etapes: Etape[];
}

export interface ChantierMois {
  id: string;
  numero: 1 | 2 | 3;
  titre: string;
  sousTitre: string;
  /** Une phrase qui dit pourquoi ce chantier existe. */
  devise: string;
  icone: string;
  objectifs: string[];
  blocs: Bloc[];
  couleurs: {
    /** Le bandeau de tête et de pied, le rond du numéro, les cases. */
    accent: string;
    /** L'accent en version texte, assez foncé pour se lire sur le tint. */
    encre: string;
    /** Le fond des blocs, qui reçoit le texte en encre. */
    tint: string;
    /** Le contour. */
    bord: string;
  };
}

export const ENTETE = {
  marque: 'Krystine St-Laurent',
  titre: 'Le plan du mois',
  periode: 'Du 22 septembre au 22 octobre 2026',
  intro: "Trois chantiers pour les trente prochains jours, posés par Alex le 22 septembre et découpés ici en gestes à cocher à mesure. Chaque étape dit qui la fait, parce que la plupart se font dans le code pendant que quelques-unes, décisives, vous attendent : déposer vos livres, relire un contrat, enregistrer votre voix, dire oui devant un aperçu. Sous plusieurs étapes, une ligne de repère donne le chiffre ou la règle qui a été vérifiée le 22 septembre. Quand une case se coche, la date s'écrit toute seule, et une note d'une ligne peut s'ajouter dessous pour garder ce qui s'est passé.",
};

export const CHANTIERS: ChantierMois[] = [
  {
    id: 'c1',
    numero: 1,
    titre: "L'Expérience Origine",
    sousTitre: 'Le visuel de la page de vente, refait pour la cliente',
    devise: "La page qui vend Origine doit ressembler à ce que le reste du site est devenu : crème, encre et laiton, des titres qui respirent, et rien qui cache rien.",
    icone: 'fa-seedling',
    objectifs: [
      'La page /origine au canon magazine crème, sur ordinateur comme sur téléphone.',
      'Un aperçu que vous approuvez avant qu\'il remplace la page actuelle.',
      'Le câblage reste intact : la liste d\'attente et l\'achat fonctionnent encore, l\'extrait audio se lit et les deux langues répondent.',
    ],
    couleurs: { accent: '#9c7a44', encre: '#7d6330', tint: '#faf6ee', bord: '#e6dcc8' },
    blocs: [
      {
        lettre: 'A',
        titre: 'Ce que l\'audit du 22 septembre a relevé',
        etapes: [
          { id: 'c1.a1', qui: 'Alex', texte: "Refermer le bandeau des témoins (« En toute transparence ») : il reste figé sur toute la hauteur de la page, cache le bouton « Rejoindre la liste d'attente » et celui de la création de compte sur ordinateur, et mange près d'un cinquième de l'écran sur téléphone.", repere: "Vu sur 32 captures de la page en ligne, 13 à 1440 de large et 19 à 390. La correction : une bande d'une ligne au bas de l'écran, qui se referme seule après le premier défilement." },
          { id: 'c1.a2', qui: 'Alex', texte: "Donner une icône au bouton du compte sur téléphone : entre le panier et le sélecteur FR, il s'affiche comme un cercle doré vide, sans rien qui dise à quoi il sert." },
          { id: 'c1.a3', qui: 'Alex', texte: "Remonter les quatre liens du menu principal de 10,9 px à 13 ou 14 px sans toucher à l'espacement des lettres." },
          { id: 'c1.a4', qui: 'Alex', texte: "Compléter la grille « Ce qui est inclus » : la liste de musique à 432 Hz se retrouve seule en bas de la colonne de gauche, avec un grand vide à sa droite." },
          { id: 'c1.a5', qui: 'Alex', texte: "Ramener les titres et le pied de page au canon : les titres roulent encore sur Cormorant Garamond au lieu de Fraunces, et le pied tombe dans un brun-noir presque plat (#16100A) au lieu du brun chaud (#34241a) du reste du site.", repere: "Le corps en Inter, l'encre #1c1712 et le fond crème #f4efe6 collent déjà au canon; il n'y a que les titres et le pied à reprendre." },
          { id: 'c1.a6', qui: 'Krystine', texte: "Noter ce que vous tenez à garder tel quel (le grimoire, la musique, la ligne du temps des douze semaines, l'objet-lettre du hero avec son cachet de cire) et ce qui vous a toujours agacée sur cette page." },
        ],
      },
      {
        lettre: 'B',
        titre: 'Décider la direction',
        etapes: [
          { id: 'c1.b1', qui: 'Ensemble', texte: "Choisir, devant la liste des fautes, entre polir la page actuelle et la rebâtir section par section sur le canon magazine crème.", repere: "Les fautes relevées sont toutes de finition, aucune de structure : le polissage suffit si la pile de feuilles crème qui glissent au défilement vous plaît encore." },
          { id: 'c1.b2', qui: 'Alex', texte: "Écrire le plan de style d'une page : l'ordre des sections, une photo par section, des titres de deux lignes au plus, une seule couleur d'accent." },
          { id: 'c1.b3', qui: 'Krystine', texte: "Choisir les photos et les vidéos qui porteront la page, dans la médiathèque ou à fournir : le sentier, vous en séance, le grimoire ouvert." },
        ],
      },
      {
        lettre: 'C',
        titre: 'Bâtir',
        etapes: [
          { id: 'c1.c1', qui: 'Alex', texte: "Refaire l'entrée en matière : un préchargeur d'une seconde qui se fond dans un hero plein écran, puis un premier défilement qui allume la scène." },
          { id: 'c1.c2', qui: 'Alex', texte: "Reprendre chaque section au canon : crème et encre, laiton en seul accent, filets pleine largeur, aucune italique, aucun titre posé sur un rectangle de couleur." },
          { id: 'c1.c3', qui: 'Alex', texte: "Rendre la grille des douze semaines, le tarif et la FAQ lisibles sur téléphone, d'un seul défilement vers le bas." },
          { id: 'c1.c4', qui: 'Alex', texte: "Garder le câblage tel quel : la liste d'attente, l'achat Stripe quand l'interrupteur s'ouvre, l'extrait audio, le français et l'anglais." },
        ],
      },
      {
        lettre: 'D',
        titre: 'Vérifier et livrer',
        etapes: [
          { id: 'c1.d1', qui: 'Alex', texte: "Faire tourner la boucle de vérification : captures à 1440 et 390, verdict d'un vérificateur indépendant, corrections, jusqu'à zéro faute en trois tours au plus." },
          { id: 'c1.d2', qui: 'Alex', texte: "Publier la nouvelle page sur un canal d'aperçu et vous envoyer l'adresse, sans toucher à la page en ligne." },
          { id: 'c1.d3', qui: 'Krystine', texte: "Regarder l'aperçu sur votre ordinateur et sur votre téléphone, puis dire oui, ou dire ce qui cloche." },
          { id: 'c1.d4', qui: 'Alex', texte: "Mettre la page en ligne à la place de l'actuelle et l'inscrire au Journal des changements." },
        ],
      },
    ],
  },
  {
    id: 'c2',
    numero: 2,
    titre: 'Les petits livres à 10 $',
    sousTitre: 'Vos trois livres deviennent une collection en anglais, vendue aux États-Unis',
    devise: "Chaque livre porte plusieurs petits livres qui se tiennent seuls, traduits en anglais, habillés d'un visuel neuf, vendus dix dollars américains et poussés par des vidéos que l'intelligence artificielle joue pour vous.",
    icone: 'fa-book-open',
    objectifs: [
      'Les trois livres déposés ici, en PDF, pour qu\'Alex les lise depuis le code.',
      'Les droits vérifiés avant la première coupe.',
      'La collection en vente en dollars américains, avec sa première vidéo en ligne et un premier achat aux États-Unis, avant le 22 octobre.',
    ],
    couleurs: { accent: '#b4533a', encre: '#8f3d29', tint: '#f7e9e2', bord: '#e9c9bd' },
    blocs: [
      {
        lettre: 'A',
        titre: 'Vos livres, entre nos mains',
        etapes: [
          { id: 'c2.a1', qui: 'Krystine', texte: "Déposer les trois livres en PDF avec les trois boutons ci-dessus, l'un après l'autre : le nom du fichier s'affiche sous le bouton quand il est arrivé." },
          { id: 'c2.a2', qui: 'Alex', texte: "Récupérer les trois PDF depuis le code, en extraire le texte chapitre par chapitre et le ranger dans le coffre du projet." },
        ],
      },
      {
        lettre: 'B',
        titre: 'Les droits, avant la première coupe',
        etapes: [
          { id: 'c2.b1', qui: 'Krystine', texte: "Retrouver le contrat signé pour chacun des trois livres et y lire sept clauses : la traduction anglaise, les droits numériques séparés de l'imprimé, les extraits et versions abrégées, le territoire cédé, la durée et le retour des droits, le droit de préférence sur vos prochains livres, et les droits moraux.", repere: "Au Canada, aucune loi ne rend les droits à l'auteure d'elle-même : tout dépend de ce que le contrat dit. L'UNEQ offre à ses membres une heure de consultation juridique gratuite par année pour relire un contrat." },
          { id: 'c2.b2', qui: 'Krystine', texte: "Si l'éditeur détient la traduction ou le numérique, lui demander par écrit une licence ou une rétrocession pour l'anglais et le numérique aux États-Unis (Alex rédige la lettre, vous la signez).", repere: "Une licence ponctuelle pour un format et une langue se négocie souvent sans reprendre l'ensemble des droits." },
          { id: 'c2.b3', qui: 'Alex', texte: "Écrire noir sur blanc ce qui se réutilise (votre texte, votre nom, vos titres) et ce qui reste à l'éditeur ou au graphiste (l'illustration de couverture, la maquette, la police), pour que la collection ne copie rien.", repere: "La couverture est une œuvre à part, propriété de l'illustrateur ou de l'éditeur selon leur propre contrat. Le droit d'auteur protège la forme, jamais l'idée : le thème, une palette, une ambiance restent libres; la composition, les éléments graphiques et la disposition exacte ne le sont pas." },
          { id: 'c2.b4', qui: 'Krystine', texte: "Confirmer l'éditeur et l'année de chacun des trois livres, et vérifier que le titre de la trilogie n'a pas été déposé comme marque de commerce par l'éditeur." },
        ],
      },
      {
        lettre: 'C',
        titre: 'Analyser et découper',
        etapes: [
          { id: 'c2.c1', qui: 'Alex', texte: "Lire les trois livres en entier et proposer le découpage : un petit livre par thème qui se tient seul (le sommeil, la digestion, la ménopause, les rituels du matin, chaque saison), trois titres ou plus par livre, avec pour chacun sa table des matières et ses pages d'origine.", repere: "Un mini-livre fait entre 5 000 et 10 000 mots. Amazon exige au moins 24 pages : viser 25 à 30 pages par titre pour passer partout." },
          { id: 'c2.c2', qui: 'Krystine', texte: "Valider le découpage, les titres anglais et l'ordre de sortie, en commençant par le titre qui répond au problème le plus fréquent chez vos lectrices." },
          { id: 'c2.c3', qui: 'Ensemble', texte: "Fixer la collection : son nom, sa numérotation, et la catégorie « Ayurveda » partout où les livres seront vendus.", repere: "Une série de petits titres complémentaires, chacun une porte d'entrée à bas prix, puis un ensemble complet à prix groupé : c'est la mécanique qui fait vivre ce format." },
        ],
      },
      {
        lettre: 'D',
        titre: 'Traduire et mettre en forme',
        etapes: [
          { id: 'c2.d1', qui: 'Alex', texte: "Traduire chaque petit livre en anglais américain, dans votre voix, par intelligence artificielle d'abord puis relecture humaine, en gardant vos mots sanskrits et vos exemples d'ici.", repere: "Amazon KDP exige de déclarer une traduction faite par IA comme « AI-generated », même lourdement retouchée; Apple demande la mention « AI Generated by »; Kobo refuse ce qui est produit surtout par la machine sans vrai travail humain. La relecture se documente donc, page par page." },
          { id: 'c2.d2', qui: 'Krystine', texte: "Relire l'anglais du premier titre et signer la voix : ce que vous ne diriez jamais, ce qui manque, ce qui sonne faux.", repere: "Aux États-Unis, seule la part humaine d'une œuvre se protège par le droit d'auteur (la Cour suprême l'a laissé tel quel le 2 mars 2026). Votre relecture est aussi ce qui protège le texte." },
          { id: 'c2.d3', qui: 'Alex', texte: "Mettre en page en EPUB d'abord, et en PDF pour la boutique, intérieur simple et lisible sur téléphone, avec un avant-propos, une page « à propos de l'auteure » qui mène à votre site, et une invitation vers le titre suivant.", repere: "L'EPUB se reformate sur chaque écran et c'est le format attendu par Kobo, Apple et les liseuses; le PDF garde une mise en page fixe, bon pour un contenu visuel vendu sur votre Shopify." },
        ],
      },
      {
        lettre: 'E',
        titre: 'Le visuel, semblable sans copier',
        etapes: [
          { id: 'c2.e1', qui: 'Alex', texte: "Définir la direction de couverture de la collection : le même esprit botanique que vos livres, mais une illustration, une maquette et une police neuves, sur une grille commune qui distingue chaque titre par sa couleur." },
          { id: 'c2.e2', qui: 'Alex', texte: "Générer et retoucher les couvertures, une par titre, lisibles en vignette de la taille d'un pouce, aux dimensions demandées par les boutiques.", repere: "Amazon demande 1600 × 2560 px, en JPEG et en RVB, à 300 points par pouce. Une image brute sortie d'une IA ne se protège pas : la direction, le choix et les retouches humaines se gardent en preuve." },
          { id: 'c2.e3', qui: 'Krystine', texte: "Choisir la couverture définitive de chaque titre." },
        ],
      },
      {
        lettre: 'F',
        titre: 'Mettre en vente aux États-Unis',
        etapes: [
          { id: 'c2.f1', qui: 'Ensemble', texte: "Vendre sur votre Shopify, déjà en place, avec l'application de livraison numérique et le règlement en dollars américains, puis poser la collection sur Amazon, Kobo et Apple Books pour la portée.", repere: "Les plateformes qui encaissent et gèrent les taxes américaines à votre place (Gumroad à 10 % + 0,50 $ par vente, Lemon Squeezy à 5 % + 0,50 $, Stripe Managed Payments) ne deviennent utiles qu'au-delà de 100 000 $ US de ventes dans un même État sur douze mois. À 10 $ le livre, ce seuil est loin." },
          { id: 'c2.f2', qui: 'Alex', texte: "Créer dans la catégorie Ayurveda une fiche produit en anglais par livre avec son prix de 10 $ US et son extrait à lire et sa couverture, puis bâtir la page de la collection." },
          { id: 'c2.f3', qui: 'Alex', texte: "Régler la livraison automatique du fichier après paiement, tester un achat complet en mode test, puis faire un vrai achat à 10 $ et recevoir le livre." },
          { id: 'c2.f4', qui: 'Alex', texte: "Régler les taxes avec votre comptable : la TPS et la TVQ sur un livre numérique vendu à une Américaine, le formulaire W-8BEN que demandent Amazon, Apple et Kobo à une vendeuse canadienne, et les frais de conversion de Shopify.", repere: "Un bien numérique exporté ne suit pas la même règle que la marchandise : la page de Revenu Québec était inaccessible le 22 septembre, la question reste à trancher avec le comptable. Shopify prend 1,5 % de conversion quand la devise payée diffère de la devise de règlement." },
          { id: 'c2.f5', qui: 'Alex', texte: "Publier sur Amazon KDP à 10,00 $ US pile, si les droits le permettent, parce que c'est là que les Américaines cherchent un livre; cocher la case du contenu généré par IA pour la traduction.", repere: "Depuis le 7 juillet 2026 la redevance de 70 % d'Amazon monte jusqu'à 12,99 $ US et 10 $ y donne donc la pleine part une fois retirés 0,15 $ par Mo livré. Kobo verse 70 % entre 2,99 $ et 12,99 $ et Apple verse 70 % quel que soit le prix." },
        ],
      },
      {
        lettre: 'G',
        titre: "Les vidéos UGC jouées par l'IA",
        etapes: [
          { id: 'c2.g1', qui: 'Alex', texte: "Écrire les scripts de quinze à trente secondes : une femme parle du livre comme d'une découverte, nomme le problème dans les deux premières secondes, montre un geste, dit le prix." },
          { id: 'c2.g2', qui: 'Alex', texte: "Générer les vidéos avec HeyGen d'abord (le meilleur rapport prix-souplesse pour tester plusieurs accroches), puis Higgsfield ou Runway pour les plans de coupe : trois variantes par titre, format vertical, sous-titres en anglais, une actrice différente par variante.", repere: "HeyGen Creator 29 $ US par mois pour 600 crédits et plus de 1 100 avatars; Creatify gratuit à l'essai puis 39 $; Captions 9,99 $; Arcads 110 $ par mois sans essai. Higgsfield Starter 19 $ et Runway Standard 12 $ (avec Veo 3.1 et Kling). L'API de Sora ferme le 24 septembre 2026, alors rien ne se bâtit dessus. Si le quota HeyGen déborde, l'avatar open source LongCat du chantier 3 se loue à la seconde chez WaveSpeedAI, 2,40 $ US le clip de trente secondes en 720p.", liens: [{ texte: "La vidéo d'IA Boss sur l'avatar open source", url: 'https://www.facebook.com/watch/?v=1660359075507785' }, { texte: 'LongCat chez WaveSpeedAI', url: 'https://wavespeed.ai/models/wavespeed-ai/longcat-avatar' }] },
          { id: 'c2.g3', qui: 'Krystine', texte: "Regarder les premières vidéos et garder celles qui sonnent vrai." },
          { id: 'c2.g4', qui: 'Alex', texte: "Poser la mention de contenu synthétique là où la plateforme l'exige, et ne jamais faire dire à l'actrice qu'elle a lu le livre.", repere: "La FTC applique aux acteurs IA les mêmes règles qu'aux vrais témoignages : une divulgation claire, tôt dans la vidéo, en langage simple." },
        ],
      },
      {
        lettre: 'H',
        titre: 'Lancer et mesurer',
        etapes: [
          { id: 'c2.h1', qui: 'Alex', texte: "Ouvrir le compte publicitaire Meta (Instagram et Facebook Reels) qui cible les États-Unis, les femmes de 40 à 65 ans et le bien-être, poser le pixel et le suivi des achats sur la boutique, puis TikTok en second.", repere: "TikTok Shop n'accepte pas les livres numériques aux États-Unis (catégorie sur invitation seulement) : une pub TikTok renvoie vers la fiche Shopify. Les Reels coûtent autour de 4 $ US le mille, et Pinterest parle aux femmes de 35 à 65 ans en découverte lente." },
          { id: 'c2.h2', qui: 'Alex', texte: "Lancer un test de 300 à 500 $ US sur une semaine par canal, une vidéo par titre, sans toucher aux réglages avant la fin.", repere: "Un achat en commerce en ligne coûte en moyenne près de 30 $ US de publicité : à 10 $ le livre, la pub doit vendre la collection ou l'ensemble, pas un titre seul." },
          { id: 'c2.h3', qui: 'Ensemble', texte: "Lire les chiffres à la fin de la semaine (coût par achat, titre qui vend, vidéo qui retient), garder ce qui marche et couper le reste." },
          { id: 'c2.h4', qui: 'Krystine', texte: "Approuver l'infolettre de lancement en anglais, écrite par Alex pour vos abonnées anglophones, avant qu'elle parte." },
        ],
      },
    ],
  },
  {
    id: 'c3',
    numero: 3,
    titre: 'Le clone IA et la chaîne YouTube',
    sousTitre: 'Une chaîne sans visage qui publie chaque jour, dans votre voix, sans vous',
    devise: "Votre savoir et votre voix entrent dans une machine qui écrit, dit, monte et publie un épisode par jour pendant que vous écrivez le tome 3.",
    icone: 'fa-tower-broadcast',
    objectifs: [
      'La niche et ses cinq sous-niches posées, avec cinq mois de sujets en réserve.',
      'Votre voix clonée, écoutée et approuvée par vous.',
      'Un pipeline qui publie chaque jour une vidéo planifiée d\'avance et qui vous alerte quand une étape casse, pour 25 à 50 $ US par mois d\'outils.',
    ],
    couleurs: { accent: '#74824a', encre: '#55602f', tint: '#eef0dd', bord: '#d3d8b3' },
    blocs: [
      {
        lettre: 'A',
        titre: 'La structure de contenu',
        etapes: [
          { id: 'c3.a1', qui: 'Ensemble', texte: "Poser la niche-mère (l'ayurveda vécu dans le climat et les journées d'ici, pour les femmes de la seconde moitié de la vie) et ses cinq sous-niches : le sommeil et l'épuisement, les cycles et la ménopause, la digestion et les saisons, le stress et le mental, les rituels du quotidien.", repere: "La rotation entre sous-niches n'est pas qu'une affaire de variété : c'est ce qui garde la chaîne du bon côté de la règle de YouTube contre le contenu fait au gabarit." },
          { id: 'c3.a5', qui: 'Alex', texte: "Avant d'écrire le premier des cent cinquante sujets, faire lire à Claude Code quatre chaînes de référence qui marchent déjà (Jiva Ayurveda, The Ayurveda Experience, Dr. Mary Claire Haver et Menopause Taylor) pour en sortir la recette plutôt qu'un résumé : la formule des titres, l'accroche des quinze premières secondes, le squelette d'un épisode avec sa durée et son rythme, puis lui demander le même système pour votre niche, titres, scripts et calendrier compris. Le profil de chaque chaîne se garde dans un fichier du dépôt, et il nourrit ensuite les étapes qui suivent, du choix de la langue au format d'épisode.", repere: "C'est la méthode que Valentin Chambraud montre dans sa vidéo du 25 août 2026, en quatre gestes : donner à Claude le lien d'une chaîne, en tirer la recette (format, durée, rythme), demander le même système pour sa propre niche, puis produire, laisser corriger et republier, ce dernier geste étant déjà la boucle d'apprentissage du bloc E. Son guide complet s'obtient contre un courriel et mène vers des formations et des communautés à 297 et 397 $ US par mois, dont rien n'est nécessaire : les prompts s'écrivent chez nous et les transcriptions se prennent avec yt-dlp, sans outil tiers. Les chaînes choisies pèsent vraiment, Jiva Ayurveda comptant 426 000 abonnés, The Ayurveda Experience autour de 700 000, Dr. Mary Claire Haver environ 663 000 et Menopause Taylor ayant passé les 100 000 en 2022 (chiffres relevés le 23 septembre 2026, à relire sur les chaînes elles-mêmes). Nous reprenons la structure et rien du texte, pour rester du bon côté de la règle de YouTube du bloc D; si le français vous tente, Alex ajoute deux chaînes de ce côté avant que vous tranchiez.", liens: [{ texte: 'La vidéo de Valentin Chambraud', url: 'https://www.facebook.com/watch/?v=2351500442052266' }, { texte: 'Son guide, derrière le formulaire', url: 'https://www.valentinchambraud.com/guide-cloner-chaine-youtube' }, { texte: 'Jiva Ayurveda', url: 'https://www.youtube.com/@JivaAyurveda' }, { texte: 'The Ayurveda Experience', url: 'https://www.youtube.com/@theayurvedaexperienceindia' }, { texte: 'Dr. Mary Claire Haver', url: 'https://www.youtube.com/@drmaryclaire' }, { texte: 'Menopause Taylor', url: 'https://www.youtube.com/@MenopauseTaylor' }] },
          { id: 'c3.a2', qui: 'Krystine', texte: "Décider la langue de la chaîne (l'anglais pour les États-Unis, ou le français) et son nom, distinct de votre chaîne actuelle pour que rien ne se mélange." },
          { id: 'c3.a3', qui: 'Alex', texte: "Bâtir la banque de sujets : cent cinquante titres classés par sous-niche, tirés de vos livres et de vos podcasts, soit cinq mois de publication quotidienne." },
          { id: 'c3.a4', qui: 'Ensemble', texte: "Fixer le format d'un épisode (sa durée, une accroche, trois idées, un geste à faire ce soir, l'appel vers le livre ou le site) et la cadence d'une vidéo par jour à la même heure." },
        ],
      },
      {
        lettre: 'B',
        titre: 'Le clone',
        etapes: [
          { id: 'c3.b1', qui: 'Krystine', texte: "Enregistrer votre voix, propre et sans musique, moitié lue et moitié parlée : trente minutes au moins pour le clonage professionnel, et jusqu'à deux ou trois heures si vous voulez la fidélité la plus fine (ElevenLabs, dont Alex a déjà l'abonnement).", repere: "ElevenLabs recommande 30 minutes comme plancher et 2 à 3 heures pour le meilleur résultat. Un clone instantané se fait avec une à trois minutes, assez pour un essai, pas pour la chaîne." },
          { id: 'c3.b2', qui: 'Krystine', texte: "Écouter trois échantillons de la voix clonée et signer celui qui vous ressemble, ou demander une autre prise." },
          { id: 'c3.b3', qui: 'Alex', texte: "Bâtir la base de savoir du clone avec vos trois livres, les transcriptions de vos podcasts et la fiche de votre site, pour qu'il ne réponde jamais avec autre chose que ce que vous avez dit.", repere: "Techniquement : le texte se découpe en passages, chaque passage devient un vecteur dans une base de recherche, et le modèle n'écrit qu'à partir des passages retrouvés. Iris, dans l'onglet Infolettre, est déjà la version texte de ce clone." },
          { id: 'c3.b6', qui: 'Alex', texte: "Avant que vous décidiez si le clone a un visage, essayer l'avatar open source LongCat que montre la vidéo d'IA Boss : une photo de vous et trente secondes de votre voix clonée déposées sur sa démo gratuite, le même clip refait chez HeyGen, et les deux côte à côte pour que vous jugiez sur pièce.", repere: "LongCat-Video-Avatar 1.5 est publié par Meituan depuis le 21 mai 2026 sous licence MIT, donc libre d'usage commercial; à partir d'une photo et d'un audio, il anime le corps entier et tient plusieurs personnages dans une même scène. Il ne tourne pas sur le MacBook d'Alex, parce qu'il exige une carte NVIDIA d'au moins 24 Go de mémoire, alors le chemin réel passe par la démo gratuite de Hugging Face (file d'attente et quotas) ou par une API à la seconde. WaveSpeedAI facture 0,08 $ US la seconde en 720p et plafonne chaque vidéo à deux minutes, ce qui met le clip de trente secondes à 2,40 $. À ce prix, l'abonnement HeyGen à 29 $ US, qui comprend une trentaine de minutes d'avatar par mois, reste moins cher tant que ce volume tient; l'essai LongCat sert à juger la qualité et à garder une porte de sortie sans abonnement. Le laboratoire dit battre HeyGen en évaluation humaine, mais c'est son propre chiffre. Vérifié le 23 septembre 2026.", liens: [{ texte: "La vidéo d'IA Boss", url: 'https://www.facebook.com/watch/?v=1660359075507785' }, { texte: 'Le dépôt LongCat-Video sur GitHub', url: 'https://github.com/meituan-longcat/LongCat-Video' }, { texte: 'La démo gratuite sur Hugging Face', url: 'https://huggingface.co/spaces/meituan-longcat/LongCat-Video-Avatar-1.5-Demo' }, { texte: "L'API à la seconde chez WaveSpeedAI", url: 'https://wavespeed.ai/models/wavespeed-ai/longcat-avatar' }] },
          { id: 'c3.b4', qui: 'Krystine', texte: "Décider si le clone a un visage (un avatar vidéo de vous) ou reste une voix posée sur des images, et approuver la mention « voix synthétique » qui accompagnera chaque vidéo.", repere: "Une chaîne sans visage n'a pas besoin d'avatar. Si vous en voulez un, HeyGen coûte 29 $ US par mois; Synthesia demande 29 $ ou 89 $ et D-ID 5,90 $ ou 29 $. Chacun compte ses minutes par mois." },
          { id: 'c3.b5', qui: 'Krystine', texte: "Signer un consentement écrit d'une page pour le clonage de votre voix (et de votre visage si vous le choisissez), à garder au dossier.", repere: "Cloner une vraie personne à des fins commerciales demande son accord écrit et une divulgation au public; c'est votre propre voix, le risque est faible, mais la trace doit exister. La loi 24 du Québec, sanctionnée le 12 juin 2026, interdit d'ailleurs l'usage commercial de l'image d'une personne sans son consentement, modifiée ou non." },
        ],
      },
      {
        lettre: 'C',
        titre: 'Le pipeline quotidien',
        etapes: [
          { id: 'c3.c1', qui: 'Alex', texte: "Prendre MoneyPrinterTurbo comme squelette (script, voix, images de banque, sous-titres, publication, le tout en Python), y brancher votre voix ElevenLabs et le montage Remotion déjà en place chez Vexel pour la signature visuelle, et l'installer sur une fonction planifiée qui tourne la nuit.", repere: "MoneyPrinterTurbo : 125 000 étoiles, licence MIT, version 1.3.7 du 13 septembre 2026. ShortGPT (8 000 étoiles) se dit encore expérimental; MoneyPrinterV2 est sous licence AGPL; les gabarits n8n remplacent du code par des services payants à la brique. Pour découper un podcast en extraits, AI-Youtube-Shorts-Generator et openshorts font autre chose et serviront plus tard." },
          { id: 'c3.c2', qui: 'Alex', texte: "L'étape du script : le clone écrit l'épisode du jour à partir de la banque de sujets, dans votre voix et selon le format fixé.", repere: "Un script neuf à chaque épisode, écrit à partir de vos passages, coûte quelques dollars par mois en appels au modèle." },
          { id: 'c3.c3', qui: 'Alex', texte: "L'étape de la voix : la narration se génère avec votre voix clonée, puis se vérifie à l'oreille sur un échantillon par semaine.", repere: "Couvert par l'abonnement Creator d'ElevenLabs, 22 $ US par mois, déjà payé." },
          { id: 'c3.c4', qui: 'Alex', texte: "L'étape des images : des plans libres de droits (Pexels, Pixabay) ou générés (Higgsfield, Nano Banana), sous une direction visuelle fixe qui fait reconnaître la chaîne au premier coup d'œil.", repere: "La banque gratuite coûte zéro; les licences de Pexels et Pixabay se relisent avant un usage commercial quotidien. Le compte Higgsfield de base, partagé par Krystine et Alex, est actif et sert déjà beaucoup." },
          { id: 'c3.c5', qui: 'Alex', texte: "L'étape du montage se fait en code : Whisper cale les sous-titres au mot pendant que la musique libre, la vignette et le titre se génèrent d'un même geste.", repere: "Whisper tourne déjà chez Vexel par Replicate; par une API payante, il coûte environ 0,006 $ US la minute d'audio." },
          { id: 'c3.c6', qui: 'Alex', texte: "L'étape de la publication : brancher la chaîne à l'API de YouTube, planifier chaque vidéo à la même heure, remplir la description et cocher la mention de contenu altéré ou synthétique, relier la description aux petits livres et à l'infolettre.", repere: "L'API YouTube ne coûte rien et, depuis septembre 2026, le téléversement a son propre quota de 100 envois par jour : un par jour n'y fait pas une égratignure. Le bouton « contenu altéré ou synthétique » est obligatoire pour une voix clonée depuis le 21 mai 2025." },
          { id: 'c3.c7', qui: 'Alex', texte: "Faire tourner le tout chaque nuit par une fonction planifiée, avec une fiche dans Problèmes techniques dès qu'une étape casse.", repere: "Fonction planifiée Firebase, déjà en place sur votre site : quelques dollars par mois selon l'usage." },
          { id: 'c3.c8', qui: 'Alex', texte: "Emprunter à Lumen, l'agent gratuit à sept rôles que Simon De Lima montre dans sa vidéo, son organisation plutôt que son logiciel : un rôle qui écrit le script en mettant à part chaque affirmation à vérifier avant publication, un rôle SEO pour le titre, la description et les mots-clés, un rôle qui prépare deux miniatures à tester l'une contre l'autre, et une porte d'approbation avant chaque envoi. Ces rôles s'écrivent en scripts que la fonction planifiée appelle, sans faire tourner son serveur.", repere: "Vérifié le 23 septembre 2026 : le dépôt d'origine, darkzOGx/youtube-automation-agent, compte 3 670 étoiles sous licence MIT et son dernier commit date du 21 septembre. Il tourne en Node.js avec un serveur, une base locale et un cron qui doivent rester allumés en continu, ce qu'une fonction Firebase ne fait pas. Le « 100 % gratuit » couvre le texte et la voix du palier gratuit de Gemini avec un montage en diaporama; les vraies images et la vraie vidéo passent par des services payants à l'usage, et la voix clonée ElevenLabs s'y branche par deux variables. Un seul mainteneur porte le projet, qui change de nom pour « AgentTube » et affiche l'adresse d'un jeton crypto en tête de son README : nous lui empruntons l'idée sans jamais lui confier une clé.", liens: [{ texte: 'La vidéo de Simon De Lima', url: 'https://www.facebook.com/watch/?v=3469966859872131' }, { texte: 'Le dépôt Lumen (AgentTube) sur GitHub', url: 'https://github.com/darkzOGx/youtube-automation-agent' }, { texte: "L'article d'AIXYZ sur Lumen", url: 'https://aixyz.ca/lumen-youtube-automation-agent-how-ai-agents-can-run-an-end-to-end-youtube-content-workflow/' }] },
        ],
      },
      {
        lettre: 'D',
        titre: 'Les règles et la sécurité',
        etapes: [
          { id: 'c3.d1', qui: 'Krystine', texte: "Créer la chaîne à votre nom, faire vérifier le compte par téléphone, et garder la monétisation pour le jour où les seuils sont atteints.", repere: "Sans vérification, YouTube bloque les vidéos de plus de 15 minutes. La monétisation s'ouvre à 1 000 abonnés et 4 000 heures de visionnement sur douze mois, ou 10 millions de vues de Shorts sur 90 jours." },
          { id: 'c3.d2', qui: 'Alex', texte: "Respecter la règle de YouTube sur le contenu produit en masse : chaque épisode apporte une idée, une voix et une structure qui lui sont propres, sans texte recopié d'un épisode à l'autre.", repere: "Depuis le 15 juillet 2025, la règle s'appelle « contenu inauthentique » : ce qui suit un gabarit avec une variation minimale perd la monétisation, pas la chaîne. Un vrai script par sous-niche et un angle qui vous appartient passent." },
          { id: 'c3.d3', qui: 'Krystine', texte: "Poser une revue de dix minutes par semaine : regarder les sept vidéos qui partiront, en retirer une au besoin, ou laisser partir." },
        ],
      },
      {
        lettre: 'E',
        titre: 'Lancer et apprendre',
        etapes: [
          { id: 'c3.e1', qui: 'Alex', texte: "Produire les quatorze premières vidéos d'un coup et les planifier sur deux semaines." },
          { id: 'c3.e2', qui: 'Alex', texte: "Publier la première et vérifier qu'elle est en ligne à l'heure prévue, avec sa vignette, son titre et sa description." },
          { id: 'c3.e3', qui: 'Alex', texte: "Lire chaque semaine les chiffres (vues, rétention, abonnés par sous-niche) et nourrir la banque de sujets avec ce qui marche." },
          { id: 'c3.e4', qui: 'Alex', texte: "Relier la chaîne au reste : chaque description mène aux petits livres, au quiz des doshas et à l'infolettre, et le clone répond aux commentaires seulement si vous le voulez." },
          { id: 'c3.e5', qui: 'Alex', texte: "Fermer la boucle comme le septième rôle de Lumen : après chaque vidéo, lire le taux de clic, la rétention et la source du trafic contre l'historique de la chaîne elle-même, et ne retenir une leçon (un style de titre, une longueur, une accroche) que si elle est prouvée à 95 % sans faire reculer la rétention. Chaque leçon vous est proposée et n'entre dans la planification qu'une fois que vous l'avez approuvée.", repere: "Le seuil de preuve à 95 % et la lecture de la courbe de rétention scène par scène sont lus dans le code du dépôt, dans le fichier de l'agent d'analyse. Les API YouTube Analytics et YouTube Data ne coûtent rien.", liens: [{ texte: 'La vidéo de Simon De Lima', url: 'https://www.facebook.com/watch/?v=3469966859872131' }, { texte: "L'agent d'analyse de Lumen, dans le code", url: 'https://github.com/darkzOGx/youtube-automation-agent/blob/master/agents/analytics-optimization-agent.js' }] },
        ],
      },
    ],
  },
];

export const TOUTES_LES_ETAPES: Etape[] = CHANTIERS.flatMap(c => c.blocs.flatMap(b => b.etapes));

export const PIED_DE_PAGE = {
  marque: 'Vexel',
  phrase: 'Ce qui se coche ici se lit aussi par Alex, en direct.',
  periode: 'Automne 2026',
};
