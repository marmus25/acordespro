export type Stroke = 'D' | 'U' | '-' | 'DL'; // DL = Down Largo (barrido lento)
export type TimeSignature = '2/4' | '3/4' | '4/4' | '6/8' | '9/8' | '12/8';

export interface StrumPreset {
  name: string;
  ts: TimeSignature;
  pattern: Stroke[];
  timing: string[];
}

export const ALL_PRESETS: StrumPreset[] = [
  // ══ 4/4 — Cuaternario simple ══════════════════════════════════════════
  { name: 'Básico',       ts: '4/4', pattern: ['D','D','D','D'],                   timing: ['1','2','3','4'] },
  { name: 'Bolero',       ts: '4/4', pattern: ['D','DL','U','D','U','-'],          timing: ['1','2','&','3','&','4'] },
  { name: '8vas',         ts: '4/4', pattern: ['D','U','D','U','D','U','D','U'],   timing: ['1','&','2','&','3','&','4','&'] },
  { name: 'Balada',       ts: '4/4', pattern: ['D','-','D','U','-','U','D','U'],   timing: ['1','-','2','&','-','&','4','&'] },
  { name: 'Folk',         ts: '4/4', pattern: ['D','-','D','U','D','U','-','U'],   timing: ['1','-','2','&','3','&','-','&'] },
  { name: 'Pop',          ts: '4/4', pattern: ['D','U','-','U','D','U','-','U'],   timing: ['1','&','-','&','3','&','-','&'] },
  { name: 'Rock',         ts: '4/4', pattern: ['D','D','-','D','U','-','U','-'],   timing: ['1','2','-','3','&','-','4','-'] },
  { name: 'Power Rock',   ts: '4/4', pattern: ['D','U','D','U','D','D','U','D'],   timing: ['1','&','2','&','3','+','&','4'] },
  { name: 'Reggae',       ts: '4/4', pattern: ['-','U','-','U','-','U','-','U'],   timing: ['-','&','-','&','-','&','-','&'] },
  { name: 'Ska',          ts: '4/4', pattern: ['-','U','D','U','-','U','D','U'],   timing: ['-','&','2','&','-','&','4','&'] },
  { name: 'Bossa Nova',   ts: '4/4', pattern: ['D','D','-','U','-','D','U'],       timing: ['1','2','-','&','-','4','&'] },
  { name: 'Cumbia',       ts: '4/4', pattern: ['D','-','U','-','D','-','U','-'],   timing: ['1','-','&','-','3','-','&','-'] },
  { name: 'Tinku',        ts: '4/4', pattern: ['D','-','D','U','D','-','D','U'],   timing: ['Voy','-','Co','rro','Voy','-','Co','rro'] },
  { name: 'Milonga',      ts: '4/4', pattern: ['D','-','D','-','D','U','D','-'],   timing: ['1','-','2','-','3','&','4','-'] },
  { name: 'Flamenco',     ts: '4/4', pattern: ['D','U','U','D','U','D','U','U'],   timing: ['1','&','&','2','&','3','&','&'] },

  // ══ 3/4 — Ternario simple ═════════════════════════════════════════════
  { name: 'Básico',       ts: '3/4', pattern: ['D','D','D'],                       timing: ['1','2','3'] },
  { name: 'Vals',         ts: '3/4', pattern: ['D','-','U','D','-','U'],           timing: ['1','-','&','2','-','&'] },
  { name: 'Vals pop',     ts: '3/4', pattern: ['D','D','U','D','U'],               timing: ['1','2','&','3','&'] },
  { name: 'Vals rítmico', ts: '3/4', pattern: ['D','U','D','U','D','U'],           timing: ['1','&','2','&','3','&'] },
  { name: 'Cueca',        ts: '3/4', pattern: ['D','-','D','D','U'],               timing: ['1','-','2','3','&'] },
  { name: 'Mazurka',      ts: '3/4', pattern: ['D','-','D','-','D','U'],           timing: ['1','-','2','-','3','&'] },
  { name: 'Bolero 3/4',   ts: '3/4', pattern: ['D','U','-','D','-','U'],           timing: ['1','&','-','2','-','&'] },

  // ══ 2/4 — Binario simple ══════════════════════════════════════════════
  { name: 'Básico',       ts: '2/4', pattern: ['D','D'],                           timing: ['1','2'] },
  { name: 'Corrido',      ts: '2/4', pattern: ['D','U','D','U'],                   timing: ['1','&','2','&'] },
  { name: 'Ranchera',     ts: '2/4', pattern: ['D','-','U','D','U'],               timing: ['1','-','&','2','&'] },
  { name: 'Mariachi',     ts: '2/4', pattern: ['D','-','D','U'],                   timing: ['1','-','2','&'] },
  { name: 'Polka',        ts: '2/4', pattern: ['D','U','-','D'],                   timing: ['1','&','-','2'] },
  { name: 'Tango',        ts: '2/4', pattern: ['D','-','-','U','D','U'],           timing: ['1','-','-','&','2','&'] },

  // ══ 6/8 — Binario compuesto ═══════════════════════════════════════════
  { name: 'Básico',       ts: '6/8', pattern: ['D','-','-','D','-','-'],           timing: ['1','2','3','4','5','6'] },
  { name: 'Folk',         ts: '6/8', pattern: ['D','-','U','D','-','U'],           timing: ['1','2','3','4','5','6'] },
  { name: 'Huayno',       ts: '6/8', pattern: ['D','U','D','U','D','U'],           timing: ['1','2','3','4','5','6'] },
  { name: 'Jota',         ts: '6/8', pattern: ['D','U','-','D','U','-'],           timing: ['1','2','3','4','5','6'] },
  { name: 'Zamba',        ts: '6/8', pattern: ['D','-','U','-','D','U'],           timing: ['1','2','3','4','5','6'] },
  { name: 'Chacarera',    ts: '6/8', pattern: ['D','D','U','D','D','U'],           timing: ['1','2','3','4','5','6'] },
  { name: 'Joropo',       ts: '6/8', pattern: ['D','-','D','U','-','U'],           timing: ['1','2','3','4','5','6'] },
  { name: 'Barcarola',    ts: '6/8', pattern: ['D','-','-','U','-','U'],           timing: ['1','2','3','4','5','6'] },

  // ══ 9/8 — Ternario compuesto ══════════════════════════════════════════
  { name: 'Básico',       ts: '9/8', pattern: ['D','-','-','D','-','-','D','-','-'], timing: ['1','2','3','4','5','6','7','8','9'] },
  { name: 'Folk 9/8',     ts: '9/8', pattern: ['D','-','U','D','-','U','D','-','U'], timing: ['1','2','3','4','5','6','7','8','9'] },
  { name: 'Rítmico',      ts: '9/8', pattern: ['D','U','-','D','U','-','D','U','-'], timing: ['1','&','-','4','&','-','7','&','-'] },

  // ══ 12/8 — Cuaternario compuesto ══════════════════════════════════════
  { name: 'Blues',        ts: '12/8', pattern: ['D','-','-','D','-','-','D','-','-','D','-','-'], timing: ['1','2','3','4','5','6','7','8','9','10','11','12'] },
  { name: 'Shuffle',      ts: '12/8', pattern: ['D','U','-','D','U','-','D','U','-','D','U','-'], timing: ['1','&','-','4','&','-','7','&','-','10','&','-'] },
  { name: 'Gospel',       ts: '12/8', pattern: ['D','D','U','D','D','U','D','D','U','D','D','U'], timing: ['1','2','3','4','5','6','7','8','9','10','11','12'] },
  { name: 'Slow Rock',    ts: '12/8', pattern: ['D','-','U','D','-','U','D','-','U','D','-','U'], timing: ['1','2','3','4','5','6','7','8','9','10','11','12'] },
];

