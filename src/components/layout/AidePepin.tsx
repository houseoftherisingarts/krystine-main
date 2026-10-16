import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase';
import { useAuth } from '../../contexts/AppContext';
import { getLang } from '../../lib/i18n/lang';
import { RECAPTCHA_SITE_KEY, useRecaptcha } from '../../lib/recaptcha';
import Portail from '../Portail';

// « Un commentaire ? Écrivez-nous » (ex « Un pépin ? », ton positif depuis le
// 6 oct. 2026 : on peut aussi dire ce qu'on aime ou proposer une idée) : la petite pastille d'aide de toutes les pages
// publiques, connectée ou non. Elle prolonge le bouton « Problème technique »
// de l'espace client (même capture d'écran, même destination : `bugs` et
// l'onglet Problèmes techniques de l'admin) en ajoutant un type (technique ou
// introuvable, et depuis le 6 oct. 2026 aime ou idee) et le courriel de la personne. L'envoi passe par la fonction
// `signalerPepin`, qui garde la porte (case anti-robot et cadence par IP).
// Langage V2 : crème, encre, or, bouton noir carré.

const ENCRE = '#1c1712';
const CREME = '#f4efe6';
const OR = '#7d6330';
const FILET = '#9c7a44';
const COURRIEL_EQUIPE = 'teamksl@inspiratanature.com';
const COTE_MAX = 1600;

const T = {
  FR: {
    pastille: 'Un commentaire ? Écrivez-nous',
    infobulle: 'Un commentaire, un problème ou une question ? Écrivez-nous',
    choixCommentaire: 'Un commentaire',
    choixProbleme: 'Un problème ou une question',
    titre: 'Aidez-nous à vous offrir une expérience à 1000 %',
    intro: 'Un commentaire sur votre expérience de navigation ? Chaque message est lu par notre équipe.',
    introProbleme: 'Un problème ou une question ? Dites-nous ce qui se passe. Chaque message est lu par notre équipe.',
    aime: 'J’aime ce que je vois',
    idee: 'Une idée',
    technique: 'Quelque chose bloque',
    introuvable: 'Je ne trouve pas ce que je cherche',
    courriel: 'Votre courriel',
    message: 'Votre message',
    placeholder: 'Dites-nous ce qui vous plaît, votre idée, ou ce qui bloque.',
    capture: 'Capture d’écran (facultatif)',
    capturer: 'Capturer l’écran',
    capturePendant: 'Capture en cours',
    televerser: 'Téléverser une image',
    retirer: 'Retirer la capture',
    envoyer: 'Envoyer',
    envoi: 'Envoi en cours',
    fermer: 'Fermer',
    merci: 'Merci, votre message est bien reçu. Notre équipe le lit avec soin.',
    aussi: 'Vous pouvez aussi écrire à',
    pasImage: 'Le fichier doit être une image.',
    captureRatee: 'La capture automatique n’a pas fonctionné sur cette page. Téléversez plutôt une image.',
    robot: 'Cochez la case « Je ne suis pas un robot ».',
    courrielInvalide: 'Un courriel valide est nécessaire pour vous répondre.',
    rate: 'L’envoi n’a pas fonctionné. Réessayez dans un instant, ou écrivez à',
  },
  EN: {
    pastille: 'Any feedback? Write to us',
    infobulle: 'Feedback, a problem or a question? Write to us',
    choixCommentaire: 'Some feedback',
    choixProbleme: 'A problem or a question',
    titre: 'Help us make your experience 1000 %',
    intro: 'Any feedback on your browsing experience? Every message is read by our team.',
    introProbleme: 'A problem or a question? Tell us what is happening. Every message is read by our team.',
    aime: 'I like what I see',
    idee: 'An idea',
    technique: 'Something is blocking me',
    introuvable: 'I cannot find what I am looking for',
    courriel: 'Your email',
    message: 'Your message',
    placeholder: 'Tell us what you like, your idea, or what is blocking you.',
    capture: 'Screenshot (optional)',
    capturer: 'Capture the screen',
    capturePendant: 'Capturing',
    televerser: 'Upload an image',
    retirer: 'Remove the screenshot',
    envoyer: 'Send',
    envoi: 'Sending',
    fermer: 'Close',
    merci: 'Thank you, your message has been received. Our team reads it with care.',
    aussi: 'You can also write to',
    pasImage: 'The file must be an image.',
    captureRatee: 'Automatic capture did not work on this page. Upload an image instead.',
    robot: 'Please tick the “I am not a robot” box.',
    courrielInvalide: 'A valid email is needed so that we can reply.',
    rate: 'Sending failed. Try again in a moment, or write to',
  },
};

