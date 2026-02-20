/* Photo Booth — Webcam app with 12 real-time canvas filters */
(function () {
'use strict';

const { openWindow, t, mpRegisterActions, mpRegisterWindows, mpRegisterCloseHandlers } = window;

/* ── Constants ── */
const VW = 640, VH = 480;
const RING_SIZE = 30;
const FILTERS = [
  'normal', 'crt', 'underwater', 'fisheye',
  'vhs', 'thermal', 'deepfried', 'pixelsort',
  'ascii', 'datamosh', 'kaleidoscope', 'timeslice'
];

/* ── State ── */
let stream = null;
let video = null;
let canvas = null;
let ctx = null;
let offCanvas = null;
let offCtx = null;
let rafId = null;
let currentFilter = 'normal';
let mirrored = true;
let photos = [];
let viewingPhoto = -1; // -1 = live camera
let countdownActive = false;

/* Frame ring buffer (allocated on demand) */
let ringBuffer = null;
let ringIndex = 0;

/* Reusable ImageData */
let imgData = null;

/* Pre-computed displacement maps */
let fisheyeMap = null;
let kaleidoscopeMap = null;

/* Underwater animation phase */
let uwPhase = 0;

/* ASCII char set */
const ASCII_CHARS = ' .:-=+*#%@';

/* Thermal palette — blue→cyan→green→yellow→red→white */
const THERMAL_PALETTE = new Uint8Array(256 * 3);
(() => {
  const stops = [
    [0, 0, 0, 128],      // dark blue
    [64, 0, 200, 200],    // cyan
    [128, 0, 200, 0],     // green
    [192, 255, 255, 0],   // yellow
    [224, 255, 60, 0],    // red
    [255, 255, 255, 255]  // white
  ];
  for (let i = 0; i < 256; i++) {
    let s0 = stops[0], s1 = stops[1];
    for (let s = 1; s < stops.length; s++) {
      if (i <= stops[s][0]) { s0 = stops[s - 1]; s1 = stops[s]; break; }
    }
    const range = s1[0] - s0[0] || 1;
    const f = (i - s0[0]) / range;
    THERMAL_PALETTE[i * 3] = s0[1] + (s1[1] - s0[1]) * f;
    THERMAL_PALETTE[i * 3 + 1] = s0[2] + (s1[2] - s0[2]) * f;
    THERMAL_PALETTE[i * 3 + 2] = s0[3] + (s1[3] - s0[3]) * f;
  }
})();

/* ── Displacement map builders ── */
const buildFisheyeMap = () => {
  if (fisheyeMap) return;
  fisheyeMap = new Int32Array(VW * VH * 2);
  const cx = VW / 2, cy = VH / 2;
  const maxR = Math.min(cx, cy);
  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * VW + x) * 2;
      if (r < maxR) {
        const nr = r / maxR;
        const theta = Math.atan2(dy, dx);
        const newR = maxR * nr * nr;
        fisheyeMap[idx] = Math.round(cx + newR * Math.cos(theta));
        fisheyeMap[idx + 1] = Math.round(cy + newR * Math.sin(theta));
      } else {
        fisheyeMap[idx] = x;
        fisheyeMap[idx + 1] = y;
      }
    }
  }
};

const buildKaleidoscopeMap = () => {
  if (kaleidoscopeMap) return;
  kaleidoscopeMap = new Int32Array(VW * VH * 2);
  const cx = VW / 2, cy = VH / 2;
  const slices = 6;
  const sliceAngle = (2 * Math.PI) / slices;
  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      const dx = x - cx, dy = y - cy;
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;
      const r = Math.sqrt(dx * dx + dy * dy);
      let sliceIdx = Math.floor(angle / sliceAngle);
      let localAngle = angle - sliceIdx * sliceAngle;
      if (sliceIdx % 2 === 1) localAngle = sliceAngle - localAngle;
      const srcX = Math.round(cx + r * Math.cos(localAngle));
      const srcY = Math.round(cy + r * Math.sin(localAngle));
      const idx = (y * VW + x) * 2;
      kaleidoscopeMap[idx] = Math.max(0, Math.min(VW - 1, srcX));
      kaleidoscopeMap[idx + 1] = Math.max(0, Math.min(VH - 1, srcY));
    }
  }
};

