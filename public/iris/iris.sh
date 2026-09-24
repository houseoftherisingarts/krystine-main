#!/bin/bash
# Ouvre Iris dans le Terminal : Claude Code dans le dossier du site, avec les règles d'Alex.
# Elle modifie le site, le construit, le met en ligne et enregistre sur GitHub.
#
# Ce fichier vit sur le site (public/iris/iris.sh) : le relais (iris.py) le
# retélécharge chaque heure et le repose dans ~/.local/bin/iris, exactement
# comme il le fait déjà pour le brief. Mettre à jour le lanceur ne redemande
# donc jamais le mot de passe d'Iris ni une réinstallation.
#
# Avant de tirer le dépôt, une copie modifiée sur place part dans une
# sauvegarde (git stash) au lieu d'être écrasée : rien ne se perd jamais.
export PATH="$HOME/.iris/node/bin:$HOME/.iris/tools/node_modules/.bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
SITE="$HOME/Documents/Inspira Nature"
if [ -d "$SITE/.git" ]; then
  cd "$SITE"
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    git stash push -u -m "Sauvegarde automatique avant mise à jour, $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1 || true
  fi
  git pull --rebase -q 2>/dev/null || true
fi
exec claude --model opus --dangerously-skip-permissions --append-system-prompt "$(cat "$HOME/.iris/iris_terminal.md" "$HOME/.iris/iris_site.md" "$HOME/.iris/regles.md" 2>/dev/null)" "$@"
