#!/usr/bin/env bash
# Installe la vérification complète du matin sur l'ordinateur de Krystine
# (scripts/qa/verif-complete.mjs). Le dépôt vit dans Documents (iCloud), que
# les tâches planifiées de macOS lisent mal : le script tourne donc depuis une
# copie hors iCloud, ~/.iris/verif, avec son propre Playwright. Chaque matin,
# le lanceur recopie la dernière version du script et des routes (App.tsx)
# s'il le peut, sinon il garde la copie de la veille.
#   bash scripts/qa/verif-complete-installer.sh
set -euo pipefail
DEPOT="$(cd "$(dirname "$0")/../.." && pwd)"
ICI="$HOME/.iris/verif"
PLIST="$HOME/Library/LaunchAgents/ca.krystinestlaurent.verif-complete.plist"
NODE="$(command -v node)"
VERSION="$(node -p "require('$DEPOT/node_modules/playwright/package.json').version")"

mkdir -p "$ICI" "$HOME/Library/Logs"
cp "$DEPOT/scripts/qa/verif-complete.mjs" "$DEPOT/App.tsx" "$DEPOT/src/lib/cheminCours.ts" "$ICI/"
# Une copie légère du dépôt GitHub, hors iCloud : chaque matin, le lanceur y
# prend la version publiée du script et des routes.
SSH="$(git -C "$DEPOT" config core.sshCommand || echo ssh)"
REMOTE="$(git -C "$DEPOT" remote get-url origin)"
[ -d "$ICI/depot.git" ] || GIT_SSH_COMMAND="$SSH" git clone -q --bare --depth 1 --branch main "$REMOTE" "$ICI/depot.git"
git -C "$ICI/depot.git" config core.sshCommand "$SSH"
cat > "$ICI/package.json" <<EOF
{ "name": "iris-verif", "private": true, "type": "module", "dependencies": { "playwright": "$VERSION" } }
EOF
(cd "$ICI" && npm install --no-audit --no-fund --loglevel=error)
(cd "$ICI" && npx playwright install chromium >/dev/null)

cat > "$ICI/lancer.sh" <<EOF
#!/bin/bash
# Lancé par launchd chaque matin à 5 h 45 (voir $PLIST).
export PATH="$(dirname "$NODE"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin"
cd "$ICI"
echo "=== \$(date '+%Y-%m-%d %H:%M:%S') ==="
# La version publiée sur GitHub (le dossier iCloud est illisible pour une tâche planifiée).
if git -C "$ICI/depot.git" fetch -q --depth 1 origin main 2>/dev/null; then
  git -C "$ICI/depot.git" show FETCH_HEAD:scripts/qa/verif-complete.mjs > "$ICI/verif-complete.mjs.neuf" && mv "$ICI/verif-complete.mjs.neuf" "$ICI/verif-complete.mjs"
  git -C "$ICI/depot.git" show FETCH_HEAD:App.tsx > "$ICI/App.tsx.neuf" && mv "$ICI/App.tsx.neuf" "$ICI/App.tsx"
  git -C "$ICI/depot.git" show FETCH_HEAD:src/lib/cheminCours.ts > "$ICI/cheminCours.ts.neuf" && mv "$ICI/cheminCours.ts.neuf" "$ICI/cheminCours.ts"
else
  echo "GitHub injoignable : script et routes de la veille"
fi
rm -f "$ICI"/*.neuf
# caffeinate garde l'ordinateur éveillé le temps de la vérification.
exec /usr/bin/caffeinate -i "$NODE" "$ICI/verif-complete.mjs"
EOF
chmod +x "$ICI/lancer.sh"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>ca.krystinestlaurent.verif-complete</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$ICI/lancer.sh</string></array>
  <key>WorkingDirectory</key><string>$ICI</string>
  <key>EnvironmentVariables</key>
  <dict><key>HOME</key><string>$HOME</string></dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>5</integer><key>Minute</key><integer>45</integer></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/iris-verif.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/iris-verif.log</string>
</dict>
</plist>
EOF
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Vérification complète installée : chaque matin à 5 h 45, journal dans ~/Library/Logs/iris-verif.log"
