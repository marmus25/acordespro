export interface PracticeSettings {
  bpm: number;
  eqBass: number;
  eqMids: number;
  eqTreble: number;
  delayTime: number;
  delayFeedback: number;
  delayWet: number;
  reverb: number;
  strumTs?: string;
  strumPresetName?: string;
}

export interface SongData {
  title: string;
  artist: string;
  originalKey: string;
  lines: string[];
  youtubeUrl?: string;
  practiceSettings?: PracticeSettings;
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
  isChordOnly?: boolean;
}
