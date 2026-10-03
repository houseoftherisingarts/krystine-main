import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowUpRight, EyeSlash } from '@phosphor-icons/react';
import { StyleV2, Kicker, TitreChapitre, Filet, Reveal, BoutonNoir, CarteVerte, GOUTTIERE } from '../components/v2/Magazine';
import { useAuth, useUI } from '../contexts/AppContext';
import { useSiteFlags } from '../contexts/SiteFlagsContext';
import { PART_DEFAUT, PAS } from '../firebase/ambassadrices';

/**
 * La page qui explique le programme des ambassadrices (/ambassadrices) :
 * ce que c'est, les quatre gestes, le partage à essayer, puis les questions
 * qui reviennent. Tant que l'interrupteur ambassadricesOuvert est éteint,
 * une visiteuse repart vers l'accueil et l'admin reste seule à la relire.
 */

const DOUX = 'cubic-bezier(0.23,1,0.32,1)';
const GESTE = 'flex-1 min-h-[48px] rounded-full border border-[#EEE7DB]/35 px-4 py-2.5 text-[0.86rem] font-medium leading-tight text-[#EEE7DB] transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] disabled:border-dashed disabled:text-[#EEE7DB]/60 disabled:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:border-[#BA7B39] [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:bg-[#BA7B39]/15';

