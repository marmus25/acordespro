import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { SongData } from '../types';
import { ArrowLeftIcon, SearchIcon, SparklesIcon } from './Icons';
import { getCommunitySongs, CommunitySong, deleteCommunitySong, updateCommunitySongGenre, incrementViewCount } from '../services/communitySongs';

interface Props {
  onSelect: (song: SongData) => void;
  onBack: () => void;
}

const GENRES = ['Folklore', 'Rock', 'Pop', 'Cumbia', 'Tango', 'Balada', 'Tropical', 'Huayno', 'Saya', 'Cueca', 'Vals', 'Morenada', 'Tonada', 'Marcha', 'Otro'];

const genreColor: Record<string, string> = {
  Saya:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Tonada:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  Huayno:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Vals:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Marcha:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Morenada: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  Cueca:    'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  Folklore: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Rock:     'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  Pop:      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  Cumbia:   'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  Tango:    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export const SongCatalog: React.FC<Props> = ({ onSelect, onBack }) => {
  const [songs, setSongs]           = useState<CommunitySong[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [query, setQuery]           = useState('');
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [manageMode, setManageMode] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput]     = useState('');
  const [pinError, setPinError]     = useState(false);
  const [editingGenreId, setEditingGenreId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete]   = useState<Set<string>>(new Set());
  const [working, setWorking]       = useState(false);
  const [statusMsg, setStatusMsg]   = useState('');

  const ADMIN_PIN = '1441';

  const load = useCallback(() => {
    setLoading(true);
    getCommunitySongs()
      .then(setSongs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const genres = useMemo(
    () => [...new Set(songs.map(s => s.genre ?? '').filter(Boolean))].sort(),
    [songs],
  );

  // Detectar duplicados: mismo título+artista → conservar la de MAYOR view_count (más usada)
  const duplicateIds = useMemo(() => {
    const groups = new Map<string, CommunitySong[]>();
    songs.forEach(s => {
      const key = `${s.title.trim().toLowerCase()}|||${s.artist.trim().toLowerCase()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });
    const dups = new Set<string>();
    groups.forEach(group => {
      if (group.length < 2) return;
      // Ordenar: mayor view_count primero; empate → más antiguo primero
      const sorted = [...group].sort((a, b) =>
        b.view_count - a.view_count || a.created_at.localeCompare(b.created_at)
      );
      sorted.slice(1).forEach(s => dups.add(s.id)); // todos menos el primero son duplicados
    });
    return dups;
  }, [songs]);

  const filtered = useMemo(() =>
    songs.filter(song => {
      const q = query.toLowerCase();
      const matchQuery = !q || song.title.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
      const matchGenre = !activeGenre || song.genre === activeGenre;
      return matchQuery && matchGenre;
    }),
    [songs, query, activeGenre],
  );

  // ── Eliminar seleccionados ────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setWorking(true);
    try {
      await deleteCommunitySong(id);
      setSongs(prev => prev.filter(s => s.id !== id));
      setPendingDelete(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e: any) {
      setStatusMsg('Error al eliminar: ' + e.message);
    } finally { setWorking(false); }
  };

  const handleDeleteDuplicates = async () => {
    if (duplicateIds.size === 0) { setStatusMsg('No hay duplicados.'); return; }
    if (!confirm(`¿Eliminar ${duplicateIds.size} canción(es) duplicada(s)?`)) return;
    setWorking(true);
    setStatusMsg('');
    let deleted = 0;
    for (const id of duplicateIds) {
      try { await deleteCommunitySong(id); deleted++; } catch {}
    }
    setSongs(prev => prev.filter(s => !duplicateIds.has(s.id)));
    setStatusMsg(`✅ ${deleted} duplicada(s) eliminada(s).`);
    setWorking(false);
  };

  // ── Editar género ─────────────────────────────────────────────────────────
  const handleGenreChange = async (id: string, genre: string) => {
    try {
      await updateCommunitySongGenre(id, genre);
      setSongs(prev => prev.map(s => s.id === id ? { ...s, genre } : s));
    } catch (e: any) {
      setStatusMsg('Error al actualizar género: ' + e.message);
    } finally { setEditingGenreId(null); }
  };

  return (
    <div className="max-w-2xl mx-auto mt-4 px-4 pb-10">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <SparklesIcon className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Catálogo Comunitario</h2>
        <span className="ml-auto text-xs text-gray-400">{loading ? '...' : `${songs.length} canciones`}</span>
        <button
          onClick={() => {
            if (manageMode) { setManageMode(false); setStatusMsg(''); setPendingDelete(new Set()); }
            else { setPinInput(''); setPinError(false); setShowPinModal(true); }
          }}
          className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${manageMode ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        >
          {manageMode ? '✕ Salir' : '⚙ Admin'}
        </button>
      </div>

      {/* Panel de gestión */}
      {manageMode && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleDeleteDuplicates}
              disabled={working || duplicateIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition-colors"
            >
              🗑 Eliminar duplicadas {duplicateIds.size > 0 && `(${duplicateIds.size})`}
            </button>
            <span className="text-xs text-amber-700 dark:text-amber-400">
              Tocá el ícono de género en cada canción para clasificarla. Tocá 🗑 para eliminarla.
            </span>
          </div>
          {statusMsg && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{statusMsg}</p>}
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="Buscar canción o artista..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {/* Filtro de géneros */}
      {genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setActiveGenre(null)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!activeGenre ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
          >Todos</button>
          {genres.map(genre => (
            <button key={genre}
              onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${activeGenre === genre ? 'bg-blue-600 text-white' : `${genreColor[genre] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'} hover:opacity-80`}`}
            >{genre}</button>
          ))}
        </div>
      )}

      {/* Modal PIN admin */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
          <div className="bg-white dark:bg-gray-900 border-2 border-gray-900 dark:border-gray-200 rounded-2xl p-6 w-full max-w-xs shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">🔒 Acceso Admin</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Ingresá el PIN para gestionar el catálogo</p>
            <input
              autoFocus
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false); }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (pinInput === ADMIN_PIN) { setShowPinModal(false); setManageMode(true); }
                  else { setPinError(true); setPinInput(''); }
                }
              }}
              placeholder="PIN"
              className={`w-full border-2 rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-widest outline-none mb-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${pinError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'}`}
            />
            {pinError && <p className="text-red-500 text-xs text-center mb-3">PIN incorrecto</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowPinModal(false)}
                className="flex-1 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (pinInput === ADMIN_PIN) { setShowPinModal(false); setManageMode(true); }
                  else { setPinError(true); setPinInput(''); }
                }}
                className="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold">
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}
      {error   && <div className="text-center py-16 text-red-500 text-sm">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          {songs.length === 0 ? '¡Sé el primero en compartir una canción!' : 'Sin resultados.'}
        </div>
      )}

      {/* Lista */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-1.5">
          {filtered.map(song => {
            const isDup = duplicateIds.has(song.id);
            return (
              <div
                key={song.id}
                className={`flex items-center gap-2 bg-white dark:bg-gray-800 border rounded-xl px-3 py-3 transition-all ${isDup && manageMode ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'}`}
              >
                {/* Nombre */}
                <button
                  onClick={() => { if (!manageMode) { incrementViewCount(song.id); onSelect(song); } }}
                  className="flex-1 text-left min-w-0"
                  disabled={manageMode}
                >
                  <p className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                    {song.title}
                    {isDup && manageMode && <span className="ml-1.5 text-[10px] font-bold text-red-500 uppercase">duplicada</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {song.artist} · <span className="text-blue-600 dark:text-blue-400 font-medium">{song.originalKey}</span>
                    {manageMode && <span className="ml-1.5 text-gray-400">· 👁 {song.view_count}</span>}
                  </p>
                </button>

                {/* Badge género / selector */}
                {manageMode && editingGenreId === song.id ? (
                  <select
                    autoFocus
                    defaultValue={song.genre ?? ''}
                    onBlur={e => handleGenreChange(song.id, e.target.value)}
                    onChange={e => handleGenreChange(song.id, e.target.value)}
                    className="text-xs border border-blue-400 rounded-lg px-1 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                  >
                    <option value="">Sin género</option>
                    {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : (
                  <button
                    onClick={() => manageMode && setEditingGenreId(song.id)}
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${genreColor[song.genre ?? ''] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'} ${manageMode ? 'ring-2 ring-blue-400 ring-offset-1 cursor-pointer' : ''}`}
                    title={manageMode ? 'Cambiar género' : undefined}
                  >
                    {song.genre || (manageMode ? '+ género' : '')}
                  </button>
                )}

                {/* Botón eliminar */}
                {manageMode && (
                  <button
                    onClick={() => handleDelete(song.id)}
                    disabled={working}
                    className="flex-shrink-0 text-red-500 hover:text-red-700 dark:hover:text-red-400 disabled:opacity-30 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Eliminar canción"
                  >
                    🗑
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
