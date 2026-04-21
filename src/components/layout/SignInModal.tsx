import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { loginWithEmail, loginWithGoogle, signUpWithEmail, sendPasswordReset } from '../../firebase/auth';

type Mode = 'signin' | 'signup' | 'reset';

const SignInModal: React.FC = () => {
  const { lang, signInOpen, setSignInOpen } = useApp();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reset = () => { setErr(null); setInfo(null); };

  const close = () => {
    setSignInOpen(false);
    setEmail(''); setPassword(''); setDisplayName('');
    setMode('signin'); reset();
  };

  const handleGoogle = async () => {
    reset(); setBusy(true);
    try { await loginWithGoogle(); close(); }
    catch (e: any) { setErr(e?.message || 'Google sign-in failed'); }
    finally { setBusy(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setBusy(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email.trim(), password);
        close();
      } else if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
        close();
      } else if (mode === 'reset') {
        await sendPasswordReset(email.trim());
        setInfo(lang === 'FR' ? 'Un courriel de réinitialisation a été envoyé.' : 'Reset email sent.');
      }
    } catch (e: any) {
      setErr(e?.code || e?.message || 'Auth failed');
    } finally { setBusy(false); }
  };

  if (!signInOpen) return null;

  const titles: Record<Mode, string> = {
    signin: lang === 'FR' ? 'Connexion' : 'Sign in',
    signup: lang === 'FR' ? 'Créer un compte' : 'Create account',
    reset:  lang === 'FR' ? 'Réinitialiser le mot de passe' : 'Reset password',
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#0B1A36]/50 backdrop-blur-md" onClick={close}>
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B1A36] rounded-[30px] shadow-2xl border border-[#D4AF37]/20 p-8 md:p-10" onClick={e => e.stopPropagation()}>
        <button onClick={close} className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#0B1A36]/40 dark:text-white/40 hover:text-[#0B1A36] dark:hover:text-white">
          <i className="fa-solid fa-times text-lg" />
        </button>

        <h2 className="font-serif text-3xl text-[#0B1A36] dark:text-white mb-2">{titles[mode]}</h2>
        <p className="text-sm text-[#0B1A36]/60 dark:text-white/60 mb-6">
          {lang === 'FR' ? 'Accédez à votre espace client Inspirata.' : 'Access your Inspirata client space.'}
        </p>

        {mode !== 'reset' && (
          <>
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 bg-white border border-[#0B1A36]/10 dark:bg-white/5 dark:border-white/10 text-[#0B1A36] dark:text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:border-[#D4AF37] transition-colors disabled:opacity-50"
            >
              <i className="fa-brands fa-google text-base" />
              {lang === 'FR' ? 'Continuer avec Google' : 'Continue with Google'}
            </button>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[#0B1A36]/40 dark:text-white/40">
              <span className="flex-1 h-px bg-[#0B1A36]/10 dark:bg-white/10" />
              <span>{lang === 'FR' ? 'ou' : 'or'}</span>
              <span className="flex-1 h-px bg-[#0B1A36]/10 dark:bg-white/10" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              placeholder={lang === 'FR' ? 'Nom' : 'Name'}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
            />
          )}
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={lang === 'FR' ? 'Courriel' : 'Email'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
          />
          {mode !== 'reset' && (
            <input
              type="password"
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={lang === 'FR' ? 'Mot de passe' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#0B1A36]/10 dark:border-white/10 bg-[#F5F5F0] dark:bg-white/5 text-[#0B1A36] dark:text-white outline-none focus:border-[#D4AF37]"
            />
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#0B1A36] dark:bg-[#D4AF37] text-white dark:text-[#0B1A36] py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#D4AF37] hover:text-[#0B1A36] transition-colors disabled:opacity-50"
          >
            {busy
              ? (lang === 'FR' ? 'Chargement…' : 'Loading…')
              : mode === 'signin' ? (lang === 'FR' ? 'Se connecter' : 'Sign in')
              : mode === 'signup' ? (lang === 'FR' ? "S'inscrire" : 'Sign up')
              : (lang === 'FR' ? 'Envoyer le lien' : 'Send link')}
          </button>
        </form>

        {err && <p className="mt-4 text-xs text-red-500 font-mono">{err}</p>}
        {info && <p className="mt-4 text-xs text-green-600 font-mono">{info}</p>}

        <div className="mt-6 flex flex-col gap-2 text-xs text-center text-[#0B1A36]/60 dark:text-white/60">
          {mode === 'signin' && <>
            <button onClick={() => { reset(); setMode('signup'); }} className="hover:text-[#D4AF37]">
              {lang === 'FR' ? 'Pas de compte ? S\'inscrire' : 'No account? Sign up'}
            </button>
            <button onClick={() => { reset(); setMode('reset'); }} className="hover:text-[#D4AF37]">
              {lang === 'FR' ? 'Mot de passe oublié ?' : 'Forgot password?'}
            </button>
          </>}
          {mode === 'signup' && <button onClick={() => { reset(); setMode('signin'); }} className="hover:text-[#D4AF37]">
            {lang === 'FR' ? 'Déjà un compte ? Se connecter' : 'Already have an account? Sign in'}
          </button>}
          {mode === 'reset' && <button onClick={() => { reset(); setMode('signin'); }} className="hover:text-[#D4AF37]">
            {lang === 'FR' ? 'Retour à la connexion' : 'Back to sign in'}
          </button>}
        </div>
      </div>
    </div>
  );
};

export default SignInModal;
