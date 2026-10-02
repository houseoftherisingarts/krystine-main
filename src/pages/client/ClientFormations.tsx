import { cheminCours } from '../../lib/cheminCours';
import StickerFormat, { formatDe } from '../../components/cours/StickerFormat';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { useSiteFlags } from '../../contexts/SiteFlagsContext';
import { getMesFormations, getFormationsPubliees, type AchatFormation, type Formation } from '../../firebase/formations';
import { estTelechargement } from '../../firebase/musique';
import { utiliserCodeKajabi, restaurerKajabiAuto, confirmerAdresseKajabi } from '../../firebase/kajabi';

// « Mes formations » : les cours que la cliente a achetés. La preuve d'achat
// est écrite par le serveur au paiement; l'admin peut aussi en accorder.

// Un titre long « VATA Essentiel · L'Expérience Ayurveda, Saison Vata » se
// lit en deux temps : le nom en titre, la collection en petit dessous.
const couperTitre = (titre: string): [string, string] => {
  const i = titre.indexOf('·');
  return i < 0 ? [titre, ''] : [titre.slice(0, i).trim(), titre.slice(i + 1).trim()];
};
// Les formations d'essai (« TEST … ») ne se montrent qu'aux administratrices.
const estTest = (titre: string) => titre.trim().toUpperCase().startsWith('TEST');

