import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SongData } from '../types';
import { parseChordProLine, transposeChord, formatChordNotation } from '../utils/transpose';
import { capoToSounding, soundingToShape, ALL_NOTES } from '../utils/capo';
import { lookupChord, ChordShape } from '../utils/chordDiagrams';
import { getPianoNotes } from '../utils/pianoChords';
import { PianoKeyboard } from './PianoKeyboard';
import { listSetLists, createSetList, addSongToSetList } from '../services/setlist';
import { MetronomePanel } from './MetronomePanel';
import { ChordDiagramModal } from './ChordDiagramModal';
import {
  PrinterIcon, ArrowLeftIcon, ZoomInIcon, ZoomOutIcon, FullscreenIcon, MinimizeIcon,
  LanguageIcon, SaveIcon, EditIcon, CheckIcon, XIcon,
  AutoScrollIcon, MetronomeIcon, CapoIcon, ListMusicIcon, ChordGridIcon,
} from './Icons';

const SmallChordDiagram: React.FC<{ chordName: string; shape: ChordShape; onClick: () => void }> = ({ chordName, shape, onClick }) => {
  const padLeft = 14, padTop = 30, strSpacing = 11, fretSpacing = 14, numFrets = 4;
  const W = padLeft * 2 + strSpacing * 5 + (shape.baseFret > 1 ? 18 : 0);
  const H = padTop + numFrets * fretSpacing + 12;
  const sx = (s: number) => padLeft + s * strSpacing;
  const fy = (row: number) => padTop + row * fretSpacing;
  const dotCY = (row: number) => fy(row) - fretSpacing / 2;
  const toRow = (fret: number) => fret - shape.baseFret + 1;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center px-2 py-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shrink-0"
      title={`Ver diagrama de ${chordName}`}
    >
      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 leading-none">{chordName}</span>
      <svg width={W} height={H} className="text-gray-800 dark:text-gray-200" overflow="visible">
        {shape.baseFret > 1 && <text x={sx(5) + 5} y={fy(1) + 3} fontSize={7} fill="currentColor">{shape.baseFret}fr</text>}
        {shape.baseFret === 1 && <rect x={sx(0)} y={fy(0) - 2} width={sx(5) - sx(0)} height={3} rx={1} fill="currentColor" />}
        {[0,1,2,3,4,5].map(s => <line key={s} x1={sx(s)} y1={fy(0)} x2={sx(s)} y2={fy(numFrets)} stroke="currentColor" strokeWidth={0.8} />)}
        {Array.from({ length: numFrets + 1 }, (_, i) => <line key={i} x1={sx(0)} y1={fy(i)} x2={sx(5)} y2={fy(i)} stroke="currentColor" strokeWidth={0.8} />)}
        {shape.frets.map((fret, s) => {
          if (fret === 0) return <text key={s} x={sx(s)} y={fy(0) - 4} textAnchor="middle" fontSize={8} fill="currentColor">○</text>;
          if (fret === -1) return <text key={s} x={sx(s)} y={fy(0) - 4} textAnchor="middle" fontSize={8} fill="currentColor">×</text>;
          return null;
        })}
        {shape.barre && (
          <rect x={sx(shape.barre.from) - 5} y={dotCY(toRow(shape.barre.fret)) - 5}
            width={sx(shape.barre.to) - sx(shape.barre.from) + 10} height={10} rx={5} fill="currentColor" />
        )}
        {shape.frets.map((fret, s) => {
          if (fret <= 0) return null;
          const row = toRow(fret);
          if (row < 1 || row > numFrets) return null;
          if (shape.barre && fret === shape.barre.fret && s >= shape.barre.from && s <= shape.barre.to) return null;
          return <circle key={s} cx={sx(s)} cy={dotCY(row)} r={5} fill="currentColor" />;
        })}
      </svg>
    </button>
  );
};

interface SongViewerProps {
  song: SongData;
  savedId: string | null;
  onBack: () => void;
  onSave: (song: SongData) => void;
  onUpdate: (song: SongData) => void;
}

type NotationType = 'english' | 'latin';

