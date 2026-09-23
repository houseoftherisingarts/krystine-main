import React, { useState } from 'react';
import { Card } from '../primitives';

/**
 * Droit international : le dossier que Vexel tient pour Krystine sur ce qui
 * change quand une cliente vit ailleurs qu'au Québec. Page de lecture, sans
 * base de données : le contenu vit dans DOSSIERS ci-dessous, et chaque fait
 * porte sa source pour qu'on puisse le revérifier l'an prochain.
 *
 * Mise à jour : Vexel, 22 septembre 2026.
 */

interface Source {
  titre: string;
  url: string;
}

interface Dossier {
  id: string;
  icone: string;
  titre: string;
  /** La phrase qui se lit sans déplier. */
  resume: string;
  /** Est-ce que ça la vise aujourd'hui : le texte de la pastille. */
  statut: 'Vous êtes visée' | 'Pas encore' | 'À surveiller';
  /** Les paragraphes, en prose. */
  corps: string[];
  /** Ce qu'elle a à décider ou à faire, s'il y a quelque chose. */
  geste?: string;
  sources: Source[];
}

const DOSSIERS: Dossier[] = [
  {
    id: 'ou-vivent',
    icone: 'fa-earth-americas',
    titre: 'La règle qui gouverne tout le reste',
    resume:
      "Ce n'est pas votre adresse qui décide des lois qui s'appliquent à vous, c'est celle de la personne qui vous achète quelque chose.",
    statut: 'Vous êtes visée',
    corps: [
      "Une entreprise québécoise qui vend uniquement au Québec vit sous une seule loi de protection des renseignements personnels et sous un seul régime de taxes. Dès qu'une lectrice de Lyon achète un livre numérique ou qu'une abonnée de Boston s'inscrit à l'infolettre, le droit de son pays entre dans votre vie, parce que ces lois protègent les personnes là où elles vivent plutôt que les entreprises là où elles sont établies.",
      "La bonne nouvelle est que ces régimes se ressemblent beaucoup plus qu'ils ne diffèrent : demander la permission avant d'écrire, dire ce que vous faites des renseignements, laisser une porte de sortie facile, et garder une trace de vos décisions. Une entreprise qui tient la loi québécoise correctement a déjà fait les trois quarts du chemin vers le règlement européen.",
      "La mauvaise nouvelle tient en un mot : les seuils. Plusieurs de ces régimes ne prévoient aucun montant minimum, si bien que la première vente à l'étranger déclenche l'obligation au même titre que la millième. C'est pour cette raison que cette page existe avant que le développement international soit lancé plutôt qu'après.",
    ],
    sources: [],
  },
  {
    id: 'loi25',
    icone: 'fa-fleur-de-lis',
    titre: 'Le Québec, votre sol de départ',
    resume:
      "La Loi 25 vous vise depuis 2022, et l'essentiel est déjà en place sur votre site : la personne responsable, la politique, le consentement, les témoins, le registre.",
    statut: 'Vous êtes visée',
    corps: [
      "La réforme québécoise est entrée en vigueur par vagues. Depuis le 22 septembre 2022, toute entreprise tient un registre de ses incidents de confidentialité et ne peut plus activer par défaut les témoins de navigation qui servent au profilage. Depuis le 22 septembre 2023, elle désigne une personne responsable de la protection des renseignements personnels, publie ses coordonnées, adopte une politique de confidentialité écrite en langage simple, et recueille un consentement manifeste, libre et éclairé, donné pour des fins précises. Depuis le 22 septembre 2024 s'ajoute le droit à la portabilité, qui permet à une cliente de repartir avec ses données dans un format lisible par une autre plateforme.",
      "Par défaut, la personne responsable est celle qui exerce la plus haute autorité dans l'entreprise, donc vous, et cette fonction se délègue par écrit. Votre site porte déjà la politique, la bannière de consentement, le registre et l'outil d'exportation, si bien que votre part du travail tient dans une habitude plutôt que dans un chantier : ne jamais ajouter une case précochée, ne jamais écrire à quelqu'un qui n'a rien demandé, et prévenir Vexel quand un incident survient.",
      "La Commission d'accès à l'information surveille tout cela et peut imposer des sanctions administratives. Dans les faits, elle enquête quand elle reçoit une plainte, et une plainte vient presque toujours d'une personne qui a demandé quelque chose et n'a pas eu de réponse.",
    ],
    sources: [
      {
        titre: "Les principaux changements de la Loi 25, Commission d'accès à l'information",
        url: 'https://www.cai.gouv.qc.ca/protection-renseignements-personnels/sujets-et-domaines-dinteret/principaux-changements-loi-25',
      },
    ],
  },
  {
    id: 'rgpd',
    icone: 'fa-flag',
    titre: "L'Europe et le règlement général sur la protection des données",
    resume:
      "Le RGPD vous atteint le jour où vous visez le marché européen, ce qui se mesure à vos gestes de vente et non à l'accessibilité de votre site.",
    statut: 'À surveiller',
    corps: [
      "Un site québécois qu'une Française peut ouvrir depuis Lyon n'est pas, en soi, une offre de services faite à l'Europe. Le comité européen de la protection des données regarde ce que l'entreprise fait pour attirer ces personnes : afficher des prix en euros, proposer la livraison en France, acheter de la publicité qui cible un pays européen, nommer des clientes européennes en témoignage, tenir une version du site dans une langue qui n'est pas celle de son marché naturel. Un faisceau de ces indices vous rend visée, et votre site en français joue ici un rôle particulier, parce que le français se parle en France, en Belgique et en Suisse autant qu'ici.",
      "Quand le règlement s'applique, il demande une base légale pour chaque traitement, un consentement libre et révocable pour l'infolettre, une information claire sur ce que vous faites des données, le respect des droits d'accès, de rectification et d'effacement dans un délai d'un mois, et la tenue d'un registre de vos traitements. Les amendes montent très haut sur papier, jusqu'à vingt millions d'euros ou quatre pour cent du chiffre d'affaires mondial, mais les autorités européennes ne poursuivent pas une entreprise québécoise de votre taille pour un manquement de forme : elles répondent à des plaintes, et une plainte vient d'une personne mécontente.",
      "La vraie ligne de conduite est donc celle-ci : tant que vous ne courtisez pas activement l'Europe, vous restez en marge du règlement. Le jour où vous décidez d'y vendre, plusieurs pièces se posent en même temps, et la page continue avec celles qui coûtent de l'argent.",
    ],
    geste: "Décider si l'Europe fait partie du plan des douze prochains mois, parce que la réponse commande tout le reste de cette page.",
    sources: [
      {
        titre: 'Lignes directrices 3/2018 du comité européen sur le champ territorial',
        url: 'https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-32018-territorial-scope-gdpr-article-3_fr',
      },
      { titre: 'Article 3 du règlement', url: 'https://gdpr-info.eu/art-3-gdpr/' },
    ],
  },
  {
    id: 'representant',
    icone: 'fa-user-tie',
    titre: "Le représentant européen, si vous vendez là-bas",
    resume:
      "Une entreprise hors de l'Union qui vise le marché européen doit y nommer quelqu'un comme porte d'entrée. Une firme spécialisée tient ce rôle pour 420 euros par année.",
    statut: 'Pas encore',
    corps: [
      "L'article 27 du règlement exige qu'une entreprise établie hors de l'Union, mais qui y offre ses services, désigne une personne ou une firme établie dans un pays membre. Son nom et son adresse s'inscrivent dans votre politique de confidentialité, et c'est à elle qu'une lectrice européenne ou une autorité de contrôle écrit quand elle a une question ou une plainte. La désignation doit précéder la première vente plutôt que la suivre.",
      "Une amie qui vit en France peut juridiquement tenir ce rôle, puisque le texte parle d'une personne physique ou morale établie dans l'Union, mais le service que cela suppose est plus lourd qu'une signature de complaisance. Le représentant tient le registre de vos traitements, répond aux demandes dans la langue de la personne, et le considérant 80 du règlement prévoit qu'une autorité puisse engager contre lui des mesures d'exécution quand l'entreprise ne répond pas. Demander cette responsabilité à une amie revient à lui demander de garantir votre conformité, ce qui abîme les amitiés plus sûrement que les finances.",
      "Les firmes qui font ce métier facturent à l'année et s'activent en quelques jours. Prighter, basée à Vienne, demande 420 euros par année à son palier Growth, qui convient à une entreprise de votre taille, et la même maison couvre le règlement sur les services numériques et le Royaume-Uni avec une remise de dix pour cent par service additionnel. Ses concurrentes directes, DataRep et EDPO, facturent selon le nombre d'employés ou de personnes concernées, et se situent généralement plus haut pour une petite structure.",
    ],
    geste: "Ne rien payer tant que l'Europe reste hypothétique, et garder l'adresse de Prighter au dossier pour le jour où la première vente européenne se prépare.",
    sources: [
      { titre: 'Article 27 du règlement', url: 'https://gdpr-info.eu/art-27-gdpr/' },
      { titre: 'Tarifs de Prighter', url: 'https://prighter.com/pricing/' },
      { titre: 'DataRep', url: 'https://www.datarep.com/service/eu-gdpr-article-27-representative-service/' },
      { titre: 'EDPO', url: 'https://edpo.com/' },
    ],
  },
  {
    id: 'tva',
    icone: 'fa-euro-sign',
    titre: "La TVA européenne, le piège des produits numériques",
    resume:
      "Une entreprise établie hors de l'Union doit la TVA dès le premier euro vendu à une particulière européenne. Aucun seuil ne protège, et le taux est celui de son pays à elle.",
    statut: 'À surveiller',
    corps: [
      "Le seuil de dix mille euros dont on entend souvent parler ne s'applique qu'aux entreprises déjà établies dans l'Union qui vendent d'un pays membre à un autre. Une entreprise québécoise n'en bénéficie jamais : la première formation vendue à une Belge ou le premier livre numérique acheté par une Française déclenchent l'obligation. Le taux applicable est celui du pays où vit la cliente, ce qui veut dire vingt taux différents plutôt qu'un.",
      "Le mécanisme prévu pour rendre cela vivable s'appelle le guichet unique, régime non-Union. Vous choisissez un seul pays membre comme porte d'entrée, vous vous y inscrivez en ligne, puis vous produisez une seule déclaration trimestrielle qui couvre les vingt-sept pays et vous payez en euros. Aucun représentant fiscal n'est exigé pour ce régime, ce qui le distingue de la représentation dont parle le dossier précédent.",
      "Deux nuances valent la peine d'être connues avant de fixer un prix. Depuis la directive européenne du 5 avril 2022, chaque pays peut appliquer au livre numérique le même taux réduit qu'au livre imprimé, et plusieurs l'ont fait, ce qui rend vos livres nettement moins taxés que vos formations. Une formation préenregistrée, elle, demeure un service fourni par voie électronique, taxé au taux ordinaire du pays de la cliente.",
      "La sortie de secours existe et elle est simple : quand la vente passe par une véritable place de marché, c'est la place de marché qui devient redevable. Amazon vend vos livres numériques en son propre nom, perçoit la TVA et vous verse une redevance nette, si bien qu'un livre vendu par Amazon ne vous crée aucune obligation européenne. Une boutique que vous exploitez vous-même, comme Shopify ou votre propre site, ne vous protège pas de la même façon, parce que la vente reste la vôtre.",
    ],
    geste:
      "Si l'Europe entre dans le plan, passer les livres numériques par une place de marché et garder votre boutique pour le marché nord-américain, le temps de décider si le guichet unique en vaut la peine.",
    sources: [
      { titre: 'Guichet unique de TVA, Commission européenne', url: 'https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en' },
      { titre: 'Directive 2022/542 sur les taux réduits', url: 'https://eur-lex.europa.eu/eli/dir/2022/542/oj/eng' },
      { titre: 'TVA et livres numériques chez Amazon KDP', url: 'https://kdp.amazon.com/en_US/help/topic/G201645450' },
    ],
  },
  {
    id: 'etats-unis',
    icone: 'fa-flag-usa',
    titre: 'Les États-Unis, État par État',
    resume:
      "Depuis l'arrêt Wayfair de 2018, un État peut vous réclamer sa taxe de vente sans que vous y ayez le moindre bureau. Les seuils commencent à cent mille dollars de ventes dans cet État.",
    statut: 'Pas encore',
    corps: [
      "Il n'existe pas de taxe de vente américaine, mais une quarantaine de régimes d'États qui se ressemblent sans se confondre. La Cour suprême a jugé en 2018, dans South Dakota contre Wayfair, qu'un État peut exiger la perception de sa taxe sur la seule base d'un lien économique, sans présence physique. Le fait d'être une entreprise canadienne ne change rien : le critère est le montant vendu dans cet État.",
      "Les seuils et les règles varient assez pour renverser un calcul de prix. Le Dakota du Sud demande cent mille dollars de ventes dans l'année et taxe les produits transférés électroniquement. La Pennsylvanie applique le même seuil de cent mille dollars et taxe les livres numériques à six pour cent, avec un point de plus à Allegheny et deux de plus à Philadelphie. La Californie, elle, fixe son seuil à cinq cent mille dollars et ne taxe pas les livres numériques téléchargés, même après l'élargissement de sa taxe prévu pour janvier 2027.",
      "La loi californienne sur la vie privée, celle dont tout le monde parle, ne vous vise pas et ne vous visera pas de sitôt. Elle demande un chiffre d'affaires de vingt-six millions six cent vingt-cinq mille dollars, ou les renseignements de cent mille consommateurs californiens, ou la moitié de vos revenus tirée de la vente de données. Aucun de ces trois seuils ne s'approche de votre réalité.",
      "Autrement dit, le marché américain vous coûtera du temps de comptabilité bien avant de vous coûter du droit de la vie privée, et ce temps ne commence qu'une fois franchis les cent mille dollars de ventes dans un même État.",
    ],
    sources: [
      { titre: 'Département du revenu du Dakota du Sud', url: 'https://dor.sd.gov/businesses/taxes/sales-use-tax/' },
      { titre: 'Produits numériques en Pennsylvanie', url: 'https://www.pa.gov/agencies/revenue/resources/tax-types-and-information/sales-use-and-hotel-occupancy-tax/digital-products' },
      { titre: 'Seuil californien après Wayfair', url: 'https://cdtfa.ca.gov/industry/wayfair/' },
      { titre: "Seuils de la loi californienne sur la vie privée", url: 'https://oag.ca.gov/privacy/ccpa' },
    ],
  },
  {
    id: 'infolettre',
    icone: 'fa-envelope-open-text',
    titre: "L'infolettre, trois pays et trois logiques",
    resume:
      "Le Canada et l'Europe demandent une permission avant d'écrire, les États-Unis se contentent d'un désabonnement facile. Votre pratique actuelle satisfait les trois.",
    statut: 'Vous êtes visée',
    corps: [
      "La loi canadienne anti-pourriel exige un consentement avant l'envoi, exprès quand la personne coche elle-même, tacite quand elle vous a acheté quelque chose. Le consentement tacite a une date de péremption que peu de gens connaissent : deux ans après le dernier achat, six mois après une simple demande de renseignements. Chaque message porte votre nom, une façon de vous joindre et un lien de désabonnement qui fonctionne pendant au moins soixante jours, et un retrait se traite dans les dix jours ouvrables.",
      "L'Europe demande la même permission préalable, avec une exception qui porte le nom de consentement atténué : vous pouvez écrire à une cliente existante au sujet de produits semblables à ce qu'elle a acheté, pourvu qu'elle ait pu refuser au moment de la vente et qu'elle puisse refuser dans chaque message. La Cour de justice a confirmé cette lecture en novembre 2025.",
      "Les États-Unis fonctionnent à l'envers. Aucune permission préalable n'est requise, mais chaque courriel doit porter une adresse postale réelle, un objet qui ne trompe pas, et un désabonnement honoré en dix jours ouvrables. La sanction se calcule par courriel envoyé, jusqu'à cinquante-trois mille quatre-vingt-huit dollars américains pour un seul message fautif, ce qui rend l'envoi massif à une liste achetée franchement dangereux.",
      "Votre système actuel demande la permission, envoie la confirmation, garde la trace et retire en un clic, ce qui vous place du bon côté des trois régimes en même temps. Le seul geste qui les briserait tous serait d'importer une liste que vous n'avez pas bâtie vous-même.",
    ],
    geste:
      "Ne jamais importer dans l'infolettre une liste achetée, empruntée ou récoltée ailleurs, même quand une personne de confiance vous l'offre.",
    sources: [
      { titre: 'Guide du CRTC sur la loi canadienne anti-pourriel', url: 'https://crtc.gc.ca/eng/com500/guide.htm' },
      { titre: 'Guide de conformité CAN-SPAM, Federal Trade Commission', url: 'https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business' },
    ],
  },
  {
    id: 'hebergement',
    icone: 'fa-server',
    titre: 'Où vivent vos données, et pourquoi la loi veut le savoir',
    resume:
      "Votre site et vos listes vivent chez Google, aux États-Unis. La Loi 25 demande une évaluation écrite avant que des renseignements sortent du Québec, et Vexel l'a faite.",
    statut: 'Vous êtes visée',
    corps: [
      "La base de données de krystinestlaurent.ca, les fichiers que vous téléversez et les fonctions qui traitent vos commandes tournent dans des centres de données américains, les courriels transactionnels partent d'un service hébergé au Canada, et les paiements passent par Stripe, aux États-Unis et en Irlande. C'est la situation ordinaire de presque tous les sites québécois, y compris ceux des grandes entreprises d'ici.",
      "L'article 17 de la loi québécoise sur le secteur privé demande qu'avant de laisser un renseignement personnel sortir du Québec, l'entreprise évalue par écrit quatre choses : la sensibilité du renseignement, l'usage qu'on en fera, la protection dont il jouira là-bas, et les lois du pays d'arrivée. L'évaluation ne se dépose nulle part, elle se garde dans vos dossiers, et elle se sort le jour où la Commission d'accès à l'information pose la question.",
      "Vexel a rédigé cette évaluation le 22 septembre 2026 pour son infrastructure, celle qui porte votre site, et conclut à une protection adéquate pour les renseignements de la nature de ceux que vous traitez, soit des noms, des adresses de courriel, des commandes et des parcours de navigation. Cette conclusion tomberait si vous vous mettiez à recueillir des renseignements de santé, ce qu'un questionnaire de bien-être mal formulé peut faire sans qu'on l'ait voulu. La copie complète s'obtient sur demande auprès d'Alex.",
    ],
    geste: "Avant d'ajouter un questionnaire qui touche à la santé, au corps ou à l'état psychologique de vos clientes, en parler à Vexel : ce genre de question change la catégorie juridique de vos données.",
    sources: [
      {
        titre: 'Loi sur la protection des renseignements personnels dans le secteur privé, article 17',
        url: 'https://www.legisquebec.gouv.qc.ca/fr/document/lc/p-39.1',
      },
      {
        titre: "Guide de la Commission d'accès à l'information sur l'évaluation",
        url: 'https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_GU_EFVP.pdf',
      },
    ],
  },
];

