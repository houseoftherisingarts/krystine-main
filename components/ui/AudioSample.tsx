import React, { useState } from 'react';
import { ContentText } from '../../types';
import { Play, Pause, Volume2 } from 'lucide-react';

export const AudioSample: React.FC<{ content: ContentText['audio'] }> = ({ content }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="glass-panel p-8 md:p-12 rounded-[2rem] relative overflow-hidden group">
          
          {/* Ambient Glow */}
          <div className={`absolute top-1/2 left-1/4 w-40 h-40 bg-copper-glow/30 blur-[60px] rounded-full transition-opacity duration-1000 ${isPlaying ? 'opacity-100 animate-pulse' : 'opacity-30'}`}></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Play Button */}
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-20 h-20 flex-shrink-0 rounded-full bg-ink-sureau dark:bg-paper text-paper dark:text-ink-sureau flex items-center justify-center shadow-xl hover:scale-105 transition-all duration-300"
            >
              {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
            </button>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-2 text-copper-bruni text-xs font-bold tracking-widest uppercase">
                <Volume2 size={12} />
                {isPlaying ? 'Now Playing' : 'Audio Preview'}
              </div>
              <h3 className="text-2xl font-serif text-ink-sureau dark:text-paper">
                {content.title}
              </h3>
              <p className="text-ink-sureau/60 dark:text-paper/60 text-sm">
                {content.subtitle}
              </p>
              
              {/* Fake Waveform Visual */}
              <div className="flex items-center justify-center md:justify-start gap-1 h-8 pt-2">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 bg-copper-bruni/40 rounded-full transition-all duration-300 ${isPlaying ? 'animate-[breathe_1s_ease-in-out_infinite]' : 'h-1'}`}
                    style={{ 
                      height: isPlaying ? `${Math.random() * 24 + 4}px` : '4px',
                      animationDelay: `${i * 0.05}s` 
                    }}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="hidden md:block text-xs font-mono text-ink-sureau/40 dark:text-paper/40">
              02:14
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};