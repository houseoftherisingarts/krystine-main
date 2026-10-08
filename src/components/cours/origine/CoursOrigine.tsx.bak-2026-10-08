import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ajouterDocumentLecon, poserVignetteLecon, urlDeDocumentLecon, type Formation, type Lecon } from '../../../firebase/formations';
import { COHORTES, COMPLEMENTS, LECON_CERTIFICAT, ORIGINE, nomDeDocument, pilierDeSemaine, rayonDeLecon, semaineDeLecon, titreDeLecon } from '../../../pages/origine2/piliers';
import type { DiplomeInfos } from '../Diplome';
import ATelechargerOrigine, { type DocAffiche } from './ATelechargerOrigine';
import CertificatOrigine from './CertificatOrigine';
import SeuilOrigine from './SeuilOrigine';
import ListeOrigine from './ListeOrigine';
import { vignetteDeLecon } from '../VideoLecon';
import VoletLecon from './VoletLecon';

// L'espace de cours de l'Expérience Origine (les deux cohortes) : le seuil
// compact, la liste des piliers à gauche, la leçon à droite. Sans questions
// sous les leçons (Alex, 24 septembre 2026).

interface Props {
  id: string;
  formation: Formation;
  lecons: Lecon[];
  courante: Lecon | null;
  terminees: Record<string, boolean>;
  url: string;
  chargement: boolean;
  erreur: string | null;
  isAdmin: boolean;
  lang: 'FR' | 'EN';
  verrouillee: (l: Lecon) => boolean;
  /** La leçon de reprise, la même que celle que la page ouvre d'elle-même. */
  reprise?: Lecon;
  nomParticipante: string;
  onDiplome: (infos: DiplomeInfos) => void;
  onOuvrir: (l: Lecon) => void;
  onTerminee: (l: Lecon) => void;
  onSuivante: () => void;
  onRafraichir: () => Promise<void>;
  modales?: React.ReactNode;
}

