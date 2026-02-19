(function () {
  'use strict';

  const { openWindow } = window;
  const mpTaskbar = window.mpTaskbar;

  /* ══════════════════════════════════════════════════════════
   *  Tuning Fork
   * ══════════════════════════════════════════════════════════ */

  let tfCtx = null;
  let tfOsc = null;
  let tfGain = null;
  let tfEqNode = null;
  let tfBuilt = false;
  let tfPlaying = false;

  const TF_NOTES = [
    { name: 'C',  freq: 261.63 },
    { name: 'C#', freq: 277.18 },
    { name: 'D',  freq: 293.66 },
    { name: 'D#', freq: 311.13 },
    { name: 'E',  freq: 329.63 },
    { name: 'F',  freq: 349.23 },
    { name: 'F#', freq: 369.99 },
    { name: 'G',  freq: 392.00 },
    { name: 'G#', freq: 415.30 },
    { name: 'A',  freq: 440.00 },
    { name: 'A#', freq: 466.16 },
    { name: 'B',  freq: 493.88 }
  ];

  const tfGetFreq = () => {
    const sel = document.getElementById('tfNote');
    const centsEl = document.getElementById('tfCents');
    const octaveEl = document.getElementById('tfOctave');
    if (!sel) return 440;
    const baseFreq = parseFloat(sel.value);
    const cents = centsEl ? parseInt(centsEl.value, 10) || 0 : 0;
    const octave = octaveEl ? parseInt(octaveEl.value, 10) : 4;
    return baseFreq * Math.pow(2, octave - 4) * Math.pow(2, cents / 1200);
  };

  const tfUpdateDisplay = () => {
    const freqEl = document.getElementById('tfFreqDisplay');
    if (freqEl) freqEl.textContent = `${tfGetFreq().toFixed(2)} Hz`;
    const centsEl = document.getElementById('tfCents');
    const centsVal = document.getElementById('tfCentsVal');
    if (centsEl && centsVal) {
      const v = parseInt(centsEl.value, 10);
      centsVal.textContent = `${v >= 0 ? '+' : ''}${centsEl.value}\u00A2`;
    }
    if (tfPlaying && tfOsc) tfOsc.frequency.setValueAtTime(tfGetFreq(), tfCtx.currentTime);
  };

  const tfGetVolume = () => {
    const raw = parseFloat(localStorage.getItem('mp-volume') || '0.1');
    const muted = localStorage.getItem('mp-muted') === '1';
    return muted ? 0 : raw * 0.3;
  };

  const tfStrike = () => {
    if (tfPlaying) { tfStop(); return; }
    if (!tfCtx) tfCtx = new (window.AudioContext || window.webkitAudioContext)();
    const waveEl = document.getElementById('tfWave');
    const wave = waveEl ? waveEl.value : 'sine';
    tfOsc = tfCtx.createOscillator();
    tfOsc.type = wave;
    tfOsc.frequency.setValueAtTime(tfGetFreq(), tfCtx.currentTime);

    tfEqNode = tfCtx.createBiquadFilter();
    tfEqNode.type = 'peaking';
    tfEqNode.frequency.setValueAtTime(1000, tfCtx.currentTime);
    tfEqNode.Q.setValueAtTime(1.0, tfCtx.currentTime);
    const eqEl = document.getElementById('tfEq');
    tfEqNode.gain.setValueAtTime(eqEl ? parseFloat(eqEl.value) : 0, tfCtx.currentTime);

    tfGain = tfCtx.createGain();
    tfGain.gain.setValueAtTime(0, tfCtx.currentTime);
    tfGain.gain.linearRampToValueAtTime(tfGetVolume(), tfCtx.currentTime + 0.02);

    tfOsc.connect(tfEqNode);
    tfEqNode.connect(tfGain);
    tfGain.connect(tfCtx.destination);
    tfOsc.start();
    tfPlaying = true;

    const btn = document.getElementById('tfStrikeBtn');
    if (btn) { btn.textContent = 'Stop'; btn.classList.add('tf-active'); }
    const statusEl = document.getElementById('tfStatus');
    if (statusEl) statusEl.textContent = `Playing ${tfGetFreq().toFixed(2)} Hz`;
  };

  const tfStop = () => {
    if (tfOsc) {
      if (tfGain) tfGain.gain.linearRampToValueAtTime(0, tfCtx.currentTime + 0.05);
      setTimeout(() => {
        try { tfOsc.stop(); } catch (e) { /* already stopped */ }
        tfOsc = null;
        tfGain = null;
        tfEqNode = null;
      }, 80);
    }
    tfPlaying = false;
    const btn = document.getElementById('tfStrikeBtn');
    if (btn) { btn.textContent = 'Strike'; btn.classList.remove('tf-active'); }
    const statusEl = document.getElementById('tfStatus');
    if (statusEl) statusEl.textContent = 'Ready';
  };

  const tfNoteChange = () => { tfUpdateDisplay(); };
  const tfCentsChange = () => { tfUpdateDisplay(); };

  const tfWaveChange = () => {
    if (tfPlaying && tfOsc) {
      const waveEl = document.getElementById('tfWave');
      if (waveEl) tfOsc.type = waveEl.value;
    }
  };

  const tfEqChange = () => {
    const eqEl = document.getElementById('tfEq');
    const eqVal = document.getElementById('tfEqVal');
    if (eqEl && eqVal) {
      const v = parseInt(eqEl.value, 10);
      eqVal.textContent = `${v >= 0 ? '+' : ''}${eqEl.value} dB`;
    }
    if (tfPlaying && tfEqNode && eqEl) {
      tfEqNode.gain.setValueAtTime(parseFloat(eqEl.value), tfCtx.currentTime);
    }
  };

  const tfBuildUI = () => {
    const body = document.getElementById('tuningforkBody');
    if (!body || tfBuilt) return;

    // Note selector row
    const noteRow = document.createElement('div');
    noteRow.className = 'tf-row';
    const noteLbl = document.createElement('label');
    noteLbl.textContent = 'Note';
    noteLbl.className = 'tf-label';
    const noteSel = document.createElement('select');
    noteSel.id = 'tfNote';
    noteSel.className = 'tf-select';
    noteSel.onchange = tfNoteChange;
    for (const note of TF_NOTES) {
      const opt = document.createElement('option');
      opt.value = note.freq;
      opt.textContent = note.name;
      if (note.name === 'A') opt.selected = true;
      noteSel.appendChild(opt);
    }
    noteRow.appendChild(noteLbl);
    noteRow.appendChild(noteSel);

    // Octave selector
    const octLbl = document.createElement('label');
    octLbl.textContent = 'Oct';
    octLbl.className = 'tf-label tf-label-sm';
    const octSel = document.createElement('select');
    octSel.id = 'tfOctave';
    octSel.className = 'tf-select tf-select-sm';
    octSel.onchange = tfNoteChange;
    for (let o = 2; o <= 7; o++) {
      const oopt = document.createElement('option');
      oopt.value = o;
      oopt.textContent = o;
      if (o === 4) oopt.selected = true;
      octSel.appendChild(oopt);
    }
    noteRow.appendChild(octLbl);
    noteRow.appendChild(octSel);
    body.appendChild(noteRow);

    // Frequency display
    const freqDisp = document.createElement('div');
    freqDisp.className = 'tf-freq-display';
    freqDisp.id = 'tfFreqDisplay';
    freqDisp.textContent = '440.00 Hz';
    body.appendChild(freqDisp);

    // Fine-tune cents slider
    const centsRow = document.createElement('div');
    centsRow.className = 'tf-row';
    const centsLbl = document.createElement('label');
    centsLbl.textContent = 'Fine';
    centsLbl.className = 'tf-label';
    const centsSlider = document.createElement('input');
    centsSlider.type = 'range';
    centsSlider.id = 'tfCents';
    centsSlider.className = 'tf-slider';
    centsSlider.min = '-50';
    centsSlider.max = '50';
    centsSlider.value = '0';
    centsSlider.oninput = tfCentsChange;
    const centsValSpan = document.createElement('span');
    centsValSpan.className = 'tf-val';
    centsValSpan.id = 'tfCentsVal';
    centsValSpan.textContent = '+0\u00A2';
    centsRow.appendChild(centsLbl);
    centsRow.appendChild(centsSlider);
    centsRow.appendChild(centsValSpan);
    body.appendChild(centsRow);

    // Waveform selector
    const waveRow = document.createElement('div');
    waveRow.className = 'tf-row';
    const waveLbl = document.createElement('label');
    waveLbl.textContent = 'Wave';
    waveLbl.className = 'tf-label';
    const waveSel = document.createElement('select');
    waveSel.id = 'tfWave';
    waveSel.className = 'tf-select';
    waveSel.onchange = tfWaveChange;
    const waves = [
      { val: 'sine', lbl: 'Sine' },
      { val: 'triangle', lbl: 'Triangle' },
      { val: 'square', lbl: 'Square' },
      { val: 'sawtooth', lbl: 'Sawtooth' }
    ];
    for (const w of waves) {
      const wopt = document.createElement('option');
      wopt.value = w.val;
      wopt.textContent = w.lbl;
      waveSel.appendChild(wopt);
    }
    waveRow.appendChild(waveLbl);
    waveRow.appendChild(waveSel);
    body.appendChild(waveRow);

    // EQ slider (mid-band boost/cut)
    const eqRow = document.createElement('div');
    eqRow.className = 'tf-row';
    const eqLbl = document.createElement('label');
    eqLbl.textContent = 'EQ';
    eqLbl.className = 'tf-label';
    const eqSlider = document.createElement('input');
    eqSlider.type = 'range';
    eqSlider.id = 'tfEq';
    eqSlider.className = 'tf-slider';
    eqSlider.min = '-12';
    eqSlider.max = '12';
    eqSlider.value = '0';
    eqSlider.oninput = tfEqChange;
    const eqValSpan = document.createElement('span');
    eqValSpan.className = 'tf-val';
    eqValSpan.id = 'tfEqVal';
    eqValSpan.textContent = '+0 dB';
    eqRow.appendChild(eqLbl);
    eqRow.appendChild(eqSlider);
    eqRow.appendChild(eqValSpan);
    body.appendChild(eqRow);

    // Strike button
    const strikeBtn = document.createElement('button');
    strikeBtn.type = 'button';
    strikeBtn.id = 'tfStrikeBtn';
    strikeBtn.className = 'tf-strike-btn';
    strikeBtn.textContent = 'Strike';
    strikeBtn.onclick = tfStrike;
    body.appendChild(strikeBtn);

    tfBuilt = true;
  };

  const openTuningFork = () => {
    if (!tfBuilt) tfBuildUI();
    openWindow('tuningfork');
  };

  const closeTuningFork = () => {
    tfStop();
    if (tfCtx) {
      tfCtx.close();
      tfCtx = null;
    }
    tfBuilt = false;
    mpTaskbar.closeWindow('tuningfork');
  };

  // Volume integration for tuning fork — chain onto mpAudioUpdateVolume
  const tfOrigAudioUpdate = window.mpAudioUpdateVolume;
  window.mpAudioUpdateVolume = () => {
    if (tfOrigAudioUpdate) tfOrigAudioUpdate();
    if (tfPlaying && tfGain && tfCtx) {
      tfGain.gain.setValueAtTime(tfGetVolume(), tfCtx.currentTime);
    }
  };

  /* ══════════════════════════════════════════════════════════
   *  White Noise Mixer
   * ══════════════════════════════════════════════════════════ */

  let nmCtx = null;
  let nmMasterGain = null;
  let nmAnalyser = null;
  let nmLimiter = null;
  let nmChannels = [];
  let nmRafId = null;
  let nmScopeEnabled = true;
  let nmBuilt = false;
  let nmRunning = false;
  let nmScopeCanvas = null;
  let nmScopeCtx = null;
  let nmTimeDomain = null;

  const NM_CHANNEL_DEFS = [
    { name: 'White',  type: 'white'  },
    { name: 'Pink',   type: 'pink'   },
    { name: 'Brown',  type: 'brown'  },
    { name: 'Blue',   type: 'blue'   },
    { name: 'Violet', type: 'violet' },
    { name: 'Rain',   type: 'rain'   }
  ];

  const NM_PRESETS = {
    custom:        null,
    'deep-sleep':  [0, 0.1, 0.8, 0, 0, 0.3],
    focus:         [0.3, 0.5, 0.2, 0.1, 0, 0.15],
    rain:          [0, 0, 0.1, 0, 0, 0.9],
    fan:           [0.15, 0.6, 0.4, 0, 0, 0],
    bright:        [0.2, 0, 0, 0.5, 0.4, 0],
    ocean:         [0.05, 0.2, 0.7, 0, 0, 0.4]
  };

  const nmNormalize = (data) => {
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > max) max = abs;
    }
    if (max > 0) {
      const scale = 0.8 / max;
      for (let j = 0; j < data.length; j++) {
        data[j] *= scale;
      }
    }
  };

  const nmGenerateBuffer = (type, sampleRate) => {
    const length = sampleRate * 10;
    const buffer = nmCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else if (type === 'brown') {
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        lastOut = (lastOut + (0.02 * w)) / 1.02;
        data[i] = lastOut * 3.5;
      }
    } else if (type === 'blue') {
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const sample = Math.random() * 2 - 1;
        data[i] = sample - prev;
        prev = sample;
      }
      nmNormalize(data);
    } else if (type === 'violet') {
      let prev1 = 0, prev2 = 0;
      for (let i = 0; i < length; i++) {
        const sample = Math.random() * 2 - 1;
        const diff1 = sample - prev1;
        data[i] = diff1 - prev2;
        prev2 = prev1;
        prev1 = sample;
      }
      nmNormalize(data);
    } else if (type === 'rain') {
      let rb0 = 0, rb1 = 0, rb2 = 0, rb3 = 0, rb4 = 0, rb5 = 0, rb6 = 0;
      for (let i = 0; i < length; i++) {
        const rw = Math.random() * 2 - 1;
        rb0 = 0.99886 * rb0 + rw * 0.0555179;
        rb1 = 0.99332 * rb1 + rw * 0.0750759;
        rb2 = 0.96900 * rb2 + rw * 0.1538520;
        rb3 = 0.86650 * rb3 + rw * 0.3104856;
        rb4 = 0.55000 * rb4 + rw * 0.5329522;
        rb5 = -0.7616 * rb5 - rw * 0.0168980;
        let pink = (rb0 + rb1 + rb2 + rb3 + rb4 + rb5 + rb6 + rw * 0.5362) * 0.11;
        rb6 = rw * 0.115926;
        if (Math.random() < 0.002) {
          pink += (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? 1 : -1);
        }
        data[i] = pink;
      }
    }
    return buffer;
  };

  const nmSyncVolume = () => {
    if (!nmMasterGain) return;
    const saved = localStorage.getItem('mp-volume');
    const vol = saved !== null ? parseFloat(saved) : 0.1;
    const muted = localStorage.getItem('mp-muted') === '1';
    nmMasterGain.gain.value = muted ? 0 : vol;
    const masterFader = document.getElementById('nmMasterFader');
    if (masterFader) masterFader.value = vol * 100;
  };

  const nmInitAudio = () => {
    nmCtx = new (window.AudioContext || window.webkitAudioContext)();
    nmMasterGain = nmCtx.createGain();
    nmAnalyser = nmCtx.createAnalyser();
    nmAnalyser.fftSize = 2048;
    // Safety limiter -- prevents clipping no matter how many channels are loud
    nmLimiter = nmCtx.createDynamicsCompressor();
    nmLimiter.threshold.value = -6;   // start compressing at -6 dB
    nmLimiter.knee.value = 3;         // soft knee
    nmLimiter.ratio.value = 20;       // near-brickwall
    nmLimiter.attack.value = 0.002;   // fast attack catches transients
    nmLimiter.release.value = 0.1;
    nmMasterGain.connect(nmAnalyser);
    nmAnalyser.connect(nmLimiter);
    nmLimiter.connect(nmCtx.destination);
    nmTimeDomain = new Uint8Array(nmAnalyser.fftSize);
    nmSyncVolume();
  };

  const nmStartChannels = () => {
    const sr = nmCtx.sampleRate;
    for (let i = 0; i < NM_CHANNEL_DEFS.length; i++) {
      const ch = nmChannels[i];
      const buf = nmGenerateBuffer(NM_CHANNEL_DEFS[i].type, sr);
      const src = nmCtx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = nmCtx.createBiquadFilter();
      filter.type = ch.filterType || 'lowpass';
      filter.frequency.value = ch.filterFreq || 20000;
      const gain = nmCtx.createGain();
      gain.gain.value = ch.muted ? 0 : ch.volume;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(nmMasterGain);
      src.start();
      ch.source = src;
      ch.filter = filter;
      ch.gain = gain;
    }
  };

  const nmStopChannels = () => {
    for (let i = 0; i < nmChannels.length; i++) {
      const ch = nmChannels[i];
      if (ch.source) {
        try { ch.source.stop(); } catch (e) { /* already stopped */ }
        ch.source.disconnect();
        ch.source = null;
      }
      if (ch.filter) { ch.filter.disconnect(); ch.filter = null; }
      if (ch.gain) { ch.gain.disconnect(); ch.gain = null; }
    }
  };

  const nmDrawScope = () => {
    if (!nmRunning || !nmScopeEnabled) return;
    nmAnalyser.getByteTimeDomainData(nmTimeDomain);
    const canvas = nmScopeCanvas;
    const ctx = nmScopeCtx;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    // grid
    ctx.strokeStyle = '#1a2a1a';
    ctx.lineWidth = 0.5;
    for (let gy = 0; gy < h; gy += 20) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }
    for (let gx = 0; gx < w; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    // waveform
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const sliceWidth = w / nmTimeDomain.length;
    let x = 0;
    for (let i = 0; i < nmTimeDomain.length; i++) {
      const v = nmTimeDomain[i] / 128.0;
      const y = v * h / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    nmRafId = requestAnimationFrame(nmDrawScope);
  };

  const nmTogglePower = () => {
    if (nmRunning) {
      nmStopChannels();
      nmRunning = false;
      if (nmRafId) { cancelAnimationFrame(nmRafId); nmRafId = null; }
      const powerBtn = document.getElementById('nmPowerBtn');
      if (powerBtn) { powerBtn.classList.remove('active'); powerBtn.textContent = 'Start'; }
      document.getElementById('nmStatus').textContent = 'Stopped';
    } else {
      if (!nmCtx) nmInitAudio();
      if (nmCtx.state === 'suspended') nmCtx.resume();
      // Fade in over 0.3s to prevent pop/blast
      const targetVol = nmMasterGain.gain.value;
      nmMasterGain.gain.setValueAtTime(0, nmCtx.currentTime);
      nmMasterGain.gain.linearRampToValueAtTime(targetVol, nmCtx.currentTime + 0.3);
      nmStartChannels();
      nmRunning = true;
      const powerBtn = document.getElementById('nmPowerBtn');
      if (powerBtn) { powerBtn.classList.add('active'); powerBtn.textContent = 'Stop'; }
      document.getElementById('nmStatus').textContent = 'Playing';
      if (nmScopeEnabled) nmDrawScope();
    }
  };

  const nmToggleScope = () => {
    nmScopeEnabled = !nmScopeEnabled;
    const btn = document.getElementById('nmScopeBtn');
    if (btn) btn.classList.toggle('active', nmScopeEnabled);
    if (!nmScopeEnabled) {
      if (nmRafId) { cancelAnimationFrame(nmRafId); nmRafId = null; }
      if (nmScopeCanvas && nmScopeCtx) {
        nmScopeCtx.clearRect(0, 0, nmScopeCanvas.width, nmScopeCanvas.height);
      }
    }
    if (nmScopeEnabled && nmRunning && !nmRafId) nmDrawScope();
  };

  const nmUpdateChannelGain = (idx) => {
    const ch = nmChannels[idx];
    if (!ch.gain) return;
    const anySolo = nmChannels.some((c) => c.solo);
    if (anySolo) {
      ch.gain.gain.value = ch.solo ? ch.volume : 0;
    } else {
      ch.gain.gain.value = ch.muted ? 0 : ch.volume;
    }
  };

  const nmRefreshAllGains = () => {
    for (let i = 0; i < nmChannels.length; i++) nmUpdateChannelGain(i);
  };

  const nmFreqToLog = (val) => Math.round(20 * Math.pow(1000, val / 100));
  const nmLogToSlider = (freq) => Math.round(100 * Math.log(freq / 20) / Math.log(1000));
  const nmFormatFreq = (hz) => hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${hz}`;

  const nmApplyPreset = (key) => {
    const vols = NM_PRESETS[key];
    if (!vols) return;
    for (let i = 0; i < vols.length && i < nmChannels.length; i++) {
      nmChannels[i].volume = vols[i];
      if (nmChannels[i].faderEl) nmChannels[i].faderEl.value = vols[i] * 100;
      if (nmChannels[i].gain) nmChannels[i].gain.gain.value = vols[i];
    }
    nmRefreshAllGains();
  };

  const nmBuildChannelStrip = (ch, idx, parent) => {
    const strip = document.createElement('div');
    strip.className = `nm-channel${idx === -1 ? ' nm-master' : ''}`;

    const label = document.createElement('div');
    label.className = 'nm-channel-label';
    label.textContent = idx === -1 ? 'Master' : ch.name;
    strip.appendChild(label);

    const faderWrap = document.createElement('div');
    faderWrap.className = 'nm-fader-wrap';
    const fader = document.createElement('input');
    fader.type = 'range';
    fader.className = 'nm-fader';
    fader.min = '0';
    fader.max = '100';
    fader.value = idx === -1
      ? String(Math.round((parseFloat(localStorage.getItem('mp-volume')) || 0.1) * 100))
      : String(Math.round(ch.volume * 100));

    if (idx === -1) {
      fader.id = 'nmMasterFader';
      fader.oninput = () => {
        const v = parseInt(fader.value, 10) / 100;
        localStorage.setItem('mp-volume', String(v));
        const tbSlider = document.querySelector('.volume-slider');
        if (tbSlider) tbSlider.value = fader.value;
        if (window.mpAudioUpdateVolume) window.mpAudioUpdateVolume();
      };
    } else {
      ch.faderEl = fader;
      fader.oninput = ((ci) => () => {
        nmChannels[ci].volume = parseInt(fader.value, 10) / 100;
        nmUpdateChannelGain(ci);
        const presetSel = document.getElementById('nmPresetSelect');
        if (presetSel) presetSel.value = 'custom';
      })(idx);
    }
    faderWrap.appendChild(fader);
    strip.appendChild(faderWrap);

    if (idx >= 0) {
      const filterSel = document.createElement('select');
      filterSel.className = 'nm-filter-select';
      const opts = ['lowpass', 'highpass', 'bandpass'];
      const optLabels = ['LP', 'HP', 'BP'];
      for (let fi = 0; fi < opts.length; fi++) {
        const opt = document.createElement('option');
        opt.value = opts[fi];
        opt.textContent = optLabels[fi];
        filterSel.appendChild(opt);
      }
      filterSel.onchange = ((ci) => () => {
        nmChannels[ci].filterType = filterSel.value;
        if (nmChannels[ci].filter) nmChannels[ci].filter.type = filterSel.value;
      })(idx);
      strip.appendChild(filterSel);

      const freqSlider = document.createElement('input');
      freqSlider.type = 'range';
      freqSlider.className = 'nm-freq-slider';
      freqSlider.min = '0';
      freqSlider.max = '100';
      freqSlider.value = '100';
      const freqLabel = document.createElement('div');
      freqLabel.className = 'nm-freq-label';
      freqLabel.textContent = '20k';
      freqSlider.oninput = ((ci, fl) => () => {
        const hz = nmFreqToLog(parseInt(freqSlider.value, 10));
        nmChannels[ci].filterFreq = hz;
        if (nmChannels[ci].filter) nmChannels[ci].filter.frequency.value = hz;
        fl.textContent = nmFormatFreq(hz);
      })(idx, freqLabel);
      strip.appendChild(freqSlider);
      strip.appendChild(freqLabel);

      const btnRow = document.createElement('div');
      btnRow.className = 'nm-btn-row';
      const muteBtn = document.createElement('button');
      muteBtn.type = 'button';
      muteBtn.className = 'nm-mute-btn';
      muteBtn.textContent = 'M';
      muteBtn.onclick = ((ci) => () => {
        nmChannels[ci].muted = !nmChannels[ci].muted;
        muteBtn.classList.toggle('active', nmChannels[ci].muted);
        nmUpdateChannelGain(ci);
      })(idx);

      const soloBtn = document.createElement('button');
      soloBtn.type = 'button';
      soloBtn.className = 'nm-solo-btn';
      soloBtn.textContent = 'S';
      soloBtn.onclick = ((ci) => () => {
        nmChannels[ci].solo = !nmChannels[ci].solo;
        soloBtn.classList.toggle('active', nmChannels[ci].solo);
        nmRefreshAllGains();
      })(idx);

      btnRow.appendChild(muteBtn);
      btnRow.appendChild(soloBtn);
      strip.appendChild(btnRow);
    }

    parent.appendChild(strip);
  };

  const nmBuildUI = () => {
    const body = document.getElementById('noisemixerBody');
    body.innerHTML = '';

    nmChannels = [];
    for (let i = 0; i < NM_CHANNEL_DEFS.length; i++) {
      nmChannels.push({
        name: NM_CHANNEL_DEFS[i].name,
        type: NM_CHANNEL_DEFS[i].type,
        volume: 0.3,
        muted: false,
        solo: false,
        filterType: 'lowpass',
        filterFreq: 20000,
        source: null,
        filter: null,
        gain: null,
        faderEl: null
      });
    }

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'nm-toolbar';
    const presetLabel = document.createElement('span');
    presetLabel.textContent = 'Preset:';
    presetLabel.style.fontSize = '11px';
    toolbar.appendChild(presetLabel);

    const presetSel = document.createElement('select');
    presetSel.className = 'nm-preset-select';
    presetSel.id = 'nmPresetSelect';
    const presetKeys = Object.keys(NM_PRESETS);
    for (const key of presetKeys) {
      const popt = document.createElement('option');
      popt.value = key;
      popt.textContent = key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      presetSel.appendChild(popt);
    }
    presetSel.onchange = () => {
      if (presetSel.value !== 'custom') nmApplyPreset(presetSel.value);
    };
    toolbar.appendChild(presetSel);

    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    toolbar.appendChild(spacer);

    const powerBtn = document.createElement('button');
    powerBtn.type = 'button';
    powerBtn.className = 'nm-power-btn';
    powerBtn.id = 'nmPowerBtn';
    powerBtn.textContent = 'Start';
    powerBtn.onclick = nmTogglePower;
    toolbar.appendChild(powerBtn);
    body.appendChild(toolbar);

    // Oscilloscope
    const scopeWrap = document.createElement('div');
    scopeWrap.className = 'nm-scope-wrap';
    scopeWrap.id = 'nmScopeWrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'nm-scope-canvas';
    canvas.width = 340;
    canvas.height = 50;
    nmScopeCanvas = canvas;
    nmScopeCtx = canvas.getContext('2d');
    scopeWrap.appendChild(canvas);

    const scopeBtn = document.createElement('button');
    scopeBtn.type = 'button';
    scopeBtn.className = 'nm-scope-toggle active';
    scopeBtn.id = 'nmScopeBtn';
    scopeBtn.textContent = 'SCOPE';
    scopeBtn.onclick = nmToggleScope;
    scopeWrap.appendChild(scopeBtn);
    body.appendChild(scopeWrap);

    // Mixer area
    const mixer = document.createElement('div');
    mixer.className = 'nm-mixer';
    for (let ci = 0; ci < nmChannels.length; ci++) {
      nmBuildChannelStrip(nmChannels[ci], ci, mixer);
    }
    nmBuildChannelStrip(null, -1, mixer);
    body.appendChild(mixer);

    // Auto-size canvas
    const ro = new ResizeObserver(() => {
      if (nmScopeCanvas && scopeWrap.offsetWidth > 0) {
        nmScopeCanvas.width = scopeWrap.clientWidth - 2;
      }
    });
    ro.observe(scopeWrap);

    nmBuilt = true;
  };

  const openNoiseMixer = () => {
    if (!nmBuilt) nmBuildUI();
    openWindow('noisemixer');
  };

  const closeNoiseMixer = () => {
    if (nmRunning) {
      nmStopChannels();
      nmRunning = false;
    }
    if (nmRafId) { cancelAnimationFrame(nmRafId); nmRafId = null; }
    if (nmCtx) {
      nmCtx.close();
      nmCtx = null;
      nmMasterGain = null;
      nmAnalyser = null;
      nmLimiter = null;
      nmTimeDomain = null;
    }
    nmScopeCanvas = null;
    nmScopeCtx = null;
    nmBuilt = false;
    const powerBtn = document.getElementById('nmPowerBtn');
    if (powerBtn) powerBtn.classList.remove('active');
    document.getElementById('nmStatus').textContent = 'Ready';
    mpTaskbar.closeWindow('noisemixer');
  };

  // Volume integration for noise mixer -- chain onto mpAudioUpdateVolume
  const nmOriginalAudioUpdateVolume = window.mpAudioUpdateVolume;
  window.mpAudioUpdateVolume = () => {
    if (nmOriginalAudioUpdateVolume) nmOriginalAudioUpdateVolume();
    nmSyncVolume();
  };

  /* ══════════════════════════════════════════════════════════
   *  Registrations
   * ══════════════════════════════════════════════════════════ */

  // Register actions
  if (window.ACTION_MAP) {
    window.ACTION_MAP.openNoiseMixer = openNoiseMixer;
    window.ACTION_MAP.openTuningFork = openTuningFork;
  }

  // Register window names
  if (window.WINDOW_NAMES) {
    window.WINDOW_NAMES.noisemixer = 'White Noise Mixer';
    window.WINDOW_NAMES.tuningfork = 'Tuning Fork';
  }

  // Register close handlers
  if (window.CLOSE_MAP) {
    window.CLOSE_MAP.noisemixer = closeNoiseMixer;
    window.CLOSE_MAP.tuningfork = closeTuningFork;
  }

  // Export globals for inline onclick handlers
  window.openNoiseMixer = openNoiseMixer;
  window.closeNoiseMixer = closeNoiseMixer;
  window.openTuningFork = openTuningFork;
  window.closeTuningFork = closeTuningFork;
  window.tfStrike = tfStrike;
  window.tfStop = tfStop;
  window.tfNoteChange = tfNoteChange;
  window.tfCentsChange = tfCentsChange;
  window.tfWaveChange = tfWaveChange;
  window.tfEqChange = tfEqChange;
})();
