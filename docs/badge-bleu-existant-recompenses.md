# Récompenses quotidiennes et cadeaux : ce qui existe déjà (lecture du 6 septembre 2026)

Relevé du code tel qu'il est écrit ce soir, sans aucune modification. Chaque mécanisme donne le fichier et la ligne exacte. Le but est de préparer le lot « badge bleu » (les membres du Foyer d'Origine reçoivent plus à la roue du jour et des cadeaux aux 7e et 30e journées consécutives) en réemployant ce qui tourne déjà plutôt qu'en le recréant.

Lecture faite avec la carte du dépôt (`graphify-out/graph.json`, aucun nœud sur ce sujet, donc lecture directe des fichiers) et `docs/canon-espace-client.md` pour les conventions.

## 1. La monnaie : niskas, journal et solde

Le solde vit dans `memberPoints/{uid}` (`balance`, `lifetime`, `updatedAt`, plus `dernierJour` et `serie` pour la roue) et le journal append-only dans `pointsEvents/{cle}` où l'identifiant du document est la clé de déduplication (`src/firebase/points.ts:3-9`, `:25-44`).

Côté serveur, deux briques réutilisables dans `functions/src/niskas.ts` :

| Brique | Lignes | Ce qu'elle fait |
|---|---|---|
| `crediterNiskas(uid, kind, amount, cle, meta)` | `niskas.ts:94-113` | Transaction : si `pointsEvents/{cle}` existe, rend `false`; sinon écrit l'événement et incrémente `balance` et `lifetime` (le `lifetime` ne monte que du positif). Exportée, déjà employée par `badges.ts:47,58` et `coffres.ts:269`. |
| `recalculerSolde(uid)` | `niskas.ts:80-90` | Relit tout le journal de la membre et réécrit `balance` et `lifetime` exacts. Appelée après chaque opération serveur. |
| `soldeVerifie(uid, balanceDoc)` | `niskas.ts:117-127` | Plafonne le solde du document par la somme agrégée du journal avant un débit. |

Les règles Firestore (`firestore.rules:391-414`) : la membre lit et écrit son `memberPoints`, elle ne peut créer dans `pointsEvents` que des crédits de 100 au plus et jamais avec les `kind` réservés au serveur, dont `quotidien` (`firestore.rules:408`). Tout nouveau `kind` réservé au Foyer doit s'ajouter à cette liste s'il est distinct de `quotidien`.

Les identifiants de `kind` sont typés dans `src/lib/pointsConfig.ts:22-47` (`PointsKind`) et leurs libellés d'historique dans `src/pages/client/ClientLoyalty.tsx:13-30` (`quotidien` s'affiche « Cadeau du jour », `:28`).

## 2. La roue des sept jours

### 2.1 Serveur : `reclamerQuotidien` (`functions/src/niskas.ts:252-286`)

La table est `ROUE_QUOTIDIENNE = [1, 1, 2, 2, 3, 3, 5]` (`niskas.ts:67`), miroir client dans `pointsConfig.ts:82`. Le fuseau est `America/Toronto` (`niskas.ts:68`), la journée civile se calcule par `journee()` (`niskas.ts:71-75`) et la veille par `veilleDe()` (`niskas.ts:76`).

Déroulement, dans une transaction (`niskas.ts:262-276`) :

