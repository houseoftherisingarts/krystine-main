
import { GlobalContent } from './types';

export const CONTENT: GlobalContent = {
  nav: {
    brand: "KRYSTINE ST-LAURENT",
    buttons: {
      cta: { fr: "S'inscrire", en: "Register" },
      learnMore: { fr: "Le Programme", en: "The Program" },
      login: { fr: "Espace Membre", en: "Member Area" }
    }
  },
  buttons: {
    subscribe: { fr: "S'inscrire", en: "Subscribe" },
    next: { fr: "Suivant", en: "Next" }
  },
  hero: {
    title: {
      fr: "SAISON VATA",
      en: "VATA SEASON"
    },
    subtitle: {
      fr: "Un parcours d'ancrage de 7 semaines, inspiré de l’Ayurveda, pour calmer le trop-plein de mouvement, soutenir le système nerveux et mieux traverser la saison VATA.",
      en: "A 7-week grounding journey, inspired by Ayurveda, to calm the overflow of movement, support the nervous system, and better navigate the VATA season."
    },
    tagline: {
      fr: "Stabilité • Ancrage • Sérénité",
      en: "Stability • Grounding • Serenity"
    },
    bullets: [
      { fr: "Programme autonome, déjà entièrement disponible.", en: "Self-paced program, fully available now." },
      { fr: "Accès dès maintenant, vous avancez à votre rythme.", en: "Instant access, proceed at your own pace." },
      { fr: "Tarif Solstice jusqu’au 7 janvier.", en: "Solstice rate until January 7th." }
    ],
    buttons: {
      essential: { fr: "Rejoindre VATA Essentiel", en: "Join VATA Essential" },
      premium: { fr: "Rejoindre VATA + Grande Bibliothèque", en: "Join VATA + Great Library" }
    }
  },
  diagnosis: {
    title: {
      fr: "Quand le rythme intérieur s’emballe",
      en: "When the inner rhythm races"
    },
    subtitle: {
      fr: "Est-ce que cela semble familier ?",
      en: "Does this sound familiar?"
    },
    items: [
      {
        id: 'mind',
        icon: 'BrainCircuit',
        title: { fr: "La tête toujours en avance", en: "The mind always ahead" },
        description: {
          fr: "Le corps est là, mais la tête est déjà ailleurs – en train de gérer la prochaine décision, le prochain imprévu, la prochaine liste.",
          en: "The body is here, but the mind is already elsewhere – managing the next decision, the next surprise, the next list."
        }
      },
      {
        id: 'night',
        icon: 'Moon',
        title: { fr: "Les nuits qui ne reposent plus", en: "Nights that no longer rest" },
        description: {
          fr: "Vous vous réveillez au milieu de la nuit, comme si le cerveau reprenait le relais alors que le corps demande une pause.",
          en: "You wake up in the middle of the night, as if the brain is taking over while the body asks for a break."
        }
      },
      {
        id: 'body',
        icon: 'BatteryCharging',
        title: { fr: "Le corps qui suit tant bien que mal", en: "The body struggling to keep up" },
        description: {
          fr: "Digestion capricieuse, tensions, fatigue diffuse : le corps encaisse les variations de rythme sans vraiment se déposer.",
          en: "Capricious digestion, tension, diffuse fatigue: the body takes the rhythm variations without really settling down."
        }
      },
      {
        id: 'space',
        icon: 'Layout',
        title: { fr: "Les journées sans espace pour vous", en: "Days with no space for you" },
        description: {
          fr: "Entre travail, proches, obligations, il reste très peu de place pour vous recentrer, even minutes.",
          en: "Between work, loved ones, obligations, there is very little room to center yourself, even for a few minutes."
        }
      }
    ],
    situations: [], 
    closing: {
      fr: "Nous avons besoin de revenir à un rythme naturel.|Krystine St-Laurent",
      en: "We need to return to a natural rhythm.|Krystine St-Laurent"
    }
  },
  context: {
    title: {
      fr: "Ce que propose l'expérience Ayurveda, Saison VATA",
      en: "What the Ayurveda VATA Season Experience Offers"
    },
    subtitle: {
      fr: "7 semaines pour calmer les turbulences intérieures, malgré le mouvement intense de l'extérieur.",
      en: "7 weeks to calm inner turbulence, despite the intense movement from the outside."
    },
    items: [
      {
        title: { fr: "Revenir au souffle", en: "Return to the breath" },
        description: { 
          fr: "Des pratiques guidées de respiration pour adoucir l’agitation intérieure et créer de vrais moments de pause.", 
          en: "Guided breathing practices to soften inner agitation and create real moments of pause." 
        },
        icon: "Wind"
      },
      {
        title: { fr: "Réguler par les 5 sens", en: "Regulate through the 5 senses" },
        description: { 
          fr: "Chaque semaine, un sens au centre (ouïe, vue, odorat, goût, toucher) avec un rituel ciblé pour diminuer la surcharge.", 
          en: "Each week, a sense at the center (hearing, sight, smell, taste, touch) with a targeted ritual to reduce overload." 
        },
        icon: "Ear"
      },
      {
        title: { fr: "Ajuster le rythme", en: "Adjust rhythm" },
        description: { 
          fr: "Des repères pour le sommeil, la digestion et les moments de repos, afin de mieux supporter cette période plus mobile de l’année.", 
          en: "Benchmarks for sleep, digestion, and moments of rest, to better support this more mobile period of the year." 
        },
        icon: "Moon"
      }
    ]
  },
  inclusions: {
    title: { fr: "Concrètement, ce que VATA vient apaiser", en: "Concretely, what VATA comes to soothe" },
    subtitle: { fr: "Tout ce à quoi vous avez accès dès votre inscription.", en: "Everything you have access to as soon as you register." },
    items: [
        { 
          fr: "<span class=\"glow-highlight\">Sortir du mode « je tiens comme je peux »</span> et se donner un environnement propice pour revenir au centre.", 
          en: "<span class=\"glow-highlight\">Exit the 'holding on as best I can' mode</span> and create a supportive environment to return to center." 
        },
        { 
          fr: "Découvrir ou choisir quelques rituels qui viennent bercer le système nerveux et impactent le <span class=\"glow-highlight\">sommeil</span>, la <span class=\"glow-highlight\">digestion</span> et l’<span class=\"glow-highlight\">énergie</span> choisie du jour.", 
          en: "Discover or choose rituals that soothe the nervous system and impact <span class=\"glow-highlight\">sleep</span>, <span class=\"glow-highlight\">digestion</span>, and <span class=\"glow-highlight\">energy</span>." 
        },
        { 
          fr: "Mieux comprendre et entendre les <span class=\"glow-highlight\">signaux du corps</span>, et ajuster son art de vivre en fonction de ce qui est vraiment <span class=\"glow-highlight\">nécessaire</span>.", 
          en: "Better understand and hear <span class=\"glow-highlight\">body signals</span>, and adjust your lifestyle based on what is truly <span class=\"glow-highlight\">necessary</span>." 
        },
        { 
          fr: "Se donner, <span class=\"glow-highlight\">semaine après semaine</span>, un art de vivre ancestral qui se dépose concrètement dans le quotidien, comme un <span class=\"glow-highlight\">rendez-vous attendu</span> dans la boîte courriel.", 
          en: "Experience a <span class=\"glow-highlight\">week-by-week</span> ancestral lifestyle that settles into daily life, like an <span class=\"glow-highlight\">awaited appointment</span>." 
        }
    ]
  },
  experience: {
    title: { fr: "CHOISISSEZ VOTRE PARCOURS", en: "CHOOSE YOUR JOURNEY" },
    cards: [
      {
        title: { fr: "VATA Essentiel", en: "VATA Essential" },
        intro: {
          fr: "Le camp de base pour un système nerveux surchargé.",
          en: "The base camp for an overloaded nervous system."
        },
        image: "https://storage.googleapis.com/inspirata/Vata/2%20expe%CC%81rience%20vata%20.png",
        bullets: [
          { fr: "7 modules – 7 semaines (plus 1 semaine d’introduction)", en: "7 modules – 7 weeks (plus 1 intro week)" },
          { fr: "18 capsules d’accompagnement audio pour les différents modules", en: "18 audio accompaniment capsules for the different modules" },
          { fr: "7 méditations pré-enregistrées, une par semaine", en: "7 pre-recorded meditations, one per week" },
          { fr: "19 rituels guidés", en: "19 guided rituals" },
          { fr: "Guide PDF de 204 pages, intégré à l’ensemble, comme repère écrit pour vos rituels, recettes et saisons.", en: "204-page PDF guide, integrated into the set, as a written reference for your rituals, recipes, and seasons." },
          { fr: "Accès à la communauté : Un espace d’échanges dédié sous les capsules, dans la plateforme Vata, pour déposer vos questions, observations et partages au fil des semaines.", en: "Community access: A dedicated exchange space under the capsules, in the Vata platform, to post your questions, observations, and shares over the weeks." }
        ],
        price: { fr: "497 $", en: "$497" },
        promoPrice: { fr: "397 $", en: "$397" },
        promoLabel: { fr: "prix spécial solstice jusqu'au 7 janvier", en: "special solstice price until January 7th" },
        buttonText: { fr: "Rejoindre VATA Essentiel", en: "Join VATA Essential" },
        url: "https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT",
        isPremium: false
      },
      {
        title: { fr: "VATA + Grande Bibliothèque", en: "VATA + Great Library" },
        intro: {
          fr: "Le coffre au trésor pour entrer dans Vata et l’Ayurveda, puis y revenir au fil des saisons.",
          en: "The treasure chest to enter Vata and Ayurveda, then return to it throughout the seasons."
        },
        image: "https://storage.googleapis.com/inspirata/Vata/2%20grande%20bibliothe%CC%80que%20no%20background%20ici%20alex.png",
        bullets: [
          { fr: "Tout ce qui inclus dans VATA Essentiel.", en: "Everything included in VATA Essential." },
          { fr: "Série « Santé la vie » : 2 saisons complètes (19 épisodes tournés pour la télé) sur le stress, le sommeil, la digestion, les saisons et les doshas (VATA, PITTA, KAPHA), inédites et non disponibles ailleurs.", en: "« Santé la vie » series: 2 full seasons (19 TV episodes) on stress, sleep, digestion, seasons, and doshas (VATA, PITTA, KAPHA)." },
          { fr: "Capsules « Rituels essentiels » : Ayurveda, automassage, soins du nez, de la bouche, des mains et des pieds.", en: "« Essential Rituals » capsules: Ayurveda, self-massage, nose, mouth, hand, and foot care." },
          { fr: "Masterclass Dharma – Précisez votre mission, ajustez votre feu intérieur et découvrez 8 clés concrètes pour avancer chaque jour avec énergie et cohérence.", en: "Dharma Masterclass – Clarify your mission, adjust your inner fire, and discover 8 concrete keys to move forward daily with energy and consistency." },
          { fr: "Masterclass Aromathérapie – Réduire le stress avec l’aromathérapie & l’Ayurveda : savoir comment retrouver son centre, créer un sentiment d’apaisement, s’envelopper de sérénité et réduire l’impact d’un stress un peu trop à l’aise de s’inviter… un peu trop souvent.", en: "Aromatherapy Masterclass – Reduce stress with aromatherapy & Ayurveda: know how to find your center, create a sense of calm, and wrap yourself in serenity." },
          { fr: "Accès à la Grande Bibliothèque tant que la plateforme est en ligne.", en: "Access to the Great Library as long as the platform is online." }
        ],
        price: { fr: "797 $", en: "$797" },
        promoPrice: { fr: "597 $", en: "$597" },
        promoLabel: { fr: "Prix Solstice jusqu’au 7 janvier", en: "Solstice Price until January 7th" },
        buttonText: { fr: "Rejoindre VATA + Grande Bibliothèque", en: "Join VATA + Great Library" },
        url: "https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT",
        isPremium: true
      }
    ]
  },
  testimonials: {
    title: { fr: "Elles l'ont vécu", en: "They Experienced It" },
    subtitle: { fr: "Témoignages de la communauté", en: "Community Testimonials" },
    items: [
      {
        quote: {
          fr: "J’étais en mode alerte en continu : proche aidante, travail, famille… La nuit, je me réveillais vers 3 h, et la tête déjà repartie. Avec VATA, le simple fait d’avoir un fil sur 7 semaines m’a permis de reprendre prise sur mes soirées. Mes nuits sont plus réparatrices. Je me lève moins vidée et je sais quoi faire quand je sens que ça recommence à s’emballer.",
          en: "I was in constant alert mode: caregiver, work, family... At night, I woke up around 3 am, with my head already racing. With VATA, simply having a thread over 7 weeks allowed me to regain control of my evenings."
        },
        author: "Sonia T.",
        role: { fr: "52 ans, maman d’ados et proche aidante", en: "52 years old, mom of teens and caregiver" }
      },
      {
        quote: {
          fr: "Comme entrepreneure, je vivais avec 15 onglets ouverts dans mon cerveau. Mon corps suivait “tant bien que mal” : digestion lourde, tensions, impression d’être toujours en retard sur quelque chose. Les semaines sur les sens ont été un déclic. J’ai ajusté ce que je laisse entrer (bruits, écrans, lumières) et le rythme de mes repas. C’est fou ce qu’un changement de 1% sur nos choix peut faire comme différence !",
          en: "As an entrepreneur, I lived with 15 tabs open in my brain. My body followed 'as best it could'... The weeks on the senses were a click. It's crazy what a 1% change in our choices can make!"
        },
        author: "Julie B.",
        role: { fr: "Entrepreneure à grande tendance VATA", en: "Entrepreneur with high VATA tendency" }
      },
      {
        quote: {
          fr: "J’ai fait beaucoup de formations, j’avais l’habitude de consommer du contenu, empiler les connaisssances. Krystine a une façon unique, réellement, d’enseigner et d’accompagner. Ses connaissances ne partent pas du mental, mais du coeur et elle nous y ramène souvent. Wow. Je n’ai qu’un mot: GRATITUDE.",
          en: "I have taken many courses... Krystine has a unique way of teaching and accompanying. Her knowledge doesn't start from the mind, but from the heart. Wow. Just one word: GRATITUDE."
        },
        author: "Caroline P.",
        role: { fr: "Mère de 4 enfants au mental à tendance surchargé", en: "Mother of 4 with a tendency for an overloaded mind" }
      }
    ]
  },
  program: {
    title: {
      fr: "LE PARCOURS DE 7 SEMAINES",
      en: "THE 7-WEEK JOURNEY"
    },
    subtitle: {
      fr: "Inspiré de l'Ayurveda, un fil conducteur pour traverser la saison VATA ( froide et sèche) avec plus de stabilité intérieure",
      en: "Inspired by Ayurveda, a common thread to navigate the VATA season (cold and dry) with more inner stability"
    },
    phases: [
      {
        id: 0,
        title: { fr: "L’Espace Sacré", en: "The Sacred Space" },
        description: {
          fr: "Poser les bases et créer un environnement qui soutient le retour vers soi.",
          en: "Lay the foundations and create an environment that supports returning to oneself."
        },
        icon: "Stars"
      },
      {
        id: 1,
        title: { fr: "Le Souffle", en: "The Breath" },
        description: {
          fr: "Explorer la respiration comme soutien pour apaiser le système nerveux.",
          en: "Explore breathing as support to soothe the nervous system."
        },
        icon: "Wind"
      },
      {
        id: 2,
        title: { fr: "Le Silence Intérieur", en: "Inner Silence" },
        description: {
          fr: "Le son, le silence et l’ouïe comme repères pour calmer le mental.",
          en: "Sound, silence, and hearing as benchmarks to calm the mind."
        },
        icon: "Ear"
      },
      {
        id: 3,
        title: { fr: "Regard & Repos", en: "Gaze & Rest" },
        description: {
          fr: "Alléger la fatigue visuelle et mentale liée à ce que l’on regarde chaque jour.",
          en: "Alliate visual and mental fatigue related to what we watch every day."
        },
        icon: "Eye"
      },
      {
        id: 4,
        title: { fr: "L’Essence des Sens", en: "Essence of Senses" },
        description: {
          fr: "Approcher l’odorat comme allié pour apaiser le mental et ramener de la douceur.",
          en: "Approach smell as an ally to soothe the mind and bring back softness."
        },
        icon: "Flower2"
      },
      {
        id: 5,
        title: { fr: "Nourrir sa Force", en: "Nourish Your Strength" },
        description: {
          fr: "Ajuster l’alimentation pour soutenir l’humeur et l’énergie au quotidien.",
          en: "Adjust diet to support mood and energy daily."
        },
        icon: "Apple"
      },
      {
        id: 6,
        title: { fr: "Le toucher comme ancrage", en: "Touch as Grounding" },
        description: {
          fr: "Découvrir les rituels ancestraux pour apaiser, réchauffer et enraciner.",
          en: "Discover ancestral rituals to soothe, warm, and ground yourself."
        },
        icon: "Hand"
      },
      {
        id: 7,
        title: { fr: "Régénération & Longévité", en: "Regeneration & Longevity" },
        description: {
          fr: "Intégrer ce qui a été exploré et installer des gestes qui soutiennent le système dans le temps.",
          en: "Integrate what has been explored and install gestures that support the system over time."
        },
        icon: "Waves"
      }
    ]
  },
  pricing: {
    title: {
      fr: "CHOISISSEZ VOTRE PARCOURS",
      en: "CHOOSE YOUR JOURNEY"
    },
    promoDeadline: {
      fr: "Prix spécial Solstice jusqu'au 7 janvier",
      en: "Special Solstice price until January 7th"
    },
    tiers: [
      {
        name: { fr: "VATA – Essentiel", en: "VATA – Essential" },
        price: { fr: "497 $", en: "$497" },
        promoPrice: { fr: "397 $", en: "$397" },
        description: {
          fr: "Le camp de base pour un système nerveux surchargé.",
          en: "The base camp for an overloaded nervous system."
        },
        image: "https://storage.googleapis.com/inspirata/Vata/2%20expe%CC%81rience%20vata%20.png",
        features: [
          { fr: "<b>7 modules – 7 semaines (plus 1 semaine d’introduction)</b>", en: "<b>7 modules – 7 weeks (plus 1 intro week)</b>" },
          { fr: "18 capsules d’accompagnement audio pour les différents modules", en: "18 audio accompaniment capsules for the different modules" },
          { fr: "7 méditations pré-enregistrées, une par semaine", en: "7 pre-recorded meditations, one per week" },
          { fr: "19 rituels guidés", en: "19 guided rituals" },
          { fr: "Guide PDF de 204 pages, intégré à l’ensemble", en: "204-page PDF guide, integrated into the set" },
          { fr: "Accès à la communauté : Un espace d’échanges dédié", en: "Community access: A dedicated exchange space" }
        ],
        recommended: false,
        checkoutUrl: "https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT",
        buttonText: { fr: "Rejoindre VATA Essentiel", en: "Join VATA Essential" }
      },
      {
        name: { fr: "VATA + Grande Bibliothèque", en: "VATA + Great Library" },
        price: { fr: "797 $", en: "$797" },
        promoPrice: { fr: "597 $", en: "$597" },
        paymentPlan: { fr: "ou 2 x 327 $", en: "or 2 x $327" },
        description: {
          fr: "Le coffre au trésor pour entrer dans Vata et l’Ayurveda, puis y revenir au fil des saisons.",
          en: "The treasure chest to enter Vata and Ayurveda, then return throughout the seasons."
        },
        image: "https://storage.googleapis.com/inspirata/Vata/2%20grande%20bibliothe%CC%80que%20no%20background%20ici%20alex.png",
        features: [
          { fr: "<b>Tout ce qui est inclus dans VATA Essentiel</b>", en: "<b>Everything included in VATA Essential</b>" },
          { fr: "Série « Santé la vie » : 2 saisons complètes (19 épisodes)", en: "« Santé la vie » series: 2 full seasons (19 episodes)" },
          { fr: "Capsules « Rituels essentiels » : Ayurveda, automassage...", en: "« Essential Rituals » capsules: Ayurveda, self-massage..." },
          { fr: "<b>Masterclass Dharma</b> – Précisez votre mission", en: "<b>Dharma Masterclass</b> – Clarify your mission" },
          { fr: "<b>Masterclass Aromathérapie</b> – Réduire le stress", en: "<b>Aromatherapy Masterclass</b> – Reduce stress" },
          { fr: "Accès à la Grande Bibliothèque illimité", en: "Unlimited access to the Great Library" }
        ],
        highlight: "Expérience Profonde",
        recommended: true,
        checkoutUrl: "https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT",
        buttonText: { fr: "Rejoindre VATA + Grande Bibliothèque", en: "Join VATA + Great Library" }
      }
    ]
  },
  boussole: {
    title: { fr: "Retrouver sa boussole intérieure", en: "Finding Your Inner Compass" },
    subtitle: { fr: "Programme 3 Mois - Début 2025", en: "3 Month Program - Early 2025" },
    description: {
      fr: "Pour celles qui souhaitent aller plus loin, ce programme intensif de 3 mois ouvrira ses portes bientôt. VATA est la préparation idéale pour ce travail de profondeur.",
      en: "For those who wish to go further, this intensive 3-month program will open soon. VATA is the ideal preparation for this deep work."
    }
  },
  bio: {
    title: { fr: "Krystine St-Laurent", en: "Krystine St-Laurent" },
    role: { 
      fr: "Autrice best-seller, conférencière internationale et fondatrice d’INSPIRATA AYURVEDA.", 
      en: "Best-selling author, international speaker, and founder of INSPIRATA AYURVEDA." 
    },
    subtitle: {
      fr: "Chercheuse de profondeur dans un monde saturé de virtuel et de tendances éphémères.",
      en: "Seeker of depth in a world saturated with virtuality and fleeting trends."
    },
    highlight: { 
        fr: "Nous portons en nous la même sagesse que la nature. Elle ne demande qu’à se déployer.",
        en: "We carry within us the same wisdom as nature. It only asks to unfold."
    },
    description: [
      {
        fr: "Krystine St-Laurent accompagne depuis plus de 35 ans des personnes en quête d’une autre façon d’organiser leur temps, leur corps et leurs cycles.",
        en: "Krystine St-Laurent has been accompanying people looking for another way to organize their time, body, and cycles for over 35 years."
      },
      {
        fr: "Autrice et conférencière internationale, elle tisse les savoirs ancestraux, la science moderne et l’observation du quotidien pour proposer des rituels qui réduisent les fuites d’énergie et soutiennent les passages de cycle.",
        en: "Author and international speaker, she weaves ancestral knowledge, modern science, and daily observation to offer rituals that reduce energy leaks and support cycle transitions."
      },
      {
        fr: "VATA fait partie de ces expériences : une invitation à apprivoiser la saison froide autrement, en respectant le rythme réel du corps et des sens.",
        en: "VATA is one of those experiences: an invitation to tame the cold season differently, respecting the real rhythm of the body and senses."
      }
    ]
  },
  faq: {
    title: { fr: "Questions fréquentes", en: "Frequently Asked Questions" },
    items: [
      {
        question: { fr: "Est-ce que je dois connaître l’Ayurveda ?", en: "Do I need to know Ayurveda?" },
        answer: { 
          fr: "Non. Le programme a été conçu pour rester accessible. Les notions sont expliquées simplement, avec des exemples ancrés dans le quotidien.",
          en: "No. The program was designed to remain accessible. Concepts are explained simply, with examples grounded in daily life."
        }
      },
      {
        question: { fr: "Est-ce en direct ou en différé ?", en: "Is it live or recorded?" },
        answer: { 
          fr: "VATA est un parcours autonome. Toutes les semaines sont déjà enregistrées : vous pouvez commencer dès votre inscription et avancer à votre rythme.",
          en: "VATA is a self-paced journey. All weeks are already recorded: you can start as soon as you register and move forward at your own pace."
        }
      },
      {
        question: { fr: "Combien de temps ai-je accès ?", en: "How long do I have access?" },
        answer: { 
          fr: "Vous gardez l’accès tant que la plateforme est en ligne (à suivre dans les 6 à 12 mois suivant votre inscription).",
          en: "You keep access as long as the platform is online (to follow within 6 to 12 months following your registration)."
        }
      },
      {
        question: { fr: "Et si j’ai des questions ?", en: "What if I have questions?" },
        answer: { 
          fr: "Vous pouvez les déposer dans les espaces de commentaires prévus dans la plateforme.",
          en: "You can post them in the comment spaces provided on the platform."
        }
      },
      {
        question: { fr: "Et si je prends du retard ?", en: "What if I fall behind?" },
        answer: { 
          fr: "Rien n’est perdu. VATA n’est pas un défi à “performer”, mais un cadre vers lequel revenir quand vous êtes prête.",
          en: "Nothing is lost. VATA is not a challenge to “perform”, but a framework to return to when you are ready."
        }
      }
    ],
    banner: {
      title: { fr: "Prête à traverser la saison autrement ?", en: "Ready to navigate the season differently?" },
      buttons: {
        essential: { fr: "Rejoindre VATA Essentiel", en: "Join VATA Essential" },
        premium: { fr: "Rejoindre VATA + Grande Bibliothèque", en: "Join VATA + Great Library" }
      }
    }
  }
};
