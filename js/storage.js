/* Storage — Safe localStorage wrapper */
(function () {
'use strict';

var KEYS = {
  lang:            'mp-lang',
  volume:          'mp-volume',
  muted:           'mp-muted',
  clock:           'mp-clock',
  dateFmt:         'mp-datefmt',
  tempUnit:        'mp-tempunit',
  voiceContinuous: 'mp-voice-continuous',
  voiceSeen:       'mp-voice-seen',
  systemSettings:  'mpOS-system-settings',
  iconPositions:   'mpOS-icon-positions',
  notepadFiles:    'mpOS-notepad-files',
  paintFiles:      'mpOS-paint-files',
  stickyNotes:     'mpOS-sticky-notes',
  terminal:        'mpOS-terminal',
  slotMachine:     'mpOS-slotmachine'
};

function get(key, fallback) {
  try {
    var v = localStorage.getItem(key);
    return v !== null ? v : (fallback !== undefined ? fallback : null);
  } catch (e) { return fallback !== undefined ? fallback : null; }
}

function set(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch (e) { return false; }
}

function remove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}

function getJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw === null) return fallback !== undefined ? fallback : null;
    return JSON.parse(raw);
  } catch (e) { return fallback !== undefined ? fallback : null; }
}

function setJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { return false; }
}

window.mpStorage = { get: get, set: set, remove: remove, getJSON: getJSON, setJSON: setJSON };
window.STORAGE_KEYS = KEYS;
})();