1. Lecture de `memberPoints/{uid}` et de `pointsEvents/quotidien:{uid}:{AAAA-MM-JJ}` (`:263`).
2. Si l'événement du jour existe ou si `prev.dernierJour === aujourdhui`, retour `deja: true` avec le jour de la roue recalculé depuis `serie` et le montant correspondant (`:266-269`). Rien ne s'écrit.
3. Sinon, **le compteur `serie` existe déjà et repart bien à 1 après un jour sauté** : `serie = prev.dernierJour === veilleDe(aujourdhui) ? serieAvant + 1 : 1` (`:270`). Il n'est pas plafonné : après le 7e jour il continue à 8, 9, 10… tant que la suite tient.
4. Le jour de la roue est `((serie - 1) % 7) + 1` (`:271`) et le montant `ROUE_QUOTIDIENNE[jour - 1]` (`:272`).
5. Écriture de l'événement `{ uid, kind: 'quotidien', amount: montant, dedupKey, meta: { jour, serie } }` (`:273`) et de `{ dernierJour, serie }` sur `memberPoints` (`:274`). **La transaction n'incrémente pas `balance`** : le solde est refait juste après par `recalculerSolde` (`:283`). Doubler le montant revient donc à changer la seule valeur `amount` de l'événement.

Après la transaction, le 7e jour de la roue déclenche `donnerCoffreDuJour7(uid, aujourdhui)` (`:277-282`). Le test est `r.jour === ROUE_QUOTIDIENNE.length`, ce qui revient à dire que le coffre tombe aux jours 7, 14, 21 et 28 de la suite. La fonction renvoie ensuite `{ deja, jour, montant, serie, balance, coffre }` (`:284`), que le client lit sous le type `Quotidien` (`src/firebase/points.ts:344`).

Ce que le `serie` ne fait pas : aucun test sur `serie === 30`, aucun cadeau autre que le coffre du 7e jour, aucune distinction Foyer.

### 2.2 Le compteur de journées des badges (`functions/src/interactions.ts:65-74`)

`interactionPoints` écoute la création de tout `pointsEvents/{id}` et, pour `kind === 'quotidien'`, incrémente `badges/{uid}.compteurs.jours` (`:72`), ce qui pose le badge `fidele-au-poste` à 30 (`:16`). Ce compteur est **cumulatif**, pas consécutif : trente journées de retour dans la vie du compte, avec ou sans trou. La 30e journée **d'affilée** ne se lit que dans `memberPoints.serie`. Conséquence pratique : si le bonus Foyer s'écrit comme un deuxième événement `quotidien` le même jour, ce compteur compterait deux journées; il faut soit garder un seul événement au montant doublé, soit un `kind` distinct.

### 2.3 Client : `RoueQuotidienne` (`src/components/client/RoueQuotidienne.tsx`)

Montée une seule fois dans `src/pages/ClientPortal.tsx:658`. À l'ouverture de `/compte`, elle appelle `reclamerQuotidien` (`RoueQuotidienne.tsx:25`, fonction client `src/firebase/points.ts:346-351`) et lève le panneau dans un `Portail` (`:47-110`, voile `fixed inset-0 z-[125]`, `:48`) si la récompense vient de tomber ou si la clé `localStorage` `krystine-roue-vue` n'est pas à aujourd'hui (`:13`, `:24-31`). L'événement `krystine:ouvrir-roue` la rouvre (`:36-40`).

Ce que le panneau affiche et qu'un doublement devrait toucher : le titre avec `etat.montant` (`:60-62`), le texte explicatif figé « Jour X sur 7 … Le septième jour ouvre aussi un coffre de bronze, avec sa clé. » (`:64-68`), les sept cases avec `+{montant}` lu dans `ROUE_QUOTIDIENNE` (`:71-93`, montant `:88`, pastille « coffre » sur la 7e `:89`) et la suite en cours `etat.serie` (`:97-99`). Le guide « Comment gagner des niskas » cite « 1 à 5 » depuis la même table (`pointsConfig.ts:301`), tout comme `BienvenueJeu.tsx:41`.

Aucun élément client ne sait si la membre est du Foyer : le composant reçoit `uid` et `lang` seulement (`:15`).

## 3. Les coffres et la façon d'offrir un cosmétique ou la musique

### 3.1 Le coffre du 7e jour (`functions/src/coffres.ts:329-337`)

`donnerCoffreDuJour7(uid, jour)` : transaction sur `coffresDons/roue:{uid}:{jour}` (idempotente par journée), puis `coffres/{uid}` reçoit `boites.bronze + 1` et `cles + 1`. Aucun message dans la messagerie, aucun événement de points; la membre découvre le coffre dans la petite boutique, section « Les coffres ».

