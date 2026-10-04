// Rendu HTML des infolettres composées dans l'admin (blocs). Aucune
// dépendance React : ce fichier tourne dans une Cloud Function.
//
// Le gabarit reprend celui des courriels du direct (live.ts) : couverture
// noir + or « Au-delà des tendances » en pièce inline, bandeau noir chaud
// avec le sujet, corps blanc pour les blocs, signature de Krystine, pied
// ivoire. Les couleurs viennent du visuel officiel Saison 2 (27 août 2026).

import { PUBLIC_BASE_URL } from './mail';

export type BlockType = 'heading' | 'paragraph' | 'image' | 'button' | 'divider' | 'quote' | 'cta' | 'spacer' | 'list' | 'choix' | 'carnet' | 'note' | 'univers';

export interface NewsletterBlock {
  type: BlockType;
  content?: Record<string, any>;
}

export const CHARTE = {
  cream: '#EEE7DB',
  ink: '#293027',
  night: '#141311',
  gold: '#e0b060',
  goldInk: '#7d6330',
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
};

const COVER_URL = `${PUBLIC_BASE_URL}/podcast/live-cover.jpg`;
// La signature du site (/compte/signature-krystine-noire.webp), en PNG pour les courriels (Krystine, 26 sept. 2026).
const SIGNATURE_URL = `${PUBLIC_BASE_URL}/infolettre/signature-krystine.png`;
const PORTRAIT_URL = `${PUBLIC_BASE_URL}/podcast/krystine.jpg`;

export type Couverture = 'podcast' | 'image' | 'titre' | 'aucune';

/** L'en-tête « titre » : le nom de la lettre écrit en toutes lettres (Krystine, 26 sept. 2026). */
export interface EnteteTitre { titre?: string; sousTitre?: string; /** Image de droite; le foyer par défaut. */ image?: string | null }
export type Lang = 'fr' | 'en';

export interface Bandeau {
  etiquette?: string;
  fond?: string;
  texte?: string;
  image?: string | null;
  masque?: boolean;
}

// Séparateurs décoratifs (mêmes clés que src/lib/newsletterRenderer.tsx).
const SEPARATEURS: Record<string, string> = { points: '&bull;&nbsp;&nbsp;&bull;&nbsp;&nbsp;&bull;', fleuron: '&#10086;', etoiles: '&#10022;&nbsp;&nbsp;&#10022;&nbsp;&nbsp;&#10022;', feuille: '&#10087;' };

// Les mots du gabarit dans les deux langues de la lettre.
const MOTS: Record<Lang, { etiquette: string; desabonner: string; politique: string; devise: string; relier: string; coverAlt: string }> = {
  fr: { etiquette: 'Infolettre', desabonner: 'Se désabonner', politique: 'Politique de confidentialité', devise: 'Nourrir et soigner &middot; Corps et conscience &middot; Science et sagesses', relier: 'Relier ce que nous avons appris à séparer', coverAlt: 'Au-delà des tendances, avec Krystine St-Laurent' },
  en: { etiquette: 'Newsletter', desabonner: 'Unsubscribe', politique: 'Privacy policy', devise: 'Nourish and heal &middot; Body and consciousness &middot; Science and wisdom', relier: 'Reconnecting what we were taught to separate', coverAlt: 'Beyond the Trends, with Krystine St-Laurent' },
};

// Polices et tailles offertes dans le composeur (mêmes clés que src/lib/newsletterRenderer.tsx).
const POLICES: Record<string, string> = {
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  // Une seule écriture manuscrite dans les lettres, celle du carnet d'Ella :
  // Ms Madi était trop intense à lire (Krystine, 4 oct. 2026).
  script: "'Kalam', 'Bradley Hand', 'Segoe Print', 'Comic Neue', cursive",
  // L'écriture d'Ella (Krystine, 4 oct. 2026) : une main de carnet, posée sur
  // du papier. Bradley Hand prend le relais sur Apple quand Kalam ne charge pas (Kalam plutôt que Caveat : plus lisible, 4 oct. 2026).
  ella: "'Kalam', 'Bradley Hand', 'Segoe Print', 'Comic Neue', cursive",
};
const TAILLES: Record<string, number> = { sm: 14, md: 16, lg: 18, xl: 21 };

// Couleur venue du composeur : un hex court ou long, sinon rien.
function couleur(v: unknown, defaut: string): string {
  return typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v) ? v : defaut;
}

// Le corps de la lettre peut prendre un fond de la palette du site. Sur un
// fond sombre, le texte passe à l'ivoire et les accents à l'or : la lisibilité
// ne dépend pas d'un réglage de plus. Miroir de estSombre côté composeur.
function estSombre(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.35;
}
interface Palette { fond: string; ink: string; muted: string; accent: string; sombre: boolean }
function palette(fond?: string | null): Palette {
  const f = couleur(fond, '#ffffff');
  const sombre = estSombre(f);
  return sombre
    ? { fond: f, ink: CHARTE.cream, muted: 'rgba(238,231,219,0.78)', accent: CHARTE.gold, sombre }
    : { fond: f, ink: CHARTE.ink, muted: 'rgba(41,48,39,0.75)', accent: CHARTE.goldInk, sombre };
}
const PALETTE_CLAIRE = palette('#ffffff');

