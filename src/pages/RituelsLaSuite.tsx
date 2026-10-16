import React from 'react';
import MiroirVecu from '../components/cours/MiroirVecu';

// La suite des Rituels essentiels (Krystine, 15 oct. 2026) : une étape à part,
// à la place de la capsule bonus. D'abord le miroir de ce qu'elle a vécu, puis
// la suite qui lui ressemble. Jamais dans la même page qu'une capsule.
const RituelsLaSuite: React.FC = () => (
  <div className="min-h-screen w-full bg-[#f4efe6] text-[#1c1712] px-[clamp(1.25rem,5vw,5rem)] pt-[clamp(7rem,13vh,9rem)] pb-24" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..600&family=Inter:wght@300;400;500&display=swap'); .v2-serif{font-family:"Fraunces",Georgia,serif}`}</style>
    <div className="max-w-[980px] mx-auto">
      <a href="/cours/rituels-vivants" className="inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em] text-[#7d6330] hover:text-[#1c1712]"><i className="fa-solid fa-arrow-left" /> Retour à mes capsules</a>
      <p className="mt-10 text-[0.62rem] uppercase tracking-[0.3em] text-[#7d6330]">Vos Rituels essentiels · Bonus</p>
      <h1 className="mt-4 v2-serif font-light text-[clamp(2rem,4.4vw,3.2rem)] leading-[1.08]">Et après les Rituels ?</h1>
      <p className="mt-5 max-w-[60ch] text-[1rem] font-light leading-[1.85] text-[#3a2f23]">Quelques jours de gestes laissent déjà une trace. Prenez un instant pour sentir où vous en êtes : la suite part de là.</p>
      <MiroirVecu lien="/vata?via=cours-rituels" image="/vata/carte-eventail.jpg" details={['16 capsules audio', '7 semaines', '19 rituels', 'Un guide de 204 pages']} />
    </div>
  </div>
);

export default RituelsLaSuite;
