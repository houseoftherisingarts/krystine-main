import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import app, { db } from '../../firebase';
import Portail from '../Portail';

// Le bouton « Problème technique » de l'espace client et sa fenêtre.
//
// La personne décrit ce qui cloche, capture l'écran tel qu'il est derrière la
// fenêtre (html2canvas, la fenêtre se cache le temps de la photo) ou téléverse
// une capture de son cru, puis envoie. Le rapport se range dans `bugs/{id}`
// (l'onglet Problèmes techniques de l'admin de Krystine) et part en même
// temps à la porte du studio, recevoirDemande, où l'onglet Demandes de
// l'admin Vexel le montre sous la fiche de Krystine.

const VEXEL_PORTE = 'https://us-central1-vexel-integrations.cloudfunctions.net/recevoirDemande';
const VEXEL_CLIENT = 'krystine';
const VEXEL_CLE = 'aT_yMR68NLyEW3weNDjwYdW_';
const TAILLE_MAX = 10 * 1024 * 1024;

interface Props {
  uid: string;
  nom: string;
  courriel: string;
  lang: 'FR' | 'EN';
}

const T = {
  FR: {
    bouton: 'Problème technique',
    titre: 'Signaler un problème technique',
    intro: 'Dites-nous ce qui cloche. Une capture d’écran nous aide à retrouver l’endroit exact.',
    capturer: 'Capturer l’écran',
    capture: 'Capture en cours',
    televerser: 'Téléverser une capture',
    retirer: 'Retirer la capture',
    placeholder: 'Ce qui s’est passé, et ce que vous attendiez à la place.',
    envoyer: 'Envoyer',
    envoi: 'Envoi',
    merci: 'Merci. Le rapport est parti; Krystine et le studio le voient dès maintenant.',
    fermer: 'Fermer',
    tropGros: 'La capture dépasse 10 Mo.',
    pasImage: 'Le fichier doit être une image.',
    captureRatee: 'La capture automatique n’a pas fonctionné sur cette page. Téléversez une capture de votre écran.',
    rate: 'L’envoi n’a pas fonctionné. Réessayez dans un instant.',
  },
  EN: {
    bouton: 'Technical issue',
    titre: 'Report a technical issue',
    intro: 'Tell us what is going wrong. A screenshot helps us find the exact spot.',
    capturer: 'Take a screenshot',
    capture: 'Capturing',
    televerser: 'Upload a screenshot',
    retirer: 'Remove screenshot',
    placeholder: 'What happened, and what you expected instead.',
    envoyer: 'Send',
    envoi: 'Sending',
    merci: 'Thank you. The report is on its way; Krystine and the studio can see it now.',
    fermer: 'Close',
    tropGros: 'The screenshot is over 10 MB.',
    pasImage: 'The file must be an image.',
    captureRatee: 'Automatic capture did not work on this page. Upload a screenshot of your screen instead.',
    rate: 'Sending failed. Try again in a moment.',
  },
};

/** L'écran visible, photographié derrière la fenêtre, en JPEG raisonnable. */
async function capturerEcran(): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas');
  const largeur = window.innerWidth;
  const hauteur = window.innerHeight;
  const canvas = await html2canvas(document.documentElement, {
    x: window.scrollX,
    y: window.scrollY,
    width: largeur,
    height: hauteur,
    scrollX: 0,
    scrollY: 0,
    windowWidth: largeur,
    windowHeight: hauteur,
    scale: Math.min(1.5, 2000 / largeur),
    useCORS: true,
    logging: false,
    backgroundColor: null,
    ignoreElements: (el) => el.hasAttribute('data-bug-ignore'),
  });
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob a rendu null'))), 'image/jpeg', 0.85);
  });
}