const TitreCarte: React.FC<{ titre: string }> = ({ titre }) => {
  const [nom, collection] = couperTitre(titre);
  return (
    <span className="block min-w-0">
      <span className="line-clamp-2 block font-medium leading-snug text-[#293027] dark:text-white">{nom}</span>
      {collection && <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-[#293027]/55 dark:text-white/55">{collection}</span>}
    </span>
  );
};

const ClientFormations: React.FC = () => {
  const { user, lang, isAdmin } = useApp();
  const { foyerOuvert, origine2Ouvert } = useSiteFlags();
  const [achats, setAchats] = useState<AchatFormation[]>([]);
  const [catalogue, setCatalogue] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  // Le code reçu pour une formation achetée sur l'ancien site (Kajabi).
  const [code, setCode] = useState('');
  const [codeEtat, setCodeEtat] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  const [codeEnvoi, setCodeEnvoi] = useState(false);

  const charger = () => {
    if (!user) return;
    Promise.all([getMesFormations(user.uid), getFormationsPubliees()])
      // Les téléchargements (musique) vivent dans leur propre onglet.
      .then(([a, c]) => { setAchats(a.filter(x => !estTelechargement(x))); setCatalogue(c); })
      .finally(() => setLoading(false));
  };
  useEffect(charger, [user]);
  // Une formation de l'ancien site retrouvée à la connexion : on relit la liste.
  // Si l'adresse reste à confirmer, rien ne s'ouvre avant le lien cliqué.
  const [aVerifier, setAVerifier] = useState(false);
  const [lienEtat, setLienEtat] = useState<'' | 'envoi' | 'parti' | 'erreur'>('');
  useEffect(() => {
    if (user) restaurerKajabiAuto(user.uid).then(r => { setAVerifier(r.aVerifier); if (r.restaurees) charger(); });
  }, [user]);
  const envoyerLien = async () => {
    setLienEtat('envoi');
    try { await confirmerAdresseKajabi(); setLienEtat('parti'); } catch { setLienEtat('erreur'); }
  };

  const entrerCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || codeEnvoi) return;
    setCodeEnvoi(true); setCodeEtat(null);
    try {
      const r = await utiliserCodeKajabi(code);
      setCodeEtat({ type: 'ok', texte: lang === 'FR' ? `« ${r.titre} » est de retour dans vos formations.` : `"${r.titre}" is back in your courses.` });
      setCode('');
      charger();
    } catch (err) {
      setCodeEtat({ type: 'erreur', texte: (err as Error).message || (lang === 'FR' ? 'Ce code n’a pas fonctionné.' : 'That code did not work.') });
    } finally {
      setCodeEnvoi(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#293027]/50 dark:text-white/50">{lang === 'FR' ? 'Chargement…' : 'Loading…'}</p>;
  }

  const possedees = new Set(achats.map(a => a.id));
  const mesFormations = isAdmin ? achats : achats.filter(a => !estTest(a.titre));
  // Seulement ce qui s'achète vraiment aujourd'hui : ni liste d'attente, ni
  // Foyer ou Origine 2 tant que leur vente n'est pas ouverte dans l'admin.
  const fermee = (f: Formation) => f.listeAttente
    || (f.id === 'foyer' && !foyerOuvert)
    || (f.id === 'origine2' && !origine2Ouvert);
  const aDecouvrir = catalogue.filter(f => !possedees.has(f.id) && !fermee(f) && (isAdmin || !estTest(f.titre)));

  return (
    <div className="space-y-10">
      {/* La première moitié : les formations de la personne */}
      <section>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
          {lang === 'FR' ? 'Vos formations' : 'Your courses'}
        </p>
        {mesFormations.length === 0 ? (
          <div className="mt-4 rounded-[15px] bg-[#BA7B39]/8 py-8 text-center dark:bg-white/5">
            <i className="fa-solid fa-graduation-cap mb-3 block text-2xl text-[#BA7B39]/60" />
            <p className="font-serif text-lg text-[#293027] dark:text-white">
              {lang === 'FR' ? 'Aucune formation pour le moment' : 'No courses yet'}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#293027]/50 dark:text-white/50">
              {lang === 'FR' ? 'Choisissez votre premier parcours juste en dessous.' : 'Pick your first path just below.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {mesFormations.map(a => {
              // La couverture 16:9 : celle de la preuve d'achat, sinon celle de la fiche.
              const cover = a.imageUrl || catalogue.find(f => f.id === a.id)?.imageUrl || '';
              return (
              <Link
                key={a.id}
                to={cheminCours(a.id)}
                className="group overflow-hidden rounded-[15px] border border-[#293027]/10 transition-transform duration-300 hover:-translate-y-0.5 dark:border-white/10"
              >
                {cover ? (
                  <img src={cover} alt={a.titre} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-[#BA7B39]/10">
                    <i className="fa-solid fa-graduation-cap text-2xl text-[#8B4A2F]" />
                  </div>
                )}
                {/* Le format sous l'image : il ne couvre plus le titre imprimé sur la couverture. */}
                <div className="p-4">
                  <StickerFormat format={formatDe(a.id)} lang={lang} className="mb-3" />
                  <TitreCarte titre={a.titre} />
                  <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-widest text-[#8B4A2F] transition-colors group-hover:text-[#BA7B39]">
                    {lang === 'FR' ? 'Continuer' : 'Continue'} <i className="fa-solid fa-arrow-right" />
                  </span>
                </div>
              </Link>
              );
            })}
          </div>
        )}

        {/* Une formation de l'ancien site attend : l'adresse doit d'abord être confirmée. */}
        {aVerifier && (
          <div className="mt-6 rounded-[15px] border border-[#BA7B39]/30 bg-[#BA7B39]/5 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">{lang === 'FR' ? 'Une formation de l’ancien site vous attend' : 'A course from the former site is waiting for you'}</p>
            <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60">
              {lienEtat === 'parti'
                ? (lang === 'FR' ? `Le lien est parti vers ${user?.email}. Cliquez dessus, puis revenez ici : votre formation sera ouverte.` : `The link is on its way to ${user?.email}. Click it, then come back here: your course will be open.`)
                : (lang === 'FR' ? 'Confirmez votre adresse courriel pour l’ouvrir. Nous vous envoyons un lien, il suffit de cliquer dessus.' : 'Confirm your email address to open it. We send you a link; just click it.')}
            </p>
            {lienEtat !== 'parti' && (
              <button type="button" onClick={envoyerLien} disabled={lienEtat === 'envoi'} className="mt-3 rounded-full bg-[#BA7B39] px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-[#293027] disabled:opacity-50">
                {lienEtat === 'envoi' ? '…' : (lang === 'FR' ? 'Recevoir le lien' : 'Send me the link')}
              </button>
            )}
            {lienEtat === 'erreur' && <p className="mt-2 text-sm text-[#8B4A2F]">{lang === 'FR' ? 'Le lien n’a pas pu partir. Réessayez dans un instant.' : 'The link could not be sent. Try again in a moment.'}</p>}
          </div>
        )}

        {/* Le code d'accès : les anciennes clientes de Vata retrouvent leur accès
            toutes seules à la connexion; le code ne sert plus qu'aux autres
            formations de l'ancien site. Une ligne discrète, ouverte au besoin. */}
        <details className="group/code mt-6" open={!!codeEtat || undefined}>
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:text-[#BA7B39] [&::-webkit-details-marker]:hidden">
            <i className="fa-solid fa-key text-[10px]" />
            {lang === 'FR' ? 'J’ai reçu un code d’accès' : 'I received an access code'}
            <i className="fa-solid fa-chevron-down text-[9px] transition-transform group-open/code:rotate-180" />
          </summary>
          <form onSubmit={entrerCode} className="mt-3 max-w-xl">
            <p className="text-sm text-[#293027]/60 dark:text-white/60">
              {lang === 'FR' ? 'Une formation suivie sur l’ancien site vous revient avec le code personnel reçu par courriel.' : 'A course from the former site comes back to you with the personal code you received by email.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="KSL-XXXX-XXXX"
                autoComplete="off"
                spellCheck={false}
                className="min-w-[200px] flex-1 rounded-[10px] border border-[#293027]/15 bg-white px-3 py-2 font-mono text-sm uppercase tracking-[0.15em] text-[#293027] dark:border-white/15 dark:bg-white/10 dark:text-white"
              />
              <button type="submit" disabled={codeEnvoi || !code.trim()} className="rounded-full bg-[#BA7B39] px-5 py-2 text-[11px] font-bold uppercase tracking-widest text-[#293027] disabled:opacity-50">
                {codeEnvoi ? '…' : (lang === 'FR' ? 'Retrouver ma formation' : 'Recover my course')}
              </button>
            </div>
            {codeEtat && <p className={`mt-2 text-sm ${codeEtat.type === 'ok' ? 'text-[#2f5d3a] dark:text-[#9fd3a8]' : 'text-[#8B4A2F]'}`}>{codeEtat.texte}</p>}
          </form>
        </details>
      </section>

      {/* La deuxième moitié : les formations à découvrir et à rejoindre */}
      {aDecouvrir.length > 0 && (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F]">
              {lang === 'FR' ? 'Formations à découvrir' : 'Courses to discover'}
            </p>
            <Link to="/cours" className="text-[11px] font-bold uppercase tracking-widest text-[#8B4A2F] hover:text-[#BA7B39]">
              {lang === 'FR' ? 'Toutes les formations' : 'All courses'} <i className="fa-solid fa-arrow-right" />
            </Link>
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {aDecouvrir.map(f => (
              <Link
                key={f.id}
                to={f.lienFiche || cheminCours(f.id)}
                className="group overflow-hidden rounded-[15px] border border-[#BA7B39]/30 transition-transform duration-300 hover:-translate-y-0.5"
              >
                {f.imageUrl ? (
                  <img src={f.imageUrl} alt={f.titre} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-[#BA7B39]/10">
                    <i className="fa-solid fa-graduation-cap text-2xl text-[#8B4A2F]" />
                  </div>
                )}
                <div className="p-4">
                  <StickerFormat format={formatDe(f.id)} lang={lang} className="mb-3" />
                  <div className="flex items-start justify-between gap-3">
                  <TitreCarte titre={f.titre} />
                  <span className="shrink-0 rounded-full bg-[#BA7B39] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#293027]">
                    {f.listeAttente
                      ? (lang === 'FR' ? "Liste d'attente" : 'Waitlist')
                      : f.paywall && f.prix ? `${f.prix} $` : (lang === 'FR' ? 'Libre' : 'Free')}
                  </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ClientFormations;
