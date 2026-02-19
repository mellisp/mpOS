/* Taskbar — Window Management */
(function () {
  'use strict';

  const startBtn = document.querySelector('.start-btn');
  const startMenu = document.querySelector('.start-menu');
  const clockEl = document.querySelector('.tray-clock');
  const volumeIcon = document.getElementById('trayVolumeIcon');
  const volumePopup = document.querySelector('.volume-popup');
  const volumeSlider = document.querySelector('.volume-slider');
  const muteCheckbox = document.querySelector('.volume-mute');
  const taskbarItems = document.querySelector('.taskbar-items');

  // --- Start Button ---
  if (startBtn && startMenu) {
    startBtn.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startBtn.classList.toggle('pressed');
      startMenu.classList.toggle('open');
    });
  }

  // --- Clock ---
  const updateClock = () => {
    if (!clockEl) return;
    const now = new Date();
    const h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    if (localStorage.getItem('mp-clock') === '24') {
      clockEl.textContent = `${h}:${m}`;
    } else {
      clockEl.textContent = `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
    }
  };

  window.mpClockUpdate = updateClock;

  if (clockEl) {
    updateClock();
    setTimeout(() => {
      updateClock();
      setInterval(updateClock, 60000);
    }, (60 - new Date().getSeconds()) * 1000);
  }

  // --- Volume ---
  if (volumeIcon && volumePopup) {
    volumeIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      volumePopup.classList.toggle('open');
      document.querySelector('.net-popup')?.classList.remove('open');
      window.mpVoiceStop?.();
      startMenu?.classList.remove('open');
      startBtn?.classList.remove('pressed');
    });
  }

  if (volumeSlider) {
    const savedVol = localStorage.getItem('mp-volume');
    volumeSlider.value = savedVol !== null ? parseFloat(savedVol) * 100 : 10;
    volumeSlider.addEventListener('input', () => {
      localStorage.setItem('mp-volume', (volumeSlider.value / 100).toString());
      window.mpAudioUpdateVolume?.();
    });
  }

  if (muteCheckbox) {
    muteCheckbox.checked = localStorage.getItem('mp-muted') === '1';
    muteCheckbox.addEventListener('change', () => {
      localStorage.setItem('mp-muted', muteCheckbox.checked ? '1' : '0');
      window.mpAudioUpdateVolume?.();
    });
  }

  // --- Network Status ---
  const netIcon = document.getElementById('trayNetIcon');
  const netPopup = document.querySelector('.net-popup');
  const netPopupBody = document.getElementById('netPopupBody');

  const updateNetStatus = () => {
    if (!netIcon) return;
    if (navigator.onLine) {
      netIcon.classList.remove('offline');
      netIcon.title = 'Connected';
    } else {
      netIcon.classList.add('offline');
      netIcon.title = 'Disconnected';
    }
    renderNetPopup();
  };

  const renderNetPopup = () => {
    if (!netPopupBody) return;
    netPopupBody.textContent = '';
    const conn = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
    const rows = [
      { label: 'Status', value: navigator.onLine ? 'Connected' : 'Disconnected' },
      { label: 'Type', value: conn ? conn.effectiveType ?? 'Unknown' : 'N/A (Chromium only)' },
      { label: 'Downlink', value: conn?.downlink != null ? `${conn.downlink} Mbps` : 'N/A' },
      { label: 'RTT', value: conn?.rtt != null ? `${conn.rtt} ms` : 'N/A' }
    ];
    for (const { label, value } of rows) {
      const row = document.createElement('div');
      row.className = 'net-popup-row';
      const lbl = document.createElement('span');
      lbl.className = 'net-label';
      lbl.textContent = label;
      const val = document.createElement('span');
      val.textContent = value;
      row.append(lbl, val);
      netPopupBody.appendChild(row);
    }
  };

  if (netIcon && netPopup) {
    netIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      updateNetStatus();
      netPopup.classList.toggle('open');
      volumePopup?.classList.remove('open');
      window.mpVoiceStop?.();
      startMenu?.classList.remove('open');
      startBtn?.classList.remove('pressed');
    });
  }

  window.addEventListener('online', updateNetStatus);
  window.addEventListener('offline', updateNetStatus);
  navigator.connection?.addEventListener?.('change', updateNetStatus);
  updateNetStatus();

  // --- Dismiss popups on outside click (single listener) ---
  const clearTouchSubmenus = () => {
    for (const s of document.querySelectorAll('.start-submenu.touch-open')) {
      s.classList.remove('touch-open');
    }
  };

  document.addEventListener('mousedown', (e) => {
    if (startBtn && !startBtn.contains(e.target) && !startMenu?.contains(e.target)) {
      startBtn.classList.remove('pressed');
      startMenu?.classList.remove('open');
      clearTouchSubmenus();
    }
    if (volumePopup && !volumePopup.contains(e.target) && volumeIcon && !volumeIcon.contains(e.target)) {
      volumePopup.classList.remove('open');
    }
    if (netPopup && !netPopup.contains(e.target) && netIcon && !netIcon.contains(e.target)) {
      netPopup.classList.remove('open');
    }
  });

  // --- Touch: tap-to-toggle submenus (instead of hover) ---
  if (window.matchMedia('(pointer: coarse)').matches) {
    for (const item of document.querySelectorAll('.start-menu-item.has-submenu')) {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.start-submenu')) return;
        e.stopPropagation();
        const sub = item.querySelector('.start-submenu');
        if (!sub) return;
        for (const s of document.querySelectorAll('.start-submenu.touch-open')) {
          if (s !== sub) s.classList.remove('touch-open');
        }
        sub.classList.toggle('touch-open');
      });
    }
  }

  // --- Window Management ---
  let topZ = 10;

  const bringToFront = (win) => {
    if (!win || win.style.display === 'none') return;
    topZ++;
    win.style.zIndex = topZ;
  };

  document.addEventListener('mousedown', (e) => {
    const win = e.target.closest('.window.draggable');
    if (win) bringToFront(win);
  });

  const onAnimEnd = (el, cls, cb) => {
    el.classList.add(cls);
    el.addEventListener('animationend', function handler() {
      el.removeEventListener('animationend', handler);
      el.classList.remove(cls);
      cb();
    });
  };

  const TASKBAR_ICONS = {
    browser: 'WikiBrowser', fishofday: 'Fish of the Day', fishfinder: 'Fish Finder',
    ontarget: 'On Target', aquarium: 'Virtual Aquarium', chickenfingers: 'Chicken Fingers',
    paint: 'Paint', brickbreaker: 'Brick Breaker', notepad: 'Notepad',
    calculator: 'Calculator', calendar: 'Calendar', stopwatch: 'Stopwatch',
    timezone: 'Time Zone', weather: 'Weather', diskusage: 'Disk Usage',
    visitormap: 'Visitor Map', search: 'Search', help: 'Help',
    mycomputer: 'My Computer', explorer: 'Files', run: 'Run',
    taskmanager: 'Task Manager', noisemixer: 'White Noise Mixer',
    voicecommands: 'Voice Commands',
    tuningfork: 'Tuning Fork',
    neotracker: 'NEO Tracker',
    fractal: 'Fractal Explorer'
  };

  const minimizeWindow = (id) => {
    const win = document.getElementById(id);
    if (!win) return;
    onAnimEnd(win, 'minimizing', () => { win.style.display = 'none'; });
    if (taskbarItems) {
      const item = document.createElement('button');
      item.className = 'taskbar-item';
      item.dataset.windowId = id;
      const iconName = TASKBAR_ICONS[id];
      if (iconName && typeof getItemIcon === 'function') {
        const iconSvg = getItemIcon(iconName);
        if (iconSvg) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 20 20');
          svg.className.baseVal = 'taskbar-icon';
          svg.innerHTML = iconSvg;
          item.appendChild(svg);
        }
      }
      const label = document.createElement('span');
      const titleEl = win.querySelector('.titlebar span');
      const titleText = titleEl ? titleEl.textContent : id;
      label.textContent = titleText;
      item.title = titleText;
      item.appendChild(label);
      item.addEventListener('click', () => { restoreWindow(id); });
      taskbarItems.appendChild(item);
    }
  };

  const restoreWindow = (id) => {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = '';
    bringToFront(win);
    onAnimEnd(win, 'restoring', () => {});
    if (taskbarItems) {
      taskbarItems.querySelector(`[data-window-id="${id}"]`)?.remove();
    }
  };

  const closeWindow = (id) => {
    const win = document.getElementById(id);
    if (!win) return;
    onAnimEnd(win, 'closing', () => { win.style.display = 'none'; });
    if (taskbarItems) {
      taskbarItems.querySelector(`[data-window-id="${id}"]`)?.remove();
    }
  };

  // --- Dragging ---
  let dragState = null;

  const onDragMove = (clientX, clientY) => {
    if (!dragState) return;
    const { win, ox, oy } = dragState;
    const x = Math.max(0, Math.min(clientX - ox, window.innerWidth - win.offsetWidth));
    const y = Math.max(0, Math.min(clientY - oy, window.innerHeight - win.offsetHeight));
    win.style.left = `${x}px`;
    win.style.top = `${y}px`;
  };

  document.addEventListener('mousemove', (e) => { onDragMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup', () => { dragState = null; });

  document.addEventListener('touchmove', (e) => {
    if (!dragState) return;
    e.preventDefault();
    const touch = e.touches[0];
    onDragMove(touch.clientX, touch.clientY);
  }, { passive: false });

  document.addEventListener('touchend', () => { dragState = null; });
  document.addEventListener('touchcancel', () => { dragState = null; });

  const makeDraggable = (win) => {
    const titlebar = win.querySelector('.titlebar');
    if (!titlebar) return;
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('titlebar-btn') || e.target.closest('.titlebar-buttons')) return;
      dragState = { win, ox: e.clientX - win.offsetLeft, oy: e.clientY - win.offsetTop };
      e.preventDefault();
    });
    titlebar.addEventListener('touchstart', (e) => {
      if (e.target.classList.contains('titlebar-btn') || e.target.closest('.titlebar-buttons')) return;
      const touch = e.touches[0];
      dragState = { win, ox: touch.clientX - win.offsetLeft, oy: touch.clientY - win.offsetTop };
    }, { passive: true });
  };

  document.querySelectorAll('.window.draggable').forEach(makeDraggable);

  // --- Resizing ---
  const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  const MIN_W = 300;
  const MIN_H = 250;
  let resizeState = null;

  const onResizeMove = (cx, cy) => {
    if (!resizeState) return;
    const s = resizeState;
    const dx = cx - s.startX;
    const dy = cy - s.startY;
    const { dir } = s;
    let newW = s.startW;
    let newH = s.startH;
    let newLeft = s.startLeft;
    let newTop = s.startTop;

    if (dir.includes('e')) newW = Math.max(MIN_W, s.startW + dx);
    if (dir.includes('w')) {
      newW = Math.max(MIN_W, s.startW - dx);
      newLeft = s.startLeft + (s.startW - newW);
    }
    if (dir.includes('s')) newH = Math.max(MIN_H, s.startH + dy);
    if (dir.includes('n')) {
      newH = Math.max(MIN_H, s.startH - dy);
      newTop = s.startTop + (s.startH - newH);
    }

    s.win.style.width = `${newW}px`;
    s.win.style.height = `${newH}px`;
    s.win.style.left = `${newLeft}px`;
    s.win.style.top = `${newTop}px`;
  };

  const makeResizable = (win) => {
    for (const dir of RESIZE_DIRS) {
      const handle = document.createElement('div');
      handle.className = `resize-handle resize-handle-${dir}`;
      handle.dataset.dir = dir;
      handle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        resizeState = {
          win, dir,
          startX: e.clientX, startY: e.clientY,
          startW: win.offsetWidth, startH: win.offsetHeight,
          startLeft: win.offsetLeft, startTop: win.offsetTop
        };
      });
      handle.addEventListener('pointermove', (e) => {
        if (!resizeState || resizeState.win !== win) return;
        onResizeMove(e.clientX, e.clientY);
      });
      handle.addEventListener('pointerup', () => {
        if (!resizeState || resizeState.win !== win) return;
        const w = resizeState.win;
        resizeState = null;
        w.dispatchEvent(new Event('windowresize'));
      });
      win.appendChild(handle);
    }
  };

  document.querySelectorAll('.window.resizable').forEach(makeResizable);

  window.mpTaskbar = {
    minimizeWindow,
    restoreWindow,
    closeWindow,
    makeDraggable,
    makeResizable,
    bringToFront
  };
})();
