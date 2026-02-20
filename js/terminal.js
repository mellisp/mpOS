/* Terminal — Run window, command interpreter, filesystem */
(function () {
'use strict';

/* ── Terminal state and DOM refs ── */
const termOutput = document.getElementById('termOutput');
const termInput = document.getElementById('termInput');

let termCwd = 'C:\\mpOS';
let termHistory = [];
let termHistoryIndex = -1;
let termSavedInput = '';
let tabMatches = [];
let tabIndex = -1;

const TERM_STORAGE_KEY = 'mpOS-terminal';
const TERM_MAX_HISTORY = 200;
const TERM_MAX_FILES = 50;
const TERM_MAX_FILE_SIZE = 10000;

/* ── Color table for 'color' command ── */
const COLOR_TABLE = {
  '0': '#000000', '1': '#000080', '2': '#008000', '3': '#008080',
  '4': '#800000', '5': '#800080', '6': '#808000', '7': '#c0c0c0',
  '8': '#808080', '9': '#0000ff', 'a': '#00ff00', 'b': '#00ffff',
  'c': '#ff0000', 'd': '#ff00ff', 'e': '#ffff00', 'f': '#ffffff'
};

/* ── Fortune quotes — ordered so no two adjacent share a semantic category ── */
const FORTUNE_QUOTES = [
  'He who throws dirt is losing ground.',                                                   /* wordplay */
  'The candle does not negotiate with the dark.',                                           /* zen */
  'The early bird gets the worm, but the second mouse gets the cheese.',                    /* proverb */
  'Everybody brings joy to a room. Some when they enter, some when they leave.',            /* observation */
  'A table has four legs, but nobody calls it a horse.',                                    /* juxtaposition */
  'You are not late. The others were merely early.',                                        /* reframe */
  'You cannot steer a parked car.',                                                         /* physical truth */
  'You already know the answer. You are here because you like the question.',               /* mirror */
  'The vine does not ask permission to climb.',                                             /* zen */
  'Smile when picking out furniture. You will be living with it.',                          /* choices */
  'A crooked log makes a good fire.',                                                       /* observation */
  'Opportunity knocks once. Temptation leans on the doorbell.',                             /* personification */
  'Many hands make light work. Nobody makes light of many hands.',                          /* wordplay */
  'The sky is blue, but in Bulgarian it is синьо.',                                        /* juxtaposition */
  'The spider does not explain the web.',                                                   /* zen */
  'Rome was not built in a day, but the invoice was sent on one.',                          /* proverb */
  'Somewhere, a bridge you burned is lighting someone else\'s way.',                        /* reframe */
  'If you think nobody cares, try missing a payment.',                                      /* observation */
  'A spoon cannot taste the soup it stirs.',                                                /* paradox */
  'You cannot plough a field by turning it over in your mind.',                             /* wordplay */
  'An old debt will be repaid in an unexpected currency.',                                  /* mysterious */
  'A bell with no tongue still knows every song.',                                          /* zen */
  'Where there\'s smoke, there\'s someone who said they could cook.',                       /* proverb */
  'He who sleeps on the floor will not fall out of bed.',                                   /* physical truth */
  'The person who says it cannot be done is usually interrupted by the person doing it.',   /* observation */
  'Honey never expires. The bee that made it lived six weeks.',                             /* juxtaposition */
  'Even stale bread was fresh once. Don\'t be too hard on it.',                             /* wordplay */
  'Today is the tomorrow you worried about yesterday. Notice how fine it is.',              /* reframe */
  'A seed planted in doubt still flowers in its season.',                                   /* zen */
  'A tight knot was once a loose rope.',                                                    /* observation */
  'Your reputation arrives before you and stays after you leave. Tip it well.',             /* personification */
  'Good things come to those who wait. Better things come to those who were already there.',/* proverb */
  'Not all who wander are lost, but you specifically might be.',                            /* mirror */
  'Every exit sign is also an entrance sign from the other side.',                          /* juxtaposition */
  'The person who rows the boat seldom has time to rock it.',                               /* wordplay */
  'The tea leaves say nothing. Drink the tea.',                                             /* zen */
  'You will find a use for that weird thing in the drawer.',                                /* observation */
  'Beware of half-truths. You may have the wrong half.',                                   /* logical */
  'You cannot shake hands with a clenched fist.',                                           /* physical truth */
  'The trouble with doing nothing is that you never know when you are finished.'            /* paradox */
];

/* ── Filesystem (virtual directory tree) ── */
const FILESYSTEM = {
  'C:\\mpOS': {
    children: ['Desktop', 'Programs', 'Documents', 'Utilities']
  },
  'C:\\mpOS\\Desktop': {
    items: [
      { name: 'My Computer', run: () => { window.openMyComputer(); } },
      { name: 'Files', run: () => { window.openExplorer(); } },
      { name: 'WikiBrowser', run: () => { window.openBrowser(); } },
      { name: 'Archive Browser', run: () => { window.openArchiveBrowser(); } }
    ]
  },
  'C:\\mpOS\\Programs': {
    children: ['Games', 'Internet', 'Accessories', 'Audio']
  },
  'C:\\mpOS\\Programs\\Games': { items: window.FOLDER_ITEMS.games },
  'C:\\mpOS\\Programs\\Internet': { items: window.FOLDER_ITEMS.internet },
  'C:\\mpOS\\Programs\\Accessories': { items: window.FOLDER_ITEMS.accessories },
  'C:\\mpOS\\Programs\\Audio': { items: window.FOLDER_ITEMS.audio },
  'C:\\mpOS\\Documents': {
    items: window.FOLDER_ITEMS.documents
  },
  'C:\\mpOS\\Utilities': { items: window.FOLDER_ITEMS.utilities }
};

/* ── Netstat endpoint map ── */
const NET_ENDPOINTS = {
  'browser': 'en.wikipedia.org:443',
  'weather': 'api.open-meteo.com:443',
  'aquarium': 'www.youtube.com:443',
  'visitormap': 'visitor-map.matthewpritchard079.workers.dev:443',
  'fishofday': 'wsrv.nl:443'
};

/* ── Mutable state ── */
let fortuneIndex = Math.floor(Math.random() * FORTUNE_QUOTES.length);
let matrixInterval = null;
let topInterval = null;
let topKeyHandler = null;
let editFilename = null;


/* ═══════════════════════════════════════════════════════════
   Terminal persistence helpers
   ═══════════════════════════════════════════════════════════ */

const termCountFiles = () => {
  let count = 0;
  Object.keys(FILESYSTEM).forEach(path => {
    if (FILESYSTEM[path].files) count += FILESYSTEM[path].files.length;
  });
  return count;
};

const termLoadState = () => {
  try {
    const raw = localStorage.getItem(TERM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

const termSaveState = () => {
  try {
    const files = {};
    Object.keys(FILESYSTEM).forEach(path => {
      const dir = FILESYSTEM[path];
      if (dir.files && dir.files.length > 0) {
        files[path] = dir.files.map(f => ({
          name: f.name,
          content: (f.content || '').slice(0, TERM_MAX_FILE_SIZE),
          size: Math.min(f.size || 0, TERM_MAX_FILE_SIZE)
        }));
      }
    });

    const term = document.querySelector('#run .term');
    const titleSpan = document.querySelector('#run .titlebar span');

    const state = {
      history: termHistory.slice(-TERM_MAX_HISTORY),
      bgColor: term.style.backgroundColor || '',
      fgColor: term.style.color || '',
      title: titleSpan.textContent !== 'Run' ? titleSpan.textContent : '',
      files
    };
    localStorage.setItem(TERM_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    /* localStorage full or unavailable */
  }
};

const termRestoreState = () => {
  const state = termLoadState();
  if (!state) return;

  if (state.history && Array.isArray(state.history)) {
    termHistory = state.history.slice(-TERM_MAX_HISTORY);
  }

  const term = document.querySelector('#run .term');
  if (state.bgColor) term.style.backgroundColor = state.bgColor;
  if (state.fgColor) term.style.color = state.fgColor;

  if (state.title) {
    document.querySelector('#run .titlebar span').textContent = state.title;
  }

  if (state.files) {
    Object.keys(state.files).forEach(path => {
      if (FILESYSTEM[path]) {
        FILESYSTEM[path].files = state.files[path];
      }
    });
  }
};


/* ═══════════════════════════════════════════════════════════
   termPrint — append text to terminal output
   ═══════════════════════════════════════════════════════════ */

const termPrint = (text, color) => {
  const span = document.createElement('span');
  span.textContent = `${text}\n`;
  if (color) span.style.color = color;
  termOutput.appendChild(span);
  // Cap output at 500 lines to prevent unbounded DOM growth
  while (termOutput.childNodes.length > 500) termOutput.removeChild(termOutput.firstChild);
  termOutput.scrollTop = termOutput.scrollHeight;
};


/* ═══════════════════════════════════════════════════════════
   Terminal commands
   ═══════════════════════════════════════════════════════════ */

const cmdPwd = () => { termPrint(termCwd); };

const cmdUptime = () => {
  const ms = performance.now();
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  termPrint(`System uptime: ${h}h ${m}m ${s}s`);
};

const cmdHistory = (args) => {
  if (args && args.trim().toLowerCase() === 'clear') {
    termHistory = [];
    termHistoryIndex = -1;
    termSaveState();
    termPrint('History cleared.');
    return;
  }
  if (termHistory.length === 0) {
    termPrint('No command history.');
    return;
  }
  termHistory.forEach((cmd, i) => {
    termPrint(`  ${String(i + 1).padStart(4)}  ${cmd}`);
  });
};

const cmdTouch = (args) => {
  if (!args || !args.trim()) {
    termPrint('Usage: touch <filename>');
    return;
  }
  const filename = args.trim();
  const cur = FILESYSTEM[termCwd];
  if (!cur) { termPrint('Error: cannot access directory.'); return; }
  if (!cur.files) cur.files = [];
  const existing = cur.files.find(f => f.name.toLowerCase() === filename.toLowerCase());
  if (existing) {
    termPrint(`File already exists: ${filename}`);
    return;
  }
  if (termCountFiles() >= TERM_MAX_FILES) {
    termPrint(`Error: file limit reached (maximum ${TERM_MAX_FILES} files).`);
    return;
  }
  cur.files.push({ name: filename, content: '', size: 0 });
  termPrint(`Created: ${filename}`);
  termSaveState();
};

const cmdRm = (args) => {
  if (!args || !args.trim()) {
    termPrint('Usage: rm <filename>');
    return;
  }
  const filename = args.trim();
  const cur = FILESYSTEM[termCwd];
  if (!cur || !cur.files) {
    termPrint('The system cannot find the file specified.');
    return;
  }
  const idx = cur.files.findIndex(f => f.name.toLowerCase() === filename.toLowerCase());
  if (idx === -1) {
    termPrint('The system cannot find the file specified.');
    return;
  }
  cur.files.splice(idx, 1);
  termPrint(`Deleted: ${filename}`);
  termSaveState();
};

const cmdFortune = () => {
  termPrint('');
  termPrint(FORTUNE_QUOTES[fortuneIndex]);
  termPrint('');
  fortuneIndex = (fortuneIndex + 1) % FORTUNE_QUOTES.length;
};

const cmdNeofetch = () => {
  const nav = navigator;
  const scr = screen;

  let browser = 'Unknown';
  const ua = nav.userAgent;
  if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Edg/') !== -1) browser = 'Edge';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Safari';

  const ms = performance.now();
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const uptimeStr = `${h}h ${m}m`;

  const logo = [
    '                  ___  ____  ',
    '  _ __ ___  _ __ / _ \\/ ___| ',
    ' | \'_ ` _ \\| \'_ \\| | | \\___ \\ ',
    ' | | | | | | |_) | |_| |___) |',
    ' |_| |_| |_| .__/ \\___/|____/ ',
    '            |_|                '
  ];

  const info = [
    'matthew@mpos-pc',
    '----------------',
    `OS: mpOS ${window.MPOS_VERSION}`,
    `Browser: ${browser}`,
    `Resolution: ${scr.width}x${scr.height}`,
    `CPU: ${nav.hardwareConcurrency || '?'} cores`,
    `Uptime: ${uptimeStr}`,
    `Locale: ${nav.language || 'unknown'}`
  ];

  termPrint('');
  const lines = Math.max(logo.length, info.length);
  for (let i = 0; i < lines; i++) {
    let left = i < logo.length ? logo[i] : ''.padEnd(32);
    const right = i < info.length ? info[i] : '';
    left = left.padEnd(32);
    termPrint(left + right);
  }
  termPrint('');
};

const cmdCurl = async (args) => {
  if (!args || !args.trim()) {
    termPrint('Usage: curl <url>');
    return;
  }
  let url = args.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Ensure trailing slash on bare hostnames so query params attach correctly
  if (url.replace(/^https?:\/\//i, '').indexOf('/') === -1) url += '/';
  termPrint(`Fetching ${url} ...\n`);
  termInput.disabled = true;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      termPrint(`HTTP ${res.status} ${res.statusText}`);
    } else {
      const text = await res.text();
      if (text.length > 2000) {
        termPrint(text.substring(0, 2000));
        termPrint('\n... (truncated at 2000 characters)');
      } else {
        termPrint(text);
      }
    }
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('CORS') !== -1) {
      termPrint('Error: Connection blocked by CORS policy.', '#ff6666');
      termPrint(`The server at ${url} does not allow cross-origin requests.`);
      termPrint('This is a browser security restriction, not a network error.', '#888');
      termPrint('Tip: Try sites with CORS enabled, e.g. curl api.github.com', '#888');
    } else {
      termPrint(`Error: ${msg}`, '#ff6666');
    }
  } finally {
    termPrint('');
    termInput.disabled = false;
    termInput.focus();
  }
};

const cmdHelp = () => {
  termPrint('');
  const grouped = {};
  Object.keys(HELP_GROUPS).forEach(g => { grouped[g] = []; });
  grouped['PROGRAMS'] = [];

  /* Assign every command (except 'clear') to a group */
  const assigned = {};
  Object.keys(HELP_GROUPS).forEach(g => {
    HELP_GROUPS[g].forEach(c => { assigned[c] = g; });
  });
  Object.keys(COMMANDS).forEach(name => {
    if (name === 'clear') return;
    const group = assigned[name] || 'PROGRAMS';
    grouped[group].push(name);
  });

  Object.keys(grouped).forEach(g => {
    if (grouped[g].length === 0) return;
    termPrint(` ${g}`, '#ffffff');
    grouped[g].forEach(name => {
      termPrint(`  ${name.toUpperCase().padEnd(16)}${COMMANDS[name].desc}`);
    });
    termPrint('');
  });
};

const cmdCls = () => {
  stopMatrix();
  stopTop();
  stopEdit();
  termOutput.textContent = '';
};

const cmdVer = () => {
  termPrint(`mpOS [Version ${window.MPOS_VERSION}]\n(c) Matthew Pritchard. All rights reserved.\n`);
};

const cmdCd = (args) => {
  if (!args) { termPrint(`${termCwd}\n`); return; }
  const target = args.trim();
  let newPath;
  if (target === '\\' || target === '/') {
    newPath = 'C:\\mpOS';
  } else if (target === '..') {
    if (termCwd !== 'C:\\mpOS') {
      const parts = termCwd.split('\\');
      parts.pop();
      newPath = parts.join('\\');
    } else {
      newPath = 'C:\\mpOS';
    }
  } else if (target.match(/^[Cc]:\\/i)) {
    const normalized = target.replace(/\//g, '\\');
    const fsKeys = Object.keys(FILESYSTEM);
    const found = fsKeys.find(k => k.toLowerCase() === normalized.toLowerCase());
    newPath = found || normalized;
  } else {
    const cur = FILESYSTEM[termCwd];
    if (cur && cur.children) {
      const match = cur.children.find(c => c.toLowerCase() === target.toLowerCase());
      if (match) {
        newPath = `${termCwd}\\${match}`;
      }
    }
  }
  if (newPath && FILESYSTEM[newPath]) {
    termCwd = newPath;
    document.querySelector('#run .term-prompt').textContent = `${termCwd}> `;
    termPrint('');
  } else {
    termPrint('The system cannot find the path specified.\n');
  }
};

const cmdLs = () => {
  const cur = FILESYSTEM[termCwd];
  if (!cur) { termPrint('Error reading directory.\n'); return; }
  termPrint('');
  termPrint(` Directory of ${termCwd}`);
  termPrint('');
  if (cur.children) {
    cur.children.forEach(c => {
      termPrint(`  <DIR>    ${c}`);
    });
  }
  if (cur.items && cur.items.length > 0) {
    cur.items.forEach(item => {
      termPrint(`           ${item.name}`);
    });
  }
  if (cur.files && cur.files.length > 0) {
    cur.files.forEach(f => {
      termPrint(`           ${f.name}`);
    });
  }
  if (!cur.children && (!cur.items || cur.items.length === 0) && (!cur.files || cur.files.length === 0)) {
    termPrint('  Directory is empty.');
  }
  termPrint('');
};

const cmdDir = () => {
  const cur = FILESYSTEM[termCwd];
  if (!cur) { termPrint('Error reading directory.\n'); return; }
  const now = new Date();
  const dateStr = mpFormatDate(now);
  const timeStr = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}`;
  let dirCount = 0;
  let fileCount = 0;
  let totalSize = 0;

  termPrint('');
  termPrint(' Volume in drive C is mpOS');
  termPrint(' Volume Serial Number is 4D50-4F53');
  termPrint('');
  termPrint(` Directory of ${termCwd}`);
  termPrint('');

  if (termCwd !== 'C:\\mpOS') {
    termPrint(`${dateStr}  ${timeStr}    <DIR>          .`);
    termPrint(`${dateStr}  ${timeStr}    <DIR>          ..`);
    dirCount += 2;
  }

  if (cur.children) {
    cur.children.forEach(c => {
      termPrint(`${dateStr}  ${timeStr}    <DIR>          ${c}`);
      dirCount++;
    });
  }

  if (cur.files) {
    cur.files.forEach(f => {
      const sizeStr = String(f.size).padStart(14, ' ');
      termPrint(`${dateStr}  ${timeStr}    ${sizeStr} ${f.name}`);
      fileCount++;
      totalSize += f.size;
    });
  }

  if (cur.items) {
    cur.items.forEach(item => {
      const lnkName = `${item.name}.lnk`;
      const size = 1024;
      const sizeStr = String(size).padStart(14, ' ');
      termPrint(`${dateStr}  ${timeStr}    ${sizeStr} ${lnkName}`);
      fileCount++;
      totalSize += size;
    });
  }

  termPrint(`${String(fileCount).padStart(16, ' ')} File(s)  ${String(totalSize).padStart(14, ' ')} bytes`);
  termPrint(`${String(dirCount).padStart(16, ' ')} Dir(s)   2,147,483,648 bytes free`);
  termPrint('');
};

const cmdEcho = (args) => {
  if (!args || !args.trim()) {
    termPrint('ECHO is on.');
  } else {
    termPrint(args);
  }
};

const cmdDate = () => {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  termPrint(`The current date is: ${days[now.getDay()]} ${mpFormatDate(now)}`);
};

const cmdTime = () => {
  const now = new Date();
  const ms = String(now.getMilliseconds()).padStart(3, '0').substring(0, 2);
  termPrint(`The current time is: ${padTwo(now.getHours())}:${padTwo(now.getMinutes())}:${padTwo(now.getSeconds())}.${ms}`);
};

const cmdType = (args) => {
  if (!args || !args.trim()) {
    termPrint('The syntax of the command is incorrect.');
    return;
  }
  const filename = args.trim();
  const cur = FILESYSTEM[termCwd];
  if (!cur || !cur.files) {
    termPrint('The system cannot find the file specified.');
    return;
  }
  const file = cur.files.find(f => f.name.toLowerCase() === filename.toLowerCase());
  if (!file) {
    termPrint('The system cannot find the file specified.');
    return;
  }
  termPrint(file.content);
};

const cmdTree = () => {
  termPrint('');

  const printTree = (path, prefix, isLast) => {
    const name = path.split('\\').pop();
    const connector = isLast ? '\\---' : '+---';
    if (prefix === '') {
      termPrint(path);
    } else {
      termPrint(prefix + connector + name);
    }
    const node = FILESYSTEM[path];
    const newPrefix = prefix === '' ? '' : prefix + (isLast ? '    ' : '|   ');
    if (node && node.children) {
      node.children.forEach((child, i) => {
        const childPath = `${path}\\${child}`;
        const last = i === node.children.length - 1;
        printTree(childPath, newPrefix, last);
      });
    } else if (node && node.items) {
      node.items.forEach((item, i) => {
        const last = i === node.items.length - 1;
        const c = last ? '\\---' : '+---';
        termPrint(newPrefix + c + item.name);
      });
    }
  };

  printTree('C:\\mpOS', '', false);
  termPrint('');
};

const cmdWhoami = () => { termPrint('mpos\\matthew'); };

const cmdHostname = () => { termPrint('MPOS-PC'); };

const cmdSysteminfo = () => {
  const nav = navigator;
  const scr = screen;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

  termPrint('');
  termPrint('Host Name:              MPOS-PC', '#ffffff');
  termPrint('OS Name:                mpOS');
  termPrint('OS Version:             1.4.9');

  let browser = 'Unknown';
  const ua = nav.userAgent;
  if (ua.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
  else if (ua.indexOf('Edg/') !== -1) browser = 'Microsoft Edge';
  else if (ua.indexOf('Chrome') !== -1) browser = 'Google Chrome';
  else if (ua.indexOf('Safari') !== -1) browser = 'Apple Safari';
  termPrint(`Browser:                ${browser}`);

  termPrint(`System Locale:          ${nav.language || 'unknown'}`);
  termPrint(`Processors:             ${nav.hardwareConcurrency || 'unknown'}`);
  termPrint(`Display:                ${scr.width}x${scr.height} (${devicePixelRatio}x DPR)`);

  if (conn) {
    const netType = conn.effectiveType ? conn.effectiveType.toUpperCase() : 'Unknown';
    const downlink = conn.downlink != null ? `${conn.downlink} Mbps` : 'unknown';
    termPrint(`Network Type:           ${netType}`);
    termPrint(`Downlink:               ${downlink}`);
  }

  termPrint(`Time Zone:              ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  termPrint(`System Up Time:         ${Math.floor(performance.now() / 1000)} seconds`);
  termPrint('');
};

const cmdPing = (args) => {
  if (!args || !args.trim()) {
    termPrint('Usage: ping <hostname>');
    return;
  }
  const host = args.trim();
  let url = host;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  // Ensure trailing slash on bare hostnames so cache-buster query attaches correctly
  if (url.replace(/^https?:\/\//i, '').indexOf('/') === -1) url += '/';

  termPrint('');
  termPrint(`Pinging ${host} ...`);
  termPrint('');

  let count = 0;
  const times = [];
  let lost = 0;
  termInput.disabled = true;

  const sendPing = async () => {
    if (count >= 4) {
      termPrint('');
      termPrint(`Ping statistics for ${host}:`);
      const received = times.length;
      const lossPercent = Math.round((lost / 4) * 100);
      termPrint(`    Packets: Sent = 4, Received = ${received}, Lost = ${lost} (${lossPercent}% loss)`);
      if (times.length > 0) {
        const min = Math.min.apply(null, times);
        const max = Math.max.apply(null, times);
        const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        termPrint('Approximate round trip times in milli-seconds:');
        termPrint(`    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`);
      }
      termPrint('');
      termPrint('Note: HTTP round-trip time (not ICMP). Includes DNS + TLS overhead.', '#888');
      termPrint('');
      termInput.disabled = false;
      termInput.focus();
      return;
    }
    const seq = count + 1;
    const t0 = performance.now();
    const sep = url.indexOf('?') !== -1 ? '&' : '?';
    try {
      await fetch(`${url}${sep}_cb=${Date.now()}`, { mode: 'no-cors', cache: 'no-store' });
      const ms = Math.round(performance.now() - t0);
      times.push(ms);
      termPrint(`Reply from ${host}: seq=${seq} time=${ms}ms`);
    } catch {
      lost++;
      termPrint(`Request timed out. seq=${seq}`);
    } finally {
      count++;
      setTimeout(sendPing, 1000);
    }
  };

  setTimeout(sendPing, 300);
};

const cmdIpconfig = () => {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  termPrint('');
  termPrint('mpOS IP Configuration');
  termPrint('');
  termPrint(`   Online Status . . . . . . : ${navigator.onLine ? 'Connected' : 'Disconnected'}`);
  if (conn) {
    termPrint(`   Effective Type  . . . . . : ${conn.effectiveType || 'Unknown'}`);
    termPrint(`   Downlink  . . . . . . . . : ${conn.downlink != null ? conn.downlink + ' Mbps' : 'Unknown'}`);
    termPrint(`   RTT . . . . . . . . . . . : ${conn.rtt != null ? conn.rtt + ' ms' : 'Unknown'}`);
    termPrint(`   Save Data . . . . . . . . : ${conn.saveData ? 'Enabled' : 'Disabled'}`);
  } else {
    termPrint('   Connection Info . . . . . : Not available (Chromium-only API)');
  }
  termPrint('');
  termPrint('Browser-reported values. Connection metrics are Chromium-only estimates.', '#888');
  termPrint('');
};

const cmdNetstat = () => {
  const WINDOW_NAMES = window.WINDOW_NAMES;
  termPrint('');
  termPrint('Active mpOS Connections');
  termPrint('');
  const header = `  Proto  ${'Local Address'.padEnd(24)}${'Foreign Address'.padEnd(40)}State`;
  termPrint(header);
  termPrint(`  ${'-'.repeat(header.length - 2)}`);

  let found = false;
  const names = Object.keys(WINDOW_NAMES);
  for (let i = 0; i < names.length; i++) {
    const id = names[i];
    if (!NET_ENDPOINTS[id]) continue;
    const win = document.getElementById(id);
    if (win && win.style.display !== 'none') {
      const local = `0.0.0.0:${49152 + i}`;
      const foreign = NET_ENDPOINTS[id];
      termPrint(`  TCP    ${local.padEnd(24)}${foreign.padEnd(40)}ESTABLISHED`);
      found = true;
    }
  }

  if (!found) {
    termPrint('  No active network connections.');
  }

  termPrint('');
  termPrint('Showing mpOS application connections. Not reading OS network sockets.', '#888');
  termPrint('');
};

const cmdColor = (args) => {
  const term = document.querySelector('#run .term');
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
  if (attr.length === 1) attr = `0${attr}`;
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
  termSaveState();
};

const cmdTitle = (args) => {
  const titleSpan = document.querySelector('#run .titlebar span');
  if (!args || !args.trim()) {
    termPrint('Sets the window title.\n');
    termPrint('TITLE [string]');
    return;
  }
  titleSpan.textContent = args.trim();
  termSaveState();
};

const cmdTasklist = () => {
  const WINDOW_NAMES = window.WINDOW_NAMES;
  termPrint('');
  termPrint(`${'Image Name'.padEnd(28)}${'PID'.padEnd(10)}Status`);
  termPrint(`${'='.repeat(27)} ${'='.repeat(9)} ${'='.repeat(10)}`);

  let pid = 1000;
  Object.keys(WINDOW_NAMES).forEach(id => {
    const win = document.getElementById(id);
    if (win && win.style.display !== 'none') {
      const name = `${WINDOW_NAMES[id]}.exe`.padEnd(28);
      const pidStr = String(pid).padEnd(10);
      termPrint(`${name}${pidStr}Running`);
      pid += 4;
    }
  });
  termPrint('');
};

const cmdTaskkill = (args) => {
  const WINDOW_NAMES = window.WINDOW_NAMES;
  if (!args || !args.trim()) {
    termPrint('Usage: taskkill <appname>');
    return;
  }
  const target = args.trim().toLowerCase().replace(/\.exe$/, '');
  let found = false;

  Object.keys(WINDOW_NAMES).forEach(id => {
    if (found) return;
    const name = WINDOW_NAMES[id].toLowerCase();
    if (name === target || id === target) {
      const win = document.getElementById(id);
      if (win && win.style.display !== 'none') {
        if (id === 'mycomputer') window.closeMyComputer();
        else mpTaskbar.closeWindow(id);
        termPrint(`SUCCESS: Sent termination signal to "${WINDOW_NAMES[id]}.exe".`);
        found = true;
      }
    }
  });

  if (!found) {
    termPrint(`ERROR: The process "${args.trim()}" not found.`);
  }
};

const cmdStart = (args) => {
  if (!args || !args.trim()) {
    termPrint('Usage: start <command>');
    return;
  }
  const name = args.trim().toLowerCase();
  if (COMMANDS[name]) {
    COMMANDS[name].run('');
    termPrint(`Started "${name}".`);
  } else {
    termPrint(`'${name}' is not recognized as a launchable program.`);
  }
};


/* ═══════════════════════════════════════════════════════════
   Matrix animation
   ═══════════════════════════════════════════════════════════ */

const cmdMatrix = () => {
  const term = document.querySelector('#run .term');
  const existing = term.querySelector('.matrix-canvas');
  if (existing) { stopMatrix(); return; }
  const canvas = document.createElement('canvas');
  canvas.className = 'matrix-canvas';
  canvas.width = term.offsetWidth;
  canvas.height = term.offsetHeight;
  term.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const fontSize = 14;
  const cols = Math.floor(canvas.width / fontSize);
  const drops = [];
  for (let i = 0; i < cols; i++) drops[i] = Math.random() * -20 | 0;
  let matrixRunning = true;
  let matrixLast = 0;
  const matrixLoop = (time) => {
    if (!matrixRunning) return;
    matrixInterval = requestAnimationFrame(matrixLoop);
    if (time - matrixLast < 50) return;
    matrixLast = time;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = `${fontSize}px monospace`;
    for (let i = 0; i < cols; i++) {
      const ch = Math.random() > 0.5 ? '1' : '0';
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  };
  matrixInterval = requestAnimationFrame(matrixLoop);
  canvas.addEventListener('click', stopMatrix);
};

const stopMatrix = () => {
  if (matrixInterval) { cancelAnimationFrame(matrixInterval); matrixInterval = null; }
  const c = document.querySelector('#run .matrix-canvas');
  if (c) c.remove();
};


/* ═══════════════════════════════════════════════════════════
   Top — process viewer overlay
   ═══════════════════════════════════════════════════════════ */

const stopTop = () => {
  if (topInterval) { clearInterval(topInterval); topInterval = null; }
  if (topKeyHandler) { document.removeEventListener('keydown', topKeyHandler); topKeyHandler = null; }
  const el = document.querySelector('#run .top-overlay');
  if (el) el.remove();
  termInput.disabled = false;
  termInput.focus();
};

const cmdTop = () => {
  const WINDOW_NAMES = window.WINDOW_NAMES;
  const term = document.querySelector('#run .term');
  const existing = term.querySelector('.top-overlay');
  if (existing) { stopTop(); return; }

  termInput.disabled = true;

  const overlay = document.createElement('div');
  overlay.className = 'top-overlay';
  const pre = document.createElement('pre');
  pre.className = 'top-pre';
  overlay.appendChild(pre);
  term.appendChild(overlay);

  const refreshTop = () => {
    const ms = performance.now();
    const secs = Math.floor(ms / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const uptimeStr = `${padTwo(h)}:${padTwo(m)}:${padTwo(s)}`;
    const now = new Date();
    const timeStr = `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}:${padTwo(now.getSeconds())}`;

    const lines = [];
    lines.push(`top - ${timeStr}  up ${uptimeStr}  mpOS 1.9.9`);
    lines.push('');
    lines.push('  PID  STATUS     CPU%  MEM    PROCESS');
    lines.push('  ---  ---------  ----  -----  -------------------------');

    let pid = 1000;
    Object.keys(WINDOW_NAMES).forEach(id => {
      const win = document.getElementById(id);
      if (win && win.style.display !== 'none') {
        const name = `${WINDOW_NAMES[id]}.exe`;
        const cpu = (Math.random() * 8).toFixed(1);
        const mem = `${(Math.random() * 50 + 5).toFixed(0)}K`;
        lines.push(`  ${String(pid).padEnd(5)}Running    ${String(cpu).padStart(4)}  ${mem.padStart(5)}  ${name}`);
        pid += 4;
      }
    });

    lines.push('');
    lines.push('  Press Q to quit');
    pre.textContent = lines.join('\n');
  };

  refreshTop();
  topInterval = setInterval(refreshTop, 2000);

  topKeyHandler = (e) => {
    if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      stopTop();
    }
  };
  document.addEventListener('keydown', topKeyHandler);
};


/* ═══════════════════════════════════════════════════════════
   Edit — in-terminal text editor
   ═══════════════════════════════════════════════════════════ */

const stopEdit = () => {
  const el = document.querySelector('#run .edit-overlay');
  if (el) el.remove();
  editFilename = null;
  termInput.disabled = false;
  termInput.focus();
};

const editSave = (textarea) => {
  if (!editFilename) return;
  const cur = FILESYSTEM[termCwd];
  if (!cur) return;
  if (!cur.files) cur.files = [];
  const content = textarea.value.slice(0, TERM_MAX_FILE_SIZE);
  const file = cur.files.find(f => f.name.toLowerCase() === editFilename.toLowerCase());
  if (file) {
    file.content = content;
    file.size = content.length;
  } else {
    if (termCountFiles() >= TERM_MAX_FILES) return;
    cur.files.push({ name: editFilename, content, size: content.length });
  }
  termSaveState();
};

const cmdEdit = (args) => {
  if (!args || !args.trim()) {
    termPrint('Usage: edit <filename>');
    return;
  }
  const filename = args.trim();
  editFilename = filename;

  const cur = FILESYSTEM[termCwd];
  let content = '';
  if (cur && cur.files) {
    const file = cur.files.find(f => f.name.toLowerCase() === filename.toLowerCase());
    if (file) content = file.content;
  }

  termInput.disabled = true;

  const term = document.querySelector('#run .term');
  const overlay = document.createElement('div');
  overlay.className = 'edit-overlay';

  const titlebar = document.createElement('div');
  titlebar.className = 'edit-statusbar';
  titlebar.textContent = `  mpOS Editor - ${filename}`;
  overlay.appendChild(titlebar);

  const textarea = document.createElement('textarea');
  textarea.className = 'edit-textarea';
  textarea.value = content;
  textarea.spellcheck = false;
  overlay.appendChild(textarea);

  const statusbar = document.createElement('div');
  statusbar.className = 'edit-statusbar';
  statusbar.textContent = '  ^S Save   ^X Exit   Esc Exit';
  overlay.appendChild(statusbar);

  term.appendChild(overlay);
  textarea.focus();

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      stopEdit();
      return;
    }
    if (e.ctrlKey && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      stopEdit();
      return;
    }
    if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      editSave(textarea);
      statusbar.textContent = '  Saved! | ^S Save   ^X Exit   Esc Exit';
      setTimeout(() => {
        statusbar.textContent = '  ^S Save   ^X Exit   Esc Exit';
      }, 1500);
      return;
    }
  });
};


/* ═══════════════════════════════════════════════════════════
   Help groups & command registry
   ═══════════════════════════════════════════════════════════ */

const HELP_GROUPS = {
  'NAVIGATION': ['cd', 'dir', 'ls', 'tree', 'pwd'],
  'FILES':      ['type', 'cat', 'echo', 'touch', 'rm', 'edit', 'nano'],
  'SYSTEM':     ['systeminfo', 'whoami', 'hostname', 'ver', 'date', 'time', 'tasklist', 'taskkill', 'uptime', 'top', 'neofetch', 'ipconfig', 'netstat', 'degauss'],
  'PROGRAMS':   [],
  'TERMINAL':   ['cls', 'color', 'title', 'start', 'ping', 'matrix', 'help', 'exit', 'history', 'fortune', 'curl', 'fetch']
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
  'ping':        { run: cmdPing,        desc: 'Measure latency to a host' },
  'color':       { run: cmdColor,       desc: 'Set terminal colors' },
  'title':       { run: cmdTitle,       desc: 'Set terminal window title' },
  'tasklist':    { run: cmdTasklist,     desc: 'List running applications' },
  'taskkill':    { run: cmdTaskkill,     desc: 'Close a running application' },
  'start':       { run: cmdStart,        desc: 'Launch an application' },
  'ontarget':    { run: () => window.openOnTarget(),    desc: 'Launch On Target' },
  'fishofday':   { run: () => window.openFishOfDay(),   desc: 'Launch Fish of the Day' },
  'fishfinder':  { run: () => window.openFishFinder(),  desc: 'Launch Fish Finder' },
  'aquarium':    { run: () => window.openAquarium(),    desc: 'Launch Virtual Aquarium' },
  'browser':     { run: () => window.openBrowser(),     desc: 'Launch WikiBrowser' },
  'archive':     { run: () => window.openArchiveBrowser(), desc: 'Launch Archive Browser' },
  'archivebrowser': { run: () => window.openArchiveBrowser(), desc: 'Launch Archive Browser' },
  'mycomputer':  { run: () => { window.openMyComputer(); }, desc: 'Open System Properties' },
  'explorer':    { run: () => window.openExplorer(),    desc: 'Open Files' },
  'programs':    { run: () => { window.openExplorerTo('programs'); },     desc: 'Open Programs folder' },
  'games':       { run: () => { window.openExplorerTo('games'); },       desc: 'Open Games folder' },
  'internet':    { run: () => { window.openExplorerTo('internet'); },    desc: 'Open Internet folder' },
  'accessories': { run: () => { window.openExplorerTo('accessories'); }, desc: 'Open Accessories folder' },
  'audio':       { run: () => { window.openExplorerTo('audio'); },       desc: 'Open Audio folder' },
  'documents':   { run: () => { window.openExplorerTo('documents'); },   desc: 'Open Documents folder' },
  'utilities':   { run: () => { window.openExplorerTo('utilities'); },   desc: 'Open Utilities folder' },
  'notepad':     { run: () => window.openNotepad(),     desc: 'Open Notepad' },
  'calculator':  { run: () => window.openCalculator(),  desc: 'Open Calculator' },
  'calendar':    { run: () => window.openCalendar(),    desc: 'Open Calendar' },
  'timezone':    { run: () => window.openTimeZone(),    desc: 'Open Time Zone' },
  'weather':     { run: () => window.openWeather(),     desc: 'Open Weather' },
  'diskusage':   { run: () => window.openDiskUsage(),  desc: 'Open Disk Usage' },
  'paint':       { run: () => window.openPaint(),     desc: 'Open Paint' },
  'brickbreaker': { run: () => window.openBrickBreaker(), desc: 'Launch Brick Breaker' },
  'visitormap':  { run: () => window.openVisitorMap(), desc: 'Open Visitor Map' },
  'hh':          { run: () => window.openHelp(),       desc: 'Open mpOS Help' },
  'cls':         { run: cmdCls,          desc: 'Clear the screen' },
  'clear':       { run: cmdCls,          desc: 'Clear the screen' },
  'exit':        { run: () => { closeRun(); }, desc: 'Close this window' },
  'ver':         { run: cmdVer,          desc: 'Show version' },
  'matrix':      { run: cmdMatrix,       desc: 'Toggle matrix animation' },
  'taskmanager': { run: () => window.openTaskManager(), desc: 'Open Task Manager' },
  'search':      { run: () => window.openSearch(),      desc: 'Open Search Results' },
  'pwd':         { run: cmdPwd,          desc: 'Print working directory' },
  'cat':         { run: cmdType,         desc: 'Display the contents of a file' },
  'uptime':      { run: cmdUptime,       desc: 'Show system uptime' },
  'history':     { run: cmdHistory,      desc: 'Show command history' },
  'touch':       { run: cmdTouch,        desc: 'Create an empty file' },
  'rm':          { run: cmdRm,           desc: 'Delete a file' },
  'fortune':     { run: cmdFortune,      desc: 'Display a random quote' },
  'neofetch':    { run: cmdNeofetch,     desc: 'Display system info with logo' },
  'curl':        { run: cmdCurl,         desc: 'Fetch a URL' },
  'fetch':       { run: cmdCurl,         desc: 'Fetch a URL' },
  'top':         { run: cmdTop,          desc: 'Process viewer' },
  'edit':        { run: cmdEdit,         desc: 'Text editor' },
  'nano':        { run: cmdEdit,         desc: 'Text editor' },
  'ipconfig':    { run: cmdIpconfig,    desc: 'Display network configuration' },
  'ifconfig':    { run: cmdIpconfig,    desc: 'Display network configuration' },
  'netstat':     { run: cmdNetstat,     desc: 'Display active connections' },
  'noisemixer':  { run: () => window.openNoiseMixer(), desc: 'Open White Noise Mixer' },
  'cryptography': { run: () => window.openCryptography(), desc: 'Open Cryptography' },
  'neotracker':   { run: () => window.openNeoTracker(),   desc: 'Launch NEO Tracker' },
  'tuningfork':   { run: () => window.openTuningFork(),   desc: 'Launch Tuning Fork' },
  'fractal':      { run: () => window.openFractal(),      desc: 'Launch Fractal Explorer' },
  'slotmachine':  { run: () => window.openSlotMachine(),  desc: 'Launch Slot Machine' },
  'degauss':      { run: () => { termPrint('Degaussing display...'); setTimeout(() => window.degauss?.(), 300); }, desc: 'Degauss the CRT display' }
};


/* ═══════════════════════════════════════════════════════════
   Open / Close Run window
   ═══════════════════════════════════════════════════════════ */

const openRun = () => {
  openWindow('run');
  termRestoreState();
  termCwd = 'C:\\mpOS';
  document.querySelector('#run .term-prompt').textContent = 'C:\\mpOS> ';
  termHistoryIndex = -1;
  termSavedInput = '';
  tabMatches = [];
  tabIndex = -1;
  if (termOutput.children.length === 0) {
    cmdVer();
    termPrint('Type HELP for a list of available commands.\n');
  }
  termInput.value = '';
  termInput.disabled = false;
  setTimeout(() => { termInput.focus(); }, 100);
};

const closeRun = () => {
  stopMatrix();
  stopTop();
  stopEdit();
  termSaveState();
  termCwd = 'C:\\mpOS';
  termHistoryIndex = -1;
  termSavedInput = '';
  tabMatches = [];
  tabIndex = -1;
  termInput.disabled = false;
  mpTaskbar.closeWindow('run');
};


/* ═══════════════════════════════════════════════════════════
   Terminal input handler — keydown on termInput
   ═══════════════════════════════════════════════════════════ */

termInput.addEventListener('keydown', (e) => {
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
    const val = termInput.value;

    if (tabMatches.length === 0) {
      /* Build match list */
      const prefix = val.toLowerCase();
      const matches = [];

      /* Command names */
      Object.keys(COMMANDS).forEach(name => {
        if (name === 'clear') return;
        if (name.indexOf(prefix) === 0) matches.push(name);
      });

      /* Current dir entries */
      const cur = FILESYSTEM[termCwd];
      if (cur) {
        if (cur.children) {
          cur.children.forEach(c => {
            if (c.toLowerCase().indexOf(prefix) === 0) matches.push(c);
          });
        }
        if (cur.items) {
          cur.items.forEach(item => {
            if (item.name.toLowerCase().indexOf(prefix) === 0) matches.push(item.name);
          });
        }
        if (cur.files) {
          cur.files.forEach(f => {
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
  const raw = termInput.value.trim();
  termInput.value = '';
  termPrint(`${termCwd}> ${raw}`);
  if (!raw) return;

  /* Push to history */
  if (termHistory.length === 0 || termHistory[termHistory.length - 1] !== raw) {
    termHistory.push(raw);
    if (termHistory.length > TERM_MAX_HISTORY) termHistory.shift();
    termSaveState();
  }
  termHistoryIndex = -1;
  termSavedInput = '';

  const parts = raw.match(/^(\S+)\s*(.*)?$/);
  const cmd = parts[1].toLowerCase();
  const args = parts[2] || '';
  if (COMMANDS[cmd]) {
    COMMANDS[cmd].run(args);
  } else {
    termPrint(`'${raw}' is not recognized as an internal or external command,\noperable program or batch file.\n`);
  }
});


/* ═══════════════════════════════════════════════════════════
   Registration — hook into core maps
   ═══════════════════════════════════════════════════════════ */

mpRegisterCommands(COMMANDS);

mpRegisterWindows({
  run: 'Run'
});

mpRegisterCloseHandlers({
  run: closeRun
});

/* ── Exports to window (for inline onclick handlers + cross-module) ── */
window.openRun = openRun;
window.closeRun = closeRun;
window.FILESYSTEM = FILESYSTEM;

/* ── Restore terminal state on page load ── */
termRestoreState();

})();
