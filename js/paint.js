/* Paint — Image creation and editing app */
(function () {
'use strict';

const PAINT_COLORS = [
  '#000000','#808080','#800000','#808000','#008000','#008080','#000080','#800080',
  '#808040','#004040','#0080ff','#004080','#8000ff','#804000',
  '#ffffff','#c0c0c0','#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff',
  '#ffff80','#00ff80','#80ffff','#8080ff','#ff0080','#ff8040'
];

let paintCanvas = null;
let paintPreview = null;
let paintCtx = null;
let paintPrevCtx = null;
let paintCoordsEl = null;
let paintBuilt = false;
let paintTool = 'pencil';
let paintFg = '#000000';
let paintBgColor = '#ffffff';
let paintSize = 3;
let paintDrawing = false;
let paintPoints = [];
let paintUndoStack = [];
let paintRedoStack = [];
let paintDirty = false;
let paintCurrentFile = null;
let paintStartPos = null;
const paintW = 640;
const paintH = 400;

const openPaint = () => {
  openWindow('paint');
  if (!paintBuilt) {
    paintBuilt = true;
    paintSetup();
  }
  document.getElementById('paint').focus();
};

const closePaint = async () => {
  if (paintDirty && !(await mpConfirm(t('paint.discardChanges')))) return;
  paintDismissDialog();
  mpTaskbar.closeWindow('paint');
};

const paintSetup = () => {
  paintCanvas = document.getElementById('paintCanvas');
  paintPreview = document.getElementById('paintPreview');
  paintCtx = paintCanvas.getContext('2d');
  paintPrevCtx = paintPreview.getContext('2d');
  paintCoordsEl = document.getElementById('paintCoords');

  const dpr = window.devicePixelRatio || 1;
  paintCanvas.width = paintW * dpr;
  paintCanvas.height = paintH * dpr;
  paintCanvas.style.width = `${paintW}px`;
  paintCanvas.style.height = `${paintH}px`;
  paintCtx.scale(dpr, dpr);

  paintPreview.width = paintW * dpr;
  paintPreview.height = paintH * dpr;
  paintPreview.style.width = `${paintW}px`;
  paintPreview.style.height = `${paintH}px`;
  paintPrevCtx.scale(dpr, dpr);

  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintW, paintH);

  // Build color swatches
  const swatchContainer = document.getElementById('paintSwatches');
  for (let i = 0; i < PAINT_COLORS.length; i++) {
    const swatch = document.createElement('div');
    swatch.className = 'paint-swatch';
    swatch.style.background = PAINT_COLORS[i];
    swatch.dataset.color = PAINT_COLORS[i];
    swatch.addEventListener('click', (e) => {
      paintFg = e.target.dataset.color;
      document.getElementById('paintFg').style.background = paintFg;
    });
    swatch.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      paintBgColor = e.target.dataset.color;
      document.getElementById('paintBg').style.background = paintBgColor;
    });
    swatchContainer.appendChild(swatch);
  }

  // Set initial FG/BG display
  document.getElementById('paintFg').style.background = paintFg;
  document.getElementById('paintBg').style.background = paintBgColor;

  // FG/BG double-click to pick custom color
  const colorPicker = document.getElementById('paintColorPicker');
  let pickingTarget = null;
  document.getElementById('paintFg').addEventListener('dblclick', () => {
    pickingTarget = 'fg';
    colorPicker.value = paintFg;
    colorPicker.click();
  });
  document.getElementById('paintBg').addEventListener('dblclick', () => {
    pickingTarget = 'bg';
    colorPicker.value = paintBgColor;
    colorPicker.click();
  });
  colorPicker.addEventListener('input', () => {
    if (pickingTarget === 'fg') {
      paintFg = colorPicker.value;
      document.getElementById('paintFg').style.background = paintFg;
    } else if (pickingTarget === 'bg') {
      paintBgColor = colorPicker.value;
      document.getElementById('paintBg').style.background = paintBgColor;
    }
  });

  // Save initial state
  paintSaveState();

  // Pointer events on canvas
  paintCanvas.addEventListener('pointerdown', paintOnDown);
  paintCanvas.addEventListener('pointermove', paintOnMove);
  paintCanvas.addEventListener('pointerup', paintOnUp);
  paintCanvas.addEventListener('pointercancel', paintOnUp);

  // Keyboard shortcuts
  document.getElementById('paint').addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); paintUndo(); }
      else if (e.key === 'y') { e.preventDefault(); paintRedo(); }
      else if (e.key === 's') { e.preventDefault(); paintSave(); }
      else if (e.key === 'n') { e.preventDefault(); paintNew(); }
    }
  });

  paintUpdateStatus();
};

