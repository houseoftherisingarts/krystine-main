import React from 'react';
import { useParams } from 'react-router-dom';
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
const MessagesPage: React.FC = () => {
  const { autreUid } = useParams<{ autreUid?: string }>();
  return (
    <CadreFoyer onglet="messages">
      <CarteSociale>
        <ClientMessagerie avec={autreUid} dansFoyer />
      </CarteSociale>
    </CadreFoyer>
  );
};

export default MessagesPage;