const CoursOrigine: React.FC<Props> = ({ id, formation, lecons, courante, terminees, url, chargement, erreur, isAdmin, lang, verrouillee, reprise, nomParticipante, onDiplome, onOuvrir, onTerminee, onSuivante, onRafraichir, modales }) => {
  const fr = lang === 'FR';
  const [apercu, setApercu] = useState<{ nom: string; url: string } | null>(null);
  const nbTerminees = lecons.filter(l => terminees[l.id]).length;
  // Jamais un arrêt sur image de la vidéo (les vignettes Wistia venues de Kajabi sont ignorées).
  const vignettePropre = (l: Lecon) => vignetteDeLecon(l);
  // Les documents d'une leçon : les siens, plus ceux qu'elle emprunte à une autre leçon (COMPLEMENTS).
  const docsDe = (l: Lecon): DocAffiche[] => {
    const propres = (l.docs || []).map((d, index) => ({ nom: nomDeDocument(d.nom), pdf: /\.pdf$/i.test(d.nom), chemin: d.chemin, source: l.id, index }));
    const de = COMPLEMENTS[id]?.[l.id]?.docsDe;
    const autre = de ? lecons.find(x => x.id === de) : undefined;
    const empruntes = (autre?.docs || []).map((d, index) => ({ nom: nomDeDocument(d.nom), pdf: /\.pdf$/i.test(d.nom), chemin: d.chemin, source: autre!.id, index }));
    return [...propres, ...empruntes];
  };
  // « À télécharger » : tous les documents du cours, une seule fois chacun.
  const tousLesDocs = (() => {
    const vus = new Set<string>();
    const out: DocAffiche[] = [];
    // Seulement les leçons ouvertes : un document d'une semaine fermée attend sa semaine (le serveur refuse aussi).
    for (const l of lecons.filter(x => !verrouillee(x))) for (const d of (l.docs || []).map((x, index) => ({ nom: nomDeDocument(x.nom), pdf: /\.pdf$/i.test(x.nom), chemin: x.chemin, source: l.id, index }))) {
      if (vus.has(d.chemin)) continue;
      vus.add(d.chemin); out.push(d);
    }
    return out;
  })();
  const estCertificat = !!courante && LECON_CERTIFICAT[id] === courante.id;
  const etiquette = COHORTES[id] ? (fr ? COHORTES[id].etiquette.fr : COHORTES[id].etiquette.en) : '';

  const position = (l: Lecon): string => {
    const n = semaineDeLecon(l);
    const p = n >= 1 ? pilierDeSemaine(n) : undefined;
    if (p) return `${fr ? 'Pilier' : 'Pillar'} ${p.roman} · ${fr ? p.nom.fr : p.nom.en} · ${fr ? 'Semaine' : 'Week'} ${n}`;
    if (n === 0) return fr ? 'Semaine préparatoire' : 'Preparatory week';
    return rayonDeLecon(l) === 'avant' ? (fr ? 'Avant le parcours' : 'Before the path') : (fr ? 'Bibliothèque' : 'Library');
  };

  const ouvrirDocument = async (d: DocAffiche) => {
    const u = await urlDeDocumentLecon(id, d.source, d.index);
    if (d.pdf) setApercu({ nom: d.nom, url: u });
    else window.open(u, '_blank', 'noopener');
  };

  const suivanteExiste = !!courante && lecons.slice(lecons.findIndex(l => l.id === courante.id) + 1).some(l => !verrouillee(l));

  return (
    <div className="min-h-screen pb-24 pt-24" style={{ background: ORIGINE.creme }}>
      <div className="mx-auto max-w-[1720px] px-5 md:px-10">
        <Link to="/cours" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: ORIGINE.olive }}>
          <i className="fa-solid fa-arrow-left" />{fr ? 'Toutes les formations' : 'All courses'}
        </Link>
        <div className="mt-4">
          <SeuilOrigine
            image={formation.imageUrl}
            titre={formation.titre}
            etiquette={etiquette}
            nbLecons={lecons.length}
            terminees={nbTerminees}
            lang={lang}
            reprise={reprise ? { titre: titreDeLecon(reprise.titre), onOuvrir: () => onOuvrir(reprise) } : undefined}
          />
        </div>

        {/* Note d'accueil des fondatrices (Krystine, 7 oct. 2026). */}
        {id === 'kajabi-2149348838' && fr && (
          <div className="mt-6 rounded-[15px] border px-6 py-5 text-[0.95rem] leading-relaxed md:px-8" style={{ borderColor: `${ORIGINE.olive}33`, background: '#f8f4ec', color: ORIGINE.encre }}>
            <p className="font-serif text-xl">Bienvenue dans votre espace d’EXPÉRIENCE ORIGINE.</p>
            <p className="mt-2">Vous retrouvez ici votre parcours de la première cohorte, transféré de notre ancienne plateforme (krystinestlaurent.com) vers notre nouveau site. Tout y est : les audios des semaines, les méditations, les rencontres, les documents et le journal de bord.</p>
            <p className="mt-2">Votre progression repart à zéro : vous pouvez cocher les leçons déjà faites. Ce qui est nouveau : la bibliothèque, Le Souffle d’Origine et votre certificat à la fin du parcours. EXPÉRIENCE ORIGINE 2 se prépare.</p>
            <p className="mt-2">Si un élément manque ou ne s’ouvre pas, écrivez-nous avec le bouton « ? » en bas de l’écran. Notre équipe est là pour vous.</p>
          </div>
        )}

        <div className={`mt-8 grid gap-6 ${apercu ? 'lg:grid-cols-[340px_minmax(0,1fr)_minmax(0,1fr)]' : 'lg:grid-cols-[340px_minmax(0,1fr)]'}`}>
          <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
            <ListeOrigine lecons={lecons} courante={courante} terminees={terminees} verrouillee={verrouillee} vignetteDe={vignettePropre} onOuvrir={onOuvrir} lang={lang} />
            <div className="mt-2">
              <ATelechargerOrigine documents={tousLesDocs} lang={lang} onOuvrir={d => { void ouvrirDocument(d); }} />
            </div>
          </aside>

          <div className="min-w-0">
            {courante ? (
              <VoletLecon
                key={courante.id}
                lecon={courante}
                formationTitre={formation.titre}
                autresTitres={lecons.map(l => l.titre)}
                vignette={vignettePropre(courante)}
                position={position(courante)}
                url={url}
                chargement={chargement}
                erreur={erreur}
                terminee={!!terminees[courante.id]}
                isAdmin={isAdmin}
                lang={lang}
                onTerminee={() => onTerminee(courante)}
                onSuivante={suivanteExiste ? onSuivante : undefined}
                documents={docsDe(courante)}
                lien={COMPLEMENTS[id]?.[courante.id]?.lien}
                extra={estCertificat ? (
                  <CertificatOrigine
                    lecons={lecons}
                    certificat={courante}
                    terminees={terminees}
                    nom={nomParticipante}
                    numero={`${id.slice(-6).toUpperCase()}`}
                    lang={lang}
                    onTerminer={() => onTerminee(courante)}
                    onDiplome={onDiplome}
                    onReprendre={reprise && reprise.id !== courante.id ? () => onOuvrir(reprise) : undefined}
                  />
                ) : undefined}
                onOuvrirDocument={d => { void ouvrirDocument(d); }}
                onVignette={async f => { await poserVignetteLecon(id, courante.id, f); await onRafraichir(); }}
                onDocument={async f => { await ajouterDocumentLecon(id, courante.id, f); await onRafraichir(); }}
              />
            ) : (
              <div className="rounded-[15px] px-6 py-16 text-center" style={{ background: '#f8f4ec', color: ORIGINE.olive }}>
                <p className="font-serif text-xl" style={{ color: ORIGINE.encre }}>{fr ? 'Choisissez une leçon dans la liste.' : 'Pick a lesson from the list.'}</p>
              </div>
            )}
          </div>

          {apercu && (
            <aside className="flex flex-col overflow-hidden rounded-[15px] border lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]" style={{ borderColor: `${ORIGINE.olive}33`, background: '#f8f4ec' }}>
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: `${ORIGINE.olive}26` }}>
                <p className="min-w-0 truncate text-sm" style={{ color: ORIGINE.encre }}><i className="fa-solid fa-file-pdf mr-2" style={{ color: ORIGINE.olive }} />{apercu.nom}</p>
                <div className="flex shrink-0 items-center gap-2">
                  <a href={apercu.url} target="_blank" rel="noopener noreferrer" className="rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: `${ORIGINE.or}80`, color: ORIGINE.encre }}>
                    {fr ? 'Ouvrir' : 'Open'}
                  </a>
                  <button type="button" onClick={() => setApercu(null)} aria-label={fr ? 'Fermer l’aperçu' : 'Close preview'} className="h-8 w-8 rounded-full hover:bg-[#1c2420]/6" style={{ color: ORIGINE.olive }}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </div>
              </div>
              <iframe src={`${apercu.url}#toolbar=0&view=FitH`} title={apercu.nom} className="h-[70vh] w-full flex-1 bg-white lg:h-auto" />
            </aside>
          )}
        </div>
      </div>
      {modales}
    </div>
  );
};

export default CoursOrigine;
