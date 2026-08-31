import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MessageCircle, Send, Trash2, Pin, Bookmark, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AppContext';
import {
  retirerDuMur, voter, suivreMonVote, epinglerPost, sauvegarderPost,
  publierCommentaire, suivreCommentaires, retirerCommentaire,
  voterCommentaire, suivreMonVoteCommentaire,
  LONGUEUR_MAX_COMMENTAIRE, type PostMur, type CommentaireMur,
} from '../../firebase/mur';
import VoteBar from './VoteBar';

// ─── La carte d'un billet ────────────────────────────────────────────
// Porté du FMM 2026 (src/components/mur/BilletCarte.tsx), simplifié :
// avatar, nom, date, texte, photo, votes, commentaires repliés. Pas de
// vidéo, pas de partage, pas d'aperçu de lien, pas d'épinglage.

const quandTexte = (ms: number): string => {
  const ecart = Date.now() - ms;
  if (ecart < 60_000) return 'à l’instant';
  if (ecart < 3_600_000) return `${Math.floor(ecart / 60_000)} min`;
  if (ecart < 86_400_000) return `${Math.floor(ecart / 3_600_000)} h`;
  return new Date(ms).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });
};

const Medaillon: React.FC<{ nom: string; url?: string; taille?: number }> = ({ nom, url, taille = 44 }) => (
  <span
    className="rounded-full overflow-hidden shrink-0 border border-[#BA7B39]/30 bg-[#EEE7DB] dark:bg-white/10 flex items-center justify-center font-serif text-[#8B4A2F] dark:text-white/80"
    style={{ width: taille, height: taille, fontSize: taille * 0.4 }}
  >
    {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : (nom || '?').slice(0, 1).toUpperCase()}
  </span>
);

