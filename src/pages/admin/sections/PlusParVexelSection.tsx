import React from 'react';
import { PlusParVexel } from '../../../vexel/PlusParVexel';
import { Card } from '../primitives';

// Onglet « Plus par Vexel » : les outils que le studio offre à ses clients,
// lus en direct dans le catalogue publié par Vexel. Le module ne porte aucune
// couleur : on lui donne ici le canon crème et laiton de Krystine, jour et nuit.
const PlusParVexelSection: React.FC = () => (
  <Card className="p-6 md:p-8">
    <div
      className="[--couleur-surface:#faf7f0] [--couleur-texte:#293027] [--couleur-muted:rgba(41,48,39,0.6)] [--couleur-bordure:rgba(41,48,39,0.12)] [--couleur-accent:#BA7B39] [--couleur-accent-texte:#293027] [--rayon-carte:20px] [--police-corps:Inter,sans-serif] [--police-titre:'Cormorant_Garamond',serif] [--police-etiquette:Inter,sans-serif] dark:[--couleur-surface:rgba(255,255,255,0.05)] dark:[--couleur-texte:#ffffff] dark:[--couleur-muted:rgba(255,255,255,0.7)] dark:[--couleur-bordure:rgba(255,255,255,0.1)]"
    >
      <PlusParVexel />
    </div>
  </Card>
);

export default PlusParVexelSection;
