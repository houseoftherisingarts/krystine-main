// Rendu HTML des infolettres composées dans l'admin (blocs). Aucune
// dépendance React : ce fichier tourne dans une Cloud Function.
//
// Le gabarit reprend celui des courriels du direct (live.ts) : couverture
// noir + or « Au-delà des tendances » en pièce inline, bandeau noir chaud
// avec le sujet, corps blanc pour les blocs, signature de Krystine, pied
// ivoire. Les couleurs viennent du visuel officiel Saison 2 (27 août 2026).

import { PUBLIC_BASE_URL } from './mail';

export type BlockType = 'heading' | 'paragraph' | 'image' | 'button' | 'divider' | 'quote' | 'cta' | 'spacer' | 'list';

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
const MOTS: Record<Lang, { etiquette: string; desabonner: string; politique: string; devise: string; coverAlt: string }> = {
  fr: { etiquette: 'Infolettre', desabonner: 'Se désabonner', politique: 'Politique de confidentialité', devise: 'Nourrir et soigner &middot; Corps et conscience &middot; Science et sagesses', coverAlt: 'Au-delà des tendances, avec Krystine St-Laurent' },
  en: { etiquette: 'Newsletter', desabonner: 'Unsubscribe', politique: 'Privacy policy', devise: 'Nourish and heal &middot; Body and consciousness &middot; Science and wisdom', coverAlt: 'Beyond the Trends, with Krystine St-Laurent' },
};

