// Solmar Bay — sound: tiny WebAudio bleeps for shots, pickups and
// mission chimes, plus a soft engine hum that follows the car's speed.
// No audio files; everything is synthesized, and it stays silent until
// the player first interacts (browsers block audio before a gesture).
export function makeAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let enabled = true;
  let started = false;

  function ensure() {
    if (started) return;
    started = true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    } catch (err) {
      ctx = null;
    }
  }

  function beep(freq, dur, type, vol, slideTo) {
    if (!enabled || !ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (err) {
      // Sound is decorative; never let it break the game.
    }
  }

  const sounds = {
    shoot: () => beep(900, 0.08, 'square', 0.05, 120),
    smg: () => beep(1200, 0.05, 'square', 0.04, 200),
    pickup: () => beep(660, 0.12, 'sine', 0.1, 990),
    coin: () => { beep(880, 0.1, 'sine', 0.1); setTimeout(() => beep(1320, 0.14, 'sine', 0.1), 90); },
    mission: () => { beep(523, 0.15, 'sine', 0.12); setTimeout(() => beep(784, 0.25, 'sine', 0.12), 140); },
    fail: () => beep(220, 0.4, 'sawtooth', 0.08, 110),
    hit: () => beep(180, 0.1, 'square', 0.07, 90),
    siren: () => beep(700, 0.3, 'sine', 0.03, 1000),
    crash: () => beep(120, 0.2, 'sawtooth', 0.1, 60),
    repair: () => { beep(440, 0.1, 'sine', 0.1); setTimeout(() => beep(660, 0.2, 'sine', 0.1), 120); },
  };

  return {
    resume() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    sound(name) { ensure(); if (sounds[name]) sounds[name](); },
    setEngine(speed) {
      if (!enabled || !ctx || !engineOsc || !engineGain) return;
      const target = speed > 0.5 ? 0.02 + Math.min(0.05, speed * 0.002) : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(50 + speed * 3, ctx.currentTime, 0.1);
    },
    toggle() { enabled = !enabled; return enabled; },
    get enabled() { return enabled; },
  };
}
