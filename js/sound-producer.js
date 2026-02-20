/* Sound Producer — Procedural UI sound synthesis + preview/export app */
(function () {
'use strict';

const { openWindow, t } = window;

/* ══════════════════════════════════════════════════════════════════════
 *  Seeded PRNG (mulberry32) for deterministic noise buffers
 * ══════════════════════════════════════════════════════════════════════ */
const mulberry32 = (seed) => () => {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let h = Math.imul(seed ^ seed >>> 15, 1 | seed);
  h ^= h + Math.imul(h ^ h >>> 7, 61 | h);
  return ((h ^ h >>> 14) >>> 0) / 4294967296;
};

/* ══════════════════════════════════════════════════════════════════════
 *  Preset definitions
 * ══════════════════════════════════════════════════════════════════════ */
const PRESETS = {
  click: {
    duration: 0.04, masterGain: 0.35,
    layers: [{
      type: 'osc', waveform: 'triangle',
      freq: 1800, freqEnd: 1200,
      gain: 1, envelope: { a: 0.001, d: 0.035, s: 0, r: 0.005 },
      filter: { type: 'highpass', freq: 800 }
    }]
  },
  hover: {
    duration: 0.06, masterGain: 0.12,
    layers: [{
      type: 'osc', waveform: 'sine',
      freq: 2400, freqEnd: 2400,
      gain: 1, envelope: { a: 0.005, d: 0.04, s: 0, r: 0.015 }
    }]
  },
  confirm: {
    duration: 0.18, masterGain: 0.25,
    layers: [
      { type: 'osc', waveform: 'sine', freq: 523.25, freqEnd: 523.25,
        gain: 0.7, envelope: { a: 0.005, d: 0.06, s: 0.3, r: 0.04 } },
      { type: 'osc', waveform: 'sine', freq: 659.25, freqEnd: 659.25,
        gain: 0.7, envelope: { a: 0.005, d: 0.06, s: 0.3, r: 0.04 },
        delay: 0.06 }
    ]
  },
  error: {
    duration: 0.25, masterGain: 0.25,
    layers: [
      { type: 'osc', waveform: 'triangle', freq: 294, freqEnd: 294,
        gain: 0.6, envelope: { a: 0.003, d: 0.15, s: 0.1, r: 0.06 },
        filter: { type: 'lowpass', freq: 2000, freqEnd: 600 } },
      { type: 'osc', waveform: 'triangle', freq: 349, freqEnd: 349,
        gain: 0.5, envelope: { a: 0.003, d: 0.15, s: 0.1, r: 0.06 },
        filter: { type: 'lowpass', freq: 2000, freqEnd: 600 } }
    ]
  },
  notif: {
    duration: 0.5, masterGain: 0.2,
    layers: [{
      type: 'fm', carrierFreq: 830, modFreq: 1245, modIndex: 3, modIndexEnd: 0,
      gain: 1, envelope: { a: 0.002, d: 0.35, s: 0, r: 0.15 }
    }]
  },
  open: {
    duration: 0.12, masterGain: 0.2,
    layers: [
      { type: 'osc', waveform: 'sine', freq: 300, freqEnd: 600,
        gain: 0.7, envelope: { a: 0.005, d: 0.08, s: 0, r: 0.035 } },
      { type: 'noise', gain: 0.15, envelope: { a: 0.005, d: 0.06, s: 0, r: 0.05 },
        filter: { type: 'bandpass', freq: 2000, Q: 1.5 } }
    ]
  },
  close: {
    duration: 0.1, masterGain: 0.2,
    layers: [
      { type: 'osc', waveform: 'sine', freq: 500, freqEnd: 250,
        gain: 0.7, envelope: { a: 0.003, d: 0.07, s: 0, r: 0.027 } },
      { type: 'noise', gain: 0.15, envelope: { a: 0.003, d: 0.05, s: 0, r: 0.047 },
        filter: { type: 'bandpass', freq: 1500, Q: 1.5 } }
    ]
  },
  exit: {
    duration: 0.35, masterGain: 0.25,
    layers: [
      { type: 'osc', waveform: 'sine', freq: 659.25, freqEnd: 659.25,
        gain: 0.6, envelope: { a: 0.003, d: 0.1, s: 0.15, r: 0.04 } },
      { type: 'osc', waveform: 'sine', freq: 523.25, freqEnd: 523.25,
        gain: 0.6, envelope: { a: 0.003, d: 0.1, s: 0.15, r: 0.04 },
        delay: 0.1 },
      { type: 'osc', waveform: 'triangle', freq: 329.63, freqEnd: 329.63,
        gain: 0.4, envelope: { a: 0.003, d: 0.12, s: 0.1, r: 0.06 },
        delay: 0.2 }
    ]
  },
  boot: {
    duration: 2.2, masterGain: 0.2,
    layers: [
      /* E4 → G#4 → B4 → E5 arpeggio */
      { type: 'osc', waveform: 'triangle', freq: 329.63, freqEnd: 329.63,
        gain: 0.5, envelope: { a: 0.01, d: 0.35, s: 0, r: 0.1 } },
      { type: 'osc', waveform: 'triangle', freq: 415.30, freqEnd: 415.30,
        gain: 0.5, envelope: { a: 0.01, d: 0.35, s: 0, r: 0.1 },
        delay: 0.45 },
      { type: 'osc', waveform: 'triangle', freq: 493.88, freqEnd: 493.88,
        gain: 0.5, envelope: { a: 0.01, d: 0.35, s: 0, r: 0.1 },
        delay: 0.9 },
      { type: 'osc', waveform: 'sine', freq: 659.25, freqEnd: 659.25,
        gain: 0.6, envelope: { a: 0.02, d: 0.6, s: 0, r: 0.2 },
        delay: 1.35 },
      /* Filtered pad underneath */
      { type: 'osc', waveform: 'sawtooth', freq: 164.81, freqEnd: 164.81,
        gain: 0.08, envelope: { a: 0.3, d: 1.5, s: 0, r: 0.4 },
        filter: { type: 'lowpass', freq: 600, Q: 2 } },
      /* Shimmer */
      { type: 'osc', waveform: 'sine', freq: 1318.5, freqEnd: 1318.5,
        gain: 0.06, envelope: { a: 0.5, d: 1.2, s: 0, r: 0.5 },
        delay: 0.6 }
    ]
  }
};

/* ══════════════════════════════════════════════════════════════════════
 *  Graph builder — shared by real-time and offline render paths
 * ══════════════════════════════════════════════════════════════════════ */
let noiseBuffer = null;

const getNoiseBuffer = (ctx) => {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const len = ctx.sampleRate * 2;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  const rng = mulberry32(42);
  for (let i = 0; i < len; i++) data[i] = rng() * 2 - 1;
  return noiseBuffer;
};

const buildGraph = (ctx, preset, volume, destination) => {
  const now = ctx.currentTime;
  const dest = destination || ctx.destination;
  const master = ctx.createGain();
  master.gain.value = preset.masterGain * volume;
  master.connect(dest);

  const sources = [];

  for (const layer of preset.layers) {
    const startTime = now + (layer.delay || 0);
    const env = layer.envelope;
    const dur = preset.duration - (layer.delay || 0);
    if (dur <= 0) continue;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(layer.gain, startTime + env.a);
    gainNode.gain.linearRampToValueAtTime(
      layer.gain * env.s, startTime + env.a + env.d
    );
    const releaseStart = startTime + dur - env.r;
    if (releaseStart > startTime + env.a + env.d) {
      gainNode.gain.setValueAtTime(layer.gain * env.s, releaseStart);
    }
    gainNode.gain.linearRampToValueAtTime(0, startTime + dur);

    /* Optional filter */
    let target = master;
    if (layer.filter) {
      const filt = ctx.createBiquadFilter();
      filt.type = layer.filter.type;
      filt.frequency.setValueAtTime(layer.filter.freq, startTime);
      if (layer.filter.freqEnd && layer.filter.freqEnd !== layer.filter.freq) {
        filt.frequency.linearRampToValueAtTime(layer.filter.freqEnd, startTime + dur);
      }
      if (layer.filter.Q) filt.Q.value = layer.filter.Q;
      filt.connect(master);
      target = filt;
    }

    gainNode.connect(target);

    if (layer.type === 'osc') {
      const osc = ctx.createOscillator();
      osc.type = layer.waveform;
      osc.frequency.setValueAtTime(layer.freq, startTime);
      if (layer.freqEnd && layer.freqEnd !== layer.freq) {
        osc.frequency.linearRampToValueAtTime(layer.freqEnd, startTime + dur);
      }
      osc.connect(gainNode);
      osc.start(startTime);
      osc.stop(startTime + dur + 0.05);
      sources.push(osc);

    } else if (layer.type === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = getNoiseBuffer(ctx);
      src.loop = true;
      src.connect(gainNode);
      src.start(startTime);
      src.stop(startTime + dur + 0.05);
      sources.push(src);

    } else if (layer.type === 'fm') {
      /* FM synthesis: modulator → modGain → carrier.frequency */
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(layer.carrierFreq, startTime);
      carrier.connect(gainNode);

      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(layer.modFreq, startTime);

      const modGain = ctx.createGain();
      const modStartAmt = layer.modIndex * layer.modFreq;
      const modEndAmt = (layer.modIndexEnd ?? layer.modIndex) * layer.modFreq;
      modGain.gain.setValueAtTime(modStartAmt, startTime);
      modGain.gain.linearRampToValueAtTime(modEndAmt, startTime + dur);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      carrier.start(startTime);
      carrier.stop(startTime + dur + 0.05);
      modulator.start(startTime);
      modulator.stop(startTime + dur + 0.05);
      sources.push(carrier, modulator);
    }
  }

  return { master, sources };
};

/* ══════════════════════════════════════════════════════════════════════
 *  Buffer cache — pre-render presets via OfflineAudioContext
 * ══════════════════════════════════════════════════════════════════════ */
const bufferCache = {};
let cacheWarmed = false;

const renderOffline = async (presetName, overrides) => {
  const preset = overrides
    ? { ...PRESETS[presetName], ...overrides }
    : PRESETS[presetName];
  if (!preset) return null;

  const sampleRate = 44100;
  const length = Math.ceil(sampleRate * preset.duration) + sampleRate * 0.1;
  const offCtx = new OfflineAudioContext(1, length, sampleRate);

  buildGraph(offCtx, preset, 1, offCtx.destination);
  const buffer = await offCtx.startRendering();

  /* Normalize to 0.95 peak */
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 0) {
    const scale = 0.95 / peak;
    for (let i = 0; i < data.length; i++) data[i] *= scale;
  }

  return buffer;
};

const warmCache = async () => {
  if (cacheWarmed) return;
  cacheWarmed = true;
  const names = Object.keys(PRESETS);
  await Promise.all(names.map(async (name) => {
    bufferCache[name] = await renderOffline(name);
  }));
};

/* Warm cache on first user gesture */
const gestureHandler = () => {
  warmCache();
  document.removeEventListener('click', gestureHandler, true);
  document.removeEventListener('keydown', gestureHandler, true);
};
document.addEventListener('click', gestureHandler, true);
document.addEventListener('keydown', gestureHandler, true);

/* ══════════════════════════════════════════════════════════════════════
 *  Playback API
 * ══════════════════════════════════════════════════════════════════════ */
const getVolume = () => {
  const saved = localStorage.getItem('mp-volume');
  return saved !== null ? parseFloat(saved) : 0.1;
};
const isMuted = () => localStorage.getItem('mp-muted') === '1';

const play = (presetName, overrides) => {
  if (isMuted()) return;
  const preset = PRESETS[presetName];
  if (!preset) return;

  const bus = window.mpAudioBus;
  if (!bus) return;
  const ctx = bus.getContext();
  const volume = getVolume();

  /* Use cached buffer for instant playback when available */
  if (!overrides && bufferCache[presetName]) {
    const src = ctx.createBufferSource();
    src.buffer = bufferCache[presetName];
    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(ctx.destination);
    /* Also route through output jack for patch cable routing */
    if (spOutputNode) gain.connect(spOutputNode);
    src.start();
    return;
  }

  /* Real-time synthesis fallback */
  const effective = overrides ? { ...preset, ...overrides } : preset;
  buildGraph(ctx, effective, volume);
};

/* ══════════════════════════════════════════════════════════════════════
 *  Render + WAV export API
 * ══════════════════════════════════════════════════════════════════════ */
const encodeWAV = (buffer) => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const pcm = buffer.getChannelData(0);
  const dataLength = pcm.length * 2;
  const headerLength = 44;
  const wav = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(wav);

  /* RIFF header */
  const writeStr = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLength, true);

  /* PCM samples */
  let offset = 44;
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([wav], { type: 'audio/wav' });
};

