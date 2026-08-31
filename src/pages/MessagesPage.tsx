import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Search, MessageCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AppContext';
import { getMember, type MemberDoc } from '../firebase/firestore';
import {
  type DMThread, type DM,
  threadId as faireFilId, ensureThread, subscribeDMThread, sendDM, subscribeInbox, markThreadRead,
} from '../firebase/dms';
import { LONGUEUR_MAX } from '../firebase/moderation';
import Avatar from '../components/communaute/Avatar';

// ─── La boîte de réception ───────────────────────────────────────────
// Porté du FMM 2026 (src/pages/MessagesPage.tsx + BoiteReception.tsx),
// simplifié : liste des fils à gauche, conversation à droite, envoi de
// texte, marquage lu. Pas de blocage ni de signalement ici, ces gestes
// vivent déjà ailleurs (moderation.ts) et n'étaient pas demandés pour
// cette boîte.
//
//   /messages           → la liste des conversations
//   /messages/:autreUid → une conversation, créée au premier envoi

const quand = (ms: number): string => {
  if (!ms) return '';
  const ecart = Date.now() - ms;
  if (ecart < 60_000) return 'à l’instant';
  if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
  if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
  return new Date(ms).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
};

const MessagesPage: React.FC = () => {
  const { autreUid } = useParams<{ autreUid?: string }>();
  const navigate = useNavigate();
  const { user, member, setSignInOpen } = useAuth();

  const [fils, setFils] = useState<DMThread[]>([]);
  const [recherche, setRecherche] = useState('');
  const [autre, setAutre] = useState<MemberDoc | null>(null);
  const [msgs, setMsgs] = useState<DM[]>([]);
  const [brouillon, setBrouillon] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState('');
  const [filActif, setFilActif] = useState<string | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const monUid  = user?.uid || '';
  const monNom  = (member?.displayName || user?.displayName || '').trim() || 'Un membre';
  const maPhoto = member?.photoURL || user?.photoURL || undefined;

  useEffect(() => {
    if (!user) return;
    return subscribeInbox(monUid, setFils);
  }, [monUid, user]);

  useEffect(() => {
    if (!autreUid) { setAutre(null); setFilActif(null); setMsgs([]); return; }
    let vivant = true;
    let arreter: (() => void) | undefined;
    (async () => {
      let fiche: MemberDoc | null = null;
      try { fiche = await getMember(autreUid); } catch { /* hors ligne */ }
      if (!vivant) return;
      setAutre(fiche);

      const id = faireFilId(monUid, autreUid);
      setFilActif(id);

      try {
        await ensureThread(
          monUid, monNom, maPhoto,
          autreUid, (fiche?.displayName || '').trim() || 'Un membre', fiche?.photoURL,
        );
      } catch { /* hors ligne, ou bloqué par l'autre */ }
      if (!vivant) return;
      arreter = subscribeDMThread(id, (liste) => { if (vivant) setMsgs(liste); });
    })();
    return () => { vivant = false; arreter?.(); };
  }, [autreUid, monUid, monNom, maPhoto]);

  useEffect(() => {
    if (filActif) markThreadRead(filActif, monUid).catch(() => {});
  }, [filActif, monUid, msgs.length]);

  useEffect(() => {
    const el = zoneRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length, filActif]);

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    const texte = brouillon.trim();
    if (!autreUid || !texte || !filActif || envoi) return;
    setEnvoi(true);
    setAvis('');
    try {
      await sendDM(filActif, { senderUid: monUid, senderName: monNom, body: texte.slice(0, LONGUEUR_MAX) }, autreUid);
      setBrouillon('');
    } catch (e) {
      setAvis(e instanceof Error ? e.message : 'Le message n’est pas passé. Réessayez dans un moment.');
    } finally {
      setEnvoi(false);
    }
  };

  const filtres = useMemo(() => fils.filter((f) => {
    const u = f.participantUids.find((x) => x !== monUid);
    const nom = u ? f.participantNames?.[u] || '' : '';
    return recherche === '' || nom.toLowerCase().includes(recherche.toLowerCase());
  }), [fils, recherche, monUid]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-32 pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="font-serif text-3xl text-[#293027] dark:text-white mb-4">Messages</h1>
          <p className="text-[#38403a]/60 dark:text-white/60 mb-8">Connectez-vous pour retrouver vos conversations.</p>
          <button
            onClick={() => setSignInOpen(true)}
            className="bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#BA7B39] hover:text-[#293027] transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  const filCourant = autreUid ? fils.find((f) => f.id === filActif) : undefined;
  const nomAutre = (autre?.displayName
    || (autreUid ? filCourant?.participantNames?.[autreUid] : '')
    || '').trim() || 'Un membre';
  const photoAutre = autre?.photoURL || (autreUid ? filCourant?.participantPhotos?.[autreUid] : undefined);
  const reste = LONGUEUR_MAX - brouillon.length;

  return (
    <div className="min-h-screen bg-[#EEE7DB] dark:bg-[#151d19] pt-24 pb-10">
      <div className="max-w-screen-xl mx-auto px-3 md:px-6">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/espace" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#38403a]/60 dark:text-white/60 hover:text-[#8B4A2F] dark:hover:text-[#BA7B39] transition-colors">
            <ArrowLeft size={12} /> Communauté
          </Link>
        </div>

        <div className="grid lg:grid-cols-12 gap-4 h-[calc(100vh-9rem)] min-h-[34rem]">
          <aside className={`lg:col-span-4 ${autreUid ? 'hidden lg:flex' : 'flex'} flex-col rounded-[20px] border border-white/60 dark:border-white/10 bg-white/55 backdrop-blur-md dark:bg-[#293027]/55 overflow-hidden shadow-[0_10px_30px_-18px_rgba(41,48,39,0.3)]`}>
            <div className="px-4 py-3.5">
              <h1 className="font-serif text-sm text-[#293027] dark:text-white mb-2.5 flex items-center gap-2">
                <MessageCircle size={14} className="text-[#8B4A2F] dark:text-[#BA7B39]" /> Vos conversations
              </h1>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#38403a]/40 dark:text-white/40" />
                <label htmlFor="chercher-fil" className="sr-only">Chercher quelqu’un</label>
                <input
                  id="chercher-fil" value={recherche} onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Chercher quelqu’un"
                  className="w-full pl-8 pr-3 py-2 rounded-full text-xs text-[#293027] dark:text-white placeholder:text-[#38403a]/40 dark:placeholder:text-white/40 outline-none border border-[#38403a]/10 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-[#BA7B39] transition-colors"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtres.length === 0 ? (
                <div className="p-8 text-center text-[#38403a]/50 dark:text-white/45">
                  <p className="text-[13px] leading-relaxed">Aucune conversation pour l’instant. Ouvrez la fiche d’un membre et écrivez-lui.</p>
                </div>
              ) : filtres.map((f) => {
                const u = f.participantUids.find((x) => x !== monUid) || '';
                const nom = (f.participantNames?.[u] || '').trim() || 'Un membre';
                const actif = u === autreUid;
                const neuf = (f.unread?.[monUid] || 0) > 0;
                return (
                  <button
                    key={f.id} onClick={() => navigate(`/messages/${u}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-[#38403a]/5 dark:border-white/5 ${actif ? 'bg-[#BA7B39]/10' : 'hover:bg-[#BA7B39]/5'}`}
                  >
                    <Avatar nom={nom} url={f.participantPhotos?.[u]} taille={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <p className={`font-serif text-sm truncate ${actif ? 'text-[#8B4A2F] dark:text-[#BA7B39]' : 'text-[#293027] dark:text-white'}`}>{nom}</p>
                        <span className="ml-auto text-[10px] tabular-nums text-[#38403a]/40 dark:text-white/40 shrink-0">
                          {quand(f.lastMessageAt?.toMillis?.() ?? 0)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#38403a]/60 dark:text-white/55 truncate mt-0.5">
                        {f.lastSenderUid === monUid ? 'Vous : ' : ''}{f.lastMessage || '…'}
                      </p>
                    </div>
                    {neuf && <span aria-label="Des messages non lus" className="w-2 h-2 rounded-full bg-[#BA7B39] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className={`lg:col-span-8 ${autreUid ? 'flex' : 'hidden lg:flex'} flex-col rounded-[20px] border border-white/60 dark:border-white/10 bg-white/55 backdrop-blur-md dark:bg-[#293027]/55 overflow-hidden shadow-[0_10px_30px_-18px_rgba(41,48,39,0.3)]`}>
            {!autreUid ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#38403a]/50 dark:text-white/45 px-8">
                <MessageCircle size={36} className="opacity-30 mb-4" />
                <p className="text-sm leading-relaxed max-w-sm">Choisissez une conversation dans la liste. Pour en commencer une nouvelle, ouvrez la fiche d’un membre dans l’annuaire.</p>
              </div>
            ) : (
              <>
                <header className="px-4 py-3 flex items-center gap-3 border-b border-[#38403a]/10 dark:border-white/10">
                  <button onClick={() => navigate('/messages')} aria-label="Revenir à la liste" className="lg:hidden text-[#38403a]/60 dark:text-white/60 hover:text-[#8B4A2F] dark:hover:text-[#BA7B39] transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <Link to={`/membre/${autreUid}`} className="flex items-center gap-3 hover:opacity-80 transition flex-1 min-w-0">
                    <Avatar nom={nomAutre} url={photoAutre} taille={38} />
                    <p className="font-serif text-sm text-[#293027] dark:text-white truncate">{nomAutre}</p>
                  </Link>
                </header>

                <div ref={zoneRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-3" aria-live="polite">
                  {msgs.length === 0 ? (
                    <p className="text-center pt-16 text-sm text-[#38403a]/50 dark:text-white/45">
                      Vous n’avez encore rien échangé avec {nomAutre}. Le premier mot vous revient.
                    </p>
                  ) : (
                    <AnimatePresence initial={false}>
                      {msgs.map((m) => {
                        const mien = m.senderUid === monUid;
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                            className={`flex ${mien ? 'justify-end' : 'justify-start'} gap-2.5`}
                          >
                            {!mien && <Avatar nom={nomAutre} url={photoAutre} taille={28} />}
                            <div className={`max-w-[76%] px-4 py-2.5 text-sm whitespace-pre-wrap break-words rounded-[16px] ${mien ? 'bg-[#BA7B39] text-[#293027]' : 'bg-white/70 dark:bg-white/10 text-[#293027] dark:text-white border border-[#38403a]/10 dark:border-white/10'}`}>
                              {m.body}
                              <span className={`block text-[9px] tabular-nums mt-1.5 ${mien ? 'text-[#293027]/55' : 'text-[#38403a]/45 dark:text-white/45'}`}>
                                {quand(m.createdAt?.toMillis?.() ?? 0)}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>

                {avis && (
                  <p role="status" className="px-4 md:px-6 py-2 text-[11px] text-[#8B4A2F] dark:text-[#BA7B39] border-t border-[#38403a]/10 dark:border-white/10">
                    {avis}
                  </p>
                )}

                <form onSubmit={envoyer} className="px-4 md:px-6 py-4 flex items-end gap-3 border-t border-[#38403a]/10 dark:border-white/10">
                  <label htmlFor="mot-prive" className="sr-only">Écrire un message</label>
                  <textarea
                    id="mot-prive" rows={1} value={brouillon} maxLength={LONGUEUR_MAX}
                    onChange={(e) => { setBrouillon(e.target.value); if (avis) setAvis(''); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void envoyer(e as unknown as React.FormEvent); }
                    }}
                    placeholder="Écrire un message"
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm text-[#293027] dark:text-white placeholder:text-[#38403a]/40 dark:placeholder:text-white/40 resize-none max-h-36 outline-none border border-[#38403a]/10 dark:border-white/10 bg-white/60 dark:bg-white/5 focus:border-[#BA7B39] transition-colors"
                  />
                  <div className="flex flex-col items-end gap-1.5">
                    {reste < 200 && <span aria-live="polite" className="text-[10px] tabular-nums text-[#38403a]/50 dark:text-white/45">{reste}</span>}
                    <button
                      type="submit" disabled={envoi || !brouillon.trim()} aria-label="Envoyer"
                      className="inline-flex items-center justify-center w-11 h-11 bg-[#BA7B39] text-[#293027] rounded-full hover:bg-[#9c6630] transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
