import React, { forwardRef, useEffect, useRef, useState } from 'react';
import type { CartePresse, PlanchePresse, Cadrage } from '../../content/presse';
import { urlPhoto, urlQrCarte, urlQrPlanche, urlQrPage } from '../../content/presse';

/**
 * Le gabarit visuel du kit de presse, porté ligne à ligne depuis
 * scripts/presse/build-kit.mjs (les fonctions shell/voile/socle/carteHtml
 * de ce fichier-là) : même géométrie, mêmes couleurs, même formule
 * Prisket, mais en React plutôt qu'en HTML injecté dans Chromium. Le
 * gabarit se rend maintenant à l'écran, dans la grille de /presse comme
 * dans l'éditeur de l'admin, et PressePage.tsx capture ce même DOM en
 * JPEG au clic (html2canvas) plutôt que de servir un fichier déjà cuit.
 *
 * Différence assumée avec le script d'origine : `fondPleinCadre()`
 * fabriquait un lit flou de la photo quand la source était trop étroite
 * pour remplir tout le cadre en 16:9. Cette étape passait par sharp, côté
 * serveur ; la reproduire dans le navigateur aurait demandé un canvas de
 * flou en plus, pour un cas que les photos actuelles ne rencontrent pas.
 * Le recadrage se fait donc en CSS pur (object-fit: cover), et une future
 * photo trop étroite serait simplement recadrée plus serré plutôt que de
 * recevoir un fond flouté. À revoir si Krystine dépose un jour un portrait
 * trop vertical pour un sujet de carte.
 */

export const W = 1920;
export const H = 1080;

const C = {
  fond: '#f4efe6',
  carte: '#faf6ee',
  encre: '#1c1712',
  laiton: '#9c7a44',
  laitonEncre: '#7d6330',
  pied: '#34241a',
};

/* ════════════════════════ L'échelle ════════════════════════ */

/**
 * Pose un enfant de 1920 × 1080 à l'échelle de son conteneur, par
 * transform: scale plutôt que par un redimensionnement du DOM : la tuile
 * de la grille affiche le visuel réduit, et la capture (html2canvas) vise
 * toujours le nœud interne, en pleine résolution, quelle que soit
 * l'échelle affichée à l'écran.
 */
export const CadreEchelle = forwardRef<HTMLDivElement, { children: React.ReactNode; className?: string }>(
  ({ children, className }, ref) => {
    const hote = useRef<HTMLDivElement>(null);
    const [echelle, setEchelle] = useState(0.2);

    useEffect(() => {
      const el = hote.current;
      if (!el) return;
      const observateur = new ResizeObserver(entrees => {
        const largeur = entrees[0]?.contentRect.width;
        if (largeur) setEchelle(largeur / W);
      });
      observateur.observe(el);
      return () => observateur.disconnect();
    }, []);

    return (
      <div ref={hote} className={className} style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}`, overflow: 'hidden' }}>
        <div ref={ref} style={{ position: 'absolute', top: 0, left: 0, width: W, height: H, transform: `scale(${echelle})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    );
  },
);
CadreEchelle.displayName = 'CadreEchelle';

/* ════════════════════════ Les dégradés ════════════════════════ */

// Le lissage de Perlin (6t⁵ − 15t⁴ + 10t³) donne une dérivée nulle aux deux
// bouts : le voile et le socle naissent et meurent sans arête visible,
// contrairement à un dégradé CSS linéaire ordinaire. Port exact de
// build-kit.mjs (fonctions voile() et socle()), la seule différence étant
// que la couleur reste toujours l'encre presque noire du canon.
const lisse = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

const VOILE_PLEIN = 0.62;
function voile(sens: 'left' | 'right', a0 = 0.9, paliers = 18): string {
  const arrets: string[] = [];
  for (let i = 0; i <= paliers; i += 1) {
    const t = i / paliers;
    const a = t <= VOILE_PLEIN ? a0 : a0 * (1 - lisse((t - VOILE_PLEIN) / (1 - VOILE_PLEIN)));
    arrets.push(`rgba(28,23,18,${a.toFixed(4)}) ${(t * 100).toFixed(2)}%`);
  }
  return `linear-gradient(to ${sens}, ${arrets.join(', ')})`;
}

const SOCLE_PLEIN = 0.3;
function socleGradient(a0 = 0.72, paliers = 16): string {
  const arrets: string[] = [];
  for (let i = 0; i <= paliers; i += 1) {
    const t = i / paliers;
    const a = t <= SOCLE_PLEIN ? a0 : a0 * (1 - lisse((t - SOCLE_PLEIN) / (1 - SOCLE_PLEIN)));
    arrets.push(`rgba(28,23,18,${a.toFixed(4)}) ${(t * 100).toFixed(2)}%`);
  }
  return `linear-gradient(to top, ${arrets.join(', ')})`;
}

