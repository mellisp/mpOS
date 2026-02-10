/* Main application logic — mpOS */

function openWindow(id) {
  const win = document.getElementById(id);
  if (!win || win.style.display !== 'none') return;
  win.style.display = '';
  win.classList.add('restoring');
  win.addEventListener('animationend', function handler() {
    win.classList.remove('restoring');
    win.removeEventListener('animationend', handler);
  });
}

function closeStartMenu() {
  const m = document.querySelector('.start-menu');
  const b = document.querySelector('.start-btn');
  if (m) m.classList.remove('open');
  if (b) b.classList.remove('pressed');
}

function openExplorer() { openWindow('explorer'); }

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
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

/* ── Virtual Aquarium (YouTube IFrame Player API) ── */
let aquariumPlayer = null;
let aquariumTimer = null;

function openAquarium() {
  const embed = document.getElementById('aquariumEmbed');
  const shield = document.getElementById('aquariumShield');
  openWindow('aquarium');
  if (!embed.dataset.loaded) {
    shield.classList.remove('loaded');
    embed.dataset.loaded = '1';
    loadYouTubeAPI().then(function () {
      const playerDiv = document.createElement('div');
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
  const embed = document.getElementById('aquariumEmbed');
  const shield = document.getElementById('aquariumShield');
  if (aquariumPlayer && aquariumPlayer.destroy) {
    aquariumPlayer.destroy();
    aquariumPlayer = null;
  }
  const iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  clearTimeout(aquariumTimer);
  shield.classList.remove('loaded');
  embed.dataset.loaded = '';
  bbTaskbar.closeWindow('aquarium');
}

/* ── On Target (embedded game) ── */
function openOnTarget() {
  const embed = document.getElementById('ontargetEmbed');
  openWindow('ontarget');
  if (!embed.dataset.loaded) {
    embed.dataset.loaded = '1';
    const iframe = document.createElement('iframe');
    iframe.src = 'target-game.html';
    iframe.title = 'On Target';
    let initialLoad = true;
    iframe.addEventListener('load', function () {
      if (initialLoad) { initialLoad = false; return; }
      closeOnTarget();
    });
    embed.appendChild(iframe);
  }
}

function closeOnTarget() {
  const embed = document.getElementById('ontargetEmbed');
  const iframe = embed.querySelector('iframe');
  if (iframe) iframe.remove();
  embed.dataset.loaded = '';
  bbTaskbar.closeWindow('ontarget');
}

function openFishOfDay() {
  openWindow('fishofday');
  populateFish();
}

function populateSysInfo() {
  const body = document.getElementById('sysInfoBody');
  if (body.dataset.populated) return;
  body.dataset.populated = '1';

  const ua = navigator.userAgent;
  const nav = navigator;
  const scr = screen;

  function makeSection(title, rows) {
    const valid = rows.filter(function (r) { return r[1] != null; });
    if (!valid.length) return '';
    let html = '<div class="section-title">' + title + '</div><div class="sunken"><table class="sysinfo-table">';
    valid.forEach(function (r) {
      html += '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>';
    });
    return html + '</table></div>';
  }

  let os = null;
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/CrOS/.test(ua)) os = 'Chrome OS';
  else if (/Linux/.test(ua)) os = 'Linux';

  let browser = null;
  if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Apple Safari';

  let html = '<div class="sysinfo-hero">';
  html += '<svg width="80" height="64" viewBox="0 0 80 64" fill="none" xmlns="http://www.w3.org/2000/svg">';
  html += '<rect x="4" y="2" width="72" height="44" rx="3" fill="#1a3a5c" stroke="#0a246a" stroke-width="2"/>';
  html += '<rect x="8" y="6" width="64" height="36" rx="1" fill="#fff"/>';
  html += '<rect x="28" y="48" width="24" height="5" fill="#808080"/>';
  html += '<rect x="16" y="53" width="48" height="4" rx="1.5" fill="var(--silver)" stroke="#808080" stroke-width="1"/>';
  html += '</svg>';
  if (os) html += '<div class="sysinfo-os">' + os + '</div>';
  if (browser) html += '<div class="sysinfo-browser">' + browser + '</div>';
  html += '</div><div class="separator"></div>';

  html += makeSection('System', [
    ['CPU Cores', nav.hardwareConcurrency ? nav.hardwareConcurrency + ' logical processors' : null],
    ['Language', nav.language || null]
  ]);

  const dpr = window.devicePixelRatio || 1;
  html += makeSection('Display', [
    ['Resolution', scr.width + ' \u00d7 ' + scr.height],
    ['Pixel Ratio', dpr + 'x' + (dpr > 1 ? ' (HiDPI)' : '')]
  ]);

  html += '<div id="sysNetSection"></div>';
  html += '<div id="sysBatSection"></div>';

  body.innerHTML = html;

  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn) {
    const netRows = [];
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
let fishPopulated = false;
function populateFish() {
  if (fishPopulated) return;
  fishPopulated = true;

  const f = FISH_TODAY;
  const fishPhoto = document.getElementById('fishPhoto');
  const photoPlaceholder = document.getElementById('photoPlaceholder');
  const fishName = document.getElementById('fishName');
  const fishScientific = document.getElementById('fishScientific');
  const fishDetails = document.getElementById('fishDetails');
  const fishDateText = document.getElementById('fishDateText');

  const sciName = f[1] + " " + f[2];
  fishName.textContent = f[0];
  fishScientific.textContent = sciName;

  const now = new Date();
  fishDateText.textContent = now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  function addDetail(label, value) {
    if (!value && value !== 0) return;
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    fishDetails.appendChild(dt);
    fishDetails.appendChild(dd);
  }

  addDetail("Family", f[3]);
  addDetail("Order", f[4]);
  if (f[5]) addDetail("Max Size", f[5] + " cm");
  addDetail("Habitat", f[6]);
  addDetail("Depth", f[7]);

  const wikiTitle = f[1] + "_" + f[2];

  const imgKey = "fotd-img-" + todayKey();

  if (f[8]) {
    showFishImage(f[8]);
  } else if (localStorage.getItem(imgKey)) {
    showFishImage(localStorage.getItem(imgKey));
  } else {
    fetchWikiImage(wikiTitle)
      .catch(function () { return fetchWikiImage(f[0].replace(/ /g, "_")); })
      .catch(function () { photoPlaceholder.textContent = "No photo available"; });
  }

  function fetchWikiImage(title) {
    return fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + title)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (data) {
        let src = data.thumbnail && data.thumbnail.source;
        if (!src) throw 0;
        src = src.replace(/\/\d+px-/, "/480px-");
        localStorage.setItem(imgKey, src);
        showFishImage(src);
      });
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
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatFinderDistance(km) {
  const mi = km * 0.621371;
  return km.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' km (' +
         mi.toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' mi)';
}

function populateFishFinder() {
  const body = document.getElementById('fishFinderBody');
  const status = document.getElementById('fishFinderStatus');

  body.innerHTML = '<div style="padding:16px;font-size:12px;color:#57606a;">Locating you...</div>';
  status.textContent = '';

  if (!navigator.geolocation) {
    showFinderError(body, 'Geolocation is not supported by your browser.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let nearest = null, furthest = null;
      let minDist = Infinity, maxDist = -1;

      for (let i = 0; i < AQUARIUMS.length; i++) {
        const d = haversineDistance(lat, lon, AQUARIUMS[i][2], AQUARIUMS[i][3]);
        if (d < minDist) { minDist = d; nearest = AQUARIUMS[i]; }
        if (d > maxDist) { maxDist = d; furthest = AQUARIUMS[i]; }
      }

      function finderCard(aq, dist) {
        const name = aq[4] ? '<a href="' + aq[4] + '" target="_blank" rel="noopener" style="color:var(--link);text-decoration:none;">' + aq[0] + '</a>' : aq[0];
        let meta = aq[1];
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
      const msgs = {
        1: 'Location access was denied.',
        2: 'Location information is unavailable.',
        3: 'Location request timed out.'
      };
      showFinderError(body, msgs[err.code] || 'An unknown error occurred.');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

function showFinderError(body, msg) {
  body.innerHTML =
    '<div style="padding:16px;">' +
      '<div class="error-row">' +
        '<svg class="alert-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 2 L30 28 L2 28 Z" fill="#fdd835" stroke="#c6a700" stroke-width="1.5" stroke-linejoin="round"/><rect x="14.5" y="11" width="3" height="9" rx="1.5" fill="#000"/><rect x="14.5" y="22" width="3" height="3" rx="1.5" fill="#000"/></svg>' +
        '<div class="error-text">' + msg + '</div>' +
      '</div>' +
    '</div>';
}

/* ── Web Browser ── */
const BROWSER_HOME = 'https://en.m.wikipedia.org/wiki/Main_Page';
const browserFrame = document.getElementById('browserFrame');
const browserUrl = document.getElementById('browserUrl');
const browserTitle = document.getElementById('browserTitle');

function openBrowser() {
  const vp = document.getElementById('browserViewport');
  openWindow('browser');
  if (!vp.dataset.loaded) {
    vp.dataset.loaded = '1';
    browserFrame.src = BROWSER_HOME;
    browserUrl.value = BROWSER_HOME;
  }
  setTimeout(function () { browserUrl.focus(); browserUrl.select(); }, 100);
}

function closeBrowser() {
  const vp = document.getElementById('browserViewport');
  browserFrame.src = 'about:blank';
  vp.dataset.loaded = '';
  browserUrl.value = '';
  browserTitle.textContent = 'Web Browser';
  bbTaskbar.closeWindow('browser');
}

function browserNavigate(query) {
  query = query.trim();
  if (!query) return;
  let url;
  if (/^https?:\/\/[a-z]+\.wikipedia\.org\//i.test(query)) {
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
    const loc = browserFrame.contentWindow.location.href;
    if (loc && loc !== 'about:blank') {
      browserUrl.value = loc;
      const title = browserFrame.contentDocument && browserFrame.contentDocument.title;
      browserTitle.textContent = title ? 'Web Browser — ' + title : 'Web Browser';
    }
  } catch (e) {
    /* cross-origin — can't read iframe location */
  }
});

/* ── Run Terminal ── */
const termOutput = document.getElementById('termOutput');
const termInput = document.getElementById('termInput');
const COMMANDS = {
  'help':        { run: cmdHelp,        desc: 'List available commands' },
  'ontarget':    { run: openOnTarget,    desc: 'Launch On Target' },
  'fishofday':   { run: openFishOfDay,   desc: 'Launch Fish of the Day' },
  'fishfinder':  { run: openFishFinder,  desc: 'Launch Fish Finder' },
  'aquarium':    { run: openAquarium,    desc: 'Launch Virtual Aquarium' },
  'browser':     { run: openBrowser,     desc: 'Launch Web Browser' },
  'mycomputer':  { run: function () { openMyComputer(); }, desc: 'Open My Computer' },
  'explorer':    { run: openExplorer,    desc: 'Open Applications' },
  'cls':         { run: cmdCls,          desc: 'Clear the screen' },
  'clear':       { run: cmdCls,          desc: 'Clear the screen' },
  'exit':        { run: function () { bbTaskbar.closeWindow('run'); }, desc: 'Close this window' },
  'ver':         { run: cmdVer,          desc: 'Show version' },
};

function termPrint(text) {
  termOutput.textContent += text + '\n';
  termOutput.scrollTop = termOutput.scrollHeight;
}

function cmdHelp() {
  termPrint('Available commands:\n');
  const names = Object.keys(COMMANDS).filter(function (k) { return k !== 'clear'; });
  names.forEach(function (name) {
    termPrint('  ' + name.toUpperCase().padEnd(14) + COMMANDS[name].desc);
  });
  termPrint('');
}

function cmdCls() { termOutput.textContent = ''; }

function cmdVer() { termPrint('mpOS [Version 1.0]\n(c) Matthew Pritchard. All rights reserved.\n'); }

function openRun() {
  openWindow('run');
  termOutput.textContent = '';
  cmdVer();
  termInput.value = '';
  setTimeout(function () { termInput.focus(); }, 100);
}

termInput.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const raw = termInput.value.trim();
  termInput.value = '';
  termPrint('C:\\mpOS> ' + raw);
  if (!raw) return;
  const cmd = raw.toLowerCase();
  if (COMMANDS[cmd]) {
    COMMANDS[cmd].run();
  } else {
    termPrint("'" + raw + "' is not recognized as an internal or external command,\noperable program or batch file.\n");
  }
});

// Play click sound on button interactions
document.addEventListener('click', function (e) {
  if (e.target.closest('.btn, .start-btn, .titlebar-btn, .project-list li')) {
    if (window.bbAudio) window.bbAudio.playSound('click');
  }
});
