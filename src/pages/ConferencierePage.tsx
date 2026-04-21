import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { CONTENT, ASSETS } from '../content';
import { addBookingRequest } from '../firebase/firestore';

const ConferencierePage: React.FC = () => {
  const { lang } = useApp();
  const t = CONTENT[lang].booking;

  const [formData, setFormData] = useState({ name: '', email: '', organization: '', eventType: '', message: '' });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await addBookingRequest(formData);
      setSent(true);
    } catch {}
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] dark:bg-[#050C1A]">
      {/* Hero */}
      <div className="pt-48 pb-32 px-6 bg-white dark:bg-[#0B1A36] border-b border-[#0B1A36]/5 dark:border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-serif text-[#0B1A36] dark:text-white mb-8">{t.title}</h1>
          <div className="w-24 h-1 bg-[#D4AF37] mx-auto mb-12" />
          <p className="text-xl text-[#0B1A36]/80 dark:text-white/80 leading-relaxed mb-6 font-serif italic">{t.bio}</p>
          <p className="text-lg text-[#0B1A36]/60 dark:text-white/60 leading-relaxed mb-12">{t.program}</p>
          <div className="flex flex-col md:flex-row gap-4 justify-center">
            <button className="bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] px-10 py-4 rounded-full uppercase tracking-widest font-bold text-sm shadow-lg hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors">
              {lang === 'FR' ? 'Contacter son équipe' : 'Contact her team'}
            </button>
            <button className="border border-[#0B1A36]/20 dark:border-white/20 text-[#0B1A36] dark:text-white px-10 py-4 rounded-full uppercase tracking-widest font-bold text-sm hover:border-[#D4AF37] transition-colors">
              {lang === 'FR' ? 'Télécharger le Press Kit' : 'Download Press Kit'}
            </button>
          </div>
        </div>
      </div>

      {/* Ritual promo */}
      <div className="py-24 px-6 text-center relative overflow-hidden bg-[#F5F5F0] dark:bg-[#050C1A]">
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6 inline-block">
            {lang === 'FR' ? 'Programme Exclusif' : 'Exclusive Program'}
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-[#0B1A36] dark:text-white mb-6">{t.ritual.title}</h2>
          <p className="text-xl text-[#0B1A36]/70 dark:text-white/70 mb-10 leading-relaxed">{t.ritual.desc}</p>
          <a href={t.ritual.kajabiLink} target="_blank" rel="noopener noreferrer"
            className="inline-block bg-[#D4AF37] text-white px-12 py-5 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:scale-105 transition-transform">
            {t.ritual.cta}
          </a>
          <p className="text-xs text-[#0B1A36]/40 dark:text-white/40 mt-4 uppercase tracking-wider">
            {lang === 'FR' ? 'Paiement sécurisé via Kajabi' : 'Secure payment via Kajabi'}
          </p>
        </div>
      </div>

      {/* Contact form */}
      <div className="py-24 px-6 bg-white dark:bg-[#0B1A36]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-serif text-[#0B1A36] dark:text-white mb-2 text-center">
            {lang === 'FR' ? 'Faire une demande' : 'Submit a request'}
          </h2>
          <p className="text-[#0B1A36]/60 dark:text-white/60 text-center mb-10 italic font-serif">
            {lang === 'FR' ? 'Notre équipe vous répondra dans les plus brefs délais.' : 'Our team will get back to you shortly.'}
          </p>

          {sent ? (
            <div className="text-center py-12 bg-[#D4AF37]/10 rounded-[24px] border border-[#D4AF37]/20">
              <i className="fa-solid fa-check-circle text-[#D4AF37] text-4xl mb-4 block" />
              <h3 className="font-serif text-2xl text-[#0B1A36] dark:text-white mb-2">
                {lang === 'FR' ? 'Demande envoyée!' : 'Request sent!'}
              </h3>
              <p className="text-[#0B1A36]/60 dark:text-white/60">
                {lang === 'FR' ? 'Merci, nous revenons vers vous sous 48h.' : 'Thank you, we\'ll reply within 48h.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {[
                { key: 'name', placeholder: lang === 'FR' ? 'Votre nom' : 'Your name', type: 'text', required: true },
                { key: 'email', placeholder: 'Email', type: 'email', required: true },
                { key: 'organization', placeholder: lang === 'FR' ? 'Organisation / Entreprise' : 'Organization / Company', type: 'text', required: false },
                { key: 'eventType', placeholder: lang === 'FR' ? 'Type d\'événement (conférence, atelier, etc.)' : 'Event type (conference, workshop, etc.)', type: 'text', required: false },
              ].map(({ key, placeholder, type, required }) => (
                <input key={key} type={type} required={required} placeholder={placeholder}
                  value={formData[key as keyof typeof formData]}
                  onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                  className="w-full p-4 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 focus:border-[#D4AF37] outline-none bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white placeholder:text-[#0B1A36]/40 dark:placeholder:text-white/30" />
              ))}
              <textarea required placeholder={lang === 'FR' ? 'Message / Description de l\'événement' : 'Message / Event description'}
                value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })}
                className="w-full p-4 h-36 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 focus:border-[#D4AF37] outline-none resize-none bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white placeholder:text-[#0B1A36]/40 dark:placeholder:text-white/30" />
              <button type="submit" disabled={sending} className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors shadow-lg flex items-center justify-center gap-2">
                {sending ? <i className="fa-solid fa-circle-notch fa-spin" /> : null}
                {lang === 'FR' ? 'Envoyer la demande' : 'Send request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConferencierePage;
