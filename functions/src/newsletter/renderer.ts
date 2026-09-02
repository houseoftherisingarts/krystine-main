// Rendu HTML des infolettres composées dans l'admin (blocs). Aucune
// dépendance React : ce fichier tourne dans une Cloud Function.
//
// Le gabarit reprend celui des courriels du direct (live.ts) : couverture
// noir + or « Au-delà des tendances » en pièce inline, bandeau noir chaud
// avec le sujet, corps blanc pour les blocs, signature de Krystine, pied
// ivoire. Les couleurs viennent du visuel officiel Saison 2 (27 août 2026).

import { PUBLIC_BASE_URL } from './mail';

export type BlockType = 'heading' | 'paragraph' | 'image' | 'button' | 'divider' | 'quote' | 'cta' | 'spacer';

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

// Pièces inline : visibles même quand le client bloque les images distantes.
export function newsletterAttachments() {
  return [
    { filename: 'couverture.jpg', href: COVER_URL, cid: 'cover' },
    { filename: 'signature.png', href: SIGNATURE_URL, cid: 'signature' },
  ];
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
  showCover?: boolean;   // défaut : vrai
  /** Pixel de mesure d'ouverture, posé en toute fin de courriel. */
  pixelUrl?: string;
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function personalize(text: string, firstName?: string): string {
  return text.replace(/\{\{\s*firstName\s*\}\}/g, firstName || '');
}

// Paragraphes : les retours à la ligne du composeur deviennent des <br />.
function nl2br(s: string): string {
  return s.replace(/\r?\n/g, '<br />');
}

function blockToEmail(block: NewsletterBlock, firstName?: string): string {
  const c = (block.content || {}) as any;
  switch (block.type) {
    case 'heading': {
      const level = c.level || 1;
      const align = c.align === 'center' ? 'center' : 'left';
      const fontSize = level === 1 ? '32px' : level === 2 ? '26px' : '22px';
      const text = personalize(esc(c.text || ''), firstName);
      return `<tr><td align="${align}" style="padding:18px 0 10px;font-family:${CHARTE.serif};font-size:${fontSize};line-height:1.15;color:${CHARTE.ink};font-weight:500;">${text}</td></tr>`;
    }
    case 'paragraph': {
      const align = c.align === 'center' ? 'center' : 'left';
      const text = nl2br(personalize(esc(c.text || ''), firstName));
      return `<tr><td align="${align}" style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:16px;line-height:1.75;color:${CHARTE.ink};">${text}</td></tr>`;
    }
    case 'image': {
      if (!c.url) return '';
      const caption = c.caption
        ? `<tr><td align="center" style="padding:8px 0 4px;font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${CHARTE.goldInk};">${esc(c.caption)}</td></tr>`
        : '';
      return `<tr><td style="padding:10px 0 12px;"><img src="${esc(c.url)}" alt="${esc(c.alt || '')}" style="display:block;width:100%;max-width:520px;height:auto;border-radius:15px;" /></td></tr>${caption}`;
    }
    case 'button': {
      const primary = c.variant !== 'secondary';
      const style = primary
        ? `background:${CHARTE.gold};color:${CHARTE.night};`
        : `border:1px solid ${CHARTE.gold};color:${CHARTE.goldInk};`;
      return `<tr><td style="padding:6px 0 22px;">
        <a href="${esc(c.href || '#')}" target="_blank" style="display:inline-block;padding:15px 28px;border-radius:999px;font-family:${CHARTE.sans};font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;${style}">${esc(c.label || 'En savoir plus')}</a>
      </td></tr>`;
    }
    case 'divider':
      return `<tr><td style="padding:10px 0 24px;"><div style="height:1px;width:64px;background:${CHARTE.gold};"></div></td></tr>`;
    case 'quote':
      return `<tr><td style="padding:6px 0 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="border-left:2px solid ${CHARTE.gold};padding-left:18px;font-family:${CHARTE.serif};font-size:20px;line-height:1.45;color:${CHARTE.goldInk};">
            «&nbsp;${personalize(esc(c.text || ''), firstName)}&nbsp;»
            ${c.attribution ? `<div style="margin-top:10px;font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${CHARTE.goldInk};">${esc(c.attribution)}</div>` : ''}
          </td>
        </tr></table>
      </td></tr>`;
    case 'cta':
      return `<tr><td style="padding:6px 0 26px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.night};border-radius:15px;">
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
  const blockRows = blocks.map(b => blockToEmail(b, opts.firstName)).join('\n');
  const showCover = opts.showCover !== false;

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${esc(opts.subject)}</title></head>
<body style="margin:0;padding:0;background:${CHARTE.cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;color:transparent;line-height:1px;">${esc(opts.preheader || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CHARTE.cream};padding:36px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">

        ${showCover ? `<tr><td style="padding:0;border-radius:15px 15px 0 0;overflow:hidden;background:${CHARTE.night};">
          <img src="cid:cover" width="600" alt="Au-delà des tendances, avec Krystine St-Laurent" style="display:block;width:100%;max-width:600px;height:auto;border-radius:15px 15px 0 0;" />
        </td></tr>` : ''}

        <tr><td style="background:${CHARTE.night};padding:30px 40px 28px;${showCover ? '' : 'border-radius:15px 15px 0 0;'}">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 0 18px;font-family:${CHARTE.sans};font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:${CHARTE.gold};font-weight:600;">Infolettre</td></tr>
            <tr><td style="padding:0 0 20px;font-family:${CHARTE.serif};font-size:34px;line-height:1.08;color:${CHARTE.cream};font-weight:500;">${esc(opts.subject)}</td></tr>
            <tr><td><div style="height:1px;width:64px;background:${CHARTE.gold};"></div></td></tr>
          </table>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px 40px 14px;border-left:1px solid rgba(41,48,39,0.08);border-right:1px solid rgba(41,48,39,0.08);">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${blockRows}
            <tr><td style="padding:6px 0 8px;"><img src="cid:signature" width="170" alt="Krystine St-Laurent" style="display:block;width:170px;height:auto;" /></td></tr>
          </table>
        </td></tr>

        <tr><td style="background:${CHARTE.cream};padding:26px 40px 8px;border-radius:0 0 15px 15px;border:1px solid rgba(41,48,39,0.08);border-top:0;font-family:${CHARTE.sans};font-size:11px;line-height:1.6;color:rgba(41,48,39,0.6);">
          <div style="font-family:${CHARTE.sans};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:${CHARTE.goldInk};padding-bottom:10px;">Nourrir et soigner &middot; Corps et conscience &middot; Science et sagesses</div>
          <div style="margin-bottom:8px;">${esc(opts.postalAddress)}</div>
          <div style="padding-bottom:18px;"><a href="${esc(opts.unsubscribeUrl)}" style="color:${CHARTE.goldInk};text-decoration:underline;">Se désabonner</a> · <a href="${PUBLIC_BASE_URL}/politique-de-confidentialite" style="color:${CHARTE.goldInk};text-decoration:underline;">Politique de confidentialité</a></div>
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
        if (c.text) lines.push(personalize(c.text, opts.firstName));
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
    }
  }
  lines.push('Krystine St-Laurent', '', opts.postalAddress, `Se désabonner : ${opts.unsubscribeUrl}`);
  return lines.join('\n\n');
}
