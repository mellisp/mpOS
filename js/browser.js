(function () {
  'use strict';

  /* ── WikiBrowser ── */
  const BROWSER_HOME = 'https://en.wikipedia.org/wiki/Main_Page';
  const browserFrame = document.getElementById('browserFrame');
  const browserUrl = document.getElementById('browserUrl');
  const browserTitle = document.getElementById('browserTitle');

  const openBrowser = () => {
    const vp = document.getElementById('browserViewport');
    openWindow('browser');
    if (!vp.dataset.loaded) {
      vp.dataset.loaded = '1';
      browserFrame.src = BROWSER_HOME;
      browserUrl.value = BROWSER_HOME;
    }
    setTimeout(() => { browserUrl.focus(); browserUrl.select(); }, 100);
  };

  const closeBrowser = () => {
    const vp = document.getElementById('browserViewport');
    browserFrame.src = 'about:blank';
    vp.dataset.loaded = '';
    browserUrl.value = '';
    browserTitle.textContent = 'WikiBrowser';
    mpTaskbar.closeWindow('browser');
  };

  const browserNavigate = (query) => {
    query = query.trim();
    if (!query) return;
    let url;
    if (/^https:\/\/[a-z]{2,}\.(?:m\.)?wikipedia\.org\//.test(query)) {
      url = query.replace('://en.m.wikipedia.org/', '://en.wikipedia.org/');
    } else {
      url = `https://en.wikipedia.org/wiki/Special:Search/${encodeURIComponent(query)}`;
    }
    browserFrame.src = url;
    browserUrl.value = url;
  };

  browserUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      browserNavigate(browserUrl.value);
    }
  });

  browserFrame.addEventListener('load', () => {
    try {
      const loc = browserFrame.contentWindow.location.href;
      if (loc && loc !== 'about:blank') {
        browserUrl.value = loc;
        const title = browserFrame.contentDocument && browserFrame.contentDocument.title;
        browserTitle.textContent = title ? `WikiBrowser \u2014 ${title}` : 'WikiBrowser';
      }
    } catch (e) {
      /* cross-origin — can't read iframe location */
    }
  });

  /* ── Archive Browser ── */
  const ARCHIVE_HOME = 'https://archive.org/';
  const archiveBrowserFrame = document.getElementById('archiveBrowserFrame');
  const archiveBrowserUrl = document.getElementById('archiveBrowserUrl');
  const archiveBrowserTitle = document.getElementById('archiveBrowserTitle');

  const openArchiveBrowser = () => {
    const vp = document.getElementById('archiveBrowserViewport');
    openWindow('archivebrowser');
    if (!vp.dataset.loaded) {
      vp.dataset.loaded = '1';
      archiveBrowserFrame.src = ARCHIVE_HOME;
      archiveBrowserUrl.value = ARCHIVE_HOME;
    }
    setTimeout(() => { archiveBrowserUrl.focus(); archiveBrowserUrl.select(); }, 100);
  };

  const closeArchiveBrowser = () => {
    const vp = document.getElementById('archiveBrowserViewport');
    archiveBrowserFrame.src = 'about:blank';
    vp.dataset.loaded = '';
    archiveBrowserUrl.value = '';
    archiveBrowserTitle.textContent = 'Archive Browser';
    mpTaskbar.closeWindow('archivebrowser');
  };

  const archiveBrowserNavigate = (query) => {
    query = query.trim();
    if (!query) return;
    let url;
    if (/^https?:\/\/([^/]*\.)?archive\.org(\/|$)/.test(query)) {
      url = query;
    } else if (/^https?:\/\//.test(query)) {
      url = `https://web.archive.org/web/*/${query}`;
    } else {
      url = `https://archive.org/search?query=${encodeURIComponent(query)}`;
    }
    archiveBrowserFrame.src = url;
    archiveBrowserUrl.value = url;
  };

  archiveBrowserUrl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      archiveBrowserNavigate(archiveBrowserUrl.value);
    }
  });

  archiveBrowserFrame.addEventListener('load', () => {
    try {
      const loc = archiveBrowserFrame.contentWindow.location.href;
      if (loc && loc !== 'about:blank') {
        archiveBrowserUrl.value = loc;
        const title = archiveBrowserFrame.contentDocument && archiveBrowserFrame.contentDocument.title;
        archiveBrowserTitle.textContent = title ? `Archive Browser \u2014 ${title}` : 'Archive Browser';
      }
    } catch (e) {
      /* cross-origin — can't read iframe location */
    }
  });

  /* ── Register with core ── */
  window.mpRegisterActions({ openBrowser, openArchiveBrowser });
  window.mpRegisterWindows({ browser: 'WikiBrowser', archivebrowser: 'Archive Browser' });
  window.mpRegisterCloseHandlers({ browser: closeBrowser, archivebrowser: closeArchiveBrowser });

  /* ── Export HTML onclick handlers ── */
  window.openBrowser = openBrowser;
  window.closeBrowser = closeBrowser;
  window.browserNavigate = browserNavigate;
  window.openArchiveBrowser = openArchiveBrowser;
  window.closeArchiveBrowser = closeArchiveBrowser;
  window.archiveBrowserNavigate = archiveBrowserNavigate;
})();
