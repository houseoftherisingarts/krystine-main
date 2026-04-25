import React, { useState } from 'react';
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
  | 'orders'
  | 'boutique'
  | 'members'
  | 'messages'
  | 'submissions'
  | 'groups'
  | 'bookings'
  | 'newsletter'
  | 'guide'
  | 'dosha'
  | 'media'
  | 'settings';

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
  { id: 'events',     label: 'Événements & Conférences', icon: 'fa-calendar' },
  { id: 'blog',       label: 'Blogue',           icon: 'fa-pen-nib' },
  { id: 'splash',     label: 'Écran d\'accueil', icon: 'fa-wand-magic-sparkles' },
  { id: 'bookings',   label: 'Demandes',         icon: 'fa-inbox' },
  { id: 'newsletter', label: 'Infolettre',       icon: 'fa-envelope' },
  { id: 'guide',      label: 'Parcours guidés',  icon: 'fa-compass' },
  { id: 'dosha',      label: 'Quiz Dosha',       icon: 'fa-circle-nodes' },
  { id: 'media',      label: 'Médiathèque',      icon: 'fa-photo-film' },
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

  return (
    <div className="min-h-screen dark:bg-[#2E1A14] flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#3A251E] text-white flex flex-col transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-0`}>
        <div className="px-6 pt-8 pb-6 border-b border-white/10">
          <img src="https://storage.googleapis.com/inspirata/Vata/1%20(1).png" alt="Krystine St-Laurent" className="h-10 w-auto mb-4" style={{ filter: 'invert(1) brightness(1.5)' }} />
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#B8532F] font-bold">Espace Auteure</p>
          <p className="text-sm font-serif italic text-white/70 mt-1">Krystine St-Laurent</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV.map(item => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onSectionChange(item.id); setMobileOpen(false); }}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm text-left transition-colors border-l-4 ${active ? 'bg-white/5 border-[#B8532F] text-[#B8532F]' : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'}`}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center`} />
                <span className="uppercase tracking-wider text-xs font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-4 border-t border-white/10 text-xs text-white/60">
          <div className="flex items-center gap-3 mb-3">
            {user.photoURL && <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-[#B8532F]/30" />}
            <div className="min-w-0">
              <p className="truncate text-white">{user.displayName || user.email?.split('@')[0]}</p>
              <p className="truncate text-white/50 text-[11px]">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full text-left text-[11px] uppercase tracking-widest text-white/50 hover:text-red-400 transition-colors">
            <i className="fa-solid fa-right-from-bracket mr-2" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="bg-white dark:bg-[#3A251E] border-b border-[#3A251E]/10 dark:border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden w-8 h-8 text-[#3A251E] dark:text-white">
            <i className="fa-solid fa-bars text-lg" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-serif text-[#3A251E] dark:text-white">{current?.label}</h1>
          </div>
          <a href="/" target="_blank" rel="noopener noreferrer" className="text-xs uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 hover:text-[#B8532F] transition-colors">
            <i className="fa-solid fa-up-right-from-square mr-2" /> Voir le site
          </a>
        </header>
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminShell;
