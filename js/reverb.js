/* Reverb — Effect module with programmatic impulse responses */
(function () {
  'use strict';

  const { openWindow, t } = window;
  const mpTaskbar = window.mpTaskbar;

  let rvCtx = null;
  let rvInputGain = null;
  let rvDryGain = null;
  let rvWetGain = null;
  let rvConvolver = null;
  let rvOutputGain = null;
  let rvAnalyser = null;
  let rvBuilt = false;
  let rvRafId = null;
  let rvScopeCanvas = null;
  let rvScopeCtx = null;
  let rvTimeDomain = null;

  const inputJackId = 'rv-in';
  const outputJackId = 'rv-out';
  let inputJackEl = null;
  let outputJackEl = null;

  /* ── Presets ── */
  const RV_PRESETS = [
    { key: 'smallRoom',  name: 'Small Room',  decay: 0.4, preDelay: 0.005, lpFreq: 8000  },
    { key: 'mediumRoom', name: 'Medium Room', decay: 1.2, preDelay: 0.010, lpFreq: 6000  },
    { key: 'largeHall',  name: 'Large Hall',  decay: 3.5, preDelay: 0.025, lpFreq: 4000  },
    { key: 'plate',      name: 'Plate',       decay: 2.0, preDelay: 0.000, lpFreq: 12000 },
    { key: 'bathroom',   name: 'Bathroom',    decay: 0.8, preDelay: 0.002, lpFreq: 10000 },
    { key: 'cathedral',  name: 'Cathedral',   decay: 6.0, preDelay: 0.040, lpFreq: 3000  }
  ];

  let currentPreset = 0;
  let currentMix = 0.5;
  let currentDecay = null;
  let currentTone = null;

  /* ── IR Generation ── */
  const generateIR = (preset) => {
    const sampleRate = rvCtx.sampleRate;
    const decay = currentDecay ?? preset.decay;
    const lpFreq = currentTone ?? preset.lpFreq;
    const preDelay = preset.preDelay;
    const length = Math.ceil(sampleRate * (decay + 0.1));
    const buffer = rvCtx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      const preDelaySamples = Math.floor(preDelay * sampleRate);

      // Early reflections (first 80ms)
      const earlyEnd = Math.min(Math.floor(0.08 * sampleRate), length);
      const numReflections = 8;
      for (let r = 0; r < numReflections; r++) {
        const tapTime = preDelaySamples + Math.floor((r + 1) * (earlyEnd - preDelaySamples) / numReflections);
        if (tapTime < length) {
          const amp = 0.7 * Math.pow(0.7, r);
          // Slightly different for L/R for spatial spread
          const pan = ch === 0 ? (0.5 + Math.sin(r * 2.3) * 0.5) : (0.5 + Math.cos(r * 2.3) * 0.5);
          data[tapTime] += amp * pan * (Math.random() > 0.5 ? 1 : -1);
        }
      }

      // Late diffuse tail: exponentially decaying filtered noise
      const tailStart = earlyEnd;
      for (let i = tailStart; i < length; i++) {
        const t = (i - preDelaySamples) / sampleRate;
        if (t < 0) continue;
        // Exponential decay with frequency-dependent damping
        const envelope = Math.exp(-3.0 * t / decay);
        // HF damping increases over time
        const hfDamp = 1 - 0.5 * (t / decay);
        const noise = (Math.random() * 2 - 1) * hfDamp;
        data[i] += noise * envelope * 0.5;
      }

      // Simple LP filter pass (single-pole)
      const rc = 1.0 / (2.0 * Math.PI * lpFreq);
      const dt = 1.0 / sampleRate;
      const alpha = dt / (rc + dt);
      let prev = 0;
      for (let i = 0; i < length; i++) {
        data[i] = prev + alpha * (data[i] - prev);
        prev = data[i];
      }

      // HP filter at 80Hz to remove DC/rumble
      const rcHP = 1.0 / (2.0 * Math.PI * 80);
      const alphaHP = rcHP / (rcHP + dt);
      let prevIn = 0;
      let prevOut = 0;
      for (let i = 0; i < length; i++) {
        const out = alphaHP * (prevOut + data[i] - prevIn);
        prevIn = data[i];
        prevOut = out;
        data[i] = out;
      }

      // Normalize
      let max = 0;
      for (let i = 0; i < length; i++) {
        const abs = Math.abs(data[i]);
        if (abs > max) max = abs;
      }
      if (max > 0) {
        const scale = 0.8 / max;
        for (let i = 0; i < length; i++) data[i] *= scale;
      }
    }

    return buffer;
  };

  /* ── Audio Graph Setup ── */
  const rvInitAudio = () => {
    rvCtx = window.mpAudioBus.getContext();

    rvInputGain = rvCtx.createGain();
    rvInputGain.gain.value = 1;

    rvDryGain = rvCtx.createGain();
    rvDryGain.gain.value = 1 - currentMix;

    rvWetGain = rvCtx.createGain();
    rvWetGain.gain.value = currentMix;

    rvConvolver = rvCtx.createConvolver();
    rvConvolver.buffer = generateIR(RV_PRESETS[currentPreset]);

    rvOutputGain = rvCtx.createGain();
    rvOutputGain.gain.value = 1;

    rvAnalyser = rvCtx.createAnalyser();
    rvAnalyser.fftSize = 2048;
    rvTimeDomain = new Uint8Array(rvAnalyser.fftSize);

    // Routing:
    // input → dry → output
    // input → convolver → wet → output
    // output → analyser → destination
    rvInputGain.connect(rvDryGain);
    rvInputGain.connect(rvConvolver);
    rvConvolver.connect(rvWetGain);
    rvDryGain.connect(rvOutputGain);
    rvWetGain.connect(rvOutputGain);
    rvOutputGain.connect(rvAnalyser);
    rvAnalyser.connect(rvCtx.destination);
  };

  const rvUpdateIR = () => {
    if (!rvConvolver || !rvCtx) return;
    rvConvolver.buffer = generateIR(RV_PRESETS[currentPreset]);
  };

  /* ── Scope ── */
  const rvDrawScope = () => {
    if (!rvAnalyser || !rvScopeCanvas) return;
    rvAnalyser.getByteTimeDomainData(rvTimeDomain);
    const canvas = rvScopeCanvas;
    const ctx = rvScopeCtx;
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#1a2a1a';
    ctx.lineWidth = 0.5;
    for (let gy = 0; gy < h; gy += 20) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }
    for (let gx = 0; gx < w; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }
    ctx.strokeStyle = '#8888ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const sliceWidth = w / rvTimeDomain.length;
    let x = 0;
    for (let i = 0; i < rvTimeDomain.length; i++) {
      const v = rvTimeDomain[i] / 128.0;
      const y = v * h / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    rvRafId = requestAnimationFrame(rvDrawScope);
  };

  /* ── UI ── */
  const rvBuildUI = () => {
    const body = document.getElementById('reverbBody');
    body.innerHTML = '';

    // Preset dropdown
    const presetRow = document.createElement('div');
    presetRow.className = 'rv-row';
    const presetLbl = document.createElement('label');
    presetLbl.className = 'rv-label';
    presetLbl.textContent = 'Preset';
    const presetSel = document.createElement('select');
    presetSel.className = 'rv-select';
    for (let i = 0; i < RV_PRESETS.length; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = t(`reverb.preset.${RV_PRESETS[i].key}`) || RV_PRESETS[i].name;
      presetSel.appendChild(opt);
    }
    presetSel.value = currentPreset;
    presetSel.onchange = () => {
      currentPreset = parseInt(presetSel.value, 10);
      const p = RV_PRESETS[currentPreset];
      // Reset decay and tone to preset defaults
      currentDecay = p.decay;
      currentTone = p.lpFreq;
      if (decaySlider) {
        decaySlider.value = Math.round(p.decay * 10);
        decayVal.textContent = `${p.decay.toFixed(1)}s`;
      }
      if (toneSlider) {
        toneSlider.value = freqToSlider(p.lpFreq);
        toneVal.textContent = formatFreq(p.lpFreq);
      }
      rvUpdateIR();
    };
    presetRow.appendChild(presetLbl);
    presetRow.appendChild(presetSel);
    body.appendChild(presetRow);

    // Oscilloscope
    const scopeWrap = document.createElement('div');
    scopeWrap.className = 'rv-scope-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'rv-scope-canvas';
    canvas.width = 260;
    canvas.height = 50;
    rvScopeCanvas = canvas;
    rvScopeCtx = canvas.getContext('2d');
    scopeWrap.appendChild(canvas);
    body.appendChild(scopeWrap);

    const ro = new ResizeObserver(() => {
      if (rvScopeCanvas && scopeWrap.offsetWidth > 0) {
        rvScopeCanvas.width = scopeWrap.clientWidth - 2;
      }
    });
    ro.observe(scopeWrap);

    // Mix slider
    const mixRow = document.createElement('div');
    mixRow.className = 'rv-row';
    const mixLbl = document.createElement('label');
    mixLbl.className = 'rv-label';
    mixLbl.textContent = 'Mix';
    const mixSlider = document.createElement('input');
    mixSlider.type = 'range';
    mixSlider.className = 'rv-slider';
    mixSlider.min = '0';
    mixSlider.max = '100';
    mixSlider.value = String(Math.round(currentMix * 100));
    const mixVal = document.createElement('span');
    mixVal.className = 'rv-val';
    mixVal.textContent = `${Math.round(currentMix * 100)}%`;
    mixSlider.oninput = () => {
      currentMix = parseInt(mixSlider.value, 10) / 100;
      mixVal.textContent = `${Math.round(currentMix * 100)}%`;
      if (rvDryGain) rvDryGain.gain.setValueAtTime(1 - currentMix, rvCtx.currentTime);
      if (rvWetGain) rvWetGain.gain.setValueAtTime(currentMix, rvCtx.currentTime);
    };
    mixRow.appendChild(mixLbl);
    mixRow.appendChild(mixSlider);
    mixRow.appendChild(mixVal);
    body.appendChild(mixRow);

    // Decay slider
    const p = RV_PRESETS[currentPreset];
    if (currentDecay === null) currentDecay = p.decay;
    if (currentTone === null) currentTone = p.lpFreq;

    const decayRow = document.createElement('div');
    decayRow.className = 'rv-row';
    const decayLbl = document.createElement('label');
    decayLbl.className = 'rv-label';
    decayLbl.textContent = 'Decay';
    const decaySlider = document.createElement('input');
    decaySlider.type = 'range';
    decaySlider.className = 'rv-slider';
    decaySlider.min = '1';
    decaySlider.max = '80';
    decaySlider.value = String(Math.round(currentDecay * 10));
    const decayVal = document.createElement('span');
    decayVal.className = 'rv-val';
    decayVal.textContent = `${currentDecay.toFixed(1)}s`;
    decaySlider.oninput = () => {
      currentDecay = parseInt(decaySlider.value, 10) / 10;
      decayVal.textContent = `${currentDecay.toFixed(1)}s`;
      rvUpdateIR();
    };
    decayRow.appendChild(decayLbl);
    decayRow.appendChild(decaySlider);
    decayRow.appendChild(decayVal);
    body.appendChild(decayRow);

    // Tone slider (LP cutoff)
    const freqToSlider = (freq) => Math.round(100 * Math.log(freq / 200) / Math.log(100));
    const sliderToFreq = (val) => Math.round(200 * Math.pow(100, val / 100));
    const formatFreq = (hz) => hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${hz}`;

    const toneRow = document.createElement('div');
    toneRow.className = 'rv-row';
    const toneLbl = document.createElement('label');
    toneLbl.className = 'rv-label';
    toneLbl.textContent = 'Tone';
    const toneSlider = document.createElement('input');
    toneSlider.type = 'range';
    toneSlider.className = 'rv-slider';
    toneSlider.min = '0';
    toneSlider.max = '100';
    toneSlider.value = String(freqToSlider(currentTone));
    const toneVal = document.createElement('span');
    toneVal.className = 'rv-val';
    toneVal.textContent = formatFreq(currentTone);
    toneSlider.oninput = () => {
      currentTone = sliderToFreq(parseInt(toneSlider.value, 10));
      toneVal.textContent = formatFreq(currentTone);
      rvUpdateIR();
    };
    toneRow.appendChild(toneLbl);
    toneRow.appendChild(toneSlider);
    toneRow.appendChild(toneVal);
    body.appendChild(toneRow);

    // Jack row (input + output)
    const jackRow = document.createElement('div');
    jackRow.className = 'rv-jack-row';

    const inGroup = document.createElement('div');
    inGroup.className = 'rv-jack-group';
    const inLabel = document.createElement('span');
    inLabel.className = 'audio-jack-label';
    inLabel.textContent = 'IN';
    inputJackEl = document.createElement('div');
    inGroup.appendChild(inLabel);
    inGroup.appendChild(inputJackEl);

    const outGroup = document.createElement('div');
    outGroup.className = 'rv-jack-group';
    const outLabel = document.createElement('span');
    outLabel.className = 'audio-jack-label';
    outLabel.textContent = 'OUT';
    outputJackEl = document.createElement('div');
    outGroup.appendChild(outLabel);
    outGroup.appendChild(outputJackEl);

    jackRow.appendChild(inGroup);
    jackRow.appendChild(outGroup);

    // Insert jack row before statusbar
    const winEl = document.getElementById('reverb');
    const statusbar = winEl.querySelector('.statusbar');
    winEl.insertBefore(jackRow, statusbar);

    rvBuilt = true;
  };

  const openReverb = () => {
    if (!rvBuilt) rvBuildUI();
    if (!rvCtx) rvInitAudio();
    openWindow('reverb');

    // Register jacks
    window.mpAudioBus.registerInput(inputJackId, {
      node: rvInputGain,
      label: 'Reverb Input',
      element: inputJackEl
    });
    window.mpAudioBus.registerOutput(outputJackId, {
      node: rvOutputGain,
      label: 'Reverb Output',
      element: outputJackEl
    });

    // Start scope
    if (!rvRafId) rvDrawScope();

    const statusEl = document.getElementById('rvStatus');
    if (statusEl) statusEl.textContent = RV_PRESETS[currentPreset].name;
  };

  const closeReverb = () => {
    // Stop scope
    if (rvRafId) { cancelAnimationFrame(rvRafId); rvRafId = null; }

    // Unregister jacks
    window.mpAudioBus.unregisterInput(inputJackId);
    window.mpAudioBus.unregisterOutput(outputJackId);

    // Disconnect audio nodes
    if (rvInputGain) { try { rvInputGain.disconnect(); } catch (e) { /* */ } }
    if (rvDryGain) { try { rvDryGain.disconnect(); } catch (e) { /* */ } }
    if (rvWetGain) { try { rvWetGain.disconnect(); } catch (e) { /* */ } }
    if (rvConvolver) { try { rvConvolver.disconnect(); } catch (e) { /* */ } }
    if (rvOutputGain) { try { rvOutputGain.disconnect(); } catch (e) { /* */ } }
    if (rvAnalyser) { try { rvAnalyser.disconnect(); } catch (e) { /* */ } }

    rvCtx = null;
    rvInputGain = null;
    rvDryGain = null;
    rvWetGain = null;
    rvConvolver = null;
    rvOutputGain = null;
    rvAnalyser = null;
    rvTimeDomain = null;
    rvScopeCanvas = null;
    rvScopeCtx = null;
    inputJackEl = null;
    outputJackEl = null;
    rvBuilt = false;

    mpTaskbar.closeWindow('reverb');
  };

  /* ── Registration ── */
  window.mpRegisterActions({ openReverb });
  window.mpRegisterWindows({ reverb: 'Reverb' });
  window.mpRegisterCloseHandlers({ reverb: closeReverb });

  window.openReverb = openReverb;
  window.closeReverb = closeReverb;
})();
