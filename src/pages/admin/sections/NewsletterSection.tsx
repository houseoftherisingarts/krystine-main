import React, { useState } from 'react';
import SubscribersPanel from './newsletter/SubscribersPanel';
import NewsletterList from './newsletter/NewsletterList';
import Composer from './newsletter/Composer';

type View =
  | { kind: 'list' }
  | { kind: 'composer'; id: string | null };

type Tab = 'subscribers' | 'newsletters';

const NewsletterSection: React.FC = () => {
  const [tab, setTab] = useState<Tab>('subscribers');
  const [view, setView] = useState<View>({ kind: 'list' });

  // Composer is a full-bleed view inside the admin shell — suppress the tab bar.
  if (tab === 'newsletters' && view.kind === 'composer') {
    return <Composer newsletterId={view.id} onBack={() => setView({ kind: 'list' })} />;
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('subscribers')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
            tab === 'subscribers'
              ? 'bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E]'
              : 'bg-white dark:bg-[#3A251E]/60 text-[#3A251E]/60 dark:text-white/60 hover:text-[#B8532F] border border-[#3A251E]/5 dark:border-white/5'
          }`}
        >
          <i className="fa-solid fa-users mr-2" /> Abonnés
        </button>
        <button
          onClick={() => { setTab('newsletters'); setView({ kind: 'list' }); }}
          className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
            tab === 'newsletters'
              ? 'bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E]'
              : 'bg-white dark:bg-[#3A251E]/60 text-[#3A251E]/60 dark:text-white/60 hover:text-[#B8532F] border border-[#3A251E]/5 dark:border-white/5'
          }`}
        >
          <i className="fa-solid fa-envelope-open-text mr-2" /> Infolettres
        </button>
      </div>

      {tab === 'subscribers' && <SubscribersPanel />}
      {tab === 'newsletters' && view.kind === 'list' && (
        <NewsletterList onOpen={id => setView({ kind: 'composer', id })} />
      )}
    </div>
  );
};

export default NewsletterSection;