const T = {
  FR: {
    kicker: 'Le cercle des ambassadrices',
    titre: ['Devenez', 'ambassadrice'],
    sous: "Vous recommandez les formations de Krystine à votre entourage. La personne que vous invitez obtient un rabais, et vous recevez une part de chacun de ses achats.",
    geste: 'Devenir ambassadrice',
    gestesTitre: 'Quatre gestes, dans cet ordre',
    gestes: [
      ['Vous recevez votre code', "Dans votre espace membre, un seul bouton vous inscrit. Votre code et votre lien d'invitation y paraissent aussitôt."],
      ['Vous réglez votre partage', `Vous disposez de ${PART_DEFAUT} %, que vous répartissez entre le rabais de votre invitée et votre commission. Au départ, c'est moitié-moitié.`],
      ['Vous invitez', "La personne qui crée son espace avec votre lien ou votre code vous est rattachée, et son rabais s'applique de lui-même à chacune de ses formations."],
      ['Vous recevez votre part', "Chaque achat s'inscrit dans votre espace avec la commission qui vous revient, et Krystine vous la verse."],
    ],
    essaiKicker: 'À essayer',
    essaiTitre: 'Votre partage, sous vos doigts',
    essaiTexte: "Déplacez le partage pour voir ce que paie votre invitée et ce qui vous revient. Dans votre espace, le même réglage s'enregistre et vaut pour vos prochaines invitations.",
    rabais: 'Rabais de votre invitée', commission: 'Votre commission',
    plus: 'Donner plus à mon invitée', moins: 'Garder plus pour moi',
    exemple: (paye: string, recu: string) => `Sur une formation de 100 $, votre invitée paie ${paye} et vous recevez ${recu}.`,
    exempleTout: (paye: string) => `Sur une formation de 100 $, votre invitée paie ${paye} : vous lui offrez votre part entière.`,
    questionsTitre: 'Les questions qui reviennent',
    questions: [
      ['Qui peut devenir ambassadrice ?', "Toute personne qui a un espace membre sur le site. L'inscription se fait dans cet espace, en un geste."],
      ['Sur quoi le rabais et la commission portent-ils ?', "Ils portent sur les formations achetées sur le site par les personnes arrivées avec votre code, et la commission se calcule sur le montant réellement payé, avant les taxes."],
      ['Mon amie a déjà un compte. Peut-elle utiliser mon code ?', "Le code s'inscrit au moment de créer l'espace membre. Une personne inscrite depuis plus de deux jours ne peut plus s'y rattacher."],
      ['Puis-je tout offrir à mon invitée ?', "Oui. Vous pouvez lui donner votre part entière : elle paie moins, et vous ne recevez alors aucune commission."],
      ["Qu'est-ce qu'une ambassadrice premium ?", "Krystine choisit elle-même quelques personnes de son réseau, à qui elle confie une part plus grande à partager."],
    ],
    finTitre: 'Votre code vous attend',
    apercuTitre: 'Aperçu, page éteinte', apercuTexte: 'Vous seule voyez cette page tant que le programme est fermé.', apercuGeste: 'Ouvrir le programme',
    dollars: (n: number) => `${String(Math.round(n * 100) / 100).replace('.', ',')} $`,
    pct: (n: number) => `${n} %`,
  },
  EN: {
    kicker: "The ambassadors' circle",
    titre: ['Become an', 'ambassador'],
    sous: "You recommend Krystine's courses to the people around you. The person you invite gets a discount, and you receive a share of each of her purchases.",
    geste: 'Become an ambassador',
    gestesTitre: 'Four steps, in this order',
    gestes: [
      ['You receive your code', 'In your member space, a single button signs you up. Your code and your invitation link appear right away.'],
      ['You set your split', `You have ${PART_DEFAUT}% to divide between your guest's discount and your commission. It starts half and half.`],
      ['You invite', 'The person who creates her space with your link or your code is attached to you, and her discount applies by itself to each of her courses.'],
      ['You receive your share', 'Each purchase appears in your space with the commission owed to you, and Krystine pays it to you.'],
    ],
    essaiKicker: 'Try it',
    essaiTitre: 'Your split, at your fingertips',
    essaiTexte: 'Move the split to see what your guest pays and what comes back to you. In your space, the same setting is saved and applies to your next invitations.',
    rabais: "Your guest's discount", commission: 'Your commission',
    plus: 'Give my guest more', moins: 'Keep more for myself',
    exemple: (paye: string, recu: string) => `On a $100 course, your guest pays ${paye} and you receive ${recu}.`,
    exempleTout: (paye: string) => `On a $100 course, your guest pays ${paye}: you give her your whole share.`,
    questionsTitre: 'Questions that come up',
    questions: [
      ['Who can become an ambassador?', 'Anyone with a member space on the site. You sign up in that space, in one step.'],
      ['What do the discount and the commission apply to?', 'To courses bought on the site by people who arrived with your code. The commission is calculated on the amount actually paid, before taxes.'],
      ['My friend already has an account. Can she use my code?', 'The code is entered when the member space is created. Someone who signed up more than two days ago can no longer be attached to it.'],
      ['Can I give everything to my guest?', 'Yes. You may give her your whole share: she pays less, and you then receive no commission.'],
      ['What is a premium ambassador?', 'Krystine herself chooses a few people from her network, to whom she entrusts a larger share to split.'],
    ],
    finTitre: 'Your code is waiting',
    apercuTitre: 'Preview, page is off', apercuTexte: 'Only you can see this page while the program is closed.', apercuGeste: 'Open the program',
    dollars: (n: number) => `$${Math.round(n * 100) / 100}`,
    pct: (n: number) => `${n}%`,
  },
};

const AmbassadricesPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { lang } = useUI();
  const { ambassadricesOuvert, pret } = useSiteFlags();
  const [rabais, setRabais] = useState(PART_DEFAUT / 2);
  const t = lang === 'FR' ? T.FR : T.EN;

  const apercu = new URLSearchParams(window.location.search).get('apercu') === 'ambassadrice';
  if (pret && !ambassadricesOuvert && !isAdmin && !apercu) return <Navigate to="/" replace />;

  const commission = PART_DEFAUT - rabais;
  const paye = 100 - rabais;

  return (
    <div className="relative w-full overflow-x-hidden bg-[#f4efe6] text-[#1c1712] antialiased">
      <StyleV2 />

      {isAdmin && pret && !ambassadricesOuvert && (
        <div className={`relative z-40 w-full bg-[#1c1712] text-[#f4efe6] ${GOUTTIERE} py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
            <p className="flex items-center gap-3 text-[0.72rem] uppercase tracking-[0.18em]">
              <EyeSlash size={15} weight="regular" className="text-[#BA7B39]" />
              {t.apercuTitre}
              <span className="hidden normal-case tracking-normal text-[0.85rem] text-[#f4efe6]/60 md:inline">{t.apercuTexte}</span>
            </p>
            <Link to="/admin/ambassadrices" className="inline-flex items-center gap-2 border-b border-[#BA7B39] pb-1 text-[0.66rem] uppercase tracking-[0.2em] text-[#BA7B39] transition-colors duration-300 hover:text-[#d9a05b]">
              {t.apercuGeste} <ArrowUpRight size={13} weight="regular" />
            </Link>
          </div>
        </div>
      )}

      {/* Le seuil */}
      <section className={`${GOUTTIERE} pt-[clamp(7rem,16vh,10rem)] pb-[clamp(4rem,10vh,7rem)]`}>
        <div className="grid items-end gap-[clamp(2rem,6vw,6rem)] lg:grid-cols-[1.15fr_1fr]">
          <Reveal>
            <Kicker className="mb-6">{t.kicker}</Kicker>
            <h1 className="v2-serif font-light leading-[0.92] text-[clamp(3rem,8.4vw,7.6rem)]">
              {t.titre.map(l => <span key={l} className="block">{l}</span>)}
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <Filet className="mb-7" />
            <p className="v2-serif max-w-[36ch] text-[clamp(1.3rem,2.2vw,1.8rem)] font-light leading-[1.34] text-[#3a2f23]">{t.sous}</p>
            <div className="mt-9"><BoutonNoir to="/compte?ambassadrice=1">{t.geste}</BoutonNoir></div>
          </Reveal>
        </div>
      </section>

      {/* Les quatre gestes : une liste numérotée, pas des cartes */}
      <section className={`${GOUTTIERE} border-t border-[#1c1712]/12 py-[clamp(4rem,10vh,7.5rem)]`}>
        <Reveal><TitreChapitre className="max-w-[18ch]">{t.gestesTitre}</TitreChapitre></Reveal>
        <ol className="mt-[clamp(2.5rem,6vh,4.5rem)] grid gap-x-[clamp(2rem,5vw,5rem)] md:grid-cols-2">
          {t.gestes.map(([titre, texte], i) => (
            <li key={titre} className="border-t border-[#1c1712]/15 py-8">
              <Reveal delay={i * 0.06} className="grid grid-cols-[auto_1fr] gap-x-6">
                <span className="v2-serif text-[clamp(3rem,5vw,4.4rem)] font-light leading-[0.85] text-[#9c7a44] [font-variant-numeric:lining-nums]">{i + 1}</span>
                <div>
                  <h3 className="v2-serif text-[clamp(1.45rem,2.2vw,1.9rem)] font-normal leading-[1.15]">{titre}</h3>
                  <p className="mt-3 max-w-[44ch] text-[1.05rem] leading-[1.75] text-[#3a2f23]">{texte}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Le partage à essayer : la seule carte vert profond de la page */}
      <section className={`${GOUTTIERE} pb-[clamp(4rem,10vh,7.5rem)]`}>
        <Reveal>
          <CarteVerte>
            <div className="grid gap-[clamp(2rem,5vw,5rem)] p-[clamp(2rem,5vw,4.5rem)] lg:grid-cols-[1fr_1.05fr] lg:items-center">
              <div>
                <Kicker sombre className="mb-5">{t.essaiKicker}</Kicker>
                <TitreChapitre sombre className="max-w-[14ch]">{t.essaiTitre}</TitreChapitre>
                <p className="mt-6 max-w-[42ch] text-[1.05rem] leading-[1.75] text-[#EEE7DB]/80">{t.essaiTexte}</p>
              </div>
              <div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="v2-serif text-[clamp(3.4rem,7vw,5.6rem)] font-light leading-[0.9] text-[#e2b866] [font-variant-numeric:lining-nums_tabular-nums]">{t.pct(rabais)}</p>
                    <p className="mt-3 text-[0.82rem] uppercase tracking-[0.12em] text-[#EEE7DB]/75">{t.rabais}</p>
                  </div>
                  <div className="text-right">
                    <p className="v2-serif text-[clamp(3.4rem,7vw,5.6rem)] font-light leading-[0.9] [font-variant-numeric:lining-nums_tabular-nums]">{t.pct(commission)}</p>
                    <p className="mt-3 text-[0.82rem] uppercase tracking-[0.12em] text-[#EEE7DB]/75">{t.commission}</p>
                  </div>
                </div>
                <div className="mt-6 h-[5px] overflow-hidden rounded-full bg-[#EEE7DB]/20" aria-hidden>
                  <div className="h-full w-full origin-left rounded-full bg-[#e2b866] motion-reduce:transition-none" style={{ transform: `scaleX(${rabais / PART_DEFAUT})`, transition: `transform 260ms ${DOUX}` }} />
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button type="button" className={GESTE} disabled={rabais >= PART_DEFAUT} onClick={() => setRabais(r => Math.min(PART_DEFAUT, r + PAS))}>{t.plus}</button>
                  <button type="button" className={GESTE} disabled={rabais <= 0} onClick={() => setRabais(r => Math.max(0, r - PAS))}>{t.moins}</button>
                </div>
                <p className="v2-serif mt-7 min-h-[3.2em] border-t border-[#EEE7DB]/20 pt-6 text-[clamp(1.15rem,1.7vw,1.4rem)] font-light leading-[1.4]" aria-live="polite">
                  {commission ? t.exemple(t.dollars(paye), t.dollars(paye * commission / 100)) : t.exempleTout(t.dollars(paye))}
                </p>
              </div>
            </div>
          </CarteVerte>
        </Reveal>
      </section>

      {/* Les questions */}
      <section className={`${GOUTTIERE} pb-[clamp(4rem,10vh,7.5rem)]`}>
        <div className="grid gap-[clamp(2rem,6vw,6rem)] lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal><TitreChapitre className="max-w-[12ch]">{t.questionsTitre}</TitreChapitre></Reveal>
          <Reveal delay={0.08}>
            {t.questions.map(([q, r]) => (
              <details key={q} className="group border-t border-[#1c1712]/15 last:border-b">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-5 [&::-webkit-details-marker]:hidden">
                  <span className="v2-serif text-[clamp(1.2rem,1.8vw,1.5rem)] leading-[1.25]">{q}</span>
                  <span className="relative h-4 w-4 shrink-0 text-[#7d6330]" aria-hidden>
                    <span className="absolute left-0 top-1/2 h-px w-4 bg-current" />
                    <span className="absolute left-0 top-1/2 h-px w-4 rotate-90 bg-current transition-transform duration-200 group-open:rotate-0 motion-reduce:transition-none" style={{ transitionTimingFunction: DOUX }} />
                  </span>
                </summary>
                <p className="max-w-[58ch] pb-7 text-[1.05rem] leading-[1.75] text-[#3a2f23]">{r}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* La fermeture */}
      <section className={`${GOUTTIERE} border-t border-[#1c1712]/12 py-[clamp(4rem,10vh,7rem)]`}>
        <Reveal className="flex flex-wrap items-end justify-between gap-8">
          <TitreChapitre className="max-w-[14ch]">{t.finTitre}</TitreChapitre>
          <BoutonNoir to="/compte?ambassadrice=1">{t.geste}</BoutonNoir>
        </Reveal>
      </section>
    </div>
  );
};

export default AmbassadricesPage;
