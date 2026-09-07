# Badge Bleu : ce qui existe déjà dans le dépôt

Relevé du code tel qu'il est écrit le 6 septembre 2026, avec `fichier:ligne` à chaque fois. Aucune ligne de code n'a été changée pour produire ce document. Il sert de carte au lot qui bâtira le Badge Bleu : le champ d'identité, l'admin, les achats de formations, l'envoi de fichiers, les skins et les infolettres. La dernière section liste les trous à combler et les décisions à prendre avant d'écrire.

## 0. La carte en une page

| Sujet | Où ça vit | Point d'extension exact |
|---|---|---|
| La coche bleue | `members/{uid}.verifie` | `src/firebase/firestore.ts:714`, règles `firestore.rules:347-360`, écriture admin `MembersSection.tsx:371` |
| Les badges honorifiques | `badges/{uid}.obtenus` | catalogue `src/firebase/badgesCatalogue.ts:9-28`, pose serveur `functions/src/badges.ts:10-17` |
| Un onglet d'admin | `AdminShell.tsx` + `AdminDashboard.tsx` | type `AdminShell.tsx:15-40`, slug `:46-72`, menu `:102-128`, rendu `AdminDashboard.tsx:84-112` |
| La fiche cliente | `src/pages/admin/AdminClientView.tsx` | en-tête `:225-257`, onglets `:189-194`, action admin modèle `CoffreAdmin :24-57` |
| Les achats | `achatsFormations/{uid}/formations/{fid}` | règles `firestore.rules:245-248`, lecture `src/firebase/formations.ts:66-69`, compte des payantes `functions/src/badges.ts:28-36` |
| Un fichier envoyé par une membre | Storage `bugs/{uid}/…` | patron `ProblemeTechnique.tsx:141-161`, règle `storage.rules:39-44` |
| Un skin | `SKINS` + `boutique/{uid}.possede` + `skins.css` | `src/lib/pointsConfig.ts:186-289`, `firestore.rules:418-421`, bloc CSS modèle `skins.css:325-346` |
| Un brouillon d'infolettre | `newsletters/{id}` | structure `firestore.ts:384-409`, création `Composer.tsx:123-141`, dépôt Iris `~/.claude/scripts/krystine_infolettre.py:98-112` |

## 1. Le champ `members.verifie`, la coche bleue d'aujourd'hui

### 1.1 Le document

`src/firebase/firestore.ts:703-731` déclare `MemberDoc`. Les champs qui touchent le Badge Bleu :

```
714  verifie?: boolean;               // coche bleue, donnée par l'admin seulement
715  moderateur?: boolean;            // rang de modératrice, donné par l'admin seulement
718  accesVie?: boolean;              // compteur de parrainage, écrit par le serveur
722  personnalisation?: { banniere?: string; skin?: string; musiqueSite?: boolean };
```

Les accès : `getMember` (`:742-746`), `updateMember` (`:748-751`, un `setDoc` avec `merge: true`), `subscribeToMember` (`:753-756`), `getAllMembers` (`:758`, trié par `joinedAt` décroissant).

### 1.2 Les règles

`firestore.rules:347-360`. Toute personne connectée lit une fiche (l'annuaire en dépend). La membre crée et met à jour la sienne, mais la règle refuse toute écriture qui touche `verifie`, `moderateur`, `filleules`, `filleulesAcheteuses` ou `accesVie` (`:353` pour la création, `:356` pour la mise à jour, par `affectedKeys().hasAny`). L'admin écrit tout. La liste des courriels admin est en `firestore.rules:12-22` (six adresses, dont `alex@lesalondesinconnus.com` et `houseoftherisingarts@gmail.com`).

Conséquence pour le Badge Bleu : tout nouveau champ d'identité qui doit rester hors de portée de la membre (une date d'obtention, un motif, un lien vers la pièce) se range dans cette même liste de clés interdites, aux deux lignes `:353` et `:356`.

### 1.3 Comment l'admin la donne

`src/pages/admin/sections/MembersSection.tsx:365-392`, colonne « Communauté » de la liste des clientes. Deux boutons ronds `h-7 w-7`, un par rang :

- `:368-379` la coche : `title` « Vérifier ce profil (coche bleue) » ou « Retirer la coche bleue », `onClick` appelle `updateMember(c.uid!, { verifie: !c.verifie })` puis `refresh()` (`:151-159`, qui relit tous les membres et tous les abonnés). Actif : `border-[#3b82f6] bg-[#3b82f6] text-white`.
- `:380-391` la modératrice : même geste sur `moderateur`, en laiton.

La ligne du tableau porte `verifie` et `moderateur` depuis `ContactRow` (`:28-29`), remplis dans `mergeContacts` (`:92-93`). Le clic sur la ligne ouvre la fiche (`:330`, `:411-413`).

À noter : `moderateur` n'est lu nulle part ailleurs dans `src/` (grep). Le rang existe dans la donnée et dans l'admin, sans effet visible côté membre.

### 1.4 Où la coche s'affiche déjà

