// Internal rules-based concierge agent.
// Runs entirely client-side — no external API calls, no data transmission.
// Maps a free-text user query to a warm suggestion + optional navigation target.

import type { Lang } from '../contexts/AppContext';

export interface AgentReply {
  text: string;
  href?: string;
  ctaLabel?: string;
}

interface Intent {
  id: string;
  match: RegExp;
  reply: Record<Lang, AgentReply>;
}

const INTENTS: Intent[] = [
  {
    id: 'dosha',
    match: /dosha|vata|pitta|kapha|quiz|constitution|tempérament|temperament/i,
    reply: {
      FR: {
        text: "Votre constitution ayurvédique est unique. Complétez le Dosha Quiz pour découvrir votre dominance (Vata, Pitta ou Kapha) et les rituels qui vous correspondent.",
        href: '/ayurveda',
        ctaLabel: 'Faire le quiz',
      },
      EN: {
        text: 'Your ayurvedic constitution is unique. Take the Dosha Quiz to reveal your dominance (Vata, Pitta, or Kapha) and the rituals that fit you.',
        href: '/ayurveda',
        ctaLabel: 'Take the quiz',
      },
    },
  },
  {
    id: 'shop',
    match: /boutique|shop|product|produit|huile|oil|acheter|buy|cart|panier/i,
    reply: {
      FR: {
        text: "Nos huiles et rituels sont conçus selon la tradition ayurvédique. Visitez la boutique pour découvrir les formules adaptées à votre dosha.",
        href: '/boutique',
        ctaLabel: 'Voir la boutique',
      },
      EN: {
        text: 'Our oils and rituals are crafted in the ayurvedic tradition. Visit the shop to find formulas aligned with your dosha.',
        href: '/boutique',
        ctaLabel: 'Visit the shop',
      },
    },
  },
  {
    id: 'origine',
    match: /origine|programme|cours|course|12 semaines|12 weeks|formation|transformation/i,
    reply: {
      FR: {
        text: "L'Expérience Origine est un parcours de 12 semaines pour retrouver votre boussole intérieure, accompagnée par Krystine.",
        href: '/origine',
        ctaLabel: "Découvrir l'Expérience",
      },
      EN: {
        text: 'The Origin Experience is a 12-week journey to rediscover your inner compass, guided by Krystine.',
        href: '/origine',
        ctaLabel: 'Discover the Experience',
      },
    },
  },
  {
    id: 'events',
    match: /évén|event|calendrier|calendar|atelier|workshop|retraite|retreat|conférence|conference/i,
    reply: {
      FR: {
        text: "Consultez le calendrier pour les prochains événements, ateliers et retraites.",
        href: '/evenements',
        ctaLabel: 'Voir le calendrier',
      },
      EN: {
        text: 'Check the calendar for upcoming events, workshops, and retreats.',
        href: '/evenements',
        ctaLabel: 'View calendar',
      },
    },
  },
  {
    id: 'books',
    match: /livre|book|lire|read|auteur|author/i,
    reply: {
      FR: {
        text: "Krystine est autrice best-seller. Parcourez la bibliothèque pour trouver le livre qui vous accompagnera.",
        href: '/livres',
        ctaLabel: 'Voir les livres',
      },
      EN: {
        text: 'Krystine is a best-selling author. Browse the library to find the book that will walk with you.',
        href: '/livres',
        ctaLabel: 'Browse books',
      },
    },
  },
  {
    id: 'podcast',
    match: /podcast|écouter|listen|audio|épisode|episode/i,
    reply: {
      FR: {
        text: "Le podcast de Krystine offre des conversations ancrées sur la sagesse ayurvédique et l'art de vivre conscient.",
        href: '/podcast',
        ctaLabel: 'Écouter le podcast',
      },
      EN: {
        text: "Krystine's podcast offers grounded conversations on ayurvedic wisdom and conscious living.",
        href: '/podcast',
        ctaLabel: 'Listen to the podcast',
      },
    },
  },
  {
    id: 'media',
    match: /média|media|tv|vidéo|video|entrevue|interview/i,
    reply: {
      FR: {
        text: "Retrouvez les entrevues, apparitions télé et contenus médias de Krystine.",
        href: '/medias',
        ctaLabel: 'Voir les médias',
      },
      EN: {
        text: "Find Krystine's interviews, TV appearances, and media content.",
        href: '/medias',
        ctaLabel: 'View media',
      },
    },
  },
  {
    id: 'blog',
    match: /blog|blogue|article|lecture/i,
    reply: {
      FR: {
        text: "Le blogue rassemble réflexions et rituels à intégrer dans votre quotidien.",
        href: '/blogue',
        ctaLabel: 'Lire le blogue',
      },
      EN: {
        text: 'The blog gathers reflections and rituals to weave into your everyday life.',
        href: '/blogue',
        ctaLabel: 'Read the blog',
      },
    },
  },
  {
    id: 'locations',
    match: /point de vente|location|magasin|store|où trouver|where.*find|en personne|in person/i,
    reply: {
      FR: {
        text: "Nos produits sont aussi offerts chez des partenaires sélectionnés. Consultez la carte des points de vente.",
        href: '/points-de-vente',
        ctaLabel: 'Voir les points de vente',
      },
      EN: {
        text: 'Our products are also available at selected partners. See the map of points of sale.',
        href: '/points-de-vente',
        ctaLabel: 'See points of sale',
      },
    },
  },
  {
    id: 'speaker',
    match: /conférence|conferenc|speaker|invitée|invited|réservation.*conférence|booking/i,
    reply: {
      FR: {
        text: "Krystine donne des conférences sur l'Ayurveda et l'art de vivre conscient. Une demande de réservation peut être envoyée depuis la page dédiée.",
        href: '/conferenciere',
        ctaLabel: 'Inviter Krystine',
      },
      EN: {
        text: 'Krystine gives talks on Ayurveda and conscious living. You can send a booking request from the speaker page.',
        href: '/conferenciere',
        ctaLabel: 'Invite Krystine',
      },
    },
  },
  {
    id: 'about',
    match: /krystine|fondatrice|founder|qui (est|êtes)|about|biograph/i,
    reply: {
      FR: {
        text: "Krystine St-Laurent, fondatrice d'Inspirata, pratique l'Ayurveda depuis près de 40 ans. Découvrez son parcours.",
        href: '/krystine',
        ctaLabel: 'Découvrir Krystine',
      },
      EN: {
        text: 'Krystine St-Laurent, founder of Inspirata, has practiced Ayurveda for nearly 40 years. Discover her path.',
        href: '/krystine',
        ctaLabel: 'Discover Krystine',
      },
    },
  },
  {
    id: 'contact',
    match: /contact|courriel|email|écrire|write|joindre|reach/i,
    reply: {
      FR: {
        text: "Vous pouvez écrire à l'équipe directement à equipe@inspiratanature.com. Nous répondons avec soin.",
      },
      EN: {
        text: 'You can write to the team directly at equipe@inspiratanature.com. We reply with care.',
      },
    },
  },
  {
    id: 'stress',
    match: /stress|anxi|angoiss|fatigu|sommeil|sleep|épuis|burn|calme|calm/i,
    reply: {
      FR: {
        text: "Quand le souffle se précipite, revenir à la terre apaise. Les rituels Vata et les pratiques d'ancrage offrent un soutien doux.",
        href: '/ayurveda',
        ctaLabel: 'Explorer les rituels',
      },
      EN: {
        text: 'When the breath races, returning to the earth soothes. Vata rituals and grounding practices offer gentle support.',
        href: '/ayurveda',
        ctaLabel: 'Explore the rituals',
      },
    },
  },
];

const FALLBACK: Record<Lang, AgentReply> = {
  FR: {
    text: "Je vous invite à explorer l'univers Inspirata — Ayurveda, programmes et rituels — pour trouver ce qui résonne en vous.",
    href: '/ayurveda',
    ctaLabel: 'Explorer Ayurveda',
  },
  EN: {
    text: 'I invite you to explore the Inspirata world — Ayurveda, programs, and rituals — to find what resonates within you.',
    href: '/ayurveda',
    ctaLabel: 'Explore Ayurveda',
  },
};

export function askInternalAgent(query: string, lang: Lang): AgentReply {
  const q = (query || '').trim();
  if (!q) return FALLBACK[lang];
  for (const intent of INTENTS) {
    if (intent.match.test(q)) return intent.reply[lang];
  }
  return FALLBACK[lang];
}
