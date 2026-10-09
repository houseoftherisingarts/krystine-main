import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { addNewsletterSubscriber } from '../firebase/firestore';
import { trackLead } from '../lib/track';
import {
  DIMANCHES, ETIQUETTES_DIMANCHES, SERIE_DIMANCHES, SIGNATURE_SERIE, lienAmie, lienAgenda,
  SCENES, DONS, BIO, PAROLES, CHEMIN, QUESTIONS,
} from '../lib/dimanches';
import { StyleV2, GOUTTIERE, TitreV2, SousTitreV2, Planche, Filet, Reveal, CarteVerte, useMotionV2 } from '../components/v2/Magazine';

/**
 * Les Dimanches d'Origine (/dimanches) : trois directs ouverts à toutes, une
 * seule inscription pour les trois. Le formulaire écrit par la porte commune
 * (inscrireInfolettre) avec les étiquettes de la série et la question
 * facultative; la confirmation, les rappels et la
 * rediffusion partent des documents `liveEvents` des trois dimanches. Après
 * l'inscription, la carte offre le lien personnel « Inviter une amie »
 * (partage natif au téléphone); `?inviter=<fiche>` ouvre directement ce
 * partage. Canon crème V2, aucun aplat brun, une seule carte vert profond.
 * Lisible de 45 à 70 ans : corps de 17 px et plus, boutons de 48 px et plus.
 */

const TZ = 'America/Toronto';
const ease = [0.16, 0.8, 0.24, 1] as const;

const jourDe = (iso: string) =>
  new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })
    .format(new Date(iso)).replace(/^(\S+) 1 /, '$1 1er ');
const heureDe = (iso: string, tz: string) =>
  new Intl.DateTimeFormat('fr-CA', { hour: 'numeric', minute: '2-digit', timeZone: tz })
    .format(new Date(iso)).replace(/[  ]/g, ' ').replace(/ h 00$/, ' h');
const capitale = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ROMAINS = ['I', 'II', 'III'];

// Les gestes de la page, à 48 px et plus (lisibles de 45 à 70 ans).
const BOUTON_NOIR = 'group inline-flex min-h-[52px] items-center justify-center gap-2.5 bg-[#1c1712] px-8 py-3.5 text-[0.82rem] uppercase tracking-[0.16em] text-[#f4efe6] transition-[background-color,transform] duration-200 hover:bg-[#7d6330] active:scale-[0.97]';
const BOUTON_CUIVRE = 'inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#BA7B39] px-7 py-3 text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-[#1c1712] transition-[background-color,transform] duration-200 hover:bg-[#d9a05b] active:scale-[0.97] disabled:opacity-60';

/** La petite ligne au-dessus d'un titre, à 13 px au moins. */
const Accroche: React.FC<{ children: React.ReactNode; className?: string; sombre?: boolean }> = ({ children, className = '', sombre }) => (
  <p className={`text-[0.82rem] uppercase tracking-[0.22em] ${sombre ? 'text-[#d9a05b]' : 'text-[#7d6330]'} ${className}`}>{children}</p>
);
const Titre: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h2 className={`v2-serif font-light leading-[1.05] text-[clamp(2.1rem,4.6vw,3.5rem)] text-[#1c1712] ${className}`}>{children}</h2>
);
const Corps: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-[1.09rem] leading-[1.75] text-[#2e261d] md:text-[1.15rem] ${className}`}>{children}</p>
);
const VersInscription: React.FC<{ className?: string }> = ({ className = '' }) => (
  <a href="#inscription" className={`${BOUTON_NOIR} ${className}`}>Réserver ma place <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span></a>
);

