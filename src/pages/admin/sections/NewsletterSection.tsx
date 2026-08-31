import React, { useState } from 'react';
import SubscribersPanel from './newsletter/SubscribersPanel';
import NewsletterList from './newsletter/NewsletterList';
import Composer from './newsletter/Composer';
import LivePanel from './newsletter/LivePanel';
import CalendarPanel from './newsletter/CalendarPanel';
import AutomaticsPanel from './newsletter/AutomaticsPanel';

type View =
  | { kind: 'list' }
  | { kind: 'composer'; id: string | null };

type Tab = 'newsletters' | 'calendar' | 'subscribers' | 'live' | 'automatics';

const TABS: Array<{ key: Tab; icon: string; label: string }> = [
  { key: 'newsletters', icon: 'fa-envelope-open-text', label: 'Infolettres' },
  { key: 'calendar', icon: 'fa-calendar-days', label: 'Calendrier' },
  { key: 'subscribers', icon: 'fa-users', label: 'Abonnés' },
  { key: 'live', icon: 'fa-tower-broadcast', label: 'Direct' },
  { key: 'automatics', icon: 'fa-robot', label: 'Automatiques' },
];

const NewsletterSection: React.FC = () => {
  const [tab, setTab] = useState<Tab>('newsletters');
  const [view, setView] = useState<View>({ kind: 'list' });

  // Le composeur prend toute la place : la barre d'onglets s'efface.
  if (view.kind === 'composer') {
    return <Composer newsletterId={view.id} onBack={() => setView({ kind: 'list' })} />;
  }
  const open = (id: string | null) => setView({ kind: 'composer', id });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
              tab === t.key
                ? 'bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027]'
                : 'bg-white dark:bg-[#293027]/60 text-[#293027]/60 dark:text-white/60 hover:text-[#8B4A2F] border border-[#293027]/5 dark:border-white/5'
            }`}
          >
            <i className={`fa-solid ${t.icon} mr-2`} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'newsletters' && <NewsletterList onOpen={open} />}
      {tab === 'calendar' && <CalendarPanel onOpen={open} onNew={() => open(null)} />}
      {tab === 'subscribers' && <SubscribersPanel />}
      {tab === 'live' && <LivePanel />}
      {tab === 'automatics' && <AutomaticsPanel />}
    </div>
  );
};

export default NewsletterSection;
