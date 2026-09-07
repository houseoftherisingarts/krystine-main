import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { getMember, type MemberDoc } from '../firebase/firestore';
import {
  demanderAmitie, accepterAmitie, suivreMesAmities,
  estAmi, amitieEnAttente, type Amitie,
} from '../firebase/amities';
import { MotDuFoyer, useAmiesDOrigine } from '../components/communaute/ReserveAuFoyer';
import CadreFoyer from '../components/communaute/CadreFoyer';
import CarteSociale, { PETITES_CAPITALES } from '../components/communaute/CarteSociale';
import BilletCarte from '../components/communaute/BilletCarte';
import Composeur from '../components/communaute/Composeur';
import { suivrePublicationsDe, type PostMur } from '../firebase/mur';
import { getBadgesDe, badgeVedetteEnCache, CATALOGUE_BADGES } from '../firebase/badgesCatalogue';

// ─── La fiche publique d'une membre, /membre/:uid ────────────────────────────
// La coquille du Foyer (CadreFoyer) porte la bannière et l'avatar de la
// personne, comme la couverture d'un profil Facebook. Dessous, dans la
// colonne centrale : la carte « À propos » (dosha, membre depuis, les gestes
// d'amitié et d'écriture, les badges), le composeur pour soi, puis le mur en
// billets. La marraine et les filleules y entrent sans le Foyer
// (garde={false}); l'amitié et les messages restent derrière useAmiesDOrigine.

const BOUTON_ENCRE = 'inline-flex items-center gap-2 rounded-full bg-[#293027] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#EEE7DB] transition-colors hover:bg-[#3a453a] disabled:opacity-50 dark:bg-[#BA7B39] dark:text-[#293027] dark:hover:bg-[#d9a05b]';
const BOUTON_LAITON = 'inline-flex items-center gap-2 rounded-full bg-[#BA7B39] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] transition-colors hover:bg-[#9c6630] disabled:opacity-50';
const BOUTON_SECONDAIRE = 'inline-flex items-center gap-2 rounded-full border border-[#38403a]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] disabled:opacity-50 dark:border-white/15 dark:text-white/70';
const PASTILLE_ETAT = 'inline-flex items-center gap-2 rounded-full border border-[#BA7B39] bg-[#BA7B39]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]';
const LIBELLE = 'text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]';

const MembreProfilPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const { user, lang } = useApp();
  const fr = lang === 'FR';

  const amiesDOrigine = useAmiesDOrigine();
  const [profil, setProfil] = useState<MemberDoc | null>(null);
  const [chargement, setChargement] = useState(true);
  const [amities, setAmities] = useState<Amitie[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [vedette, setVedette] = useState<string | null>(null);
  const [publications, setPublications] = useState<PostMur[]>([]);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (!uid) return;
    let vivant = true;
    getBadgesDe(uid).then(b => { if (vivant) setBadges(b); }).catch(() => {});
    badgeVedetteEnCache(uid).then(v => { if (vivant) setVedette(v); });
    return () => { vivant = false; };
  }, [uid]);
  useEffect(() => (uid ? suivrePublicationsDe(uid, setPublications) : undefined), [uid]);
  useEffect(() => {
    if (!uid) return;
    let vivant = true;
    setChargement(true);
    getMember(uid).then((m) => { if (vivant) setProfil(m); }).catch(() => { if (vivant) setProfil(null); }).finally(() => { if (vivant) setChargement(false); });
    return () => { vivant = false; };
  }, [uid]);
  useEffect(() => { if (user) return suivreMesAmities(user.uid, setAmities); }, [user]);

  // La coquille porte la carte « Se connecter » : rien à rendre dedans.
  if (!user) return <CadreFoyer garde={false}>{null}</CadreFoyer>;

  if (chargement) {
    return (
      <CadreFoyer garde={false}>
        <div className="flex justify-center py-12"><i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#8B4A2F]" /></div>
      </CadreFoyer>
    );
  }

  if (!uid || !profil) {
    return (
      <CadreFoyer garde={false}>
        <CarteSociale><p className="text-sm text-[#38403a]/50 dark:text-white/50">{fr ? 'Ce membre est introuvable.' : 'This member cannot be found.'}</p></CarteSociale>
      </CadreFoyer>
    );
  }

  const soi = user.uid === uid;
  // L'amitié et la messagerie de boîte à boîte se débloquent avec le Foyer
  // d'Origine; la marraine et les filleules passent toujours (Alex, 6 sept. 2026).
  const origine = amiesDOrigine.pret && amiesDOrigine.peutEcrire(uid);
  const amis = estAmi(amities, user.uid, uid);
  const enAttente = amitieEnAttente(amities, user.uid, uid);
  const jeLaiEnvoyee = enAttente?.de === user.uid;
  const jeLaiRecue = enAttente && enAttente.de === uid;
  const depuis = profil.joinedAt?.toDate?.().toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { month: 'long', year: 'numeric' });

  const demander = async () => {
    setEnvoi(true);
    try { await demanderAmitie(user.uid, uid); } finally { setEnvoi(false); }
  };
  const accepter = async () => {
    setEnvoi(true);
    try { await accepterAmitie(user.uid, uid); } finally { setEnvoi(false); }
  };

  const gestes = !soi && origine ? (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {amis ? (
        <span className={PASTILLE_ETAT}><i className="fa-solid fa-check text-[9px]" /> {fr ? 'Amies d’origine' : 'Origine friends'}</span>
      ) : jeLaiRecue ? (
        <button type="button" onClick={accepter} disabled={envoi} className={BOUTON_LAITON}>
          <i className={`fa-solid ${envoi ? 'fa-circle-notch fa-spin' : 'fa-user-plus'} text-[9px]`} /> {fr ? 'Accepter l’amie d’origine' : 'Accept the Origine friend'}
        </button>
      ) : jeLaiEnvoyee ? (
        <span className="text-[10px] uppercase tracking-widest text-[#38403a]/40 dark:text-white/40">{fr ? 'Demande envoyée' : 'Request sent'}</span>
      ) : (
        <button type="button" onClick={demander} disabled={envoi} className={BOUTON_ENCRE}>
          <i className={`fa-solid ${envoi ? 'fa-circle-notch fa-spin' : 'fa-user-plus'} text-[9px]`} /> {fr ? 'Amie d’origine' : 'Origine friend'}
        </button>
      )}
      <Link to={`/messages/${uid}`} className={BOUTON_SECONDAIRE}>
        <i className="fa-solid fa-envelope text-[9px]" /> {fr ? 'Écrire' : 'Write'}
      </Link>
    </div>
  ) : undefined;

  return (
    <CadreFoyer onglet={soi ? 'profil' : undefined} garde={false} personne={profil}>
      <CarteSociale titre={fr ? 'À propos' : 'About'} action={gestes}>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className={LIBELLE}>Dosha</dt>
            <dd className="mt-1 text-sm text-[#293027] dark:text-white">{profil.dosha ? profil.dosha.charAt(0).toUpperCase() + profil.dosha.slice(1) : (fr ? 'Pas encore découvert' : 'Not discovered yet')}</dd>
          </div>
          <div>
            <dt className={LIBELLE}>{fr ? 'Membre depuis' : 'Member since'}</dt>
            <dd className="mt-1 text-sm text-[#293027] dark:text-white">{depuis || (fr ? 'Les premiers jours' : 'The early days')}</dd>
          </div>
        </dl>

        {!soi && amiesDOrigine.pret && !origine && (
          <div className="mt-5">
            <MotDuFoyer compact lang={lang} quoi={fr ? 'L’amitié d’origine et les messages de boîte à boîte se débloquent avec le Foyer d’Origine.' : 'Origine friendship and inbox-to-inbox messages unlock with the Origine Hearth.'} />
          </div>
        )}

        <div id="badges" className="mt-6 border-t border-[#38403a]/10 pt-5 dark:border-white/10">
          <p className={PETITES_CAPITALES}>Badges</p>
          {badges.length === 0 ? (
            <p className="mt-2 text-sm text-[#38403a]/50 dark:text-white/50">{fr ? 'Aucun badge pour le moment.' : 'No badge yet.'}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map(id => (
                <span
                  key={id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    id === vedette
                      ? 'border-[#BA7B39] bg-[#BA7B39] text-[#293027] shadow-[0_8px_20px_-10px_rgba(186,123,57,0.9)]'
                      : 'border-[#BA7B39]/40 bg-[#BA7B39]/10 text-[#8B4A2F] dark:text-[#d9a05b]'
                  }`}
                >
                  <i className={`fa-solid ${id === vedette ? 'fa-star' : CATALOGUE_BADGES[id].icone}`} /> {CATALOGUE_BADGES[id].nom}
                </span>
              ))}
            </div>
          )}
        </div>
      </CarteSociale>

      {soi && <Composeur fil="communaute" contexte="monmur" />}

      <p className={PETITES_CAPITALES}>{fr ? 'Publications' : 'Posts'}</p>
      {publications.length === 0 ? (
        <CarteSociale><p className="text-sm text-[#38403a]/50 dark:text-white/50">{fr ? 'Aucune publication pour le moment.' : 'No post yet.'}</p></CarteSociale>
      ) : (
        publications.map((p, i) => <BilletCarte key={p.id} post={p} delaiIndex={i} />)
      )}
    </CadreFoyer>
  );
};

export default MembreProfilPage;
