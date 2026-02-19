/* Taskbar — Window Management */
(function () {
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
    startBtn.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      startBtn.classList.toggle('pressed');
      startMenu.classList.toggle('open');
    });
  }

  // --- Clock ---
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const mm = (m < 10 ? '0' : '') + m;
    if (localStorage.getItem('mp-clock') === '24') {
      clockEl.textContent = h + ':' + mm;
    } else {
      clockEl.textContent = (h % 12 || 12) + ':' + mm + ' ' + (h >= 12 ? 'PM' : 'AM');
    }
  }

  window.mpClockUpdate = updateClock;

  if (clockEl) {
    updateClock();
    setTimeout(function () {
      updateClock();
      setInterval(updateClock, 60000);
    }, (60 - new Date().getSeconds()) * 1000);
  }

  // --- Volume ---
  if (volumeIcon && volumePopup) {
    volumeIcon.addEventListener('click', function (e) {
      e.stopPropagation();
      volumePopup.classList.toggle('open');
      var np = document.querySelector('.net-popup');
      if (np) np.classList.remove('open');
      if (window.mpVoiceStop) window.mpVoiceStop();
      if (startMenu) startMenu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('pressed');
    });
  }

  if (volumeSlider) {
    const savedVol = localStorage.getItem('mp-volume');
    volumeSlider.value = savedVol !== null ? parseFloat(savedVol) * 100 : 10;
    volumeSlider.addEventListener('input', function () {
      localStorage.setItem('mp-volume', (volumeSlider.value / 100).toString());
      if (window.mpAudioUpdateVolume) window.mpAudioUpdateVolume();
    });
  }

  if (muteCheckbox) {
    muteCheckbox.checked = localStorage.getItem('mp-muted') === '1';
    muteCheckbox.addEventListener('change', function () {
      localStorage.setItem('mp-muted', muteCheckbox.checked ? '1' : '0');
      if (window.mpAudioUpdateVolume) window.mpAudioUpdateVolume();
    });
  }

  // --- Network Status ---
  const netIcon = document.getElementById('trayNetIcon');
  const netPopup = document.querySelector('.net-popup');
  const netPopupBody = document.getElementById('netPopupBody');

  function updateNetStatus() {
    if (!netIcon) return;
    if (navigator.onLine) {
      netIcon.classList.remove('offline');
      netIcon.title = 'Connected';
    } else {
      netIcon.classList.add('offline');
      netIcon.title = 'Disconnected';
    }
    renderNetPopup();
  }

  function renderNetPopup() {
    if (!netPopupBody) return;
    netPopupBody.textContent = '';
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const rows = [
      { label: 'Status', value: navigator.onLine ? 'Connected' : 'Disconnected' },
      { label: 'Type', value: conn ? conn.effectiveType || 'Unknown' : 'N/A (Chromium only)' },
      { label: 'Downlink', value: conn && conn.downlink != null ? conn.downlink + ' Mbps' : 'N/A' },
      { label: 'RTT', value: conn && conn.rtt != null ? conn.rtt + ' ms' : 'N/A' }
    ];
    for (let i = 0; i < rows.length; i++) {
      const row = document.createElement('div');
      row.className = 'net-popup-row';
      const lbl = document.createElement('span');
      lbl.className = 'net-label';
      lbl.textContent = rows[i].label;
      const val = document.createElement('span');
      val.textContent = rows[i].value;
      row.appendChild(lbl);
      row.appendChild(val);
      netPopupBody.appendChild(row);
    }
  }

  if (netIcon && netPopup) {
    netIcon.addEventListener('click', function (e) {
      e.stopPropagation();
      updateNetStatus();
      netPopup.classList.toggle('open');
      if (volumePopup) volumePopup.classList.remove('open');
      if (window.mpVoiceStop) window.mpVoiceStop();
      if (startMenu) startMenu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('pressed');
    });
  }

  window.addEventListener('online', updateNetStatus);
  window.addEventListener('offline', updateNetStatus);
  if (navigator.connection && navigator.connection.addEventListener) {
    navigator.connection.addEventListener('change', updateNetStatus);
  }
  updateNetStatus();

  // --- Dismiss popups on outside click (single listener) ---
  function clearTouchSubmenus() {
    document.querySelectorAll('.start-submenu.touch-open').forEach(function (s) {
      s.classList.remove('touch-open');
    });
  }

  document.addEventListener('mousedown', function (e) {
    if (startBtn && !startBtn.contains(e.target) && (!startMenu || !startMenu.contains(e.target))) {
      startBtn.classList.remove('pressed');
      if (startMenu) { startMenu.classList.remove('open'); clearTouchSubmenus(); }
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
    document.querySelectorAll('.start-menu-item.has-submenu').forEach(function (item) {
      item.addEventListener('click', function (e) {
        if (e.target.closest('.start-submenu')) return;
        e.stopPropagation();
        var sub = item.querySelector('.start-submenu');
        if (!sub) return;
        document.querySelectorAll('.start-submenu.touch-open').forEach(function (s) {
          if (s !== sub) s.classList.remove('touch-open');
        });
        sub.classList.toggle('touch-open');
      });
    });
  }

  // --- Window Management ---
  let topZ = 10;

  function bringToFront(win) {
    if (!win || win.style.display === 'none') return;
    topZ++;
    win.style.zIndex = topZ;
  }

  document.addEventListener('mousedown', function (e) {
    var win = e.target.closest('.window.draggable');
    if (win) bringToFront(win);
  });

  function onAnimEnd(el, cls, cb) {
    el.classList.add(cls);
    el.addEventListener('animationend', function handler() {
      el.removeEventListener('animationend', handler);
      el.classList.remove(cls);
      cb();
    });
  }

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
    neotracker: 'NEO Tracker'
  };

  function minimizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    onAnimEnd(win, 'minimizing', function () { win.style.display = 'none'; });
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
      item.addEventListener('click', function () { restoreWindow(id); });
      taskbarItems.appendChild(item);
    }
  }

  function restoreWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = '';
    bringToFront(win);
    onAnimEnd(win, 'restoring', function () {});
    if (taskbarItems) {
      const item = taskbarItems.querySelector('[data-window-id="' + id + '"]');
      if (item) item.remove();
    }
  }

  function closeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    onAnimEnd(win, 'closing', function () { win.style.display = 'none'; });
    if (taskbarItems) {
      const item = taskbarItems.querySelector('[data-window-id="' + id + '"]');
      if (item) item.remove();
    }
  }

  // --- Dragging ---
  let dragState = null;

  function onDragMove(clientX, clientY) {
    if (!dragState) return;
    const win = dragState.win;
    const x = Math.max(0, Math.min(clientX - dragState.ox, window.innerWidth - win.offsetWidth));
    const y = Math.max(0, Math.min(clientY - dragState.oy, window.innerHeight - win.offsetHeight));
    win.style.left = x + 'px';
    win.style.top = y + 'px';
  }

  document.addEventListener('mousemove', function (e) { onDragMove(e.clientX, e.clientY); });
  document.addEventListener('mouseup', function () { dragState = null; });

  document.addEventListener('touchmove', function (e) {
    if (!dragState) return;
    e.preventDefault();
    const t = e.touches[0];
    onDragMove(t.clientX, t.clientY);
  }, { passive: false });

  document.addEventListener('touchend', function () { dragState = null; });
  document.addEventListener('touchcancel', function () { dragState = null; });

  function makeDraggable(win) {
    const titlebar = win.querySelector('.titlebar');
    if (!titlebar) return;
    titlebar.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('titlebar-btn') || e.target.closest('.titlebar-buttons')) return;
      dragState = { win: win, ox: e.clientX - win.offsetLeft, oy: e.clientY - win.offsetTop };
      e.preventDefault();
    });
    titlebar.addEventListener('touchstart', function (e) {
      if (e.target.classList.contains('titlebar-btn') || e.target.closest('.titlebar-buttons')) return;
      const t = e.touches[0];
      dragState = { win: win, ox: t.clientX - win.offsetLeft, oy: t.clientY - win.offsetTop };
    }, { passive: true });
  }

  document.querySelectorAll('.window.draggable').forEach(makeDraggable);

  // --- Resizing ---
  const RESIZE_DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  const MIN_W = 300;
  const MIN_H = 250;
  let resizeState = null;

  function makeResizable(win) {
    for (let i = 0; i < RESIZE_DIRS.length; i++) {
      const dir = RESIZE_DIRS[i];
      const handle = document.createElement('div');
      handle.className = 'resize-handle resize-handle-' + dir;
      handle.dataset.dir = dir;
      handle.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        handle.setPointerCapture(e.pointerId);
        resizeState = {
          win: win,
          dir: dir,
          startX: e.clientX,
          startY: e.clientY,
          startW: win.offsetWidth,
          startH: win.offsetHeight,
          startLeft: win.offsetLeft,
          startTop: win.offsetTop
        };
      });
      handle.addEventListener('pointermove', function (e) {
        if (!resizeState || resizeState.win !== win) return;
        onResizeMove(e.clientX, e.clientY);
      });
      handle.addEventListener('pointerup', function () {
        if (!resizeState || resizeState.win !== win) return;
        var w = resizeState.win;
        resizeState = null;
        w.dispatchEvent(new Event('windowresize'));
      });
      win.appendChild(handle);
    }
  }

  function onResizeMove(cx, cy) {
    if (!resizeState) return;
    var s = resizeState;
    var dx = cx - s.startX;
    var dy = cy - s.startY;
    var dir = s.dir;
    var newW = s.startW;
    var newH = s.startH;
    var newLeft = s.startLeft;
    var newTop = s.startTop;

    if (dir.indexOf('e') !== -1) newW = Math.max(MIN_W, s.startW + dx);
    if (dir.indexOf('w') !== -1) {
      newW = Math.max(MIN_W, s.startW - dx);
      newLeft = s.startLeft + (s.startW - newW);
    }
    if (dir.indexOf('s') !== -1) newH = Math.max(MIN_H, s.startH + dy);
    if (dir.indexOf('n') !== -1) {
      newH = Math.max(MIN_H, s.startH - dy);
      newTop = s.startTop + (s.startH - newH);
    }

    s.win.style.width = newW + 'px';
    s.win.style.height = newH + 'px';
    s.win.style.left = newLeft + 'px';
    s.win.style.top = newTop + 'px';
  }

  document.querySelectorAll('.window.resizable').forEach(makeResizable);

  window.mpTaskbar = {
    minimizeWindow: minimizeWindow,
    restoreWindow: restoreWindow,
    closeWindow: closeWindow,
    makeDraggable: makeDraggable,
    makeResizable: makeResizable,
    bringToFront: bringToFront
  };
})();
