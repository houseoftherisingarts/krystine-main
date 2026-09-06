import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { ensureConversation, sendMessage, subscribeToMessages, markConversationRead, type MessageDoc } from '../../firebase/firestore';
import { CadreOr, EtiquetteOr } from '../../components/client/CadreOr';
import { CLE_LETTRE_A_OUVRIR } from './ClientArchives';

// Ouvre une lettre d'or : l'onglet Lettres du portail écoute cet événement
// et lit la clé pour ouvrir la bonne lettre.
const ouvrirLettreDor = (newsletterId: string) => {
  try { sessionStorage.setItem(CLE_LETTRE_A_OUVRIR, newsletterId); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent('ksl:ouvrir-lettres'));
};

const ClientSupport: React.FC = () => {
  const { user, member, lang } = useApp();
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    ensureConversation(user.uid, {
      memberEmail: user.email || '',
      memberName: member?.displayName || user.displayName || '',
      memberPhotoURL: member?.photoURL || user.photoURL || '',
    }).catch(() => {});
    const unsub = subscribeToMessages(user.uid, setMessages);
    markConversationRead(user.uid, 'client').catch(() => {});
    return unsub;
  }, [user, member]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    if (!user || !draft.trim()) return;
    setSending(true);
    try {
      await sendMessage(user.uid, 'client', draft.trim(), {
        memberEmail: user.email || '',
        memberName: member?.displayName || user.displayName || '',
        memberPhotoURL: member?.photoURL || user.photoURL || '',
      });
      setDraft('');
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-[60vh] min-h-[400px]">
      <div className="mb-4">
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold">
          {lang === 'FR' ? 'Écrire à l’équipe' : 'Write to support'}
        </h3>
        <p className="text-xs text-[#293027]/40 dark:text-white/40 mt-1">
          {lang === 'FR' ? "L'équipe Inspirata vous répondra dès que possible." : 'The Inspirata team will reply as soon as possible.'}
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#EEE7DB] dark:bg-white/5 rounded-[20px] p-5 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#293027]/40 dark:text-white/40">
            <i className="fa-regular fa-comments text-3xl mb-3" />
            <p className="text-sm italic">{lang === 'FR' ? 'Commencez la conversation.' : 'Start the conversation.'}</p>
          </div>
        ) : messages.map(m => {
          const me = m.sender === 'client';
          if (m.type === 'lettreDor' && m.newsletterId) {
            return (
              <div key={m.id} className="flex justify-start">
                <CadreOr fin className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3">
                  <EtiquetteOr lang={lang} />
                  <p className="mt-1.5 font-serif text-lg text-[#293027] dark:text-white">{m.subject || m.body}</p>
                  <button
                    type="button"
                    onClick={() => ouvrirLettreDor(m.newsletterId!)}
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027]"
                    style={{ background: 'linear-gradient(115deg, #b8862b, #f6dd8a 45%, #c9a24a)' }}
                  >
                    <i className="fa-solid fa-envelope-open" /> {lang === 'FR' ? 'Lire la lettre' : 'Read the letter'}
                  </button>
                  <span className="block text-[10px] opacity-50 mt-2 text-[#293027] dark:text-white">
                    {m.createdAt?.toDate().toLocaleTimeString(lang === 'FR' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' }) || ''}
                  </span>
                </CadreOr>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                me
                  ? 'bg-[#293027] text-white dark:bg-[#BA7B39] dark:text-[#293027] rounded-br-sm'
                  : 'bg-white dark:bg-[#293027] text-[#293027] dark:text-white border border-[#293027]/5 dark:border-white/5 rounded-bl-sm'
              }`}>
                {m.body}
                <span className="block text-[10px] opacity-50 mt-1">
                  {m.createdAt?.toDate().toLocaleTimeString(lang === 'FR' ? 'fr-CA' : 'en-CA', { hour: '2-digit', minute: '2-digit' }) || ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={lang === 'FR' ? 'Votre message…' : 'Your message…'}
          className="flex-1 px-4 py-3 rounded-full border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027] dark:text-white outline-none focus:border-[#BA7B39]"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="px-6 bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#BA7B39] hover:text-[#293027] transition-colors disabled:opacity-50"
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>
    </div>
  );
};

export default ClientSupport;
