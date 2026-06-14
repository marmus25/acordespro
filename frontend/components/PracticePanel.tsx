import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChordShape } from '../utils/chordDiagrams';
import { playStrum } from '../utils/audio';
import {
  Stroke, TimeSignature, ALL_PRESETS, TIME_SIGNATURES,
  loadCustomPresets, saveCustomPreset, deleteCustomPreset, CustomPreset,
  savePracticePref, loadPracticePref,
} from '../utils/strumPresets';

const toAudioFrets = (shape: ChordShape): (number | 'x' | 'o')[] =>
  shape.frets.map(f => f === -1 ? 'x' : f === 0 ? 'o' : f as number);


const NEXT: Record<Stroke, Stroke> = { 'D': 'U', 'U': '-', '-': 'D', 'DL': 'U' };
const MEASURES_OPTIONS = [1, 2, 3, 4];

interface Props {
  activeChord: string | null;
  chordShape: ChordShape | null;
  onClose: () => void;
  hideClose?: boolean;
  hidePresets?: boolean;
  variant?: 'light' | 'dark';
  noDiagram?: boolean;
  onNextChord?: () => void;
  onPlayChange?: (playing: boolean) => void;
  onRestart?: () => void;
  autoStart?: boolean;
  sharedTs?: TimeSignature;
  sharedPresetIdx?: number;
  onPresetChange?: (ts: TimeSignature, idx: number) => void;
  measuresOverride?: number;
  onMeasuresChange?: (n: number) => void;
}

