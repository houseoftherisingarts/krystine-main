#!/usr/bin/env bash
# Met le site en ligne en un geste, depuis n'importe quel ordinateur :
# garde du collant, rebase, build, commit, deploy, puis une entrée dans le
# journal des publications (public/journal-publications.json, affiché dans
# l'admin › Publications) avec le commit à reprendre en cas d'erreur.
#
#   scripts/publier.sh "Ce qui a changé, en français, avec la page"
#
# Les cibles Firebase se déduisent des fichiers publiés : hosting toujours,
# functions, firestore ou storage seulement si leurs fichiers ont bougé.
#
# Pour revenir en arrière sur une publication :
#   git revert <commit> --no-edit && scripts/publier.sh "Retour arrière : <la raison>"
set -euo pipefail
cd "$(dirname "$0")/.."

MSG="${1:-}"
if [ -z "$MSG" ]; then
  echo 'Usage : scripts/publier.sh "ce qui a changé, en français, avec la page"'
  exit 1
fi
PROJET=krystinestlaurent-87566

node scripts/garde-collant.mjs

if ! git pull --rebase --autostash -q; then
  echo "Le rebase s'est arrêté sur un conflit. Ne devinez pas : montrez les deux versions en français simple (git status, git diff) et laissez la personne choisir."
  exit 1
fi

npm run build

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -q -m "$MSG"
fi

CIBLES=hosting
FICHIERS="$(git diff --name-only '@{u}..HEAD' 2>/dev/null || true)"
grep -q '^functions/' <<<"$FICHIERS" && CIBLES="$CIBLES,functions"
grep -q -E '^(firestore\.rules|firestore\.indexes\.json)$' <<<"$FICHIERS" && CIBLES="$CIBLES,firestore"
grep -q '^storage\.rules$' <<<"$FICHIERS" && CIBLES="$CIBLES,storage"

# L'entrée du journal part avec cette mise en ligne : écrite maintenant, copiée dans dist.
node scripts/journal-publication.mjs "$MSG" "$CIBLES"
cp public/journal-publications.json dist/journal-publications.json

npx firebase deploy --only "$CIBLES" --project "$PROJET" --non-interactive

SHA="$(git rev-parse --short HEAD)"
git add public/journal-publications.json
git commit -q -m "Journal des publications : $SHA"
git push -q

echo "En ligne ($CIBLES) · commit $SHA · journal des publications mis à jour (admin › Publications)"
