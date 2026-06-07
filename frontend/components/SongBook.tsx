import React, { useState, useEffect } from 'react';
import { SavedSong } from '../types';
import { listSongs, deleteSong } from '../services/songbook';
import { ArrowLeftIcon, SearchIcon, TrashIcon, BookOpenIcon, DownloadIcon } from './Icons';

interface SongBookProps {
  onOpen: (song: SavedSong) => void;
  onBack: () => void;
}

export const SongBook: React.FC<SongBookProps> = ({ onOpen, onBack }) => {
  const [songs, setSongs] = useState<SavedSong[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setSongs(listSongs());
  }, []);

  const handleExportPDF = () => {
    const allSongs = listSongs();
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cancionero - AcordesPro</title>
    <style>body{font-family:'Courier New',monospace;max-width:800px;margin:0 auto;padding:20px}
    .song{page-break-before:always;padding:20px 0}.song:first-child{page-break-before:avoid}
    h1{font-size:22px;margin:0}h2{font-size:14px;color:#666;margin:4px 0 16px}
    .key{color:#3182ce}pre{font-size:13px;white-space:pre-wrap;line-height:1.9}hr{margin:0;opacity:.2}</style>
    </head><body>
    ${allSongs.map((s, i) => `<div class="song">${i > 0 ? '<hr/>' : ''}<h1>${s.title}</h1><h2>${s.artist} · <span class="key">Tono: ${s.originalKey}</span></h2><pre>${s.lines.join('\n')}</pre></div>`).join('')}
    <script>window.print();window.close();</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta canción del cancionero?')) return;
    deleteSong(id);
    setSongs(prev => prev.filter(s => s.id !== id));
  };

  const filtered = songs.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    s.artist.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <BookOpenIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mis canciones</h2>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-gray-400">{songs.length} guardadas</span>
          {songs.length > 0 && (
            <button onClick={handleExportPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors" title="Exportar todo como PDF">
              <DownloadIcon className="w-4 h-4" /> PDF
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          placeholder="Buscar por título o artista..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          {songs.length === 0
            ? 'Todavía no tienes canciones guardadas.'
            : 'Sin resultados para tu búsqueda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(song => (
            <div
              key={song.id}
              onClick={() => onOpen(song)}
              className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all group"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">{song.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{song.artist} · <span className="text-blue-600 dark:text-blue-400 font-medium">{song.originalKey}</span></p>
              </div>
              <button
                onClick={e => handleDelete(song.id, e)}
                className="ml-4 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                title="Eliminar"
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
