import React, { useState } from 'react';
import { updateMember, type MemberDoc } from '../../firebase/firestore';

// Deux interrupteurs, un seul document : members/{uid}.prefs. Les deux
// émetteurs (notifierBillet, annoncerChangement) lisent ces mêmes champs
// côté serveur — voir functions/src/notifs.ts.
//
// Le bloc « À propos de vous » (pays, région, année de naissance) écrit dans
// les mêmes champs sur members/{uid} (Krystine, 7 septembre 2026) : facultatif,
// pour que le tableau de bord admin puisse un jour regrouper sa communauté
// par pays ou par tranche d'âge (voir firebase/detailsCompteurs.ts).

const PAYS_OPTIONS = ['Canada', 'France', 'Belgique', 'Suisse', 'États-Unis', 'Autre'];
const ANNEE_MIN = 1920;

const Interrupteur: React.FC<{ actif: boolean; occupe: boolean; onToggle: () => void; titre: string; sous: string }> = ({ actif, occupe, onToggle, titre, sous }) => (
  <div className="flex items-center justify-between gap-4 py-3.5 border-b border-[#38403a]/8 dark:border-white/10 last:border-b-0">
    <span className="min-w-0">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-[#38403a] dark:text-white">{titre}</span>
      <span className="block mt-1 text-xs leading-relaxed text-[#38403a]/60 dark:text-white/55">{sous}</span>
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={occupe}
      onClick={onToggle}
      className="relative h-6 w-11 flex-none rounded-full transition-colors disabled:opacity-50"
      style={{ background: actif ? '#BA7B39' : 'rgba(56,64,58,0.18)' }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{ transform: actif ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  </div>
);

const ClientPreferences: React.FC<{ uid: string; member: MemberDoc | null; lang: string }> = ({ uid, member, lang }) => {
  const fr = lang !== 'EN';
  const [prefs, setPrefs] = useState({
    courrielBillets: member?.prefs?.courrielBillets !== false,
    courrielChangements: member?.prefs?.courrielChangements !== false,
  });
  const [occupe, setOccupe] = useState<string | null>(null);

  const basculer = async (cle: 'courrielBillets' | 'courrielChangements') => {
    const valeur = !prefs[cle];
    setOccupe(cle);
    setPrefs((p) => ({ ...p, [cle]: valeur }));
    try {
      await updateMember(uid, { prefs: { ...prefs, [cle]: valeur } });
    } catch {
      setPrefs((p) => ({ ...p, [cle]: !valeur }));
    } finally {
      setOccupe(null);
    }
  };

  const anneeMax = new Date().getFullYear();
  const [profil, setProfil] = useState({
    pays: member?.pays || '',
    region: member?.region || '',
    anneeNaissance: member?.anneeNaissance ? String(member.anneeNaissance) : '',
  });
  const [etatProfil, setEtatProfil] = useState<'repos' | 'occupe' | 'enregistre'>('repos');
  const anneeInvalide = profil.anneeNaissance !== ''
    && (Number.isNaN(Number(profil.anneeNaissance)) || Number(profil.anneeNaissance) < ANNEE_MIN || Number(profil.anneeNaissance) > anneeMax);

  const enregistrerProfil = async () => {
    if (anneeInvalide) return;
    setEtatProfil('occupe');
    const patch: Partial<MemberDoc> = {};
    if (profil.pays) patch.pays = profil.pays;
    if (profil.region.trim()) patch.region = profil.region.trim();
    if (profil.anneeNaissance) patch.anneeNaissance = Number(profil.anneeNaissance);
    try {
      await updateMember(uid, patch);
      setEtatProfil('enregistre');
      setTimeout(() => setEtatProfil('repos'), 2000);
    } catch {
      setEtatProfil('repos');
    }
  };

  return (
    <div className="space-y-5">
      <div className="w-full rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
          {fr ? 'À propos de vous' : 'About you'}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#38403a]/60 dark:text-white/55">
          {fr ? 'Facultatif — aide Krystine à mieux comprendre qui la lit.' : 'Optional — helps Krystine understand who reads her.'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#38403a]/60 dark:text-white/60">{fr ? 'Pays' : 'Country'}</span>
            <select
              value={profil.pays}
              onChange={(e) => setProfil((p) => ({ ...p, pays: e.target.value }))}
              className="w-full rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2.5 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-white/5 dark:text-white"
            >
              <option value="">{fr ? 'Choisir…' : 'Choose…'}</option>
              {PAYS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#38403a]/60 dark:text-white/60">{fr ? 'Province ou région' : 'Province or region'}</span>
            <input
              type="text"
              value={profil.region}
              onChange={(e) => setProfil((p) => ({ ...p, region: e.target.value }))}
              placeholder={fr ? 'Québec, Ontario, Île-de-France…' : 'Quebec, Ontario, Île-de-France…'}
              className="w-full rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2.5 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#38403a]/60 dark:text-white/60">{fr ? 'Année de naissance' : 'Birth year'}</span>
            <input
              type="number"
              inputMode="numeric"
              min={ANNEE_MIN}
              max={anneeMax}
              value={profil.anneeNaissance}
              onChange={(e) => setProfil((p) => ({ ...p, anneeNaissance: e.target.value }))}
              placeholder="1980"
              className="w-full max-w-[10rem] rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2.5 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
            {anneeInvalide && (
              <span className="mt-1 block text-[11px] text-red-500">{fr ? `Entre ${ANNEE_MIN} et ${anneeMax}.` : `Between ${ANNEE_MIN} and ${anneeMax}.`}</span>
            )}
          </label>
        </div>
        <button
          type="button"
          onClick={enregistrerProfil}
          disabled={etatProfil === 'occupe' || anneeInvalide}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#293027] hover:text-[#8B4A2F] disabled:opacity-50"
        >
          <i className={`fa-solid ${etatProfil === 'enregistre' ? 'fa-check' : 'fa-floppy-disk'}`} />
          {etatProfil === 'enregistre' ? (fr ? 'Enregistré' : 'Saved') : (fr ? 'Enregistrer' : 'Save')}
        </button>
      </div>

      <div className="w-full rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
          {fr ? 'Notifications par courriel' : 'Email notifications'}
        </p>
        <div className="mt-3">
          <Interrupteur
            actif={prefs.courrielBillets}
            occupe={occupe === 'courrielBillets'}
            onToggle={() => basculer('courrielBillets')}
            titre={fr ? 'Nouveaux billets' : 'New posts'}
            sous={fr ? 'Les nouveaux billets de Krystine et du Foyer' : 'New posts from Krystine and the Foyer'}
          />
          <Interrupteur
            actif={prefs.courrielChangements}
            occupe={occupe === 'courrielChangements'}
            onToggle={() => basculer('courrielChangements')}
            titre={fr ? 'Nouveautés du site' : 'Site updates'}
            sous={fr ? 'Les nouveautés et changements du site' : "What's new and what changed on the site"}
          />
        </div>
      </div>
    </div>
  );
};

export default ClientPreferences;