### 3.2 Comment un skin ou une bannière s'offre (`coffres.ts:217-235`)

La possession d'un cosmétique est une clé dans `boutique/{uid}.possede` : `db.doc('boutique/{uid}').set({ possede: { [article]: FieldValue.serverTimestamp() } }, { merge: true })` (`coffres.ts:229`; même écriture à l'achat, `niskas.ts:192`). L'écriture est réservée au serveur et à l'admin (`firestore.rules:418-421`), le client ne fait que lire (`src/firebase/points.ts:357-360`, `suivreBoutique`).

Le serveur tire ses articles dans trois bassins. `LEGENDAIRES` contient les trois skins de dosha (`coffres.ts:86`), `COMMUNS` regroupe les skins et les bannières qui s'achètent aussi en boutique (`:87`), et chaque coffre porte sa propre liste de rares (`:64` pour l'argent, `:75` pour l'or). Les noms lisibles vivent dans `NOMS_COSMETIQUES` (`:102-109`). Quand un article tiré est déjà possédé, sa valeur de rachat se lit dans `VALEUR_COSMETIQUE` (`:95-101`) et se verse en niskas multipliée par 1,05 et arrondie au supérieur (`:232`). Le catalogue client des skins, avec palettes et rareté, est le tableau `SKINS` de `pointsConfig.ts:187-282`, et `skinParCle` retrouve un skin par sa clé (`:283`).

Recevoir un skin ne l'active pas : la membre le choisit ensuite dans la boutique, ce qui écrit `members.personnalisation.skin` (`src/components/client/BoutiqueNiskas.tsx:113-120`); `ClientPortal` pose alors la classe `skin-<cle>` sur la coquille et `skins.css` repeint.

### 3.3 Comment la musique d'Origine s'offre (`coffres.ts:237-247`)

Identifiant `MUSIQUE_ORIGINE_ID = 'kajabi-2149362766'` (`niskas.ts:15`, réexporté; aussi `functions/src/musique.ts:10` et `src/firebase/musique.ts:5`). Deux écritures :

1. `achatsFormations/{uid}/formations/kajabi-2149362766` avec `{ titre, imageUrl, categorie: 'musique', source: 'coffre', accordeLe }` (`coffres.ts:244`), le titre et l'image lus dans `formations/kajabi-2149362766` (`:243`).
2. `boutique/{uid}.possede['musique-origine']` (`:245`).

Détection « déjà à vous » : `achatsFormations` existe **ou** `possede['musique-origine']` (`:238-239`); alors six niskas à la place (`NISKAS_MUSIQUE_DEJA`, `:88`, `:240-241`). L'achat en boutique fait les mêmes deux écritures avec `source: 'niskas'` (`niskas.ts:192`, `:207-216`); la page du Foyer l'offre avec `source: 'foyer-musique'` (`musique.ts:24-30`), et le parrainage au premier palier avec `source: 'parrainage'` (`functions/src/parrainage.ts:33`, `:105-109`).

Côté client, l'onglet Téléchargements liste toute entrée d'`achatsFormations` dont `categorie === 'musique'` ou dont l'id est celui de la musique (`src/firebase/musique.ts:8`, `estTelechargement`; `src/pages/client/ClientTelechargements.tsx:67`), passe `possedeMusiqueDeja` à la boutique (`:198`) et le téléchargement passe par la fonction `musiqueOrigine` qui rend une URL signée deux heures (`functions/src/musique.ts:53-58`). L'activation comme musique du site est un choix de la membre (`personnalisation.musiqueSite`, `BoutiqueNiskas.tsx:317`, `src/components/layout/MenuMusique.tsx:39-42`).

### 3.4 Les rabais tirés d'un coffre (`coffres.ts:254-260`)

