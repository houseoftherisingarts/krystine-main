import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import EditableText from '../components/edit/EditableText';
import EditableImage from '../components/edit/EditableImage';

const VataPage: React.FC = () => {
  const { lang, addToCart } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#8F9779]/20 to-white dark:from-[#2a2015] dark:to-[#16100a]">
      {/* Hero */}
      <div className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <EditableImage
          fieldKey="vata.hero.background"
          defaultSrc={ASSETS.shopBg}
          className="absolute inset-0"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#4A5D23]/60 to-[#2a2015]/90 pointer-events-none" />
        <div className="relative z-10 text-center text-white px-6">
          <span className="text-[#7d6330] uppercase tracking-[0.4em] text-xs font-bold block mb-4">
            <EditableText
              fieldKey="vata.hero.kicker"
              defaultValue={lang === 'FR' ? 'Programme Ayurvédique' : 'Ayurvedic Program'}
            />
          </span>
          <h1 className="text-6xl md:text-8xl font-serif mb-4">
            <EditableText fieldKey="vata.hero.title" defaultValue="Vata" />
          </h1>
          <p className="text-xl font-serif italic text-white/80">
            <EditableText
              fieldKey="vata.hero.subtitle"
              defaultValue={lang === 'FR' ? 'Enraciner. Réchauffer. Apaiser.' : 'Ground. Warm. Soothe.'}
            />
          </p>
        </div>
      </div>

      {/* Dosha card */}
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-4xl font-serif text-[#2a2015] dark:text-white mb-6">
              {lang === 'FR' ? 'Le Dosha Vata' : 'The Vata Dosha'}
            </h2>
            <p className="text-[#2a2015]/70 dark:text-white/70 leading-relaxed mb-6 text-lg">
              {lang === 'FR'
                ? 'Vata gouverne tout ce qui bouge. Il est sec, léger, froid, rugueux, subtil et mobile. Lorsqu\'il est en équilibre, il incarne la créativité, la liberté et l\'enthousiasme.'
                : 'Vata governs everything that moves. When balanced, it brings creativity, freedom, and enthusiasm.'}
            </p>
            <p className="text-[#2a2015]/70 dark:text-white/70 leading-relaxed mb-8">
              {lang === 'FR'
                ? 'Un Vata déséquilibré peut mener à l\'anxiété, l\'insomnie, et une digestion irrégulière. Notre programme aide à retrouver l\'ancrage.'
                : 'An imbalanced Vata can lead to anxiety, insomnia, and irregular digestion. Our program helps restore grounding.'}
            </p>
            <div className="flex flex-wrap gap-3">
              {(lang === 'FR' ? ['Ancrage', 'Chaleur', 'Régularité', 'Nourrissement'] : ['Grounding', 'Warmth', 'Regularity', 'Nourishment']).map((tag, i) => (
                <span key={i} className="bg-[#8F9779]/20 text-[#4A5D23] dark:text-[#8F9779] px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border border-[#8F9779]/30">{tag}</span>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="bg-white dark:bg-[#2a2015]/60 p-8 rounded-[30px] shadow-2xl border border-[#8F9779]/20">
            <div className="w-full aspect-[4/5] bg-[#f6f3ee] dark:bg-white/5 rounded-[20px] mb-6 flex items-center justify-center overflow-hidden relative">
              <img src={ASSETS.productVata} alt="Huile Vata" className="w-full h-full object-cover" />
            </div>
            <h3 className="font-serif text-2xl text-[#2a2015] dark:text-white mb-1">
              {lang === 'FR' ? "L'Apaisante Vata" : 'The Soothing Vata'}
            </h3>
            <p className="text-sm text-[#2a2015]/50 dark:text-white/50 mb-3 uppercase tracking-wider">
              {lang === 'FR' ? 'Huile Corporelle' : 'Body Oil'}
            </p>
            <p className="font-bold text-[#7d6330] text-xl mb-6">48.00 CAD</p>
            <button
              onClick={() => addToCart({ title: lang === 'FR' ? "L'Apaisante Vata" : 'The Soothing Vata', price: '48.00 CAD', type: lang === 'FR' ? 'Huile Corporelle' : 'Body Oil', image: ASSETS.productVata })}
              className="w-full bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors shadow-lg"
            >
              {lang === 'FR' ? 'Ajouter au panier' : 'Add to cart'}
            </button>
          </div>
        </div>

        {/* Learn more CTA */}
        <div className="text-center py-16 border-t border-[#2a2015]/10 dark:border-white/10">
          <p className="text-[#2a2015]/60 dark:text-white/60 mb-6 font-serif italic">
            {lang === 'FR' ? 'Vous n\'êtes pas certain de votre Dosha?' : 'Not sure about your Dosha?'}
          </p>
          <button onClick={() => navigate('/ayurveda')} className="bg-[#8F9779] text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#4A5D23] transition-colors">
            {lang === 'FR' ? 'Faire le Quiz Dosha' : 'Take the Dosha Quiz'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VataPage;
