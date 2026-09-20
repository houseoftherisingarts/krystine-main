# Journal des publications

Une entrée par mise en ligne faite avec `scripts/publier.sh`, dans l'ordre : date, qui, commit, ce qui a changé, ce qui a été déployé, fichiers touchés. C'est ici qu'on retrouve le commit à reprendre quand quelque chose a mal tourné.

Pour revenir en arrière sur une entrée, depuis le dossier du site :

    git revert <commit> --no-edit
    scripts/publier.sh "Retour arrière : <la raison>"

Pour un retour immédiat sans toucher au code, l'historique des versions de l'hébergement (console Firebase › Hosting › krystinestlaurent-87566) permet de remettre en ligne la version précédente en un clic; le code se remet d'aplomb ensuite avec la commande ci-dessus.
