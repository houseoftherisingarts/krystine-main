import React from 'react';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<Props, State> {
  // Explicit declarations — this repo's tsconfig has useDefineForClassFields:false,
  // which can prevent TS from inferring inherited React.Component members.
  declare props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface in dev console; a real monitoring client (Sentry, etc.) would hook in here.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-[#16100a]">
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#bb9a5e]/15 border border-[#bb9a5e]/30 flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-triangle-exclamation text-[#7d6330] text-xl" />
          </div>
          <h1 className="text-3xl font-serif text-[#2a2015] dark:text-white mb-3">
            Un instant…
          </h1>
          <p className="text-sm text-[#2a2015]/70 dark:text-white/70 mb-8 leading-relaxed">
            Une erreur est survenue lors du chargement de cette page. Rafraîchir la page devrait tout remettre en ordre.
            <br />
            <span className="italic">An error occurred. Refreshing should fix it.</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-[#2a2015] dark:bg-[#bb9a5e] text-white dark:text-[#2a2015] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#bb9a5e] hover:text-[#2a2015] transition-colors"
            >
              Rafraîchir
            </button>
            <a
              href="/accueil"
              className="border border-[#2a2015]/20 dark:border-white/20 text-[#2a2015] dark:text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:border-[#bb9a5e] hover:text-[#7d6330] transition-colors"
            >
              Accueil
            </a>
          </div>
        </div>
      </div>
    );
  }
}
