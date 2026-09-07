import React from 'react';
import { useParams } from 'react-router-dom';
import CadreFoyer from '../components/communaute/CadreFoyer';
import CarteSociale from '../components/communaute/CarteSociale';
import ClientMessagerie from './client/ClientMessagerie';

// ─── La messagerie d'origine ─────────────────────────────────────────────────
// /messages et /messages/:autreUid, dans la coquille du Foyer. Il n'existe
// qu'un seul dessin de conversation, celui de l'onglet Messagerie de /compte
// (ClientMessagerie) : ici il se pose dans une CarteSociale, sous l'onglet
// « Messages » allumé. Le garde-fou reste dans ClientMessagerie (marraine et
// filleules y ont accès sans le Foyer), d'où `garde={false}`.
const MessagesPage: React.FC = () => {
  const { autreUid } = useParams<{ autreUid?: string }>();
  return (
    <CadreFoyer onglet="messages" garde={false}>
      <CarteSociale>
        <ClientMessagerie avec={autreUid} dansFoyer />
      </CarteSociale>
    </CadreFoyer>
  );
};

export default MessagesPage;
