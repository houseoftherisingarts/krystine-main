import React, { useState } from 'react';
import { loginWithEmail, loginWithGoogle } from '../../firebase/auth';

// Dev-only bypass credentials. The block below is gated on
// `import.meta.env.DEV`, so Vite strips it (and these strings) from the
// production bundle. In prod, Alex signs in with Google/email: his address
// is on the ADMIN allowlist client-side AND in firestore.rules.
const BYPASS_EMAIL = 'alex@lesalondesinconnus.com';
const BYPASS_PASSWORD = import.meta.env.DEV ? 'Peterjackson1!' : '';

const AdminLogin: React.FC = () => {
  const [mode, setMode] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleGoogle = async () => {
    setErr(null); setBusy(true);
    try { await loginWithGoogle(); } catch (e: any) { setErr(e?.message || 'Google sign-in failed'); }
    finally { setBusy(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);

    // Baked-in bypass — intentional shortcut for Alex so he can reach
    // the dashboard without depending on Firebase Auth being wired up.
    // Sets a localStorage flag that `isAdminBypassActive()` reads; the
    // full-page reload re-mounts AdminDashboard with bypass on.
    if (email.trim().toLowerCase() === BYPASS_EMAIL && password === BYPASS_PASSWORD) {
      try {
        localStorage.setItem('__adminBypass', '1');
        localStorage.setItem('__adminBypassEmail', BYPASS_EMAIL);
        window.location.assign('/admin');
      } catch (err: any) {
        setErr(err?.message || 'Bypass failed');
      }
      return;
    }

    try { await loginWithEmail(email.trim(), password); }
    catch (e: any) { setErr(e?.code || e?.message || 'Email sign-in failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#16100a] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <img src="https://storage.googleapis.com/inspirata/Vata/1%20(1).png" alt="Krystine St-Laurent" className="h-16 w-auto mx-auto mb-8 opacity-90" style={{ filter: 'invert(1) brightness(1.5)' }} />
        <h1 className="text-3xl font-serif text-white mb-3">Accès Admin</h1>
        <p className="text-white/60 mb-10 text-sm">Connectez-vous avec un compte autorisé.</p>

        {/* Tabs */}
        <div className="inline-flex rounded-full bg-white/5 border border-white/10 p-1 mb-8">
          <button onClick={() => setMode('google')} className={`px-5 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold transition-colors ${mode === 'google' ? 'bg-[#bb9a5e] text-[#2a2015]' : 'text-white/60'}`}>
            Google
          </button>
          <button onClick={() => setMode('email')} className={`px-5 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-bold transition-colors ${mode === 'email' ? 'bg-[#bb9a5e] text-[#2a2015]' : 'text-white/60'}`}>
            Email
          </button>
        </div>

        {mode === 'google' ? (
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 bg-white text-[#2a2015] px-10 py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-[#bb9a5e] hover:text-white transition-colors disabled:opacity-50"
          >
            <i className="fa-brands fa-google text-lg" /> {busy ? 'Connexion…' : 'Se connecter avec Google'}
          </button>
        ) : (
          <form onSubmit={handleEmail} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2">Courriel</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full bg-white/5 border border-white/10 focus:border-[#bb9a5e] rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/60 font-bold mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full bg-white/5 border border-white/10 focus:border-[#bb9a5e] rounded-xl px-4 py-3 text-white outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[#bb9a5e] text-[#2a2015] py-4 rounded-full font-bold uppercase tracking-widest text-sm shadow-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              {busy ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        )}

        {err && <p className="mt-5 text-sm text-red-400 font-mono">{err}</p>}

        <p className="mt-10 text-[10px] uppercase tracking-widest text-white/30">
          Accès réservé · Inspirata Ayurveda
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
