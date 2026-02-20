/* Audio Bus — Shared AudioContext, jack registry, SVG patch cables */
(function () {
  'use strict';

  let ctx = null;
  const outputs = {};   // id -> { node, label, element, cables: [] }
  const inputs = {};    // id -> { node, label, element, cable: null }
  const cables = {};    // cableId -> { outputId, inputId, path, audioNode }
  let cableIdCounter = 0;
  let svgOverlay = null;
  let phantomPath = null;
  let pendingOutputId = null;
  const volumeListeners = [];

  /* ── Shared AudioContext ── */
  const getContext = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  /* ── SVG Overlay ── */
  const ensureOverlay = () => {
    if (svgOverlay) return;
    svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgOverlay.id = 'cableOverlay';
    svgOverlay.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svgOverlay.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(svgOverlay);
  };

  /* ── Cable geometry ── */
  const getJackCenter = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const buildCablePath = (x1, y1, x2, y2) => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sag = Math.min(80, 20 + (dx + dy) * 0.15);
    const midX = (x1 + x2) / 2;
    const midY = Math.max(y1, y2) + sag;
    return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
  };

  const createCableSVGPath = (d, id) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'cable-path');
    path.setAttribute('data-cable-id', id);
    // Allow right-click to disconnect
    path.style.pointerEvents = 'stroke';
    path.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      disconnect(id);
    });
    return path;
  };

  /* ── Redraw all cables ── */
  const redrawCables = () => {
    for (const id in cables) {
      const c = cables[id];
      const outReg = outputs[c.outputId];
      const inReg = inputs[c.inputId];
      if (!outReg?.element || !inReg?.element || !c.path) continue;
      const p1 = getJackCenter(outReg.element);
      const p2 = getJackCenter(inReg.element);
      c.path.setAttribute('d', buildCablePath(p1.x, p1.y, p2.x, p2.y));
    }
  };

  /* ── Register / Unregister ── */
  const registerOutput = (id, { node, label, element }) => {
    outputs[id] = { node, label, element, cables: [] };
    if (element) {
      element.classList.add('audio-jack', 'audio-jack-output');
      element.title = label || 'Output';
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pendingOutputId) {
          cancelPatching();
        }
        startPatching(id);
      });
    }
  };

  const registerInput = (id, { node, label, element }) => {
    inputs[id] = { node, label, element, cable: null };
    if (element) {
      element.classList.add('audio-jack', 'audio-jack-input');
      element.title = label || 'Input';
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        if (pendingOutputId) {
          connect(pendingOutputId, id);
          cancelPatching();
        }
      });
      // Right-click on input jack disconnects any cable
      element.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (inputs[id]?.cable) {
          disconnect(inputs[id].cable);
        }
      });
    }
  };

  const unregisterOutput = (id) => {
    const reg = outputs[id];
    if (!reg) return;
    // Disconnect all cables from this output
    const cableIds = [...reg.cables];
    for (const cid of cableIds) disconnect(cid);
    if (reg.element) reg.element.classList.remove('audio-jack', 'audio-jack-output', 'connected');
    delete outputs[id];
    if (pendingOutputId === id) cancelPatching();
  };

  const unregisterInput = (id) => {
    const reg = inputs[id];
    if (!reg) return;
    if (reg.cable) disconnect(reg.cable);
    if (reg.element) reg.element.classList.remove('audio-jack', 'audio-jack-input', 'connected');
    delete inputs[id];
  };

  /* ── Connect / Disconnect ── */
  const connect = (outputId, inputId) => {
    const outReg = outputs[outputId];
    const inReg = inputs[inputId];
    if (!outReg || !inReg) return null;

    // If input already has a cable, disconnect it first
    if (inReg.cable) disconnect(inReg.cable);

    const id = `cable-${++cableIdCounter}`;

    // Web Audio connection
    try {
      outReg.node.connect(inReg.node);
    } catch (e) {
      console.warn('Audio connect failed:', e);
    }

    // SVG cable
    ensureOverlay();
    const p1 = getJackCenter(outReg.element);
    const p2 = getJackCenter(inReg.element);
    const d = buildCablePath(p1.x, p1.y, p2.x, p2.y);
    const path = createCableSVGPath(d, id);
    svgOverlay.appendChild(path);

    cables[id] = { outputId, inputId, path, audioNode: outReg.node };
    outReg.cables.push(id);
    inReg.cable = id;

    outReg.element?.classList.add('connected');
    inReg.element?.classList.add('connected');

    return id;
  };

  const disconnect = (cableId) => {
    const c = cables[cableId];
    if (!c) return;

    // Web Audio disconnect (only from specific input)
    const outReg = outputs[c.outputId];
    const inReg = inputs[c.inputId];
    if (outReg?.node && inReg?.node) {
      try { outReg.node.disconnect(inReg.node); } catch (e) { /* already disconnected */ }
    }

    // Remove SVG path
    if (c.path && c.path.parentNode) c.path.parentNode.removeChild(c.path);

    // Clean up references
    if (outReg) {
      const idx = outReg.cables.indexOf(cableId);
      if (idx !== -1) outReg.cables.splice(idx, 1);
      if (outReg.cables.length === 0) outReg.element?.classList.remove('connected');
    }
    if (inReg) {
      inReg.cable = null;
      inReg.element?.classList.remove('connected');
    }

    delete cables[cableId];
  };

  /* ── Patching interaction ── */
  const startPatching = (outputId) => {
    if (!outputs[outputId]) return;
    pendingOutputId = outputId;
    outputs[outputId].element?.classList.add('pending');

    // Highlight all input jacks
    for (const id in inputs) {
      inputs[id].element?.classList.add('pending-target');
    }

    ensureOverlay();
    phantomPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    phantomPath.setAttribute('class', 'cable-phantom');
    svgOverlay.appendChild(phantomPath);

    document.addEventListener('mousemove', onPatchMouseMove);
    document.addEventListener('touchmove', onPatchTouchMove, { passive: false });
    // Escape or click on empty space to cancel
    document.addEventListener('keydown', onPatchKeyDown);
    document.addEventListener('mousedown', onPatchClickAway);
  };

  const cancelPatching = () => {
    if (pendingOutputId && outputs[pendingOutputId]) {
      outputs[pendingOutputId].element?.classList.remove('pending');
    }
    for (const id in inputs) {
      inputs[id].element?.classList.remove('pending-target');
    }
    pendingOutputId = null;
    if (phantomPath && phantomPath.parentNode) {
      phantomPath.parentNode.removeChild(phantomPath);
    }
    phantomPath = null;
    document.removeEventListener('mousemove', onPatchMouseMove);
    document.removeEventListener('touchmove', onPatchTouchMove);
    document.removeEventListener('keydown', onPatchKeyDown);
    document.removeEventListener('mousedown', onPatchClickAway);
  };

  const onPatchMouseMove = (e) => {
    if (!pendingOutputId || !phantomPath) return;
    const outEl = outputs[pendingOutputId]?.element;
    if (!outEl) return;
    const p1 = getJackCenter(outEl);
    const d = buildCablePath(p1.x, p1.y, e.clientX, e.clientY);
    phantomPath.setAttribute('d', d);
  };

  const onPatchTouchMove = (e) => {
    if (!pendingOutputId || !phantomPath) return;
    const touch = e.touches[0];
    const outEl = outputs[pendingOutputId]?.element;
    if (!outEl) return;
    const p1 = getJackCenter(outEl);
    const d = buildCablePath(p1.x, p1.y, touch.clientX, touch.clientY);
    phantomPath.setAttribute('d', d);
  };

  const onPatchKeyDown = (e) => {
    if (e.key === 'Escape') cancelPatching();
  };

  const onPatchClickAway = (e) => {
    // If the click wasn't on a jack, cancel patching
    if (!e.target.closest('.audio-jack')) {
      // Small delay so the jack click handler fires first
      setTimeout(() => {
        if (pendingOutputId) cancelPatching();
      }, 0);
    }
  };

  /* ── Volume integration ── */
  const onVolumeChange = (fn) => {
    volumeListeners.push(fn);
  };

  const offVolumeChange = (fn) => {
    const idx = volumeListeners.indexOf(fn);
    if (idx !== -1) volumeListeners.splice(idx, 1);
  };

  // Hook into existing mpAudioUpdateVolume chain
  const origAudioUpdate = window.mpAudioUpdateVolume;
  window.mpAudioUpdateVolume = () => {
    if (origAudioUpdate) origAudioUpdate();
    for (let i = 0; i < volumeListeners.length; i++) {
      try { volumeListeners[i](); } catch (e) { /* ignore */ }
    }
  };

  /* ── Window move listener — redraw cables on drag ── */
  // This relies on taskbar.js dispatching 'windowmove' events
  // We listen on document for the custom event
  let redrawRafId = null;
  const scheduleRedraw = () => {
    if (redrawRafId) return;
    redrawRafId = requestAnimationFrame(() => {
      redrawCables();
      redrawRafId = null;
    });
  };

  // Listen for mouse drag to schedule redraws (cables follow windows)
  document.addEventListener('mousemove', (e) => {
    // Only redraw if there are any cables to redraw
    if (Object.keys(cables).length > 0 && e.buttons === 1) {
      scheduleRedraw();
    }
  });

  document.addEventListener('windowmove', redrawCables);
  window.addEventListener('resize', scheduleRedraw);

  /* ── Export ── */
  window.mpAudioBus = {
    getContext,
    registerOutput,
    registerInput,
    unregisterOutput,
    unregisterInput,
    connect,
    disconnect,
    startPatching,
    cancelPatching,
    redrawCables,
    onVolumeChange,
    offVolumeChange
  };
})();
