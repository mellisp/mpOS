/* Synth — Polyphonic Modular Synthesizer (VCV Rack inspired) */
(function () {
'use strict';

const VOICES = 4;
const KEYBOARD_KEYS = 'awsedftgyhujkolp;';
const BLACK_KEY_SET = new Set([1, 3, 6, 8, 10, 13, 15, 18, 20, 22]);

/* ══════════════════════════════════════════════════════════════════════
 *  State
 * ══════════════════════════════════════════════════════════════════════ */
let built = false;
let ctx = null;
let outputNode = null;
let masterGain = null;
let voiceAge = 0;
let keyboardOctave = 3;
let lfoNode = null;
let lfoGain = null;
let lfoDepth = 50;
let lfoRate = 2;
let lfoShape = 'sine';
let lfoTarget = 'filter'; // 'filter' or 'pitch'

/* Module params */
let oscWaveform = 'sawtooth';
let oscOctave = 0;
let oscDetune = 0;
let filterType = 'lowpass';
let filterCutoff = 5000;
let filterRes = 1;
let filterEnvAmt = 0;
let envA = 0.01;
let envD = 0.3;
let envS = 0.7;
let envR = 0.3;
let masterVol = 0.7;

const voices = [];
const activeKeys = new Map(); // noteNum -> voiceIndex
const outputJackId = 'synth-out';

/* ══════════════════════════════════════════════════════════════════════
 *  Utility
 * ══════════════════════════════════════════════════════════════════════ */
const midiToFreq = (note) => 440 * Math.pow(2, (note - 69) / 12);

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (n) => noteNames[n % 12] + Math.floor(n / 12 - 1);

/* ══════════════════════════════════════════════════════════════════════
 *  Audio Engine
 * ══════════════════════════════════════════════════════════════════════ */
const initAudio = () => {
  const bus = window.mpAudioBus;
  if (!bus) return;
  ctx = bus.getContext();

  masterGain = ctx.createGain();
  masterGain.gain.value = masterVol;

  outputNode = ctx.createGain();
  outputNode.gain.value = 1;

  masterGain.connect(outputNode);
  outputNode.connect(bus.getDestination());

  /* Init voices */
  for (let i = 0; i < VOICES; i++) {
    const osc = ctx.createOscillator();
    osc.type = oscWaveform;
    osc.frequency.value = 440;
    osc.detune.value = oscDetune;
    osc.start();

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterCutoff;
    filter.Q.value = filterRes;

    const vca = ctx.createGain();
    vca.gain.value = 0;

    osc.connect(filter);
    filter.connect(vca);
    vca.connect(masterGain);

    voices.push({
      osc, filter, vca,
      noteNum: -1, age: 0, releasing: false
    });
  }

  /* LFO */
  lfoNode = ctx.createOscillator();
  lfoNode.type = lfoShape;
  lfoNode.frequency.value = lfoRate;
  lfoNode.start();

  lfoGain = ctx.createGain();
  lfoGain.gain.value = lfoDepth;
  lfoNode.connect(lfoGain);

  applyLfoRouting();
};

const applyLfoRouting = () => {
  if (!lfoGain) return;
  try { lfoGain.disconnect(); } catch (e) { /* */ }
  lfoGain.gain.value = lfoDepth;
  for (const v of voices) {
    if (lfoTarget === 'filter') {
      lfoGain.connect(v.filter.frequency);
    } else {
      lfoGain.connect(v.osc.detune);
    }
  }
};

const destroyAudio = () => {
  for (const v of voices) {
    try { v.osc.stop(); } catch (e) { /* */ }
    try { v.osc.disconnect(); } catch (e) { /* */ }
    try { v.filter.disconnect(); } catch (e) { /* */ }
    try { v.vca.disconnect(); } catch (e) { /* */ }
  }
  voices.length = 0;
  if (lfoNode) { try { lfoNode.stop(); lfoNode.disconnect(); } catch (e) { /* */ } }
  if (lfoGain) { try { lfoGain.disconnect(); } catch (e) { /* */ } }
  if (masterGain) { try { masterGain.disconnect(); } catch (e) { /* */ } }
  if (outputNode) { try { outputNode.disconnect(); } catch (e) { /* */ } }
  lfoNode = null;
  lfoGain = null;
  masterGain = null;
  outputNode = null;
  ctx = null;
  activeKeys.clear();
  voiceAge = 0;
};

/* ══════════════════════════════════════════════════════════════════════
 *  Note On / Off — 4-voice paraphonic, steal-oldest
 * ══════════════════════════════════════════════════════════════════════ */
const noteOn = (noteNum) => {
  if (!ctx) return;
  if (activeKeys.has(noteNum)) return; // already playing

  // Find free voice, or steal oldest
  let vi = voices.findIndex(v => v.noteNum === -1);
  if (vi === -1) {
    // Steal oldest
    let oldest = Infinity;
    for (let i = 0; i < voices.length; i++) {
      if (voices[i].age < oldest) { oldest = voices[i].age; vi = i; }
    }
    // Release stolen voice instantly
    voices[vi].vca.gain.cancelScheduledValues(ctx.currentTime);
    voices[vi].vca.gain.setValueAtTime(0, ctx.currentTime);
    activeKeys.delete(voices[vi].noteNum);
  }

  const voice = voices[vi];
  voice.noteNum = noteNum;
  voice.age = ++voiceAge;
  voice.releasing = false;
  activeKeys.set(noteNum, vi);

  const freq = midiToFreq(noteNum + oscOctave * 12);
  voice.osc.frequency.setValueAtTime(freq, ctx.currentTime);

  // Apply filter envelope amount
  const envCutoff = filterCutoff + filterEnvAmt * filterCutoff;
  voice.filter.frequency.cancelScheduledValues(ctx.currentTime);
  voice.filter.frequency.setValueAtTime(Math.min(20000, envCutoff), ctx.currentTime);
  voice.filter.frequency.linearRampToValueAtTime(filterCutoff, ctx.currentTime + envD);

  // ADSR envelope on VCA
  const now = ctx.currentTime;
  voice.vca.gain.cancelScheduledValues(now);
  voice.vca.gain.setValueAtTime(0, now);
  voice.vca.gain.linearRampToValueAtTime(1, now + envA);
  voice.vca.gain.linearRampToValueAtTime(envS, now + envA + envD);

  highlightKey(noteNum, true);
  updateStatus(noteNum);
};

const noteOff = (noteNum) => {
  if (!ctx) return;
  const vi = activeKeys.get(noteNum);
  if (vi === undefined) return;

  const voice = voices[vi];
  voice.releasing = true;

  const now = ctx.currentTime;
  voice.vca.gain.cancelScheduledValues(now);
  voice.vca.gain.setValueAtTime(voice.vca.gain.value, now);
  voice.vca.gain.linearRampToValueAtTime(0, now + envR);

  // Schedule voice free
  setTimeout(() => {
    if (voice.releasing && voice.noteNum === noteNum) {
      voice.noteNum = -1;
      voice.releasing = false;
      activeKeys.delete(noteNum);
    }
  }, envR * 1000 + 50);

  highlightKey(noteNum, false);
};

/* ══════════════════════════════════════════════════════════════════════
 *  UI
 * ══════════════════════════════════════════════════════════════════════ */
let keyElements = [];
let statusEl = null;

const highlightKey = (noteNum, on) => {
  const baseNote = keyboardOctave * 12 + 12; // C at current octave (MIDI: C1=24, C3=48...)
  const idx = noteNum - baseNote;
  if (idx < 0 || idx >= keyElements.length) return;
  const el = keyElements[idx];
  if (!el) return;
  if (on) {
    el.classList.add('synth-key-active');
  } else {
    el.classList.remove('synth-key-active');
  }
};

const updateStatus = (noteNum) => {
  if (statusEl) {
    const activeCount = voices.filter(v => v.noteNum !== -1).length;
    const name = noteNum !== undefined ? noteName(noteNum) : '';
    statusEl.textContent = name ? `${name} | ${activeCount}/${VOICES} ${t('synth.voices')}` : t('synth.ready');
  }
};

const buildUI = () => {
  if (built) return;
  built = true;

  const body = document.getElementById('synthBody');
  if (!body) return;
  body.innerHTML = '';

  /* Main container: rack + keyboard */
  const container = document.createElement('div');
  container.className = 'synth-container';

  /* Module rack (horizontal scroll) */
  const rack = document.createElement('div');
  rack.className = 'synth-rack';

  rack.appendChild(buildVCOModule());
  rack.appendChild(buildVCFModule());
  rack.appendChild(buildADSRModule());
  rack.appendChild(buildLFOModule());
  rack.appendChild(buildOutputModule());

  container.appendChild(rack);

  /* Keyboard */
  container.appendChild(buildKeyboard());

  body.appendChild(container);

  statusEl = document.getElementById('synthStatus');
  updateStatus();
};

/* ── Module builders ── */

const makeModulePanel = (title, className) => {
  const panel = document.createElement('div');
  panel.className = 'synth-module ' + (className || '');
  const titleEl = document.createElement('div');
  titleEl.className = 'synth-module-title';
  titleEl.textContent = title;
  panel.appendChild(titleEl);
  return panel;
};

const makeSlider = (label, min, max, value, step, onChange) => {
  const row = document.createElement('div');
  row.className = 'synth-param';
  const lbl = document.createElement('div');
  lbl.className = 'synth-param-label';
  lbl.textContent = label;
  const valSpan = document.createElement('span');
  valSpan.className = 'synth-param-value';
  const fmtVal = typeof value === 'number' && step < 1 ? value.toFixed(2) : value;
  valSpan.append(fmtVal);
  lbl.appendChild(valSpan);
  row.appendChild(lbl);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.className = 'synth-slider audio-slider';
  slider.min = min;
  slider.max = max;
  slider.step = step;
  slider.value = value;
  slider.setAttribute('aria-label', label);
  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value);
    valSpan.textContent = step < 1 ? v.toFixed(2) : v;
    onChange(v);
  });
  row.appendChild(slider);
  return row;
};

