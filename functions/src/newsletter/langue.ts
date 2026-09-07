import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

// La langue choisie sur le compte (à la création, ou par le sélecteur du site)
// est celle des infolettres reçues. Quand elle change, chaque abonnement qui
// porte le courriel du compte prend la même langue : une seule vérité.
export const membreLangue = onDocumentWritten('members/{uid}', async (event) => {
  const avant = event.data?.before.data() as { lang?: string; email?: string } | undefined;
  const apres = event.data?.after.data() as { lang?: string; email?: string } | undefined;
  const lang = apres?.lang;
  if (!apres || (lang !== 'fr' && lang !== 'en') || lang === avant?.lang) return;
  const email = String(apres.email || '').trim().toLowerCase();
  if (!email) return;
  const db = getFirestore();
  const snap = await db.collection('newsletter').where('email', '==', email).get();
  if (snap.empty) return;
  const lot = db.batch();
  snap.docs.forEach(d => { if (d.get('lang') !== lang) lot.update(d.ref, { lang }); });
  await lot.commit();
  console.log('[membreLangue]', email, lang, snap.size, 'abonnement(s)');
});
