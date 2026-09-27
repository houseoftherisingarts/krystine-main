import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { OPTIONS_CHOIX, QUESTIONS_CHOIX, type GroupeChoix } from '../lib/choixLettre';

// /mes-choix (Krystine, 27 sept. 2026) : la lectrice arrive d'un carré de la
// lettre, déjà coché; elle coche ses autres motifs et sa façon d'avancer, puis
// envoie. Chaque case devient une étiquette sur sa fiche (enregistrerChoix).
const MesChoix: React.FC = () => {
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const s = params.get('s') || '';
  const lienValide = /^[A-Za-z0-9_-]{10,64}$/.test(s);
  const [coches, setCoches] = useState<Set<string>>(() => new Set(params.getAll('coche')));
  const [etat, setEtat] = useState<'choix' | 'envoi' | 'merci' | 'erreur'>('choix');

  const basculer = (id: string) => setCoches(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const envoyer = async () => {
    if (!coches.size || !lienValide || !app) { setEtat('erreur'); return; }
    setEtat('envoi');
    try {
      await httpsCallable(getFunctions(app, 'us-central1'), 'enregistrerChoix')({ s, choix: [...coches] });
      setEtat('merci');
    } catch {
      setEtat('erreur');
    }
  };

  const groupe = (g: GroupeChoix) => (
    <fieldset className="mt-12 first:mt-0">
      <legend className="v2-serif font-light text-[#1c1712] text-[clamp(1.6rem,3vw,2.2rem)] leading-tight mb-6">{QUESTIONS_CHOIX[g]}</legend>
      <div className="grid sm:grid-cols-2 gap-4">
        {OPTIONS_CHOIX.filter(o => o.groupe === g).map(o => {
          const id = `${o.groupe}:${o.cle}`;
          const actif = coches.has(id);
          return (
            <label key={id} className={`block cursor-pointer border p-5 transition-colors ${actif ? 'border-[#9c7a44] bg-[#efe6d7]' : 'border-[#1c1712]/15 bg-[#faf6ee] hover:border-[#9c7a44]/60'}`}>
              <input type="checkbox" className="sr-only" checked={actif} onChange={() => basculer(id)} />
              <span className="flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.2em] text-[#7d6330]">
                <span className={`grid place-items-center w-5 h-5 border-[1.5px] ${actif ? 'border-[#7d6330] bg-[#7d6330] text-[#faf6ee]' : 'border-[#7d6330]'}`} aria-hidden>
                  {actif && <i className="fa-solid fa-check text-[0.6rem]" />}
                </span>
                {o.libelle}
              </span>
              <span className="block mt-3 v2-serif text-[1.15rem] leading-snug text-[#1c1712]">{o.phrase}</span>
              <span className="block mt-2 text-[0.92rem] font-light leading-[1.7] text-[#3a2f23]">{o.texte}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div className="min-h-screen w-full bg-[#f4efe6] text-[#1c1712] px-[clamp(1.25rem,5vw,5rem)] pt-[clamp(7rem,13vh,9rem)] pb-24" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..600&family=Inter:wght@300;400;500&display=swap'); .v2-serif{font-family:"Fraunces",Georgia,serif}`}</style>
      <div className="max-w-[900px] mx-auto">
        {etat === 'merci' ? (
          <div className="text-center py-20">
            <span className="inline-grid place-items-center w-16 h-16 rounded-full border border-[#9c7a44]/45 text-[#7d6330] mb-7"><i className="fa-solid fa-check text-xl" /></span>
            <h1 className="v2-serif font-light text-[clamp(2rem,4vw,2.8rem)]">Merci.</h1>
            <p className="mt-4 v2-serif text-[1.2rem] text-[#3a2f23]">Vos choix sont bien notés.</p>
            <a href="/podcast" className="inline-block mt-10 text-[0.72rem] uppercase tracking-[0.2em] border-b border-[#1c1712] pb-1.5 hover:text-[#7d6330] hover:border-[#9c7a44]">Écouter le podcast</a>
          </div>
        ) : (
          <>
            {groupe('interet')}
            {groupe('preference')}
            <p className="mt-12 v2-serif text-[1.15rem] text-[#3a2f23] text-center">Et si plusieurs réponses vous ressemblent, choisissez-les.<br />Nous sommes rarement une seule chose.</p>
            <div className="mt-8 text-center">
              <button type="button" onClick={envoyer} disabled={!coches.size || etat === 'envoi'}
                className="inline-flex items-center gap-3 bg-[#1c1712] px-10 py-4 text-[0.72rem] uppercase tracking-[0.22em] text-[#f4efe6] hover:bg-[#9c7a44] disabled:opacity-40 disabled:cursor-not-allowed min-h-[48px]">
                {etat === 'envoi' ? 'Envoi…' : 'Envoyer mes choix'}
              </button>
              {etat === 'erreur' && (
                <p className="mt-4 text-sm text-[#8B4A2F]">
                  {lienValide ? 'L’envoi n’a pas fonctionné. Veuillez réessayer dans un instant.' : 'Ce lien vient d’un aperçu de la lettre : les choix ne sont pas enregistrés.'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MesChoix;
