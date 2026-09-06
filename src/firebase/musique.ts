import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase';

// La musique de l'Expérience Origine (produit Kajabi migré le 30 août 2026).
export const MUSIQUE_ORIGINE_ID = 'kajabi-2149362766';

/** Une preuve d'achat qui est un téléchargement (la fonction pose categorie 'musique'). */
export const estTelechargement = (a: { id: string; categorie?: string }) => a.categorie === 'musique' || a.id === MUSIQUE_ORIGINE_ID;

/** Obtient le lien de téléchargement; connectée = ajout à l'espace client,
 *  visiteuse = courriel + consentement à l'infolettre. */
export async function telechargerMusiqueOrigine(data?: { email: string; prenom?: string; consent: boolean }): Promise<string> {
  if (!app) throw new Error('[Musique] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'musiqueOrigine');
  const res = await call(data || {});
  return (res.data as { url: string }).url;
}
