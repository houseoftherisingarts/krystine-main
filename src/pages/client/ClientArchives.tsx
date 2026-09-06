import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  getMemberInbox, markInboxRead, getNewsletter,
  type InboxPointer, type NewsletterDoc,
} from '../../firebase/firestore';
import { RenderBlocksWeb } from '../../lib/newsletterRenderer';
import { CadreOr, EtiquetteOr } from '../../components/client/CadreOr';

// Une lettre d'or déposée depuis la messagerie (ClientSupport) demande à
// s'ouvrir ici par cette clé.
export const CLE_LETTRE_A_OUVRIR = 'ksl-lettre-a-ouvrir';

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
      .then(liste => {
        setInbox(liste);
        let voulu: string | null = null;
        try { voulu = sessionStorage.getItem(CLE_LETTRE_A_OUVRIR); sessionStorage.removeItem(CLE_LETTRE_A_OUVRIR); } catch { /* noop */ }
        const p = voulu ? liste.find(x => x.newsletterId === voulu) : null;
        if (p) void open(p);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;
  }

  if (!inbox.length) {
    return (
      <div className="text-center py-16">
        <i className="fa-regular fa-envelope text-4xl text-[#293027]/30 dark:text-white/30 mb-4 block" />
        <p className="text-[#293027]/60 dark:text-white/60 font-serif italic">
          {lang === 'FR' ? 'Aucune lettre reçue pour l\u2019instant.' : 'No letters received yet.'}
        </p>
      </div>
    );
  }

  // Reading view
  if (openId && openDoc) {
    const or = !!openDoc.lettreDor;
    const Cadre: React.ElementType = or ? CadreOr : 'article';
    return (
      <div>
        <button onClick={() => { setOpenId(null); setOpenDoc(null); }} className="mb-6 text-xs uppercase tracking-widest text-[#8B4A2F] hover:underline">
          <i className="fa-solid fa-arrow-left mr-2" /> {lang === 'FR' ? 'Retour aux lettres' : 'Back to letters'}
        </button>
        <Cadre {...(or ? { large: true } : {})} className={`bg-white dark:bg-[#293027] rounded-[24px] p-6 md:p-10 ${or ? '' : 'border border-[#293027]/5 dark:border-white/5'}`}>
          {or && <EtiquetteOr lang={lang} className="mb-3" />}
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B4A2F] font-bold mb-3">
            {openDoc.sentAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || ''}
          </p>
          <h1 className="text-3xl md:text-4xl font-serif text-[#293027] dark:text-white mb-6">{openDoc.subject}</h1>
          {openDoc.preheader && <p className="text-[#293027]/60 dark:text-white/60 italic mb-8">{openDoc.preheader}</p>}
          <RenderBlocksWeb blocks={openDoc.blocks || []} />
        </Cadre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadingOpen && <div className="py-4 text-center text-[#8B4A2F]"><i className="fa-solid fa-circle-notch fa-spin" /></div>}
      {inbox.map(item => {
        const unread = !item.readAt;
        const or = !!item.lettreDor;
        const Boite: React.ElementType = or ? CadreOr : 'button';
        return (
          <Boite
            key={item.id}
            role={or ? 'button' : undefined}
            tabIndex={or ? 0 : undefined}
            onClick={() => open(item)}
            onKeyDown={or ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void open(item); } } : undefined}
            className={`w-full text-left rounded-[18px] p-5 transition-colors cursor-pointer ${
              or ? 'bg-white dark:bg-[#293027]'
              : unread
                ? 'border border-[#BA7B39]/40 bg-[#BA7B39]/5 hover:border-[#BA7B39]'
                : 'border border-[#293027]/5 dark:border-white/5 bg-white dark:bg-[#293027]/60 hover:border-[#BA7B39]'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${unread ? (or ? 'bg-[#c9a24a]' : 'bg-[#BA7B39]') : 'bg-transparent'}`} />
              <div className="flex-1 min-w-0">
                {or && <EtiquetteOr lang={lang} className="mb-1.5" />}
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className={`font-serif text-lg text-[#293027] dark:text-white truncate ${unread ? 'font-bold' : ''}`}>
                    {item.subject}
                  </h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50 shrink-0">
                    {item.receivedAt?.toDate().toLocaleDateString(lang === 'FR' ? 'fr-CA' : 'en-CA') || ''}
                  </span>
                </div>
                {item.title && <p className="text-xs text-[#293027]/60 dark:text-white/60 mt-1">{item.title}</p>}
              </div>
              <i className="fa-solid fa-chevron-right text-[#293027]/30 dark:text-white/30 mt-1" />
            </div>
          </Boite>
        );
      })}
    </div>
  );
};

export default ClientArchives;