// Pièces inline : visibles même quand le client bloque les images distantes.
// Seulement celles que le courriel montre vraiment : une infolettre sans
// couverture du podcast ne transporte pas la couverture du podcast.
export function newsletterAttachments(opts: Pick<RenderEmailOptions, 'couverture' | 'signature'> = {}) {
  const out: { filename: string; href: string; cid: string }[] = [];
  if (opts.couverture === 'podcast') out.push({ filename: 'couverture.jpg', href: COVER_URL, cid: 'cover' });
  if (opts.signature !== false) out.push({ filename: 'signature.png', href: SIGNATURE_URL, cid: 'signature' });
  return out;
}

// Pour l'aperçu dans l'admin (iframe), les cid: deviennent des URL publiques.
export function inlineForPreview(html: string): string {
  return html.replace(/cid:cover/g, COVER_URL).replace(/cid:signature/g, SIGNATURE_URL).replace(/cid:portrait/g, PORTRAIT_URL);
}

export interface RenderEmailOptions {
  /** Titre du bandeau quand il diffère de l’objet (« \n » = changement de ligne). */
  titreBandeau?: string;
  /** Taille du titre du bandeau en px (34 par défaut), pour un titre long qui doit tenir en deux lignes. */
  tailleTitreBandeau?: number;
  subject: string;
  preheader?: string;
  unsubscribeUrl: string;
  postalAddress: string;
  firstName?: string;
  /** L'identifiant de la lettre : si présent, chaque lien vers krystinestlaurent.ca reçoit
   *  utm_source=infolettre&utm_medium=courriel&utm_campaign=<identifiant> (désabonnement
   *  et liens externes exceptés), pour que Visiteurs et clics reconnaisse l'arrivée. */
  campagne?: string;
  /** En-tête : couverture du podcast, image choisie (couvertureUrl), ou rien (défaut). */
  couverture?: Couverture;
  couvertureUrl?: string | null;
  /** Le titre et le sous-titre de l'en-tête quand couverture = 'titre'. */
  entete?: EnteteTitre | null;
  /** Signature de Krystine au bas du corps. Défaut : vrai. */
  signature?: boolean;
  /** Pixel de mesure d'ouverture, posé en toute fin de courriel. */
  pixelUrl?: string;
  /** Langue de la lettre : bandeau, pied et libellés. Défaut : fr. */
  lang?: Lang;
  /** Le bandeau sous la couverture : étiquette, couleurs, ou masqué. */
  bandeau?: Bandeau | null;
  /** Fond du corps de la lettre (palette du site). Blanc par défaut. */
  fond?: string | null;
  /** Taille de lecture de toute la lettre : normale, grande ou très grande. */
  tailleLecture?: TailleLecture | null;
}

// La taille de lecture de toute la lettre (Krystine, 27 sept. 2026 : « j'ai 53
// ans et j'ai de la difficulté à voir clair, imaginez à 80 ans »). Elle agrandit
// d'un même facteur le texte de tous les blocs, par-dessus la taille propre de
// chaque bloc. Les titres grandissent moitié moins, pour rester sur deux lignes.
export type TailleLecture = 'normale' | 'grande' | 'tres-grande';
const FACTEURS_LECTURE: Record<TailleLecture, number> = { normale: 1, grande: 1.2, 'tres-grande': 1.4 };
export function facteurLecture(t?: string | null): number {
  return FACTEURS_LECTURE[(t as TailleLecture)] || 1;
}

// Les formats d'image du composeur (miroir de src/lib/newsletterRenderer.tsx) :
// bannière recadrée en bande large, grande, moyenne, ou kaléidoscope de quatre
// carrés deux par deux. Les recadrages passent par wsrv.nl, déjà employé par le
// site, pour rester justes dans toutes les boîtes (object-fit n'y tient pas).
const FORMATS_IMAGE: Record<string, { px: number }> = {
  banniere: { px: 520 },
  grande: { px: 520 },
  moyenne: { px: 340 },
  kaleidoscope: { px: 520 },
};
const ANCIENS_FORMATS: Record<string, string> = { pleine: 'grande', petite: 'moyenne' };
function formatImage(v: unknown): string {
  const k = String(v || '');
  return FORMATS_IMAGE[k] ? k : ANCIENS_FORMATS[k] || 'grande';
}
function recadre(url: string, w: number, h: number): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${w}&h=${h}&fit=cover&a=attention&output=jpg&q=82`;
}
// Les quatre images d'un kaléidoscope : la première est l'image du bloc, les trois autres vivent dans `images`.
function imagesKaleidoscope(c: any): string[] {
  return [0, 1, 2, 3]
    .map(i => (i === 0 ? c.url : Array.isArray(c.images) ? c.images[i] : '') || '')
    .filter((u: string) => /^https?:\/\//.test(u));
}

// Le pied de page des lettres ne nomme plus Inspirata Nature (Krystine,
// 2 oct. 2026) : l'adresse postale reste, la raison sociale tombe.
function adressePied(adresse: string): string {
  // Ni la province ni le pays (Krystine, 2 oct. 2026) : la rue, la ville et
  // le code postal suffisent à rester joignable.
  return String(adresse || '')
    .replace(/\bInspira(?:ta)?\s+(?:Nature|Ayurveda)\b\s*(?:inc\.?)?\s*[,·\-–]?\s*/gi, '')
    .replace(/\s*\((?:Québec|Quebec|QC)\)/gi, '')
    .replace(/,?\s*Canada\b\.?/gi, '')
    .replace(/,\s*(?:Québec|Quebec|QC)\b(?=\s*(?:[A-Z]\d[A-Z]|,|$))/gi, '')
    .replace(/\s*,\s*$/, '')
    .trim();
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function personalize(text: string, firstName?: string): string {
  // Sans prénom, « Bonjour {{firstName}}, » devient « Bonjour, » (l'espace part avec le gabarit).
  return text.replace(/ ?\{\{\s*firstName\s*\}\}/g, firstName ? ` ${firstName}` : '');
}

// Paragraphes : les retours à la ligne du composeur deviennent des <br />.
function nl2br(s: string): string {
  return s.replace(/\r?\n/g, '<br />');
}

// Texte riche léger : le paragraphe transporte au plus <b>, <i>, <u> et
// <a href="https://…">. Tout est échappé d'abord, puis ces seules balises
// sont rendues. Miroir de richToHtml dans src/lib/newsletterRenderer.tsx.
// Une phrase agrandie ou manuscrite (miroir de src/lib/newsletterRenderer.tsx).
const STYLES_PHRASE: Record<string, string> = {
  grand: 'font-size:1.35em;line-height:1.35',
  tgrand: 'font-size:1.75em;line-height:1.25',
  manu: `font-family:${"'Kalam', 'Bradley Hand', 'Segoe Print', 'Comic Neue', cursive"};font-size:1.3em;line-height:1.5;font-weight:400;color:#2b1f14`,
};
function richToHtml(text: string, accent: string = CHARTE.goldInk): string {
  return esc(text)
    .replace(/&lt;(grand|tgrand|manu)&gt;/g, (_m, k: string) => `<span style="${STYLES_PHRASE[k]}">`)
    .replace(/&lt;\/(grand|tgrand|manu)&gt;/g, '</span>')
    .replace(/&lt;(\/?)(b|i|u)&gt;/g, '<$1$2>')
    .replace(/&lt;a href=&quot;((?:https?:\/\/|mailto:)(?:[^&]|&amp;)*?)&quot;&gt;/g, `<a href="$1" target="_blank" style="color:${accent};text-decoration:underline;">`)
    .replace(/&lt;\/a&gt;/g, '</a>');
}
function stripRich(text: string): string {
  return String(text ?? '').replace(/<\/?(b|i|u|grand|tgrand|manu)>/g, '').replace(/<a href="[^"]*">/g, '').replace(/<\/a>/g, '');
}

