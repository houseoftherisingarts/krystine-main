import React, { useEffect, useRef, useState } from 'react';
import { useEditMode } from '../../contexts/EditModeContext';

interface Props {
  /** Stable key for the Firestore override — e.g. "home.cards.formations.title". */
  fieldKey: string;
  /** Copy to display when no override exists. */
  defaultValue: string;
  /** Render tag — defaults to <span>. Pass 'h2', 'p', etc. to match the surrounding layout. */
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  /** True to allow a textarea-style multi-line edit; default is single-line input. */
  multiline?: boolean;
}

// Renders text normally for visitors; in admin edit mode, overlays a pencil
// affordance. Clicking the pencil swaps the text for an <input> / <textarea>.
// Saving writes to Firestore via the EditModeContext; all open browsers pick up
// the change through the snapshot subscription.
const EditableText: React.FC<Props> = ({ fieldKey, defaultValue, as: Tag = 'span', className, multiline }) => {
  const { editMode, getText, saveText } = useEditMode();
  const value = getText(fieldKey, defaultValue);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = async () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      setSaving(true);
      try { await saveText(fieldKey, trimmed); } catch { /* surfaced via toast in future */ }
      setSaving(false);
    }
    setEditing(false);
  };

  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editMode) {
    // When not in edit mode the component is transparent — just renders the text.
    return <Tag className={className}>{value}</Tag>;
  }

  if (editing) {
    const commonProps = {
      ref: inputRef as any,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); cancel(); }
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); (e.target as HTMLElement).blur(); }
      },
      className: `bg-white dark:bg-[#050C1A] border-2 border-[#D4AF37] rounded-md px-2 py-1 outline-none font-inherit text-inherit min-w-[120px] ${className || ''}`,
    };
    return multiline
      ? <textarea {...(commonProps as any)} rows={3} />
      : <input type="text" {...(commonProps as any)} />;
  }

  return (
    <span className="relative inline-block group/edit align-baseline">
      <Tag className={className}>{value}</Tag>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); e.preventDefault(); setEditing(true); }}
        className="ml-1 align-middle inline-flex w-5 h-5 rounded-full bg-[#D4AF37] text-[#0B1A36] items-center justify-center opacity-0 group-hover/edit:opacity-100 transition-opacity shadow-md"
        title="Modifier le texte"
      >
        <i className="fa-solid fa-pen text-[9px]" />
      </button>
      {saving && <span className="ml-1 text-[10px] text-[#D4AF37]">…</span>}
    </span>
  );
};

export default EditableText;
