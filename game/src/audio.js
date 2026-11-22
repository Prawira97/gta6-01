// Procedural sound: every effect is synthesised with WebAudio, so the game ships no audio
// files. The context is created lazily on the first user gesture; every call is safe before
// that (a no-op) and safe when the browser has no audio at all.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed, through a low-pass filter.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      // Siren: two alternating tones, toggled by a timer.
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      sirenTimer = window.setInterval(() => {
        if (!sirenOsc) return;
        sirenOsc.frequency.value = sirenOsc.frequency.value > 800 ? 650 : 950;
      }, 350);
    } catch {
      ctx = null;
      return false;
    }
    return true;
  }

  function noiseBurst(duration, volume, lowpass) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  function tone(freq, duration, volume, type = 'sine') {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  return {
    /** Call from any user gesture so the context may start. */
    resume() {
      if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    /** Engine hum, 0..1 of top speed; 0 silences it. */
    engine(amount) {
      if (!ensure() || muted) return;
      const target = amount > 0.02 ? 0.05 + amount * 0.06 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(45 + amount * 160, ctx.currentTime, 0.1);
    },
    /** Police siren on or off. */
    siren(on) {
      if (!ensure() || muted) return;
      sirenGain.gain.setTargetAtTime(on ? 0.035 : 0, ctx.currentTime, 0.2);
    },
    shot() { noiseBurst(0.12, 0.5, 1800); tone(160, 0.1, 0.3, 'square'); },
    enemyShot() { noiseBurst(0.1, 0.25, 1200); },
    pickup() { tone(660, 0.09, 0.25); window.setTimeout(() => tone(990, 0.14, 0.25), 90); },
    checkpoint() { tone(880, 0.08, 0.25); window.setTimeout(() => tone(1174, 0.12, 0.25), 80); },
    raceGo() {
      tone(440, 0.1, 0.25, 'square');
      window.setTimeout(() => tone(440, 0.1, 0.25, 'square'), 140);
      window.setTimeout(() => tone(880, 0.2, 0.3, 'square'), 280);
    },
    roadblock() {
      tone(620, 0.16, 0.25, 'square');
      window.setTimeout(() => tone(470, 0.16, 0.25, 'square'), 170);
    },
    crash() { noiseBurst(0.25, 0.4, 500); },
    click() { tone(440, 0.05, 0.2, 'square'); },
    missionDone() {
      tone(523, 0.12, 0.25);
      window.setTimeout(() => tone(659, 0.12, 0.25), 120);
      window.setTimeout(() => tone(784, 0.2, 0.25), 240);
    },
    busted() { tone(220, 0.5, 0.3, 'sawtooth'); },
    destroy() {
      if (sirenTimer !== null) window.clearInterval(sirenTimer);
      if (ctx) ctx.close().catch(() => {});
    },
  };
}
