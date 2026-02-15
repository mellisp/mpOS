/* Main application logic — mpOS */
(function () {

/* ── Shared helpers ── */
const GEO_ERRORS = {
  1: 'Location access was denied.',
  2: 'Location information is unavailable.',
  3: 'Location request timed out.'
};

function getLocation(onSuccess, onError) {
  var done = false;
  function finish(lat, lon) {
    if (done) return;
    done = true;
    onSuccess(lat, lon);
  }
  function fallbackToIP() {
    if (done) return;
    fetch('https://ipapi.co/json/')
      .then(function (r) {
        if (!r.ok) throw new Error('IP lookup failed');
        return r.json();
      })
      .then(function (data) {
        if (data.latitude != null && data.longitude != null) {
          finish(data.latitude, data.longitude);
        } else {
          if (!done) { done = true; onError('Could not determine your location.'); }
        }
      })
      .catch(function () {
        if (!done) { done = true; onError('Could not determine your location.'); }
      });
  }

  if (!navigator.geolocation) {
    fallbackToIP();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) { finish(pos.coords.latitude, pos.coords.longitude); },
    function () { fallbackToIP(); },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
}

function alertTriangleSVG(id) {
  return '<svg class="alert-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="' + id + '" x1="0.3" y1="0" x2="0.7" y2="1">' +
    '<stop offset="0%" stop-color="#fffde0"/><stop offset="20%" stop-color="#ffe88a"/>' +
    '<stop offset="50%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#e8a000"/>' +
    '</linearGradient></defs>' +
    '<path d="M16 2 L30 28 L2 28 Z" fill="url(#' + id + ')" stroke="#a07000" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<line x1="6" y1="26" x2="16" y2="5" stroke="white" stroke-width="1" opacity="0.3" stroke-linecap="round"/>' +
    '<ellipse cx="13" cy="14" rx="5" ry="6" fill="white" opacity="0.15"/>' +
    '<rect x="14.5" y="11" width="3" height="9" rx="1.5" fill="#5d4037"/>' +
    '<rect x="14.5" y="22" width="3" height="3" rx="1.5" fill="#5d4037"/></svg>';
}

function showErrorPanel(body, msg, gradientId) {
  body.textContent = '';
  var wrap = document.createElement('div');
  wrap.className = 'error-panel';
  var row = document.createElement('div');
  row.className = 'error-row';
  var svgWrap = document.createElement('span');
  svgWrap.innerHTML = alertTriangleSVG(gradientId);
  row.appendChild(svgWrap);
  var text = document.createElement('div');
  text.className = 'error-text';
  text.textContent = msg;
  row.appendChild(text);
  wrap.appendChild(row);
  body.appendChild(wrap);
}

/* ── Cached DOM refs ── */
const calcDisplay = document.getElementById('calcDisplay');
const notepadEditor = document.getElementById('notepadEditor');
const notepadStatus = document.getElementById('notepadStatus');
const notepadTitle = document.getElementById('notepadTitle');
let notepadCurrentFile = null;
let notepadDirty = false;

function openWindow(id) {
  var win = document.getElementById(id);
  if (!win) return;
  if (win.style.display !== 'none') {
    if (window.bbTaskbar) window.bbTaskbar.bringToFront(win);
    return;
  }
  win.style.display = '';
  if (window.bbTaskbar) window.bbTaskbar.bringToFront(win);
  win.classList.add('restoring');
  win.addEventListener('animationend', function handler() {
    win.classList.remove('restoring');
    win.removeEventListener('animationend', handler);
  });
}

const startMenuEl = document.querySelector('.start-menu');
const startBtnEl = document.querySelector('.start-btn');
function closeStartMenu() {
  if (startMenuEl) startMenuEl.classList.remove('open');
  if (startBtnEl) startBtnEl.classList.remove('pressed');
}

/* ── Explorer / Folder Browser ── */
let explorerCurrentFolder = 'all';
let explorerCurrentView = 'list';
let explorerTreeItems = null;

const FOLDER_ITEMS = {
  programs: [
    { name: 'WikiBrowser', desc: 'Browse Wikipedia from within mpOS.', tag: 'HTML', action: 'openBrowser' },
    { name: 'Fish of the Day', desc: 'A new fish every day, powered by Wikipedia.', tag: 'HTML', action: 'openFishOfDay' },
    { name: 'Fish Finder', desc: 'Find the closest aquarium near you.', tag: 'HTML', action: 'openFishFinder' },
    { name: 'On Target', desc: 'A two-player target shooting game.', tag: 'HTML', action: 'openOnTarget' },
    { name: 'Virtual Aquarium', desc: 'Watch real fish, in real-time.', tag: 'HTML', action: 'openAquarium' },
    { name: 'Chicken Fingers', desc: 'A two-player touch game.', tag: 'HTML', action: 'openChickenFingers', href: 'chicken-fingers.html' },
    { name: 'Paint', desc: 'Create and edit images.', tag: 'HTML', action: 'openPaint' },
    { name: 'Brick Breaker', desc: 'Daily brick-breaking challenge.', tag: 'HTML', action: 'openBrickBreaker' }
  ],
  documents: [],
  utilities: [
    { name: 'Notepad', desc: 'A simple text editor with save and load.', tag: 'HTML', action: 'openNotepad' },
    { name: 'Calculator', desc: 'Basic arithmetic calculator.', tag: 'HTML', action: 'openCalculator' },
    { name: 'Calendar', desc: 'Monthly calendar viewer.', tag: 'HTML', action: 'openCalendar' },
    { name: 'Time Zone', desc: 'World clocks for 8 cities.', tag: 'HTML', action: 'openTimeZone' },
    { name: 'Weather', desc: 'Three-day forecast for your location.', tag: 'API', action: 'openWeather' },
    { name: 'Disk Usage', desc: 'Source code breakdown by file type.', tag: 'HTML', action: 'openDiskUsage' },
    { name: 'Visitor Map', desc: 'See where visitors are coming from.', tag: 'API', action: 'openVisitorMap' },
    { name: 'Help', desc: 'Browse the mpOS help documentation.', tag: 'HTML', action: 'openHelp' }
  ]
};

const FOLDER_NAMES = {
  all: { title: 'Files', address: 'C:\\mpOS' },
  programs: { title: 'Programs', address: 'C:\\mpOS\\Programs' },
  documents: { title: 'Documents', address: 'C:\\mpOS\\Documents' },
  utilities: { title: 'Utilities', address: 'C:\\mpOS\\Utilities' }
};

function openExplorer() {
  openWindow('explorer');
  navigateExplorer(explorerCurrentFolder);
}

function openExplorerTo(folder) {
  openWindow('explorer');
  navigateExplorer(folder);
}

function navigateExplorer(folder) {
  explorerCurrentFolder = folder;
  var info = FOLDER_NAMES[folder];
  document.getElementById('explorerTitle').textContent = info.title;
  document.getElementById('explorerAddress').textContent = info.address;

  if (!explorerTreeItems) explorerTreeItems = document.querySelectorAll('#explorer .tree-item');
  var folderIndex = { all: 0, programs: 1, documents: 2, utilities: 3 };
  explorerTreeItems.forEach(function (el, i) {
    el.classList.toggle('active', i === folderIndex[folder]);
  });

  renderExplorerContent();
}

function explorerItemAction(item) {
  var fn = item.action && ACTION_MAP[item.action];
  if (!fn) return;
  if (item.href) {
    if (fn()) location.href = item.href;
  } else {
    fn();
  }
}

function renderExplorerContent() {
  var body = document.getElementById('explorerBody');
  var status = document.getElementById('explorerStatus');
  var items;

  if (explorerCurrentFolder === 'all') {
    items = FOLDER_ITEMS.programs.concat(FOLDER_ITEMS.documents, FOLDER_ITEMS.utilities);
  } else {
    items = FOLDER_ITEMS[explorerCurrentFolder];
  }

  if (!items.length) {
    body.textContent = '';
    var empty = document.createElement('div');
    empty.className = 'folder-empty';
    empty.textContent = 'This folder is empty.';
    body.appendChild(empty);
    status.textContent = '0 item(s)';
    return;
  }

  status.textContent = items.length + ' item(s)';

  if (explorerCurrentView === 'icon') {
    var container = document.createElement('div');
    container.className = 'folder-icon-view';
    items.forEach(function (item) {
      var tile = document.createElement('div');
      tile.className = 'folder-icon-tile';
      tile.addEventListener('dblclick', function () { explorerItemAction(item); });
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'none');
      svg.innerHTML = getItemIcon(item.name);
      tile.appendChild(svg);
      var label = document.createElement('span');
      label.className = 'folder-icon-label';
      label.textContent = item.name;
      tile.appendChild(label);
      container.appendChild(tile);
    });
    body.textContent = '';
    body.appendChild(container);
  } else {
    var container = document.createElement('div');
    container.className = 'folder-list-view';
    items.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'folder-list-item';
      row.addEventListener('dblclick', function () { explorerItemAction(item); });
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'none');
      svg.innerHTML = getItemIcon(item.name);
      row.appendChild(svg);
      var nameEl = document.createElement('span');
      nameEl.className = 'folder-list-name';
      nameEl.textContent = item.name;
      row.appendChild(nameEl);
      var descEl = document.createElement('span');
      descEl.className = 'folder-list-desc';
      descEl.textContent = item.desc;
      row.appendChild(descEl);
      var tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = item.tag;
      row.appendChild(tagEl);
      container.appendChild(row);
    });
    body.textContent = '';
    body.appendChild(container);
  }
}

function setExplorerView(view) {
  explorerCurrentView = view;
  var btns = document.querySelectorAll('#explorer .folder-view-btn');
  btns[0].classList.toggle('active', view === 'icon');
  btns[1].classList.toggle('active', view === 'list');
  renderExplorerContent();
}

