import { useEffect, useRef } from 'react';
import { useAuth, useUI } from '../../contexts/AppContext';
import { telechargerMusiqueOrigine } from '../../firebase/musique';

// Quand une membre a choisi la musique d'Origine comme musique du site, ce
// composant (monté une fois dans App) va chercher son lien signé et le passe
// au lecteur d'ambiance de la barre. Sinon, la musique de base reste.
const MusiqueDuSite = () => {
  const { user, member } = useAuth();
  const { setAudioUrl } = useUI();
  const choisie = !!member?.personnalisation?.musiqueSite;
  // Au premier passage (chargement de la page), la piste se pose en silence;
  // ensuite, un changement vient d'un choix dans le menu et la musique part.
  const premier = useRef(true);

  useEffect(() => {
    const jouer = !premier.current;
    premier.current = false;
    if (!user || !choisie) { setAudioUrl(null, { jouer: jouer && !!user }); return; }
    let vivant = true;
    telechargerMusiqueOrigine()
      .then((url) => { if (vivant) setAudioUrl(url, { jouer }); })
      .catch((e) => console.warn('[musique] lien du site indisponible', e));
    return () => { vivant = false; };
  }, [user, choisie, setAudioUrl]);

  return null;
};

export default MusiqueDuSite;
