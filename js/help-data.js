/* Help Topics — Data file for the mpOS Help system
   HELP_TREE defines the navigation structure (folders and topic IDs).
   HELP_TOPICS maps each topic ID to its title, keywords, and body blocks.

   Body block types:
     { p: 'text' }                    — paragraph
     { h: 'text' }                    — subheading
     { ul: ['item1', 'item2'] }       — unordered list
     { sa: ['topicId1', 'topicId2'] } — "See also" links
*/

var HELP_TREE = [
  { title: 'Getting Started', children: ['welcome', 'desktop', 'startmenu', 'taskbar'] },
  { title: 'Programs',        children: ['wikibrowser', 'fishofday', 'fishfinder', 'ontarget', 'aquarium', 'chickenfingers'] },
  { title: 'Utilities',       children: ['notepad', 'calculator', 'calendar', 'timezone', 'weather', 'diskusage'] },
  { title: 'System',          children: ['mycomputer', 'explorer', 'run'] }
];

var HELP_TOPICS = {

  /* ── Getting Started ── */

  welcome: {
    title: 'Welcome to mpOS',
    keywords: ['welcome', 'getting started', 'about', 'home', 'introduction', 'overview'],
    body: [
      { p: 'Welcome to mpOS, a desktop operating system experience built entirely in the browser.' },
      { p: 'mpOS features draggable windows, a taskbar with minimize and restore, a Start menu with programs and utilities, a file explorer, and a terminal.' },
      { h: 'Getting Around' },
      { ul: [
        'Click the Start button to open the Start menu.',
        'Double-click desktop icons to open applications.',
        'Drag window title bars to reposition windows.',
        'Click a taskbar button to minimize or restore a window.'
      ]},
      { h: 'What You Can Do' },
      { ul: [
        'Browse Wikipedia with WikiBrowser.',
        'Discover a new fish every day with Fish of the Day.',
        'Play games like On Target and Chicken Fingers.',
        'Use utilities such as Notepad, Calculator, Calendar, and more.',
        'Explore system information with My Computer.'
      ]},
      { sa: ['desktop', 'startmenu', 'taskbar'] }
    ]
  },

  desktop: {
    title: 'Desktop Overview',
    keywords: ['desktop', 'icons', 'background', 'workspace', 'double-click'],
    body: [
      { p: 'The desktop is your main workspace. It displays a blue background with shortcut icons for frequently used applications.' },
      { h: 'Desktop Icons' },
      { ul: [
        'My Computer \u2014 displays system and browser information.',
        'Files \u2014 opens the file explorer to browse all applications.',
        'WikiBrowser \u2014 an in-app Wikipedia browser.'
      ]},
      { p: 'Double-click any desktop icon to open its application. You can also use keyboard navigation: Tab to focus an icon, then press Enter to open it.' },
      { sa: ['startmenu', 'taskbar', 'explorer'] }
    ]
  },

  startmenu: {
    title: 'Using the Start Menu',
    keywords: ['start menu', 'start button', 'programs', 'documents', 'utilities', 'run', 'exit', 'launch'],
    body: [
      { p: 'The Start menu is your main entry point for launching applications. Click the Start button at the bottom-left of the screen to open it.' },
      { h: 'Menu Structure' },
      { ul: [
        'Programs \u2014 hover to see a submenu with WikiBrowser, Fish of the Day, Fish Finder, On Target, Virtual Aquarium, and Chicken Fingers. Click the label itself to open the Programs folder in Explorer.',
        'Documents \u2014 hover to see saved documents (created in Notepad). Click the label to open the Documents folder.',
        'Utilities \u2014 hover for Notepad, Calculator, Calendar, Time Zone, Weather, Disk Usage, and Help.',
        'Help \u2014 opens this Help viewer.',
        'Run \u2014 opens the command-line terminal.',
        'Exit Site \u2014 closes the browser tab.'
      ]},
      { sa: ['taskbar', 'run'] }
    ]
  },

  taskbar: {
    title: 'Using the Taskbar',
    keywords: ['taskbar', 'minimize', 'restore', 'system tray', 'clock', 'volume', 'window management'],
    body: [
      { p: 'The taskbar runs along the bottom of the screen. It contains the Start button, open-window buttons, and the system tray.' },
      { h: 'Window Buttons' },
      { p: 'Each open window gets a button in the taskbar. Click the button to minimize a visible window or restore a minimized one. The active window\u2019s button appears pressed.' },
      { h: 'System Tray' },
      { p: 'The system tray is on the right side of the taskbar. It contains:' },
      { ul: [
        'Volume icon \u2014 click to adjust the system sound volume or mute.',
        'Clock \u2014 displays the current time.'
      ]},
      { sa: ['startmenu', 'desktop'] }
    ]
  },

  /* ── Programs ── */

  wikibrowser: {
    title: 'WikiBrowser',
    keywords: ['wikibrowser', 'wikipedia', 'browser', 'search', 'internet', 'web', 'browse', 'article'],
    body: [
      { p: 'WikiBrowser lets you browse Wikipedia without leaving mpOS. It loads Wikipedia\u2019s mobile site inside an embedded frame.' },
      { h: 'How to Use' },
      { ul: [
        'Type a search term or Wikipedia URL into the address bar and press Enter.',
        'The page loads inside the viewer. Links within Wikipedia work normally.',
        'The title bar updates to show the current article name.'
      ]},
      { h: 'Opening WikiBrowser' },
      { ul: [
        'Double-click the WikiBrowser icon on the desktop.',
        'Start menu \u2192 Programs \u2192 WikiBrowser.',
        'Type BROWSER in the Run terminal.'
      ]},
      { sa: ['fishofday', 'startmenu'] }
    ]
  },

  fishofday: {
    title: 'Fish of the Day',
    keywords: ['fish of the day', 'fish', 'daily', 'wikipedia', 'species', 'photo', 'marine'],
    body: [
      { p: 'Fish of the Day showcases a different fish species every day. It displays a photo (fetched from Wikipedia), the common and scientific names, and details like family, habitat, and maximum size.' },
      { h: 'Features' },
      { ul: [
        'A new fish is selected each day from a built-in dataset of hundreds of species.',
        'Click the fish name (when underlined) to open its Wikipedia article in WikiBrowser.',
        'The status bar shows today\u2019s date.'
      ]},
      { h: 'Opening Fish of the Day' },
      { ul: [
        'Start menu \u2192 Programs \u2192 Fish of the Day.',
        'Type FISHOFDAY in the Run terminal.'
      ]},
      { sa: ['fishfinder', 'wikibrowser'] }
    ]
  },

  fishfinder: {
    title: 'Fish Finder',
    keywords: ['fish finder', 'aquarium', 'nearest', 'furthest', 'location', 'geolocation', 'distance', 'map'],
    body: [
      { p: 'Fish Finder uses your location to find the nearest and furthest aquariums from a database of 50+ aquariums worldwide.' },
      { h: 'How It Works' },
      { ul: [
        'When you open Fish Finder, it requests your location via the browser\u2019s Geolocation API.',
        'It calculates the distance to every aquarium in its database.',
        'The nearest and furthest aquariums are displayed with their name, city, and distance in both kilometers and miles.',
        'Click an aquarium name (when linked) to visit its website.'
      ]},
      { p: 'If location access is denied, an error message will be shown.' },
      { sa: ['fishofday', 'aquarium'] }
    ]
  },

  ontarget: {
    title: 'On Target',
    keywords: ['on target', 'game', 'target', 'shooting', 'two-player', 'aim', 'score'],
    body: [
      { p: 'On Target is a two-player target shooting game. Players take turns tapping or clicking targets that appear on screen.' },
      { h: 'How to Play' },
      { ul: [
        'The game loads in an embedded frame.',
        'Follow the on-screen instructions to start a match.',
        'Players alternate turns shooting at targets.',
        'The player with the higher score wins.'
      ]},
      { h: 'Opening On Target' },
      { ul: [
        'Start menu \u2192 Programs \u2192 On Target.',
        'Type ONTARGET in the Run terminal.',
        'On mobile, the game opens as a full-screen page.'
      ]},
      { sa: ['chickenfingers', 'aquarium'] }
    ]
  },

  aquarium: {
    title: 'Virtual Aquarium',
    keywords: ['aquarium', 'virtual', 'fish', 'live', 'stream', 'camera', 'youtube', 'video', 'watch'],
    body: [
      { p: 'Virtual Aquarium streams a live fish camera feed from explore.org. Watch real fish swimming in real-time.' },
      { h: 'How It Works' },
      { ul: [
        'The aquarium loads a YouTube live stream using the YouTube IFrame Player API.',
        'The video starts muted and autoplays.',
        'A loading shield covers the video for a few seconds while the stream connects.',
        'Closing the window fully unloads the video player to save resources.'
      ]},
      { sa: ['fishofday', 'fishfinder'] }
    ]
  },

  chickenfingers: {
    title: 'Chicken Fingers',
    keywords: ['chicken fingers', 'game', 'touch', 'touchscreen', 'mobile', 'two-player', 'phone', 'tablet'],
    body: [
      { p: 'Chicken Fingers is a two-player touchscreen game. It requires a device with a touchscreen to play.' },
      { h: 'Requirements' },
      { p: 'This game only works on phones and tablets. On desktop computers, an error dialog will appear explaining that a touchscreen is required.' },
      { h: 'How to Play' },
      { ul: [
        'Open the game on a touchscreen device.',
        'The game navigates to a dedicated full-screen page.',
        'Follow the on-screen instructions to play with two players.'
      ]},
      { sa: ['ontarget'] }
    ]
  },

  /* ── Utilities ── */

  notepad: {
    title: 'Notepad',
    keywords: ['notepad', 'text', 'editor', 'save', 'open', 'write', 'file', 'document', 'type'],
    body: [
      { p: 'Notepad is a simple text editor with save and load functionality. Files are stored in your browser\u2019s local storage.' },
      { h: 'Toolbar Buttons' },
      { ul: [
        'New \u2014 clears the editor and starts a new file. Prompts to discard unsaved changes.',
        'Save \u2014 saves the current file. If no filename exists, prompts for a name.',
        'Open \u2014 shows a list of saved files to open or delete.'
      ]},
      { h: 'Features' },
      { ul: [
        'The title bar shows the current filename and an asterisk (*) for unsaved changes.',
        'The status bar shows the character count.',
        'Files persist across browser sessions via localStorage.'
      ]},
      { sa: ['calculator', 'explorer'] }
    ]
  },

  calculator: {
    title: 'Calculator',
    keywords: ['calculator', 'math', 'arithmetic', 'add', 'subtract', 'multiply', 'divide', 'keyboard'],
    body: [
      { p: 'A basic arithmetic calculator supporting addition, subtraction, multiplication, and division.' },
      { h: 'Using the Calculator' },
      { ul: [
        'Click number buttons or use your keyboard (0\u20139) to enter digits.',
        'Click an operator (+, \u2212, \u00d7, \u00f7) or use keyboard keys (+, -, *, /).',
        'Press = or Enter to calculate the result.',
        'CE clears the current entry; C clears everything.',
        'Backspace removes the last digit.'
      ]},
      { p: 'The calculator supports up to 15 digits per number.' },
      { sa: ['notepad', 'calendar'] }
    ]
  },

  calendar: {
    title: 'Calendar',
    keywords: ['calendar', 'date', 'month', 'today', 'schedule', 'day', 'year'],
    body: [
      { p: 'A monthly calendar viewer. The current day is highlighted.' },
      { h: 'Navigation' },
      { ul: [
        'Use the left and right arrows to move between months.',
        'Click \u201cToday\u201d to jump back to the current date.',
        'Days from adjacent months are shown in gray.'
      ]},
      { sa: ['timezone', 'weather'] }
    ]
  },

  timezone: {
    title: 'Time Zone',
    keywords: ['time zone', 'clock', 'world clock', 'time', 'analog', 'digital', 'cities', 'utc'],
    body: [
      { p: 'Time Zone displays live clocks for 8 cities around the world: London, New York, Los Angeles, Tokyo, Sydney, Dubai, Paris, and Singapore.' },
      { h: 'Views' },
      { ul: [
        'Analog \u2014 traditional clock faces with hour, minute, and second hands.',
        'Digital \u2014 numeric time display. Click the \u201cDigital\u201d / \u201cAnalog\u201d button to toggle.'
      ]},
      { p: 'Clocks update every second. The UTC offset for each city is shown below its name.' },
      { sa: ['calendar', 'weather'] }
    ]
  },

  weather: {
    title: 'Weather',
    keywords: ['weather', 'forecast', 'temperature', 'rain', 'sun', 'cloud', 'location', 'geolocation'],
    body: [
      { p: 'Weather shows a three-day forecast for your current location, powered by the Open-Meteo API.' },
      { h: 'How It Works' },
      { ul: [
        'On first open, the app requests your location via the browser\u2019s Geolocation API.',
        'It then fetches the current temperature and a 3-day forecast.',
        'The current conditions (temperature and description) are shown at the top.',
        'Below that, three day cards show high/low temperatures and conditions.'
      ]},
      { p: 'If location access is denied, an error message will appear.' },
      { sa: ['timezone', 'calendar'] }
    ]
  },

  diskusage: {
    title: 'Disk Usage',
    keywords: ['disk usage', 'disk', 'storage', 'files', 'size', 'pie chart', 'html', 'css', 'javascript', 'breakdown'],
    body: [
      { p: 'Disk Usage shows a breakdown of the mpOS source code by file type (HTML, CSS, JavaScript).' },
      { h: 'Display' },
      { ul: [
        'A pie chart visualizes the proportion of each file type.',
        'The legend lists each type with its total size and percentage.',
        'A capacity bar shows the same breakdown horizontally.',
        'The total file count and size are shown at the bottom.'
      ]},
      { p: 'File sizes are fetched live from the server, so the data always reflects the current deployment.' },
      { sa: ['mycomputer', 'explorer'] }
    ]
  },

  /* ── System ── */

  mycomputer: {
    title: 'My Computer',
    keywords: ['my computer', 'system', 'info', 'browser', 'cpu', 'display', 'battery', 'network', 'properties'],
    body: [
      { p: 'My Computer displays information about your system and browser, similar to the System Properties dialog in Windows.' },
      { h: 'Information Shown' },
      { ul: [
        'Operating system and browser name.',
        'CPU cores (logical processors) and browser language.',
        'Display resolution and pixel ratio (HiDPI detection).',
        'Network connection type and speed (if available).',
        'Battery level and charging status (if available).'
      ]},
      { p: 'Some values may be limited by browser privacy policies. For example, device memory is capped at 8 GB by specification.' },
      { sa: ['diskusage', 'explorer'] }
    ]
  },

  explorer: {
    title: 'Files (Explorer)',
    keywords: ['files', 'explorer', 'folder', 'browse', 'programs', 'documents', 'utilities', 'navigate'],
    body: [
      { p: 'The Explorer window is a file browser for navigating mpOS applications, modeled after Windows 2000 Explorer.' },
      { h: 'Layout' },
      { ul: [
        'The left sidebar shows a folder tree: mpOS (all items), Programs, Documents, and Utilities.',
        'The right pane displays the contents of the selected folder.',
        'The address bar shows the current path (e.g., C:\\mpOS\\Programs).'
      ]},
      { h: 'Views' },
      { ul: [
        'Icon view \u2014 a grid of application tiles with icons.',
        'List view \u2014 rows with icon, name, description, and file type tag.',
        'Toggle views using the buttons in the toolbar.'
      ]},
      { p: 'Double-click any item to launch it.' },
      { sa: ['startmenu', 'desktop'] }
    ]
  },

  run: {
    title: 'Run Terminal',
    keywords: ['run', 'terminal', 'command', 'cmd', 'console', 'command line', 'cli', 'prompt'],
    body: [
      { p: 'The Run terminal is a command-line interface for launching applications and navigating the mpOS file system.' },
      { h: 'Basic Commands' },
      { ul: [
        'HELP \u2014 lists all available commands.',
        'CLS / CLEAR \u2014 clears the terminal screen.',
        'VER \u2014 shows the mpOS version.',
        'CD <folder> \u2014 changes directory (e.g., CD Programs).',
        'LS \u2014 lists contents of the current directory.',
        'EXIT \u2014 closes the terminal window.'
      ]},
      { h: 'Launching Apps' },
      { p: 'Type an application command name to launch it directly:' },
      { ul: [
        'BROWSER, FISHOFDAY, FISHFINDER, ONTARGET, AQUARIUM',
        'NOTEPAD, CALCULATOR, CALENDAR, TIMEZONE, WEATHER, DISKUSAGE',
        'MYCOMPUTER, EXPLORER, HH (Help)'
      ]},
      { p: 'You can also type the name of an item in the current directory to run it.' },
      { sa: ['startmenu', 'explorer'] }
    ]
  }
};