function getItemIcon(name) {
  var icons = {
    'WikiBrowser': '<defs><radialGradient id="ei-wb" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#e0f4ff"/><stop offset="25%" stop-color="#80c8f0"/><stop offset="55%" stop-color="#4a8abe"/><stop offset="100%" stop-color="#2a6898"/></radialGradient><clipPath id="ei-wbc"><circle cx="10" cy="10" r="7.5"/></clipPath></defs><circle cx="10" cy="10" r="8" fill="url(#ei-wb)" stroke="#1a4a6e" stroke-width="1"/><g clip-path="url(#ei-wbc)" opacity="0.35"><ellipse cx="8" cy="8" rx="3" ry="2.5" fill="#5aaa80"/><ellipse cx="13" cy="11" rx="2" ry="3" fill="#5aaa80"/></g><ellipse cx="10" cy="10" rx="3.5" ry="8" fill="none" stroke="#1a4a6e" stroke-width="0.7"/><line x1="2" y1="10" x2="18" y2="10" stroke="#1a4a6e" stroke-width="0.7"/><path d="M3.5 6.5 Q10 5.5 16.5 6.5" fill="none" stroke="#1a4a6e" stroke-width="0.5"/><path d="M3.5 13.5 Q10 14.5 16.5 13.5" fill="none" stroke="#1a4a6e" stroke-width="0.5"/><ellipse cx="7.5" cy="7" rx="4" ry="3" fill="white" opacity="0.3"/>',
    'Fish of the Day': '<defs><linearGradient id="ei-fd" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#a0e8c0"/><stop offset="50%" stop-color="#60b888"/><stop offset="100%" stop-color="#2a8858"/></linearGradient></defs><path d="M1 7 Q3 10 1 14 L4 11 Z" fill="url(#ei-fd)" stroke="#1a5c42" stroke-width="0.6"/><ellipse cx="10" cy="11" rx="8" ry="5" fill="url(#ei-fd)" stroke="#1a5c42" stroke-width="0.8"/><ellipse cx="9" cy="9.5" rx="5" ry="2" fill="white" opacity="0.25"/><circle cx="15" cy="10" r="1" fill="#1a5c42"/>',
    'Fish Finder': '<defs><radialGradient id="ei-ff" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="50%" stop-color="#c8e0f8"/><stop offset="100%" stop-color="#88bbe0"/></radialGradient></defs><circle cx="9" cy="9" r="6" fill="url(#ei-ff)" stroke="#1a4a6e" stroke-width="1.5"/><ellipse cx="7.5" cy="7.5" rx="3" ry="2" fill="white" opacity="0.4"/><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="#8a8680" stroke-width="2.5" stroke-linecap="round"/>',
    'On Target': '<defs><radialGradient id="ei-ot" cx="0.4" cy="0.4" r="0.6"><stop offset="0%" stop-color="#ff6b6b"/><stop offset="60%" stop-color="#ef5350"/><stop offset="100%" stop-color="#c62828"/></radialGradient></defs><circle cx="10" cy="10" r="9" fill="url(#ei-ot)" stroke="#c62828" stroke-width="0.6"/><circle cx="10" cy="10" r="7" fill="#fff"/><circle cx="10" cy="10" r="5" fill="url(#ei-ot)"/><circle cx="10" cy="10" r="3" fill="#fff"/><circle cx="10" cy="10" r="1.5" fill="url(#ei-ot)"/>',
    'Virtual Aquarium': '<defs><linearGradient id="ei-va" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#d0e8ff"/><stop offset="50%" stop-color="#5a9ece"/><stop offset="100%" stop-color="#2a6898"/></linearGradient><linearGradient id="ei-vw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a8aaa"/><stop offset="50%" stop-color="#0d5a76"/><stop offset="100%" stop-color="#082a3e"/></linearGradient></defs><rect x="1" y="3" width="18" height="12" rx="2" fill="url(#ei-va)" stroke="#1a4a6e" stroke-width="0.6"/><rect x="3" y="5" width="14" height="8" rx="1" fill="url(#ei-vw)"/><circle cx="8" cy="9" r="1.5" fill="#ffc107"/><circle cx="13" cy="10" r="1" fill="#ffc107"/>',
    'Chicken Fingers': '<defs><radialGradient id="ei-cf" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#fffde0"/><stop offset="50%" stop-color="#ffe082"/><stop offset="100%" stop-color="#f9a825"/></radialGradient></defs><ellipse cx="10" cy="12" rx="6" ry="5" fill="url(#ei-cf)" stroke="#c49000" stroke-width="0.6"/><circle cx="10" cy="6" r="4" fill="url(#ei-cf)" stroke="#c49000" stroke-width="0.6"/><circle cx="8.5" cy="5.5" r="0.8" fill="#5d4037"/><circle cx="11.5" cy="5.5" r="0.8" fill="#5d4037"/><path d="M9 7.5 L10 8.5 L11 7.5" stroke="#e67e22" stroke-width="0.8" fill="#e67e22"/>',
    'Notepad': '<defs><linearGradient id="ei-np" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#f0f4ff"/><stop offset="100%" stop-color="#a0b8d8"/></linearGradient></defs><rect x="3" y="1" width="14" height="18" rx="1" fill="url(#ei-np)" stroke="#4a6a8e" stroke-width="0.8"/><line x1="6" y1="7" x2="14" y2="7" stroke="#4a6a8e" stroke-width="0.6"/><line x1="6" y1="10" x2="14" y2="10" stroke="#4a6a8e" stroke-width="0.6"/><line x1="6" y1="13" x2="11" y2="13" stroke="#4a6a8e" stroke-width="0.6"/>',
    'Calendar': '<defs><linearGradient id="ei-cl" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#d8d8d8"/></linearGradient><linearGradient id="ei-clb" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ef5350"/><stop offset="50%" stop-color="#d32f2f"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient></defs><rect x="3" y="3" width="14" height="16" rx="1" fill="url(#ei-cl)" stroke="#8a8680" stroke-width="0.8"/><rect x="3" y="3" width="14" height="3.5" rx="1" fill="url(#ei-clb)"/><circle cx="7" cy="10" r="0.6" fill="#808080"/><circle cx="10" cy="10" r="0.6" fill="#808080"/><circle cx="13" cy="10" r="0.6" fill="#808080"/><circle cx="7" cy="13" r="0.6" fill="#808080"/><circle cx="10" cy="13" r="0.6" fill="#808080"/><circle cx="13" cy="13" r="0.6" fill="#808080"/><circle cx="7" cy="16" r="0.6" fill="#808080"/><circle cx="10" cy="16" r="0.6" fill="#808080"/>',
    'Calculator': '<defs><linearGradient id="ei-ca" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#e8e4dc"/><stop offset="100%" stop-color="#a8a49c"/></linearGradient></defs><rect x="3" y="1" width="14" height="18" rx="1.5" fill="url(#ei-ca)" stroke="#8a8680" stroke-width="0.8"/><rect x="5" y="3" width="10" height="3" rx="0.5" fill="#d0e8c0" stroke="#6a8a5a" stroke-width="0.5"/><rect x="5" y="8" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="9" y="8" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="13" y="8" width="2" height="2" rx="0.3" fill="#c8d8e8" stroke="#6a8a9e" stroke-width="0.4"/><rect x="5" y="12" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="9" y="12" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/>',
    'Time Zone': '<defs><linearGradient id="ei-tz" x1="0.3" y1="0.1" x2="0.7" y2="0.9"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="50%" stop-color="#d8e8f8"/><stop offset="100%" stop-color="#a0c0e0"/></linearGradient><linearGradient id="ei-tzr" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#c8d8e8"/><stop offset="50%" stop-color="#8aa8c8"/><stop offset="100%" stop-color="#4a6a8e"/></linearGradient></defs><circle cx="10" cy="10" r="8.5" fill="url(#ei-tzr)" stroke="#2a4a6e" stroke-width="0.8"/><circle cx="10" cy="10" r="7" fill="url(#ei-tz)"/><ellipse cx="8.5" cy="7" rx="4" ry="3" fill="white" opacity="0.3"/><line x1="10" y1="10" x2="10" y2="5" stroke="#2a4a6e" stroke-width="1.2" stroke-linecap="round"/><line x1="10" y1="10" x2="14" y2="10" stroke="#2a4a6e" stroke-width="0.9" stroke-linecap="round"/><circle cx="10" cy="10" r="0.8" fill="#2a4a6e"/><path d="M3.5 13 Q10 15.5 16.5 13" fill="none" stroke="#4a8abe" stroke-width="0.5" opacity="0.6"/><path d="M3.5 7 Q10 4.5 16.5 7" fill="none" stroke="#4a8abe" stroke-width="0.5" opacity="0.6"/>',
    'Weather': '<defs><radialGradient id="ei-we" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#fffde0"/><stop offset="100%" stop-color="#f9a825"/></radialGradient></defs><circle cx="7" cy="6" r="4" fill="url(#ei-we)" stroke="#c49000" stroke-width="0.8"/><path d="M5 16 Q5 13 8 13 Q8.5 11 11 11 Q14 11 14.5 13 Q17 13 17 15 Q17 17 15 17 L7 17 Q5 17 5 16Z" fill="#e8e4dc" stroke="#8a8680" stroke-width="0.7"/>',
    'Disk Usage': '<defs><linearGradient id="ei-du" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#e0dcd4"/><stop offset="30%" stop-color="#c8c4bc"/><stop offset="70%" stop-color="#a8a49c"/><stop offset="100%" stop-color="#8a8680"/></linearGradient><linearGradient id="ei-dup" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#1a1a1a"/></linearGradient></defs><rect x="2" y="6" width="16" height="10" rx="1.5" fill="url(#ei-du)" stroke="#6a6660" stroke-width="0.8"/><rect x="4" y="8" width="8" height="5" rx="0.5" fill="url(#ei-dup)" stroke="#4a4a4a" stroke-width="0.5"/><circle cx="8" cy="10.5" r="1.8" fill="none" stroke="#555" stroke-width="0.4"/><circle cx="8" cy="10.5" r="0.5" fill="#888"/><circle cx="15" cy="13" r="0.8" fill="#5aaa80" stroke="#2a7a52" stroke-width="0.3"/>',
    'Brick Breaker': '<defs><radialGradient id="ei-bb-red" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ff8a80"/><stop offset="50%" stop-color="#ef5350"/><stop offset="100%" stop-color="#c62828"/></radialGradient><radialGradient id="ei-bb-yellow" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ffd54f"/><stop offset="50%" stop-color="#ffc107"/><stop offset="100%" stop-color="#e8a000"/></radialGradient><radialGradient id="ei-bb-green" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#9ccc9c"/><stop offset="50%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></radialGradient><linearGradient id="ei-bb-paddle" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c8e0f8"/><stop offset="100%" stop-color="#4a8abe"/></linearGradient><radialGradient id="ei-bb-ball" cx="0.3" cy="0.3" r="0.7"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8e8e8"/></radialGradient></defs><rect x="2" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="7" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="12" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="2" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="7" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="12" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="2" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><rect x="7" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><rect x="12" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><circle cx="10" cy="13" r="1.8" fill="url(#ei-bb-ball)" stroke="#bdbdbd" stroke-width="0.6"/><rect x="6.5" y="16" width="7" height="1.8" rx="0.5" fill="url(#ei-bb-paddle)" stroke="#1a4a6e" stroke-width="0.7"/><ellipse cx="3.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="8.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="13.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="9.3" cy="12.3" rx="0.9" ry="0.7" fill="white" opacity="0.5"/><ellipse cx="8.5" cy="16.4" rx="2.5" ry="0.5" fill="white" opacity="0.3"/>',
    'Paint': '<defs><linearGradient id="ei-pt" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#fff3c4"/><stop offset="30%" stop-color="#ffe082"/><stop offset="70%" stop-color="#f0c050"/><stop offset="100%" stop-color="#c49000"/></linearGradient></defs><ellipse cx="10" cy="11" rx="8" ry="7" fill="url(#ei-pt)" stroke="#a07000" stroke-width="0.8"/><ellipse cx="9" cy="8" rx="5" ry="3" fill="white" opacity="0.25"/><circle cx="6" cy="9" r="1.5" fill="#ef5350"/><circle cx="9" cy="7" r="1.3" fill="#4a8abe"/><circle cx="13" cy="8" r="1.4" fill="#5aaa80"/><circle cx="14" cy="11" r="1.3" fill="#ffc107"/><circle cx="6" cy="13" r="1.2" fill="#9c27b0"/><ellipse cx="11" cy="14" rx="1" ry="0.8" fill="#ff9800"/><path d="M15 5 Q16 3 17 2 Q18 1.5 18 3 Q17 4 16 6 Q15 7 15 5Z" fill="#a07000" stroke="#785000" stroke-width="0.5"/>',
    'Help': '<defs><linearGradient id="ei-hp" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#fff3c4"/><stop offset="30%" stop-color="#ffc107"/><stop offset="70%" stop-color="#e8a010"/><stop offset="100%" stop-color="#c49000"/></linearGradient><linearGradient id="ei-hpp" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#d8d8d8"/></linearGradient></defs><rect x="2" y="3" width="3" height="14" rx="0.5" fill="url(#ei-hp)" stroke="#c49000" stroke-width="0.6"/><rect x="5" y="4" width="11" height="12" rx="1" fill="url(#ei-hpp)" stroke="#8a8680" stroke-width="0.6"/><path d="M9.5 8 Q9.5 6.5 11 6.5 Q12.5 6.5 12.5 8 Q12.5 9 11 9.5 L11 10.5" fill="none" stroke="#4a8abe" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="12.5" r="0.7" fill="#4a8abe"/>',
    'Visitor Map': '<defs><radialGradient id="ei-vm" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#e0f4ff"/><stop offset="25%" stop-color="#80c8f0"/><stop offset="55%" stop-color="#4a8abe"/><stop offset="100%" stop-color="#2a6898"/></radialGradient><clipPath id="ei-vmc"><circle cx="10" cy="10" r="7.5"/></clipPath></defs><circle cx="10" cy="10" r="8" fill="url(#ei-vm)" stroke="#1a4a6e" stroke-width="1"/><g clip-path="url(#ei-vmc)" opacity="0.35"><ellipse cx="6" cy="8" rx="4" ry="3" fill="#5aaa80"/><ellipse cx="14" cy="7" rx="3" ry="2.5" fill="#5aaa80"/><ellipse cx="10" cy="14" rx="5" ry="2" fill="#5aaa80"/></g><ellipse cx="10" cy="10" rx="3.5" ry="8" fill="none" stroke="#1a4a6e" stroke-width="0.6"/><line x1="2" y1="10" x2="18" y2="10" stroke="#1a4a6e" stroke-width="0.6"/><circle cx="14" cy="6" r="2" fill="#ef5350" opacity="0.8"/><circle cx="14" cy="6" r="0.5" fill="#c62828"/>'
  };
  return icons[name] || '';
}

function openMyComputer() {
  openWindow('mycomputer');
  populateSysInfo();
}

function openChickenFingers() {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    openWindow('chickenError');
    return false;
  }
  return true;
}

function exitSite() {
  closeStartMenu();
  window.close();
  document.title = 'Goodbye!';
  document.body.innerHTML = '';
  document.body.style.background = '#3a6ea5';
}

