import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { createNewsletter, updateNewsletter } from '../../../../firebase/firestore';
import AssistantPanel, { type Proposal } from './AssistantPanel';
import { PrimaryButton, GhostButton } from '../../primitives';

// L'onglet Terminal : Krystine demande son infolettre à Iris sans passer par
// le composeur. Chaque proposition d'Iris s'enregistre d'elle-même comme
// brouillon dans « Infolettres »; le composeur reste là pour la photo, la
// relecture et l'envoi, qui restent son geste à elle.

interface Props {
  onOpen: (id: string) => void;
}

const TerminalPanel: React.FC<Props> = ({ onOpen }) => {
  const [session, setSession] = useState(0);          // remonte le panneau pour une conversation neuve
  const [id, setId] = useState<string | null>(null);  // brouillon de cette conversation
  const [draft, setDraft] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onProposal = async (p: Proposal) => {
    setDraft(p); setSaving(true); setErr(null);
    try {
      const data = {
        title: p.title || p.subject,
        subject: p.subject,
        preheader: p.preheader || '',
        fromName: 'Krystine St-Laurent',
        blocks: p.blocks,
        audience: p.audience || { mode: 'all' as const },
        scheduledFor: p.scheduledFor ? Timestamp.fromDate(new Date(p.scheduledFor)) : null,
        couverture: 'aucune' as const,
        couvertureUrl: null,
        signature: true,
      };
      if (id) {
        await updateNewsletter(id, data);
      } else {
        const ref = await createNewsletter({ ...data, status: 'draft' });
        setId(ref.id);
      }
    } catch (e: any) {
      setErr(e?.message || "Le brouillon ne s'est pas enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const nouvelle = () => { setSession(s => s + 1); setId(null); setDraft(null); setErr(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-[15px] border border-[#293027]/10 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] px-5 py-3">
        <div className="flex-1 min-w-[240px]">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#BA7B39]">Terminal</p>
          {draft ? (
            <p className="text-sm text-[#293027] dark:text-white/90">
              <i className={`fa-solid ${saving ? 'fa-circle-notch fa-spin' : 'fa-check'} mr-2 text-[#BA7B39]`} />
              « {draft.subject} » · {draft.blocks.length} blocs · {saving ? 'enregistrement…' : 'enregistrée dans Infolettres'}
              {draft.scheduledFor ? ` · date proposée ${new Date(draft.scheduledFor).toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
            </p>
          ) : (
            <p className="text-sm text-[#293027]/70 dark:text-white/60">Demandez votre infolettre à Iris. Dès qu'elle la propose, le brouillon s'enregistre tout seul; l'envoi reste votre geste.</p>
          )}
          {err && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{err}</p>}
        </div>
        {id && (
          <PrimaryButton onClick={() => onOpen(id)} disabled={saving}>
            <i className="fa-solid fa-pen-to-square mr-2" />Ouvrir dans le composeur
          </PrimaryButton>
        )}
        {(draft || id) && (
          <GhostButton onClick={nouvelle}>
            <i className="fa-solid fa-plus mr-2" />Nouvelle conversation
          </GhostButton>
        )}
      </div>

      <AssistantPanel
        key={session}
        draft={{
          title: draft?.title || '', subject: draft?.subject || '', preheader: draft?.preheader || '',
          blocks: draft?.blocks || [], audience: draft?.audience || { mode: 'all' }, scheduledFor: draft?.scheduledFor || null,
        }}
        onProposal={onProposal}
      />
    </div>
  );
};

export default TerminalPanel;