type Type = 'aime' | 'idee' | 'technique' | 'introuvable';

/** L'écran visible, photographié derrière le panneau. */
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

/** Ramène toute image à 1600 px de côté au plus, en JPEG, puis en base64 :
 *  une capture de téléphone fait vite 5 Mo, la fonction n'en prend pas autant. */
async function enBase64Reduit(blob: Blob): Promise<string> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, COTE_MAX / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas indisponible');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const jpeg: Blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/jpeg', 0.82));
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1] || '');
    r.onerror = () => rej(r.error);
    r.readAsDataURL(jpeg);
  });
}

const CACHEE = (p: string) => p.startsWith('/admin') || p === '/compte' || p.startsWith('/compte/');

type Sujet = 'commentaire' | 'probleme';
// Les deux portes du petit choix (Krystine, 16 oct. 2026) : chacune ouvre le
// même formulaire, avec les types qui lui répondent.
const TYPES_DU_SUJET: Record<Sujet, Type[]> = {
  commentaire: ['aime', 'idee'],
  probleme: ['technique', 'introuvable'],
};

/* La pastille ne se pose jamais sur du texte ni sur un bouton (« rien ne cache
   rien », la Ronde du 16 oct. 2026) : on regarde ce qui se trouve sous elle,
   marge de 8 px comprise (56 px en tout), et elle s'efface s'il y a quelque
   chose à lire ou à toucher. Elle s'efface aussi pendant le défilement et tant
   qu'une barre d'achat est à l'écran (html[data-barre-achat]). */
const INTERACTIFS = new Set(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL', 'IFRAME', 'SUMMARY']);
export function quelqueChoseDessous(pastille: HTMLElement, marge = 8): boolean {
  const r = pastille.getBoundingClientRect();
  if (!r.width) return false;
  const boite = { g: r.left - marge, d: r.right + marge, h: r.top - marge, b: r.bottom + marge };
  const croise = (q: DOMRect) => q.width > 0 && q.height > 0 && q.left < boite.d && q.right > boite.g && q.top < boite.b && q.bottom > boite.h;
  const vus = new Set<Element>();
  const ancien = pastille.style.pointerEvents;
  pastille.style.pointerEvents = 'none';
  try {
    for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const x = boite.g + ((boite.d - boite.g) * i) / 4;
      const y = boite.h + ((boite.b - boite.h) * j) / 4;
      for (const el of document.elementsFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1))) {
        if (pastille.contains(el) || el.closest('[data-pepin]')) continue;
        if (vus.has(el)) break;
        vus.add(el);
        const proche = el.closest('a,button,input,textarea,select,label,iframe,summary');
        if (proche && INTERACTIFS.has(proche.tagName) && croise(proche.getBoundingClientRect())) return true;
        for (const n of Array.from(el.childNodes)) {
          if (n.nodeType !== 3 || !(n.textContent || '').trim()) continue;
          const rg = document.createRange();
          rg.selectNodeContents(n);
          if (Array.from(rg.getClientRects()).some(croise)) return true;
        }
        break; // seul l'élément du dessus compte
      }
    }
  } finally {
    pastille.style.pointerEvents = ancien;
  }
  return false;
}