/* ── YouTube API lazy loader ── */
function loadYouTubeAPI() {
  return new Promise(function (resolve) {
    if (window.YT && window.YT.Player) { resolve(); return; }
    window.onYouTubeIframeAPIReady = resolve;
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

/* ── Virtual Aquarium (YouTube IFrame Player API) ── */
let aquariumPlayer = null;
let aquariumTimer = null;

function openAquarium() {
  var embed = document.getElementById('aquariumEmbed');
  var shield = document.getElementById('aquariumShield');
  openWindow('aquarium');
  if (!embed.dataset.loaded) {
    shield.classList.remove('loaded');
    embed.dataset.loaded = '1';
    loadYouTubeAPI().then(function () {
      var playerDiv = document.createElement('div');
      playerDiv.id = 'ytAquariumPlayer';
      embed.appendChild(playerDiv);
      aquariumPlayer = new YT.Player('ytAquariumPlayer', {
        videoId: 'DHUnz4dyb54',
        playerVars: {
          autoplay: 1, mute: 1, controls: 0, rel: 0,
          iv_load_policy: 3, modestbranding: 1,
          disablekb: 1, fs: 0
        },
        events: {
          onReady: function () {
            aquariumTimer = setTimeout(function () { shield.classList.add('loaded'); }, 5000);
          }
        }
      });
    });
  }
}

function closeAquarium() {
  var embed = document.getElementById('aquariumEmbed');
  var shield = document.getElementById('aquariumShield');
  if (aquariumPlayer && aquariumPlayer.destroy) {
    aquariumPlayer.destroy();
    aquariumPlayer = null;
  }
  var iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  clearTimeout(aquariumTimer);
  shield.classList.remove('loaded');
  embed.dataset.loaded = '';
  bbTaskbar.closeWindow('aquarium');
}

/* ── On Target (embedded game) ── */
function openOnTarget() {
  var embed = document.getElementById('ontargetEmbed');
  openWindow('ontarget');
  if (!embed.dataset.loaded) {
    embed.dataset.loaded = '1';
    var iframe = document.createElement('iframe');
    iframe.src = 'target-game.html';
    iframe.title = 'On Target';
    var initialLoad = true;
    iframe.addEventListener('load', function () {
      if (initialLoad) { initialLoad = false; return; }
      closeOnTarget();
    });
    embed.appendChild(iframe);
  }
}

function closeOnTarget() {
  var embed = document.getElementById('ontargetEmbed');
  var iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  embed.dataset.loaded = '';
  bbTaskbar.closeWindow('ontarget');
}

/* ── Brick Breaker (embedded game) ── */
function openBrickBreaker() {
  var embed = document.getElementById('brickbreakerEmbed');
  openWindow('brickbreaker');
  if (!embed.dataset.loaded) {
    embed.dataset.loaded = '1';
    var iframe = document.createElement('iframe');
    iframe.src = 'brick-breaker.html';
    iframe.title = 'Brick Breaker';
    var initialLoad = true;
    iframe.addEventListener('load', function () {
      if (initialLoad) { initialLoad = false; return; }
      closeBrickBreaker();
    });
    embed.appendChild(iframe);
  }
}

function closeBrickBreaker() {
  var embed = document.getElementById('brickbreakerEmbed');
  var iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  embed.dataset.loaded = '';
  bbTaskbar.closeWindow('brickbreaker');
}

function openFishOfDay() {
  if (checkFishDay()) fishPopulated = false;
  openWindow('fishofday');
  populateFish();
}

function populateSysInfo() {
  var body = document.getElementById('sysInfoBody');
  if (body.dataset.populated) return;
  body.dataset.populated = '1';

  var ua = navigator.userAgent;
  var nav = navigator;
  var scr = screen;

  function makeSection(title, rows) {
    var valid = rows.filter(function (r) { return r[1] != null; });
    if (!valid.length) return null;
    var frag = document.createDocumentFragment();
    var titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    titleEl.textContent = title;
    frag.appendChild(titleEl);
    var sunken = document.createElement('div');
    sunken.className = 'sunken';
    var table = document.createElement('table');
    table.className = 'sysinfo-table';
    valid.forEach(function (r) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.textContent = r[0];
      tr.appendChild(th);
      var td = document.createElement('td');
      td.textContent = r[1];
      tr.appendChild(td);
      table.appendChild(tr);
    });
    sunken.appendChild(table);
    frag.appendChild(sunken);
    return frag;
  }

  var os = null;
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/CrOS/.test(ua)) os = 'Chrome OS';
  else if (/Linux/.test(ua)) os = 'Linux';

  var browser = null;
  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Apple Safari';

  body.textContent = '';

  // Hero section — SVG is hardcoded so innerHTML on a detached element is safe
  var hero = document.createElement('div');
  hero.className = 'sysinfo-hero';
  hero.innerHTML = '<svg width="80" height="80" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="si-body" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#d0e8ff"/><stop offset="25%" stop-color="#6aafe0"/><stop offset="60%" stop-color="#3a7ab0"/><stop offset="100%" stop-color="#1a4a6e"/></linearGradient>' +
    '<linearGradient id="si-screen" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0%" stop-color="#e8f4ff"/><stop offset="30%" stop-color="#c0ddf0"/><stop offset="70%" stop-color="#90bce0"/><stop offset="100%" stop-color="#6898c0"/></linearGradient>' +
    '<linearGradient id="si-bezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b8d0e0"/><stop offset="100%" stop-color="#7a9ab8"/></linearGradient>' +
    '<linearGradient id="si-stand" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0ece4"/><stop offset="50%" stop-color="#d4d0c8"/><stop offset="100%" stop-color="#a0a098"/></linearGradient>' +
    '<linearGradient id="si-base" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0ece4"/><stop offset="40%" stop-color="#d4d0c8"/><stop offset="100%" stop-color="#a0a098"/></linearGradient></defs>' +
    '<ellipse cx="24" cy="43" rx="16" ry="2" fill="#00000020"/>' +
    '<rect x="4" y="4" width="40" height="28" rx="3" fill="url(#si-body)" stroke="#1a4a6e" stroke-width="1.5"/>' +
    '<line x1="6" y1="5" x2="42" y2="5" stroke="white" stroke-width="0.8" opacity="0.5" stroke-linecap="round"/>' +
    '<line x1="5" y1="6" x2="5" y2="30" stroke="white" stroke-width="0.6" opacity="0.3"/>' +
    '<ellipse cx="18" cy="10" rx="14" ry="6" fill="white" opacity="0.35"/>' +
    '<rect x="7" y="7" width="34" height="22" rx="1.5" fill="url(#si-bezel)" stroke="#1a4a6e" stroke-width="0.5"/>' +
    '<rect x="8" y="8" width="32" height="20" rx="1" fill="url(#si-screen)"/>' +
    '<ellipse cx="18" cy="14" rx="12" ry="7" fill="white" opacity="0.15"/>' +
    '<rect x="18" y="34" width="12" height="4" rx="1" fill="url(#si-stand)" stroke="#8a8680" stroke-width="0.75"/>' +
    '<line x1="19" y1="34.5" x2="29" y2="34.5" stroke="white" stroke-width="0.5" opacity="0.4"/>' +
    '<rect x="11" y="38" width="26" height="3" rx="1.5" fill="url(#si-base)" stroke="#8a8680" stroke-width="0.75"/>' +
    '<line x1="12" y1="38.5" x2="36" y2="38.5" stroke="white" stroke-width="0.5" opacity="0.5"/>' +
    '</svg>';
  if (os) {
    var osEl = document.createElement('div');
    osEl.className = 'sysinfo-os';
    osEl.textContent = os;
    hero.appendChild(osEl);
  }
  if (browser) {
    var brEl = document.createElement('div');
    brEl.className = 'sysinfo-browser';
    brEl.textContent = browser;
    hero.appendChild(brEl);
  }
  body.appendChild(hero);

  var sep = document.createElement('div');
  sep.className = 'separator';
  body.appendChild(sep);

  var sysSection = makeSection('System', [
    ['CPU Cores', nav.hardwareConcurrency ? nav.hardwareConcurrency + ' logical processors' : null],
    ['Language', nav.language || null]
  ]);
  if (sysSection) body.appendChild(sysSection);

  var dpr = window.devicePixelRatio || 1;
  var dispSection = makeSection('Display', [
    ['Resolution', scr.width + ' \u00d7 ' + scr.height],
    ['Pixel Ratio', dpr + 'x' + (dpr > 1 ? ' (HiDPI)' : '')]
  ]);
  if (dispSection) body.appendChild(dispSection);

  var netContainer = document.createElement('div');
  netContainer.id = 'sysNetSection';
  body.appendChild(netContainer);
  var batContainer = document.createElement('div');
  batContainer.id = 'sysBatSection';
  body.appendChild(batContainer);

  var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn) {
    var netRows = [];
    if (conn.effectiveType) netRows.push(['Type', conn.effectiveType.toUpperCase()]);
    else if (conn.type) netRows.push(['Type', conn.type]);
    if (conn.downlink) netRows.push(['Downlink', conn.downlink + ' Mbps']);
    var netSection = makeSection('Network', netRows);
    if (netSection) netContainer.appendChild(netSection);
  }

  if (nav.getBattery) {
    nav.getBattery().then(function (bat) {
      var batSection = makeSection('Battery', [
        ['Level', Math.round(bat.level * 100) + '%'],
        ['Charging', bat.charging ? 'Yes' : 'No']
      ]);
      if (batSection) batContainer.appendChild(batSection);
    });
  }
}

/* ── Fish of the Day ── */
let fishPopulated = false;
function populateFish() {
  if (fishPopulated) return;
  fishPopulated = true;

  var f = FISH_TODAY;
  var fishPhoto = document.getElementById('fishPhoto');
  var photoPlaceholder = document.getElementById('photoPlaceholder');
  var fishName = document.getElementById('fishName');
  var fishScientific = document.getElementById('fishScientific');
  var fishDetails = document.getElementById('fishDetails');
  var fishDateText = document.getElementById('fishDateText');

  /* Reset UI for day-change re-population (harmless on first run) */
  fishDetails.textContent = '';
  fishPhoto.style.display = 'none';
  fishPhoto.removeAttribute('src');
  photoPlaceholder.textContent = 'Loading image...';
  photoPlaceholder.style.display = '';
  fishName.onclick = null;
  fishName.classList.remove('linked');
  delete fishName.dataset.linked;

  var sciName = f[1] + " " + f[2];
  fishName.textContent = f[0];
  fishScientific.textContent = sciName;

  var now = new Date();
  fishDateText.textContent = now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  function addDetail(label, value) {
    if (!value && value !== 0) return;
    var dt = document.createElement("dt");
    dt.textContent = label;
    var dd = document.createElement("dd");
    dd.textContent = value;
    fishDetails.appendChild(dt);
    fishDetails.appendChild(dd);
  }

  addDetail("Family", f[3]);
  addDetail("Order", f[4]);
  if (f[5]) addDetail("Max Size", f[5] + " cm");
  addDetail("Habitat", f[6]);
  addDetail("Depth", f[7]);

  var wikiTitle = f[1] + "_" + f[2];

  function linkFishName(title) {
    if (fishName.dataset.linked) return;
    fishName.dataset.linked = '1';
    fishName.classList.add('linked');
    fishName.title = 'Open in WikiBrowser';
    fishName.onclick = function () {
      openBrowser();
      browserNavigate('https://en.wikipedia.org/wiki/' + encodeURIComponent(title));
    };
  }

  // todayKey() and FISH_TODAY are defined in fish-data.js (loaded via <script defer>)
  // Cache keys include genus_species so array changes don't serve stale data
  var fishId = f[1] + "_" + f[2];
  var imgKey = "fotd-img-" + todayKey() + "-" + fishId;
  var wikiLinkKey = "fotd-wiki-" + todayKey() + "-" + fishId;

  var cachedWikiLink = localStorage.getItem(wikiLinkKey);
  if (cachedWikiLink) linkFishName(cachedWikiLink);

  /* fetchWikiImage doubles as a wiki-existence check (it calls linkFishName
     on success), so we reuse it for all paths instead of a separate checkWikiPage. */
  function fetchWikiImage(title) {
    return fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + title)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (data) {
        localStorage.setItem(wikiLinkKey, title);
        linkFishName(title);
        var src = data.thumbnail && data.thumbnail.source;
        if (src) {
          src = src.replace(/\/\d+px-/, "/480px-");
          localStorage.setItem(imgKey, src);
          showFishImage(src);
        }
      });
  }

  if (f[8]) {
    showFishImage(f[8]);
    if (!cachedWikiLink) fetchWikiImage(wikiTitle)
      .catch(function () { return fetchWikiImage(f[0].replace(/ /g, "_")); })
      .catch(function () {});
  } else if (localStorage.getItem(imgKey) && /^https:\/\/upload\.wikimedia\.org\//.test(localStorage.getItem(imgKey))) {
    showFishImage(localStorage.getItem(imgKey));
    if (!cachedWikiLink) fetchWikiImage(wikiTitle)
      .catch(function () { return fetchWikiImage(f[0].replace(/ /g, "_")); })
      .catch(function () {});
  } else {
    fetchWikiImage(wikiTitle)
      .catch(function () { return fetchWikiImage(f[0].replace(/ /g, "_")); })
      .catch(function () { photoPlaceholder.textContent = "No photo available"; });
  }

  function showFishImage(src) {
    fishPhoto.alt = f[0] + " (" + sciName + ")";
    /* Route through wsrv.nl image proxy to bypass iOS ITP blocking
       of upload.wikimedia.org (Wikimedia sets SameSite=None cookies
       that cause WebKit to reject the entire resource load). */
    var proxied = src.indexOf("upload.wikimedia.org") !== -1
      ? "https://wsrv.nl/?url=" + encodeURIComponent(src)
      : src;
    fishPhoto.onload = function () {
      fishPhoto.style.display = "block";
      photoPlaceholder.style.display = "none";
    };
    fishPhoto.onerror = function () {
      photoPlaceholder.textContent = "Photo unavailable";
    };
    fishPhoto.src = proxied;
  }
}

/* ── Fish Finder ── */
function openFishFinder() {
  openWindow('fishfinder');
  populateFishFinder();
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatFinderDistance(km) {
  var mi = km * 0.621371;
  return km.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' km (' +
         mi.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' mi)';
}

function showLoadingMessage(container, text) {
  container.textContent = '';
  var msg = document.createElement('div');
  msg.className = 'loading-msg';
  msg.textContent = text;
  container.appendChild(msg);
}

function populateFishFinder() {
  var body = document.getElementById('fishFinderBody');
  var status = document.getElementById('fishFinderStatus');

  showLoadingMessage(body, 'Locating you...');
  status.textContent = '';

  getLocation(
    function (lat, lon) {
      var nearest = null, furthest = null;
      var minDist = Infinity, maxDist = -1;

      for (var i = 0; i < AQUARIUMS.length; i++) {
        var d = haversineDistance(lat, lon, AQUARIUMS[i][2], AQUARIUMS[i][3]);
        if (d < minDist) { minDist = d; nearest = AQUARIUMS[i]; }
        if (d > maxDist) { maxDist = d; furthest = AQUARIUMS[i]; }
      }

      function finderCard(aq, dist) {
        var card = document.createElement('div');
        card.className = 'sunken finder-card';
        var nameEl = document.createElement('div');
        nameEl.className = 'finder-name';
        if (aq[4]) {
          var link = document.createElement('a');
          link.href = aq[4];
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = aq[0];
          nameEl.appendChild(link);
        } else {
          nameEl.textContent = aq[0];
        }
        card.appendChild(nameEl);
        var locEl = document.createElement('div');
        locEl.className = 'finder-location';
        locEl.textContent = aq[1];
        card.appendChild(locEl);
        var distEl = document.createElement('div');
        distEl.className = 'finder-distance';
        distEl.textContent = formatFinderDistance(dist);
        card.appendChild(distEl);
        return card;
      }

      body.textContent = '';
      var wrap = document.createElement('div');
      wrap.className = 'finder-wrap';
      var nearLabel = document.createElement('div');
      nearLabel.className = 'finder-label';
      nearLabel.textContent = 'Nearest Aquarium';
      wrap.appendChild(nearLabel);
      wrap.appendChild(finderCard(nearest, minDist));
      var farLabel = document.createElement('div');
      farLabel.className = 'finder-label';
      farLabel.textContent = 'Furthest Aquarium';
      wrap.appendChild(farLabel);
      wrap.appendChild(finderCard(furthest, maxDist));
      body.appendChild(wrap);

      status.textContent = AQUARIUMS.length + ' aquariums in database';
    },
    function (msg) {
      showErrorPanel(body, msg, 'al-tri-ff');
    }
  );
}

/* ── WikiBrowser ── */
const BROWSER_HOME = 'https://en.wikipedia.org/wiki/Main_Page';
const browserFrame = document.getElementById('browserFrame');
const browserUrl = document.getElementById('browserUrl');
const browserTitle = document.getElementById('browserTitle');

function openBrowser() {
  var vp = document.getElementById('browserViewport');
  openWindow('browser');
  if (!vp.dataset.loaded) {
    vp.dataset.loaded = '1';
    browserFrame.src = BROWSER_HOME;
    browserUrl.value = BROWSER_HOME;
  }
  setTimeout(function () { browserUrl.focus(); browserUrl.select(); }, 100);
}

function closeBrowser() {
  var vp = document.getElementById('browserViewport');
  browserFrame.src = 'about:blank';
  vp.dataset.loaded = '';
  browserUrl.value = '';
  browserTitle.textContent = 'WikiBrowser';
  bbTaskbar.closeWindow('browser');
}

function browserNavigate(query) {
  query = query.trim();
  if (!query) return;
  var url;
  if (/^https:\/\/[a-z]{2,}\.(?:m\.)?wikipedia\.org\//.test(query)) {
    url = query.replace('://en.m.wikipedia.org/', '://en.wikipedia.org/');
  } else {
    url = 'https://en.wikipedia.org/wiki/Special:Search/' + encodeURIComponent(query);
  }
  browserFrame.src = url;
  browserUrl.value = url;
}

browserUrl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    browserNavigate(browserUrl.value);
  }
});

