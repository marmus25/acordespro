import React, { useState, useMemo } from 'react';
import { songCatalog } from '../data/songCatalog';
import { SongData } from '../types';
import { ArrowLeftIcon, SearchIcon, SparklesIcon } from './Icons';

interface Props {
  onSelect: (song: SongData) => void;
  onBack: () => void;
}

const genreColor: Record<string, string> = {
  Saya:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Tonada:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Huayno:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Vals:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Marcha:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Morenada:'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Cueca:   'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

export const SongCatalog: React.FC<Props> = ({ onSelect, onBack }) => {
  const [query, setQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const genres = useMemo(
    () => [...new Set(songCatalog.map(s => s.genre))].sort(),
    []
  );

  const filtered = useMemo(
    () =>
      songCatalog.filter(song => {
        const q = query.toLowerCase();
        const matchQuery =
          !q ||
          song.title.toLowerCase().includes(q) ||
          song.artist.toLowerCase().includes(q);
        const matchGenre = !activeGenre || song.genre === activeGenre;
        return matchQuery && matchGenre;
      }),
    [query, activeGenre]
  );

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <SparklesIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Folklor Boliviano
        </h2>
        <span className="ml-auto text-sm text-gray-400">
          {songCatalog.length} canciones
        </span>
      </div>

      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          placeholder="Buscar canción o artista..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setActiveGenre(null)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            !activeGenre
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Todos
        </button>
        {genres.map(genre => (
          <button
            key={genre}
            onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeGenre === genre
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {genre}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          Sin resultados para tu búsqueda.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((song, i) => (
            <button
              key={i}
              onClick={() => onSelect(song)}
              className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all text-left"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {song.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {song.artist} ·{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {song.originalKey}
                  </span>
                </p>
              </div>
              <span
                className={`ml-3 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  genreColor[song.genre] ??
                  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {song.genre}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
