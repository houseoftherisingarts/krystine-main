import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { subscribeToLiveQuestions, type LiveQuestion } from '../../../../firebase/firestore';

// Le paquet de cartes du direct. Krystine ouvre ça en plein écran pendant le
// podcast et lit une question à la fois. Les cartes rougeâtres viennent des
// inscriptions faites d'avance, les cartes bleutées arrivent en temps réel de
// la page publique /podcast/question et se posent à la fin du paquet.

export interface QuestionCard {
  id: string;
  name: string;
  email?: string;
  question: string;
  photoURL?: string;
  meta?: string;          // région, province ou dosha, ce que la fiche connaît
  at?: Date;
  live?: boolean;
}

type TintKey = 'inscrit' | 'live';

// Canon KSL : le parchemin reste la matière, la teinte se pose par-dessus.
// Cuivre patiné et ambre pour les inscriptions reçues d'avance, bleu minéral
// et sauge pour les questions posées pendant l'émission.
const TINT: Record<TintKey, {
  label: string; glass: string; border: string; glow: string;
  accent: string; accentInk: string; accentSoft: string; halo: string; monogram: string;
}> = {
  inscrit: {
    label: 'Inscrite d’avance',
    glass: 'linear-gradient(150deg, rgba(205,128,72,0.40) 0%, rgba(168,70,40,0.44) 55%, rgba(128,52,30,0.38) 100%), #F7F1E4',
    border: 'rgba(139,74,47,0.34)',
    glow: '0 46px 130px -54px rgba(139,74,47,0.85), inset 0 1px 0 rgba(255,252,246,0.9)',
    accent: '#BA7B39',
    accentInk: '#8B4A2F',
    accentSoft: 'rgba(186,123,57,0.14)',
    halo: 'radial-gradient(58% 62% at 30% 22%, rgba(139,74,47,0.42) 0%, rgba(22,19,17,0) 70%)',
    monogram: 'linear-gradient(160deg, rgba(186,123,57,0.42), rgba(139,74,47,0.34)), #F7F1E4',
  },
  live: {
    label: 'En direct',
    glass: 'linear-gradient(150deg, rgba(70,130,176,0.46) 0%, rgba(46,96,136,0.50) 58%, rgba(64,104,120,0.42) 100%), #F7F1E4',
    border: 'rgba(82,100,106,0.38)',
    glow: '0 46px 130px -54px rgba(82,100,106,0.85), inset 0 1px 0 rgba(252,253,253,0.9)',
    accent: '#3D6076',
    accentInk: '#22434F',
    accentSoft: 'rgba(82,100,106,0.14)',
    halo: 'radial-gradient(58% 62% at 30% 22%, rgba(82,100,106,0.42) 0%, rgba(22,19,17,0) 70%)',
    monogram: 'linear-gradient(160deg, rgba(46,96,136,0.55), rgba(90,120,130,0.42)), #F7F1E4',
  },
};

// Grain de parchemin : un bruit SVG posé en surimpression sur le verre.
const PARCHMENT = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const EASE = [0.16, 0.8, 0.24, 1] as const;

const initial = (name: string) => (name.trim()[0] || '?').toUpperCase();

// Le paquet en PDF : une question par page paysage, la teinte de la carte en
// bandeau, le tout lisible sur papier comme sur un iPad posé à côté du micro.
function paquetEnPdf(deck: QuestionCard[], titre: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const L = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;

  deck.forEach((c, i) => {
    if (i > 0) doc.addPage();
    const teinte: [number, number, number] = c.live ? [46, 96, 136] : [168, 70, 40];

    doc.setFillColor(247, 241, 228);
    doc.rect(0, 0, L, H, 'F');
    doc.setFillColor(...teinte);
    doc.rect(0, 0, L, 10, 'F');
    doc.setDrawColor(...teinte);
    doc.setLineWidth(0.8);
    doc.rect(M - 18, M - 18, L - 2 * (M - 18), H - 2 * (M - 18));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...teinte);
    doc.text((c.live ? 'POSÉE PENDANT LE DIRECT' : 'REÇUE À L’INSCRIPTION').split('').join(' '), M, M + 6);

    doc.setFont('times', 'normal');
    doc.setFontSize(30);
    doc.setTextColor(41, 48, 39);
    doc.text(doc.splitTextToSize(c.name, L - 2 * M)[0], M, M + 52);

    const meta = [c.email, c.meta, c.at ? c.at.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '']
      .filter(Boolean).join('   ·   ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(120, 112, 100);
    doc.text(meta, M, M + 74);

    doc.setDrawColor(200, 168, 106);
    doc.setLineWidth(1);
    doc.line(M, M + 92, M + 90, M + 92);

    doc.setFont('times', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(41, 48, 39);
    doc.text(doc.splitTextToSize(c.question, L - 2 * M), M, M + 132, { lineHeightFactor: 1.5 });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 142, 130);
    doc.text(`${String(i + 1).padStart(2, '0')} / ${String(deck.length).padStart(2, '0')}`, M, H - M + 10);
    doc.text(titre, L - M, H - M + 10, { align: 'right' });
  });

  doc.save(`questions-du-direct-${deck.length}.pdf`);
}

