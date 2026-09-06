import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AppContext';
import MurSocial from './MurSocial';
import BilletCarte from './BilletCarte';
import Avatar from './Avatar';
import BadgeVedette from './BadgeVedette';
import { getOngletsFormation, getMembresGroupe, type OngletFormation } from '../../firebase/formations';
import { getMember, type MemberDoc } from '../../firebase/firestore';
import { suivreMesSauvegardes, getPost, type PostMur } from '../../firebase/mur';

// ─── L'espace de groupe d'une formation, façon Circle ───────────────────────
// Trois colonnes pleine largeur : les onglets à gauche (le feed, les billets
// gardés, puis les onglets que Krystine crée), le fil au centre, les membres à
// droite (avec l'écriture directe à une personne). Réutilisable pour tout
// cours; le Foyer est le premier à s'en servir.

const EspaceGroupe: React.FC<{ formationId: string }> = ({ formationId }) => {
  const { user, isAdmin } = useAuth();
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

  const onglet = (id: string, nom: string, icone: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setActif(id)}
      className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-[12px] font-bold uppercase tracking-wider transition-colors ${
        actif === id
          ? 'bg-[#BA7B39] text-[#293027] shadow-[0_6px_18px_-8px_rgba(186,123,57,0.7)]'
          : 'text-[#38403a]/65 hover:bg-white/60 hover:text-[#293027] dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white'
      }`}
    >
      <i className={`fa-solid ${icone} w-4 text-center ${actif === id ? '' : 'text-[#8B4A2F]/70'}`} /> {nom}
    </button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
      {/* Les onglets, à gauche */}
      <aside className="lg:sticky lg:top-24 h-fit rounded-[20px] border border-white/60 bg-white/45 p-3 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        {onglet('feed', 'Le feed', 'fa-newspaper')}
        {onglets.map(o => onglet(o.id, o.nom, 'fa-hashtag'))}
        {user && onglet('gardes', 'Gardés', 'fa-bookmark')}
        {isAdmin && (
          <p className="mt-2 px-4 text-[10px] leading-relaxed text-[#38403a]/45 dark:text-white/40">
            Les onglets se créent dans l'admin, section Foyer.
          </p>
        )}
      </aside>

      {/* Le fil, au centre */}
      <div className="min-w-0">
        {actif === 'gardes' ? (
          gardes.length === 0 ? (
            <p className="rounded-[20px] border border-white/60 bg-white/45 p-8 text-center text-sm text-[#38403a]/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
              Rien de gardé pour l'instant. Le signet sous un billet le range ici.
            </p>
          ) : (
            <div className="space-y-5">
              {gardes.map((p, i) => <BilletCarte key={p.id} post={p} delaiIndex={i} estSauvegarde />)}
            </div>
          )
        ) : (
          <MurSocial fil={fil} titre="" />
        )}
      </div>

      {/* Les membres, à droite */}
      <aside className="lg:sticky lg:top-24 h-fit rounded-[20px] border border-white/60 bg-white/45 p-4 backdrop-blur-md dark:border-white/10 dark:bg-white/5">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Membres · {membres.length}</p>
        <ul className="mt-3 max-h-[520px] space-y-1 overflow-y-auto pr-1">
          {membres.map(m => {
            const nom = (m.fiche?.displayName || '').trim() || 'Un membre';
            return (
              <li key={m.uid} className="flex items-center gap-2.5 rounded-2xl px-2 py-2 hover:bg-[#BA7B39]/8">
                <Link to={`/membre/${m.uid}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar nom={nom} url={m.fiche?.photoURL || undefined} taille={34} />
                  <span className="truncate text-sm text-[#293027] dark:text-white">{nom}</span>
                  <BadgeVedette uid={m.uid} />
                </Link>
                {user && user.uid !== m.uid && (
                  <Link
                    to={`/messages/${m.uid}`}
                    aria-label={`Écrire à ${nom}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8B4A2F]/70 transition-colors hover:bg-[#BA7B39]/15 hover:text-[#8B4A2F]"
                  >
                    <i className="fa-regular fa-comment" />
                  </Link>
                )}
              </li>
            );
          })}
          {membres.length === 0 && <li className="px-2 py-3 text-sm text-[#38403a]/50 dark:text-white/50">Le groupe se forme.</li>}
        </ul>
      </aside>
    </div>
  );
};

export default EspaceGroupe;
