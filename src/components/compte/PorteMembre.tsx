import React from 'react';
import { useApp } from '../../contexts/AppContext';
import BoutonCompte from '../BoutonCompte';

// La porte de /compte pour qui n'est pas connecté : le même module que sur la
// page d'accueil (« Votre compte est votre clé »), roue aquarelle qui tourne
// lentement à gauche, la copie et le bouton or à droite. Les textes viennent
// mot pour mot de public/accueil/index.html et de public/i18n/en.json.
const PorteMembre: React.FC = () => {
  const { lang } = useApp();
  const fr = lang === 'FR';

  return (
    <section
      className="relative isolate flex min-h-screen items-center overflow-hidden bg-[#EEE7DB] px-6 pb-20 pt-28 dark:bg-[#151d19]"
      aria-labelledby="porte-membre-titre"
    >
      <style>{`
        /* La photo est agrandie de 20 % pour que le bord du papier sorte du
           cercle; la roue tourne lentement, comme sur l'accueil. */
        .pm-roue{-webkit-mask-image:radial-gradient(circle at 50% 50%,#000 60%,transparent 70.5%);
          mask-image:radial-gradient(circle at 50% 50%,#000 60%,transparent 70.5%)}
        .pm-roue img{mix-blend-mode:multiply;transform:scale(1.2);animation:pm-tour 120s linear infinite}
        @keyframes pm-tour{from{transform:scale(1.2) rotate(0deg)}to{transform:scale(1.2) rotate(360deg)}}
        @media(prefers-reduced-motion:reduce){.pm-roue img{animation:none}}
      `}</style>

      <div className="mx-auto grid w-full max-w-[1280px] items-center gap-6 md:grid-cols-[minmax(280px,0.9fr)_1.1fr] md:gap-[clamp(2rem,5vw,5rem)]">
        <div
          className="pm-roue relative aspect-square w-full max-w-[250px] justify-self-center overflow-hidden rounded-full md:max-w-[520px]"
          aria-hidden="true"
        >
          <img
            src="/accueil/assets/wheel-watercolor.webp"
            alt=""
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="text-center md:text-left">
          <span className="font-serif text-[0.78rem] uppercase tracking-[0.24em] text-[#a3823f] dark:text-[#dcb874]">
            {fr ? 'Espace membre' : 'Member space'}
          </span>
          <h1
            id="porte-membre-titre"
            className="mt-2 max-w-[18ch] font-serif text-[clamp(2rem,3.6vw,2.9rem)] font-medium uppercase leading-[1.04] tracking-[0.01em] text-[#3a3126] dark:text-white max-md:mx-auto"
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            {fr ? 'Votre compte est votre clé' : 'Your account is your key'}
          </h1>
          <div className="mt-[1.1rem] h-px w-[60px] bg-[#bb9a5e] max-md:mx-auto" aria-hidden="true" />
          <p className="mx-auto mt-[1.2rem] max-w-[52ch] text-[0.92rem] leading-[1.85] text-[#665746] dark:text-white/65 md:mx-0">
            {fr
              ? 'Un seul endroit où revenir pour retrouver ce qui existe déjà et savoir ce qui s\'en vient.'
              : 'One single place to come back to, where you can find what is already there and know what is coming next.'}
          </p>
          <p className="mx-auto mt-[1.2rem] max-w-[52ch] text-[0.92rem] leading-[1.85] text-[#665746] dark:text-white/65 md:mx-0">
            {fr
              ? 'Créer votre compte prend une minute, avec votre courriel ou votre compte Google. Il vous ouvre les rediffusions et vos archives, votre profil et le quiz des doshas, les niṣkas de bienvenue, puis les prochains espaces à mesure qu\'ils s\'ouvriront.'
              : 'Creating your account takes about a minute, with your email or your Google account. It opens the replays and your archives, your profile and the dosha quiz, the welcome niṣkas, and then each new space as it opens.'}
          </p>
          <div className="mt-[1.8rem]">
            <BoutonCompte
              taille="lg"
              icone={false}
              libelle={fr ? 'Créer mon espace membre' : 'Create my member space'}
            />
          </div>
          <p className="mt-4 text-[0.78rem] text-[#665746] dark:text-white/55">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('krystine:connexion'))}
              className="border-b border-[#bb9a5e]/60 pb-0.5 text-[#a3823f] transition-colors hover:border-[#3a3126] hover:text-[#3a3126] dark:text-[#dcb874] dark:hover:border-white dark:hover:text-white"
            >
              {fr ? 'J\'ai déjà un compte : me connecter' : 'I already have an account: sign in'}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PorteMembre;