const paintGetPos = (e) => {
  const rect = paintCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (paintW / rect.width),
    y: (e.clientY - rect.top) * (paintH / rect.height)
  };
};

const paintSaveState = () => {
  paintUndoStack.push(paintCanvas.toDataURL());
  if (paintUndoStack.length > 20) paintUndoStack.shift();
  paintRedoStack = [];
  paintUpdateUndoButtons();
};

const paintUpdateUndoButtons = () => {
  document.getElementById('paintUndoBtn').disabled = paintUndoStack.length <= 1;
  document.getElementById('paintRedoBtn').disabled = paintRedoStack.length === 0;
};

const paintRestoreState = (dataUrl) => {
  const img = new Image();
  img.onload = () => {
    const dpr = window.devicePixelRatio || 1;
    paintCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    paintCtx.drawImage(img, 0, 0);
    paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  img.src = dataUrl;
};

const paintUndo = () => {
  if (paintUndoStack.length <= 1) return;
  paintRedoStack.push(paintUndoStack.pop());
  paintRestoreState(paintUndoStack[paintUndoStack.length - 1]);
  paintUpdateUndoButtons();
  paintDirty = true;
  paintSetTitle();
};

const paintRedo = () => {
  if (paintRedoStack.length === 0) return;
  const state = paintRedoStack.pop();
  paintUndoStack.push(state);
  paintRestoreState(state);
  paintUpdateUndoButtons();
  paintDirty = true;
  paintSetTitle();
};

const paintOnDown = (e) => {
  paintCanvas.setPointerCapture(e.pointerId);
  paintDrawing = true;
  const pos = paintGetPos(e);

  if (paintTool === 'fill') {
    paintFloodFill(Math.round(pos.x), Math.round(pos.y), paintFg);
    paintDrawing = false;
    paintDirty = true;
    paintSetTitle();
    paintSaveState();
    return;
  }

  if (paintTool === 'pencil' || paintTool === 'brush' || paintTool === 'eraser') {
    paintSaveState();
    paintPoints = [pos];
    paintCtx.beginPath();
    paintCtx.moveTo(pos.x, pos.y);
    paintConfigStroke(paintCtx);
  } else {
    // Shape tools
    paintSaveState();
    paintStartPos = pos;
  }
};

const paintOnMove = (e) => {
  const pos = paintGetPos(e);
  paintCoordsEl.textContent = `${Math.round(pos.x)}, ${Math.round(pos.y)}`;

  if (!paintDrawing) return;

  if (paintTool === 'pencil' || paintTool === 'brush' || paintTool === 'eraser') {
    paintPoints.push(pos);
    paintDrawIncremental(paintCtx, paintPoints);
  } else if (paintTool === 'line' || paintTool === 'rect' || paintTool === 'ellipse') {
    const dpr = window.devicePixelRatio || 1;
    paintPrevCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintPrevCtx.clearRect(0, 0, paintPreview.width, paintPreview.height);
    paintPrevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintConfigStroke(paintPrevCtx);
    paintDrawShape(paintPrevCtx, paintStartPos, pos);
  }
};

const paintOnUp = (e) => {
  if (!paintDrawing) return;
  paintDrawing = false;

  if (paintTool === 'pencil' || paintTool === 'brush' || paintTool === 'eraser') {
    // Single-click dot: if only one point, draw a dot
    if (paintPoints.length === 1) {
      paintConfigStroke(paintCtx);
      const p = paintPoints[0];
      const r = paintTool === 'pencil' ? 0.5 : paintSize / 2;
      paintCtx.beginPath();
      paintCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      paintCtx.fillStyle = paintTool === 'eraser' ? paintBgColor : paintFg;
      paintCtx.fill();
    }
  } else if (paintTool === 'line' || paintTool === 'rect' || paintTool === 'ellipse') {
    const pos = paintGetPos(e);
    paintConfigStroke(paintCtx);
    paintDrawShape(paintCtx, paintStartPos, pos);
    // Clear preview
    const dpr = window.devicePixelRatio || 1;
    paintPrevCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintPrevCtx.clearRect(0, 0, paintPreview.width, paintPreview.height);
    paintPrevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  paintDirty = true;
  paintSetTitle();
  paintSaveState();
};

const paintConfigStroke = (ctx) => {
  if (paintTool === 'pencil') {
    ctx.strokeStyle = paintFg;
    ctx.lineWidth = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  } else if (paintTool === 'brush') {
    ctx.strokeStyle = paintFg;
    ctx.lineWidth = paintSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else if (paintTool === 'eraser') {
    ctx.strokeStyle = paintBgColor;
    ctx.lineWidth = paintSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else if (paintTool === 'line') {
    ctx.strokeStyle = paintFg;
    ctx.lineWidth = paintSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else if (paintTool === 'rect') {
    ctx.strokeStyle = paintFg;
    ctx.lineWidth = paintSize;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  } else if (paintTool === 'ellipse') {
    ctx.strokeStyle = paintFg;
    ctx.lineWidth = paintSize;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
  }
};

const paintDrawIncremental = (ctx, pts) => {
  const n = pts.length;
  if (n < 2) return;
  ctx.beginPath();
  if (n === 2) {
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    // Draw only the last segment using quadratic midpoint interpolation
    const prev = pts[n - 3];
    const cur = pts[n - 2];
    const next = pts[n - 1];
    const mx0 = (prev.x + cur.x) / 2;
    const my0 = (prev.y + cur.y) / 2;
    const mx1 = (cur.x + next.x) / 2;
    const my1 = (cur.y + next.y) / 2;
    ctx.moveTo(mx0, my0);
    ctx.quadraticCurveTo(cur.x, cur.y, mx1, my1);
  }
  ctx.stroke();
};

const paintDrawShape = (ctx, start, end) => {
  ctx.beginPath();
  if (paintTool === 'line') {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (paintTool === 'rect') {
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else if (paintTool === 'ellipse') {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
};

const paintFloodFill = (startX, startY, fillColor) => {
  const dpr = window.devicePixelRatio || 1;
  const px = Math.round(startX * dpr);
  const py = Math.round(startY * dpr);
  const cw = paintCanvas.width;
  const ch = paintCanvas.height;

  if (px < 0 || py < 0 || px >= cw || py >= ch) return;

  const imageData = paintCtx.getImageData(0, 0, cw, ch);
  const data = imageData.data;

  // Parse fill color
  const tmp = document.createElement('canvas');
  tmp.width = 1; tmp.height = 1;
  const tmpCtx = tmp.getContext('2d');
  tmpCtx.fillStyle = fillColor;
  tmpCtx.fillRect(0, 0, 1, 1);
  const fc = tmpCtx.getImageData(0, 0, 1, 1).data;
  const fr = fc[0], fg = fc[1], fb = fc[2], fa = fc[3];

  // Get target color
  const idx = (py * cw + px) * 4;
  const tr = data[idx], tg = data[idx + 1], tb = data[idx + 2], ta = data[idx + 3];

  // If same, no-op
  if (tr === fr && tg === fg && tb === fb && ta === fa) return;

  const tolerance = 32;
  const match = (i) =>
    Math.abs(data[i] - tr) <= tolerance &&
    Math.abs(data[i + 1] - tg) <= tolerance &&
    Math.abs(data[i + 2] - tb) <= tolerance &&
    Math.abs(data[i + 3] - ta) <= tolerance;

  const setPixel = (i) => {
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = fa;
  };

  const stack = [[px, py]];
  const visited = new Uint8Array(cw * ch);

  while (stack.length > 0) {
    const point = stack.pop();
    const x = point[0];
    const y = point[1];

    const i = (y * cw + x) * 4;
    if (visited[y * cw + x]) continue;
    if (!match(i)) continue;

    // Scan left
    let lx = x;
    while (lx > 0 && match((y * cw + lx - 1) * 4)) lx--;

    // Scan right
    let rx = x;
    while (rx < cw - 1 && match((y * cw + rx + 1) * 4)) rx++;

    // Fill the span
    for (let sx = lx; sx <= rx; sx++) {
      const si = (y * cw + sx) * 4;
      setPixel(si);
      visited[y * cw + sx] = 1;

      // Check above and below
      if (y > 0 && !visited[(y - 1) * cw + sx] && match(((y - 1) * cw + sx) * 4)) {
        stack.push([sx, y - 1]);
      }
      if (y < ch - 1 && !visited[(y + 1) * cw + sx] && match(((y + 1) * cw + sx) * 4)) {
        stack.push([sx, y + 1]);
      }
    }
  }

  paintCtx.putImageData(imageData, 0, 0);
};

const paintSetTool = (tool) => {
  paintTool = tool;
  const btns = document.querySelectorAll('.paint-tool');
  for (let i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].dataset.tool === tool);
  }
  paintUpdateStatus();
};

const paintSizeChange = (val) => {
  paintSize = parseInt(val, 10);
  document.getElementById('paintSizeVal').textContent = val;
  paintUpdateStatus();
};

const paintUpdateStatus = () => {
  const name = t(`paint.tool.${paintTool}`);
  const size = paintTool === 'pencil' ? '1' : (paintTool === 'fill' ? '' : paintSize);
  document.getElementById('paintStatus').textContent = name + (size ? `: ${size}px` : '');
};

const paintSetTitle = () => {
  const name = paintCurrentFile || t('paint.untitled');
  document.getElementById('paintTitle').textContent = `${name}${paintDirty ? '* ' : ' '}${t('paint.titleSuffix')}`;
};

const paintClear = () => {
  paintSaveState();
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintW, paintH);
  paintDirty = true;
  paintSetTitle();
  paintSaveState();
};

/* Paint file operations */
const paintGetFiles = () => {
  try { return JSON.parse(localStorage.getItem('mpOS-paint-files')) || {}; }
  catch (_e) { return {}; }
};

const paintPersist = (files) => {
  try { localStorage.setItem('mpOS-paint-files', JSON.stringify(files)); }
  catch (_e) { alert(t('paint.storageFull')); }
};

const paintNew = async () => {
  if (paintDirty && !(await mpConfirm(t('paint.discardChanges')))) return;
  paintDismissDialog();
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintW, paintH);
  paintCurrentFile = null;
  paintDirty = false;
  paintUndoStack = [];
  paintRedoStack = [];
  paintSaveState();
  paintSetTitle();
};

const paintSave = () => {
  if (paintCurrentFile) {
    const files = paintGetFiles();
    files[paintCurrentFile] = paintCanvas.toDataURL('image/png');
    paintPersist(files);
    paintDirty = false;
    paintSetTitle();
    document.getElementById('paintStatus').textContent = t('paint.saved');
    setTimeout(paintUpdateStatus, 1500);
  } else {
    paintShowSaveAs();
  }
};

const paintSaveAs = async (name) => {
  name = name.trim();
  if (!name) return;
  if (name === '__proto__' || name === 'constructor' || name === 'prototype') return;
  if (name.indexOf('.') === -1) name += '.png';
  const files = paintGetFiles();
  if (files.hasOwnProperty(name) && name !== paintCurrentFile) {
    if (!(await mpConfirm(t('paint.overwriteConfirm', { name })))) return;
  }
  files[name] = paintCanvas.toDataURL('image/png');
  paintPersist(files);
  paintCurrentFile = name;
  paintDismissDialog();
  paintDirty = false;
  paintSetTitle();
  document.getElementById('paintStatus').textContent = t('paint.saved');
  setTimeout(paintUpdateStatus, 1500);
};

const paintShowSaveAs = () => {
  paintDismissDialog();
  const d = document.createElement('div');
  d.className = 'paint-dialog';

  const label = document.createElement('label');
  label.textContent = t('paint.fileName');
  d.appendChild(label);

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = paintCurrentFile || '';
  d.appendChild(inp);

  const spacer = document.createElement('div');
  spacer.className = 'spacer';
  d.appendChild(spacer);

  const btnRow = document.createElement('div');
  btnRow.className = 'button-row';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.textContent = t('ui.save');
  saveBtn.addEventListener('click', () => { paintSaveAs(inp.value); });
  btnRow.appendChild(saveBtn);
  btnRow.appendChild(document.createTextNode('\u00a0'));
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = t('ui.cancel');
  cancelBtn.addEventListener('click', paintDismissDialog);
  btnRow.appendChild(cancelBtn);
  d.appendChild(btnRow);

  document.querySelector('#paint .window-body').appendChild(d);
  inp.focus();
  inp.select();
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') paintSaveAs(inp.value);
    else if (e.key === 'Escape') paintDismissDialog();
  });
};

const paintLoad = async () => {
  if (paintDirty && !(await mpConfirm(t('paint.discardChanges')))) return;
  paintShowOpen();
};

const paintShowOpen = () => {
  paintDismissDialog();
  const files = paintGetFiles();
  const names = Object.keys(files).sort();

  const d = document.createElement('div');
  d.className = 'paint-dialog';

  const label = document.createElement('label');
  label.textContent = t('paint.openFile');
  d.appendChild(label);

  const fileList = document.createElement('div');
  fileList.className = 'paint-file-list';
  if (names.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'paint-empty';
    emptyMsg.textContent = t('paint.noSavedFiles');
    fileList.appendChild(emptyMsg);
  } else {
    names.forEach((n) => {
      const row = document.createElement('div');
      row.className = 'paint-file-item';
      const thumb = document.createElement('img');
      thumb.className = 'paint-file-thumb';
      thumb.src = files[n];
      thumb.alt = '';
      row.appendChild(thumb);
      const nameSpan = document.createElement('span');
      nameSpan.textContent = n;
      nameSpan.addEventListener('click', () => { paintOpenFile(n); });
      row.appendChild(nameSpan);
      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = t('ui.delete');
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); paintDeleteFile(n); });
      row.appendChild(delBtn);
      fileList.appendChild(row);
    });
  }
  d.appendChild(fileList);

  const btnRow = document.createElement('div');
  btnRow.className = 'button-row';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = t('ui.cancel');
  cancelBtn.addEventListener('click', paintDismissDialog);
  btnRow.appendChild(cancelBtn);
  d.appendChild(btnRow);

  document.querySelector('#paint .window-body').appendChild(d);
};

