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
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-white dark:bg-[#2E1A14]">
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#B8532F]/15 border border-[#B8532F]/30 flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-triangle-exclamation text-[#B8532F] text-xl" />
          </div>
          <h1 className="text-3xl font-serif text-[#3A251E] dark:text-white mb-3">
            Un instant…
          </h1>
          <p className="text-sm text-[#3A251E]/70 dark:text-white/70 mb-8 leading-relaxed">
            Une erreur est survenue lors du chargement de cette page. Rafraîchir la page devrait tout remettre en ordre.
            <br />
            <span className="italic">An error occurred. Refreshing should fix it.</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="bg-[#3A251E] dark:bg-[#B8532F] text-white dark:text-[#3A251E] px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-[#B8532F] hover:text-[#3A251E] transition-colors"
            >
              Rafraîchir
            </button>
            <a
              href="/accueil"
              className="border border-[#3A251E]/20 dark:border-white/20 text-[#3A251E] dark:text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:border-[#B8532F] hover:text-[#B8532F] transition-colors"
            >
              Accueil
            </a>
          </div>
        </div>
      </div>
    );
  }
}
