import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../contexts/AppContext';
import { telechargerMusiqueOrigine } from '../../firebase/musique';

const ease = [0.16, 0.8, 0.24, 1] as const;

/* La musique de l'Expérience Origine, offerte au bas du Foyer. Connectée :
   un seul geste, la musique entre dans son espace (Téléchargements) et le
   fichier part. Visiteuse : prénom, courriel et consentement à l'infolettre. */
const MusiqueOrigine: React.FC = () => {
  const reduce = useReducedMotion();
  const { user, setSignInOpen } = useAuth();
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const obtenir = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErreur(null);
    if (!user) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErreur('Un courriel valide est nécessaire.'); return; }
      if (!consent) { setErreur("Cochez la case de l'infolettre pour recevoir la musique."); return; }
    }
    setBusy(true);
    try {
      const lien = await telechargerMusiqueOrigine(user ? undefined : { email: email.trim(), prenom: prenom.trim(), consent });
      setUrl(lien);
    } catch {
      setErreur("Le lien n'a pas pu être préparé. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const champ = 'w-full border-b border-brass/40 bg-transparent py-3 font-sans text-fyBody text-ctext placeholder:text-ctextSoft/60 focus:border-brassBright focus:outline-none';

  return (
    <section id="musique" className="relative z-[55] bg-encre px-6 pt-24 pb-28 md:px-12 md:pt-32 md:pb-36 lg:px-20">
      <div className="relative mx-auto w-full max-w-[1360px]">
        <div className="grid gap-x-20 gap-y-12 lg:grid-cols-12 lg:items-center">
          <motion.div
            className="lg:col-span-7"
            initial={reduce ? undefined : { opacity: 0, y: 30, filter: 'blur(6px)' }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, ease }}
          >
            <p className="font-sans text-fyLabel uppercase text-brass">Un cadeau du Foyer</p>
            <h2 className="mt-6 font-serif font-medium text-fyH2 text-ctext" style={{ textWrap: 'balance' }}>
              Télécharger la musique d'Origine
            </h2>
            <p className="mt-6 max-w-[56ch] font-sans text-fyBody text-ctextSoft">
              La pièce composée pour l'Expérience Origine accompagne les rituels du matin et les soirs autour du feu. Elle est à vous, à écouter aussi souvent que le corps le demande.
            </p>
            {user && (
              <p className="mt-4 max-w-[56ch] font-sans text-fyBody text-ctextSoft">
                Elle restera dans votre espace, dans la section Téléchargements.
              </p>
            )}
          </motion.div>

          <motion.div
            className="lg:col-span-5"
            initial={reduce ? undefined : { opacity: 0, y: 26 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.1, ease, delay: 0.18 }}
          >
            <div className="rounded-[15px] border border-brass/25 bg-white/[0.04] p-7 backdrop-blur-sm md:p-9">
              {url ? (
                <div>
                  <p className="font-sans text-fyLabel uppercase text-brassBright">Votre musique est prête</p>
                  <audio controls preload="none" src={url} className="mt-5 w-full" />
                  <a
                    href={url}
                    download="Origine_OST_1.mp3"
                    className="mt-6 inline-flex items-center gap-3 rounded-full bg-brass px-7 py-3.5 font-sans text-fyLabel uppercase text-espresso transition-transform hover:scale-[1.02]"
                  >
                    <i className="fa-solid fa-download" /> Enregistrer le fichier
                  </a>
                  <p className="mt-5 font-sans text-fyBody text-ctextSoft">
                    {user
                      ? 'La musique est aussi dans votre espace, section Téléchargements.'
                      : 'Le lien reste valide deux heures. Avec un compte, la musique vous attend pour toujours dans votre espace.'}
                  </p>
                  {!user && (
                    <button type="button" onClick={() => setSignInOpen(true)} className="mt-3 border-b border-brass/60 pb-1 font-sans text-fyLabel uppercase text-brassBright transition-colors hover:text-ctext">
                      Créer mon compte
                    </button>
                  )}
                </div>
              ) : user ? (
                <div>
                  <p className="font-sans text-fyLabel uppercase text-brassBright">Vous êtes connectée</p>
                  <p className="mt-4 font-sans text-fyBody text-ctextSoft">Un seul geste : la musique s'ajoute à votre espace et le fichier part tout de suite.</p>
                  <button
                    type="button"
                    onClick={() => obtenir()}
                    disabled={busy}
                    className="mt-6 inline-flex items-center gap-3 rounded-full bg-brass px-7 py-3.5 font-sans text-fyLabel uppercase text-espresso transition-transform hover:scale-[1.02] disabled:opacity-60"
                  >
                    <i className="fa-solid fa-music" /> {busy ? 'Un instant…' : 'Ajouter à mon espace et télécharger'}
                  </button>
                </div>
              ) : (
                <form onSubmit={obtenir} noValidate>
                  <p className="font-sans text-fyLabel uppercase text-brassBright">Recevoir la musique</p>
                  <div className="mt-5 space-y-3">
                    <input className={champ} type="text" placeholder="Prénom" autoComplete="given-name" value={prenom} onChange={(e) => setPrenom(e.target.value)} aria-label="Prénom" />
                    <input className={champ} type="email" placeholder="Votre courriel" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Votre courriel" required />
                  </div>
                  <label className="mt-6 flex cursor-pointer items-start gap-3 font-sans text-fyBody text-ctextSoft">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1.5 h-4 w-4 accent-[#bb9a5e]" />
                    <span>Je veux recevoir l'infolettre de Krystine et la musique d'Origine. Désinscription en un clic, à tout moment.</span>
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-7 inline-flex items-center gap-3 rounded-full bg-brass px-7 py-3.5 font-sans text-fyLabel uppercase text-espresso transition-transform hover:scale-[1.02] disabled:opacity-60"
                  >
                    <i className="fa-solid fa-music" /> {busy ? 'Un instant…' : 'Télécharger la musique'}
                  </button>
                  <p className="mt-5 font-sans text-fyBody text-ctextSoft">
                    Vous avez déjà un compte ?{' '}
                    <button type="button" onClick={() => setSignInOpen(true)} className="border-b border-brass/60 pb-0.5 text-brassBright transition-colors hover:text-ctext">
                      Connectez-vous
                    </button>
                    {' '}et la musique s'ajoute à votre espace.
                  </p>
                </form>
              )}
              {erreur && <p role="alert" className="mt-4 font-sans text-fyBody text-[#e0a58a]">{erreur}</p>}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MusiqueOrigine;
