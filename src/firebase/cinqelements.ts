import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase';

// L'extrait « Les 5 éléments et leurs qualités » du livre Nature & Ayurveda.
export const CINQ_ELEMENTS_ID = 'extrait-5-elements';

/** Obtient le lien de téléchargement de l'extrait; connectée = ajout à
 *  l'espace client (Téléchargements), visiteuse = courriel + consentement. */
export async function telechargerExtraitCinqElements(data?: { email: string; prenom?: string; consent: boolean }): Promise<string> {
  if (!app) throw new Error('[5 éléments] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'extraitCinqElements');
  const res = await call(data || {});
  return (res.data as { url: string }).url;
}
