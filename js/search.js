(function () {
  'use strict';

  const { t, tPlural, getLang } = window;
  const { openWindow, loadDataScript, itemName, itemDesc, getItemIcon } = window;
  const { ACTION_MAP, COMMANDS } = window;

  /* ── Search Results ── */

  let searchBuilt = false;

  const openSearch = () => {
    openWindow('search');
    if (!searchBuilt) {
      searchBuilt = true;
      const input = document.getElementById('searchInput');
      input.addEventListener('input', () => searchNow());
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchNow();
      });
    }
    setTimeout(() => {
      document.getElementById('searchInput').focus();
    }, 100);
  };

  const searchNow = () => {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    const status = document.getElementById('searchStatus');
    const query = input.value.trim().toLowerCase();

    results.textContent = '';

    if (!query) {
      status.textContent = t('search.ready');
      return;
    }

    let totalCount = 0;
    const FOLDER_ITEMS = window.FOLDER_ITEMS;
    const FILESYSTEM = window.FILESYSTEM;

    // 1. Search all app categories
    const searchCategories = [
      { key: 'games',       i18n: 'search.group.games' },
      { key: 'internet',    i18n: 'search.group.internet' },
      { key: 'accessories', i18n: 'search.group.accessories' },
      { key: 'audio',       i18n: 'search.group.audio' },
      { key: 'utilities',   i18n: 'search.group.utilities' }
    ];
    searchCategories.forEach((cat) => {
      const matches = FOLDER_ITEMS[cat.key].filter((item) =>
        itemName(item).toLowerCase().indexOf(query) !== -1 ||
        itemDesc(item).toLowerCase().indexOf(query) !== -1
      );
      if (matches.length) {
        totalCount += matches.length;
        results.appendChild(searchBuildGroup(t(cat.i18n), matches, 'program'));
      }
    });

    // 2. Files
    const fileMatches = [];
    const paths = Object.keys(FILESYSTEM);
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const entry = FILESYSTEM[path];
      if (!entry.files) continue;
      for (let j = 0; j < entry.files.length; j++) {
        const f = entry.files[j];
        if (f.name.toLowerCase().indexOf(query) !== -1 ||
            (f.content && f.content.toLowerCase().indexOf(query) !== -1)) {
          fileMatches.push({ name: f.name, path, content: f.content });
        }
      }
    }
    if (fileMatches.length) {
      totalCount += fileMatches.length;
      results.appendChild(searchBuildGroup(t('search.group.files'), fileMatches, 'file'));
    }

    // 3. Commands
    const cmdKeys = Object.keys(COMMANDS);
    const cmdMatches = [];
    for (let k = 0; k < cmdKeys.length; k++) {
      const key = cmdKeys[k];
      const cmd = COMMANDS[key];
      if (key.toLowerCase().indexOf(query) !== -1 ||
          cmd.desc.toLowerCase().indexOf(query) !== -1) {
        cmdMatches.push({ key, desc: cmd.desc });
      }
    }
    if (cmdMatches.length) {
      totalCount += cmdMatches.length;
      results.appendChild(searchBuildGroup(t('search.group.commands'), cmdMatches, 'command'));
    }

    if (totalCount === 0) {
      const noRes = document.createElement('div');
      noRes.className = 'search-no-results';
      noRes.textContent = t('search.noResults');
      results.appendChild(noRes);
      status.textContent = t('search.itemsFound', { count: 0 });
    } else {
      status.textContent = t('search.itemsFound', { count: totalCount });
    }
  };

  const searchBuildGroup = (title, items, type) => {
    const frag = document.createDocumentFragment();
    const header = document.createElement('div');
    header.className = 'search-result-group-title';
    header.textContent = title;
    frag.appendChild(header);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const row = document.createElement('div');
      row.className = 'search-result-item';

      if (type === 'program') {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 20 20');
        svg.setAttribute('fill', 'none');
        svg.innerHTML = getItemIcon(item.name);
        row.appendChild(svg);
        const nameEl = document.createElement('span');
        nameEl.className = 'search-result-name';
        nameEl.textContent = itemName(item);
        row.appendChild(nameEl);
        const descEl = document.createElement('span');
        descEl.className = 'search-result-desc';
        descEl.textContent = itemDesc(item);
        row.appendChild(descEl);
        row.addEventListener('click', () => {
          const fn = ACTION_MAP[item.action];
          if (fn) fn();
        });
      } else if (type === 'file') {
        const iconEl = document.createElement('span');
        iconEl.className = 'search-result-icon';
        iconEl.textContent = '\uD83D\uDCC4';
        row.appendChild(iconEl);
        const fnameEl = document.createElement('span');
        fnameEl.className = 'search-result-name';
        fnameEl.textContent = item.name;
        row.appendChild(fnameEl);
        const pathEl = document.createElement('span');
        pathEl.className = 'search-result-desc';
        pathEl.textContent = item.path;
        row.appendChild(pathEl);
        row.addEventListener('click', () => {
          window.notepadOpenWithContent(item.name, item.content);
        });
      } else if (type === 'command') {
        const promptEl = document.createElement('span');
        promptEl.className = 'search-result-icon';
        promptEl.textContent = '>';
        row.appendChild(promptEl);
        const cmdNameEl = document.createElement('span');
        cmdNameEl.className = 'search-result-name';
        cmdNameEl.textContent = item.key;
        row.appendChild(cmdNameEl);
        const cmdDescEl = document.createElement('span');
        cmdDescEl.className = 'search-result-desc';
        cmdDescEl.textContent = item.desc;
        row.appendChild(cmdDescEl);
        row.addEventListener('click', () => {
          window.openRun();
          document.getElementById('termInput').value = item.key;
          document.getElementById('termInput').focus();
        });
      }

      frag.appendChild(row);
    }
    return frag;
  };

  /* ── Help System ── */

  let helpHistory = [];
  let helpHistoryIndex = -1;
  let helpCurrentTab = 'contents';
  let helpNavVisible = true;
  let helpBuilt = false;
  let helpIndexData = null;

  const openHelp = async () => {
    openWindow('help');
    if (!helpBuilt) {
      await loadDataScript('js/help-data.js');
      helpBuilt = true;
      helpHistory = ['welcome'];
      helpHistoryIndex = 0;
      helpSwitchTab('contents');
      helpRenderTopic('welcome');
      helpUpdateButtons();
    }
  };

  const helpNavigateTo = (topicId) => {
    if (!window.HELP_TOPICS[topicId]) return;
    // Trim forward history
    helpHistory = helpHistory.slice(0, helpHistoryIndex + 1);
    helpHistory.push(topicId);
    helpHistoryIndex = helpHistory.length - 1;
    helpRenderTopic(topicId);
    helpUpdateButtons();
    helpUpdateTreeActive(topicId);
  };

  const helpBack = () => {
    if (helpHistoryIndex <= 0) return;
    helpHistoryIndex--;
    const topicId = helpHistory[helpHistoryIndex];
    helpRenderTopic(topicId);
    helpUpdateButtons();
    helpUpdateTreeActive(topicId);
  };

  const helpForward = () => {
    if (helpHistoryIndex >= helpHistory.length - 1) return;
    helpHistoryIndex++;
    const topicId = helpHistory[helpHistoryIndex];
    helpRenderTopic(topicId);
    helpUpdateButtons();
    helpUpdateTreeActive(topicId);
  };

  const helpHome = () => {
    helpNavigateTo('welcome');
  };

  const helpToggleNav = () => {
    const nav = document.getElementById('helpNav');
    const btn = document.getElementById('helpToggleBtn');
    helpNavVisible = !helpNavVisible;
    nav.classList.toggle('hidden', !helpNavVisible);
    btn.textContent = helpNavVisible ? t('help.hide') : t('help.show');
  };

  const helpUpdateButtons = () => {
    document.getElementById('helpBackBtn').disabled = (helpHistoryIndex <= 0);
    document.getElementById('helpFwdBtn').disabled = (helpHistoryIndex >= helpHistory.length - 1);
  };

  const helpSwitchTab = (tab) => {
    helpCurrentTab = tab;
    const tabs = { contents: 'helpTabContents', index: 'helpTabIndex', search: 'helpTabSearch' };
    for (const key in tabs) {
      document.getElementById(tabs[key]).classList.toggle('active', key === tab);
    }
    const body = document.getElementById('helpTabBody');
    body.textContent = '';
    if (tab === 'contents') helpBuildTree(body);
    else if (tab === 'index') helpBuildIndex(body);
    else if (tab === 'search') helpBuildSearch(body);
  };

  const helpGetTitle = (topic) =>
    getLang() === 'pt' && topic.title_pt ? topic.title_pt : topic.title;

  const helpGetBody = (topic) =>
    getLang() === 'pt' && topic.body_pt ? topic.body_pt : topic.body;

  const helpGetKeywords = (topic) =>
    getLang() === 'pt' && topic.keywords_pt ? topic.keywords_pt : topic.keywords;

  const helpGetFolderTitle = (folder) =>
    getLang() === 'pt' && folder.title_pt ? folder.title_pt : folder.title;

  const helpBuildTree = (body) => {
    const HELP_TREE = window.HELP_TREE;
    const HELP_TOPICS = window.HELP_TOPICS;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < HELP_TREE.length; i++) {
      const folder = HELP_TREE[i];
      const folderEl = document.createElement('div');

      const folderRow = document.createElement('div');
      folderRow.className = 'help-tree-folder';
      const icon = document.createElement('span');
      icon.className = 'help-tree-icon';
      icon.textContent = '\uD83D\uDCD6';
      folderRow.appendChild(icon);
      const label = document.createElement('span');
      label.textContent = helpGetFolderTitle(folder);
      folderRow.appendChild(label);
      folderEl.appendChild(folderRow);

      const childrenEl = document.createElement('div');
      childrenEl.className = 'help-tree-children open';

      for (let j = 0; j < folder.children.length; j++) {
        const topicId = folder.children[j];
        const topic = HELP_TOPICS[topicId];
        if (!topic) continue;
        const topicEl = document.createElement('div');
        topicEl.className = 'help-tree-topic';
        topicEl.dataset.topicId = topicId;
        const tIcon = document.createElement('span');
        tIcon.className = 'help-tree-icon';
        tIcon.textContent = '\uD83D\uDCC4';
        topicEl.appendChild(tIcon);
        const tLabel = document.createElement('span');
        tLabel.textContent = helpGetTitle(topic);
        topicEl.appendChild(tLabel);
        topicEl.addEventListener('click', ((id) => () => helpNavigateTo(id))(topicId));
        childrenEl.appendChild(topicEl);
      }

      folderEl.appendChild(childrenEl);

      folderRow.addEventListener('click', ((ch) => () => ch.classList.toggle('open'))(childrenEl));

      frag.appendChild(folderEl);
    }
    body.appendChild(frag);
    // Highlight current topic
    if (helpHistory.length > 0) {
      helpUpdateTreeActive(helpHistory[helpHistoryIndex]);
    }
  };

  const helpBuildIndex = (body) => {
    const HELP_TOPICS = window.HELP_TOPICS;
    // Rebuild index data each time (language may have changed)
    helpIndexData = [];
    const keys = Object.keys(HELP_TOPICS);
    for (let i = 0; i < keys.length; i++) {
      const topic = HELP_TOPICS[keys[i]];
      const kw = helpGetKeywords(topic);
      const title = helpGetTitle(topic);
      for (let j = 0; j < kw.length; j++) {
        helpIndexData.push({ keyword: kw[j], topicId: keys[i], title });
      }
    }
    helpIndexData.sort((a, b) => a.keyword.localeCompare(b.keyword));

    const header = document.createElement('div');
    header.className = 'help-index-header';
    header.textContent = t('help.indexHeader');
    body.appendChild(header);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'help-index-input';
    input.spellcheck = false;
    input.autocomplete = 'off';
    body.appendChild(input);

    const list = document.createElement('div');
    list.className = 'flex-scroll';
    body.appendChild(list);

    const filterIndex = () => {
      const query = input.value.toLowerCase();
      list.textContent = '';
      const matches = helpIndexData.filter((item) =>
        item.keyword.toLowerCase().indexOf(query) === 0
      );
      if (matches.length === 0) {
        const none = document.createElement('div');
        none.className = 'help-no-results';
        none.textContent = t('help.noKeywords');
        list.appendChild(none);
        return;
      }
      for (let i = 0; i < matches.length; i++) {
        const row = document.createElement('div');
        row.className = 'help-list-item';
        row.textContent = `${matches[i].keyword} \u2014 ${matches[i].title}`;
        row.addEventListener('click', ((id) => () => helpNavigateTo(id))(matches[i].topicId));
        list.appendChild(row);
      }
    };

    filterIndex();
    input.addEventListener('input', filterIndex);
    setTimeout(() => input.focus(), 50);
  };

  const helpBuildSearch = (body) => {
    const header = document.createElement('div');
    header.className = 'help-search-header';
    header.textContent = t('help.searchHeader');
    body.appendChild(header);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'help-search-input';
    input.spellcheck = false;
    input.autocomplete = 'off';
    body.appendChild(input);

    const btn = document.createElement('button');
    btn.className = 'btn help-search-btn';
    btn.textContent = t('help.listTopics');
    body.appendChild(btn);

    const resultsEl = document.createElement('div');
    resultsEl.className = 'flex-scroll help-search-results';
    body.appendChild(resultsEl);

    const doSearch = () => {
      const HELP_TOPICS = window.HELP_TOPICS;
      const query = input.value.trim().toLowerCase();
      resultsEl.textContent = '';
      if (!query) return;

      const matches = [];
      const keys = Object.keys(HELP_TOPICS);
      for (let i = 0; i < keys.length; i++) {
        const topic = HELP_TOPICS[keys[i]];
        let searchText = helpGetTitle(topic).toLowerCase();
        searchText += ` ${helpGetKeywords(topic).join(' ').toLowerCase()}`;
        const bodyBlocks = helpGetBody(topic);
        for (let b = 0; b < bodyBlocks.length; b++) {
          const block = bodyBlocks[b];
          if (block.p) searchText += ` ${block.p.toLowerCase()}`;
          if (block.h) searchText += ` ${block.h.toLowerCase()}`;
          if (block.ul) searchText += ` ${block.ul.join(' ').toLowerCase()}`;
        }
        if (searchText.indexOf(query) !== -1) {
          matches.push({ topicId: keys[i], title: helpGetTitle(topic) });
        }
      }

      if (matches.length === 0) {
        const none = document.createElement('div');
        none.className = 'help-no-results';
        none.textContent = t('help.noTopics');
        resultsEl.appendChild(none);
        return;
      }

      for (let m = 0; m < matches.length; m++) {
        const row = document.createElement('div');
        row.className = 'help-list-item';
        row.textContent = matches[m].title;
        row.addEventListener('click', ((id) => () => helpNavigateTo(id))(matches[m].topicId));
        resultsEl.appendChild(row);
      }
    };

    btn.addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
    setTimeout(() => input.focus(), 50);
  };

  const helpRenderTopic = (topicId) => {
    const HELP_TOPICS = window.HELP_TOPICS;
    const content = document.getElementById('helpContent');
    const topic = HELP_TOPICS[topicId];
    if (!topic) return;

    content.textContent = '';
    content.scrollTop = 0;

    const topicTitle = helpGetTitle(topic);
    // Update title bar
    document.getElementById('helpTitle').textContent = `${t('help.titlePrefix')} \u2014 ${topicTitle}`;

    const titleEl = document.createElement('div');
    titleEl.className = 'help-topic-title';
    titleEl.textContent = topicTitle;
    content.appendChild(titleEl);

    const bodyBlocks = helpGetBody(topic);
    for (let i = 0; i < bodyBlocks.length; i++) {
      const block = bodyBlocks[i];

      if (block.p) {
        const p = document.createElement('div');
        p.className = 'help-topic-p';
        p.textContent = block.p;
        content.appendChild(p);
      } else if (block.h) {
        const h = document.createElement('div');
        h.className = 'help-topic-heading';
        h.textContent = block.h;
        content.appendChild(h);
      } else if (block.ul) {
        const ul = document.createElement('ul');
        ul.className = 'help-topic-ul';
        for (let j = 0; j < block.ul.length; j++) {
          const li = document.createElement('li');
          li.textContent = block.ul[j];
          ul.appendChild(li);
        }
        content.appendChild(ul);
      } else if (block.sa) {
        const sa = document.createElement('div');
        sa.className = 'help-topic-sa';
        const saLabel = document.createElement('div');
        saLabel.className = 'help-topic-sa-label';
        saLabel.textContent = t('help.seeAlso');
        sa.appendChild(saLabel);
        for (let k = 0; k < block.sa.length; k++) {
          const linked = HELP_TOPICS[block.sa[k]];
          if (!linked) continue;
          if (k > 0) {
            sa.appendChild(document.createTextNode(', '));
          }
          const link = document.createElement('span');
          link.className = 'help-topic-link';
          link.textContent = helpGetTitle(linked);
          link.addEventListener('click', ((id) => () => helpNavigateTo(id))(block.sa[k]));
          sa.appendChild(link);
        }
        content.appendChild(sa);
      }
    }
  };

  const helpUpdateTreeActive = (topicId) => {
    const topics = document.querySelectorAll('.help-tree-topic');
    for (let i = 0; i < topics.length; i++) {
      topics[i].classList.toggle('active', topics[i].dataset.topicId === topicId);
    }
  };

  /* ── Language change refresh (called from main languagechange handler) ── */
  const helpRefreshOnLangChange = () => {
    const el = document.getElementById('help');
    if (el && el.style.display !== 'none') {
      helpSwitchTab(helpCurrentTab);
      if (helpHistory.length > 0) helpRenderTopic(helpHistory[helpHistoryIndex]);
    }
  };

  const searchRefreshOnLangChange = () => {
    const el = document.getElementById('search');
    if (el && el.style.display !== 'none') {
      document.getElementById('searchResults').textContent = '';
      document.getElementById('searchStatus').textContent = t('search.ready');
    }
  };

  /* ── Registration ── */
  window.mpRegisterActions({ openSearch, openHelp });
  window.mpRegisterWindows({ search: 'Search Results', help: 'Help' });

  /* ── Exports to window (for inline onclick handlers and cross-module use) ── */
  window.openSearch = openSearch;
  window.searchNow = searchNow;
  window.openHelp = openHelp;
  window.helpBack = helpBack;
  window.helpForward = helpForward;
  window.helpHome = helpHome;
  window.helpToggleNav = helpToggleNav;
  window.helpSwitchTab = helpSwitchTab;
  window.helpRefreshOnLangChange = helpRefreshOnLangChange;
  window.searchRefreshOnLangChange = searchRefreshOnLangChange;
})();
