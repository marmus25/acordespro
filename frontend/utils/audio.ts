let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

// ── Capas de velocidad: forte (_f), piano (_p) y hammer (_h) ─────────────────
// Selección automática por volumen → máxima expresividad y realismo

type SampleLayer = { midi: number; file: string };

const SAMPLES_F: SampleLayer[] = [
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

const SAMPLES_P: SampleLayer[] = [
  { midi: 40, file: '/samples/iSGtr_E2_p.wav'  },
  { midi: 41, file: '/samples/iSGtr_F2_p.wav'  },
  { midi: 42, file: '/samples/iSGtr_F#2_p.wav' },
  { midi: 43, file: '/samples/iSGtr_G2_p.wav'  },
  { midi: 44, file: '/samples/iSGtr_G#2_p.wav' },
  { midi: 45, file: '/samples/iSGtr_A2_p.wav'  },
  { midi: 46, file: '/samples/iSGtr_A#2_p.wav' },
  { midi: 47, file: '/samples/iSGtr_B2_p.wav'  },
  { midi: 48, file: '/samples/iSGtr_C3_p.wav'  },
  { midi: 49, file: '/samples/iSGtr_C#3_p.wav' }, // solo existe en _p
  { midi: 50, file: '/samples/iSGtr_D3_p.wav'  },
  { midi: 51, file: '/samples/iSGtr_D#3_p.wav' },
  { midi: 52, file: '/samples/iSGtr_E3_p.wav'  },
  { midi: 53, file: '/samples/iSGtr_F3_p.wav'  },
  { midi: 54, file: '/samples/iSGtr_F#3_p.wav' },
  { midi: 55, file: '/samples/iSGtr_G3_p.wav'  },
  { midi: 56, file: '/samples/iSGtr_G#3_p.wav' },
  { midi: 57, file: '/samples/iSGtr_A3_p.wav'  },
  { midi: 58, file: '/samples/iSGtr_A#3_p.wav' },
  { midi: 59, file: '/samples/iSGtr_B3_p.wav'  },
  { midi: 60, file: '/samples/iSGtr_C4_p.wav'  },
  { midi: 62, file: '/samples/iSGtr_D4_p.wav'  },
  { midi: 63, file: '/samples/iSGtr_D#4_p.wav' },
  { midi: 64, file: '/samples/iSGtr_E4_p.wav'  },
  { midi: 65, file: '/samples/iSGtr_F4_p.wav'  },
  { midi: 66, file: '/samples/iSGtr_F#4_p.wav' },
  { midi: 67, file: '/samples/iSGtr_G4_p.wav'  },
  { midi: 68, file: '/samples/iSGtr_G#4_p.wav' },
  { midi: 69, file: '/samples/iSGtr_A4_p.wav'  },
  { midi: 70, file: '/samples/iSGtr_A#4_p.wav' },
  { midi: 71, file: '/samples/iSGtr_B4_p.wav'  },
  { midi: 74, file: '/samples/iSGtr_D5_p.wav'  },
  { midi: 75, file: '/samples/iSGtr_D#5_p.wav' },
  { midi: 76, file: '/samples/iSGtr_E5_p.wav'  },
];

// Hammer-on: ataque más percusivo en registro medio-alto
const SAMPLES_H: SampleLayer[] = [
  { midi: 52, file: '/samples/iSGtr_E3h_f.wav' },
  { midi: 57, file: '/samples/iSGtr_A3h_f.wav' },
  { midi: 62, file: '/samples/iSGtr_D4h_f.wav' },
  { midi: 64, file: '/samples/iSGtr_E4h_f.wav' },
  { midi: 67, file: '/samples/iSGtr_G4h_f.wav' },
  { midi: 69, file: '/samples/iSGtr_A4h_f.wav' },
  { midi: 71, file: '/samples/iSGtr_B4h_f.wav' },
  { midi: 74, file: '/samples/iSGtr_D5h_f.wav' },
  { midi: 76, file: '/samples/iSGtr_E5h_f.wav' },
  { midi: 79, file: '/samples/iSGtr_G5h_f.wav' },
  { midi: 83, file: '/samples/iSGtr_B5h_f.wav' },
];

const bufferF: Map<number, AudioBuffer> = new Map();
const bufferP: Map<number, AudioBuffer> = new Map();
const bufferH: Map<number, AudioBuffer> = new Map();
let samplesReady = false;

const loadLayer = async (ctx: AudioContext, list: SampleLayer[], map: Map<number, AudioBuffer>) => {
  await Promise.all(list.map(async ({ midi, file }) => {
    try {
      const res = await fetch(file);
      if (!res.ok) return;
      const buf = await ctx.decodeAudioData(await res.arrayBuffer());
      map.set(midi, buf);
    } catch (_) {}
  }));
};

const preloadBaseSamples = async () => {
  if (samplesReady) return;
  const ctx = getAudioContext();
  await Promise.all([
    loadLayer(ctx, SAMPLES_F, bufferF),
    loadLayer(ctx, SAMPLES_P, bufferP),
    loadLayer(ctx, SAMPLES_H, bufferH),
  ]);
  samplesReady = true;
};

preloadBaseSamples();

const nearest = (map: Map<number, AudioBuffer>, midi: number): { buffer: AudioBuffer; baseMidi: number } | null => {
  const entries = Array.from(map.entries());
  if (entries.length === 0) return null;
  const [baseMidi, buffer] = entries.reduce((best, cur) =>
    Math.abs(cur[0] - midi) < Math.abs(best[0] - midi) ? cur : best
  );
  return { buffer, baseMidi };
};

// _f para rasgueo normal, _p para notas muy suaves (arpegios lentos)
const getBuffer = (targetMidi: number, vol: number): { buffer: AudioBuffer; baseMidi: number } | null => {
  if (vol >= 0.60) return nearest(bufferF, targetMidi) ?? nearest(bufferP, targetMidi);
  return nearest(bufferP, targetMidi) ?? nearest(bufferF, targetMidi);
};

// ── EQ + reverb de salida ─────────────────────────────────────────────────────
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

  // ── EQ tipo DSK Nylon ────────────────────────────────────────────────────────
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.7;

  // Cortar caja/boxiness — zona que hace sonar opaco
  const cut250 = ctx.createBiquadFilter();
  cut250.type = 'peaking'; cut250.frequency.value = 250; cut250.Q.value = 1.4; cut250.gain.value = -4;

  // Cuerpo cálido de la nylon sin embarrar
  const body = ctx.createBiquadFilter();
  body.type = 'peaking'; body.frequency.value = 900; body.Q.value = 1.2; body.gain.value = 2;

  // Definición de cuerda — donde se siente el toque del dedo
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking'; presence.frequency.value = 2800; presence.Q.value = 1.3; presence.gain.value = 4;

  // Cortar metálico del acero para sonar a nylon
  const cut5k = ctx.createBiquadFilter();
  cut5k.type = 'peaking'; cut5k.frequency.value = 5000; cut5k.Q.value = 1.0; cut5k.gain.value = -3;

  // Aire final — como DSK que tiene ese brillo abierto
  const air = ctx.createBiquadFilter();
  air.type = 'highshelf'; air.frequency.value = 9000; air.gain.value = 3;

  // Compresor suave — DSK nivela dinámicas sin aplastar
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 10;
  comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;

  // ── Chorus sutil (carácter DSK: ligeramente ancho) ───────────────────────────
  const chorusDelay = ctx.createDelay(0.05);
  chorusDelay.delayTime.value = 0.012;
  const chorusGain = ctx.createGain(); chorusGain.gain.value = 0.18;

  // ── Reverb sala íntima — DSK tiene reverb prominente ────────────────────────
  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx);

  const reverbHp = ctx.createBiquadFilter();
  reverbHp.type = 'highpass'; reverbHp.frequency.value = 160; reverbHp.Q.value = 0.7;

  const wet = ctx.createGain(); wet.gain.value = 0.30;
  const dry = ctx.createGain(); dry.gain.value = 0.90;
  const master = ctx.createGain(); master.gain.value = 0.82;

  // Cadena: hp → cut250 → body → presence → cut5k → air → comp
  //          → dry ──────────────────────────────────────────→ master → out
  //          → chorusDelay → chorusGain ──────────────────→ master
  //          → convolver → reverbHp → wet ────────────────→ master
  hp.connect(cut250); cut250.connect(body); body.connect(presence);
  presence.connect(cut5k); cut5k.connect(air); air.connect(comp);
  comp.connect(dry);
  comp.connect(chorusDelay); chorusDelay.connect(chorusGain); chorusGain.connect(master);
  comp.connect(convolver); convolver.connect(reverbHp); reverbHp.connect(wet);
  dry.connect(master); wet.connect(master);
  master.connect(ctx.destination);

  masterNode = hp;
  return masterNode;
};