const makeSelect = (label, options, value, onChange) => {
  const row = document.createElement('div');
  row.className = 'synth-param';
  const lbl = document.createElement('div');
  lbl.className = 'synth-param-label';
  lbl.textContent = label;
  row.appendChild(lbl);

  const sel = document.createElement('select');
  sel.className = 'synth-select';
  sel.setAttribute('aria-label', label);
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    if (opt.value === value) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  row.appendChild(sel);
  return row;
};

const buildVCOModule = () => {
  const panel = makeModulePanel(t('synth.vco'));

  const waves = [
    { value: 'sine', label: t('synth.wave.sine') },
    { value: 'sawtooth', label: t('synth.wave.saw') },
    { value: 'square', label: t('synth.wave.square') },
    { value: 'triangle', label: t('synth.wave.tri') }
  ];
  panel.appendChild(makeSelect(t('synth.wave'), waves, oscWaveform, (v) => {
    oscWaveform = v;
    for (const voice of voices) voice.osc.type = v;
  }));

  const octaves = [-2, -1, 0, 1, 2].map(o => ({ value: String(o), label: (o >= 0 ? '+' : '') + o }));
  panel.appendChild(makeSelect(t('synth.octave'), octaves, String(oscOctave), (v) => {
    oscOctave = parseInt(v, 10);
  }));

  panel.appendChild(makeSlider(t('synth.detune'), -100, 100, oscDetune, 1, (v) => {
    oscDetune = v;
    for (const voice of voices) voice.osc.detune.value = v;
  }));

  return panel;
};

