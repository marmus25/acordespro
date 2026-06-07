import React, { useState, useEffect } from 'react';
import { SetList } from '../types';
import { listSetLists, createSetList, deleteSetList } from '../services/setlist';
import { ArrowLeftIcon, ListMusicIcon, TrashIcon, XIcon, CheckIcon } from './Icons';

interface Props {
  onOpen: (setList: SetList) => void;
  onBack: () => void;
}

export const SetLists: React.FC<Props> = ({ onOpen, onBack }) => {
  const [lists, setLists] = useState<SetList[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => { setLists(listSetLists()); }, []);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const list = createSetList(newName.trim());
    setLists(prev => [list, ...prev]);
    setNewName('');
    setCreating(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta setlist?')) return;
    deleteSetList(id);
    setLists(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <ListMusicIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Setlists</h2>
        <button
          onClick={() => setCreating(true)}
          className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Nueva
        </button>
      </div>

      {creating && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre de la setlist..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
          />
          <button onClick={handleCreate} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"><CheckIcon className="w-5 h-5" /></button>
          <button onClick={() => setCreating(false)} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><XIcon className="w-5 h-5" /></button>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No tienes setlists todavía. Crea una para organizar tus canciones.</div>
      ) : (
        <div className="space-y-2">
          {lists.map(list => (
            <div
              key={list.id}
              onClick={() => onOpen(list)}
              className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
            >
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{list.name}</p>
                <p className="text-sm text-gray-400">{list.songIds.length} canción{list.songIds.length !== 1 ? 'es' : ''}</p>
              </div>
              <button
                onClick={e => handleDelete(list.id, e)}
                className="ml-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
