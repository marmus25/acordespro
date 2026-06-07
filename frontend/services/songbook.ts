import { SongData, SavedSong } from '../types';

const KEY = 'acordespro_songbook';

function getAll(): SavedSong[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function saveAll(songs: SavedSong[]): void {
  localStorage.setItem(KEY, JSON.stringify(songs));
}

export function saveSong(song: SongData): SavedSong {
  const saved: SavedSong = { ...song, id: Date.now().toString(), savedAt: Date.now() };
  const songs = getAll();
  songs.unshift(saved);
  saveAll(songs);
  return saved;
}

export function updateSong(id: string, song: SongData): void {
  const songs = getAll();
  const idx = songs.findIndex(s => s.id === id);
  if (idx !== -1) songs[idx] = { ...song, id, savedAt: songs[idx].savedAt };
  saveAll(songs);
}

export function deleteSong(id: string): void {
  saveAll(getAll().filter(s => s.id !== id));
}

export function listSongs(): SavedSong[] {
  return getAll();
}
