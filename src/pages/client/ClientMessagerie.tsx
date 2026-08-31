import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { type DMThread, type DM, subscribeInbox, subscribeDMThread, sendDM, markThreadRead } from '../../firebase/dms';
import { LONGUEUR_MAX } from '../../firebase/moderation';
import Avatar from '../../components/communaute/Avatar';
import ClientSupport from './ClientSupport';

// ─── Onglet Messagerie de l'espace client ────────────────────────────────────
// Deux volets dans la même fenêtre : les conversations entre amies (fils DM de
// dms.ts, les mêmes qu'à /messages) et le fil avec le soutien Inspirata
// (ClientSupport, collection conversations/{uid}). Rien de nouveau côté
// données : l'onglet réunit ce qui existait déjà à deux endroits.

type Volet = 'amies' | 'support';

const quand = (ms: number, fr: boolean): string => {
  if (!ms) return '';
  const ecart = Date.now() - ms;
  if (ecart < 60_000) return fr ? 'à l’instant' : 'just now';
  if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
  if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
  return new Date(ms).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { day: 'numeric', month: 'short' });
};

const ClientMessagerie: React.FC<{ voletInitial?: Volet }> = ({ voletInitial = 'amies' }) => {
  const { user, member, lang } = useApp();
  const fr = lang === 'FR';
  const [volet, setVolet] = useState<Volet>(voletInitial);
  const [fils, setFils] = useState<DMThread[]>([]);
  const [filActif, setFilActif] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<DM[]>([]);
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState('');
  const zoneRef = useRef<HTMLDivElement>(null);

  const monUid = user?.uid || '';
  const monNom = (member?.displayName || user?.displayName || '').trim() || (fr ? 'Un membre' : 'A member');

  useEffect(() => {
    if (!monUid) return;
    return subscribeInbox(monUid, setFils);
  }, [monUid]);

  useEffect(() => {
    if (!filActif) { setMsgs([]); return; }
    return subscribeDMThread(filActif, setMsgs);
  }, [filActif]);

  useEffect(() => {
    if (filActif && monUid) markThreadRead(filActif, monUid).catch(() => {});
  }, [filActif, monUid, msgs.length]);

  useEffect(() => {
    const el = zoneRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, filActif]);

  const nonLus = useMemo(() => fils.reduce((n, f) => n + (f.unread?.[monUid] || 0), 0), [fils, monUid]);
  const fil = fils.find(f => f.id === filActif);
  const autreUid = fil?.participantUids.find(u => u !== monUid) || '';
  const nomAutre = (autreUid && fil?.participantNames?.[autreUid]) || (fr ? 'Un membre' : 'A member');
  const photoAutre = autreUid ? fil?.participantPhotos?.[autreUid] : undefined;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const texte = brouillon.trim();
    if (!filActif || !autreUid || !texte || envoi) return;
    setEnvoi(true);
    setAvis('');
    try {
      await sendDM(filActif, { senderUid: monUid, senderName: monNom, body: texte.slice(0, LONGUEUR_MAX) }, autreUid);
      setBrouillon('');
    } catch (err) {
      setAvis(err instanceof Error ? err.message : (fr ? 'Le message n’est pas passé. Réessayez dans un moment.' : 'The message did not go through. Try again shortly.'));
    } finally {
      setEnvoi(false);
    }
  };

  const onglet = (id: Volet, label: string, icone: string, badge?: number) => (
    <button
      type="button"
      onClick={() => setVolet(id)}
      className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
        volet === id
          ? 'bg-[#bb9a5e] text-[#2a2015]'
          : 'bg-[#bb9a5e]/12 text-[#7d6330] hover:bg-[#bb9a5e]/25 dark:text-[#dcb874]'
      }`}
    >
      <i className={`fa-solid ${icone}`} /> {label}
      {!!badge && <span className="ml-1 rounded-full bg-[#2a2015] px-1.5 py-0.5 text-[9px] text-[#dcb874]">{badge}</span>}
    </button>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#2a2015]/60 dark:text-white/60">{fr ? 'Messagerie' : 'Messages'}</h3>
          <p className="mt-1 text-xs text-[#2a2015]/40 dark:text-white/40">
            {fr ? 'Vos conversations entre amies et votre fil avec le soutien Inspirata, au même endroit.' : 'Your conversations with friends and your thread with Inspirata support, in one place.'}
          </p>
        </div>
        <div className="flex gap-2">
          {onglet('amies', fr ? 'Amies' : 'Friends', 'fa-user-group', nonLus)}
          {onglet('support', fr ? 'Soutien' : 'Support', 'fa-life-ring')}
        </div>
      </div>

      {volet === 'support' ? (
        <ClientSupport />
      ) : (
        <div className="grid h-[60vh] min-h-[420px] grid-cols-1 overflow-hidden rounded-[20px] border border-[#3a3126]/10 bg-[#f6f3ee] dark:border-white/10 dark:bg-white/5 md:grid-cols-[260px_1fr]">
          {/* La liste des fils */}
          <div className={`${filActif ? 'hidden md:flex' : 'flex'} flex-col overflow-y-auto border-[#3a3126]/10 dark:border-white/10 md:border-r`}>
            {fils.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-[#2a2015]/40 dark:text-white/40">
                <i className="fa-regular fa-comments mb-3 text-3xl" />
                <p className="text-sm">{fr ? 'Aucune conversation pour l’instant.' : 'No conversation yet.'}</p>
                <p className="mt-2 text-xs">{fr ? 'Ouvrez le profil d’une amie et écrivez-lui : le fil apparaîtra ici.' : 'Open a friend’s profile and write to her: the thread will show up here.'}</p>
              </div>
            ) : fils.map(f => {
              const u = f.participantUids.find(x => x !== monUid) || '';
              const nom = f.participantNames?.[u] || (fr ? 'Un membre' : 'A member');
              const neuf = (f.unread?.[monUid] || 0) > 0;
              const actif = f.id === filActif;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilActif(f.id)}
                  className={`flex w-full items-center gap-3 border-b border-[#3a3126]/5 px-4 py-3 text-left transition-colors dark:border-white/5 ${actif ? 'bg-[#bb9a5e]/15' : 'hover:bg-[#bb9a5e]/8'}`}
                >
                  <Avatar nom={nom} url={f.participantPhotos?.[u]} taille={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${neuf ? 'font-bold text-[#2a2015] dark:text-white' : 'text-[#2a2015]/85 dark:text-white/85'}`}>{nom}</p>
                      <span className="shrink-0 text-[10px] text-[#2a2015]/40 dark:text-white/40">{quand(f.lastMessageAt?.toMillis() || 0, fr)}</span>
                    </div>
                    <p className="truncate text-xs text-[#2a2015]/50 dark:text-white/50">{f.lastMessage || ''}</p>
                  </div>
                  {neuf && <span className="h-2 w-2 shrink-0 rounded-full bg-[#bb9a5e]" />}
                </button>
              );
            })}
            <Link to="/messages" className="mt-auto flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#7d6330] hover:underline dark:text-[#dcb874]">
              <i className="fa-solid fa-expand" /> {fr ? 'Plein écran' : 'Full screen'}
            </Link>
          </div>

          {/* La conversation */}
          <div className={`${filActif ? 'flex' : 'hidden md:flex'} min-w-0 flex-col`}>
            {!filActif ? (
              <div className="flex h-full flex-col items-center justify-center text-[#2a2015]/40 dark:text-white/40">
                <i className="fa-regular fa-envelope-open mb-3 text-3xl" />
                <p className="text-sm">{fr ? 'Choisissez une conversation.' : 'Pick a conversation.'}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-[#3a3126]/10 px-4 py-3 dark:border-white/10">
                  <button type="button" onClick={() => setFilActif(null)} aria-label={fr ? 'Revenir à la liste' : 'Back to the list'} className="text-[#3a3126]/60 hover:text-[#7d6330] md:hidden dark:text-white/60">
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <Avatar nom={nomAutre} url={photoAutre} taille={36} />
                  <Link to={`/membre/${autreUid}`} className="truncate text-sm font-bold text-[#2a2015] hover:text-[#7d6330] dark:text-white">{nomAutre}</Link>
                </div>
                <div ref={zoneRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                  {msgs.map(m => {
                    const moi = m.senderUid === monUid;
                    return (
                      <div key={m.id} className={`flex ${moi ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${moi ? 'rounded-br-sm bg-[#bb9a5e] text-[#2a2015]' : 'rounded-bl-sm bg-white text-[#2a2015] dark:bg-white/10 dark:text-white'}`}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-1 text-[10px] ${moi ? 'text-[#2a2015]/55' : 'text-[#2a2015]/40 dark:text-white/40'}`}>{quand(m.createdAt?.toMillis() || 0, fr)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={envoyer} className="border-t border-[#3a3126]/10 p-3 dark:border-white/10">
                  {avis && <p className="mb-2 text-xs text-red-600">{avis}</p>}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={brouillon}
                      onChange={e => setBrouillon(e.target.value.slice(0, LONGUEUR_MAX))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit(); } }}
                      rows={1}
                      placeholder={fr ? `Écrire à ${nomAutre}…` : `Write to ${nomAutre}…`}
                      className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-[#3a3126]/10 bg-white px-4 py-2.5 text-sm text-[#2a2015] outline-none focus:border-[#bb9a5e] dark:border-white/10 dark:bg-white/10 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={envoi || !brouillon.trim()}
                      aria-label={fr ? 'Envoyer' : 'Send'}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2a2015] text-[#dcb874] transition-colors hover:bg-[#bb9a5e] hover:text-[#2a2015] disabled:opacity-40 dark:bg-[#bb9a5e] dark:text-[#2a2015]"
                    >
                      <i className={`fa-solid ${envoi ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMessagerie;
