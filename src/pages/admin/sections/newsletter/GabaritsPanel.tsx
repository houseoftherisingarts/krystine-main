// Les gabarits d'infolettre, rangés par catégorie. Un gabarit naît depuis le
// composeur (« Enregistrer comme gabarit »); d'ici, on en fait une nouvelle
// lettre, on le renomme, on le change de catégorie ou on le retire.
import React, { useEffect, useMemo, useState } from 'react';
import { getGabarits, updateGabarit, deleteGabarit, nouvelleLettreDepuis, CATEGORIES_GABARITS, type GabaritInfolettre } from '../../../../firebase/firestore';
import { Card, EmptyState, GhostButton, DangerButton, PrimaryButton, Input } from '../../primitives';

interface Props { onOpen: (id: string | null) => void }

const GabaritsPanel: React.FC<Props> = ({ onOpen }) => {
  const [items, setItems] = useState<GabaritInfolettre[]>([]);
  const [loading, setLoading] = useState(true);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [edition, setEdition] = useState<{ id: string; nom: string; categorie: string } | null>(null);

  const refresh = () => getGabarits().then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const categories = useMemo(() => {
    const vues = new Set<string>(CATEGORIES_GABARITS);
    for (const g of items) if (g.categorie) vues.add(g.categorie);
    return [...vues];
  }, [items]);

  const groupes = useMemo(() => categories
    .map(c => ({ categorie: c, gabarits: items.filter(g => (g.categorie || 'Autres') === c) }))
    .filter(g => g.gabarits.length || CATEGORIES_GABARITS.includes(g.categorie)), [categories, items]);

  const nouvelle = async (g: GabaritInfolettre) => {
    if (!g.id) return;
    setErreur(null); setOccupe(g.id);
    try { onOpen(await nouvelleLettreDepuis(g, g.title || g.nom)); }
    catch (e: any) { setErreur(e?.message || 'Impossible de créer la lettre.'); }
    finally { setOccupe(null); }
  };

  const enregistrerEdition = async () => {
    if (!edition) return;
    const nom = edition.nom.trim(), categorie = edition.categorie.trim();
    if (!nom || !categorie) return;
    setOccupe(edition.id);
    try { await updateGabarit(edition.id, { nom, categorie }); setEdition(null); await refresh(); }
    catch (e: any) { setErreur(e?.message || 'Impossible d’enregistrer.'); }
    finally { setOccupe(null); }
  };

  const supprimer = async (g: GabaritInfolettre) => {
    if (!g.id || !confirm(`Retirer le gabarit « ${g.nom} » ? Les lettres déjà créées à partir de lui restent.`)) return;
    setOccupe(g.id);
    try { await deleteGabarit(g.id); await refresh(); }
    catch (e: any) { setErreur(e?.message || 'Impossible de retirer ce gabarit.'); }
    finally { setOccupe(null); }
  };

  if (loading) return <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[#293027]/60 dark:text-white/60">
          {items.length} gabarit{items.length > 1 ? 's' : ''}. Un gabarit se crée depuis une lettre ouverte, avec le bouton « Enregistrer comme gabarit ».
        </p>
        <PrimaryButton onClick={() => onOpen(null)} className="ml-auto"><i className="fa-solid fa-plus" /> Nouvelle lettre vide</PrimaryButton>
      </div>

      {erreur && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{erreur}</p>}

      {items.length === 0 && (
        <EmptyState icon="fa-layer-group">
          Aucun gabarit pour l’instant. Ouvrez une infolettre que vous aimez, puis cliquez « Enregistrer comme gabarit » : elle apparaîtra ici, dans sa catégorie.
        </EmptyState>
      )}

      {groupes.map(gr => (
        <section key={gr.categorie}>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">
            {gr.categorie} <span className="ml-1 opacity-60">{gr.gabarits.length}</span>
          </h3>
          {gr.gabarits.length === 0 ? (
            <p className="text-sm text-[#293027]/45 dark:text-white/45">Rien encore dans cette catégorie.</p>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {gr.gabarits.map(g => (
                    <tr key={g.id} className="border-t first:border-t-0 border-[#293027]/5 dark:border-white/5 hover:bg-[#BA7B39]/5">
                      <td className="px-4 py-3 text-[#293027] dark:text-white font-serif min-w-[11rem]">
                        {edition?.id === g.id ? (
                          <div className="flex flex-col gap-2 font-sans max-w-sm">
                            <Input value={edition.nom} onChange={e => setEdition({ ...edition, nom: e.target.value })} placeholder="Nom du gabarit" />
                            <Input list="categories-gabarits" value={edition.categorie} onChange={e => setEdition({ ...edition, categorie: e.target.value })} placeholder="Catégorie" />
                            <datalist id="categories-gabarits">{categories.map(c => <option key={c} value={c} />)}</datalist>
                            <div className="flex gap-2">
                              <PrimaryButton onClick={enregistrerEdition} disabled={occupe === g.id}>Enregistrer</PrimaryButton>
                              <GhostButton onClick={() => setEdition(null)}>Annuler</GhostButton>
                            </div>
                          </div>
                        ) : (
                          <>
                            {g.nom}
                            {g.lang === 'en' && <span className="ml-2 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full bg-[#293027]/10 text-[#293027]/70 dark:bg-white/10 dark:text-white/70 align-middle">EN</span>}
                            <div className="mt-1 font-sans text-xs text-[#293027]/55 dark:text-white/55 truncate max-w-[40ch]" title={g.subject}>{g.subject || 'Sans sujet'} · {g.blocks?.length || 0} bloc{(g.blocks?.length || 0) > 1 ? 's' : ''}</div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#293027]/50 dark:text-white/50 hidden md:table-cell whitespace-nowrap">{g.updatedAt?.toDate().toLocaleDateString('fr-CA') || ''}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <PrimaryButton onClick={() => nouvelle(g)} disabled={occupe !== null} title="Ouvre une nouvelle lettre qui reprend ce gabarit; la bannière du haut se change ensuite">
                            <i className={`fa-solid ${occupe === g.id ? 'fa-circle-notch fa-spin' : 'fa-envelope-open-text'}`} /> <span className="hidden sm:inline">Nouvelle infolettre</span>
                          </PrimaryButton>
                          <GhostButton onClick={() => setEdition({ id: g.id!, nom: g.nom, categorie: g.categorie })} title="Renommer ou changer de catégorie"><i className="fa-solid fa-pen" /></GhostButton>
                          <DangerButton onClick={() => supprimer(g)} disabled={occupe !== null}><i className="fa-solid fa-trash" /></DangerButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>
      ))}
    </div>
  );
};

export default GabaritsPanel;
