let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

// ── Capas de velocidad ────────────────────────────────────────────────────────
type SampleLayer = { midi: number; file: string };

const SAMPLES_F: SampleLayer[] = [
  { midi: 40, file: '/samples/iSGtr_E2_f.wav'  }, { midi: 41, file: '/samples/iSGtr_F2_f.wav'  },
  { midi: 42, file: '/samples/iSGtr_F#2_f.wav' }, { midi: 43, file: '/samples/iSGtr_G2_f.wav'  },
  { midi: 44, file: '/samples/iSGtr_G#2_f.wav' }, { midi: 45, file: '/samples/iSGtr_A2_f.wav'  },
  { midi: 46, file: '/samples/iSGtr_A#2_f.wav' }, { midi: 47, file: '/samples/iSGtr_B2_f.wav'  },
  { midi: 48, file: '/samples/iSGtr_C3_f.wav'  }, { midi: 50, file: '/samples/iSGtr_D3_f.wav'  },
  { midi: 51, file: '/samples/iSGtr_D#3_f.wav' }, { midi: 52, file: '/samples/iSGtr_E3_f.wav'  },
  { midi: 53, file: '/samples/iSGtr_F3_f.wav'  }, { midi: 54, file: '/samples/iSGtr_F#3_f.wav' },
  { midi: 55, file: '/samples/iSGtr_G3_f.wav'  }, { midi: 56, file: '/samples/iSGtr_G#3_f.wav' },
  { midi: 57, file: '/samples/iSGtr_A3_f.wav'  }, { midi: 58, file: '/samples/iSGtr_A#3_f.wav' },
  { midi: 59, file: '/samples/iSGtr_B3_f.wav'  }, { midi: 60, file: '/samples/iSGtr_C4_f.wav'  },
  { midi: 61, file: '/samples/iSGtr_C#4_f.wav' }, { midi: 62, file: '/samples/iSGtr_D4_f.wav'  },
  { midi: 63, file: '/samples/iSGtr_D#4_f.wav' }, { midi: 64, file: '/samples/iSGtr_E4_f.wav'  },
  { midi: 65, file: '/samples/iSGtr_F4_f.wav'  }, { midi: 66, file: '/samples/iSGtr_F#4_f.wav' },
  { midi: 67, file: '/samples/iSGtr_G4_f.wav'  }, { midi: 68, file: '/samples/iSGtr_G#4_f.wav' },
  { midi: 69, file: '/samples/iSGtr_A4_f.wav'  }, { midi: 70, file: '/samples/iSGtr_A#4_f.wav' },
  { midi: 71, file: '/samples/iSGtr_B4_f.wav'  }, { midi: 74, file: '/samples/iSGtr_D5_f.wav'  },
  { midi: 75, file: '/samples/iSGtr_D#5_f.wav' }, { midi: 76, file: '/samples/iSGtr_E5_f.wav'  },
  { midi: 79, file: '/samples/iSGtr_G5_f.wav'  }, { midi: 80, file: '/samples/iSGtr_G#5_f.wav' },
];

const SAMPLES_P: SampleLayer[] = [
  { midi: 40, file: '/samples/iSGtr_E2_p.wav'  }, { midi: 41, file: '/samples/iSGtr_F2_p.wav'  },
  { midi: 42, file: '/samples/iSGtr_F#2_p.wav' }, { midi: 43, file: '/samples/iSGtr_G2_p.wav'  },
  { midi: 44, file: '/samples/iSGtr_G#2_p.wav' }, { midi: 45, file: '/samples/iSGtr_A2_p.wav'  },
  { midi: 46, file: '/samples/iSGtr_A#2_p.wav' }, { midi: 47, file: '/samples/iSGtr_B2_p.wav'  },
  { midi: 48, file: '/samples/iSGtr_C3_p.wav'  }, { midi: 49, file: '/samples/iSGtr_C#3_p.wav' },
  { midi: 50, file: '/samples/iSGtr_D3_p.wav'  }, { midi: 51, file: '/samples/iSGtr_D#3_p.wav' },
  { midi: 52, file: '/samples/iSGtr_E3_p.wav'  }, { midi: 53, file: '/samples/iSGtr_F3_p.wav'  },
  { midi: 54, file: '/samples/iSGtr_F#3_p.wav' }, { midi: 55, file: '/samples/iSGtr_G3_p.wav'  },
  { midi: 56, file: '/samples/iSGtr_G#3_p.wav' }, { midi: 57, file: '/samples/iSGtr_A3_p.wav'  },
  { midi: 58, file: '/samples/iSGtr_A#3_p.wav' }, { midi: 59, file: '/samples/iSGtr_B3_p.wav'  },
  { midi: 60, file: '/samples/iSGtr_C4_p.wav'  }, { midi: 62, file: '/samples/iSGtr_D4_p.wav'  },
  { midi: 63, file: '/samples/iSGtr_D#4_p.wav' }, { midi: 64, file: '/samples/iSGtr_E4_p.wav'  },
  { midi: 65, file: '/samples/iSGtr_F4_p.wav'  }, { midi: 66, file: '/samples/iSGtr_F#4_p.wav' },
  { midi: 67, file: '/samples/iSGtr_G4_p.wav'  }, { midi: 68, file: '/samples/iSGtr_G#4_p.wav' },
  { midi: 69, file: '/samples/iSGtr_A4_p.wav'  }, { midi: 70, file: '/samples/iSGtr_A#4_p.wav' },
  { midi: 71, file: '/samples/iSGtr_B4_p.wav'  }, { midi: 74, file: '/samples/iSGtr_D5_p.wav'  },
  { midi: 75, file: '/samples/iSGtr_D#5_p.wav' }, { midi: 76, file: '/samples/iSGtr_E5_p.wav'  },
];

