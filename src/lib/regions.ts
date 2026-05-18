// Cascading region data for the /liste-attente form.
// First select chooses a country (or Canadian province for QC granularity),
// second select lists the administrative regions inside it. For the long
// tail (US states, rest of world) we fall back to a free-text input.
//
// Stored on the newsletter doc as:
//   province: <CountryConfig.label>   e.g. "Québec", "France"
//   region:   <selected region>        e.g. "Outaouais", "Ardèche"

export interface CountryConfig {
  /** Stable key for the select option. */
  code: string;
  /** What the visitor sees in the first dropdown. */
  label: string;
  /** When set, the second dropdown lists these regions. */
  regions?: string[];
  /** When true, the second field is a free-text input instead. */
  regionFreeText?: boolean;
  /** Placeholder for the free-text variant. */
  regionPlaceholder?: string;
}

// 17 régions administratives du Québec (alpha order kept loose so the
// most populous read near the top — same convention the public CRM uses).
const QC_REGIONS = [
  'Montréal',
  'Laval',
  'Montérégie',
  'Laurentides',
  'Lanaudière',
  'Capitale-Nationale',
  'Outaouais',
  'Estrie',
  'Mauricie',
  'Centre-du-Québec',
  'Chaudière-Appalaches',
  'Saguenay–Lac-Saint-Jean',
  'Bas-Saint-Laurent',
  'Abitibi-Témiscamingue',
  'Côte-Nord',
  'Gaspésie–Îles-de-la-Madeleine',
  'Nord-du-Québec',
];

// 96 départements métropolitains + 5 DOM. Sorted by numéro INSEE so French
// visitors find theirs in the order they're used to (01 Ain → 976 Mayotte).
const FR_DEPARTEMENTS = [
  '01 — Ain',
  '02 — Aisne',
  '03 — Allier',
  '04 — Alpes-de-Haute-Provence',
  '05 — Hautes-Alpes',
  '06 — Alpes-Maritimes',
  '07 — Ardèche',
  '08 — Ardennes',
  '09 — Ariège',
  '10 — Aube',
  '11 — Aude',
  '12 — Aveyron',
  '13 — Bouches-du-Rhône',
  '14 — Calvados',
  '15 — Cantal',
  '16 — Charente',
  '17 — Charente-Maritime',
  '18 — Cher',
  '19 — Corrèze',
  '2A — Corse-du-Sud',
  '2B — Haute-Corse',
  '21 — Côte-d’Or',
  '22 — Côtes-d’Armor',
  '23 — Creuse',
  '24 — Dordogne',
  '25 — Doubs',
  '26 — Drôme',
  '27 — Eure',
  '28 — Eure-et-Loir',
  '29 — Finistère',
  '30 — Gard',
  '31 — Haute-Garonne',
  '32 — Gers',
  '33 — Gironde',
  '34 — Hérault',
  '35 — Ille-et-Vilaine',
  '36 — Indre',
  '37 — Indre-et-Loire',
  '38 — Isère',
  '39 — Jura',
  '40 — Landes',
  '41 — Loir-et-Cher',
  '42 — Loire',
  '43 — Haute-Loire',
  '44 — Loire-Atlantique',
  '45 — Loiret',
  '46 — Lot',
  '47 — Lot-et-Garonne',
  '48 — Lozère',
  '49 — Maine-et-Loire',
  '50 — Manche',
  '51 — Marne',
  '52 — Haute-Marne',
  '53 — Mayenne',
  '54 — Meurthe-et-Moselle',
  '55 — Meuse',
  '56 — Morbihan',
  '57 — Moselle',
  '58 — Nièvre',
  '59 — Nord',
  '60 — Oise',
  '61 — Orne',
  '62 — Pas-de-Calais',
  '63 — Puy-de-Dôme',
  '64 — Pyrénées-Atlantiques',
  '65 — Hautes-Pyrénées',
  '66 — Pyrénées-Orientales',
  '67 — Bas-Rhin',
  '68 — Haut-Rhin',
  '69 — Rhône',
  '70 — Haute-Saône',
  '71 — Saône-et-Loire',
  '72 — Sarthe',
  '73 — Savoie',
  '74 — Haute-Savoie',
  '75 — Paris',
  '76 — Seine-Maritime',
  '77 — Seine-et-Marne',
  '78 — Yvelines',
  '79 — Deux-Sèvres',
  '80 — Somme',
  '81 — Tarn',
  '82 — Tarn-et-Garonne',
  '83 — Var',
  '84 — Vaucluse',
  '85 — Vendée',
  '86 — Vienne',
  '87 — Haute-Vienne',
  '88 — Vosges',
  '89 — Yonne',
  '90 — Territoire de Belfort',
  '91 — Essonne',
  '92 — Hauts-de-Seine',
  '93 — Seine-Saint-Denis',
  '94 — Val-de-Marne',
  '95 — Val-d’Oise',
  '971 — Guadeloupe',
  '972 — Martinique',
  '973 — Guyane',
  '974 — La Réunion',
  '976 — Mayotte',
];

// 11 provinces belges (les 10 + Région de Bruxelles-Capitale).
const BE_PROVINCES = [
  'Bruxelles-Capitale',
  'Brabant wallon',
  'Hainaut',
  'Liège',
  'Luxembourg',
  'Namur',
  'Anvers',
  'Brabant flamand',
  'Flandre-Occidentale',
  'Flandre-Orientale',
  'Limbourg',
];

// 26 cantons suisses — francophones en tête (l'audience principale).
const CH_CANTONS = [
  'Genève',
  'Vaud',
  'Neuchâtel',
  'Jura',
  'Fribourg',
  'Valais',
  'Berne',
  'Tessin',
  'Zurich',
  'Bâle-Ville',
  'Bâle-Campagne',
  'Argovie',
  'Lucerne',
  'Soleure',
  'Schaffhouse',
  'Saint-Gall',
  'Thurgovie',
  'Grisons',
  'Schwytz',
  'Zoug',
  'Uri',
  'Obwald',
  'Nidwald',
  'Glaris',
  'Appenzell Rhodes-Extérieures',
  'Appenzell Rhodes-Intérieures',
];

// Reste du Canada — provinces et territoires, hors Québec qui a son entrée
// dédiée pour la granularité régionale.
const CA_OTHER_PROVINCES = [
  'Ontario',
  'Nouveau-Brunswick',
  'Nouvelle-Écosse',
  'Île-du-Prince-Édouard',
  'Terre-Neuve-et-Labrador',
  'Manitoba',
  'Saskatchewan',
  'Alberta',
  'Colombie-Britannique',
  'Yukon',
  'Territoires du Nord-Ouest',
  'Nunavut',
];

export const COUNTRIES: CountryConfig[] = [
  { code: 'QC',    label: 'Québec',                            regions: QC_REGIONS },
  { code: 'CA',    label: 'Canada — autres provinces',         regions: CA_OTHER_PROVINCES },
  { code: 'FR',    label: 'France',                            regions: FR_DEPARTEMENTS },
  { code: 'BE',    label: 'Belgique',                          regions: BE_PROVINCES },
  { code: 'CH',    label: 'Suisse',                            regions: CH_CANTONS },
  { code: 'US',    label: 'États-Unis',                        regionFreeText: true, regionPlaceholder: 'État (p. ex. Vermont)' },
  { code: 'OTHER', label: 'Ailleurs dans le monde',            regionFreeText: true, regionPlaceholder: 'Pays · ville ou région' },
];

export const findCountry = (code: string): CountryConfig | undefined =>
  COUNTRIES.find(c => c.code === code);
