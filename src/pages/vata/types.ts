
export type Language = 'fr' | 'en';

export interface LocalizedText {
  fr: string;
  en: string;
}

export interface ButtonText {
  cta: LocalizedText;
  learnMore: LocalizedText;
  login: LocalizedText;
}

export interface DiagnosticItem {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
}

export interface LifeSituation {
  id: string;
  title: LocalizedText;
  question: LocalizedText;
  solution: LocalizedText;
  icon: string;
}

export interface ProgramPhase {
  id: number;
  title: LocalizedText;
  subtitle?: LocalizedText;
  description: LocalizedText;
  topics?: LocalizedText[];
  icon: string;
}

export interface PricingTier {
  name: LocalizedText;
  price: LocalizedText;
  promoPrice?: LocalizedText;
  paymentPlan?: LocalizedText;
  description: LocalizedText;
  features: LocalizedText[];
  highlight?: string;
  recommended?: boolean;
  checkoutUrl: string;
  buttonText?: LocalizedText;
  image?: string;
}

export interface ContextItem {
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
}

export interface ContextSection {
  title: LocalizedText;
  subtitle: LocalizedText;
  items: ContextItem[];
}

export interface InclusionsSection {
  title: LocalizedText;
  subtitle: LocalizedText;
  items: LocalizedText[];
}

export interface ExperienceCard {
  title: LocalizedText;
  intro: LocalizedText;
  image?: string;
  bullets: LocalizedText[];
  price: LocalizedText;
  promoPrice: LocalizedText;
  promoLabel: LocalizedText;
  buttonText: LocalizedText;
  url: string;
  isPremium: boolean;
}

export interface ExperienceSection {
  title: LocalizedText;
  cards: ExperienceCard[];
}

export interface TestimonialItem {
  quote: LocalizedText;
  author: string;
  role: LocalizedText;
}

export interface TestimonialsSection {
  title: LocalizedText;
  subtitle: LocalizedText;
  items: TestimonialItem[];
}

export interface FAQItem {
  question: LocalizedText;
  answer: LocalizedText;
}

export interface FAQSection {
  title: LocalizedText;
  items: FAQItem[];
  banner: {
    title: LocalizedText;
    buttons: {
      essential: LocalizedText;
      premium: LocalizedText;
    };
  };
}

export interface AmbassadorSection {
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  steps: {
    title: LocalizedText;
    description: LocalizedText;
    icon: string;
  }[];
  calculus: {
    title: LocalizedText;
    disclaimer: LocalizedText;
    items: {
      sales: string;
      percent: string;
      total: string;
    }[];
  };
  cta: LocalizedText;
}

export interface DiscoverMoreItem {
  title: LocalizedText;
  buttonText: LocalizedText;
  url: string;
  icon: string;
}

export interface DiscoverMoreSection {
  title: LocalizedText;
  items: DiscoverMoreItem[];
}

export interface GlobalContent {
  nav: {
    brand: string;
    buttons: ButtonText;
  };
  buttons: {
    subscribe: LocalizedText;
    next: LocalizedText;
  };
  hero: {
    title: LocalizedText;
    subtitle: LocalizedText;
    tagline: LocalizedText;
    bullets: LocalizedText[];
    buttons: {
      essential: LocalizedText;
      premium: LocalizedText;
    };
  };
  diagnosis: {
    title: LocalizedText;
    subtitle: LocalizedText;
    items: DiagnosticItem[];
    situations: LifeSituation[];
    closing: LocalizedText;
  };
  context: ContextSection;
  inclusions: InclusionsSection;
  experience: ExperienceSection;
  testimonials: TestimonialsSection;
  program: {
    title: LocalizedText;
    subtitle: LocalizedText;
    phases: ProgramPhase[];
  };
  pricing: {
    title: LocalizedText;
    promoDeadline: LocalizedText;
    tiers: PricingTier[];
  };
  boussole: {
    title: LocalizedText;
    subtitle: LocalizedText;
    description: LocalizedText;
  };
  bio: {
    title: LocalizedText;
    role: LocalizedText;
    subtitle: LocalizedText;
    highlight: LocalizedText;
    description: LocalizedText[];
  };
  faq: FAQSection;
  ambassadors: AmbassadorSection;
  discoverMore: DiscoverMoreSection;
}
