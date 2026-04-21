import React, { useEffect, useState } from 'react';
import {
  getEvents, getBlogPosts, getBookingRequests, getNewsletterSubscribers, getDoshaResults,
  type EventDoc, type BlogPost, type BookingRequest, type NewsletterSubscriber, type DoshaResult,
} from '../../../firebase/firestore';
import { Card } from '../primitives';

interface Stat { label: string; value: number; icon: string; accent: string; hint?: string; }

const DashboardSection: React.FC<{ onNavigate: (s: any) => void }> = ({ onNavigate }) => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [bookings, setBookings] = useState<BookingRequest[]>([]);
  const [subs, setSubs] = useState<NewsletterSubscriber[]>([]);
  const [dosha, setDosha] = useState<DoshaResult[]>([]);

  useEffect(() => {
    getEvents().then(setEvents).catch(() => {});
    getBlogPosts().then(setPosts).catch(() => {});
    getBookingRequests().then(setBookings).catch(() => {});
    getNewsletterSubscribers().then(setSubs).catch(() => {});
    getDoshaResults().then(setDosha).catch(() => {});
  }, []);

  const upcoming = events.filter(e => new Date(e.date) >= new Date()).length;
  const newBookings = bookings.filter(b => (b.status || 'new') === 'new').length;
  const doshaBreakdown = { vata: 0, pitta: 0, kapha: 0 };
  dosha.forEach(r => {
    const k = r.dominant?.toLowerCase();
    if (k === 'vata' || k === 'pitta' || k === 'kapha') doshaBreakdown[k]++;
  });

  const stats: (Stat & { section: string })[] = [
    { label: 'Événements à venir', value: upcoming, icon: 'fa-calendar', accent: 'text-[#D4AF37]', section: 'events' },
    { label: 'Articles publiés', value: posts.filter(p => p.isPublished !== false).length, icon: 'fa-pen-nib', accent: 'text-[#4A7C9D]', section: 'blog' },
    { label: 'Demandes nouvelles', value: newBookings, icon: 'fa-inbox', accent: 'text-[#BC4A3C]', section: 'bookings', hint: bookings.length > 0 ? `${bookings.length} au total` : undefined },
    { label: 'Infolettre', value: subs.length, icon: 'fa-envelope', accent: 'text-[#2D4A3E]', section: 'newsletter' },
    { label: 'Quiz Dosha', value: dosha.length, icon: 'fa-circle-nodes', accent: 'text-[#8F9779]', section: 'dosha' },
  ];

  return (
    <div className="space-y-8">
      {/* Edit-site callout — routes to /accueil where the floating edit bar
          lets Krystine flip the site into edit mode and update text/images. */}
      <Card className="p-6 bg-gradient-to-br from-[#0B1A36] to-[#1A2642] text-white border-[#D4AF37]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#D4AF37] block mb-2">
              Contenu du site
            </span>
            <h2 className="text-2xl font-serif mb-1">Modifier le site en direct</h2>
            <p className="text-sm text-white/70 max-w-xl">
              Activez le mode édition pour changer les textes, les photos et recadrer les images directement
              sur la page, avec aperçu en temps réel.
            </p>
          </div>
          <a
            href="/accueil?edit=1"
            className="shrink-0 inline-flex items-center gap-2 bg-[#D4AF37] text-[#0B1A36] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-white transition-colors"
          >
            <i className="fa-solid fa-pen" /> Ouvrir en édition
          </a>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="p-5 cursor-pointer hover:shadow-md transition-shadow" >
            <button onClick={() => onNavigate(s.section)} className="w-full text-left">
              <i className={`fa-solid ${s.icon} text-2xl ${s.accent} mb-3 block`} />
              <p className="text-3xl font-serif text-[#0B1A36] dark:text-white">{s.value}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#0B1A36]/50 dark:text-white/50 mt-1 font-bold">{s.label}</p>
              {s.hint && <p className="text-[10px] text-[#0B1A36]/40 dark:text-white/40 mt-2">{s.hint}</p>}
            </button>
          </Card>
        ))}
      </div>

      {/* Dosha breakdown */}
      {dosha.length > 0 && (
        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">Répartition des résultats Dosha</h3>
          <div className="grid grid-cols-3 gap-3">
            {(['vata', 'pitta', 'kapha'] as const).map(k => {
              const n = doshaBreakdown[k];
              const pct = Math.round((n / dosha.length) * 100);
              const color = k === 'vata' ? 'bg-[#8F9779]' : k === 'pitta' ? 'bg-[#BC4A3C]' : 'bg-[#4A7C9D]';
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1 text-[#0B1A36] dark:text-white">
                    <span className="capitalize font-serif">{k}</span>
                    <span className="font-bold">{n} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#0B1A36]/5 dark:bg-white/5 overflow-hidden">
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
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">Dernières demandes</h3>
          {bookings.slice(0, 5).length === 0 ? (
            <p className="text-sm text-[#0B1A36]/40 dark:text-white/40 italic">Aucune demande pour le moment.</p>
          ) : (
            <ul className="space-y-3">
              {bookings.slice(0, 5).map(b => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-serif text-[#0B1A36] dark:text-white truncate">{b.name}</p>
                    <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 truncate">{b.eventType || b.organization || b.email}</p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full ${
                    b.status === 'accepted' ? 'bg-green-50 text-green-600'
                    : b.status === 'declined' ? 'bg-red-50 text-red-500'
                    : b.status === 'in_progress' ? 'bg-yellow-50 text-yellow-600'
                    : 'bg-[#D4AF37]/10 text-[#D4AF37]'
                  }`}>{b.status || 'new'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold mb-4">Prochains événements</h3>
          {events.filter(e => new Date(e.date) >= new Date()).slice(0, 5).length === 0 ? (
            <p className="text-sm text-[#0B1A36]/40 dark:text-white/40 italic">Aucun événement planifié.</p>
          ) : (
            <ul className="space-y-3">
              {events.filter(e => new Date(e.date) >= new Date()).slice(0, 5).map(e => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0">
                    <p className="font-serif text-[#0B1A36] dark:text-white truncate">{e.title}</p>
                    <p className="text-xs text-[#0B1A36]/50 dark:text-white/50 truncate">{e.date}{e.location ? ` · ${e.location}` : ''}</p>
                  </div>
                  {e.isFeatured && <span className="text-[10px] uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">Vedette</span>}
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
