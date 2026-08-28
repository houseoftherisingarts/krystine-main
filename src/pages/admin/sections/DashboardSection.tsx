import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getEvents, getBlogPosts, getBookingRequests, getNewsletterSubscribers, getDoshaResults,
  type EventDoc, type BlogPost, type BookingRequest, type NewsletterSubscriber, type DoshaResult,
} from '../../../firebase/firestore';
import { useEditMode } from '../../../contexts/EditModeContext';
import { subscribeLiveListeners, subscribeListenTotals, type PresenceRow } from '../../../lib/podcastStats';
import { Card } from '../primitives';

interface Stat { label: string; value: number; icon: string; accent: string; hint?: string; }

const DashboardSection: React.FC<{ onNavigate: (s: any) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { setEditMode } = useEditMode();
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [dosha, setDosha] = useState<DoshaResult[]>([]);
  const [enDirect, setEnDirect] = useState<PresenceRow[]>([]);
  const [ecoutes, setEcoutes] = useState<{ total: number; parEpisode: { episodeId: string; episodeTitle: string; n: number }[] }>({ total: 0, parEpisode: [] });

  // Flip edit mode on, then navigate to /accueil via SPA. Using
  // useNavigate (rather than a plain <a href>) keeps the auth context
  // alive so `isAdmin` stays true — the old anchor triggered a full
  // reload, which occasionally left Krystine stranded in a pre-auth
  // state and the ?edit=1 flag never got honoured.
  const openInEditMode = () => {
    setEditMode(true);
    navigate('/accueil');
  };

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
    getBlogPosts().then(setPosts).catch(() => {});
    getBookingRequests().then(setBookings).catch(() => {});
    getNewsletterSubscribers().then(setSubs).catch(() => {});
    getDoshaResults().then(setDosha).catch(() => {});
  }, []);

  // Écoutes du podcast : présence en direct + trace permanente.
  useEffect(() => {
    const a = subscribeLiveListeners(setEnDirect);
    const b = subscribeListenTotals(setEcoutes);
    // La fenêtre de 75 s se réévalue même sans nouvel événement Firestore.
    const t = setInterval(() => setEnDirect(rows => [...rows.filter(r => Date.now() - r.lastSeenMs < 75_000)]), 20_000);
    return () => { a(); b(); clearInterval(t); };
  }, []);

  const upcoming = events.filter(e => new Date(e.date) >= new Date()).length;
  const newBookings = bookings.filter(b => (b.status || 'new') === 'new').length;
  const doshaBreakdown = { vata: 0, pitta: 0, kapha: 0 };
  dosha.forEach(r => {
    const k = r.dominant?.toLowerCase();
    if (k === 'vata' || k === 'pitta' || k === 'kapha') doshaBreakdown[k]++;
  });

  const stats: (Stat & { section: string })[] = [
    { label: 'Événements à venir', value: upcoming, icon: 'fa-calendar', accent: 'text-[#7d6330]', section: 'events' },
    { label: 'Articles publiés', value: posts.filter(p => p.isPublished !== false).length, icon: 'fa-pen-nib', accent: 'text-[#4A7C9D]', section: 'blog' },
    { label: 'Demandes nouvelles', value: newBookings, icon: 'fa-inbox', accent: 'text-[#BC4A3C]', section: 'bookings', hint: bookings.length > 0 ? `${bookings.length} au total` : undefined },
    { label: 'Infolettre', value: subs.length, icon: 'fa-envelope', accent: 'text-[#2D4A3E]', section: 'newsletter' },
    { label: 'Quiz Dosha', value: dosha.length, icon: 'fa-circle-nodes', accent: 'text-[#8F9779]', section: 'dosha' },
  ];

  return (
    <div className="space-y-8">
      {/* Edit-site callout — routes to /accueil where the floating edit bar
          lets Krystine flip the site into edit mode and update text/images. */}
      <Card className="p-6 bg-gradient-to-br from-[#2a2015] to-[#4A3228] text-white border-[#bb9a5e]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#7d6330] block mb-2">
              Contenu du site
            </span>
            <h2 className="text-2xl font-serif mb-1">Modifier le site en direct</h2>
            <p className="text-sm text-white/70 max-w-xl">
              Activez le mode édition pour changer les textes, les photos et recadrer les images directement
              sur la page, avec aperçu en temps réel.
            </p>
          </div>
          <button
            type="button"
            onClick={openInEditMode}
            className="shrink-0 inline-flex items-center gap-2 bg-[#bb9a5e] text-[#2a2015] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-white transition-colors"
          >
            <i className="fa-solid fa-pen" /> Ouvrir en édition
          </button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="p-5 cursor-pointer hover:shadow-md transition-shadow" >
            <button onClick={() => onNavigate(s.section)} className="w-full text-left">
              <i className={`fa-solid ${s.icon} text-2xl ${s.accent} mb-3 block`} />
              <p className="text-3xl font-serif text-[#2a2015] dark:text-white">{s.value}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#2a2015]/50 dark:text-white/50 mt-1 font-bold">{s.label}</p>
              {s.hint && <p className="text-[10px] text-[#2a2015]/40 dark:text-white/40 mt-2">{s.hint}</p>}
            </button>
          </Card>
        ))}
      </div>

      {/* Écoutes du podcast sur la page */}
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              {enDirect.length > 0 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#BC4A3C] opacity-70" />}
              <span className={`relative inline-flex h-3 w-3 rounded-full ${enDirect.length > 0 ? 'bg-[#BC4A3C]' : 'bg-[#2a2015]/20 dark:bg-white/20'}`} />
            </span>
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60">Podcast sur la page</h3>
          </div>
          <p className="text-sm text-[#2a2015] dark:text-white">
            <span className="font-serif text-2xl">{enDirect.length}</span>
            <span className="ml-2 text-[#2a2015]/50 dark:text-white/50">{enDirect.length === 1 ? 'personne écoute en ce moment' : 'personnes écoutent en ce moment'}</span>
          </p>
          <p className="text-sm text-[#2a2015] dark:text-white">
            <span className="font-serif text-2xl">{ecoutes.total}</span>
            <span className="ml-2 text-[#2a2015]/50 dark:text-white/50">écoutes depuis le début</span>
          </p>
        </div>
        {ecoutes.parEpisode.length > 0 && (
          <ul className="mt-5 space-y-2">
            {ecoutes.parEpisode.slice(0, 5).map(e => (
              <li key={e.episodeId} className="flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-[#2a2015]/70 dark:text-white/70">{e.episodeTitle || e.episodeId}</span>
                <span className="shrink-0 font-bold tabular-nums text-[#7d6330]">{e.n}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Dosha breakdown */}
      {dosha.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60 font-bold mb-4">Répartition des résultats Dosha</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['vata', 'pitta', 'kapha'] as const).map(k => {
              const n = doshaBreakdown[k];
              const pct = Math.round((n / dosha.length) * 100);
              const color = k === 'vata' ? 'bg-[#8F9779]' : k === 'pitta' ? 'bg-[#BC4A3C]' : 'bg-[#4A7C9D]';
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1 text-[#2a2015] dark:text-white">
                    <span className="capitalize font-serif">{k}</span>
                    <span className="font-bold">{n} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#2a2015]/5 dark:bg-white/5 overflow-hidden">
                    <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60 font-bold mb-4">Dernières demandes</h3>
          {bookings.slice(0, 5).length === 0 ? (
            <p className="text-sm text-[#2a2015]/40 dark:text-white/40 italic">Aucune demande pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {bookings.slice(0, 5).map(b => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-serif text-[#2a2015] dark:text-white truncate">{b.name}</p>
                    <p className="text-xs text-[#2a2015]/50 dark:text-white/50 truncate">{b.eventType || b.organization || b.email}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full ${
                    b.status === 'accepted' ? 'bg-green-50 text-green-600'
                    : b.status === 'declined' ? 'bg-red-50 text-red-500'
                    : b.status === 'in_progress' ? 'bg-yellow-50 text-yellow-600'
                    : 'bg-[#bb9a5e]/10 text-[#7d6330]'
                  }`}>{b.status || 'new'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60 font-bold mb-4">Prochains événements</h3>
          {events.filter(e => new Date(e.date) >= new Date()).slice(0, 5).length === 0 ? (
            <p className="text-sm text-[#2a2015]/40 dark:text-white/40 italic">Aucun événement planifié.</p>
          ) : (
            <ul className="space-y-3">
              {events.filter(e => new Date(e.date) >= new Date()).slice(0, 5).map(e => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-serif text-[#2a2015] dark:text-white truncate">{e.title}</p>
                    <p className="text-xs text-[#2a2015]/50 dark:text-white/50 truncate">{e.date}{e.location ? ` · ${e.location}` : ''}</p>
                  </div>
                  {e.isFeatured && <span className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full bg-[#bb9a5e]/10 text-[#7d6330]">Vedette</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardSection;
