import React from 'react';

/**
 * Le téléphone couché.
 *
 * Reprise du mock-up iPhone fourni par Alex, réduite à ce dont la page a
 * besoin : un seul appareil, en paysage, îlot dynamique compris, avec la
 * phrase posée à l'intérieur sur une seule ligne. Aucun état, aucune option
 * inutile, le cadre est un décor et rien d'autre.
 */
const TelephoneHorizontal: React.FC<{
  children: React.ReactNode;
  /** teinte du châssis */
  chassis?: string;
  className?: string;
}> = ({ children, chassis = '#1c1e22', className = '' }) => {
  const bezel = 12;
  const radius = 56;

  return (
    <div className={`w-full ${className}`}>
      {/* le châssis garde le rapport 852 x 393 de l'appareil, couché */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: `${852 + bezel * 2} / ${393 + bezel * 2}`,
          borderRadius: radius + bezel,
          padding: bezel,
          background: `linear-gradient(135deg, ${chassis}f2 0%, ${chassis} 42%, #0c0e11 100%)`,
          boxShadow:
            '0 34px 80px rgba(6,10,8,0.55), 0 4px 12px rgba(6,10,8,0.4), inset 0 0 0 1px rgba(244,236,224,0.08)',
        }}
      >
        <div
          className="relative h-full w-full overflow-hidden"
          style={{
            borderRadius: radius,
            background: 'radial-gradient(120% 140% at 50% 0%, #16211c 0%, #0b100e 62%, #070a09 100%)',
            boxShadow:
              'inset 0 0 0 1px rgba(244,236,224,0.05), inset 0 12px 28px rgba(0,0,0,0.5), inset 0 -10px 22px rgba(0,0,0,0.4)',
          }}
        >
          {/* l'îlot dynamique, sur le bord court gauche puisque l'appareil est couché */}
          <span
            aria-hidden
            className="absolute z-20 bg-black"
            style={{
              left: 14,
              top: '50%',
              width: 37,
              height: 126,
              borderRadius: 20,
              transform: 'translateY(-50%)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.7)',
            }}
          />

          {/* le reflet de verre, très discret */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                'linear-gradient(118deg, rgba(244,236,224,0.09) 0%, transparent 26%, transparent 74%, rgba(244,236,224,0.05) 100%)',
            }}
          />

          <div className="relative z-[15] flex h-full w-full items-center justify-center px-[9%]">
            {children}
          </div>

          {/* la barre d'accueil, côté droit */}
          <span
            aria-hidden
            className="absolute z-20"
            style={{
              right: 9,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 5,
              height: '34%',
              maxHeight: 140,
              borderRadius: 3,
              background: 'linear-gradient(90deg, rgba(244,236,224,0.62), rgba(244,236,224,0.3))',
              opacity: 0.85,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TelephoneHorizontal;
