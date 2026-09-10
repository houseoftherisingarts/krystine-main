/**
 * Le bandeau qui prévient une administratrice qu'elle regarde une page encore
 * éteinte. Il vit en pastille flottante en bas à gauche plutôt qu'en bandeau
 * collé en haut, parce que la barre de navigation du site est fixe et passait
 * par-dessus : le nom de Krystine et son menu se retrouvaient coupés.
 *
 * Il ne s'affiche jamais au public, et il laisse passer les clics pour ne
 * jamais gêner un bouton qui vivrait dessous.
 */
import React from 'react';

const BandeauApercu: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p
    role="status"
    className="pointer-events-none fixed bottom-4 left-4 z-[95] max-w-[min(28rem,calc(100vw-2rem))] rounded-full border border-brass/40 bg-espresso/95 px-4 py-2 text-left font-sans text-[0.66rem] uppercase leading-relaxed tracking-[0.16em] text-cream shadow-xl backdrop-blur-sm print:hidden"
  >
    <span className="mr-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brass align-middle" aria-hidden />
    {children}
  </p>
);

export default BandeauApercu;
