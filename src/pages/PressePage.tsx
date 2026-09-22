import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Download, ShareNetwork, QrCode, ImageSquare, X, CaretLeft, CaretRight, EyeSlash } from '@phosphor-icons/react';
import {
  StyleV2, Kicker, Masthead, TitreV2, SousTitreV2, LiensChapitres, LigneDefiler,
  TitreChapitre, Filet, Reveal, CarteVerte, BoutonNoir, BoutonCuivre, LienSouligne,
  useMotionV2, GOUTTIERE,
} from '../components/v2/Magazine';
import { useApp, useAuth } from '../contexts/AppContext';
import { useSiteFlags } from '../contexts/SiteFlagsContext';
import {
  CARTES, PLANCHES, PAGES, LOGOS, TEXTES, FAITS,
  PRESSE_ZIP, PRESSE_ZIP_POIDS, fichierCarte, pleineRes, vignette,
  type Carte, type Feuillet, type TexteKit,
} from '../content/presse';

/**
 * La salle de presse, au langage magazine crème des pages V2. Elle porte
 * ce que scripts/presse/build-kit.mjs fabrique : les cartes de 1920 sur
 * 1080, les planches photo, les pages du site, les mots-symboles, les
 * textes et le zip complet.
 *
 * Tant que l'interrupteur presseOuvert reste éteint dans l'admin, une
 * visiteuse qui arrive ici repart vers l'accueil, et Krystine reste seule
 * à voir la page, avec un bandeau qui lui rappelle où l'allumer. Le lien
 * Presse du pied de page global obéit au même drapeau.
 */

const SECTION = `relative w-full ${GOUTTIERE} py-[clamp(4.5rem,12vh,9rem)] scroll-mt-24`;

const T = {
  FR: {
    kicker: 'Pour la presse',
    titre: 'Salle de presse',
    soustitre: 'Les visuels, les portraits et les biographies se téléchargent ici librement, à la seule condition de créditer Krystine St-Laurent.',
    liens: [['Les visuels', '#visuels'], ['Les photos', '#photos'], ['Le site', '#site'], ['Les mots-symboles', '#logos'], ['Les textes', '#textes']] as [string, string][],
    defiler: 'Faire défiler',
    zip: 'Télécharger le kit complet',
    zipNote: `Un seul fichier, ${PRESSE_ZIP_POIDS} : les visuels, les mots-symboles et les textes.`,
    faitsTitre: 'Les faits',
    faitsNote: 'Tout ce qui se vérifie en un coup d’œil, et la fiche complète en fichier texte.',
    ficheFaits: 'Ouvrir la fiche des faits',
    visuelsTitre: 'Les visuels',
    visuelsNote: 'Huit cartes de 1920 sur 1080 pixels, chacune en français et en anglais, avec ou sans code QR.',
    photosTitre: 'Les photos',
    photosNote: 'Six planches légendées dans les deux langues, prêtes à illustrer un article.',
    siteTitre: 'Le site',
    siteNote: 'Cinq pages captées telles qu’elles s’affichaient à la fabrication du kit.',
    logosTitre: 'Les mots-symboles',
    logosNote: 'Le site n’a pas d’autre logo que sa signature typographique, et elle existe en quatre versions.',
    textesTitre: 'Les textes',
    textesNote: 'Les biographies et la fiche des faits, à lire ici ou à emporter en fichier.',
    lire: 'Lire',
    telecharger: 'Télécharger',
    partager: 'Partager',
    versionQr: 'Version QR',
    photoSeule: 'Photo seule',
    copie: 'Adresse copiée',
    fermer: 'Fermer',
    contactTitre: 'Une demande particulière',
    contactTexte: 'S’il vous manque un format, une photo de scène ou une citation sur un sujet précis, écrivez à l’équipe et nous la préparons.',
    contactGeste: 'Écrire à l’équipe',
    apercuTitre: 'Cette salle de presse est encore éteinte',
    apercuTexte: 'Personne d’autre que vous ne la voit. Allumez-la quand elle vous convient.',
    apercuGeste: 'Réglages, En préparation',
  },
  EN: {
    kicker: 'For the press',
    titre: 'Press room',
    soustitre: 'The visuals, the portraits and the biographies download freely from here, on the single condition that Krystine St-Laurent is credited.',
    liens: [['The visuals', '#visuels'], ['The photographs', '#photos'], ['The site', '#site'], ['The wordmarks', '#logos'], ['The texts', '#textes']] as [string, string][],
    defiler: 'Scroll',
    zip: 'Download the full kit',
    zipNote: `One file, ${PRESSE_ZIP_POIDS}: the visuals, the wordmarks and the texts.`,
    faitsTitre: 'The facts',
    faitsNote: 'Everything that checks out at a glance, with the full sheet as a text file.',
    ficheFaits: 'Open the fact sheet',
    visuelsTitre: 'The visuals',
    visuelsNote: 'Eight cards at 1920 by 1080 pixels, each one in French and in English, with or without a QR code.',
    photosTitre: 'The photographs',
    photosNote: 'Six captioned plates in both languages, ready to illustrate an article.',
    siteTitre: 'The site',
    siteNote: 'Five pages captured exactly as they looked when the kit was built.',
    logosTitre: 'The wordmarks',
    logosNote: 'The site has no logo beyond its typographic signature, and that signature comes in four versions.',
    textesTitre: 'The texts',
    textesNote: 'The biographies and the fact sheet, to read here or to carry away as a file.',
    lire: 'Read',
    telecharger: 'Download',
    partager: 'Share',
    versionQr: 'QR version',
    photoSeule: 'Photo only',
    copie: 'Address copied',
    fermer: 'Close',
    contactTitre: 'Something else you need',
    contactTexte: 'If a format is missing, or a stage photograph, or a quote on a particular subject, write to the team and we will prepare it.',
    contactGeste: 'Write to the team',
    apercuTitre: 'This press room is still switched off',
    apercuTexte: 'Nobody else can see it. Switch it on whenever it suits you.',
    apercuGeste: 'Settings, In preparation',
  },
};