/* ── Ring buffer management ── */
const needsRingBuffer = (f) => f === 'datamosh' || f === 'timeslice';

const allocRingBuffer = () => {
  if (ringBuffer) return;
  ringBuffer = [];
  for (let i = 0; i < RING_SIZE; i++) {
    ringBuffer.push(new ImageData(VW, VH));
  }
  ringIndex = 0;
};

const freeRingBuffer = () => {
  ringBuffer = null;
  ringIndex = 0;
};

const pushFrame = (src) => {
  if (!ringBuffer) return;
  ringBuffer[ringIndex].data.set(src.data);
  ringIndex = (ringIndex + 1) % RING_SIZE;
};

/* ── Filter implementations ── */
const filterNormal = (src, dst) => {
  dst.data.set(src.data);
};

const filterCRT = (src, dst) => {
  const s = src.data, d = dst.data;
  const w = VW, h = VH;
  const cx = w / 2, cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    const scanline = (y % 3 === 0) ? 0.7 : 1.0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // RGB phosphor offset
      const ri = (y * w + Math.min(x + 1, w - 1)) * 4;
      const bi = (y * w + Math.max(x - 1, 0)) * 4;
      let r = s[ri] * scanline;
      let g = s[i + 1] * scanline;
      let b = s[bi + 2] * scanline;
      // Vignette
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const vignette = 1 - dist * dist * 0.6;
      r *= vignette;
      g *= vignette;
      b *= vignette;
      // Static noise
      const noise = (Math.random() - 0.5) * 25;
      d[i] = Math.max(0, Math.min(255, r + noise));
      d[i + 1] = Math.max(0, Math.min(255, g + noise));
      d[i + 2] = Math.max(0, Math.min(255, b + noise));
      d[i + 3] = 255;
    }
  }
};

const filterUnderwater = (src, dst) => {
  const s = src.data, d = dst.data;
  const w = VW, h = VH;
  uwPhase += 0.03;
  for (let y = 0; y < h; y++) {
    const shift = Math.round(Math.sin(y * 0.02 + uwPhase) * 4);
    for (let x = 0; x < w; x++) {
      const sx = Math.max(0, Math.min(w - 1, x + shift));
      const si = (y * w + sx) * 4;
      const di = (y * w + x) * 4;
      // Blue-green tint
      d[di] = s[si] * 0.4;
      d[di + 1] = Math.min(255, s[si + 1] * 0.8 + 30);
      d[di + 2] = Math.min(255, s[si + 2] * 0.9 + 50);
      d[di + 3] = 255;
      // Caustic ripple
      const caustic = Math.sin(x * 0.05 + y * 0.03 + uwPhase * 2) * 0.5 + 0.5;
      if (caustic > 0.85) {
        const boost = (caustic - 0.85) * 200;
        d[di] = Math.min(255, d[di] + boost * 0.3);
        d[di + 1] = Math.min(255, d[di + 1] + boost);
        d[di + 2] = Math.min(255, d[di + 2] + boost);
      }
    }
  }
};

const filterFisheye = (src, dst) => {
  buildFisheyeMap();
  const s = src.data, d = dst.data;
  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      const idx = (y * VW + x) * 2;
      const sx = fisheyeMap[idx], sy = fisheyeMap[idx + 1];
      const si = (sy * VW + sx) * 4;
      const di = (y * VW + x) * 4;
      d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = 255;
    }
  }
};

