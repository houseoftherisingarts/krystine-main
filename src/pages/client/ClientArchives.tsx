import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  getMemberInbox, markInboxRead, getNewsletter,
  type InboxPointer, type NewsletterDoc,
} from '../../firebase/firestore';
import { RenderBlocksWeb } from '../../lib/newsletterRenderer';

const ClientArchives: React.FC = () => {
  const { user, lang } = useApp();
  const [inbox, setInbox] = useState<InboxPointer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<NewsletterDoc | null>(null);
  const [loadingOpen, setLoadingOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getMemberInbox(user.uid)
      .then(setInbox)
      .finally(() => setLoading(false));
  }, [user]);

  const open = async (p: InboxPointer) => {
    if (!user || !p.newsletterId) return;
    setOpenId(p.newsletterId);
    setLoadingOpen(true);
    try {
      const doc = await getNewsletter(p.newsletterId);
      setOpenDoc(doc);
      // Flip read-state; non-fatal if it fails (rules / offline).
      if (!p.readAt) {
        try { await markInboxRead(user.uid, p.newsletterId); } catch { /* noop */ }
        setInbox(prev => prev.map(x => x.newsletterId === p.newsletterId ? { ...x, readAt: x.readAt || (new Date() as any) } : x));
      }
    } finally {
      setLoadingOpen(false);
    }
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>;
  }

  if (!inbox.length) {
    return (
      <div className="text-center py-16">
        <i className="fa-regular fa-envelope text-4xl text-[#3A251E]/30 dark:text-white/30 mb-4 block" />
        <p className="text-[#3A251E]/60 dark:text-white/60 font-serif italic">
          {lang === 'FR' ? 'Aucune infolettre reçue pour l\u2019instant.' : 'No newsletters received yet.'}
        </p>
      </div>
    );
  }

  // Reading view
  if (openId && openDoc) {
    return (
      <div>
        <button onClick={() => { setOpenId(null); setOpenDoc(null); }} className="mb-6 text-xs uppercase tracking-widest text-[#B8532F] hover:underline">
          <i className="fa-solid fa-arrow-left mr-2" /> {lang === 'FR' ? 'Retour aux archives' : 'Back to archives'}
        </button>
        <article className="max-w-2xl mx-auto bg-white dark:bg-[#3A251E] rounded-[24px] border border-[#3A251E]/5 dark:border-white/5 p-6 md:p-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#B8532F] font-bold mb-3">
            {openDoc.sentAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || ''}
          </p>
          <h1 className="text-3xl md:text-4xl font-serif text-[#3A251E] dark:text-white mb-6">{openDoc.subject}</h1>
          {openDoc.preheader && <p className="text-[#3A251E]/60 dark:text-white/60 italic mb-8">{openDoc.preheader}</p>}
          <RenderBlocksWeb blocks={openDoc.blocks || []} />
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadingOpen && <div className="py-4 text-center text-[#B8532F]"><i className="fa-solid fa-circle-notch fa-spin" /></div>}
      {inbox.map(item => {
        const unread = !item.readAt;
        return (
          <button
            key={item.id}
            onClick={() => open(item)}
            className={`w-full text-left border rounded-[18px] p-5 transition-colors hover:border-[#B8532F] ${
              unread
                ? 'border-[#B8532F]/40 bg-[#B8532F]/5'
                : 'border-[#3A251E]/5 dark:border-white/5 bg-white dark:bg-[#3A251E]/60'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${unread ? 'bg-[#B8532F]' : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className={`font-serif text-lg text-[#3A251E] dark:text-white truncate ${unread ? 'font-bold' : ''}`}>
                    {item.subject}
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 shrink-0">
                    {item.receivedAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                  </span>
                </div>
                {item.title && <p className="text-xs text-[#3A251E]/60 dark:text-white/60 mt-1">{item.title}</p>}
              </div>
              <i className="fa-solid fa-chevron-right text-[#3A251E]/30 dark:text-white/30 mt-1" />
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ClientArchives;