Un rabais gagné n'est pas un code : c'est un document `rewardRedemptions` `{ uid, email, rewardId, rewardLabel: '15 % sur les Huiles Corporelles (coffre argent)', cost: 0, status: 'pending', source: 'coffre', createdAt }` (`:257`). Il apparaît sous Points, « Mes récompenses », en attente, et dans l'admin comme récompense à honorer (section 5). Le `rewardId` `reb-huiles` est tiré 1 fois sur 25 au coffre d'argent (`:70`).

### 3.5 Le grand lot passe par `cadeaux` (`coffres.ts:293-307`)

Le Foyer offert s'écrit comme un cadeau à 100 % dans `cadeaux` (`:294-298`, `formationId: 'foyer'`, `deUid: 'coffre'`, `source: 'coffre'`), puis le mot de Krystine part dans la messagerie par `ecrireMessageKrystine` (`:304-306`) avec l'uid de Krystine retrouvé par courriel `krystine@inspiratanature.com` (`:301-302`).

### 3.6 Le message de Krystine dans la messagerie (`coffres.ts:145-161`)

`ecrireMessageKrystine(db, deUid, uid, corps, extra)` : fil `dms/{threadId(deUid, uid)}` avec `participantUids`, `participantNames` (`Krystine` d'un côté, `displayName` de l'autre), photos, `lastMessage`, `lastMessageAt`, `lastSenderUid`, `unread.{uid} + 1` (`:153-159`), puis un document dans `dms/{id}/messages` avec `senderName: 'Krystine'`, `body`, et les champs `extra` (`:160`). C'est la brique à réemployer pour tout dépôt d'un mot avec cadeau. `offrirCoffre` (`:312-326`) l'emploie déjà pour annoncer un coffre offert par l'admin.

## 4. Les cadeaux de Krystine (`functions/src/cadeaux.ts`)

### 4.1 Offrir (`cadeaux.ts:38-94`)

Réservé aux courriels admin (`:14-21`, `:41-42`; la même liste est recopiée dans `coffres.ts:113-116`). Entrées `uid`, `formationId`, `pourcent` (1 à 100), `message` (`:43-47`). Le cadeau s'écrit dans `cadeaux/{auto}` avec la forme `Cadeau` (`:25-36`) : `uid`, `formationId`, `formationTitre`, `formationImage`, `prix`, `pourcent`, `message`, `deUid`, `deNom: 'Krystine'` (toujours, `:61`), `statut: 'offert'`, `creeLe` (`:63-74`). Puis le mot dans la messagerie, écrit à la main (mêmes champs que `ecrireMessageKrystine`) avec `cadeauId: ref.id` sur le message (`:76-91`).

Le cadeau est **lié à une formation** : `formations/{formationId}` doit exister (`:56`). Il n'y a pas de cadeau « produit Shopify » ni « code de rabais » dans ce schéma.

### 4.2 Utiliser (`cadeaux.ts:96-149`)

À 100 % : `achatsFormations/{uid}/formations/{formationId}` reçoit `{ titre, imageUrl, montant: 0, source: 'cadeau', cadeauId, accordeLe }` et le cadeau passe `statut: 'utilise'` (`:109-120`). En dessous de 100 % : session Stripe Checkout au prix réduit (minimum 50 ¢) avec `metadata.cadeauId` (`:122-147`); le webhook marque le cadeau utilisé au paiement (`functions/src/paiements.ts:248-252`).

### 4.3 Où la membre le voit

