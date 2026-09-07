# Espace social du Foyer : inventaire et écarts avec l'espace client

Relevé du 6 septembre 2026, fait sur le code tel qu'il est écrit et sur 45 captures Playwright (1440 × 900 et 390 × 844). Deux comptes jetables ont servi : une membre du Foyer d'Origine (document `achatsFormations/{uid}/formations/foyer` écrit par REST, plus une entrée dans `groupes/foyer/membres`) et une membre sans le Foyer, qui joue la correspondante et le scénario du garde-fou. Les deux comptes et tout ce qu'ils ont écrit ont été effacés à la fin.

Captures : `/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/foyer-social/avant/` (mesures brutes dans `mesures.json`, agrandissements dans `../crops/`). La référence visuelle est l'espace client `/compte`, décrit brique par brique dans `docs/canon-espace-client.md`.

## 1. Ce qu'il faut retenir

1. Deux palettes cohabitent. L'espace client, la messagerie, la cloche, l'espace de groupe et les composants du fil sont en canon KSL (crème `#EEE7DB`, vert encre `#293027`, laiton `#BA7B39`, brun `#8B4A2F`). Trois pages du social sont restées sur les jetons L'Œuvre de juin : l'annuaire `/membres`, la fiche `/membre/:uid` et le fil `CommunauteEspace` (crème `#f6f3ee`, espresso `#2a2015`, laiton `#bb9a5e`, brun `#7d6330`, encre `#3a3126`). Le garde-fou KSL se retrouve donc posé sur des pages L'Œuvre, et la fiche d'une membre mélange les deux laitons dans la même carte.
2. Aucune page du social ne porte la coquille de l'espace client (bannière pleine largeur, avatar qui la chevauche, rangée d'onglets, grille `1fr / 320px`, wrapper `skin-*`). Dès le premier clic vers l'annuaire, une fiche, la messagerie plein écran ou le Foyer, la membre sort de son espace et perd son skin.
3. Deux colonnes centrées fautives : `/membres` fait 768 px sur 1440 (53 %) et `/membre/:uid` fait 672 px (47 %), avec le reste de l'écran vide.
4. La fiche `/membre/:uid` se glisse sous la barre de navigation fixe quand la membre n'a pas de bannière : le haut de la carte est coupé, à 1440 comme à 390.
5. À 390, dès qu'une membre est connectée, la barre de navigation déborde : la cloche est coupée au bord droit, le bouton Messages, la pilule de langue et le menu hamburger sont hors écran.
6. Sur `/cours/foyer` à 390, l'espace de groupe déborde à droite, et comme `html, body { overflow-x: clip }` (index.html:196), le contenu est coupé sans défilement possible.
7. Le fil de la communauté (`CommunauteEspace`) n'est routé nulle part : `/communaute` est un `HardReload` vers `public/communaute/index.html`, une copie statique de la landing L'Œuvre marquée `noindex`.
8. Deux pannes trouvées en passant, qui expliquent les états vides des captures : la boîte de réception demande un index Firestore composite qui n'existe pas (liste toujours vide), et tout envoi de message échoue sur « Missing or insufficient permissions » parce que `estBloquePar` lit le document `blocages` de l'autre personne, protégé par `isSelf`.

## 2. La référence : la coquille de `/compte`

Mesurée sur `compte-formations-1440.png` et `compte-formations-390.png` (le détail des classes vit dans `docs/canon-espace-client.md`).

