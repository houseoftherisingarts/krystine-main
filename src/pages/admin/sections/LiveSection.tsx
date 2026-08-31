import React, { useEffect, useState } from 'react';
import { demarrerLive, terminerLive, suivreLiveEnCours, type LiveEnCours } from '../../../firebase/lives';
import { getFormations, type Formation } from '../../../firebase/formations';
import { Card, Input, Label, PrimaryButton, DangerButton } from '../primitives';

// ─── Lancer un live ──────────────────────────────────────────────────────────
// Krystine démarre un live d'ici : public (la pastille mène au lien ou au
// feed) ou exclusif à une formation (la pastille mène à la page du cours; qui
// ne l'a pas se voit offrir l'achat). Terminer le live éteint la pastille.

const LiveSection: React.FC = () => {
  const [live, setLive] = useState<LiveEnCours | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [titre, setTitre] = useState('');
  const [url, setUrl] = useState('');
  const [portee, setPortee] = useState('');   // '' = public, sinon l'id de la formation
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => suivreLiveEnCours(setLive), []);
  useEffect(() => { getFormations().then(setFormations).catch(() => {}); }, []);

  const lancer = async () => {
    if (!titre.trim() || occupe) return;
    setOccupe(true); setErreur('');
    try {
      await demarrerLive({ titre, url: url.trim() || undefined, formationId: portee || undefined });
      setTitre(''); setUrl('');
    } catch (e: any) { setErreur(e?.message || 'Impossible de démarrer le live.'); }
    finally { setOccupe(false); }
  };
  const arreter = async () => {
    if (occupe) return;
    setOccupe(true); setErreur('');
    try { await terminerLive(); } catch (e: any) { setErreur(e?.message || 'Impossible de terminer le live.'); }
    finally { setOccupe(false); }
  };

  const nomFormation = (id?: string) => formations.find(f => f.id === id)?.titre || id;

  return (
    <div className="max-w-2xl space-y-6">
      {live ? (
        <Card className="p-6 border-2 border-red-500/40">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <p className="font-serif text-xl text-[#293027] dark:text-white">Live en cours : {live.titre}</p>
          </div>
          <p className="mt-2 text-sm text-[#293027]/60 dark:text-white/60">
            {live.formationId
              ? `Exclusif à la formation « ${nomFormation(live.formationId)} ». La pastille mène à la page du cours; qui ne l'a pas se voit offrir l'achat.`
              : 'Public. La pastille du site mène directement à la diffusion.'}
            {live.url ? <> Lien : <a href={live.url} target="_blank" rel="noopener noreferrer" className="text-[#8B4A2F] underline">{live.url}</a></> : null}
          </p>
          <div className="mt-5">
            <DangerButton onClick={arreter} disabled={occupe}><i className="fa-solid fa-stop" /> Terminer le live</DangerButton>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <p className="font-serif text-xl text-[#293027] dark:text-white">Lancer un live</p>
          <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">
            La pastille « Live en cours » s'allume aussitôt en haut du site, et chaque visiteuse peut cliquer pour rejoindre.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Titre du live</Label>
              <Input value={titre} onChange={e => setTitre(e.target.value)} placeholder="Rituel du matin en direct" maxLength={140} />
            </div>
            <div>
              <Label>Lien de diffusion (YouTube, Zoom…)</Label>
              <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" type="url" />
            </div>
            <div>
              <Label>Où se donne le live ?</Label>
              <select
                value={portee}
                onChange={e => setPortee(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#38403a]/10 dark:border-white/10 focus:border-[#BA7B39] outline-none bg-white/60 dark:bg-white/5 text-[#293027] dark:text-white"
              >
                <option value="">Public · le feed de la communauté</option>
                {formations.map(f => (
                  <option key={f.id} value={f.id}>Exclusif · {f.titre}</option>
                ))}
              </select>
            </div>
            {erreur && <p className="text-sm text-red-600">{erreur}</p>}
            <PrimaryButton onClick={lancer} disabled={occupe || !titre.trim()}>
              <i className="fa-solid fa-tower-broadcast" /> Démarrer le live
            </PrimaryButton>
          </div>
        </Card>
      )}
    </div>
  );
};

export default LiveSection;
