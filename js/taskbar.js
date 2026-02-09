/* Taskbar — Bits & Bobs
   Start button, clock, volume control, window management, dragging */

(function () {
  // --- Start Button ---
  var startBtn = document.querySelector('.start-btn');
  var startMenu = document.querySelector('.start-menu');

  if (startBtn && startMenu) {
    startBtn.addEventListener('mousedown', function (e) {
      e.stopPropagation();
      startBtn.classList.toggle('pressed');
      startMenu.classList.toggle('open');
    });

    document.addEventListener('mousedown', function () {
      startBtn.classList.remove('pressed');
      startMenu.classList.remove('open');
    });
  }

  // --- Clock ---
  var clockEl = document.querySelector('.tray-clock');

  function updateClock() {
    if (!clockEl) return;
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    clockEl.textContent = h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

  if (clockEl) {
    updateClock();
    // Align to the next minute boundary
    var msToNext = (60 - new Date().getSeconds()) * 1000;
    setTimeout(function () {
      updateClock();
      setInterval(updateClock, 60000);
    }, msToNext);
  }

  // --- Volume ---
  var volumeIcon = document.querySelector('.tray-icon');
  var volumePopup = document.querySelector('.volume-popup');
  var volumeSlider = document.querySelector('.volume-slider');
  var muteCheckbox = document.querySelector('.volume-mute');

  if (volumeIcon && volumePopup) {
    volumeIcon.addEventListener('click', function (e) {
      e.stopPropagation();
      volumePopup.classList.toggle('open');
      // Close start menu if open
      if (startMenu) startMenu.classList.remove('open');
      if (startBtn) startBtn.classList.remove('pressed');
    });

    document.addEventListener('mousedown', function (e) {
      if (!volumePopup.contains(e.target) && e.target !== volumeIcon && !volumeIcon.contains(e.target)) {
        volumePopup.classList.remove('open');
      }
    });
  }

  if (volumeSlider) {
    var savedVol = localStorage.getItem('bb-volume');
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

  // --- Window Management ---
  function onAnimEnd(el, cb) {
    el.addEventListener('animationend', function handler() {
      el.removeEventListener('animationend', handler);
      cb();
    });
  }

  var taskbarItems = document.querySelector('.taskbar-items');

  function minimizeWindow(id) {
    var win = document.getElementById(id);
    if (!win) return;
    win.classList.add('minimizing');
    onAnimEnd(win, function () {
      win.style.display = 'none';
      win.classList.remove('minimizing');
    });

    // Create taskbar item
    if (taskbarItems) {
      var item = document.createElement('button');
      item.className = 'taskbar-item';
      item.dataset.windowId = id;
      var titleEl = win.querySelector('.titlebar span');
      item.textContent = titleEl ? titleEl.textContent : id;
      item.addEventListener('click', function () { restoreWindow(id); });
      taskbarItems.appendChild(item);
    }
  }

  function restoreWindow(id) {
    var win = document.getElementById(id);
    if (!win) return;
    win.style.display = '';
    win.classList.add('restoring');
    onAnimEnd(win, function () {
      win.classList.remove('restoring');
    });

    // Remove taskbar item
    if (taskbarItems) {
      var item = taskbarItems.querySelector('[data-window-id="' + id + '"]');
      if (item) item.remove();
    }
  }

  function closeWindow(id) {
    var win = document.getElementById(id);
    if (!win) return;
    win.classList.add('closing');
    onAnimEnd(win, function () {
      win.style.display = 'none';
      win.classList.remove('closing');
    });

    // Remove taskbar item if exists
    if (taskbarItems) {
      var item = taskbarItems.querySelector('[data-window-id="' + id + '"]');
      if (item) item.remove();
    }
  }

  // --- Dragging ---
  function makeDraggable(win) {
    var titlebar = win.querySelector('.titlebar');
    if (!titlebar) return;

    var dragging = false;
    var offsetX = 0;
    var offsetY = 0;

    titlebar.addEventListener('mousedown', function (e) {
      // Don't drag if clicking titlebar buttons
      if (e.target.classList.contains('titlebar-btn') || e.target.closest('.titlebar-buttons')) return;
      dragging = true;
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var x = e.clientX - offsetX;
      var y = e.clientY - offsetY;

      // Constrain to viewport
      var maxX = window.innerWidth - win.offsetWidth;
      var maxY = window.innerHeight - win.offsetHeight;
      x = Math.max(0, Math.min(x, maxX));
      y = Math.max(0, Math.min(y, maxY));

      win.style.left = x + 'px';
      win.style.top = y + 'px';
    });

    document.addEventListener('mouseup', function () {
      dragging = false;
    });
  }

  // Initialize draggable windows
  document.querySelectorAll('.window.draggable').forEach(makeDraggable);

  window.bbTaskbar = {
    minimizeWindow: minimizeWindow,
    restoreWindow: restoreWindow,
    closeWindow: closeWindow,
    makeDraggable: makeDraggable
  };
})();
