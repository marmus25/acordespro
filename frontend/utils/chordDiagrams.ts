export interface ChordShape {
  frets: number[]; // [lowE, A, D, G, B, highE] — -1=muted, 0=open, N=fret#
  baseFret: number;
  barre?: { fret: number; from: number; to: number };
}

const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

function normalizeRoot(root: string): string {
  return FLAT_TO_SHARP[root] ?? root;
}

export function lookupChord(name: string): ChordShape | null {
  const match = name.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  const [, root, suffix] = match;
  const key = normalizeRoot(root) + suffix;
  return CHORDS[key] ?? null;
}

const CHORDS: Record<string, ChordShape> = {
  // Major
  C:   { frets: [-1, 3, 2, 0, 1, 0], baseFret: 1 },
  D:   { frets: [-1, -1, 0, 2, 3, 2], baseFret: 1 },
  E:   { frets: [0, 2, 2, 1, 0, 0], baseFret: 1 },
  F:   { frets: [1, 1, 2, 3, 3, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  G:   { frets: [3, 2, 0, 0, 0, 3], baseFret: 1 },
  A:   { frets: [-1, 0, 2, 2, 2, 0], baseFret: 1 },
  B:   { frets: [-1, 2, 4, 4, 4, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  'C#': { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  'D#': { frets: [-1, 6, 8, 8, 8, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  'F#': { frets: [2, 4, 4, 3, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#': { frets: [4, 6, 6, 5, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#': { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },
  // Minor
  Am:  { frets: [-1, 0, 2, 2, 1, 0], baseFret: 1 },
  Bm:  { frets: [-1, 2, 4, 4, 3, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  Cm:  { frets: [-1, 3, 5, 5, 4, 3], baseFret: 3, barre: { fret: 3, from: 1, to: 5 } },
  Dm:  { frets: [-1, -1, 0, 2, 3, 1], baseFret: 1 },
  Em:  { frets: [0, 2, 2, 0, 0, 0], baseFret: 1 },
  Fm:  { frets: [1, 3, 3, 1, 1, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  Gm:  { frets: [3, 5, 5, 3, 3, 3], baseFret: 3, barre: { fret: 3, from: 0, to: 5 } },
  'C#m': { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4, barre: { fret: 4, from: 1, to: 5 } },
  'D#m': { frets: [-1, 6, 8, 8, 7, 6], baseFret: 6, barre: { fret: 6, from: 1, to: 5 } },
  'F#m': { frets: [2, 4, 4, 2, 2, 2], baseFret: 2, barre: { fret: 2, from: 0, to: 5 } },
  'G#m': { frets: [4, 6, 6, 4, 4, 4], baseFret: 4, barre: { fret: 4, from: 0, to: 5 } },
  'A#m': { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1, barre: { fret: 1, from: 1, to: 5 } },
  // Dominant 7th
  A7:  { frets: [-1, 0, 2, 0, 2, 0], baseFret: 1 },
  B7:  { frets: [-1, 2, 1, 2, 0, 2], baseFret: 1 },
  C7:  { frets: [-1, 3, 2, 3, 1, 0], baseFret: 1 },
  D7:  { frets: [-1, -1, 0, 2, 1, 2], baseFret: 1 },
  E7:  { frets: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  F7:  { frets: [1, 1, 2, 1, 1, 1], baseFret: 1, barre: { fret: 1, from: 0, to: 5 } },
  G7:  { frets: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  // Minor 7th
  Am7: { frets: [-1, 0, 2, 0, 1, 0], baseFret: 1 },
  Em7: { frets: [0, 2, 2, 0, 3, 0], baseFret: 1 },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], baseFret: 1 },
  Bm7: { frets: [-1, 2, 4, 2, 3, 2], baseFret: 2, barre: { fret: 2, from: 1, to: 5 } },
  // Major 7th
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], baseFret: 1 },
  Amaj7: { frets: [-1, 0, 2, 1, 2, 0], baseFret: 1 },
  Gmaj7: { frets: [3, 2, 0, 0, 0, 2], baseFret: 1 },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], baseFret: 1 },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], baseFret: 1 },
  Emaj7: { frets: [0, 2, 1, 1, 0, 0], baseFret: 1 },
  // Suspended & Add
  Asus2:  { frets: [-1, 0, 2, 2, 0, 0], baseFret: 1 },
  Asus4:  { frets: [-1, 0, 2, 2, 3, 0], baseFret: 1 },
  Dsus2:  { frets: [-1, -1, 0, 2, 3, 0], baseFret: 1 },
  Dsus4:  { frets: [-1, -1, 0, 2, 3, 3], baseFret: 1 },
  Esus4:  { frets: [0, 2, 2, 2, 0, 0], baseFret: 1 },
  Gsus4:  { frets: [3, 2, 0, 0, 3, 3], baseFret: 1 },
  Cadd9:  { frets: [-1, 3, 2, 0, 3, 0], baseFret: 1 },
};
