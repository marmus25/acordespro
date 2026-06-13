let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

// ── Muestras reales por nota — máx ±1 semitono de pitch shift ────────────────
const BASE_SAMPLES: { midi: number; file: string }[] = [
  // Octava 2
  { midi: 40, file: '/samples/iSGtr_E2_f.wav'  },
  { midi: 41, file: '/samples/iSGtr_F2_f.wav'  },
  { midi: 42, file: '/samples/iSGtr_F#2_f.wav' },
  { midi: 43, file: '/samples/iSGtr_G2_f.wav'  },
  { midi: 44, file: '/samples/iSGtr_G#2_f.wav' },
  { midi: 45, file: '/samples/iSGtr_A2_f.wav'  },
  { midi: 46, file: '/samples/iSGtr_A#2_f.wav' },
  { midi: 47, file: '/samples/iSGtr_B2_f.wav'  },
  // Octava 3
  { midi: 48, file: '/samples/iSGtr_C3_f.wav'  },
  { midi: 50, file: '/samples/iSGtr_D3_f.wav'  },
  { midi: 51, file: '/samples/iSGtr_D#3_f.wav' },
  { midi: 52, file: '/samples/iSGtr_E3_f.wav'  },
  { midi: 53, file: '/samples/iSGtr_F3_f.wav'  },
  { midi: 54, file: '/samples/iSGtr_F#3_f.wav' },
  { midi: 55, file: '/samples/iSGtr_G3_f.wav'  },
  { midi: 56, file: '/samples/iSGtr_G#3_f.wav' },
  { midi: 57, file: '/samples/iSGtr_A3_f.wav'  },
  { midi: 58, file: '/samples/iSGtr_A#3_f.wav' },
  { midi: 59, file: '/samples/iSGtr_B3_f.wav'  },
  // Octava 4
  { midi: 60, file: '/samples/iSGtr_C4_f.wav'  },
  { midi: 61, file: '/samples/iSGtr_C#4_f.wav' },
  { midi: 62, file: '/samples/iSGtr_D4_f.wav'  },
  { midi: 63, file: '/samples/iSGtr_D#4_f.wav' },
  { midi: 64, file: '/samples/iSGtr_E4_f.wav'  },
  { midi: 65, file: '/samples/iSGtr_F4_f.wav'  },
  { midi: 66, file: '/samples/iSGtr_F#4_f.wav' },
  { midi: 67, file: '/samples/iSGtr_G4_f.wav'  },
  { midi: 68, file: '/samples/iSGtr_G#4_f.wav' },
  { midi: 69, file: '/samples/iSGtr_A4_f.wav'  },
  { midi: 70, file: '/samples/iSGtr_A#4_f.wav' },
  { midi: 71, file: '/samples/iSGtr_B4_f.wav'  },
  // Octava 5
  { midi: 74, file: '/samples/iSGtr_D5_f.wav'  },
  { midi: 75, file: '/samples/iSGtr_D#5_f.wav' },
  { midi: 76, file: '/samples/iSGtr_E5_f.wav'  },
  { midi: 79, file: '/samples/iSGtr_G5_f.wav'  },
  { midi: 80, file: '/samples/iSGtr_G#5_f.wav' },
];

const bufferMap: Map<number, AudioBuffer> = new Map();
let samplesReady = false;

const preloadBaseSamples = async () => {
  if (samplesReady) return;
  const ctx = getAudioContext();
  await Promise.all(
    BASE_SAMPLES.map(async ({ midi, file }) => {
      try {
        const res = await fetch(file);
        if (!res.ok) return;
        const raw = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(raw);
        bufferMap.set(midi, buf);
      } catch (_) {}
    })
  );
  samplesReady = true;
};

// Inicia la carga tan pronto como este módulo se importa
preloadBaseSamples();

const getBuffer = (targetMidi: number): { buffer: AudioBuffer; baseMidi: number } | null => {
  const entries = Array.from(bufferMap.entries());
  if (entries.length === 0) return null;
  const [baseMidi, buffer] = entries.reduce((best, cur) =>
    Math.abs(cur[0] - targetMidi) < Math.abs(best[0] - targetMidi) ? cur : best
  );
  return { buffer, baseMidi };
};

// ── EQ + reverb sutil de salida ───────────────────────────────────────────────
let masterNode: AudioNode | null = null;

const buildImpulse = (ctx: AudioContext): AudioBuffer => {
  const len = Math.floor(ctx.sampleRate * 1.2);
  const ir  = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  return ir;
};

