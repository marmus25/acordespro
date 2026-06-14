import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import YouTube from 'react-youtube';
import { SongData } from '../types';
import { parseChordProLine, transposeChord, formatChordNotation } from '../utils/transpose';
import { capoToSounding, soundingToShape, ALL_NOTES } from '../utils/capo';
import { lookupChord, ChordShape } from '../utils/chordDiagrams';
import { getPianoNotes } from '../utils/pianoChords';
import { PianoKeyboard } from './PianoKeyboard';
import { listSetLists, createSetList, addSongToSetList } from '../services/setlist';
import { MetronomePanel } from './MetronomePanel';
import { ChordDiagramModal } from './ChordDiagramModal';
import { PracticePanel } from './PracticePanel';
import {
  PrinterIcon, ArrowLeftIcon, ZoomInIcon, ZoomOutIcon, FullscreenIcon, MinimizeIcon,
  LanguageIcon, SaveIcon, EditIcon, CheckIcon, XIcon,
  AutoScrollIcon, MetronomeIcon, CapoIcon, ListMusicIcon, ChordGridIcon, SparklesIcon, InlineChordIcon, ShareIcon, TwoColumnsIcon, PlayCircleIcon, PhoneVerticalIcon, PracticeModeIcon, FloatingChordIcon, SingModeIcon,
} from './Icons';
import { SingMode } from './SingMode';
import { publishCommunitySong } from '../services/communitySongs';
import { ChordPlayView } from './ChordPlayView';
import { AudioFX } from './AudioFX';

const EqToolbarIcon = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
    <rect x="2"  y="13" width="3" height="9" rx="1.5" />
    <rect x="2"  y="2"  width="3" height="4" rx="1.5" opacity={0.35}/>
    <rect x="7"  y="7"  width="3" height="15" rx="1.5" />
    <rect x="7"  y="2"  width="3" height="3"  rx="1.5" opacity={0.35}/>
    <rect x="12" y="4"  width="3" height="18" rx="1.5" />
    <rect x="12" y="2"  width="3" height="1"  rx="1.5" opacity={0.35}/>
    <rect x="17" y="9"  width="3" height="13" rx="1.5" />
    <rect x="17" y="2"  width="3" height="5"  rx="1.5" opacity={0.35}/>
  </svg>
);

