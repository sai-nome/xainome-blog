/* Original slow sci-fi lounge: warm pads and sparse, echoing synth notes. */
(function () {
  'use strict';
  const KEY = 'xainome.ai-empire.music';
  let enabled = true, volume = .22, requested = false, context, master, echo, timer, generation = 0;
  let nextChord = 0, chordIndex = 0;
  const voices = new Set();
  const chords = [[45, 52, 59, 62], [41, 48, 55, 64], [48, 55, 62, 64], [43, 50, 57, 60]];
  const frequency = midi => 440 * Math.pow(2, (midi - 69) / 12);
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved) { enabled = saved.enabled !== false; if (Number.isFinite(saved.volume)) volume = Math.max(0, Math.min(1, saved.volume)); }
  } catch { /* Preferences remain optional. */ }
  function ensureAudio() {
    if (context) return true;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      context = new Audio(); master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
      const delay = context.createDelay(2), feedback = context.createGain(), filter = context.createBiquadFilter();
      echo = context.createGain(); echo.gain.value = .23; delay.delayTime.value = .75;
      feedback.gain.value = .32; filter.type = 'lowpass'; filter.frequency.value = 1800;
      echo.connect(delay); delay.connect(filter); filter.connect(master); filter.connect(feedback); feedback.connect(delay);
      return true;
    } catch { return false; }
  }
  function note(midi, start, duration, level, pad = false, detune = 0) {
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency(midi); oscillator.detune.value = detune;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + (pad ? 2 : .04));
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(master); gain.connect(echo);
    voices.add(oscillator); oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + duration + .05);
  }
  function schedule() {
    if (!requested || !enabled || !volume || document.hidden || context.state !== 'running') return;
    while (nextChord < context.currentTime + .5) {
      const chord = chords[chordIndex % chords.length];
      chord.forEach(midi => { note(midi, nextChord, 10, .055, true, -4); note(midi, nextChord, 10, .04, true, 4); });
      // 60 BPM; leave plenty of space between soft, high notes.
      [0, 2, 3, 1].forEach((degree, i) => note(chord[degree] + 24, nextChord + 1 + i * 1.75, 2.8, .055));
      nextChord += 8; chordIndex++;
    }
  }
  function halt() {
    generation++; clearInterval(timer); timer = undefined;
    if (!context) return;
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(0, now, .1);
    for (const voice of voices) { try { voice.stop(now + .4); } catch { /* Already ended. */ } }
  }
  async function start() {
    if (!requested || !enabled || !volume || document.hidden || timer || !ensureAudio()) return;
    const attempt = ++generation;
    try { if (context.state !== 'running') await context.resume(); } catch { return; }
    if (attempt !== generation || !requested || !enabled || !volume || document.hidden || timer) return;
    master.gain.setTargetAtTime(volume, context.currentTime, .35);
    nextChord = context.currentTime + .06; chordIndex = 0; schedule(); timer = setInterval(schedule, 250);
  }
  function open() { requested = true; start(); }
  function close() { requested = false; halt(); }
  function configure(nextEnabled, nextVolume = volume) {
    enabled = !!nextEnabled; volume = Math.max(0, Math.min(1, nextVolume));
    try { localStorage.setItem(KEY, JSON.stringify({ enabled, volume })); } catch { /* Optional. */ }
    if (!enabled || !volume) halt();
    else if (timer) master.gain.setTargetAtTime(volume, context.currentTime, .12);
    else start();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) halt(); else if (requested) start(); });
  window.addEventListener('pagehide', close);
  window.EmpireMusic = { open, close, configure, get enabled() { return enabled; }, get volume() { return volume; } };
})();