const OMBRE: React.CSSProperties = { textShadow: '0 1px 2px rgba(0,0,0,.92), 0 0 6px rgba(0,0,0,.78), 0 0 20px rgba(0,0,0,.5)' };

/* ════════════════════════ Le titre qui rapetisse ════════════════════════ */

/**
 * Un titre de carte ne dépasse jamais deux lignes (règle d'Alex) : on
 * rapetisse la police d'un pixel à la fois jusqu'à ce qu'il tienne, sans
 * descendre sous 42 px. Port du geste que build-kit.mjs faisait faire à
 * Chromium (fonction shoot(), option ajusterTitre) ; ici il tourne après
 * chaque changement de texte, dans le navigateur de la visiteuse.
 */
function useTitreCourt(texte: string, tailleBase: number): [React.RefObject<HTMLHeadingElement | null>, number] {
  const ref = useRef<HTMLHeadingElement>(null);
  const [taille, setTaille] = useState(tailleBase);

  useEffect(() => {
    let annule = false;
    setTaille(tailleBase);
    const ajuster = () => {
      const el = ref.current;
      if (!el || annule) return;
      let t = tailleBase;
      const lignes = () => Math.round(el.offsetHeight / (parseFloat(getComputedStyle(el).lineHeight) || t * 1.08));
      while (t > 42 && lignes() > 2) {
        t -= 1;
        el.style.fontSize = `${t}px`;
      }
      if (!annule) setTaille(t);
    };
    if (document.fonts?.ready) document.fonts.ready.then(ajuster);
    else ajuster();
    return () => { annule = true; };
  }, [texte, tailleBase]);

  return [ref, taille];
}

/* ════════════════════════ Les pièces communes ════════════════════════ */

