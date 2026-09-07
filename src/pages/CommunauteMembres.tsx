import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { getAllMembers, type MemberDoc } from '../firebase/firestore';
import { accepterAmitie, refuserAmitie, suivreMesAmities, type Amitie } from '../firebase/amities';
import CadreFoyer from '../components/communaute/CadreFoyer';
import CarteSociale, { PETITES_CAPITALES, RangeePersonne } from '../components/communaute/CarteSociale';

// ─── L'annuaire des membres du Foyer, /membres ───────────────────────────────
// Une seule carte dans la coquille du Foyer (CadreFoyer) : le titre en petites
// capitales, la recherche en pilule, trois vues en pilules (Toutes, Mes amies,
// Demandes) et les personnes en rangées de l'onglet Amis de /compte. Chaque
// rangée mène à la fiche /membre/:uid; le geste à droite dépend de la vue.

/** Le compte de l'équipe de modération : « Contacter l'équipe » ouvre une conversation avec lui. */
const UID_MODERATION = 'kYorHEdND9bfk5A4I3oxVJJSquR2';

type Vue = 'toutes' | 'amies' | 'demandes';

const BOUTON_SECONDAIRE = 'inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] disabled:opacity-50 dark:border-white/15 dark:text-white/70';
const BOUTON_LAITON = 'inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#9c6630] disabled:opacity-50';
const BOUTON_REFUSER = 'rounded-full border border-[#38403a]/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/50 hover:text-red-500 dark:border-white/15 dark:text-white/50';

