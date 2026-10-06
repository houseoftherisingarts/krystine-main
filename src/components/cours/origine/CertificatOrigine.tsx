import React from 'react';
import type { Lecon } from '../../../firebase/formations';
import type { DiplomeInfos } from '../Diplome';
import { ORIGINE } from '../../../pages/origine2/piliers';

// La leçon « Certificat de complétion » de l'Expérience Origine : le même
// diplôme que Vata (même mécanique : toutes les leçons terminées), habillé
// Origine, au nom de la participante (Krystine, 6 octobre 2026).

interface Props {
  lecons: Lecon[];
  certificat: Lecon;
  terminees: Record<string, boolean>;
  nom: string;
  numero: string;
  lang: 'FR' | 'EN';
  /** Marquer la leçon du certificat terminée : si c'était la dernière, le parchemin se déroule. */
  onTerminer: () => void;
  onDiplome: (infos: DiplomeInfos) => void;
  onReprendre?: () => void;
}

const CertificatOrigine: React.FC<Props> = ({ lecons, certificat, terminees, nom, numero, lang, onTerminer, onDiplome, onReprendre }) => {
  const fr = lang === 'FR';
  const autres = lecons.filter(l => l.id !== certificat.id);
  const faites = autres.filter(l => terminees[l.id]).length;
  const reste = autres.length - faites;
  const toutFini = reste === 0 && !!terminees[certificat.id];
  const bouton = 'inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest';

  const montrer = () => onDiplome({
    nom: nom || (fr ? 'Participante' : 'Participant'),
    programme: 'EXPÉRIENCE ORIGINE',
    accompli: fr ? 'les douze semaines' : 'the twelve weeks',
    date: new Date().toISOString().slice(0, 10),
    numero,
    habillage: 'origine',
  });

  return (
    <div className="mt-5 rounded-[15px] border px-5 py-5" style={{ borderColor: `${ORIGINE.or}66`, background: `${ORIGINE.or}14` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: ORIGINE.olive }}>
        {fr ? 'Votre certificat' : 'Your certificate'}
      </p>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: ORIGINE.encre }}>
        {fr
          ? `${faites} leçon${faites > 1 ? 's' : ''} terminée${faites > 1 ? 's' : ''} sur ${autres.length}. Le certificat se remet à votre nom lorsque toutes les leçons sont marquées terminées.`
          : `${faites} of ${autres.length} lessons complete. The certificate is issued in your name once every lesson is marked complete.`}
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: `${ORIGINE.olive}22` }}>
        <span className="block h-full rounded-full" style={{ width: `${autres.length ? Math.round((faites / autres.length) * 100) : 0}%`, background: ORIGINE.or }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {toutFini ? (
          <button type="button" onClick={montrer} className={bouton} style={{ background: ORIGINE.or, color: ORIGINE.encre }}>
            <i className="fa-solid fa-award" /> {fr ? 'Voir mon certificat' : 'See my certificate'}
          </button>
        ) : reste === 0 ? (
          <button type="button" onClick={onTerminer} className={bouton} style={{ background: ORIGINE.or, color: ORIGINE.encre }}>
            <i className="fa-solid fa-award" /> {fr ? 'Recevoir mon certificat' : 'Receive my certificate'}
          </button>
        ) : onReprendre ? (
          <button type="button" onClick={onReprendre} className={bouton} style={{ border: `1px solid ${ORIGINE.or}`, color: ORIGINE.encre }}>
            {fr ? `Reprendre (${reste} à terminer)` : `Resume (${reste} left)`} <i className="fa-solid fa-arrow-right" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default CertificatOrigine;
