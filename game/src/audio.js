// Solara Bay — audio.js
// Procedural WebAudio sound: no audio files, nothing fetched. Engine hum
// follows speed, a two-tone siren wails at wanted 3+, the radio is a soft
// synth pad that changes chord per station, and shots/ram impacts are
// short noise bursts. Everything is guarded: if the AudioContext cannot
// start (headless, no gesture), the game plays silent.
let ctx = null;
let engineOsc = null, engineGain = null;
let sirenOsc = null, sirenGain = null, sirenLFO = null;
let radioOscA = null, radioOscB = null, radioGain = null;
let started = false;

export function initAudio() {
  if (started) return;
  started = true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    // engine: sawtooth through a lowpass, pitch follows speed
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    engineOsc.connect(lp).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
    // siren: two-tone via LFO on a triangle osc
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 780;
    sirenLFO = ctx.createOscillator();
    sirenLFO.type = 'square';
    sirenLFO.frequency.value = 0.55;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 160;
    sirenLFO.connect(lfoGain).connect(sirenOsc.frequency);
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0.0;
    sirenOsc.connect(sirenGain).connect(ctx.destination);
    sirenOsc.start(); sirenLFO.start();
    // radio pad: two detuned sines, quiet
    radioOscA = ctx.createOscillator();
    radioOscA.type = 'sine'; radioOscA.frequency.value = 220;
    radioOscB = ctx.createOscillator();
    radioOscB.type = 'sine'; radioOscB.frequency.value = 277;
    radioGain = ctx.createGain();
    radioGain.gain.value = 0.018;
    radioOscA.connect(radioGain).connect(ctx.destination);
    radioOscB.connect(radioGain).connect(ctx.destination);
    radioOscA.start(); radioOscB.start();
  } catch (e) {
    ctx = null;
  }
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

const CHORDS = [[220, 277], [196, 247], [175, 220], [247, 294]];

export function updateAudio(speedKmh, wanted, radioIndex, inCar) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (engineOsc) {
    engineOsc.frequency.setTargetAtTime(50 + speedKmh * 1.1, t, 0.1);
    engineGain.gain.setTargetAtTime(inCar ? 0.028 + speedKmh * 0.00035 : 0.0, t, 0.15);
  }
  if (sirenGain) {
    sirenGain.gain.setTargetAtTime(wanted >= 3 ? 0.016 : 0.0, t, 0.3);
  }
  if (radioOscA) {
    const ch = CHORDS[radioIndex % CHORDS.length];
    radioOscA.frequency.setTargetAtTime(ch[0], t, 0.5);
    radioOscB.frequency.setTargetAtTime(ch[1], t, 0.5);
    radioGain.gain.setTargetAtTime(inCar ? 0.018 : 0.008, t, 0.3);
  }
}

export function blip(freq = 880, dur = 0.08, vol = 0.05) {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch (e) { /* ignore */ }
}

export function noiseBurst(dur = 0.18, vol = 0.12) {
  if (!ctx) return;
  try {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g).connect(ctx.destination);
    src.start();
  } catch (e) { /* ignore */ }
}