// ── Cadena práctica: EQ 3 bandas + delay ─────────────────────────────────────
interface PracticeNodes {
  input:     AudioNode;
  bass:      BiquadFilterNode;
  mids:      BiquadFilterNode;
  treble:    BiquadFilterNode;
  delay:     DelayNode;
  feedback:  GainNode;
  delayWet:  GainNode;
  delayDry:  GainNode;
  reverbWet: GainNode;
  reverbDry: GainNode;
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

  const delayNode = ctx.createDelay(1.0);
  delayNode.delayTime.value = 0.30;

  const feedback = ctx.createGain(); feedback.gain.value = 0;
  const delayWet = ctx.createGain(); delayWet.gain.value = 0;
  const delayDry = ctx.createGain(); delayDry.gain.value = 1;

  const convolver = ctx.createConvolver();
  convolver.buffer = buildImpulse(ctx);

  const reverbHp = ctx.createBiquadFilter();
  reverbHp.type = 'highpass'; reverbHp.frequency.value = 150; reverbHp.Q.value = 0.7;

  const reverbWet = ctx.createGain(); reverbWet.gain.value = 0;
  const reverbDry = ctx.createGain(); reverbDry.gain.value = 1;

  const master = ctx.createGain(); master.gain.value = 0.85;

  hp.connect(bass); bass.connect(mids); mids.connect(treble); treble.connect(comp);
  comp.connect(delayDry); comp.connect(delayNode);
  delayNode.connect(feedback); feedback.connect(delayNode); delayNode.connect(delayWet);
  delayDry.connect(reverbDry); delayWet.connect(reverbDry);
  reverbDry.connect(master); reverbDry.connect(convolver);
  convolver.connect(reverbHp); reverbHp.connect(reverbWet); reverbWet.connect(master);
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

// ── Decay natural: graves un poco más largos, agudos se cortan limpio ────────
const STRING_DECAY = [2.0, 1.8, 1.6, 1.4, 1.2, 1.0];

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

// ── Reproducir una cuerda ─────────────────────────────────────────────────────
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
  const result     = getBuffer(targetMidi, vol);
  if (!result) return;
  const { buffer, baseMidi } = result;

