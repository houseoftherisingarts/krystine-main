# Le programme Vata, plan de refonte visuelle

Écrit le 10 septembre 2026, après avoir ouvert `/cours/kajabi-2148687644` en aperçu administratrice et regardé les captures à 1440 et à 390 (`scripts/qa/shots/vata/`). Ce document décide la direction avant d'écrire une ligne de JSX, comme le veut la règle du canon du client.

## 1. Ce que la page montre aujourd'hui

La couverture de la saison Vata est belle, mais elle se retrouve enfermée dans une carte à coins arrondis, avec des marges des deux côtés, alors que la règle du site veut le plein cadre. Le titre de la formation vient se poser par-dessus une image qui porte déjà « SAISON VATA » en gros lettrage doré, ce qui fait dire deux fois la même chose au même endroit.

Sous la couverture, le rail de progression aligne cinquante minuscules flammes grises qui ne se comptent pas à l'œil et qui n'apprennent rien. En mobile, ce même rail bascule en une colonne verticale de six cents pixels de haut, ce qui pousse le vrai contenu tout en bas de l'écran; le texte de la leçon déborde à droite et un panneau de panier vide s'ouvre par-dessus la moitié droite de la page.

Le lecteur est un `<audio controls>` natif du navigateur, la petite barre grise que Chrome dessine lui-même, posée dans un panneau qui laisse un tiers de sa largeur vide. C'est exactement ce qu'Alex reproche à Kajabi, et c'est l'élément qui coûte le plus cher visuellement parce qu'il occupe le centre de l'écran à chaque leçon.

Le texte de la leçon arrive en bloc brut, avec des tirets en guise de puces et aucune hiérarchie. Le corps de la page ne contient pas une seule image, pas une seule animation, et se termine sur une grande zone crème vide avant le pied de page.

## 2. Le parti pris

Vata est le dosha de l'air, du froid et du sec, et le programme enseigne à refermer les portes des cinq sens pour ramener le calme à l'intérieur. Les semaines portent déjà ces noms dans le contenu de Krystine, puisqu'elles vont du souffle à l'ouïe, puis aux yeux, au nez, au goût et au toucher, avant la semaine de la présence.

La refonte s'appuie là-dessus au lieu de plaquer une décoration. L'espace devient **un sanctuaire qui se referme sens par sens**, et la progression cesse d'être un compteur pour devenir la température de la page. Au départ, la scène est froide, bleutée, traversée de poussière qui bouge vite. À mesure que les leçons se terminent, la dominante se réchauffe vers le laiton, le grain s'apaise et la poussière ralentit jusqu'à s'immobiliser. Un seul jeton CSS porte cette valeur, calculé sur le pourcentage de leçons terminées, et tout le reste en découle.

C'est ce qui donne le « wow » sans nuire à l'usage quotidien, parce que la mécanique de travail ne change pas et que l'effet se lit sans rien lire.

## 3. Les sept mouvements

**Le seuil.** La couverture sort de sa carte et prend tout l'écran, en Ken Burns lent, sous un voile dégradé et la poussière chaude du composant `Atmosphere` déjà écrit dans `src/components/motion/loeuvre.tsx`. Le titre de la formation disparaît de l'image, puisque l'image le dit déjà, et laisse la place à une carte de reprise qui montre la pochette de la prochaine leçon, son titre et sa durée. L'anneau de progression quitte le rail plat et devient un disque de laiton posé sur le hero, gravé du nombre de semaines refermées.

**L'allumage au premier scroll.** Le hero se fixe sur la hauteur de l'écran, l'image recule et se désature légèrement, et les huit portes des sens montent depuis le bas en cascade décalée de cent millisecondes. La scène répond dans les cent premiers pixels de défilement, ce qui est la porte d'entrée obligatoire du skill `premium-web`.

**Le chemin des sens.** La liste de semaines en petites capitales brunes cède la place à huit grandes cartes au format portrait, chacune avec sa photo plein cadre, son chiffre romain, le sens qu'elle referme et son état. En desktop, elles défilent sur un rail horizontal piloté par le scroll vertical avec GSAP ScrollTrigger, déjà installé dans le projet. En mobile, elles s'empilent en une colonne pleine largeur. Au survol, l'image respire vers 1,04 en une seconde et un liseré laiton se dessine autour de la carte.

