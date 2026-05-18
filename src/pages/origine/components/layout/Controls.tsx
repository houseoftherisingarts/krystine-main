import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Theme } from '../../types';

interface ControlsProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const Controls: React.FC<ControlsProps> = ({ 
  theme, setTheme
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Theme */}
      <button 
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        className="h-10 rounded-full flex items-center justify-center hover:bg-copper-honey/10 text-ink-sureau dark:text-paper transition-all px-4 gap-2"
        title="Toggle Theme"
      >
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        <span className="font-serif text-sm whitespace-nowrap">{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>
      </button>
    </div>
  );
};