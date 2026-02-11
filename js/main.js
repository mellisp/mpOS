/* Main application logic — mpOS */
(function () {

/* ── Shared helpers ── */
var GEO_ERRORS = {
  1: 'Location access was denied.',
  2: 'Location information is unavailable.',
  3: 'Location request timed out.'
};

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
  body.innerHTML =
    '<div style="padding:16px;">' +
      '<div class="error-row">' +
        alertTriangleSVG(gradientId) +
        '<div class="error-text">' + msg + '</div>' +
      '</div>' +
    '</div>';
}

/* ── Cached DOM refs ── */
var calcDisplay = document.getElementById('calcDisplay');
var notepadEditor = document.getElementById('notepadEditor');
var notepadStatus = document.getElementById('notepadStatus');
var notepadTitle = document.getElementById('notepadTitle');
var notepadCurrentFile = null;
var notepadDirty = false;

function openWindow(id) {
  var win = document.getElementById(id);
  if (!win || win.style.display !== 'none') return;
  win.style.display = '';
  win.classList.add('restoring');
  win.addEventListener('animationend', function handler() {
    win.classList.remove('restoring');
    win.removeEventListener('animationend', handler);
  });
}

function closeStartMenu() {
  var m = document.querySelector('.start-menu');
  var b = document.querySelector('.start-btn');
  if (m) m.classList.remove('open');
  if (b) b.classList.remove('pressed');
}

/* ── Explorer / Folder Browser ── */
var explorerCurrentFolder = 'all';
var explorerCurrentView = 'list';

var FOLDER_ITEMS = {
  programs: [
    { name: 'WikiBrowser', desc: 'Browse Wikipedia from within mpOS.', tag: 'HTML', action: 'openBrowser()' },
    { name: 'Fish of the Day', desc: 'A new fish every day, powered by Wikipedia.', tag: 'HTML', action: 'openFishOfDay()' },
    { name: 'Fish Finder', desc: 'Find the closest aquarium near you.', tag: 'HTML', action: 'openFishFinder()' },
    { name: 'On Target', desc: 'A two-player target shooting game.', tag: 'HTML', action: 'openOnTarget()' },
    { name: 'Virtual Aquarium', desc: 'Watch real fish, in real-time.', tag: 'HTML', action: 'openAquarium()' },
    { name: 'Chicken Fingers', desc: 'A two-player touch game.', tag: 'HTML', action: 'openChickenFingers()', href: 'chicken-fingers.html' }
  ],
  documents: [],
  utilities: [
    { name: 'Notepad', desc: 'A simple text editor with save and load.', tag: 'HTML', action: 'openNotepad()' },
    { name: 'Calculator', desc: 'Basic arithmetic calculator.', tag: 'HTML', action: 'openCalculator()' },
    { name: 'Calendar', desc: 'Monthly calendar viewer.', tag: 'HTML', action: 'openCalendar()' },
    { name: 'Time Zone', desc: 'World clocks for 8 cities.', tag: 'HTML', action: 'openTimeZone()' },
    { name: 'Weather', desc: 'Three-day forecast for your location.', tag: 'API', action: 'openWeather()' }
  ]
};

var FOLDER_NAMES = {
  all: { title: 'Applications', address: 'C:\\mpOS' },
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

  var items = document.querySelectorAll('#explorer .tree-item');
  var folderIndex = { all: 0, programs: 1, documents: 2, utilities: 3 };
  items.forEach(function (el, i) {
    el.classList.toggle('active', i === folderIndex[folder]);
  });

  renderExplorerContent();
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
    body.innerHTML = '<div class="folder-empty">This folder is empty.</div>';
    status.textContent = '0 item(s)';
    return;
  }

  status.textContent = items.length + ' item(s)';

  if (explorerCurrentView === 'icon') {
    var html = '<div class="folder-icon-view">';
    items.forEach(function (item) {
      var dblAction = item.href
        ? 'if(' + item.action + ')location.href=&quot;' + item.href + '&quot;'
        : item.action;
      html += '<div class="folder-icon-tile" ondblclick="' + dblAction + '">';
      html += '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' + getItemIcon(item.name) + '</svg>';
      html += '<span class="folder-icon-label">' + item.name + '</span>';
      html += '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
  } else {
    var html = '<div class="folder-list-view">';
    items.forEach(function (item) {
      var dblAction = item.href
        ? 'if(' + item.action + ')location.href=&quot;' + item.href + '&quot;'
        : item.action;
      html += '<div class="folder-list-item" ondblclick="' + dblAction + '">';
      html += '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">' + getItemIcon(item.name) + '</svg>';
      html += '<span class="folder-list-name">' + item.name + '</span>';
      html += '<span class="folder-list-desc">' + item.desc + '</span>';
      html += '<span class="tag">' + item.tag + '</span>';
      html += '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
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
    'Weather': '<defs><radialGradient id="ei-we" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#fffde0"/><stop offset="100%" stop-color="#f9a825"/></radialGradient></defs><circle cx="7" cy="6" r="4" fill="url(#ei-we)" stroke="#c49000" stroke-width="0.8"/><path d="M5 16 Q5 13 8 13 Q8.5 11 11 11 Q14 11 14.5 13 Q17 13 17 15 Q17 17 15 17 L7 17 Q5 17 5 16Z" fill="#e8e4dc" stroke="#8a8680" stroke-width="0.7"/>'
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
var aquariumPlayer = null;
var aquariumTimer = null;

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

function openFishOfDay() {
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
    if (!valid.length) return '';
    var html = '<div class="section-title">' + title + '</div><div class="sunken"><table class="sysinfo-table">';
    valid.forEach(function (r) {
      html += '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>';
    });
    return html + '</table></div>';
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

  var html = '<div class="sysinfo-hero">';
  html += '<svg width="80" height="80" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">';
  html += '<defs><linearGradient id="si-body" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#d0e8ff"/><stop offset="25%" stop-color="#6aafe0"/><stop offset="60%" stop-color="#3a7ab0"/><stop offset="100%" stop-color="#1a4a6e"/></linearGradient>';
  html += '<linearGradient id="si-screen" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0%" stop-color="#e8f4ff"/><stop offset="30%" stop-color="#c0ddf0"/><stop offset="70%" stop-color="#90bce0"/><stop offset="100%" stop-color="#6898c0"/></linearGradient>';
  html += '<linearGradient id="si-bezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b8d0e0"/><stop offset="100%" stop-color="#7a9ab8"/></linearGradient>';
  html += '<linearGradient id="si-stand" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0ece4"/><stop offset="50%" stop-color="#d4d0c8"/><stop offset="100%" stop-color="#a0a098"/></linearGradient>';
  html += '<linearGradient id="si-base" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0ece4"/><stop offset="40%" stop-color="#d4d0c8"/><stop offset="100%" stop-color="#a0a098"/></linearGradient></defs>';
  html += '<ellipse cx="24" cy="43" rx="16" ry="2" fill="#00000020"/>';
  html += '<rect x="4" y="4" width="40" height="28" rx="3" fill="url(#si-body)" stroke="#1a4a6e" stroke-width="1.5"/>';
  html += '<line x1="6" y1="5" x2="42" y2="5" stroke="white" stroke-width="0.8" opacity="0.5" stroke-linecap="round"/>';
  html += '<line x1="5" y1="6" x2="5" y2="30" stroke="white" stroke-width="0.6" opacity="0.3"/>';
  html += '<ellipse cx="18" cy="10" rx="14" ry="6" fill="white" opacity="0.35"/>';
  html += '<rect x="7" y="7" width="34" height="22" rx="1.5" fill="url(#si-bezel)" stroke="#1a4a6e" stroke-width="0.5"/>';
  html += '<rect x="8" y="8" width="32" height="20" rx="1" fill="url(#si-screen)"/>';
  html += '<ellipse cx="18" cy="14" rx="12" ry="7" fill="white" opacity="0.15"/>';
  html += '<rect x="18" y="34" width="12" height="4" rx="1" fill="url(#si-stand)" stroke="#8a8680" stroke-width="0.75"/>';
  html += '<line x1="19" y1="34.5" x2="29" y2="34.5" stroke="white" stroke-width="0.5" opacity="0.4"/>';
  html += '<rect x="11" y="38" width="26" height="3" rx="1.5" fill="url(#si-base)" stroke="#8a8680" stroke-width="0.75"/>';
  html += '<line x1="12" y1="38.5" x2="36" y2="38.5" stroke="white" stroke-width="0.5" opacity="0.5"/>';
  html += '</svg>';
  if (os) html += '<div class="sysinfo-os">' + os + '</div>';
  if (browser) html += '<div class="sysinfo-browser">' + browser + '</div>';
  html += '</div><div class="separator"></div>';

  html += makeSection('System', [
    ['CPU Cores', nav.hardwareConcurrency ? nav.hardwareConcurrency + ' logical processors' : null],
    ['Language', nav.language || null]
  ]);

  var dpr = window.devicePixelRatio || 1;
  html += makeSection('Display', [
    ['Resolution', scr.width + ' \u00d7 ' + scr.height],
    ['Pixel Ratio', dpr + 'x' + (dpr > 1 ? ' (HiDPI)' : '')]
  ]);

  html += '<div id="sysNetSection"></div>';
  html += '<div id="sysBatSection"></div>';

  body.innerHTML = html;

  var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn) {
    var netRows = [];
    if (conn.effectiveType) netRows.push(['Type', conn.effectiveType.toUpperCase()]);
    else if (conn.type) netRows.push(['Type', conn.type]);
    if (conn.downlink) netRows.push(['Downlink', conn.downlink + ' Mbps']);
    document.getElementById('sysNetSection').innerHTML = makeSection('Network', netRows);
  }

  if (nav.getBattery) {
    nav.getBattery().then(function (bat) {
      document.getElementById('sysBatSection').innerHTML = makeSection('Battery', [
        ['Level', Math.round(bat.level * 100) + '%'],
        ['Charging', bat.charging ? 'Yes' : 'No']
      ]);
    });
  }
}

/* ── Fish of the Day ── */
var fishPopulated = false;
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
    fishName.style.cursor = 'pointer';
    fishName.style.color = 'var(--link)';
    fishName.title = 'Open in WikiBrowser';
    fishName.onclick = function () {
      openBrowser();
      browserNavigate('https://en.m.wikipedia.org/wiki/' + encodeURIComponent(title));
    };
  }

  var imgKey = "fotd-img-" + todayKey();
  var wikiLinkKey = "fotd-wiki-" + todayKey();

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
  } else if (localStorage.getItem(imgKey)) {
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
    fishPhoto.src = src;
    fishPhoto.onload = function () {
      fishPhoto.style.display = "block";
      photoPlaceholder.style.display = "none";
    };
    fishPhoto.onerror = function () {
      photoPlaceholder.textContent = "Photo unavailable";
    };
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

function populateFishFinder() {
  var body = document.getElementById('fishFinderBody');
  var status = document.getElementById('fishFinderStatus');

  body.innerHTML = '<div style="padding:16px;font-size:12px;color:#57606a;">Locating you...</div>';
  status.textContent = '';

  if (!navigator.geolocation) {
    showErrorPanel(body, 'Geolocation is not supported by your browser.', 'al-tri-ff');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;
      var nearest = null, furthest = null;
      var minDist = Infinity, maxDist = -1;

      for (var i = 0; i < AQUARIUMS.length; i++) {
        var d = haversineDistance(lat, lon, AQUARIUMS[i][2], AQUARIUMS[i][3]);
        if (d < minDist) { minDist = d; nearest = AQUARIUMS[i]; }
        if (d > maxDist) { maxDist = d; furthest = AQUARIUMS[i]; }
      }

      function finderCard(aq, dist) {
        var name = aq[4] ? '<a href="' + aq[4] + '" target="_blank" rel="noopener" style="color:var(--link);text-decoration:none;">' + aq[0] + '</a>' : aq[0];
        var meta = aq[1];
        if (aq[5]) meta += ' &middot; Est. ' + aq[5];
        return '<div class="sunken" style="padding:10px;margin-bottom:10px;">' +
          '<div class="finder-name">' + name + '</div>' +
          '<div class="finder-location">' + meta + '</div>' +
          '<div class="finder-distance">' + formatFinderDistance(dist) + '</div>' +
        '</div>';
      }

      body.innerHTML =
        '<div style="padding:10px;">' +
          '<div class="finder-label">Nearest Aquarium</div>' +
          finderCard(nearest, minDist) +
          '<div class="finder-label">Furthest Aquarium</div>' +
          finderCard(furthest, maxDist) +
        '</div>';

      status.textContent = AQUARIUMS.length + ' aquariums in database';
    },
    function (err) {
      showErrorPanel(body, GEO_ERRORS[err.code] || 'An unknown error occurred.', 'al-tri-ff');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

/* ── WikiBrowser ── */
var BROWSER_HOME = 'https://en.m.wikipedia.org/wiki/Main_Page';
var browserFrame = document.getElementById('browserFrame');
var browserUrl = document.getElementById('browserUrl');
var browserTitle = document.getElementById('browserTitle');

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
  if (/^https?:\/\/[a-z]+\.(?:m\.)?wikipedia\.org\//i.test(query)) {
    url = query;
  } else {
    url = 'https://en.m.wikipedia.org/wiki/Special:Search/' + encodeURIComponent(query);
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

function notepadEscHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function notepadEscAttr(str) {
  return notepadEscHtml(str.replace(/\\/g, '\\\\').replace(/'/g, "\\'"));
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
  var defaultName = notepadCurrentFile || '';
  var html =
    '<label>File name:</label>' +
    '<input type="text" id="notepadSaveAsInput" value="' + notepadEscHtml(defaultName) + '">' +
    '<div style="flex:1"></div>' +
    '<div class="button-row">' +
      '<button class="btn" onclick="notepadSaveAs(document.getElementById(\'notepadSaveAsInput\').value)">Save</button>&nbsp;' +
      '<button class="btn" onclick="notepadDismissDialog()">Cancel</button>' +
    '</div>';
  var d = document.createElement('div');
  d.className = 'notepad-dialog';
  d.innerHTML = html;
  document.querySelector('#notepad .window-body').appendChild(d);
  var inp = document.getElementById('notepadSaveAsInput');
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
  var listHtml;
  if (names.length === 0) {
    listHtml = '<div class="notepad-empty">No saved files.</div>';
  } else {
    listHtml = names.map(function (n) {
      var safe = notepadEscAttr(n);
      return '<div class="notepad-file-item">' +
        '<span onclick="notepadOpenFile(\'' + safe + '\')">' + notepadEscHtml(n) + '</span>' +
        '<button class="btn" onclick="event.stopPropagation();notepadDeleteFile(\'' + safe + '\')">Del</button>' +
      '</div>';
    }).join('');
  }
  var html =
    '<label>Open a file:</label>' +
    '<div class="notepad-file-list">' + listHtml + '</div>' +
    '<div class="button-row">' +
      '<button class="btn" onclick="notepadDismissDialog()">Cancel</button>' +
    '</div>';
  var d = document.createElement('div');
  d.className = 'notepad-dialog';
  d.innerHTML = html;
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
var calcCurrent = '0';
var calcPrev = null;
var calcOperation = null;
var calcReset = false;

function openCalculator() { openWindow('calculator'); }

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
var calYear, calMonth, calTitleEl, calGridEl;

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

function calendarRender() {
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  calTitleEl.textContent = months[calMonth] + ' ' + calYear;

  var html = '';
  var days = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  for (var i = 0; i < 7; i++) {
    html += '<div class="cal-day-header">' + days[i] + '</div>';
  }

  var firstOfMonth = new Date(calYear, calMonth, 1);
  var dow = firstOfMonth.getDay();
  // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
  var startOffset = (dow + 6) % 7;
  var startDate = new Date(calYear, calMonth, 1 - startOffset);

  var today = new Date();
  var todayStr = today.getFullYear() + '-' + today.getMonth() + '-' + today.getDate();

  for (var r = 0; r < 6; r++) {
    for (var c = 0; c < 7; c++) {
      var d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + r * 7 + c);
      var cls = 'cal-day';
      if (d.getMonth() !== calMonth) cls += ' other-month';
      if (d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate() === todayStr) cls += ' today';
      html += '<div class="' + cls + '">' + d.getDate() + '</div>';
    }
  }

  calGridEl.innerHTML = html;
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
var TZ_CITIES = [
  { city: 'London',      zone: 'Europe/London' },
  { city: 'New York',    zone: 'America/New_York' },
  { city: 'Los Angeles', zone: 'America/Los_Angeles' },
  { city: 'Tokyo',       zone: 'Asia/Tokyo' },
  { city: 'Sydney',      zone: 'Australia/Sydney' },
  { city: 'Dubai',       zone: 'Asia/Dubai' },
  { city: 'Paris',       zone: 'Europe/Paris' },
  { city: 'Singapore',   zone: 'Asia/Singapore' }
];

var tzGridEl = null;
var tzAnalog = true;
var tzTimer = null;
var tzBuilt = false;

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
  var html = '';
  for (var i = 0; i < TZ_CITIES.length; i++) {
    var c = TZ_CITIES[i];
    html += '<div class="tz-tile">';
    html += '<div class="tz-clock-face">';
    html += '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">';
    html += '<circle cx="32" cy="32" r="30" fill="#fff" stroke="var(--dk-shadow)" stroke-width="1.5"/>';
    // Tick marks
    for (var h = 0; h < 12; h++) {
      var a = h * 30;
      var rad = a * Math.PI / 180;
      var x1 = 32 + 26 * Math.sin(rad);
      var y1 = 32 - 26 * Math.cos(rad);
      var x2 = 32 + 29 * Math.sin(rad);
      var y2 = 32 - 29 * Math.cos(rad);
      html += '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="var(--dk-shadow)" stroke-width="1"/>';
    }
    html += '<line id="tzH' + i + '" x1="32" y1="32" x2="32" y2="16" stroke="var(--dk-shadow)" stroke-width="2.5" stroke-linecap="round"/>';
    html += '<line id="tzM' + i + '" x1="32" y1="32" x2="32" y2="10" stroke="var(--dk-shadow)" stroke-width="1.5" stroke-linecap="round"/>';
    html += '<line id="tzS' + i + '" x1="32" y1="32" x2="32" y2="8" stroke="var(--error)" stroke-width="0.8" stroke-linecap="round"/>';
    html += '<circle cx="32" cy="32" r="2" fill="var(--dk-shadow)"/>';
    html += '</svg>';
    html += '</div>';
    html += '<span class="tz-digital" id="tzD' + i + '"></span>';
    html += '<div class="tz-city">' + c.city + '</div>';
    html += '<div class="tz-offset" id="tzO' + i + '"></div>';
    html += '</div>';
  }
  tzGridEl.innerHTML = html;
}

function tzTick() {
  var now = new Date();
  for (var i = 0; i < TZ_CITIES.length; i++) {
    var zone = TZ_CITIES[i].zone;
    var parts = now.toLocaleString('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).split(':');
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var s = parseInt(parts[2], 10);

    // Analog hands
    var hDeg = (h % 12) * 30 + m * 0.5;
    var mDeg = m * 6 + s * 0.1;
    var sDeg = s * 6;
    var hEl = document.getElementById('tzH' + i);
    var mEl = document.getElementById('tzM' + i);
    var sEl = document.getElementById('tzS' + i);
    if (hEl) hEl.style.transform = 'rotate(' + hDeg + 'deg)';
    if (mEl) mEl.style.transform = 'rotate(' + mDeg + 'deg)';
    if (sEl) sEl.style.transform = 'rotate(' + sDeg + 'deg)';

    // Digital
    var dEl = document.getElementById('tzD' + i);
    if (dEl) dEl.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

    // Offset
    var oEl = document.getElementById('tzO' + i);
    if (oEl) {
      var utcStr = now.toLocaleString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
      var utcParts = utcStr.split(':');
      var utcH = parseInt(utcParts[0], 10);
      var utcM = parseInt(utcParts[1], 10);
      var diff = (h * 60 + m) - (utcH * 60 + utcM);
      // Handle day boundary
      if (diff > 720) diff -= 1440;
      if (diff < -720) diff += 1440;
      var sign = diff >= 0 ? '+' : '-';
      var absDiff = Math.abs(diff);
      var offH = Math.floor(absDiff / 60);
      var offM = absDiff % 60;
      oEl.textContent = 'UTC' + sign + offH + (offM ? ':' + String(offM).padStart(2, '0') : '');
    }
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
var weatherLoaded = false;

function openWeather() {
  openWindow('weather');
  fetchWeather();
}

function fetchWeather() {
  if (weatherLoaded) return;
  var body = document.getElementById('weatherBody');
  var status = document.getElementById('weatherStatus');
  body.innerHTML = '<div style="padding:16px;font-size:12px;color:#57606a;">Locating you...</div>';

  if (!navigator.geolocation) {
    showErrorPanel(body, 'Geolocation is not supported by your browser.', 'al-tri-we');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      body.innerHTML = '<div style="padding:16px;font-size:12px;color:#57606a;">Fetching weather data...</div>';
      var lat = pos.coords.latitude;
      var lon = pos.coords.longitude;
      fetch('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=auto&forecast_days=3')
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
    function (err) {
      showErrorPanel(body, GEO_ERRORS[err.code] || 'An unknown error occurred.', 'al-tri-we');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

function weatherCodeToDesc(code) {
  var codes = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Light freezing rain', 67: 'Freezing rain',
    71: 'Slight snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Severe thunderstorm'
  };
  return codes[code] || 'Unknown';
}

function renderWeather(body, data) {
  var current = data.current_weather;
  var daily = data.daily;
  var html = '<div class="weather-current">';
  html += '<div class="weather-temp">' + Math.round(current.temperature) + '\u00b0C</div>';
  html += '<div class="weather-desc">' + weatherCodeToDesc(current.weathercode) + '</div>';
  html += '</div><div class="separator"></div><div class="weather-forecast">';
  for (var i = 0; i < daily.time.length; i++) {
    var date = new Date(daily.time[i] + 'T00:00:00');
    var dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
    html += '<div class="weather-day">';
    html += '<div class="weather-day-name">' + dayName + '</div>';
    html += '<div class="weather-day-temp">' + Math.round(daily.temperature_2m_max[i]) + '\u00b0</div>';
    html += '<div class="weather-day-range">' + Math.round(daily.temperature_2m_min[i]) + '\u00b0 / ' + Math.round(daily.temperature_2m_max[i]) + '\u00b0</div>';
    html += '<div class="weather-day-desc">' + weatherCodeToDesc(daily.weathercode[i]) + '</div>';
    html += '</div>';
  }
  html += '</div>';
  body.innerHTML = html;
}

/* ── Run Terminal ── */
var termOutput = document.getElementById('termOutput');
var termInput = document.getElementById('termInput');

var termCwd = 'C:\\mpOS';
var FILESYSTEM = {
  'C:\\mpOS': {
    children: ['Desktop', 'Programs', 'Documents', 'Utilities']
  },
  'C:\\mpOS\\Desktop': {
    items: [
      { name: 'My Computer', run: function () { openMyComputer(); } },
      { name: 'Applications', run: function () { openExplorer(); } },
      { name: 'WikiBrowser', run: function () { openBrowser(); } }
    ]
  },
  'C:\\mpOS\\Programs': { items: FOLDER_ITEMS.programs },
  'C:\\mpOS\\Documents': { items: FOLDER_ITEMS.documents },
  'C:\\mpOS\\Utilities': { items: FOLDER_ITEMS.utilities }
};

var COMMANDS = {
  'help':        { run: cmdHelp,        desc: 'List available commands' },
  'cd':          { run: cmdCd,          desc: 'Change directory' },
  'ls':          { run: cmdLs,          desc: 'List directory contents' },
  'ontarget':    { run: openOnTarget,    desc: 'Launch On Target' },
  'fishofday':   { run: openFishOfDay,   desc: 'Launch Fish of the Day' },
  'fishfinder':  { run: openFishFinder,  desc: 'Launch Fish Finder' },
  'aquarium':    { run: openAquarium,    desc: 'Launch Virtual Aquarium' },
  'browser':     { run: openBrowser,     desc: 'Launch WikiBrowser' },
  'mycomputer':  { run: function () { openMyComputer(); }, desc: 'Open My Computer' },
  'explorer':    { run: openExplorer,    desc: 'Open Applications' },
  'programs':    { run: function () { openExplorerTo('programs'); },   desc: 'Open Programs folder' },
  'documents':   { run: function () { openExplorerTo('documents'); },  desc: 'Open Documents folder' },
  'utilities':   { run: function () { openExplorerTo('utilities'); },  desc: 'Open Utilities folder' },
  'notepad':     { run: openNotepad,     desc: 'Open Notepad' },
  'calculator':  { run: openCalculator,  desc: 'Open Calculator' },
  'calendar':    { run: openCalendar,    desc: 'Open Calendar' },
  'timezone':    { run: openTimeZone,    desc: 'Open Time Zone' },
  'weather':     { run: openWeather,     desc: 'Open Weather' },
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

function cmdVer() { termPrint('mpOS [Version 1.1.4]\n(c) Matthew Pritchard. All rights reserved.\n'); }

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

var matrixInterval = null;
function cmdMatrix() {
  var term = document.querySelector('#run .term');
  var existing = term.querySelector('.matrix-canvas');
  if (existing) { stopMatrix(); return; }
  var canvas = document.createElement('canvas');
  canvas.className = 'matrix-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;z-index:10;background:#000;';
  canvas.width = term.offsetWidth;
  canvas.height = term.offsetHeight;
  term.style.position = 'relative';
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
      } else if (localItem.action) {
        new Function(localItem.action)();
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
window.openRun = openRun;

})();
