/* Help Topics — Data file for the mpOS Help system
   HELP_TREE defines the navigation structure (folders and topic IDs).
   HELP_TOPICS maps each topic ID to its title, keywords, and body blocks.

   Body block types:
     { p: 'text' }                    — paragraph
     { h: 'text' }                    — subheading
     { ul: ['item1', 'item2'] }       — unordered list
     { sa: ['topicId1', 'topicId2'] } — "See also" links

   Portuguese translations use _pt suffix properties:
     title_pt, keywords_pt, body_pt
*/

var HELP_TREE = [
  { title: 'Getting Started', title_pt: 'Primeiros Passos',  children: ['welcome', 'desktop', 'startmenu', 'taskbar'] },
  { title: 'Games',           title_pt: 'Jogos',             children: ['ontarget', 'chickenfingers', 'brickbreaker'] },
  { title: 'Internet',        title_pt: 'Internet',          children: ['wikibrowser', 'archivebrowser', 'fishofday', 'fishfinder', 'aquarium'] },
  { title: 'Accessories',     title_pt: 'Acess\u00f3rios',   children: ['notepad', 'paint'] },
  { title: 'Utilities',       title_pt: 'Utilit\u00e1rios',  children: ['calculator', 'calendar', 'timezone', 'weather', 'diskusage', 'visitormap', 'search'] },
  { title: 'System',          title_pt: 'Sistema',           children: ['mycomputer', 'explorer', 'run', 'taskmanager'] }
];