/** Le partage du lien personnel : natif au téléphone, copie partout. */
const Inviter: React.FC<{ abonneId: string }> = ({ abonneId }) => {
  const lien = lienAmie(abonneId);
  const [copie, setCopie] = useState(false);
  const peutPartager = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const partager = async () => {
    try {
      await navigator.share({
        title: SIGNATURE_SERIE,
        text: 'Trois matins en direct avec Krystine St-Laurent, offerts sur inscription : lire ce que le corps exprime, trier ce qui nourrit, ancrer les gestes qui tiennent.',
        url: lien,
      });
    } catch { /* partage fermé : rien à faire */ }
  };
  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); window.setTimeout(() => setCopie(false), 2400); }
    catch { window.prompt('Copiez votre lien :', lien); }
  };
  return (
    <div>
      <Accroche sombre>Inviter une amie</Accroche>
      <p className="mt-3 max-w-[46ch] text-[1.06rem] leading-[1.75] text-[#EEE7DB]/85">
        Une amie aimerait être là? Voici votre lien personnel, à lui transmettre comme il vous plaira.
      </p>
      {/* Le lien se coupe seulement après un séparateur (/, ?, &, =), jamais en plein mot. */}
      <p className="mt-4 rounded-[8px] border border-[#EEE7DB]/15 bg-[#1c2420]/40 px-4 py-3 text-[0.9rem] leading-[1.5] text-[#EEE7DB]/75 [overflow-wrap:anywhere]">
        {lien.split(/(?<=[/?&=])/).map((m, i) => <React.Fragment key={i}>{m}<wbr /></React.Fragment>)}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {peutPartager && <button type="button" onClick={partager} className={BOUTON_CUIVRE}>Partager le lien</button>}
        <button type="button" onClick={copier} className={peutPartager ? `${BOUTON_CUIVRE} border border-[#BA7B39]/70 bg-transparent text-[#EEE7DB] hover:bg-[#EEE7DB]/10` : BOUTON_CUIVRE}>
          <span aria-live="polite">{copie ? 'Lien copié' : 'Copier le lien'}</span>
        </button>
      </div>
    </div>
  );
};

