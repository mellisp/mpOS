/* System Properties (My Computer) — tabs, display, screensaver, regional */
(function () {
  'use strict';

  /* ── Globals from other modules ── */
  const { openWindow, mpTaskbar, t, tPlural, getLang, setLanguage } = window;

  /* ── State ── */
  let mcCurrentTab = 'general';

  const displaySettings = { backgroundColor: '#3a6ea5', wallpaper: 'none' };
  const ssSettings     = { enabled: true, type: 'starfield', timeout: 2 };
  let ssIdleTimer          = null;
  let ssLastActivity       = Date.now();
  let ssActive             = false;
  let ssPreviewInterval    = null;
  let ssFullscreenInterval = null;
  let ssOverlayFirstMove   = true;

  /* ── Open / Close / Tab switching ── */

  const openMyComputer = () => {
    openWindow('mycomputer');
    const body = document.getElementById('mcTabBody');
    if (!body.dataset.initialized) {
      body.dataset.initialized = '1';
      mcSwitchTab(mcCurrentTab);
    } else if (mcCurrentTab === 'screensaver') {
      // Restart preview if returning to screensaver tab after window was closed
      const canvas = document.getElementById('ssPreviewCanvas');
      if (canvas && !ssPreviewInterval) ssUpdatePreview(canvas);
    }
  };

  const closeMyComputer = () => {
    ssStopPreview();
    mpTaskbar.closeWindow('mycomputer');
  };

  const mcSwitchTab = (tab) => {
    mcCurrentTab = tab;
    const tabs = {
      general: 'mcTabGeneral',
      display: 'mcTabDisplay',
      screensaver: 'mcTabScreenSaver',
      regional: 'mcTabRegional'
    };
    for (const key in tabs) {
      document.getElementById(tabs[key]).classList.toggle('active', key === tab);
    }
    ssStopPreview();
    const body = document.getElementById('mcTabBody');
    body.textContent = '';
    if (tab === 'general')        mcBuildGeneral(body);
    else if (tab === 'display')   mcBuildDisplay(body);
    else if (tab === 'screensaver') mcBuildScreenSaver(body);
    else if (tab === 'regional')  mcBuildRegional(body);
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  General tab (former populateSysInfo)
   * ════════════════════════════════════════════════════════════════════════ */

  let mcGeneralFrag = null;

  const mcBuildGeneral = (body) => {
    if (mcGeneralFrag) {
      body.appendChild(mcGeneralFrag.cloneNode(true));
      return;
    }

    const ua  = navigator.userAgent;
    const nav = navigator;
    const scr = screen;

    const makeSection = (title, rows) => {
      const valid = rows.filter(r => r[1] != null);
      if (!valid.length) return null;
      const frag = document.createDocumentFragment();
      const titleEl = document.createElement('div');
      titleEl.className = 'section-title';
      titleEl.textContent = title;
      frag.appendChild(titleEl);
      const sunken = document.createElement('div');
      sunken.className = 'sunken';
      const table = document.createElement('table');
      table.className = 'sysinfo-table';
      valid.forEach(r => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = r[0];
        tr.appendChild(th);
        const td = document.createElement('td');
        td.textContent = r[1];
        tr.appendChild(td);
        table.appendChild(tr);
      });
      sunken.appendChild(table);
      frag.appendChild(sunken);
      return frag;
    };

    let os = null;
    if (/Windows/.test(ua))        os = 'Windows';
    else if (/Mac OS X/.test(ua))  os = 'macOS';
    else if (/Android/.test(ua))   os = 'Android';
    else if (/iPhone|iPad/.test(ua)) os = 'iOS';
    else if (/CrOS/.test(ua))      os = 'Chrome OS';
    else if (/Linux/.test(ua))     os = 'Linux';

    let browser = null;
    if (/Edg\//.test(ua))                                browser = 'Microsoft Edge';
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Google Chrome';
    else if (/Firefox\//.test(ua))                        browser = 'Mozilla Firefox';
    else if (/Safari\//.test(ua) && !/Chrome/.test(ua))   browser = 'Apple Safari';

    const container = document.createElement('div');

    // Hero section — SVG is hardcoded so innerHTML on a detached element is safe
    const hero = document.createElement('div');
    hero.className = 'sysinfo-hero';
    hero.innerHTML =
      '<svg width="80" height="80" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">' +
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
      const osEl = document.createElement('div');
      osEl.className = 'sysinfo-os';
      osEl.textContent = os;
      hero.appendChild(osEl);
    }
    if (browser) {
      const brEl = document.createElement('div');
      brEl.className = 'sysinfo-browser';
      brEl.textContent = browser;
      hero.appendChild(brEl);
    }
    container.appendChild(hero);

    const sep = document.createElement('div');
    sep.className = 'separator';
    container.appendChild(sep);

    const sysSection = makeSection(t('mc.general.system'), [
      [t('mc.general.cpuCores'), nav.hardwareConcurrency ? t('mc.general.logicalProcessors', { count: nav.hardwareConcurrency }) : null],
      [t('mc.general.language'), nav.language || null]
    ]);
    if (sysSection) container.appendChild(sysSection);

    const dpr = window.devicePixelRatio || 1;
    const dispSection = makeSection(t('mc.general.display'), [
      [t('mc.general.resolution'), `${scr.width} \u00d7 ${scr.height}`],
      [t('mc.general.pixelRatio'), `${dpr}x${dpr > 1 ? ' ' + t('mc.general.hidpi') : ''}`]
    ]);
    if (dispSection) container.appendChild(dispSection);

    const netContainer = document.createElement('div');
    container.appendChild(netContainer);
    const batContainer = document.createElement('div');
    container.appendChild(batContainer);

    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
      const netRows = [];
      if (conn.effectiveType) netRows.push([t('mc.general.type'), conn.effectiveType.toUpperCase()]);
      else if (conn.type)     netRows.push([t('mc.general.type'), conn.type]);
      if (conn.downlink)      netRows.push([t('mc.general.downlink'), `${conn.downlink} Mbps`]);
      const netSection = makeSection(t('mc.general.network'), netRows);
      if (netSection) netContainer.appendChild(netSection);
    }

    if (nav.getBattery) {
      (async () => {
        const bat = await nav.getBattery();
        const batSection = makeSection(t('mc.general.battery'), [
          [t('mc.general.level'), `${Math.round(bat.level * 100)}%`],
          [t('mc.general.charging'), bat.charging ? t('ui.yes') : t('ui.no')]
        ]);
        if (batSection) batContainer.appendChild(batSection);
        // Update cache after async battery info
        mcGeneralFrag = container.cloneNode(true);
      })();
    }

    mcGeneralFrag = container.cloneNode(true);
    body.appendChild(container);
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Display tab
   * ════════════════════════════════════════════════════════════════════════ */

  const mcBuildDisplay = (body) => {
    // Background Color section
    const colorLabel = document.createElement('div');
    colorLabel.className = 'display-section-label';
    colorLabel.textContent = t('mc.display.bgColor');
    body.appendChild(colorLabel);

    const colorRow = document.createElement('div');
    colorRow.className = 'display-color-row';

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'display-color-picker';
    picker.value = displaySettings.backgroundColor;
    colorRow.appendChild(picker);

    const hexSpan = document.createElement('span');
    hexSpan.className = 'display-color-hex';
    hexSpan.textContent = displaySettings.backgroundColor;
    colorRow.appendChild(hexSpan);

    picker.addEventListener('input', () => {
      displaySettings.backgroundColor = picker.value;
      hexSpan.textContent = picker.value;
      applyDisplaySettings();
      mcSaveSettings();
    });

    body.appendChild(colorRow);

    // Wallpaper section
    const wpLabel = document.createElement('div');
    wpLabel.className = 'display-section-label';
    wpLabel.textContent = t('mc.display.wallpaper');
    body.appendChild(wpLabel);

    const grid = document.createElement('div');
    grid.className = 'wallpaper-grid';

    const wallpapers = ['none', 'sunset', 'dots', 'grid', 'diagonal', 'waves'];
    const wallpaperNames = {
      none: t('mc.display.wp.none'),
      sunset: t('mc.display.wp.sunset'),
      dots: t('mc.display.wp.dots'),
      grid: t('mc.display.wp.grid'),
      diagonal: t('mc.display.wp.diagonal'),
      waves: t('mc.display.wp.waves')
    };
    const wpBtns = [];

    wallpapers.forEach(id => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `wallpaper-btn${displaySettings.wallpaper === id ? ' active' : ''}`;

      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 60;
      canvas.className = 'wallpaper-preview';
      drawWallpaperPreview(canvas, id);
      btn.appendChild(canvas);

      const label = document.createElement('span');
      label.textContent = wallpaperNames[id];
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        displaySettings.wallpaper = id;
        wpBtns.forEach(b => { b.classList.toggle('active', b === btn); });
        applyDisplaySettings();
        mcSaveSettings();
      });

      wpBtns.push(btn);
      grid.appendChild(btn);
    });

    body.appendChild(grid);

    // Degauss + Reset Defaults row
    const resetRow = document.createElement('div');
    resetRow.style.cssText = 'margin-top: 12px; display: flex; justify-content: flex-end; gap: 8px;';

    const degaussBtn = document.createElement('button');
    degaussBtn.className = 'degauss-btn';
    degaussBtn.textContent = t('mc.display.degauss');
    degaussBtn.addEventListener('click', degauss);
    resetRow.appendChild(degaussBtn);

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn';
    resetBtn.textContent = t('mc.display.resetDefaults');
    resetBtn.addEventListener('click', () => {
      displaySettings.backgroundColor = '#3a6ea5';
      displaySettings.wallpaper = 'none';
      applyDisplaySettings();
      mcSaveSettings();
      localStorage.removeItem(window.ICON_POSITION_KEY);
      if (window.initDesktopIcons) window.initDesktopIcons();
      mcSwitchTab('display');
    });
    resetRow.appendChild(resetBtn);
    body.appendChild(resetRow);
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Wallpaper rendering
   * ════════════════════════════════════════════════════════════════════════ */

  const drawWallpaperPreview = (canvas, id) => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = displaySettings.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    if (id === 'none') return;

    if (id === 'sunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
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
      const spacing = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      for (let dy = spacing; dy < h; dy += spacing) {
        for (let dx = spacing; dx < w; dx += spacing) {
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
      const step = 10;
      for (let x = step; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (id === 'diagonal') {
      const spacing = 12;
      for (let d = -h; d < w + h; d += spacing) {
        ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke();
      }
    } else if (id === 'waves') {
      for (let row = 10; row < h; row += 12) {
        ctx.beginPath();
        ctx.moveTo(0, row);
        for (let wx = 0; wx < w; wx += 2) {
          ctx.lineTo(wx, row + Math.sin(wx * 0.15 + row * 0.1) * 4);
        }
        ctx.stroke();
      }
    }
  };

  const drawFullWallpaper = (canvas, id) => {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = displaySettings.backgroundColor;
    ctx.fillRect(0, 0, w, h);

    if (id === 'none') return;

    if (id === 'sunset') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
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
      const spacing = 40;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let dy = spacing; dy < h; dy += spacing) {
        for (let dx = spacing; dx < w; dx += spacing) {
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
      const step = 40;
      for (let x = step; x < w; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    } else if (id === 'diagonal') {
      const spacing = 50;
      for (let d = -h; d < w + h; d += spacing) {
        ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + h, h); ctx.stroke();
      }
    } else if (id === 'waves') {
      for (let row = 20; row < h; row += 40) {
        ctx.beginPath();
        ctx.moveTo(0, row);
        for (let wx = 0; wx < w; wx += 2) {
          ctx.lineTo(wx, row + Math.sin(wx * 0.04 + row * 0.02) * 15);
        }
        ctx.stroke();
      }
    }
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Apply display settings to desktop
   * ════════════════════════════════════════════════════════════════════════ */

  const applyDisplaySettings = () => {
    document.documentElement.style.setProperty('--desktop', displaySettings.backgroundColor);
    const desktopArea = document.querySelector('.desktop-area');
    if (!desktopArea) return;
    const existing = desktopArea.querySelector('.wallpaper-canvas');
    if (displaySettings.wallpaper === 'none') {
      if (existing) existing.remove();
      return;
    }
    let canvas;
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
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Screen Saver tab
   * ════════════════════════════════════════════════════════════════════════ */

  const SS_TYPES = [
    { id: 'starfield',  _key: 'mc.ss.starfield' },
    { id: 'pipes',      _key: 'mc.ss.pipes' },
    { id: 'bouncing',   _key: 'mc.ss.bouncing' },
    { id: 'colorcycle', _key: 'mc.ss.colorcycle' },
    { id: 'mystify',    _key: 'mc.ss.mystify' }
  ];

  const mcBuildScreenSaver = (body) => {
    // Screensaver picker
    const row1 = document.createElement('div');
    row1.className = 'ss-row';
    const lbl = document.createElement('label');
    lbl.textContent = t('mc.ss.label');
    row1.appendChild(lbl);

    const sel = document.createElement('select');
    sel.className = 'ss-select';
    SS_TYPES.forEach(ssType => {
      const opt = document.createElement('option');
      opt.value = ssType.id;
      opt.textContent = t(ssType._key);
      if (ssType.id === ssSettings.type) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => {
      ssSettings.type = sel.value;
      ssUpdatePreview(previewCanvas);
      mcSaveSettings();
    });
    row1.appendChild(sel);
    body.appendChild(row1);

    // Preview canvas
    const wrap = document.createElement('div');
    wrap.className = 'ss-preview-wrap';
    const previewCanvas = document.createElement('canvas');
    previewCanvas.width = 320;
    previewCanvas.height = 180;
    previewCanvas.className = 'ss-preview-canvas';
    previewCanvas.id = 'ssPreviewCanvas';
    wrap.appendChild(previewCanvas);
    body.appendChild(wrap);

    // Timeout row
    const row2 = document.createElement('div');
    row2.className = 'ss-row';
    const waitLbl = document.createElement('label');
    waitLbl.textContent = t('mc.ss.wait');
    row2.appendChild(waitLbl);

    const waitSel = document.createElement('select');
    waitSel.className = 'ss-select';
    [1, 2, 3, 5].forEach(m => {
      const opt = document.createElement('option');
      opt.value = String(m);
      opt.textContent = tPlural('mc.ss.minute', m);
      if (m === ssSettings.timeout) opt.selected = true;
      waitSel.appendChild(opt);
    });
    waitSel.addEventListener('change', () => {
      ssSettings.timeout = parseInt(waitSel.value, 10);
      ssResetIdleTimer();
      mcSaveSettings();
    });
    row2.appendChild(waitSel);
    body.appendChild(row2);

    // Enable checkbox
    const row3 = document.createElement('div');
    row3.className = 'ss-row';
    const chkLabel = document.createElement('label');
    chkLabel.className = 'ss-checkbox-label';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = ssSettings.enabled;
    chk.addEventListener('change', () => {
      ssSettings.enabled = chk.checked;
      ssResetIdleTimer();
      mcSaveSettings();
    });
    chkLabel.appendChild(chk);
    chkLabel.appendChild(document.createTextNode(` ${t('mc.ss.enable')}`));
    row3.appendChild(chkLabel);
    body.appendChild(row3);

    // Start preview
    ssUpdatePreview(previewCanvas);
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Regional tab
   * ════════════════════════════════════════════════════════════════════════ */

  const mcBuildRegional = (body) => {
    // Language section
    const langLabel = document.createElement('div');
    langLabel.className = 'display-section-label';
    langLabel.textContent = t('mc.regional.language');
    body.appendChild(langLabel);

    const cur = getLang();
    const langs = [
      { code: 'en', label: t('mc.regional.english') },
      { code: 'pt', label: t('mc.regional.portuguese') }
    ];
    langs.forEach(l => {
      const opt = document.createElement('label');
      opt.className = 'regional-lang-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'mpLang';
      radio.value = l.code;
      if (l.code === cur) radio.checked = true;
      radio.addEventListener('change', () => {
        setLanguage(l.code);
      });
      opt.appendChild(radio);
      opt.appendChild(document.createTextNode(l.label));
      body.appendChild(opt);
    });

    // Clock format section
    const clockLabel = document.createElement('div');
    clockLabel.className = 'display-section-label';
    clockLabel.style.marginTop = '12px';
    clockLabel.textContent = t('mc.regional.clock');
    body.appendChild(clockLabel);

    const curFmt = localStorage.getItem('mp-clock') || '12';
    const fmts = [
      { code: '12', label: t('mc.regional.12hr') },
      { code: '24', label: t('mc.regional.24hr') }
    ];
    fmts.forEach(f => {
      const opt = document.createElement('label');
      opt.className = 'regional-lang-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'mpClock';
      radio.value = f.code;
      if (f.code === curFmt) radio.checked = true;
      radio.addEventListener('change', () => {
        localStorage.setItem('mp-clock', f.code);
        if (window.mpClockUpdate) window.mpClockUpdate();
      });
      opt.appendChild(radio);
      opt.appendChild(document.createTextNode(f.label));
      body.appendChild(opt);
    });

    // Date format section
    const dateLabel = document.createElement('div');
    dateLabel.className = 'display-section-label';
    dateLabel.style.marginTop = '12px';
    dateLabel.textContent = t('mc.regional.date');
    body.appendChild(dateLabel);

    const curDate = localStorage.getItem('mp-datefmt') || 'mdy';
    const dateFmts = [
      { code: 'mdy', label: t('mc.regional.mdy') },
      { code: 'dmy', label: t('mc.regional.dmy') },
      { code: 'ymd', label: t('mc.regional.ymd') }
    ];
    dateFmts.forEach(d => {
      const opt = document.createElement('label');
      opt.className = 'regional-lang-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'mpDateFmt';
      radio.value = d.code;
      if (d.code === curDate) radio.checked = true;
      radio.addEventListener('change', () => {
        localStorage.setItem('mp-datefmt', d.code);
        window.mpRefreshFormatCache?.();
      });
      opt.appendChild(radio);
      opt.appendChild(document.createTextNode(d.label));
      body.appendChild(opt);
    });

    // Temperature unit section
    const tempLabel = document.createElement('div');
    tempLabel.className = 'display-section-label';
    tempLabel.style.marginTop = '12px';
    tempLabel.textContent = t('mc.regional.temp');
    body.appendChild(tempLabel);

    const curTemp = localStorage.getItem('mp-tempunit') || 'C';
    const tempUnits = [
      { code: 'C', label: t('mc.regional.celsius') },
      { code: 'F', label: t('mc.regional.fahrenheit') }
    ];
    tempUnits.forEach(u => {
      const opt = document.createElement('label');
      opt.className = 'regional-lang-option';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'mpTempUnit';
      radio.value = u.code;
      if (u.code === curTemp) radio.checked = true;
      radio.addEventListener('change', () => {
        localStorage.setItem('mp-tempunit', u.code);
        window.mpRefreshFormatCache?.();
      });
      opt.appendChild(radio);
      opt.appendChild(document.createTextNode(u.label));
      body.appendChild(opt);
    });
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Screensaver rendering
   * ════════════════════════════════════════════════════════════════════════ */

  const ssUpdatePreview = (canvas) => {
    ssStopPreview();
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    const fn = SS_START_FNS[ssSettings.type];
    if (fn) ssPreviewInterval = fn(ctx, w, h);
  };

  const ssStopPreview = () => {
    if (ssPreviewInterval) { ssPreviewInterval.cancel(); ssPreviewInterval = null; }
  };

  /* rAF helper — returns { cancel } */
  const ssRafLoop = (targetMs, drawFn) => {
    let running = true;
    let last = 0;
    const loop = (time) => {
      if (!running) return;
      requestAnimationFrame(loop);
      if (time - last < targetMs) return;
      last = time;
      drawFn();
    };
    requestAnimationFrame(loop);
    return { cancel: () => { running = false; } };
  };

  /* Starfield */
  const ssStartStarfield = (ctx, w, h) => {
    const stars = [];
    for (let i = 0; i < 100; i++) {
      stars.push({ x: (Math.random() - 0.5) * w * 2, y: (Math.random() - 0.5) * h * 2, z: Math.random() * w });
    }
    return ssRafLoop(40, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      for (let j = 0; j < stars.length; j++) {
        const s = stars[j];
        s.z -= 4;
        if (s.z <= 0) { s.x = (Math.random() - 0.5) * w * 2; s.y = (Math.random() - 0.5) * h * 2; s.z = w; }
        const sx = (s.x / s.z) * w / 2 + w / 2;
        const sy = (s.y / s.z) * h / 2 + h / 2;
        const r = Math.max(0.5, (1 - s.z / w) * 2.5);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  };

  /* Pipes */
  const ssStartPipes = (ctx, w, h) => {
    const gridSize = 10;
    let px = Math.floor(Math.random() * (w / gridSize)) * gridSize;
    let py = Math.floor(Math.random() * (h / gridSize)) * gridSize;
    let dir = Math.floor(Math.random() * 4); // 0=right,1=down,2=left,3=up
    let hue = Math.random() * 360;
    let segments = 0;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    return ssRafLoop(60, () => {
      const dx = [gridSize, 0, -gridSize, 0];
      const dy = [0, gridSize, 0, -gridSize];
      // Occasionally change direction
      if (Math.random() < 0.3) {
        dir = (dir + (Math.random() < 0.5 ? 1 : 3)) % 4;
      }
      let nx = px + dx[dir];
      let ny = py + dy[dir];
      // Bounce off walls
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
        dir = (dir + 2) % 4;
        nx = px + dx[dir];
        ny = py + dy[dir];
      }
      ctx.strokeStyle = `hsl(${hue},80%,60%)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + gridSize / 2, py + gridSize / 2);
      ctx.lineTo(nx + gridSize / 2, ny + gridSize / 2);
      ctx.stroke();
      // Draw joint
      ctx.fillStyle = `hsl(${hue},80%,75%)`;
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
    });
  };

  /* Bouncing Logo — smiley face */
  const ssStartBouncing = (ctx, w, h) => {
    const size = Math.max(16, Math.min(w, h) * 0.15) | 0;
    let bx = Math.random() * (w - size);
    let by = Math.random() * (h - size);
    let vx = 1.5;
    let vy = 1.2;

    const drawSmiley = (x, y, r) => {
      // Face
      const grad = ctx.createRadialGradient(x + r * 0.3, y + r * 0.3, r * 0.1, x, y, r);
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
    };

    return ssRafLoop(30, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, w, h);
      bx += vx;
      by += vy;
      if (bx <= 0 || bx + size >= w) vx = -vx;
      if (by <= 0 || by + size >= h) vy = -vy;
      drawSmiley(bx + size / 2, by + size / 2, size / 2);
    });
  };

  /* Color Cycling */
  const ssStartColorCycle = (ctx, w, h) => {
    let tick = 0;
    return ssRafLoop(40, () => {
      tick += 2;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, `hsl(${tick % 360},70%,50%)`);
      grad.addColorStop(0.5, `hsl(${(tick + 120) % 360},70%,50%)`);
      grad.addColorStop(1, `hsl(${(tick + 240) % 360},70%,50%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  };

  /* Mystify — bouncing connected lines */
  const ssStartMystify = (ctx, w, h) => {
    const NUM = 2;
    const PTS = 4;
    const TRAIL = 12;
    const shapes = [];
    for (let s = 0; s < NUM; s++) {
      const pts = [];
      for (let p = 0; p < PTS; p++) {
        pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3 });
      }
      shapes.push({ pts, hue: s * 180, trail: [] });
    }
    return ssRafLoop(40, () => {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < shapes.length; i++) {
        const sh = shapes[i];
        const coords = [];
        for (let j = 0; j < sh.pts.length; j++) {
          const pt = sh.pts[j];
          pt.x += pt.vx; pt.y += pt.vy;
          if (pt.x <= 0 || pt.x >= w) pt.vx = -pt.vx;
          if (pt.y <= 0 || pt.y >= h) pt.vy = -pt.vy;
          coords.push({ x: pt.x, y: pt.y });
        }
        sh.trail.push(coords);
        if (sh.trail.length > TRAIL) sh.trail.shift();
        for (let ti = 0; ti < sh.trail.length; ti++) {
          const alpha = (ti + 1) / sh.trail.length;
          ctx.strokeStyle = `hsla(${sh.hue},80%,60%,${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sh.trail[ti][0].x, sh.trail[ti][0].y);
          for (let k = 1; k < sh.trail[ti].length; k++) {
            ctx.lineTo(sh.trail[ti][k].x, sh.trail[ti][k].y);
          }
          ctx.closePath();
          ctx.stroke();
        }
        sh.hue = (sh.hue + 0.3) % 360;
      }
    }, 40);
  };

  const SS_START_FNS = {
    starfield: ssStartStarfield,
    pipes: ssStartPipes,
    bouncing: ssStartBouncing,
    colorcycle: ssStartColorCycle,
    mystify: ssStartMystify
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Idle timer + Fullscreen activation
   * ════════════════════════════════════════════════════════════════════════ */

  const ssRecordActivity = () => {
    ssLastActivity = Date.now();
    if (ssActive) ssDeactivate();
  };

  const ssResetIdleTimer = () => {
    if (ssIdleTimer) { clearInterval(ssIdleTimer); ssIdleTimer = null; }
    if (!ssSettings.enabled) return;
    ssLastActivity = Date.now();
    ssIdleTimer = setInterval(() => {
      if (ssActive) return;
      if (Date.now() - ssLastActivity > ssSettings.timeout * 60000) {
        ssActivate();
      }
    }, 1000);
  };

  const ssActivate = () => {
    if (ssActive) return;
    ssActive = true;
    ssOverlayFirstMove = true;
    const overlay = document.createElement('div');
    overlay.id = 'ssOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;cursor:none;';
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = 'display:block;width:100%;height:100%;';
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    const ctx = canvas.getContext('2d');
    const fn = SS_START_FNS[ssSettings.type];
    if (fn) ssFullscreenInterval = fn(ctx, canvas.width, canvas.height);

    const dismiss = (e) => {
      // Ignore the very first mousemove to prevent instant dismiss
      if (e.type === 'mousemove' && ssOverlayFirstMove) {
        ssOverlayFirstMove = false;
        return;
      }
      ssDeactivate();
    };
    overlay.addEventListener('mousemove', dismiss);
    overlay.addEventListener('click', dismiss);
    overlay.addEventListener('keydown', dismiss);
    overlay.addEventListener('touchstart', dismiss, { passive: true });
  };

  const ssDeactivate = () => {
    if (!ssActive) return;
    ssActive = false;
    if (ssFullscreenInterval) { ssFullscreenInterval.cancel(); ssFullscreenInterval = null; }
    const overlay = document.getElementById('ssOverlay');
    if (overlay) overlay.remove();
    ssResetIdleTimer();
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Persistence
   * ════════════════════════════════════════════════════════════════════════ */

  const mcSaveSettings = () => {
    try {
      localStorage.setItem('mpOS-system-settings', JSON.stringify({
        display: displaySettings,
        screenSaver: ssSettings
      }));
    } catch (e) { /* quota exceeded — ignore */ }
  };

  const mcLoadSettings = () => {
    try {
      const raw = localStorage.getItem('mpOS-system-settings');
      if (raw) {
        const data = JSON.parse(raw);
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
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  CRT Degauss effect
   * ════════════════════════════════════════════════════════════════════════ */

  let degaussActive = false;

  const degaussSynthSound = () => {
    if (localStorage.getItem('mp-muted') === '1') return null;
    const vol = parseFloat(localStorage.getItem('mp-volume') || '0.1');
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    // Low thunk: 80→30Hz sine, 150ms decay
    const thunkOsc = ctx.createOscillator();
    const thunkGain = ctx.createGain();
    thunkOsc.type = 'sine';
    thunkOsc.frequency.setValueAtTime(80, now);
    thunkOsc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
    thunkGain.gain.setValueAtTime(vol * 0.6, now);
    thunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    thunkOsc.connect(thunkGain).connect(ctx.destination);
    thunkOsc.start(now);
    thunkOsc.stop(now + 0.2);

    // Electromagnetic hum: 60Hz sawtooth through lowpass, builds and fades over 3.3s
    const humOsc = ctx.createOscillator();
    const humGain = ctx.createGain();
    const humFilter = ctx.createBiquadFilter();
    humOsc.type = 'sawtooth';
    humOsc.frequency.value = 60;
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 200;
    humGain.gain.setValueAtTime(0.001, now);
    humGain.gain.linearRampToValueAtTime(vol * 0.25, now + 1.2);
    humGain.gain.setValueAtTime(vol * 0.25, now + 1.8);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 3.3);
    humOsc.connect(humFilter).connect(humGain).connect(ctx.destination);
    humOsc.start(now + 0.1);
    humOsc.stop(now + 3.4);

    // High buzz: 120Hz square, thinner layer
    const buzzOsc = ctx.createOscillator();
    const buzzGain = ctx.createGain();
    buzzOsc.type = 'square';
    buzzOsc.frequency.value = 120;
    buzzGain.gain.setValueAtTime(0.001, now);
    buzzGain.gain.linearRampToValueAtTime(vol * 0.08, now + 1.2);
    buzzGain.gain.setValueAtTime(vol * 0.08, now + 1.8);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 3.3);
    buzzOsc.connect(buzzGain).connect(ctx.destination);
    buzzOsc.start(now + 0.1);
    buzzOsc.stop(now + 3.4);

    return ctx;
  };

  const degauss = () => {
    if (degaussActive) return;

    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    degaussActive = true;

    // Depress any active button
    const btn = document.querySelector('.degauss-btn');
    if (btn) btn.classList.add('active');

    // Create color band overlay
    const overlay = document.createElement('div');
    overlay.className = 'degauss-overlay';
    document.body.appendChild(overlay);

    // Start sound
    const audioCtx = degaussSynthSound();

    const TOTAL = 3500;
    const start = performance.now();
    const body = document.body;

    const easeInQuad = (x) => x * x;
    const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);

    const loop = (time) => {
      const elapsed = time - start;
      if (elapsed >= TOTAL) {
        // Clean up
        body.style.transform = '';
        body.style.filter = '';
        overlay.remove();
        if (btn) btn.classList.remove('active');
        if (audioCtx) audioCtx.close();
        // Cooldown — real CRT coils need time to cool
        setTimeout(() => { degaussActive = false; }, 15000);
        return;
      }

      let intensity = 0;

      if (elapsed < 200) {
        // Delay phase — nothing visible
        intensity = 0;
      } else if (elapsed < 1200) {
        // Build-up: ramp from 0 to 1 (easeInQuad)
        intensity = easeInQuad((elapsed - 200) / 1000);
      } else if (elapsed < 1800) {
        // Peak: hold at 1
        intensity = 1;
      } else {
        // Settle: 1 to 0 (easeOutCubic)
        intensity = 1 - easeOutCubic((elapsed - 1800) / 1700);
      }

      // Wobble: sinusoidal translate/skew/scaleX with multiple frequencies
      const t1 = elapsed * 0.015;
      const t2 = elapsed * 0.023;
      const t3 = elapsed * 0.037;

      const tx = Math.sin(t1) * 6 * intensity;
      const ty = Math.sin(t2) * 3 * intensity;
      const skew = Math.sin(t3) * 1.5 * intensity;
      const scaleX = 1 + Math.sin(t2 * 1.3) * 0.008 * intensity;

      body.style.transform = `translate(${tx}px, ${ty}px) skewX(${skew}deg) scaleX(${scaleX})`;

      // Filter: hue-rotate, saturate, brightness
      const hue = Math.sin(t1 * 1.7) * 40 * intensity;
      const sat = 100 + 80 * intensity * Math.abs(Math.sin(t2 * 0.8));
      const bright = 100 + Math.sin(t3 * 0.6) * 15 * intensity;

      body.style.filter = `hue-rotate(${hue}deg) saturate(${sat}%) brightness(${bright}%)`;

      // Color band overlay: sweeping HSL gradient
      const sweep = (elapsed * 0.1) % 360;
      overlay.style.opacity = 0.15 * intensity;
      overlay.style.background = `linear-gradient(${sweep}deg, hsla(${sweep},100%,50%,0.6), hsla(${(sweep + 120) % 360},100%,50%,0.6), hsla(${(sweep + 240) % 360},100%,50%,0.6))`;

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  /* ════════════════════════════════════════════════════════════════════════
   *  Register with core + export to window
   * ════════════════════════════════════════════════════════════════════════ */

  window.mpRegisterActions({ openMyComputer });
  window.mpRegisterWindows({ mycomputer: 'System Properties' });
  window.mpRegisterCloseHandlers({ mycomputer: closeMyComputer });

  /* ── Language change refresh ── */
  const mcRefreshOnLangChange = () => {
    const el = document.getElementById('mycomputer');
    if (el && el.style.display !== 'none') {
      mcGeneralFrag = null;
      mcSwitchTab(mcCurrentTab);
    }
  };

  window.openMyComputer      = openMyComputer;
  window.closeMyComputer     = closeMyComputer;
  window.mcSwitchTab         = mcSwitchTab;
  window.displaySettings     = displaySettings;
  window.ssRecordActivity    = ssRecordActivity;
  window.applyDisplaySettings = applyDisplaySettings;
  window.mcSaveSettings      = mcSaveSettings;
  window.mcRefreshOnLangChange = mcRefreshOnLangChange;
  window.degauss             = degauss;

  /* ── Load saved settings on startup ── */
  mcLoadSettings();
})();
