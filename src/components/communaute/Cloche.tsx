import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, MessageCircle, User as UserIcon } from 'lucide-react';
import { subscribeInbox, type DMThread } from '../../firebase/dms';
import { suivreMesAmities, type Amitie } from '../../firebase/amities';
import { suivreLeMur, type PostMur } from '../../firebase/mur';

// ─── La cloche ────────────────────────────────────────────────────────
// Porté du FMM 2026 (src/components/compte/Cloche.tsx), simplifié : trois
// sources, les messages non lus, les demandes d'amitié en attente, et les
// billets du feed public de Krystine publiés depuis la dernière ouverture
// de la cloche (pas de badges, pas de pages, pas de parties : ces systèmes
// n'existent pas ici). NavBar.tsx pose ce composant, pas ce fichier.
//
// Trois boutons ronds : Profil (→ /compte), Notifications (cloche +
// pastille, dépliable), Messages (pastille, → /messages).
//
// Les billets « vus » se suivent en localStorage (pas de compteur serveur
// pour ça) : à l'ouverture on retient le moment, et on ne l'écrit dans la
// clé qu'à la fermeture pour ne pas faire disparaître la liste sous les
// yeux de la cliente pendant qu'elle la consulte.
const CLE_VU = 'krystine-cloche-vu';
const lireVu = (): number => { try { return Number(localStorage.getItem(CLE_VU)) || 0; } catch { return 0; } };

interface Item {
  id: string;
  titre: string;
  lien: string;
  quand: number;
}

const Pastille: React.FC<{ n: number }> = ({ n }) => (n > 0 ? (
  <span
    className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold"
    style={{ background: '#BA7B39', color: '#293027' }}
  >
    {n > 9 ? '9+' : n}
  </span>
) : null);

const Cloche: React.FC<{ uid: string }> = ({ uid }) => {
  const [fils, setFils] = useState<DMThread[]>([]);
  const [amities, setAmities] = useState<Amitie[]>([]);
  const [billets, setBillets] = useState<PostMur[]>([]);
  const [vu, setVu] = useState<number>(lireVu);
  const [ouverte, setOuverte] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  const ouvertureLe = useRef<number | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribeInbox(uid, setFils);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    return suivreMesAmities(uid, setAmities);
  }, [uid]);

  useEffect(() => suivreLeMur('communaute', setBillets, 10), []);

  useEffect(() => {
    if (!ouverte) return;
    const fermer = (e: MouseEvent) => { if (!boite.current?.contains(e.target as Node)) setOuverte(false); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, [ouverte]);

  // On note le moment de l'ouverture, et on ne le fige dans la clé (donc
  // dans le seuil « vu ») qu'à la fermeture : la liste reste stable tant
  // que la cliente la regarde.
  useEffect(() => {
    if (ouverte) { ouvertureLe.current = Date.now(); return; }
    if (ouvertureLe.current == null) return;
    const t = ouvertureLe.current;
    ouvertureLe.current = null;
    try { localStorage.setItem(CLE_VU, String(t)); } catch { /* noop */ }
    setVu(t);
  }, [ouverte]);

  const messagesNonLus = useMemo(
    () => fils.reduce((total, f) => total + (f.unread?.[uid] || 0), 0),
    [fils, uid],
  );

  const items = useMemo<Item[]>(() => {
    const msgs: Item[] = fils
      .filter((f) => (f.unread?.[uid] || 0) > 0)
      .map((f) => {
        const autre = f.participantUids.find((x) => x !== uid) || '';
        const n = f.unread?.[uid] || 0;
        const nom = f.participantNames?.[autre] || 'Un membre';
        return {
          id: `dm-${f.id}`,
          titre: `${n > 1 ? `${n} messages de` : 'Un message de'} ${nom}`,
          lien: `/messages/${autre}`,
          quand: f.lastMessageAt?.toMillis?.() ?? 0,
        };
      });
    const demandes: Item[] = amities
      .filter((a) => a.statut === 'demande' && a.de !== uid)
      .map((a) => ({
        id: `amitie-${a.de}`,
        titre: 'Quelqu’un vous demande en ami',
        lien: `/membre/${a.de}`,
        quand: 0,
      }));
    return [...msgs, ...demandes].sort((a, b) => b.quand - a.quand);
  }, [fils, amities, uid]);

  const total = items.length;
  const bouton = 'relative inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors';
  const style = { background: 'rgba(246,243,238,0.9)', borderColor: 'rgba(186,123,57,0.35)', color: '#8B4A2F' };

  return (
    <div ref={boite} className="relative flex items-center gap-2">
      <button
        type="button" onClick={() => setOuverte((v) => !v)} className={bouton} style={style}
        aria-haspopup="true" aria-expanded={ouverte}
        aria-label={`Notifications${total ? `, ${total}` : ''}`} title="Notifications"
      >
        <motion.span animate={total ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="inline-flex">
          <Bell size={16} />
        </motion.span>
        <Pastille n={total} />
      </button>

      <Link
        to="/messages" className={bouton} style={style}
        aria-label={`Messages${messagesNonLus ? `, ${messagesNonLus} non lus` : ''}`} title="Messagerie"
      >
        <MessageCircle size={16} />
        <Pastille n={messagesNonLus} />
      </Link>

      <AnimatePresence>
        {ouverte && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-[min(22rem,calc(100vw-2rem))] rounded-[20px] overflow-hidden bg-white/90 dark:bg-[#293027]/95 backdrop-blur-md border border-[#BA7B39]/25 shadow-[0_20px_50px_-20px_rgba(41,48,39,0.4)]"
            role="menu"
          >
            <p className="px-4 pt-3.5 pb-2 text-[10px] uppercase tracking-[0.18em] text-[#38403a]/50 dark:text-white/45 border-b border-[#38403a]/10 dark:border-white/10">
              Ce qui vous attend
            </p>
            {total === 0 ? (
              <p className="px-4 py-5 text-sm text-[#38403a]/60 dark:text-white/60">
                Rien de neuf pour le moment. Tout est à jour.
              </p>
            ) : (
              <ul className="max-h-[60vh] overflow-y-auto py-1">
                {items.map((n) => (
                  <li key={n.id}>
                    <Link
                      to={n.lien} role="menuitem" onClick={() => setOuverte(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#BA7B39]/10 transition-colors"
                    >
                      <span className="font-sans text-sm text-[#293027] dark:text-white">{n.titre}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/messages" onClick={() => setOuverte(false)}
              className="block px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[#8B4A2F] dark:text-[#BA7B39] hover:bg-[#BA7B39]/10 transition-colors border-t border-[#38403a]/10 dark:border-white/10"
            >
              Ouvrir ma boîte de réception
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cloche;
