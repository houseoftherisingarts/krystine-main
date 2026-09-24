import React, { useMemo, useState } from 'react';
import type { Lecon } from '../../../firebase/formations';
import { ORIGINE, PILIERS, type Pilier, rayonDeLecon, semaineDeLecon, titreDeLecon, titreDeModule } from '../../../pages/origine2/piliers';

// La liste des leçons de l'Expérience Origine : trois piliers repliés, chacun
// avec ses quatre semaines, encadrés par « Avant le parcours » et la
// bibliothèque. Tout est aligné sur la même grille : un pilier, ses semaines,
// leurs leçons, rien en quinconce.

const ICONES: Record<string, string> = { video: 'fa-circle-play', audio: 'fa-music', pdf: 'fa-file-pdf', fichier: 'fa-file', texte: 'fa-align-left' };

interface Semaine { n: number; titre: string; items: Lecon[] }
interface Groupe { cle: string; titre: string; items: Lecon[] }

interface Props {
  lecons: Lecon[];
  courante: Lecon | null;
  terminees: Record<string, boolean>;
  verrouillee: (l: Lecon) => boolean;
  vignetteDe: (l: Lecon) => string | undefined;
  onOuvrir: (l: Lecon) => void;
  lang: 'FR' | 'EN';
}

const Repli: React.FC<{ ouvert: boolean; children: React.ReactNode }> = ({ ouvert, children }) => (
  <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: ouvert ? '1fr' : '0fr' }}>
    <div className="min-h-0 overflow-hidden">{children}</div>
  </div>
);

