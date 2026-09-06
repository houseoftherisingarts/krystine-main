import { useEffect } from 'react';
import { useAuth, useUI } from '../../contexts/AppContext';
import { telechargerMusiqueOrigine } from '../../firebase/musique';

// Quand une membre a choisi la musique d'Origine comme musique du site, ce
// composant (monté une fois dans App) va chercher son lien signé et le passe
// au lecteur d'ambiance de la barre. Sinon, la musique de base reste.
const MusiqueDuSite = () => {
  const { user, member } = useAuth();
  const { setAudioUrl } = useUI();
  const choisie = !!member?.personnalisation?.musiqueSite;

  useEffect(() => {
    if (!user || !choisie) { setAudioUrl(null); return; }
    let vivant = true;
    telechargerMusiqueOrigine()
      .then((url) => { if (vivant) setAudioUrl(url); })
      .catch((e) => console.warn('[musique] lien du site indisponible', e));
    return () => { vivant = false; };
  }, [user, choisie, setAudioUrl]);

  return null;
};

export default MusiqueDuSite;
