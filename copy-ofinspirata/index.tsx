import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import gsap from 'gsap';
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

// --- Assets Configuration ---
const ASSET_BASE = "https://storage.googleapis.com/inspirata/";

const ASSETS = {
  logo: `https://storage.googleapis.com/inspirata/Base%20site/Golden%20drop%20inpirata.png`,
  navLogo: `https://storage.googleapis.com/inspirata/Base%20site/inspirata%20logo%202%20%20golden.png`,
  founder: `https://storage.googleapis.com/inspirata/Gemini_Generated_Image_99odj99odj99odj9.png`,
  founderHover: `https://storage.googleapis.com/inspirata/black%20on%20beige%20krystine.jpg`,
  shopBg: `https://storage.googleapis.com/inspirata/defripante_xmas.png`,
  ayurvedaBg: `https://storage.googleapis.com/inspirata/rituel%208.png`,
  blogBg: `https://storage.googleapis.com/inspirata/krystine%20podcast.png`, 
  audio: `https://storage.googleapis.com/inspirata/Base%20site/homecoming-tranquilium-main-version-25793-03-28.mp3`,
  dropSound: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.m4a",
  productVata: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp", 
  chakras: [
    "https://storage.googleapis.com/inspirata/Chakras/483-4834340_sahasrara-chakra-symbol-png-png-download-crown-chakra.png",
    "https://storage.googleapis.com/inspirata/Chakras/root-chakra-muladhara-of-golden-red-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png",
    "https://storage.googleapis.com/inspirata/Chakras/sacral-chakra-svadhisthana-of-golden-orange-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png",
    "https://storage.googleapis.com/inspirata/Chakras/solar-plexus-chakra-manipura-of-golden-yellow-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png",
    "https://storage.googleapis.com/inspirata/Chakras/third-eye-chakra-ajna-of-golden-dark-blue-color-with-elegant-mandala-pattern-and-sanskrit-letters-in-the-center-energy-balance-hand-drawn-watercolor-illustration-ethnic-indian-pattern-png.png"
  ],
  footerLogo: "https://imgur.com/vxVavBR.png" 
};

// --- Footer Signature Component ---
const FooterSignature = () => (
  <a href="https://www.lesalondesinconnus.com" target="_blank" rel="noopener noreferrer" className="w-full py-8 flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity duration-500 mt-auto group cursor-pointer z-20 relative">
    <p className="text-[10px] uppercase tracking-widest text-royal/60 dark:text-white/60 mb-2 font-sans group-hover:text-gold transition-colors">Plateforme conceptualisée par</p>
    <div className="flex items-center gap-2">
      <span className="text-xs font-serif italic text-royal dark:text-white group-hover:text-gold transition-colors">Le Salon des Inconnus</span>
      <img src="https://i.imgur.com/vxVavBR.png" alt="Le Salon des Inconnus" className="h-6 w-auto mix-blend-multiply dark:mix-blend-screen" /> 
    </div>
  </a>
);

// --- Chakra Decorations Component ---
const ChakraDecorations = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
     <img src={ASSETS.chakras[0]} className="absolute -right-[250px] -top-[150px] w-[800px] opacity-[0.04] dark:opacity-[0.08] dark:invert" alt="" />
     <img src={ASSETS.chakras[1]} className="absolute -left-[150px] bottom-[5%] w-[500px] opacity-[0.03] dark:opacity-[0.06] rotate-45 dark:invert" alt="" />
     <img src={ASSETS.chakras[2]} className="absolute -right-[100px] bottom-[20%] w-[600px] opacity-[0.03] dark:opacity-[0.06] -rotate-12 dark:invert" alt="" />
     <img src={ASSETS.chakras[4]} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] opacity-[0.02] dark:opacity-[0.04] dark:invert" alt="" />
     <img src={ASSETS.chakras[3]} className="absolute left-[20%] bottom-[-10%] w-[400px] opacity-[0.03] dark:opacity-[0.06] dark:invert" alt="" />
  </div>
);

// --- Ayurveda Ikigai Component ---
const AyurvedaIkigai = ({ onDoshaClick, onQuizClick, doshas }) => {
  return (
    <svg viewBox="-200 -200 400 400" className="w-[350px] h-[350px] md:w-[450px] md:h-[450px] overflow-visible drop-shadow-2xl">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="light-glow" x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
             <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
             </feMerge>
        </filter>
        <filter id="inner-shadow">
           <feOffset dx="0" dy="4" />
           <feGaussianBlur stdDeviation="4" result="offset-blur" />
           <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
           <feFlood floodColor="black" floodOpacity="0.3" result="color" />
           <feComposite operator="in" in="color" in2="inverse" result="shadow" />
           <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* VATA (Green - Top Left) */}
      <g onClick={() => onDoshaClick(doshas[0])} className="cursor-pointer group">
        <circle cx="-60" cy="-50" r="90" fill="#8F9779" opacity="0.9" className="group-hover:opacity-100 transition-all duration-300 origin-center hover:scale-105" style={{ transformBox: 'fill-box' }} filter="url(#inner-shadow)" />
        <text x="-60" y="-50" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-serif text-xl font-bold uppercase tracking-widest pointer-events-none drop-shadow-md">{doshas[0].name}</text>
      </g>

      {/* PITTA (Red - Top Right) */}
      <g onClick={() => onDoshaClick(doshas[1])} className="cursor-pointer group">
        <circle cx="60" cy="-50" r="90" fill="#BC4A3C" opacity="0.9" className="group-hover:opacity-100 transition-all duration-300 origin-center hover:scale-105" style={{ transformBox: 'fill-box' }} filter="url(#inner-shadow)" />
        <text x="60" y="-50" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-serif text-xl font-bold uppercase tracking-widest pointer-events-none drop-shadow-md">{doshas[1].name}</text>
      </g>

      {/* KAPHA (Blue - Bottom) */}
      <g onClick={() => onDoshaClick(doshas[2])} className="cursor-pointer group">
        <circle cx="0" cy="70" r="90" fill="#4A7C9D" opacity="0.9" className="group-hover:opacity-100 transition-all duration-300 origin-center hover:scale-105" style={{ transformBox: 'fill-box' }} filter="url(#inner-shadow)" />
        <text x="0" y="100" textAnchor="middle" dominantBaseline="middle" fill="white" className="font-serif text-xl font-bold uppercase tracking-widest pointer-events-none drop-shadow-md">{doshas[2].name}</text>
      </g>

      {/* CENTER CORE (Quiz) */}
      <g onClick={onQuizClick} className="cursor-pointer group">
        <circle cx="0" cy="10" r="55" fill="rgba(255,255,255,0.85)" stroke="rgba(212,175,55,0.3)" strokeWidth="1" className="quiz-bud shadow-2xl transition-all duration-300 origin-center group-hover:scale-105 backdrop-blur-sm" style={{ transformBox: 'fill-box' }} filter="url(#light-glow)" />
        <text x="0" y="5" textAnchor="middle" fill="#0B1A36" className="font-serif text-sm font-bold uppercase tracking-wider pointer-events-none">Faire</text>
        <text x="0" y="22" textAnchor="middle" fill="#0B1A36" className="font-serif text-sm font-bold uppercase tracking-wider pointer-events-none">Le Quiz</text>
      </g>
    </svg>
  );
};

// --- Intro Mandala Component ---
const IntroMandala = () => (
  <svg className="intro-mandala absolute z-10 w-64 h-64 text-gold/20 opacity-0 pointer-events-none overflow-visible" viewBox="0 0 100 100" fill="currentColor">
    <g transform="translate(50,50)">
      {[...Array(8)].map((_, i) => (<path key={i} d="M0,0 Q10,-20 0,-40 Q-10,-20 0,0" transform={`rotate(${i * 45})`} />))}
      {[...Array(8)].map((_, i) => (<path key={`inner-${i}`} d="M0,0 Q5,-10 0,-20 Q-5,-10 0,0" transform={`rotate(${i * 45 + 22.5})`} opacity="0.6" />))}
       <circle cx="0" cy="0" r="5" />
    </g>
  </svg>
);

// --- QUIZ DATA ---
const QUIZ_DATA = [
    {
        question: "Comment décririez-vous votre digestion ?",
        options: [{ text: "Inconstante, votre appétit fluctue et vous avez tendance à grignoter.", type: 'vata' }, { text: "Forte, vous ressentez la faim et devenez irritable si vous mangez tard. Élimination régulière.", type: 'pitta' }, { text: "Stable, vous vous sentez rassasié pendant un certain temps après les repas. Souvent pas faim le matin au réveil.", type: 'kapha' }]
    },
    {
        question: "Comment réagissez-vous au stress et aux hauts et bas de la vie ?",
        options: [{ text: "Tendance à devenir anxieux и inquiet, pour vous-même et les autres.", type: 'vata' }, { text: "Tendance à devenir irritable, impatient, réactif.", type: 'pitta' }, { text: "Se retire et désire éviter les situations conflictuelles.", type: 'kapha' }]
    },
     {
        question: "Comment gérez-vous votre créativité ?",
        options: [{ text: "Très créatif, commence plusieurs projets à la fois.", type: 'vata' }, { text: "Créatif dans le leadership, ouvre de nouvelles voies.", type: 'pitta' }, { text: "Méthodique, calme, ancré.", type: 'kapha' }]
    },
    {
        question: "Comment décririez-vous votre tempérament ?",
        options: [{ text: "Enthousiaste, aime essayer de nouvelles choses.", type: 'vata' }, { text: "Déterminé, axé sur les objectifs.", type: 'pitta' }, { text: "Facile à vivre, préfère suivre le courant.", type: 'kapha' }]
    }
];

// --- INITIAL BLOG DATA ---
const INITIAL_BLOG_POSTS = [
    { id: 1, title: "Préparez Votre Esprit et Votre Espace", subtitle: "Rituels Puissants", date: "Août 2024", coverStyle: "bg-gradient-to-br from-[#2c5530] to-[#1a2d4d]", images: ["https://storage.googleapis.com/inspirata/Livres/nature%20ayurveda%20front.jpg"], content: `<h3>Mini-Histoire : Authentiquement Humaine</h3><p>Début août, en me promenant dans l'érablière derrière chez moi, j'ai été frappée par un arbre dont les feuilles rougissaient déjà.</p>` },
    { id: 2, title: "À L'AUBE, NE RETOURNEZ PAS VOUS COUCHER...", subtitle: "Réflexion Matinale", date: "Septembre 2024", coverStyle: "bg-gradient-to-br from-royal to-gold", content: "<p>Il y a quelque chose de subtil dans l'air ces matins-ci. Une invitation à rester éveillé, à capturer la magie de l'aube avant que le monde ne s'agite.</p>" },
    { id: 3, title: "Auto massage de fin de saison PITTA", subtitle: "Rituel Corps", date: "Juillet 2024", coverStyle: "bg-gradient-to-br from-[#BC4A3C] to-gold", content: "<p>Rituel d'Auto-Massage à l'Huile Pitta Inspirata. En cette fin de saison estivale, le corps a accumulé beaucoup de chaleur. L'Abhyanga est la clé pour apaiser ce feu.</p>" },
    { id: 4, title: "Plantes et épices pour stimuler vitalité", subtitle: "Nutrition", date: "Juin 2024", coverStyle: "bg-gradient-to-br from-gold to-[#4a3b2a]", content: "<p>Le feu digestif contribue beaucoup au bien-être. Découvrez comment le gingembre, le curcuma et le poivre noir peuvent transformer votre énergie.</p>" },
    { id: 5, title: "L'agriculture bio, de la terre à notre assiette", subtitle: "Conscience", date: "Mai 2024", coverStyle: "bg-gradient-to-br from-[#8F9779] to-[#2c5530]", content: "<p>Est-ce que prendre soin de la terre vous interpelle? Choisir nos semences pour créer nos jardins est plus qu'un achat banal, c'est un acte politique et spirituel.</p>" }
];

