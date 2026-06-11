import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChordShape } from '../utils/chordDiagrams';
import { playStrum } from '../utils/audio';

type Stroke = 'D' | 'U' | '-';

const PATTERNS: { name: string; pattern: Stroke[]; timing: string[] }[] = [
  { name: 'Básico',  pattern: ['D','D','D','D'],               timing: ['1','2','3','4'] },
  { name: 'Balada',  pattern: ['D','-','D','U','D','U','-','U'], timing: ['1','-','2','y','3','y','-','y'] },
  { name: 'Folk',    pattern: ['D','U','D','U','D','U','D','U'], timing: ['1','y','2','y','3','y','4','y'] },
  { name: 'Tinku',   pattern: ['D','-','D','U','D','-','D','U'], timing: ['Voy','-','Co','rro','Voy','-','Co','rro'] },
  { name: 'Rock',    pattern: ['D','D','-','D','U','-','U','-'], timing: ['1','2','-','3','y','-','4','-'] },
];

const toAudioFrets = (shape: ChordShape): (number | 'x' | 'o')[] =>
  shape.frets.map(f => f === -1 ? 'x' : f === 0 ? 'o' : f as number);

interface Props {
  activeChord: string | null;
  chordShape: ChordShape | null;
  onClose: () => void;
}