const bufferF: Map<number, AudioBuffer> = new Map();
const bufferP: Map<number, AudioBuffer> = new Map();
let samplesReady = false;

const loadLayer = async (ctx: AudioContext, list: SampleLayer[], map: Map<number, AudioBuffer>) =>
  Promise.all(list.map(async ({ midi, file }) => {
    try {
      const res = await fetch(file);
      if (!res.ok) return;
      map.set(midi, await ctx.decodeAudioData(await res.arrayBuffer()));
    } catch (_) {}
  }));

const preloadBaseSamples = async () => {
  if (samplesReady) return;
  const ctx = getAudioContext();
  await Promise.all([loadLayer(ctx, SAMPLES_F, bufferF), loadLayer(ctx, SAMPLES_P, bufferP)]);
  samplesReady = true;
};

preloadBaseSamples();

const nearest = (map: Map<number, AudioBuffer>, midi: number) => {
  const entries = Array.from(map.entries());
  if (!entries.length) return null;
  const [baseMidi, buffer] = entries.reduce((b, c) =>
    Math.abs(c[0] - midi) < Math.abs(b[0] - midi) ? c : b);
  return { buffer, baseMidi };
};

const getBuffer = (midi: number, vol: number) =>
  vol >= 0.60
    ? nearest(bufferF, midi) ?? nearest(bufferP, midi)
    : nearest(bufferP, midi) ?? nearest(bufferF, midi);

