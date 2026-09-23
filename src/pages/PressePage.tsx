import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { ArrowUpRight, Download, ShareNetwork, QrCode, ImageSquare, X, EyeSlash, FileText, Envelope } from '@phosphor-icons/react';
import {
  StyleV2, Kicker, Masthead, TitreV2, SousTitreV2, LiensChapitres, LigneDefiler,
  TitreChapitre, Filet, Reveal, BoutonNoir, BoutonCuivre,
  useMotionV2, GOUTTIERE,
} from '../components/v2/Magazine';
import { useApp, useAuth } from '../contexts/AppContext';
import { useSiteFlags } from '../contexts/SiteFlagsContext';
import { usePresse, LOGOS, type CartePresse, type PlanchePresse, type TextePresse, type Logo } from '../content/presse';
import { VisuelCarte, VisuelPlanche, CadreEchelle, W, H } from '../components/presse/VisuelPresse';
import { zipper, octets, octetsTexte, type FichierZip } from '../lib/zip';

/**
 * La salle de presse, bâtie sur la formule Prisket (Krystine, 22 septembre
 * 2026) : la même page que celle du Festival Médiéval, aux couleurs, aux
 * polices et aux images de Krystine. Ce qui fait la formule, et qui ne
 * change plus d'un kit à l'autre :
 *
 *   1. la photo occupe toute la largeur de sa tuile, en 16:9, sans marge;
 *   2. dessous, un panneau brun translucide porte le nom en crème;
 *   3. quatre boutons sous chaque visuel, en deux rangées de deux, et
 *      toujours dans cet ordre : Télécharger, Partager, Version QR,
 *      Photo seule.
 *
 * Depuis le 23 septembre 2026, les cartes ne sont plus des fichiers cuits
 * par un script : elles se rendent en direct (components/presse/VisuelPresse.tsx)
 * à partir du kit publié dans Firestore (Admin › Kit de presse), et le
 * bouton Télécharger capture ce même DOM en JPEG au clic (html2canvas),
 * plutôt que de servir un fichier déjà fabriqué. Un texte ou une photo
 * corrigés dans l'admin apparaissent donc aussitôt ici, dans la page comme
 * dans l'image téléchargée.
 *
 * Tant que l'interrupteur presseOuvert reste éteint dans l'admin, une
 * visiteuse qui arrive ici repart vers l'accueil, et Krystine reste seule
 * à voir la page, avec un bandeau qui lui rappelle où l'allumer.
 */

const SECTION = `relative w-full ${GOUTTIERE} py-[clamp(4.5rem,12vh,9rem)] scroll-mt-24`;

/* ════════════════════════ Le panneau de la formule ════════════════════════ */

const PANNEAU = 'rounded-[15px] border border-[#f4efe6]/15 bg-[#1c1712]/90 shadow-[0_30px_70px_-42px_rgba(28,23,18,0.95)] backdrop-blur-md';
const TUILE = `${PANNEAU} flex h-full flex-col overflow-hidden`;
const BANDE = 'border-t border-[#f4efe6]/12 px-5 py-4';

const BOUTON = 'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border px-3 py-2 text-[13px] leading-none transition-colors duration-300';
const CREUX = 'border-[#f4efe6]/25 text-[#f4efe6]/85 hover:border-[#BA7B39] hover:text-[#BA7B39]';
const ALLUME = 'border-[#BA7B39] bg-[#BA7B39] text-[#1c1712]';
const ETEINT = 'border-[#f4efe6]/10 text-[#f4efe6]/30 cursor-not-allowed';
const LIEN_CLAIR = 'inline-flex items-center gap-2.5 border-b border-[#BA7B39]/60 pb-1.5 text-[13px] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:text-[#BA7B39]';

