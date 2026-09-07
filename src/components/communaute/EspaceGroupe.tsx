import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import MurSocial from './MurSocial';
import BilletCarte from './BilletCarte';
import BadgeVedette from './BadgeVedette';
import CarteSociale, { RangeePersonne } from './CarteSociale';
import { getOngletsFormation, getMembresGroupe, type OngletFormation } from '../../firebase/formations';
import { getMember, type MemberDoc } from '../../firebase/firestore';
import { suivreMesSauvegardes, getPost, type PostMur } from '../../firebase/mur';

// ─── L'espace de groupe d'une formation, façon Circle ───────────────────────
// Deux habits. `page` (celui de /cours/:id) : trois colonnes pleine largeur,
// les onglets à gauche (le fil, les onglets que Krystine crée, les billets
// gardés), le fil au centre, les membres à droite en rangées de personne avec
// l'écriture directe. `cadre` (celui de /groupes, dans le CadreFoyer) : la
// colonne centrale seulement, une rangée de pilules puis le fil; le rail
// « Autour du feu » de la coquille tient lieu de colonne Membres.
// Réutilisable pour tout cours; le Foyer est le premier à s'en servir.

const EspaceGroupe: React.FC<{ formationId: string; variante?: 'page' | 'cadre' }> = ({ formationId, variante = 'page' }) => {
  const { user, isAdmin, lang } = useApp();
  const fr = lang === 'FR';
  const cadre = variante === 'cadre';
  const [onglets, setOnglets] = useState<OngletFormation[]>([]);
  const [actif, setActif] = useState<string>('feed');   // 'feed' | 'gardes' | id d'onglet
  const [membres, setMembres] = useState<Array<{ uid: string; fiche: MemberDoc | null }>>([]);
  const [sauvegardes, setSauvegardes] = useState<Set<string>>(new Set());
  const [gardes, setGardes] = useState<PostMur[]>([]);

  useEffect(() => { getOngletsFormation(formationId).then(setOnglets).catch(() => {}); }, [formationId]);
  useEffect(() => {
    getMembresGroupe(formationId)
      .then(async liste => {
        const fiches = await Promise.all(liste.map(async m => ({ uid: m.uid, fiche: await getMember(m.uid).catch(() => null) })));
        // Krystine (les comptes admin) d'abord, puis l'ordre d'arrivée.
        fiches.sort((a, b) => Number(!!b.fiche?.isAdmin) - Number(!!a.fiche?.isAdmin));
        setMembres(fiches);
      })
      .catch(() => setMembres([]));
  }, [formationId]);
  useEffect(() => (user ? suivreMesSauvegardes(user.uid, setSauvegardes) : undefined), [user]);
  useEffect(() => {
    if (actif !== 'gardes') return;
    let vivant = true;
    Promise.all([...sauvegardes].map(id => getPost(id))).then(posts => {
      if (vivant) setGardes(posts.filter((p): p is PostMur => !!p));
    });
    return () => { vivant = false; };
  }, [actif, sauvegardes]);

  const fil = useMemo(() => (actif === 'feed' || actif === 'gardes')
    ? (`formation:${formationId}` as const)
    : (`formation:${formationId}--${actif}` as const), [actif, formationId]);

  // Les pilules de sous-onglet de l'espace client (ClientMessagerie.tsx:93-97),
  // en colonne dans la variante page. Dans la variante cadre, la rangée des
  // groupes (GroupesPage) porte déjà ces pilules pleines : les onglets du
  // groupe prennent la pilule bordée des filtres (BoutiqueNiskas.tsx:458)
  // pour que les deux niveaux se distinguent.
  const onglet = (id: string, nom: string, icone: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setActif(id)}
      className={cadre
        ? `inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors ${
          actif === id ? 'border-[#BA7B39] bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]' : 'border-[#38403a]/15 text-[#38403a]/60 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/60'
        }`
        : `relative flex items-center gap-2 rounded-full px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider transition-colors lg:w-full ${
          actif === id ? 'bg-[#BA7B39] text-[#293027]' : 'bg-[#BA7B39]/12 text-[#8B4A2F] hover:bg-[#BA7B39]/25 dark:text-[#d9a05b]'
        }`}
    >
      <i className={`fa-solid ${icone} text-[10px]`} /> {nom}
    </button>
  );
  const pilules = (
    <>
      {onglet('feed', fr ? 'Le fil' : 'The feed', 'fa-newspaper')}
      {onglets.map(o => onglet(o.id, o.nom, 'fa-hashtag'))}
      {user && onglet('gardes', fr ? 'Gardés' : 'Saved', 'fa-bookmark')}
    </>
  );

  const centre = actif === 'gardes' ? (
    gardes.length === 0 ? (
      <CarteSociale>
        <p className="text-sm text-[#38403a]/50 dark:text-white/50">
          {fr ? 'Rien de gardé pour l’instant. Le signet sous un billet le range ici.' : 'Nothing saved yet. The bookmark under a post keeps it here.'}
        </p>
      </CarteSociale>
    ) : (
      <div className="space-y-4">
        {gardes.map((p, i) => <BilletCarte key={p.id} post={p} delaiIndex={i} estSauvegarde />)}
      </div>
    )
  ) : (
    <MurSocial fil={fil} titre="" />
  );

  if (cadre) {
    return (
      <>
        <div className="flex flex-wrap gap-2">{pilules}</div>
        {centre}
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)_340px]">
      {/* Les onglets, à gauche */}
      <aside className="min-w-0 h-fit rounded-[24px] border border-white/60 bg-white/55 p-3 backdrop-blur-md lg:sticky lg:top-24 dark:border-white/10 dark:bg-[#293027]/55">
        {/* Une rangée de pilules sous lg, une colonne à partir de lg */}
        <div className="flex flex-wrap gap-1 lg:flex-col">{pilules}</div>
        {isAdmin && (
          <p className="mt-2 px-4 text-[10px] leading-relaxed text-[#38403a]/45 dark:text-white/40">
            {fr ? 'Les onglets se créent dans l’admin, section Foyer.' : 'Tabs are created in the admin, Hearth section.'}
          </p>
        )}
      </aside>

      {/* Le fil, au centre */}
      <div className="min-w-0">{centre}</div>

      {/* Les membres, à droite : la rangée de personne de l'espace client, le badge en vedette sous le nom */}
      <aside className="min-w-0 h-fit rounded-[24px] border border-white/60 bg-white/55 p-4 backdrop-blur-md lg:sticky lg:top-24 dark:border-white/10 dark:bg-[#293027]/55">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{fr ? 'Membres' : 'Members'} · {membres.length}</p>
        <div className="mt-3 max-h-[520px] space-y-0.5 overflow-y-auto pr-1">
          {membres.map(m => {
            const nom = (m.fiche?.displayName || '').trim() || (fr ? 'Une membre' : 'A member');
            return (
              <RangeePersonne
                key={m.uid}
                compact
                uid={m.uid}
                nom={nom}
                photo={m.fiche?.photoURL || undefined}
                verifie={m.fiche?.verifie}
                sousTitre={<BadgeVedette uid={m.uid} />}
                action={user && user.uid !== m.uid ? (
                  <Link
                    to={`/messages/${m.uid}`}
                    aria-label={fr ? `Écrire à ${nom}` : `Write to ${nom}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8B4A2F] transition-colors hover:bg-[#BA7B39]/15 dark:text-[#d9a05b]"
                  >
                    <i className="fa-regular fa-comment" />
                  </Link>
                ) : undefined}
              />
            );
          })}
          {membres.length === 0 && <p className="px-2 py-3 text-sm text-[#38403a]/50 dark:text-white/50">{fr ? 'Le groupe se forme.' : 'The group is forming.'}</p>}
        </div>
      </aside>
    </div>
  );
};

export default EspaceGroupe;