browserFrame.addEventListener('load', function () {
  try {
    var loc = browserFrame.contentWindow.location.href;
    if (loc && loc !== 'about:blank') {
      browserUrl.value = loc;
      var title = browserFrame.contentDocument && browserFrame.contentDocument.title;
      browserTitle.textContent = title ? 'WikiBrowser \u2014 ' + title : 'WikiBrowser';
    }
  } catch (e) {
    /* cross-origin — can't read iframe location */
  }
});

/* ── Notepad ── */

function notepadGetFiles() {
  try { return JSON.parse(localStorage.getItem('mpOS-notepad-files')) || {}; }
  catch (e) { return {}; }
}

function notepadPersist(files) {
  localStorage.setItem('mpOS-notepad-files', JSON.stringify(files));
}

function notepadMigrateLegacy() {
  if (localStorage.getItem('mpOS-notepad-files') !== null) return;
  var legacy = localStorage.getItem('mpOS-notepad');
  if (legacy !== null) {
    notepadPersist({ 'untitled.txt': legacy });
    localStorage.removeItem('mpOS-notepad');
    notepadCurrentFile = 'untitled.txt';
    notepadEditor.value = legacy;
  }
}

function notepadSetTitle() {
  var name = notepadCurrentFile || 'Untitled';
  notepadTitle.textContent = name + (notepadDirty ? '* ' : ' ') + '- Notepad';
}

function notepadMarkDirty() {
  if (!notepadDirty) { notepadDirty = true; notepadSetTitle(); }
}

function notepadMarkClean() {
  notepadDirty = false;
  notepadSetTitle();
}

function notepadGuardDirty() {
  if (!notepadDirty) return true;
  return confirm('You have unsaved changes. Discard them?');
}

function notepadDismissDialog() {
  var d = document.querySelector('#notepad .notepad-dialog');
  if (d) d.remove();
}

function openNotepad() {
  openWindow('notepad');
  if (!notepadEditor.dataset.loaded) {
    notepadEditor.dataset.loaded = '1';
    notepadMigrateLegacy();
    if (notepadCurrentFile) {
      notepadEditor.value = notepadGetFiles()[notepadCurrentFile] || '';
    }
    notepadSetTitle();
    updateNotepadStatus();
  }
  setTimeout(function () { notepadEditor.focus(); }, 100);
}

function notepadNew() {
  if (!notepadGuardDirty()) return;
  notepadDismissDialog();
  notepadEditor.value = '';
  notepadCurrentFile = null;
  notepadMarkClean();
  updateNotepadStatus();
  notepadEditor.focus();
}

function notepadSave() {
  if (notepadCurrentFile) {
    var files = notepadGetFiles();
    files[notepadCurrentFile] = notepadEditor.value;
    notepadPersist(files);
    notepadMarkClean();
    notepadStatus.textContent = 'Saved';
    setTimeout(updateNotepadStatus, 1500);
  } else {
    notepadShowSaveAs();
  }
}

function notepadSaveAs(name) {
  name = name.trim();
  if (!name) return;
  if (name === '__proto__' || name === 'constructor' || name === 'prototype') return;
  if (name.indexOf('.') === -1) name += '.txt';
  var files = notepadGetFiles();
  if (files.hasOwnProperty(name) && name !== notepadCurrentFile) {
    if (!confirm('"' + name + '" already exists. Overwrite?')) return;
  }
  files[name] = notepadEditor.value;
  notepadPersist(files);
  notepadCurrentFile = name;
  notepadDismissDialog();
  notepadMarkClean();
  notepadStatus.textContent = 'Saved';
  setTimeout(updateNotepadStatus, 1500);
  notepadEditor.focus();
}

function notepadShowSaveAs() {
  notepadDismissDialog();
  var d = document.createElement('div');
  d.className = 'notepad-dialog';

  var label = document.createElement('label');
  label.textContent = 'File name:';
  d.appendChild(label);

  var inp = document.createElement('input');
  inp.type = 'text';
  inp.id = 'notepadSaveAsInput';
  inp.value = notepadCurrentFile || '';
  d.appendChild(inp);

  var spacer = document.createElement('div');
  spacer.className = 'spacer';
  d.appendChild(spacer);

  var btnRow = document.createElement('div');
  btnRow.className = 'button-row';
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', function () { notepadSaveAs(inp.value); });
  btnRow.appendChild(saveBtn);
  btnRow.appendChild(document.createTextNode('\u00a0'));
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', notepadDismissDialog);
  btnRow.appendChild(cancelBtn);
  d.appendChild(btnRow);

  document.querySelector('#notepad .window-body').appendChild(d);
  inp.focus();
  inp.select();
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') notepadSaveAs(inp.value);
    else if (e.key === 'Escape') notepadDismissDialog();
  });
}

function notepadLoad() {
  if (!notepadGuardDirty()) return;
  notepadShowOpen();
}

function notepadShowOpen() {
  notepadDismissDialog();
  var files = notepadGetFiles();
  var names = Object.keys(files).sort();

  var d = document.createElement('div');
  d.className = 'notepad-dialog';

  var label = document.createElement('label');
  label.textContent = 'Open a file:';
  d.appendChild(label);

  var fileList = document.createElement('div');
  fileList.className = 'notepad-file-list';
  if (names.length === 0) {
    var emptyMsg = document.createElement('div');
    emptyMsg.className = 'notepad-empty';
    emptyMsg.textContent = 'No saved files.';
    fileList.appendChild(emptyMsg);
  } else {
    names.forEach(function (n) {
      var row = document.createElement('div');
      row.className = 'notepad-file-item';
      var nameSpan = document.createElement('span');
      nameSpan.textContent = n;
      nameSpan.addEventListener('click', function () { notepadOpenFile(n); });
      row.appendChild(nameSpan);
      var delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = 'Del';
      delBtn.addEventListener('click', function (e) { e.stopPropagation(); notepadDeleteFile(n); });
      row.appendChild(delBtn);
      fileList.appendChild(row);
    });
  }
  d.appendChild(fileList);

  var btnRow = document.createElement('div');
  btnRow.className = 'button-row';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', notepadDismissDialog);
  btnRow.appendChild(cancelBtn);
  d.appendChild(btnRow);

  document.querySelector('#notepad .window-body').appendChild(d);
}

function notepadOpenFile(name) {
  var files = notepadGetFiles();
  if (!files.hasOwnProperty(name)) return;
  notepadEditor.value = files[name];
  notepadCurrentFile = name;
  notepadDismissDialog();
  notepadMarkClean();
  updateNotepadStatus();
  notepadEditor.focus();
}

function notepadDeleteFile(name) {
  if (!confirm('Delete "' + name + '"?')) return;
  var files = notepadGetFiles();
  delete files[name];
  notepadPersist(files);
  if (notepadCurrentFile === name) {
    notepadCurrentFile = null;
    notepadEditor.value = '';
    notepadMarkClean();
    updateNotepadStatus();
  }
  notepadShowOpen();
}

function closeNotepad() {
  if (!notepadGuardDirty()) return;
  notepadDismissDialog();
  bbTaskbar.closeWindow('notepad');
}

function updateNotepadStatus() {
  var len = notepadEditor.value.length;
  notepadStatus.textContent = len + ' character' + (len !== 1 ? 's' : '');
}

notepadEditor.addEventListener('input', function () {
  notepadMarkDirty();
  updateNotepadStatus();
});

/* ── Calculator ── */
let calcCurrent = '0';
let calcPrev = null;
let calcOperation = null;
let calcReset = false;

function openCalculator() {
  openWindow('calculator');
  var calcWin = document.getElementById('calculator');
  calcWin.focus();
}

document.getElementById('calculator').addEventListener('keydown', function (e) {
  var key = e.key;
  if (key >= '0' && key <= '9') { calcDigit(key); e.preventDefault(); }
  else if (key === '.') { calcDecimal(); e.preventDefault(); }
  else if (key === '+' || key === '-' || key === '*' || key === '/') { calcOp(key); e.preventDefault(); }
  else if (key === 'Enter' || key === '=') { calcEquals(); e.preventDefault(); }
  else if (key === 'Escape') { calcClear(); e.preventDefault(); }
  else if (key === 'Backspace') { calcBackspace(); e.preventDefault(); }
});

function calcUpdateDisplay() {
  calcDisplay.textContent = calcCurrent;
}

function calcDigit(d) {
  if (calcReset) { calcCurrent = '0'; calcReset = false; }
  if (calcCurrent === '0') calcCurrent = d;
  else calcCurrent += d;
  if (calcCurrent.length > 15) calcCurrent = calcCurrent.slice(0, 15);
  calcUpdateDisplay();
}

function calcDecimal() {
  if (calcReset) { calcCurrent = '0'; calcReset = false; }
  if (calcCurrent.indexOf('.') === -1) calcCurrent += '.';
  calcUpdateDisplay();
}

function calcOp(op) {
  if (calcPrev !== null && calcOperation && !calcReset) calcEquals();
  calcPrev = parseFloat(calcCurrent);
  calcOperation = op;
  calcReset = true;
}

function calcEquals() {
  if (calcPrev === null || !calcOperation) {
    if (calcCurrent === '58008') { calcCurrent = '(.Y.)'; calcReset = true; calcUpdateDisplay(); return; }
    return;
  }
  var curr = parseFloat(calcCurrent);
  var result;
  switch (calcOperation) {
    case '+': result = calcPrev + curr; break;
    case '-': result = calcPrev - curr; break;
    case '*': result = calcPrev * curr; break;
    case '/': result = curr === 0 ? 'Error' : calcPrev / curr; break;
  }
  calcCurrent = typeof result === 'string' ? result : String(result);
  if (calcCurrent !== 'Error' && calcCurrent.length > 15) calcCurrent = parseFloat(calcCurrent).toPrecision(10);
  calcPrev = null;
  calcOperation = null;
  calcReset = true;
  calcUpdateDisplay();
}

function calcClear() {
  calcCurrent = '0'; calcPrev = null; calcOperation = null; calcReset = false;
  calcUpdateDisplay();
}

function calcClearEntry() {
  calcCurrent = '0'; calcReset = false;
  calcUpdateDisplay();
}

function calcBackspace() {
  if (calcReset) return;
  calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
  calcUpdateDisplay();
}

/* ── Calendar ── */
let calYear, calMonth, calTitleEl, calGridEl;

function openCalendar() {
  openWindow('calendar');
  if (!calTitleEl) {
    calTitleEl = document.getElementById('calTitle');
    calGridEl = document.getElementById('calGrid');
    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
  }
  calendarRender();
}

const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function calendarRender() {
  calTitleEl.textContent = CAL_MONTHS[calMonth] + ' ' + calYear;

  var frag = document.createDocumentFragment();
  var dayNames = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  for (var i = 0; i < 7; i++) {
    var hdr = document.createElement('div');
    hdr.className = 'cal-day-header';
    hdr.textContent = dayNames[i];
    frag.appendChild(hdr);
  }

  var firstOfMonth = new Date(calYear, calMonth, 1);
  var dow = firstOfMonth.getDay();
  var startOffset = (dow + 6) % 7;
  var startDate = new Date(calYear, calMonth, 1 - startOffset);

  var today = new Date();
  var todayStr = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();

  for (var r = 0; r < 6; r++) {
    for (var c = 0; c < 7; c++) {
      var d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + r * 7 + c);
      var cell = document.createElement('div');
      cell.className = 'cal-day';
      if (d.getMonth() !== calMonth) cell.className += ' other-month';
      if (d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() === todayStr) cell.className += ' today';
      cell.textContent = d.getDate();
      frag.appendChild(cell);
    }
  }

  calGridEl.textContent = '';
  calGridEl.appendChild(frag);
}

function calendarPrev() {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  calendarRender();
}

function calendarNext() {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  calendarRender();
}

function calendarToday() {
  var now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  calendarRender();
}

/* ── Time Zone ── */
const TZ_CITIES = [
  { city: 'London',      zone: 'Europe/London' },
  { city: 'New York',    zone: 'America/New_York' },
  { city: 'Los Angeles', zone: 'America/Los_Angeles' },
  { city: 'Tokyo',       zone: 'Asia/Tokyo' },
  { city: 'Sydney',      zone: 'Australia/Sydney' },
  { city: 'Dubai',       zone: 'Asia/Dubai' },
  { city: 'Paris',       zone: 'Europe/Paris' },
  { city: 'Singapore',   zone: 'Asia/Singapore' }
];

let tzGridEl = null;
let tzAnalog = true;
let tzTimer = null;
let tzBuilt = false;
const tzRefs = { h: [], m: [], s: [], d: [], o: [] };

function openTimeZone() {
  openWindow('timezone');
  if (!tzGridEl) tzGridEl = document.getElementById('tzGrid');
  if (!tzBuilt) { tzBuildGrid(); tzBuilt = true; }
  if (!tzTimer) tzTimer = setInterval(tzTick, 1000);
  tzTick();
}

function closeTimeZone() {
  if (tzTimer) { clearInterval(tzTimer); tzTimer = null; }
  bbTaskbar.closeWindow('timezone');
}

function tzBuildGrid() {
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var frag = document.createDocumentFragment();

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  for (var i = 0; i < TZ_CITIES.length; i++) {
    var c = TZ_CITIES[i];

    var tile = document.createElement('div');
    tile.className = 'tz-tile';

    var face = document.createElement('div');
    face.className = 'tz-clock-face';

    var svg = svgEl('svg', { viewBox: '0 0 64 64' });
    svg.appendChild(svgEl('circle', { cx: '32', cy: '32', r: '31', fill: '#fff' }));

    // Tick marks
    for (var h = 0; h < 12; h++) {
      var rad = h * 30 * Math.PI / 180;
      var isQuarter = h % 3 === 0;
      var inner = isQuarter ? 24 : 26;
      svg.appendChild(svgEl('line', {
        x1: String(32 + inner * Math.sin(rad)),
        y1: String(32 - inner * Math.cos(rad)),
        x2: String(32 + 29 * Math.sin(rad)),
        y2: String(32 - 29 * Math.cos(rad)),
        stroke: 'var(--dk-shadow)', 'stroke-width': isQuarter ? '1.5' : '0.7'
      }));
    }

    // Hour hand
    var hHand = svgEl('line', { id: 'tzH' + i, x1: '32', y1: '32', x2: '32', y2: '16', stroke: 'var(--dk-shadow)', 'stroke-width': '2', 'stroke-linecap': 'round' });
    svg.appendChild(hHand);
    // Minute hand
    var mHand = svgEl('line', { id: 'tzM' + i, x1: '32', y1: '32', x2: '32', y2: '10', stroke: 'var(--dk-shadow)', 'stroke-width': '1.2', 'stroke-linecap': 'round' });
    svg.appendChild(mHand);
    // Second hand
    var sHand = svgEl('line', { id: 'tzS' + i, x1: '32', y1: '38', x2: '32', y2: '8', stroke: 'var(--error)', 'stroke-width': '0.7', 'stroke-linecap': 'round' });
    svg.appendChild(sHand);
    // Center dot
    svg.appendChild(svgEl('circle', { cx: '32', cy: '32', r: '1.5', fill: 'var(--dk-shadow)' }));

    face.appendChild(svg);
    tile.appendChild(face);

    var digital = document.createElement('span');
    digital.className = 'tz-digital';
    digital.id = 'tzD' + i;
    tile.appendChild(digital);

    var cityEl = document.createElement('div');
    cityEl.className = 'tz-city';
    cityEl.textContent = c.city;
    tile.appendChild(cityEl);

    var offsetEl = document.createElement('div');
    offsetEl.className = 'tz-offset';
    offsetEl.id = 'tzO' + i;
    tile.appendChild(offsetEl);

    // Cache element refs for tzTick() hot path
    tzRefs.h[i] = hHand;
    tzRefs.m[i] = mHand;
    tzRefs.s[i] = sHand;
    tzRefs.d[i] = digital;
    tzRefs.o[i] = offsetEl;

    frag.appendChild(tile);
  }

  tzGridEl.textContent = '';
  tzGridEl.appendChild(frag);
}

