# Badge Bleu et couche Foyer : le plan en quatre lots

Écrit le 6 septembre 2026 par l'architecte du chantier, après lecture de `docs/badge-bleu-existant-identite.md` et `docs/badge-bleu-existant-recompenses.md`. Le socle partagé est déjà écrit et typé (section 1). Les quatre lots qui suivent touchent des fichiers **disjoints** et peuvent se coder en parallèle; seule leur QA de bout en bout attend le déploiement du LOT SERVEUR, parce que le serveur de développement (`npx vite --port 5199 --strictPort`) parle au vrai projet `krystinestlaurent-87566`.

Règles d'Alex qui valent pour les quatre lots : pleine largeur, titres de deux lignes au plus, jamais d'italique, pop-ups par `src/components/Portail.tsx`, texte lisible sur chaque skin (uniquement les classes que `skins.css` repeint), phrases pleines et vouvoyées, jamais de tirets longs, jamais « simplement », jamais « on ». `Edit` sur les fichiers existants, jamais `Write`. Aucun commit, aucun déploiement de l'hébergement : le fil principal s'en charge. Les fonctions et les règles se déploient dans le LOT SERVEUR seulement. Chaque lot laisse ses scripts temporaires dans `scripts/qa/tmp-*.mjs` et les supprime à la fin. Captures dans `/private/tmp/claude-501/-Users-lesalondesinconnus/3a548c8f-1fba-4e35-b513-f459846a1c9b/scratchpad/badge-bleu/<sujet>/`, à 1440 et 390, regardées avant de dire « fait ».

## 1. Le socle déjà écrit (ne pas retoucher dans les lots)

| Fichier | Ce qu'il porte |
|---|---|
| `src/lib/badgeBleu.ts` (nouveau) | `SEUIL_PROGRAMMES = 2`, `NISKAS_BADGE_BLEU = 200`, `ID_SKIN = 'verifie'`, `ARTICLE_SKIN = 'skin-verifie'`, `ID_BADGE = 'badge-bleu'`, `KIND_BADGE_BLEU` et `cleBadgeBleu(uid)`, `TAILLE_PIECE_MAX` (8 Mo), `EXTENSIONS_PIECE`, `cheminPiece(uid, ext)`, `cheminPieceValide(uid, chemin)`, `StatutVerification`; la couche Foyer : `FOYER_MULTIPLICATEUR = 2`, `FOYER_HEBDO_JOURS = 7`, `FOYER_MOIS_JOURS = 30`, `FOYER_NISKAS_HEBDO_SI_MUSIQUE = 25`, `KIND_FOYER_HEBDO`, `KIND_FOYER_MOIS`, `cleFoyerHebdo(uid, jour)`, `cleFoyerMois(uid, jour)`, `LIBELLE_FOYER`, `CYCLE_FOYER_MOIS` (musique → skin rare → rabais, libellés FR/EN), `RABAIS_HUILE_FOYER` (`reb-huile-foyer-30`, 30 %, plafond 30 %, un article), `estJourHebdoFoyer`, `estJourMoisFoyer`, `cadeauFoyerDuMois(serie)`, `prochainsCadeauxFoyer(serie)`, `verifierCycleFoyer()`. |
| `functions/src/badgeBleuConfig.ts` (nouveau) | Miroir exact du précédent, ligne pour ligne à partir de la ligne 5. Les fonctions importent d'ici. |
| `src/lib/pointsConfig.ts` | `PointsKind` gagne `'badge-bleu'`, `'foyer-hebdo'`, `'foyer-mois'`; `RareteSkin` gagne `'exclusif'`; `Skin` gagne `reserve?: 'badge-bleu'`; `SKINS` gagne l'entrée `verifie` (cout `null`, rareté `exclusif`, `reserve: 'badge-bleu'`, icône `fa-circle-check`, palette fond `#1e4a7a`, panneau `#2f6fb0`, encre `#f2f6fb`, accent `#7fb4ff`, accentClair `#b5d4ff`, accentProfond `#e4f1ff`, sombre); `SKINS_RARES` exclut les exclusifs. `BOUTIQUE` en dérive l'article `skin-verifie` à `cout: 0` : le serveur ne le connaît pas dans `COSMETIQUES`, donc il ne s'achète pas. |
| `src/firebase/badgesCatalogue.ts` | `CATALOGUE_BADGES['badge-bleu'] = { nom: 'Badge Bleu', icone: 'fa-circle-check' }`, `COMMENT_GAGNER_BADGES['badge-bleu']` (le badge paraît donc dans « Badges à gagner » du profil et peut être mis en vedette). |
| `src/firebase/coffres.ts` | `LotGagne.rarete` lit désormais le type `RareteSkin` (propagation). |

