import React, { useEffect, useState } from 'react';
import EffetsSkin from '../components/client/skins/EffetsSkin';
import MotifsSkin from '../components/client/skins/MotifsSkin';
import { SKINS } from '../lib/pointsConfig';
import '../components/client/skins.css';

// /demo-skins?skin=vata : une maquette fidèle de l'espace client (bannière,
// onglets, cartes, boutons, chiffres) habillée du skin demandé, pour que les
// agents et Alex jugent les effets sans compte. Pas de lien depuis le site.
const DemoSkins: React.FC = () => {
  const [skin, setSkin] = useState(() => new URLSearchParams(window.location.search).get('skin') || 'vata');
  useEffect(() => { const u = new URL(window.location.href); u.searchParams.set('skin', skin); window.history.replaceState(null, '', u.toString()); }, [skin]);
  const bouton = 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest';
  return (
    <div className={`relative isolate min-h-screen overflow-hidden bg-[#EEE7DB] pb-24 pt-6 dark:bg-[#151d19] skin-${skin}`}>
      <EffetsSkin skin={skin} />
      <MotifsSkin skin={skin} />
      <div className="relative z-[1] mx-auto max-w-5xl px-6">
        <div className="mb-6 flex flex-wrap gap-2">
          {SKINS.map(s => <button key={s.cle} type="button" onClick={() => setSkin(s.cle)} className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${skin === s.cle ? 'border-[#BA7B39] bg-[#BA7B39]/20 text-[#8B4A2F]' : 'border-[#293027]/15 text-[#293027]/60'}`}>{s.cle}</button>)}
        </div>
        <div className="relative h-56 w-full overflow-hidden rounded-[24px]">
          <img src="/compte/bienvenue-bureau.webp" alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151d19]/75 via-[#151d19]/20 to-transparent" />
          <p className="absolute bottom-5 left-6 font-serif text-3xl text-white">Bienvenue dans votre espace</p>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8B4A2F]">Vos niskas</p>
            <p className="mt-2 font-serif text-7xl text-[#293027] dark:text-white">1 212</p>
            <p className="mt-2 max-w-md text-sm text-[#293027]/70 dark:text-white/70">Le niska est la monnaie de votre espace : il se gagne en participant et se dépense à la petite boutique.</p>
            <p className="mt-1 text-[11px] uppercase tracking-widest text-[#293027]/50 dark:text-white/50">Gagnés en tout · 1 610 · c’est ce total qui fait pousser votre plante</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={`${bouton} bg-[#BA7B39] text-[#293027] hover:bg-[#d9a05b]`}>Acheter des niskas · 100</button>
              <button type="button" className={`${bouton} bg-[#293027] text-[#EEE7DB] hover:bg-[#3a453a] dark:bg-[#BA7B39] dark:text-[#293027]`}>Ouvrir le coffre · 60</button>
              <button type="button" className={`${bouton} border border-[#38403a]/15 text-[#38403a]/70 hover:border-[#BA7B39] hover:text-[#8B4A2F] dark:border-white/15 dark:text-white/70`}>Télécharger</button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[1, 2].map(i => (
                <div key={i} className="rounded-[18px] border border-[#293027]/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F]">500 niskas · unique</p>
                  <p className="mt-1 font-serif text-lg text-[#293027] dark:text-white">10 % sur la boutique</p>
                  <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">Un rabais de 10 % applicable sur votre prochaine commande en boutique.</p>
                  <input className="mt-3 w-full rounded-full border border-[#38403a]/10 bg-white px-4 py-2 text-sm text-[#293027] outline-none" placeholder="Écrire ici…" />
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-[24px] border border-white/60 bg-white/55 p-5 backdrop-blur-md dark:border-white/10 dark:bg-[#293027]/55">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">Invitez vos proches</p>
            <p className="mt-2 text-xs text-[#38403a]/70 dark:text-white/70">Chaque personne qui crée son compte par votre lien devient votre filleule.</p>
            <p className="mt-3 font-serif text-2xl tracking-[0.2em] text-[#293027] dark:text-white">1B2KZO</p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default DemoSkins;
