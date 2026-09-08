import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { reclamerQuotidien, type Quotidien } from '../../firebase/points';
import { journee, niskas, banniereParCle } from '../../lib/pointsConfig';
import { LIBELLE_FOYER, ROUE_FOYER, prochainsCadeauxFoyer } from '../../lib/badgeBleu';
import Portail from '../Portail';
import { useGamification } from '../../contexts/GamificationContext';

// Le cadeau du jour (Alex, 7 septembre 2026 : plus de roue ni de hasard).
// Une carte sobre : le chemin des sept jours, un bouton « Ouvrir mon
// cadeau », une révélation douce. Le serveur (functions/src/niskas.ts,
// reclamerQuotidien) tranche déjà tout au chargement — la révélation n'est
// qu'un moment d'écran, gardé pour la journée dans CLE_VU. Au Foyer
// d'Origine, une SECONDE roue de sept jours tourne dessous, avec ses cadeaux
// à elle : sa mécanique ne change pas, seuls ses mots perdent « roue » et
// « récompense ».

const CLE_VU = 'krystine-roue-vue';
const ease = [0.16, 0.8, 0.24, 1] as const;
const POSITIONS = [1, 2, 3, 4, 5, 6, 7] as const;

/** La phrase du cadeau que la roue du Foyer vient de donner, ou null. */
function phraseRoueFoyer(etat: Quotidien, fr: boolean): string | null {
  const c = etat.cadeauRoue;
  if (!c) return null;
  if (c.genre === 'musique') return fr ? 'La musique d’Origine est à vous : elle vous attend dans l’onglet Téléchargements et petite boutique.' : 'The Origin music is yours: it waits in the Downloads tab.';
  if (c.genre === 'cle') return fr ? 'Une clé de coffre entre dans votre trousseau.' : 'A chest key joins your keyring.';
  if (c.genre === 'coffre') return fr ? `Vous trouverez ${c.nom} dans la petite boutique.` : `You will find ${c.nom} in the little shop.`;
  return fr ? `${niskas(c.montant ?? 0, 'FR')} de plus dans votre bourse.` : `${niskas(c.montant ?? 0, 'EN')} more in your purse.`;
}

/** La phrase du grand cadeau d'un mois complet au Foyer, ou null. */
function phraseMoisFoyer(etat: Quotidien, fr: boolean): string | null {
  const m = etat.cadeauMois;
  if (!m) return null;
  const debut = fr ? 'Un mois complet : ' : 'A full month: ';
  if (m.genre === 'musique') return debut + (fr ? 'la musique d’Origine est à vous.' : 'the Origin music is yours.');
  if (m.genre === 'skin-rare') return debut + (fr ? `le ${m.nom ?? 'skin rare'} est à vous, dans la petite boutique.` : `the ${m.nom ?? 'rare skin'} is yours, in the little shop.`);
  if (m.genre === 'saison') return debut + (fr ? `${m.nom ?? 'une saison complète'} est à vous, dans l’onglet Formations.` : `${m.nom ?? 'a full season'} is yours, in the Programmes tab.`);
  return debut + (fr ? `${niskas(m.montant ?? 0, 'FR')} de plus dans votre bourse.` : `${niskas(m.montant ?? 0, 'EN')} more in your purse.`);
}