- `suivreMesCadeaux(uid)` écoute `cadeaux` où `uid == moi` et `statut == 'offert'` (`src/firebase/cadeaux.ts:22-31`).
- La carte `CadeauCarte` (`src/components/client/CadeauCarte.tsx`) montre la formation, le rabais, le mot et le bouton « Recevoir ma formation » ou « Utiliser mon rabais » (`:54-62`); au succès elle redirige vers `/cours/{formationId}` (`:22`).
- L'onglet Messagerie de `/compte` empile ces cartes au-dessus des fils, volet « Amies » (`src/pages/client/ClientMessagerie.tsx:53`, `:119-123`). Les cartes viennent de la collection `cadeaux`, pas du champ `cadeauId` du message : le type `DM` n'a pas ce champ (`src/firebase/dms.ts:34-40`) et `MessagesPage.tsx` ne le lit pas.
- La cloche liste chaque cadeau offert comme une notification vers `/compte` (`src/components/communaute/Cloche.tsx:66`, `:122-127`).
- Les règles : la membre lit ses cadeaux, le serveur et l'admin seuls écrivent (`firestore.rules:241-244`).

Depuis l'admin, la fiche d'une cliente offre le formulaire (`src/pages/admin/AdminClientView.tsx:63-112`, appel `offrirCadeau` `:81`, client `src/firebase/cadeaux.ts:44-49`).

## 5. Les récompenses de l'onglet Points

### 5.1 Le catalogue

`REWARDS` dans `pointsConfig.ts:396-476` : `reb-10-boutique` (500 niskas), **`reb-huiles` (650 niskas, « 15% sur les Huiles Corporelles », `:425-432`)**, puis les cadeaux à palier et à réclamation unique (`rituel-offert`, `reb-formation`, `masterclass-source`, `huile-source`). Le champ `minTier` renvoie aux paliers de la plante `TIERS` (`pointsConfig.ts:342-353`, dix stades de Graine à Grand jardin sur le `lifetime`; `tierFromLifetime` `:361-369`, `rewardMinThreshold` `:483-486`). Attention au vocabulaire : `src/lib/paliers.ts` parle des paliers d'infolettre, sans lien avec les récompenses.

Krystine règle ce catalogue dans l'admin (`src/pages/admin/sections/RecompensesSection.tsx`) : le document `settings/recompenses.liste` remplace `REWARDS` dès qu'il existe (`src/firebase/recompenses.ts:15-23`, `suivreRecompenses`; écriture `:25-33`). L'espace client lit cette liste filtrée sur `actif !== false` (`ClientLoyalty.tsx:51-52`). Le prix de `reb-huiles` peut donc différer du code.

### 5.2 L'échange (`src/firebase/points.ts:114-172`)

`redeemReward` tourne **dans le navigateur** : pré-scan des réclamations pour `oneShot` (`:121-125`), puis transaction qui crée `rewardRedemptions/{auto}` `{ uid, email, rewardId, rewardLabel, cost, status: 'pending', createdAt }` (`:135-143`), l'événement `pointsEvents/redeem:{id}` négatif (`:148-156`) et le nouveau solde (`:158-162`). Le bouton « Échanger » est dans `ClientLoyalty.tsx:138-165` (`onRedeem`) et le message de confirmation dit « vous recevrez votre code par courriel sous 24 h » (`:150`). La liste « Mes récompenses » affiche `pending`, `fulfilled` (« Honorée ») ou `cancelled` (`:517-541`).

### 5.3 Comment un rabais se matérialise aujourd'hui

Il n'y a **aucune génération de code** dans le dépôt : ni mutation Storefront de rabais, ni appel Admin API `priceRule` ou `discountCode` (recherche `discount|priceRule|price_rule` sur `src` et `functions/src` : seuls des libellés et le champ `totalDiscounts` des commandes importées). Le flux réel :

1. le document `rewardRedemptions` reste `pending`;
2. l'admin le voit sur la fiche de la cliente, encadré jaune « récompense(s) à honorer » avec libellé, coût et date (`AdminClientView.tsx:742-752`, liste `listMyRewardRedemptions` `:177`);
3. Krystine crée le code dans Shopify et l'envoie par courriel elle-même. Le champ prévu pour garder le code est `fulfillmentNote` (`points.ts:56`), et le statut `fulfilled` existe dans le type (`:46`), mais **aucun bouton d'admin n'écrit `fulfilled` ni `fulfillmentNote`** (seul `AnalyticsSection.tsx:46` emploie ce mot, pour les commandes Shopify). Les règles permettent à l'admin la mise à jour (`firestore.rules:437-443`).

