import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Navigate, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase';
import { useApp } from '../contexts/AppContext';
import { getEventParSlug, placesRestantes, enVente, type EventDoc } from '../firebase/firestore';
import { enDollars, avecTaxes } from '../firebase/billets';
import { Feuille, Atmosphere, Parallax, Seam } from '../components/motion/loeuvre';

/**
 * La page de vente d'un événement, fabriquée entièrement à partir de son
 * document Firestore (src/firebase/firestore.ts, EventDoc) : créer un
 * événement avec billetterie = true dans l'admin crée cette page sans une
 * ligne de code de plus. Le paiement passe par la fonction serveur
 * `creerSessionBillets`, qui écrit le billet au retour de Stripe.
 */

const ease = [0.16, 0.8, 0.24, 1] as const;
const GUT = 'px-[clamp(1.25rem,4vw,4.5rem)]';
const G12 = 'grid grid-cols-12 gap-x-[clamp(1rem,2.5vw,3rem)]';

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className,
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 28, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 1.0, ease, delay }}
    >
      {children}
    </motion.div>
  );
};

const Eyebrow: React.FC<{ children: React.ReactNode; on?: 'dark' | 'light' }> = ({ children, on = 'light' }) => (
  <p className={`font-sans text-[0.62rem] uppercase tracking-[0.28em] ${on === 'dark' ? 'text-brass' : 'text-brassInk'}`}>{children}</p>
);

const DrawRule: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.div
    aria-hidden
    className={`h-px bg-brass ${className}`}
    style={{ transformOrigin: 'left center' }}
    initial={{ scaleX: 0 }}
    whileInView={{ scaleX: 1 }}
    viewport={{ once: true, amount: 0.7 }}
    transition={{ duration: 1.2, ease, delay: 0.15 }}
  />
);

