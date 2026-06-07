export interface SongData {
  title: string;
  artist: string;
  originalKey: string;
  lines: string[];
}

export interface SavedSong extends SongData {
  id: string;
  savedAt: number;
}

export interface SetList {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

export interface ParsedSegment {
  chord: string | null;
  text: string;
}

export interface ParsedLine {
  segments: ParsedSegment[];
}
