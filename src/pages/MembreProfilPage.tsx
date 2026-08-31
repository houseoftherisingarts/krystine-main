import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus, Check, MessageCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AppContext';
import { getMember, type MemberDoc } from '../firebase/firestore';
import {
  demanderAmitie, accepterAmitie, suivreMesAmities,
  estAmi, amitieEnAttente, type Amitie,
} from '../firebase/amities';
import Avatar from '../components/communaute/Avatar';
import { suivrePublicationsDe, type PostMur } from '../firebase/mur';
import { getBadgesDe, CATALOGUE_BADGES } from '../firebase/badgesCatalogue';

// ─── Le profil public d'un membre ────────────────────────────────────
// Porté du mur social du FMM 2026 (la fiche de l'Ordre), simplifié :
// bannière si présente, photo, nom, dosha, et deux gestes — demander
// l'amitié, écrire. Gated derrière la connexion comme CommunauteEspace.
const MembreProfilPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const { user, setSignInOpen } = useAuth();

  const [profil, setProfil] = useState<MemberDoc | null>(null);
  const [chargement, setChargement] = useState(true);
  const [amities, setAmities] = useState<Amitie[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [publications, setPublications] = useState<PostMur[]>([]);
  useEffect(() => { if (uid) getBadgesDe(uid).then(setBadges).catch(() => {}); }, [uid]);
  useEffect(() => (uid ? suivrePublicationsDe(uid, setPublications) : undefined), [uid]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let vivant = true;
    getMember(uid).then((m) => { if (vivant) setProfil(m); }).finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [uid]);

  useEffect(() => {
    if (!user) return;
    return suivreMesAmities(user.uid, setAmities);
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-32 pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <h1 className="font-serif text-3xl text-[#2a2015] dark:text-white mb-4">Profil</h1>
          <p className="text-[#3a3126]/60 dark:text-white/60 mb-8">Connectez-vous pour voir cette fiche.</p>
          <button
            onClick={() => setSignInOpen(true)}
            className="bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  if (chargement) {
    return <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-32 pb-24" />;
  }

  if (!uid || !profil) {
    return (
      <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pt-32 pb-24 px-6">
        <div className="max-w-md mx-auto text-center">
          <p className="text-[#3a3126]/60 dark:text-white/60">Ce membre est introuvable.</p>
        </div>
      </div>
    );
  }

  // Jamais dériver le nom du courriel : rien de contactable hors plateforme
  // ne doit fuiter sur un profil public.
  const nom = profil.displayName || 'Membre';
  const soi = user.uid === uid;
  const amis = estAmi(amities, user.uid, uid);
  const enAttente = amitieEnAttente(amities, user.uid, uid);
  const jeLaiEnvoyee = enAttente?.de === user.uid;
  const jeLaiRecue = enAttente && enAttente.de === uid;

  const demander = async () => {
    setEnvoi(true);
    try { await demanderAmitie(user.uid, uid); } finally { setEnvoi(false); }
  };

  const accepter = async () => {
    setEnvoi(true);
    try { await accepterAmitie(user.uid, uid); } finally { setEnvoi(false); }
  };

  return (
    <div className="min-h-screen bg-[#f6f3ee] dark:bg-[#16100a] pb-24">
      {profil.bannerURL ? (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img src={profil.bannerURL} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-24 md:h-28" />
      )}

      <div className="max-w-2xl mx-auto px-6 -mt-12">
        <div className="bg-white/55 backdrop-blur-md dark:bg-[#2a2015]/55 rounded-[20px] border border-white/60 dark:border-white/10 shadow-[0_10px_30px_-18px_rgba(58,49,38,0.3)] p-6 md:p-8">
          <div className="flex items-center gap-4">
            <Avatar nom={nom} url={profil.photoURL} taille={72} />
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 font-serif text-2xl text-[#2a2015] dark:text-white truncate">
                <span className="truncate">{nom}</span>
                {profil.verifie && <i className="fa-solid fa-circle-check shrink-0 text-lg text-[#3b82f6]" title="Profil vérifié" />}
              </h1>
              {profil.dosha && (
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#7d6330] dark:text-[#bb9a5e] mt-1">
                  Dosha {profil.dosha}
                </p>
              )}
            </div>
          </div>

          {!soi && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {amis ? (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#bb9a5e]/40 text-xs font-bold uppercase tracking-widest text-[#7d6330] dark:text-[#bb9a5e]">
                  <Check size={13} /> Vous êtes amis
                </span>
              ) : jeLaiRecue ? (
                <button
                  type="button" onClick={accepter} disabled={envoi}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#bb9a5e] text-[#2a2015] text-xs font-bold uppercase tracking-widest hover:bg-[#a3823f] transition-colors disabled:opacity-50"
                >
                  {envoi ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Accepter la demande
                </button>
              ) : jeLaiEnvoyee ? (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#3a3126]/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest text-[#3a3126]/50 dark:text-white/50">
                  Demande envoyée
                </span>
              ) : (
                <button
                  type="button" onClick={demander} disabled={envoi}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] text-xs font-bold uppercase tracking-widest hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors disabled:opacity-50"
                >
                  {envoi ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Demander l’amitié
                </button>
              )}
              <button
                type="button" onClick={() => navigate(`/messages/${uid}`)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#3a3126]/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest text-[#3a3126]/70 dark:text-white/70 hover:border-[#bb9a5e] hover:text-[#7d6330] transition-colors"
              >
                <MessageCircle size={13} /> Écrire
              </button>
            </div>
          )}

          {badges.length > 0 && (
            <div className="mt-6 border-t border-[#3a3126]/10 pt-5 dark:border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7d6330]">Badges</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {badges.map(id => (
                  <span key={id} className="inline-flex items-center gap-2 rounded-full border border-[#bb9a5e]/40 bg-[#bb9a5e]/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#7d6330]">
                    <i className={`fa-solid ${CATALOGUE_BADGES[id].icone}`} /> {CATALOGUE_BADGES[id].nom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Le mur de la personne, comme sur Facebook */}
        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7d6330]">Le mur de {nom}</p>
          {publications.length === 0 ? (
            <p className="mt-3 text-sm text-[#3a3126]/50 dark:text-white/50">Aucune publication pour le moment.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {publications.map(p => (
                <div key={p.id} className="rounded-[20px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#2a2015]/55">
                  <p className="whitespace-pre-line text-sm text-[#2a2015] dark:text-white">{p.texte}</p>
                  {p.photoUrl && <img src={p.photoUrl} alt="" className="mt-3 max-h-80 rounded-[14px] object-cover" />}
                  {p.videoUrl && <video src={p.videoUrl} controls playsInline preload="metadata" className="mt-3 max-h-80 w-full rounded-[14px] bg-black" />}
                  <p className="mt-2 text-[11px] text-[#3a3126]/40 dark:text-white/40">
                    {p.creeLe?.toDate?.().toLocaleDateString('fr-CA')} · {p.pour || 0} <i className="fa-solid fa-heart text-[#bb9a5e]" /> · {p.nbCommentaires || 0} <i className="fa-solid fa-comment" />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembreProfilPage;