Le motif est toujours le même : `<i className="fa-solid fa-circle-check shrink-0 text-[12px] text-[#3b82f6]" />` à droite du nom, dans un `flex items-center gap-1.5`. Deux bleus, consignés dans `docs/canon-espace-client.md` (tableau des jetons, ligne « Bleu de vérification ») : `#4da3ff` sur une bannière sombre, `#3b82f6` dans une liste sur crème.

| Écran | Fichier:ligne | Taille | Condition |
|---|---|---|---|
| Profil public, `h1` | `src/pages/MembreProfilPage.tsx:118` | `text-lg`, `#3b82f6`, `title="Profil vérifié"` | `profil.verifie` |
| Espace client, bannière | `src/pages/ClientPortal.tsx:578-580` | `text-xl`, `#4da3ff`, titre FR/EN | `member?.verifie \|\| isAdmin` |
| Espace client, rangée d'amie | `src/pages/ClientPortal.tsx:209` | 12 px, `#3b82f6` | `m?.verifie` |
| Annuaire | `src/pages/CommunauteMembres.tsx:75` | 13 px, `#3b82f6`, `title` | `m.verifie` |
| Bannière du Foyer | `src/components/communaute/CadreFoyer.tsx:187-189` | `text-xl`, `#4da3ff` | `fiche?.verifie \|\| (!autre && isAdmin)` |
| Rail « Autour du feu » | `CadreFoyer.tsx:291` via `RangeePersonne` | 12 px | `c.fiche?.verifie` |
| La rangée de personne partagée | `src/components/communaute/CarteSociale.tsx:55` (prop) et `:68` (rendu) | 12 px, `#3b82f6` | `verifie` |

`RangeePersonne` (`CarteSociale.tsx:51-75`) est la brique voulue pour toute liste de personnes : elle prend `verifie`, `sousTitre`, `action`, `compact`. Elle n'est employée que par `CadreFoyer.tsx` pour l'instant.

### 1.5 Où elle ne s'affiche pas (les trous)

