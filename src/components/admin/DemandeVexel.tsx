import React, { useEffect, useState } from 'react';

// Cadre de demande de changement Vexel Webstudio, embarqué dans un back-office
// client. L'iframe pousse sa propre hauteur par postMessage ({ vexelDemande:
// 'hauteur', valeur }) : on l'écoute pour éviter une barre de défilement
// interne, avec un plancher de 520px le temps que la page distante charge.
// Le même couple client + clé sert à lire la liste des demandes (listerDemandes).
export const VEXEL_CLIENT = 'krystine';
export const VEXEL_CLE = 'aT_yMR68NLyEW3weNDjwYdW_';
export const VEXEL_FONCTIONS = 'https://us-central1-vexel-integrations.cloudfunctions.net';

interface Props {
  nom?: string;
  courriel?: string;
  ton?: 'clair' | 'sombre';
  /** Appelé à chaque message de la page distante : sa hauteur change quand une demande vient de partir. */
  onSignal?: () => void;
}

const DemandeVexel: React.FC<Props> = ({ nom = '', courriel = '', ton = 'clair', onSignal }) => {
  const [hauteur, setHauteur] = useState(620);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://vexelwebstudio.com') return;
      if (event.data?.vexelDemande === 'hauteur') {
        setHauteur(Math.max(520, event.data.valeur + 24));
        onSignal?.();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onSignal]);

  const src = `https://vexelwebstudio.com/demande/?client=${VEXEL_CLIENT}&cle=${VEXEL_CLE}&ton=${ton}&nom=${encodeURIComponent(nom)}&courriel=${encodeURIComponent(courriel)}`;

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
