import React from 'react';
// La scène animée derrière l'espace pour les skins légendaires et Aurore.
// Gabarit vide : l'agent « effets » le remplace. Il doit rendre null pour tout
// autre skin, et ne jamais capter les clics (pointer-events: none).
const EffetsSkin: React.FC<{ skin: string }> = () => null;
export default EffetsSkin;
