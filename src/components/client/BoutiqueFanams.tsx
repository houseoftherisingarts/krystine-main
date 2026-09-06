import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { updateMember } from '../../firebase/firestore';
import { getLecons, type Lecon } from '../../firebase/formations';
import { acheterAvecFanams, acheterFanams, subscribeToMemberPoints, suivreBoutique, type PointsBalance } from '../../firebase/points';
import {
  BANNIERE_NATURE, BOUTIQUE, COUT_EPISODE, PAQUET_FANAMS, SANTE_LA_VIE_ID, fanams,
} from '../../lib/pointsConfig';
import PieceFanam from './PieceFanam';

// La petite boutique, dans l'onglet Téléchargements. Trois façons de
// personnaliser son espace pour cinq fanams chacune (une bannière, la
// musique d'Origine, le skin Medzo Café), les intégrales de Santé la vie à
// cent fanams l'émission, et le paquet de cent fanams pour dix dollars.
// Le serveur seul débite (acheterAvecFanams); ici, on montre et on active.

interface Props {
  possedeMusiqueDeja: boolean;   // la musique déjà offerte par le Foyer
  episodesPossedes: Set<string>;
  onAchat?: () => void;
}

const BoutiqueFanams: React.FC<Props> = ({ possedeMusiqueDeja, episodesPossedes, onAchat }) => {
  const { user, member, lang } = useApp();
  const fr = lang === 'FR';
  const [solde, setSolde] = useState<PointsBalance>({ balance: 0, lifetime: 0 });
  const [possede, setPossede] = useState<Record<string, unknown>>({});
  const [episodes, setEpisodes] = useState<Lecon[]>([]);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ton: 'ok' | 'err'; texte: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const a = subscribeToMemberPoints(user.uid, setSolde);
    const b = suivreBoutique(user.uid, (p) => setPossede(p.possede));
    getLecons(SANTE_LA_VIE_ID).then(setEpisodes).catch(() => setEpisodes([]));
    return () => { a(); b(); };
  }, [user]);

  const dire = (ton: 'ok' | 'err', texte: string) => {
    setMessage({ ton, texte });
    window.setTimeout(() => setMessage(null), 5000);
  };

  const acheter = async (article: string, nom: string) => {
    if (!user || occupe) return;
    setOccupe(article);
    try {
      const r = await acheterAvecFanams(article);
      dire('ok', fr ? `${nom} est à vous. Il vous reste ${fanams(r.solde, 'FR')}.` : `${nom} is yours. You have ${fanams(r.solde, 'EN')} left.`);
      onAchat?.();
    } catch (e) {
      const m = (e as { message?: string }).message || '';
      dire('err', m.replace(/^.*?:\s*/, '') || (fr ? 'L’achat n’a pas fonctionné.' : 'The purchase did not go through.'));
    } finally {
      setOccupe(null);
    }
  };

  const paquet = async () => {
    if (!user || occupe) return;
    setOccupe('paquet');
    try {
      window.location.href = await acheterFanams();
    } catch {
      dire('err', fr ? 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' : 'The payment could not start. Try again in a moment.');
      setOccupe(null);
    }
  };

  const perso = member?.personnalisation || {};
  const aBanniere = !!possede['banniere-nature'];
  const aMusique = !!possede['musique-origine'] || possedeMusiqueDeja;
  const aSkin = !!possede['skin-medzo'];

  const activer = async (patch: NonNullable<typeof member>['personnalisation']) => {
    if (!user) return;
    await updateMember(user.uid, { personnalisation: { ...perso, ...patch } });
  };

  const episodesTries = useMemo(() => episodes.slice().sort((a, b) => a.ordre - b.ordre), [episodes]);

  const carte = (id: string, enfant: React.ReactNode) => (
    <div key={id} className="flex flex-col overflow-hidden rounded-[18px] border border-[#293027]/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
      {enfant}
    </div>
  );

  const boutonAchat = (article: string, nom: string, cout: number) => {
    const manque = cout - solde.balance;
    return (
      <button
        type="button"
        onClick={() => acheter(article, nom)}
        disabled={occupe !== null || manque > 0}
        title={manque > 0 ? (fr ? `Il vous manque ${fanams(manque, 'FR')}.` : `You need ${fanams(manque, 'EN')} more.`) : undefined}
        className="inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]"
      >
        <PieceFanam size={16} />
        {occupe === article ? (fr ? 'Un instant' : 'One moment') : `${cout}`}
      </button>
    );
  };

  const bascule = (actif: boolean, onClick: () => void, libelleOn: string, libelleOff: string) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
        actif
          ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]'
          : 'border-[#38403a]/15 text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70'
      }`}
    >
      <i className={`fa-solid ${actif ? 'fa-check' : 'fa-circle'} text-[9px]`} /> {actif ? libelleOn : libelleOff}
    </button>
  );

  return (
    <section className="mt-10" id="boutique">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'La petite boutique' : 'The little shop'}</p>
          <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">{fr ? 'Personnalisez votre espace' : 'Personalise your space'}</h3>
          <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
            {fr
              ? 'Chaque objet se paie en fanams, la monnaie de votre espace. Vous en gagnez en revenant, en participant, en invitant vos amies.'
              : 'Everything here is paid in fanams, the currency of your space. You earn them by coming back, taking part and inviting friends.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#BA7B39]/40 bg-white/60 px-4 py-2 font-serif text-lg text-[#293027] dark:bg-white/10 dark:text-white">
            <PieceFanam size={20} /> {solde.balance}
          </span>
          <button
            type="button"
            onClick={paquet}
            disabled={occupe !== null}
            className="inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#d9a05b] disabled:opacity-50"
          >
            <i className="fa-solid fa-plus" /> {PAQUET_FANAMS.fanams} {fr ? 'fanams pour' : 'fanams for'} {PAQUET_FANAMS.prix} $
          </button>
        </div>
      </div>

      {message && (
        <p className={`mt-4 rounded-[14px] px-4 py-3 text-sm ${message.ton === 'ok' ? 'bg-[#BA7B39]/15 text-[#293027] dark:text-white' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200'}`}>
          {message.texte}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {BOUTIQUE.map((a) => {
          const nom = fr ? a.nomFR : a.nomEN;
          const desc = fr ? a.descFR : a.descEN;
          let visuel: React.ReactNode;
          let etat: React.ReactNode;
          if (a.id === 'banniere-nature') {
            visuel = <img src={BANNIERE_NATURE} alt="" className="h-28 w-full object-cover" />;
            etat = aBanniere
              ? bascule(perso.banniere === 'nature', () => activer({ banniere: perso.banniere === 'nature' ? 'defaut' : 'nature' }), fr ? 'En place' : 'In place', fr ? 'Mettre en bannière' : 'Set as banner')
              : boutonAchat(a.id, nom, a.cout);
          } else if (a.id === 'musique-origine') {
            visuel = (
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#293027] to-[#4a5a4a] text-[#d9a05b]">
                <i className="fa-solid fa-music text-3xl" />
              </div>
            );
            etat = aMusique
              ? (
                <div className="flex flex-wrap gap-2">
                  {bascule(!!perso.musiqueSite, () => activer({ musiqueSite: !perso.musiqueSite }), fr ? 'Musique du site' : 'Site music', fr ? 'Activer sur le site' : 'Use on the site')}
                  <a href="#telechargements" className="inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70">
                    <i className="fa-solid fa-download text-[9px]" /> {fr ? 'Télécharger' : 'Download'}
                  </a>
                </div>
              )
              : boutonAchat(a.id, nom, a.cout);
          } else {
            visuel = (
              <div className="flex h-28 items-center justify-center gap-2 bg-[#e6d7c3]">
                {['#e6d7c3', '#c99a5b', '#8a5a2b', '#3b2417'].map((c) => <span key={c} className="h-10 w-10 rounded-full border border-white/70 shadow" style={{ background: c }} />)}
              </div>
            );
            etat = aSkin
              ? bascule(perso.skin === 'medzo', () => activer({ skin: perso.skin === 'medzo' ? '' : 'medzo' }), fr ? 'Skin actif' : 'Skin on', fr ? 'Activer le skin' : 'Turn the skin on')
              : boutonAchat(a.id, nom, a.cout);
          }
          return carte(a.id, (
            <>
              {visuel}
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]"><i className={`fa-solid ${a.icone} mr-1`} /> {fanams(a.cout, lang)}</p>
                <p className="mt-1 font-serif text-lg text-[#293027] dark:text-white">{nom}</p>
                <p className="mt-1 flex-1 text-sm text-[#293027]/60 dark:text-white/60">{desc}</p>
                <div className="mt-4">{etat}</div>
              </div>
            </>
          ));
        })}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-[18px]">
          <img src="/sante-la-vie.jpg" alt="Krystine St-Laurent sur le plateau de Santé la vie" className="h-full w-full object-cover" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{fr ? 'Les intégrales' : 'The full episodes'}</p>
          <h3 className="mt-1 font-serif text-2xl text-[#293027] dark:text-white">Santé la vie</h3>
          <p className="mt-1 max-w-xl text-sm text-[#293027]/60 dark:text-white/60">
            {fr
              ? `Les émissions complètes, telles que diffusées sur MAtv. Chaque émission coûte ${fanams(COUT_EPISODE, 'FR')} et rejoint vos téléchargements pour de bon.`
              : `The complete shows, as aired on MAtv. Each one costs ${fanams(COUT_EPISODE, 'EN')} and joins your downloads for good.`}
          </p>
          <ul className="mt-4 divide-y divide-[#293027]/10 rounded-[16px] border border-[#293027]/10 bg-white/50 dark:divide-white/10 dark:border-white/10 dark:bg-white/5">
            {episodesTries.length === 0 && (
              <li className="px-4 py-3 text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Les émissions arrivent.' : 'The shows are on their way.'}</li>
            )}
            {episodesTries.map((l) => {
              const aMoi = episodesPossedes.has(l.id);
              return (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 text-sm text-[#293027]/85 dark:text-white/85">
                    <i className="fa-solid fa-tv mr-2 text-[#BA7B39]" />{l.titre}
                  </span>
                  {aMoi
                    ? <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]"><i className="fa-solid fa-check mr-1" />{fr ? 'Dans vos téléchargements' : 'In your downloads'}</span>
                    : boutonAchat(`episode:${l.id}`, l.titre, COUT_EPISODE)}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default BoutiqueFanams;