const tzUtcOpts = { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false };
const tzCityOpts = TZ_CITIES.map(function (c) {
  return { timeZone: c.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
});
function tzTick() {
  var now = new Date();
  // Compute UTC time once outside the loop
  var utcStr = now.toLocaleString('en-GB', tzUtcOpts);
  var utcParts = utcStr.split(':');
  var utcH = parseInt(utcParts[0], 10);
  var utcM = parseInt(utcParts[1], 10);
  var utcTotal = utcH * 60 + utcM;

  for (var i = 0; i < TZ_CITIES.length; i++) {
    var parts = now.toLocaleString('en-GB', tzCityOpts[i]).split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var s = parseInt(parts[2], 10);

    // Analog hands
    tzRefs.h[i].style.transform = 'rotate(' + ((h % 12) * 30 + m * 0.5) + 'deg)';
    tzRefs.m[i].style.transform = 'rotate(' + (m * 6 + s * 0.1) + 'deg)';
    tzRefs.s[i].style.transform = 'rotate(' + (s * 6) + 'deg)';

    // Digital
    tzRefs.d[i].textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

    // Offset
    var diff = (h * 60 + m) - utcTotal;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    var sign = diff >= 0 ? '+' : '-';
    var absDiff = Math.abs(diff);
    var offH = Math.floor(absDiff / 60);
    var offM = absDiff % 60;
    tzRefs.o[i].textContent = 'UTC' + sign + offH + (offM ? ':' + String(offM).padStart(2, '0') : '');
  }
}

function tzToggleView() {
  tzAnalog = !tzAnalog;
  tzGridEl.classList.toggle('tz-digital-mode', !tzAnalog);
  var btn = document.querySelector('.tz-toggle');
  btn.textContent = tzAnalog ? 'Digital' : 'Analog';
  tzTick();
}

/* ── Weather ── */
let weatherLoaded = false;

function openWeather() {
  openWindow('weather');
  fetchWeather();
}

function fetchWeather() {
  if (weatherLoaded) return;
  var body = document.getElementById('weatherBody');
  var status = document.getElementById('weatherStatus');
  showLoadingMessage(body, 'Locating you...');

  getLocation(
    function (lat, lon) {
      showLoadingMessage(body, 'Fetching weather data...');
      var flatLat = lat.toFixed(2);
      var flatLon = lon.toFixed(2);
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + flatLat + '&longitude=' + flatLon + '&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=auto&forecast_days=3')
        .then(function (r) { if (!r.ok) throw new Error('API error'); return r.json(); })
        .then(function (data) {
          weatherLoaded = true;
          renderWeather(body, data);
          status.textContent = 'Powered by Open-Meteo';
        })
        .catch(function () {
          showErrorPanel(body, 'Failed to fetch weather data. Please try again later.', 'al-tri-we');
        });
    },
    function (msg) {
      showErrorPanel(body, msg, 'al-tri-we');
    }
  );
}

const WEATHER_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
  61: 'Slight rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Light freezing rain', 67: 'Freezing rain',
  71: 'Slight snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Severe thunderstorm'
};
function weatherCodeToDesc(code) {
  return WEATHER_CODES[code] || 'Unknown';
}

function renderWeather(body, data) {
  var current = data.current_weather;
  var daily = data.daily;
  body.textContent = '';

  var curDiv = document.createElement('div');
  curDiv.className = 'weather-current';
  var tempEl = document.createElement('div');
  tempEl.className = 'weather-temp';
  tempEl.textContent = Math.round(current.temperature) + '\u00b0C';
  curDiv.appendChild(tempEl);
  var descEl = document.createElement('div');
  descEl.className = 'weather-desc';
  descEl.textContent = weatherCodeToDesc(current.weathercode);
  curDiv.appendChild(descEl);
  body.appendChild(curDiv);

  var sep = document.createElement('div');
  sep.className = 'separator';
  body.appendChild(sep);

  var forecast = document.createElement('div');
  forecast.className = 'weather-forecast';
  for (var i = 0; i < daily.time.length; i++) {
    var date = new Date(daily.time[i] + 'T00:00:00');
    var dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
    var dayDiv = document.createElement('div');
    dayDiv.className = 'weather-day';
    var nameEl = document.createElement('div');
    nameEl.className = 'weather-day-name';
    nameEl.textContent = dayName;
    dayDiv.appendChild(nameEl);
    var dayTempEl = document.createElement('div');
    dayTempEl.className = 'weather-day-temp';
    dayTempEl.textContent = Math.round(daily.temperature_2m_max[i]) + '\u00b0';
    dayDiv.appendChild(dayTempEl);
    var rangeEl = document.createElement('div');
    rangeEl.className = 'weather-day-range';
    rangeEl.textContent = Math.round(daily.temperature_2m_min[i]) + '\u00b0 / ' + Math.round(daily.temperature_2m_max[i]) + '\u00b0';
    dayDiv.appendChild(rangeEl);
    var dayDescEl = document.createElement('div');
    dayDescEl.className = 'weather-day-desc';
    dayDescEl.textContent = weatherCodeToDesc(daily.weathercode[i]);
    dayDiv.appendChild(dayDescEl);
    forecast.appendChild(dayDiv);
  }
  body.appendChild(forecast);
}

/* ── Disk Usage ── */
const DU_FILES = [
  { path: 'index.html', type: 'HTML' },
  { path: '404.html', type: 'HTML' },
  { path: 'target-game.html', type: 'HTML' },
  { path: 'chicken-fingers.html', type: 'HTML' },
  { path: 'error-pages/400.html', type: 'HTML' },
  { path: 'error-pages/403.html', type: 'HTML' },
  { path: 'error-pages/500.html', type: 'HTML' },
  { path: 'css/theme.css', type: 'CSS' },
  { path: 'css/page.css', type: 'CSS' },
  { path: 'js/main.js', type: 'JS' },
  { path: 'js/taskbar.js', type: 'JS' },
  { path: 'js/audio.js', type: 'JS' },
  { path: 'js/fish-data.js', type: 'JS' },
  { path: 'js/aquarium-data.js', type: 'JS' },
  { path: 'js/help-data.js', type: 'JS' }
];

const DU_COLORS = { HTML: '#4a8abe', CSS: '#5aaa80', JS: '#e8a010' };
const DU_LABELS = { HTML: 'HTML', CSS: 'CSS', JS: 'JavaScript' };

function openDiskUsage() {
  openWindow('diskusage');
  populateDiskUsage();
}

function populateDiskUsage() {
  var body = document.getElementById('diskUsageBody');
  var status = document.getElementById('diskUsageStatus');
  if (body.dataset.populated) return;
  body.dataset.populated = '1';

  showLoadingMessage(body, 'Scanning disk...');

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var fetches = DU_FILES.map(function (f) {
    return fetch(f.path)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { return { path: f.path, type: f.type, size: b.size }; })
      .catch(function () { return null; });
  });

  Promise.all(fetches).then(function (results) {
    var files = results.filter(function (r) { return r !== null; });
    var totals = { HTML: 0, CSS: 0, JS: 0 };
    var counts = { HTML: 0, CSS: 0, JS: 0 };
    var totalSize = 0;

    files.forEach(function (f) {
      totals[f.type] += f.size;
      counts[f.type]++;
      totalSize += f.size;
    });

    if (totalSize === 0) {
      showLoadingMessage(body, 'No files found.');
      return;
    }

    body.textContent = '';

    // Header
    var header = document.createElement('div');
    header.className = 'du-header';
    var titleEl = document.createElement('div');
    titleEl.className = 'du-header-title';
    titleEl.textContent = 'mpOS Virtual Disk';
    header.appendChild(titleEl);
    var subEl = document.createElement('div');
    subEl.className = 'du-header-sub';
    subEl.textContent = 'File system: HTMLFS';
    header.appendChild(subEl);
    body.appendChild(header);

    // Pie chart
    var pieWrap = document.createElement('div');
    pieWrap.className = 'du-pie-wrap';
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 120 120');
    svg.setAttribute('width', '120');
    svg.setAttribute('height', '120');

    var types = ['HTML', 'CSS', 'JS'];
    var cumulative = 0;

    types.forEach(function (type) {
      var pct = totals[type] / totalSize;
      if (pct === 0) return;
      var startAngle = cumulative * 2 * Math.PI;
      var endAngle = (cumulative + pct) * 2 * Math.PI;
      cumulative += pct;

      var x1 = 60 + 50 * Math.sin(startAngle);
      var y1 = 60 - 50 * Math.cos(startAngle);
      var x2 = 60 + 50 * Math.sin(endAngle);
      var y2 = 60 - 50 * Math.cos(endAngle);
      var largeArc = pct > 0.5 ? 1 : 0;

      var path = document.createElementNS(SVG_NS, 'path');
      if (pct >= 0.9999) {
        // Full circle
        path.setAttribute('d', 'M60,10 A50,50 0 1,1 59.99,10 Z');
      } else {
        path.setAttribute('d',
          'M60,60 L' + x1 + ',' + y1 +
          ' A50,50 0 ' + largeArc + ',1 ' + x2 + ',' + y2 + ' Z'
        );
      }
      path.setAttribute('fill', DU_COLORS[type]);
      svg.appendChild(path);
    });

    pieWrap.appendChild(svg);
    body.appendChild(pieWrap);

    // Legend
    var legend = document.createElement('div');
    legend.className = 'du-legend';

    types.forEach(function (type) {
      var pct = totals[type] / totalSize * 100;
      var row = document.createElement('div');
      row.className = 'du-legend-row';

      var chip = document.createElement('span');
      chip.className = 'du-chip';
      chip.style.background = DU_COLORS[type];
      row.appendChild(chip);

      var label = document.createElement('span');
      label.className = 'du-legend-label';
      label.textContent = DU_LABELS[type];
      row.appendChild(label);

      var sizeEl = document.createElement('span');
      sizeEl.className = 'du-legend-size';
      sizeEl.textContent = formatDuSize(totals[type]);
      row.appendChild(sizeEl);

      var pctEl = document.createElement('span');
      pctEl.className = 'du-legend-pct';
      pctEl.textContent = Math.round(pct) + '%';
      row.appendChild(pctEl);

      legend.appendChild(row);
    });

    body.appendChild(legend);

    // Capacity bar
    var bar = document.createElement('div');
    bar.className = 'du-bar';

    types.forEach(function (type) {
      var pct = totals[type] / totalSize * 100;
      if (pct === 0) return;
      var seg = document.createElement('div');
      seg.className = 'du-bar-seg';
      seg.style.width = pct + '%';
      seg.style.background = DU_COLORS[type];
      bar.appendChild(seg);
    });

    body.appendChild(bar);

    // Total line
    var totalEl = document.createElement('div');
    totalEl.className = 'du-total';
    totalEl.textContent = 'Total: ' + formatDuSize(totalSize) + ' (' + files.length + ' files)';
    body.appendChild(totalEl);

    status.textContent = files.length + ' files scanned';
  });
}

function formatDuSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

/* ── Visitor Map ── */
const VM_WORKER = 'https://visitor-map.matthew-pritchard079.workers.dev';
let vmPopulated = false;

function openVisitorMap() {
  openWindow('visitormap');
  if (!vmPopulated) {
    vmPopulated = true;
    fetchVisitorData();
  }
}

function fetchVisitorData() {
  var body = document.getElementById('visitorMapBody');
  var method = 'GET';
  if (!sessionStorage.getItem('vm-visited')) {
    method = 'POST';
    sessionStorage.setItem('vm-visited', '1');
  }
  fetch(VM_WORKER + '/visit', { method: method })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function (counts) {
      renderVisitorMap(body, counts);
    })
    .catch(function () {
      showErrorPanel(body, 'Could not load visitor data. The server may be temporarily unavailable.', 'vm-err');
      vmPopulated = false;
    });
}