const T = {
  FR: {
    kicker: 'Pour la presse', titre: 'Salle de presse', titreLignes: ['Salle', 'de presse'],
    soustitre: 'Les visuels, les portraits et les biographies se téléchargent ici librement, à la seule condition de créditer Krystine St-Laurent.',
    liens: [['Les visuels', '#visuels'], ['Les photos', '#photos'], ['Le site', '#site'], ['Les mots-symboles', '#logos'], ['Les textes', '#textes']] as [string, string][],
    defiler: 'Faire défiler', zip: 'Télécharger tout le kit',
    zipNote: 'Un fichier zip : une photo par sujet, les mots-symboles et les textes. Les autres langues et versions se téléchargent tuile par tuile.',
    zipEnCours: 'Préparation du zip…',
    heroLegende: 'Le portrait de presse, tel qu’il se télécharge en 1920 × 1080.',
    brefKicker: 'En bref', faitsTitre: 'Les faits',
    faitsNote: 'Tout ce qui se vérifie en un coup d’œil, et la fiche complète en fichier texte.',
    ficheFaits: 'Ouvrir la fiche des faits', contactLabel: 'Contact presse',
    visuelsTitre: 'Les visuels', visuelsNote: 'Huit cartes de 1920 sur 1080 pixels, chacune en français et en anglais, avec ou sans code QR.',
    photosTitre: 'Les photos', photosNote: 'Six planches légendées dans les deux langues, prêtes à illustrer un article.',
    siteTitre: 'Le site', siteNote: 'Six pages du site, montrées telles qu’elles se présentent aujourd’hui.',
    logosTitre: 'Les mots-symboles', logosNote: 'Le site n’a pas d’autre logo que sa signature typographique, et elle existe en quatre versions.',
    textesTitre: 'Les textes', textesNote: 'Les biographies et la fiche des faits, à lire ici ou à emporter en fichier.',
    lire: 'Lire', telecharger: 'Télécharger', partager: 'Partager', versionQr: 'Version QR', photoSeule: 'Photo seule', avecTexte: 'Avec texte',
    qrMene: 'Le code mène à', copie: 'Téléchargé', agrandir: 'Agrandir', fermer: 'Fermer',
    contactTitre: 'Une demande particulière',
    contactTexte: 'S’il vous manque un format, une photo de scène ou une citation sur un sujet précis, écrivez à l’équipe et nous la préparons.',
    contactGeste: 'Écrire à l’équipe',
    apercuTitre: 'Cette salle de presse est encore éteinte', apercuTexte: 'Personne d’autre que vous ne la voit. Allumez-la quand elle vous convient.',
    apercuGeste: 'Réglages, En préparation',
  },
  EN: {
    kicker: 'For the press', titre: 'Press room', titreLignes: ['Press', 'room'],
    soustitre: 'The visuals, the portraits and the biographies download freely from here, on the single condition that Krystine St-Laurent is credited.',
    liens: [['The visuals', '#visuels'], ['The photographs', '#photos'], ['The site', '#site'], ['The wordmarks', '#logos'], ['The texts', '#textes']] as [string, string][],
    defiler: 'Scroll', zip: 'Download the full kit',
    zipNote: 'One zip file: one photo per subject, the wordmarks and the texts. Other languages and versions download tile by tile.',
    zipEnCours: 'Preparing the zip…',
    heroLegende: 'The press portrait, as it downloads at 1920 × 1080.',
    brefKicker: 'In brief', faitsTitre: 'The facts',
    faitsNote: 'Everything that checks out at a glance, with the full sheet as a text file.',
    ficheFaits: 'Open the fact sheet', contactLabel: 'Press contact',
    visuelsTitre: 'The visuals', visuelsNote: 'Eight cards at 1920 by 1080 pixels, each one in French and in English, with or without a QR code.',
    photosTitre: 'The photographs', photosNote: 'Six captioned plates in both languages, ready to illustrate an article.',
    siteTitre: 'The site', siteNote: 'Six pages of the site, shown as they look today.',
    logosTitre: 'The wordmarks', logosNote: 'The site has no logo beyond its typographic signature, and that signature comes in four versions.',
    textesTitre: 'The texts', textesNote: 'The biographies and the fact sheet, to read here or to carry away as a file.',
    lire: 'Read', telecharger: 'Download', partager: 'Share', versionQr: 'QR version', photoSeule: 'Photo only', avecTexte: 'With text',
    qrMene: 'The code leads to', copie: 'Downloaded', agrandir: 'Enlarge', fermer: 'Close',
    contactTitre: 'Something else you need',
    contactTexte: 'If a format is missing, or a stage photograph, or a quote on a particular subject, write to the team and we will prepare it.',
    contactGeste: 'Write to the team',
    apercuTitre: 'This press room is still switched off', apercuTexte: 'Nobody else can see it. Switch it on whenever it suits you.',
    apercuGeste: 'Settings, In preparation',
  },
};

/* ════════════════════════ La capture d'un visuel ════════════════════════ */

/** Un nœud de 1920 × 1080 rendu par VisuelPresse, capturé en JPEG. */
async function capturerNoeud(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, { width: W, height: H, scale: 1, useCORS: true, backgroundColor: '#f4efe6' });
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('capture vide'))), 'image/jpeg', 0.92);
  });
}

function telechargerBlob(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nom; a.click();
  URL.revokeObjectURL(url);
}

/**
 * Partager un visuel : la feuille native quand le navigateur sait envoyer
 * un fichier, sinon un téléchargement direct. Une captation en direct n'a
 * plus d'adresse fixe à copier dans le presse-papiers, contrairement à
 * l'ancien fichier déjà déposé sur le serveur.
 */