// `autonome` : la page /aide, où mène la pastille des pages statiques
// (accueil, communauté). Le panneau y est déjà ouvert, sans pastille, et
// `pageDe` dit de quelle page la personne vient.
const AidePepin: React.FC<{ autonome?: boolean; pageDe?: string; sujetDepart?: Sujet }> = ({ autonome = false, pageDe, sujetDepart = 'commentaire' }) => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const t = T[getLang() === 'en' ? 'EN' : 'FR'];
  const [sujet, setSujet] = useState<Sujet>(sujetDepart);
  const [menu, setMenu] = useState(false);
  const [libre, setLibre] = useState(true);
  const pastilleRef = useRef<HTMLDivElement>(null);
  const [ouvert, setOuvert] = useState(autonome);
  const [dejaOuvert, setDejaOuvert] = useState(autonome);
  const [type, setType] = useState<Type | null>(null);
  const [texte, setTexte] = useState('');
  const [courriel, setCourriel] = useState('');
  const [image, setImage] = useState<Blob | null>(null);
  const [apercu, setApercu] = useState('');
  const [etat, setEtat] = useState<'repos' | 'capture' | 'envoi' | 'envoye'>('repos');
  const [erreur, setErreur] = useState('');
  const fichierRef = useRef<HTMLInputElement>(null);
  const premierRef = useRef<HTMLButtonElement>(null);
  const captcha = useRecaptcha(!user && dejaOuvert);

  // Le courriel se préremplit pour une personne connectée.
  useEffect(() => { if (user?.email) setCourriel(user.email); }, [user?.email]);

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
    premierRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [ouvert]);

  // La pastille se retire pendant le défilement, tant qu'une barre d'achat est
  // là, et lorsqu'il y a du texte ou un bouton sous elle.
  useEffect(() => {
    if (autonome) return;
    let minuterie = 0;
    const verifier = () => {
      const el = pastilleRef.current;
      const barre = document.documentElement.hasAttribute('data-barre-achat');
      setLibre(!!el && !barre && !quelqueChoseDessous(el));
    };
    const surDefilement = () => {
      setLibre(false);
      setMenu(false);
      window.clearTimeout(minuterie);
      minuterie = window.setTimeout(verifier, 450);
    };
    const premier = window.setTimeout(verifier, 900);
    const obs = new MutationObserver(() => { window.clearTimeout(minuterie); minuterie = window.setTimeout(verifier, 300); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-barre-achat'] });
    window.addEventListener('scroll', surDefilement, { passive: true });
    window.addEventListener('resize', surDefilement);
    return () => { window.clearTimeout(minuterie); window.clearTimeout(premier); obs.disconnect(); window.removeEventListener('scroll', surDefilement); window.removeEventListener('resize', surDefilement); };
  }, [autonome, pathname]);

  // Le lien « Un commentaire ? Écrivez-nous » du pied de page ouvre le même panneau.
  useEffect(() => {
    if (autonome) return;
    const surDemande = (e: Event) => {
      const s = (e as CustomEvent<Sujet>).detail;
      setSujet(s === 'probleme' ? 'probleme' : 'commentaire');
      setType(null); setDejaOuvert(true); setOuvert(true);
    };
    window.addEventListener('ouvrir-pepin', surDemande);
    return () => window.removeEventListener('ouvrir-pepin', surDemande);
  }, [autonome]);

  // Le petit choix se ferme d'un clic ailleurs ou avec Échap.
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: PointerEvent) => { if (!pastilleRef.current?.contains(e.target as Node)) setMenu(false); };
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('pointerdown', dehors);
    window.addEventListener('keydown', touche);
    return () => { window.removeEventListener('pointerdown', dehors); window.removeEventListener('keydown', touche); };
  }, [menu]);

  if (!autonome && (CACHEE(pathname) || pathname === '/aide')) return null;

  const ouvrirSujet = (s: Sujet) => { setSujet(s); setType(null); setMenu(false); setDejaOuvert(true); setOuvert(true); };
  const fermer = () => {
    if (autonome) {
      let sur = '/';
      try {
        const u = new URL((pageDe || '').replace(/[\u0000-\u001F\u007F]/g, ''), window.location.origin);
        if (u.origin === window.location.origin) sur = u.pathname + u.search + u.hash;
      } catch { /* garde '/' */ }
      window.location.assign(sur);
      return;
    }
    setOuvert(false);
    if (etat === 'envoye') { setTexte(''); setImage(null); setType(null); setEtat('repos'); }
    setErreur('');
  };

  const capturer = async () => {
    setErreur('');
    setEtat('capture');
    try {
      await new Promise((r) => setTimeout(r, 80));
      setImage(await capturerEcran());
    } catch (e) {
      console.warn('[pepin] capture ratée', e);
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
    setErreur('');
    setImage(f);
  };

  const courrielValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(courriel.trim());
  const pret = !!type && !!texte.trim() && etat === 'repos';

  const envoyer = async () => {
    if (!pret || !app) return;
    setErreur('');
    if (!courrielValide) { setErreur(t.courrielInvalide); return; }
    if (!user && RECAPTCHA_SITE_KEY && !captcha.getToken()) { setErreur(t.robot); return; }
    setEtat('envoi');
    try {
      const call = httpsCallable(getFunctions(app, 'us-central1'), 'signalerPepin');
      await call({
        type,
        texte: texte.trim(),
        courriel: courriel.trim(),
        nom: user?.displayName || '',
        page: autonome ? (pageDe || '/') : window.location.pathname + window.location.search,
        ecran: `${window.innerWidth}×${window.innerHeight}`,
        agent: navigator.userAgent.slice(0, 300),
        capture: image ? await enBase64Reduit(image) : '',
        captureType: 'image/jpeg',
        token: user ? '' : captcha.getToken(),
      });
      setEtat('envoye');
    } catch (e) {
      console.error('[pepin] envoi raté', e);
      captcha.resetWidget();
      setErreur(t.rate);
      setEtat('repos');
    }
  };

  const enCapture = etat === 'capture';
  const serif = { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300 } as const;
  const bouton = 'inline-flex min-h-[44px] items-center justify-center px-4 text-[0.64rem] uppercase tracking-[0.14em] disabled:opacity-40';
  const champ = 'w-full border bg-white/60 px-4 py-3 text-[0.9rem] outline-none placeholder:text-[#1c1712]/40 focus:border-[#7d6330]';

  return (
    <>
      {/* Une seule petite pastille ronde, à droite, sur toutes les pages (Krystine, 16 oct. 2026) :
          elle réunit l'ancien bouton « Un commentaire ? Écrivez-nous » et la bulle « ? ».
          Un clic ouvre un petit choix; chaque choix ouvre le formulaire. */}
      {!autonome && (
        <div
          ref={pastilleRef}
          data-bug-ignore
          data-pepin
          className={`fixed right-3 sm:right-4 bottom-[calc(var(--bande-temoins,0px)+0.9rem)] z-[55] transition-opacity duration-300 ${libre || menu ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
        >
          {menu && (
            <div role="menu" aria-label={t.infobulle} className="absolute bottom-[calc(100%+0.6rem)] right-0 w-[min(15.5rem,calc(100vw-1.5rem))] border shadow-[0_18px_40px_-20px_rgba(28,23,18,0.55)]" style={{ background: CREME, borderColor: `${FILET}99` }}>
              {([['commentaire', t.choixCommentaire], ['probleme', t.choixProbleme]] as const).map(([s, libelle], i) => (
                <button key={s} type="button" role="menuitem" onClick={() => ouvrirSujet(s)}
                  className={`flex min-h-[48px] w-full items-center px-4 text-left text-[0.9rem] leading-snug transition-colors hover:bg-white ${i ? 'border-t' : ''}`}
                  style={{ color: ENCRE, borderColor: `${FILET}55` }}>
                  {libelle}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenu(m => !m)}
            aria-label={t.infobulle}
            aria-haspopup="menu"
            aria-expanded={menu}
            tabIndex={libre || menu ? 0 : -1}
            title={t.infobulle}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border text-[1.05rem] shadow-[0_8px_20px_-12px_rgba(28,23,18,0.6)] transition-colors hover:bg-white"
            style={{ background: CREME, color: ENCRE, borderColor: `${FILET}99` }}
          >
            <span aria-hidden style={{ fontFamily: '"Fraunces", Georgia, serif' }}>?</span>
          </button>
        </div>
      )}

      {dejaOuvert && (
        <Portail>
          <div
            data-bug-ignore
            className="fixed inset-0 z-[130] items-center justify-center overflow-y-auto overscroll-contain p-4"
            style={{ display: ouvert ? 'flex' : 'none', background: autonome ? CREME : 'rgba(28,23,18,0.55)', visibility: enCapture ? 'hidden' : 'visible' }}
            onClick={fermer}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pepin-titre"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto border p-6 md:p-8"
              style={{ background: CREME, color: ENCRE, borderColor: FILET, fontFamily: '"Inter", system-ui, sans-serif' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <h2 id="pepin-titre" className="text-[1.35rem] leading-tight sm:text-[1.55rem]" style={serif}>{t.titre}</h2>
                <button type="button" onClick={fermer} aria-label={t.fermer} className="flex h-9 w-9 shrink-0 items-center justify-center text-xl leading-none" style={{ color: ENCRE }}>×</button>
              </div>

              {etat === 'envoye' ? (
                <div className="py-4">
                  <p className="text-[0.95rem] leading-[1.8]">
                    {t.merci} {t.aussi}{' '}
                    <a href={`mailto:${COURRIEL_EQUIPE}`} className="underline underline-offset-4" style={{ textDecorationColor: OR }}>{COURRIEL_EQUIPE}</a>.
                  </p>
                  <button type="button" onClick={fermer} className={`${bouton} mt-6`} style={{ background: ENCRE, color: CREME }}>{t.fermer}</button>
                </div>
              ) : (
                <>
                  <p className="-mt-2 mb-4 text-[0.88rem] leading-[1.7]" style={{ color: 'rgba(28,23,18,0.75)' }}>{sujet === 'probleme' ? t.introProbleme : t.intro}</p>
                  <div className="mb-5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-labelledby="pepin-titre">
                    {TYPES_DU_SUJET[sujet].map((id) => [id, t[id]] as const).map(([id, label], i) => (
                      <button
                        key={id}
                        ref={i === 0 ? premierRef : undefined}
                        type="button"
                        role="radio"
                        aria-checked={type === id}
                        onClick={() => setType(id)}
                        className="min-h-[52px] border px-4 py-3 text-left text-[0.85rem] leading-snug transition-colors"
                        style={type === id ? { background: ENCRE, color: CREME, borderColor: ENCRE } : { background: 'rgba(255,255,255,0.5)', color: ENCRE, borderColor: `${FILET}88` }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <label className="mb-1.5 block text-[0.6rem] uppercase tracking-[0.16em]" style={{ color: OR }} htmlFor="pepin-message">{t.message}</label>
                  <textarea
                    id="pepin-message"
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    placeholder={t.placeholder}
                    rows={5}
                    maxLength={4000}
                    className={`${champ} resize-y`}
                    style={{ borderColor: `${FILET}88` }}
                  />

                  <label className="mb-1.5 mt-4 block text-[0.6rem] uppercase tracking-[0.16em]" style={{ color: OR }} htmlFor="pepin-courriel">{t.courriel}</label>
                  <input
                    id="pepin-courriel"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={courriel}
                    onChange={(e) => setCourriel(e.target.value)}
                    className={champ}
                    style={{ borderColor: `${FILET}88` }}
                  />

                  <p className="mb-2 mt-5 text-[0.6rem] uppercase tracking-[0.16em]" style={{ color: OR }}>{t.capture}</p>
                  <div className="flex flex-wrap gap-2">
                    {!autonome && (
                      <button type="button" onClick={capturer} disabled={enCapture || etat === 'envoi'} className={`${bouton} border`} style={{ borderColor: ENCRE, color: ENCRE }}>
                        {enCapture ? t.capturePendant : t.capturer}
                      </button>
                    )}
                    <button type="button" onClick={() => fichierRef.current?.click()} disabled={enCapture || etat === 'envoi'} className={`${bouton} border`} style={{ borderColor: ENCRE, color: ENCRE }}>
                      {t.televerser}
                    </button>
                    <input ref={fichierRef} type="file" accept="image/*" className="hidden" onChange={choisir} />
                  </div>
                  {apercu && (
                    <div className="relative mt-3 border" style={{ borderColor: `${FILET}88` }}>
                      <img src={apercu} alt="" className="max-h-44 w-full object-contain" />
                      <button type="button" onClick={() => setImage(null)} aria-label={t.retirer} title={t.retirer} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center text-lg leading-none" style={{ background: ENCRE, color: CREME }}>×</button>
                    </div>
                  )}

                  {!user && RECAPTCHA_SITE_KEY && <div ref={captcha.boxRef} className="mt-5" />}

                  {erreur && (
                    <p className="mt-4 text-[0.8rem] leading-relaxed" style={{ color: '#8a2f1d' }}>
                      {erreur}{erreur === t.rate && <> <a href={`mailto:${COURRIEL_EQUIPE}`} className="underline underline-offset-4">{COURRIEL_EQUIPE}</a>.</>}
                    </p>
                  )}

                  {/* Les boutons restent toujours visibles au bas de la fenêtre, même lorsque le contenu défile (la Ronde, 15 oct. 2026). */}
                  <div className="sticky -bottom-6 md:-bottom-8 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-5 border-t px-6 py-4 md:-mx-8 md:-mb-8 md:px-8" style={{ background: CREME, borderColor: FILET }}>
                    <button type="button" onClick={fermer} className="text-[0.64rem] uppercase tracking-[0.14em]" style={{ color: 'rgba(28,23,18,0.6)' }}>{t.fermer}</button>
                    <button type="button" onClick={envoyer} disabled={!pret} className={bouton} style={{ background: ENCRE, color: CREME }}>
                      {etat === 'envoi' ? t.envoi : t.envoyer}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Portail>
      )}
    </>
  );
};

export default AidePepin;