function renderVisitorMap(body, counts) {
  body.textContent = '';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Compute max for color scale (log)
  var maxCount = 0;
  var totalVisitors = 0;
  var countryCount = 0;
  var entries = [];
  var code;
  for (code in counts) {
    if (counts.hasOwnProperty(code)) {
      var c = counts[code];
      totalVisitors += c;
      countryCount++;
      if (c > maxCount) maxCount = c;
      var name = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[code]) || code;
      entries.push({ code: code, name: name, count: c });
    }
  }
  entries.sort(function (a, b) { return b.count - a.count; });

  var logMax = Math.log(maxCount + 1);

  function countToColor(n) {
    if (n === 0) return '#e0e0e0';
    var t = Math.log(n + 1) / logMax;
    // hsl(210, 55-80%, 80% -> 30%)  blue gradient
    var sat = 55 + t * 25;
    var light = 80 - t * 50;
    return 'hsl(210, ' + sat.toFixed(0) + '%, ' + light.toFixed(0) + '%)';
  }

  // Build map SVG
  var mapWrap = document.createElement('div');
  mapWrap.className = 'vm-map-wrap';

  if (typeof WORLD_MAP_PATHS !== 'undefined' && WORLD_MAP_PATHS.countries) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', WORLD_MAP_PATHS.viewBox);
    svg.setAttribute('xmlns', SVG_NS);
    svg.style.background = '#f0f4f8';

    var countryKeys = Object.keys(WORLD_MAP_PATHS.countries);
    for (var i = 0; i < countryKeys.length; i++) {
      code = countryKeys[i];
      var pathData = WORLD_MAP_PATHS.countries[code];
      var path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('data-code', code);
      path.classList.add('vm-country');
      var cnt = counts[code] || 0;
      path.style.fill = countToColor(cnt);
      if (cnt > 0) {
        path.classList.add('vm-has-visitors');
      }
      svg.appendChild(path);
    }

    mapWrap.appendChild(svg);

    // Tooltip (desktop only, hover:hover)
    if (window.matchMedia('(hover: hover)').matches) {
      var tooltip = document.createElement('div');
      tooltip.className = 'vm-tooltip';
      mapWrap.appendChild(tooltip);

      svg.addEventListener('mousemove', function (e) {
        var target = e.target;
        if (!target.classList || !target.classList.contains('vm-country')) {
          tooltip.style.display = 'none';
          return;
        }
        var cc = target.getAttribute('data-code');
        var cName = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[cc]) || cc;
        var cCount = counts[cc] || 0;
        tooltip.textContent = cName + ': ' + cCount + ' visit' + (cCount !== 1 ? 's' : '');
        tooltip.style.display = 'block';
        var rect = mapWrap.getBoundingClientRect();
        var tx = e.clientX - rect.left + 12;
        var ty = e.clientY - rect.top - 24;
        if (tx + 150 > rect.width) tx = e.clientX - rect.left - 150;
        if (ty < 0) ty = e.clientY - rect.top + 12;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
      });

      svg.addEventListener('mouseleave', function () {
        tooltip.style.display = 'none';
      });
    }
  } else {
    var noMap = document.createElement('div');
    noMap.className = 'folder-empty';
    noMap.textContent = 'Map data unavailable.';
    mapWrap.appendChild(noMap);
  }

  body.appendChild(mapWrap);

  // Build country list
  var list = document.createElement('div');
  list.className = 'vm-list';

  var listHeader = document.createElement('div');
  listHeader.className = 'vm-list-header';
  listHeader.textContent = 'Visitors by Country';
  list.appendChild(listHeader);

  for (var j = 0; j < entries.length; j++) {
    var entry = entries[j];
    var row = document.createElement('div');
    row.className = 'vm-list-row';

    var chip = document.createElement('span');
    chip.className = 'vm-list-chip';
    chip.style.background = countToColor(entry.count);
    row.appendChild(chip);

    var nameSpan = document.createElement('span');
    nameSpan.className = 'vm-list-name';
    nameSpan.textContent = entry.name;
    row.appendChild(nameSpan);

    var countSpan = document.createElement('span');
    countSpan.className = 'vm-list-count';
    countSpan.textContent = String(entry.count);
    row.appendChild(countSpan);

    list.appendChild(row);
  }

  body.appendChild(list);

  // Status bar
  var status = document.getElementById('visitorMapStatus');
  if (status) {
    status.textContent = countryCount + ' countr' + (countryCount !== 1 ? 'ies' : 'y') + ', ' + totalVisitors + ' total visitor' + (totalVisitors !== 1 ? 's' : '');
  }
}

/* ── Help System ── */
let helpHistory = [];
let helpHistoryIndex = -1;
let helpCurrentTab = 'contents';
let helpNavVisible = true;
let helpBuilt = false;
let helpIndexData = null;

function openHelp() {
  openWindow('help');
  if (!helpBuilt) {
    helpBuilt = true;
    helpHistory = ['welcome'];
    helpHistoryIndex = 0;
    helpSwitchTab('contents');
    helpRenderTopic('welcome');
    helpUpdateButtons();
  }
}

function helpNavigateTo(topicId) {
  if (!HELP_TOPICS[topicId]) return;
  // Trim forward history
  helpHistory = helpHistory.slice(0, helpHistoryIndex + 1);
  helpHistory.push(topicId);
  helpHistoryIndex = helpHistory.length - 1;
  helpRenderTopic(topicId);
  helpUpdateButtons();
  helpUpdateTreeActive(topicId);
}

function helpBack() {
  if (helpHistoryIndex <= 0) return;
  helpHistoryIndex--;
  var topicId = helpHistory[helpHistoryIndex];
  helpRenderTopic(topicId);
  helpUpdateButtons();
  helpUpdateTreeActive(topicId);
}

function helpForward() {
  if (helpHistoryIndex >= helpHistory.length - 1) return;
  helpHistoryIndex++;
  var topicId = helpHistory[helpHistoryIndex];
  helpRenderTopic(topicId);
  helpUpdateButtons();
  helpUpdateTreeActive(topicId);
}

function helpHome() {
  helpNavigateTo('welcome');
}

function helpToggleNav() {
  var nav = document.getElementById('helpNav');
  var btn = document.getElementById('helpToggleBtn');
  helpNavVisible = !helpNavVisible;
  nav.classList.toggle('hidden', !helpNavVisible);
  btn.textContent = helpNavVisible ? 'Hide' : 'Show';
}

function helpUpdateButtons() {
  document.getElementById('helpBackBtn').disabled = (helpHistoryIndex <= 0);
  document.getElementById('helpFwdBtn').disabled = (helpHistoryIndex >= helpHistory.length - 1);
}

function helpSwitchTab(tab) {
  helpCurrentTab = tab;
  var tabs = { contents: 'helpTabContents', index: 'helpTabIndex', search: 'helpTabSearch' };
  for (var key in tabs) {
    document.getElementById(tabs[key]).classList.toggle('active', key === tab);
  }
  var body = document.getElementById('helpTabBody');
  body.textContent = '';
  if (tab === 'contents') helpBuildTree(body);
  else if (tab === 'index') helpBuildIndex(body);
  else if (tab === 'search') helpBuildSearch(body);
}

function helpBuildTree(body) {
  var frag = document.createDocumentFragment();
  for (var i = 0; i < HELP_TREE.length; i++) {
    var folder = HELP_TREE[i];
    var folderEl = document.createElement('div');

    var folderRow = document.createElement('div');
    folderRow.className = 'help-tree-folder';
    var icon = document.createElement('span');
    icon.className = 'help-tree-icon';
    icon.textContent = '\uD83D\uDCD6';
    folderRow.appendChild(icon);
    var label = document.createElement('span');
    label.textContent = folder.title;
    folderRow.appendChild(label);
    folderEl.appendChild(folderRow);

    var childrenEl = document.createElement('div');
    childrenEl.className = 'help-tree-children open';

    for (var j = 0; j < folder.children.length; j++) {
      var topicId = folder.children[j];
      var topic = HELP_TOPICS[topicId];
      if (!topic) continue;
      var topicEl = document.createElement('div');
      topicEl.className = 'help-tree-topic';
      topicEl.dataset.topicId = topicId;
      var tIcon = document.createElement('span');
      tIcon.className = 'help-tree-icon';
      tIcon.textContent = '\uD83D\uDCC4';
      topicEl.appendChild(tIcon);
      var tLabel = document.createElement('span');
      tLabel.textContent = topic.title;
      topicEl.appendChild(tLabel);
      topicEl.addEventListener('click', (function (id) {
        return function () { helpNavigateTo(id); };
      })(topicId));
      childrenEl.appendChild(topicEl);
    }

    folderEl.appendChild(childrenEl);

    folderRow.addEventListener('click', (function (ch) {
      return function () { ch.classList.toggle('open'); };
    })(childrenEl));

    frag.appendChild(folderEl);
  }
  body.appendChild(frag);
  // Highlight current topic
  if (helpHistory.length > 0) {
    helpUpdateTreeActive(helpHistory[helpHistoryIndex]);
  }
}

function helpBuildIndex(body) {
  // Build index data once
  if (!helpIndexData) {
    helpIndexData = [];
    var keys = Object.keys(HELP_TOPICS);
    for (var i = 0; i < keys.length; i++) {
      var topic = HELP_TOPICS[keys[i]];
      for (var j = 0; j < topic.keywords.length; j++) {
        helpIndexData.push({ keyword: topic.keywords[j], topicId: keys[i], title: topic.title });
      }
    }
    helpIndexData.sort(function (a, b) {
      return a.keyword.localeCompare(b.keyword);
    });
  }

  var header = document.createElement('div');
  header.className = 'help-index-header';
  header.textContent = 'Type a keyword:';
  body.appendChild(header);

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'help-index-input';
  input.spellcheck = false;
  input.autocomplete = 'off';
  body.appendChild(input);

  var list = document.createElement('div');
  list.className = 'flex-scroll';
  body.appendChild(list);

  function filterIndex() {
    var query = input.value.toLowerCase();
    list.textContent = '';
    var matches = helpIndexData.filter(function (item) {
      return item.keyword.toLowerCase().indexOf(query) === 0;
    });
    if (matches.length === 0) {
      var none = document.createElement('div');
      none.className = 'help-no-results';
      none.textContent = 'No matching keywords.';
      list.appendChild(none);
      return;
    }
    for (var i = 0; i < matches.length; i++) {
      var row = document.createElement('div');
      row.className = 'help-list-item';
      row.textContent = matches[i].keyword + ' \u2014 ' + matches[i].title;
      row.addEventListener('click', (function (id) {
        return function () { helpNavigateTo(id); };
      })(matches[i].topicId));
      list.appendChild(row);
    }
  }

  filterIndex();
  input.addEventListener('input', filterIndex);
  setTimeout(function () { input.focus(); }, 50);
}

function helpBuildSearch(body) {
  var header = document.createElement('div');
  header.className = 'help-search-header';
  header.textContent = 'Search for:';
  body.appendChild(header);

  var input = document.createElement('input');
  input.type = 'text';
  input.className = 'help-search-input';
  input.spellcheck = false;
  input.autocomplete = 'off';
  body.appendChild(input);

  var btn = document.createElement('button');
  btn.className = 'btn help-search-btn';
  btn.textContent = 'List Topics';
  body.appendChild(btn);

  var results = document.createElement('div');
  results.className = 'flex-scroll help-search-results';
  body.appendChild(results);

  function doSearch() {
    var query = input.value.trim().toLowerCase();
    results.textContent = '';
    if (!query) return;

    var matches = [];
    var keys = Object.keys(HELP_TOPICS);
    for (var i = 0; i < keys.length; i++) {
      var topic = HELP_TOPICS[keys[i]];
      var searchText = topic.title.toLowerCase();
      searchText += ' ' + topic.keywords.join(' ').toLowerCase();
      for (var b = 0; b < topic.body.length; b++) {
        var block = topic.body[b];
        if (block.p) searchText += ' ' + block.p.toLowerCase();
        if (block.h) searchText += ' ' + block.h.toLowerCase();
        if (block.ul) searchText += ' ' + block.ul.join(' ').toLowerCase();
      }
      if (searchText.indexOf(query) !== -1) {
        matches.push({ topicId: keys[i], title: topic.title });
      }
    }

    if (matches.length === 0) {
      var none = document.createElement('div');
      none.className = 'help-no-results';
      none.textContent = 'No topics found.';
      results.appendChild(none);
      return;
    }

    for (var m = 0; m < matches.length; m++) {
      var row = document.createElement('div');
      row.className = 'help-list-item';
      row.textContent = matches[m].title;
      row.addEventListener('click', (function (id) {
        return function () { helpNavigateTo(id); };
      })(matches[m].topicId));
      results.appendChild(row);
    }
  }

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doSearch();
  });
  setTimeout(function () { input.focus(); }, 50);
}

function helpRenderTopic(topicId) {
  var content = document.getElementById('helpContent');
  var topic = HELP_TOPICS[topicId];
  if (!topic) return;

  content.textContent = '';
  content.scrollTop = 0;

  // Update title bar
  document.getElementById('helpTitle').textContent = 'mpOS Help \u2014 ' + topic.title;

  var titleEl = document.createElement('div');
  titleEl.className = 'help-topic-title';
  titleEl.textContent = topic.title;
  content.appendChild(titleEl);

  for (var i = 0; i < topic.body.length; i++) {
    var block = topic.body[i];

    if (block.p) {
      var p = document.createElement('div');
      p.className = 'help-topic-p';
      p.textContent = block.p;
      content.appendChild(p);
    } else if (block.h) {
      var h = document.createElement('div');
      h.className = 'help-topic-heading';
      h.textContent = block.h;
      content.appendChild(h);
    } else if (block.ul) {
      var ul = document.createElement('ul');
      ul.className = 'help-topic-ul';
      for (var j = 0; j < block.ul.length; j++) {
        var li = document.createElement('li');
        li.textContent = block.ul[j];
        ul.appendChild(li);
      }
      content.appendChild(ul);
    } else if (block.sa) {
      var sa = document.createElement('div');
      sa.className = 'help-topic-sa';
      var saLabel = document.createElement('div');
      saLabel.className = 'help-topic-sa-label';
      saLabel.textContent = 'See also:';
      sa.appendChild(saLabel);
      for (var k = 0; k < block.sa.length; k++) {
        var linked = HELP_TOPICS[block.sa[k]];
        if (!linked) continue;
        if (k > 0) {
          sa.appendChild(document.createTextNode(', '));
        }
        var link = document.createElement('span');
        link.className = 'help-topic-link';
        link.textContent = linked.title;
        link.addEventListener('click', (function (id) {
          return function () { helpNavigateTo(id); };
        })(block.sa[k]));
        sa.appendChild(link);
      }
      content.appendChild(sa);
    }
  }
}

function helpUpdateTreeActive(topicId) {
  var topics = document.querySelectorAll('.help-tree-topic');
  for (var i = 0; i < topics.length; i++) {
    topics[i].classList.toggle('active', topics[i].dataset.topicId === topicId);
  }
}

/* ── Paint ── */
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
let paintW = 640;
let paintH = 400;

function openPaint() {
  openWindow('paint');
  if (!paintBuilt) {
    paintBuilt = true;
    paintSetup();
  }
  document.getElementById('paint').focus();
}

function closePaint() {
  if (paintDirty && !confirm('You have unsaved changes. Discard them?')) return;
  paintDismissDialog();
  bbTaskbar.closeWindow('paint');
}

