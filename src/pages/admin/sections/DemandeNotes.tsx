import React, { useState } from 'react';
import { auth } from '../../../firebase';
import {
  addBookingRequest,
  updateBookingRequest,
  type BookingRequest,
  type NoteDemande,
} from '../../../firebase/firestore';
import { Card, GhostButton, Input, Label, PrimaryButton, Textarea } from '../primitives';

// Les notes de l'équipe sur une demande, et le lien de la publication une fois
// en ligne (Krystine, 14 oct. 2026) : tout l'historique d'un partenaire tient
// sous sa demande, d'où qu'il ait écrit. La grille et la charte de partage
// vivent dans le coffre, 60_cerveau.

const dateNote = (iso: string) =>
  new Date(iso).toLocaleString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const NotesDemande: React.FC<{
  demande: BookingRequest;
  onChange: (patch: Partial<BookingRequest>) => void;
}> = ({ demande, onChange }) => {
  const [texte, setTexte] = useState('');
  const [lien, setLien] = useState(demande.lienPublication || '');
  const [envoi, setEnvoi] = useState(false);
  const notes = demande.notes || [];

  const ajouter = async () => {
    if (!demande.id || !texte.trim()) return;
    setEnvoi(true);
    const note: NoteDemande = { texte: texte.trim(), par: auth?.currentUser?.email || 'équipe', le: new Date().toISOString() };
    const suite = [...notes, note];
    try {
      await updateBookingRequest(demande.id, { notes: suite });
      onChange({ notes: suite });
      setTexte('');
    } finally {
      setEnvoi(false);
    }
  };

  const garderLien = async () => {
    if (!demande.id || lien.trim() === (demande.lienPublication || '')) return;
    await updateBookingRequest(demande.id, { lienPublication: lien.trim() });
    onChange({ lienPublication: lien.trim() });
  };

  return (
    <div className="pt-5 space-y-4">
      <div>
        <span className="block text-[10px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50 font-bold mb-2">Notes de l'équipe</span>
        {notes.length === 0 && <p className="text-sm text-[#293027]/50 dark:text-white/50">Aucune note pour l'instant.</p>}
        <ul className="space-y-2">
          {notes.map((n, i) => (
            <li key={i} className="rounded-xl bg-[#EEE7DB]/60 dark:bg-white/5 px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-[#8B4A2F] mb-1">{dateNote(n.le)} · {n.par}</p>
              <p className="text-sm text-[#293027]/85 dark:text-white/85 leading-relaxed whitespace-pre-line">{n.texte}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-2">
          <Textarea rows={3} value={texte} onChange={e => setTexte(e.target.value)} placeholder="Vérification faite, échange, décision et sa raison" />
          <GhostButton onClick={ajouter} disabled={envoi || !texte.trim()}><i className="fa-solid fa-plus" /> Ajouter la note</GhostButton>
        </div>
      </div>
      <div>
        <Label>Lien de la publication</Label>
        <Input value={lien} onChange={e => setLien(e.target.value)} onBlur={garderLien} placeholder="https://… une fois le texte ou l'entrevue en ligne" />
      </div>
    </div>
  );
};

// Une demande reçue par courriel s'ajoute ici à la main, pour que toutes les
// demandes vivent au même endroit. Source « courriel » : aucun avis ne repart
// vers teamksl, l'équipe a déjà le message.
export const AjoutDemandeCourriel: React.FC<{ onAjout: () => void }> = ({ onAjout }) => {
  const vide = { name: '', email: '', organization: '', organizationUrl: '', demande: '', message: '' };
  const [ouvert, setOuvert] = useState(false);
  const [f, setF] = useState(vide);
  const [envoi, setEnvoi] = useState(false);
  const maj = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const enregistrer = async () => {
    if (!f.name.trim() || !f.email.trim()) return;
    setEnvoi(true);
    try {
      await addBookingRequest({
        name: f.name.trim(),
        email: f.email.trim(),
        organization: f.organization.trim() || undefined,
        organizationUrl: f.organizationUrl.trim() || undefined,
        demande: f.demande.trim() || undefined,
        message: f.message.trim() || undefined,
        source: 'courriel',
        tags: ['courriel'],
      });
      setF(vide);
      setOuvert(false);
      onAjout();
    } finally {
      setEnvoi(false);
    }
  };

  if (!ouvert) {
    return (
      <div className="mb-4">
        <GhostButton onClick={() => setOuvert(true)}><i className="fa-solid fa-envelope-open-text" /> Ajouter une demande reçue par courriel</GhostButton>
      </div>
    );
  }
  return (
    <Card className="p-5 mb-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label>Nom *</Label><Input value={f.name} onChange={maj('name')} /></div>
        <div><Label>Courriel *</Label><Input type="email" value={f.email} onChange={maj('email')} /></div>
        <div><Label>Organisation</Label><Input value={f.organization} onChange={maj('organization')} /></div>
        <div><Label>Site web</Label><Input value={f.organizationUrl} onChange={maj('organizationUrl')} /></div>
      </div>
      <div><Label>Ce qui est demandé</Label><Input value={f.demande} onChange={maj('demande')} placeholder="Publication d'un texte, radio, entrevue, conférence…" /></div>
      <div><Label>Le message reçu</Label><Textarea rows={5} value={f.message} onChange={maj('message')} /></div>
      <div className="flex gap-2">
        <PrimaryButton onClick={enregistrer} disabled={envoi || !f.name.trim() || !f.email.trim()}>Enregistrer la demande</PrimaryButton>
        <GhostButton onClick={() => setOuvert(false)}>Annuler</GhostButton>
      </div>
    </Card>
  );
};
