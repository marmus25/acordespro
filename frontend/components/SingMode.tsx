import React, { useState, useEffect, useRef, useMemo } from 'react';
import YouTube from 'react-youtube';
import { SongData } from '../types';
import { ChordShape } from '../utils/chordDiagrams';
import { parseChordProLine, transposeChord, formatChordNotation } from '../utils/transpose';
import { playStrum } from '../utils/audio';
import { PianoKeyboard } from './PianoKeyboard';
import { Stroke, TimeSignature, ALL_PRESETS, TIME_SIGNATURES, presetsForTs } from '../utils/strumPresets';

type NotationType = 'english' | 'latin';

const MEASURES_OPTIONS = [1, 2, 3, 4];

const chordColor = (chord: string) => {
  const b = chord.replace(/^[CDEFGAB][#b]?/, '');
  if (/dim/i.test(b)) return '#f87171';
  if (/aug/i.test(b)) return '#c084fc';
  if (/sus/i.test(b)) return '#fbbf24';
  if (/\d/.test(b)) return '#fb923c';
  if (/^m(?!aj)/i.test(b)) return '#4ade80';
  return '#67e8f9';
};

const BigDiagram: React.FC<{ shape: ChordShape; color: string }> = ({ shape, color }) => {
  const padL = 18, padT = 28, strSp = 18, fretSp = 18, nFrets = 4;
  const W = padL * 2 + strSp * 5;
  const H = padT + nFrets * fretSp + 10;
  const sx = (s: number) => padL + s * strSp;
  const fy = (r: number) => padT + r * fretSp;
  const dCY = (r: number) => fy(r) - fretSp / 2;
  const toRow = (f: number) => f - shape.baseFret + 1;
  return (
    <div className="flex flex-col items-center">
      <span className="text-white/40 text-xs mb-1">Tr.{shape.baseFret}</span>
      <svg width={W} height={H} className="text-white/70" overflow="visible">
        {shape.baseFret === 1 && <rect x={sx(0)} y={fy(0)-2.5} width={sx(5)-sx(0)} height={4} rx={2} fill="currentColor" />}
        {[0,1,2,3,4,5].map(s => <line key={s} x1={sx(s)} y1={fy(0)} x2={sx(s)} y2={fy(nFrets)} stroke="currentColor" strokeWidth={1.3} />)}
        {Array.from({length:nFrets+1},(_,i)=><line key={i} x1={sx(0)} y1={fy(i)} x2={sx(5)} y2={fy(i)} stroke="currentColor" strokeWidth={1.3} />)}
        {shape.frets.map((f,s)=>{
          if(f===0) return <text key={s} x={sx(s)} y={fy(0)-4} textAnchor="middle" fontSize={10} fill="currentColor">○</text>;
          if(f===-1) return <text key={s} x={sx(s)} y={fy(0)-4} textAnchor="middle" fontSize={10} fill="#ef4444">×</text>;
          return null;
        })}
        {shape.barre && <rect x={sx(shape.barre.from)-4} y={dCY(toRow(shape.barre.fret))-6} width={sx(shape.barre.to)-sx(shape.barre.from)+8} height={12} rx={6} fill={color} />}
        {shape.frets.map((f,s)=>{
          if(f<=0) return null;
          const row=toRow(f);
          if(row<1||row>nFrets) return null;
          if(shape.barre&&f===shape.barre.fret&&s>=shape.barre.from&&s<=shape.barre.to) return null;
          return <circle key={s} cx={sx(s)} cy={dCY(row)} r={6} fill={color} />;
        })}
      </svg>
    </div>
  );
};

interface Props {
  song: SongData;
  transposeSteps: number;
  chordShapeMap: Map<string, ChordShape>;
  pianoNotesMap: Map<string, number[]>;
  youtubeId: string | null;
  notation: NotationType;
  applyAccidental: (chord: string) => string;
  onClose: () => void;
}

export const SingMode: React.FC<Props> = ({
  song, transposeSteps, chordShapeMap, pianoNotesMap, youtubeId, notation, applyAccidental, onClose,
}) => {
  const [selectedTs, setSelectedTs] = useState<TimeSignature>('4/4');
  const [presetIdx, setPresetIdx] = useState(0);
  const [bpm, setBpm] = useState(80);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStroke, setActiveStroke] = useState(-1);
  const [measuresPerChord, setMeasuresPerChord] = useState(2);
  const [measuresDone, setMeasuresDone] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [diagramType, setDiagramType] = useState<'guitar' | 'piano'>('guitar');
  const [showPresets, setShowPresets] = useState(false);

  const timerRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);
  const bpmRef = useRef(bpm);
  const strokeRef = useRef(0);
  const patternRef = useRef<Stroke[]>(ALL_PRESETS.filter(p => p.ts === '4/4')[0].pattern);
  const measuresPerChordRef = useRef(measuresPerChord);
  const measuresDoneRef = useRef(0);
  const idxRef = useRef(0);
  const shapeRef = useRef<ChordShape | null>(null);
  const seqRef = useRef<{ chord: string; lineIndex: number }[]>([]);
  const lyricsRef = useRef<HTMLDivElement>(null);

  const chordSequence = useMemo(() => {
    const seq: { chord: string; lineIndex: number }[] = [];
    song.lines.forEach((line, lineIndex) => {
      const parsed = parseChordProLine(line);
      for (const seg of parsed.segments) {
        if (seg.chord) {
          const t = transposeChord(seg.chord, transposeSteps);
          const last = seq[seq.length - 1];
          if (!last || last.chord !== t) seq.push({ chord: t, lineIndex });
        }
      }
    });
    return seq;
  }, [song.lines, transposeSteps]);

  // Group source lines into visual phrases. Lines are merged when a line ends
  // mid-word (last char is a letter) and the next line continues with lowercase,
  // which happens when ChordPro splits a word to align chords over syllables.
  const lineGroups = useMemo(() => {
    const groups: { lineIndices: number[]; isEmpty: boolean }[] = [];
    let current: number[] = [];

    const lineText = (line: string) =>
      parseChordProLine(line).segments.map(s => s.text).join('');

    song.lines.forEach((line, i) => {
      if (!line.trim()) {
        if (current.length) { groups.push({ lineIndices: [...current], isEmpty: false }); current = []; }
        groups.push({ lineIndices: [], isEmpty: true });
        return;
      }

      current.push(i);

      const text = lineText(line).trimEnd();
      const next = song.lines[i + 1];
      const nextText = next ? lineText(next) : '';
      // Merge if this line ends with a word-char and next starts with lowercase
      const continuesWord = /\w$/.test(text) && /^[a-záéíóúüñ]/.test(nextText) && !!next?.trim();
      if (!continuesWord) {
        groups.push({ lineIndices: [...current], isEmpty: false });
        current = [];
      }
    });

    if (current.length) groups.push({ lineIndices: [...current], isEmpty: false });
    return groups;
  }, [song.lines]);

  useEffect(() => { seqRef.current = chordSequence; }, [chordSequence]);
  useEffect(() => { bpmRef.current = bpm; }, [bpm]);
  useEffect(() => { measuresPerChordRef.current = measuresPerChord; }, [measuresPerChord]);
  const filteredPresets = useMemo(() => presetsForTs(selectedTs), [selectedTs]);
  useEffect(() => {
    const p = (filteredPresets[presetIdx] ?? filteredPresets[0]).pattern;
    patternRef.current = p;
    if (strokeRef.current >= p.length) strokeRef.current = 0;
  }, [presetIdx, filteredPresets]);

  useEffect(() => {
    const chord = chordSequence[currentIdx]?.chord;
    shapeRef.current = chord ? (chordShapeMap.get(chord) ?? null) : null;
  }, [currentIdx, chordSequence, chordShapeMap]);

  const scrollToLine = (lineIndex?: number) => {
    if (lineIndex === undefined) return;
    const el = lyricsRef.current?.querySelector(`[data-sing-line="${lineIndex}"]`) as HTMLElement | null;
    if (!el || !lyricsRef.current) return;
    const cRect = lyricsRef.current.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    lyricsRef.current.scrollBy({ top: eRect.top - cRect.top - cRect.height * 0.2, behavior: 'smooth' });
  };

  const stop = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveStroke(-1);
    strokeRef.current = 0;
    measuresDoneRef.current = 0;
    setMeasuresDone(0);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const tick = () => {
    if (!isPlayingRef.current) return;
    const p = patternRef.current;
    const stroke = p[strokeRef.current];
    setActiveStroke(strokeRef.current);
    if (shapeRef.current) {
      playStrum(stroke, shapeRef.current.frets.map(f => f === -1 ? 'x' : f === 0 ? 'o' : f as number));
    }
    const nextS = (strokeRef.current + 1) % p.length;
    strokeRef.current = nextS;
    if (nextS === 0) {
      const newM = measuresDoneRef.current + 1;
      measuresDoneRef.current = newM;
      setMeasuresDone(newM);
      if (newM >= measuresPerChordRef.current) {
        measuresDoneRef.current = 0;
        setMeasuresDone(0);
        const seq = seqRef.current;
        if (seq.length > 0) {
          idxRef.current = (idxRef.current + 1) % seq.length;
          setCurrentIdx(idxRef.current);
          scrollToLine(seq[idxRef.current]?.lineIndex);
        }
      }
    }
    timerRef.current = window.setTimeout(tick, 30000 / bpmRef.current);
  };

  const togglePlay = () => {
    if (isPlaying) { stop(); return; }
    strokeRef.current = 0;
    measuresDoneRef.current = 0;
    idxRef.current = currentIdx;
    isPlayingRef.current = true;
    setIsPlaying(true);
    setMeasuresDone(0);
    tick();
  };

  const goToChord = (i: number) => {
    setCurrentIdx(i);
    idxRef.current = i;
    scrollToLine(chordSequence[i]?.lineIndex);
  };

  const currentChord = chordSequence[currentIdx]?.chord ?? null;
  const color = currentChord ? chordColor(currentChord) : '#67e8f9';
  const shape = currentChord ? chordShapeMap.get(currentChord) ?? null : null;
  const piano = currentChord ? pianoNotesMap.get(currentChord) ?? null : null;
  const displayChord = currentChord ? formatChordNotation(applyAccidental(currentChord), notation) : '—';
  const currentPreset = filteredPresets[presetIdx] ?? filteredPresets[0];
  const pattern = currentPreset.pattern;

  useEffect(() => {
    setTimeout(() => scrollToLine(chordSequence[0]?.lineIndex), 150);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Próximos acordes para la barra de navegación
  const winStart = Math.max(0, currentIdx - 1);
  const chordWindow = chordSequence.slice(winStart, winStart + 6);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col select-none" style={{ background: '#080810' }}>

      {/* ── HEADER ── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/10">
        {/* Acorde actual en header */}
        <span className="font-black text-lg leading-none shrink-0" style={{ color, minWidth: 32 }}>
          {displayChord}
        </span>

        {/* Play / Stop */}
        <button onClick={togglePlay}
          className={`w-8 h-8 flex items-center justify-center rounded-full shrink-0 font-bold text-sm transition-colors ${isPlaying ? 'bg-red-500 text-white' : 'bg-emerald-600 text-white'}`}>
          {isPlaying ? '■' : '▶'}
        </button>

        {/* BPM slider */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <input type="range" min={40} max={200} step={5} value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            className="flex-1 min-w-0 accent-emerald-500" />
          <span className="text-white/50 text-xs shrink-0 w-10 text-right">{bpm}</span>
        </div>

        {/* Compases */}
        <div className="flex items-center gap-0.5 shrink-0">
          {MEASURES_OPTIONS.map(n => (
            <button key={n} onClick={() => setMeasuresPerChord(n)}
              className={`w-5 h-5 text-[10px] font-bold rounded transition-colors ${n === measuresPerChord ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/40 hover:bg-white/20'}`}>
              {n}
            </button>
          ))}
        </div>

        {/* Preset selector toggle — sin nombres, solo ícono */}
        <button onClick={() => setShowPresets(p => !p)}
          className={`w-7 h-7 flex items-center justify-center rounded shrink-0 transition-colors text-base ${showPresets ? 'bg-white/20 text-white' : 'text-white/30 hover:text-white/60'}`}
          title="Cambiar patrón de rasgueo">
          ≡
        </button>

        {/* Close */}
        <button onClick={() => { stop(); onClose(); }} className="text-white/30 hover:text-white text-lg leading-none shrink-0 transition-colors">✕</button>
      </div>

      {/* Preset picker — se despliega si showPresets */}
      {showPresets && (
        <div className="shrink-0 px-3 py-2 bg-white/5 border-b border-white/10">
          {/* Time signature selector */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-white/30 text-[9px] uppercase tracking-wide mr-1">Compás</span>
            {TIME_SIGNATURES.map(({ ts, label, compound }) => (
              <button key={ts}
                onClick={() => { setSelectedTs(ts); setPresetIdx(0); }}
                className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-colors leading-none ${
                  ts === selectedTs
                    ? (compound ? 'bg-violet-600 text-white' : 'bg-emerald-600 text-white')
                    : 'bg-white/10 text-white/50 hover:bg-white/20'
                }`}>
                {label}
              </button>
            ))}
            <span className={`text-[8px] ml-1 px-1 rounded font-bold ${
              TIME_SIGNATURES.find(t => t.ts === selectedTs)?.compound
                ? 'bg-violet-900/60 text-violet-300'
                : 'bg-emerald-900/60 text-emerald-400'
            }`}>
              {TIME_SIGNATURES.find(t => t.ts === selectedTs)?.compound ? 'compuesto' : 'simple'}
            </span>
          </div>
          {/* Named preset buttons */}
          <div className="flex flex-wrap gap-1">
            {filteredPresets.map((p, i) => (
              <button key={i} onClick={() => { setPresetIdx(i); setShowPresets(false); }}
                className={`px-2 py-1 text-[10px] font-bold rounded transition-colors leading-none ${
                  i === presetIdx ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* YouTube video */}
      {youtubeId && (
        <div className="shrink-0 w-full" style={{ height: '22%' }}>
          <YouTube
            videoId={youtubeId}
            opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0 } }}
            style={{ width: '100%', height: '100%' }}
            iframeClassName="w-full h-full block"
          />
        </div>
      )}

      {/* ── LETRA (scrolleable) ── */}
      <div ref={lyricsRef} className="flex-1 overflow-y-auto px-5 py-2 min-h-0" style={{ scrollbarWidth: 'none' }}>
        <div className="text-sm leading-relaxed" style={{ overflowWrap: 'anywhere' }}>
          {lineGroups.map((group, gi) => {
            if (group.isEmpty) return <div key={gi} style={{ height: 8 }} />;

            const isCurGroup = group.lineIndices.some(
              li => chordSequence[currentIdx]?.lineIndex === li
            );

            // Collect all chords across group lines
            const groupChords: { chord: string; key: string }[] = [];
            group.lineIndices.forEach(li => {
              parseChordProLine(song.lines[li]).segments.forEach((seg, si) => {
                if (seg.chord) {
                  const t = transposeChord(seg.chord, transposeSteps);
                  groupChords.push({ chord: t, key: `${li}-${si}` });
                }
              });
            });

            // Join text parts: no separator when previous ends with letter (mid-word)
            const parts = group.lineIndices
              .map(li => parseChordProLine(song.lines[li]).segments.map(s => s.text).join(''));
            const fullText = parts.reduce((acc, part) => {
              const trimmed = acc.trimEnd();
              const sep = /\w$/.test(trimmed) ? '' : ' ';
              return trimmed + sep + part;
            }, '').trimEnd();

            return (
              <div key={gi} className={`transition-opacity duration-300 mb-1 ${isCurGroup ? 'opacity-100' : 'opacity-30'}`}>
                {/* Invisible anchors so scrollToLine still works */}
                {group.lineIndices.map(li => <span key={li} data-sing-line={li} />)}
                {groupChords.length > 0 && (
                  <div className="flex flex-wrap gap-x-1.5 leading-none mb-0.5">
                    {groupChords.map(({ chord, key }) => {
                      const d = formatChordNotation(applyAccidental(chord), notation);
                      return (
                        <span key={key} className="font-bold text-xs"
                          style={{ color: chord === currentChord ? color : 'rgba(255,255,255,0.35)' }}>
                          {d}
                        </span>
                      );
                    })}
                  </div>
                )}
                {fullText && (
                  <div className={`break-words ${isCurGroup ? 'text-white' : 'text-white/30'}`}>
                    {fullText}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ height: 32 }} />
        </div>
      </div>

      {/* ── BARRA ACORDES PRÓXIMOS ── */}
      {chordSequence.length > 0 && (
        <div className="shrink-0 flex items-center gap-0.5 px-4 py-1 border-t border-white/10 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {chordWindow.map((item, wi) => {
            const actualIdx = winStart + wi;
            const isCur = actualIdx === currentIdx;
            const col = chordColor(item.chord);
            return (
              <button key={actualIdx} onClick={() => goToChord(actualIdx)}
                className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold transition-all ${isCur ? 'bg-white/15 scale-110' : 'text-white/30 hover:text-white/60'}`}
                style={{ color: isCur ? col : undefined }}>
                {formatChordNotation(applyAccidental(item.chord), notation)}
              </button>
            );
          })}
          {winStart + 6 < chordSequence.length && (
            <span className="text-white/20 text-xs shrink-0 ml-1">…</span>
          )}
        </div>
      )}

      {/* ── DIAGRAMA (horizontal: toggle | diagrama | nombre) ── */}
      <div className="shrink-0 flex items-center justify-center gap-4 px-4 py-3 border-t border-white/10"
        style={{ background: 'rgba(0,0,0,0.4)' }}>

        {/* Toggle guitarra/piano */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <button onClick={() => setDiagramType('guitar')}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-xl transition-colors ${diagramType === 'guitar' ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>
            🎸
          </button>
          <button onClick={() => setDiagramType('piano')}
            className={`w-9 h-9 flex items-center justify-center rounded-xl text-xl transition-colors ${diagramType === 'piano' ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>
            🎹
          </button>
        </div>

        {/* Diagrama */}
        <div className="flex items-center justify-center" style={{ minWidth: 90, minHeight: 90 }}>
          {diagramType === 'guitar' && shape && <BigDiagram shape={shape} color={color} />}
          {diagramType === 'piano' && piano && <PianoKeyboard notes={piano} size="large" />}
          {(diagramType === 'guitar' ? !shape : !piano) && (
            <span className="text-white/15 text-xs text-center">sin diagrama</span>
          )}
        </div>

        {/* Nombre del acorde — GRANDE */}
        <div className="flex-1 flex items-center justify-center">
          <span className="font-black leading-none transition-all"
            style={{ fontSize: 'clamp(48px, 14vw, 80px)', color, textShadow: `0 0 40px ${color}44` }}>
            {displayChord}
          </span>
        </div>
      </div>

      {/* ── RASGUEO (sin nombres de presets) ── */}
      <div className="shrink-0 px-4 py-2 border-t border-white/10" style={{ background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-end gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {pattern.map((stroke, i) => {
            const active = activeStroke === i;
            return (
              <div key={i} className="flex flex-col items-center shrink-0">
                <div className={`w-9 h-10 flex items-center justify-center rounded-xl text-base font-bold border-2 transition-all
                  ${active ? 'scale-110 ring-2' : ''}
                  ${stroke === 'D' || stroke === 'DL'
                    ? (active ? 'bg-emerald-500 border-emerald-400 text-white ring-emerald-400' : 'bg-emerald-950/60 border-emerald-800 text-emerald-400')
                    : stroke === 'U'
                    ? (active ? 'bg-purple-500 border-purple-400 text-white ring-purple-400' : 'bg-purple-950/60 border-purple-800 text-purple-400')
                    : (active ? 'bg-gray-500 border-gray-400 text-white ring-gray-400' : 'bg-gray-900 border-gray-700 text-gray-600')}`}>
                  {stroke === 'D' ? '↓' : stroke === 'DL' ? '⇓' : stroke === 'U' ? '↑' : '—'}
                </div>
              </div>
            );
          })}

          {/* Compás dots */}
          <div className="flex items-end gap-1 ml-3 pb-1 shrink-0">
            {Array.from({ length: measuresPerChord }, (_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-full border transition-all ${i < measuresDone ? 'bg-blue-500 border-blue-400 scale-110' : 'bg-white/10 border-white/15'}`} />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
