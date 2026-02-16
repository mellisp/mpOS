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
let notepadFindTerm = '';
let notepadReplaceTerm = '';
let notepadFindMatches = [];
let notepadFindIndex = -1;
let notepadFindCaseSensitive = false;
let notepadFindMode = '';

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
    { name: 'Help', desc: 'Browse the mpOS help documentation.', tag: 'HTML', action: 'openHelp' },
    { name: 'Search', desc: 'Search for files, programs, and commands.', tag: 'HTML', action: 'openSearch' }
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
    'Fish of the Day': '<defs><linearGradient id="ei-fd" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#b0f0d0"/><stop offset="30%" stop-color="#70c898"/><stop offset="70%" stop-color="#40a068"/><stop offset="100%" stop-color="#2a8858"/></linearGradient></defs><path d="M1 7 Q3 10 1 14 L4 11 Z" fill="url(#ei-fd)" stroke="#1a5c42" stroke-width="0.6"/><ellipse cx="10" cy="11" rx="8" ry="5" fill="url(#ei-fd)" stroke="#1a5c42" stroke-width="0.8"/><ellipse cx="9" cy="9.5" rx="5" ry="2" fill="white" opacity="0.3"/><circle cx="15" cy="10" r="1" fill="#1a5c42"/><circle cx="15.3" cy="9.7" r="0.3" fill="white"/>',
    'Fish Finder': '<defs><radialGradient id="ei-ff" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="30%" stop-color="#d8ecff"/><stop offset="60%" stop-color="#a8d0f0"/><stop offset="100%" stop-color="#78b0d8"/></radialGradient><linearGradient id="ei-ffh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4d0c8"/><stop offset="50%" stop-color="#a0a098"/><stop offset="100%" stop-color="#787870"/></linearGradient></defs><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="url(#ei-ffh)" stroke-width="3" stroke-linecap="round"/><circle cx="9" cy="9" r="6" fill="url(#ei-ff)" stroke="#1a4a6e" stroke-width="1.2"/><circle cx="9" cy="9" r="4.5" fill="none" stroke="#1a4a6e" stroke-width="0.4" opacity="0.3"/><ellipse cx="7" cy="7" rx="3.5" ry="2.5" fill="white" opacity="0.4"/>',
    'On Target': '<defs><radialGradient id="ei-ot" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ff8a8a"/><stop offset="40%" stop-color="#ef5350"/><stop offset="100%" stop-color="#b71c1c"/></radialGradient><radialGradient id="ei-otw" cx="0.4" cy="0.4" r="0.6"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8e0e0"/></radialGradient></defs><circle cx="10" cy="10" r="9" fill="url(#ei-ot)" stroke="#8b1a1a" stroke-width="0.8"/><circle cx="10" cy="10" r="7" fill="url(#ei-otw)" stroke="#c62828" stroke-width="0.3"/><circle cx="10" cy="10" r="5" fill="url(#ei-ot)" stroke="#8b1a1a" stroke-width="0.3"/><circle cx="10" cy="10" r="3" fill="url(#ei-otw)" stroke="#c62828" stroke-width="0.3"/><circle cx="10" cy="10" r="1.5" fill="url(#ei-ot)"/><ellipse cx="7.5" cy="6" rx="4" ry="2.5" fill="white" opacity="0.25"/>',
    'Virtual Aquarium': '<defs><linearGradient id="ei-va" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#d0e8ff"/><stop offset="30%" stop-color="#6aafe0"/><stop offset="70%" stop-color="#3a8ac0"/><stop offset="100%" stop-color="#1a4a6e"/></linearGradient><linearGradient id="ei-vw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a8aaa"/><stop offset="40%" stop-color="#0d5a76"/><stop offset="100%" stop-color="#082a3e"/></linearGradient></defs><rect x="1" y="3" width="18" height="12" rx="2" fill="url(#ei-va)" stroke="#1a4a6e" stroke-width="0.8"/><line x1="2" y1="4" x2="18" y2="4" stroke="white" stroke-width="0.5" opacity="0.4"/><rect x="3" y="5" width="14" height="8" rx="1" fill="url(#ei-vw)"/><ellipse cx="7" cy="9" rx="3" ry="1.5" fill="#ffa000" opacity="0.7"/><ellipse cx="12" cy="10" rx="2" ry="1" fill="#ffa000" opacity="0.6"/><path d="M4 7 Q6 6 8 7" stroke="#5ac8e0" stroke-width="0.4" opacity="0.4" fill="none"/><rect x="7" y="15.5" width="6" height="2" rx="0.5" fill="#a0a098" stroke="#8a8680" stroke-width="0.4"/>',
    'Chicken Fingers': '<defs><radialGradient id="ei-cf" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#fffde0"/><stop offset="30%" stop-color="#ffe68a"/><stop offset="70%" stop-color="#ffc840"/><stop offset="100%" stop-color="#e8a010"/></radialGradient></defs><ellipse cx="10" cy="12" rx="6" ry="5" fill="url(#ei-cf)" stroke="#c49000" stroke-width="0.7"/><ellipse cx="8.5" cy="11" rx="3.5" ry="2" fill="white" opacity="0.2"/><circle cx="10" cy="6" r="4" fill="url(#ei-cf)" stroke="#c49000" stroke-width="0.7"/><ellipse cx="9" cy="5" rx="2.5" ry="1.5" fill="white" opacity="0.25"/><circle cx="8.5" cy="5.5" r="0.8" fill="#5d4037"/><circle cx="8.8" cy="5.2" r="0.2" fill="white"/><circle cx="11.5" cy="5.5" r="0.8" fill="#5d4037"/><circle cx="11.8" cy="5.2" r="0.2" fill="white"/><path d="M9 7.5 L10 8.5 L11 7.5" stroke="#d45500" stroke-width="0.8" fill="#e67e22"/><path d="M5 4 Q7 2 9 3" stroke="#c49000" stroke-width="0.6" fill="none"/><path d="M11 3 Q13 2 15 4" stroke="#c49000" stroke-width="0.6" fill="none"/><path d="M7 19 L8 17 L9 19" stroke="#d45500" stroke-width="0.8" fill="none" stroke-linecap="round"/><path d="M11 19 L12 17 L13 19" stroke="#d45500" stroke-width="0.8" fill="none" stroke-linecap="round"/>',
    'Notepad': '<defs><linearGradient id="ei-np" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#f0f4ff"/><stop offset="70%" stop-color="#c8d8f0"/><stop offset="100%" stop-color="#a0b8d8"/></linearGradient></defs><path d="M3 1 L13 1 L17 5 L17 19 L3 19 Z" fill="url(#ei-np)" stroke="#4a6a8e" stroke-width="0.8"/><path d="M13 1 L13 5 L17 5" fill="#c8d8f0" stroke="#4a6a8e" stroke-width="0.5"/><rect x="3.5" y="1.5" width="9" height="2.5" fill="#4a8abe" rx="0.3"/><line x1="5.5" y1="6.5" x2="5.5" y2="18" stroke="#ef5350" stroke-width="0.4" opacity="0.6"/><line x1="6" y1="8" x2="14" y2="8" stroke="#8a9ab8" stroke-width="0.5"/><line x1="6" y1="11" x2="14" y2="11" stroke="#8a9ab8" stroke-width="0.5"/><line x1="6" y1="14" x2="11" y2="14" stroke="#8a9ab8" stroke-width="0.5"/>',
    'Calendar': '<defs><linearGradient id="ei-cl" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#d8d8d8"/></linearGradient><linearGradient id="ei-clb" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ef5350"/><stop offset="50%" stop-color="#d32f2f"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient></defs><rect x="3" y="3" width="14" height="16" rx="1" fill="url(#ei-cl)" stroke="#8a8680" stroke-width="0.8"/><rect x="3" y="3" width="14" height="3.5" rx="1" fill="url(#ei-clb)"/><line x1="4" y1="3.8" x2="10" y2="3.8" stroke="white" stroke-width="0.5" opacity="0.4"/><rect x="6.5" y="1" width="1" height="3.5" rx="0.5" fill="none" stroke="#a09890" stroke-width="0.8"/><rect x="12.5" y="1" width="1" height="3.5" rx="0.5" fill="none" stroke="#a09890" stroke-width="0.8"/><circle cx="7" cy="10" r="0.6" fill="#808080"/><circle cx="10" cy="10" r="0.6" fill="#808080"/><circle cx="13" cy="10" r="0.6" fill="#808080"/><circle cx="7" cy="13" r="0.6" fill="#808080"/><circle cx="10" cy="13" r="0.6" fill="#808080"/><circle cx="13" cy="13" r="0.6" fill="#808080"/><circle cx="7" cy="16" r="0.6" fill="#808080"/><circle cx="10" cy="16" r="0.6" fill="#808080"/>',
    'Calculator': '<defs><linearGradient id="ei-ca" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#f0ece4"/><stop offset="30%" stop-color="#d8d4cc"/><stop offset="70%" stop-color="#b8b4ac"/><stop offset="100%" stop-color="#98948c"/></linearGradient><linearGradient id="ei-cal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0f0d0"/><stop offset="100%" stop-color="#b0d098"/></linearGradient></defs><rect x="3" y="1" width="14" height="18" rx="1.5" fill="url(#ei-ca)" stroke="#787470" stroke-width="0.8"/><line x1="4" y1="2" x2="16" y2="2" stroke="white" stroke-width="0.5" opacity="0.5"/><rect x="5" y="3" width="10" height="3" rx="0.5" fill="url(#ei-cal)" stroke="#6a8a5a" stroke-width="0.5"/><rect x="10.5" y="3.3" width="4" height="0.8" rx="0.2" fill="#1a2a3a" opacity="0.6"/><rect x="5" y="8" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="9" y="8" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="13" y="8" width="2" height="2" rx="0.3" fill="#c8d8e8" stroke="#6a8a9e" stroke-width="0.4"/><rect x="5" y="12" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="9" y="12" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="13" y="12" width="2" height="2" rx="0.3" fill="#c8d8e8" stroke="#6a8a9e" stroke-width="0.4"/><rect x="5" y="16" width="6" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="13" y="16" width="2" height="2" rx="0.3" fill="#c8d8e8" stroke="#6a8a9e" stroke-width="0.4"/>',
    'Time Zone': '<defs><linearGradient id="ei-tz" x1="0.3" y1="0.1" x2="0.7" y2="0.9"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="50%" stop-color="#d8e8f8"/><stop offset="100%" stop-color="#a0c0e0"/></linearGradient><linearGradient id="ei-tzr" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#c8d8e8"/><stop offset="50%" stop-color="#8aa8c8"/><stop offset="100%" stop-color="#4a6a8e"/></linearGradient></defs><circle cx="10" cy="10" r="8.5" fill="url(#ei-tzr)" stroke="#2a4a6e" stroke-width="0.8"/><circle cx="10" cy="10" r="7" fill="url(#ei-tz)"/><line x1="10" y1="3.5" x2="10" y2="4.8" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><line x1="16.5" y1="10" x2="15.2" y2="10" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><line x1="10" y1="16.5" x2="10" y2="15.2" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><line x1="3.5" y1="10" x2="4.8" y2="10" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><ellipse cx="8.5" cy="7" rx="4" ry="3" fill="white" opacity="0.3"/><line x1="10" y1="10" x2="10" y2="5" stroke="#2a4a6e" stroke-width="1.2" stroke-linecap="round"/><line x1="10" y1="10" x2="14" y2="10" stroke="#2a4a6e" stroke-width="0.9" stroke-linecap="round"/><line x1="10" y1="10" x2="12.5" y2="5.5" stroke="#ef5350" stroke-width="0.5" stroke-linecap="round"/><circle cx="10" cy="10" r="0.8" fill="#2a4a6e"/><path d="M3.5 13 Q10 15.5 16.5 13" fill="none" stroke="#4a8abe" stroke-width="0.5" opacity="0.6"/><path d="M3.5 7 Q10 4.5 16.5 7" fill="none" stroke="#4a8abe" stroke-width="0.5" opacity="0.6"/>',
    'Weather': '<defs><radialGradient id="ei-we" cx="0.3" cy="0.3" r="0.7"><stop offset="0%" stop-color="#fffde0"/><stop offset="40%" stop-color="#ffe082"/><stop offset="100%" stop-color="#f9a825"/></radialGradient><radialGradient id="ei-wec" cx="0.4" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#e8e4dc"/><stop offset="100%" stop-color="#c8c4bc"/></radialGradient></defs><line x1="7" y1="1" x2="7" y2="3" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><line x1="2" y1="3" x2="3.5" y2="4.5" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><line x1="12" y1="3" x2="10.5" y2="4.5" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><line x1="1" y1="7" x2="3" y2="7" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><circle cx="7" cy="7" r="3.5" fill="url(#ei-we)" stroke="#c49000" stroke-width="0.7"/><ellipse cx="6" cy="5.5" rx="2" ry="1.5" fill="white" opacity="0.35"/><path d="M5 16 Q4.5 13 8 12.5 Q8 10 11 10 Q14 10 14.5 12.5 Q17.5 12.5 17.5 15 Q17.5 17.5 15 17.5 L7 17.5 Q4.5 17.5 5 16Z" fill="url(#ei-wec)" stroke="#8a8680" stroke-width="0.6"/><ellipse cx="10" cy="14" rx="4" ry="1.5" fill="white" opacity="0.3"/>',
    'Disk Usage': '<defs><linearGradient id="ei-du" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#e0dcd4"/><stop offset="30%" stop-color="#c8c4bc"/><stop offset="70%" stop-color="#a8a49c"/><stop offset="100%" stop-color="#8a8680"/></linearGradient><linearGradient id="ei-dup" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#1a1a1a"/></linearGradient></defs><rect x="2" y="6" width="16" height="10" rx="1.5" fill="url(#ei-du)" stroke="#6a6660" stroke-width="0.8"/><line x1="3" y1="7" x2="17" y2="7" stroke="white" stroke-width="0.5" opacity="0.4"/><rect x="4" y="8" width="8" height="5" rx="0.5" fill="url(#ei-dup)" stroke="#4a4a4a" stroke-width="0.5"/><circle cx="8" cy="10.5" r="1.8" fill="none" stroke="#555" stroke-width="0.4"/><circle cx="8" cy="10.5" r="3.2" fill="none" stroke="#555" stroke-width="0.3"/><line x1="8.3" y1="10.5" x2="11.5" y2="8.5" stroke="#888" stroke-width="0.5" stroke-linecap="round"/><circle cx="8" cy="10.5" r="0.5" fill="#888"/><circle cx="15" cy="13" r="0.8" fill="#5aaa80" stroke="#2a7a52" stroke-width="0.3"/><ellipse cx="7" cy="8.5" rx="3" ry="1.5" fill="white" opacity="0.15"/>',
    'Brick Breaker': '<defs><radialGradient id="ei-bb-red" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ff8a80"/><stop offset="50%" stop-color="#ef5350"/><stop offset="100%" stop-color="#c62828"/></radialGradient><radialGradient id="ei-bb-yellow" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ffd54f"/><stop offset="50%" stop-color="#ffc107"/><stop offset="100%" stop-color="#e8a000"/></radialGradient><radialGradient id="ei-bb-green" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#9ccc9c"/><stop offset="50%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></radialGradient><linearGradient id="ei-bb-paddle" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c8e0f8"/><stop offset="100%" stop-color="#4a8abe"/></linearGradient><radialGradient id="ei-bb-ball" cx="0.3" cy="0.3" r="0.7"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8e8e8"/></radialGradient></defs><rect x="2" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="7" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="12" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="2" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="7" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="12" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="2" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><rect x="7" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><rect x="12" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><circle cx="10" cy="13" r="1.8" fill="url(#ei-bb-ball)" stroke="#bdbdbd" stroke-width="0.6"/><rect x="6.5" y="16" width="7" height="1.8" rx="0.5" fill="url(#ei-bb-paddle)" stroke="#1a4a6e" stroke-width="0.7"/><ellipse cx="3.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="8.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="13.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="9.3" cy="12.3" rx="0.9" ry="0.7" fill="white" opacity="0.5"/><ellipse cx="8.5" cy="16.4" rx="2.5" ry="0.5" fill="white" opacity="0.3"/>',
    'Paint': '<defs><linearGradient id="ei-pt" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#fff3c4"/><stop offset="30%" stop-color="#ffe082"/><stop offset="70%" stop-color="#f0c050"/><stop offset="100%" stop-color="#c49000"/></linearGradient></defs><ellipse cx="10" cy="11" rx="8" ry="7" fill="url(#ei-pt)" stroke="#a07000" stroke-width="0.8"/><ellipse cx="9" cy="8" rx="5" ry="3" fill="white" opacity="0.25"/><circle cx="6" cy="9" r="1.5" fill="#ef5350"/><circle cx="9" cy="7" r="1.3" fill="#4a8abe"/><circle cx="13" cy="8" r="1.4" fill="#5aaa80"/><circle cx="14" cy="11" r="1.3" fill="#ffc107"/><circle cx="6" cy="13" r="1.2" fill="#9c27b0"/><ellipse cx="11" cy="14" rx="1" ry="0.8" fill="#ff9800"/><circle cx="5.5" cy="8.3" r="0.5" fill="white" opacity="0.5"/><circle cx="8.5" cy="6.3" r="0.4" fill="white" opacity="0.5"/><circle cx="12.5" cy="7.3" r="0.45" fill="white" opacity="0.5"/><circle cx="13.5" cy="10.3" r="0.4" fill="white" opacity="0.5"/><circle cx="5.5" cy="12.3" r="0.4" fill="white" opacity="0.5"/><circle cx="10.5" cy="13.4" r="0.35" fill="white" opacity="0.5"/><path d="M15 5 Q16 3 17 2 Q18 1.5 18 3 Q17 4 16 6 Q15 7 15 5Z" fill="#a07000" stroke="#785000" stroke-width="0.5"/>',
    'Help': '<defs><linearGradient id="ei-hp" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#fff3c4"/><stop offset="30%" stop-color="#ffc107"/><stop offset="70%" stop-color="#e8a010"/><stop offset="100%" stop-color="#c49000"/></linearGradient><linearGradient id="ei-hpp" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#d8d8d8"/></linearGradient></defs><rect x="2" y="3" width="3" height="14" rx="0.5" fill="url(#ei-hp)" stroke="#c49000" stroke-width="0.6"/><rect x="5" y="4" width="11" height="12" rx="1" fill="url(#ei-hpp)" stroke="#8a8680" stroke-width="0.6"/><path d="M14 4 L14 8 L13.5 7 L13 8 L13 4" fill="#ef5350" stroke="#c62828" stroke-width="0.2"/><line x1="6" y1="4.5" x2="15" y2="4.5" stroke="white" stroke-width="0.5" opacity="0.5"/><path d="M9.5 8 Q9.5 6.5 11 6.5 Q12.5 6.5 12.5 8 Q12.5 9 11 9.5 L11 10.5" fill="none" stroke="#4a8abe" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="12.5" r="0.7" fill="#4a8abe"/>',
    'Search': '<defs><radialGradient id="ei-sr-lens" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="30%" stop-color="#d8ecff"/><stop offset="60%" stop-color="#a8d0f0"/><stop offset="100%" stop-color="#78b0d8"/></radialGradient><linearGradient id="ei-sr-handle" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4d0c8"/><stop offset="50%" stop-color="#a0a098"/><stop offset="100%" stop-color="#787870"/></linearGradient></defs><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="url(#ei-sr-handle)" stroke-width="3" stroke-linecap="round"/><circle cx="9" cy="9" r="6" fill="url(#ei-sr-lens)" stroke="#1a4a6e" stroke-width="1.2"/><circle cx="9" cy="9" r="4.5" fill="none" stroke="#1a4a6e" stroke-width="0.4" opacity="0.3"/><ellipse cx="7" cy="7" rx="3.5" ry="2.5" fill="white" opacity="0.4"/>',
    'Visitor Map': '<defs><radialGradient id="ei-vm" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#e0f4ff"/><stop offset="25%" stop-color="#80c8f0"/><stop offset="55%" stop-color="#4a8abe"/><stop offset="100%" stop-color="#2a6898"/></radialGradient><clipPath id="ei-vmc"><circle cx="10" cy="10" r="7.5"/></clipPath></defs><circle cx="10" cy="10" r="8" fill="url(#ei-vm)" stroke="#1a4a6e" stroke-width="1"/><g clip-path="url(#ei-vmc)" opacity="0.45"><ellipse cx="6" cy="8" rx="4" ry="3" fill="#5aaa80"/><ellipse cx="14" cy="7" rx="3" ry="2.5" fill="#5aaa80"/><ellipse cx="10" cy="14" rx="5" ry="2" fill="#5aaa80"/></g><ellipse cx="10" cy="10" rx="3.5" ry="8" fill="none" stroke="#1a4a6e" stroke-width="0.6"/><line x1="2" y1="10" x2="18" y2="10" stroke="#1a4a6e" stroke-width="0.6"/><path d="M3.5 6.5 Q10 5.5 16.5 6.5" fill="none" stroke="#1a4a6e" stroke-width="0.4"/><path d="M3.5 13.5 Q10 14.5 16.5 13.5" fill="none" stroke="#1a4a6e" stroke-width="0.4"/><ellipse cx="7.5" cy="7" rx="4" ry="3" fill="white" opacity="0.3"/><circle cx="14" cy="6" r="2" fill="#ef5350" opacity="0.8"/><path d="M14 4 L14 6.5" stroke="#c62828" stroke-width="0.8" stroke-linecap="round"/><circle cx="14" cy="4" r="0.6" fill="#c62828"/><circle cx="13.7" cy="3.8" r="0.2" fill="white" opacity="0.7"/>'
  };
  return icons[name] || '';
}