async function partagerBlob(blob: Blob, nom: string, titre: string): Promise<'partage' | 'telecharge'> {
  try {
    const file = new File([blob], nom, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: titre });
      return 'partage';
    }
  } catch { /* partage refusé : le téléchargement fera l'affaire */ }
  telechargerBlob(blob, nom);
  return 'telecharge';
}

/* ════════════════════════ Le chapeau d'un chapitre ════════════════════════ */

const Chapeau: React.FC<{ numero: React.ReactNode; titre: string; note: string }> = ({ numero, titre, note }) => (
  <Reveal className="grid items-end gap-x-[clamp(2rem,5vw,5rem)] gap-y-7 lg:grid-cols-[1fr_0.8fr]">
    <div>
      <Kicker className="mb-5">{numero}</Kicker>
      <TitreChapitre>{titre}</TitreChapitre>
    </div>
    <div className="lg:pb-2">
      <Filet className="mb-5" />
      <p className="max-w-[46ch] text-[0.98rem] font-light leading-relaxed text-[#3a2f23]/80">{note}</p>
    </div>
  </Reveal>
);

/* ════════════════════════ Les gestes d'un fichier ════════════════════════ */

const Geste: React.FC<{
  onClick?: () => void; actif?: boolean; disponible?: boolean; libelle: string; children: React.ReactNode;
}> = ({ onClick, actif = false, disponible = true, libelle, children }) => {
  const teinte = !disponible ? ETEINT : actif ? ALLUME : CREUX;
  return (
    <button type="button" disabled={!disponible} onClick={onClick} aria-label={libelle} aria-pressed={actif} className={`${BOUTON} ${teinte}`}>
      {children}
    </button>
  );
};

/* ════════════════════════ La tuile Prisket ════════════════════════ */

const Tuile: React.FC<{
  visuelRef: (node: HTMLDivElement | null) => void; visuel: React.ReactNode;
  titre: string; legende?: string; agrandir: string; onOuvrir: () => void;
  children: React.ReactNode; dessous?: React.ReactNode;
}> = ({ visuelRef, visuel, titre, legende, agrandir, onOuvrir, children, dessous }) => (
  <Reveal className={TUILE}>
    <button type="button" onClick={onOuvrir} aria-label={`${agrandir} · ${titre}`} className="group block w-full cursor-zoom-in overflow-hidden">
      <div className="transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]">
        <CadreEchelle ref={visuelRef}>{visuel}</CadreEchelle>
      </div>
    </button>
    <div className={`${BANDE} flex flex-1 flex-col`}>
      <p className="v2-serif text-[1.05rem] font-light leading-snug text-[#f4efe6]">{titre}</p>
      {legende && <p className="mt-2 text-[13px] font-light leading-relaxed text-[#f4efe6]/65">{legende}</p>}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">{children}</div>
      {dessous}
    </div>
  </Reveal>
);

/* ════════════════════════ La page ════════════════════════ */

