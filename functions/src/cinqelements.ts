import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import * as crypto from 'crypto';
import { RECAPTCHA_SECRET, garderFormulaire } from './captcha';
import { champsRobot } from './newsletter/robots';

// L'extrait « Les 5 éléments et leurs qualités », tiré du livre Nature &
// Ayurveda, offert en échange d'un courriel ou d'un compte. Connectée : le
// fichier entre dans son espace (section Téléchargements) et le lien part
// tout de suite. Visiteuse : un courriel et le consentement à l'infolettre
// ouvrent le même lien. Même mécanique que la musique d'Origine (musique.ts).
export const CINQ_ELEMENTS_ID = 'extrait-5-elements';

export const extraitCinqElements = onCall(
  { region: 'us-central1', secrets: [RECAPTCHA_SECRET] },
  async (req) => {
    const db = getFirestore();
    const fSnap = await db.doc(`formations/${CINQ_ELEMENTS_ID}`).get();
    const f = (fSnap.data() || {}) as { titre?: string; imageUrl?: string };
    const lecons = await db.collection(`formations/${CINQ_ELEMENTS_ID}/lecons`).orderBy('ordre').limit(1).get();
    const chemin = (lecons.docs[0]?.data() as { chemin?: string } | undefined)?.chemin;
    if (!chemin) throw new HttpsError('not-found', "L'extrait est introuvable.");

    if (req.auth) {
      await db.doc(`achatsFormations/${req.auth.uid}/formations/${CINQ_ELEMENTS_ID}`).set({
        titre: f.titre || 'Les 5 éléments · Extrait du livre',
        imageUrl: f.imageUrl || '',
        source: '5-elements',
        categorie: 'pdf',
        accordeLe: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      const email = String(req.data?.email || '').trim().toLowerCase();
      const prenom = String(req.data?.prenom || '').trim().slice(0, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Courriel invalide.');
      if (req.data?.consent !== true) throw new HttpsError('failed-precondition', "Le consentement est nécessaire.");
      // Une visiteuse non connectée passe la case « Je ne suis pas un robot »
      // et la cadence par adresse IP avant qu'on écrive quoi que ce soit.
      await garderFormulaire(String(req.data?.token || ''), '5-elements', req.rawRequest?.ip);
      const deja = await db.collection('newsletter').where('email', '==', email).limit(1).get();
      if (deja.empty) {
        const tags = ['5-elements', 'extrait-livre'];
        await db.collection('newsletter').add({
          email,
          ...(prenom ? { firstName: prenom } : {}),
          source: '5-elements',
          tags,
          status: 'active',
          unsubscribeToken: crypto.randomBytes(18).toString('hex'),
          subscribedAt: FieldValue.serverTimestamp(),
          // Un alias jetable entre en quarantaine : l'extrait part quand même,
          // seule l'infolettre attend le verdict de Krystine.
          ...champsRobot(email, tags),
        });
      } else {
        const d = deja.docs[0];
        const tags = new Set<string>(((d.data() as { tags?: string[] }).tags) || []);
        tags.add('5-elements');
        await d.ref.set({ tags: Array.from(tags) }, { merge: true });
      }
    }

    const [url] = await getStorage().bucket().file(chemin).getSignedUrl({
      action: 'read',
      expires: Date.now() + 2 * 60 * 60 * 1000,
      responseDisposition: 'attachment; filename="5-elements-extrait-nature-et-ayurveda.pdf"',
    });
    return { url };
  },
);
