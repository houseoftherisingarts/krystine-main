import React, { useEffect, useState } from 'react';
import type { NewsletterSubscriber } from '../../../../firebase/firestore';
import { getReponsesAbonne, repondreAbonne, type ReponseAbonne } from '../../../../firebase/reponses';
import { Input, Label, PrimaryButton, GhostButton, Textarea } from '../../primitives';

// Tiroir de réponse sous une ligne d'abonné : la question posée s'il y en a
// une, le fil des réponses déjà envoyées, puis le sujet et le message. Chaque
// envoi part par courriel (fonction repondreAbonne) et s'ajoute au fil.

const TEAM_EMAIL = 'teamksl@inspiratanature.com';

const ReponsePanel: React.FC<{ abonne: NewsletterSubscriber; onClose: () => void; onSent: () => void }> = ({ abonne, onClose, onSent }) => {
  const [fil, setFil] = useState<ReponseAbonne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [sujet, setSujet] = useState(abonne.question ? 'Réponse à votre question' : '');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [etat, setEtat] = useState<{ ok: boolean; texte: string } | null>(null);

  const charger = () => {
    if (!abonne.id) return;
    setChargement(true);
    getReponsesAbonne(abonne.id).then(setFil).catch(() => setFil([])).finally(() => setChargement(false));
  };
  useEffect(charger, [abonne.id]);

  const envoyer = async () => {
    if (!abonne.id || envoi) return;
    setEnvoi(true);
    setEtat(null);
    try {
      const r = await repondreAbonne(abonne.id, sujet.trim(), message.trim());
      const via = r.expediteur.includes(TEAM_EMAIL) ? TEAM_EMAIL : `${r.expediteur} (réponses vers ${TEAM_EMAIL})`;
      setEtat({ ok: true, texte: `Courriel envoyé à ${abonne.email} depuis ${via}.` });
      setMessage('');
      charger();
      onSent();
    } catch (e: any) {
      setEtat({ ok: false, texte: e?.message || 'Envoi impossible.' });
    } finally {
      setEnvoi(false);
    }
  };

  const prenom = abonne.firstName || abonne.email;

  return (
    <div className="px-5 py-5 bg-[#EEE7DB]/70 dark:bg-white/[0.03] border-t border-[#BA7B39]/30">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
        <div className="space-y-4 min-w-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#8B4A2F] font-bold">Fil avec {prenom}</p>
            <p className="text-xs text-[#293027]/60 dark:text-white/60 mt-1">Les courriels partent de {TEAM_EMAIL}. Si {prenom} répond, la réponse arrive dans cette boîte.</p>
          </div>
          {abonne.question && (
            <div className="rounded-xl border border-[#BA7B39]/40 bg-white/70 dark:bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-[#8B4A2F] font-bold mb-1">Sa question</p>
              <p className="text-sm text-[#293027] dark:text-white whitespace-pre-wrap leading-relaxed">{abonne.question}</p>
            </div>
          )}
          {chargement ? (
            <p className="text-xs text-[#293027]/50 dark:text-white/50"><i className="fa-solid fa-circle-notch fa-spin mr-2" />Chargement du fil…</p>
          ) : fil.length === 0 ? (
            <p className="text-xs text-[#293027]/50 dark:text-white/50">Aucune réponse envoyée pour l'instant.</p>
          ) : (
            <ul className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {fil.map(r => (
                <li key={r.id} className="rounded-xl bg-white/70 dark:bg-white/5 border border-[#293027]/8 dark:border-white/10 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-[#293027] dark:text-white truncate">{r.sujet}</p>
                    <p className="text-[11px] text-[#293027]/50 dark:text-white/50 shrink-0">{r.envoyeLe?.toDate().toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }) || '…'}</p>
                  </div>
                  <p className="mt-1 text-sm text-[#293027]/75 dark:text-white/75 whitespace-pre-wrap leading-relaxed">{r.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 min-w-0">
          <div>
            <Label>Sujet</Label>
            <Input value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Sujet du courriel" maxLength={200} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={7}
              placeholder={`Écrivez à ${prenom}… Votre signature « Krystine St-Laurent » s'ajoute d'elle-même.`}
              maxLength={10000}
            />
          </div>
          {etat && (
            <div className={`px-4 py-3 rounded-xl text-sm ${etat.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{etat.texte}</div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <GhostButton type="button" onClick={onClose}>Fermer</GhostButton>
            <PrimaryButton type="button" onClick={envoyer} disabled={envoi || !sujet.trim() || !message.trim()}>
              <i className={`fa-solid ${envoi ? 'fa-circle-notch fa-spin' : 'fa-paper-plane'}`} /> {envoi ? 'Envoi…' : 'Envoyer le courriel'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReponsePanel;
