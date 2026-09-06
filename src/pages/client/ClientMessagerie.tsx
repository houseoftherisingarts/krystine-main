import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { type DMThread, type DM, subscribeInbox, subscribeDMThread, sendDM, markThreadRead } from '../../firebase/dms';
import { LONGUEUR_MAX } from '../../firebase/moderation';
import Avatar from '../../components/communaute/Avatar';
import ClientSupport from './ClientSupport';
import CadeauCarte from '../../components/client/CadeauCarte';
import ReserveAuFoyer from '../../components/communaute/ReserveAuFoyer';
import { suivreMesCadeaux, type Cadeau } from '../../firebase/cadeaux';

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
  const [cadeaux, setCadeaux] = useState<Cadeau[]>([]);

  const monUid = user?.uid || '';
  const monNom = (member?.displayName || user?.displayName || '').trim() || (fr ? 'Un membre' : 'A member');

  useEffect(() => {
    if (!monUid) return;
    return subscribeInbox(monUid, setFils);
  }, [monUid]);
  useEffect(() => (monUid ? suivreMesCadeaux(monUid, setCadeaux) : undefined), [monUid]);

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
          ? 'bg-[#BA7B39] text-[#293027]'
          : 'bg-[#BA7B39]/12 text-[#8B4A2F] hover:bg-[#BA7B39]/25 dark:text-[#d9a05b]'
      }`}
    >
      <i className={`fa-solid ${icone}`} /> {label}
      {!!badge && <span className="ml-1 rounded-full bg-[#293027] px-1.5 py-0.5 text-[9px] text-[#d9a05b]">{badge}</span>}
    </button>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">{fr ? 'Messagerie' : 'Messages'}</h3>
          <p className="mt-1 text-xs text-[#293027]/40 dark:text-white/40">
            {fr ? 'Vos conversations entre amies et votre fil avec l’équipe Inspirata, au même endroit.' : 'Your conversations with friends and your thread with Inspirata support, in one place.'}
          </p>
        </div>
        <div className="flex gap-2">
          {onglet('amies', fr ? 'Amies' : 'Friends', 'fa-user-group', nonLus)}
          {onglet('support', fr ? 'Équipe' : 'Team', 'fa-people-group')}
        </div>
      </div>

      {volet === 'amies' && cadeaux.length > 0 && (
        <div className="mb-4 space-y-3">
          {cadeaux.map(c => <CadeauCarte key={c.id} cadeau={c} lang={lang} />)}
        </div>
      )}

      {volet === 'support' ? (
        <ClientSupport />
      ) : (
        <ReserveAuFoyer lang={lang} quoi={fr ? 'S’écrire de boîte à boîte est exclusif aux membres du Foyer d’Origine. L’équipe Inspirata vous répond ici, à toutes.' : 'Writing to each other is reserved for members of the Origine Hearth. The Inspirata team answers everyone here.'}>
        <div className="grid h-[60vh] min-h-[420px] grid-cols-1 overflow-hidden rounded-[20px] border border-[#38403a]/10 bg-[#EEE7DB] dark:border-white/10 dark:bg-white/5 md:grid-cols-[260px_1fr]">
          {/* La liste des fils */}
          <div className={`${filActif ? 'hidden md:flex' : 'flex'} flex-col overflow-y-auto border-[#38403a]/10 dark:border-white/10 md:border-r`}>
            {fils.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center text-[#293027]/40 dark:text-white/40">
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
                  className={`flex w-full items-center gap-3 border-b border-[#38403a]/5 px-4 py-3 text-left transition-colors dark:border-white/5 ${actif ? 'bg-[#BA7B39]/15' : 'hover:bg-[#BA7B39]/8'}`}
                >
                  <Avatar nom={nom} url={f.participantPhotos?.[u]} taille={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${neuf ? 'font-bold text-[#293027] dark:text-white' : 'text-[#293027]/85 dark:text-white/85'}`}>{nom}</p>
                      <span className="shrink-0 text-[10px] text-[#293027]/40 dark:text-white/40">{quand(f.lastMessageAt?.toMillis() || 0, fr)}</span>
                    </div>
                    <p className="truncate text-xs text-[#293027]/50 dark:text-white/50">{f.lastMessage || ''}</p>
                  </div>
                  {neuf && <span className="h-2 w-2 shrink-0 rounded-full bg-[#BA7B39]" />}
                </button>
              );
            })}
            <Link to="/messages" className="mt-auto flex items-center gap-2 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:underline dark:text-[#d9a05b]">
              <i className="fa-solid fa-expand" /> {fr ? 'Plein écran' : 'Full screen'}
            </Link>
          </div>

          {/* La conversation */}
          <div className={`${filActif ? 'flex' : 'hidden md:flex'} min-w-0 flex-col`}>
            {!filActif ? (
              <div className="flex h-full flex-col items-center justify-center text-[#293027]/40 dark:text-white/40">
                <i className="fa-regular fa-envelope-open mb-3 text-3xl" />
                <p className="text-sm">{fr ? 'Choisissez une conversation.' : 'Pick a conversation.'}</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-[#38403a]/10 px-4 py-3 dark:border-white/10">
                  <button type="button" onClick={() => setFilActif(null)} aria-label={fr ? 'Revenir à la liste' : 'Back to the list'} className="text-[#38403a]/60 hover:text-[#8B4A2F] md:hidden dark:text-white/60">
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <Avatar nom={nomAutre} url={photoAutre} taille={36} />
                  <Link to={`/membre/${autreUid}`} className="truncate text-sm font-bold text-[#293027] hover:text-[#8B4A2F] dark:text-white">{nomAutre}</Link>
                </div>
                <div ref={zoneRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                  {msgs.map(m => {
                    const moi = m.senderUid === monUid;
                    return (
                      <div key={m.id} className={`flex ${moi ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${moi ? 'rounded-br-sm bg-[#BA7B39] text-[#293027]' : 'rounded-bl-sm bg-white text-[#293027] dark:bg-white/10 dark:text-white'}`}>
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`mt-1 text-[10px] ${moi ? 'text-[#293027]/55' : 'text-[#293027]/40 dark:text-white/40'}`}>{quand(m.createdAt?.toMillis() || 0, fr)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={envoyer} className="border-t border-[#38403a]/10 p-3 dark:border-white/10">
                  {avis && <p className="mb-2 text-xs text-red-600">{avis}</p>}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={brouillon}
                      onChange={e => setBrouillon(e.target.value.slice(0, LONGUEUR_MAX))}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement | null)?.requestSubmit(); } }}
                      rows={1}
                      placeholder={fr ? `Écrire à ${nomAutre}…` : `Write to ${nomAutre}…`}
                      className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-[#38403a]/10 bg-white px-4 py-2.5 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/10 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={envoi || !brouillon.trim()}
                      aria-label={fr ? 'Envoyer' : 'Send'}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#293027] text-[#d9a05b] transition-colors hover:bg-[#BA7B39] hover:text-[#293027] disabled:opacity-40 dark:bg-[#BA7B39] dark:text-[#293027]"
                    >
                      <i className={`fa-solid ${envoi ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
        </ReserveAuFoyer>
      )}
    </div>
  );
};

export default ClientMessagerie;
