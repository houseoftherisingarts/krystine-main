// L'API IFrame de YouTube, chargée une seule fois pour tout le site : elle
// donne la position et la durée de lecture, sans lesquelles ni le fil d'une
// rediffusion ni le crédit « vidéo regardée à 80 % » ne peuvent exister.
declare global { interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void } }

let apiYouTube: Promise<any> | null = null;
export function chargerApiYouTube(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!apiYouTube) {
    apiYouTube = new Promise(resolve => {
      const avant = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { avant?.(); resolve(window.YT); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return apiYouTube;
}

/** Vrai dès que la lecture a dépassé la part demandée de la durée. */
export const partEcoutee = (position: number, duree: number, part: number): boolean =>
  duree > 0 && position / duree >= part;
