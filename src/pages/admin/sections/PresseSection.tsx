/**
 * Éditeur du kit de presse : Krystine change une photo ou un paragraphe ici,
 * publie, et /presse comme le bouton « Télécharger » reflètent le changement
 * aussitôt (VisuelPresse.tsx rend en direct depuis le même document Firestore).
 *
 * Brouillon/publication comme le reste de l'admin (SettingsSection, GrowthSection) :
 * chaque frappe écrit dans brouillons/presse (debounce, pour ne pas spammer
 * Firestore à chaque lettre), et « Publier » copie ce brouillon dans
 * settings/presse, le document que /presse lit réellement.
 */
import React, { useEffect, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { uploadImage, reduireImage } from '../../../firebase/storage';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, EmptyState } from '../primitives';
import {
  CHEMIN_PRESSE, CHEMIN_BROUILLON_PRESSE, KIT_DEFAUT, lireKit, urlPhoto,
  type KitPresse, type CartePresse, type PlanchePresse, type TextePresse,
} from '../../../content/presse';
import { CadreEchelle, VisuelCarte, VisuelPlanche } from '../../../components/presse/VisuelPresse';

type Onglet = 'cartes' | 'planches' | 'pages' | 'textes';

/** Dépose une photo dans Storage et réduit son poids avant l'envoi, comme partout ailleurs dans l'admin. */
async function televerserCadrage(file: File): Promise<string> {
  const reduite = await reduireImage(file);
  const { url } = await uploadImage(reduite, 'presse');
  return url;
}

