import React, { useEffect, useRef } from 'react';

// Oily liquid surface using threejs-components' liquid1 module.
// Tuned for viscous ayurvedic-oil feel: high metalness, very low roughness,
// small displacement, slow motion.

// 256×256 canvas texture: radial gold → deep navy. Written at runtime so we
// don't depend on an external image asset.
function makeOilTexture(): string {
  if (typeof document === 'undefined') return '';
  const size = 512;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.75);
  g.addColorStop(0.00, '#F4E7DD');    // light gold glint
  g.addColorStop(0.18, '#B8532F');    // warm gold
  g.addColorStop(0.42, '#6B402F');    // amber
  g.addColorStop(0.72, '#5C4117');    // burnt amber
  g.addColorStop(1.00, '#3A251E');    // royal navy
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // Add subtle warm sheen streaks (gives the oil specular highlights something to pick up)
  for (let i = 0; i < 6; i++) {
    const streak = ctx.createLinearGradient(
      Math.random() * size, 0, Math.random() * size, size
    );
    streak.addColorStop(0.0, 'rgba(232,208,190, 0)');
    streak.addColorStop(0.5, 'rgba(232,208,190, 0.08)');
    streak.addColorStop(1.0, 'rgba(232,208,190, 0)');
    ctx.fillStyle = streak;
    ctx.fillRect(0, 0, size, size);
  }
  return cv.toDataURL('image/png');
}

const LiquidOilBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // @ts-expect-error — the package ships a minified JS without types.
        const mod = await import('threejs-components/build/backgrounds/liquid1.min.js');
        if (cancelled || !canvasRef.current) return;
        const LiquidBackground = mod.default || mod;
        const app = LiquidBackground(canvasRef.current);
        appRef.current = app;

        app.loadImage(makeOilTexture());

        // Heavy ayurvedic oil tuning — thick, slow, warm:
        //   metalness 0.65  → less mirror, more warm sheen (oil ≠ chrome)
        //   roughness 0.55  → diffuses highlights widely; surface reads viscous
        //   displacement 0.35 → very small undulations — pooled oil, not waves
        if (app.liquidPlane?.material) {
          app.liquidPlane.material.metalness = 0.65;
          app.liquidPlane.material.roughness = 0.55;
        }
        if (app.liquidPlane?.uniforms?.displacementScale) {
          app.liquidPlane.uniforms.displacementScale.value = 0.35;
        }

        // Slow the animation. Library doesn't publish a speed setter, so we try
        // the common uniform names and fall back to monkey-patching Date.now if
        // none match (no-op if no uniform found).
        const u = app.liquidPlane?.uniforms || {};
        const TARGET = 0.25; // 25% of default speed
        if (u.speed?.value !== undefined)           u.speed.value *= TARGET;
        if (u.uSpeed?.value !== undefined)          u.uSpeed.value *= TARGET;
        if (u.timeScale?.value !== undefined)       u.timeScale.value *= TARGET;
        if (u.uTimeScale?.value !== undefined)      u.uTimeScale.value *= TARGET;
        if (app.setSpeed) app.setSpeed(TARGET);
        // No rain droplets — static oil at rest, only responds to cursor.
        app.setRain?.(false);
      } catch (e) {
        console.warn('[LiquidOilBackground] failed to init, falling back to CSS', e);
      }
    })();

    return () => {
      cancelled = true;
      try { appRef.current?.dispose?.(); } catch { /* noop */ }
      appRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full touch-none pointer-events-auto"
      style={{ background: '#2E1A14' }}
      aria-hidden
    />
  );
};

export default LiquidOilBackground;
