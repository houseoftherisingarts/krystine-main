import React, { useEffect, useState } from 'react';
import {
  monCodeParrain, listerMesFilleules, maMarraine,
  PALIERS_BADGES, CADEAUX_PARRAINAGE, type Filleule,
} from '../../firebase/parrainage';
import { getMember } from '../../firebase/firestore';
import { getBadgesDe, CATALOGUE_BADGES } from '../../firebase/badgesCatalogue';

// Le panneau de parrainage de l'espace client (porté du FMM) : le code et le
// lien à partager, les deux compteurs, les paliers de badges gagnés par les
// invitations, les paliers de cadeaux gagnés par les filleules qui achètent,
// et la liste des filleules. Tout est en lecture : les compteurs, les badges
// et les cadeaux se posent côté serveur.

const LIEN_BASE = 'https://www.krystinestlaurent.ca/compte?parrain=';

const Palier: React.FC<{ atteint: boolean; icone: string; titre: string; sous: string }> = ({ atteint, icone, titre, sous }) => (
  <li className={`flex items-start gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${atteint ? 'border-[#BA7B39]/70 bg-[#BA7B39]/10' : 'border-white/50 bg-white/30 dark:border-white/10 dark:bg-white/5'}`}>
    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${atteint ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#38403a]/8 text-[#8B4A2F] dark:bg-white/10'}`}>
      <i className={`fa-solid ${atteint ? 'fa-check' : icone} text-[11px]`} />
    </span>
    <span className="min-w-0">
      <span className={`block text-[12px] font-semibold leading-snug ${atteint ? 'text-[#38403a] dark:text-white' : 'text-[#38403a]/75 dark:text-white/70'}`}>{titre}</span>
      <span className="block text-[10.5px] text-[#38403a]/55 dark:text-white/50">{sous}</span>
    </span>
  </li>
);

const ClientParrainage: React.FC<{ uid: string; lang: string }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const [code, setCode] = useState('');
  const [copie, setCopie] = useState(false);
  const [invitees, setInvitees] = useState(0);
  const [acheteuses, setAcheteuses] = useState(0);
  const [accesVie, setAccesVie] = useState(false);
  const [badges, setBadges] = useState<string[]>([]);
  const [filleules, setFilleules] = useState<Filleule[]>([]);
  const [codeMarraine, setCodeMarraine] = useState<string | null>(null);

  useEffect(() => {
    monCodeParrain(uid).then(setCode).catch(() => {});
    getMember(uid).then(m => {
      setInvitees(m?.filleules || 0);
      setAcheteuses(m?.filleulesAcheteuses || 0);
      setAccesVie(!!m?.accesVie);
    }).catch(() => {});
    getBadgesDe(uid).then(setBadges).catch(() => {});
    listerMesFilleules(uid).then(setFilleules).catch(() => {});
    maMarraine(uid).then(setCodeMarraine).catch(() => {});
  }, [uid]);

  const lien = code ? LIEN_BASE + code : '';
  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* noop */ }
  };
  const encore = (n: number, mot: string) => (fr ? `Encore ${n} ${mot}` : `${n} more ${mot}`);
  const prochainCadeau = CADEAUX_PARRAINAGE.find(c => acheteuses < c.seuil);

  return (
    <div className="rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
        {fr ? 'Invitez vos proches' : 'Invite your circle'}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#38403a]/65 dark:text-white/60">
        {fr
          ? 'Chaque personne qui crée son compte par votre lien devient votre filleule. Les invitations vous valent des badges, et chaque filleule qui suit une formation vous ouvre un cadeau.'
          : 'Everyone who joins through your link becomes your invitee. Invitations earn you badges, and every invitee who takes a course unlocks a gift for you.'}
      </p>

      {code && (
        <div className="mt-4">
          <p className="font-['Cormorant_Garamond'] lining-nums text-[34px] leading-none tracking-[0.18em] text-[#38403a] dark:text-white">{code}</p>
          <button
            type="button"
            onClick={copier}
            className="mt-3 flex w-full items-center gap-2 rounded-full border border-[#BA7B39]/50 bg-white/60 px-4 py-2 text-left text-[11px] text-[#38403a]/80 transition-colors hover:border-[#BA7B39] dark:bg-white/5 dark:text-white/80"
          >
            <i className={`fa-solid ${copie ? 'fa-check text-green-600' : 'fa-copy text-[#8B4A2F]'}`} />
            <span className="truncate">{copie ? (fr ? 'Lien copié !' : 'Link copied!') : (fr ? 'Copier mon lien d\'invitation' : 'Copy my invitation link')}</span>
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#38403a]/5 px-3 py-2.5 dark:bg-white/5">
          <p className="font-['Cormorant_Garamond'] lining-nums text-[28px] leading-none text-[#38403a] dark:text-white">{invitees}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8B4A2F]">{fr ? (invitees === 1 ? 'Invitée' : 'Invitées') : (invitees === 1 ? 'Invitee' : 'Invitees')}</p>
        </div>
        <div className="rounded-2xl bg-[#BA7B39]/12 px-3 py-2.5">
          <p className="font-['Cormorant_Garamond'] lining-nums text-[28px] leading-none text-[#38403a] dark:text-white">{acheteuses}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8B4A2F]">{fr ? (acheteuses === 1 ? 'Filleule' : 'Filleules') : (acheteuses === 1 ? 'Invitee' : 'Invitees')}</p>
        </div>
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F]">{fr ? 'Les badges' : 'Badges'}</p>
      <ul className="mt-2 space-y-1.5">
        {PALIERS_BADGES.map(p => {
          const atteint = badges.includes(p.badgeId) || invitees >= p.seuil;
          const b = CATALOGUE_BADGES[p.badgeId];
          return (
            <Palier
              key={p.badgeId}
              atteint={atteint}
              icone={b?.icone || 'fa-seedling'}
              titre={b?.nom || p.badgeId}
              sous={atteint
                ? (fr ? 'Obtenu' : 'Earned')
                : encore(p.seuil - invitees, fr ? (p.seuil - invitees > 1 ? 'invitations' : 'invitation') : (p.seuil - invitees > 1 ? 'invitations' : 'invitation'))}
            />
          );
        })}
      </ul>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F]">{fr ? 'Les cadeaux' : 'Gifts'}</p>
      <p className="mt-1 text-[10.5px] text-[#38403a]/55 dark:text-white/50">
        {fr ? 'Ils s\'ouvrent quand vos filleules suivent une formation.' : 'They unlock when your invitees take a course.'}
      </p>
      <ul className="mt-2 space-y-1.5">
        {CADEAUX_PARRAINAGE.map(c => {
          const atteint = acheteuses >= c.seuil || (c.seuil === 20 && accesVie);
          const reste = c.seuil - acheteuses;
          return (
            <Palier
              key={c.seuil}
              atteint={atteint}
              icone={c.icone}
              titre={fr ? c.fr : c.en}
              sous={atteint
                ? (fr ? 'Offert, déjà dans vos formations' : 'Yours, already in your courses')
                : encore(reste, fr ? (reste > 1 ? 'filleules' : 'filleule') : (reste > 1 ? 'invitees' : 'invitee'))}
            />
          );
        })}
      </ul>
      {prochainCadeau && acheteuses > 0 && (
        <p className="mt-2 text-[10.5px] text-[#8B4A2F]">
          {fr
            ? `Prochain cadeau à ${prochainCadeau.seuil} filleules.`
            : `Next gift at ${prochainCadeau.seuil} invitees.`}
        </p>
      )}

      {filleules.length > 0 && (
        <>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B4A2F]">{fr ? 'Vos filleules' : 'Your invitees'}</p>
          <ul className="mt-2 space-y-1">
            {filleules.slice(0, 12).map(f => (
              <li key={f.uid} className="flex items-center gap-2 text-[11.5px] text-[#38403a]/80 dark:text-white/75">
                <span className={`h-1.5 w-1.5 rounded-full ${f.achatCompte ? 'bg-[#BA7B39]' : 'bg-[#38403a]/25 dark:bg-white/25'}`} />
                <span className="truncate">{f.nom || (fr ? 'Une filleule' : 'An invitee')}</span>
                {f.achatCompte && <span className="ml-auto text-[9.5px] uppercase tracking-[0.15em] text-[#8B4A2F]">{fr ? 'en formation' : 'enrolled'}</span>}
              </li>
            ))}
            {filleules.length > 12 && (
              <li className="text-[10.5px] text-[#38403a]/50">{fr ? `et ${filleules.length - 12} autres` : `and ${filleules.length - 12} more`}</li>
            )}
          </ul>
        </>
      )}

      {codeMarraine && (
        <p className="mt-4 text-[10.5px] text-[#38403a]/50 dark:text-white/45">
          {fr ? `Vous êtes entrée grâce au code ${codeMarraine}.` : `You joined through code ${codeMarraine}.`}
        </p>
      )}
    </div>
  );
};

export default ClientParrainage;