const filterVHS = (src, dst) => {
  const s = src.data, d = dst.data;
  const w = VW, h = VH;
  const rOff = 3 + Math.round(Math.random() * 2);
  const bOff = -(2 + Math.round(Math.random() * 2));
  // Tracking error band
  const trackY = Math.random() < 0.3 ? Math.floor(Math.random() * h) : -1;
  const trackH = 4 + Math.floor(Math.random() * 12);
  for (let y = 0; y < h; y++) {
    const inTrack = trackY >= 0 && y >= trackY && y < trackY + trackH;
    const trackShift = inTrack ? Math.round((Math.random() - 0.5) * 30) : 0;
    for (let x = 0; x < w; x++) {
      const di = (y * w + x) * 4;
      const ax = Math.max(0, Math.min(w - 1, x + trackShift));
      // Red channel offset vertically
      const ry = Math.max(0, Math.min(h - 1, y + rOff));
      const ri = (ry * w + ax) * 4;
      // Blue channel offset vertically
      const by = Math.max(0, Math.min(h - 1, y + bOff));
      const bi = (by * w + ax) * 4;
      const gi = (y * w + ax) * 4;
      d[di] = s[ri];
      d[di + 1] = s[gi + 1];
      d[di + 2] = s[bi + 2];
      d[di + 3] = 255;
      // Noise
      if (inTrack || Math.random() < 0.01) {
        const noise = (Math.random() - 0.5) * 80;
        d[di] = Math.max(0, Math.min(255, d[di] + noise));
        d[di + 1] = Math.max(0, Math.min(255, d[di + 1] + noise));
        d[di + 2] = Math.max(0, Math.min(255, d[di + 2] + noise));
      }
    }
  }
};

const filterThermal = (src, dst) => {
  const s = src.data, d = dst.data;
  const len = VW * VH;
  for (let i = 0; i < len; i++) {
    const si = i * 4;
    const lum = Math.round(s[si] * 0.299 + s[si + 1] * 0.587 + s[si + 2] * 0.114);
    const pi = lum * 3;
    d[si] = THERMAL_PALETTE[pi];
    d[si + 1] = THERMAL_PALETTE[pi + 1];
    d[si + 2] = THERMAL_PALETTE[pi + 2];
    d[si + 3] = 255;
  }
};

const filterDeepFried = (src, dst) => {
  const s = src.data, d = dst.data;
  const len = VW * VH;
  for (let i = 0; i < len; i++) {
    const si = i * 4;
    let r = s[si], g = s[si + 1], b = s[si + 2];
    // Boost saturation 3x
    const gray = r * 0.299 + g * 0.587 + b * 0.114;
    r = gray + (r - gray) * 3;
    g = gray + (g - gray) * 3;
    b = gray + (b - gray) * 3;
    // Boost contrast 2.5x
    r = ((r / 255 - 0.5) * 2.5 + 0.5) * 255;
    g = ((g / 255 - 0.5) * 2.5 + 0.5) * 255;
    b = ((b / 255 - 0.5) * 2.5 + 0.5) * 255;
    // Red/orange tint
    r += 40;
    g -= 10;
    b -= 30;
    // Noise grain
    const noise = (Math.random() - 0.5) * 60;
    d[si] = Math.max(0, Math.min(255, r + noise));
    d[si + 1] = Math.max(0, Math.min(255, g + noise));
    d[si + 2] = Math.max(0, Math.min(255, b + noise));
    d[si + 3] = 255;
  }
};

const filterPixelSort = (src, dst) => {
  const s = src.data, d = dst.data;
  const w = VW, h = VH;
  d.set(s);
  const loThresh = 60, hiThresh = 200;
  // Sort columns by brightness within threshold runs
  for (let x = 0; x < w; x += 2) {
    let runStart = -1;
    for (let y = 0; y <= h; y++) {
      const i = y < h ? (y * w + x) * 4 : -1;
      const lum = i >= 0 ? (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) : 0;
      const inRange = i >= 0 && lum >= loThresh && lum <= hiThresh;
      if (inRange && runStart < 0) {
        runStart = y;
      } else if (!inRange && runStart >= 0) {
        // Sort this run
        const run = [];
        for (let ry = runStart; ry < y; ry++) {
          const ri = (ry * w + x) * 4;
          run.push({ y: ry, lum: d[ri] * 0.299 + d[ri + 1] * 0.587 + d[ri + 2] * 0.114, r: d[ri], g: d[ri + 1], b: d[ri + 2] });
        }
        run.sort((a, b) => a.lum - b.lum);
        for (let j = 0; j < run.length; j++) {
          const ri = ((runStart + j) * w + x) * 4;
          d[ri] = run[j].r; d[ri + 1] = run[j].g; d[ri + 2] = run[j].b;
        }
        runStart = -1;
      }
    }
  }
};

