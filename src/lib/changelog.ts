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

/** Une étape : une phrase seule, ou une phrase suivie de l'endroit à voir.
 *  `ou` est une adresse du site ou de l'admin. Un changement qui ne se voit
 *  nulle part (une fonction du serveur, une règle de sécurité) reste une
 *  phrase seule : personne ne clique dans le vide. */
export type Etape = string | { texte: string; ou: string; libelle?: string };

export type EntreeJournal = {
  /** AAAA-MM-JJ, la journée de travail. */
  date: string;
  titre: string;
  /** Une ou deux phrases qui situent la journée. */
  intro: string;
  /** Ce qui a été fait, une phrase entière par étape. */
  etapes: Etape[];
};

export const texteEtape = (e: Etape): string => (typeof e === 'string' ? e : e.texte);

export const JOURNAL: EntreeJournal[] = [
  {
    date: '2026-09-12',
    titre: "Vos acheteuses de l'ancien système retrouvent leurs formations",
    intro: "Une journée consacrée aux personnes qui ont acheté chez vous sur l'ancien site : les retrouver, leur écrire, et leur donner une façon simple de rapatrier leurs achats ici.",
    etapes: [
      { texte: "Une liste « Liste acheteuse de l'ancien système » existe dans votre infolettre : les 659 personnes qui ont déjà acheté une formation sur l'ancien site, retrouvées à partir de vos ventes passées. Les adresses désinscrites y sont marquées et ne recevront rien.", ou: '/admin/infolettre', libelle: 'Infolettre › Abonnés' },
      { texte: "Un brouillon d'infolettre vous attend pour cette liste : il annonce que vos formations déménagent une à une, que rien ne change pour elles en attendant, et qu'un code personnel leur arrivera pour chaque formation arrivée. Vous le relisez, vous le modifiez si vous voulez, et c'est vous qui l'envoyez.", ou: '/admin/infolettre', libelle: 'Infolettre › Brouillons' },
      { texte: "Une nouvelle page de l'admin, « Codes de l'ancien système », garde le registre de tous les achats de l'ancien site (1 083 achats, 24 offres). Vous y reliez chaque offre à la formation qu'elle ouvre sur le site; deux le sont déjà, la masterclass Gestion du stress et la saison Vata.", ou: '/admin/codes-ancien-systeme', libelle: 'Codes de l’ancien système' },
      { texte: "Quand une formation est arrivée sur le site, un bouton de cette page envoie à chaque acheteuse un code personnel par courriel, et le même mot dans sa messagerie si elle a déjà un compte. Un bouton « code de test » vous permet de voir le courriel avant tout envoi.", ou: '/admin/codes-ancien-systeme', libelle: 'Envoyer les codes' },
      { texte: "Dans « Mes formations », une case « J'ai reçu un code » attend vos clientes : elles entrent le code, et la formation revient dans leur espace, sans rien repayer. Un code ne sert qu'une fois et vaut 180 jours.", ou: '/compte?onglet=formations', libelle: 'Mes formations' },
      "L'accès à l'ancien système par son API a été refusé (il demande un forfait que vous n'avez pas) : la liste vient donc de vos ventes Stripe, qui les contiennent toutes sauf celles payées par PayPal. Celles-là s'ajouteront depuis l'export de l'ancien site.",
    ],
  },
  {
    date: '2026-09-11',
    titre: 'Santé Parfaite refait, la signature commune à tous vos programmes, et la bannière réparée',
    intro: "Une soirée qui a débordé sur la nuit : après Vata, tous vos programmes reçoivent la même signature visuelle, et deux rapports de clientes ont trouvé leur réponse.",
    etapes: [
      { texte: "La page des événements a été refaite de A à Z, comme le programme d'une salle de spectacle : le prochain grand rendez-vous en pleine largeur, puis l'index de toutes les dates avec le jour en grand, et la porte pour faire venir Krystine chez vous. Elle fond désormais vos événements publiés et la programmation curée, si bien qu'elle ne dit plus jamais qu'il n'y a rien à venir.", ou: '/evenements', libelle: 'Les rendez-vous' },
      { texte: "La page de vente d'un événement est devenue un vrai programme de soirée : le lieu photographié en plein écran, la soirée racontée acte par acte, le lieu et son histoire, un encart au milieu de la page, et le billet dessiné comme un billet avec sa jauge de places. Le lancement du troisième livre à L'Anglicane de Lévis y est prêt, et reste éteint jusqu'à votre OK : le bouton Aperçu de l'admin le montre.", ou: '/admin/evenements', libelle: 'Vos événements' },
      { texte: "Tous vos programmes, sauf le Foyer d'Origine, portent maintenant la signature de Vata : le seuil plein cadre, le chemin des chapitres en grandes cartes, le lecteur maison, les boîtes colorées, le mot de bravo et le diplôme. Vos clientes retrouvent le même environnement d'un parcours à l'autre.", ou: '/cours/vata', libelle: 'L’espace Vata' },
      { texte: "La Masterclass Santé Parfaite a reçu sa couverture au canon et dix natures mortes, une par étape, et ses dix-sept leçons ont été nettoyées des résidus d'import qui traînaient dans les textes. Elle reste masquée jusqu'à votre OK.", ou: '/admin/formations', libelle: 'Vos formations' },
      { texte: "Un petit sticker dit désormais ce qu'on va consommer, Expérience audio ou Expérience vidéo, sur le seuil du cours, sur la fiche d'achat et dans Mes formations.", ou: '/compte?onglet=formations', libelle: 'Mes formations' },
      { texte: "Les adresses des cours ne portent plus l'identifiant d'import : /cours/vata plutôt qu'un numéro, et l'ancienne adresse redirige.", ou: '/cours/vata', libelle: 'L’espace Vata' },
      { texte: "Le téléversement d'une bannière personnelle échouait en silence pour toute cliente, parce que le dossier était réservé à l'admin dans les règles. Il est ouvert, la photo est réduite avant l'envoi, et une erreur s'affiche s'il en reste une.", ou: '/compte', libelle: 'Votre espace' },
      "Les comptes de l'équipe ne laissent plus de trace dans les habitudes de vos clientes, pour ne pas fausser vos chiffres.",
      { texte: "Sur l'accueil, le bouton dit « Accéder à mon espace ».", ou: '/', libelle: 'La page d’accueil' },
      { texte: "Sur la page des formations, l'Expérience Origine 2 porte son nom, et la section « à votre rythme » se replie derrière une flèche.", ou: '/formations', libelle: 'Les formations' },
      { texte: "Sur Médias, le coffret des trois saisons de Santé la vie s'appelle par son nom.", ou: '/medias', libelle: 'Médias et livres' },
      "Dans l'admin, toutes les familles du menu de gauche sont repliées par défaut.",
      { texte: "Plus tard dans la matinée, le calendrier des événements et la page de l'Anglicane ont été refaits une deuxième fois, dans le langage crème de vos pages Médias, parce que la version de la nuit tirait sur le brun. Le lancement reste en aperçu tant que vous n'avez pas donné l'heure, le prix et le nombre de places.", ou: '/evenements', libelle: 'Les événements' },
      { texte: "Un avis que vous écrivez dans l'admin paraît maintenant en bulle sur l'accueil, dans la cloche de chaque cliente, puis se range dans ses Lettres quand elle l'a lu : un babillard séparé de la petite fleur.", ou: '/admin/infolettre', libelle: 'Infolettre › Avis épinglés' },
      { texte: "Le programme partenaire de Vexel est entré dans votre admin et dans le pied de page du site : votre lien de parrainage, et ce que chaque site recommandé vous rapporte.", ou: '/admin/partenaire-vexel', libelle: 'Partenaire Vexel' },
    ],
  },
  {
    date: '2026-09-10',
    titre: 'Le crayon partout, la billetterie, et la saison Vata refaite',
    intro: "Une longue journée sur trois fronts : corriger votre site sans passer par l'admin, vendre vos billets sans intermédiaire, et redonner un visage à la saison Vata.",
    etapes: [
      { texte: "Un crayon doré vous attend en haut à droite de votre site quand vous êtes connectée : vous cliquez, et vous corrigez n'importe quel texte ou n'importe quelle photo directement sur la vraie page.", ou: '/', libelle: 'Voir le site' },
      { texte: "Une billetterie maison est née, branchée sur Stripe, pour vendre vos billets d'événement sans payer de frais à une plateforme extérieure.", ou: '/evenements', libelle: 'Les événements' },
      { texte: "L'Expérience Origine 2 possède sa page de vente et son interrupteur : vous la montrez ou vous la cachez d'un clic, avec un aperçu réservé à vous.", ou: '/origine-2', libelle: 'La page d’Origine 2' },
      { texte: "L'assistante de conversation qui flottait en bas de page peut s'éteindre depuis les Réglages.", ou: '/admin/parametres', libelle: 'Réglages' },
      { texte: "Chaque porte du Foyer devient un vrai module qui contient plusieurs leçons, et chaque leçon peut recevoir plusieurs documents.", ou: '/admin/le-foyer', libelle: 'Le Foyer dans l’admin' },
      { texte: "Un terrain d'essai du Foyer vous laisse déposer une leçon et voir exactement ce qu'une cliente verrait.", ou: '/admin/le-foyer', libelle: 'Le terrain d’essai' },
      { texte: "Vos acheteuses ont été rapatriées depuis Kajabi, et le site sait maintenant quelles habitudes chaque cliente a prises pour lui proposer ce qui lui ressemble.", ou: '/admin/habitudes', libelle: 'Habitudes de vos clientes' },
      { texte: "La saison Vata a été refaite au complet : la couverture prend tout l'écran, les huit semaines deviennent de grandes cartes illustrées, une par sens, et un vrai lecteur audio remplace la barre grise du navigateur.", ou: '/cours/vata', libelle: 'L’espace Vata' },
      { texte: "Ce journal que vous lisez a été bâti, et tout l'historique du projet y a été remonté depuis le 21 avril.", ou: '/admin/journal-des-changements', libelle: 'Ce journal' },
      { texte: "Quand une semaine s'achève, un mot de bravo se lève et votre barre de progression avance sous vos yeux.", ou: '/cours/vata', libelle: 'L’espace Vata' },
      { texte: "Chaque semaine occupe maintenant sa propre boîte dans la liste de gauche, avec sa couleur, son chiffre romain et sa barre, et la boîte se marque achevée quand ses leçons sont faites.", ou: '/cours/vata', libelle: 'L’espace Vata' },
      { texte: "Un parchemin se déroule quand le programme est mené jusqu'au bout, signé de votre main, et il se prend en PDF pour l'accrocher au mur.", ou: '/demo-diplome', libelle: 'Voir le diplôme' },
      { texte: "Un onglet « Mes diplômes » est apparu dans l'espace de vos clientes, à côté de leurs formations.", ou: '/compte?onglet=diplomes', libelle: 'Mes diplômes' },
      { texte: "Sous chaque formation, vous voyez maintenant qui avance, qui est rendue à quelle semaine et qui n'a pas ouvert le cours depuis deux semaines, pour savoir qui féliciter et qui relancer.", ou: '/admin/formations', libelle: 'Vos formations' },
      { texte: "Chaque ligne de ce journal qui se voit sur le site porte un petit bouton qui vous y mène directement.", ou: '/admin/journal-des-changements', libelle: 'Ce journal' },
    ],
  },
  {
    date: '2026-09-09',
    titre: "L'interrupteur du Foyer et l'Expérience Origine 2",
    intro: "Vous vouliez pouvoir fermer le Foyer sans qu'on touche au code, et Origine 2 devait exister ailleurs que dans un import.",
    etapes: [
      { texte: "Le Foyer possède son interrupteur dans l'admin, éteint par défaut : fermé, la page ne montre plus que la liste d'attente.", ou: '/admin/parametres', libelle: 'Réglages' },
      { texte: "L'Expérience Origine 2 a été bâtie sur le site, avec ses propres visuels, plutôt que reprise telle quelle de Kajabi.", ou: '/origine-2', libelle: 'La page d’Origine 2' },
      "Un vérificateur passe les vidéos importées une par une pour confirmer qu'aucune n'a été abîmée en chemin.",
      { texte: "Une fleur des offres est apparue sur l'accueil : elle propose à chaque visiteuse ce qui correspond à son moment.", ou: '/', libelle: 'La page d’accueil' },
    ],
  },
  {
    date: '2026-09-08',
    titre: 'Le visuel de la saison 2 et les réglages du jeu',
    intro: "Vous aviez envoyé le nouveau visuel du podcast le matin même, et les cadeaux quotidiens devaient se taire.",
    etapes: [
      { texte: "Le visuel officiel de la saison 2 est posé sur le grand bandeau du podcast, sur la carte des Médias et sur celle de l'accueil, en français comme en anglais.", ou: '/podcast', libelle: 'Le podcast' },
      { texte: "Chaque saison du podcast porte un bouton « Cliquer pour ouvrir », et chaque épisode une pastille qui invite à l'écoute.", ou: '/podcast', libelle: 'Le podcast' },
      "Le cadeau du jour et le cadeau du Foyer se sont éteints, et l'espace attend vos réglages avant d'appeler quoi que ce soit.",
      { texte: "Les liens du menu d'accueil se centrent enfin exactement sur le bouton « Créer mon compte ».", ou: '/', libelle: 'La page d’accueil' },
    ],
  },
  {
    date: '2026-09-07',
    titre: "Le Foyer social, l'infolettre qui s'écrit à quatre mains, et le Badge Bleu",
    intro: "Grosse journée sur trois pièces : le Foyer devient un vrai lieu de vie, l'infolettre devient un traitement de texte, et vos membres peuvent se faire reconnaître.",
    etapes: [
      { texte: "Le Foyer reprend l'allure de votre espace client, avec son fil, ses membres, les profils et la messagerie, et son menu s'ouvre dès l'entrée.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "Le Badge Bleu est né : une demande, votre approbation, puis deux cents niskas et un habillage « Vérifié » pour la personne reconnue.", ou: '/admin/badge-bleu', libelle: 'Badge Bleu' },
      { texte: "L'infolettre accepte maintenant le texte riche, les puces, les séparateurs, un bandeau que vous dessinez, et elle se sauvegarde toute seule aux cinq secondes avec un historique par heure.", ou: '/admin/infolettre', libelle: 'L’infolettre' },
      { texte: "Un bouton « Dupliquer et traduire » fabrique la version anglaise d'une lettre, et la traduction passe par votre propre abonnement plutôt que par une facture d'API.", ou: '/admin/infolettre', libelle: 'L’infolettre' },
      { texte: "Un bouton « Test à Krystine » envoie l'essai directement à votre adresse.", ou: '/admin/infolettre', libelle: 'L’infolettre' },
      "Le lien de désabonnement en un clic est branché correctement pour Gmail et Yahoo.",
      { texte: "Les blocs de l'infolettre se déplacent en les glissant, avec une poignée et une ligne qui montre où ils vont tomber.", ou: '/admin/infolettre', libelle: 'L’infolettre' },
      { texte: "La page de politique de confidentialité a retrouvé les vraies couleurs de votre charte, du brun sur brun la rendait illisible.", ou: '/confidentialite', libelle: 'La politique' },
    ],
  },
  {
    date: '2026-09-06',
    titre: 'La plus longue journée : la monnaie, les skins, les coffres et Iris',
    intro: "Une cinquantaine de livraisons dans la même journée, du matin au soir. Votre espace client est devenu un lieu où vos membres ont envie de revenir.",
    etapes: [
      "Le niska est né, votre monnaie intérieure, après être passé par deux autres noms. Il porte son histoire du Rig-Véda sous la bourse du profil.",
      { texte: "Une petite boutique est apparue dans l'espace : bannières, musiques et habillages, avec la roue des sept jours et un cadeau de bienvenue.", ou: '/compte?onglet=telechargements', libelle: 'La petite boutique' },
      { texte: "Seize habillages ont été dessinés, dont trois animés pour Vata, Pitta et Kapha, plus des raretés qui ne sortent que des coffres.", ou: '/compte?onglet=telechargements', libelle: 'Les habillages' },
      { texte: "Les coffres bronze, argent et or ont été rendus en trois dimensions, avec leurs chances publiées et leurs lots.", ou: '/compte?onglet=loyalty', libelle: 'Les niskas' },
      { texte: "Toute votre chaîne YouTube est entrée dans l'espace, et vos émissions de Santé la vie s'y débloquent une par une ou par saison.", ou: '/compte?onglet=telechargements', libelle: 'Vos vidéos' },
      { texte: "La page des conférences est née en anglais d'abord, avec votre film de 2024 en fond et la bande « Tel que vu à ».", ou: '/speaking', libelle: 'La page des conférences' },
      { texte: "Iris est arrivée : l'assistante tourne sur votre propre ordinateur, écrit vos infolettres à votre demande et publie elle-même.", ou: '/admin/infolettre', libelle: 'L’infolettre' },
      { texte: "Vous pouvez offrir depuis la fiche d'une cliente un rabais de un à quatre-vingt-dix-neuf pour cent, ou la formation entière.", ou: '/admin/clients', libelle: 'Vos clientes' },
      { texte: "Le Foyer d'Origine est passé en vente, avec « Début le 1er octobre » et la porte d'octobre barrée jusqu'à la date.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "L'espace formation ressemble maintenant à ce que vous connaissez de Kajabi et de Circle, avec ses sections nommées, ses documents et ses leçons qui s'ouvrent au bon moment.", ou: '/admin/formations', libelle: 'Vos formations' },
      { texte: "Les rediffusions du direct sont archivées avec leur clavardage, qui se rejoue au fil de la lecture.", ou: '/compte?onglet=rediffusions', libelle: 'Les rediffusions' },
      "L'admin ne fige plus quand il touche vos trente-trois mille contacts.",
    ],
  },
  {
    date: '2026-09-02',
    titre: 'La liste d\'attente du Foyer sur l\'accueil, et le direct qui obéit',
    intro: "Vous vouliez capter les intéressées du Foyer dès la page d'accueil, et reprendre la main sur les courriels du direct.",
    etapes: [
      { texte: "Le Foyer d'Origine occupe une bannière pleine largeur sur l'accueil, avec la liste d'attente posée dans l'espace libre du visuel.", ou: '/', libelle: 'La page d’accueil' },
      { texte: "La carte de l'Expérience Origine a repris les matières de sa propre page, le papier, le cuivre et le verre poli.", ou: '/', libelle: 'La page d’accueil' },
      { texte: "Vous réglez vous-même l'heure des rappels automatiques du direct, et vous pouvez envoyer chaque courriel tout de suite.", ou: '/admin/live', libelle: 'Le direct' },
      "Les envois s'arrêtent net quand le fournisseur coupe sur son quota, et ils reprennent sans envoyer deux fois la même lettre.",
      { texte: "Le paquet de cartes des questions du direct s'exporte en PDF.", ou: '/admin/formulaires', libelle: 'Les formulaires' },
      "Toutes les réponses aux courriels partent désormais vers l'adresse de l'équipe, jamais vers votre boîte personnelle.",
    ],
  },
  {
    date: '2026-09-01',
    titre: 'Les inscrites au direct qui ne se perdent plus',
    intro: "Des inscriptions au podcast en direct n'apparaissaient nulle part, et certaines pages de l'admin restaient blanches.",
    etapes: [
      { texte: "Les inscrites au formulaire du direct apparaissent maintenant dans leur onglet, et une alerte vous prévient quand la liste est incomplète.", ou: '/admin/formulaires', libelle: 'Les formulaires' },
      "Chaque section de l'admin possède sa propre adresse, ce qui vous laisse la mettre en favori et revenir en arrière sans retomber au tableau de bord.",
      { texte: "Les questions du direct s'empilent en temps réel sur une page publique, et le paquet de cartes s'ouvre en plein écran dans l'admin.", ou: '/podcast/question', libelle: 'Les questions du direct' },
    ],
  },
  {
    date: '2026-08-31',
    titre: 'Le Foyer façon Circle, les directs et le premier robot de conversation',
    intro: "La journée où votre communauté a pris sa forme actuelle, avec ses murs, ses portes mensuelles et ses lives.",
    etapes: [
      { texte: "L'espace du Foyer a été bâti sur le modèle de Circle : le fil pleine largeur, les onglets, les membres, le clavardage, et de quoi garder, partager ou épingler un billet.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "Les douze portes mensuelles sont en place, celle du mois en cours étant la seule ouverte.", ou: '/foyer', libelle: 'Les douze portes' },
      { texte: "Vous pouvez lancer un direct, public ou réservé aux acheteuses d'une formation, et une pastille prévient tout le site qu'il est commencé.", ou: '/admin/live', libelle: 'Le direct' },
      { texte: "Un robot de conversation répond aux questions des visiteuses sur votre travail.", ou: '/', libelle: 'Le site' },
      { texte: "Votre espace client et votre admin sont repeints à la charte : ivoire, encre, vert profond, ambre et cuivre.", ou: '/compte', libelle: 'Votre espace' },
      { texte: "Les portes du Foyer s'allument d'une braise dorée au survol, avec un son de feu pour l'ouverte et un son de verrou pour les autres.", ou: '/foyer', libelle: 'Les douze portes' },
      { texte: "Une section bio est apparue sur l'accueil, juste sous le grand bandeau.", ou: '/', libelle: 'La page d’accueil' },
    ],
  },
  {
    date: '2026-08-30',
    titre: 'Le parrainage à paliers et le mur qui accepte les photos',
    intro: "Vos membres devaient pouvoir vous amener du monde, et publier autrement qu'en texte.",
    etapes: [
      { texte: "Le parrainage fonctionne par paliers : chaque filleule qui achète rapproche la marraine d'un cadeau, jusqu'à l'accès à vie.", ou: '/compte?onglet=profile', libelle: 'Le parrainage' },
      { texte: "Le composeur du mur accepte le texte, la photo et la vidéo, comme sur Facebook.", ou: '/foyer', libelle: 'Le mur du Foyer' },
      "Les fonctions d'import de Kajabi ont été retirées, la migration étant terminée.",
    ],
  },
  {
    date: '2026-08-29',
    titre: 'Vos quatre-vingt-douze leçons rapatriées de Kajabi',
    intro: "Le premier cours complet est passé de Kajabi à votre site, avec ses vidéos.",
    etapes: [
      { texte: "Les quatre-vingt-douze leçons du cours et leurs vingt-quatre modules sont arrivées dans le bon ordre, avec leurs textes.", ou: '/admin/formations', libelle: 'Vos formations' },
      "Soixante-trois vidéos ont été ré-hébergées chez vous plutôt que de rester chez Kajabi.",
      { texte: "Le grand bandeau du site reprend fidèlement celui de l'accueil, sans doublon de votre nom.", ou: '/', libelle: 'La page d’accueil' },
      { texte: "La couverture du podcast est devenue le vrai visuel officiel de la saison 2.", ou: '/podcast', libelle: 'Le podcast' },
    ],
  },
  {
    date: '2026-08-28',
    titre: "L'admin en parchemin et vos vingt-trois cours importés",
    intro: "Votre admin est passé du brun au parchemin, et vos formations sont entrées dans le site.",
    etapes: [
      { texte: "L'admin a été redessiné en parchemin et verre, avec son menu flottant et ses pastilles laiton.", ou: '/admin/tableau-de-bord', libelle: 'Le tableau de bord' },
      { texte: "Vos vingt-trois cours Kajabi ont été importés, avec leurs vignettes, et vous les publiez ou les masquez d'un clic.", ou: '/admin/formations', libelle: 'Vos formations' },
      { texte: "Un panneau d'options par formation règle le prix, l'accès payant, la date de sortie et le message aux acheteuses.", ou: '/admin/formations', libelle: 'Vos formations' },
      { texte: "Une section Assets vous laisse téléverser plusieurs fichiers d'un coup, images, vidéos, sons et documents.", ou: '/admin/assets', libelle: 'Assets' },
      { texte: "La communauté et les formations natives sont nées : le mur, la messagerie, les amitiés, l'annuaire, la cloche et le paiement par Stripe.", ou: '/compte', libelle: 'Votre espace' },
    ],
  },
  {
    date: '2026-08-27',
    titre: "L'infolettre prend son visage de saison 2",
    intro: "Le nouveau visuel noir et or de la saison est entré dans les courriels, et l'outil s'est étoffé.",
    etapes: [
      { texte: "Votre bio complète signe désormais le bas des infolettres du podcast.", ou: '/admin/infolettre', libelle: 'L’infolettre' },
      { texte: "Une page d'agenda propose d'ajouter la date à Google, Apple ou Outlook.", ou: '/podcast', libelle: 'Le podcast' },
      { texte: "L'infolettre accepte plusieurs audiences, montre un aperçu exact avant l'envoi, et l'export se filtre par liste.", ou: '/admin/infolettre', libelle: 'L’infolettre' },
    ],
  },
  {
    date: '2026-08-26',
    titre: "L'inscription au podcast en direct, de bout en bout",
    intro: "Kajabi ne pouvait pas le faire assez vite, alors le système d'inscription au direct a été bâti ici, avec ses rappels.",
    etapes: [
      { texte: "Une visiteuse s'inscrit au direct depuis la page du podcast, reçoit sa confirmation, puis ses rappels trois jours avant, la veille, une heure avant, et la rediffusion ensuite.", ou: '/podcast', libelle: 'Le podcast' },
      "Les courriels sont habillés aux couleurs de votre planche d'inspiration, avec la vraie couverture du podcast et votre portrait en pièces jointes intégrées.",
      { texte: "Le formulaire est bilingue, il affiche l'heure de France et il laisse poser une question facultative.", ou: '/podcast', libelle: 'Le podcast' },
      { texte: "L'export de vos listes neutralise les cellules dangereuses, pour qu'un tableur ne se fasse pas piéger.", ou: '/admin/clients', libelle: 'Vos clientes' },
      "Le transport des courriels est passé à un vrai service d'envoi, avec les réponses dirigées vers vous.",
    ],
  },
  {
    date: '2026-08-25',
    titre: "Le Foyer d'Origine trouve sa chaleur",
    intro: "Sept tours de correction dans la même journée pour que la page du Foyer soit chaude et lisible d'un bout à l'autre.",
    etapes: [
      { texte: "Le livre aux fleurs pressées ouvre maintenant la page, l'histoire du feu est remontée, et cinq cercles des saisons se posent sous les portes.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "La vidéo de l'allumette a été refaite en plan large, l'allumette étant le sujet et la main restant dans l'ombre.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "L'antre de l'offre se découvre au rythme du défilement plutôt qu'en boucle.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "Une lettre sur du lin habille la foire aux questions.", ou: '/foyer', libelle: 'Le Foyer' },
      "L'écran de confirmation de l'infolettre montre la photo du livre aux fleurs, et le courriel de bienvenue part tout seul.",
    ],
  },
  {
    date: '2026-08-24',
    titre: 'Les sections du Foyer réécrites sur vos notes',
    intro: "Vos notes du 24 août ont guidé la réécriture des sections cinq à huit.",
    etapes: [
      { texte: "Deux battants s'ouvrent maintenant sur le cœur de la page, et l'année nourrie par l'Ayurveda a trouvé son rythme.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "Votre section personnelle repose sur le feu qui crépite, avec votre photo.", ou: '/foyer', libelle: 'Le Foyer' },
      "Le tarif régulier apparaît barré, et le tarif de lancement prend sa place juste à côté.",
      { texte: "L'allumette a remplacé le téléphone dans la scène finale, après plusieurs essais.", ou: '/foyer', libelle: 'Le Foyer' },
    ],
  },
  {
    date: '2026-08-23',
    titre: 'Les douze portes reformulées',
    intro: "Vos notes du 22 août ont servi à réécrire les douze portes, une question par porte.",
    etapes: [
      { texte: "Chaque porte porte maintenant sa propre question, dans l'ordre de septembre à août.", ou: '/foyer', libelle: 'Les douze portes' },
      { texte: "Une section « Bienvenue » s'est glissée entre le feu et les douze portes.", ou: '/foyer', libelle: 'Le Foyer' },
      { texte: "L'histoire du feu est devenue un chapitre sombre pleine largeur.", ou: '/foyer', libelle: 'Le Foyer' },
      "La version anglaise a suivi chaque changement.",
    ],
  },
  {
    date: '2026-08-21',
    titre: 'Le site au complet en français et en anglais',
    intro: "Une bascule de langue est apparue sur chaque page, et le grand bandeau tient enfin sur un téléphone.",
    etapes: [
      { texte: "Chaque page se lit en français ou en anglais, la bascule vivant dans le grand bandeau.", ou: '/', libelle: 'Le site' },
      "Le bandeau du haut tient sur un téléphone, les icônes de musique et de thème n'apparaissant qu'à partir des écrans moyens.",
      "Les règles de la maison sont appliquées partout : aucun italique, et des boutons assez grands pour le pouce.",
    ],
  },
  {
    date: '2026-08-19',
    titre: 'Les douze portes du Foyer, explorables',
    intro: "La journée où le Foyer est devenu un lieu qu'on visite plutôt qu'une page qu'on lit.",
    etapes: [
      { texte: "Les douze portes s'explorent au clic, chacune s'ouvrant lentement sur le panneau de son mois.", ou: '/foyer', libelle: 'Les douze portes' },
      { texte: "Un vrai feu de l'âtre, filmé chez vous, brûle au milieu de la page pendant qu'un son de feu tourne en boucle.", ou: '/foyer', libelle: 'Le Foyer' },
      "Les portes verrouillées portent leur cadenas, et un halo lumineux monte de la porte du mois.",
      { texte: "Une fleur ayurvédique interactive occupe toute la largeur.", ou: '/foyer', libelle: 'Le Foyer' },
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
      { texte: "La parution du troisième tome est annoncée pour février 2027, en toutes lettres sur la page.", ou: '/medias', libelle: 'Médias et livres' },
      "Une capture d'infolettre attend au niveau du troisième tome, avec sa promesse écrite en clair.",
      "Les images de l'accueil sont passées à un format plus léger.",
    ],
  },
  {
    date: '2026-07-18',
    titre: "Les six portes de l'accueil remises en ordre",
    intro: "L'entrée du site a été réorganisée pour que la visiteuse sache par où commencer.",
    etapes: [
      { texte: "Les six portes suivent un nouvel ordre, du podcast à Inspirata, et chacune montre son verbe au survol.", ou: '/', libelle: 'La page d’accueil' },
      "Les icônes ont été redessinées avec leurs micro-animations.",
      { texte: "La trilogie est descendue sous le carrefour, et le titre des portes est devenu « Par où commencer ».", ou: '/', libelle: 'La page d’accueil' },
    ],
  },
  {
    date: '2026-07-13',
    titre: 'Le quiz accessible par son vrai nom',
    intro: "L'adresse que vous donniez de vive voix ne menait nulle part.",
    etapes: [
      { texte: "L'adresse du quiz des doshas fonctionne maintenant sous ses deux formes.", ou: '/quiz', libelle: 'Le quiz' },
    ],
  },
  {
    date: '2026-07-04',
    titre: "Origine en mode pré-ouverture",
    intro: "La cohorte était fermée, et la page continuait de vendre. Elle a été remise en attente.",
    etapes: [
      { texte: "La page d'Origine présente le programme sans prix ni paiement, et mène à la liste d'attente.", ou: '/origine', libelle: 'L’Expérience Origine' },
      "Le calendrier de 2026, périmé, a été retiré.",
      { texte: "La liste d'attente a été réécrite dans le langage magazine crème, avec un seul moment sombre dans toute la page.", ou: '/liste-attente', libelle: 'La liste d’attente' },
      { texte: "Le rail des trois piliers se dessine au fil du défilement, et les traits se tracent devant vos yeux.", ou: '/origine', libelle: 'L’Expérience Origine' },
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
      { texte: "Les conférences, les médias, les formations, le blogue, les points de vente et le guide ont été rebâtis.", ou: '/formations', libelle: 'Les formations' },
      "La boutique et la liste d'attente ont suivi, avec leur panier et leurs inscriptions intacts.",
      { texte: "Le quiz des doshas a été refait en dernier, avec son calcul, ses résultats et sa recommandation d'huile.", ou: '/quiz', libelle: 'Le quiz' },
      { texte: "Le podcast est passé sur le site lui-même et va chercher vos trente-six épisodes en direct.", ou: '/podcast', libelle: 'Le podcast' },
      "Le grand bandeau du haut et le pied de page ont été redessinés.",
    ],
  },
  {
    date: '2026-06-25',
    titre: "Origine réaligné sur la vérité",
    intro: "La page d'Origine avait pris quelques libertés avec vos vraies conditions; elle a été recalée sur ce que vous annoncez.",
    etapes: [
      { texte: "La garantie de trente jours et les trois cent cinquante places ont été rétablies telles que vous les annoncez.", ou: '/origine', libelle: 'L’Expérience Origine' },
      "Un tableau de prix qui n'existait pas a été retiré au profit de la liste de ce qui est inclus.",
      { texte: "Le lecteur audio plat a cédé la place au module « Fréquence d'Origine », avec ses écouteurs flottants, à votre demande.", ou: '/origine', libelle: 'L’Expérience Origine' },
      "Toutes les pages du site ont basculé d'un coup vers la nouvelle palette.",
    ],
  },
  {
    date: '2026-06-23',
    titre: "La page d'Origine refaite au complet",
    intro: "Onze sections écrites et montées dans la même journée, du grand bandeau jusqu'à la foire aux questions.",
    etapes: [
      { texte: "Le programme, les trois piliers, le guide, la bio, les témoignages, les tarifs, les dix questions et le programme des douze semaines ont tous été montés.", ou: '/origine', libelle: 'L’Expérience Origine' },
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
      { texte: "Une page de liste d'attente a été bâtie, sans prix ni date, avec son encre dorée animée.", ou: '/liste-attente', libelle: 'La liste d’attente' },
      "Le lien du podcast a été redirigé du programme Vata terminé vers le programme d'été.",
    ],
  },
  {
    date: '2026-06-19',
    titre: "La nouvelle page d'accueil, et la lumière qui entre par la fenêtre",
    intro: "Quatorze livraisons dans la journée pour que le grand bandeau de l'accueil respire, sur ordinateur comme sur téléphone.",
    etapes: [
      { texte: "La nouvelle page d'accueil a été montée, avec ses sections qui se retournent au défilement.", ou: '/', libelle: 'La page d’accueil' },
      { texte: "Des rayons de lumière dorée descendent de la fenêtre, en évitant votre visage et en se posant sur les livres.", ou: '/', libelle: 'La page d’accueil' },
      "Les particules ont été réparties sur toute la hauteur plutôt que confinées dans un coin.",
      "La version téléphone reprend exactement la mise en scène de l'ordinateur, ajustée à la largeur.",
      "Les balises de partage et de recherche ont été posées sur la page.",
      { texte: "Trois sections sont apparues : la Trilogie d'Origine, la saison estivale et les premiers rituels.", ou: '/', libelle: 'La page d’accueil' },
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
      { texte: "Le programme Pitta est passé en avant sur les formations et sur l'accueil.", ou: '/formations', libelle: 'Les formations' },
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
      { texte: "L'accueil a été rebâti, avec la carte de contact du Salon et la section Médias.", ou: '/', libelle: 'La page d’accueil' },
      "Un plancher d'accessibilité a été posé sur tout le site.",
    ],
  },
  {
    date: '2026-04-23',
    titre: 'La fidélité, le guide et le quiz',
    intro: "Les trois premiers grands morceaux du site ont été montés le même jour.",
    etapes: [
      "Le programme de fidélité a été bâti, avec ses points et ses paliers.",
      "Le moteur des parcours guidés est né dans la foulée.",
      { texte: "Le quiz interactif des doshas a été monté le même jour, avec son calcul et ses résultats.", ou: '/quiz', libelle: 'Le quiz' },
    ],
  },
  {
    date: '2026-04-21',
    titre: 'Le premier jour',
    intro: "Le site de Krystine St-Laurent et d'Inspirata Ayurveda est né ce jour-là.",
    etapes: [
      "Le projet a été créé et sa première version mise en ligne.",
      { texte: "L'accueil a été resserré autour de trois portes, avec leurs bandeaux.", ou: '/', libelle: 'La page d’accueil' },
      "Les pages d'Origine, du podcast et de Vata ont été reliées au reste du site.",
    ],
  },
];

/** Le nombre total de changements livrés, pour l'en-tête du journal. */
export const nombreEtapes = (): number =>
  JOURNAL.reduce((total, entree) => total + entree.etapes.length, 0);
