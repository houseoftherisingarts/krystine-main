import React, { useEffect, useState } from 'react';
import { updateMember } from '../../firebase/firestore';
import { getLang, setLang as persistLang } from '../../lib/i18n/lang';
import { useApp } from '../../contexts/AppContext';
import { loginWithEmail, loginWithGoogle, signUpWithEmail, sendPasswordReset } from '../../firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../../firebase';
import { codeRetenu, retenirCode, codeParrainExiste, retenirCodeDepuisUrl } from '../../firebase/parrainage';
import Portail from '../Portail';
import RaisonsCompte from '../compte/RaisonsCompte';
import { useGamification } from '../../contexts/GamificationContext';
// La case « Je ne suis pas un robot ». Le crochet a quitté ce fichier le
// 21 septembre 2026 pour servir aussi à l'extrait, à la musique et à la carte
// de réhabilitation de l'espace membre.
import { RECAPTCHA_SITE_KEY, useRecaptcha } from '../../lib/recaptcha';

type Mode = 'signin' | 'signup' | 'reset';

// Les codes de Firebase (« auth/invalid-credential ») s'affichaient tels quels
// et se touchaient en vain (clics morts relevés en oct. 2026) : chacun reçoit
// une phrase claire qui dit quoi faire.
const messageAuth = (code: string, fr: boolean): string => {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return fr ? 'Le courriel ou le mot de passe ne correspond à aucun compte. Vérifiez-les, ou touchez « Mot de passe oublié ? » plus bas.' : 'The email or password does not match an account. Check them, or tap “Forgot password?” below.';
    case 'auth/email-already-in-use':
      return fr ? 'Un compte existe déjà avec ce courriel : entrez votre mot de passe pour vous connecter.' : 'An account already exists with this email: enter your password to sign in.';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return fr ? 'Cette adresse courriel semble incomplète. Vérifiez-la.' : 'This email address looks incomplete. Please check it.';
    case 'auth/weak-password':
    case 'auth/missing-password':
      return fr ? 'Le mot de passe doit compter au moins six caractères.' : 'The password needs at least six characters.';
    case 'auth/too-many-requests':
      return fr ? 'Trop d’essais d’affilée. Attendez quelques minutes, puis réessayez.' : 'Too many attempts in a row. Wait a few minutes, then try again.';
    case 'auth/network-request-failed':
      return fr ? 'La connexion Internet a coupé. Réessayez dans un instant.' : 'The internet connection dropped. Try again in a moment.';
    default:
      return fr ? 'La connexion a échoué. Réessayez dans un instant.' : 'Sign-in failed. Try again in a moment.';
  }
};

