import React, { useState, useEffect } from 'react';
import { SetList, SavedSong } from '../types';
import { getSetList, removeSongFromSetList, reorderSetList } from '../services/setlist';
import { listSongs } from '../services/songbook';
import { ArrowLeftIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';

interface Props {
  setListId: string;
  onOpenSong: (song: SavedSong) => void;
  onBack: () => void;
}

export const SetListDetail: React.FC<Props> = ({ setListId, onOpenSong, onBack }) => {
  const [setList, setSetList] = useState<SetList | null>(null);
  const [songs, setSongs] = useState<SavedSong[]>([]);

  useEffect(() => {
    const list = getSetList(setListId);
    setSetList(list);
    if (list) {
      const allSongs = listSongs();
      const ordered = list.songIds
        .map(id => allSongs.find(s => s.id === id))
        .filter(Boolean) as SavedSong[];
      setSongs(ordered);
    }
  }, [setListId]);

  const handleRemove = (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeSongFromSetList(setListId, songId);
    setSongs(prev => prev.filter(s => s.id !== songId));
    setSetList(prev => prev ? { ...prev, songIds: prev.songIds.filter(id => id !== songId) } : prev);
  };

  const move = (index: number, dir: -1 | 1) => {
    const newSongs = [...songs];
    const target = index + dir;
    if (target < 0 || target >= newSongs.length) return;
    [newSongs[index], newSongs[target]] = [newSongs[target], newSongs[index]];
    setSongs(newSongs);
    reorderSetList(setListId, newSongs.map(s => s.id));
  };

  if (!setList) return null;

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{setList.name}</h2>
          <p className="text-sm text-gray-400">{songs.length} canciones</p>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">Esta setlist está vacía. Agrega canciones desde el cancionero.</div>
      ) : (
        <div className="space-y-2">
          {songs.map((song, i) => (
            <div
              key={song.id}
              onClick={() => onOpenSong(song)}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
            >
              <span className="text-gray-400 font-mono text-sm w-6 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{song.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{song.artist} · <span className="text-blue-600 dark:text-blue-400 font-medium">{song.originalKey}</span></p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors">
                  <ChevronUpIcon className="w-4 h-4" />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === songs.length - 1} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-colors">
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
                <button onClick={e => handleRemove(song.id, e)} className="p-1 text-gray-300 hover:text-red-500 transition-colors ml-1">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