function paintSetup() {
  paintCanvas = document.getElementById('paintCanvas');
  paintPreview = document.getElementById('paintPreview');
  paintCtx = paintCanvas.getContext('2d');
  paintPrevCtx = paintPreview.getContext('2d');
  paintCoordsEl = document.getElementById('paintCoords');

  var dpr = window.devicePixelRatio || 1;
  paintCanvas.width = paintW * dpr;
  paintCanvas.height = paintH * dpr;
  paintCanvas.style.width = paintW + 'px';
  paintCanvas.style.height = paintH + 'px';
  paintCtx.scale(dpr, dpr);

  paintPreview.width = paintW * dpr;
  paintPreview.height = paintH * dpr;
  paintPreview.style.width = paintW + 'px';
  paintPreview.style.height = paintH + 'px';
  paintPrevCtx.scale(dpr, dpr);

  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintW, paintH);

  // Build color swatches
  var swatchContainer = document.getElementById('paintSwatches');
  for (var i = 0; i < PAINT_COLORS.length; i++) {
    var swatch = document.createElement('div');
    swatch.className = 'paint-swatch';
    swatch.style.background = PAINT_COLORS[i];
    swatch.dataset.color = PAINT_COLORS[i];
    swatch.addEventListener('click', function (e) {
      paintFg = e.target.dataset.color;
      document.getElementById('paintFg').style.background = paintFg;
    });
    swatch.addEventListener('contextmenu', function (e) {
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
  var colorPicker = document.getElementById('paintColorPicker');
  var pickingTarget = null;
  document.getElementById('paintFg').addEventListener('dblclick', function () {
    pickingTarget = 'fg';
    colorPicker.value = paintFg;
    colorPicker.click();
  });
  document.getElementById('paintBg').addEventListener('dblclick', function () {
    pickingTarget = 'bg';
    colorPicker.value = paintBgColor;
    colorPicker.click();
  });
  colorPicker.addEventListener('input', function () {
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
  document.getElementById('paint').addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); paintUndo(); }
      else if (e.key === 'y') { e.preventDefault(); paintRedo(); }
      else if (e.key === 's') { e.preventDefault(); paintSave(); }
      else if (e.key === 'n') { e.preventDefault(); paintNew(); }
    }
  });

  paintUpdateStatus();
}

function paintGetPos(e) {
  var rect = paintCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (paintW / rect.width),
    y: (e.clientY - rect.top) * (paintH / rect.height)
  };
}

function paintSaveState() {
  paintUndoStack.push(paintCanvas.toDataURL());
  if (paintUndoStack.length > 20) paintUndoStack.shift();
  paintRedoStack = [];
  paintUpdateUndoButtons();
}

function paintUpdateUndoButtons() {
  document.getElementById('paintUndoBtn').disabled = paintUndoStack.length <= 1;
  document.getElementById('paintRedoBtn').disabled = paintRedoStack.length === 0;
}