Le texte des coffres le dit aux membres : « Les rabais gagnés sont honorés par Krystine avec un code de la boutique » (`src/components/client/Coffres.tsx:239`, `:300`).

## 6. Le catalogue des huiles

La boutique lit l'API Storefront publique de Shopify (`src/shopify.ts:1-25`, jeton public, version `2025-01`), `getProducts` avec cache (`:144-157`), panier et paiement par `cartCreate` sans champ de code de rabais (`:165-184`). Il n'existe pas de client Admin API dans le dépôt; le côté serveur ne reçoit que les webhooks de commande (`functions/src/shopify/webhook.ts:50-51`, normalisation `normalize.ts`).

La collection « Les Huiles Corporelles » est virtuelle : `src/lib/collections.ts:111-133`, slug `huiles-corporelles`, prédicat `match` sur titre, type et étiquettes (`huile corporelle`, `body oil`, `vata`, `pitta`, `kapha`, `feminite`, `sportive`, `defripante`…), page `/boutique/huiles-corporelles` (`ClientPortal.tsx:1160`, `QuizPage.tsx:202`). `findOilForDosha` (`src/lib/shopifyOil.ts:7-16`) retrouve l'huile d'un dosha. Un « 15 % sur les Huiles Corporelles » ne peut donc pas s'appliquer au panier depuis le site : il vit comme `reward` + code Shopify remis à la main.

## 7. Savoir qu'une membre est du Foyer

### 7.1 Côté client (`src/components/communaute/ReserveAuFoyer.tsx:12-23`)

`useMembreDuFoyer()` rend `null` (inconnu), puis `true` si `isAdmin` ou `member.accesVie`, sinon le résultat de `aAchete(uid, 'foyer')` (`:17-19`), c'est-à-dire l'existence de `achatsFormations/{uid}/formations/foyer` (`src/firebase/formations.ts:93-96`). Le même hook nourrit `useAmiesDOrigine` (`:30-50`), `ReserveAuFoyer` (`:52-58`) et `MotDuFoyer` (`:61-72`). L'identifiant de formation est la chaîne `'foyer'` partout (`coffres.ts:111`, `FoyerPage.tsx:833`, `foyer/Cta.tsx:14`).

### 7.2 Côté serveur (deux précédents à copier)

- `functions/src/notifs.ts:68-73` : pour un billet réservé au Foyer, la membre reçoit le courriel si `members/{uid}.accesVie` est vrai, sinon si `achatsFormations/{uid}/formations/foyer` existe.
- `functions/src/paiements.ts:283-289` (`obtenirLecon`) : sans achat, `members.accesVie` ouvre quand même.

`accesVie` s'écrit au 20e palier du parrainage (`functions/src/parrainage.ts:37`, `:111`) et ne peut pas être posé par la membre elle-même (`firestore.rules:352-356`, liste des champs protégés `verifie`, `moderateur`, `filleules`, `filleulesAcheteuses`, `accesVie`). L'achat du Foyer par Stripe écrit `achatsFormations/{uid}/formations/foyer` avec `acheteLe`, `montant`, `sessionId` (`paiements.ts:240-249`); le cadeau à 100 % l'écrit avec `source: 'cadeau'` (`cadeaux.ts:110-117`); la QA l'écrit avec `{ titre: "Le Foyer d'Origine", source: "qa" }`.

Il n'existe pas d'assistant serveur partagé `estDuFoyer(uid)` : les deux endroits refont les deux lectures.

### 7.3 La coche bleue déjà en place