export const PracticePanel: React.FC<Props> = ({
  activeChord, chordShape, onClose, hideClose = false, hidePresets = false, variant = 'light', noDiagram = false,
  onNextChord, onPlayChange, onRestart, autoStart,
  sharedTs, sharedPresetIdx, onPresetChange,
  measuresOverride, onMeasuresChange,
}) => {
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => loadCustomPresets());

  const [selectedTs, setSelectedTs] = useState<TimeSignature>(() => {
    if (sharedTs) return sharedTs;
    return loadPracticePref()?.ts ?? '4/4';
  });

  const [presetIdx, setPresetIdx] = useState<number>(() => {
    if (sharedPresetIdx !== undefined) return sharedPresetIdx;
    const pref = loadPracticePref();
    if (!pref) return 0;
    const customs = loadCustomPresets();
    const allForTs = [...ALL_PRESETS.filter(p => p.ts === pref.ts), ...customs.filter(p => p.ts === pref.ts)];
    const idx = allForTs.findIndex(p => p.name === pref.name);
    return idx >= 0 ? idx : 0;
  });

  const [customPattern, setCustomPattern] = useState<Stroke[]>(ALL_PRESETS[0].pattern);
  const [editMode, setEditMode] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [bpm, setBpm] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStroke, setActiveStroke] = useState(-1);
  const [measuresPerChord, setMeasuresPerChord] = useState(2);
  const [measuresDone, setMeasuresDone] = useState(0);

  const timerRef = useRef<number | null>(null);
  const strokeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const bpmRef = useRef(bpm);
  const shapeRef = useRef(chordShape);
  const patternRef = useRef<Stroke[]>(ALL_PRESETS[0].pattern);
  const measuresPerChordRef = useRef(measuresPerChord);
  const measuresDoneRef = useRef(0);
  const onNextChordRef = useRef(onNextChord);
  const onPlayChangeRef = useRef(onPlayChange);

  const filteredPresets = useMemo(
    () => [...ALL_PRESETS.filter(p => p.ts === selectedTs), ...customPresets.filter(p => p.ts === selectedTs)],
    [selectedTs, customPresets]
  );
  const currentPreset = filteredPresets[presetIdx] ?? filteredPresets[0];

  // Sincronizar desde el padre (cuando el otro panel cambia la selección)
  useEffect(() => { if (sharedTs !== undefined) setSelectedTs(sharedTs); }, [sharedTs]);
  useEffect(() => { if (sharedPresetIdx !== undefined) setPresetIdx(sharedPresetIdx); }, [sharedPresetIdx]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { shapeRef.current = chordShape; }, [chordShape]);
  useEffect(() => { measuresPerChordRef.current = measuresPerChord; }, [measuresPerChord]);
  useEffect(() => { onNextChordRef.current = onNextChord; }, [onNextChord]);
  useEffect(() => { onPlayChangeRef.current = onPlayChange; }, [onPlayChange]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveStroke(-1);
    strokeRef.current = 0;
    measuresDoneRef.current = 0;
    setMeasuresDone(0);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    onPlayChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    if (!editMode) {
      const p = currentPreset.pattern;
      setCustomPattern(p);
      patternRef.current = p;
      // Clamp stroke to new pattern length so tick() never goes out of bounds
      if (strokeRef.current >= p.length) strokeRef.current = 0;
    } else {
      stop(); // Sólo detener al entrar en modo edición
    }
  }, [presetIdx, selectedTs, editMode, stop, currentPreset]);

  useEffect(() => { patternRef.current = customPattern; }, [customPattern]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  useEffect(() => {
    measuresDoneRef.current = 0;
    setMeasuresDone(0);
    if (measuresOverride !== undefined) {
      setMeasuresPerChord(measuresOverride);
      measuresPerChordRef.current = measuresOverride;
    }
  }, [activeChord]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoStart === undefined) return;
    if (autoStart && !isPlayingRef.current) {
      strokeRef.current = 0; measuresDoneRef.current = 0; setMeasuresDone(0);
      isPlayingRef.current = true; setIsPlaying(true); onPlayChangeRef.current?.(true); tick();
    } else if (!autoStart && isPlayingRef.current) { stop(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, stop]);

  const tick = () => {
    if (!isPlayingRef.current) return;
    const p = patternRef.current;
    setActiveStroke(strokeRef.current);
    if (shapeRef.current) playStrum(p[strokeRef.current], toAudioFrets(shapeRef.current));
    const nextStroke = (strokeRef.current + 1) % p.length;
    strokeRef.current = nextStroke;
    if (nextStroke === 0) {
      const newM = measuresDoneRef.current + 1;
      measuresDoneRef.current = newM; setMeasuresDone(newM);
      if (newM >= measuresPerChordRef.current) {
        measuresDoneRef.current = 0; setMeasuresDone(0); onNextChordRef.current?.();
      }
    }
    timerRef.current = window.setTimeout(tick, 30000 / bpmRef.current);
  };

  const togglePlay = () => {
    if (isPlaying) { stop(); return; }
    strokeRef.current = 0; measuresDoneRef.current = 0; setMeasuresDone(0);
    isPlayingRef.current = true; setIsPlaying(true); onPlayChangeRef.current?.(true); tick();
  };

  const toggleCell = (idx: number) => {
    if (isPlaying) return;
    setCustomPattern(prev => prev.map((s, i) => i === idx ? NEXT[s] : s));
  };
  const addCell = () => { if (customPattern.length < 16) setCustomPattern(prev => [...prev, 'D']); };
  const removeCell = () => { if (customPattern.length > 2) setCustomPattern(prev => prev.slice(0, -1)); };
  const enterEditMode = () => {
    setCustomPattern(currentPreset.pattern.slice());
    setSaveName('');
    setEditMode(true);
    stop();
  };

  const handleSave = () => {
    const name = saveName.trim() || 'Mi rasgueo';
    const timing = customPattern.map((_, i) => String(i + 1));
    saveCustomPreset({ name, ts: selectedTs, pattern: customPattern, timing });
    savePracticePref(selectedTs, name);
    const updated = loadCustomPresets();
    setCustomPresets(updated);
    const allForTs = [...ALL_PRESETS.filter(p => p.ts === selectedTs), ...updated.filter(p => p.ts === selectedTs)];
    const newIdx = allForTs.findIndex(p => p.name === name && p.ts === selectedTs);
    setPresetIdx(newIdx >= 0 ? newIdx : 0);
    setEditMode(false);
    setSaveName('');
    onPresetChange?.(selectedTs, newIdx >= 0 ? newIdx : 0);
  };

  const handleDeleteCustom = (name: string) => {
    deleteCustomPreset(name, selectedTs);
    const updated = loadCustomPresets();
    setCustomPresets(updated);
    setPresetIdx(0);
    onPresetChange?.(selectedTs, 0);
  };

  const handleTsChange = (ts: TimeSignature) => {
    setSelectedTs(ts); setPresetIdx(0); setEditMode(false);
    const firstForTs = [...ALL_PRESETS.filter(p => p.ts === ts), ...loadCustomPresets().filter(p => p.ts === ts)][0];
    if (firstForTs) savePracticePref(ts, firstForTs.name);
    onPresetChange?.(ts, 0);
  };

  const pattern = customPattern;
  const timing = editMode ? pattern.map((_, i) => String(i + 1)) : currentPreset.timing;
  const tsInfo = TIME_SIGNATURES.find(t => t.ts === selectedTs)!;

  const dk = variant === 'dark';
  const sep = dk ? 'bg-white/15' : 'bg-emerald-200 dark:bg-emerald-700';

  // Chord diagram
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
    const W = padL * 2 + strSp * 5, H = padT + nFrets * fretSp + 6;
    const sx = (s: number) => padL + s * strSp;
    const fy = (r: number) => padT + r * fretSp;
    const dotCY = (r: number) => fy(r) - fretSp / 2;
    const toRow = (f: number) => f - shape.baseFret + 1;
    diagramEl = (
      <div className="flex flex-col items-center shrink-0">
        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 leading-none mb-0.5">{activeChord}</span>
        <span className="text-[10px] font-black leading-none mb-0.5 px-1 py-px rounded bg-emerald-600 text-white">{shape.baseFret}fr</span>
        <svg width={W} height={H} className="text-gray-800 dark:text-gray-200" overflow="visible">
          {shape.baseFret === 1 && <rect x={sx(0)} y={fy(0)-2} width={sx(5)-sx(0)} height={2.5} rx={1} fill="currentColor" />}
          {[0,1,2,3,4,5].map(s => <line key={s} x1={sx(s)} y1={fy(0)} x2={sx(s)} y2={fy(nFrets)} stroke="currentColor" strokeWidth={0.75} />)}
          {Array.from({length: nFrets+1}, (_,i) => <line key={i} x1={sx(0)} y1={fy(i)} x2={sx(5)} y2={fy(i)} stroke="currentColor" strokeWidth={0.75} />)}
          {shape.frets.map((fret, s) => {
            if (fret === 0) return <text key={s} x={sx(s)} y={fy(0)-2} textAnchor="middle" fontSize={6} fill="currentColor">○</text>;
            if (fret === -1) return <text key={s} x={sx(s)} y={fy(0)-2} textAnchor="middle" fontSize={6} fill="currentColor">×</text>;
            return null;
          })}
          {shape.barre && <rect x={sx(shape.barre.from)-3} y={dotCY(toRow(shape.barre.fret))-3.5} width={sx(shape.barre.to)-sx(shape.barre.from)+6} height={7} rx={3.5} fill="currentColor" />}
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

  const btnBase = `px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors leading-none`;
  const btnActive = 'bg-emerald-600 text-white';
  const btnInactive = dk
    ? 'bg-white/10 text-white/70 hover:bg-white/20'
    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200';
  const tsBtnActive = (compound: boolean) => compound
    ? 'bg-violet-600 text-white'
    : 'bg-emerald-600 text-white';
  const tsBtnInactive = dk
    ? 'bg-white/10 text-white/60 hover:bg-white/20'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700';

  return (
    <div
      className={`flex flex-col gap-1.5 px-3 py-2 print-hidden ${dk ? 'border-t border-white/10' : 'bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800'}`}
      style={{ ...(dk ? { background: 'rgba(0,0,0,0.55)' } : {}) }}
    >
      {/* ── Row 1: diagram + compás selector + BPM + play ── */}
      <div className="flex items-center gap-2" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {!noDiagram && diagramEl}
        {!noDiagram && <div className={`w-px self-stretch ${sep} shrink-0`} />}

        {/* Time signature selector */}
        {!hidePresets && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <div className="flex items-center gap-0.5">
              <span className={`text-[8px] font-bold uppercase tracking-wide mr-0.5 ${dk ? 'text-white/40' : 'text-gray-400'}`}>
                Compás
              </span>
              <span className={`text-[8px] px-1 rounded font-bold ${tsInfo.compound ? (dk ? 'bg-violet-800/60 text-violet-300' : 'bg-violet-100 text-violet-600') : (dk ? 'bg-emerald-900/60 text-emerald-400' : 'bg-emerald-100 text-emerald-600')}`}>
                {tsInfo.compound ? 'compuesto' : 'simple'}
              </span>
            </div>
            <div className="flex gap-0.5">
              {TIME_SIGNATURES.map(({ ts, label, compound }) => (
                <button key={ts} onClick={() => handleTsChange(ts)}
                  className={`px-1 py-0.5 text-[9px] font-bold rounded transition-colors leading-none ${
                    ts === selectedTs ? tsBtnActive(compound) : tsBtnInactive
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!hidePresets && <div className={`w-px self-stretch ${sep} shrink-0`} />}

        {/* Preset buttons for selected time signature */}
        {!hidePresets && (
          <div className="flex flex-col gap-1 shrink-0 min-w-0" style={{ maxWidth: 240 }}>
            <div className="flex items-center gap-1 flex-wrap">
              {filteredPresets.map((p, i) => {
                const isCustom = 'custom' in p && (p as CustomPreset).custom;
                return (
                  <div key={i} className="relative group">
                    <button onClick={() => { setPresetIdx(i); setEditMode(false); savePracticePref(selectedTs, p.name); onPresetChange?.(selectedTs, i); }}
                      className={`${btnBase} ${i === presetIdx && !editMode ? btnActive : btnInactive} ${isCustom ? 'pr-3' : ''}`}>
                      {p.name}
                    </button>
                    {isCustom && (
                      <button onClick={() => handleDeleteCustom(p.name)}
                        title="Eliminar preset"
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 text-white text-[8px] leading-none items-center justify-center hidden group-hover:flex">
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              <button onClick={editMode ? () => { setEditMode(false); setSaveName(''); } : enterEditMode}
                title={editMode ? 'Cancelar edición' : 'Editar patrón'}
                className={`${btnBase} ${editMode ? 'bg-purple-600 text-white' : dk ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300'}`}>
                ✏️
              </button>
            </div>
            {/* Input guardar — solo visible en edit mode */}
            {editMode && (
              <div className="flex items-center gap-1">
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Nombre del rasgueo…"
                  className={`flex-1 text-[10px] px-1.5 py-0.5 rounded border outline-none min-w-0 ${
                    dk ? 'bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-purple-400'
                       : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-purple-400'
                  }`}
                />
                <button onClick={handleSave}
                  className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-600 hover:bg-purple-700 text-white leading-none shrink-0">
                  Guardar
                </button>
              </div>
            )}
          </div>
        )}

        {!hidePresets && <div className={`w-px self-stretch ${sep} shrink-0`} />}

        {/* Compases por acorde */}
        {onNextChord && (
          <>
            <div className="flex flex-col gap-0.5 shrink-0">
              <span className={`text-[9px] font-bold uppercase tracking-wide ${dk ? 'text-white/50' : 'text-gray-400'}`}>Compases</span>
              <div className="flex gap-1">
                {MEASURES_OPTIONS.map(n => (
                  <button key={n} onClick={() => { setMeasuresPerChord(n); measuresPerChordRef.current = n; onMeasuresChange?.(n); }}
                    className={`w-6 h-5 text-[10px] font-bold rounded transition-colors ${
                      n === measuresPerChord ? 'bg-blue-600 text-white'
                        : dk ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
                    }`}>{n}</button>
                ))}
              </div>
            </div>
            <div className={`w-px self-stretch ${sep} shrink-0`} />
          </>
        )}

        {/* BPM + Play */}
        <div className="shrink-0 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold w-14 shrink-0 ${dk ? 'text-white/80' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {bpm} BPM
            </span>
            <input type="range" min={40} max={200} step={5} value={bpm}
              onChange={e => setBpm(Number(e.target.value))}
              className="w-20 accent-emerald-600" />
          </div>
          <div className="flex gap-1">
            {onRestart && (
              <button onClick={() => { stop(); onRestart(); }} title="Volver al primer acorde"
                className={`px-2 py-1 rounded-lg font-bold text-sm transition-colors ${
                  dk ? 'bg-white/10 hover:bg-white/20 text-white/70' : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>⏮</button>
            )}
            <button onClick={togglePlay}
              className={`flex-1 px-4 py-1 rounded-lg font-bold text-sm transition-colors ${
                isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}>
              {isPlaying ? '■ Detener' : '▶ Practicar'}
            </button>
          </div>
        </div>

        {!hideClose && (
          <button onClick={() => { stop(); onClose(); }}
            className={`ml-auto shrink-0 p-1 text-sm leading-none ${dk ? 'text-white/40 hover:text-white/80' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
            title="Cerrar modo práctica">✕</button>
        )}
      </div>

      {/* ── Row 2: strum cells ── */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="flex items-end gap-1">
        {pattern.map((stroke, i) => {
          const isActive = activeStroke === i;
          const canEdit = editMode && !isPlaying;
          return (
            <div key={i} className="flex flex-col items-center shrink-0">
              {!hidePresets && (
                <span className={`text-[8px] font-bold leading-none mb-0.5 transition-all ${
                  isActive ? 'text-emerald-500 scale-125' : dk ? 'text-white/40' : 'text-gray-400'
                }`}>{timing[i] ?? i + 1}</span>
              )}
              <button onClick={() => canEdit && toggleCell(i)} disabled={!canEdit}
                className={`w-6 h-7 flex items-center justify-center rounded text-xs font-bold border transition-all select-none outline-none focus:outline-none
                  ${isActive ? 'ring-2 ring-emerald-400 scale-110' : ''}
                  ${canEdit ? 'cursor-pointer hover:scale-105' : 'cursor-default pointer-events-none'}
                  ${stroke === 'D' || stroke === 'DL'
                    ? (isActive ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 text-emerald-600 dark:text-emerald-300')
                    : stroke === 'U'
                    ? (isActive ? 'bg-purple-500 border-purple-400 text-white' : 'bg-purple-100 dark:bg-purple-900/40 border-purple-400 text-purple-600 dark:text-purple-300')
                    : (isActive ? 'bg-gray-400 border-gray-300 text-white' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400')
                  }`}>
                {stroke === 'D' ? '↓' : stroke === 'DL' ? '⇓' : stroke === 'U' ? '↑' : '—'}
              </button>
            </div>
          );
        })}

        {editMode && (
          <div className="flex flex-col gap-1 ml-1 shrink-0">
            <button onClick={addCell} disabled={customPattern.length >= 16}
              className="w-6 h-3 flex items-center justify-center text-[9px] font-bold rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border border-purple-300 hover:bg-purple-200 disabled:opacity-40">+</button>
            <button onClick={removeCell} disabled={customPattern.length <= 2}
              className="w-6 h-3 flex items-center justify-center text-[9px] font-bold rounded bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-300 hover:bg-gray-200 disabled:opacity-40">−</button>
          </div>
        )}

        {onNextChord && (
          <div className="flex items-end gap-1 ml-3 pb-1 shrink-0">
            <span className={`text-[9px] mr-1 ${dk ? 'text-white/40' : 'text-gray-400'}`}>compás</span>
            {Array.from({ length: measuresPerChord }, (_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-all ${
                i < measuresDone ? 'bg-blue-500 border-blue-400 scale-110'
                  : dk ? 'bg-white/10 border-white/20' : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
              }`} />
            ))}
          </div>
        )}

        {editMode && !onNextChord && (
          <span className={`text-[9px] ml-2 self-center shrink-0 ${dk ? 'text-white/40' : 'text-gray-400'}`}>
            click celda para cambiar ↓↑—
          </span>
        )}
        </div>
      </div>
    </div>
  );
};
