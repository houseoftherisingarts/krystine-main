import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, Microphone } from '@phosphor-icons/react';
import { useApp } from '../contexts/AppContext';
import { getEvents, getEventsPublics, type EventDoc } from '../firebase/firestore';
import WaitlistModal, { type WaitlistTarget } from '../components/WaitlistModal';
import ConferenceTourModal from '../components/ConferenceTourModal';
import RideauEntree from '../components/evenements/RideauEntree';
import EtiquetteNature from '../components/evenements/EtiquetteNature';
import { fondre, type RendezVous, type Geste } from '../lib/evenements';
import {
  StyleV2, GOUTTIERE, Kicker, Masthead, TitreV2, SousTitreV2, LiensChapitres, Planche, LigneDefiler,
  LienSouligne, BoutonNoir, BoutonCuivre, BoutonIvoire, CarteVerte, TitreChapitre, Filet, Reveal,
  QuatriemeCouverture, useMotionV2,
} from '../components/v2/Magazine';

/**
 * Le calendrier des rendez-vous, dans le langage « magazine crème » des pages
 * V2 (même charpente que /medias et /krystine) : la ligne de tête, le grand
 * titre, la planche cadrée du prochain rendez-vous, puis les chapitres. Les
 * rendez-vous viennent de deux sources fondues (src/lib/evenements.ts) : la
 * collection Firestore publiée et la programmation curée. Une administratrice
 * voit aussi les brouillons. Refonte du 11 septembre 2026, après le verdict
 * d'Alex sur la version espresso.
 */

/* ── Le geste d'un rendez-vous : réserver, s'inscrire, la liste, la tournée ── */
const BoutonGeste: React.FC<{
  geste: Geste;
  lang: 'FR' | 'EN';
  /** clair : sur crème (bouton noir, lien souligné); vert : sur la carte vert profond (bouton cuivre). */
  ton?: 'clair' | 'vert';
  onListe: (t: WaitlistTarget) => void;
  onTournee: () => void;
}> = ({ geste, lang, ton = 'clair', onListe, onTournee }) => {
  const fr = lang === 'FR';
  const libelle = fr ? geste.libelle.fr : geste.libelle.en;
  const Plein = ton === 'vert' ? BoutonCuivre : BoutonNoir;
  const Creux = ton === 'vert' ? BoutonCuivre : LienSouligne;
  switch (geste.type) {
    case 'reserver':
      return <Plein to={geste.href}>{libelle}</Plein>;
    case 'interne':
      return <Creux to={geste.href}>{libelle}</Creux>;
    case 'lien':
      return <Plein href={geste.href} externe>{libelle}</Plein>;
    case 'liste':
      return <Creux onClick={() => geste.liste && onListe(geste.liste)}>{libelle}</Creux>;
    case 'tournee':
      return <Creux onClick={onTournee}>{libelle}</Creux>;
    case 'complet':
      return <span className={`text-[0.68rem] uppercase tracking-[0.2em] ${ton === 'vert' ? 'text-[#EEE7DB]/70' : 'text-[#1c1712]/55'}`}>{libelle}</span>;
    default:
      return <span className={`text-[0.78rem] ${ton === 'vert' ? 'text-[#EEE7DB]/70' : 'text-[#3a2f23]/70'}`}>{libelle}</span>;
  }
};

/* ── La date en grand : le jour quand il est connu, sinon le mois seul ── */
const DateGrande: React.FC<{ r: RendezVous; lang: 'FR' | 'EN'; sombre?: boolean; taille?: 'index' | 'carte' }> = ({ r, lang, sombre = false, taille = 'index' }) => {
  const fr = lang === 'FR';
  const encre = sombre ? 'text-[#EEE7DB]' : 'text-[#1c1712]';
  const doux = sombre ? 'text-[#d9a05b]' : 'text-[#7d6330]';
  const mois = fr ? r.mois.fr : r.mois.en;
  if (r.jour) {
    return (
      <div className="flex items-start gap-3">
        <span className={`v2-serif font-light leading-[0.82] tabular-nums ${taille === 'carte' ? 'text-[clamp(4.4rem,8vw,7rem)]' : 'text-[clamp(2.8rem,5vw,4.4rem)]'} ${encre}`}>{r.jour}</span>
        <span className={`pt-1.5 text-[0.6rem] uppercase leading-[1.6] tracking-[0.22em] ${doux}`}>{mois}<br />{r.annee}</span>
      </div>
    );
  }
  return <p className={`v2-serif font-light leading-tight text-[clamp(1.1rem,1.6vw,1.35rem)] ${encre}`}>{mois}</p>;
};

