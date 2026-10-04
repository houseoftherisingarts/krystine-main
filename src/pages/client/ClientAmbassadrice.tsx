import React, { useEffect, useRef, useState } from 'react';
import { useSiteFlags } from '../../contexts/SiteFlagsContext';
import {
  monAmbassadrice, devenirAmbassadrice, reglerAmbassadrice, mesCommissions, getPartPremium,
  partDe, rabaisDe, dollars, aVenir, PAS, type Ambassadrice, type Commission,
} from '../../firebase/ambassadrices';

// Le panneau de l'ambassadrice dans l'espace membre. Trois états : rien
// (programme éteint et membre non inscrite), l'invitation à s'inscrire, puis
// le tableau de l'ambassadrice : son code, son partage entre le rabais de sa
// cliente et sa commission, et ce que ses ventes lui ont valu.

const LIEN_BASE = 'https://www.krystinestlaurent.ca/compte?parrain=';
const DOUX = 'cubic-bezier(0.23,1,0.32,1)';
const BOUTON_PAS = 'flex-1 rounded-full border border-[#BA7B39]/50 bg-white/60 px-3 py-2 text-[11px] font-semibold leading-tight text-[#38403a] transition-[border-color,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 dark:bg-white/5 dark:text-white [@media(hover:hover)]:hover:border-[#BA7B39]';

