import { Language, ContentData } from './types';

export const CONTENT: Record<Language, ContentData> = {
  fr: {
    timeline: {
      title: "Retour au Point d'Origine",
      subtitle: "Une sagesse de 5 000 ans, dans votre réalité d'aujourd'hui.",
      footerText: "12 semaines pour comprendre les messages du corps, retrouver ce qui nous appartient, ancrer les rituels qui tiennent, et revenir au point d'origine.",
      pillars: [
        { 
          title: "Pilier I",
          subtitle: "Ce que le corps essaie de dire", 
          range: "SEMAINES 1 À 4", 
          description: "**Calmer le bruit** pour **entendre ce qui est là**. D'où viennent vos décisions? Qu'est-ce que le corps essaie de dire? L'Ayurveda donne les premiers mots pour le nommer. Le premier geste : **écouter avant d'agir**.<br/><br/><span class=\"block mt-6 font-script text-[1.75rem] md:text-4xl text-[#BF5700] dark:text-copper-light leading-tight\">Après quatre semaines, les signaux que le corps envoie depuis des mois deviennent lisibles. La confusion se dissipe. Ce qui semblait flou porte un nom.</span>" 
        },
        { 
          title: "Pilier II",
          subtitle: "Ce qui vous appartient vraiment", 
          range: "SEMAINES 5 À 8", 
          description: "**Retirer ce qui encombre**, **poser ce qui soutient**. Faire le tri entre ce qui est à vous et ce que l'on vous a imposé. L'Ayurveda éclaire ce qui **nourrit vraiment**. La Dinacharya — l'art ancestral de s'accorder aux rythmes du jour — devient **votre charpente**.<br/><br/><span class=\"block mt-6 font-script text-[1.75rem] md:text-4xl text-[#BF5700] dark:text-copper-light leading-tight\">Les gestes qui ne vous appartiennent pas tombent. Ceux qui vous soutiennent se posent. Le tri entre ce que l'on vous a imposé et ce qui est juste pour vous devient clair. Le matin change.</span>" 
        },
        { 
          title: "Pilier III",
          subtitle: "Le retour au point d'origine", 
          range: "SEMAINES 9 À 12", 
          description: "Installer la **capacité de retour**. Les **saisons comme boussole**. Ce qui reste quand le parcours se termine. La boussole est rétablie — **l'expérience continue en vous**. Les repères restent. **Le corps s'en souvient**.<br/><br/><span class=\"block mt-6 font-script text-[1.75rem] md:text-4xl text-[#BF5700] dark:text-copper-light leading-tight\">La lecture tient seule. Les saisons deviennent votre boussole. Le parcours se termine, la capacité reste. Le corps s'en souvient.</span>" 
        }
      ]
    },
    audio: {
      title: "Écoutez l'audio spécial Origine",
      subtitle: "19 minutes. Pas de texte, pas de plan. Juste un élan. Pourquoi Expérience Origine ne pouvait pas attendre.",
      url: "https://storage.googleapis.com/origine1/AUDIO%20V3%20Expe%CC%81rience%20origine%20audio%20%20-%202026-02-28%2C%201.37%E2%80%AFPM.mp3",
      tracks: [],
      items: []
    },
    grimoire: {
      items: [],
      chapters: []
    },
    about: {
      title: "KRYSTINE ST-LAURENT",
      achievements: "Auteure de 3 livres de référence, conférencière internationale et fondatrice de l'écosystème Inspirata Ayurveda."
    },
    pricing: {
        guarantee: {
            badge: 'Badge', 
            title: 'Title', 
            text: 'Text'
        }
    }
  },
  en: {
    timeline: {
      title: "Return to the Point of Origin",
      subtitle: "Ayurveda as a backdrop. A millennial wisdom that gives words to understand what the body already carries.",
      footerText: "12 weeks to understand the body's messages, reclaim what belongs to us, and return to our origin.",
      pillars: [
        { 
          title: "Pillar I",
          subtitle: "What the body is trying to say", 
          range: "WEEKS 1 TO 4", 
          description: "Quiet the noise to hear what is there. Where do your decisions come from? What is the body trying to say? Ayurveda gives the first words to name it." 
        },
        { 
          title: "Pillar II",
          subtitle: "What truly belongs to you", 
          range: "WEEKS 5 TO 8", 
          description: "Remove what clutters, establish what supports. Sort between what is yours and what was imposed on you. Ayurveda illuminates what truly nourishes." 
        },
        { 
          title: "Pillar III",
          subtitle: "The return to the origin", 
          range: "WEEKS 9 TO 12", 
          description: "Install the capacity to return. Seasons as a compass. What remains when the program ends. The compass is restored — the experience continues within you." 
        }
      ]
    },
    audio: {
      title: "Listen to a sample",
      subtitle: "Dive into the soundscape.",
      url: "https://storage.googleapis.com/origine1/AUDIO%20V3%20Expe%CC%81rience%20origine%20audio%20%20-%202026-02-28%2C%201.37%E2%80%AFPM.mp3",
      tracks: [],
      items: []
    },
    grimoire: {
      items: [],
      chapters: []
    },
    about: {
      title: "KRYSTINE ST-LAURENT",
      achievements: "Author of 3 reference books, international speaker and founder of the Inspirata Ayurveda ecosystem."
    },
    pricing: {
        guarantee: {
            badge: 'Badge', 
            title: 'Title', 
            text: 'Text'
        }
    }
  }
};
