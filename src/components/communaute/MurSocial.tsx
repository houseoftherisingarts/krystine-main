import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Send, X } from 'lucide-react';
import { useAuth } from '../../contexts/AppContext';
import { uploadImage } from '../../firebase/storage';
import { publierSurLeMur, suivreLeMur, LONGUEUR_MAX_POST, type FilMur, type PostMur } from '../../firebase/mur';
import BilletCarte from './BilletCarte';

// ─── Le mur d'un seul fil ────────────────────────────────────────────
// Porté du FMM 2026 (src/components/mur/MurSocial.tsx). CommunauteEspace
// pose deux instances côte à côte : « krystine » (Krystine seule publie)
// et « communaute » (tout membre connecté publie).
const MurSocial: React.FC<{ fil: FilMur; titre: string }> = ({ fil, titre }) => {
  const { user, member, isAdmin } = useAuth();
  const [posts, setPosts] = useState<PostMur[]>([]);
  useEffect(() => suivreLeMur(fil, setPosts), [fil]);

  const nom = member?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Un membre';
  const avatarUrl = member?.photoURL || user?.photoURL || undefined;
  const peutPublierIci = fil === 'communaute' ? !!user : isAdmin;

  const [texte, setTexte] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const fichier = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const choisirPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploadBusy(true); setErreur(null);
    try {
      const { url } = await uploadImage(f, 'mur');
      setPhotoUrl(url);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally { setUploadBusy(false); }
  };

  const publier = async () => {
    if (!user) return;
    setEnvoi(true); setErreur(null);
    try {
      await publierSurLeMur({
        uid: user.uid, nom, avatarUrl, texte,
        photoUrl: photoUrl || undefined,
        fil, estAdmin: isAdmin,
      });
      setTexte(''); setPhotoUrl('');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally { setEnvoi(false); }
  };

  return (
    <div className="space-y-5">
      <h2 className="font-serif text-xl text-[#2a2015] dark:text-white">{titre}</h2>

      {peutPublierIci && (
        <section className="bg-white/55 backdrop-blur-md dark:bg-[#2a2015]/55 rounded-[20px] border border-white/60 dark:border-white/10 shadow-[0_10px_30px_-18px_rgba(58,49,38,0.3)] p-5 md:p-6">
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value.slice(0, LONGUEUR_MAX_POST))}
            rows={3}
            placeholder="Quoi de neuf ?"
            className="w-full px-4 py-3 rounded-xl border border-[#3a3126]/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-[#2a2015] dark:text-white text-sm leading-relaxed outline-none focus:border-[#bb9a5e] transition-colors"
          />
          {photoUrl && (
            <div className="relative mt-3 inline-block">
              <img src={photoUrl} alt="" className="max-h-56 rounded-[16px] object-cover" />
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                aria-label="Retirer la photo"
                className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-[#2a2015]/80 text-white"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => fichier.current?.click()}
              disabled={uploadBusy}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#3a3126]/15 dark:border-white/10 text-[10px] uppercase tracking-[0.18em] text-[#3a3126]/70 dark:text-white/70 hover:border-[#bb9a5e] hover:text-[#7d6330] transition-colors disabled:opacity-50"
            >
              {uploadBusy ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} Photo
            </button>
            <input ref={fichier} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={choisirPhoto} />
            <span className="ml-auto text-[10px] text-[#3a3126]/40 dark:text-white/40">{texte.length}/{LONGUEUR_MAX_POST}</span>
            <button
              type="button"
              onClick={publier}
              disabled={envoi || uploadBusy || (!texte.trim() && !photoUrl)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#bb9a5e] text-[#2a2015] text-xs font-bold uppercase tracking-widest hover:bg-[#a3823f] transition-colors disabled:opacity-50"
            >
              {envoi ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Publier
            </button>
          </div>
          {erreur && <p className="mt-2 text-xs text-red-500">{erreur}</p>}
        </section>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-[#3a3126]/50 dark:text-white/45">
          {fil === 'krystine' ? 'Rien de publié pour le moment.' : 'Le fil est encore vide. Soyez la première voix.'}
        </p>
      ) : posts.map((p, i) => <BilletCarte key={p.id} post={p} delaiIndex={i} />)}
    </div>
  );
};

export default MurSocial;
