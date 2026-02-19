(function () {
  'use strict';

  /* ── Globals from other modules ── */
  const { openWindow, mpConfirm, showLoadingMessage, mobileQuery, mpTaskbar, t } = window;

  /* ════════════════════════════════════════════════════════════════════════
   *  Stopwatch
   * ════════════════════════════════════════════════════════════════════════ */

  let swRunning = false;
  let swStart = 0;
  let swElapsed = 0;
  let swRafId = null;
  let swLaps = [];

  const openStopwatch = () => openWindow('stopwatch');

  const swFmt = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}.${cs < 10 ? '0' : ''}${cs}`;
  };

  const swTick = () => {
    if (!swRunning) return;
    const total = swElapsed + (performance.now() - swStart);
    document.getElementById('swDisplay').textContent = swFmt(total);
    swRafId = requestAnimationFrame(swTick);
  };

  const swStartStop = () => {
    if (swRunning) {
      swElapsed += performance.now() - swStart;
      swRunning = false;
      if (swRafId) { cancelAnimationFrame(swRafId); swRafId = null; }
      const btn = document.getElementById('swStartBtn');
      btn.textContent = t('ui.start');
      btn.classList.remove('sw-running');
    } else {
      swStart = performance.now();
      swRunning = true;
      const btn = document.getElementById('swStartBtn');
      btn.textContent = t('ui.stop');
      btn.classList.add('sw-running');
      swTick();
    }
  };

  const swReset = () => {
    swRunning = false;
    swElapsed = 0;
    swLaps = [];
    if (swRafId) { cancelAnimationFrame(swRafId); swRafId = null; }
    document.getElementById('swDisplay').textContent = '00:00.00';
    const btn = document.getElementById('swStartBtn');
    btn.textContent = t('ui.start');
    btn.classList.remove('sw-running');
    const lapsEl = document.getElementById('swLaps');
    lapsEl.textContent = '';
    lapsEl.classList.remove('has-laps');
  };

  const swLap = () => {
    if (!swRunning) return;
    const total = swElapsed + (performance.now() - swStart);
    const prev = swLaps.length ? swLaps[swLaps.length - 1] : 0;
    swLaps.push(total);
    const lapsEl = document.getElementById('swLaps');
    lapsEl.classList.add('has-laps');
    const row = document.createElement('div');
    row.className = 'sw-lap-row';
    const num = document.createElement('span');
    num.textContent = `#${swLaps.length}`;
    const split = document.createElement('span');
    split.textContent = `+${swFmt(total - prev)}`;
    const abs = document.createElement('span');
    abs.textContent = swFmt(total);
    row.appendChild(num);
    row.appendChild(split);
    row.appendChild(abs);
    lapsEl.insertBefore(row, lapsEl.firstChild);
    lapsEl.scrollTop = 0;
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Sticky Notes
   * ════════════════════════════════════════════════════════════════════════ */

  const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green', 'purple'];
  const STICKY_DEFAULT_W = 200;
  const STICKY_DEFAULT_H = 180;
  const STICKY_MIN_W = 140;
  const STICKY_MIN_H = 100;
  let stickyNoteZ = 5;
  let stickyDragState = null;
  let stickyResizeState = null;
  let stickyNextId = 1;
  let saveStickyTimeout = null;

  const loadStickyNotes = () => {
    try {
      const raw = localStorage.getItem('mpOS-sticky-notes');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  };

  const saveStickyNotes = () => {
    const notes = document.querySelectorAll('.sticky-note');
    const data = [];
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      data.push({
        id: n.dataset.stickyId,
        text: n.querySelector('.sticky-textarea').value,
        color: n.dataset.stickyColor,
        x: parseInt(n.style.left, 10),
        y: parseInt(n.style.top, 10),
        w: parseInt(n.style.width, 10),
        h: parseInt(n.style.height, 10)
      });
    }
    localStorage.setItem('mpOS-sticky-notes', JSON.stringify(data));
  };

  const saveStickyNotesDebounced = () => {
    if (saveStickyTimeout) clearTimeout(saveStickyTimeout);
    saveStickyTimeout = setTimeout(saveStickyNotes, 300);
  };

  const rebaseStickyZ = () => {
    stickyNoteZ = 5;
    const notes = document.querySelectorAll('.sticky-note');
    for (let i = 0; i < notes.length; i++) notes[i].style.zIndex = 5;
  };

  const COLOR_HEX_MAP = {
    yellow: '#f5e87b', pink: '#f0a0c8', blue: '#a0c8f0', green: '#a0e0a0', purple: '#c8a0f0'
  };

  const deleteStickyNote = async (noteEl) => {
    const text = noteEl.querySelector('.sticky-textarea').value.trim();
    if (text && !(await mpConfirm(t('sticky.deleteConfirm')))) return;
    noteEl.remove();
    saveStickyNotes();
  };

  const createStickyNote = (data) => {
    const area = document.querySelector('.desktop-area');
    if (!area) return null;

    const note = document.createElement('div');
    note.className = `sticky-note sticky-${data.color}`;
    note.dataset.stickyId = data.id;
    note.dataset.stickyColor = data.color;
    note.style.left = `${data.x}px`;
    note.style.top = `${data.y}px`;
    note.style.width = `${data.w}px`;
    note.style.height = `${data.h}px`;
    note.style.zIndex = stickyNoteZ;

    // Bring to front on mousedown
    note.addEventListener('mousedown', () => {
      stickyNoteZ++;
      if (stickyNoteZ >= 9) rebaseStickyZ();
      note.style.zIndex = stickyNoteZ;
    });

    // Header
    const header = document.createElement('div');
    header.className = 'sticky-header';

    // Color dots
    for (let c = 0; c < STICKY_COLORS.length; c++) {
      const col = STICKY_COLORS[c];
      const dot = document.createElement('div');
      dot.className = `sticky-color-dot${col === data.color ? ' active' : ''}`;
      dot.dataset.color = col;
      dot.style.background = COLOR_HEX_MAP[col];
      dot.addEventListener('click', () => {
        for (let j = 0; j < STICKY_COLORS.length; j++) {
          note.classList.remove(`sticky-${STICKY_COLORS[j]}`);
        }
        note.classList.add(`sticky-${col}`);
        note.dataset.stickyColor = col;
        const dots = header.querySelectorAll('.sticky-color-dot');
        for (let j = 0; j < dots.length; j++) {
          dots[j].classList.toggle('active', dots[j].dataset.color === col);
        }
        saveStickyNotes();
      });
      header.appendChild(dot);
    }

    const spacer = document.createElement('div');
    spacer.className = 'sticky-header-spacer';
    header.appendChild(spacer);

    // + button
    const addBtn = document.createElement('button');
    addBtn.className = 'sticky-btn';
    addBtn.type = 'button';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      let x = parseInt(note.style.left, 10) + 20;
      let y = parseInt(note.style.top, 10) + 20;
      const areaRect = area.getBoundingClientRect();
      if (x + STICKY_DEFAULT_W > areaRect.width) x = Math.max(0, areaRect.width - STICKY_DEFAULT_W);
      if (y + STICKY_DEFAULT_H > areaRect.height) y = Math.max(0, areaRect.height - STICKY_DEFAULT_H);
      const newNote = createStickyNote({
        id: `sticky-${stickyNextId++}`,
        text: '', color: 'yellow',
        x, y,
        w: STICKY_DEFAULT_W, h: STICKY_DEFAULT_H
      });
      if (newNote) newNote.querySelector('.sticky-textarea').focus();
      saveStickyNotes();
    });
    header.appendChild(addBtn);

    // x button
    const delBtn = document.createElement('button');
    delBtn.className = 'sticky-btn';
    delBtn.type = 'button';
    delBtn.textContent = '\u00d7';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteStickyNote(note);
    });
    header.appendChild(delBtn);

    note.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'sticky-body';
    const textarea = document.createElement('textarea');
    textarea.className = 'sticky-textarea';
    textarea.value = data.text || '';
    textarea.addEventListener('input', saveStickyNotesDebounced);
    body.appendChild(textarea);
    note.appendChild(body);

    // Resize handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'sticky-resize';
    resizeHandle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resizeHandle.setPointerCapture(e.pointerId);
      stickyResizeState = {
        note,
        startX: e.clientX,
        startY: e.clientY,
        startW: parseInt(note.style.width, 10),
        startH: parseInt(note.style.height, 10)
      };
    });
    resizeHandle.addEventListener('pointermove', (e) => {
      if (!stickyResizeState || stickyResizeState.note !== note) return;
      const newW = Math.max(STICKY_MIN_W, stickyResizeState.startW + (e.clientX - stickyResizeState.startX));
      const newH = Math.max(STICKY_MIN_H, stickyResizeState.startH + (e.clientY - stickyResizeState.startY));
      note.style.width = `${newW}px`;
      note.style.height = `${newH}px`;
    });
    resizeHandle.addEventListener('pointerup', () => {
      if (stickyResizeState && stickyResizeState.note === note) {
        stickyResizeState = null;
        saveStickyNotes();
      }
    });
    note.appendChild(resizeHandle);

    // Drag via header
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.sticky-btn') || e.target.closest('.sticky-color-dot')) return;
      e.preventDefault();
      const areaRect = area.getBoundingClientRect();
      stickyDragState = {
        note,
        offsetX: e.clientX - parseInt(note.style.left, 10) - areaRect.left,
        offsetY: e.clientY - parseInt(note.style.top, 10) - areaRect.top,
        areaRect
      };
      note.classList.add('dragging');
    });
    header.addEventListener('touchstart', (e) => {
      if (e.target.closest('.sticky-btn') || e.target.closest('.sticky-color-dot')) return;
      const touch = e.touches[0];
      const areaRect = area.getBoundingClientRect();
      stickyDragState = {
        note,
        offsetX: touch.clientX - parseInt(note.style.left, 10) - areaRect.left,
        offsetY: touch.clientY - parseInt(note.style.top, 10) - areaRect.top,
        areaRect
      };
      note.classList.add('dragging');
    }, { passive: true });

    // Track next ID
    const idNum = parseInt(data.id.replace('sticky-', ''), 10);
    if (!isNaN(idNum) && idNum >= stickyNextId) stickyNextId = idNum + 1;

    area.appendChild(note);
    return note;
  };

  // Global drag listeners for sticky notes
  document.addEventListener('mousemove', (e) => {
    if (!stickyDragState) return;
    const s = stickyDragState;
    let x = e.clientX - s.offsetX - s.areaRect.left;
    let y = e.clientY - s.offsetY - s.areaRect.top;
    const noteW = parseInt(s.note.style.width, 10);
    x = Math.max(-noteW + 50, Math.min(x, s.areaRect.width - 50));
    y = Math.max(0, Math.min(y, s.areaRect.height - 50));
    s.note.style.left = `${x}px`;
    s.note.style.top = `${y}px`;
  });
  document.addEventListener('mouseup', () => {
    if (!stickyDragState) return;
    stickyDragState.note.classList.remove('dragging');
    stickyDragState = null;
    saveStickyNotes();
  });
  document.addEventListener('touchmove', (e) => {
    if (!stickyDragState) return;
    const touch = e.touches[0];
    const s = stickyDragState;
    let x = touch.clientX - s.offsetX - s.areaRect.left;
    let y = touch.clientY - s.offsetY - s.areaRect.top;
    const noteW = parseInt(s.note.style.width, 10);
    x = Math.max(-noteW + 50, Math.min(x, s.areaRect.width - 50));
    y = Math.max(0, Math.min(y, s.areaRect.height - 50));
    s.note.style.left = `${x}px`;
    s.note.style.top = `${y}px`;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!stickyDragState) return;
    stickyDragState.note.classList.remove('dragging');
    stickyDragState = null;
    saveStickyNotes();
  });

  const openStickyNotes = () => {
    const area = document.querySelector('.desktop-area');
    if (!area) return;
    const areaRect = area.getBoundingClientRect();
    const x = Math.floor(Math.random() * Math.max(0, areaRect.width - STICKY_DEFAULT_W - 40)) + 20;
    const y = Math.floor(Math.random() * Math.max(0, areaRect.height - STICKY_DEFAULT_H - 40)) + 20;
    const newNote = createStickyNote({
      id: `sticky-${stickyNextId++}`,
      text: '', color: 'yellow',
      x, y,
      w: STICKY_DEFAULT_W, h: STICKY_DEFAULT_H
    });
    if (newNote) newNote.querySelector('.sticky-textarea').focus();
    saveStickyNotes();
  };

  const reclampStickyNotes = () => {
    const area = document.querySelector('.desktop-area');
    if (!area) return;
    const areaRect = area.getBoundingClientRect();
    const notes = document.querySelectorAll('.sticky-note');
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      const x = parseInt(n.style.left, 10);
      const y = parseInt(n.style.top, 10);
      const w = parseInt(n.style.width, 10);
      const h = parseInt(n.style.height, 10);
      if (x + w < 50) n.style.left = `${Math.max(0, 50 - w)}px`;
      if (x > areaRect.width - 50) n.style.left = `${areaRect.width - 50}px`;
      if (y + h < 50) n.style.top = `${Math.max(0, 50 - h)}px`;
      if (y > areaRect.height - 50) n.style.top = `${areaRect.height - 50}px`;
    }
    saveStickyNotes();
  };

  // Auto-restore sticky notes
  if (!mobileQuery.matches) {
    const saved = loadStickyNotes();
    for (let i = 0; i < saved.length; i++) createStickyNote(saved[i]);
  }

  /* ════════════════════════════════════════════════════════════════════════
   *  Disk Usage
   * ════════════════════════════════════════════════════════════════════════ */

  const DU_TYPE_LABELS = { js: 'JavaScript', html: 'HTML', css: 'CSS', svg: 'SVG', json: 'JSON' };
  const DU_TYPE_COLORS = ['#4a8abe', '#5aaa80', '#e8a010', '#c06090', '#8a6abe', '#be6a4a', '#4abe8a'];

  const darkenHex = (hex, factor) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `#${((1 << 24) + (Math.round(r * factor) << 16) +
      (Math.round(g * factor) << 8) + Math.round(b * factor)).toString(16).slice(1)}`;
  };

  const formatDuSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const svgEl = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };

  const populateDiskUsage = async () => {
    const body = document.getElementById('diskUsageBody');
    const status = document.getElementById('diskUsageStatus');

    body.textContent = '';
    showLoadingMessage(body, t('du.scanning'));

    try {
      const r = await fetch(`version.json?_=${Date.now()}`);
      const manifest = await r.json();

      const du = manifest.diskUsage;
      if (!du || !du.types) {
        showLoadingMessage(body, t('du.noFiles'));
        return;
      }

      const totals = {};
      let totalSize = 0;
      const fileCount = du.fileCount || 0;
      Object.keys(du.types).forEach((ext) => {
        totals[ext] = du.types[ext].size;
        totalSize += du.types[ext].size;
      });

      if (totalSize === 0) {
        showLoadingMessage(body, t('du.noFiles'));
        return;
      }

      body.textContent = '';
      const types = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);
      const typeColor = {};
      types.forEach((tp, i) => { typeColor[tp] = DU_TYPE_COLORS[i % DU_TYPE_COLORS.length]; });

      // -- Header --
      const header = document.createElement('div');
      header.className = 'du-header';
      const titleEl = document.createElement('div');
      titleEl.className = 'du-header-title';
      titleEl.textContent = t('du.header');
      header.appendChild(titleEl);
      const subEl = document.createElement('div');
      subEl.className = 'du-header-sub';
      subEl.textContent = t('du.filesystem');
      header.appendChild(subEl);
      body.appendChild(header);

      // -- 3D Pie chart --
      const pieWrap = document.createElement('div');
      pieWrap.className = 'du-pie-wrap';

      const pieSvg = svgEl('svg', { viewBox: '0 0 200 130', width: '200', height: '130' });
      const pieCx = 100, pieCy = 52, pieRx = 75, pieRy = 42, pieDepth = 12;

      const piePt = (angle, dy) => ({
        x: (pieCx + pieRx * Math.cos(angle)).toFixed(2),
        y: (pieCy + pieRy * Math.sin(angle) + (dy || 0)).toFixed(2)
      });

      // Calculate slices (start from top, clockwise)
      const slices = [];
      let cumAngle = -Math.PI / 2;
      types.forEach((type) => {
        const pct = totals[type] / totalSize;
        if (pct === 0) return;
        slices.push({ type, start: cumAngle, end: cumAngle + pct * 2 * Math.PI, pct });
        cumAngle += pct * 2 * Math.PI;
      });

      // Back rim (dark ellipse at depth level)
      pieSvg.appendChild(svgEl('ellipse', { cx: pieCx, cy: pieCy + pieDepth, rx: pieRx, ry: pieRy, fill: '#686868' }));

      // Front-facing side faces (visible where sin(angle) > 0, i.e. angles 0 to pi)
      slices.forEach((s) => {
        const visStart = Math.max(s.start, 0);
        const visEnd = Math.min(s.end, Math.PI);
        if (visStart >= visEnd) return;

        const p1t = piePt(visStart, 0);
        const p1b = piePt(visStart, pieDepth);
        const p2t = piePt(visEnd, 0);
        const p2b = piePt(visEnd, pieDepth);
        const large = (visEnd - visStart) > Math.PI ? 1 : 0;

        const d = `M${p1t.x},${p1t.y}` +
                  ` A${pieRx},${pieRy} 0 ${large},1 ${p2t.x},${p2t.y}` +
                  ` L${p2b.x},${p2b.y}` +
                  ` A${pieRx},${pieRy} 0 ${large},0 ${p1b.x},${p1b.y} Z`;

        pieSvg.appendChild(svgEl('path', { d, fill: darkenHex(typeColor[s.type], 0.7) }));
      });

      // Top face slices
      slices.forEach((s) => {
        const p1 = piePt(s.start, 0);
        const p2 = piePt(s.end, 0);
        const large = s.pct > 0.5 ? 1 : 0;
        let d;

        if (s.pct >= 0.9999) {
          d = `M${pieCx - pieRx},${pieCy}` +
              ` A${pieRx},${pieRy} 0 1,1 ${pieCx + pieRx},${pieCy}` +
              ` A${pieRx},${pieRy} 0 1,1 ${pieCx - pieRx},${pieCy} Z`;
        } else {
          d = `M${pieCx},${pieCy}` +
              ` L${p1.x},${p1.y}` +
              ` A${pieRx},${pieRy} 0 ${large},1 ${p2.x},${p2.y} Z`;
        }

        pieSvg.appendChild(svgEl('path', { d, fill: typeColor[s.type] }));
      });

      // Subtle highlight on upper-left of top face
      pieSvg.appendChild(svgEl('ellipse', { cx: pieCx - 15, cy: pieCy - 8, rx: 30, ry: 18, fill: 'rgba(255,255,255,0.15)' }));

      pieWrap.appendChild(pieSvg);
      body.appendChild(pieWrap);

      // -- Legend (largest-remainder rounding so percentages sum to 100) --
      const rawPcts = types.map((type) => totals[type] / totalSize * 100);
      const floored = rawPcts.map((p) => Math.floor(p));
      const remainders = rawPcts.map((p, i) => p - floored[i]);
      const remainder = 100 - floored.reduce((a, b) => a + b, 0);
      const indices = types.map((_, i) => i);
      indices.sort((a, b) => remainders[b] - remainders[a]);
      for (let ri = 0; ri < remainder; ri++) floored[indices[ri]]++;
      const roundedPcts = floored;

      const legend = document.createElement('div');
      legend.className = 'du-legend';

      types.forEach((type, i) => {
        const row = document.createElement('div');
        row.className = 'du-legend-row';

        const chip = document.createElement('span');
        chip.className = 'du-chip';
        chip.style.background = typeColor[type];
        row.appendChild(chip);

        const label = document.createElement('span');
        label.className = 'du-legend-label';
        label.textContent = DU_TYPE_LABELS[type] || type.toUpperCase();
        row.appendChild(label);

        const sizeEl = document.createElement('span');
        sizeEl.className = 'du-legend-size';
        sizeEl.textContent = formatDuSize(totals[type]);
        row.appendChild(sizeEl);

        const pctEl = document.createElement('span');
        pctEl.className = 'du-legend-pct';
        pctEl.textContent = roundedPcts[i] === 0 ? '<1%' : `${roundedPcts[i]}%`;
        row.appendChild(pctEl);

        legend.appendChild(row);
      });

      body.appendChild(legend);

      // -- Capacity bar --
      const bar = document.createElement('div');
      bar.className = 'du-bar';

      types.forEach((type) => {
        const pct = totals[type] / totalSize * 100;
        if (pct === 0) return;
        const seg = document.createElement('div');
        seg.className = 'du-bar-seg';
        seg.style.width = `${pct}%`;
        seg.style.background = typeColor[type];
        bar.appendChild(seg);
      });

      body.appendChild(bar);

      // -- Total line --
      const totalEl = document.createElement('div');
      totalEl.className = 'du-total';
      totalEl.textContent = t('du.total', { size: formatDuSize(totalSize), count: fileCount });
      body.appendChild(totalEl);

      status.textContent = t('du.scanned', { count: fileCount });
    } catch (e) {
      showLoadingMessage(body, t('du.noFiles'));
    }
  };

  const openDiskUsage = () => {
    openWindow('diskusage');
    populateDiskUsage();
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Cryptography
   * ════════════════════════════════════════════════════════════════════════ */

  let cryptoBuilt = false;
  let cryptoCipher = 'caesar';
  let cryptoDirection = 'encrypt';
  let cryptoShift = 3;
  let cryptoSubKey = '';

  const cryptoCaesar = (text, shift, decrypt) => {
    const s = decrypt ? (26 - shift) % 26 : shift % 26;
    return text.replace(/[a-zA-Z]/g, (ch) => {
      const base = ch >= 'a' ? 97 : 65;
      return String.fromCharCode((ch.charCodeAt(0) - base + s) % 26 + base);
    });
  };

  const cryptoROT13 = (text) => cryptoCaesar(text, 13, false);

  const cryptoSubstitution = (text, key, decrypt) => {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    return text.replace(/[a-zA-Z]/g, (ch) => {
      const upper = ch.toUpperCase();
      const idx = decrypt ? key.indexOf(upper) : alpha.indexOf(upper);
      if (idx < 0) return ch;
      const mapped = decrypt ? alpha[idx] : key[idx];
      return ch >= 'a' && ch <= 'z' ? mapped.toLowerCase() : mapped;
    });
  };

  const cryptoGenSubKey = () => {
    const arr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr.join('');
  };

  const cryptoRun = () => {
    const inp = document.getElementById('cryInput');
    const out = document.getElementById('cryOutput');
    const status = document.getElementById('cryptoStatus');
    if (!inp || !out) return;
    const text = inp.value;
    if (!text) {
      out.textContent = '';
      status.textContent = `${t('crypto.mode')}: ${cryptoDirection === 'encrypt' ? t('crypto.encrypt') : t('crypto.decrypt')}`;
      return;
    }
    let result = '';
    if (cryptoCipher === 'caesar') {
      result = cryptoCaesar(text, cryptoShift, cryptoDirection === 'decrypt');
      const preview = [];
      for (let i = 0; i < Math.min(6, 26); i++) {
        const from = String.fromCharCode(65 + i);
        const shift = cryptoDirection === 'decrypt' ? (26 - cryptoShift) % 26 : cryptoShift % 26;
        const to = String.fromCharCode((i + shift) % 26 + 65);
        preview.push(`${from}\u2192${to}`);
      }
      status.textContent = `${preview.join(', ')} \u2026`;
    } else if (cryptoCipher === 'rot13') {
      result = cryptoROT13(text);
      status.textContent = 'A\u2192N, B\u2192O, C\u2192P, D\u2192Q \u2026';
    } else {
      if (!cryptoSubKey) {
        cryptoSubKey = cryptoGenSubKey();
        const kd = document.getElementById('cryKeyDisplay');
        if (kd) kd.textContent = cryptoSubKey;
      }
      result = cryptoSubstitution(text, cryptoSubKey, cryptoDirection === 'decrypt');
      const prev = [];
      for (let k = 0; k < Math.min(4, 26); k++) {
        prev.push(`${String.fromCharCode(65 + k)}\u2192${cryptoSubKey[k]}`);
      }
      status.textContent = `${prev.join(', ')} \u2026`;
    }
    out.textContent = result;
  };

  const cryptoSwapIO = () => {
    const inp = document.getElementById('cryInput');
    const out = document.getElementById('cryOutput');
    if (!inp || !out || !out.textContent) return;
    inp.value = out.textContent;
    cryptoDirection = cryptoDirection === 'encrypt' ? 'decrypt' : 'encrypt';
    const encRadio = document.getElementById('cryEncrypt');
    const decRadio = document.getElementById('cryDecrypt');
    if (encRadio) encRadio.checked = cryptoDirection === 'encrypt';
    if (decRadio) decRadio.checked = cryptoDirection === 'decrypt';
    cryptoRun();
  };

  const cryptoCopyOutput = async () => {
    const out = document.getElementById('cryOutput');
    if (!out || !out.textContent) return;
    try {
      await navigator.clipboard.writeText(out.textContent);
      const status = document.getElementById('cryptoStatus');
      if (status) { status.textContent = 'Copied to clipboard!'; setTimeout(() => { cryptoRun(); }, 1500); }
    } catch (e) {
      // clipboard write failed silently
    }
  };

  const cryptoBuildUI = () => {
    const body = document.getElementById('cryptographyBody');
    if (!body || cryptoBuilt) return;
    body.innerHTML = '';

    // Cipher selector row
    const cipherRow = document.createElement('div');
    cipherRow.className = 'cry-row';
    const cipherLabel = document.createElement('span');
    cipherLabel.className = 'cry-label';
    cipherLabel.textContent = t('crypto.cipher');
    cipherLabel.setAttribute('data-i18n', 'crypto.cipher');
    const cipherSel = document.createElement('select');
    cipherSel.className = 'cry-select';
    cipherSel.id = 'cryCipherSel';
    const optCaesar = document.createElement('option');
    optCaesar.value = 'caesar'; optCaesar.textContent = t('crypto.caesarName'); optCaesar.setAttribute('data-i18n', 'crypto.caesarName');
    const optROT = document.createElement('option');
    optROT.value = 'rot13'; optROT.textContent = 'ROT13';
    const optSub = document.createElement('option');
    optSub.value = 'substitution'; optSub.textContent = t('crypto.subName'); optSub.setAttribute('data-i18n', 'crypto.subName');
    cipherSel.appendChild(optCaesar);
    cipherSel.appendChild(optROT);
    cipherSel.appendChild(optSub);
    cipherRow.appendChild(cipherLabel);
    cipherRow.appendChild(cipherSel);
    body.appendChild(cipherRow);

    // Direction row
    const dirRow = document.createElement('div');
    dirRow.className = 'cry-direction-row';
    dirRow.id = 'cryDirectionRow';
    const dirLabel = document.createElement('span');
    dirLabel.className = 'cry-label';
    dirLabel.textContent = t('crypto.mode');
    dirLabel.setAttribute('data-i18n', 'crypto.mode');
    dirRow.appendChild(dirLabel);
    const encLabel = document.createElement('label');
    const encRadio = document.createElement('input');
    encRadio.type = 'radio'; encRadio.name = 'cryDir'; encRadio.id = 'cryEncrypt'; encRadio.checked = true;
    const encText = document.createTextNode(` ${t('crypto.encrypt')}`);
    encLabel.appendChild(encRadio); encLabel.appendChild(encText);
    const decLabel = document.createElement('label');
    const decRadio = document.createElement('input');
    decRadio.type = 'radio'; decRadio.name = 'cryDir'; decRadio.id = 'cryDecrypt';
    const decText = document.createTextNode(` ${t('crypto.decrypt')}`);
    decLabel.appendChild(decRadio); decLabel.appendChild(decText);
    dirRow.appendChild(encLabel);
    dirRow.appendChild(decLabel);
    body.appendChild(dirRow);

    // Shift row (Caesar only)
    const shiftRow = document.createElement('div');
    shiftRow.className = 'cry-shift-row';
    shiftRow.id = 'cryShiftRow';
    const shiftLabel = document.createElement('span');
    shiftLabel.className = 'cry-label';
    shiftLabel.textContent = t('crypto.shift');
    shiftLabel.setAttribute('data-i18n', 'crypto.shift');
    const shiftSlider = document.createElement('input');
    shiftSlider.type = 'range'; shiftSlider.min = '1'; shiftSlider.max = '25'; shiftSlider.value = '3';
    shiftSlider.id = 'cryShiftSlider'; shiftSlider.style.flex = '1';
    const shiftVal = document.createElement('span');
    shiftVal.id = 'cryShiftVal'; shiftVal.style.fontSize = '12px'; shiftVal.style.fontFamily = 'var(--mono)'; shiftVal.style.minWidth = '20px';
    shiftVal.textContent = '3';
    shiftRow.appendChild(shiftLabel);
    shiftRow.appendChild(shiftSlider);
    shiftRow.appendChild(shiftVal);
    body.appendChild(shiftRow);

    // Substitution key row (hidden initially)
    const keyRow = document.createElement('div');
    keyRow.id = 'cryKeyRow'; keyRow.style.display = 'none';
    const keyLabel = document.createElement('div');
    keyLabel.className = 'cry-row';
    const keyLabelSpan = document.createElement('span');
    keyLabelSpan.className = 'cry-label';
    keyLabelSpan.textContent = t('crypto.key');
    keyLabelSpan.setAttribute('data-i18n', 'crypto.key');
    const keyBtn = document.createElement('button');
    keyBtn.type = 'button'; keyBtn.className = 'cry-btn'; keyBtn.textContent = t('crypto.genKey');
    keyLabel.appendChild(keyLabelSpan);
    keyLabel.appendChild(keyBtn);
    keyRow.appendChild(keyLabel);
    const keyDisplay = document.createElement('div');
    keyDisplay.className = 'cry-key-display';
    keyDisplay.id = 'cryKeyDisplay';
    keyDisplay.textContent = cryptoSubKey || '\u2014';
    keyRow.appendChild(keyDisplay);
    body.appendChild(keyRow);

    // Input
    const inLabel = document.createElement('div');
    inLabel.className = 'cry-label'; inLabel.style.marginBottom = '4px';
    inLabel.textContent = t('crypto.input');
    inLabel.setAttribute('data-i18n', 'crypto.input');
    body.appendChild(inLabel);
    const textarea = document.createElement('textarea');
    textarea.className = 'cry-textarea'; textarea.id = 'cryInput';
    textarea.placeholder = t('crypto.inputPlaceholder');
    body.appendChild(textarea);

    // Button row
    const btnRow = document.createElement('div');
    btnRow.className = 'cry-btn-row';
    const applyBtn = document.createElement('button');
    applyBtn.type = 'button'; applyBtn.className = 'cry-btn cry-primary'; applyBtn.textContent = t('crypto.run');
    const swapBtn = document.createElement('button');
    swapBtn.type = 'button'; swapBtn.className = 'cry-btn'; swapBtn.textContent = t('crypto.swap');
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button'; clearBtn.className = 'cry-btn'; clearBtn.textContent = 'Clear';
    btnRow.appendChild(applyBtn);
    btnRow.appendChild(swapBtn);
    btnRow.appendChild(clearBtn);
    body.appendChild(btnRow);

    // Output
    const outLabel = document.createElement('div');
    outLabel.className = 'cry-label'; outLabel.style.marginBottom = '4px';
    outLabel.textContent = t('crypto.output');
    outLabel.setAttribute('data-i18n', 'crypto.output');
    body.appendChild(outLabel);
    const outputDiv = document.createElement('div');
    outputDiv.className = 'cry-output'; outputDiv.id = 'cryOutput';
    body.appendChild(outputDiv);

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button'; copyBtn.className = 'cry-btn'; copyBtn.textContent = t('crypto.copy');
    body.appendChild(copyBtn);

    // Event handlers
    cipherSel.onchange = () => {
      cryptoCipher = cipherSel.value;
      shiftRow.style.display = cryptoCipher === 'caesar' ? '' : 'none';
      dirRow.style.display = cryptoCipher === 'rot13' ? 'none' : '';
      keyRow.style.display = cryptoCipher === 'substitution' ? '' : 'none';
      if (cryptoCipher === 'substitution' && !cryptoSubKey) {
        cryptoSubKey = cryptoGenSubKey();
        keyDisplay.textContent = cryptoSubKey;
      }
      cryptoRun();
    };
    encRadio.onchange = () => { cryptoDirection = 'encrypt'; cryptoRun(); };
    decRadio.onchange = () => { cryptoDirection = 'decrypt'; cryptoRun(); };
    shiftSlider.oninput = () => { cryptoShift = parseInt(shiftSlider.value, 10); shiftVal.textContent = shiftSlider.value; cryptoRun(); };
    keyBtn.onclick = () => { cryptoSubKey = cryptoGenSubKey(); keyDisplay.textContent = cryptoSubKey; cryptoRun(); };
    textarea.oninput = () => { cryptoRun(); };
    applyBtn.onclick = () => { cryptoRun(); };
    swapBtn.onclick = () => { cryptoSwapIO(); };
    clearBtn.onclick = () => { textarea.value = ''; outputDiv.textContent = ''; document.getElementById('cryptoStatus').textContent = 'Ready'; };
    copyBtn.onclick = () => { cryptoCopyOutput(); };

    cryptoBuilt = true;
  };

  const openCryptography = () => {
    if (!cryptoBuilt) cryptoBuildUI();
    openWindow('cryptography');
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Slot Machine
   * ════════════════════════════════════════════════════════════════════════ */

  let smBuilt = false;
  let smSpinning = false;
  let smCredits = 500;
  let smBetPerLine = 1;
  let smLines = 5;
  let smWin = 0;
  let smFreeSpins = 0;
  let smFreeMultiplier = 1;
  let smHoldOffered = false;
  let smNudgeOffered = false;
  let smNudgesLeft = 0;
  let smHeldReels = [false, false, false];
  let smReelResults = [[0,0,0],[0,0,0],[0,0,0]]; // [reel][row] indices into SM_SYMBOLS
  let smAnimTimers = [];
  let smAudioCtx = null;
  let smInsertCoinCooldown = 0;
  let smWinStreak = 0;
  let smBestStreak = 0;
  let smTotalSpins = 0;
  let smTotalWon = 0;
  let smBiggestWin = 0;
  let smAutoPlay = false;
  let smAutoTimer = null;
  let smIntroShown = false;
  let smLastPlayDate = '';
  let smDailyBonusClaimed = false;
  let smLastSpinNearMiss = false;

  const SM_SYMBOLS = [
    { ch: '7',    cls: 'sm-sym-seven',   tier: 'jackpot' },
    { ch: 'BAR',  cls: 'sm-sym-bar',     tier: 'high' },
    { ch: '\u2407', cls: 'sm-sym-bell',  tier: 'high' },
    { ch: '\u2605', cls: 'sm-sym-star',  tier: 'mid' },
    { ch: '\u2666', cls: 'sm-sym-diamond', tier: 'mid' },
    { ch: '\u2665', cls: 'sm-sym-heart', tier: 'mid' },
    { ch: '\u2660', cls: 'sm-sym-spade', tier: 'low' },
    { ch: '\u2663', cls: 'sm-sym-club',  tier: 'low' },
    { ch: '\u2731', cls: 'sm-sym-scatter', tier: 'scatter' }
  ];

  // Reel strips: 20 positions each, indices into SM_SYMBOLS
  // 7=0, BAR=1, Bell=2, Star=3, Diamond=4, Heart=5, Spade=6, Club=7, Scatter=8
  const SM_REELS = [
    [7,3,5,6,1,4,7,2,6,8,5,4,0,3,7,1,6,5,4,2],
    [6,4,1,5,7,3,2,6,5,4,7,8,3,0,1,6,5,7,4,2],
    [5,7,4,6,2,3,1,7,5,6,4,3,8,7,0,6,5,1,4,2]
  ];

  const SM_PAY_TABLE = [
    { match: [0,0,0], payout: 250, label: '7 7 7' },
    { match: [1,1,1], payout: 50, label: 'BAR BAR BAR' },
    { match: [2,2,2], payout: 25, label: '\u2407 \u2407 \u2407' },
    { match: [3,3,3], payout: 15, label: '\u2605 \u2605 \u2605' },
    { match: [4,4,4], payout: 10, label: '\u2666 \u2666 \u2666' },
    { match: [5,5,5], payout: 10, label: '\u2665 \u2665 \u2665' },
    { match: [6,6,6], payout: 5, label: '\u2660 \u2660 \u2660' },
    { match: [7,7,7], payout: 5, label: '\u2663 \u2663 \u2663' }
  ];

  const SM_PAYLINES = [
    [1,1,1], // center row
    [0,0,0], // top row
    [2,2,2], // bottom row
    [0,1,2], // diagonal top-left to bottom-right
    [2,1,0]  // diagonal bottom-left to top-right
  ];

  let smCells = []; // [reel][row] DOM elements
  let smHoldBtns = [];
  let smNudgeBtns = []; // [reel][0=up, 1=down]

  const smGetVolume = () => {
    const raw = parseFloat(localStorage.getItem('mp-volume') || '0.1');
    const muted = localStorage.getItem('mp-muted') === '1';
    return muted ? 0 : raw * 0.15;
  };

  const smPlayTone = (freq, duration, type) => {
    if (!smAudioCtx) smAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const vol = smGetVolume();
    if (vol <= 0) return;
    const osc = smAudioCtx.createOscillator();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, smAudioCtx.currentTime);
    const gain = smAudioCtx.createGain();
    gain.gain.setValueAtTime(vol, smAudioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, smAudioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(smAudioCtx.destination);
    osc.start();
    osc.stop(smAudioCtx.currentTime + duration);
  };

  const smSoundSpin = () => {
    smPlayTone(440, 0.06);
    setTimeout(() => { smPlayTone(554, 0.06); }, 50);
    setTimeout(() => { smPlayTone(659, 0.06); }, 100);
  };
  const smSoundReelStop = () => smPlayTone(150, 0.08, 'triangle');
  const smSoundSmallWin = () => {
    smPlayTone(523, 0.1);
    setTimeout(() => { smPlayTone(659, 0.15); }, 100);
  };
  const smSoundBigWin = () => {
    const notes = [523, 587, 659, 698, 784, 880];
    notes.forEach((n, i) => { setTimeout(() => { smPlayTone(n, 0.12); }, i * 80); });
  };
  const smSoundHoldNudge = () => {
    smPlayTone(880, 0.05);
    setTimeout(() => { smPlayTone(1047, 0.05); }, 60);
  };
  const smSoundNoCredits = () => {
    smPlayTone(392, 0.1);
    setTimeout(() => { smPlayTone(330, 0.1); }, 100);
    setTimeout(() => { smPlayTone(262, 0.15); }, 200);
  };

  const smUpdateDisplays = () => {
    const cd = document.getElementById('smCreditDisplay');
    const bd = document.getElementById('smBetDisplay');
    const wd = document.getElementById('smWinDisplay');
    if (cd) cd.textContent = smCredits;
    if (bd) bd.textContent = smBetPerLine * smLines;
    if (wd) wd.textContent = smWin > 0 ? smWin : '--';
    const st = document.getElementById('smStatus');
    if (st) {
      if (smFreeSpins > 0) st.textContent = t('sm.freeSpinsLeft', { count: smFreeSpins });
      else st.textContent = t('sm.credits', { count: smCredits });
    }
  };

  const smSetLines = (n) => {
    if (smSpinning) return;
    smLines = n;
    const btns = document.querySelectorAll('.sm-opt-btn[data-lines]');
    btns.forEach((b) => { b.classList.toggle('sm-opt-active', parseInt(b.dataset.lines) === n); });
    smUpdateDisplays();
  };

  const smSetBet = (n) => {
    if (smSpinning) return;
    smBetPerLine = n;
    const btns = document.querySelectorAll('.sm-opt-btn[data-bet]');
    btns.forEach((b) => { b.classList.toggle('sm-opt-active', parseInt(b.dataset.bet) === n); });
    smUpdateDisplays();
  };

  const smTogglePayTable = () => {
    const panel = document.getElementById('smPayPanel');
    if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
  };

  const smToggleHold = (reelIdx) => {
    if (!smHoldOffered || smSpinning) return;
    smHeldReels[reelIdx] = !smHeldReels[reelIdx];
    smHoldBtns[reelIdx].classList.toggle('sm-hold-active', smHeldReels[reelIdx]);
  };

  // Track strip positions per reel for nudge
  let smReelPositions = [0, 0, 0]; // top-row position in strip

  const smAnimateWin = (cells) => {
    let count = 0;
    const flashTimer = setInterval(() => {
      cells.forEach((c) => {
        smCells[c[0]][c[1]].classList.toggle('sm-win');
      });
      count++;
      if (count >= 6) clearInterval(flashTimer);
    }, 200);
  };

  const smAnimateWinCounter = () => {
    const wd = document.getElementById('smWinDisplay');
    if (!wd || smWin <= 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(smWin / 15));
    const ct = setInterval(() => {
      current += step;
      if (current >= smWin) { current = smWin; clearInterval(ct); }
      wd.textContent = current;
    }, 50);
  };

  const smAnimateJackpot = () => {
    const st = document.getElementById('smStatus');
    if (!st) return;
    const colors = ['#ef5350', '#ffc107', '#4caf50', '#2196f3', '#9c27b0'];
    let i = 0;
    const jt = setInterval(() => {
      st.style.color = colors[i % colors.length];
      i++;
      if (i >= 15) { clearInterval(jt); st.style.color = ''; }
    }, 100);
  };

  const smSaveState = () => {
    try {
      localStorage.setItem('mpOS-slotmachine', JSON.stringify({
        credits: smCredits,
        freeSpins: smFreeSpins,
        winStreak: smWinStreak,
        bestStreak: smBestStreak,
        totalSpins: smTotalSpins,
        totalWon: smTotalWon,
        biggestWin: smBiggestWin,
        lastPlayDate: smLastPlayDate,
        dailyBonusClaimed: smDailyBonusClaimed
      }));
    } catch (e) { /* ignore */ }
  };

  const smLoadState = () => {
    try {
      const raw = localStorage.getItem('mpOS-slotmachine');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (typeof state.credits === 'number') smCredits = state.credits;
      if (typeof state.freeSpins === 'number') smFreeSpins = state.freeSpins;
      if (typeof state.winStreak === 'number') smWinStreak = state.winStreak;
      if (typeof state.bestStreak === 'number') smBestStreak = state.bestStreak;
      if (typeof state.totalSpins === 'number') smTotalSpins = state.totalSpins;
      if (typeof state.totalWon === 'number') smTotalWon = state.totalWon;
      if (typeof state.biggestWin === 'number') smBiggestWin = state.biggestWin;
      if (typeof state.lastPlayDate === 'string') smLastPlayDate = state.lastPlayDate;
      if (typeof state.dailyBonusClaimed === 'boolean') smDailyBonusClaimed = state.dailyBonusClaimed;
    } catch (e) { /* ignore */ }
  };

  const smOfferHold = () => {
    smHoldOffered = true;
    smHeldReels = [false, false, false];
    smHoldBtns.forEach((b) => { b.classList.remove('sm-hold-active'); });
    document.getElementById('smHoldRow').style.display = '';
    smSoundHoldNudge();
    const st = document.getElementById('smStatus');
    if (st) st.textContent = t('sm.holdOffered');
  };

  const smOfferNudge = () => {
    smNudgeOffered = true;
    smNudgesLeft = Math.floor(Math.random() * 3) + 1;
    document.getElementById('smNudgeRow').style.display = '';
    smSoundHoldNudge();
    const st = document.getElementById('smStatus');
    if (st) st.textContent = t('sm.nudgeOffered', { count: smNudgesLeft });
  };

  const smOfferInsertCoin = async () => {
    const now = Date.now();
    if (now - smInsertCoinCooldown < 30000) {
      const st = document.getElementById('smStatus');
      if (st) st.textContent = t('sm.waitCooldown');
      return;
    }
    const ok = await mpConfirm(t('sm.gameOver'));
    if (ok) {
      smInsertCoinCooldown = Date.now();
      smCredits += 100;
      smUpdateDisplays();
      smSaveState();
    }
  };

  const smCheckDailyBonus = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (smLastPlayDate !== today) {
      smLastPlayDate = today;
      smDailyBonusClaimed = false;
    }
    if (!smDailyBonusClaimed && smTotalSpins > 0) {
      smDailyBonusClaimed = true;
      const bonus = smTotalSpins >= 500 ? 100 : smTotalSpins >= 100 ? 75 : 50;
      smCredits += bonus;
      smSaveState();
      return bonus;
    }
    return 0;
  };

  const smDismissIntro = () => {
    smIntroShown = true;
    const intro = document.getElementById('smIntro');
    if (intro) intro.style.display = 'none';
    document.getElementById('slotmachine')?.focus();
  };

  const smAutoPlayNext = () => {
    if (!smAutoPlay) return;
    if (smCredits <= 0 && smFreeSpins <= 0) {
      smAutoPlay = false;
      const btn = document.getElementById('smAutoBtn');
      if (btn) { btn.classList.remove('sm-auto-active'); btn.textContent = t('sm.auto'); }
      return;
    }
    smAutoTimer = setTimeout(() => {
      if (smAutoPlay && !smSpinning) smSpin();
    }, 1500);
  };

  const smToggleAutoPlay = () => {
    smAutoPlay = !smAutoPlay;
    const btn = document.getElementById('smAutoBtn');
    if (btn) {
      btn.classList.toggle('sm-auto-active', smAutoPlay);
      btn.textContent = smAutoPlay ? t('sm.autoStop') : t('sm.auto');
    }
    if (smAutoPlay && !smSpinning) {
      smAutoPlayNext();
    } else if (!smAutoPlay && smAutoTimer) {
      clearTimeout(smAutoTimer);
      smAutoTimer = null;
    }
  };

  const smAddTooltips = () => {
    const body = document.getElementById('slotmachineBody');
    if (!body) return;
    const tips = [
      ['#smCreditDisplay', 'sm.tipCredit'],
      ['#smBetDisplay', 'sm.tipBet'],
      ['#smWinDisplay', 'sm.tipWin'],
      ['#smSpinBtn', 'sm.tipSpin'],
      ['#smAutoBtn', 'sm.tipAuto'],
    ];
    tips.forEach(([sel, key]) => {
      const el = body.querySelector(sel);
      if (el) el.setAttribute('data-tip', t(key));
    });
    body.querySelectorAll('.sm-max-btn').forEach((b) => { b.setAttribute('data-tip', t('sm.tipMaxBet')); });
    body.querySelectorAll('.sm-pay-btn').forEach((b) => { b.setAttribute('data-tip', t('sm.tipPayTable')); });
    body.querySelectorAll('.sm-opt-btn[data-lines]').forEach((b) => {
      b.setAttribute('data-tip', `${b.dataset.lines} ${t('sm.lines').replace(':', '')}`);
    });
    body.querySelectorAll('.sm-opt-btn[data-bet]').forEach((b) => {
      b.setAttribute('data-tip', `${t('sm.betPerLine').replace(':', '')} ${b.dataset.bet}`);
    });
    body.querySelectorAll('.sm-hold-btn').forEach((b) => { b.setAttribute('data-tip', t('sm.tipHold')); });
    body.querySelectorAll('.sm-nudge-btn').forEach((b) => {
      b.setAttribute('data-tip', b.textContent === '\u25B2' ? t('sm.tipNudgeUp') : t('sm.tipNudgeDown'));
    });
  };

  const smSoundTension = () => {
    const notes = [220, 233, 247, 262, 277, 294, 311, 330];
    notes.forEach((n, i) => { setTimeout(() => { smPlayTone(n, 0.08, 'sine'); }, i * 100); });
  };

  // Forward-declared; assigned below after smEvaluateWins is defined
  let smEvaluateWins;

  const smNudge = (reelIdx, dir) => {
    if (!smNudgeOffered || smNudgesLeft <= 0 || smSpinning) return;
    const strip = SM_REELS[reelIdx];
    const len = strip.length;
    // Shift reel position (dir: -1=up, +1=down)
    smReelPositions[reelIdx] = (smReelPositions[reelIdx] + dir + len) % len;
    for (let row = 0; row < 3; row++) {
      smReelResults[reelIdx][row] = strip[(smReelPositions[reelIdx] + row) % len];
    }
    for (let row2 = 0; row2 < 3; row2++) {
      const sym = smReelResults[reelIdx][row2];
      smCells[reelIdx][row2].textContent = SM_SYMBOLS[sym].ch;
      smCells[reelIdx][row2].className = `sm-cell ${SM_SYMBOLS[sym].cls}`;
    }
    smNudgesLeft--;
    smSoundReelStop();
    if (smNudgesLeft <= 0) {
      smNudgeOffered = false;
      document.getElementById('smNudgeRow').style.display = 'none';
      smEvaluateWins();
    }
  };

  smEvaluateWins = () => {
    smWin = 0;
    let winCells = [];

    // Check paylines
    const activeLines = SM_PAYLINES.slice(0, smLines);
    for (let li = 0; li < activeLines.length; li++) {
      const line = activeLines[li];
      const syms = [smReelResults[0][line[0]], smReelResults[1][line[1]], smReelResults[2][line[2]]];

      // Check 3-of-a-kind
      let matched = false;
      for (let pi = 0; pi < SM_PAY_TABLE.length; pi++) {
        const pay = SM_PAY_TABLE[pi];
        if (syms[0] === pay.match[0] && syms[1] === pay.match[1] && syms[2] === pay.match[2]) {
          smWin += pay.payout * smBetPerLine;
          winCells.push([0, line[0]], [1, line[1]], [2, line[2]]);
          matched = true;
          break;
        }
      }
      if (!matched) {
        // Check 2-of-a-kind for 7, BAR, Bell
        const partials = [[0, 5], [1, 3], [2, 2]]; // symbolIdx, payout
        for (let pk = 0; pk < partials.length; pk++) {
          const pSym = partials[pk][0];
          const pPay = partials[pk][1];
          let count = 0;
          const pCells = [];
          for (let s = 0; s < 3; s++) {
            if (syms[s] === pSym) { count++; pCells.push([s, line[s]]); }
          }
          if (count >= 2) {
            smWin += pPay * smBetPerLine;
            winCells = winCells.concat(pCells);
            break;
          }
        }
      }
    }

    // Check scatters (anywhere on grid)
    let scatterCount = 0;
    const scatterCells = [];
    for (let sr = 0; sr < 3; sr++) {
      for (let srow = 0; srow < 3; srow++) {
        if (smReelResults[sr][srow] === 8) {
          scatterCount++;
          scatterCells.push([sr, srow]);
        }
      }
    }
    if (scatterCount >= 2) {
      winCells = winCells.concat(scatterCells);
      if (scatterCount >= 3) {
        smFreeSpins += 10;
        smFreeMultiplier = 2;
        smWin += 5 * smBetPerLine * smLines;
      } else {
        smFreeSpins += 5;
        smFreeMultiplier = 1;
        smWin += 2 * smBetPerLine * smLines;
      }
      smSoundHoldNudge();
    }

    // Apply free spin multiplier
    if (smFreeMultiplier > 1 && smFreeSpins > 0) {
      smWin = smWin * smFreeMultiplier;
    }

    smCredits += smWin;

    // Streak tracking
    smTotalSpins++;
    if (smWin > 0) {
      smWinStreak++;
      smTotalWon += smWin;
      if (smWin > smBiggestWin) smBiggestWin = smWin;
      if (smWinStreak > smBestStreak) smBestStreak = smWinStreak;
    } else {
      smWinStreak = 0;
    }
    const streakBadge = document.getElementById('smStreakBadge');
    if (streakBadge) {
      if (smWinStreak >= 2) {
        streakBadge.textContent = `${t('sm.hot')} x${smWinStreak}`;
        streakBadge.style.display = '';
      } else {
        streakBadge.style.display = 'none';
      }
    }

    // Animate wins
    if (winCells.length > 0) {
      smAnimateWin(winCells);
      if (smWin >= 250 * smBetPerLine) {
        smSoundBigWin();
        const st = document.getElementById('smStatus');
        if (st) st.textContent = t('sm.jackpot');
        smAnimateJackpot();
      } else if (smWin > 0) {
        smSoundSmallWin();
      }
      smAnimateWinCounter();
    }

    // Big win: shake the window
    if (smWin >= 50 * smBetPerLine) {
      document.getElementById('slotmachine')?.classList.add('sm-big-win-shake');
      setTimeout(() => { document.getElementById('slotmachine')?.classList.remove('sm-big-win-shake'); }, 600);
    }

    smUpdateDisplays();
    smSaveState();

    // Override status with special messages (auto-revert after 2s)
    const totalBetAmt = smBetPerLine * smLines;
    if (smWin >= 250 * smBetPerLine) {
      // Jackpot already handled above
    } else if (smWin > 0 && smWin < totalBetAmt) {
      const st = document.getElementById('smStatus');
      if (st) st.textContent = t('sm.bonusWin');
      setTimeout(() => smUpdateDisplays(), 2000);
    } else if (smWinStreak >= 3 && smWin > 0) {
      const st = document.getElementById('smStatus');
      if (st) st.textContent = `${t('sm.hot')} x${smWinStreak}!`;
      setTimeout(() => smUpdateDisplays(), 2000);
    } else if (smWin === 0 && smLastSpinNearMiss) {
      const st = document.getElementById('smStatus');
      if (st) st.textContent = t('sm.nearMiss');
      setTimeout(() => smUpdateDisplays(), 2000);
    }

    // Offer hold or nudge (only if not in free spins and not already offered)
    if (smFreeSpins <= 0 && smWin === 0) {
      const holdChance = Math.random();
      const nudgeChance = Math.random();
      if (holdChance < 0.25) {
        smOfferHold();
      } else if (nudgeChance < 0.15) {
        smOfferNudge();
      }
    }

    // Check if out of credits
    if (smCredits <= 0 && smFreeSpins <= 0) {
      setTimeout(() => {
        smSoundNoCredits();
        smOfferInsertCoin();
      }, 500);
    }
  };

  const smLastUnheldReel = () => {
    for (let i = 2; i >= 0; i--) { if (!smHeldReels[i]) return i; }
    return 2;
  };

  const smAfterSpin = () => {
    smSpinning = false;
    const spinBtn = document.getElementById('smSpinBtn');
    if (spinBtn) spinBtn.disabled = false;
    smEvaluateWins();
    // Auto-play next spin (skip if hold/nudge offered — let player interact)
    if (smAutoPlay && !smHoldOffered && !smNudgeOffered) {
      smAutoPlayNext();
    }
  };

  const smSpinReels = (isRespin) => {
    smSpinning = true;
    smSoundSpin();
    const spinBtn = document.getElementById('smSpinBtn');
    if (spinBtn) spinBtn.disabled = true;

    // Clear previous win highlights
    for (let r = 0; r < 3; r++) {
      for (let row = 0; row < 3; row++) {
        smCells[r][row].classList.remove('sm-win');
      }
    }

    // Generate results for non-held reels
    for (let ri = 0; ri < 3; ri++) {
      if (isRespin && smHeldReels[ri]) continue;
      const strip = SM_REELS[ri];
      const pos = Math.floor(Math.random() * strip.length);
      smReelPositions[ri] = pos;
      for (let row2 = 0; row2 < 3; row2++) {
        smReelResults[ri][row2] = strip[(pos + row2) % strip.length];
      }
    }

    // Near-miss detection: first 2 reels match high-value symbol on center payline
    let isNearMiss = false;
    if (!isRespin) {
      const c0 = smReelResults[0][1];
      const c1 = smReelResults[1][1];
      isNearMiss = c0 === c1 && c0 <= 2 && smReelResults[2][1] !== c0;
      // Near-miss bias: 30% chance to place matching symbol just off center on reel 3
      if (isNearMiss && Math.random() < 0.3) {
        const strip = SM_REELS[2];
        for (let si = 0; si < strip.length; si++) {
          if (strip[si] === c0) {
            const targetRow = Math.random() < 0.5 ? 0 : 2;
            const newPos = (si - targetRow + strip.length) % strip.length;
            smReelPositions[2] = newPos;
            for (let row = 0; row < 3; row++) {
              smReelResults[2][row] = strip[(newPos + row) % strip.length];
            }
            break;
          }
        }
      }
    }
    smLastSpinNearMiss = isNearMiss;

    // Animate each reel (slower 3rd reel on near-miss for tension)
    const reelDelays = isNearMiss ? [800, 1200, 2600] : [800, 1200, 1600];
    const startTime = Date.now();

    // Near-miss: flash matching symbols on reels 0-1 while reel 2 is still spinning
    if (isNearMiss) {
      setTimeout(() => {
        smCells[0][1].classList.add('sm-near-miss');
        smCells[1][1].classList.add('sm-near-miss');
        smSoundTension();
      }, 1300);
      setTimeout(() => {
        smCells[0][1].classList.remove('sm-near-miss');
        smCells[1][1].classList.remove('sm-near-miss');
      }, 2600);
    }

    for (let ai = 0; ai < 3; ai++) {
      if (isRespin && smHeldReels[ai]) continue;
      ((reelIdx) => {
        const tick = () => {
          const elapsed = Date.now() - startTime;
          if (elapsed >= reelDelays[reelIdx]) {
            // Set final symbols
            for (let row2 = 0; row2 < 3; row2++) {
              const sym = smReelResults[reelIdx][row2];
              smCells[reelIdx][row2].textContent = SM_SYMBOLS[sym].ch;
              smCells[reelIdx][row2].className = `sm-cell ${SM_SYMBOLS[sym].cls} sm-stop-bounce`;
            }
            smSoundReelStop();
            // Check if all reels done
            if (reelIdx === 2 || (isRespin && reelIdx === smLastUnheldReel())) {
              setTimeout(() => { smAfterSpin(); }, 200);
            }
            return;
          }
          // Show random symbols during spin
          for (let row = 0; row < 3; row++) {
            const randSym = Math.floor(Math.random() * SM_SYMBOLS.length);
            smCells[reelIdx][row].textContent = SM_SYMBOLS[randSym].ch;
            smCells[reelIdx][row].className = 'sm-cell sm-spinning';
          }
          // Decelerate as approaching stop time
          const remaining = reelDelays[reelIdx] - elapsed;
          const delay = remaining < 200 ? 200 : remaining < 400 ? 120 : remaining < 600 ? 80 : 60;
          const timer = setTimeout(tick, delay);
          smAnimTimers.push(timer);
        };
        tick();
      })(ai);
    }

    // If all reels held (shouldn't happen, but safety)
    if (isRespin && smHeldReels[0] && smHeldReels[1] && smHeldReels[2]) {
      smAfterSpin();
    }
  };

  const smSpin = () => {
    if (smSpinning) return;
    // If hold is offered, this is the re-spin
    if (smHoldOffered) {
      smHoldOffered = false;
      document.getElementById('smHoldRow').style.display = 'none';
      smSpinReels(true);
      return;
    }
    // If nudge offered, cancel it
    if (smNudgeOffered) {
      smNudgeOffered = false;
      document.getElementById('smNudgeRow').style.display = 'none';
    }

    let totalBet = smBetPerLine * smLines;
    if (smFreeSpins > 0) {
      smFreeSpins--;
      totalBet = 0;
    } else if (smCredits < totalBet) {
      smSoundNoCredits();
      smOfferInsertCoin();
      return;
    }
    smCredits -= totalBet;
    smWin = 0;
    smHeldReels = [false, false, false];
    smUpdateDisplays();
    smSpinReels(false);
  };

  const smMaxBet = () => {
    if (smSpinning) return;
    smSetLines(5);
    smSetBet(10);
    smSpin();
  };

  const smBuildUI = () => {
    const body = document.getElementById('slotmachineBody');
    if (!body || smBuilt) return;

    // LCD display row
    const lcdRow = document.createElement('div');
    lcdRow.className = 'sm-lcd-row';
    const lcdCredit = document.createElement('div');
    lcdCredit.className = 'sm-lcd';
    lcdCredit.innerHTML = `<span class="sm-lcd-label" data-i18n="sm.credit">CREDIT</span><span class="sm-lcd-val" id="smCreditDisplay">${smCredits}</span>`;
    const lcdBet = document.createElement('div');
    lcdBet.className = 'sm-lcd';
    lcdBet.innerHTML = `<span class="sm-lcd-label" data-i18n="sm.bet">BET</span><span class="sm-lcd-val" id="smBetDisplay">${smBetPerLine * smLines}</span>`;
    const lcdWin = document.createElement('div');
    lcdWin.className = 'sm-lcd';
    lcdWin.innerHTML = '<span class="sm-lcd-label" data-i18n="sm.win">WIN</span><span class="sm-lcd-val" id="smWinDisplay">--</span>';
    const lcdStreak = document.createElement('span');
    lcdStreak.className = 'sm-streak-badge';
    lcdStreak.id = 'smStreakBadge';
    lcdRow.appendChild(lcdCredit);
    lcdRow.appendChild(lcdBet);
    lcdRow.appendChild(lcdWin);
    lcdRow.appendChild(lcdStreak);
    body.appendChild(lcdRow);

    // Hold buttons row (hidden by default)
    const holdRow = document.createElement('div');
    holdRow.className = 'sm-hold-row';
    holdRow.id = 'smHoldRow';
    holdRow.style.display = 'none';
    for (let h = 0; h < 3; h++) {
      const holdBtn = document.createElement('button');
      holdBtn.type = 'button';
      holdBtn.className = 'sm-hold-btn';
      holdBtn.textContent = t('sm.hold');
      holdBtn.dataset.reel = h;
      holdBtn.addEventListener('click', ((ri) => () => smToggleHold(ri))(h));
      smHoldBtns.push(holdBtn);
      holdRow.appendChild(holdBtn);
    }
    body.appendChild(holdRow);

    // Reel grid (row-major: top row L-R, center row L-R, bottom row L-R)
    const reelGrid = document.createElement('div');
    reelGrid.className = 'sm-reel-grid';
    smCells = [[null,null,null],[null,null,null],[null,null,null]]; // [reel][row]
    for (let row = 0; row < 3; row++) {
      for (let r = 0; r < 3; r++) {
        const cell = document.createElement('div');
        cell.className = 'sm-cell';
        cell.textContent = SM_SYMBOLS[SM_REELS[r][row]].ch;
        cell.classList.add(SM_SYMBOLS[SM_REELS[r][row]].cls);
        reelGrid.appendChild(cell);
        smCells[r][row] = cell;
      }
    }
    body.appendChild(reelGrid);

    // Nudge buttons row (hidden by default)
    const nudgeRow = document.createElement('div');
    nudgeRow.className = 'sm-nudge-row';
    nudgeRow.id = 'smNudgeRow';
    nudgeRow.style.display = 'none';
    smNudgeBtns = [];
    for (let n = 0; n < 3; n++) {
      const nudgeGroup = document.createElement('div');
      nudgeGroup.className = 'sm-nudge-group';
      const upBtn = document.createElement('button');
      upBtn.type = 'button';
      upBtn.className = 'sm-nudge-btn';
      upBtn.textContent = '\u25B2';
      upBtn.addEventListener('click', ((ri) => () => smNudge(ri, -1))(n));
      const dnBtn = document.createElement('button');
      dnBtn.type = 'button';
      dnBtn.className = 'sm-nudge-btn';
      dnBtn.textContent = '\u25BC';
      dnBtn.addEventListener('click', ((ri) => () => smNudge(ri, 1))(n));
      nudgeGroup.appendChild(upBtn);
      nudgeGroup.appendChild(dnBtn);
      smNudgeBtns.push([upBtn, dnBtn]);
      nudgeRow.appendChild(nudgeGroup);
    }
    body.appendChild(nudgeRow);

    // Controls row: lines & bet
    const ctrlRow = document.createElement('div');
    ctrlRow.className = 'sm-ctrl-row';
    const linesGrp = document.createElement('div');
    linesGrp.className = 'sm-ctrl-group';
    const linesLabel = document.createElement('span');
    linesLabel.className = 'sm-ctrl-label';
    linesLabel.setAttribute('data-i18n', 'sm.lines');
    linesLabel.textContent = t('sm.lines');
    linesGrp.appendChild(linesLabel);
    [1,3,5].forEach((lv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `sm-opt-btn${lv === smLines ? ' sm-opt-active' : ''}`;
      b.textContent = lv;
      b.dataset.lines = lv;
      b.addEventListener('click', () => { smSetLines(lv); });
      linesGrp.appendChild(b);
    });
    ctrlRow.appendChild(linesGrp);

    const betGrp = document.createElement('div');
    betGrp.className = 'sm-ctrl-group';
    const betLabel = document.createElement('span');
    betLabel.className = 'sm-ctrl-label';
    betLabel.setAttribute('data-i18n', 'sm.betPerLine');
    betLabel.textContent = t('sm.betPerLine');
    betGrp.appendChild(betLabel);
    [1,2,5,10].forEach((bv) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `sm-opt-btn${bv === smBetPerLine ? ' sm-opt-active' : ''}`;
      b.textContent = bv;
      b.dataset.bet = bv;
      b.addEventListener('click', () => { smSetBet(bv); });
      betGrp.appendChild(b);
    });
    ctrlRow.appendChild(betGrp);
    body.appendChild(ctrlRow);

    // Action buttons row
    const btnRow = document.createElement('div');
    btnRow.className = 'sm-btn-row';
    const spinBtn = document.createElement('button');
    spinBtn.type = 'button';
    spinBtn.className = 'sm-spin-btn';
    spinBtn.id = 'smSpinBtn';
    spinBtn.textContent = t('sm.spin');
    spinBtn.addEventListener('click', smSpin);
    btnRow.appendChild(spinBtn);

    const maxBtn = document.createElement('button');
    maxBtn.type = 'button';
    maxBtn.className = 'sm-max-btn';
    maxBtn.textContent = t('sm.maxBet');
    maxBtn.addEventListener('click', smMaxBet);
    btnRow.appendChild(maxBtn);

    const payBtn = document.createElement('button');
    payBtn.type = 'button';
    payBtn.className = 'sm-pay-btn';
    payBtn.textContent = t('sm.payTable');
    payBtn.addEventListener('click', smTogglePayTable);
    btnRow.appendChild(payBtn);

    const autoBtn = document.createElement('button');
    autoBtn.type = 'button';
    autoBtn.className = 'sm-auto-btn';
    autoBtn.id = 'smAutoBtn';
    autoBtn.textContent = t('sm.auto');
    autoBtn.addEventListener('click', smToggleAutoPlay);
    btnRow.appendChild(autoBtn);
    body.appendChild(btnRow);

    // Pay table panel (hidden)
    const payPanel = document.createElement('div');
    payPanel.className = 'sm-pay-panel';
    payPanel.id = 'smPayPanel';
    payPanel.style.display = 'none';
    const payTitle = document.createElement('div');
    payTitle.className = 'sm-pay-title';
    payTitle.textContent = t('sm.payTable');
    payPanel.appendChild(payTitle);
    SM_PAY_TABLE.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'sm-pay-row';
      row.innerHTML = `<span>${entry.label}</span><span>${entry.payout}</span>`;
      payPanel.appendChild(row);
    });
    // partial matches
    const partials = [
      { label: `${t('sm.anyTwo')} 7`, payout: 5 },
      { label: `${t('sm.anyTwo')} BAR`, payout: 3 },
      { label: `${t('sm.anyTwo')} \u2407`, payout: 2 }
    ];
    partials.forEach((p) => {
      const row = document.createElement('div');
      row.className = 'sm-pay-row';
      row.innerHTML = `<span>${p.label}</span><span>${p.payout}</span>`;
      payPanel.appendChild(row);
    });
    // scatter
    const scRow1 = document.createElement('div');
    scRow1.className = 'sm-pay-row';
    scRow1.innerHTML = `<span>2\u00D7 \u2731 ${t('sm.scatter')}</span><span>5 ${t('sm.freeSpinsShort')} + 2\u00D7</span>`;
    payPanel.appendChild(scRow1);
    const scRow2 = document.createElement('div');
    scRow2.className = 'sm-pay-row';
    scRow2.innerHTML = `<span>3\u00D7 \u2731 ${t('sm.scatter')}</span><span>10 ${t('sm.freeSpinsShort')} + 5\u00D7</span>`;
    payPanel.appendChild(scRow2);
    body.appendChild(payPanel);

    // Intro screen overlay
    const intro = document.createElement('div');
    intro.className = 'sm-intro';
    intro.id = 'smIntro';
    intro.innerHTML = `<div class="sm-intro-title">LUCKY SEVENS</div>
      <div class="sm-intro-reels">
        <span class="sm-intro-sym">7</span>
        <span class="sm-intro-sym">7</span>
        <span class="sm-intro-sym">7</span>
      </div>
      <div class="sm-intro-prize">${t('sm.topPrize')}: 2,500</div>
      <div class="sm-intro-stats" id="smIntroStats"></div>
      <div class="sm-intro-bonus" id="smIntroBonus" style="display:none"></div>
      <button type="button" class="sm-intro-play" id="smIntroPlayBtn">${t('sm.play')}</button>`;
    body.appendChild(intro);
    document.getElementById('smIntroPlayBtn').addEventListener('click', smDismissIntro);

    // Keyboard: Space to spin (or dismiss intro)
    const smEl = document.getElementById('slotmachine');
    smEl.setAttribute('tabindex', '-1');
    smEl.addEventListener('keydown', (e) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      const introEl = document.getElementById('smIntro');
      if (introEl && introEl.style.display !== 'none') { smDismissIntro(); return; }
      if (!smSpinning) smSpin();
    });

    smBuilt = true;
    smLoadState();
    smUpdateDisplays();
    smAddTooltips();
  };

  const openSlotMachine = () => {
    if (!smBuilt) smBuildUI();
    openWindow('slotmachine');

    // Show intro on first open per session
    if (!smIntroShown) {
      const intro = document.getElementById('smIntro');
      if (intro) intro.style.display = '';

      // Populate returning-player stats
      const stats = document.getElementById('smIntroStats');
      if (stats && smTotalSpins > 0) {
        stats.textContent = `${t('sm.totalSpins')}: ${smTotalSpins} | ${t('sm.bestWin')}: ${smBiggestWin}`;
      }

      // Daily bonus
      const bonus = smCheckDailyBonus();
      const bonusEl = document.getElementById('smIntroBonus');
      if (bonusEl && bonus > 0) {
        bonusEl.textContent = t('sm.dailyBonus', { count: bonus });
        bonusEl.style.display = '';
      }
      smUpdateDisplays();
    }

    document.getElementById('slotmachine')?.focus();
  };

  const closeSlotMachine = () => {
    // Stop any running animations
    smAnimTimers.forEach((timer) => { clearInterval(timer); });
    smAnimTimers = [];
    smSpinning = false;
    smHoldOffered = false;
    smNudgeOffered = false;
    // Stop autoplay
    smAutoPlay = false;
    if (smAutoTimer) { clearTimeout(smAutoTimer); smAutoTimer = null; }
    const autoBtn = document.getElementById('smAutoBtn');
    if (autoBtn) { autoBtn.classList.remove('sm-auto-active'); autoBtn.textContent = t('sm.auto'); }
    smSaveState();
    mpTaskbar.closeWindow('slotmachine');
  };

  // Volume integration for slot machine
  const smOrigAudioUpdate = window.mpAudioUpdateVolume;
  window.mpAudioUpdateVolume = () => {
    if (smOrigAudioUpdate) smOrigAudioUpdate();
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Register with ACTION_MAP, WINDOW_NAMES, and export to window
   * ════════════════════════════════════════════════════════════════════════ */

  // Register actions
  if (window.ACTION_MAP) {
    Object.assign(window.ACTION_MAP, {
      openStopwatch,
      openStickyNotes,
      openCryptography,
      openSlotMachine,
      openDiskUsage
    });
  }

  // Register window display names
  if (window.WINDOW_NAMES) {
    Object.assign(window.WINDOW_NAMES, {
      stopwatch: 'Stopwatch',
      stickynotes: 'Sticky Notes',
      cryptography: 'Cryptography',
      slotmachine: 'Slot Machine',
      diskusage: 'Disk Usage'
    });
  }

  // Register close handlers
  if (window.CLOSE_MAP) {
    window.CLOSE_MAP.slotmachine = closeSlotMachine;
  }

  // Export to window (called from HTML onclick handlers)
  window.openStopwatch = openStopwatch;
  window.swStartStop = swStartStop;
  window.swLap = swLap;
  window.swReset = swReset;
  window.openStickyNotes = openStickyNotes;
  window.reclampStickyNotes = reclampStickyNotes;
  window.openCryptography = openCryptography;
  window.openSlotMachine = openSlotMachine;
  window.closeSlotMachine = closeSlotMachine;
  window.openDiskUsage = openDiskUsage;
})();
