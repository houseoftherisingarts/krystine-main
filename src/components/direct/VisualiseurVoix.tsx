import React, { useEffect, useRef } from 'react';

// ─── La scène du mode audio ──────────────────────────────────────────────────
// Quand Krystine parle sans caméra, l'écran ne reste pas noir : un anneau de
// braises respire au rythme de sa voix. Le son d'un direct YouTube n'est pas
// lisible par la page (le lecteur est cloisonné), alors deux sources sont
// prévues. Si l'admin pose un flux audio à nous (`fluxAudio`), l'analyseur lit
// la vraie voix. Sinon l'anneau respire lentement et s'illumine à chaque
// message et à chaque cœur reçus, ce qui garde la scène vivante et honnête.

const VisualiseurVoix: React.FC<{
  fluxAudio?: string;
  impulsion?: number;   // change à chaque geste du public
  actif?: boolean;
}> = ({ fluxAudio, impulsion = 0, actif = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyseur = useRef<AnalyserNode | null>(null);
  const eclat = useRef(0);

  useEffect(() => { eclat.current = 1; }, [impulsion]);

  // Analyse de la vraie voix, seulement si un flux nous appartient.
  useEffect(() => {
    if (!fluxAudio || !audioRef.current) return;
    let ctx: AudioContext | null = null;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaElementSource(audioRef.current);
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      an.connect(ctx.destination);
      analyseur.current = an;
    } catch { analyseur.current = null; }
    return () => { analyseur.current = null; ctx?.close().catch(() => {}); };
  }, [fluxAudio]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx2d = cv.getContext('2d');
    if (!ctx2d) return;
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let t = 0;
    const donnees = new Uint8Array(256);

    const dessiner = () => {
      const { width: w, height: h } = cv;
      const cx = w / 2, cy = h / 2;
      t += reduit ? 0.004 : 0.012;
      eclat.current *= 0.94;

      // Niveau de la voix, ou respiration lente quand aucun flux n'est branché.
      let niveau = 0.18 + Math.sin(t) * 0.05;
      const an = analyseur.current;
      if (an) {
        an.getByteFrequencyData(donnees);
        let somme = 0;
        for (let i = 0; i < 64; i++) somme += donnees[i];
        niveau = 0.12 + (somme / 64 / 255) * 0.9;
      }
      niveau += eclat.current * 0.35;

      ctx2d.clearRect(0, 0, w, h);
      const rayon = Math.min(w, h) * 0.19;

      // Le foyer : un halo chaud qui grossit avec la voix.
      const halo = ctx2d.createRadialGradient(cx, cy, rayon * 0.2, cx, cy, rayon * (2.6 + niveau));
      halo.addColorStop(0, `rgba(232,168,92,${0.30 + niveau * 0.35})`);
      halo.addColorStop(0.45, 'rgba(186,123,57,0.10)');
      halo.addColorStop(1, 'rgba(15,22,19,0)');
      ctx2d.fillStyle = halo;
      ctx2d.fillRect(0, 0, w, h);

      // Trois anneaux de braise, décalés, qui ondulent.
      for (let k = 0; k < 3; k++) {
        const base = rayon * (1 + k * 0.34);
        ctx2d.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 90) {
          const onde = Math.sin(a * (3 + k) + t * (1.4 + k * 0.5)) * rayon * 0.06 * (0.5 + niveau);
          const r = base + onde + niveau * rayon * (0.30 - k * 0.06);
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          a === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
        }
        ctx2d.closePath();
        ctx2d.strokeStyle = ['rgba(242,217,168,', 'rgba(232,168,92,', 'rgba(139,74,47,'][k] + (0.55 - k * 0.14 + eclat.current * 0.3) + ')';
        ctx2d.lineWidth = 3 - k;
        ctx2d.stroke();
      }

      // Le cœur du feu.
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, rayon * (0.42 + niveau * 0.22), 0, Math.PI * 2);
      ctx2d.fillStyle = `rgba(247,241,230,${0.75 + eclat.current * 0.25})`;
      ctx2d.fill();

      raf = requestAnimationFrame(dessiner);
    };

    const ajuster = () => {
      const p = cv.parentElement;
      if (!p) return;
      const d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = p.clientWidth * d;
      cv.height = p.clientHeight * d;
    };
    ajuster();
    window.addEventListener('resize', ajuster);
    if (actif) raf = requestAnimationFrame(dessiner);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', ajuster); };
  }, [actif]);

  return (
    <>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      {fluxAudio && <audio ref={audioRef} src={fluxAudio} crossOrigin="anonymous" autoPlay className="hidden" />}
    </>
  );
};

export default VisualiseurVoix;