const filterASCII = (src, dst) => {
  const s = src.data, d = dst.data;
  const w = VW, h = VH;
  const cellW = 4, cellH = 6;
  // Fill black
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 255;
  }
  for (let cy = 0; cy < h; cy += cellH) {
    for (let cx = 0; cx < w; cx += cellW) {
      let totalR = 0, totalG = 0, totalB = 0, totalLum = 0, count = 0;
      for (let dy = 0; dy < cellH && cy + dy < h; dy++) {
        for (let dx = 0; dx < cellW && cx + dx < w; dx++) {
          const i = ((cy + dy) * w + (cx + dx)) * 4;
          totalR += s[i]; totalG += s[i + 1]; totalB += s[i + 2];
          totalLum += s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114;
          count++;
        }
      }
      const avgLum = totalLum / count;
      const charIdx = Math.min(ASCII_CHARS.length - 1, Math.floor(avgLum / 256 * ASCII_CHARS.length));
      const r = totalR / count, g = totalG / count, b = totalB / count;
      // Draw a simple colored block for the character intensity
      if (charIdx > 0) {
        const intensity = charIdx / (ASCII_CHARS.length - 1);
        for (let dy = 0; dy < cellH && cy + dy < h; dy++) {
          for (let dx = 0; dx < cellW && cx + dx < w; dx++) {
            // Create character-like pattern
            const inChar = (dy > 0 && dy < cellH - 1 && dx > 0 && dx < cellW - 1);
            if (inChar) {
              const i = ((cy + dy) * w + (cx + dx)) * 4;
              d[i] = r * intensity;
              d[i + 1] = g * intensity;
              d[i + 2] = b * intensity;
            }
          }
        }
      }
    }
  }
};

const filterDatamosh = (src, dst) => {
  if (!ringBuffer) { dst.data.set(src.data); return; }
  const d = dst.data;
  d.set(src.data);
  const blockSize = 8;
  const prevFrame = ringBuffer[(ringIndex - 2 + RING_SIZE) % RING_SIZE];
  if (!prevFrame) return;
  const pData = prevFrame.data;
  for (let by = 0; by < VH; by += blockSize) {
    for (let bx = 0; bx < VW; bx += blockSize) {
      if (Math.random() < 0.15) {
        for (let y = by; y < by + blockSize && y < VH; y++) {
          for (let x = bx; x < bx + blockSize && x < VW; x++) {
            const i = (y * VW + x) * 4;
            d[i] = pData[i]; d[i + 1] = pData[i + 1]; d[i + 2] = pData[i + 2];
          }
        }
      }
    }
  }
};

const filterKaleidoscope = (src, dst) => {
  buildKaleidoscopeMap();
  const s = src.data, d = dst.data;
  for (let y = 0; y < VH; y++) {
    for (let x = 0; x < VW; x++) {
      const idx = (y * VW + x) * 2;
      const sx = kaleidoscopeMap[idx], sy = kaleidoscopeMap[idx + 1];
      const si = (sy * VW + sx) * 4;
      const di = (y * VW + x) * 4;
      d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = 255;
    }
  }
};

