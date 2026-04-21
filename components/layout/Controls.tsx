
import React from 'react';
import { Sun, Moon, Type, Volume2, VolumeX } from 'lucide-react';
import { Language, Theme } from '../../types';

interface ControlsProps {
  lang: Language;
  setLang: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  scale: number;
  setScale: (s: number) => void;
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  volume: number;
  setVolume: (v: number) => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  lang, setLang, theme, setTheme, scale, setScale, isMusicPlaying, toggleMusic, volume, setVolume
}) => {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Music Toggle & Volume */}
      <div className="flex items-center gap-1">
        <button 
          onClick={toggleMusic}
          className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-copper-bruni/10 transition-all ${isMusicPlaying ? 'text-copper-bruni' : 'text-ink-sureau/40 dark:text-paper/40'}`}
          title={isMusicPlaying ? "Mute Music" : "Unmute Music"}
        >
          {isMusicPlaying ? <Volume2 size={16} className={isMusicPlaying ? 'animate-pulse' : ''} /> : <VolumeX size={16} />}
        </button>
        
        {isMusicPlaying && (
          <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-left-2 duration-300">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-12 sm:w-16 h-1 bg-ink-sureau/10 dark:bg-paper/20 rounded-lg appearance-none cursor-pointer accent-copper-bruni"
              title="Volume"
            />
          </div>
        )}
      </div>

      <div className="w-px h-3 bg-ink-sureau/10 dark:bg-paper/20"></div>

      {/* Language */}
      <button 
        onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-copper-bruni/10 text-ink-sureau dark:text-paper transition-all"
        title="Switch Language"
      >
        <span className="font-serif font-medium text-xs tracking-wider">{lang.toUpperCase()}</span>
      </button>

      <div className="w-px h-3 bg-ink-sureau/10 dark:bg-paper/20"></div>

      {/* Theme */}
      <button 
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-copper-bruni/10 text-ink-sureau dark:text-paper transition-all"
        title="Toggle Theme"
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div className="w-px h-3 bg-ink-sureau/10 dark:bg-paper/20 hidden sm:block"></div>

      {/* Font Scale - Desktop only mainly to save space on mobile */}
      <div className="hidden sm:flex items-center gap-2 px-2">
        <Type size={14} className="text-ink-sureau/60 dark:text-paper/60" />
        <input 
          type="range" 
          min="1" 
          max="1.25" 
          step="0.05"
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="w-16 h-1 bg-ink-sureau/10 dark:bg-paper/20 rounded-lg appearance-none cursor-pointer accent-copper-bruni"
        />
      </div>
    </div>
  );
};
