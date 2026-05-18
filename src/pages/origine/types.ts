export type Language = 'fr' | 'en';
export type Theme = 'light' | 'dark';

export interface PricingData {
  guarantee: any;
}

export interface ContentData {
  timeline: any;
  audio: any;
  grimoire: any;
  pricing: PricingData;
  about: { title: string; achievements: string; };
}
