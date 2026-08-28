// EditImageOverlay — site-wide click-to-swap for any <img> on the page.
//
// Same shape as EditOverlay (which handles text), applied to pictures:
//
// 1. APPLY: walk the DOM for <img> elements, remember the original src the
//    first time each one is seen, and swap in the override URL when the
//    overrides doc has one for its key. A MutationObserver re-runs the pass
//    after React re-renders or when new content mounts, so the swap sticks.
//
// 2. EDIT (admin, edit mode on): outline every swappable picture on hover
//    and open the Médiathèque on click. Picking an image saves the override
//    through the same EditModeContext used by EditableImage, so every open
//    browser updates live.
//
// Keys are `auto:<route>:img:<original path>`, so the same picture used on
// two pages stays independent. Put `data-edit-img-key` on an <img> to give
// it a stable key that survives a redesign.
//
// Out of scope on purpose: CSS background images, <video> posters and
// <source> elements. Those still go through EditableImage or a code change.

import React, { useEffect, useState } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import MediathequePicker from './MediathequePicker';

const SKIP_ANCESTOR_SELECTOR =
  '[data-no-edit], [data-edit-ui], nav, header[role="banner"], [role="dialog"], .__edit-skip';
const CLASS_TAG = '__editable-img';
const STYLE_ID = '__edit-image-style';

function pathOf(src: string): string {
  try { return new URL(src, window.location.origin).pathname; } catch { return src; }
}

function buildKey(el: HTMLImageElement, originalSrc: string): string {
  if (el.dataset.editImgKey) return el.dataset.editImgKey;
  const route = window.location.pathname.replace(/\/$/, '') || '/';
  return `auto:${route}:img:${pathOf(originalSrc)}`;
}

function isSwappable(el: HTMLImageElement): boolean {
  if (el.closest(SKIP_ANCESTOR_SELECTOR)) return false;
  if (window.location.pathname.startsWith('/admin')) return false;
  return Boolean(el.getAttribute('src') || el.dataset.editImgOriginal);
}

const EditImageOverlay: React.FC = () => {
  const { editMode, overrides, saveImage } = useEditMode();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // ─── APPLY: swap src (and focal point) where an override exists ─────
  useEffect(() => {
    let raf = 0;

    const apply = () => {
      document.querySelectorAll('img').forEach((node) => {
        const el = node as HTMLImageElement;
        if (!isSwappable(el)) return;

        // The remembered original is refreshed from the DOM on every pass
        // EXCEPT when the current src is the one we swapped in. A picture
        // React changes on its own (a carousel, a product gallery) keeps
        // its own src, and only an actual override touches the attribute.
        const current = el.getAttribute('src') || '';
        const appliedByUs = el.dataset.editImgApplied !== undefined && current === el.dataset.editImgApplied;
        if (!appliedByUs) el.dataset.editImgOriginal = current;
        const original = el.dataset.editImgOriginal ?? current;

        const override = overrides.images[buildKey(el, original)];
        if (override?.url) {
          if (current !== override.url) el.setAttribute('src', override.url);
          el.dataset.editImgApplied = override.url;
          el.style.objectPosition = `${(override.focalX ?? 0.5) * 100}% ${(override.focalY ?? 0.5) * 100}%`;
        } else if (appliedByUs) {
          // The override was removed — put the original picture back.
          el.setAttribute('src', original);
          delete el.dataset.editImgApplied;
          el.style.objectPosition = '';
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
      attributes: true,
      attributeFilter: ['src'],
    });

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, [overrides]);

  // ─── EDIT MODE: outline pictures, click opens the Médiathèque ───────
  useEffect(() => {
    if (!editMode) return;

    const tagAll = () => {
      document.querySelectorAll('img').forEach((el) => {
        if (isSwappable(el as HTMLImageElement)) (el as HTMLElement).classList.add(CLASS_TAG);
      });
    };
    tagAll();
    const tagObs = new MutationObserver(tagAll);
    tagObs.observe(document.body, { childList: true, subtree: true });

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${CLASS_TAG}:hover {
        outline: 2px solid rgba(187, 154, 94, 0.9);
        outline-offset: 2px;
        cursor: zoom-in;
      }
    `;
    document.head.appendChild(style);

    const onClickCapture = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.tagName !== 'IMG') return;
      const img = target as HTMLImageElement;
      if (!img.classList.contains(CLASS_TAG)) return;
      // Hijack the click — the picture often sits inside a link or a button.
      e.preventDefault();
      e.stopPropagation();
      setPendingKey(buildKey(img, img.dataset.editImgOriginal || img.getAttribute('src') || ''));
    };

    document.addEventListener('click', onClickCapture, true);

    return () => {
      document.querySelectorAll(`.${CLASS_TAG}`).forEach(el => el.classList.remove(CLASS_TAG));
      document.removeEventListener('click', onClickCapture, true);
      tagObs.disconnect();
      document.getElementById(STYLE_ID)?.remove();
    };
  }, [editMode]);

  return (
    <MediathequePicker
      open={pendingKey !== null}
      onClose={() => setPendingKey(null)}
      onSelect={(url) => {
        if (!pendingKey) return;
        saveImage(pendingKey, { url, focalX: 0.5, focalY: 0.5 }).catch(() => { /* noop */ });
      }}
    />
  );
};

export default EditImageOverlay;
