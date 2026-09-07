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
const SIGNATURE_URL = 'https://storage.googleapis.com/inspirata/Vata/1%20(1).png';
const PORTRAIT_URL = `${PUBLIC_BASE_URL}/podcast/krystine.jpg`;

export type Couverture = 'podcast' | 'image' | 'aucune';
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
  script: "'Snell Roundhand', 'Brush Script MT', 'Segoe Script', cursive",
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
      if (!c.url) return '';
      const caption = c.caption
        ? `<tr><td align="center" style="padding:8px 0 4px;font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${pal.accent};">${esc(c.caption)}</td></tr>`
        : '';
      // Chaque photo mène quelque part : au lien choisi, sinon au site.
      const lien = typeof c.href === 'string' && /^https?:\/\//.test(c.href) ? c.href : PUBLIC_BASE_URL;
      return `<tr><td style="padding:10px 0 12px;"><a href="${esc(lien)}" target="_blank" style="display:block;text-decoration:none;"><img src="${esc(c.url)}" alt="${esc(c.alt || '')}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:15px;border:0;" /></a></td></tr>${caption}`;
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

export function renderEmailHtml(blocks: NewsletterBlock[], opts: RenderEmailOptions): string {
  const pal = palette(opts.fond);
  const blockRows = blocks.map(b => blockToEmail(b, opts.firstName, pal)).join('\n');
  const couverture: Couverture = opts.couverture === 'image' && !opts.couvertureUrl ? 'aucune' : (opts.couverture || 'aucune');
  const showCover = couverture !== 'aucune';
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
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;color:transparent;line-height:1px;">${esc(opts.preheader || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

        ${showCover ? `<tr><td style="padding:0;border-radius:15px 15px 0 0;overflow:hidden;background:${fond};">
          <a href="${PUBLIC_BASE_URL}" target="_blank" style="display:block;text-decoration:none;"><img src="${coverSrc}" width="600" alt="${coverAlt}" style="display:block;width:100%;max-width:600px;height:auto;border-radius:15px 15px 0 0;border:0;" /></a>
        </td></tr>` : ''}

        ${showBandeau ? `<tr><td background="${image}" bgcolor="${fond}" style="background:${fondBandeau};padding:0;${showCover ? '' : 'border-radius:15px 15px 0 0;'}">
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
