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
  html += '<circle cx="24" cy="30" r="1" fill="#4ade80" opacity="0.8"/>';
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
        '<svg class="alert-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="al-tri-ff" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#fffde0"/><stop offset="20%" stop-color="#ffe88a"/><stop offset="50%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#e8a000"/></linearGradient></defs><path d="M16 2 L30 28 L2 28 Z" fill="url(#al-tri-ff)" stroke="#a07000" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="26" x2="16" y2="5" stroke="white" stroke-width="1" opacity="0.3" stroke-linecap="round"/><ellipse cx="13" cy="14" rx="5" ry="6" fill="white" opacity="0.15"/><rect x="14.5" y="11" width="3" height="9" rx="1.5" fill="#5d4037"/><rect x="14.5" y="22" width="3" height="3" rx="1.5" fill="#5d4037"/></svg>' +
        '<div class="error-text">' + msg + '</div>' +
      '</div>' +
    '</div>';
}

/* ── WikiBrowser ── */
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
  browserTitle.textContent = 'WikiBrowser';
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
      browserTitle.textContent = title ? 'WikiBrowser — ' + title : 'WikiBrowser';
    }
  } catch (e) {
    /* cross-origin — can't read iframe location */
  }
});

/* ── Notepad ── */
function openNotepad() {
  openWindow('notepad');
  var editor = document.getElementById('notepadEditor');
  if (!editor.dataset.loaded) {
    editor.dataset.loaded = '1';
    var saved = localStorage.getItem('mpOS-notepad');
    if (saved !== null) editor.value = saved;
    updateNotepadStatus();
  }
  setTimeout(function () { editor.focus(); }, 100);
}

function notepadNew() {
  document.getElementById('notepadEditor').value = '';
  updateNotepadStatus();
}

function notepadSave() {
  localStorage.setItem('mpOS-notepad', document.getElementById('notepadEditor').value);
  document.getElementById('notepadStatus').textContent = 'Saved';
  setTimeout(updateNotepadStatus, 1500);
}

function notepadLoad() {
  var text = localStorage.getItem('mpOS-notepad');
  if (text !== null) document.getElementById('notepadEditor').value = text;
  updateNotepadStatus();
}

function updateNotepadStatus() {
  var len = document.getElementById('notepadEditor').value.length;
  document.getElementById('notepadStatus').textContent = len + ' character' + (len !== 1 ? 's' : '');
}

document.getElementById('notepadEditor').addEventListener('input', updateNotepadStatus);

/* ── Calculator ── */
var calcCurrent = '0';
var calcPrev = null;
var calcOperation = null;
var calcReset = false;

function openCalculator() { openWindow('calculator'); }

function calcUpdateDisplay() {
  document.getElementById('calcDisplay').textContent = calcCurrent;
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
  if (calcPrev === null || !calcOperation) return;
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
    showWeatherError(body, 'Geolocation is not supported by your browser.');
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
          showWeatherError(body, 'Failed to fetch weather data. Please try again later.');
        });
    },
    function (err) {
      var msgs = { 1: 'Location access was denied.', 2: 'Location information is unavailable.', 3: 'Location request timed out.' };
      showWeatherError(body, msgs[err.code] || 'An unknown error occurred.');
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

function showWeatherError(body, msg) {
  body.innerHTML =
    '<div style="padding:16px;">' +
      '<div class="error-row">' +
        '<svg class="alert-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="al-tri-we" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#fffde0"/><stop offset="20%" stop-color="#ffe88a"/><stop offset="50%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#e8a000"/></linearGradient></defs><path d="M16 2 L30 28 L2 28 Z" fill="url(#al-tri-we)" stroke="#a07000" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="26" x2="16" y2="5" stroke="white" stroke-width="1" opacity="0.3" stroke-linecap="round"/><ellipse cx="13" cy="14" rx="5" ry="6" fill="white" opacity="0.15"/><rect x="14.5" y="11" width="3" height="9" rx="1.5" fill="#5d4037"/><rect x="14.5" y="22" width="3" height="3" rx="1.5" fill="#5d4037"/></svg>' +
        '<div class="error-text">' + msg + '</div>' +
      '</div>' +
    '</div>';
}

/* ── Run Terminal ── */
const termOutput = document.getElementById('termOutput');
const termInput = document.getElementById('termInput');
const COMMANDS = {
  'help':        { run: cmdHelp,        desc: 'List available commands' },
  'ontarget':    { run: openOnTarget,    desc: 'Launch On Target' },
  'fishofday':   { run: openFishOfDay,   desc: 'Launch Fish of the Day' },
  'fishfinder':  { run: openFishFinder,  desc: 'Launch Fish Finder' },
  'aquarium':    { run: openAquarium,    desc: 'Launch Virtual Aquarium' },
  'browser':     { run: openBrowser,     desc: 'Launch WikiBrowser' },
  'mycomputer':  { run: function () { openMyComputer(); }, desc: 'Open My Computer' },
  'explorer':    { run: openExplorer,    desc: 'Open Applications' },
  'notepad':     { run: openNotepad,     desc: 'Open Notepad' },
  'calculator':  { run: openCalculator,  desc: 'Open Calculator' },
  'weather':     { run: openWeather,     desc: 'Open Weather' },
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

function cmdVer() { termPrint('mpOS [Version 1.0.3]\n(c) Matthew Pritchard. All rights reserved.\n'); }

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
