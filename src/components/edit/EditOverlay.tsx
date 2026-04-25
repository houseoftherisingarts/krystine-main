// EditOverlay — site-wide click-to-edit-any-text overlay.
//
// HOW IT WORKS
// ────────────
// At runtime this component does two things, both via DOM walks:
//
// 1. APPLY: whenever the overrides doc (Firestore or localStorage) or the
//    current language changes, scan the DOM for "leaf" text-bearing
//    elements (h1–h6, p, blockquote, li, figcaption, button, a). For each,
//    compute a stable auto-key from the current route, nearest semantic
//    anchor, tag, content hash and language. If an override exists for
//    that key, replace the text content. If not, restore the captured
//    original. A MutationObserver re-runs the apply pass when the DOM
//    changes (modal opens, list items add, etc.).
//
// 2. EDIT (admin only, edit-mode on): tag those same leaf elements with
//    a class so a CSS hover rule shows a copper outline. A delegated
//    click handler turns the element contentEditable, captures the new
//    text on blur, and saves via the existing EditModeContext.saveText.
//
// LIMITATIONS / WHY IT'S NOT MAGIC
// ────────────────────────────────
// • Only "leaf" elements are targeted — i.e. those whose children are
//   either empty or icon-only. This catches the bulk of marketing copy
//   without making spans/divs that hold whole layouts editable. Wrap a
//   nested-text element in <EditableText> manually if you need it.
// • Auto-keys are deterministic against (route, anchor, tag, content).
//   If you EDIT a text and later change the surrounding markup so the
//   anchor changes, the override won't follow. Keys based on
//   `data-edit-key` (set explicitly on the element) are stable across
//   refactors — use that for any label you expect to outlive a redesign.
// • Focused element is changed via contentEditable; React will reconcile
//   on the next render and our APPLY loop reasserts the override. So
//   round-trip works (edit → save → React re-renders default → apply
//   loop replaces with override).
// • Skip selectors keep navigation, modals, admin chrome, and any
//   element marked `data-no-edit` / `data-edit-ui` out of bounds.

import React, { useEffect } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import { useApp } from '../../contexts/AppContext';

const EDITABLE_TAGS = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'BLOCKQUOTE', 'LI', 'FIGCAPTION', 'BUTTON', 'A'] as const;
const EDITABLE_SELECTOR = EDITABLE_TAGS.map(t => t.toLowerCase()).join(',');

// Anything inside one of these stays untouched. data-no-edit is the
// per-element opt-out; data-edit-ui is for our own admin chrome.
const SKIP_ANCESTOR_SELECTOR = '[data-no-edit], [data-edit-ui], nav, header[role="banner"], [role="dialog"], input, textarea, select, code, pre, .__edit-skip';

function isLeafText(el: HTMLElement): boolean {
  if (!EDITABLE_TAGS.includes(el.tagName as typeof EDITABLE_TAGS[number])) return false;
  if (el.closest(SKIP_ANCESTOR_SELECTOR)) return false;
  const text = el.textContent?.trim();
  if (!text) return false;
  // CRITICAL: only target true text leaves — elements whose children
  // are ALL text nodes. Any element child (an <img>, an <i> icon, a
  // nested <span>, an <EditableText>'s span) means assigning
  // `textContent` in the apply loop would destroy that child. So we
  // skip anything with element children entirely. Authors who need an
  // icon-bearing button or a paragraph with mid-sentence emphasis to
  // be editable should wrap with <EditableText fieldKey="…"> instead.
  if (el.children.length > 0) return false;
  return true;
}

// 32-bit djb2 hash → base36. Stable across reloads, runs short on output.
function hashContent(s: string): string {
  let h = 5381;
  const n = Math.min(s.length, 80);
  for (let i = 0; i < n; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
  }
  return Math.abs(h).toString(36);
}

function buildKey(el: HTMLElement, originalText: string, lang: string): string {
  // Explicit key on the element wins — encourages stable refactors.
  if (el.dataset.editKey) return `${el.dataset.editKey}.${lang}`;
  const route = window.location.pathname.replace(/\/$/, '') || '/';
  const tag = el.tagName.toLowerCase();
  const anchor = el.closest('section, main, article, header, footer');
  const anchorTag = anchor?.tagName.toLowerCase() || 'body';
  const anchorIdx = anchor?.parentElement
    ? Array.from(anchor.parentElement.children).indexOf(anchor as Element)
    : 0;
  const hash = hashContent(originalText.trim());
  return `auto:${route}:${anchorTag}${anchorIdx}:${tag}:${hash}.${lang}`;
}

