import React, { useEffect, useState } from 'react';
import { Card, ToggleSwitch } from '../primitives';
import { SKINS, skinEnTravail, type Skin, type SkinsSettings } from '../../../lib/pointsConfig';
import { COFFRES } from '../../../lib/coffresConfig';
import { subscribeToSkinsSettings, setSkinEnTravail } from '../../../firebase/points';

// Le hook partagé : la lecture de settings/skins et le geste qui bascule une
// skin, réemployés tels quels par l'onglet Gamification (sous-section
// « Skins ») pour ne pas dupliquer l'abonnement Firestore.
export function useSkinsOverrides() {
  const [overrides, setOverrides] = useState<SkinsSettings>({});
  const [charge, setCharge] = useState(true);
  const [occupe, setOccupe] = useState<string | null>(null);
  useEffect(() => subscribeToSkinsSettings((s) => { setOverrides(s); setCharge(false); }), []);
  const basculer = async (cle: string, enCirculation: boolean) => {
    const id = `skin-${cle}`;
    setOccupe(id);
    try { await setSkinEnTravail(id, !enCirculation); } finally { setOccupe(null); }
  };
  return { overrides, charge, occupe, basculer };
}

// Les skins qu'on retire de la circulation pendant qu'on les met au point
// (Alex, 7 septembre 2026 : Vata, Pitta, Kapha, Aurore, Or pur, Féminité).
// Elles disparaissent de la boutique, des coffres et de la roue; une membre
// qui les a déjà les garde. Cette page les garde en mémoire et les rallume
// sans déploiement : elle écrit `settings/skins` (Firestore), que le code
// fusionne par-dessus le drapeau par défaut de chaque skin
// (SKINS[].enTravail dans src/lib/pointsConfig.ts, et son miroir serveur
// `skinsEnTravail` dans functions/src/coffres.ts).

const ouEllesEtaient = (s: Skin): string => {
  if (s.reserve === 'badge-bleu') return 'Réservée au Badge Bleu, jamais en boutique ni en coffre';
  if (s.rarete === 'legendaire') return `Légendaire · les trois coffres (${COFFRES.bronze.contenu.legendaire} % au bronze, ${COFFRES.argent.contenu.legendaire} % à l’argent, ${COFFRES.or.contenu.legendaire} % à l’or)`;
  if (s.coffre) return `Rare · coffre ${s.coffre === 'argent' ? 'd’argent' : s.coffre === 'or' ? 'd’or' : 'de bronze'} seulement`;
  return 'Petite boutique';
};

const SkinsATravaillerSection: React.FC = () => {
  const { overrides, charge, occupe, basculer } = useSkinsOverrides();

  // Le roster : les skins qu'Alex a nommées en travail par défaut. Un skin
  // remis en circulation reste listé ici (pour qu'on puisse la retravailler
  // et la recacher sans fouiller le code), seul son interrupteur bouge.
  const roster = SKINS.filter((s) => s.enTravail);

  if (charge) return <div className="flex justify-center py-12"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#8B4A2F]" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl text-[#293027] dark:text-white">Skins à travailler</h2>
        <p className="mt-1 max-w-2xl text-sm text-[#293027]/60 dark:text-white/60">
          Ces skins sont retirées de la boutique, des coffres et de la roue pendant qu’on les met au point. Une membre qui les a déjà les garde et peut les activer. Cochez « Remettre en circulation » pour qu’elles redeviennent obtenables, tout de suite et sans déploiement.
        </p>
      </div>
      <Card className="p-6">
        {roster.length === 0 && <p className="text-sm text-[#293027]/50 dark:text-white/50">Aucune skin en travail pour l’instant.</p>}
        <ul className="divide-y divide-[#293027]/10 dark:divide-white/10">
          {roster.map((s) => {
            const id = `skin-${s.cle}`;
            const enTravail = skinEnTravail(id, overrides);
            const pal = s.palette;
            return (
              <li key={s.cle} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                {/* L'aperçu : la même vignette de palette que la petite boutique. */}
                <div className="h-14 w-20 flex-none overflow-hidden rounded-[10px] p-2" style={{ background: pal.fond }} aria-hidden="true">
                  <div className="h-3 rounded-sm" style={{ background: `linear-gradient(90deg, ${pal.sombre ? pal.panneau : pal.encre}, ${pal.accent})` }} />
                  <div className="mt-1 flex gap-1">
                    <span className="h-1.5 w-6 rounded-full" style={{ background: pal.accent }} />
                    <span className="h-1.5 w-4 rounded-full" style={{ background: pal.encre, opacity: 0.3 }} />
                  </div>
                </div>
                <div className="min-w-[220px] flex-1">
                  <p className="font-serif text-lg text-[#293027] dark:text-white">
                    {s.nomFR}
                    {!enTravail && <span className="ml-2 rounded-full bg-[#BA7B39]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">En circulation</span>}
                  </p>
                  <p className="text-xs text-[#293027]/55 dark:text-white/55">{ouEllesEtaient(s)}</p>
                </div>
                <div className="flex items-center gap-3">
                  {occupe === id && <i className="fa-solid fa-circle-notch fa-spin text-xs text-[#8B4A2F]" />}
                  <ToggleSwitch checked={!enTravail} onChange={(v) => basculer(s.cle, v)} label="Remettre en circulation" />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
};

export default SkinsATravaillerSection;