// ── Impulso tipo sala de guitarra: reflexiones tempranas + cola difusa ────────
const buildImpulse = (ctx: BaseAudioContext): AudioBuffer => {
  const sr  = ctx.sampleRate;
  const len = Math.floor(sr * 2.2);
  const ir  = ctx.createBuffer(2, len, sr);
  const er  = Math.floor(sr * 0.07); // 70ms reflexiones tempranas
  for (let ch = 0; ch < 2; ch++) {
    const d   = ir.getChannelData(ch);
    const pan = ch === 0 ? 1.0 : 0.92; // L/R ligeramente diferentes
    for (let i = 0; i < er; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / sr * 22) * pan;
    for (let i = er; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.exp(-(i - er) / sr * 2.5) * pan;
  }
  return ir;
};

// ── Master DSP — EQ Korg PA + cuerpo de guitarra + chorus estéreo + reverb ───
let masterNode: AudioNode | null = null;

// Nodos del EQ de usuario (5 bandas post-DSP, todos arrancan en 0dB)
let uEqBass: BiquadFilterNode | null     = null;
let uEqBody: BiquadFilterNode | null     = null;
let uEqMid: BiquadFilterNode | null      = null;
let uEqPresence: BiquadFilterNode | null = null;
let uEqAir: BiquadFilterNode | null      = null;

export type EqBand = 'bass' | 'body' | 'mid' | 'presence' | 'air';

export const setMasterEq = (band: EqBand, db: number) => {
  const v = Math.max(-12, Math.min(12, db));
  if (band === 'bass'     && uEqBass)     uEqBass.gain.value     = v;
  if (band === 'body'     && uEqBody)     uEqBody.gain.value     = v;
  if (band === 'mid'      && uEqMid)      uEqMid.gain.value      = v;
  if (band === 'presence' && uEqPresence) uEqPresence.gain.value = v;
  if (band === 'air'      && uEqAir)      uEqAir.gain.value      = v;
};

export const getMasterEqValues = (): Record<EqBand, number> => ({
  bass:     uEqBass?.gain.value     ?? 0,
  body:     uEqBody?.gain.value     ?? 0,
  mid:      uEqMid?.gain.value      ?? 0,
  presence: uEqPresence?.gain.value ?? 0,
  air:      uEqAir?.gain.value      ?? 0,
});

const getMaster = (): AudioNode => {
  if (masterNode) return masterNode;
  const ctx = getAudioContext();

  // HP suave — quita sub-bajos sin tocar el cuerpo
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 75; hp.Q.value = 0.65;

  // Limpiar opacidad
  const cut250 = ctx.createBiquadFilter();
  cut250.type = 'peaking'; cut250.frequency.value = 250; cut250.Q.value = 1.4; cut250.gain.value = -4;

  // Resonancia cuerpo guitarra (Korg PA) — pico estrecho que da el "thump" natural
  const bodyRes = ctx.createBiquadFilter();
  bodyRes.type = 'peaking'; bodyRes.frequency.value = 430; bodyRes.Q.value = 4.0; bodyRes.gain.value = 3;

  // Segunda resonancia de cuerpo
  const bodyRes2 = ctx.createBiquadFilter();
  bodyRes2.type = 'peaking'; bodyRes2.frequency.value = 1100; bodyRes2.Q.value = 2.5; bodyRes2.gain.value = 1.5;

  // Presencia de cuerda — ataque del dedo
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking'; presence.frequency.value = 2800; presence.Q.value = 1.3; presence.gain.value = 4;

  // Quitar metálico del acero
  const cut5k = ctx.createBiquadFilter();
  cut5k.type = 'peaking'; cut5k.frequency.value = 5000; cut5k.Q.value = 1.0; cut5k.gain.value = -3;

  // Aire abierto (como DSK)
  const air = ctx.createBiquadFilter();
  air.type = 'highshelf'; air.frequency.value = 9000; air.gain.value = 3;

  // Limiter/compresor estilo Korg: ataque rápido, release medio
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 6;
  comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.18;

  // Chorus estéreo de dos ramas (9ms izquierda, 15ms derecha) → ancho real
  const cDelL = ctx.createDelay(0.05); cDelL.delayTime.value = 0.009;
  const cDelR = ctx.createDelay(0.05); cDelR.delayTime.value = 0.015;
  const cMerge = ctx.createGain(); cMerge.gain.value = 0.13;

  // Reverb sala íntima
  const conv  = ctx.createConvolver(); conv.buffer = buildImpulse(ctx);
  const revHp = ctx.createBiquadFilter();
  revHp.type = 'highpass'; revHp.frequency.value = 160; revHp.Q.value = 0.7;
  const wet = ctx.createGain(); wet.gain.value = 0.28;
  const dry = ctx.createGain(); dry.gain.value = 0.88;
  const dspOut = ctx.createGain(); dspOut.gain.value = 0.85;

  hp.connect(cut250); cut250.connect(bodyRes); bodyRes.connect(bodyRes2);
  bodyRes2.connect(presence); presence.connect(cut5k); cut5k.connect(air); air.connect(comp);
  comp.connect(dry);
  comp.connect(cDelL); cDelL.connect(cMerge);
  comp.connect(cDelR); cDelR.connect(cMerge); cMerge.connect(dspOut);
  comp.connect(conv); conv.connect(revHp); revHp.connect(wet);
  dry.connect(dspOut); wet.connect(dspOut);

  // ── EQ de usuario (5 bandas) — arranca plano (0dB) ──
  uEqBass     = ctx.createBiquadFilter(); uEqBass.type     = 'lowshelf'; uEqBass.frequency.value     = 150; uEqBass.gain.value     = 0;
  uEqBody     = ctx.createBiquadFilter(); uEqBody.type     = 'peaking';  uEqBody.frequency.value     = 430; uEqBody.Q.value = 3.0; uEqBody.gain.value     = 0;
  uEqMid      = ctx.createBiquadFilter(); uEqMid.type      = 'peaking';  uEqMid.frequency.value      = 1100; uEqMid.Q.value = 1.8; uEqMid.gain.value      = 0;
  uEqPresence = ctx.createBiquadFilter(); uEqPresence.type = 'peaking';  uEqPresence.frequency.value = 2800; uEqPresence.Q.value = 1.3; uEqPresence.gain.value = 0;
  uEqAir      = ctx.createBiquadFilter(); uEqAir.type      = 'highshelf'; uEqAir.frequency.value     = 9000; uEqAir.gain.value      = 0;

  dspOut.connect(uEqBass); uEqBass.connect(uEqBody); uEqBody.connect(uEqMid);
  uEqMid.connect(uEqPresence); uEqPresence.connect(uEqAir); uEqAir.connect(ctx.destination);

  masterNode = hp;
  return masterNode;
};

// ── Cadena práctica ────────────────────────────────────────────────────────────
interface PracticeNodes {
  input: AudioNode; bass: BiquadFilterNode; mids: BiquadFilterNode;
  treble: BiquadFilterNode; delay: DelayNode; feedback: GainNode;
  delayWet: GainNode; delayDry: GainNode; reverbWet: GainNode; reverbDry: GainNode;
}
let practiceChain: PracticeNodes | null = null;
let practiceMode = false;
export const setPracticeMode = (on: boolean) => { practiceMode = on; };

const getPracticeChain = (): PracticeNodes => {
  if (practiceChain) return practiceChain;
  const ctx = getAudioContext();
  const hp  = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80; hp.Q.value = 0.7;
  const bass = ctx.createBiquadFilter(); bass.type = 'lowshelf'; bass.frequency.value = 250; bass.gain.value = 0;
  const mids = ctx.createBiquadFilter(); mids.type = 'peaking'; mids.frequency.value = 1500; mids.Q.value = 0.9; mids.gain.value = 0;
  const treble = ctx.createBiquadFilter(); treble.type = 'highshelf'; treble.frequency.value = 4000; treble.gain.value = 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.18;
  const delayNode = ctx.createDelay(1.0); delayNode.delayTime.value = 0.30;
  const feedback = ctx.createGain(); feedback.gain.value = 0;
  const delayWet = ctx.createGain(); delayWet.gain.value = 0;
  const delayDry = ctx.createGain(); delayDry.gain.value = 1;
  const conv = ctx.createConvolver(); conv.buffer = buildImpulse(ctx);
  const revHp = ctx.createBiquadFilter(); revHp.type = 'highpass'; revHp.frequency.value = 150; revHp.Q.value = 0.7;
  const reverbWet = ctx.createGain(); reverbWet.gain.value = 0;
  const reverbDry = ctx.createGain(); reverbDry.gain.value = 1;
  const master = ctx.createGain(); master.gain.value = 0.85;
  hp.connect(bass); bass.connect(mids); mids.connect(treble); treble.connect(comp);
  comp.connect(delayDry); comp.connect(delayNode);
  delayNode.connect(feedback); feedback.connect(delayNode); delayNode.connect(delayWet);
  delayDry.connect(reverbDry); delayWet.connect(reverbDry);
  reverbDry.connect(master); reverbDry.connect(conv);
  conv.connect(revHp); revHp.connect(reverbWet); reverbWet.connect(master);
  master.connect(ctx.destination);
  practiceChain = { input: hp, bass, mids, treble, delay: delayNode, feedback, delayWet, delayDry, reverbWet, reverbDry };
  return practiceChain;
};

export const setPracticeEq = (band: 'bass' | 'mids' | 'treble', db: number) => {
  getPracticeChain()[band].gain.value = Math.max(-12, Math.min(12, db));
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
  c.reverbWet.gain.value = v; c.reverbDry.gain.value = 1 - v * 0.35;
};

// ── Constantes de cuerda ──────────────────────────────────────────────────────
const STRING_BASE_MIDI = [40, 45, 50, 55, 59, 64];
const STRING_DECAY     = [2.2, 1.9, 1.6, 1.4, 1.2, 1.0];
// Panorama estéreo natural: grave izquierda → agudo derecha (como guitarra real)
const STRING_PAN       = [-0.5, -0.3, -0.1, 0.1, 0.3, 0.5];

// ── Notas activas ─────────────────────────────────────────────────────────────
interface ActiveNote { gain: GainNode }
const activeNotes: ActiveNote[] = [];

const muteActive = (ms = 40) => {
  const ctx = getAudioContext(), now = ctx.currentTime, fade = ms / 1000;
  activeNotes.forEach(({ gain }) => {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + fade);
    } catch (_) {}
  });
  activeNotes.length = 0;
};