const EvenementsPage: React.FC = () => {
  const { lang, isAdmin } = useApp();
  const fr = lang === 'FR';
  const root = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<EventDoc[]>([]);
  const [charge, setCharge] = useState(true);
  const [liste, setListe] = useState<WaitlistTarget | null>(null);
  const [tournee, setTournee] = useState(false);
  const [survol, setSurvol] = useState<{ src: string; x: number; y: number } | null>(null);
  const peutSurvoler = useRef(false);

  useEffect(() => {
    (isAdmin ? getEvents() : getEventsPublics()).then(setEvents).catch(() => setEvents([])).finally(() => setCharge(false));
  }, [isAdmin]);
  useEffect(() => { try { peutSurvoler.current = window.matchMedia('(hover: hover) and (min-width: 1024px)').matches; } catch { /* rien */ } }, []);

  // La programmation curée est là dès le premier rendu : le seuil ouvre sur le
  // vrai prochain rendez-vous sans attendre Firestore.
  const { aVenir, passes, vedette } = useMemo(() => fondre(events, isAdmin), [events, isAdmin]);
  const index = aVenir.filter(r => r.cle !== vedette?.cle);
  useMotionV2(root);

  const suivre = (r: RendezVous) => (e: React.MouseEvent) => {
    if (!peutSurvoler.current || !r.image) return;
    setSurvol({ src: r.image, x: e.clientX, y: e.clientY });
  };

  const quand = (r: RendezVous) => (fr ? r.quand.fr : r.quand.en);
  const lieu = (r: RendezVous) => (r.lieu ? (fr ? r.lieu.fr : r.lieu.en) : '');
  const titre = (r: RendezVous) => (fr ? r.titre.fr : r.titre.en);

  return (
    <div
      ref={root}
      className="relative min-h-screen w-full overflow-x-hidden bg-[#f4efe6] text-[#1c1712] antialiased"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <StyleV2 />
      <RideauEntree cle="evenements" mot={fr ? 'Les rendez-vous' : 'The gatherings'} />

      {/* ─────────── LE SEUIL · la ligne de tête, le titre, la planche ─────────── */}
      <section data-hero className={`relative flex w-full flex-col ${GOUTTIERE} pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)]`}>
        <Masthead gauche={<>N&deg; 05 &middot; {fr ? 'Les rendez-vous' : 'The gatherings'}</>} />

        <div className="mt-[clamp(2rem,5vh,3.5rem)]">
          <Kicker className="mb-6"><span data-fade className="inline-block">{fr ? 'Calendrier 2026 · 2027' : 'Calendar 2026 · 2027'}</span></Kicker>
          <TitreV2 lignes={fr ? ['Les rendez-vous'] : ['The gatherings']} />
          <SousTitreV2>
            {fr
              ? 'Les lancements, les retraites, les conférences et les rendez-vous en ligne où Krystine est là, chaque date avec sa réservation ou sa liste d’attente.'
              : 'The launches, retreats, talks and online gatherings where Krystine is present, every date with its reservation or its waitlist.'}
          </SousTitreV2>
          <LiensChapitres liens={fr
            ? [['Le prochain', '#prochain'], ['Toutes les dates', '#dates'], ['La tournée', '#tournee'], ['Ce qui a eu lieu', '#passes']]
            : [['Next up', '#prochain'], ['Every date', '#dates'], ['The tour', '#tournee'], ['What took place', '#passes']]} />
        </div>

        {vedette && (
          <Planche
            seuil
            className="mt-[clamp(2.5rem,6vh,4.5rem)]"
            src={vedette.image || '/accueil/assets/hero-ml-poster.jpg'}
            alt={titre(vedette)}
            position="object-[50%_40%]"
            etiquette={fr ? 'Le prochain rendez-vous' : 'The next gathering'}
            legende={<>{titre(vedette)} &middot; {quand(vedette)}{lieu(vedette) ? <> &middot; {lieu(vedette)}</> : null}</>}
          />
        )}

        <LigneDefiler droite={fr ? <>Le prochain &middot; Les dates &middot; La tournée</> : <>Next up &middot; Every date &middot; The tour</>} />
      </section>

      {/* ─────────── CHAPITRE 01 · LE PROCHAIN GRAND RENDEZ-VOUS ─────────── */}
      {vedette && (
        <section id="prochain" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#efe6d7] py-[clamp(6rem,15vh,11rem)]`}>
          <div className="grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:grid-cols-[1.05fr_0.95fr]">
            <Reveal>
              <Kicker className="mb-5">{fr ? 'Chapitre 01 · Le prochain grand rendez-vous' : 'Chapter 01 · The next big gathering'}</Kicker>
              <TitreChapitre className="max-w-[16ch]">{titre(vedette)}</TitreChapitre>
              <p className="mt-3 v2-serif font-light text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">
                {quand(vedette)}{lieu(vedette) ? <> &middot; {lieu(vedette)}</> : null}
              </p>
              <Filet className="mt-7" />
              {vedette.sousTitre && (
                <p className="mt-8 max-w-[52ch] text-[1rem] leading-[1.85] text-[#3a2f23]">{fr ? vedette.sousTitre.fr : vedette.sousTitre.en}</p>
              )}
              {vedette.detailsAVenir && (
                <p className="mt-5 text-[0.66rem] uppercase tracking-[0.22em] text-[#7d6330]">{fr ? 'Détails à venir · inscrivez-vous à la liste d’attente' : 'Details to come · join the waitlist'}</p>
              )}
              {(vedette.geste.type === 'reserver' || vedette.geste.type === 'interne') && vedette.geste.href && (
                <LienSouligne to={vedette.geste.href} className="mt-10">{fr ? 'Le programme de la soirée' : 'The evening programme'}</LienSouligne>
              )}
            </Reveal>

            {/* La seule carte sombre de la page : le rendez-vous, sa date en grand et le geste. */}
            <Reveal>
              <CarteVerte>
                <div className="p-7 md:p-9">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <DateGrande r={vedette} lang={lang} sombre taille="carte" />
                    <div className="flex flex-wrap items-center gap-2">
                      <EtiquetteNature nature={vedette.nature} lang={lang} ton="sombre" />
                      {vedette.brouillon && <span className="border border-[#EEE7DB]/30 px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.2em] text-[#EEE7DB]/70">{fr ? 'Non publié' : 'Unpublished'}</span>}
                    </div>
                  </div>
                  <p className="mt-8 text-[0.62rem] uppercase tracking-[0.28em] text-[#BA7B39]">{fr ? 'La soirée' : 'The evening'}</p>
                  <p className="mt-3 v2-serif font-light text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.12]">{titre(vedette)}</p>
                  <p className="mt-3 text-[0.92rem] leading-[1.7] text-[#EEE7DB]/75">
                    {quand(vedette)}{lieu(vedette) ? <> &middot; {lieu(vedette)}</> : null}
                    {vedette.detailsAVenir && <><br />{fr ? 'Détails à venir.' : 'Details to come.'}</>}
                  </p>
                  <div className="mt-7">
                    <BoutonGeste geste={vedette.geste} lang={lang} ton="vert" onListe={setListe} onTournee={() => setTournee(true)} />
                  </div>
                </div>
              </CarteVerte>
            </Reveal>
          </div>
        </section>
      )}

      {/* ─────────── CHAPITRE 02 · TOUTES LES DATES ─────────── */}
      <section id="dates" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#f4efe6] py-[clamp(6rem,15vh,11rem)]`}>
        <Reveal className="max-w-[640px]">
          <Kicker className="mb-5">{fr ? 'Chapitre 02 · Toutes les dates' : 'Chapter 02 · Every date'}</Kicker>
          <TitreChapitre>{fr ? 'Où et quand nous nous retrouvons' : 'Where and when we gather'}</TitreChapitre>
          {!charge && (
            <p className="mt-3 v2-serif font-light text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">
              {aVenir.length} {fr ? 'rendez-vous à venir' : (aVenir.length > 1 ? 'upcoming gatherings' : 'upcoming gathering')}
            </p>
          )}
        </Reveal>

        {charge ? (
          <div className="flex justify-center py-16"><div className="h-9 w-9 animate-spin rounded-full border-2 border-[#9c7a44] border-t-transparent" /></div>
        ) : index.length === 0 && !vedette ? (
          <p className="mt-10 max-w-[40ch] v2-serif font-light text-[1.4rem] leading-snug text-[#1c1712]">
            {fr ? 'Aucune date n’est encore ouverte. Les prochaines s’écrivent ici dès qu’elles se confirment.' : 'No date is open yet. The next ones appear here as soon as they are confirmed.'}
          </p>
        ) : (
          <div className="mt-12 border-b border-[#1c1712]/12 md:mt-16">
            {index.map((r, i) => (
              <Reveal key={r.cle} delay={Math.min(i * 0.05, 0.2)}>
                <div
                  className="group grid grid-cols-12 items-center gap-x-4 gap-y-4 border-t border-[#1c1712]/12 py-7 transition-colors duration-300 hover:bg-[#faf6ee] md:py-9"
                  onMouseEnter={suivre(r)}
                  onMouseMove={suivre(r)}
                  onMouseLeave={() => setSurvol(null)}
                >
                  <div className="col-span-5 md:col-span-2">
                    <DateGrande r={r} lang={lang} />
                  </div>
                  <div className="col-span-7 md:col-span-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <EtiquetteNature nature={r.nature} lang={lang} />
                      {r.brouillon && <span className="border border-[#1c1712]/25 px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.2em] text-[#1c1712]/60">{fr ? 'Non publié' : 'Unpublished'}</span>}
                    </div>
                    <h3 className="mt-3 line-clamp-2 v2-serif font-light leading-[1.08] text-[#1c1712] text-[clamp(1.4rem,2.4vw,2.1rem)]">{titre(r)}</h3>
                    {r.sousTitre && <p className="mt-1.5 line-clamp-2 max-w-[52ch] text-[0.95rem] leading-relaxed text-[#3a2f23]">{fr ? r.sousTitre.fr : r.sousTitre.en}</p>}
                    {(r.lieu || r.detailsAVenir) && (
                      <p className="mt-2.5 text-[0.66rem] uppercase tracking-[0.18em] text-[#7d6330]">
                        {lieu(r)}{r.lieu && r.detailsAVenir ? ' · ' : ''}{r.detailsAVenir ? (fr ? 'Détails à venir' : 'Details to come') : ''}
                      </p>
                    )}
                  </div>
                  <div className="col-span-12 md:col-span-4 md:text-right">
                    <BoutonGeste geste={r.geste} lang={lang} onListe={setListe} onTournee={() => setTournee(true)} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ─────────── CHAPITRE 03 · LA TOURNÉE ─────────── */}
      <section id="tournee" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#efe6d7] py-[clamp(6rem,15vh,11rem)]`}>
        <Reveal className="mb-14 grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <Kicker className="mb-5">{fr ? 'Chapitre 03 · La tournée' : 'Chapter 03 · The tour'}</Kicker>
            <TitreChapitre className="max-w-[14ch]">{fr ? 'Faire venir Krystine chez vous' : 'Bring Krystine to you'}</TitreChapitre>
            <p className="mt-3 v2-serif font-light text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">
              {fr ? 'Conférences et ateliers, en français et en anglais' : 'Talks and workshops, in French and in English'}
            </p>
            <p className="mt-7 max-w-[56ch] text-[1rem] leading-[1.85] text-[#3a2f23]">
              {fr
                ? 'Krystine donne des conférences et des ateliers aux entreprises, aux écoles et aux groupes, en salle comme en ligne. Dites-lui où et quand, et elle vous répond avec ses disponibilités et ce qu’elle propose pour votre groupe.'
                : 'Krystine gives talks and workshops to companies, schools and groups, in person and online. Tell her where and when, and she answers with her availability and what she proposes for your group.'}
            </p>
          </div>
          <Planche
            video="/accueil/assets/hero-motionleap.mp4"
            poster="/accueil/assets/hero-ml-poster.jpg"
            ratio="aspect-[4/3]"
            position="object-[60%_50%]"
            etiquette="Krystine St-Laurent"
          />
        </Reveal>

        <Reveal className="grid gap-px border border-[#1c1712]/12 bg-[#1c1712]/12 md:grid-cols-2">
          <div className="flex flex-col bg-[#faf6ee] p-[clamp(1.75rem,3vw,2.75rem)]">
            <span className="mb-7 inline-grid h-12 w-12 place-items-center rounded-full border border-[#9c7a44]/40 text-[#7d6330]">
              <CalendarCheck size={22} weight="light" />
            </span>
            <span className="mb-4 text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330]">{fr ? 'Une date à proposer' : 'A date to propose'}</span>
            <h3 className="v2-serif text-[1.6rem] font-light leading-[1.12] text-[#1c1712]">{fr ? 'Demander une date' : 'Request a date'}</h3>
            <p className="mt-4 flex-1 text-[0.95rem] leading-[1.8] text-[#3a2f23]">
              {fr
                ? 'Une conférence, un atelier ou une journée complète : nommez le lieu, la date souhaitée et le nombre de personnes, et Krystine vous revient avec ses disponibilités.'
                : 'A talk, a workshop or a full day: name the place, the wished date and the number of people, and Krystine comes back to you with her availability.'}
            </p>
            <BoutonNoir onClick={() => setTournee(true)} className="mt-8 w-fit">{fr ? 'Demander une date' : 'Request a date'}</BoutonNoir>
          </div>
          <div className="flex flex-col bg-[#faf6ee] p-[clamp(1.75rem,3vw,2.75rem)]">
            <span className="mb-7 inline-grid h-12 w-12 place-items-center rounded-full bg-[#9c7a44] text-[#faf6ee]">
              <Microphone size={22} weight="light" />
            </span>
            <span className="mb-4 text-[0.6rem] uppercase tracking-[0.24em] text-[#7d6330]">{fr ? 'La conférencière' : 'The speaker'}</span>
            <h3 className="v2-serif text-[1.6rem] font-light leading-[1.12] text-[#1c1712]">{fr ? 'Ce qu’elle apporte sur scène' : 'What she brings on stage'}</h3>
            <p className="mt-4 flex-1 text-[0.95rem] leading-[1.8] text-[#3a2f23]">
              {fr
                ? 'Près de quarante ans à relier l’Ayurveda, les cycles et l’expérience de la nature, et les sujets qu’elle porte sur scène, devant des publics de tous horizons.'
                : 'Close to forty years linking Ayurveda, the cycles and the experience of nature, and the topics she carries on stage, before audiences of every kind.'}
            </p>
            <LienSouligne to="/krystine" className="mt-8 w-fit">{fr ? 'Découvrir la conférencière' : 'Discover the speaker'}</LienSouligne>
          </div>
        </Reveal>
      </section>

      {/* ─────────── CE QUI A EU LIEU ─────────── */}
      {passes.length > 0 && (
        <section id="passes" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#f4efe6] py-[clamp(5rem,12vh,9rem)]`}>
          <Reveal>
            <Kicker className="mb-5">{fr ? 'Ce qui a eu lieu' : 'What took place'}</Kicker>
            <Filet />
          </Reveal>
          <div className="mt-10 border-b border-[#1c1712]/10">
            {passes.map(r => (
              <div key={r.cle} className="grid grid-cols-12 items-center gap-x-4 border-t border-[#1c1712]/10 py-5 opacity-70">
                <div className="col-span-5 md:col-span-2"><DateGrande r={r} lang={lang} /></div>
                <div className="col-span-7 md:col-span-8">
                  <p className="v2-serif font-light leading-tight text-[#1c1712] text-[clamp(1.1rem,1.7vw,1.4rem)]">{titre(r)}</p>
                  {r.lieu && <p className="mt-1 text-[0.8rem] text-[#3a2f23]/80">{lieu(r)}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────── LA QUATRIÈME DE COUVERTURE ─────────── */}
      <QuatriemeCouverture citation={fr ? '«\u00A0Se retrouver quelque part, au fil des saisons.\u00A0»' : '“Meeting somewhere, season after season.”'}>
        <BoutonIvoire onClick={() => setTournee(true)}>{fr ? 'Demander une date' : 'Request a date'}</BoutonIvoire>
        <a href="/krystine" className="inline-flex items-center gap-2.5 v2-serif text-lg font-light text-[#f4efe6]/80 transition-colors duration-300 hover:text-[#c8a86a]">
          {fr ? 'La conférencière' : 'The speaker'}
        </a>
      </QuatriemeCouverture>

      {/* La vignette qui suit le curseur sur l'index, grand écran seulement */}
      {survol && (
        <img
          src={survol.src}
          alt=""
          aria-hidden
          className="pointer-events-none fixed z-30 hidden w-[260px] border border-[#9c7a44]/40 shadow-[0_30px_60px_-20px_rgba(28,23,18,0.45)] lg:block"
          style={{ left: survol.x + 24, top: survol.y - 80 }}
        />
      )}

      <WaitlistModal target={liste} onClose={() => setListe(null)} />
      <ConferenceTourModal open={tournee} onClose={() => setTournee(false)} />
    </div>
  );
};

export default EvenementsPage;