/** Une ligne de commentaire : son propre vote, sa propre suppression. */
const LigneCommentaire: React.FC<{ postId: string; postAuteurUid: string; c: CommentaireMur }> = ({ postId, postAuteurUid, c }) => {
  const { user, isAdmin } = useAuth();
  const [monVote, setMonVote] = useState<1 | -1 | 0>(0);
  useEffect(() => (user ? suivreMonVoteCommentaire(postId, c.id, user.uid, setMonVote) : undefined), [postId, c.id, user]);

  const voterIci = (valeur: 1 | -1 | 0) => {
    if (!user) return;
    void voterCommentaire(postId, c.id, user.uid, user.displayName || 'Un membre', valeur);
  };

  const peutSupprimer = !!user && (isAdmin || user.uid === c.uid || user.uid === postAuteurUid);

  return (
    <div className="flex gap-2.5 py-2.5 first:pt-0">
      <Medaillon nom={c.nom} url={c.avatarUrl} taille={30} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif text-[13px] text-[#293027] dark:text-white">{c.nom}</span>
          <span className="text-[10px] text-[#38403a]/45 dark:text-white/40">{quandTexte(c.creeLe?.toMillis?.() ?? Date.now())}</span>
        </div>
        <p className="text-[13px] text-[#38403a] dark:text-white/85 leading-relaxed whitespace-pre-line mt-0.5">{c.texte}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <VoteBar score={c.score ?? 0} monVote={monVote} onVoter={voterIci} petit />
          {peutSupprimer && (
            <button
              type="button"
              onClick={() => { void retirerCommentaire(postId, c.id); }}
              aria-label="Retirer"
              className="text-[#38403a]/35 dark:text-white/35 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const BilletCarte: React.FC<{ post: PostMur; delaiIndex: number; estSauvegarde?: boolean }> = ({ post, delaiIndex, estSauvegarde }) => {
  const { user, member, isAdmin } = useAuth();
  const [garde, setGarde] = useState(false);
  useEffect(() => { if (estSauvegarde !== undefined) setGarde(estSauvegarde); }, [estSauvegarde]);
  const [partage, setPartage] = useState(false);

  const [monVote, setMonVote] = useState<1 | -1 | 0>(0);
  useEffect(() => (user ? suivreMonVote(post.id, user.uid, setMonVote) : undefined), [post.id, user]);

  const voterIci = (valeur: 1 | -1 | 0) => {
    if (!user) return;
    void voter(post.id, user.uid, member?.displayName || user.displayName || 'Un membre', valeur);
  };

  // Les commentaires ne s'abonnent qu'une fois le panneau ouvert.
  const [commentairesOuverts, setCommentairesOuverts] = useState(false);
  const [commentaires, setCommentaires] = useState<CommentaireMur[]>([]);
  useEffect(() => {
    if (!commentairesOuverts) return;
    return suivreCommentaires(post.id, setCommentaires);
  }, [commentairesOuverts, post.id]);
  const [texteComment, setTexteComment] = useState('');
  const [envoiComment, setEnvoiComment] = useState(false);

  const publierCommentaireIci = async () => {
    if (!user || !texteComment.trim()) return;
    setEnvoiComment(true);
    try {
      await publierCommentaire(post.id, {
        uid: user.uid,
        nom: member?.displayName || user.displayName || 'Un membre',
        avatarUrl: member?.photoURL || user.photoURL || undefined,
        texte: texteComment,
      });
      setTexteComment('');
    } finally { setEnvoiComment(false); }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(delaiIndex, 8) * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white/55 backdrop-blur-md dark:bg-[#293027]/55 rounded-[20px] border border-white/60 dark:border-white/10 shadow-[0_10px_30px_-18px_rgba(41,48,39,0.3)] p-5 md:p-6"
    >
      <div className="flex items-center gap-3 mb-3">
        <Medaillon nom={post.nom} url={post.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base text-[#293027] dark:text-white truncate">
            {post.nom}
            {post.officiel && <span className="ml-2 align-middle rounded-full bg-[#BA7B39]/15 px-2 py-0.5 text-[9px] font-sans font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">Krystine</span>}
            {post.epingle && <span className="ml-1.5 align-middle text-[#8B4A2F] dark:text-[#d9a05b]"><Pin size={12} className="inline" /></span>}
          </p>
          <p className="text-[11px] text-[#38403a]/50 dark:text-white/45">{quandTexte(post.creeLe?.toMillis?.() ?? Date.now())}</p>
        </div>
        {user && (user.uid === post.uid || isAdmin) && (
          <button
            type="button"
            onClick={() => { void retirerDuMur(post); }}
            aria-label="Retirer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#38403a]/40 dark:text-white/40 hover:text-red-500 transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {post.texte && <p className="text-[15px] text-[#38403a] dark:text-white/90 leading-relaxed whitespace-pre-line">{post.texte}</p>}
      {post.videoUrl && (
        <video src={post.videoUrl} controls playsInline preload="metadata" className="mt-3 max-h-[480px] w-full rounded-[16px] bg-black" />
      )}
      {post.photoUrl && (
        <img
          src={post.photoUrl} alt="" loading="lazy"
          className="mt-4 w-full max-h-[32rem] object-cover rounded-[16px] border border-white/40 dark:border-white/10"
        />
      )}

      <div className="mt-4 pt-3 border-t border-[#38403a]/10 dark:border-white/10 flex items-center gap-4">
        <VoteBar score={post.score ?? 0} monVote={monVote} onVoter={voterIci} />
        {user && (
          <button
            type="button"
            onClick={() => { setGarde(g => !g); void sauvegarderPost(user.uid, post.id, !garde); }}
            aria-pressed={garde}
            className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors ${garde ? 'text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-[#38403a]/60 dark:text-white/60 hover:text-[#8B4A2F]'}`}
          >
            <Bookmark size={14} fill={garde ? 'currentColor' : 'none'} /> {garde ? 'Gardé' : 'Garder'}
          </button>
        )}
        <button
          type="button"
          onClick={async () => {
            const texte = `${post.nom} · ${post.texte || ''}`.slice(0, 200);
            const url = window.location.href;
            try {
              if (navigator.share) await navigator.share({ title: 'Krystine St-Laurent', text: texte, url });
              else { await navigator.clipboard.writeText(`${texte}\n${url}`); setPartage(true); setTimeout(() => setPartage(false), 2000); }
            } catch { /* geste annulé */ }
          }}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#38403a]/60 dark:text-white/60 hover:text-[#8B4A2F] transition-colors"
        >
          <Share2 size={14} /> {partage ? 'Copié !' : 'Partager'}
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => { void epinglerPost(post.id, !post.epingle); }}
            className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors ${post.epingle ? 'text-[#8B4A2F] dark:text-[#d9a05b]' : 'text-[#38403a]/60 dark:text-white/60 hover:text-[#8B4A2F]'}`}
          >
            <Pin size={14} /> {post.epingle ? 'Épinglé' : 'Épingler'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCommentairesOuverts((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#38403a]/60 dark:text-white/60 hover:text-[#8B4A2F] dark:hover:text-[#BA7B39] transition-colors"
        >
          <MessageCircle size={14} /> Commenter {(post.nbCommentaires ?? 0) > 0 && `(${post.nbCommentaires})`}
        </button>
      </div>

      {commentairesOuverts && (
        <div className="mt-3 pt-3 border-t border-[#38403a]/10 dark:border-white/10">
          {user && (
            <div className="flex items-start gap-2 mb-2">
              <textarea
                value={texteComment}
                onChange={(e) => setTexteComment(e.target.value.slice(0, LONGUEUR_MAX_COMMENTAIRE))}
                rows={1}
                placeholder="Écrivez un commentaire…"
                className="flex-1 px-3 py-2 rounded-xl border border-[#38403a]/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-[#293027] dark:text-white text-[13px] outline-none focus:border-[#BA7B39] transition-colors"
              />
              <button
                type="button"
                onClick={publierCommentaireIci}
                disabled={envoiComment || !texteComment.trim()}
                aria-label="Envoyer"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#BA7B39] text-[#293027] disabled:opacity-50"
              >
                {envoiComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
          {commentaires.length === 0 ? (
            <p className="text-[12px] text-[#38403a]/50 dark:text-white/45">Aucun commentaire pour le moment.</p>
          ) : (
            <div className="divide-y divide-[#38403a]/5 dark:divide-white/5">
              {commentaires.map((c) => (
                <LigneCommentaire key={c.id} postId={post.id} postAuteurUid={post.uid} c={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
};

export default BilletCarte;
