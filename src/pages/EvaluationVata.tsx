import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle } from '@phosphor-icons/react';
import { StyleV2, Kicker, GOUTTIERE, TitreV2, BoutonNoir, LienSouligne, useMotionV2 } from '../components/v2/Magazine';
import { useAuth } from '../contexts/AppContext';
import {
  getMonEvaluationVata, enregistrerEvaluationVata, addNewsletterSubscriber,
  SEMAINES_EVALUATION_VATA, type EvaluationVata,
} from '../firebase/firestore';
import { etatAchat } from '../firebase/formations';
import { FORMATION_VATA } from './vata/semaines';
import { cheminCours } from '../lib/cheminCours';

// ─── L'évaluation de fin de VATA Essentiel (/evaluation/vata, 3 oct. 2026) ───
// Remplie par l'acheteuse à la fin des sept semaines. Une seule réponse par
// personne (document evaluationsVata/{uid}), qu'elle peut rouvrir et modifier.
// Krystine les lit dans Admin › Formulaires, onglet « Évaluations Vata ».
// La case « prochaine saison » pose l'étiquette suite-apres-vata sur sa fiche
// d'infolettre par la porte serveur habituelle (inscrireInfolettre).

const COURRIEL_EQUIPE = 'teamksl@inspiratanature.com';
const ETIQUETTES_SUITE = ['ea-vata-ancienne', 'demande-prochaine-saison'];

const ECHELLE: [number, string][] = [
  [1, 'Plutôt difficile'],
  [2, 'En demi-teinte'],
  [3, 'Bien'],
  [4, 'Très bien'],
  [5, 'Profondément nourrissant'],
];
const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const RECOMMANDE: [EvaluationVata['recommande'], string][] = [['oui', 'Oui'], ['peut-etre', 'Peut-être'], ['non', 'Non']];

const LIBELLE = 'block text-[0.62rem] uppercase tracking-[0.22em] text-[#7d6330]';
const QUESTION = 'mt-3 v2-serif font-light text-[clamp(1.3rem,2.2vw,1.7rem)] leading-[1.25] text-[#1c1712]';
const CHAMP =
  'w-full bg-transparent border-b border-[#1c1712]/20 px-1 py-2.5 text-[0.95rem] leading-[1.7] text-[#1c1712] placeholder:text-[#1c1712]/40 focus:outline-none focus:border-[#9c7a44] transition-colors duration-300';
const choix = (actif: boolean) =>
  `border px-4 py-3 text-left text-[0.86rem] leading-[1.35] transition-colors duration-300 ${
    actif ? 'border-[#1c1712] bg-[#1c1712] text-[#f4efe6]' : 'border-[#1c1712]/20 text-[#1c1712] hover:border-[#9c7a44]'
  }`;

const Soutien: React.FC = () => (
  <p className="text-[0.92rem] leading-[1.8] text-[#3a2f23]">
    Notre équipe est là pour vous. Une question, un doute, un petit pépin : écrivez-nous à{' '}
    <a href={`mailto:${COURRIEL_EQUIPE}`} className="border-b border-[#1c1712]/40 hover:border-[#9c7a44] hover:text-[#7d6330]">{COURRIEL_EQUIPE}</a>.
  </p>
);