export const PracticePanel: React.FC<Props> = ({ activeChord, chordShape, onClose }) => {
  const [patternIdx, setPatternIdx] = useState(0);
  const [bpm, setBpm] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStroke, setActiveStroke] = useState(-1);

  const timerRef = useRef<number | null>(null);
  const strokeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const bpmRef = useRef(bpm);
  const shapeRef = useRef(chordShape);
  const patternRef = useRef(PATTERNS[patternIdx].pattern);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { shapeRef.current = chordShape; }, [chordShape]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveStroke(-1);
    strokeRef.current = 0;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    patternRef.current = PATTERNS[patternIdx].pattern;
    stop();
  }, [patternIdx, stop]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const tick = () => {
    if (!isPlayingRef.current) return;
    const p = patternRef.current;
    setActiveStroke(strokeRef.current);
    if (shapeRef.current) playStrum(p[strokeRef.current], toAudioFrets(shapeRef.current));
    strokeRef.current = (strokeRef.current + 1) % p.length;
    timerRef.current = window.setTimeout(tick, 30000 / bpmRef.current);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stop();
    } else {
      strokeRef.current = 0;
      isPlayingRef.current = true;
      setIsPlaying(true);
      tick();
    }
  };

  const pattern = PATTERNS[patternIdx].pattern;
  const timing = PATTERNS[patternIdx].timing;

  // Compact chord diagram SVG
  const shape = chordShape;
  let diagramEl: React.ReactNode;
  if (!shape) {
    diagramEl = (
      <div className="flex flex-col items-center justify-center shrink-0 text-gray-400 dark:text-gray-500 text-center" style={{ width: 56 }}>
        <span className="text-xl">🎸</span>
        <span className="text-[9px] mt-0.5 leading-tight">Toca un<br/>acorde</span>
      </div>
    );
  } else {
    const padL = 9, padT = 16, strSp = 9, fretSp = 10, nFrets = 4;
    const W = padL * 2 + strSp * 5;
    const H = padT + nFrets * fretSp + 6;
    const sx = (s: number) => padL + s * strSp;
    const fy = (row: number) => padT + row * fretSp;
    const dotCY = (row: number) => fy(row) - fretSp / 2;
    const toRow = (fret: number) => fret - shape.baseFret + 1;
    diagramEl = (
      <div className="flex flex-col items-center shrink-0">
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-none mb-0.5">{activeChord}</span>
        {shape.baseFret > 1 && (
          <span className="text-[8px] text-gray-500 dark:text-gray-400 leading-none mb-0.5">Tr.{shape.baseFret}</span>
        )}
        <svg width={W} height={H} className="text-gray-800 dark:text-gray-200" overflow="visible">
          {shape.baseFret === 1 && <rect x={sx(0)} y={fy(0)-2} width={sx(5)-sx(0)} height={2.5} rx={1} fill="currentColor" />}
          {[0,1,2,3,4,5].map(s => <line key={s} x1={sx(s)} y1={fy(0)} x2={sx(s)} y2={fy(nFrets)} stroke="currentColor" strokeWidth={0.75} />)}
          {Array.from({length: nFrets+1}, (_,i) => <line key={i} x1={sx(0)} y1={fy(i)} x2={sx(5)} y2={fy(i)} stroke="currentColor" strokeWidth={0.75} />)}
          {shape.frets.map((fret, s) => {
            if (fret === 0) return <text key={s} x={sx(s)} y={fy(0)-2} textAnchor="middle" fontSize={6} fill="currentColor">○</text>;
            if (fret === -1) return <text key={s} x={sx(s)} y={fy(0)-2} textAnchor="middle" fontSize={6} fill="currentColor">×</text>;
            return null;
          })}
          {shape.barre && (
            <rect
              x={sx(shape.barre.from)-3} y={dotCY(toRow(shape.barre.fret))-3.5}
              width={sx(shape.barre.to)-sx(shape.barre.from)+6} height={7} rx={3.5}
              fill="currentColor"
            />
          )}
          {shape.frets.map((fret, s) => {
            if (fret <= 0) return null;
            const row = toRow(fret);
            if (row < 1 || row > nFrets) return null;
            if (shape.barre && fret === shape.barre.fret && s >= shape.barre.from && s <= shape.barre.to) return null;
            return <circle key={s} cx={sx(s)} cy={dotCY(row)} r={3.5} fill="currentColor" />;
          })}
        </svg>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 sm:gap-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800 print-hidden"
      style={{ overflowX: 'auto', scrollbarWidth: 'none' }}
    >
      {/* Chord diagram */}
      {diagramEl}

      <div className="w-px self-stretch bg-emerald-200 dark:bg-emerald-700 shrink-0" />

      {/* Pattern selector + cells */}
      <div className="flex flex-col gap-1 shrink-0">
        <div className="flex gap-1">
          {PATTERNS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPatternIdx(i)}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors leading-none ${
                i === patternIdx
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {pattern.map((stroke, i) => {
            const isActive = activeStroke === i;
            return (
              <div key={i} className="flex flex-col items-center" style={{ minWidth: 22 }}>
                <span className={`text-[8px] font-bold leading-none mb-0.5 transition-all ${
                  isActive ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-400'
                }`}>
                  {timing[i]}
                </span>
                <div className={`w-5 h-6 flex items-center justify-center rounded text-xs font-bold border transition-all ${
                  isActive ? 'ring-2 ring-emerald-400 scale-110' : ''
                } ${
                  stroke === 'D'
                    ? (isActive ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 text-emerald-600 dark:text-emerald-300')
                    : stroke === 'U'
                    ? (isActive ? 'bg-purple-500 border-purple-400 text-white' : 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 text-purple-600 dark:text-purple-300')
                    : (isActive ? 'bg-gray-400 border-gray-300 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400')
                }`}>
                  {stroke === 'D' ? '↓' : stroke === 'U' ? '↑' : '—'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-px self-stretch bg-emerald-200 dark:bg-emerald-700 shrink-0" />

      {/* BPM + Play */}
      <div className="shrink-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 w-14 shrink-0">{bpm} BPM</span>
          <input
            type="range" min={40} max={160} step={5} value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            className="w-20 accent-emerald-600"
          />
        </div>
        <button
          onClick={togglePlay}
          className={`px-4 py-1.5 rounded-lg font-bold text-sm transition-colors ${
            isPlaying
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          {isPlaying ? '■ Detener' : '▶ Practicar'}
        </button>
      </div>

      <button
        onClick={() => { stop(); onClose(); }}
        className="ml-auto shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 text-sm leading-none"
        title="Cerrar modo práctica"
      >
        ✕
      </button>
    </div>
  );
};
