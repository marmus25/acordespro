import React from 'react';
import { StrumPreset } from '../utils/strumPresets';

const Down = ({ cls }: { cls?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls ?? 'w-5 h-5'}><path d="M12 5v14m-7-7 7 7 7-7"/></svg>;
const Up = ({ cls }: { cls?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls ?? 'w-5 h-5'}><path d="M12 19V5m-7 7 7-7 7 7"/></svg>;
const Rest = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M5 12h14"/></svg>;

interface Props {
  preset: StrumPreset;
  animate?: boolean;
  activeIdx?: number | null;
}

export const StrumVisualPlay: React.FC<Props> = ({ preset, animate = false, activeIdx = null }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
      {preset.ts} · {preset.name}
    </span>
    <div className="flex gap-1.5 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700/50">
      {preset.pattern.map((stroke, i) => {
        const isActive = activeIdx === i;
        const base = 'flex flex-col items-center justify-center w-7 h-9 transition-all duration-100';
        const activeClass = isActive ? 'scale-125' : '';
        const animClass = animate && stroke !== '-' ? 'animate-bounce' : '';
        const animStyle = animate ? { animationDelay: `${i * 0.12}s`, animationDuration: '1.2s' } : {};
        return (
          <div key={i} className={`${base} ${activeClass}`}>
            {stroke === 'D' || stroke === 'DL'
              ? <span className={`text-teal-400 ${animClass}`} style={animStyle}><Down cls="w-5 h-5" /></span>
              : stroke === 'U'
              ? <span className={`text-blue-400 ${animClass}`} style={animStyle}><Up cls="w-5 h-5" /></span>
              : <span className="text-slate-600"><Rest /></span>}
            <div className={`w-1 h-1 rounded-full mt-1 ${isActive ? 'bg-teal-400' : 'bg-slate-700'}`} />
          </div>
        );
      })}
    </div>
  </div>
);
