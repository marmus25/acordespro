import { parseChordProLine } from './transpose';

export interface PlaySegment { text: string; chord?: string; }
export interface PlayLine { id: string; segments: PlaySegment[]; }
export interface PlaySection { title: string; lines: PlayLine[]; }

const CHORD_ROOT_RE = /^[A-G][#b]?/;

function isSectionHeader(line: string): string | null {
  const t = line.trim();
  const m = t.match(/^\[([^\]]+)\]$/);
  if (!m) return null;
  const inner = m[1];
  if (CHORD_ROOT_RE.test(inner) && !/\s/.test(inner)) return null;
  return inner;
}

export function chordproToSections(lines: string[]): PlaySection[] {
  const sections: PlaySection[] = [];
  let current: PlaySection = { title: '', lines: [] };
  let id = 0;

  const push = () => {
    if (current.lines.length > 0) sections.push(current);
  };

  for (const line of lines) {
    if (!line.trim()) { push(); current = { title: '', lines: [] }; continue; }

    const header = isSectionHeader(line);
    if (header) { push(); current = { title: header, lines: [] }; continue; }

    const parsed = parseChordProLine(line);
    const segments: PlaySegment[] = parsed.segments.map(s => ({
      text: s.text,
      ...(s.chord ? { chord: s.chord } : {}),
    }));

    if (segments.some(s => s.text.trim() || s.chord)) {
      current.lines.push({ id: `pl-${id++}`, segments });
    }
  }

  push();
  return sections.length > 0 ? sections : [{ title: '', lines: [] }];
}

export function getNthChordIdx(line: PlayLine, n: number): number {
  let count = 0;
  for (let i = 0; i < line.segments.length; i++) {
    if (line.segments[i].chord) { if (count === n) return i; count++; }
  }
  return 0;
}
