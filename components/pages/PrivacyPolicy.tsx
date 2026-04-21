
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Language } from '../../types';

interface PrivacyPolicyProps {
  lang: Language;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ lang }) => {
  return (
    <div className="min-h-screen bg-paper-light dark:bg-ink-forest text-ink-sureau dark:text-paper selection:bg-copper-bruni selection:text-white transition-colors duration-700 font-sans">
      {/* Global Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-noise z-50 mix-blend-overlay"></div>
      
      <div className="max-w-4xl mx-auto px-6 py-24 relative z-10">
        <a 
          href="/" 
          className="inline-flex items-center gap-2 text-copper-bruni font-bold tracking-[0.2em] uppercase text-xs mb-12 hover:gap-4 transition-all group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {lang === 'fr' ? "Retour à l'accueil" : "Back to home"}
        </a>

        <h1 className="font-serif text-4xl md:text-6xl mb-12 text-ink-sureau dark:text-white tracking-tight">
          {lang === 'fr' ? "Politique de confidentialité" : "Privacy Policy"}
        </h1>

        <div className="prose prose-lg dark:prose-invert max-w-none space-y-12 font-light leading-relaxed">
          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">1. Introduction et portée</h2>
            <p>
              Bienvenue sur le site de l'Expérience Origine, opéré par Krystine St-Laurent. Nous accordons une importance capitale à la protection de vos renseignements personnels. Cette politique détaille comment nous collectons, utilisons et protégeons vos données, en conformité avec la Loi 25 (Québec), la Loi canadienne anti-pourriel (LCAP) et le Règlement général sur la protection des données (RGPD).
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">2. Renseignements personnels collectés</h2>
            <p>Nous collectons uniquement les données nécessaires à la fourniture de nos services :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Identité :</strong> Nom et prénom (formulaires d'inscription, quiz dosha, demandes de conférence).</li>
              <li><strong>Contact :</strong> Adresse courriel.</li>
              <li><strong>Résultats de quiz :</strong> Réponses au Dosha Quiz et dominance calculée (Vata, Pitta, Kapha), lorsque vous choisissez de recevoir vos résultats.</li>
              <li><strong>Navigation :</strong> Adresse IP, type de navigateur, pages consultées — uniquement après votre consentement explicite via le bandeau Loi 25.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">3. Utilisation des données</h2>
            <p>Vos renseignements sont utilisés pour :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>L'envoi de notre infolettre (avec votre consentement explicite).</li>
              <li>La gestion de vos demandes au service client et de vos demandes de conférence.</li>
              <li>La transmission de vos résultats de Dosha Quiz lorsque vous les sollicitez.</li>
              <li>L'amélioration de l'expérience utilisateur via des analyses web, uniquement si vous avez accepté les témoins non essentiels.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">4. Témoins (cookies) et outils tiers</h2>
            <p>
              Conformément à la Loi 25, aucun témoin non essentiel n'est déposé avant que vous n'ayez donné votre consentement explicite via le bandeau prévu à cet effet.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Firebase (Google LLC)</strong> — Authentification, base de données (Firestore) et, après consentement, Firebase Analytics. Les données peuvent être traitées hors du Québec.</li>
              <li><strong>Meta Pixel (Meta Platforms, Inc.)</strong> — Mesure d'audience, chargé uniquement après votre consentement explicite.</li>
              <li><strong>Google Fonts &amp; Font Awesome (CDN)</strong> — Chargement de polices et d'icônes. Votre adresse IP peut être traitée par ces fournisseurs.</li>
              <li><strong>Assistant interne (« Dites-moi ce que vous cherchez »)</strong> — Notre assistant de recherche fonctionne entièrement dans votre navigateur. Vos requêtes ne sont pas transmises à un service d'intelligence artificielle externe.</li>
            </ul>
            <p>
              Vous pouvez à tout moment retirer votre consentement en effaçant les témoins de notre site depuis votre navigateur ; le bandeau réapparaîtra.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">5. Partage des données</h2>
            <p><strong>Nous ne vendons JAMAIS vos renseignements personnels.</strong></p>
            <p>
              Vos données peuvent être partagées uniquement avec les partenaires techniques mentionnés à la section 4, strictement pour l'exécution des services. Ces partenaires sont tenus par contrat de respecter la confidentialité de vos données.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">6. Communication hors Québec</h2>
            <p>
              Certains partenaires (Google LLC, Meta Platforms Inc.) peuvent traiter des renseignements à l'extérieur du Québec. Nous avons procédé à une évaluation des facteurs relatifs à la vie privée (EFVP) et nous assurons par contrat que ces partenaires offrent un niveau de protection équivalent à celui exigé par la Loi 25.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">7. Stockage et sécurité</h2>
            <p>
              Vos données sont stockées sur des serveurs sécurisés. Nous mettons en œuvre des mesures de sécurité physiques, techniques et administratives rigoureuses pour prévenir tout accès non autorisé, perte ou vol de vos renseignements. Nous conservons vos données uniquement pour la durée nécessaire à la finalité pour laquelle elles ont été recueillies.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">8. Vos droits</h2>
            <p>Conformément à la Loi 25 et aux lois applicables, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Droit d'accès et de rectification :</strong> Consulter ou corriger vos données.</li>
              <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos renseignements personnels.</li>
              <li><strong>Droit à la désindexation et à la portabilité :</strong> Demander que vos renseignements ne soient plus associés à un lien hypertexte ou vous être remis dans un format structuré.</li>
              <li><strong>Droit d'être informé en cas d'incident de confidentialité :</strong> Conformément à la Loi 25.</li>
              <li><strong>Retrait du consentement :</strong> Vous pouvez vous désabonner de nos communications à tout moment via le lien de désinscription présent dans chaque courriel (conformité LCAP) ou en contactant le PRP.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl text-copper-bruni">9. Responsable de la protection des renseignements personnels (PRP)</h2>
            <p>Pour toute question ou pour exercer vos droits, veuillez contacter notre Responsable de la protection des renseignements personnels :</p>
            <div className="bg-white/50 dark:bg-black/20 p-8 rounded-2xl border border-copper-bruni/20 mt-6">
              <p className="font-bold text-ink-sureau dark:text-paper">Nom : Alex T. St-Laurent</p>
              <p className="font-bold text-ink-sureau dark:text-paper">Courriel : admin@inspiratanature.com</p>
            </div>
          </section>

          <footer className="pt-12 border-t border-copper-bruni/10 text-xs opacity-50 italic">
            Dernière mise à jour : 20 avril 2026
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