const filterTimeSlice = (src, dst) => {
  if (!ringBuffer) { dst.data.set(src.data); return; }
  const d = dst.data;
  const colsPerFrame = Math.ceil(VW / RING_SIZE);
  for (let col = 0; col < VW; col++) {
    const frameIdx = Math.floor(col / colsPerFrame) % RING_SIZE;
    const frame = ringBuffer[(ringIndex - 1 - frameIdx + RING_SIZE * 2) % RING_SIZE];
    if (!frame) continue;
    const fData = frame.data;
    for (let y = 0; y < VH; y++) {
      const i = (y * VW + col) * 4;
      d[i] = fData[i]; d[i + 1] = fData[i + 1]; d[i + 2] = fData[i + 2]; d[i + 3] = 255;
    }
  }
};

const FILTER_FNS = {
  normal: filterNormal,
  crt: filterCRT,
  underwater: filterUnderwater,
  fisheye: filterFisheye,
  vhs: filterVHS,
  thermal: filterThermal,
  deepfried: filterDeepFried,
  pixelsort: filterPixelSort,
  ascii: filterASCII,
  datamosh: filterDatamosh,
  kaleidoscope: filterKaleidoscope,
  timeslice: filterTimeSlice
};

/* ── UI building ── */
const buildUI = () => {
  const body = document.querySelector('#photobooth .window-body');
  if (!body || body.children.length > 0) return;

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'pb-toolbar';

  const captureBtn = document.createElement('button');
  captureBtn.type = 'button';
  captureBtn.className = 'btn';
  captureBtn.id = 'pbCaptureBtn';
  captureBtn.textContent = t('pb.capture');
  captureBtn.addEventListener('click', startCapture);
  toolbar.appendChild(captureBtn);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn';
  saveBtn.id = 'pbSaveBtn';
  saveBtn.textContent = t('pb.save');
  saveBtn.addEventListener('click', savePhoto);
  toolbar.appendChild(saveBtn);

  const mirrorBtn = document.createElement('button');
  mirrorBtn.type = 'button';
  mirrorBtn.className = 'btn';
  mirrorBtn.id = 'pbMirrorBtn';
  mirrorBtn.textContent = t('pb.mirror');
  mirrorBtn.addEventListener('click', toggleMirror);
  toolbar.appendChild(mirrorBtn);

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'btn';
  backBtn.id = 'pbBackBtn';
  backBtn.textContent = t('pb.back');
  backBtn.style.display = 'none';
  backBtn.addEventListener('click', backToCamera);
  toolbar.appendChild(backBtn);

  body.appendChild(toolbar);

  // Canvas container
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'pb-canvas-wrap';
  canvasWrap.id = 'pbCanvasWrap';

  canvas = document.createElement('canvas');
  canvas.className = 'pb-canvas';
  canvas.width = VW;
  canvas.height = VH;
  canvasWrap.appendChild(canvas);

  // Countdown overlay
  const countdown = document.createElement('div');
  countdown.className = 'pb-countdown';
  countdown.id = 'pbCountdown';
  canvasWrap.appendChild(countdown);

  // Flash overlay
  const flash = document.createElement('div');
  flash.className = 'pb-flash';
  flash.id = 'pbFlash';
  canvasWrap.appendChild(flash);

  body.appendChild(canvasWrap);

  // Filter grid
  const filterGrid = document.createElement('div');
  filterGrid.className = 'pb-filter-grid';
  filterGrid.id = 'pbFilterGrid';
  FILTERS.forEach((f) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pb-filter-btn' + (f === currentFilter ? ' active' : '');
    btn.textContent = t(`pb.filter.${f}`);
    btn.dataset.filter = f;
    btn.addEventListener('click', () => selectFilter(f));
    filterGrid.appendChild(btn);
  });
  body.appendChild(filterGrid);

  // Photo strip
  const strip = document.createElement('div');
  strip.className = 'pb-strip';
  strip.id = 'pbStrip';
  body.appendChild(strip);

  ctx = canvas.getContext('2d', { willReadFrequently: true });
};

