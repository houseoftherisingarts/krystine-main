import { useEffect, useRef } from 'react';
import { useAuth, useUI } from '../../contexts/AppContext';
import { telechargerMusiqueOrigine } from '../../firebase/musique';

// Quand une membre a choisi la musique d'Origine comme musique du site, ce
// composant (monté une fois dans App) va chercher son lien signé et le passe
// au lecteur d'ambiance de la barre. Sinon, la musique de base reste.
//
// La musique ne part JAMAIS d'elle-même (Alex, 7 septembre 2026). Avant, le
// premier passage était silencieux et tout passage suivant faisait jouer :
// or la connexion se résout après le chargement, puis la fiche membre arrive
// encore après. Résultat : la musique partait seule au chargement, puis
// changeait de piste quand la fiche arrivait. Maintenant, la piste ne joue
// que si le CHOIX de piste change pour le même compte, fiche déjà chargée,
// donc seulement à la suite d'un geste dans le menu de la musique.
const MusiqueDuSite = () => {
  const { user, member } = useAuth();
  const { setAudioUrl } = useUI();
  const choisie = !!member?.personnalisation?.musiqueSite;
  const uid = user?.uid ?? null;
  const fichePrete = !user || member !== null;
  const precedent = useRef<{ uid: string | null; choisie: boolean } | null>(null);

  useEffect(() => {
    if (!fichePrete) return;
    const avant = precedent.current;
    const jouer = !!avant && avant.uid === uid && uid !== null && avant.choisie !== choisie;
    precedent.current = { uid, choisie };
    if (!uid || !choisie) { setAudioUrl(null, { jouer }); return; }
    let vivant = true;
    telechargerMusiqueOrigine()
      .then((url) => { if (vivant) setAudioUrl(url, { jouer }); })
      .catch((e) => console.warn('[musique] lien du site indisponible', e));
    return () => { vivant = false; };
  }, [uid, choisie, fichePrete, setAudioUrl]);

  return null;
};

export default MusiqueDuSite;
