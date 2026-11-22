// Solmar Bay — procedural WebAudio. No audio files: every sound is built
// from oscillators and filtered noise at play time, so the game ships zero
// audio assets and makes zero network requests. The context is created lazily
// on the first user gesture (browsers block audio before that) and every
// call is guarded, so a missing AudioContext never throws.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      } catch {
        return null;
      }
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function blip(freq, dur, type = 'sine', gain = 0.15, when = 0) {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur);
  }

  function noise(dur = 0.15, gain = 0.25) {
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start();
  }

  return {
    get muted() {
      return muted;
    },
    setMuted(m) {
      muted = !!m;
      if (muted && engineOsc) {
        try {
          engineOsc.stop();
        } catch {
          // Already stopped.
        }
        engineOsc = null;
        engineGain = null;
      }
    },
    play(name) {
      if (muted) return;
      switch (name) {
        case 'shot':
          noise(0.12, 0.25);
          break;
        case 'pickup':
          blip(880, 0.12);
          blip(1320, 0.18, 'sine', 0.12, 0.08);
          break;
        case 'win':
          [523, 659, 784].forEach((f, i) => blip(f, 0.22, 'sine', 0.15, i * 0.09));
          break;
        case 'mission':
          blip(440, 0.15);
          blip(587, 0.2, 'sine', 0.12, 0.1);
          break;
        case 'kill':
          noise(0.2, 0.2);
          break;
        case 'hurt':
          blip(160, 0.2, 'sawtooth', 0.18);
          break;
        case 'checkpoint':
          blip(1046, 0.1);
          break;
        case 'race':
        case 'courier':
          blip(660, 0.1);
          blip(880, 0.14, 'sine', 0.12, 0.09);
          break;
        case 'door':
          blip(220, 0.08, 'triangle', 0.12);
          break;
        default:
          break;
      }
    },
    // A low engine hum whose pitch follows the car's speed. Called every
    // frame from the game loop; silent when the player is on foot.
    engine(speed) {
      const c = ensure();
      if (!c) return;
      if (speed < 0.5) {
        if (engineOsc) {
          try {
            engineOsc.stop();
          } catch {
            // Already stopped.
          }
          engineOsc = null;
          engineGain = null;
        }
        return;
      }
      if (!engineOsc) {
        engineOsc = c.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = c.createGain();
        engineGain.gain.value = 0.03;
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 700;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(c.destination);
        engineOsc.start();
      }
      engineOsc.frequency.setTargetAtTime(50 + speed * 4, c.currentTime, 0.1);
    },
  };
}