// ── Reproducir una cuerda con stereo + velocity→timbre ────────────────────────
const playString = (stringIndex: number, fretNum: number, startTime: number, vol = 0.88) => {
  const ctx  = getAudioContext();
  const dest = practiceMode ? getPracticeChain().input : getMaster();
  const midi = STRING_BASE_MIDI[stringIndex] + fretNum;
  const res  = getBuffer(midi, vol);
  if (!res) return;
  const { buffer, baseMidi } = res;

  const source = ctx.createBufferSource();
  const gain   = ctx.createGain();

  // Velocity → timbre: cuerdas pulsadas fuerte suenan más brillantes
  const tone = ctx.createBiquadFilter();
  tone.type = 'highshelf'; tone.frequency.value = 3500;
  tone.gain.value = (vol - 0.75) * 14; // -3.5dB suave → +3.5dB fuerte

  // Panorama estéreo por cuerda (como una guitarra real en el espacio)
  const panner = ctx.createStereoPanner();
  panner.pan.value = STRING_PAN[stringIndex] + (Math.random() - 0.5) * 0.06;

  source.buffer = buffer;
  // Microafinación ±0.4% — cuerdas nunca perfectamente afinadas entre sí
  source.playbackRate.value = Math.pow(2, (midi - baseMidi) / 12) * (1 + (Math.random() - 0.5) * 0.008);

  const decay  = STRING_DECAY[stringIndex] ?? 1.0;
  const attack = 0.006 + stringIndex * 0.001; // graves un poco más lentos
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);

  source.connect(gain); gain.connect(tone); tone.connect(panner); panner.connect(dest);

  const note: ActiveNote = { gain };
  activeNotes.push(note);
  source.onended = () => { const i = activeNotes.indexOf(note); if (i !== -1) activeNotes.splice(i, 1); };
  source.start(Math.max(startTime, ctx.currentTime));
};

