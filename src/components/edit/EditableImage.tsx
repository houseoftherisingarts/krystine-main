import React, { useRef, useState } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';
import MediathequePicker from './MediathequePicker';

interface Props {
  /** Stable key for the Firestore override — e.g. "home.cards.formations". */
  fieldKey: string;
  /** Default image URL (the built-in design asset). */
  defaultSrc: string;
  /** Tailwind/class styles applied to the outer wrapper. */
  className?: string;
  /** Passed through for a11y; ignored visually. */
  alt?: string;
  /** Optional overlay children (CTA text, badges) rendered on top of the image. */
  children?: React.ReactNode;
}

// Renders a background-image element so we can control `background-position`
// for the focal-point (drag-to-recenter) feature. In edit mode, admins get a
// "Change picture" button and a draggable focal handle. The saved focal point
// is applied to every visitor's view via `background-position: Xx% Yx%`.
const EditableImage: React.FC<Props> = ({ fieldKey, defaultSrc, className, alt, children }) => {
  const { editMode, getImage, saveImage } = useEditMode();
  const current = getImage(fieldKey, defaultSrc);
  const focalX = current.focalX ?? 0.5;
  const focalY = current.focalY ?? 0.5;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Draft focal — applied live while dragging, persisted on release.
  const [draftFocal, setDraftFocal] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const displayFocal = draftFocal ?? { x: focalX, y: focalY };

  const handleMove = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    setDraftFocal({ x, y });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    handleMove(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    handleMove(e.clientX, e.clientY);
  };
  const onPointerUp = async (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    if (draftFocal) {
      try { await saveImage(fieldKey, { url: current.url, focalX: draftFocal.x, focalY: draftFocal.y }); }
      catch { /* swallow for MVP */ }
      setDraftFocal(null);
    }
  };

  const onPickImage = async (url: string) => {
    try { await saveImage(fieldKey, { url, focalX: 0.5, focalY: 0.5 }); }
    catch { /* noop */ }
  };

  // The consumer controls positioning via className (e.g. "absolute inset-0").
  // We previously prefixed `relative`, but Tailwind's cascade puts `relative`
  // after `absolute`, overriding it — which collapsed hero cards to 0 height.
  // Fall back to `relative` only when the consumer passed nothing.
  const wrapperClass = className && className.trim() ? className : 'relative';

  return (
    <>
      <div
        ref={containerRef}
        className={wrapperClass}
        style={{
          backgroundImage: `url(${current.url})`,
          backgroundSize: 'cover',
          backgroundPosition: `${displayFocal.x * 100}% ${displayFocal.y * 100}%`,
          cursor: editMode ? (dragging ? 'grabbing' : 'grab') : undefined,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role={alt ? 'img' : undefined}
        aria-label={alt}
      >
        {children}

        {editMode && (
          <>
            {/* Edit badge ring — makes the surface visually distinct in edit mode. */}
            <div className="pointer-events-none absolute inset-0 ring-2 ring-[#D4AF37]/80 ring-inset rounded-[inherit]" />

            {/* Focal point crosshair */}
            <div
              className="pointer-events-none absolute w-8 h-8 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(212,175,55,0.9)] -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${displayFocal.x * 100}%`, top: `${displayFocal.y * 100}%` }}
            />

            {/* Change-picture control — stops event propagation so clicks don't start a drag. */}
            <button
              type="button"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.preventDefault(); e.stopPropagation(); setPickerOpen(true); }}
              className="absolute top-3 left-3 inline-flex items-center gap-2 bg-[#0B1A36] text-[#D4AF37] border border-[#D4AF37] px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors"
            >
              <i className="fa-solid fa-image text-[10px]" />
              Changer la photo
            </button>

            {/* Hint */}
            <div className="absolute bottom-3 left-3 right-3 text-[10px] uppercase tracking-widest font-bold text-white/90 bg-[#0B1A36]/70 backdrop-blur px-3 py-1.5 rounded-full text-center pointer-events-none">
              {dragging ? 'Glissez pour recentrer' : 'Cliquez-glissez pour recentrer'}
            </div>
          </>
        )}
      </div>

      <MediathequePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={onPickImage}
      />
    </>
  );
};

export default EditableImage;
