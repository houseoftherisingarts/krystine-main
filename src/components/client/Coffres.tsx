import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { COFFRES, ORDRE_COFFRES, OUVERTURES_PAR_JOUR, NISKAS_MUSIQUE_DEJA, PRIX_CLE, chanceLisible, type TypeCoffre } from '../../lib/coffresConfig';
import { niskas } from '../../lib/pointsConfig';
import { acheterCoffre, ouvrirCoffre, reclamerGrandLot, suivreMesCoffres, type Inventaire, type LotGagne } from '../../firebase/coffres';
import PieceNiska from './PieceNiska';
import Portail from '../Portail';

// ─── Les coffres ─────────────────────────────────────────────────────────────
// Trois coffres védiques (des figurines rendues en 3D, /compte/coffres/*.webp),
// leurs clés, et ce que chacun contient écrit en toutes lettres avant le
// premier geste. Chaque coffre donne plusieurs choses à la fois : toujours un
// skin ou une bannière, toujours la musique d'Origine, toujours des niskas, et
// parfois un rabais ou le grand lot. Cinq ouvertures par jour; le grand lot se
// réclame après une question d'habileté. Rien ne clignote pour presser la main
// (Alex, 6 septembre 2026).

const ease = [0.22, 1, 0.36, 1] as const;

