import React, { useEffect, useRef, useState } from 'react';
import {
  subscribeToConversations, subscribeToMessages, sendMessage, markConversationRead,
  envoyerMessageKrystine, getMember,
  type ConversationDoc, type MessageDoc,
} from '../../../firebase/firestore';
import { getMembresGroupe, type MembreGroupe } from '../../../firebase/formations';
import type { User } from 'firebase/auth';
import { Card, EmptyState } from '../primitives';

// Le mot privé de Krystine, visible sur son seul compte (Alex, 7 septembre
// 2026) : elle choisit une membre du Foyer, écrit, et coche si la membre
// peut répondre. Le message porte deKrystine et paraît signé dans sa
// messagerie (src/pages/client/ClientSupport.tsx); la case pose
// reponseAutorisee sur le fil, que les règles font respecter.
const MotPriveKrystine: React.FC = () => {
  const [ouvert, setOuvert] = useState(false);
  const [membres, setMembres] = useState<MembreGroupe[]>([]);
  const [uidChoisi, setUidChoisi] = useState('');
  const [texte, setTexte] = useState('');
  const [reponseAutorisee, setReponseAutorisee] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState('');

  useEffect(() => {
    if (!ouvert || membres.length) return;
    getMembresGroupe('foyer').then(setMembres).catch(() => setMembres([]));
  }, [ouvert, membres.length]);

  const envoyer = async () => {
    if (!uidChoisi || !texte.trim()) return;
    setEnvoi(true);
    setAvis('');
    try {
      const fiche = await getMember(uidChoisi).catch(() => null);
      await envoyerMessageKrystine(uidChoisi, texte.trim(), reponseAutorisee, {
        memberEmail: fiche?.email || '',
        memberName: fiche?.displayName || '',
        memberPhotoURL: fiche?.photoURL || '',
      });
      setTexte(''); setUidChoisi(''); setReponseAutorisee(true);
      setAvis('Envoyé.');
    } catch (e) {
      setAvis(e instanceof Error ? e.message : 'Le mot n’est pas parti.');
    } finally { setEnvoi(false); }
  };

  return (
    <Card className="p-4 mb-4">
      <button type="button" onClick={() => setOuvert(v => !v)} className="flex w-full items-center justify-between text-left">
        <span className="font-serif text-sm text-[#293027] dark:text-white">Mot privé de Krystine</span>
        <i className={`fa-solid fa-chevron-${ouvert ? 'up' : 'down'} text-xs text-[#293027]/40 dark:text-white/40`} />
      </button>
      {ouvert && (
        <div className="mt-3 space-y-3">
          <select
            value={uidChoisi}
            onChange={e => setUidChoisi(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027] dark:text-white text-sm outline-none focus:border-[#BA7B39]"
          >
            <option value="">Choisir une membre du Foyer…</option>
            {membres.map(m => <option key={m.uid} value={m.uid}>{m.nom || m.courriel || m.uid}</option>)}
          </select>
          <textarea
            value={texte}
            onChange={e => setTexte(e.target.value)}
            rows={3}
            placeholder="Votre mot…"
            className="w-full px-3 py-2 rounded-lg border border-[#293027]/10 dark:border-white/10 bg-[#EEE7DB] dark:bg-white/5 text-[#293027] dark:text-white text-sm outline-none focus:border-[#BA7B39] resize-none"
          />
          <label className="flex items-center gap-2 text-xs text-[#293027]/70 dark:text-white/70">
            <input type="checkbox" checked={reponseAutorisee} onChange={e => setReponseAutorisee(e.target.checked)} />
            Cette personne peut me répondre
          </label>
          {avis && <p className="text-xs text-[#8B4A2F] dark:text-[#d9a05b]">{avis}</p>}
          <button
            type="button"
            onClick={envoyer}
            disabled={envoi || !uidChoisi || !texte.trim()}
            className="px-5 py-2 bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#BA7B39] hover:text-[#293027] transition-colors disabled:opacity-50"
          >
            {envoi ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      )}
    </Card>
  );
};

const MessagesSection: React.FC<{ user: User }> = ({ user }) => {
  const [convs, setConvs] = useState<ConversationDoc[]>([]);
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Le module n'existe que sur le compte de Krystine (Alex, 7 septembre 2026).
  const estKrystine = user.email === 'krystine@inspiratanature.com';

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
              className={`w-full text-left p-4 border-b border-[#293027]/5 dark:border-white/5 hover:bg-[#BA7B39]/5 transition-colors ${isActive ? 'bg-[#BA7B39]/10' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-cover bg-center bg-[#EEE7DB] dark:bg-white/5 shrink-0 border border-[#293027]/5 dark:border-white/10" style={{ backgroundImage: c.memberPhotoURL ? `url(${c.memberPhotoURL})` : undefined }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-serif text-sm text-[#293027] dark:text-white truncate">{c.memberName || c.memberEmail}</p>
                    {unread > 0 && <span className="text-[10px] font-bold bg-[#BA7B39] text-[#293027] px-2 py-0.5 rounded-full">{unread}</span>}
                  </div>
                  <p className="text-xs text-[#293027]/50 dark:text-white/50 truncate">{c.memberEmail}</p>
                  {c.lastMessage && <p className="text-xs text-[#293027]/60 dark:text-white/60 truncate mt-1">{c.lastMessage}</p>}
                </div>
              </div>
            </button>
          );
        })}
      </Card>

      {/* Thread */}
      <Card className="flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-[#293027]/40 dark:text-white/40 text-sm italic">
            Sélectionnez une conversation.
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-[#293027]/5 dark:border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cover bg-center bg-[#EEE7DB] dark:bg-white/5 shrink-0 border border-[#293027]/5 dark:border-white/10" style={{ backgroundImage: active.memberPhotoURL ? `url(${active.memberPhotoURL})` : undefined }} />
              <div className="min-w-0">
                <p className="font-serif text-[#293027] dark:text-white truncate">{active.memberName || active.memberEmail}</p>
                <p className="text-xs text-[#293027]/50 dark:text-white/50 truncate">{active.memberEmail}</p>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#EEE7DB] dark:bg-white/5">
              {messages.map(m => {
                const me = m.sender === 'admin';
                return (
                  <div key={m.id} className={`flex ${me ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      me
                        ? 'bg-[#BA7B39] text-[#293027] rounded-br-sm'
                        : 'bg-white dark:bg-[#293027] text-[#293027] dark:text-white border border-[#293027]/5 dark:border-white/5 rounded-bl-sm'
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
            <div className="p-4 border-t border-[#293027]/5 dark:border-white/5 flex gap-3">
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={`Répondre à ${active.memberName || active.memberEmail}…`}
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
          </>
        )}
      </Card>
    </div>
  );
};

export default MessagesSection;
