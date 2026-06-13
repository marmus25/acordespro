export interface ChordShape {
  frets: number[]; // [lowE, A, D, G, B, highE] — -1=muted, 0=open, N=fret#
  baseFret: number;
  barre?: { fret: number; from: number; to: number };
}

const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#',
};

// Suffix aliases → canonical suffix
const SUFFIX_ALIAS: Record<string, string> = {
  // diminished
  'dim':   'dim',  'º':  'dim', 'o':   'dim',
  'dim7':  'dim7', 'º7': 'dim7',
  // half-diminished
  'm7b5':  'm7b5', 'ø':   'm7b5', 'ø7': 'm7b5', 'm7♭5': 'm7b5',
  // augmented
  'aug':   'aug',  '+':   'aug', 'aug5': 'aug',
  // major7 variants
  'maj7':  'maj7', 'M7':  'maj7', 'Δ7':  'maj7', 'Δ': 'maj7',
  // dominant 7
  '7':     '7',
  // minor7
  'm7':    'm7',
  // minor major7
  'mMaj7': 'mMaj7', 'mM7': 'mMaj7',
  // 9ths
  '9':     '9', 'maj9': 'maj9', 'm9': 'm9',
  // suspended
  'sus2':  'sus2', 'sus4': 'sus4',
  // add
  'add9':  'add9', 'add2': 'add9',
  // 6
  '6':     '6', 'm6': 'm6',
  // minor (canonical last so longer suffixes match first)
  'm':     'm',
};

function normalizeSuffix(suffix: string): string {
  // Try exact match first
  if (SUFFIX_ALIAS[suffix] !== undefined) return SUFFIX_ALIAS[suffix];
  // Try suffix aliases sorted by length desc to match longest first
  const sorted = Object.keys(SUFFIX_ALIAS).sort((a, b) => b.length - a.length);
  for (const alias of sorted) {
    if (suffix === alias) return SUFFIX_ALIAS[alias];
  }
  return suffix;
}

function normalizeRoot(root: string): string {
  return FLAT_TO_SHARP[root] ?? root;
}