const ListeOrigine: React.FC<Props> = ({ lecons, courante, terminees, verrouillee, vignetteDe, onOuvrir, lang }) => {
  const fr = lang === 'FR';
  const { avant, parPilier, bibli } = useMemo(() => {
    const avant: Groupe[] = [];
    const bibli: Groupe[] = [];
    const semaines = new Map<number, Semaine>();
    const pousser = (liste: Groupe[], l: Lecon) => {
      const cle = l.moduleNom || '';
      const g = liste.find(x => x.cle === cle);
      if (g) g.items.push(l); else liste.push({ cle, titre: titreDeModule(cle) || (fr ? 'Pour commencer' : 'To begin'), items: [l] });
    };
    for (const l of lecons) {
      const rayon = rayonDeLecon(l);
      if (rayon === 'avant') pousser(avant, l);
      else if (rayon === 'bibliotheque') pousser(bibli, l);
      else {
        const n = semaineDeLecon(l);
        const s = semaines.get(n) || { n, titre: titreDeModule(l.moduleNom || ''), items: [] };
        if (!s.titre) s.titre = titreDeModule(l.moduleNom || '');
        s.items.push(l);
        semaines.set(n, s);
      }
    }
    const parPilier = PILIERS.map(p => ({ pilier: p, semaines: p.semaines.map(n => semaines.get(n) || { n, titre: '', items: [] as Lecon[] }) }));
    return { avant, parPilier, bibli };
  }, [lecons, fr]);

  const pilierCourant = courante ? PILIERS.find(p => p.semaines.includes(semaineDeLecon(courante)))?.rang : undefined;
  const rayonCourant = courante ? rayonDeLecon(courante) : undefined;
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});
  const estOuvert = (cle: string, defaut: boolean) => (ouverts[cle] === undefined ? defaut : ouverts[cle]);
  const basculer = (cle: string, defaut: boolean) => setOuverts(o => ({ ...o, [cle]: !estOuvert(cle, defaut) }));

  const Lecons: React.FC<{ items: Lecon[]; sombre?: boolean }> = ({ items, sombre }) => (
    <ul className="space-y-0.5">
      {items.map(l => {
        const verrou = verrouillee(l);
        const active = courante?.id === l.id;
        const faite = !!terminees[l.id];
        const v = !verrou && vignetteDe(l);
        return (
          <li key={l.id}>
            <button type="button" onClick={() => onOuvrir(l)} disabled={verrou}
              className={`grid w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-[13px] leading-snug transition-colors ${
                active ? 'bg-[#b8923a] text-[#26290f]' : verrou ? 'cursor-not-allowed opacity-45' : sombre ? 'text-[#f3ead2]/90 hover:bg-white/10' : 'text-[#26290f]/85 hover:bg-[#26290f]/6'
              }`}>
              {v ? (
                <img src={v} alt="" className="h-10 w-10 rounded-[8px] object-cover" />
              ) : (
                <span className={`flex h-10 w-10 items-center justify-center rounded-[8px] ${active ? 'bg-[#26290f]/12' : sombre ? 'bg-white/10' : 'bg-[#26290f]/8'}`}>
                  <i className={`fa-solid ${verrou ? 'fa-lock' : faite ? 'fa-circle-check' : ICONES[l.type] || 'fa-file'} text-[13px] ${faite && !active ? 'text-[#b8923a]' : ''}`} />
                </span>
              )}
              <span className="min-w-0 truncate">{titreDeLecon(l.titre)}</span>
              <span className="text-[10px] uppercase tracking-wider opacity-60">{l.duree || ''}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const Tete: React.FC<{ cle: string; defaut: boolean; children: React.ReactNode; style?: React.CSSProperties; className?: string }> = ({ cle, defaut, children, style, className = '' }) => (
    <button type="button" onClick={() => basculer(cle, defaut)} aria-expanded={estOuvert(cle, defaut)}
      className={`flex w-full items-center justify-between gap-3 text-left ${className}`} style={style}>
      {children}
      <i className={`fa-solid fa-chevron-down shrink-0 text-[11px] transition-transform ${estOuvert(cle, defaut) ? '' : '-rotate-90'}`} aria-hidden />
    </button>
  );

  const GroupeNeutre: React.FC<{ cle: string; titre: string; groupes: Groupe[]; defaut: boolean }> = ({ cle, titre, groupes, defaut }) => (
    <div className="rounded-[15px] border" style={{ borderColor: `${ORIGINE.olive}33`, background: ORIGINE.cremeSombre }}>
      <Tete cle={cle} defaut={defaut} className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ORIGINE.olive }}>
        <span>{titre} <span className="ml-1 normal-case tracking-normal opacity-60">{groupes.reduce((n, g) => n + g.items.length, 0)}</span></span>
      </Tete>
      <Repli ouvert={estOuvert(cle, defaut)}>
        <div className="space-y-3 px-2 pb-3">
          {groupes.map(g => (
            <div key={g.cle}>
              {groupes.length > 1 && <p className="px-2 pb-1 text-[11px] font-semibold" style={{ color: ORIGINE.encre }}>{g.titre}</p>}
              <Lecons items={g.items} />
            </div>
          ))}
        </div>
      </Repli>
    </div>
  );

  const BlocPilier: React.FC<{ pilier: Pilier; semaines: Semaine[] }> = ({ pilier, semaines }) => {
    const cle = `pilier-${pilier.rang}`;
    const defaut = pilierCourant === pilier.rang;
    const nb = semaines.reduce((n, s) => n + s.items.length, 0);
    const faites = semaines.reduce((n, s) => n + s.items.filter(l => terminees[l.id]).length, 0);
    const sombre = pilier.rang !== 3;
    return (
      <div className="overflow-hidden rounded-[15px]" style={{ background: pilier.fond, color: pilier.encre }}>
        <Tete cle={cle} defaut={defaut} className="px-4 py-4">
          <span className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3">
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full font-serif text-sm" style={{ border: `1px solid ${pilier.liseret}`, color: pilier.liseret }}>{pilier.roman}</span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: pilier.liseret }}>{fr ? 'Pilier' : 'Pillar'} {pilier.roman} · {fr ? pilier.nom.fr : pilier.nom.en}</span>
              <span className="block truncate font-serif text-[15px] leading-tight">{pilier.titre}</span>
              <span className="block text-[11px] opacity-70">{fr ? 'Semaines' : 'Weeks'} {pilier.semaines[0]} {fr ? 'à' : 'to'} {pilier.semaines[3]} · {faites}/{nb}</span>
            </span>
          </span>
        </Tete>
        <Repli ouvert={estOuvert(cle, defaut)}>
          <div className="space-y-2 px-2 pb-2">
            {semaines.map(s => (
              <div key={s.n} className="rounded-[12px] px-2 pb-2 pt-2" style={{ background: sombre ? 'rgba(255,255,255,0.06)' : 'rgba(38,41,15,0.06)' }}>
                <p className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 px-2 pb-1.5">
                  <span className="font-serif text-lg leading-none opacity-90">{s.n}</span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] opacity-75">{fr ? 'Semaine' : 'Week'} {s.n}</span>
                    {s.titre && <span className="block truncate text-[12px] opacity-90">{s.titre}</span>}
                  </span>
                </p>
                {s.items.length ? <Lecons items={s.items} sombre={sombre} /> : (
                  <p className="px-2 pb-1 text-[11px] opacity-60">{fr ? 'Se dépose au fil de la cohorte.' : 'Arrives as the cohort unfolds.'}</p>
                )}
              </div>
            ))}
          </div>
        </Repli>
      </div>
    );
  };

  return (
    <nav aria-label={fr ? 'Les leçons' : 'Lessons'} className="space-y-2">
      {avant.length > 0 && <GroupeNeutre cle="avant" titre={fr ? 'Avant le parcours' : 'Before the path'} groupes={avant} defaut={rayonCourant === 'avant'} />}
      {parPilier.map(({ pilier, semaines }) => <BlocPilier key={pilier.rang} pilier={pilier} semaines={semaines} />)}
      {bibli.length > 0 && <GroupeNeutre cle="bibli" titre={fr ? 'Bibliothèque' : 'Library'} groupes={bibli} defaut={rayonCourant === 'bibliotheque'} />}
    </nav>
  );
};

export default ListeOrigine;
