import React, { useEffect, useMemo, useState, useRef } from 'react';
import EspaceGroupe from '../components/communaute/EspaceGroupe';
import { suivreLiveEnCours, type LiveEnCours } from '../firebase/lives';
import { PORTES, porteDuMois, foyerOuvert, DEBUT_LABEL } from './foyer/portesData';
import { urlDeDocumentLecon, poserQuestion, suivreQuestions, repondreQuestion, type QuestionLecon } from '../firebase/formations';
import { suivreMesCadeaux, type Cadeau } from '../firebase/cadeaux';
import CadeauCarte from '../components/client/CadeauCarte';
import { Navigate, useParams, Link } from 'react-router-dom';
import {
  getFormation, getLecons, getProgression, marquerLecon, aAchete,
  acheterFormation, urlDeLecon,
  type Formation, type Lecon,
} from '../firebase/formations';
import { useAuth, useUI } from '../contexts/AppContext';
import { getMember } from '../firebase/firestore';
import TexteLecon from '../lib/texteLecon';

// La fiche d'un cours et son lecteur, sur le patron de l'Académie Zéro
// Limite : liste des leçons et progression à gauche, contenu à droite,
// bouton Suivant, marquer comme terminée. L'accès au fichier passe par le
// serveur (URL signée après vérification de l'achat).

const ICONES: Record<Lecon['type'], string> = {
  video: 'fa-circle-play', audio: 'fa-music', pdf: 'fa-file-pdf', fichier: 'fa-file', texte: 'fa-align-left',
};

// Une leçon rattachée à une porte reste verrouillée tant que cette porte
// n'est pas ouverte (le mois en cours ou un mois déjà passé du cycle), comme
// le drip de Kajabi. L'admin voit tout.
const rangPorte = (n?: string) => (n ? PORTES.findIndex(p => p.n === n) : -1);

const CoursDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { user, isAdmin, setSignInOpen } = useAuth();
  const { lang } = useUI();
  const [formation, setFormation] = useState<Formation | null>(null);
  const [replies, setReplies] = useState<Record<string, boolean>>({});
  const [lecons, setLecons] = useState<Lecon[]>([]);
  const [achete, setAchete] = useState(false);
  const [verifAcces, setVerifAcces] = useState(true);   // le temps de savoir si la personne possède le cours
  const [accesVie, setAccesVie] = useState(false);
  // Les petits sons des portes (hover) : le son de survol du Festival
  // Médiéval (orb/sfx/hover.mp3) pour l'ouverte, le petit verrou maison pour
  // les barrées. Volumes très discrets.
  const ambiance = useRef<HTMLAudioElement | null>(null);
  const [ambianceJoue, setAmbianceJoue] = useState(false);
  const basculerAmbiance = () => {
    if (!ambiance.current) {
      ambiance.current = new Audio('/foyer/sons/ambiance-feu.mp3');
      ambiance.current.loop = true;
      ambiance.current.volume = 0.18;
    }
    if (ambianceJoue) { ambiance.current.pause(); setAmbianceJoue(false); }
    else { void ambiance.current.play().then(() => setAmbianceJoue(true)).catch(() => {}); }
  };
  useEffect(() => () => { ambiance.current?.pause(); }, []);
  const sonFeu = useRef<HTMLAudioElement | null>(null);
  const sonVerrou = useRef<HTMLAudioElement | null>(null);
  const jouerSon = (ouverte: boolean) => {
    if (!sonFeu.current) { sonFeu.current = new Audio('/foyer/sons/porte-feu.mp3'); sonFeu.current.volume = 0.12; }
    if (!sonVerrou.current) { sonVerrou.current = new Audio('/foyer/sons/porte-verrou.m4a'); sonVerrou.current.volume = 0.15; }
    const el = ouverte ? sonFeu.current : sonVerrou.current;
    try { el.currentTime = 0; void el.play(); } catch { /* geste requis */ }
  };
  const [live, setLive] = useState<LiveEnCours | null>(null);
  useEffect(() => suivreLiveEnCours(setLive), []);
  const [terminees, setTerminees] = useState<Record<string, boolean>>({});
  // La dernière leçon ouverte, pour y revenir d'emblée à la prochaine visite.
  const [derniere, setDerniere] = useState<string | null>(null);
  const [progressionLue, setProgressionLue] = useState(false);
  const [courante, setCourante] = useState<Lecon | null>(null);
  // L'aperçu d'un PDF de la leçon, ouvert dans un volet à droite.
  const [apercuPdf, setApercu] = useState<{ nom: string; url: string } | null>(null);
  // Un cadeau de Krystine pour cette formation, s'il y en a un : il remplace le bouton d'achat.
  const [cadeaux, setCadeaux] = useState<Cadeau[]>([]);
  useEffect(() => (user ? suivreMesCadeaux(user.uid, setCadeaux) : undefined), [user]);
  const cadeau = cadeaux.find(c => c.formationId === id) || null;
  const [urlCourante, setUrlCourante] = useState('');
  const [chargeLecon, setChargeLecon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paiement, setPaiement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getFormation(id), getLecons(id)])
      .then(([f, ls]) => { setFormation(f); setLecons(ls); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !id) { setAchete(false); setAccesVie(false); setVerifAcces(false); return; }
    setVerifAcces(true);
    aAchete(user.uid, id).then(setAchete).catch(() => {}).finally(() => setVerifAcces(false));
    getMember(user.uid).then(m => setAccesVie(!!m?.accesVie)).catch(() => {});
    setProgressionLue(false);
    getProgression(user.uid, id).then(p => {
      setTerminees(p.terminees || {});
      setDerniere((p as { derniereLecon?: string }).derniereLecon || null);
    }).catch(() => {}).finally(() => setProgressionLue(true));
  }, [user, id]);

  // Le contenu s'ouvre à qui a acheté (ou reçu) la formation. L'admin voit
  // la même barrière que tout le monde; son aperçu passe par ?apercu (le
  // bouton « Aperçu » de l'admin), jamais par défaut.
  const apercu = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('apercu');
  const accessible = useMemo(
    () => achete || accesVie || (formation ? !formation.paywall : false) || (isAdmin && apercu),
    [isAdmin, apercu, achete, accesVie, formation],
  );

  // Avant le 1er octobre 2026, aucune porte n'est ouverte : tout reste barré.
  const ouvert = foyerOuvert();
  const porteOuverteRang = ouvert ? rangPorte(porteDuMois().n) : -1;
  const verrouillee = (l: Lecon) => !isAdmin && ((id === 'foyer' && !ouvert) || rangPorte(l.mois) > porteOuverteRang);

  // La page s'ouvre d'elle-même : sur la dernière leçon commencée, sinon sur
  // la première leçon ouverte (l'introduction). Plus de « choisissez une leçon ».
  useEffect(() => {
    if (courante || !accessible || lecons.length === 0 || (user && !progressionLue)) return;
    const cible = (derniere && lecons.find(l => l.id === derniere && !verrouillee(l))) || lecons.find(l => !verrouillee(l));
    if (cible) void ouvrir(cible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courante, accessible, lecons, derniere, progressionLue, user]);

  const ouvrir = async (l: Lecon) => {
    if (verrouillee(l)) return;
    setCourante(l); setUrlCourante(''); setErreur(null);
    if (user) marquerLecon(user.uid, id, l.id, terminees[l.id] || false).catch(() => {});
    // Leçon sans fichier média : seul le texte s'affiche, pas d'appel serveur.
    if (!l.chemin) { setChargeLecon(false); return; }
    setChargeLecon(true);
    try {
      setUrlCourante(await urlDeLecon(id, l.id));
    } catch {
      setErreur(lang === 'FR' ? 'Cette leçon n\'a pas pu se charger.' : 'This lesson could not load.');
    } finally { setChargeLecon(false); }
  };

  const basculerTerminee = async (l: Lecon) => {
    if (!user) return;
    const v = !terminees[l.id];
    setTerminees(t => ({ ...t, [l.id]: v }));
    await marquerLecon(user.uid, id, l.id, v).catch(() => {});
  };

  const suivante = () => {
    if (!courante) return;
    const i = lecons.findIndex(l => l.id === courante.id);
    const prochaine = lecons.slice(i + 1).find(l => !verrouillee(l));
    if (prochaine) ouvrir(prochaine);
  };

  const acheter = async () => {
    if (!user) { setSignInOpen(true); return; }
    setPaiement(true); setErreur(null);
    try {
      window.location.href = await acheterFormation(id);
    } catch {
      setErreur(lang === 'FR' ? 'Le paiement n\'a pas pu démarrer. Réessayez.' : 'Payment could not start. Please try again.');
      setPaiement(false);
    }
  };

  const nbTerminees = lecons.filter(l => terminees[l.id]).length;
  const pct = lecons.length ? Math.round((nbTerminees / lecons.length) * 100) : 0;

  if (loading) {
    return <div className="min-h-screen bg-[#EEE7DB] pt-40 text-center text-sm text-[#38403a]/50 dark:bg-[#151d19] dark:text-white/50">…</div>;
  }
  // Un cours masqué reste ouvert pour qui le possède (achat accordé par
  // l'admin, accès à vie ou admin) : il est absent du catalogue, pas du compte.
  // Le Foyer a sa page de vente : qui ne le possède pas encore y est menée
  // (le bouton d'achat vit là, avec toute la promesse). Les membres passent.
  if (id === 'foyer' && formation && !accessible && (!user || !verifAcces)) {
    return <Navigate to="/foyer" replace />;
  }

  const masqueMaisPossede = formation && formation.statut !== 'publie' && (isAdmin || achete || accesVie);
  if (formation && formation.statut !== 'publie' && !masqueMaisPossede && user && verifAcces) {
    return <div className="min-h-screen bg-[#EEE7DB] pt-40 text-center text-sm text-[#38403a]/50 dark:bg-[#151d19] dark:text-white/50">…</div>;
  }
  if (!formation || (formation.statut !== 'publie' && !masqueMaisPossede)) {
    return (
      <div className="min-h-screen bg-[#EEE7DB] pt-40 text-center dark:bg-[#151d19]">
        <p className="font-serif text-2xl text-[#293027] dark:text-white">{lang === 'FR' ? 'Cette formation n\'est pas disponible.' : 'This course is not available.'}</p>
        <Link to="/cours" className="mt-4 inline-block text-sm text-[#8B4A2F]">{lang === 'FR' ? 'Retour aux formations' : 'Back to courses'}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEE7DB] pt-28 pb-24 dark:bg-[#151d19]">
      <div className="mx-auto max-w-[1720px] px-5 md:px-10">
        <Link to="/cours" className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">
          <i className="fa-solid fa-arrow-left mr-2" />{lang === 'FR' ? 'Toutes les formations' : 'All courses'}
        </Link>
        {id === 'foyer' && accessible && (
          <div className="mt-4 overflow-hidden rounded-[20px] border border-white/60 shadow-[0_24px_60px_-24px_rgba(41,48,39,0.5)] dark:border-white/10">
            <video
              src="/assets/foyer-visuel-16x9.mp4"
              poster="/assets/foyer-visuel-16x9.jpg"
              autoPlay muted loop playsInline
              className="aspect-video w-full object-cover"
            />
            {/* Le médaillon de cuivre sous la niche : le feu s'écoute. */}
            <button
              type="button"
              onClick={basculerAmbiance}
              aria-label={ambianceJoue ? 'Mettre le feu en pause' : 'Écouter le feu crépiter'}
              aria-pressed={ambianceJoue}
              className="group absolute flex h-[11%] w-auto aspect-square items-center justify-center rounded-full"
              style={{ left: '68.2%', top: '72.5%' }}
            >
              <span className={`absolute inset-0 rounded-full transition-all duration-500 ${ambianceJoue ? 'shadow-[0_0_26px_8px_rgba(217,160,91,0.55)]' : 'shadow-[0_0_0_0_rgba(217,160,91,0)] group-hover:shadow-[0_0_20px_5px_rgba(217,160,91,0.4)]'}`} />
              <i className={`fa-solid ${ambianceJoue ? 'fa-pause' : 'fa-play'} relative text-sm text-[#EEE7DB]/0 transition-colors duration-300 group-hover:text-[#EEE7DB]/90 ${ambianceJoue ? 'text-[#EEE7DB]/80' : ''}`} />
            </button>
          </div>
        )}

        {id === 'foyer' && accessible && (
          <section className="mt-10 rounded-[24px] border border-[#BA7B39]/35 bg-gradient-to-br from-[#293027] to-[#1b241f] px-7 py-10 text-white md:px-12 md:py-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#d9a05b]">Espace VIP</p>
            <h2 className="mt-2 max-w-3xl font-serif text-3xl leading-tight md:text-4xl">Bienvenue dans votre espace VIP du Foyer d'Origine</h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80">
              Vous avez pris place autour du feu. Douze portes vous attendent, une par mois. Quand une porte s'ouvre,
              elle reçoit quatre dépôts au fil du mois, un par semaine : un texte, un audio ou une vidéo qui vient
              élargir ce que nous regardons. Chaque mois, une méditation guidée se vit en direct, et sa rediffusion
              reste dans le Foyer. Rien à rattraper, rien à terminer. Vous revenez quand vous en avez envie,
              et tout ce qui a été déposé reste là pendant vos douze mois d'accès.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[12px] font-bold uppercase tracking-widest text-[#d9a05b]">
              <span><i className="fa-solid fa-door-open mr-2" />Douze portes, une par mois</span>
              <span><i className="fa-solid fa-broadcast-tower mr-2" />Une méditation en direct par mois</span>
              <span><i className="fa-solid fa-feather mr-2" />Quatre dépôts par porte, un par semaine</span>
              <span><i className="fa-solid fa-fire mr-2" />Le feu et les saisons</span>
              <span><i className="fa-solid fa-users mr-2" />La communauté du Foyer</span>
            </div>
          </section>
        )}

        {id === 'foyer' && accessible && (() => {
          const ouverte = porteDuMois();
          return (
            <div className="mt-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Les douze portes</p>
              <h2 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">
                {ouvert ? `La porte de ${ouverte.mois.toLowerCase()} est ouverte` : 'La porte d\'octobre s\'ouvre le 1er octobre'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-[#38403a]/60 dark:text-white/60">
                {ouvert
                  ? 'Une seule porte s\'ouvre à la fois, celle du mois en cours. Les autres attendent leur tour.'
                  : 'Votre place est prise. La première porte reste barrée jusqu\'au matin du 1er octobre, puis une seule porte s\'ouvre à la fois, celle du mois en cours.'}
              </p>

              <div className="mt-6 grid gap-6 rounded-[24px] border border-[#BA7B39]/40 bg-white/55 p-6 backdrop-blur-md md:grid-cols-[220px_1fr] md:p-8 dark:border-[#BA7B39]/30 dark:bg-[#293027]/55">
                <div className="relative mx-auto w-44 max-w-full md:w-full">
                  <img
                    src={`/foyer/${ouverte.src}.webp`}
                    alt={`La porte de ${ouverte.mois}`}
                    className={`w-full drop-shadow-[0_18px_30px_rgba(41,48,39,0.35)] ${ouvert ? '' : 'opacity-80 saturate-[.7]'}`}
                    loading="lazy"
                  />
                  {!ouvert && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#293027]/75 text-[#d9a05b] shadow-[0_8px_24px_rgba(41,48,39,0.45)]">
                        <i className="fa-solid fa-lock" />
                      </span>
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{ouverte.mois} · {ouverte.mouvement}</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#293027] dark:text-white">{ouverte.theme}</h3>
                  {!ouvert && (
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/50 bg-[#BA7B39]/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8B4A2F] dark:text-[#d9a05b]">
                      <i className="fa-solid fa-lock text-[10px]" />{DEBUT_LABEL}
                    </p>
                  )}
                  <p className="mt-4 max-w-xl font-serif text-lg leading-relaxed text-[#38403a]/80 dark:text-white/75">« {ouverte.question} »</p>
                  <p className="mt-4 text-sm text-[#38403a]/60 dark:text-white/60">
                    {ouvert
                      ? 'Le rituel du mois se vit ici : gardez la question près de vous, revenez-y chaque matin, et partagez ce qu\'elle remue dans le feed plus bas.'
                      : 'Le premier dépôt arrive le 1er octobre. D\'ici là, la question de la porte peut déjà vous accompagner.'}
                  </p>
                </div>
              </div>

              <style>{`
                @keyframes porteBraise { 0%,100% { box-shadow: 0 0 18px 2px rgba(186,123,57,.35); } 50% { box-shadow: 0 0 30px 8px rgba(217,160,91,.55); } }
                .porte-ouverte { animation: porteBraise 3.2s ease-in-out infinite; }
                .porte-ouverte:hover { animation-duration: 1.4s; transform: translateY(-3px); }
                .porte-barree:hover { box-shadow: 0 0 22px 4px rgba(168,178,188,.45); border-color: rgba(168,178,188,.65) !important; transform: translateY(-2px); }
                @media (prefers-reduced-motion: reduce) { .porte-ouverte { animation: none; box-shadow: 0 0 18px 2px rgba(186,123,57,.35); } .porte-ouverte:hover, .porte-barree:hover { transform: none; } }
              `}</style>
              <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {PORTES.map(pt => {
                  const estOuverte = ouvert && pt.n === ouverte.n;
                  return (
                    <div key={pt.n} className="text-center" onMouseEnter={() => jouerSon(estOuverte)}>
                      <div className={`porte-carte relative overflow-hidden rounded-[16px] border p-2 transition-all duration-300 ${estOuverte ? 'porte-ouverte border-[#BA7B39]/60 bg-[#BA7B39]/10' : 'porte-barree border-[#38403a]/10 bg-white/40 dark:border-white/10 dark:bg-white/5'}`}>
                        <img
                          src={`/foyer/${pt.src}.webp`}
                          alt={`Porte de ${pt.mois}`}
                          loading="lazy"
                          className={`mx-auto h-28 w-auto object-contain transition-all ${estOuverte ? '' : 'opacity-85'}`}
                        />
                        {!estOuverte && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#293027]/70 text-[#d9a05b]">
                              <i className="fa-solid fa-lock text-sm" />
                            </span>
                          </span>
                        )}
                      </div>
                      <p className={`mt-2 text-[10px] font-bold uppercase tracking-widest ${estOuverte ? 'text-[#8B4A2F]' : 'text-[#38403a]/40 dark:text-white/40'}`}>{pt.mois}</p>
                      {!ouvert && pt.n === ouverte.n && (
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] dark:text-[#d9a05b]">{DEBUT_LABEL}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#293027] md:text-4xl dark:text-white" style={{ letterSpacing: '-0.01em' }}>
          {formation.titre}
        </h1>

        {live?.formationId === id && (
          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[20px] border border-red-500/30 bg-[#293027] px-5 py-4 text-white">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <p className="min-w-0 flex-1 text-sm">
              <span className="font-bold uppercase tracking-widest text-[11px] text-red-300">Live en cours</span>
              <span className="ml-2">{live.titre}</span>
              {!accessible && (
                <span className="block text-white/60">{lang === 'FR' ? 'Rejoignez la formation ci-dessous pour entrer dans le live.' : 'Join the course below to enter the live.'}</span>
              )}
            </p>
            {accessible && live.url && (
              <a href={live.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-red-400">
                {lang === 'FR' ? 'Rejoindre le live' : 'Join the live'} <i className="fa-solid fa-arrow-right" />
              </a>
            )}
          </div>
        )}

        {accessible && lecons.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-6 rounded-[20px] border border-white/60 bg-white/55 px-6 py-5 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
            {/* L'anneau de progression */}
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="7" className="text-[#38403a]/10 dark:text-white/10" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#BA7B39" strokeWidth="7" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                  className="transition-[stroke-dashoffset] duration-700" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-serif text-lg text-[#293027] dark:text-white">{pct} %</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{lang === 'FR' ? 'Votre progression' : 'Your progress'}</p>
              <p className="mt-0.5 font-serif text-xl text-[#293027] dark:text-white">{nbTerminees}/{lecons.length} {lang === 'FR' ? 'leçons terminées' : 'lessons complete'}</p>
              {/* Une flamme par leçon terminée */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lecons.map(l => (
                  <i key={l.id} title={l.titre} className={`fa-solid fa-fire text-sm ${terminees[l.id] ? 'text-[#BA7B39]' : 'text-[#38403a]/15 dark:text-white/15'}`} />
                ))}
              </div>
            </div>
            {(() => { const prochaine = lecons.find(l => !terminees[l.id]); return prochaine ? (
              <button
                onClick={() => ouvrir(prochaine)}
                className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#d9a05b] transition-colors"
              >
                <i className="fa-solid fa-play" /> {nbTerminees === 0 ? (lang === 'FR' ? 'Commencer' : 'Start') : (lang === 'FR' ? 'Continuer' : 'Continue')}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-green-600/10 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-green-700">
                <i className="fa-solid fa-fire" /> {lang === 'FR' ? 'Année complétée' : 'Year complete'}
              </span>
            ); })()}
          </div>
        )}

        {!accessible ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start">
            {formation.imageUrl && (
              <img src={formation.imageUrl} alt="" className="rounded-[20px] border border-white/60 shadow-[0_18px_50px_-25px_rgba(41,48,39,0.5)] dark:border-white/10" />
            )}
            <div>
              {formation.description && (
                <p className="whitespace-pre-line text-[#38403a]/80 dark:text-white/80">{formation.description}</p>
              )}
              {cadeau ? (
                <div className="mt-6"><CadeauCarte cadeau={cadeau} lang={lang} /></div>
              ) : (
              <p className="mt-6 font-serif text-3xl text-[#293027] dark:text-white">{formation.prix} $ CA</p>
              )}
              {!cadeau && <button
                onClick={acheter}
                disabled={paiement}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-[#293027] shadow-[0_8px_22px_-10px_rgba(186,123,57,0.8)] transition-colors hover:bg-[#9c6630] disabled:opacity-50"
              >
                <i className="fa-solid fa-lock-open" />
                {paiement ? (lang === 'FR' ? 'Redirection…' : 'Redirecting…') : (lang === 'FR' ? 'Rejoindre la formation' : 'Join the course')}
              </button>}
              <p className="mt-3 text-xs text-[#38403a]/50 dark:text-white/50">
                {lang === 'FR' ? 'Paiement sécurisé par Stripe. La formation apparaît dans votre espace dès le paiement.' : 'Secure payment by Stripe. The course appears in your space right after payment.'}
              </p>
              {isAdmin && (
                <a href={`/cours/${id}?apercu=1`} className="mt-4 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]/80 hover:text-[#8B4A2F]">
                  <i className="fa-solid fa-eye" /> Aperçu administratrice, sans acheter
                </a>
              )}
              {lecons.length > 0 && (
                <div className="mt-8">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{lecons.length} {lang === 'FR' ? 'leçons' : 'lessons'}</p>
                  <ul className="mt-3 space-y-2">
                    {lecons.map(l => (
                      <li key={l.id} className="flex items-center gap-3 text-sm text-[#38403a]/70 dark:text-white/70">
                        <i className={`fa-solid ${ICONES[l.type]} w-4 text-[#8B4A2F]/70`} />
                        {l.titre}
                        {l.duree && <span className="ml-auto text-xs text-[#38403a]/40 dark:text-white/40">{l.duree}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}
            </div>
          </div>
        ) : (
          <div className={`mt-8 grid gap-6 ${apercuPdf ? 'lg:grid-cols-[300px_minmax(0,1fr)_minmax(0,1fr)]' : 'lg:grid-cols-[320px_1fr]'}`}>
            {/* La liste des leçons */}
            {/* La liste colle en haut et défile seule : la page ne s'allonge plus
                à cause d'elle, donc plus de vide à droite quand on descend. */}
            <aside className="rounded-[20px] border border-white/60 bg-white/55 p-3 backdrop-blur-md lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto dark:border-white/10 dark:bg-[#293027]/55">
              {lecons.length === 0 && (
                <p className="p-3 text-sm text-[#38403a]/50 dark:text-white/50">{lang === 'FR' ? 'Les leçons arrivent bientôt.' : 'Lessons coming soon.'}</p>
              )}
              {/* Groupé par module, dans l'ordre du cours */}
              {(() => {
                const groupes: { nom: string; items: Lecon[] }[] = [];
                for (const l of lecons) {
                  const nom = l.moduleNom || '';
                  const g = groupes[groupes.length - 1];
                  if (g && g.nom === nom) g.items.push(l);
                  else groupes.push({ nom, items: [l] });
                }
                return groupes.map((g, gi) => {
                  // Chaque module se replie; celui de la leçon courante reste ouvert.
                  const contientCourante = !!courante && g.items.some(l => l.id === courante.id);
                  const ouvert = g.nom ? (replies[g.nom] === undefined ? contientCourante || gi === 0 : !replies[g.nom]) : true;
                  return (
                  <div key={gi} className="mb-2">
                    {g.nom && (
                      <button
                        type="button"
                        onClick={() => setReplies(r => ({ ...r, [g.nom]: ouvert }))}
                        aria-expanded={ouvert}
                        className="flex w-full items-center justify-between gap-2 rounded-[12px] px-3 pt-3 pb-1.5 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B4A2F] hover:bg-white/60 dark:hover:bg-white/10"
                      >
                        <span>{g.nom}</span>
                        <span className="flex items-center gap-2 text-[#38403a]/50 dark:text-white/50">
                          <span className="normal-case tracking-normal">{g.items.filter(l => terminees[l.id]).length}/{g.items.length}</span>
                          <i className={`fa-solid fa-chevron-down transition-transform ${ouvert ? '' : '-rotate-90'}`} aria-hidden="true" />
                        </span>
                      </button>
                    )}
                    {ouvert && g.items.map(l => {
                      const verrou = verrouillee(l);
                      return (
                      <button
                        key={l.id}
                        onClick={() => ouvrir(l)}
                        disabled={verrou}
                        title={verrou ? (lang === 'FR' ? `S'ouvre avec la porte de ${l.mois}` : `Opens with the ${l.mois} door`) : undefined}
                        className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition-colors ${
                          courante?.id === l.id
                            ? 'bg-[#BA7B39] text-[#293027]'
                            : verrou
                              ? 'cursor-not-allowed text-[#38403a]/40 dark:text-white/35'
                              : 'text-[#38403a]/80 hover:bg-white/70 dark:text-white/80 dark:hover:bg-white/10'
                        }`}
                      >
                        <i className={`fa-solid ${verrou ? 'fa-lock' : terminees[l.id] ? 'fa-circle-check text-green-700' : ICONES[l.type] || 'fa-file'} w-4 ${courante?.id === l.id ? '' : verrou ? 'opacity-50' : 'text-[#8B4A2F]/70'}`} />
                        <span className="min-w-0 flex-1 truncate">{l.titre}</span>
                        {verrou ? <span className="text-[10px] uppercase tracking-wider opacity-60">{l.mois}</span>
                                : l.duree && <span className="text-[11px] opacity-60">{l.duree}</span>}
                      </button>
                      );
                    })}
                  </div>
                  );
                });
              })()}
            </aside>

            {/* Le contenu de la leçon */}
            <section className="rounded-[20px] border border-white/60 bg-white/55 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
              {!courante ? (
                <div className="py-16 text-center text-[#38403a]/60 dark:text-white/60">
                  <i className="fa-solid fa-circle-play mb-4 block text-4xl text-[#BA7B39]" />
                  <p className="font-serif text-xl text-[#293027] dark:text-white">
                    {lang === 'FR' ? 'Choisissez une leçon pour commencer' : 'Pick a lesson to begin'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
                    {lang === 'FR' ? 'Leçon' : 'Lesson'} {lecons.findIndex(l => l.id === courante.id) + 1} {lang === 'FR' ? 'de' : 'of'} {lecons.length}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">{courante.titre}</h2>
                  <div className="mt-5">
                    {chargeLecon ? (
                      <p className="text-sm text-[#38403a]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>
                    ) : erreur ? (
                      <p className="text-sm text-red-600">{erreur}</p>
                    ) : urlCourante ? (
                      courante.type === 'video' ? (
                        <video src={urlCourante} controls playsInline className="w-full rounded-[15px] bg-black" />
                      ) : courante.type === 'audio' ? (
                        <audio src={urlCourante} controls className="w-full" />
                      ) : (
                        <a
                          href={urlCourante} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#293027] hover:bg-[#9c6630]"
                        >
                          <i className={`fa-solid ${ICONES[courante.type]}`} />
                          {lang === 'FR' ? 'Ouvrir le document' : 'Open the document'}
                        </a>
                      )
                    ) : null}
                  </div>
                  {courante.texte?.trim() && (
                    <TexteLecon texte={courante.texte} className={`${courante.chemin ? 'mt-6' : 'mt-2'} max-w-[68ch] text-[#3a2f23] dark:text-white/80`} />
                  )}

                  {/* Les documents déposés par Krystine sous la leçon */}
                  {(courante.docs?.length ?? 0) > 0 && (
                    <div className="mt-6">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{lang === 'FR' ? 'Documents de la leçon' : 'Lesson documents'}</p>
                      <ul className="mt-2 space-y-2">
                        {courante.docs!.map((d, i) => (
                          <li key={d.chemin}>
                            <button
                              onClick={async () => {
                                try {
                                  const url = await urlDeDocumentLecon(id, courante.id, i);
                                  if (/\.pdf$/i.test(d.nom)) setApercu({ nom: d.nom, url });
                                  else window.open(url, '_blank', 'noopener');
                                }
                                catch { setErreur(lang === 'FR' ? 'Document indisponible pour le moment.' : 'Document unavailable right now.'); }
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/40 px-4 py-2 text-sm text-[#8B4A2F] transition-colors hover:bg-[#BA7B39]/10 dark:text-[#d9a05b]"
                            >
                              <i className={`fa-solid ${/\.pdf$/i.test(d.nom) ? 'fa-file-pdf' : 'fa-file-arrow-down'}`} /> {d.nom}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!formation?.questionsFermees && <QuestionsLecon formationId={id} lecon={courante} />}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => basculerTerminee(courante)}
                      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                        terminees[courante.id]
                          ? 'border-green-600 bg-green-600/10 text-green-700'
                          : 'border-[#BA7B39] text-[#8B4A2F] hover:bg-[#BA7B39] hover:text-[#293027]'
                      }`}
                    >
                      <i className="fa-solid fa-check" />
                      {terminees[courante.id]
                        ? (lang === 'FR' ? 'Leçon terminée' : 'Lesson complete')
                        : (lang === 'FR' ? 'Marquer comme terminée' : 'Mark as complete')}
                    </button>
                    {lecons.findIndex(l => l.id === courante.id) < lecons.length - 1 && (
                      <button
                        onClick={suivante}
                        className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#293027] hover:bg-[#9c6630]"
                      >
                        {lang === 'FR' ? 'Leçon suivante' : 'Next lesson'}
                        <i className="fa-solid fa-arrow-right" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>

            {/* Le volet d'aperçu du PDF, à droite, qui colle en haut et défile seul */}
            {apercuPdf && (
              <aside className="flex flex-col overflow-hidden rounded-[20px] border border-white/60 bg-white/55 backdrop-blur-md lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] dark:border-white/10 dark:bg-[#293027]/55">
                <div className="flex items-center justify-between gap-3 border-b border-[#293027]/10 px-4 py-3 dark:border-white/10">
                  <p className="min-w-0 truncate text-sm text-[#293027] dark:text-white"><i className="fa-solid fa-file-pdf mr-2 text-[#8B4A2F]" />{apercuPdf.nom}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    <a href={apercuPdf.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#BA7B39]/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:bg-[#BA7B39]/10 dark:text-[#d9a05b]">
                      {lang === 'FR' ? 'Ouvrir' : 'Open'}
                    </a>
                    <button type="button" onClick={() => setApercu(null)} aria-label={lang === 'FR' ? 'Fermer l’aperçu' : 'Close preview'} className="h-8 w-8 rounded-full text-[#293027]/60 hover:bg-white/70 dark:text-white/60 dark:hover:bg-white/10">
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>
                </div>
                <iframe src={`${apercuPdf.url}#toolbar=0&view=FitH`} title={apercuPdf.nom} className="h-[70vh] w-full flex-1 bg-white lg:h-auto" />
              </aside>
            )}
          </div>
        )}

        {/* L'espace de groupe : onglets, feed et membres, pleine largeur. */}
        {accessible && user && (
          <div className="mt-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">La communauté</p>
            <h2 className="mt-1 mb-6 font-serif text-2xl text-[#293027] dark:text-white">{lang === 'FR' ? 'Autour du feu' : 'Around the fire'}</h2>
            <EspaceGroupe formationId={id} />
          </div>
        )}
      </div>
    </div>
  );
};


// ─── Les questions sous une leçon ───────────────────────────────────────────
const QuestionsLecon: React.FC<{ formationId: string; lecon: Lecon }> = ({ formationId, lecon }) => {
  const { user, member, isAdmin } = useAuth();
  const { lang } = useUI();
  const [questions, setQuestions] = useState<QuestionLecon[]>([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [reponses, setReponses] = useState<Record<string, string>>({});
  useEffect(() => suivreQuestions(formationId, lecon.id, setQuestions), [formationId, lecon.id]);

  const poser = async () => {
    if (!user || !texte.trim() || envoi) return;
    setEnvoi(true);
    try {
      await poserQuestion(formationId, lecon.id, { uid: user.uid, nom: (member?.displayName || user.displayName || '').trim() || 'Un membre', texte });
      setTexte('');
    } finally { setEnvoi(false); }
  };

  return (
    <div className="mt-8 border-t border-[#38403a]/10 pt-6 dark:border-white/10">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F]">{lang === 'FR' ? 'Vos questions' : 'Your questions'}</p>
      {user && (
        <div className="mt-3 flex items-end gap-2">
          <textarea
            value={texte}
            onChange={e => setTexte(e.target.value.slice(0, 2000))}
            rows={2}
            placeholder={lang === 'FR' ? 'Posez votre question sur cette leçon…' : 'Ask your question about this lesson…'}
            className="min-h-[52px] flex-1 resize-y rounded-2xl border border-[#38403a]/10 bg-white/70 px-4 py-3 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <button
            onClick={poser}
            disabled={envoi || !texte.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#BA7B39] text-[#293027] disabled:opacity-40"
            aria-label={lang === 'FR' ? 'Envoyer la question' : 'Send the question'}
          >
            <i className={`fa-solid ${envoi ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'} text-sm`} />
          </button>
        </div>
      )}
      <ul className="mt-4 space-y-3">
        {questions.map(q => (
          <li key={q.id} className="rounded-2xl border border-[#38403a]/8 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-[#293027] dark:text-white">{q.nom}</p>
              <span className="shrink-0 text-[11px] text-[#38403a]/45 dark:text-white/40">{q.creeLe?.toDate().toLocaleDateString('fr-CA')}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#38403a]/85 dark:text-white/80">{q.texte}</p>
            {q.reponse ? (
              <div className="mt-3 rounded-xl border-l-2 border-[#BA7B39] bg-[#BA7B39]/8 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">Krystine</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#293027] dark:text-white/90">{q.reponse}</p>
              </div>
            ) : isAdmin && (
              <div className="mt-3 flex items-end gap-2">
                <textarea
                  value={reponses[q.id] || ''}
                  onChange={e => setReponses(r => ({ ...r, [q.id]: e.target.value }))}
                  rows={2}
                  placeholder="Votre réponse…"
                  className="flex-1 resize-y rounded-xl border border-[#38403a]/10 bg-white px-3 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/10 dark:text-white"
                />
                <button
                  onClick={async () => { const r = (reponses[q.id] || '').trim(); if (r) { await repondreQuestion(formationId, lecon.id, q.id, r); setReponses(x => ({ ...x, [q.id]: '' })); } }}
                  className="rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#d9a05b]"
                >
                  Répondre
                </button>
              </div>
            )}
          </li>
        ))}
        {questions.length === 0 && (
          <li className="text-sm text-[#38403a]/50 dark:text-white/50">{lang === 'FR' ? 'Aucune question pour l\'instant. La vôtre ouvrira le bal.' : 'No questions yet. Yours will open the floor.'}</li>
        )}
      </ul>
    </div>
  );
};

export default CoursDetailPage;
