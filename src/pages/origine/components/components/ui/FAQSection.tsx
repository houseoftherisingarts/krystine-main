import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
  index: number;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={`mb-4 bg-white dark:bg-ink-sureau border border-copper-bruni/10 dark:border-copper-glow/20 rounded-2xl overflow-hidden transition-all duration-500 ${isOpen ? 'shadow-[0_10px_30px_rgba(200,148,62,0.15)] dark:shadow-[0_10px_30px_rgba(230,163,116,0.15)]' : 'shadow-sm'}`}
    >
      <button
        onClick={onClick}
        className="w-full text-left py-6 px-6 md:px-8 flex items-center justify-between gap-4 focus:outline-none bg-transparent group"
        aria-expanded={isOpen}
      >
        <h3 className={`font-serif text-lg md:text-xl pr-8 transition-colors duration-300 ${isOpen ? 'text-copper-bruni dark:text-copper-glow font-bold' : 'text-ink-sureau dark:text-paper group-hover:text-copper-bruni dark:group-hover:text-copper-glow'}`}>
          {index + 1}. {question}
        </h3>
        <ChevronDown className={`w-5 h-5 text-copper-bruni transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-6 pb-8 md:px-8 text-ink-sureau/70 dark:text-paper/70 leading-relaxed font-light">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { question: "Est-ce que c'est pour moi même si je ne connais rien à l'Ayurveda ?", answer: "Absolument. Expérience Origine est conçu pour vous guider pas à pas, que vous soyez novice ou initié. L'Ayurveda n'est pas un prérequis, c'est l'outil que nous découvrirons ensemble pour lire votre corps." },
    { question: "Je connais déjà l'Ayurveda ou j'enseigne le yoga. Est-ce que c'est pour moi aussi ?", answer: "Oui. Ce n'est pas un cours théorique, c'est une expérience d'intégration. Nous allons au-delà des concepts pour toucher le senti. De nombreux professionnels de la santé et du bien-être y trouvent une profondeur nouvelle pour leur pratique." },
    { question: "Est-ce que Krystine est vraiment présente ou ce sont des pré-enregistrements ?", answer: "C'est un accompagnement hybride et vivant. Les enseignements fondamentaux sont des audios, mais le cœur du parcours bat lors des 12 rencontres en direct avec Krystine (les dimanches)." },
    { question: "Est-ce qu'il faut avoir lu les deux premiers livres de Krystine ?", answer: "Non, ce n'est pas nécessaire. Le parcours se suffit à lui-même. Les livres peuvent être des compléments enrichissants, mais tout ce dont vous avez besoin pour vivre l'expérience est inclus." },
    { question: "J'ai suivi tellement de formations et j'ai l'impression d'avoir empilé les connaissances. Rien ne semble rester. Pourquoi ce serait différent cette fois ?", answer: "C'est la différence entre 'savoir' et 'sentir'. Origine n'est pas une formation intellectuelle de plus. C'est un espace pour déposer le savoir dans le corps. On ne cherche pas à ajouter, on cherche à intégrer." },
    { question: "Quelque chose me dit oui, mais j'arrête toujours en chemin. Qu'est-ce qui me dit que cette fois je vais tenir ?", answer: "La structure du parcours est conçue spécifiquement pour vous soutenir sans vous surcharger. Les méditations courtes et la communauté bienveillante sont là pour vous ramener à vous-même, à votre rythme." },
    { question: "Combien de temps par semaine ?", answer: "Prévoyez environ 3 heures par semaine : 2 heures pour notre rencontre en direct le dimanche, et environ 1 heure répartie dans votre semaine pour écouter le module audio et pratiquer les intégrations." },
    { question: "Le cercle est limité à 250 personnes. Est-ce que je vais me perdre dans le groupe ?", answer: "Au contraire. Cette limite garantit une intimité et permet à Krystine de ressentir l'énergie du groupe. L'espace communautaire est conçu pour être un lieu calme, loin du bruit des grands réseaux sociaux." },
    { question: "J'ai déjà essayé beaucoup de choses.", answer: "Si vous avez l'impression d'avoir tout essayé, c'est peut-être qu'il est temps d'arrêter de chercher à l'extérieur. Origine vous ramène à votre propre autorité intérieure et aux signaux de votre corps." },
    { question: "C'est un investissement important pour moi.", answer: "C'est un engagement envers vous-même. C'est pour cela que nous offrons des options de versements, et surtout une 'Garantie Cœur Léger' de 15 jours. Si vous sentez que ce n'est pas votre place, vous serez remboursée." },
    { question: "À quelle heure ont lieu les rencontres en direct ?", answer: "Les heures varient selon votre localisation dans le monde. Consultez notre calendrier interactif juste au-dessous pour voir l'horaire exact selon votre propre fuseau horaire (Québec, France, etc)." }
  ];

  return (
    <section id="faq" className="py-24 lg:py-32 px-6 bg-paper dark:bg-ink-forest relative overflow-hidden w-full">
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-lg md:text-xl font-serif tracking-[0.15em] uppercase text-copper-bruni dark:text-copper-glow">
            Ce qui se murmure avant de dire oui...
          </h2>
        </div>
        <div className="w-full">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              index={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
