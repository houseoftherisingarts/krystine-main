#!/usr/bin/env bash
# Sauvegardes de la base Krystine.ca : où elles sont, comment les voir, comment restaurer.
#
# Trois couches, posées le 3 octobre 2026 :
#   1. Sauvegardes gérées par Google sur la base (default) du projet :
#      quotidienne gardée 7 jours, hebdomadaire (dimanche) gardée 14 semaines.
#   2. Récupération à un instant donné (PITR) : n'importe quelle minute des 7 derniers jours.
#      La base porte aussi la protection contre la suppression.
#   3. Export nocturne hors de la base (fonction sauvegardeNocturne, 3 h 30 Toronto) dans
#      gs://krystinestlaurent-87566-sauvegardes : firestore/AAAA-MM-JJ/ (toutes les
#      collections) et comptes/AAAA-MM-JJ.json (les comptes d'authentification).
#      Le seau efface ce qui a plus de 180 jours. Les fichiers déposés par le site
#      (gs://krystinestlaurent-87566.firebasestorage.app) gardent leurs anciennes versions 30 jours.
#
# Usage :
#   scripts/sauvegardes.sh etat            # tout ce qui existe, en un écran
#   scripts/sauvegardes.sh exporter        # lance un export à la main, tout de suite
#   scripts/sauvegardes.sh telecharger     # copie le dernier export sur ce Mac (~/Sauvegardes-Krystine)
#
# Restaurer (se fait à la main, jamais par ce script, parce que ça écrase ou ça crée une base) :
#   - Depuis une sauvegarde gérée, dans une NOUVELLE base pour comparer avant de basculer :
#       gcloud firestore backups restore --source-backup=<nom complet du backup> \
#         --destination-database=restauration --project=krystinestlaurent-87566
#   - Depuis un instant précis des 7 derniers jours (PITR), aussi dans une nouvelle base :
#       gcloud firestore databases clone --source-database='(default)' \
#         --snapshot-time=2026-10-03T12:00:00Z --destination-database=restauration \
#         --project=krystinestlaurent-87566
#   - Depuis un export du seau, DANS la base en place (écrase les documents du même nom) :
#       gcloud firestore import gs://krystinestlaurent-87566-sauvegardes/firestore/AAAA-MM-JJ \
#         --project=krystinestlaurent-87566
#     On peut restreindre à une collection avec --collection-ids=members
#   - Les comptes (comptes/AAAA-MM-JJ.json) se réimportent avec `firebase auth:import` après
#     conversion au format attendu. Les mots de passe hachés (scrypt) y sont : l'import
#     demande les paramètres de hachage du projet (console Firebase > Authentication > Users >
#     menu > Password hash parameters). Les comptes Google (sans hash) se reconnectent d'eux-mêmes.

set -euo pipefail
P=krystinestlaurent-87566
SEAU=gs://$P-sauvegardes
cmd=${1:-etat}

case "$cmd" in
  etat)
    echo "== Base (default) : PITR, protection =="
    gcloud firestore databases describe --database='(default)' --project=$P \
      --format="value(pointInTimeRecoveryEnablement,deleteProtectionState,earliestVersionTime)"
    echo; echo "== Cadences de sauvegarde gérée =="
    gcloud firestore backups schedules list --database='(default)' --project=$P \
      --format="table(dailyRecurrence.yesno(yes='quotidienne',no=''),weeklyRecurrence.day,retention)"
    echo; echo "== Sauvegardes gérées existantes =="
    gcloud firestore backups list --project=$P --format="table(snapshotTime,state,stats.sizeBytes)"
    echo; echo "== Exports nocturnes dans le seau =="
    gcloud storage ls "$SEAU/firestore/" 2>/dev/null || echo "(aucun export encore)"
    gcloud storage ls "$SEAU/comptes/" 2>/dev/null || echo "(aucune liste de comptes encore)"
    echo; echo "== Dernière exécution de la fonction =="
    gcloud scheduler jobs describe firebase-schedule-sauvegardeNocturne-us-central1 \
      --location=us-central1 --project=$P --format="value(schedule,lastAttemptTime,status.code)" 2>/dev/null \
      || echo "(fonction pas encore déployée)"
    ;;
  exporter)
    gcloud scheduler jobs run firebase-schedule-sauvegardeNocturne-us-central1 --location=us-central1 --project=$P
    echo "Lancé. Les fichiers paraissent dans le seau en une à cinq minutes : scripts/sauvegardes.sh etat"
    ;;
  telecharger)
    dernier=$(gcloud storage ls "$SEAU/firestore/" | sort | tail -1)
    [ -n "$dernier" ] || { echo "aucun export dans le seau"; exit 1; }
    dest=~/Sauvegardes-Krystine/$(basename "$dernier")
    mkdir -p "$dest"
    gcloud storage cp -r "$dernier*" "$dest/"
    gcloud storage cp "$SEAU/comptes/$(basename "$dernier").json" "$dest/" 2>/dev/null || true
    echo "Copié dans $dest"
    ;;
  *)
    echo "usage : $0 etat | exporter | telecharger"; exit 1 ;;
esac
