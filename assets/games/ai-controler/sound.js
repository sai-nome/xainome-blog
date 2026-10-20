/* Small original sound effects, synthesized locally after a user gesture. */
(function () {
  'use strict';
  const KEY = 'xainome.ai-empire.sound';
  let enabled = true, volume = .35, context, master, lastJob = 0;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) { enabled = saved.enabled !== false; if (Number.isFinite(saved.volume)) volume = Math.max(0, Math.min(1, saved.volume)); }
  } catch { /* Sound preferences are optional. */ }
  function unlock() {
    if (!enabled || volume === 0) return;
    try {
      if (!context) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        context = new Audio(); master = context.createGain(); master.gain.value = volume; master.connect(context.destination);
      }
      if (context.state === 'suspended') context.resume().catch(() => {});
    } catch { /* Gameplay remains available without audio. */ }
  }
  function tone(frequency, delay = 0, duration = .12, level = .16, type = 'sine') {
    if (!context || !master || !enabled || volume === 0 || document.hidden) return;
    const start = context.currentTime + delay, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(level, start + .008); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain); gain.connect(master); oscillator.start(start); oscillator.stop(start + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function rumble() {
    if (!context || !enabled || !volume || document.hidden) return;
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate), samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 650;
    gain.gain.setValueAtTime(.001, context.currentTime); gain.gain.linearRampToValueAtTime(.45, context.currentTime + .6); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + 2);
    source.connect(filter); filter.connect(gain); gain.connect(master); source.start();
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  function play(kind) {
    if (!enabled || !volume || document.hidden) return;
    // Only a real gesture initializes audio; timers never create a context.
    if (!context || context.state !== 'running') return;
    if (kind === 'discovery') {
      // A short bass impact plus a bright burst: the acquisition "BAAN!".
      const start = context.currentTime, bass = context.createOscillator(), hit = context.createGain();
      bass.frequency.setValueAtTime(150, start); bass.frequency.exponentialRampToValueAtTime(38, start + .45);
      hit.gain.setValueAtTime(.001, start); hit.gain.linearRampToValueAtTime(.48, start + .012); hit.gain.exponentialRampToValueAtTime(.001, start + .65);
      bass.connect(hit); hit.connect(master); bass.start(start); bass.stop(start + .7);
      bass.onended = () => { bass.disconnect(); hit.disconnect(); };
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * .45), context.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      const noise = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      noise.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = 2600; gain.gain.value = .23;
      noise.connect(filter); filter.connect(gain); gain.connect(master); noise.start(start);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
      [523, 659, 784, 1047].forEach((f, i) => tone(f, .12 + i * .07, .6, .12, 'triangle'));
    }
    else if (kind === 'click') { tone(520, 0, .055, .10, 'triangle'); tone(780, .025, .06, .06); }
    else if (kind === 'purchase') [392, 523, 659].forEach((f, i) => tone(f, i * .07, .17, .15, 'triangle'));
    else if (kind === 'research' || kind === 'milestone') [523, 659, 784, 1047].forEach((f, i) => tone(f, i * .10, .25, .14));
    else if (kind === 'job') { if (Date.now() - lastJob < 2500) return; lastJob = Date.now(); tone(1047, 0, .07, .035); tone(1319, .055, .09, .025); }
    else if (kind === 'countdown') tone(440, 0, .16, .18, 'triangle');
    else if (kind === 'launch') { rumble(); tone(80, 0, 1.7, .2, 'triangle'); }
    else if (kind === 'ending') [523, 659, 784, 1047, 988, 784, 880, 1047, 1319].forEach((f, i) => tone(f, i * .27, .65, .13));
  }
  function configure(nextEnabled, nextVolume = volume) {
    enabled = !!nextEnabled; volume = Math.max(0, Math.min(1, nextVolume));
    if (master) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .025);
    try { localStorage.setItem(KEY, JSON.stringify({ enabled, volume })); } catch { /* Optional preference. */ }
    if (enabled) unlock();
    if (master) master.gain.setTargetAtTime(enabled ? volume : 0, context.currentTime, .025);
  }
  document.addEventListener('pointerdown', unlock, { capture: true });
  document.addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && context?.state === 'running') context.suspend().catch(() => {}); else if (!document.hidden && enabled) unlock(); });
  window.EmpireSound = { play, configure, get enabled() { return enabled; }, get volume() { return volume; } };
})();