/* ── Camera management ── */
const startCamera = async () => {
  const statusEl = document.getElementById('pbStatus');
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: VW }, height: { ideal: VH }, facingMode: 'user' },
      audio: false
    });
    video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    video.muted = true;
    await video.play();

    // Create offscreen canvas for reading frames
    offCanvas = document.createElement('canvas');
    offCanvas.width = VW;
    offCanvas.height = VH;
    offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    imgData = new ImageData(VW, VH);

    if (statusEl) statusEl.textContent = t('pb.filter.normal');
    startRenderLoop();
  } catch (err) {
    if (statusEl) statusEl.textContent = t('pb.cameraError');
    // Show error in canvas
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VW, VH);
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('pb.cameraError'), VW / 2, VH / 2);
    }
  }
};

const stopCamera = () => {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (stream) {
    stream.getTracks().forEach((tr) => tr.stop());
    stream = null;
  }
  if (video) { video.srcObject = null; video = null; }
  freeRingBuffer();
};

/* ── Render loop ── */
const startRenderLoop = () => {
  if (rafId) return;
  const loop = () => {
    rafId = requestAnimationFrame(loop);
    if (!video || video.readyState < 2 || viewingPhoto >= 0 || countdownActive) return;

    // Draw video to offscreen canvas (with mirror)
    offCtx.save();
    if (mirrored) {
      offCtx.translate(VW, 0);
      offCtx.scale(-1, 1);
    }
    offCtx.drawImage(video, 0, 0, VW, VH);
    offCtx.restore();

    const srcData = offCtx.getImageData(0, 0, VW, VH);

    // Push to ring buffer if needed
    if (needsRingBuffer(currentFilter)) {
      if (!ringBuffer) allocRingBuffer();
      pushFrame(srcData);
    }

    // Apply filter
    const filterFn = FILTER_FNS[currentFilter] || filterNormal;
    filterFn(srcData, imgData);

    ctx.putImageData(imgData, 0, 0);
  };
  loop();
};

/* ── Filter selection ── */
const selectFilter = (f) => {
  const oldFilter = currentFilter;
  currentFilter = f;
  // Free ring buffer if no longer needed
  if (!needsRingBuffer(f) && needsRingBuffer(oldFilter)) freeRingBuffer();
  // Update button state
  const grid = document.getElementById('pbFilterGrid');
  if (grid) {
    grid.querySelectorAll('.pb-filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === f);
    });
  }
  // Update status
  const statusEl = document.getElementById('pbStatus');
  if (statusEl) statusEl.textContent = `${t('pb.statusFilter')}: ${t(`pb.filter.${f}`)}`;
};

/* ── Mirror toggle ── */
const toggleMirror = () => {
  mirrored = !mirrored;
  const btn = document.getElementById('pbMirrorBtn');
  if (btn) btn.classList.toggle('active', mirrored);
};

/* ── Capture ── */
const startCapture = () => {
  if (!video || viewingPhoto >= 0 || countdownActive) return;
  countdownActive = true;
  const cdEl = document.getElementById('pbCountdown');
  let count = 3;
  cdEl.textContent = count;
  cdEl.style.display = 'flex';

  const tick = () => {
    if (count <= 0) {
      cdEl.style.display = 'none';
      countdownActive = false;
      doCapture();
      return;
    }
    cdEl.textContent = count;
    count--;
    setTimeout(tick, 800);
  };
  setTimeout(tick, 800);
};

const doCapture = () => {
  // Flash
  const flashEl = document.getElementById('pbFlash');
  flashEl.classList.add('active');
  setTimeout(() => flashEl.classList.remove('active'), 300);

  // Shutter sound
  if (window.mpSoundProducer) window.mpSoundProducer.play('click');

  // Save current canvas as photo
  const photoCanvas = document.createElement('canvas');
  photoCanvas.width = VW;
  photoCanvas.height = VH;
  const photoCtx = photoCanvas.getContext('2d');
  photoCtx.drawImage(canvas, 0, 0);

  photos.push(photoCanvas);
  addThumbnail(photos.length - 1);

  // Update status
  updatePhotoCount();
};

