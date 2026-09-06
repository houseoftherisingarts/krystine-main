import React, { useEffect, useRef } from 'react';
import type { NewsletterBlock } from '../firebase/firestore';

// ─── Block content shapes (informational only — Firestore stores `any` here) ─
export interface HeadingContent   { level?: 1 | 2 | 3; text?: string; align?: 'left' | 'center' }
export interface ParagraphContent { text?: string; align?: 'left' | 'center' }
export interface ImageContent     { url?: string; caption?: string; alt?: string }
export interface ButtonContent    { label?: string; href?: string; variant?: 'primary' | 'secondary' }
export interface QuoteContent     { text?: string; attribution?: string }
export interface CTAContent       { eyebrow?: string; title?: string; body?: string; href?: string; buttonLabel?: string }
export interface SpacerContent    { size?: 'sm' | 'md' | 'lg' }

// Brand palette — keep in sync with index.html Tailwind config so on-site
// previews and emailed HTML match.
export const BRAND = {
  gold: '#B8532F',
  royal: '#3A251E',
  cream: '#F4E7DD',
  surface: '#F4E7DD',
  ink: '#3A251E',
  muted: 'rgba(58,37,30,0.7)',
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

// ─── Édition en place (composeur de l'admin) ────────────────────────────────
// Quand `edit` est fourni, chaque texte devient modifiable au clic et une
// image se remplace au clic. Les visiteurs (boîte du client, archive) ne
// passent jamais par là : sans `edit`, le rendu est celui d'avant.
export interface BlockEdit {
  set: (patch: Record<string, any>) => void;
  pickImage: () => void;
}

const Inline: React.FC<{
  tag?: keyof React.JSX.IntrinsicElements;
  className?: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onCommit: (v: string) => void;
}> = ({ tag = 'span', className = '', value, placeholder, multiline, onCommit }) => {
  const ref = useRef<HTMLElement | null>(null);
  // Le texte vit dans le DOM pendant la frappe; React ne le touche que si la
  // valeur change ailleurs (Iris, annulation) et que le champ n'a pas le focus.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value]);
  const Tag = tag as any;
  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-placeholder={placeholder}
      className={`nl-inline ${className}`}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const v = e.currentTarget.innerText.replace(/\n+$/, '');
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); }
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); e.currentTarget.blur(); }
      }}
      onPaste={(e: React.ClipboardEvent) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
    />
  );
};