// Polices et tailles offertes dans le composeur (mêmes clés que src/lib/newsletterRenderer.tsx).
const POLICES: Record<string, string> = {
  serif: "'Cormorant Garamond', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  script: "'Pinyon Script', 'Snell Roundhand', 'Brush Script MT', 'Segoe Script', cursive",
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
  subject: string;
  preheader?: string;
  unsubscribeUrl: string;
  postalAddress: string;
  firstName?: string;
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
function richToHtml(text: string, accent: string = CHARTE.goldInk): string {
  return esc(text)
    .replace(/&lt;(\/?)(b|i|u)&gt;/g, '<$1$2>')
    .replace(/&lt;a href=&quot;(https?:\/\/[^&]*?)&quot;&gt;/g, `<a href="$1" target="_blank" style="color:${accent};text-decoration:underline;">`)
    .replace(/&lt;\/a&gt;/g, '</a>');
}
function stripRich(text: string): string {
  return String(text ?? '').replace(/<\/?(b|i|u)>/g, '').replace(/<a href="[^"]*">/g, '').replace(/<\/a>/g, '');
}

function blockToEmail(block: NewsletterBlock, firstName?: string, pal: Palette = PALETTE_CLAIRE): string {
  const c = (block.content || {}) as any;
  switch (block.type) {
    case 'heading': {
      const level = Number(c.level) || 1;
      const align = c.align === 'center' ? 'center' : 'left';
      const fontSize = level === 1 ? '32px' : level === 2 ? '26px' : '22px';
      const text = personalize(esc(c.text || ''), firstName);
      const police = POLICES[c.police] || CHARTE.serif;
      return `<tr><td align="${align}" style="padding:18px 0 10px;font-family:${police};font-size:${fontSize};line-height:1.15;color:${pal.ink};font-weight:500;">${text}</td></tr>`;
    }
    case 'paragraph': {
      const align = c.align === 'center' ? 'center' : 'left';
      const text = nl2br(personalize(richToHtml(c.text || '', pal.accent), firstName));
      const police = POLICES[c.police] || CHARTE.sans;
      const px = TAILLES[c.taille] || 16;
      return `<tr><td align="${align}" style="padding:0 0 18px;font-family:${police};font-size:${px}px;line-height:1.75;color:${pal.ink};">${text}</td></tr>`;
    }
    case 'image': {
      const caption = c.caption
        ? `<tr><td align="center" style="padding:8px 0 4px;font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${pal.accent};">${esc(c.caption)}</td></tr>`
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
        return `<tr><td align="center" style="padding:10px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">${rangs}</table></td></tr>${caption}`;
      }
      if (!c.url) return '';
      const px = FORMATS_IMAGE[fmt].px;
      const src = fmt === 'banniere' ? recadre(c.url, 1040, 347) : c.url;
      return `<tr><td align="center" style="padding:10px 0 12px;"><a href="${esc(lien)}" target="_blank" style="display:block;text-decoration:none;max-width:${px}px;margin:0 auto;"><img src="${esc(src)}" alt="${esc(c.alt || '')}" width="${px}" style="display:block;width:100%;max-width:${px}px;height:auto;border-radius:15px;border:0;margin:0 auto;" /></a></td></tr>${caption}`;
    }
    case 'button': {
      const primary = c.variant !== 'secondary';
      const style = primary
        ? `background:${CHARTE.gold};color:${CHARTE.night};`
        : `border:1px solid ${CHARTE.gold};color:${pal.accent};`;
      return `<tr><td style="padding:6px 0 22px;">
        <a href="${esc(c.href || '#')}" target="_blank" style="display:inline-block;padding:15px 28px;border-radius:999px;font-family:${CHARTE.sans};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;${style}">${esc(c.label || 'En savoir plus')}</a>
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
          <td width="120" align="center" valign="middle" style="font-family:${CHARTE.serif};font-size:22px;line-height:1;color:${CHARTE.gold};padding:0 12px;white-space:nowrap;">${g}</td>
          <td valign="middle"><div style="height:1px;background:linear-gradient(270deg,transparent,${CHARTE.gold});"></div></td>
        </tr></table>
      </td></tr>`;
    }
    case 'list': {
      const police = POLICES[c.police] || CHARTE.sans;
      const px = TAILLES[c.taille] || 16;
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
      return `<tr><td style="padding:6px 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="border-left:2px solid ${CHARTE.gold};padding-left:18px;font-family:${CHARTE.serif};font-size:20px;line-height:1.45;color:${pal.accent};">
            «&nbsp;${personalize(esc(c.text || ''), firstName)}&nbsp;»
            ${c.attribution ? `<div style="margin-top:10px;font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${pal.accent};">${esc(c.attribution)}</div>` : ''}
          </td>
        </tr></table>
      </td></tr>`;
    case 'cta':
      return `<tr><td style="padding:6px 0 26px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.night};border-radius:15px;border:1px solid rgba(224,176,96,${pal.sombre ? '0.45' : '0.15'});">
          <tr><td style="padding:30px 32px;">
            ${c.eyebrow ? `<div style="font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${CHARTE.gold};margin-bottom:12px;font-weight:600;">${esc(c.eyebrow)}</div>` : ''}
            ${c.title ? `<div style="font-family:${CHARTE.serif};font-size:28px;line-height:1.1;color:${CHARTE.cream};margin-bottom:12px;">${esc(c.title)}</div>` : ''}
            ${c.body ? `<div style="font-family:${CHARTE.sans};font-size:14px;line-height:1.7;color:rgba(238,231,219,0.7);margin-bottom:22px;">${nl2br(esc(c.body))}</div>` : ''}
            ${(c.href && c.buttonLabel) ? `<a href="${esc(c.href)}" target="_blank" style="display:inline-block;background:${CHARTE.gold};color:${CHARTE.night};font-family:${CHARTE.sans};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:15px 28px;border-radius:999px;">${esc(c.buttonLabel)}</a>` : ''}
          </td></tr>
        </table>
      </td></tr>`;
    case 'spacer': {
      const h = c.size === 'lg' ? 48 : c.size === 'sm' ? 10 : 24;
      return `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;
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

export function renderEmailHtml(blocks: NewsletterBlock[], opts: RenderEmailOptions): string {
  const pal = palette(opts.fond);
  const blockRows = blocks.map(b => blockToEmail(b, opts.firstName, pal)).join('\n');
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
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(opts.subject)}</title><link href="https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap" rel="stylesheet" /></head>
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
            <tr><td style="padding:18px 40px 20px;font-family:${CHARTE.serif};font-size:34px;line-height:1.08;color:${texte};font-weight:500;">${esc(opts.subject)}</td></tr>
            <tr><td style="padding:0 40px 28px;"><div style="height:1px;width:64px;background:${CHARTE.gold};"></div></td></tr>
          </table>
        </td></tr>` : ''}

        <tr><td bgcolor="${pal.fond}" style="background:${pal.fond};padding:40px 40px 14px;${showCover || showBandeau ? '' : 'border-radius:15px 15px 0 0;border-top:1px solid rgba(41,48,39,0.08);'}border-left:1px solid rgba(41,48,39,0.08);border-right:1px solid rgba(41,48,39,0.08);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${blockRows}
            ${opts.signature !== false ? `<tr><td style="padding:6px 0 8px;"><a href="${PUBLIC_BASE_URL}" target="_blank" style="display:inline-block;text-decoration:none;"><img src="cid:signature" width="170" alt="Krystine St-Laurent" style="display:block;width:170px;height:auto;border:0;${pal.sombre ? `background:${CHARTE.cream};border-radius:12px;padding:8px 12px;` : ''}" /></a></td></tr>` : ''}
          </table>
        </td></tr>

        <tr><td style="background:${CHARTE.cream};padding:26px 40px 8px;border-radius:0 0 15px 15px;border:1px solid rgba(41,48,39,0.08);border-top:0;font-family:${CHARTE.sans};font-size:11px;line-height:1.6;color:rgba(41,48,39,0.6);">
          <div style="font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${CHARTE.goldInk};padding-bottom:10px;">${mots.devise}</div>
          <div style="margin-bottom:8px;">${esc(opts.postalAddress)}</div>
          <div style="padding-bottom:18px;"><a href="${esc(opts.unsubscribeUrl)}" style="color:${CHARTE.goldInk};text-decoration:underline;">${mots.desabonner}</a> · <a href="${PUBLIC_BASE_URL}/politique-de-confidentialite" style="color:${CHARTE.goldInk};text-decoration:underline;">${mots.politique}</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
${opts.pixelUrl ? `  <img src="${opts.pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />` : ''}
</body>
</html>`;
}

export function renderEmailText(blocks: NewsletterBlock[], opts: RenderEmailOptions): string {
  const lines: string[] = [];
  for (const b of blocks) {
    const c = (b.content || {}) as any;
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
      case 'list':
        lines.push(String(c.text || '').split(/\r?\n/).filter((l: string) => l.trim()).map((l: string, i: number) => `${c.style === 'numero' ? `${i + 1}.` : '-'} ${stripRich(l)}`).join('\n'));
        break;
    }
  }
  if (opts.signature !== false) lines.push('Krystine St-Laurent');
  lines.push('', opts.postalAddress, `${MOTS[opts.lang === 'en' ? 'en' : 'fr'].desabonner} : ${opts.unsubscribeUrl}`);
  return lines.join('\n\n');
}
