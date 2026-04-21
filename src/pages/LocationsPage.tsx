import React from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT } from '../content';

const LocationsPage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].locations;

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A] pt-36 pb-24">
      <div className="max-w-6xl mx-auto px-6 md:px-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-serif text-[#0B1A36] dark:text-white mb-6">{t.title}</h1>
          <p className="text-[#0B1A36]/80 dark:text-white/80 text-lg leading-relaxed max-w-2xl mx-auto">{t.intro}</p>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mt-8" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {t.regions?.map((region: any, i: number) => (
            <div key={i}>
              <h3 className="text-2xl font-serif text-[#D4AF37] uppercase tracking-widest mb-6 border-b border-[#0B1A36]/10 dark:border-white/10 pb-2">{region.name}</h3>
              <div className="space-y-6">
                {region.spots.map((spot: any, j: number) => (
                  <div key={j} className="bg-white dark:bg-[#0B1A36]/60 p-6 rounded-[20px] shadow-lg border border-[#0B1A36]/5 dark:border-white/5 hover:shadow-2xl transition-all">
                    <h4 className="text-xl font-serif text-[#0B1A36] dark:text-white mb-2">{spot.name}</h4>
                    <p className="text-[#0B1A36]/70 dark:text-white/70 whitespace-pre-line mb-3 text-sm">{spot.address}</p>
                    <p className="text-[#0B1A36]/80 dark:text-white/80 font-medium mb-2 text-sm flex items-center gap-2">
                      <i className="fa-solid fa-phone text-[#D4AF37]" /> {spot.tel}
                    </p>
                    <p className="text-[#0B1A36]/60 dark:text-white/60 text-xs whitespace-pre-line border-t border-[#0B1A36]/5 pt-2 mt-2">{spot.hours}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LocationsPage;
