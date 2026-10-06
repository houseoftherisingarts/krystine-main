import React from 'react';

// Pourquoi créer son compte : les lignes approuvées par Krystine le 6 octobre
// 2026, mots clés en gras (600, jamais d'italique). Servies dans la fenêtre
// d'inscription (SignInModal, mode création) et sur la porte de /compte
// (PorteMembre). La fréquence d'Origine est offerte dans l'onglet
// Téléchargements (ClientTelechargements.tsx).
const RAISONS: Array<{ grasFR: string; suiteFR: string; grasEN: string; suiteEN: string }> = [
  { grasFR: 'Vos rediffusions', suiteFR: ' et toutes vos lettres, toujours à portée de main', grasEN: 'Your replays', suiteEN: ' and all your letters, always close at hand' },
  { grasFR: 'Votre lecture du quiz,', suiteFR: ' gardée pour y revenir', grasEN: 'Your quiz reading,', suiteEN: ' kept so you can come back to it' },
  { grasFR: 'Vos formations et vos diplômes,', suiteFR: ' au même endroit', grasEN: 'Your courses and your certificates,', suiteEN: ' in one place' },
  { grasFR: 'Plus besoin de retaper vos informations', suiteFR: ' pour les listes d’attente et les directs', grasEN: 'No more retyping your details', suiteEN: ' for waiting lists and live sessions' },
  { grasFR: 'La fréquence d’Origine,', suiteFR: ' offerte dans votre espace', grasEN: 'The Origin frequency,', suiteEN: ' offered in your space' },
];

const RaisonsCompte: React.FC<{ fr: boolean; className?: string; grand?: boolean }> = ({ fr, className = '', grand = false }) => (
  <ul className={`space-y-2 text-left ${grand ? 'text-[0.92rem] leading-[1.7]' : 'text-[0.82rem] leading-[1.55]'} ${className}`}>
    {RAISONS.map(r => (
      <li key={r.grasFR} className="flex items-start gap-2.5">
        <span className={`mt-[0.62em] h-1.5 w-1.5 flex-none rounded-full bg-[#bb9a5e]`} aria-hidden="true" />
        <span>
          <span style={{ fontWeight: 600 }}>{fr ? r.grasFR : r.grasEN}</span>
          {fr ? r.suiteFR : r.suiteEN}
        </span>
      </li>
    ))}
  </ul>
);

export default RaisonsCompte;