/* ════════════════════════ Les gestes d'un fichier ════════════════════════ */

const GESTE = 'inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.18em] transition-colors duration-300';

const Geste: React.FC<{
  onClick?: () => void; href?: string; download?: string;
  actif?: boolean; disponible?: boolean; children: React.ReactNode;
}> = ({ onClick, href, download, actif = false, disponible = true, children }) => {
  const couleur = !disponible
    ? 'text-[#1c1712]/25 cursor-not-allowed'
    : actif
      ? 'text-[#7d6330] border-b border-[#9c7a44] pb-0.5'
      : 'text-[#1c1712]/60 hover:text-[#7d6330] border-b border-transparent pb-0.5';
  if (href) return <a href={href} download={download} className={`${GESTE} ${couleur}`}>{children}</a>;
  return <button type="button" disabled={!disponible} onClick={onClick} className={`${GESTE} ${couleur}`}>{children}</button>;
};

/**
 * Partager un visuel : la feuille native quand le navigateur sait envoyer
 * un fichier, sinon l'adresse absolue dans le presse-papiers. Une
 * journaliste sur téléphone envoie l'image dans sa messagerie, une
 * journaliste au bureau colle le lien dans un courriel.
 */
async function partager(fichier: string, titre: string): Promise<'partage' | 'copie'> {
  const url = new URL(pleineRes(fichier), window.location.origin).toString();
  try {
    const rep = await fetch(pleineRes(fichier));
    const blob = await rep.blob();
    const nom = fichier.split('/').pop() || 'visuel';
    const file = new File([blob], nom, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: titre });
      return 'partage';
    }
  } catch { /* fichier illisible ou partage refusé : l'adresse fera l'affaire */ }
  try { await navigator.clipboard.writeText(url); } catch { /* presse-papiers fermé */ }
  return 'copie';
}

