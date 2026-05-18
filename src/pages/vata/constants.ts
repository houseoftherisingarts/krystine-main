
import { GlobalContent } from './types';

export const ASSETS = {
  audio: {
    background: "https://storage.googleapis.com/inspirata/Base%20site/Whispers%20of%20Rivendell.mp3",
    bioEpisode: "https://storage.googleapis.com/inspirata/Vata/EPISODE%2017%20-%20VATA%20ET%20LE%20CHAOS%20.mp3"
  },
  images: {
    signature: "https://storage.googleapis.com/inspirata/Vata/1%20(1).png",
    heroLogo: "https://storage.googleapis.com/inspirata/Vata/golden%20vata%20logo.png",
    heroBg: "https://storage.googleapis.com/inspirata/Vata/bg.png",
    krystineBio: "https://storage.googleapis.com/inspirata/21%20jours/krysttine%20red.webp"
  }
};

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
      fr: "Votre corps n'est pas fait pour cette vitesse.",
      en: "Your body wasn't built for this speed."
    },
    subtitle: {
      fr: "Expérience Ayurveda : Saison Vata",
      en: "Ayurveda Experience: Vata Season"
    },
    tagline: {
      fr: "Froid, sécheresse, surcharge mentale : la saison VATA teste vos limites. Ne laissez pas l'hiver vous éteindre. Apprenez à sécuriser vos portes sensorielles pour ramener le calme à l'intérieur.",
      en: "Cold, dryness, mental overload: VATA season tests your limits. Don't let winter dim your light. Learn to secure your sensory gateways to restore inner peace."
    },
    bullets: [
      { fr: "Programme autonome, déjà entièrement disponible.", en: "Self-paced program, fully available now." },
      { fr: "Accès dès maintenant, vous avancez à votre rythme.", en: "Instant access, proceed at your own pace." }
    ],
    buttons: {
      essential: { fr: "Je veux apaiser mon système nerveux maintenant", en: "I want to soothe my nervous system now" },
      premium: { fr: "Rejoindre VATA + Grande Bibliothèque", en: "Join VATA + Great Library" }
    }
  },
  diagnosis: {
    title: {
      fr: "Les signaux d'alerte : Avez-vous perdu vos filtres ?",
      en: "Warning Signs: Have You Lost Your Filters?"
    },
    subtitle: {
      fr: "Cliquez sur les signaux qui vous ressemblent. Si vous en allumez plus de 3, c'est que votre vent intérieur est en turbulence.",
      en: "Click on the signals that resonate with you. If you light up more than 3, your inner wind is in turbulence."
    },
    items: [
      {
        id: 'mental-overheat',
        icon: 'BrainCircuit',
        title: { fr: "La Surchauffe Mentale", en: "Mental Overheat" },
        description: {
          fr: "15 onglets ouverts en permanence. Vous ne \"pensez\" plus, vous subissez le bruit de vos pensées.",
          en: "15 tabs open constantly. You are no longer thinking, you are enduring the noise of your thoughts."
        }
      },
      {
        id: 'wakeup',
        icon: 'Moon',
        title: { fr: "Le réveil de 3h du matin", en: "The 3 AM Wake-up" },
        description: {
          fr: "Le corps est épuisé, mais le mental vous réveille brutalement. Impossible de redescendre.",
          en: "The body is exhausted, but the mind wakes you up abruptly. Impossible to come back down."
        }
      },
      {
        id: 'inner-wind',
        icon: 'Wind',
        title: { fr: "Le Vent Intérieur", en: "The Inner Wind" },
        description: {
          fr: "Ballonnements et irrégularité. Une sensation d'inconfort, comme si la digestion était devenue laborieuse.",
          en: "Bloating and irregularity. A feeling of discomfort, as if digestion has become laborious."
        }
      },
      {
        id: 'time-saturation',
        icon: 'Layout',
        title: { fr: "La Saturation Temporelle", en: "Time Saturation" },
        description: {
          fr: "Sensation d'étouffement. L'impression physique que le temps se contracte et vous écrase.",
          en: "Sensation of suffocation. The physical feeling that time is contracting and crushing you."
        }
      },
      {
        id: 'paper-skin',
        icon: 'Cloud',
        title: { fr: "La Peau de Papier", en: "Paper Skin" },
        description: {
          fr: "Tiraillements, frilosité. Votre enveloppe extérieure semble trop fine pour vous protéger.",
          en: "Tightness, sensitivity to cold. Your outer envelope seems too thin to protect you."
        }
      },
      {
        id: 'sensory-invasion',
        icon: 'Ear',
        title: { fr: "L'Envahissement Sensoriel", en: "Sensory Invasion" },
        description: {
          fr: "Le moindre bruit vous agresse. La lumière vive fatigue. Vos filtres ne fonctionnent plus.",
          en: "The slightest noise aggressive you. Bright light tires. Your filters no longer work."
        }
      },
      {
        id: 'cold-extremities',
        icon: 'Snowflake',
        title: { fr: "Mains et pieds glacés", en: "Icy Hands and Feet" },
        description: {
          fr: "Une sensation de froid persistante. Même sous la couette, la chaleur ne se rend pas au bout des doigts.",
          en: "A persistent feeling of cold. Even under the covers, warmth doesn't reach your fingertips."
        }
      },
      {
        id: 'creaky-body',
        icon: 'ZapOff',
        title: { fr: "Le corps qui \"grince\"", en: "The \"Creaky\" Body" },
        description: {
          fr: "Raideurs et craquements. Le sentiment d'avoir perdu sa fluidité naturelle et son \"huile\" interne.",
          en: "Stiffness and cracking. The feeling of having lost your natural fluidity and internal \"oil\"."
        }
      },
      {
        id: 'mental-scatter',
        icon: 'Stars',
        title: { fr: "La dispersion mentale", en: "Mental Scattering" },
        description: {
          fr: "Vous commencez dix tâches, n'en finissez aucune. Votre focus s'effrite et vous perdez le fil constamment.",
          en: "You start ten tasks, finish none. Your focus crumbles and you constantly lose your thread."
        }
      }
    ],
    situations: [], 
    closing: {
      fr: "Ces signes sont le langage du corps. Vata vous invite à ralentir.",
      en: "These signs are the body's language. Vata invites you to slow down."
    }
  },
  context: {
    title: {
      fr: "Comment nous allons arrêter la fuite d'énergie",
      en: "How we're going to stop the energy leak"
    },
    subtitle: {
      fr: "Nous n'allons pas ajouter de tâches à votre agenda. Nous allons installer 3 systèmes de régulation invisibles.",
      en: "We aren't going to add tasks to your agenda. We'll install 3 invisible regulation systems."
    },
    items: [
      {
        title: { fr: "Le Système d'Ancrage", en: "The Grounding System" },
        description: { 
          fr: "Avant de calmer le mental, il faut sécuriser le corps. Le souffle devient votre \"bouton stop\" accessible en 30 secondes, n'importe où.", 
          en: "Before calming the mind, we must secure the body. Breath becomes your 30-second 'stop button', accessible anywhere." 
        },
        icon: "Wind"
      },
      {
        title: { fr: "Le Filtrage Sensoriel", en: "Sensory Filtering" },
        description: { 
          fr: "Vos 5 sens sont actuellement des portes grandes ouvertes. Nous allons poser des filtres pour que le bruit extérieur cesse de vous envahir.", 
          en: "Your 5 senses are currently wide-open doors. We'll set up filters so external noise stops invading you." 
        },
        icon: "Ear"
      },
      {
        title: { fr: "La Maintenance d'Actif", en: "Asset Maintenance" },
        description: { 
          fr: "Votre corps est votre capital le plus précieux. Nous allons remettre de l'huile dans les rouages (sommeil, digestion) pour éviter la casse.", 
          en: "Your body is your most precious capital. We'll put oil back in the gears (sleep, digestion) to avoid breakdown." 
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
        promoLabel: { fr: "", en: "" },
        buttonText: { fr: "Rejoindre VATA Essentiel", en: "Join VATA Essential" },
        url: "https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT",
        isPremium: false
      },
      {
        title: { fr: "VATA + Grande Bibliothèque", en: "VATA + Great Library" },
        intro: {
          fr: "L'expérience enrichie pour approfondir votre pratique et votre compréhension.",
          en: "Enriched experience to deepen your practice and understanding."
        },
        image: "https://storage.googleapis.com/inspirata/Vata/2%20grande%20bibliothe%CC%80que%20no%20background%20ici%20alex.png",
        bullets: [
          { fr: "Tout ce qui inclus dans VATA Essentiel.", en: "Everything included in VATA Essential." },
          { fr: "Série « Santé la vie » : 2 saisons complètes (19 épisodes tournés pour la télé) sur le stress, le sommeil, la digestion, les saisons et les doshas (VATA, PITTA, KAPHA), inédites et non disponibles ailleurs.", en: "« Santé la vie » series: 2 full seasons (19 TV episodes) on stress, sleep, digestion, seasons, and doshas (VATA, PITTA, KAPHA)." },
          { fr: "Capsules « Rituels essentiels » : Ayurveda, automassage, soins du nez, de la bouche, des mains et des pieds.", en: "« Essential Rituals » capsules: Ayurveda, self-massage, nose, mouth, hand, and foot care." },
          { fr: "Masterclass Dharma – Précisez votre mission, ajustez votre feu intérieur et découvrez 8 clés concrètes pour avancer chaque jour avec énergie et cohérence.", en: "Dharma Masterclass – Clarify your mission, adjust your fire, and discover 8 concrete keys." },
          { fr: "Masterclass Aromathérapie – Réduire le stress avec l’aromathérapie & l’Ayurveda", en: "Aromatherapy Masterclass – Reduce stress with aromatherapy & Ayurveda" },
          { fr: "Accès à la Grande Bibliothèque tant que la plateforme est en ligne.", en: "Access to the Grande Bibliothèque as long as the platform is online." }
        ],
        price: { fr: "797 $", en: "$797" },
        promoPrice: { fr: "597 $", en: "$597" },
        promoLabel: { fr: "", en: "" },
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
          fr: "J’étais en mode alerte en continu : proche aidante, travail, famille… La nuit, je me réveillais vers 3 h, et la tête déjà repartie. Avec VATA, le simple fait d’avoir un fil sur 7 semaines m’a permis de reprendre prise sur mes soirées. Mes nuits sont plus réparatrices. Je me lève moins vidée et je sais quoi faire quand je sens que ça recopmmence à s’emballer.",
          en: "I was in constant alert mode... With VATA, simply having a thread over 7 weeks allowed me to regain control of my evenings."
        },
        author: "Sonia T.",
        role: { fr: "52 ans, maman d’ados et proche aidante", en: "52 years old, mom of teens and caregiver" }
      },
      {
        quote: {
          fr: "Comme entrepreneure, je vivais avec 15 onglets ouverts dans mon cerveau. Mon corps suivait “tant bien que mal” : digestion lourde, tensions, impression d’être toujours en retard sur quelque chose. Les semaines sur les sens ont été un déclic. J’ai ajusté ce que je laisse entrer (bruits, écrans, lumières) et le rythme de mes repas. C’est fou ce qu’un changement de 1% sur nos choix peut faire comme différence !",
          en: "As an entrepreneur, I lived with 15 tabs open... The weeks on the senses were a click. It's crazy what a 1% change can make!"
        },
        author: "Julie B.",
        role: { fr: "Entrepreneure à grande tendance VATA", en: "Entrepreneur with high VATA tendency" }
      },
      {
        quote: {
          fr: "J’ai fait beaucoup de formations, j’avais l’habitude de consommer du contenu, empiler les connaisssances. Krystine a une façon unique, réellement, d’enseigner et d’accompagner. Ses connaissances ne partent pas du mental, mais du coeur et elle nous y ramène souvent. Wow. Je n’ai qu’un mot: GRATITUDE.",
          en: "Krystine has a unique way of teaching... Her knowledge doesn't start from the mind, but from the heart. Wow. Just one word: GRATITUDE."
        },
        author: "Caroline P.",
        role: { fr: "Mère de 4 enfants au mental à tendance surchargé", en: "Mother of 4 with a tendency for an overloaded mind" }
      }
    ]
  },
  program: {
    title: {
      fr: "AU-DELÀ DES TENDANCES : L'ART DE L'ANCRAGE RÉEL",
      en: "BEYOND TRENDS: THE ART OF REAL GROUNDING"
    },
    subtitle: {
      fr: "7 étapes pour délaisser le superflu, éteindre le bruit et rebâtir votre sécurité intérieure sur des principes qui ne changent pas.",
      en: "7 steps to leave the superfluous behind, silence the noise, and rebuild your inner security on principles that never change."
    },
    phases: [
      {
        id: 0,
        title: { fr: "Créer le sanctuaire", en: "Creating the Sanctuary" },
        description: {
          fr: "Avant de ralentir, il faut se sentir en sécurité. Nous préparons votre espace pour que votre corps s'autorise enfin à déposer les armes.",
          en: "Before slowing down, one must feel safe. We prepare your space so your body finally allows itself to lay down its arms."
        },
        icon: "Stars"
      },
      {
        id: 1,
        title: { fr: "Le souffle qui ancre", en: "The Anchoring Breath" },
        description: {
          fr: "L'air pour calmer l'air. Le geste invisible qui stoppe le tourbillon mental en quelques secondes, même au milieu du chaos.",
          en: "Air to calm air. The invisible gesture that stops the mental whirlwind in seconds, even in the midst of chaos."
        },
        icon: "Wind"
      },
      {
        id: 2,
        title: { fr: "Le luxe du silence", en: "The Luxury of Silence" },
        description: {
          fr: "Protéger vos oreilles. Comment fermer les portes de l'ouïe pour offrir à votre système nerveux le calme dont il a soif.",
          en: "Protect your ears. How to close the doors of hearing to offer your nervous system the calm it craves."
        },
        icon: "Ear"
      },
      {
        id: 3,
        title: { fr: "Le repos du regard", en: "Resting the Gaze" },
        description: {
          fr: "Déposer ses yeux. Libérer votre vision de la fatigue des écrans pour retrouver une clarté que vous croyiez perdue.",
          en: "Rest your eyes. Free your vision from screen fatigue to rediscover a clarity you thought was lost."
        },
        icon: "Eye"
      },
      {
        id: 4,
        title: { fr: "L'accès direct", en: "Direct Access" },
        description: {
          fr: "Le secret de l'odorat. Utiliser les essences pour 'hacker' votre stress et changer d'état d'esprit en une seule inspiration.",
          en: "The secret of smell. Use essences to 'hack' your stress and change your state of mind in a single breath."
        },
        icon: "Flower2"
      },
      {
        id: 5,
        title: { fr: "La chaleur intérieure", en: "Inner Warmth" },
        description: {
          fr: "Le réconfort du goût. Les rituels gourmands et les aliments stratégiques qui réchauffent le corps et calment les turbulences.",
          en: "The comfort of taste. Gourmet rituals and strategic foods that warm the body and calm turbulence."
        },
        icon: "Apple"
      },
      {
        id: 6,
        title: { fr: "Le cocon de soie", en: "The Silk Cocoon" },
        description: {
          fr: "L'onction du toucher. L'art de l'huile chaude pour recréer une protection autour de vous et ne plus vous sentir à vif.",
          en: "The anointing of touch. The art of warm oil to recreate protection around you and no longer feel exposed."
        },
        icon: "Hand"
      },
      {
        id: 7,
        title: { fr: "La force tranquille", en: "Quiet Strength" },
        description: {
          fr: "L'autonomie totale. Vous repartez habitée par une nouvelle présence et un système d'auto-régulation que vous posséderez pour toujours.",
          en: "Total autonomy. You leave inhabited by a new presence and a system of self-regulation you will own forever."
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
      fr: "",
      en: ""
    },
    tiers: [
      {
        name: { fr: "VATA Essentiel", en: "VATA Essential" },
        price: { fr: "497 $", en: "$497" },
        promoPrice: { fr: "397 $", en: "$397" },
        description: {
          fr: "Le camp de base pour un système nerveux surchargé.",
          en: "The base camp for an overloaded nervous system."
        },
        image: "https://storage.googleapis.com/inspirata/Vata/2%20expe%CC%81rience%20vata%20.png",
        features: [
          { fr: "<b>7 modules – 7 semaines (plus 1 semaine d’introduction)</b>", en: "<b>7 modules – 7 weeks (plus 1 intro week)</b>" },
          { fr: "18 capsules d’accompagnement audio", en: "18 audio accompaniment capsules" },
          { fr: "7 méditations pré-enregistrées", en: "7 pre-recorded meditations" },
          { fr: "19 rituels guidés", en: "19 guided rituals" },
          { fr: "Guide PDF de 204 pages", en: "204-page PDF guide" },
          { fr: "Accès à la communauté", en: "Community access" }
        ],
        recommended: false,
        checkoutUrl: "https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT",
        buttonText: { fr: "Rejoindre VATA Essentiel", en: "Join VATA Essential" }
      },
      {
        name: { fr: "VATA + Grande Bibliothèque", en: "VATA + Great Library" },
        price: { fr: "797 $", en: "$797" },
        promoPrice: { fr: "597 $", en: "$597" },
        paymentPlan: { fr: "OU 2 X 327 $", en: "OR 2 X $327" },
        description: {
          fr: "L'expérience enrichie pour approfondir votre pratique et votre compréhension.",
          en: "Enriched experience to deepen your practice and understanding."
        },
        image: "https://storage.googleapis.com/inspirata/Vata/2%20grande%20bibliothe%CC%80que%20no%20background%20ici%20alex.png",
        features: [
          { fr: "<b>Tout ce qui est inclus dans VATA Essentiel</b>", en: "<b>Everything included in VATA Essential</b>" },
          { fr: "Série « Santé la vie » : 2 saisons complètes", en: "« Santé la vie » series: 2 full seasons" },
          { fr: "Capsules « Rituels essentiels »", en: "« Essential Rituals » capsules" },
          { fr: "<b>Masterclass Dharma</b>", en: "<b>Dharma Masterclass</b>" },
          { fr: "<b>Masterclass Aromathérapie</b>", en: "<b>Aromatherapy Masterclass</b>" },
          { fr: "Accès à la Grande Bibliothèque illimité", en: "Unlimited access" }
        ],
        highlight: "EXPÉRIENCE PROFONDE",
        recommended: true,
        checkoutUrl: "https://www.krystinestlaurent.com/VATAETPREMIUMOPTIONSDEPAIEMENT",
        buttonText: { fr: "Rejoindre VATA + Grande Bibliothèque", en: "Join VATA + Great Library" }
      }
    ]
  },
  boussole: {
    title: { fr: "Retrouver sa boussole intérieure", en: "Finding Your Inner Compass" },
    subtitle: { fr: "Programme 3 Mois - Début 2025", en: "3 Month Program" },
    description: {
      fr: "VATA est la préparation idéale pour ce travail de profondeur.",
      en: "VATA is the ideal preparation."
    }
  },
  bio: {
    title: { fr: "KRYSTINE ST-LAURENT", en: "KRYSTINE ST-LAURENT" },
    role: { 
      fr: "Une expertise de 35 ans à la jonction de la rigueur clinique et de la santé globale.", 
      en: "35 years of expertise at the junction of clinical rigor and holistic health." 
    },
    subtitle: {
      fr: "Fondatrice d’INSPIRATA AYURVEDA.",
      en: "Founder of INSPIRATA AYURVEDA."
    },
    highlight: { 
        fr: "Vous connaissez cette sensation : le mental qui tourne sans s'arrêter, le sommeil qui ne répare plus, le corps qui envoie des signaux que personne ne sait lire.",
        en: "You know that feeling: the mind that spins without stopping, the sleep that no longer repairs, the body that sends signals that no one knows how to read."
    },
    description: [
      {
        fr: "Pendant 35 ans, Krystine a œuvré en soins intensifs et en recherche clinique, puis en herboristerie, Ayurveda et aromathérapie. Elle a vu ce que l’approche moderne fait bien. Et elle a vu où elle vous laisse seule.",
        en: "For 35 years, Krystine worked in intensive care and clinical research, then in herbalism, Ayurveda and aromatherapy. She saw what the modern approach does well. And she saw where it leaves you alone."
      },
      {
        fr: "Ce programme existe pour ce que le système ne vous a jamais appris : revenir au centre avant de vous perdre.",
        en: "This program exists for what the system never taught you: to return to the center before losing yourself."
      },
      {
        fr: "Trois livres aux Éditions de l'Homme. Fondatrice d'Inspirata Ayurveda. Finaliste au Prix de la Santé Intégrative (catégorie Pionnier). Récipiendaire du Prime Mover Award (Las Vegas).",
        en: "Three books at Éditions de l'Homme. Founder of Inspirata Ayurveda. Finalist for the Integrative Health Prize (Pioneer category). Recipient of the Prime Mover Award (Las Vegas)."
      }
    ]
  },
  faq: {
    title: { fr: "Questions fréquentes", en: "Frequently Asked Questions" },
    items: [
      {
        question: { fr: "Est-ce que je dois connaître l’Ayurveda ?", en: "Do I need to know Ayurveda?" },
        answer: { fr: "Non, pas du tout. Le programme est conçu pour être simple, concret et accessible. Krystine vulgarise les concepts ancestraux pour qu'ils deviennent des outils pratiques dans votre quotidien moderne.", en: "Not at all. The program is designed to be simple, concrete, and accessible." }
      },
      {
        question: { fr: "Combien de temps ai-je accès au contenu ?", en: "How long do I have access to the content?" },
        answer: { fr: "Vous conservez l’accès à votre parcours VATA tant que la plateforme est en ligne. Vous pourrez donc y revenir l’an prochain si vous en ressentez le besoin !", en: "You keep access to your VATA journey as long as the platform is online." }
      },
      {
        question: { fr: "Quel est l'investissement de temps requis ?", en: "What is the time investment required?" },
        answer: { fr: "C'est un programme qui respecte votre rythme. Les capsules audio font entre 5 et 15 minutes. L'idée n'est pas d'ajouter une corvée à votre liste, mais de remplacer certaines habitudes stressantes par des rituels d'apaisement.", en: "It's a programme that respects your pace. Audio capsules are between 5 and 15 minutes." }
      },
      {
        question: { fr: "Est-ce que je peux suivre sur mobile ou tablette ?", en: "Can I follow on mobile or tablet?" },
        answer: { fr: "Oui ! La plateforme est responsive et vous pouvez même utiliser l'application mobile gratuite de notre hébergeur pour écouter vos capsules en mode « podcast » pendant vos déplacements.", en: "Yes! The platform is responsive and mobile-friendly." }
      },
      {
        question: { fr: "Quelle est la différence entre les deux options ?", en: "What is the difference between the two options?" },
        answer: { fr: "L'option Essentiel contient tout le parcours de 7 semaines. L'option Premium ajoute un accès illimité à la Grande Bibliothèque : plus de 50 capsules supplémentaires, des séries télé et des Masterclasses exclusives.", en: "The Essential option contains the full 7-week journey. The Premium option adds unlimited access to the Great Library." }
      }
    ],
    banner: {
      title: { fr: "Prête à traverser la saison autrement ?", en: "Ready to go through the season differently?" },
      buttons: {
        essential: { fr: "Je veux apaiser mon système nerveux maintenant", en: "I want to soothe my nervous system now" },
        premium: { fr: "Rejoindre VATA + Grande Bibliothèque", en: "Join VATA + Great Library" }
      }
    }
  },
  ambassadors: {
    title: { fr: "PROPAGER LA SAGESSE", en: "SPREAD THE WISDOM" },
    subtitle: { fr: "Devenez Ambassadrice", en: "Become an Ambassador" },
    description: { fr: "Partagez la profondeur.", en: "Share the depth." },
    steps: [],
    calculus: {
      title: { fr: "Structure des ristournes", en: "Reward Structure" },
      disclaimer: { fr: "Exemple basé...", en: "Example based..." },
      items: []
    },
    cta: { fr: "Devenir Ambassadrice", en: "Become an Ambassador" }
  },
  discoverMore: {
    title: { fr: "Découvrez ma philosophie", en: "Discover my philosophy" },
    items: [
      {
        title: { fr: "Au-delà des tendances : l'art de l'ancrage réel", en: "Beyond Trends: The Art of Real Grounding" },
        buttonText: { fr: "Écouter les épisodes", en: "Listen to episodes" },
        url: "https://krystinestlaurent.ca/podcast/",
        icon: "Mic"
      }
    ]
  }
};
