(function () {
  'use strict';

  /* ── Globals from other modules ── */
  const {
    mpTaskbar, mobileQuery, t, getLang, setLanguage,
    openWindow, closeStartMenu, itemName, getItemIcon,
    FOLDER_ITEMS, ACTION_MAP, COMMANDS,
    displaySettings, ssRecordActivity, applyDisplaySettings,
    mcSaveSettings, reclampStickyNotes,
    openOnTarget, openBrickBreaker, openFractal, openSlotMachine,
    openBrowser, openArchiveBrowser, openFishOfDay, openFishFinder,
    openAquarium, openNeoTracker,
    openNotepad, openPaint, openStickyNotes, openNoiseMixer, openReverb,
    openCalculator, openCalendar, openTimeZone, openWeather,
    openDiskUsage, openVisitorMap, openStopwatch, openCryptography,
    openTuningFork, openMyComputer, openExplorer, openHelp, openSearch,
    openTaskManager,
    notepadNew, paintNew,
    mpRegisterActions, mpRegisterWindows, mpRegisterCloseHandlers
  } = window;

  /* ====================================================================
   * Exit Site
   * ==================================================================== */
  const exitSite = () => {
    closeStartMenu();
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:#000;opacity:0;z-index:99999;transition:opacity 1.2s ease-in;';
    document.body.appendChild(overlay);
    // Force reflow then fade to black
    overlay.offsetHeight;                       // eslint-disable-line no-unused-expressions
    overlay.style.opacity = '1';
    overlay.addEventListener('transitionend', () => {
      window.close();
      // If browser blocks window.close(), show shutdown screen
      document.title = 'Shutdown';
      document.body.textContent = '';
      document.body.style.cssText =
        'margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;';
      const msg = document.createElement('div');
      msg.style.cssText =
        'color:#e8a040;font-family:sans-serif;font-size:18px;text-align:center;line-height:1.6;';
      msg.textContent = 'It is now safe to turn off your computer.';
      document.body.appendChild(msg);
    });
  };

  /* ====================================================================
   * Mobile swipe-back navigation
   * ==================================================================== */
  let mobileSwipeInitialized = false;

  const initMobileSwipeBack = () => {
    if (mobileSwipeInitialized) return;
    mobileSwipeInitialized = true;
    let swipeState = null;

    document.addEventListener('touchstart', (e) => {
      if (!mobileQuery.matches) return;
      const touch = e.touches[0];
      if (touch.clientX > 20) return;
      const wins = document.querySelectorAll('.window.draggable');
      let topWin = null;
      let topZ = -1;
      wins.forEach((w) => {
        if (w.style.display === 'none') return;
        const z = parseInt(w.style.zIndex, 10) || 0;
        if (z > topZ) { topZ = z; topWin = w; }
      });
      if (!topWin) return;
      swipeState = { win: topWin, startX: touch.clientX, startY: touch.clientY, dx: 0 };
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!swipeState) return;
      const touch = e.touches[0];
      let dx = touch.clientX - swipeState.startX;
      const dy = touch.clientY - swipeState.startY;
      if (Math.abs(dy) > Math.abs(dx) && swipeState.dx === 0) {
        swipeState = null;
        return;
      }
      if (dx < 0) dx = 0;
      swipeState.dx = dx;
      swipeState.win.style.transform = `translateX(${dx}px)`;
      swipeState.win.style.opacity = Math.max(0.5, 1 - dx / 400);
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!swipeState) return;
      const win = swipeState.win;
      const dx = swipeState.dx;
      swipeState = null;
      if (dx > 80) {
        win.style.transition = 'transform 200ms ease-in, opacity 200ms ease-in';
        win.style.transform = 'translateX(100%)';
        win.style.opacity = '0.5';
        win.addEventListener('transitionend', function handler() {
          win.removeEventListener('transitionend', handler);
          win.style.transition = '';
          win.style.transform = '';
          win.style.opacity = '';
          const closeFn = window.CLOSE_MAP[win.id];
          if (closeFn) { closeFn(); } else { mpTaskbar.closeWindow(win.id); }
        });
      } else {
        win.style.transition = 'transform 150ms ease-out, opacity 150ms ease-out';
        win.style.transform = '';
        win.style.opacity = '';
        win.addEventListener('transitionend', function handler() {
          win.removeEventListener('transitionend', handler);
          win.style.transition = '';
        });
      }
    });
  };

  if (mobileQuery.matches) initMobileSwipeBack();
  mobileQuery.addEventListener('change', (e) => {
    if (e.matches) initMobileSwipeBack();
  });

  /* ====================================================================
   * Mobile launcher
   * ==================================================================== */
  const buildMobileLauncher = () => {
    const games = [
      { name: 'On Target', _key: 'onTarget', action: openOnTarget },
      { name: 'Chicken Fingers', _key: 'chickenFingers', action: null, href: 'chicken-fingers.html' },
      { name: 'Brick Breaker', _key: 'brickBreaker', action: openBrickBreaker },
      { name: 'Fractal Explorer', _key: 'fractal', action: openFractal },
      { name: 'Slot Machine', _key: 'slotMachine', action: openSlotMachine }
    ];
    const internet = [
      { name: 'WikiBrowser', _key: 'wikiBrowser', action: openBrowser },
      { name: 'Archive Browser', _key: 'archiveBrowser', action: openArchiveBrowser },
      { name: 'Fish of the Day', _key: 'fishOfDay', action: openFishOfDay },
      { name: 'Fish Finder', _key: 'fishFinder', action: openFishFinder },
      { name: 'Virtual Aquarium', _key: 'aquarium', action: openAquarium },
      { name: 'NEO Tracker', _key: 'neoTracker', action: openNeoTracker }
    ];
    const accessories = [
      { name: 'Notepad', _key: 'notepad', action: openNotepad },
      { name: 'Paint', _key: 'paint', action: openPaint },
      { name: 'Sticky Notes', _key: 'stickyNotes', action: openStickyNotes }
    ];
    const audio = [
      { name: 'White Noise Mixer', _key: 'noiseMixer', action: openNoiseMixer },
      { name: 'Tuning Fork', _key: 'tuningFork', action: openTuningFork },
      { name: 'Reverb', _key: 'reverb', action: openReverb }
    ];
    const utilities = [
      { name: 'Calculator', _key: 'calculator', action: openCalculator },
      { name: 'Calendar', _key: 'calendar', action: openCalendar },
      { name: 'Time Zone', _key: 'timeZone', action: openTimeZone },
      { name: 'Weather', _key: 'weather', action: openWeather },
      { name: 'Disk Usage', _key: 'diskUsage', action: openDiskUsage },
      { name: 'Visitor Map', _key: 'visitorMap', action: openVisitorMap },
      { name: 'Stopwatch', _key: 'stopwatch', action: openStopwatch },
      { name: 'Cryptography', _key: 'cryptography', action: openCryptography }
    ];
    const system = [
      { name: 'My Computer', _key: 'myComputer', action: openMyComputer },
      { name: 'Files', _key: 'files', action: openExplorer },
      { name: 'Help', _key: 'help', action: openHelp },
      { name: 'Search', _key: 'search', action: openSearch }
    ];

    // Clear grids (may be called again on language change)
    ['launcherGames', 'launcherInternet', 'launcherAccessories', 'launcherAudio', 'launcherUtilities', 'launcherSystem']
      .forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
      });

    // Update section titles
    const secTitles = document.querySelectorAll('.launcher-section-title');
    const titleKeys = ['launcher.games', 'launcher.internet', 'launcher.accessories', 'launcher.audio', 'launcher.utilities', 'launcher.system'];
    for (let i = 0; i < secTitles.length && i < titleKeys.length; i++) {
      secTitles[i].textContent = t(titleKeys[i]);
    }

    const populateGrid = (gridId, items) => {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      items.forEach((item) => {
        const tile = document.createElement('button');
        tile.className = 'launcher-tile';
        tile.type = 'button';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 20 20');
        svg.setAttribute('fill', 'none');
        svg.innerHTML = getItemIcon(item.name);
        tile.appendChild(svg);
        const label = document.createElement('span');
        label.className = 'launcher-tile-label';
        label.textContent = itemName(item);
        tile.appendChild(label);
        if (item.href) {
          tile.addEventListener('click', () => { location.href = item.href; });
        } else if (item.action) {
          tile.addEventListener('click', () => { item.action(); });
        }
        grid.appendChild(tile);
      });
    };

    populateGrid('launcherGames', games);
    populateGrid('launcherInternet', internet);
    populateGrid('launcherAccessories', accessories);
    populateGrid('launcherAudio', audio);
    populateGrid('launcherUtilities', utilities);
    populateGrid('launcherSystem', system);
  };

  if (mobileQuery.matches) buildMobileLauncher();
  mobileQuery.addEventListener('change', (e) => {
    if (e.matches && !document.getElementById('launcherGames').children.length) {
      buildMobileLauncher();
    }
  });

  /* Re-export buildLauncher so languagechange handler can call it */
  window.buildLauncher = buildMobileLauncher;

  /* ====================================================================
   * Ctrl+Alt+Del -> Task Manager
   * ==================================================================== */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace' || e.key === 'Escape')) {
      e.preventDefault();
      openTaskManager();
    }
    // Alt+Space: toggle voice listening
    if (e.altKey && e.code === 'Space' && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
      e.preventDefault();
      if (window._mpVoiceToggle) window._mpVoiceToggle();
    }
  });

  /* ====================================================================
   * Language toggle (system tray)
   * ==================================================================== */
  const langBtn = document.getElementById('trayLangBtn');
  if (langBtn) {
    langBtn.textContent = getLang().toUpperCase();
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLanguage(getLang() === 'en' ? 'pt' : 'en');
    });
  }

  /* ====================================================================
   * Voice Commands (window + system tray)
   * ==================================================================== */
  const openVoiceCommands = () => {
    openWindow('voicecommands');
    if (window._mpVoiceBuildHelp) window._mpVoiceBuildHelp();
    if (window._mpVoiceStart) window._mpVoiceStart();
  };

  const closeVoiceCommands = () => {
    if (window.mpVoiceStop) window.mpVoiceStop();
    mpTaskbar.closeWindow('voicecommands');
  };

  ;(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const micIcon = document.getElementById('trayMicIcon');
    const vcStatus = document.getElementById('vcStatus');
    const vcTranscript = document.getElementById('vcTranscript');
    const vcMicBtn = document.getElementById('vcMicBtn');
    const vcHelpList = document.getElementById('vcHelpList');
    const vcStatusBar = document.getElementById('vcStatusBar');
    const vcWin = document.getElementById('voicecommands');
    const vcContinuousChk = document.getElementById('vcContinuous');
    const floatingIndicator = document.getElementById('voiceIndicator');
    const floatingText = document.getElementById('voiceIndicatorText');
    if (!micIcon) return;

    micIcon.style.display = '';

    let recognition = null;
    let isListening = false;
    let helpBuilt = false;
    let voiceAudioCtx = null;
    let restartTimer = null;

    /* -- Voice state machine: idle / listening / heard / executing -- */
    let voiceState = 'idle';

    const VOICE_STATE_CLASSES = ['listening', 'heard', 'executing'];

    const isVcWindowVisible = () => vcWin && vcWin.style.display !== 'none';

    const isContinuous = () => vcContinuousChk && vcContinuousChk.checked;

    const updateFloatingIndicator = (state, text) => {
      if (!floatingIndicator) return;
      // Only show when VC window is hidden and voice is active
      if (state === 'idle' || isVcWindowVisible()) {
        floatingIndicator.classList.remove('visible');
        return;
      }
      floatingIndicator.className = 'voice-indicator visible state-' + state;
      if (floatingText) floatingText.textContent = text || '';
    };

    const setVoiceState = (state, detail) => {
      voiceState = state;
      // Update tray mic icon classes
      VOICE_STATE_CLASSES.forEach((c) => micIcon.classList.remove(c));
      if (state !== 'idle') micIcon.classList.add(state);
      // Update VC window mic button classes
      if (vcMicBtn) {
        VOICE_STATE_CLASSES.forEach((c) => vcMicBtn.classList.remove(c));
        if (state !== 'idle') vcMicBtn.classList.add(state);
      }
      // Status text
      let statusText = '';
      if (state === 'idle') statusText = t('voice.clickToSpeak');
      else if (state === 'listening') statusText = t('voice.listening');
      else if (state === 'heard') statusText = detail || '';
      else if (state === 'executing') statusText = detail || t('voice.launched');
      setStatus(statusText);
      // Floating indicator
      updateFloatingIndicator(state, statusText);
    };

    // Restore continuous checkbox from localStorage
    if (vcContinuousChk) {
      vcContinuousChk.checked = localStorage.getItem('mp-voice-continuous') === '1';
      vcContinuousChk.addEventListener('change', () => {
        localStorage.setItem('mp-voice-continuous', vcContinuousChk.checked ? '1' : '0');
      });
    }

    // App name lookup: maps lowercase name -> run function
    const VOICE_APPS = {};
    const allItems = (FOLDER_ITEMS.games || [])
      .concat(FOLDER_ITEMS.internet || [], FOLDER_ITEMS.accessories || [], FOLDER_ITEMS.utilities || []);
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const fn = item.action && ACTION_MAP[item.action];
      if (fn) {
        VOICE_APPS[item.name.toLowerCase()] = { fn, label: item.name, item };
      }
    }

    // Terminal COMMANDS that launch apps (skip shell-only commands)
    const APP_COMMANDS = {};
    const skipCommands = [
      'help', 'cd', 'ls', 'dir', 'echo', 'date', 'time', 'type', 'tree',
      'whoami', 'hostname', 'systeminfo', 'ping', 'color', 'title', 'tasklist', 'taskkill',
      'start', 'cls', 'clear', 'exit', 'ver', 'matrix', 'pwd', 'cat', 'uptime', 'history',
      'touch', 'rm', 'fortune', 'neofetch', 'curl', 'fetch', 'top', 'edit', 'nano', 'ipconfig'
    ];
    for (const key in COMMANDS) {
      if (skipCommands.indexOf(key) === -1 && COMMANDS[key].run) {
        APP_COMMANDS[key] = COMMANDS[key].run;
      }
    }

    /* -- Audio feedback (Web Audio API) -- */
    const voiceBeep = (freq, duration) => {
      if (localStorage.getItem('mp-muted') === '1') return;
      const vol = parseFloat(localStorage.getItem('mp-volume') || '0.1');
      if (!voiceAudioCtx) {
        voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (voiceAudioCtx.state === 'suspended') voiceAudioCtx.resume();
      const osc = voiceAudioCtx.createOscillator();
      const gain = voiceAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = vol * 0.3;
      osc.connect(gain);
      gain.connect(voiceAudioCtx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, voiceAudioCtx.currentTime + duration);
      osc.stop(voiceAudioCtx.currentTime + duration);
    };

    const setStatus = (text) => {
      if (vcStatus) vcStatus.textContent = text;
      if (vcStatusBar) vcStatusBar.textContent = text;
    };

    /* -- Window ID from FOLDER_ITEMS action -- */
    const voiceGetWinId = (item) => {
      if (!item || !item.action) return null;
      return item.action.slice(4).toLowerCase(); // openCalculator -> calculator
    };

    const voiceStop = () => {
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      isListening = false;
      if (recognition) {
        try { recognition.abort(); } catch (e) { /* ignore */ }
        recognition = null;
      }
      setVoiceState('idle');
    };

    /* -- Create a fresh recognition instance -- */
    const createRecognition = () => {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 3;
      rec.lang = getLang() === 'pt' ? 'pt-PT' : 'en-US';

      rec.onresult = (ev) => {
        const last = ev.results[ev.results.length - 1];
        if (vcTranscript) {
          vcTranscript.textContent = last[0].transcript;
          vcTranscript.className = 'vc-transcript sunken';
        }
        if (last.isFinal) {
          setVoiceState('heard', last[0].transcript);
          voiceProcessCommand(last[0].transcript, last);
        }
      };

      rec.onerror = (ev) => {
        if (ev.error === 'no-speech') {
          setStatus(t('voice.noSpeech'));
        } else if (ev.error === 'not-allowed') {
          setStatus(t('voice.denied'));
        } else {
          setStatus(t('voice.error'));
        }
        if (vcTranscript) vcTranscript.className = 'vc-transcript sunken vc-error';
        voiceBeep(659.25, 0.12);
        setTimeout(() => { voiceBeep(523.25, 0.12); }, 120);
      };

      rec.onend = () => {
        recognition = null;
        // Auto-restart in continuous mode if still listening
        if (isListening && isContinuous()) {
          restartTimer = setTimeout(() => {
            restartTimer = null;
            if (!isListening) return;
            try {
              recognition = createRecognition();
              recognition.start();
              setVoiceState('listening');
            } catch (e) {
              voiceStop();
            }
          }, 800);
        } else {
          voiceStop();
        }
      };

      return rec;
    };

    /* -- Matching helpers -- */
    const voiceLevenshtein = (a, b) => {
      const m = a.length;
      const n = b.length;
      const dp = [];
      for (let i = 0; i <= m; i++) {
        dp[i] = [i];
        for (let j = 1; j <= n; j++) {
          dp[i][j] = i === 0
            ? j
            : Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
              );
        }
      }
      return dp[m][n];
    };

    const voiceMatchApp = (text) => {
      // 1. FOLDER_ITEMS name match (localized) -- exact then substring
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const fn = item.action && ACTION_MAP[item.action];
        if (!fn) continue;
        const name = itemName(item).toLowerCase();
        if (name === text) return { fn, label: itemName(item), item };
      }
      for (let j = 0; j < allItems.length; j++) {
        const item = allItems[j];
        const fn = item.action && ACTION_MAP[item.action];
        if (!fn) continue;
        const name = itemName(item).toLowerCase();
        if (name.indexOf(text) !== -1 && text.length >= 3) return { fn, label: itemName(item), item };
      }

      // 2. Fallback to COMMANDS key
      const normalized = text.replace(/\s+/g, '');
      if (APP_COMMANDS[normalized]) {
        const label = COMMANDS[normalized]
          ? COMMANDS[normalized].desc.replace(/^(Launch |Open )/, '')
          : normalized;
        return { fn: APP_COMMANDS[normalized], label };
      }

      return null;
    };

    const voiceFuzzyMatch = (text, wide) => {
      let bestDist = Infinity;
      let bestMatch = null;
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const fn = item.action && ACTION_MAP[item.action];
        if (!fn) continue;
        const name = itemName(item).toLowerCase();
        const dist = voiceLevenshtein(text, name);
        const threshold = wide
          ? Math.max(3, Math.floor(name.length * 0.5))
          : Math.max(2, Math.floor(name.length * 0.35));
        if (dist <= threshold && dist < bestDist) {
          bestDist = dist;
          bestMatch = { fn, label: itemName(item), item };
        }
      }
      if (!wide) {
        for (const key in APP_COMMANDS) {
          const dist = voiceLevenshtein(text, key);
          const threshold = Math.max(2, Math.floor(key.length * 0.35));
          if (dist <= threshold && dist < bestDist) {
            bestDist = dist;
            const label = COMMANDS[key]
              ? COMMANDS[key].desc.replace(/^(Launch |Open )/, '')
              : key;
            bestMatch = { fn: APP_COMMANDS[key], label };
          }
        }
      }
      return bestMatch;
    };

    /* -- Process recognized speech -- */
    const voiceProcessCommand = (transcript, results) => {
      let text = transcript.toLowerCase().trim();
      let action = 'open'; // default action

      // Check for "stop listening" command first
      const stopPhrases = ['stop listening', 'stop', 'parar de ouvir', 'parar'];
      for (let sp = 0; sp < stopPhrases.length; sp++) {
        if (text === stopPhrases[sp]) {
          setVoiceState('executing', t('voice.stopped'));
          if (vcTranscript) vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${t('voice.stopped')}</span>`;
          voiceBeep(523.25, 0.1);
          setTimeout(() => { voiceBeep(659.25, 0.1); }, 100);
          // Force stop — disable continuous for this session
          isListening = false;
          if (recognition) {
            try { recognition.abort(); } catch (e) { /* ignore */ }
            recognition = null;
          }
          setTimeout(() => { setVoiceState('idle'); }, 1500);
          return;
        }
      }

      // Check for language switch
      const langPrefixes = ['switch language', 'change language', 'mudar idioma', 'trocar idioma'];
      for (let lp = 0; lp < langPrefixes.length; lp++) {
        if (text === langPrefixes[lp] || text.indexOf(langPrefixes[lp]) === 0) {
          setVoiceState('executing', t('voice.langSwitched'));
          setLanguage(getLang() === 'pt' ? 'en' : 'pt');
          setVoiceState('executing', t('voice.langSwitched'));
          if (vcTranscript) vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${t('voice.langSwitched')}</span>`;
          voiceBeep(523.25, 0.1);
          setTimeout(() => { voiceBeep(659.25, 0.1); }, 100);
          return;
        }
      }

      // Check for close/minimize prefixes
      const closePrefixes = ['close ', 'fechar '];
      const minPrefixes = ['minimize ', 'minimizar '];
      for (let cp = 0; cp < closePrefixes.length; cp++) {
        if (text.indexOf(closePrefixes[cp]) === 0) {
          action = 'close';
          text = text.slice(closePrefixes[cp].length).trim();
          break;
        }
      }
      if (action === 'open') {
        for (let mp = 0; mp < minPrefixes.length; mp++) {
          if (text.indexOf(minPrefixes[mp]) === 0) {
            action = 'minimize';
            text = text.slice(minPrefixes[mp].length).trim();
            break;
          }
        }
      }

      // Strip open/launch/start prefixes (only if still action=open)
      if (action === 'open') {
        const openPrefixes = ['open ', 'launch ', 'start ', 'abrir ', 'iniciar '];
        for (let op = 0; op < openPrefixes.length; op++) {
          if (text.indexOf(openPrefixes[op]) === 0) {
            text = text.slice(openPrefixes[op].length).trim();
            break;
          }
        }
      }

      // Try matching with primary transcript
      let match = voiceMatchApp(text);

      // Try speech alternatives if no match
      if (!match && results.length > 1) {
        for (let a = 1; a < results.length; a++) {
          let altText = results[a].transcript.toLowerCase().trim();
          const allPrefixes = closePrefixes.concat(minPrefixes, ['open ', 'launch ', 'start ', 'abrir ', 'iniciar ']);
          for (let ap = 0; ap < allPrefixes.length; ap++) {
            if (altText.indexOf(allPrefixes[ap]) === 0) {
              altText = altText.slice(allPrefixes[ap].length).trim();
              break;
            }
          }
          match = voiceMatchApp(altText);
          if (match) break;
        }
      }

      // Levenshtein fuzzy match as last resort (tight threshold)
      if (!match) {
        match = voiceFuzzyMatch(text, false);
      }

      if (match) {
        if (action === 'close' || action === 'minimize') {
          const winId = match.item ? voiceGetWinId(match.item) : null;
          const win = winId && document.getElementById(winId);
          const winOpen = win && (win.style.display !== 'none' || document.querySelector(`.taskbar-item[data-window-id="${winId}"]`));
          if (winOpen) {
            if (action === 'close') {
              mpTaskbar.closeWindow(winId);
              setVoiceState('executing', `${t('voice.close')} ${match.label}`);
              if (vcTranscript) vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${t('voice.close')} ${match.label}</span>`;
            } else {
              mpTaskbar.minimizeWindow(winId);
              setVoiceState('executing', `${t('voice.minimize')} ${match.label}`);
              if (vcTranscript) vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${t('voice.minimize')} ${match.label}</span>`;
            }
            voiceBeep(523.25, 0.1);
            setTimeout(() => { voiceBeep(659.25, 0.1); }, 100);
          } else {
            setStatus(t('voice.noWindow'));
            if (vcTranscript) vcTranscript.innerHTML = `<span class="vc-result vc-error">"${transcript}"</span>`;
            voiceBeep(659.25, 0.12);
            setTimeout(() => { voiceBeep(523.25, 0.12); }, 120);
          }
        } else {
          // Open action
          setVoiceState('executing', match.label);
          if (vcTranscript) vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${match.label}</span>`;
          match.fn();
          voiceBeep(523.25, 0.1);
          setTimeout(() => { voiceBeep(659.25, 0.1); }, 100);
        }
      } else {
        // No match -- try wider fuzzy for "Did you mean?"
        const suggestion = voiceFuzzyMatch(text, true);
        if (suggestion) {
          setStatus(t('voice.didYouMean', { app: suggestion.label }));
          if (vcTranscript) {
            vcTranscript.innerHTML = '';
            const btn = document.createElement('button');
            btn.className = 'vc-suggestion';
            btn.textContent = suggestion.label;
            btn.onclick = () => {
              if (action === 'close' || action === 'minimize') {
                const sWinId = suggestion.item ? voiceGetWinId(suggestion.item) : null;
                const sWin = sWinId && document.getElementById(sWinId);
                const sWinOpen = sWin && (sWin.style.display !== 'none' || document.querySelector(`.taskbar-item[data-window-id="${sWinId}"]`));
                if (sWinOpen) {
                  if (action === 'close') {
                    mpTaskbar.closeWindow(sWinId);
                    setStatus(t('voice.closed'));
                    vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${t('voice.close')} ${suggestion.label}</span>`;
                  } else {
                    mpTaskbar.minimizeWindow(sWinId);
                    setStatus(t('voice.minimized'));
                    vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${t('voice.minimize')} ${suggestion.label}</span>`;
                  }
                } else {
                  setStatus(t('voice.noWindow'));
                  vcTranscript.innerHTML = '';
                }
              } else {
                suggestion.fn();
                setStatus(t('voice.launched'));
                vcTranscript.innerHTML = `<span class="vc-result vc-action">\u2192 ${suggestion.label}</span>`;
              }
              voiceBeep(523.25, 0.1);
              setTimeout(() => { voiceBeep(659.25, 0.1); }, 100);
            };
            vcTranscript.appendChild(btn);
          }
          voiceBeep(587.33, 0.1); // D5 -- questioning tone
        } else {
          setStatus(t('voice.notRecognized'));
          if (vcTranscript) {
            vcTranscript.innerHTML =
              `<span class="vc-result vc-error">"${transcript}"</span><br>` +
              `<span class="vc-error">${t('voice.tryAgain')}</span>`;
          }
          voiceBeep(659.25, 0.12);
          setTimeout(() => { voiceBeep(523.25, 0.12); }, 120);
        }
      }
    };

    const voiceStart = () => {
      if (isListening) { voiceStop(); return; }
      recognition = createRecognition();
      isListening = true;
      setVoiceState('listening');
      if (vcTranscript) { vcTranscript.textContent = ''; vcTranscript.className = 'vc-transcript sunken'; }
      voiceBeep(783.99, 0.12); // G5 -- start listening
      recognition.start();
    };

    /* -- Toggle: start if idle, stop if active -- */
    const voiceToggle = () => {
      if (isListening) voiceStop();
      else voiceStart();
    };

    /* -- Help list ("What can I say?") -- */
    const buildHelpList = () => {
      if (!vcHelpList) return;
      vcHelpList.innerHTML = '';

      // Open apps
      const dtOpen = document.createElement('dt');
      dtOpen.textContent = t('voice.helpOpen').replace(/"/g, '');
      vcHelpList.appendChild(dtOpen);
      for (let i = 0; i < allItems.length; i++) {
        const dd = document.createElement('dd');
        dd.textContent = itemName(allItems[i]);
        vcHelpList.appendChild(dd);
      }

      // Actions
      const dtAct = document.createElement('dt');
      dtAct.textContent = getLang() === 'pt' ? 'A\u00e7\u00f5es:' : 'Actions:';
      vcHelpList.appendChild(dtAct);
      const actions = [t('voice.helpClose'), t('voice.helpMinimize'), t('voice.helpLang'), t('voice.helpStop')];
      for (let j = 0; j < actions.length; j++) {
        const ddA = document.createElement('dd');
        ddA.textContent = actions[j];
        vcHelpList.appendChild(ddA);
      }

      helpBuilt = true;
    };

    window.addEventListener('languagechange', () => {
      if (helpBuilt) { helpBuilt = false; buildHelpList(); }
    });

    // Tray icon: toggle listening directly
    micIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other popups
      const vp = document.querySelector('.volume-popup');
      if (vp) vp.classList.remove('open');
      const np = document.querySelector('.net-popup');
      if (np) np.classList.remove('open');
      const sm = document.querySelector('.start-menu');
      const sb = document.querySelector('.start-btn');
      if (sm) sm.classList.remove('open');
      if (sb) sb.classList.remove('pressed');

      voiceToggle();
    });

    // Floating indicator: click to stop
    if (floatingIndicator) {
      floatingIndicator.addEventListener('click', () => {
        voiceStop();
      });
    }

    // Mic button in window: toggle listening
    if (vcMicBtn) {
      vcMicBtn.addEventListener('click', () => {
        voiceToggle();
      });
    }

    // Expose for openVoiceCommands / closeVoiceCommands
    window._mpVoiceStart = voiceStart;
    window._mpVoiceToggle = voiceToggle;
    window._mpVoiceBuildHelp = () => { if (!helpBuilt) buildHelpList(); };
    window.mpVoiceStop = voiceStop;
  })();

  /* ====================================================================
   * Language change refresh handler
   * ==================================================================== */
  const isVisible = (id) => {
    const el = document.getElementById(id);
    return el && el.style.display !== 'none';
  };

  window.addEventListener('languagechange', () => {
    // Each module provides its own refreshOnLangChange that checks visibility internally
    if (window.explorerRefreshOnLangChange) window.explorerRefreshOnLangChange();
    if (window.mcRefreshOnLangChange) window.mcRefreshOnLangChange();
    if (window.calendarRefreshOnLangChange) window.calendarRefreshOnLangChange();
    if (window.helpRefreshOnLangChange) window.helpRefreshOnLangChange();
    if (window.notepadRefreshOnLangChange) window.notepadRefreshOnLangChange();
    if (window.paintRefreshOnLangChange) window.paintRefreshOnLangChange();
    if (window.tmRefreshOnLangChange) window.tmRefreshOnLangChange();
    if (window.searchRefreshOnLangChange) window.searchRefreshOnLangChange();
    // Mobile launcher: rebuild
    if (mobileQuery.matches) buildMobileLauncher();
    // Update tray lang button
    if (langBtn) langBtn.textContent = getLang().toUpperCase();
  });

  /* Apply saved language to DOM on load (static HTML is always English) */
  if (getLang() !== 'en') setLanguage(getLang());

  /* ====================================================================
   * Screensaver activity listeners + resize handler
   * ==================================================================== */
  document.addEventListener('mousemove', ssRecordActivity);
  document.addEventListener('keydown', ssRecordActivity);
  document.addEventListener('click', ssRecordActivity);
  document.addEventListener('touchstart', ssRecordActivity);

  window.addEventListener('resize', () => {
    if (displaySettings.wallpaper !== 'none') applyDisplaySettings();
    reclampDesktopIcons();
    reclampStickyNotes();
  });

  /* ====================================================================
   * Draggable Desktop Icons with Context Menu
   * ==================================================================== */
  const GRID_PADDING_TOP = 16;
  const GRID_PADDING_LEFT = 20;
  const ICON_POSITION_KEY = 'mpOS-icon-positions';
  let iconDragState = null;
  let contextMenuEl = null;

  const getGridDimensions = () => {
    const style = getComputedStyle(document.documentElement);
    return {
      colW: parseInt(style.getPropertyValue('--grid-col-w'), 10) || 84,
      rowH: parseInt(style.getPropertyValue('--grid-row-h'), 10) || 88
    };
  };

  const getDefaultIconPositions = () => {
    const area = document.querySelector('.desktop-area');
    if (!area) return {};
    const grid = getGridDimensions();
    const areaH = area.clientHeight - GRID_PADDING_TOP;
    const maxRows = Math.max(1, Math.floor(areaH / grid.rowH));
    const icons = area.querySelectorAll('.desktop-icon[data-icon]');
    const positions = {};
    let col = 0;
    let row = 0;
    for (let i = 0; i < icons.length; i++) {
      const key = icons[i].getAttribute('data-icon');
      positions[key] = {
        left: GRID_PADDING_LEFT + col * grid.colW,
        top: GRID_PADDING_TOP + row * grid.rowH
      };
      row++;
      if (row >= maxRows) { row = 0; col++; }
    }
    return positions;
  };

  const snapToGrid = (x, y) => {
    const grid = getGridDimensions();
    const col = Math.max(0, Math.round((x - GRID_PADDING_LEFT) / grid.colW));
    const row = Math.max(0, Math.round((y - GRID_PADDING_TOP) / grid.rowH));
    return {
      left: GRID_PADDING_LEFT + col * grid.colW,
      top: GRID_PADDING_TOP + row * grid.rowH
    };
  };

  const saveIconPositions = () => {
    const icons = document.querySelectorAll('.desktop-icon[data-icon]');
    const positions = {};
    icons.forEach((icon) => {
      const key = icon.getAttribute('data-icon');
      positions[key] = {
        left: parseInt(icon.style.left, 10) || 0,
        top: parseInt(icon.style.top, 10) || 0
      };
    });
    try { localStorage.setItem(ICON_POSITION_KEY, JSON.stringify(positions)); } catch (e) { /* ignore */ }
  };

  const loadIconPositions = () => {
    try {
      const raw = localStorage.getItem(ICON_POSITION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  };

  const applyIconPositions = (positions) => {
    const icons = document.querySelectorAll('.desktop-icon[data-icon]');
    icons.forEach((icon) => {
      const key = icon.getAttribute('data-icon');
      const pos = positions[key];
      if (pos) {
        icon.style.left = `${pos.left}px`;
        icon.style.top = `${pos.top}px`;
      }
    });
  };

  const initDesktopIcons = () => {
    if (mobileQuery.matches) return;
    const saved = loadIconPositions();
    const defaults = getDefaultIconPositions();
    let positions;
    if (saved) {
      positions = {};
      const allKeys = Object.keys(defaults);
      for (let i = 0; i < allKeys.length; i++) {
        const k = allKeys[i];
        positions[k] = saved[k] || defaults[k];
      }
    } else {
      positions = defaults;
    }
    applyIconPositions(positions);
    requestAnimationFrame(() => {
      document.querySelectorAll('.desktop-icon[data-icon]').forEach((icon) => {
        icon.classList.add('icon-ready');
      });
    });
  };

  const reclampDesktopIcons = () => {
    if (mobileQuery.matches) return;
    const area = document.querySelector('.desktop-area');
    if (!area) return;
    const grid = getGridDimensions();
    const maxLeft = area.clientWidth - grid.colW;
    const maxTop = area.clientHeight - grid.rowH;
    const icons = area.querySelectorAll('.desktop-icon[data-icon]');
    let changed = false;
    icons.forEach((icon) => {
      let l = parseInt(icon.style.left, 10) || 0;
      let tp = parseInt(icon.style.top, 10) || 0;
      const cl = Math.max(0, Math.min(l, maxLeft));
      const ct = Math.max(0, Math.min(tp, maxTop));
      if (cl !== l || ct !== tp) {
        icon.style.left = `${cl}px`;
        icon.style.top = `${ct}px`;
        changed = true;
      }
    });
    if (changed) saveIconPositions();
  };

  /* -- Drag handlers -- */
  const initIconDrag = (icon, startX, startY) => {
    const rect = icon.getBoundingClientRect();
    const areaRect = icon.parentElement.getBoundingClientRect();
    iconDragState = {
      icon,
      offsetX: startX - rect.left,
      offsetY: startY - rect.top,
      areaRect,
      startLeft: parseInt(icon.style.left, 10) || 0,
      startTop: parseInt(icon.style.top, 10) || 0,
      hasMoved: false
    };
  };

  const onIconDragMove = (clientX, clientY) => {
    if (!iconDragState) return;
    const s = iconDragState;
    const grid = getGridDimensions();
    const newLeft = clientX - s.areaRect.left - s.offsetX;
    const newTop = clientY - s.areaRect.top - s.offsetY;

    if (!s.hasMoved) {
      const dx = Math.abs(newLeft - s.startLeft);
      const dy = Math.abs(newTop - s.startTop);
      if (dx < 4 && dy < 4) return;
      s.hasMoved = true;
      s.icon.classList.add('dragging');
    }

    const maxLeft = s.areaRect.width - grid.colW;
    const maxTop = s.areaRect.height - grid.rowH;
    const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
    const clampedTop = Math.max(0, Math.min(newTop, maxTop));
    s.icon.style.left = `${clampedLeft}px`;
    s.icon.style.top = `${clampedTop}px`;
  };

  const onIconDragEnd = () => {
    if (!iconDragState) return;
    const s = iconDragState;
    s.icon.classList.remove('dragging');
    if (s.hasMoved) {
      const currentLeft = parseInt(s.icon.style.left, 10) || 0;
      const currentTop = parseInt(s.icon.style.top, 10) || 0;
      const snapped = snapToGrid(currentLeft, currentTop);
      const grid = getGridDimensions();
      const area = s.icon.parentElement;
      const maxLeft = area.clientWidth - grid.colW;
      const maxTop = area.clientHeight - grid.rowH;
      s.icon.style.left = `${Math.max(0, Math.min(snapped.left, maxLeft))}px`;
      s.icon.style.top = `${Math.max(0, Math.min(snapped.top, maxTop))}px`;
      saveIconPositions();
    }
    iconDragState = null;
  };

  document.addEventListener('mousemove', (e) => {
    if (iconDragState) { onIconDragMove(e.clientX, e.clientY); e.preventDefault(); }
  });
  document.addEventListener('mouseup', () => {
    if (iconDragState) onIconDragEnd();
  });

  /* Icon selection + mousedown for drag */
  ;(() => {
    const area = document.querySelector('.desktop-area');
    if (!area) return;
    const icons = area.querySelectorAll('.desktop-icon[data-icon]');

    icons.forEach((icon) => {
      icon.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || mobileQuery.matches) return;
        dismissContextMenu();
        icons.forEach((ic) => { ic.classList.remove('selected'); });
        icon.classList.add('selected');
        initIconDrag(icon, e.clientX, e.clientY);
        e.preventDefault();
      });
    });

    area.addEventListener('mousedown', (e) => {
      if (e.target === area || e.target.classList.contains('desktop-area')) {
        icons.forEach((ic) => { ic.classList.remove('selected'); });
        dismissContextMenu();
      }
    });
  })();

  /* -- Context menu -- */
  const dismissContextMenu = () => {
    if (contextMenuEl && contextMenuEl.parentNode) {
      contextMenuEl.parentNode.removeChild(contextMenuEl);
    }
    contextMenuEl = null;
  };

  const showDesktopContextMenu = (x, y) => {
    dismissContextMenu();
    const area = document.querySelector('.desktop-area');
    if (!area) return;
    const areaRect = area.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.className = 'desktop-context-menu';

    const addItem = (labelKey, handler) => {
      const item = document.createElement('div');
      item.className = 'desktop-context-item';
      item.textContent = t(labelKey);
      item.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        dismissContextMenu();
        handler();
      });
      menu.appendChild(item);
      return item;
    };

    const addSep = () => {
      const s = document.createElement('div');
      s.className = 'desktop-context-sep';
      menu.appendChild(s);
    };

    const addSubmenu = (labelKey, items) => {
      const parent = document.createElement('div');
      parent.className = 'desktop-context-item has-submenu';
      parent.textContent = t(labelKey);
      const sub = document.createElement('div');
      sub.className = 'desktop-context-submenu';
      items.forEach((entry) => {
        const si = document.createElement('div');
        si.className = 'desktop-context-item';
        if (entry.checked) {
          const chk = document.createElement('span');
          chk.className = 'check';
          chk.textContent = '\u2713';
          si.appendChild(chk);
        }
        si.appendChild(document.createTextNode(entry.label));
        si.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          dismissContextMenu();
          entry.handler();
        });
        sub.appendChild(si);
      });
      parent.appendChild(sub);
      menu.appendChild(parent);
    };

    /* Arrange Icons */
    addItem('desktop.arrangeIcons', () => {
      const defaults = getDefaultIconPositions();
      applyIconPositions(defaults);
      saveIconPositions();
    });

    addSep();

    /* New submenu */
    addSubmenu('desktop.new', [
      {
        label: t('desktop.newTextDoc'),
        handler: () => {
          const win = document.getElementById('notepad');
          if (win && win.style.display !== 'none') {
            mpTaskbar.bringToFront(win);
          } else {
            openNotepad();
            notepadNew();
          }
        }
      },
      {
        label: t('desktop.newBitmap'),
        handler: () => {
          const win = document.getElementById('paint');
          if (win && win.style.display !== 'none') {
            mpTaskbar.bringToFront(win);
          } else {
            openPaint();
            paintNew();
          }
        }
      }
    ]);

    addSep();

    /* Wallpaper submenu */
    const wallpapers = ['none', 'sunset', 'dots', 'grid', 'diagonal', 'waves'];
    const wpItems = wallpapers.map((id) => ({
      label: t(`mc.display.wp.${id}`),
      checked: displaySettings.wallpaper === id,
      handler: () => {
        displaySettings.wallpaper = id;
        applyDisplaySettings();
        mcSaveSettings();
      }
    }));
    addSubmenu('desktop.wallpaper', wpItems);

    addSep();

    /* Properties */
    addItem('desktop.properties', () => {
      openMyComputer();
      mcSwitchTab('display');
    });

    area.appendChild(menu);
    contextMenuEl = menu;

    /* Position relative to area, clamped to bounds */
    let menuLeft = x - areaRect.left;
    let menuTop = y - areaRect.top;
    const menuW = menu.offsetWidth;
    const menuH = menu.offsetHeight;
    if (menuLeft + menuW > areaRect.width) menuLeft = areaRect.width - menuW;
    if (menuTop + menuH > areaRect.height) menuTop = areaRect.height - menuH;
    if (menuLeft < 0) menuLeft = 0;
    if (menuTop < 0) menuTop = 0;
    menu.style.left = `${menuLeft}px`;
    menu.style.top = `${menuTop}px`;

    /* Flip submenus left if they would overflow the right edge */
    const subs = menu.querySelectorAll('.desktop-context-submenu');
    const menuRight = areaRect.left + menuLeft + menuW;
    subs.forEach((sub) => {
      sub.style.display = 'block';
      const overflows = menuRight + sub.offsetWidth > areaRect.right;
      sub.style.display = '';
      if (overflows) sub.classList.add('flip-left');
    });
  };

  ;(() => {
    const area = document.querySelector('.desktop-area');
    if (!area) return;

    area.addEventListener('contextmenu', (e) => {
      if (mobileQuery.matches) return;
      /* Only on background, not on icons */
      let el = e.target;
      while (el && el !== area) {
        if (el.classList && el.classList.contains('desktop-icon')) return;
        el = el.parentElement;
      }
      e.preventDefault();
      showDesktopContextMenu(e.clientX, e.clientY);
    });
  })();

  document.addEventListener('mousedown', (e) => {
    if (contextMenuEl && !contextMenuEl.contains(e.target)) {
      dismissContextMenu();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && contextMenuEl) dismissContextMenu();
  });

  /* Initialize icon positions on load */
  initDesktopIcons();

  /* ====================================================================
   * Touch: single-tap desktop icons (instead of double-click)
   * ==================================================================== */
  if (window.matchMedia('(pointer: coarse)').matches) {
    const iconActions = {
      openMyComputer,
      openExplorer,
      openBrowser,
      openArchiveBrowser
    };
    document.querySelectorAll('.desktop-icon[ondblclick]').forEach((icon) => {
      const attr = icon.getAttribute('ondblclick');
      const match = attr.match(/^(\w+)\(\)$/);
      if (match && iconActions[match[1]]) {
        icon.addEventListener('click', () => { iconActions[match[1]](); });
        icon.removeAttribute('ondblclick');
      }
    });
  }

  /* ====================================================================
   * Exports
   * ==================================================================== */
  window.exitSite = exitSite;
  window.initDesktopIcons = initDesktopIcons;
  window.reclampDesktopIcons = reclampDesktopIcons;
  window.openVoiceCommands = openVoiceCommands;
  window.closeVoiceCommands = closeVoiceCommands;
  window.ICON_POSITION_KEY = ICON_POSITION_KEY;

  /* Register with core.js registries */
  mpRegisterActions({ openVoiceCommands });
  mpRegisterWindows({ voicecommands: 'Voice Commands' });
  mpRegisterCloseHandlers({ voicecommands: closeVoiceCommands });

})();
