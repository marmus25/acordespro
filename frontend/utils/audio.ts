let audioCtx: AudioContext | null = null;

const audioCache: Record<number, AudioBuffer> = {};
const loadingPromises: Record<number, Promise<AudioBuffer | null>> = {};

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const getNoteName = (midi: number) => {
  const notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${notes[midi % 12]}${octave}`;
};

const loadSample = async (midi: number): Promise<AudioBuffer | null> => {
  if (audioCache[midi]) return audioCache[midi];
  if (loadingPromises[midi]) return loadingPromises[midi];
  const ctx = getAudioContext();
  const url = `https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3/${getNoteName(midi)}.mp3`;
  loadingPromises[midi] = fetch(url)
    .then(r => { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
    .then(buf => ctx.decodeAudioData(buf))
    .then(ab => { audioCache[midi] = ab; return ab; })
    .catch(() => null);
  return loadingPromises[midi];
};

const baseMidi = [40, 45, 50, 55, 59, 64];
const baseFreqs = [82.41, 110.00, 146.83, 196.00, 246.94, 329.63];

// Registro de gains activos para poder silenciarlos cuando hay un respiro (-)
interface ActiveNote { gain: GainNode }
const activeNotes: ActiveNote[] = [];

const muteActive = () => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  activeNotes.forEach(({ gain }) => {
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.04); // fade de 40ms
    } catch (_) { /* ya terminó */ }
  });
  activeNotes.length = 0;
};

export const preloadChord = (frets: (number | 'x' | 'o')[]) => {
  frets.forEach((fret, stringIndex) => {
    if (fret !== 'x') {
      const midi = baseMidi[stringIndex] + (fret === 'o' ? 0 : (fret as number));
      loadSample(midi);
    }
  });
};

const playString = async (stringIndex: number, fretNum: number, startTime: number) => {
  const ctx = getAudioContext();
  const midi = baseMidi[stringIndex] + fretNum;
  const buffer = await loadSample(midi);
  if (buffer) {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(1, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 4);
    source.connect(gain);
    gain.connect(ctx.destination);
    const note: ActiveNote = { gain };
    activeNotes.push(note);
    source.onended = () => {
      const idx = activeNotes.indexOf(note);
      if (idx !== -1) activeNotes.splice(idx, 1);
    };
    source.start(startTime);
  } else {
    const freq = baseFreqs[stringIndex] * Math.pow(2, fretNum / 12);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    const note: ActiveNote = { gain };
    activeNotes.push(note);
    osc.onended = () => {
      const idx = activeNotes.indexOf(note);
      if (idx !== -1) activeNotes.splice(idx, 1);
    };
    osc.start(startTime);
    osc.stop(startTime + 2.5);
  }
};

export const playChordAudio = (frets: (number | 'x' | 'o')[]) => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  frets.forEach((fret, stringIndex) => {
    if (fret === 'x') return;
    const fretNum = fret === 'o' ? 0 : (fret as number);
    playString(stringIndex, fretNum, now + stringIndex * 0.04);
  });
};

export const playStrum = (direction: 'D' | 'U' | '-' | 'DL', frets: (number | 'x' | 'o')[] = ['o', 2, 2, 'o', 'o', 'o']) => {
  if (direction === '-') {
    muteActive();
    return;
  }
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const isDown = direction === 'D' || direction === 'DL';
  const delay = direction === 'DL' ? 0.10 : 0.025; // DL = barrido lento 100ms por cuerda
  const activeStrings = frets
    .map((f, i) => ({ fret: f, stringIndex: i }))
    .filter(s => s.fret !== 'x');
  const stringsToPlay = isDown ? activeStrings : [...activeStrings].reverse();
  stringsToPlay.forEach(({ fret, stringIndex }, i) => {
    const fretNum = fret === 'o' ? 0 : (fret as number);
    playString(stringIndex, fretNum, now + i * delay);
  });
};