/* ── System Properties (My Computer) — Tab system ── */
let mcCurrentTab = 'general';

let displaySettings = { backgroundColor: '#3a6ea5', wallpaper: 'none' };
let ssSettings = { enabled: true, type: 'starfield', timeout: 2 };
let ssIdleTimer = null;
let ssLastActivity = Date.now();
let ssActive = false;
let ssPreviewInterval = null;
let ssFullscreenInterval = null;
let ssOverlayFirstMove = true;

function openMyComputer() {
  openWindow('mycomputer');
  var body = document.getElementById('mcTabBody');
  if (!body.dataset.initialized) {
    body.dataset.initialized = '1';
    mcSwitchTab(mcCurrentTab);
  } else if (mcCurrentTab === 'screensaver') {
    // Restart preview if returning to screensaver tab after window was closed
    var canvas = document.getElementById('ssPreviewCanvas');
    if (canvas && !ssPreviewInterval) ssUpdatePreview(canvas);
  }
}

function closeMyComputer() {
  ssStopPreview();
  bbTaskbar.closeWindow('mycomputer');
}

function mcSwitchTab(tab) {
  mcCurrentTab = tab;
  var tabs = { general: 'mcTabGeneral', display: 'mcTabDisplay', screensaver: 'mcTabScreenSaver' };
  for (var key in tabs) {
    document.getElementById(tabs[key]).classList.toggle('active', key === tab);
  }
  ssStopPreview();
  var body = document.getElementById('mcTabBody');
  body.textContent = '';
  if (tab === 'general') mcBuildGeneral(body);
  else if (tab === 'display') mcBuildDisplay(body);
  else if (tab === 'screensaver') mcBuildScreenSaver(body);
}

/* ── General tab (former populateSysInfo) ── */
let mcGeneralFrag = null;

function mcBuildGeneral(body) {
  if (mcGeneralFrag) {
    body.appendChild(mcGeneralFrag.cloneNode(true));
    return;
  }

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

  var container = document.createElement('div');

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
  container.appendChild(hero);

  var sep = document.createElement('div');
  sep.className = 'separator';
  container.appendChild(sep);

  var sysSection = makeSection('System', [
    ['CPU Cores', nav.hardwareConcurrency ? nav.hardwareConcurrency + ' logical processors' : null],
    ['Language', nav.language || null]
  ]);
  if (sysSection) container.appendChild(sysSection);

  var dpr = window.devicePixelRatio || 1;
  var dispSection = makeSection('Display', [
    ['Resolution', scr.width + ' \u00d7 ' + scr.height],
    ['Pixel Ratio', dpr + 'x' + (dpr > 1 ? ' (HiDPI)' : '')]
  ]);
  if (dispSection) container.appendChild(dispSection);

  var netContainer = document.createElement('div');
  container.appendChild(netContainer);
  var batContainer = document.createElement('div');
  container.appendChild(batContainer);

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
      // Update cache after async battery info
      mcGeneralFrag = container.cloneNode(true);
    });
  }

  mcGeneralFrag = container.cloneNode(true);
  body.appendChild(container);
}

/* ── Display tab ── */
function mcBuildDisplay(body) {
  // Background Color section
  var colorLabel = document.createElement('div');
  colorLabel.className = 'display-section-label';
  colorLabel.textContent = 'Background Color';
  body.appendChild(colorLabel);

  var colorRow = document.createElement('div');
  colorRow.className = 'display-color-row';

  var picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'display-color-picker';
  picker.value = displaySettings.backgroundColor;
  colorRow.appendChild(picker);

  var hexSpan = document.createElement('span');
  hexSpan.className = 'display-color-hex';
  hexSpan.textContent = displaySettings.backgroundColor;
  colorRow.appendChild(hexSpan);

  picker.addEventListener('input', function () {
    displaySettings.backgroundColor = picker.value;
    hexSpan.textContent = picker.value;
    applyDisplaySettings();
    mcSaveSettings();
  });

  body.appendChild(colorRow);

  // Wallpaper section
  var wpLabel = document.createElement('div');
  wpLabel.className = 'display-section-label';
  wpLabel.textContent = 'Wallpaper Pattern';
  body.appendChild(wpLabel);

  var grid = document.createElement('div');
  grid.className = 'wallpaper-grid';

  var wallpapers = ['none', 'sunset', 'dots', 'grid', 'diagonal', 'waves'];
  var wallpaperNames = { none: 'None', sunset: 'Sunset', dots: 'Dots', grid: 'Grid', diagonal: 'Diagonal', waves: 'Waves' };
  var wpBtns = [];

  wallpapers.forEach(function (id) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wallpaper-btn' + (displaySettings.wallpaper === id ? ' active' : '');

    var canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 60;
    canvas.className = 'wallpaper-preview';
    drawWallpaperPreview(canvas, id);
    btn.appendChild(canvas);

    var label = document.createElement('span');
    label.textContent = wallpaperNames[id];
    btn.appendChild(label);

    btn.addEventListener('click', function () {
      displaySettings.wallpaper = id;
      wpBtns.forEach(function (b) { b.classList.toggle('active', b === btn); });
      applyDisplaySettings();
      mcSaveSettings();
    });

    wpBtns.push(btn);
    grid.appendChild(btn);
  });

  body.appendChild(grid);

  // Reset Defaults button
  var resetRow = document.createElement('div');
  resetRow.style.cssText = 'margin-top: 12px; display: flex; justify-content: flex-end;';
  var resetBtn = document.createElement('button');
  resetBtn.className = 'btn';
  resetBtn.textContent = 'Reset Defaults';
  resetBtn.addEventListener('click', function () {
    displaySettings.backgroundColor = '#3a6ea5';
    displaySettings.wallpaper = 'none';
    applyDisplaySettings();
    mcSaveSettings();
    mcSwitchTab('display');
  });
  resetRow.appendChild(resetBtn);
  body.appendChild(resetRow);
}