  const source = ctx.createBufferSource();
  const gain   = ctx.createGain();
  source.buffer = buffer;
  // Microafinación: ±0.4% aleatorio — cuerdas nunca perfectamente afinadas entre sí
  const pitchRatio = Math.pow(2, (targetMidi - baseMidi) / 12);
  source.playbackRate.value = pitchRatio * (1 + (Math.random() - 0.5) * 0.008);
  const decay  = STRING_DECAY[stringIndex] ?? 1.0;
  // Ataque suave tipo dedo/nylon — no instántaneo como púa de acero
  const attack = 0.006 + stringIndex * 0.001;
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
  source.connect(gain);
  gain.connect(dest);

  const note: ActiveNote = { gain };
  activeNotes.push(note);
  source.onended = () => {
    const idx = activeNotes.indexOf(note);
    if (idx !== -1) activeNotes.splice(idx, 1);
  };
  source.start(Math.max(startTime, ctx.currentTime));
};

// ── Pre-renderizado de acordes (OfflineAudioContext) ─────────────────────────
// Mezcla todas las cuerdas + efectos en un único buffer estéreo → sonido cohesivo
const chordCache = new Map<string, AudioBuffer>();

function buildOfflineChain(offCtx: OfflineAudioContext): AudioNode {
  const hp = offCtx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.7;

  const cut250 = offCtx.createBiquadFilter();
  cut250.type = 'peaking'; cut250.frequency.value = 250; cut250.Q.value = 1.4; cut250.gain.value = -4;

  const body = offCtx.createBiquadFilter();
  body.type = 'peaking'; body.frequency.value = 900; body.Q.value = 1.2; body.gain.value = 2;

  const presence = offCtx.createBiquadFilter();
  presence.type = 'peaking'; presence.frequency.value = 2800; presence.Q.value = 1.3; presence.gain.value = 4;

  const cut5k = offCtx.createBiquadFilter();
  cut5k.type = 'peaking'; cut5k.frequency.value = 5000; cut5k.Q.value = 1.0; cut5k.gain.value = -3;

  const air = offCtx.createBiquadFilter();
  air.type = 'highshelf'; air.frequency.value = 9000; air.gain.value = 3;

  const comp = offCtx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 10;
  comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.25;

  // Reverb usando impulso simplificado
  const irLen = Math.floor(offCtx.sampleRate * 1.2);
  const ir    = offCtx.createBuffer(2, irLen, offCtx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3);
  }
  const conv = offCtx.createConvolver(); conv.buffer = ir;
  const revHp = offCtx.createBiquadFilter();
  revHp.type = 'highpass'; revHp.frequency.value = 160; revHp.Q.value = 0.7;

  // Chorus offline: delay fijo (sin LFO, no hay tiempo real)
  const cDel = offCtx.createDelay(0.05); cDel.delayTime.value = 0.011;
  const cGain = offCtx.createGain(); cGain.gain.value = 0.16;

  const wet = offCtx.createGain(); wet.gain.value = 0.30;
  const dry = offCtx.createGain(); dry.gain.value = 0.90;
  const master = offCtx.createGain(); master.gain.value = 0.82;

  hp.connect(cut250); cut250.connect(body); body.connect(presence);
  presence.connect(cut5k); cut5k.connect(air); air.connect(comp);
  comp.connect(dry);
  comp.connect(cDel); cDel.connect(cGain); cGain.connect(master);
  comp.connect(conv); conv.connect(revHp); revHp.connect(wet);
  dry.connect(master); wet.connect(master);
  master.connect(offCtx.destination);

  return hp;
}

