import React, { useEffect, useRef } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { Lock } from '@phosphor-icons/react';
import { useApp } from '../contexts/AppContext';
import { getEventParSlug, enVente, placesRestantes, type EventDoc } from '../firebase/firestore';
import { enDollars } from '../firebase/billets';
import BandeauApercu from '../components/edit/BandeauApercu';
import RideauEntree from '../components/evenements/RideauEntree';
import BilletCarte from '../components/evenements/BilletCarte';
import EtiquetteNature from '../components/evenements/EtiquetteNature';
import { natureDe } from '../lib/evenements';
import {
  StyleV2, GOUTTIERE, Kicker, Masthead, TitreV2, SousTitreV2, LiensChapitres, Planche, LigneDefiler,
  LienSouligne, BoutonNoir, BoutonIvoire, TitreChapitre, Filet, Reveal, QuatriemeCouverture, useMotionV2,
} from '../components/v2/Magazine';

/**
 * Le programme d'une soirée, dans le langage « magazine crème » des pages V2 :
 * la ligne de tête, le titre sur deux lignes, la planche cadrée du lieu, puis
 * les chapitres (la soirée acte par acte, le lieu, le livre, le billet). La
 * page se fabrique entièrement à partir du document Firestore (EventDoc) et
 * le paiement passe toujours par creerSessionBillets.
 */

const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MOIS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** « Le lancement du troisième livre » → « Le lancement » / « du troisième livre ». Deux lignes, jamais plus. */
const deuxLignes = (titre: string): string[] => {
  if (titre.includes('\n')) return titre.split('\n').slice(0, 2);
  const mots = titre.replace(/\s+/g, ' ').trim().split(' ');
  if (mots.length <= 2) return [titre];
  const coupe = Math.floor(mots.length / 2);
  return [mots.slice(0, coupe).join(' '), mots.slice(coupe).join(' ')];
};