function drawWallpaperPreview(canvas, id) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  ctx.fillStyle = displaySettings.backgroundColor;
  ctx.fillRect(0, 0, w, h);

  if (id === 'none') return;

  if (id === 'sunset') {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a0533');
    grad.addColorStop(0.35, '#6b2fa0');
    grad.addColorStop(0.6, '#d4556b');
    grad.addColorStop(0.8, '#f4a742');
    grad.addColorStop(1, '#fcdb6a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (id === 'dots') {
    var spacing = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    for (var dy = spacing; dy < h; dy += spacing) {
      for (var dx = spacing; dx < w; dx += spacing) {
        ctx.beginPath();
        ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;

  if (id === 'grid') {
    var step = 10;
    for (var x = step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  } else if (id === 'diagonal') {
    var spacing = 12;
    for (var d = -h; d < w + h; d += spacing) {
      ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke();
    }
  } else if (id === 'waves') {
    for (var row = 10; row < h; row += 12) {
      ctx.beginPath();
      ctx.moveTo(0, row);
      for (var wx = 0; wx < w; wx += 2) {
        ctx.lineTo(wx, row + Math.sin(wx * 0.15 + row * 0.1) * 4);
      }
      ctx.stroke();
    }
  }
}

function drawFullWallpaper(canvas, id) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  ctx.fillStyle = displaySettings.backgroundColor;
  ctx.fillRect(0, 0, w, h);

  if (id === 'none') return;

  if (id === 'sunset') {
    var grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#1a0533');
    grad.addColorStop(0.35, '#6b2fa0');
    grad.addColorStop(0.6, '#d4556b');
    grad.addColorStop(0.8, '#f4a742');
    grad.addColorStop(1, '#fcdb6a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (id === 'dots') {
    var spacing = 40;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (var dy = spacing; dy < h; dy += spacing) {
      for (var dx = spacing; dx < w; dx += spacing) {
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;

  if (id === 'grid') {
    var step = 40;
    for (var x = step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (var y = step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  } else if (id === 'diagonal') {
    var spacing = 50;
    for (var d = -h; d < w + h; d += spacing) {
      ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke();
    }
  } else if (id === 'waves') {
    for (var row = 20; row < h; row += 40) {
      ctx.beginPath();
      ctx.moveTo(0, row);
      for (var wx = 0; wx < w; wx += 2) {
        ctx.lineTo(wx, row + Math.sin(wx * 0.04 + row * 0.02) * 15);
      }
      ctx.stroke();
    }
  }
}

function applyDisplaySettings() {
  document.documentElement.style.setProperty('--desktop', displaySettings.backgroundColor);
  var desktopArea = document.querySelector('.desktop-area');
  if (!desktopArea) return;
  var existing = desktopArea.querySelector('.wallpaper-canvas');
  if (displaySettings.wallpaper === 'none') {
    if (existing) existing.remove();
    return;
  }
  var canvas;
  if (existing) {
    canvas = existing;
  } else {
    canvas = document.createElement('canvas');
    canvas.className = 'wallpaper-canvas';
    desktopArea.insertBefore(canvas, desktopArea.firstChild);
  }
  canvas.width = desktopArea.offsetWidth;
  canvas.height = desktopArea.offsetHeight;
  drawFullWallpaper(canvas, displaySettings.wallpaper);
}

/* ── Screen Saver tab ── */
var SS_TYPES = [
  { id: 'starfield', name: 'Starfield' },
  { id: 'pipes', name: 'Pipes' },
  { id: 'bouncing', name: 'Bouncing Logo' },
  { id: 'colorcycle', name: 'Color Cycling' },
  { id: 'mystify', name: 'Mystify' }
];

function mcBuildScreenSaver(body) {
  // Screensaver picker
  var row1 = document.createElement('div');
  row1.className = 'ss-row';
  var lbl = document.createElement('label');
  lbl.textContent = 'Screen Saver:';
  row1.appendChild(lbl);

  var sel = document.createElement('select');
  sel.className = 'ss-select';
  SS_TYPES.forEach(function (t) {
    var opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    if (t.id === ssSettings.type) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', function () {
    ssSettings.type = sel.value;
    ssUpdatePreview(previewCanvas);
    mcSaveSettings();
  });
  row1.appendChild(sel);
  body.appendChild(row1);

  // Preview canvas
  var wrap = document.createElement('div');
  wrap.className = 'ss-preview-wrap';
  var previewCanvas = document.createElement('canvas');
  previewCanvas.width = 320;
  previewCanvas.height = 180;
  previewCanvas.className = 'ss-preview-canvas';
  previewCanvas.id = 'ssPreviewCanvas';
  wrap.appendChild(previewCanvas);
  body.appendChild(wrap);

  // Timeout row
  var row2 = document.createElement('div');
  row2.className = 'ss-row';
  var waitLbl = document.createElement('label');
  waitLbl.textContent = 'Wait:';
  row2.appendChild(waitLbl);

  var waitSel = document.createElement('select');
  waitSel.className = 'ss-select';
  [1, 2, 3, 5].forEach(function (m) {
    var opt = document.createElement('option');
    opt.value = String(m);
    opt.textContent = m + (m === 1 ? ' minute' : ' minutes');
    if (m === ssSettings.timeout) opt.selected = true;
    waitSel.appendChild(opt);
  });
  waitSel.addEventListener('change', function () {
    ssSettings.timeout = parseInt(waitSel.value, 10);
    ssResetIdleTimer();
    mcSaveSettings();
  });
  row2.appendChild(waitSel);
  body.appendChild(row2);

  // Enable checkbox
  var row3 = document.createElement('div');
  row3.className = 'ss-row';
  var chkLabel = document.createElement('label');
  chkLabel.className = 'ss-checkbox-label';
  var chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = ssSettings.enabled;
  chk.addEventListener('change', function () {
    ssSettings.enabled = chk.checked;
    ssResetIdleTimer();
    mcSaveSettings();
  });
  chkLabel.appendChild(chk);
  chkLabel.appendChild(document.createTextNode(' Enable screen saver'));
  row3.appendChild(chkLabel);
  body.appendChild(row3);

  // Start preview
  ssUpdatePreview(previewCanvas);
}

/* ── Screensaver rendering ── */
function ssUpdatePreview(canvas) {
  ssStopPreview();
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  var type = ssSettings.type;
  if (type === 'starfield') ssPreviewInterval = ssStartStarfield(ctx, w, h);
  else if (type === 'pipes') ssPreviewInterval = ssStartPipes(ctx, w, h);
  else if (type === 'bouncing') ssPreviewInterval = ssStartBouncing(ctx, w, h);
  else if (type === 'colorcycle') ssPreviewInterval = ssStartColorCycle(ctx, w, h);
  else if (type === 'mystify') ssPreviewInterval = ssStartMystify(ctx, w, h);
}

function ssStopPreview() {
  if (ssPreviewInterval) { clearInterval(ssPreviewInterval); ssPreviewInterval = null; }
}

/* Starfield */
function ssStartStarfield(ctx, w, h) {
  var stars = [];
  for (var i = 0; i < 100; i++) {
    stars.push({ x: (Math.random() - 0.5) * w * 2, y: (Math.random() - 0.5) * h * 2, z: Math.random() * w });
  }
  return setInterval(function () {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 0, w, h);
    for (var j = 0; j < stars.length; j++) {
      var s = stars[j];
      s.z -= 4;
      if (s.z <= 0) { s.x = (Math.random() - 0.5) * w * 2; s.y = (Math.random() - 0.5) * h * 2; s.z = w; }
      var sx = (s.x / s.z) * w / 2 + w / 2;
      var sy = (s.y / s.z) * h / 2 + h / 2;
      var r = Math.max(0.5, (1 - s.z / w) * 2.5);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 40);
}

/* Pipes */
function ssStartPipes(ctx, w, h) {
  var gridSize = 10;
  var px = Math.floor(Math.random() * (w / gridSize)) * gridSize;
  var py = Math.floor(Math.random() * (h / gridSize)) * gridSize;
  var dir = Math.floor(Math.random() * 4); // 0=right,1=down,2=left,3=up
  var hue = Math.random() * 360;
  var segments = 0;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  return setInterval(function () {
    var dx = [gridSize, 0, -gridSize, 0];
    var dy = [0, gridSize, 0, -gridSize];
    // Occasionally change direction
    if (Math.random() < 0.3) {
      dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
    }
    var nx = px + dx[dir];
    var ny = py + dy[dir];
    // Bounce off walls
    if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
      dir = (dir + 2) % 4;
      nx = px + dx[dir];
      ny = py + dy[dir];
    }
    ctx.strokeStyle = 'hsl(' + hue + ',80%,60%)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + gridSize / 2, py + gridSize / 2);
    ctx.lineTo(nx + gridSize / 2, ny + gridSize / 2);
    ctx.stroke();
    // Draw joint
    ctx.fillStyle = 'hsl(' + hue + ',80%,75%)';
    ctx.beginPath();
    ctx.arc(nx + gridSize / 2, ny + gridSize / 2, 2, 0, Math.PI * 2);
    ctx.fill();
    px = nx;
    py = ny;
    segments++;
    if (segments > 40) {
      segments = 0;
      hue = (hue + 60) % 360;
      px = Math.floor(Math.random() * (w / gridSize)) * gridSize;
      py = Math.floor(Math.random() * (h / gridSize)) * gridSize;
    }
  }, 60);
}

/* Bouncing Logo — smiley face */
function ssStartBouncing(ctx, w, h) {
  var size = Math.max(16, Math.min(w, h) * 0.15) | 0;
  var bx = Math.random() * (w - size);
  var by = Math.random() * (h - size);
  var vx = 1.5;
  var vy = 1.2;

  function drawSmiley(x, y, r) {
    // Face
    var grad = ctx.createRadialGradient(x + r * 0.3, y + r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, '#fffde0');
    grad.addColorStop(0.4, '#ffe082');
    grad.addColorStop(1, '#f9a825');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#c49000';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.beginPath();
    ctx.arc(x, y + r * 0.05, r * 0.45, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  return setInterval(function () {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, w, h);
    bx += vx;
    by += vy;
    if (bx <= 0 || bx + size >= w) vx = -vx;
    if (by <= 0 || by + size >= h) vy = -vy;
    drawSmiley(bx + size / 2, by + size / 2, size / 2);
  }, 30);
}

/* Color Cycling */
function ssStartColorCycle(ctx, w, h) {
  var t = 0;
  return setInterval(function () {
    t += 2;
    var grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, 'hsl(' + (t % 360) + ',70%,50%)');
    grad.addColorStop(0.5, 'hsl(' + ((t + 120) % 360) + ',70%,50%)');
    grad.addColorStop(1, 'hsl(' + ((t + 240) % 360) + ',70%,50%)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 40);
}

/* Mystify — bouncing connected lines */
function ssStartMystify(ctx, w, h) {
  var NUM = 2;
  var PTS = 4;
  var TRAIL = 12;
  var shapes = [];
  for (var s = 0; s < NUM; s++) {
    var pts = [];
    for (var p = 0; p < PTS; p++) {
      pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 });
    }
    shapes.push({ pts: pts, hue: s * 180, trail: [] });
  }
  return setInterval(function () {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < shapes.length; i++) {
      var sh = shapes[i];
      var coords = [];
      for (var j = 0; j < sh.pts.length; j++) {
        var pt = sh.pts[j];
        pt.x += pt.vx; pt.y += pt.vy;
        if (pt.x <= 0 || pt.x >= w) pt.vx = -pt.vx;
        if (pt.y <= 0 || pt.y >= h) pt.vy = -pt.vy;
        coords.push({ x: pt.x, y: pt.y });
      }
      sh.trail.push(coords);
      if (sh.trail.length > TRAIL) sh.trail.shift();
      for (var t = 0; t < sh.trail.length; t++) {
        var alpha = (t + 1) / sh.trail.length;
        ctx.strokeStyle = 'hsla(' + sh.hue + ',80%,60%,' + alpha + ')';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sh.trail[t][0].x, sh.trail[t][0].y);
        for (var k = 1; k < sh.trail[t].length; k++) {
          ctx.lineTo(sh.trail[t][k].x, sh.trail[t][k].y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      sh.hue = (sh.hue + 0.3) % 360;
    }
  }, 40);
}

/* ── Idle timer + Fullscreen activation ── */
function ssRecordActivity() {
  ssLastActivity = Date.now();
  if (ssActive) ssDeactivate();
}

function ssResetIdleTimer() {
  if (ssIdleTimer) { clearInterval(ssIdleTimer); ssIdleTimer = null; }
  if (!ssSettings.enabled) return;
  ssLastActivity = Date.now();
  ssIdleTimer = setInterval(function () {
    if (ssActive) return;
    if (Date.now() - ssLastActivity > ssSettings.timeout * 60000) {
      ssActivate();
    }
  }, 1000);
}

function ssActivate() {
  if (ssActive) return;
  ssActive = true;
  ssOverlayFirstMove = true;
  var overlay = document.createElement('div');
  overlay.id = 'ssOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;cursor:none;';
  var canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  overlay.appendChild(canvas);
  document.body.appendChild(overlay);

  var ctx = canvas.getContext('2d');
  var type = ssSettings.type;
  if (type === 'starfield') ssFullscreenInterval = ssStartStarfield(ctx, canvas.width, canvas.height);
  else if (type === 'pipes') ssFullscreenInterval = ssStartPipes(ctx, canvas.width, canvas.height);
  else if (type === 'bouncing') ssFullscreenInterval = ssStartBouncing(ctx, canvas.width, canvas.height);
  else if (type === 'colorcycle') ssFullscreenInterval = ssStartColorCycle(ctx, canvas.width, canvas.height);
  else if (type === 'mystify') ssFullscreenInterval = ssStartMystify(ctx, canvas.width, canvas.height);

  function dismiss(e) {
    // Ignore the very first mousemove to prevent instant dismiss
    if (e.type === 'mousemove' && ssOverlayFirstMove) {
      ssOverlayFirstMove = false;
      return;
    }
    ssDeactivate();
  }
  overlay.addEventListener('mousemove', dismiss);
  overlay.addEventListener('click', dismiss);
  overlay.addEventListener('keydown', dismiss);
  overlay.addEventListener('touchstart', dismiss);
}

function ssDeactivate() {
  if (!ssActive) return;
  ssActive = false;
  if (ssFullscreenInterval) { clearInterval(ssFullscreenInterval); ssFullscreenInterval = null; }
  var overlay = document.getElementById('ssOverlay');
  if (overlay) overlay.remove();
  ssResetIdleTimer();
}

/* ── Persistence ── */
function mcSaveSettings() {
  try {
    localStorage.setItem('mpOS-system-settings', JSON.stringify({
      display: displaySettings,
      screenSaver: ssSettings
    }));
  } catch (e) { /* quota exceeded — ignore */ }
}

function mcLoadSettings() {
  try {
    var raw = localStorage.getItem('mpOS-system-settings');
    if (raw) {
      var data = JSON.parse(raw);
      if (data.display) {
        if (data.display.backgroundColor) displaySettings.backgroundColor = data.display.backgroundColor;
        if (data.display.wallpaper) {
          displaySettings.wallpaper = data.display.wallpaper === 'bliss' ? 'none' : data.display.wallpaper;
        }
      }
      if (data.screenSaver) {
        if (typeof data.screenSaver.enabled === 'boolean') ssSettings.enabled = data.screenSaver.enabled;
        if (data.screenSaver.type) {
          ssSettings.type = data.screenSaver.type === 'matrix' ? 'starfield' : data.screenSaver.type;
        }
        if (data.screenSaver.timeout) ssSettings.timeout = data.screenSaver.timeout;
      }
    }
  } catch (e) { /* malformed data — use defaults */ }
  applyDisplaySettings();
  ssResetIdleTimer();
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

/* ── Data-file lazy loader ── */
const dataScripts = {};
function loadDataScript(src) {
  if (!dataScripts[src]) {
    dataScripts[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return dataScripts[src];
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
  openWindow('fishofday');
  loadDataScript('js/fish-data.js').then(function () {
    if (checkFishDay()) fishPopulated = false;
    populateFish();
  });
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
  loadDataScript('js/aquarium-data.js').then(function () {
    populateFishFinder();
  });
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
  notepadCloseFindBar();
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
  if (notepadFindMode) {
    notepadBuildFindMatches();
    notepadUpdateFindCount();
  }
});

/* ── Notepad Find/Replace ── */
function notepadBuildFindMatches() {
  notepadFindMatches = [];
  if (!notepadFindTerm) return;
  var text = notepadEditor.value;
  var term = notepadFindTerm;
  if (!notepadFindCaseSensitive) {
    text = text.toLowerCase();
    term = term.toLowerCase();
  }
  var pos = 0;
  while (true) {
    var idx = text.indexOf(term, pos);
    if (idx === -1) break;
    notepadFindMatches.push({ start: idx, end: idx + notepadFindTerm.length });
    pos = idx + 1;
  }
}

function notepadUpdateFindCount() {
  var countEl = document.getElementById('notepadFindCount');
  if (!countEl) return;
  if (!notepadFindTerm || notepadFindMatches.length === 0) {
    countEl.textContent = notepadFindTerm ? '0 matches' : '';
    return;
  }
  countEl.textContent = (notepadFindIndex + 1) + ' of ' + notepadFindMatches.length;
}

function notepadHighlightMatch() {
  if (notepadFindMatches.length === 0) { notepadUpdateFindCount(); return; }
  if (notepadFindIndex < 0) notepadFindIndex = 0;
  if (notepadFindIndex >= notepadFindMatches.length) notepadFindIndex = notepadFindMatches.length - 1;
  var m = notepadFindMatches[notepadFindIndex];
  notepadEditor.focus();
  notepadEditor.setSelectionRange(m.start, m.end);
  notepadUpdateFindCount();
}

function notepadFindNext() {
  if (notepadFindMatches.length === 0) return;
  notepadFindIndex = (notepadFindIndex + 1) % notepadFindMatches.length;
  notepadHighlightMatch();
}

function notepadFindPrev() {
  if (notepadFindMatches.length === 0) return;
  notepadFindIndex = (notepadFindIndex - 1 + notepadFindMatches.length) % notepadFindMatches.length;
  notepadHighlightMatch();
}

function notepadReplace() {
  if (notepadFindMatches.length === 0 || notepadFindIndex < 0) return;
  var m = notepadFindMatches[notepadFindIndex];
  var val = notepadEditor.value;
  notepadEditor.value = val.substring(0, m.start) + notepadReplaceTerm + val.substring(m.end);
  notepadMarkDirty();
  updateNotepadStatus();
  notepadBuildFindMatches();
  if (notepadFindIndex >= notepadFindMatches.length) notepadFindIndex = 0;
  if (notepadFindMatches.length > 0) notepadHighlightMatch();
  else notepadUpdateFindCount();
}

function notepadReplaceAll() {
  if (notepadFindMatches.length === 0) return;
  var val = notepadEditor.value;
  for (var i = notepadFindMatches.length - 1; i >= 0; i--) {
    var m = notepadFindMatches[i];
    val = val.substring(0, m.start) + notepadReplaceTerm + val.substring(m.end);
  }
  notepadEditor.value = val;
  notepadMarkDirty();
  updateNotepadStatus();
  notepadBuildFindMatches();
  notepadFindIndex = 0;
  notepadUpdateFindCount();
}

function notepadShowFindBar(mode) {
  var existing = document.querySelector('.notepad-findbar');
  if (existing && notepadFindMode === mode) {
    var input = existing.querySelector('.notepad-find-input');
    if (input) input.focus();
    return;
  }
  if (existing) existing.remove();
  notepadFindMode = mode;

  var bar = document.createElement('div');
  bar.className = 'notepad-findbar';

  var row1 = document.createElement('div');
  row1.className = 'notepad-findbar-row';

  var findLabel = document.createElement('span');
  findLabel.textContent = 'Find:';
  findLabel.style.fontSize = '12px';
  row1.appendChild(findLabel);

  var findInput = document.createElement('input');
  findInput.type = 'text';
  findInput.className = 'notepad-find-input';
  findInput.value = notepadFindTerm;
  findInput.addEventListener('input', function () {
    notepadFindTerm = findInput.value;
    notepadFindIndex = 0;
    notepadBuildFindMatches();
    if (notepadFindMatches.length > 0) notepadHighlightMatch();
    else notepadUpdateFindCount();
  });
  findInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); notepadFindNext(); }
    if (e.key === 'Escape') { e.preventDefault(); notepadCloseFindBar(); }
  });
  row1.appendChild(findInput);

  var prevBtn = document.createElement('button');
  prevBtn.className = 'btn';
  prevBtn.textContent = '\u25C0';
  prevBtn.title = 'Previous';
  prevBtn.addEventListener('click', notepadFindPrev);
  row1.appendChild(prevBtn);

  var nextBtn = document.createElement('button');
  nextBtn.className = 'btn';
  nextBtn.textContent = '\u25B6';
  nextBtn.title = 'Next';
  nextBtn.addEventListener('click', notepadFindNext);
  row1.appendChild(nextBtn);

  var countSpan = document.createElement('span');
  countSpan.className = 'notepad-findbar-count';
  countSpan.id = 'notepadFindCount';
  row1.appendChild(countSpan);

  var caseLabel = document.createElement('label');
  caseLabel.className = 'notepad-findbar-case';
  var caseCheck = document.createElement('input');
  caseCheck.type = 'checkbox';
  caseCheck.checked = notepadFindCaseSensitive;
  caseCheck.addEventListener('change', function () {
    notepadFindCaseSensitive = caseCheck.checked;
    notepadFindIndex = 0;
    notepadBuildFindMatches();
    if (notepadFindMatches.length > 0) notepadHighlightMatch();
    else notepadUpdateFindCount();
  });
  caseLabel.appendChild(caseCheck);
  var caseText = document.createElement('span');
  caseText.textContent = 'Match case';
  caseLabel.appendChild(caseText);
  row1.appendChild(caseLabel);

  var closeBtn = document.createElement('button');
  closeBtn.className = 'notepad-findbar-close';
  closeBtn.textContent = '\u00D7';
  closeBtn.title = 'Close';
  closeBtn.addEventListener('click', notepadCloseFindBar);
  row1.appendChild(closeBtn);

  bar.appendChild(row1);

  if (mode === 'replace') {
    var row2 = document.createElement('div');
    row2.className = 'notepad-findbar-row';

    var repLabel = document.createElement('span');
    repLabel.textContent = 'Replace:';
    repLabel.style.fontSize = '12px';
    row2.appendChild(repLabel);

    var repInput = document.createElement('input');
    repInput.type = 'text';
    repInput.value = notepadReplaceTerm;
    repInput.addEventListener('input', function () {
      notepadReplaceTerm = repInput.value;
    });
    repInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); notepadCloseFindBar(); }
    });
    row2.appendChild(repInput);

    var repBtn = document.createElement('button');
    repBtn.className = 'btn';
    repBtn.textContent = 'Replace';
    repBtn.addEventListener('click', notepadReplace);
    row2.appendChild(repBtn);

    var repAllBtn = document.createElement('button');
    repAllBtn.className = 'btn';
    repAllBtn.textContent = 'Replace All';
    repAllBtn.addEventListener('click', notepadReplaceAll);
    row2.appendChild(repAllBtn);

    bar.appendChild(row2);
  }

  var toolbar = document.querySelector('#notepad .notepad-toolbar');
  toolbar.insertAdjacentElement('afterend', bar);
  findInput.focus();

  if (notepadFindTerm) {
    notepadBuildFindMatches();
    if (notepadFindMatches.length > 0) notepadHighlightMatch();
    else notepadUpdateFindCount();
  }
}

function notepadCloseFindBar() {
  var bar = document.querySelector('.notepad-findbar');
  if (bar) bar.remove();
  notepadFindMode = '';
  notepadFindMatches = [];
  notepadFindIndex = -1;
  notepadEditor.focus();
}

document.getElementById('notepad').addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'f') { e.preventDefault(); notepadShowFindBar('find'); }
    else if (e.key === 'h') { e.preventDefault(); notepadShowFindBar('replace'); }
    else if (e.key === 's') { e.preventDefault(); notepadSave(); }
  }
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
    case 'pow': result = Math.pow(calcPrev, curr); break;
  }
  if (typeof result === 'number' && !isFinite(result)) result = 'Error';
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

/* ── Calculator Scientific Mode ── */
let calcScientific = false;

function calcToggleScientific() {
  var toggle = document.getElementById('calcSciToggle');
  calcScientific = toggle.checked;
  var sciButtons = document.getElementById('calcSciButtons');
  var calcWin = document.getElementById('calculator');
  sciButtons.style.display = calcScientific ? '' : 'none';
  if (calcScientific) calcWin.classList.add('calc-scientific');
  else calcWin.classList.remove('calc-scientific');
}

function calcFactorial(n) {
  if (n < 0 || n !== Math.floor(n)) return NaN;
  if (n > 170) return Infinity;
  var result = 1;
  for (var i = 2; i <= n; i++) result *= i;
  return result;
}

function calcSciFn(fn) {
  var val = parseFloat(calcCurrent);
  var result;
  switch (fn) {
    case 'sin': result = Math.sin(val * Math.PI / 180); break;
    case 'cos': result = Math.cos(val * Math.PI / 180); break;
    case 'tan':
      if (Math.abs(val % 180) === 90) { result = Infinity; }
      else { result = Math.tan(val * Math.PI / 180); }
      break;
    case 'sqrt':
      if (val < 0) { result = NaN; }
      else { result = Math.sqrt(val); }
      break;
    case 'sq': result = val * val; break;
    case 'log':
      if (val <= 0) { result = NaN; }
      else { result = Math.log10(val); }
      break;
    case 'ln':
      if (val <= 0) { result = NaN; }
      else { result = Math.log(val); }
      break;
    case 'inv':
      if (val === 0) { result = NaN; }
      else { result = 1 / val; }
      break;
    case 'fact': result = calcFactorial(val); break;
    case 'pi': result = Math.PI; break;
    case 'negate': result = -val; break;
    default: return;
  }
  if (isNaN(result) || !isFinite(result)) {
    calcCurrent = 'Error';
  } else {
    calcCurrent = String(result);
    if (calcCurrent.length > 15) calcCurrent = parseFloat(calcCurrent).toPrecision(10);
  }
  calcReset = true;
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

function weatherIconType(code) {
  if (code <= 1) return 'sun';
  if (code === 2) return 'partcloud';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  return 'thunder';
}

function renderWeather(body, data) {
  var current = data.current_weather;
  var daily = data.daily;
  body.textContent = '';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs) {
    var e = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  // Shared gradient defs (injected once, referenced by all icons)
  var defsSvg = el('svg', { width: '0', height: '0' });
  defsSvg.style.position = 'absolute';
  var defs = el('defs', {});

  var sunG = el('radialGradient', { id: 'wi-sun', cx: '0.35', cy: '0.35', r: '0.65' });
  sunG.appendChild(el('stop', { offset: '0%', 'stop-color': '#fffde0' }));
  sunG.appendChild(el('stop', { offset: '100%', 'stop-color': '#f9a825' }));
  defs.appendChild(sunG);

  var cloudG = el('linearGradient', { id: 'wi-cloud', x1: '0', y1: '0', x2: '1', y2: '1' });
  cloudG.appendChild(el('stop', { offset: '0%', 'stop-color': '#f0eeea' }));
  cloudG.appendChild(el('stop', { offset: '100%', 'stop-color': '#d0ccc4' }));
  defs.appendChild(cloudG);

  var dkG = el('linearGradient', { id: 'wi-dkcloud', x1: '0', y1: '0', x2: '1', y2: '1' });
  dkG.appendChild(el('stop', { offset: '0%', 'stop-color': '#b0aca4' }));
  dkG.appendChild(el('stop', { offset: '100%', 'stop-color': '#7a7670' }));
  defs.appendChild(dkG);

  var dropG = el('linearGradient', { id: 'wi-drop', x1: '0', y1: '0', x2: '0', y2: '1' });
  dropG.appendChild(el('stop', { offset: '0%', 'stop-color': '#c8e0f8' }));
  dropG.appendChild(el('stop', { offset: '100%', 'stop-color': '#4a8abe' }));
  defs.appendChild(dropG);

  var boltG = el('linearGradient', { id: 'wi-bolt', x1: '0', y1: '0', x2: '0', y2: '1' });
  boltG.appendChild(el('stop', { offset: '0%', 'stop-color': '#fff3c4' }));
  boltG.appendChild(el('stop', { offset: '100%', 'stop-color': '#ffc107' }));
  defs.appendChild(boltG);

  defsSvg.appendChild(defs);
  body.appendChild(defsSvg);

  // Cloud paths (Q-curve style matching explorer icon)
  var CLOUD = 'M10 30 Q10 23 17 23 Q18 18 24 18 Q32 18 33 23 Q39 23 39 28 Q39 32 34 32 L15 32 Q10 32 10 30 Z';
  var CLOUD_HI = 'M10 22 Q10 15 17 15 Q18 10 24 10 Q32 10 33 15 Q39 15 39 20 Q39 24 34 24 L15 24 Q10 24 10 22 Z';
  var CLOUD_PC = 'M6 34 Q6 27 13 27 Q14 22 20 22 Q28 22 29 27 Q35 27 35 32 Q35 36 30 36 L11 36 Q6 36 6 34 Z';

  function addSun(svg, cx, cy, r) {
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4;
      svg.appendChild(el('line', {
        x1: (cx + (r + 3) * Math.cos(a)).toFixed(1),
        y1: (cy + (r + 3) * Math.sin(a)).toFixed(1),
        x2: (cx + (r + 7) * Math.cos(a)).toFixed(1),
        y2: (cy + (r + 7) * Math.sin(a)).toFixed(1),
        stroke: '#f9a825', 'stroke-width': '2.5', 'stroke-linecap': 'round'
      }));
    }
    svg.appendChild(el('circle', { cx: cx, cy: cy, r: r, fill: 'url(#wi-sun)', stroke: '#c49000', 'stroke-width': '1' }));
    svg.appendChild(el('ellipse', { cx: cx - r * 0.25, cy: cy - r * 0.25, rx: r * 0.35, ry: r * 0.3, fill: 'rgba(255,255,255,0.4)' }));
  }

  function addCloud(svg, path, dark) {
    svg.appendChild(el('path', {
      d: path,
      fill: 'url(#' + (dark ? 'wi-dkcloud' : 'wi-cloud') + ')',
      stroke: dark ? '#5a5650' : '#8a8680',
      'stroke-width': '0.8'
    }));
  }

  function makeIcon(code) {
    var svg = el('svg', { viewBox: '0 0 48 48', 'class': 'weather-icon' });
    var type = weatherIconType(code);

    switch (type) {
      case 'sun':
        addSun(svg, 24, 24, 10);
        break;
      case 'partcloud':
        addSun(svg, 33, 14, 9);
        addCloud(svg, CLOUD_PC, false);
        svg.appendChild(el('ellipse', { cx: 15, cy: 25, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
        break;
      case 'cloud':
        addCloud(svg, CLOUD, false);
        svg.appendChild(el('ellipse', { cx: 20, cy: 21, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
        break;
      case 'fog':
        addCloud(svg, CLOUD_HI, false);
        svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
        svg.appendChild(el('line', { x1: 8, y1: 30, x2: 40, y2: 30, stroke: '#b0aca4', 'stroke-width': '2', 'stroke-linecap': 'round' }));
        svg.appendChild(el('line', { x1: 12, y1: 35, x2: 36, y2: 35, stroke: '#c8c4bc', 'stroke-width': '2', 'stroke-linecap': 'round' }));
        svg.appendChild(el('line', { x1: 10, y1: 40, x2: 38, y2: 40, stroke: '#d8d4cc', 'stroke-width': '2', 'stroke-linecap': 'round' }));
        break;
      case 'rain':
        addCloud(svg, CLOUD_HI, false);
        svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
        svg.appendChild(el('ellipse', { cx: 16, cy: 32, rx: 1.5, ry: 2.5, fill: 'url(#wi-drop)' }));
        svg.appendChild(el('ellipse', { cx: 24, cy: 36, rx: 1.5, ry: 2.5, fill: 'url(#wi-drop)' }));
        svg.appendChild(el('ellipse', { cx: 32, cy: 32, rx: 1.5, ry: 2.5, fill: 'url(#wi-drop)' }));
        break;
      case 'snow':
        addCloud(svg, CLOUD_HI, false);
        svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
        svg.appendChild(el('circle', { cx: 16, cy: 32, r: 2.5, fill: '#e8eef4', stroke: '#a0b8cc', 'stroke-width': '0.5' }));
        svg.appendChild(el('circle', { cx: 24, cy: 37, r: 2.5, fill: '#e8eef4', stroke: '#a0b8cc', 'stroke-width': '0.5' }));
        svg.appendChild(el('circle', { cx: 32, cy: 32, r: 2.5, fill: '#e8eef4', stroke: '#a0b8cc', 'stroke-width': '0.5' }));
        break;
      case 'thunder':
        addCloud(svg, CLOUD_HI, true);
        svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.2)' }));
        svg.appendChild(el('path', {
          d: 'M26 26 L22 33 L26 33 L21 42 L29 32 L25 32 L29 26 Z',
          fill: 'url(#wi-bolt)', stroke: '#c49000', 'stroke-width': '0.7', 'stroke-linejoin': 'round'
        }));
        break;
    }
    return svg;
  }

  // Current weather
  var curDiv = document.createElement('div');
  curDiv.className = 'weather-current';
  curDiv.appendChild(makeIcon(current.weathercode));
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

  // Forecast
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
    dayDiv.appendChild(makeIcon(daily.weathercode[i]));
    var dayHiEl = document.createElement('div');
    dayHiEl.className = 'weather-day-temp';
    dayHiEl.textContent = Math.round(daily.temperature_2m_max[i]) + '\u00b0';
    dayDiv.appendChild(dayHiEl);
    var dayLoEl = document.createElement('div');
    dayLoEl.className = 'weather-day-low';
    dayLoEl.textContent = Math.round(daily.temperature_2m_min[i]) + '\u00b0';
    dayDiv.appendChild(dayLoEl);
    forecast.appendChild(dayDiv);
  }
  body.appendChild(forecast);
}

/* ── Disk Usage ── */
const DU_FILES = [
  { path: 'index.html', type: 'HTML' },
  { path: '404.html', type: 'HTML' },
  { path: 'target-game.html', type: 'HTML' },
  { path: 'brick-breaker.html', type: 'HTML' },
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
  { path: 'js/help-data.js', type: 'JS' },
  { path: 'js/world-map-data.js', type: 'JS' }
];

const DU_COLORS = { HTML: '#4a8abe', CSS: '#5aaa80', JS: '#e8a010' };
const DU_LABELS = { HTML: 'HTML', CSS: 'CSS', JS: 'JavaScript' };

function darkenHex(hex, factor) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return '#' + ((1 << 24) + (Math.round(r * factor) << 16) +
    (Math.round(g * factor) << 8) + Math.round(b * factor)).toString(16).slice(1);
}

function formatDuSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  return (bytes / 1024).toFixed(1) + ' KB';
}

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

  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  var fetches = DU_FILES.map(function (f) {
    return fetch(f.path)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
      .then(function (b) { return { path: f.path, type: f.type, size: b.size }; })
      .catch(function () { return null; });
  });

  Promise.all(fetches).then(function (results) {
    var files = results.filter(function (r) { return r !== null; });
    var totals = { HTML: 0, CSS: 0, JS: 0 };
    var totalSize = 0;

    files.forEach(function (f) {
      totals[f.type] += f.size;
      totalSize += f.size;
    });

    if (totalSize === 0) {
      showLoadingMessage(body, 'No files found.');
      return;
    }

    body.textContent = '';
    var types = ['HTML', 'CSS', 'JS'];

    // ── Header ──
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

    // ── 3D Pie chart ──
    var pieWrap = document.createElement('div');
    pieWrap.className = 'du-pie-wrap';

    var pieSvg = svgEl('svg', { viewBox: '0 0 200 130', width: '200', height: '130' });
    var pieCx = 100, pieCy = 52, pieRx = 75, pieRy = 42, pieDepth = 12;

    function piePt(angle, dy) {
      return {
        x: (pieCx + pieRx * Math.cos(angle)).toFixed(2),
        y: (pieCy + pieRy * Math.sin(angle) + (dy || 0)).toFixed(2)
      };
    }

    // Calculate slices (start from top, clockwise)
    var slices = [];
    var cumAngle = -Math.PI / 2;
    types.forEach(function (type) {
      var pct = totals[type] / totalSize;
      if (pct === 0) return;
      slices.push({ type: type, start: cumAngle, end: cumAngle + pct * 2 * Math.PI, pct: pct });
      cumAngle += pct * 2 * Math.PI;
    });

    // Back rim (dark ellipse at depth level)
    pieSvg.appendChild(svgEl('ellipse', { cx: pieCx, cy: pieCy + pieDepth, rx: pieRx, ry: pieRy, fill: '#686868' }));

    // Front-facing side faces (visible where sin(angle) > 0, i.e. angles 0 to π)
    slices.forEach(function (s) {
      var visStart = Math.max(s.start, 0);
      var visEnd = Math.min(s.end, Math.PI);
      if (visStart >= visEnd) return;

      var p1t = piePt(visStart, 0);
      var p1b = piePt(visStart, pieDepth);
      var p2t = piePt(visEnd, 0);
      var p2b = piePt(visEnd, pieDepth);
      var large = (visEnd - visStart) > Math.PI ? 1 : 0;

      var d = 'M' + p1t.x + ',' + p1t.y +
              ' A' + pieRx + ',' + pieRy + ' 0 ' + large + ',1 ' + p2t.x + ',' + p2t.y +
              ' L' + p2b.x + ',' + p2b.y +
              ' A' + pieRx + ',' + pieRy + ' 0 ' + large + ',0 ' + p1b.x + ',' + p1b.y + ' Z';

      pieSvg.appendChild(svgEl('path', { d: d, fill: darkenHex(DU_COLORS[s.type], 0.7) }));
    });

    // Top face slices
    slices.forEach(function (s) {
      var p1 = piePt(s.start, 0);
      var p2 = piePt(s.end, 0);
      var large = s.pct > 0.5 ? 1 : 0;
      var d;

      if (s.pct >= 0.9999) {
        d = 'M' + (pieCx - pieRx) + ',' + pieCy +
            ' A' + pieRx + ',' + pieRy + ' 0 1,1 ' + (pieCx + pieRx) + ',' + pieCy +
            ' A' + pieRx + ',' + pieRy + ' 0 1,1 ' + (pieCx - pieRx) + ',' + pieCy + ' Z';
      } else {
        d = 'M' + pieCx + ',' + pieCy +
            ' L' + p1.x + ',' + p1.y +
            ' A' + pieRx + ',' + pieRy + ' 0 ' + large + ',1 ' + p2.x + ',' + p2.y + ' Z';
      }

      pieSvg.appendChild(svgEl('path', { d: d, fill: DU_COLORS[s.type] }));
    });

    // Subtle highlight on upper-left of top face
    pieSvg.appendChild(svgEl('ellipse', { cx: pieCx - 15, cy: pieCy - 8, rx: 30, ry: 18, fill: 'rgba(255,255,255,0.15)' }));

    pieWrap.appendChild(pieSvg);
    body.appendChild(pieWrap);

    // ── Legend (largest-remainder rounding so percentages sum to 100) ──
    var rawPcts = types.map(function (type) { return totals[type] / totalSize * 100; });
    var floored = rawPcts.map(function (p) { return Math.floor(p); });
    var remainders = rawPcts.map(function (p, i) { return p - floored[i]; });
    var remainder = 100 - floored.reduce(function (a, b) { return a + b; }, 0);
    var indices = types.map(function (_, i) { return i; });
    indices.sort(function (a, b) { return remainders[b] - remainders[a]; });
    for (var ri = 0; ri < remainder; ri++) floored[indices[ri]]++;
    var roundedPcts = floored;

    var legend = document.createElement('div');
    legend.className = 'du-legend';

    types.forEach(function (type, i) {
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
      pctEl.textContent = roundedPcts[i] + '%';
      row.appendChild(pctEl);

      legend.appendChild(row);
    });

    body.appendChild(legend);

    // ── Capacity bar ──
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

    // ── Total line ──
    var totalEl = document.createElement('div');
    totalEl.className = 'du-total';
    totalEl.textContent = 'Total: ' + formatDuSize(totalSize) + ' (' + files.length + ' files)';
    body.appendChild(totalEl);

    status.textContent = files.length + ' files scanned';
  });
}

/* ── Visitor Map ── */
const VM_WORKER = 'https://visitor-map.matthewpritchard.workers.dev';
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
  var dataReady = loadDataScript('js/world-map-data.js');
  var countsReady = fetch(VM_WORKER + '/visit', { method: method })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  Promise.all([dataReady, countsReady])
    .then(function (results) {
      renderVisitorMap(body, results[1]);
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
  // var totalVisitors = 0;
  var countryCount = 0;
  var entries = [];
  var code;
  for (code in counts) {
    if (counts.hasOwnProperty(code)) {
      var c = counts[code];
      // totalVisitors += c;
      countryCount++;
      if (c > maxCount) maxCount = c;
      var name = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[code]) || code;
      entries.push({ code: code, name: name, count: c });
    }
  }
  // entries.sort(function (a, b) { return b.count - a.count; });
  entries.sort(function (a, b) { return a.name < b.name ? -1 : a.name > b.name ? 1 : 0; });

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
        // var cCount = counts[cc] || 0;
        // tooltip.textContent = cName + ': ' + cCount + ' visit' + (cCount !== 1 ? 's' : '');
        tooltip.textContent = cName;
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

    // Click country → open in WikiBrowser
    svg.addEventListener('click', function (e) {
      var target = e.target;
      if (!target.classList || !target.classList.contains('vm-has-visitors')) return;
      var cc = target.getAttribute('data-code');
      var cName = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[cc]) || cc;
      openBrowser();
      browserNavigate('https://en.wikipedia.org/wiki/' + encodeURIComponent(cName));
    });
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
  listHeader.textContent = 'Countries';
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

    row.style.cursor = 'pointer';
    row.dataset.country = entry.name;
    row.addEventListener('click', function () {
      openBrowser();
      browserNavigate('https://en.wikipedia.org/wiki/' + encodeURIComponent(this.dataset.country));
    });

    // var countSpan = document.createElement('span');
    // countSpan.className = 'vm-list-count';
    // countSpan.textContent = String(entry.count);
    // row.appendChild(countSpan);

    list.appendChild(row);
  }

  body.appendChild(list);

  // Status bar
  var status = document.getElementById('visitorMapStatus');
  if (status) {
    // status.textContent = countryCount + ' countr' + (countryCount !== 1 ? 'ies' : 'y') + ', ' + totalVisitors + ' total visitor' + (totalVisitors !== 1 ? 's' : '');
    status.textContent = countryCount + ' countr' + (countryCount !== 1 ? 'ies' : 'y');
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
    loadDataScript('js/help-data.js').then(function () {
      helpBuilt = true;
      helpHistory = ['welcome'];
      helpHistoryIndex = 0;
      helpSwitchTab('contents');
      helpRenderTopic('welcome');
      helpUpdateButtons();
    });
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

/* ── Search Results ── */
let searchBuilt = false;

function openSearch() {
  openWindow('search');
  if (!searchBuilt) {
    searchBuilt = true;
    var input = document.getElementById('searchInput');
    input.addEventListener('input', function () { searchNow(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') searchNow();
    });
  }
  setTimeout(function () {
    document.getElementById('searchInput').focus();
  }, 100);
}

function searchNow() {
  var input = document.getElementById('searchInput');
  var results = document.getElementById('searchResults');
  var status = document.getElementById('searchStatus');
  var query = input.value.trim().toLowerCase();

  results.textContent = '';

  if (!query) {
    status.textContent = 'Ready';
    return;
  }

  var totalCount = 0;

  // 1. Programs
  var progMatches = FOLDER_ITEMS.programs.filter(function (item) {
    return item.name.toLowerCase().indexOf(query) !== -1 ||
           item.desc.toLowerCase().indexOf(query) !== -1;
  });
  if (progMatches.length) {
    totalCount += progMatches.length;
    results.appendChild(searchBuildGroup('Programs', progMatches, 'program'));
  }

  // 2. Utilities
  var utilMatches = FOLDER_ITEMS.utilities.filter(function (item) {
    return item.name.toLowerCase().indexOf(query) !== -1 ||
           item.desc.toLowerCase().indexOf(query) !== -1;
  });
  if (utilMatches.length) {
    totalCount += utilMatches.length;
    results.appendChild(searchBuildGroup('Utilities', utilMatches, 'program'));
  }

  // 3. Files
  var fileMatches = [];
  var paths = Object.keys(FILESYSTEM);
  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    var entry = FILESYSTEM[path];
    if (!entry.files) continue;
    for (var j = 0; j < entry.files.length; j++) {
      var f = entry.files[j];
      if (f.name.toLowerCase().indexOf(query) !== -1 ||
          (f.content && f.content.toLowerCase().indexOf(query) !== -1)) {
        fileMatches.push({ name: f.name, path: path, content: f.content });
      }
    }
  }
  if (fileMatches.length) {
    totalCount += fileMatches.length;
    results.appendChild(searchBuildGroup('Files', fileMatches, 'file'));
  }

  // 4. Commands
  var cmdKeys = Object.keys(COMMANDS);
  var cmdMatches = [];
  for (var k = 0; k < cmdKeys.length; k++) {
    var key = cmdKeys[k];
    var cmd = COMMANDS[key];
    if (key.toLowerCase().indexOf(query) !== -1 ||
        cmd.desc.toLowerCase().indexOf(query) !== -1) {
      cmdMatches.push({ key: key, desc: cmd.desc });
    }
  }
  if (cmdMatches.length) {
    totalCount += cmdMatches.length;
    results.appendChild(searchBuildGroup('Commands', cmdMatches, 'command'));
  }

  if (totalCount === 0) {
    var noRes = document.createElement('div');
    noRes.className = 'search-no-results';
    noRes.textContent = 'No items match your search.';
    results.appendChild(noRes);
    status.textContent = '0 item(s) found';
  } else {
    status.textContent = totalCount + ' item(s) found';
  }
}

function searchBuildGroup(title, items, type) {
  var frag = document.createDocumentFragment();
  var header = document.createElement('div');
  header.className = 'search-result-group-title';
  header.textContent = title;
  frag.appendChild(header);

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var row = document.createElement('div');
    row.className = 'search-result-item';

    if (type === 'program') {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 20 20');
      svg.setAttribute('fill', 'none');
      svg.innerHTML = getItemIcon(item.name);
      row.appendChild(svg);
      var nameEl = document.createElement('span');
      nameEl.className = 'search-result-name';
      nameEl.textContent = item.name;
      row.appendChild(nameEl);
      var descEl = document.createElement('span');
      descEl.className = 'search-result-desc';
      descEl.textContent = item.desc;
      row.appendChild(descEl);
      (function (it) {
        row.addEventListener('click', function () {
          var fn = ACTION_MAP[it.action];
          if (fn) fn();
        });
      })(item);
    } else if (type === 'file') {
      var iconEl = document.createElement('span');
      iconEl.className = 'search-result-icon';
      iconEl.textContent = '\uD83D\uDCC4';
      row.appendChild(iconEl);
      var fnameEl = document.createElement('span');
      fnameEl.className = 'search-result-name';
      fnameEl.textContent = item.name;
      row.appendChild(fnameEl);
      var pathEl = document.createElement('span');
      pathEl.className = 'search-result-desc';
      pathEl.textContent = item.path;
      row.appendChild(pathEl);
      (function (it) {
        row.addEventListener('click', function () {
          openNotepad();
          notepadEditor.value = it.content || '';
          notepadCurrentFile = null;
          notepadDirty = false;
          notepadTitle.textContent = 'Notepad - ' + it.name;
          notepadStatus.textContent = (it.content || '').length + ' characters';
        });
      })(item);
    } else if (type === 'command') {
      var promptEl = document.createElement('span');
      promptEl.className = 'search-result-icon';
      promptEl.textContent = '>';
      row.appendChild(promptEl);
      var cmdNameEl = document.createElement('span');
      cmdNameEl.className = 'search-result-name';
      cmdNameEl.textContent = item.key;
      row.appendChild(cmdNameEl);
      var cmdDescEl = document.createElement('span');
      cmdDescEl.className = 'search-result-desc';
      cmdDescEl.textContent = item.desc;
      row.appendChild(cmdDescEl);
      (function (it) {
        row.addEventListener('click', function () {
          openRun();
          document.getElementById('termInput').value = it.key;
          document.getElementById('termInput').focus();
        });
      })(item);
    }

    frag.appendChild(row);
  }
  return frag;
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
  openVisitorMap: openVisitorMap,
  openSearch: openSearch
};

/* ── Run Terminal ── */
const termOutput = document.getElementById('termOutput');
const termInput = document.getElementById('termInput');

let termCwd = 'C:\\mpOS';
let termHistory = [];
let termHistoryIndex = -1;
let termSavedInput = '';
let tabMatches = [];
let tabIndex = -1;

const COLOR_TABLE = {
  '0': '#000000', '1': '#000080', '2': '#008000', '3': '#008080',
  '4': '#800000', '5': '#800080', '6': '#808000', '7': '#c0c0c0',
  '8': '#808080', '9': '#0000ff', 'a': '#00ff00', 'b': '#00ffff',
  'c': '#ff0000', 'd': '#ff00ff', 'e': '#ffff00', 'f': '#ffffff'
};

/* ── Task Manager (Ctrl+Alt+Del) ── */
let tmInterval = null;
let tmSelectedId = null;
let tmFpsHistory = [];
let tmMemHistory = [];
let tmFrameCount = 0;
let tmCurrentFps = 0;
let tmRafId = null;
let tmBuilt = false;
let tmLastFrameTime = 0;
const tmMonoFont = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim();

function tmFpsLoop(now) {
  tmFrameCount++;
  tmRafId = requestAnimationFrame(tmFpsLoop);
}

function openTaskManager() {
  if (!tmBuilt) {
    tmBuildUI();
    tmBuilt = true;
  }
  openWindow('taskmanager');
  if (!tmRafId) {
    tmFrameCount = 0;
    tmLastFrameTime = performance.now();
    tmRafId = requestAnimationFrame(tmFpsLoop);
  }
  if (!tmInterval) {
    tmRefreshApps();
    tmRefreshPerf();
    tmInterval = setInterval(function () {
      tmRefreshApps();
      tmRefreshPerf();
    }, 1000);
  }
}

function closeTaskManager() {
  if (tmInterval) { clearInterval(tmInterval); tmInterval = null; }
  if (tmRafId) { cancelAnimationFrame(tmRafId); tmRafId = null; }
  bbTaskbar.closeWindow('taskmanager');
}

function tmBuildUI() {
  var body = document.getElementById('taskmanagerBody');

  // Tab bar
  var tabBar = document.createElement('div');
  tabBar.className = 'mycomputer-tabs';

  var tabApps = document.createElement('button');
  tabApps.className = 'mycomputer-tab active';
  tabApps.textContent = 'Applications';
  tabApps.onclick = function () { tmSwitchTab('apps'); };

  var tabPerf = document.createElement('button');
  tabPerf.className = 'mycomputer-tab';
  tabPerf.textContent = 'Performance';
  tabPerf.onclick = function () { tmSwitchTab('perf'); };

  tabBar.appendChild(tabApps);
  tabBar.appendChild(tabPerf);
  body.appendChild(tabBar);

  // Tab body container
  var tabBody = document.createElement('div');
  tabBody.className = 'mycomputer-tab-body';
  tabBody.style.padding = '0';
  tabBody.style.flex = '1';
  tabBody.style.display = 'flex';
  tabBody.style.flexDirection = 'column';
  tabBody.style.minHeight = '0';
  body.appendChild(tabBody);

  // Applications content
  var appsContent = document.createElement('div');
  appsContent.id = 'tmAppsContent';
  appsContent.style.display = 'flex';
  appsContent.style.flexDirection = 'column';
  appsContent.style.flex = '1';
  appsContent.style.minHeight = '0';

  var appList = document.createElement('div');
  appList.className = 'tm-app-list';
  appList.id = 'tmAppList';
  appsContent.appendChild(appList);

  var btnRow = document.createElement('div');
  btnRow.className = 'tm-btn-row';

  var endBtn = document.createElement('button');
  endBtn.className = 'btn';
  endBtn.textContent = 'End Task';
  endBtn.style.fontSize = '12px';
  endBtn.style.padding = '2px 12px';
  endBtn.onclick = function () { tmEndTask(); };

  var switchBtn = document.createElement('button');
  switchBtn.className = 'btn';
  switchBtn.textContent = 'Switch To';
  switchBtn.style.fontSize = '12px';
  switchBtn.style.padding = '2px 12px';
  switchBtn.onclick = function () { tmSwitchTo(); };

  btnRow.appendChild(endBtn);
  btnRow.appendChild(switchBtn);
  appsContent.appendChild(btnRow);
  tabBody.appendChild(appsContent);

  // Performance content
  var perfContent = document.createElement('div');
  perfContent.id = 'tmPerfContent';
  perfContent.className = 'tm-perf-wrap';
  perfContent.style.display = 'none';

  // CPU section
  var cpuSection = document.createElement('div');
  cpuSection.className = 'tm-graph-section';
  var cpuLabel = document.createElement('div');
  cpuLabel.className = 'tm-graph-label';
  cpuLabel.textContent = 'CPU Usage';
  cpuSection.appendChild(cpuLabel);
  var cpuCanvas = document.createElement('canvas');
  cpuCanvas.className = 'tm-graph-canvas';
  cpuCanvas.id = 'tmCpuCanvas';
  cpuSection.appendChild(cpuCanvas);
  perfContent.appendChild(cpuSection);

  // Memory section
  var memSection = document.createElement('div');
  memSection.className = 'tm-graph-section';
  var memLabel = document.createElement('div');
  memLabel.className = 'tm-graph-label';
  memLabel.textContent = 'Memory Usage';
  memSection.appendChild(memLabel);
  var memCanvas = document.createElement('canvas');
  memCanvas.className = 'tm-graph-canvas';
  memCanvas.id = 'tmMemCanvas';
  memSection.appendChild(memCanvas);
  perfContent.appendChild(memSection);

  // Stats row
  var statsRow = document.createElement('div');
  statsRow.className = 'tm-perf-stats';
  statsRow.id = 'tmPerfStats';
  perfContent.appendChild(statsRow);

  tabBody.appendChild(perfContent);

  // Store tab refs
  body._tmTabApps = tabApps;
  body._tmTabPerf = tabPerf;
  body._tmAppsContent = appsContent;
  body._tmPerfContent = perfContent;
}

function tmSwitchTab(tab) {
  var body = document.getElementById('taskmanagerBody');
  var tabApps = body._tmTabApps;
  var tabPerf = body._tmTabPerf;
  var appsContent = body._tmAppsContent;
  var perfContent = body._tmPerfContent;

  if (tab === 'apps') {
    tabApps.classList.add('active');
    tabPerf.classList.remove('active');
    appsContent.style.display = 'flex';
    perfContent.style.display = 'none';
  } else {
    tabApps.classList.remove('active');
    tabPerf.classList.add('active');
    appsContent.style.display = 'none';
    perfContent.style.display = '';
  }
}

function tmRefreshApps() {
  var list = document.getElementById('tmAppList');
  if (!list) return;
  list.textContent = '';
  var count = 0;
  var names = Object.keys(WINDOW_NAMES);
  for (var i = 0; i < names.length; i++) {
    var id = names[i];
    if (id === 'taskmanager') continue;
    var el = document.getElementById(id);
    if (!el || el.style.display === 'none') continue;
    count++;
    var row = document.createElement('div');
    row.className = 'tm-app-row';
    if (id === tmSelectedId) row.classList.add('selected');
    row.dataset.winId = id;

    var nameSpan = document.createElement('span');
    nameSpan.className = 'tm-app-name';
    nameSpan.textContent = WINDOW_NAMES[id];
    row.appendChild(nameSpan);

    var statusSpan = document.createElement('span');
    statusSpan.className = 'tm-app-status';
    statusSpan.textContent = 'Running';
    row.appendChild(statusSpan);

    row.onclick = (function (winId) {
      return function () { tmSelectRow(winId); };
    })(id);

    list.appendChild(row);
  }

  // Clear selection if the selected window is no longer open
  if (tmSelectedId) {
    var selEl = document.getElementById(tmSelectedId);
    if (!selEl || selEl.style.display === 'none') tmSelectedId = null;
  }

  var statusEl = document.getElementById('tmStatus');
  if (statusEl) statusEl.textContent = 'Processes: ' + count;
}

function tmSelectRow(winId) {
  tmSelectedId = winId;
  var list = document.getElementById('tmAppList');
  if (!list) return;
  var rows = list.children;
  for (var i = 0; i < rows.length; i++) {
    rows[i].classList.toggle('selected', rows[i].dataset.winId === winId);
  }
}

function tmEndTask() {
  if (!tmSelectedId) return;
  bbTaskbar.closeWindow(tmSelectedId);
  tmSelectedId = null;
  tmRefreshApps();
}

function tmSwitchTo() {
  if (!tmSelectedId) return;
  var win = document.getElementById(tmSelectedId);
  if (win) bbTaskbar.bringToFront(win);
}

function tmRefreshPerf() {
  var now = performance.now();
  var elapsed = (now - tmLastFrameTime) / 1000;
  if (elapsed > 0) {
    tmCurrentFps = Math.round(tmFrameCount / elapsed);
  }
  tmFrameCount = 0;
  tmLastFrameTime = now;

  tmFpsHistory.push(tmCurrentFps);
  if (tmFpsHistory.length > 60) tmFpsHistory.shift();

  var mem = null;
  if (performance.memory) {
    mem = performance.memory.usedJSHeapSize / 1048576;
    tmMemHistory.push(mem);
    if (tmMemHistory.length > 60) tmMemHistory.shift();
  }

  // Draw graphs
  var cpuCanvas = document.getElementById('tmCpuCanvas');
  var memCanvas = document.getElementById('tmMemCanvas');
  if (cpuCanvas) tmDrawGraph(cpuCanvas, tmFpsHistory, 80, 'FPS');
  if (memCanvas) {
    if (performance.memory) {
      tmDrawGraph(memCanvas, tmMemHistory, performance.memory.jsHeapSizeLimit / 1048576, 'MB');
    } else {
      tmDrawUnavailable(memCanvas);
    }
  }

  // Update statusbar
  var cpuPct = Math.min(100, Math.round(tmCurrentFps / 60 * 100));
  var cpuStatus = document.getElementById('tmCpuStatus');
  if (cpuStatus) cpuStatus.textContent = 'CPU Usage: ' + cpuPct + '%';

  var memStatus = document.getElementById('tmMemStatus');
  if (memStatus) memStatus.textContent = 'Mem Usage: ' + (mem !== null ? Math.round(mem) + ' MB' : '\u2014');

  // Update stats row
  var statsRow = document.getElementById('tmPerfStats');
  if (statsRow) {
    statsRow.textContent = '';
    var fpsStat = document.createElement('span');
    fpsStat.textContent = 'FPS: ' + tmCurrentFps;
    statsRow.appendChild(fpsStat);
    if (mem !== null) {
      var memStat = document.createElement('span');
      memStat.textContent = 'Heap: ' + Math.round(mem) + ' MB';
      statsRow.appendChild(memStat);
    }
  }
}

function tmDrawGraph(canvas, data, maxVal, unit) {
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#003300';
  ctx.lineWidth = 1;
  var gridRows = 4;
  for (var r = 1; r < gridRows; r++) {
    var y = Math.round(h * r / gridRows) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  var gridCols = 8;
  for (var c = 1; c < gridCols; c++) {
    var x = Math.round(w * c / gridCols) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Data line
  if (data.length > 1) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    var len = data.length;
    var stepX = w / 59;
    var startX = w - (len - 1) * stepX;
    for (var i = 0; i < len; i++) {
      var px = startX + i * stepX;
      var val = Math.min(data[i], maxVal);
      var py = h - (val / maxVal) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Current value text
  if (data.length > 0) {
    var current = data[data.length - 1];
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px ' + tmMonoFont;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(current) + ' ' + unit, w - 4, 12);
  }
}

function tmDrawUnavailable(canvas) {
  var w = canvas.clientWidth;
  var h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#003300';
  ctx.font = '11px ' + tmMonoFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Not available', w / 2, h / 2);
}

const WINDOW_NAMES = {
  'mycomputer': 'System Properties', 'explorer': 'Files', 'fishofday': 'Fish of the Day',
  'aquarium': 'Virtual Aquarium', 'fishfinder': 'Fish Finder', 'ontarget': 'On Target',
  'brickbreaker': 'Brick Breaker', 'run': 'Run', 'browser': 'WikiBrowser',
  'notepad': 'Notepad', 'calculator': 'Calculator', 'calendar': 'Calendar',
  'timezone': 'Time Zone', 'weather': 'Weather', 'diskusage': 'Disk Usage',
  'visitormap': 'Visitor Map', 'help': 'Help', 'paint': 'Paint',
  'search': 'Search Results', 'taskmanager': 'Task Manager'
};

function padTwo(n) { return n < 10 ? '0' + n : String(n); }

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
  'C:\\mpOS\\Documents': {
    items: FOLDER_ITEMS.documents
  },
  'C:\\mpOS\\Utilities': { items: FOLDER_ITEMS.utilities }
};

/* ── Command help groups ── */
const HELP_GROUPS = {
  'NAVIGATION': ['cd', 'dir', 'ls', 'tree'],
  'FILES':      ['type', 'echo'],
  'SYSTEM':     ['systeminfo', 'whoami', 'hostname', 'ver', 'date', 'time', 'tasklist', 'taskkill'],
  'PROGRAMS':   [],
  'TERMINAL':   ['cls', 'color', 'title', 'start', 'ping', 'matrix', 'help', 'exit']
};

const COMMANDS = {
  'help':        { run: cmdHelp,        desc: 'List available commands' },
  'cd':          { run: cmdCd,          desc: 'Change directory' },
  'ls':          { run: cmdLs,          desc: 'List directory contents' },
  'dir':         { run: cmdDir,         desc: 'Detailed directory listing' },
  'echo':        { run: cmdEcho,        desc: 'Display a message' },
  'date':        { run: cmdDate,        desc: 'Display the current date' },
  'time':        { run: cmdTime,        desc: 'Display the current time' },
  'type':        { run: cmdType,        desc: 'Display the contents of a file' },
  'tree':        { run: cmdTree,        desc: 'Display directory structure' },
  'whoami':      { run: cmdWhoami,      desc: 'Display current user' },
  'hostname':    { run: cmdHostname,    desc: 'Display computer name' },
  'systeminfo':  { run: cmdSysteminfo,  desc: 'Display system information' },
  'ping':        { run: cmdPing,        desc: 'Simulate a ping to a host' },
  'color':       { run: cmdColor,       desc: 'Set terminal colors' },
  'title':       { run: cmdTitle,       desc: 'Set terminal window title' },
  'tasklist':    { run: cmdTasklist,     desc: 'List running applications' },
  'taskkill':    { run: cmdTaskkill,     desc: 'Close a running application' },
  'start':       { run: cmdStart,        desc: 'Launch an application' },
  'ontarget':    { run: openOnTarget,    desc: 'Launch On Target' },
  'fishofday':   { run: openFishOfDay,   desc: 'Launch Fish of the Day' },
  'fishfinder':  { run: openFishFinder,  desc: 'Launch Fish Finder' },
  'aquarium':    { run: openAquarium,    desc: 'Launch Virtual Aquarium' },
  'browser':     { run: openBrowser,     desc: 'Launch WikiBrowser' },
  'mycomputer':  { run: function () { openMyComputer(); }, desc: 'Open System Properties' },
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
  'exit':        { run: function () { closeRun(); }, desc: 'Close this window' },
  'ver':         { run: cmdVer,          desc: 'Show version' },
  'matrix':      { run: cmdMatrix,       desc: 'Toggle matrix animation' },
  'taskmanager': { run: openTaskManager, desc: 'Open Task Manager' },
  'search':      { run: openSearch,      desc: 'Open Search Results' }
};

function termPrint(text, color) {
  const span = document.createElement('span');
  span.textContent = text + '\n';
  if (color) span.style.color = color;
  termOutput.appendChild(span);
  termOutput.scrollTop = termOutput.scrollHeight;
}

function cmdHelp() {
  termPrint('');
  const grouped = {};
  Object.keys(HELP_GROUPS).forEach(function (g) { grouped[g] = []; });
  grouped['PROGRAMS'] = [];

  /* Assign every command (except 'clear') to a group */
  const assigned = {};
  Object.keys(HELP_GROUPS).forEach(function (g) {
    HELP_GROUPS[g].forEach(function (c) { assigned[c] = g; });
  });
  Object.keys(COMMANDS).forEach(function (name) {
    if (name === 'clear') return;
    let group = assigned[name];
    if (!group) group = 'PROGRAMS';
    grouped[group].push(name);
  });

  Object.keys(grouped).forEach(function (g) {
    if (grouped[g].length === 0) return;
    termPrint(' ' + g, '#ffffff');
    grouped[g].forEach(function (name) {
      termPrint('  ' + name.toUpperCase().padEnd(16) + COMMANDS[name].desc);
    });
    termPrint('');
  });
}

function cmdCls() {
  stopMatrix();
  termOutput.textContent = '';
}

function cmdVer() { termPrint('mpOS [Version 1.8.4]\n(c) Matthew Pritchard. All rights reserved.\n'); }

function cmdCd(args) {
  if (!args) { termPrint(termCwd + '\n'); return; }
  let target = args.trim();
  let newPath;
  if (target === '\\' || target === '/') {
    newPath = 'C:\\mpOS';
  } else if (target === '..') {
    if (termCwd !== 'C:\\mpOS') {
      let parts = termCwd.split('\\');
      parts.pop();
      newPath = parts.join('\\');
    } else {
      newPath = 'C:\\mpOS';
    }
  } else if (target.match(/^[Cc]:\\/i)) {
    let normalized = target.replace(/\//g, '\\');
    let fsKeys = Object.keys(FILESYSTEM);
    let found = fsKeys.find(function (k) {
      return k.toLowerCase() === normalized.toLowerCase();
    });
    newPath = found || normalized;
  } else {
    let cur = FILESYSTEM[termCwd];
    if (cur && cur.children) {
      let match = cur.children.find(function (c) {
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
  let cur = FILESYSTEM[termCwd];
  if (!cur) { termPrint('Error reading directory.\n'); return; }
  termPrint('');
  termPrint(' Directory of ' + termCwd);
  termPrint('');
  if (cur.children) {
    cur.children.forEach(function (c) {
      termPrint('  <DIR>    ' + c);
    });
  }
  if (cur.items && cur.items.length > 0) {
    cur.items.forEach(function (item) {
      termPrint('           ' + item.name);
    });
  }
  if (cur.files && cur.files.length > 0) {
    cur.files.forEach(function (f) {
      termPrint('           ' + f.name);
    });
  }
  if (!cur.children && (!cur.items || cur.items.length === 0) && (!cur.files || cur.files.length === 0)) {
    termPrint('  Directory is empty.');
  }
  termPrint('');
}

function cmdDir() {
  let cur = FILESYSTEM[termCwd];
  if (!cur) { termPrint('Error reading directory.\n'); return; }
  let now = new Date();
  let dateStr = padTwo(now.getMonth() + 1) + '/' + padTwo(now.getDate()) + '/' + now.getFullYear();
  let timeStr = padTwo(now.getHours()) + ':' + padTwo(now.getMinutes());
  let dirCount = 0;
  let fileCount = 0;
  let totalSize = 0;

  termPrint('');
  termPrint(' Volume in drive C is mpOS');
  termPrint(' Volume Serial Number is 4D50-4F53');
  termPrint('');
  termPrint(' Directory of ' + termCwd);
  termPrint('');

  if (termCwd !== 'C:\\mpOS') {
    termPrint(dateStr + '  ' + timeStr + '    <DIR>          .');
    termPrint(dateStr + '  ' + timeStr + '    <DIR>          ..');
    dirCount += 2;
  }

  if (cur.children) {
    cur.children.forEach(function (c) {
      termPrint(dateStr + '  ' + timeStr + '    <DIR>          ' + c);
      dirCount++;
    });
  }

  if (cur.files) {
    cur.files.forEach(function (f) {
      let sizeStr = String(f.size).padStart(14, ' ');
      termPrint(dateStr + '  ' + timeStr + '    ' + sizeStr + ' ' + f.name);
      fileCount++;
      totalSize += f.size;
    });
  }

  if (cur.items) {
    cur.items.forEach(function (item) {
      let lnkName = item.name + '.lnk';
      let size = 1024;
      let sizeStr = String(size).padStart(14, ' ');
      termPrint(dateStr + '  ' + timeStr + '    ' + sizeStr + ' ' + lnkName);
      fileCount++;
      totalSize += size;
    });
  }

  termPrint(String(fileCount).padStart(16, ' ') + ' File(s)  ' + String(totalSize).padStart(14, ' ') + ' bytes');
  termPrint(String(dirCount).padStart(16, ' ') + ' Dir(s)   2,147,483,648 bytes free');
  termPrint('');
}

function cmdEcho(args) {
  if (!args || !args.trim()) {
    termPrint('ECHO is on.');
  } else {
    termPrint(args);
  }
}

function cmdDate() {
  let now = new Date();
  let days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  termPrint('The current date is: ' + days[now.getDay()] + ' ' +
    padTwo(now.getMonth() + 1) + '/' + padTwo(now.getDate()) + '/' + now.getFullYear());
}

function cmdTime() {
  let now = new Date();
  let ms = String(now.getMilliseconds()).padStart(3, '0').substring(0, 2);
  termPrint('The current time is: ' + padTwo(now.getHours()) + ':' +
    padTwo(now.getMinutes()) + ':' + padTwo(now.getSeconds()) + '.' + ms);
}

function cmdType(args) {
  if (!args || !args.trim()) {
    termPrint('The syntax of the command is incorrect.');
    return;
  }
  let filename = args.trim();
  let cur = FILESYSTEM[termCwd];
  if (!cur || !cur.files) {
    termPrint('The system cannot find the file specified.');
    return;
  }
  let file = cur.files.find(function (f) {
    return f.name.toLowerCase() === filename.toLowerCase();
  });
  if (!file) {
    termPrint('The system cannot find the file specified.');
    return;
  }
  termPrint(file.content);
}

function cmdTree() {
  termPrint('Folder PATH listing for volume mpOS');
  termPrint('Volume serial number is 4D50-4F53');

  function printTree(path, prefix, isLast) {
    let name = path.split('\\').pop();
    let connector = isLast ? '\\---' : '+---';
    if (prefix === '') {
      termPrint(path);
    } else {
      termPrint(prefix + connector + name);
    }
    let node = FILESYSTEM[path];
    if (node && node.children) {
      let newPrefix = prefix === '' ? '' : prefix + (isLast ? '    ' : '|   ');
      node.children.forEach(function (child, i) {
        let childPath = path + '\\' + child;
        let last = i === node.children.length - 1;
        printTree(childPath, newPrefix, last);
      });
    }
  }

  printTree('C:\\mpOS', '', false);
  termPrint('');
}

function cmdWhoami() { termPrint('mpos\\matthew'); }

function cmdHostname() { termPrint('MPOS-PC'); }

function cmdSysteminfo() {
  let nav = navigator;
  let scr = screen;
  let conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  termPrint('');
  termPrint('Host Name:              MPOS-PC', '#ffffff');
  termPrint('OS Name:                mpOS');
  termPrint('OS Version:             1.4.9');

  let browser = 'Unknown';
  let ua = nav.userAgent;
  if (ua.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
  else if (ua.indexOf('Edg/') !== -1) browser = 'Microsoft Edge';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Google Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Apple Safari';
  termPrint('Browser:                ' + browser);

  termPrint('System Locale:          ' + (nav.language || 'unknown'));
  termPrint('Processors:             ' + (nav.hardwareConcurrency || 'unknown'));
  termPrint('Display:                ' + scr.width + 'x' + scr.height +
    ' (' + devicePixelRatio + 'x DPR)');

  if (conn) {
    let netType = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Unknown';
    let downlink = conn.downlink != null ? conn.downlink + ' Mbps' : 'unknown';
    termPrint('Network Type:           ' + netType);
    termPrint('Downlink:               ' + downlink);
  }

  termPrint('Time Zone:              ' + Intl.DateTimeFormat().resolvedOptions().timeZone);
  termPrint('System Up Time:         ' + Math.floor(performance.now() / 1000) + ' seconds');
  termPrint('');
}

function cmdPing(args) {
  if (!args || !args.trim()) {
    termPrint('Usage: ping <hostname>');
    return;
  }
  let host = args.trim();
  termPrint('');
  termPrint('Pinging ' + host + ' with 32 bytes of data:');

  let count = 0;
  let times = [];
  termInput.disabled = true;

  function sendPing() {
    if (count >= 4) {
      termPrint('');
      termPrint('Ping statistics for ' + host + ':');
      let min = Math.min.apply(null, times);
      let max = Math.max.apply(null, times);
      let avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
      termPrint('    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),');
      termPrint('Approximate round trip times in milli-seconds:');
      termPrint('    Minimum = ' + min + 'ms, Maximum = ' + max + 'ms, Average = ' + avg + 'ms');
      termPrint('');
      termInput.disabled = false;
      termInput.focus();
      return;
    }
    let ms = Math.floor(Math.random() * 40) + 10;
    times.push(ms);
    count++;
    termPrint('Reply from ' + host + ': bytes=32 time=' + ms + 'ms TTL=128');
    setTimeout(sendPing, 800 + Math.floor(Math.random() * 400));
  }

  setTimeout(sendPing, 500);
}

function cmdColor(args) {
  let term = document.querySelector('#run .term');
  if (!args || !args.trim()) {
    termPrint('Sets the default console foreground and background colors.\n');
    termPrint('COLOR [attr]\n');
    termPrint('  attr  Specifies color attribute of console output (two hex digits)');
    termPrint('        First digit = background, Second digit = foreground\n');
    termPrint('  0 = Black       8 = Gray');
    termPrint('  1 = Blue        9 = Light Blue');
    termPrint('  2 = Green       A = Light Green');
    termPrint('  3 = Aqua        B = Light Aqua');
    termPrint('  4 = Red         C = Light Red');
    termPrint('  5 = Purple      D = Light Purple');
    termPrint('  6 = Yellow      E = Light Yellow');
    termPrint('  7 = White       F = Bright White');
    return;
  }
  let attr = args.trim().toLowerCase();
  if (attr.length === 1) attr = '0' + attr;
  if (attr.length !== 2 || !COLOR_TABLE[attr[0]] || !COLOR_TABLE[attr[1]]) {
    termPrint('Invalid color attribute.');
    return;
  }
  if (attr[0] === attr[1]) {
    termPrint('The foreground and background colors cannot be the same.');
    return;
  }
  term.style.backgroundColor = COLOR_TABLE[attr[0]];
  term.style.color = COLOR_TABLE[attr[1]];
}

function cmdTitle(args) {
  let titleSpan = document.querySelector('#run .titlebar span');
  if (!args || !args.trim()) {
    termPrint('Sets the window title.\n');
    termPrint('TITLE [string]');
    return;
  }
  titleSpan.textContent = args.trim();
}

function cmdTasklist() {
  termPrint('');
  termPrint('Image Name'.padEnd(28) + 'PID'.padEnd(10) + 'Status');
  termPrint('='.repeat(27) + ' ' + '='.repeat(9) + ' ' + '='.repeat(10));

  let pid = 1000;
  Object.keys(WINDOW_NAMES).forEach(function (id) {
    let win = document.getElementById(id);
    if (win && win.style.display !== 'none') {
      let name = (WINDOW_NAMES[id] + '.exe').padEnd(28);
      let pidStr = String(pid).padEnd(10);
      termPrint(name + pidStr + 'Running');
      pid += 4;
    }
  });
  termPrint('');
}

function cmdTaskkill(args) {
  if (!args || !args.trim()) {
    termPrint('Usage: taskkill <appname>');
    return;
  }
  let target = args.trim().toLowerCase().replace(/\.exe$/, '');
  let found = false;

  Object.keys(WINDOW_NAMES).forEach(function (id) {
    if (found) return;
    let name = WINDOW_NAMES[id].toLowerCase();
    if (name === target || id === target) {
      let win = document.getElementById(id);
      if (win && win.style.display !== 'none') {
        if (id === 'mycomputer') closeMyComputer();
        else bbTaskbar.closeWindow(id);
        termPrint('SUCCESS: Sent termination signal to "' + WINDOW_NAMES[id] + '.exe".');
        found = true;
      }
    }
  });

  if (!found) {
    termPrint('ERROR: The process "' + args.trim() + '" not found.');
  }
}

function cmdStart(args) {
  if (!args || !args.trim()) {
    termPrint('Usage: start <command>');
    return;
  }
  let name = args.trim().toLowerCase();
  if (COMMANDS[name]) {
    COMMANDS[name].run('');
    termPrint('Started "' + name + '".');
  } else {
    termPrint("'" + name + "' is not recognized as a launchable program.");
  }
}

function openRun() {
  openWindow('run');
  termOutput.textContent = '';
  termCwd = 'C:\\mpOS';
  let term = document.querySelector('#run .term');
  term.style.backgroundColor = '';
  term.style.color = '';
  document.querySelector('#run .titlebar span').textContent = 'Run';
  document.querySelector('#run .term-prompt').textContent = 'C:\\mpOS> ';
  termHistory = [];
  termHistoryIndex = -1;
  termSavedInput = '';
  tabMatches = [];
  tabIndex = -1;
  cmdVer();
  termPrint('Type HELP for a list of available commands.\n');
  termInput.value = '';
  termInput.disabled = false;
  setTimeout(function () { termInput.focus(); }, 100);
}

function closeRun() {
  stopMatrix();
  termOutput.textContent = '';
  let term = document.querySelector('#run .term');
  term.style.backgroundColor = '';
  term.style.color = '';
  document.querySelector('#run .titlebar span').textContent = 'Run';
  document.querySelector('#run .term-prompt').textContent = 'C:\\mpOS> ';
  termCwd = 'C:\\mpOS';
  termHistory = [];
  termHistoryIndex = -1;
  termSavedInput = '';
  tabMatches = [];
  tabIndex = -1;
  termInput.disabled = false;
  bbTaskbar.closeWindow('run');
}

let matrixInterval = null;
function cmdMatrix() {
  let term = document.querySelector('#run .term');
  let existing = term.querySelector('.matrix-canvas');
  if (existing) { stopMatrix(); return; }
  let canvas = document.createElement('canvas');
  canvas.className = 'matrix-canvas';
  canvas.width = term.offsetWidth;
  canvas.height = term.offsetHeight;
  term.appendChild(canvas);
  let ctx = canvas.getContext('2d');
  let fontSize = 14;
  let cols = Math.floor(canvas.width / fontSize);
  let drops = [];
  for (let i = 0; i < cols; i++) drops[i] = Math.random() * -20 | 0;
  matrixInterval = setInterval(function () {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = fontSize + 'px monospace';
    for (let i = 0; i < cols; i++) {
      let ch = Math.random() > 0.5 ? '1' : '0';
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }, 50);
  canvas.addEventListener('click', stopMatrix);
}

function stopMatrix() {
  if (matrixInterval) { clearInterval(matrixInterval); matrixInterval = null; }
  let c = document.querySelector('#run .matrix-canvas');
  if (c) c.remove();
}

termInput.addEventListener('keydown', function (e) {
  /* Reset tab state on any key except Tab */
  if (e.key !== 'Tab') {
    tabMatches = [];
    tabIndex = -1;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (termHistory.length === 0) return;
    if (termHistoryIndex === -1) {
      termSavedInput = termInput.value;
      termHistoryIndex = termHistory.length - 1;
    } else if (termHistoryIndex > 0) {
      termHistoryIndex--;
    }
    termInput.value = termHistory[termHistoryIndex];
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (termHistoryIndex === -1) return;
    if (termHistoryIndex < termHistory.length - 1) {
      termHistoryIndex++;
      termInput.value = termHistory[termHistoryIndex];
    } else {
      termHistoryIndex = -1;
      termInput.value = termSavedInput;
    }
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    let val = termInput.value;

    if (tabMatches.length === 0) {
      /* Build match list */
      let prefix = val.toLowerCase();
      let matches = [];

      /* Command names */
      Object.keys(COMMANDS).forEach(function (name) {
        if (name === 'clear') return;
        if (name.indexOf(prefix) === 0) matches.push(name);
      });

      /* Current dir entries */
      let cur = FILESYSTEM[termCwd];
      if (cur) {
        if (cur.children) {
          cur.children.forEach(function (c) {
            if (c.toLowerCase().indexOf(prefix) === 0) matches.push(c);
          });
        }
        if (cur.items) {
          cur.items.forEach(function (item) {
            if (item.name.toLowerCase().indexOf(prefix) === 0) matches.push(item.name);
          });
        }
        if (cur.files) {
          cur.files.forEach(function (f) {
            if (f.name.toLowerCase().indexOf(prefix) === 0) matches.push(f.name);
          });
        }
      }

      if (matches.length === 0) return;
      tabMatches = matches;
      tabIndex = 0;
    } else {
      tabIndex = (tabIndex + 1) % tabMatches.length;
    }

    termInput.value = tabMatches[tabIndex];
    return;
  }

  if (e.key !== 'Enter') return;
  let raw = termInput.value.trim();
  termInput.value = '';
  termPrint(termCwd + '> ' + raw);
  if (!raw) return;

  /* Push to history */
  if (termHistory.length === 0 || termHistory[termHistory.length - 1] !== raw) {
    termHistory.push(raw);
  }
  termHistoryIndex = -1;
  termSavedInput = '';

  let parts = raw.match(/^(\S+)\s*(.*)?$/);
  let cmd = parts[1].toLowerCase();
  let args = parts[2] || '';
  if (COMMANDS[cmd]) {
    COMMANDS[cmd].run(args);
  } else {
    /* Try local item execution in current directory */
    let cur = FILESYSTEM[termCwd];
    let localItem = null;
    if (cur && cur.items) {
      let input = raw.toLowerCase();
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
    { name: 'Help', action: openHelp },
    { name: 'Search', action: openSearch }
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
window.closeMyComputer = closeMyComputer;
window.mcSwitchTab = mcSwitchTab;
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
window.calcToggleScientific = calcToggleScientific;
window.calcSciFn = calcSciFn;
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
window.closeRun = closeRun;
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
window.openSearch = openSearch;
window.searchNow = searchNow;
window.openTaskManager = openTaskManager;
window.closeTaskManager = closeTaskManager;

/* ── Ctrl+Alt+Del → Task Manager ── */
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Escape')) {
    e.preventDefault();
    openTaskManager();
  }
});

/* ── System Properties: idle listeners + load saved settings ── */
document.addEventListener('mousemove', ssRecordActivity);
document.addEventListener('keydown', ssRecordActivity);
document.addEventListener('click', ssRecordActivity);
document.addEventListener('touchstart', ssRecordActivity);
window.addEventListener('resize', function () {
  if (displaySettings.wallpaper !== 'none') applyDisplaySettings();
});
mcLoadSettings();

})();