export default function PresseSection() {
  const [kit, setKit] = useState<KitPresse | null>(null);
  const [onglet, setOnglet] = useState<Onglet>('cartes');
  const [selection, setSelection] = useState<string | null>(null);
  const [publication, setPublication] = useState<'brouillon' | 'publication' | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le brouillon prime s'il existe déjà (quelqu'un a commencé à éditer) ; sinon
  // on part du kit publié, et sinon du kit d'origine, pour ne jamais ouvrir un
  // éditeur vide sur un site qui a pourtant du contenu.
  useEffect(() => {
    if (!db) { setKit(KIT_DEFAUT); return; }
    (async () => {
      const [colB, idB] = CHEMIN_BROUILLON_PRESSE.split('/');
      const brouillon = await getDoc(doc(db, colB, idB));
      if (brouillon.exists()) { setKit(lireKit(brouillon.data().json)); return; }
      const [colP, idP] = CHEMIN_PRESSE.split('/');
      const publie = await getDoc(doc(db, colP, idP));
      setKit(lireKit(publie.data()?.json));
    })();
  }, []);

  function ecrireBrouillon(suivant: KitPresse) {
    setKit(suivant);
    if (!db) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(async () => {
      const [col, id] = CHEMIN_BROUILLON_PRESSE.split('/');
      await setDoc(doc(db, col, id), { json: JSON.stringify(suivant) }, { merge: true });
    }, 700);
  }

  async function publier() {
    if (!db || !kit) return;
    setPublication('publication');
    const [col, id] = CHEMIN_PRESSE.split('/');
    await setDoc(doc(db, col, id), { json: JSON.stringify(kit) }, { merge: true });
    setPublication(null);
  }

  if (!kit) return <div className="p-8 text-[#293027]/50 dark:text-white/50">Chargement…</div>;

  const majCarte = (i: number, champ: keyof CartePresse, v: string) => {
    const cartes = kit.cartes.slice();
    cartes[i] = { ...cartes[i], [champ]: v };
    ecrireBrouillon({ ...kit, cartes });
  };
  const majPlanche = (liste: 'planches' | 'pages', i: number, champ: keyof PlanchePresse, v: string) => {
    const arr = kit[liste].slice();
    arr[i] = { ...arr[i], [champ]: v };
    ecrireBrouillon({ ...kit, [liste]: arr });
  };
  const majTexte = (i: number, champ: keyof TextePresse, v: string) => {
    const textes = kit.textes.slice();
    textes[i] = { ...textes[i], [champ]: v };
    ecrireBrouillon({ ...kit, textes });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#293027] dark:text-white">Kit de presse</h1>
          <p className="text-sm text-[#293027]/60 dark:text-white/60">Les changements s'enregistrent seuls ; rien ne va sur /presse avant « Publier ».</p>
        </div>
        <PrimaryButton onClick={publier} disabled={publication === 'publication'}>
          {publication === 'publication' ? 'Publication…' : 'Publier les changements'}
        </PrimaryButton>
      </div>

      <div className="flex gap-2 border-b border-[#293027]/10 dark:border-white/10 pb-2">
        {(['cartes', 'planches', 'pages', 'textes'] as Onglet[]).map(o => (
          <button
            key={o}
            onClick={() => { setOnglet(o); setSelection(null); }}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${onglet === o ? 'bg-[#BA7B39] text-[#293027]' : 'text-[#293027]/50 dark:text-white/50 hover:text-[#293027] dark:hover:text-white'}`}
          >
            {o}
          </button>
        ))}
      </div>

      {onglet === 'cartes' && (
        <div className="grid md:grid-cols-2 gap-4">
          {kit.cartes.map((c, i) => (
            <EditeurCarte key={c.key} carte={c} onChamp={(champ, v) => majCarte(i, champ, v)}
              ouvert={selection === c.key} onToggle={() => setSelection(selection === c.key ? null : c.key)}
              onCadrage={(champ, v) => {
                const cartes = kit.cartes.slice();
                cartes[i] = { ...cartes[i], photo: { ...cartes[i].photo, [champ]: v } };
                ecrireBrouillon({ ...kit, cartes });
              }}
            />
          ))}
        </div>
      )}

      {(onglet === 'planches' || onglet === 'pages') && (
        <div className="grid md:grid-cols-2 gap-4">
          {kit[onglet].map((p, i) => (
            <EditeurPlanche key={p.key} item={p} page={onglet === 'pages'}
              onChamp={(champ, v) => majPlanche(onglet, i, champ, v)}
              ouvert={selection === p.key} onToggle={() => setSelection(selection === p.key ? null : p.key)}
              onCadrage={(champ, v) => {
                const arr = kit[onglet].slice();
                arr[i] = { ...arr[i], photo: { ...arr[i].photo, [champ]: v } };
                ecrireBrouillon({ ...kit, [onglet]: arr });
              }}
            />
          ))}
        </div>
      )}

      {onglet === 'textes' && (
        <div className="space-y-4">
          {kit.textes.length === 0 && <EmptyState icon="fa-file-lines">Aucun texte.</EmptyState>}
          {kit.textes.map((t, i) => (
            <Card key={t.key} className="p-5">
              <p className="text-sm font-bold text-[#293027] dark:text-white mb-3">{t.labelFR}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Français</Label>
                  <Textarea rows={6} value={t.texteFR} onChange={e => majTexte(i, 'texteFR', e.target.value)} />
                </div>
                {t.texteEN !== undefined && (
                  <div>
                    <Label>English</Label>
                    <Textarea rows={6} value={t.texteEN} onChange={e => majTexte(i, 'texteEN', e.target.value)} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** Une carte, sa fiche repliée par défaut (huit cartes, deux langues chacune : trop pour tout garder ouvert). */
function EditeurCarte({ carte, onChamp, onCadrage, ouvert, onToggle }: {
  carte: CartePresse;
  onChamp: (champ: keyof CartePresse, v: string) => void;
  onCadrage: (champ: 'fichier' | 'focus' | 'focusX', v: string) => void;
  onPhoto: (f: File) => void;
  ouvert: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="p-5">
      <button onClick={onToggle} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[#BA7B39]">{carte.n}</span>
          <span className="font-bold text-[#293027] dark:text-white">{carte.titreFR}</span>
        </div>
        <i className={`fa-solid fa-chevron-${ouvert ? 'up' : 'down'} text-[#293027]/40 dark:text-white/40`} />
      </button>
      {ouvert && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-40 shrink-0">
              <CadreEchelle className="rounded-lg overflow-hidden border border-[#293027]/10">
                <VisuelCarte carte={carte} lang="FR" qr={false} />
              </CadreEchelle>
            </div>
            <div className="flex-1 space-y-2">
              <PhotoField valeur={carte.photo.fichier} onValeur={v => onCadrage('fichier', v)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Focus vertical (0-100)</Label>
                  <Input type="number" min={0} max={100} value={Math.round(carte.photo.focus * 100)} onChange={e => onCadrage('focus', String(Number(e.target.value) / 100))} />
                </div>
                <div>
                  <Label>Focus horizontal (0-100)</Label>
                  <Input type="number" min={0} max={100} value={Math.round(carte.photo.focusX * 100)} onChange={e => onCadrage('focusX', String(Number(e.target.value) / 100))} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Accroche (FR)</Label>
              <Input value={carte.kickerFR} onChange={e => onChamp('kickerFR', e.target.value)} />
              <Label>Titre (FR)</Label>
              <Input value={carte.titreFR} onChange={e => onChamp('titreFR', e.target.value)} />
              <Label>Corps (FR)</Label>
              <Textarea rows={4} value={carte.corpsFR} onChange={e => onChamp('corpsFR', e.target.value)} />
              <Label>Légende de tuile (FR)</Label>
              <Input value={carte.legendeFR} onChange={e => onChamp('legendeFR', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Accroche (EN)</Label>
              <Input value={carte.kickerEN} onChange={e => onChamp('kickerEN', e.target.value)} />
              <Label>Titre (EN)</Label>
              <Input value={carte.titreEN} onChange={e => onChamp('titreEN', e.target.value)} />
              <Label>Corps (EN)</Label>
              <Textarea rows={4} value={carte.corpsEN} onChange={e => onChamp('corpsEN', e.target.value)} />
              <Label>Légende de tuile (EN)</Label>
              <Input value={carte.legendeEN} onChange={e => onChamp('legendeEN', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Texte affiché « Le code mène à »</Label>
            <Input value={carte.cibleAffiche} onChange={e => onChamp('cibleAffiche', e.target.value)} />
          </div>
        </div>
      )}
    </Card>
  );
}

/** Une planche ou une page du site : même gabarit (VisuelPlanche porte toujours les deux langues à la fois). */
function EditeurPlanche({ item, page, onChamp, onCadrage, ouvert, onToggle }: {
  item: PlanchePresse;
  page: boolean;
  onChamp: (champ: keyof PlanchePresse, v: string) => void;
  onCadrage: (champ: 'fichier' | 'focus' | 'focusX', v: string) => void;
  ouvert: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="p-5">
      <button onClick={onToggle} className="w-full flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-[#BA7B39]">{item.n}</span>
          <span className="font-bold text-[#293027] dark:text-white">{item.labelFR}</span>
        </div>
        <i className={`fa-solid fa-chevron-${ouvert ? 'up' : 'down'} text-[#293027]/40 dark:text-white/40`} />
      </button>
      {ouvert && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-40 shrink-0">
              <CadreEchelle className="rounded-lg overflow-hidden border border-[#293027]/10">
                <VisuelPlanche item={item} qr={false} page={page} />
              </CadreEchelle>
            </div>
            <div className="flex-1 space-y-2">
              <PhotoField valeur={item.photo.fichier} onValeur={v => onCadrage('fichier', v)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Focus vertical (0-100)</Label>
                  <Input type="number" min={0} max={100} value={Math.round(item.photo.focus * 100)} onChange={e => onCadrage('focus', String(Number(e.target.value) / 100))} />
                </div>
                <div>
                  <Label>Focus horizontal (0-100)</Label>
                  <Input type="number" min={0} max={100} value={Math.round(item.photo.focusX * 100)} onChange={e => onCadrage('focusX', String(Number(e.target.value) / 100))} />
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Titre de tuile (FR)</Label>
              <Input value={item.labelFR} onChange={e => onChamp('labelFR', e.target.value)} />
              <Label>Légende de tuile (FR)</Label>
              <Input value={item.legendeFR} onChange={e => onChamp('legendeFR', e.target.value)} />
              <Label>Légende peinte sur le visuel (FR)</Label>
              <Textarea rows={3} value={item.texteFR} onChange={e => onChamp('texteFR', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Titre de tuile (EN)</Label>
              <Input value={item.labelEN} onChange={e => onChamp('labelEN', e.target.value)} />
              <Label>Légende de tuile (EN)</Label>
              <Input value={item.legendeEN} onChange={e => onChamp('legendeEN', e.target.value)} />
              <Label>Légende peinte sur le visuel (EN)</Label>
              <Textarea rows={3} value={item.texteEN} onChange={e => onChamp('texteEN', e.target.value)} />
            </div>
          </div>
          {page && (
            <div>
              <Label>Domaine affiché en pied de visuel</Label>
              <Input value={item.adresse || ''} onChange={e => onChamp('adresse', e.target.value)} />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Aperçu de la photo courante + téléversement : le champ texte reste modifiable pour un chemin /public existant. */
function PhotoField({ valeur, onValeur }: { valeur: string; onValeur: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Label>Photo</Label>
      <div className="flex gap-2">
        <Input value={valeur} onChange={e => onValeur(e.target.value)} className="flex-1" />
        <GhostButton type="button" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? '…' : 'Téléverser'}
        </GhostButton>
      </div>
      <input
        ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={async e => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try {
            const url = await televerserCadrage(f);
            onValeur(url);
          } finally {
            setBusy(false);
            if (fileRef.current) fileRef.current.value = '';
          }
        }}
      />
      {valeur && <img src={urlPhoto(valeur)} alt="" className="mt-2 h-16 w-24 object-cover rounded border border-[#293027]/10" />}
    </div>
  );
}