var HELP_TOPICS = {

  /* ── Getting Started ── */

  welcome: {
    title: 'Welcome to mpOS',
    title_pt: 'Bem-vindo ao mpOS',
    keywords: ['welcome', 'getting started', 'about', 'home', 'introduction', 'overview'],
    keywords_pt: ['bem-vindo', 'primeiros passos', 'sobre', 'in\u00edcio', 'introdu\u00e7\u00e3o', 'vis\u00e3o geral'],
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
        'Play games like On Target, Chicken Fingers, and Brick Breaker.',
        'Search for files, programs, and commands with Search.',
        'See where visitors come from with Visitor Map.',
        'Use utilities such as Notepad, Calculator, Calendar, and more.',
        'Monitor running apps with Task Manager (Ctrl+Alt+Del).',
        'Explore system information, display settings, and screen savers with System Properties.'
      ]},
      { sa: ['desktop', 'startmenu', 'taskbar'] }
    ],
    body_pt: [
      { p: 'Bem-vindo ao mpOS, uma experi\u00eancia de sistema operativo de ambiente de trabalho constru\u00edda inteiramente no navegador.' },
      { p: 'O mpOS inclui janelas arrastáveis, uma barra de tarefas com minimizar e restaurar, um menu Iniciar com programas e utilitários, um explorador de ficheiros e um terminal.' },
      { h: 'Navegar no Sistema' },
      { ul: [
        'Clique no bot\u00e3o Iniciar para abrir o menu Iniciar.',
        'Clique duas vezes nos \u00edcones do ambiente de trabalho para abrir aplica\u00e7\u00f5es.',
        'Arraste as barras de t\u00edtulo das janelas para reposicion\u00e1-las.',
        'Clique num bot\u00e3o da barra de tarefas para minimizar ou restaurar uma janela.'
      ]},
      { h: 'O Que Pode Fazer' },
      { ul: [
        'Navegar na Wikip\u00e9dia com o WikiBrowser.',
        'Descobrir um peixe novo todos os dias com o Peixe do Dia.',
        'Jogar jogos como On Target, Chicken Fingers e Brick Breaker.',
        'Procurar ficheiros, programas e comandos com a Pesquisa.',
        'Ver de onde v\u00eam os visitantes com o Mapa de Visitantes.',
        'Usar utilit\u00e1rios como Bloco de Notas, Calculadora, Calend\u00e1rio e muito mais.',
        'Monitorizar aplica\u00e7\u00f5es em execu\u00e7\u00e3o com o Gestor de Tarefas (Ctrl+Alt+Del).',
        'Explorar informa\u00e7\u00f5es do sistema, defini\u00e7\u00f5es de visualiza\u00e7\u00e3o e protetores de ecr\u00e3 com as Propriedades do Sistema.'
      ]},
      { sa: ['desktop', 'startmenu', 'taskbar'] }
    ]
  },

  desktop: {
    title: 'Desktop Overview',
    title_pt: 'Vis\u00e3o Geral do Ambiente de Trabalho',
    keywords: ['desktop', 'icons', 'background', 'workspace', 'double-click'],
    keywords_pt: ['ambiente de trabalho', '\u00edcones', 'fundo', '\u00e1rea de trabalho', 'duplo clique'],
    body: [
      { p: 'The desktop is your main workspace. It displays a blue background with shortcut icons for frequently used applications.' },
      { h: 'Desktop Icons' },
      { ul: [
        'My Computer \u2014 opens System Properties (system info, display settings, screen savers).',
        'Files \u2014 opens the file explorer to browse all applications.',
        'WikiBrowser \u2014 an in-app Wikipedia browser.'
      ]},
      { p: 'Double-click any desktop icon to open its application. You can also use keyboard navigation: Tab to focus an icon, then press Enter to open it.' },
      { sa: ['startmenu', 'taskbar', 'explorer'] }
    ],
    body_pt: [
      { p: 'O ambiente de trabalho \u00e9 a sua \u00e1rea de trabalho principal. Apresenta um fundo azul com \u00edcones de atalho para as aplica\u00e7\u00f5es mais utilizadas.' },
      { h: '\u00cdcones do Ambiente de Trabalho' },
      { ul: [
        'O Meu Computador \u2014 abre as Propriedades do Sistema (informa\u00e7\u00f5es do sistema, defini\u00e7\u00f5es de visualiza\u00e7\u00e3o, protetores de ecr\u00e3).',
        'Ficheiros \u2014 abre o explorador de ficheiros para navegar todas as aplica\u00e7\u00f5es.',
        'WikiBrowser \u2014 um navegador da Wikip\u00e9dia integrado.'
      ]},
      { p: 'Clique duas vezes em qualquer \u00edcone do ambiente de trabalho para abrir a sua aplica\u00e7\u00e3o. Tamb\u00e9m pode usar a navega\u00e7\u00e3o por teclado: Tab para focar um \u00edcone e depois Enter para abri-lo.' },
      { sa: ['startmenu', 'taskbar', 'explorer'] }
    ]
  },

  startmenu: {
    title: 'Using the Start Menu',
    title_pt: 'Utilizar o Menu Iniciar',
    keywords: ['start menu', 'start button', 'programs', 'documents', 'utilities', 'run', 'exit', 'launch'],
    keywords_pt: ['menu iniciar', 'bot\u00e3o iniciar', 'programas', 'documentos', 'utilit\u00e1rios', 'executar', 'sair', 'lan\u00e7ar'],
    body: [
      { p: 'The Start menu is your main entry point for launching applications. Click the Start button at the bottom-left of the screen to open it.' },
      { h: 'Menu Structure' },
      { ul: [
        'Programs \u2014 hover to see a submenu with WikiBrowser, Fish of the Day, Fish Finder, On Target, Virtual Aquarium, Chicken Fingers, Paint, and Brick Breaker. Click the label itself to open the Programs folder in Explorer.',
        'Documents \u2014 hover to see saved documents (created in Notepad). Click the label to open the Documents folder.',
        'Utilities \u2014 hover for Notepad, Calculator, Calendar, Time Zone, Weather, Disk Usage, Visitor Map, Search, and Help.',
        'Search \u2014 hover to see For Files or Folders\u2026, For Help Topics\u2026, and On the Internet.',
        'Help \u2014 opens this Help viewer.',
        'Run \u2014 opens the command-line terminal.',
        'Task Manager \u2014 press Ctrl+Alt+Del from anywhere.',
        'Exit Site \u2014 closes the browser tab.'
      ]},
      { sa: ['taskbar', 'run', 'search', 'taskmanager'] }
    ],
    body_pt: [
      { p: 'O menu Iniciar \u00e9 o seu principal ponto de acesso para lan\u00e7ar aplica\u00e7\u00f5es. Clique no bot\u00e3o Iniciar no canto inferior esquerdo do ecr\u00e3 para o abrir.' },
      { h: 'Estrutura do Menu' },
      { ul: [
        'Programas \u2014 passe o rato para ver um submenu com WikiBrowser, Peixe do Dia, Fish Finder, On Target, Aqu\u00e1rio Virtual, Chicken Fingers, Paint e Brick Breaker. Clique na pr\u00f3pria etiqueta para abrir a pasta Programas no Explorador.',
        'Documentos \u2014 passe o rato para ver documentos guardados (criados no Bloco de Notas). Clique na etiqueta para abrir a pasta Documentos.',
        'Utilit\u00e1rios \u2014 passe o rato para Bloco de Notas, Calculadora, Calend\u00e1rio, Fuso Hor\u00e1rio, Meteorologia, Uso do Disco, Mapa de Visitantes, Pesquisa e Ajuda.',
        'Pesquisar \u2014 passe o rato para ver Ficheiros ou Pastas\u2026, T\u00f3picos de Ajuda\u2026 e Na Internet.',
        'Ajuda \u2014 abre este visualizador de Ajuda.',
        'Executar \u2014 abre o terminal de linha de comandos.',
        'Gestor de Tarefas \u2014 pressione Ctrl+Alt+Del em qualquer lugar.',
        'Sair do Site \u2014 fecha o separador do navegador.'
      ]},
      { sa: ['taskbar', 'run', 'search', 'taskmanager'] }
    ]
  },

  taskbar: {
    title: 'Using the Taskbar',
    title_pt: 'Utilizar a Barra de Tarefas',
    keywords: ['taskbar', 'minimize', 'restore', 'system tray', 'clock', 'volume', 'window management'],
    keywords_pt: ['barra de tarefas', 'minimizar', 'restaurar', 'tabuleiro do sistema', 'rel\u00f3gio', 'volume', 'gest\u00e3o de janelas'],
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
    ],
    body_pt: [
      { p: 'A barra de tarefas percorre a parte inferior do ecr\u00e3. Cont\u00e9m o bot\u00e3o Iniciar, bot\u00f5es das janelas abertas e o tabuleiro do sistema.' },
      { h: 'Bot\u00f5es de Janela' },
      { p: 'Cada janela aberta recebe um bot\u00e3o na barra de tarefas. Clique no bot\u00e3o para minimizar uma janela vis\u00edvel ou restaurar uma minimizada. O bot\u00e3o da janela ativa aparece premido.' },
      { h: 'Tabuleiro do Sistema' },
      { p: 'O tabuleiro do sistema est\u00e1 do lado direito da barra de tarefas. Cont\u00e9m:' },
      { ul: [
        '\u00cdcone de volume \u2014 clique para ajustar o volume do som do sistema ou silenciar.',
        'Rel\u00f3gio \u2014 apresenta a hora atual.'
      ]},
      { sa: ['startmenu', 'desktop'] }
    ]
  },

  /* ── Programs ── */

  wikibrowser: {
    title: 'WikiBrowser',
    title_pt: 'WikiBrowser',
    keywords: ['wikibrowser', 'wikipedia', 'browser', 'search', 'internet', 'web', 'browse', 'article'],
    keywords_pt: ['wikibrowser', 'wikip\u00e9dia', 'navegador', 'pesquisar', 'internet', 'web', 'navegar', 'artigo'],
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
    ],
    body_pt: [
      { p: 'O WikiBrowser permite-lhe navegar na Wikip\u00e9dia sem sair do mpOS. Carrega o site m\u00f3vel da Wikip\u00e9dia dentro de um quadro integrado.' },
      { h: 'Como Utilizar' },
      { ul: [
        'Escreva um termo de pesquisa ou URL da Wikip\u00e9dia na barra de endere\u00e7os e pressione Enter.',
        'A p\u00e1gina carrega dentro do visualizador. As liga\u00e7\u00f5es dentro da Wikip\u00e9dia funcionam normalmente.',
        'A barra de t\u00edtulo atualiza-se para mostrar o nome do artigo atual.'
      ]},
      { h: 'Abrir o WikiBrowser' },
      { ul: [
        'Clique duas vezes no \u00edcone WikiBrowser no ambiente de trabalho.',
        'Menu Iniciar \u2192 Programas \u2192 WikiBrowser.',
        'Escreva BROWSER no terminal Executar.'
      ]},
      { sa: ['fishofday', 'archivebrowser', 'startmenu'] }
    ]
  },

  archivebrowser: {
    title: 'Archive Browser',
    title_pt: 'Archive Browser',
    keywords: ['archive', 'internet archive', 'wayback', 'wayback machine', 'browser', 'web', 'history'],
    keywords_pt: ['archive', 'internet archive', 'wayback', 'wayback machine', 'navegador', 'web', 'hist\u00f3ria'],
    body: [
      { p: 'Archive Browser lets you browse the Internet Archive (archive.org) without leaving mpOS. You can search for books, videos, audio, software, and websites preserved in the Wayback Machine.' },
      { h: 'How to Use' },
      { ul: [
        'Type a search term into the address bar and press Enter to search archive.org.',
        'Enter an archive.org URL to navigate directly.',
        'Enter any other URL (e.g. https://example.com) to look it up in the Wayback Machine.',
        'The title bar updates to show the current page name.'
      ]},
      { h: 'Opening Archive Browser' },
      { ul: [
        'Double-click the Archive Browser icon on the desktop.',
        'Start menu \u2192 Programs \u2192 Internet \u2192 Archive Browser.',
        'Type ARCHIVE in the Run terminal.'
      ]},
      { sa: ['wikibrowser', 'startmenu'] }
    ],
    body_pt: [
      { p: 'O Archive Browser permite-lhe navegar no Internet Archive (archive.org) sem sair do mpOS. Pode pesquisar livros, v\u00eddeos, \u00e1udio, software e websites preservados na Wayback Machine.' },
      { h: 'Como Utilizar' },
      { ul: [
        'Escreva um termo de pesquisa na barra de endere\u00e7os e pressione Enter para pesquisar no archive.org.',
        'Introduza um URL do archive.org para navegar diretamente.',
        'Introduza qualquer outro URL (ex: https://example.com) para o procurar na Wayback Machine.',
        'A barra de t\u00edtulo atualiza-se para mostrar o nome da p\u00e1gina atual.'
      ]},
      { h: 'Abrir o Archive Browser' },
      { ul: [
        'Clique duas vezes no \u00edcone Archive Browser no ambiente de trabalho.',
        'Menu Iniciar \u2192 Programas \u2192 Internet \u2192 Archive Browser.',
        'Escreva ARCHIVE no terminal Executar.'
      ]},
      { sa: ['wikibrowser', 'startmenu'] }
    ]
  },

  fishofday: {
    title: 'Fish of the Day',
    title_pt: 'Peixe do Dia',
    keywords: ['fish of the day', 'fish', 'daily', 'wikipedia', 'species', 'photo', 'marine'],
    keywords_pt: ['peixe do dia', 'peixe', 'di\u00e1rio', 'wikip\u00e9dia', 'esp\u00e9cie', 'foto', 'marinho'],
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
    ],
    body_pt: [
      { p: 'O Peixe do Dia apresenta uma esp\u00e9cie de peixe diferente todos os dias. Mostra uma foto (obtida da Wikip\u00e9dia), os nomes comum e cient\u00edfico, e detalhes como fam\u00edlia, habitat e tamanho m\u00e1ximo.' },
      { h: 'Funcionalidades' },
      { ul: [
        'Um novo peixe \u00e9 selecionado todos os dias a partir de uma base de dados com centenas de esp\u00e9cies.',
        'Clique no nome do peixe (quando sublinhado) para abrir o seu artigo na Wikip\u00e9dia no WikiBrowser.',
        'A barra de estado mostra a data de hoje.'
      ]},
      { h: 'Abrir o Peixe do Dia' },
      { ul: [
        'Menu Iniciar \u2192 Programas \u2192 Peixe do Dia.',
        'Escreva FISHOFDAY no terminal Executar.'
      ]},
      { sa: ['fishfinder', 'wikibrowser'] }
    ]
  },

  fishfinder: {
    title: 'Fish Finder',
    title_pt: 'Fish Finder',
    keywords: ['fish finder', 'aquarium', 'nearest', 'furthest', 'location', 'geolocation', 'distance', 'map'],
    keywords_pt: ['fish finder', 'aqu\u00e1rio', 'mais pr\u00f3ximo', 'mais distante', 'localiza\u00e7\u00e3o', 'geolocaliza\u00e7\u00e3o', 'dist\u00e2ncia', 'mapa'],
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
    ],
    body_pt: [
      { p: 'O Fish Finder utiliza a sua localiza\u00e7\u00e3o para encontrar os aqu\u00e1rios mais pr\u00f3ximos e mais distantes a partir de uma base de dados com mais de 50 aqu\u00e1rios em todo o mundo.' },
      { h: 'Como Funciona' },
      { ul: [
        'Ao abrir o Fish Finder, \u00e9 solicitada a sua localiza\u00e7\u00e3o atrav\u00e9s da API de Geolocaliza\u00e7\u00e3o do navegador.',
        'Calcula a dist\u00e2ncia at\u00e9 cada aqu\u00e1rio na sua base de dados.',
        'Os aqu\u00e1rios mais pr\u00f3ximos e mais distantes s\u00e3o apresentados com o nome, cidade e dist\u00e2ncia em quil\u00f3metros e milhas.',
        'Clique no nome de um aqu\u00e1rio (quando tem liga\u00e7\u00e3o) para visitar o seu website.'
      ]},
      { p: 'Se o acesso \u00e0 localiza\u00e7\u00e3o for negado, ser\u00e1 mostrada uma mensagem de erro.' },
      { sa: ['fishofday', 'aquarium'] }
    ]
  },

  ontarget: {
    title: 'On Target',
    title_pt: 'On Target',
    keywords: ['on target', 'game', 'target', 'shooting', 'two-player', 'aim', 'score'],
    keywords_pt: ['on target', 'jogo', 'alvo', 'tiro', 'dois jogadores', 'apontar', 'pontua\u00e7\u00e3o'],
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
    ],
    body_pt: [
      { p: 'On Target \u00e9 um jogo de tiro ao alvo para dois jogadores. Os jogadores alternam turnos tocando ou clicando em alvos que aparecem no ecr\u00e3.' },
      { h: 'Como Jogar' },
      { ul: [
        'O jogo carrega num quadro integrado.',
        'Siga as instru\u00e7\u00f5es no ecr\u00e3 para iniciar uma partida.',
        'Os jogadores alternam turnos a disparar nos alvos.',
        'O jogador com a pontua\u00e7\u00e3o mais alta ganha.'
      ]},
      { h: 'Abrir o On Target' },
      { ul: [
        'Menu Iniciar \u2192 Programas \u2192 On Target.',
        'Escreva ONTARGET no terminal Executar.',
        'No telem\u00f3vel, o jogo abre como p\u00e1gina em ecr\u00e3 inteiro.'
      ]},
      { sa: ['chickenfingers', 'aquarium'] }
    ]
  },

  aquarium: {
    title: 'Virtual Aquarium',
    title_pt: 'Aqu\u00e1rio Virtual',
    keywords: ['aquarium', 'virtual', 'fish', 'live', 'stream', 'camera', 'youtube', 'video', 'watch'],
    keywords_pt: ['aqu\u00e1rio', 'virtual', 'peixe', 'ao vivo', 'transmiss\u00e3o', 'c\u00e2mara', 'youtube', 'v\u00eddeo', 'assistir'],
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
    ],
    body_pt: [
      { p: 'O Aqu\u00e1rio Virtual transmite uma c\u00e2mara de peixes ao vivo do explore.org. Veja peixes reais a nadar em tempo real.' },
      { h: 'Como Funciona' },
      { ul: [
        'O aqu\u00e1rio carrega uma transmiss\u00e3o ao vivo do YouTube usando a API do YouTube IFrame Player.',
        'O v\u00eddeo come\u00e7a silenciado e em reprodu\u00e7\u00e3o autom\u00e1tica.',
        'Um escudo de carregamento cobre o v\u00eddeo durante alguns segundos enquanto a transmiss\u00e3o liga.',
        'Fechar a janela descarrega completamente o reprodutor de v\u00eddeo para poupar recursos.'
      ]},
      { sa: ['fishofday', 'fishfinder'] }
    ]
  },

  chickenfingers: {
    title: 'Chicken Fingers',
    title_pt: 'Chicken Fingers',
    keywords: ['chicken fingers', 'game', 'touch', 'touchscreen', 'mobile', 'two-player', 'phone', 'tablet'],
    keywords_pt: ['chicken fingers', 'jogo', 'toque', 'ecr\u00e3 t\u00e1til', 'telem\u00f3vel', 'dois jogadores', 'telefone', 'tablet'],
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
    ],
    body_pt: [
      { p: 'Chicken Fingers \u00e9 um jogo para dois jogadores com ecr\u00e3 t\u00e1til. Requer um dispositivo com ecr\u00e3 t\u00e1til para jogar.' },
      { h: 'Requisitos' },
      { p: 'Este jogo s\u00f3 funciona em telefones e tablets. Em computadores de secret\u00e1ria, aparecer\u00e1 uma caixa de di\u00e1logo de erro a explicar que \u00e9 necess\u00e1rio um ecr\u00e3 t\u00e1til.' },
      { h: 'Como Jogar' },
      { ul: [
        'Abra o jogo num dispositivo com ecr\u00e3 t\u00e1til.',
        'O jogo navega para uma p\u00e1gina dedicada em ecr\u00e3 inteiro.',
        'Siga as instru\u00e7\u00f5es no ecr\u00e3 para jogar com dois jogadores.'
      ]},
      { sa: ['ontarget'] }
    ]
  },

  paint: {
    title: 'Paint',
    title_pt: 'Paint',
    keywords: ['paint', 'draw', 'drawing', 'image', 'canvas', 'brush', 'pencil', 'eraser', 'fill', 'color', 'art'],
    keywords_pt: ['paint', 'desenhar', 'desenho', 'imagem', 'tela', 'pincel', 'l\u00e1pis', 'borracha', 'preencher', 'cor', 'arte'],
    body: [
      { p: 'Paint is an image editor for creating and editing drawings. Files are saved as PNG images in your browser\u2019s local storage.' },
      { h: 'Tools' },
      { ul: [
        'Pencil \u2014 draws thin 1px lines for precise detail work.',
        'Brush \u2014 draws smooth strokes at the selected size.',
        'Eraser \u2014 erases by painting with the background color.',
        'Line \u2014 draws a straight line between two points.',
        'Rectangle \u2014 draws a rectangle outline.',
        'Ellipse \u2014 draws an ellipse outline.',
        'Fill \u2014 flood-fills a region with the foreground color.'
      ]},
      { h: 'Colors' },
      { ul: [
        'Left-click a swatch to set the foreground (drawing) color.',
        'Right-click a swatch to set the background (eraser) color.',
        'Double-click the FG or BG preview square to pick a custom color.'
      ]},
      { h: 'Toolbar' },
      { ul: [
        'New \u2014 clears the canvas and starts fresh.',
        'Save \u2014 saves the current image. Prompts for a name if untitled.',
        'Open \u2014 loads a previously saved image.',
        'Undo / Redo \u2014 step backward or forward through changes.',
        'Clear \u2014 fills the canvas with white.',
        'Size slider \u2014 adjusts brush, eraser, and shape stroke width.'
      ]},
      { h: 'Keyboard Shortcuts' },
      { ul: [
        'Ctrl+Z \u2014 Undo',
        'Ctrl+Y \u2014 Redo',
        'Ctrl+S \u2014 Save',
        'Ctrl+N \u2014 New'
      ]},
      { sa: ['notepad', 'explorer'] }
    ],
    body_pt: [
      { p: 'O Paint \u00e9 um editor de imagem para criar e editar desenhos. Os ficheiros s\u00e3o guardados como imagens PNG no armazenamento local do seu navegador.' },
      { h: 'Ferramentas' },
      { ul: [
        'L\u00e1pis \u2014 desenha linhas finas de 1px para trabalho de detalhe preciso.',
        'Pincel \u2014 desenha tra\u00e7os suaves no tamanho selecionado.',
        'Borracha \u2014 apaga pintando com a cor de fundo.',
        'Linha \u2014 desenha uma linha reta entre dois pontos.',
        'Ret\u00e2ngulo \u2014 desenha o contorno de um ret\u00e2ngulo.',
        'Elipse \u2014 desenha o contorno de uma elipse.',
        'Preenchimento \u2014 preenche uma regi\u00e3o com a cor de primeiro plano.'
      ]},
      { h: 'Cores' },
      { ul: [
        'Clique com o bot\u00e3o esquerdo numa amostra para definir a cor de primeiro plano (desenho).',
        'Clique com o bot\u00e3o direito numa amostra para definir a cor de fundo (borracha).',
        'Clique duas vezes no quadrado de pr\u00e9-visualiza\u00e7\u00e3o FG ou BG para escolher uma cor personalizada.'
      ]},
      { h: 'Barra de Ferramentas' },
      { ul: [
        'Novo \u2014 limpa a tela e come\u00e7a de novo.',
        'Guardar \u2014 guarda a imagem atual. Pede um nome se n\u00e3o tiver t\u00edtulo.',
        'Abrir \u2014 carrega uma imagem guardada anteriormente.',
        'Desfazer / Refazer \u2014 retrocede ou avan\u00e7a nas altera\u00e7\u00f5es.',
        'Limpar \u2014 preenche a tela com branco.',
        'Cursor de tamanho \u2014 ajusta a largura do pincel, borracha e tra\u00e7o das formas.'
      ]},
      { h: 'Atalhos de Teclado' },
      { ul: [
        'Ctrl+Z \u2014 Desfazer',
        'Ctrl+Y \u2014 Refazer',
        'Ctrl+S \u2014 Guardar',
        'Ctrl+N \u2014 Novo'
      ]},
      { sa: ['notepad', 'explorer'] }
    ]
  },

  brickbreaker: {
    title: 'Brick Breaker',
    title_pt: 'Brick Breaker',
    keywords: ['brick breaker', 'game', 'daily', 'bricks', 'paddle', 'ball', 'breakout', 'power-up', 'hazard', 'multiball'],
    keywords_pt: ['brick breaker', 'jogo', 'di\u00e1rio', 'tijolos', 'raquete', 'bola', 'breakout', 'power-up', 'perigo', 'multibola'],
    body: [
      { p: 'Brick Breaker is a daily brick-breaking challenge with power-ups and hazards. Each day presents a new layout of bricks to clear \u2014 play as many times as you like.' },
      { h: 'How to Play' },
      { ul: [
        'The game loads in an embedded frame.',
        'Use the paddle to bounce the ball and break all the bricks.',
        'Catch falling power-ups to widen or shrink your paddle, split into multiple balls, or activate burner mode.',
        'Watch out for hazard blocks \u2014 when destroyed they fall and can damage you on contact.'
      ]},
      { h: 'Opening Brick Breaker' },
      { ul: [
        'Start menu \u2192 Programs \u2192 Brick Breaker.',
        'Type BRICKBREAKER in the Run terminal.',
        'On mobile, the game opens as a full-screen page.'
      ]},
      { sa: ['ontarget', 'chickenfingers'] }
    ],
    body_pt: [
      { p: 'O Brick Breaker \u00e9 um desafio di\u00e1rio de partir tijolos com power-ups e perigos. Cada dia apresenta uma nova disposi\u00e7\u00e3o de tijolos \u2014 jogue quantas vezes quiser.' },
      { h: 'Como Jogar' },
      { ul: [
        'O jogo carrega num quadro integrado.',
        'Use a raquete para fazer a bola saltar e partir todos os tijolos.',
        'Apanhe os power-ups que caem para alargar ou encolher a raquete, dividir em v\u00e1rias bolas ou ativar o modo queimador.',
        'Cuidado com os blocos de perigo \u2014 quando destru\u00eddos, caem e podem causar dano ao contacto.'
      ]},
      { h: 'Abrir o Brick Breaker' },
      { ul: [
        'Menu Iniciar \u2192 Programas \u2192 Brick Breaker.',
        'Escreva BRICKBREAKER no terminal Executar.',
        'No telem\u00f3vel, o jogo abre como p\u00e1gina em ecr\u00e3 inteiro.'
      ]},
      { sa: ['ontarget', 'chickenfingers'] }
    ]
  },

  /* ── Utilities ── */

  notepad: {
    title: 'Notepad',
    title_pt: 'Bloco de Notas',
    keywords: ['notepad', 'text', 'editor', 'save', 'open', 'write', 'file', 'document', 'type', 'find', 'replace', 'search'],
    keywords_pt: ['bloco de notas', 'texto', 'editor', 'guardar', 'abrir', 'escrever', 'ficheiro', 'documento', 'digitar', 'procurar', 'substituir', 'pesquisar'],
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
      { h: 'Find and Replace' },
      { ul: [
        'Ctrl+F \u2014 opens the Find bar. Use Previous/Next buttons to navigate matches. A counter shows your position (e.g., \u201c2 of 5\u201d).',
        'Ctrl+H \u2014 opens the Replace bar with Replace and Replace All buttons.',
        'Toggle case-sensitive matching with the Aa button.',
        'Press Escape to close the Find/Replace bar.'
      ]},
      { h: 'Keyboard Shortcuts' },
      { ul: [
        'Ctrl+S \u2014 Save',
        'Ctrl+F \u2014 Find',
        'Ctrl+H \u2014 Replace'
      ]},
      { sa: ['calculator', 'explorer'] }
    ],
    body_pt: [
      { p: 'O Bloco de Notas \u00e9 um editor de texto simples com funcionalidade de guardar e carregar. Os ficheiros s\u00e3o armazenados no armazenamento local do seu navegador.' },
      { h: 'Bot\u00f5es da Barra de Ferramentas' },
      { ul: [
        'Novo \u2014 limpa o editor e inicia um novo ficheiro. Pede para descartar altera\u00e7\u00f5es n\u00e3o guardadas.',
        'Guardar \u2014 guarda o ficheiro atual. Se n\u00e3o existir nome de ficheiro, pede um nome.',
        'Abrir \u2014 mostra uma lista de ficheiros guardados para abrir ou eliminar.'
      ]},
      { h: 'Funcionalidades' },
      { ul: [
        'A barra de t\u00edtulo mostra o nome do ficheiro atual e um asterisco (*) para altera\u00e7\u00f5es n\u00e3o guardadas.',
        'A barra de estado mostra a contagem de caracteres.',
        'Os ficheiros persistem entre sess\u00f5es do navegador via localStorage.'
      ]},
      { h: 'Localizar e Substituir' },
      { ul: [
        'Ctrl+F \u2014 abre a barra de Localizar. Use os bot\u00f5es Anterior/Seguinte para navegar nas correspond\u00eancias. Um contador mostra a sua posi\u00e7\u00e3o (ex.: \u201c2 de 5\u201d).',
        'Ctrl+H \u2014 abre a barra de Substituir com os bot\u00f5es Substituir e Substituir Tudo.',
        'Alterne a correspond\u00eancia sens\u00edvel a mai\u00fasculas/min\u00fasculas com o bot\u00e3o Aa.',
        'Pressione Escape para fechar a barra de Localizar/Substituir.'
      ]},
      { h: 'Atalhos de Teclado' },
      { ul: [
        'Ctrl+S \u2014 Guardar',
        'Ctrl+F \u2014 Localizar',
        'Ctrl+H \u2014 Substituir'
      ]},
      { sa: ['calculator', 'explorer'] }
    ]
  },

  calculator: {
    title: 'Calculator',
    title_pt: 'Calculadora',
    keywords: ['calculator', 'math', 'arithmetic', 'add', 'subtract', 'multiply', 'divide', 'keyboard', 'scientific', 'sin', 'cos', 'tan', 'sqrt', 'log'],
    keywords_pt: ['calculadora', 'matem\u00e1tica', 'aritm\u00e9tica', 'somar', 'subtrair', 'multiplicar', 'dividir', 'teclado', 'cient\u00edfica', 'sin', 'cos', 'tan', 'raiz', 'log'],
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
      { h: 'Scientific Mode' },
      { p: 'Toggle the Scientific checkbox to expand the calculator with additional functions:' },
      { ul: [
        'Trigonometry \u2014 sin, cos, tan (angles in degrees).',
        'Powers \u2014 x\u00b2, x\u02b8 (raise to a power).',
        'Roots and logarithms \u2014 \u221ax, log (base 10), ln (natural log).',
        'Other \u2014 \u03c0, \u00b1 (toggle sign), 1/x (reciprocal), n! (factorial).'
      ]},
      { sa: ['notepad', 'calendar'] }
    ],
    body_pt: [
      { p: 'Uma calculadora aritm\u00e9tica b\u00e1sica que suporta adi\u00e7\u00e3o, subtra\u00e7\u00e3o, multiplica\u00e7\u00e3o e divis\u00e3o.' },
      { h: 'Utilizar a Calculadora' },
      { ul: [
        'Clique nos bot\u00f5es num\u00e9ricos ou use o seu teclado (0\u20139) para introduzir d\u00edgitos.',
        'Clique num operador (+, \u2212, \u00d7, \u00f7) ou use as teclas do teclado (+, -, *, /).',
        'Pressione = ou Enter para calcular o resultado.',
        'CE limpa a entrada atual; C limpa tudo.',
        'Backspace remove o \u00faltimo d\u00edgito.'
      ]},
      { p: 'A calculadora suporta at\u00e9 15 d\u00edgitos por n\u00famero.' },
      { h: 'Modo Cient\u00edfico' },
      { p: 'Ative a caixa de sele\u00e7\u00e3o Cient\u00edfico para expandir a calculadora com fun\u00e7\u00f5es adicionais:' },
      { ul: [
        'Trigonometria \u2014 sin, cos, tan (\u00e2ngulos em graus).',
        'Pot\u00eancias \u2014 x\u00b2, x\u02b8 (elevar a uma pot\u00eancia).',
        'Ra\u00edzes e logaritmos \u2014 \u221ax, log (base 10), ln (logaritmo natural).',
        'Outros \u2014 \u03c0, \u00b1 (alternar sinal), 1/x (rec\u00edproco), n! (fatorial).'
      ]},
      { sa: ['notepad', 'calendar'] }
    ]
  },

  calendar: {
    title: 'Calendar',
    title_pt: 'Calend\u00e1rio',
    keywords: ['calendar', 'date', 'month', 'today', 'schedule', 'day', 'year'],
    keywords_pt: ['calend\u00e1rio', 'data', 'm\u00eas', 'hoje', 'agenda', 'dia', 'ano'],
    body: [
      { p: 'A monthly calendar viewer. The current day is highlighted.' },
      { h: 'Navigation' },
      { ul: [
        'Use the left and right arrows to move between months.',
        'Click \u201cToday\u201d to jump back to the current date.',
        'Days from adjacent months are shown in gray.'
      ]},
      { sa: ['timezone', 'weather'] }
    ],
    body_pt: [
      { p: 'Um visualizador de calend\u00e1rio mensal. O dia atual \u00e9 destacado.' },
      { h: 'Navega\u00e7\u00e3o' },
      { ul: [
        'Use as setas esquerda e direita para navegar entre meses.',
        'Clique em \u201cHoje\u201d para voltar \u00e0 data atual.',
        'Os dias dos meses adjacentes s\u00e3o mostrados a cinzento.'
      ]},
      { sa: ['timezone', 'weather'] }
    ]
  },

  timezone: {
    title: 'Time Zone',
    title_pt: 'Fuso Hor\u00e1rio',
    keywords: ['time zone', 'clock', 'world clock', 'time', 'analog', 'digital', 'cities', 'utc'],
    keywords_pt: ['fuso hor\u00e1rio', 'rel\u00f3gio', 'rel\u00f3gio mundial', 'hora', 'anal\u00f3gico', 'digital', 'cidades', 'utc'],
    body: [
      { p: 'Time Zone displays live clocks for 8 cities around the world: London, New York, Los Angeles, Tokyo, Sydney, Dubai, Paris, and Singapore.' },
      { h: 'Views' },
      { ul: [
        'Analog \u2014 traditional clock faces with hour, minute, and second hands.',
        'Digital \u2014 numeric time display. Click the \u201cDigital\u201d / \u201cAnalog\u201d button to toggle.'
      ]},
      { p: 'Clocks update every second. The UTC offset for each city is shown below its name.' },
      { sa: ['calendar', 'weather'] }
    ],
    body_pt: [
      { p: 'O Fuso Hor\u00e1rio apresenta rel\u00f3gios ao vivo para 8 cidades em todo o mundo: Londres, Nova Iorque, Los Angeles, T\u00f3quio, Sydney, Dubai, Paris e Singapura.' },
      { h: 'Vistas' },
      { ul: [
        'Anal\u00f3gico \u2014 mostradores de rel\u00f3gio tradicionais com ponteiros das horas, minutos e segundos.',
        'Digital \u2014 apresenta\u00e7\u00e3o num\u00e9rica da hora. Clique no bot\u00e3o \u201cDigital\u201d / \u201cAnal\u00f3gico\u201d para alternar.'
      ]},
      { p: 'Os rel\u00f3gios atualizam a cada segundo. O desvio UTC para cada cidade \u00e9 mostrado abaixo do seu nome.' },
      { sa: ['calendar', 'weather'] }
    ]
  },

  weather: {
    title: 'Weather',
    title_pt: 'Meteorologia',
    keywords: ['weather', 'forecast', 'temperature', 'rain', 'sun', 'cloud', 'location', 'geolocation'],
    keywords_pt: ['meteorologia', 'previs\u00e3o', 'temperatura', 'chuva', 'sol', 'nuvem', 'localiza\u00e7\u00e3o', 'geolocaliza\u00e7\u00e3o'],
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
    ],
    body_pt: [
      { p: 'A Meteorologia mostra uma previs\u00e3o de tr\u00eas dias para a sua localiza\u00e7\u00e3o atual, com base na API Open-Meteo.' },
      { h: 'Como Funciona' },
      { ul: [
        'Ao abrir pela primeira vez, a aplica\u00e7\u00e3o solicita a sua localiza\u00e7\u00e3o atrav\u00e9s da API de Geolocaliza\u00e7\u00e3o do navegador.',
        'Em seguida, obt\u00e9m a temperatura atual e uma previs\u00e3o de 3 dias.',
        'As condi\u00e7\u00f5es atuais (temperatura e descri\u00e7\u00e3o) s\u00e3o mostradas no topo.',
        'Abaixo, tr\u00eas cart\u00f5es di\u00e1rios mostram as temperaturas m\u00e1xima/m\u00ednima e condi\u00e7\u00f5es.'
      ]},
      { p: 'Se o acesso \u00e0 localiza\u00e7\u00e3o for negado, aparecer\u00e1 uma mensagem de erro.' },
      { sa: ['timezone', 'calendar'] }
    ]
  },

  diskusage: {
    title: 'Disk Usage',
    title_pt: 'Uso do Disco',
    keywords: ['disk usage', 'disk', 'storage', 'files', 'size', 'pie chart', 'html', 'css', 'javascript', 'breakdown'],
    keywords_pt: ['utiliza\u00e7\u00e3o do disco', 'disco', 'armazenamento', 'ficheiros', 'tamanho', 'gr\u00e1fico circular', 'html', 'css', 'javascript', 'distribui\u00e7\u00e3o'],
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
    ],
    body_pt: [
      { p: 'A Utiliza\u00e7\u00e3o do Disco mostra uma distribui\u00e7\u00e3o do c\u00f3digo fonte do mpOS por tipo de ficheiro (HTML, CSS, JavaScript).' },
      { h: 'Apresenta\u00e7\u00e3o' },
      { ul: [
        'Um gr\u00e1fico circular visualiza a propor\u00e7\u00e3o de cada tipo de ficheiro.',
        'A legenda lista cada tipo com o seu tamanho total e percentagem.',
        'Uma barra de capacidade mostra a mesma distribui\u00e7\u00e3o horizontalmente.',
        'O n\u00famero total de ficheiros e tamanho s\u00e3o mostrados na parte inferior.'
      ]},
      { p: 'Os tamanhos dos ficheiros s\u00e3o obtidos ao vivo do servidor, pelo que os dados refletem sempre a implementa\u00e7\u00e3o atual.' },
      { sa: ['mycomputer', 'explorer'] }
    ]
  },

  visitormap: {
    title: 'Visitor Map',
    title_pt: 'Mapa de Visitantes',
    keywords: ['visitor map', 'visitors', 'world', 'map', 'countries', 'traffic', 'cloudflare', 'analytics'],
    keywords_pt: ['mapa de visitantes', 'visitantes', 'mundo', 'mapa', 'pa\u00edses', 'tr\u00e1fego', 'cloudflare', 'an\u00e1lise'],
    body: [
      { p: 'Visitor Map displays a world map showing where site visitors are from, powered by a Cloudflare Workers API.' },
      { h: 'How It Works' },
      { ul: [
        'Visitor locations are collected via a Cloudflare Workers edge function.',
        'Dots are plotted on an SVG world map corresponding to visitor locations.',
        'A visitor count is displayed showing total recorded visitors.'
      ]},
      { h: 'Opening Visitor Map' },
      { ul: [
        'Start menu \u2192 Utilities \u2192 Visitor Map.',
        'Type VISITORMAP in the Run terminal.'
      ]},
      { sa: ['diskusage', 'weather'] }
    ],
    body_pt: [
      { p: 'O Mapa de Visitantes apresenta um mapa mundial que mostra de onde v\u00eam os visitantes do site, com base numa API Cloudflare Workers.' },
      { h: 'Como Funciona' },
      { ul: [
        'As localiza\u00e7\u00f5es dos visitantes s\u00e3o recolhidas atrav\u00e9s de uma fun\u00e7\u00e3o edge do Cloudflare Workers.',
        'Pontos s\u00e3o marcados num mapa mundial SVG correspondendo \u00e0s localiza\u00e7\u00f5es dos visitantes.',
        'Uma contagem de visitantes \u00e9 apresentada mostrando o total de visitantes registados.'
      ]},
      { h: 'Abrir o Mapa de Visitantes' },
      { ul: [
        'Menu Iniciar \u2192 Utilit\u00e1rios \u2192 Mapa de Visitantes.',
        'Escreva VISITORMAP no terminal Executar.'
      ]},
      { sa: ['diskusage', 'weather'] }
    ]
  },

  search: {
    title: 'Search',
    title_pt: 'Pesquisa',
    keywords: ['search', 'find', 'files', 'programs', 'commands', 'lookup', 'filter'],
    keywords_pt: ['pesquisa', 'procurar', 'ficheiros', 'programas', 'comandos', 'consultar', 'filtrar'],
    body: [
      { p: 'Search is a two-pane window for finding programs, utilities, files, and terminal commands across mpOS.' },
      { h: 'How to Use' },
      { ul: [
        'Type in the search input on the left sidebar to filter results as you type.',
        'Results appear in the right pane, grouped by category (programs, utilities, files, commands).',
        'Click a result to launch the app, open a file in Notepad, or pre-fill the Run terminal.'
      ]},
      { h: 'Opening Search' },
      { ul: [
        'Start menu \u2192 Search \u2192 For Files or Folders\u2026',
        'Type SEARCH in the Run terminal.',
        'Explorer \u2192 Utilities folder.'
      ]},
      { sa: ['explorer', 'run'] }
    ],
    body_pt: [
      { p: 'A Pesquisa \u00e9 uma janela de dois pain\u00e9is para encontrar programas, utilit\u00e1rios, ficheiros e comandos de terminal no mpOS.' },
      { h: 'Como Utilizar' },
      { ul: [
        'Escreva na caixa de pesquisa na barra lateral esquerda para filtrar resultados enquanto escreve.',
        'Os resultados aparecem no painel direito, agrupados por categoria (programas, utilit\u00e1rios, ficheiros, comandos).',
        'Clique num resultado para lan\u00e7ar a aplica\u00e7\u00e3o, abrir um ficheiro no Bloco de Notas ou preencher o terminal Executar.'
      ]},
      { h: 'Abrir a Pesquisa' },
      { ul: [
        'Menu Iniciar \u2192 Pesquisar \u2192 Ficheiros ou Pastas\u2026',
        'Escreva SEARCH no terminal Executar.',
        'Explorador \u2192 pasta Utilit\u00e1rios.'
      ]},
      { sa: ['explorer', 'run'] }
    ]
  },

  /* ── System ── */

  mycomputer: {
    title: 'System Properties',
    title_pt: 'Propriedades do Sistema',
    keywords: ['my computer', 'system', 'info', 'browser', 'cpu', 'display', 'battery', 'network', 'properties', 'wallpaper', 'screensaver', 'screen saver', 'background', 'color'],
    keywords_pt: ['o meu computador', 'sistema', 'informa\u00e7\u00e3o', 'navegador', 'cpu', 'ecr\u00e3', 'bateria', 'rede', 'propriedades', 'papel de parede', 'protetor de ecr\u00e3', 'fundo', 'cor'],
    body: [
      { p: 'System Properties is a tabbed settings hub accessed from the My Computer desktop icon or Start menu. It has four tabs: General, Display, Screen Saver, and Regional.' },
      { h: 'General Tab' },
      { p: 'Displays information about your system and browser:' },
      { ul: [
        'Operating system and browser name.',
        'CPU cores (logical processors) and browser language.',
        'Display resolution and pixel ratio (HiDPI detection).',
        'Network connection type and speed (if available).',
        'Battery level and charging status (if available).'
      ]},
      { p: 'Some values may be limited by browser privacy policies. For example, device memory is capped at 8 GB by specification.' },
      { h: 'Display Tab' },
      { p: 'Customize the desktop appearance:' },
      { ul: [
        'Background Color \u2014 pick any color for the desktop background using a color picker.',
        'Wallpaper Pattern \u2014 choose from None, Sunset, Dots, Grid, Diagonal, or Waves.'
      ]},
      { h: 'Screen Saver Tab' },
      { p: 'Configure a screen saver that activates after a period of inactivity:' },
      { ul: [
        'Choose from 5 screen savers: Starfield, Pipes, Bouncing Logo, Color Cycling, and Mystify.',
        'Preview the selected screen saver in a mini canvas.',
        'Set the idle timeout (1, 2, 3, or 5 minutes).',
        'Enable or disable the screen saver with a checkbox.',
        'Move the mouse, click, or press a key to dismiss the full-screen screen saver.'
      ]},
      { p: 'All display and screen saver settings are saved to your browser and persist across visits.' },
      { sa: ['diskusage', 'explorer'] }
    ],
    body_pt: [
      { p: 'As Propriedades do Sistema s\u00e3o um centro de defini\u00e7\u00f5es com separadores, acess\u00edvel a partir do \u00edcone O Meu Computador no ambiente de trabalho ou do menu Iniciar. Tem quatro separadores: Geral, Visualiza\u00e7\u00e3o, Protetor de Ecr\u00e3 e Regional.' },
      { h: 'Separador Geral' },
      { p: 'Apresenta informa\u00e7\u00f5es sobre o seu sistema e navegador:' },
      { ul: [
        'Sistema operativo e nome do navegador.',
        'N\u00facleos do CPU (processadores l\u00f3gicos) e idioma do navegador.',
        'Resolu\u00e7\u00e3o do ecr\u00e3 e r\u00e1cio de pixels (dete\u00e7\u00e3o HiDPI).',
        'Tipo de liga\u00e7\u00e3o de rede e velocidade (se dispon\u00edvel).',
        'N\u00edvel de bateria e estado de carregamento (se dispon\u00edvel).'
      ]},
      { p: 'Alguns valores podem ser limitados pelas pol\u00edticas de privacidade do navegador. Por exemplo, a mem\u00f3ria do dispositivo \u00e9 limitada a 8 GB por especifica\u00e7\u00e3o.' },
      { h: 'Separador Visualiza\u00e7\u00e3o' },
      { p: 'Personalizar a apar\u00eancia do ambiente de trabalho:' },
      { ul: [
        'Cor de Fundo \u2014 escolha qualquer cor para o fundo do ambiente de trabalho usando um seletor de cores.',
        'Padr\u00e3o de Papel de Parede \u2014 escolha entre Nenhum, P\u00f4r do Sol, Pontos, Grelha, Diagonal ou Ondas.'
      ]},
      { h: 'Separador Protetor de Ecr\u00e3' },
      { p: 'Configure um protetor de ecr\u00e3 que se ativa ap\u00f3s um per\u00edodo de inatividade:' },
      { ul: [
        'Escolha entre 5 protetores de ecr\u00e3: Campo de Estrelas, Tubos, Logo Saltitante, Ciclo de Cores e Mystify.',
        'Pr\u00e9-visualize o protetor de ecr\u00e3 selecionado numa mini tela.',
        'Defina o tempo de inatividade (1, 2, 3 ou 5 minutos).',
        'Ative ou desative o protetor de ecr\u00e3 com uma caixa de sele\u00e7\u00e3o.',
        'Mova o rato, clique ou pressione uma tecla para dispensar o protetor de ecr\u00e3 em ecr\u00e3 inteiro.'
      ]},
      { p: 'Todas as defini\u00e7\u00f5es de visualiza\u00e7\u00e3o e protetor de ecr\u00e3 s\u00e3o guardadas no seu navegador e persistem entre visitas.' },
      { sa: ['diskusage', 'explorer'] }
    ]
  },

  explorer: {
    title: 'Files (Explorer)',
    title_pt: 'Ficheiros (Explorador)',
    keywords: ['files', 'explorer', 'folder', 'browse', 'programs', 'documents', 'utilities', 'navigate'],
    keywords_pt: ['ficheiros', 'explorador', 'pasta', 'navegar', 'programas', 'documentos', 'utilit\u00e1rios', 'navegar'],
    body: [
      { p: 'The Explorer window is a file browser for navigating mpOS applications, modeled after classic desktop file managers.' },
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
    ],
    body_pt: [
      { p: 'A janela do Explorador \u00e9 um navegador de ficheiros para percorrer as aplica\u00e7\u00f5es do mpOS, inspirado nos gestores de ficheiros clássicos.' },
      { h: 'Disposi\u00e7\u00e3o' },
      { ul: [
        'A barra lateral esquerda mostra uma \u00e1rvore de pastas: mpOS (todos os itens), Programas, Documentos e Utilit\u00e1rios.',
        'O painel direito apresenta o conte\u00fado da pasta selecionada.',
        'A barra de endere\u00e7os mostra o caminho atual (ex.: C:\\mpOS\\Programas).'
      ]},
      { h: 'Vistas' },
      { ul: [
        'Vista de \u00edcones \u2014 uma grelha de mosaicos de aplica\u00e7\u00f5es com \u00edcones.',
        'Vista de lista \u2014 linhas com \u00edcone, nome, descri\u00e7\u00e3o e etiqueta de tipo de ficheiro.',
        'Alterne entre vistas usando os bot\u00f5es na barra de ferramentas.'
      ]},
      { p: 'Clique duas vezes em qualquer item para o lan\u00e7ar.' },
      { sa: ['startmenu', 'desktop'] }
    ]
  },

  run: {
    title: 'Run Terminal',
    title_pt: 'Terminal Executar',
    keywords: ['run', 'terminal', 'command', 'cmd', 'console', 'command line', 'cli', 'prompt'],
    keywords_pt: ['executar', 'terminal', 'comando', 'cmd', 'consola', 'linha de comandos', 'cli', 'prompt'],
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
        'Programs \u2014 BROWSER, FISHOFDAY, FISHFINDER, ONTARGET, AQUARIUM, PAINT, BRICKBREAKER',
        'Utilities \u2014 NOTEPAD, CALCULATOR, CALENDAR, TIMEZONE, WEATHER, DISKUSAGE, VISITORMAP, SEARCH, HH (Help)',
        'System \u2014 MYCOMPUTER, EXPLORER, TASKMANAGER'
      ]},
      { h: 'Terminal Commands' },
      { ul: [
        'MATRIX \u2014 Matrix rain animation.',
        'COLOR <hex> \u2014 changes the terminal text color.',
        'TITLE <text> \u2014 sets the terminal window title.',
        'TASKLIST \u2014 lists open windows.',
        'TASKKILL <name> \u2014 closes a window by name.',
        'PING <host> \u2014 simulated network ping.',
        'START <url> \u2014 opens a URL in a new tab.'
      ]},
      { p: 'You can also type the name of an item in the current directory to run it.' },
      { sa: ['startmenu', 'explorer'] }
    ],
    body_pt: [
      { p: 'O terminal Executar \u00e9 uma interface de linha de comandos para lan\u00e7ar aplica\u00e7\u00f5es e navegar no sistema de ficheiros do mpOS.' },
      { h: 'Comandos B\u00e1sicos' },
      { ul: [
        'HELP \u2014 lista todos os comandos dispon\u00edveis.',
        'CLS / CLEAR \u2014 limpa o ecr\u00e3 do terminal.',
        'VER \u2014 mostra a vers\u00e3o do mpOS.',
        'CD <pasta> \u2014 muda o diret\u00f3rio (ex.: CD Programs).',
        'LS \u2014 lista o conte\u00fado do diret\u00f3rio atual.',
        'EXIT \u2014 fecha a janela do terminal.'
      ]},
      { h: 'Lan\u00e7ar Aplica\u00e7\u00f5es' },
      { p: 'Escreva o nome do comando de uma aplica\u00e7\u00e3o para a lan\u00e7ar diretamente:' },
      { ul: [
        'Programas \u2014 BROWSER, FISHOFDAY, FISHFINDER, ONTARGET, AQUARIUM, PAINT, BRICKBREAKER',
        'Utilit\u00e1rios \u2014 NOTEPAD, CALCULATOR, CALENDAR, TIMEZONE, WEATHER, DISKUSAGE, VISITORMAP, SEARCH, HH (Ajuda)',
        'Sistema \u2014 MYCOMPUTER, EXPLORER, TASKMANAGER'
      ]},
      { h: 'Comandos do Terminal' },
      { ul: [
        'MATRIX \u2014 Anima\u00e7\u00e3o de chuva Matrix.',
        'COLOR <hex> \u2014 muda a cor do texto do terminal.',
        'TITLE <texto> \u2014 define o t\u00edtulo da janela do terminal.',
        'TASKLIST \u2014 lista as janelas abertas.',
        'TASKKILL <nome> \u2014 fecha uma janela pelo nome.',
        'PING <host> \u2014 ping de rede simulado.',
        'START <url> \u2014 abre um URL num novo separador.'
      ]},
      { p: 'Tamb\u00e9m pode escrever o nome de um item no diret\u00f3rio atual para o executar.' },
      { sa: ['startmenu', 'explorer'] }
    ]
  },

  taskmanager: {
    title: 'Task Manager',
    title_pt: 'Gestor de Tarefas',
    keywords: ['task manager', 'ctrl alt del', 'processes', 'end task', 'cpu', 'memory', 'fps', 'performance'],
    keywords_pt: ['gestor de tarefas', 'ctrl alt del', 'processos', 'terminar tarefa', 'cpu', 'mem\u00f3ria', 'fps', 'desempenho'],
    body: [
      { p: 'Task Manager shows running windows and real-time system performance. Open it by pressing Ctrl+Alt+Del from anywhere.' },
      { h: 'Applications Tab' },
      { ul: [
        'Lists all open windows with their current status.',
        'Select a window and click End Task to close it.'
      ]},
      { h: 'Performance' },
      { ul: [
        'Real-time CPU usage graph based on frames per second (FPS).',
        'Real-time memory usage graph.'
      ]},
      { h: 'Opening Task Manager' },
      { ul: [
        'Press Ctrl+Alt+Del from anywhere.',
        'Type TASKMANAGER in the Run terminal.'
      ]},
      { sa: ['run', 'mycomputer'] }
    ],
    body_pt: [
      { p: 'O Gestor de Tarefas mostra janelas em execu\u00e7\u00e3o e desempenho do sistema em tempo real. Abra-o pressionando Ctrl+Alt+Del em qualquer lugar.' },
      { h: 'Separador Aplica\u00e7\u00f5es' },
      { ul: [
        'Lista todas as janelas abertas com o seu estado atual.',
        'Selecione uma janela e clique em Terminar Tarefa para a fechar.'
      ]},
      { h: 'Desempenho' },
      { ul: [
        'Gr\u00e1fico de utiliza\u00e7\u00e3o do CPU em tempo real baseado em fotogramas por segundo (FPS).',
        'Gr\u00e1fico de utiliza\u00e7\u00e3o de mem\u00f3ria em tempo real.'
      ]},
      { h: 'Abrir o Gestor de Tarefas' },
      { ul: [
        'Pressione Ctrl+Alt+Del em qualquer lugar.',
        'Escreva TASKMANAGER no terminal Executar.'
      ]},
      { sa: ['run', 'mycomputer'] }
    ]
  }
};
