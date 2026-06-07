const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

function noteIndex(note: string): number {
  const normalized = FLAT_TO_SHARP[note] ?? note;
  return NOTES.indexOf(normalized);
}

export function capoToSounding(shape: string, capoFret: number): string {
  const idx = noteIndex(shape);
  if (idx === -1) return shape;
  return NOTES[(idx + capoFret) % 12];
}

export function soundingToShape(sounding: string, capoFret: number): string {
  const idx = noteIndex(sounding);
  if (idx === -1) return sounding;
  return NOTES[(idx - capoFret + 12) % 12];
}

export const ALL_NOTES = NOTES;
