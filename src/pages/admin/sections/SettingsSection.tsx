import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { ADMIN_EMAILS, logout } from '../../../firebase/auth';
import { Card, DangerButton, GhostButton, ToggleSwitch } from '../primitives';

// L'accès profil/compte dans le header du site public. Tant que le toggle est
// off, l'avatar, la cloche et la connexion sont cachés au public (les
// administrateurs les voient toujours). On l'active quand la communauté est prête.
const AccesProfilCard: React.FC = () => {
  const [profilPublic, setProfilPublic] = useState(false);
  const [charge, setCharge] = useState(true);
  useEffect(() => {
    getDoc(doc(db, 'settings', 'community'))
      .then(s => setProfilPublic(!!s.data()?.profilPublic))
      .finally(() => setCharge(false));
  }, []);
  const basculer = async (v: boolean) => {
    setProfilPublic(v);
    await setDoc(doc(db, 'settings', 'community'), { profilPublic: v }, { merge: true });
  };
  return (
    <Card className="p-6">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Accès profil public</h3>
      <p className="mb-4 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
        Quand ce réglage est activé, l'espace compte devient accessible à tous depuis le header du site.
        Tant qu'il est désactivé, seuls les administrateurs y accèdent, le temps de finir la communauté.
      </p>
      {!charge && (
        <ToggleSwitch checked={profilPublic} onChange={basculer} label={profilPublic ? 'Accessible au public' : 'Caché au public'} />
      )}
    </Card>
  );
};


// Site-level audio assets (background music + the Origine cohort piece),
// hosted in Google Cloud Storage and played in-browser. Listed here so
// Krystine can grab the original files at any time from the admin.
const SITE_AUDIO: Array<{
  id: string;
  labelFR: string;
  noteFR: string;
  url: string;
  filename: string;
}> = [
  {
    id: 'main-bg',
    labelFR: 'Musique de fond du site',
    noteFR: "Jouée en boucle à faible volume via le bouton musique de la barre supérieure (Homecoming — Tranquilium).",
    url: 'https://storage.googleapis.com/inspirata/Base%20site/homecoming-tranquilium-main-version-25793-03-28.mp3',
    filename: 'inspirata-musique-site.mp3',
  },
  {
    id: 'origine-cohorte',
    labelFR: "Musique Expérience Origine",
    noteFR: "Pièce utilisée dans le bundle /origine (Cohorte fondatrice).",
    url: 'https://storage.googleapis.com/origine1/EXPE%CC%81RIENCE%20ORIGINE-COHORTE%20FONDATRICE.mp3',
    filename: 'experience-origine-cohorte-fondatrice.mp3',
  },
];

const SettingsSection: React.FC<{ user: User }> = ({ user }) => {
  const firebaseProject = (import.meta.env.VITE_FIREBASE_PROJECT_ID as string) || 'non configuré';
  const shopifyDomain = (import.meta.env.VITE_SHOPIFY_DOMAIN as string) || 'non configuré';

  return (
    <div className="space-y-6 max-w-3xl">
      <AccesProfilCard />
      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">Compte connecté</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user.photoURL && <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full border border-[#BA7B39]/30" />}
            <div>
              <p className="font-serif text-[#293027] dark:text-white">{user.displayName || user.email?.split('@')[0]}</p>
              <p className="text-sm text-[#293027]/50 dark:text-white/50">{user.email}</p>
            </div>
          </div>
          <DangerButton onClick={logout}><i className="fa-solid fa-right-from-bracket" /> Déconnexion</DangerButton>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">Administrateurs autorisés</h3>
        <p className="text-xs text-[#293027]/50 dark:text-white/50 mb-4">
          Pour ajouter ou retirer un administrateur, modifiez la constante <code className="bg-[#EEE7DB] dark:bg-white/10 px-2 py-0.5 rounded text-[11px]">ADMIN_EMAILS</code> dans <code className="bg-[#EEE7DB] dark:bg-white/10 px-2 py-0.5 rounded text-[11px]">src/firebase/auth.ts</code>.
        </p>
        <ul className="space-y-2">
          {ADMIN_EMAILS.map(email => (
            <li key={email} className="flex items-center gap-3 text-sm text-[#293027] dark:text-white">
              <i className="fa-solid fa-user-shield text-[#8B4A2F]" />
              <span>{email}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-2">Fichiers audio</h3>
        <p className="text-xs text-[#293027]/50 dark:text-white/50 mb-5">
          Les pistes audio utilisées sur le site. Écoutez-les ici ou téléchargez l'original.
        </p>
        <ul className="space-y-5">
          {SITE_AUDIO.map(a => (
            <li key={a.id} className="border border-[#293027]/5 dark:border-white/5 rounded-xl p-4 bg-[#EEE7DB]/60 dark:bg-white/5">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="min-w-0">
                  <p className="font-serif text-[#293027] dark:text-white flex items-center gap-2">
                    <i className="fa-solid fa-music text-[#8B4A2F]" />
                    {a.labelFR}
                  </p>
                  <p className="text-[11px] text-[#293027]/50 dark:text-white/50 mt-1 leading-relaxed">{a.noteFR}</p>
                </div>
                {/* Using an <a download> with a same-origin proxy would give a
                    cleaner filename, but GCS serves these with CORS open, so
                    the download attribute on a cross-origin URL still works
                    in Chromium/Firefox — Safari falls back to "open in tab",
                    which is acceptable. */}
                <a
                  href={a.url}
                  download={a.filename}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold uppercase tracking-widest text-[11px] bg-[#293027] dark:bg-[#BA7B39] text-white dark:text-[#293027] hover:bg-[#BA7B39] hover:text-[#293027] transition-colors shadow-md whitespace-nowrap"
                >
                  <i className="fa-solid fa-download" /> Télécharger
                </a>
              </div>
              <audio
                controls
                preload="none"
                className="w-full mt-1"
                src={a.url}
              />
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <GhostButton
                  type="button"
                  onClick={() => { navigator.clipboard?.writeText(a.url); }}
                >
                  <i className="fa-solid fa-link" /> Copier le lien
                </GhostButton>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50 hover:text-[#8B4A2F]"
                >
                  <i className="fa-solid fa-up-right-from-square mr-1.5" />
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="text-sm uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold mb-4">Infrastructure</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[#293027]/60 dark:text-white/60"><i className="fa-solid fa-fire text-orange-400 mr-2" />Firebase</dt>
            <dd className="text-[#293027] dark:text-white font-mono text-xs">{firebaseProject}</dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-[#293027]/60 dark:text-white/60"><i className="fa-brands fa-shopify text-green-500 mr-2" />Shopify</dt>
            <dd className="text-[#293027] dark:text-white font-mono text-xs">{shopifyDomain}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
};

export default SettingsSection;