/* ── Thumbnail strip ── */
const addThumbnail = (idx) => {
  const strip = document.getElementById('pbStrip');
  if (!strip) return;
  const thumb = document.createElement('canvas');
  thumb.className = 'pb-thumb';
  thumb.width = 80;
  thumb.height = 60;
  const tCtx = thumb.getContext('2d');
  tCtx.drawImage(photos[idx], 0, 0, 80, 60);
  thumb.addEventListener('click', () => viewPhoto(idx));
  strip.appendChild(thumb);
  // Scroll to end
  strip.scrollLeft = strip.scrollWidth;
};

/* ── View photo / back to camera ── */
const viewPhoto = (idx) => {
  if (idx < 0 || idx >= photos.length) return;
  viewingPhoto = idx;
  ctx.drawImage(photos[idx], 0, 0);
  document.getElementById('pbCaptureBtn').style.display = 'none';
  document.getElementById('pbMirrorBtn').style.display = 'none';
  document.getElementById('pbFilterGrid').style.display = 'none';
  document.getElementById('pbBackBtn').style.display = '';
  document.getElementById('pbSaveBtn').style.display = '';
};

const backToCamera = () => {
  viewingPhoto = -1;
  document.getElementById('pbCaptureBtn').style.display = '';
  document.getElementById('pbMirrorBtn').style.display = '';
  document.getElementById('pbFilterGrid').style.display = '';
  document.getElementById('pbBackBtn').style.display = 'none';
};

/* ── Save photo ── */
const savePhoto = () => {
  const idx = viewingPhoto >= 0 ? viewingPhoto : photos.length - 1;
  if (idx < 0 || !photos[idx]) return;
  const link = document.createElement('a');
  link.download = `photobooth-${Date.now()}.png`;
  link.href = photos[idx].toDataURL('image/png');
  link.click();
};

/* ── Status update ── */
const updatePhotoCount = () => {
  const countEl = document.getElementById('pbPhotoCount');
  if (countEl) countEl.textContent = `${t('pb.photos')}: ${photos.length}`;
};

/* ── Open / Close ── */
const openPhotoBooth = () => {
  openWindow('photobooth');
  buildUI();
  if (!stream) startCamera();
};

const closePhotoBooth = () => {
  stopCamera();
  window.mpTaskbar.closeWindow('photobooth');
};

/* ── Language refresh ── */
const photoBoothRefreshOnLangChange = () => {
  const el = document.getElementById('photobooth');
  if (!el || el.style.display === 'none') return;
  // Update filter buttons
  const grid = document.getElementById('pbFilterGrid');
  if (grid) {
    grid.querySelectorAll('.pb-filter-btn').forEach((btn) => {
      const f = btn.dataset.filter;
      btn.textContent = t(`pb.filter.${f}`);
    });
  }
  // Update toolbar buttons
  const captureBtn = document.getElementById('pbCaptureBtn');
  if (captureBtn) captureBtn.textContent = t('pb.capture');
  const saveBtn = document.getElementById('pbSaveBtn');
  if (saveBtn) saveBtn.textContent = t('pb.save');
  const mirrorBtn = document.getElementById('pbMirrorBtn');
  if (mirrorBtn) mirrorBtn.textContent = t('pb.mirror');
  const backBtn = document.getElementById('pbBackBtn');
  if (backBtn) backBtn.textContent = t('pb.back');
  // Update status
  const statusEl = document.getElementById('pbStatus');
  if (statusEl) statusEl.textContent = `${t('pb.statusFilter')}: ${t(`pb.filter.${currentFilter}`)}`;
  updatePhotoCount();
};

/* ── Registration ── */
mpRegisterActions({ openPhotoBooth });
mpRegisterWindows({ photobooth: 'Photo Booth' });
mpRegisterCloseHandlers({ photobooth: closePhotoBooth });

/* ── Exports ── */
window.openPhotoBooth = openPhotoBooth;
window.closePhotoBooth = closePhotoBooth;
window.photoBoothRefreshOnLangChange = photoBoothRefreshOnLangChange;

})();
