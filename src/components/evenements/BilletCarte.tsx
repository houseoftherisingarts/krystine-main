import React, { useEffect, useMemo, useState } from 'react';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../../firebase';
import { useApp } from '../../contexts/AppContext';
import { enVente, placesRestantes, type EventDoc } from '../../firebase/firestore';
import { enDollars, avecTaxes } from '../../firebase/billets';

// Le billet, dessiné comme un billet : le talon en haut avec le titre et le
// jour, la perforation, puis le corps avec le prix, la jauge des places, le
// compteur et le bouton Stripe. Les autres états (complet, inscription
// ailleurs, pas encore ouvert) gardent le même billet avec un autre message.
// Le paiement passe par la fonction serveur creerSessionBillets, inchangée.

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juill.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const BilletCarte: React.FC<{
  ev: EventDoc;
  lang: 'FR' | 'EN';
  /** Aperçu d'une administratrice sur une page non publiée : tout se voit, rien ne se paie. */
  apercu?: boolean;
  id?: string;
}> = ({ ev, lang, apercu = false, id }) => {
  const fr = lang === 'FR';
  const { user, setSignInOpen } = useApp();
  const [quantite, setQuantite] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState('');

  const restantes = placesRestantes(ev);
  const total = ev.places || 0;
  const ouverts = enVente(ev) || (apercu && !!ev.billetterie && !!ev.prixCents);
  const complet = !!ev.billetterie && !ouverts && !apercu;
  const maxAchat = Math.max(1, Math.min(ev.maxParAchat || 6, Math.max(restantes, 1)));
  useEffect(() => { setQuantite(q => Math.min(Math.max(1, q), maxAchat)); }, [maxAchat]);
  const prixTotal = useMemo(() => (ev.prixCents || 0) * quantite, [ev.prixCents, quantite]);

  const [a, m, j] = ev.date.split('-');
  const dateStr = new Date(Number(a), Number(m) - 1, Number(j)).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const acheter = async () => {
    if (!ev.id || busy || apercu) return;
    if (!user) { setSignInOpen(true); return; }
    setBusy(true);
    setErreur('');
    try {
      const call = httpsCallable(getFunctions(app, 'us-central1'), 'creerSessionBillets');
      const res = await call({ eventId: ev.id, quantite });
      window.location.href = (res.data as { url: string }).url;
    } catch {
      setErreur(fr ? 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' : 'Payment could not start. Try again in a moment.');
      setBusy(false);
    }
  };

  const pctVendu = total > 0 ? Math.min(100, Math.round(((total - restantes) / total) * 100)) : 0;

  return (
    <div id={id} className="relative scroll-mt-28">
      <div className="relative rounded-[18px] border border-[#bb9a5e]/35 bg-[#1d1604]/92 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.75)] backdrop-blur-md">

        {/* Le talon */}
        <div className="px-6 pb-6 pt-7 md:px-9 md:pt-9">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-[#dcb874]">
                {fr ? 'Billet · admission générale' : 'Ticket · general admission'}
              </p>
              <p className="mt-3 font-serif text-[clamp(1.4rem,2.3vw,1.9rem)] leading-[1.1] text-[#f4ece0]">{ev.title}</p>
              <p className="mt-3 text-[0.85rem] leading-relaxed text-[#cdbfa9]">
                {dateStr}{ev.heure ? ` · ${ev.heure}` : ''}{ev.location ? ` · ${ev.location}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-serif text-[clamp(2.6rem,4vw,3.6rem)] leading-none text-[#dcb874]">{Number(j)}</p>
              <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.24em] text-[#cdbfa9]">
                {fr ? MOIS[Number(m) - 1] : MONTHS[Number(m) - 1]} {a}
              </p>
            </div>
          </div>
        </div>

        {/* La perforation : deux encoches dans le bord et un pointillé */}
        <div className="relative mx-4 h-0 border-t border-dashed border-[#bb9a5e]/40" aria-hidden>
          <span className="absolute -left-[29px] -top-3 h-6 w-6 rounded-full bg-[#16100a]" />
          <span className="absolute -right-[29px] -top-3 h-6 w-6 rounded-full bg-[#16100a]" />
        </div>

        {/* Le corps */}
        <div className="px-6 pb-7 pt-6 md:px-9 md:pb-9">
          {ouverts ? (
            <>
              <div className="flex items-baseline justify-between gap-4">
                <p className="font-serif text-[clamp(2rem,3.4vw,2.8rem)] leading-none text-[#f4ece0]">{enDollars(ev.prixCents!)}</p>
                <p className="text-[0.62rem] uppercase tracking-[0.22em] text-[#cdbfa9]">{fr ? 'par billet, avant taxes' : 'per ticket, before tax'}</p>
              </div>
              <p className="mt-2 text-[0.82rem] text-[#cdbfa9]">
                {fr ? `${enDollars(avecTaxes(ev.prixCents!))} taxes incluses.` : `${enDollars(avecTaxes(ev.prixCents!))} tax included.`}
              </p>

              {total > 0 && (
                <div className="mt-6">
                  <div className="flex items-baseline justify-between text-[0.72rem]">
                    <span className="text-[#dcb874]">
                      {restantes <= 1
                        ? (fr ? 'Il reste une place.' : 'One seat left.')
                        : (fr ? `Il reste ${restantes} places sur ${total}.` : `${restantes} of ${total} seats left.`)}
                    </span>
                    <span className="text-[#cdbfa9]/70 tabular-nums">{pctVendu} %</span>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#f4ece0]/10">
                    <div className="h-full rounded-full bg-[#bb9a5e] transition-[width] duration-1000" style={{ width: `${Math.max(pctVendu, 2)}%` }} />
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-[0.85rem] text-[#cdbfa9]">{fr ? 'Billets' : 'Tickets'}</span>
                <div className="flex items-center gap-2 rounded-full border border-[#bb9a5e]/35 px-1.5 py-1">
                  <button type="button" onClick={() => setQuantite(q => Math.max(1, q - 1))} disabled={quantite <= 1} aria-label={fr ? 'Retirer un billet' : 'Remove one ticket'} className="flex h-9 w-9 items-center justify-center rounded-full text-[#f4ece0] transition-colors hover:bg-[#bb9a5e]/15 disabled:opacity-30">−</button>
                  <span className="w-7 text-center font-serif text-[1.25rem] tabular-nums text-[#f4ece0]">{quantite}</span>
                  <button type="button" onClick={() => setQuantite(q => Math.min(maxAchat, q + 1))} disabled={quantite >= maxAchat} aria-label={fr ? 'Ajouter un billet' : 'Add one ticket'} className="flex h-9 w-9 items-center justify-center rounded-full text-[#f4ece0] transition-colors hover:bg-[#bb9a5e]/15 disabled:opacity-30">+</button>
                </div>
              </div>

              <button
                type="button"
                onClick={acheter}
                disabled={busy || apercu}
                className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-3 rounded-full bg-[#bb9a5e] px-8 py-4 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#16100a] transition-colors duration-300 hover:bg-[#dcb874] disabled:opacity-60"
              >
                {apercu
                  ? (fr ? 'En aperçu : la vente ouvre à la publication' : 'Preview: sales open at publication')
                  : busy
                    ? (fr ? 'Un instant…' : 'One moment…')
                    : (fr ? `Réserver · ${enDollars(avecTaxes(prixTotal))}` : `Reserve · ${enDollars(avecTaxes(prixTotal))}`)}
              </button>
              {erreur && <p className="mt-3 text-sm text-red-300">{erreur}</p>}
              {ev.noteAchat && <p className="mt-5 text-[0.8rem] leading-relaxed text-[#cdbfa9]/80">{ev.noteAchat}</p>}
            </>
          ) : complet ? (
            <p className="font-serif text-[1.35rem] leading-snug text-[#f4ece0]">
              {fr ? 'Complet. Toutes les places ont trouvé preneuse.' : 'Sold out. Every seat has found someone.'}
            </p>
          ) : ev.registrationLink ? (
            <>
              <p className="font-serif text-[1.25rem] leading-snug text-[#f4ece0]">
                {fr ? 'L’inscription se fait chez notre partenaire.' : 'Registration happens with our partner.'}
              </p>
              <a href={ev.registrationLink} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-[48px] items-center gap-3 rounded-full bg-[#bb9a5e] px-8 py-3.5 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#16100a] transition-colors hover:bg-[#dcb874]">
                {fr ? 'M’inscrire' : 'Register'} <i className="fa-solid fa-arrow-up-right-from-square text-[11px]" />
              </a>
            </>
          ) : (
            <p className="font-serif text-[1.25rem] leading-snug text-[#f4ece0]">
              {fr ? 'La réservation n’est pas encore ouverte.' : 'Reservations are not open yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BilletCarte;