const PressePage: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const { lang } = useApp();
  const { isAdmin } = useAuth();
  const { presseOuvert, pret } = useSiteFlags();
  const kit = usePresse();
  const t = T[lang === 'EN' ? 'EN' : 'FR'];
  const L = lang === 'EN' ? 'EN' : 'FR';

  const [enQr, setEnQr] = useState<Set<string>>(new Set());
  const [enNu, setEnNu] = useState<Set<string>>(new Set());
  const [copie, setCopie] = useState<string | null>(null);
  const [loupe, setLoupe] = useState<{ cle: string; titre: string; visuel: React.ReactNode } | null>(null);
  const [texte, setTexte] = useState<TextePresse | null>(null);
  const [zipEnCours, setZipEnCours] = useState(false);

  // Chaque tuile visible s'enregistre ici sous une clé stable, pour que
  // Télécharger/Partager/la loupe captent toujours le nœud qui est
  // effectivement affiché à l'écran, quel que soit le bascule (langue,
  // QR, photo seule) en place au moment du clic.
  const refs = useRef<Map<string, HTMLDivElement>>(new Map());
  const enregistrer = useCallback((cle: string) => (node: HTMLDivElement | null) => {
    if (node) refs.current.set(cle, node); else refs.current.delete(cle);
  }, []);

  useMotionV2(root, pret && (presseOuvert || isAdmin));

  const bascule = (set: React.Dispatch<React.SetStateAction<Set<string>>>, cle: string) =>
    set(s => { const n = new Set(s); if (n.has(cle)) n.delete(cle); else n.add(cle); return n; });

  const telecharger = useCallback(async (cle: string, nom: string) => {
    const node = refs.current.get(cle);
    if (!node) return;
    const blob = await capturerNoeud(node);
    telechargerBlob(blob, nom);
  }, []);

  const envoyer = useCallback(async (cle: string, nom: string, titre: string) => {
    const node = refs.current.get(cle);
    if (!node) return;
    const blob = await capturerNoeud(node);
    const issue = await partagerBlob(blob, nom, titre);
    if (issue === 'telecharge') { setCopie(cle); window.setTimeout(() => setCopie(null), 2200); }
  }, []);

  // La loupe verrouille le défilement de la page derrière elle.
  useEffect(() => {
    const ouvert = !!loupe || !!texte;
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const clavier = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLoupe(null); setTexte(null); } };
    window.addEventListener('keydown', clavier);
    return () => { window.removeEventListener('keydown', clavier); document.body.style.overflow = avant; };
  }, [loupe, texte]);

  if (!pret) return <div className="min-h-screen bg-[#f4efe6]" />;
  if (!presseOuvert && !isAdmin) return <Navigate to="/krystine" replace />;

  const nomCarte = (c: CartePresse, nu: boolean, qr: boolean) =>
    nu ? `${c.key}-nu${qr ? '-qr' : ''}.jpg` : `${c.key}-${L.toLowerCase()}-texte${qr ? '-qr' : ''}.jpg`;
  const nomFeuillet = (f: PlanchePresse, nu: boolean, qr: boolean, page: boolean) =>
    `${page ? 'site' : 'photo'}-${f.key}${nu ? '-nu' : ''}${qr ? '-qr' : ''}.jpg`;

  const gestesCommuns = (cle: string, nom: string, titre: string) => (
    <>
      <Geste onClick={() => telecharger(cle, nom)} libelle={`${t.telecharger} · ${titre}`}>
        <Download size={14} weight="regular" /> {t.telecharger}
      </Geste>
      <Geste onClick={() => envoyer(cle, nom, titre)} actif={copie === cle} libelle={`${t.partager} · ${titre}`}>
        <ShareNetwork size={14} weight="regular" /> {copie === cle ? t.copie : t.partager}
      </Geste>
    </>
  );

  const grilleFeuillets = (liste: PlanchePresse[], page: boolean) => (
    <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-[clamp(1.25rem,2.5vw,1.75rem)] md:grid-cols-2 xl:grid-cols-3">
      {liste.map(f => {
        const nu = enNu.has(f.key);
        const qr = enQr.has(f.key);
        const cle = `${page ? 'page' : 'planche'}:${f.key}`;
        const titre = lang === 'EN' ? f.labelEN : f.labelFR;
        const nom = nomFeuillet(f, nu, qr, page);
        return (
          <Tuile
            key={f.key}
            visuelRef={enregistrer(cle)}
            visuel={<VisuelPlanche item={f} qr={qr} nu={nu} page={page} />}
            titre={titre}
            legende={lang === 'EN' ? f.legendeEN : f.legendeFR}
            agrandir={t.agrandir}
            onOuvrir={() => setLoupe({ cle, titre })}
            dessous={qr ? <p className="mt-3 break-all text-[13px] font-light text-[#BA7B39]">{t.qrMene} {f.chemin}</p> : undefined}
          >
            {gestesCommuns(cle, nom, titre)}
            <Geste actif={qr} onClick={() => bascule(setEnQr, f.key)} libelle={`${t.versionQr} · ${titre}`}>
              <QrCode size={14} weight="regular" /> {t.versionQr}
            </Geste>
            <Geste actif={nu} onClick={() => bascule(setEnNu, f.key)} libelle={`${nu ? t.avecTexte : t.photoSeule} · ${titre}`}>
              <ImageSquare size={14} weight="regular" /> {nu ? t.avecTexte : t.photoSeule}
            </Geste>
          </Tuile>
        );
      })}
    </div>
  );

  const ficheFaits = () => setTexte(kit.textes.find(x => x.key === 'faits') ?? kit.textes[0]);

  const telechargerTexte = (x: TextePresse) => {
    const contenu = (lang === 'EN' && x.texteEN) ? x.texteEN : x.texteFR;
    telechargerBlob(new Blob([contenu], { type: 'text/plain;charset=utf-8' }), `${x.key}.txt`);
  };

  /**
   * Le zip complet : une photo représentative par sujet (français, avec
   * texte, sans QR), les quatre mots-symboles et les cinq textes.
   * ponytail : le kit d'origine cuisait toutes les combinaisons (langue ×
   * QR × nu), soit une centaine de fichiers ; les reproduire toutes en
   * direct aurait demandé une centaine de captures html2canvas au clic,
   * largement plus longues que la patience d'une visiteuse. Chaque
   * variante reste à un clic via le bouton Télécharger de sa tuile.
   */
  const toutLeKit = useCallback(async () => {
    setZipEnCours(true);
    try {
      const fichiers: FichierZip[] = [];
      for (const c of kit.cartes) {
        const node = refsZip.current.get(`zc:${c.key}`);
        if (node) fichiers.push({ nom: `${c.key}-fr-texte.jpg`, data: new Uint8Array(await (await capturerNoeud(node)).arrayBuffer()) });
      }
      for (const p of kit.planches) {
        const node = refsZip.current.get(`zp:${p.key}`);
        if (node) fichiers.push({ nom: `photo-${p.key}.jpg`, data: new Uint8Array(await (await capturerNoeud(node)).arrayBuffer()) });
      }
      for (const p of kit.pages) {
        const node = refsZip.current.get(`zs:${p.key}`);
        if (node) fichiers.push({ nom: `site-${p.key}.jpg`, data: new Uint8Array(await (await capturerNoeud(node)).arrayBuffer()) });
      }
      for (const l of LOGOS) {
        try { fichiers.push({ nom: l.fichier.replace('presse/', ''), data: await octets(`/${l.fichier}`) }); } catch { /* logo absent */ }
      }
      for (const x of kit.textes) {
        fichiers.push({ nom: `textes/${x.key}-fr.txt`, data: octetsTexte(x.texteFR) });
        if (x.texteEN) fichiers.push({ nom: `textes/${x.key}-en.txt`, data: octetsTexte(x.texteEN) });
      }
      telechargerBlob(zipper(fichiers), 'kit-presse-krystine-st-laurent.zip');
    } finally {
      setZipEnCours(false);
    }
  }, [kit]);

  // Les nœuds dédiés au zip : un exemplaire fixe par sujet (FR, avec
  // texte, sans QR), toujours monté hors écran, pour que « Télécharger
  // tout le kit » capture la bonne variante même si la grille au-dessus
  // affiche l'anglais ou une version QR au moment du clic.
  const refsZip = useRef<Map<string, HTMLDivElement>>(new Map());
  const enregistrerZip = useCallback((cle: string) => (node: HTMLDivElement | null) => {
    if (node) refsZip.current.set(cle, node); else refsZip.current.delete(cle);
  }, []);

  return (
    <div ref={root} className="relative w-full overflow-x-hidden bg-[#f4efe6] text-[#1c1712] antialiased">
      <StyleV2 />

      {isAdmin && !presseOuvert && (
        <div className={`relative z-40 w-full bg-[#1c1712] text-[#f4efe6] ${GOUTTIERE} py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <p className="flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.18em]">
              <EyeSlash size={15} weight="regular" className="text-[#BA7B39]" />
              {t.apercuTitre}
              <span className="hidden normal-case tracking-normal text-[0.85rem] text-[#f4efe6]/60 md:inline">{t.apercuTexte}</span>
            </p>
            <Link to="/admin/en-preparation" className="inline-flex items-center gap-2 border-b border-[#BA7B39] pb-1 text-[0.66rem] uppercase tracking-[0.2em] text-[#BA7B39] transition-colors duration-300 hover:text-[#d9a05b]">
              {t.apercuGeste} <ArrowUpRight size={13} weight="regular" />
            </Link>
          </div>
        </div>
      )}

      {/* ─── L'EN-TÊTE ─────────────────────────────────────────────── */}
      <section data-hero className={`relative w-full ${GOUTTIERE} pt-[clamp(6rem,12vh,9rem)] pb-[clamp(2rem,5vh,4rem)]`}>
        <Masthead gauche={<>N&deg; 09 &middot; {t.titre}</>} />
        <div className="mt-[clamp(2rem,5vh,3.5rem)] grid items-center gap-x-[clamp(2rem,5vw,4.5rem)] gap-y-[clamp(2.5rem,6vh,4rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <p data-fade className="mb-6 text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330]">{t.kicker}</p>
            <TitreV2 lignes={t.titreLignes} className="text-[clamp(2.9rem,6vw,5.4rem)] max-w-[13ch]" />
            <SousTitreV2>{t.soustitre}</SousTitreV2>
            <div data-fade className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <BoutonNoir as="button" onClick={toutLeKit} disabled={zipEnCours}>
                <Download size={15} weight="regular" /> {zipEnCours ? t.zipEnCours : t.zip}
              </BoutonNoir>
              <p className="text-[13px] font-light leading-relaxed text-[#1c1712]/55">{t.zipNote}</p>
            </div>
            <LiensChapitres liens={t.liens} />
          </div>

          {kit.cartes[0] && (
            <figure className={`${TUILE} w-full`}>
              <CadreEchelle ref={enregistrer('carte:portrait-hero')}>
                <VisuelCarte carte={kit.cartes[0]} lang="FR" qr={false} nu />
              </CadreEchelle>
              <figcaption className={BANDE}>
                <p className="text-[13px] font-light leading-relaxed text-[#f4efe6]/70">{t.heroLegende}</p>
              </figcaption>
            </figure>
          )}
        </div>

        <LigneDefiler libelle={t.defiler} droite={<>1920 &times; 1080 &middot; JPG</>} />
      </section>

      {/* ─── EN BREF ────────────────────────────────────────────────── */}
      <section className={`${SECTION} bg-[#efe6d7]`}>
        <Reveal className={`${PANNEAU} px-[clamp(1.5rem,4vw,3.5rem)] py-[clamp(2.5rem,6vh,4rem)]`}>
          <Kicker sombre className="mb-5">{t.brefKicker}</Kicker>
          <TitreChapitre sombre>{t.faitsTitre}</TitreChapitre>
          <p className="mt-6 max-w-[52ch] text-[0.98rem] font-light leading-relaxed text-[#f4efe6]/75">{t.faitsNote}</p>

          <dl className="mt-[clamp(2.5rem,6vh,3.5rem)] grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-3 lg:grid-cols-5">
            {kit.faits.map(f => (
              <div key={f.fr}>
                <dt className="v2-serif text-[clamp(2.4rem,4.5vw,3.4rem)] font-light leading-none text-[#f4efe6]">{f.valeur}</dt>
                <dd className="mt-3 text-[13px] font-light leading-relaxed text-[#f4efe6]/65">{lang === 'EN' ? f.en : f.fr}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-[clamp(2.5rem,6vh,3.5rem)] grid items-end gap-x-10 gap-y-8 border-t border-[#f4efe6]/12 pt-8 md:grid-cols-2">
            <div>
              <p className="text-[13px] uppercase tracking-[0.22em] text-[#BA7B39]">{t.contactLabel}</p>
              <a href="mailto:equipe@inspiratanature.com" className="mt-3 inline-flex items-center gap-2 break-all text-[0.98rem] font-light text-[#f4efe6] transition-colors duration-300 hover:text-[#BA7B39]">
                <Envelope size={15} weight="regular" className="shrink-0 text-[#BA7B39]" />
                equipe@inspiratanature.com
              </a>
              <p className="mt-2 text-[13px] font-light text-[#f4efe6]/55">krystinestlaurent.ca/presse</p>
            </div>
            <div className="md:justify-self-end">
              <button type="button" onClick={ficheFaits} className={LIEN_CLAIR}>
                {t.ficheFaits} <ArrowUpRight size={13} weight="regular" />
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── LES VISUELS ────────────────────────────────────────────── */}
      <section id="visuels" className={`${SECTION} bg-[#f4efe6]`}>
        <Chapeau numero={<>N&deg; 01</>} titre={t.visuelsTitre} note={t.visuelsNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-[clamp(1.25rem,2.5vw,1.75rem)] md:grid-cols-2 xl:grid-cols-3">
          {kit.cartes.map(c => {
            const nu = enNu.has(c.key) && !!c.nu;
            const qr = enQr.has(c.key);
            const cle = `carte:${c.key}`;
            const titre = lang === 'EN' ? c.titreEN : c.titreFR;
            const nom = nomCarte(c, nu, qr);
            return (
              <Tuile
                key={c.key}
                visuelRef={enregistrer(cle)}
                visuel={<VisuelCarte carte={c} lang={L} qr={qr} nu={nu} />}
                titre={titre}
                legende={lang === 'EN' ? c.legendeEN : c.legendeFR}
                agrandir={t.agrandir}
                onOuvrir={() => setLoupe({ cle, titre })}
                dessous={qr ? <p className="mt-3 break-all text-[13px] font-light text-[#BA7B39]">{t.qrMene} {c.cibleAffiche}</p> : undefined}
              >
                {gestesCommuns(cle, nom, titre)}
                <Geste actif={qr} onClick={() => bascule(setEnQr, c.key)} libelle={`${t.versionQr} · ${titre}`}>
                  <QrCode size={14} weight="regular" /> {t.versionQr}
                </Geste>
                <Geste actif={nu} disponible={!!c.nu} onClick={() => bascule(setEnNu, c.key)} libelle={`${nu ? t.avecTexte : t.photoSeule} · ${titre}`}>
                  <ImageSquare size={14} weight="regular" /> {nu ? t.avecTexte : t.photoSeule}
                </Geste>
              </Tuile>
            );
          })}
        </div>
      </section>

      {/* ─── LES PHOTOS ─────────────────────────────────────────────── */}
      <section id="photos" className={`${SECTION} bg-[#efe6d7]`}>
        <Chapeau numero={<>N&deg; 02</>} titre={t.photosTitre} note={t.photosNote} />
        {grilleFeuillets(kit.planches, false)}
      </section>

      {/* ─── LE SITE ────────────────────────────────────────────────── */}
      <section id="site" className={`${SECTION} bg-[#f4efe6]`}>
        <Chapeau numero={<>N&deg; 03</>} titre={t.siteTitre} note={t.siteNote} />
        {grilleFeuillets(kit.pages, true)}
      </section>

      {/* ─── LES MOTS-SYMBOLES ──────────────────────────────────────── */}
      <section id="logos" className={`${SECTION} bg-[#efe6d7]`}>
        <Chapeau numero={<>N&deg; 04</>} titre={t.logosTitre} note={t.logosNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-[clamp(1.25rem,2.5vw,1.75rem)] md:grid-cols-2 xl:grid-cols-4">
          {LOGOS.map((l: Logo) => {
            const titre = lang === 'EN' ? l.labelEN : l.labelFR;
            const sombre = l.key === 'creme-encre' || l.key === 'creme-transparent';
            return (
              <Reveal key={l.key} className={TUILE}>
                <button type="button" onClick={() => window.open(`/${l.fichier}`, '_blank')} aria-label={`${t.agrandir} · ${titre}`} className={`group block w-full cursor-zoom-in overflow-hidden ${sombre ? 'bg-[#34241a]' : 'bg-[#faf6ee]'}`}>
                  <img src={`/${l.fichier}`} alt={titre} loading="lazy" decoding="async" className="aspect-video w-full object-contain p-8 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]" />
                </button>
                <div className={`${BANDE} flex flex-1 flex-col`}>
                  <p className="v2-serif text-[1.05rem] font-light leading-snug text-[#f4efe6]">{titre}</p>
                  <p className="mt-2 text-[13px] font-light leading-relaxed text-[#f4efe6]/65">{lang === 'EN' ? l.legendeEN : l.legendeFR}</p>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                    <a href={`/${l.fichier}`} download className={`${BOUTON} ${CREUX}`}><Download size={14} weight="regular" /> {t.telecharger}</a>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ─── LES TEXTES ─────────────────────────────────────────────── */}
      <section id="textes" className={`${SECTION} bg-[#f4efe6]`}>
        <Chapeau numero={<>N&deg; 05</>} titre={t.textesTitre} note={t.textesNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-[clamp(1.25rem,2.5vw,1.75rem)] md:grid-cols-2 xl:grid-cols-3">
          {kit.textes.map(x => (
            <Reveal key={x.key} className={TUILE}>
              <div className="flex aspect-video w-full items-center justify-center bg-[#f4efe6]/[0.04] px-6 text-center">
                <div>
                  <FileText size={26} weight="regular" className="mx-auto mb-3 text-[#BA7B39]" />
                  <p className="text-[13px] uppercase tracking-[0.18em] text-[#f4efe6]/55">{x.key}.txt</p>
                </div>
              </div>
              <div className={`${BANDE} flex flex-1 flex-col`}>
                <p className="v2-serif text-[1.05rem] font-light leading-snug text-[#f4efe6]">{lang === 'EN' ? x.labelEN : x.labelFR}</p>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                  <Geste onClick={() => setTexte(x)} libelle={`${t.lire} · ${x.key}`}>
                    <ArrowUpRight size={14} weight="regular" /> {t.lire}
                  </Geste>
                  <Geste onClick={() => telechargerTexte(x)} libelle={`${t.telecharger} · ${x.key}`}>
                    <Download size={14} weight="regular" /> {t.telecharger}
                  </Geste>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── CONTACT PRESSE ─────────────────────────────────────────── */}
      <section className={`${SECTION} bg-[#efe6d7]`}>
        <Reveal className={`${PANNEAU} px-[clamp(1.75rem,5vw,4.5rem)] py-[clamp(3rem,8vh,5rem)]`}>
          <div className="grid gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Kicker sombre className="mb-5">{lang === 'EN' ? 'Contact' : 'Nous joindre'}</Kicker>
              <TitreChapitre sombre>{t.contactTitre}</TitreChapitre>
              <p className="mt-7 max-w-[52ch] text-[1rem] font-light leading-relaxed text-[#f4efe6]/80">{t.contactTexte}</p>
            </div>
            <div className="flex flex-col items-start justify-between gap-6 lg:py-1">
              <BoutonCuivre href="mailto:equipe@inspiratanature.com">
                {t.contactGeste} <ArrowUpRight size={14} weight="regular" />
              </BoutonCuivre>
              <p className="text-[13px] uppercase tracking-[0.2em] text-[#f4efe6]/55">equipe@inspiratanature.com</p>
              <p className="text-[13px] uppercase tracking-[0.2em] text-[#f4efe6]/40">krystinestlaurent.ca/presse</p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ─── LA LOUPE ───────────────────────────────────────────────── */}
      {loupe && (() => {
        const node = refs.current.get(loupe.cle);
        return (
          <div className="fixed inset-0 z-[80] flex flex-col bg-[#1c1712]/94 backdrop-blur-sm" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between px-[clamp(1rem,4vw,3rem)] py-5">
              <span className="text-[13px] uppercase tracking-[0.2em] text-[#f4efe6]/55">{loupe.titre}</span>
              <button type="button" onClick={() => setLoupe(null)} className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.18em] text-[#f4efe6]/70 transition-colors hover:text-[#BA7B39]">
                {t.fermer} <X size={15} weight="regular" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-hidden px-[clamp(0.75rem,3vw,3rem)] pb-[clamp(1.5rem,5vh,3rem)]">
              <div className="max-h-full w-full max-w-4xl">
                <CadreEchelle>{node ? <div dangerouslySetInnerHTML={{ __html: node.outerHTML }} /> : null}</CadreEchelle>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-[#f4efe6]/12 px-[clamp(1rem,4vw,3rem)] py-5">
              <button type="button" onClick={() => telecharger(loupe.cle, `${loupe.cle.replace(':', '-')}.jpg`)} className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.18em] text-[#f4efe6]/75 transition-colors hover:text-[#BA7B39]">
                <Download size={14} weight="regular" /> {t.telecharger}
              </button>
              <button type="button" onClick={() => envoyer(loupe.cle, `${loupe.cle.replace(':', '-')}.jpg`, loupe.titre)} className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.18em] text-[#f4efe6]/75 transition-colors hover:text-[#BA7B39]">
                <ShareNetwork size={14} weight="regular" /> {copie === loupe.cle ? t.copie : t.partager}
              </button>
            </div>
          </div>
        );
      })()}

      {/* ─── LE FEUILLET DE TEXTE ───────────────────────────────────── */}
      {texte && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1712]/80 px-[clamp(1rem,4vw,3rem)] py-[clamp(1.5rem,6vh,4rem)] backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex max-h-full w-full max-w-[760px] flex-col rounded-[15px] bg-[#faf6ee]">
            <div className="flex items-center justify-between border-b border-[#1c1712]/12 px-7 py-5">
              <h3 className="v2-serif text-[1.15rem] font-light text-[#1c1712]">{lang === 'EN' ? texte.labelEN : texte.labelFR}</h3>
              <button type="button" onClick={() => setTexte(null)} className="inline-flex items-center gap-2 text-[13px] uppercase tracking-[0.18em] text-[#1c1712]/55 transition-colors hover:text-[#7d6330]">
                {t.fermer} <X size={15} weight="regular" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap px-7 py-6 font-sans text-[0.9rem] font-light leading-relaxed text-[#3a2f23]">
              {(lang === 'EN' && texte.texteEN) ? texte.texteEN : texte.texteFR}
            </pre>
            <div className="border-t border-[#1c1712]/12 px-7 py-4">
              <button type="button" onClick={() => telechargerTexte(texte)} className="inline-flex items-center gap-2 border-b border-[#1c1712]/40 pb-1 text-[13px] uppercase tracking-[0.18em] text-[#1c1712] transition-colors hover:text-[#7d6330]">
                <Download size={14} weight="regular" /> {t.telecharger}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── LES NŒUDS DU ZIP, hors écran ───────────────────────────── */}
      <div style={{ position: 'fixed', left: -99999, top: 0, width: W, pointerEvents: 'none' }} aria-hidden="true">
        {kit.cartes.map(c => <div key={c.key} ref={enregistrerZip(`zc:${c.key}`)}><VisuelCarte carte={c} lang="FR" qr={false} /></div>)}
        {kit.planches.map(p => <div key={p.key} ref={enregistrerZip(`zp:${p.key}`)}><VisuelPlanche item={p} qr={false} /></div>)}
        {kit.pages.map(p => <div key={p.key} ref={enregistrerZip(`zs:${p.key}`)}><VisuelPlanche item={p} qr={false} page /></div>)}
      </div>
    </div>
  );
};

export default PressePage;
