#!/bin/bash
# Installe Iris, le relais du terminal de krystinestlaurent.ca, sur cet ordinateur (Mac).
#   curl -fsSL https://krystinestlaurent.ca/iris/install.sh | bash -s -- MOT_DE_PASSE
# Tout vit dans ~/.iris ; le relais tourne en arrière-plan (launchd) et se met à jour seul.
set -e
main() {
SOURCE="https://krystinestlaurent.ca/iris"
DIR="$HOME/.iris"
PW="${1:-}"
LABEL="ca.krystinestlaurent.iris"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

dit() { printf '\n\033[1;33m%s\033[0m\n' "$1"; }

if [ -z "$PW" ]; then
  echo "Il manque le mot de passe d'Iris. Copiez la commande complète depuis l'onglet Terminal de votre admin."
  exit 1
fi
if [ "$(uname)" != "Darwin" ]; then
  echo "Ce script installe Iris sur un Mac. Sur un autre ordinateur, lancez à la main :  python3 ~/.iris/iris.py"
fi

dit "1. Le dossier d'Iris"
mkdir -p "$DIR" "$HOME/.local/bin"
for f in iris.py iris_system.md iris_site.md; do
  curl -fsSL "$SOURCE/$f" -o "$DIR/$f.tmp" && mv "$DIR/$f.tmp" "$DIR/$f"
done
cat > "$DIR/iris_config.json" <<EOF
{"courriel": "iris@krystinestlaurent.ca", "motDePasse": "$PW", "apiKey": "AIzaSyCjxu7l0ZNpbLa5LJdTe5WdjlTmLhoNUNk", "hote": "l'ordinateur de Krystine", "miseAJour": true}
EOF
chmod 600 "$DIR/iris_config.json"
echo "   ~/.iris est prêt."

dit "2. Python"
if ! /usr/bin/python3 -c 'import ssl, json' >/dev/null 2>&1; then
  echo "   macOS demande d'installer ses outils de ligne de commande. Cliquez « Installer » dans la fenêtre qui s'ouvre,"
  echo "   attendez la fin, puis relancez cette même commande."
  xcode-select --install </dev/tty >/dev/null 2>&1 || true
  exit 1
fi
echo "   Python est là."

dit "3. Claude Code"
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v claude >/dev/null 2>&1 || ! claude auth status >/dev/null 2>&1; then
  echo "   Installation (ou mise à jour) de Claude Code…"
  curl -fsSL https://claude.ai/install.sh | bash >/dev/null 2>&1 || true
  export PATH="$HOME/.local/bin:$PATH"
fi
CLAUDE_BIN="$(command -v claude || true)"
if [ -z "$CLAUDE_BIN" ]; then
  echo "   Claude Code ne s'est pas installé. Envoyez ce message à Alex."; exit 1
fi
echo "   Claude Code : $($CLAUDE_BIN --version 2>/dev/null | head -1)"
connecte() { $CLAUDE_BIN auth status 2>/dev/null | grep -q '"loggedIn": *true'; }
if ! connecte; then
  echo
  echo "   Claude Code doit être relié à votre compte Claude (abonnement Max)."
  echo "   Une page va s'ouvrir dans votre navigateur : connectez-vous, puis collez ici le code qu'elle vous donne."
  echo
  $CLAUDE_BIN auth login </dev/tty || true
fi
if connecte; then
  echo "   Claude Code est connecté à votre compte."
else
  echo
  echo "   ⚠️  Claude Code n'est toujours pas connecté. Quand ce script aura fini, tapez  claude  dans le Terminal,"
  echo "      puis  /login  et suivez la page qui s'ouvre. Iris fonctionnera dès que ce sera fait."
  echo
fi

dit "4. La commande « iris » dans votre Terminal"
cat > "$HOME/.local/bin/iris" <<EOF
#!/bin/bash
# Ouvre une conversation avec Iris, qui connaît tout le site, dans votre Terminal.
export PATH="\$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:\$PATH"
SITE="\$HOME/Documents/Inspira Nature"
[ -d "\$SITE" ] && cd "\$SITE"
exec claude --model opus --append-system-prompt "\$(cat "\$HOME/.iris/iris_system.md" "\$HOME/.iris/iris_site.md" "\$HOME/.iris/regles.md" 2>/dev/null)" "\$@"
EOF
chmod +x "$HOME/.local/bin/iris"
for rc in "$HOME/.zshrc" "$HOME/.bash_profile"; do
  if [ -f "$rc" ] && ! grep -q '.local/bin' "$rc"; then echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$rc"; fi
done
[ -f "$HOME/.zshrc" ] || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
echo "   Tapez « iris » dans un nouveau Terminal pour lui parler."

dit "5. Le relais en arrière-plan"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-u</string>
    <string>$DIR/iris.py</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    <key>HOME</key><string>$HOME</string>
  </dict>
  <key>KeepAlive</key><true/>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$DIR/launchd.log</string>
  <key>StandardErrorPath</key><string>$DIR/launchd.log</string>
</dict>
</plist>
EOF
launchctl bootout "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
sleep 4
if grep -q "démarre" "$DIR/iris.log" 2>/dev/null; then
  echo "   Iris tourne. Retournez dans l'onglet Terminal de votre admin : la pastille passe au vert dans la minute."
  sleep 12
  if [ -f "$DIR/vault.json" ]; then
    echo "   Le paquet d'Alex (notes, règles, skills) est dans Obsidian, dossier « Krystine · Vexel » ($(/usr/bin/python3 -c 'import json;print(json.load(open("'"$DIR"'/vault.json"))["dossier"])')). Il se met à jour seul, et ses skills sont installés dans votre Claude Code."
  else
    echo "   Les notes d'Alex arriveront dans votre Obsidian (dossier « Krystine · Vexel ») dans les prochaines minutes."
  fi
else
  echo "   Iris n'a pas donné signe de vie. Le journal est dans ~/.iris/launchd.log ; envoyez-le à Alex."
fi
echo
echo "Iris reste en ligne tant que cet ordinateur est allumé et connecté. Pour l'arrêter :  launchctl bootout gui/\$(id -u)/$LABEL"
}

# Tout le script est lu avant de s'exécuter : un « curl | bash » ne se fait pas manger par une commande interactive.
main "$@"