- `src/components/communaute/BilletCarte.tsx:122-128` : l'en-tête d'un billet montre `Medaillon`, le nom, `BadgeVedette` (si le billet n'est pas officiel), la pastille « Krystine » (si officiel) et l'épingle. Aucune coche. Le billet ne porte pas `verifie` : il faudrait lire la fiche ou ajouter le champ au billet à la publication (`:107` construit `nom` depuis `member`).
- `src/components/direct/ChatDirect.tsx:93-99` : le nom, `BadgeVedette` en sombre, la pastille « Krystine » si `animatrice`, sinon le badge de messages (`BADGES` et `badgePour` de `src/firebase/direct.ts:37-44`). Aucune coche.
- `src/components/communaute/EspaceGroupe.tsx:102-108` : la liste des membres d'un groupe dessine `Avatar` + nom + `BadgeVedette` à la main, sans passer par `RangeePersonne`, donc sans coche.
- `src/components/communaute/Avatar.tsx:6-13` : le médaillon seul, aucun badge. Il sert à l'annuaire, au profil, à la boîte de réception et à `RangeePersonne`.
- `src/pages/MessagesPage.tsx`, `src/pages/client/ClientMessagerie.tsx`, `src/pages/admin/sections/FoyerSection.tsx` : aucun `verifie` (grep).
- `src/pages/admin/AdminClientView.tsx:241-248` : l'en-tête de la fiche cliente montre le nom et la pastille du dosha, pas la coche.

`#3b82f6` et `#4da3ff` ne sont repeints par aucun sélecteur de `src/components/client/skins.css` (grep) : la coche garde son bleu sur tous les skins, y compris les sombres où `#3b82f6` sur `#0e0d0b` passe encore, mais où un badge plus large demandera une vérification à l'œil sur `encre`, `or-pur` et `foret`.

## 2. Les badges honorifiques, le système parallèle déjà en place

Si le Badge Bleu doit se ranger parmi les badges plutôt que remplacer la coche, tout existe.

### 2.1 La donnée

`badges/{uid}` = `{ obtenus: { [badgeId]: Timestamp }, exposes?: string[], vedette?: string, compteurs?: {...} }` (`src/firebase/badgesCatalogue.ts:40`, `functions/src/interactions.ts:8`).

`firestore.rules:185-197` : lecture par toute personne connectée; la membre ne met à jour que `exposes` (liste de 5 au plus) et `vedette` (qui doit être dans `obtenus`); `create` et `delete` sont à `false`, donc le serveur seul pose un badge (Admin SDK).

### 2.2 Le catalogue et la pose

- Catalogue client : `src/firebase/badgesCatalogue.ts:9-28`, quinze entrées `{ nom, icone }` indexées par id (`premiere-flamme`, `oeuvre-complete`, `voix-du-cercle`…). `COMMENT_GAGNER_BADGES` (`:31-38`) donne la phrase FR/EN des six badges d'interaction. `getBadgesDe` (`:42-47`), `getBadgeVedetteDe` (`:50-57`, le choix ou sinon le plus récent), `choisirBadgeVedette` (`:59-61`), cache par session (`:65-71`).
- Pose serveur : `functions/src/badges.ts:10-17` `poserBadge(uid, badgeId)` (idempotent, `merge: true`). Déclencheurs : `badgeAchatFormation` (`:21-39`, sur création de `achatsFormations/{uid}/formations/{fid}`), `badgePremierBillet` (`:42-51`), `badgeAmitieAcceptee` (`:54-66`). Les badges d'interaction : `functions/src/interactions.ts:10-17` (seuils) et `compter` (`:19-35`). Le parrainage : `functions/src/parrainage.ts`. Tous exportés dans `functions/src/index.ts:22-23, 29`.

### 2.3 L'affichage

- `src/components/communaute/BadgeVedette.tsx:7-22` : la pastille laiton (`rounded-full border px-2 py-[2px] text-[9px] uppercase tracking-[0.14em]`, icône + nom), variante `sombre` pour le clavardage. Posée à côté du nom dans `MembreProfilPage.tsx:117`, `BilletCarte.tsx:126`, `ChatDirect.tsx:96`, `EspaceGroupe.tsx:108`.
- La vitrine de la membre : `src/pages/ClientPortal.tsx:138-171` (titre « Badges », boutons pour choisir la vedette `:144-156`, repli « Badges à gagner » `:162-170`). Le profil public : `MembreProfilPage.tsx:168-179`.

Point d'extension si le Badge Bleu est un badge : une entrée dans `CATALOGUE_BADGES` (`badgesCatalogue.ts:28`) avec son icône, une phrase dans `COMMENT_GAGNER_BADGES` (`:38`) si la membre peut le viser, et une fonction serveur qui appelle `poserBadge` (ou un `onCall` admin qui écrit `badges/{uid}.obtenus['badge-bleu']`). La pastille `BadgeVedette` le montrera partout où elle est déjà posée, en laiton : un rendu bleu demandera une branche dans `BadgeVedette.tsx:15-17`.

## 3. L'admin

### 3.1 Ajouter un onglet

Quatre gestes, tous dans deux fichiers :

1. `src/pages/admin/AdminShell.tsx:15-40` : ajouter l'id à `AdminSectionId`.
2. `AdminShell.tsx:46-72` : son slug d'adresse dans `SECTION_SLUGS` (par exemple `badgeBleu: 'badge-bleu'` donne `/admin/badge-bleu`).
3. `AdminShell.tsx:102-128` : sa ligne dans `NAV` avec `label`, `icon` Font Awesome et `groupe` parmi `ventes | communaute | formations | contenu | reglages` (`:94-101`). La famille `communaute` est la place naturelle.
4. `src/pages/AdminDashboard.tsx:31-55` (import) et `:84-112` (le `switch` unique de `renderSection`). Le commentaire `:79-83` rappelle pourquoi il n'y a qu'un seul switch.

Le shell (`AdminShell.tsx:142-271`) gère le menu replié par famille (mémoire `localStorage` `admin.nav.ouverts`, `:129-133`), la pastille des messages non lus (`:147-148`) et l'en-tête avec le titre de la section courante (`:259`). Le contenu est posé dans `mx-auto max-w-6xl p-6 md:p-10` (`:265`).

### 3.2 La fiche cliente `AdminClientView`

`src/pages/admin/AdminClientView.tsx`, 788 lignes. Ouverte par `MembersSection.tsx:330, 411-413` et `SubmissionsSection.tsx:706`, avec `uid` et `onClose`. Rendue dans `Portail` (`:199`) comme fenêtre plein écran `z-[85]` fermée par Escape (`:183-187`).

Ce qu'elle charge (`:171-180`) : `getMember`, `getClientOrdersForMember`, `getDoshaResultsForMember`, `getMemberPoints`, `listPointsEvents(uid, 50)`, `listMyRewardRedemptions`, `getGuideResponsesForMember`, les produits Shopify.

Ses quatre onglets (`type Tab :132`, `tabs :189-194`) : `profile` (`ProfileView :318-345`, champs en lecture par `ReadField :347-356`), `orders` (`:359-402`), `loyalty` (`LoyaltyView :574-786`), `dosha` (`:405-571`).

Les niskas : `LoyaltyView` montre le solde et le palier (`:634-651`), la progression (`:654-664`), la détection de dérive avec bouton « Rétablir » (`reconcileBalance :600-610`, `:666-686`), l'ajustement manuel signé (`adjustPoints :612-629`, `:691-740`), les récompenses à honorer (`:743-754`) et l'historique des cinquante derniers événements (`:757-783`).

Les formations achetées : elles ne sont pas dans la fiche. L'admin les voit par formation, jamais par cliente : `getAcheteursDe(formationId)` (`src/firebase/formations.ts:81-91`, un `collectionGroup('formations')` filtré par id, permis par `firestore.rules:218-220`), employé par `FoyerSection.tsx:63-74`. Pour les montrer dans la fiche, `getMesFormations(uid)` (`formations.ts:66-69`) est lisible par l'admin (`firestore.rules:245-248`) et donne `{ id, titre, imageUrl, acheteLe }` par achat.

Le seul champ d'identité que la fiche montre est le dosha (`:244-248`). La coche bleue et les badges n'y sont pas.

### 3.3 Le patron d'action admin : « Offrir un coffre »

Le modèle à copier pour toute action que Krystine fait depuis la fiche d'une cliente.

Côté fiche, `CoffreAdmin` (`AdminClientView.tsx:24-57`), monté en `:222` juste sous `CadeauAdmin` (`:221`) :

- état local : `type`, `avecCle`, `message`, `envoi`, `dit` (`:25-29`);
- `envoyer` (`:30-39`) : garde contre le double clic, appel `offrirCoffre(uid, type, avecCle, message.trim())`, phrase de confirmation dans `dit` qui dit où la cliente trouvera la chose, message d'erreur repris de l'exception;
- le rendu (`:41-56`) : un encart `mx-6 mt-4 rounded-[18px] border border-[#293027]/10 bg-white/50 p-4 md:mx-8`, un titre en petites capitales `text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]` avec icône, des pastilles de choix `rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest`, un champ `champ` (`:40`), un bouton `rounded-full bg-[#293027] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB]` désactivé pendant l'envoi.

`CadeauAdmin` (`:59-125`) est la variante repliée derrière un bouton « Offrir », avec un `select` de formations et un pourcentage.

Côté client, `src/firebase/coffres.ts:36-39` fabrique le `httpsCallable` en `us-central1`.

Côté serveur, `functions/src/coffres.ts:312-326` :

```
313  const email = String(req.auth?.token?.email || '').toLowerCase();
314  if (!req.auth || !ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Réservé à l’admin.');
…
320  if (!(await db.doc(`members/${uid}`).get()).exists) throw new HttpsError('not-found', 'Cette membre n’existe pas.');
321  await db.doc(`coffres/${uid}`).set({ … }, { merge: true });
322  await db.collection('coffresDons').add({ uid, type, avecCle, deUid: req.auth.uid, at: … });
324  await ecrireMessageKrystine(db, req.auth.uid, uid, corps);
```

La liste `ADMIN_EMAILS` est recopiée dans chaque fichier de fonctions (`coffres.ts:113-116`, `cadeaux.ts:14`, `paiements.ts:18`, `newsletter/send.ts:12-19` avec `assertAdmin :21-27`). Une nouvelle fonction admin reprend `assertAdmin` de `send.ts` ou recopie la liste.

`ecrireMessageKrystine` (`coffres.ts:145-161`) est la façon de prévenir une membre : elle écrit ou complète le fil `dms/{threadId}` (participants triés, `unread` incrémenté) et ajoute le message signé « Krystine » dans `dms/{id}/messages`. La cloche (`src/components/communaute/Cloche.tsx:11-26`) lit trois sources : les messages non lus des `dms`, les demandes d'amitié, les billets du feed public. Il n'existe pas de collection `notifications` : un badge attribué se signale par ce message dans la messagerie, comme le coffre et le cadeau.

## 4. Les achats de formations

### 4.1 Le chemin et les règles

`achatsFormations/{uid}/formations/{fid}`. `firestore.rules:240-248` : la membre lit les siens, l'admin lit et écrit, le reste vient du serveur. `firestore.rules:215-220` ouvre à l'admin la lecture groupée `collectionGroup('formations')`.

### 4.2 La forme d'un achat selon sa source

| Source | Écrit par | Champs | Valeur de `source` |
|---|---|---|---|
| Stripe | `functions/src/paiements.ts:242-249` | `titre, imageUrl, montant, sessionId, acheteLe` (+ `source: 'cadeau', cadeauId` si le paiement vient d'un rabais) | absent |
| Cadeau à 100 % | `functions/src/cadeaux.ts:110-117` | `titre, imageUrl, montant: 0, cadeauId, accordeLe` | `'cadeau'` |
| Niskas (épisodes, musique) | `functions/src/niskas.ts:198-215` | `titre, imageUrl, categorie: 'video' \| 'musique', episodes, accordeLe` | `'niskas'` |
| Coffre (musique) | `functions/src/coffres.ts:244` | `titre, imageUrl, categorie: 'musique', accordeLe` | `'coffre'` |
| Compte de test | brief du lot | `titre: "Le Foyer d'Origine", source: "qa"` | `'qa'` |

Le type client `AchatFormation` (`src/firebase/formations.ts:59-64`) ne déclare que `id, titre, imageUrl, acheteLe`; `AcheteurFormation` (`:71-76`) ajoute `montant` et `source`. Le champ `source` est donc lu côté admin et jamais affiché côté membre.

### 4.3 Compter les programmes payants suivis

Une formation (`src/firebase/formations.ts:14-30`) porte `paywall?: boolean` (`:22`), `prix` (`:18`), `statut: 'masque' | 'publie'` (`:17`), `categorie?: 'cours' | 'musique'` (`:20`). L'admin règle `paywall` dans le panneau « Options » (`FormationsSection.tsx:259-303`).

Le compte côté serveur existe déjà, dans `functions/src/badges.ts:28-36` : nombre d'achats de la membre contre `formations.where('paywall', '==', true).where('statut', '==', 'publie').count()`. Il compte tous les achats, y compris les épisodes et la musique achetés en niskas.

Pour « les programmes payants suivis » au sens strict, le calcul propre est l'intersection : `getMesFormations(uid)` filtré sur les ids dont `getFormations()` donne `paywall === true` (et au besoin `categorie === 'cours'`). Deux compléments :

- `members.accesVie` (`firestore.ts:718`) vaut un accès à tout par parrainage : `notifs.ts:68-73` le traite comme l'équivalent de l'achat du Foyer.
- Le Foyer d'Origine a l'id `foyer` (`coffres.ts:111`, `notifs.ts:71`, `ReserveAuFoyer.tsx:19`, `foyer/Cta.tsx:14` par `aAchete(uid, 'foyer')`).
- Si « suivi » veut dire « commencé », la progression vit dans `progression/{uid}/formations/{fid}` (`firestore.rules:99-101`, lisible par la membre et l'admin).

## 5. L'envoi de fichiers par une membre

### 5.1 Les règles Storage

`storage.rules` (66 lignes) :

- `:8-17` l'admin, cinq adresses (sans `alex@lesalondesinconnus.com`, contrairement à Firestore).
- `:23-26` `formations-contenu/**` : écriture admin, 2 Go, lecture par URL signée seulement.
- `:30-35` `mur/{uid}/{fichier}` : la membre écrit dans son dossier, image ou vidéo, moins de 200 Mo, lecture publique.
- `:39-44` `bugs/{uid}/{fichier}` : la membre écrit dans son dossier, image seulement, moins de 10 Mo; lecture par l'admin ou par elle.
- `:48-51` `vault/` : lecture admin ou Iris, écriture fermée.
- `:53-64` le tout-venant : lecture publique sauf `formations-contenu` et `vault`, écriture admin seulement (500 Mo, image, vidéo, audio ou PDF).

Observation à vérifier avant le lot : `uploadImage` (`src/firebase/storage.ts:5-20`) écrit dans `${folder}/${Date.now()}_${safeName}` et `ClientPortal.tsx:310` l'appelle avec `'bannieres'`, `:710` avec `` `members/${user.uid}` ``. D'après le fichier `storage.rules` du dépôt, ces deux chemins tombent dans le tout-venant, donc une membre non admin s'y verrait refuser l'écriture. Soit les règles déployées diffèrent du dépôt, soit ces téléversements échouent en production pour les membres. À tester avec un compte jetable avant de s'appuyer sur ce chemin.

### 5.2 Le patron membre qui marche : la capture d'un problème technique

`src/components/client/ProblemeTechnique.tsx` :

- `:19` `TAILLE_MAX = 10 * 1024 * 1024`; messages `tropGros` FR/EN `:42, :60`.
- `:137-145` `choisir` : refuse tout ce qui n'est pas `image/*`, refuse au-delà de 10 Mo, vide `e.target.value` pour permettre le même fichier deux fois.
- `:156-161` l'envoi : extension déduite du type, chemin `bugs/${uid}/${Date.now()}.${ext}`, `uploadBytes(r, image, { contentType })`, puis `getDownloadURL`.
- Le document Firestore `bugs/{id}` qui porte `capture` et `capturePath` est borné par `firestore.rules:106-110` (`hasOnly` sur douze clés).

Pour une pièce justificative du Badge Bleu, le geste minimal est une règle jumelle de `bugs` dans `storage.rules`, placée avant le tout-venant de la ligne 53 : `match /badge-bleu/{uid}/{fichier}` avec lecture admin ou soi, écriture par soi, `image/.*|application/pdf`, 10 Mo. Puis un document Firestore borné par `hasOnly`, sur le modèle de `bugs`.

## 6. Les skins

### 6.1 La liste et la rareté

`src/lib/pointsConfig.ts` :

- `:186` `type RareteSkin = 'commun' | 'rare' | 'legendaire'`; `:187` `PaletteSkin` (fond, panneau, encre, accent, accentClair, accentProfond, sombre); `:188-191` `interface Skin { cle, nomFR, nomEN, descFR, descEN, icone, cout: number | null, rarete, coffre?: 'bronze' | 'argent' | 'or', palette }`.
- `:192-286` `SKINS` : huit communs à prix en niskas (`medzo` 5, `nuit` 5, `coffee` 5, `aube` 15, `terre` 20, `foret` 25, `ocean` 35, `encre` 55), sept rares à `cout: null` (`lotus`, `feminite`, `teal-orange`, `nature` dans le coffre d'argent; `aurore`, `or-pur`, `golden-hour` dans le coffre d'or), trois légendaires à `cout: null` (`vata`, `pitta`, `kapha`, coffre de bronze).
- `:287-289` `skinParCle`, `SKINS_LEGENDAIRES`, `SKINS_RARES` (tous ceux à `cout === null`).
- `:300-309` `BOUTIQUE` : chaque skin devient l'article `skin-${cle}` avec `cout: k.cout ?? 0`.

Les tirages des coffres sont dans `functions/src/coffres.ts:52-107` (`CONTENUS` par coffre, `LEGENDAIRES :86`, `COMMUNS :87`, valeurs en niskas `:96-100`, noms `:103-108`). Un skin qui n'est ni achetable ni dans ces tables n'entre dans aucun tirage.

### 6.2 Comment un skin se possède

`boutique/{uid}.possede['skin-<cle>'] = Timestamp`. `firestore.rules:418-421` : la membre lit, l'admin écrit, le serveur écrit par Admin SDK. Deux écrivains aujourd'hui : l'achat en niskas (`functions/src/niskas.ts:192`) et le tirage d'un coffre (`functions/src/coffres.ts:222-229`, qui saute un article déjà possédé). La lecture temps réel : `suivreBoutique` (`src/firebase/points.ts:355-360`), branché dans `BoutiqueNiskas.tsx:76` et dans `ClientPortal` (`possedeBoutique`).

L'activation est un autre champ : `members.personnalisation.skin` (`firestore.ts:722`), que la membre écrit elle-même. `ClientPortal.tsx:524-525` calcule `skin-${cle}` et le pose sur l'enveloppe de la page (`:534`); `EffetsSkin` et `MotifsSkin` suivent (`:536-537`).

Donner le skin « Badge Bleu » à une membre revient donc à écrire `boutique/{uid}.possede['skin-badge-bleu']` côté serveur (le même geste que `coffres.ts:229`) ou par l'admin (`setDoc` avec `merge`), sans rien changer au compteur de niskas.

### 6.3 Comment la boutique montre un skin non possédé et non achetable

`src/components/client/BoutiqueNiskas.tsx:324-351` :

- `:328-340` l'aperçu miniature se dessine depuis la palette (bandeau, puces, deux cartes).
- `:342-350` l'état : possédé, la bascule « Activer le skin / Skin actif » (`:343`); sinon, si `k.cout === null`, une pastille à bordure pointillée avec cadenas « Dans le coffre d'argent » (`:346-348`, `title` « Ce skin ne s'achète pas : il se trouve dans un coffre. »); sinon le bouton d'achat (`:350`).
- `:356` le libellé de rareté au-dessus du nom : « Légendaire · coffre d'or » ou « Rare · coffre d'argent/d'or », calculé depuis `rarete` et `coffre`.

Piège : `:347` et `:356` retombent sur le coffre d'or quand `coffre` est absent (`k.coffre || 'or'`). Un skin réservé au Badge Bleu, déclaré `cout: null` sans `coffre`, s'afficherait « Dans le coffre d'or ». Il faut une branche à ces deux lignes (par exemple un champ `reserve: 'badge-bleu'` sur `Skin`) qui écrit « Réservé au Badge Bleu » et pointe vers la page qui l'explique.

### 6.4 `skins.css`, bloc par bloc

`src/components/client/skins.css`, 719 lignes, un bloc par skin. Les trois premiers (`medzo :7`, `nuit :48`, `coffee :100`) sont écrits avec des variables nommées; à partir d'`aube` (`:194`) chaque bloc commence par le commentaire « Le skin X : généré depuis sa palette (pointsConfig.ts, SKINS) » et tient en une vingtaine de lignes. Aucun script du dossier `scripts/` ne produit ce fichier (grep) : le bloc s'écrit à la main depuis la palette, en copiant le précédent.

Le bloc modèle d'un skin sombre est `lotus`, `:325-346` : la ligne de variables `--sk-fond`, `--sk-panneau`, `--sk-encre`, `--sk-accent`, `--sk-accent-clair`, `--sk-accent-profond` et `color-scheme: dark` (`:325`), puis les sélecteurs échappés de Tailwind qui repeignent l'enveloppe (`:326`), les fonds encre (`:327`), les textes par attribut `[class^="text-[#293027]"]` (`:328-332`), l'accent (`:333`), le bouton laiton et le texte qu'il contient (`:334-336`), les bordures (`:337, :341`), les verres `bg-white/55` et compagnie (`:340`), les dégradés de bannière (`:342-343`) et les panneaux blancs (`:344-346`). Un skin clair copie plutôt `aube` (`:195-219`).

Le voile de profondeur (`:585-627`) ne couvre que les six premiers skins : un nouveau skin s'y ajoute en deux sélecteurs (`:591-596` et `:598-603`) et un `::before` à sa couleur. Les motifs animés sont réservés aux skins listés dans `MotifsSkin.tsx:10-11`, les scènes vidéo aux cinq de `EffetsSkin.tsx`; un skin Badge Bleu peut n'avoir ni l'un ni l'autre.

Pour juger le rendu sans compte : `/demo-skins?skin=<cle>` (`src/pages/DemoSkins.tsx:7-9`), qui lit `SKINS` et le CSS.

La règle de contraste du canon (`CarteSociale.tsx:12-15`, `docs/canon-espace-client.md`) tient pour tout ce que le Badge Bleu ajoutera à l'espace client : uniquement les classes que `skins.css` repeint, jamais de `lg:bg-…`, jamais une autre crème ou un autre laiton.

## 7. Les infolettres

### 7.1 La collection `newsletters`

`src/firebase/firestore.ts` :

- `:358` `NewsletterStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'`.
- `:359-366` `BlockType` (`heading, paragraph, image, button, divider, quote, cta, spacer`) et `NewsletterBlock { type, content?: Record<string, any> }`.
- `:378-382` `NewsletterAudience { mode: 'all' | 'tags' | 'emails', tags?, emails? }`.
- `:384-409` `NewsletterDoc` : `title` (libellé interne), `subject`, `preheader`, `fromName`, `blocks`, `status`, `segmentTag` (ancien), `audience`, `scheduledFor`, `couverture: 'podcast' | 'image' | 'aucune'`, `couvertureUrl`, `signature`, `lettreDor: { messagerie, section } | null` (la lettre d'or, livrée à l'interne sans courriel), `sentAt`, `stats`, `createdBy`, `createdAt`, `updatedAt`.
- `:413-416` `ENTETE_INFOLETTRE_PAR_DEFAUT` (l'image « La lettre de Krystine »).
- `:418-448` `createNewsletter` (`addDoc` + horodatages), `updateNewsletter`, `deleteNewsletter`, `getNewsletter`, `getNewsletters` (tri `updatedAt` décroissant).
- `:453-474` la boîte de réception d'une membre : `members/{uid}/inbox/{newsletterId}` avec `title, subject, receivedAt, readAt, lettreDor`; règles `firestore.rules:364-369` (le serveur crée, la membre marque `readAt`).

`firestore.rules:298-301` : une infolettre se lit par tous quand `status == 'sent'`, sinon par l'admin; l'écriture est admin. Iris possède son propre compte `iris@krystinestlaurent.ca` (`:308-311`), qui ne touche qu'à `irisDemandes`.

### 7.2 La structure exacte d'un brouillon

`src/pages/admin/sections/newsletter/Composer.tsx:123-141`, fonction `save` :

```
127  const scheduledFor = when ? Timestamp.fromDate(new Date(when)) : null;
128  const enTete = { couverture, couvertureUrl: couverture === 'image' ? couvertureUrl : null, signature, lettreDor: lettreDor ? { messagerie: dorMessagerie, section: dorSection } : null };
130  updateNewsletter(id, { title, subject, preheader, fromName, blocks, audience, scheduledFor, ...enTete })      // brouillon existant
132  createNewsletter({ title, subject, preheader, fromName, blocks, status: 'draft', audience, scheduledFor, ...enTete })   // nouveau
```

Les états par défaut : `status 'draft'` (`:43`), `audience { mode: 'all' }` (`:51`), couverture et image par défaut (`:57-58`), `signature true` (`:59`), `lettreDor false` (`:61`). `isReadOnly` quand `sent` ou `sending` (`:92`). « Programmer » passe `status: 'scheduled'` (`:221-223`), « Déprogrammer » le ramène à `draft` (`:227-232`). L'envoi immédiat exige un sujet, au moins un bloc et une audience non vide (`:218-219`).

La palette de blocs et le gabarit de chaque `content` (`:24-31`) : `heading { level: 2, text, align: 'center' }`, `paragraph { text }`, `image { url, caption }`, `button { label, href, variant: 'primary' }`, `cta { eyebrow, title, body, href, buttonLabel }`, plus `quote`, `divider`, `spacer`.

### 7.3 Comment Iris dépose un brouillon

Deux voies, la même collaboratrice.

1. Dans l'admin : la fonction `newsletterAssistant` (`functions/src/newsletter/assistant.ts`, exportée `index.ts:14`). Le prompt système (`:16-40`) porte la biographie de Krystine et ses onze règles de voix; l'outil `set_newsletter` (`:42` et suivantes) rend `title, subject (< 60 caractères), preheader, blocks, audience, scheduledFor, note`. `AssistantPanel` remet la proposition au composeur, qui l'applique aux états (`Composer.tsx:235-240`); rien n'est écrit tant que Krystine n'appuie pas sur Enregistrer.
2. Par le script `~/.claude/scripts/krystine_infolettre.py brouillon fichier.json` (`:98-112`) : vérifie `title`, `subject`, `blocks`, refuse un sujet de plus de 60 caractères, puis fait un `POST` REST sur `newsletters` avec `{ title, subject, preheader, fromName: 'Krystine St-Laurent', blocks, audience (défaut all), status: 'draft', createdAt, updatedAt, auteur: 'iris-campagne' }`. Le champ `auteur` n'est pas dans `NewsletterDoc` : il sert de trace, l'admin l'ignore. Le script a aussi `stats`, `list` et `engagees` (`:65-96`).

Cibler les détentrices du Badge Bleu : le mode `emails` de l'audience (`firestore.ts:379-381`), alimenté par les courriels des `members` où `verifie == true` (ou par une étiquette `badge-bleu` posée sur l'abonnée dans `newsletter/{id}.tags`, puis le mode `tags`). Le composeur affiche le compte de l'audience choisie (`Composer.tsx:196, 207`).

### 7.4 La voix, à charger avant d'écrire une ligne

`~/.claude/skills/iris-campagne/SKILL.md`, section « La voix de Krystine », douze règles : vouvoiement, aucun cadratin, presque jamais « ce n'est pas X, c'est Y », « nous » et jamais le « on » qui désigne Krystine, jamais « pis » ni italique, des phrases entières qui se déploient, des suggestions plutôt que des ordres, un rythme inégal sans tics d'IA, le concret avant l'abstrait, jamais la mécanique d'affaires, un sujet sous 60 caractères et un titre sous deux lignes, aucune salutation finale ni signature dans les blocs (le gabarit les pose) et un premier paragraphe qui salue avec `{{firstName}}`. Les règles dures du poste : jamais d'envoi ni de planification par Iris, montée en volume par paliers (500, 1 500, 3 000, 5 000), 48 heures entre deux infolettres composées pour une même adresse, rebonds sous 4 % et plaintes sous 0,08 %.

`~/Documents/Onyx/10_projects/krystine/voix-de-krystine.md` (étude des deux livres) : elle raconte avant d'expliquer, toujours par un souvenir ou une plante nommée; elle parle d'elle avec gratitude et avoue ses limites avec humour; « vous » au lecteur, « nous » pour la société et la nature; points de suspension comme respiration, points d'exclamation de joie, parenthèses pour l'aparté, cadratin rare; phrases longues en énumérations de choses réelles suivies d'une phrase courte qui tranche; majuscules de conviction. Ses mots : reconnexion, retour vers l'essentiel, votre vraie nature, art de vivre, rituels, au-delà des modes et des tendances, causes-racines, vitalité. Sa fermeture : « Au plaisir de vous accompagner à la redécouverte de votre vraie nature ! Krystine xx ». Ce qui sonne faux : le ton conseil-marketing à la troisième personne, les slogans courts alignés, l'absence de souvenir, la prudence tiède.

Avant de livrer : `python3 ~/.claude/skills/voix-alex/scripts/verifier.py <fichier>` sur le texte des blocs.

## 8. Le parcours connecté de QA, tel qu'il existe

`scripts/qa/bannieres-signature.mjs:1-72`, à copier dans `scripts/qa/tmp-badge-bleu.mjs` :

- `:7-13` la clé Web depuis `.env.local`, le jeton `gcloud auth print-access-token`, `fsdoc` (PATCH REST avec `updateMask` facultatif) et `fsdel`.
- `:19-25` `signUp` Identity Toolkit, puis les semences `members/{uid}`, `memberPoints/{uid}`, `boutique/{uid}.possede`.
- `:26-40` la session : objet `authUser` déposé dans IndexedDB `firebaseLocalStorageDb`, magasin `firebaseLocalStorage`, clé `` `firebase:authUser:${API_KEY}:[DEFAULT]` ``; `localStorage` `krystine-jeu-vu` (la date du jour) et `krystine-banniere-flash-vu`.
- `:41` `fermerRoue` : clic en haut à gauche du voile `.fixed.inset-0.z-\[125\]`.
- `:68-72` le nettoyage : `accounts:delete` avec l'`idToken`, puis suppression des documents semés.

Pour le Badge Bleu, les semences en plus : `members/{uid}.verifie = true` (l'admin de test le donne, ou la semence REST), `achatsFormations/{uid}/formations/foyer = { titre: "Le Foyer d'Origine", source: "qa" }` pour ouvrir le Foyer, et si des niskas sont attendus, `pointsEvents` en plus de `memberPoints` (le brief l'exige; `AdminClientView.tsx:597-598` détecte la dérive entre les deux et proposerait « Rétablir »). Le nettoyage ajoute ces chemins à la liste `:71`.

## 9. Les trous et les décisions avant d'écrire

1. **Coche ou badge.** Le Badge Bleu peut être la coche `members.verifie` (déjà affichée à sept endroits, donnée par l'admin) ou un badge honorifique dans `badges/{uid}` (pastille laiton, vitrine, vedette). Les deux voies sont prêtes; le lot choisit, et ce choix décide de tout le reste.
2. **Les endroits sans coche** : billet du fil, clavardage du direct, membres d'un groupe, fiche cliente de l'admin. Si le badge doit être partout où le nom apparaît, ces quatre points s'ajoutent (section 1.5).
3. **Les métadonnées du badge** (date, motif, pièce) demandent de nouvelles clés dans la liste interdite des règles `firestore.rules:353` et `:356`, ou un document à part réservé à l'admin.
4. **La pièce justificative** n'a pas de chemin Storage ouvert aux membres hors `mur/` et `bugs/` : une règle jumelle de `bugs` est à ajouter (section 5.2), et le téléversement des bannières par les membres est à vérifier avec un compte jetable (section 5.1).
5. **Le skin réservé** tombe aujourd'hui sur « Dans le coffre d'or » faute de branche (`BoutiqueNiskas.tsx:347, 356`) et n'a pas de bloc dans `skins.css` ni de voile (`:591-603`).
6. **La fiche cliente** ne montre ni la coche, ni les badges, ni les formations achetées : `getMesFormations(uid)` et un encart sur le modèle de `CoffreAdmin` combleraient les trois d'un coup.
7. **La notification** d'un badge obtenu passe par `ecrireMessageKrystine` (message dans les `dms`), faute de collection de notifications; la cloche le remonte comme message non lu.
8. **Le rang `moderateur`** existe sans effet visible : à laisser tel quel ou à raccorder au Badge Bleu si Alex le décide.
