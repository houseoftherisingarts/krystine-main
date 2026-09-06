import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Portail from '../Portail';
import { AvecSignature, telechargerImage } from './Signature';

// La fenêtre du fond d'écran : l'image en 1920 × 1080, le bouton pour la
// garder sur son ordinateur, et la marche à suivre sur Mac ou sur PC (au
// choix, d'un clic). Alex, 6 septembre 2026. Elle passe par le Portail pour
// s'ouvrir devant les yeux et non au fond du scroll; la signature de
// Krystine y figure tant que la version sans signature n'a pas été prise.
const FondEcran: React.FC<{ ouvert: boolean; onFermer: () => void; image: string; nom: string; lang: string; signe: boolean }> = ({ ouvert, onFermer, image, nom, lang, signe }) => {
  const fr = lang === 'FR';
  const [os, setOs] = useState<'mac' | 'pc'>(() => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'mac' : 'pc'));
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const fichier = `${nom.replace(/^Bannière\s+/i, '').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-1920x1080.webp`;
  const garder = async () => {
    if (occupe) return;
    setOccupe(true);
    setErreur(null);
    try { await telechargerImage(image, fichier, signe); } catch { setErreur(fr ? 'Le téléchargement n’a pas fonctionné. Réessayez dans un instant.' : 'The download did not work. Try again in a moment.'); } finally { setOccupe(false); }
  };
  const etapes = os === 'mac'
    ? (fr
      ? ['Cliquez sur « Garder l’image » : elle arrive dans votre dossier Téléchargements.', 'Ouvrez Réglages Système, puis « Fond d’écran ».', 'Cliquez sur « Ajouter une photo » (ou « Ajouter un dossier »), et choisissez l’image dans Téléchargements.', 'Elle s’affiche aussitôt. Choisissez « Remplir l’écran » si on vous le demande.']
      : ['Click “Keep the image”: it lands in your Downloads folder.', 'Open System Settings, then “Wallpaper”.', 'Click “Add Photo” (or “Add Folder”) and pick the image in Downloads.', 'It shows right away. Choose “Fill Screen” if asked.'])
    : (fr
      ? ['Cliquez sur « Garder l’image » : elle arrive dans votre dossier Téléchargements.', 'Ouvrez Paramètres, puis Personnalisation, puis « Arrière-plan ».', 'Sous « Personnaliser votre arrière-plan », choisissez « Image », puis « Parcourir les photos » et l’image dans Téléchargements.', 'Réglez « Choisir un ajustement » sur « Remplir ».']
      : ['Click “Keep the image”: it lands in your Downloads folder.', 'Open Settings, then Personalization, then “Background”.', 'Under “Personalize your background”, choose “Picture”, then “Browse photos” and the image in Downloads.', 'Set “Choose a fit” to “Fill”.']);
  return (
    <AnimatePresence>
      {ouvert && (
        <Portail>
          <motion.div className="fixed inset-0 z-[130] flex items-center justify-center overflow-y-auto overscroll-contain bg-[#151d19]/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer}>
            <motion.div
              initial={{ scale: 0.94, y: 14, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[24px] border border-white/60 bg-[#EEE7DB] p-5 md:p-7 dark:border-white/10 dark:bg-[#293027]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]"><i className="fa-solid fa-desktop mr-1" /> {fr ? 'Fond d’écran · 1920 × 1080' : 'Wallpaper · 1920 × 1080'}</p>
                  <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">{nom.replace(/^Bannière\s+/i, '')}</h3>
                </div>
                <button type="button" onClick={onFermer} aria-label={fr ? 'Fermer' : 'Close'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#293027]/40 hover:text-[#293027] dark:text-white/40 dark:hover:text-white"><i className="fa-solid fa-times text-lg" /></button>
              </div>
              <div className="mt-4 overflow-hidden rounded-[16px] border border-[#293027]/10 bg-black dark:border-white/10">
                <AvecSignature signe={signe}>
                  <img src={image} alt={nom} width={1920} height={1080} className="aspect-video w-full object-cover" />
                </AvecSignature>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="button" onClick={garder} disabled={occupe} className="inline-flex items-center gap-2 rounded-full bg-[#293027] px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] hover:bg-[#3a453a] disabled:opacity-50 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]">
                  <i className={`fa-solid ${occupe ? 'fa-circle-notch fa-spin' : 'fa-download'}`} /> {fr ? 'Garder l’image' : 'Keep the image'}
                </button>
                <div className="ml-auto inline-flex rounded-full border border-[#293027]/15 p-0.5 dark:border-white/15">
                  {(['mac', 'pc'] as const).map(o => (
                    <button key={o} type="button" onClick={() => setOs(o)} className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${os === o ? 'bg-[#BA7B39] text-[#293027]' : 'text-[#293027]/60 hover:text-[#293027] dark:text-white/60 dark:hover:text-white'}`}>
                      <i className={`fa-brands ${o === 'mac' ? 'fa-apple' : 'fa-windows'} mr-1.5`} />{o === 'mac' ? 'Mac' : 'PC'}
                    </button>
                  ))}
                </div>
              </div>
              {erreur && <p className="mt-3 text-sm text-[#8B4A2F] dark:text-[#d9a05b]">{erreur}</p>}
              {signe && (
                <p className="mt-3 text-xs text-[#293027]/55 dark:text-white/55">
                  {fr ? 'La signature de Krystine figure en bas à droite. Elle se retire contre cinq niskas, depuis la carte de la bannière.' : 'Krystine’s signature sits bottom right. It comes off for five niskas, from the banner’s card.'}
                </p>
              )}
              <ol className="mt-4 space-y-2 text-sm text-[#293027]/80 dark:text-white/80">
                {etapes.map((e, i) => (
                  <li key={i} className="flex gap-3"><span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#BA7B39]/20 font-serif text-xs text-[#8B4A2F] dark:text-[#d9a05b]">{i + 1}</span><span>{e}</span></li>
                ))}
              </ol>
            </motion.div>
          </motion.div>
        </Portail>
      )}
    </AnimatePresence>
  );
};

export default FondEcran;
