# Journal des publications

Une entrée par mise en ligne faite avec `scripts/publier.sh`, dans l'ordre : date, qui, commit, ce qui a changé, ce qui a été déployé, fichiers touchés. C'est ici qu'on retrouve le commit à reprendre quand quelque chose a mal tourné.

Pour revenir en arrière sur une entrée, depuis le dossier du site :

    git revert <commit> --no-edit
    scripts/publier.sh "Retour arrière : <la raison>"

Pour un retour immédiat sans toucher au code, l'historique des versions de l'hébergement (console Firebase › Hosting › krystinestlaurent-87566) permet de remettre en ligne la version précédente en un clic; le code se remet d'aplomb ensuite avec la commande ci-dessus.

## 2026-09-20 15:31 · alextstlaurent · f648de3

Publication autonome pour Krystine : garde du collant Vexel avant chaque build, script scripts/publier.sh, journal des publications, règles d'Iris mises à jour (publier seule, sans branche ni approbation)

En ligne : hosting

     JOURNAL-PUBLICATIONS.md      | 10 +++++++++
     package.json                 |  2 +-
     public/iris/iris_system.md   |  2 +-
     public/iris/iris_terminal.md | 24 +++++++++++++++-----
     scripts/garde-collant.mjs    | 29 ++++++++++++++++++++++++
     scripts/publier.sh           | 53 ++++++++++++++++++++++++++++++++++++++++++++
     6 files changed, 112 insertions(+), 8 deletions(-)

## 2026-09-20 15:32 · alextstlaurent · ccf94b4

publier.sh : tirer et construire avant de committer, pour que le manifeste des actifs parte avec le changement

En ligne : hosting

     public/assets-manifest.json |  2 +-
     scripts/publier.sh          | 13 +++++++------
     2 files changed, 8 insertions(+), 7 deletions(-)