async function renderChord(frets: (number | 'x' | 'o')[]): Promise<AudioBuffer> {
  const key = frets.join(',');
  if (chordCache.has(key)) return chordCache.get(key)!;

  const sr       = 44100;
  const duration = 3.0;
  const offCtx   = new OfflineAudioContext(2, Math.round(sr * duration), sr);
  const dest     = buildOfflineChain(offCtx);

  // Tocar cada cuerda con humanización completa
  frets.forEach((fret, si) => {
    if (fret === 'x') return;
    const fn         = fret === 'o' ? 0 : (fret as number);
    const midi       = STRING_BASE_MIDI[si] + fn;
    const result     = getBuffer(midi, 0.82);
    if (!result) return;
    const { buffer, baseMidi } = result;

    const src  = offCtx.createBufferSource();
    const gain = offCtx.createGain();
    src.buffer = buffer;

    // Microafinación y pitch
    const ratio = Math.pow(2, (midi - baseMidi) / 12);
    src.playbackRate.value = ratio * (1 + (Math.random() - 0.5) * 0.008);

    // Timing humanizado: barrido hacia abajo con jitter
    const sweepTime  = 0.013 * si + (Math.random() - 0.5) * 0.004;
    const attack     = 0.006 + si * 0.001;
    const dynCurve   = 0.82 + (si / 5) * 0.18;
    const velVar     = 1 + (Math.random() - 0.5) * 0.14;
    const baseBal    = si === 0 ? 0.78 : si === 1 ? 0.88 : 1.0;
    const vol        = Math.min(0.97, 0.82 * baseBal * dynCurve * velVar);
    const decay      = STRING_DECAY[si] ?? 1.0;

    gain.gain.setValueAtTime(0.001, sweepTime);
    gain.gain.linearRampToValueAtTime(vol, sweepTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, sweepTime + attack + decay);

    src.connect(gain); gain.connect(dest);
    src.start(sweepTime);
  });

  const rendered = await offCtx.startRendering();
  chordCache.set(key, rendered);
  return rendered;
}

// ── API pública ────────────────────────────────────────────────────────────────
export const preloadChord = (frets: (number | 'x' | 'o')[]) => {
  if (samplesReady) renderChord(frets).catch(() => {});
  else preloadBaseSamples().then(() => renderChord(frets).catch(() => {}));
};

export const playChordAudio = async (frets: (number | 'x' | 'o')[]) => {
  const ctx = getAudioContext();
  const buf = await renderChord(frets);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(getMaster());
  src.start(ctx.currentTime);
};

// Humanización de rasgueo: simula la mano de un guitarrista real
const humanStrum = (
  order: { fret: number | 'x' | 'o'; si: number }[],
  isDown: boolean,
  baseDelay: number,
  startTime: number,
  vol: number
) => {
  const n = order.length;
  order.forEach(({ fret, si }, i) => {
    const fn = fret === 'o' ? 0 : (fret as number);

    // 1. Timing: jitter ±3ms — la mano nunca es perfectamente uniforme
    const jitter = (Math.random() - 0.5) * 0.006;

    // 2. Velocidad de barrido variable: ligera aceleración hacia el final
    const sweep = baseDelay * (1 + i * 0.04);

    // 3. Dinámica de barrido: downstroke más fuerte en agudos (aceleración de muñeca)
    //    upstroke más fuerte en graves
    const dynPos  = i / Math.max(n - 1, 1);
    const dynCurve = isDown
      ? 0.82 + dynPos * 0.18          // crece hacia las agudas
      : 1.0  - dynPos * 0.18;         // decrece hacia las bajas

    // 4. Variación aleatoria de velocidad por cuerda ±8%
    const velVar = 1 + (Math.random() - 0.5) * 0.16;

    // 5. Balance base: cuerda E grave más suave
    const baseBal = si === 0 ? 0.78 : si === 1 ? 0.88 : 1.0;

    const v = Math.min(0.98, vol * baseBal * dynCurve * velVar);
    playString(si, fn, startTime + i * sweep + jitter, v);
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
  humanStrum(order, isDown, delay, startTime, vol);
};

export const getCtxTime = (): number => getAudioContext().currentTime;

export const stopAllAudio = () => muteActive(20);

export const ensureAudio = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') {
    try { await ctx.resume(); } catch (_) {}
  }
  if (bufferF.size === 0) {
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
  humanStrum(order, isDown, delay, now, 0.82);
};
