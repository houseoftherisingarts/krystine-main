# Posts préfaits, mode d'emploi

Ce module rend des cartes prêtes à publier (`generer.mjs`) et peut les
poster seul sur la page Facebook de Krystine (`publier.mjs`). Contrairement
au kit de presse Vexel, aucun plist launchd n'est installé automatiquement :
la file peut rester entièrement manuelle (copier-coller depuis l'admin)
tant qu'Alex n'a pas décidé de l'armer.

## Régénérer les cartes

```
npm run posts:generer
```

Relit `scripts/posts/file.json`, rend chaque carte en portrait (1080x1350)
et en carré (1080x1080) dans `public/pubs/posts/`, fabrique une vignette
WebP de 540 px par carte, et réécrit `public/pubs/posts/manifest.json` en
mêlant les textes à l'état de `etat.json`. À relancer chaque fois qu'une
carte change ou qu'une nouvelle carte s'ajoute au fichier.

## Publier une carte à la main

```
node scripts/posts/publier.mjs
```

Prend la prochaine carte non publiée dans l'ordre de `file.json`, respecte
un délai minimal de 44 heures depuis la dernière publication, et poste sur
Facebook si les clés sont présentes. Sans les clés, le script note dans
`etat.json` que la carte attend et s'arrête là : rien ne se dépose sur le
Bureau, aucune notification ne part.

## Fournir les clés Facebook

Ajouter dans `~/.claude/keys.env` :

```
KRYSTINE_META_PAGE_TOKEN=...
KRYSTINE_META_PAGE_ID=...
```

Le jeton est celui d'une page Facebook (permission `pages_manage_posts`),
l'identifiant celui de la page de Krystine. Une fois les deux présents,
`publier.mjs` publie dès son prochain appel si le délai de 44 heures est
passé.

## Armer la file automatique (optionnel, à faire vous-même)

Aucun plist n'a été posé par ce module : la file reste manuelle jusqu'à ce
qu'Alex décide de l'automatiser. Pour l'armer, créer un fichier
`~/Library/LaunchAgents/ca.krystinestlaurent.posts.plist` qui lance
`node scripts/posts/publier.mjs` sur un intervalle (par exemple toutes les
six heures, `StartInterval` à 21600), avec `WorkingDirectory` pointé sur ce
dépôt, puis le charger avec `launchctl load -w` suivi du chemin du plist.
Le script lui-même gère le délai de 44 heures : un passage plus fréquent
ne publie pas plus souvent, il vérifie seulement plus tôt.