const buildVCFModule = () => {
  const panel = makeModulePanel(t('synth.vcf'));

  const types = [
    { value: 'lowpass', label: 'LP' },
    { value: 'highpass', label: 'HP' },
    { value: 'bandpass', label: 'BP' }
  ];
  panel.appendChild(makeSelect(t('synth.filterType'), types, filterType, (v) => {
    filterType = v;
    for (const voice of voices) voice.filter.type = v;
  }));

  panel.appendChild(makeSlider(t('synth.cutoff'), 20, 20000, filterCutoff, 1, (v) => {
    filterCutoff = v;
    for (const voice of voices) {
      if (!voice.releasing && voice.noteNum === -1) {
        voice.filter.frequency.value = v;
      }
    }
  }));

  panel.appendChild(makeSlider(t('synth.resonance'), 0, 20, filterRes, 0.1, (v) => {
    filterRes = v;
    for (const voice of voices) voice.filter.Q.value = v;
  }));

  panel.appendChild(makeSlider(t('synth.envAmt'), 0, 1, filterEnvAmt, 0.01, (v) => {
    filterEnvAmt = v;
  }));

  return panel;
};

const buildADSRModule = () => {
  const panel = makeModulePanel(t('synth.adsr'));

  panel.appendChild(makeSlider(t('synth.attack'), 0.001, 5, envA, 0.001, (v) => { envA = v; }));
  panel.appendChild(makeSlider(t('synth.decay'), 0.001, 5, envD, 0.001, (v) => { envD = v; }));
  panel.appendChild(makeSlider(t('synth.sustain'), 0, 1, envS, 0.01, (v) => { envS = v; }));
  panel.appendChild(makeSlider(t('synth.release'), 0.001, 10, envR, 0.001, (v) => { envR = v; }));

  return panel;
};

