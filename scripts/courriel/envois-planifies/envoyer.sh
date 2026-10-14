#!/bin/zsh
# Envoi planifié d'un courriel approuvé par Krystine (14 oct. 2026).
# Usage : envoyer.sh <destinataire> <sujet> <fichier-texte> <étiquette>
# Part de teamksl@inspiratanature.com par l'app Mail; une seule fois (fichier .envoye).
A="$1"; S="$2"; F="$3"; E="$4"; DIR="${F:h}"
[[ -f "$DIR/$E.envoye" ]] && exit 0
open -a Mail; sleep 20
osascript - "$A" "$S" "$F" <<'APPLE' >> "$DIR/journal.log" 2>&1
on run argv
  set corps to read POSIX file (item 3 of argv) as «class utf8»
  tell application "Mail"
    set m to make new outgoing message with properties {subject:(item 2 of argv), content:corps, visible:false, sender:"TEAM KSL-INSPIRATA <teamksl@inspiratanature.com>"}
    tell m to make new to recipient at end of to recipients with properties {address:(item 1 of argv)}
    send m
  end tell
  return "envoyé"
end run
APPLE
if grep -q "envoyé" "$DIR/journal.log"; then date > "$DIR/$E.envoye"; echo "$(date) $E envoyé à $A" >> "$DIR/journal.log"; launchctl bootout gui/$(id -u)/ca.krystinestlaurent.envoi.$E 2>/dev/null; fi