const ProblemeTechnique: React.FC<Props> = ({ uid, nom, courriel, lang }) => {
  const t = T[lang];
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState('');
  const [image, setImage] = useState<Blob | null>(null);
  const [apercu, setApercu] = useState('');
  const [etat, setEtat] = useState<'repos' | 'capture' | 'envoi' | 'envoye'>('repos');
  const [erreur, setErreur] = useState('');
  const fichierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) { setApercu(''); return; }
    const url = URL.createObjectURL(image);
    setApercu(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ouvert]);

  const fermer = () => {
    setOuvert(false);
    if (etat === 'envoye') { setTexte(''); setImage(null); setEtat('repos'); }
    setErreur('');
  };

  const capturer = async () => {
    setErreur('');
    setEtat('capture');
    try {
      // Un tour de rendu pour que la fenêtre disparaisse avant la photo.
      await new Promise((r) => setTimeout(r, 80));
      setImage(await capturerEcran());
    } catch (e) {
      console.warn('[bug] capture ratée', e);
      setErreur(t.captureRatee);
    } finally {
      setEtat('repos');
    }
  };

  const choisir = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErreur(t.pasImage); return; }
    if (f.size > TAILLE_MAX) { setErreur(t.tropGros); return; }
    setErreur('');
    setImage(f);
  };

  const envoyer = async () => {
    if (!texte.trim() || etat !== 'repos' || !db || !app) return;
    setEtat('envoi');
    setErreur('');
    const page = window.location.pathname + window.location.search;
    const ecran = `${window.innerWidth}×${window.innerHeight}`;
    try {
      let capture = '';
      let capturePath = '';
      if (image) {
        const ext = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
        capturePath = `bugs/${uid}/${Date.now()}.${ext}`;
        const r = ref(getStorage(app), capturePath);
        await uploadBytes(r, image, { contentType: image.type || 'image/jpeg' });
        capture = await getDownloadURL(r);
      }

      // La porte du studio d'abord : si elle refuse, le rapport se range
      // quand même chez Krystine avec la mention, et rien n'est perdu.
      let vexel: 'transmis' | 'echec' = 'echec';
      try {
        const rep = await fetch(VEXEL_PORTE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: VEXEL_CLIENT,
            cle: VEXEL_CLE,
            type: 'bug',
            auteurNom: nom,
            auteurCourriel: courriel,
            texte: texte.trim(),
            page: `https://krystinestlaurent.ca${page}`,
            capture,
            agent: navigator.userAgent,
            ecran,
          }),
        });
        if (rep.ok) vexel = 'transmis';
      } catch (e) {
        console.warn('[bug] porte Vexel injoignable', e);
      }

      await addDoc(collection(db, 'bugs'), {
        uid,
        nom,
        courriel,
        texte: texte.trim().slice(0, 4000),
        page,
        capture,
        capturePath,
        agent: navigator.userAgent.slice(0, 300),
        ecran,
        statut: 'nouveau',
        vexel,
        cree: serverTimestamp(),
      });
      setEtat('envoye');
    } catch (e) {
      console.error('[bug] envoi raté', e);
      setErreur(t.rate);
      setEtat('repos');
    }
  };

  const enCapture = etat === 'capture';

  return (
    <>
      <button
        type="button"
        data-bug-ignore
        onClick={() => setOuvert(true)}
        className="fixed bottom-5 left-5 z-[110] flex items-center gap-2 rounded-full border border-white/60 bg-[#EEE7DB]/85 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B4A2F] shadow-[0_10px_30px_-12px_rgba(41,48,39,0.45)] backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-[#EEE7DB] dark:border-white/10 dark:bg-[#293027]/85 dark:text-[#d9a05b] dark:hover:bg-[#293027]"
      >
        <i className="fa-solid fa-bug" /> {t.bouton}
      </button>

      {ouvert && (
        <div
          data-bug-ignore
          className="fixed inset-0 z-[130] flex items-center justify-center bg-[#151d19]/60 p-4 backdrop-blur-sm"
          style={enCapture ? { visibility: 'hidden' } : undefined}
          onClick={fermer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-titre"
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-white/60 bg-[#EEE7DB] p-6 shadow-2xl md:p-8 dark:border-white/10 dark:bg-[#293027]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <h2 id="bug-titre" className="font-serif text-2xl text-[#293027] dark:text-white" style={{ letterSpacing: '-0.01em' }}>
                {t.titre}
              </h2>
              <button type="button" onClick={fermer} aria-label={t.fermer} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#293027]/40 hover:text-[#293027] dark:text-white/40 dark:hover:text-white">
                <i className="fa-solid fa-times text-lg" />
              </button>
            </div>

            {etat === 'envoye' ? (
              <div className="py-6 text-center">
                <i className="fa-solid fa-circle-check mb-3 text-3xl text-[#BA7B39]" />
                <p className="text-sm text-[#293027]/80 dark:text-white/80">{t.merci}</p>
                <button type="button" onClick={fermer} className="mt-6 rounded-full bg-[#293027] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]">
                  {t.fermer}
                </button>
              </div>
            ) : (
              <>
                <p className="mb-5 text-sm text-[#293027]/70 dark:text-white/70">{t.intro}</p>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={capturer}
                    disabled={enCapture || etat === 'envoi'}
                    className="flex items-center gap-2 rounded-full border border-[#BA7B39]/50 bg-white/60 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B4A2F] transition-colors hover:bg-white disabled:opacity-50 dark:bg-white/10 dark:text-[#d9a05b] dark:hover:bg-white/15"
                  >
                    <i className="fa-solid fa-camera" /> {enCapture ? t.capture : t.capturer}
                  </button>
                  <button
                    type="button"
                    onClick={() => fichierRef.current?.click()}
                    disabled={enCapture || etat === 'envoi'}
                    className="flex items-center gap-2 rounded-full border border-[#38403a]/15 bg-white/40 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#38403a]/80 transition-colors hover:bg-white disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                  >
                    <i className="fa-solid fa-upload" /> {t.televerser}
                  </button>
                  <input ref={fichierRef} type="file" accept="image/*" className="hidden" onChange={choisir} />
                </div>

                {apercu && (
                  <div className="relative mb-4 overflow-hidden rounded-[16px] border border-white/70 bg-white/40 dark:border-white/10 dark:bg-white/5">
                    <img src={apercu} alt="" className="max-h-56 w-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setImage(null)}
                      title={t.retirer}
                      aria-label={t.retirer}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#151d19]/70 text-white hover:bg-[#151d19]"
                    >
                      <i className="fa-solid fa-times" />
                    </button>
                  </div>
                )}

                <textarea
                  value={texte}
                  onChange={(e) => setTexte(e.target.value)}
                  placeholder={t.placeholder}
                  rows={5}
                  maxLength={4000}
                  className="w-full resize-y rounded-[16px] border border-[#38403a]/15 bg-white/70 px-4 py-3 text-sm text-[#293027] outline-none placeholder:text-[#293027]/35 focus:border-[#BA7B39] dark:border-white/15 dark:bg-white/10 dark:text-white dark:placeholder:text-white/35"
                />

                {erreur && <p className="mt-3 text-xs font-semibold text-[#a6412a] dark:text-[#f0a48c]">{erreur}</p>}

                <div className="mt-5 flex items-center justify-end gap-3">
                  <button type="button" onClick={fermer} className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#38403a]/55 hover:text-[#293027] dark:text-white/55 dark:hover:text-white">
                    {t.fermer}
                  </button>
                  <button
                    type="button"
                    onClick={envoyer}
                    disabled={!texte.trim() || etat !== 'repos'}
                    className="flex items-center gap-2 rounded-full bg-[#293027] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:opacity-40 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
                  >
                    <i className="fa-solid fa-paper-plane" /> {etat === 'envoi' ? t.envoi : t.envoyer}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProblemeTechnique;