const STYLE_ID = '__edit-overlay-style';
const CLASS_TAG = '__editable-text';

const EditOverlay: React.FC = () => {
  const { editMode, overrides, saveText } = useEditMode();
  const { lang } = useApp();

  // ─── APPLY: walk the DOM, replace text where an override exists ─────
  useEffect(() => {
    let raf = 0;

    const apply = () => {
      const candidates = document.querySelectorAll(EDITABLE_SELECTOR);
      candidates.forEach((node) => {
        const el = node as HTMLElement;
        if (!isLeafText(el)) return;
        // Capture original on first sight so we can restore if the
        // override is later removed.
        if (el.dataset.editOriginal === undefined) {
          el.dataset.editOriginal = el.textContent || '';
        }
        const original = el.dataset.editOriginal!;
        const key = buildKey(el, original, lang);
        const override = overrides.text[key];
        const desired = override !== undefined ? override : original;
        if (el.textContent !== desired) {
          el.textContent = desired;
        }
      });
    };

    raf = requestAnimationFrame(apply);

    const obs = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [overrides, lang]);

  // ─── EDIT MODE: tag editables, click-to-edit, save on blur ─────────
  useEffect(() => {
    if (!editMode) return;

    // Tag editable leaves so the hover CSS rule can target them. Re-run
    // on DOM mutations so newly mounted content (modals, lists) is also
    // tagged.
    const tagAll = () => {
      document.querySelectorAll(EDITABLE_SELECTOR).forEach((el) => {
        if (isLeafText(el as HTMLElement)) (el as HTMLElement).classList.add(CLASS_TAG);
      });
    };
    tagAll();
    const tagObs = new MutationObserver(tagAll);
    tagObs.observe(document.body, { childList: true, subtree: true });

    // Inject the visual feedback (hover outline + active editor frame).
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${CLASS_TAG} { transition: outline 0.15s ease, background 0.15s ease; }
      .${CLASS_TAG}:not([contenteditable="true"]):hover {
        outline: 1px dashed rgba(184, 83, 47, 0.55);
        outline-offset: 4px;
        cursor: text;
        background: rgba(244, 231, 221, 0.18);
      }
      .${CLASS_TAG}[contenteditable="true"] {
        outline: 2px solid #B8532F !important;
        outline-offset: 4px;
        background: rgba(244, 231, 221, 0.7) !important;
        cursor: text;
      }
    `;
    document.head.appendChild(style);

    let editing: HTMLElement | null = null;

    const finish = (commit: boolean) => {
      const el = editing;
      if (!el) return;
      const original = el.dataset.editOriginal || '';
      const newText = (el.textContent || '').trim();
      el.contentEditable = 'false';
      editing = null;
      if (commit && newText !== original) {
        const key = buildKey(el, original, lang);
        // Save in the background — saveText is async but failure is
        // already swallowed inside EditModeContext for the in-page UX.
        saveText(key, newText).catch(() => { /* noop */ });
      } else if (!commit) {
        el.textContent = original;
      }
    };

    const onClickCapture = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest(`.${CLASS_TAG}`) as HTMLElement | null;
      if (!target) return;
      // Don't reactivate the same target.
      if (target === editing) return;
      // Hijack the click — buttons/links would otherwise navigate.
      e.preventDefault();
      e.stopPropagation();

      if (editing && editing !== target) finish(true);

      target.contentEditable = 'true';
      target.focus();
      // Place caret at end so typing appends (matches Figma/Notion feel).
      try {
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch { /* ignore selection failures (rare browsers) */ }
      editing = target;
    };

    const onFocusOut = (e: FocusEvent) => {
      // focusout fires before blur and bubbles — only act on the active
      // editor losing focus.
      if (!editing) return;
      if (e.target !== editing) return;
      finish(true);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!editing) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(false);
        editing?.blur();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Single-line edit: Enter commits. Shift+Enter still inserts
        // a newline for paragraphs.
        e.preventDefault();
        editing?.blur();
      }
    };

    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      finish(true);
      document.querySelectorAll(`.${CLASS_TAG}`).forEach((el) => {
        el.classList.remove(CLASS_TAG);
        (el as HTMLElement).contentEditable = 'false';
      });
      document.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('keydown', onKeyDown, true);
      tagObs.disconnect();
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [editMode, lang, saveText]);

  return null;
};

export default EditOverlay;
