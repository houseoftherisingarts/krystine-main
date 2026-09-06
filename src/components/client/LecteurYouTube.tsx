import React, { useEffect, useRef, useState } from 'react';
import { chargerApiYouTube, partEcoutee } from '../../lib/youtube';
import { PART_ECOUTEE } from '../../lib/pointsConfig';

// Un lecteur YouTube qui sait quand la vidéo a été regardée pour vrai :
// `onEcoutee` se déclenche une seule fois, quand la lecture dépasse 80 % de
// la durée (Alex, 6 septembre 2026 : les niskas se donnent à la fin, pas au
// clic). Si l'API ne répond pas, l'iframe simple prend le relais, sans crédit.
const LecteurYouTube: React.FC<{ videoId: string; titre?: string; onEcoutee?: (videoId: string) => void }> = ({ videoId, titre, onEcoutee }) => {
  const scene = useRef<HTMLDivElement>(null);
  const [repli, setRepli] = useState(false);
  const donne = useRef(false);

  useEffect(() => {
    donne.current = false;
    let vivant = true;
    let horloge: number | undefined;
    let lecteur: any = null;
    const delai = window.setTimeout(() => { if (vivant && !lecteur) setRepli(true); }, 6000);
    chargerApiYouTube().then(YT => {
      if (!vivant || !scene.current) return;
      const cible = document.createElement('div');
      scene.current.appendChild(cible);
      lecteur = new YT.Player(cible, {
        videoId, width: '100%', height: '100%',
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: 1, origin: window.location.origin },
        events: {
          onReady: () => { if (vivant) window.clearTimeout(delai); },
          onStateChange: (e: any) => {
            window.clearInterval(horloge);
            const verifier = () => {
              if (donne.current) return;
              if (partEcoutee(lecteur?.getCurrentTime?.() || 0, lecteur?.getDuration?.() || 0, PART_ECOUTEE)) {
                donne.current = true; window.clearInterval(horloge); onEcoutee?.(videoId);
              }
            };
            if (e.data === YT.PlayerState.PLAYING) horloge = window.setInterval(verifier, 1000);
            if (e.data === YT.PlayerState.ENDED) { if (!donne.current) { donne.current = true; onEcoutee?.(videoId); } }
          },
        },
      });
    }).catch(() => { if (vivant) setRepli(true); });
    return () => {
      vivant = false; window.clearTimeout(delai); window.clearInterval(horloge);
      try { lecteur?.destroy?.(); } catch { /* noop */ }
      if (scene.current) scene.current.innerHTML = '';
    };
  }, [videoId]);

  if (repli) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
        title={titre || 'YouTube'}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return <div ref={scene} className="h-full w-full [&>div]:h-full [&>div]:w-full [&_iframe]:h-full [&_iframe]:w-full" />;
};

export default LecteurYouTube;
