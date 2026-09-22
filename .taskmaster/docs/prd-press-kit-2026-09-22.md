# PRD : press kit, pages en préparation et posts préfaits (dicté par Alex le 22 septembre 2026)

## Ce qu'Alex a dit, mot pour mot
« Sur le site de Christine Saint-Laurent on veut ajouter un press kit. On veut que le press kit soit toggle off par défaut et on veut que Christine dans sa section de tout ce qui est toggle off soit capable de prévisualiser les choses qui sont toggle off, par exemple le press kit. Une fois qu'elle l'a approuvé elle peut le toggle on. Comme ça, ça lui permet de travailler sur des pages non finies. Donc le press kit, on veut faire exactement la même chose qu'on a fait pour le festival médiéval, mais pour Christine. On veut aussi lui rajouter un module de Post préfet [posts préfaits] comme on a fait pour Vexcel. Ensuite, pendant que tu es dans cette foulée-là, faire le press kit pour Vexcel aussi, mais pas besoin de le toggle off, et assure-toi que le press kit de Vexcel soit brandé Vexcel. »

## Lecture retenue
- « Post préfet » se lit « posts préfaits » : le module de cartes prêtes à publier de Vexel (`vexel-site/scripts/presskit/` : file.json, gabarit.html, generer.mjs, publier.mjs, plist aux deux jours, dépôt sur le Bureau quand le jeton Meta manque).
- « Exactement la même chose que le festival » : la page /presse du FMM 2026 (`src/pages/PressePage.tsx`, `src/content/presse.ts`, `scripts/presse/build-kit.mjs`) : faits en haut, visuels 1920 × 1080 à télécharger, variantes texte / QR / photo seule, logos, textes, zip, vignettes WebP.

## Livrables
1. Krystine : page /presse (et /presskit, /press-kit, /en/press) portée du festival, au canon magazine crème, avec ses visuels générés par script depuis les vrais actifs (photos, couvertures, captures du site).
2. Krystine : interrupteur `presseOuvert` éteint par défaut; page invisible au public, visible à l'admin en aperçu avec un bandeau.
3. Krystine : section admin « En préparation » qui liste tout ce qui est éteint (press kit, Origine 2, Foyer, assistante, TEDx), avec un bouton d'aperçu par page et l'interrupteur pour allumer une fois approuvé.
4. Krystine : module « Posts préfaits » : scripts `scripts/posts/` (file.json, gabarit.html à sa marque, generer.mjs, publier.mjs), rendus dans `public/pubs/posts/`, et section admin qui montre la file avec visuel, légende, téléchargement et état.
5. Vexel : page /presse brandée Vexel (noir et blanc pur, Merriweather et Outfit, chrome), sans interrupteur, avec ses visuels et ses logos, en ligne.

## Contraintes
- Rien ne se dit livré sans boucle-verdict (1440 et 390, vérificateur Sonnet, trois tours au plus).
- Textes pour Krystine : voix-alex, vouvoiement, aucun cadratin, aucune italique.
- Un seul déployeur par dépôt; `publier.sh` chez Krystine; chez Vexel `.env.local` présent et `/compte` vérifié après.
