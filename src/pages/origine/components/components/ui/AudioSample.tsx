import React, { useState, useRef, useEffect } from 'react';
import { ContentData } from '../../../types';
import { Play, Pause, Volume2, RotateCcw, RotateCw } from 'lucide-react';

export const AudioSample: React.FC<{ content: ContentData['audio'] & { url: string }; onPlayStateChange?: (isPlaying: boolean) => void }> = ({ content, onPlayStateChange }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const setAudioData = () => {
        setDuration(audio.duration);
        setCurrentTime(audio.currentTime);
      }

      const setAudioTime = () => setCurrentTime(audio.currentTime);

      audio.addEventListener('loadeddata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);

      return () => {
        audio.removeEventListener('loadeddata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
      }
    }
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    if (newIsPlaying) {
      audio.play();
    } else {
      audio.pause();
    }
    if (onPlayStateChange) {
      onPlayStateChange(newIsPlaying);
    }
  };

  const skipTime = (seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime += seconds;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-[#8B5A2B] via-[#AC7A4D] to-[#6F4324] text-paper p-8 md:p-12 rounded-[2rem] relative overflow-hidden group shadow-2xl border border-white/10">
          
          {/* Ambient Glow */}
          <div className={`absolute top-1/2 left-1/4 w-40 h-40 bg-white/20 blur-[60px] rounded-full transition-opacity duration-1000 ${isPlaying ? 'opacity-100 animate-pulse' : 'opacity-30'}`}></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Controls Section */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <button 
                onClick={() => skipTime(-10)}
                className="p-2 rounded-full text-paper/70 hover:text-paper hover:bg-white/10 transition-colors"
                aria-label="Reculer de 10 secondes"
              >
                <RotateCcw size={20} />
              </button>

              <button 
                onClick={togglePlay}
                className="w-20 h-20 flex-shrink-0 rounded-full bg-gradient-to-br from-[#FDFBF5] to-[#E2D9CE] text-[#6F4324] flex items-center justify-center shadow-xl hover:scale-105 transition-all duration-300 border border-white/50"
              >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
              </button>

              <button 
                onClick={() => skipTime(10)}
                className="p-2 rounded-full text-paper/70 hover:text-paper hover:bg-white/10 transition-colors"
                aria-label="Avancer de 10 secondes"
              >
                <RotateCw size={20} />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2 w-full">
              <div className="flex items-center justify-center md:justify-start gap-2 text-paper/90 text-xs font-bold tracking-widest uppercase">
                <Volume2 size={12} />
                {isPlaying ? 'Lecture en cours' : 'Extrait Audio'}
              </div>
              <h3 className="text-2xl font-serif text-paper">
                {content.title}
              </h3>
              <p className="text-paper/70 text-sm">
                {content.subtitle}
              </p>
              
              {/* Timeline & Waveform */}
              <div className="flex flex-col gap-2 pt-2 w-full">
                 {/* Fake Waveform Visual */}
                <div className="flex items-center justify-center md:justify-start gap-1 h-8 opacity-50">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 bg-paper/40 rounded-full transition-all duration-300 ${isPlaying ? 'animate-[breathe_1s_ease-in-out_infinite]' : 'h-1'}`}
                      style={{ 
                        height: isPlaying ? `${Math.random() * 24 + 4}px` : '4px',
                        animationDelay: `${i * 0.05}s` 
                      }}
                    ></div>
                  ))}
                </div>

                {/* Interactive Timeline */}
                <div className="flex items-center gap-3 text-xs font-mono text-paper/50 w-full">
                  <span className="w-10 text-right">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-paper/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-paper"
                  />
                  <span className="w-10">{formatTime(duration)}</span>
                </div>
              </div>
            </div>
          </div>
          <audio 
            ref={audioRef} 
            src={content.url} 
            onEnded={() => {
              setIsPlaying(false);
              if (onPlayStateChange) onPlayStateChange(false);
            }} 
          />
        </div>
      </div>
    </div>
  );
};