// La section « Posts préfaits » de l'admin : la grille des publications
// déjà mises en page par scripts/posts/generer.mjs, lue depuis
// public/pubs/posts/manifest.json. Krystine copie la légende, télécharge
// l'image dans le format qui lui convient, colle dans Facebook ou
// Instagram. Rien n'est envoyé automatiquement pour l'instant : la file ne
// s'enverra seule que le jour où Alex y aura branché la clé Facebook
// (voir scripts/posts/LISEZ-MOI.md, ce module n'installe aucun automate).
import React, { useEffect, useState } from 'react';

interface CartePost {
  id: string;
  serie: string;
  titre: string;
  legende: string;
  lien: string;
  fichiers: { portrait: string; carre: string };
  vignette: string;
  etat: 'publiee' | 'a_publier';
  publieeLe: string | null;
}

const SERIES: Record<string, string> = {
  A: 'Enseignements',
  B: 'Livres',
  C: 'Expérience Origine et formations',
  D: 'Podcast et conférences',
};

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const enLettres = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
};

const PostsPrefaitsSection: React.FC = () => {
  const [cartes, setCartes] = useState<CartePost[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copieId, setCopieId] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch('/pubs/posts/manifest.json')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(d => { if (vivant) setCartes(d); })
      .catch(() => { if (vivant) setErreur("Le manifeste des posts n'a pas encore été généré. Lancer npm run posts:generer depuis le dépôt le règle."); });
    return () => { vivant = false; };
  }, []);

  const copier = async (carte: CartePost) => {
    try {
      await navigator.clipboard.writeText(carte.legende);
      setCopieId(carte.id);
      setTimeout(() => setCopieId(id => (id === carte.id ? null : id)), 2000);
    } catch {
      // Le presse-papier a refusé (permission du navigateur) : la légende
      // reste affichée sur la carte et se copie à la main.
    }
  };

  return (
    <div className="space-y-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..600&family=Inter:wght@300;400;500;600&display=swap');
        .pp-serif { font-family: "Fraunces", Georgia, serif; }
      `}</style>

      <div className="overflow-hidden rounded-[16px] border border-[#e6dfd2] bg-[#fdfbf7] shadow-[0_10px_30px_-18px_rgba(28,23,18,0.35)]">
        <div className="bg-[#f4efe6] px-6 py-6">
          <div className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#9c7a44]">Contenu prêt à partager</div>
          <h1 className="pp-serif mt-2 text-[36px] font-light leading-[0.98] text-[#1c1712] sm:text-[42px]">Posts préfaits</h1>
          <p className="mt-3 max-w-2xl text-[14.5px] leading-[1.6] text-[#3a2f23]">
            Voici vos publications prêtes à partager, chacune déjà mise en page en deux formats avec une légende que vous n'avez qu'à copier pour la coller sur Facebook ou sur Instagram.
            La file peut aussi s'envoyer seule sur votre page Facebook dès qu'Alex y aura branché la clé de connexion, mais rien ne vous empêche de continuer à publier vous-même en attendant.
          </p>
        </div>

        <div className="px-3 py-3">
          {erreur && (
            <div className="rounded-[12px] border border-[#e0c39c] bg-[#fdf6ec] px-4 py-3 text-sm leading-relaxed text-[#7a5a2e]">
              <i className="fa-solid fa-circle-info mr-2" />{erreur}
            </div>
          )}

          {!erreur && !cartes && (
            <div className="rounded-[12px] border border-[#e6dfd2] bg-white/60 px-4 py-6 text-center text-sm text-[#5a554c]">
              Chargement des posts…
            </div>
          )}

          {cartes && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cartes.map(carte => (
                <div key={carte.id} className="flex min-w-0 flex-col overflow-hidden rounded-[12px] border border-[#e6dfd2] bg-white/70">
                  <img src={carte.vignette} alt="" className="aspect-square w-full object-cover" />
                  <div className="flex flex-1 flex-col px-4 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9c7a44]">{SERIES[carte.serie] || carte.serie}</span>
                      {carte.etat === 'publiee' && carte.publieeLe ? (
                        <span className="shrink-0 rounded-full bg-[#e7efe4] px-2 py-[3px] text-[11px] font-semibold text-[#4a6e4a]">Publié le {enLettres(carte.publieeLe)}</span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-[#f0e6d2] px-2 py-[3px] text-[11px] font-semibold text-[#7d6330]">À publier</span>
                      )}
                    </div>
                    <h3 className="pp-serif mt-2 text-[19px] leading-[1.1] text-[#1c1712]">{carte.titre}</h3>
                    <p className="mt-2 line-clamp-4 text-[13px] leading-[1.55] text-[#5a554c]">{carte.legende}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => copier(carte)}
                        className="inline-flex items-center gap-2 rounded-full bg-[#1c1712] px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-[#f4efe6] transition-[background-color,transform] active:scale-[0.98]"
                      >
                        <i className={`fa-solid ${copieId === carte.id ? 'fa-check' : 'fa-copy'}`} />
                        {copieId === carte.id ? 'Copié' : 'Copier la légende'}
                      </button>
                      <a
                        href={carte.fichiers.portrait}
                        download
                        className="inline-flex items-center gap-2 rounded-full border border-[#9c7a44]/50 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-[#7d6330] hover:border-[#9c7a44]"
                      >
                        <i className="fa-solid fa-arrow-down-to-line" /> Portrait
                      </a>
                      <a
                        href={carte.fichiers.carre}
                        download
                        className="inline-flex items-center gap-2 rounded-full border border-[#9c7a44]/50 px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.06em] text-[#7d6330] hover:border-[#9c7a44]"
                      >
                        <i className="fa-solid fa-arrow-down-to-line" /> Carré
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostsPrefaitsSection;
