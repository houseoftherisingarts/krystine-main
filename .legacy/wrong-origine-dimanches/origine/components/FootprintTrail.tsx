import { motion } from 'framer-motion';

const FootprintIcon = ({ className, isRight }: { className?: string, isRight?: boolean }) => (
  <svg viewBox="0 0 120 200" fill="currentColor" className={className} style={{ transform: isRight ? 'scaleX(-1) rotate(180deg)' : 'rotate(180deg)' }}>
    <ellipse cx="45" cy="25" rx="14" ry="20" transform="rotate(-10 45 25)" />
    <ellipse cx="72" cy="25" rx="10" ry="14" transform="rotate(-5 72 25)" />
    <ellipse cx="92" cy="32" rx="8" ry="12" transform="rotate(5 92 32)" />
    <ellipse cx="106" cy="45" rx="6" ry="10" transform="rotate(15 106 45)" />
    <ellipse cx="114" cy="62" rx="5" ry="8" transform="rotate(25 114 62)" />
    <path d="M 40,65 C 55,50 90,55 105,75 C 110,95 105,135 95,165 C 85,195 55,195 50,165 C 45,135 75,115 40,65 Z" />
  </svg>
);

export default function FootprintTrail({ 
  colorClass = "text-[var(--color-copper)]/40",
  count = 5
}: { 
  colorClass?: string,
  count?: number
}) {
  const steps = Array.from({ length: count }).map((_, index) => {
    const isRight = index % 2 !== 0;
    return {
      isRight,
      className: `w-6 ${colorClass} ${isRight ? 'translate-x-4 -rotate-[10deg]' : '-translate-x-4 rotate-[10deg]'}`
    };
  });

  return (
    <div className="w-full flex flex-col items-center justify-center py-12 relative z-20 pointer-events-none">
      {steps.map((step, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.5, y: -15 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: index * 0.3, ease: "easeOut" }}
          className="my-3"
        >
          <FootprintIcon isRight={step.isRight} className={step.className} />
        </motion.div>
      ))}
    </div>
  );
}
