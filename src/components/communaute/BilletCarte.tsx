import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AppContext';
import {
  retirerDuMur, voter, suivreMonVote,
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
    className="rounded-full overflow-hidden shrink-0 border border-[#bb9a5e]/30 bg-[#f6f3ee] dark:bg-white/10 flex items-center justify-center font-serif text-[#7d6330] dark:text-white/80"
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
          <span className="font-serif text-[13px] text-[#2a2015] dark:text-white">{c.nom}</span>
          <span className="text-[10px] text-[#3a3126]/45 dark:text-white/40">{quandTexte(c.creeLe?.toMillis?.() ?? Date.now())}</span>
        </div>
        <p className="text-[13px] text-[#3a3126] dark:text-white/85 leading-relaxed whitespace-pre-line mt-0.5">{c.texte}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <VoteBar score={c.score ?? 0} monVote={monVote} onVoter={voterIci} petit />
          {peutSupprimer && (
            <button
              type="button"
              onClick={() => { void retirerCommentaire(postId, c.id); }}
              aria-label="Retirer"
              className="text-[#3a3126]/35 dark:text-white/35 hover:text-red-500 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const BilletCarte: React.FC<{ post: PostMur; delaiIndex: number }> = ({ post, delaiIndex }) => {
  const { user, member, isAdmin } = useAuth();

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
      className="bg-white/55 backdrop-blur-md dark:bg-[#2a2015]/55 rounded-[20px] border border-white/60 dark:border-white/10 shadow-[0_10px_30px_-18px_rgba(58,49,38,0.3)] p-5 md:p-6"
    >
      <div className="flex items-center gap-3 mb-3">
        <Medaillon nom={post.nom} url={post.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-base text-[#2a2015] dark:text-white truncate">{post.nom}</p>
          <p className="text-[11px] text-[#3a3126]/50 dark:text-white/45">{quandTexte(post.creeLe?.toMillis?.() ?? Date.now())}</p>
        </div>
        {user && (user.uid === post.uid || isAdmin) && (
          <button
            type="button"
            onClick={() => { void retirerDuMur(post); }}
            aria-label="Retirer"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3a3126]/40 dark:text-white/40 hover:text-red-500 transition-colors shrink-0"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {post.texte && <p className="text-[15px] text-[#3a3126] dark:text-white/90 leading-relaxed whitespace-pre-line">{post.texte}</p>}
      {post.photoUrl && (
        <img
          src={post.photoUrl} alt="" loading="lazy"
          className="mt-4 w-full max-h-[32rem] object-cover rounded-[16px] border border-white/40 dark:border-white/10"
        />
      )}

      <div className="mt-4 pt-3 border-t border-[#3a3126]/10 dark:border-white/10 flex items-center gap-4">
        <VoteBar score={post.score ?? 0} monVote={monVote} onVoter={voterIci} />
        <button
          type="button"
          onClick={() => setCommentairesOuverts((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#3a3126]/60 dark:text-white/60 hover:text-[#7d6330] dark:hover:text-[#bb9a5e] transition-colors"
        >
          <MessageCircle size={14} /> Commenter {(post.nbCommentaires ?? 0) > 0 && `(${post.nbCommentaires})`}
        </button>
      </div>

      {commentairesOuverts && (
        <div className="mt-3 pt-3 border-t border-[#3a3126]/10 dark:border-white/10">
          {user && (
            <div className="flex items-start gap-2 mb-2">
              <textarea
                value={texteComment}
                onChange={(e) => setTexteComment(e.target.value.slice(0, LONGUEUR_MAX_COMMENTAIRE))}
                rows={1}
                placeholder="Écrivez un commentaire…"
                className="flex-1 px-3 py-2 rounded-xl border border-[#3a3126]/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-[#2a2015] dark:text-white text-[13px] outline-none focus:border-[#bb9a5e] transition-colors"
              />
              <button
                type="button"
                onClick={publierCommentaireIci}
                disabled={envoiComment || !texteComment.trim()}
                aria-label="Envoyer"
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-[#bb9a5e] text-[#2a2015] disabled:opacity-50"
              >
                {envoiComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
          {commentaires.length === 0 ? (
            <p className="text-[12px] text-[#3a3126]/50 dark:text-white/45">Aucun commentaire pour le moment.</p>
          ) : (
            <div className="divide-y divide-[#3a3126]/5 dark:divide-white/5">
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
