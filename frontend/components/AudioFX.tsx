import React, { useState, useEffect, useCallback } from 'react';
import {
  setMasterEq, getMasterEqValues, EqBand,
  setMasterReverb, setMasterDelay, getMasterFxValues,
} from '../utils/audio';

const EQ_KEY  = 'audio_eq_v1';
const FX_KEY  = 'audio_fx_v1';

// ── EQ ─────────────────────────────────────────────────────────────────────────
interface BandDef { key: EqBand; label: string; freq: string; color: string; }
const BANDS: BandDef[] = [
  { key: 'bass',     label: 'Bajo',      freq: '150 Hz',  color: '#f97316' },
  { key: 'body',     label: 'Cuerpo',    freq: '430 Hz',  color: '#eab308' },
  { key: 'mid',      label: 'Medios',    freq: '1.1 kHz', color: '#22c55e' },
  { key: 'presence', label: 'Presencia', freq: '2.8 kHz', color: '#3b82f6' },
  { key: 'air',      label: 'Aire',      freq: '9 kHz',   color: '#a855f7' },
];

interface FxVals {
  reverbWet:     number;
  delayTimeMs:   number;
  delayFeedback: number;
  delayWet:      number;
}

const DEFAULT_EQ: Record<EqBand, number> = { bass: 0, body: 0, mid: 0, presence: 0, air: 0 };
const DEFAULT_FX: FxVals = { reverbWet: 0, delayTimeMs: 300, delayFeedback: 30, delayWet: 0 };

