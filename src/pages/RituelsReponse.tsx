import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';

// /rituels-reponse (Krystine, 15 oct. 2026) : le miroir des Rituels. La
// lectrice arrive d'une des trois réponses du courriel du jour 7 de la suite
// des Rituels essentiels; la réponse se note sur sa fiche (enregistrerRituels)
// et la page lui dit un mot propre à sa réponse. Aucune pression.
type Cle = 'quotidien' | 'commence' | 'pas-encore';
const MOTS: Record<Cle, { titre: string; texte: string; bouton: string; lien: string }> = {
  quotidien: {
    titre: 'Le corps les a reconnus.',
    texte: 'Une semaine de gestes presque chaque jour : c’est ainsi qu’une habitude prend racine. Pour votre deuxième semaine, le guide Vata vous accompagne, avec un carnet de sept jours pour voir ce qui change.',
    bouton: 'Télécharger le PDF Vata',
    lien: '/le-vent?via=miroir-rituels',
  },
  commence: {
    titre: 'Un geste à la fois suffit.',
    texte: 'Vous avez commencé, et c’est ce qui compte. Choisissez le geste qui vous a fait le plus de bien et refaites-le demain matin, avant que la journée ne vous prenne.',
    bouton: 'Retrouver mes capsules',
    lien: '/cours/rituels-vivants',
  },
  'pas-encore': {
    titre: 'Commençons par le plus simple.',
    texte: 'Cinq minutes ce soir suffisent. L’automassage, avant le coucher, est un bon premier geste.',
    bouton: 'Ouvrir mes capsules',
    lien: '/cours/rituels-vivants',
  },
};

const RituelsReponse: React.FC = () => {
  const loc = useLocation();
  const params = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const s = params.get('s') || '';
  const r = (params.get('r') || '') as Cle;
  const mot = MOTS[r];
  const lance = useRef(false);
  const [note, setNote] = useState<'envoi' | 'ok' | 'erreur'>('envoi');

  useEffect(() => {
    if (lance.current || !mot) return;
    lance.current = true;
    if (!/^[A-Za-z0-9_-]{10,64}$/.test(s) || !app) { setNote('erreur'); return; }
    httpsCallable(getFunctions(app, 'us-central1'), 'enregistrerRituels')({ s, r })
      .then(() => setNote('ok'))
      .catch(() => setNote('erreur'));
  }, [mot, s, r]);

  return (
    <div className="min-h-screen w-full bg-[#f4efe6] text-[#1c1712] px-[clamp(1.25rem,5vw,5rem)] pt-[clamp(7rem,13vh,9rem)] pb-24" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..600&family=Inter:wght@300;400;500&display=swap'); .v2-serif{font-family:"Fraunces",Georgia,serif}`}</style>
      <div className="max-w-[640px] mx-auto text-center py-12">
        <p className="text-[0.62rem] uppercase tracking-[0.3em] text-[#7d6330]">Vos Rituels essentiels</p>
        {mot ? (
          <>
            <h1 className="mt-5 v2-serif font-light text-[clamp(2rem,4.4vw,3rem)] leading-[1.1]">{mot.titre}</h1>
            <p className="mt-6 text-[1rem] font-light leading-[1.85] text-[#3a2f23]">{mot.texte}</p>
            <a href={mot.lien} className="inline-flex items-center justify-center mt-10 bg-[#1c1712] px-10 py-4 text-[0.72rem] uppercase tracking-[0.22em] text-[#f4efe6] hover:bg-[#9c7a44] transition-colors min-h-[48px]">{mot.bouton}</a>
            <p className="mt-10 v2-serif text-[1.05rem] text-[#3a2f23]/80">Merci de votre réponse. Il n’y a pas de bonne ou de mauvaise réponse : juste un petit miroir pour mieux vous accompagner.</p>
            {note === 'erreur' && <p className="mt-4 text-[0.8rem] text-[#3a2f23]/60">Votre réponse n’a pas pu être notée, mais le reste de la page est à vous.</p>}
          </>
        ) : (
          <h1 className="mt-5 v2-serif font-light text-[clamp(2rem,4.4vw,3rem)] leading-[1.1]">Vos capsules vous attendent.</h1>
        )}
        <p className="mt-12 text-[0.85rem] text-[#3a2f23]/70">Notre équipe est là pour vous : <a href="mailto:teamksl@inspiratanature.com" className="underline decoration-[#9c7a44] underline-offset-2">teamksl@inspiratanature.com</a></p>
      </div>
    </div>
  );
};

export default RituelsReponse;
