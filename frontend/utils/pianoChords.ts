const ROOT_SEMITONES: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const INTERVALS: Record<string, number[]> = {
  '': [0, 4, 7],
  'maj': [0, 4, 7],
  'm': [0, 3, 7],
  'min': [0, 3, 7],
  '7': [0, 4, 7, 10],
  'maj7': [0, 4, 7, 11],
  'M7': [0, 4, 7, 11],
  'm7': [0, 3, 7, 10],
  'min7': [0, 3, 7, 10],
  'dim': [0, 3, 6],
  'dim7': [0, 3, 6, 9],
  'aug': [0, 4, 8],
  'sus2': [0, 2, 7],
  'sus4': [0, 5, 7],
  'add9': [0, 4, 7, 14],
  'madd9': [0, 3, 7, 14],
  '9': [0, 4, 7, 10, 14],
  'm9': [0, 3, 7, 10, 14],
  'maj9': [0, 4, 7, 11, 14],
  '6': [0, 4, 7, 9],
  'm6': [0, 3, 7, 9],
};

export function getPianoNotes(chordName: string): number[] | null {
  const withoutBass = chordName.split('/')[0];
  const match = withoutBass.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return null;
  const [, root, quality] = match;
  const rootSemi = ROOT_SEMITONES[root];
  if (rootSemi === undefined) return null;
  const intervals = INTERVALS[quality] ?? null;
  if (!intervals) return null;
  return intervals.map(i => (rootSemi + i) % 12);
}
