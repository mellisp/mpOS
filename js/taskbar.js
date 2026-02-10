/* Taskbar — Bits & Bobs */
(function () {
  const startBtn = document.querySelector('.start-btn');
  const startMenu = document.querySelector('.start-menu');
  const clockEl = document.querySelector('.tray-clock');
  const volumeIcon = document.querySelector('.tray-icon');
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
    clockEl.textContent = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h >= 12 ? 'PM' : 'AM');
  }

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
      if (startMenu) startMenu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('pressed');
    });
  }

  if (volumeSlider) {
    const savedVol = localStorage.getItem('bb-volume');
    volumeSlider.value = savedVol !== null ? parseFloat(savedVol) * 100 : 10;
    volumeSlider.addEventListener('input', function () {
      localStorage.setItem('bb-volume', (volumeSlider.value / 100).toString());
      if (window.bbAudioUpdateVolume) window.bbAudioUpdateVolume();
    });
  }

  if (muteCheckbox) {
    muteCheckbox.checked = localStorage.getItem('bb-muted') === '1';
    muteCheckbox.addEventListener('change', function () {
      localStorage.setItem('bb-muted', muteCheckbox.checked ? '1' : '0');
      if (window.bbAudioUpdateVolume) window.bbAudioUpdateVolume();
    });
  }

  // --- Dismiss popups on outside click (single listener) ---
  document.addEventListener('mousedown', function (e) {
    if (startBtn && !startBtn.contains(e.target) && (!startMenu || !startMenu.contains(e.target))) {
      startBtn.classList.remove('pressed');
      if (startMenu) startMenu.classList.remove('open');
    }
    if (volumePopup && !volumePopup.contains(e.target) && volumeIcon && !volumeIcon.contains(e.target)) {
      volumePopup.classList.remove('open');
    }
  });

  // --- Window Management ---
  function onAnimEnd(el, cls, cb) {
    el.classList.add(cls);
    el.addEventListener('animationend', function handler() {
      el.removeEventListener('animationend', handler);
      el.classList.remove(cls);
      cb();
    });
  }

  function minimizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    onAnimEnd(win, 'minimizing', function () { win.style.display = 'none'; });
    if (taskbarItems) {
      const item = document.createElement('button');
      item.className = 'taskbar-item';
      item.dataset.windowId = id;
      const titleEl = win.querySelector('.titlebar span');
      item.textContent = titleEl ? titleEl.textContent : id;
      item.addEventListener('click', function () { restoreWindow(id); });
      taskbarItems.appendChild(item);
    }
  }

  function restoreWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = '';
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

  document.addEventListener('mousemove', function (e) {
    if (!dragState) return;
    const win = dragState.win;
    const x = Math.max(0, Math.min(e.clientX - dragState.ox, window.innerWidth - win.offsetWidth));
    const y = Math.max(0, Math.min(e.clientY - dragState.oy, window.innerHeight - win.offsetHeight));
    win.style.left = x + 'px';
    win.style.top = y + 'px';
  });

  document.addEventListener('mouseup', function () { dragState = null; });

  function makeDraggable(win) {
    const titlebar = win.querySelector('.titlebar');
    if (!titlebar) return;
    titlebar.addEventListener('mousedown', function (e) {
      if (e.target.classList.contains('titlebar-btn') || e.target.closest('.titlebar-buttons')) return;
      dragState = { win: win, ox: e.clientX - win.offsetLeft, oy: e.clientY - win.offsetTop };
      e.preventDefault();
    });
  }

  document.querySelectorAll('.window.draggable').forEach(makeDraggable);

  window.bbTaskbar = {
    minimizeWindow: minimizeWindow,
    restoreWindow: restoreWindow,
    closeWindow: closeWindow,
    makeDraggable: makeDraggable
  };
})();