const DOSHAS_CARNET = ['vata', 'pitta', 'kapha'];

// Un bloc peut n'apparaître qu'entre deux dates (Krystine, 2 oct. 2026 :
// « la saison Vata est en cours » ne doit plus se lire en janvier).
// Vaut pour le HTML et pour la version texte du même courriel.
function horsFenetre(c: any): boolean {
  const now = Date.now(); const des = Date.parse(String(c?.des || '')); const jusqua = Date.parse(String(c?.jusqua || ''));
  return (!isNaN(des) && now < des) || (!isNaN(jusqua) && now > jusqua);
}

function blockToEmail(block: NewsletterBlock, firstName?: string, pal: Palette = PALETTE_CLAIRE, k = 1): string {
  const c = (block.content || {}) as any;
  const t = (px: number) => Math.round(px * k);
  const tTitre = (px: number) => Math.round(px * (1 + (k - 1) / 2));
  if (horsFenetre(c)) return '';
  switch (block.type) {
    case 'heading': {
      const level = Number(c.level) || 1;
      const align = c.align === 'center' ? 'center' : 'left';
      const fontSize = `${tTitre(level === 1 ? 32 : level === 2 ? 26 : 22)}px`;
      const text = personalize(esc(c.text || ''), firstName);
      const police = POLICES[c.police] || CHARTE.serif;
      return `<tr><td align="${align}" style="padding:18px 0 10px;font-family:${police};font-size:${fontSize};line-height:1.15;color:${pal.ink};font-weight:500;">${text}</td></tr>`;
    }
    case 'paragraph': {
      const align = c.align === 'center' ? 'center' : 'left';
      const text = nl2br(personalize(richToHtml(c.text || '', pal.accent), firstName));
      const police = POLICES[c.police] || CHARTE.sans;
      const px = t(TAILLES[c.taille] || 16);
      if (c.police === 'ella') {
        const papier = `${PUBLIC_BASE_URL}/infolettre/papier-ella.jpg`;
        return `<tr><td style="padding:4px 0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td align="${align}" bgcolor="#f3ead9" background="${papier}" style="background:#f3ead9 url('${papier}') center / cover;border:1px solid #d8c6a3;box-shadow:0 10px 24px -14px rgba(60,40,20,0.45);padding:28px 30px 24px;font-family:${police};font-size:${t(Math.round((TAILLES[c.taille] || 16) * 1.2))}px;line-height:1.65;color:#2b1f14;">${text}</td>
        </tr></table></td></tr>`;
      }
      return `<tr><td align="${align}" style="padding:0 0 18px;font-family:${police};font-size:${px}px;line-height:1.75;color:${pal.ink};">${text}</td></tr>`;
    }
    case 'image': {
      // Un fond de couleur de la palette derrière l'image (Krystine, 27 sept.
      // 2026) : l'image se pose dans une carte arrondie de cette couleur, et la
      // légende passe à l'or sur un fond sombre.
      const fondImg = couleur(c.fondImage, '');
      const palImg = fondImg ? palette(fondImg) : pal;
      const enCarte = (rangs: string) => fondImg
        ? `<tr><td style="padding:10px 0 14px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${fondImg}" style="background:${fondImg};border-radius:15px;"><tr><td style="padding:22px 20px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rangs}</table></td></tr></table></td></tr>`
        : rangs;
      const caption = c.caption
        ? `<tr><td align="center" style="padding:8px 0 4px;font-family:${CHARTE.sans};font-size:${t(10)}px;letter-spacing:0.28em;text-transform:uppercase;color:${palImg.accent};">${esc(c.caption)}</td></tr>`
        : '';
      // Chaque photo mène quelque part : au lien choisi, sinon au site.
      const lien = typeof c.href === 'string' && /^https?:\/\//.test(c.href) ? c.href : PUBLIC_BASE_URL;
      const fmt = formatImage(c.largeur);
      if (fmt === 'kaleidoscope') {
        const imgs = imagesKaleidoscope(c);
        if (!imgs.length) return '';
        const cell = (u: string, gauche: boolean) => `<td width="50%" valign="top" style="width:50%;padding:0 ${gauche ? 6 : 0}px 12px ${gauche ? 0 : 6}px;"><a href="${esc(lien)}" target="_blank" style="display:block;text-decoration:none;"><img src="${esc(recadre(u, 500, 500))}" alt="${esc(c.alt || '')}" width="254" style="display:block;width:100%;max-width:254px;height:auto;border-radius:12px;border:0;" /></a></td>`;
        let rangs = '';
        for (let i = 0; i < imgs.length; i += 2) rangs += `<tr>${cell(imgs[i], true)}${imgs[i + 1] ? cell(imgs[i + 1], false) : '<td width="50%" style="width:50%;"></td>'}</tr>`;
        return enCarte(`<tr><td align="center" style="padding:10px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">${rangs}</table></td></tr>${caption}`);
      }
      if (!c.url) return '';
      const px = FORMATS_IMAGE[fmt].px;
      const src = fmt === 'banniere' ? recadre(c.url, 1040, 347) : c.url;
      return enCarte(`<tr><td align="center" style="padding:10px 0 12px;"><a href="${esc(lien)}" target="_blank" style="display:block;text-decoration:none;max-width:${px}px;margin:0 auto;"><img src="${esc(src)}" alt="${esc(c.alt || '')}" width="${px}" style="display:block;width:100%;max-width:${px}px;height:auto;border-radius:15px;border:0;margin:0 auto;" /></a></td></tr>${caption}`);
    }
    case 'button': {
      const primary = c.variant !== 'secondary';
      const style = primary
        ? `background:${CHARTE.gold};color:${CHARTE.night};`
        : `border:1px solid ${CHARTE.gold};color:${pal.accent};`;
      // Centré, comme dans l'aperçu de l'admin (Krystine, 4 oct. 2026).
      const aligne = c.align === 'left' ? 'left' : 'center';
      return `<tr><td align="${aligne}" style="padding:6px 0 22px;text-align:${aligne};">
        <a href="${esc(c.href || '#')}" target="_blank" style="display:inline-block;padding:15px 28px;border-radius:999px;font-family:${CHARTE.sans};font-size:${t(12)}px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;${style}">${esc(c.label || 'En savoir plus')}</a>
      </td></tr>`;
    }
    case 'divider': {
      const st = c.style || 'ligne';
      if (st === 'pleine') return `<tr><td style="padding:10px 0 24px;"><div style="height:1px;background:linear-gradient(90deg,transparent,${CHARTE.gold},transparent);"></div></td></tr>`;
      const g = SEPARATEURS[st];
      if (!g) return `<tr><td style="padding:10px 0 24px;"><div style="height:1px;width:64px;background:${CHARTE.gold};"></div></td></tr>`;
      return `<tr><td style="padding:10px 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td valign="middle"><div style="height:1px;background:linear-gradient(90deg,transparent,${CHARTE.gold});"></div></td>
          <td width="120" align="center" valign="middle" style="font-family:${CHARTE.serif};font-size:${t(22)}px;line-height:1;color:${CHARTE.gold};padding:0 12px;white-space:nowrap;">${g}</td>
          <td valign="middle"><div style="height:1px;background:linear-gradient(270deg,transparent,${CHARTE.gold});"></div></td>
        </tr></table>
      </td></tr>`;
    }
    case 'list': {
      const police = POLICES[c.police] || CHARTE.sans;
      const px = t(TAILLES[c.taille] || 16);
      const numero = c.style === 'numero';
      const items = String(c.text || '').split(/\r?\n/).filter((l: string) => l.trim());
      if (!items.length) return '';
      const rows = items.map((l: string, i: number) => `<tr>
          <td width="22" valign="top" style="padding:0 0 8px;font-family:${police};font-size:${px}px;line-height:1.6;color:${pal.accent};">${numero ? `${i + 1}.` : '&bull;'}</td>
          <td valign="top" style="padding:0 0 8px;font-family:${police};font-size:${px}px;line-height:1.6;color:${pal.ink};">${personalize(richToHtml(l, pal.accent), firstName)}</td>
        </tr>`).join('');
      return `<tr><td style="padding:0 0 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>`;
    }
    case 'quote':
      // La citation, carte vert profond resserrée, filet cuivre intérieur et
      // grand guillemet : une pièce encadrée plutôt qu'un aplat (Krystine,
      // 4 oct. 2026 : « un gros carré vert »).
      return `<tr><td style="padding:18px 34px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td bgcolor="#28352F" style="background:#28352F;padding:9px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td align="center" style="border:1px solid rgba(186,123,57,0.6);padding:26px 28px 28px;text-align:center;">
                <div style="font-family:${CHARTE.serif};font-size:58px;line-height:0.9;height:34px;color:#BA7B39;">&ldquo;</div>
                <div style="font-family:${CHARTE.serif};font-size:${t(21)}px;line-height:1.5;color:#EEE7DB;">${personalize(esc(c.text || ''), firstName)}</div>
                <div style="width:38px;height:1px;background:#BA7B39;margin:20px auto 14px;font-size:0;line-height:0;">&nbsp;</div>
                ${c.attribution ? `<div style="font-family:${CHARTE.sans};font-size:${t(10)}px;letter-spacing:0.3em;text-transform:uppercase;color:#d79a5c;">${esc(c.attribution)}</div>` : ''}
              </td>
            </tr></table>
          </td>
        </tr></table>
      </td></tr>`;
    case 'cta':
      return `<tr><td style="padding:6px 0 26px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.night};border-radius:15px;border:1px solid rgba(224,176,96,${pal.sombre ? '0.45' : '0.15'});">
          <tr><td style="padding:30px 32px;">
            ${c.eyebrow ? `<div style="font-family:${CHARTE.sans};font-size:${t(11)}px;letter-spacing:0.3em;text-transform:uppercase;color:${CHARTE.gold};margin-bottom:12px;font-weight:600;">${esc(c.eyebrow)}</div>` : ''}
            ${c.title ? `<div style="font-family:${CHARTE.serif};font-size:${tTitre(28)}px;line-height:1.1;color:${CHARTE.cream};margin-bottom:12px;">${esc(c.title)}</div>` : ''}
            ${c.body ? `<div style="font-family:${CHARTE.sans};font-size:${t(14)}px;line-height:1.7;color:rgba(238,231,219,0.7);margin-bottom:22px;">${nl2br(esc(c.body))}</div>` : ''}
            ${(c.href && c.buttonLabel) ? `<a href="${esc(c.href)}" target="_blank" style="display:inline-block;background:${CHARTE.gold};color:${CHARTE.night};font-family:${CHARTE.sans};font-size:${t(12)}px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:15px 28px;border-radius:999px;">${esc(c.buttonLabel)}</a>` : ''}
          </td></tr>
        </table>
      </td></tr>`;
    case 'spacer': {
      const h = c.size === 'lg' ? 48 : c.size === 'sm' ? 10 : 24;
      return `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;
    }
    case 'choix': {
      // Une grille légère de carrés à cocher (Krystine, 27 sept. 2026). Un
      // courriel ne peut pas porter de vraie case ni de bouton « Soumettre » :
      // chaque carré mène à /mes-choix, déjà coché, où la lectrice complète et
      // envoie. {{s}} devient l'identifiant de sa fiche à l'envoi (send.ts), et
      // le paramètre interet/preference pose l'étiquette dès le clic (clic.ts).
      const groupe = c.groupe === 'preference' ? 'preference' : 'interet';
      const options = (Array.isArray(c.options) ? c.options : []).filter((o: any) => o && o.cle && o.libelle);
      if (!options.length) return '';
      const fondCarre = pal.sombre ? 'rgba(238,231,219,0.06)' : '#f7f2ea';
      const bord = pal.sombre ? 'rgba(224,176,96,0.45)' : 'rgba(156,122,68,0.45)';
      const carre = (o: any) => {
        const lien = `${PUBLIC_BASE_URL}/mes-choix?s={{s}}&coche=${groupe}:${encodeURIComponent(o.cle)}&${groupe}=${encodeURIComponent(o.cle)}`;
        return `<td width="50%" valign="top" style="width:50%;padding:6px;"><a href="${esc(lien)}" target="_blank" style="display:block;text-decoration:none;background:${fondCarre};border:1px solid ${bord};border-radius:12px;padding:14px 16px;">
          <span style="display:inline-block;width:13px;height:13px;border:1.5px solid ${pal.accent};border-radius:3px;vertical-align:-2px;margin-right:8px;"></span><span style="font-family:${CHARTE.sans};font-size:${t(11)}px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:${pal.accent};">${esc(o.libelle)}</span>
          ${o.phrase ? `<div style="padding-top:8px;font-family:${CHARTE.serif};font-size:${t(16)}px;line-height:1.4;color:${pal.ink};">${esc(o.phrase)}</div>` : ''}
        </a></td>`;
      };
      let rangs = '';
      for (let i = 0; i < options.length; i += 2) rangs += `<tr>${carre(options[i])}${options[i + 1] ? carre(options[i + 1]) : '<td width="50%" style="width:50%;"></td>'}</tr>`;
      const question = c.question ? `<tr><td align="center" style="padding:18px 0 8px;font-family:${CHARTE.serif};font-size:${tTitre(24)}px;line-height:1.2;color:${pal.ink};">${esc(c.question)}</td></tr>` : '';
      return `${question}<tr><td style="padding:0 0 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -6px;">${rangs}</table></td></tr>`;
    }
    case 'carnet': {
      // Le carnet d'Ella (Krystine, 2 oct. 2026) : la bannière du dosha, puis
      // ses paragraphes centrés en italique (choix de Krystine, écriture de carnet)
      // dans une boîte de papier, séparés d'un losange.
      const dosha = DOSHAS_CARNET.includes(c.dosha) ? c.dosha : 'vata';
      const lignes = (Array.isArray(c.lignes) ? c.lignes : []).map((l: unknown) => String(l ?? '').trim()).filter(Boolean);
      if (!lignes.length) return '';
      const serif = "Georgia, 'Times New Roman', serif";
      const losange = `<tr><td align="center" style="padding:14px 0;font-family:${serif};font-size:${t(11)}px;line-height:1;color:#b89a62;">&#9670;</td></tr>`;
      const paras = lignes.map((l: string) => `<tr><td align="center" style="font-family:${serif};font-size:${t(17)}px;line-height:1.65;font-style:italic;color:#2b241c;">${esc(l)}</td></tr>`).join(losange);
      return `<tr><td style="padding:10px 0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 0 10px;"><img src="${PUBLIC_BASE_URL}/infolettre/carnet-ella-${dosha}.jpg" alt="Le carnet d’Ella" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;" /></td></tr>
        <tr><td bgcolor="#f3ead9" style="background:#f3ead9;border:1px solid #b89a62;padding:28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${paras}</table></td></tr>
      </table></td></tr>`;
    }
    case 'univers': {
      // Découvrir l'univers de Krystine (2 oct. 2026) : ses livres, son podcast
      // et son site au bas des lettres; la bio scellée (jamais paraphrasée)
      // seulement quand bio est vrai, une fois dans une séquence.
      const BIO = 'Près de 40 ans d’expérience, soins intensifs, recherche clinique, les coulisses du système, avant de choisir l’herboristerie, l’Ayurveda et l’aromathérapie. Auteure de trois livres aux Éditions de l’Homme. Créatrice de Santé la vie et du podcast Au-delà des tendances.';
      const lien = (href: string, mot: string) => `<a href="${href}" target="_blank" style="color:#7d6330;text-decoration:underline;">${mot}</a>`;
      const liens = [lien(`${PUBLIC_BASE_URL}/medias`, 'Ses livres'), lien(`${PUBLIC_BASE_URL}/podcast`, 'Le podcast Au-delà des tendances'), lien(PUBLIC_BASE_URL, 'krystinestlaurent.ca')].join(' &middot; ');
      const bio = c.bio ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="96" valign="top" style="width:96px;padding:0 18px 0 0;"><img src="${PUBLIC_BASE_URL}/infolettre/krystine-univers.jpg" width="96" alt="Krystine St-Laurent" style="display:block;width:96px;height:96px;border-radius:48px;border:0;" /></td>
            <td valign="top" style="font-family:${CHARTE.sans};font-size:${t(14)}px;line-height:1.65;color:#3a2f24;"><div style="font-family:${CHARTE.serif};font-size:${t(20)}px;color:#2b241c;padding:0 0 6px;">Krystine St-Laurent</div>${esc(BIO)}</td>
          </tr></table>` : '';
      return `<tr><td style="padding:10px 0 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #d8c9ad;">
        <tr><td style="padding:22px 0 0;">
          <div style="font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;font-weight:600;color:#7d6330;padding:0 0 14px;">Découvrir l’univers de Krystine</div>
          ${bio}
          <div style="font-family:${CHARTE.sans};font-size:${t(14)}px;line-height:1.7;color:#3a2f24;padding:${c.bio ? '14px' : '0'} 0 0;">${liens}</div>
        </td></tr>
      </table></td></tr>`;
    }
    case 'note': {
      // La note d'Ayurveda (Krystine, 2 oct. 2026) : la carte vert profond du
      // site, texte ivoire et mots clés cuivre. Une ligne par mot clé; ce qui
      // précède « : » s'écrit en gras (le mot), le reste est sa définition.
      const titre = String(c.titre ?? '').trim() || 'Quelques clés de l’Ayurveda';
      const lignes = String(c.texte ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lignes.length) return '';
      const vert = '#28352F';
      const ligne = (l: string) => {
        const k = l.indexOf(' : ');
        const corps = k > 0 ? `<strong style="font-weight:600;color:#d79a5c;">${esc(l.slice(0, k))}</strong> : ${esc(l.slice(k + 3))}` : esc(l);
        return `<div style="padding:0 0 10px;">${corps}</div>`;
      };
      return `<tr><td style="padding:14px 0 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td bgcolor="${vert}" style="background:${vert};padding:30px 30px 20px;">
          <div style="font-family:${CHARTE.serif};font-size:${t(26)}px;line-height:1.2;color:#EEE7DB;text-align:center;">${esc(titre)}</div>
          <div style="font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#BA7B39;text-align:center;padding:8px 0 20px;">La science de la vie</div>
          <div style="font-family:${CHARTE.sans};font-size:${t(15)}px;line-height:1.7;color:#EEE7DB;">${lignes.map(ligne).join('')}</div>
        </td></tr>
      </table></td></tr>`;
    }
    default:
      return '';
  }
}

// L'en-tête « titre » reprend l'image « La Lettre de Krystine » : le nom de la
// lettre en serif, son dernier mot en écriture (Pinyon Script), la devise
// dessous et le foyer à droite. Le texte se change dans le composeur.
const ENTETE_FOYER_URL = `${PUBLIC_BASE_URL}/infolettre/entete-foyer.jpg`;
const ENTETE_FOND = '#f8f6f2';
function enteteTitreHtml(e: EnteteTitre | null | undefined, lang: Lang): string {
  const titre = (e?.titre || '').trim() || (lang === 'en' ? "Krystine's Letter" : 'La Lettre de Krystine');
  const sousTitre = typeof e?.sousTitre === 'string' ? e.sousTitre.trim() : (lang === 'en' ? '' : 'Relier ce que nous avons appris à séparer.');
  const image = e?.image && /^https?:\/\//.test(e.image) && !e.image.endsWith('/entete-foyer.jpg') ? e.image : '';
  const m = /^(.*[\s'’])([^\s'’]+)$/.exec(titre);
  // « Krystine » s'écrit avec sa vraie signature, celle du site; tout autre dernier mot, à la main (Pinyon Script).
  const titreHtml = m && /^krystine$/i.test(m[2])
    ? `${esc(m[1])}<img src="${SIGNATURE_URL}" width="172" alt="Krystine St-Laurent" style="display:inline-block;width:172px;height:auto;border:0;vertical-align:middle;margin:-10px 0 -14px 6px;" />`
    : m
    ? `${esc(m[1])}<span style="font-family:${POLICES.script};font-size:50px;line-height:1;font-weight:400;">${esc(m[2])}</span>`
    : esc(titre);
  return `<tr><td bgcolor="${ENTETE_FOND}" style="background:${ENTETE_FOND};padding:0;border-radius:15px 15px 0 0;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle" style="padding:34px 12px 30px 40px;">
              <div style="font-family:${CHARTE.serif};font-size:38px;line-height:1.1;color:#292b20;font-weight:400;">${titreHtml}</div>
              ${sousTitre ? `<div style="padding-top:12px;font-family:${CHARTE.serif};font-size:17px;line-height:1.4;color:#5f5c50;">${esc(sousTitre)}</div>` : ''}
            </td>
            ${image
              ? `<td width="186" valign="middle" style="padding:22px 26px 22px 0;width:186px;"><a href="${PUBLIC_BASE_URL}" target="_blank" style="display:block;text-decoration:none;"><img src="${esc(image)}" width="160" alt="" style="display:block;width:160px;height:auto;border:0;border-radius:12px;" /></a></td>`
              : `<td width="170" valign="bottom" style="padding:0;width:170px;"><a href="${PUBLIC_BASE_URL}" target="_blank" style="display:block;text-decoration:none;"><img src="${ENTETE_FOYER_URL}" width="170" alt="" style="display:block;width:170px;height:auto;border:0;border-radius:0 15px 0 0;" /></a></td>`}
          </tr></table>
        </td></tr>`;
}

// La marque d'infolettre posée sur les liens de krystinestlaurent.ca. Elle
// épargne le désabonnement, la politique de confidentialité, les liens déjà
// marqués et tout lien externe. `html` : la marque s'écrit avec &amp;.
const LIEN_DU_SITE = /^https?:\/\/(?:www\.)?krystinestlaurent\.ca(?:[/?#]|$)/i;
export function marquerLien(url: string, campagne: string | undefined, html: boolean): string {
  if (!campagne || !LIEN_DU_SITE.test(url)) return url;
  if (/desinscription|unsubscribe|politique-de-confidentialite|utm_source=/i.test(url)) return url;
  const [avant, ancre] = url.split(/(?=#)/);
  const et = html ? '&amp;' : '&';
  const marque = `utm_source=infolettre${et}utm_medium=courriel${et}utm_campaign=${encodeURIComponent(campagne)}`;
  return `${avant}${avant.includes('?') ? et : '?'}${marque}${ancre || ''}`;
}
function marquerHtml(html: string, campagne?: string): string {
  return campagne ? html.replace(/href="(https?:\/\/[^"]+)"/g, (tout, u: string) => { const m = marquerLien(u, campagne, true); return m === u ? tout : `href="${m}"`; }) : html;
}
function marquerTexte(texte: string, campagne?: string): string {
  return campagne ? texte.replace(/https?:\/\/[^\s<>"]+/g, (u: string) => {
    const fin = (u.match(/[.,;:)\]]+$/) || [''])[0];
    return marquerLien(u.slice(0, u.length - fin.length), campagne, false) + fin;
  }) : texte;
}

export function renderEmailHtml(blocks: NewsletterBlock[], opts: RenderEmailOptions): string {
  return marquerHtml(rendreHtml(blocks, opts), opts.campagne);
}
function rendreHtml(blocks: NewsletterBlock[], opts: RenderEmailOptions): string {
  const pal = palette(opts.fond);
  const k = facteurLecture(opts.tailleLecture);
  const blockRows = blocks.map(b => blockToEmail(b, opts.firstName, pal, k)).join('\n');
  const couverture: Couverture = opts.couverture === 'image' && !opts.couvertureUrl ? 'aucune' : (opts.couverture || 'aucune');
  const showCover = couverture !== 'aucune' && couverture !== 'titre';
  const coverSrc = couverture === 'podcast' ? 'cid:cover' : esc(opts.couvertureUrl);
  const lang: Lang = opts.lang === 'en' ? 'en' : 'fr';
  const mots = MOTS[lang];
  const coverAlt = couverture === 'podcast' ? mots.coverAlt : esc(opts.subject);
  const bandeau = opts.bandeau || {};
  const fond = couleur(bandeau.fond, CHARTE.night);
  const texte = couleur(bandeau.texte, CHARTE.cream);
  const etiquette = (bandeau.etiquette ?? '').trim() || mots.etiquette;
  const showBandeau = !bandeau.masque;
  const image = typeof bandeau.image === 'string' && /^https?:\/\//.test(bandeau.image) ? bandeau.image : '';
  const fondBandeau = image ? `${fond} url('${esc(image)}') center / cover no-repeat` : fond;

  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(opts.subject)}</title><link href="https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Ms+Madi&family=Kalam:wght@400&display=swap" rel="stylesheet" /></head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;color:transparent;line-height:1px;">${esc(opts.preheader || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

        ${couverture === 'titre' ? enteteTitreHtml(opts.entete, lang) : ''}

        ${showCover ? `<tr><td style="padding:0;border-radius:15px 15px 0 0;overflow:hidden;background:${fond};">
          <a href="${PUBLIC_BASE_URL}" target="_blank" style="display:block;text-decoration:none;"><img src="${coverSrc}" width="600" alt="${coverAlt}" style="display:block;width:100%;max-width:600px;height:auto;border-radius:15px 15px 0 0;border:0;" /></a>
        </td></tr>` : ''}

        ${showBandeau ? `<tr><td background="${image}" bgcolor="${fond}" style="background:${fondBandeau};padding:0;${showCover || couverture === 'titre' ? '' : 'border-radius:15px 15px 0 0;'}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"${image ? ` style="background:rgba(20,19,17,0.55);"` : ''}>
            <tr><td style="padding:30px 40px 0;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${CHARTE.gold};font-weight:600;">${esc(etiquette)}</td></tr>
            <tr><td style="padding:18px 40px 20px;font-family:${CHARTE.serif};font-size:${opts.tailleTitreBandeau ?? 34}px;line-height:1.08;color:${texte};font-weight:500;">${opts.titreBandeau ? esc(opts.titreBandeau).replace(/\n/g, '<br />') : esc(opts.subject)}</td></tr>
            <tr><td style="padding:0 40px 28px;"><div style="height:1px;width:64px;background:${CHARTE.gold};"></div></td></tr>
          </table>
        </td></tr>` : ''}

        <tr><td bgcolor="${pal.fond}" style="background:${pal.fond};padding:40px 40px 14px;${showCover || showBandeau ? '' : 'border-radius:15px 15px 0 0;border-top:1px solid rgba(41,48,39,0.08);'}border-left:1px solid rgba(41,48,39,0.08);border-right:1px solid rgba(41,48,39,0.08);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${blockRows}
            ${opts.signature !== false ? `<tr><td style="padding:6px 0 8px;"><a href="${PUBLIC_BASE_URL}" target="_blank" style="display:inline-block;text-decoration:none;"><img src="cid:signature" width="170" alt="Krystine St-Laurent" style="display:block;width:170px;height:auto;border:0;${pal.sombre ? `background:${CHARTE.cream};border-radius:12px;padding:8px 12px;` : ''}" /></a></td></tr>` : ''}
          </table>
        </td></tr>

        <tr><td bgcolor="${fond}" style="background:${fond};padding:30px 40px 12px;border-radius:0 0 15px 15px;font-family:${CHARTE.sans};font-size:11px;line-height:1.6;color:${texte};opacity:1;">
          <div style="font-family:${CHARTE.serif};font-size:20px;line-height:1.35;color:${texte};padding-bottom:10px;">${mots.relier}</div>
          <div style="font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#d9b77a;padding-bottom:14px;">${mots.devise}</div>
          <div style="margin-bottom:8px;opacity:0.7;">${esc(adressePied(opts.postalAddress))}</div>
          <div style="padding-bottom:18px;"><a href="${esc(opts.unsubscribeUrl)}" style="color:#d9b77a;text-decoration:underline;">${mots.desabonner}</a> · <a href="${PUBLIC_BASE_URL}/politique-de-confidentialite" style="color:#d9b77a;text-decoration:underline;">${mots.politique}</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
${opts.pixelUrl ? `  <img src="${opts.pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />` : ''}
</body>
</html>`;
}

export function renderEmailText(blocks: NewsletterBlock[], opts: RenderEmailOptions): string {
  return marquerTexte(rendreTexte(blocks, opts), opts.campagne);
}
function rendreTexte(blocks: NewsletterBlock[], opts: RenderEmailOptions): string {
  const lines: string[] = [];
  for (const b of blocks) {
    const c = (b.content || {}) as any;
    if (horsFenetre(c)) continue;
    switch (b.type) {
      case 'heading':
      case 'paragraph':
      case 'quote':
        if (c.text) lines.push(personalize(stripRich(c.text), opts.firstName));
        break;
      case 'button':
        if (c.label && c.href) lines.push(`${c.label} : ${c.href}`);
        break;
      case 'cta':
        if (c.title) lines.push(c.title);
        if (c.body) lines.push(c.body);
        if (c.href && c.buttonLabel) lines.push(`${c.buttonLabel} : ${c.href}`);
        break;
      case 'divider':
        lines.push('---');
        break;
      case 'choix':
        if (c.question) lines.push(String(c.question));
        lines.push((Array.isArray(c.options) ? c.options : []).map((o: any) => `- ${o.libelle} : ${o.phrase || ''}`).join('\n'));
        break;
      case 'univers':
        lines.push('Découvrir l’univers de Krystine', `${PUBLIC_BASE_URL}/medias · ${PUBLIC_BASE_URL}/podcast · ${PUBLIC_BASE_URL}`);
        break;
      case 'note':
        lines.push(`${String(c.titre || 'Un mot d’Ayurveda')}\n${String(c.texte || '')}`);
        break;
      case 'carnet':
        lines.push((Array.isArray(c.lignes) ? c.lignes : []).map((l: unknown) => String(l ?? '').trim()).filter(Boolean).join('\n\n◆\n\n'));
        break;
      case 'list':
        lines.push(String(c.text || '').split(/\r?\n/).filter((l: string) => l.trim()).map((l: string, i: number) => `${c.style === 'numero' ? `${i + 1}.` : '-'} ${stripRich(l)}`).join('\n'));
        break;
    }
  }
  if (opts.signature !== false) lines.push('Krystine St-Laurent');
  lines.push('', adressePied(opts.postalAddress), `${MOTS[opts.lang === 'en' ? 'en' : 'fr'].desabonner} : ${opts.unsubscribeUrl}`);
  return lines.join('\n\n');
}
