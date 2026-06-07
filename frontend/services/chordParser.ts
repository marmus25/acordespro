const CHORD_RE = /^[A-G](#|b)?(maj|min|m|dim|aug|sus|add)?(\d+)?(\/[A-G](#|b)?)?$/;

function isChord(token: string): boolean {
  return CHORD_RE.test(token);
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  return tokens.length > 0 && tokens.every(isChord);
}

function mergeChordAndLyric(chordLine: string, lyricLine: string): string {
  const chordRegex = /[A-G](#|b)?(maj|min|m|dim|aug|sus|add)?(\d+)?(\/[A-G](#|b)?)?/g;
  const chords: { pos: number; name: string }[] = [];
  let match;
  while ((match = chordRegex.exec(chordLine)) !== null) {
    chords.push({ pos: match.index, name: match[0] });
  }
  if (chords.length === 0) return lyricLine.trim();

  let result = lyricLine;
  for (let i = chords.length - 1; i >= 0; i--) {
    const { pos, name } = chords[i];
    const insertPos = Math.min(pos, result.length);
    result = result.slice(0, insertPos) + `[${name}]` + result.slice(insertPos);
  }
  return result.trim();
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
      const nextLine = lines[i + 1];
      if (nextLine !== undefined && nextLine.trim() && !isChordLine(nextLine)) {
        result.push(mergeChordAndLyric(line, nextLine));
        i += 2;
      } else {
        // Instrumental line (intro, solo, etc.)
        result.push(trimmed.split(/\s+/).map(c => `[${c}]`).join(' '));
        i++;
      }
    } else {
      result.push(trimmed);
      i++;
    }
  }

  return result.join('\n');
}
