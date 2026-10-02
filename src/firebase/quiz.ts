import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase';
import { getLang } from '../lib/i18n/lang';
import { lireProvenance } from '../lib/provenance';

/** « Recevoir mon résultat » sur /quiz : la fonction `envoyerResultatQuiz`
 *  enregistre le résultat, envoie le courriel et, si `suite`, inscrit au fil. */
export async function envoyerResultatQuiz(data: {
  prenom: string;
  email: string;
  dominant: 'Vata' | 'Pitta' | 'Kapha';
  pourcentages: { vata: number; pitta: number; kapha: number };
  suite: boolean;
  token: string;
  site: string;
}): Promise<void> {
  if (!app) throw new Error('[Quiz] Firebase not configured');
  const call = httpsCallable(getFunctions(app, 'us-central1'), 'envoyerResultatQuiz');
  const prov = lireProvenance();
  await call({ ...data, lang: getLang(), ...(prov ? { provenance: prov } : {}) });
}