// ── Humanización: simula mano de guitarrista real ─────────────────────────────
const humanStrum = (
  order: { fret: number | 'x' | 'o'; si: number }[],
  isDown: boolean,
  baseDelay: number,
  startTime: number,
  vol: number
) => {
  const n = order.length;
  order.forEach(({ fret, si }, i) => {
    const fn       = fret === 'o' ? 0 : (fret as number);
    const jitter   = (Math.random() - 0.5) * 0.006;           // ±3ms timing
    const sweep    = baseDelay * (1 + i * 0.04);               // aceleración de muñeca
    const dynPos   = i / Math.max(n - 1, 1);
    const dynCurve = isDown ? 0.82 + dynPos * 0.18 : 1.0 - dynPos * 0.18;
    const velVar   = 1 + (Math.random() - 0.5) * 0.16;        // ±8% por cuerda
    const baseBal  = si === 0 ? 0.78 : si === 1 ? 0.88 : 1.0;
    playString(si, fn, startTime + i * sweep + jitter, Math.min(0.98, vol * baseBal * dynCurve * velVar));
  });
};

// ── API pública ────────────────────────────────────────────────────────────────
export const preloadChord = (_frets: (number | 'x' | 'o')[]) => { /* samples ya cargados */ };

// Chord tap = rasgueo suave hacia abajo (mismo path que scheduleStrum, sin doble procesado)
export const playChordAudio = (frets: (number | 'x' | 'o')[]) => {
  const active = frets.map((f, i) => ({ fret: f, si: i })).filter(s => s.fret !== 'x');
  humanStrum(active, true, 0.016, getAudioContext().currentTime, 0.76);
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
  humanStrum(isDown ? active : [...active].reverse(), isDown, delay, startTime, vol);
};

export const getCtxTime = (): number => getAudioContext().currentTime;
export const stopAllAudio = () => muteActive(20);

export const ensureAudio = async (): Promise<void> => {
  const ctx = getAudioContext();
  if (ctx.state !== 'running') { try { await ctx.resume(); } catch (_) {} }
  if (bufferF.size === 0) { samplesReady = false; await preloadBaseSamples(); }
};

export const playStrum = (
  direction: 'D' | 'U' | '-' | 'DL',
  frets: (number | 'x' | 'o')[] = ['o', 2, 2, 'o', 'o', 'o']
) => {
  if (direction === '-') { muteActive(40); return; }
  const isDown = direction === 'D' || direction === 'DL';
  const delay  = direction === 'DL' ? 0.10 : 0.014;
  const active = frets.map((f, i) => ({ fret: f, si: i })).filter(s => s.fret !== 'x');
  humanStrum(isDown ? active : [...active].reverse(), isDown, delay, getAudioContext().currentTime, 0.82);
};