const paintOpenFile = (name) => {
  const files = paintGetFiles();
  if (!files.hasOwnProperty(name)) return;
  const img = new Image();
  img.onload = () => {
    const dpr = window.devicePixelRatio || 1;
    paintCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    paintCtx.fillStyle = '#ffffff';
    paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
    paintCtx.drawImage(img, 0, 0);
    paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintCurrentFile = name;
    paintDismissDialog();
    paintDirty = false;
    paintUndoStack = [];
    paintRedoStack = [];
    paintSaveState();
    paintSetTitle();
  };
  img.src = files[name];
};

const paintDeleteFile = async (name) => {
  if (!(await mpConfirm(t('paint.deleteConfirm', { name })))) return;
  const files = paintGetFiles();
  delete files[name];
  paintPersist(files);
  if (paintCurrentFile === name) {
    paintCurrentFile = null;
    paintDirty = false;
    paintSetTitle();
  }
  paintShowOpen();
};

const paintDismissDialog = () => {
  const d = document.querySelector('#paint .paint-dialog');
  if (d) d.remove();
};

/* ── Registration ── */
mpRegisterActions({ openPaint });
mpRegisterWindows({ paint: 'Paint' });
mpRegisterCloseHandlers({ paint: closePaint });

/* ── Language change refresh ── */
const paintRefreshOnLangChange = () => {
  const el = document.getElementById('paint');
  if (el && el.style.display !== 'none') { paintSetTitle(); paintUpdateStatus(); }
};

/* ── Exports to window (for inline onclick handlers in index.html) ── */
window.openPaint = openPaint;
window.closePaint = closePaint;
window.paintNew = paintNew;
window.paintSave = paintSave;
window.paintLoad = paintLoad;
window.paintSaveAs = paintSaveAs;
window.paintOpenFile = paintOpenFile;
window.paintDeleteFile = paintDeleteFile;
window.paintDismissDialog = paintDismissDialog;
window.paintSetTool = paintSetTool;
window.paintUndo = paintUndo;
window.paintRedo = paintRedo;
window.paintClear = paintClear;
window.paintSizeChange = paintSizeChange;
window.paintRefreshOnLangChange = paintRefreshOnLangChange;

})();
