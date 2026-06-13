import React, { useState, useEffect, useRef } from 'react';
import { LicenseGate } from './components/LicenseGate';
import { getLocalLicense, verifyLicense } from './services/license';
import { searchSongText, searchWithScraper, scraperAvailable, processSongFile, fileToBase64 } from './services/gemini';
import { preprocessChordSheet } from './services/chordParser';
import { SongData, SavedSong } from './types';
import { ClipboardIcon, BookOpenIcon, SunIcon, MoonIcon, ListMusicIcon, SparklesIcon, MusicIcon, UploadIcon, SearchIcon } from './components/Icons';
import { SongViewer } from './components/SongViewer';
import { SongBook } from './components/SongBook';
import { SetLists } from './components/SetLists';
import { SetListDetail } from './components/SetListDetail';
import { SongCatalog } from './components/SongCatalog';
import { saveSong, updateSong } from './services/songbook';
import { SetList } from './types';

type AppState = 'idle' | 'loading' | 'viewing' | 'songbook' | 'setlists' | 'setlist-detail' | 'catalog';

export default function App() {
  const [licensed, setLicensed] = useState<boolean | null>(() => {
    if (import.meta.env.DEV) return true;
    return null;
  });

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const local = getLocalLicense();
    if (!local) { setLicensed(false); return; }
    verifyLicense().then(ok => setLicensed(ok)).catch(() => setLicensed(true));
  }, []);

  if (licensed === null) return (
    <div style={{ position: 'fixed', inset: 0, background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6b7280', fontSize: 14 }}>Verificando licencia...</div>
    </div>
  );

  if (!licensed) return <LicenseGate onActivated={() => setLicensed(true)} />;

  return <MainApp />;
}

function MainApp() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [songData, setSongData] = useState<SongData | null>(null);
  const [savedSongId, setSavedSongId] = useState<string | null>(null);
  const [currentSetListId, setCurrentSetListId] = useState<string | null>(null);
  const [previousState, setPreviousState] = useState<AppState>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return false; // Default: light mode
  });

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
    setErrorMsg('');
    try {
      // Intenta primero con el scraper local (Cifraclub — datos reales)
      const hasServer = await scraperAvailable();
      const data = hasServer
        ? await searchWithScraper(searchQuery)
        : await searchSongText(searchQuery);
      setSongData(data);
      setAppState('viewing');
    } catch (scraperErr: any) {
      // Si el scraper falló, intenta con Groq como fallback
      try {
        const data = await searchSongText(searchQuery);
        setSongData(data);
        setAppState('viewing');
      } catch (groqErr: any) {
        setErrorMsg(groqErr.message || scraperErr.message || 'No se encontró la canción.');
        setAppState('idle');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Formato no soportado. Usa JPG, PNG o PDF.');
      return;
    }
    setAppState('loading');
    setErrorMsg('');
    try {
      const { mimeType, data } = await fileToBase64(file);
      const song = await processSongFile(mimeType, data);
      setSongData(song);
      setAppState('viewing');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el archivo.');
      setAppState('idle');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim()) return;
    setAppState('loading');
    setErrorMsg('');
    try {
      const processedText = preprocessChordSheet(pasteText);
      const data = await searchSongText(
        `El siguiente texto es una canción en formato ChordPro. ` +
        `Extrae título, artista, tono y copia las líneas EXACTAMENTE — NO muevas ni agregues acordes.\n\n${processedText}`
      );
      setSongData(data);
      setAppState('viewing');
    } catch {
      // Fallback local si Groq falla
      const lines = preprocessChordSheet(pasteText).split('\n');
      const titleLine = lines.find(l => { const t = l.trim(); return t && !t.startsWith('['); });
      setSongData({ title: titleLine?.trim() || 'Sin título', artist: '', originalKey: '', lines });
      setAppState('viewing');
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
    if (previousState === 'songbook') setAppState('songbook');
    else if (previousState === 'setlist-detail') setAppState('setlist-detail');
    else if (previousState === 'catalog') setAppState('catalog');
    else resetApp();
  };

  const resetApp = () => {
    setAppState('idle');
    setSongData(null);
    setSavedSongId(null);
    setCurrentSetListId(null);
    setPreviousState('idle');
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
      <main className="flex-grow p-4 sm:p-6 lg:p-8 bg-gray-50 dark:bg-gray-950">
        {appState === 'idle' && (
          <div className="max-w-2xl mx-auto mt-10 sm:mt-20">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
                Tus acordes, a tu tono
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Explorá el catálogo comunitario o pegá una letra con acordes para transportarla al instante.
              </p>
            </div>

            {/* Catalog Card */}
            <div
              onClick={() => setAppState('catalog')}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 cursor-pointer hover:shadow-md transition-all mb-8"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Catálogo comunitario</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Canciones verificadas y listas para tocar</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Saya', 'Huayno', 'Vals', 'Tonada', 'Cueca', 'Morenada'].map(g => (
                  <span key={g} className="px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                    {g}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-right">
                <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Ver catálogo completo →</span>
              </div>
            </div>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium uppercase">O buscá / ingresá</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* AI Search */}
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar canción con IA — ej: José José El Triste"
                    className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Buscar
                </button>
              </div>
            </form>

            {/* File Upload (PDF + imagen) */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mb-4 flex items-center justify-center gap-3 bg-white dark:bg-gray-900 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 rounded-2xl p-5 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
            >
              <UploadIcon className="w-5 h-5" />
              <span className="font-medium">Subir imagen o PDF con acordes (IA)</span>
            </button>

            {errorMsg && (
              <p className="text-red-500 text-sm text-center mb-3">{errorMsg}</p>
            )}

            {/* Paste Box */}
            <form onSubmit={handlePasteSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardIcon className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900 dark:text-white">Pegá letra con acordes</span>
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
                Ver acordes
              </button>
            </form>
          </div>
        )}

        {appState === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">Buscando en Cifraclub...</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs">Puede tardar unos segundos</p>
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