const buildLFOModule = () => {
  const panel = makeModulePanel(t('synth.lfo'));

  const shapes = [
    { value: 'sine', label: t('synth.wave.sine') },
    { value: 'triangle', label: t('synth.wave.tri') },
    { value: 'square', label: t('synth.wave.square') },
    { value: 'sawtooth', label: t('synth.wave.saw') }
  ];
  panel.appendChild(makeSelect(t('synth.shape'), shapes, lfoShape, (v) => {
    lfoShape = v;
    if (lfoNode) lfoNode.type = v;
  }));

  panel.appendChild(makeSlider(t('synth.rate'), 0.1, 20, lfoRate, 0.1, (v) => {
    lfoRate = v;
    if (lfoNode) lfoNode.frequency.value = v;
  }));

  panel.appendChild(makeSlider(t('synth.depth'), 0, 200, lfoDepth, 1, (v) => {
    lfoDepth = v;
    if (lfoGain) lfoGain.gain.value = v;
  }));

  const targets = [
    { value: 'filter', label: t('synth.target.filter') },
    { value: 'pitch', label: t('synth.target.pitch') }
  ];
  panel.appendChild(makeSelect(t('synth.target'), targets, lfoTarget, (v) => {
    lfoTarget = v;
    applyLfoRouting();
  }));

  return panel;
};

const buildOutputModule = () => {
  const panel = makeModulePanel(t('synth.output'));

  panel.appendChild(makeSlider(t('synth.volume'), 0, 1, masterVol, 0.01, (v) => {
    masterVol = v;
    if (masterGain) masterGain.gain.value = v;
  }));

  /* Output jack */
  const jackRow = document.createElement('div');
  jackRow.className = 'synth-jack-row';
  const jackLabel = document.createElement('span');
  jackLabel.className = 'audio-jack-label';
  jackLabel.textContent = t('synth.out');
  const jackEl = document.createElement('div');
  jackEl.className = 'audio-jack output';
  jackEl.id = 'synthOutputJack';
  jackEl.setAttribute('data-jack-id', outputJackId);
  jackRow.appendChild(jackLabel);
  jackRow.appendChild(jackEl);
  panel.appendChild(jackRow);

  return panel;
};

