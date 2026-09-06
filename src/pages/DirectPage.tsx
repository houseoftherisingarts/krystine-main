import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../contexts/AppContext';
import { suivreLiveEnCours, type LiveEnCours } from '../firebase/lives';
import {
  MONTANTS_POURBOIRE, envoyerCoeur, marquerPresence, ouvrirPourboire,
  suivreCoeurs, suivrePourboires, type CoeurDirect, type PourboireDirect,
} from '../firebase/direct';
import { awardPoints } from '../firebase/points';
import { POINTS } from '../lib/pointsConfig';
import VisualiseurVoix from '../components/direct/VisualiseurVoix';
import ChatDirect from '../components/direct/ChatDirect';

// ─── /direct ─────────────────────────────────────────────────────────────────
// La salle du direct de Krystine. La diffusion vient de YouTube; la salle
// ajoute ce que YouTube ne donne pas : le clavardage à nous, les badges de
// participation, les cœurs qui montent, le pourboire et les points qui
// tombent dans l'espace client.

const idYouTube = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
};

const DirectPage: React.FC = () => {
  const { user, member, isAdmin, setSignInOpen } = useApp();
  const [live, setLive] = useState<LiveEnCours | null>(null);
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [coeurs, setCoeurs] = useState<CoeurDirect[]>([]);
  const [pourboires, setPourboires] = useState<PourboireDirect[]>([]);
  const [impulsion, setImpulsion] = useState(0);
  const [paiement, setPaiement] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // Aperçu de la salle en développement seulement, jamais en production :
    // `npm run dev` puis /direct?demo=1 monte un direct factice pour régler
    // la mise en page sans allumer le vrai live devant les visiteurs.
    if ((import.meta as any).env?.DEV && new URLSearchParams(window.location.search).get('demo')) {
      setLive({ actif: true, titre: 'Podcast en direct · aperçu', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' } as LiveEnCours);
      return;
    }
    return suivreLiveEnCours(setLive);
  }, []);

  const directId = useMemo(() => {
    if (!live) return null;
    const t = live.commenceLe?.toDate?.();
    return `direct-${t ? t.toISOString().slice(0, 10) : 'actuel'}`;
  }, [live]);

  const moi = user
    ? { uid: user.uid, nom: member?.displayName || user.displayName || 'Une auditrice', photoURL: member?.photoURL || user.photoURL || undefined }
    : null;

  useEffect(() => {
    if (!directId) return;
    return suivreCoeurs(directId, c => { setCoeurs(c); setImpulsion(x => x + 1); });
  }, [directId]);
  useEffect(() => { if (directId) return suivrePourboires(directId, setPourboires); }, [directId]);

  // La présence se salue une fois par direct, points compris.
  useEffect(() => {
    if (!directId || !moi) return;
    marquerPresence(directId, { uid: moi.uid, nom: moi.nom, photoURL: moi.photoURL });
    awardPoints(moi.uid, 'direct', POINTS.directPresence, `direct:${directId}:presence:${moi.uid}`, { directId });
  }, [directId, moi?.uid]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('merci')) {
      setNote('Merci, votre pourboire est arrivé. Les points sont déjà dans votre espace.');
    }
  }, []);

  const surMessage = useCallback(async (total: number) => {
    if (!directId || !moi) return;
    setImpulsion(x => x + 1);
    marquerPresence(directId, { uid: moi.uid, nom: moi.nom, photoURL: moi.photoURL, messages: total });
    // Deux niskas par message, vingt au plus par direct : au-delà de dix
    // messages, la parole reste libre mais ne rapporte plus (anti-spam).
    if (total * POINTS.directMessage <= POINTS.directMessageMax) {
      await awardPoints(moi.uid, 'direct', POINTS.directMessage, `direct:${directId}:msg:${moi.uid}:${total}`, { directId });
    }
  }, [directId, moi?.uid]);

  const coeur = async () => {
    if (!moi) { setSignInOpen(true); return; }
    if (!directId) return;
    setImpulsion(x => x + 1);
    await envoyerCoeur(directId, moi.uid, moi.nom);
    const tranche = Math.floor(Date.now() / 60000); // un point par minute au plus
    await awardPoints(moi.uid, 'direct', POINTS.directCoeur, `direct:${directId}:coeur:${moi.uid}:${tranche}`, { directId });
  };

  const pourboire = async (montant: number) => {
    if (!moi) { setSignInOpen(true); return; }
    if (!directId || paiement) return;
    setPaiement(true); setNote(null);
    try {
      window.location.href = await ouvrirPourboire(montant, directId, live?.titre || 'Le direct de Krystine');
    } catch (e: any) {
      setNote(e?.message || 'Le paiement n\'a pas pu démarrer.');
      setPaiement(false);
    }
  };

  const vid = idYouTube(live?.url);

  if (!live) {
    return (
      <main className="min-h-[100dvh] bg-[#0f1613] px-5 pb-24 pt-32 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#BA7B39]">Le direct</p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3.2rem)] leading-tight text-[#EEE7DB]">
          Le feu est éteint pour l’instant
        </h1>
        <p className="mx-auto mt-4 max-w-[52ch] text-[0.95rem] leading-relaxed text-[#EEE7DB]/60">
          Krystine ouvre cette salle quand elle passe en ondes. Inscrivez-vous au prochain direct sur la page du podcast, vous recevrez le lien et un rappel.
        </p>
        <a href="/podcast" className="mt-8 inline-block rounded-full bg-[#BA7B39] px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#161f1a]">
          La page du podcast
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#0f1613] px-4 pb-16 pt-8 md:px-8">
      <div className="mx-auto mb-4 flex max-w-[1500px] items-center justify-between">
        <a href="/accueil" className="font-serif text-sm uppercase tracking-[0.2em] text-[#EEE7DB]/60 transition-colors hover:text-[#EEE7DB]">
          Krystine St-Laurent
        </a>
        <a href="/compte" className="text-[10px] uppercase tracking-[0.2em] text-[#EEE7DB]/45 transition-colors hover:text-[#E8A85C]">
          Mes points
        </a>
      </div>
      <div className="mx-auto grid max-w-[1500px] gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* La scène */}
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />En direct
            </span>
            <h1 className="min-w-0 truncate font-serif text-xl text-[#EEE7DB] md:text-2xl">{live.titre}</h1>
            <div className="ml-auto flex overflow-hidden rounded-full border border-white/15">
              {(['video', 'audio'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${mode === m ? 'bg-[#BA7B39] text-[#161f1a]' : 'text-[#EEE7DB]/60 hover:text-[#EEE7DB]'}`}>
                  <i className={`fa-solid ${m === 'video' ? 'fa-video' : 'fa-waveform-lines'} mr-2`} />{m === 'video' ? 'Vidéo' : 'Audio'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-[24px] border border-white/12 bg-[#141a16]">
            {vid ? (
              <iframe
                title={live.titre}
                src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className={`absolute inset-0 h-full w-full ${mode === 'audio' ? 'pointer-events-none opacity-0' : ''}`}
              />
            ) : (
              <a href={live.url} target="_blank" rel="noopener noreferrer"
                 className="absolute inset-0 grid place-items-center font-serif text-[#EEE7DB]/70">
                Ouvrir la diffusion
              </a>
            )}
            {mode === 'audio' && <VisualiseurVoix impulsion={impulsion} actif />}
            {mode === 'audio' && (
              <p className="absolute inset-x-0 bottom-5 text-center font-serif text-lg text-[#EEE7DB]/75">
                Vous écoutez {live.titre}
              </p>
            )}

            {/* Les cœurs montent le long du bord droit */}
            <div className="pointer-events-none absolute bottom-0 right-4 top-0 w-24 overflow-hidden">
              <AnimatePresence>
                {coeurs.slice(0, 8).map((c, i) => (
                  <motion.span key={c.id}
                    initial={{ opacity: 0, y: 0, scale: 0.6 }}
                    animate={{ opacity: [0, 1, 1, 0], y: -260, scale: 1, x: (i % 3 - 1) * 18 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 3.4, ease: 'easeOut' }}
                    className="absolute bottom-6 right-6 text-2xl">
                    <i className="fa-solid fa-heart" style={{ color: ['#E8A85C', '#BA7B39', '#F2D9A8'][i % 3] }} />
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Les gestes */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={coeur}
              className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/45 bg-[#BA7B39]/10 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#E8A85C] transition-colors hover:bg-[#BA7B39]/20">
              <i className="fa-solid fa-heart" />Envoyer un cœur
            </button>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#EEE7DB]/40">
              {POINTS.directCoeur} point par cœur · {POINTS.directMessage} par message ({POINTS.directMessageMax} au plus) · {POINTS.directPresence} pour votre présence
            </span>
          </div>

          {/* Le pourboire */}
          <div className="mt-5 rounded-[24px] border border-white/12 bg-white/[0.04] p-5 backdrop-blur-md">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#BA7B39]">Soutenir le direct</p>
            <p className="mt-1.5 font-serif text-xl text-[#EEE7DB]">Glisser un pourboire dans le chapeau</p>
            <p className="mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-[#EEE7DB]/60">
              Chaque dollar donne dix points dans votre espace, et Krystine voit votre nom passer à l’écran.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {MONTANTS_POURBOIRE.map(m => (
                <button key={m} onClick={() => pourboire(m)} disabled={paiement}
                  className="rounded-full bg-[#BA7B39] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#161f1a] transition-colors hover:bg-[#dcb874] disabled:opacity-40">
                  {m} $
                </button>
              ))}
            </div>
            {note && <p className="mt-3 text-[13px] text-[#E8A85C]">{note}</p>}
            {pourboires.length > 0 && (
              <p className="mt-4 border-t border-white/10 pt-3 text-[12px] text-[#EEE7DB]/55">
                Merci à {pourboires.slice(0, 6).map(p => p.nom.split(' ')[0]).join(', ')}
                {pourboires.length > 6 ? ' et aux autres.' : '.'}
              </p>
            )}
          </div>
        </section>

        {/* Le clavardage */}
        <aside className="flex h-[70vh] min-h-[460px] flex-col overflow-hidden rounded-[24px] border border-white/12 bg-white/[0.04] backdrop-blur-md lg:h-auto lg:max-h-[calc(100dvh-8rem)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="font-serif text-lg text-[#EEE7DB]">Le clavardage</p>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#EEE7DB]/40">
              {coeurs.length > 0 ? `${coeurs.length} cœur${coeurs.length > 1 ? 's' : ''} à l'écran` : 'Au coin du feu'}
            </span>
          </div>
          {directId && (
            <ChatDirect
              directId={directId}
              moi={moi}
              animatrice={isAdmin}
              onConnexion={() => setSignInOpen(true)}
              onMessageEnvoye={surMessage}
              onNouveauMessage={() => setImpulsion(x => x + 1)}
            />
          )}
        </aside>
      </div>
    </main>
  );
};

export default DirectPage;
