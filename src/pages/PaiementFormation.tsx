import React, { useEffect, useRef, useState } from 'react';
import { couperTitre } from '../lib/titreFormation';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AppContext';
import { loadStripe, type Stripe } from '@stripe/stripe-js/pure';
import { acheterFormation, etatAchat, getFormation, preparerPaiementIntegre, type Formation } from '../firebase/formations';
import { getMember } from '../firebase/firestore';
import { idDeCours, cheminCours } from '../lib/cheminCours';
import { prixEnVigueur, versementsPermis, montantVersement } from '../lib/versements';
import { monRabaisAmbassadrice } from '../firebase/ambassadrices';
import { StyleV2, Kicker, Masthead, Filet, GOUTTIERE } from '../components/v2/Magazine';
import { trackObjectif } from '../lib/track';

/**
 * La page de choix du paiement d'une formation (Krystine, 30 septembre 2026) :
 * un seul paiement, ou des versements mensuels selon la règle de
 * src/lib/versements.ts. Commune à toutes les formations payantes :
 * /paiement/vata, /paiement/foyer, /paiement/origine2… Langage magazine crème
 * (MediasV2, components/v2/Magazine.tsx). Le serveur (creerSessionPaiement)
 * revérifie le prix et le nombre de versements : cette page n'est qu'un choix.
 */

const NOTE_ENGAGEMENT =
  "Les versements suivants sont prélevés automatiquement chaque mois, à la date anniversaire de votre achat. Le paiement complet des versements est exigé pour préserver l'accès au programme : il ne s'agit pas d'un abonnement. En choisissant le paiement en versements, vous vous engagez à régler chaque versement à son échéance; à défaut de paiement, l'accès à la formation et aux privilèges qui s'y rattachent est suspendu jusqu'au règlement du solde.";

// La description courte : le premier paragraphe de la fiche, coupé proprement.
const descriptionCourte = (d: string): string => {
  const premier = (d || '').split(/\n\s*\n/)[0].trim();
  if (premier.length <= 320) return premier;
  const coupe = premier.slice(0, 320);
  return `${coupe.slice(0, coupe.lastIndexOf(' '))}…`;
};

// La clé PUBLIQUE de Stripe (Développeurs › Clés API › Clé publiable). Sans
// elle, la page retombe sur l'ancienne redirection vers la caisse Stripe.
// La clé PUBLIABLE de Stripe (pk_live, publique par nature : elle affiche le
// formulaire, elle ne donne accès à rien). Écrite ici pour que les deux
// ordinateurs publient la même chose (Krystine, 2 oct. 2026).
const CLE_STRIPE = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)
  || 'pk_live_51KhEXLGtDCKaYZ2HSuoYvu8qVIgzOZOIubKgn6YBoUPZsrFFn0OEwQOhBZp2lXS2tr9RccxcdMjfJyaUA0rgyysD00oZcNiUz5';
let stripeCharge: Promise<Stripe | null> | null = null;
const chargerStripe = () => (stripeCharge ??= loadStripe(CLE_STRIPE));