/* ── Keyboard ── */
const buildKeyboard = () => {
  const kbWrap = document.createElement('div');
  kbWrap.className = 'synth-keyboard-wrap';

  /* Octave controls */
  const octRow = document.createElement('div');
  octRow.className = 'synth-oct-row';
  const octDown = document.createElement('button');
  octDown.type = 'button';
  octDown.className = 'btn synth-oct-btn';
  octDown.textContent = '−';
  octDown.setAttribute('aria-label', t('synth.octDown'));
  const octLabel = document.createElement('span');
  octLabel.className = 'synth-oct-label';
  octLabel.textContent = `C${keyboardOctave}`;
  octLabel.id = 'synthOctLabel';
  const octUp = document.createElement('button');
  octUp.type = 'button';
  octUp.className = 'btn synth-oct-btn';
  octUp.textContent = '+';
  octUp.setAttribute('aria-label', t('synth.octUp'));
  octDown.addEventListener('click', () => {
    if (keyboardOctave > 0) {
      allNotesOff();
      keyboardOctave--;
      octLabel.textContent = `C${keyboardOctave}`;
    }
  });
  octUp.addEventListener('click', () => {
    if (keyboardOctave < 7) {
      allNotesOff();
      keyboardOctave++;
      octLabel.textContent = `C${keyboardOctave}`;
    }
  });
  octRow.appendChild(octDown);
  octRow.appendChild(octLabel);
  octRow.appendChild(octUp);
  kbWrap.appendChild(octRow);

  /* Piano keys — 2 octaves (25 semitones: C to C)
   * White keys laid out in flex, black keys absolutely positioned.
   * Pattern per octave: C  C# D  D# E  F  F# G  G# A  A# B
   *                     W  B  W  B  W  W  B  W  B  W  B  W
   * Semitone indices in octave: 0  1  2  3  4  5  6  7  8  9  10 11 */
  const kb = document.createElement('div');
  kb.className = 'synth-keyboard';
  keyElements = [];

  // Build array of all 25 notes; add white keys to DOM first, black keys on top
  const NUM_KEYS = 25;
  const whiteIndices = []; // semitone indices that are white
  const blackIndices = []; // semitone indices that are black
  for (let i = 0; i < NUM_KEYS; i++) {
    if (BLACK_KEY_SET.has(i)) blackIndices.push(i);
    else whiteIndices.push(i);
  }

  // Create a placeholder array so keyElements[i] maps to semitone i
  const keyEls = new Array(NUM_KEYS);

  const attachEvents = (key, i) => {
    const handleDown = (e) => {
      e.preventDefault();
      const noteNum = keyboardOctave * 12 + 12 + i;
      noteOn(noteNum);
      key.dataset.active = '1';
    };
    const handleUp = (e) => {
      e.preventDefault();
      if (key.dataset.active === '1') {
        const noteNum = keyboardOctave * 12 + 12 + i;
        noteOff(noteNum);
        key.dataset.active = '0';
      }
    };
    key.addEventListener('mousedown', handleDown);
    key.addEventListener('touchstart', handleDown, { passive: false });
    key.addEventListener('mouseup', handleUp);
    key.addEventListener('mouseleave', handleUp);
    key.addEventListener('touchend', handleUp);
    key.addEventListener('touchcancel', handleUp);
  };

  // White keys (in DOM order = left to right)
  for (const i of whiteIndices) {
    const key = document.createElement('div');
    key.className = 'synth-key synth-key-white';
    key.dataset.note = String(i);
    attachEvents(key, i);
    kb.appendChild(key);
    keyEls[i] = key;
  }

  // Black keys positioned after layout via percentage
  // Map semitone offset within an octave to white-key position
  // In each octave of 7 white keys, black key positions (as fraction of white key width):
  // C#(1)=0.65, D#(3)=1.75, F#(6)=3.6, G#(8)=4.65, A#(10)=5.7
  const blackPosInOctave = { 1: 0.65, 3: 1.75, 6: 3.6, 8: 4.65, 10: 5.7 };
  const totalWhite = whiteIndices.length;

  for (const i of blackIndices) {
    const key = document.createElement('div');
    key.className = 'synth-key synth-key-black';
    key.dataset.note = String(i);
    attachEvents(key, i);

    // Calculate left position as percentage
    const octaveNum = Math.floor(i / 12);
    const semInOct = i % 12;
    const whitesBefore = octaveNum * 7; // 7 white keys per octave
    const posInOctave = blackPosInOctave[semInOct] || 0;
    const whiteKeyPos = whitesBefore + posInOctave;
    const leftPct = (whiteKeyPos / totalWhite) * 100;
    key.style.left = `${leftPct}%`;

    kb.appendChild(key);
    keyEls[i] = key;
  }

  keyElements = keyEls;
  kbWrap.appendChild(kb);
  return kbWrap;
};

const allNotesOff = () => {
  for (const [noteNum] of activeKeys) {
    noteOff(noteNum);
  }
  for (const el of keyElements) {
    el.classList.remove('synth-key-active');
    el.dataset.active = '0';
  }
};

/* ── Computer keyboard input ── */
const keyMap = {}; // keyboard key -> noteNum (relative to octave start)
const setupKeyMap = () => {
  // ASDF row = white keys, WE TY UIO = black keys
  // Layout: A=C, W=C#, S=D, E=D#, D=E, F=F, T=F#, G=G, Y=G#, H=A, U=A#, J=B, K=C5, O=C#5, L=D5, P=D#5
  const map = {
    'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6, 'g': 7,
    'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12, 'o': 13, 'l': 14,
    'p': 15, ';': 16
  };
  Object.assign(keyMap, map);
};
setupKeyMap();