const getMaster = (): AudioNode => {
  if (masterNode) return masterNode;
  const ctx = getAudioContext();

  // Sub-bajos cortados para evitar bombo
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 80;
  hp.Q.value = 0.7;

  // Medios presentes: boost 1.5 kHz
  const mids = ctx.createBiquadFilter();
  mids.type = 'peaking';
  mids.frequency.value = 1500;
  mids.Q.value = 0.9;
  mids.gain.value = 4;

  // Compresor: cohesión y punch
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 8;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;

  // Reverb 30%
  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx);

  const reverbHp = ctx.createBiquadFilter();
  reverbHp.type = 'highpass';
  reverbHp.frequency.value = 150;
  reverbHp.Q.value = 0.7;

  const wet = ctx.createGain();
  wet.gain.value = 0.30;

  const dry = ctx.createGain();
  dry.gain.value = 0.90;

  const master = ctx.createGain();
  master.gain.value = 0.82;

  // hp → mids → comp → dry → master → out
  //                  → convolver → reverbHp → wet → master → out
  hp.connect(mids);
  mids.connect(comp);
  comp.connect(dry);
  comp.connect(convolver);
  convolver.connect(reverbHp);
  reverbHp.connect(wet);
  dry.connect(master);
  wet.connect(master);
  master.connect(ctx.destination);

  masterNode = hp;
  return masterNode;
};

// ── Cadena práctica: EQ 3 bandas + delay (independiente del TikTok) ───────────
interface PracticeNodes {
  input:      AudioNode;
  bass:       BiquadFilterNode;
  mids:       BiquadFilterNode;
  treble:     BiquadFilterNode;
  delay:      DelayNode;
  feedback:   GainNode;
  delayWet:   GainNode;
  delayDry:   GainNode;
  reverbWet:  GainNode;
  reverbDry:  GainNode;
}
let practiceChain: PracticeNodes | null = null;
let practiceMode = false;

export const setPracticeMode = (on: boolean) => { practiceMode = on; };

const getPracticeChain = (): PracticeNodes => {
  if (practiceChain) return practiceChain;
  const ctx = getAudioContext();

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.7;

  const bass = ctx.createBiquadFilter();
  bass.type = 'lowshelf'; bass.frequency.value = 250; bass.gain.value = 0;

  const mids = ctx.createBiquadFilter();
  mids.type = 'peaking'; mids.frequency.value = 1500; mids.Q.value = 0.9; mids.gain.value = 0;

  const treble = ctx.createBiquadFilter();
  treble.type = 'highshelf'; treble.frequency.value = 4000; treble.gain.value = 0;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 8;
  comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;

  // Delay: nodo central + feedback loop
  const delayNode = ctx.createDelay(1.0);
  delayNode.delayTime.value = 0.30;

  const feedback = ctx.createGain();
  feedback.gain.value = 0;

  const delayWet = ctx.createGain();
  delayWet.gain.value = 0;

  const delayDry = ctx.createGain();
  delayDry.gain.value = 1;

  // Reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx);

  const reverbHp = ctx.createBiquadFilter();
  reverbHp.type = 'highpass'; reverbHp.frequency.value = 150; reverbHp.Q.value = 0.7;

  const reverbWet = ctx.createGain();
  reverbWet.gain.value = 0;

  const reverbDry = ctx.createGain();
  reverbDry.gain.value = 1;

  const master = ctx.createGain();
  master.gain.value = 0.85;

  // Cadena: hp → bass → mids → treble → comp → delayDry ─┐
  //                                          → delayNode → delayWet ─┤
  //                                   delay feedback loop             ├→ reverbDry → master → out
  //                                                                   └→ convolver → reverbHp → reverbWet → master
  hp.connect(bass); bass.connect(mids); mids.connect(treble); treble.connect(comp);
  comp.connect(delayDry);
  comp.connect(delayNode);
  delayNode.connect(feedback); feedback.connect(delayNode);
  delayNode.connect(delayWet);
  delayDry.connect(reverbDry); delayWet.connect(reverbDry);
  reverbDry.connect(master);
  reverbDry.connect(convolver);
  convolver.connect(reverbHp); reverbHp.connect(reverbWet);
  reverbWet.connect(master);
  master.connect(ctx.destination);

  practiceChain = { input: hp, bass, mids, treble, delay: delayNode, feedback, delayWet, delayDry, reverbWet, reverbDry };
  return practiceChain;
};

export const setPracticeEq = (band: 'bass' | 'mids' | 'treble', db: number) => {
  const c = getPracticeChain();
  c[band].gain.value = Math.max(-12, Math.min(12, db));
};

export const setPracticeDelay = (timeMs: number, feedbackPct: number, wetPct: number) => {
  const c = getPracticeChain();
  c.delay.delayTime.value = Math.max(0, Math.min(1000, timeMs)) / 1000;
  c.feedback.gain.value   = Math.max(0, Math.min(0.85, feedbackPct / 100));
  c.delayWet.gain.value   = Math.max(0, Math.min(1, wetPct / 100));
  c.delayDry.gain.value   = 1 - (wetPct / 100) * 0.4;
};

