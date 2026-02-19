(function () {
  'use strict';

  const { mpTaskbar } = window;
  const { t, tPlural } = window;

  /* ── Cached DOM refs ── */
  const notepadEditor = document.getElementById('notepadEditor');
  const notepadStatus = document.getElementById('notepadStatus');
  const notepadTitle = document.getElementById('notepadTitle');

  /* ── State ── */
  let notepadCurrentFile = null;
  let notepadDirty = false;
  let notepadFindTerm = '';
  let notepadReplaceTerm = '';
  let notepadFindMatches = [];
  let notepadFindIndex = -1;
  let notepadFindCaseSensitive = false;
  let notepadFindMode = '';

  /* ── Persistence ── */
  const notepadGetFiles = () => {
    try { return JSON.parse(localStorage.getItem('mpOS-notepad-files')) || {}; }
    catch { return {}; }
  };

  const notepadPersist = (files) => {
    localStorage.setItem('mpOS-notepad-files', JSON.stringify(files));
  };

  const notepadMigrateLegacy = () => {
    if (localStorage.getItem('mpOS-notepad-files') !== null) return;
    const legacy = localStorage.getItem('mpOS-notepad');
    if (legacy !== null) {
      notepadPersist({ 'untitled.txt': legacy });
      localStorage.removeItem('mpOS-notepad');
      notepadCurrentFile = 'untitled.txt';
      notepadEditor.value = legacy;
    }
  };

  /* ── Title & status ── */
  const notepadSetTitle = () => {
    const name = notepadCurrentFile || t('notepad.untitled');
    notepadTitle.textContent = `${name}${notepadDirty ? '* ' : ' '}${t('notepad.titleSuffix')}`;
  };

  const notepadMarkDirty = () => {
    if (!notepadDirty) { notepadDirty = true; notepadSetTitle(); }
  };

  const notepadMarkClean = () => {
    notepadDirty = false;
    notepadSetTitle();
  };

  const notepadGuardDirty = async () => {
    if (!notepadDirty) return true;
    return await mpConfirm(t('notepad.discardChanges'));
  };

  const updateNotepadStatus = () => {
    const len = notepadEditor.value.length;
    notepadStatus.textContent = tPlural('notepad.charCount', len);
  };

  /* ── Dialogs ── */
  const notepadDismissDialog = () => {
    const d = document.querySelector('#notepad .notepad-dialog');
    if (d) d.remove();
  };

  /* ── Open app ── */
  const openNotepad = () => {
    window.openWindow('notepad');
    if (!notepadEditor.dataset.loaded) {
      notepadEditor.dataset.loaded = '1';
      notepadMigrateLegacy();
      if (notepadCurrentFile) {
        notepadEditor.value = notepadGetFiles()[notepadCurrentFile] || '';
      }
      notepadSetTitle();
      updateNotepadStatus();
    }
    setTimeout(() => { notepadEditor.focus(); }, 100);
  };

  /* ── New ── */
  const notepadNew = async () => {
    if (!(await notepadGuardDirty())) return;
    notepadDismissDialog();
    notepadEditor.value = '';
    notepadCurrentFile = null;
    notepadMarkClean();
    updateNotepadStatus();
    notepadEditor.focus();
  };

  /* ── Save ── */
  const notepadSave = () => {
    if (notepadCurrentFile) {
      const files = notepadGetFiles();
      files[notepadCurrentFile] = notepadEditor.value;
      notepadPersist(files);
      notepadMarkClean();
      notepadStatus.textContent = t('notepad.saved');
      setTimeout(updateNotepadStatus, 1500);
    } else {
      notepadShowSaveAs();
    }
  };

  /* ── Save As ── */
  const notepadSaveAs = async (name) => {
    name = name.trim();
    if (!name) return;
    if (name === '__proto__' || name === 'constructor' || name === 'prototype') return;
    if (name.indexOf('.') === -1) name += '.txt';
    const files = notepadGetFiles();
    if (files.hasOwnProperty(name) && name !== notepadCurrentFile) {
      if (!(await mpConfirm(t('notepad.overwriteConfirm', { name })))) return;
    }
    files[name] = notepadEditor.value;
    notepadPersist(files);
    notepadCurrentFile = name;
    notepadDismissDialog();
    notepadMarkClean();
    notepadStatus.textContent = t('notepad.saved');
    setTimeout(updateNotepadStatus, 1500);
    notepadEditor.focus();
  };

  const notepadShowSaveAs = () => {
    notepadDismissDialog();
    const d = document.createElement('div');
    d.className = 'notepad-dialog';

    const label = document.createElement('label');
    label.textContent = t('notepad.fileName');
    d.appendChild(label);

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'notepadSaveAsInput';
    inp.value = notepadCurrentFile || '';
    d.appendChild(inp);

    const spacer = document.createElement('div');
    spacer.className = 'spacer';
    d.appendChild(spacer);

    const btnRow = document.createElement('div');
    btnRow.className = 'button-row';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn';
    saveBtn.textContent = t('ui.save');
    saveBtn.addEventListener('click', () => { notepadSaveAs(inp.value); });
    btnRow.appendChild(saveBtn);
    btnRow.appendChild(document.createTextNode('\u00a0'));
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = t('ui.cancel');
    cancelBtn.addEventListener('click', notepadDismissDialog);
    btnRow.appendChild(cancelBtn);
    d.appendChild(btnRow);

    document.querySelector('#notepad .window-body').appendChild(d);
    inp.focus();
    inp.select();
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') notepadSaveAs(inp.value);
      else if (e.key === 'Escape') notepadDismissDialog();
    });
  };

  /* ── Load / Open ── */
  const notepadLoad = async () => {
    if (!(await notepadGuardDirty())) return;
    notepadShowOpen();
  };

  const notepadOpenFile = (name) => {
    const files = notepadGetFiles();
    if (!files.hasOwnProperty(name)) return;
    notepadEditor.value = files[name];
    notepadCurrentFile = name;
    notepadDismissDialog();
    notepadMarkClean();
    updateNotepadStatus();
    notepadEditor.focus();
  };

  const notepadDeleteFile = async (name) => {
    if (!(await mpConfirm(t('notepad.deleteConfirm', { name })))) return;
    const files = notepadGetFiles();
    delete files[name];
    notepadPersist(files);
    if (notepadCurrentFile === name) {
      notepadCurrentFile = null;
      notepadEditor.value = '';
      notepadMarkClean();
      updateNotepadStatus();
    }
    notepadShowOpen();
  };

  const notepadShowOpen = () => {
    notepadDismissDialog();
    const files = notepadGetFiles();
    const names = Object.keys(files).sort();

    const d = document.createElement('div');
    d.className = 'notepad-dialog';

    const label = document.createElement('label');
    label.textContent = t('notepad.openFile');
    d.appendChild(label);

    const fileList = document.createElement('div');
    fileList.className = 'notepad-file-list';
    if (names.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'notepad-empty';
      emptyMsg.textContent = t('notepad.noSavedFiles');
      fileList.appendChild(emptyMsg);
    } else {
      names.forEach((n) => {
        const row = document.createElement('div');
        row.className = 'notepad-file-item';
        const nameSpan = document.createElement('span');
        nameSpan.textContent = n;
        nameSpan.addEventListener('click', () => { notepadOpenFile(n); });
        row.appendChild(nameSpan);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn';
        delBtn.textContent = t('ui.delete');
        delBtn.addEventListener('click', (e) => { e.stopPropagation(); notepadDeleteFile(n); });
        row.appendChild(delBtn);
        fileList.appendChild(row);
      });
    }
    d.appendChild(fileList);

    const btnRow = document.createElement('div');
    btnRow.className = 'button-row';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = t('ui.cancel');
    cancelBtn.addEventListener('click', notepadDismissDialog);
    btnRow.appendChild(cancelBtn);
    d.appendChild(btnRow);

    document.querySelector('#notepad .window-body').appendChild(d);
  };

  /* ── Close ── */
  const closeNotepad = async () => {
    if (!(await notepadGuardDirty())) return;
    notepadCloseFindBar();
    notepadDismissDialog();
    mpTaskbar.closeWindow('notepad');
  };

  /* ── Find / Replace ── */
  const notepadBuildFindMatches = () => {
    notepadFindMatches = [];
    if (!notepadFindTerm) return;
    let text = notepadEditor.value;
    let term = notepadFindTerm;
    if (!notepadFindCaseSensitive) {
      text = text.toLowerCase();
      term = term.toLowerCase();
    }
    let pos = 0;
    while (true) {
      const idx = text.indexOf(term, pos);
      if (idx === -1) break;
      notepadFindMatches.push({ start: idx, end: idx + notepadFindTerm.length });
      pos = idx + 1;
    }
  };

  const notepadUpdateFindCount = () => {
    const countEl = document.getElementById('notepadFindCount');
    if (!countEl) return;
    if (!notepadFindTerm || notepadFindMatches.length === 0) {
      countEl.textContent = notepadFindTerm ? t('notepad.noMatches') : '';
      return;
    }
    countEl.textContent = t('notepad.matchCount', { current: notepadFindIndex + 1, total: notepadFindMatches.length });
  };

  const notepadHighlightMatch = () => {
    if (notepadFindMatches.length === 0) { notepadUpdateFindCount(); return; }
    if (notepadFindIndex < 0) notepadFindIndex = 0;
    if (notepadFindIndex >= notepadFindMatches.length) notepadFindIndex = notepadFindMatches.length - 1;
    const m = notepadFindMatches[notepadFindIndex];
    notepadEditor.focus();
    notepadEditor.setSelectionRange(m.start, m.end);
    notepadUpdateFindCount();
  };

  const notepadFindNext = () => {
    if (notepadFindMatches.length === 0) return;
    notepadFindIndex = (notepadFindIndex + 1) % notepadFindMatches.length;
    notepadHighlightMatch();
  };

  const notepadFindPrev = () => {
    if (notepadFindMatches.length === 0) return;
    notepadFindIndex = (notepadFindIndex - 1 + notepadFindMatches.length) % notepadFindMatches.length;
    notepadHighlightMatch();
  };

  const notepadReplace = () => {
    if (notepadFindMatches.length === 0 || notepadFindIndex < 0) return;
    const m = notepadFindMatches[notepadFindIndex];
    const val = notepadEditor.value;
    notepadEditor.value = val.substring(0, m.start) + notepadReplaceTerm + val.substring(m.end);
    notepadMarkDirty();
    updateNotepadStatus();
    notepadBuildFindMatches();
    if (notepadFindIndex >= notepadFindMatches.length) notepadFindIndex = 0;
    if (notepadFindMatches.length > 0) notepadHighlightMatch();
    else notepadUpdateFindCount();
  };

  const notepadReplaceAll = () => {
    if (notepadFindMatches.length === 0) return;
    let val = notepadEditor.value;
    for (let i = notepadFindMatches.length - 1; i >= 0; i--) {
      const m = notepadFindMatches[i];
      val = val.substring(0, m.start) + notepadReplaceTerm + val.substring(m.end);
    }
    notepadEditor.value = val;
    notepadMarkDirty();
    updateNotepadStatus();
    notepadBuildFindMatches();
    notepadFindIndex = 0;
    notepadUpdateFindCount();
  };

  const notepadShowFindBar = (mode) => {
    const existing = document.querySelector('.notepad-findbar');
    if (existing && notepadFindMode === mode) {
      const input = existing.querySelector('.notepad-find-input');
      if (input) input.focus();
      return;
    }
    if (existing) existing.remove();
    notepadFindMode = mode;

    const bar = document.createElement('div');
    bar.className = 'notepad-findbar';

    const row1 = document.createElement('div');
    row1.className = 'notepad-findbar-row';

    const findLabel = document.createElement('span');
    findLabel.textContent = t('notepad.find');
    findLabel.style.fontSize = '12px';
    row1.appendChild(findLabel);

    const findInput = document.createElement('input');
    findInput.type = 'text';
    findInput.className = 'notepad-find-input';
    findInput.value = notepadFindTerm;
    findInput.addEventListener('input', () => {
      notepadFindTerm = findInput.value;
      notepadFindIndex = 0;
      notepadBuildFindMatches();
      if (notepadFindMatches.length > 0) notepadHighlightMatch();
      else notepadUpdateFindCount();
    });
    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); notepadFindNext(); }
      if (e.key === 'Escape') { e.preventDefault(); notepadCloseFindBar(); }
    });
    row1.appendChild(findInput);

    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn';
    prevBtn.textContent = '\u25C0';
    prevBtn.title = 'Previous';
    prevBtn.addEventListener('click', notepadFindPrev);
    row1.appendChild(prevBtn);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn';
    nextBtn.textContent = '\u25B6';
    nextBtn.title = 'Next';
    nextBtn.addEventListener('click', notepadFindNext);
    row1.appendChild(nextBtn);

    const countSpan = document.createElement('span');
    countSpan.className = 'notepad-findbar-count';
    countSpan.id = 'notepadFindCount';
    row1.appendChild(countSpan);

    const caseLabel = document.createElement('label');
    caseLabel.className = 'notepad-findbar-case';
    const caseCheck = document.createElement('input');
    caseCheck.type = 'checkbox';
    caseCheck.checked = notepadFindCaseSensitive;
    caseCheck.addEventListener('change', () => {
      notepadFindCaseSensitive = caseCheck.checked;
      notepadFindIndex = 0;
      notepadBuildFindMatches();
      if (notepadFindMatches.length > 0) notepadHighlightMatch();
      else notepadUpdateFindCount();
    });
    caseLabel.appendChild(caseCheck);
    const caseText = document.createElement('span');
    caseText.textContent = t('notepad.matchCase');
    caseLabel.appendChild(caseText);
    row1.appendChild(caseLabel);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notepad-findbar-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', notepadCloseFindBar);
    row1.appendChild(closeBtn);

    bar.appendChild(row1);

    if (mode === 'replace') {
      const row2 = document.createElement('div');
      row2.className = 'notepad-findbar-row';

      const repLabel = document.createElement('span');
      repLabel.textContent = t('notepad.replace');
      repLabel.style.fontSize = '12px';
      row2.appendChild(repLabel);

      const repInput = document.createElement('input');
      repInput.type = 'text';
      repInput.value = notepadReplaceTerm;
      repInput.addEventListener('input', () => {
        notepadReplaceTerm = repInput.value;
      });
      repInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); notepadCloseFindBar(); }
      });
      row2.appendChild(repInput);

      const repBtn = document.createElement('button');
      repBtn.className = 'btn';
      repBtn.textContent = t('notepad.replaceBtn');
      repBtn.addEventListener('click', notepadReplace);
      row2.appendChild(repBtn);

      const repAllBtn = document.createElement('button');
      repAllBtn.className = 'btn';
      repAllBtn.textContent = t('notepad.replaceAll');
      repAllBtn.addEventListener('click', notepadReplaceAll);
      row2.appendChild(repAllBtn);

      bar.appendChild(row2);
    }

    const toolbar = document.querySelector('#notepad .notepad-toolbar');
    toolbar.insertAdjacentElement('afterend', bar);
    findInput.focus();

    if (notepadFindTerm) {
      notepadBuildFindMatches();
      if (notepadFindMatches.length > 0) notepadHighlightMatch();
      else notepadUpdateFindCount();
    }
  };

  const notepadCloseFindBar = () => {
    const bar = document.querySelector('.notepad-findbar');
    if (bar) bar.remove();
    notepadFindMode = '';
    notepadFindMatches = [];
    notepadFindIndex = -1;
    notepadEditor.focus();
  };

  /* ── Event listeners ── */
  notepadEditor.addEventListener('input', () => {
    notepadMarkDirty();
    updateNotepadStatus();
    if (notepadFindMode) {
      notepadBuildFindMatches();
      notepadUpdateFindCount();
    }
  });

  document.getElementById('notepad').addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'f') { e.preventDefault(); notepadShowFindBar('find'); }
      else if (e.key === 'h') { e.preventDefault(); notepadShowFindBar('replace'); }
      else if (e.key === 's') { e.preventDefault(); notepadSave(); }
    }
  });

  /* ── Registration ── */
  window.mpRegisterActions({ openNotepad });
  window.mpRegisterWindows({ notepad: 'Notepad' });
  window.mpRegisterCloseHandlers({ notepad: closeNotepad });

  /* ── Cross-module API: open notepad with arbitrary content (used by Search) ── */
  const notepadOpenWithContent = (name, content) => {
    openNotepad();
    notepadEditor.value = content || '';
    notepadCurrentFile = null;
    notepadDirty = false;
    notepadTitle.textContent = `${name} ${t('notepad.titleSuffix')}`;
    const len = (content || '').length;
    notepadStatus.textContent = tPlural('notepad.charCount', len);
  };

  /* ── Language change refresh ── */
  const notepadRefreshOnLangChange = () => {
    const el = document.getElementById('notepad');
    if (el && el.style.display !== 'none') { notepadSetTitle(); updateNotepadStatus(); }
  };

  /* ── Exports to window (for inline onclick handlers) ── */
  window.openNotepad = openNotepad;
  window.notepadNew = notepadNew;
  window.notepadSave = notepadSave;
  window.notepadLoad = notepadLoad;
  window.closeNotepad = closeNotepad;
  window.notepadSaveAs = notepadSaveAs;
  window.notepadOpenFile = notepadOpenFile;
  window.notepadDeleteFile = notepadDeleteFile;
  window.notepadDismissDialog = notepadDismissDialog;
  window.notepadOpenWithContent = notepadOpenWithContent;
  window.notepadRefreshOnLangChange = notepadRefreshOnLangChange;
})();