const heldComputerKeys = new Set();

const onKeyDown = (e) => {
  if (e.repeat) return;
  const win = document.getElementById('synth');
  if (!win || win.style.display === 'none') return;

  const k = e.key.toLowerCase();
  if (k in keyMap && !heldComputerKeys.has(k)) {
    e.preventDefault();
    heldComputerKeys.add(k);
    const noteNum = keyboardOctave * 12 + 12 + keyMap[k];
    noteOn(noteNum);
  }
  if (k === 'z' && keyboardOctave > 0) {
    allNotesOff();
    keyboardOctave--;
    const lbl = document.getElementById('synthOctLabel');
    if (lbl) lbl.textContent = `C${keyboardOctave}`;
  }
  if (k === 'x' && keyboardOctave < 7) {
    allNotesOff();
    keyboardOctave++;
    const lbl = document.getElementById('synthOctLabel');
    if (lbl) lbl.textContent = `C${keyboardOctave}`;
  }
};

const onKeyUp = (e) => {
  const k = e.key.toLowerCase();
  if (k in keyMap && heldComputerKeys.has(k)) {
    heldComputerKeys.delete(k);
    const noteNum = keyboardOctave * 12 + 12 + keyMap[k];
    noteOff(noteNum);
  }
};

/* ══════════════════════════════════════════════════════════════════════
 *  MIDI Support (optional)
 * ══════════════════════════════════════════════════════════════════════ */
let midiAccess = null;

const initMIDI = async () => {
  if (!navigator.requestMIDIAccess) return;
  try {
    midiAccess = await navigator.requestMIDIAccess();
    for (const input of midiAccess.inputs.values()) {
      input.onmidimessage = onMIDIMessage;
    }
    midiAccess.onstatechange = (e) => {
      if (e.port.type === 'input' && e.port.state === 'connected') {
        e.port.onmidimessage = onMIDIMessage;
      }
    };
  } catch (e) { /* MIDI not available */ }
};

const onMIDIMessage = (msg) => {
  const [status, note, velocity] = msg.data;
  const cmd = status & 0xf0;
  if (cmd === 0x90 && velocity > 0) {
    noteOn(note);
  } else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) {
    noteOff(note);
  }
};

/* ══════════════════════════════════════════════════════════════════════
 *  Open / Close
 * ══════════════════════════════════════════════════════════════════════ */
const openSynth = () => {
  buildUI();
  if (!ctx) initAudio();
  window.openWindow('synth');

  /* Register output jack */
  const bus = window.mpAudioBus;
  if (bus && outputNode) {
    const jackEl = document.getElementById('synthOutputJack');
    bus.registerOutput(outputJackId, {
      node: outputNode,
      label: t('synth.outputLabel'),
      element: jackEl,
      module: 'synth'
    });
  }

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  initMIDI();
};

const closeSynth = () => {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup', onKeyUp);
  heldComputerKeys.clear();

  allNotesOff();

  const bus = window.mpAudioBus;
  if (bus) bus.unregisterOutput(outputJackId);

  destroyAudio();

  window.mpTaskbar.closeWindow('synth');
};

/* ══════════════════════════════════════════════════════════════════════
 *  Language refresh
 * ══════════════════════════════════════════════════════════════════════ */
const synthRefreshOnLangChange = () => {
  if (!built) return;
  const win = document.getElementById('synth');
  if (!win || win.style.display === 'none') return;
  /* Full rebuild for language change */
  const wasPlaying = ctx !== null;
  if (wasPlaying) {
    allNotesOff();
    destroyAudio();
  }
  built = false;
  buildUI();
  if (wasPlaying) initAudio();
};

/* ══════════════════════════════════════════════════════════════════════
 *  Registration + exports
 * ══════════════════════════════════════════════════════════════════════ */
window.mpRegisterActions({ openSynth });
window.mpRegisterWindows({ synth: 'Synthesizer' });
window.mpRegisterCloseHandlers({ synth: closeSynth });

window.openSynth = openSynth;
window.closeSynth = closeSynth;
window.synthRefreshOnLangChange = synthRefreshOnLangChange;

})();