const EvenementVente: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { lang, isAdmin } = useApp();
  const fr = lang === 'FR';
  const apercu = new URLSearchParams(location.search).get('apercu') === '1';

  const [event, setEvent] = useState<EventDoc | null | undefined>(undefined);
  const [quantite, setQuantite] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!slug) return;
    getEventParSlug(slug).then(setEvent).catch(() => setEvent(null));
  }, [slug]);

  const restantes = event ? placesRestantes(event) : 0;
  const maxAchat = event ? Math.max(1, Math.min(event.maxParAchat || 6, restantes)) : 1;
  useEffect(() => { setQuantite(q => Math.min(Math.max(1, q), maxAchat)); }, [maxAchat]);

  const prixTotal = useMemo(() => (event?.prixCents || 0) * quantite, [event, quantite]);

  if (event === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="w-9 h-9 border-2 border-t-transparent border-brass rounded-full animate-spin" />
      </div>
    );
  }

  // Une administratrice en aperçu voit la page même non publiée; une
  // visiteuse ordinaire est renvoyée à la liste des événements.
  const peutVoir = !!event && (event.isPublished !== false || (isAdmin && apercu));
  if (!peutVoir) return <Navigate to="/evenements" replace />;
  const ev = event as EventDoc;

  const dateObj = new Date(ev.date);
  const dateStr = dateObj.toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const image = ev.imageHero || ev.imageUrl;
  const billetsOuverts = enVente(ev);
  const billetsFermes = !!ev.billetterie && !billetsOuverts;

  const acheter = async () => {
    if (!ev.id || busy) return;
    setBusy(true);
    setErreur('');
    try {
      const call = httpsCallable(getFunctions(app, 'us-central1'), 'creerSessionBillets');
      const res = await call({ eventId: ev.id, quantite });
      window.location.href = (res.data as { url: string }).url;
    } catch {
      setErreur(fr ? "Le paiement n'a pas pu démarrer. Réessayez dans un instant." : 'Payment could not start. Try again in a moment.');
      setBusy(false);
    }
  };

  return (
    <div className="bg-cream text-ink font-sans antialiased">
      {isAdmin && apercu && ev.isPublished === false && (
        <div className="sticky top-0 z-50 bg-brass px-5 py-2 text-center font-sans text-[0.68rem] uppercase tracking-[0.18em] text-espressoDeep">
          {fr ? "Aperçu administratrice — cette page n'est pas encore publiée." : 'Administrator preview — this page is not published yet.'}
        </div>
      )}

      {/* ─────────── FEUILLE 1 · HERO ─────────── */}
      <Feuille z={1} premiere>
        <section className="relative w-full overflow-hidden bg-espressoDeep">
          <div className="relative w-full min-h-[70vh] md:min-h-[80vh]">
            {image ? (
              <img src={image} alt={ev.title} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : null}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(22,16,10,0.92) 0%, rgba(22,16,10,0.74) 32%, rgba(22,16,10,0.32) 58%, transparent 78%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(22,16,10,0.32) 0%, transparent 30%, transparent 68%, rgba(22,16,10,0.5) 100%)' }} />
            <Atmosphere strength={0} vignette={false} />
            <div className="relative z-10 flex min-h-[70vh] items-end md:min-h-[80vh] md:items-center">
              <div className={`w-full ${GUT} ${G12} py-16 md:py-0`}>
                <motion.div className="col-span-12 md:col-span-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease }}>
                  <p className="font-sans text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.32em] text-brass mb-6">
                    {ev.isFeatured ? (fr ? 'Événement' : 'Event') : (fr ? 'Rendez-vous' : 'Gathering')}
                  </p>
                  <h1 className="font-serif font-medium text-ctext leading-[1.05] text-[clamp(2rem,4.6vw,4rem)] max-w-[20ch] line-clamp-2 [text-shadow:0_2px_30px_rgba(0,0,0,0.55)]">
                    {ev.title}
                  </h1>
                  {ev.subtitle && (
                    <p className="mt-5 font-serif italic text-[clamp(1.1rem,1.8vw,1.5rem)] text-ctextSoft max-w-[42ch]">{ev.subtitle}</p>
                  )}
                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-ctextSoft">
                    <span className="flex items-center gap-2 text-sm md:text-base"><i className="fa-solid fa-calendar-day text-brass" /> {dateStr}{ev.heure ? ` · ${ev.heure}` : ''}</span>
                    {(ev.adresse || ev.location) && (
                      <span className="flex items-center gap-2 text-sm md:text-base"><i className="fa-solid fa-location-dot text-brass" /> {ev.adresse || ev.location}</span>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </Feuille>

      {/* ─────────── FEUILLE 2 · ARGUMENTAIRE ─────────── */}
      {ev.argumentaire && ev.argumentaire.length > 0 && (
        <Feuille z={2}>
          <section className="relative bg-cream py-24 md:py-32">
            <Seam from="#16100a" height={90} />
            <div className={`relative w-full ${GUT} ${G12}`}>
              <Reveal className="col-span-12 md:col-span-7">
                <Eyebrow>{fr ? "À propos de cette rencontre" : 'About this gathering'}</Eyebrow>
                <DrawRule className="mt-5 w-24" />
                <div className="mt-8 space-y-6">
                  {ev.argumentaire.map((p, i) => (
                    <p key={i} className="font-sans text-[1.05rem] leading-[1.85] text-inkSoft max-w-[62ch]">{p}</p>
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        </Feuille>
      )}

      {/* ─────────── FEUILLE 3 · CE QUE VOTRE BILLET DONNE ─────────── */}
      {ev.inclus && ev.inclus.length > 0 && (
        <Feuille z={3}>
          <section className="relative bg-cream2 py-24 md:py-32">
            <div className={`w-full ${GUT}`}>
              <Reveal>
                <Eyebrow>{fr ? 'Votre billet' : 'Your ticket'}</Eyebrow>
                <h2 className="mt-4 font-serif font-medium text-ink leading-[1.05] text-[clamp(1.8rem,3.4vw,2.6rem)] max-w-[20ch]">
                  {fr ? 'Ce que votre billet vous donne' : 'What your ticket gives you'}
                </h2>
                <DrawRule className="mt-6 w-24" />
              </Reveal>
              <div className={`${G12} mt-12 gap-y-6`}>
                {ev.inclus.map((ligne, i) => (
                  <Reveal key={i} delay={Math.min(i * 0.06, 0.3)} className="col-span-12 md:col-span-6">
                    <p className="flex items-start gap-3 font-sans text-[1rem] leading-[1.7] text-ink">
                      <i className="fa-solid fa-check mt-1.5 text-brassInk" /> {ligne}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        </Feuille>
      )}

      {/* ─────────── FEUILLE 4 · ACHAT ─────────── */}
      <Feuille z={4}>
        <section className="relative bg-espressoDeep py-24 md:py-32">
          <Atmosphere strength={0.6} />
          <div className={`relative w-full ${GUT} ${G12}`}>
            <Reveal className="col-span-12 md:col-span-5">
              <Eyebrow on="dark">{fr ? 'Réserver votre place' : 'Reserve your seat'}</Eyebrow>
              <h2 className="mt-4 font-serif font-medium text-ctext leading-[1.05] text-[clamp(1.9rem,3.6vw,2.8rem)] max-w-[16ch]">
                {ev.title}
              </h2>
              <p className="mt-5 text-ctextSoft leading-[1.8] max-w-[46ch]">
                {dateStr}{ev.heure ? `, ${ev.heure}` : ''}{(ev.adresse || ev.location) ? ` — ${ev.adresse || ev.location}` : ''}.
              </p>
            </Reveal>

            <Reveal delay={0.1} className="col-span-12 md:col-span-6 md:col-start-7">
              <Parallax speed={0.05}>
                <div className="rounded-[15px] border border-brass/20 bg-espressoSoft p-8 md:p-10">
                  {billetsOuverts ? (
                    <>
                      <div className="flex items-baseline justify-between">
                        <p className="font-serif text-[clamp(1.8rem,3vw,2.4rem)] text-ctext">{enDollars(ev.prixCents!)}</p>
                        <p className="text-[0.7rem] uppercase tracking-widest text-ctextSoft">{fr ? 'avant taxes' : 'before tax'}</p>
                      </div>
                      <p className="mt-1 text-sm text-ctextSoft">
                        {fr ? `${enDollars(avecTaxes(ev.prixCents!))} taxes incluses, par billet.` : `${enDollars(avecTaxes(ev.prixCents!))} tax included, per ticket.`}
                      </p>

                      <p className="mt-6 text-[0.8rem] text-brass">
                        {restantes <= 1
                          ? (fr ? 'Il reste une place.' : 'One seat left.')
                          : (fr ? `Il reste ${restantes} places.` : `${restantes} seats left.`)}
                      </p>

                      <div className="mt-4 flex items-center gap-4">
                        <span className="text-sm text-ctextSoft">{fr ? 'Billets' : 'Tickets'}</span>
                        <div className="flex items-center gap-3 rounded-full border border-brass/30 px-2 py-1">
                          <button type="button" onClick={() => setQuantite(q => Math.max(1, q - 1))} disabled={quantite <= 1} aria-label={fr ? 'Retirer un billet' : 'Remove one ticket'} className="flex h-9 w-9 items-center justify-center rounded-full text-ctext hover:bg-brass/15 disabled:opacity-30">−</button>
                          <span className="w-6 text-center font-sans text-ctext tabular-nums">{quantite}</span>
                          <button type="button" onClick={() => setQuantite(q => Math.min(maxAchat, q + 1))} disabled={quantite >= maxAchat} aria-label={fr ? 'Ajouter un billet' : 'Add one ticket'} className="flex h-9 w-9 items-center justify-center rounded-full text-ctext hover:bg-brass/15 disabled:opacity-30">+</button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={acheter}
                        disabled={busy}
                        className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-brass px-8 py-4 font-sans text-[0.72rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright disabled:opacity-60 min-h-[44px]"
                      >
                        {busy
                          ? (fr ? 'Un instant…' : 'One moment…')
                          : (fr ? `Réserver — ${enDollars(avecTaxes(prixTotal))}` : `Reserve — ${enDollars(avecTaxes(prixTotal))}`)}
                      </button>
                      {erreur && <p className="mt-3 text-sm text-red-300">{erreur}</p>}
                      {ev.noteAchat && <p className="mt-5 text-[0.8rem] leading-relaxed text-ctextSoft/80">{ev.noteAchat}</p>}
                    </>
                  ) : billetsFermes ? (
                    <p className="font-serif text-[1.3rem] leading-snug text-ctext">
                      {fr ? 'Cet événement affiche complet. Toutes les places ont trouvé preneuse.' : 'This event is sold out. Every seat has found someone.'}
                    </p>
                  ) : ev.registrationLink ? (
                    <>
                      <p className="font-serif text-[1.2rem] leading-snug text-ctext mb-6">
                        {fr ? "L'inscription à cet événement se fait ailleurs." : 'Registration for this event happens elsewhere.'}
                      </p>
                      <a href={ev.registrationLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 rounded-full bg-brass px-8 py-4 font-sans text-[0.72rem] uppercase tracking-[0.18em] text-espressoDeep transition-colors duration-300 hover:bg-brassBright min-h-[44px]">
                        {fr ? "S'inscrire" : 'Register'} <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
                      </a>
                    </>
                  ) : (
                    <p className="font-serif text-[1.2rem] leading-snug text-ctext">
                      {fr ? "La réservation pour cet événement n'est pas encore ouverte." : 'Reservations for this event are not open yet.'}
                    </p>
                  )}
                </div>
              </Parallax>
            </Reveal>
          </div>
        </section>
      </Feuille>

      <div className={`bg-espressoDeep py-8 ${GUT}`}>
        <Link to="/evenements" className="text-[0.68rem] uppercase tracking-widest text-ctextSoft hover:text-brass">
          <i className="fa-solid fa-arrow-left mr-2" />{fr ? 'Tous les événements' : 'All events'}
        </Link>
      </div>
    </div>
  );
};

export default EvenementVente;