// --- Language Content ---
const CONTENT = {
  FR: {
    cards: {
      founder: { title: "Krystine St-Laurent", subtitle: "Découvrir", link: "#" },
      shop: { title: "Boutique", subtitle: "Magasiner", link: "#", locations: "Points de Ventes" },
      ayurveda: { title: "Ayurveda", subtitle: "Explorer", link: "#" },
      blog: { title: "Médias", subtitle: "Explorez nos contenus", link: "#" }
    },
    gem: { placeholder: "Dites-moi ce que vous cherchez...", button: "Demander", thinking: "Connexion...", modalTitle: "Votre Guide Inspirata" },
    guideBtn: "Laissez-vous guider",
    toggle: "FR",
    ayurveda: {
      whatIsTitle: "QU'EST-CE QUE L'AYURVEDA ?",
      whatIsText: "Science sœur du Yoga, l'Ayurveda est une sagesse ancestrale vieille de 5000 ans qui nous invite à reconnecter avec les rythmes de la nature. Elle ne traite pas seulement les symptômes, mais cherche à rétablir l'harmonie unique entre le corps, l'âme et l'esprit. C'est un chemin de bienveillance envers soi-même, où chaque choix — alimentation, rituels, pensées — devient une médecine pour cultiver vitalité et longévité.",
      title: "Dosha Quiz",
      introTitle: "INSPIRATA AYURVEDA",
      introText: "Peut-être avez-vous toujours pensé que vous étiez unique… mais savez-vous à quel point ?",
      desc: "L’ayurveda considère que nous sommes constitués des cinq éléments – Espace, Air, Feu, Eau et Terre – au même titre que le reste de l’univers; et que la combinaison donne naissance aux trois doshas : Vata (vent), Pitta (feu) et Kapha (eau).",
      quizPrompt: "Complétez le quiz pour découvrir votre dominance actuelle en fonction de votre nature profonde et de votre état actuel influencé par votre réalité quotidienne.",
      quizBtn: "Faire Le Quizz",
      resultsInfo: "Selon votre résultat, découvrez les trucs de Krystine que vous recevrez par courriel pour :",
      doshas: [
        { name: "Vata", elements: "Vent & Espace", action: "Enraciner, réchauffer et apaiser", definition: "Vata gouverne tout ce qui bouge. Il est sec, léger, froid, rugueux, subtil et mobile.", color: "bg-gradient-to-br from-[#8F9779] to-[#4A5D23]", productRecom: "Huile Corporelle Vata" },
        { name: "Pitta", elements: "Feu & Eau", action: "Rafraîchir, apaiser et adoucir", definition: "Pitta gouverne la digestion et le métabolisme. Il est chaud, tranchant, léger, liquide et huileux.", color: "bg-gradient-to-br from-[#D98E73] to-[#BC4A3C]", productRecom: "Huile Corporelle Pitta" },
        { name: "Kapha", elements: "Eau & Terre", action: "Activer et stimuler", definition: "Kapha gouverne la structure et la lubrification. Il est lourd, froid, lent, onctueux, doux et statique.", color: "bg-gradient-to-br from-[#4A7C9D] to-[#2F4F4F]", productRecom: "Huile Corporelle Kapha" }
      ],
      footer: "Vous n’avez pas reçu votre résultat? Vérifiez votre boîte de courriel indésirable, votre résultat pourrait y avoir été classé. N’hésitez pas à contacter notre équipe si vous avez besoin d’aide : equipe@inspiratanature.com"
    },
    backToHome: "Retour à l'accueil",
    featured: { back: "Retour", hero: { title: "RAYONS DE SOLEIL LIQUIDE", subtitle: "HUILES INFUSÉES DE PLANTES ENTIÈRES", cta: "DÉCOUVREZ NOS HUILES" }, intro: { title: "HUILES CORPORELLES INFUSÉES DE PLANTES LOCALE", subtitle: "Hydrate + Adoucit + Active", quote: "Et que notre corps nous fait sentir qu'il est temps d'agir...." }, title: "Rituels du Moment", subtitle: "Nos essentiels", products: [{ name: "Huile Corps Vata", price: "48.00 CAD", type: "Ancrage & Sérénité" }, { name: "Rituel Visage", price: "85.00 CAD", type: "Éclat Naturel" }, { name: "Livre: Nature & Ayurveda", price: "34.95 CAD", type: "Sagesse Quotidienne" }] },
    shop: { title: "Boutique", subtitle: "Nature & Bien-être", products: [{ id: 1, title: "L'Apaisante Vata", price: "48.00 CAD", type: "Huile Corporelle", image: ASSETS.productVata }, { id: 2, title: "La Rafraîchissante Pitta", price: "48.00 CAD", type: "Huile Corporelle", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }, { id: 3, title: "La Stimulante Kapha", price: "48.00 CAD", type: "Huile Corporelle", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }, { id: 4, title: "Nez Zen", price: "28.00 CAD", type: "Soins Spécifiques", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }] },
    locations: { 
      title: "Nos précieux collaborateurs", 
      intro: "Chacun de nos partenaires/distributeurs a été choisi avec soin pour la connexion de coeur ainsi que leurs valeurs de partager les bienfaits de nos produits conscients INSPIRATA AYURVEDA", 
      regions: [
        { name: "Cantons de l'Est", spots: [{ name: "Spa Eastman", address: "895 ch des Dilligences\nEastman, QC, J0E 1P0", tel: "1 800 665-5272", hours: "Lundi au Dimanche : 7h00 à 22h00" }, { name: "Caroline Cazes", address: "1074 chemin de la Montagne\nOrford, QC, J1X 6X9", tel: "819-578-7707", hours: "Sur rendez-vous seulement" }] }, 
        { name: "Québec - Trois Rivières", spots: [{ name: "Monastère des Augustines", address: "77 rue des Remparts\nQuébec, QC , G1R 0C3", tel: "418 694-1639", hours: "Lundi au dimanche : 7 h à 21 h" }, { name: "Bloomi - Soins biologiques", address: "507 rue Saint-Joseph Est\nQuébec, QC, G1K 3B7", tel: "418 529-7470", hours: "Lundi au mercredi : 10 h à 17 h 30\nJeudi et vendredi : 10 h à 20 h\nSamedi : 10 h à 17 h" }] },
        { name: "Lanaudière", spots: [{ name: "Éco-Boutique Un monde à vie", address: "160 montée Masson\nMascouche, QC, J7K 3B5", tel: "450 474-5078", hours: "Lundi au vendredi : 9h30 à 20h\nSamedi et dimanche : 9h30 à 17h" }] },
        { name: "Laurentides", spots: [{ name: "Librairie Quintessence", address: "275 rue Principale\nSaint-Sauveur, QC, J0R 1R0", tel: "450 227-5525", hours: "Lundi au Mercredi : 10h00 à 18h00\nJeudi au Samedi : 10h00 à 2100\nDimanche : 10h00 à 18h00" }] }
      ] 
    },
    media: { 
      title: "Médias", 
      subtitle: "Explorez nos contenus", 
      back: "Retour", 
      sections: [
        { id: 'podcast', label: 'Podcast', icon: 'fa-microphone' },
        { id: 'tv', label: 'TV', icon: 'fa-tv' },
        { id: 'book', label: 'Livres', icon: 'fa-book' },
        { id: 'blog', label: 'Blog', icon: 'fa-pen-nib' }
      ], 
      details: { 
        podcast: { 
          title: "Au-delà des tendances", 
          subtitle: "Le Podcast Inspirata",
          spotifyUrl: "https://open.spotify.com/embed/show/0cHEVMLF92tJxiO7MwyOKD?utm_source=generator", 
          ctaLink: "https://open.spotify.com/show/0cHEVMLF92tJxiO7MwyOKD",
          points: ["Conversations profondes, loin du bruit ambiant.", "Clés pratiques inspirées de la sagesse vivante.", "Une voix pour retrouver énergie et clarté."], 
          newsletter: { title: "Restons connectés", subtitle: "( hors des réseaux sociaux )", desc: "Recevez chaque nouvel épisode du podcast Inspirata livré directement par courriel.", button: "Je m'inscris" }, 
          cta: "Accéder aux épisodes", 
          promo: "🌿 Découvrir les Rituels Essentiels — APAISE, NOURRIT, TRANSFORME 27 $" 
        }, 
        tv: { 
          title: "Émissions et Entrevues", 
          desc: "Notre fondatrice, à la barre de son émission SANTÉ LA VIE d'une durée de 3 saisons, a été invitée sur plusieurs plateformes pour parler de l'Ayurveda.", 
          videos: [
            { id: "v9uMfDmQ2YE", title: "Santé! La Vie!" },
            { id: "fxzVTt5RfBw", title: "Salut Bonjour" },
            { id: "8t1BfEk_2do", title: "François Lemay - Inspire toi" },
            { id: "wtQ_MEgkrVE", title: "Daniel Blouin" },
            { id: "ab-EEYQi7yM", title: "France Gauthier" },
            { id: "t3KNbXTyI5I", title: "Diva Yoga - Entrevue" },
            { id: "2KWQuUbhmsU", title: "Diva Yoga - Rituel" }
          ] 
        }, 
        book: { 
          title: "Nos Livres", 
          items: [
            { 
              title: "Nature & Ayurveda", fullTitle: "Livre Nature & Ayurveda", subtitle: "Best seller x 5 en francophonie", status: "available", price: "34.99 CAD", reviews: "21 avis",
              cover: "https://storage.googleapis.com/inspirata/Livres/nature%20ayurveda%20front.jpg",
              shortDesc: "Si l’Ayurveda était un livre, il se nommerait Nature & Ayurveda!\nProfesseurs de yoga, ceci est votre livre de référence!",
              features: ["Vegan", "Ingrédients authentiques", "Eco-responsable"],
              longDesc: "Ce livre est bien plus qu’un guide : c’est un voyage vers l’équilibre.\nIl aborde les fondements de l'Ayurveda avec simplicité et profondeur, offrant des recettes, des rituels et une compréhension nouvelle de la nature.",
              conclusion: "Nature & Ayurveda est le guide essentiel pour vivre une vie plus équilibrée.",
              detailedReviews: [
                  { user: "Marie-Claude", text: "Une révélation! Ce livre a changé ma routine quotidienne. Les photos sont magnifiques.", rating: 5 },
                  { user: "Sophie L.", text: "Le guide que j'attendais. Simple, accessible et tellement beau.", rating: 5 },
                  { user: "Isabelle G.", text: "Un bijou à offrir et à s'offrir. Krystine transmet sa passion avec cœur.", rating: 5 }
              ]
            }, 
            { 
              title: "Féminité & Ayurveda", fullTitle: "Livre Féminité & Ayurveda", subtitle: "Best seller x 5 en francophonie", status: "available", price: "39.99 CAD", reviews: "25 avis",
              cover: "https://storage.googleapis.com/inspirata/Livres/feminite%20ayurveda%20front.jpg",
              shortDesc: "Si l’Ayurveda pouvait exprimer son lien avec le Féminin Sacré, il écrirait Féminité & Ayurveda.",
              features: ["Vegan", "Soutien Hormonal", "Bien-être Féminin"],
              longDesc: "Avez-vous déjà pensé que comprendre notre féminité nécessitait un manuel compliqué ?\nCe livre est une douce invitation à reconnecter avec votre corps, vos cycles et votre puissance intérieure.",
              conclusion: "Féminité & Ayurveda est le compagnon idéal pour toute femme.",
              previewPages: [
                  "https://storage.googleapis.com/inspirata/Livres/page%202%20fem.avif",
                  "https://storage.googleapis.com/inspirata/Livres/page%202.avif"
              ],
              detailedReviews: [
                  { user: "Julie P.", text: "Indispensable pour toutes les femmes. Une approche douce et bienveillante.", rating: 5 },
                  { user: "Chantal R.", text: "Merci Krystine pour ce partage de sagesse. Je me sens enfin comprise.", rating: 5 },
                  { user: "Nathalie B.", text: "Des rituels simples qui font une énorme différence sur mon bien-être.", rating: 5 }
              ]
            }, 
            { title: "Sagesse à venir", desc: "Prochainement", status: "locked" }
          ] 
        }, 
        blog: { title: "Le Blogue", subtitle: "Lectures et Réflexions" }, 
        default: { title: "Bientôt", items: [] } 
      } 
    },
    founder: { 
      bio: { 
        intro: "Dans un monde en accélération constante, il devient essentiel de ralentir. De revenir à ce qui soutient : le souffle, le corps, l’énergie vivante.", 
        p1: "Depuis plus de 35 ans, je tisse des rituels enracinés dans l’Ayurveda, les plantes, la respiration, et l’écoute intérieure.", 
        p2: "Ce travail ne suit pas les tendances. Il s’inscrit dans un art de vivre conscient.", 
        highlight: "Deux de mes livres ont été consacrés best-sellers.", 
        expert: "Infirmière d'urgence (10 ans)", 
        mission: "Je consacre ma vie à l’Art de vivre conscient.", 
        outro: "Bienvenue dans un espace pour reconnecter." 
      }, 
      stats: [
        { value: "35+", label: "Années d'Expérience", sub: "Santé Holistique" },
        { value: "2", label: "Francophonie", sub: "Best-Sellers" },
        { value: "3", label: "Santé La Vie", sub: "Saisons TV" },
        { value: "10", label: "Soins Critiques", sub: "Années" }
      ], 
      story: { 
        title: "L'HISTOIRE D'AMOUR", subtitle: "ENTRE KRYSTINE ST-LAURENT & L'AYURVEDA", 
        p1: "J’ai l’immense privilège de vivre au quotidien mon rêve de vie: me rebrancher à l’abondance et la sagesse infinie que porte la nature.", 
        p2: "C’est inspirée de l'histoire des premières infirmières arrivées en Amérique (les soeurs Augustines).", 
        p3: "Je crois profondément que notre corps est unique et qu’il est fait pour se régénérer.", 
        p4: "Imaginez une collectivité vibrante, vivante, consciente.", 
        p5: "Je souhaite vous accompagner dans ce chemin que propose l'Ayurveda: un retour vers soi." 
      }, 
      newsletter: { 
        title: "Ce n’est pas une infolettre.", subtitle: "C’est un fil de sagesse.", 
        intro: "Dans un monde qui change à chaque seconde… Ici, pas de tendance à suivre.", 
        list: ["Parfois : une méditation, un rituel", "Parfois : un extrait du prochain livre", "Parfois : un simple rappel"], 
        outro: "Pour celles et ceux qui ressentent un appel — même doux, même flou.", 
        formTitle: "Rester connecté·e", cta: "Rejoindre le fil" 
      }, 
      footerBio: { 
        title: "QUI EST KRYSTINE ST-LAURENT?", 
        text: "Krystine St-Laurent est une autrice best-seller, conférencière internationale et experte reconnue en Ayurveda." 
      }, 
      cta: "Réserver Krystine" 
    },
    booking: { 
      title: "Réserver Krystine pour votre évènement!", 
      bio: "Krystine St-Laurent est une experte reconnue en Ayurveda, santé holistique et art de vivre aligné.", 
      program: "Formée à l’international, autrice de livres à succès et conférencière recherchée.", 
      ritual: { 
        title: "Si votre corps réécrivait l'agenda de décembre?", 
        desc: "Rejoignez nous pour un 21 jours de rituels, simples, 5 à 10 minutes par jour!", 
        cta: "Je rejoins le mouvement", 
        kajabiLink: "https://kajabi.com/checkout-placeholder" 
      } 
    },
    footer: { contact: "Contact", newsletter: "Infolettre" }
  },
  EN: {
    cards: { 
      founder: { title: "Krystine St-Laurent", subtitle: "Discover", link: "#" }, 
      shop: { title: "Shop", subtitle: "Shop Now", link: "#", locations: "Sales Points" }, 
      ayurveda: { title: "Ayurveda", subtitle: "Explore", link: "#" }, 
      blog: { title: "Media", subtitle: "Explore our content", link: "#" } 
    },
    gem: { placeholder: "Tell me what you seek...", button: "Ask", thinking: "Connecting...", modalTitle: "Your Inspirata Guide" },
    guideBtn: "Let yourself be guided",
    toggle: "EN",
    ayurveda: { 
      whatIsTitle: "WHAT IS AYURVEDA?",
      whatIsText: "Sister science of Yoga, Ayurveda is a 5000-year-old ancestral wisdom that invites us to reconnect with nature's rhythms. It treats not just symptoms, but seeks to restore the unique harmony between body, mind, and spirit.",
      title: "Dosha Quiz", introTitle: "INSPIRATA AYURVEDA", introText: "Perhaps you've always thought you were unique... but do you know to what extent?", 
      desc: "Ayurveda considers that we are made of five elements – Space, Air, Fire, Water and Earth. Their combination gives rise to the three doshas: Vata, Pitta, and Kapha.", 
      quizPrompt: "Take the quiz to discover your current dominance based on your deep nature and current state.", 
      quizBtn: "Take Quiz", 
      resultsInfo: "Based on your result, discover Krystine's tips sent to you by email for:", 
      doshas: [{ name: "Vata", elements: "Wind & Space", action: "Ground, warm and soothe", definition: "Vata governs movement. It is dry, light, cold, rough, subtle and mobile.", color: "bg-gradient-to-br from-[#8F9779] to-[#4A5D23]", productRecom: "Vata Body Oil" }, { name: "Pitta", elements: "Fire & Water", action: "Cool, soothe and soften", definition: "Pitta governs digestion and metabolism. It is hot, sharp, light, liquid and oily.", color: "bg-gradient-to-br from-[#D98E73] to-[#BC4A3C]", productRecom: "Pitta Body Oil" }, { name: "Kapha", elements: "Water & Earth", action: "Activate and stimulate", definition: "Kapha governs structure and lubrication. It is heavy, cold, slow, unctuous, soft and static.", color: "bg-gradient-to-br from-[#4A7C9D] to-[#2F4F4F]", productRecom: "Kapha Body Oil" }], 
      footer: "Haven't received your result? Check your spam folder or contact our team: equipe@inspiratanature.com" 
    },
    backToHome: "Back to Home",
    featured: { back: "Back", hero: { title: "LIQUID SUNSHINE", subtitle: "WHOLE PLANT INFUSED OILS", cta: "DISCOVER OUR OILS" }, intro: { title: "LOCAL PLANT INFUSED BODY OILS", subtitle: "Hydrate + Soften + Activate", quote: "And when our body makes us feel it is time to act..." }, title: "Current Rituals", subtitle: "Essentials", 
      products: [{ name: "Vata Body Oil", price: "48.00 CAD", type: "Grounding & Serenity" }, { name: "Face Ritual", price: "85.00 CAD", type: "Natural Glow" }, { name: "Book: Nature & Ayurveda", price: "34.95 CAD", type: "Daily Wisdom" }] 
    },
    shop: { title: "Shop", subtitle: "Nature & Wellness", 
      products: [{ id: 1, title: "The Soothing Vata", price: "48.00 CAD", type: "Body Oil", image: ASSETS.productVata }, { id: 2, title: "The Refreshing Pitta", price: "48.00 CAD", type: "Body Oil", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }, { id: 3, title: "The Stimulating Kapha", price: "48.00 CAD", type: "Body Oil", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }, { id: 4, title: "Zen Nose", price: "28.00 CAD", type: "Specific Care", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }] 
    },
    locations: { title: "Collaborators", intro: "Each of our partners/distributors has been carefully chosen for their heart connection and their values.", 
      regions: [
        { name: "Eastern Townships", spots: [{ name: "Spa Eastman", address: "895 ch des Dilligences\nEastman, QC, J0E 1P0", tel: "1 800 665-5272", hours: "Mon-Sun: 7am - 10pm" }, { name: "Caroline Cazes", address: "1074 chemin de la Montagne\nOrford, QC, J1X 6X9", tel: "819-578-7707", hours: "By appointment only" }] }, 
        { name: "Quebec - Trois Rivières", spots: [{ name: "Monastère des Augustines", address: "77 rue des Remparts\nQuébec, QC , G1R 0C3", tel: "418 694-1639", hours: "Mon-Sun: 7am - 9pm" }] }
      ] 
    },
    media: { 
        title: "Media", subtitle: "Explore our content", back: "Back", 
        sections: [{id:'podcast',label:'Podcast',icon:'fa-microphone'},{id:'tv',label:'TV',icon:'fa-tv'},{id:'book',label:'Books',icon:'fa-book'},{id:'blog',label:'Blog',icon:'fa-pen-nib'}],
        details: { 
          podcast: { title: "Beyond Trends", subtitle: "The Inspirata Podcast", spotifyUrl: "https://open.spotify.com/embed/show/0cHEVMLF92tJxiO7MwyOKD?utm_source=generator", ctaLink: "https://open.spotify.com/show/0cHEVMLF92tJxiO7MwyOKD", points: ["Deep conversations, far from ambient noise.", "Practical keys inspired by living wisdom.", "A voice to regain energy and clarity."], newsletter: { title: "Stay Connected", subtitle: "( outside social media )", desc: "Receive every new Inspirata podcast episode directly by email.", button: "Subscribe" }, cta: "Listen to episodes", promo: "Discover Essential Rituals" }, 
          tv: { title: "TV Shows & Interviews", desc: "Our founder, hosting her show SANTÉ LA VIE for 3 seasons, has been invited to several platforms to discuss Ayurveda.", 
            videos: [
              { id: "v9uMfDmQ2YE", title: "Santé! La Vie!" },
              { id: "fxzVTt5RfBw", title: "Salut Bonjour" },
              { id: "8t1BfEk_2do", title: "François Lemay - Inspire toi" },
              { id: "wtQ_MEgkrVE", title: "Daniel Blouin" },
              { id: "ab-EEYQi7yM", title: "France Gauthier" },
              { id: "t3KNbXTyI5I", title: "Diva Yoga - Entrevue" },
              { id: "2KWQuUbhmsU", title: "Diva Yoga - Rituel" }
            ] 
          }, 
          book: { title: "Our Books", 
            items: [
              { 
                title: "Nature & Ayurveda", fullTitle: "Nature & Ayurveda Book", subtitle: "Best seller x 5 in Francophonie", status: "available", price: "34.99 CAD", reviews: "21 reviews", 
                cover: "https://storage.googleapis.com/inspirata/Livres/nature%20ayurveda%20front.jpg", 
                shortDesc: "If Ayurveda were a book, it would be named Nature & Ayurveda! Yoga teachers, this is your reference book!", 
                features: ["Vegan", "Authentic Ingredients", "Eco-friendly"], 
                longDesc: "This book is much more than a guide: it is a journey towards balance.\nIt covers the foundations of Ayurveda with simplicity and depth.", 
                conclusion: "Nature & Ayurveda is the essential guide to living a more balanced life.",
                detailedReviews: [
                  { user: "Marie-Claude", text: "A revelation! This book changed my daily routine.", rating: 5 },
                  { user: "Sophie L.", text: "The guide I was waiting for. Simple, accessible and beautiful.", rating: 5 },
                  { user: "Isabelle G.", text: "A jewel to offer and to treat yourself.", rating: 5 }
                ]
              }, 
              { 
                title: "Femininity & Ayurveda", fullTitle: "Femininity & Ayurveda Book", subtitle: "Best seller x 5 in Francophonie", status: "available", price: "39.99 CAD", reviews: "25 reviews", 
                cover: "https://storage.googleapis.com/inspirata/Livres/feminite%20ayurveda%20front.jpg", 
                shortDesc: "If Ayurveda could express its link with the Sacred Feminine, it would write Femininity & Ayurveda.", 
                features: ["Vegan", "Hormonal Support", "Feminine Well-being"], 
                longDesc: "Have you ever thought that understanding our femininity required a complicated manual?", 
                conclusion: "Femininity & Ayurveda is the ideal companion for every woman.",
                previewPages: [
                  "https://storage.googleapis.com/inspirata/Livres/page%202%20fem.avif",
                  "https://storage.googleapis.com/inspirata/Livres/page%202.avif"
                ],
                detailedReviews: [
                  { user: "Julie P.", text: "Essential for all women. A gentle approach.", rating: 5 },
                  { user: "Chantal R.", text: "Thank you Krystine for this shared wisdom.", rating: 5 },
                  { user: "Nathalie B.", text: "Simple rituals that make a huge difference.", rating: 5 }
                ]
              }, 
              { title: "Wisdom to come", desc: "Coming Soon", status: "locked" }
            ] 
          }, 
          blog: { title: "The Blog", subtitle: "Readings and Reflections" }, 
          default: { title: "Coming Soon", items: [] } 
        } 
    },
    founder: { 
      bio: { intro: "In a world of constant acceleration, it becomes essential to slow down. To return to what supports: breath, body, living energy.", p1: "For more than 35 years, I have been weaving rituals rooted in Ayurveda, plants, breathing, and inner listening.", p2: "This work does not follow trends. It is part of a conscious art of living.", highlight: "Two of my books have been best-sellers.", expert: "Emergency Nurse (10 years)", mission: "I dedicate my life to the Art of Conscious Living.", outro: "Welcome to a space to reconnect." }, 
      stats: [{ value: "35+", label: "Years of Experience", sub: "Holistic Health" }, { value: "2", label: "Francophonie", sub: "Best-Sellers" }, { value: "3", label: "Santé La Vie", sub: "TV Seasons" }, { value: "10", label: "Critical Care", sub: "Years" }], 
      story: { title: "THE LOVE STORY", subtitle: "BETWEEN KRYSTINE ST-LAURENT & AYURVEDA", p1: "I have the immense privilege of living my dream life daily: reconnecting with the abundance and infinite wisdom that nature carries.", p2: "It is inspired by the history of the first nurses who arrived in America (the Augustinian sisters).", p3: "I deeply believe that our body is unique and that it is made to regenerate itself.", p4: "Imagine a vibrant, alive, conscious community.", p5: "I wish to accompany you on this path that Ayurveda proposes: a return to oneself." }, 
      newsletter: { title: "It's not a newsletter.", subtitle: "It's a thread of wisdom.", intro: "In a world that changes every second... Here, no trends to follow.", list: ["Sometimes: a meditation, a ritual", "Sometimes: an excerpt from the next book", "Sometimes: a simple reminder"], outro: "For those who feel a call — even soft, even blurry.", formTitle: "Stay Connected", cta: "Join the thread" }, 
      footerBio: { title: "WHO IS KRYSTINE ST-LAURENT?", text: "Krystine St-Laurent is a best-selling author, international speaker, and recognized expert in Ayurveda." }, 
      cta: "Book Krystine" 
    },
    booking: { title: "Book Krystine for your event!", bio: "Krystine St-Laurent is a recognized expert in Ayurveda, holistic health, and aligned living.", program: "Internationally trained, best-selling author, and sought-after speaker.", ritual: { title: "If your body rewrote December's agenda?", desc: "Join us for 21 days of rituals, simple, 5 to 10 minutes a day!", cta: "I join the movement", kajabiLink: "https://kajabi.com/checkout-placeholder" } },
    footer: { contact: "Contact", newsletter: "Newsletter" }
  },
  ES: {
    cards: { 
      founder: { title: "Krystine St-Laurent", subtitle: "Descubrir", link: "#" }, 
      shop: { title: "Tienda", subtitle: "Comprar", link: "#", locations: "Puntos de Venta" }, 
      ayurveda: { title: "Ayurveda", subtitle: "Explorar", link: "#" }, 
      blog: { title: "Medios", subtitle: "Explorar contenido", link: "#" } 
    },
    gem: { placeholder: "Dime qué buscas...", button: "Preguntar", thinking: "Conectando...", modalTitle: "Tu Guía Inspirata" }, 
    guideBtn: "Déjate guiar", toggle: "ES", backToHome: "Volver al Inicio",
    featured: { 
        back: "Volver", 
        hero: { title: "RAYOS DE SOL LÍQUIDO", subtitle: "ACEITES INFUSIONADOS", cta: "DESCUBRE ACEITES" }, 
        intro: { title: "ACEITES CORPORALES LOCALES", subtitle: "Hidrata + Suaviza + Activa", quote: "Y cuando nuestro cuerpo nos hace sentir que es hora de actuar..." }, 
        title: "Rituales del Momento", subtitle: "Esenciales",
        products: [{ name: "Aceite Corporal Vata", price: "48.00 CAD", type: "Enraizamiento y Serenidad" }, { name: "Ritual Facial", price: "85.00 CAD", type: "Brillo Natural" }, { name: "Libro: Naturaleza y Ayurveda", price: "34.95 CAD", type: "Sabiduría Diaria" }]
    },
    shop: { 
        title: "Tienda", subtitle: "Naturaleza y Bienestar",
        products: [{ id: 1, title: "La Calmante Vata", price: "48.00 CAD", type: "Aceite Corporal", image: ASSETS.productVata }, { id: 2, title: "La Refrescante Pitta", price: "48.00 CAD", type: "Aceite Corporal", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }, { id: 3, title: "La Estimulante Kapha", price: "48.00 CAD", type: "Aceite Corporal", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }, { id: 4, title: "Nariz Zen", price: "28.00 CAD", type: "Cuidado Específico", image: "https://storage.googleapis.com/inspirata/products/dosha-oils-group.webp" }]
    }, 
    locations: { 
        title: "Colaboradores", intro: "Socios elegidos con el corazón y sus valores para compartir los beneficios de nuestros productos conscientes INSPIRATA AYURVEDA.",
        regions: [
            { name: "Cantons de l'Est", spots: [{ name: "Spa Eastman", address: "895 ch des Dilligences\nEastman, QC, J0E 1P0", tel: "1 800 665-5272", hours: "Lun-Dom: 7h00 - 22h00" }, { name: "Caroline Cazes", address: "1074 chemin de la Montagne\nOrford, QC, J1X 6X9", tel: "819-578-7707", hours: "Solo con cita previa" }] },
            { name: "Québec - Trois Rivières", spots: [{ name: "Monastère des Augustines", address: "77 rue des Remparts\nQuébec, QC , G1R 0C3", tel: "418 694-1639", hours: "Lun-Dom: 7h - 21h" }] }
        ]
    },
    media: { 
        title: "Medios", subtitle: "Explora contenido", back: "Volver", 
        sections: [{id:'podcast',label:'Pódcast',icon:'fa-microphone'},{id:'tv',label:'TV',icon:'fa-tv'},{id:'book',label:'Libros',icon:'fa-book'},{id:'blog',label:'Blog',icon:'fa-pen-nib'}], 
        details: { 
            default: { title: "Próximamente", items: [] }, 
            podcast: { title: "Más allá de las tendencias", subtitle: "El Pódcast Inspirata", cta: "Escuchar episodios", spotifyUrl: "https://open.spotify.com/embed/show/0cHEVMLF92tJxiO7MwyOKD?utm_source=generator", ctaLink: "https://open.spotify.com/show/0cHEVMLF92tJxiO7MwyOKD", points: ["Conversaciones profundas.", "Claves prácticas de sabiduría.", "Una voz para recuperar energía."], newsletter: { title: "Mantente conectado", subtitle: "( fuera de redes )", desc: "Recibe cada nuevo episodio.", button: "Suscribirse" }, promo: "Descubrir Rituales" }, 
            tv: { title: "Programas y Entrevistas", desc: "Nuestra fundadora en SANTÉ LA VIE y otras plataformas.", videos: [{ id: "v9uMfDmQ2YE", title: "Santé! La Vie!" }, { id: "fxzVTt5RfBw", title: "Salut Bonjour" }, { id: "8t1BfEk_2do", title: "François Lemay" }, { id: "wtQ_MEgkrVE", title: "Daniel Blouin" }, { id: "ab-EEYQi7yM", title: "France Gauthier" }, { id: "t3KNbXTyI5I", title: "Diva Yoga - Entrevue" }, { id: "2KWQuUbhmsU", title: "Diva Yoga - Rituel" }] }, 
            book: { 
                title: "Nuestros Libros",
                items: [{ title: "Naturaleza y Ayurveda", fullTitle: "Libro Naturaleza y Ayurveda", subtitle: "Best seller x 5 en Francofonía", status: "available", price: "34.99 CAD", reviews: "21 reseñas", cover: "https://storage.googleapis.com/inspirata/Livres/nature%20ayurveda%20front.jpg", shortDesc: "¡Si el Ayurveda fuera un libro, se llamaría Naturaleza y Ayurveda!", features: ["Vegano", "Ingredientes Auténticos", "Eco-responsable"], longDesc: "Este libro es más que una guía: es un viaje hacia el equilibrio.", conclusion: "La guía esencial para una vida equilibrada." }, { title: "Feminidad y Ayurveda", fullTitle: "Libro Feminidad y Ayurveda", subtitle: "Best seller x 5", status: "available", price: "39.99 CAD", reviews: "25 reseñas", cover: "https://storage.googleapis.com/inspirata/Livres/feminite%20ayurveda%20front.jpg", shortDesc: "Si el Ayurveda pudiera expresar su vínculo con lo Femenino Sagrado.", features: ["Vegano", "Apoyo Hormonal", "Bienestar Femenino"], longDesc: "¿Alguna vez pensaste que entender nuestra feminidad requería un manual?", conclusion: "El compañero ideal para toda mujer.", previewPages: ["https://storage.googleapis.com/inspirata/Livres/page%202%20fem.avif", "https://storage.googleapis.com/inspirata/Livres/page%202.avif"] }, { title: "Sabiduría futura", desc: "Próximamente", status: "locked" }]
            }, 
            blog: { title: "El Blog", subtitle: "Lecturas y Reflexiones" } 
        } 
    },
    founder: { 
        bio: { 
            intro: "En un mundo acelerado, es esencial reducir la velocidad. Volver a lo que sostiene: la respiración, el cuerpo, la energía viva.", 
            p1: "Desde hace más de 35 años, tejo rituales arraigados en el Ayurveda, las plantas y la escucha interior.", 
            p2: "Este trabajo no sigue tendencias. Es parte de un arte de vivir consciente.", 
            highlight: "Dos de mis libros han sido best-sellers.", 
            expert: "Enfermera de urgencias (10 años)", 
            mission: "Dedico mi vida al Arte de Vivir Consciente.", 
            outro: "Bienvenido a un espacio para reconectar." 
        }, 
        stats: [{ value: "35+", label: "Años de Experiencia", sub: "Salud Holística" }, { value: "2", label: "Francofonía", sub: "Best-Sellers" }, { value: "3", label: "Santé La Vie", sub: "Temporadas TV" }, { value: "10", label: "Cuidados Críticos", sub: "Años" }], 
        story: { 
            title: "LA HISTORIA DE AMOR", subtitle: "ENTRE KRYSTINE ST-LAURENT Y EL AYURVEDA",
            p1: "Tengo el inmenso privilegio de vivir mi sueño diario: reconectarme con la abundancia y la sabiduría infinita de la naturaleza.",
            p2: "Inspirada en la historia de las primeras enfermeras en América (las hermanas Agustinas).",
            p3: "Creo profundamente que nuestro cuerpo es único y está hecho para regenerarse.",
            p4: "Imagina una comunidad vibrante, viva y consciente.",
            p5: "Deseo acompañarte en este camino que propone el Ayurveda: un regreso a uno mismo."
        }, 
        newsletter: { title: "No es un boletín.", subtitle: "Es un hilo de sabiduría.", intro: "En un mundo que cambia cada segundo... Aquí no hay tendencias.", list: ["A veces: una meditación", "A veces: un extracto de libro", "A veces: un simple rappel"], outro: "Para aquellos que sienten un llamado.", formTitle: "Mantente conectado", cta: "Únete al hilo" }, 
        footerBio: { title: "¿QUIÉN ES KRYSTINE?", text: "Autora best-seller, conferencista internacional y experta en Ayurveda." }, 
        cta: "Reservar a Krystine" 
    },
    booking: { title: "¡Reserva a Krystine para tu evento!", bio: "Krystine St-Laurent es una experte reconocida en Ayurveda, salud holística y vida alineada.", program: "Formada internacionalmente, autora de éxitos de ventas y conferencista solicitada.", ritual: { title: "¿Si tu cuerpo reescribiera la agenda de diciembre?", desc: "¡Únete a nosotros para 21 días de rituales, simples, 5 a 10 minutos al día!", cta: "Me uno al movimiento", kajabiLink: "https://kajabi.com/checkout-placeholder" } }, 
    footer: { contact: "Contacto", newsletter: "Boletín" },
    ayurveda: { 
        whatIsTitle: "¿QUÉ ES AYURVEDA?", 
        whatIsText: "Ciencia hermana del Yoga, el Ayurveda es una sabiduría ancestral de 5000 años que nos invita a reconectar con los ritmos de la naturaleza. No solo trata los síntomas, mais cherche à rétablir l'harmonie unique entre le corps, l'âme et l'esprit.", 
        title: "Cuestionario Dosha", introTitle: "INSPIRATA AYURVEDA", introText: "¿Quizás siempre pensaste que eras único... pero sabes hasta qué punto?", 
        desc: "El Ayurveda considera que estamos hechos de cinco elementos: Espacio, Aire, Fuego, Agua y Tierra. Su combinación da lugar a los tres doshas: Vata, Pitta y Kapha.", 
        quizPrompt: "Haz el cuestionario para descubrir tu dominio actual basado en tu naturaleza profunda.", 
        quizBtn: "Hacer Cuestionario", 
        resultsInfo: "Según tu resultado, descubre los consejos de Krystine:", 
        doshas: [{ name: "Vata", elements: "Viento y Espacio", action: "Enraizar, calentar y calmar", definition: "Vata gobierna el movimiento. Es seco, ligero, frío, áspero, sutil y móvil.", color: "bg-gradient-to-br from-[#8F9779] to-[#4A5D23]", productRecom: "Aceite Corporal Vata" }, { name: "Pitta", elements: "Fuego y Agua", action: "Refrescar, calmar y suavizar", definition: "Pitta gobierna la digestión. Es caliente, agudo, ligero, líquido y aceitoso.", color: "bg-gradient-to-br from-[#D98E73] to-[#BC4A3C]", productRecom: "Aceite Corporal Pitta" }, { name: "Kapha", elements: "Agua y Tierra", action: "Activar y estimular", definition: "Kapha gobierna la estructura. Es pesado, frío, lento, untuoso, suave y estático.", color: "bg-gradient-to-br from-[#4A7C9D] to-[#2F4F4F]", productRecom: "Aceite Corporal Kapha" }] 
    }
  },
  NL: {
    cards: { founder: { title: "Krystine St-Laurent", subtitle: "Ontdekken", link: "#" }, shop: { title: "Winkel", subtitle: "Winkelen", link: "#", locations: "Verkooppunten" }, ayurveda: { title: "Ayurveda", subtitle: "Verkennen", link: "#" }, blog: { title: "Media", subtitle: "Verken inhoud", link: "#" } },
    gem: { placeholder: "Vertel me wat je zoekt...", button: "Vragen", thinking: "Verbinden...", modalTitle: "Jouw Inspirata Gids" }, guideBtn: "Laat je leiden", toggle: "NL", backToHome: "Terug naar Home",
    featured: { back: "Terug", hero: { title: "VLOEIBARE ZONNESCHIJN", subtitle: "GEINFUSEERDE OLIËN", cta: "ONTDEK OLIËN" }, intro: { title: "LOKALE PLANTEN OLIËN", subtitle: "Hydrateert + Verzacht + Activeert", quote: "En wanneer ons lichaam ons laat voelen dat het tijd is..." }, title: "Huidige Ritualen", subtitle: "Essentiëlen" },
    shop: { title: "Winkel", subtitle: "Natuur & Welzijn" }, locations: { title: "Samenwerkingen", intro: "Partners gekozen met het hart." },
    media: { title: "Media", subtitle: "Verken onze inhoud", back: "Terug", sections: [{id:'podcast',label:'Podcast',icon:'fa-microphone'},{id:'tv',label:'TV',icon:'fa-tv'},{id:'book',label:'Boeken',icon:'fa-book'},{id:'blog',label:'Blog',icon:'fa-pen-nib'}], details: { default: { title: "Binnenkort", items: [] }, podcast: { title: "Voorbij Trends", subtitle: "De Inspirata Podcast", cta: "Luister afleveringen" }, tv: { title: "TV Shows & Interviews", desc: "Onze oprichter in SANTÉ LA VIE." }, book: { title: "Onze Boeken" }, blog: { title: "De Blog", subtitle: "Lezingen en Reflecties" } } },
    founder: { bio: { intro: "In een snelle wereld is vertragen essentieel.", expert: "Spoedeisende Hulp (10 jaar)", mission: "Ik wijd mijn leven aan Bewust Leven.", outro: "Welkom in een ruimte om te verbinden." }, stats: [{ value: "35+", label: "Jaren Ervaring", sub: "Holistische Gezondheid" }, { value: "2", label: "Francofonie", sub: "Best-Sellers" }], story: { title: "HET LIEFDESVERHAAL", subtitle: "TUSSEN KRYSTINE & AYURVEDA" }, newsletter: { title: "Geen nieuwsbrief.", subtitle: "Een draad van wijsheid.", formTitle: "Blijf verbonden", cta: "Doe mee" }, footerBio: { title: "WIE IS KRYSTINE?", text: "Best-selling auteur en Ayurveda expert." }, cta: "Boek Krystine" },
    booking: { title: "Boek Krystine!", bio: "Expert in Ayurveda en holistische gezondheid.", ritual: { title: "Als je lichaam de agenda herschreef?", desc: "Doe mee met 21 dagen rituelen!", cta: "Ik doe mee" } }, footer: { contact: "Contact", newsletter: "Nieuwsbrief" },
    ayurveda: { whatIsTitle: "WAT IS AYURVEDA?", whatIsText: "Zusterwetenschap van Yoga, 5000 jaar oude wijsheid.", title: "Dosha Quiz", introTitle: "INSPIRATA AYURVEDA", introText: "Misschien dacht je altijd al dat je uniek was?", desc: "Ayurveda beschouwt ons als gemaakt van vijf elementen.", quizPrompt: "Doe de quiz om je dominantie te ontdekken.", quizBtn: "Doe de Quiz", resultsInfo: "Ontdek tips op basis van je resultaat:", doshas: [{ name: "Vata", elements: "Wind & Ruimte", action: "Aarden en verwarmen" }, { name: "Pitta", elements: "Vuur & Water", action: "Verkoelen en verzachten" }, { name: "Kapha", elements: "Water & Aarde", action: "Activeren en stimuleren" }] }
  },
  RU: {
    cards: { founder: { title: "Кристин Сен-Лоран", subtitle: "Узнать", link: "#" }, shop: { title: "Бутик", subtitle: "Магазин", link: "#", locations: "Точки продаж" }, ayurveda: { title: "Аюрведа", subtitle: "Исследовать", link: "#" }, blog: { title: "Медиа", subtitle: "Контент", link: "#" } },
    gem: { placeholder: "Скажите, что вы ищете...", button: "Спросить", thinking: "Соединение...", modalTitle: "Ваш гид Inspirata" }, guideBtn: "Позвольте вести вас", toggle: "RU", backToHome: "На главную",
    featured: { back: "Назад", hero: { title: "ЖИДКОЕ СОЛНЦЕ", subtitle: "МАСЛА НА ТРАВАХ", cta: "ОТКРЫТЬ МАСЛА" }, intro: { title: "МЕСТНЫЕ РАСТИТЕЛЬНЫЕ МАСЛА", subtitle: "Увлажнение + Мягкость + Активность", quote: "И когда наше тело дает понять, что пора действовать..." }, title: "Ритуалы момента", subtitle: "Главное" },
    shop: { title: "Бутик", subtitle: "Природа и Благополучие" }, locations: { title: "Партнеры", intro: "Партнеры, выбранные сердцем." },
    media: { title: "Медиа", subtitle: "Наш контент", back: "Назад", sections: [{id:'podcast',label:'Подкаст',icon:'fa-microphone'},{id:'tv',label:'ТВ',icon:'fa-tv'},{id:'book',label:'Книги',icon:'fa-book'},{id:'blog',label:'Блог',icon:'fa-pen-nib'}], details: { default: { title: "Скоро", items: [] }, podcast: { title: "Вне трендов", subtitle: "Подкаст Inspirata", cta: "Слушать эпизоды" }, tv: { title: "ТВ Шоу и Интервью", desc: "Наша основательница в SANTÉ LA VIE." }, book: { title: "Наши Книги" }, blog: { title: "Блог", subtitle: "Чтение и Размышления" } } },
    founder: { bio: { intro: "В быстром мире важно замедлиться.", expert: "Медсестра (10 лет)", mission: "Посвящаю жизнь Осознанности.", outro: "Добро пожаловать в пространство для воссоединения." }, stats: [{ value: "35+", label: "Лет Опыта", sub: "Холистическое Здоровье" }, { value: "2", label: "Бестселлера", sub: "Книги" }], story: { title: "ИСТОРИЯ ЛЮБВИ", subtitle: "МЕЖДУ КРИСТИН И АЮРВЕДОЙ" }, newsletter: { title: "Не рассылка.", subtitle: "Нить мудрости.", formTitle: "Быть на связи", cta: "Присоединиться" }, footerBio: { title: "КТО ТАКАЯ КРИСТИН?", text: "Автор бестселлеров и эксперт по Аюрведе." }, cta: "Заказать Кристин" },
    booking: { title: "Заказать мероприятие!", bio: "Эксперт по Аюрведе и холистическому здоровью.", ritual: { title: "Если тело перепишет календарь?", desc: "Присоединяйтесь к 21 дню ритуалов!", cta: "Я присоединяюсь" } }, footer: { contact: "Контакты", newsletter: "Рассылка" },
    ayurveda: { whatIsTitle: "ЧТО ТАКОЕ АЮРВЕДА?", whatIsText: "Сестринская наука Йоги, мудрость 5000 лет.", title: "Доша Тест", introTitle: "INSPIRATA AYURVEDA", introText: "Может, вы всегда знали, что уникальны?", desc: "Аюрведа считает, что мы состоим из пяти элементов.", quizPrompt: "Пройдите тест, чтобы узнать свою дошу.", quizBtn: "Пройти Тест", resultsInfo: "Узнайте советы по результатам:", doshas: [{ name: "Вата", elements: "Ветер и Пространство", action: "Заземлять и согревать" }, { name: "Питта", elements: "Огонь и Вода", action: "Охлаждать и смягчать" }, { name: "Капха", elements: "Вода и Земля", action: "Активировать и стимулировать" }] }
  },
  PT: {
    cards: { founder: { title: "Krystine St-Laurent", subtitle: "Descubrir", link: "#" }, shop: { title: "Loja", subtitle: "Comprar", link: "#", locations: "Pontos de Venda" }, ayurveda: { title: "Ayurveda", subtitle: "Explorar", link: "#" }, blog: { title: "Mídia", subtitle: "Explorar conteúdo", link: "#" } },
    gem: { placeholder: "Diga-me o que procura...", button: "Perguntar", thinking: "Conectando...", modalTitle: "Seu Guia Inspirata" }, guideBtn: "Deixe-se guiar", toggle: "PT", backToHome: "Voltar ao Início",
    featured: { back: "Voltar", hero: { title: "RAIOS DE SOL LÍQUIDO", subtitle: "ÓLEOS INFUSIONADOS", cta: "DESCUBRA ÓLEOS" }, intro: { title: "ÓLEOS CORPORAIS LOCAIS", subtitle: "Hidrata + Suaviza + Ativa", quote: "E quando nosso corpo nos faz sentir que é hora..." }, title: "Rituels do Momento", subtitle: "Essenciais" },
    shop: { title: "Loja", subtitle: "Natureza e Bem-estar" }, locations: { title: "Colaboradores", intro: "Parceiros escolhidos com o coração." },
    media: { title: "Mídia", subtitle: "Explorar conteúdo", back: "Voltar", sections: [{id:'podcast',label:'Podcast',icon:'fa-microphone'},{id:'tv',label:'TV',icon:'fa-tv'},{id:'book',label:'Livros',icon:'fa-book'},{id:'blog',label:'Blog',icon:'fa-pen-nib'}], details: { default: { title: "Em breve", items: [] }, podcast: { title: "Além das Tendências", subtitle: "O Podcast Inspirata", cta: "Ouvir episódios" }, tv: { title: "Programas e Entrevistas", desc: "Nossa fundadora no SANTÉ LA VIE." }, book: { title: "Nossos Livros" }, blog: { title: "O Blog", subtitle: "Leituras e Reflexões" } } },
    founder: { bio: { intro: "Em um mundo acelerado, é essencial desacelerar.", expert: "Enfermeira de emergência (10 anos)", mission: "Dedico minha vida à Arte de Viver Consciente.", outro: "Bem-vindo a um espaço para reconectar." }, stats: [{ value: "35+", label: "Anos de Experiência", sub: "Saúde Holística" }, { value: "2", label: "Francofonia", sub: "Best-Sellers" }], story: { title: "A HISTÓRIA DE AMOR", subtitle: "ENTRE KRYSTINE & AYURVEDA" }, newsletter: { title: "Não é uma newsletter.", subtitle: "É um fio de sabedoria.", formTitle: "Mantenha-se conectado", cta: "Junte-se ao fio" }, footerBio: { title: "QUEM É KRYSTINE?", text: "Autora best-seller e especialista em Ayurveda." }, cta: "Reservar Krystine" },
    booking: { title: "Reserve Krystine!", bio: "Especialista em Ayurveda e saúde holística.", ritual: { title: "Se seu corpo reescrevesse a agenda?", desc: "Junte-se a 21 dias de rituais!", cta: "Eu me junto" } }, footer: { contact: "Contato", newsletter: "Newsletter" },
    ayurveda: { whatIsTitle: "O QUE É AYURVEDA?", whatIsText: "Ciência irmã do Yoga, sabedoria de 5000 anos.", title: "Quiz Dosha", introTitle: "INSPIRATA AYURVEDA", introText: "Talvez você sempre pensou que era único?", desc: "Ayurveda considera que somos feitos de cinco elementos.", quizPrompt: "Faça o quiz para descobrir sua dominância.", quizBtn: "Fazer Quiz", resultsInfo: "Descubra dicas com base no seu resultado:", doshas: [{ name: "Vata", elements: "Vento e Espaço", action: "Enraizar e aquecer" }, { name: "Pitta", elements: "Fogo e Água", action: "Resfriar e suavizar" }, { name: "Kapha", elements: "Água e Terra", action: "Ativar e estimular" }] }
  }
};

