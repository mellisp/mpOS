/* Explorer / Folder Browser */
(function () {
'use strict';

const { openWindow, t, tPlural, itemName, itemDesc, getItemIcon, ACTION_MAP } = window;

/* ── State ── */
let currentFolder = 'all';
let currentView = 'list';
let treeItems = null;

/* ── Data structures ── */
const FOLDER_ITEMS = {
  games: [
    { name: 'On Target', _key: 'onTarget', desc: 'A two-player target shooting game.', tag: 'HTML', action: 'openOnTarget' },
    { name: 'Chicken Fingers', _key: 'chickenFingers', desc: 'A two-player touch game.', tag: 'HTML', action: 'openChickenFingers', href: 'chicken-fingers.html' },
    { name: 'Brick Breaker', _key: 'brickBreaker', desc: 'Daily brick-breaking challenge.', tag: 'HTML', action: 'openBrickBreaker' },
    { name: 'Fractal Explorer', _key: 'fractal', desc: 'Interactive Mandelbrot and Julia set visualizer.', tag: 'HTML', action: 'openFractal' },
    { name: 'Slot Machine', _key: 'slotMachine', desc: 'Classic 3-reel slot machine with hold & nudge.', tag: 'HTML', action: 'openSlotMachine' }
  ],
  internet: [
    { name: 'WikiBrowser', _key: 'wikiBrowser', desc: 'Browse Wikipedia from within mpOS.', tag: 'API', action: 'openBrowser' },
    { name: 'Archive Browser', _key: 'archiveBrowser', desc: 'Browse the Internet Archive from within mpOS.', tag: 'API', action: 'openArchiveBrowser' },
    { name: 'Fish of the Day', _key: 'fishOfDay', desc: 'A new fish every day, powered by Wikipedia.', tag: 'API', action: 'openFishOfDay' },
    { name: 'Fish Finder', _key: 'fishFinder', desc: 'Find the closest aquarium near you.', tag: 'API', action: 'openFishFinder' },
    { name: 'Virtual Aquarium', _key: 'aquarium', desc: 'Watch real fish, in real-time.', tag: 'API', action: 'openAquarium' },
    { name: 'NEO Tracker', _key: 'neoTracker', desc: 'Track near-Earth objects approaching Earth.', tag: 'API', action: 'openNeoTracker' }
  ],
  accessories: [
    { name: 'Notepad', _key: 'notepad', desc: 'A simple text editor with save and load.', tag: 'HTML', action: 'openNotepad' },
    { name: 'Paint', _key: 'paint', desc: 'Create and edit images.', tag: 'HTML', action: 'openPaint' },
    { name: 'Sticky Notes', _key: 'stickyNotes', desc: 'Post-it style notes on the desktop.', tag: 'HTML', action: 'openStickyNotes' }
  ],
  audio: [
    { name: 'White Noise Mixer', _key: 'noiseMixer', desc: 'Mix colored noise for focus, sleep, or relaxation.', tag: 'HTML', action: 'openNoiseMixer' },
    { name: 'Tuning Fork', _key: 'tuningFork', desc: 'Pure tone generator for musical tuning.', tag: 'HTML', action: 'openTuningFork' },
    { name: 'Reverb', _key: 'reverb', desc: 'Audio reverb effect with patch cable routing.', tag: 'HTML', action: 'openReverb' }
  ],
  documents: [],
  utilities: [
    { name: 'Calculator', _key: 'calculator', desc: 'Basic arithmetic calculator.', tag: 'HTML', action: 'openCalculator' },
    { name: 'Calendar', _key: 'calendar', desc: 'Monthly calendar viewer.', tag: 'HTML', action: 'openCalendar' },
    { name: 'Time Zone', _key: 'timeZone', desc: 'World clocks for 8 cities.', tag: 'HTML', action: 'openTimeZone' },
    { name: 'Weather', _key: 'weather', desc: 'Three-day forecast for your location.', tag: 'API', action: 'openWeather' },
    { name: 'Disk Usage', _key: 'diskUsage', desc: 'Source code breakdown by file type.', tag: 'HTML', action: 'openDiskUsage' },
    { name: 'Visitor Map', _key: 'visitorMap', desc: 'See where visitors are coming from.', tag: 'API', action: 'openVisitorMap' },
    { name: 'Stopwatch', _key: 'stopwatch', desc: 'Stopwatch with lap times.', tag: 'HTML', action: 'openStopwatch' },
    { name: 'Voice Commands', _key: 'voiceCommands', desc: 'Control mpOS with your voice.', tag: 'HTML', action: 'openVoiceCommands' },
    { name: 'Cryptography', _key: 'cryptography', desc: 'Encrypt and decrypt messages with classic ciphers.', tag: 'HTML', action: 'openCryptography' }
  ]
};

const FOLDER_NAMES = {
  all:         { title: 'Files',       address: 'C:\\mpOS',                        _titleKey: 'title.files' },
  programs:    { title: 'Programs',    address: 'C:\\mpOS\\Programs',              _titleKey: 'ui.programs',    children: ['games', 'internet', 'accessories', 'audio'] },
  games:       { title: 'Games',       address: 'C:\\mpOS\\Programs\\Games',       _titleKey: 'ui.games' },
  internet:    { title: 'Internet',    address: 'C:\\mpOS\\Programs\\Internet',    _titleKey: 'ui.internet' },
  accessories: { title: 'Accessories', address: 'C:\\mpOS\\Programs\\Accessories', _titleKey: 'ui.accessories' },
  audio:       { title: 'Audio',       address: 'C:\\mpOS\\Programs\\Audio',       _titleKey: 'ui.audio' },
  documents:   { title: 'Documents',   address: 'C:\\mpOS\\Documents',             _titleKey: 'ui.documents' },
  utilities:   { title: 'Utilities',   address: 'C:\\mpOS\\Utilities',             _titleKey: 'ui.utilities' }
};

/* ── Helpers ── */

const explorerItemAction = (item) => {
  const fn = item.action && ACTION_MAP[item.action];
  if (!fn) return;
  if (item.href) {
    if (fn()) location.href = item.href;
  } else {
    fn();
  }
};

const renderExplorerContent = () => {
  const body = document.getElementById('explorerBody');
  const status = document.getElementById('explorerStatus');
  const info = FOLDER_NAMES[currentFolder];

  // Parent folders with children show subfolder tiles
  if (info && info.children) {
    const keys = info.children;
    status.textContent = tPlural('explorer.itemCount', keys.length);
    const container = document.createElement('div');
    container.className = currentView === 'icon' ? 'folder-icon-view' : 'folder-list-view';
    keys.forEach((key) => {
      const sub = FOLDER_NAMES[key];
      if (!sub) return;
      const label = sub._titleKey ? t(sub._titleKey) : sub.title;
      let tile;
      if (currentView === 'icon') {
        tile = document.createElement('div');
        tile.className = 'folder-icon-tile';
        tile.addEventListener('dblclick', () => navigateExplorer(key));
        const icon = document.createElement('span');
        icon.className = 'folder-tile-icon';
        icon.textContent = '\uD83D\uDCC2';
        tile.appendChild(icon);
        const nameEl = document.createElement('span');
        nameEl.className = 'folder-icon-label';
        nameEl.textContent = label;
        tile.appendChild(nameEl);
      } else {
        tile = document.createElement('div');
        tile.className = 'folder-list-item';
        tile.addEventListener('dblclick', () => navigateExplorer(key));
        const icon = document.createElement('span');
        icon.className = 'folder-tile-icon';
        icon.textContent = '\uD83D\uDCC2';
        tile.appendChild(icon);
        const nameEl = document.createElement('span');
        nameEl.className = 'folder-list-name';
        nameEl.textContent = label;
        tile.appendChild(nameEl);
        const descEl = document.createElement('span');
        descEl.className = 'folder-list-desc';
        descEl.textContent = '';
        tile.appendChild(descEl);
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = 'Folder';
        tile.appendChild(tagEl);
      }
      container.appendChild(tile);
    });
    body.textContent = '';
    body.appendChild(container);
    return;
  }

  let items;
  if (currentFolder === 'all') {
    items = FOLDER_ITEMS.games.concat(FOLDER_ITEMS.internet, FOLDER_ITEMS.accessories, FOLDER_ITEMS.audio, FOLDER_ITEMS.documents, FOLDER_ITEMS.utilities);
  } else {
    items = FOLDER_ITEMS[currentFolder];
  }

  if (!items.length) {
    body.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'folder-empty';
    empty.textContent = t('explorer.folderEmpty');
    body.appendChild(empty);
    status.textContent = tPlural('explorer.itemCount', 0);
    return;
  }

  status.textContent = tPlural('explorer.itemCount', items.length);

  if (currentView === 'icon') {
    const container = document.createElement('div');
    container.className = 'folder-icon-view';
    items.forEach((item) => {
      const tile = document.createElement('div');
      tile.className = 'folder-icon-tile';
      tile.addEventListener('dblclick', () => explorerItemAction(item));
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'none');
      svg.innerHTML = getItemIcon(item.name);
      tile.appendChild(svg);
      const label = document.createElement('span');
      label.className = 'folder-icon-label';
      label.textContent = itemName(item);
      tile.appendChild(label);
      container.appendChild(tile);
    });
    body.textContent = '';
    body.appendChild(container);
  } else {
    const container = document.createElement('div');
    container.className = 'folder-list-view';
    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'folder-list-item';
      row.addEventListener('dblclick', () => explorerItemAction(item));
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'none');
      svg.innerHTML = getItemIcon(item.name);
      row.appendChild(svg);
      const nameEl = document.createElement('span');
      nameEl.className = 'folder-list-name';
      nameEl.textContent = itemName(item);
      row.appendChild(nameEl);
      const descEl = document.createElement('span');
      descEl.className = 'folder-list-desc';
      descEl.textContent = itemDesc(item);
      row.appendChild(descEl);
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = item.tag;
      row.appendChild(tagEl);
      container.appendChild(row);
    });
    body.textContent = '';
    body.appendChild(container);
  }
};

