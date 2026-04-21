import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { ensureConversation, sendMessage, subscribeToMessages, markConversationRead, type MessageDoc } from '../../firebase/firestore';

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
        <h3 className="text-sm uppercase tracking-widest text-[#0B1A36]/60 dark:text-white/60 font-bold">
          {lang === 'FR' ? 'Écrire au soutien' : 'Write to support'}
        </h3>
        <p className="text-xs text-[#0B1A36]/40 dark:text-white/40 mt-1">
          {lang === 'FR' ? "L'équipe Inspirata vous répondra dès que possible." : 'The Inspirata team will reply as soon as possible.'}
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#F5F5F0] dark:bg-white/5 rounded-[20px] p-5 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#0B1A36]/40 dark:text-white/40">
            <i className="fa-regular fa-comments text-3xl mb-3" />
            <p className="text-sm italic">{lang === 'FR' ? 'Commencez la conversation.' : 'Start the conversation.'}</p>
          </div>
        ) : messages.map(m => {
          const me = m.sender === 'client';
          return (
            <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                me
                  ? 'bg-[#0B1A36] text-white dark:bg-[#D4AF37] dark:text-[#0B1A36] rounded-br-sm'
                  : 'bg-white dark:bg-[#0B1A36] text-[#0B1A36] dark:text-white border border-[#0B1A36]/5 dark:border-white/5 rounded-bl-sm'
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
          className="flex-1 px-4 py-3 rounded-full border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="px-6 bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors disabled:opacity-50"
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </div>
    </div>
  );
};

export default ClientSupport;