const Photo: React.FC<{ cadrage: Cadrage }> = ({ cadrage }) => (
  <img
    src={urlPhoto(cadrage.fichier)}
    alt=""
    style={{ position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', objectPosition: `${cadrage.focusX * 100}% ${cadrage.focus * 100}%` }}
  />
);

const Pastille: React.FC<{ src: string; taille: number; bas: number }> = ({ src, taille, bas }) => (
  <div style={{ position: 'absolute', right: 56, bottom: bas, background: C.carte, padding: '20px 20px 14px', border: '1px solid rgba(156,122,68,.5)', textAlign: 'center' }}>
    <img src={src} alt="" style={{ width: taille, height: taille, display: 'block', imageRendering: 'pixelated' }} />
    <p style={{ marginTop: 11, fontSize: 9.5, fontWeight: 500, letterSpacing: '.24em', textTransform: 'uppercase', color: 'rgba(28,23,18,.45)' }}>krystinestlaurent.ca</p>
  </div>
);

const Signature: React.FC = () => (
  <div style={{ position: 'absolute', right: 78, bottom: 52, textAlign: 'right' }}>
    <p style={{ ...OMBRE, fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.17em', fontSize: 26, color: 'rgba(244,239,230,.94)' }}>Krystine St-Laurent</p>
  </div>
);

const Coin: React.FC<{ qrSrc: string | null; adresse: string }> = ({ qrSrc, adresse }) => (
  <div style={{ position: 'absolute', left: 78, bottom: 52, display: 'flex', alignItems: 'flex-end', gap: 26 }}>
    {qrSrc && <img src={qrSrc} alt="" style={{ width: 150, height: 150, display: 'block', padding: 10, background: C.carte, boxShadow: '0 2px 14px rgba(0,0,0,.5)', imageRendering: 'pixelated' }} />}
    <div>
      <p style={{ ...OMBRE, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.3em', color: 'rgba(244,239,230,.8)' }}>Inspira Nature · Québec · MMXXVI</p>
      <p style={{ ...OMBRE, marginTop: 10, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.3em', color: '#BA7B39' }}>{adresse}</p>
    </div>
  </div>
);

/* ════════════════════════ La carte plein cadre ════════════════════════ */

export const VisuelCarte: React.FC<{ carte: CartePresse; lang: 'FR' | 'EN'; qr: boolean; nu?: boolean }> = ({ carte, lang, qr, nu = false }) => {
  const cadragePhoto = nu ? carte.nu ?? carte.photo : carte.photo;
  if (nu) {
    return (
      <div style={{ position: 'relative', width: W, height: H, background: C.fond, overflow: 'hidden' }}>
        <Photo cadrage={cadragePhoto} />
        {qr && <Pastille src={urlQrCarte(carte.key)} taille={132} bas={56} />}
      </div>
    );
  }

  const kicker = lang === 'EN' ? carte.kickerEN : carte.kickerFR;
  const titre = lang === 'EN' ? carte.titreEN : carte.titreFR;
  const corps = lang === 'EN' ? carte.corpsEN : carte.corpsFR;
  const meta = lang === 'EN' ? carte.metaEN : carte.metaFR;
  const voileCote = carte.cote === 'gauche' ? 'droite' : 'gauche';
  const hauteurCoin = qr ? 170 : 52;
  const bas = voileCote === 'gauche' ? 52 + hauteurCoin + 44 : 158;
  const [refTitre, tailleTitre] = useTitreCourt(titre, 74);

  return (
    <div style={{ position: 'relative', width: W, height: H, background: C.fond, overflow: 'hidden', fontFamily: 'Inter, sans-serif', color: C.encre }}>
      <Photo cadrage={cadragePhoto} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: socleGradient() }} />
      <div
        style={{
          position: 'absolute', top: 0, bottom: 0, width: '58%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          ...(voileCote === 'gauche'
            ? { left: 0, padding: `104px 420px ${bas}px 92px`, background: voile('right') }
            : { right: 0, padding: `104px 92px ${bas}px 420px`, background: voile('left') }),
        }}
      >
        <p style={{ ...OMBRE, fontSize: 14, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.42em', color: C.laiton }}>{kicker}</p>
        <h1
          ref={refTitre}
          style={{ ...OMBRE, fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, fontSize: tailleTitre, lineHeight: 1.08, letterSpacing: '-.014em', color: C.fond, marginTop: 30 }}
        >
          {titre}
        </h1>
        <span style={{ display: 'block', width: 76, height: 1, background: C.laiton, opacity: 0.85, margin: '34px 0 30px' }} />
        <p style={{ ...OMBRE, fontSize: 29, fontWeight: 300, lineHeight: 1.56, color: 'rgba(244,239,230,.84)' }}>{corps}</p>
        <p style={{ ...OMBRE, marginTop: 42, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.3em', color: 'rgba(186,123,57,.95)' }}>{meta}</p>
      </div>
      <Coin qrSrc={qr ? urlQrCarte(carte.key) : null} adresse="krystinestlaurent.ca/presse" />
      <Signature />
    </div>
  );
};

/* ════════════════════════ La planche et la page ════════════════════════ */

// La planche et la page portent toujours leur légende dans les deux
// langues à la fois, l'une sous l'autre : contrairement aux cartes, elles
// n'ont pas de variante FR et de variante EN distinctes (build-kit.mjs,
// fonctions photoPleineHtml et shotHtml, ne prenaient déjà aucun `lang`).
export const VisuelPlanche: React.FC<{ item: PlanchePresse; qr: boolean; nu?: boolean; page?: boolean }> = ({ item, qr, nu = false, page = false }) => {
  const qrSrc = page ? urlQrPage(item.key) : urlQrPlanche();

  if (nu) {
    return (
      <div style={{ position: 'relative', width: W, height: H, background: C.fond, overflow: 'hidden' }}>
        <Photo cadrage={item.photo} />
        {qr && <Pastille src={qrSrc} taille={132} bas={56} />}
      </div>
    );
  }

  const bandeauHauteur = page ? 136 : 176;

  return (
    <div style={{ position: 'relative', width: W, height: H, background: C.fond, overflow: 'hidden', fontFamily: 'Inter, sans-serif', color: C.encre }}>
      <Photo cadrage={item.photo} />
      {qr && <Pastille src={qrSrc} taille={126} bas={bandeauHauteur + 40} />}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bandeauHauteur, background: C.fond, display: 'flex', alignItems: 'center', padding: `0 92px` }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: page ? 19 : 20, fontWeight: 300, lineHeight: 1.5, color: C.encre, maxWidth: '62ch' }}>{texte}</p>
          {!page && <p style={{ marginTop: 8, fontSize: 15, fontWeight: 300, lineHeight: 1.5, color: 'rgba(28,23,18,.55)', maxWidth: '62ch' }}>{lang === 'EN' ? item.texteEN : item.texteFR}</p>}
        </div>
        <div style={{ textAlign: 'right', paddingLeft: 48 }}>
          <span style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.17em', fontSize: page ? 18 : 19 }}>Krystine St-Laurent</span>
          <p style={{ marginTop: page ? 8 : 9, fontSize: 10.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.3em', color: 'rgba(28,23,18,.45)' }}>
            {page ? item.adresse : `Photo n° ${item.n} · krystinestlaurent.ca/presse`}
          </p>
        </div>
      </div>
    </div>
  );
};