export function lookupChord(name: string): ChordShape | null {
  if (!name) return null;
  // Slash chord: "Cm/Bb" → usar solo "Cm" para buscar el diagrama
  const slashIdx = name.indexOf('/');
  const baseName = slashIdx >= 0 ? name.slice(0, slashIdx) : name;
  // Normalizar notaciones alternativas: Am7(5-) → Am7b5, G7(9+) → G7#9
  const normalized = baseName
    .replace(/\((\d+)-\)/g, 'b$1')
    .replace(/\((\d+)\+\)/g, '#$1')
    .replace(/\(b(\d+)\)/g, 'b$1')
    .replace(/\(#(\d+)\)/g, '#$1')
    .replace(/\(([^)]+)\)/g, '$1');
  // Parse root + suffix
  const match = normalized.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  const [, rawRoot, rawSuffix] = match;
  const root = normalizeRoot(rawRoot);
  const suffix = normalizeSuffix(rawSuffix.trim());
  const key = root + suffix;

  // Direct lookup
  if (CHORDS[key]) return CHORDS[key];

  // Try with original suffix (for edge cases)
  const keyOrig = root + rawSuffix;
  if (CHORDS[keyOrig]) return CHORDS[keyOrig];

  return null;
}

const CHORDS: Record<string, ChordShape> = {
  // ── MAJOR ──────────────────────────────────────────────
  C:    { frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
  D:    { frets: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
  E:    { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
  F:    { frets: [1, 1, 2, 3, 3, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  G:    { frets: [3, 2, 0, 0, 0, 3], baseFret: 1 },
  A:    { frets: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
  B:    { frets: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  'C#': { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  'D#': { frets: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  'F#': { frets: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#': { frets: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#': { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },

  // ── MINOR ──────────────────────────────────────────────
  Am:   { frets: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
  Bm:   { frets: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  Cm:   { frets: [-1, 3, 5, 5, 4, 3], baseFret: 3, barre: { fret: 3, from: 1, to: 5 } },
  Dm:   { frets: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
  Em:   { frets: [0, 2, 2, 0, 0, 0], baseFret: 1 },
  Fm:   { frets: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  Gm:   { frets: [3, 5, 5, 3, 3, 3], baseFret: 3, barre: { fret: 3, from: 0, to: 5 } },
  'C#m': { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  'D#m': { frets: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  'F#m': { frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#m': { frets: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#m': { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },

  // ── DOMINANT 7 ─────────────────────────────────────────
  'C7':   { frets: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
  'D7':   { frets: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
  'E7':   { frets: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  'F7':   { frets: [1, 1, 2, 1, 1, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  'G7':   { frets: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  'A7':   { frets: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
  'B7':   { frets: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
  'C#7':  { frets: [-1, 4, 3, 4, 2, 4], baseFret: 4 },
  'D#7':  { frets: [-1, 6, 5, 6, 4, 6], baseFret: 6 },
  'F#7':  { frets: [2, 4, 2, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#7':  { frets: [4, 6, 4, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#7':  { frets: [-1, 1, 3, 1, 3, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },

  // ── MINOR 7 ────────────────────────────────────────────
  'Am7':  { frets: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
  'Em7':  { frets: [0, 2, 2, 0, 3, 0], baseFret: 1 },
  'Dm7':  { frets: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
  'Bm7':  { frets: [-1, 2, 4, 2, 3, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  'Cm7':  { frets: [-1, 3, 5, 3, 4, 3], baseFret: 3, barre: { fret: 3, from: 1, to: 5 } },
  'Fm7':  { frets: [1, 3, 1, 1, 1, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  'Gm7':  { frets: [3, 5, 3, 3, 3, 3], baseFret: 3, barre: { fret: 3, from: 0, to: 5 } },
  'C#m7': { frets: [-1, 4, 6, 4, 5, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  'D#m7': { frets: [-1, 6, 8, 6, 7, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  'F#m7': { frets: [2, 4, 2, 2, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#m7': { frets: [4, 6, 4, 4, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#m7': { frets: [-1, 1, 3, 1, 2, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },

  // ── MAJOR 7 ────────────────────────────────────────────
  'Cmaj7':  { frets: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
  'Dmaj7':  { frets: [-1, -1, 0, 2, 2, 2], baseFret: 1 },
  'Emaj7':  { frets: [0, 2, 1, 1, 0, 0], baseFret: 1 },
  'Fmaj7':  { frets: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
  'Gmaj7':  { frets: [3, 2, 0, 0, 0, 2], baseFret: 1 },
  'Amaj7':  { frets: [-1, 0, 2, 1, 2, 0], baseFret: 1 },
  'Bmaj7':  { frets: [-1, 2, 4, 3, 4, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  'C#maj7': { frets: [-1, 4, 6, 5, 6, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  'F#maj7': { frets: [2, 4, 3, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#maj7': { frets: [4, 6, 5, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },

  // ── DIMINISHED ─────────────────────────────────────────
  'Cdim':   { frets: [-1, 3, 4, 5, 4, -1], baseFret: 1 },
  'Ddim':   { frets: [-1, -1, 0, 1, 0, 1], baseFret: 1 },
  'Edim':   { frets: [0, 1, 2, 3, 2, -1], baseFret: 1 },
  'Fdim':   { frets: [-1, -1, 3, 4, 3, 4], baseFret: 1 },
  'Gdim':   { frets: [3, 4, 5, 3, -1, -1], baseFret: 1 },
  'Adim':   { frets: [-1, 0, 1, 2, 1, -1], baseFret: 1 },
  'Bdim':   { frets: [-1, 2, 3, 4, 3, -1], baseFret: 1 },
  'C#dim':  { frets: [-1, 4, 5, 6, 5, -1], baseFret: 1 },
  'D#dim':  { frets: [-1, -1, 1, 2, 1, 2], baseFret: 1 },
  'F#dim':  { frets: [2, 3, 4, 2, -1, -1], baseFret: 1 },
  'G#dim':  { frets: [4, 5, 6, 4, -1, -1], baseFret: 4 },
  'A#dim':  { frets: [-1, 1, 2, 3, 2, -1], baseFret: 1 },

  // ── DIMINISHED 7 ───────────────────────────────────────
  'Cdim7':   { frets: [-1, 3, 4, 2, 4, 2], baseFret: 1 },
  'Ddim7':   { frets: [-1, -1, 0, 1, 0, 1], baseFret: 1 },
  'Edim7':   { frets: [0, 1, 2, 0, 2, 0], baseFret: 1 },
  'Fdim7':   { frets: [1, 2, 3, 1, 3, 1], baseFret: 1 },
  'Gdim7':   { frets: [3, 4, 5, 3, 5, 3], baseFret: 3, barre: { fret: 3, from: 0, to: 5 } },
  'Adim7':   { frets: [-1, 0, 1, 2, 1, 2], baseFret: 1 },
  'Bdim7':   { frets: [-1, 2, 3, 4, 3, 4], baseFret: 2 },
  'C#dim7':  { frets: [-1, 4, 5, 3, 5, 3], baseFret: 3 },
  'D#dim7':  { frets: [-1, 1, 2, 3, 2, 3], baseFret: 1 },
  'F#dim7':  { frets: [2, 3, 4, 2, 4, 2], baseFret: 2 },
  'G#dim7':  { frets: [4, 5, 6, 4, 6, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#dim7':  { frets: [-1, 1, 2, 0, 2, 0], baseFret: 1 },

  // ── HALF-DIMINISHED (m7b5) ─────────────────────────────
  'Cm7b5':   { frets: [-1, 3, 4, 3, 4, -1], baseFret: 1 },
  'Dm7b5':   { frets: [-1, -1, 0, 1, 1, 1], baseFret: 1 },
  'Em7b5':   { frets: [0, 1, 2, 0, 3, 0], baseFret: 1 },
  'Fm7b5':   { frets: [1, 2, 3, 1, 4, -1], baseFret: 1 },
  'Gm7b5':   { frets: [3, 4, 3, 3, -1, -1], baseFret: 3 },
  'Am7b5':   { frets: [-1, 0, 1, 0, 1, -1], baseFret: 1 },
  'Bm7b5':   { frets: [-1, 2, 3, 2, 3, -1], baseFret: 2 },
  'C#m7b5':  { frets: [-1, 4, 5, 4, 5, -1], baseFret: 4 },
  'F#m7b5':  { frets: [2, 3, 2, 2, -1, -1], baseFret: 2 },
  'G#m7b5':  { frets: [4, 5, 4, 4, -1, -1], baseFret: 4 },

  // ── AUGMENTED ──────────────────────────────────────────
  'Caug':    { frets: [-1, 3, 2, 1, 1, 0], baseFret: 1 },
  'Daug':    { frets: [-1, -1, 0, 3, 3, 2], baseFret: 1 },
  'Eaug':    { frets: [0, 3, 2, 1, 1, 0], baseFret: 1 },
  'Faug':    { frets: [-1, -1, 3, 2, 2, 1], baseFret: 1 },
  'Gaug':    { frets: [3, 2, 1, 0, 0, 3], baseFret: 1 },
  'Aaug':    { frets: [-1, 0, 3, 2, 2, 1], baseFret: 1 },
  'Baug':    { frets: [-1, 2, 1, 0, 0, 3], baseFret: 1 },
  'C#aug':   { frets: [-1, 4, 3, 2, 2, 1], baseFret: 1 },
  'F#aug':   { frets: [2, 1, 0, 3, 3, 2], baseFret: 1 },
  'G#aug':   { frets: [4, 3, 2, 1, 1, 0], baseFret: 1 },
  'A#aug':   { frets: [-1, 1, 0, 3, 3, 2], baseFret: 1 },

  // ── MINOR MAJOR 7 ──────────────────────────────────────
  'CmMaj7':  { frets: [-1, 3, 5, 4, 4, 3], baseFret: 3 },
  'DmMaj7':  { frets: [-1, -1, 0, 2, 2, 1], baseFret: 1 },
  'EmMaj7':  { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
  'AmMaj7':  { frets: [-1, 0, 2, 1, 1, 0], baseFret: 1 },

  // ── 9TH ────────────────────────────────────────────────
  'C9':      { frets: [-1, 3, 2, 3, 3, 3], baseFret: 1 },
  'D9':      { frets: [-1, -1, 0, 2, 1, 0], baseFret: 1 },
  'E9':      { frets: [0, 2, 0, 1, 0, 2], baseFret: 1 },
  'G9':      { frets: [3, 2, 0, 2, 0, 1], baseFret: 1 },
  'A9':      { frets: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
  'Am9':     { frets: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
  'Dm9':     { frets: [-1, -1, 0, 2, 1, 0], baseFret: 1 },
  'Em9':     { frets: [0, 2, 0, 0, 0, 0], baseFret: 1 },

  // ── SUSPENDED ──────────────────────────────────────────
  'Csus2':   { frets: [-1, 3, 5, 5, 3, 3], baseFret: 3 },
  'Csus4':   { frets: [-1, 3, 3, 0, 1, 1], baseFret: 1 },
  'Dsus2':   { frets: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
  'Dsus4':   { frets: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
  'Esus4':   { frets: [0, 2, 2, 2, 0, 0], baseFret: 1 },
  'Fsus4':   { frets: [1, 1, 3, 3, 1, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  'Gsus4':   { frets: [3, 2, 0, 0, 3, 3], baseFret: 1 },
  'Asus2':   { frets: [-1, 0, 2, 2, 0, 0], baseFret: 1 },
  'Asus4':   { frets: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
  'Bsus4':   { frets: [-1, 2, 4, 4, 5, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },

  // ── ADD9 ───────────────────────────────────────────────
  'Cadd9':   { frets: [-1, 3, 2, 0, 3, 0], baseFret: 1 },
  'Dadd9':   { frets: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
  'Eadd9':   { frets: [0, 2, 2, 1, 0, 2], baseFret: 1 },
  'Gadd9':   { frets: [3, 2, 0, 2, 0, 3], baseFret: 1 },
  'Aadd9':   { frets: [-1, 0, 2, 4, 2, 0], baseFret: 1 },

  // ── 6TH ────────────────────────────────────────────────
  'C6':      { frets: [-1, 3, 2, 2, 1, 0], baseFret: 1 },
  'D6':      { frets: [-1, -1, 0, 2, 0, 2], baseFret: 1 },
  'E6':      { frets: [0, 2, 2, 1, 2, 0], baseFret: 1 },
  'G6':      { frets: [3, 2, 0, 0, 0, 0], baseFret: 1 },
  'A6':      { frets: [-1, 0, 2, 2, 2, 2], baseFret: 1 },
  'Am6':     { frets: [-1, 0, 2, 2, 1, 2], baseFret: 1 },
  'Em6':     { frets: [0, 2, 2, 0, 2, 0], baseFret: 1 },
};