const STATUT_STYLE: Record<Dossier['statut'], string> = {
  'Vous êtes visée': 'bg-[#BA7B39]/15 text-[#8B4A2F] dark:text-[#d9a05b]',
  'À surveiller': 'bg-[#293027]/10 text-[#293027]/70 dark:bg-white/10 dark:text-white/70',
  'Pas encore': 'bg-[#293027]/8 text-[#293027]/50 dark:bg-white/5 dark:text-white/50',
};

const DroitInternationalSection: React.FC = () => {
  const [ouvert, setOuvert] = useState<string | null>(DOSSIERS[0]?.id ?? null);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="flex items-center gap-3 text-lg font-bold text-[#293027] dark:text-white">
          <i className="fa-solid fa-earth-americas text-[#BA7B39]" aria-hidden />
          Droit international
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Vendre en ligne fait de vous une exportatrice le jour où une première cliente achète depuis
          l’étranger, et quelques lois vous suivent alors jusque chez elle. Cette page rassemble ce que
          Vexel a vérifié pour vous en septembre 2026, dossier par dossier, avec les sources pour que
          vous puissiez tout revoir vous-même. Elle sert à réfléchir avant de décider, pas à vous
          inquiéter : rien ici n’est urgent, et la plupart des cases sont déjà cochées.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#293027]/70 dark:text-white/70">
          Un dernier mot sur ce que cette page n’est pas. Vexel bâtit des sites et lit des textes de loi
          pour savoir comment les bâtir, ce qui ne remplace pas l’avis d’une avocate le jour où une
          somme importante ou une mise en demeure entre en scène.
        </p>
      </Card>

      {DOSSIERS.map(d => {
        const deplie = ouvert === d.id;
        return (
          <Card key={d.id} className="overflow-hidden">
            <button
              type="button"
              onClick={() => setOuvert(deplie ? null : d.id)}
              aria-expanded={deplie}
              className="flex w-full flex-wrap items-start justify-between gap-4 p-6 text-left"
            >
              <div className="min-w-[13rem] flex-1 basis-[20rem]">
                <h4 className="flex items-center gap-3 text-base font-bold text-[#293027] dark:text-white">
                  <i className={`fa-solid ${d.icone} text-[#BA7B39]`} aria-hidden />
                  {d.titre}
                </h4>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#293027]/65 dark:text-white/65">
                  {d.resume}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${STATUT_STYLE[d.statut]}`}
                >
                  {d.statut}
                </span>
                <i
                  className={`fa-solid fa-chevron-down text-xs text-[#293027]/40 transition-transform dark:text-white/40 ${deplie ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </div>
            </button>

            {deplie && (
              <div className="border-t border-[#293027]/10 px-6 pb-6 pt-5 dark:border-white/10">
                {d.corps.map((p, i) => (
                  <p
                    key={i}
                    className="mb-4 max-w-3xl text-sm leading-[1.85] text-[#293027]/75 last:mb-0 dark:text-white/75"
                  >
                    {p}
                  </p>
                ))}

                {d.geste && (
                  <div className="mt-5 rounded-2xl border border-[#BA7B39]/30 bg-[#BA7B39]/8 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">
                      Ce qu’il y a à décider
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#293027]/80 dark:text-white/80">
                      {d.geste}
                    </p>
                  </div>
                )}

                {d.sources.length > 0 && (
                  <div className="mt-5 border-t border-[#293027]/10 pt-4 dark:border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#293027]/45 dark:text-white/45">
                      Pour vérifier
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {d.sources.map(s => (
                        <li key={s.url}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#293027]/65 underline decoration-[#BA7B39]/40 underline-offset-4 transition-colors hover:text-[#8B4A2F] dark:text-white/65"
                          >
                            {s.titre}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default DroitInternationalSection;
