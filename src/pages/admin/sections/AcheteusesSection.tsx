// « Tes acheteuses d'Origine » : les gens qui ont déjà dit oui une fois.
//
// Leur liste vit dans Kajabi et non dans cette base, alors Krystine dépose ici
// l'export CSV que Kajabi lui donne. Le fichier est lu dans le navigateur, les
// courriels sont rapprochés des comptes du site, et elle peut écrire un mot
// personnalisé à celles qui ont déjà un compte, directement dans leur espace.
// Celles qui n'en ont pas s'exportent en un clic pour l'infolettre.
import React, { useEffect, useMemo, useState } from 'react';
import {
  lireCsvKajabi, importerAcheteuses, getAcheteuses, marquerContactee, personnaliser,
  type AcheteuseKajabi,
} from '../../../firebase/acheteusesKajabi';
import { envoyerMessageKrystine } from '../../../firebase/firestore';
import { Card, Input, Textarea, Label, PrimaryButton, GhostButton, EmptyState, downloadCsv } from '../primitives';

const OFFRE_DEFAUT = 'origine-1';

const MODELE = `Bonjour {prenom},

Vous avez fait L'Expérience Origine avec moi, et je pense souvent à ce groupe-là.

`;

const AcheteusesSection: React.FC = () => {
  const [liste, setListe] = useState<AcheteuseKajabi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [offre, setOffre] = useState(OFFRE_DEFAUT);
  const [apercu, setApercu] = useState<AcheteuseKajabi[] | null>(null);
  const [erreur, setErreur] = useState('');
  const [recherche, setRecherche] = useState('');
  const [choisies, setChoisies] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState(MODELE);
  const [envoi, setEnvoi] = useState(false);
  const [avis, setAvis] = useState('');

  const recharger = () => {
    setChargement(true);
    getAcheteuses().then(setListe).catch(() => setListe([])).finally(() => setChargement(false));
  };
  useEffect(recharger, []);

  const filtrees = useMemo(() => {
    const r = recherche.trim().toLowerCase();
    if (!r) return liste;
    return liste.filter(a => `${a.prenom || ''} ${a.nom || ''} ${a.email}`.toLowerCase().includes(r));
  }, [liste, recherche]);

  const avecCompte = useMemo(() => liste.filter(a => a.uid), [liste]);
  const sansCompte = useMemo(() => liste.filter(a => !a.uid), [liste]);
  const cibles = useMemo(() => avecCompte.filter(a => choisies.has(a.email)), [avecCompte, choisies]);

  const lireFichier = async (f: File) => {
    setErreur('');
    try {
      const trouvees = lireCsvKajabi(await f.text(), offre.trim() || OFFRE_DEFAUT);
      if (!trouvees.length) { setErreur("Aucun courriel n'a été trouvé dans ce fichier. Vérifiez qu'il s'agit bien de l'export des acheteuses."); return; }
      setApercu(trouvees);
    } catch {
      setErreur("Ce fichier n'a pas pu être lu.");
    }
  };

  const confirmerImport = async () => {
    if (!apercu) return;
    const { importees, avecCompte: n } = await importerAcheteuses(apercu);
    setApercu(null);
    setAvis(`${importees} personnes rangées, dont ${n} qui ont déjà un compte sur le site.`);
    recharger();
  };

  const envoyer = async () => {
    if (!cibles.length || !message.trim() || envoi) return;
    setEnvoi(true);
    let partis = 0;
    for (const a of cibles) {
      try {
        await envoyerMessageKrystine(a.uid!, personnaliser(message, a), true, {
          memberEmail: a.email,
          memberName: [a.prenom, a.nom].filter(Boolean).join(' ') || a.email,
        });
        await marquerContactee(a.email);
        partis++;
      } catch { /* une adresse qui échoue n'arrête pas les autres */ }
    }
    setEnvoi(false);
    setChoisies(new Set());
    setAvis(`${partis} mot${partis > 1 ? 's' : ''} déposé${partis > 1 ? 's' : ''} dans leur espace. Elles le verront à leur prochaine visite.`);
    recharger();
  };

  const exporterSansCompte = () => downloadCsv('acheteuses-sans-compte.csv', sansCompte.map(a => ({
    Courriel: a.email, Prenom: a.prenom || '', Nom: a.nom || '', Offre: a.offre,
  })));

  const bloc = 'text-sm text-[#293027]/70 dark:text-white/70';

  return (
    <div className="space-y-6">
      {avis && (
        <Card className="p-4">
          <p className="text-sm text-[#293027] dark:text-white">{avis}</p>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Rapatrier tes acheteuses</h3>
        <p className={`mb-4 max-w-2xl ${bloc}`}>
          Les gens qui ont acheté L'Expérience Origine sur Kajabi ne sont pas dans la base de ce site, parce que
          leur achat s'est fait ailleurs. Sortez leur liste de Kajabi en CSV et déposez-la ici : les courriels
          seront rapprochés des comptes du site, et vous saurez tout de suite lesquelles vous pouvez rejoindre
          directement dans leur espace.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label>Nom de l'offre</Label>
            <Input value={offre} onChange={e => setOffre(e.target.value)} placeholder="origine-1" />
          </div>
          <div>
            <Label>Le fichier de Kajabi</Label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) void lireFichier(f); }}
              className="block text-sm text-[#293027]/70 dark:text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-[#BA7B39] file:px-4 file:py-2 file:text-white"
            />
          </div>
        </div>
        {erreur && <p className="mt-3 text-sm text-red-500">{erreur}</p>}
        {apercu && (
          <div className="mt-5 rounded-2xl border border-[#BA7B39]/30 bg-[#BA7B39]/5 p-4">
            <p className="text-sm text-[#293027] dark:text-white">
              {apercu.length} personnes ont été trouvées dans ce fichier. Les trois premières sont
              {' '}{apercu.slice(0, 3).map(a => a.prenom || a.email).join(', ')}.
            </p>
            <div className="mt-3 flex gap-3">
              <PrimaryButton onClick={confirmerImport}>Ranger ces {apercu.length} personnes</PrimaryButton>
              <GhostButton onClick={() => setApercu(null)}>Annuler</GhostButton>
            </div>
          </div>
        )}
      </Card>

      {chargement ? (
        <Card className="p-6"><p className={bloc}>Lecture en cours.</p></Card>
      ) : liste.length === 0 ? (
        <EmptyState icon="fa-user-group">
          Aucune acheteuse n'a encore été rapatriée. Déposez l'export de Kajabi ci-dessus et elles apparaîtront ici.
        </EmptyState>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Ce que ça donne</h3>
                <p className={`mt-2 ${bloc}`}>
                  {liste.length} acheteuses au total, dont {avecCompte.length} ont déjà un compte ici et
                  {' '}{sansCompte.length} n'en ont pas encore. Celles qui ont un compte reçoivent votre mot
                  directement dans leur espace, et les autres se rejoignent par l'infolettre.
                </p>
              </div>
              {sansCompte.length > 0 && (
                <GhostButton onClick={exporterSansCompte}>
                  <i className="fa-solid fa-download mr-2" />Sortir celles sans compte
                </GhostButton>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Chercher un nom ou un courriel" />
              <GhostButton onClick={() => setChoisies(new Set(avecCompte.map(a => a.email)))}>
                Choisir les {avecCompte.length} qui ont un compte
              </GhostButton>
              {choisies.size > 0 && <GhostButton onClick={() => setChoisies(new Set())}>Tout décocher</GhostButton>}
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">
                  <tr>
                    <th className="py-2 pr-3"> </th>
                    <th className="py-2 pr-3">Nom</th>
                    <th className="py-2 pr-3">Courriel</th>
                    <th className="py-2 pr-3">Compte</th>
                    <th className="py-2">Dernier mot</th>
                  </tr>
                </thead>
                <tbody className="text-[#293027] dark:text-white">
                  {filtrees.map(a => (
                    <tr key={a.email} className="border-t border-[#293027]/10 dark:border-white/10">
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          disabled={!a.uid}
                          checked={choisies.has(a.email)}
                          onChange={e => setChoisies(prev => {
                            const s = new Set(prev);
                            if (e.target.checked) s.add(a.email); else s.delete(a.email);
                            return s;
                          })}
                        />
                      </td>
                      <td className="py-2 pr-3">{[a.prenom, a.nom].filter(Boolean).join(' ') || 's.o.'}</td>
                      <td className="py-2 pr-3 text-[#293027]/70 dark:text-white/70">{a.email}</td>
                      <td className="py-2 pr-3">
                        {a.uid
                          ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-300">Oui</span>
                          : <span className="rounded-full bg-[#293027]/10 px-2 py-0.5 text-[11px] text-[#293027]/60 dark:bg-white/10 dark:text-white/60">Pas encore</span>}
                      </td>
                      <td className="py-2 text-[#293027]/60 dark:text-white/60">
                        {a.contacteeLe ? a.contacteeLe.toDate().toLocaleDateString('fr-CA') : 'jamais'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-[#293027]/60 dark:text-white/60">Ton mot personnalisé</h3>
            <p className={`mb-4 max-w-2xl ${bloc}`}>
              Écrivez une seule fois, et le prénom de chacune se pose à la place de {'{prenom}'}. Le mot arrive dans
              son espace client, comme un message de vous, et elle pourra vous répondre.
            </p>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={8} />
            {cibles.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[#293027]/10 bg-[#293027]/5 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="mb-2 text-[11px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">
                  Ce que {cibles[0].prenom || cibles[0].email} lira
                </p>
                <p className="whitespace-pre-wrap text-sm text-[#293027] dark:text-white">{personnaliser(message, cibles[0])}</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PrimaryButton onClick={envoyer} disabled={!cibles.length || !message.trim() || envoi}>
                {envoi ? 'Envoi en cours…' : `Déposer le mot à ${cibles.length} personne${cibles.length > 1 ? 's' : ''}`}
              </PrimaryButton>
              {!cibles.length && <span className={bloc}>Cochez d'abord les personnes à qui vous écrivez.</span>}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default AcheteusesSection;
