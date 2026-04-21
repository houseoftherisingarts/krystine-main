
import { ContentText } from './types';

// Extend the ContentText interface conceptually by adding the transition field
// (Usually we'd update types.ts but we can just use the keys here if we're careful)

export const CONTENT: Record<'fr' | 'en', any> = {
  fr: {
    hero: {
      title: "Expérience Origine",
      subtitle: "Le problème n’est pas un manque de discipline. C’est la perte d’un référentiel intérieur fiable.",
      cta: "Rejoindre l'Atelier",
    },
    transition: "Découvrir encore plus avec Krystine",
    philosophy: {
      title: "Axe Fondamental",
      intro: "Origine est le point où l’humain savait encore se référer à lui-même. Une sagesse pour questionner les règles extérieures et réapprendre à écouter les signaux du corps.",
      cards: [
        {
          title: "Le Rythme (Ritam)",
          desc: "Le rythme naturel — et la déconnexion quand il se perd. Revenir à l'alternance et aux repères qui rendent la vie lisible."
        },
        {
          title: "Les Signaux",
          desc: "Comprendre comment les qualités de la nature (chaud, froid, sec, humide) influencent l'état intérieur."
        },
        {
          title: "La Cohérence",
          desc: "La reconstruction se fait par répétition juste. Transformer le repère en compétence."
        }
      ]
    },
    timeline: {
      title: "Le Sentier de l'Apothicaire",
      intro: "Un parcours progressif en 3 temps pour rétablir votre boussole intérieure.",
      steps: [
        {
          id: "01",
          title: "L'Ancrage (Terre)",
          duration: "Semaines 1-4",
          desc: "Installer le repère.",
          details: "Nous descendons dans la matière. Sommeil, alimentation, routines du matin. C'est ici que l'on cesse de flotter."
        },
        {
          id: "02",
          title: "L'Alchimie (Feu)",
          duration: "Semaines 5-8",
          desc: "La transformation digestive.",
          details: "Le feu digestif (Agni) n'est pas que dans l'estomac. C'est notre capacité à traiter le monde, les émotions et les aliments."
        },
        {
          id: "03",
          title: "La Clarté (Éther)",
          duration: "Semaines 9-12",
          desc: "Incarner la cohérence.",
          details: "Quand le bruit s'apaise, la vision devient claire. L'intuition n'est plus magique, elle est biologique."
        }
      ]
    },
    grimoire: {
      title: "Le Grimoire de l'Apothicaire",
      subtitle: "Plus qu'un PDF, un objet de transmission.",
      features: [
        "Protocoles saisonniers",
        "Recettes ancestrales",
        "Journal d'observation quotidien"
      ],
      downloadText: "Inclus dans l'Expérience"
    },
    audio: {
      title: "L'Essence de l'Atelier",
      subtitle: "Écoutez Krystine expliquer la philosophie de l'Origine.",
      buttonPlay: "Écouter l'extrait",
      buttonPause: "Pause"
    },
    pricing: {
      title: "Rejoignez le Cercle",
      price: "Accès Fondateur",
      features: [
        "Accès complet aux 3 Modules",
        "Workbooks (Grimoires) à imprimer",
        "Sessions Q&A mensuelles",
        "Communauté privée"
      ],
      cta: "Commencer l'Expérience",
      guarantee: {
        badge: "Garantie 30 Jours",
        title: "Garantie Cœur Léger",
        text: "Si vous ne ressentez pas l'ancrage promis, nous vous remboursons intégralement."
      }
    },
    about: {
      title: "Krystine St-Laurent",
      p1: "35 ans à traverser les milieux de la santé — soins intensifs, industrie pharmaceutique, recherche clinique en insuffisance cardiaque — avant de choisir l'herboristerie, l'Ayurveda et l'aromathérapie. Elle a vu ce que l'approche moderne fait bien. Et elle a vu là où elle laisse les gens seuls.",
      testimonials: [
        { text: "Personne ne parle de ces choses-là comme Krystine. Quand elle explique, tout devient clair.", author: "Annie" },
        { text: "Je me suis rarement écoutée tout au long de ma vie. C'est la première fois que quelqu'un me donne les outils pour le faire.", author: "Françoise" },
        { text: "Ce que j'ai lu dans cent livres sans comprendre, Krystine l'a rendu évident.", author: "Marie" }
      ]
    },
    podcast: {
      title: "Découvrez plus avec Krystine",
      cta: "Écouter le Podcast"
    }
  },
  en: {
    hero: {
      title: "Origin Experience",
      subtitle: "The problem is not a lack of discipline. It is the loss of a reliable inner reference.",
      cta: "Join the Workshop",
    },
    transition: "Discover even more with Krystine",
    philosophy: {
      title: "Fundamental Axis",
      intro: "Origin is the point where humans still knew how to refer to themselves. A wisdom to question external rules and relearn to listen to body signals.",
      cards: [
        {
          title: "Rhythm (Ritam)",
          desc: "Natural rhythm — and the disconnection when lost. Returning to the alternation that makes life readable."
        },
        {
          title: "Signals",
          desc: "Understanding how nature's qualities (hot, cold, dry, moist) influence your inner state."
        },
        {
          title: "Coherence",
          desc: "Reconstruction happens through right repetition. Turning the reference into competence."
        }
      ]
    },
    timeline: {
      title: "The Apothecary's Path",
      intro: "A progressive 3-stage journey to restore your inner compass.",
      steps: [
        {
          id: "01",
          title: "Grounding (Earth)",
          duration: "Weeks 1-4",
          desc: "Installing the reference.",
          details: "We descend into matter. Sleep, nutrition, morning routines. This is where we stop floating."
        },
        {
          id: "02",
          title: "Alchemy (Fire)",
          duration: "Weeks 5-8",
          desc: "Digestive transformation.",
          details: "Digestive fire (Agni) isn't just in the stomach. It is our capacity to process the world, emotions, and food."
        },
        {
          id: "03",
          title: "Clarity (Ether)",
          duration: "Weeks 9-12",
          desc: "Embodying coherence.",
          details: "When the noise settles, vision becomes clear. Intuition is no longer magic, it is biological."
        }
      ]
    },
    grimoire: {
      title: "The Apothecary's Grimoire",
      subtitle: "More than a PDF, an object of transmission.",
      features: [
        "Seasonal Protocols",
        "Ancestral Recipes",
        "Daily Observation Journal"
      ],
      downloadText: "Included in the Experience"
    },
    audio: {
      title: "The Essence of the Workshop",
      subtitle: "Listen to Krystine explain the philosophy of Origin.",
      buttonPlay: "Play Sample",
      buttonPause: "Pause"
    },
    pricing: {
      title: "Join the Circle",
      price: "Founder Access",
      features: [
        "Full access to 3 Modules",
        "Printable Workbooks (Grimoires)",
        "Monthly Q&A Sessions",
        "Private Community"
      ],
      cta: "Start the Experience",
      guarantee: {
        badge: "30 Day Guarantee",
        title: "Light Heart Guarantee",
        text: "If you don't feel the promised grounding, we will refund you in full."
      }
    },
    about: {
      title: "Krystine St-Laurent",
      p1: "35 years traversing health environments — intensive care, pharmaceutical industry, clinical research in heart failure — before choosing herbalism, Ayurveda, and aromatherapy. She saw what the modern approach does well. And she saw where it leaves people alone.",
      testimonials: [
        { text: "No one talks about these things like Krystine. When she explains, everything becomes clear.", author: "Annie" },
        { text: "I have rarely listened to myself throughout my life. This is the first time someone gives me the tools to do so.", author: "Françoise" },
        { text: "What I read in a hundred books without understanding, Krystine made obvious.", author: "Marie" }
      ]
    },
    podcast: {
      title: "Discover more with Krystine",
      cta: "Listen to the Podcast"
    }
  }
};