Contrastes mesurés sur la palette `verifie` (WCAG) : encre sur panneau 4,81; encre sur fond 8,36; accentProfond `#e4f1ff` sur panneau 4,56 (c'est lui qui porte les libellés `text-[#8B4A2F]`); l'accent `#7fb4ff` ne fait que 2,46 sur le panneau et ne sert donc **qu'en fond de bouton**, avec un texte `#0f2540` dessus (7,27). Le texte secondaire des autres skins sombres est à 74 % d'opacité; sur ce panneau bleu moyen il tomberait à 3,41, il faut **96 %** (4,71).

Typecheck : `npx tsc --noEmit -p tsconfig.json` ne rapporte aucune erreur dans ces fichiers (les 47 erreurs restantes vivent dans `QuizPage.tsx`, `SlidePage.tsx` et `shopify.ts`, préexistantes); `cd functions && npx tsc --noEmit` est propre. `verifierCycleFoyer()` passe.

## 2. Les décisions tranchées

### 2.1 La donnée

`verifications/{uid}` (une seule demande vivante par personne, le document se réécrit à une nouvelle demande après un refus) :

```
uid: string
statut: 'en_attente' | 'approuvee' | 'refusee'
programmes: number          // le compte fait par le serveur au moment de la demande
pieceChemin: string | null  // verifications/{uid}/piece.<ext>; passe à null à la décision
demandeLe: Timestamp
decideLe: Timestamp | null
decidePar: string | null    // courriel de l'admin
motif: string | null        // obligatoire au refus, montré à la membre
```

Storage : `verifications/{uid}/piece.<ext>`, `ext` parmi `jpg png webp heic pdf`, 8 Mo au plus. La membre écrit (et peut supprimer) dans son dossier, l'admin seul lit, personne d'autre. **La pièce est supprimée du Storage à la décision, approuvée ou refusée, et aussi quand la demande est refusée d'office faute de programmes** : nous ne gardons jamais une pièce d'identité (Loi 25). Piège des règles Storage : elles s'additionnent par OU et le tout-venant `match /{dossier}/{allPaths=**}` ouvre la lecture publique de tout dossier sauf deux; `verifications` doit s'ajouter à cette exclusion, sinon la pièce serait lisible par URL.

Le compte des programmes (serveur, `demanderBadgeBleu`) : les identifiants de `achatsFormations/{uid}/formations` croisés avec les `formations` où `paywall == true` et `categorie != 'musique'`, quel que soit le `statut` de la formation (un programme retiré de la vente a bien été suivi). Les épisodes achetés en niskas et la musique ne comptent pas. `accesVie` ne compte pas non plus : le badge dit « a suivi deux programmes », pas « a accès à tout ».

### 2.2 Les deux fonctions appelables (`functions/src/verification.ts`)

`demanderBadgeBleu({ pieceChemin })`, membre connectée :
1. `cheminPieceValide(uid, pieceChemin)` sinon `invalid-argument`.
2. Lecture de `verifications/{uid}` : `en_attente` → `failed-precondition` « Votre demande est déjà chez Krystine. »; `approuvee` → `failed-precondition` « Votre Badge Bleu est déjà posé. »; `refusee` ou absent → on continue.
3. Compte des programmes (2.1). Sous `SEUIL_PROGRAMMES` : suppression de la pièce (`bucket.file(chemin).delete({ ignoreNotFound: true })`), puis `failed-precondition` avec le message « Il vous faut 2 programmes suivis avec Krystine et nous en comptons N. » et `details: { programmes: N }`.
4. `bucket.file(chemin).exists()` sinon `invalid-argument` « La pièce n'est pas arrivée. ».
5. `verifications/{uid}` = `{ uid, statut: 'en_attente', programmes: N, pieceChemin, demandeLe: serverTimestamp(), decideLe: null, decidePar: null, motif: null }`.
6. Retour `{ ok: true, programmes: N }`.

`deciderBadgeBleu({ uid, decision, motif })`, admin seulement (`assertAdmin` de `./newsletter/send`) :
1. `decision` parmi `approuvee | refusee`; `motif` tronqué à 600, **obligatoire** au refus.
2. `verifications/{uid}` doit exister en `en_attente`, sinon `failed-precondition`.
3. **D'abord** la suppression de la pièce dans le Storage (`ignoreNotFound`). Si ce qui suit échoue, la demande reste en attente sans pièce et l'admin redécide : approuver n'a plus besoin de la pièce.
4. Approbation : `members/{uid}.verifie = true` (set merge); `crediterNiskas(uid, KIND_BADGE_BLEU, NISKAS_BADGE_BLEU, cleBadgeBleu(uid), { decidePar })` (idempotent : une deuxième approbation dans la vie du compte ne reverse rien); `boutique/{uid}.possede['skin-verifie'] = serverTimestamp()` (merge); `badges/{uid}.obtenus['badge-bleu'] = serverTimestamp()` (merge); `verifications/{uid}` ← `{ statut: 'approuvee', decideLe, decidePar, pieceChemin: null }`; message dans la messagerie.
5. Refus : `verifications/{uid}` ← `{ statut: 'refusee', motif, decideLe, decidePar, pieceChemin: null }`; message avec le motif.
6. Retour `{ ok: true }`.
7. Le corps de la fonction vit dans une fonction interne exportée `deciderBadgeBleuPour(uid, decision, motif, decidePar)`, que l'`onCall` enveloppe : c'est elle que la QA appelle sans mot de passe admin (section 3.4).

Les messages passent par `ecrireMessageKrystine` (à exporter de `functions/src/coffres.ts`, avec un petit `uidKrystine(db)` tiré de `coffres.ts:301-302`). Textes exacts, signés Krystine à la première personne comme les coffres :

- Approbation : « Votre Badge Bleu est posé. Deux cents niskas viennent d'entrer dans votre bourse, et le Skin Vérifié vous attend dans la petite boutique de votre espace, section « Les skins », où il s'active d'un clic. Votre pièce d'identité a été supprimée de nos serveurs au moment même où j'ai pris cette décision. »
- Refus : « Je n'ai pas pu poser votre Badge Bleu cette fois-ci. {motif} Votre pièce d'identité a été supprimée de nos serveurs. Vous pourrez refaire une demande depuis l'onglet Profil de votre espace quand vous le souhaiterez. »

Les membres qui portent déjà la coche posée à la main par l'admin la gardent; rien de rétroactif. Si elles veulent le skin et les niskas, elles font la demande comme les autres et `deciderBadgeBleu` repose `verifie` sans dommage.

### 2.3 La couche Foyer dans `reclamerQuotidien` (`functions/src/niskas.ts:252-286`)

Un seul événement `quotidien` par jour, jamais deux (le compteur `badges.compteurs.jours` de `interactions.ts:72` compte les événements `quotidien`).

1. Dans la `Promise.all` de la transaction (`:263`), deux `tx.get` de plus : `achatsFormations/{uid}/formations/foyer` et `members/{uid}`. `foyer = achat.exists || member.accesVie === true`. Sortir ce jugement dans une fonction exportée `estDuFoyer(tx | db, uid)` de `niskas.ts` (verification.ts n'en a pas besoin, mais elle évite le troisième copier-coller de `notifs.ts:68-73`).
2. `:268` (branche `deja`) et `:272` : `montant = ROUE_QUOTIDIENNE[jour - 1] * (foyer ? FOYER_MULTIPLICATEUR : 1)`; `meta: { jour, serie, foyer }`.
3. Après la transaction, si `!r.deja && foyer` :
   - `estJourHebdoFoyer(r.serie)` (7, 14, 21, 28…, **en plus** du coffre de bronze du jour 7 qui reste pour tout le monde) : le verrou est le journal, `crediterNiskas(uid, KIND_FOYER_HEBDO, montant, cleFoyerHebdo(uid, aujourdhui), { cadeau })`. Si la musique d'Origine manque (`achatsFormations/{uid}/formations/kajabi-2149362766` absent **et** `possede['musique-origine']` absent, `coffres.ts:238-239`) : `montant = 0`, `cadeau = 'musique'`, puis les deux écritures de `coffres.ts:243-246` avec `source: 'foyer-hebdo'`. Sinon `montant = FOYER_NISKAS_HEBDO_SI_MUSIQUE`, `cadeau = 'niskas'`. Quand `crediterNiskas` rend `false`, le cadeau du jour est déjà tombé : rien d'autre.
   - `estJourMoisFoyer(r.serie)` (30, 60, 90, 120…) : même verrou avec `KIND_FOYER_MOIS` et `cleFoyerMois`. `etape = cadeauFoyerDuMois(r.serie)` :
     - `musique` : la musique avec `source: 'foyer-mois'`, ou `etape.niskasSiDeja` (50) si déjà à elle.
     - `skin-rare` : bassin = `[...CONTENUS.argent.rares, ...CONTENUS.or.rares]` (à exporter de `coffres.ts` sous `SKINS_RARES_COFFRES`) moins ce que `boutique/{uid}.possede` contient; tirage `randomInt` (déjà importé dans `coffres.ts`); écriture `possede[article] = serverTimestamp()`; nom lisible dans `NOMS_COSMETIQUES` (à exporter aussi). Bassin vide → `etape.niskasSiDeja` (100).
     - `rabais-huile` : un document `rewardRedemptions` au patron de `coffres.ts:257` : `{ uid, email, rewardId: 'reb-huile-foyer-30', rewardLabel: RABAIS_HUILE_FOYER.labelFR, cost: 0, status: 'pending', source: 'foyer-mois', plafondPourcent: 30, articles: 1, createdAt }`. Krystine l'honore avec un code, un seul article, jamais plus de 30 % : le plafond est écrit dans le document et dans la config, et l'admin n'a aucun champ pour le monter.
   - Chaque cadeau dépose un mot par `ecrireMessageKrystine` : « {serie} jours d'affilée au Foyer. » suivi de la phrase du cadeau : « La musique d'Origine est à vous : vous la trouverez dans l'onglet Téléchargements, et vous pourrez en faire la musique de tout le site. » / « {montant} niskas viennent d'entrer dans votre bourse, puisque la musique d'Origine est déjà à vous. » / « Le {nom du skin} est à vous : il vous attend dans la petite boutique, section « Les skins ». » / « {montant} niskas viennent d'entrer dans votre bourse, puisque tous les skins rares sont déjà à vous. » / « Je vous offre 30 % sur une huile corporelle de votre choix, une seule. Je vous envoie le code par courriel sous peu, et la demande est notée dans votre onglet Niskas, section « Mes récompenses ». »
4. Le retour (`:284`) gagne `foyer: boolean`, `cadeauHebdo: { genre: 'musique' | 'niskas'; montant?: number } | null`, `cadeauMois: { genre: 'musique' | 'skin-rare' | 'rabais-huile' | 'niskas'; nom?: string; montant?: number } | null`.
5. `recalculerSolde` (`:283`) reste à la fin et absorbe tout.

Simuler une journée de cadeau : `memberPoints/{uid}` avec `dernierJour` = la veille de Montréal et `serie` = 6, 29, 59 ou 89 avant d'ouvrir `/compte` (`docs/badge-bleu-existant-recompenses.md`, section 9).

### 2.4 Le skin, le badge, la coche

Le signe public reste la coche `members.verifie` (sept endroits déjà en place). Le badge `badge-bleu` s'ajoute dans `badges/{uid}.obtenus` et paraît en vedette par `BadgeVedette` (laiton, comme les autres : pas de rendu bleu particulier dans ce chantier). Le Skin Vérifié n'entre ni dans `COSMETIQUES` (`niskas.ts`), ni dans `LEGENDAIRES`, `COMMUNS` ou les `rares` des coffres : aucun tirage ne le connaît. Il paraît dans la boutique avec la mention « Réservé au Badge Bleu ».

### 2.5 Hors périmètre, tranché

La coche dans les billets, le clavardage du direct, les groupes et la fiche admin (trous listés dans `badge-bleu-existant-identite.md` 1.5), sauf l'en-tête de la fiche cliente que le LOT ADMIN complète. Le rang `moderateur`. La génération de codes Shopify. Le nettoyage planifié des pièces orphelines : le client supprime la pièce lui-même si l'appel échoue après le téléversement (LOT PROFIL), et le serveur la supprime dans tous les autres chemins.

## 3. LOT SERVEUR

**Fichiers (exactement ceux-ci)** : `functions/src/verification.ts` (nouveau), `functions/src/niskas.ts`, `functions/src/coffres.ts` (exports seulement : `ecrireMessageKrystine`, `uidKrystine`, `SKINS_RARES_COFFRES`, `NOMS_COSMETIQUES`), `functions/src/index.ts`, `firestore.rules`, `storage.rules`.

### 3.1 `verification.ts`
Imports : `onCall, HttpsError` de `firebase-functions/v2/https`, `getFirestore, FieldValue` de `firebase-admin/firestore`, `getStorage` de `firebase-admin/storage` (déjà employé par `musique.ts:3`), `assertAdmin` de `./newsletter/send`, `crediterNiskas` de `./niskas`, `ecrireMessageKrystine, uidKrystine` de `./coffres`, tout le reste de `./badgeBleuConfig`. Appeler `verifierCycleFoyer()` une fois au chargement du module, comme `verifierTables()` dans `coffres.ts`. Région `us-central1`. Deux exports `demanderBadgeBleu`, `deciderBadgeBleu`, plus `deciderBadgeBleuPour` (2.2).

### 3.2 `niskas.ts`
La couche Foyer (2.3) et `estDuFoyer` exporté. Rien d'autre ne bouge dans le fichier.

### 3.3 Les règles
`firestore.rules` : après le bloc `boutique` (`:418-421`), `match /verifications/{uid} { allow read: if isSelf(uid) || isAdmin(); allow write: if isAdmin(); }` (le serveur écrit par l'Admin SDK, l'admin liste les demandes en attente par requête). Dans la liste des `kind` réservés de `pointsEvents` (`:408`), ajouter `'badge-bleu', 'foyer-hebdo', 'foyer-mois'`.

`storage.rules` : avant le tout-venant (`:53`), `match /verifications/{uid}/{fichier} { allow read: if isAdmin(); allow write: if request.auth != null && request.auth.uid == uid && request.resource.size < 8 * 1024 * 1024 && request.resource.contentType.matches('image/.*|application/pdf'); }`. Dans le tout-venant, `allow read: if dossier != 'formations-contenu' && dossier != 'vault' && dossier != 'verifications';`. Ajouter `'alex@lesalondesinconnus.com'` à la liste `isAdmin()` du Storage (`:8-17`), qui manque alors qu'elle est dans Firestore et dans les fonctions : sans elle, Alex ne verrait pas les pièces depuis l'admin.

### 3.4 Déploiement et QA (dans ce lot)
```
cd functions && npm run build
firebase deploy --only functions:demanderBadgeBleu,functions:deciderBadgeBleu,functions:reclamerQuotidien
firebase deploy --only firestore:rules,storage
```
QA par `scripts/qa/tmp-badge-bleu-serveur.mjs` (patron `bannieres-signature.mjs` : compte jetable Identity Toolkit, Firestore par REST avec `gcloud auth print-access-token`, tout effacé à la fin) :
1. Sans achat : téléverser une petite image PNG dans `verifications/{uid}/piece.png` avec l'`idToken` (API REST du Storage), appeler `https://us-central1-krystinestlaurent-87566.cloudfunctions.net/demanderBadgeBleu` avec `Authorization: Bearer <idToken>` et `{ data: { pieceChemin } }` : attendu `failed-precondition` avec `programmes: 0`, et la pièce disparue du bucket.
2. Semer deux achats `achatsFormations/{uid}/formations/{fid}` sur deux formations `paywall == true` réelles (lire `formations` pour en prendre deux), téléverser de nouveau, rappeler : attendu `ok`, `verifications/{uid}` en `en_attente` avec `programmes: 2`.
3. Règles : lire la pièce sans jeton et avec le jeton d'un second compte jetable → refusé; lire `verifications/{uid}` avec le second compte → refusé.
4. `deciderBadgeBleu` appelée avec le jeton de la membre → `permission-denied`.
5. Approbation par `firebase functions:shell` avec un contexte admin simulé (`deciderBadgeBleu({ data: { uid, decision: 'approuvee' }, auth: { uid: 'qa-admin', token: { email: 'admin@krystinestlaurent.ca' } } })`), ou, si le shell renâcle sur v2, par un script Node qui charge `functions/lib/verification.js` et appelle `deciderBadgeBleuPour` avec l'Admin SDK. Attendu : `members.verifie = true`, `pointsEvents/badge-bleu:{uid}` à 200, `memberPoints.balance` à 200, `boutique.possede['skin-verifie']`, `badges.obtenus['badge-bleu']`, `verifications.statut = 'approuvee'` et `pieceChemin: null`, pièce absente du bucket, un fil `dms/{krystineUid}__{uid}` avec le mot. Rappeler avec la même décision → `failed-precondition`.
6. Refus sur un troisième compte : `statut: 'refusee'`, `motif`, pièce absente, mot avec le motif.
7. Foyer : semer `achatsFormations/{uid}/formations/foyer = { titre: "Le Foyer d'Origine", source: "qa" }` et `memberPoints/{uid}` `{ dernierJour: <veille>, serie: 6 }`; appeler `reclamerQuotidien` : attendu `foyer: true`, `montant: 10` (5 × 2), `serie: 7`, `coffre: true`, `cadeauHebdo.genre = 'musique'`, `achatsFormations/{uid}/formations/kajabi-2149362766` avec `source: 'foyer-hebdo'`, `pointsEvents/foyer-hebdo:{uid}:{jour}` à 0. Refaire avec `serie: 29` sur un compte qui possède déjà la musique : `cadeauMois = { genre: 'niskas', montant: 50 }`. Avec `serie: 59` : un skin rare dans `possede`. Avec `serie: 89` : un `rewardRedemptions` `reb-huile-foyer-30` `pending` avec `plafondPourcent: 30`. Un compte sans Foyer à `serie: 6` : `montant: 5`, `foyer: false`, aucun `foyer-hebdo`.
8. Effacer les comptes et tous les documents semés, y compris `pointsEvents`, `verifications`, `coffres/{uid}`, `coffresDons/roue:*`, `dms`, `rewardRedemptions`, `achatsFormations`.

## 4. LOT PROFIL

**Fichiers** : `src/firebase/verification.ts` (nouveau), `src/pages/ClientPortal.tsx` (`ProfilVue`, `:77-171`, un bloc « Badge Bleu » entre la fiche et les niskas), `src/components/client/skins.css`, `src/components/client/BoutiqueNiskas.tsx`.

### 4.1 `src/firebase/verification.ts`
- `interface Verification { statut: StatutVerification; programmes: number; pieceChemin?: string | null; demandeLe?: Timestamp; decideLe?: Timestamp | null; decidePar?: string | null; motif?: string | null }`.
- `suivreVerification(uid, cb)` : `onSnapshot(doc(db, 'verifications', uid))`, `null` si absent.
- `compterProgrammesSuivis(uid)` : `getMesFormations(uid)` et `getFormations()` (`src/firebase/formations.ts:40, :66`), compte des ids dont la formation a `paywall` et `categorie !== 'musique'`. Affichage seulement : le serveur juge.
- `televerserPiece(uid, file)` : refuse un type hors `EXTENSIONS_PIECE` et une taille au-dessus de `TAILLE_PIECE_MAX` avec un message FR/EN; `uploadBytes(ref(getStorage(app), cheminPiece(uid, ext)), file, { contentType })`; rend le chemin.
- `demanderBadgeBleu(pieceChemin)` : `httpsCallable(getFunctions(app, 'us-central1'), 'demanderBadgeBleu')`. Si l'appel échoue après un téléversement réussi, `deleteObject` sur la pièce avant de relancer l'erreur (la membre a le droit d'écrire, donc de supprimer, dans son dossier).

### 4.2 Le bloc « Badge Bleu » de `ProfilVue`
Un encart au patron du bloc des niskas juste en dessous (`rounded-[20px] border … p-5 md:p-6`), libellé `text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]`, titre `font-serif` de deux lignes au plus, uniquement les classes que `skins.css` repeint (`text-[#293027]`, `text-[#38403a]/70`, `bg-white/40`, `border-[#BA7B39]/…`). Quatre états, jugés par `member?.verifie` puis par `suivreVerification` :
1. **Posé** (`verifie`) : la coche `fa-circle-check` en `#3b82f6` (le bleu canon, `docs/canon-espace-client.md`), « Votre Badge Bleu est posé », la date de `decideLe` si elle existe, un rappel que le Skin Vérifié est dans la boutique.
2. **En attente** : « Votre demande est chez Krystine depuis le {date}. » sans bouton.
3. **Refusée** : le `motif` en clair et le formulaire de nouveau ouvert.
4. **Aucune demande** : deux conditions avec une coche ou un cercle vide : « Deux programmes suivis avec Krystine : N sur 2 » (compte client) et « Une pièce d'identité, pour confirmer que ce compte est bien le vôtre ». Sous le seuil : « Il vous manque {2 − N} programme(s) » et un lien vers `/formations`. Au seuil : `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf">` (vider `e.target.value` après lecture, patron `ProblemeTechnique.tsx:137-145`), le nom du fichier choisi, un bouton « Envoyer ma demande » désactivé pendant l'envoi, un message de succès et le message d'erreur repris de l'exception (le serveur renvoie le compte exact).
Sous le formulaire, la phrase de protection, dans tous les états sauf « posé » : « Votre pièce sert uniquement à confirmer que ce compte est bien le vôtre. Krystine seule peut la voir, et elle est supprimée de nos serveurs dès que la décision est prise. » Textes FR/EN, vouvoyés, sans tiret long.

### 4.3 `skins.css`
Un bloc `.skin-verifie` copié du bloc `lotus` (`:325-346`) avec la palette de `SKINS`, `color-scheme: dark`, le texte secondaire à `rgba(242, 246, 251, 0.96)` (section 1, contraste), les boutons `bg-[#BA7B39]` en `#7fb4ff` avec un texte `#0f2540`, le survol en `#b5d4ff`. Le voile de profondeur (`:585-627`) gagne `.skin-verifie` dans les deux listes de sélecteurs et un `::before` propre : deux `radial-gradient` (lueur `rgba(127, 180, 255, .22)` en haut, nuit `rgba(10, 30, 56, .5)` en bas) **et** la coche en motif discret : un `background-image` SVG en data URI, une coche simple (`<path d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z'/>`) en blanc à `fill-opacity: .05`, `background-size: 140px 140px`, sous les dégradés. Le motif vit derrière les panneaux : le contraste des textes ne change pas. Ni `MotifsSkin.tsx` ni `EffetsSkin.tsx` ne bougent. Juger le rendu sans compte sur `/demo-skins?skin=verifie`, puis mesurer avec le patron de `scripts/qa/contraste-tmp.mjs` : chaque texte du profil et de la boutique à 4,5 au moins.

### 4.4 `BoutiqueNiskas.tsx`
Deux branches. `:346-348` : quand `k.reserve === 'badge-bleu'`, la pastille pointillée avec `fa-circle-check` et « Réservé au Badge Bleu » / « Reserved for the Blue Badge », `title` « Ce skin se gagne avec le Badge Bleu, depuis l'onglet Profil de votre espace. », et un clic qui envoie sur `/compte?onglet=profile`. `:356` : quand `rarete === 'exclusif'`, le libellé « Exclusif · Badge Bleu » / « Exclusive · Blue Badge » à la place du coffre d'or par défaut. Possédé : la bascule « Activer le skin » existante suffit.

### 4.5 QA
`scripts/qa/tmp-badge-bleu-profil.mjs` : quatre comptes jetables (aucun achat; deux achats `paywall` sans demande; `verifications` en `en_attente`; `verifie: true` + `possede['skin-verifie']` + `personnalisation.skin = 'verifie'`), captures de l'onglet Profil et de la section skins de la boutique à 1440 et 390, roue fermée par le voile `.fixed.inset-0.z-\[125\]`. Un vrai téléversement d'une image de 2 Ko depuis le navigateur sur le compte à deux achats, jusqu'au statut « en attente » à l'écran (le LOT SERVEUR doit être déployé). Contrastes mesurés sur le skin `verifie`.

## 5. LOT FOYER

**Fichiers** : `src/components/client/RoueQuotidienne.tsx`, `src/pages/client/ClientLoyalty.tsx`, `src/firebase/points.ts` (le type `Quotidien` `:344` et, si besoin, `serie` dans ce que `subscribeToMemberPoints` rend). `pointsConfig.ts` ne bouge pas : `ROUE_QUOTIDIENNE` reste la table de base et l'affichage multiplie.

### 5.1 `points.ts`
`Quotidien` gagne `foyer?: boolean; cadeauHebdo?: { genre: 'musique' | 'niskas'; montant?: number } | null; cadeauMois?: { genre: 'musique' | 'skin-rare' | 'rabais-huile' | 'niskas'; nom?: string; montant?: number } | null`. `PointsBalance` (ou le rappel de `subscribeToMemberPoints`) expose `serie?: number` et `dernierJour?: string` pour la progression.

### 5.2 `RoueQuotidienne.tsx`
Quand `etat.foyer` : la pastille `LIBELLE_FOYER` à côté de « Cadeau du jour »; chaque case affiche `+{montant × FOYER_MULTIPLICATEUR}`; le texte explicatif devient « Jour X sur 7. Au Foyer d'Origine, chaque jour compte double. Le septième jour ouvre un coffre de bronze, et chaque semaine complète vous vaut un cadeau de Krystine, un plus grand à chaque mois complet. »; une ligne de progression sous la grille à partir de `prochainsCadeauxFoyer(etat.serie)` : « Prochain cadeau de semaine dans N jour(s), prochain cadeau de mois dans M jour(s) : {prochainMois.fr}. »; quand `cadeauHebdo` ou `cadeauMois` est là, une ligne qui le nomme (« Une semaine complète : la musique d'Origine est à vous. »). Le titre reste de deux lignes au plus (le montant doublé du jour 7 fait « 10 niskas tombent dans votre bourse. »). Sans Foyer, rien ne change à l'écran.

### 5.3 `ClientLoyalty.tsx`
`EVENT_LABELS` gagne `'badge-bleu': { fr: 'Badge Bleu posé', en: 'Blue Badge granted', icon: 'fa-circle-check' }`, `'foyer-hebdo': { fr: 'Semaine complète au Foyer', en: 'Full week at the Foyer', icon: 'fa-fire' }`, `'foyer-mois': { fr: 'Mois complet au Foyer', en: 'Full month at the Foyer', icon: 'fa-fire' }`. Un encart « Le Foyer double vos jours » visible seulement quand `useMembreDuFoyer()` (`src/components/communaute/ReserveAuFoyer.tsx:12-23`) rend `true` : la mécanique en trois phrases, la progression (`prochainsCadeauxFoyer(serie)`), et la liste des trois mois depuis `CYCLE_FOYER_MOIS` (libellé FR/EN de chaque étape, avec la mention « le cycle repart ensuite à la musique »). Pleine largeur, classes repeintes par `skins.css`.

### 5.4 QA
`scripts/qa/tmp-badge-bleu-foyer.mjs` : compte jetable avec `achatsFormations/{uid}/formations/foyer = { titre: "Le Foyer d'Origine", source: "qa" }`, `memberPoints` `{ dernierJour: <veille>, serie: 6 }`, niskas semés dans `pointsEvents` **et** `memberPoints`; ouverture de `/compte` : capture de la roue à 1440 et 390 (×2 visible, jour 7 à +10, ligne de cadeau hebdo), puis l'onglet Points (encart Foyer, historique avec « Semaine complète au Foyer »). Un second compte sans Foyer : la roue inchangée. Comptes et documents effacés (y compris la musique reçue dans `achatsFormations` et `boutique`, le coffre et `coffresDons/roue:*`).

## 6. LOT ADMIN + INFOLETTRE

**Fichiers** : `src/firebase/verificationAdmin.ts` (nouveau), `src/pages/admin/sections/BadgeBleuSection.tsx` (nouveau), `src/pages/admin/AdminShell.tsx`, `src/pages/AdminDashboard.tsx`, `src/pages/admin/AdminClientView.tsx`, et un script temporaire `scripts/qa/tmp-infolettre-badge-bleu.mjs` pour le brouillon.

### 6.1 `verificationAdmin.ts`
`listerVerifications()` : `getDocs(query(collection(db, 'verifications'), orderBy('demandeLe', 'desc'), limit(100)))`; `getVerification(uid)`; `urlPiece(chemin)` : `getDownloadURL(ref(getStorage(app), chemin))` (permis à l'admin par la règle Storage); `deciderBadgeBleu(uid, decision, motif)` : `httpsCallable(..., 'deciderBadgeBleu')`. Types partagés depuis `src/lib/badgeBleu.ts` et le `Verification` du lot Profil recopié en local (les deux fichiers restent disjoints; une fusion des types se fera après les lots).

### 6.2 `BadgeBleuSection.tsx`
Titre « Badge Bleu ». Les demandes `en_attente` d'abord, puis les décidées. Chaque ligne : nom et courriel (`getMember`), `programmes`, `demandeLe`, un bouton « Voir la pièce » qui ouvre dans `Portail` l'image (`<img>`) ou le PDF (`<iframe>`) par `urlPiece`, un champ motif, deux boutons « Approuver » et « Refuser » (refuser exige un motif) au patron de `CoffreAdmin` (`AdminClientView.tsx:24-57` : garde anti double clic, phrase de confirmation, erreur reprise de l'exception). Après la décision, la ligne se relit. Rappel affiché en tête de section : « La pièce est supprimée de nos serveurs à l'instant où vous décidez. »

### 6.3 `AdminShell.tsx` et `AdminDashboard.tsx`
`AdminSectionId` gagne `'badgeBleu'`; `SECTION_SLUGS.badgeBleu = 'badge-bleu'`; `NAV` gagne `{ id: 'badgeBleu', label: 'Badge Bleu', icon: 'fa-circle-check', groupe: 'communaute' }` juste après `members`. `AdminDashboard.tsx` : l'import et le `case 'badgeBleu'` du `switch` unique (`:84-112`).

### 6.4 `AdminClientView.tsx`
Dans l'en-tête (`:241-248`), à côté de la pastille du dosha : la coche `#3b82f6` si `member.verifie`, et une petite ligne d'état lue par `getVerification(uid)` (« Badge Bleu : demande en attente depuis le … » / « approuvé le … » / « refusé le … : motif »), avec un lien « Traiter dans Badge Bleu » vers `/admin/badge-bleu` quand une demande attend.

### 6.5 Le brouillon d'infolettre
Charger `iris-campagne` et `voix-alex` avant d'écrire. Le brouillon s'écrit dans `newsletters` par `scripts/qa/tmp-infolettre-badge-bleu.mjs` (REST, jeton `gcloud`, comme `~/.claude/scripts/krystine_infolettre.py:98-112`) avec **tous** les champs que le Composer écrit lui-même (`Composer.tsx:123-141`) : `title: 'Le Badge Bleu'`, `subject` sous 60 caractères (proposé : « Le Badge Bleu arrive dans votre espace »), `preheader`, `fromName: 'Krystine St-Laurent'`, `blocks`, `status: 'draft'`, `audience: { mode: 'all' }`, `scheduledFor: null`, `couverture: 'image'`, `couvertureUrl: ENTETE_INFOLETTRE_PAR_DEFAUT.couvertureUrl` (`src/firebase/firestore.ts:413-416`), `signature: true`, `lettreDor: null`, `createdAt`, `updatedAt`, `auteur: 'iris-campagne'`. Jamais `scheduled`, jamais d'envoi. Le script s'efface après; l'identifiant du brouillon se rapporte.

Le corps, dans la voix de Krystine (douze règles du skill, `{{firstName}}` au premier paragraphe, aucune salutation finale) : un `heading` de deux lignes au plus; un paragraphe qui salue et raconte pourquoi un signe de confiance dans une communauté qui grandit; à quoi sert le Badge Bleu (la coche bleue à côté du nom, partout dans l'espace); les deux conditions dites en phrases pleines (deux programmes suivis avec elle, une pièce d'identité qui confirme que le compte est bien le vôtre); la marche à suivre (l'onglet Profil de votre espace, le bloc Badge Bleu, un fichier, un bouton); ce qui vient avec (deux cents niskas et le Skin Vérifié, réservé aux membres qui portent le badge); la protection de la pièce (elle seule la voit, supprimée dès la décision, rien n'est gardé); un `cta` vers `https://www.krystinestlaurent.ca/compte?onglet=profile` (le paramètre `onglet` existe, `ClientPortal.tsx:417`), bouton « Ouvrir mon profil ». Vérifier avec `python3 ~/.claude/skills/voix-alex/scripts/verifier.py` sur le texte des blocs : zéro marqueur.

### 6.6 QA
L'interface admin s'ouvre en local par `?unlock=` (`src/lib/devAdmin.ts`, mode dev seulement) pour les captures de la section et de la fiche cliente à 1440 et 390, avec une demande `en_attente` semée sur un compte jetable. L'aperçu de la pièce et le bouton Approuver exigent un vrai compte admin : la décision elle-même a été prouvée dans le LOT SERVEUR (3.4, point 5); ici, capturer l'état « Réservé à l'admin » renvoyé par la fonction, puis, une fois le lot fini, ouvrir `/admin/badge-bleu` sur le serveur local dans le Chrome d'Alex (Profile 2) pour qu'il approuve la demande de test d'un clic. Le brouillon d'infolettre : capture du Composer ouvert sur le brouillon, statut « Brouillon », bouton d'envoi non touché.

## 7. Ordre et jonctions

1. Les quatre lots partent ensemble : le socle est en place et les fichiers ne se croisent pas.
2. Le LOT SERVEUR déploie ses fonctions et ses règles dès qu'il est vert; les QA de bout en bout des trois autres lots attendent ce déploiement.
3. Après les lots, le fil principal : un seul `typecheck` complet, la boucle `boucle-verdict` sur `/compte` (Profil, Points, roue), `/demo-skins?skin=verifie` et `/admin/badge-bleu`, puis le commit et le déploiement de l'hébergement.
4. Rapport de complétion par lot : chaque point de sa QA avec fait ✅ / pas fait ❌ / bloqué ⏳ et la raison, captures nommées.
