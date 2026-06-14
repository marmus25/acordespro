import React, { useState, useEffect, useCallback } from 'react';
import { setMasterEq, getMasterEqValues, EqBand } from '../utils/audio';

const STORAGE_KEY = 'audio_eq_v1';

interface BandDef {
  key: EqBand;
  label: string;
  freq: string;
  color: string;
}

const BANDS: BandDef[] = [
  { key: 'bass',     label: 'Bajo',      freq: '150 Hz',  color: '#f97316' },
  { key: 'body',     label: 'Cuerpo',    freq: '430 Hz',  color: '#eab308' },
  { key: 'mid',      label: 'Medios',    freq: '1.1 kHz', color: '#22c55e' },
  { key: 'presence', label: 'Presencia', freq: '2.8 kHz', color: '#3b82f6' },
  { key: 'air',      label: 'Aire',      freq: '9 kHz',   color: '#a855f7' },
];

const clamp = (v: number) => Math.max(-12, Math.min(12, v));

const loadSaved = (): Record<EqBand, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { bass: 0, body: 0, mid: 0, presence: 0, air: 0 };
};

const saveToDisk = (vals: Record<EqBand, number>) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vals)); } catch (_) {}
};

interface Props {
  onClose: () => void;
}

export const AudioEQ: React.FC<Props> = ({ onClose }) => {
  const [vals, setVals] = useState<Record<EqBand, number>>(() => {
    const saved = loadSaved();
    // Aplicar al engine en cuanto se monta
    (Object.keys(saved) as EqBand[]).forEach(b => setMasterEq(b, saved[b]));
    return saved;
  });

  // Sincronizar con lo que el engine realmente tiene (por si getMaster() se creó antes de montar)
  useEffect(() => {
    const current = getMasterEqValues();
    // Si los valores del engine difieren de los guardados, los valores guardados ganan
    (Object.keys(vals) as EqBand[]).forEach(b => setMasterEq(b, vals[b]));
    // Silenciar warning de deps — solo queremos ejecutar esto una vez al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = useCallback((band: EqBand, raw: number) => {
    const v = clamp(raw);
    setMasterEq(band, v);
    setVals(prev => {
      const next = { ...prev, [band]: v };
      saveToDisk(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const flat = { bass: 0, body: 0, mid: 0, presence: 0, air: 0 };
    (Object.keys(flat) as EqBand[]).forEach(b => setMasterEq(b, 0));
    setVals(flat);
    saveToDisk(flat);
  }, []);

  return (
    <div
      className="fixed bottom-20 right-4 z-50 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 select-none"
      style={{ width: 300 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <EqIcon />
          <span className="font-bold text-sm text-gray-800 dark:text-gray-100">Ecualizador</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">— guitarra</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={reset}
            className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div className="flex items-end gap-3 justify-center h-36">
        {BANDS.map(({ key, label, freq, color }) => (
          <BandSlider
            key={key}
            label={label}
            freq={freq}
            color={color}
            value={vals[key]}
            onChange={v => handleChange(key, v)}
          />
        ))}
      </div>

      {/* dB scale labels */}
      <div className="flex justify-end mt-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-600">±12 dB</span>
      </div>
    </div>
  );
};

// ── Slider vertical por banda ─────────────────────────────────────────────────
interface SliderProps {
  label: string; freq: string; color: string;
  value: number; onChange: (v: number) => void;
}

const BandSlider: React.FC<SliderProps> = ({ label, freq, color, value, onChange }) => {
  const pct = ((value + 12) / 24) * 100; // 0–100 para la barra visual

  return (
    <div className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
      {/* Valor numérico */}
      <span className="text-[11px] font-mono font-semibold" style={{ color, minWidth: 30, textAlign: 'center' }}>
        {value > 0 ? '+' : ''}{value.toFixed(0)}
      </span>

      {/* Track del slider */}
      <div className="relative flex justify-center" style={{ height: 80, width: '100%' }}>
        {/* Línea central (0 dB) */}
        <div
          className="absolute left-1/2 -translate-x-px bg-gray-300 dark:bg-gray-600"
          style={{ top: 0, bottom: 0, width: 1 }}
        />
        {/* Relleno coloreado desde 0 hacia el valor */}
        <div
          className="absolute left-1/2 -translate-x-px rounded-full"
          style={{
            background: color,
            width: 3,
            top:    value >= 0 ? `${50 - pct / 2}%` : '50%',
            height: `${Math.abs(value) / 24 * 100}%`,
          }}
        />
        {/* Input range vertical */}
        <input
          type="range"
          min={-12} max={12} step={0.5}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="absolute"
          style={{
            writingMode: 'vertical-lr' as any,
            direction: 'rtl' as any,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            opacity: 0,
            zIndex: 2,
          }}
        />
        {/* Thumb visual */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-white dark:border-gray-900 shadow-md"
          style={{
            width: 14, height: 14,
            background: color,
            top: `${100 - pct}%`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Etiqueta */}
      <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 leading-none">{label}</span>
      <span className="text-[9px] text-gray-400 dark:text-gray-600 leading-none">{freq}</span>
    </div>
  );
};

// ── Iconos inline ─────────────────────────────────────────────────────────────
const EqIcon = () => (
  <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" className="text-blue-500">
    <rect x="2"  y="14" width="3" height="8" rx="1.5" />
    <rect x="2"  y="2"  width="3" height="5" rx="1.5" opacity={0.3}/>
    <rect x="7"  y="8"  width="3" height="14" rx="1.5" />
    <rect x="7"  y="2"  width="3" height="3"  rx="1.5" opacity={0.3}/>
    <rect x="12" y="5"  width="3" height="17" rx="1.5" />
    <rect x="12" y="2"  width="3" height="2"  rx="1.5" opacity={0.3}/>
    <rect x="17" y="10" width="3" height="12" rx="1.5" />
    <rect x="17" y="2"  width="3" height="5"  rx="1.5" opacity={0.3}/>
  </svg>
);

const XIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M18 6 6 18M6 6l12 12"/>
  </svg>
);
