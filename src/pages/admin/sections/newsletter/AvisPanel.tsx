import React, { useEffect, useState } from 'react';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, DangerButton, ToggleSwitch, EmptyState } from '../../primitives';
import { listerAvis, creerAvis, majAvis, supprimerAvis, compterLectures, type Avis } from '../../../../firebase/avis';

// Les avis épinglés (Alex, 11 septembre 2026) : Krystine écrit un avis, il
// paraît en bulle au-dessus de la fleur de l'accueil et dans la cloche du
// site tant qu'il est actif; chaque cliente le range dans ses Lettres d'un
// clic sur « Lu ». Ici : la liste, le compte de lectures, et l'éditeur.

const VIDE = { titre: '', texte: '', lienHref: '', lienLibelle: '', actif: true };

const AvisPanel: React.FC = () => {
  const [liste, setListe] = useState<Avis[]>([]);
  const [lectures, setLectures] = useState<Record<string, number>>({});
  const [chargement, setChargement] = useState(true);
  const [edition, setEdition] = useState<{ id: string | null; champs: typeof VIDE } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const rafraichir = () => Promise.all([listerAvis(), compterLectures()])
    .then(([l, n]) => { setListe(l); setLectures(n); })
    .catch((e: any) => setErreur(e?.message || 'La liste n’a pas pu se charger.'))
    .finally(() => setChargement(false));
  useEffect(() => { void rafraichir(); }, []);

  const enregistrer = async () => {
    if (!edition) return;
    const c = edition.champs;
    if (!c.titre.trim() || !c.texte.trim()) { setErreur('Le titre et le texte sont nécessaires.'); return; }
    setEnregistrement(true); setErreur(null);
    try {
      const patch = { titre: c.titre.trim(), texte: c.texte.trim(), actif: c.actif, lienHref: c.lienHref.trim() || '', lienLibelle: c.lienLibelle.trim() || '' };
      if (edition.id) await majAvis(edition.id, patch); else await creerAvis(patch);
      setEdition(null);
      await rafraichir();
    } catch (e: any) {
      setErreur(e?.message || 'L’avis n’a pas pu être enregistré.');
    } finally {
      setEnregistrement(false);
    }
  };

  const basculer = async (a: Avis) => {
    await majAvis(a.id, { actif: !a.actif });
    setListe((prev) => prev.map((x) => (x.id === a.id ? { ...x, actif: !a.actif } : x)));
  };

  const retirer = async (a: Avis) => {
    if (!confirm(`Supprimer l’avis « ${a.titre} » ? Les clientes qui l’avaient épinglé le perdront.`)) return;
    await supprimerAvis(a.id);
    await rafraichir();
  };

  const date = (a: Avis) => a.creeLe?.toDate().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) || '';

  if (edition) {
    const c = edition.champs;
    const poser = (patch: Partial<typeof VIDE>) => setEdition({ ...edition, champs: { ...c, ...patch } });
    return (
      <Card className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-serif text-2xl text-[#293027]">{edition.id ? 'Modifier l’avis' : 'Nouvel avis épinglé'}</h3>
          <GhostButton onClick={() => setEdition(null)}>Annuler</GhostButton>
        </div>
        <div>
          <Label>Titre</Label>
          <Input value={c.titre} onChange={(e) => poser({ titre: e.target.value })} placeholder="Vos programmes arrivent dans votre espace" />
        </div>
        <div>
          <Label>Texte</Label>
          <Textarea rows={5} value={c.texte} onChange={(e) => poser({ texte: e.target.value })} placeholder="La plateforme est en cours de migration…" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Lien (facultatif)</Label>
            <Input value={c.lienHref} onChange={(e) => poser({ lienHref: e.target.value })} placeholder="/compte" />
          </div>
          <div>
            <Label>Libellé du lien</Label>
            <Input value={c.lienLibelle} onChange={(e) => poser({ lienLibelle: e.target.value })} placeholder="Ouvrir mon espace" />
          </div>
        </div>
        <ToggleSwitch checked={c.actif} onChange={(v) => poser({ actif: v })} label="Épinglé au babillard (visible en bulle et dans la cloche)" />
        {erreur && <p className="text-sm text-red-600">{erreur}</p>}
        <div className="flex justify-end gap-3">
          <PrimaryButton onClick={enregistrer} disabled={enregistrement}>{enregistrement ? 'Un instant…' : 'Enregistrer'}</PrimaryButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[60ch] text-sm text-[#293027]/70">
          Un avis actif paraît en bulle au-dessus de la fleur de l’accueil et dans la cloche du site, avec l’icône d’avis à point d’exclamation. Quand une cliente clique « Lu », il se range dans ses Lettres, partie Avis épinglés.
        </p>
        <PrimaryButton onClick={() => { setErreur(null); setEdition({ id: null, champs: { ...VIDE } }); }}><i className="fa-solid fa-plus mr-2" />Nouvel avis</PrimaryButton>
      </div>
      {erreur && !edition && <p className="text-sm text-red-600">{erreur}</p>}
      {chargement ? (
        <div className="py-10 text-center text-[#8B4A2F]"><i className="fa-solid fa-circle-notch fa-spin text-xl" /></div>
      ) : liste.length === 0 ? (
        <EmptyState icon="fa-thumbtack">Aucun avis pour l’instant. Le premier s’écrit avec le bouton « Nouvel avis ».</EmptyState>
      ) : (
        <div className="space-y-3">
          {liste.map((a) => (
            <Card key={a.id} className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${a.actif ? 'bg-green-50 text-green-700' : 'bg-[#293027]/5 text-[#293027]/50'}`}>{a.actif ? 'Épinglé' : 'Retiré'}</span>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[#293027]/50">{date(a)}</span>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[#8B4A2F]">Lu par {lectures[a.id] || 0}</span>
                </div>
                <h4 className="mt-2 font-serif text-xl text-[#293027]">{a.titre}</h4>
                <p className="mt-1 text-sm leading-relaxed text-[#293027]/70 whitespace-pre-line">{a.texte}</p>
                {a.lienHref && <p className="mt-1 text-xs text-[#8B4A2F]">{a.lienLibelle || 'Lien'} → {a.lienHref}</p>}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <ToggleSwitch checked={!!a.actif} onChange={() => { void basculer(a); }} label={a.actif ? 'Actif' : 'Inactif'} />
                <GhostButton onClick={() => { setErreur(null); setEdition({ id: a.id, champs: { titre: a.titre, texte: a.texte, lienHref: a.lienHref || '', lienLibelle: a.lienLibelle || '', actif: !!a.actif } }); }}>Modifier</GhostButton>
                <DangerButton onClick={() => { void retirer(a); }}>Supprimer</DangerButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AvisPanel;
