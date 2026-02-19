/* i18n engine — mpOS */
(function () {
  var LANGS = {};
  var current = 'en';

  function registerLang(code, strings) { LANGS[code] = strings; }

  /* ── English strings ── */
  registerLang('en', {
    /* UI chrome */
    'ui.start': 'Start',
    'ui.programs': 'Programs',
    'ui.games': 'Games',
    'ui.internet': 'Internet',
    'ui.accessories': 'Accessories',
    'ui.documents': 'Documents',
    'ui.utilities': 'Utilities',
    'ui.help': 'Help',
    'ui.search': 'Search',
    'ui.run': 'Run...',
    'ui.exitSite': 'Exit Site',
    'ui.close': 'Close',
    'ui.minimize': 'Minimize',
    'ui.ok': 'OK',
    'ui.cancel': 'Cancel',
    'ui.save': 'Save',
    'ui.open': 'Open',
    'ui.new': 'New',
    'ui.delete': 'Del',
    'ui.yes': 'Yes',
    'ui.no': 'No',
    'ui.address': 'Address',
    'ui.volume': 'Volume',
    'ui.mute': 'Mute',
    'ui.scientific': 'Scientific',
    'ui.today': 'Today',
    'ui.digital': 'Digital',
    'ui.analog': 'Analog',
    'ui.noDocumentsYet': 'No documents yet',
    'ui.undo': 'Undo',
    'ui.redo': 'Redo',
    'ui.clear': 'Clear',
    'ui.confirm': 'mpOS',
    'ui.stop': 'Stop',
    'ui.reset': 'Reset',
    'ui.lap': 'Lap',

    /* Desktop icon labels */
    'desktop.myComputer': 'My Computer',
    'desktop.files': 'Files',
    'desktop.wikiBrowser': 'WikiBrowser',
    'desktop.arrangeIcons': 'Arrange Icons',
    'desktop.alignToGrid': 'Align to Grid',
    'desktop.properties': 'Properties',

    /* Window titles */
    'title.systemProperties': 'System Properties',
    'title.files': 'Files',
    'title.fishOfDay': 'Fish of the Day',
    'title.aquarium': 'Virtual Aquarium',
    'title.fishFinder': 'Fish Finder',
    'title.onTarget': 'On Target',
    'title.brickBreaker': 'Brick Breaker',
    'title.run': 'Run',
    'title.wikiBrowser': 'WikiBrowser',
    'title.notepad': 'Notepad',
    'title.calculator': 'Calculator',
    'title.calendar': 'Calendar',
    'title.timeZone': 'Time Zone',
    'title.weather': 'Weather',
    'title.diskUsage': 'Disk Usage',
    'title.visitorMap': 'Visitor Map',
    'title.help': 'mpOS Help',
    'title.searchResults': 'Search Results',
    'title.paint': 'Paint',
    'title.taskManager': 'Task Manager',
    'title.chickenFingers': 'Chicken Fingers',
    'title.stopwatch': 'Stopwatch',
    'title.stickyNotes': 'Sticky Notes',
    'title.voiceCommands': 'Voice Commands',

    /* Start menu: Search sub-items */
    'startSearch.files': 'For Files or Folders...',
    'startSearch.help': 'For Help Topics...',
    'startSearch.internet': 'On the Internet',

    /* App names (FOLDER_ITEMS + launcher) */
    'app.wikiBrowser.name': 'WikiBrowser',
    'app.wikiBrowser.desc': 'Browse Wikipedia from within mpOS.',
    'app.fishOfDay.name': 'Fish of the Day',
    'app.fishOfDay.desc': 'A new fish every day, powered by Wikipedia.',
    'app.fishFinder.name': 'Fish Finder',
    'app.fishFinder.desc': 'Find the closest aquarium near you.',
    'app.onTarget.name': 'On Target',
    'app.onTarget.desc': 'A two-player target shooting game.',
    'app.aquarium.name': 'Virtual Aquarium',
    'app.aquarium.desc': 'Watch real fish, in real-time.',
    'app.chickenFingers.name': 'Chicken Fingers',
    'app.chickenFingers.desc': 'A two-player touch game.',
    'app.paint.name': 'Paint',
    'app.paint.desc': 'Create and edit images.',
    'app.brickBreaker.name': 'Brick Breaker',
    'app.brickBreaker.desc': 'Daily brick-breaking challenge.',
    'app.notepad.name': 'Notepad',
    'app.notepad.desc': 'A simple text editor with save and load.',
    'app.calculator.name': 'Calculator',
    'app.calculator.desc': 'Basic arithmetic calculator.',
    'app.calendar.name': 'Calendar',
    'app.calendar.desc': 'Monthly calendar viewer.',
    'app.timeZone.name': 'Time Zone',
    'app.timeZone.desc': 'World clocks for 8 cities.',
    'app.weather.name': 'Weather',
    'app.weather.desc': 'Three-day forecast for your location.',
    'app.diskUsage.name': 'Disk Usage',
    'app.diskUsage.desc': 'Source code breakdown by file type.',
    'app.visitorMap.name': 'Visitor Map',
    'app.visitorMap.desc': 'See where visitors are coming from.',
    'app.help.name': 'Help',
    'app.help.desc': 'Browse the mpOS help documentation.',
    'app.search.name': 'Search',
    'app.search.desc': 'Search for files, programs, and commands.',
    'app.noiseMixer.name': 'White Noise',
    'app.noiseMixer.desc': 'Mix colored noise for focus, sleep, or relaxation.',
    'app.stopwatch.name': 'Stopwatch',
    'app.stopwatch.desc': 'Stopwatch with lap times.',
    'app.stickyNotes.name': 'Sticky Notes',
    'app.stickyNotes.desc': 'Post-it style notes on the desktop.',
    'app.voiceCommands.name': 'Voice Commands',
    'app.voiceCommands.desc': 'Control mpOS with your voice.',
    'sticky.deleteConfirm': 'Delete this note?',
    'app.myComputer.name': 'My Computer',
    'app.files.name': 'Files',

    /* Explorer */
    'explorer.folderEmpty': 'This folder is empty.',
    'explorer.itemCount.one': '{count} item',
    'explorer.itemCount.other': '{count} items',

    /* Explorer sidebar */
    'explorer.sidebar.mpOS': 'mpOS',
    'explorer.sidebar.programs': 'Programs',
    'explorer.sidebar.games': 'Games',
    'explorer.sidebar.internet': 'Internet',
    'explorer.sidebar.accessories': 'Accessories',
    'explorer.sidebar.documents': 'Documents',
    'explorer.sidebar.utilities': 'Utilities',

    /* System Properties — General tab */
    'mc.tab.general': 'General',
    'mc.tab.display': 'Display',
    'mc.tab.screensaver': 'Screen Saver',
    'mc.tab.regional': 'Region',
    'mc.general.system': 'System',
    'mc.general.cpuCores': 'CPU Cores',
    'mc.general.logicalProcessors': '{count} logical processors',
    'mc.general.language': 'Language',
    'mc.general.display': 'Display',
    'mc.general.resolution': 'Resolution',
    'mc.general.pixelRatio': 'Pixel Ratio',
    'mc.general.hidpi': '(HiDPI)',
    'mc.general.network': 'Network',
    'mc.general.type': 'Type',
    'mc.general.downlink': 'Downlink',
    'mc.general.battery': 'Battery',
    'mc.general.level': 'Level',
    'mc.general.charging': 'Charging',

    /* System Properties — Display tab */
    'mc.display.bgColor': 'Background Color',
    'mc.display.wallpaper': 'Wallpaper Pattern',
    'mc.display.resetDefaults': 'Reset Defaults',
    'mc.display.wp.none': 'None',
    'mc.display.wp.sunset': 'Sunset',
    'mc.display.wp.dots': 'Dots',
    'mc.display.wp.grid': 'Grid',
    'mc.display.wp.diagonal': 'Diagonal',
    'mc.display.wp.waves': 'Waves',

    /* System Properties — Screen Saver tab */
    'mc.ss.label': 'Screen Saver:',
    'mc.ss.starfield': 'Starfield',
    'mc.ss.pipes': 'Pipes',
    'mc.ss.bouncing': 'Bouncing Logo',
    'mc.ss.colorcycle': 'Color Cycling',
    'mc.ss.mystify': 'Mystify',
    'mc.ss.wait': 'Wait:',
    'mc.ss.minute.one': '{count} minute',
    'mc.ss.minute.other': '{count} minutes',
    'mc.ss.enable': 'Enable screen saver',

    /* System Properties — Regional tab */
    'mc.regional.language': 'Language',
    'mc.regional.english': 'English',
    'mc.regional.portuguese': 'Portugu\u00eas (Portugal)',
    'mc.regional.clock': 'Clock',
    'mc.regional.12hr': '12-hour (AM/PM)',
    'mc.regional.24hr': '24-hour',
    'mc.regional.date': 'Date Format',
    'mc.regional.mdy': 'MM/DD/YYYY',
    'mc.regional.dmy': 'DD/MM/YYYY',
    'mc.regional.ymd': 'YYYY-MM-DD',
    'mc.regional.temp': 'Temperature',
    'mc.regional.celsius': 'Celsius (\u00b0C)',
    'mc.regional.fahrenheit': 'Fahrenheit (\u00b0F)',

    /* Fish of the Day */
    'fish.loadingImage': 'Loading image...',
    'fish.noPhoto': 'No photo available',
    'fish.photoUnavailable': 'Photo unavailable',
    'fish.family': 'Family',
    'fish.order': 'Order',
    'fish.maxSize': 'Max Size',
    'fish.habitat': 'Habitat',
    'fish.depth': 'Depth',
    'fish.openInBrowser': 'Open in WikiBrowser',
    'fish.poweredBy': 'Powered by Wikipedia',

    /* Fish Finder */
    'finder.locating': 'Locating you...',
    'finder.nearest': 'Nearest Aquarium',
    'finder.furthest': 'Furthest Aquarium',
    'finder.dbCount': '{count} aquariums in database',

    /* Aquarium */
    'aquarium.connecting': 'Connecting to live feed...',
    'aquarium.poweredBy': 'Powered by explore.org',

    /* Chicken Fingers */
    'chicken.touchRequired.title': 'Touchscreen Required',
    'chicken.touchRequired.body': 'This game requires a touchscreen device to play. Please open this page on a phone or tablet.',

    /* WikiBrowser */
    'browser.placeholder': 'Search Wikipedia or enter article name...',

    /* Notepad */
    'notepad.untitled': 'Untitled',
    'notepad.titleSuffix': '- Notepad',
    'notepad.saved': 'Saved',
    'notepad.charCount.one': '{count} character',
    'notepad.charCount.other': '{count} characters',
    'notepad.discardChanges': 'You have unsaved changes. Discard them?',
    'notepad.fileName': 'File name:',
    'notepad.openFile': 'Open a file:',
    'notepad.noSavedFiles': 'No saved files.',
    'notepad.deleteConfirm': 'Delete "{name}"?',
    'notepad.overwriteConfirm': '"{name}" already exists. Overwrite?',
    'notepad.placeholder': 'Type here...',
    'notepad.find': 'Find:',
    'notepad.matchCase': 'Match case',
    'notepad.replace': 'Replace:',
    'notepad.replaceBtn': 'Replace',
    'notepad.replaceAll': 'Replace All',
    'notepad.matchCount': '{current} of {total}',
    'notepad.noMatches': '0 matches',
    'notepad.storageFull': 'Storage is full. Could not save.',

    /* Calendar */
    'cal.months.0': 'January',
    'cal.months.1': 'February',
    'cal.months.2': 'March',
    'cal.months.3': 'April',
    'cal.months.4': 'May',
    'cal.months.5': 'June',
    'cal.months.6': 'July',
    'cal.months.7': 'August',
    'cal.months.8': 'September',
    'cal.months.9': 'October',
    'cal.months.10': 'November',
    'cal.months.11': 'December',
    'cal.days.0': 'Mo',
    'cal.days.1': 'Tu',
    'cal.days.2': 'We',
    'cal.days.3': 'Th',
    'cal.days.4': 'Fr',
    'cal.days.5': 'Sa',
    'cal.days.6': 'Su',

    /* Weather */
    'weather.loading': 'Loading weather data...',
    'weather.poweredBy': 'Powered by Open-Meteo',
    'weather.code.0': 'Clear sky',
    'weather.code.1': 'Mainly clear',
    'weather.code.2': 'Partly cloudy',
    'weather.code.3': 'Overcast',
    'weather.code.45': 'Fog',
    'weather.code.48': 'Rime fog',
    'weather.code.51': 'Light drizzle',
    'weather.code.53': 'Drizzle',
    'weather.code.55': 'Dense drizzle',
    'weather.code.61': 'Slight rain',
    'weather.code.63': 'Rain',
    'weather.code.65': 'Heavy rain',
    'weather.code.66': 'Light freezing rain',
    'weather.code.67': 'Freezing rain',
    'weather.code.71': 'Slight snow',
    'weather.code.73': 'Snow',
    'weather.code.75': 'Heavy snow',
    'weather.code.77': 'Snow grains',
    'weather.code.80': 'Light showers',
    'weather.code.81': 'Showers',
    'weather.code.82': 'Heavy showers',
    'weather.code.85': 'Snow showers',
    'weather.code.86': 'Heavy snow showers',
    'weather.code.95': 'Thunderstorm',
    'weather.code.96': 'Thunderstorm w/ hail',
    'weather.code.99': 'Severe thunderstorm',
    'weather.unknown': 'Unknown',

    /* Disk Usage */
    'du.scanning': 'Scanning disk...',
    'du.noFiles': 'No files found.',
    'du.header': 'mpOS Virtual Disk',
    'du.filesystem': 'File system: HTMLFS',
    'du.total': 'Total: {size} ({count} files)',
    'du.scanned': '{count} files scanned',

    /* Visitor Map */
    'vm.loading': 'Loading visitor data...',
    'vm.loadError': 'Could not load visitor data. The server may be temporarily unavailable.',
    'vm.countries': 'Countries',
    'vm.mapUnavailable': 'Map data unavailable.',
    'vm.countryCount.one': '{count} country',
    'vm.countryCount.other': '{count} countries',

    /* Help UI */
    'help.hide': 'Hide',
    'help.show': 'Show',
    'help.back': 'Back',
    'help.forward': 'Forward',
    'help.home': 'Home',
    'help.tab.contents': 'Contents',
    'help.tab.index': 'Index',
    'help.tab.search': 'Search',
    'help.indexHeader': 'Type a keyword:',
    'help.noKeywords': 'No matching keywords.',
    'help.searchHeader': 'Search for:',
    'help.listTopics': 'List Topics',
    'help.noTopics': 'No topics found.',
    'help.seeAlso': 'See also:',
    'help.titlePrefix': 'mpOS Help',

    /* Paint */
    'paint.untitled': 'Untitled',
    'paint.titleSuffix': '- Paint',
    'paint.saved': 'Saved',
    'paint.tool.pencil': 'Pencil',
    'paint.tool.brush': 'Brush',
    'paint.tool.eraser': 'Eraser',
    'paint.tool.line': 'Line',
    'paint.tool.rect': 'Rectangle',
    'paint.tool.ellipse': 'Ellipse',
    'paint.tool.fill': 'Fill',
    'paint.fileName': 'File name:',
    'paint.openFile': 'Open a file:',
    'paint.noSavedFiles': 'No saved files.',
    'paint.discardChanges': 'You have unsaved changes. Discard them?',
    'paint.deleteConfirm': 'Delete "{name}"?',
    'paint.overwriteConfirm': '"{name}" already exists. Overwrite?',
    'paint.storageFull': 'Storage is full. Could not save.',
    'paint.sizeLabel': 'Size:',
    'paint.undo': 'Undo',
    'paint.redo': 'Redo',
    'paint.clear': 'Clear',

    /* Task Manager */
    'tm.tab.apps': 'Applications',
    'tm.tab.perf': 'Performance',
    'tm.endTask': 'End Task',
    'tm.switchTo': 'Switch To',
    'tm.running': 'Running',
    'tm.cpuUsage': 'CPU Usage',
    'tm.memUsage': 'Memory Usage',
    'tm.notAvailable': 'Not available',
    'tm.processes': 'Processes: {count}',
    'tm.cpuStatus': 'CPU Usage: {pct}%',
    'tm.memStatus': 'Mem Usage: {value}',

    /* Search */
    'search.title': 'Search for files or folders',
    'search.named': 'Named:',
    'search.searchNow': 'Search Now',
    'search.ready': 'Ready',
    'search.noResults': 'No items match your search.',
    'search.itemsFound': '{count} items found',
    'search.group.games': 'Games',
    'search.group.internet': 'Internet',
    'search.group.accessories': 'Accessories',
    'search.group.utilities': 'Utilities',
    'search.group.files': 'Files',
    'search.group.commands': 'Commands',

    /* Geo errors */
    'error.geoDenied': 'Location access was denied.',
    'error.geoUnavailable': 'Location information is unavailable.',
    'error.geoTimeout': 'Location request timed out.',
    'error.geoFallback': 'Could not determine your location.',

    /* Voice Commands */
    'voice.title': 'Voice Commands',
    'voice.clickToSpeak': 'Click mic to speak',
    'voice.listening': 'Listening\u2026',
    'voice.launched': 'Launched!',
    'voice.noSpeech': 'No speech detected',
    'voice.denied': 'Microphone access denied',
    'voice.error': 'Recognition error',
    'voice.notRecognized': 'Command not recognized',
    'voice.tryAgain': 'Try again',
    'voice.didYouMean': 'Did you mean "{app}"?',
    'voice.close': 'Close',
    'voice.minimize': 'Minimize',
    'voice.closed': 'Closed',
    'voice.minimized': 'Minimized',
    'voice.langSwitched': 'Language switched',
    'voice.noWindow': 'No open window found',
    'voice.helpTitle': 'What can I say?',
    'voice.helpOpen': '"Open [app name]"',
    'voice.helpClose': '"Close [app name]"',
    'voice.helpMinimize': '"Minimize [app name]"',
    'voice.helpLang': '"Switch language"',

    /* Mobile launcher */
    'launcher.games': 'Games',
    'launcher.internet': 'Internet',
    'launcher.accessories': 'Accessories',
    'launcher.utilities': 'Utilities',
    'launcher.system': 'System',

    /* WINDOW_NAMES (used in taskbar + task manager) */
    'win.mycomputer': 'System Properties',
    'win.explorer': 'Files',
    'win.fishofday': 'Fish of the Day',
    'win.aquarium': 'Virtual Aquarium',
    'win.fishfinder': 'Fish Finder',
    'win.ontarget': 'On Target',
    'win.brickbreaker': 'Brick Breaker',
    'win.run': 'Run',
    'win.browser': 'WikiBrowser',
    'win.notepad': 'Notepad',
    'win.calculator': 'Calculator',
    'win.calendar': 'Calendar',
    'win.timezone': 'Time Zone',
    'win.weather': 'Weather',
    'win.diskusage': 'Disk Usage',
    'win.visitormap': 'Visitor Map',
    'win.help': 'Help',
    'win.paint': 'Paint',
    'win.search': 'Search Results',
    'win.taskmanager': 'Task Manager',
    'win.noisemixer': 'White Noise',
    'win.stopwatch': 'Stopwatch',
    'win.voicecommands': 'Voice Commands'
  });

  /* Restore saved language */
  try {
    var saved = localStorage.getItem('mp-lang');
    if (saved && saved === 'pt') current = 'pt';
  } catch (e) {}

  /* Lookup with {var} interpolation */
  function t(key, vars) {
    var str = (LANGS[current] && LANGS[current][key]) || (LANGS.en && LANGS.en[key]) || key;
    if (vars) {
      for (var k in vars) {
        if (vars.hasOwnProperty(k)) {
          str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
        }
      }
    }
    return str;
  }

  /* Plural helper: Portuguese 0/1 = singular, English only 1 = singular */
  function tPlural(key, count, vars) {
    var suffix = (current === 'pt')
      ? (count === 0 || count === 1 ? '.one' : '.other')
      : (count === 1 ? '.one' : '.other');
    var merged = {};
    if (vars) { for (var k in vars) { if (vars.hasOwnProperty(k)) merged[k] = vars[k]; } }
    merged.count = count;
    return t(key + suffix, merged);
  }

  function setLanguage(lang) {
    if (!LANGS[lang]) return;
    current = lang;
    try { localStorage.setItem('mp-lang', lang); } catch (e) {}
    document.documentElement.lang = lang;
    /* Scan data-i18n elements */
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var k = el.getAttribute('data-i18n');
      var attr = el.getAttribute('data-i18n-attr');
      if (attr === 'placeholder') el.placeholder = t(k);
      else if (attr === 'title') el.title = t(k);
      else el.textContent = t(k);
    }
    window.dispatchEvent(new Event('languagechange'));
  }

  function getLang() { return current; }

  window.t = t;
  window.tPlural = tPlural;
  window.setLanguage = setLanguage;
  window.getLang = getLang;
  window._mpLangRegister = registerLang;
})();