`members.verifie` est la « coche bleue » actuelle, posée par l'admin seulement (`src/firebase/firestore.ts:714`, bascule dans `src/pages/admin/sections/MembersSection.tsx:370-371`), affichée en `#3b82f6` (`CarteSociale.tsx:68`, `MembreProfilPage.tsx:118`, `CommunauteMembres.tsx:75`, `ClientPortal.tsx:209`, `:578`). Elle n'a aucun lien avec le Foyer aujourd'hui.

## 8. Points d'extension exacts

### 8.1 Doubler les montants de la roue pour le Foyer

- **`functions/src/niskas.ts:263`** : ajouter à la `Promise.all` de la transaction la lecture de `achatsFormations/{uid}/formations/foyer` et de `members/{uid}` (toutes les lectures d'une transaction Firestore précèdent les écritures; les trois `tx.get` tiennent dans ce même `Promise.all`).
- **`niskas.ts:272`** : `const montant = ROUE_QUOTIDIENNE[jour - 1] * (foyer ? 2 : 1)`, et porter `foyer` dans `meta` à la ligne `:273` pour l'historique. Le solde suit tout seul par `recalculerSolde` (`:283`). Garder `kind: 'quotidien'` évite de toucher `firestore.rules:408` et le compteur `jours` de `interactions.ts:72`.
- **`niskas.ts:268`** : la branche `deja` renvoie aussi `montant`; appliquer le même facteur pour que le panneau rouvert affiche le bon chiffre.
- **`niskas.ts:284`** : renvoyer `foyer` au client dans l'objet de retour; étendre le type `Quotidien` dans `src/firebase/points.ts:344`.
- **`src/components/client/RoueQuotidienne.tsx:60-68`** (titre et texte), **`:71-93`** (les `+{montant}` des sept cases lus dans `ROUE_QUOTIDIENNE`) : multiplier l'affichage quand `etat.foyer` est vrai, sans toucher `pointsConfig.ts:82`. Les phrases restent vouvoyées, deux lignes au plus pour le titre.
- Textes qui citent « 1 à 5 » : `pointsConfig.ts:301` (guide) et `src/components/client/BienvenueJeu.tsx:41`.

### 8.2 Détecter la 7e et la 30e journée consécutive

Le compteur existe : `memberPoints.serie`, calculé à **`niskas.ts:270`**, repart à 1 après un jour sauté et n'est jamais plafonné. Le point d'accroche est le bloc après la transaction, **`niskas.ts:277-282`** :

- 7e journée : déjà détectée par `r.jour === ROUE_QUOTIDIENNE.length` (`:279`). Ce test tombe aussi aux jours 14, 21, 28. Pour « la 7e journée consécutive » au sens strict, tester `r.serie === 7`; pour « chaque 7e », garder le test actuel.
- 30e journée : tester `!r.deja && r.serie === 30` au même endroit. Le jour de roue affiché ce jour-là est le 2 (`((30 - 1) % 7) + 1`). Rendre le geste idempotent avec une clé par journée, sur le patron de `coffresDons/roue:{uid}:{jour}` (`coffres.ts:331-334`) ou une clé `pointsEvents/serie30:{uid}:{aujourdhui}` par `crediterNiskas` (`niskas.ts:94`).
- Signaler au client : ajouter le drapeau au retour (`:284`) comme `coffre` l'est déjà, et l'afficher dans `RoueQuotidienne.tsx:64-68` et sur la 7e case (`:89`).
- Ne pas confondre avec `badges/{uid}.compteurs.jours` (`interactions.ts:72`), cumulatif.

### 8.3 Déposer un cadeau musique

Deux écritures serveur, copiées de **`coffres.ts:243-246`** : `achatsFormations/{uid}/formations/kajabi-2149362766` `{ titre, imageUrl, categorie: 'musique', source: '<origine>', accordeLe }` et `boutique/{uid}.possede['musique-origine']`. Tester d'abord « déjà à vous » comme **`coffres.ts:238-239`** et, dans ce cas, verser l'équivalent en niskas (`NISKAS_MUSIQUE_DEJA`, `:88`). Le mot dans la messagerie par `ecrireMessageKrystine` (**`coffres.ts:145-161`**) avec l'uid de Krystine trouvé comme en **`coffres.ts:301-302`**. La membre la retrouve dans Téléchargements (`ClientTelechargements.tsx:67`) et la boutique la marque possédée (`BoutiqueNiskas.tsx:114`).

### 8.4 Déposer un cadeau skin

Une écriture, **`coffres.ts:229`** : `boutique/{uid}.possede['skin-<cle>'] = serverTimestamp()`. Choisir la clé dans `LEGENDAIRES` (`:86`), `COMMUNS` (`:87`) ou les rares (`:64`, `:75`); nom lisible dans `NOMS_COSMETIQUES` (`:102-109`); si déjà possédé, la valeur × 1,05 en niskas comme **`coffres.ts:231-235`**. Mot dans la messagerie par `ecrireMessageKrystine`. La membre l'active elle-même dans la boutique (`BoutiqueNiskas.tsx:117-120`); le texte du mot doit le lui dire.

### 8.5 Déposer un cadeau rabais

Deux voies existent, selon ce que le rabais touche :

- **Rabais sur une formation** (Foyer, Origine, Vata…) : un document `cadeaux` au patron de **`cadeaux.ts:63-74`** avec `pourcent` de 1 à 99, plus le mot dans la messagerie (**`cadeaux.ts:76-91`** ou `ecrireMessageKrystine`). La carte cliquable apparaît d'elle-même dans la messagerie et la cloche (`ClientMessagerie.tsx:119-123`, `Cloche.tsx:122-127`) et le bouton ouvre Stripe au prix réduit (`cadeaux.ts:122-147`). Rien à construire côté client.
- **Rabais sur les huiles ou la boutique Shopify** (`reb-huiles`, 15 %) : un document `rewardRedemptions` au patron de **`coffres.ts:257`** (`cost: 0`, `status: 'pending'`, `source` à nommer, `rewardId: 'reb-huiles'`, `rewardLabel` lisible), visible sous Points « Mes récompenses » et dans l'admin « à honorer ». Krystine remet le code à la main; pour lui donner un bouton « Honorée » il faudrait écrire `status: 'fulfilled'` et `fulfillmentNote` depuis `AdminClientView.tsx:742-752` (règle admin déjà permise, `firestore.rules:441-442`). Le schéma `cadeaux` ne convient pas ici sans l'étendre : il exige un `formationId` existant (`cadeaux.ts:56`) et son bouton ouvre Stripe pour une formation.

Dans les deux cas, le mot de Krystine dans `dms` reste le même geste (`coffres.ts:145-161`); le fil s'ouvre avec `unread` incrémenté, donc la pastille de la messagerie et la cloche s'allument sans autre code.

## 9. Pour la QA du lot

- Patron de compte jetable : `scripts/qa/bannieres-signature.mjs` (Identity Toolkit `:19-20`, session dans IndexedDB `:32-38`, Firestore REST avec `gcloud auth print-access-token` `:13-18`, effacement `:78-80`). La roue se ferme par le voile `.fixed.inset-0.z-\[125\]` (`:41`, sélecteur de `RoueQuotidienne.tsx:48`).
- Simuler une 7e ou une 30e journée : écrire `memberPoints/{uid}` avec `dernierJour` = la veille de Montréal et `serie` = 6 ou 29 avant d'ouvrir `/compte`; le serveur passera à 7 ou 30 (`niskas.ts:270`).
- Ouvrir le Foyer : `achatsFormations/{uid}/formations/foyer = { titre: "Le Foyer d'Origine", source: "qa" }`, ou `members/{uid}.accesVie = true` par l'Admin SDK (le client ne peut pas l'écrire).
- Le mot déposé se lit dans `dms/{krystineUid}__{uid}` (ordre trié des deux uid, `coffres.ts:124`) et son fil dans l'onglet Messagerie de `/compte`.