/**
 * Le chapeau d'un chapitre : le numéro et le titre à gauche, le filet et
 * la phrase de présentation à droite. Les deux colonnes tiennent la
 * largeur de la page, là où un seul bloc de texte laissait la moitié
 * droite de l'écran vide.
 */
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

/* ════════════════════════ La tuile ════════════════════════ */

const Tuile: React.FC<{
  fichier: string; titre: string; legende: string; ratio?: string;
  fond?: string; onOuvrir: () => void; children: React.ReactNode;
}> = ({ fichier, titre, legende, ratio = 'aspect-[16/9]', fond = 'bg-[#e7ddcb]', onOuvrir, children }) => (
  <Reveal className="relative">
    <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/30" aria-hidden />
    <button
      type="button"
      onClick={onOuvrir}
      className={`group relative block w-full ${ratio} overflow-hidden ${fond}`}
      aria-label={titre}
    >
      <img
        src={vignette(fichier)}
        alt={titre}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
      />
    </button>
    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h3 className="v2-serif font-light text-[1.15rem] leading-tight text-[#1c1712]">{titre}</h3>
      <p className="text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/40">{fichier.split('/').pop()}</p>
    </div>
    <p className="mt-1.5 text-sm font-light leading-relaxed text-[#3a2f23]/75">{legende}</p>
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-[#1c1712]/10 pt-3.5">{children}</div>
  </Reveal>
);

/* ════════════════════════ La page ════════════════════════ */

const PressePage: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  const { lang } = useApp();
  const { isAdmin } = useAuth();
  const { presseOuvert, pret } = useSiteFlags();
  const t = T[lang === 'EN' ? 'EN' : 'FR'];

  const [enQr, setEnQr] = useState<Set<string>>(new Set());
  const [enNu, setEnNu] = useState<Set<string>>(new Set());
  const [copie, setCopie] = useState<string | null>(null);
  const [loupe, setLoupe] = useState<{ fichiers: string[]; i: number } | null>(null);
  const [texte, setTexte] = useState<{ item: TexteKit; contenu: string } | null>(null);

  useMotionV2(root, pret && (presseOuvert || isAdmin));

  const bascule = (set: React.Dispatch<React.SetStateAction<Set<string>>>, cle: string) =>
    set(s => { const n = new Set(s); if (n.has(cle)) n.delete(cle); else n.add(cle); return n; });

  const envoyer = useCallback(async (fichier: string, titre: string) => {
    const issue = await partager(fichier, titre);
    if (issue === 'copie') { setCopie(fichier); window.setTimeout(() => setCopie(null), 2200); }
  }, []);

  const lireTexte = useCallback(async (item: TexteKit) => {
    try {
      const rep = await fetch(pleineRes(item.fichier));
      setTexte({ item, contenu: await rep.text() });
    } catch { /* fichier absent : le téléchargement reste possible */ }
  }, []);

  // La loupe verrouille le défilement de la page derrière elle, sinon le
  // fond glisse sous l'image dès qu'on fait défiler au doigt.
  useEffect(() => {
    const ouvert = !!loupe || !!texte;
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLoupe(null); setTexte(null); return; }
      if (!loupe) return;
      if (e.key === 'ArrowRight') setLoupe(l => (l ? { ...l, i: (l.i + 1) % l.fichiers.length } : l));
      if (e.key === 'ArrowLeft') setLoupe(l => (l ? { ...l, i: (l.i - 1 + l.fichiers.length) % l.fichiers.length } : l));
    };
    window.addEventListener('keydown', clavier);
    return () => { window.removeEventListener('keydown', clavier); document.body.style.overflow = avant; };
  }, [loupe, texte]);

  if (!pret) return <div className="min-h-screen bg-[#f4efe6]" />;
  if (!presseOuvert && !isAdmin) return <Navigate to="/krystine" replace />;

  const fichiersCartes = CARTES.map(c => fichierCarte(c, lang === 'EN' ? 'EN' : 'FR', enNu.has(c.key) && c.nu, enQr.has(c.key)));

  const gestesCommuns = (fichier: string, titre: string) => (
    <>
      <Geste href={pleineRes(fichier)} download={fichier.split('/').pop()}>
        <Download size={13} weight="regular" /> {t.telecharger}
      </Geste>
      <Geste onClick={() => envoyer(fichier, titre)} actif={copie === fichier}>
        <ShareNetwork size={13} weight="regular" /> {copie === fichier ? t.copie : t.partager}
      </Geste>
    </>
  );

  return (
    <div ref={root} className="relative w-full bg-[#f4efe6] text-[#1c1712] antialiased overflow-x-hidden">
      <StyleV2 />

      {isAdmin && !presseOuvert && (
        <div className={`relative z-40 w-full bg-[#1c1712] text-[#f4efe6] ${GOUTTIERE} py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <p className="flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.18em]">
              <EyeSlash size={15} weight="regular" className="text-[#BA7B39]" />
              {t.apercuTitre}
              <span className="hidden normal-case tracking-normal text-[0.85rem] text-[#f4efe6]/60 md:inline">{t.apercuTexte}</span>
            </p>
            <Link
              to="/admin/en-preparation"
              className="inline-flex items-center gap-2 border-b border-[#BA7B39] pb-1 text-[0.66rem] uppercase tracking-[0.2em] text-[#BA7B39] transition-colors duration-300 hover:text-[#d9a05b]"
            >
              {t.apercuGeste} <ArrowUpRight size={13} weight="regular" />
            </Link>
          </div>
        </div>
      )}

      {/* ─── SEUIL ─────────────────────────────────────────────────── */}
      <section data-hero className={`relative w-full ${GOUTTIERE} pt-[clamp(6rem,12vh,9rem)] pb-[clamp(2rem,5vh,4rem)]`}>
        <Masthead gauche={<>N&deg; 09 &middot; {t.titre}</>} />
        <div className="mt-[clamp(2rem,5vh,3.5rem)]">
          <p data-fade className="mb-6 text-[0.7rem] uppercase tracking-[0.34em] text-[#7d6330]">{t.kicker}</p>
          <TitreV2 lignes={[t.titre]} />
          <SousTitreV2>{t.soustitre}</SousTitreV2>
          <LiensChapitres liens={t.liens} />
          <div data-fade className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <BoutonNoir href={PRESSE_ZIP}>
              <Download size={15} weight="regular" /> {t.zip}
            </BoutonNoir>
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-[#1c1712]/45">{t.zipNote}</p>
          </div>
        </div>

        <div className="relative mt-[clamp(2.5rem,6vh,4.5rem)] w-full">
          <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
          <div data-portrait-clip className="relative aspect-[16/9] w-full overflow-hidden bg-[#e7ddcb]" style={{ clipPath: 'inset(0% 0% 0% 0%)' }}>
            <img
              data-portrait-img
              src={pleineRes('portrait-nu.jpg')}
              alt="Krystine St-Laurent, portrait de presse"
              className="h-full w-full object-cover object-center will-change-transform"
            />
            <span data-fade className="absolute left-0 top-0 bg-[#1c1712] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em] text-[#f4efe6]">
              {lang === 'EN' ? 'Portrait' : 'Portrait'}
            </span>
          </div>
        </div>

        <LigneDefiler libelle={t.defiler} droite={<>1920 &times; 1080 &middot; PNG &middot; JPG</>} />
      </section>

      {/* ─── LES FAITS ─────────────────────────────────────────────── */}
      <section className={`${SECTION} bg-[#efe6d7]`}>
        <Chapeau numero={t.kicker} titre={t.faitsTitre} note={t.faitsNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {FAITS.map((f, i) => (
            <Reveal key={f.fr} delay={i * 0.04}>
              <p className="v2-serif text-[clamp(2.6rem,5vw,3.6rem)] font-light leading-none text-[#1c1712]">{f.valeur}</p>
              <p className="mt-3 text-[0.66rem] uppercase leading-relaxed tracking-[0.2em] text-[#1c1712]/55">{lang === 'EN' ? f.en : f.fr}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12">
          <LienSouligne onClick={() => lireTexte(TEXTES.find(x => x.fichier.includes(lang === 'EN' ? 'facts-en' : 'faits-fr')) || TEXTES[2])}>
            {t.ficheFaits} <ArrowUpRight size={13} weight="regular" />
          </LienSouligne>
        </Reveal>
      </section>

      {/* ─── LES VISUELS ───────────────────────────────────────────── */}
      <section id="visuels" className={`${SECTION} bg-[#f4efe6]`}>
        <Chapeau numero={<>N&deg; 01</>} titre={t.visuelsTitre} note={t.visuelsNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-x-[clamp(2rem,4vw,3.5rem)] gap-y-[clamp(3rem,6vh,4.5rem)] md:grid-cols-2">
          {CARTES.map((c: Carte, idx) => {
            const fichier = fichiersCartes[idx];
            const titre = lang === 'EN' ? c.labelEN : c.labelFR;
            return (
              <Tuile
                key={c.key}
                fichier={fichier}
                titre={titre}
                legende={lang === 'EN' ? c.legendeEN : c.legendeFR}
                onOuvrir={() => setLoupe({ fichiers: fichiersCartes, i: idx })}
              >
                {gestesCommuns(fichier, titre)}
                <Geste actif={enQr.has(c.key)} onClick={() => bascule(setEnQr, c.key)}>
                  <QrCode size={13} weight="regular" /> {t.versionQr}
                </Geste>
                <Geste actif={enNu.has(c.key)} disponible={c.nu} onClick={() => bascule(setEnNu, c.key)}>
                  <ImageSquare size={13} weight="regular" /> {t.photoSeule}
                </Geste>
              </Tuile>
            );
          })}
        </div>
      </section>

      {/* ─── LES PHOTOS ────────────────────────────────────────────── */}
      <section id="photos" className={`${SECTION} bg-[#efe6d7]`}>
        <Chapeau numero={<>N&deg; 02</>} titre={t.photosTitre} note={t.photosNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-x-[clamp(2rem,4vw,3.5rem)] gap-y-[clamp(3rem,6vh,4.5rem)] md:grid-cols-2 xl:grid-cols-3">
          {PLANCHES.map((p: Feuillet, idx) => {
            const titre = lang === 'EN' ? p.labelEN : p.labelFR;
            return (
              <Tuile
                key={p.key}
                fichier={p.fichier}
                titre={titre}
                legende={lang === 'EN' ? p.legendeEN : p.legendeFR}
                onOuvrir={() => setLoupe({ fichiers: PLANCHES.map(x => x.fichier), i: idx })}
              >
                {gestesCommuns(p.fichier, titre)}
              </Tuile>
            );
          })}
        </div>
      </section>

      {/* ─── LE SITE ───────────────────────────────────────────────── */}
      <section id="site" className={`${SECTION} bg-[#f4efe6]`}>
        <Chapeau numero={<>N&deg; 03</>} titre={t.siteTitre} note={t.siteNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-x-[clamp(2rem,4vw,3.5rem)] gap-y-[clamp(3rem,6vh,4.5rem)] md:grid-cols-2 xl:grid-cols-3">
          {PAGES.map((p: Feuillet, idx) => {
            const titre = lang === 'EN' ? p.labelEN : p.labelFR;
            return (
              <Tuile
                key={p.key}
                fichier={p.fichier}
                titre={titre}
                legende={lang === 'EN' ? p.legendeEN : p.legendeFR}
                onOuvrir={() => setLoupe({ fichiers: PAGES.map(x => x.fichier), i: idx })}
              >
                {gestesCommuns(p.fichier, titre)}
              </Tuile>
            );
          })}
        </div>
      </section>

      {/* ─── LES MOTS-SYMBOLES ─────────────────────────────────────── */}
      <section id="logos" className={`${SECTION} bg-[#efe6d7]`}>
        <Chapeau numero={<>N&deg; 04</>} titre={t.logosTitre} note={t.logosNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-x-[clamp(2rem,4vw,3.5rem)] gap-y-[clamp(3rem,6vh,4.5rem)] sm:grid-cols-2 xl:grid-cols-4">
          {LOGOS.map((l: Feuillet, idx) => {
            const titre = lang === 'EN' ? l.labelEN : l.labelFR;
            const sombre = l.key === 'creme-encre' || l.key === 'creme-transparent';
            return (
              <Tuile
                key={l.key}
                fichier={l.fichier}
                titre={titre}
                legende={lang === 'EN' ? l.legendeEN : l.legendeFR}
                ratio="aspect-[3/1]"
                fond={sombre ? 'bg-[#34241a]' : 'bg-[#faf6ee]'}
                onOuvrir={() => setLoupe({ fichiers: LOGOS.map(x => x.fichier), i: idx })}
              >
                {gestesCommuns(l.fichier, titre)}
              </Tuile>
            );
          })}
        </div>
      </section>

      {/* ─── LES TEXTES ────────────────────────────────────────────── */}
      <section id="textes" className={`${SECTION} bg-[#f4efe6]`}>
        <Chapeau numero={<>N&deg; 05</>} titre={t.textesTitre} note={t.textesNote} />
        <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-x-[clamp(2rem,4vw,3.5rem)] gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {TEXTES.map((x, i) => (
            <Reveal key={x.fichier} delay={i * 0.03} className="border-t border-[#1c1712]/12 pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="v2-serif text-[1.05rem] font-light leading-tight text-[#1c1712]">{lang === 'EN' ? x.labelEN : x.labelFR}</h3>
                <span className="text-[0.58rem] uppercase tracking-[0.24em] text-[#1c1712]/35">{x.langue}</span>
              </div>
              <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Geste onClick={() => lireTexte(x)}><ArrowUpRight size={13} weight="regular" /> {t.lire}</Geste>
                <Geste href={pleineRes(x.fichier)} download={x.fichier.split('/').pop()}>
                  <Download size={13} weight="regular" /> {t.telecharger}
                </Geste>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── CONTACT · la seule carte sombre de la page ─────────────── */}
      <section className={`${SECTION} bg-[#efe6d7]`}>
        <Reveal>
          <CarteVerte className="px-[clamp(1.75rem,5vw,4.5rem)] py-[clamp(3rem,8vh,5rem)]">
            <div className="grid items-center gap-x-[clamp(2rem,5vw,5rem)] gap-y-10 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <Kicker sombre className="mb-5">{lang === 'EN' ? 'Contact' : 'Nous joindre'}</Kicker>
                <TitreChapitre sombre>{t.contactTitre}</TitreChapitre>
                <p className="mt-7 max-w-[46ch] text-[1rem] font-light leading-relaxed text-[#EEE7DB]/80">{t.contactTexte}</p>
              </div>
              <div className="flex flex-col items-start gap-6">
                <BoutonCuivre href="mailto:equipe@inspiratanature.com">
                  {t.contactGeste} <ArrowUpRight size={14} weight="regular" />
                </BoutonCuivre>
                <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[#EEE7DB]/55">equipe@inspiratanature.com</p>
                <p className="text-[0.7rem] uppercase tracking-[0.22em] text-[#EEE7DB]/40">krystinestlaurent.ca/presse</p>
              </div>
            </div>
          </CarteVerte>
        </Reveal>
      </section>

      {/* ─── LA LOUPE ──────────────────────────────────────────────── */}
      {loupe && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-[#1c1712]/94 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-[clamp(1rem,4vw,3rem)] py-5">
            <span className="text-[0.62rem] uppercase tracking-[0.24em] text-[#f4efe6]/55">
              {loupe.i + 1} / {loupe.fichiers.length} &middot; {loupe.fichiers[loupe.i].split('/').pop()}
            </span>
            <button type="button" onClick={() => setLoupe(null)} className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-[#f4efe6]/70 transition-colors hover:text-[#BA7B39]">
              {t.fermer} <X size={15} weight="regular" />
            </button>
          </div>
          <div className="flex flex-1 items-center justify-center gap-[clamp(0.5rem,2vw,2rem)] px-[clamp(0.75rem,3vw,3rem)] pb-[clamp(1.5rem,5vh,3rem)]">
            <button type="button" aria-label="Précédent" onClick={() => setLoupe(l => (l ? { ...l, i: (l.i - 1 + l.fichiers.length) % l.fichiers.length } : l))} className="shrink-0 p-3 text-[#f4efe6]/55 transition-colors hover:text-[#BA7B39]">
              <CaretLeft size={22} weight="light" />
            </button>
            <img src={pleineRes(loupe.fichiers[loupe.i])} alt="" className="max-h-full max-w-full object-contain" />
            <button type="button" aria-label="Suivant" onClick={() => setLoupe(l => (l ? { ...l, i: (l.i + 1) % l.fichiers.length } : l))} className="shrink-0 p-3 text-[#f4efe6]/55 transition-colors hover:text-[#BA7B39]">
              <CaretRight size={22} weight="light" />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-[#f4efe6]/12 px-[clamp(1rem,4vw,3rem)] py-5">
            <a href={pleineRes(loupe.fichiers[loupe.i])} download className="inline-flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.2em] text-[#f4efe6]/75 transition-colors hover:text-[#BA7B39]">
              <Download size={14} weight="regular" /> {t.telecharger}
            </a>
            <button type="button" onClick={() => envoyer(loupe.fichiers[loupe.i], t.titre)} className="inline-flex items-center gap-2 text-[0.64rem] uppercase tracking-[0.2em] text-[#f4efe6]/75 transition-colors hover:text-[#BA7B39]">
              <ShareNetwork size={14} weight="regular" /> {copie === loupe.fichiers[loupe.i] ? t.copie : t.partager}
            </button>
          </div>
        </div>
      )}

      {/* ─── LE FEUILLET DE TEXTE ──────────────────────────────────── */}
      {texte && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1c1712]/80 px-[clamp(1rem,4vw,3rem)] py-[clamp(1.5rem,6vh,4rem)] backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="flex max-h-full w-full max-w-[760px] flex-col bg-[#faf6ee]">
            <div className="flex items-center justify-between border-b border-[#1c1712]/12 px-7 py-5">
              <h3 className="v2-serif text-[1.15rem] font-light text-[#1c1712]">{lang === 'EN' ? texte.item.labelEN : texte.item.labelFR}</h3>
              <button type="button" onClick={() => setTexte(null)} className="inline-flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.2em] text-[#1c1712]/55 transition-colors hover:text-[#7d6330]">
                {t.fermer} <X size={15} weight="regular" />
              </button>
            </div>
            <pre className="flex-1 overflow-auto whitespace-pre-wrap px-7 py-6 font-sans text-[0.9rem] font-light leading-relaxed text-[#3a2f23]">{texte.contenu}</pre>
            <div className="border-t border-[#1c1712]/12 px-7 py-4">
              <Geste href={pleineRes(texte.item.fichier)} download={texte.item.fichier.split('/').pop()}>
                <Download size={13} weight="regular" /> {t.telecharger}
              </Geste>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center pb-16">
        <a href="#visuels" className="inline-flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.24em] text-[#1c1712]/35 transition-colors hover:text-[#7d6330]">
          <ArrowDown size={12} weight="regular" /> {t.visuelsTitre}
        </a>
      </div>
    </div>
  );
};

export default PressePage;
