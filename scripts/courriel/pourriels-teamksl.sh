#!/bin/zsh
# La vérification quotidienne des pourriels de teamksl@inspiratanature.com
# (Krystine, 14 octobre 2026). Les réponses des lectrices aux lettres tombent
# souvent dans les pourriels de Google : chaque matin, Iris montre ce qui y est
# arrivé depuis deux jours et repère les réponses probables (sujet en « Re: »).
#
#   scripts/courriel/pourriels-teamksl.sh            liste seulement
#   scripts/courriel/pourriels-teamksl.sh --ramener  ramène les « Re: » dans la boîte de réception
#
# Rien n'est jamais supprimé : au plus, un message est déplacé.
RAMENER=false
[[ "$1" == "--ramener" ]] && RAMENER=true
osascript - "$RAMENER" <<'APPLE'
on run argv
  set ramener to (item 1 of argv) is "true"
  set out to ""
  set d to (current date) - (2 * days)
  tell application "Mail"
    set a to account "teamksl@inspiratanature.com"
    set ib to mailbox "INBOX" of a
    repeat with mb in (every mailbox of a)
      if name of mb is "Spam" then
        repeat with m in (messages of mb whose date received > d)
          set s to subject of m
          set rep to (s starts with "Re:" or s starts with "RE:" or s starts with "Ré:" or s starts with "TR:")
          if rep then
            set out to out & "RÉPONSE · " & (sender of m) & " · " & s & linefeed
            if ramener then move m to ib
          else
            set out to out & "autre   · " & (sender of m) & " · " & s & linefeed
          end if
        end repeat
      end if
    end repeat
  end tell
  if out is "" then return "Aucun pourriel depuis deux jours."
  return out
end run
APPLE
