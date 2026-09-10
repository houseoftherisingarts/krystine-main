/**
 * Le crayon de Krystine. Visible seulement quand une administratrice est
 * connectée, en haut à droite de toutes les pages du site.
 *
 * Un clic ouvre le mode d'édition : chaque texte que le site connaît reçoit un
 * liseré, et un clic dessus ouvre une petite fenêtre pour le récrire, en
 * français comme en anglais. Une photo cliquée ouvre la même fenêtre, avec le
 * choix d'une autre image dans la médiathèque et le réglage du cadrage.
 * « Appliquer » montre le changement tout de suite dans la page, « Enregistrer »
 * l'écrit dans Firestore pour tout le monde.
 *
 * Le repérage se fait par la valeur affichée : le shim jsx-runtime voit passer
 * chaque chaîne du site et retient à quelle phrase du code elle correspond, si
 * bien qu'aucun composant n'a à baliser ses éléments un par un.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PencilLine, Check, X, RotateCcw, Image as ImageIcon } from 'lucide-react';
import { useEdition } from '../../lib/edition';
import { useAuth } from '../../contexts/AppContext';
import { getLang, sourceDuRendu, texteDeBase, surchargeDe, type SiteLang } from '../../lib/i18n/lang';
import { ZOOM_MAX, CADRE_NEUTRE, type Cadre } from '../../lib/i18n/photos';
import MediathequePicker from './MediathequePicker';

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Ce que l'élément montre en ce moment : la source d'une <img>, sinon son fond. */
const urlAffichee = (el: HTMLElement): string => {
  if (el instanceof HTMLImageElement) return el.currentSrc || el.src;
  const m = /url\(\s*['"]?([^'")]+)['"]?\s*\)/.exec(getComputedStyle(el).backgroundImage || '');
  return m ? m[1] : '';
};
const IGNORES = new Set(['SCRIPT', 'STYLE', 'SVG', 'PATH', 'BR', 'IMG', 'VIDEO', 'NOSCRIPT', 'CANVAS', 'IFRAME']);

interface CibleTexte { source: string; el: HTMLElement }
interface CiblePhoto { cle: string; el: HTMLElement; url: string }

