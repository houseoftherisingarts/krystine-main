import React, { useEffect, useMemo, useState } from 'react';
import {
  getEvents, addEvent, updateEvent, deleteEvent, placesRestantes,
  type EventDoc,
} from '../../../firebase/firestore';
import { getBilletsDeEvenement, enDollars, avecTaxes, type Billet } from '../../../firebase/billets';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, DangerButton, ToggleSwitch, EmptyState, ImageUpload, downloadCsv } from '../primitives';
import TicketScanner from '../../../components/admin/TicketScanner';

const emptyEvent: Partial<EventDoc> = {
  title: '', subtitle: '', date: '', location: '', description: '', imageUrl: '', registrationLink: '', isFeatured: false, isPublished: true,
  billetterie: false, maxParAchat: 6,
};

/** « Le Lancement, à l'église ! » devient « le-lancement-a-l-eglise ». */
const slugify = (s: string) => s
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const lignes = (texte: string) => texte.split('\n');
const ligneNonVides = (arr?: string[]) => (arr || []).map(s => s.trim()).filter(Boolean);

const dateLisible = (t?: Billet['createdAt']) => t ? t.toDate().toLocaleString('fr-CA', { dateStyle: 'medium', timeStyle: 'short' }) : '';

const EventsSection: React.FC = () => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EventDoc> | null>(null);
  const [slugTouche, setSlugTouche] = useState(false);
  const [slugErreur, setSlugErreur] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Billets vendus par événement, chargés à la demande quand on déplie le
  // panneau, pour ne jamais interroger Firestore sur un événement fermé.
  const [billetsPar, setBilletsPar] = useState<Record<string, Billet[]>>({});
  const [billetsOuvert, setBilletsOuvert] = useState<string | null>(null);
  const [billetsChargement, setBilletsChargement] = useState(false);
  const [scannerOuvert, setScannerOuvert] = useState<string | null>(null);

  const refresh = () => getEvents().then(setEvents).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const startCreate = () => { setEditing({ ...emptyEvent }); setSlugTouche(false); setSlugErreur(null); };
  const startEdit = (e: EventDoc) => { setEditing({ ...e }); setSlugTouche(true); setSlugErreur(null); };
  const cancel = () => setEditing(null);

  const setTitre = (title: string) => {
    setEditing(prev => {
      if (!prev) return prev;
      const slug = slugTouche ? prev.slug : slugify(title);
      return { ...prev, title, slug };
    });
  };

  const slugDejaPris = useMemo(() => {
    if (!editing?.slug) return false;
    return events.some(e => e.slug === editing.slug && e.id !== editing.id);
  }, [events, editing?.slug, editing?.id]);

  const save = async () => {
    if (!editing || !editing.title || !editing.date) return;
    if (editing.billetterie && slugDejaPris) { setSlugErreur('Ce slug est déjà pris par un autre événement.'); return; }
    setSlugErreur(null);
    setSaving(true);
    try {
      const body = {
        ...editing,
        argumentaire: ligneNonVides(editing.argumentaire),
        inclus: ligneNonVides(editing.inclus),
      };
      if (body.id) {
        const { id, createdAt, ...patch } = body;
        await updateEvent(id!, patch);
      } else {
        const { id, createdAt, ...rest } = body;
        await addEvent(rest as Omit<EventDoc, 'id' | 'createdAt'>);
      }
      await refresh();
      setEditing(null);
    } finally { setSaving(false); }
  };

  const del = async (e: EventDoc) => {
    if (!e.id) return;
    if (!confirm(`Supprimer « ${e.title} » ?`)) return;
    await deleteEvent(e.id);
    await refresh();
  };

  const toggleBillets = async (e: EventDoc) => {
    if (!e.id) return;
    if (billetsOuvert === e.id) { setBilletsOuvert(null); return; }
    setBilletsOuvert(e.id);
    if (!billetsPar[e.id]) {
      setBilletsChargement(true);
      try {
        const liste = await getBilletsDeEvenement(e.id);
        setBilletsPar(prev => ({ ...prev, [e.id!]: liste }));
      } finally { setBilletsChargement(false); }
    }
  };

  const exporter = (e: EventDoc) => {
    const liste = billetsPar[e.id || ''] || [];
    downloadCsv(`billets-${e.slug || e.id}.csv`, liste.map(b => ({
      Code: b.code,
      Nom: b.nom || '',
      Courriel: b.email,
      Achat: dateLisible(b.createdAt),
      Entré: b.utilise ? 'Oui' : 'Non',
    })));
  };

  const rafraichirBillet = (eventId: string) => {
    getBilletsDeEvenement(eventId).then(liste => setBilletsPar(prev => ({ ...prev, [eventId]: liste })));
  };

  const prixDollars = editing?.prixCents != null ? String(editing.prixCents / 100) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#293027]/60 dark:text-white/60">{events.length} événement{events.length > 1 ? 's' : ''}</p>
        <PrimaryButton onClick={startCreate}><i className="fa-solid fa-plus" /> Ajouter</PrimaryButton>
      </div>

      {editing && (
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Label>Image</Label>
              <ImageUpload value={editing.imageUrl || ''} onChange={url => setEditing({ ...editing, imageUrl: url })} folder="events" />
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input value={editing.title || ''} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'événement" />
              </div>
              <div>
                <Label>Sous-titre</Label>
                <Input value={editing.subtitle || ''} onChange={e => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={editing.date || ''} onChange={e => setEditing({ ...editing, date: e.target.value })} />
                </div>
                <div>
                  <Label>Lieu</Label>
                  <Input value={editing.location || ''} onChange={e => setEditing({ ...editing, location: e.target.value })} placeholder="Ville · Pays · En ligne" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={4} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label>Lien d'inscription</Label>
                <Input type="url" value={editing.registrationLink || ''} onChange={e => setEditing({ ...editing, registrationLink: e.target.value })} placeholder="https://…" />
              </div>
              <div className="flex flex-wrap gap-6 pt-2">
                <ToggleSwitch checked={!!editing.isFeatured} onChange={v => setEditing({ ...editing, isFeatured: v })} label="En vedette" />
                <ToggleSwitch checked={editing.isPublished !== false} onChange={v => setEditing({ ...editing, isPublished: v })} label="Publié" />
              </div>

              <div className="border-t border-[#38403a]/10 dark:border-white/10 pt-4">
                <ToggleSwitch checked={!!editing.billetterie} onChange={v => setEditing({ ...editing, billetterie: v })} label="Vendre les billets ici" />
              </div>

              {editing.billetterie && (
                <div className="space-y-4 bg-[#EEE7DB]/50 dark:bg-white/5 rounded-[15px] p-5">
                  <div>
                    <Label>Adresse de la page</Label>
                    <Input value={editing.slug || ''} onChange={e => { setSlugTouche(true); setEditing({ ...editing, slug: slugify(e.target.value) }); }} placeholder="le-lancement-du-livre" />
                    <p className="text-xs text-[#293027]/50 dark:text-white/50 mt-1">
                      La page se trouvera à /evenement/{editing.slug || '…'}
                    </p>
                    {slugDejaPris && <p className="text-xs text-red-500 mt-1">Un autre événement porte déjà cette adresse.</p>}
                    {slugErreur && <p className="text-xs text-red-500 mt-1">{slugErreur}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Prix avant taxes</Label>
                      <div className="relative">
                        <Input
                          type="number" min="0" step="0.01"
                          value={prixDollars}
                          onChange={e => setEditing({ ...editing, prixCents: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                          placeholder="200"
                        />
                      </div>
                      {!!editing.prixCents && (
                        <p className="text-xs text-[#293027]/50 dark:text-white/50 mt-1">
                          Soit {enDollars(avecTaxes(editing.prixCents))} taxes comprises (TPS + TVQ)
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Places</Label>
                      <Input type="number" min="0" value={editing.places ?? ''} onChange={e => setEditing({ ...editing, places: parseInt(e.target.value) || 0 })} placeholder="200" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Billets par achat</Label>
                      <Input type="number" min="1" value={editing.maxParAchat ?? ''} onChange={e => setEditing({ ...editing, maxParAchat: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div>
                      <Label>Heure</Label>
                      <Input value={editing.heure || ''} onChange={e => setEditing({ ...editing, heure: e.target.value })} placeholder="19 h" />
                    </div>
                  </div>

                  <div>
                    <Label>Adresse civique</Label>
                    <Input value={editing.adresse || ''} onChange={e => setEditing({ ...editing, adresse: e.target.value })} placeholder="123 rue de l'Église, Ville" />
                  </div>

                  <div>
                    <Label>Image du hero</Label>
                    <ImageUpload value={editing.imageHero || ''} onChange={url => setEditing({ ...editing, imageHero: url })} folder="events-hero" />
                  </div>

                  <div>
                    <Label>Argumentaire</Label>
                    <Textarea
                      rows={4}
                      value={(editing.argumentaire || []).join('\n')}
                      onChange={e => setEditing({ ...editing, argumentaire: lignes(e.target.value) })}
                      placeholder="Un argument par ligne. Ce texte attend le message vocal de Krystine."
                    />
                  </div>
                  <div>
                    <Label>Ce que le billet inclut</Label>
                    <Textarea
                      rows={3}
                      value={(editing.inclus || []).join('\n')}
                      onChange={e => setEditing({ ...editing, inclus: lignes(e.target.value) })}
                      placeholder="Une ligne par élément inclus"
                    />
                  </div>

                  <div>
                    <Label>Note sous le bouton d'achat</Label>
                    <Input value={editing.noteAchat || ''} onChange={e => setEditing({ ...editing, noteAchat: e.target.value })} placeholder="Politique de remboursement, par exemple" />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <GhostButton onClick={cancel}>Annuler</GhostButton>
                <PrimaryButton onClick={save} disabled={saving || !editing.title || !editing.date || (!!editing.billetterie && (!editing.slug || slugDejaPris))}>
                  {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Enregistrement</> : <>{editing.id ? 'Mettre à jour' : 'Publier'}</>}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F] text-2xl" /></div>
      ) : events.length === 0 ? (
        <EmptyState icon="fa-calendar">Aucun événement pour l'instant.</EmptyState>
      ) : (
        <div className="space-y-3">
          {events.map(e => {
            const restantes = placesRestantes(e);
            const vendus = e.vendus ?? 0;
            const total = e.places ?? 0;
            const pct = total > 0 ? Math.min(100, Math.round((vendus / total) * 100)) : 0;
            const recette = vendus * (e.prixCents ?? 0);
            const billets = e.id ? billetsPar[e.id] : undefined;

            return (
              <Card key={e.id} className="p-5">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-xl bg-cover bg-center bg-[#EEE7DB] dark:bg-white/5 shrink-0" style={{ backgroundImage: e.imageUrl ? `url(${e.imageUrl})` : undefined }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-serif text-[#293027] dark:text-white truncate">{e.title}</h3>
                      {e.isFeatured && <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#BA7B39]/10 text-[#8B4A2F]">Vedette</span>}
                      {e.isPublished === false && <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#293027]/10 dark:bg-white/10 text-[#293027]/60 dark:text-white/60">Brouillon</span>}
                      {e.billetterie && <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Billetterie</span>}
                    </div>
                    <p className="text-sm text-[#293027]/50 dark:text-white/50 truncate">{e.date}{e.location ? ` · ${e.location}` : ''}</p>

                    {e.billetterie && (
                      <div className="mt-3 max-w-sm">
                        <div className="flex items-center justify-between text-xs text-[#293027]/60 dark:text-white/60 mb-1">
                          <span>{vendus} / {total} places vendues</span>
                          <span>{enDollars(recette)} encaissés (hors taxes)</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#293027]/10 dark:bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-[#BA7B39] transition-[width]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 shrink-0">
                    {e.billetterie && e.slug && (
                      <GhostButton onClick={() => window.open(`/evenement/${e.slug}?apercu=1`, '_blank')}>
                        <i className="fa-solid fa-arrow-up-right-from-square" /> Page de vente
                      </GhostButton>
                    )}
                    {e.billetterie && (
                      <GhostButton onClick={() => toggleBillets(e)}>
                        <i className="fa-solid fa-ticket" /> Billets
                      </GhostButton>
                    )}
                    {e.billetterie && (
                      <GhostButton onClick={() => setScannerOuvert(scannerOuvert === e.id ? null : (e.id || null))}>
                        <i className="fa-solid fa-qrcode" /> Scanner
                      </GhostButton>
                    )}
                    <GhostButton onClick={() => startEdit(e)}><i className="fa-solid fa-pen" /> Éditer</GhostButton>
                    <DangerButton onClick={() => del(e)}><i className="fa-solid fa-trash" /></DangerButton>
                  </div>
                </div>

                {billetsOuvert === e.id && (
                  <div className="mt-5 pt-5 border-t border-[#38403a]/10 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] uppercase tracking-widest text-[#293027]/60 dark:text-white/60 font-bold">
                        {restantes} place{restantes > 1 ? 's' : ''} restante{restantes > 1 ? 's' : ''}
                      </p>
                      <GhostButton onClick={() => exporter(e)} disabled={!billets?.length}>
                        <i className="fa-solid fa-download" /> Exporter en CSV
                      </GhostButton>
                    </div>
                    {billetsChargement && !billets ? (
                      <div className="py-6 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#8B4A2F]" /></div>
                    ) : !billets?.length ? (
                      <p className="text-sm text-[#293027]/50 dark:text-white/50 py-4">Aucun billet vendu pour l'instant.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">
                              <th className="pb-2 pr-4">Code</th>
                              <th className="pb-2 pr-4">Nom</th>
                              <th className="pb-2 pr-4">Courriel</th>
                              <th className="pb-2 pr-4">Achat</th>
                              <th className="pb-2">Entrée</th>
                            </tr>
                          </thead>
                          <tbody>
                            {billets.map(b => (
                              <tr key={b.id} className="border-t border-[#38403a]/5 dark:border-white/5">
                                <td className="py-2 pr-4 font-mono text-xs">{b.code}</td>
                                <td className="py-2 pr-4">{b.nom || 's.o.'}</td>
                                <td className="py-2 pr-4 text-[#293027]/60 dark:text-white/60">{b.email}</td>
                                <td className="py-2 pr-4 text-[#293027]/60 dark:text-white/60">{dateLisible(b.createdAt)}</td>
                                <td className="py-2">
                                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${b.utilise ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-[#293027]/10 dark:bg-white/10 text-[#293027]/60 dark:text-white/60'}`}>
                                    {b.utilise ? 'Entré' : 'Pas encore'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {scannerOuvert === e.id && e.id && (
                  <div className="mt-5 pt-5 border-t border-[#38403a]/10 dark:border-white/10">
                    <TicketScanner eventId={e.id} eventTitre={e.title} onEntree={() => rafraichirBillet(e.id!)} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsSection;
