import React, { useState, useRef, useEffect, useCallback } from 'react';

export const MetronomePanel: React.FC = () => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const schedulerRef = useRef<number | null>(null);
  const nextNoteRef = useRef(0);
  const bpmRef = useRef(bpm);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => { bpmRef.current = bpm; }, [bpm]);

  const scheduleNote = useCallback((time: number) => {
    const ctx = audioCtxRef.current!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.4, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
    osc.start(time);
    osc.stop(time + 0.1);
  }, []);

  const runScheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const interval = 60 / bpmRef.current;
    while (nextNoteRef.current < ctx.currentTime + 0.1) {
      scheduleNote(nextNoteRef.current);
      const delay = (nextNoteRef.current - ctx.currentTime) * 1000;
      setTimeout(() => setBeat(b => !b), Math.max(0, delay));
      nextNoteRef.current += interval;
    }
  }, [scheduleNote]);

  useEffect(() => {
    if (isPlaying) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      nextNoteRef.current = ctx.currentTime + 0.05;
      schedulerRef.current = window.setInterval(runScheduler, 25);
    } else {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    }
    return () => { if (schedulerRef.current) clearInterval(schedulerRef.current); };
  }, [isPlaying, runScheduler]);

  // Restart scheduler when bpm changes while playing
  useEffect(() => {
    if (isPlaying) {
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 50);
    }
  }, [bpm]);

  const handleTap = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 6) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const gaps = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      setBpm(Math.round(Math.min(240, Math.max(30, 60000 / avg))));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
      {/* Beat indicator */}
      <div className={`w-4 h-4 rounded-full transition-all duration-75 ${beat ? 'bg-blue-600 scale-125' : 'bg-blue-200 dark:bg-blue-700'}`} />

      {/* BPM control */}
      <div className="flex items-center gap-2">
        <button onClick={() => setBpm(b => Math.max(30, b - 5))} className="w-7 h-7 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">−</button>
        <div className="text-center">
          <input
            type="number"
            min={30} max={240}
            value={bpm}
            onChange={e => setBpm(Math.min(240, Math.max(30, Number(e.target.value))))}
            className="w-14 text-center font-bold text-lg bg-transparent text-gray-900 dark:text-white outline-none"
          />
          <div className="text-xs text-gray-400 -mt-1">BPM</div>
        </div>
        <button onClick={() => setBpm(b => Math.min(240, b + 5))} className="w-7 h-7 rounded bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">+</button>
      </div>

      {/* Tempo slider */}
      <input
        type="range" min={30} max={240} value={bpm}
        onChange={e => setBpm(Number(e.target.value))}
        className="w-24 accent-blue-600"
      />

      {/* Tap tempo */}
      <button
        onClick={handleTap}
        className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        Tap
      </button>

      {/* Play/Stop */}
      <button
        onClick={() => setIsPlaying(p => !p)}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        {isPlaying ? 'Detener' : 'Iniciar'}
      </button>
    </div>
  );
};
