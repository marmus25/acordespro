const notesSharp = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const notesFlat = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const latinMap: Record<string, string> = {
  'C': 'Do',
  'D': 'Re',
  'E': 'Mi',
  'F': 'Fa',
  'G': 'Sol',
  'A': 'La',
  'B': 'Si'
};

// Helper to normalize note to index
const getNoteIndex = (note: string): number => {
  let index = notesSharp.indexOf(note);
  if (index === -1) index = notesFlat.indexOf(note);
  return index;
};

export const transposeChord = (chord: string, steps: number): string => {
  if (!chord) return chord;

  // Regex to match Root, Quality/Extensions, and optional Bass note
  // e.g., C#m7/G# -> Root: C#, Quality: m7, Bass: G#
  const match = chord.match(/^([CDEFGAB][#b]?)(.*?)(\/([CDEFGAB][#b]?))?$/);
  
  if (!match) return chord; // Return original if it doesn't look like a standard chord

  const root = match[1];
  const quality = match[2] || '';
  const bass = match[4];

  const transposeNote = (note: string, steps: number): string => {
    const index = getNoteIndex(note);
    if (index === -1) return note; // Should not happen with regex, but safe fallback

    let newIndex = (index + steps) % 12;
    if (newIndex < 0) newIndex += 12;

    // Simple heuristic: if we are transposing, default to sharps for simplicity,
    // unless the original note was flat and we are not changing it.
    // A more complex app would track the current key signature.
    return notesSharp[newIndex]; 
  };

  let newChord = transposeNote(root, steps) + quality;
  if (bass) {
    newChord += '/' + transposeNote(bass, steps);
  }

  return newChord;
};

export const formatChordNotation = (chord: string, notation: 'english' | 'latin'): string => {
  if (!chord || notation === 'english') return chord;
  
  // Reemplaza cualquier nota raíz (C, D, E, F, G, A, B) por su equivalente latino
  // Funciona bien porque respeta los sostenidos/bemoles y bajos (ej. C#m/G -> Do#m/Sol)
  return chord.replace(/[CDEFGAB]/g, (match) => latinMap[match]);
};

export const parseChordProLine = (line: string): import('../types').ParsedLine => {
  const segments: import('../types').ParsedSegment[] = [];
  const regex = /\[(.*?)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    // Add text before the chord
    if (match.index > lastIndex) {
      segments.push({ chord: null, text: line.substring(lastIndex, match.index) });
    }
    
    // We found a chord. We need to attach the text that follows it to this segment
    // so they render together in a column.
    const chord = match[1];
    lastIndex = regex.lastIndex;
    
    // Find the next chord or end of string to get the text for this chord
    const nextMatchIndex = line.indexOf('[', lastIndex);
    const textEndIndex = nextMatchIndex !== -1 ? nextMatchIndex : line.length;
    const text = line.substring(lastIndex, textEndIndex);
    
    segments.push({ chord, text });
    lastIndex = textEndIndex;
    
    // Update regex lastIndex because we manually advanced
    regex.lastIndex = lastIndex;
  }

  // If there were no chords, or text at the very beginning before any chords
  if (segments.length === 0 && line.length > 0) {
      segments.push({ chord: null, text: line });
  }

  return { segments };
};
