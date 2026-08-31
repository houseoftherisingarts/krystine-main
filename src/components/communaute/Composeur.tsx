import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Send, Video, X } from 'lucide-react';
import { useAuth } from '../../contexts/AppContext';
import { uploadMediaMur } from '../../firebase/storage';
import { publierSurLeMur, LONGUEUR_MAX_POST, type FilMur } from '../../firebase/mur';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';

// Le composeur du mur, façon Facebook : l'avatar, une zone de texte qui
// grandit, un bouton Photo, un bouton Vidéo, l'aperçu du média choisi et
// le bouton Publier. Un seul média par billet (une photo ou une vidéo).
// Partagé par le mur de la communauté et par « Mon mur » dans /compte.

const TAILLE_MAX_PHOTO = 15 * 1024 * 1024;   // 15 Mo
const TAILLE_MAX_VIDEO = 200 * 1024 * 1024;  // 200 Mo

// contexte 'feed' : dans le fil public, si Krystine n'a pas ouvert le mur aux
// membres, le composeur se retire (elle seule publie). contexte 'monmur' : le
// billet part alors dans le fil 'perso' (visible sur le mur de la personne,
// jamais dans le feed public).
const Composeur: React.FC<{ fil: FilMur; onPublie?: () => void; compact?: boolean; contexte?: 'feed' | 'monmur' }> = ({ fil, onPublie, compact, contexte = 'feed' }) => {
  const { user, member, isAdmin } = useAuth();
  const nom = member?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Un membre';
  const prenom = nom.split(' ')[0];
  const avatarUrl = member?.photoURL || user?.photoURL || undefined;

  const [texte, setTexte] = useState('');
  const [media, setMedia] = useState<{ kind: 'photo' | 'video'; url: string; chemin: string } | null>(null);
  const [progression, setProgression] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const zoneTexte = useRef<HTMLTextAreaElement>(null);
  const champPhoto = useRef<HTMLInputElement>(null);
  const champVideo = useRef<HTMLInputElement>(null);

  const [membresOk, setMembresOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (fil !== 'communaute' || !db) return;
    return onSnapshot(doc(db, 'settings', 'community'), s => setMembresOk(!!s.data()?.membresPeuventPublier), () => setMembresOk(false));
  }, [fil]);

  if (!user) return null;
  if (fil === 'krystine' && !isAdmin) return null;
  const filEffectif: FilMur = (fil === 'communaute' && !isAdmin && membresOk === false && contexte === 'monmur') ? 'perso' : fil;
  if (fil === 'communaute' && !isAdmin && membresOk !== true && contexte === 'feed') {
    return (
      <p className="text-sm italic text-[#3a3126]/50 dark:text-white/45">
        Seule Krystine publie sur ce fil pour le moment.
      </p>
    );
  }

  const ajuster = () => {
    const el = zoneTexte.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 320) + 'px';
  };

  const choisir = (kind: 'photo' | 'video') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const max = kind === 'photo' ? TAILLE_MAX_PHOTO : TAILLE_MAX_VIDEO;
    if (f.size > max) {
      setErreur(kind === 'photo' ? 'La photo dépasse 15 Mo.' : 'La vidéo dépasse 200 Mo.');
      return;
    }
    setErreur(null); setOuvert(true); setProgression(0);
    try {
      const { url, path } = await uploadMediaMur(f, user.uid, setProgression);
      setMedia({ kind, url, chemin: path });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally { setProgression(null); }
  };

  const publier = async () => {
    setEnvoi(true); setErreur(null);
    try {
      await publierSurLeMur({
        uid: user.uid, nom, avatarUrl, texte,
        photoUrl: media?.kind === 'photo' ? media.url : undefined,
        photoChemin: media?.kind === 'photo' ? media.chemin : undefined,
        videoUrl: media?.kind === 'video' ? media.url : undefined,
        videoChemin: media?.kind === 'video' ? media.chemin : undefined,
        fil: filEffectif, estAdmin: isAdmin,
      });
      setTexte(''); setMedia(null); setOuvert(false);
      if (zoneTexte.current) zoneTexte.current.style.height = 'auto';
      onPublie?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  const pret = !envoi && progression === null && (!!texte.trim() || !!media);

  return (
    <section
      className={`rounded-[20px] border border-white/60 bg-white/55 backdrop-blur-md shadow-[0_10px_30px_-18px_rgba(58,49,38,0.3)] transition-shadow dark:border-white/10 dark:bg-[#2a2015]/55 ${compact ? 'p-4' : 'p-5 md:p-6'} ${ouvert ? 'shadow-[0_18px_40px_-20px_rgba(58,49,38,0.45)]' : ''}`}
    >
      <div className="flex items-start gap-3">
        {avatarUrl
          ? <img src={avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/70" />
          : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#bb9a5e]/25 font-['Cormorant_Garamond'] text-lg text-[#7d6330]">{prenom.charAt(0).toUpperCase()}</span>}
        <textarea
          ref={zoneTexte}
          value={texte}
          onFocus={() => setOuvert(true)}
          onChange={(e) => { setTexte(e.target.value.slice(0, LONGUEUR_MAX_POST)); ajuster(); }}
          rows={ouvert ? 3 : 1}
          placeholder={`Quoi de neuf, ${prenom} ?`}
          className="min-h-[44px] w-full resize-none rounded-2xl border border-[#3a3126]/10 bg-white/60 px-4 py-2.5 text-sm leading-relaxed text-[#2a2015] outline-none transition-colors placeholder:text-[#3a3126]/45 focus:border-[#bb9a5e] dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
        />
      </div>

      {progression !== null && (
        <div className="mt-3 ml-[52px]">
          <div className="h-1.5 overflow-hidden rounded-full bg-[#3a3126]/10 dark:bg-white/10">
            <div className="h-full rounded-full bg-[#bb9a5e] transition-[width] duration-300" style={{ width: `${Math.max(4, progression)}%` }} />
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#7d6330]">Téléversement {Math.round(progression)} %</p>
        </div>
      )}

      {media && (
        <div className="relative mt-3 ml-[52px] inline-block max-w-full">
          {media.kind === 'photo'
            ? <img src={media.url} alt="" className="max-h-72 rounded-[16px] object-cover" />
            : <video src={media.url} controls playsInline className="max-h-72 rounded-[16px] bg-black" />}
          <button
            type="button"
            onClick={() => setMedia(null)}
            aria-label="Retirer"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2a2015]/80 text-white transition-colors hover:bg-[#2a2015]"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {(ouvert || media) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#3a3126]/8 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => champPhoto.current?.click()}
            disabled={progression !== null}
            className="inline-flex items-center gap-2 rounded-full border border-[#3a3126]/15 px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-[#3a3126]/70 transition-colors hover:border-[#bb9a5e] hover:text-[#7d6330] disabled:opacity-50 dark:border-white/10 dark:text-white/70"
          >
            <ImageIcon size={13} /> Photo
          </button>
          <button
            type="button"
            onClick={() => champVideo.current?.click()}
            disabled={progression !== null}
            className="inline-flex items-center gap-2 rounded-full border border-[#3a3126]/15 px-3.5 py-2 text-[10px] uppercase tracking-[0.18em] text-[#3a3126]/70 transition-colors hover:border-[#bb9a5e] hover:text-[#7d6330] disabled:opacity-50 dark:border-white/10 dark:text-white/70"
          >
            <Video size={13} /> Vidéo
          </button>
          <input ref={champPhoto} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={choisir('photo')} />
          <input ref={champVideo} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={choisir('video')} />
          <span className="ml-auto text-[10px] text-[#3a3126]/40 dark:text-white/40">{texte.length}/{LONGUEUR_MAX_POST}</span>
          <button
            type="button"
            onClick={publier}
            disabled={!pret}
            className="inline-flex items-center gap-2 rounded-full bg-[#bb9a5e] px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-[#2a2015] transition-colors hover:bg-[#a3823f] disabled:opacity-50"
          >
            {envoi ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Publier
          </button>
        </div>
      )}
      {erreur && <p className="mt-2 text-xs text-red-500">{erreur}</p>}
    </section>
  );
};

export default Composeur;
