import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// ─── Le miroir des groupes de formation ─────────────────────────────────────
// Chaque achat (ou accès accordé) inscrit la personne dans
// groupes/{formationId}/membres/{uid} : la colonne Membres de l'espace du
// cours lit ce miroir, jamais les documents d'achat eux-mêmes.

export const groupeMembre = onDocumentCreated(
  { document: 'achatsFormations/{uid}/formations/{formationId}', region: 'us-central1' },
  async (event) => {
    const { uid, formationId } = event.params;
    await getFirestore().doc(`groupes/${formationId}/membres/${uid}`).set({
      ajouteLe: FieldValue.serverTimestamp(),
    }, { merge: true });
  },
);