// ─── Web preview renderer ────────────────────────────────────────────────────
// Used by the admin composer and the client inbox. Inherits the site's
// Tailwind styles — no inline styling needed.
export const RenderBlockWeb: React.FC<{ block: NewsletterBlock; edit?: BlockEdit }> = ({ block, edit }) => {
  const c = (block.content || {}) as any;
  const set = (k: string) => (v: string) => edit?.set({ [k]: v });
  switch (block.type) {
    case 'heading': {
      const level = c.level || 1;
      const align = c.align === 'center' ? 'text-center' : 'text-left';
      const size = level === 1 ? 'text-4xl md:text-5xl' : level === 2 ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl';
      const className = `font-serif text-[#3A251E] dark:text-white my-6 ${size} ${align}`;
      if (edit) return <Inline tag={level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'} className={className} value={c.text || ''} placeholder="Votre titre" onCommit={set('text')} />;
      if (level === 1) return <h1 className={className}>{c.text || ''}</h1>;
      if (level === 2) return <h2 className={className}>{c.text || ''}</h2>;
      return <h3 className={className}>{c.text || ''}</h3>;
    }
    case 'paragraph': {
      const className = `text-[#3A251E]/80 dark:text-white/80 leading-relaxed my-4 whitespace-pre-line ${c.align === 'center' ? 'text-center' : 'text-left'}`;
      if (edit) return <Inline tag="p" className={className} value={c.text || ''} placeholder="Écrivez votre texte ici." multiline onCommit={set('text')} />;
      return <p className={className}>{c.text || ''}</p>;
    }
    case 'image': {
      const capClass = 'text-xs uppercase tracking-widest text-[#3A251E]/50 dark:text-white/50 text-center mt-3';
      if (edit) {
        return (
          <figure className="my-6">
            <button type="button" onClick={e => { e.stopPropagation(); edit.pickImage(); }} title="Changer l'image"
              className="group/img relative block w-full rounded-2xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#BA7B39]">
              {c.url
                ? <img src={c.url} alt={c.alt || ''} className="w-full block" />
                : <div className="aspect-[21/9] max-h-64 w-full border-2 border-dashed border-[#B8532F]/40 bg-[#B8532F]/5 flex flex-col items-center justify-center gap-2 text-[#B8532F]"><i className="fa-solid fa-image text-3xl" /><span className="text-xs uppercase tracking-widest font-bold">Choisir une image</span></div>}
              <span className="absolute inset-0 flex items-center justify-center bg-[#3A251E]/0 group-hover/img:bg-[#3A251E]/40 transition-colors">
                <span className="opacity-0 group-hover/img:opacity-100 transition-opacity bg-white text-[#3A251E] px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-lg"><i className="fa-solid fa-images mr-2" />Changer l'image</span>
              </span>
            </button>
            <Inline tag="figcaption" className={capClass} value={c.caption || ''} placeholder="Légende (facultative)" onCommit={set('caption')} />
          </figure>
        );
      }
      return (
        <figure className="my-6">
          {c.url && <img src={c.url} alt={c.alt || ''} className="w-full rounded-2xl" />}
          {c.caption && <figcaption className={capClass}>{c.caption}</figcaption>}
        </figure>
      );
    }
    case 'button': {
      const primary = c.variant !== 'secondary';
      const className = `inline-block px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-md transition-colors ${
        primary
          ? 'bg-[#3A251E] text-white hover:bg-[#B8532F] hover:text-[#3A251E]'
          : 'border border-[#3A251E]/20 text-[#3A251E] dark:text-white hover:border-[#B8532F] hover:text-[#B8532F]'
      }`;
      if (edit) return <div className="my-6 text-center"><Inline className={className} value={c.label || ''} placeholder="Texte du bouton" onCommit={set('label')} /></div>;
      return (
        <div className="my-6 text-center">
          <a href={c.href || '#'} target="_blank" rel="noopener noreferrer" className={className}>
            {c.label || 'En savoir plus'}
          </a>
        </div>
      );
    }
    case 'divider':
      return <hr className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-[#B8532F]/50 to-transparent" />;
    case 'quote': {
      const citeClass = 'block mt-3 text-xs uppercase tracking-widest not-italic text-[#B8532F]';
      if (edit) {
        return (
          <blockquote className="my-8 border-l-2 border-[#B8532F] pl-6 italic font-serif text-lg text-[#3A251E]/80 dark:text-white/80">
            <p>« <Inline value={c.text || ''} placeholder="La citation" multiline onCommit={set('text')} /> »</p>
            <span className={citeClass}>— <Inline value={c.attribution || ''} placeholder="Qui l'a dit" onCommit={set('attribution')} /></span>
          </blockquote>
        );
      }
      return (
        <blockquote className="my-8 border-l-2 border-[#B8532F] pl-6 italic font-serif text-lg text-[#3A251E]/80 dark:text-white/80">
          <p>« {c.text || ''} »</p>
          {c.attribution && <cite className={citeClass}>— {c.attribution}</cite>}
        </blockquote>
      );
    }
    case 'cta': {
      const box = 'my-8 rounded-[24px] bg-gradient-to-br from-[#3A251E] to-[#4A3228] text-white p-8 md:p-10 text-center border border-[#B8532F]/20';
      const eyebrowClass = 'text-[10px] uppercase tracking-[0.3em] font-bold text-[#B8532F] block mb-3';
      const titleClass = 'text-2xl md:text-3xl font-serif mb-3';
      const bodyClass = 'text-white/70 mb-6 max-w-xl mx-auto';
      const btnClass = 'inline-block bg-[#B8532F] text-[#3A251E] px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-white transition-colors';
      if (edit) {
        return (
          <div className={box}>
            <Inline className={eyebrowClass} value={c.eyebrow || ''} placeholder="Petit texte au-dessus" onCommit={set('eyebrow')} />
            <Inline tag="h3" className={titleClass} value={c.title || ''} placeholder="Titre fort" onCommit={set('title')} />
            <Inline tag="p" className={bodyClass} value={c.body || ''} placeholder="Un court paragraphe." multiline onCommit={set('body')} />
            <Inline className={btnClass} value={c.buttonLabel || ''} placeholder="Texte du bouton" onCommit={set('buttonLabel')} />
          </div>
        );
      }
      return (
        <div className={box}>
          {c.eyebrow && <span className={eyebrowClass}>{c.eyebrow}</span>}
          {c.title && <h3 className={titleClass}>{c.title}</h3>}
          {c.body && <p className={bodyClass}>{c.body}</p>}
          {c.href && c.buttonLabel && (
            <a href={c.href} target="_blank" rel="noopener noreferrer" className={btnClass}>
              {c.buttonLabel}
            </a>
          )}
        </div>
      );
    }
    case 'spacer': {
      const h = c.size === 'lg' ? 'h-16' : c.size === 'sm' ? 'h-4' : 'h-8';
      return <div className={h} />;
    }
    default:
      return null;
  }
};

export const RenderBlocksWeb: React.FC<{ blocks: NewsletterBlock[] }> = ({ blocks }) => (
  <>{blocks.map((b, i) => <RenderBlockWeb key={i} block={b} />)}</>
);

// ─── Email HTML renderer ─────────────────────────────────────────────────────
// Email clients (Gmail in particular) strip <style>, ignore flexbox, and
// reject unattached CSS. Everything below is inline-styled and uses the
// classic table-in-table layout. Unicode-safe; no JS.
//
// Also exported as a plain utility so the Cloud Function can import it and
// produce the HTML server-side at send time.

export interface RenderEmailOptions {
  subject: string;
  preheader?: string;
  unsubscribeUrl: string;   // required — CASL compliance
  postalAddress: string;    // required — CASL compliance
  firstName?: string;       // used for greeting personalization via {{firstName}}
  brandLogoUrl?: string;    // rendered at top of email
}

function esc(s: string): string {
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
      const fg = primary ? '#F4E7DD' : BRAND.royal;
      const border = primary ? BRAND.royal : `rgba(58,37,30,0.2)`;
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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.royal};border-radius:16px;border:1px solid rgba(184,83,47,0.2);">
          <tr><td align="center" style="padding:32px 24px;color:#F4E7DD;">
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
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#F4E7DD;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(58,37,30,0.08);">
        ${logo}
        <tr><td style="padding:16px 36px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${blockRows}
          </table>
        </td></tr>
        <tr><td style="padding:24px 36px;border-top:1px solid rgba(58,37,30,0.08);font-family:${BRAND.sans};font-size:11px;line-height:1.6;color:rgba(58,37,30,0.5);">
          <div style="margin-bottom:8px;">${esc(opts.postalAddress)}</div>
          <div><a href="${esc(opts.unsubscribeUrl)}" style="color:${BRAND.gold};text-decoration:underline;">Se désabonner</a> · <a href="https://www.krystinestlaurent.ca/politique-de-confidentialite" style="color:${BRAND.gold};text-decoration:underline;">Politique de confidentialité</a></div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Utility: produce a compact text fallback (most clients generate one
// automatically, but Resend accepts both and it helps inbox-placement).
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
