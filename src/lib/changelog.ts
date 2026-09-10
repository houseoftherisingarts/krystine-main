/**
 * Le journal des changements du site de Krystine, tel qu'elle le lit dans son admin.
 *
 * Il vit dans le code plutôt que dans Firestore : il part avec chaque déploiement, il porte
 * l'historique du dépôt depuis le premier jour, et personne ne peut l'effacer par mégarde.
 *
 * RÈGLE DE TENUE : chaque journée de travail sur ce site ajoute son entrée EN TÊTE du tableau,
 * le jour même, avant de dire que la livraison est finie. Le texte s'adresse à Krystine, au
 * « vous », sans vocabulaire de programmeur : elle doit reconnaître ce qui a changé pour elle,
 * pas lire un rapport technique. Une journée déjà inscrite ne se récrit pas.
 */

export type EntreeJournal = {
  /** AAAA-MM-JJ, la journée de travail. */
  date: string;
  titre: string;
  /** Une ou deux phrases qui situent la journée. */
  intro: string;
  /** Ce qui a été fait, une phrase entière par étape. */
  etapes: string[];
};

export const JOURNAL: EntreeJournal[] = [
  {
    date: '2026-09-10',
    titre: 'Le crayon partout, la billetterie, et la saison Vata refaite',
    intro: "Une longue journée sur trois fronts : corriger votre site sans passer par l'admin, vendre vos billets sans intermédiaire, et redonner un visage à la saison Vata.",
    etapes: [
      "Un crayon doré vous attend en haut à droite de votre site quand vous êtes connectée : vous cliquez, et vous corrigez n'importe quel texte ou n'importe quelle photo directement sur la vraie page.",
      "Une billetterie maison est née, branchée sur Stripe, pour vendre vos billets d'événement sans payer de frais à une plateforme extérieure.",
      "L'Expérience Origine 2 possède sa page de vente et son interrupteur : vous la montrez ou vous la cachez d'un clic, avec un aperçu réservé à vous.",
      "L'assistante de conversation qui flottait en bas de page peut s'éteindre depuis les Réglages.",
      "Chaque porte du Foyer devient un vrai module qui contient plusieurs leçons, et chaque leçon peut recevoir plusieurs documents.",
      "Un terrain d'essai du Foyer vous laisse déposer une leçon et voir exactement ce qu'une cliente verrait.",
      "Vos acheteuses ont été rapatriées depuis Kajabi, et le site sait maintenant quelles habitudes chaque cliente a prises pour lui proposer ce qui lui ressemble.",
      "La saison Vata a été refaite au complet : la couverture prend tout l'écran, les huit semaines deviennent de grandes cartes illustrées, une par sens, et un vrai lecteur audio remplace la barre grise du navigateur.",
      "Ce journal que vous lisez a été bâti, et tout l'historique du projet y a été remonté depuis le 21 avril.",
    ],
  },
  {
    date: '2026-09-09',
    titre: "L'interrupteur du Foyer et l'Expérience Origine 2",
    intro: "Vous vouliez pouvoir fermer le Foyer sans qu'on touche au code, et Origine 2 devait exister ailleurs que dans un import.",
    etapes: [
      "Le Foyer possède son interrupteur dans l'admin, éteint par défaut : fermé, la page ne montre plus que la liste d'attente.",
      "L'Expérience Origine 2 a été bâtie sur le site, avec ses propres visuels, plutôt que reprise telle quelle de Kajabi.",
      "Un vérificateur passe les vidéos importées une par une pour confirmer qu'aucune n'a été abîmée en chemin.",
      "Une fleur des offres est apparue sur l'accueil : elle propose à chaque visiteuse ce qui correspond à son moment.",
    ],
  },
  {
    date: '2026-09-08',
    titre: 'Le visuel de la saison 2 et les réglages du jeu',
    intro: "Vous aviez envoyé le nouveau visuel du podcast le matin même, et les cadeaux quotidiens devaient se taire.",
    etapes: [
      "Le visuel officiel de la saison 2 est posé sur le grand bandeau du podcast, sur la carte des Médias et sur celle de l'accueil, en français comme en anglais.",
      "Chaque saison du podcast porte un bouton « Cliquer pour ouvrir », et chaque épisode une pastille qui invite à l'écoute.",
      "Le cadeau du jour et le cadeau du Foyer se sont éteints, et l'espace attend vos réglages avant d'appeler quoi que ce soit.",
      "Les liens du menu d'accueil se centrent enfin exactement sur le bouton « Créer mon compte ».",
    ],
  },
  {
    date: '2026-09-07',
    titre: "Le Foyer social, l'infolettre qui s'écrit à quatre mains, et le Badge Bleu",
    intro: "Grosse journée sur trois pièces : le Foyer devient un vrai lieu de vie, l'infolettre devient un traitement de texte, et vos membres peuvent se faire reconnaître.",
    etapes: [
      "Le Foyer reprend l'allure de votre espace client, avec son fil, ses membres, les profils et la messagerie, et son menu s'ouvre dès l'entrée.",
      "Le Badge Bleu est né : une demande, votre approbation, puis deux cents niskas et un habillage « Vérifié » pour la personne reconnue.",
      "L'infolettre accepte maintenant le texte riche, les puces, les séparateurs, un bandeau que vous dessinez, et elle se sauvegarde toute seule aux cinq secondes avec un historique par heure.",
      "Un bouton « Dupliquer et traduire » fabrique la version anglaise d'une lettre, et la traduction passe par votre propre abonnement plutôt que par une facture d'API.",
      "Un bouton « Test à Krystine » envoie l'essai directement à votre adresse.",
      "Le lien de désabonnement en un clic est branché correctement pour Gmail et Yahoo.",
      "Les blocs de l'infolettre se déplacent en les glissant, avec une poignée et une ligne qui montre où ils vont tomber.",
      "La page de politique de confidentialité a retrouvé les vraies couleurs de votre charte, du brun sur brun la rendait illisible.",
    ],
  },
  {
    date: '2026-09-06',
    titre: 'La plus longue journée : la monnaie, les skins, les coffres et Iris',
    intro: "Une cinquantaine de livraisons dans la même journée, du matin au soir. Votre espace client est devenu un lieu où vos membres ont envie de revenir.",
    etapes: [
      "Le niska est né, votre monnaie intérieure, après être passé par deux autres noms. Il porte son histoire du Rig-Véda sous la bourse du profil.",
      "Une petite boutique est apparue dans l'espace : bannières, musiques et habillages, avec la roue des sept jours et un cadeau de bienvenue.",
      "Seize habillages ont été dessinés, dont trois animés pour Vata, Pitta et Kapha, plus des raretés qui ne sortent que des coffres.",
      "Les coffres bronze, argent et or ont été rendus en trois dimensions, avec leurs chances publiées et leurs lots.",
      "Toute votre chaîne YouTube est entrée dans l'espace, et vos émissions de Santé la vie s'y débloquent une par une ou par saison.",
      "La page des conférences est née en anglais d'abord, avec votre film de 2024 en fond et la bande « Tel que vu à ».",
      "Iris est arrivée : l'assistante tourne sur votre propre ordinateur, écrit vos infolettres à votre demande et publie elle-même.",
      "Vous pouvez offrir depuis la fiche d'une cliente un rabais de un à quatre-vingt-dix-neuf pour cent, ou la formation entière.",
      "Le Foyer d'Origine est passé en vente, avec « Début le 1er octobre » et la porte d'octobre barrée jusqu'à la date.",
      "L'espace formation ressemble maintenant à ce que vous connaissez de Kajabi et de Circle, avec ses sections nommées, ses documents et ses leçons qui s'ouvrent au bon moment.",
      "Les rediffusions du direct sont archivées avec leur clavardage, qui se rejoue au fil de la lecture.",
      "L'admin ne fige plus quand il touche vos trente-trois mille contacts.",
    ],
  },
  {
    date: '2026-09-02',
    titre: 'La liste d\'attente du Foyer sur l\'accueil, et le direct qui obéit',
    intro: "Vous vouliez capter les intéressées du Foyer dès la page d'accueil, et reprendre la main sur les courriels du direct.",
    etapes: [
      "Le Foyer d'Origine occupe une bannière pleine largeur sur l'accueil, avec la liste d'attente posée dans l'espace libre du visuel.",
      "La carte de l'Expérience Origine a repris les matières de sa propre page, le papier, le cuivre et le verre poli.",
      "Vous réglez vous-même l'heure des rappels automatiques du direct, et vous pouvez envoyer chaque courriel tout de suite.",
      "Les envois s'arrêtent net quand le fournisseur coupe sur son quota, et ils reprennent sans envoyer deux fois la même lettre.",
      "Le paquet de cartes des questions du direct s'exporte en PDF.",
      "Toutes les réponses aux courriels partent désormais vers l'adresse de l'équipe, jamais vers votre boîte personnelle.",
    ],
  },
  {
    date: '2026-09-01',
    titre: 'Les inscrites au direct qui ne se perdent plus',
    intro: "Des inscriptions au podcast en direct n'apparaissaient nulle part, et certaines pages de l'admin restaient blanches.",
    etapes: [
      "Les inscrites au formulaire du direct apparaissent maintenant dans leur onglet, et une alerte vous prévient quand la liste est incomplète.",
      "Chaque section de l'admin possède sa propre adresse, ce qui vous laisse la mettre en favori et revenir en arrière sans retomber au tableau de bord.",
      "Les questions du direct s'empilent en temps réel sur une page publique, et le paquet de cartes s'ouvre en plein écran dans l'admin.",
    ],
  },
  {
    date: '2026-08-31',
    titre: 'Le Foyer façon Circle, les directs et le premier robot de conversation',
    intro: "La journée où votre communauté a pris sa forme actuelle, avec ses murs, ses portes mensuelles et ses lives.",
    etapes: [
      "L'espace du Foyer a été bâti sur le modèle de Circle : le fil pleine largeur, les onglets, les membres, le clavardage, et de quoi garder, partager ou épingler un billet.",
      "Les douze portes mensuelles sont en place, celle du mois en cours étant la seule ouverte.",
      "Vous pouvez lancer un direct, public ou réservé aux acheteuses d'une formation, et une pastille prévient tout le site qu'il est commencé.",
      "Un robot de conversation répond aux questions des visiteuses sur votre travail.",
      "Votre espace client et votre admin sont repeints à la charte : ivoire, encre, vert profond, ambre et cuivre.",
      "Les portes du Foyer s'allument d'une braise dorée au survol, avec un son de feu pour l'ouverte et un son de verrou pour les autres.",
      "Une section bio est apparue sur l'accueil, juste sous le grand bandeau.",
    ],
  },
  {
    date: '2026-08-30',
    titre: 'Le parrainage à paliers et le mur qui accepte les photos',
    intro: "Vos membres devaient pouvoir vous amener du monde, et publier autrement qu'en texte.",
    etapes: [
      "Le parrainage fonctionne par paliers : chaque filleule qui achète rapproche la marraine d'un cadeau, jusqu'à l'accès à vie.",
      "Le composeur du mur accepte le texte, la photo et la vidéo, comme sur Facebook.",
      "Les fonctions d'import de Kajabi ont été retirées, la migration étant terminée.",
    ],
  },
  {
    date: '2026-08-29',
    titre: 'Vos quatre-vingt-douze leçons rapatriées de Kajabi',
    intro: "Le premier cours complet est passé de Kajabi à votre site, avec ses vidéos.",
    etapes: [
      "Les quatre-vingt-douze leçons du cours et leurs vingt-quatre modules sont arrivées dans le bon ordre, avec leurs textes.",
      "Soixante-trois vidéos ont été ré-hébergées chez vous plutôt que de rester chez Kajabi.",
      "Le grand bandeau du site reprend fidèlement celui de l'accueil, sans doublon de votre nom.",
      "La couverture du podcast est devenue le vrai visuel officiel de la saison 2.",
    ],
  },
  {
    date: '2026-08-28',
    titre: "L'admin en parchemin et vos vingt-trois cours importés",
    intro: "Votre admin est passé du brun au parchemin, et vos formations sont entrées dans le site.",
    etapes: [
      "L'admin a été redessiné en parchemin et verre, avec son menu flottant et ses pastilles laiton.",
      "Vos vingt-trois cours Kajabi ont été importés, avec leurs vignettes, et vous les publiez ou les masquez d'un clic.",
      "Un panneau d'options par formation règle le prix, l'accès payant, la date de sortie et le message aux acheteuses.",
      "Une section Assets vous laisse téléverser plusieurs fichiers d'un coup, images, vidéos, sons et documents.",
      "La communauté et les formations natives sont nées : le mur, la messagerie, les amitiés, l'annuaire, la cloche et le paiement par Stripe.",
    ],
  },
  {
    date: '2026-08-27',
    titre: "L'infolettre prend son visage de saison 2",
    intro: "Le nouveau visuel noir et or de la saison est entré dans les courriels, et l'outil s'est étoffé.",
    etapes: [
      "Votre bio complète signe désormais le bas des infolettres du podcast.",
      "Une page d'agenda propose d'ajouter la date à Google, Apple ou Outlook.",
      "L'infolettre accepte plusieurs audiences, montre un aperçu exact avant l'envoi, et l'export se filtre par liste.",
    ],
  },
  {
    date: '2026-08-26',
    titre: "L'inscription au podcast en direct, de bout en bout",
    intro: "Kajabi ne pouvait pas le faire assez vite, alors le système d'inscription au direct a été bâti ici, avec ses rappels.",
    etapes: [
      "Une visiteuse s'inscrit au direct depuis la page du podcast, reçoit sa confirmation, puis ses rappels trois jours avant, la veille, une heure avant, et la rediffusion ensuite.",
      "Les courriels sont habillés aux couleurs de votre planche d'inspiration, avec la vraie couverture du podcast et votre portrait en pièces jointes intégrées.",
      "Le formulaire est bilingue, il affiche l'heure de France et il laisse poser une question facultative.",
      "L'export de vos listes neutralise les cellules dangereuses, pour qu'un tableur ne se fasse pas piéger.",
      "Le transport des courriels est passé à un vrai service d'envoi, avec les réponses dirigées vers vous.",
    ],
  },
  {
    date: '2026-08-25',
    titre: "Le Foyer d'Origine trouve sa chaleur",
    intro: "Sept tours de correction dans la même journée pour que la page du Foyer soit chaude et lisible d'un bout à l'autre.",
    etapes: [
      "Le livre aux fleurs pressées ouvre maintenant la page, l'histoire du feu est remontée, et cinq cercles des saisons se posent sous les portes.",
      "La vidéo de l'allumette a été refaite en plan large, l'allumette étant le sujet et la main restant dans l'ombre.",
      "L'antre de l'offre se découvre au rythme du défilement plutôt qu'en boucle.",
      "Une lettre sur du lin habille la foire aux questions.",
      "L'écran de confirmation de l'infolettre montre la photo du livre aux fleurs, et le courriel de bienvenue part tout seul.",
    ],
  },
  {
    date: '2026-08-24',
    titre: 'Les sections du Foyer réécrites sur vos notes',
    intro: "Vos notes du 24 août ont guidé la réécriture des sections cinq à huit.",
    etapes: [
      "Deux battants s'ouvrent maintenant sur le cœur de la page, et l'année nourrie par l'Ayurveda a trouvé son rythme.",
      "Votre section personnelle repose sur le feu qui crépite, avec votre photo.",
      "Le tarif régulier est barré au profit du tarif de lancement.",
      "L'allumette a remplacé le téléphone dans la scène finale, après plusieurs essais.",
    ],
  },
  {
    date: '2026-08-23',
    titre: 'Les douze portes reformulées',
    intro: "Vos notes du 22 août ont servi à réécrire les douze portes, une question par porte.",
    etapes: [
      "Chaque porte porte maintenant sa propre question, dans l'ordre de septembre à août.",
      "Une section « Bienvenue » s'est glissée entre le feu et les douze portes.",
      "L'histoire du feu est devenue un chapitre sombre pleine largeur.",
      "La version anglaise a suivi chaque changement.",
    ],
  },
  {
    date: '2026-08-21',
    titre: 'Le site au complet en français et en anglais',
    intro: "Une bascule de langue est apparue sur chaque page, et le grand bandeau tient enfin sur un téléphone.",
    etapes: [
      "Chaque page se lit en français ou en anglais, la bascule vivant dans le grand bandeau.",
      "Le bandeau du haut tient sur un téléphone, les icônes de musique et de thème n'apparaissant qu'à partir des écrans moyens.",
      "Les règles de la maison sont appliquées partout : aucun italique, et des boutons assez grands pour le pouce.",
    ],
  },
  {
    date: '2026-08-19',
    titre: 'Les douze portes du Foyer, explorables',
    intro: "La journée où le Foyer est devenu un lieu qu'on visite plutôt qu'une page qu'on lit.",
    etapes: [
      "Les douze portes s'explorent au clic, chacune s'ouvrant lentement sur le panneau de son mois.",
      "Un vrai feu de l'âtre, filmé, brûle au cœur de la page, avec un son de feu en boucle.",
      "Les portes verrouillées portent leur cadenas, et un halo lumineux monte de la porte du mois.",
      "Une fleur ayurvédique interactive occupe toute la largeur.",
    ],
  },
  {
    date: '2026-08-17',
    titre: 'Le feu qui ne saute pas',
    intro: "La vidéo du feu recommençait avec une coupure visible; elle boucle maintenant sans qu'on la voie repartir.",
    etapes: [
      "La fin de la vidéo se fond dans son début sur sept secondes, si bien que le feu semble ne jamais s'arrêter.",
    ],
  },
  {
    date: '2026-08-06',
    titre: 'Le troisième tome annoncé',
    intro: "La date de parution du troisième tome est entrée sur le site, et l'accueil invite à s'inscrire pour la connaître.",
    etapes: [
      "La parution est annoncée pour février 2027.",
      "Une capture d'infolettre attend au niveau du troisième tome, avec sa promesse écrite en clair.",
      "Les images de l'accueil sont passées à un format plus léger.",
    ],
  },
  {
    date: '2026-07-18',
    titre: "Les six portes de l'accueil remises en ordre",
    intro: "L'entrée du site a été réorganisée pour que la visiteuse sache par où commencer.",
    etapes: [
      "Les six portes suivent un nouvel ordre, du podcast à Inspirata, et chacune montre son verbe au survol.",
      "Les icônes ont été redessinées avec leurs micro-animations.",
      "La trilogie est descendue sous le carrefour, et le titre des portes est devenu « Par où commencer ».",
    ],
  },
  {
    date: '2026-07-13',
    titre: 'Le quiz accessible par son vrai nom',
    intro: "L'adresse que vous donniez de vive voix ne menait nulle part.",
    etapes: [
      "L'adresse du quiz des doshas fonctionne maintenant sous ses deux formes.",
    ],
  },
  {
    date: '2026-07-04',
    titre: "Origine en mode pré-ouverture",
    intro: "La cohorte était fermée, et la page continuait de vendre. Elle a été remise en attente.",
    etapes: [
      "La page d'Origine présente le programme sans prix ni paiement, et mène à la liste d'attente.",
      "Le calendrier de 2026, périmé, a été retiré.",
      "La liste d'attente a été réécrite dans le langage magazine crème, avec un seul moment sombre dans toute la page.",
      "Le rail des trois piliers se dessine au fil du défilement, et les traits se tracent devant vos yeux.",
    ],
  },
  {
    date: '2026-06-30',
    titre: 'Une sauvegarde après un plantage',
    intro: "La machine avait lâché en pleine refonte; le travail a été mis à l'abri.",
    etapes: [
      "Les pages Médias, Formations et Podcast en version magazine crème ont été sauvegardées, avec la couverture de Santé la vie.",
    ],
  },
  {
    date: '2026-06-27',
    titre: 'Les coutures effacées entre les sections',
    intro: "Le site sautait d'une section à l'autre avec des panneaux qui se voyaient; les jointures ont été adoucies une par une.",
    etapes: [
      "Les transitions entre sections ont disparu sur les formations, le quiz, le guide, le blogue, la liste d'attente et les points de vente.",
      "Le passage d'une page à l'autre se fait en fondu, et le flash blanc qui traînait a été tué.",
      "Le blogue et les points de vente ont reçu une vraie photo en grand bandeau.",
      "Les tirets longs ont été retirés de tous les textes affichés, en français comme en anglais.",
      "Trois directions de refonte ont été mises côte à côte pour choisir la suite.",
    ],
  },
  {
    date: '2026-06-26',
    titre: 'Tout le site public rebâti',
    intro: "La plus grosse journée de la refonte : neuf pages publiques ont été refaites de zéro, sans rien casser derrière.",
    etapes: [
      "Les conférences, les médias, les formations, le blogue, les points de vente et le guide ont été rebâtis.",
      "La boutique et la liste d'attente ont suivi, avec leur panier et leurs inscriptions intacts.",
      "Le quiz des doshas a été refait en dernier, avec son calcul, ses résultats et sa recommandation d'huile.",
      "Le podcast est passé sur le site lui-même et va chercher vos trente-six épisodes en direct.",
      "Le grand bandeau du haut et le pied de page ont été redessinés.",
    ],
  },
  {
    date: '2026-06-25',
    titre: "Origine réaligné sur la vérité",
    intro: "La page d'Origine avait pris quelques libertés avec vos vraies conditions; elle a été recalée sur ce que vous annoncez.",
    etapes: [
      "La garantie de trente jours et les trois cent cinquante places ont été rétablies telles que vous les annoncez.",
      "Un tableau de prix qui n'existait pas a été retiré au profit de la liste de ce qui est inclus.",
      "Le lecteur audio plat a cédé la place au module « Fréquence d'Origine », avec ses écouteurs flottants, à votre demande.",
      "Toutes les pages du site ont basculé d'un coup vers la nouvelle palette.",
    ],
  },
  {
    date: '2026-06-23',
    titre: "La page d'Origine refaite au complet",
    intro: "Onze sections écrites et montées dans la même journée, du grand bandeau jusqu'à la foire aux questions.",
    etapes: [
      "Le programme, les trois piliers, le guide, la bio, les témoignages, les tarifs, les dix questions et le programme des douze semaines ont tous été montés.",
      "La scène de votre grand bandeau a été élargie pour vous laisser plus d'espace.",
    ],
  },
  {
    date: '2026-06-22',
    titre: 'Un rechargement en boucle réparé',
    intro: "La page d'accueil se rechargeait sans fin pendant le travail.",
    etapes: [
      "La boucle a été arrêtée en remettant l'accueil dans la bonne liste.",
    ],
  },
  {
    date: '2026-06-20',
    titre: "La liste d'attente d'Origine trouve sa page",
    intro: "La cohorte était fermée et il fallait une page qui accueille les intéressées sans parler de prix ni de date.",
    etapes: [
      "Une page de liste d'attente a été bâtie, sans prix ni date, avec son encre dorée animée.",
      "Le lien du podcast a été redirigé du programme Vata terminé vers le programme d'été.",
    ],
  },
  {
    date: '2026-06-19',
    titre: "La nouvelle page d'accueil, et la lumière qui entre par la fenêtre",
    intro: "Quatorze livraisons dans la journée pour que le grand bandeau de l'accueil respire, sur ordinateur comme sur téléphone.",
    etapes: [
      "La nouvelle page d'accueil a été montée, avec ses sections qui se retournent au défilement.",
      "Des rayons de lumière dorée descendent de la fenêtre, en évitant votre visage et en se posant sur les livres.",
      "Les particules ont été réparties sur toute la hauteur plutôt que confinées dans un coin.",
      "La version téléphone reprend exactement la mise en scène de l'ordinateur, ajustée à la largeur.",
      "Les balises de partage et de recherche ont été posées sur la page.",
      "Trois sections sont apparues : la Trilogie d'Origine, la saison estivale et les premiers rituels.",
    ],
  },
  {
    date: '2026-06-16',
    titre: "L'infolettre change de facteur",
    intro: "Les envois passaient mal; le transport a été changé.",
    etapes: [
      "L'infolettre part maintenant par la boîte professionnelle plutôt que par le service précédent.",
    ],
  },
  {
    date: '2026-05-29',
    titre: 'Pitta en vedette et le site rendu visible',
    intro: "La saison estivale devait passer devant, et les moteurs de recherche devaient enfin voir toutes vos pages.",
    etapes: [
      "Le programme Pitta est passé en avant sur les formations et sur l'accueil.",
      "Le plan du site a été complété avec le quiz, Origine, Vata, le podcast et le guide.",
      "La mesure d'audience a été branchée, avec le consentement demandé d'abord.",
    ],
  },
  {
    date: '2026-05-18',
    titre: 'Le dépôt mis au propre',
    intro: "Tous les fichiers du projet ont été rassemblés au même endroit.",
    etapes: [
      "Le projet a été versé au complet dans son dépôt.",
    ],
  },
  {
    date: '2026-04-25',
    titre: "L'accueil refait et la carte du Salon",
    intro: "La page d'accueil a été reprise, et les Médias sont entrés dans le site.",
    etapes: [
      "L'accueil a été rebâti, avec la carte de contact du Salon et la section Médias.",
      "Un plancher d'accessibilité a été posé sur tout le site.",
    ],
  },
  {
    date: '2026-04-23',
    titre: 'La fidélité, le guide et le quiz',
    intro: "Les trois premiers grands morceaux du site ont été montés le même jour.",
    etapes: [
      "Le programme de fidélité a été bâti.",
      "Le moteur des parcours guidés est né.",
      "Le quiz interactif des doshas a été monté.",
    ],
  },
  {
    date: '2026-04-21',
    titre: 'Le premier jour',
    intro: "Le site de Krystine St-Laurent et d'Inspirata Ayurveda est né ce jour-là.",
    etapes: [
      "Le projet a été créé et sa première version mise en ligne.",
      "L'accueil a été resserré autour de trois portes, avec leurs bandeaux.",
      "Les pages d'Origine, du podcast et de Vata ont été reliées au reste du site.",
    ],
  },
];

/** Le nombre total de changements livrés, pour l'en-tête du journal. */
export const nombreEtapes = (): number =>
  JOURNAL.reduce((total, entree) => total + entree.etapes.length, 0);
