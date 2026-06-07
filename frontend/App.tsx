import React, { useState, useRef, useEffect } from 'react';
import { searchSongText, processSongFile, fileToBase64 } from './services/gemini';
import { preprocessChordSheet } from './services/chordParser';
import { SongData, SavedSong } from './types';
import { SearchIcon, UploadIcon, MusicIcon, ClipboardIcon, BookOpenIcon, SunIcon, MoonIcon, ListMusicIcon, SparklesIcon } from './components/Icons';
import { SongViewer } from './components/SongViewer';
import { SongBook } from './components/SongBook';
import { SetLists } from './components/SetLists';
import { SetListDetail } from './components/SetListDetail';
import { SongCatalog } from './components/SongCatalog';
import { saveSong, updateSong } from './services/songbook';
import { SetList } from './types';
import { songCatalog } from './data/songCatalog';

type AppState = 'idle' | 'loading' | 'viewing' | 'error' | 'songbook' | 'setlists' | 'setlist-detail' | 'catalog';

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [songData, setSongData] = useState<SongData | null>(null);
  const [savedSongId, setSavedSongId] = useState<string | null>(null);
  const [currentSetListId, setCurrentSetListId] = useState<string | null>(null);
  const [previousState, setPreviousState] = useState<AppState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setAppState('loading');
    try {
      const data = await searchSongText(searchQuery);
      setSongData(data);
      setAppState('viewing');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al buscar la canción.');
      setAppState('error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato no soportado. Usa JPG, PNG o PDF.');
      setAppState('error');
      return;
    }
    setAppState('loading');
    try {
      const { mimeType, data } = await fileToBase64(file);
      const song = await processSongFile(mimeType, data);
      setSongData(song);
      setAppState('viewing');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el archivo.');
      setAppState('error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    setAppState('loading');
    try {
      const processedText = preprocessChordSheet(pasteText);
      const data = await searchSongText(
        `El siguiente texto es una canción ya en formato ChordPro (acordes entre corchetes dentro de la letra). ` +
        `Extrae el título, artista, tono original y copia las líneas EXACTAMENTE como están — ` +
        `NO muevas, elimines ni agregues acordes. Los corchetes ya están en la posición correcta.\n\n${processedText}`
      );
      setSongData(data);
      setAppState('viewing');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el texto.');
      setAppState('error');
    }
  };

  const handleSaveSong = (song: SongData) => {
    const saved = saveSong(song);
    setSongData(song);
    setSavedSongId(saved.id);
  };

  const handleUpdateSong = (song: SongData) => {
    if (savedSongId) updateSong(savedSongId, song);
    setSongData(song);
  };

  const handleOpenFromCatalog = (song: SongData) => {
    setPreviousState('catalog');
    setSongData(song);
    setSavedSongId(null);
    setAppState('viewing');
  };

  const handleOpenFromSongbook = (saved: SavedSong) => {
    setPreviousState('songbook');
    setSongData(saved);
    setSavedSongId(saved.id);
    setAppState('viewing');
  };

  const handleOpenSetList = (list: SetList) => {
    setCurrentSetListId(list.id);
    setAppState('setlist-detail');
  };

  const handleOpenFromSetList = (saved: SavedSong) => {
    setPreviousState('setlist-detail');
    setSongData(saved);
    setSavedSongId(saved.id);
    setAppState('viewing');
  };

  const handleViewerBack = () => {
    if (previousState === 'songbook') { setAppState('songbook'); }
    else if (previousState === 'setlist-detail') { setAppState('setlist-detail'); }
    else if (previousState === 'catalog') { setAppState('catalog'); }
    else { resetApp(); }
  };

  const resetApp = () => {
    setAppState('idle');
    setSongData(null);
    setSavedSongId(null);
    setCurrentSetListId(null);
    setPreviousState('idle');
    setErrorMsg('');
    setSearchQuery('');
    setPasteText('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-800 print-hidden border-b border-transparent dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <MusicIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">AcordesPro</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAppState('songbook')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <BookOpenIcon className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Cancionero</span>
            </button>
            <button onClick={() => setAppState('setlists')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <ListMusicIcon className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Setlists</span>
            </button>
            <button onClick={() => setAppState('catalog')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <SparklesIcon className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Catálogo</span>
            </button>
            <button
              onClick={() => setDarkMode(d => !d)}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8">
        {appState === 'idle' && (
          <div className="max-w-2xl mx-auto mt-10 sm:mt-20">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                Tus acordes, a tu tono
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Busca cualquier canción o sube una foto/PDF de tus partituras. Extraeremos la letra y los acordes para que puedas transportarlos fácilmente.
              </p>
            </div>

            {/* Search Box */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <SearchIcon className="h-6 w-6 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="Ej: Let it be - The Beatles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="absolute inset-y-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Buscar
                </button>
              </form>
            </div>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium uppercase">O sube un archivo</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* Upload Box */}
            <div
              className="mt-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-10 text-center hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg, image/png, application/pdf" className="hidden" />
              <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UploadIcon className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Sube una imagen o PDF</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Soporta JPG, PNG y PDF con letras y acordes.</p>
            </div>

            <div className="relative flex items-center py-4 mt-4">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium uppercase">O pega la letra</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* Paste Box */}
            <form onSubmit={handlePasteSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardIcon className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900 dark:text-white">Pega letra con acordes</span>
              </div>
              <textarea
                className="block w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none"
                rows={6}
                placeholder={"[C]Ayer soñé [G]que te quería\n[Am]y hoy des[F]perté llorando..."}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button
                type="submit"
                disabled={!pasteText.trim()}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Procesar letra
              </button>
            </form>

            <div className="relative flex items-center py-4 mt-4">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium uppercase">O elige del catálogo</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* Catalog Card */}
            <div
              onClick={() => setAppState('catalog')}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Catálogo folklórico boliviano</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{songCatalog.length} canciones precargadas · sin IA</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Saya', 'Huayno', 'Vals', 'Tonada', 'Marcha'].map(g => (
                  <span key={g} className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                    {g}
                  </span>
                ))}
              </div>
              <div className="space-y-1">
                {songCatalog.slice(0, 3).map((s, i) => (
                  <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium text-gray-800 dark:text-gray-200">{s.title}</span>
                    {' — '}{s.artist}
                  </p>
                ))}
              </div>
              <div className="mt-3 text-right">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Ver catálogo completo →</span>
              </div>
            </div>
          </div>
        )}

        {appState === 'loading' && (
          <div className="flex flex-col items-center justify-center h-64 mt-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">Procesando canción...</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">La IA está extrayendo la letra y los acordes.</p>
          </div>
        )}

        {appState === 'error' && (
          <div className="max-w-lg mx-auto mt-20 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Oops, algo salió mal</h3>
            <p className="text-red-600 dark:text-red-400 mb-6">{errorMsg}</p>
            <button
              onClick={resetApp}
              className="bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Volver a intentar
            </button>
          </div>
        )}

        {appState === 'catalog' && (
          <SongCatalog onSelect={handleOpenFromCatalog} onBack={resetApp} />
        )}

        {appState === 'songbook' && (
          <SongBook onOpen={handleOpenFromSongbook} onBack={resetApp} />
        )}

        {appState === 'setlists' && (
          <SetLists onOpen={handleOpenSetList} onBack={resetApp} />
        )}

        {appState === 'setlist-detail' && currentSetListId && (
          <SetListDetail setListId={currentSetListId} onOpenSong={handleOpenFromSetList} onBack={() => setAppState('setlists')} />
        )}

        {appState === 'viewing' && songData && (
          <SongViewer
            song={songData}
            savedId={savedSongId}
            onBack={handleViewerBack}
            onSave={handleSaveSong}
            onUpdate={handleUpdateSong}
          />
        )}
      </main>
    </div>
  );
}