const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const CommunauteMembres: React.FC = () => {
  const { user, lang } = useApp();
  const fr = lang === 'FR';
  const [params, setParams] = useSearchParams();
  const vue: Vue = params.get('vue') === 'amies' ? 'amies' : params.get('vue') === 'demandes' ? 'demandes' : 'toutes';
  const [membres, setMembres] = useState<MemberDoc[]>([]);
  const [chargement, setChargement] = useState(true);
  const [amities, setAmities] = useState<Amitie[]>([]);
  const [recherche, setRecherche] = useState('');
  const [enCours, setEnCours] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let vivant = true;
    getAllMembers()
      .then((m) => { if (vivant) setMembres(m); })
      .catch(() => { if (vivant) setMembres([]); })
      .finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [user]);
  useEffect(() => { if (user) return suivreMesAmities(user.uid, setAmities); }, [user]);

  const moi = user?.uid || '';
  const parUid = useMemo(() => new Map(membres.map(m => [m.uid, m])), [membres]);
  const ficheDe = (uid: string): MemberDoc => parUid.get(uid) || { uid, email: '', displayName: fr ? 'Membre' : 'Member' };
  const autreDe = (l: Amitie) => l.paire.find(u => u !== moi) || '';
  const amies = useMemo(() => amities.filter(l => l.statut === 'amis').map(autreDe), [amities, moi]);
  const recues = useMemo(() => amities.filter(l => l.statut === 'demande' && l.de !== moi).map(autreDe), [amities, moi]);
  const envoyees = useMemo(() => amities.filter(l => l.statut === 'demande' && l.de === moi).map(autreDe), [amities, moi]);

  const q = normaliser(recherche.trim());
  const toutes = q ? membres.filter(m => normaliser(m.displayName || '').includes(q)) : membres;

  const choisirVue = (v: Vue) => { const p = new URLSearchParams(params); if (v === 'toutes') p.delete('vue'); else p.set('vue', v); setParams(p, { replace: true }); };
  const repondre = async (autre: string, oui: boolean) => {
    if (!user) return;
    setEnCours(autre);
    try { if (oui) await accepterAmitie(user.uid, autre); else await refuserAmitie(user.uid, autre); } finally { setEnCours(null); }
  };

  const pilule = (v: Vue, label: string, n?: number) => (
    <button
      key={v}
      type="button"
      onClick={() => choisirVue(v)}
      className={`relative flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
        vue === v ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#BA7B39]/12 text-[#8B4A2F] hover:bg-[#BA7B39]/25 dark:text-[#d9a05b]'
      }`}
    >
      {label}
      {n !== undefined && n > 0 && <span className="ml-1 rounded-full bg-[#293027] px-1.5 py-0.5 text-[9px] text-[#d9a05b]">{n}</span>}
    </button>
  );

  const ecrire = (m: MemberDoc) => (
    <Link to={`/messages/${m.uid}`} className={BOUTON_SECONDAIRE}>
      <i className="fa-solid fa-envelope text-[9px]" /> {fr ? 'Écrire' : 'Write'}
    </Link>
  );
  const rangee = (m: MemberDoc, action?: React.ReactNode) => (
    <RangeePersonne
      key={m.uid}
      uid={m.uid}
      nom={m.displayName || (fr ? 'Membre' : 'Member')}
      photo={m.photoURL}
      verifie={m.verifie}
      sousTitre={m.dosha ? `Dosha ${m.dosha}` : undefined}
      action={m.uid === moi ? undefined : action}
    />
  );
  const vide = (texte: string) => <p className="text-sm text-[#38403a]/50 dark:text-white/50">{texte}</p>;
  // Deux colonnes dès sm; une seule pour les demandes reçues, dont la rangée porte deux boutons.
  const grille = (enfants: React.ReactNode, large = false) => <div className={`grid gap-2 ${large ? '' : 'sm:grid-cols-2 2xl:grid-cols-3'}`}>{enfants}</div>;

  return (
    <CadreFoyer onglet="membres">
      <CarteSociale
        titre={`${fr ? 'Membres' : 'Members'} · ${membres.length}`}
        action={
          // flex-1 sous sm : le titre garde sa ligne, le champ prend le reste.
          <div className="flex min-w-0 flex-1 justify-end sm:flex-none">
            <input
              type="search"
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              placeholder={fr ? 'Chercher une membre' : 'Search a member'}
              aria-label={fr ? 'Chercher une membre' : 'Search a member'}
              className="w-full rounded-full border border-[#38403a]/15 bg-white/70 px-4 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] sm:w-56 dark:border-white/15 dark:bg-white/10 dark:text-white"
            />
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {pilule('toutes', fr ? 'Toutes' : 'All')}
          {pilule('amies', fr ? 'Mes amies' : 'My friends', amies.length)}
          {pilule('demandes', fr ? 'Demandes' : 'Requests', recues.length)}
        </div>

        {chargement ? (
          <div className="flex justify-center py-12"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#8B4A2F]" /></div>
        ) : vue === 'toutes' ? (
          toutes.length === 0
            ? vide(q ? (fr ? 'Aucune membre ne porte ce nom.' : 'No member goes by that name.') : (fr ? 'Aucune membre pour le moment.' : 'No member yet.'))
            : grille(toutes.map(m => rangee(m, ecrire(m))))
        ) : vue === 'amies' ? (
          amies.length === 0
            ? vide(fr ? 'Votre cercle commence dans l’annuaire.' : 'Your circle starts in the directory.')
            : grille(amies.map(uid => { const m = ficheDe(uid); return rangee(m, ecrire(m)); }))
        ) : (
          <>
            {recues.length === 0
              ? vide(fr ? 'Aucune demande en attente.' : 'No pending request.')
              : grille(recues.map(uid => {
                const m = ficheDe(uid);
                return rangee(m, (
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" disabled={enCours === uid} onClick={() => repondre(uid, true)} className={BOUTON_LAITON}>
                      <i className="fa-solid fa-check text-[9px]" /> {fr ? 'Accepter' : 'Accept'}
                    </button>
                    <button type="button" disabled={enCours === uid} onClick={() => repondre(uid, false)} className={BOUTON_REFUSER}>
                      {fr ? 'Refuser' : 'Decline'}
                    </button>
                  </div>
                ));
              }), true)}
            {envoyees.length > 0 && (
              <div className="mt-6">
                <p className={PETITES_CAPITALES}>{fr ? 'Demandes envoyées' : 'Requests sent'}</p>
                <div className="mt-3">
                  {grille(envoyees.map(uid => rangee(ficheDe(uid), (
                    <span className="shrink-0 text-[10px] uppercase tracking-widest text-[#38403a]/40 dark:text-white/40">{fr ? 'En attente' : 'Pending'}</span>
                  ))))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-6 flex justify-end">
          <Link to={`/messages/${UID_MODERATION}`} className={BOUTON_SECONDAIRE}>
            <i className="fa-solid fa-shield-halved text-[9px]" /> {fr ? 'Contacter l’équipe de modération' : 'Contact the moderation team'}
          </Link>
        </div>
      </CarteSociale>
    </CadreFoyer>
  );
};

export default CommunauteMembres;