const ClientAmbassadrice: React.FC<{ uid: string; lang: string }> = ({ uid, lang }) => {
  const fr = lang === 'FR';
  const { ambassadricesOuvert } = useSiteFlags();
  const [a, setA] = useState<Ambassadrice | null>(null);
  const [pret, setPret] = useState(false);
  const [partPremium, setPartPremium] = useState<number | undefined>(undefined);
  const [rabais, setRabais] = useState(0);
  const [ventes, setVentes] = useState<Commission[]>([]);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [copie, setCopie] = useState(false);
  const ancre = useRef<HTMLDivElement>(null);

  const charger = () => Promise.all([monAmbassadrice(uid), getPartPremium()])
    .then(([amb, pp]) => {
      setA(amb); setPartPremium(pp);
      if (amb) { setRabais(rabaisDe(amb, pp)); mesCommissions(uid).then(setVentes).catch(() => {}); }
    })
    .catch(() => {})
    .finally(() => setPret(true));

  useEffect(() => { void charger(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [uid]);

  // L'accueil envoie ici avec ?ambassadrice=1 : le panneau vient sous les yeux.
  useEffect(() => {
    if (!pret || !ancre.current) return;
    if (new URLSearchParams(window.location.search).get('ambassadrice')) {
      ancre.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [pret]);

  if (!pret || (!a && !ambassadricesOuvert) || (a && a.actif === false)) return null;

  const carte = 'rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55';
  const surtitre = 'text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]';

  if (!a) {
    const devenir = async () => {
      setOccupe(true); setErreur('');
      try { await devenirAmbassadrice(); await charger(); }
      catch { setErreur(fr ? 'L\'inscription n\'a pas abouti. Réessayez dans un instant.' : 'Sign-up did not go through. Please try again in a moment.'); }
      finally { setOccupe(false); }
    };
    return (
      <div ref={ancre} className={carte}>
        <p className={surtitre}>{fr ? 'Le cercle des ambassadrices' : 'The ambassadors\' circle'}</p>
        <p className="mt-2 font-['Cormorant_Garamond'] text-[26px] leading-[1.1] text-[#38403a] dark:text-white">
          {fr ? 'Recommandez Krystine, et recevez votre part' : 'Recommend Krystine, and receive your share'}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[#38403a]/70 dark:text-white/65">
          {fr
            ? 'Les personnes qui créent leur compte avec votre code obtiennent 10 % de rabais sur les formations, et vous recevez 10 % de chacun de leurs achats.'
            : 'People who create their account with your code get 10% off courses, and you receive 10% of each of their purchases.'}
        </p>
        <button
          type="button"
          onClick={devenir}
          disabled={occupe}
          className="mt-4 w-full rounded-full bg-[#BA7B39] px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-[#293027] shadow-[0_8px_22px_-10px_rgba(186,123,57,0.8)] transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#9c6630]"
        >
          {occupe ? (fr ? 'Un instant…' : 'One moment…') : (fr ? 'Devenir ambassadrice' : 'Become an ambassador')}
        </button>
        <a href="/ambassadrices" className="mt-3 block text-center text-[13px] font-semibold text-[#8B4A2F] underline underline-offset-4 dark:text-[#e0b98a]">
          {fr ? 'Comprendre le programme' : 'Understand the program'}
        </a>
        {erreur && <p className="mt-2 text-[11px] text-[#8B4A2F]">{erreur}</p>}
      </div>
    );
  }

  const part = partDe(a, partPremium);
  const commission = part - rabais;
  const change = rabais !== rabaisDe(a, partPremium);
  const lien = LIEN_BASE + a.code;
  const du = ventes.filter(aVenir).reduce((s, v) => s + v.commission, 0);
  const verse = ventes.filter(v => v.statut === 'versee').reduce((s, v) => s + v.commission, 0);

  const copier = async () => {
    try { await navigator.clipboard.writeText(lien); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* noop */ }
  };
  const enregistrer = async () => {
    setOccupe(true); setErreur('');
    try { const r = await reglerAmbassadrice(rabais); setA({ ...a, rabaisClient: r.rabaisClient }); setRabais(r.rabaisClient); }
    catch { setErreur(fr ? 'Le partage n\'a pas été enregistré. Réessayez.' : 'Your split was not saved. Please try again.'); }
    finally { setOccupe(false); }
  };

  return (
    <div ref={ancre} className={carte}>
      <p className={surtitre}>
        {a.premium ? (fr ? 'Ambassadrice premium' : 'Premium ambassador') : (fr ? 'Ambassadrice' : 'Ambassador')}
      </p>
      <p className="mt-3 font-['Cormorant_Garamond'] lining-nums text-[34px] leading-none tracking-[0.18em] text-[#38403a] dark:text-white">{a.code}</p>
      <button
        type="button"
        onClick={copier}
        className="mt-3 flex w-full items-center gap-2 rounded-full border border-[#BA7B39]/50 bg-white/60 px-4 py-2 text-left text-[11px] text-[#38403a]/80 transition-[border-color,transform] duration-150 active:scale-[0.97] dark:bg-white/5 dark:text-white/80 [@media(hover:hover)]:hover:border-[#BA7B39]"
      >
        <i className={`fa-solid ${copie ? 'fa-check text-green-600' : 'fa-copy text-[#8B4A2F]'}`} />
        <span className="truncate">{copie ? (fr ? 'Lien copié !' : 'Link copied!') : (fr ? 'Copier mon lien d\'ambassadrice' : 'Copy my ambassador link')}</span>
      </button>

      <p className={`mt-6 ${surtitre}`}>{fr ? 'Votre partage' : 'Your split'}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#38403a]/65 dark:text-white/60">
        {fr
          ? `Sur chaque formation achetée grâce à vous, ${part} % se partagent entre votre cliente et vous, comme vous le décidez.`
          : `On every course bought through you, ${part}% is shared between your client and you, as you decide.`}
      </p>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-['Cormorant_Garamond'] lining-nums text-[40px] leading-none text-[#8B4A2F]">{rabais}&nbsp;%</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#38403a]/60 dark:text-white/55">{fr ? 'Rabais de votre cliente' : 'Your client\'s discount'}</p>
        </div>
        <div className="text-right">
          <p className="font-['Cormorant_Garamond'] lining-nums text-[40px] leading-none text-[#38403a] dark:text-white">{commission}&nbsp;%</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#38403a]/60 dark:text-white/55">{fr ? 'Votre commission' : 'Your commission'}</p>
        </div>
      </div>
      {/* La jauge du partage : le cuivre de la cliente avance sur l'ambre de l'ambassadrice. */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#BA7B39]/30" aria-hidden="true">
        <div
          className="h-full w-full origin-left rounded-full bg-[#8B4A2F] motion-reduce:transition-none"
          style={{ transform: `scaleX(${part ? rabais / part : 0})`, transition: `transform 220ms ${DOUX}` }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className={BOUTON_PAS} disabled={rabais >= part} onClick={() => setRabais(Math.min(part, rabais + PAS))}>
          {fr ? 'Donner plus à ma cliente' : 'Give my client more'}
        </button>
        <button type="button" className={BOUTON_PAS} disabled={rabais <= 0} onClick={() => setRabais(Math.max(0, rabais - PAS))}>
          {fr ? 'Garder plus pour moi' : 'Keep more for myself'}
        </button>
      </div>
      {commission === 0 && (
        <p className="mt-2 text-[11px] text-[#8B4A2F]">
          {fr ? 'Vous offrez votre part entière à votre cliente.' : 'You are giving your whole share to your client.'}
        </p>
      )}
      {change && (
        <button
          type="button"
          onClick={enregistrer}
          disabled={occupe}
          className="mt-3 w-full rounded-full bg-[#BA7B39] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#293027] transition-[background-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 [@media(hover:hover)]:hover:bg-[#9c6630]"
        >
          {occupe ? (fr ? 'Un instant…' : 'One moment…') : (fr ? 'Enregistrer mon partage' : 'Save my split')}
        </button>
      )}
      {erreur && <p className="mt-2 text-[11px] text-[#8B4A2F]">{erreur}</p>}

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-[#BA7B39]/12 px-3 py-2.5">
          <p className="font-['Cormorant_Garamond'] lining-nums text-[24px] leading-none text-[#38403a] dark:text-white">{dollars(du)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8B4A2F]">{fr ? 'À recevoir' : 'To receive'}</p>
        </div>
        <div className="rounded-2xl bg-[#38403a]/5 px-3 py-2.5 dark:bg-white/5">
          <p className="font-['Cormorant_Garamond'] lining-nums text-[24px] leading-none text-[#38403a] dark:text-white">{dollars(verse)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#8B4A2F]">{fr ? 'Déjà versé' : 'Already paid'}</p>
        </div>
      </div>

      {ventes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {ventes.slice(0, 8).map(v => (
            <li key={v.id} className="flex items-baseline gap-2 text-[11.5px] text-[#38403a]/80 dark:text-white/75">
              <span className={`h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full ${!aVenir(v) ? 'bg-[#38403a]/25 dark:bg-white/25' : 'bg-[#BA7B39]'}`} />
              <span className="truncate">{v.titre}</span>
              <span className={`ml-auto shrink-0 tabular-nums ${v.statut === 'annulee' ? 'line-through opacity-60' : ''}`}>{dollars(v.commission)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ClientAmbassadrice;