function paintRestoreState(dataUrl) {
  var img = new Image();
  img.onload = function () {
    var dpr = window.devicePixelRatio || 1;
    paintCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    paintCtx.drawImage(img, 0, 0);
    paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  img.src = dataUrl;
}

function paintUndo() {
  if (paintUndoStack.length <= 1) return;
  paintRedoStack.push(paintUndoStack.pop());
  paintRestoreState(paintUndoStack[paintUndoStack.length - 1]);
  paintUpdateUndoButtons();
  paintDirty = true;
  paintSetTitle();
}

function paintRedo() {
  if (paintRedoStack.length === 0) return;
  var state = paintRedoStack.pop();
  paintUndoStack.push(state);
  paintRestoreState(state);
  paintUpdateUndoButtons();
  paintDirty = true;
  paintSetTitle();
}

function paintOnDown(e) {
  paintCanvas.setPointerCapture(e.pointerId);
  paintDrawing = true;
  var pos = paintGetPos(e);

  if (paintTool === 'fill') {
    paintSaveState();
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
}

function paintOnMove(e) {
  var pos = paintGetPos(e);
  paintCoordsEl.textContent = Math.round(pos.x) + ', ' + Math.round(pos.y);

  if (!paintDrawing) return;

  if (paintTool === 'pencil' || paintTool === 'brush' || paintTool === 'eraser') {
    paintPoints.push(pos);
    paintDrawIncremental(paintCtx, paintPoints);
  } else if (paintTool === 'line' || paintTool === 'rect' || paintTool === 'ellipse') {
    var dpr = window.devicePixelRatio || 1;
    paintPrevCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintPrevCtx.clearRect(0, 0, paintPreview.width, paintPreview.height);
    paintPrevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintConfigStroke(paintPrevCtx);
    paintDrawShape(paintPrevCtx, paintStartPos, pos);
  }
}

function paintOnUp(e) {
  if (!paintDrawing) return;
  paintDrawing = false;

  if (paintTool === 'pencil' || paintTool === 'brush' || paintTool === 'eraser') {
    // Single-click dot: if only one point, draw a dot
    if (paintPoints.length === 1) {
      paintConfigStroke(paintCtx);
      var p = paintPoints[0];
      var r = paintTool === 'pencil' ? 0.5 : paintSize / 2;
      paintCtx.beginPath();
      paintCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      paintCtx.fillStyle = paintTool === 'eraser' ? paintBgColor : paintFg;
      paintCtx.fill();
    }
  } else if (paintTool === 'line' || paintTool === 'rect' || paintTool === 'ellipse') {
    var pos = paintGetPos(e);
    paintConfigStroke(paintCtx);
    paintDrawShape(paintCtx, paintStartPos, pos);
    // Clear preview
    var dpr = window.devicePixelRatio || 1;
    paintPrevCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintPrevCtx.clearRect(0, 0, paintPreview.width, paintPreview.height);
    paintPrevCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  paintDirty = true;
  paintSetTitle();
  paintSaveState();
}

function paintConfigStroke(ctx) {
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
}

function paintDrawIncremental(ctx, pts) {
  var n = pts.length;
  if (n < 2) return;
  ctx.beginPath();
  if (n === 2) {
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    // Draw only the last segment using quadratic midpoint interpolation
    var prev = pts[n - 3];
    var cur = pts[n - 2];
    var next = pts[n - 1];
    var mx0 = (prev.x + cur.x) / 2;
    var my0 = (prev.y + cur.y) / 2;
    var mx1 = (cur.x + next.x) / 2;
    var my1 = (cur.y + next.y) / 2;
    ctx.moveTo(mx0, my0);
    ctx.quadraticCurveTo(cur.x, cur.y, mx1, my1);
  }
  ctx.stroke();
}

function paintDrawShape(ctx, start, end) {
  ctx.beginPath();
  if (paintTool === 'line') {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (paintTool === 'rect') {
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else if (paintTool === 'ellipse') {
    var cx = (start.x + end.x) / 2;
    var cy = (start.y + end.y) / 2;
    var rx = Math.abs(end.x - start.x) / 2;
    var ry = Math.abs(end.y - start.y) / 2;
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintFloodFill(startX, startY, fillColor) {
  var dpr = window.devicePixelRatio || 1;
  var px = Math.round(startX * dpr);
  var py = Math.round(startY * dpr);
  var cw = paintCanvas.width;
  var ch = paintCanvas.height;

  if (px < 0 || py < 0 || px >= cw || py >= ch) return;

  var imageData = paintCtx.getImageData(0, 0, cw, ch);
  var data = imageData.data;

  // Parse fill color
  var tmp = document.createElement('canvas');
  tmp.width = 1; tmp.height = 1;
  var tmpCtx = tmp.getContext('2d');
  tmpCtx.fillStyle = fillColor;
  tmpCtx.fillRect(0, 0, 1, 1);
  var fc = tmpCtx.getImageData(0, 0, 1, 1).data;
  var fr = fc[0], fg = fc[1], fb = fc[2], fa = fc[3];

  // Get target color
  var idx = (py * cw + px) * 4;
  var tr = data[idx], tg = data[idx + 1], tb = data[idx + 2], ta = data[idx + 3];

  // If same, no-op
  if (tr === fr && tg === fg && tb === fb && ta === fa) return;

  var tolerance = 32;
  function match(i) {
    return Math.abs(data[i] - tr) <= tolerance &&
           Math.abs(data[i + 1] - tg) <= tolerance &&
           Math.abs(data[i + 2] - tb) <= tolerance &&
           Math.abs(data[i + 3] - ta) <= tolerance;
  }

  function setPixel(i) {
    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    data[i + 3] = fa;
  }

  var stack = [[px, py]];
  var visited = new Uint8Array(cw * ch);

  while (stack.length > 0) {
    var point = stack.pop();
    var x = point[0];
    var y = point[1];

    var i = (y * cw + x) * 4;
    if (visited[y * cw + x]) continue;
    if (!match(i)) continue;

    // Scan left
    var lx = x;
    while (lx > 0 && match((y * cw + lx - 1) * 4)) lx--;

    // Scan right
    var rx = x;
    while (rx < cw - 1 && match((y * cw + rx + 1) * 4)) rx++;

    // Fill the span
    for (var sx = lx; sx <= rx; sx++) {
      var si = (y * cw + sx) * 4;
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
}

function paintSetTool(tool) {
  paintTool = tool;
  var btns = document.querySelectorAll('.paint-tool');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].dataset.tool === tool);
  }
  paintUpdateStatus();
}

function paintSizeChange(val) {
  paintSize = parseInt(val, 10);
  document.getElementById('paintSizeVal').textContent = val;
  paintUpdateStatus();
}

function paintUpdateStatus() {
  var names = { pencil: 'Pencil', brush: 'Brush', eraser: 'Eraser', line: 'Line', rect: 'Rectangle', ellipse: 'Ellipse', fill: 'Fill' };
  var name = names[paintTool] || paintTool;
  var size = paintTool === 'pencil' ? '1' : (paintTool === 'fill' ? '' : paintSize);
  document.getElementById('paintStatus').textContent = name + (size ? ': ' + size + 'px' : '');
}

function paintSetTitle() {
  var name = paintCurrentFile || 'Untitled';
  document.getElementById('paintTitle').textContent = name + (paintDirty ? '* ' : ' ') + '- Paint';
}

function paintClear() {
  paintSaveState();
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintW, paintH);
  paintDirty = true;
  paintSetTitle();
  paintSaveState();
}

/* Paint file operations */
function paintGetFiles() {
  try { return JSON.parse(localStorage.getItem('mpOS-paint-files')) || {}; }
  catch (e) { return {}; }
}

function paintPersist(files) {
  try { localStorage.setItem('mpOS-paint-files', JSON.stringify(files)); }
  catch (e) { alert('Storage is full. Could not save.'); }
}

function paintNew() {
  if (paintDirty && !confirm('You have unsaved changes. Discard them?')) return;
  paintDismissDialog();
  paintCtx.fillStyle = '#ffffff';
  paintCtx.fillRect(0, 0, paintW, paintH);
  paintCurrentFile = null;
  paintDirty = false;
  paintUndoStack = [];
  paintRedoStack = [];
  paintSaveState();
  paintSetTitle();
}

function paintSave() {
  if (paintCurrentFile) {
    var files = paintGetFiles();
    files[paintCurrentFile] = paintCanvas.toDataURL('image/png');
    paintPersist(files);
    paintDirty = false;
    paintSetTitle();
    document.getElementById('paintStatus').textContent = 'Saved';
    setTimeout(paintUpdateStatus, 1500);
  } else {
    paintShowSaveAs();
  }
}

function paintSaveAs(name) {
  name = name.trim();
  if (!name) return;
  if (name === '__proto__' || name === 'constructor' || name === 'prototype') return;
  if (name.indexOf('.') === -1) name += '.png';
  var files = paintGetFiles();
  if (files.hasOwnProperty(name) && name !== paintCurrentFile) {
    if (!confirm('"' + name + '" already exists. Overwrite?')) return;
  }
  files[name] = paintCanvas.toDataURL('image/png');
  paintPersist(files);
  paintCurrentFile = name;
  paintDismissDialog();
  paintDirty = false;
  paintSetTitle();
  document.getElementById('paintStatus').textContent = 'Saved';
  setTimeout(paintUpdateStatus, 1500);
}

function paintShowSaveAs() {
  paintDismissDialog();
  var d = document.createElement('div');
  d.className = 'paint-dialog';

  var label = document.createElement('label');
  label.textContent = 'File name:';
  d.appendChild(label);

  var inp = document.createElement('input');
  inp.type = 'text';
  inp.value = paintCurrentFile || '';
  d.appendChild(inp);

  var spacer = document.createElement('div');
  spacer.className = 'spacer';
  d.appendChild(spacer);

  var btnRow = document.createElement('div');
  btnRow.className = 'button-row';
  var saveBtn = document.createElement('button');
  saveBtn.className = 'btn';
  saveBtn.textContent = 'Save';
  saveBtn.addEventListener('click', function () { paintSaveAs(inp.value); });
  btnRow.appendChild(saveBtn);
  btnRow.appendChild(document.createTextNode('\u00a0'));
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', paintDismissDialog);
  btnRow.appendChild(cancelBtn);
  d.appendChild(btnRow);

  document.querySelector('#paint .window-body').appendChild(d);
  inp.focus();
  inp.select();
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') paintSaveAs(inp.value);
    else if (e.key === 'Escape') paintDismissDialog();
  });
}

function paintLoad() {
  if (paintDirty && !confirm('You have unsaved changes. Discard them?')) return;
  paintShowOpen();
}

function paintShowOpen() {
  paintDismissDialog();
  var files = paintGetFiles();
  var names = Object.keys(files).sort();

  var d = document.createElement('div');
  d.className = 'paint-dialog';

  var label = document.createElement('label');
  label.textContent = 'Open a file:';
  d.appendChild(label);

  var fileList = document.createElement('div');
  fileList.className = 'paint-file-list';
  if (names.length === 0) {
    var emptyMsg = document.createElement('div');
    emptyMsg.className = 'paint-empty';
    emptyMsg.textContent = 'No saved files.';
    fileList.appendChild(emptyMsg);
  } else {
    names.forEach(function (n) {
      var row = document.createElement('div');
      row.className = 'paint-file-item';
      var thumb = document.createElement('img');
      thumb.className = 'paint-file-thumb';
      thumb.src = files[n];
      thumb.alt = '';
      row.appendChild(thumb);
      var nameSpan = document.createElement('span');
      nameSpan.textContent = n;
      nameSpan.addEventListener('click', function () { paintOpenFile(n); });
      row.appendChild(nameSpan);
      var delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = 'Del';
      delBtn.addEventListener('click', function (e) { e.stopPropagation(); paintDeleteFile(n); });
      row.appendChild(delBtn);
      fileList.appendChild(row);
    });
  }
  d.appendChild(fileList);

  var btnRow = document.createElement('div');
  btnRow.className = 'button-row';
  var cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', paintDismissDialog);
  btnRow.appendChild(cancelBtn);
  d.appendChild(btnRow);

  document.querySelector('#paint .window-body').appendChild(d);
}

function paintOpenFile(name) {
  var files = paintGetFiles();
  if (!files.hasOwnProperty(name)) return;
  var img = new Image();
  img.onload = function () {
    var dpr = window.devicePixelRatio || 1;
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
}

function paintDeleteFile(name) {
  if (!confirm('Delete "' + name + '"?')) return;
  var files = paintGetFiles();
  delete files[name];
  paintPersist(files);
  if (paintCurrentFile === name) {
    paintCurrentFile = null;
    paintDirty = false;
    paintSetTitle();
  }
  paintShowOpen();
}

function paintDismissDialog() {
  var d = document.querySelector('#paint .paint-dialog');
  if (d) d.remove();
}

/* ── Action lookup map (replaces new Function for FOLDER_ITEMS actions) ── */
const ACTION_MAP = {
  openBrowser: openBrowser,
  openFishOfDay: openFishOfDay,
  openFishFinder: openFishFinder,
  openOnTarget: openOnTarget,
  openAquarium: openAquarium,
  openChickenFingers: openChickenFingers,
  openNotepad: openNotepad,
  openCalculator: openCalculator,
  openCalendar: openCalendar,
  openTimeZone: openTimeZone,
  openWeather: openWeather,
  openDiskUsage: openDiskUsage,
  openHelp: openHelp,
  openPaint: openPaint,
  openBrickBreaker: openBrickBreaker,
  openVisitorMap: openVisitorMap
};

/* ── Run Terminal ── */
const termOutput = document.getElementById('termOutput');
const termInput = document.getElementById('termInput');

let termCwd = 'C:\\mpOS';
const FILESYSTEM = {
  'C:\\mpOS': {
    children: ['Desktop', 'Programs', 'Documents', 'Utilities']
  },
  'C:\\mpOS\\Desktop': {
    items: [
      { name: 'My Computer', run: function () { openMyComputer(); } },
      { name: 'Files', run: function () { openExplorer(); } },
      { name: 'WikiBrowser', run: function () { openBrowser(); } }
    ]
  },
  'C:\\mpOS\\Programs': { items: FOLDER_ITEMS.programs },
  'C:\\mpOS\\Documents': { items: FOLDER_ITEMS.documents },
  'C:\\mpOS\\Utilities': { items: FOLDER_ITEMS.utilities }
};

const COMMANDS = {
  'help':        { run: cmdHelp,        desc: 'List available commands' },
  'cd':          { run: cmdCd,          desc: 'Change directory' },
  'ls':          { run: cmdLs,          desc: 'List directory contents' },
  'ontarget':    { run: openOnTarget,    desc: 'Launch On Target' },
  'fishofday':   { run: openFishOfDay,   desc: 'Launch Fish of the Day' },
  'fishfinder':  { run: openFishFinder,  desc: 'Launch Fish Finder' },
  'aquarium':    { run: openAquarium,    desc: 'Launch Virtual Aquarium' },
  'browser':     { run: openBrowser,     desc: 'Launch WikiBrowser' },
  'mycomputer':  { run: function () { openMyComputer(); }, desc: 'Open My Computer' },
  'explorer':    { run: openExplorer,    desc: 'Open Files' },
  'programs':    { run: function () { openExplorerTo('programs'); },   desc: 'Open Programs folder' },
  'documents':   { run: function () { openExplorerTo('documents'); },  desc: 'Open Documents folder' },
  'utilities':   { run: function () { openExplorerTo('utilities'); },  desc: 'Open Utilities folder' },
  'notepad':     { run: openNotepad,     desc: 'Open Notepad' },
  'calculator':  { run: openCalculator,  desc: 'Open Calculator' },
  'calendar':    { run: openCalendar,    desc: 'Open Calendar' },
  'timezone':    { run: openTimeZone,    desc: 'Open Time Zone' },
  'weather':     { run: openWeather,     desc: 'Open Weather' },
  'diskusage':   { run: openDiskUsage,  desc: 'Open Disk Usage' },
  'paint':       { run: openPaint,     desc: 'Open Paint' },
  'brickbreaker': { run: openBrickBreaker, desc: 'Launch Brick Breaker' },
  'visitormap':  { run: openVisitorMap, desc: 'Open Visitor Map' },
  'hh':          { run: openHelp,       desc: 'Open mpOS Help' },
  'cls':         { run: cmdCls,          desc: 'Clear the screen' },
  'clear':       { run: cmdCls,          desc: 'Clear the screen' },
  'exit':        { run: function () { stopMatrix(); bbTaskbar.closeWindow('run'); }, desc: 'Close this window' },
  'ver':         { run: cmdVer,          desc: 'Show version' },
};

function termPrint(text) {
  termOutput.textContent += text + '\n';
  termOutput.scrollTop = termOutput.scrollHeight;
}

function cmdHelp() {
  termPrint('Available commands:\n');
  var names = Object.keys(COMMANDS).filter(function (k) { return k !== 'clear'; });
  names.forEach(function (name) {
    termPrint('  ' + name.toUpperCase().padEnd(14) + COMMANDS[name].desc);
  });
  termPrint('');
}

function cmdCls() { stopMatrix(); termOutput.textContent = ''; }

function cmdVer() { termPrint('mpOS [Version 1.5.0]\n(c) Matthew Pritchard. All rights reserved.\n'); }

function cmdCd(args) {
  if (!args) { termPrint(termCwd + '\n'); return; }
  var target = args.trim();
  var newPath;
  if (target === '\\' || target === '/') {
    newPath = 'C:\\mpOS';
  } else if (target === '..') {
    newPath = 'C:\\mpOS';
  } else if (target.match(/^[Cc]:\\/i)) {
    // Absolute path — normalise separators and case-insensitive lookup
    var normalized = target.replace(/\//g, '\\');
    var fsKeys = Object.keys(FILESYSTEM);
    var found = fsKeys.find(function (k) {
      return k.toLowerCase() === normalized.toLowerCase();
    });
    newPath = found || normalized;
  } else {
    // Relative — match against children of current dir
    var cur = FILESYSTEM[termCwd];
    if (cur && cur.children) {
      var match = cur.children.find(function (c) {
        return c.toLowerCase() === target.toLowerCase();
      });
      if (match) {
        newPath = termCwd + '\\' + match;
      }
    }
  }
  if (newPath && FILESYSTEM[newPath]) {
    termCwd = newPath;
    document.querySelector('#run .term-prompt').textContent = termCwd + '> ';
    termPrint('');
  } else {
    termPrint('The system cannot find the path specified.\n');
  }
}

function cmdLs() {
  var cur = FILESYSTEM[termCwd];
  if (!cur) { termPrint('Error reading directory.\n'); return; }
  termPrint('');
  termPrint(' Directory of ' + termCwd);
  termPrint('');
  if (cur.children) {
    cur.children.forEach(function (c) {
      termPrint('  <DIR>    ' + c);
    });
  } else if (cur.items && cur.items.length > 0) {
    cur.items.forEach(function (item) {
      termPrint('           ' + item.name);
    });
  } else {
    termPrint('  Directory is empty.');
  }
  termPrint('');
}

function openRun() {
  openWindow('run');
  termOutput.textContent = '';
  termCwd = 'C:\\mpOS';
  document.querySelector('#run .term-prompt').textContent = 'C:\\mpOS> ';
  cmdVer();
  termPrint('Type HELP for a list of available commands.\n');
  termInput.value = '';
  setTimeout(function () { termInput.focus(); }, 100);
}

let matrixInterval = null;
function cmdMatrix() {
  var term = document.querySelector('#run .term');
  var existing = term.querySelector('.matrix-canvas');
  if (existing) { stopMatrix(); return; }
  var canvas = document.createElement('canvas');
  canvas.className = 'matrix-canvas';
  canvas.width = term.offsetWidth;
  canvas.height = term.offsetHeight;
  term.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var fontSize = 14;
  var cols = Math.floor(canvas.width / fontSize);
  var drops = [];
  for (var i = 0; i < cols; i++) drops[i] = Math.random() * -20 | 0;
  matrixInterval = setInterval(function () {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = fontSize + 'px monospace';
    for (var i = 0; i < cols; i++) {
      var ch = Math.random() > 0.5 ? '1' : '0';
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }, 50);
  canvas.addEventListener('click', stopMatrix);
}

function stopMatrix() {
  if (matrixInterval) { clearInterval(matrixInterval); matrixInterval = null; }
  var c = document.querySelector('#run .matrix-canvas');
  if (c) c.remove();
}

termInput.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  var raw = termInput.value.trim();
  termInput.value = '';
  termPrint(termCwd + '> ' + raw);
  if (!raw) return;
  var parts = raw.match(/^(\S+)\s*(.*)?$/);
  var cmd = parts[1].toLowerCase();
  var args = parts[2] || '';
  if (cmd === 'matrix') {
    cmdMatrix();
  } else if (COMMANDS[cmd]) {
    COMMANDS[cmd].run(args);
  } else {
    // Try local item execution in current directory
    var cur = FILESYSTEM[termCwd];
    var localItem = null;
    if (cur && cur.items) {
      var input = raw.toLowerCase();
      localItem = cur.items.find(function (item) {
        return item.name.toLowerCase() === input;
      });
    }
    if (localItem) {
      if (localItem.run) {
        localItem.run();
      } else if (localItem.action && ACTION_MAP[localItem.action]) {
        ACTION_MAP[localItem.action]();
      }
    } else {
      termPrint("'" + raw + "' is not recognized as an internal or external command,\noperable program or batch file.\n");
    }
  }
});

// Play click sound on button interactions
document.addEventListener('click', function (e) {
  if (e.target.closest('.btn, .start-btn, .titlebar-btn, .project-list li')) {
    if (window.bbAudio) window.bbAudio.playSound('click');
  }
});

/* ── Mobile Launcher ── */
function buildLauncher() {
  var programs = [
    { name: 'WikiBrowser', action: openBrowser },
    { name: 'Fish of the Day', action: openFishOfDay },
    { name: 'Fish Finder', action: openFishFinder },
    { name: 'On Target', action: null, href: 'target-game.html' },
    { name: 'Virtual Aquarium', action: openAquarium },
    { name: 'Chicken Fingers', action: null, href: 'chicken-fingers.html' },
    { name: 'Paint', action: openPaint },
    { name: 'Brick Breaker', action: null, href: 'brick-breaker.html' }
  ];
  var utilities = [
    { name: 'Notepad', action: openNotepad },
    { name: 'Calculator', action: openCalculator },
    { name: 'Calendar', action: openCalendar },
    { name: 'Time Zone', action: openTimeZone },
    { name: 'Weather', action: openWeather },
    { name: 'Disk Usage', action: openDiskUsage },
    { name: 'Visitor Map', action: openVisitorMap }
  ];
  var system = [
    { name: 'My Computer', action: openMyComputer },
    { name: 'Files', action: openExplorer },
    { name: 'Help', action: openHelp }
  ];

  function populateGrid(gridId, items) {
    var grid = document.getElementById(gridId);
    if (!grid) return;
    items.forEach(function (item) {
      var tile = document.createElement('button');
      tile.className = 'launcher-tile';
      tile.type = 'button';
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'none');
      svg.innerHTML = getItemIcon(item.name);
      tile.appendChild(svg);
      var label = document.createElement('span');
      label.className = 'launcher-tile-label';
      label.textContent = item.name;
      tile.appendChild(label);
      if (item.href) {
        tile.addEventListener('click', function () { location.href = item.href; });
      } else if (item.action) {
        tile.addEventListener('click', function () { item.action(); });
      }
      grid.appendChild(tile);
    });
  }

  populateGrid('launcherPrograms', programs);
  populateGrid('launcherUtilities', utilities);
  populateGrid('launcherSystem', system);
}

const mobileQuery = window.matchMedia('(max-width: 767px)');
if (mobileQuery.matches) buildLauncher();
mobileQuery.addEventListener('change', function (e) {
  if (e.matches && !document.getElementById('launcherPrograms').children.length) {
    buildLauncher();
  }
});

/* ── Export public API to window (called from HTML onclick handlers) ── */
window.openWindow = openWindow;
window.closeStartMenu = closeStartMenu;
window.openExplorer = openExplorer;
window.openExplorerTo = openExplorerTo;
window.navigateExplorer = navigateExplorer;
window.setExplorerView = setExplorerView;
window.openMyComputer = openMyComputer;
window.openChickenFingers = openChickenFingers;
window.exitSite = exitSite;
window.openAquarium = openAquarium;
window.closeAquarium = closeAquarium;
window.openOnTarget = openOnTarget;
window.closeOnTarget = closeOnTarget;
window.openBrickBreaker = openBrickBreaker;
window.closeBrickBreaker = closeBrickBreaker;
window.openFishOfDay = openFishOfDay;
window.openFishFinder = openFishFinder;
window.openBrowser = openBrowser;
window.closeBrowser = closeBrowser;
window.browserNavigate = browserNavigate;
window.openNotepad = openNotepad;
window.notepadNew = notepadNew;
window.notepadSave = notepadSave;
window.notepadLoad = notepadLoad;
window.closeNotepad = closeNotepad;
window.notepadSaveAs = notepadSaveAs;
window.notepadOpenFile = notepadOpenFile;
window.notepadDeleteFile = notepadDeleteFile;
window.notepadDismissDialog = notepadDismissDialog;
window.openCalculator = openCalculator;
window.openCalendar = openCalendar;
window.calendarPrev = calendarPrev;
window.calendarNext = calendarNext;
window.calendarToday = calendarToday;
window.calcDigit = calcDigit;
window.calcDecimal = calcDecimal;
window.calcOp = calcOp;
window.calcEquals = calcEquals;
window.calcClear = calcClear;
window.calcClearEntry = calcClearEntry;
window.calcBackspace = calcBackspace;
window.openTimeZone = openTimeZone;
window.closeTimeZone = closeTimeZone;
window.tzToggleView = tzToggleView;
window.openWeather = openWeather;
window.openDiskUsage = openDiskUsage;
window.openHelp = openHelp;
window.helpBack = helpBack;
window.helpForward = helpForward;
window.helpHome = helpHome;
window.helpToggleNav = helpToggleNav;
window.helpSwitchTab = helpSwitchTab;
window.openRun = openRun;
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
window.openVisitorMap = openVisitorMap;

})();
