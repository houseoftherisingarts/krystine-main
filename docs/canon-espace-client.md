# Canon visuel de l'espace client (/compte)

Relevé du code tel qu'il est écrit le 6 septembre 2026. Chaque brique donne les classes Tailwind exactes, copiées du fichier, avec `fichier:ligne`. Un nouvel écran de l'espace client (le Foyer social ou autre) reprend ces classes mot pour mot : les skins de `src/components/client/skins.css` repeignent des sélecteurs précis, et tout balisage qui s'en écarte reste crème et vert sur un skin sombre.

Captures de référence (compte jetable, bannière d'origine, dosha pitta, 120 niskas, Foyer ouvert) : `scratchpad/foyer-social/reference/{profile,amis,messagerie}-{1440,390}.png`.

## 0. Les jetons

| Rôle | Valeur | Où il vit |
|---|---|---|
| Crème (fond de page, panneau opaque, champ) | `#EEE7DB` | `bg-[#EEE7DB]` |
| Vert encre (texte principal, bouton principal clair) | `#293027` | `text-[#293027]`, `bg-[#293027]` |
| Vert encre secondaire (texte gris chaud, bordures) | `#38403a` | `text-[#38403a]/70`, `border-[#38403a]/10` |
| Nuit (fond sombre, voile de bannière, verre sombre) | `#151d19` | `dark:bg-[#151d19]`, `from-[#151d19]/75`, `bg-[#151d19]/40` |
| Panneau sombre | `#293027` à 55 % | `dark:bg-[#293027]/55` |
| Laiton (bouton, bordure, pastille, fond teinté) | `#BA7B39` | `bg-[#BA7B39]`, `border-[#BA7B39]`, `bg-[#BA7B39]/15` |
| Laiton clair (hover, accent texte en sombre) | `#d9a05b` | `hover:bg-[#d9a05b]`, `dark:text-[#d9a05b]` |
| Laiton profond (hover d'un bouton laiton) | `#9c6630` | `hover:bg-[#9c6630]` |
| Brun accent EN TEXTE sur crème (titres de section, liens) | `#8B4A2F` | `text-[#8B4A2F]` |
| Encre douce (hover du bouton principal) | `#3a453a` | `hover:bg-[#3a453a]` |
| Bleu de vérification | `#4da3ff` (bannière), `#3b82f6` (listes) | `text-[#4da3ff]` |

Polices (`index.html:135-137`) : `font-serif` = Cormorant Garamond, `font-sans` (défaut du body, `index.html:208`) = Inter. Le rail du parrainage l'écrit en toutes lettres : `font-['Cormorant_Garamond'] lining-nums` (`ClientParrainage.tsx:72`). Aucun italique dans les briques vivantes; les trois `italic` qui restent (`ClientPortal.tsx:795, 937, 1063`, `ClientLoyalty.tsx:487`, `ClientSupport.tsx:65`) sont des restes des onglets Commandes et Dosha et ne se copient pas.

Rayons employés : `rounded-full` (boutons, pastilles, avatars), `rounded-[24px]` (panneau principal, rail, fenêtres), `rounded-[20px]` (cartes d'onglet, boîte de messagerie, encart niskas), `rounded-[18px]` (cartes de la boutique, carte cadeau), `rounded-[16px]` (menu de la bannière, cartes vidéo, avis), `rounded-[15px]` (rangée d'ami), `rounded-[14px]` (paquets, détails, messages d'état), `rounded-[12px]` (ligne de menu, vignette), `rounded-2xl` (bulles, tuiles, paliers), `rounded-xl` (champs de l'éditeur de profil).

Ombres employées : `shadow-xl` (avatar), `shadow-2xl` (menu, bouton flottant), `shadow-[0_30px_80px_-30px_rgba(41,48,39,0.45)]` (carte de connexion), `shadow-[0_10px_28px_-10px_rgba(186,123,57,0.8)]` (bouton laiton), `shadow-[0_8px_20px_-10px_rgba(186,123,57,0.9)]` (badge en vedette), `hover:shadow-[0_18px_40px_-24px_rgba(41,48,39,0.5)]` (carte de boutique), `shadow-[0_18px_40px_-24px_rgba(139,74,47,0.6)]` (encart verrouillé), `drop-shadow-[0_10px_18px_rgba(58,40,20,0.35)]` (image de paquet).

Gouttières : `px-6 md:px-8 lg:px-10` partout où la page touche le bord (bannière, onglets, grille). Espacement vertical des sections d'onglet : `space-y-8`; entre cartes : `space-y-2` ou `gap-4`; libellé → contenu : `mt-1`, `mt-2`, `mt-3`.

## 1. La coquille de page

`src/pages/ClientPortal.tsx:534`

```
relative isolate min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-16 pb-24 ${skin}
```

`${skin}` vaut `skin-<cle>` quand un skin est actif ou survolé dans la boutique (`ClientPortal.tsx:524-525`), sinon la chaîne vide. C'est cette enveloppe que `skins.css` cible avec `.skin-x.bg-\[\#EEE7DB\]` (fond) et `.skin-x.bg-\[\#EEE7DB\]::before` (voile de profondeur, `skins.css:589-627`). Les scènes animées et motifs des skins riches se posent juste sous elle (`ClientPortal.tsx:536-537`) : `<EffetsSkin>` et `<MotifsSkin>`.

La page est pleine largeur du haut en bas : aucun `max-w` ni `mx-auto` sur la coquille, la bannière ni la grille. Le seul `max-w-md` est la carte « Se connecter » de l'état déconnecté (`ClientPortal.tsx:478`), qui n'est pas l'espace client.

## 2. La bannière et l'avatar qui la chevauche

Bannière (`ClientPortal.tsx:541-545`) :

```
<div class="relative h-80 w-full overflow-hidden md:h-[25rem]">
  <AvecSignature signe={...} className="h-full w-full">
    <img class="h-full w-full object-cover" />
  </AvecSignature>
  <div class="absolute inset-0 bg-gradient-to-t from-[#151d19]/75 via-[#151d19]/20 to-transparent" />
```

Mot d'accueil en haut à gauche, quand la bannière n'est pas une photo personnelle (`ClientPortal.tsx:547-554`) :

```
absolute left-6 top-5 md:left-8 md:top-6
  p: text-[10px] font-bold uppercase tracking-[0.3em] text-white/75   style textShadow 0 1px 10px rgba(0,0,0,0.4)
  p: mt-1 font-serif text-xl text-[#EEE7DB] md:text-2xl                style textShadow 0 2px 14px rgba(0,0,0,0.5)
```

Bouton « Changer la bannière », verre sombre en haut à droite (`ClientPortal.tsx:319-324`) :

```
absolute right-4 top-4 z-[5]
  button: inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#151d19]/40 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md transition-colors hover:bg-[#151d19]/60
```

Son menu (`ClientPortal.tsx:330`) : `mt-2 w-72 rounded-[16px] border border-white/60 bg-[#EEE7DB] p-2 shadow-2xl dark:border-white/10 dark:bg-[#293027]`; chaque ligne (`:316`) : `flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-xs text-[#293027] transition-colors hover:bg-[#BA7B39]/15 dark:text-white`; la coche (`:317`) : `fa-circle-check text-[#8B4A2F]` ou `fa-circle text-[#293027]/20`.

Rangée du bas, posée par-dessus la photo (`ClientPortal.tsx:557-609`) :

```
absolute inset-x-0 bottom-0
  flex items-end gap-5 px-6 pb-5 md:px-8 lg:px-10
    avatar (button) : group relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-[#EEE7DB] bg-cover bg-center bg-[#EEE7DB] shadow-xl md:h-32 md:w-32 dark:border-[#151d19]
      vide : flex h-full w-full items-center justify-center text-[#293027]/30  +  fa-user text-3xl
      survol : absolute inset-0 flex items-center justify-center bg-[#151d19]/50 opacity-0 transition-opacity group-hover:opacity-100  +  fa-pen text-white
    bloc nom : min-w-0 flex-1 pb-1
      h1 : flex items-center gap-2.5 truncate font-serif text-3xl text-white md:text-4xl   style letterSpacing -0.01em, textShadow 0 2px 18px rgba(0,0,0,0.45)
        coche vérifiée : fa-circle-check shrink-0 text-xl text-[#4da3ff]
      rangée de pastilles : mt-1.5 flex flex-wrap items-center gap-2
        dosha : rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm
        niskas (button) : rounded-full bg-[#BA7B39] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#293027] transition-colors hover:bg-[#d9a05b]
          <PieceNiska size={14} className="mr-1 inline-block align-[-2px]" />
        courriel : hidden truncate text-xs text-white/70 sm:inline
    liens de droite : hidden shrink-0 items-center gap-4 pb-2 md:flex
      admin : text-xs uppercase tracking-widest text-[#d9a05b] hover:text-white
      déconnexion : text-xs uppercase tracking-widest text-white/60 hover:text-red-300
```

L'avatar ne « déborde » pas de la bannière au sens géométrique : il est ancré au bas de la bannière (`absolute inset-x-0 bottom-0`), la bordure crème de 4 px le détache du voile sombre et la rangée d'onglets vient juste dessous. Sur la capture 1440 la photo occupe 400 px; sur 390 elle occupe 320 px, l'avatar de 112 px et le nom restent côte à côte, les deux pastilles passent sous le nom et seul le courriel disparaît (`hidden sm:inline`).

## 3. La rangée d'onglets

`ClientPortal.tsx:615-631`

```
<div class="border-b border-[#38403a]/10 bg-white/45 backdrop-blur-xl dark:border-white/10 dark:bg-[#293027]/45">
  <div class="flex flex-nowrap gap-1 overflow-x-auto px-6 md:px-8 lg:px-10">
    button : flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-2 py-3.5 text-[10px] font-bold uppercase tracking-wide transition-colors 2xl:px-3 2xl:text-[11px] 2xl:tracking-wider
      actif   : border-[#BA7B39] text-[#8B4A2F] dark:text-[#d9a05b]
      inactif : border-transparent text-[#38403a]/55 hover:text-[#8B4A2F] dark:text-white/55 dark:hover:text-[#d9a05b]
      icône   : fa-solid {icon} hidden 2xl:inline
```

Une seule rangée qui défile horizontalement, jamais deux lignes. Les onglets, dans l'ordre (`:507-518`) : Profil, Amis, Commandes, Mes formations, Rediffusions, Téléchargements, Niskas, Dosha, Lettres, Messagerie. Un onglet s'ouvre par `?onglet=<id>` (`:411-414`).

Sous-onglets en pilules, à l'intérieur d'un onglet (Messagerie, `ClientMessagerie.tsx:93-97`) :

```
relative flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors
  actif   : bg-[#BA7B39] text-[#293027]
  inactif : bg-[#BA7B39]/12 text-[#8B4A2F] hover:bg-[#BA7B39]/25 dark:text-[#d9a05b]
  compteur : ml-1 rounded-full bg-[#293027] px-1.5 py-0.5 text-[9px] text-[#d9a05b]
```

Filtres en pilules bordées (vidéos, `BoutiqueNiskas.tsx:458`) : `rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors` + actif `border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]` / inactif `border-[#38403a]/15 text-[#38403a]/60 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/60`.

## 4. La grille à deux colonnes et le panneau principal

`ClientPortal.tsx:634-635`

```
<div class="mt-8 grid w-full gap-6 px-6 md:px-8 lg:px-10 lg:grid-cols-[1fr_320px]">
  <div class="min-w-0 rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md md:p-8 dark:border-white/10 dark:bg-[#293027]/55">
    ... l'onglet ...
  </div>
  <RailCommunaute />   (aside, voir §12)
</div>
```

Le panneau principal est le verre clair de l'espace : `border-white/60 bg-white/55 backdrop-blur-md`. Sous `lg` la colonne de droite passe sous le panneau (une seule colonne, capture 390). La grille étire le panneau à la hauteur du rail (`align-items: stretch` par défaut) : un onglet court, comme Amis vide, laisse un grand panneau presque vide à côté du rail (capture `amis-1440.png`); un nouvel onglet gagne à remplir cette hauteur plutôt qu'à la laisser blanche.

Avis en tête de panneau (retour de Stripe, `:637`) : `mb-5 flex items-center justify-between gap-3 rounded-[16px] border border-[#BA7B39]/40 bg-[#BA7B39]/15 px-4 py-3 text-sm text-[#293027] dark:text-white`, croix `text-[#293027]/50 hover:text-[#293027] dark:text-white/50`.

## 5. Le titre de section en petites capitales

La forme canonique, employée dans tous les onglets (`ClientPortal.tsx:97, 139, 238, 252, 266, 396`; `ClientParrainage.tsx:61`; `BoutiqueNiskas.tsx:186, 213, 433`; `ClientPreferences.tsx:54`) :

```
text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]
```

Variantes vivantes :
- avec repeinte sombre explicite : `text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]` (`ReserveAuFoyer.tsx:65`, `CadeauCarte.tsx:39`);
- plus serré, dans le rail : `mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F]` (`ClientParrainage.tsx:95, 114, 145`);
- résumé de `<details>` : `cursor-pointer text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F] dark:text-[#d9a05b]` (`ClientPortal.tsx:121`);
- titre de bloc en gris encre (Messagerie, Niskas) : `text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60` (`ClientMessagerie.tsx:108`, `ClientLoyalty.tsx:341`), suivi de `mt-1 text-xs text-[#293027]/40 dark:text-white/40`.

Le titre serif qui suit un libellé : `mt-1 font-serif text-2xl text-[#293027] dark:text-white` (`BoutiqueNiskas.tsx:187, 434`), ou `font-serif text-xl` pour une catégorie (`:253`). Libellé de champ : `text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]` en marge d'une valeur (`ClientPortal.tsx:89`), ou `block text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-2` au-dessus d'un champ (`:732`).

## 6. La carte

Carte d'onglet, teintée laiton (encart des niskas, `ClientPortal.tsx:94`) :

```
rounded-[20px] border border-[#BA7B39]/30 bg-gradient-to-br from-[#BA7B39]/15 to-transparent p-5 md:p-6
```

Carte de boutique, blanche translucide avec ombre au survol (`BoutiqueNiskas.tsx:140`) :

```
flex flex-col overflow-hidden rounded-[18px] border border-[#293027]/10 bg-white/60 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(41,48,39,0.5)] dark:border-white/10 dark:bg-white/5
```

Ses variantes : panneau des paquets `mt-6 rounded-[18px] border border-[#BA7B39]/40 bg-white/60 p-5 dark:border-[#BA7B39]/40 dark:bg-white/5` (`:212`); tuile de paquet `flex flex-col rounded-[14px] border p-4 text-center` + phare `border-[#BA7B39] bg-[#BA7B39]/10` ou `border-[#293027]/10 bg-white/50 dark:border-white/10 dark:bg-white/5` (`:222`); carte vidéo `flex flex-col overflow-hidden rounded-[16px] border border-[#293027]/10 bg-white/60 dark:border-white/10 dark:bg-white/5` (`:484`), vignette `relative aspect-video bg-[#293027]/10`, corps `flex flex-1 flex-col p-3`.

Carte fermée / mise en garde laiton (`BoutiqueNiskas.tsx:441`) : `mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[18px] border-2 border-[#BA7B39] bg-[#BA7B39]/15 p-5 shadow-[0_18px_40px_-24px_rgba(139,74,47,0.6)]`, avec sa pastille ronde `inline-flex h-12 w-12 flex-none items-center justify-center rounded-full bg-[#293027] text-[#d9a05b] dark:bg-[#BA7B39] dark:text-[#293027]`.

Mot du Foyer (`ReserveAuFoyer.tsx:64`) : `rounded-[20px] border border-[#BA7B39]/40 bg-[#BA7B39]/10 text-center p-6 md:p-8` (ou `p-4` compact), titre `mx-auto mt-3 max-w-md font-serif text-[#293027] dark:text-white text-xl`.

Carte cadeau (`CadeauCarte.tsx:34`) : `flex gap-4 rounded-[18px] border border-[#BA7B39]/50 bg-[#BA7B39]/10 p-5`, image `hidden h-24 w-36 flex-none rounded-[12px] object-cover sm:block`.

Carte de niveau / récompense (`ClientLoyalty.tsx:191, 316, 358`) : `rounded-[20px] p-6 md:p-8 mb-6 border` (couleurs posées en style par le palier) et `rounded-2xl border border-[#293027]/10 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5`.

`<details>` repliable dans une carte (`ClientPortal.tsx:120`) : `mt-4 rounded-[14px] border border-[#BA7B39]/25 bg-white/40 px-4 py-3 dark:bg-white/5`.

## 7. Le bouton principal

Deux habits, tous deux pleins et en petites capitales.

Encre sur clair, laiton en sombre (le plus courant : boutique, cadeaux, Mot du Foyer) (`ClientPortal.tsx:104`; `BoutiqueNiskas.tsx:160, 231, 498`; `CadeauCarte.tsx:58`; `ReserveAuFoyer.tsx:67`) :

```
inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:opacity-50 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]
```

(tailles vues : `px-4 py-2 text-[10px]`, `px-5 py-2.5 text-[10px]`, `px-6 py-3 text-[11px] tracking-[0.18em]`.)

Laiton plein, texte encre (pastille de niskas, Accepter, Acheter des niskas) (`ClientPortal.tsx:243, 591`; `ClientLoyalty.tsx:237`; `BoutiqueNiskas.tsx:203`) :

```
inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#d9a05b] disabled:opacity-50
```

(hover `hover:bg-[#9c6630]` sur Accepter; version de connexion `px-10 py-4 text-xs shadow-[0_10px_28px_-10px_rgba(186,123,57,0.8)] transition-[background-color,transform] active:scale-[0.98]`, `ClientPortal.tsx:491`.)

Ancienne écriture, encore présente dans les onglets Profil-édition, Dosha et Niskas (`ClientPortal.tsx:744, 1070, 1149`; `ClientLoyalty.tsx:273, 301, 398`) : `bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#BA7B39] hover:text-[#293027] transition-colors disabled:opacity-50`. Elle passe au laiton au survol; préférer la première pour tout nouveau bouton.

Bouton or métallique, réservé à l'achat d'une saison complète (`BoutiqueNiskas.tsx:159`, feuille `src/components/bouton-compte.css`) : `bouton-compte inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-40`. Un seul par écran.

Bouton rond d'envoi (`ClientMessagerie.tsx:217`) : `flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#293027] text-[#d9a05b] transition-colors hover:bg-[#BA7B39] hover:text-[#293027] disabled:opacity-40 dark:bg-[#BA7B39] dark:text-[#293027]`.

Bouton d'achat avec le prix : `<PieceNiska size={16} />` puis le nombre nu (`BoutiqueNiskas.tsx:162-163`).

## 8. Le bouton secondaire bordé

Forme canonique (`BoutiqueNiskas.tsx:277`, identique à `ClientPortal.tsx:107, 224`, `BoutiqueNiskas.tsx:318, 512`) :

```
inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] disabled:opacity-50 dark:border-white/15 dark:text-white/70
```

(icône devant : `fa-solid fa-... text-[9px]`; petite version `px-4 py-1.5`; version « Refuser » `border border-[#38403a]/15 px-3 py-1.5 text-[#38403a]/50 hover:text-red-500`, `ClientPortal.tsx:244`.)

Secondaire teinté laiton (`ClientPortal.tsx:110`; `ClientLoyalty.tsx:234`) : `inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:bg-[#BA7B39]/10 dark:text-[#d9a05b]` (ou `bg-white/60 hover:bg-white dark:bg-white/10`).

Bascule à deux états (`BoutiqueNiskas.tsx:172-176`) : base `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors`; actif `border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]` avec `fa-check text-[9px]`; inactif = le secondaire bordé ci-dessus avec `fa-circle text-[9px]`.

Lien texte : `text-[#8B4A2F] underline-offset-2 hover:underline` (`ClientPortal.tsx:256`) ou en capitales `text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:underline dark:text-[#d9a05b]` (`ClientMessagerie.tsx:168`).

## 9. La pastille

Pastille d'état laiton (« Sans signature », « Dans vos téléchargements ») (`BoutiqueNiskas.tsx:303`) :

```
inline-flex items-center gap-2 rounded-full border border-[#BA7B39] bg-[#BA7B39]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]
```

Badge de profil, sélectionnable (`ClientPortal.tsx:151`) : base `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors`; en vedette `border-[#BA7B39] bg-[#BA7B39] text-[#293027] shadow-[0_8px_20px_-10px_rgba(186,123,57,0.9)]` avec `fa-star`; sinon `border-[#BA7B39]/40 bg-[#BA7B39]/10 text-[#8B4A2F] hover:border-[#BA7B39] dark:text-[#d9a05b]`.

Pastille de solde en serif (`BoutiqueNiskas.tsx:195`) : `inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/40 bg-white/60 px-4 py-2 font-serif text-lg text-[#293027] dark:bg-white/10 dark:text-white`.

Pastilles sur photo (bannière, `ClientPortal.tsx:584, 591`) : verre blanc `rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm` et laiton plein (§7).

Durée sur vignette (`BoutiqueNiskas.tsx:487`) : `absolute bottom-2 right-2 rounded-full bg-[#151d19]/75 px-2 py-0.5 text-[10px] font-bold text-white`. Point « non lu » : `h-2 w-2 shrink-0 rounded-full bg-[#BA7B39]` (`ClientMessagerie.tsx:164`). Compteur : `rounded-full bg-[#293027] px-1.5 py-0.5 text-[9px] text-[#d9a05b]` (`:100`). Icône ronde de catégorie : `inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]` (`BoutiqueNiskas.tsx:251`). Mention discrète : `text-[9px] uppercase tracking-widest text-[#293027]/40 dark:text-white/40` (`ClientPortal.tsx:133`) ou `text-[10px] uppercase tracking-widest text-[#38403a]/40 dark:text-white/40` (« En attente », `:268`).

La pièce : `<PieceNiska size={n} />` (`src/components/client/PieceNiska.tsx`), image `/niska.webp` avec repli SVG; `eteinte` la passe en gris. Tailles vues : 12 (dans un bouton bordé), 14 (pastille de bannière), 16 (bouton d'achat, avis), 18 (paquet), 34 (solde du profil).

## 10. La liste et la rangée de personne

Rangée d'ami (`ClientPortal.tsx:202-213`) :

```
<div class="flex items-center gap-3 rounded-[15px] border border-[#38403a]/10 p-3 dark:border-white/10">
  <Link class="flex min-w-0 flex-1 items-center gap-3">
    <div class="h-10 w-10 shrink-0 rounded-full bg-cover bg-center bg-[#BA7B39]/15">
      vide : flex h-full w-full items-center justify-center text-[#8B4A2F]  +  fa-user text-sm
    </div>
    <span class="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-[#293027] dark:text-white">
      <span class="truncate">nom</span>  +  fa-circle-check shrink-0 text-[12px] text-[#3b82f6]
    </span>
  </Link>
  {action à droite}
</div>
```

Les rangées s'empilent dans `mt-3 space-y-2` sous leur titre §5. Texte vide : `mt-3 text-sm text-[#38403a]/50 dark:text-white/50` avec un lien §8.

Médaillon partagé (`src/components/communaute/Avatar.tsx:8`) : `rounded-full overflow-hidden shrink-0 border border-[#BA7B39]/30 bg-[#EEE7DB] dark:bg-white/10 flex items-center justify-center font-serif text-[#8B4A2F] dark:text-white/80`, initiale à `fontSize: taille * 0.4`; tailles 36 (en-tête de fil), 40 (liste de fils), 44 (défaut).

Liste à deux colonnes de gains (`ClientPortal.tsx:128-134`) : `ul mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2`, ligne `flex items-baseline gap-2`, chiffre `w-16 shrink-0 text-right font-serif font-bold text-[#8B4A2F] dark:text-[#d9a05b]`, libellé `text-[#293027]/85 dark:text-white/85`.

Palier (rail, `ClientParrainage.tsx:18-26`) : `flex items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors` + atteint `border-[#BA7B39]/70 bg-[#BA7B39]/10` / à venir `border-white/50 bg-white/30 dark:border-white/10 dark:bg-white/5`; rond `mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full` + `bg-[#BA7B39] text-[#293027]` ou `bg-[#38403a]/8 text-[#8B4A2F] dark:bg-white/10`; titre `block text-[12px] font-semibold leading-snug text-[#38403a] dark:text-white`; sous-titre `block text-[10.5px] text-[#38403a]/55 dark:text-white/50`.

Ligne de réglage (`ClientPreferences.tsx:9-12`) : `flex items-center justify-between gap-4 py-3.5 border-b border-[#38403a]/8 dark:border-white/10 last:border-b-0`, titre `block text-[10px] font-bold uppercase tracking-widest text-[#38403a] dark:text-white`, sous-titre `block mt-1 text-xs leading-relaxed text-[#38403a]/60 dark:text-white/55`; interrupteur `relative h-6 w-11 flex-none rounded-full transition-colors` avec bouton `absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform`.

Historique (`ClientLoyalty.tsx:496`) : `flex items-center gap-4 border border-[#293027]/5 dark:border-white/5 rounded-xl p-3`, icône ronde `w-9 h-9 rounded-full`, montant `font-serif font-bold text-[#8B4A2F]`.

## 11. Le champ de saisie

Champ de formulaire (éditeur de profil, `ClientPortal.tsx:733`) :

```
w-full px-4 py-3 rounded-xl border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027] dark:text-white outline-none focus:border-[#BA7B39]
```

(désactivé : `text-[#293027]/60 dark:text-white/60`, sans focus.)

Champ de recherche en pilule (`BoutiqueNiskas.tsx:468`) : `w-full rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] sm:w-56 dark:border-white/15 dark:bg-white/10 dark:text-white`.

Zone de message (`ClientMessagerie.tsx:211`) : `max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-[#38403a]/10 bg-white px-4 py-2.5 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/10 dark:text-white`, dans `form border-t border-[#38403a]/10 p-3 dark:border-white/10` puis `flex items-end gap-2`; Entrée envoie, Maj+Entrée saute une ligne (`:208`). Erreur : `mb-2 text-xs text-red-600`.

Champ du soutien (`ClientSupport.tsx:114`) : `flex-1 px-4 py-3 rounded-full border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027] dark:text-white outline-none focus:border-[#BA7B39]`.

Le focus est toujours `outline-none focus:border-[#BA7B39]`, jamais un anneau.

## 12. La conversation

Boîte (`ClientMessagerie.tsx:135`) :

```
grid h-[60vh] min-h-[420px] grid-cols-1 overflow-hidden rounded-[20px] border border-[#38403a]/10 bg-[#EEE7DB] dark:border-white/10 dark:bg-white/5 md:grid-cols-[260px_1fr]
```

Liste des fils (`:137`) : `flex flex-col overflow-y-auto border-[#38403a]/10 dark:border-white/10 md:border-r`, cachée sur mobile quand un fil est ouvert (`hidden md:flex`). Ligne de fil (`:154`) : `flex w-full items-center gap-3 border-b border-[#38403a]/5 px-4 py-3 text-left transition-colors dark:border-white/5` + actif `bg-[#BA7B39]/15` / `hover:bg-[#BA7B39]/8`; nom `truncate text-sm` + non lu `font-bold text-[#293027] dark:text-white` / lu `text-[#293027]/85 dark:text-white/85`; heure `shrink-0 text-[10px] text-[#293027]/40 dark:text-white/40`; aperçu `truncate text-xs text-[#293027]/50 dark:text-white/50`.

État vide (`:139-143`) : `flex h-full flex-col items-center justify-center px-6 text-center text-[#293027]/40 dark:text-white/40`, icône `fa-regular fa-comments mb-3 text-3xl`, `text-sm` puis `mt-2 text-xs`.

En-tête du fil (`:182`) : `flex items-center gap-3 border-b border-[#38403a]/10 px-4 py-3 dark:border-white/10`, retour mobile `text-[#38403a]/60 hover:text-[#8B4A2F] md:hidden dark:text-white/60`, nom `truncate text-sm font-bold text-[#293027] hover:text-[#8B4A2F] dark:text-white`.

Zone des messages (`:189`) : `flex-1 space-y-2 overflow-y-auto px-4 py-4`, défilée en bas à chaque message.

Bulle (`:193-197`) :

```
<div class="flex justify-end | justify-start">
  <div class="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
              moi   : rounded-br-sm bg-[#BA7B39] text-[#293027]
              autre : rounded-bl-sm bg-white text-[#293027] dark:bg-white/10 dark:text-white">
    <p class="whitespace-pre-wrap break-words">corps</p>
    <p class="mt-1 text-[10px]  moi: text-[#293027]/55  autre: text-[#293027]/40 dark:text-white/40">heure</p>
```

Bulle du soutien (`ClientSupport.tsx:92`) : même `max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line`; une lettre d'or arrive dans `<CadreOr fin className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">` (`:72`).

## 13. La colonne de droite

`ClientPortal.tsx:377-381` : `<aside class="space-y-4">` qui ne contient plus que le parrainage. Sa carte (`ClientParrainage.tsx:60`) reprend le verre du panneau principal, en plus serré :

```
rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55
```

Dedans, dans l'ordre : titre §5 « Invitez vos proches » (`:61`), paragraphe `mt-2 text-xs leading-relaxed text-[#38403a]/65 dark:text-white/60` (`:64`), le code en grand `font-['Cormorant_Garamond'] lining-nums text-[34px] leading-none tracking-[0.18em] text-[#38403a] dark:text-white` (`:72`), le bouton copier `mt-3 flex w-full items-center gap-2 rounded-full border border-[#BA7B39]/50 bg-white/60 px-4 py-2 text-left text-[11px] text-[#38403a]/80 transition-colors hover:border-[#BA7B39] dark:bg-white/5 dark:text-white/80` (`:76`), deux tuiles `grid grid-cols-2 gap-2` avec `rounded-2xl bg-[#38403a]/5 px-3 py-2.5 dark:bg-white/5` et `rounded-2xl bg-[#BA7B39]/12 px-3 py-2.5`, chiffre `font-['Cormorant_Garamond'] lining-nums text-[28px] leading-none text-[#38403a] dark:text-white`, légende `mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8B4A2F]` (`:84-92`), puis « Les badges » et « Les cadeaux » en paliers §10 (`:95-134`), la liste des filleules `flex items-center gap-2 text-[11.5px] text-[#38403a]/80 dark:text-white/75` avec point `h-1.5 w-1.5 rounded-full bg-[#BA7B39]` (`:148-149`).

Le second bloc de la même famille, dans l'onglet Profil, est `ClientPreferences.tsx:53` : `w-full rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55`.

## 14. Fenêtres, flottants et couches

Toute fenêtre passe par `src/components/Portail.tsx` (rendue à `document.body`, sinon un parent animé l'envoie sous le pli). Modèle (`ClientPortal.tsx:663-675`) :

```
<Portail>
  <div class="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/60 p-4 backdrop-blur-sm" onClick=fermer>
    <div class="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-white/60 bg-[#EEE7DB] p-6 md:p-8 dark:border-white/10 dark:bg-[#293027]" onClick=stopPropagation>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="font-serif text-2xl text-[#293027] dark:text-white">titre</h2>
        <button class="flex h-9 w-9 items-center justify-center rounded-full text-[#293027]/40 hover:text-[#293027] dark:text-white/40 dark:hover:text-white"><i class="fa-solid fa-times text-lg" /></button>
```

Couches en usage : `z-[5]` bouton de bannière, `z-[120]` éditeur de profil, `z-[125]` roue du jour (à fermer par un clic sur son fond en QA), `z-[130]` fond d'écran. Voile de verrou sur une grille (`BoutiqueNiskas.tsx:474-476`) : `absolute inset-0 z-[3] flex items-start justify-center rounded-[16px] bg-[#EEE7DB]/55 pt-16 backdrop-blur-[2px] dark:bg-[#151d19]/55` avec un bouton `rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] shadow-2xl dark:bg-[#BA7B39] dark:text-[#293027]`.

Chargement : `py-12 flex justify-center` + `fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl` (`ClientPortal.tsx:790`). Message d'état (`BoutiqueNiskas.tsx:243`) : `mt-4 rounded-[14px] px-4 py-3 text-sm` + ok `bg-[#BA7B39]/15 text-[#293027] dark:text-white` / erreur `bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200`.

Animation d'attention, une seule fois (`ClientPortal.tsx:357-367`) : anneau laiton `box-shadow: 0 0 0 14px rgba(186,123,57,0)` sur 0,8 s, trois fois, coupé par `prefers-reduced-motion`. Transitions : `transition-colors` sur tout ce qui se survole, `transition-shadow` sur les cartes, `transition-transform duration-500` sur les images (`group-hover/img:scale-[1.03]`), `transition-[width] duration-700 ease-out` sur les jauges.

## 15. Les skins : ce qu'ils repeignent et la règle qui en découle

`src/components/client/skins.css` (719 lignes, plus `skins/motifs.css` et `skins/effets.css`) porte dix-huit skins : medzo, nuit, coffee, aube, terre, foret, ocean, encre, lotus, feminite, teal-orange, nature, aurore, or-pur, golden-hour, vata, pitta, kapha. Chacun pose ses variables (`--sk-fond`, `--sk-panneau`, `--sk-encre`, `--sk-accent`, `--sk-accent-clair`, `--sk-accent-profond`; medzo, nuit et coffee ont leurs propres noms) puis repeint, avec `!important`, les classes Tailwind que l'espace emploie. Le skin ne touche jamais au balisage : il ne voit que les classes.

Sélecteurs repeints par tous les skins (comptés dans le fichier) :

| Famille | Classes attrapées | Devient |
|---|---|---|
| Fond de page | `bg-[#EEE7DB]` (sur l'enveloppe et dedans) | `--sk-fond` |
| Fond sombre / encre | `bg-[#293027]`, `bg-[#151d19]/40`, `bg-[#151d19]/60` | encre du skin (les lettres dedans reçoivent la couleur panneau) |
| Texte principal | `text-[#293027]` sans opacité | `--sk-encre` |
| Texte secondaire, toute opacité | `[class*="text-[#293027]/"]`, `[class*="text-[#38403a]"]`, `[class*="text-[#3a3126]"]`, `[class*="text-[#2a2015]"]` | encre du skin à ~0,72 |
| Accent en texte | `text-[#8B4A2F]`, `dark:text-[#d9a05b]` | `--sk-accent-profond` |
| Bouton laiton | `bg-[#BA7B39]` (et tout ce qu'il contient) | `--sk-accent`, texte forcé lisible (`skins.css:657-719`, spécificité `:not(#_)`) |
| Survol laiton | `hover:bg-[#d9a05b]`, `hover:bg-[#9c6630]` | `--sk-accent-clair` |
| Bordure laiton | `border-[#BA7B39]`, `hover:border-[#BA7B39]`, `border-[#BA7B39]/40`, `/50` | accent |
| Teintes laiton | `bg-[#BA7B39]/8`, `/10`, `/15`, `/20` | accent à ~0,14-0,18 |
| Verre blanc | `bg-white/25`, `/40`, `/45`, `/50`, `/55`, `/60`, `/70`, `bg-white` | panneau du skin (blanc opaque garde une encre `#293027` forcée) |
| Bordures neutres | `border-white/60`, `border-[#293027]/10`, `/15`, `border-[#38403a]/10`, `/15`, `divide-[#293027]/10` | encre du skin à ~0,12-0,14 |
| Voile de bannière | `from-[#151d19]/75`, `via-[#151d19]/20` | encre du skin |
| Panneaux sombres | `dark:bg-[#151d19]`, `dark:bg-[#293027]`, `dark:bg-[#293027]/55`, `/45` | fond sombre du skin |
| Champs | `input`, `textarea`, `select`, `::placeholder` | encre et fond du skin |

Les sélecteurs d'attribut (`[class^="text-[#293027]/"]`, `[class*=" text-[#38403a]"]`) ont été ajoutés le 6 septembre 2026 parce qu'une opacité non listée (/65, /45, /30) restait vert encre sur Dark Coffee (`skins.css:152-158`). Ils attrapent donc toute opacité de ces quatre encres, présente et à venir.

Règles pour tout nouveau balisage de l'espace client :

1. Le fond de page reste `bg-[#EEE7DB] dark:bg-[#151d19]`; un panneau est `bg-white/55` (ou /60, /40, /70) avec `border-white/60`; un panneau opaque est `bg-[#EEE7DB]` ou `bg-white`. Jamais `bg-[#faf7f0]`, `bg-stone-100`, `bg-neutral-50` : rien ne les repeint.
2. Le texte est `text-[#293027]` (principal) ou `text-[#293027]/NN` et `text-[#38403a]/NN` (secondaire). Jamais `text-gray-*`, `text-stone-*`, `text-black`. Un texte sur photo est `text-white` avec `textShadow` (la bannière n'est pas repeinte, la photo fait le contraste).
3. L'accent en texte est `text-[#8B4A2F]` (avec `dark:text-[#d9a05b]` quand le contexte sombre est prévu). Jamais `text-[#BA7B39]` en texte sur crème (contraste insuffisant, et non repeint en tant que texte).
4. Un bouton plein est `bg-[#293027] text-[#EEE7DB] dark:bg-[#BA7B39] dark:text-[#293027]` ou `bg-[#BA7B39] text-[#293027]`. Les skins forcent la couleur des lettres à l'intérieur de `.bg-[#BA7B39]` et `.bg-[#293027]` : un bouton qui porte une autre classe de fond garde des lettres à la mauvaise couleur.
5. Les bordures sont `border-[#38403a]/10`, `/15`, `border-[#293027]/10`, `/15`, `border-white/60` ou `border-[#BA7B39]` et ses `/40`, `/50`. Les teintes sont `bg-[#BA7B39]/10`, `/15`, `/8`, `/20`.
6. Les survols sont `hover:bg-[#d9a05b]`, `hover:bg-[#9c6630]`, `hover:bg-[#3a453a]`, `hover:border-[#BA7B39]`, `hover:text-[#8B4A2F]`, `hover:bg-[#BA7B39]/10`.
7. Un champ garde `bg-[#EEE7DB]` ou `bg-white` avec `text-[#293027]`; les skins repeignent aussi l'élément `input`/`textarea` lui-même et son placeholder.
8. Les couleurs posées en `style={{ color }}` (paliers de niskas, `ClientLoyalty.tsx:201`) échappent aux skins : à réserver aux accents de palier, jamais au texte courant.
9. Le skin se vérifie à l'œil sur au moins un clair (aube ou medzo) et un sombre (nuit ou coffee) : la boutique pose la classe `skin-<cle>` sur la coquille au survol d'une carte de skin (`ClientPortal.tsx:428-431`, `BoutiqueNiskas.tsx:136-142`), ce qui suffit pour tester sans acheter.

Observation : les règles `.skin-defaut` (`skins.css:642-660`) n'ont aucune prise aujourd'hui, la coquille ne reçoit aucune classe quand aucun skin n'est actif (`ClientPortal.tsx:525`). L'état sans skin repose donc sur les classes Tailwind brutes; les opacités descendent à /40 sur crème pour les mentions, à /55 et plus pour tout texte qui porte une information.

## 16. Les repères visuels des captures

- `profile-1440.png` : bannière 400 px, avatar 128 px bordé crème posé sur le voile sombre, nom en Cormorant blanc 36 px, pastille laiton « 120 niskas » et pastille verre « pitta », rangée d'onglets sur une ligne, panneau de verre à gauche (encart laiton des niskas avec les trois boutons, bloc Badges, Préférences) et rail de 320 px à droite (Invitez vos proches, code en grand, deux tuiles, Les badges, Les cadeaux).
- `amis-1440.png` : titre « Mes amis (0) » en petites capitales laiton et phrase d'état vide avec lien vers l'annuaire; le rail reste identique.
- `messagerie-1440.png` : deux pilules « Amies » et « Équipe », boîte crème de 60vh avec la liste à gauche (état vide) et le volet « Choisissez une conversation » à droite, lien « Plein écran » au bas de la liste.
- `*-390.png` : bannière 320 px, avatar 112 px et nom côte à côte, pastilles sous le nom, courriel masqué, onglets qui défilent (Profil à Mes formations visibles), panneau puis rail empilés en une colonne, gouttières de 24 px; la liste des gains passe en une colonne avec ses notes repliées sous chaque libellé.
- Sur toutes les captures : la carte de consentement Loi 25 (« En toute transparence ») recouvre le haut du rail et le bouton flottant « Problème technique » se pose à gauche; ce sont des couches de la page, pas des briques de l'espace client.
