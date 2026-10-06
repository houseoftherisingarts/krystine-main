import React, { useEffect, useState } from 'react';
import { doc, getDoc, type Timestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app, { db } from '../../../../firebase';
import { Card, GhostButton } from '../../primitives';

// Le bilan du matin (6 oct. 2026) : le même texte que le courriel de 6 h 30,
// rangé par la fonction filetDuMatin dans sante/bilanDuMatin (functions/src/bilan.ts).
// « Refaire » recalcule le bilan sans renvoyer de courriel.

interface Bilan { texte?: string; verdict?: 'ok' | 'alerte'; le?: Timestamp; surveiller?: string }

const BilanDuMatinCard: React.FC = () => {
  const [bilan, setBilan] = useState<Bilan | null | undefined>(undefined);
  const [occupe, setOccupe] = useState(false);

  const lire = () => {
    if (!db) { setBilan(null); return; }
    getDoc(doc(db, 'sante', 'bilanDuMatin')).then(s => setBilan(s.exists() ? (s.data() as Bilan) : null)).catch(() => setBilan(null));
  };
  useEffect(lire, []);

  const refaire = async () => {
    if (!app) return;
    setOccupe(true);
    try { await httpsCallable(getFunctions(app, 'us-central1'), 'lancerBilan', { timeout: 300_000 })({ envoyer: false }); lire(); }
    catch { /* le bilan précédent reste affiché */ }
    finally { setOccupe(false); }
  };

  const quand = bilan?.le?.toDate?.().toLocaleString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  // Le texte du courriel sans sa salutation ni sa signature.
  const corps = (bilan?.texte || '').replace(/^Bonjour Krystine,\s*/, '').replace(/\n+Le même bilan est dans l’admin[\s\S]*$/, '');

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Le bilan du matin</h3>
          <p className="text-[12px] text-[#38403a]/60 dark:text-white/50">
            {bilan === undefined ? 'Lecture…' : quand ? `Fait le ${quand}. Il arrive aussi chaque matin vers 6 h 30 dans votre boîte.` : 'Le premier bilan arrivera demain matin vers 6 h 30.'}
          </p>
        </div>
        <GhostButton onClick={refaire} disabled={occupe}>
          <i className={`fa-solid ${occupe ? 'fa-spinner fa-spin' : 'fa-rotate'}`} /> {occupe ? 'Bilan en cours' : 'Refaire maintenant'}
        </GhostButton>
      </div>
      {bilan?.verdict && (
        <p className={`mb-3 inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${bilan.verdict === 'ok' ? 'bg-[#2D4A3E]/10 text-[#2D4A3E]' : 'bg-[#BC4A3C]/10 text-[#BC4A3C]'}`}>
          {bilan.verdict === 'ok' ? 'Tout fonctionne' : 'Un point à vérifier'}
        </p>
      )}
      {corps && <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-[#38403a] dark:text-white/80">{corps}</pre>}
    </Card>
  );
};

export default BilanDuMatinCard;
