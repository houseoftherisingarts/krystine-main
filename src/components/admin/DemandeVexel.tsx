import React, { useEffect, useState } from 'react';

// Cadre de demande de changement Vexel Webstudio, embarqué dans un back-office
// client. L'iframe pousse sa propre hauteur par postMessage ({ vexelDemande:
// 'hauteur', valeur }) : on l'écoute pour éviter une barre de défilement
// interne, avec un plancher de 520px le temps que la page distante charge.
interface Props {
  nom?: string;
  courriel?: string;
  ton?: 'clair' | 'sombre';
}

const DemandeVexel: React.FC<Props> = ({ nom = '', courriel = '', ton = 'clair' }) => {
  const [hauteur, setHauteur] = useState(620);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vexelwebstudio.com') return;
      if (event.data?.vexelDemande === 'hauteur') {
        setHauteur(Math.max(520, event.data.valeur + 24));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const src = `https://vexelwebstudio.com/demande/?client=krystine&cle=aT_yMR68NLyEW3weNDjwYdW_&ton=${ton}&nom=${encodeURIComponent(nom)}&courriel=${encodeURIComponent(courriel)}`;

  return (
    <iframe
      src={src}
      title="Demande de changement · Vexel Webstudio"
      allow="microphone"
      style={{ width: '100%', minHeight: hauteur, border: 0, borderRadius: 15, background: 'transparent' }}
    />
  );
};

export default DemandeVexel;
