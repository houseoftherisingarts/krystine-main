import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import {
  StyleV2, Kicker, TitreV2, SousTitreV2, CarteVerte, QuatriemeCouverture, Reveal, BoutonNoir, GOUTTIERE, useMotionV2,
} from '../components/v2/Magazine';
import NewsletterSignup from '../components/NewsletterSignup';
import { NOUVEAU_LIVRE_FAQ } from '../content/nouveauLivre';

/*
 * /nouveau-livre (17 oct. 2026) : Google suggère « krystine st laurent nouveau livre »,
 * et aucune page ne répondait d'abord à cette recherche. Langage magazine crème V2.
 * Seul ce qui est déjà public : le tome 3 de la Trilogie d'Origine, Éditions de l'Homme,
 * février 2027, titre à révéler. Rien du manuscrit, rien d'Ella; pas d'image de couverture
 * tant que le titre n'est pas révélé (Krystine, 7 sept. 2026).
 */
const COUV = 'https://storage.googleapis.com/inspirata/Livres/';
const TOMES = [
  { no: 'Tome 1', titre: 'Nature & Ayurveda', annee: '2018', couv: `${COUV}nature%20ayurveda%20front.jpg` },
  { no: 'Tome 2', titre: 'Féminité & Ayurveda', annee: '2022', couv: `${COUV}feminite%20ayurveda%20front.jpg` },
];

const NouveauLivre: React.FC = () => {
  const root = useRef<HTMLDivElement>(null);
  useMotionV2(root);

  return (
    <div ref={root} className="v2 min-h-screen bg-[#f4efe6] text-[#1c1712]">
      <StyleV2 />

      <section className={`w-full ${GOUTTIERE} pt-[clamp(7rem,16vh,10rem)] pb-[clamp(4rem,10vh,7rem)]`}>
        <div className="mx-auto max-w-[1180px] grid gap-[clamp(2.5rem,6vw,5rem)] lg:grid-cols-[1.15fr_0.85fr] items-end">
          <div>
            <Kicker className="mb-6">La Trilogie d’Origine · Tome 3</Kicker>
            <TitreV2 lignes={['Le nouveau livre', 'de Krystine St\u2011Laurent']} className="text-[clamp(2.1rem,4vw,3.7rem)] max-w-none" />
            <SousTitreV2>Douze ans d’écriture, 1200 pages, et un dernier livre qui referme la trilogie.</SousTitreV2>
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-5 max-w-[34rem] border-t border-[#9c7a44]/40 pt-6">
              {[['Parution', 'Février 2027'], ['Éditeur', 'Les Éditions de l’Homme'], ['Dans la trilogie', 'Le troisième tome'], ['Titre', 'À révéler']].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[0.62rem] uppercase tracking-[0.24em] text-[#7d6330]">{k}</dt>
                  <dd className="mt-1.5 v2-serif text-[1.25rem] font-light">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <CarteVerte className="p-[clamp(1.75rem,4vw,2.75rem)]">
            <Kicker sombre className="mb-4">Être prévenue de la sortie</Kicker>
            <ul className="space-y-2.5 text-[0.95rem] leading-relaxed text-[#EEE7DB]/90">
              <li>La date de parution en primeur</li>
              <li>Un extrait du livre avant sa sortie</li>
              <li>L’invitation au lancement</li>
            </ul>
            <NewsletterSignup
              source="nouveau-livre"
              tags={['tome3-sortie', 'nouveau-livre']}
              variant="dark"
              emailOnly
              accountUpsell={false}
              ctaLabel="Être prévenue"
              className="mt-7"
              success={{ title: 'C’est noté.', body: 'Vous serez prévenue avant tout le monde.' }}
            />
          </CarteVerte>
        </div>
      </section>

      <section className={`w-full ${GOUTTIERE} py-[clamp(4rem,10vh,7rem)] bg-[#efe6d7]`}>
        <div className="mx-auto max-w-[1180px]">
          <Kicker className="mb-5">Avant le tome 3</Kicker>
          <h2 className="v2-serif font-light text-[clamp(1.9rem,3.4vw,2.7rem)] leading-[1.08]">Les deux premiers tomes, deux best-sellers</h2>
          <div className="mt-10 grid grid-cols-2 gap-5 sm:gap-8 sm:grid-cols-3">
            {TOMES.map((t) => (
              <Reveal key={t.titre}>
                <figure className="border border-[#9c7a44] p-2.5 bg-[#f4efe6]">
                  <div className="relative">
                    <img src={t.couv} alt={`${t.titre}, Krystine St-Laurent, Éditions de l’Homme, ${t.annee}`} loading="lazy" className="block w-full aspect-[3/4] object-cover" />
                    <span className="absolute left-2.5 top-2.5 bg-[#1c1712] px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.18em] text-[#f4efe6]">{t.no}</span>
                  </div>
                  <figcaption className="pt-4 pb-1.5 px-1">
                    <p className="v2-serif text-[1.35rem] font-light">{t.titre}</p>
                    <p className="mt-1 text-[0.85rem] text-[#3a2f23]/80">Les Éditions de l’Homme, {t.annee}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
            <Reveal>
              <figure className="border border-[#9c7a44] p-2.5 bg-[#f4efe6] h-full flex flex-col">
                <div className="relative flex-1 min-h-[16rem] aspect-[3/4] grid place-items-center bg-[#1c1712] text-center px-6">
                  <span className="absolute left-2.5 top-2.5 bg-[#f4efe6] px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.18em] text-[#1c1712]">Tome 3</span>
                  <p className="v2-serif font-light text-[1.6rem] text-[#f4efe6] leading-tight">Titre à révéler</p>
                </div>
                <figcaption className="pt-4 pb-1.5 px-1">
                  <p className="v2-serif text-[1.35rem] font-light">Février 2027</p>
                  <p className="mt-1 text-[0.85rem] text-[#3a2f23]/80">Les Éditions de l’Homme</p>
                </figcaption>
              </figure>
            </Reveal>
          </div>
          <div className="mt-10">
            <BoutonNoir to="/medias">Les livres et les médias <ArrowRight size={14} /></BoutonNoir>
          </div>
        </div>
      </section>

      <section id="questions" className={`w-full ${GOUTTIERE} py-[clamp(4rem,10vh,7rem)]`}>
        <div className="mx-auto max-w-[860px]">
          <Kicker className="mb-5">Questions fréquentes</Kicker>
          <h2 className="v2-serif font-light text-[clamp(1.9rem,3.4vw,2.7rem)] leading-[1.08]">Le nouveau livre, en bref</h2>
          <div className="mt-8 border-t border-[#9c7a44]/40">
            {NOUVEAU_LIVRE_FAQ.map(([q, r]) => (
              <details key={q} className="group border-b border-[#9c7a44]/40 py-5">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 v2-serif text-[1.25rem] font-light">
                  {q}<span className="mt-1 text-[#7d6330] transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[0.95rem] leading-[1.85] text-[#3a2f23]">{r}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-[0.9rem]">
            <Link to="/quiz" className="underline underline-offset-4 decoration-[#1c1712]/30 hover:text-[#7d6330]">En attendant le livre, faites le quiz : de quoi ai-je besoin en ce moment ?</Link>
          </p>
        </div>
      </section>

      <QuatriemeCouverture
        citation={<>« Le corps porte le même langage que la nature, il ne demande qu’à être écouté. »<span className="mt-5 block text-[0.7rem] uppercase tracking-[0.24em] text-[#f4efe6]/70">Krystine St-Laurent</span></>}
        note="La Trilogie d’Origine · Les Éditions de l’Homme"
      />
    </div>
  );
};

export default NouveauLivre;
