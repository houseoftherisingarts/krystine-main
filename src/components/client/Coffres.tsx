import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useApp } from '../../contexts/AppContext';
import { COFFRES, ORDRE_COFFRES, OUVERTURES_PAR_JOUR, chanceLisible, type TypeCoffre } from '../../lib/coffresConfig';
import { niskas } from '../../lib/pointsConfig';
import { acheterCoffre, ouvrirCoffre, reclamerGrandLot, suivreMesCoffres, type Inventaire, type LotGagne } from '../../firebase/coffres';
import PieceNiska from './PieceNiska';
import Portail from '../Portail';

// ─── Les coffres ─────────────────────────────────────────────────────────────
// Trois coffres, leurs clés, et les chances de chaque lot écrites en toutes
// lettres avant le premier geste. On gagne toujours quelque chose; on n'ouvre
// que cinq coffres par jour; le grand lot se réclame après une question
// d'habileté. Rien ne clignote pour presser la main : un coffre est un plaisir,
// jamais un piège (Alex, 6 septembre 2026).

const ease = [0.22, 1, 0.36, 1] as const;

// Le dessin d'un coffre : un corps bombé, deux ferrures, une serrure, et un
// couvercle qui se soulève à l'ouverture. Teinté par métal.
const Coffre: React.FC<{ type: TypeCoffre; ouvert?: boolean; taille?: number }> = ({ type, ouvert, taille = 120 }) => {
  const c = COFFRES[type];
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 100" width={taille} height={taille * 0.83} aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={`cf-bois-${type}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7A4A2B" /><stop offset="1" stopColor="#3E2415" />
        </linearGradient>
        <linearGradient id={`cf-metal-${type}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.teinteClaire} /><stop offset="0.5" stopColor={c.teinte} /><stop offset="1" stopColor={c.teinteSombre} />
        </linearGradient>
        <radialGradient id={`cf-lueur-${type}`} cx="50%" cy="60%" r="60%">
          <stop offset="0" stopColor="#FFF3C4" stopOpacity="0.95" /><stop offset="1" stopColor={c.teinteClaire} stopOpacity="0" />
        </radialGradient>
        <filter id={`cf-ombre-${type}`} x="-20%" y="-20%" width="140%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" /><feOffset dy="3" result="o" />
          <feComponentTransfer><feFuncA type="linear" slope="0.35" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* La lueur qui sort du coffre ouvert */}
      {ouvert && <motion.ellipse cx="60" cy="52" rx="44" ry="30" fill={`url(#cf-lueur-${type})`} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1.1 }} transition={{ duration: reduce ? 0 : 0.7, ease }} style={{ transformOrigin: '60px 52px' }} />}
      <g filter={`url(#cf-ombre-${type})`}>
        {/* Le corps */}
        <rect x="14" y="44" width="92" height="46" rx="6" fill={`url(#cf-bois-${type})`} />
        <rect x="14" y="44" width="92" height="46" rx="6" fill="none" stroke={c.teinteSombre} strokeWidth="1.2" />
        {/* Les ferrures verticales */}
        <rect x="30" y="44" width="8" height="46" fill={`url(#cf-metal-${type})`} />
        <rect x="82" y="44" width="8" height="46" fill={`url(#cf-metal-${type})`} />
        {/* La serrure */}
        <rect x="52" y="52" width="16" height="18" rx="3" fill={`url(#cf-metal-${type})`} stroke={c.teinteSombre} strokeWidth="0.8" />
        <circle cx="60" cy="59" r="2.6" fill={c.teinteSombre} />
        <rect x="59" y="60" width="2" height="6" fill={c.teinteSombre} />
        {/* Le couvercle */}
        <motion.g
          style={{ transformOrigin: '14px 44px' }}
          animate={ouvert ? { rotate: -38, y: -2 } : { rotate: 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.6, ease }}
        >
          <path d="M14 44 Q14 14 60 14 Q106 14 106 44 Z" fill={`url(#cf-bois-${type})`} stroke={c.teinteSombre} strokeWidth="1.2" />
          <path d="M30 44 Q30 22 38 20 L38 44 Z" fill={`url(#cf-metal-${type})`} />
          <path d="M82 44 Q82 22 90 20 L90 44 Z" fill={`url(#cf-metal-${type})`} />
          <path d="M14 44 Q14 14 60 14 Q106 14 106 44" fill="none" stroke={c.teinteClaire} strokeWidth="1" opacity="0.6" />
          <rect x="14" y="40" width="92" height="5" fill={`url(#cf-metal-${type})`} />
        </motion.g>
      </g>
    </svg>
  );
};

const Cle: React.FC<{ type: TypeCoffre; taille?: number }> = ({ type, taille = 18 }) => {
  const c = COFFRES[type];
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} aria-hidden="true">
      <circle cx="8" cy="8" r="5" fill="none" stroke={c.teinte} strokeWidth="2.4" />
      <path d="M11.5 11.5 L20 20 M17 17 L19.5 14.5 M14.5 14.5 L17 12" stroke={c.teinte} strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
};