const loadEq = (): Record<EqBand, number> => {
  try { const r = localStorage.getItem(EQ_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return { ...DEFAULT_EQ };
};
const loadFx = (): FxVals => {
  try { const r = localStorage.getItem(FX_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return { ...DEFAULT_FX };
};

// ── Componente principal ───────────────────────────────────────────────────────
interface Props { onClose: () => void; }

type Tab = 'eq' | 'fx';

export const AudioFX: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<Tab>('eq');

  const [eq, setEqState] = useState<Record<EqBand, number>>(() => {
    const saved = loadEq();
    (Object.keys(saved) as EqBand[]).forEach(b => setMasterEq(b, saved[b]));
    return saved;
  });

  const [fx, setFxState] = useState<FxVals>(() => {
    const saved = loadFx();
    setMasterReverb(saved.reverbWet);
    setMasterDelay(saved.delayTimeMs, saved.delayFeedback, saved.delayWet);
    return saved;
  });

  useEffect(() => {
    (Object.keys(eq) as EqBand[]).forEach(b => setMasterEq(b, eq[b]));
  }, []);

  // ── EQ handlers ──────────────────────────────────────────────────────────────
  const handleEq = useCallback((band: EqBand, v: number) => {
    const clamped = Math.max(-12, Math.min(12, v));
    setMasterEq(band, clamped);
    setEqState(prev => {
      const next = { ...prev, [band]: clamped };
      try { localStorage.setItem(EQ_KEY, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  const resetEq = useCallback(() => {
    (Object.keys(DEFAULT_EQ) as EqBand[]).forEach(b => setMasterEq(b, 0));
    setEqState({ ...DEFAULT_EQ });
    try { localStorage.setItem(EQ_KEY, JSON.stringify(DEFAULT_EQ)); } catch (_) {}
  }, []);

  // ── FX handlers ──────────────────────────────────────────────────────────────
  const updateFx = useCallback((patch: Partial<FxVals>) => {
    setFxState(prev => {
      const next = { ...prev, ...patch };
      setMasterReverb(next.reverbWet);
      setMasterDelay(next.delayTimeMs, next.delayFeedback, next.delayWet);
      try { localStorage.setItem(FX_KEY, JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);

  const resetFx = useCallback(() => {
    setMasterReverb(0);
    setMasterDelay(DEFAULT_FX.delayTimeMs, DEFAULT_FX.delayFeedback, 0);
    const zeroed = { ...DEFAULT_FX, reverbWet: 0, delayWet: 0 };
    setFxState(zeroed);
    try { localStorage.setItem(FX_KEY, JSON.stringify(zeroed)); } catch (_) {}
  }, []);

  return (
    <div
      className="fixed bottom-20 right-4 z-50 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 select-none"
      style={{ width: 310 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <SoundIcon />
          <span className="font-bold text-sm text-gray-800 dark:text-gray-100">Efectos de audio</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
        >
          <XIcon />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mb-3 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {(['eq', 'fx'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1 text-xs font-semibold rounded-lg transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'eq' ? 'Ecualizador' : 'Reverb / Delay'}
          </button>
        ))}
      </div>

      {/* ── EQ tab ─────────────────────────────────────────────────────────── */}
      {tab === 'eq' && (
        <div className="px-4 pb-4">
          <div className="flex items-end gap-2 justify-center h-36 mb-1">
            {BANDS.map(({ key, label, freq, color }) => (
              <BandSlider
                key={key}
                label={label}
                freq={freq}
                color={color}
                value={eq[key]}
                onChange={v => handleEq(key, v)}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-600">±12 dB</span>
            <button
              onClick={resetEq}
              className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ── FX tab ─────────────────────────────────────────────────────────── */}
      {tab === 'fx' && (
        <div className="px-4 pb-4 flex flex-col gap-4">
          {/* Reverb */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-500">Reverb</span>
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">{fx.reverbWet}%</span>
            </div>
            <HorizSlider
              min={0} max={100} step={1}
              value={fx.reverbWet}
              color="#a855f7"
              label="Mezcla"
              onChange={v => updateFx({ reverbWet: v })}
            />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800" />

          {/* Delay */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-500">Delay</span>
            </div>
            <div className="flex flex-col gap-3">
              <HorizSlider
                min={0} max={800} step={10}
                value={fx.delayTimeMs}
                color="#06b6d4"
                label={`Tiempo — ${fx.delayTimeMs} ms`}
                onChange={v => updateFx({ delayTimeMs: v })}
              />
              <HorizSlider
                min={0} max={85} step={1}
                value={fx.delayFeedback}
                color="#06b6d4"
                label={`Feedback — ${fx.delayFeedback}%`}
                onChange={v => updateFx({ delayFeedback: v })}
              />
              <HorizSlider
                min={0} max={100} step={1}
                value={fx.delayWet}
                color="#06b6d4"
                label={`Mezcla — ${fx.delayWet}%`}
                onChange={v => updateFx({ delayWet: v })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={resetFx}
              className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Reset efectos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Slider vertical (EQ) ─────────────────────────────────────────────────────
interface BandSliderProps {
  label: string; freq: string; color: string;
  value: number; onChange: (v: number) => void;
}
const BandSlider: React.FC<BandSliderProps> = ({ label, freq, color, value, onChange }) => {
  const pct = ((value + 12) / 24) * 100;
  return (
    <div className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
      <span className="text-[11px] font-mono font-semibold" style={{ color, minWidth: 30, textAlign: 'center' }}>
        {value > 0 ? '+' : ''}{value.toFixed(0)}
      </span>
      <div className="relative flex justify-center" style={{ height: 80, width: '100%' }}>
        <div className="absolute left-1/2 -translate-x-px bg-gray-300 dark:bg-gray-600" style={{ top: 0, bottom: 0, width: 1 }} />
        <div
          className="absolute left-1/2 -translate-x-px rounded-full"
          style={{
            background: color, width: 3,
            top:    value >= 0 ? `${50 - pct / 2}%` : '50%',
            height: `${Math.abs(value) / 24 * 100}%`,
          }}
        />
        <input
          type="range" min={-12} max={12} step={0.5} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute"
          style={{ writingMode: 'vertical-lr' as any, direction: 'rtl' as any, width: '100%', height: '100%', cursor: 'pointer', opacity: 0, zIndex: 2 }}
        />
        <div
          className="absolute left-1/2 rounded-full border-2 border-white dark:border-gray-900 shadow-md"
          style={{ width: 14, height: 14, background: color, top: `${100 - pct}%`, transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        />
      </div>
      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-none">{label}</span>
      <span className="text-[9px] text-gray-400 dark:text-gray-600 leading-none">{freq}</span>
    </div>
  );
};

// ── Slider horizontal (FX) ───────────────────────────────────────────────────
interface HorizSliderProps {
  min: number; max: number; step: number;
  value: number; color: string; label: string;
  onChange: (v: number) => void;
}
const HorizSlider: React.FC<HorizSliderProps> = ({ min, max, step, value, color, label, onChange }) => {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
      <div className="relative h-4 flex items-center">
        <div className="absolute inset-y-0 flex items-center w-full">
          <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-gray-700 relative">
            <div
              className="absolute left-0 top-0 h-1 rounded-full"
              style={{ width: `${pct}%`, background: color }}
            />
          </div>
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute w-full"
          style={{ opacity: 0, cursor: 'pointer', zIndex: 2, height: '100%' }}
        />
        <div
          className="absolute rounded-full border-2 border-white dark:border-gray-900 shadow-md"
          style={{ width: 14, height: 14, background: color, left: `calc(${pct}% - 7px)`, pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
};

// ── Iconos ────────────────────────────────────────────────────────────────────
const SoundIcon = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" className="text-blue-500">
    <rect x="2"  y="14" width="3" height="8" rx="1.5" />
    <rect x="7"  y="8"  width="3" height="14" rx="1.5" />
    <rect x="12" y="5"  width="3" height="17" rx="1.5" />
    <rect x="17" y="10" width="3" height="12" rx="1.5" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
