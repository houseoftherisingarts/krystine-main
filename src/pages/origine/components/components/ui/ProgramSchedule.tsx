import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Sparkles, Radio, Globe, ChevronDown } from 'lucide-react';

const pillars = [
  {
    id: 1,
    title: "Pilier 1",
    weeks: [
      { id: 1, date: "19 avril" }, { id: 2, date: "26 avril" }, 
      { id: 3, date: "3 mai" }, { id: 4, date: "10 mai" }
    ]
  },
  {
    id: 2,
    title: "Pilier 2",
    weeks: [
      { id: 5, date: "17 mai" }, { id: 6, date: "24 mai" }, 
      { id: 7, date: "31 mai" }, { id: 8, date: "7 juin" }
    ]
  },
  {
    id: 3,
    title: "Pilier 3",
    weeks: [
      { id: 9, date: "14 juin" }, { id: 10, date: "21 juin" }, 
      { id: 11, date: "28 juin" }, { id: 12, date: "5 juillet" }
    ]
  }
];

export const ProgramSchedule: React.FC = () => {
  const [timeZone, setTimeZone] = useState('America/Toronto');

  const displayTime = useMemo(() => {
    try {
      const startDate = new Date("2026-05-03T08:30:00-04:00");
      const endDate = new Date("2026-05-03T10:30:00-04:00");
      const formatter = new Intl.DateTimeFormat('fr-CA', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timeZone,
      });
      return `${formatter.format(startDate).replace(' h ', 'h')} à ${formatter.format(endDate).replace(' h ', 'h')}`;
    } catch (e) {
      return "8h30 à 10h30";
    }
  }, [timeZone]);

  return (
    <div className="relative overflow-hidden w-full py-12 lg:py-0">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-copper-glow/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-copper-honey/20 rounded-full blur-[120px]"></div>
      </div>

      {/* ZOOM 75% APPLIED HERE to make everything fit in the viewport */}
      <div className="max-w-7xl mx-auto px-6 relative z-10 lg:pt-10" style={{ zoom: 0.75 } as React.CSSProperties}>
        {/* lg:items-stretch forces both columns to be equal height */}
        <div className="lg:grid lg:grid-cols-12 gap-16 lg:items-stretch">
          
          {/* Left Column: Global Info */}
          <div className="lg:col-span-5 space-y-12 flex flex-col">
            <div className="space-y-4">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-copper-bruni/10 text-copper-bruni dark:text-copper-light text-xs font-bold tracking-[0.2em] uppercase"
              >
                <Calendar size={14} />
                Calendrier de la traversée
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-serif text-ink-sureau dark:text-paper leading-tight"
              >
                Cohorte Fondatrice — <span className="italic">Horaire 2026</span>
              </motion.h2>
            </div>

            <div className="space-y-8">
              {/* Dimanche - Direct */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-3xl bg-white/40 dark:bg-black/20 border border-copper-bruni/10 backdrop-blur-sm relative group hover:border-copper-bruni/30 transition-all"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-copper-bruni rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6 group-hover:rotate-0 transition-transform">
                  <Radio className="text-white" size={24} />
                </div>
                <div className="pl-8 w-full">
                  <h3 className="font-serif text-2xl text-ink-sureau dark:text-paper mb-2">Le Dimanche : Le Direct</h3>
                  <p className="text-ink-sureau/80 dark:text-paper/80 leading-relaxed mb-4">
                    Rencontres en direct, tous les DIMANCHES.
                  </p>
                  
                  {/* Dynamic Time Display (No White Backgrounds) */}
                  <div className="bg-copper-bruni/5 dark:bg-black/20 rounded-xl p-4 md:p-5 border border-copper-bruni/20 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-2xl text-copper-bruni dark:text-copper-light">
                          {displayTime}
                        </span>
                    </div>
                    
                    {/* VISIBLE DROPDOWN UI */}
                    <div className="relative w-full group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Globe size={16} className="text-copper-bruni/70 group-hover:text-copper-bruni transition-colors" />
                        </div>
                        <select 
                          value={timeZone} 
                          onChange={(e) => setTimeZone(e.target.value)}
                          className="w-full appearance-none bg-transparent border border-copper-bruni/30 group-hover:border-copper-bruni text-sm font-medium text-ink-sureau dark:text-paper py-2.5 pl-10 pr-10 rounded-lg cursor-pointer transition-all focus:outline-none focus:ring-1 focus:ring-copper-bruni/50"
                        >
                          <optgroup label="Principaux">
                            <option value="America/Toronto">Québec (Heure de l'Est)</option>
                            <option value="Europe/Paris">France (Europe Centrale)</option>
                          </optgroup>
                          <optgroup label="Autres fuseaux">
                            <option value="Europe/London">Royaume-Uni (Londres)</option>
                            <option value="America/Vancouver">Canada (Pacifique)</option>
                            <option value="America/Edmonton">Canada (Rocheuses)</option>
                            <option value="America/Halifax">Canada (Atlantique)</option>
                            <option value="Indian/Reunion">La Réunion</option>
                            <option value="America/Martinique">Martinique / Guadeloupe</option>
                            <option value="Pacific/Noumea">Nouvelle-Calédonie</option>
                            <option value="Pacific/Tahiti">Polynésie française</option>
                          </optgroup>
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <ChevronDown size={16} className="text-copper-bruni/70 group-hover:text-copper-bruni transition-colors" />
                        </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Jeudi - Audios */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-3xl bg-white/40 dark:bg-black/20 border border-copper-bruni/10 backdrop-blur-sm relative group hover:border-copper-bruni/30 transition-all"
              >
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-copper-honey rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 group-hover:rotate-0 transition-transform">
                  <Clock className="text-white" size={24} />
                </div>
                <div className="pl-8">
                  <h3 className="font-serif text-2xl text-ink-sureau dark:text-paper mb-2">Le Jeudi : Les Enseignements</h3>
                  <p className="text-ink-sureau/80 dark:text-paper/80 leading-relaxed">
                    <span className="font-bold text-copper-bruni dark:text-copper-light">Enseignements audio + PDF</span> déposés sur votre portail chaque jeudi matin.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="flex items-start gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-dashed border-ink-sureau/10"
              >
                <Sparkles className="text-copper-bruni flex-shrink-0 mt-1" size={18} />
                <p className="text-sm italic text-ink-sureau/60 dark:text-paper/60">
                  Chaque rencontre est disponible en rediffusion dans les 24 heures. Vous pouvez poser vos questions à l'avance.
                </p>
              </motion.div>
            </div>
          </div>

          {/* Right Column: Pillars & Weeks - Fully Stretched */}
          <div className="lg:col-span-7 mt-16 lg:mt-0 flex flex-col h-full w-full gap-6">
            {pillars.map((pillar, pIdx) => (
              <div key={pillar.id} className="flex flex-col gap-3 w-full flex-1">
                
                {/* Pillar Header */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: pIdx * 0.1 }}
                  className="flex items-center gap-4 w-full shrink-0"
                >
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-copper-bruni dark:text-copper-light whitespace-nowrap">
                    {pillar.title}
                  </h4>
                  <div className="flex-1 h-px bg-copper-bruni/20 dark:bg-copper-honey/20"></div>
                </motion.div>
                
                {/* 4 Weeks Grid for this Pillar - Stretches to fill space */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 lg:gap-4 w-full flex-1">
                  {pillar.weeks.map((week, wIdx) => (
                    <motion.div
                      key={week.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: (pIdx * 4 + wIdx) * 0.05 }}
                      whileHover={{ y: -5, borderColor: 'rgba(200, 148, 62, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                      className="h-full w-full p-4 lg:p-6 rounded-2xl bg-white/50 dark:bg-black/20 border border-copper-bruni/20 backdrop-blur-sm flex flex-col items-center justify-center text-center transition-all"
                    >
                      <span className="text-[10px] uppercase tracking-[0.2em] text-copper-bruni dark:text-copper-honey font-bold mb-2">
                        Semaine {week.id}
                      </span>
                      <span className="text-xl lg:text-2xl font-serif text-ink-sureau dark:text-paper">
                        {week.date}
                      </span>
                    </motion.div>
                  ))}
                </div>
                
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};