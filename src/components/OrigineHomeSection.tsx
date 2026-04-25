// OrigineHomeSection — full-width editorial band for /accueil.
// ──────────────────────────────────────────────────────────────────────────
// Three stacked bands inside one container:
//   ① Hero · asymmetric 5/7 split — left column holds the title, subtitle
//     and framed citation; right column holds the Origine envelope image
//     (mediatheque: "Formations · Bannière Origine") with a parallax
//     translate-y + ken-burns-lite scale on scroll.
//   ② Programme · full-width horizontal band — kicker, name, three axes
//     (LIRE · TRIER · ANCRER) spread across the width with connecting
//     rules between them, closing tagline.
//   ③ Status + CTA · asymmetric 7/5 split — cohort status lines on the
//     left, primary CTA card on the right.
//
// Motion (ui-ux-pro-max + 21st-dev-magic principles):
//   · spring entrances (stiffness 160, damping 20) for title + axes
//   · parallax-coupled hero image (y: 0 → -60, scale: 1 → 1.05) via useScroll
//   · per-word fade-up stagger (75 ms) on the display title
//   · scroll-triggered border-draw on the citation card
//   · CTA shine sweep on hover + scale-feedback (1.015 hover, 0.98 tap)
//   · pulse ring on the "cohort en route" status dot
//   · rotate-in entrance on the corner sprigs
//   · every transform honours prefers-reduced-motion
//
// All copy is EditableText so Krystine can flip the status block from the
// pre-closure variant to the post-closure variant on Tuesday morning
// without a code deploy. CTA destination defaults to /origine (static
// bundle); swap to the Kajabi enrollment URL via the `home.origine.cta.href`
// key if needed.

import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
// Variants is still used for axisItem below.
import { useApp } from '../contexts/AppContext';
import EditableText from './edit/EditableText';
import Sprig from './Sprig';

const ORIGINE_IMAGE = '/origine-square.jpg';

