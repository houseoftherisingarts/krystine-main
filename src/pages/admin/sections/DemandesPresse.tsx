import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query, type Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { db } from '../../../firebase';
import { Card, GhostButton, PrimaryButton } from '../primitives';

/**
 * Les demandes de kit de presse (8 oct. 2026), en tête de l'onglet Demandes.
 * Accepter envoie à la personne son lien personnel, valable 7 jours
 * (deciderDemandePresse, functions/src/presse.ts) : c'est le geste de
 * Krystine, rien ne part avant ce clic. Refuser n'envoie rien.
 */

interface DemandePresse {
  id: string;
  nom: string;
  media: string;
  email: string;
  usage: string;
  datePublication?: string;
  lang?: 'FR' | 'EN';
  statut: 'attente' | 'acceptee' | 'refusee';
  cree?: Timestamp;
  jetonExpire?: Timestamp;
  ouvertures?: number;
}

const STATUTS: Record<DemandePresse['statut'], { label: string; color: string }> = {
  attente:  { label: 'En attente', color: 'bg-[#BA7B39]/10 text-[#8B4A2F]' },
  acceptee: { label: 'Acceptée',   color: 'bg-green-50 text-green-600' },
  refusee:  { label: 'Refusée',    color: 'bg-red-50 text-red-500' },
};

const quand = (t?: Timestamp) =>
  t?.toDate ? t.toDate().toLocaleString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const DemandesPresse: React.FC = () => {
  const [items, setItems] = useState<DemandePresse[] | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, 'demandesPresse'), orderBy('cree', 'desc')),
      snap => setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<DemandePresse, 'id'>) }))),
      err => { console.error('[demandesPresse]', err); setItems([]); },
    );
  }, []);

  const decider = async (d: DemandePresse, decision: 'accepter' | 'refuser') => {
    const question = decision === 'accepter'
      ? `Accepter la demande de ${d.nom} ? Le lien personnel part tout de suite à ${d.email}, valable 7 jours.`
      : `Refuser la demande de ${d.nom} ? Aucun courriel ne part.`;
    if (!confirm(question)) return;
    setErreur(null);
    setEnCours(d.id);
    try {
      await httpsCallable(getFunctions(app!, 'us-central1'), 'deciderDemandePresse')({ id: d.id, decision });
    } catch (err) {
      setErreur((err as { message?: string })?.message || 'La décision n’a pas pu être enregistrée.');
    } finally {
      setEnCours(null);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-1 font-serif text-xl text-[#293027] dark:text-white">Demandes de kit de presse</h2>
      <p className="mb-4 text-xs text-[#293027]/55 dark:text-white/55">
        Accepter envoie à la personne un lien personnel vers les téléchargements, valable 7 jours. Refuser n'envoie rien.
      </p>
      {erreur && <p className="mb-3 text-sm text-red-600" role="alert">{erreur}</p>}
      <div className="space-y-3">
        {items.map(d => {
          const s = STATUTS[d.statut] || STATUTS.attente;
          const expire = d.jetonExpire?.toMillis ? d.jetonExpire.toMillis() : 0;
          return (
            <Card key={d.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-serif text-[#293027] dark:text-white">{d.nom}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${s.color}`}>{s.label}</span>
                    {d.lang === 'EN' && <span className="rounded-full bg-[#293027]/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#293027]/70 dark:bg-white/10 dark:text-white/70">Anglais</span>}
                  </div>
                  <p className="mt-1 text-xs text-[#293027]/55 dark:text-white/55">
                    {quand(d.cree) && <span className="mr-2">{quand(d.cree)}</span>}
                    {d.media} · {d.email}
                    {d.datePublication ? ` · publication prévue le ${d.datePublication}` : ''}
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#293027]/85 dark:text-white/85">{d.usage}</p>
                  {d.statut === 'acceptee' && expire > 0 && (
                    <p className="mt-3 text-xs text-[#293027]/55 dark:text-white/55">
                      Lien {expire < Date.now() ? 'expiré' : 'valable'} jusqu'au {new Date(expire).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}
                      {d.ouvertures ? ` · ouvert ${d.ouvertures} fois` : ' · pas encore ouvert'}
                    </p>
                  )}
                </div>
                {d.statut === 'attente' && (
                  <div className="flex shrink-0 gap-2 sm:flex-col">
                    <PrimaryButton disabled={enCours === d.id} onClick={() => decider(d, 'accepter')}>
                      <i className="fa-solid fa-check" /> {enCours === d.id ? 'Envoi…' : 'Accepter'}
                    </PrimaryButton>
                    <GhostButton disabled={enCours === d.id} onClick={() => decider(d, 'refuser')}>
                      <i className="fa-solid fa-xmark" /> Refuser
                    </GhostButton>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
};

export default DemandesPresse;