const CadeauDuJour: React.FC<{ uid: string; lang: 'FR' | 'EN' }> = ({ uid, lang }) => {
  const gam = useGamification();
  const reduce = useReducedMotion();
  const [etat, setEtat] = useState<Quotidien | null>(null);
  const [ouvert, setOuvert] = useState(false);
  // dejaRevele : le navigateur avait déjà montré la révélation aujourd'hui,
  // avant même ce chargement. justRevele : elle vient d'être ouverte par un
  // clic, pendant cette visite — les deux ne se confondent jamais, sinon un
  // retour sur la page reverrait « +5 niskas » au lieu de « revenez demain ».
  const [dejaRevele, setDejaRevele] = useState(false);
  const [justRevele, setJustRevele] = useState(false);

  useEffect(() => {
    if (!uid || !gam.pret || !gam.roueQuotidienne) return;
    let vivant = true;
    const aujourdhui = journee();
    let vu = '';
    try { vu = localStorage.getItem(CLE_VU) || ''; } catch { /* noop */ }
    reclamerQuotidien(uid).then((r) => {
      if (!vivant) return;
      setEtat(r);
      const vuAujourdhui = vu === aujourdhui;
      setDejaRevele(vuAujourdhui);
      if (!r.deja || !vuAujourdhui) setOuvert(true);
    }).catch((e) => console.warn('[cadeau-du-jour] réclamation ratée', e));
    return () => { vivant = false; };
  }, [uid, gam.pret, gam.roueQuotidienne]);

  useEffect(() => {
    const ouvrir = () => setOuvert(true);
    window.addEventListener('krystine:ouvrir-roue', ouvrir);
    return () => window.removeEventListener('krystine:ouvrir-roue', ouvrir);
  }, []);

  const ouvrirCadeau = () => {
    setJustRevele(true);
    try { localStorage.setItem(CLE_VU, journee()); } catch { /* noop */ }
  };

  if (!gam.roueQuotidienne || !etat || !ouvert) return null;
  const fr = lang === 'FR';
  const position = etat.position;
  const banniereGagnee = etat.type === 'banniere' && etat.cle ? banniereParCle(etat.cle) : undefined;
  const montrerBouton = !dejaRevele && !justRevele;
  const montrerReveal = justRevele;
  const montrerDejaFait = dejaRevele && !justRevele;

  const foyer = etat.foyer === true && gam.roueFoyer;
  const jourFoyer = etat.jourFoyer ?? position;
  const cadeauFoyer = foyer ? phraseRoueFoyer(etat, fr) : null;
  const cadeauMoisFoyer = foyer ? phraseMoisFoyer(etat, fr) : null;
  const prochains = foyer ? prochainsCadeauxFoyer(etat.serie) : null;
  const jours = (n: number) => (fr ? `${n} jour${n > 1 ? 's' : ''}` : `${n} day${n > 1 ? 's' : ''}`);
  const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

  return (
    <Portail>
    <div data-bug-ignore className="fixed inset-0 z-[125] flex items-end justify-center overflow-y-auto overscroll-contain bg-[#151d19]/55 p-4 backdrop-blur-sm sm:items-center" onClick={() => setOuvert(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cadeau-jour-titre"
        className="w-full max-w-md rounded-[24px] border border-white/60 bg-[#EEE7DB] p-6 text-center shadow-2xl md:p-8 dark:border-white/10 dark:bg-[#293027]"
        onClick={(e) => e.stopPropagation()}
      >
        <p id="cadeau-jour-titre" className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
          {fr ? 'Le cadeau du jour' : "Today's gift"}
        </p>

        {/* Le chemin des sept jours : celui du jour en laiton, le septième porte une petite bannière. */}
        <ol className="mt-4 flex items-center justify-center gap-2.5">
          {POSITIONS.map((n) => {
            const actuel = n === position;
            const passe = n < position;
            return (
              <li key={n} className="flex flex-col items-center">
                <span
                  className={`flex h-3 w-3 items-center justify-center rounded-full transition-colors ${
                    actuel
                      ? 'bg-[#BA7B39] shadow-[0_0_0_4px_rgba(186,123,57,0.25)]'
                      : passe
                        ? 'bg-[#BA7B39]/45'
                        : 'bg-[#38403a]/15 dark:bg-white/15'
                  }`}
                >
                  {n === 7 && <i className="fa-solid fa-image text-[6px] text-white" aria-hidden="true" />}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[#293027]/55 dark:text-white/55">
          {fr ? `Jour ${position} sur 7` : `Day ${position} of 7`}
        </p>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-[#293027]/60 dark:text-white/60">
          {fr
            ? 'Revenez chaque jour : rien ne recule si vous en sautez un. Une bannière exclusive vous attend au 7e jour.'
            : 'Come back each day: nothing resets if you skip one. An exclusive banner awaits on day 7.'}
        </p>

        {montrerBouton && (
          <div className="mt-6">
            <button
              type="button"
              onClick={ouvrirCadeau}
              className="rounded-full bg-[#293027] px-6 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
            >
              {fr ? 'Ouvrir mon cadeau' : 'Open my gift'}
            </button>
          </div>
        )}

        {montrerDejaFait && (
          <p className="mt-6 font-serif text-lg text-[#293027] dark:text-white">
            {fr ? 'Votre cadeau du jour est ouvert. Revenez demain.' : 'Today’s gift is already open. Come back tomorrow.'}
          </p>
        )}

        <AnimatePresence>
          {montrerReveal && (
            <motion.div
              key={etat.type === 'banniere' ? `banniere-${etat.cle}` : `niskas-${etat.montant}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: reduce ? 0.3 : 1, ease }}
              className="mt-6"
            >
              {etat.type === 'banniere' && banniereGagnee ? (
                <>
                  <img
                    src={banniereGagnee.image720 || banniereGagnee.image}
                    alt=""
                    className="mx-auto h-28 w-full max-w-xs rounded-[16px] object-cover"
                  />
                  <h2 className="mt-4 font-serif text-2xl text-[#293027] dark:text-white">
                    {fr ? banniereGagnee.nomFR : banniereGagnee.nomEN}
                  </h2>
                  <p className="mt-2 text-sm text-[#293027]/70 dark:text-white/70">
                    {fr ? 'Elle est à vous. Retrouvez-la dans vos bannières.' : 'It’s yours. You’ll find it among your banners.'}
                  </p>
                </>
              ) : (
                <h2 className="font-serif text-4xl text-[#8B4A2F] dark:text-[#d9a05b]">
                  {fr ? `+${etat.montant} niskas` : `+${etat.montant} niskas`}
                </h2>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Le cadeau du Foyer : la deuxième roue, avec ses propres cadeaux. */}
        {foyer && prochains && (
          <div className="mt-6 rounded-[18px] border border-[#BA7B39]/40 bg-[#BA7B39]/10 p-4 text-left md:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
                <i className="fa-solid fa-fire mr-1.5" aria-hidden="true" />{fr ? LIBELLE_FOYER.fr : LIBELLE_FOYER.en} · {fr ? 'Le cadeau du Foyer' : 'The Hearth gift'}
              </p>
              <p className="text-[11px] text-[#293027]/60 dark:text-white/60">{fr ? `Jour ${jourFoyer} sur ${ROUE_FOYER.length}` : `Day ${jourFoyer} of ${ROUE_FOYER.length}`}</p>
            </div>

            <ol className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
              {ROUE_FOYER.map((etape, i) => {
                const n = i + 1;
                const passe = n < jourFoyer;
                const actuel = n === jourFoyer;
                const icone = etape.cadeau.genre === 'niskas' ? 'fa-coins'
                  : etape.cadeau.genre === 'cle' ? 'fa-key'
                    : etape.cadeau.genre === 'musique' ? 'fa-music'
                      : etape.cadeau.coffre === 'argent' ? 'fa-gem' : 'fa-box-open';
                return (
                  <li
                    key={n}
                    title={fr ? etape.fr : etape.en}
                    className={`flex flex-col items-center gap-1.5 rounded-[14px] border px-1 py-3 text-center transition-all ${
                      actuel
                        ? 'border-[#BA7B39] bg-[#BA7B39]/25 shadow-[0_0_0_3px_rgba(186,123,57,0.25)]'
                        : passe
                          ? 'border-[#38403a]/10 bg-white/40 opacity-60 dark:border-white/10 dark:bg-white/5'
                          : 'border-[#38403a]/10 bg-white/25 dark:border-white/10 dark:bg-white/[0.03]'
                    }`}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#38403a]/60 dark:text-white/60">{fr ? 'Jour' : 'Day'} {n}</span>
                    <i className={`fa-solid ${icone} ${actuel ? 'text-lg text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-base text-[#293027]/45 dark:text-white/45'}`} aria-hidden="true" />
                    <span className={`w-full text-[9px] leading-tight ${etape.cadeau.genre === 'niskas' ? '' : 'hidden sm:block'} ${actuel ? 'text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-[#293027]/70 dark:text-white/70'}`}>
                      {fr ? etape.court : etape.courtEn}
                    </span>
                    {passe && <i className="fa-solid fa-check text-[10px] text-[#8B4A2F]" aria-hidden="true" />}
                  </li>
                );
              })}
            </ol>

            {(cadeauFoyer || cadeauMoisFoyer) && (
              <p className="mt-4 font-serif text-lg leading-snug text-[#293027] dark:text-white">
                <i className="fa-solid fa-gift mr-2 text-[#8B4A2F] dark:text-[#d9a05b]" aria-hidden="true" />{cadeauMoisFoyer ?? cadeauFoyer}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-[#293027]/70 dark:text-white/70">
              {fr
                ? `Prochain grand cadeau du Foyer dans ${jours(prochains.moisDans)} : ${minuscule(prochains.prochainMois.fr)}.`
                : `Next big Hearth gift in ${jours(prochains.moisDans)}: ${minuscule(prochains.prochainMois.en)}.`}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setOuvert(false)}
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#293027]/50 hover:text-[#8B4A2F] dark:text-white/50 dark:hover:text-[#d9a05b]"
          >
            {fr ? 'Fermer' : 'Close'}
          </button>
        </div>
      </div>
    </div>
    </Portail>
  );
};

export default CadeauDuJour;
