import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ─── Le miroir des groupes de formation ─────────────────────────────────────
// Chaque achat (ou accès accordé) inscrit la personne dans
// groupes/{formationId}/membres/{uid} : la colonne Membres de l'espace du
// cours lit ce miroir, jamais les documents d'achat eux-mêmes.
//
// Le miroir porte aussi le nom et le courriel du compte (lus dans Firebase
// Auth, que le navigateur ne peut pas interroger) : une acheteuse qui n'a
// jamais ouvert son espace se montre alors sous son nom, et non sous un
// « Une membre » anonyme (Alex, 7 septembre 2026).

export const groupeMembre = onDocumentCreated(
  { document: 'achatsFormations/{uid}/formations/{formationId}', region: 'us-central1' },
  async (event) => {
    const { uid, formationId } = event.params;
    const compte = await getAuth().getUser(uid).catch(() => null);
    await getFirestore().doc(`groupes/${formationId}/membres/${uid}`).set({
      ajouteLe: FieldValue.serverTimestamp(),
      ...(compte?.displayName ? { nom: compte.displayName } : {}),
      ...(compte?.email ? { courriel: compte.email } : {}),
    }, { merge: true });
  },
);
