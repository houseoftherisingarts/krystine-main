import React, { useEffect, useMemo, useState } from 'react';
import MurSocial from '../components/communaute/MurSocial';
import { useParams, Link } from 'react-router-dom';
import {
  getFormation, getLecons, getProgression, marquerLecon, aAchete,
  acheterFormation, urlDeLecon,
  type Formation, type Lecon,
} from '../firebase/formations';
import { useAuth, useUI } from '../contexts/AppContext';
import { getMember } from '../firebase/firestore';

// La fiche d'un cours et son lecteur, sur le patron de l'Académie Zéro
// Limite : liste des leçons et progression à gauche, contenu à droite,
// bouton Suivant, marquer comme terminée. L'accès au fichier passe par le
// serveur (URL signée après vérification de l'achat).

const ICONES: Record<Lecon['type'], string> = {
  video: 'fa-circle-play', audio: 'fa-music', pdf: 'fa-file-pdf', fichier: 'fa-file',
};

const CoursDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const { user, isAdmin, setSignInOpen } = useAuth();
  const { lang } = useUI();
  const [formation, setFormation] = useState<Formation | null>(null);
  const [lecons, setLecons] = useState<Lecon[]>([]);
  const [achete, setAchete] = useState(false);
  const [accesVie, setAccesVie] = useState(false);
  const [terminees, setTerminees] = useState<Record<string, boolean>>({});
  const [courante, setCourante] = useState<Lecon | null>(null);
  const [urlCourante, setUrlCourante] = useState('');
  const [chargeLecon, setChargeLecon] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paiement, setPaiement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getFormation(id), getLecons(id)])
      .then(([f, ls]) => { setFormation(f); setLecons(ls); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !id) { setAchete(false); setAccesVie(false); return; }
    aAchete(user.uid, id).then(setAchete).catch(() => {});
    getMember(user.uid).then(m => setAccesVie(!!m?.accesVie)).catch(() => {});
    getProgression(user.uid, id).then(p => {
      setTerminees(p.terminees || {});
    }).catch(() => {});
  }, [user, id]);

  const accessible = useMemo(
    () => isAdmin || achete || accesVie || (formation ? !formation.paywall : false),
    [isAdmin, achete, accesVie, formation],
  );

  const ouvrir = async (l: Lecon) => {
    setCourante(l); setUrlCourante(''); setErreur(null);
    if (user) marquerLecon(user.uid, id, l.id, terminees[l.id] || false).catch(() => {});
    // Leçon sans fichier média : seul le texte s'affiche, pas d'appel serveur.
    if (!l.chemin) { setChargeLecon(false); return; }
    setChargeLecon(true);
    try {
      setUrlCourante(await urlDeLecon(id, l.id));
    } catch {
      setErreur(lang === 'FR' ? 'Cette leçon n\'a pas pu se charger.' : 'This lesson could not load.');
    } finally { setChargeLecon(false); }
  };

  const basculerTerminee = async (l: Lecon) => {
    if (!user) return;
    const v = !terminees[l.id];
    setTerminees(t => ({ ...t, [l.id]: v }));
    await marquerLecon(user.uid, id, l.id, v).catch(() => {});
  };

  const suivante = () => {
    if (!courante) return;
    const i = lecons.findIndex(l => l.id === courante.id);
    if (i >= 0 && i < lecons.length - 1) ouvrir(lecons[i + 1]);
  };

  const acheter = async () => {
    if (!user) { setSignInOpen(true); return; }
    setPaiement(true); setErreur(null);
    try {
      window.location.href = await acheterFormation(id);
    } catch {
      setErreur(lang === 'FR' ? 'Le paiement n\'a pas pu démarrer. Réessayez.' : 'Payment could not start. Please try again.');
      setPaiement(false);
    }
  };

  const nbTerminees = lecons.filter(l => terminees[l.id]).length;
  const pct = lecons.length ? Math.round((nbTerminees / lecons.length) * 100) : 0;

  if (loading) {
    return <div className="min-h-screen bg-[#f6f3ee] pt-40 text-center text-sm text-[#3a3126]/50 dark:bg-[#16100a] dark:text-white/50">…</div>;
  }
  if (!formation || formation.statut !== 'publie') {
    return (
      <div className="min-h-screen bg-[#f6f3ee] pt-40 text-center dark:bg-[#16100a]">
        <p className="font-serif text-2xl text-[#2a2015] dark:text-white">{lang === 'FR' ? 'Cette formation n\'est pas disponible.' : 'This course is not available.'}</p>
        <Link to="/cours" className="mt-4 inline-block text-sm text-[#7d6330]">{lang === 'FR' ? 'Retour aux formations' : 'Back to courses'}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f3ee] pt-28 pb-24 dark:bg-[#16100a]">
      <div className="mx-auto max-w-6xl px-6">
        <Link to="/cours" className="text-[11px] font-bold uppercase tracking-widest text-[#7d6330]">
          <i className="fa-solid fa-arrow-left mr-2" />{lang === 'FR' ? 'Toutes les formations' : 'All courses'}
        </Link>
        <h1 className="mt-3 max-w-3xl font-serif text-3xl leading-tight text-[#2a2015] md:text-4xl dark:text-white" style={{ letterSpacing: '-0.01em' }}>
          {formation.titre}
        </h1>

        {accessible && lecons.length > 0 && (
          <div className="mt-5 max-w-3xl">
            <div className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-widest text-[#7d6330]">
              <span>{pct} % {lang === 'FR' ? 'terminé' : 'complete'}</span>
              <span>{nbTerminees}/{lecons.length} {lang === 'FR' ? 'leçons' : 'lessons'}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#3a3126]/10 dark:bg-white/10">
              <div className="h-full rounded-full bg-[#bb9a5e] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {!accessible ? (
          <div className="mt-10 grid gap-8 md:grid-cols-2 md:items-start">
            {formation.imageUrl && (
              <img src={formation.imageUrl} alt="" className="rounded-[20px] border border-white/60 shadow-[0_18px_50px_-25px_rgba(58,49,38,0.5)] dark:border-white/10" />
            )}
            <div>
              {formation.description && (
                <p className="whitespace-pre-line text-[#3a3126]/80 dark:text-white/80">{formation.description}</p>
              )}
              <p className="mt-6 font-serif text-3xl text-[#2a2015] dark:text-white">{formation.prix} $ CA</p>
              <button
                onClick={acheter}
                disabled={paiement}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#bb9a5e] px-8 py-3.5 text-xs font-bold uppercase tracking-widest text-[#2a2015] shadow-[0_8px_22px_-10px_rgba(163,130,63,0.8)] transition-colors hover:bg-[#a3823f] disabled:opacity-50"
              >
                <i className="fa-solid fa-lock-open" />
                {paiement ? (lang === 'FR' ? 'Redirection…' : 'Redirecting…') : (lang === 'FR' ? 'Rejoindre la formation' : 'Join the course')}
              </button>
              <p className="mt-3 text-xs text-[#3a3126]/50 dark:text-white/50">
                {lang === 'FR' ? 'Paiement sécurisé par Stripe. La formation apparaît dans votre espace dès le paiement.' : 'Secure payment by Stripe. The course appears in your space right after payment.'}
              </p>
              {lecons.length > 0 && (
                <div className="mt-8">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#7d6330]">{lecons.length} {lang === 'FR' ? 'leçons' : 'lessons'}</p>
                  <ul className="mt-3 space-y-2">
                    {lecons.map(l => (
                      <li key={l.id} className="flex items-center gap-3 text-sm text-[#3a3126]/70 dark:text-white/70">
                        <i className={`fa-solid ${ICONES[l.type]} w-4 text-[#7d6330]/70`} />
                        {l.titre}
                        {l.duree && <span className="ml-auto text-xs text-[#3a3126]/40 dark:text-white/40">{l.duree}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {erreur && <p className="mt-4 text-sm text-red-600">{erreur}</p>}
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* La liste des leçons */}
            <aside className="rounded-[20px] border border-white/60 bg-white/55 p-3 backdrop-blur-md dark:border-white/10 dark:bg-[#2a2015]/55">
              {lecons.length === 0 && (
                <p className="p-3 text-sm text-[#3a3126]/50 dark:text-white/50">{lang === 'FR' ? 'Les leçons arrivent bientôt.' : 'Lessons coming soon.'}</p>
              )}
              {/* Groupé par module, dans l'ordre du cours */}
              {(() => {
                const groupes: { nom: string; items: Lecon[] }[] = [];
                for (const l of lecons) {
                  const nom = l.moduleNom || '';
                  const g = groupes[groupes.length - 1];
                  if (g && g.nom === nom) g.items.push(l);
                  else groupes.push({ nom, items: [l] });
                }
                return groupes.map((g, gi) => (
                  <div key={gi} className="mb-2">
                    {g.nom && (
                      <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7d6330]">{g.nom}</p>
                    )}
                    {g.items.map(l => (
                      <button
                        key={l.id}
                        onClick={() => ouvrir(l)}
                        className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition-colors ${
                          courante?.id === l.id
                            ? 'bg-[#bb9a5e] text-[#2a2015]'
                            : 'text-[#3a3126]/80 hover:bg-white/70 dark:text-white/80 dark:hover:bg-white/10'
                        }`}
                      >
                        <i className={`fa-solid ${terminees[l.id] ? 'fa-circle-check text-green-700' : ICONES[l.type]} w-4 ${courante?.id === l.id ? '' : 'text-[#7d6330]/70'}`} />
                        <span className="min-w-0 flex-1 truncate">{l.titre}</span>
                        {l.duree && <span className="text-[11px] opacity-60">{l.duree}</span>}
                      </button>
                    ))}
                  </div>
                ));
              })()}
            </aside>

            {/* Le contenu de la leçon */}
            <section className="rounded-[20px] border border-white/60 bg-white/55 p-6 backdrop-blur-md dark:border-white/10 dark:bg-[#2a2015]/55">
              {!courante ? (
                <div className="py-16 text-center text-[#3a3126]/60 dark:text-white/60">
                  <i className="fa-solid fa-circle-play mb-4 block text-4xl text-[#bb9a5e]" />
                  <p className="font-serif text-xl text-[#2a2015] dark:text-white">
                    {lang === 'FR' ? 'Choisissez une leçon pour commencer' : 'Pick a lesson to begin'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#7d6330]">
                    {lang === 'FR' ? 'Leçon' : 'Lesson'} {lecons.findIndex(l => l.id === courante.id) + 1} {lang === 'FR' ? 'de' : 'of'} {lecons.length}
                  </p>
                  <h2 className="mt-1 font-serif text-2xl text-[#2a2015] dark:text-white">{courante.titre}</h2>
                  <div className="mt-5">
                    {chargeLecon ? (
                      <p className="text-sm text-[#3a3126]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>
                    ) : erreur ? (
                      <p className="text-sm text-red-600">{erreur}</p>
                    ) : urlCourante ? (
                      courante.type === 'video' ? (
                        <video src={urlCourante} controls playsInline className="w-full rounded-[15px] bg-black" />
                      ) : courante.type === 'audio' ? (
                        <audio src={urlCourante} controls className="w-full" />
                      ) : (
                        <a
                          href={urlCourante} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full bg-[#bb9a5e] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#2a2015] hover:bg-[#a3823f]"
                        >
                          <i className={`fa-solid ${ICONES[courante.type]}`} />
                          {lang === 'FR' ? 'Ouvrir le document' : 'Open the document'}
                        </a>
                      )
                    ) : null}
                  </div>
                  {courante.texte && courante.texte.trim().length > 40 && (
                    <div className="mt-6 whitespace-pre-line text-[0.95rem] leading-relaxed text-[#3a2f23] dark:text-white/80">
                      {courante.texte.trim()}
                    </div>
                  )}
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => basculerTerminee(courante)}
                      className={`inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                        terminees[courante.id]
                          ? 'border-green-600 bg-green-600/10 text-green-700'
                          : 'border-[#bb9a5e] text-[#7d6330] hover:bg-[#bb9a5e] hover:text-[#2a2015]'
                      }`}
                    >
                      <i className="fa-solid fa-check" />
                      {terminees[courante.id]
                        ? (lang === 'FR' ? 'Leçon terminée' : 'Lesson complete')
                        : (lang === 'FR' ? 'Marquer comme terminée' : 'Mark as complete')}
                    </button>
                    {lecons.findIndex(l => l.id === courante.id) < lecons.length - 1 && (
                      <button
                        onClick={suivante}
                        className="inline-flex items-center gap-2 rounded-full bg-[#bb9a5e] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#2a2015] hover:bg-[#a3823f]"
                      >
                        {lang === 'FR' ? 'Leçon suivante' : 'Next lesson'}
                        <i className="fa-solid fa-arrow-right" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {/* Le feed de la formation : un mur commun par cours, pour celles qui l'ont. */}
        {accessible && user && (
          <div className="mt-12 max-w-3xl">
            <MurSocial fil={`formation:${id}`} titre="Feed" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursDetailPage;
