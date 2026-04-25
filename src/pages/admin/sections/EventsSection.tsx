import React, { useEffect, useState } from 'react';
import { getEvents, addEvent, updateEvent, deleteEvent, type EventDoc } from '../../../firebase/firestore';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, DangerButton, ToggleSwitch, EmptyState, ImageUpload } from '../primitives';

const emptyEvent: Partial<EventDoc> = {
  title: '', subtitle: '', date: '', location: '', description: '', imageUrl: '', registrationLink: '', isFeatured: false, isPublished: true,
};

const EventsSection: React.FC = () => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EventDoc> | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => getEvents().then(setEvents).finally(() => setLoading(false));
  useEffect(() => { refresh(); }, []);

  const startCreate = () => setEditing({ ...emptyEvent });
  const startEdit = (e: EventDoc) => setEditing({ ...e });
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!editing || !editing.title || !editing.date) return;
    setSaving(true);
    try {
      if (editing.id) {
        const { id, createdAt, ...patch } = editing;
        await updateEvent(id, patch);
      } else {
        const { id, createdAt, ...body } = editing;
        await addEvent(body as Omit<EventDoc, 'id' | 'createdAt'>);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#3A251E]/60 dark:text-white/60">{events.length} événement{events.length > 1 ? 's' : ''}</p>
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
                <Input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Titre de l'événement" />
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
              <div className="flex justify-end gap-3 pt-2">
                <GhostButton onClick={cancel}>Annuler</GhostButton>
                <PrimaryButton onClick={save} disabled={saving || !editing.title || !editing.date}>
                  {saving ? <><i className="fa-solid fa-circle-notch fa-spin" /> Enregistrement</> : <>{editing.id ? 'Mettre à jour' : 'Publier'}</>}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="py-12 flex justify-center"><i className="fa-solid fa-circle-notch fa-spin text-[#B8532F] text-2xl" /></div>
      ) : events.length === 0 ? (
        <EmptyState icon="fa-calendar">Aucun événement pour l'instant.</EmptyState>
      ) : (
        <div className="space-y-3">
          {events.map(e => (
            <Card key={e.id} className="p-5 flex items-center gap-5">
              <div className="w-20 h-20 rounded-xl bg-cover bg-center bg-[#F4E7DD] dark:bg-white/5 shrink-0" style={{ backgroundImage: e.imageUrl ? `url(${e.imageUrl})` : undefined }} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-serif text-[#3A251E] dark:text-white truncate">{e.title}</h3>
                  {e.isFeatured && <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#B8532F]/10 text-[#B8532F]">Vedette</span>}
                  {e.isPublished === false && <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-[#3A251E]/10 dark:bg-white/10 text-[#3A251E]/60 dark:text-white/60">Brouillon</span>}
                </div>
                <p className="text-sm text-[#3A251E]/50 dark:text-white/50 truncate">{e.date}{e.location ? ` · ${e.location}` : ''}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <GhostButton onClick={() => startEdit(e)}><i className="fa-solid fa-pen" /> Éditer</GhostButton>
                <DangerButton onClick={() => del(e)}><i className="fa-solid fa-trash" /></DangerButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsSection;