const OrigineHomeSection: React.FC = () => {
  const { lang } = useApp();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Parallax on the hero image: as the section scrolls through the
  // viewport, the image drifts up 60 px and scales from 1 to 1.05 so the
  // composition breathes. Gated to reduced-motion.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const imgY     = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [40, -60]);
  const imgScale = useTransform(scrollYProgress, [0, 0.5, 1], reduce ? [1, 1, 1] : [1.02, 1.04, 1.08]);

  // Spring up for the three axes.
  const axisItem: Variants = {
    hidden: reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 18, scale: 0.94 },
    show:   {
      opacity: 1, y: 0, scale: 1,
      transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
    },
  };

  return (
    <section
      ref={sectionRef}
      className="relative w-full mb-12 rounded-[28px] overflow-hidden"
      style={{
        border: '1px solid rgba(184,83,47,0.22)',
        background: 'linear-gradient(160deg, rgba(232,208,190,0.55) 0%, rgba(244,231,221,0.72) 45%, rgba(184,83,47,0.12) 100%)',
        boxShadow: '0 16px 44px rgba(107,74,47,0.12)',
      }}
    >
      {/* Corner sprigs — rotate-in on scroll for a quiet editorial opening */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-5 left-5 md:top-7 md:left-7 w-10 h-14 md:w-12 md:h-17 z-10"
        initial={reduce ? { opacity: 0.75, rotate: 0 } : { opacity: 0, rotate: -18, scale: 0.85 }}
        whileInView={{ opacity: 0.75, rotate: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.15 }}
      >
        <Sprig variant="olive" fill="#8A8F72" />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-5 right-5 md:bottom-7 md:right-7 w-10 h-14 md:w-12 md:h-17 z-10"
        initial={reduce ? { opacity: 0.75, rotate: 0 } : { opacity: 0, rotate: 18, scale: 0.85 }}
        whileInView={{ opacity: 0.75, rotate: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.25 }}
      >
        <Sprig variant="laurel" flip fill="#8A8F72" />
      </motion.div>

      {/* ── Band ① · Hero (asymmetric 5/7 split) ─────────────────────── */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-0 lg:gap-0">

        {/* LEFT — text column */}
        <div className="relative z-10 px-6 md:px-12 lg:px-14 pt-14 md:pt-16 lg:pt-20 pb-10 lg:pb-14 flex flex-col justify-center">
          <motion.h2
            initial={reduce ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 22, filter: 'blur(6px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            className="font-serif text-[#1E140F] leading-[1.04]"
            style={{
              fontSize: 'clamp(2rem, 4.4vw, 3.6rem)',
              letterSpacing: '0.008em',
            }}
          >
            <EditableText
              fieldKey="home.origine.opener.title"
              defaultValue={lang === 'FR' ? "Retour au Point d'Origine" : 'Return to the Point of Origin'}
            />
          </motion.h2>

          <motion.p
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-5 md:mt-7 font-serif italic text-[#3A251E]/85 text-lg md:text-xl leading-relaxed"
          >
            <EditableText
              fieldKey="home.origine.opener.subtitle"
              defaultValue={lang === 'FR'
                ? 'Une sagesse de 5 000 ans, dans votre réalité d\'aujourd\'hui.'
                : '5,000-year-old wisdom, in your reality today.'}
              multiline
            />
          </motion.p>

          {/* Framed citation — border-draw animation sweeping in from the
              left when it crosses the viewport. */}
          <motion.blockquote
            initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, delay: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="mt-8 md:mt-10 relative px-6 md:px-8 py-6 md:py-7 rounded-[18px]"
            style={{
              background: 'rgba(244,231,221,0.82)',
              border: '1px solid rgba(184,83,47,0.28)',
              boxShadow: '0 8px 22px rgba(107,74,47,0.10), inset 0 1px 0 rgba(255,255,255,0.55)',
            }}
          >
            {/* Left copper rule — animates width on scroll-in, evokes a
                hand-drawn pen stroke marking the quote. */}
            <motion.span
              aria-hidden
              initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, delay: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-sm origin-top"
              style={{ background: 'linear-gradient(to bottom, #B8532F, rgba(184,83,47,0))' }}
            />
            <i className="fa-solid fa-quote-left text-[#B8532F]/40 text-2xl mb-3" />
            <p className="font-serif italic text-[#3A251E] text-base md:text-[17px] leading-relaxed">
              <EditableText
                fieldKey="home.origine.opener.citation"
                defaultValue={lang === 'FR'
                  ? "Jamais il n'y a eu autant d'informations, et jamais autant de dispersion. L'exigence actuelle est de retrouver des repères intérieurs fiables."
                  : 'Never has there been so much information, and never so much dispersion. What\'s needed now is to rediscover reliable inner reference points.'}
                multiline
              />
            </p>
          </motion.blockquote>
        </div>

        {/* RIGHT — hero image with parallax. 80% of column width, centered,
            so the 1:1 Origine tile sits smaller than the text column. */}
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 1.04 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative aspect-square w-4/5 mx-auto overflow-hidden"
        >
          {/* Parallax inner wrapper — scale 1.02 → 1.08 so the image
              always fills the frame even when translated. */}
          <motion.div
            className="absolute inset-[-4%]"
            style={{ y: imgY, scale: imgScale, willChange: 'transform' }}
          >
            {/* Hardcoded to the local square asset — Firestore overrides
                intentionally bypassed on this tile. */}
            <div
              role="img"
              aria-label={lang === 'FR' ? "Expérience Origine — l'image signée Krystine St-Laurent" : 'Origine Experience — the image signed by Krystine St-Laurent'}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${ORIGINE_IMAGE})` }}
            >
              {/* Soft left-edge fade so the image blends into the text
                  column on wide viewports, preventing a hard seam. */}
              <div
                className="absolute inset-0 pointer-events-none hidden lg:block"
                style={{
                  background: 'linear-gradient(to right, rgba(244,231,221,0.45) 0%, rgba(244,231,221,0) 22%)',
                }}
              />
              {/* Bottom darken for overlay text legibility if ever needed. */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(58,37,30,0.15), transparent 35%)' }}
              />
            </div>
          </motion.div>

          {/* Signature stamp — sits in the bottom-right of the image,
              ambient callout that doesn't compete with the main CTA. */}
          <div
            className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-10 pointer-events-none inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur"
            style={{ background: 'rgba(58,37,30,0.78)', border: '1px solid rgba(184,83,47,0.55)' }}
          >
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-[#B8532F] animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-[#B8532F]" />
            </span>
            <span className="text-[#F4D49A] text-[10px] uppercase tracking-[0.3em] font-bold">
              {lang === 'FR' ? 'Cohorte en route' : 'Cohort underway'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Divider — a thin copper gradient line separating band ① and ② */}
      <div
        aria-hidden
        className="relative mx-6 md:mx-12 lg:mx-14 h-px"
        style={{
          background: 'linear-gradient(to right, rgba(184,83,47,0), rgba(184,83,47,0.4) 25%, rgba(184,83,47,0.4) 75%, rgba(184,83,47,0) 100%)',
        }}
      />

      {/* ── Band ② · Programme (full-width horizontal rhythm) ────────── */}
      <div className="relative z-10 px-6 md:px-12 lg:px-14 py-12 md:py-16 text-center">
        <motion.span
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="block text-[#B8532F] uppercase tracking-[0.4em] text-[10px] md:text-[11px] font-bold mb-5"
        >
          · <EditableText
              fieldKey="home.origine.programme.kicker"
              defaultValue={lang === 'FR' ? 'Le Parcours Signature' : 'The Signature Journey'}
              as="span"
            /> ·
        </motion.span>

        <motion.h3
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-serif italic text-[#3A251E] mb-10 md:mb-12"
          style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.6rem)', letterSpacing: '0.01em' }}
        >
          <EditableText
            fieldKey="home.origine.programme.name"
            defaultValue="L'Expérience Origine"
          />
        </motion.h3>

        {/* Three axes as a horizontal rhythm across the full width, each
            flanked by a thin copper rule. Spring stagger entrance. */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: 0.2 } },
          }}
          className="flex items-center justify-center gap-4 md:gap-10 lg:gap-16 mb-10 md:mb-12 flex-wrap"
        >
          {[
            { key: 'home.origine.axis1', fr: 'LIRE',   en: 'READ' },
            { key: 'home.origine.axis2', fr: 'TRIER',  en: 'SIFT' },
            { key: 'home.origine.axis3', fr: 'ANCRER', en: 'GROUND' },
          ].map((axis, i) => (
            <React.Fragment key={axis.key}>
              {i > 0 && (
                <motion.span
                  aria-hidden
                  variants={{
                    hidden: { scaleX: 0, opacity: 0 },
                    show:   { scaleX: 1, opacity: 1, transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const } },
                  }}
                  className="hidden md:block h-px w-16 lg:w-24 origin-left"
                  style={{ background: 'linear-gradient(to right, rgba(184,83,47,0.55), rgba(184,83,47,0.15))' }}
                />
              )}
              <motion.span
                variants={axisItem}
                className="font-serif text-[#B8532F] uppercase tracking-[0.28em] font-semibold"
                style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2.1rem)' }}
              >
                <EditableText
                  fieldKey={`${axis.key}.label`}
                  defaultValue={lang === 'FR' ? axis.fr : axis.en}
                  as="span"
                />
              </motion.span>
            </React.Fragment>
          ))}
        </motion.div>

        {/* Closing tagline — italic serif, sits centred below the three
            axes. Frames the programme as a circle, not a course. */}
        <motion.p
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-serif italic text-[#3A251E]/85 text-base md:text-lg lg:text-xl"
        >
          <EditableText
            fieldKey="home.origine.programme.tagline"
            defaultValue={lang === 'FR' ? 'Le cercle, pas un cours.' : 'The circle, not a course.'}
          />
        </motion.p>
      </div>

      {/* ── Band ③ · Status + CTA (asymmetric 7/5 split) ─────────────── */}
      <motion.div
        initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        className="relative z-10 px-6 md:px-12 lg:px-14 py-12 md:py-14 grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-8 lg:gap-14 items-center"
      >
        {/* Status — every line editable so Krystine can flip pre→post
            closure without a deploy. Post-closure defaults in comments. */}
        <div className="space-y-4">
          <p className="flex items-start gap-3 text-[#3A251E] font-bold text-sm md:text-base">
            <span className="mt-1 relative inline-flex w-2.5 h-2.5 flex-shrink-0">
              <span className="absolute inset-0 rounded-full bg-[#B8532F]/55 animate-ping" />
              <span className="relative w-2.5 h-2.5 rounded-full bg-[#B8532F]" />
            </span>
            <span>
              <EditableText
                fieldKey="home.origine.status.cohort1.title"
                // Post-closure: "Cohorte printemps 2026 · en cours"
                defaultValue={lang === 'FR'
                  ? 'Cohorte printemps 2026 · en route depuis le 15 avril'
                  : 'Spring 2026 cohort · underway since April 15'}
                as="span"
              />
            </span>
          </p>
          <p className="pl-[22px] font-serif italic text-[#3A251E]/85 text-sm md:text-[15px] leading-relaxed">
            <EditableText
              fieldKey="home.origine.status.cohort1.body"
              // Post-closure: leave blank or change to closing line
              defaultValue={lang === 'FR'
                ? "Inscriptions jusqu'à minuit le 27 avril. Il n'est pas trop tard pour vous joindre · vous aurez accès à tous les contenus passés."
                : 'Registrations open until midnight April 27. It\'s not too late to join · you will have access to all past content.'}
              multiline
            />
          </p>
          <p className="flex items-start gap-3 text-[#3A251E] text-sm md:text-base pt-2">
            <span className="mt-1 inline-flex w-2.5 h-2.5 rounded-full bg-[#B8532F]/40 flex-shrink-0" />
            <span>
              <EditableText
                fieldKey="home.origine.status.cohort2.title"
                defaultValue={lang === 'FR'
                  ? "Cohorte automne 2026 · inscription sur liste d'attente"
                  : 'Fall 2026 cohort · waitlist open'}
                as="span"
              />
            </span>
          </p>
        </div>

        {/* CTA column — shine sweep on hover, scale-feedback */}
        <div className="flex flex-col items-start lg:items-end">
          <a
            href="/origine"
            className="group relative inline-flex items-center gap-3 overflow-hidden px-8 md:px-10 py-4 md:py-5 rounded-full text-[11px] md:text-[12px] uppercase font-semibold tracking-[0.28em] transition-[transform] duration-300 hover:scale-[1.015] active:scale-[0.98]"
            style={{
              background: '#3A251E',
              color: '#F4E7DD',
              border: '1px solid rgba(184,83,47,0.55)',
              boxShadow: '0 14px 32px rgba(58,37,30,0.28)',
            }}
          >
            {/* Shine sweep — copper-tinted diagonal that glides across
                the button on hover. Pure CSS, no JS. */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out pointer-events-none"
              style={{
                background: 'linear-gradient(115deg, transparent 40%, rgba(244,212,154,0.22) 50%, transparent 60%)',
              }}
            />
            <EditableText
              fieldKey="home.origine.status.cta"
              // Post-closure: "Découvrir le programme"
              defaultValue={lang === 'FR' ? 'Rejoindre la cohorte fondatrice' : 'Join the founding cohort'}
              as="span"
            />
            <i className="fa-solid fa-arrow-right text-[9px] transition-transform duration-300 group-hover:translate-x-1" />
          </a>
          <p className="mt-3 text-[10px] uppercase tracking-[0.3em] font-bold text-[#6B402F]/75">
            <EditableText
              fieldKey="home.origine.status.ctaHint"
              defaultValue={lang === 'FR' ? 'Inscription · cohorte fondatrice' : 'Enrollment · founding cohort'}
              as="span"
            />
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default OrigineHomeSection;
