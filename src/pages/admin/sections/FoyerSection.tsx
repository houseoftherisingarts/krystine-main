import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditMode } from '../../../contexts/EditModeContext';
import { Card, EmptyState } from '../primitives';
import { getAcheteursDe, getOngletsFormation, ajouterOngletFormation, supprimerOngletFormation, type AcheteurFormation, type OngletFormation } from '../../../firebase/formations';
import { LeconsPanel } from './FormationsSection';
import { getMember, type MemberDoc } from '../../../firebase/firestore';
import MurSocial from '../../../components/communaute/MurSocial';
import Avatar from '../../../components/communaute/Avatar';

// La maison du Foyer dans l'admin : l'édition de la page de vente, la
// communauté des acheteuses (le groupe du Foyer) et son feed exclusif, où
// Krystine lit les billets et publie les siens.

// Les onglets de l'espace du Foyer (façon Circle) : Krystine les crée ici,
// ils apparaissent aussitôt dans le menu de gauche du cours.
const OngletsPanel: React.FC = () => {
  const [onglets, setOnglets] = useState<OngletFormation[]>([]);
  const [nom, setNom] = useState('');
  const [occupe, setOccupe] = useState(false);
  const refresh = () => getOngletsFormation('foyer').then(setOnglets).catch(() => {});
  useEffect(() => { void refresh(); }, []);
  const ajouter = async () => {
    if (!nom.trim() || occupe) return;
    setOccupe(true);
    try { await ajouterOngletFormation('foyer', nom, onglets.length); setNom(''); await refresh(); }
    finally { setOccupe(false); }
  };
  return (
    <Card className="p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Les onglets de l'espace</p>
      <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">
        Chaque onglet ouvre son propre fil dans le menu de gauche du cours, à côté du feed.
      </p>
      <div className="mt-4 flex gap-2">
        <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom de l'onglet (ex. Rituels)" maxLength={40}
          onKeyDown={e => { if (e.key === 'Enter') void ajouter(); }}
          className="flex-1 rounded-xl border border-[#38403a]/10 bg-white/70 px-3 py-2 text-sm text-[#293027] outline-none focus:border-[#BA7B39] dark:border-white/10 dark:bg-white/5 dark:text-white" />
        <button onClick={ajouter} disabled={occupe || !nom.trim()}
          className="rounded-full bg-[#BA7B39] px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-[#293027] disabled:opacity-50">Ajouter</button>
      </div>
      <ul className="mt-3 space-y-1">
        {onglets.map(o => (
          <li key={o.id} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#293027] hover:bg-[#BA7B39]/8 dark:text-white">
            <i className="fa-solid fa-hashtag text-[#8B4A2F]/70" /> <span className="min-w-0 flex-1 truncate">{o.nom}</span>
            <button onClick={async () => { if (confirm(`Retirer l'onglet « ${o.nom} » ?`)) { await supprimerOngletFormation('foyer', o.id); await refresh(); } }}
              className="text-[#38403a]/40 hover:text-red-500 dark:text-white/40" aria-label={`Retirer ${o.nom}`}><i className="fa-solid fa-trash text-xs" /></button>
          </li>
        ))}
        {onglets.length === 0 && <li className="px-3 py-2 text-sm text-[#293027]/45 dark:text-white/45">Aucun onglet pour l'instant. Le feed vit très bien seul.</li>}
      </ul>
    </Card>
  );
};

const FoyerSection: React.FC = () => {
  const navigate = useNavigate();
  const { setEditMode } = useEditMode();
  const [acheteurs, setAcheteurs] = useState<Array<AcheteurFormation & { membre?: MemberDoc | null }>>([]);
  const [charge, setCharge] = useState(true);

  useEffect(() => {
    getAcheteursDe('foyer')
      .then(async liste => {
        const avecFiches = await Promise.all(liste.map(async a => ({
          ...a,
          membre: await getMember(a.uid).catch(() => null),
        })));
        avecFiches.sort((x, y) => (y.acheteLe?.toMillis() || 0) - (x.acheteLe?.toMillis() || 0));
        setAcheteurs(avecFiches);
      })
      .catch(() => setAcheteurs([]))
      .finally(() => setCharge(false));
  }, []);

  const openInEditMode = () => {
    setEditMode(true);
    navigate('/foyer');
  };

  return (
    <div className="space-y-8">
      {/* La page de vente, en édition directe */}
      <Card className="p-6 bg-gradient-to-br from-[#293027] to-[#4A3228] text-white border-[#BA7B39]/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#d9a05b] block mb-2">Page du site</span>
            <h2 className="text-2xl font-serif mb-1">Le Foyer d'Origine</h2>
            <p className="text-sm text-white/70 max-w-xl">
              La page se modifie directement là où elle vit, à l'adresse /foyer. Un clic sur un texte le rend
              modifiable, un clic sur une photo ouvre la médiathèque. Tout s'enregistre aussitôt.
            </p>
          </div>
          <button
            type="button"
            onClick={openInEditMode}
            className="shrink-0 inline-flex items-center gap-2 bg-[#BA7B39] text-[#293027] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs shadow-lg hover:bg-[#d9a05b] transition-colors"
          >
            <i className="fa-solid fa-pen" /> Ouvrir en édition
          </button>
        </div>
      </Card>

      {/* Le cours lui-même : les leçons, leurs textes, portes et documents */}
      <Card className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Le cours</p>
        <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">
          Ajoutez vos leçons (vidéo, audio ou PDF), puis le crayon ouvre chacune : son texte, sa porte du mois,
          sa durée et les documents à déposer dessous.
        </p>
        <LeconsPanel formationId="foyer" />
      </Card>

      <OngletsPanel />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        {/* Le groupe : qui possède le Foyer */}
        <Card className="p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Le groupe du Foyer</p>
          <h3 className="mt-1 font-serif text-xl text-[#293027] dark:text-white">
            {charge ? 'La communauté' : `${acheteurs.length} membre${acheteurs.length > 1 ? 's' : ''}`}
          </h3>
          <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">
            Les personnes qui ont le Foyer : achat, cadeau de parrainage ou accès accordé.
          </p>
          {charge ? (
            <p className="mt-6 text-sm text-[#293027]/50 dark:text-white/50"><i className="fa-solid fa-circle-notch fa-spin mr-2" />Chargement…</p>
          ) : acheteurs.length === 0 ? (
            <div className="mt-4"><EmptyState icon="fa-fire">Personne n'a encore le Foyer. La première arrivera.</EmptyState></div>
          ) : (
            <ul className="mt-5 max-h-[480px] space-y-1 overflow-y-auto pr-1">
              {acheteurs.map(a => {
                const nom = (a.membre?.displayName || '').trim() || a.membre?.email || a.uid.slice(0, 8);
                return (
                  <li key={a.uid} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-[#BA7B39]/8">
                    <Avatar nom={nom} url={a.membre?.photoURL || undefined} taille={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#293027] dark:text-white">{nom}</p>
                      <p className="truncate text-xs text-[#293027]/50 dark:text-white/50">{a.membre?.email || ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] text-[#293027]/50 dark:text-white/50">{a.acheteLe?.toDate().toLocaleDateString('fr-CA') || ''}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[#8B4A2F]">
                        {a.source === 'admin' ? 'Accordé' : a.source === 'parrainage' ? 'Parrainage' : a.montant ? `${a.montant} $` : 'Achat'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Le feed du Foyer : lire et publier */}
        <Card className="p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Le feed du Foyer</p>
          <p className="mt-1 mb-5 text-sm text-[#293027]/60 dark:text-white/60">
            Le même fil que voient les membres sur leur page du cours. Ce que vous publiez ici paraît chez elles.
          </p>
          <MurSocial fil="formation:foyer" titre="" />
        </Card>
      </div>
    </div>
  );
};

export default FoyerSection;
