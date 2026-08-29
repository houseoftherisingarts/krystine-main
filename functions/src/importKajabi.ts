import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Import jetable de la structure d'un cours Kajabi (ordre + modules). Protégé
// par un secret dans l'URL. À retirer après usage.
const JETON = 'kajabi-import-2026-08-29';

export const importKajabiStructure = onRequest(
  { region: 'us-central1', timeoutSeconds: 300, memory: '512MiB', cors: false },
  async (req, res) => {
    if (req.query.secret !== JETON) { res.status(403).send('non'); return; }
    const body = req.body || {};
    const formationId: string = body.formationId;
    const lecons: Array<{ ordre: number; titre: string; moduleNom?: string; module?: number }> = body.lecons || [];
    // Numéroter les modules dans l'ordre d'apparition.
    const ordreModules: string[] = [];
    for (const l of lecons) { const m = l.moduleNom || ''; if (m && !ordreModules.includes(m)) ordreModules.push(m); }
    if (!formationId || !lecons.length) { res.status(400).send('payload'); return; }

    const db = getFirestore();
    const col = db.collection(`formations/${formationId}/lecons`);
    // Repartir propre : effacer les anciennes leçons de ce cours.
    const vieux = await col.get();
    let batch = db.batch(); let n = 0;
    for (const d of vieux.docs) { batch.delete(d.ref); if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); } }
    await batch.commit();

    batch = db.batch(); n = 0;
    for (const l of lecons) {
      const id = String(l.ordre).padStart(3, '0');
      batch.set(col.doc(id), {
        titre: l.titre,
        ordre: l.ordre,
        module: l.module,
        type: 'video',
        chemin: '',
        creeLe: FieldValue.serverTimestamp(),
      });
      if (++n % 400 === 0) { await batch.commit(); batch = db.batch(); }
    }
    await batch.commit();
    res.status(200).json({ ok: true, ecrites: lecons.length });
  },
);