const CrayonSite: React.FC = () => {
  const ed = useEdition();
  const { isAdmin } = useAuth();
  const [cible, setCible] = useState<CibleTexte | null>(null);
  const [photo, setPhoto] = useState<CiblePhoto | null>(null);
  const [langEdit, setLangEdit] = useState<SiteLang>(() => getLang());
  const [valeur, setValeur] = useState('');
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [busy, setBusy] = useState(false);
  const [avis, setAvis] = useState<string | null>(null);
  const [mediatheque, setMediatheque] = useState(false);
  const zoneRef = useRef<HTMLTextAreaElement>(null);
  const apercuRef = useRef<HTMLDivElement>(null);
  // index ↔ phrase du code : l'index seul voyage dans l'attribut du DOM.
  const parIndex = useRef<string[]>([]);
  const parSource = useRef<Map<string, number>>(new Map());

  const edition = !!ed?.edition;

  const indexer = useCallback((source: string): number => {
    const connu = parSource.current.get(source);
    if (connu !== undefined) return connu;
    const i = parIndex.current.length;
    parIndex.current.push(source);
    parSource.current.set(source, i);
    return i;
  }, []);

  const etiqueter = useCallback(() => {
    document.body.querySelectorAll('[data-tx]').forEach((el) => el.removeAttribute('data-tx'));
    if (!edition) return;
    const tous = Array.from(document.body.querySelectorAll<HTMLElement>('*'));
    // À rebours : l'élément le plus profond qui porte le texte gagne, et
    // l'ancêtre qui contient la même phrase s'efface.
    for (let i = tous.length - 1; i >= 0; i--) {
      const el = tous[i];
      if (IGNORES.has(el.tagName) || el.closest('[data-crayon]')) continue;
      const candidats: string[] = [];
      const aria = el.getAttribute('aria-label');
      if (aria) candidats.push(aria);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.placeholder) candidats.push(el.placeholder);
      } else {
        candidats.push(el.textContent ?? '');
      }
      for (const brut of candidats) {
        const n = norm(brut);
        if (!n || n.length > 2000) continue;
        const source = sourceDuRendu(n);
        if (!source) continue;
        const idx = indexer(source);
        if (el.querySelector(`[data-tx="${idx}"]`)) continue;
        el.setAttribute('data-tx', String(idx));
        break;
      }
    }
  }, [edition, indexer]);

  // Balisage à l'entrée en édition, puis à chaque mutation du DOM.
  useEffect(() => {
    if (!edition) {
      document.body.classList.remove('mode-crayon');
      document.body.querySelectorAll('[data-tx]').forEach((el) => el.removeAttribute('data-tx'));
      return;
    }
    document.body.classList.add('mode-crayon');
    etiqueter();
    let minuterie: number | undefined;
    const obs = new MutationObserver((mutations) => {
      if (mutations.every((m) => m.type === 'attributes' && (m.attributeName === 'data-tx' || m.attributeName === 'data-tx-actif'))) return;
      window.clearTimeout(minuterie);
      minuterie = window.setTimeout(etiqueter, 150);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'placeholder'] });
    return () => {
      obs.disconnect();
      window.clearTimeout(minuterie);
      document.body.classList.remove('mode-crayon');
    };
  }, [edition, etiqueter]);

  const oublierActifs = () => {
    document.querySelectorAll('[data-tx-actif],[data-cadre-actif]').forEach((d) => {
      d.removeAttribute('data-tx-actif');
      d.removeAttribute('data-cadre-actif');
    });
  };

  // En édition, un clic ouvre la fenêtre au lieu de suivre le lien.
  useEffect(() => {
    if (!edition) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest('[data-crayon]')) return;
      // La photo vit souvent sous un voile : chercher aussi sous le pointeur.
      const image =
        target.closest<HTMLElement>('[data-cadre]') ??
        (document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.matches('[data-cadre]')) as HTMLElement | undefined) ??
        null;
      if (image) {
        const cle = image.getAttribute('data-cadre') ?? '';
        e.preventDefault();
        e.stopPropagation();
        oublierActifs();
        image.setAttribute('data-cadre-actif', '');
        setCible(null);
        setPhoto({ cle, el: image, url: urlAffichee(image) || cle });
        setRect(image.getBoundingClientRect());
        return;
      }
      const el = target.closest<HTMLElement>('[data-tx]');
      if (!el) return;
      const source = parIndex.current[Number(el.getAttribute('data-tx'))];
      if (!source) return;
      e.preventDefault();
      e.stopPropagation();
      oublierActifs();
      el.setAttribute('data-tx-actif', '');
      setPhoto(null);
      setCible({ source, el });
      setLangEdit(getLang());
      setRect(el.getBoundingClientRect());
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [edition]);

  // La valeur de la zone suit la cible et la langue en cours d'édition.
  useEffect(() => {
    if (!cible) return;
    const brouillon = ed?.brouillonTexte[cible.source];
    const enCours = brouillon === null ? undefined : brouillon?.[langEdit];
    setValeur(enCours ?? surchargeDe(cible.source, langEdit) ?? texteDeBase(cible.source, langEdit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cible, langEdit]);

  useLayoutEffect(() => {
    const z = zoneRef.current;
    if (!z) return;
    z.style.height = 'auto';
    z.style.height = `${Math.min(z.scrollHeight, 320)}px`;
  }, [valeur, cible]);

  // La fenêtre suit son élément au défilement et au redimensionnement.
  useEffect(() => {
    const el = cible?.el ?? photo?.el;
    if (!el) return;
    const suivre = () => setRect(el.getBoundingClientRect());
    window.addEventListener('scroll', suivre, { passive: true });
    window.addEventListener('resize', suivre);
    return () => {
      window.removeEventListener('scroll', suivre);
      window.removeEventListener('resize', suivre);
    };
  }, [cible, photo]);

  const fermerFenetre = useCallback(() => {
    oublierActifs();
    setCible(null);
    setPhoto(null);
  }, []);

  useEffect(() => {
    if (!cible && !photo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fermerFenetre(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cible, photo, fermerFenetre]);

  // Le tableau de bord n'est pas une page publique : son propre texte ne se
  // récrit pas au crayon, sans quoi une administratrice modifierait ses outils.
  const surAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  if (!ed || !isAdmin || surAdmin) return null;

  const appliquer = () => {
    if (!cible) return;
    ed.ecrireTexte(cible.source, langEdit, valeur);
  };

  const remettreBase = () => {
    if (!cible) return;
    ed.remettreTexte(cible.source);
    setValeur(texteDeBase(cible.source, langEdit));
  };

  const enregistrer = async () => {
    if (busy) return;
    setBusy(true);
    setAvis(null);
    try {
      await ed.sauvegarder();
      fermerFenetre();
      ed.fermer();
      setAvis('Changements enregistrés.');
      window.setTimeout(() => setAvis(null), 2600);
    } catch (err) {
      console.error('Enregistrement du crayon', err);
      setAvis("L'enregistrement n'a pas fonctionné. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const annuler = () => {
    ed.abandonner();
    fermerFenetre();
    ed.fermer();
  };

  // ── Photo ouverte ───────────────────────────────────────────────────────
  const brouillonPhoto = photo ? ed.brouillonPhoto[photo.cle] : undefined;
  const cadrePhoto: Cadre =
    (brouillonPhoto === null ? undefined : brouillonPhoto?.cadre) ?? (photo ? ed.publie.cadres[photo.cle] : undefined) ?? CADRE_NEUTRE;
  const poserCadre = (partiel: Partial<Cadre>) => {
    if (!photo) return;
    ed.ecrirePhoto(photo.cle, { cadre: { ...cadrePhoto, ...partiel } });
  };
  const pointerVers = (e: React.PointerEvent) => {
    const boite = apercuRef.current?.getBoundingClientRect();
    if (!boite) return;
    const x = Math.min(100, Math.max(0, ((e.clientX - boite.left) / boite.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - boite.top) / boite.height) * 100));
    poserCadre({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  };
  const peutRemettrePhoto =
    !!photo && (!!ed.publie.photos[photo.cle] || !!ed.publie.cadres[photo.cle] || (brouillonPhoto !== undefined && brouillonPhoto !== null));
  const ratioPhoto = photo ? Math.max(0.4, Math.min(2.4, photo.el.clientWidth / Math.max(1, photo.el.clientHeight))) : 1;

  const brouillonTexteCle = cible ? ed.brouillonTexte[cible.source] : undefined;
  const peutRemettre =
    !!cible && (surchargeDe(cible.source, 'fr') !== undefined || surchargeDe(cible.source, 'en') !== undefined || (brouillonTexteCle !== undefined && brouillonTexteCle !== null));

  // Position de la fenêtre : sous l'élément, au-dessus s'il manque de place.
  const largeur = Math.min(440, (typeof window !== 'undefined' ? window.innerWidth : 440) - 24);
  const hauteurMax = typeof window !== 'undefined' ? Math.max(160, Math.min(window.innerHeight * 0.42, 380)) : 300;
  const largeurApercu = Math.min(largeur - 32, ratioPhoto * hauteurMax);
  const hauteurApercu = largeurApercu / ratioPhoto;
  let top = 0;
  let left = 12;
  if (rect && typeof window !== 'undefined') {
    const h = photo ? hauteurApercu + 240 : 300;
    const plancher = 96;
    top = rect.bottom + 10 + h > window.innerHeight ? Math.max(plancher, rect.top - 10 - h) : Math.max(plancher, rect.bottom + 10);
    left = Math.min(Math.max(12, rect.left), window.innerWidth - largeur - 12);
  }

  const cadreFenetre = 'fixed z-[101] rounded-[15px] border border-brass/40 bg-cream text-espresso shadow-2xl p-4 flex flex-col gap-3';
  const boutonPlein = 'min-h-[40px] px-4 rounded-full bg-brass text-espresso text-sm font-medium hover:bg-brassBright transition-colors disabled:opacity-40 flex items-center gap-2';
  const boutonLiseré = 'min-h-[40px] px-3 rounded-full border border-brass/50 text-brassInk text-sm hover:border-brassInk transition-colors flex items-center gap-2';

  return (
    <div data-crayon="" className="print:hidden">
      <div className="fixed z-[100] right-[max(1rem,env(safe-area-inset-right))] top-[4.75rem] flex items-center gap-2">
        {edition ? (
          <div className="flex items-center gap-2 rounded-full border border-brass/40 bg-cream/95 backdrop-blur-md px-2 py-1.5 shadow-xl">
            <span className="hidden sm:flex items-center gap-2 pl-2 text-xs text-espresso">
              <PencilLine className="w-4 h-4 text-brassInk" aria-hidden="true" />
              Modification du site
            </span>
            <span className="px-2 text-[0.68rem] uppercase tracking-[0.14em] text-espressoSoft/70">
              {ed.nbModifs === 0 ? 'Aucun changement' : ed.nbModifs === 1 ? '1 changement' : `${ed.nbModifs} changements`}
            </span>
            <button type="button" onClick={enregistrer} disabled={busy || ed.nbModifs === 0} className={boutonPlein}>
              <Check className="w-4 h-4" aria-hidden="true" />
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={annuler}
              aria-label="Quitter la modification"
              title="Quitter la modification"
              className="w-10 h-10 rounded-full border border-brass/50 text-espresso hover:border-espresso flex items-center justify-center"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={ed.ouvrir}
            aria-label="Modifier les textes et les photos du site"
            title="Modifier les textes et les photos du site"
            className="w-11 h-11 rounded-full bg-brass text-espresso shadow-xl flex items-center justify-center hover:bg-brassBright transition-colors"
          >
            <PencilLine className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        {avis && (
          <span role="status" className="rounded-full border border-brass/40 bg-cream px-3 py-2 text-xs text-espresso shadow-xl">
            {avis}
          </span>
        )}
      </div>

      {edition && !cible && !photo && (
        <p
          role="status"
          className="fixed z-[100] left-1/2 -translate-x-1/2 bottom-6 rounded-full bg-brass text-espresso text-xs px-4 py-2 shadow-xl pointer-events-none"
        >
          Cliquez sur un texte pour le récrire, ou sur une photo pour la changer.
        </p>
      )}

      {edition && photo && (
        <div role="dialog" aria-label="Changer la photo" className={cadreFenetre} style={{ top, left, width: largeur }}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.68rem] uppercase tracking-[0.14em] text-brassInk">Changer la photo</span>
            <button type="button" onClick={fermerFenetre} aria-label="Fermer" className="w-9 h-9 rounded-full text-espressoSoft hover:text-espresso flex items-center justify-center">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-espressoSoft/80">Glissez le point sur ce qui doit rester au centre, puis réglez le zoom.</p>
          <div
            ref={apercuRef}
            className="relative mx-auto overflow-hidden rounded-[15px] bg-cream3 touch-none cursor-crosshair select-none"
            style={{ width: largeurApercu, height: hauteurApercu }}
            onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); pointerVers(e); }}
            onPointerMove={(e) => { if (e.buttons & 1) pointerVers(e); }}
          >
            <img
              src={photo.url}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
              style={{ objectPosition: `${cadrePhoto.x}% ${cadrePhoto.y}%`, transformOrigin: `${cadrePhoto.x}% ${cadrePhoto.y}%`, scale: String(cadrePhoto.z) }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream bg-brass shadow-lg"
              style={{ left: `${cadrePhoto.x}%`, top: `${cadrePhoto.y}%` }}
            />
          </div>
          <label className="flex items-center gap-3 text-xs text-espresso">
            <span className="w-12 text-[0.68rem] uppercase tracking-[0.14em] text-espressoSoft/70">Zoom</span>
            <input type="range" min={1} max={ZOOM_MAX} step={0.01} value={cadrePhoto.z} onChange={(e) => poserCadre({ z: Number(e.target.value) })} className="flex-1 accent-[#bb9a5e]" />
            <span className="w-12 text-right tabular-nums">{cadrePhoto.z.toFixed(2)}×</span>
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => setMediatheque(true)} className={boutonPlein}>
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
              Choisir une autre photo
            </button>
            {peutRemettrePhoto && (
              <button type="button" onClick={() => ed.remettrePhoto(photo.cle)} className={boutonLiseré}>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Photo d'origine
              </button>
            )}
          </div>
        </div>
      )}

      {edition && cible && (
        <div role="dialog" aria-label="Récrire le texte" className={cadreFenetre} style={{ top, left, width: largeur }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1" role="tablist">
              {(['fr', 'en'] as SiteLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={langEdit === l}
                  onClick={() => setLangEdit(l)}
                  className={`min-h-[32px] px-3 rounded-full text-[0.68rem] uppercase tracking-[0.14em] transition-colors ${
                    langEdit === l ? 'bg-brass text-espresso' : 'text-espressoSoft/70 hover:text-espresso'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button type="button" onClick={fermerFenetre} aria-label="Fermer" className="w-9 h-9 rounded-full text-espressoSoft hover:text-espresso flex items-center justify-center">
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <textarea
            ref={zoneRef}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); appliquer(); } }}
            autoFocus
            rows={2}
            className="w-full resize-none rounded-[15px] border border-brass/40 bg-cream2 px-3 py-2 text-espresso text-sm outline-none focus:border-brassInk"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={appliquer} className={boutonPlein}>Appliquer</button>
            {peutRemettre && (
              <button type="button" onClick={remettreBase} className={boutonLiseré}>
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Texte d'origine
              </button>
            )}
            <span className="ml-auto text-[0.7rem] text-espressoSoft/70">Ctrl + Entrée pour appliquer</span>
          </div>
        </div>
      )}

      <MediathequePicker
        open={mediatheque}
        onClose={() => setMediatheque(false)}
        onSelect={(url) => {
          if (photo) ed.ecrirePhoto(photo.cle, { url });
          setMediatheque(false);
        }}
      />
    </div>
  );
};

export default CrayonSite;
