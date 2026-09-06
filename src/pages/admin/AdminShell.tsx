import React, { useEffect, useState } from 'react';
import { subscribeToConversations } from '../../firebase/firestore';
import { logout } from '../../firebase/auth';
import type { User } from 'firebase/auth';

// Clears both Firebase auth AND the local bypass flag on logout so the
// operator actually returns to the login screen. Without this, the
// bypass localStorage entry would survive and immediately re-admit.
const handleLogout = () => {
  try { localStorage.removeItem('__adminBypass'); localStorage.removeItem('__adminBypassEmail'); } catch { /* noop */ }
  logout();
  if (typeof window !== 'undefined') window.location.assign('/admin');
};

export type AdminSectionId =
  | 'dashboard'
  | 'analytics'
  | 'events'
  | 'blog'
  | 'splash'
  | 'foyer'
  | 'assets'
  | 'formations'
  | 'orders'
  | 'boutique'
  | 'members'
  | 'messages'
  | 'submissions'
  | 'groups'
  | 'bookings'
  | 'demande'
  | 'newsletter'
  | 'guide'
  | 'dosha'
  | 'media'
  | 'live'
  | 'feedpublic'
  | 'settings';

// ─── L'adresse de chaque section ─────────────────────────────────────────────
// Chaque onglet vit à sa propre adresse (/admin/formulaires, /admin/infolettre…)
// : Krystine peut mettre un onglet en favori, l'envoyer par courriel, revenir
// en arrière et rafraîchir sans retomber sur le tableau de bord.
export const SECTION_SLUGS: Record<AdminSectionId, string> = {
  dashboard:  'tableau-de-bord',
  analytics:  'analytics',
  orders:     'commandes',
  boutique:   'boutique',
  members:    'clients',
  messages:   'messages',
  submissions:'formulaires',
  groups:     'groupes',
  live:       'live',
  feedpublic: 'feed-public',
  events:     'evenements',
  blog:       'blogue',
  splash:     'ecran-accueil',
  foyer:      'foyer',
  bookings:   'demandes',
  demande:    'demander-un-changement',
  newsletter: 'infolettre',
  guide:      'parcours-guides',
  dosha:      'quiz-dosha',
  media:      'mediatheque',
  formations: 'formations',
  assets:     'assets',
  settings:   'parametres',
};

const PAR_SLUG = Object.entries(SECTION_SLUGS).reduce<Record<string, AdminSectionId>>(
  (acc, [id, slug]) => { acc[slug] = id as AdminSectionId; return acc; }, {},
);

/** L'adresse d'une section : sectionToSlug('submissions') → 'formulaires'. */
export const sectionToSlug = (s: AdminSectionId): string => SECTION_SLUGS[s];

/** La section d'une adresse, ou null si l'adresse ne correspond à rien. */
export const slugToSection = (slug?: string): AdminSectionId | null =>
  (slug && PAR_SLUG[slug]) || null;

interface NavItem {
  id: AdminSectionId;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard',  label: 'Tableau de bord',  icon: 'fa-gauge-high' },
  { id: 'analytics',  label: 'Analytics Shopify', icon: 'fa-chart-line' },
  { id: 'orders',     label: 'Commandes',        icon: 'fa-box' },
  { id: 'boutique',   label: 'Boutique',         icon: 'fa-basket-shopping' },
  { id: 'members',    label: 'Clients',          icon: 'fa-users' },
  { id: 'messages',   label: 'Messages',         icon: 'fa-comments' },
  { id: 'submissions', label: 'Formulaires',     icon: 'fa-clipboard-list' },
  { id: 'groups',     label: 'Groupes',          icon: 'fa-users-rectangle' },
  { id: 'live',       label: 'Live',             icon: 'fa-tower-broadcast' },
  { id: 'feedpublic', label: 'Feed public',      icon: 'fa-newspaper' },
  { id: 'events',     label: 'Événements & Conférences', icon: 'fa-calendar' },
  { id: 'blog',       label: 'Blogue',           icon: 'fa-pen-nib' },
  { id: 'splash',     label: 'Écran d\'accueil', icon: 'fa-wand-magic-sparkles' },
  { id: 'foyer',      label: 'Le Foyer',         icon: 'fa-fire' },
  { id: 'bookings',   label: 'Demandes',         icon: 'fa-inbox' },
  { id: 'demande',    label: 'Demander un changement', icon: 'fa-bolt' },
  { id: 'newsletter', label: 'Infolettre',       icon: 'fa-envelope' },
  { id: 'guide',      label: 'Parcours guidés',  icon: 'fa-compass' },
  { id: 'dosha',      label: 'Quiz Dosha',       icon: 'fa-circle-nodes' },
  { id: 'media',      label: 'Médiathèque',      icon: 'fa-photo-film' },
  { id: 'formations', label: 'Formations',       icon: 'fa-graduation-cap' },
  { id: 'assets',     label: 'Assets et téléchargements', icon: 'fa-download' },
  { id: 'settings',   label: 'Paramètres',       icon: 'fa-gear' },
];

