export type Language = 'fr' | 'en';
export type Theme = 'light' | 'dark';

export interface ContentText {
  hero: {
    title: string;
    subtitle: string;
    cta: string;
  };
  philosophy: {
    title: string;
    intro: string;
    cards: {
      title: string;
      desc: string;
    }[];
  };
  timeline: {
    title: string;
    intro: string;
    steps: {
      id: string;
      title: string;
      duration: string;
      desc: string;
      details: string;
    }[];
  };
  grimoire: {
    title: string;
    subtitle: string;
    features: string[];
    downloadText: string;
  };
  audio: {
    title: string;
    subtitle: string;
    buttonPlay: string;
    buttonPause: string;
  };
  pricing: {
    title: string;
    price: string;
    features: string[];
    cta: string;
    guarantee: {
      badge: string;
      title: string;
      text: string;
    };
  };
  about: {
    title: string;
    p1: string;
    p2: string;
    achievements: string;
  };
  podcast: {
    title: string;
    cta: string;
  };
}