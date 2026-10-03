import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { v1 } from '@google-cloud/firestore';

// Troisième couche de sauvegarde, celle qui vit hors de la base. Les deux
// premières sont gérées par Google sur la base elle-même (sauvegarde quotidienne
// gardée sept jours, hebdomadaire gardée quatorze semaines, plus la récupération
// à un instant donné sur sept jours). Si le projet disparaissait avec elles,
// il resterait ce seau : chaque nuit, un export complet de Firestore dans
// firestore/AAAA-MM-JJ/ et la liste des comptes d'authentification (courriel,
// uid, dates) dans comptes/AAAA-MM-JJ.json, que Firestore ne contient pas.
// Le seau efface de lui-même ce qui a plus de 180 jours. État et restauration :
// scripts/sauvegardes.sh.
const PROJET = process.env.GCLOUD_PROJECT ?? 'krystinestlaurent-87566';
const SEAU = `${PROJET}-sauvegardes`;

export const sauvegardeNocturne = onSchedule(
  { schedule: 'every day 03:30', timeZone: 'America/Toronto', memory: '512MiB', timeoutSeconds: 540 },
  async () => {
    const jour = new Date().toISOString().slice(0, 10);

    // L'export est une opération longue côté Google : on la lance, elle finit seule.
    const admin = new v1.FirestoreAdminClient();
    await admin.exportDocuments({
      name: admin.databasePath(PROJET, '(default)'),
      outputUriPrefix: `gs://${SEAU}/firestore/${jour}`,
      collectionIds: [],
    });

    const comptes: object[] = [];
    let page: string | undefined;
    do {
      const r = await getAuth().listUsers(1000, page);
      comptes.push(...r.users.map((u) => u.toJSON()));
      page = r.pageToken;
    } while (page);

    await getStorage()
      .bucket(SEAU)
      .file(`comptes/${jour}.json`)
      .save(JSON.stringify(comptes), { contentType: 'application/json' });
  },
);