interface Props {
  user: User;
  section: AdminSectionId;
  onSectionChange: (s: AdminSectionId) => void;
  children: React.ReactNode;
}

const AdminShell: React.FC<Props> = ({ user, section, onSectionChange, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV.find(n => n.id === section);
  // Messages du soutien pas encore lus par l'admin : pastille sur « Messages »
  // et sur le bouton du menu mobile, en direct.
  const [nonLus, setNonLus] = useState(0);
  useEffect(() => subscribeToConversations(list => setNonLus(list.reduce((n, c) => n + (c.unreadByAdmin || 0), 0))), []);

  return (
    <div
      className="min-h-screen flex dark:bg-[#151d19]"
      style={{ background: 'radial-gradient(120% 80% at 78% 0%, rgba(250,247,240,0.9), transparent 60%), #EEE7DB' }}
    >
      {/* Sidebar : panneau de verre flottant sur le parchemin */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="m-3 flex min-h-0 flex-1 flex-col rounded-[24px] border border-white/60 bg-white/45 shadow-[0_18px_50px_-20px_rgba(41,48,39,0.35)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#293027]/50">
          <div className="border-b border-[#38403a]/10 px-6 pt-7 pb-5 dark:border-white/10">
            <img src="https://storage.googleapis.com/inspirata/Vata/1%20(1).png" alt="Krystine St-Laurent" className="mb-4 h-10 w-auto dark:brightness-150 dark:invert" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B4A2F]">Espace Auteure</p>
            <p className="mt-1 font-serif text-sm text-[#38403a]/80 dark:text-white/70">Krystine St-Laurent</p>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {NAV.map(item => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onSectionChange(item.id); setMobileOpen(false); }}
                  className={`mb-0.5 flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm transition-colors ${
                    active
                      ? 'bg-[#BA7B39] text-[#293027] shadow-[0_6px_18px_-8px_rgba(186,123,57,0.7)]'
                      : 'text-[#38403a]/70 hover:bg-white/60 hover:text-[#38403a] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white'
                  }`}
                >
                  <i className={`fa-solid ${item.icon} w-4 text-center ${active ? '' : 'text-[#8B4A2F]/70'}`} />
                  <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
                  {item.id === 'messages' && nonLus > 0 && (
                    <span
                      aria-label={`${nonLus} message${nonLus > 1 ? 's' : ''} non lu${nonLus > 1 ? 's' : ''}`}
                      className={`ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums ${active ? 'bg-[#293027] text-[#d9a05b]' : 'bg-[#BA7B39] text-[#293027] shadow-[0_0_0_3px_rgba(186,123,57,0.25)]'}`}
                    >
                      {nonLus > 99 ? '99+' : nonLus}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-[#38403a]/10 px-6 py-4 text-xs text-[#38403a]/70 dark:border-white/10 dark:text-white/60">
            <div className="mb-3 flex items-center gap-3">
              {user.photoURL && <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full border border-[#BA7B39]/40" />}
              <div className="min-w-0">
                <p className="truncate text-[#38403a] dark:text-white">{user.displayName || user.email?.split('@')[0]}</p>
                <p className="truncate text-[11px] text-[#38403a]/50 dark:text-white/50">{user.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full text-left text-[11px] uppercase tracking-widest text-[#38403a]/50 transition-colors hover:text-red-500 dark:text-white/50">
              <i className="fa-solid fa-right-from-bracket mr-2" /> Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && <div className="fixed inset-0 z-30 bg-[#38403a]/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/50 bg-[#EEE7DB]/60 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#151d19]/60">
          <button onClick={() => setMobileOpen(true)} className="h-8 w-8 text-[#38403a] lg:hidden dark:text-white">
            <i className="fa-solid fa-bars text-lg" />
            {nonLus > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#BA7B39] ring-2 ring-[#EEE7DB]" />}
          </button>
          <div className="flex-1">
            <h1 className="font-serif text-xl text-[#293027] md:text-2xl dark:text-white" style={{ letterSpacing: '-0.01em' }}>{current?.label}</h1>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-widest text-[#38403a]/50 transition-colors hover:text-[#8B4A2F] dark:text-white/50">
            <i className="fa-solid fa-up-right-from-square mr-2" /> Voir le site
          </a>
        </header>
        <div className="mx-auto max-w-6xl p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminShell;