const dateFr = (d?: Date) =>
  d ? d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const heureFr = (d?: Date) =>
  d ? d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '';

const QuestionCards: React.FC<{
  cards: QuestionCard[];          // les inscriptions avec question, du plus ancien au plus récent
  eventTag: string;               // étiquette du direct, pour écouter les questions en temps réel
  eventTitle?: string;
  onClose: () => void;
}> = ({ cards, eventTag, eventTitle, onClose }) => {
  const [liveRows, setLiveRows] = useState<LiveQuestion[]>([]);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [nouvelle, setNouvelle] = useState<string | null>(null);
  const reduce = useReducedMotion();

  // Les questions posées pendant le direct s'ajoutent à la fin du paquet.
  useEffect(() => subscribeToLiveQuestions(eventTag, setLiveRows), [eventTag]);

  const deck = useMemo<QuestionCard[]>(() => [
    ...cards,
    ...liveRows.map(r => ({
      id: `live-${r.id}`,
      name: r.name,
      email: r.email,
      question: r.question,
      at: r.createdAt?.toDate?.(),
      live: true,
    })),
  ], [cards, liveRows]);

  const total = deck.length;
  const card = deck[Math.min(i, Math.max(total - 1, 0))];
  const tint = TINT[card?.live ? 'live' : 'inscrit'];

  // Une carte qui arrive pendant la lecture ne vole pas l'écran : un bandeau
  // discret l'annonce et Krystine décide quand y aller.
  const [vus, setVus] = useState(0);
  useEffect(() => {
    if (liveRows.length > vus) {
      const derniere = liveRows[liveRows.length - 1];
      if (vus > 0 || liveRows.length > 0) setNouvelle(derniere?.name || 'Une question');
      setVus(liveRows.length);
    }
  }, [liveRows, vus]);
  useEffect(() => {
    if (!nouvelle) return;
    const t = setTimeout(() => setNouvelle(null), 6000);
    return () => clearTimeout(t);
  }, [nouvelle]);

  const go = useCallback((d: number) => {
    setDir(d);
    setI(prev => Math.min(Math.max(prev + d, 0), Math.max(total - 1, 0)));
  }, [total]);

  const dernier = useCallback(() => { setDir(1); setI(Math.max(total - 1, 0)); setNouvelle(null); }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'End') dernier();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [go, onClose, dernier]);

  const slide = reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: dir * 70, filter: 'blur(8px)', scale: 0.985 },
        animate: { opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 },
        exit: { opacity: 0, x: dir * -70, filter: 'blur(8px)', scale: 0.985 },
      };

  return (
    <div className="fixed inset-0 z-[140] flex flex-col" style={{ backgroundColor: '#161311' }}>
      {/* Halo de fond, teinté par la carte affichée */}
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        animate={{ background: tint.halo }}
        transition={{ duration: 1.1, ease: EASE }}
      />
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.05]"
           style={{ backgroundImage: PARCHMENT, mixBlendMode: 'overlay' }} />

      {/* Bandeau du haut */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-5 md:px-10 py-4 md:py-5">
        <div className="min-w-0">
          <p className="hidden sm:block text-[10px] uppercase tracking-[0.28em] text-[#EEE7DB]/45">Questions du direct</p>
          <p className="font-serif text-base sm:text-xl md:text-2xl text-[#EEE7DB] truncate">{eventTitle || 'Podcast en direct'}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <p className="font-sans text-sm tabular-nums text-[#EEE7DB]/70">
            <span className="text-[#EEE7DB]">{String(Math.min(i + 1, total)).padStart(2, '0')}</span>
            <span className="mx-1.5 text-[#EEE7DB]/30">/</span>{String(total).padStart(2, '0')}
          </p>
          <button onClick={() => paquetEnPdf(deck, eventTitle || 'Podcast en direct')} disabled={total === 0}
            className="px-4 h-11 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/15 bg-white/5 backdrop-blur-md text-[#EEE7DB]/75 hover:text-[#EEE7DB] hover:border-white/35 disabled:opacity-30 transition-colors">
            <i className="fa-solid fa-file-arrow-down mr-2" />PDF
          </button>
          <button onClick={onClose} aria-label="Fermer"
            className="w-11 h-11 rounded-full grid place-items-center text-[#EEE7DB]/70 border border-white/15 bg-white/5 backdrop-blur-md hover:text-[#EEE7DB] hover:border-white/35 transition-colors">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </header>

      {/* Le paquet */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 md:px-16 pb-4">
        {total === 0 ? (
          <p className="font-serif text-2xl text-[#EEE7DB]/60 text-center">Aucune question n’est encore arrivée.</p>
        ) : (
          <div className="relative w-full max-w-[1180px]" style={{ height: 'min(74vh, 760px)' }}>
            {/* Cartes fantômes : le paquet se voit derrière l'active */}
            {[2, 1].map(n => deck[i + n] && (
              <div key={`ghost-${n}`} aria-hidden
                className="absolute inset-0 rounded-[30px] border"
                style={{
                  transform: `translateY(${n * 16}px) scale(${1 - n * 0.035})`,
                  background: TINT[deck[i + n].live ? 'live' : 'inscrit'].glass,
                  borderColor: 'rgba(238,231,219,0.18)',
                  opacity: n === 1 ? 0.4 : 0.18,
                  backdropFilter: 'blur(14px)',
                }} />
            ))}

            <AnimatePresence mode="wait" custom={dir}>
              <motion.article
                key={card.id}
                {...slide}
                transition={{ duration: reduce ? 0.2 : 0.55, ease: EASE }}
                className="absolute inset-0 rounded-[30px] border overflow-hidden"
                style={{
                  background: tint.glass,
                  borderColor: tint.border,
                  boxShadow: tint.glow,
                  backdropFilter: 'blur(26px) saturate(140%)',
                  WebkitBackdropFilter: 'blur(26px) saturate(140%)',
                }}
              >
                <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.13]"
                     style={{ backgroundImage: PARCHMENT, mixBlendMode: 'multiply' }} />
                <div aria-hidden className="absolute inset-x-0 top-0 h-px pointer-events-none"
                     style={{ background: 'linear-gradient(90deg, transparent, #c8a86a, transparent)' }} />

                <div className="relative h-full grid md:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)]">
                  {/* Le portrait */}
                  <div className="hidden md:block p-6">
                    <div className="h-full rounded-[22px] overflow-hidden border relative"
                         style={{ borderColor: 'rgba(41,48,39,0.14)', background: tint.monogram }}>
                      {card.photoURL ? (
                        <img src={card.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center">
                          <span className="font-serif leading-none" style={{ color: tint.accentInk, fontSize: 'clamp(6rem, 12vw, 11rem)' }}>
                            {initial(card.name)}
                          </span>
                        </div>
                      )}
                      <div aria-hidden className="absolute inset-0"
                           style={{ background: 'linear-gradient(180deg, rgba(22,19,17,0) 55%, rgba(22,19,17,0.35) 100%)' }} />
                    </div>
                  </div>

                  {/* L'identité et la question */}
                  <div className="h-full min-h-0 flex flex-col gap-5 p-7 md:p-10 md:pl-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] border whitespace-nowrap"
                            style={{ color: tint.accentInk, borderColor: tint.border, background: tint.accentSoft }}>
                        {card.live && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: tint.accent }} />}
                        {TINT[card.live ? 'live' : 'inscrit'].label}
                      </span>
                      {card.at && (
                        <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-[#293027]/50 whitespace-nowrap">
                          {card.live ? heureFr(card.at) : dateFr(card.at)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="md:hidden w-16 h-16 rounded-full overflow-hidden border shrink-0 grid place-items-center"
                           style={{ borderColor: tint.border, background: tint.monogram }}>
                        {card.photoURL
                          ? <img src={card.photoURL} alt="" className="w-full h-full object-cover" />
                          : <span className="font-serif text-3xl" style={{ color: tint.accentInk }}>{initial(card.name)}</span>}
                      </div>
                      <h2 className="font-serif text-[#293027] leading-[0.94]"
                          style={{ fontSize: 'clamp(2.4rem, 4.4vw, 4.2rem)' }}>
                        {card.name}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] tracking-[0.06em]">
                      {card.email && <span className="text-[#293027]/65">{card.email}</span>}
                      {card.meta && <span style={{ color: tint.accentInk }}>{card.meta}</span>}
                    </div>

                    <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${tint.border}, rgba(41,48,39,0))` }} />

                    <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: tint.accentInk }}>Sa question</p>
                    <div className="min-h-0 flex-1 overflow-auto pr-2"
                         style={{ maskImage: 'linear-gradient(180deg, #000 92%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 92%, transparent 100%)' }}>
                      <p className="font-serif text-[#293027] whitespace-pre-wrap"
                         style={{ fontSize: 'clamp(1.15rem, 1.9vw, 2.05rem)', lineHeight: 1.45 }}>
                        {card.question}
                      </p>
                    </div>

                    <div className="mt-auto pt-5 flex items-center justify-between gap-4 border-t"
                         style={{ borderColor: 'rgba(41,48,39,0.14)' }}>
                      <span className="font-sans text-[10px] uppercase tracking-[0.24em] text-[#293027]/45 whitespace-nowrap">
                        <span className="hidden sm:inline">Question </span>
                        {String(i + 1).padStart(2, '0')}<span className="hidden sm:inline"> sur </span><span className="sm:hidden"> / </span>{String(total).padStart(2, '0')}
                      </span>
                      <span className="hidden sm:inline font-serif text-lg whitespace-nowrap" style={{ color: tint.accentInk }}>
                        {card.live ? 'Posée pendant le direct' : 'Reçue à l’inscription'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>

            {/* Les flèches */}
            <button onClick={() => go(-1)} disabled={i === 0} aria-label="Carte précédente"
              className="hidden md:grid absolute top-1/2 -translate-y-1/2 -left-14 w-14 h-14 rounded-full place-items-center border border-white/15 bg-white/5 backdrop-blur-md text-[#EEE7DB]/70 hover:text-[#EEE7DB] hover:border-white/40 disabled:opacity-25 disabled:hover:border-white/15 transition-colors">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button onClick={() => go(1)} disabled={i >= total - 1} aria-label="Carte suivante"
              className="hidden md:grid absolute top-1/2 -translate-y-1/2 -right-14 w-16 h-16 rounded-full place-items-center border transition-colors disabled:opacity-25"
              style={{ borderColor: 'transparent', background: tint.accent, color: '#F7F2E8', boxShadow: '0 16px 34px -18px rgba(0,0,0,0.9)' }}>
              <i className="fa-solid fa-chevron-right text-lg" />
            </button>
          </div>
        )}
      </div>

      {/* Barre de progression et rappel des touches */}
      <footer className="relative z-10 px-6 md:px-16 pb-6 space-y-3">
        <div className="h-[3px] w-full rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full rounded-full"
            animate={{ width: total ? `${((i + 1) / total) * 100}%` : '0%' }}
            transition={{ duration: 0.55, ease: EASE }}
            style={{ background: tint.accent }} />
        </div>
        <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.22em] text-[#EEE7DB]/35">
          <span>{deck.filter(c => !c.live).length} inscrites · {deck.filter(c => c.live).length} en direct</span>
          <span className="hidden md:inline">← → pour naviguer · Échap pour fermer</span>
          <span className="flex md:hidden items-center gap-2">
            <button onClick={() => go(-1)} disabled={i === 0} aria-label="Carte précédente"
              className="w-12 h-12 rounded-full grid place-items-center border border-white/15 bg-white/5 text-[#EEE7DB]/70 disabled:opacity-25">
              <i className="fa-solid fa-chevron-left" />
            </button>
            <button onClick={() => go(1)} disabled={i >= total - 1} aria-label="Carte suivante"
              className="w-12 h-12 rounded-full grid place-items-center border disabled:opacity-25"
              style={{ borderColor: 'transparent', background: tint.accent, color: '#F7F2E8' }}>
              <i className="fa-solid fa-chevron-right" />
            </button>
          </span>
        </div>
      </footer>

      {/* Une question vient d'arriver pendant la lecture */}
      <AnimatePresence>
        {nouvelle && (
          <motion.button
            onClick={dernier}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="absolute z-20 left-1/2 -translate-x-1/2 bottom-24 px-5 py-3 rounded-full border flex items-center gap-3 text-sm"
            style={{ borderColor: TINT.live.border, background: 'rgba(238,231,219,0.92)', color: '#293027', backdropFilter: 'blur(18px)' }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: TINT.live.accentInk }} />
            {nouvelle} vient de poser sa question
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: TINT.live.accentInk }}>Aller à la dernière</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionCards;
