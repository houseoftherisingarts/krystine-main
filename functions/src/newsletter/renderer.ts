// Server-side email HTML renderer. Mirrors src/lib/newsletterRenderer.tsx —
// keep them in sync when adding / tweaking block types. This file has NO
// React dependency because it runs in a Node Cloud Function.

export type BlockType = 'heading' | 'paragraph' | 'image' | 'button' | 'divider' | 'quote' | 'cta' | 'spacer';

export interface NewsletterBlock {
  type: BlockType;
  content?: Record<string, any>;
}

const BRAND = {
  gold: '#D4AF37',
  royal: '#0B1A36',
  cream: '#FEFBF4',
  muted: 'rgba(11,26,54,0.7)',
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

export interface RenderEmailOptions {
  subject: string;
  preheader?: string;
  unsubscribeUrl: string;
  postalAddress: string;
  firstName?: string;
  brandLogoUrl?: string;
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

function blockToEmail(block: NewsletterBlock, firstName?: string): string {
  const c = (block.content || {}) as any;
  switch (block.type) {
    case 'heading': {
      const level = c.level || 1;
      const align = c.align === 'center' ? 'center' : 'left';
      const fontSize = level === 1 ? '32px' : level === 2 ? '26px' : '22px';
      const text = personalize(esc(c.text || ''), firstName);
      return `<tr><td align="${align}" style="padding:18px 0;font-family:${BRAND.serif};font-size:${fontSize};line-height:1.15;color:${BRAND.royal};font-weight:500;">${text}</td></tr>`;
    }
    case 'paragraph': {
      const align = c.align === 'center' ? 'center' : 'left';
      const text = personalize(esc(c.text || ''), firstName);
      return `<tr><td align="${align}" style="padding:8px 0;font-family:${BRAND.sans};font-size:15px;line-height:1.65;color:${BRAND.muted};">${text}</td></tr>`;
    }
    case 'image': {
      if (!c.url) return '';
      const caption = c.caption
        ? `<tr><td align="center" style="padding:8px 0;font-family:${BRAND.sans};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.muted};">${esc(c.caption)}</td></tr>`
        : '';
      return `<tr><td style="padding:16px 0;"><img src="${esc(c.url)}" alt="${esc(c.alt || '')}" style="display:block;width:100%;max-width:560px;border-radius:16px;" /></td></tr>${caption}`;
    }
    case 'button': {
      const primary = c.variant !== 'secondary';
      const bg = primary ? BRAND.royal : 'transparent';
      const fg = primary ? '#ffffff' : BRAND.royal;
      const border = primary ? BRAND.royal : 'rgba(11,26,54,0.2)';
      return `<tr><td align="center" style="padding:20px 0;">
        <a href="${esc(c.href || '#')}" target="_blank"
           style="display:inline-block;background:${bg};color:${fg};border:1px solid ${border};
                  font-family:${BRAND.sans};font-size:11px;font-weight:700;letter-spacing:0.25em;
                  text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;">
          ${esc(c.label || 'En savoir plus')}
        </a>
      </td></tr>`;
    }
    case 'divider':
      return `<tr><td style="padding:16px 0;"><div style="height:1px;background:linear-gradient(90deg,transparent,${BRAND.gold},transparent);"></div></td></tr>`;
    case 'quote':
      return `<tr><td style="padding:20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="border-left:2px solid ${BRAND.gold};padding-left:18px;font-family:${BRAND.serif};font-style:italic;font-size:18px;line-height:1.5;color:${BRAND.royal};">
            «&nbsp;${esc(c.text || '')}&nbsp;»
            ${c.attribution ? `<div style="margin-top:10px;font-family:${BRAND.sans};font-style:normal;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${BRAND.gold};">— ${esc(c.attribution)}</div>` : ''}
          </td>
        </tr></table>
      </td></tr>`;
    case 'cta':
      return `<tr><td style="padding:20px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.royal};border-radius:16px;border:1px solid rgba(212,175,55,0.2);">
          <tr><td align="center" style="padding:32px 24px;color:#ffffff;">
            ${c.eyebrow ? `<div style="font-family:${BRAND.sans};font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${BRAND.gold};margin-bottom:10px;font-weight:700;">${esc(c.eyebrow)}</div>` : ''}
            ${c.title ? `<div style="font-family:${BRAND.serif};font-size:26px;line-height:1.2;margin-bottom:10px;">${esc(c.title)}</div>` : ''}
            ${c.body ? `<div style="font-family:${BRAND.sans};font-size:14px;line-height:1.6;color:rgba(255,255,255,0.75);margin-bottom:22px;">${esc(c.body)}</div>` : ''}
            ${(c.href && c.buttonLabel) ? `<a href="${esc(c.href)}" target="_blank" style="display:inline-block;background:${BRAND.gold};color:${BRAND.royal};font-family:${BRAND.sans};font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:999px;">${esc(c.buttonLabel)}</a>` : ''}
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
  const preheader = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;color:transparent;line-height:1px;">${esc(opts.preheader)}</div>`
    : '';
  const logo = opts.brandLogoUrl
    ? `<tr><td align="center" style="padding:24px 0 8px;"><img src="${esc(opts.brandLogoUrl)}" alt="Inspirata" style="height:48px;width:auto;display:inline-block;" /></td></tr>`
    : '';

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(11,26,54,0.08);">
        ${logo}
        <tr><td style="padding:16px 36px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${blockRows}
          </table>
        </td></tr>
        <tr><td style="padding:24px 36px;border-top:1px solid rgba(11,26,54,0.08);font-family:${BRAND.sans};font-size:11px;line-height:1.6;color:rgba(11,26,54,0.5);">
          <div style="margin-bottom:8px;">${esc(opts.postalAddress)}</div>
          <div><a href="${esc(opts.unsubscribeUrl)}" style="color:${BRAND.gold};text-decoration:underline;">Se désabonner</a> · <a href="https://www.krystinestlaurent.ca/politique-de-confidentialite" style="color:${BRAND.gold};text-decoration:underline;">Politique de confidentialité</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
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
        if (c.label && c.href) lines.push(`${c.label}: ${c.href}`);
        break;
      case 'cta':
        if (c.title) lines.push(c.title);
        if (c.body)  lines.push(c.body);
        if (c.href && c.buttonLabel) lines.push(`${c.buttonLabel}: ${c.href}`);
        break;
      case 'divider':
        lines.push('---');
        break;
    }
  }
  lines.push('', opts.postalAddress, `Se désabonner: ${opts.unsubscribeUrl}`);
  return lines.join('\n\n');
}