const EvenementVente: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { lang, isAdmin } = useApp();
  const fr = lang === 'FR';
  const apercu = new URLSearchParams(location.search).get('apercu') === '1';
  const root = useRef<HTMLDivElement>(null);

  const [event, setEvent] = React.useState<EventDoc | null | undefined>(undefined);
  useEffect(() => {
    if (!slug) return;
    getEventParSlug(slug).then(setEvent).catch(() => setEvent(null));
  }, [slug]);

  // Le mouvement du seuil part quand la page a son événement, pas avant.
  useMotionV2(root, !!event);

  if (event === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4efe6]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#9c7a44] border-t-transparent" />
      </div>
    );
  }

  // Une administratrice en aperçu voit la page même non publiée; une
  // visiteuse ordinaire est renvoyée au calendrier.
  const peutVoir = !!event && (event.isPublished !== false || (isAdmin && apercu));
  if (!peutVoir) return <Navigate to="/evenements" replace />;
  const ev = event as EventDoc;
  const enApercu = isAdmin && apercu && ev.isPublished === false;

  const [a, m, j] = ev.date.split('-');
  const jour = String(Number(j));
  const mois = fr ? MOIS_FR[Number(m) - 1] : MOIS_EN[Number(m) - 1];
  const dateLongue = new Date(Number(a), Number(m) - 1, Number(j)).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const image = ev.imageHero || ev.imageUrl || '';
  const nature = natureDe(ev);
  const ouverts = enVente(ev) || (enApercu && !!ev.billetterie && !!ev.prixCents);
  const restantes = placesRestantes(ev);
  const argumentaire = ev.argumentaire || [];
  const programme = ev.programme || [];
  const lieuTexte = ev.lieuTexte || [];
  const inclus = ev.inclus || [];
  const adresse = ev.adresse || ev.location || '';
  const itineraire = adresse ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}` : '';
  const chapitres: [string, string][] = [];
  if (argumentaire.length || programme.length) chapitres.push([fr ? 'La soirée' : 'The evening', '#soiree']);
  if (lieuTexte.length) chapitres.push([fr ? 'Le lieu' : 'The venue', '#lieu']);
  if (ev.encart?.titre) chapitres.push([fr ? 'Le livre' : 'The book', '#livre']);
  chapitres.push([fr ? 'Votre billet' : 'Your ticket', '#billet']);
  let numero = 0;
  const chapitre = () => `${fr ? 'Chapitre' : 'Chapter'} ${String(++numero).padStart(2, '0')}`;

  return (
    <div
      ref={root}
      className="relative min-h-screen w-full overflow-x-hidden bg-[#f4efe6] text-[#1c1712] antialiased"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      <StyleV2 />
      <RideauEntree cle={`evenement-${slug}`} mot={`${jour} ${mois} ${a}`} />

      {enApercu && (
        <BandeauApercu>
          {fr ? 'Aperçu administratrice : cette page n’est pas encore publiée.' : 'Administrator preview: this page is not published yet.'}
        </BandeauApercu>
      )}

      {/* ─────────── LE SEUIL ─────────── */}
      <section data-hero className={`relative flex w-full flex-col ${GOUTTIERE} pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(2rem,5vh,4rem)]`}>
        <Masthead gauche={<>N&deg; 05 &middot; {fr ? 'Les rendez-vous' : 'The gatherings'}</>} droite={<>{ev.location || 'Québec'} &middot; {a}</>} />

        <div className="mt-[clamp(2rem,5vh,3.5rem)]">
          <div data-fade className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Kicker>{ev.isFeatured ? (fr ? 'Lancement · Éditions de l’Homme' : 'Launch · Éditions de l’Homme') : (fr ? 'Rendez-vous' : 'Gathering')}</Kicker>
            {!ev.isFeatured && <EtiquetteNature nature={nature} lang={lang} />}
          </div>
          <TitreV2 lignes={deuxLignes(ev.title)} className="text-[clamp(2rem,7.6vw,7rem)] max-w-none lg:max-w-[16ch]" />
          {ev.subtitle && <SousTitreV2>{ev.subtitle}</SousTitreV2>}
          <LiensChapitres liens={chapitres} />
        </div>

        <Planche
          seuil
          className="mt-[clamp(2.5rem,6vh,4.5rem)]"
          src={image}
          alt={ev.location || ev.title}
          position="object-[50%_40%]"
          etiquette={ev.location || undefined}
          legende={<>{dateLongue}{ev.heure ? <> &middot; {ev.heure}</> : null}{ev.adresse ? <> &middot; {ev.adresse}</> : null}</>}
        />

        <LigneDefiler droite={chapitres.map(c => c[0]).join(' · ')} />
      </section>

      {/* ─────────── LA SOIRÉE, ACTE PAR ACTE ─────────── */}
      {(argumentaire.length > 0 || programme.length > 0) && (
        <section id="soiree" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#efe6d7] py-[clamp(6rem,15vh,11rem)]`}>
          <div className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="lg:sticky lg:top-28">
                <Reveal>
                  <Kicker className="mb-5">{chapitre()} · {fr ? 'La soirée' : 'The evening'}</Kicker>
                  <TitreChapitre className="max-w-[14ch]">{fr ? 'Ce qui vous attend, acte par acte' : 'What awaits you, act by act'}</TitreChapitre>
                  <Filet className="mt-7" />
                </Reveal>
                {image && (
                  <Reveal className="mt-12 hidden lg:block">
                    <Planche src={image} ratio="aspect-[4/5]" position="object-[42%_50%]" etiquette={ev.location || undefined} />
                  </Reveal>
                )}
              </div>
            </div>
            <div>
              {argumentaire.length > 0 && (
                <Reveal className="space-y-6">
                  {argumentaire.map((p, i) => (
                    <p key={i} className="max-w-[60ch] v2-serif font-light text-[clamp(1.15rem,1.7vw,1.45rem)] leading-[1.55] text-[#1c1712]">{p}</p>
                  ))}
                </Reveal>
              )}
              {programme.length > 0 && (
                <div className={argumentaire.length ? 'mt-14' : ''}>
                  {programme.map((acte, i) => (
                    <Reveal key={i} delay={Math.min(i * 0.06, 0.2)} className="grid grid-cols-12 gap-x-5 border-t border-[#1c1712]/12 py-9 md:py-11">
                      <p className="col-span-3 v2-serif font-light leading-none text-[#7d6330] text-[clamp(2.4rem,4.6vw,4.2rem)] md:col-span-2">{ROMAINS[i] || i + 1}</p>
                      <div className="col-span-9 md:col-span-10">
                        <h3 className="v2-serif font-light leading-[1.1] text-[#1c1712] text-[clamp(1.5rem,2.5vw,2.1rem)]">{acte.titre}</h3>
                        <p className="mt-3 max-w-[58ch] text-[1rem] leading-[1.85] text-[#3a2f23]">{acte.texte}</p>
                      </div>
                    </Reveal>
                  ))}
                  <span className="block h-px w-full bg-[#1c1712]/12" aria-hidden />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─────────── LE LIEU ─────────── */}
      {lieuTexte.length > 0 && (
        <section id="lieu" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#f4efe6] py-[clamp(6rem,15vh,11rem)]`}>
          <Reveal className="grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <Kicker className="mb-5">{chapitre()} · {fr ? 'Le lieu' : 'The venue'}</Kicker>
              <TitreChapitre className="max-w-[14ch]">{ev.location || (fr ? 'La salle' : 'The hall')}</TitreChapitre>
              {ev.adresse && <p className="mt-3 v2-serif font-light text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">{ev.adresse}</p>}
              <div className="mt-7 space-y-5">
                {lieuTexte.map((p, i) => <p key={i} className="max-w-[56ch] text-[1rem] leading-[1.85] text-[#3a2f23]">{p}</p>)}
              </div>
              {itineraire && <LienSouligne href={itineraire} externe className="mt-9">{fr ? 'Itinéraire' : 'Directions'}</LienSouligne>}
            </div>
            <Planche src={ev.lieuImage || image} ratio="aspect-[4/3]" alt={ev.location || ''} etiquette={fr ? 'Vieux-Lévis' : 'Old Lévis'} />
          </Reveal>
        </section>
      )}

      {/* ─────────── LE LIVRE ─────────── */}
      {ev.encart?.titre && (
        <section id="livre" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#efe6d7] py-[clamp(6rem,15vh,11rem)]`}>
          <Reveal>
            <div className="relative border border-[#9c7a44]/40 p-7 md:p-14">
              <span aria-hidden className="pointer-events-none absolute inset-3 border border-[#9c7a44]/20 md:inset-4" />
              <div className="relative grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <Kicker className="mb-5">{chapitre()} · {ev.encart.surtitre}</Kicker>
                  <h2 className="v2-serif font-light leading-[0.98] text-[#1c1712] text-[clamp(2.4rem,5.4vw,4.8rem)] max-w-[14ch]">{ev.encart.titre}</h2>
                  <Filet className="mt-8 w-20" />
                  <div className="mt-8 space-y-5">
                    {ev.encart.texte.map((p, i) => <p key={i} className="max-w-[56ch] text-[1rem] leading-[1.85] text-[#3a2f23]">{p}</p>)}
                  </div>
                </div>
                {/* Les deux premiers tomes, et le troisième sous scellés, comme sur la page Médias. */}
                <div className="flex items-end justify-center gap-4 lg:justify-end">
                  {(ev.encart.images || []).slice(0, 2).map((src) => (
                    <div key={src} className="relative w-[30%] max-w-[190px] overflow-hidden shadow-[0_18px_50px_rgba(28,23,18,0.18)]">
                      <span className="pointer-events-none absolute inset-0 z-10 border border-[#9c7a44]/30" aria-hidden />
                      <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="block aspect-[1/1.3] w-full object-cover" />
                    </div>
                  ))}
                  <div className="relative flex aspect-[1/1.3] w-[30%] max-w-[190px] flex-col items-center justify-center bg-[#34241a] text-[#f4efe6] shadow-[0_18px_50px_rgba(28,23,18,0.18)]">
                    <span className="pointer-events-none absolute inset-0 border border-[#9c7a44]/30" aria-hidden />
                    <Lock size={30} weight="light" className="text-[#9c7a44]/70" />
                    <span className="mt-4 text-[0.56rem] uppercase tracking-[0.22em] text-[#f4efe6]/70">{fr ? 'Tome III' : 'Volume III'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* ─────────── VOTRE BILLET ─────────── */}
      <section id="billet" className={`relative w-full ${GOUTTIERE} scroll-mt-24 bg-[#f4efe6] py-[clamp(6rem,15vh,11rem)]`}>
        <div className="grid items-start gap-x-[clamp(2rem,5vw,5rem)] gap-y-12 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <Kicker className="mb-5">{chapitre()} · {fr ? 'Votre billet' : 'Your ticket'}</Kicker>
            <TitreChapitre className="max-w-[16ch]">{fr ? 'Ce que votre billet vous donne' : 'What your ticket gives you'}</TitreChapitre>
            <p className="mt-3 v2-serif font-light text-[clamp(1.1rem,2vw,1.5rem)] text-[#7d6330]">
              {ouverts
                ? (restantes <= 1 ? (fr ? 'Il reste une place.' : 'One seat left.') : (fr ? `Il reste ${restantes} places.` : `${restantes} seats left.`))
                : (fr ? 'La réservation ouvre bientôt.' : 'Reservations open soon.')}
            </p>
            <Filet className="mt-7" />
            {inclus.length > 0 && (
              <ol className="mt-8 max-w-[52ch] border-b border-[#1c1712]/12">
                {inclus.map((ligne, i) => (
                  <li key={i} className="flex items-baseline gap-5 border-t border-[#1c1712]/12 py-5">
                    <span className="w-8 shrink-0 v2-serif font-light text-[1.5rem] leading-none text-[#7d6330]">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[1rem] leading-[1.7] text-[#3a2f23]">{ligne}</span>
                  </li>
                ))}
              </ol>
            )}
          </Reveal>
          <Reveal delay={0.1}>
            <BilletCarte ev={ev} lang={lang} apercu={enApercu} />
          </Reveal>
        </div>
      </section>

      {/* ─────────── LA QUATRIÈME DE COUVERTURE ─────────── */}
      <QuatriemeCouverture
        citation={`«\u00A0${ev.subtitle || ev.title}\u00A0»`}
        note={ev.credit ? <span className="normal-case tracking-normal text-[0.7rem] text-[#f4efe6]/50">{ev.credit}</span> : undefined}
      >
        {ev.billetterie && ouverts && <BoutonIvoire href="#billet">{fr ? 'Réserver ma place' : 'Reserve my seat'}</BoutonIvoire>}
        <a href="/evenements" className="inline-flex items-center gap-2.5 v2-serif text-lg font-light text-[#f4efe6]/80 transition-colors duration-300 hover:text-[#c8a86a]">
          {fr ? 'Tous les rendez-vous' : 'All gatherings'}
        </a>
      </QuatriemeCouverture>

      {/* Sur mobile, le bouton reste sous le pouce. */}
      {ev.billetterie && ouverts && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#9c7a44]/30 bg-[#f4efe6]/92 px-4 py-3 backdrop-blur-md md:hidden">
          <BoutonNoir href="#billet" className="w-full !justify-between">
            <span>{fr ? 'Réserver ma place' : 'Reserve my seat'}</span>
            <span className="v2-serif text-[1.05rem] normal-case tracking-normal">{enDollars(ev.prixCents!)}</span>
          </BoutonNoir>
        </div>
      )}
    </div>
  );
};

export default EvenementVente;
