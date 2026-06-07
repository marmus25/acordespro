import { SetList } from '../types';

const KEY = 'acordespro_setlists';

function getAll(): SetList[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}
function saveAll(lists: SetList[]): void {
  localStorage.setItem(KEY, JSON.stringify(lists));
}

export function createSetList(name: string): SetList {
  const list: SetList = { id: Date.now().toString(), name, songIds: [], createdAt: Date.now() };
  const all = getAll();
  all.unshift(list);
  saveAll(all);
  return list;
}

export function addSongToSetList(setListId: string, songId: string): void {
  const all = getAll();
  const idx = all.findIndex(l => l.id === setListId);
  if (idx !== -1 && !all[idx].songIds.includes(songId)) {
    all[idx].songIds.push(songId);
    saveAll(all);
  }
}

export function removeSongFromSetList(setListId: string, songId: string): void {
  const all = getAll();
  const idx = all.findIndex(l => l.id === setListId);
  if (idx !== -1) {
    all[idx].songIds = all[idx].songIds.filter(id => id !== songId);
    saveAll(all);
  }
}

export function reorderSetList(setListId: string, newOrder: string[]): void {
  const all = getAll();
  const idx = all.findIndex(l => l.id === setListId);
  if (idx !== -1) { all[idx].songIds = newOrder; saveAll(all); }
}

export function deleteSetList(id: string): void {
  saveAll(getAll().filter(l => l.id !== id));
}

export function listSetLists(): SetList[] { return getAll(); }

export function getSetList(id: string): SetList | null {
  return getAll().find(l => l.id === id) ?? null;
}