/** Le formulaire Stripe intégré (Embedded Checkout), monté dans la page. */
const CaisseIntegree: React.FC<{ clientSecret: string; onErreur: () => void }> = ({ clientSecret, onErreur }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pret, setPret] = useState(false);
  useEffect(() => {
    let annule = false;
    let caisse: { mount: (el: HTMLElement) => void; destroy: () => void } | null = null;
    chargerStripe()
      .then(s => {
        if (!s) throw new Error('stripe');
        return s.createEmbeddedCheckoutPage({ clientSecret });
      })
      .then(c => {
        if (annule) { c.destroy(); return; }
        caisse = c;
        if (ref.current) c.mount(ref.current);
        setPret(true);
      })
      .catch(() => { if (!annule) onErreur(); });
    return () => { annule = true; caisse?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);
  return (
    <div className="relative mt-8 min-h-[32rem] border border-[#9c7a44]/30 bg-white">
      {!pret && (
        <p className="absolute inset-x-0 top-16 text-center text-[0.68rem] uppercase tracking-[0.2em] text-[#1c1712]/50">
          Le formulaire sécurisé s'ouvre…
        </p>
      )}
      <div ref={ref} />
    </div>
  );
};

const Chargement: React.FC = () => (
  <div className="min-h-screen bg-[#f4efe6] pt-40 text-center text-sm text-[#1c1712]/50">…</div>
);

const PaiementFormation: React.FC = () => {
  const { id: idAdresse = '' } = useParams();
  const id = idDeCours(idAdresse);
  const { user, authReady } = useAuth();
  // Le rabais d'une membre arrivée par le code d'une ambassadrice : le
  // serveur l'applique de toute façon, la page montre seulement le bon prix.
  const [rabaisAmb, setRabaisAmb] = useState(0);
  useEffect(() => {
    if (!user) { setRabaisAmb(0); return; }
    monRabaisAmbassadrice().then(r => setRabaisAmb(r.rabaisPct || 0)).catch(() => {});
  }, [user]);
  const [formation, setFormation] = useState<Formation | null | undefined>(undefined);
  const [etat, setEtat] = useState<'aucun' | 'actif' | 'suspendu' | null>(null);
  const [choix, setChoix] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const haut = useRef<HTMLElement>(null);
  // Le clic fait avant la connexion : le paiement reprend tout seul au retour.
  const enAttente = useRef(false);
  // Retour de Stripe après un paiement fait sans compte (?achat=ok) : le
  // compte se crée avec l'adresse du paiement, la page dit la suite.
  const [merciSansCompte] = useState(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('achat') !== 'ok') return false;
      trackObjectif(`Achat confirmé · ${id}`.slice(0, 40), 'gros');
      window.history.replaceState(null, '', window.location.pathname);
      return true;
    } catch { return false; }
  });

  useEffect(() => {
    getFormation(id).then(setFormation).catch(() => setFormation(null));
  }, [id]);

  useEffect(() => {
    if (!user) { setEtat('aucun'); return; }
    setEtat(null);
    Promise.all([etatAchat(user.uid, id), getMember(user.uid).catch(() => null)])
      .then(([e, m]) => setEtat(e === 'aucun' && m?.accesVie ? 'actif' : e))
      .catch(() => setEtat('aucun'));
  }, [user, id]);

  const lancer = async (n: number) => {
    setBusy(true); setErreur(null);
    try {
      if (!CLE_STRIPE) { window.location.href = await acheterFormation(id, n); return; }
      setClientSecret(await preparerPaiementIntegre(id, n));
      setBusy(false);
      haut.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setErreur("Le paiement n'a pas pu démarrer. Réessayez.");
      setBusy(false);
    }
  };

  // Payer sans compte (Krystine, 2 oct. 2026) : la caisse s'ouvre tout de
  // suite; le compte se crée après l'achat avec l'adresse du paiement.
  const continuer = () => {
    if (busy) return;
    void lancer(choix);
  };
  // Qui a déjà un compte peut s'y connecter d'abord : le paiement reprend au retour.
  const seConnecter = () => {
    if (busy) return;
    enAttente.current = true;
    window.dispatchEvent(new CustomEvent('krystine:connexion-raison', {
      detail: 'Pour retrouver votre parcours après le paiement, créez votre compte ou connectez-vous.',
    }));
  };

  useEffect(() => {
    if (user && enAttente.current && etat === 'aucun') {
      enAttente.current = false;
      void lancer(choix);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, etat]);

  if (formation === undefined || !authReady || (user && etat === null)) return <Chargement />;

  // Qui possède déjà la formation (ou l'accès à vie) va droit à ses leçons.
  if (idAdresse === 'rituels-vivants') return <Navigate to={`/paiement/rituels-essentiels${window.location.search}`} replace />;
  if (etat === 'actif') return <Navigate to={cheminCours(id)} replace />;
  // Une formation sans paywall s'ouvre sans passer par la caisse.
  if (formation && formation.statut === 'publie' && !formation.paywall && !formation.listeAttente) {
    return <Navigate to={cheminCours(id)} replace />;
  }

  const enVente = !!formation && formation.statut === 'publie' && !!formation.paywall
    && !!formation.prix && formation.prix > 0 && !formation.listeAttente;
  const prixPlein = enVente ? prixEnVigueur(id, formation!.prix!) : 0;
  const options = enVente ? versementsPermis(prixPlein) : [1];
  const prix = rabaisAmb ? Math.round(prixPlein * (100 - rabaisAmb)) / 100 : prixPlein;
  const n = options.includes(choix) ? choix : 1;
  // Le nom et sa collection : « L'Expérience Ayurveda · VATA Essentiel » (src/lib/titreFormation.ts).
  const [nom, collection] = couperTitre(formation?.titre || '');
  const changerDeChoix = () => { setClientSecret(null); setErreur(null); };

  return (
    <div className="min-h-screen bg-[#f4efe6] text-[#1c1712]">
      <StyleV2 />
      <section ref={haut} className={`${GOUTTIERE} scroll-mt-20 pt-[clamp(7rem,13vh,9.5rem)] pb-[clamp(4rem,10vh,7rem)]`}>
        <Masthead gauche={<>N&deg; 02 &middot; Votre inscription</>} />

        {merciSansCompte && !user ? (
          <div className="mx-auto mt-[clamp(3rem,8vh,5rem)] max-w-[44rem] text-center">
            <Kicker>Paiement reçu</Kicker>
            <h1 className="v2-serif mt-5 text-[clamp(2rem,4vw,3rem)] font-light leading-[1.05]">
              Merci, votre accès s'ouvre.
            </h1>
            <p className="mx-auto mt-6 max-w-[52ch] text-[0.95rem] leading-[1.85] text-[#3a2f23]">
              Vérifiez votre boîte courriel : la confirmation de votre achat est envoyée à l'adresse du paiement, avec le lien pour choisir votre mot de passe et entrer dans votre espace.
            </p>
          </div>
        ) : !enVente || !formation ? (
          <div className="mx-auto mt-[clamp(3rem,8vh,5rem)] max-w-[40rem] text-center">
            <Kicker>Paiement</Kicker>
            <h1 className="v2-serif mt-5 text-[clamp(2rem,4vw,3rem)] font-light leading-[1.05]">
              Cette formation n'est pas offerte à l'achat pour le moment.
            </h1>
            <Link
              to={formation?.lienFiche || '/formations'}
              className="group mt-9 inline-flex items-center gap-2.5 border-b border-[#1c1712] pb-1.5 text-[0.72rem] uppercase tracking-[0.2em] transition-colors duration-300 hover:border-[#9c7a44] hover:text-[#7d6330]"
            >
              Voir les formations <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div className="mt-[clamp(2.5rem,6vh,4rem)] grid gap-[clamp(2.5rem,5vw,5rem)] lg:grid-cols-12">
            {/* ── À gauche : la formation ── */}
            <div className={`min-w-0 lg:col-span-6 ${clientSecret ? 'hidden lg:block' : ''}`}>
              {formation.imageUrl && (
                <div className="relative">
                  <span className="pointer-events-none absolute -inset-2 border border-[#9c7a44]/35" aria-hidden />
                  {/* Le ratio natif de l'image, jamais un recadrage qui couperait son titre. */}
                  <div className="relative w-full overflow-hidden">
                    <img src={formation.imageUrl} alt="" className="block h-auto w-full" />
                    <span className="absolute left-0 top-0 bg-[#1c1712] px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.24em] text-[#f4efe6]">
                      La formation
                    </span>
                  </div>
                </div>
              )}
              {/* La collection en surtitre et le nom seul en titre : deux lignes au plus. */}
              {collection && <div className="mt-10"><Kicker>{collection}</Kicker></div>}
              <h1 className={`v2-serif ${collection ? 'mt-4' : 'mt-10'} max-w-[22ch] text-[clamp(2rem,3.6vw,3.2rem)] font-light leading-[1.04]`}>
                {nom}
              </h1>
              {formation.description && (
                <p className="mt-5 max-w-[52ch] text-[0.95rem] leading-[1.85] text-[#3a2f23]">
                  {descriptionCourte(formation.description)}
                </p>
              )}
              <div className="mt-8 flex items-start gap-4">
                <Filet className="mt-[0.7rem] shrink-0" />
                <p className="max-w-[46ch] text-[0.9rem] leading-[1.7] text-[#1c1712]">
                  <span className="text-[#7d6330]">Garantie cœur léger :</span> 15 jours pour changer d'avis, remboursement complet.
                </p>
              </div>
            </div>

            {/* ── À droite : la façon de payer ── */}
            <div className="min-w-0 lg:col-span-6 lg:pt-2">
              <Kicker>Paiement sécurisé</Kicker>
              <h2 className="v2-serif mt-5 text-[clamp(1.9rem,3.2vw,2.7rem)] font-light leading-[1.05]">
                {clientSecret ? 'Votre paiement' : 'Choisissez votre façon de payer'}
              </h2>

              {clientSecret ? (
                <>
                  <div className="mt-8 border border-[#9c7a44]/30 bg-[#faf6ee] px-6 py-6">
                    <p className="v2-serif text-[1.45rem] font-light leading-snug">{nom}</p>
                    {collection && (
                      <p className="mt-1 text-[0.66rem] uppercase tracking-[0.18em] text-[#7d6330]">{collection}</p>
                    )}
                    <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-[#9c7a44]/25 pt-4">
                      <span className="text-[0.95rem]">
                        {n === 1 ? <>1 paiement &middot; {prix} $</> : <>{n} versements de {montantVersement(prix, n)} $ par mois</>}
                      </span>
                      <span className="text-[0.68rem] uppercase tracking-[0.18em] text-[#1c1712]/55">Taxes en sus</span>
                    </div>
                    {n > 1 && <p className="mt-4 text-[0.8rem] leading-[1.7] text-[#3a2f23]">{NOTE_ENGAGEMENT}</p>}
                    <button
                      type="button"
                      onClick={changerDeChoix}
                      className="mt-5 inline-flex min-h-[44px] items-center border-b border-[#1c1712] text-[0.68rem] uppercase tracking-[0.18em] transition-colors duration-300 hover:border-[#9c7a44] hover:text-[#7d6330]"
                    >
                      Changer de choix
                    </button>
                  </div>
                  <CaisseIntegree
                    clientSecret={clientSecret}
                    onErreur={() => { setClientSecret(null); setErreur("Le formulaire de paiement n'a pas pu s'afficher. Réessayez."); }}
                  />
                </>
              ) : etat === 'suspendu' ? (
                <p role="alert" className="mt-8 border border-[#9c7a44]/40 bg-[#faf6ee] px-6 py-5 text-[0.92rem] leading-[1.75]">
                  Votre accès est suspendu : un versement n'a pas pu être prélevé. Il se rouvrira dès le paiement. Écrivez-nous à{' '}
                  <a href="mailto:teamksl@inspiratanature.com" className="border-b border-[#1c1712]">teamksl@inspiratanature.com</a>.
                </p>
              ) : (
                <>
                  <div role="radiogroup" aria-label="Façon de payer" className="mt-8 space-y-3">
                    {options.map(o => {
                      const actif = o === n;
                      const montant = montantVersement(prix, o);
                      return (
                        <label
                          key={o}
                          className={`flex cursor-pointer items-start gap-4 border bg-[#faf6ee] px-5 py-5 transition-colors duration-300 ${
                            actif ? 'border-[#1c1712] shadow-[inset_0_0_0_1px_#1c1712]' : 'border-[#9c7a44]/30 hover:border-[#9c7a44]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="versements"
                            value={o}
                            checked={actif}
                            onChange={() => setChoix(o)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${actif ? 'border-[#1c1712]' : 'border-[#1c1712]/35'}`}
                          >
                            {actif && <span className="h-[9px] w-[9px] rounded-full bg-[#1c1712]" />}
                          </span>
                          <span className="flex-1">
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <span className="v2-serif text-[1.3rem] font-light leading-snug">
                                {o === 1 ? <>1 paiement &middot; {prix} $</> : <>{o} versements de {montant} $ par mois</>}
                              </span>
                              {o === 1 && options.length > 1 && (
                                <span className="bg-[#1c1712] px-2.5 py-1 text-[0.56rem] uppercase tracking-[0.22em] text-[#f4efe6]">
                                  Meilleur prix
                                </span>
                              )}
                            </span>
                            {o > 1 && (
                              <span className="mt-1 block text-[0.68rem] uppercase tracking-[0.16em] text-[#7d6330]">
                                Avec léger supplément
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {n > 1 && (
                    <p className="mt-6 text-[0.82rem] leading-[1.7] text-[#3a2f23]">{NOTE_ENGAGEMENT}</p>
                  )}
                  <p className="mt-4 text-[0.68rem] uppercase tracking-[0.18em] text-[#1c1712]/55">Taxes en sus</p>

                  <button
                    type="button"
                    onClick={continuer}
                    disabled={busy}
                    className="group mt-8 inline-flex min-h-[46px] w-full items-center justify-center gap-2.5 bg-[#1c1712] px-5 py-4 text-center text-[0.62rem] uppercase tracking-[0.1em] text-[#f4efe6] sm:px-7 sm:text-[0.68rem] sm:tracking-[0.18em] transition-colors duration-300 hover:bg-[#9c7a44] disabled:opacity-60 sm:w-auto"
                  >
                    {busy ? (CLE_STRIPE ? 'Préparation…' : 'Redirection…') : 'Continuer vers le paiement sécurisé'}
                    <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                  {!user && (
                    <p className="mt-4 max-w-[46ch] text-[0.85rem] leading-[1.7] text-[#3a2f23]">
                      Aucun compte à créer d'abord : votre espace s'ouvre avec l'adresse courriel du paiement.{' '}
                      <button
                        type="button"
                        onClick={seConnecter}
                        className="inline-flex min-h-[44px] items-center text-[#1c1712] underline decoration-[#1c1712]/40 underline-offset-4 transition-colors duration-300 hover:text-[#7d6330] hover:decoration-[#9c7a44]"
                      >
                        Déjà un compte ? Me connecter
                      </button>
                    </p>
                  )}
                  {erreur && <p role="alert" className="mt-4 text-[0.85rem] text-[#8B4A2F]">{erreur}</p>}
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default PaiementFormation;
