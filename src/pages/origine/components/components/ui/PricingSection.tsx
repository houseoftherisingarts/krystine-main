import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogoO } from './LogoO';
import { X, Check } from 'lucide-react';

const TableRow: React.FC<{ title: string; detail?: React.ReactNode; value: string; isLast?: boolean }> = ({ title, detail, value, isLast }) => (
  <div className={`flex justify-between items-start py-4 ${isLast ? '' : 'border-b border-[#C8943E]/10'}`}>
    <div className="pr-4">
      <div className="text-sm md:text-base text-[#6B5E53] dark:text-paper/80 font-bold">
        {title}
      </div>
      {detail && (
        <div className="text-xs md:text-sm text-[#6B5E53]/80 dark:text-paper/60 italic mt-1 leading-relaxed">
          {detail}
        </div>
      )}
    </div>
    <div className="text-lg md:text-xl font-serif font-bold text-[#BF5700] whitespace-nowrap text-right min-w-[100px] pt-0.5">
      {value}
    </div>
  </div>
);

const PaymentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="backdrop"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[70]" 
        />
      )}
      {isOpen && (
        <motion.div 
          key="modal"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none"
        >
          <div className="bg-[#FDFBF7] dark:bg-ink-sureau w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden pointer-events-auto relative flex flex-col max-h-[90vh]">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors z-10"
            >
              <X size={24} className="text-ink-sureau dark:text-paper" />
            </button>
              <div className="p-8 pb-4 text-center">
                <h3 className="font-serif text-3xl md:text-4xl text-[#4A5D52] mb-2">
                  Options de paiement
                </h3>
                <p className="text-ink-sureau/60 dark:text-paper/60 italic">
                  Choisissez le plan qui vous convient le mieux.<br/>
                  Les versements mensuels incluent de légers frais d’échelonnement
                </p>
              </div>
              <div className="p-6 md:p-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-black/20 rounded-2xl p-6 border border-[#C8943E]/20 relative flex flex-col h-full hover:shadow-lg transition-shadow">
                    <div className="absolute top-0 right-0 bg-[#C8943E]/20 text-[#4A5D52] text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wider uppercase">
                      Populaire
                    </div>
                    <h4 className="font-serif text-xl text-ink-sureau dark:text-paper mb-4">3 Versements</h4>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-[#4A5D52]">314 $</span>
                      <span className="text-ink-sureau/60 dark:text-paper/60"> / mois</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-start gap-2 text-sm text-ink-sureau/80 dark:text-paper/80">
                        <Check size={16} className="text-[#C8943E] mt-0.5 shrink-0" />
                        <span>Accès immédiat à la plateforme</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-ink-sureau/80 dark:text-paper/80">
                        <Check size={16} className="text-[#C8943E] mt-0.5 shrink-0" />
                        <span>Paiement réparti sur 3 mois</span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-black/20 rounded-2xl p-6 border border-[#C8943E]/20 relative flex flex-col h-full hover:shadow-lg transition-shadow">
                    <div className="absolute top-0 right-0 bg-[#C8943E]/20 text-[#4A5D52] text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-wider uppercase">
                      Flexibilité
                    </div>
                    <h4 className="font-serif text-xl text-ink-sureau dark:text-paper mb-4">6 Versements</h4>
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-[#4A5D52]">165 $</span>
                      <span className="text-ink-sureau/60 dark:text-paper/60"> / mois</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                      <li className="flex items-start gap-2 text-sm text-ink-sureau/80 dark:text-paper/80">
                        <Check size={16} className="text-[#C8943E] mt-0.5 shrink-0" />
                        <span>Mensualités réduites</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-ink-sureau/80 dark:text-paper/80">
                        <Check size={16} className="text-[#C8943E] mt-0.5 shrink-0" />
                        <span>Paiement réparti sur 6 mois</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8 pt-0 mt-auto">
                <button
                  onClick={() => {
                    if ((window as any).fbq) (window as any).fbq('track', 'InitiateCheckout');
                    window.open('https://www.krystinestlaurent.com/offers/KHHc9r9b/checkout', '_blank');
                  }}
                  className="w-full py-4 bg-[#4A5D52] hover:bg-[#3A4D42] text-[#FDFBF7] rounded-xl font-serif text-lg tracking-widest uppercase transition-all shadow-md hover:shadow-xl hover:-translate-y-1"
                >
                  Continuer vers l'inscription
                </button>
                <p className="text-center text-xs text-ink-sureau/40 dark:text-paper/40 mt-4 italic">
                  Redirection sécurisée vers la page de commande Kajabi
                </p>
              </div>
            </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const PricingSection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="pricing" className="py-24 lg:py-32 px-6 bg-paper dark:bg-ink-forest relative overflow-hidden w-full">
      <div className="max-w-7xl mx-auto relative z-10">
        <PaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-ink-sureau border-t-4 border-[#C8943E] rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden transition-colors duration-700 relative"
        >
          {/* Kintsugi-style decorative line */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C8943E]/30 to-transparent" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 items-stretch w-full">
            {/* Left Panel: Value Proposition (7/12) */}
            <div className="md:col-span-7 p-6 md:p-10 lg:p-16 border-b md:border-b-0 md:border-r border-[#C8943E]/10">
               <div className="text-center mb-8">
                  <div className="font-serif text-sm md:text-xl tracking-[0.2em] uppercase text-[#9E7B5A] dark:text-copper-light mb-2">
                     Cohorte fondatrice
                  </div>
                  <h2 className="font-serif text-3xl md:text-5xl text-[#2C2420] dark:text-paper leading-tight flex items-center justify-center flex-wrap mb-6">
                     Expérience <LogoO className="w-8 h-8 md:w-10 md:h-10 mx-2 text-[#C8943E]" /><em className="italic font-normal text-[#C8943E]">rigine</em>
                  </h2>
                  <div className="mt-8 mb-4">
                    <p className="font-script text-[clamp(2rem,4vw,3rem)] text-[#BF5700] dark:text-copper-light text-center mx-auto text-balance whitespace-normal">
                      Le corps sait. Il manquait la carte pour le lire.
                    </p>
                  </div>
               </div>
                 <div className="mb-10 w-full">
                 
                <div className="space-y-4 p-5 md:p-8 bg-white/60 dark:bg-black/20 rounded-2xl md:rounded-3xl border border-white/30 shadow-lg mt-8 md:mt-12 w-full">
                   <div className="flex justify-between items-end border-b border-[#C8943E]/20 pb-4 mb-6 md:mb-8">
                     <div className="font-serif font-bold text-lg md:text-xl tracking-widest uppercase text-[#5D4B35] dark:text-copper-light text-left">
                       L'EXPÉRIENCE D'ORIGINE — CE QUE VOUS RECEVEZ
                     </div>
                     <div className="text-xs md:text-sm font-bold text-[#9E7B5A] dark:text-copper-light uppercase tracking-wider text-right whitespace-nowrap pl-4 pb-1">
                       Valeur actuelle
                     </div>
                   </div>
                   
                   <div className="flex flex-col">
                     <TableRow 
                       title="12 rendez-vous en direct avec Krystine (24 h de présence)" 
                       detail={<>Chaque semaine, en direct. Elle enseigne, elle écoute, elle ajuste, et chaque rendez-vous se termine par une méditation de groupe. <strong className="font-bold text-[#BF5700] dark:text-copper-light">Vingt-quatre heures de présence directe</strong> sur douze semaines.</>}
                       value="4 800 $" 
                     />
                     <TableRow 
                       title="12 modules audio — la grille de lecture du corps" 
                       detail={<>Chaque semaine, un enseignement en audio. Une <strong className="font-bold text-[#BF5700] dark:text-copper-light">grille de lecture</strong> pour se comprendre quand le corps donne des signaux que l'on ne sait pas décoder.</>}
                       value="600 $" 
                     />
                     <TableRow 
                       title="12 méditations audio guidées" 
                       detail={<>Un <strong className="font-bold text-[#BF5700] dark:text-copper-light">ancrage personnel</strong>, court et pré-enregistré, pour laisser se déposer ce qui a été reçu entre les rendez-vous.</>}
                       value="360 $" 
                     />
                     <TableRow 
                       title="Vos questions — le privilège fondatrice" 
                       detail={<>Soumises trois jours avant le rendez-vous. Krystine et son équipe les lisent, préparent, et le rendez-vous <strong className="font-bold text-[#BF5700] dark:text-copper-light">s'ajuste à ce que vous vivez réellement</strong>.</>}
                       value="500 $" 
                     />
                     <TableRow 
                       title="Le Journal d'Observation et de Rituels" 
                       detail={<>L'<strong className="font-bold text-[#BF5700] dark:text-copper-light">ancrage tangible</strong> des douze semaines. Espace d'intégration, repères saisonniers et rituels.</>}
                       value="150 $" 
                     />
                     <TableRow 
                       title="L'Espace — la communauté d'Origine" 
                       detail={<>Une communauté, mais pas comme vous les connaissez. Un endroit calme entre les rendez-vous. <strong className="font-bold text-[#BF5700] dark:text-copper-light">Sans notifications, sans obligation de publier</strong>.</>}
                       value="300 $" 
                     />
                     <TableRow 
                       title="Liste de musique (spirale dorée, 432 Hz)" 
                       detail={<>Une liste de musique qui fait voyager le coeur et l'âme, disponible avec un <strong className="font-bold text-[#BF5700] dark:text-copper-light">lien privé sur Spotify</strong>.</>}
                       value="97 $" 
                       isLast={true} 
                     />
                   </div>

                   <div className="mt-6 bg-[#C8943E]/5 border border-[#C8943E]/20 rounded-2xl p-5 flex justify-between items-center">
                     <span className="text-sm md:text-base text-[#6B5E53] dark:text-paper/80 font-medium pr-4">
                       15 % sur toute la boutique INSPIRATA AYURVEDA (Rituels. Soins. Présence)
                     </span>
                     <span className="text-lg md:text-xl font-serif font-bold text-[#BF5700] whitespace-nowrap text-right min-w-[100px]">
                       (~150 $)
                     </span>
                   </div>

                   <div className="mt-8 pt-6 border-t border-[#C8943E]/20">
                     <div className="flex justify-between items-center mb-4">
                       <span className="text-base md:text-lg text-[#6B5E53] dark:text-paper/80 uppercase tracking-wider">Valeur totale</span>
                       <span className="text-xl md:text-2xl font-serif font-bold text-[#5D4B35] dark:text-paper/80 relative inline-block text-right min-w-[80px]">
                         <span className="absolute top-1/2 left-[-5%] w-[110%] h-[2px] bg-[#BF5700]/70 -translate-y-1/2 -rotate-3"></span>
                         6 957 $
                       </span>
                     </div>
                     <div className="flex justify-between items-center mb-6">
                       <span className="text-base md:text-lg text-[#6B5E53] dark:text-paper/80 uppercase tracking-wider">Avec bonus</span>
                       <span className="text-xl md:text-2xl font-serif font-bold text-[#5D4B35] dark:text-paper/80 relative inline-block text-right min-w-[80px]">
                         <span className="absolute top-1/2 left-[-5%] w-[110%] h-[2px] bg-[#BF5700]/70 -translate-y-1/2 -rotate-3"></span>
                         7 254 $+
                       </span>
                     </div>
                     <div className="pt-8 mt-4 border-t border-[#C8943E]/20">
                       <div className="flex justify-between items-center">
                         <span className="text-lg md:text-xl font-bold text-[#5D4B35] dark:text-copper-light uppercase tracking-wider">Vous payez</span>
                         <span className="text-3xl md:text-4xl font-serif font-bold text-[#BF5700] text-right min-w-[80px]">997 $</span>
                       </div>
                       <div className="text-right mt-3 space-y-1">
                         <p className="text-sm md:text-base text-[#BF5700] dark:text-copper-light italic font-medium">
                           Tarif exceptionnel de lancement de la cohorte fondatrice ORIGINE.
                         </p>
                         <p className="text-sm md:text-base text-[#BF5700] dark:text-copper-light font-bold">
                           Pour un temps limité. ( vraiment )
                         </p>
                       </div>
                     </div>
                   </div>
                </div>
               </div>
            </div>
            {/* Right Panel: Pricing & Action (5/12) */}
            <div className="md:col-span-5 p-6 md:p-10 lg:p-16 bg-[#F5F0E8]/50 dark:bg-white/5 flex flex-col justify-center relative overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none">
                  <LogoO className="w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 text-[#2C2420] dark:text-white" />
               </div>
               <div className="relative z-10 text-center w-full">
                  <div className="font-serif text-2xl md:text-4xl font-bold tracking-wider uppercase text-[#C8943E] mb-4 leading-tight">
                    TARIF COHORTE FONDATRICE<br />
                    <span className="text-xl md:text-3xl font-normal text-[#4A5D52] mt-2 inline-block">PRIX DE LANCEMENT</span>
                  </div>
                  <div className="flex items-start justify-center mb-6 text-[#2C2420] dark:text-paper">
                    <span className="font-serif text-7xl md:text-9xl font-light tracking-tighter">997</span>
                    <span className="text-2xl md:text-4xl mt-2 md:mt-4 ml-2 font-medium">$</span>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="inline-block px-6 py-2 mb-8 font-serif text-sm tracking-widest uppercase transition-all duration-300 rounded-full bg-[#4A5D52] text-white hover:bg-[#3A4D42] hover:shadow-md hover:-translate-y-0.5"
                  >
                    Options de paiement disponibles
                  </button>
                  <div className="flex justify-center mb-8 md:mb-10 pb-8 border-b border-[#9E7B5A]/10 dark:border-white/10 w-full">
                    <div className="bg-white/60 dark:bg-black/20 border border-[#9E7B5A]/20 dark:border-white/10 rounded-2xl p-5 md:p-8 shadow-sm flex flex-col items-center justify-center min-w-[200px]">
                      <div className="text-[10px] md:text-xs font-bold tracking-widest uppercase text-[#5D4B35] dark:text-paper/70 mb-1">PRIX RÉGULIER</div>
                      <div className="font-serif text-xl md:text-2xl text-[#6B5E53] dark:text-paper/80">1 297 $</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      if ((window as any).fbq) (window as any).fbq('track', 'InitiateCheckout');
                      window.open('https://www.krystinestlaurent.com/offers/KHHc9r9b/checkout', '_blank');
                    }}
                    className="w-full py-4 md:py-5 px-4 md:px-8 font-serif text-base md:text-lg tracking-[0.1em] md:tracking-[0.15em] uppercase text-[#FDFBF7] bg-[#4A5D52] rounded-xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
                  >
                    <span className="relative z-10">COMMENCER LA TRAVERSÉE</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#C8943E] to-[#BF5700] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </button>
                  <div className="mt-8 text-left bg-[#C8943E]/5 border border-[#C8943E]/20 rounded-2xl p-8 md:p-10">
                    <h4 className="font-serif text-lg font-bold text-[#BF5700] mb-6 uppercase tracking-wider">
                      LES PRIVILÈGES EXCLUSIFS FONDATRICE
                    </h4>
                    <div className="space-y-6">
                      <div className="flex justify-between items-start gap-4 md:gap-6">
                        <span className="text-sm md:text-base text-[#6B5E53] dark:text-paper/80 font-medium leading-relaxed">Rediffusions Dimanches d'Origine</span>
                        <span className="text-sm md:text-base font-serif text-[#BF5700] whitespace-nowrap text-right shrink-0">Valeur : 297 $</span>
                      </div>
                      <div className="flex justify-between items-start gap-4 md:gap-6">
                        <span className="text-sm md:text-base text-[#6B5E53] dark:text-paper/80 font-medium leading-relaxed">Accès au contenu inspiré du troisième tome - en parution 14 octobre 2026</span>
                        <span className="text-sm md:text-base font-serif text-[#BF5700] whitespace-nowrap text-right shrink-0">Valeur : Inestimable</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 text-xs md:text-sm text-[#9B8E82] dark:text-paper/40 italic leading-relaxed">
                    <strong className="font-bold text-[#BF5700] dark:text-copper-light">La cohorte a commencé le 19 avril</strong>, vous pouvez rejoindre jusqu'au 27 en intégrant la rediffusion.
                  </div>
               </div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto mt-12 text-center bg-white/40 dark:bg-black/20 border border-[#9E7B5A]/20 rounded-3xl p-8 md:p-10 shadow-lg backdrop-blur-sm"
        >
          <h4 className="font-serif text-xl md:text-2xl font-bold text-[#5D4B35] dark:text-copper-light mb-4 uppercase tracking-wider">
            NOTRE GARANTIE CŒUR LÉGER — 15 JOURS
          </h4>
          <p className="text-base md:text-lg text-[#6B5E53] dark:text-paper/80 italic leading-relaxed">
            Si après <strong className="font-bold text-[#BF5700] dark:text-copper-light">15 jours</strong> vous sentez que ce cadre ne vous convient pas, nous vous <strong className="font-bold text-[#BF5700] dark:text-copper-light">remboursons</strong>. <strong className="font-bold text-[#BF5700] dark:text-copper-light">Sans question</strong>. Cela enlève le risque.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