const SignInModal: React.FC = () => {
  const { lang, signInOpen, setSignInOpen } = useApp();
  // Le code de parrain donne des niskas : il disparaît quand le jeu est fermé.
  const gam = useGamification();
  // La fenêtre s'ouvre sur l'inscription : tout le site mène à se créer un
  // compte. Qui en a déjà un bascule vers la connexion d'un lien.
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  // Prérempli par le lien /compte?parrain=CODE, modifiable à la main.
  const [codeParrain, setCodeParrain] = useState(codeRetenu);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const captcha = useRecaptcha(signInOpen && mode === 'signup');
  // À l'ouverture, reprendre le code du lien (/compte?parrain=CODE) s'il y en a un.
  useEffect(() => {
    if (!signInOpen) return;
    retenirCodeDepuisUrl();
    const c = codeRetenu();
    if (c) setCodeParrain(c);
  }, [signInOpen]);

  // « J'ai déjà un compte » ouvre la fenêtre sur la connexion au lieu de
  // l'inscription. Même pont que « krystine:ouvrir-boutique » ailleurs.
  useEffect(() => {
    const ouvrir = () => { setMode('signin'); setSignInOpen(true); };
    window.addEventListener('krystine:connexion', ouvrir);
    return () => window.removeEventListener('krystine:connexion', ouvrir);
  }, [setSignInOpen]);

  // Une page peut dire pourquoi la fenêtre s'ouvre (le paiement, par exemple) :
  // la phrase remplace « Accédez à votre espace membre. » jusqu'à la fermeture.
  const [raison, setRaison] = useState<string | null>(null);
  useEffect(() => {
    const ouvrir = (e: Event) => { setRaison((e as CustomEvent<string>).detail || null); setSignInOpen(true); };
    window.addEventListener('krystine:connexion-raison', ouvrir);
    return () => window.removeEventListener('krystine:connexion-raison', ouvrir);
  }, [setSignInOpen]);

  // La langue du compte, choisie à l'inscription : le site s'ouvre dans cette
  // langue et les infolettres partent dans cette langue. Préréglée sur la
  // langue affichée, changée d'un clic.
  const [langueCompte, setLangueCompte] = useState<'fr' | 'en'>(lang === 'EN' ? 'en' : 'fr');

  const reset = () => { setErr(null); setInfo(null); };

  // Après la création : la langue s'écrit sur le compte, puis le site se
  // recharge dans cette langue si elle diffère de celle affichée.
  const poserLangue = async (uid: string | undefined) => {
    if (!uid) return;
    try { await updateMember(uid, { lang: langueCompte }); } catch { /* le compte se complète plus tard */ }
    if (langueCompte !== getLang()) persistLang(langueCompte);
  };

  const close = () => {
    setSignInOpen(false);
    setEmail(''); setPassword(''); setDisplayName(''); setCodeParrain(codeRetenu());
    setMode('signup'); reset(); setRaison(null);
  };

  // Retient le code pour la réclamation d'après connexion (auth.ts). Un code
  // tapé qui n'existe pas arrête l'inscription au lieu de se perdre en silence.
  const poserCodeParrain = async (): Promise<boolean> => {
    if (mode !== 'signup' || !gam.parrainage) return true;
    const code = codeParrain.trim().toUpperCase();
    if (code && !(await codeParrainExiste(code))) {
      setErr(lang === 'FR' ? 'Ce code de parrain est introuvable. Vérifiez-le ou laissez le champ vide.' : 'This referral code was not found. Check it or leave the field empty.');
      return false;
    }
    retenirCode(code);
    return true;
  };

  const handleGoogle = async () => {
    reset(); setBusy(true);
    try {
      if (!(await poserCodeParrain())) return;
      const cred = await loginWithGoogle();
      // `cred === null` means the popup couldn't open (Safari ITP, blocked
      // popups, etc.) and we fell back to a full-page redirect to Google.
      // Don't close the modal here — the page is about to navigate away,
      // and `handleRedirectResult` (in AppContext) finishes the login when
      // the browser comes back. Showing a quick info line lets the user
      // know what's happening.
      if (cred === null) {
        setInfo(lang === 'FR' ? 'Redirection vers Google…' : 'Redirecting to Google…');
        return; // keep busy=true since we're navigating away
      }
      if (mode === 'signup') await poserLangue(cred.user?.uid);
      close();
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — silent reset, no error message.
      } else {
        setErr(e?.message || 'Google sign-in failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); reset(); setBusy(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email.trim(), password);
        close();
      } else if (mode === 'signup') {
        if (!(await poserCodeParrain())) return;
        if (RECAPTCHA_SITE_KEY) {
          const token = captcha.getToken();
          if (!token) {
            setErr(lang === 'FR' ? 'Cochez la case « Je ne suis pas un robot ».' : 'Please check the "I\'m not a robot" box.');
            setBusy(false);
            return;
          }
          try {
            await httpsCallable(getFunctions(app!, 'us-central1'), 'verifierCaptcha')({ token });
          } catch {
            captcha.resetWidget();
            setErr(lang === 'FR' ? 'La vérification anti-robot a échoué. Réessayez.' : 'Robot check failed. Please try again.');
            setBusy(false);
            return;
          }
        }
        const cred = await signUpWithEmail(email.trim(), password, displayName.trim() || undefined);
        await poserLangue((cred as any)?.user?.uid);
        close();
      } else if (mode === 'reset') {
        await sendPasswordReset(email.trim());
        setInfo(lang === 'FR' ? 'Un courriel de réinitialisation a été envoyé.' : 'Reset email sent.');
      }
    } catch (e: any) {
      const code = e?.code || '';
      setErr(messageAuth(code, lang === 'FR'));
      if (code === 'auth/email-already-in-use') setMode('signin');
    } finally { setBusy(false); }
  };

  if (!signInOpen) return null;

  const titles: Record<Mode, string> = {
    signin: lang === 'FR' ? 'Connexion' : 'Sign in',
    signup: lang === 'FR' ? 'Créer un compte' : 'Create account',
    reset:  lang === 'FR' ? 'Réinitialiser le mot de passe' : 'Reset password',
  };

  return (
    <Portail>
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto overscroll-contain p-4 bg-[#2a2015]/50 backdrop-blur-md" onClick={close}>
      <div className="relative my-auto w-full max-w-md bg-white dark:bg-[#2a2015] rounded-[30px] shadow-2xl border border-[#bb9a5e]/20 p-8 md:p-10" onClick={e => e.stopPropagation()}>
        <button onClick={close} className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center text-[#2a2015]/40 dark:text-white/40 hover:text-[#2a2015] dark:hover:text-white">
          <i className="fa-solid fa-times text-lg" />
        </button>

        <h2 className="font-serif text-3xl text-[#2a2015] dark:text-white mb-2">{titles[mode]}</h2>
        <p className="text-sm text-[#2a2015]/60 dark:text-white/60 mb-6">
          {raison ?? (lang === 'FR' ? 'Accédez à votre espace membre.' : 'Access your member space.')}
        </p>

        {/* Le pourquoi du compte, en création seulement (Krystine, 6 oct. 2026). */}
        {mode === 'signup' && (
          <RaisonsCompte fr={lang === 'FR'} className="-mt-2 mb-6 text-[#2a2015]/80 dark:text-white/80" />
        )}

        {mode === 'signup' && (
          <div className="mb-4">
            <span className="block mb-1.5 text-[10px] uppercase tracking-widest text-[#2a2015]/50 dark:text-white/50">
              {lang === 'FR' ? 'Votre langue' : 'Your language'}
            </span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={lang === 'FR' ? 'Langue du compte' : 'Account language'}>
              {([['fr', 'Français', 'Le site et les lettres en français'], ['en', 'English', 'Site and letters in English']] as const).map(([code, nom, aide]) => (
                <button key={code} type="button" role="radio" aria-checked={langueCompte === code} onClick={() => setLangueCompte(code)}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors ${langueCompte === code ? 'border-[#bb9a5e] bg-[#bb9a5e]/10' : 'border-[#2a2015]/10 dark:border-white/10 bg-[#f6f3ee] dark:bg-white/5 hover:border-[#bb9a5e]/60'}`}>
                  <span className="block text-sm font-bold text-[#2a2015] dark:text-white">{nom}</span>
                  <span className="block text-[11px] text-[#2a2015]/55 dark:text-white/55">{aide}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'signup' && gam.parrainage && (
          <label className="block mb-4">
            <span className="block mb-1.5 text-[10px] uppercase tracking-widest text-[#2a2015]/50 dark:text-white/50">
              {lang === 'FR' ? 'Code de parrain (facultatif)' : 'Referral code (optional)'}
            </span>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={12}
              placeholder={lang === 'FR' ? 'ex. K7A2B9' : 'e.g. K7A2B9'}
              value={codeParrain}
              onChange={e => setCodeParrain(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-xl border border-[#2a2015]/10 dark:border-white/10 bg-[#f6f3ee] dark:bg-white/5 text-[#2a2015] dark:text-white outline-none focus:border-[#bb9a5e] font-mono tracking-[0.2em] placeholder:font-sans placeholder:tracking-normal"
            />
          </label>
        )}

        {mode !== 'reset' && (
          <>
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 bg-white border border-[#2a2015]/10 dark:bg-white/5 dark:border-white/10 text-[#2a2015] dark:text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:border-[#bb9a5e] transition-colors disabled:opacity-50"
            >
              <i className="fa-brands fa-google text-base" />
              {lang === 'FR' ? 'Continuer avec Google' : 'Continue with Google'}
            </button>
            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-[#2a2015]/40 dark:text-white/40">
              <span className="flex-1 h-px bg-[#2a2015]/10 dark:bg-white/10" />
              <span>{lang === 'FR' ? 'ou' : 'or'}</span>
              <span className="flex-1 h-px bg-[#2a2015]/10 dark:bg-white/10" />
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
              className="w-full px-4 py-3 rounded-xl border border-[#2a2015]/10 dark:border-white/10 bg-[#f6f3ee] dark:bg-white/5 text-[#2a2015] dark:text-white outline-none focus:border-[#bb9a5e]"
            />
          )}
          <input
            type="email"
            required
            autoComplete="email"
            placeholder={lang === 'FR' ? 'Courriel' : 'Email'}
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#2a2015]/10 dark:border-white/10 bg-[#f6f3ee] dark:bg-white/5 text-[#2a2015] dark:text-white outline-none focus:border-[#bb9a5e]"
          />
          {mode !== 'reset' && (
            <input
              type="password"
              required
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={lang === 'FR' ? 'Mot de passe' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#2a2015]/10 dark:border-white/10 bg-[#f6f3ee] dark:bg-white/5 text-[#2a2015] dark:text-white outline-none focus:border-[#bb9a5e]"
            />
          )}
          {mode === 'signup' && RECAPTCHA_SITE_KEY && (
            <div ref={captcha.boxRef} className="flex justify-center pt-1" />
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors disabled:opacity-50"
          >
            {busy
              ? (lang === 'FR' ? 'Chargement…' : 'Loading…')
              : mode === 'signin' ? (lang === 'FR' ? 'Se connecter' : 'Sign in')
              : mode === 'signup' ? (lang === 'FR' ? "S'inscrire" : 'Sign up')
              : (lang === 'FR' ? 'Envoyer le lien' : 'Send link')}
          </button>
        </form>

        {err && <p role="alert" className="mt-4 text-[0.8rem] leading-relaxed text-[#83322b] dark:text-red-300">{err}</p>}
        {info && <p className="mt-4 text-xs text-green-600 font-mono">{info}</p>}

        <div className="mt-6 flex flex-col gap-2 text-xs text-center text-[#2a2015]/60 dark:text-white/60">
          {mode === 'signin' && <>
            <button onClick={() => { reset(); setMode('signup'); }} className="hover:text-[#7d6330]">
              {lang === 'FR' ? 'Pas de compte ? S\'inscrire' : 'No account? Sign up'}
            </button>
            <button onClick={() => { reset(); setMode('reset'); }} className="hover:text-[#7d6330]">
              {lang === 'FR' ? 'Mot de passe oublié ?' : 'Forgot password?'}
            </button>
          </>}
          {mode === 'signup' && <button onClick={() => { reset(); setMode('signin'); }} className="hover:text-[#7d6330]">
            {lang === 'FR' ? 'Déjà un compte ? Se connecter' : 'Already have an account? Sign in'}
          </button>}
          {mode === 'reset' && <button onClick={() => { reset(); setMode('signin'); }} className="hover:text-[#7d6330]">
            {lang === 'FR' ? 'Retour à la connexion' : 'Back to sign in'}
          </button>}
        </div>
      </div>
    </div>
    </Portail>
  );
};

export default SignInModal;