const EvaluationVata: React.FC = () => {
  const racine = useRef<HTMLDivElement>(null);
  const { user, member, authReady, isAdmin } = useAuth();
  const [acces, setAcces] = useState<'attente' | 'oui' | 'non'>('attente');
  const [avant, setAvant] = useState<EvaluationVata | null>(null);
  const [etat, setEtat] = useState<'libre' | 'envoi' | 'merci' | 'erreur'>('libre');

  const [prenom, setPrenom] = useState('');
  const [vecu, setVecu] = useState(0);
  const [semaine, setSemaine] = useState('');
  const [pourquoi, setPourquoi] = useState('');
  const [changement, setChangement] = useState('');
  const [manque, setManque] = useState('');
  const [recommande, setRecommande] = useState<EvaluationVata['recommande'] | ''>('');
  const [temoignage, setTemoignage] = useState(false);
  const [forme, setForme] = useState<'prenom' | 'anonyme'>('prenom');
  const [suite, setSuite] = useState(false);

  useMotionV2(racine, authReady);

  // L'accès et la réponse déjà donnée, s'il y en a une.
  useEffect(() => {
    if (!user) { setAcces('attente'); return; }
    let fini = false;
    Promise.all([
      etatAchat(user.uid, FORMATION_VATA).catch(() => 'aucun' as const),
      getMonEvaluationVata(user.uid).catch(() => null),
    ]).then(([achat, ev]) => {
      if (fini) return;
      const possede = achat !== 'aucun' || !!(member as { accesVie?: boolean } | null)?.accesVie || isAdmin;
      setAcces(possede ? 'oui' : 'non');
      const nom = (member?.displayName || user.displayName || '').trim().split(/\s+/)[0] || '';
      if (ev) {
        setAvant(ev);
        setPrenom(ev.prenom || nom);
        setVecu(ev.vecu); setSemaine(ev.semaine); setPourquoi(ev.pourquoi || '');
        setChangement(ev.changement || ''); setManque(ev.manque || '');
        setRecommande(ev.recommande);
        setTemoignage(ev.temoignage); setForme(ev.temoignageForme || 'prenom');
        setSuite(ev.suiteSaison);
      } else {
        setPrenom(nom);
      }
    });
    return () => { fini = true; };
  }, [user, member, isAdmin]);

  const connexion = () => {
    window.dispatchEvent(new Event('krystine:connexion'));
    window.dispatchEvent(new CustomEvent('krystine:connexion-raison', { detail: 'Connectez-vous avec l’adresse de votre achat pour partager votre expérience de VATA Essentiel.' }));
  };

  const pret = vecu > 0 && !!semaine && !!recommande;

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pret || etat === 'envoi' || acces !== 'oui') return;
    setEtat('envoi');
    const email = (user.email || member?.email || '').trim().toLowerCase();
    try {
      await enregistrerEvaluationVata({
        uid: user.uid,
        email,
        prenom: prenom.trim().slice(0, 80) || undefined,
        vecu,
        semaine,
        pourquoi: pourquoi.trim().slice(0, 2000) || undefined,
        changement: changement.trim().slice(0, 4000) || undefined,
        manque: manque.trim().slice(0, 4000) || undefined,
        recommande: recommande as EvaluationVata['recommande'],
        temoignage,
        temoignageForme: temoignage ? forme : undefined,
        suiteSaison: suite,
      }, avant?.creeLe);
      // La prochaine saison : l'étiquette sur sa fiche d'infolettre, une fois.
      if (suite && !avant?.suiteSaison && email) {
        addNewsletterSubscriber({
          email, firstName: prenom.trim() || undefined, source: 'evaluation-vata', tags: ETIQUETTES_SUITE, status: 'active',
        }).catch(err => console.warn('[evaluation] étiquette suite-apres-vata', err));
      }
      setAvant(await getMonEvaluationVata(user.uid).catch(() => null));
      setEtat('merci');
      racine.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setEtat('erreur');
    }
  };

  let corps: React.ReactNode;
  if (!authReady || (user && acces === 'attente')) {
    corps = <p className="text-[0.95rem] text-[#3a2f23]/70">Un instant…</p>;
  } else if (!user) {
    corps = (
      <div className="space-y-7">
        <p className="v2-serif font-light text-[clamp(1.3rem,2.2vw,1.7rem)] leading-[1.3]">
          Connectez-vous avec l’adresse de votre achat pour répondre.
        </p>
        <BoutonNoir onClick={connexion}>Me connecter</BoutonNoir>
        <Soutien />
      </div>
    );
  } else if (acces === 'non') {
    corps = (
      <div className="space-y-7">
        <p className="v2-serif font-light text-[clamp(1.3rem,2.2vw,1.7rem)] leading-[1.3]">
          Cette page s’adresse aux participantes de VATA Essentiel.
        </p>
        <p className="max-w-[52ch] text-[0.95rem] leading-[1.8] text-[#3a2f23]">
          Si vous avez suivi les sept semaines avec une autre adresse courriel, reconnectez-vous avec celle-ci.
        </p>
        <LienSouligne to="/vata">Découvrir VATA Essentiel</LienSouligne>
        <Soutien />
      </div>
    );
  } else if (etat === 'merci') {
    corps = (
      <div role="status" className="space-y-6">
        <CheckCircle size={36} weight="light" className="text-[#7d6330]" />
        <p className="v2-serif font-light text-[clamp(1.8rem,3.4vw,2.8rem)] leading-[1.15]">Merci de tout cœur.</p>
        <p className="max-w-[56ch] text-[0.98rem] leading-[1.85] text-[#3a2f23]">
          Vos réponses nous sont bien parvenues. Nous les lirons une à une, avec toute l’attention qu’elles méritent :
          ce que vous avez vécu pendant ces sept semaines nous aide à préparer la suite, pour vous et pour celles qui viendront.
          {suite && ' Nous vous écrirons dès que la prochaine saison sera prête.'}
        </p>
        <Soutien />
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
          <BoutonNoir to={cheminCours(FORMATION_VATA)}>Retour au cours</BoutonNoir>
          <LienSouligne onClick={() => setEtat('libre')}>Modifier mes réponses</LienSouligne>
        </div>
      </div>
    );
  } else {
    corps = (
      <form onSubmit={envoyer} noValidate className="space-y-[clamp(2.6rem,6vh,3.6rem)]">
        {avant && (
          <p className="border-l-2 border-[#9c7a44] pl-4 text-[0.9rem] leading-[1.7] text-[#3a2f23]">
            Vous avez déjà répondu. Vos réponses sont reprises ci-dessous : modifiez ce que vous voulez, puis enregistrez.
          </p>
        )}

        <fieldset>
          <legend className={LIBELLE}>Question 1</legend>
          <p className={QUESTION}>Dans l’ensemble, comment avez-vous vécu ces sept semaines ?</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-5">
            {ECHELLE.map(([n, mot]) => (
              <button key={n} type="button" aria-pressed={vecu === n} onClick={() => setVecu(n)} className={choix(vecu === n)}>
                <span className="block v2-serif text-[1.35rem] font-light leading-none">{n}</span>
                <span className="mt-2 block">{mot}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={LIBELLE}>Question 2</legend>
          <p className={QUESTION}>Quelle semaine vous a le plus parlé ?</p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {SEMAINES_EVALUATION_VATA.map(([cle, titre], i) => (
              <button key={cle} type="button" aria-pressed={semaine === cle} onClick={() => setSemaine(cle)} className={choix(semaine === cle)}>
                <span className={`block whitespace-nowrap text-[0.56rem] uppercase tracking-[0.14em] ${semaine === cle ? 'text-[#f4efe6]/70' : 'text-[#7d6330]'}`}>Semaine {ROMAINS[i]}</span>
                <span className="mt-1.5 block">{titre}</span>
              </button>
            ))}
          </div>
          <label className="mt-6 block">
            <span className={`${QUESTION} block`}>Pourquoi celle-là en particulier ?</span>
            <textarea value={pourquoi} onChange={e => setPourquoi(e.target.value)} rows={3} maxLength={2000}
              placeholder="Ce qu’elle a touché chez vous, ce que vous en gardez…" className={`${CHAMP} mt-4 resize-y`} />
          </label>
        </fieldset>

        <label className="block">
          <span className={LIBELLE}>Question 3</span>
          <span className={`${QUESTION} block`}>Qu’est-ce qui a changé pour vous, concrètement ?</span>
          <textarea value={changement} onChange={e => setChangement(e.target.value)} rows={4} maxLength={4000}
            placeholder="Un geste que vous gardez, une habitude, une façon de vous sentir le matin…" className={`${CHAMP} mt-4 resize-y`} />
        </label>

        <label className="block">
          <span className={LIBELLE}>Question 4</span>
          <span className={`${QUESTION} block`}>Qu’est-ce qui vous a manqué, ou que nous pourrions améliorer ?</span>
          <textarea value={manque} onChange={e => setManque(e.target.value)} rows={4} maxLength={4000}
            placeholder="Tout nous est utile, même un détail." className={`${CHAMP} mt-4 resize-y`} />
        </label>

        <fieldset>
          <legend className={LIBELLE}>Question 5</legend>
          <p className={QUESTION}>Recommanderiez-vous VATA Essentiel à une amie ?</p>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-[480px]">
            {RECOMMANDE.map(([v, mot]) => (
              <button key={v} type="button" aria-pressed={recommande === v} onClick={() => setRecommande(v)} className={`${choix(recommande === v)} text-center`}>
                {mot}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-6 border-t border-[#9c7a44]/35 pt-[clamp(2rem,5vh,2.8rem)]">
          <label className="block sm:max-w-[360px]">
            <span className={LIBELLE}>Votre prénom</span>
            <input value={prenom} onChange={e => setPrenom(e.target.value)} maxLength={80} autoComplete="given-name" className={`${CHAMP} mt-2`} />
          </label>

          <div>
            <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-[1.6] text-[#1c1712]">
              <input type="checkbox" checked={temoignage} onChange={e => setTemoignage(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#1c1712]" />
              <span>J’accepte que vous partagiez mon témoignage.</span>
            </label>
            {temoignage && (
              <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 pl-7" role="radiogroup" aria-label="Forme du témoignage">
                {([['prenom', 'Avec mon prénom seulement'], ['anonyme', 'De façon anonyme']] as const).map(([v, mot]) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2.5 text-[0.9rem] text-[#3a2f23]">
                    <input type="radio" name="forme" checked={forme === v} onChange={() => setForme(v)} className="h-4 w-4 accent-[#1c1712]" />
                    {mot}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] leading-[1.6] text-[#1c1712]">
            <input type="checkbox" checked={suite} onChange={e => setSuite(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#1c1712]" />
            <span>J’aimerais être avisée de la prochaine saison.</span>
          </label>
        </div>

        {etat === 'erreur' && (
          <p role="alert" className="text-[0.92rem] text-[#8B4A2F]">
            L’envoi n’a pas fonctionné. Réessayez dans un instant, ou écrivez-nous à{' '}
            <a href={`mailto:${COURRIEL_EQUIPE}`} className="underline">{COURRIEL_EQUIPE}</a>.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <button type="submit" disabled={!pret || etat === 'envoi'}
            className="group inline-flex min-h-[46px] items-center justify-center gap-2.5 bg-[#1c1712] px-7 py-3.5 text-[0.68rem] uppercase tracking-[0.18em] text-[#f4efe6] transition-colors duration-300 hover:bg-[#9c7a44] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1c1712]">
            {etat === 'envoi' ? 'Envoi…' : avant ? 'Enregistrer mes réponses' : 'Envoyer mes réponses'}
            <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          {!pret && <span className="text-[0.8rem] text-[#3a2f23]/65">Les questions 1, 2 et 5 suffisent pour envoyer.</span>}
        </div>
      </form>
    );
  }

  return (
    <div ref={racine} className="min-h-screen bg-[#f4efe6] text-[#1c1712]">
      <StyleV2 />
      <section data-hero className={`${GOUTTIERE} pt-[clamp(6.5rem,14vh,9rem)] pb-[clamp(5rem,12vh,8rem)]`}>
        <Kicker className="mb-6">VATA Essentiel · Clore la saison</Kicker>
        <TitreV2 lignes={['Partager', 'votre expérience']} className="text-[clamp(2.7rem,7.2vw,6.6rem)] max-w-[18ch]" />

        <div className="mt-[clamp(2.5rem,7vh,4.5rem)] grid gap-[clamp(2.5rem,6vw,6rem)] lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.5fr)]">
          <div data-fade>
            <div className="h-px w-16 bg-[#9c7a44]" aria-hidden />
            <p className="mt-7 max-w-[42ch] text-[0.98rem] leading-[1.85] text-[#3a2f23]">
              Vous arrivez au bout des sept semaines. Quelques minutes suffisent pour nous dire ce que vous en gardez,
              ce qui vous a touchée et ce que nous pourrions faire mieux.
            </p>
            <p className="mt-5 max-w-[42ch] text-[0.86rem] leading-[1.8] text-[#3a2f23]/75">
              Vos réponses restent entre nous. Rien n’est partagé sans votre accord, et vous pouvez les modifier en tout temps.
            </p>
            {user && acces === 'oui' && etat !== 'merci' && (
              <Link to={cheminCours(FORMATION_VATA)} className="mt-8 inline-block border-b border-[#1c1712]/30 pb-1 text-[0.64rem] uppercase tracking-[0.2em] text-[#1c1712]/70 hover:border-[#9c7a44] hover:text-[#7d6330]">
                Retour au cours
              </Link>
            )}
          </div>
          <div data-fade className="border-t border-[#9c7a44]/40 pt-10">{corps}</div>
        </div>
      </section>
    </div>
  );
};

export default EvaluationVata;
