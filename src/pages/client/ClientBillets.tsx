import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { useApp } from '../../contexts/AppContext';
import { getBilletsDeMembre, type Billet } from '../../firebase/billets';

/**
 * « Mes billets » : les places achetées à la billetterie maison
 * (src/firebase/billets.ts), groupées par événement, du plus proche au
 * plus lointain. Chaque billet se télécharge en PDF pour la porte.
 */

const ClientBillets: React.FC = () => {
  const { user, member, lang } = useApp();
  const fr = lang === 'FR';
  const [billets, setBillets] = useState<Billet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getBilletsDeMembre(user.uid).then(setBillets).catch(() => setBillets([])).finally(() => setLoading(false));
  }, [user]);

  const groupes = useMemo(() => {
    const parEvenement = new Map<string, Billet[]>();
    for (const b of billets) {
      const cle = b.eventId || b.eventTitre;
      if (!parEvenement.has(cle)) parEvenement.set(cle, []);
      parEvenement.get(cle)!.push(b);
    }
    return Array.from(parEvenement.values()).sort((a, b) => new Date(a[0].eventDate).getTime() - new Date(b[0].eventDate).getTime());
  }, [billets]);

  if (loading) {
    return <p className="text-sm text-[#293027]/50 dark:text-white/50">{fr ? 'Chargement…' : 'Loading…'}</p>;
  }

  if (billets.length === 0) {
    return (
      <div className="rounded-[15px] bg-[#BA7B39]/8 py-12 text-center dark:bg-white/5">
        <i className="fa-solid fa-ticket mb-3 block text-2xl text-[#BA7B39]/60" />
        <p className="text-sm text-[#293027]/60 dark:text-white/60">
          {fr ? "Vous n'avez pas encore de billet." : "You don't have a ticket yet."}
        </p>
        <a href="/evenements" className="mt-4 inline-block text-xs font-bold uppercase tracking-widest text-[#8B4A2F] dark:text-[#d9a05b]">
          {fr ? 'Voir les événements' : 'See the events'}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {groupes.map(groupe => {
        const [premier] = groupe;
        const dateStr = new Date(premier.eventDate).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        return (
          <section key={premier.eventId || premier.eventTitre}>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#8B4A2F] dark:text-[#d9a05b]">{dateStr}</p>
            <h3 className="mt-1 font-serif text-xl text-[#293027] dark:text-white">{premier.eventTitre}</h3>
            {premier.eventLieu && <p className="mt-1 text-sm text-[#293027]/60 dark:text-white/60"><i className="fa-solid fa-location-dot mr-1.5 text-[#BA7B39]" />{premier.eventLieu}</p>}

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {groupe.map(billet => (
                <BilletCard key={billet.id || billet.code} billet={billet} nom={member?.displayName || user?.displayName || ''} lang={lang} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
};

const BilletCard: React.FC<{ billet: Billet; nom: string; lang: string }> = ({ billet, nom, lang }) => {
  const fr = lang === 'FR';

  const telecharger = () => {
    // Un billet, une page A4, fond crème et filet laiton — le même esprit que
    // les autres PDF du portail (ClientPortal.tsx, patron du rituel).
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 56;
    let y = margin;

    doc.setFillColor(246, 243, 238); doc.rect(0, 0, W, H, 'F');
    doc.setDrawColor(187, 154, 94); doc.setLineWidth(3);
    doc.line(margin, y, margin + 72, y); y += 30;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(125, 99, 48);
    doc.text((fr ? 'BILLET · ' : 'TICKET · ') + (fr ? 'KRYSTINE ST-LAURENT' : 'KRYSTINE ST-LAURENT'), margin, y);
    y += 30;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(24); doc.setTextColor(58, 49, 38);
    const titreLignes = doc.splitTextToSize(billet.eventTitre, W - margin * 2);
    doc.text(titreLignes, margin, y); y += titreLignes.length * 28 + 6;

    const dateStr = new Date(billet.eventDate).toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(102, 87, 70);
    doc.text(dateStr, margin, y); y += 18;
    if (billet.eventLieu) { doc.text(billet.eventLieu, margin, y); y += 18; }

    y += 12;
    doc.setDrawColor(187, 154, 94); doc.setLineWidth(0.6);
    doc.line(margin, y, W - margin, y); y += 34;

    if (nom) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(125, 99, 48);
      doc.text((fr ? 'AU NOM DE' : 'ISSUED TO'), margin, y); y += 18;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(14); doc.setTextColor(58, 49, 38);
      doc.text(nom, margin, y); y += 34;
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(125, 99, 48);
    doc.text((fr ? 'CODE DU BILLET' : 'TICKET CODE'), margin, y); y += 24;
    doc.setFont('courier', 'bold'); doc.setFontSize(28); doc.setTextColor(29, 22, 4);
    doc.text(billet.code, margin, y);

    y = H - margin;
    doc.setDrawColor(187, 154, 94); doc.setLineWidth(0.5);
    doc.line(margin, y - 20, margin + 72, y - 20);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(130, 120, 105);
    doc.text('Krystine St-Laurent · krystinestlaurent.ca', margin, y);

    doc.save(`billet-${billet.code}.pdf`);
  };

  return (
    <div className="rounded-[15px] border border-[#BA7B39]/25 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-lg font-bold tracking-wide text-[#293027] dark:text-white">{billet.code}</p>
        {billet.utilise && (
          <span className="rounded-full bg-[#293027]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#293027]/70 dark:bg-white/10 dark:text-white/70">
            {fr ? 'Entrée validée' : 'Checked in'}
          </span>
        )}
      </div>
      {billet.eventLieu && (
        <p className="mt-2 text-xs text-[#293027]/50 dark:text-white/50"><i className="fa-solid fa-location-dot mr-1.5" />{billet.eventLieu}</p>
      )}
      <button
        type="button"
        onClick={telecharger}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#293027] px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#BA7B39] dark:bg-[#BA7B39] dark:text-[#151d19]"
      >
        <i className="fa-solid fa-download" /> {fr ? 'Télécharger le PDF' : 'Download the PDF'}
      </button>
    </div>
  );
};

export default ClientBillets;
