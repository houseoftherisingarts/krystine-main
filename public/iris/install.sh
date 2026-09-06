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
for f in iris.py iris_system.md iris_site.md iris_terminal.md; do
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
cat > "$HOME/.local/bin/iris" <<'EOF2'
#!/bin/bash
# Ouvre Iris dans le Terminal : Claude Code dans le dossier du site, avec les règles d'Alex.
# Elle modifie le site, le construit, le met en ligne et enregistre sur GitHub.
export PATH="$HOME/.iris/node/bin:$HOME/.iris/tools/node_modules/.bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
SITE="$HOME/Documents/Inspira Nature"
if [ -d "$SITE/.git" ]; then
  cd "$SITE" && git pull --rebase -q 2>/dev/null || true
fi
exec claude --model opus --dangerously-skip-permissions --append-system-prompt "$(cat "$HOME/.iris/iris_terminal.md" "$HOME/.iris/iris_site.md" "$HOME/.iris/regles.md" 2>/dev/null)" "$@"
EOF2
chmod +x "$HOME/.local/bin/iris"
for rc in "$HOME/.zshrc" "$HOME/.bash_profile"; do
  if [ -f "$rc" ] && ! grep -q '.local/bin' "$rc"; then echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$rc"; fi
done
[ -f "$HOME/.zshrc" ] || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
echo "   Tapez « iris » dans un nouveau Terminal pour travailler sur le site avec elle."

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
dit "6. Le site sur cet ordinateur (pour le modifier depuis le Terminal)"
APIKEY="AIzaSyCjxu7l0ZNpbLa5LJdTe5WdjlTmLhoNUNk"
IDTOK=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$APIKEY" -H 'Content-Type: application/json' \
  -d "{\"email\":\"iris@krystinestlaurent.ca\",\"password\":\"$PW\",\"returnSecureToken\":true}" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("idToken",""))')
if [ -z "$IDTOK" ]; then echo "   Le mot de passe d'Iris n'est pas accepté : recopiez la ligne depuis l'onglet Terminal."; exit 1; fi
curl -s -H "Authorization: Bearer $IDTOK" "https://firestore.googleapis.com/v1/projects/krystinestlaurent-87566/databases/(default)/documents/etat/irisInstallation" > "$DIR/installation.json"
SITE="$HOME/Documents/Inspira Nature"
mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh"
/usr/bin/python3 - "$DIR/installation.json" "$HOME/.ssh/iris_krystine" "$SITE" <<'EOF2'
import json, os, sys
f = json.load(open(sys.argv[1])).get("fields", {})
v = lambda k: f.get(k, {}).get("stringValue", "")
if v("cleGit"):
    open(sys.argv[2], "w").write(v("cleGit")); os.chmod(sys.argv[2], 0o600)
os.makedirs(sys.argv[3], exist_ok=True)
if v("envLocal"):
    open(os.path.join(sys.argv[3], ".env.local"), "w").write(v("envLocal"))
EOF2
if ! grep -q "Host github-krystine" "$HOME/.ssh/config" 2>/dev/null; then
  printf '\nHost github-krystine\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/iris_krystine\n  IdentitiesOnly yes\n' >> "$HOME/.ssh/config"
fi
chmod 600 "$HOME/.ssh/config"
ssh-keyscan -t ed25519 github.com 2>/dev/null >> "$HOME/.ssh/known_hosts"
echo "   Clé du dépôt en place."
export PATH="$DIR/node/bin:$DIR/tools/node_modules/.bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  ARCH=$(uname -m); [ "$ARCH" = "x86_64" ] && ARCH=x64
  NOM=$(curl -s https://nodejs.org/dist/latest-v22.x/ | grep -o "node-v22[0-9.]*-darwin-$ARCH\.tar\.gz" | head -1)
  echo "   Installation de Node ($NOM)…"
  curl -fsSL "https://nodejs.org/dist/latest-v22.x/$NOM" -o "$DIR/node.tgz" && rm -rf "$DIR/node" && mkdir -p "$DIR/node" && tar xzf "$DIR/node.tgz" -C "$DIR/node" --strip-components=1 && rm -f "$DIR/node.tgz"
fi
echo "   Node : $(node --version 2>/dev/null || echo absent)"
if [ -d "$SITE/.git" ]; then
  echo "   Le site est déjà là : mise à jour…"; (cd "$SITE" && git remote set-url origin git@github-krystine:houseoftherisingarts/krystine-main.git && git pull --rebase -q) || true
else
  echo "   Copie du site dans « $SITE »…"
  TMPCLONE="$SITE.clone"; rm -rf "$TMPCLONE"
  git clone -q git@github-krystine:houseoftherisingarts/krystine-main.git "$TMPCLONE" && cp -a "$TMPCLONE/." "$SITE/" && rm -rf "$TMPCLONE"
fi
cd "$SITE"
git config user.name "Krystine St-Laurent" && git config user.email "krystine@inspiratanature.com"
echo "   Installation des dépendances du site (quelques minutes la première fois)…"
npm install --no-audit --no-fund --loglevel=error >/dev/null 2>&1 && echo "   Dépendances prêtes." || echo "   ⚠️  npm install a échoué : envoyez ~/.iris/launchd.log et ce message à Alex."
if ! command -v firebase >/dev/null 2>&1; then
  echo "   Installation de l'outil Firebase…"
  mkdir -p "$DIR/tools" && npm install --prefix "$DIR/tools" --no-audit --no-fund --loglevel=error firebase-tools >/dev/null 2>&1 || true
fi
if ! firebase login:list 2>/dev/null | grep -qi "@"; then
  echo
  echo "   Firebase doit connaître votre compte Google (celui du site). Une page va s'ouvrir : choisissez krystine@inspiratanature.com."
  echo
  firebase login </dev/tty || true
fi
if firebase login:list 2>/dev/null | grep -qi "@"; then echo "   Firebase est connecté : Iris peut mettre le site en ligne."; else echo "   ⚠️  Firebase n'est pas connecté : tapez  firebase login  plus tard, Iris ne pourra pas publier avant."; fi

echo
echo "Iris reste en ligne tant que cet ordinateur est allumé et connecté. Pour l'arrêter :  launchctl bootout gui/\$(id -u)/$LABEL"
}

# Tout le script est lu avant de s'exécuter : un « curl | bash » ne se fait pas manger par une commande interactive.
main "$@"
