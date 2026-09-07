import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// ─── Le miroir du groupe du Foyer ───────────────────────────────────────────
// Le Foyer d'Origine est le seul groupe social du site (Alex, 7 septembre
// 2026) : seul son miroir s'écrit. L'achat du Foyer inscrit la personne dans
// groupes/foyer/membres/{uid}, et c'est là que l'annuaire et le cercle lisent,
// jamais dans les documents d'achat eux-mêmes. Les autres formations n'ont
// plus de groupe; les documents `groupes/{autre}` déjà en base ne sont plus
// lus nulle part.
//
// Le miroir porte aussi le nom et le courriel du compte (lus dans Firebase
// Auth, que le navigateur ne peut pas interroger) : une acheteuse qui n'a
// jamais ouvert son espace se montre alors sous son nom, et non sous un
// « Une membre » anonyme (Alex, 7 septembre 2026).

export const groupeMembre = onDocumentCreated(
  { document: 'achatsFormations/{uid}/formations/{formationId}', region: 'us-central1' },
  async (event) => {
    const { uid, formationId } = event.params;
    if (formationId !== 'foyer') return;
    const compte = await getAuth().getUser(uid).catch(() => null);
    await getFirestore().doc(`groupes/foyer/membres/${uid}`).set({
      ajouteLe: FieldValue.serverTimestamp(),
      ...(compte?.displayName ? { nom: compte.displayName } : {}),
      ...(compte?.email ? { courriel: compte.email } : {}),
    }, { merge: true });
  },
);
