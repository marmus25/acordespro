import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { SongData } from '../types';
import { transposeChord } from '../utils/transpose';
import { lookupChord } from '../utils/chordDiagrams';
import { chordproToSections } from '../utils/chordproToSong';
import { scheduleStrum, getCtxTime, stopAllAudio, ensureAudio } from '../utils/audio';

// ── Iconos inline ─────────────────────────────────────────────────────────────
const IconMusic    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
const IconPlay     = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size }}><path d="M8 5v14l11-7z"/></svg>;
const IconSquare   = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: size, height: size }}><rect x="6" y="6" width="12" height="12"/></svg>;
const IconSettings = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: size, height: size }}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconActivity = ({ size = 16 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: size, height: size }}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconDown     = ({ cls = 'w-6 h-6 md:w-8 md:h-8' }: { cls?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><path d="M12 5v14m-7-7 7 7 7-7"/></svg>;
const IconUp       = ({ cls = 'w-6 h-6 md:w-8 md:h-8' }: { cls?: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cls}><path d="M12 19V5m-7 7 7-7 7 7"/></svg>;
const IconMinus    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M5 12h14"/></svg>;
const IconX        = ({ size = 24 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: size, height: size }}><path d="M18 6 6 18M6 6l12 12"/></svg>;
const IconSave     = ({ size = 16 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: size, height: size }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconTrash    = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: size, height: size }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconPhone    = ({ size = 18 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: size, height: size }}><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round"/></svg>;
const IconPencil   = ({ size = 16 }: { size?: number }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: size, height: size }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;

// ── Tipos ─────────────────────────────────────────────────────────────────────
type StrokeType = 'D' | 'U' | '-' | 'DL';
interface StrumPattern {
  id: string; name: string; strokes: StrokeType[];
  weights?: number[]; // duración relativa de cada golpe
  beats?: number;     // compases por medida (por defecto: 3 si hay 6 golpes, si no 4)
}
interface ChordDef {
  name: string; frets: number[]; baseFret: number;
  fingers?: number[]; barre?: { fret: number; from: number; to: number };
}
interface SongSegment { text: string; chord?: string; }
interface SongLine { id: string; segments: SongSegment[]; }
interface PlayingOverlayState {
  chord: string;
  pattern: StrumPattern;
  line?: SongLine;
  activeSegmentIndex?: number;
}

// ── Patrones de rasgueo ───────────────────────────────────────────────────────
// weights: duración relativa por golpe; beats: pulsos por compás.
// Bolero idéntico al modo práctica: 1 · 2 · & · 3 · & · 4
const UNIVERSAL_PATTERNS: StrumPattern[] = [
  { id: 'bolero', name: 'Bolero', strokes: ['D','DL','U','D','U','-'], weights: [2,1,1,1,1,2], beats: 4 },
  { id: 'pop',          name: 'Pop / Balada',     strokes: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'] },
  { id: 'rock',         name: 'Rock Básico',      strokes: ['D', '-', 'D', '-', 'D', '-', 'D', '-'] },
  { id: 'island',       name: 'Island Strum',     strokes: ['D', '-', 'D', 'U', '-', 'U', 'D', '-'] },
  { id: 'vals',         name: 'Vals (3/4)',        strokes: ['D', '-', 'D', '-', 'D', '-'] },
  { id: 'punk',         name: 'Punk / Rápido',    strokes: ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'] },
  { id: 'arpeggio_sim', name: 'Arpegio Simulado', strokes: ['D', '-', '-', '-', 'U', '-', '-', '-'] },
];

// ── Audio helpers (usan los WAV samples de audio.ts) ─────────────────────────
function toAudioFrets(frets: number[]): (number | 'x' | 'o')[] {
  return frets.map(f => f === -1 ? 'x' : f === 0 ? 'o' : f);
}

function scheduleChordPattern(
  frets: (number | 'x' | 'o')[],
  pattern: StrumPattern,
  bpm: number,
  measures: number,
  startTime: number,
  dlDelay = 0.10,
  onStroke?: (strokeIdx: number) => void
) {
  const beatsPerMeasure = pattern.beats ?? (pattern.strokes.length === 6 ? 3 : 4);
  const measureDuration = (60 / bpm) * beatsPerMeasure;
  const ws = pattern.weights ?? pattern.strokes.map(() => 1);
  const totalW = ws.reduce((s, w) => s + w, 0);
  const offsets = ws.map((_, i) => ws.slice(0, i).reduce((s, w) => s + w, 0) / totalW * measureDuration);
  const nowCtx = getCtxTime();
  for (let m = 0; m < measures; m++) {
    const mOff = m * measureDuration;
    pattern.strokes.forEach((stroke, i) => {
      const t = startTime + mOff + offsets[i];
      if (stroke === 'D' || stroke === 'U' || stroke === 'DL') {
        scheduleStrum(stroke, frets, t, 0.82, dlDelay);
      }
      if (onStroke) {
        const wallMs = Math.max(0, (t - nowCtx) * 1000);
        setTimeout(() => onStroke(i), wallMs);
      }
    });
  }
}

// ── ChordDiagram ──────────────────────────────────────────────────────────────
const ChordDiagram: React.FC<{ chord: ChordDef; width?: number; height?: number }> = ({ chord, width = 100, height = 120 }) => {
  const strings = 6;
  const numFrets = 5;
  const small = width < 100;
  const padding    = small ? 10 : 20;
  const topPadding = small ? 25 : 30;
  const drawWidth  = width - padding * 2;
  const drawHeight = height - topPadding - padding;
  const stringSpacing = drawWidth / (strings - 1);
  const fretSpacing   = drawHeight / numFrets;
  const startFret  = chord.baseFret > 1 ? chord.baseFret : 1;
  const fontSize   = small ? '12' : '16';
  const dotR       = small ? 4 : 6;
  return (
    <svg width={width} height={height} className="bg-slate-800 rounded-lg shadow-lg">
      {/* Nombre */}
      <text x={width / 2} y={small ? 15 : 20} fill="white" fontSize={fontSize} fontWeight="bold" textAnchor="middle">
        {chord.name}
      </text>
      {/* Número de traste si no empieza en 1 */}
      {startFret > 1 && (
        <text x={padding - 2} y={topPadding + fretSpacing / 2 + 4} fill="#94a3b8" fontSize="9" textAnchor="end">
          {startFret}fr
        </text>
      )}
      {/* Cejuela (ceja gruesa en traste 1) */}
      {startFret === 1 && (
        <line x1={padding} y1={topPadding} x2={width - padding} y2={topPadding} stroke="white" strokeWidth={small ? 2 : 4} />
      )}
      {/* Trastes */}
      {Array.from({ length: numFrets + 1 }).map((_, i) => (
        <line key={`f${i}`} x1={padding} y1={topPadding + i * fretSpacing} x2={width - padding} y2={topPadding + i * fretSpacing} stroke="#475569" strokeWidth="1" />
      ))}
      {/* Cuerdas */}
      {Array.from({ length: strings }).map((_, i) => (
        <line key={`s${i}`} x1={padding + i * stringSpacing} y1={topPadding} x2={padding + i * stringSpacing} y2={height - padding} stroke="#94a3b8" strokeWidth={1 + (5 - i) * 0.15} />
      ))}
      {/* Cejilla (barre) */}
      {chord.barre && (() => {
        const barreRel = chord.barre.fret - startFret + 1;
        if (barreRel < 1 || barreRel > numFrets) return null;
        const by  = topPadding + (barreRel - 0.5) * fretSpacing;
        const bx1 = padding + chord.barre.from * stringSpacing;
        const bx2 = padding + chord.barre.to   * stringSpacing;
        return (
          <rect key="barre" x={bx1} y={by - dotR * 0.85} width={bx2 - bx1} height={dotR * 1.7} rx={dotR} fill="#0d9488" opacity="0.85" />
        );
      })()}
      {/* Puntos / dedos */}
      {chord.frets.map((fret, si) => {
        const x = padding + si * stringSpacing;
        if (fret === -1) return <text key={`m${si}`} x={x} y={topPadding - 4} fill="#ef4444" fontSize="9" textAnchor="middle">×</text>;
        if (fret === 0)  return <circle key={`o${si}`} cx={x} cy={topPadding - (small ? 5 : 7)} r={small ? 3 : 4} fill="none" stroke="#10b981" strokeWidth="1.5" />;
        const rel = fret - startFret + 1;
        if (rel < 1 || rel > numFrets) return null;
        const y  = topPadding + (rel - 0.5) * fretSpacing;
        const fn = chord.fingers?.[si] ?? 0;
        // No mostrar punto individual si está cubierto por la cejilla exacta
        const inBarre = chord.barre && fret === chord.barre.fret && si >= chord.barre.from && si <= chord.barre.to;
        if (inBarre) return null;
        return (
          <g key={`d${si}`}>
            <circle cx={x} cy={y} r={dotR} fill="#14b8a6" />
            {fn > 0 && (
              <text x={x} y={y + dotR * 0.4} fill="white" fontSize={small ? '5' : '7'} fontWeight="bold" textAnchor="middle">{fn}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ── StrumVisual ───────────────────────────────────────────────────────────────
const StrumVisual: React.FC<{ pattern: StrumPattern; className?: string; animate?: boolean }> = ({ pattern, className = '', animate = true }) => (
  <div className={`flex flex-col items-center gap-2 ${className}`}>
    <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{pattern.name}</span>
    <div className="flex flex-wrap gap-2 md:gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 justify-center">
      {pattern.strokes.map((stroke, i) => {
        const animStyle = animate ? { animationDelay: `${i * 0.15}s`, animationDuration: '1.5s' } : {};
        const animClass = animate ? 'animate-bounce' : '';
        return (
          <div key={i} className="flex flex-col items-center justify-center w-6 md:w-8 h-10">
            {stroke === 'D'  && <IconDown cls={`w-6 h-6 md:w-8 md:h-8 text-teal-400 ${animClass}`} style={animStyle} />}
            {stroke === 'U'  && <IconUp   cls={`w-6 h-6 md:w-8 md:h-8 text-teal-400 ${animClass}`} style={animStyle} />}
            {stroke === 'DL' && <span className={`text-amber-400 font-black text-lg leading-none ${animClass}`} style={animStyle}>⇓</span>}
            {stroke === '-'  && <IconMinus />}
            <div className="w-1 h-1 rounded-full bg-slate-700 mt-2" />
          </div>
        );
      })}
    </div>
  </div>
);

// ── LyricLine ─────────────────────────────────────────────────────────────────
interface LyricLineProps {
  line: SongLine;
  isActive: boolean;
  onPlay: (line: SongLine) => void;
  onChordClick: (chord: string, line?: SongLine, segIdx?: number) => void;
}
const LyricLine: React.FC<LyricLineProps> = ({ line, isActive, onPlay, onChordClick }) => (
  <div className={`group relative flex items-start p-2 rounded-lg transition-colors duration-200 ${
    isActive ? 'bg-teal-900/40 border-l-4 border-teal-500' : 'hover:bg-slate-800/50 border-l-4 border-transparent'
  }`}>
    <button
      onClick={() => onPlay(line)}
      className={`absolute -left-10 top-1/2 -translate-y-1/2 p-2 rounded-full bg-teal-600 text-white shadow-lg transition-opacity duration-200 ${
        isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      } hidden md:flex`}
      aria-label="Tocar línea"
    >
      <IconPlay size={16} />
    </button>
    <div
      className="flex flex-wrap w-full cursor-pointer md:cursor-default"
      onClick={() => { if (window.innerWidth < 768) onPlay(line); }}
    >
      {line.segments.map((seg, idx) => (
        <div key={idx} className="flex flex-col mr-1 mb-2">
          <div className="h-6 flex items-end">
            {seg.chord && (
              <button
                onClick={e => { e.stopPropagation(); onChordClick(seg.chord!, line, idx); }}
                className="text-teal-400 font-bold text-sm hover:text-teal-300 hover:underline px-1 rounded"
              >
                {seg.chord}
              </button>
            )}
          </div>
          <span className="text-lg md:text-xl text-slate-200 whitespace-pre">{seg.text}</span>
        </div>
      ))}
    </div>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────
interface Props { song: SongData; transposeSteps: number; onClose: () => void; }

export const ChordPlayView: React.FC<Props> = ({ song, transposeSteps, onClose }) => {
  const [activeLineId, setActiveLineId]         = useState<string | null>(null);
  const [selectedChord, setSelectedChord]       = useState<string | null>(null);
  const [bpm, setBpm]                           = useState(100);
  const [isPlayingAll, setIsPlayingAll]         = useState(false);
  const [sectionMeasures, setSectionMeasures]   = useState<Record<number, number>>({});
  const [segMeasures, setSegMeasures]           = useState<Record<string, number>>({});
  const [customPatterns, setCustomPatterns]     = useState<StrumPattern[]>([]);
  const [activePatternId, setActivePatternId]   = useState<string>(UNIVERSAL_PATTERNS[0].id);
  const [isEditingPattern, setIsEditingPattern] = useState(false);
  const [builderStrokes, setBuilderStrokes]     = useState<StrokeType[]>(['D', '-', 'D', 'U', '-', 'U', 'D', 'U']);
  const [builderName, setBuilderName]           = useState('');
  const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
  const [dlDelay, setDlDelay]                   = useState(0.10);
  const [ttStrokeIdx, setTtStrokeIdx]           = useState(-1);
  const [savedOk, setSavedOk]                   = useState(false);
  const [playingOverlay, setPlayingOverlay]     = useState<PlayingOverlayState | null>(null);
  const [showTikTokMode, setShowTikTokMode]     = useState(false);
  const timeoutsRef        = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ttLyricsScrollRef  = useRef<HTMLDivElement>(null);

  const songKey = useMemo(
    () => `${song.title}_${song.artist}`.replace(/\s+/g, '_'),
    [song.title, song.artist]
  );
  const measuresStorageKey = useMemo(() => `chordplay_segmeasures_${songKey}`, [songKey]);
  const sectionStorageKey  = useMemo(() => `chordplay_secmeasures_${songKey}`, [songKey]);

  // Convertir song.lines → secciones con acordes transpuestos
  const playSections = useMemo(() => {
    const raw = chordproToSections(song.lines);
    return raw.map(sec => ({
      title: sec.title,
      defaultMeasures: 1,
      lines: sec.lines.map(line => ({
        id: line.id,
        segments: line.segments.map(seg => ({
          text: seg.text,
          chord: seg.chord
            ? (transposeSteps === 0 ? seg.chord : transposeChord(seg.chord, transposeSteps))
            : undefined,
        })) as SongSegment[],
      })) as SongLine[],
    }));
  }, [song.lines, transposeSteps]);

  // Diccionario acorde → shape (frets + baseFret)
  const chordDictionary = useMemo<Record<string, ChordDef>>(() => {
    const dict: Record<string, ChordDef> = {};
    playSections.forEach(sec =>
      sec.lines.forEach(line =>
        line.segments.forEach(seg => {
          if (!seg.chord || dict[seg.chord]) return;
          const shape = lookupChord(seg.chord);
          if (shape) {
            dict[seg.chord] = { name: seg.chord, frets: shape.frets, baseFret: shape.baseFret, fingers: shape.fingers, barre: shape.barre };
          }
        })
      )
    );
    return dict;
  }, [playSections]);

  useEffect(() => {
    setSectionMeasures(prev => {
      const next: Record<number, number> = {};
      playSections.forEach((sec, idx) => { next[idx] = prev[idx] ?? sec.defaultMeasures ?? 1; });
      return next;
    });
  }, [playSections]);

  // Cargar configuración global (bpm, patrón, dlDelay) al montar
  useEffect(() => {
    try {
      const g = localStorage.getItem('chordplay_global');
      if (g) {
        const { bpm: b, patternId, dlDelay: dl } = JSON.parse(g);
        if (typeof b === 'number') setBpm(b);
        if (typeof patternId === 'string') setActivePatternId(patternId);
        if (typeof dl === 'number') setDlDelay(dl);
      }
    } catch (_) {}
  }, []);

  // Cargar patrones personalizados
  useEffect(() => {
    const saved = localStorage.getItem('chordplay_custom_patterns');
    if (saved) { try { setCustomPatterns(JSON.parse(saved)); } catch (_) {} }
  }, []);
  useEffect(() => {
    localStorage.setItem('chordplay_custom_patterns', JSON.stringify(customPatterns));
  }, [customPatterns]);

  // Cargar compases por posición (por canción)
  useEffect(() => {
    const saved = localStorage.getItem(measuresStorageKey);
    if (saved) { try { setSegMeasures(JSON.parse(saved)); } catch (_) {} }
  }, [measuresStorageKey]);
  useEffect(() => {
    if (Object.keys(segMeasures).length > 0)
      localStorage.setItem(measuresStorageKey, JSON.stringify(segMeasures));
  }, [segMeasures, measuresStorageKey]);

  // Cargar compases por sección (por canción)
  useEffect(() => {
    const saved = localStorage.getItem(sectionStorageKey);
    if (saved) { try { setSectionMeasures(JSON.parse(saved)); } catch (_) {} }
  }, [sectionStorageKey]);

  const allPatterns   = useMemo(() => [...UNIVERSAL_PATTERNS, ...customPatterns], [customPatterns]);
  const activePattern = useMemo(() => allPatterns.find(p => p.id === activePatternId) || UNIVERSAL_PATTERNS[0], [allPatterns, activePatternId]);

  const uniqueChords = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    playSections.forEach(sec => sec.lines.forEach(line => line.segments.forEach(seg => {
      if (seg.chord && chordDictionary[seg.chord] && !seen.has(seg.chord)) {
        seen.add(seg.chord);
        result.push(seg.chord);
      }
    })));
    return result;
  }, [playSections, chordDictionary]);

  // Líneas anterior/actual/siguiente para teleprompter TikTok
  const tikTokCtx = useMemo(() => {
    const all: { line: SongLine; sTitle: string }[] = [];
    playSections.forEach(sec => sec.lines.forEach(l => all.push({ line: l, sTitle: sec.title || '' })));
    const ci = all.findIndex(({ line }) => line.id === activeLineId);
    return {
      prev:    ci > 0                     ? all[ci - 1].line : null,
      current: ci >= 0                    ? all[ci].line     : null,
      next:    ci >= 0 && ci < all.length - 1 ? all[ci + 1].line : null,
      sTitle:  ci >= 0                    ? all[ci].sTitle   : '',
    };
  }, [playSections, activeLineId]);

  // Próximo acorde (para indicador en TikTok)
  const nextChordInSong = useMemo(() => {
    if (!playingOverlay?.line || playingOverlay.activeSegmentIndex === undefined) return null;
    const { line, activeSegmentIndex: idx } = playingOverlay;
    for (let i = (idx ?? 0) + 1; i < line.segments.length; i++) {
      const c = line.segments[i].chord;
      if (c && chordDictionary[c]) return c;
    }
    let found = false;
    for (const sec of playSections) {
      for (const l of sec.lines) {
        if (found) { for (const seg of l.segments) { if (seg.chord && chordDictionary[seg.chord]) return seg.chord; } }
        if (l.id === line.id) found = true;
      }
    }
    return null;
  }, [playingOverlay, playSections, chordDictionary]);

  // Scroll teleprompter al cambiar de línea en modo TikTok
  useEffect(() => {
    if (!showTikTokMode || !ttLyricsScrollRef.current || !activeLineId) return;
    const el = ttLyricsScrollRef.current.querySelector<HTMLElement>(`[data-tt-line="${activeLineId}"]`);
    if (!el) return;
    const container = ttLyricsScrollRef.current;
    container.scrollTo({ top: el.offsetTop - container.clientHeight * 0.28, behavior: 'smooth' });
  }, [activeLineId, showTikTokMode]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    stopAllAudio();
  }, []);

  const stopAll = useCallback(() => {
    clearTimeouts();
    setIsPlayingAll(false);
    setActiveLineId(null);
    setPlayingOverlay(null);
    setTtStrokeIdx(-1);
  }, [clearTimeouts]);

  // handleChordClick — toca un acorde individual
  const handleChordClick = useCallback(async (
    chordName: string,
    line?: SongLine,
    segmentIndex?: number,
    measuresForChord = 1
  ) => {
    clearTimeouts();
    setIsPlayingAll(false);
    setSelectedChord(chordName);
    // Prioridad: posición específica > nombre del acorde (paleta) > sección
    const posKey  = line?.id !== undefined && segmentIndex !== undefined ? `${line.id}:${segmentIndex}` : undefined;
    const measures = (posKey ? segMeasures[posKey] : undefined) ?? segMeasures[chordName] ?? measuresForChord;
    const chordDef = chordDictionary[chordName];
    if (chordDef) {
      await ensureAudio();
      const frets           = toAudioFrets(chordDef.frets);
      const startTime       = getCtxTime();
      scheduleChordPattern(frets, activePattern, bpm, measures, startTime, dlDelay, setTtStrokeIdx);
      const beatsPerMeasure = activePattern.strokes.length === 6 ? 3 : 4;
      const measureDuration = (60 / bpm) * beatsPerMeasure;
      const duration        = measureDuration * measures;
      setPlayingOverlay({ chord: chordName, pattern: activePattern, line, activeSegmentIndex: segmentIndex });
      const t = setTimeout(() => setPlayingOverlay(null), duration * 1000);
      timeoutsRef.current.push(t);
    }
  }, [activePattern, bpm, dlDelay, chordDictionary, segMeasures, clearTimeouts]);

  // handlePlayLine — toca todos los acordes de una línea respetando compases por acorde
  const handlePlayLine = useCallback(async (line: SongLine, measuresForLine: number) => {
    clearTimeouts();
    setIsPlayingAll(false);
    setActiveLineId(line.id);
    const segsWithChords = line.segments
      .map((seg, idx) => ({ ...seg, originalIndex: idx }))
      .filter(seg => seg.chord && seg.chord.trim() !== '' && chordDictionary[seg.chord!]);
    if (segsWithChords.length === 0) return;
    await ensureAudio();
    const beatsPerMeasure = activePattern.strokes.length === 6 ? 3 : 4;
    const measureDuration = (60 / bpm) * beatsPerMeasure;
    const t0 = getCtxTime();
    let timeOffset = 0;
    segsWithChords.forEach(seg => {
      const measures   = segMeasures[`${line.id}:${seg.originalIndex}`] ?? segMeasures[seg.chord!] ?? measuresForLine;
      const chordDur   = measureDuration * measures;
      const chordDef   = chordDictionary[seg.chord!]!;
      const frets      = toAudioFrets(chordDef.frets);
      scheduleChordPattern(frets, activePattern, bpm, measures, t0 + timeOffset, dlDelay, setTtStrokeIdx);
      const to = setTimeout(() => {
        setPlayingOverlay({ chord: seg.chord!, pattern: activePattern, line, activeSegmentIndex: seg.originalIndex });
      }, timeOffset * 1000);
      timeoutsRef.current.push(to);
      timeOffset += chordDur;
    });
    const endT = setTimeout(() => {
      setPlayingOverlay(null);
      setActiveLineId(null);
    }, timeOffset * 1000);
    timeoutsRef.current.push(endT);
  }, [activePattern, bpm, dlDelay, chordDictionary, segMeasures, clearTimeouts]);

  // handlePlayAll — reproduce toda la canción con scheduler diferido
  // Los tiempos se fijan con el reloj del AudioContext (t0) para precisión exacta,
  // pero los nodos de audio se crean solo 300ms antes de que toque cada acorde
  // → evita saturar el motor con miles de nodos pre-creados.
  const handlePlayAll = useCallback(async () => {
    clearTimeouts();
    setIsPlayingAll(true);
    setActiveLineId(null);
    setPlayingOverlay(null);
    await ensureAudio();

    const beatsPerMeasure = activePattern.strokes.length === 6 ? 3 : 4;
    const measureDuration = (60 / bpm) * beatsPerMeasure;
    const t0 = getCtxTime();
    const AUDIO_EARLY = 0.3; // segundos antes de crear los nodos de audio
    let offset = 0;
    let lastFrets: (number | 'x' | 'o')[] | null = null;

    playSections.forEach((section, sIdx) => {
      const measures      = sectionMeasures[sIdx] ?? 1;
      const chordDuration = measureDuration * measures;

      section.lines.forEach(line => {
        const segsWithChords = line.segments
          .map((seg, idx) => ({ ...seg, originalIndex: idx }))
          .filter(seg => seg.chord && seg.chord.trim() !== '' && chordDictionary[seg.chord!]);

        if (segsWithChords.length > 0) {
          segsWithChords.forEach(seg => {
            const chordMeas  = segMeasures[`${line.id}:${seg.originalIndex}`] ?? segMeasures[seg.chord!] ?? measures;
            const chordDur   = measureDuration * chordMeas;
            const chordDef   = chordDictionary[seg.chord!]!;
            const frets      = toAudioFrets(chordDef.frets);
            const audioTime  = t0 + offset;
            const schedDelay = Math.max(0, (offset - AUDIO_EARLY) * 1000);
            lastFrets = frets;

            const tAudio = setTimeout(() => {
              scheduleChordPattern(frets, activePattern, bpm, chordMeas, audioTime, dlDelay, setTtStrokeIdx);
            }, schedDelay);
            const tLine  = setTimeout(() => setActiveLineId(line.id), offset * 1000);
            const tChord = setTimeout(() => {
              setPlayingOverlay({ chord: seg.chord!, pattern: activePattern, line, activeSegmentIndex: seg.originalIndex });
            }, offset * 1000);

            timeoutsRef.current.push(tAudio, tLine, tChord);
            offset += chordDur;
          });
        } else if (lastFrets) {
          const capturedFrets = lastFrets;
          const audioTime     = t0 + offset;
          const schedDelay    = Math.max(0, (offset - AUDIO_EARLY) * 1000);

          const tAudio = setTimeout(() => {
            scheduleChordPattern(capturedFrets, activePattern, bpm, measures, audioTime, dlDelay, setTtStrokeIdx);
          }, schedDelay);
          const tLine = setTimeout(() => setActiveLineId(line.id), offset * 1000);
          timeoutsRef.current.push(tAudio, tLine);
          offset += chordDuration;
        }
      });
    });

    const endT = setTimeout(() => {
      setIsPlayingAll(false);
      setActiveLineId(null);
      setPlayingOverlay(null);
    }, offset * 1000);
    timeoutsRef.current.push(endT);
  }, [activePattern, bpm, dlDelay, sectionMeasures, segMeasures, chordDictionary, playSections, clearTimeouts]);

  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  const updateSectionMeasures = (sIdx: number, delta: number) =>
    setSectionMeasures(prev => ({ ...prev, [sIdx]: Math.max(1, Math.min(8, (prev[sIdx] ?? 1) + delta)) }));

  const handleSaveConfig = () => {
    localStorage.setItem('chordplay_global', JSON.stringify({ bpm, patternId: activePatternId, dlDelay }));
    localStorage.setItem(sectionStorageKey, JSON.stringify(sectionMeasures));
    localStorage.setItem(measuresStorageKey, JSON.stringify(segMeasures));
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 2000);
  };

  const STROKE_CYCLE: StrokeType[] = ['D', 'U', 'DL', '-'];
  const toggleStroke = (index: number) => {
    setBuilderStrokes(prev => {
      const s = [...prev];
      const cur = STROKE_CYCLE.indexOf(s[index]);
      s[index] = STROKE_CYCLE[(cur + 1) % STROKE_CYCLE.length];
      return s;
    });
  };
  const deleteStroke = (index: number) => {
    if (builderStrokes.length <= 2) return;
    setBuilderStrokes(prev => prev.filter((_, i) => i !== index));
  };
  const addStroke = () => setBuilderStrokes(prev => [...prev, 'D']);

  const startEditPattern = (pattern: StrumPattern, isCustom: boolean) => {
    setBuilderStrokes([...pattern.strokes]);
    setBuilderName(isCustom ? pattern.name : `${pattern.name} (copia)`);
    setEditingPatternId(isCustom ? pattern.id : null);
    setIsEditingPattern(true);
  };

  const startNewPattern = () => {
    setBuilderStrokes(['D', '-', 'D', 'U', '-', 'U', 'D', 'U']);
    setBuilderName('');
    setEditingPatternId(null);
    setIsEditingPattern(true);
  };

  const saveCustomPattern = () => {
    if (!builderName.trim()) { alert('Por favor, dale un nombre a tu rasgueo.'); return; }
    const isUpdating = editingPatternId && customPatterns.some(p => p.id === editingPatternId);
    if (isUpdating) {
      setCustomPatterns(prev => prev.map(p =>
        p.id === editingPatternId ? { ...p, name: builderName, strokes: builderStrokes } : p
      ));
      setActivePatternId(editingPatternId!);
    } else {
      const newPattern: StrumPattern = { id: `custom_${Date.now()}`, name: builderName, strokes: builderStrokes };
      setCustomPatterns(prev => [...prev, newPattern]);
      setActivePatternId(newPattern.id);
    }
    setIsEditingPattern(false);
    setBuilderName('');
    setBuilderStrokes(['D', '-', 'D', 'U', '-', 'U', 'D', 'U']);
    setEditingPatternId(null);
  };

  const deleteCustomPattern = (id: string) => {
    setCustomPatterns(prev => prev.filter(p => p.id !== id));
    if (activePatternId === id) setActivePatternId(UNIVERSAL_PATTERNS[0].id);
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen flex flex-col md:flex-row bg-slate-950">

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">

        {/* Header */}
        <header className="bg-slate-900/95 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-10 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-teal-400"><IconMusic /></span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-teal-400">{song.title}</h1>
              <p className="text-slate-400 text-sm">{song.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTikTokMode(v => !v)}
              title="Modo TikTok"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                showTikTokMode
                  ? 'bg-teal-500 text-slate-900'
                  : 'text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500'
              }`}
            >
              <IconPhone size={15} />
              <span className="hidden sm:inline">TikTok</span>
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Cerrar">
              <IconX size={24} />
            </button>
          </div>
        </header>

        {/* Scrollable */}
        <div className="flex-1 overflow-y-auto pb-32">

          {/* Panel controles */}
          <div className="bg-slate-800/30 border-b border-slate-800 p-4 md:p-6 mb-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-700/50 mb-8 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-700/50 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-teal-400"><IconSettings size={24} /></span>
                    <h3 className="text-white font-semibold text-lg">Configuración de Reproducción</h3>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Botón guardar configuración */}
                    <button
                      onClick={handleSaveConfig}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg border ${
                        savedOk
                          ? 'bg-teal-900/60 border-teal-500 text-teal-300'
                          : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-teal-500 hover:text-teal-300'
                      }`}
                    >
                      <IconSave size={16} />
                      {savedOk ? '✓ Guardado' : 'Guardar'}
                    </button>
                  <button
                    onClick={isPlayingAll ? stopAll : handlePlayAll}
                    className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg w-full sm:w-auto ${
                      isPlayingAll ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-teal-500 hover:bg-teal-400 text-slate-900'
                    }`}
                  >
                    {isPlayingAll
                      ? <><IconSquare size={18} /> Detener Canción</>
                      : <><IconPlay   size={18} /> Reproducir Canción</>}
                  </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* BPM */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                          <span className="text-teal-500"><IconActivity size={16} /></span>
                          Velocidad (BPM)
                        </label>
                        <span className="text-teal-400 font-bold bg-slate-800 px-2 py-1 rounded">{bpm}</span>
                      </div>
                      <input
                        type="range" min="60" max="200" value={bpm}
                        onChange={e => setBpm(Number(e.target.value))}
                        className="w-full accent-teal-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {activePattern.strokes.includes('DL') && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-slate-300 text-sm font-medium flex items-center gap-2">
                            <span className="text-amber-400 font-black text-base">⇓</span>
                            Velocidad de barrido
                          </label>
                          <span className="text-amber-400 font-bold bg-slate-800 px-2 py-1 rounded text-xs">
                            {dlDelay >= 0.10 ? 'Lento' : dlDelay >= 0.05 ? 'Medio' : 'Rápido'}
                          </span>
                        </div>
                        <input
                          type="range" min="20" max="200" step="5" value={Math.round(dlDelay * 1000)}
                          onChange={e => setDlDelay(Number(e.target.value) / 1000)}
                          className="w-full accent-amber-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-slate-600 text-[10px] mt-1">
                          <span>Rápido</span>
                          <span>Lento</span>
                        </div>
                      </div>
                    )}

                    <p className="text-slate-500 text-sm">Los compases por acorde se configuran individualmente en cada sección abajo.</p>
                  </div>

                  {/* Patrón */}
                  <div className="space-y-4">
                    <label className="text-slate-300 text-sm font-medium block">Estilo de Rasgueo</label>
                    <select
                      value={activePatternId}
                      onChange={e => { setActivePatternId(e.target.value); setIsEditingPattern(false); }}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <optgroup label="Universales">
                        {UNIVERSAL_PATTERNS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </optgroup>
                      {customPatterns.length > 0 && (
                        <optgroup label="Mis Rasgueos">
                          {customPatterns.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                      )}
                    </select>

                    {/* Preview del patrón activo + botones Editar / Eliminar */}
                    <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <StrumVisual pattern={activePattern} animate={false} />
                      </div>
                      <button
                        onClick={() => {
                          const isCustom = customPatterns.some(p => p.id === activePatternId);
                          startEditPattern(activePattern, isCustom);
                        }}
                        title={customPatterns.some(p => p.id === activePatternId) ? 'Editar rasgueo' : 'Editar como copia'}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-teal-600/20 hover:bg-teal-600/40 text-teal-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        <IconPencil size={14} />
                        {customPatterns.some(p => p.id === activePatternId) ? 'Editar' : 'Editar copia'}
                      </button>
                      {customPatterns.find(p => p.id === activePatternId) && (
                        <button
                          onClick={() => deleteCustomPattern(activePatternId)}
                          className="shrink-0 p-1.5 bg-red-400/10 hover:bg-red-400/25 text-red-400 rounded-lg transition-colors"
                        >
                          <IconTrash size={15} />
                        </button>
                      )}
                    </div>

                    {/* Botón crear nuevo */}
                    {!isEditingPattern && (
                      <button onClick={startNewPattern} className="text-teal-400 text-sm hover:underline font-medium">
                        + Crear rasgueo nuevo
                      </button>
                    )}

                    {/* Editor */}
                    {isEditingPattern && (
                      <div className="bg-slate-800 p-4 rounded-xl border border-teal-500/40 mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="text-teal-300 font-bold text-sm">
                            {editingPatternId
                              ? `Editando: ${customPatterns.find(p => p.id === editingPatternId)?.name ?? ''}`
                              : 'Nuevo Rasgueo'}
                          </h4>
                          <button onClick={() => setIsEditingPattern(false)} className="text-slate-600 hover:text-white transition-colors">
                            <IconX size={16} />
                          </button>
                        </div>
                        <p className="text-slate-500 text-xs mb-3">Toca para ciclar: ↓ → ↑ → ⇓ → · &nbsp;|&nbsp; × para eliminar golpe</p>

                        {/* Golpes */}
                        <div className="flex flex-wrap gap-1.5 mb-4 justify-center">
                          {builderStrokes.map((stroke, idx) => (
                            <div key={idx} className="relative group">
                              <button
                                onClick={() => toggleStroke(idx)}
                                className={`w-9 h-11 rounded-lg flex items-center justify-center font-black text-xl transition-colors ${
                                  stroke === 'D'  ? 'bg-teal-600 text-white'
                                  : stroke === 'U'  ? 'bg-blue-600 text-white'
                                  : stroke === 'DL' ? 'bg-amber-500 text-slate-900'
                                  : 'bg-slate-700 text-slate-400'
                                }`}
                              >
                                {stroke === 'D' ? '↓' : stroke === 'U' ? '↑' : stroke === 'DL' ? '⇓' : '·'}
                              </button>
                              <button
                                onClick={() => deleteStroke(idx)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black hidden group-hover:flex items-center justify-center leading-none"
                              >×</button>
                            </div>
                          ))}
                          <button
                            onClick={addStroke}
                            className="w-9 h-11 rounded-lg border-2 border-dashed border-slate-600 text-slate-500 hover:border-teal-500 hover:text-teal-400 font-black text-xl transition-colors flex items-center justify-center"
                          >+</button>
                        </div>

                        {/* Nombre + Guardar */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Nombre del rasgueo..."
                            value={builderName}
                            onChange={e => setBuilderName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveCustomPattern()}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-teal-500"
                          />
                          <button
                            onClick={saveCustomPattern}
                            className="bg-teal-600 hover:bg-teal-500 active:scale-95 text-white px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-bold transition-all"
                          >
                            <IconSave size={15} />
                            {editingPatternId ? 'Actualizar' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Paleta de acordes */}
              <div>
                <h3 className="text-slate-400 font-medium mb-3 text-sm uppercase tracking-wider">Acordes de la canción</h3>
                <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-700/50">
                  {/* Botones de acordes */}
                  <div className="flex flex-wrap gap-2">
                    {uniqueChords.length === 0 && (
                      <p className="text-slate-500 text-sm">No se encontraron acordes reconocidos en esta canción.</p>
                    )}
                    {uniqueChords.map(chord => {
                      const m = segMeasures[chord] ?? 1;
                      return (
                        <button
                          key={chord}
                          onClick={() => handleChordClick(chord, undefined, undefined, 1)}
                          className={`relative px-4 py-1.5 rounded-lg font-bold text-base transition-all ${
                            selectedChord === chord
                              ? 'text-white bg-teal-600/40 border border-teal-500'
                              : 'text-slate-400 hover:text-white hover:bg-slate-700/60 border border-transparent'
                          }`}
                        >
                          {chord}
                          {m > 1 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-teal-500 text-slate-900 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                              {m}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selector de compases para el acorde seleccionado */}
                  {selectedChord && chordDictionary[selectedChord] && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/40">
                      <span className="text-slate-400 text-xs shrink-0">
                        Compases para <span className="text-teal-400 font-bold">{selectedChord}</span>:
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(n => (
                          <button
                            key={n}
                            onClick={() => setSegMeasures(prev => ({ ...prev, [selectedChord]: n }))}
                            className={`w-8 h-7 rounded-md font-bold text-sm transition-all ${
                              (segMeasures[selectedChord] ?? 1) === n
                                ? 'bg-teal-500 text-slate-900'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <span className="text-slate-500 text-xs">
                        {(segMeasures[selectedChord] ?? 1) === 1 ? 'compás' : 'compases'}
                      </span>
                      {segMeasures[selectedChord] && segMeasures[selectedChord] !== 1 && (
                        <button
                          onClick={() => setSegMeasures(prev => { const n = { ...prev }; delete n[selectedChord]; return n; })}
                          className="ml-auto text-slate-500 hover:text-red-400 text-xs transition-colors"
                          title="Restablecer a 1"
                        >
                          restablecer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Letra por secciones */}
          <div className="p-4 md:p-8 pt-0">
            <div className="max-w-3xl mx-auto">
              {playSections.map((section, sIdx) => (
                <div key={sIdx} className="mb-10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-slate-800 pb-2 gap-2">
                    <h2 className="text-teal-500 font-semibold text-lg uppercase tracking-wider">{section.title || '♪'}</h2>
                    <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                      <span className="text-slate-400 text-xs font-medium px-2">Compases por acorde:</span>
                      <button onClick={() => updateSectionMeasures(sIdx, -1)} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">-</button>
                      <span className="text-teal-400 font-bold text-sm w-4 text-center">{sectionMeasures[sIdx] ?? 1}</span>
                      <button onClick={() => updateSectionMeasures(sIdx, 1)} className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">+</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 pl-2 md:pl-12">
                    {section.lines.map(line => (
                      <LyricLine
                        key={line.id}
                        line={line}
                        isActive={activeLineId === line.id}
                        onPlay={l => handlePlayLine(l, sectionMeasures[sIdx] ?? 1)}
                        onChordClick={(chord, l, idx) => handleChordClick(chord, l, idx, sectionMeasures[sIdx] ?? 1)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Sidebar diagrama (desktop) / Modal (mobile) */}
      <aside className={`
        fixed inset-0 z-40 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4
        md:relative md:inset-auto md:w-80 md:bg-slate-800 md:border-l md:border-slate-700 md:flex-col md:justify-start md:p-6
        transition-transform duration-300 ease-in-out
        ${selectedChord ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full md:hidden'}
      `}>
        {selectedChord && (
          <div className="bg-slate-800 md:bg-transparent p-6 rounded-2xl shadow-2xl md:shadow-none relative w-full max-w-sm flex flex-col items-center">
            <button onClick={() => setSelectedChord(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white md:hidden">
              <IconX size={24} />
            </button>
            <h3 className="text-xl font-bold text-white mb-6 text-center w-full border-b border-slate-700 pb-2">Detalle del Acorde</h3>
            {chordDictionary[selectedChord] ? (
              <div className="flex flex-col items-center gap-6">
                <ChordDiagram chord={chordDictionary[selectedChord]} width={180} height={220} />
                <button
                  onClick={() => handleChordClick(selectedChord, undefined, undefined, 1)}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-lg"
                >
                  <IconPlay size={18} /> Tocar Acorde
                </button>
              </div>
            ) : (
              <p className="text-slate-400">Diagrama no disponible para {selectedChord}</p>
            )}
          </div>
        )}
        {!selectedChord && (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-500 text-center p-6">
            <span className="text-slate-700 mb-4"><IconMusic /></span>
            <p>Haz clic en un acorde en la letra o en la lista superior para ver su diagrama y escucharlo.</p>
          </div>
        )}
      </aside>

      {/* Overlay durante reproducción (oculto en modo TikTok) */}
      {!showTikTokMode && playingOverlay && (
        <div className="fixed inset-0 z-[60] overflow-y-auto pointer-events-none bg-slate-900/80 backdrop-blur-md p-4">
          <div className="min-h-full flex flex-col items-center justify-center py-4">
            <div className="bg-slate-800/95 p-4 md:p-10 rounded-3xl shadow-2xl flex flex-col items-center border border-teal-500/30 max-w-4xl w-full pointer-events-auto">

              {/* Acorde + diagrama + rasgueo */}
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-16 mb-4 md:mb-8">
                <div className="flex flex-col items-center">
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">{playingOverlay.chord}</h2>

                  {/* Selector de compases — clave por posición para evitar afectar otras ocurrencias */}
                  {(() => {
                    const overlayKey = (playingOverlay.line && playingOverlay.activeSegmentIndex !== undefined)
                      ? `${playingOverlay.line.id}:${playingOverlay.activeSegmentIndex}`
                      : playingOverlay.chord;
                    const currentM = (playingOverlay.line && playingOverlay.activeSegmentIndex !== undefined)
                      ? (segMeasures[`${playingOverlay.line.id}:${playingOverlay.activeSegmentIndex}`] ?? segMeasures[playingOverlay.chord] ?? 1)
                      : (segMeasures[playingOverlay.chord] ?? 1);
                    return (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-slate-400 text-xs">Compases:</span>
                        {[1, 2, 3, 4].map(n => (
                          <button
                            key={n}
                            onClick={() => setSegMeasures(prev => ({ ...prev, [overlayKey]: n }))}
                            className={`w-8 h-7 rounded-md font-bold text-sm transition-all ${
                              currentM === n
                                ? 'bg-teal-500 text-slate-900'
                                : 'bg-slate-700/80 text-slate-400 hover:bg-slate-600 hover:text-white'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {chordDictionary[playingOverlay.chord] && (
                    <div className="bg-slate-900/50 p-3 rounded-xl shadow-lg">
                      <ChordDiagram chord={chordDictionary[playingOverlay.chord]} width={140} height={170} />
                    </div>
                  )}
                </div>
                <div className="bg-slate-900/80 px-6 py-4 rounded-2xl border border-slate-700 flex flex-col items-center justify-center shadow-lg">
                  <StrumVisual pattern={playingOverlay.pattern} animate={true} />
                </div>
              </div>

              {/* Letra resaltada */}
              {playingOverlay.line && (
                <div className="mb-4 text-center w-full bg-slate-900/60 p-4 rounded-2xl border border-slate-700/50 shadow-inner">
                  <div className="flex flex-wrap justify-center items-end gap-x-1 md:gap-x-2 text-base md:text-2xl leading-relaxed">
                    {playingOverlay.line.segments.map((seg, idx) => {
                      const isActive = idx === playingOverlay.activeSegmentIndex;
                      return (
                        <div key={idx} className="flex flex-col items-center mx-1">
                          {seg.chord && (
                            <span className={`text-xs md:text-sm font-bold mb-1 transition-colors duration-300 ${isActive ? 'text-teal-400' : 'text-slate-600'}`}>
                              {seg.chord}
                            </span>
                          )}
                          <span className={`transition-all duration-300 whitespace-pre ${isActive ? 'text-white font-bold drop-shadow-[0_0_10px_rgba(20,184,166,0.8)]' : 'text-slate-400'}`}>
                            {seg.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={stopAll}
                className="mt-4 bg-red-500 hover:bg-red-400 text-white px-8 py-3 rounded-full flex items-center gap-3 font-bold shadow-lg transition-transform hover:scale-105"
              >
                <IconSquare size={20} /> Detener Reproducción
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modo TikTok ── */}
      {showTikTokMode && (
        <div className="fixed inset-0 z-[70] bg-slate-950 flex flex-col overflow-hidden">

          {/* Header: título/artista a la izquierda, controles a la derecha */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/70 shrink-0">
            <div className="min-w-0 flex-1">
              <p className="text-slate-300 text-xs font-medium truncate">{song.title}</p>
              <p className="text-slate-600 text-[10px] truncate">
                {tikTokCtx.sTitle ? `${tikTokCtx.sTitle} · ` : ''}{song.artist} · ♩{bpm}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {isPlayingAll
                ? <button onClick={stopAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors">
                    <IconSquare size={11} /> Detener
                  </button>
                : <button onClick={handlePlayAll} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-bold hover:bg-teal-500/30 transition-colors">
                    <IconPlay size={11} /> Iniciar
                  </button>
              }
              <button onClick={() => setShowTikTokMode(false)} className="p-1.5 text-slate-600 hover:text-white transition-colors">
                <IconX size={18} />
              </button>
            </div>
          </div>

          {/* Zona de letra — teleprompter scroll, todas las líneas */}
          <div
            ref={ttLyricsScrollRef}
            className="flex-1 min-h-0 overflow-y-auto px-5"
            style={{ scrollbarWidth: 'none' }}
          >
            {/* Padding top para que la primera línea pueda quedar centrada */}
            <div className="h-[28vh]" />
            {(() => {
              const allLines: { line: SongLine }[] = [];
              playSections.forEach(sec => sec.lines.forEach(l => allLines.push({ line: l })));
              const currentIdx = allLines.findIndex(({ line }) => line.id === activeLineId);
              return allLines.map(({ line }, idx) => {
                const isCurrent = idx === currentIdx;
                const isPast    = currentIdx >= 0 && idx < currentIdx;
                return (
                  <div
                    key={line.id}
                    data-tt-line={line.id}
                    className="flex flex-wrap justify-center gap-x-2 gap-y-1 py-3"
                  >
                    {line.segments.map((seg, i) => (
                      <div key={i} className="flex flex-col items-center">
                        {seg.chord && (
                          <span className={`text-xs font-black leading-none mb-0.5 transition-all duration-500 ${
                            isCurrent
                              ? 'text-teal-300 drop-shadow-[0_0_8px_rgba(94,234,212,0.6)]'
                              : isPast ? 'text-teal-800' : 'text-teal-500'
                          }`}>{seg.chord}</span>
                        )}
                        <span className={`whitespace-pre leading-snug transition-all duration-500 text-lg ${
                          isCurrent
                            ? 'text-teal-100 font-black drop-shadow-[0_0_12px_rgba(94,234,212,0.4)]'
                            : isPast
                            ? 'text-teal-700 font-bold'
                            : 'text-teal-300 font-semibold'
                        }`}>{seg.text}</span>
                      </div>
                    ))}
                  </div>
                );
              });
            })()}
            {/* Padding bottom para que la última línea pueda quedar centrada */}
            <div className="h-[60vh]" />
          </div>

          {/* Zona inferior: diagrama + rasgueo con cursor animado */}
          <div className="shrink-0 border-t border-slate-800/60 bg-slate-900/80 backdrop-blur px-4 pt-3 pb-5">
            <div className="flex flex-col items-center gap-2">

              {/* Acorde activo + diagrama + siguiente */}
              {playingOverlay ? (
                <div className="flex items-center justify-center gap-3 w-full">
                  <span key={playingOverlay.chord} className="text-teal-400 font-black text-3xl leading-none min-w-[2.5rem] text-center drop-shadow-[0_0_10px_rgba(94,234,212,0.5)]">
                    {playingOverlay.chord}
                  </span>
                  {chordDictionary[playingOverlay.chord] && (
                    <ChordDiagram chord={chordDictionary[playingOverlay.chord]} width={88} height={108} />
                  )}
                  {nextChordInSong && chordDictionary[nextChordInSong] && (
                    <div className="flex flex-col items-center gap-0.5 opacity-35">
                      <span className="text-[8px] text-slate-500 uppercase tracking-wider">Siguiente</span>
                      <span className="text-teal-500 font-black text-[10px]">{nextChordInSong}</span>
                      <ChordDiagram chord={chordDictionary[nextChordInSong]} width={44} height={54} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePlayAll}
                    className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-10 py-2.5 rounded-full flex items-center gap-2 font-black text-base shadow-xl transition-transform active:scale-95"
                  >
                    <IconPlay size={18} /> Iniciar
                  </button>
                  <p className="text-slate-600 text-[10px]">♩ {bpm} · {uniqueChords.length} acordes</p>
                </div>
              )}

              {/* ── Celdas de rasgueo con cursor animado ── */}
              <div className="w-full flex flex-col items-center gap-1 mt-1">
                <span className="text-slate-600 text-[9px] font-bold uppercase tracking-widest">{activePattern.name}</span>
                <div className="flex flex-wrap justify-center gap-2 items-end">
                  {activePattern.strokes.map((stroke, i) => {
                    const isActive = i === ttStrokeIdx;
                    const arrow = stroke === 'D' ? '↓' : stroke === 'U' ? '↑' : stroke === 'DL' ? '⇓' : '·';
                    const glowColor = stroke === 'DL'
                      ? 'rgba(251,191,36,0.85)'
                      : stroke === 'D'
                      ? 'rgba(94,234,212,0.85)'
                      : stroke === 'U'
                      ? 'rgba(96,165,250,0.85)'
                      : 'rgba(148,163,184,0.5)';
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5" style={{ width: 34 }}>
                        {/* Número de golpe */}
                        <span style={{
                          fontSize: 8, fontWeight: 700, lineHeight: 1,
                          transition: 'color 0.08s ease',
                          color: isActive ? '#fff' : '#334155',
                        }}>{i + 1}</span>
                        {/* Celda — tamaño fijo, solo cambia color y glow */}
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 30, height: 38, borderRadius: 8, border: '2px solid',
                          fontSize: 16, fontWeight: 900, userSelect: 'none',
                          transition: 'background 0.08s ease, border-color 0.08s ease, color 0.08s ease, box-shadow 0.08s ease',
                          boxShadow: isActive ? `0 0 14px ${glowColor}` : 'none',
                          ...(isActive
                            ? stroke === 'DL'
                              ? { background: '#d97706', borderColor: '#fcd34d', color: '#fff' }
                              : stroke === 'D'
                              ? { background: '#0d9488', borderColor: '#5eead4', color: '#fff' }
                              : stroke === 'U'
                              ? { background: '#2563eb', borderColor: '#93c5fd', color: '#fff' }
                              : { background: '#475569', borderColor: '#94a3b8', color: '#fff' }
                            : stroke === 'DL'
                            ? { background: 'rgba(120,53,15,0.35)', borderColor: 'rgba(120,53,15,0.5)', color: '#78350f', opacity: 0.55 }
                            : stroke === 'D'
                            ? { background: 'rgba(19,78,74,0.35)', borderColor: 'rgba(20,83,79,0.5)', color: '#134e4a', opacity: 0.55 }
                            : stroke === 'U'
                            ? { background: 'rgba(30,58,138,0.35)', borderColor: 'rgba(30,64,175,0.5)', color: '#1e3a8a', opacity: 0.55 }
                            : { background: 'rgba(30,41,59,0.4)', borderColor: 'rgba(51,65,85,0.4)', color: '#334155', opacity: 0.4 }
                          ),
                        }}>
                          {arrow}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