/* ── Public API ── */

const openExplorer = () => {
  openWindow('explorer');
  navigateExplorer(currentFolder);
};

const openExplorerTo = (folder) => {
  openWindow('explorer');
  navigateExplorer(folder);
};

const navigateExplorer = (folder) => {
  currentFolder = folder;
  const info = FOLDER_NAMES[folder];
  document.getElementById('explorerTitle').textContent = info._titleKey ? t(info._titleKey) : info.title;
  document.getElementById('explorerAddress').textContent = info.address;

  if (!treeItems) treeItems = document.querySelectorAll('#explorer .tree-item');
  const folderIndex = { all: 0, programs: 1, games: 2, internet: 3, accessories: 4, audio: 5, documents: 6, utilities: 7 };
  treeItems.forEach((el, i) => {
    el.classList.toggle('active', i === folderIndex[folder]);
  });

  renderExplorerContent();
};

const setExplorerView = (view) => {
  currentView = view;
  const btns = document.querySelectorAll('#explorer .folder-view-btn');
  btns[0].classList.toggle('active', view === 'icon');
  btns[1].classList.toggle('active', view === 'list');
  renderExplorerContent();
};

/* ── Registration ── */
window.mpRegisterActions({ openExplorer });
window.mpRegisterWindows({ explorer: 'Files' });

/* ── Language change refresh ── */
const explorerRefreshOnLangChange = () => {
  const el = document.getElementById('explorer');
  if (el && el.style.display !== 'none') navigateExplorer(currentFolder);
};

/* ── Exports ── */
window.FOLDER_ITEMS = FOLDER_ITEMS;
window.FOLDER_NAMES = FOLDER_NAMES;
window.openExplorer = openExplorer;
window.openExplorerTo = openExplorerTo;
window.navigateExplorer = navigateExplorer;
window.setExplorerView = setExplorerView;
window.explorerRefreshOnLangChange = explorerRefreshOnLangChange;

})();