| Brique | Ce que le code fait | Mesure |
|---|---|---|
| Fond de page | `relative isolate min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-16 pb-24` + classe `skin-{cle}` | `rgb(238,231,219)` |
| Bannière | `h-80 md:h-[25rem]` pleine largeur, voile `from-[#151d19]/75`, avatar `h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-[#EEE7DB]` qui chevauche | 1440 px de large, 400 px de haut |
| Nom | `h1 font-serif text-3xl md:text-4xl text-white`, pastilles dosha et niskas | Cormorant Garamond 36 px (30 px à 390), 1 ligne |
| Onglets | rangée pleine largeur `border-b`, boutons `border-b-2 text-[10px] uppercase`, actif `border-[#BA7B39] text-[#8B4A2F]` | une seule rangée qui défile à 390 |
| Contenu | `grid w-full gap-6 px-6 md:px-8 lg:px-10 lg:grid-cols-[1fr_320px]`; panneau `rounded-[24px] border-white/60 bg-white/55 p-6 md:p-8 backdrop-blur-md`; rail droit (parrainage) | 1 360 px utiles sur 1440 (94 %), 358 px sur 390 |
| Rayons | 24 px (panneau), 20 px (cartes), 16 px (encarts), 15 px (rangées), 14 px (détails) | |
| Corps | Inter 12 à 14 px; petites capitales `text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]` | |
| Fenêtres | `Portail` puis `fixed inset-0 z-[120]`, panneau `max-w-lg rounded-[24px] bg-[#EEE7DB]` | |

## 3. Les routes du social et le chemin qui y mène

Le routeur est `App.tsx` (react-router, `<Routes>` à partir de la ligne 201). Aucun lien de la barre de navigation ne mène au social : seule la cloche (`NavBar.tsx:133`) y vit, et l'avatar vers `/compte` reste derrière le drapeau `settings/community.profilPublic`.

