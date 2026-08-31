import React, { useEffect, useRef, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase';

// ─── Le petit salon de conversation du site ──────────────────────────────────
// Bouton flottant en bas à droite; le panneau répond aux questions des
// visiteuses (fonction chatbotKrystine, Claude Sonnet avec la clé de Krystine).

interface Msg { role: 'user' | 'assistant'; content: string }

const ACCUEIL: Msg = {
  role: 'assistant',
  content: 'Bonjour, je suis l\'assistante du site. Posez-moi vos questions sur Krystine, ses livres, ses formations ou ses huiles.',
};

const SUGGESTIONS = ['Qui est Krystine ?', 'Parlez-moi du Foyer d\'Origine', 'Où trouver ses huiles ?'];

const ChatKrystine: React.FC = () => {
  const [ouvert, setOuvert] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([ACCUEIL]);
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = zoneRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, ouvert, envoi]);

  const envoyer = async (texte?: string) => {
    const contenu = (texte ?? brouillon).trim();
    if (!contenu || envoi || !app) return;
    const suite: Msg[] = [...msgs, { role: 'user', content: contenu }];
    setMsgs(suite);
    setBrouillon('');
    setEnvoi(true);
    try {
      const call = httpsCallable<{ messages: Msg[] }, { reply: string }>(getFunctions(app, 'us-central1'), 'chatbotKrystine');
      const r = await call({ messages: suite.slice(1) });
      setMsgs(m => [...m, { role: 'assistant', content: r.data.reply }]);
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Le fil s\'est interrompu. Réessayez dans un instant, ou écrivez à teamksl@inspiratanature.com.' }]);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(o => !o)}
        aria-label={ouvert ? 'Fermer la conversation' : 'Poser une question'}
        className="fixed bottom-5 right-5 z-[90] flex h-13 w-13 items-center justify-center rounded-full border border-[#bb9a5e]/60 bg-[#2a2015]/90 p-4 text-[#dcb874] shadow-[0_14px_40px_-12px_rgba(58,49,38,0.8)] backdrop-blur-md transition-transform hover:scale-105"
      >
        <i className={`fa-solid ${ouvert ? 'fa-xmark' : 'fa-feather-pointed'} text-lg`} />
      </button>

      {ouvert && (
        <div className="fixed bottom-24 right-5 z-[90] flex max-h-[70vh] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[22px] border border-[#bb9a5e]/40 bg-[#f6f3ee]/95 shadow-[0_30px_80px_-20px_rgba(42,32,21,0.55)] backdrop-blur-xl dark:border-white/10 dark:bg-[#2a2015]/95">
          <div className="border-b border-[#3a3126]/10 px-5 py-4 dark:border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7d6330] dark:text-[#dcb874]">Inspirata</p>
            <p className="font-serif text-lg text-[#2a2015] dark:text-white">Une question ?</p>
          </div>
          <div ref={zoneRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-br-sm bg-[#bb9a5e] text-[#2a2015]' : 'rounded-bl-sm bg-white text-[#2a2015] dark:bg-white/10 dark:text-white'}`}>{m.content}</p>
              </div>
            ))}
            {envoi && (
              <p className="text-xs text-[#3a3126]/50 dark:text-white/50"><i className="fa-solid fa-circle-notch fa-spin mr-2" />Elle vous répond…</p>
            )}
            {msgs.length === 1 && !envoi && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map(sug => (
                  <button key={sug} type="button" onClick={() => envoyer(sug)} className="rounded-full border border-[#bb9a5e]/40 px-3 py-1.5 text-xs text-[#7d6330] transition-colors hover:bg-[#bb9a5e]/15 dark:text-[#dcb874]">
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            onSubmit={e => { e.preventDefault(); envoyer(); }}
            className="flex items-center gap-2 border-t border-[#3a3126]/10 p-3 dark:border-white/10"
          >
            <input
              value={brouillon}
              onChange={e => setBrouillon(e.target.value.slice(0, 2000))}
              placeholder="Écrivez votre question…"
              className="min-w-0 flex-1 rounded-full border border-[#3a3126]/10 bg-white px-4 py-2.5 text-sm text-[#2a2015] outline-none focus:border-[#bb9a5e] dark:border-white/10 dark:bg-white/10 dark:text-white"
            />
            <button
              type="submit"
              disabled={envoi || !brouillon.trim()}
              aria-label="Envoyer"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2a2015] text-[#dcb874] transition-colors hover:bg-[#bb9a5e] hover:text-[#2a2015] disabled:opacity-40 dark:bg-[#bb9a5e] dark:text-[#2a2015]"
            >
              <i className="fa-solid fa-paper-plane text-sm" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatKrystine;