const App = () => {
  const [lang, setLang] = useState('FR');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [view, setView] = useState('HOME');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [gemQuery, setGemQuery] = useState('');
  const [gemResult, setGemResult] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [theme, setTheme] = useState('light');
  
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  // Blog State
  const [blogPosts, setBlogPosts] = useState(INITIAL_BLOG_POSTS);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [activeVideoId, setActiveVideoId] = useState(null);

  // Share State
  const [shareModal, setShareModal] = useState({ open: false, item: null, text: '', image: '' });
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  
  // Book Animation State
  const [bookOpen, setBookOpen] = useState(false);

  // Ayurveda State
  const [selectedDosha, setSelectedDosha] = useState(null);
  const [quizState, setQuizState] = useState({
      isOpen: false, step: 0, scores: { vata: 0, pitta: 0, kapha: 0 },
      formData: { firstName: '', lastName: '', email: '' }, result: null
  });

  const audioRef = useRef(null);
  const dropAudioRef = useRef(null);
  const containerRef = useRef(null);
  const introRef = useRef(null);
  const dropRef = useRef(null);
  const logoHeroRef = useRef(null);
  const navLogoRef = useRef(null);
  const mediaExpandRef = useRef(null);
  
  const getContent = () => {
      const base = CONTENT[lang] || CONTENT.FR;
      // Fallback for missing data in other languages to avoid crashes
      const safe = { ...CONTENT.FR, ...base };
      safe.cards = { ...CONTENT.FR.cards, ...base.cards };
      safe.shop = { ...CONTENT.FR.shop, ...base.shop, products: (base.shop?.products || CONTENT.FR.shop.products) };
      safe.media = { ...CONTENT.FR.media, ...base.media, details: { ...CONTENT.FR.media.details, ...base.media?.details } };
      // Ensure arrays like videos are populated in fallback if missing
      if (safe.media.details.tv) {
          safe.media.details.tv.videos = base.media?.details?.tv?.videos || CONTENT.FR.media.details.tv.videos;
      }
      if (safe.media.details.book) {
          safe.media.details.book.items = base.media?.details?.book?.items || CONTENT.FR.media.details.book.items;
      }
      safe.locations = { ...CONTENT.FR.locations, ...base.locations, regions: (base.locations?.regions || CONTENT.FR.locations.regions) };
      safe.featured = { ...CONTENT.FR.featured, ...base.featured, products: (base.featured?.products || CONTENT.FR.featured.products) };
      safe.founder = { ...CONTENT.FR.founder, ...base.founder, stats: (base.founder?.stats || CONTENT.FR.founder.stats) };
      safe.ayurveda = { ...CONTENT.FR.ayurveda, ...base.ayurveda, doshas: (base.ayurveda?.doshas || CONTENT.FR.ayurveda.doshas) };
      safe.booking = { ...CONTENT.FR.booking, ...base.booking };
      return safe;
  }
  const text = getContent();

  const changeLanguage = (newLang) => {
      setLang(newLang);
      setLangMenuOpen(false);
  };
  
  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  useEffect(() => {
      if (theme === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [theme]);

  const addToCart = (product, e) => {
      if(e) { e.preventDefault(); e.stopPropagation(); }
      setCartItems([...cartItems, product]);
      setCartOpen(true);
  };

  const removeFromCart = (index) => {
      const newItems = [...cartItems];
      newItems.splice(index, 1);
      setCartItems(newItems);
  };

  const cartTotal = cartItems.reduce((acc, item) => {
      const price = parseFloat(item.price?.replace(/[^\d.]/g, '') || '0');
      return acc + price;
  }, 0).toFixed(2);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      gsap.to(audioRef.current, { volume: 0, duration: 1, onComplete: () => { audioRef.current?.pause(); setAudioPlaying(false); }});
    } else {
      audioRef.current.volume = 0;
      audioRef.current.play().catch(e => console.log("Audio autoplay block:", e));
      gsap.to(audioRef.current, { volume: 0.4, duration: 3 });
      setAudioPlaying(true);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          gsap.to(audioRef.current, { volume: 0.4, duration: 3 });
          setAudioPlaying(true);
        }).catch(() => {
          const enableAudio = () => {
            if (audioRef.current) {
              audioRef.current.play();
              gsap.to(audioRef.current, { volume: 0.4, duration: 3 });
              setAudioPlaying(true);
            }
            document.removeEventListener('click', enableAudio);
          };
          document.addEventListener('click', enableAudio);
        });
      }
    }
  }, []);

  const handleAdminLogin = () => {
      if (adminPassword === 'peterjackson1') {
          setIsAdmin(true);
          setShowAdminLogin(false);
          setAdminPassword('');
      } else {
          alert("Mot de passe incorrect");
      }
  };

  const handleShareClick = async (item, e) => {
      e.stopPropagation();
      e.preventDefault();
      
      const imageUrl = item.image || item.cover || (item.images && item.images[0]) || ASSETS.logo;
      setShareModal({ open: true, item: item, text: 'Generating...', image: imageUrl });
      setIsGeneratingShare(true);

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Write a short, engaging social media caption for a product or post titled "${item.title || item.name}". 
        Type: ${item.type || item.subtitle || 'Wellness'}. 
        Language: ${lang}. 
        Include 3-5 relevant hashtags. 
        Tone: Inspiring, calm, ayurvedic.`;
        
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        setShareModal(prev => ({ ...prev, text: response.text }));
      } catch (error) {
        setShareModal(prev => ({ ...prev, text: `Check out ${item.title || item.name}! #Inspirata #Ayurveda` }));
      } finally {
        setIsGeneratingShare(false);
      }
  };

  const handleFacebookShare = () => {
      navigator.clipboard.writeText(shareModal.text);
      let shareUrl = shareModal.image;
      if (!shareUrl || shareUrl.startsWith('data:')) {
          shareUrl = window.location.href; 
      }
      const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareModal.text)}`;
      window.open(fbUrl, 'facebook-share-dialog', 'width=800,height=600');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files).slice(0, 2); 
          Promise.all(files.map(file => {
              return new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(file as Blob);
              });
          })).then(images => {
              setNewPostImages(images);
          });
      }
  };

  const handleAddPost = () => {
      if(!newPostTitle || !newPostContent) return;
      const newPost = {
          id: Date.now(), title: newPostTitle, subtitle: "Nouvel Article",
          date: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
          coverStyle: "bg-gradient-to-br from-royal to-gold", images: newPostImages,
          content: `<h3 class="font-serif text-2xl mb-4 italic text-gold">${newPostTitle}</h3><div class="prose prose-royal">${newPostContent.replace(/\n/g, '<br/>')}</div>`
      };
      setBlogPosts([newPost, ...blogPosts]);
      setIsAddingPost(false); setNewPostTitle(''); setNewPostContent(''); setNewPostImages([]);
  };

  const handleDeletePost = (id, e) => {
      e.stopPropagation();
      if(confirm("Êtes-vous sûr de vouloir supprimer cet article ?")) {
          setBlogPosts(blogPosts.filter(post => post.id !== id));
      }
  }

  const handleQuizStart = () => {
      setQuizState({ isOpen: true, step: 0, scores: { vata: 0, pitta: 0, kapha: 0 }, formData: { firstName: '', lastName: '', email: '' }, result: null });
  };
  
  const handleQuizAnswer = (type) => {
      const newScores = { ...quizState.scores, [type]: quizState.scores[type] + 1 };
      setQuizState({ ...quizState, scores: newScores, step: quizState.step + 1 });
  };

  const handleQuizFormSubmit = (e) => {
      e.preventDefault();
      const { vata, pitta, kapha } = quizState.scores;
      let dominant = text.ayurveda.doshas[0]; 
      if (pitta > vata && pitta > kapha) dominant = text.ayurveda.doshas[1];
      if (kapha > vata && kapha > pitta) dominant = text.ayurveda.doshas[2];
      const total = vata + pitta + kapha || 1;
      const percentages = {
        vata: Math.round((vata / total) * 100),
        pitta: Math.round((pitta / total) * 100),
        kapha: Math.round((kapha / total) * 100)
      };
      setQuizState({ ...quizState, result: { dominant, percentages } });
  };

  const handleCloseQuizResult = () => {
      const result = quizState.result?.dominant;
      setQuizState({ ...quizState, isOpen: false, result: null });
      if (result) setSelectedDosha(result);
  };

  const navigateTo = (newView) => {
      const currentSelector = view === 'HOME' ? ".home-view" : `.${view.toLowerCase()}-view`;
      gsap.to(currentSelector, { opacity: 0, y: -50, duration: 0.8, ease: "power2.in", onComplete: () => { setView(newView); window.scrollTo(0,0); }});
  };

  const handleBackClick = () => {
    const currentSelector = `.${view.toLowerCase()}-view`;
    gsap.to(currentSelector, { opacity: 0, y: 50, duration: 0.8, ease: "power2.in", onComplete: () => { setView('HOME'); window.scrollTo(0,0); }});
  };

  const handleMediaSectionClick = (id) => {
      setSelectedMediaId(id);
      setSelectedProduct(null);
      setSelectedPost(null);
  };

  const closeMediaDetail = () => {
      if (selectedProduct || selectedPost || isAddingPost) {
        setSelectedProduct(null); setSelectedPost(null); setIsAddingPost(false); setBookOpen(false);
      } else {
        if (selectedMediaId === 'tv') {
            gsap.to(mediaExpandRef.current, { clipPath: "circle(0% at 50% 50%)", opacity: 0, duration: 0.8, ease: "power3.inOut", onComplete: () => setSelectedMediaId(null) });
        } else {
             gsap.to(mediaExpandRef.current, { opacity: 0, duration: 0.5, ease: "power2.inOut", onComplete: () => setSelectedMediaId(null) });
        }
      }
  };

  const handleProductClick = (item) => {
    if (item.status === 'available') {
      setSelectedProduct(item);
      setBookOpen(false);
    }
  };

  // Trigger book opening animation when a book is selected
  useEffect(() => {
    if (selectedProduct && (selectedProduct.title?.includes("Livre") || selectedProduct.title?.includes("Book") || selectedMediaId === 'book')) {
       setTimeout(() => setBookOpen(true), 500);
    }
  }, [selectedProduct, selectedMediaId]);

  const handleGemSearch = async () => {
    if (!gemQuery.trim()) return;
    setIsThinking(true); setGemResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Role: Concierge. Query: "${gemQuery}". Lang: ${lang}. Max 2 sentences.` });
      setGemResult(response.text);
    } catch (error) { setGemResult("Une petite pause s'impose."); } finally { setIsThinking(false); }
  };

  useLayoutEffect(() => {
    if (introComplete) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => setIntroComplete(true) });
      gsap.set([navLogoRef.current, ".home-view", ".hero-card", ".gem-bar", ".guide-btn", logoHeroRef.current, ".intro-mandala"], { opacity: 0 });
      gsap.set(dropRef.current, { y: '-45vh', scale: 0.5, opacity: 1 });
      
      tl.to(dropRef.current, { 
          y: 0, 
          duration: 1.5, 
          ease: "power4.in",
          onComplete: () => {
              if (dropAudioRef.current) {
                  dropAudioRef.current.volume = 1.0;
                  dropAudioRef.current.currentTime = 0;
                  dropAudioRef.current.play().catch(e => console.log("Drop sound autoplay block", e));
              }
          }
      })
      .to(dropRef.current, { scaleX: 1.5, scaleY: 0.05, opacity: 0, duration: 0.8, ease: "power2.out" })
      .to(logoHeroRef.current, { opacity: 1, scale: 0.5, duration: 0.8, ease: "back.out(1.2)" }, "<")
      .to({}, { duration: 0.3 }) 
      .fromTo(".intro-mandala", { scale: 0, rotation: 0, opacity: 0 }, { scale: 20, rotation: 180, opacity: 0.15, duration: 2.5, ease: "power2.inOut" })
      .to(logoHeroRef.current, { opacity: 0, duration: 1.5, ease: "power1.out" }, "<+0.5")
      .to(introRef.current, { opacity: 0, pointerEvents: 'none', duration: 1.0 }, "-=0.5")
      .to(navLogoRef.current, { opacity: 1, duration: 0.8 }, "-=0.8")
      .to(".home-view", { opacity: 1, duration: 0.8 }, "<")
      .to(".hero-card", { y: 0, opacity: 1, duration: 1.0, stagger: 0.1, ease: 'power3.out' }, "-=0.4")
      .to(".gem-bar", { y: 0, opacity: 1, duration: 1 }, "-=0.8")
      .to(".guide-btn", { opacity: 1, duration: 1 }, "-=0.5");
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
      const transitions = {
          'ESSENTIALS': { selector: ".essentials-view", trigger: ".essentials-hero", parallax: ".parallax-bg" },
          'MEDIA': { selector: ".media-view", trigger: null, parallax: null },
          'SHOP': { selector: ".shop-view", trigger: ".shop-banner", parallax: ".shop-parallax-bg" },
          'LOCATIONS': { selector: ".locations-view", trigger: null, parallax: null },
          'AYURVEDA': { selector: ".ayurveda-view", trigger: null, parallax: null },
          'FOUNDER': { selector: ".founder-view", trigger: null, parallax: null },
          'BOOKING': { selector: ".booking-view", trigger: null, parallax: null }
      };

      if (view !== 'HOME') {
          const config = transitions[view];
          const ctx = gsap.context(() => {
              gsap.fromTo(config.selector, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: "power2.out", delay: 0.2 });
              if (config.trigger && config.parallax) {
                 gsap.to(config.parallax, { yPercent: 40, ease: "none", scrollTrigger: { trigger: config.trigger, start: "top top", end: "bottom top", scrub: 0.5 } });
              }
              if (view === 'SHOP') gsap.fromTo(".shop-product-card", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 0.4 });
              if (view === 'LOCATIONS') gsap.fromTo(".location-region", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, delay: 0.4 });
              if (view === 'AYURVEDA') {
                  gsap.fromTo(".dosha-leaf", { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, stagger: 0.2, delay: 0.5 });
                  gsap.fromTo(".quiz-center", { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, delay: 1 });
              }
              if (view === 'FOUNDER') {
                  gsap.fromTo(".founder-hero-img", { scale: 1.1, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.5 });
                  gsap.fromTo(".founder-title", { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, delay: 0.3 });
                  gsap.to(".founder-separator-bg", { yPercent: 30, ease: "none", scrollTrigger: { trigger: ".founder-separator", start: "top bottom", end: "bottom top", scrub: true } });
              }
          });
          return () => ctx.revert();
      } else if (introComplete) {
           gsap.fromTo(".home-view", { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 1, ease: "power2.out", delay: 0.2 });
      }
  }, [view, introComplete]);

  useEffect(() => {
    if (selectedMediaId && mediaExpandRef.current) {
        gsap.killTweensOf(mediaExpandRef.current);
        gsap.killTweensOf(".media-detail-content");
        gsap.killTweensOf(".transition-overlay");
        
        gsap.set(".media-detail-content", { opacity: 0 });

        const tl = gsap.timeline();

        if (selectedMediaId === 'tv') {
            gsap.set(".tv-transition", { opacity: 1, display: 'flex' });
            
            gsap.fromTo(mediaExpandRef.current, 
                { clipPath: "circle(0% at 50% 50%)", opacity: 1 },
                { clipPath: "circle(150% at 50% 50%)", duration: 1.2, ease: "power3.inOut" }
            );

            tl.to(".tv-beam", { width: "100%", opacity: 1, duration: 0.4, ease: "power2.out", delay: 0.5 })
              .to(".tv-transition", { opacity: 0, duration: 0.8, delay: 0.2 }) 
              .set(".tv-transition", { display: 'none' })
              .to(".media-detail-content", { opacity: 1, duration: 1.0 }, "<");

        } else {
             gsap.set(mediaExpandRef.current, { clipPath: "inset(0% 0% 0% 0%)", opacity: 0 });
             gsap.to(mediaExpandRef.current, { opacity: 1, duration: 0.4 });
             
             let overlayClass = "";
             if (selectedMediaId === 'podcast') overlayClass = ".soundwave-container";
             else if (selectedMediaId === 'book') overlayClass = ".book-shelf-transition";
             else if (selectedMediaId === 'blog') overlayClass = ".blog-transition";

             if (overlayClass) {
                 gsap.set(overlayClass, { opacity: 1, display: 'flex' });
                 
                 if (selectedMediaId === 'podcast') {
                     tl.to(".soundwave-bar", { height: "100%", opacity: 1, duration: 0.4, stagger: { each: 0.05, yoyo: true, repeat: 3 } });
                 } else if (selectedMediaId === 'book') {
                     tl.fromTo(".shelf-spine", { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05 });
                 } else if (selectedMediaId === 'blog') {
                     tl.to(".pen-path", { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" });
                 }
                 
                 tl.to(overlayClass, { opacity: 0, duration: 0.5, delay: 0.2 });
                 tl.set(overlayClass, { display: 'none' });
             }

             tl.to(".media-detail-content", { opacity: 1, duration: 0.8 }, "-=0.2");
        }
    }
  }, [selectedMediaId]);

  return (
    <div ref={containerRef} className="relative font-sans selection:bg-gold selection:text-white bg-white dark:bg-[#050C1A] text-royal dark:text-[#E0E0E0] min-h-screen transition-colors duration-300">
      <audio ref={audioRef} src={ASSETS.audio} loop preload="auto" />
      <audio ref={dropAudioRef} src={ASSETS.dropSound} preload="auto" />
      <ChakraDecorations />
      
      {/* INTRO */}
      <div ref={introRef} className="fixed inset-0 z-50 flex items-center justify-center bg-white pointer-events-none overflow-hidden">
        <IntroMandala />
        <div ref={dropRef} className="w-2.5 h-2.5 bg-gradient-to-br from-gold to-gold-dark rounded-full shadow-[0_4px_15px_rgba(212,175,55,0.6)] z-20"></div>
        <img ref={logoHeroRef} src={ASSETS.logo} alt="Inspirata Logo" className="w-48 md:w-64 object-contain absolute z-30 opacity-0" />
      </div>

      {/* NAV */}
      <nav className="fixed top-0 w-full z-40 px-6 py-4 flex justify-between items-center bg-white/70 dark:bg-[#050C1A]/80 backdrop-blur-xl border-b border-white/50 dark:border-white/10 shadow-lg transition-all duration-500">
        <button onClick={() => setView('HOME')} className="block cursor-pointer"><img ref={navLogoRef} src={ASSETS.navLogo} alt="Logo" className="h-20 md:h-24 w-auto opacity-0 transition-all duration-300 drop-shadow-sm" /></button>
        <div className="flex items-center gap-6">
          <button onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)} className={`text-royal/60 dark:text-white/60 hover:text-gold ${isAdmin ? 'text-gold' : ''}`}><i className={`fa-solid ${isAdmin ? 'fa-unlock' : 'fa-lock'}`}></i></button>
          <button onClick={toggleAudio} className="text-royal/80 hover:text-gold w-8 h-8 flex items-center justify-center rounded-full">{audioPlaying ? <div className="flex gap-[3px] items-end h-3"><div className="w-[2px] bg-royal dark:bg-white animate-[bounce_1s_infinite] h-full"></div><div className="w-[2px] bg-royal dark:bg-white animate-[bounce_1.4s_infinite] h-2/3"></div></div> : <i className="fa-solid fa-play text-xs pl-1"></i>}</button>
          <button onClick={toggleTheme} className="text-royal/80 hover:text-gold w-8 h-8 flex items-center justify-center rounded-full">{theme === 'light' ? <i className="fa-solid fa-moon"></i> : <i className="fa-solid fa-sun text-gold"></i>}</button>
          <button onClick={() => setCartOpen(true)} className="relative text-royal/80 dark:text-white/80 hover:text-gold"><i className="fa-solid fa-shopping-bag text-lg"></i>{cartItems.length > 0 && <span className="absolute -top-2 -right-2 bg-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold animate-bounce">{cartItems.length}</span>}</button>
          <div className="relative">
              <button onClick={() => setLangMenuOpen(!langMenuOpen)} className="text-royal dark:text-white font-medium hover:text-gold text-xs tracking-widest border border-royal/10 px-3 py-1 rounded-brand w-16 text-center shadow-sm flex items-center justify-between gap-2">{text.toggle} <i className="fa-solid fa-chevron-down text-[10px]"></i></button>
              {langMenuOpen && (<div className="absolute top-full right-0 mt-2 bg-white dark:bg-[#1A2642] rounded-brand shadow-xl border border-royal/5 flex flex-col w-32 py-2">{['FR', 'EN', 'ES', 'NL', 'RU', 'PT'].map((l) => (<button key={l} onClick={() => changeLanguage(l)} className={`px-4 py-2 text-left text-xs hover:bg-royal/5 ${lang === l ? 'font-bold text-gold' : 'text-royal dark:text-white'}`}>{l}</button>))}</div>)}
          </div>
        </div>
      </nav>

      {/* MINI CART DRAWER */}
      <div className={`fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${cartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setCartOpen(false)}>
          <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#0B1A36] shadow-2xl transform transition-transform duration-500 ease-out flex flex-col ${cartOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-royal/10 dark:border-white/10 flex justify-between items-center bg-surface dark:bg-[#050C1A]"><h3 className="text-2xl font-serif text-royal dark:text-white">Panier</h3><button onClick={() => setCartOpen(false)}><i className="fa-solid fa-times text-xl"></i></button></div>
              <div className="flex-1 overflow-y-auto p-6">
                  {cartItems.length === 0 ? (<div className="h-full flex flex-col items-center justify-center opacity-50"><i className="fa-solid fa-basket-shopping text-4xl mb-4"></i><p>Votre panier est vide.</p></div>) : (<div className="space-y-6">{cartItems.map((item, i) => (<div key={i} className="flex gap-4"><div className="w-20 h-24 bg-gray-100 rounded-md bg-cover bg-center shrink-0" style={{ backgroundImage: `url(${item.image || item.cover || ASSETS.productVata})` }}></div><div className="flex-1"><h4 className="font-serif leading-tight mb-1">{item.title || item.name}</h4><div className="flex justify-between items-center"><span className="font-bold text-gold">{item.price}</span><button onClick={() => removeFromCart(i)} className="text-xs text-red-400 underline">Retirer</button></div></div></div>))}</div>)}
              </div>
              {cartItems.length > 0 && (<div className="p-6 bg-surface dark:bg-[#050C1A] border-t border-royal/10"><div className="flex justify-between mb-4 text-lg font-serif font-bold"><span>Total</span><span>{cartTotal} CAD</span></div><button className="w-full bg-royal dark:bg-gold text-white dark:text-royal py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gold transition-colors shadow-lg">Commander</button></div>)}
          </div>
      </div>

      {/* HOME VIEW */}
      {view === 'HOME' && (
      <main className="home-view pt-44 pb-10 px-4 md:px-8 w-full max-w-[1800px] mx-auto flex flex-col items-center min-h-screen opacity-0 relative z-10 justify-between">
        <div className="text-center mb-8 relative z-20"><h1 className="text-4xl md:text-6xl font-serif text-royal dark:text-white tracking-[0.2em] uppercase leading-tight text-shadow">Inspirata Ayurveda</h1></div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 flex-grow items-center">
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('FOUNDER'); }} className="hero-card block w-full h-[400px] lg:h-[55vh] relative group rounded-brand overflow-hidden iridescent-glow cursor-pointer shadow-2xl card-hover-effect">
                <div className="card-bg-image absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.founder})`, backgroundColor: '#e5e5e5' }} />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-4"><h2 className="text-white text-3xl lg:text-4xl font-serif mb-4 drop-shadow-md">{text.cards.founder.title}</h2><span className="inline-flex items-center gap-2 px-6 py-2 border border-white/40 rounded-full text-white text-sm bg-white/10 backdrop-blur-md uppercase tracking-widest">{text.cards.founder.subtitle}</span></div>
            </a>
            <div className="hero-card block w-full h-[400px] lg:h-[55vh] relative group rounded-brand overflow-hidden iridescent-glow shadow-2xl card-hover-effect">
                <div className="card-bg-image absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.shopBg})`, backgroundColor: '#C8D5E0' }} />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-4 flex flex-col items-center gap-4">
                     <h2 className="text-white text-3xl lg:text-4xl font-serif mb-2 drop-shadow-md">{text.cards.shop.title}</h2>
                     <button onClick={(e) => { e.preventDefault(); navigateTo('SHOP'); }} className="inline-flex items-center gap-2 px-6 py-2 border border-white/40 rounded-full text-white text-sm bg-white/10 backdrop-blur-md hover:bg-white/20 uppercase tracking-widest cursor-pointer">{text.cards.shop.subtitle}</button>
                     <button onClick={(e) => { e.preventDefault(); navigateTo('LOCATIONS'); }} className="inline-flex items-center gap-2 px-6 py-2 border border-white/40 rounded-full text-white text-sm bg-white/10 backdrop-blur-md hover:bg-white/20 uppercase tracking-widest cursor-pointer">{text.cards.shop.locations}</button>
                </div>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('AYURVEDA'); }} className="hero-card block w-full h-[400px] lg:h-[55vh] relative group rounded-brand overflow-hidden iridescent-glow cursor-pointer shadow-2xl card-hover-effect">
                <div className="card-bg-image absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.ayurvedaBg})`, backgroundColor: '#F0E6D2' }} />
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-4"><h2 className="text-white text-3xl lg:text-4xl font-serif mb-4 drop-shadow-md">{text.cards.ayurveda.title}</h2><span className="inline-flex items-center gap-2 px-6 py-2 border border-white/40 rounded-full text-white text-sm bg-white/10 backdrop-blur-md uppercase tracking-widest">{text.cards.ayurveda.subtitle}</span></div>
            </a>
             <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('MEDIA'); }} className="hero-card block w-full h-[400px] lg:h-[55vh] relative group rounded-brand overflow-hidden iridescent-glow cursor-pointer shadow-2xl card-hover-effect bg-surface">
                <div className="card-bg-image absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.blogBg})` }} />
                 <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                 <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full px-4"><h2 className="text-white text-3xl lg:text-4xl font-serif mb-4 drop-shadow-md">{text.cards.blog.title}</h2><span className="inline-flex items-center gap-2 px-6 py-2 border border-white/40 rounded-full text-white text-sm bg-white/10 backdrop-blur-md uppercase tracking-widest">{text.cards.blog.subtitle}</span></div>
            </a>
        </div>
        <div className="gem-bar w-full max-w-xl px-4 relative z-10 flex flex-col items-center mb-6">
            <div className="relative group w-full">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-gold/30 via-royal/10 to-gold/30 rounded-full blur opacity-40 group-hover:opacity-75 animate-pulse-slow"></div>
                <div className="glass-depth relative flex items-center rounded-full shadow-depth p-2 transition-all duration-300 focus-within:scale-[1.02]">
                    <div className="pl-4 pr-3 text-gold text-lg shrink-0"><i className="fa-solid fa-sparkles"></i></div>
                    <input type="text" value={gemQuery} onChange={(e) => setGemQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleGemSearch()} placeholder={text.gem.placeholder} className="flex-1 min-w-0 bg-transparent border-none outline-none text-royal dark:text-white placeholder:text-royal/40 dark:placeholder:text-white/40 font-medium py-3 text-sm md:text-base pr-2 truncate" />
                    <button onClick={handleGemSearch} disabled={isThinking} className="bg-royal dark:bg-white text-white dark:text-royal px-5 md:px-8 py-2 md:py-3 rounded-full hover:bg-gold transition-colors duration-300 font-medium text-xs md:text-sm shadow-md shrink-0 whitespace-nowrap">{isThinking ? <i className="fa-solid fa-circle-notch fa-spin"></i> : text.gem.button}</button>
                </div>
            </div>
        </div>
        <div className="guide-btn mt-6 pb-8"><button onClick={() => navigateTo('ESSENTIALS')} className="bg-royal text-white px-10 py-3 rounded-brand hover:bg-gold transition-colors duration-300 uppercase tracking-widest text-xs font-semibold shadow-lg hover:shadow-glow transform hover:-translate-y-0.5">{text.guideBtn}</button></div>
        <FooterSignature />
      </main>
      )}

      {/* VIEW: ESSENTIALS */}
      {view === 'ESSENTIALS' && (
      <section className="essentials-view min-h-screen w-full opacity-0 pb-20 dark:bg-[#050C1A]">
          <div className="absolute top-36 left-6 md:left-12 z-20"><button onClick={handleBackClick} className="text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full shadow-md"><i className="fa-solid fa-arrow-left"></i> {text.featured.back}</button></div>
          <div className="essentials-hero relative w-full h-[85vh] overflow-hidden flex items-center justify-center">
             <div className="parallax-bg absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.shopBg})` }}></div>
             <div className="absolute inset-0 bg-black/30"></div>
             <div className="relative z-10 text-center text-white px-4 max-w-4xl"><h1 className="text-4xl md:text-6xl font-serif tracking-wider mb-4 leading-tight text-shadow">{text.featured.hero.title}</h1><p className="text-lg md:text-xl font-sans tracking-[0.2em] uppercase opacity-90 mb-10 text-shadow-sm">{text.featured.hero.subtitle}</p><button onClick={() => setView('SHOP')} className="glass-depth text-royal px-8 py-3 rounded-brand hover:bg-gold hover:text-white hover:border-gold transition-all duration-300 uppercase tracking-widest text-xs font-bold shadow-depth">{text.featured.hero.cta}</button></div>
          </div>
          <div className="py-24 px-6 md:px-12 max-w-5xl mx-auto text-center"><h2 className="text-2xl md:text-4xl font-serif text-royal dark:text-white uppercase tracking-wide mb-4">{text.featured.intro.title}</h2><p className="text-gold font-serif text-xl italic mb-10">{text.featured.intro.subtitle}</p><p className="text-royal/70 dark:text-white/70 font-sans text-sm md:text-base leading-relaxed max-w-2xl mx-auto">{text.featured.intro.quote}</p></div>
          <div className="max-w-6xl mx-auto px-6 md:px-12 mt-10">
              <div className="text-center mb-16"><span className="text-gold uppercase tracking-[0.2em] text-xs font-semibold">{text.featured.subtitle}</span><h2 className="text-4xl md:text-5xl font-serif text-royal dark:text-white mt-4 italic">{text.featured.title}</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">{text.featured.products?.map((product, idx) => (
                  <div key={idx} className="group cursor-pointer relative">
                      <div className="bg-[#f4f4f4] dark:bg-white/5 rounded-brand aspect-[4/5] mb-6 overflow-hidden relative shadow-md group-hover:shadow-2xl transition-shadow duration-500"><div className="absolute inset-0 bg-royal/5 group-hover:bg-royal/10 transition-colors duration-500"></div><div className="absolute inset-0 flex items-center justify-center text-royal/10 dark:text-white/10 text-6xl"><i className="fa-solid fa-bottle-droplet"></i></div><div className="absolute bottom-4 left-0 w-full text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0"><button onClick={(e) => addToCart(product, e)} className="bg-white/80 dark:bg-royal/80 backdrop-blur px-4 py-2 rounded-full text-xs uppercase tracking-wider text-royal dark:text-white shadow-sm hover:bg-gold hover:text-white transition-colors">Ajouter au panier</button></div></div>
                      {isAdmin && (<button onClick={(e) => handleShareClick(product, e)} className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-white dark:bg-royal text-royal dark:text-white shadow-md hover:text-gold flex items-center justify-center transition-colors"><i className="fa-solid fa-share-nodes text-xs"></i></button>)}
                      <h3 className="text-xl font-serif text-royal dark:text-white group-hover:text-gold transition-colors">{product.name}</h3><p className="text-sm text-royal/60 dark:text-white/60 mt-1">{product.type}</p><p className="text-sm font-medium text-royal dark:text-white mt-2">{product.price}</p>
                  </div>))}
              </div>
          </div>
          <div className="py-12 text-center"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 mx-auto shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.backToHome}</button></div><FooterSignature />
      </section>
      )}

      {/* VIEW: SHOP */}
      {view === 'SHOP' && (
        <section className="shop-view min-h-screen w-full opacity-0 pb-20 dark:bg-[#050C1A]">
             <div className="absolute top-36 left-6 md:left-12 z-20"><button onClick={handleBackClick} className="text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full shadow-md"><i className="fa-solid fa-arrow-left"></i> {text.featured.back}</button></div>
            <div className="shop-banner relative w-full h-[50vh] overflow-hidden flex items-center justify-center mb-16">
                 <div className="shop-parallax-bg absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.shopBg})` }}></div>
                 <div className="absolute inset-0 bg-black/40"></div>
                 <div className="relative z-10 text-center text-white px-4"><h2 className="text-4xl md:text-6xl font-serif tracking-widest uppercase mb-4 text-shadow">{text.shop.title}</h2><p className="text-lg text-gold font-serif italic tracking-wide text-shadow-sm">{text.shop.subtitle}</p></div>
            </div>
            <div className="max-w-7xl mx-auto px-6 md:px-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">{text.shop.products?.map((product) => (
                    <div key={product.id} className="shop-product-card group flex flex-col opacity-0 transform translate-y-4 relative">
                        {isAdmin && (<button onClick={(e) => handleShareClick(product, e)} className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-white dark:bg-royal text-royal dark:text-white shadow-md hover:text-gold flex items-center justify-center transition-colors"><i className="fa-solid fa-share-nodes text-xs"></i></button>)}
                        <a href={`/products/${product.id}`} className="block relative aspect-[3/4] rounded-brand overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 mb-4 bg-white dark:bg-[#0B1A36] iridescent-glow"><div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${product.image})` }}></div><div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div><div className="absolute bottom-4 left-0 right-0 px-4 flex justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"><button onClick={(e) => addToCart(product, e)} className="glass-depth text-royal px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg hover:bg-gold hover:text-white transition-colors w-full max-w-[200px]">Ajouter au panier</button></div></a><div className="text-center px-2"><span className="text-[10px] text-royal/50 dark:text-white/50 uppercase tracking-widest font-bold">{product.type}</span><h3 className="text-lg font-serif text-royal dark:text-white mt-1 mb-1 group-hover:text-gold transition-colors line-clamp-1">{product.title}</h3><p className="text-sm text-royal/80 dark:text-white/80 font-medium">{product.price}</p></div>
                    </div>))}
                </div>
            </div>
            <div className="py-12 text-center"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 mx-auto shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.backToHome}</button></div><FooterSignature />
        </section>
      )}

      {/* VIEW: LOCATIONS */}
      {view === 'LOCATIONS' && (
        <section className="locations-view min-h-screen w-full opacity-0 pb-20 pt-44 bg-surface dark:bg-[#050C1A]">
            <div className="absolute top-36 left-6 md:left-12 z-20"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.media.back}</button></div>
            <div className="max-w-4xl mx-auto px-6 text-center mb-16"><h2 className="text-4xl md:text-5xl font-serif text-royal dark:text-white mb-6">{text.locations.title}</h2><p className="text-royal/80 dark:text-white/80 text-lg leading-relaxed">{text.locations.intro}</p><div className="w-24 h-1 bg-gold mx-auto mt-8"></div></div>
            <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">{text.locations.regions?.map((region, i) => (<div key={i} className="location-region opacity-0 transform translate-y-4"><h3 className="text-2xl font-serif text-gold uppercase tracking-widest mb-6 border-b border-royal/10 dark:border-white/10 pb-2">{region.name}</h3><div className="space-y-8">{region.spots.map((spot, j) => (<div key={j} className="glass-depth p-6 rounded-brand shadow-lg hover:shadow-2xl transition-all border border-royal/5"><h4 className="text-xl font-serif text-royal dark:text-white mb-2">{spot.name}</h4><p className="text-royal/70 dark:text-white/70 whitespace-pre-line mb-4 text-sm">{spot.address}</p><p className="text-royal/80 dark:text-white/80 font-medium mb-2 text-sm"><i className="fa-solid fa-phone text-gold mr-2"></i>{spot.tel}</p><p className="text-royal/60 dark:text-white/60 text-xs whitespace-pre-line border-t border-royal/5 pt-2 mt-2">{spot.hours}</p></div>))}</div></div>))}</div>
            <div className="py-12 text-center"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 mx-auto shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.backToHome}</button></div><FooterSignature />
        </section>
      )}

      {/* VIEW: FOUNDER */}
      {view === 'FOUNDER' && (
          <section className="founder-view min-h-screen w-full opacity-0 relative bg-gradient-to-br from-[#0B1A36] to-[#050C1A] text-white overflow-x-hidden">
              <div className="absolute top-36 left-6 md:left-12 z-40"><button onClick={handleBackClick} className="text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.media.back}</button></div>
              <div className="relative pt-44 pb-12 px-6 md:px-12 flex flex-col md:flex-row items-start justify-center max-w-7xl mx-auto gap-12">
                  <div className="founder-title opacity-0 translate-y-10 md:w-1/2 pt-10 md:sticky md:top-32 h-fit z-20">
                    <h2 className="text-gold uppercase tracking-[0.2em] font-bold text-xs md:text-sm mb-4">La Fondatrice</h2>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-6 leading-none text-shadow-sm">Krystine<br/><span className="italic text-white/50">St-Laurent</span></h1>
                    <p className="text-xl md:text-2xl text-white/70 font-serif italic max-w-lg mb-8">{text.founder.bio.intro}</p>
                    <div className="grid grid-cols-2 gap-4 mt-8">{text.founder.stats?.map((stat, i) => (<div key={i} className="founder-stat-card glass-depth-dark p-6 rounded-2xl hover:bg-white/10 transition-colors duration-300"><span className="text-3xl font-serif text-gold mb-1 block text-shadow-sm">{stat.value}</span><span className="text-white/80 uppercase tracking-widest text-[10px] font-bold block">{stat.sub}</span><span className="text-white/40 text-xs font-medium">{stat.label}</span></div>))}</div>
                    <div className="mt-8"><button onClick={() => navigateTo('BOOKING')} className="w-full bg-gold text-royal font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-white transition-colors shadow-glow flex items-center justify-center gap-2">{text.founder.cta} <i className="fa-solid fa-arrow-right"></i></button></div>
                  </div>
                  <div className="founder-hero-img opacity-0 md:w-1/2 relative h-[60vh] md:h-[80vh] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                      <img src={ASSETS.founder} alt="Krystine St-Laurent" className="w-full h-full object-cover object-top absolute inset-0 transition-opacity duration-700 group-hover:opacity-0" />
                      <img src={ASSETS.founderHover} alt="Krystine St-Laurent" className="w-full h-full object-cover object-top absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050C1A] via-transparent to-transparent opacity-80 pointer-events-none"></div>
                      {isAdmin && (<button onClick={(e) => handleShareClick({title: "Krystine St-Laurent", subtitle: "Fondatrice & Experte Ayurveda", image: ASSETS.founder}, e)} className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white text-royal flex items-center justify-center shadow-lg hover:bg-gold hover:text-white transition-colors"><i className="fa-solid fa-share-nodes text-lg"></i></button>)}
                  </div>
              </div>
              <div className="founder-separator relative h-[40vh] w-full overflow-hidden flex items-center justify-center border-y border-white/10 shadow-depth z-10">
                 <div className="founder-separator-bg absolute inset-0 -top-[20%] h-[140%] w-full bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.shopBg})` }}></div>
                 <div className="absolute inset-0 bg-black/40"></div>
              </div>
              <div className="bg-white dark:bg-[#0B1A36] py-24 px-6 md:px-12 shadow-depth z-10 relative">
                  <div className="max-w-4xl mx-auto text-center">
                       <span className="text-gold uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{text.founder.story.title}</span>
                       <h2 className="text-4xl md:text-5xl font-serif text-royal dark:text-white mb-12 italic">{text.founder.story.subtitle}</h2>
                       <div className="space-y-8 text-lg text-royal/80 dark:text-white/80 leading-relaxed font-sans text-left md:text-justify columns-1 md:columns-1 gap-12">
                           <p>{text.founder.story.p1}</p><p>{text.founder.story.p2}</p><p className="text-xl font-serif italic text-gold my-8 border-l-4 border-gold pl-6">{text.founder.story.p3}</p><p>{text.founder.story.p4}</p><p>{text.founder.story.p5}</p>
                       </div>
                  </div>
              </div>
              <div className="bg-[#050C1A] text-white py-24 px-6 md:px-12 border-t border-white/10 relative z-10">
                  <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16 items-center">
                      <div className="md:w-1/2">
                          <h3 className="text-3xl font-serif mb-2">{text.founder.newsletter.title}</h3>
                          <h4 className="text-3xl font-serif text-gold italic mb-8">{text.founder.newsletter.subtitle}</h4>
                          <p className="text-white/70 mb-8 leading-relaxed">{text.founder.newsletter.intro}</p>
                          <ul className="space-y-4 mb-8">{text.founder.newsletter.list?.map((item, i) => (<li key={i} className="flex items-center gap-3 text-white/90"><span className="w-1.5 h-1.5 bg-gold rounded-full"></span>{item}</li>))}</ul>
                          <p className="text-white/50 text-sm italic">{text.founder.newsletter.outro}</p>
                      </div>
                      <div className="md:w-1/2 w-full"><div className="glass-depth-dark p-8 rounded-2xl shadow-2xl"><h5 className="text-xl font-serif text-white mb-6 text-center">{text.founder.newsletter.formTitle}</h5><div className="space-y-4"><input type="text" placeholder="Nom" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-gold transition-colors shadow-inner" /><input type="email" placeholder="Email" className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-gold transition-colors shadow-inner" /><button className="w-full bg-gold text-royal font-bold uppercase tracking-widest text-sm py-4 rounded-lg hover:bg-white transition-colors shadow-md">{text.founder.newsletter.cta}</button></div></div></div>
                  </div>
              </div>
              <div className="bg-[#F4F4F4] dark:bg-[#050C1A] py-20 px-6 md:px-12 text-center relative z-10"><div className="max-w-3xl mx-auto"><h3 className="text-royal dark:text-white font-serif text-2xl uppercase tracking-widest mb-8">{text.founder.footerBio.title}</h3><p className="text-royal/70 dark:text-white/70 leading-relaxed font-sans">{text.founder.footerBio.text}</p></div></div>
              <div className="py-12 text-center bg-[#F4F4F4] dark:bg-[#050C1A] relative z-10"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 mx-auto shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.backToHome}</button><FooterSignature /></div>
          </section>
      )}

      {/* VIEW: BOOKING & RITUALS */}
      {view === 'BOOKING' && (
          <section className="booking-view min-h-screen w-full opacity-0 bg-surface dark:bg-[#050C1A]">
              <div className="absolute top-36 left-6 md:left-12 z-20"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 shadow-sm"><i className="fa-solid fa-arrow-left"></i> Retour</button></div>
              <div className="booking-hero pt-48 pb-32 px-6 md:px-12 bg-white dark:bg-[#0B1A36] border-b border-royal/5 dark:border-white/5 shadow-depth z-10 relative">
                  <div className="max-w-4xl mx-auto text-center">
                      <h1 className="text-4xl md:text-6xl font-serif text-royal dark:text-white mb-8 mt-10">{text.booking.title}</h1><div className="w-24 h-1 bg-gold mx-auto mb-12 shadow-sm"></div><p className="text-xl text-royal/80 dark:text-white/80 leading-relaxed mb-6 font-serif">{text.booking.bio}</p><p className="text-lg text-royal/60 dark:text-white/60 leading-relaxed mb-12">{text.booking.program}</p>
                      <div className="flex flex-col md:flex-row gap-4 justify-center"><button className="bg-royal dark:bg-white text-white dark:text-royal px-10 py-4 rounded-full uppercase tracking-widest font-bold text-sm shadow-lg hover:bg-gold transition-colors">Contacter son équipe</button><button className="border border-royal/20 dark:border-white/20 text-royal dark:text-white px-10 py-4 rounded-full uppercase tracking-widest font-bold text-sm hover:border-royal dark:hover:border-white transition-colors shadow-sm">Télécharger le Press Kit</button></div>
                  </div>
              </div>
              <div className="booking-content py-24 px-6 md:px-12 relative overflow-hidden text-center">
                  <div className="absolute inset-0 bg-royal/5 dark:bg-white/5 -skew-y-3 z-0 transform origin-top-left scale-110"></div>
                  <div className="relative z-10 max-w-3xl mx-auto">
                      <span className="bg-gold/10 text-gold-dark dark:text-gold px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6 inline-block shadow-sm">Programme Exclusif</span><h2 className="text-3xl md:text-5xl font-serif text-royal dark:text-white mb-6">{text.booking.ritual.title}</h2><p className="text-xl text-royal/70 dark:text-white/70 mb-10 leading-relaxed">{text.booking.ritual.desc}</p>
                      <a href={text.booking.ritual.kajabiLink} target="_blank" rel="noopener noreferrer" className="inline-block bg-gold text-white px-12 py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-glow hover:shadow-lg hover:scale-105 transition-all transform">{text.booking.ritual.cta}</a><p className="text-xs text-royal/40 dark:text-white/40 mt-4 uppercase tracking-wider">Paiement sécurisé via Kajabi</p>
                  </div>
              </div>
              <div className="py-12 text-center"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 mx-auto shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.backToHome}</button><FooterSignature /></div>
          </section>
      )}
      
      {/* VIEW: AYURVEDA */}
      {view === 'AYURVEDA' && (
        <section className="ayurveda-view min-h-screen w-full opacity-0 pb-20 pt-44 bg-surface dark:bg-[#050C1A] relative">
            <div className="absolute top-36 left-6 md:left-12 z-20"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.media.back}</button></div>
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 relative max-w-[1800px] mx-auto">
                <div className="text-center mb-16 w-full max-w-6xl relative z-10 px-4 md:px-12"><h2 className="text-2xl md:text-4xl font-serif text-royal dark:text-white mb-6 tracking-wide text-shadow-sm">{text.ayurveda.whatIsTitle}</h2><p className="text-royal/80 dark:text-white/80 font-serif text-lg md:text-2xl leading-relaxed italic max-w-4xl mx-auto">{text.ayurveda.whatIsText}</p><div className="w-16 h-1 bg-gold mx-auto mt-8 opacity-50 shadow-sm"></div></div>
                <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-12 lg:gap-24 px-4 md:px-12 mb-12">
                    <div className="relative flex items-center justify-center lg:w-1/2">
                       <AyurvedaIkigai doshas={text.ayurveda.doshas} onDoshaClick={setSelectedDosha} onQuizClick={handleQuizStart} />
                        {selectedDosha && (
                            <div className="absolute z-30 inset-0 flex items-center justify-center animate-[fadeIn_0.3s_ease-out]">
                                 <div className="glass-depth p-8 rounded-brand shadow-2xl max-w-xs md:max-w-sm text-center relative">
                                     <button onClick={(e) => {e.stopPropagation(); setSelectedDosha(null);}} className="absolute top-2 right-4 text-royal/40 dark:text-white/40 hover:text-royal text-2xl">&times;</button>
                                     <h3 className={`text-3xl font-serif font-bold mb-2 bg-clip-text text-transparent ${selectedDosha.color?.replace('bg-', 'bg-') || 'text-royal'}`}>{selectedDosha.name}</h3>
                                     <p className="text-xs font-bold uppercase tracking-widest text-royal/50 dark:text-white/50 mb-4">{selectedDosha.elements}</p>
                                     <div className="w-12 h-1 bg-royal/10 mx-auto mb-4"></div>
                                     <p className="text-royal/80 dark:text-white/80 text-sm leading-relaxed mb-4">{selectedDosha.definition}</p>
                                     <p className="text-gold font-serif italic">{selectedDosha.action}</p>
                                     <div className="mt-6 pt-4 border-t border-royal/10"><p className="text-xs uppercase tracking-wide text-royal/60 mb-2">Recommandation</p><button onClick={(e) => { addToCart({title: selectedDosha.productRecom || `Huile ${selectedDosha.name}`, price: "48.00 CAD", type: "Soin Spécifique"}, e); setSelectedDosha(null); }} className="w-full bg-royal dark:bg-white text-white dark:text-royal py-2 rounded-full text-xs font-bold uppercase hover:bg-gold transition-colors shadow-md">Ajouter {selectedDosha.productRecom || `Huile ${selectedDosha.name}`}</button></div>
                                 </div>
                            </div>
                        )}
                    </div>
                    <div className="lg:w-1/2 text-left lg:text-left text-center max-w-xl">
                        <span className="text-gold uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{text.ayurveda.introTitle}</span><h2 className="text-3xl md:text-5xl font-serif text-royal dark:text-white mb-6 text-shadow-sm">{text.ayurveda.title}</h2><p className="text-royal/70 dark:text-white/70 font-serif text-lg leading-relaxed mb-6 italic">{text.ayurveda.introText}</p>
                        <div className="glass-depth p-8 rounded-brand shadow-depth relative z-10 mb-8"><p className="text-royal/80 dark:text-white/80 leading-relaxed mb-6 font-medium">{text.ayurveda.desc}</p><p className="text-royal dark:text-white font-bold">{text.ayurveda.quizPrompt}</p></div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                            {text.ayurveda.doshas?.map((d, i) => (<div key={i} className="flex items-center lg:items-start gap-3 cursor-pointer hover:opacity-70 transition-opacity justify-center lg:justify-start" onClick={() => setSelectedDosha(d)}><div className={`w-4 h-4 rounded-full ${d.color} mt-1 shrink-0 shadow-sm`}></div><div className="text-left"><strong className="block text-royal dark:text-white uppercase tracking-wider mb-1">{d.name}</strong><span className="text-royal/60 dark:text-white/60">{d.action}</span></div></div>))}
                        </div>
                    </div>
                </div>
                <div className="mt-12 w-full max-w-5xl mx-auto px-6">
                    <div className="text-center mb-12"><span className="w-16 h-[1px] bg-gold/50 inline-block mb-4"></span><h3 className="text-3xl font-serif text-royal dark:text-white uppercase tracking-widest text-shadow-sm">Lire sur l'Ayurveda</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {text.media.details.book.items && text.media.details.book.items.slice(0, 2).map((item, idx) => (
                             <div key={idx} onClick={() => { navigateTo('MEDIA'); setTimeout(() => { handleMediaSectionClick('book'); handleProductClick(item); }, 500); }} className="group cursor-pointer glass-depth p-6 rounded-brand shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col md:flex-row gap-6 items-center text-left relative">
                                {isAdmin && (<button onClick={(e) => handleShareClick(item, e)} className="absolute top-2 right-2 z-30 w-8 h-8 rounded-full bg-white dark:bg-royal text-royal dark:text-white shadow-md hover:text-gold flex items-center justify-center transition-colors"><i className="fa-solid fa-share-nodes text-xs"></i></button>)}
                                <div className="w-32 aspect-[1/1.2] rounded shadow-md overflow-hidden shrink-0 transform group-hover:-translate-y-2 transition-transform duration-500"><div className="w-full h-full bg-no-repeat bg-center" style={{ backgroundImage: `url(${item.cover})`, backgroundSize: '100% 100%' }}></div></div>
                                <div><h4 className="font-serif text-xl text-royal dark:text-white mb-2 group-hover:text-gold transition-colors">{item.fullTitle}</h4><p className="text-sm text-royal/60 dark:text-white/60 mb-4">{item.subtitle}</p><span className="text-xs font-bold uppercase tracking-widest text-royal/40 dark:text-white/40 border border-royal/10 dark:border-white/10 px-3 py-1 rounded-full group-hover:bg-royal group-hover:text-white transition-colors">Découvrir</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
             <FooterSignature />
            {quizState.isOpen && (
                <div className="fixed inset-0 z-50 bg-royal/40 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="glass-depth w-full max-w-2xl rounded-brand shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-royal/10 dark:border-white/10 flex justify-between items-center bg-white/50 dark:bg-white/5"><div><h3 className="font-serif text-2xl text-royal dark:text-white">Dosha Quiz</h3><p className="text-xs text-gold uppercase tracking-widest font-bold mt-1">{quizState.result ? 'Résultats' : quizState.step < QUIZ_DATA.length ? `Question ${quizState.step + 1} sur ${QUIZ_DATA.length + 1}` : 'Finalisation'}</p></div><button onClick={() => setQuizState({ ...quizState, isOpen: false, result: null })} className="text-royal/40 hover:text-royal"><i className="fa-solid fa-times text-xl"></i></button></div>
                        {!quizState.result && (<div className="w-full h-1 bg-royal/5"><div className="h-full bg-gold transition-all duration-500" style={{ width: `${((quizState.step + 1) / (QUIZ_DATA.length + 1)) * 100}%` }}></div></div>)}
                        <div className="p-8 overflow-y-auto flex-1">
                            {!quizState.result ? (
                                quizState.step < QUIZ_DATA.length ? (
                                    <div className="animate-[fadeIn_0.5s_ease-out]"><h4 className="text-xl md:text-2xl font-serif text-royal dark:text-white mb-8 leading-relaxed">{QUIZ_DATA[quizState.step].question}</h4><div className="space-y-4">{QUIZ_DATA[quizState.step].options.map((option, idx) => (<button key={idx} onClick={() => handleQuizAnswer(option.type)} className="w-full text-left p-4 rounded-lg border border-royal/10 hover:border-gold hover:bg-gold/5 transition-all duration-300 group shadow-sm hover:shadow-md bg-white/50 dark:bg-white/5"><div className="flex items-start gap-4"><div className="w-6 h-6 rounded-full border border-royal/20 flex items-center justify-center mt-1 group-hover:border-gold"><div className="w-3 h-3 rounded-full bg-gold opacity-0 group-hover:opacity-100 transition-opacity"></div></div><span className="text-royal/80 dark:text-white/80 group-hover:text-royal text-sm md:text-base leading-relaxed">{option.text}</span></div></button>))}</div></div>
                                ) : (
                                    <div className="animate-[fadeIn_0.5s_ease-out]"><h4 className="text-2xl font-serif text-royal dark:text-white mb-6 text-center">Dernière étape</h4><p className="text-center text-royal/60 dark:text-white/60 mb-8 text-sm">Entrez vos coordonnées.</p><form onSubmit={handleQuizFormSubmit} className="space-y-4 max-w-md mx-auto"><div className="grid grid-cols-2 gap-4"><div><label className="block text-xs uppercase tracking-wider text-royal/60 mb-1">Prénom</label><input required type="text" value={quizState.formData.firstName} onChange={e => setQuizState({...quizState, formData: {...quizState.formData, firstName: e.target.value}})} className="w-full p-3 bg-white dark:bg-white/10 border border-royal/10 rounded-lg focus:border-gold outline-none shadow-inner" /></div><div><label className="block text-xs uppercase tracking-wider text-royal/60 mb-1">Nom</label><input required type="text" value={quizState.formData.lastName} onChange={e => setQuizState({...quizState, formData: {...quizState.formData, lastName: e.target.value}})} className="w-full p-3 bg-white dark:bg-white/10 border border-royal/10 rounded-lg focus:border-gold outline-none shadow-inner" /></div></div><div><label className="block text-xs uppercase tracking-wider text-royal/60 mb-1">Email</label><input required type="email" value={quizState.formData.email} onChange={e => setQuizState({...quizState, formData: {...quizState.formData, email: e.target.value}})} className="w-full p-3 bg-white dark:bg-white/10 border border-royal/10 rounded-lg focus:border-gold outline-none shadow-inner" /></div><button type="submit" className="w-full bg-royal text-white py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-gold transition-colors shadow-lg mt-4">Découvrir mon Dosha</button></form></div>
                                )
                            ) : (
                                <div className="animate-[fadeIn_0.5s_ease-out] text-center">
                                    <p className="font-serif text-xl italic text-royal/60 dark:text-white/60 mb-2">Bonjour {quizState.formData.firstName}, votre nature dominante est :</p>
                                    <h2 className={`text-5xl md:text-6xl font-serif font-bold mb-6 bg-clip-text text-transparent ${quizState.result.dominant.color?.replace('bg-', 'bg-') || 'text-royal'}`}>{quizState.result.dominant.name}</h2>
                                    <div className="flex justify-center gap-8 mb-8 text-sm text-royal/70 dark:text-white/70"><div className="flex flex-col items-center"><span className="font-bold">{quizState.result.percentages.vata}%</span><span>Vata</span></div><div className="flex flex-col items-center"><span className="font-bold">{quizState.result.percentages.pitta}%</span><span>Pitta</span></div><div className="flex flex-col items-center"><span className="font-bold">{quizState.result.percentages.kapha}%</span><span>Kapha</span></div></div>
                                    <div className="max-w-md mx-auto mb-8 bg-surface dark:bg-white/5 p-6 rounded-lg border border-royal/5 shadow-inner"><p className="text-royal/80 dark:text-white/80 italic leading-relaxed">{quizState.result.dominant.definition}</p></div>
                                    <div className="bg-gradient-to-br from-gold/10 to-royal/5 dark:from-white/10 p-6 rounded-brand mb-8 border border-gold/20"><h4 className="font-serif text-royal dark:text-white text-lg mb-2">Votre Rituel Recommandé</h4><div className="flex items-center gap-4 text-left"><div className="w-16 h-16 bg-white rounded-md shadow-sm bg-cover bg-center" style={{ backgroundImage: `url(${ASSETS.productVata})` }}></div><div><p className="font-bold text-royal dark:text-white">{quizState.result.dominant.productRecom || `Rituel ${quizState.result.dominant.name}`}</p><p className="text-xs text-royal/60 dark:text-white/60">Pour équilibrer votre nature {quizState.result.dominant.name}</p></div></div><button onClick={(e) => { addToCart({title: `Rituel ${quizState.result.dominant.name}`, price: "85.00 CAD", type: "Bundle Dosha", image: ASSETS.productVata}, e); setQuizState({...quizState, isOpen: false, result: null}); }} className="w-full mt-4 bg-gold text-white py-3 rounded-full uppercase tracking-widest text-xs font-bold hover:bg-royal transition-colors shadow-lg">Ajouter le Rituel au Panier</button></div>
                                    <button onClick={handleCloseQuizResult} className="text-royal/50 hover:text-royal uppercase tracking-widest text-xs font-bold border-b border-transparent hover:border-royal pb-1 transition-colors">Fermer et explorer le site</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
      )}

      {/* VIEW: MEDIA */}
      {view === 'MEDIA' && (
        <section className="media-view min-h-screen w-full opacity-0 pb-24 flex flex-col items-center dark:bg-[#050C1A] overflow-x-hidden pt-36">
             <div className="absolute top-36 left-6 md:left-12 z-20"><button onClick={handleBackClick} className="text-royal dark:text-white hover:text-gold transition-colors text-sm uppercase tracking-widest flex items-center gap-2 bg-white/50 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-royal/5 shadow-sm"><i className="fa-solid fa-arrow-left"></i> {text.media.back}</button></div>
             <div className="w-full max-w-7xl px-6 md:px-12 py-12 text-center relative z-10">
                <div className="mb-12"><span className="text-gold uppercase tracking-[0.2em] text-xs font-semibold block mb-2">{text.media.subtitle}</span><h2 className="text-4xl md:text-6xl font-serif text-royal dark:text-white uppercase tracking-widest text-shadow-sm leading-none">{text.media.title}</h2><div className="w-24 h-1 bg-gold mt-6 mx-auto shadow-sm"></div></div>
                
                <div className="flex flex-col-reverse lg:flex-row gap-16 w-full items-center justify-center">
                    {/* Left: Buttons */}
                    <div className="w-full lg:w-1/2 grid grid-cols-2 gap-6">
                        {text.media.sections?.map((item, idx) => (
                            <div key={idx} onClick={() => handleMediaSectionClick(item.id)} className="group cursor-pointer w-full h-full">
                                <div className="glass-depth rounded-brand aspect-square flex flex-col items-center justify-center p-6 transition-all duration-300 shadow-lg hover:shadow-glow transform hover:-translate-y-2 relative overflow-hidden bg-surface dark:bg-white/5 h-full">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="w-16 h-16 rounded-full bg-royal/5 dark:bg-white/5 flex items-center justify-center mb-4 text-royal dark:text-white group-hover:bg-royal group-hover:text-white transition-all duration-300 relative z-10 shadow-inner"><i className={`fa-solid ${item.icon} text-2xl`}></i></div>
                                    <h3 className="text-lg font-serif text-royal dark:text-white relative z-10">{item.label}</h3>
                                    <div className="w-8 h-[1px] bg-gold mt-3 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center relative z-10"></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Image */}
                    <div className="w-full lg:w-1/2 flex justify-center">
                         <div className="w-full aspect-square rounded-brand overflow-hidden shadow-2xl relative group glass-depth max-w-[500px]">
                             <img src="https://storage.googleapis.com/inspirata/Base%20site/Gemini_Generated_Image_2cz8f92cz8f92cz8.png" alt="Inspirata Media" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                             <div className="absolute inset-0 bg-gradient-to-t from-royal/20 to-transparent pointer-events-none"></div>
                         </div>
                    </div>
                </div>

                <div className="mt-12"><FooterSignature /></div>
            </div>
        </section>
      )}

      {/* EXPANDED MEDIA DETAIL */}
      {selectedMediaId && (
          <div ref={mediaExpandRef} className={`fixed inset-0 z-[60] bg-white dark:bg-[#0B1A36] flex flex-col overflow-y-auto`} style={{ clipPath: selectedMediaId === 'tv' ? 'circle(0% at 50% 50%)' : 'inset(0% 0% 0% 0%)', opacity: selectedMediaId === 'tv' ? 1 : 0 }}>
               {selectedMediaId === 'podcast' && (<div className="soundwave-container transition-overlay absolute inset-0 flex items-center justify-center z-[75] bg-white dark:bg-[#0B1A36] pointer-events-none"><div className="flex gap-2 h-32 items-center">{[...Array(9)].map((_, i) => (<div key={i} className="soundwave-bar w-3 bg-gradient-to-t from-gold to-gold-light rounded-full opacity-0" style={{ height: '20%' }}></div>))}</div></div>)}
               {selectedMediaId === 'tv' && (<div className="tv-transition transition-overlay absolute inset-0 z-[75] bg-black flex items-center justify-center pointer-events-none opacity-0"><div className="tv-beam w-full h-full bg-white opacity-0 blur-sm"></div></div>)}
               {selectedMediaId === 'book' && (<div className="book-shelf-transition transition-overlay absolute inset-0 z-[75] flex items-center justify-center bg-white dark:bg-[#0B1A36] pointer-events-none opacity-0"><div className="shelf-container flex items-end gap-1 justify-center relative">{[...Array(5)].map((_, i) => (<div key={i} className={`shelf-spine w-8 md:w-12 h-40 md:h-60 rounded-t-sm shadow-lg transform origin-bottom transition-all ${i === 2 ? 'shelf-spine-active bg-royal' : 'bg-royal/80'}`}><div className="w-full h-full border-r border-white/10 flex items-center justify-center"><div className="w-[1px] h-3/4 bg-gold/30"></div></div></div>))}</div></div>)}
               {selectedMediaId === 'blog' && (<div className="blog-transition transition-overlay absolute inset-0 z-[75] flex items-center justify-center bg-white dark:bg-[#0B1A36] pointer-events-none opacity-0"><svg width="300" height="150" viewBox="0 0 300 150" fill="none" xmlns="http://www.w3.org/2000/svg"><path className="pen-path" d="M20 100 C 50 80, 80 140, 110 90 S 160 40, 200 80 S 260 20, 290 60" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" strokeDasharray="1000" strokeDashoffset="1000" /></svg></div>)}

              <div className="sticky top-0 w-full flex justify-end p-8 z-20 bg-gradient-to-b from-white dark:from-[#0B1A36] to-transparent pointer-events-none">
                  <button onClick={closeMediaDetail} className="w-12 h-12 rounded-full bg-royal/5 dark:bg-white/5 hover:bg-royal hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm pointer-events-auto"><i className={`fa-solid ${selectedProduct || selectedPost || isAddingPost ? 'fa-arrow-left' : 'fa-times'} text-xl`}></i></button>
              </div>

              <div className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 pb-24 flex flex-col items-center justify-start pt-10">
                  {selectedMediaId === 'podcast' ? (
                      <div className="media-detail-content opacity-0 w-full max-w-7xl mx-auto flex flex-col gap-12 relative">
                          <div className="text-center relative">
                            <span className="bg-royal/5 dark:bg-white/5 text-royal dark:text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block shadow-sm">Podcast</span>
                            <h2 className="text-3xl md:text-5xl font-serif text-royal dark:text-white uppercase leading-tight mb-4">{text.media.details.podcast.title}</h2>
                            <p className="text-xl font-serif text-royal/70 dark:text-white/70 italic max-w-2xl mx-auto">{text.media.details.podcast.subtitle}</p>
                            {isAdmin && (<button onClick={(e) => handleShareClick({title: "Le Podcast Inspirata", subtitle: "Au-delà des tendances", image: ASSETS.logo}, e)} className="absolute top-0 right-0 z-30 w-10 h-10 rounded-full bg-white text-royal flex items-center justify-center shadow-lg hover:bg-gold hover:text-white transition-colors"><i className="fa-solid fa-share-nodes text-lg"></i></button>)}
                          </div>
                          <div className="w-full shadow-2xl rounded-[12px] overflow-hidden"><iframe style={{ borderRadius: '12px' }} src={text.media.details.podcast.spotifyUrl} width="100%" height="352" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-8">
                              <div className="bg-surface dark:bg-white/5 p-8 rounded-brand border border-royal/5 shadow-depth"><h3 className="font-serif text-2xl text-royal dark:text-white mb-6 flex items-center gap-2"><i className="fa-solid fa-star-of-life text-gold text-lg"></i> Au programme</h3><ul className="space-y-4">{text.media.details.podcast.points?.map((point, i) => (<li key={i} className="text-royal/80 dark:text-white/80 leading-relaxed text-sm md:text-base">{point}</li>))}</ul><a href={text.media.details.podcast.ctaLink} target="_blank" rel="noopener noreferrer" className="mt-8 text-gold font-bold text-xs uppercase tracking-widest border-b border-gold hover:text-royal transition-colors pb-1 inline-block">{text.media.details.podcast.cta} <i className="fa-solid fa-arrow-right ml-1"></i></a></div>
                              <div className="bg-royal dark:bg-white text-white dark:text-royal p-8 rounded-brand flex flex-col justify-center relative overflow-hidden shadow-depth"><div className="absolute top-0 right-0 w-32 h-32 bg-gold/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div><h3 className="font-serif text-2xl mb-2 relative z-10">{text.media.details.podcast.newsletter.title}</h3><p className="text-white/60 dark:text-royal/60 text-sm italic mb-6 relative z-10">{text.media.details.podcast.newsletter.subtitle}</p><p className="text-white/80 dark:text-royal/80 mb-6 text-sm relative z-10">{text.media.details.podcast.newsletter.desc}</p><div className="flex flex-col gap-3 relative z-10"><input type="email" placeholder="Email" className="bg-white/10 dark:bg-royal/10 border border-white/20 rounded-lg px-4 py-3 text-white dark:text-royal placeholder:text-white/40 focus:outline-none focus:border-gold transition-colors shadow-inner" /><button className="bg-gold text-royal dark:text-white font-bold uppercase tracking-widest text-xs py-3 rounded-lg hover:bg-white transition-colors shadow-md">{text.media.details.podcast.newsletter.button}</button></div></div>
                          </div>
                      </div>
                  ) : selectedMediaId === 'tv' ? (
                      <div className="media-detail-content opacity-0 w-full max-w-[90%] md:max-w-screen-2xl mx-auto">
                          <div className="text-center mb-16 sticky top-20 bg-white/95 dark:bg-[#0B1A36]/95 backdrop-blur z-30 py-4 shadow-sm"><h2 className="text-4xl md:text-6xl font-serif text-royal dark:text-white italic mb-6">{text.media.details.tv.title}</h2><p className="text-royal/70 dark:text-white/70 font-serif text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">{text.media.details.tv.desc}</p></div>
                          <div className="grid grid-cols-1 gap-16">
                              {text.media.details.tv.videos?.map((video, idx) => (
                                  <div key={idx} className="group cursor-pointer sticky top-24 z-10 mb-8 last:mb-0 bg-white dark:bg-white/5 rounded-brand shadow-depth p-4 border border-royal/5">
                                      <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-lg" onClick={() => setActiveVideoId(video.id)}>
                                          {activeVideoId === video.id ? (<iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`} title={video.title} frameBorder="0" allow="autoplay; encrypted-media; picture-in-picture" referrerPolicy="no-referrer" allowFullScreen className="w-full h-full"></iframe>) : (<><div className="absolute inset-0 bg-royal/90 flex items-center justify-center"><img src={ASSETS.logo} className="w-20 h-20 opacity-50 mb-2" alt="" /></div><div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/20 transition-colors"><div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform"><i className="fa-solid fa-play text-white ml-1"></i></div></div></>)}
                                      </div>
                                      <div className="mt-6 px-2 text-center"><h3 className="text-royal dark:text-white font-serif text-2xl group-hover:text-gold transition-colors">{video.title}</h3><span className="text-xs uppercase tracking-widest text-royal/40 dark:text-white/40 mt-2 block">Saison 3 - Épisode {idx + 1}</span></div>
                                      {isAdmin && (<div className="absolute top-2 right-2 z-20"><button onClick={(e) => handleShareClick(video, e)} className="w-8 h-8 rounded-full bg-white dark:bg-royal text-royal dark:text-white shadow-md hover:text-gold flex items-center justify-center transition-colors"><i className="fa-solid fa-share-nodes text-xs"></i></button></div>)}
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : selectedMediaId === 'blog' ? (
                     <div className="media-detail-content w-full max-w-7xl mx-auto opacity-0">
                         <div className="text-center mb-12 sticky top-20 bg-white/95 dark:bg-[#0B1A36]/95 backdrop-blur z-30 py-6 border-b border-royal/5"><h2 className="text-4xl md:text-6xl font-serif text-royal dark:text-white italic mb-4">{text.media.details.blog.title}</h2><p className="text-royal/60 dark:text-white/60 uppercase tracking-widest text-sm">{text.media.details.blog.subtitle}</p></div>
                         {isAddingPost && (
                            <div className="mb-12 bg-surface dark:bg-white/5 p-8 rounded-brand shadow-depth border border-royal/10">
                                <h3 className="font-serif text-2xl text-royal dark:text-white mb-6">Ajouter un nouvel article</h3>
                                <div className="space-y-4">
                                    <input type="text" placeholder="Titre de l'article" value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} className="w-full p-4 rounded-lg border border-royal/10 focus:border-gold outline-none shadow-inner bg-white dark:bg-white/10 text-royal dark:text-white" />
                                    <textarea placeholder="Contenu (HTML supporté)" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="w-full p-4 h-64 rounded-lg border border-royal/10 focus:border-gold outline-none font-sans shadow-inner bg-white dark:bg-white/10 text-royal dark:text-white"></textarea>
                                    <div className="border border-dashed border-royal/20 rounded-lg p-4 bg-white/50 dark:bg-white/5">
                                        <p className="text-sm text-royal/60 mb-2 font-bold uppercase tracking-wider">Images (Max 2)</p>
                                        <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-royal dark:text-white" />
                                        <div className="flex gap-4 mt-4">{newPostImages.map((img, i) => (<div key={i} className="w-20 h-20 bg-cover bg-center rounded-lg shadow-sm" style={{ backgroundImage: `url(${img})` }}></div>))}</div>
                                    </div>
                                    <div className="flex justify-end gap-4"><button onClick={() => setIsAddingPost(false)} className="px-6 py-2 text-royal/60 hover:text-royal">Annuler</button><button onClick={handleAddPost} className="px-8 py-2 bg-royal text-white rounded-full hover:bg-gold transition-colors shadow-md">Publier</button></div>
                                </div>
                            </div>
                         )}
                         {!selectedPost && !isAddingPost && (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 mt-8">
                                 {isAdmin && (<div onClick={() => setIsAddingPost(true)} className="group cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-royal/20 rounded-brand h-[400px] hover:border-gold transition-colors bg-white/30 dark:bg-white/5"><div className="w-16 h-16 rounded-full bg-royal/5 flex items-center justify-center mb-4 group-hover:bg-gold group-hover:text-white transition-colors"><i className="fa-solid fa-plus text-2xl text-royal dark:text-white"></i></div><span className="text-royal/60 dark:text-white/60 font-medium uppercase tracking-wider">Ajouter un article</span></div>)}
                                 {blogPosts.map((post) => (
                                     <div key={post.id} onClick={() => setSelectedPost(post)} className="group cursor-pointer relative perspective-1000">
                                         <div className="relative w-full aspect-[2/3] rounded-r-lg rounded-l-sm shadow-2xl transition-transform duration-500 group-hover:-translate-y-4 group-hover:rotate-1 transform-style-3d">
                                             <div className={`absolute inset-0 ${post.coverStyle} rounded-r-lg rounded-l-sm flex flex-col p-6 items-center justify-center text-center text-white border-l-4 border-white/10`}>
                                                 <div className="border border-white/30 p-4 w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
                                                     {post.images && post.images[0] && (<div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" style={{ backgroundImage: `url(${post.images[0]})` }}></div>)}
                                                     <div className="relative z-10 flex flex-col items-center"><i className="fa-solid fa-feather-pointed text-3xl mb-4 opacity-80 shadow-sm"></i><h3 className="font-serif text-xl md:text-2xl leading-tight mb-2 drop-shadow-md">{post.title}</h3>{post.subtitle && <p className="text-xs uppercase tracking-widest opacity-80 mt-2 border-t border-white/30 pt-2">{post.subtitle}</p>}</div>
                                                 </div>
                                             </div>
                                             <div className="absolute right-0 top-1 bottom-1 w-2 bg-white rounded-r-sm shadow-inner transform translate-x-[1px] -z-10"></div>
                                             {isAdmin && (
                                                <div className="absolute -top-3 -right-3 flex gap-2 z-50">
                                                   <button onClick={(e) => handleShareClick(post, e)} className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"><i className="fa-solid fa-share-nodes text-xs"></i></button>
                                                   <button onClick={(e) => handleDeletePost(post.id, e)} className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"><i className="fa-solid fa-trash text-xs"></i></button>
                                                </div>
                                             )}
                                         </div>
                                         <div className="text-center mt-4"><span className="text-xs text-royal/40 dark:text-white/40 uppercase tracking-widest font-bold">{post.date}</span></div>
                                     </div>
                                 ))}
                             </div>
                         )}
                         {selectedPost && (
                             <div className="product-view opacity-0 bg-white dark:bg-[#0B1A36] max-w-3xl mx-auto rounded-none md:rounded-lg shadow-depth p-8 relative">
                                 {isAdmin && (<button onClick={(e) => handleShareClick(selectedPost, e)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-royal/5 hover:bg-gold hover:text-white text-royal flex items-center justify-center transition-colors"><i className="fa-solid fa-share-nodes"></i></button>)}
                                 {selectedPost.images && selectedPost.images[0] && (<div className="w-full h-64 md:h-96 rounded-brand overflow-hidden mb-10 shadow-lg relative"><div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selectedPost.images[0]})` }}></div></div>)}
                                 <div className="text-center mb-10 border-b border-royal/10 pb-10"><span className="text-gold uppercase tracking-widest text-xs font-bold mb-4 block">{selectedPost.date}</span><h1 className="text-4xl md:text-5xl font-serif text-royal dark:text-white leading-tight mb-4">{selectedPost.title}</h1>{selectedPost.subtitle && <h2 className="text-xl md:text-2xl font-serif text-royal/60 dark:text-white/60 italic">{selectedPost.subtitle}</h2>}</div>
                                 <div className="relative">
                                     {selectedPost.images && selectedPost.images[1] && (<div className="float-right ml-6 mb-6 w-1/2 md:w-1/3 aspect-square rounded-brand overflow-hidden shadow-md border-4 border-white"><div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${selectedPost.images[1]})` }}></div></div>)}
                                     <div className="prose prose-lg prose-royal dark:prose-invert mx-auto font-sans leading-relaxed text-royal/80 dark:text-white/80" dangerouslySetInnerHTML={{ __html: selectedPost.content }}></div>
                                 </div>
                                 <div className="mt-16 pt-10 border-t border-royal/10 text-center"><button onClick={() => setSelectedPost(null)} className="text-royal dark:text-white hover:text-gold uppercase tracking-widest text-xs font-bold">Fermer le livre</button></div>
                             </div>
                         )}
                     </div>
                  ) : !selectedProduct ? (
                      <>
                        <div className="media-detail-content text-center mb-16"><h2 className="text-4xl md:text-6xl font-serif text-royal dark:text-white italic mb-4">{selectedMediaId === 'book' ? text.media.details.book.title : text.media.details.default.title}</h2><div className="w-24 h-1 bg-gold mx-auto mt-6 shadow-sm"></div></div>
                        {selectedMediaId === 'book' ? (
                            <div className="media-detail-content grid grid-cols-1 md:grid-cols-3 gap-10 w-full">
                                {text.media.details.book.items?.map((item, idx) => (
                                    <div key={idx} onClick={() => handleProductClick(item)} className={`flex flex-col items-center text-center group cursor-pointer ${item.status === 'locked' ? 'opacity-70 pointer-events-none' : ''}`}>
                                        <div className="w-full aspect-[1/1.2] rounded-r-brand rounded-l-md bg-[#f5f5f0] shadow-2xl relative mb-8 overflow-hidden transform transition-all duration-500 group-hover:-translate-y-4 group-hover:rotate-1 border-l-4 border-royal/10 group-hover:shadow-glow">
                                            {item.cover ? (<div className="absolute inset-0 bg-no-repeat bg-center" style={{ backgroundImage: `url(${item.cover})`, backgroundSize: '100% 100%' }}></div>) : (<div className="absolute inset-0 flex flex-col items-center justify-center p-6 border border-royal/5"><div className="w-full h-full border border-royal/10 flex flex-col items-center justify-center p-4">{item.status === 'locked' ? (<i className="fa-solid fa-lock text-4xl text-royal/20 mb-4"></i>) : (<><i className="fa-solid fa-leaf text-2xl text-gold mb-4 opacity-60"></i><h4 className="font-serif text-xl text-royal uppercase tracking-widest leading-relaxed">{item.title}</h4></>)}</div></div>)}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                                            {isAdmin && (<div className="absolute top-2 right-2 z-20"><button onClick={(e) => handleShareClick(item, e)} className="w-8 h-8 rounded-full bg-white dark:bg-royal text-royal dark:text-white shadow-md hover:text-gold flex items-center justify-center transition-colors"><i className="fa-solid fa-share-nodes text-xs"></i></button></div>)}
                                        </div>
                                        <h3 className="text-2xl font-serif text-royal dark:text-white mb-2 group-hover:text-gold transition-colors">{item.title}</h3><p className="text-sm text-royal/60 dark:text-white/60 uppercase tracking-wider">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (<div className="media-detail-content text-center py-20"><p className="text-royal/50 dark:text-white/50 text-xl font-serif italic">Contenu en préparation...</p></div>)}
                      </>
                  ) : (
                      <div className="product-view w-full opacity-0 relative animate-[fadeIn_0.5s_ease-out_forwards]">
                          {/* HERO HEADER - stylized window */}
                          <div className="w-full min-h-[50vh] flex flex-col items-center justify-center text-center mb-16 relative">
                               {isAdmin && (<button onClick={(e) => handleShareClick(selectedProduct, e)} className="absolute top-0 right-0 z-30 w-10 h-10 rounded-full bg-royal/5 hover:bg-gold hover:text-white text-royal flex items-center justify-center transition-colors"><i className="fa-solid fa-share-nodes"></i></button>)}
                               <span className="text-gold uppercase tracking-[0.3em] text-xs font-bold mb-4 animate-[slideUp_0.8s_ease-out]">{selectedProduct.type || 'Collection'}</span>
                               <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-royal dark:text-white leading-none mb-6 animate-[slideUp_1s_ease-out] text-shadow-sm">{selectedProduct.fullTitle || selectedProduct.title}</h1>
                               {selectedProduct.subtitle && <h2 className="text-xl md:text-3xl font-serif text-royal/60 dark:text-white/60 italic max-w-2xl mx-auto animate-[slideUp_1.2s_ease-out]">{selectedProduct.subtitle}</h2>}
                               <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-gold to-transparent mt-12 opacity-50"></div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-start max-w-7xl mx-auto">
                              {/* LEFT COLUMN: 3D Book or Image */}
                              <div className="product-image-container relative flex justify-center perspective-1000 h-[600px] items-center">
                                  {selectedProduct.title?.includes("Livre") || selectedProduct.title?.includes("Book") || selectedMediaId === 'book' ? (
                                     <div className="book-scene w-[380px] md:w-[500px] aspect-[1/1.2] cursor-pointer" onClick={() => setBookOpen(!bookOpen)}>
                                         <div className={`book-wrap ${bookOpen ? 'is-open' : ''}`}>
                                             <div className="book-cover">
                                                 <div className="book-cover-front" style={{ backgroundImage: `url(${selectedProduct.cover})`, backgroundSize: '100% 100%' }}></div>
                                                 <div className="book-cover-back" style={{ backgroundImage: selectedProduct.previewPages ? `url(${selectedProduct.previewPages[0]})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#fff' }}></div>
                                             </div>
                                             <div className="book-page flex flex-col p-6 items-center justify-center text-center" style={{ backgroundImage: selectedProduct.previewPages ? `url(${selectedProduct.previewPages[1]})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                                                 {!selectedProduct.previewPages && (
                                                     <>
                                                         <h3 className="font-serif text-xl text-royal mb-4">{selectedProduct.title}</h3>
                                                         <p className="text-[10px] text-justify text-royal/70 leading-relaxed overflow-hidden h-full font-serif">
                                                            {selectedProduct.longDesc || selectedProduct.shortDesc}
                                                            <br/><br/>
                                                            ...
                                                         </p>
                                                         <span className="text-[8px] uppercase tracking-widest text-royal/40 mt-auto">{selectedProduct.price}</span>
                                                     </>
                                                 )}
                                             </div>
                                             <div className="book-back"></div>
                                         </div>
                                     </div>
                                  ) : (
                                     <div className="w-[300px] md:w-[350px] aspect-[2/3] relative shadow-2xl rounded-brand overflow-hidden group">
                                         <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selectedProduct.cover || selectedProduct.image})` }}></div>
                                         <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                     </div>
                                  )}
                              </div>

                              {/* RIGHT COLUMN: Info & Cart */}
                              <div className="flex flex-col text-left space-y-8 py-8">
                                  <div className="flex items-center gap-4 text-xs font-bold tracking-widest text-gold uppercase"><span className="bg-royal/5 dark:bg-white/5 px-3 py-1 rounded-full shadow-sm">{selectedProduct.type || 'Produit'}</span>{selectedProduct.reviews && (<div className="flex items-center gap-1 text-royal dark:text-white"><i className="fa-solid fa-star text-gold text-[10px]"></i><span>{selectedProduct.reviews}</span></div>)}</div>
                                  {selectedProduct.price && <p className="text-3xl font-medium text-royal dark:text-white">{selectedProduct.price}</p>}
                                  
                                  {selectedProduct.shortDesc && (<div className="prose prose-lg prose-royal dark:prose-invert text-royal/70 dark:text-white/70 leading-relaxed font-sans whitespace-pre-line border-l-2 border-gold/30 pl-6">{selectedProduct.shortDesc}</div>)}
                                  
                                  {selectedProduct.features && (<div className="flex flex-wrap gap-3 py-4">{selectedProduct.features.map((feature, i) => (<span key={i} className="px-5 py-2 border border-royal/10 dark:border-white/10 rounded-full text-xs uppercase tracking-wider text-royal/70 dark:text-white/70 flex items-center gap-2 shadow-sm bg-white/50 dark:bg-white/5"><i className="fa-solid fa-check text-gold"></i> {feature}</span>))}</div>)}
                                  
                                  <div className="flex gap-4 pt-6">
                                      <button onClick={(e) => addToCart(selectedProduct, e)} className="flex-1 bg-royal dark:bg-white text-white dark:text-royal py-5 rounded-brand hover:bg-gold hover:text-white transition-all shadow-lg hover:shadow-glow uppercase tracking-widest text-sm font-bold transform hover:-translate-y-1">Ajouter au panier</button>
                                  </div>
                                  
                                  {selectedProduct.longDesc && (<div className="mt-8 pt-8 border-t border-royal/10 dark:border-white/10"><h3 className="font-serif text-2xl text-royal dark:text-white mb-4">L'Essence</h3><p className="text-royal/60 dark:text-white/60 text-base leading-relaxed whitespace-pre-line">{selectedProduct.longDesc}</p></div>)}
                              </div>
                          </div>

                          {/* WOW REVIEWS SECTION */}
                          {selectedProduct.detailedReviews && (
                              <div className="w-full mt-32 relative">
                                  <div className="text-center mb-16"><h3 className="text-3xl font-serif text-royal dark:text-white italic">Ce qu'elles en disent</h3><div className="w-16 h-1 bg-gold mx-auto mt-4 opacity-50"></div></div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                                      {selectedProduct.detailedReviews.map((review, i) => (
                                          <div key={i} className="glass-depth p-8 rounded-brand shadow-lg relative mt-4 md:mt-0 transform transition-transform hover:-translate-y-2 duration-300">
                                              <div className="absolute -top-4 left-8 text-4xl text-gold opacity-30 font-serif">"</div>
                                              <div className="flex text-gold mb-4 text-xs gap-1">{[...Array(review.rating)].map((_, r) => <i key={r} className="fa-solid fa-star"></i>)}</div>
                                              <p className="text-royal/80 dark:text-white/80 italic font-serif text-lg mb-6 leading-relaxed">"{review.text}"</p>
                                              <p className="text-xs font-bold uppercase tracking-widest text-royal/40 dark:text-white/40">{review.user}</p>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* Close Button at bottom */}
                          <div className="text-center mt-24 pb-12"><button onClick={closeMediaDetail} className="text-royal/40 dark:text-white/40 hover:text-gold uppercase tracking-widest text-xs font-bold transition-colors border-b border-transparent hover:border-gold pb-1">Retourner à la collection</button></div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {gemResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-royal/20 backdrop-blur-md transition-opacity duration-300" onClick={() => setGemResult(null)}>
            <div className="glass-depth max-w-lg w-full rounded-brand p-10 shadow-2xl relative overflow-hidden animate-[fadeIn_0.4s_ease-out]" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setGemResult(null)} className="absolute top-6 right-6 text-royal/30 hover:text-royal"><i className="fa-solid fa-times text-xl"></i></button>
                <div className="flex flex-col items-center mb-6"><img src={ASSETS.logo} alt="Inspirata" className="h-10 w-auto mb-4 opacity-80" /><h3 className="font-serif text-3xl text-royal dark:text-white italic">{text.gem.modalTitle}</h3></div>
                <div className="prose text-center font-medium font-serif text-lg"><p>{gemResult}</p></div>
                <div className="mt-8 text-center"><div className="w-16 h-1 bg-gradient-to-r from-transparent via-gold to-transparent mx-auto opacity-50"></div></div>
            </div>
        </div>
      )}

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdminLogin(false)}>
             <div className="bg-white dark:bg-[#0B1A36] p-8 rounded-brand shadow-2xl w-full max-w-md border border-royal/10" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <i className="fa-solid fa-lock text-3xl text-gold mb-4"></i>
                    <h3 className="text-2xl font-serif text-royal dark:text-white">Accès Admin</h3>
                </div>
                <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()} className="w-full p-4 border border-royal/10 rounded-lg mb-4 bg-surface dark:bg-white/5 text-royal dark:text-white focus:border-gold outline-none text-center tracking-widest" placeholder="Mot de passe" autoFocus />
                <button onClick={handleAdminLogin} className="w-full bg-royal dark:bg-gold text-white dark:text-royal py-3 rounded-lg font-bold uppercase tracking-widest hover:opacity-90 transition-opacity">Entrer</button>
             </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareModal.open && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShareModal({...shareModal, open: false})}>
            <div className="bg-white dark:bg-[#0B1A36] w-full max-w-2xl rounded-brand shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="w-full md:w-1/2 bg-gray-100 flex items-center justify-center relative bg-cover bg-center h-64 md:h-auto" style={{ backgroundImage: `url(${shareModal.image})` }}>
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>
                <div className="w-full md:w-1/2 p-8 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-serif text-2xl text-royal dark:text-white">Partager</h3>
                        <button onClick={() => setShareModal({...shareModal, open: false})}><i className="fa-solid fa-times text-royal/40 hover:text-royal text-xl"></i></button>
                    </div>
                    <div className="flex-1 mb-4 relative">
                         {isGeneratingShare ? (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-gold">
                                 <i className="fa-solid fa-sparkles fa-spin text-2xl mb-2"></i>
                                 <span className="text-xs uppercase tracking-widest">Génération IA...</span>
                             </div>
                         ) : (
                             <textarea value={shareModal.text} onChange={(e) => setShareModal({...shareModal, text: e.target.value})} className="w-full h-full min-h-[200px] p-4 bg-surface dark:bg-white/5 border border-royal/10 rounded-lg resize-none focus:border-gold outline-none text-sm leading-relaxed text-royal dark:text-white font-sans"></textarea>
                         )}
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 mt-4">
                        <button onClick={handleFacebookShare} disabled={isGeneratingShare} className="flex-1 bg-[#1877F2] text-white py-3 rounded-lg font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md">
                            <i className="fa-brands fa-facebook-f"></i> Facebook
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(shareModal.text); alert("Texte copié !"); }} disabled={isGeneratingShare} className="flex-1 bg-royal dark:bg-gold text-white dark:text-royal py-3 rounded-lg font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md">
                            <i className="fa-regular fa-copy"></i> Copier
                        </button>
                    </div>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);