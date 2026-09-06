import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as crypto from 'crypto';

// La musique de l'Expérience Origine, offerte au bas du Foyer d'Origine.
// Connectée : la musique entre dans son espace (section Téléchargements) et
// le lien de téléchargement part tout de suite. Visiteuse : un courriel et
// le consentement à l'infolettre ouvrent le même lien.
export const MUSIQUE_ORIGINE_ID = 'kajabi-2149362766';

export const musiqueOrigine = onCall(
  { region: 'us-central1' },
  async (req) => {
    const db = getFirestore();
    const fSnap = await db.doc(`formations/${MUSIQUE_ORIGINE_ID}`).get();
    const f = (fSnap.data() || {}) as { titre?: string; imageUrl?: string };
    const lecons = await db.collection(`formations/${MUSIQUE_ORIGINE_ID}/lecons`).orderBy('ordre').limit(1).get();
    const chemin = (lecons.docs[0]?.data() as { chemin?: string } | undefined)?.chemin;
    if (!chemin) throw new HttpsError('not-found', 'La musique est introuvable.');

    if (req.auth) {
      await db.doc(`achatsFormations/${req.auth.uid}/formations/${MUSIQUE_ORIGINE_ID}`).set({
        titre: f.titre || 'Expérience Origine · La musique',
        imageUrl: f.imageUrl || '',
        source: 'foyer-musique',
        categorie: 'musique',
        accordeLe: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      const email = String(req.data?.email || '').trim().toLowerCase();
      const prenom = String(req.data?.prenom || '').trim().slice(0, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Courriel invalide.');
      if (req.data?.consent !== true) throw new HttpsError('failed-precondition', 'Le consentement est nécessaire.');
      const deja = await db.collection('newsletter').where('email', '==', email).limit(1).get();
      if (deja.empty) {
        await db.collection('newsletter').add({
          email,
          ...(prenom ? { firstName: prenom } : {}),
          source: 'foyer-musique',
          tags: ['foyer-musique', 'foyer-origine'],
          status: 'active',
          unsubscribeToken: crypto.randomBytes(18).toString('hex'),
          subscribedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const d = deja.docs[0];
        const tags = new Set<string>(((d.data() as { tags?: string[] }).tags) || []);
        tags.add('foyer-musique');
        await d.ref.set({ tags: Array.from(tags) }, { merge: true });
      }
    }

    const [url] = await getStorage().bucket().file(chemin).getSignedUrl({
      action: 'read',
      expires: Date.now() + 2 * 60 * 60 * 1000,
      responseDisposition: 'attachment; filename="Origine_OST_1.mp3"',
    });
    return { url };
  },
);
