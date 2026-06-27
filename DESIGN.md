# DESIGN.md · L'Œuvre — système canonique (Krystine St-Laurent)

Source de vérité unique pour TOUT le site (home + pages React + chrome). Toute couleur, typo, espacement, motion vient d'ici. Aucune valeur hors de cette liste. Tokens déjà déclarés dans la config Tailwind (`index.html`) : utiliser les **noms de tokens**, jamais des hex en dur.

Register : **brand** (le design EST le produit). Voix : autrice + conférencière ayurvédique au Québec. Trois mots physiques : **chaleureux · matiéré · posé** (terre cuite au four, lin écru, lumière de fin d'après-midi). Anti-slop : pas de SaaS-cream timide, pas de gradient-text, pas de glassmorphism décoratif, pas de grille de cartes identiques.

## Couleurs (tokens canoniques — les seuls autorisés)

Sombre (fonds hero, footer) :
- `espresso #1d1604` · `espressoDeep #16100a` · `espressoSoft #2a2015`
- Texte sur sombre : `ctext #f4ece0` (corps `ctextSoft #cdbfa9`)

Clair (fonds sections) :
- `cream #f6f3ee` · `cream2 #f1ebe0` · `cream3 #ede5d7` · `card #faf7f0`
- Texte sur crème : `ink #3a3126` (corps `inkSoft #665746`)

Accent laiton (UN seul accent) :
- `brass #bb9a5e` = remplissage / décor / boutons / filets
- `brassBright #dcb874` = hover / surbrillance (et texte accent sur **sombre**)
- `brassInk #7d6330` = accent **en TEXTE sur crème** (contraste AA 5.13:1). 🚨 Jamais `brass` clair en texte sur crème.
- `brassDeep #a3823f` = état actif / pressé

Secondaires (parcimonie, jamais comme accent principal) :
- `forest #4a5d52` / `forestDeep #3a4d42` / `forestSoft #6f8478` = touche botanique (sceaux, détails nature)
- `ochre #c79a52` · `terracotta #b06a3f` = chaleur ponctuelle (jamais en larges aplats)

🚫 Hexes BANNIS (vestiges du vieux home statique, à remplacer partout) : `#d8ad60`, `#b8893f`, `#4b3a1e`, `#dd8a5e`, `#c4622f`, `#e8b07a`, `#fbf6ec`, et tout `#000`/`#fff` plat. → mapper vers brass / brassDeep / espresso / terracotta / cream.

## Typographie

- Display / titres : **Cormorant Garamond** (`font-serif`), poids 300-600, italique pour l'emphase lyrique. Grands sauts d'échelle, `clamp()` fluide, leading serré.
- Corps / labels / nav : **Inter** (`font-sans`). Corps 16px+, `leading-[1.6]`. Labels : uppercase, `tracking-[0.15em]–0.2em`, petits.
- Signature ornementale rare : **Pinyon Script** (1 mot max par page, ex. une signature « Krystine »).
- Échelle ≥1.25 entre paliers. Longueur de ligne corps 60-75ch.
- ⚠️ Le label uppercase-tracé au-dessus de chaque titre = système nommé L'Œuvre, mais **max 1 par section**, pas systématique sur chaque bloc.

## Espacement & layout

- Pleine largeur par défaut (jamais de colonne centrée étroite avec du vide sur les côtés — règle absolue Alex). `max-w` large (`max-w-6xl/7xl`) seulement pour le corps de texte long.
- Rythme vertical varié : sections respirent (`py-24/32`), groupes serrés à l'intérieur. Pas de padding identique partout.
- Alterner clair/sombre entre sections pour le tempo narratif. Asymétrie bienvenue ; éviter la pile centrée icône-titre-sous-titre (= template).

## Motion (framer-motion — spec unique)

Easing : `[0.22, 1, 0.36, 1]` (ease-out-quint). Aucun bounce/elastic. Respecter `useReducedMotion`.

Recettes standard (mêmes partout) :
1. **Entrée hero** : opacité 0→1 + `y` 24→0, durée 0.9s, stagger enfants 90ms. Au mount.
2. **Reveal au scroll** : `whileInView`, `viewport={{ once: true, margin: '-12%' }}`, opacité 0→1 + `y` 28→0, 0.7s.
3. **Stagger listes/grilles** : 60-90ms par item.
4. **Hover** : `scale` 1→1.02 sur cartes/boutons cliquables, filet brass qui s'étend (`scaleX`). 0.3s.
5. **Parallax** doux sur images hero/footer (`useScroll`+`useTransform`), subtil, coupé en reduced-motion.
6. Ambient : léger flottement continu sur 1-2 éléments décoratifs max (orbs, écouteurs), pour garder la page vivante au repos.

Jamais animer width/height/top/left → uniquement `transform`/`opacity`.

## Chrome (partagé, identique sur TOUTES les pages, home incluse)

- **NavBar** (`src/components/layout/NavBar.tsx`) : wordmark Cormorant « Krystine St-Laurent » ; liens Inter uppercase tracés + soulignement brass animé ; CTA pill `bg-brass text-espressoDeep` (Boutique) ; icônes lucide ; translucide → solide au scroll ; hamburger `xl:hidden`. **C'est la nav canonique** (Krystine · Podcasts/Médias/Livres · Formations · Boutique). Le home l'utilise aussi.
- **Footer** (`src/components/layout/Footer.tsx`) : espresso profond + parallax montagnes, wordmark Cormorant, colonnes brass, crédit Salon préservé.
- Le home `/accueil` doit passer en page React et **monter ce chrome**, plus de header/menu baked-in séparé.

## Bans (rappel)

Pas de tiret long (—). Pas de « c'est pas X, c'est Y » répété. Pas de gradient-text, pas de side-stripe border, pas de glassmorphism déco, pas de grille de cartes identiques, pas de modal par réflexe. Le test : si on peut dire « c'est de l'IA » sans hésiter, c'est raté.