// La figurine du coffre, avec son halo. Le coffre d'or porte une lueur
// iridescente qui tourne lentement, le legs de la promesse du grand lot.
const Coffre: React.FC<{ type: TypeCoffre; ouvert?: boolean; taille?: number; tremble?: boolean }> = ({ type, ouvert, taille = 120, tremble }) => {
  const c = COFFRES[type];
  const reduce = useReducedMotion();
  return (
    <div className="relative" style={{ width: taille, height: taille }} aria-hidden="true">
      <div
        className={`absolute inset-[6%] rounded-full blur-2xl transition-opacity duration-700 ${type === 'or' ? 'coffre-or-halo' : ''}`}
        style={{ background: type === 'or' ? undefined : `radial-gradient(circle, ${c.teinteClaire}${ouvert ? 'cc' : '66'} 0%, transparent 70%)`, opacity: ouvert ? 1 : 0.8 }}
      />
      <motion.img
        src={c.image}
        alt=""
        draggable={false}
        className="relative h-full w-full select-none object-contain drop-shadow-[0_16px_20px_rgba(20,10,5,0.35)]"
        animate={reduce ? {} : ouvert ? { y: -6, scale: 1.04, rotate: 0 } : tremble ? { x: [0, -3, 3, -2, 2, 0], rotate: [0, -1.5, 1.5, -1, 1, 0] } : { y: [0, -3, 0] }}
        transition={ouvert ? { duration: 0.6, ease } : tremble ? { duration: 0.5, repeat: Infinity, repeatDelay: 0.25 } : { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {ouvert && !reduce && (
        <motion.div className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6] }} transition={{ duration: 1.2, ease }}>
          {Array.from({ length: 10 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
              style={{ background: c.teinteClaire, boxShadow: `0 0 10px ${c.teinteClaire}` }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos((i / 10) * Math.PI * 2) * taille * 0.42, y: Math.sin((i / 10) * Math.PI * 2) * taille * 0.42 - taille * 0.1, opacity: 0 }}
              transition={{ duration: 1.1, ease, delay: i * 0.03 }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};

// La clé est unique (plus de couleur par coffre) : un ton neutre, le même partout.
const Cle: React.FC<{ taille?: number }> = ({ taille = 18 }) => (
  <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden="true">
    <circle cx="8" cy="8" r="5" fill="none" stroke="#8B4A2F" strokeWidth="2.4" />
    <path d="M11.5 11.5 L20 20 M17 17 L19.5 14.5 M14.5 14.5 L17 12" stroke="#8B4A2F" strokeWidth="2.4" strokeLinecap="round" fill="none" />
  </svg>
);

const Coffres: React.FC<{ solde: number; onChange?: () => void }> = ({ solde, onChange }) => {
  const { user, lang } = useApp();
  const fr = lang === 'FR';
  const reduceGlobal = useReducedMotion();
  const [inv, setInv] = useState<Inventaire>({ boites: { bronze: 0, argent: 0, or: 0 }, cles: 0 });
  const [occupe, setOccupe] = useState<string | null>(null);
  const [contenuOuvert, setContenuOuvert] = useState<TypeCoffre | null>(null);
  const [ouverture, setOuverture] = useState<{ type: TypeCoffre; lots: LotGagne[] | null; solde?: number } | null>(null);
  const [videoEchouee, setVideoEchouee] = useState(false);
  const [reponse, setReponse] = useState('');
  const [grandOk, setGrandOk] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const revelerRef = useRef<() => void>(() => {});

  useEffect(() => (user ? suivreMesCoffres(user.uid, setInv) : undefined), [user]);

  const dire = (t: string) => { setAvis(t); window.setTimeout(() => setAvis(null), 6000); };
  const erreur = (e: unknown) => ((e as { message?: string }).message || '').replace(/^.*?:\s*/, '');

  const acheter = async (type: TypeCoffre, quoi: 'boite' | 'cle') => {
    if (!user || occupe) return;
    setOccupe(`${type}-${quoi}`);
    try {
      const r = await acheterCoffre(type, quoi);
      dire(fr ? `${r.nom} : c’est fait. Il vous reste ${niskas(r.solde, 'FR')}.` : `${r.nom}: done. You have ${niskas(r.solde, 'EN')} left.`);
      onChange?.();
    } catch (e) { dire(erreur(e) || (fr ? 'L’achat n’a pas fonctionné.' : 'The purchase did not go through.')); }
    finally { setOccupe(null); }
  };

  const ouvrir = async (type: TypeCoffre) => {
    if (!user || occupe) return;
    setOccupe(`${type}-ouvrir`);
    setGrandOk(false); setReponse(''); setVideoEchouee(false);
    setOuverture({ type, lots: null });
    // La vidéo d'ouverture pilote la révélation : les lots ne paraissent qu'à
    // sa fin (onEnded), après 4,5 s si elle ne joue pas, ou tout de suite en
    // mouvement réduit. `pret`/`fini` couvrent les deux ordres d'arrivée
    // (le serveur répond avant ou après la vidéo).
    let resultat: { lots: LotGagne[]; solde: number } | null = null;
    let fini = reduceGlobal;
    const finirSiPret = () => { if (resultat && fini) setOuverture(o => (o && o.type === type && !o.lots) ? { type, ...resultat! } : o); };
    revelerRef.current = () => { fini = true; finirSiPret(); };
    if (!reduceGlobal) window.setTimeout(revelerRef.current, 4500);
    try {
      const r = await ouvrirCoffre(type);
      resultat = { lots: r.lots, solde: r.solde };
      onChange?.();
      if (reduceGlobal) window.setTimeout(finirSiPret, 800); else finirSiPret();
    } catch (e) { setOuverture(null); dire(erreur(e) || (fr ? 'Le coffre n’a pas pu s’ouvrir.' : 'The chest could not open.')); }
    finally { setOccupe(null); }
  };

  const grand = ouverture?.lots?.find(l => l.genre === 'grand');
  const repondre = async () => {
    if (!grand?.ouvertureId) return;
    setOccupe('question');
    try {
      const r = await reclamerGrandLot(grand.ouvertureId, Number(reponse));
      if (r.bon) setGrandOk(true);
      else dire(fr ? `Ce n’est pas la bonne réponse (essai ${r.essais} sur 3).` : `Not the right answer (attempt ${r.essais} of 3).`);
    } catch (e) { dire(erreur(e)); }
    finally { setOccupe(null); }
  };

  const bouton = 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40';
  const rareteMot = (r?: string) => r === 'legendaire' ? (fr ? 'Légendaire' : 'Legendary') : r === 'rare' ? (fr ? 'Rare' : 'Rare') : '';
  const iconeLot = (l: LotGagne) => l.genre === 'niskas' ? null : l.genre === 'musique' ? 'fa-music' : l.genre === 'cosmetique' ? (l.article?.startsWith('banniere') ? 'fa-image' : 'fa-palette') : l.genre === 'recompense' ? 'fa-tag' : 'fa-fire';

  return (
    <div className="mt-8" id="boutique-coffres">
      <style>{`
        @keyframes coffre-or-tourne { to { transform: rotate(360deg) } }
        .coffre-or-halo { background: conic-gradient(from 0deg, #f3dfa2, #58d3b0, #c9a052, #d48ca8, #f3dfa2); opacity: .55 !important; animation: coffre-or-tourne 14s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .coffre-or-halo { animation: none } }
      `}</style>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]"><i className="fa-solid fa-box-open" /></span>
        <div>
          <h4 className="font-serif text-xl text-[#293027] dark:text-white">{fr ? 'Les coffres' : 'The chests'}</h4>
          <p className="mt-1 max-w-2xl text-sm text-[#293027]/65 dark:text-white/65">
            {fr
              ? `Un coffre s’achète en niskas, se reçoit de Krystine ou se gagne au septième jour de la roue. La clé, elle, est unique : une seule sorte, un seul prix, elle ouvre n’importe lequel des trois coffres. Chaque coffre donne plusieurs choses à la fois : toujours un skin ou une bannière, toujours la musique d’Origine, toujours des niskas, et parfois un rabais ou le grand lot. Tout est écrit ci-dessous, avant que vous n’achetiez quoi que ce soit. Cinq ouvertures par jour, pas plus.`
              : `A chest is bought with niskas, given by Krystine or won on the seventh day of the wheel. The key, though, is unique: one kind, one price, it opens any of the three chests. Every chest gives several things at once: always a skin or a banner, always the Origine music, always niskas, and sometimes a discount or the grand prize. Everything is written below, before you buy anything. Five openings a day, no more.`}
          </p>
        </div>
      </div>

      {avis && <p className="mt-4 rounded-[14px] bg-[#BA7B39]/15 px-4 py-3 text-sm text-[#293027] dark:text-white">{avis}</p>}

      {/* La clé, unique : un seul compteur, un seul bouton, partagé par les trois coffres. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#38403a]/10 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <p className="flex items-center gap-2 text-sm text-[#293027] dark:text-white">
          <Cle taille={16} />
          {fr ? <>Vous avez <strong>{inv.cles}</strong> clé{inv.cles > 1 ? 's' : ''}, bonne{inv.cles > 1 ? 's' : ''} pour n’importe quel coffre.</> : <>You have <strong>{inv.cles}</strong> key{inv.cles > 1 ? 's' : ''}, good for any chest.</>}
        </p>
        <button type="button" onClick={() => acheter(ORDRE_COFFRES[0], 'cle')} disabled={occupe !== null || solde < PRIX_CLE} className={`${bouton} border border-[#38403a]/15 text-[#38403a]/80 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/80`}>
          <PieceNiska size={13} /> {fr ? 'Acheter une clé' : 'Buy a key'} · {PRIX_CLE}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {ORDRE_COFFRES.map((type) => {
          const c = COFFRES[type];
          const nb = inv.boites[type];
          const pret = nb > 0 && inv.cles > 0;
          return (
            <div key={type} className="relative overflow-hidden rounded-[20px] border border-[#38403a]/10 bg-white/60 p-5 dark:border-white/10 dark:bg-white/5" style={{ boxShadow: `inset 0 1px 0 ${c.teinteClaire}66` }}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${c.teinteSombre}, ${c.teinteClaire}, ${c.teinteSombre})` }} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: c.teinteSombre }}>{fr ? c.nomFR : c.nomEN}</p>
                  <p className="mt-1 text-xs text-[#293027]/60 dark:text-white/60">
                    {fr ? `${nb} coffre${nb > 1 ? 's' : ''} · ${cles} clé${cles > 1 ? 's' : ''}` : `${nb} chest${nb > 1 ? 's' : ''} · ${cles} key${cles > 1 ? 's' : ''}`}
                  </p>
                </div>
                <Coffre type={type} taille={96} />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => acheter(type, 'boite')} disabled={occupe !== null || solde < c.boite} className={`${bouton} border border-[#38403a]/15 text-[#38403a]/80 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/80`}>
                  <PieceNiska size={13} /> {fr ? 'Coffre' : 'Chest'} · {c.boite}
                </button>
                <button type="button" onClick={() => acheter(type, 'cle')} disabled={occupe !== null || solde < c.cle} className={`${bouton} border border-[#38403a]/15 text-[#38403a]/80 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/80`}>
                  <Cle type={type} taille={13} /> {fr ? 'Clé' : 'Key'} · {c.cle}
                </button>
              </div>
              <button
                type="button" onClick={() => ouvrir(type)} disabled={!pret || occupe !== null}
                className={`${bouton} mt-2 w-full justify-center bg-[#293027] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]`}
              >
                <i className="fa-solid fa-key" /> {pret ? (fr ? 'Ouvrir le coffre' : 'Open the chest') : (fr ? (nb ? 'Il manque la clé' : 'Aucun coffre à ouvrir') : (nb ? 'Key missing' : 'No chest to open'))}
              </button>

              <button type="button" onClick={() => setContenuOuvert(contenuOuvert === type ? null : type)} className="mt-3 flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">
                <span><i className="fa-solid fa-scale-balanced mr-1.5" /> {fr ? 'Ce que le coffre contient' : 'What the chest holds'}</span>
                <i className={`fa-solid fa-chevron-down transition-transform ${contenuOuvert === type ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {contenuOuvert === type && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden text-sm">
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#293027]/50 dark:text-white/50">{fr ? 'À chaque ouverture' : 'Every time'}</p>
                    <ul className="mt-1 space-y-1.5 text-[#293027] dark:text-white">
                      <li className="flex items-start gap-2"><i className="fa-solid fa-palette mt-1 text-[10px] text-[#8B4A2F] dark:text-[#d9a05b]" /><span>{fr ? `Un skin ou une bannière que vous n’avez pas encore, dont ${c.contenu.legendaire} % de chances qu’il soit légendaire (Vata, Pitta ou Kapha); sinon ${c.contenu.raresFR}, puis les communs.` : `A skin or banner you do not own yet, with a ${c.contenu.legendaire}% chance it is legendary (Vata, Pitta or Kapha); otherwise ${c.contenu.raresEN}, then the common ones.`}</span></li>
                      <li className="flex items-start gap-2"><i className="fa-solid fa-music mt-1 text-[10px] text-[#8B4A2F] dark:text-[#d9a05b]" /><span>{fr ? `La musique d’Origine, ou ${NISKAS_MUSIQUE_DEJA} niskas si elle est déjà à vous.` : `The Origine music, or ${NISKAS_MUSIQUE_DEJA} niskas if it is already yours.`}</span></li>
                      <li className="flex items-start gap-2"><PieceNiska size={12} className="mt-1" /><span>{fr ? 'Des niskas : ' : 'Niskas: '}{c.contenu.niskas.map((n, i) => `${n.montant} (${n.poids} %)`).join(' · ')}</span></li>
                    </ul>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#293027]/50 dark:text-white/50">{fr ? 'Parfois, en plus' : 'Sometimes, on top'}</p>
                    <ul className="mt-1">
                      {c.contenu.rabais.map((r) => (
                        <li key={r.fr} className="flex items-center justify-between gap-3 border-t border-[#38403a]/10 py-1.5 dark:border-white/10">
                          <span className="text-[#293027] dark:text-white">{fr ? r.fr : r.en}</span>
                          <span className="shrink-0 font-serif text-[#8B4A2F] dark:text-[#d9a05b]">{chanceLisible(r.unSur, lang)}</span>
                        </li>
                      ))}
                      {c.contenu.grandLot && (
                        <li className="flex items-center justify-between gap-3 border-t border-[#38403a]/10 py-1.5 dark:border-white/10">
                          <span className="text-[#293027] dark:text-white"><i className="fa-solid fa-fire mr-1.5 text-[#BA7B39]" />{fr ? c.contenu.grandLot.fr : c.contenu.grandLot.en}</span>
                          <span className="shrink-0 font-serif text-[#8B4A2F] dark:text-[#d9a05b]">{chanceLisible(c.contenu.grandLot.unSur, lang)}</span>
                        </li>
                      )}
                    </ul>
                    <p className="mt-2 border-t border-[#38403a]/10 pt-2 text-[11px] text-[#293027]/55 dark:border-white/10 dark:text-white/55">
                      {fr ? `Tirage au sort sur le serveur, jamais dans votre navigateur. ${OUVERTURES_PAR_JOUR} ouvertures par jour au plus.` : `Drawn on the server, never in your browser. At most ${OUVERTURES_PAR_JOUR} openings a day.`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-[#293027]/55 dark:text-white/55">
        {fr
          ? 'Le grand lot (le Foyer d’Origine, offert) se réclame en répondant à une question d’habileté, comme le veut la loi canadienne pour tout concours où le hasard entre en jeu. Les rabais gagnés sont honorés par Krystine avec un code de la boutique, comme les récompenses de la plante. Aucune valeur en argent, aucun remboursement.'
          : 'The grand prize (the Origine Hearth, on us) is claimed by answering a skill-testing question, as Canadian law requires for any contest involving chance. Discounts won are honoured by Krystine with a shop code, like the plant rewards. No cash value, no refunds.'}
      </p>

      {/* L'ouverture : le coffre tremble, s'ouvre, puis les lots paraissent l'un après l'autre */}
      <AnimatePresence>
        {ouverture && (
          <Portail>
          <motion.div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => ouverture.lots && !(grand && !grandOk) && setOuverture(null)}>
            <motion.div
              initial={{ scale: 0.9, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.45, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[24px] border border-white/60 bg-[#EEE7DB] p-7 text-center dark:border-white/10 dark:bg-[#293027]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: COFFRES[ouverture.type].teinteSombre }}>{fr ? COFFRES[ouverture.type].nomFR : COFFRES[ouverture.type].nomEN}</p>
              <div className="mx-auto mt-3 w-fit"><Coffre type={ouverture.type} taille={170} ouvert={!!ouverture.lots} tremble={!ouverture.lots} /></div>
              {!ouverture.lots ? (
                <p className="mt-3 font-serif text-xl text-[#293027] dark:text-white">{fr ? 'La clé tourne…' : 'The key turns…'}</p>
              ) : (
                <div className="mt-3 text-left">
                  <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{fr ? 'Le coffre contenait' : 'The chest held'}</p>
                  <ul className="mt-3 space-y-2">
                    {ouverture.lots.map((l, i) => (
                      <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.22, duration: 0.4, ease }}
                        className={`flex items-center gap-3 rounded-[14px] border px-4 py-2.5 ${l.genre === 'grand' ? 'border-[#BA7B39] bg-[#BA7B39]/15' : l.rarete === 'legendaire' ? 'border-[#c9a052]/60 bg-[#c9a052]/10' : 'border-[#38403a]/10 bg-white/50 dark:border-white/10 dark:bg-white/5'}`}>
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]">
                          {iconeLot(l) ? <i className={`fa-solid ${iconeLot(l)} text-xs`} /> : <PieceNiska size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-serif text-lg leading-tight text-[#293027] dark:text-white">{l.genre === 'grand' ? (fr ? 'Le Foyer d’Origine, offert' : 'The Origine Hearth, on us') : l.nom}</span>
                          {(l.rarete || l.note) && <span className="block text-[10px] uppercase tracking-widest text-[#293027]/55 dark:text-white/55">{[rareteMot(l.rarete), l.note].filter(Boolean).join(' · ')}</span>}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                  {grand && !grandOk && (
                    <div className="mt-4 rounded-[16px] border border-[#BA7B39]/50 bg-[#BA7B39]/10 p-4 text-center">
                      <p className="text-sm text-[#293027]/80 dark:text-white/80">{fr ? 'Une question d’habileté d’abord, comme le veut la loi :' : 'One skill-testing question first, as the law requires:'}</p>
                      <p className="mt-2 font-serif text-3xl text-[#8B4A2F] dark:text-[#d9a05b]">{grand.question} = ?</p>
                      <div className="mt-3 flex justify-center gap-2">
                        <input value={reponse} onChange={(e) => setReponse(e.target.value.replace(/[^0-9-]/g, ''))} inputMode="numeric" className="w-28 rounded-full border border-[#38403a]/15 bg-white px-4 py-2 text-center text-lg text-[#293027] outline-none focus:border-[#BA7B39]" placeholder="…" />
                        <button type="button" onClick={repondre} disabled={!reponse || occupe !== null} className={`${bouton} bg-[#BA7B39] text-[#293027] hover:bg-[#d9a05b]`}>{fr ? 'Répondre' : 'Answer'}</button>
                      </div>
                    </div>
                  )}
                  {grand && grandOk && (
                    <p className="mt-4 rounded-[16px] border border-[#BA7B39]/50 bg-[#BA7B39]/10 p-4 text-center text-sm text-[#293027] dark:text-white">{fr ? 'Le cadeau est dans votre messagerie : un clic et le Foyer est à vous.' : 'The gift is in your messages: one click and the Hearth is yours.'}</p>
                  )}
                  <p className="mt-4 text-center text-xs text-[#293027]/60 dark:text-white/60">
                    {fr ? `Les skins et bannières vous attendent dans la petite boutique; les rabais, sous Points dans « Mes récompenses ». Votre bourse : ${niskas(ouverture.solde ?? 0, 'FR')}.` : `Skins and banners wait in the little shop; discounts under Points in “My rewards”. Your purse: ${niskas(ouverture.solde ?? 0, 'EN')}.`}
                  </p>
                  {!(grand && !grandOk) && (
                    <div className="mt-4 text-center"><button type="button" onClick={() => setOuverture(null)} className={`${bouton} bg-[#293027] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027]`}>{fr ? 'Fermer' : 'Close'}</button></div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
          </Portail>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Coffres;
