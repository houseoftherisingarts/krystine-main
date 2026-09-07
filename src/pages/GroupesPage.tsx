import React from 'react';
import { useParams } from 'react-router-dom';
import CadreFoyer from '../components/communaute/CadreFoyer';
import EspaceGroupe from '../components/communaute/EspaceGroupe';

// ─── Les groupes du Foyer ────────────────────────────────────────────────────
// /groupes et /groupes/:id, dans la coquille du Foyer. Le premier groupe est
// le Foyer d'Origine lui-même (formation « foyer »); les formations achetées
// suivent. Socle posé par l'architecte le 6 septembre 2026; le LOT B (voir
// docs/foyer-social-plan.md) y ajoute la rangée des groupes de la membre et
// la variante « cadre » d'EspaceGroupe.
const GroupesPage: React.FC = () => {
  const { id = 'foyer' } = useParams<{ id?: string }>();
  return (
    <CadreFoyer onglet="groupes">
      <EspaceGroupe formationId={id} />
    </CadreFoyer>
  );
};

export default GroupesPage;
