#!/usr/bin/env bash
# Récupère les trois livres PDF que Krystine dépose dans son admin
# (Plan du mois › chantier 2 › « Vos trois livres, en PDF »), depuis leur place
# fixe dans Storage, vers scripts/livres/pdf/ (dossier ignoré par git).
#
#   scripts/livres/telecharger.sh
#
# Il faut un gcloud connecté à un compte du projet (gcloud auth login). Les
# fichiers s'appellent livre-1.pdf, livre-2.pdf et livre-3.pdf; le nom que
# Krystine a donné au fichier vit dans les métadonnées (nomOriginal) et dans
# Firestore (planAutomne/mois-2026-10, champ livres).
set -euo pipefail
cd "$(dirname "$0")"
SEAU="gs://krystinestlaurent-87566.firebasestorage.app/livres-sources"
mkdir -p pdf

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud manque : installez le SDK Google Cloud puis « gcloud auth login »."
  exit 1
fi

LISTE="$(gcloud storage ls "$SEAU/" 2>/dev/null || true)"
if [ -z "$LISTE" ]; then
  echo "Aucun livre déposé pour l'instant (ou gcloud n'a pas accès au projet krystinestlaurent-87566)."
  exit 0
fi

gcloud storage cp "$SEAU/*.pdf" pdf/
echo
for f in pdf/livre-*.pdf; do
  [ -e "$f" ] || continue
  NOM="$(gcloud storage objects describe "$SEAU/$(basename "$f")" --format='value(custom_fields.nomOriginal)' 2>/dev/null || true)"
  printf '%s  %s  %s\n' "$f" "$(du -h "$f" | cut -f1)" "${NOM:-}"
done