const SmallChordDiagram: React.FC<{ chordName: string; shape: ChordShape; onClick: () => void }> = ({ chordName, shape, onClick }) => {
  const padLeft = 12, padTop = 20, strSpacing = 10, fretSpacing = 11, numFrets = 4;
  const W = padLeft * 2 + strSpacing * 5;
  const H = padTop + numFrets * fretSpacing + 8;
  const sx = (s: number) => padLeft + s * strSpacing;
  const fy = (row: number) => padTop + row * fretSpacing;
  const dotCY = (row: number) => fy(row) - fretSpacing / 2;
  const toRow = (fret: number) => fret - shape.baseFret + 1;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center px-1 py-1 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors shrink-0"
      title={`Ver diagrama de ${chordName}`}
    >
      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1 leading-none">{chordName}</span>
      <svg width={W} height={H} className="text-gray-800 dark:text-gray-200" overflow="visible">
        <rect x={(W - 56) / 2} y={6} width={56} height={14} rx={7} fill="currentColor" opacity={0.1} />
        <text x={W / 2} y={17} textAnchor="middle" fontSize={8} fontWeight="700" fill="currentColor">Traste {shape.baseFret}</text>
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

const TINY_SVG_H = 40;
const TINY_DIAGRAM_H = 50; // 10px label + 40px diagram
const BOTH_DIAGRAM_H = 83; // guitar (50) + gap (2) + piano small (31)

const TinyChordDiagram: React.FC<{ shape: ChordShape; onClick: () => void; bright?: boolean }> = ({ shape, onClick, bright = false }) => {
  const padLeft = 7, padTop = 5, strSpacing = 8, fretSpacing = 7, numFrets = 4;
  const W = padLeft * 2 + strSpacing * 5;
  const H = TINY_SVG_H;
  const sx = (s: number) => padLeft + s * strSpacing;
  const fy = (row: number) => padTop + row * fretSpacing;
  const dotCY = (row: number) => fy(row) - fretSpacing / 2;
  const toRow = (fret: number) => fret - shape.baseFret + 1;
  return (
    <button onClick={onClick} title="Ver diagrama completo" className="hover:opacity-70 transition-opacity focus:outline-none flex flex-col items-start">
      <div style={{ height: 10 }} className="flex items-center justify-start w-full">
        <span className={`text-[10px] font-black leading-none px-1 py-px rounded ${bright ? 'bg-cyan-500/30 text-cyan-200' : 'bg-blue-600 text-white'}`}>
          {shape.baseFret}fr
        </span>
      </div>
      <svg width={W} height={H} className={bright ? 'text-cyan-400 block' : 'text-blue-700 dark:text-blue-400 block'} overflow="visible">
        {shape.baseFret === 1 && (
          <rect x={sx(0)} y={fy(0) - 2} width={sx(5) - sx(0)} height={2.5} rx={1} fill="currentColor" />
        )}
        {[0,1,2,3,4,5].map(s => (
          <line key={s} x1={sx(s)} y1={fy(0)} x2={sx(s)} y2={fy(numFrets)} stroke="currentColor" strokeWidth={0.75} />
        ))}
        {Array.from({ length: numFrets + 1 }, (_, i) => (
          <line key={i} x1={sx(0)} y1={fy(i)} x2={sx(5)} y2={fy(i)} stroke="currentColor" strokeWidth={0.75} />
        ))}
        {shape.frets.map((fret, s) => {
          if (fret === 0) return <text key={s} x={sx(s)} y={fy(0) - 2} textAnchor="middle" fontSize={6} fill="currentColor">○</text>;
          if (fret === -1) return <text key={s} x={sx(s)} y={fy(0) - 2} textAnchor="middle" fontSize={6} fill="currentColor">×</text>;
          return null;
        })}
        {shape.barre && (
          <rect
            x={sx(shape.barre.from) - 3.5} y={dotCY(toRow(shape.barre.fret)) - 4}
            width={sx(shape.barre.to) - sx(shape.barre.from) + 7} height={8} rx={4}
            fill="currentColor"
          />
        )}
        {shape.frets.map((fret, s) => {
          if (fret <= 0) return null;
          const row = toRow(fret);
          if (row < 1 || row > numFrets) return null;
          if (shape.barre && fret === shape.barre.fret && s >= shape.barre.from && s <= shape.barre.to) return null;
          return <circle key={s} cx={sx(s)} cy={dotCY(row)} r={4} fill="currentColor" />;
        })}
      </svg>
    </button>
  );
};

const FloatChordDiagramSVG: React.FC<{ shape: ChordShape; color: string; size?: 'md' | 'sm' }> = ({ shape, color, size = 'md' }) => {
  const padL = size === 'md' ? 14 : 10, padT = size === 'md' ? 26 : 20;
  const strSp = size === 'md' ? 13 : 10, fretSp = size === 'md' ? 13 : 10, nFrets = 4;
  const W = padL * 2 + strSp * 5, H = padT + nFrets * fretSp + 10;
  const sx = (s: number) => padL + s * strSp;
  const fy = (row: number) => padT + row * fretSp;
  const dotCY = (row: number) => fy(row) - fretSp / 2;
  const toRow = (fret: number) => fret - shape.baseFret + 1;
  const r = size === 'md' ? 5 : 4;
  const fs = size === 'md' ? 9 : 7;
  return (
    <div className="flex flex-col items-center">
      <span className="text-white font-bold text-sm mb-0.5 leading-none" style={{ textShadow: `0 0 8px ${color}88` }}>Tr.{shape.baseFret}</span>
      <svg width={W} height={H} className="text-white/90" overflow="visible">
        {shape.baseFret === 1 && <rect x={sx(0)} y={fy(0)-2.5} width={sx(5)-sx(0)} height={3.5} rx={1.5} fill="currentColor" />}
        {[0,1,2,3,4,5].map(s => <line key={s} x1={sx(s)} y1={fy(0)} x2={sx(s)} y2={fy(nFrets)} stroke="currentColor" strokeWidth={0.9} />)}
        {Array.from({length: nFrets+1}, (_,i) => <line key={i} x1={sx(0)} y1={fy(i)} x2={sx(5)} y2={fy(i)} stroke="currentColor" strokeWidth={0.9} />)}
        {shape.frets.map((fret, s) => {
          if (fret === 0) return <text key={s} x={sx(s)} y={fy(0)-4} textAnchor="middle" fontSize={fs} fill="currentColor">○</text>;
          if (fret === -1) return <text key={s} x={sx(s)} y={fy(0)-4} textAnchor="middle" fontSize={fs} fill="#ef4444">×</text>;
          return null;
        })}
        {shape.barre && <rect x={sx(shape.barre.from)-4} y={dotCY(toRow(shape.barre.fret))-(r+1)} width={sx(shape.barre.to)-sx(shape.barre.from)+8} height={(r+1)*2} rx={r+1} fill={color} />}
        {shape.frets.map((fret, s) => {
          if (fret <= 0) return null;
          const row = toRow(fret);
          if (row < 1 || row > nFrets) return null;
          if (shape.barre && fret === shape.barre.fret && s >= shape.barre.from && s <= shape.barre.to) return null;
          return <circle key={s} cx={sx(s)} cy={dotCY(row)} r={r} fill={color} />;
        })}
      </svg>
    </div>
  );
};

const getChordTypeClass = (chord: string) => {
  const b = chord.replace(/^[CDEFGAB][#b]?/, '');
  if (/dim/i.test(b)) return 'text-red-500 dark:text-red-400';
  if (/aug/i.test(b)) return 'text-purple-500 dark:text-purple-400';
  if (/sus/i.test(b)) return 'text-yellow-500 dark:text-yellow-400';
  if (/\d/.test(b)) return 'text-orange-500 dark:text-orange-400';
  if (/^m(?!aj)/i.test(b)) return 'text-green-600 dark:text-green-400';
  return 'text-blue-600 dark:text-blue-400';
};

const getChordColorTT = (chord: string) => {
  const b = chord.replace(/^[CDEFGAB][#b]?/, '');
  if (/dim/i.test(b)) return '#f87171';
  if (/aug/i.test(b)) return '#c084fc';
  if (/sus/i.test(b)) return '#fbbf24';
  if (/\d/.test(b)) return '#fb923c';
  if (/^m(?!aj)/i.test(b)) return '#4ade80';
  return '#67e8f9';
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
  const prevAutoScrollRef = useRef(false);
  const [nextChord, setNextChord] = useState<string | null>(null);

  // Metronome
  const [showMetronome, setShowMetronome] = useState(false);

  // Audio EQ
  const [showEQ, setShowEQ] = useState(false);

  // Community publish
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  // Accidentals & key display
  const [useFlats, setUseFlats] = useState(false);
  const [showRelativeKey, setShowRelativeKey] = useState(false);
  const [showInlineDiagrams, setShowInlineDiagrams] = useState(false);

  // Layout
  const [twoColumns, setTwoColumns] = useState(false);

  // Practice mode
  const [showPracticeMode, setShowPracticeMode] = useState(false);
  const [practiceChord, setPracticeChord] = useState<string | null>(null);
  const [practiceIsPlaying, setPracticeIsPlaying] = useState(false);
  const [practiceTs, setPracticeTs] = useState<import('../utils/strumPresets').TimeSignature>('4/4');
  const [practicePresetIdx, setPracticePresetIdx] = useState(0);
  const chordCursorRef = useRef(-1);           // index into [data-chord-display] spans for strum-sync
  const practiceIsPlayingRef = useRef(false);  // for use inside intervals without stale closure
  const floatingChordRef = useRef<string | null>(null);

  // Floating chord display
  const [showFloatingChord, setShowFloatingChord] = useState(false);
  const [floatingChord, setFloatingChord] = useState<string | null>(null);
  const [floatingDiagramType, setFloatingDiagramType] = useState<'guitar' | 'piano'>('guitar');

  // PDF share
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Quick chord fix
  const [chordEditMode, setChordEditMode] = useState(false);
  const [editingChordPos, setEditingChordPos] = useState<{ lineIndex: number; segIndex: number } | null>(null);
  const [editingChordValue, setEditingChordValue] = useState('');
  const [movingChordLine, setMovingChordLine] = useState<{ lineIndex: number } | null>(null);
  const [movingChordLineText, setMovingChordLineText] = useState('');

  // Sing mode
  const [showSingMode, setShowSingMode] = useState(false);

  // ChordPlay mode
  const [showChordPlay, setShowChordPlay] = useState(false);

  // TikTok / vertical mode
  const [showTikTokMode, setShowTikTokMode] = useState(false);
  const [tikTokBg, setTikTokBg] = useState<'black' | 'blue' | 'purple' | 'green'>('black');
  const tiktokScrollRef = useRef<HTMLDivElement>(null);
  const tiktokVerseEls = useRef<(HTMLDivElement | null)[]>([]);
  const tiktokVerseIdx = useRef(0);
  const tiktokPageTimer = useRef<number | null>(null);
  // Compases por acorde en modo vertical (persistido por canción)
  // Clave por índice de posición en el DOM (no por nombre) para soportar acordes repetidos
  const [ttChordMeasures, setTtChordMeasures] = useState<Record<number, number>>({});
  const [ttChordIdx, setTtChordIdx] = useState(-1);
  const ttMeasuresKey = useMemo(
    () => `tiktok_segmeasures_${song.title}_${song.artist}`.replace(/\s+/g, '_'),
    [song.title, song.artist]
  );

  // Media panel
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [mediaTab, setMediaTab] = useState<'audio' | 'video'>('audio');
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  const [videoInput, setVideoInput] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(() => {
    if (!song.youtubeUrl) return null;
    const m = song.youtubeUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  });
  const [directVideoUrl, setDirectVideoUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const applyAccidental = (chord: string): string => {
    if (!useFlats) return chord;
    const map: Record<string, string> = { 'C#':'Db','D#':'Eb','F#':'Gb','G#':'Ab','A#':'Bb' };
    return chord.replace(/[CDEFGAB]#/g, m => map[m] ?? m);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      // Obtener el YouTube ID: del estado, o extrayéndolo del input si el usuario no clickeó "Cargar"
      const effectiveYoutubeId = youtubeId ?? (() => {
        const m = videoInput.trim().match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return m ? m[1] : null;
      })();
      const songWithVideo: SongData = {
        ...song,
        youtubeUrl: effectiveYoutubeId
          ? `https://youtube.com/watch?v=${effectiveYoutubeId}`
          : song.youtubeUrl,
      };
      await publishCommunitySong(songWithVideo);
      setPublished(true);
    } catch (err: any) {
      alert('No se pudo compartir la canción: ' + (err?.message ?? 'Error desconocido'));
    } finally {
      setPublishing(false);
    }
  };

  const sharePdf = async () => {
    if (!contentRef.current) return;
    setGeneratingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      // Expandir temporalmente overflow para capturar diagramas que salgan del contenedor
      const el = contentRef.current;
      const overEls = Array.from(el.querySelectorAll<HTMLElement>('*')).filter(e => {
        const s = window.getComputedStyle(e);
        return s.overflowX === 'auto' || s.overflowX === 'scroll' ||
               s.overflowY === 'auto' || s.overflowY === 'scroll';
      });
      const savedOverflow = overEls.map(e => ({ e, ox: e.style.overflowX, oy: e.style.overflowY }));
      overEls.forEach(e => { e.style.overflowX = 'visible'; e.style.overflowY = 'visible'; });

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
        windowHeight: el.scrollHeight,
        height: el.scrollHeight,
      });

      // Restaurar overflow
      savedOverflow.forEach(({ e, ox, oy }) => { e.style.overflowX = ox; e.style.overflowY = oy; });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;
      const mmPerPx = pdfW / canvas.width; // canvas pixel → mm

      // Recoger posición (top/bottom en mm) de TODOS los bloques de ambas columnas
      const elRect = contentRef.current.getBoundingClientRect();
      const blocks: { top: number; bottom: number }[] = [];
      contentRef.current.querySelectorAll<HTMLElement>('.print-break-inside-avoid').forEach(bl => {
        const r = bl.getBoundingClientRect();
        const top = (r.top - elRect.top) * 2 * mmPerPx;
        const bot = (r.bottom - elRect.top) * 2 * mmPerPx;
        if (bot > 0 && top < imgH) blocks.push({ top, bottom: bot });
      });

      // y es seguro si NINGÚN bloque lo atraviesa (de ninguna columna)
      const isSafe = (y: number) =>
        !blocks.some(b => b.top + 0.5 < y && b.bottom - 0.5 > y);

      // Paginar usando cortes seguros
      let yStart = 0;
      let pageNum = 0;
      while (yStart < imgH - 1) {
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -yStart, pdfW, imgH);
        const idealBreak = yStart + pdfH;
        if (idealBreak >= imgH) break;

        // Candidatos: todos los "bottom" de bloques antes del corte ideal (descendente)
        const candidates = blocks
          .map(b => b.bottom)
          .filter(y => y > yStart + 2 && y <= idealBreak)
          .sort((a, b) => b - a);

        let nextStart = idealBreak;
        for (const c of candidates) {
          if (isSafe(c)) { nextStart = c; break; }
        }
        yStart = nextStart;
        pageNum++;
      }
      const blob = pdf.output('blob');
      const fileName = `${song.title} - ${song.artist}.pdf`;
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (isMobile && typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: song.title });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      alert('No se pudo generar el PDF. Usá el botón Imprimir.');
    } finally {
      setGeneratingPdf(false);
    }
  };

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

  // Auto-scroll effect — TikTok: verse-by-verse; regular: pixel scroll
  useEffect(() => {
    if (!autoScroll) {
      prevAutoScrollRef.current = false;
      if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current);
      if (tiktokPageTimer.current) clearInterval(tiktokPageTimer.current);
      return;
    }

    if (showTikTokMode && tiktokScrollRef.current) {
      // Scroll continuo tipo teleprompter: pixel a pixel para leer acordes al ritmo de la canción
      tiktokPageTimer.current = window.setInterval(() => {
        const container = tiktokScrollRef.current;
        if (!container) return;
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 4) {
          setAutoScroll(false);
          return;
        }
        container.scrollTop += scrollSpeed * 0.6;
        // Detectar acorde actual: el último que quedó en/sobre la línea de lectura
        const contRect = container.getBoundingClientRect();
        const lineY = contRect.top + contRect.height * 0.35;
        const els = Array.from(container.querySelectorAll<HTMLElement>('[data-chord]'));
        let current: string | null = null;
        let firstBelow: string | null = null;
        for (const el of els) {
          const top = el.getBoundingClientRect().top;
          if (top <= lineY) { current = el.getAttribute('data-chord'); }
          else if (!firstBelow) { firstBelow = el.getAttribute('data-chord'); }
        }
        const next = current ?? firstBelow;
        setNextChord(prev => prev === next ? prev : next);
      }, 50);
      return () => { if (tiktokPageTimer.current) clearInterval(tiktokPageTimer.current); };
    }

    // Regular pixel scroll
    scrollIntervalRef.current = window.setInterval(() => {
      if (isFullscreen && viewerRef.current) {
        viewerRef.current.scrollTop += scrollSpeed * 0.6;
      } else {
        window.scrollBy(0, scrollSpeed * 0.6);
      }
    }, 50);
    return () => { if (scrollIntervalRef.current) clearInterval(scrollIntervalRef.current); };
  }, [autoScroll, scrollSpeed, isFullscreen, showTikTokMode]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!showFloatingChord) { setFloatingChord(null); return; }
    const detect = () => {
      const els = document.querySelectorAll<HTMLElement>('[data-chord-display]');
      const lineY = window.innerHeight * 0.4;
      let last: string | null = null;
      let firstVisible: string | null = null;
      for (const el of Array.from(els)) {
        const top = el.getBoundingClientRect().top;
        if (top < lineY) last = el.getAttribute('data-chord-display');
        if (firstVisible === null && top > 0 && top < window.innerHeight) firstVisible = el.getAttribute('data-chord-display');
      }
      // Si todavía no pasó ningún acorde la línea, muestra el primero visible en pantalla
      setFloatingChord(last ?? firstVisible);
    };
    window.addEventListener('scroll', detect, { passive: true });
    const vr = viewerRef.current;
    vr?.addEventListener('scroll', detect, { passive: true });
    detect();
    return () => {
      window.removeEventListener('scroll', detect);
      vr?.removeEventListener('scroll', detect);
    };
  }, [showFloatingChord]);

  // Auto-activar diagrama flotante cuando arranca el auto-scroll
  useEffect(() => {
    if (autoScroll) setShowFloatingChord(true);
  }, [autoScroll]);

  // Mantener ref del chord flotante para callbacks sin closure stale
  useEffect(() => { floatingChordRef.current = floatingChord; }, [floatingChord]);

  // Sincronizar el acorde del PracticePanel con el acorde flotante detectado por scroll
  useEffect(() => {
    if (showPracticeMode && floatingChord) setPracticeChord(floatingChord);
  }, [floatingChord, showPracticeMode]);

  const handleRestartPractice = useCallback(() => {
    chordCursorRef.current = -1;
    // Reutiliza handleNextChord que ya contiene la lógica de scroll y selección
    // Se llama con timeout para que el estado se actualice antes
    setTimeout(() => {
      const spans = Array.from(document.querySelectorAll<HTMLElement>('[data-chord-display]'));
      if (spans.length === 0) return;
      chordCursorRef.current = 0;
      setTtChordIdx(0);
      const target = spans[0];
      const chord = target.getAttribute('data-chord-display');
      setFloatingChord(chord);
      if (chord) { setPracticeChord(chord); setNextChord(chord); }
      const rect = target.getBoundingClientRect();
      if (showTikTokMode && tiktokScrollRef.current) {
        tiktokScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (isFullscreen && viewerRef.current) {
        viewerRef.current.scrollTop = 0;
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);
  }, [isFullscreen, showTikTokMode]);

  // Strum-sync: avanzar al siguiente acorde en el DOM cuando el PracticePanel completa N compases
  const handleNextChord = useCallback(() => {
    const spans = Array.from(document.querySelectorAll<HTMLElement>('[data-chord-display]'));
    if (spans.length === 0) return;
    chordCursorRef.current = (chordCursorRef.current + 1) % spans.length;
    setTtChordIdx(chordCursorRef.current);
    const target = spans[chordCursorRef.current];
    const chord = target.getAttribute('data-chord-display');
    setFloatingChord(chord);
    if (chord) { setPracticeChord(chord); setNextChord(chord); }
    // Scroll target a la línea de lectura
    const rect = target.getBoundingClientRect();
    if (showTikTokMode && tiktokScrollRef.current) {
      const contRect = tiktokScrollRef.current.getBoundingClientRect();
      const delta = (rect.top - contRect.top) - contRect.height * 0.35;
      tiktokScrollRef.current.scrollBy({ top: delta, behavior: 'smooth' });
    } else if (isFullscreen && viewerRef.current) {
      viewerRef.current.scrollTop += rect.top - window.innerHeight * 0.4;
    } else {
      window.scrollBy({ top: rect.top - window.innerHeight * 0.4, behavior: 'smooth' });
    }
  }, [isFullscreen, showTikTokMode]);

  // Cuando el PracticePanel arranca/para, inicializar cursor y sincronizar scroll en modo TikTok
  const handlePracticePlayChange = useCallback((playing: boolean) => {
    setPracticeIsPlaying(playing);
    practiceIsPlayingRef.current = playing;
    if (playing) {
      const spans = Array.from(document.querySelectorAll<HTMLElement>('[data-chord-display]'));
      const cur = floatingChordRef.current;
      const idx = cur ? spans.findIndex(s => s.getAttribute('data-chord-display') === cur) : -1;
      // idx (no idx-1): el primer handleNextChord avanza al SIGUIENTE acorde,
      // no repite el acorde actual (evita el compás extra al inicio)
      chordCursorRef.current = idx >= 0 ? idx : -1;
      setTtChordIdx(idx >= 0 ? idx : -1);
      // En modo TikTok: arrancar el scroll también
      if (showTikTokMode) setAutoScroll(true);
    } else {
      chordCursorRef.current = -1;
      // En modo TikTok: detener el scroll también
      if (showTikTokMode) setAutoScroll(false);
    }
  }, [showTikTokMode]);

  useEffect(() => {
    if (showTikTokMode) {
      tiktokVerseIdx.current = 0;
      setNextChord(null);
      tiktokScrollRef.current?.scrollTo({ top: 0 });
      const container = tiktokScrollRef.current;
      if (!container) return;
      const detectChord = () => {
        const contRect = container.getBoundingClientRect();
        const lineY = contRect.top + contRect.height * 0.35;
        const els = Array.from(container.querySelectorAll<HTMLElement>('[data-chord]'));
        let current: string | null = null;
        let firstBelow: string | null = null;
        for (const el of els) {
          const top = el.getBoundingClientRect().top;
          if (top <= lineY) {
            current = el.getAttribute('data-chord');
          } else if (!firstBelow) {
            firstBelow = el.getAttribute('data-chord');
          }
        }
        setNextChord(current ?? firstBelow);
      };
      container.addEventListener('scroll', detectChord, { passive: true });
      setTimeout(detectChord, 50);
      return () => container.removeEventListener('scroll', detectChord);
    } else {
      if (tiktokPageTimer.current) clearInterval(tiktokPageTimer.current);
      setAutoScroll(false);
      setNextChord(null);
    }
  }, [showTikTokMode]);

  useEffect(() => {
    const saved = localStorage.getItem(ttMeasuresKey);
    if (saved) { try { setTtChordMeasures(JSON.parse(saved)); } catch (_) {} }
  }, [ttMeasuresKey]);
  useEffect(() => {
    if (Object.keys(ttChordMeasures).length > 0)
      localStorage.setItem(ttMeasuresKey, JSON.stringify(ttChordMeasures));
  }, [ttChordMeasures, ttMeasuresKey]);

  const handleTranspose = (steps: number) => setTransposeSteps(prev => prev + steps);

  // Devuelve una copia del song con todos los acordes transpuestos y originalKey actualizado
  const bakeSongTranspose = useCallback((s: SongData, steps: number): SongData => {
    if (steps === 0) return s;
    const newLines = s.lines.map(line => {
      const parsed = parseChordProLine(line);
      return parsed.segments
        .map(seg => (seg.chord ? `[${transposeChord(seg.chord, steps)}]` : '') + seg.text)
        .join('');
    });
    const newKey = s.originalKey ? transposeChord(s.originalKey, steps) : s.originalKey;
    return { ...s, lines: newLines, originalKey: newKey };
  }, []);

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

  const handleLineEdit = (newText: string) => {
    setMovingChordLine(null);
    const updated: SongData = { ...song, lines: newText.split('\n') };
    if (savedId) onUpdate(updated); else onSave(updated);
  };

  const handleChordReplace = (lineIndex: number, segIndex: number, newValue: string) => {
    setEditingChordPos(null);
    const trimmed = newValue.trim();
    if (!trimmed) return;
    const flatToSharp: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    const withSharps = trimmed.replace(/[CDEFGAB]b/g, m => flatToSharp[m] ?? m);
    const originalChord = transposeChord(withSharps, -transposeSteps);
    const parsedLine = parseChordProLine(song.lines[lineIndex]);
    const newLine = parsedLine.segments.map((seg, i) =>
      (i === segIndex && seg.chord ? `[${originalChord}]` : (seg.chord ? `[${seg.chord}]` : '')) + seg.text
    ).join('');
    const newLines = [...song.lines];
    newLines[lineIndex] = newLine;
    const updated: SongData = { ...song, lines: newLines };
    if (savedId) onUpdate(updated); else onSave(updated);
  };

  const handleAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
    setAudioObjectUrl(URL.createObjectURL(file));
  };

  const loadVideo = () => {
    const url = videoInput.trim();
    if (!url) return;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) {
      setYoutubeId(ytMatch[1]);
      setDirectVideoUrl(null);
    } else {
      setDirectVideoUrl(url);
      setYoutubeId(null);
    }
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
    const plainChordRe = /^[A-G][#b]?(maj7?|min7?|m7?|M7?|7|9|11|13|dim7?|aug|sus[24]?|add\d+|6|[b#]\d+)*(\/[A-G][#b]?)?$/;
    const isPlainChord = (t: string) => plainChordRe.test(t);
    const isChordOnlyLine = (line: string) => {
      const tokens = line.trim().split(/\s+/).filter(Boolean);
      return tokens.length > 0 && tokens.every(isPlainChord);
    };
    const seen = new Set<string>();
    const result: { raw: string; name: string; guitarShape: ChordShape | null; pianoNotes: number[] | null }[] = [];
    const addChord = (token: string) => {
      const raw = transposeChord(token, transposeSteps);
      if (!seen.has(raw)) {
        const guitarShape = lookupChord(raw);
        const pianoNotes = getPianoNotes(raw);
        if (guitarShape || pianoNotes) {
          seen.add(raw);
          result.push({ raw, name: applyAccidental(raw), guitarShape, pianoNotes });
        }
      }
    };
    for (const line of song.lines) {
      // Acordes en formato [acorde]
      let m: RegExpExecArray | null;
      chordRegex.lastIndex = 0;
      while ((m = chordRegex.exec(line)) !== null) addChord(m[1]);
      // Líneas de solo acordes sin corchetes (subidas desde el editor manual)
      if (isChordOnlyLine(line)) {
        line.trim().split(/\s+/).filter(Boolean).forEach(addChord);
      }
    }
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.lines, transposeSteps, useFlats]);

  const chordShapeMap = useMemo(() => {
    const map = new Map<string, ChordShape>();
    for (const { raw, guitarShape } of uniqueChords) {
      if (guitarShape) map.set(raw, guitarShape);
    }
    return map;
  }, [uniqueChords]);

  const pianoNotesMap = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const { raw, pianoNotes } of uniqueChords) {
      if (pianoNotes) map.set(raw, pianoNotes);
    }
    return map;
  }, [uniqueChords]);

  const transposedKeyRaw = useMemo(() => {
    if (!song.originalKey) return '?';
    return transposeChord(song.originalKey, transposeSteps);
  }, [song.originalKey, transposeSteps]);

  const isMinorKey = useMemo(() => {
    const afterRoot = transposedKeyRaw.replace(/^[CDEFGAB][#b]?/, '');
    return afterRoot.startsWith('m') && !afterRoot.startsWith('maj');
  }, [transposedKeyRaw]);

  const relativeKeyRaw = useMemo(() => {
    const m = transposedKeyRaw.match(/^([CDEFGAB][#b]?)(.*)/);
    if (!m) return transposedKeyRaw;
    const [, root, quality] = m;
    if (isMinorKey) {
      return transposeChord(root, 3) + quality.replace(/^m/, '');
    }
    return transposeChord(root, -3) + 'm' + quality;
  }, [transposedKeyRaw, isMinorKey]);

  const currentKey = useMemo(() => {
    const raw = showRelativeKey ? relativeKeyRaw : transposedKeyRaw;
    return formatChordNotation(applyAccidental(raw), notation);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transposedKeyRaw, relativeKeyRaw, showRelativeKey, notation, useFlats]);

  const currentKeyIsMinor = showRelativeKey ? !isMinorKey : isMinorKey;

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
      {/* Sticky header: toolbar + all sub-panels */}
      <div className="sticky top-0 z-10">

      {/* Main toolbar */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 print-hidden flex flex-wrap justify-between items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Volver</span>
        </button>

        {/* Transpose */}
        <div className="flex items-center gap-1 sm:gap-2 bg-white dark:bg-gray-700 p-1.5 sm:p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
          <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 ml-1 mr-1">Tono:</span>
          <button onClick={() => handleTranspose(-1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold text-lg transition-colors">−</button>
          <div className="flex flex-col items-center w-14 sm:w-18 px-1">
            <div className="font-bold text-lg sm:text-xl text-blue-700 dark:text-blue-400 truncate leading-tight">{currentKey}</div>
            <div className="text-xs text-gray-400 leading-tight">{currentKeyIsMinor ? 'menor' : 'mayor'}</div>
          </div>
          <button onClick={() => handleTranspose(1)} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold text-lg transition-colors">+</button>
          <button
            onClick={() => setShowRelativeKey(r => !r)}
            className={`text-xs px-1.5 py-1 rounded-md transition-colors ${showRelativeKey ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
            title={showRelativeKey ? 'Mostrando tono relativo — click para volver' : 'Ver tono relativo'}
          >rel</button>
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
          {uniqueChords.length > 0 && (
            <button onClick={() => setShowInlineDiagrams(d => !d)} className={toolBtn(showInlineDiagrams)} title={showInlineDiagrams ? 'Ocultar diagramas inline' : 'Mostrar diagramas en cada acorde'}>
              <InlineChordIcon className="w-5 h-5" />
            </button>
          )}
          {uniqueChords.length > 0 && (
            <button
              onClick={() => setShowPracticeMode(p => !p)}
              className={toolBtn(showPracticeMode)}
              title={showPracticeMode ? 'Cerrar modo práctica' : 'Modo práctica: diagrama + rasgueo al tocar un acorde'}
            >
              <PracticeModeIcon className="w-5 h-5" />
            </button>
          )}
          {uniqueChords.length > 0 && (
            <button
              onClick={() => setShowFloatingChord(f => !f)}
              className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border transition-colors shadow-sm text-sm font-medium ${showFloatingChord ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              title={showFloatingChord ? 'Ocultar diagrama flotante (abajo al centro)' : 'Mostrar diagrama del acorde actual abajo al centro'}
            >
              <FloatingChordIcon className="w-5 h-5" />
              <span className="hidden md:inline">Diagrama</span>
            </button>
          )}
          <button onClick={() => setAutoScroll(a => !a)} className={toolBtn(autoScroll)} title="Auto-scroll">
            <AutoScrollIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowMediaPanel(p => !p)} className={toolBtn(showMediaPanel)} title="Reproducir audio/video y sincronizar scroll">
            <PlayCircleIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowTikTokMode(true)} className={toolBtn(false)} title="Modo vertical 9:16 para grabar TikTok">
            <PhoneVerticalIcon className="w-5 h-5" />
          </button>
          {uniqueChords.length > 0 && (
            <button
              onClick={() => setShowSingMode(true)}
              className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border transition-colors shadow-sm text-sm font-medium bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600`}
              title="Modo cantar: acorde grande + rasgueo + letra sincronizados"
            >
              <SingModeIcon className="w-5 h-5" />
              <span className="hidden md:inline">Cantar</span>
            </button>
          )}
          <button
            onClick={() => setShowChordPlay(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors shadow-sm text-sm font-bold bg-teal-600 hover:bg-teal-500 border-teal-600 text-white"
            title="Modo ChordPlay: reproducir canción con rasgueo y diagramas"
          >
            <span>▶ Tocar</span>
          </button>
          <button onClick={() => setShowMetronome(m => !m)} className={toolBtn(showMetronome)} title="Metrónomo">
            <MetronomeIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowEQ(q => !q)} className={toolBtn(showEQ)} title="Efectos de audio">
            <EqToolbarIcon />
          </button>
          <button onClick={() => setShowCapo(c => !c)} className={toolBtn(showCapo)} title="Calculadora de cejilla">
            <CapoIcon className="w-5 h-5" />
          </button>
          {savedId && (
            <button onClick={() => { setSetlists(listSetLists()); setShowSetlistModal(true); }} className={toolBtn(false)} title="Agregar a setlist">
              <ListMusicIcon className="w-5 h-5" />
            </button>
          )}

          {/* Flats toggle */}
          <button
            onClick={() => setUseFlats(f => !f)}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors shadow-sm border ${useFlats ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}
            title={useFlats ? 'Mostrando bemoles (♭) — click para sostenidos (#)' : 'Mostrar bemoles (♭) en vez de sostenidos (#)'}
          >
            <span className="font-bold text-base leading-none">♭</span>
          </button>

          {/* Notation */}
          <button onClick={toggleNotation} className="flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition-colors shadow-sm" title={notation === 'english' ? 'Cambiar a Do, Re, Mi' : 'Cambiar a C, D, E'}>
            <LanguageIcon className="w-5 h-5" />
            <span className="hidden md:inline font-medium text-sm">{notation === 'english' ? 'CDE' : 'DoReMi'}</span>
          </button>

          {/* Zoom + 2 columns */}
          <div className="flex items-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
            <button onClick={() => handleZoom(-2)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"><ZoomOutIcon className="w-5 h-5" /></button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />
            <button onClick={() => handleZoom(2)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"><ZoomInIcon className="w-5 h-5" /></button>
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-600" />
            <button
              onClick={() => setTwoColumns(c => !c)}
              className={`p-2 transition-colors ${twoColumns ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
              title={twoColumns ? 'Volver a una columna' : 'Mostrar en dos columnas'}
            >
              <TwoColumnsIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors shadow-sm" title={isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}>
            {isFullscreen ? <MinimizeIcon className="w-5 h-5" /> : <FullscreenIcon className="w-5 h-5" />}
          </button>

          {/* Quick chord fix */}
          {!editMode && (
            <button
              onClick={() => { setChordEditMode(m => !m); setEditingChordPos(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors shadow-sm border text-sm font-medium ${
                chordEditMode
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
              }`}
              title={chordEditMode ? 'Salir — tocá fuera de un acorde' : 'Corregir acorde: activá y tocá el acorde equivocado'}
            >
              <EditIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Fix</span>
            </button>
          )}

          {/* Edit */}
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors shadow-sm" title="Editar letra completa">
              <EditIcon className="w-5 h-5" />
            </button>
          )}

          {/* Save */}
          {!editMode && (
            <button
              onClick={() => {
                const toSave = bakeSongTranspose(song, transposeSteps);
                if (savedId) onUpdate(toSave); else onSave(toSave);
                if (transposeSteps !== 0) setTransposeSteps(0);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors shadow-sm ${savedId ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}
              title={savedId ? (transposeSteps !== 0 ? `Guardar en tono ${transposedKeyRaw}` : 'Guardada') : 'Guardar en cancionero'}
            >
              <SaveIcon className="w-5 h-5" />
              <span className="hidden sm:inline font-medium text-sm">
                {savedId ? (transposeSteps !== 0 ? `Guardar (${transposedKeyRaw})` : 'Guardada') : 'Guardar'}
              </span>
            </button>
          )}

          {/* Publish to community */}
          {!editMode && (
            <button
              onClick={handlePublish}
              disabled={publishing || published}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors shadow-sm ${
                published
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700'
                  : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50'
              }`}
              title={published ? 'Compartida en el catálogo' : 'Compartir con la comunidad'}
            >
              <SparklesIcon className="w-5 h-5" />
              <span className="hidden sm:inline font-medium text-sm">
                {publishing ? 'Compartiendo...' : published ? 'Compartida' : 'Compartir'}
              </span>
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

          {/* Share PDF */}
          {!editMode && (
            <button
              onClick={sharePdf}
              disabled={generatingPdf}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors shadow-sm"
              title="Compartir como PDF (WhatsApp, Drive, etc.)"
            >
              <ShareIcon className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">{generatingPdf ? 'Generando…' : 'PDF'}</span>
            </button>
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
          <input type="range" min={0.1} max={10} step={0.1} value={scrollSpeed} onChange={e => setScrollSpeed(Number(e.target.value))} className="w-32 accent-yellow-600" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400">Velocidad: {scrollSpeed.toFixed(1)}</span>
          <button onClick={() => setAutoScroll(false)} className="ml-auto text-xs text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 font-medium">Detener</button>
        </div>
      )}

      {/* Metronome panel */}
      {showMetronome && <MetronomePanel />}

      {/* Audio FX panel */}
      {showEQ && <AudioFX onClose={() => setShowEQ(false)} />}

      {/* Practice mode panel */}
      {showPracticeMode && (
        <PracticePanel
          activeChord={practiceChord}
          chordShape={practiceChord ? chordShapeMap.get(practiceChord) ?? null : null}
          onClose={() => { setShowPracticeMode(false); setPracticeChord(null); chordCursorRef.current = -1; }}
          onNextChord={handleNextChord}
          onPlayChange={handlePracticePlayChange}
          onRestart={handleRestartPractice}
          sharedTs={practiceTs}
          sharedPresetIdx={practicePresetIdx}
          onPresetChange={(ts, idx) => { setPracticeTs(ts); setPracticePresetIdx(idx); }}
          measuresOverride={ttChordMeasures[ttChordIdx]}
          onMeasuresChange={n => setTtChordMeasures(prev => ({ ...prev, [ttChordIdx]: n }))}
        />
      )}

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
              ? uniqueChords.filter(c => c.guitarShape).map(({ raw, name, guitarShape }) => (
                <SmallChordDiagram
                  key={raw}
                  chordName={name}
                  shape={guitarShape!}
                  onClick={() => setSelectedChord(raw)}
                />
              ))
              : uniqueChords.filter(c => c.pianoNotes).map(({ raw, name, pianoNotes }) => (
                <button
                  key={raw}
                  onClick={() => setSelectedChord(raw)}
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

      {/* Media panel */}
      {showMediaPanel && (
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 print-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMediaTab('audio')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mediaTab === 'audio' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >🎵 Audio</button>
            <button
              onClick={() => setMediaTab('video')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${mediaTab === 'video' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >🎬 Video / YouTube</button>
          </div>

          {mediaTab === 'audio' && (
            <div className="p-3 space-y-2">
              <label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 rounded-xl p-3 transition-colors group">
                <span className="text-xl">🎵</span>
                <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                  {audioObjectUrl ? 'Cambiar archivo de audio' : 'Subir MP3 / audio'}
                </span>
                <input type="file" accept="audio/*" onChange={handleAudioFile} className="hidden" />
              </label>
              {audioObjectUrl && (
                <>
                  <audio
                    ref={audioRef}
                    src={audioObjectUrl}
                    controls
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 text-center">Controlá el scroll con el botón ▶ Scroll de arriba</p>
                </>
              )}
            </div>
          )}

          {mediaTab === 'video' && (
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={videoInput}
                  onChange={e => setVideoInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... o URL de video"
                  className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); loadVideo(); } }}
                />
                <button
                  onClick={loadVideo}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >Cargar</button>
              </div>
              {youtubeId && (
                <div className="w-full rounded-lg overflow-hidden">
                  <YouTube
                    videoId={youtubeId}
                    opts={{ width: '100%', height: '220', playerVars: { autoplay: 0 } }}
                    className="w-full"
                  />
                </div>
              )}
              {directVideoUrl && (
                <video
                  src={directVideoUrl}
                  controls
                  className="w-full rounded-lg max-h-52"
                />
              )}
              {(youtubeId || directVideoUrl) && (
                <p className="text-xs text-gray-400 text-center">Controlá el scroll con el botón ▶ Scroll de arriba</p>
              )}
            </div>
          )}
        </div>
      )}

      </div>{/* end sticky header */}

      {/* Song Content */}
      <div
        ref={contentRef}
        className="px-4 py-3 sm:px-8 sm:py-4 print:p-0 print:pt-4 bg-white dark:bg-gray-900 min-h-full"
        onClick={() => { if (autoScroll) setAutoScroll(false); }}
        style={{ cursor: autoScroll ? 'pointer' : 'default' }}
      >
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
          <div className="mb-2 text-center sm:text-left print:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">{song.title}</h1>
            <h2 className="text-base text-gray-600 dark:text-gray-400">{song.artist}</h2>
          </div>
        )}

        {!editMode && (
          <div className={twoColumns ? 'overflow-x-auto' : ''}>
          <div
            className="font-mono leading-snug print-exact-colors"
            style={{ fontSize: `${fontSize}px`, ...(twoColumns ? { minWidth: 680 } : {}) }}
          >
            {(() => {
              type RGrp = { type: 'sp'; i: number } | { type: 'v'; s: number; ls: string[] };
              const rg: RGrp[] = [];
              let rc: { s: number; ls: string[] } | null = null;
              song.lines.forEach((ln, i) => {
                if (!ln.trim()) { if (rc) { rg.push({ type: 'v', ...rc }); rc = null; } rg.push({ type: 'sp', i }); }
                else { if (!rc) rc = { s: i, ls: [] }; rc.ls.push(ln); }
              });
              if (rc) rg.push({ type: 'v', ...rc });
              const renderGroup = (g: RGrp) => {
                if (g.type === 'sp') return <div key={`sp-${g.i}`} style={{ height: `${fontSize * 0.7}px` }} />;
                return (
                  <div key={g.s} className="print-break-inside-avoid mb-1" style={{ breakInside: 'avoid' }}>
                    {g.ls.map((line, inner) => {
                      const lineIndex = g.s + inner;
                      const parsedLine = parseChordProLine(line);
                      const lineHasChord = parsedLine.segments.some(seg => seg.chord);
                      const showDiagramRow = showInlineDiagrams && lineHasChord;
                      const shownPianoChords = new Set<string>();
                      return (
                        <div key={lineIndex} className={`flex mb-0.5 ${showDiagramRow ? 'overflow-x-auto' : 'flex-wrap'}`} style={showDiagramRow ? { scrollbarWidth: 'none' } : undefined}>
                  {parsedLine.segments.map((segment, segIndex) => {
                    let displayChord: string | null = null;
                    let rawChord: string | null = null;
                    if (segment.chord) {
                      const transposed = transposeChord(segment.chord, transposeSteps);
                      rawChord = transposed;
                      displayChord = formatChordNotation(applyAccidental(transposed), notation);
                    }
                    const showPiano = rawChord !== null && pianoNotesMap.has(rawChord) && !shownPianoChords.has(rawChord);
                    if (showPiano && rawChord) shownPianoChords.add(rawChord);
                    return (
                      <div key={segIndex} className="flex flex-col mr-1 items-start">
                        {showDiagramRow && (
                          <div style={{ height: TINY_DIAGRAM_H }} className="flex flex-row items-end gap-1">
                            {rawChord && chordShapeMap.has(rawChord) && (
                              <TinyChordDiagram
                                shape={chordShapeMap.get(rawChord)!}
                                onClick={() => setSelectedChord(rawChord)}
                              />
                            )}
                            {showPiano && rawChord && pianoNotesMap.has(rawChord) && (
                              <PianoKeyboard notes={pianoNotesMap.get(rawChord)!} size="small" />
                            )}
                          </div>
                        )}
                        {lineHasChord && <div className="flex items-end" style={{ height: `${fontSize * 1.0}px` }}>
                          {displayChord && (
                            editingChordPos?.lineIndex === lineIndex && editingChordPos?.segIndex === segIndex ? (
                              <input
                                autoFocus
                                value={editingChordValue}
                                onChange={e => setEditingChordValue(e.target.value)}
                                className="font-bold bg-amber-50 dark:bg-amber-900/20 border-b-2 border-amber-500 text-amber-700 dark:text-amber-300 outline-none text-center rounded-t px-0.5"
                                style={{ fontSize: `${fontSize}px`, width: `${Math.max(editingChordValue.length + 1, 3) * fontSize * 0.65}px` }}
                                onBlur={() => handleChordReplace(lineIndex, segIndex, editingChordValue)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleChordReplace(lineIndex, segIndex, editingChordValue);
                                  if (e.key === 'Escape') setEditingChordPos(null);
                                }}
                              />
                            ) : (
                              <div className="flex items-end gap-0.5">
                                <span
                                  className={`font-bold select-all ${
                                    chordEditMode
                                      ? 'cursor-pointer text-amber-600 dark:text-amber-400 border-b border-dashed border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-t px-0.5'
                                      : `${getChordTypeClass(rawChord || '')} ${rawChord && (lookupChord(rawChord!) || showPracticeMode) ? 'cursor-pointer hover:opacity-70' : ''}`
                                  }`}
                                  data-chord-display={(showFloatingChord || showPracticeMode) ? rawChord : undefined}
                                  onClick={e => {
                                    if (chordEditMode) {
                                      e.stopPropagation();
                                      setEditingChordPos({ lineIndex, segIndex });
                                      setEditingChordValue(displayChord);
                                    } else if (showPracticeMode && rawChord) {
                                      setPracticeChord(rawChord);
                                      const el = e.currentTarget as HTMLElement;
                                      const allSpans = Array.from(document.querySelectorAll<HTMLElement>('[data-chord-display]'));
                                      const clickedIdx = allSpans.indexOf(el);
                                      if (clickedIdx >= 0) { chordCursorRef.current = clickedIdx; setTtChordIdx(clickedIdx); }
                                    } else if (rawChord && lookupChord(rawChord)) {
                                      setSelectedChord(rawChord);
                                    }
                                  }}
                                  title={chordEditMode ? 'Tocá para cambiar nombre' : showPracticeMode ? `Practicar ${displayChord}` : (rawChord && lookupChord(rawChord!) ? 'Ver diagrama' : undefined)}
                                >
                                  {displayChord}
                                </span>
                                {chordEditMode && (
                                  <button
                                    className="text-[10px] leading-none text-amber-400 hover:text-amber-600 dark:hover:text-amber-200 pb-0.5 flex-shrink-0"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setMovingChordLine({ lineIndex });
                                      setMovingChordLineText(song.lines.join('\n'));
                                    }}
                                    title="Mover a otra posición en la letra"
                                  >↕</button>
                                )}
                              </div>
                            )
                          )}
                        </div>}
                        {!parsedLine.isChordOnly && (
                          <div className="whitespace-pre text-gray-900 dark:text-gray-100">
                            {segment.text || (segment.chord ? ' ' : '')}
                          </div>
                        )}
                      </div>
                    );
                        })}
                      </div>
                    );
                  })}
                  </div>
                );
              };
              if (twoColumns) {
                const allLines = song.lines;
                const half = Math.ceil(allLines.length / 2);
                const buildGroups = (lines: string[], startIdx: number) => {
                  const lg: RGrp[] = [];
                  let lc: { s: number; ls: string[] } | null = null;
                  lines.forEach((ln, i) => {
                    const li = startIdx + i;
                    if (!ln.trim()) { if (lc) { lg.push({ type: 'v', ...lc }); lc = null; } lg.push({ type: 'sp', i: li }); }
                    else { if (!lc) lc = { s: li, ls: [] }; lc.ls.push(ln); }
                  });
                  if (lc) lg.push({ type: 'v', ...lc });
                  return lg.map(g => renderGroup(g));
                };
                return (
                  <div className="flex gap-10">
                    <div className="flex-1 min-w-0">{buildGroups(allLines.slice(0, half), 0)}</div>
                    <div className="w-px self-stretch bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 min-w-0">{buildGroups(allLines.slice(half), half)}</div>
                  </div>
                );
              }
              return rg.map(g => renderGroup(g));
            })()}
          </div>
          </div>
        )}
      </div>

      {/* Floating chord display */}
      {showFloatingChord && floatingChord && !editMode && !showTikTokMode && (
        <div
          className="fixed bottom-8 left-1/2 z-50 pointer-events-none select-none print-hidden"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div
            className="rounded-2xl px-6 py-4 flex flex-col items-center gap-2 shadow-2xl"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Selector guitarra / piano */}
            <div className="pointer-events-auto flex gap-1 self-end">
              <button
                onClick={() => setFloatingDiagramType('guitar')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${floatingDiagramType === 'guitar' ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:text-white/80'}`}
              >🎸 Guitarra</button>
              <button
                onClick={() => setFloatingDiagramType('piano')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${floatingDiagramType === 'piano' ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:text-white/80'}`}
              >🎹 Piano</button>
            </div>
            {/* Diagrama */}
            {chordShapeMap.get(floatingChord)
              ? <FloatChordDiagramSVG shape={chordShapeMap.get(floatingChord)!} color={getChordColorTT(floatingChord)} size="md" />
              : pianoNotesMap.get(floatingChord)
                ? <PianoKeyboard notes={pianoNotesMap.get(floatingChord)!} size="large" />
                : null
            }
            {/* Nombre del acorde */}
            <span
              className="font-black text-3xl leading-none"
              style={{ color: getChordColorTT(floatingChord), textShadow: `0 0 20px ${getChordColorTT(floatingChord)}88` }}
            >
              {formatChordNotation(applyAccidental(floatingChord), notation)}
            </span>
          </div>
        </div>
      )}

      {/* Chord diagram modal */}
      {selectedChord && <ChordDiagramModal chordName={selectedChord} onClose={() => setSelectedChord(null)} />}

      {/* Sing mode */}
      {showSingMode && (
        <SingMode
          song={song}
          transposeSteps={transposeSteps}
          chordShapeMap={chordShapeMap}
          pianoNotesMap={pianoNotesMap}
          youtubeId={youtubeId}
          notation={notation}
          applyAccidental={applyAccidental}
          onClose={() => setShowSingMode(false)}
        />
      )}

      {/* Move chord: line editor */}
      {movingChordLine && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setMovingChordLine(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl p-5 shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900 dark:text-white">Mover acorde</h3>
              <button onClick={() => setMovingChordLine(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Cortá <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">[Am]</code> y pegalo donde corresponda — podés moverlo a cualquier verso:</p>
            <textarea
              className="w-full font-mono text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              rows={Math.min(song.lines.length + 1, 14)}
              value={movingChordLineText}
              onChange={e => setMovingChordLineText(e.target.value)}
              autoFocus
              spellCheck={false}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleLineEdit(movingChordLineText)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-medium text-sm transition-colors"
              >Guardar</button>
              <button
                onClick={() => setMovingChordLine(null)}
                className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* TikTok / vertical mode overlay */}
      {showTikTokMode && (() => {
        const bgGradients: Record<string, string> = {
          black:  'linear-gradient(160deg, #1a1a1a 0%, #000000 100%)',
          blue:   'linear-gradient(160deg, #0f1b3d 0%, #000d1a 100%)',
          purple: 'linear-gradient(160deg, #1a0a2e 0%, #0d0016 100%)',
          green:  'linear-gradient(160deg, #0a1f0e 0%, #000d04 100%)',
        };
        return (
          <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
            {/* 9:16 phone frame */}
            <div
              className="relative overflow-hidden flex flex-col"
              style={{
                aspectRatio: '9/16',
                height: '100%',
                maxHeight: '100vh',
                maxWidth: 'calc(100vh * 9 / 16)',
                width: '100%',
                background: bgGradients[tikTokBg],
              }}
            >
              {/* Header compacto: título + controles en una fila */}
              <div className="shrink-0 z-10 px-3 pt-1.5 pb-1">
                <div className="flex items-center gap-1.5">
                  {(autoScroll || practiceIsPlaying) && (
                    <span className="flex items-center gap-0.5 text-red-400 text-[10px] font-bold shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {practiceIsPlaying ? 'SYNC' : 'REC'}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-xs leading-tight truncate">{song.title}</p>
                  </div>
                  <button
                    onClick={() => setAutoScroll(a => !a)}
                    className={`w-6 h-6 flex items-center justify-center rounded-full shrink-0 transition-colors text-xs ${autoScroll ? 'bg-red-500 text-white' : 'bg-white/20 text-white'}`}
                    title={autoScroll ? 'Pausar scroll' : 'Iniciar scroll'}
                  >
                    {autoScroll ? '⏸' : '▶'}
                  </button>
                  <input
                    type="range" min={0.1} max={10} step={0.1} value={scrollSpeed}
                    onChange={e => setScrollSpeed(Number(e.target.value))}
                    className="w-20 accent-cyan-400 shrink-0"
                    title="Velocidad de scroll"
                  />
                  <span className="text-white/40 text-[10px] w-5 text-center shrink-0">{scrollSpeed.toFixed(1)}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {(['black','blue','purple','green'] as const).map(c => (
                      <button
                        key={c}
                        onClick={() => setTikTokBg(c)}
                        className="w-3 h-3 rounded-full border-2 transition-all"
                        style={{
                          background: { black:'#333', blue:'#1a4080', purple:'#5a1a8a', green:'#1a6030' }[c],
                          borderColor: tikTokBg === c ? 'white' : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                  <button onClick={() => setShowTikTokMode(false)} className="text-white/50 hover:text-white transition-colors shrink-0">
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* YouTube video — static at top of frame, compact height */}
              {youtubeId && (
                <div className="shrink-0 w-full relative" style={{ height: '28%' }}>
                  <YouTube
                    videoId={youtubeId}
                    opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0 } }}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                    iframeClassName="absolute inset-0 w-full h-full block"
                  />
                </div>
              )}

              {/* Barra práctica: acorde grande + rasgueo — ARRIBA DE LA LETRA */}
              {(showFloatingChord || showPracticeMode) && (
                <div className="shrink-0 z-10">
                  {(() => {
                    const displayC = (showPracticeMode && practiceChord) ? practiceChord : nextChord;
                    if (!displayC) return null;
                    return (
                      <div className="flex items-center gap-3 justify-center px-3 pt-2 pb-1" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        {practiceIsPlaying && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px] font-bold text-red-400 tracking-widest">REC</span>
                          </div>
                        )}
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setFloatingDiagramType('guitar')} className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${floatingDiagramType === 'guitar' ? 'bg-white text-black' : 'bg-white/10 text-white/40 hover:text-white/70'}`}>🎸</button>
                          <button onClick={() => setFloatingDiagramType('piano')} className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${floatingDiagramType === 'piano' ? 'bg-white text-black' : 'bg-white/10 text-white/40 hover:text-white/70'}`}>🎹</button>
                        </div>
                        {chordShapeMap.get(displayC)
                          ? <FloatChordDiagramSVG shape={chordShapeMap.get(displayC)!} color={getChordColorTT(displayC)} size="sm" />
                          : pianoNotesMap.get(displayC)
                            ? <PianoKeyboard notes={pianoNotesMap.get(displayC)!} size="small" />
                            : null
                        }
                        <div className="flex flex-col items-start shrink-0">
                          <span className="font-black leading-none text-3xl" style={{ color: getChordColorTT(displayC) }}>
                            {formatChordNotation(applyAccidental(displayC), notation)}
                          </span>
                          {/* Selector de compases por acorde */}
                          {showPracticeMode && (
                            <div className="flex items-center gap-1 mt-1">
                              {[1,2,3,4].map(n => {
                                const cur = ttChordMeasures[ttChordIdx] ?? 1;
                                return (
                                  <button
                                    key={n}
                                    onClick={() => setTtChordMeasures(prev => ({ ...prev, [ttChordIdx]: n }))}
                                    className={`w-5 h-4 text-[9px] font-black rounded transition-all leading-none ${
                                      cur === n ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white/40 hover:bg-white/20 hover:text-white'
                                    }`}
                                  >{n}</button>
                                );
                              })}
                              <span className="text-white/25 text-[8px] ml-0.5">compases</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {showPracticeMode && (
                    <PracticePanel
                      activeChord={practiceChord ?? nextChord}
                      chordShape={(practiceChord ?? nextChord) ? chordShapeMap.get(practiceChord ?? nextChord ?? '') ?? null : null}
                      onClose={() => {}}
                      hideClose
                      hidePresets
                      variant="dark"
                      noDiagram
                      autoStart={autoScroll}
                      onNextChord={handleNextChord}
                      onPlayChange={handlePracticePlayChange}
                      onRestart={handleRestartPractice}
                      sharedTs={practiceTs}
                      sharedPresetIdx={practicePresetIdx}
                      measuresOverride={ttChordMeasures[ttChordIdx]}
                      onMeasuresChange={n => setTtChordMeasures(prev => ({ ...prev, [ttChordIdx]: n }))}
                    />
                  )}
                </div>
              )}

              {/* Scrollable lyrics */}
              <div className="flex-1 relative min-h-0 overflow-hidden">
              <div
                ref={tiktokScrollRef}
                className="h-full overflow-y-auto px-5 pb-4"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                onClick={() => setAutoScroll(a => !a)}
              >
                <div
                  className="font-mono leading-snug"
                  style={{ fontSize: `${Math.max(fontSize - 2, 14)}px` }}
                >
                  {(() => {
                    type TGrp = { type: 'sp'; i: number } | { type: 'v'; s: number; ls: string[] };
                    const tg: TGrp[] = [];
                    let tc: { s: number; ls: string[] } | null = null;
                    song.lines.forEach((ln, i) => {
                      if (!ln.trim()) { if (tc) { tg.push({ type: 'v', ...tc }); tc = null; } tg.push({ type: 'sp', i }); }
                      else { if (!tc) tc = { s: i, ls: [] }; tc.ls.push(ln); }
                    });
                    if (tc) tg.push({ type: 'v', ...tc });
                    tiktokVerseEls.current = [];
                    let tikVerse = 0;
                    return tg.map(g => {
                      if (g.type === 'sp') return <div key={`sp-${g.i}`} style={{ height: `${fontSize * 0.8}px` }} />;
                      const vi = tikVerse++;
                      return (
                        <div key={g.s} className="mb-1" ref={el => { tiktokVerseEls.current[vi] = el; }}>
                          {(() => {
                            // Merge lines where a line ends mid-word (no trailing space)
                            // so split words like "golondr" + "ina" → "golondrina"
                            const merged: string[] = [];
                            let buf = '';
                            for (const ln of g.ls) {
                              if (!buf) { buf = ln; continue; }
                              const prevText = parseChordProLine(buf).segments.map(s => s.text).join('').trimEnd();
                              const nextText = parseChordProLine(ln).segments.map(s => s.text).join('');
                              if (/\w$/.test(prevText) && /^[a-záéíóúüñ]/.test(nextText)) {
                                buf = buf + ln; // concatenate inline ChordPro directly
                              } else {
                                merged.push(buf); buf = ln;
                              }
                            }
                            if (buf) merged.push(buf);
                            return merged;
                          })().map((line, inner) => {
                            const parsedLine = parseChordProLine(line);
                            const lineHasChord = parsedLine.segments.some(s => s.chord);
                            const showDiagramRow = showInlineDiagrams && lineHasChord;
                            const shownPianoChordsTT = new Set<string>();
                            return (
                              <div key={inner} className={`flex mb-0.5 ${showDiagramRow ? 'overflow-x-auto' : 'flex-wrap'}`} style={showDiagramRow ? { scrollbarWidth: 'none' } : undefined}>
                                {parsedLine.segments.map((segment, segIndex) => {
                                  let displayChord: string | null = null;
                                  let rawChord: string | null = null;
                                  if (segment.chord) {
                                    const transposed = transposeChord(segment.chord, transposeSteps);
                                    rawChord = transposed;
                                    displayChord = formatChordNotation(applyAccidental(transposed), notation);
                                  }
                                  const showPianoTT = rawChord !== null && pianoNotesMap.has(rawChord) && !shownPianoChordsTT.has(rawChord);
                                  if (showPianoTT && rawChord) shownPianoChordsTT.add(rawChord);
                                  // No gap when this segment's text ends mid-word (next segment continues it)
                                  const nextSeg = parsedLine.segments[segIndex + 1];
                                  const gapClass = (nextSeg && /\w$/.test(segment.text)) ? 'mr-0' : 'mr-1';
                                  return (
                                    <div key={segIndex} className={`flex flex-col ${gapClass} items-start`}>
                                      {showDiagramRow && (
                                        <div style={{ height: TINY_DIAGRAM_H }} className="flex flex-row items-end gap-1">
                                          {rawChord && chordShapeMap.has(rawChord) && (
                                            <TinyChordDiagram
                                              shape={chordShapeMap.get(rawChord)!}
                                              onClick={() => setSelectedChord(rawChord)}
                                              bright
                                            />
                                          )}
                                          {showPianoTT && rawChord && pianoNotesMap.has(rawChord) && (
                                            <PianoKeyboard notes={pianoNotesMap.get(rawChord)!} size="small" />
                                          )}
                                        </div>
                                      )}
                                      <div style={{ height: `${Math.max(fontSize - 2, 14)}px` }} className="flex items-end">
                                        {displayChord && rawChord && (
                                          <span
                                            className="font-bold"
                                            data-chord={rawChord}
                                            data-chord-display={showPracticeMode ? rawChord : undefined}
                                            style={{ fontSize: `${Math.max(fontSize - 2, 14)}px`, color: getChordColorTT(rawChord) }}
                                          >
                                            {displayChord}
                                          </span>
                                        )}
                                      </div>
                                      {!parsedLine.isChordOnly && (
                                        <div className="whitespace-pre text-white/90">
                                          {segment.text || (segment.chord ? ' ' : '')}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}
                  <div style={{ height: 32 }} />
                </div>
              </div>
              </div>{/* end reading line wrapper */}

              {/* Gradiente sutil al pie */}
              <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
                style={{ background: `linear-gradient(to top, ${tikTokBg === 'black' ? '#000' : tikTokBg === 'blue' ? '#000d1a' : tikTokBg === 'purple' ? '#0d0016' : '#000d04'}, transparent)` }}
              />
            </div>
          </div>
        );
      })()}

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

      {showChordPlay && (
        <ChordPlayView
          song={song}
          transposeSteps={transposeSteps}
          onClose={() => setShowChordPlay(false)}
        />
      )}
    </div>
  );
};