const render = async (presetName, overrides) => {
  const buffer = await renderOffline(presetName, overrides);
  if (!buffer) return null;
  return { buffer, wav: encodeWAV(buffer), pcm: buffer.getChannelData(0) };
};

/* ══════════════════════════════════════════════════════════════════════
 *  Sound Producer app window UI
 * ══════════════════════════════════════════════════════════════════════ */
let spBuilt = false;
let spCanvas = null;
let spCanvasCtx = null;
let spOutputNode = null;
const outputJackId = 'sp-out';

const drawWaveform = (pcmData) => {
  if (!spCanvas || !spCanvasCtx) return;
  const w = spCanvas.width;
  const h = spCanvas.height;
  const ctx = spCanvasCtx;

  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(0, 0, w, h);

  /* Grid lines */
  ctx.strokeStyle = '#2a2a4a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
  for (let x = 0; x < w; x += w / 8) {
    ctx.moveTo(x, 0); ctx.lineTo(x, h);
  }
  ctx.stroke();

  if (!pcmData || pcmData.length === 0) return;

  /* Waveform */
  ctx.strokeStyle = '#66bbff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const step = pcmData.length / w;
  for (let x = 0; x < w; x++) {
    const i = Math.floor(x * step);
    const y = (1 - pcmData[i]) * h / 2;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
};

const buildUI = () => {
  if (spBuilt) return;
  spBuilt = true;

  const body = document.getElementById('soundproducerBody');
  if (!body) return;

  body.innerHTML = '';

  /* Container */
  const wrap = document.createElement('div');
  wrap.style.cssText = 'padding:8px;display:flex;flex-direction:column;gap:8px;min-width:320px;';

  /* Row 1: Preset selector + buttons */
  const row1 = document.createElement('div');
  row1.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;';

  const label = document.createElement('label');
  label.textContent = t('sp.preset') + ':';
  label.style.cssText = 'font-weight:bold;white-space:nowrap;';
  row1.appendChild(label);

  const select = document.createElement('select');
  select.id = 'spPresetSelect';
  select.style.cssText = 'flex:1;min-width:100px;';
  for (const name of Object.keys(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    select.appendChild(opt);
  }
  row1.appendChild(select);

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'btn';
  playBtn.textContent = t('sp.play');
  playBtn.id = 'spPlayBtn';
  row1.appendChild(playBtn);

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'btn';
  exportBtn.textContent = t('sp.export');
  exportBtn.id = 'spExportBtn';
  row1.appendChild(exportBtn);

  wrap.appendChild(row1);

  /* Row 2: Sliders */
  const row2 = document.createElement('div');
  row2.style.cssText = 'display:grid;grid-template-columns:auto 1fr auto;gap:4px 8px;align-items:center;';

  const sliderDefs = [
    { id: 'spDuration', label: t('sp.duration'), min: 0.01, max: 3.0, step: 0.01, unit: 's' },
    { id: 'spGain', label: t('sp.gain'), min: 0, max: 1, step: 0.01, unit: '' },
    { id: 'spFreq', label: t('sp.freq'), min: 20, max: 4000, step: 1, unit: 'Hz' }
  ];

  for (const def of sliderDefs) {
    const lbl = document.createElement('span');
    lbl.textContent = def.label;
    lbl.style.cssText = 'font-size:11px;white-space:nowrap;';
    row2.appendChild(lbl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = def.id;
    slider.min = def.min;
    slider.max = def.max;
    slider.step = def.step;
    slider.style.cssText = 'width:100%;';
    row2.appendChild(slider);

    const val = document.createElement('span');
    val.id = def.id + 'Val';
    val.style.cssText = 'font-size:11px;min-width:50px;text-align:right;';
    row2.appendChild(val);

    slider.addEventListener('input', () => {
      val.textContent = slider.value + def.unit;
    });
  }

  wrap.appendChild(row2);

  /* Row 3: Waveform display */
  const canvasWrap = document.createElement('div');
  canvasWrap.style.cssText = 'border:2px inset;background:#1a1a2a;';
  spCanvas = document.createElement('canvas');
  spCanvas.width = 400;
  spCanvas.height = 100;
  spCanvas.style.cssText = 'width:100%;height:100px;display:block;';
  spCanvasCtx = spCanvas.getContext('2d');
  canvasWrap.appendChild(spCanvas);
  wrap.appendChild(canvasWrap);

  /* Row 4: Output jack */
  const jackRow = document.createElement('div');
  jackRow.style.cssText = 'display:flex;align-items:center;gap:8px;';
  const jackLabel = document.createElement('span');
  jackLabel.textContent = t('sp.output') + ':';
  jackLabel.style.cssText = 'font-size:11px;';
  jackRow.appendChild(jackLabel);

  const jackEl = document.createElement('div');
  jackEl.className = 'audio-jack output';
  jackEl.id = 'spOutputJack';
  jackEl.setAttribute('data-jack-id', outputJackId);
  jackRow.appendChild(jackEl);
  wrap.appendChild(jackRow);

  body.appendChild(wrap);

  /* Load initial preset into sliders */
  loadPresetToUI('click');

  /* Event handlers */
  select.addEventListener('change', () => loadPresetToUI(select.value));
  playBtn.addEventListener('click', playFromUI);
  exportBtn.addEventListener('click', exportFromUI);

  drawWaveform(null);
};

const loadPresetToUI = (name) => {
  const preset = PRESETS[name];
  if (!preset) return;

  const durSlider = document.getElementById('spDuration');
  const gainSlider = document.getElementById('spGain');
  const freqSlider = document.getElementById('spFreq');
  if (!durSlider) return;

  durSlider.value = preset.duration;
  document.getElementById('spDurationVal').textContent = preset.duration + 's';

  gainSlider.value = preset.masterGain;
  document.getElementById('spGainVal').textContent = preset.masterGain;

  /* Show first layer's frequency */
  const firstOsc = preset.layers.find(l => l.type === 'osc' || l.type === 'fm');
  const freq = firstOsc ? (firstOsc.freq || firstOsc.carrierFreq || 440) : 440;
  freqSlider.value = Math.min(4000, freq);
  document.getElementById('spFreqVal').textContent = Math.round(freq) + 'Hz';

  /* Draw cached waveform if available */
  if (bufferCache[name]) {
    drawWaveform(bufferCache[name].getChannelData(0));
  } else {
    drawWaveform(null);
    renderOffline(name).then(buf => {
      if (buf) drawWaveform(buf.getChannelData(0));
    });
  }
};

const getUIOverrides = () => {
  const durSlider = document.getElementById('spDuration');
  if (!durSlider) return null;

  const select = document.getElementById('spPresetSelect');
  const preset = PRESETS[select.value];
  if (!preset) return null;

  const dur = parseFloat(document.getElementById('spDuration').value);
  const gain = parseFloat(document.getElementById('spGain').value);
  const freq = parseFloat(document.getElementById('spFreq').value);

  const overrides = {};
  if (Math.abs(dur - preset.duration) > 0.001) overrides.duration = dur;
  if (Math.abs(gain - preset.masterGain) > 0.01) overrides.masterGain = gain;

  /* Apply freq override to first oscillator layer */
  const firstOscIdx = preset.layers.findIndex(l => l.type === 'osc' || l.type === 'fm');
  if (firstOscIdx >= 0) {
    const origFreq = preset.layers[firstOscIdx].freq || preset.layers[firstOscIdx].carrierFreq || 440;
    if (Math.abs(freq - origFreq) > 0.5) {
      overrides.layers = preset.layers.map((l, i) => {
        if (i !== firstOscIdx) return { ...l };
        if (l.type === 'fm') return { ...l, carrierFreq: freq };
        return { ...l, freq, freqEnd: freq };
      });
    }
  }

  return Object.keys(overrides).length > 0 ? overrides : null;
};

const playFromUI = async () => {
  const select = document.getElementById('spPresetSelect');
  const name = select.value;
  const overrides = getUIOverrides();
  const status = document.getElementById('spStatus');

  play(name, overrides);
  if (status) status.textContent = t('sp.playing') + ': ' + name;

  /* Render and draw waveform */
  const buf = await renderOffline(name, overrides);
  if (buf) drawWaveform(buf.getChannelData(0));
};

const exportFromUI = async () => {
  const select = document.getElementById('spPresetSelect');
  const name = select.value;
  const overrides = getUIOverrides();
  const status = document.getElementById('spStatus');

  if (status) status.textContent = t('sp.rendering') + '...';

  const result = await render(name, overrides);
  if (!result) {
    if (status) status.textContent = t('sp.error');
    return;
  }

  drawWaveform(result.pcm);

  const url = URL.createObjectURL(result.wav);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.wav`;
  a.click();
  URL.revokeObjectURL(url);

  if (status) status.textContent = t('sp.exported') + ': ' + name + '.wav';
};

/* ══════════════════════════════════════════════════════════════════════
 *  Open / Close
 * ══════════════════════════════════════════════════════════════════════ */
const openSoundProducer = () => {
  buildUI();
  openWindow('soundproducer');

  /* Register output jack with audio bus */
  const bus = window.mpAudioBus;
  if (bus && !spOutputNode) {
    const ctx = bus.getContext();
    spOutputNode = ctx.createGain();
    spOutputNode.gain.value = 1;
    const jackEl = document.getElementById('spOutputJack');
    bus.registerOutput(outputJackId, {
      node: spOutputNode,
      label: 'Sound Producer',
      element: jackEl
    });
  }
};

const closeSoundProducer = () => {
  window.mpTaskbar.closeWindow('soundproducer');
  const bus = window.mpAudioBus;
  if (bus) {
    bus.unregisterOutput(outputJackId);
    if (spOutputNode) {
      try { spOutputNode.disconnect(); } catch (e) { /* */ }
      spOutputNode = null;
    }
  }
};

/* ══════════════════════════════════════════════════════════════════════
 *  Language refresh
 * ══════════════════════════════════════════════════════════════════════ */
const soundProducerRefreshOnLangChange = () => {
  if (!spBuilt) return;
  const win = document.getElementById('soundproducer');
  if (!win || win.style.display === 'none') return;
  /* Rebuild UI for new language */
  spBuilt = false;
  buildUI();
};

/* ══════════════════════════════════════════════════════════════════════
 *  Registration + exports
 * ══════════════════════════════════════════════════════════════════════ */
mpRegisterActions({ openSoundProducer });
mpRegisterWindows({ soundproducer: 'Sound Producer' });
mpRegisterCloseHandlers({ soundproducer: closeSoundProducer });

window.openSoundProducer = openSoundProducer;
window.closeSoundProducer = closeSoundProducer;
window.soundProducerRefreshOnLangChange = soundProducerRefreshOnLangChange;

window.mpSoundProducer = {
  play,
  render,
  getPreset: (name) => PRESETS[name] ? { ...PRESETS[name] } : null,
  listPresets: () => Object.keys(PRESETS)
};

})();