export const TIME_SIGNATURES: { ts: TimeSignature; label: string; compound: boolean }[] = [
  { ts: '2/4',  label: '2/4',  compound: false },
  { ts: '3/4',  label: '3/4',  compound: false },
  { ts: '4/4',  label: '4/4',  compound: false },
  { ts: '6/8',  label: '6/8',  compound: true  },
  { ts: '9/8',  label: '9/8',  compound: true  },
  { ts: '12/8', label: '12/8', compound: true  },
];

export const presetsForTs = (ts: TimeSignature): StrumPreset[] =>
  ALL_PRESETS.filter(p => p.ts === ts);

// ── Presets personalizados (localStorage) ────────────────────────────────────
export interface CustomPreset extends StrumPreset {
  custom: true;
}

const STORAGE_KEY = 'acordespro_custom_presets';

export const loadCustomPresets = (): CustomPreset[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveCustomPreset = (preset: Omit<CustomPreset, 'custom'>): void => {
  const existing = loadCustomPresets().filter(p => !(p.name === preset.name && p.ts === preset.ts));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, { ...preset, custom: true }]));
};

export const deleteCustomPreset = (name: string, ts: TimeSignature): void => {
  const existing = loadCustomPresets().filter(p => !(p.name === name && p.ts === ts));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
};

const PREF_KEY = 'acordespro_prac_pref';

export const savePracticePref = (ts: TimeSignature, presetName: string): void => {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ ts, name: presetName })); } catch (_) {}
};

export const loadPracticePref = (): { ts: TimeSignature; name: string } | null => {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
