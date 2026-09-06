import React, { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../../../firebase';
import type { NewsletterAudience, NewsletterBlock } from '../../../../firebase/firestore';
import { fetchAudience } from './AudiencePicker';

// La « version terminale » : Krystine parle à Iris comme à une collègue.
// Iris répond, et quand elle propose une infolettre, le composeur l'applique
// au brouillon et l'aperçu se met à jour. Krystine garde le dernier geste
// (enregistrer, programmer, envoyer).

export interface Proposal {
  title: string; subject: string; preheader: string;
  blocks: NewsletterBlock[]; audience: NewsletterAudience;
  scheduledFor: string | null; note: string;
}
interface Msg { role: 'user' | 'assistant'; content: string; proposal?: Proposal }

interface Props {
  draft: { title: string; subject: string; preheader: string; blocks: NewsletterBlock[]; audience: NewsletterAudience; scheduledFor: string | null };
  onProposal: (p: Proposal) => void;
  onClose: () => void;
}

const STARTERS = [
  'Écris l\'infolettre de la semaine prochaine sur le retour de l\'automne et le dosha Vata.',
  'Annonce le prochain direct du podcast à la liste podcast, envoi jeudi à 10 h.',
  'Retouche le deuxième paragraphe, plus court et plus chaleureux.',
];

const AssistantPanel: React.FC<Props> = ({ draft, onProposal, onClose }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAudience({}).then(r => setTags(r.tags.map(t => ({ tag: t.tag, count: t.n })))).catch(() => null);
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setErr(null);
    const next: Msg[] = [...msgs, { role: 'user', content: t }];
    setMsgs(next); setInput(''); setBusy(true);
    try {
      if (!app) throw new Error('Firebase non configuré');
      const call = httpsCallable(getFunctions(app, 'us-central1'), 'newsletterAssistant');
      const res: any = await call({
        messages: next.map(m => ({ role: m.role, content: m.content })),
        draft,
        tags,
        now: new Date().toLocaleString('sv-SE', { timeZone: 'America/Toronto' }).replace(' ', 'T'),
      });
      const { reply, proposal } = res.data || {};
      setMsgs(prev => [...prev, { role: 'assistant', content: reply || '', proposal: proposal || undefined }]);
      if (proposal) onProposal(proposal);
    } catch (e: any) {
      setErr(e?.message || 'Iris ne répond pas.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[520px] rounded-[15px] overflow-hidden bg-[#141311] text-[#EEE7DB] border border-white/10 shadow-xl">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#e0b060] font-bold">Iris</p>
          <p className="text-xs text-white/50">Dites-lui ce que vous voulez dire, à qui, et quand.</p>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white text-sm" title="Fermer"><i className="fa-solid fa-xmark" /></button>
      </div>

      <div className="flex-1 overflow-auto px-5 py-4 space-y-4 font-mono text-[13px] leading-relaxed">
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-white/60">Bonjour Krystine. Je rédige dans votre voix et je programme l'envoi. Pour commencer :</p>
            {STARTERS.map(s => (
              <button key={s} onClick={() => send(s)} className="block w-full text-left px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10">› {s}</button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-[#e0b060]' : 'text-white/90'}>
            <span className="select-none opacity-50 mr-2">{m.role === 'user' ? '›' : '◆'}</span>
            <span className="whitespace-pre-wrap">{m.content}</span>
            {m.proposal && (
              <div className="mt-2 ml-5 px-3 py-2 rounded-xl bg-[#e0b060]/10 border border-[#e0b060]/30 text-xs text-white/80">
                <i className="fa-solid fa-wand-magic-sparkles mr-2 text-[#e0b060]" />Brouillon mis à jour : « {m.proposal.subject} » · {m.proposal.blocks.length} blocs
                {m.proposal.scheduledFor ? ` · programmé ${new Date(m.proposal.scheduledFor).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
                <button onClick={() => onProposal(m.proposal!)} className="ml-3 underline text-[#e0b060]">réappliquer</button>
              </div>
            )}
          </div>
        ))}
        {busy && <p className="text-white/40"><i className="fa-solid fa-circle-notch fa-spin mr-2" />Iris écrit…</p>}
        {err && <p className="text-red-300">{err}</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="border-t border-white/10 p-3 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={2}
          placeholder="Écrivez à Iris… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
          className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#e0b060]"
        />
        <button type="submit" disabled={busy || !input.trim()} className="px-4 rounded-xl bg-[#e0b060] text-[#141311] font-bold uppercase tracking-widest text-[11px] disabled:opacity-40">
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>
    </div>
  );
};

export default AssistantPanel;
