import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Tient la promesse de la politique de confidentialité (section 4) : « Nous
// conservons ces données vingt-quatre mois après votre dernière visite, puis
// elles s'effacent d'elles-mêmes. » Avant cette fonction, rien ne purgeait
// jamais habitudes/{uid} : la phrase était vraie sur la page, pas dans le
// code. Tourne une fois par jour, largement assez pour une fenêtre de vingt-
// quatre mois, et efface par lots de 400 pour rester sous la limite Firestore
// de 500 écritures par lot.
const MOIS_MS = 30 * 24 * 60 * 60 * 1000;
const FENETRE_MS = 24 * MOIS_MS;
const TAILLE_LOT = 400;

export const purgerHabitudesInactives = onSchedule(
  { schedule: 'every 24 hours', timeZone: 'America/Toronto', memory: '256MiB' },
  async () => {
    const db = getFirestore();
    const seuil = Timestamp.fromMillis(Date.now() - FENETRE_MS);
    const snap = await db.collection('habitudes').where('derniereVisite', '<', seuil).get();
    if (snap.empty) return;

    for (let i = 0; i < snap.docs.length; i += TAILLE_LOT) {
      const lot = db.batch();
      for (const d of snap.docs.slice(i, i + TAILLE_LOT)) lot.delete(d.ref);
      await lot.commit();
    }
  },
);
