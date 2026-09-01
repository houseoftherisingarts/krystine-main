import { tr } from './i18n/lang';
// Per-route SEO metadata for the SPA. index.html carries the defaults for
// the home; every client-side route below overrides document.title, the
// meta description and the canonical URL so pages stop declaring themselves
// canonical duplicates of the root (which blocked their indexation).

const SITE = 'Krystine St-Laurent';
const ORIGIN = 'https://www.krystinestlaurent.ca';

type PageMeta = { title: string; description: string };

const ROUTES: Record<string, PageMeta> = {
  '/krystine': {
    title: `${SITE} · Conférencière et auteure en ayurveda`,
    description: 'Krystine St-Laurent, infirmière de formation, auteure et conférencière: 37 ans à traverser les milieux de la santé avant de choisir l’herboristerie, l’Ayurveda et l’aromathérapie.',
  },
  '/conferenciere': {
    title: `Conférences et ateliers · ${SITE}`,
    description: 'Conférences et ateliers en santé globale et ayurveda, cousus main pour votre public. USA, Canada et Europe.',
  },
  '/formations': {
    title: `Formations et expériences · ${SITE}`,
    description: 'Formations, programmes saisonniers et expériences ayurvédiques guidées par Krystine St-Laurent: Origine, Vata, Pitta, Kapha.',
  },
  '/medias': {
    title: `Podcasts, médias et livres · ${SITE}`,
    description: 'Le podcast Au-delà des tendances, la trilogie Nature & Ayurveda, les passages télé et les entrevues de Krystine St-Laurent.',
  },
  '/medias/tv': {
    title: `À la télé · ${SITE}`,
    description: 'Les chroniques et passages télé de Krystine St-Laurent: santé globale, plantes et rituels de saison.',
  },
  '/podcast': {
    title: `Podcast Au-delà des tendances · ${SITE}`,
    description: 'Au-delà des tendances, le podcast de Krystine St-Laurent: conversations sur le corps, les saisons et la sagesse ayurvédique.',
  },
  '/podcast/question': {
    title: `Posez votre question · ${SITE}`,
    description: 'Écrivez votre question à Krystine St-Laurent pendant le direct du podcast. Elle y répond en ondes.',
  },
  '/boutique': {
    title: `Boutique Inspirata Ayurveda · ${SITE}`,
    description: 'Huiles infusées à la main, rituels et soins ayurvédiques formulés par Krystine St-Laurent. Plantes locales, pression lente.',
  },
  '/blogue': {
    title: `Le Blogue · ${SITE}`,
    description: 'Des notes sur le corps, les saisons et la sagesse qui se dépose au fil du temps.',
  },
  '/points-de-vente': {
    title: `Points de vente · ${SITE}`,
    description: 'Les boutiques partenaires où trouver les livres et rituels Inspirata au Québec.',
  },
  '/quiz': {
    title: `Quiz Dosha · ${SITE}`,
    description: 'Dix questions pour révéler votre dominance du moment: Vata, Pitta ou Kapha. Gratuit, 3 minutes.',
  },
  '/guide': {
    title: `Laissez-vous guider · ${SITE}`,
    description: 'Cinq questions pour trouver votre prochaine porte d’entrée dans l’univers de Krystine St-Laurent.',
  },
  '/origine': {
    title: `Expérience Origine · ${SITE}`,
    description: 'Le parcours signature de Krystine St-Laurent: un retour à l’origine par l’ayurveda, les plantes et les rituels de saison.',
  },
  '/vata': {
    title: `Expérience Vata · ${SITE}`,
    description: 'L’expérience saisonnière d’automne: apaiser Vata avec les rituels, les huiles et la sagesse ayurvédique.',
  },
  '/liste-attente': {
    title: `Liste d’attente · ${SITE}`,
    description: 'Inscrivez-vous pour être avisée dès que la prochaine programmation ouvre ses portes.',
  },
  '/compte': {
    title: `Mon espace · ${SITE}`,
    description: 'Votre espace membre Inspirata: commandes, infolettres et fidélité.',
  },
  '/politique-de-confidentialite': {
    title: `Politique de confidentialité · ${SITE}`,
    description: 'Politique de confidentialité du site krystinestlaurent.ca.',
  },
};

const DEFAULT_META: PageMeta = {
  title: `${SITE} · Sagesse ayurvédique pour une vie consciente`,
  description: 'Infirmière de formation, auteure et conférencière, Krystine St-Laurent tisse des ponts entre la santé moderne, l’herboristerie et l’Ayurveda.',
};

function setNamedMeta(attr: 'name' | 'property', key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

export function applyPageMeta(pathname: string) {
  // Collection sub-pages inherit the boutique meta; unknown routes fall back.
  const base = pathname.startsWith('/boutique/') ? ROUTES['/boutique'] : ROUTES[pathname];
  const raw = base || DEFAULT_META;
  const meta = { title: tr(raw.title), description: tr(raw.description) };

  document.title = meta.title;
  setNamedMeta('name', 'description', meta.description);
  setNamedMeta('property', 'og:title', meta.title);
  setNamedMeta('property', 'og:description', meta.description);

  const canonicalHref = ORIGIN + (pathname === '/' ? '/' : pathname.replace(/\/$/, ''));
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', canonicalHref);
  setNamedMeta('property', 'og:url', canonicalHref);
}