export const setPracticeReverb = (wetPct: number) => {
  const c = getPracticeChain();
  const v = Math.max(0, Math.min(100, wetPct)) / 100;
  c.reverbWet.gain.value = v;
  c.reverbDry.gain.value = 1 - v * 0.35;
};

// ── Decay por cuerda: graves duran más (inspirado en Karplus-Strong) ──────────
const STRING_DECAY = [2.2, 1.9, 1.6, 1.4, 1.2, 1.0];

// ── Notas activas ─────────────────────────────────────────────────────────────
interface ActiveNote { gain: GainNode }
const activeNotes: ActiveNote[] = [];

const muteActive = (ms = 40) => {
  const ctx  = getAudioContext();
  const now  = ctx.currentTime;
  const fade = ms / 1000;
  activeNotes.forEach(({ gain }) => {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    } catch (_) {}
  });
  activeNotes.length = 0;
};

// ── Reproducir una cuerda (síncrono — buffer ya está en memoria) ──────────────
const STRING_BASE_MIDI = [40, 45, 50, 55, 59, 64];

const playString = (
  stringIndex: number,
  fretNum: number,
  startTime: number,
  vol = 0.88
) => {
  const ctx        = getAudioContext();
  const dest       = practiceMode ? getPracticeChain().input : getMaster();
  const targetMidi = STRING_BASE_MIDI[stringIndex] + fretNum;
  const result     = getBuffer(targetMidi);
  if (!result) return; // samples aún no cargados
  const { buffer, baseMidi } = result;

  const source = ctx.createBufferSource();
  const gain   = ctx.createGain();
  source.buffer = buffer;
  source.playbackRate.value = Math.pow(2, (targetMidi - baseMidi) / 12);
  const decay = STRING_DECAY[stringIndex] ?? 1.0;
  gain.gain.setValueAtTime(vol, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decay);
  source.connect(gain);
  gain.connect(dest);

  const note: ActiveNote = { gain };
  activeNotes.push(note);
  source.onended = () => {
    const idx = activeNotes.indexOf(note);
    if (idx !== -1) activeNotes.splice(idx, 1);
  };
  // Si startTime ya pasó, toca de inmediato
  source.start(Math.max(startTime, ctx.currentTime));
};

// ── API pública ────────────────────────────────────────────────────────────────
export const preloadChord = (_frets: (number | 'x' | 'o')[]) => {
  preloadBaseSamples(); // no-op si ya están listos
};

export const playChordAudio = (frets: (number | 'x' | 'o')[]) => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  frets.forEach((fret, si) => {
    if (fret === 'x') return;
    playString(si, fret === 'o' ? 0 : (fret as number), now + si * 0.04, 0.72);
  });
};

export const scheduleStrum = (
  direction: 'D' | 'U' | 'DL',
  frets: (number | 'x' | 'o')[],
  startTime: number,
  vol = 0.82,
  dlDelay = 0.10
) => {
  const isDown = direction === 'D' || direction === 'DL';
  const delay  = direction === 'DL' ? dlDelay : 0.014;
  const active = frets.map((f, i) => ({ fret: f, si: i })).filter(s => s.fret !== 'x');
  const order  = isDown ? active : [...active].reverse();
  order.forEach(({ fret, si }, i) => {
    const fn = fret === 'o' ? 0 : (fret as number);
    const v  = si <= 1 ? vol * 0.82 : vol;
    playString(si, fn, startTime + i * delay, v);
  });
};

export const getCtxTime = (): number => getAudioContext().currentTime;

export const stopAllAudio = () => muteActive(20);

export const ensureAudio = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch (_) {}
  }
  // Recargar samples si no se cargaron (puede pasar si el contexto estaba suspendido)
  if (bufferMap.size === 0) {
    samplesReady = false;
    await preloadBaseSamples();
  }
};

export const playStrum = (
  direction: 'D' | 'U' | '-' | 'DL',
  frets: (number | 'x' | 'o')[] = ['o', 2, 2, 'o', 'o', 'o']
) => {
  if (direction === '-') { muteActive(40); return; }
  const ctx    = getAudioContext();
  const now    = ctx.currentTime;
  const isDown = direction === 'D' || direction === 'DL';
  const delay  = direction === 'DL' ? 0.10 : 0.014;
  const active = frets.map((f, i) => ({ fret: f, si: i })).filter(s => s.fret !== 'x');
  const order  = isDown ? active : [...active].reverse();
  order.forEach(({ fret, si }, i) => {
    const fn  = fret === 'o' ? 0 : (fret as number);
    const vol = si <= 1 ? 0.72 : 0.88;
    playString(si, fn, now + i * delay, vol);
  });
};