**La page qui tourne.** Choisir une semaine ne recharge rien et ne fait sauter personne en haut de la page. La carte s'agrandit vers la vue du chapitre par une transition d'élément partagé de framer-motion, en `layoutId`, avec un léger flou qui se dissipe. C'est le mouvement que demande Alex quand il parle de tourner les pages.

**Le chapitre.** Une image de tête pleine largeur ouvre la semaine, suivie des leçons en rangées éditoriales plutôt qu'en boutons plats. Chaque rangée porte sa pochette carrée à gauche, son titre en Cormorant Garamond, sa durée et son état, avec la même famille de rayons que le reste de l'espace client.

**Le lecteur.** Le lecteur natif du navigateur disparaît au profit d'un lecteur maison qui reste collé en bas de la fenêtre et qui survit au passage d'une leçon à l'autre, comme celui d'un service d'écoute. Il montre la grande pochette, une onde dessinée en canvas qui bat pendant la lecture, une barre de lecture laiton, les sauts de quinze secondes en arrière et de trente en avant, et le réglage de vitesse. C'est le geste qui change le plus l'usage réel du programme, puisque les seize capsules audio sont le cœur du contenu.

**Le texte et la fin de la leçon.** Le texte se pose sur une colonne de soixante-huit caractères, ouverte par une lettrine, avec de vraies puces dessinées à la place des tirets et des exergues sur fond crème pour les passages que Krystine met en valeur. Marquer une leçon terminée cesse d'être un bouton et devient un geste : une braise s'allume, la porte du sens se referme, et la température de la page monte d'un cran.

## 4. Les images

Le bucket contient déjà huit photographies portées depuis Kajabi, dans `inspirata/Vata/kajabi/k1.png` à `k8.png`, et six d'entre elles sont de vraies photographies d'hiver qui font famille : le givre sur les feuilles, les herbes sèches à contre-jour, les branches gelées, l'aigrette de pissenlit. Elles couvrent la première moitié du parcours, celle qui parle du froid et de la sécheresse.

Deux images ne se réemploient pas telles quelles. La photo de Krystine détourée sur fond gris vient d'une publicité Kajabi et n'a pas sa place en grand format dans le parcours, et le mandala flou en surimpression appartient à une autre charte. Il manque donc trois images chaudes pour la fin du parcours, du côté du goût, du toucher et de la présence, que je prends sur Pexels ou Unsplash en licence libre selon la règle qui interdit les photos générées sur les sites : l'huile chaude qui coule sur la peau, les épices et le ghee dans une cuisine sombre, une femme immobile de dos dans une lumière rasante.

Toutes passent par la règle de bande passante, ce qui donne une version pleine largeur en 1920 pixels à qualité 80 et une vignette en 640 à qualité 72, servies en WebP, la pleine largeur uniquement quand la carte s'ouvre.

## 5. Ce qui ne bouge pas

La mécanique que Kajabi a bien faite reste intacte, parce que c'est elle qui fait tenir le programme : les modules repliables, l'ouverture progressive par porte, la progression écrite dans Firestore, le bouton qui marque une leçon terminée, le passage à la leçon suivante, les documents déposés sous la leçon, les questions posées à Krystine, l'aperçu des PDF dans son volet, le lecteur vidéo plein écran et la pastille du direct. Aucune de ces fonctions ne se réécrit, elles se rhabillent.

## 6. L'ordre d'exécution

1. Réparer le mobile, parce qu'une page cassée ne se décore pas : le rail de flammes, le débordement du texte et le panneau de panier qui s'ouvre par-dessus.
2. Écrire le lecteur audio maison et le rendre persistant, puisque c'est lui qui porte le contenu.
3. Bâtir le seuil et l'allumage au premier scroll.
4. Préparer les images, les compresser, puis monter le chemin des huit sens.
5. Brancher la transition d'élément partagé entre la carte et le chapitre.
6. Reprendre la typographie du chapitre et le geste de fin de leçon.
7. Capturer à 1440 et à 390, passer la grille de `boucle-verdict`, corriger, puis déployer.

## 7. Ce qui manque pour aller au bout

La clé d'API de 21st.dev est expirée, et le serveur `magic` répond qu'elle a été retirée ou remise à zéro. Une nouvelle clé se récupère sur 21st.dev/mcp et se remet dans la configuration du serveur. En attendant, la refonte s'appuie sur la bibliothèque maison, c'est-à-dire les recettes de `motionsites-maison.md` et les composants de `src/components/motion/loeuvre.tsx`, avec GSAP, Lenis et framer-motion déjà présents dans le projet.