const Coffres: React.FC<{ solde: number; onChange?: () => void }> = ({ solde, onChange }) => {
  const { user, lang } = useApp();
  const fr = lang === 'FR';
  const [inv, setInv] = useState<Inventaire>({ boites: { bronze: 0, argent: 0, or: 0 }, cles: { bronze: 0, argent: 0, or: 0 } });
  const [occupe, setOccupe] = useState<string | null>(null);
  const [chancesOuvertes, setChancesOuvertes] = useState<TypeCoffre | null>(null);
  const [ouverture, setOuverture] = useState<{ type: TypeCoffre; lot: LotGagne | null } | null>(null);
  const [reponse, setReponse] = useState('');
  const [avis, setAvis] = useState<string | null>(null);

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
    setOuverture({ type, lot: null });
    try {
      const r = await ouvrirCoffre(type);
      // Le couvercle se soulève, puis le lot paraît.
      window.setTimeout(() => setOuverture({ type, lot: r.lot }), 700);
      onChange?.();
    } catch (e) { setOuverture(null); dire(erreur(e) || (fr ? 'Le coffre n’a pas pu s’ouvrir.' : 'The chest could not open.')); }
    finally { setOccupe(null); }
  };

  const repondre = async () => {
    if (!ouverture?.lot?.ouvertureId) return;
    setOccupe('question');
    try {
      const r = await reclamerGrandLot(ouverture.lot.ouvertureId, Number(reponse));
      if (r.bon) setOuverture({ type: ouverture.type, lot: { ...ouverture.lot, genre: 'grand', note: 'ok' } });
      else dire(fr ? `Ce n’est pas la bonne réponse (essai ${r.essais} sur 3).` : `Not the right answer (attempt ${r.essais} of 3).`);
    } catch (e) { dire(erreur(e)); }
    finally { setOccupe(null); }
  };

  const bouton = 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40';

  return (
    <div className="mt-8" id="boutique-coffres">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]"><i className="fa-solid fa-box-open" /></span>
        <div>
          <h4 className="font-serif text-xl text-[#293027] dark:text-white">{fr ? 'Les coffres' : 'The chests'}</h4>
          <p className="mt-1 max-w-2xl text-sm text-[#293027]/65 dark:text-white/65">
            {fr
              ? `Un coffre s’achète en niskas, se reçoit de Krystine ou se gagne au septième jour de la roue. Sa clé s’achète à part. Chaque coffre donne toujours quelque chose, et les chances de chaque lot sont écrites ci-dessous, avant que vous n’achetiez quoi que ce soit. Cinq ouvertures par jour, pas plus.`
              : `A chest is bought with niskas, given by Krystine or won on the seventh day of the wheel. Its key is bought separately. Every chest always gives something, and the odds of each prize are written below, before you buy anything. Five openings a day, no more.`}
          </p>
        </div>
      </div>

      {avis && <p className="mt-4 rounded-[14px] bg-[#BA7B39]/15 px-4 py-3 text-sm text-[#293027] dark:text-white">{avis}</p>}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {ORDRE_COFFRES.map((type) => {
          const c = COFFRES[type];
          const nb = inv.boites[type]; const cles = inv.cles[type];
          const pret = nb > 0 && cles > 0;
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
                <Coffre type={type} taille={84} />
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

              <button type="button" onClick={() => setChancesOuvertes(chancesOuvertes === type ? null : type)} className="mt-3 flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">
                <span><i className="fa-solid fa-scale-balanced mr-1.5" /> {fr ? 'Les chances, noir sur blanc' : 'The odds, in plain sight'}</span>
                <i className={`fa-solid fa-chevron-down transition-transform ${chancesOuvertes === type ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence initial={false}>
                {chancesOuvertes === type && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden text-sm">
                    {c.lots.map((l) => (
                      <li key={l.fr} className="flex items-center justify-between gap-3 border-t border-[#38403a]/10 py-2 first:mt-2 dark:border-white/10">
                        <span className="text-[#293027] dark:text-white">{l.genre === 'grand' && <i className="fa-solid fa-fire mr-1.5 text-[#BA7B39]" />}{fr ? l.fr : l.en}</span>
                        <span className="shrink-0 font-serif text-[#8B4A2F] dark:text-[#d9a05b]">{chanceLisible(l.poids, lang)}</span>
                      </li>
                    ))}
                    <li className="border-t border-[#38403a]/10 pt-2 text-[11px] text-[#293027]/55 dark:border-white/10 dark:text-white/55">
                      {fr ? `Tirage au sort sur le serveur, jamais dans votre navigateur. ${OUVERTURES_PAR_JOUR} ouvertures par jour au plus.` : `Drawn on the server, never in your browser. At most ${OUVERTURES_PAR_JOUR} openings a day.`}
                    </li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-[#293027]/55 dark:text-white/55">
        {fr
          ? 'Le grand lot du coffre d’or (le Foyer d’Origine, offert) se réclame en répondant à une question d’habileté, comme le veut la loi canadienne pour tout concours où le hasard entre en jeu. Les rabais gagnés sont honorés par Krystine avec un code de la boutique, comme les récompenses de la plante. Aucune valeur en argent, aucun remboursement.'
          : 'The gold chest’s grand prize (the Origine Hearth, on us) is claimed by answering a skill-testing question, as Canadian law requires for any contest involving chance. Discounts won are honoured by Krystine with a shop code, like the plant rewards. No cash value, no refunds.'}
      </p>

      {/* L'ouverture : le coffre, puis le lot */}
      <AnimatePresence>
        {ouverture && (
          <Portail>
          <motion.div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => ouverture.lot && ouverture.lot.genre !== 'grand' && setOuverture(null)}>
            <motion.div
              initial={{ scale: 0.9, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.45, ease }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[24px] border border-white/60 bg-[#EEE7DB] p-8 text-center dark:border-white/10 dark:bg-[#293027]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: COFFRES[ouverture.type].teinteSombre }}>{fr ? COFFRES[ouverture.type].nomFR : COFFRES[ouverture.type].nomEN}</p>
              <motion.div className="mx-auto mt-4 w-fit" animate={ouverture.lot ? {} : { x: [0, -3, 3, -2, 2, 0] }} transition={{ duration: 0.5, repeat: ouverture.lot ? 0 : Infinity, repeatDelay: 0.3 }}>
                <Coffre type={ouverture.type} taille={180} ouvert={!!ouverture.lot} />
              </motion.div>
              {!ouverture.lot ? (
                <p className="mt-4 font-serif text-xl text-[#293027] dark:text-white">{fr ? 'La clé tourne…' : 'The key turns…'}</p>
              ) : ouverture.lot.genre === 'grand' && ouverture.lot.note !== 'ok' ? (
                <div className="mt-4">
                  <p className="font-serif text-2xl text-[#293027] dark:text-white">{fr ? 'Le grand lot.' : 'The grand prize.'}</p>
                  <p className="mt-2 text-sm text-[#293027]/70 dark:text-white/70">{fr ? 'Le Foyer d’Origine vous est offert. Une question d’habileté d’abord, comme le veut la loi :' : 'The Origine Hearth is yours. One skill-testing question first, as the law requires:'}</p>
                  <p className="mt-3 font-serif text-3xl text-[#8B4A2F] dark:text-[#d9a05b]">{ouverture.lot.question} = ?</p>
                  <div className="mt-3 flex justify-center gap-2">
                    <input value={reponse} onChange={(e) => setReponse(e.target.value.replace(/[^0-9-]/g, ''))} inputMode="numeric" className="w-28 rounded-full border border-[#38403a]/15 bg-white px-4 py-2 text-center text-lg text-[#293027] outline-none focus:border-[#BA7B39]" placeholder="…" />
                    <button type="button" onClick={repondre} disabled={!reponse || occupe !== null} className={`${bouton} bg-[#BA7B39] text-[#293027] hover:bg-[#d9a05b]`}>{fr ? 'Répondre' : 'Answer'}</button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{fr ? 'Vous gagnez' : 'You win'}</p>
                  <p className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">
                    {ouverture.lot.genre === 'niskas' && <PieceNiska size={26} className="mr-2 align-[-4px]" />}
                    {ouverture.lot.genre === 'grand' ? (fr ? 'Le Foyer d’Origine, offert' : 'The Origine Hearth, on us') : ouverture.lot.nom}
                  </p>
                  <p className="mt-2 text-sm text-[#293027]/70 dark:text-white/70">
                    {ouverture.lot.genre === 'niskas' && (fr ? `Ils sont déjà dans votre bourse (${niskas(ouverture.lot.solde ?? 0, 'FR')}).` : `Already in your purse (${niskas(ouverture.lot.solde ?? 0, 'EN')}).`)}
                    {ouverture.lot.genre === 'cosmetique' && (fr ? 'Il vous attend dans la petite boutique, prêt à activer.' : 'It is waiting in the little shop, ready to turn on.')}
                    {ouverture.lot.genre === 'recompense' && (fr ? 'Krystine vous envoie le code par message; suivez-le sous Points, dans « Mes récompenses ».' : 'Krystine sends you the code by message; follow it under Points, in “My rewards”.')}
                    {ouverture.lot.genre === 'grand' && (fr ? 'Le cadeau est dans votre messagerie : un clic et le Foyer est à vous.' : 'The gift is in your messages: one click and the Hearth is yours.')}
                    {ouverture.lot.note && ouverture.lot.note !== 'ok' && <span className="block mt-1">{ouverture.lot.note}</span>}
                  </p>
                  <button type="button" onClick={() => setOuverture(null)} className={`${bouton} mt-5 bg-[#293027] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027]`}>{fr ? 'Fermer' : 'Close'}</button>
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
