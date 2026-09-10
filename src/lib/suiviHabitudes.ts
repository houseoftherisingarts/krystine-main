// Monte à côté d'AnalyticsPageViews dans App.tsx : compte chaque page ouverte
// par une cliente connectée dans habitudes/{uid} (voir src/firebase/habitudes.ts).
//
// Trois conditions, toutes vraies à la fois, sinon rien ne s'écrit :
// une personne est connectée, le bandeau de consentement vaut « accepted »,
// et suiviRefuse n'est pas vrai dans ses habitudes.
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AppContext';
import { getConsent } from '../components/layout/ConsentBanner';
import { getHabitudes, noterPage, jourCourant } from '../firebase/habitudes';

// État partagé en mémoire, le temps de l'onglet : l'interrupteur des
// préférences (ClientPreferences) écrit ici dès que la cliente bascule, pour
// que ce compteur arrête sur-le-champ sans repasser par une lecture Firestore.
let suiviRefuseConnu: boolean | undefined;
export function marquerSuiviRefuse(v: boolean): void {
  suiviRefuseConnu = v;
}

const SuiviHabitudes: React.FC = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const uid = user?.uid;
  const dernierUidRef = useRef<string | undefined>(undefined);
  const dernierJourRef = useRef<string | undefined>(undefined);
  const dernierEcritRef = useRef<{ chemin: string; ts: number } | null>(null);

  useEffect(() => {
    if (!uid || pathname.startsWith('/admin') || getConsent() !== 'accepted') return;
    let annule = false;
    (async () => {
      if (dernierUidRef.current !== uid) {
        dernierUidRef.current = uid;
        const h = await getHabitudes(uid);
        dernierJourRef.current = h?.dernierJour;
        if (suiviRefuseConnu === undefined) suiviRefuseConnu = h?.suiviRefuse === true;
      }
      if (annule || suiviRefuseConnu) return;
      const maintenant = Date.now();
      const dernier = dernierEcritRef.current;
      if (dernier && dernier.chemin === pathname && maintenant - dernier.ts < 1000) return;
      dernierEcritRef.current = { chemin: pathname, ts: maintenant };
      await noterPage(uid, pathname, dernierJourRef.current);
      dernierJourRef.current = jourCourant();
    })();
    return () => { annule = true; };
  }, [uid, pathname]);

  return null;
};

export default SuiviHabitudes;