| Route | Composant | Coquille | Garde | Chemin depuis l'espace client |
|---|---|---|---|---|
| `/compte?onglet=amis` | `AmisDOrigine` puis `ClientAmis` (ClientPortal.tsx:178 et 386) | espace client | Foyer; sinon `MotDuFoyer` puis la marraine et les filleules seulement | onglet « Amis »; la cloche (« Quelqu'un vous demande en ami ») |
| `/compte?onglet=messagerie` | `ClientMessagerie` (src/pages/client) | espace client | Foyer; sinon `MotDuFoyer` (la marraine et les filleules passent) | onglet « Messagerie »; la cloche et la bulle Messages; lien « Mon espace » de `/messages` |
| `/membres` | `CommunauteMembres` dans `ReserveAuFoyer` | aucune | Foyer strict (`useMembreDuFoyer`) | lien « Voir les membres » dans l'onglet Amis quand le cercle est vide (ClientPortal.tsx:256). Rien d'autre. |
| `/membre/:uid` | `MembreProfilPage` | aucune | connexion; amitié et écriture réservées au Foyer (`useAmiesDOrigine`) | rangées de l'onglet Amis (ClientPortal.tsx:203); cartes de `/membres`; nom en tête d'une conversation (`/messages` et onglet Messagerie); colonne Membres de l'espace de groupe; bouton « Contacter l'équipe de modération » (uid `kYorHEdND9bfk5A4I3oxVJJSquR2` écrit en dur, CommunauteMembres.tsx:51) |
| `/messages` et `/messages/:autreUid` | `MessagesPage` | aucune | connexion seulement, aucun garde Foyer | lien « Plein écran » de l'onglet Messagerie (ClientMessagerie.tsx:158); bouton « Écrire » d'une fiche; boutons « Écrire » des rangées Amis; bulle « écrire » de la colonne Membres du groupe |
| `/cours/foyer` | `CoursDetailPage` puis `EspaceGroupe` (ligne 621) | coquille des cours | achat du Foyer, accès à vie ou admin; sinon redirection vers `/foyer` | carte « Le Foyer d'Origine » de l'onglet Mes formations (ClientFormations.tsx:56); la section « La communauté · Autour du feu » ferme la page |
| fil de la communauté | `CommunauteEspace` | aucune | connexion | aucune route (voir 5.7) |
| `/communaute` | `HardReload` vers `public/communaute/index.html` | page statique | aucune | aucun lien depuis l'espace client |
| cloche et bulle Messages | `Cloche` dans `NavBar` | barre de navigation | connexion | toujours visibles; leurs liens : `/compte?onglet=messagerie`, `/compte?onglet=amis`, `/compte` |

Trou dans le garde-fou : `MessagesPage` n'a ni `ReserveAuFoyer` ni `useAmiesDOrigine`. Une membre sans le Foyer qui tape `/messages/<uid>` voit la page, et `ensureThread` crée le fil avec n'importe qui. Le filtre `filsVisibles` n'existe que dans l'onglet Messagerie.

## 4. Les deux palettes en présence

| Rôle | Espace client (KSL, 26 août) | Pages L'Œuvre de juin | Où la seconde apparaît |
|---|---|---|---|
| Fond de page | `#EEE7DB` | `#f6f3ee` | `/membres`, `/membre/:uid`, `CommunauteEspace` |
| Texte principal | `#293027` | `#2a2015` | h1 et noms de ces trois pages |
| Texte secondaire | `#38403a` | `#3a3126` | paragraphes de ces trois pages |
| Accent en texte | `#8B4A2F` | `#7d6330` | libellés dosha, « Le mur de », badges de la fiche |
| Laiton | `#BA7B39` | `#bb9a5e` | bordures et bouton « Accepter » de la fiche, bouton de modération |
| Bouton principal | `bg-[#293027] text-[#EEE7DB]` ou laiton plein | `bg-[#2a2015] text-white` | « Amie d'origine », « Se connecter », onglets mobiles du fil |
| Fond sombre | `#151d19` | `#16100a` | `dark:` de ces trois pages |

Tous les composants partagés (`Avatar`, `BadgeVedette`, `BilletCarte`, `Composeur`, `PubCarte`, `VoteBar`, `Cloche`, `EspaceGroupe`, `ReserveAuFoyer`) sont en KSL. Quand ils se posent sur une page L'Œuvre, la page montre les deux crèmes et les deux laitons côte à côte.

## 5. Page par page

### 5.1 `/compte`, onglet Amis (la partie du social qui vit dans la coquille)

Captures : `compte-amis-1440.png`, `compte-amis-390.png`, `garde-compte-amis-*.png`, `skin-nuit-amis-*.png`, `skin-medzo-amis-*.png`.

Coquille : celle de l'espace client, complète. Le contenu tient dans le panneau `rounded-[24px]` : petites capitales brun 10 px, rangées de personne `rounded-[15px] border-[#38403a]/10 p-3` avec un rond de 40 px, boutons « Accepter » laiton plein et « Refuser » bordé, lien « Voir les membres » brun souligné au survol. Largeur utile 1 360 px à 1440, 358 px à 390. Les skins Nuit et Medzo repeignent tout correctement.

Écart interne : le rond de la rangée est un `div` à `bg-cover` avec un pictogramme `fa-user` (ClientPortal.tsx:205), alors que l'annuaire, la fiche, la messagerie et le groupe utilisent `Avatar.tsx` (bord laiton, initiale en Cormorant). Deux dessins d'avatar pour la même personne selon la page.

Sans le Foyer, l'onglet montre le `MotDuFoyer` puis, s'il y en a, la marraine et les filleules. Conforme au canon.

### 5.2 `/compte`, onglet Messagerie

Captures : `compte-messagerie-1440.png`, `compte-messagerie-390.png`, `garde-compte-messagerie-*.png`, `skin-nuit-messagerie-*.png`.

Coquille : espace client. Deux volets « Amies » et « Équipe » en pilules laiton `rounded-full px-4 py-2 text-[11px]`. La boîte fait `h-[60vh] min-h-[420px] rounded-[20px] border-[#38403a]/10 bg-[#EEE7DB]`, en grille `260px / 1fr`. Bulles `rounded-2xl`, la mienne laiton avec texte encre et coin `rounded-br-sm`, l'autre blanche. Champ `rounded-2xl bg-white`, bouton rond de 44 px `bg-[#293027] text-[#d9a05b]`. Le lien « Plein écran » en bas de la liste sort de la coquille vers `/messages`.

Sur le skin Nuit, tout reste lisible. Seul le rond d'avatar par défaut de la bannière (crème repeint en sombre, pictogramme gris foncé) perd son contraste.

Écart : la même conversation existe en deux dessins, celui-ci et celui de `/messages` (voir 5.5).

### 5.3 `/membres`, l'annuaire

Captures : `membres-1440.png` (4 476 px de haut), `membres-390.png` (8 283 px), `garde-membres-*.png`, agrandissement `crops/membres-1440-zoom.png`.

Coquille : aucune. Pas de bannière, pas d'onglets, pas de rail, pas de skin. La page empile deux coquilles : `min-h-screen bg-[#f6f3ee] px-6 pt-32 pb-24` puis `mx-auto max-w-3xl`, puis `ReserveAuFoyer`, puis un second `min-h-screen bg-[#f6f3ee] pt-28 pb-24` et `max-w-4xl mx-auto px-6` (CommunauteMembres.tsx:47 et 48). Le `max-w-3xl` extérieur gagne, et les deux paddings du haut s'additionnent : le titre « Membres » arrive à 250 px du haut de l'écran.

| Mesure | 1440 | 390 |
|---|---|---|
| Largeur du contenu | 768 px (53 %) | 342 px (88 %) |
| Marge à gauche | 336 px | 24 px |
| h1 | Cormorant 36 px `#2a2015`, 1 ligne | Cormorant 30 px, 1 ligne |
| Hauteur de page (71 membres) | 4 476 px | 8 283 px |

Couleurs : page L'Œuvre (`#2a2015`, `#7d6330`, `#bb9a5e`), cartes `bg-white/55 backdrop-blur-md rounded-[20px] border-white/60 shadow-[0_10px_30px_-18px_rgba(58,49,38,0.3)] p-4`, avatar de 52 px dessiné par `Avatar.tsx` en KSL. Typos : nom en Cormorant 16 px, dosha en Inter 11 px capitales `tracking-[0.14em]`. Grille `sm:grid-cols-2 gap-4`.

Bloc centré fautif : toute la page. À 1440, 336 px de crème vide de chaque côté.

Composants qui diffèrent de l'espace client : la carte de membre (avatar 52, nom en serif) n'a pas d'équivalent dans `/compte`, où la rangée de personne fait 40 px avec un nom en Inter medium. Le bouton « Contacter l'équipe de modération » est bordé laiton L'Œuvre (`border-[#bb9a5e]/50 text-[#7d6330]`) au lieu du bouton secondaire du canon (`border-[#38403a]/15 text-[#38403a]/70`).

Avatars : 13 fiches portent une photo `lh3.googleusercontent.com` qui s'affiche cassée en headless (pictogramme d'image brisée dans le rond, visible sur l'agrandissement). Le composant ne prévoit aucun repli quand l'image échoue; à vérifier dans un vrai Chrome.

Sans le Foyer : le `MotDuFoyer` seul, en KSL, dans la colonne de 768 px sur fond L'Œuvre, avec environ 900 px de vide sous lui.

### 5.4 `/membre/:uid`, la fiche publique

Captures : `membre-autre-*.png` (vue d'une membre du Foyer sur une autre), `membre-soi-*.png`, `garde-membre-*.png` (vue d'une membre sans le Foyer).

Coquille : aucune. `min-h-screen bg-[#f6f3ee] pb-24`, bannière `h-48 md:h-64` s'il y a un `bannerURL`, sinon un simple espace `h-24 md:h-28`, puis la carte `max-w-2xl mx-auto px-6 -mt-12`.

| Mesure | 1440 | 390 |
|---|---|---|
| Largeur du contenu | 672 px (47 %) | 358 px |
| Marge à gauche | 384 px | 16 px |
| h1 (le nom) | Cormorant 24 px `#2a2015` | Cormorant 24 px |
| Hauteur de page | 1 624 px, dont environ 1 000 px sans contenu | 2 143 px |

Bug visible : sans bannière, la carte commence à environ 64 px du haut, sous la barre de navigation fixe de 72 px. Le haut de la carte et son coin arrondi sont masqués sur les quatre captures.

Couleurs : mélange des deux palettes dans la même carte. Texte `#2a2015` et brun `#7d6330` (L'Œuvre), bouton « Amie d'origine » `bg-[#2a2015] text-white`, bouton « Accepter » `bg-[#bb9a5e]`, mais `MotDuFoyer` et `BadgeVedette` en KSL (`#BA7B39`, `#8B4A2F`, `#293027`). Deux laitons, `#bb9a5e` et `#BA7B39`, à quelques pixels l'un de l'autre.

Typos : le nom est un h1 de 24 px, quand l'espace client titre la personne à 36 px sur sa bannière. Le badge vedette est inséré dans le h1 (le texte mesuré du h1 devient « Test QA Foyer Première flamme »).

Le mur : cartes `rounded-[20px] border-white/60 bg-white/55 p-5` simplifiées (texte, image `max-h-80 rounded-[14px]`, date, cœurs et commentaires en texte). Ce n'est pas `BilletCarte` : ni votes, ni commentaires ouvrables, ni partage, ni signet.

Composants qui diffèrent de l'espace client : tout, sauf le `MotDuFoyer`. Pas de bannière de personne alors que la membre en a une dans `/compte` (`personnalisation.banniere`), la fiche ne lit que `bannerURL` (la photo personnelle), jamais la bannière choisie dans la boutique.

### 5.5 `/messages` et `/messages/:uid`, la boîte plein écran

Captures : `messages-liste-*.png`, `messages-fil-*.png`.

Coquille : aucune, page autonome sous la barre (`pt-24 pb-10`), fond `#EEE7DB` (KSL). Conteneur `max-w-screen-xl mx-auto px-3 md:px-6`, grille `lg:grid-cols-12 gap-4` (liste 4/12, conversation 8/12), hauteur `calc(100vh-9rem)`, minimum 34 rem. Cartes `rounded-[20px] border-white/60 bg-white/55 backdrop-blur-md shadow-[0_10px_30px_-18px_rgba(41,48,39,0.3)]`.

| Mesure | 1440 | 390 |
|---|---|---|
| Largeur du contenu | 1 280 px (89 %) | 358 px |
| h1 « Vos conversations » | Cormorant 14 px | Cormorant 14 px |
| Corps | Inter 13 px | Inter 13 px |

Le h1 de la page fait 14 px : c'est un libellé de colonne déguisé en titre, et il n'y a aucun titre de page. Le lien de retour « Mon espace » pointe sur `/compte?onglet=messagerie`. À 390, la liste et la conversation alternent avec un chevron de retour, ce qui fonctionne.

Composants qui diffèrent de l'onglet Messagerie, pour la même donnée :

| Élément | Onglet Messagerie (`ClientMessagerie`) | Page `/messages` |
|---|---|---|
| Bulle à moi | `rounded-2xl rounded-br-sm bg-[#BA7B39]` | `rounded-[16px] bg-[#BA7B39]` |
| Bulle de l'autre | `rounded-2xl rounded-bl-sm bg-white` | `rounded-[16px] bg-white/70 border-[#38403a]/10`, avec avatar 28 px |
| Champ | `rounded-2xl bg-white` | `rounded-xl bg-white/60` |
| Bouton d'envoi | 44 px `bg-[#293027] text-[#d9a05b]` | 44 px `bg-[#BA7B39] text-[#293027]` |
| Recherche, compteur de caractères, animation d'arrivée | absents | présents |
| Volet Équipe (soutien) | présent | absent |
| Garde Foyer | `filsVisibles` filtré | aucune |

### 5.6 `/cours/foyer`, l'espace de groupe (`EspaceGroupe`)

Captures : `cours-foyer-1440.png` (3 817 px), `cours-foyer-390.png` (5 241 px), `cours-foyer-groupe-1440.png` (la section cadrée), agrandissements `crops/groupe-membres-1440-zoom.png` et `crops/cours-foyer-390-groupe.png`.

Coquille : celle des cours, `min-h-screen bg-[#EEE7DB] pt-28 pb-24` et `mx-auto max-w-[1720px] px-5 md:px-10`, donc 1 360 px utiles à 1440 (94 %). Tout en KSL. Pas de bannière de membre, pas d'onglets du compte, pas de skin : en entrant au Foyer, la membre quitte son décor.

Position : la section « La communauté · Autour du feu » ferme la page, après la vidéo 16:9, le panneau VIP vert, les douze portes et le bloc des leçons. Elle commence vers 2 900 px du haut à 1440 et vers 3 200 px à 390.

Grille `lg:grid-cols-[220px_minmax(0,1fr)_280px] gap-6`. Les deux colonnes latérales sont `rounded-[20px] border-white/60 bg-white/45 backdrop-blur-md lg:sticky lg:top-24`. Onglets en pilules `rounded-full px-4 py-2.5 text-[12px] font-bold uppercase`, l'actif laiton plein avec ombre. Au centre, `Composeur` puis `BilletCarte` (voir 5.8). À droite, `Avatar` de 34 px, nom, `BadgeVedette`, bulle « écrire » vers `/messages/:uid`.

Écarts visibles :

- À 1440, la colonne de droite fait 280 px et le badge vedette prend la place du nom : le `truncate` réduit « Un membre » à « U » ou à rien, et la pilule chevauche l'icône d'écriture (agrandissement). Les noms deviennent illisibles.
- À 390, les trois blocs débordent du viewport à droite : la pilule « Le feed », le composeur et la colonne Membres sont coupés, et `overflow-x: clip` sur le body empêche de les rejoindre.
- La collection `formations/foyer/onglets` est vide en production : il n'y a que « Le feed » et « Gardés ». `groupes/foyer/membres` compte 5 entrées.
- Les photos Google des membres s'affichent cassées comme dans l'annuaire.

### 5.7 Le fil de la communauté (`CommunauteEspace`) et `/communaute`

Captures : `fil-communaute-1440.png`, `fil-communaute-390.png` (prises sur une route temporaire `/tmp-fil-qa`, ajoutée puis retirée d'`App.tsx` pendant la capture), `communaute-statique-1440.png`.

Le composant n'est monté nulle part. `App.tsx:207` fait de `/communaute` un `HardReload` vers `public/communaute/index.html` : 79 Ko, une copie de la landing L'Œuvre (mêmes sections `#oeuvre`, `#origine`, `#portes`, `#ressources`), `meta robots noindex,nofollow`, assets sous `/accueil/assets`. Sous Vite, cette page rend un écran espresso vide.

Le composant lui-même : fond `#f6f3ee` (L'Œuvre), `pt-28 pb-24`, `w-full px-6 md:px-8 lg:px-10` (pleine largeur, 1 360 px à 1440, 342 px à 390), h1 « Communauté » Cormorant 36 px `#2a2015`, grille `md:grid-cols-2` de deux `MurSocial` titrés « Krystine » et « Feed » (libellé anglais). Pour une membre, la colonne de gauche dit « Rien de publié pour le moment » et celle de droite « Seule Krystine publie sur ce fil. » puis « Rien de publié pour le moment ». Les deux fils sont donc en lecture seule pour tout le monde sauf l'admin, et vides. À 390, deux onglets en pilules `bg-[#2a2015]`.

La classe `italic` du message « Seule Krystine publie » est neutralisée par `index.html:165` (`em, i, .italic { font-style: normal !important }`) : rien d'italique à l'écran.

### 5.8 Les composants du fil (portés du FMM, tous en KSL)

- `BilletCarte` : `motion.article bg-white/55 backdrop-blur-md rounded-[20px] border-white/60 shadow-[0_10px_30px_-18px_rgba(41,48,39,0.3)] p-5 md:p-6`. Médaillon de 44 px (copie locale d'`Avatar`, même dessin), nom en Cormorant 16 px, pastille « Krystine » `bg-[#BA7B39]/15 text-[9px]`, texte 15 px `#38403a`, média `rounded-[16px]`, barre d'actions en 11 px capitales `tracking-[0.14em]` : `VoteBar`, Garder, Partager, Épingler (admin), Commenter. Commentaires en 13 px avec `VoteBar` réduit. Le commentaire de tête du fichier annonce « pas de vidéo, pas de partage, pas d'épinglage », le code fait les trois.
- `Composeur` : `section rounded-[20px] border-white/60 bg-white/55 p-5 md:p-6`, avatar 40 px ou initiale en Cormorant sur `bg-[#BA7B39]/25`, textarea `rounded-2xl bg-white/60`, boutons Photo et Vidéo bordés en 10 px capitales `tracking-[0.18em]`, « Publier » laiton plein `hover:bg-[#9c6630]`. Une photo ou une vidéo par billet, 15 Mo et 200 Mo.
- `PubCarte` : `rounded-[20px] border-[#BA7B39]/35 bg-gradient-to-br from-[#BA7B39]/12`, une suggestion maison tous les quatre billets du fil « communaute » seulement, donc jamais affichée aujourd'hui.
- `VoteBar` : chevrons de 16 px (12 px en petit), score gras, positif laiton, négatif `#a3583f`.
- `BadgeVedette` : pilule `text-[9px] uppercase tracking-[0.14em] border-[#BA7B39]/40 bg-[#BA7B39]/10 text-[#8B4A2F]`, variante `sombre` en `#c8a86a`.
- `Avatar` : rond, `border-[#BA7B39]/30 bg-[#EEE7DB]`, initiale en Cormorant `#8B4A2F`, taille libre, aucun repli si l'image ne charge pas.
- `Cloche` (dans `NavBar`) : deux boutons ronds de 40 px `rgba(246,243,238,0.9)` bordés laiton, pastille laiton `text-[10px]`. Les deux pop-ups sont `absolute right-0 top-[calc(100%+10px)] w-[min(22rem,calc(100vw-2rem))] rounded-[20px] bg-white/90 backdrop-blur-md border-[#BA7B39]/25`. Ils ne passent pas par `Portail`, ce qui va puisque la barre n'est pas transformée, mais à 90 % d'opacité sur la bannière de `/compte`, le texte de la bannière transparaît derrière « Ce qui vous attend » (`cloche-notifications-1440.png`). À 390, le pop-up ancré sur une cloche déjà hors cadre est coupé à droite (`cloche-notifications-390.png`). Tous leurs liens ramènent dans l'espace client.
- `ReserveAuFoyer` et `MotDuFoyer` : `rounded-[20px] border-[#BA7B39]/40 bg-[#BA7B39]/10 text-center p-6 md:p-8`, titre en Cormorant 20 px, bouton `bg-[#293027] text-[#EEE7DB]`. C'est le seul bloc du social conforme au canon partout où il apparaît; posé sur les pages L'Œuvre, il détonne.

## 6. Les skins

Le wrapper `skin-{cle}` n'existe que sur la racine de `ClientPortal`, et `skins.css` repeint des sélecteurs KSL précis (`.bg-\[\#EEE7DB\]`, `.text-\[\#293027\]`, `.bg-\[\#BA7B39\]`, etc.). Les onglets Amis et Messagerie suivent donc le skin (captures `skin-nuit-*` et `skin-medzo-*`, texte lisible partout). Hors de `/compte`, aucune page du social ne reçoit le skin, et les trois pages L'Œuvre utilisent des classes (`#f6f3ee`, `#2a2015`, `#bb9a5e`) qu'aucune règle ne cible : même ramenées dans la coquille, elles resteraient crème et brun sur un skin sombre. Sur Nuit, le rond d'avatar par défaut de la bannière garde un pictogramme gris foncé sur fond sombre.

## 7. Pannes rencontrées pendant les captures

1. Boîte de réception vide partout. `subscribeInbox` (src/firebase/dms.ts:103) combine `where('participantUids','array-contains')` et `orderBy('lastMessageAt','desc')`; Firestore répond « The query requires an index » et `firestore.indexes.json` ne déclare aucun index sur `dms`. La liste reste vide dans l'onglet Messagerie, sur `/messages`, dans la bulle Messages et dans la cloche.
2. Aucun message ne part. `sendDM` (dms.ts:86) appelle `estBloquePar(moi, autre)`, qui lit `blocages/{autreUid}`; la règle `match /blocages/{uid} { allow read, write: if isSelf(uid) }` (firestore.rules:160) refuse la lecture du document de l'autre. L'envoi lève « Missing or insufficient permissions », affiché en rouge sous la conversation (vérifié avec deux comptes jetables sur `/messages/:uid`).
3. Barre de navigation à 390, membre connectée : bouton Notifications mesuré de x 365 à 405 (coupé), bouton Messages de x 413 à 453 (hors écran), pilule de langue et hamburger plus loin encore. Le menu mobile est inatteignable pour une membre connectée (`entete-390.png`).
4. Fiche `/membre/:uid` sous la barre fixe quand la membre n'a pas de bannière (5.4).
5. Espace de groupe coupé à 390 (5.6).
6. Nom des membres écrasé par le badge vedette dans la colonne du groupe à 1440 (5.6).
7. Le commentaire de `ProfilVue` (ClientPortal.tsx:73) promet « surtout LE MUR de la personne »; l'onglet Profil n'affiche aucun mur (`compte-profil-*.png`). Le mur d'une membre ne se voit que sur `/membre/:uid`.
8. L'uid de l'équipe de modération est écrit en dur dans `CommunauteMembres.tsx:51`.

## 8. Liste des captures

Dossier `scratchpad/foyer-social/avant/`, un fichier par écran et par largeur (`-1440.png`, `-390.png`), pleine page sauf mention.

| Fichier | Compte | Ce qu'il montre |
|---|---|---|
| `compte-formations-*` | Foyer | la coquille de référence, onglet par défaut |
| `compte-profil-*` | Foyer | onglet Profil (sans mur) |
| `compte-amis-*` | Foyer | onglet Amis, une demande envoyée |
| `compte-messagerie-*` | Foyer | onglet Messagerie, liste vide (index manquant) |
| `entete-*` | Foyer | bande de 120 px du haut (barre de navigation) |
| `cloche-notifications-*`, `cloche-messages-1440` | Foyer | les deux pop-ups de la cloche, écran seul |
| `membres-*`, `garde-membres-*` | Foyer, puis sans Foyer | l'annuaire et son garde-fou |
| `membre-autre-*`, `membre-soi-*`, `garde-membre-*` | Foyer, puis sans Foyer | la fiche publique dans ses trois états |
| `messages-liste-*`, `messages-fil-*` | Foyer | la boîte plein écran, liste puis conversation |
| `cours-foyer-*`, `cours-foyer-groupe-1440` | Foyer | la page du cours et la section du groupe cadrée |
| `fil-communaute-*` | connectée | `CommunauteEspace` sur route temporaire |
| `communaute-statique-1440` | connectée | ce que sert `/communaute` sous Vite |
| `skin-nuit-messagerie-*`, `skin-nuit-amis-*`, `skin-medzo-amis-*` | Foyer | lisibilité sur deux skins, écran seul |
| `garde-compte-amis-*`, `garde-compte-messagerie-*` | sans Foyer | les deux onglets derrière le garde-fou |
| `mesures.json` | | fond, carte, h1, corps, rayons, conteneur le plus étroit, débordement, hauteur, pour chaque capture |
| `../crops/*` | | agrandissements : avatars cassés, badge qui écrase le nom, groupe coupé à 390 |