export const SongViewer: React.FC<SongViewerProps> = ({ song, savedId, onBack, onSave, onUpdate }) => {
  const [transposeSteps, setTransposeSteps] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [notation, setNotation] = useState<NotationType>('english');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(song.title);
  const [editArtist, setEditArtist] = useState(song.artist);
  const [editKey, setEditKey] = useState(song.originalKey);
  const [editLines, setEditLines] = useState(song.lines.join('\n'));

  // Auto-scroll
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2);
  const scrollIntervalRef = useRef<number | null>(null);

  // Metronome
  const [showMetronome, setShowMetronome] = useState(false);

  // Capo
  const [showCapo, setShowCapo] = useState(false);
  const [capoFret, setCapoFret] = useState(0);
  const [capoMode, setCapoMode] = useState<'toSounding' | 'toShape'>('toSounding');
  const [capoNote, setCapoNote] = useState('C');

  // Chord diagram
  const [selectedChord, setSelectedChord] = useState<string | null>(null);
  const [showChordPalette, setShowChordPalette] = useState(false);
  const [paletteMode, setPaletteMode] = useState<'guitar' | 'piano'>('guitar');

  // Setlist modal
  const [showSetlistModal, setShowSetlistModal] = useState(false);
  const [setlists, setSetlists] = useState(() => listSetLists());
  const [newSetlistName, setNewSetlistName] = useState('');

  const viewerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (isFullscreen && viewerRef.current) {
          viewerRef.current.scrollTop += scrollSpeed * 0.6;
        } else {
          window.scrollBy(0, scrollSpeed * 0.6);
        }
      }, 50);
    } else {
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
    }
    return () => { if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current); };
  }, [autoScroll, scrollSpeed, isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleTranspose = (steps: number) => setTransposeSteps(prev => prev + steps);
  const handleZoom = (delta: number) => setFontSize(prev => Math.max(12, Math.min(prev + delta, 48)));
  const toggleNotation = () => setNotation(prev => prev === 'english' ? 'latin' : 'english');

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try { await viewerRef.current?.requestFullscreen(); } catch {}
    } else {
      await document.exitFullscreen();
    }
  };

  const handleEditSave = () => {
    const updated: SongData = {
      title: editTitle.trim() || song.title,
      artist: editArtist.trim() || song.artist,
      originalKey: editKey.trim() || song.originalKey,
      lines: editLines.split('\n'),
    };
    if (savedId) onUpdate(updated); else onSave(updated);
    setEditMode(false);
  };

  const handleEditCancel = () => {
    setEditTitle(song.title); setEditArtist(song.artist);
    setEditKey(song.originalKey); setEditLines(song.lines.join('\n'));
    setEditMode(false);
  };

  const handleAddToSetlist = (setlistId: string) => {
    if (!savedId) return;
    addSongToSetList(setlistId, savedId);
    setShowSetlistModal(false);
  };

  const handleCreateSetlist = () => {
    if (!newSetlistName.trim() || !savedId) return;
    const list = createSetList(newSetlistName.trim());
    addSongToSetList(list.id, savedId);
    setSetlists(listSetLists());
    setNewSetlistName('');
    setShowSetlistModal(false);
  };

  const uniqueChords = useMemo(() => {
    const chordRegex = /\[([^\]]+)\]/g;
    const seen = new Set<string>();
    const result: { name: string; guitarShape: ChordShape | null; pianoNotes: number[] | null }[] = [];
    for (const line of song.lines) {
      let m: RegExpExecArray | null;
      chordRegex.lastIndex = 0;
      while ((m = chordRegex.exec(line)) !== null) {
        const transposed = transposeChord(m[1], transposeSteps);
        if (!seen.has(transposed)) {
          const guitarShape = lookupChord(transposed);
          const pianoNotes = getPianoNotes(transposed);
          if (guitarShape || pianoNotes) {
            seen.add(transposed);
            result.push({ name: transposed, guitarShape, pianoNotes });
          }
        }
      }
    }
    return result;
  }, [song.lines, transposeSteps]);

  const currentKey = useMemo(() => {
    if (!song.originalKey) return '?';
    return formatChordNotation(transposeChord(song.originalKey, transposeSteps), notation);
  }, [song.originalKey, transposeSteps, notation]);

  const capoResult = useMemo(() => {
    if (capoFret === 0) return null;
    if (capoMode === 'toSounding') return `Suena en: ${capoToSounding(capoNote, capoFret)}`;
    return `Toca formas de: ${soundingToShape(capoNote, capoFret)}`;
  }, [capoFret, capoMode, capoNote]);

  const toolBtn = (active: boolean) =>
    `p-2 rounded-lg border transition-colors shadow-sm ${active
      ? 'bg-blue-600 border-blue-600 text-white'
      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`;

  return (
    <div
      ref={viewerRef}
      className={`max-w-4xl mx-auto bg-white dark:bg-gray-900 shadow-lg rounded-xl overflow-hidden print:shadow-none print:rounded-none print-full-width ${isFullscreen ? 'h-screen overflow-y-auto' : ''}`}
    >
      {/* Main toolbar */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 print-hidden sticky top-0 z-10 flex flex-wrap justify-between items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Volver</span>
        </button>

        {/* Transpose */}
        <div className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-gray-700 p-1.5 sm:p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 ml-1 mr-1">Tono:</span>
          <button onClick={() => handleTranspose(-1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold text-lg transition-colors">−</button>
          <div className="w-12 sm:w-16 text-center font-bold text-lg sm:text-xl text-blue-700 dark:text-blue-400 truncate px-1">{currentKey}</div>
          <button onClick={() => handleTranspose(1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold text-lg transition-colors">+</button>
          {transposeSteps !== 0 && (
            <button onClick={() => setTransposeSteps(0)} className="ml-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors">Reset</button>
          )}
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Tool toggles */}
          {uniqueChords.length > 0 && (
            <button onClick={() => setShowChordPalette(p => !p)} className={toolBtn(showChordPalette)} title="Ver acordes de la canción">
              <ChordGridIcon className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setAutoScroll(a => !a)} className={toolBtn(autoScroll)} title="Auto-scroll">
            <AutoScrollIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowMetronome(m => !m)} className={toolBtn(showMetronome)} title="Metrónomo">
            <MetronomeIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowCapo(c => !c)} className={toolBtn(showCapo)} title="Calculadora de cejilla">
            <CapoIcon className="w-5 h-5" />
          </button>
          {savedId && (
            <button onClick={() => { setSetlists(listSetLists()); setShowSetlistModal(true); }} className={toolBtn(false)} title="Agregar a setlist">
              <ListMusicIcon className="w-5 h-5" />
            </button>
          )}

          {/* Notation */}
          <button onClick={toggleNotation} className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition-colors shadow-sm" title={notation === 'english' ? 'Cambiar a Do, Re, Mi' : 'Cambiar a C, D, E'}>
            <LanguageIcon className="w-5 h-5" />
            <span className="hidden md:inline font-medium text-sm">{notation === 'english' ? 'CDE' : 'DoReMi'}</span>
          </button>

          {/* Zoom */}
          <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
            <button onClick={() => handleZoom(-2)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />
            <button onClick={() => handleZoom(2)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors shadow-sm" title={isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}>
            {isFullscreen ? <MinimizeIcon className="w-5 h-5" /> : <FullscreenIcon className="w-5 h-5" />}
          </button>

          {/* Edit */}
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors shadow-sm" title="Editar acordes">
              <EditIcon className="w-5 h-5" />
            </button>
          )}

          {/* Save */}
          {!editMode && (
            <button
              onClick={() => savedId ? onUpdate(song) : onSave(song)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors shadow-sm ${savedId ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}
              title={savedId ? 'Guardada' : 'Guardar en cancionero'}
            >
              <SaveIcon className="w-5 h-5" />
              <span className="hidden sm:inline font-medium text-sm">{savedId ? 'Guardada' : 'Guardar'}</span>
            </button>
          )}

          {/* Edit confirm/cancel */}
          {editMode && (
            <>
              <button onClick={handleEditSave} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium">
                <CheckIcon className="w-4 h-4" /> Guardar
              </button>
              <button onClick={handleEditCancel} className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium">
                <XIcon className="w-4 h-4" /> Cancelar
              </button>
            </>
          )}

          {/* Print */}
          {!editMode && (
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors shadow-sm" title="Imprimir">
              <PrinterIcon className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Imprimir</span>
            </button>
          )}
        </div>
      </div>

      {/* Auto-scroll speed panel */}
      {autoScroll && (
        <div className="flex items-center gap-3 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800 print-hidden">
          <span className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">Auto-scroll activo</span>
          <input type="range" min={1} max={8} value={scrollSpeed} onChange={e => setScrollSpeed(Number(e.target.value))} className="w-32 accent-yellow-600" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400">Velocidad: {scrollSpeed}</span>
          <button onClick={() => setAutoScroll(false)} className="ml-auto text-xs text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 font-medium">Detener</button>
        </div>
      )}

      {/* Metronome panel */}
      {showMetronome && <MetronomePanel />}

      {/* Capo panel */}
      {showCapo && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800 print-hidden">
          <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Cejilla</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-purple-600 dark:text-purple-400">Traste:</label>
            <input type="number" min={0} max={11} value={capoFret} onChange={e => setCapoFret(Number(e.target.value))} className="w-14 text-center border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <select value={capoMode} onChange={e => setCapoMode(e.target.value as any)} className="text-sm border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-purple-500">
            <option value="toSounding">Tocas → ¿Qué suena?</option>
            <option value="toShape">Quieres sonar → ¿Qué tocas?</option>
          </select>
          <select value={capoNote} onChange={e => setCapoNote(e.target.value)} className="text-sm border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-purple-500">
            {ALL_NOTES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          {capoResult && (
            <span className="font-bold text-purple-700 dark:text-purple-300 text-sm">{capoResult}</span>
          )}
        </div>
      )}

      {/* Chord palette */}
      {showChordPalette && uniqueChords.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 print-hidden">
          <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-2 shrink-0">Acordes</span>
            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5 ml-auto shrink-0">
              <button
                onClick={() => setPaletteMode('guitar')}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${paletteMode === 'guitar' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >Guitarra</button>
              <button
                onClick={() => setPaletteMode('piano')}
                className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${paletteMode === 'piano' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
              >Piano</button>
            </div>
          </div>
          <div className="flex items-start gap-1 px-3 pb-2 overflow-x-auto">
            {paletteMode === 'guitar'
              ? uniqueChords.filter(c => c.guitarShape).map(({ name, guitarShape }) => (
                <SmallChordDiagram
                  key={name}
                  chordName={name}
                  shape={guitarShape!}
                  onClick={() => setSelectedChord(name)}
                />
              ))
              : uniqueChords.filter(c => c.pianoNotes).map(({ name, pianoNotes }) => (
                <button
                  key={name}
                  onClick={() => setSelectedChord(name)}
                  className="flex flex-col items-center px-2 py-1 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shrink-0"
                  title={`Ver diagrama de ${name}`}
                >
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 leading-none">{name}</span>
                  <PianoKeyboard notes={pianoNotes!} size="small" />
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* Song Content */}
      <div className="p-6 sm:p-10 print:p-0 print:pt-4 bg-white dark:bg-gray-900 min-h-full">
        {editMode ? (
          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Título" />
              <input className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={editArtist} onChange={e => setEditArtist(e.target.value)} placeholder="Artista" />
              <input className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-400 font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" value={editKey} onChange={e => setEditKey(e.target.value)} placeholder="Tono (ej. Em)" />
            </div>
            <p className="text-xs text-gray-400">Formato ChordPro: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">[Em]palabra [Am]otra</code></p>
            <textarea className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" rows={20} value={editLines} onChange={e => setEditLines(e.target.value)} />
          </div>
        ) : (
          <div className="mb-8 text-center sm:text-left print:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">{song.title}</h1>
            <h2 className="text-xl text-gray-600 dark:text-gray-400">{song.artist}</h2>
          </div>
        )}

        {!editMode && (
          <div className="font-mono leading-relaxed print-exact-colors" style={{ fontSize: `${fontSize}px` }}>
            {song.lines.map((line, lineIndex) => {
              if (!line.trim()) return <div key={lineIndex} style={{ height: `${fontSize * 1.5}px` }} />;
              const parsedLine = parseChordProLine(line);
              return (
                <div key={lineIndex} className="flex flex-wrap mb-2 print-break-inside-avoid">
                  {parsedLine.segments.map((segment, segIndex) => {
                    let displayChord: string | null = null;
                    let rawChord: string | null = null;
                    if (segment.chord) {
                      const transposed = transposeChord(segment.chord, transposeSteps);
                      rawChord = transposed;
                      displayChord = formatChordNotation(transposed, notation);
                    }
                    return (
                      <div key={segIndex} className="flex flex-col mr-1">
                        <div className="flex items-end" style={{ height: `${fontSize * 1.2}px` }}>
                          {displayChord && (
                            <span
                              className={`font-bold text-chord select-all ${lookupChord(rawChord!) ? 'cursor-pointer hover:underline hover:text-blue-800 dark:hover:text-blue-300' : ''}`}
                              onClick={() => rawChord && lookupChord(rawChord) && setSelectedChord(rawChord)}
                              title={lookupChord(rawChord!) ? 'Ver diagrama' : undefined}
                            >
                              {displayChord}
                            </span>
                          )}
                        </div>
                        <div className="whitespace-pre text-gray-900 dark:text-gray-100">
                          {segment.text || (segment.chord ? ' ' : '')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chord diagram modal */}
      {selectedChord && <ChordDiagramModal chordName={selectedChord} onClose={() => setSelectedChord(null)} />}

      {/* Setlist modal */}
      {showSetlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSetlistModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl w-80 max-h-96 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Agregar a setlist</h3>
              <button onClick={() => setShowSetlistModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {setlists.length === 0 && <p className="text-sm text-gray-400 py-2">No tienes setlists. Crea una:</p>}
              {setlists.map(list => (
                <button key={list.id} onClick={() => handleAddToSetlist(list.id)} className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl text-sm font-medium text-gray-900 dark:text-white transition-colors">
                  {list.name} <span className="text-gray-400 font-normal">({list.songIds.length})</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <input
                className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nueva setlist..."
                value={newSetlistName}
                onChange={e => setNewSetlistName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateSetlist(); }}
              />
              <button onClick={handleCreateSetlist} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
