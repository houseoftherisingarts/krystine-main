import React, { useEffect, useMemo, useRef, useState } from 'react';
import BadgeVedette from '../communaute/BadgeVedette';
import {
  BADGES, badgePour, envoyerMessage, retirerMessage, suivreMessages, suivrePresences,
  type MessageDirect, type PresenceDirect,
} from '../../firebase/direct';

// Le clavardage du direct. Les badges se lisent sur le compteur de messages de
// la soirée : plus une personne participe, plus son badge monte, et Krystine
// voit d'un coup d'œil qui tient la conversation.

const ChatDirect: React.FC<{
  directId: string;
  moi: { uid: string; nom: string; photoURL?: string } | null;
  animatrice?: boolean;
  onConnexion: () => void;
  onMessageEnvoye?: (total: number) => void;
  onNouveauMessage?: () => void;
}> = ({ directId, moi, animatrice, onConnexion, onMessageEnvoye, onNouveauMessage }) => {
  const [messages, setMessages] = useState<MessageDirect[]>([]);
  const [presences, setPresences] = useState<PresenceDirect[]>([]);
  const [texte, setTexte] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const filRef = useRef<HTMLDivElement | null>(null);
  const compte = useRef(0);

  useEffect(() => suivreMessages(directId, m => {
    setMessages(m);
    if (m.length > compte.current) onNouveauMessage?.();
    compte.current = m.length;
  }), [directId, onNouveauMessage]);
  useEffect(() => suivrePresences(directId, setPresences), [directId]);

  useEffect(() => {
    const f = filRef.current;
    if (f) f.scrollTop = f.scrollHeight;
  }, [messages.length]);

  // Le compteur de messages par personne, pour le badge affiché à côté du nom.
  const parPersonne = useMemo(() => {
    const m = new Map<string, number>();
    presences.forEach(p => m.set(p.uid, p.messages || 0));
    messages.forEach(msg => { if (!m.has(msg.uid)) m.set(msg.uid, 1); });
    return m;
  }, [messages, presences]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moi) { onConnexion(); return; }
    const t = texte.trim();
    if (!t || envoi) return;
    setEnvoi(true);
    try {
      await envoyerMessage(directId, { ...moi, animatrice }, t);
      setTexte('');
      onMessageEnvoye?.((parPersonne.get(moi.uid) || 0) + 1);
    } finally { setEnvoi(false); }
  };

  const meneuses = [...presences].filter(p => (p.messages || 0) > 0).slice(0, 3);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {meneuses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="text-[10px] uppercase tracking-[0.22em] text-[#EEE7DB]/40">Au coin du feu</span>
          {meneuses.map(p => {
            const b = badgePour(p.messages || 0);
            return (
              <span key={p.uid} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
                    style={{ borderColor: `${b?.couleur || '#BA7B39'}55`, color: b?.couleur || '#BA7B39' }}>
                <i className="fa-solid fa-fire text-[9px]" />{p.nom.split(' ')[0]}
              </span>
            );
          })}
        </div>
      )}

      <div ref={filRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="pt-6 text-center font-serif text-[#EEE7DB]/45">
            Le feu est allumé. Écrivez le premier mot.
          </p>
        )}
        {messages.map(m => {
          const b = badgePour(parPersonne.get(m.uid) || 1);
          return (
            <div key={m.id} className="group flex gap-2.5">
              <div className="mt-0.5 h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/15 bg-[#BA7B39]/20 bg-cover bg-center"
                   style={{ backgroundImage: m.photoURL ? `url(${m.photoURL})` : undefined }}>
                {!m.photoURL && <span className="flex h-full w-full items-center justify-center font-serif text-xs text-[#E6C79B]">{m.nom[0]}</span>}
              </div>
              <div className="min-w-0">
                <p className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
                  <span className={m.animatrice ? 'font-bold text-[#E8A85C]' : 'text-[#EEE7DB]/80'}>{m.nom}</span>
                  {!m.animatrice && <BadgeVedette uid={m.uid} sombre />}
                  {m.animatrice
                    ? <span className="rounded-full bg-[#BA7B39] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#161f1a]">Krystine</span>
                    : b && <span className="text-[10px] uppercase tracking-widest" style={{ color: b.couleur }}>{b.nom}</span>}
                  {animatrice && (
                    <button onClick={() => retirerMessage(directId, m.id)}
                      className="ml-auto hidden text-[10px] uppercase tracking-widest text-[#EEE7DB]/30 hover:text-red-400 group-hover:inline">
                      Retirer
                    </button>
                  )}
                </p>
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-[#EEE7DB]/90">{m.texte}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={envoyer} className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2">
          <input
            value={texte}
            onChange={e => setTexte(e.target.value)}
            onFocus={() => { if (!moi) onConnexion(); }}
            maxLength={400}
            placeholder={moi ? 'Écrivez au coin du feu…' : 'Connectez-vous pour écrire'}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-[13px] text-[#EEE7DB] placeholder-[#EEE7DB]/35 outline-none transition-colors focus:border-[#BA7B39]"
          />
          <button type="submit" disabled={envoi || !texte.trim()}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#BA7B39] text-[#161f1a] transition-colors hover:bg-[#dcb874] disabled:opacity-40">
            <i className="fa-solid fa-paper-plane text-sm" />
          </button>
        </div>
        <p className="mt-2 px-1 text-[10px] uppercase tracking-[0.18em] text-[#EEE7DB]/30">
          {BADGES.map(b => `${b.nom} à ${b.seuil}`).join(' · ')}
        </p>
      </form>
    </div>
  );
};

export default ChatDirect;
