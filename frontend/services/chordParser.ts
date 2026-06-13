const CHORD_RE = /^[A-G](#|b)?(maj|min|m|dim|aug|sus|add)?(\d+)?([b#]\d+)?(\/[A-G](#|b)?)?$/;

// Normaliza notaciones alternativas de acordes:
//   Am7(5-)  → Am7b5   (bemol con signo menos)
//   G7(9+)   → G7#9    (sostenido con signo más)
//   C7(b5)   → C7b5    (bemol explícito)
//   G7(#9)   → G7#9    (sostenido explícito)
//   Am(maj7) → Ammaj7  (genérico)
function normalizeChord(name: string): string {
  return name
    .replace(/\((\d+)-\)/g, 'b$1')
    .replace(/\((\d+)\+\)/g, '#$1')
    .replace(/\(b(\d+)\)/g, 'b$1')
    .replace(/\(#(\d+)\)/g, '#$1')
    .replace(/\(([^)]+)\)/g, '$1');
}

function isChord(token: string): boolean {
  return CHORD_RE.test(normalizeChord(token));
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.length > 0 && tokens.every(isChord);
}

// Letra o cifra española — incluye acentos y ñ
const isWordChar = (c: string | undefined): boolean =>
  c !== undefined && /[\wáéíóúüñÁÉÍÓÚÜÑ]/.test(c);

function mergeChordAndLyric(chordLine: string, lyricLine: string): string {
  // Incluye paréntesis opcionales: Am7(5-), G7(9+), etc.
  const chordRegex = /[A-G](#|b)?(maj|min|m|dim|aug|sus|add)?(\d+)?([b#]\d+)?(\([^)]+\))?(\/[A-G](#|b)?)?/g;
  const chords: { pos: number; name: string }[] = [];
  let match;
  while ((match = chordRegex.exec(chordLine)) !== null) {
    chords.push({ pos: match.index, name: normalizeChord(match[0]) });
  }
  if (chords.length === 0) return lyricLine.trim();

  let result = lyricLine;
  for (let i = chords.length - 1; i >= 0; i--) {
    const { pos, name } = chords[i];
    let insertPos = Math.min(pos, result.length);
    // Si la inserción cae dentro de una palabra, retroceder al inicio de esa palabra
    if (isWordChar(result[insertPos - 1]) && isWordChar(result[insertPos])) {
      while (insertPos > 0 && isWordChar(result[insertPos - 1])) insertPos--;
    }
    result = result.slice(0, insertPos) + `[${name}]` + result.slice(insertPos);
  }
  return result.trim();
}

// Distribuye N acordes de forma uniforme sobre las palabras de la letra
function distributeChords(chords: string[], lyricLine: string): string {
  const trimmed = lyricLine.trim();
  if (chords.length === 0) return trimmed;
  if (chords.length === 1) return `[${chords[0]}]${trimmed}`;

  const words = trimmed.split(/\s+/);
  const insertions = new Map<number, string[]>();

  chords.forEach((chord, i) => {
    const wordIdx = Math.floor(i * words.length / chords.length);
    if (!insertions.has(wordIdx)) insertions.set(wordIdx, []);
    insertions.get(wordIdx)!.push(`[${chord}]`);
  });

  const parts: string[] = [];
  words.forEach((word, i) => {
    if (insertions.has(i)) parts.push(insertions.get(i)!.join(''));
    parts.push(word);
  });

  return parts.join(' ').trim();
}

export function preprocessChordSheet(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push('');
      i++;
      continue;
    }

    if (isChordLine(line)) {
      // Recolectar todas las líneas de acordes consecutivas
      const chordLines: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() && isChordLine(lines[j])) {
        chordLines.push(lines[j]);
        j++;
      }

      const lyricLine = lines[j];
      const hasLyric = lyricLine !== undefined && lyricLine.trim() && !isChordLine(lyricLine);

      if (hasLyric) {
        if (chordLines.length === 1) {
          result.push(mergeChordAndLyric(chordLines[0], lyricLine));
        } else {
          const allChords = chordLines.flatMap(cl =>
            cl.trim().split(/\s+/).filter(Boolean).map(normalizeChord)
          );
          result.push(distributeChords(allChords, lyricLine));
        }
        i = j + 1;
      } else {
        // Sin letra siguiente → líneas instrumentales
        for (const cl of chordLines) {
          result.push(
            cl.trim().split(/\s+/).filter(Boolean).map(c => `[${normalizeChord(c)}]`).join(' ')
          );
        }
        i = j;
      }
    } else {
      result.push(trimmed);
      i++;
    }
  }

  return result.join('\n');
}
