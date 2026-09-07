# Le Foyer social : plan en trois lots à fichiers disjoints

Posé le 6 septembre 2026 par l'architecte, à partir de `docs/canon-espace-client.md` (les briques de `/compte`, classe par classe), de `docs/foyer-social-ecarts.md` (l'inventaire des écarts) et des captures `scratchpad/foyer-social/reference/` et `avant/`.

Le vérificateur `voix-alex` signale des « phrases hachées » dans ce document : ce sont les énumérations de classes et de fichiers entre apostrophes inversées, lues comme des fragments une fois le code retiré. Aucun tiret long, aucune clivée, aucun « on » ne reste dans la prose.

La demande d'Alex, mot pour mot : « Dans le Foyer d'Origine, l'aspect social est trop différent de ce qu'on avait fait dans l'espace client normal. Il faut que ce soit quasiment pareil comme dans l'espace client pour que les gens ne se perdent pas visuellement : le profil d'origine, les membres, la messagerie d'origine, etc. Revoir le visuel de ces trucs-là pour que ce soit la même chose, juste dans un espace différent, un espace exclusif. Il faut que ça ressemble plus à Facebook. »

La réponse en une phrase : toutes les pages sociales entrent dans une seule coquille, copiée de `/compte`, avec la structure de Facebook sous les onglets, et chaque bloc reprend les briques exactes de l'espace client. Le socle est écrit et capturé; les trois lots posent le contenu dedans.

## 1. Le socle, déjà écrit

### 1.1 `src/components/communaute/CadreFoyer.tsx`

La coquille de l'espace exclusif. Elle rend, dans l'ordre :

1. L'enveloppe `relative isolate min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-16 pb-24 skin-<cle>` avec `EffetsSkin` et `MotifsSkin` : le skin de la membre habille le Foyer comme il habille `/compte`.
2. La bannière `h-80 md:h-[25rem]` pleine largeur avec `AvecSignature`, le voile `from-[#151d19]/75`, le mot d'accueil « Le Foyer d'Origine · Bienvenue autour du feu » en haut à gauche, l'avatar `h-28 w-28 md:h-32 md:w-32 border-4 border-[#EEE7DB]` ancré au bas, le nom en `font-serif text-3xl md:text-4xl text-white`, puis la rangée de pastilles : **« Foyer d'Origine » laiton plein** (la signalétique, affichée quand la personne est au Foyer), le dosha en verre, les niskas en laiton et le courriel. Les liens de l'espace admin et de la déconnexion restent à droite, comme dans `/compte`.
3. La rangée d'onglets, mêmes classes que `ClientPortal.tsx:615-631` : Fil, Membres, Groupes, Messages, Mon profil, et tout à droite « Retour à mon espace » vers `/compte`. Sous la rangée, **le filet laiton** `h-0.5 bg-[#BA7B39]`.
4. La grille `mt-8 grid w-full gap-6 px-6 md:px-8 lg:px-10 lg:grid-cols-[240px_minmax(0,1fr)_320px]` :
   - à gauche, un panneau de verre (`rounded-[24px] border-white/60 bg-white/55 backdrop-blur-md`, collant sous `lg`) avec cinq raccourcis : Mon profil, Amies, Groupes, Messages, Badges. Sous `lg`, le même panneau devient une rangée de pastilles qui défile;
   - au centre, `<main class="min-w-0 space-y-4">` : les enfants de la page, passés par `ReserveAuFoyer` quand `garde` est vrai;
   - à droite, le panneau « Autour du feu », qui liste au plus huit membres du groupe `groupes/foyer/membres` (les plus récemment vues d'abord, chacune avec l'icône « écrire »), puis `ClientParrainage`, qui est le même rail que celui de `/compte`.

Ses props :

