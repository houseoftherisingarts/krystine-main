import React from 'react';

/**
 * Le bandeau épais « Vue et entendue à », partagé par /medias et /conferenciere
 * (sorti de MediasV2 le 9 octobre 2026). Noms en gras, encre foncée, défilement
 * lent. Chaque logo reçoit sa largeur et sa hauteur exactes (LOGO_DIMS) : sans
 * elles, Safari empile les logos.
 */

export const LOGO_DIMS: Record<string, [number, number]> = {'/medias/logos/98-5.png': [213, 160], '/medias/logos/bien.png': [87, 160], '/medias/logos/coup-de-pouce.png': [302, 160], '/medias/logos/editions-de-l-homme.png': [635, 160], '/medias/logos/matv.png': [475, 160], '/medias/logos/tva.png': [502, 160], '/medias/logos/videotron.png': [816, 160]};

// Les médias de /conferenciere, précédés de l'éditeur (kit de presse, carte « livres »). Aucun chiffre ajouté.
export const PREUVES: { nom: string; logo?: string; note?: string; grand?: boolean }[] = [
  { nom: 'Éditions de l’Homme', logo: '/medias/logos/editions-de-l-homme.png', note: 'Best-sellers', grand: true },
  { nom: 'Santé la vie', note: 'Série télé · 3 saisons' },
  { nom: 'MAtv', logo: '/medias/logos/matv.png' },
  { nom: 'Vidéotron', logo: '/medias/logos/videotron.png' },
  { nom: 'TVA', logo: '/medias/logos/tva.png', note: 'Salut Bonjour' },
  { nom: 'Bien', logo: '/medias/logos/bien.png', grand: true, note: 'Émission' },
  { nom: '98,5 FM', logo: '/medias/logos/98-5.png', note: 'FM' },
  { nom: 'Coup de Pouce', logo: '/medias/logos/coup-de-pouce.png' },
  { nom: 'Mieux-Être', note: 'Magazine' },
];

export const BandePreuve: React.FC<{ lang: string }> = ({ lang }) => {
  // Bandeau épais qui traverse l'écran (Krystine, 9 oct. 2026) : noms en gras, encre foncée, défilement lent.
  const rangee = (cache: boolean) => (
    <ul aria-hidden={cache || undefined} className="flex shrink-0 items-center gap-x-[clamp(2.5rem,5vw,4.5rem)] pr-[clamp(2.5rem,5vw,4.5rem)]">
      {PREUVES.map(({ nom, logo, note, grand }) => (
        <li key={nom} className="flex shrink-0 items-center gap-3">
          {logo
            ? <img src={logo} alt={nom} width={Math.round((grand ? 56 : 32) * (LOGO_DIMS[logo]?.[0] ?? 4) / (LOGO_DIMS[logo]?.[1] ?? 1))} height={grand ? 56 : 32} style={{ width: Math.round((grand ? 56 : 32) * (LOGO_DIMS[logo]?.[0] ?? 4) / (LOGO_DIMS[logo]?.[1] ?? 1)), height: grand ? 56 : 32, maxWidth: 'none', flex: '0 0 auto' }} />
            : <span className="v2-serif text-[clamp(1.25rem,2.1vw,1.75rem)] font-medium leading-none text-[#1c1712]">{nom}</span>}
          {note && <span className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#4a3d2e]">{note}</span>}
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label={lang === 'FR' ? 'Vue et entendue à' : 'As seen on'} className="relative w-full overflow-hidden bg-[#efe6d7] border-y-2 border-[#9c7a44]/40 py-[clamp(2.25rem,5vh,3.5rem)]">
      <style>{`@keyframes ksl-defile{from{transform:translateX(0)}to{transform:translateX(-50%)}}.ksl-defile{animation:ksl-defile 48s linear infinite}.ksl-defile:hover{animation-play-state:paused}@media (prefers-reduced-motion:reduce){.ksl-defile{animation:none;flex-wrap:wrap}}`}</style>
      <p className="px-[clamp(1.5rem,5vw,5.5rem)] mb-6 text-[0.85rem] font-semibold uppercase tracking-[0.26em] text-[#1c1712]">{lang === 'FR' ? 'Vue et entendue à' : 'As seen on'}</p>
      <div className="ksl-defile flex w-max">{rangee(false)}{rangee(true)}</div>
    </section>
  );
};

export default BandePreuve;
