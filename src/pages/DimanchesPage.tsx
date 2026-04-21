import React from 'react';
import { useApp } from '../contexts/AppContext';

const DimanchesPage: React.FC = () => {
  const { lang } = useApp();

  return (
    <div className="min-h-screen bg-white dark:bg-[#050C1A] text-[#0B1A36] dark:text-white pt-32 pb-24">
      {/* Hero */}
      <div className="relative h-[60vh] flex items-center justify-center overflow-hidden mb-16">
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 via-[#F5F5F0] to-[#0B1A36]/10 dark:from-[#0B1A36] dark:to-[#050C1A]" />
        <div className="relative z-10 text-center px-6">
          <span className="text-[#D4AF37] uppercase tracking-[0.4em] text-xs font-bold block mb-6">
            {lang === 'FR' ? 'Rituel Hebdomadaire' : 'Weekly Ritual'}
          </span>
          <h1 className="text-5xl md:text-7xl font-serif text-[#0B1A36] dark:text-white mb-4 leading-tight">
            {lang === 'FR' ? "Les Dimanches d'Origine" : "Sundays of Origin"}
          </h1>
          <p className="text-xl font-serif italic text-[#0B1A36]/60 dark:text-white/60 max-w-2xl mx-auto">
            {lang === 'FR'
              ? "Un espace sacré pour ralentir, nourrir et se reconnecter chaque dimanche."
              : "A sacred space to slow down, nourish, and reconnect every Sunday."}
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
          <div>
            <h2 className="text-3xl font-serif mb-6">
              {lang === 'FR' ? "Qu'est-ce que c'est?" : "What is this?"}
            </h2>
            <p className="text-[#0B1A36]/70 dark:text-white/70 leading-relaxed mb-6">
              {lang === 'FR'
                ? "Les Dimanches d'Origine sont une invitation hebdomadaire à revenir à l'essentiel. Chaque dimanche matin, Krystine vous guide à travers un rituel ayurvédique simple et profond."
                : "Sundays of Origin are a weekly invitation to return to what matters. Each Sunday morning, Krystine guides you through a simple and profound Ayurvedic ritual."}
            </p>
            <p className="text-[#0B1A36]/70 dark:text-white/70 leading-relaxed">
              {lang === 'FR'
                ? "Respiration consciente. Méditation courte. Mouvement doux. Et un rituel de soin personnalisé selon votre Dosha."
                : "Conscious breathing. Short meditation. Gentle movement. And a personalized care ritual based on your Dosha."}
            </p>
          </div>
          
          <div className="space-y-4">
            {[
              { icon: 'fa-sun', title: lang === 'FR' ? 'Chaque Dimanche matin' : 'Every Sunday morning', desc: lang === 'FR' ? 'Un rituel de 30-45 minutes pour commencer la semaine autrement.' : 'A 30-45 minute ritual to start the week differently.' },
              { icon: 'fa-leaf', title: lang === 'FR' ? 'Inspiré de l\'Ayurveda' : 'Inspired by Ayurveda', desc: lang === 'FR' ? 'Chaque rituel est adapté à votre constitution naturelle.' : 'Each ritual is adapted to your natural constitution.' },
              { icon: 'fa-users', title: lang === 'FR' ? 'En communauté' : 'In community', desc: lang === 'FR' ? 'Rejoignez un groupe de femmes engagées dans leur bien-être.' : 'Join a group of women committed to their well-being.' },
            ].map((item, i) => (
              <div key={i} className="bg-[#F5F5F0] dark:bg-[#0B1A36]/60 p-6 rounded-[20px] flex gap-4 border border-[#0B1A36]/5 dark:border-white/5">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                  <i className={`fa-solid ${item.icon} text-[#D4AF37]`} />
                </div>
                <div>
                  <h3 className="font-bold text-[#0B1A36] dark:text-white mb-1 text-sm uppercase tracking-wider">{item.title}</h3>
                  <p className="text-[#0B1A36]/60 dark:text-white/60 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-[#0B1A36] to-[#1A2642] rounded-[30px] p-12 text-white border border-[#D4AF37]/20">
          <h2 className="text-3xl md:text-4xl font-serif mb-6">
            {lang === 'FR' ? 'Rejoindre les Dimanches d\'Origine' : 'Join the Sundays of Origin'}
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
            {lang === 'FR'
              ? 'Prenez soin de vous chaque dimanche. Un abonnement mensuel. Annulez à tout moment.'
              : 'Take care of yourself every Sunday. Monthly subscription. Cancel anytime.'}
          </p>
          <a href="/origine" className="inline-flex items-center gap-3 bg-[#D4AF37] text-[#0B1A36] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-white transition-colors">
            {lang === 'FR' ? 'Démarrer' : 'Get Started'} <i className="fa-solid fa-arrow-right" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default DimanchesPage;
