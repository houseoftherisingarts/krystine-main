import React, { useEffect, useState } from 'react';
import { PAQUETS_NISKAS, POINTS, ROUE_QUOTIDIENNE } from '../../lib/pointsConfig';
import PieceNiska from './PieceNiska';
import Portail from '../Portail';

// Le pop-up de bienvenue de l'espace : comment le jeu fonctionne (les niskas,
// la roue, la boutique, la plante, le parrainage). Il s'ouvre une fois, à la
// première visite, puis se rappelle par « Revoir les explications » dans le
// profil (événement krystine:ouvrir-jeu).

const CLE_VU = 'krystine-jeu-vu';

const BienvenueJeu: React.FC<{ lang: 'FR' | 'EN' }> = ({ lang }) => {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    let vu = '';
    try { vu = localStorage.getItem(CLE_VU) || ''; } catch { /* noop */ }
    if (!vu) setOuvert(true);
    const ouvrir = () => setOuvert(true);
    window.addEventListener('krystine:ouvrir-jeu', ouvrir);
    return () => window.removeEventListener('krystine:ouvrir-jeu', ouvrir);
  }, []);
  const fermer = () => {
    setOuvert(false);
    try { localStorage.setItem(CLE_VU, new Date().toISOString().slice(0, 10)); } catch { /* noop */ }
  };
  if (!ouvert) return null;
  const fr = lang === 'FR';
  const premier = PAQUETS_NISKAS[0];
  const dernier = PAQUETS_NISKAS[PAQUETS_NISKAS.length - 1];
  const maxRoue = Math.max(...ROUE_QUOTIDIENNE);

  const chapitres: { icone: string; titre: string; texte: string }[] = fr
    ? [
      { icone: 'fa-coins', titre: 'La bourse', texte: `Votre compte s'ouvre avec ${POINTS.welcome} niskas. Vous en gagnez en revenant chaque jour, grâce à la roue des sept jours qui monte jusqu'à ${maxRoue} niskas quand la suite tient, puis en publiant au Foyer, en vous faisant des amies et en invitant vos proches.` },
      { icone: 'fa-bag-shopping', titre: 'La petite boutique', texte: `Les niskas s'y dépensent : une bannière, la musique d'Origine, un skin pour habiller votre espace, toutes les vidéos de Krystine, les intégrales de Santé la vie. Quand la bourse est courte, des paquets s'achètent, de ${premier.niskas} niskas pour ${premier.prix} $ à ${dernier.niskas.toLocaleString('fr-CA')} pour ${dernier.prix} $.` },
      { icone: 'fa-seedling', titre: 'La plante', texte: 'Tout ce que vous gagnez fait pousser la plante de votre profil. Elle ne redescend jamais, même quand vous dépensez : elle raconte le chemin parcouru.' },
      { icone: 'fa-gift', titre: 'Le parrainage', texte: "Quand une amie que vous avez invitée achète une formation, un cadeau tombe pour vous, et les cadeaux grossissent avec le nombre d'amies, jusqu'à l'accès à vie." },
    ]
    : [
      { icone: 'fa-coins', titre: 'The purse', texte: `Your account opens with ${POINTS.welcome} niskas. You earn more by coming back each day, with the seven-day wheel that climbs to ${maxRoue} niskas when the streak holds, then by posting at the Hearth, making friends and inviting the people close to you.` },
      { icone: 'fa-bag-shopping', titre: 'The little shop', texte: `Niskas are spent there: a banner, the Origine music, a skin to dress your space, all of Krystine's videos, the full Santé la vie shows. When the purse runs low, packs can be bought, from ${premier.niskas} niskas for $${premier.prix} to ${dernier.niskas.toLocaleString('en-CA')} for $${dernier.prix}.` },
      { icone: 'fa-seedling', titre: 'The plant', texte: 'Everything you earn grows the plant on your profile. It never shrinks, even when you spend: it tells the road travelled.' },
      { icone: 'fa-gift', titre: 'Referrals', texte: 'When a friend you invited buys a course, a gift drops for you, and the gifts grow with the number of friends, all the way to lifetime access.' },
    ];

  return (
    <div data-bug-ignore className="fixed inset-0 z-[130] flex items-end justify-center bg-[#151d19]/60 p-4 backdrop-blur-sm sm:items-center" onClick={fermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="jeu-titre"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/60 bg-[#EEE7DB] p-6 shadow-2xl md:p-9 dark:border-white/10 dark:bg-[#293027]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
          {fr ? 'Bienvenue dans votre espace' : 'Welcome to your space'}
        </p>
        <h2 id="jeu-titre" className="mt-2 font-serif text-3xl text-[#293027] dark:text-white md:text-4xl" style={{ letterSpacing: '-0.01em' }}>
          {fr ? 'On oublie souvent de jouer' : 'We often forget to play'}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[#293027]/75 dark:text-white/75">
          {fr
            ? 'Votre espace fonctionne comme un petit jeu. Chaque geste que vous posez ici vous rapporte des niskas, la monnaie de la maison, et ces niskas s’échangent contre de vraies choses.'
            : 'Your space works like a small game. Every move you make here earns you niskas, the house currency, and those niskas trade for real things.'}
        </p>

        <ol className="mt-6 space-y-4">
          {chapitres.map((c, i) => (
            <li key={c.titre} className="flex gap-4 rounded-[16px] border border-[#38403a]/10 bg-white/50 p-4 dark:border-white/10 dark:bg-white/5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]">
                {i === 0 ? <PieceNiska size={22} /> : <i className={`fa-solid ${c.icone}`} aria-hidden="true" />}
              </span>
              <div>
                <p className="font-serif text-lg text-[#293027] dark:text-white">{c.titre}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">{c.texte}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#293027]/55 dark:text-white/55">
            {fr ? 'Ces explications restent dans votre profil, sous « Revoir les explications ».' : 'These explanations stay in your profile, under “Review the explanations”.'}
          </p>
          <button
            type="button"
            onClick={fermer}
            className="rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
          >
            {fr ? 'Entrer dans mon espace' : 'Enter my space'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BienvenueJeu;
