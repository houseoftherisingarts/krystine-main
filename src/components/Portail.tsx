import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Toute fenêtre qui se pose par-dessus la page passe par ici : elle est
// rendue à la racine du document, jamais dans son parent. Un parent animé
// (transform, filter) fait sinon glisser un `fixed` loin sous le pli, et la
// fenêtre finit en bas du scroll (Alex, 6 septembre 2026).
const Portail: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pret, setPret] = useState(false);
  useEffect(() => setPret(true), []);
  if (!pret || typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};

export default Portail;