| Prop | Défaut | Rôle |
|---|---|---|
| `onglet` | aucun | `'fil' \| 'membres' \| 'groupes' \| 'messages' \| 'profil'` : l'onglet allumé. Aucun sur la fiche d'une autre membre. |
| `garde` | `true` | Le centre passe par `ReserveAuFoyer` (le `MotDuFoyer` pour qui n'est pas au Foyer). `false` pour la fiche et la messagerie, que la marraine et les filleules doivent voir. |
| `quoi` | phrase générale | Le mot du garde-fou. |
| `personne` | aucun | Une `MemberDoc` : la bannière montre cette personne (sa bannière de boutique, sa photo, son nom, son dosha), comme la couverture d'un profil Facebook. Le skin reste celui de la membre connectée. |
| `droite` | le rail par défaut | Remplace la colonne de droite. À n'utiliser que si une page a une vraie raison. |

Elle exporte aussi `OngletFoyer` et `CHEMINS_FOYER = { fil: '/fil', membres: '/membres', groupes: '/groupes', messages: '/messages', profil: (uid) => '/membre/' + uid }`. Tout lien vers une page du Foyer passe par cette table.

Ce qu'elle ne rend pas, à dessein : le bouton « Problème technique », la roue du jour et le jeu de bienvenue restent des couches de `/compte`.

Captures du socle, prises sur une route temporaire retirée depuis : `scratchpad/foyer-social/socle/cadre-1440.png`, `cadre-390.png`, `cadre-nuit-1440.png`, `cadre-nuit-390.png`. Mesures : 1 360 px utiles sur 1440 et 342 sur 390, bannière de 400 et 320 px, h1 Cormorant 36 et 30 px sur une ligne, aucun débordement horizontal, skin Nuit repeint partout.

### 1.2 `src/components/communaute/CarteSociale.tsx`

Trois exports :

- `CarteSociale` (défaut) : la carte de la boutique, `rounded-[18px] border border-[#293027]/10 bg-white/60 p-5 md:p-6 dark:border-white/10 dark:bg-white/5`, avec un en-tête optionnel en petites capitales laiton (`titre`) et un geste à droite (`action`). Avec `panneau`, elle prend le verre des rails (`rounded-[24px] border-white/60 bg-white/55 p-5 backdrop-blur-md dark:bg-[#293027]/55`). Props : `titre`, `action`, `panneau`, `id`, `className`.
- `RangeePersonne` : la rangée d'ami de l'onglet Amis (`rounded-[15px] border border-[#38403a]/10 p-3`), avec le médaillon `Avatar`, le nom en `text-sm font-medium`, la coche bleue, un `sousTitre` en petites capitales grises et une `action` à droite. `compact` retire la bordure pour un rail.
- `PETITES_CAPITALES` : la chaîne `text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]`, pour un libellé posé hors d'une carte.

### 1.3 `src/pages/GroupesPage.tsx`

Un début de page : `/groupes` et `/groupes/:id` dans le `CadreFoyer`, avec `EspaceGroupe` au centre. Le LOT B la termine.

## 2. Ce qui est tranché pour tout le monde

1. **Les routes.** `/fil` (le fil), `/membres` avec `?vue=amies` et `?vue=demandes`, `/membre/:uid`, `/groupes` et `/groupes/:id`, `/messages` et `/messages/:autreUid`. La route `/communaute` ne bouge pas : c'est une page statique servie par l'hébergement (`firebase.json`, `src/lib/staticRoutes.ts`), hors du périmètre.
2. **Chaque page sociale rend `<CadreFoyer …>` et rien d'autre autour.** Elle ne garde ni `min-h-screen`, ni `pt-28`, ni `max-w-*`, ni `mx-auto`, ni titre h1 (la bannière nomme le lieu). La branche « connectez-vous » disparaît des pages : la coquille la porte.
3. **La palette est celle de `/compte`, sans exception.** Crème `#EEE7DB`, encre `#293027` et `#38403a`, nuit `#151d19`, laiton `#BA7B39` (fond, bordure, pastille), laiton clair `#d9a05b` (survol, accent en sombre), laiton profond `#9c6630`, brun `#8B4A2F` en texte sur crème, bleu `#3b82f6` pour la coche. Les jetons de juin sont bannis partout dans le social : `#f6f3ee`, `#2a2015`, `#3a3126`, `#bb9a5e`, `#7d6330`, `#a3823f`, `#16100a`. Jamais `text-[#BA7B39]` en texte sur crème.
4. **Les seules briques.** Un bloc est une `CarteSociale`; une personne est une `RangeePersonne`; un médaillon est `Avatar`; un billet est `BilletCarte`; une conversation est `ClientMessagerie`; un garde-fou est `MotDuFoyer`. Personne ne dessine une carte, une rangée ou un avatar de plus.
5. **Les boutons**, copiés du canon (§ 7 et 8) :
   - principal encre : `inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:opacity-50 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]`
   - principal laiton : `inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#9c6630] disabled:opacity-50`
   - secondaire bordé : `inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] disabled:opacity-50 dark:border-white/15 dark:text-white/70`
   - « Refuser » : `rounded-full border border-[#38403a]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/50 hover:text-red-500 dark:border-white/15 dark:text-white/50`
   - icône ronde d'action : `flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8B4A2F] transition-colors hover:bg-[#BA7B39]/15 dark:text-[#d9a05b]`
6. **Les filtres en pilules**, copiés de `ClientMessagerie.tsx:93-97` : base `relative flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors`, actif `bg-[#BA7B39] text-[#293027]`, inactif `bg-[#BA7B39]/12 text-[#8B4A2F] hover:bg-[#BA7B39]/25 dark:text-[#d9a05b]`, compteur `ml-1 rounded-full bg-[#293027] px-1.5 py-0.5 text-[9px] text-[#d9a05b]`.
7. **Le champ de recherche en pilule** (`BoutiqueNiskas.tsx:468`) : `w-full rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] sm:w-56 dark:border-white/15 dark:bg-white/10 dark:text-white`.
8. **Les états vides** : `text-sm text-[#38403a]/50 dark:text-white/50`, dans une `CarteSociale` quand le bloc est seul dans la colonne.
9. **Interdits** : l'italique (même la classe `italic`), un `lg:bg-…` ou `md:text-[#…]` sur une couleur (les skins ne repeignent pas les variantes responsives), une couleur posée en `style={{ color }}`, un `max-w` centré, une fenêtre hors de `Portail`.
10. **Les langues.** `const { lang } = useApp(); const fr = lang === 'FR';`. Tout libellé d'interface écrit ou touché par un lot (titre de carte, bouton, filtre, état vide) existe en FR et en EN. Les textes de contenu déjà en place restent tels quels.
11. **Le garde-fou.** `garde` reste vrai par défaut. Seules la fiche (`/membre/:uid`) et la messagerie (`/messages`) passent `garde={false}`, parce que la marraine et les filleules y ont accès sans le Foyer; ces deux pages gardent leurs vérifications internes (`useAmiesDOrigine`, `filsVisibles`).
12. **Le socle ne se modifie pas dans les lots.** `CadreFoyer.tsx` et `CarteSociale.tsx` appartiennent à la session principale. Un lot qui a besoin d'une prop de plus l'écrit dans son rapport, avec la ligne exacte, et fait sans en attendant.
13. **Typecheck.** `npx tsc -p tsconfig.json --noEmit 2>&1 | grep -E '<fichiers du lot>'` doit rendre zéro ligne. Le projet porte déjà 47 erreurs ailleurs (`src/firebase.ts`, `LeadMagnetMusic.tsx`, `BoutiqueLoeuvre.tsx`, `EditableText.tsx`, `shopify.ts`, `QuizPage.tsx`…) : elles ne sont à personne ici et ne se corrigent pas dans ces lots.
14. **Aucun commit, aucun déploiement.** Les scripts temporaires vont dans `scripts/qa/tmp-<lot>.mjs` et se suppriment à la fin.

### 2.1 Comment se prend une capture

Copier le patron de `scripts/qa/bannieres-signature.mjs` : un compte jetable par l'API Identity Toolkit (`accounts:signUp`), la session injectée dans IndexedDB (`firebaseLocalStorageDb`, clé `firebase:authUser:<API_KEY>:[DEFAULT]`), la roue du jour fermée par un clic sur le fond de `.fixed.inset-0.z-\[125\]`, le compte effacé à la fin (`accounts:delete` et suppression REST de chaque document écrit). Le jeton REST vient de `gcloud auth print-access-token`.

Pour ouvrir le Foyer au compte : écrire `achatsFormations/{uid}/formations/foyer` avec `{ titre: "Le Foyer d'Origine", source: "qa" }` **et** `groupes/foyer/membres/{uid}` avec `{ ajouteLe: <maintenant> }` (le premier ouvre le garde-fou, le second fait apparaître la pastille et la personne dans « Autour du feu »). Pour la fiche : `members/{uid}` avec `displayName`, `dosha`, `lastSeenAt`. Pour un skin : `members/{uid}.personnalisation.skin = 'nuit'`.

Pour que la carte Loi 25 ne recouvre pas le rail sur les captures : `localStorage.setItem('inspirata.consent.v1', 'rejected')` avant la navigation, avec `krystine-jeu-vu` (la date du jour) et `krystine-banniere-flash-vu = '1'`.

Chaque lot capture à 1440 × 900 et à 390 × 844 (`isMobile: true`), en pleine page, puis une fois de plus avec le skin `nuit` à 1440. Les captures vont dans `scratchpad/foyer-social/<lot>/` et se **regardent** avec la grille : pleine largeur sans colonne centrée, rien qui cache rien, titres sur deux lignes au plus, texte lisible sur le skin, et la comparaison directe avec `reference/profile-1440.png`. Trois tours au plus.

## 3. LOT A : le fil et les billets

Fichiers du lot, et seulement eux : `src/pages/CommunauteEspace.tsx`, `src/components/communaute/MurSocial.tsx`, `src/components/communaute/BilletCarte.tsx`, `src/components/communaute/Composeur.tsx`, `src/components/communaute/PubCarte.tsx`, `src/components/communaute/VoteBar.tsx`.

### 3.1 `CommunauteEspace.tsx`, le fil à `/fil`

Le composant devient la page du fil dans la coquille. Ce qu'il rend :

```
<CadreFoyer onglet="fil">
  <div className="flex flex-wrap gap-2">   {/* les trois pilules du § 2.6 */}
    Foyer · Krystine · Communauté
  </div>
  <MurSocial fil={filActif} />
</CadreFoyer>
```

- Les trois fils : « Foyer » = `formation:foyer` (le fil participatif, où les membres publient), « Krystine » = `'krystine'`, « Communauté » = `'communaute'`. Le fil par défaut est « Foyer ». Le choix se lit et s'écrit dans `?fil=foyer|krystine|communaute` (`useSearchParams`), pour que la cloche puisse y mener.
- Tout le reste du fichier disparaît : la branche `!user`, le h1 « Communauté », la grille à deux colonnes, les onglets mobiles en `bg-[#2a2015]`.
- Le fil `krystine` et le fil `communaute` sont en lecture pour les membres (le `Composeur` le sait déjà); le fil `formation:foyer` montre le `Composeur`.

### 3.2 `MurSocial.tsx`

- `titre` devient optionnel et ne rend rien s'il est vide (le cas de toutes les pages du Foyer).
- Le conteneur passe à `space-y-4`.
- L'état vide se rend dans une `CarteSociale` : `<CarteSociale><p className="text-sm text-[#38403a]/50 dark:text-white/50">…</p></CarteSociale>`, en FR et en EN. Les trois phrases existantes restent (« Rien de publié pour le moment. », « Le feed de cette formation est encore vide. Partagez votre parcours. », « Le fil est encore vide. Soyez la première voix. »), plus leur version anglaise.
- La `PubCarte` tous les quatre billets reste réservée au fil `communaute`.

### 3.3 `BilletCarte.tsx`

- La copie locale `Medaillon` est retirée; le fichier importe `Avatar` de `./Avatar` (même API : `nom`, `url`, `taille`; le LOT B ne la change pas).
- Le commentaire de tête est mis à jour : la carte fait la vidéo, le partage et l'épinglage.
- Les classes de la carte ne bougent pas (`bg-white/55 backdrop-blur-md rounded-[20px] border-white/60 …`) : c'est le verre de l'espace client, et elle vit directement sur la crème, jamais dans une `CarteSociale`.
- Le champ de commentaire passe à `bg-white` (le champ du canon, § 11) au lieu de `bg-white/60`.

### 3.4 `Composeur.tsx`

- La phrase « Seule Krystine publie sur ce fil. » perd la classe `italic` et se rend dans une `CarteSociale` : `<CarteSociale><p className="text-sm text-[#38403a]/50 dark:text-white/50">…</p></CarteSociale>`, en FR et en EN.
- La zone de texte adopte le champ du canon : `rounded-2xl border border-[#38403a]/10 bg-white px-4 py-2.5 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/10 dark:text-white`.
- « Publier » est le bouton principal laiton du § 2.5; Photo et Vidéo sont le bouton secondaire bordé.
- Le placeholder reste « Quoi de neuf, {prénom} ? » (« What's new, {first name}? »).
- La carte du composeur garde son verre (`rounded-[20px] border-white/60 bg-white/55`) : même famille que `BilletCarte`.

### 3.5 `PubCarte.tsx` et `VoteBar.tsx`

- `PubCarte` : rien à changer dans la structure. Vérifier que le texte des cinq suggestions est en FR et en EN via `lang`.
- `VoteBar` : le score positif passe de `text-[#BA7B39]` à `text-[#8B4A2F] dark:text-[#d9a05b]` (règle 3 du § 2). Le chevron actif suit.

### 3.6 Captures attendues du LOT A (`scratchpad/foyer-social/lot-a/`)

Avec un compte du Foyer, après avoir publié deux billets (un texte, un texte avec photo) par le `Composeur` dans le navigateur, puis un commentaire sur le premier :

| Fichier | Ce qu'il montre |
|---|---|
| `fil-foyer-1440.png`, `fil-foyer-390.png` | `/fil` : les pilules, le composeur, deux billets, le commentaire ouvert |
| `fil-krystine-1440.png` | `/fil?fil=krystine` : l'état vide en carte, aucun composeur |
| `fil-communaute-1440.png` | `/fil?fil=communaute` : la carte « Seule Krystine publie » |
| `fil-nuit-1440.png` | `/fil` sous le skin `nuit` |
| `fil-garde-1440.png` | `/fil` avec un compte sans le Foyer : le `MotDuFoyer` au centre, la coquille intacte |

## 4. LOT B : les membres, la fiche, les groupes

Fichiers du lot, et seulement eux : `src/pages/CommunauteMembres.tsx`, `src/pages/MembreProfilPage.tsx`, `src/components/communaute/EspaceGroupe.tsx`, `src/components/communaute/Avatar.tsx`, `src/pages/GroupesPage.tsx`.

### 4.1 `Avatar.tsx`

- Un repli quand l'image ne charge pas : un état `casse`, posé par `onError`, qui rend l'initiale à la place de l'image (les photos Google s'affichent cassées dans les captures).
- La signature ne change pas (`nom`, `url`, `taille`). Une prop `className` optionnelle peut s'ajouter.

### 4.2 `CommunauteMembres.tsx`, l'annuaire à `/membres`

```
<CadreFoyer onglet="membres">
  <CarteSociale titre={`Membres · ${n}`} action={<input … recherche en pilule (§ 2.7) />}>
    <div className="mb-4 flex flex-wrap gap-2">  Toutes · Mes amies (n) · Demandes (n)  </div>   {/* § 2.6 */}
    <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
      <RangeePersonne … />
    </div>
  </CarteSociale>
</CadreFoyer>
```

- Les deux coquilles empilées, le `max-w-3xl`, le `max-w-4xl`, le h1, la branche `!user` et le `ReserveAuFoyer` local disparaissent : la coquille fait tout ça.
- Trois vues, lues dans `?vue=` (`toutes` par défaut, `amies`, `demandes`), branchées sur `suivreMesAmities(uid)` :
  - Toutes : `getAllMembers()`, filtré par la recherche sur `displayName`;
  - Mes amies : les liens `statut === 'amis'`;
  - Demandes : les demandes reçues (`statut === 'demande' && de !== moi`), puis les demandes envoyées en dessous sous un `PETITES_CAPITALES` « Demandes envoyées ».
- Chaque personne est une `RangeePersonne` : `sousTitre` = « Dosha pitta » quand il y en a un, `action` = « Écrire » (secondaire bordé, `fa-envelope text-[9px]`, vers `/messages/:uid`) pour une amie ou une membre, « Accepter » (laiton) et « Refuser » pour une demande reçue, « En attente » (`text-[10px] uppercase tracking-widest text-[#38403a]/40`) pour une demande envoyée. Jamais le bouton pour soi-même.
- Le bouton « Contacter l'équipe de modération » devient un secondaire bordé placé sous la grille, à droite (`flex justify-end`), vers `/messages/<UID_MODERATION>`; l'uid `kYorHEdND9bfk5A4I3oxVJJSquR2` sort de la JSX vers une constante `UID_MODERATION` en tête de fichier, avec un commentaire qui dit ce que c'est.
- Chargement : `py-12 flex justify-center` + `fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl`.

### 4.3 `MembreProfilPage.tsx`, la fiche à `/membre/:uid`

```
<CadreFoyer onglet={soi ? 'profil' : undefined} garde={false} personne={profil}>
  <CarteSociale titre="À propos" action={les gestes}>
    dosha · membre depuis · MotDuFoyer compact si pas d'origine · badges (id="badges")
  </CarteSociale>
  {soi && <Composeur fil="communaute" contexte="monmur" />}
  <p className={PETITES_CAPITALES}>Publications</p>
  <BilletCarte … /> × n
</CadreFoyer>
```

- La bannière propre à la fiche, l'espace `h-24`, la carte `max-w-2xl -mt-12`, la branche `!user` disparaissent. La coquille montre la bannière de la personne (`personne={profil}`), donc sa bannière de boutique et non plus seulement `bannerURL`. Le bug de la carte glissée sous la barre fixe disparaît avec.
- Pendant le chargement : `<CadreFoyer garde={false}>` avec le spinner du § 4.2. Fiche introuvable : une `CarteSociale` avec « Ce membre est introuvable. » et sa version anglaise.
- La carte « À propos » : à gauche, deux lignes en `text-sm text-[#293027] dark:text-white` avec le libellé en `text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]` (« Dosha », « Membre depuis » avec `joinedAt` en `toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric' })`); à droite, dans `action`, les gestes :
  - amies : la pastille d'état laiton du canon § 9 (`border border-[#BA7B39] bg-[#BA7B39]/15 … text-[#8B4A2F]`) avec `fa-check` « Amies d'origine »;
  - demande reçue : « Accepter l'amie d'origine » en laiton;
  - demande envoyée : « Demande envoyée » en mention discrète;
  - sinon : « Amie d'origine » en principal encre;
  - toujours : « Écrire » en secondaire bordé vers `/messages/:uid`.
  Sous `sm`, `action` passe sous le titre (`flex-wrap`).
- Sans l'origine (`!origine`) : `<MotDuFoyer compact lang={lang} quoi=… />` à la place des gestes, avec le texte actuel (« L'amitié d'origine et les messages de boîte à boîte se débloquent avec le Foyer d'Origine. »).
- Les badges : sous un `PETITES_CAPITALES` « Badges », dans un bloc `id="badges"` (cible du raccourci « Badges » de la colonne de gauche), chaque badge en pastille du canon § 9 : la vedette en `border-[#BA7B39] bg-[#BA7B39] text-[#293027] shadow-[0_8px_20px_-10px_rgba(186,123,57,0.9)]` avec `fa-star`, les autres en `border-[#BA7B39]/40 bg-[#BA7B39]/10 text-[#8B4A2F] dark:text-[#d9a05b]`. Le `BadgeVedette` sort du h1 : il n'y a plus de h1 dans la page.
- Le mur : `BilletCarte` pour chaque publication de `suivrePublicationsDe(uid)` (import de `../components/communaute/BilletCarte`, API inchangée : `post`, `delaiIndex`, `estSauvegarde`). La carte simplifiée actuelle (texte, image, cœurs en texte) disparaît. État vide : « Aucune publication pour le moment. » en `text-sm text-[#38403a]/50`.
- Pour soi : le `Composeur` en `contexte="monmur"` au-dessus des publications (son billet part dans le fil `perso` pour une membre, dans `communaute` pour l'admin : logique déjà en place).

### 4.4 `EspaceGroupe.tsx`

- Nouvelle prop `variante?: 'page' | 'cadre'`, `'page'` par défaut (celle de `/cours/foyer`, qui ne change pas d'apparence sauf les deux corrections ci-dessous).
- En `'cadre'` (celle de `/groupes`) : pas de colonne de gauche ni de droite. Le centre rend une rangée de pilules du § 2.6 (« Le fil », les onglets de Krystine, « Gardés »), puis le fil (`MurSocial`) ou les billets gardés. La colonne « Membres » n'est pas rendue : le rail « Autour du feu » de la coquille la remplace.
- Deux corrections, dans les deux variantes :
  - le nom écrasé par le badge : la colonne Membres (variante `page`) utilise `RangeePersonne compact` avec `sousTitre={<BadgeVedette uid={m.uid} />}`, le badge passe sous le nom et le nom garde sa place;
  - le débordement à 390 : `min-w-0` sur les trois enfants de la grille et `grid-cols-1` explicite sous `lg`; vérifier par `document.documentElement.scrollWidth` que rien ne dépasse 390.
- La classe des pilules d'onglet de la variante `page` s'aligne sur le § 2.6 (elle en est déjà proche).

### 4.5 `GroupesPage.tsx`

Le début de page existe. À terminer :

- Sous la coquille, une rangée de pilules (§ 2.6) des groupes de la membre : « Le Foyer d'Origine » d'abord, toujours, puis chaque `getMesFormations(uid)` dont l'id n'est pas `foyer`, avec son `titre`. La pilule active est `id` (défaut `'foyer'`); chaque pilule est un `Link` vers `/groupes/<id>`.
- Puis `<EspaceGroupe formationId={id} variante="cadre" />`.
- Une membre qui ouvre un groupe qu'elle n'a pas acheté voit ce que les règles laissent passer; aucun garde de plus ici.

### 4.6 Captures attendues du LOT B (`scratchpad/foyer-social/lot-b/`)

Deux comptes jetables : A au Foyer, B sans le Foyer mais avec une demande d'amitié envoyée à A (document `amities/<a>__<b>` écrit par REST, `{ paire: [a, b] triés, de: b, statut: 'demande' }`, lire `src/firebase/amities.ts` pour les champs exacts).

| Fichier | Ce qu'il montre |
|---|---|
| `membres-toutes-1440.png`, `membres-toutes-390.png` | l'annuaire complet en rangées, la recherche, les trois pilules |
| `membres-demandes-1440.png` | la vue Demandes avec Accepter et Refuser |
| `membres-amies-1440.png` | la vue Mes amies après acceptation |
| `membre-autre-1440.png`, `membre-autre-390.png` | la fiche de B vue par A : la bannière de B, « À propos », les gestes, les publications |
| `membre-soi-1440.png`, `membre-soi-390.png` | la fiche de A par A : onglet « Mon profil » allumé, le composeur, les badges |
| `membre-garde-1440.png` | la fiche de A vue par B : le `MotDuFoyer` compact à la place des gestes |
| `groupes-1440.png`, `groupes-390.png` | `/groupes` : les pilules de groupes, le fil du Foyer |
| `cours-foyer-groupe-390.png` | la section « Autour du feu » de `/cours/foyer` : plus aucun débordement, les noms lisibles |
| `membres-nuit-1440.png` | l'annuaire sous le skin `nuit` |

## 5. LOT C : la messagerie d'origine, la cloche, la navigation

Fichiers du lot, et seulement eux : `src/pages/client/ClientMessagerie.tsx`, `src/pages/MessagesPage.tsx`, `src/components/communaute/Cloche.tsx`, `src/components/communaute/ReserveAuFoyer.tsx`, `src/components/layout/NavBar.tsx`, `App.tsx` (à la racine), `src/pages/ClientPortal.tsx`.

### 5.1 `App.tsx`, le routeur

- Un lazy de plus : `const GroupesPage = lazy(() => import('./src/pages/GroupesPage'));`
- Routes ajoutées : `/fil` → `<CommunauteEspace />`, `/groupes` et `/groupes/:id` → `<GroupesPage />`.
- Routes inchangées : `/membres`, `/membre/:uid`, `/messages`, `/messages/:autreUid`, `/compte`, `/cours/:id`, `/communaute` (le `HardReload`).

### 5.2 `MessagesPage.tsx`, la messagerie à `/messages`

Le fichier se réécrit en une vingtaine de lignes :

```
const { autreUid } = useParams();
return (
  <CadreFoyer onglet="messages" garde={false}>
    <CarteSociale>
      <ClientMessagerie avec={autreUid} dansFoyer />
    </CarteSociale>
  </CadreFoyer>
);
```

Tout le reste (la grille 12 colonnes, la recherche, les bulles `rounded-[16px]`, les imports lucide) disparaît : il n'existe plus qu'un seul dessin de conversation, celui de l'espace client.

### 5.3 `ClientMessagerie.tsx`

Le composant gagne deux props et garde tout le reste tel quel :

- `avec?: string` : au montage, si `avec` est donné et que `origine.pret && origine.peutEcrire(avec)`, le composant charge `getMember(avec)`, appelle `ensureThread(monUid, monNom, maPhoto, avec, nomDeLAutre, photoDeLAutre)`, pose `setFilActif(threadId(monUid, avec))` et `setVolet('amies')`. Si `peutEcrire(avec)` est faux, il rend le `MotDuFoyer compact` avec le texte actuel de la marraine et des filleules. Les imports viennent de `../../firebase/dms` (`ensureThread`, `threadId`) et de `../../firebase/firestore` (`getMember`).
- `dansFoyer?: boolean` : cache le lien du bas de la liste. Quand la prop est absente (l'onglet Messagerie de `/compte`), le lien reste, pointe sur `/messages` et se lit « Ouvrir dans le Foyer » (« Open in the Hearth ») avec `fa-fire`.
- La boîte garde `h-[60vh] min-h-[420px]`; le bouton d'envoi reste `bg-[#293027] text-[#d9a05b]`; la bulle à moi reste `rounded-2xl rounded-br-sm bg-[#BA7B39] text-[#293027]`.

### 5.4 `Cloche.tsx`

- `const foyer = useMembreDuFoyer();` (import depuis `./ReserveAuFoyer`). Les liens deviennent :
  - message non lu : `foyer ? '/messages' : '/compte?onglet=messagerie'`;
  - demande d'amitié : `foyer ? '/membres?vue=demandes' : '/compte?onglet=amis'`;
  - billet de Krystine : `foyer ? '/fil?fil=communaute' : '/compte'`;
  - cadeau : `/compte`;
  - les deux liens « Ouvrir ma messagerie » du bas des pop-ups : `foyer ? '/messages' : '/compte?onglet=messagerie'`; chaque ligne du pop-up des messages mène au même endroit.
- Les deux pop-ups passent de `bg-white/90` à `bg-[#EEE7DB] dark:bg-[#293027]`, opaques : le texte de la bannière ne transparaît plus derrière « Ce qui vous attend ».
- Le bouton Messages de la cloche prend `hidden sm:inline-flex` : sous 640 px, ses éléments vivent déjà dans la liste des notifications.
- Rien d'autre ne bouge : pas de `Portail` ici (la barre n'est pas transformée, l'ancrage `absolute` tient).

### 5.5 `NavBar.tsx`, la barre à 390

Le but : une membre connectée à 390 px voit la cloche, le panier, l'avatar, la langue et le menu, tous dans l'écran. Le geste : le bouton de la musique prend `hidden sm:inline-flex` (ou l'équivalent dans `IconButton`), et si ça ne suffit pas, le `gap` de la rangée descend d'un cran sous `sm`. La mesure qui fait foi : le `getBoundingClientRect().right` du dernier bouton de la rangée est inférieur ou égal à 390.

### 5.6 `ClientPortal.tsx`, les liens croisés

Trois retouches, sans toucher à la coquille de `/compte` ni à ses classes :

1. La `Rangee` locale de `ClientAmis` (ligne 202) est remplacée par `RangeePersonne` (import de `../components/communaute/CarteSociale`), même `action` qu'aujourd'hui : un seul dessin d'avatar pour la même personne partout.
2. En tête de l'onglet Amis, pour une membre du Foyer (`foyer` de `useAmiesDOrigine`), une ligne : le `PETITES_CAPITALES` « Le Foyer d'Origine » puis un secondaire bordé « Ouvrir le cercle au Foyer » (« Open the circle in the Hearth ») vers `/membres?vue=amies`, avec `fa-fire text-[9px]`. Le lien « Voir les membres » de l'état vide reste.
3. L'onglet Messagerie n'a rien à faire : le lien « Ouvrir dans le Foyer » vient de `ClientMessagerie`.

### 5.7 `ReserveAuFoyer.tsx`

Aucun changement prévu. Le fichier est dans le lot pour que personne d'autre n'y touche : `useMembreDuFoyer`, `useAmiesDOrigine`, `ReserveAuFoyer` et `MotDuFoyer` gardent leur signature, la coquille et les deux autres lots en dépendent.

### 5.8 Captures attendues du LOT C (`scratchpad/foyer-social/lot-c/`)

Deux comptes du Foyer, A et B, amies (document `amities` écrit par REST avec `statut: 'amis'`). Tant que les deux pannes du § 6 ne sont pas réparées, la liste des conversations reste vide et l'envoi échoue : les captures montrent alors la conversation ouverte par `/messages/<b>` et l'erreur en rouge sous le champ, et le rapport le dit.

| Fichier | Ce qu'il montre |
|---|---|
| `messages-liste-1440.png`, `messages-liste-390.png` | `/messages` : la boîte de l'espace client dans la coquille du Foyer, onglet « Messages » allumé |
| `messages-fil-1440.png`, `messages-fil-390.png` | `/messages/<b>` : la conversation ouverte avec B |
| `messages-garde-1440.png` | `/messages` avec un compte sans le Foyer ni marraine : le `MotDuFoyer` |
| `messages-nuit-1440.png` | `/messages` sous le skin `nuit` |
| `compte-amis-1440.png` | `/compte?onglet=amis` : la ligne « Ouvrir le cercle au Foyer », les rangées en `RangeePersonne`, la coquille de `/compte` intacte |
| `compte-messagerie-1440.png` | `/compte?onglet=messagerie` : le lien « Ouvrir dans le Foyer » |
| `cloche-notifications-1440.png`, `cloche-messages-1440.png` | les deux pop-ups opaques sur la bannière de `/compte` |
| `entete-390.png` | la barre à 390, connectée : tous les boutons dans l'écran (bande de 120 px du haut) |

## 6. Hors lots : deux pannes de données, pour la session principale

Elles expliquent les boîtes vides et les envois qui échouent dans toutes les captures de `docs/foyer-social-ecarts.md` (§ 7). Elles touchent des fichiers qui ne sont dans aucun lot et demandent un déploiement, donc elles reviennent à la session principale, avec le OK d'Alex pour déployer.

1. **L'index de la boîte de réception.** `subscribeInbox` (`src/firebase/dms.ts:103`) combine `array-contains` sur `participantUids` et `orderBy('lastMessageAt', 'desc')`. Dans `firestore.indexes.json`, ajouter :
   ```
   { "collectionGroup": "dms", "queryScope": "COLLECTION",
     "fields": [ { "fieldPath": "participantUids", "arrayConfig": "CONTAINS" },
                 { "fieldPath": "lastMessageAt", "order": "DESCENDING" } ] }
   ```
   puis `firebase deploy --only firestore:indexes`.
2. **Le blocage lu chez l'autre.** `estBloquePar` (`dms.ts:45`) lit `blocages/{autreUid}`, que la règle `isSelf` refuse. Dans `firestore.rules:160`, la règle devient `allow get: if isSelf(uid) || (isSignedIn() && request.auth.uid in resource.data.uids); allow list, write: if isSelf(uid);` : une personne qui figure sur la liste peut lire le document (et le client conclut « bloquée »), une personne qui n'y figure pas reçoit un refus. Dans `estBloquePar`, envelopper le `getDoc` d'un `try/catch` qui rend `false` sur un refus. Puis `firebase deploy --only firestore:rules`.

## 7. Après les trois lots

La session principale relit le code de chaque lot (pas seulement les rapports), lance le typecheck complet, puis une passe de captures sur les sept routes du Foyer (`/fil`, `/membres`, `/membre/:uid` pour soi et pour une autre, `/groupes`, `/messages`, `/messages/:uid`) et sur `/compte?onglet=amis`, à 1440 et à 390, avec le skin `nuit` sur au moins deux d'entre elles, et compare chaque écran à `reference/profile-1440.png`. Quand les huit tiennent la grille, le chantier est prêt à être montré à Alex, et à lui seul revient le déploiement.