const DimanchesPage: React.FC = () => {
  // Adresse connue de l'équipe seulement tant que Krystine n'a pas dit « go » : hors de Google.
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    const cree = !meta;
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'robots'); document.head.appendChild(meta); }
    const avant = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');
    return () => { if (cree) meta?.remove(); else if (avant) meta?.setAttribute('content', avant); };
  }, []);
  const root = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { search } = useLocation();
  const inviter = useMemo(() => new URLSearchParams(search).get('inviter')?.trim().slice(0, 60) || '', [search]);
  useMotionV2(root);

  const [prenom, setPrenom] = useState('');
  const [courriel, setCourriel] = useState('');
  const [question, setQuestion] = useState('');
  const [pot, setPot] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [abonneId, setAbonneId] = useState<string | null>(inviter || null);
  const [vientDeSInscrire, setVientDeSInscrire] = useState(false);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courriel.trim() || envoi) return;
    setEnvoi(true); setErreur(null);
    try {
      const res = await addNewsletterSubscriber({
        email: courriel.trim(),
        firstName: prenom.trim() || undefined,
        question: question.trim().slice(0, 1000) || undefined,
        source: SERIE_DIMANCHES,
        tags: ETIQUETTES_DIMANCHES,
        site: pot,
      });
      trackLead(SERIE_DIMANCHES);
      setAbonneId((res && res.id) || '');
      setVientDeSInscrire(true);
    } catch (err: unknown) {
      setErreur((err as { message?: string })?.message || 'L’inscription n’a pas fonctionné. Reprenez dans un instant.');
    } finally { setEnvoi(false); }
  };

  const champ = 'w-full rounded-[8px] border border-transparent bg-[#f6f1e7] px-4 py-3.5 text-[1.06rem] text-[#1c1712] placeholder:text-[#1c1712]/55 outline-none transition-colors focus:border-[#BA7B39]';
  const etiquette = 'text-[0.82rem] uppercase tracking-[0.18em] text-[#e2b67c]';
  const entree = (d: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 1.1, delay: d, ease },
  });
  const section = `relative w-full ${GOUTTIERE} scroll-mt-24 py-[clamp(4.5rem,12vh,9rem)]`;

  return (
    <div ref={root} className="relative min-h-screen w-full overflow-x-hidden bg-[#f4efe6] text-[#1c1712] antialiased" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <StyleV2 />

      {/* ─────────── 1 · LE PREMIER ÉCRAN : tout ce qu'il faut pour décider, et le bouton ─────────── */}
      <section data-hero className={`relative w-full ${GOUTTIERE} pt-[clamp(6.5rem,12vh,9rem)] pb-[clamp(3rem,7vh,5rem)]`}>
        <div className="grid items-center gap-x-[clamp(2rem,4vw,4.5rem)] gap-y-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Accroche className="mb-5"><span data-fade className="inline-block">{SIGNATURE_SERIE}</span></Accroche>
            <TitreV2 lignes={['Ce que le corps', 'sait déjà']} className="max-w-none text-[clamp(2.7rem,6.2vw,6.4rem)]" />
            <SousTitreV2 className="mt-5 max-w-[34ch]">
              Trois matins en direct avec <span className="whitespace-nowrap">Krystine St-Laurent</span> pour lire ce que le corps exprime, trier ce qui nourrit et repartir avec des gestes qui tiennent.
            </SousTitreV2>
            <div data-fade className="mt-7 border-t border-[#1c1712]/15 pt-5">
              <p className="v2-serif text-[clamp(1.2rem,1.9vw,1.45rem)] leading-[1.35] text-[#1c1712]">
                {DIMANCHES.map((d, i) => <React.Fragment key={d.id}>{i > 0 && ' · '}<span className="whitespace-nowrap">{capitale(jourDe(d.iso))}</span></React.Fragment>)}
              </p>
              <p className="mt-2 text-[1.06rem] leading-[1.6] text-[#2e261d]">
                9&nbsp;h au Québec · {heureDe(DIMANCHES[0].iso, 'Europe/Paris')} en France et en Belgique le 25&nbsp;octobre, {heureDe(DIMANCHES[1].iso, 'Europe/Paris')} ensuite
              </p>
              <p className="mt-1 text-[1.06rem] leading-[1.6] text-[#7d6330]">Offert, sur inscription · 75 à 90&nbsp;minutes</p>
            </div>
            <div data-fade className="mt-7"><VersInscription /></div>
          </div>
          <Planche
            seuil
            src="/conferences/krystine-scene-haut.webp"
            alt="Krystine St-Laurent sur scène, qui enseigne avec le sourire"
            ratio="aspect-[4/3]"
            position="object-[62%_30%]"
            etiquette="Le dimanche, 9 h"
          />
        </div>
      </section>

      {/* ─────────── 2 · VOUS VOUS RECONNAÎTREZ SI… ─────────── */}
      <section className={`${section} bg-[#efe6d7]`}>
        <Reveal className="max-w-[760px]">
          <Accroche className="mb-4">Pour qui</Accroche>
          <Titre>Vous vous reconnaîtrez si…</Titre>
          <Filet className="mt-6" />
        </Reveal>
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 md:grid-cols-2">
          {SCENES.map((s, i) => (
            <Reveal key={s.titre} delay={i * 0.08} className="border-t border-[#1c1712]/20 pt-6">
              <p className="v2-serif text-[clamp(1.5rem,2.4vw,1.9rem)] font-light leading-[1.2]">{s.titre}</p>
              <Corps className="mt-3 max-w-[52ch]">{s.texte}</Corps>
            </Reveal>
          ))}
        </div>
        <Reveal><Corps className="mt-[clamp(2.5rem,6vh,4rem)] max-w-[60ch]">Ces trois matins vous donnent une manière simple de lire ce qui se passe, pour choisir vous-même ce qui vous convient.</Corps></Reveal>
      </section>

      {/* ─────────── 3 · LES TROIS MATINS ─────────── */}
      <section id="dates" className={`${section} bg-[#f4efe6]`}>
        <Reveal className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <Accroche className="mb-4">Les trois matins</Accroche>
            <Titre>Trois dimanches, un même fil</Titre>
            <Filet className="mt-6" />
          </div>
          <Corps className="max-w-[56ch]">Chaque matin dure de 75 à 90 minutes : l’accueil, l’enseignement, une expérience à vivre ensemble, vos questions, puis une méditation d’environ quinze minutes pour clore. Venez aux trois, ou seulement à celui qui vous appelle.</Corps>
        </Reveal>
        <ol className="mt-[clamp(2.5rem,6vh,4rem)] border-t border-[#1c1712]/20">
          {DIMANCHES.map((d, i) => (
            <li key={d.id}>
              <Reveal delay={i * 0.06} className="grid gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-4 border-b border-[#1c1712]/20 py-[clamp(2rem,5vh,3rem)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
                <div>
                  <p className="text-[0.82rem] uppercase tracking-[0.2em] text-[#7d6330]">{ROMAINS[i]} · {capitale(jourDe(d.iso))}</p>
                  <p className="mt-2 v2-serif font-light text-[clamp(2.6rem,5.5vw,4.2rem)] leading-[0.95] tracking-[0.04em]">{d.mot}</p>
                  <p className="mt-3 text-[1rem] text-[#2e261d]">9&nbsp;h au Québec · {heureDe(d.iso, 'Europe/Paris')} en Europe</p>
                </div>
                <div className="grid gap-4">
                  <p className="v2-serif text-[clamp(1.4rem,2.2vw,1.75rem)] font-light leading-[1.25]">« {d.question} »</p>
                  <Corps>{d.vivrons}</Corps>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ─────────── 4 · CE QUE L'INSCRIPTION VOUS DONNE ─────────── */}
      <section className={`${section} bg-[#efe6d7]`}>
        <Reveal className="max-w-[760px]">
          <Accroche className="mb-4">Avec votre inscription</Accroche>
          <Titre>Ce que l’inscription vous donne</Titre>
          <Filet className="mt-6" />
        </Reveal>
        <ul className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {DONS.map((d, i) => (
            <li key={d.titre}>
              <Reveal delay={(i % 5) * 0.05} className="h-full rounded-[12px] border border-[#9c7a44]/30 bg-[#faf6ee] p-6">
                <p className="text-[0.82rem] tabular-nums text-[#BA7B39]">0{i + 1}</p>
                <p className="mt-2 v2-serif text-[1.45rem] font-light leading-[1.2] lg:min-h-[2.4em]">{d.titre}</p>
                <p className="mt-2 text-[1.06rem] leading-[1.65] text-[#2e261d]">{d.texte}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* ─────────── 5 · QUI VOUS ACCOMPAGNE ─────────── */}
      <section className={`${section} bg-[#f4efe6]`}>
        <div className="grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal><Planche src="/podcast/krystine.jpg" alt="Krystine St-Laurent, un livre ouvert sur les genoux" ratio="aspect-square" position="object-top" etiquette="Krystine St-Laurent" /></Reveal>
          <Reveal>
            <Accroche className="mb-4">Qui vous accompagne</Accroche>
            <Titre>Krystine St-Laurent</Titre>
            <Filet className="mt-6" />
            <Corps className="mt-6 max-w-[56ch]">{BIO}</Corps>
          </Reveal>
        </div>
      </section>

      {/* ─────────── 6 · LEURS PAROLES ─────────── */}
      <section className={`${section} bg-[#efe6d7]`}>
        <Reveal className="max-w-[760px]">
          <Accroche className="mb-4">Elles l’ont vécu</Accroche>
          <Titre>Les mots de participantes</Titre>
          <Filet className="mt-6" />
        </Reveal>
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-x-[clamp(2rem,4vw,4rem)] gap-y-10 lg:grid-cols-3">
          {PAROLES.map((p, i) => (
            <Reveal key={p.prenom} delay={i * 0.08}>
              <figure className="border-t border-[#BA7B39]/60 pt-6">
                <blockquote className="v2-serif text-[clamp(1.3rem,1.9vw,1.55rem)] font-light leading-[1.4]">« {p.texte} »</blockquote>
                <figcaption className="mt-4 text-[0.95rem] text-[#7d6330]">{p.prenom}, cohorte fondatrice</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────── 7 · ET ENSUITE ? ─────────── */}
      <section className={`${section} bg-[#f4efe6]`}>
        <Reveal className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <Accroche className="mb-4">Et ensuite ?</Accroche>
            <Titre>Une suite, si vous la voulez</Titre>
          </div>
          <Corps className="max-w-[56ch]">Les inscriptions à EXPÉRIENCE ORIGINE 2 ouvrent le 1er novembre, pour un départ le 10 janvier 2027. Nous vous en parlerons pendant ces matins, et vous resterez libre d’y aller ou non : ces trois dimanches se suffisent à eux-mêmes.</Corps>
        </Reveal>
      </section>

      {/* ─────────── 8 · L'INSCRIPTION (la seule carte sombre) ─────────── */}
      <section id="inscription" className={`${section} bg-[#efe6d7]`}>
        <div className="grid items-start gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <Accroche className="mb-4">Réserver ma place</Accroche>
            <Titre className="max-w-[14ch]">Une inscription, trois dimanches</Titre>
            <Filet className="mt-6" />
            <p className="mt-7 text-[0.82rem] uppercase tracking-[0.18em] text-[#7d6330]">Après votre clic</p>
            <ol className="mt-4 grid gap-3">
              {CHEMIN.map((c, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] gap-2">
                  <span className="v2-serif text-[1.25rem] leading-[1.5] text-[#BA7B39]">{i + 1}</span>
                  <Corps>{c}</Corps>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal>
            {/* overflow-clip : le halo de la carte déborde à droite, et un défilement programmatique (focus) décalait tout le contenu. */}
            <CarteVerte className="overflow-clip">
              <div className="p-[clamp(1.5rem,4vw,3rem)]">
                {abonneId === null ? (
                  <form onSubmit={envoyer} className="grid gap-5">
                    <input type="text" name="site" value={pot} onChange={e => setPot(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className={etiquette}>Prénom</span>
                        <input type="text" autoComplete="given-name" value={prenom} onChange={e => setPrenom(e.target.value)} className={champ} placeholder="Votre prénom" />
                      </label>
                      <label className="grid gap-2">
                        <span className={etiquette}>Courriel</span>
                        <input type="email" required autoComplete="email" value={courriel} onChange={e => setCourriel(e.target.value)} className={champ} placeholder="Votre courriel" />
                      </label>
                    </div>
                    <label className="grid gap-2">
                      <span className={etiquette}>Quelle question aimeriez-vous que nous abordions ? <span className="normal-case tracking-normal text-[#EEE7DB]/70">(facultatif)</span></span>
                      <textarea rows={3} maxLength={1000} value={question} onChange={e => setQuestion(e.target.value)} className={`${champ} resize-none`} placeholder="Votre question" />
                    </label>
                    <button type="submit" disabled={envoi} className={`${BOUTON_CUIVRE} mt-1 w-full`}>{envoi ? 'Un instant…' : 'Réserver ma place'}</button>
                    {erreur && <p role="alert" className="text-[1rem] text-[#f0b9a0]">{erreur}</p>}
                    <div>
                      <p className="text-[1.06rem] leading-[1.6] text-[#EEE7DB]/90">Une seule inscription vous garde une place pour les trois dimanches.</p>
                      {/* Sur sa propre ligne, plus petite (0,8 fois) et à 70 % (Krystine, 8 oct. 2026). */}
                      <p className="mt-1 block text-[0.85rem] leading-[1.6] text-[#EEE7DB] opacity-70">Désabonnement en un clic. Votre adresse n’est jamais revendue.</p>
                    </div>
                  </form>
                ) : (
                  <div role="status" aria-live="polite">
                    <motion.p {...entree(0)} className={etiquette}>{vientDeSInscrire ? 'Inscription reçue' : 'Votre lien d’invitation'}</motion.p>
                    <motion.h3 {...entree(0.1)} className="mt-4 v2-serif font-light text-[clamp(1.9rem,3.4vw,2.7rem)] leading-[1.05]">
                      {vientDeSInscrire ? 'Votre place est réservée' : 'Invitez une amie'}
                    </motion.h3>
                    <motion.p {...entree(0.2)} className="mt-4 max-w-[46ch] text-[1.06rem] leading-[1.75] text-[#EEE7DB]/85">
                      {vientDeSInscrire
                        ? 'Un courriel de confirmation arrive dans votre boîte. S’il tarde, regardez dans les courriels indésirables.'
                        : 'Votre place est déjà réservée pour les trois dimanches. Ce lien permet à une amie de s’inscrire à son tour, si elle le souhaite.'}
                    </motion.p>
                    {vientDeSInscrire && (
                      <motion.div {...entree(0.25)} className="mt-6">
                        <p className={etiquette}>Ajouter à mon agenda</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {DIMANCHES.map(d => (
                            <a key={d.id} href={lienAgenda(d)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center rounded-full border border-[#EEE7DB]/30 px-5 text-[0.95rem] text-[#EEE7DB] transition-colors hover:bg-[#EEE7DB]/10">{d.mot} · {jourDe(d.iso).replace(/^dimanche /, '')}</a>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    {abonneId && (
                      <motion.div {...entree(0.3)} className="mt-8 border-t border-[#EEE7DB]/15 pt-7">
                        <Inviter abonneId={abonneId} />
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </CarteVerte>
          </Reveal>
        </div>
      </section>

      {/* ─────────── 9 · PETITES QUESTIONS ─────────── */}
      <section className={`${section} bg-[#f4efe6]`}>
        <div className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <Reveal>
          <Accroche className="mb-4">Petites questions</Accroche>
          <Titre>Avant de vous inscrire</Titre>
          <Filet className="mt-6" />
        </Reveal>
        <div className="border-t border-[#1c1712]/20">
          {QUESTIONS.map(q => (
            <details key={q.q} className="group border-b border-[#1c1712]/20">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 v2-serif text-[clamp(1.25rem,2vw,1.5rem)] font-light [&::-webkit-details-marker]:hidden">
                {q.q}
                <span aria-hidden className="text-[1.4rem] text-[#BA7B39] transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <Corps className="max-w-[62ch] pb-6">{q.r}</Corps>
            </details>
          ))}
        </div>
        </div>
      </section>

      {/* ─────────── 10 · LA CITATION, sur crème (jamais d'aplat brun) ─────────── */}
      <section className={`relative w-full bg-[#efe6d7] ${GOUTTIERE} py-[clamp(5rem,12vh,9rem)]`}>
        <Reveal className="mx-auto max-w-[860px] text-center">
          <span className="mx-auto mb-10 block h-px w-16 bg-[#BA7B39]" aria-hidden />
          <p className="v2-serif font-light text-[clamp(1.6rem,3.6vw,2.8rem)] leading-[1.24] text-[#1c1712]">« Le corps porte le même langage que la nature, il ne demande qu’à être écouté. »</p>
          <p className="mt-5 text-[0.82rem] uppercase tracking-[0.22em] text-[#7d6330]">Krystine St-Laurent</p>
          <div className="mt-10 flex justify-center"><VersInscription /></div>
        </Reveal>
      </section>
    </div>
  );
};

export default DimanchesPage;
