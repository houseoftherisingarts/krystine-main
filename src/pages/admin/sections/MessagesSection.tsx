import React, { useEffect, useRef, useState } from 'react';
import {
  subscribeToConversations, subscribeToMessages, sendMessage, markConversationRead,
  type ConversationDoc, type MessageDoc,
} from '../../../firebase/firestore';
import type { User } from 'firebase/auth';
import { Card, EmptyState } from '../primitives';

const MessagesSection: React.FC<{ user: User }> = ({ user }) => {
  const [convs, setConvs] = useState<ConversationDoc[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToConversations(setConvs);
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeUid) return;
    const unsub = subscribeToMessages(activeUid, setMessages);
    markConversationRead(activeUid, 'admin').catch(() => {});
    return unsub;
  }, [activeUid]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const active = convs.find(c => c.uid === activeUid);

  const send = async () => {
    if (!activeUid || !draft.trim()) return;
    setSending(true);
    try {
      await sendMessage(activeUid, 'admin', draft.trim());
      setDraft('');
    } finally { setSending(false); }
  };

  if (convs.length === 0) return <EmptyState icon="fa-envelope">Aucune conversation.</EmptyState>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-200px)] min-h-[500px]">
      {/* Conversations list */}
      <Card className="overflow-y-auto">
        {convs.map(c => {
          const isActive = c.uid === activeUid;
          const unread = c.unreadByAdmin || 0;
          return (
            <button
              key={c.uid}
              onClick={() => setActiveUid(c.uid)}
              className={`w-full text-left p-4 border-b border-[#3A251E]/5 dark:border-white/5 hover:bg-[#B8532F]/5 transition-colors ${isActive ? 'bg-[#B8532F]/10' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-cover bg-center bg-[#F4E7DD] dark:bg-white/5 shrink-0 border border-[#3A251E]/5 dark:border-white/10" style={{ backgroundImage: c.memberPhotoURL ? `url(${c.memberPhotoURL})` : undefined }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-serif text-sm text-[#3A251E] dark:text-white truncate">{c.memberName || c.memberEmail}</p>
                    {unread > 0 && <span className="text-[10px] font-bold bg-[#B8532F] text-[#3A251E] px-2 py-0.5 rounded-full">{unread}</span>}
                  </div>
                  <p className="text-xs text-[#3A251E]/50 dark:text-white/50 truncate">{c.memberEmail}</p>
                  {c.lastMessage && <p className="text-xs text-[#3A251E]/60 dark:text-white/60 truncate mt-1">{c.lastMessage}</p>}
                </div>
              </div>
            </button>
          );
        })}
      </Card>

      {/* Thread */}
      <Card className="flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-[#3A251E]/40 dark:text-white/40 text-sm italic">
            Sélectionnez une conversation.
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-[#3A251E]/5 dark:border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cover bg-center bg-[#F4E7DD] dark:bg-white/5 shrink-0 border border-[#3A251E]/5 dark:border-white/10" style={{ backgroundImage: active.memberPhotoURL ? `url(${active.memberPhotoURL})` : undefined }} />
              <div className="min-w-0">
                <p className="font-serif text-[#3A251E] dark:text-white truncate">{active.memberName || active.memberEmail}</p>
                <p className="text-xs text-[#3A251E]/50 dark:text-white/50 truncate">{active.memberEmail}</p>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F4E7DD] dark:bg-white/5">
              {messages.map(m => {
                const me = m.sender === 'admin';
                return (
                  <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      me
                        ? 'bg-[#B8532F] text-[#3A251E] rounded-br-sm'
                        : 'bg-white dark:bg-[#3A251E] text-[#3A251E] dark:text-white border border-[#3A251E]/5 dark:border-white/5 rounded-bl-sm'
                    }`}>
                      {m.body}
                      <span className="block text-[10px] opacity-50 mt-1">
                        {m.createdAt?.toDate().toLocaleString('fr-CA', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) || ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-[#3A251E]/5 dark:border-white/5 flex gap-3">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={`Répondre à ${active.memberName || active.memberEmail}…`}
                className="flex-1 px-4 py-3 rounded-full border border-[#3A251E]/10 dark:border-white/10 bg-[#F4E7DD] dark:bg-white/5 text-[#3A251E] dark:text-white outline-none focus:border-[#B8532F]"
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim()}
                className="px-6 bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-paper-plane" />
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default MessagesSection;
