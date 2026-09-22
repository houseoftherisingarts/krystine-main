// Les trois boutons de dépôt des livres en PDF, demandés par Alex le 22
// septembre 2026 : « deux boutons, téléverser livre 1, livre 2, livre 3, trois
// boutons pardon ». Chaque livre a sa place fixe dans Storage, si bien qu'Alex
// les retrouve depuis le code sans chercher. Les fichiers restent privés.
import React, { useRef, useState } from 'react';
import {
  TAILLE_MAX_LIVRE, retirerLivre, televerserLivre, type LivreDepose, type NumeroLivre,
} from '../../../../firebase/planMois';

const poids = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} ko` : `${(n / (1024 * 1024)).toFixed(1)} Mo`);
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const enLettres = (d: Date): string => `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;

const NUMEROS: NumeroLivre[] = [1, 2, 3];

interface Props {
  livres: Partial<Record<`livre-${NumeroLivre}`, LivreDepose>>;
  accent: string;
  encre: string;
  onErreur: (message: string) => void;
}

const Livre: React.FC<{ n: NumeroLivre; fiche?: LivreDepose; accent: string; encre: string; onErreur: (m: string) => void }> = ({ n, fiche, accent, encre, onErreur }) => {
  const entree = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [retrait, setRetrait] = useState(false);

  const choisir = () => entree.current?.click();

  const deposer = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (entree.current) entree.current.value = '';
    if (!file) return;
    const estPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!estPdf) { onErreur(`Le livre ${n} doit être un PDF : « ${file.name} » n'en est pas un.`); return; }
    if (file.size > TAILLE_MAX_LIVRE) { onErreur(`Le livre ${n} pèse ${poids(file.size)}, au-delà des 300 Mo permis.`); return; }
    setPct(0);
    try {
      await televerserLivre(n, file, setPct).done;
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      onErreur(code.includes('unauthorized') || code.includes('permission')
        ? `Le dépôt du livre ${n} a été refusé : les règles ne sont pas encore en ligne. Réessayez après la prochaine publication.`
        : `Le dépôt du livre ${n} n'a pas passé. Vérifiez la connexion et réessayez.`);
    } finally {
      setPct(null);
    }
  };

  const retirer = async () => {
    if (!fiche) return;
    if (!window.confirm(`Retirer le livre ${n} (${fiche.nom}) ?`)) return;
    setRetrait(true);
    try { await retirerLivre(n); } catch { onErreur(`Le retrait du livre ${n} n'a pas passé.`); } finally { setRetrait(false); }
  };

  const enCours = pct !== null;
  const date = fiche?.deposeLe?.toDate ? fiche.deposeLe.toDate() : null;

  return (
    <div className="flex min-w-0 flex-col rounded-[12px] border bg-white/70 px-4 py-4" style={{ borderColor: fiche ? accent : '#e3ddd0' }}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-[15px] font-semibold text-white" style={{ backgroundColor: accent }}>{n}</span>
        <span className="font-serif text-[17px] text-[#1c1712]">Livre {n}</span>
        {fiche && <i className="fa-solid fa-circle-check ml-auto text-[15px]" style={{ color: accent }} aria-label="Déposé" />}
      </div>

      <div className="mt-3 min-h-[44px] text-[13px] leading-snug text-[#5a554c]">
        {enCours ? (
          <div>
            <div className="mb-1 flex items-baseline justify-between"><span>Envoi en cours</span><span className="tabular-nums">{Math.round(pct)} %</span></div>
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#eee7db]">
              <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, backgroundColor: accent }} />
            </div>
          </div>
        ) : fiche ? (
          <div className="min-w-0">
            <p className="truncate font-medium text-[#1c1712]" title={fiche.nom}>{fiche.nom}</p>
            <p>{poids(fiche.taille)}{date ? ` · déposé le ${enLettres(date)}` : ''}</p>
          </div>
        ) : (
          <p>Aucun fichier pour l'instant. Un PDF, jusqu'à 300 Mo.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={choisir}
          disabled={enCours || retrait}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_8px_22px_-12px_rgba(0,0,0,0.5)] transition-[background-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: encre }}
        >
          <i className="fa-solid fa-file-arrow-up" />
          {fiche ? `Remplacer le livre ${n}` : `Téléverser le livre ${n}`}
        </button>
        {fiche && !enCours && (
          <button type="button" onClick={retirer} disabled={retrait} className="text-[13px] font-semibold text-[#7a7f76] underline-offset-2 hover:text-[#9e3d57] hover:underline disabled:opacity-50">
            {retrait ? 'Retrait…' : 'Retirer'}
          </button>
        )}
      </div>
      <input ref={entree} type="file" accept=".pdf,application/pdf" className="hidden" onChange={deposer} />
    </div>
  );
};

const LivresSources: React.FC<Props> = ({ livres, accent, encre, onErreur }) => (
  <div className="rounded-[12px] border px-4 py-4" style={{ borderColor: '#e9c9bd', backgroundColor: '#fff9f6' }}>
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="font-serif text-[18px] text-[#1c1712]">Vos trois livres, en PDF</h4>
      <p className="text-[13px] text-[#5a554c]">Déposés ici, ils restent privés : vous et Alex seulement, et Alex les lit depuis le code.</p>
    </div>
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {NUMEROS.map(n => <Livre key={n} n={n} fiche={livres[`livre-${n}`]} accent={accent} encre={encre} onErreur={onErreur} />)}
    </div>
  </div>
);

export default LivresSources;
