import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import CadreFoyer from '../components/communaute/CadreFoyer';
import CarteSociale from '../components/communaute/CarteSociale';
import ClientMessagerie from './client/ClientMessagerie';

// ─── La messagerie du Foyer ──────────────────────────────────────────────────
// /foyer/messages et /foyer/messages/:autreUid, dans la coquille du Foyer. Il
// n'existe qu'un seul dessin de conversation, celui de l'onglet Messagerie de
// /compte (ClientMessagerie) : ici il se pose dans une CarteSociale, sous
// l'onglet « Messages » allumé. La coquille exige l'achat du Foyer; la
// marraine et les filleules gardent leur porte dans /compte, onglet
// Messagerie, où le garde-fou de ClientMessagerie les laisse passer.
// ?volet=support ouvre directement l'onglet Équipe KSL (utilisé par le lien
// « Écrire à l'équipe KSL » de l'annuaire, qui ne vise plus jamais un uid
// d'admin — Alex, 7 septembre 2026).
const MessagesPage: React.FC = () => {
  const { autreUid } = useParams<{ autreUid?: string }>();
  const [params] = useSearchParams();
  const voletInitial = params.get('volet') === 'support' ? 'support' : 'amies';
  return (
    <CadreFoyer onglet="messages">
      <CarteSociale>
        <ClientMessagerie avec={autreUid} dansFoyer voletInitial={voletInitial} />
      </CarteSociale>
    </CadreFoyer>
  );
};

export default MessagesPage;
