/* Core — Shared helpers, registration, window management */
(function () {
'use strict';

const mobileQuery = window.matchMedia('(max-width: 767px)');

/* ── Registration hooks — each app file calls these to self-register ── */
const ACTION_MAP = {};
const WINDOW_NAMES = {};
const COMMANDS = {};
const CLOSE_MAP = {};

window.ACTION_MAP = ACTION_MAP;
window.WINDOW_NAMES = WINDOW_NAMES;
window.COMMANDS = COMMANDS;
window.CLOSE_MAP = CLOSE_MAP;
window.mobileQuery = mobileQuery;

window.mpRegisterActions = (map) => Object.assign(ACTION_MAP, map);
window.mpRegisterWindows = (map) => Object.assign(WINDOW_NAMES, map);
window.mpRegisterCommands = (map) => Object.assign(COMMANDS, map);
window.mpRegisterCloseHandlers = (map) => Object.assign(CLOSE_MAP, map);

/* ── Geolocation with IP fallback ── */
const GEO_ERRORS = {
  1: 'error.geoDenied',
  2: 'error.geoUnavailable',
  3: 'error.geoTimeout'
};

function getLocation(onSuccess, onError) {
  let done = false;
  const finish = (lat, lon) => {
    if (done) return;
    done = true;
    onSuccess(lat, lon);
  };
  const fallbackToIP = async () => {
    if (done) return;
    try {
      const r = await fetch('https://ipapi.co/json/');
      if (!r.ok) throw new Error('IP lookup failed');
      const data = await r.json();
      if (data.latitude != null && data.longitude != null) {
        finish(data.latitude, data.longitude);
      } else {
        if (!done) { done = true; onError(t('error.geoFallback')); }
      }
    } catch {
      if (!done) { done = true; onError(t('error.geoFallback')); }
    }
  };

  if (!navigator.geolocation) {
    fallbackToIP();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => finish(pos.coords.latitude, pos.coords.longitude),
    () => fallbackToIP(),
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
  );
}

/* ── Alert triangle SVG ── */
function alertTriangleSVG(id) {
  return `<svg class="alert-icon" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0%" stop-color="#fffde0"/><stop offset="20%" stop-color="#ffe88a"/><stop offset="50%" stop-color="#ffd54f"/><stop offset="100%" stop-color="#e8a000"/></linearGradient></defs><path d="M16 2 L30 28 L2 28 Z" fill="url(#${id})" stroke="#a07000" stroke-width="1.5" stroke-linejoin="round"/><line x1="6" y1="26" x2="16" y2="5" stroke="white" stroke-width="1" opacity="0.3" stroke-linecap="round"/><ellipse cx="13" cy="14" rx="5" ry="6" fill="white" opacity="0.15"/><rect x="14.5" y="11" width="3" height="9" rx="1.5" fill="#5d4037"/><rect x="14.5" y="22" width="3" height="3" rx="1.5" fill="#5d4037"/></svg>`;
}

/* ── Error panel ── */
function showErrorPanel(body, msg, gradientId) {
  body.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = 'error-panel';
  const row = document.createElement('div');
  row.className = 'error-row';
  const svgWrap = document.createElement('span');
  svgWrap.innerHTML = alertTriangleSVG(gradientId);
  row.appendChild(svgWrap);
  const text = document.createElement('div');
  text.className = 'error-text';
  text.textContent = msg;
  row.appendChild(text);
  wrap.appendChild(row);
  body.appendChild(wrap);
}

/* ── Custom confirm dialog ── */
function mpConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'mp-confirm-overlay';

    const win = document.createElement('div');
    win.className = 'window';
    win.id = 'mpConfirmDialog';

    /* Titlebar */
    const tb = document.createElement('div');
    tb.className = 'titlebar';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = t('ui.confirm');
    tb.appendChild(titleSpan);
    const tbBtns = document.createElement('div');
    tbBtns.className = 'titlebar-buttons';
    const closeBtn = document.createElement('div');
    closeBtn.className = 'titlebar-btn';
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('tabindex', '0');
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = 'X';
    tbBtns.appendChild(closeBtn);
    tb.appendChild(tbBtns);
    win.appendChild(tb);

    /* Body */
    const body = document.createElement('div');
    body.className = 'window-body';

    const row = document.createElement('div');
    row.className = 'error-row';
    const iconWrap = document.createElement('span');
    iconWrap.innerHTML = '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="16" cy="16" r="14" fill="#1c6dba" stroke="#145a9e" stroke-width="1.5"/>' +
      '<circle cx="16" cy="16" r="12" fill="none" stroke="white" stroke-width="0.5" opacity="0.3"/>' +
      '<path d="M12.5 12 Q12.5 8.5 16 8.5 Q19.5 8.5 19.5 12 Q19.5 14 16 15 L16 17.5" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="16" cy="22" r="1.5" fill="white"/></svg>';
    row.appendChild(iconWrap);
    const msgEl = document.createElement('div');
    msgEl.className = 'error-text';
    msgEl.textContent = message;
    row.appendChild(msgEl);
    body.appendChild(row);

    const btnRow = document.createElement('div');
    btnRow.className = 'button-row';
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn';
    okBtn.textContent = t('ui.ok');
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn';
    cancelBtn.style.marginLeft = '6px';
    cancelBtn.textContent = t('ui.cancel');
    btnRow.appendChild(okBtn);
    btnRow.appendChild(cancelBtn);
    body.appendChild(btnRow);
    win.appendChild(body);

    document.body.appendChild(overlay);
    document.body.appendChild(win);

    const cleanup = (result) => {
      document.removeEventListener('keydown', onKey, true);
      win.remove();
      overlay.remove();
      resolve(result);
    };

    okBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    closeBtn.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', () => cleanup(false));

    const onKey = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); cleanup(true); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cleanup(false); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement === okBtn) cancelBtn.focus();
        else okBtn.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    okBtn.focus();
  });
}

/* ── Open / close window ── */
function openWindow(id) {
  const win = document.getElementById(id);
  if (!win) return;
  /* Clear stale animation classes from interrupted close/minimize
     (animationend may not fire with contain: layout style or reduced-motion) */
  win.classList.remove('closing', 'minimizing', 'restoring');
  win.style.opacity = '';
  if (win.style.display !== 'none') {
    if (window.mpTaskbar) window.mpTaskbar.bringToFront(win);
    return;
  }
  win.style.display = '';
  if (window.mpSoundProducer) window.mpSoundProducer.play('open');
  if (window.mpTaskbar) window.mpTaskbar.bringToFront(win);
  if (mobileQuery.matches) injectMobileBackButton(win);
  win.classList.add('restoring');
  win.addEventListener('animationend', function handler() {
    win.classList.remove('restoring');
    win.removeEventListener('animationend', handler);
  });
}

const startMenuEl = document.querySelector('.start-menu');
const startBtnEl = document.querySelector('.start-btn');
function closeStartMenu() {
  if (startMenuEl) startMenuEl.classList.remove('open');
  if (startBtnEl) startBtnEl.classList.remove('pressed');
}

/* ── Mobile window navigation ── */
function mobileCloseWindow(id) {
  const fn = CLOSE_MAP[id];
  if (fn) { fn(); } else { mpTaskbar.closeWindow(id); }
}

function injectMobileBackButton(win) {
  if (win.querySelector('.mobile-back-btn')) return;
  const titlebar = win.querySelector('.titlebar');
  if (!titlebar) return;
  const btn = document.createElement('div');
  btn.className = 'mobile-back-btn';
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-label', 'Back');
  btn.textContent = '\u2190';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    mobileCloseWindow(win.id);
  });
  titlebar.insertBefore(btn, titlebar.firstChild);
}

/* ── Item helpers (for FOLDER_ITEMS) ── */
function itemName(item) { return item._key ? t(`app.${item._key}.name`) : item.name; }
function itemDesc(item) { return item._key ? t(`app.${item._key}.desc`) : item.desc; }

function getItemIcon(name) {
  const icons = {
    'WikiBrowser': '<defs><radialGradient id="ei-wb" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#e0f4ff"/><stop offset="25%" stop-color="#80c8f0"/><stop offset="55%" stop-color="#4a8abe"/><stop offset="100%" stop-color="#2a6898"/></radialGradient><clipPath id="ei-wbc"><circle cx="10" cy="10" r="7.5"/></clipPath></defs><circle cx="10" cy="10" r="8" fill="url(#ei-wb)" stroke="#1a4a6e" stroke-width="1"/><g clip-path="url(#ei-wbc)" opacity="0.35"><ellipse cx="8" cy="8" rx="3" ry="2.5" fill="#5aaa80"/><ellipse cx="13" cy="11" rx="2" ry="3" fill="#5aaa80"/></g><ellipse cx="10" cy="10" rx="3.5" ry="8" fill="none" stroke="#1a4a6e" stroke-width="0.7"/><line x1="2" y1="10" x2="18" y2="10" stroke="#1a4a6e" stroke-width="0.7"/><path d="M3.5 6.5 Q10 5.5 16.5 6.5" fill="none" stroke="#1a4a6e" stroke-width="0.5"/><path d="M3.5 13.5 Q10 14.5 16.5 13.5" fill="none" stroke="#1a4a6e" stroke-width="0.5"/><ellipse cx="7.5" cy="7" rx="4" ry="3" fill="white" opacity="0.3"/>',
    'Archive Browser': '<defs><linearGradient id="ei-ab" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#c8a070"/><stop offset="30%" stop-color="#a07848"/><stop offset="70%" stop-color="#785828"/><stop offset="100%" stop-color="#604018"/></linearGradient><linearGradient id="ei-abp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff8e8"/><stop offset="100%" stop-color="#e8d8c0"/></linearGradient></defs><rect x="3" y="2" width="2" height="16" rx="0.5" fill="#604018" stroke="#402808" stroke-width="0.4"/><rect x="5" y="3" width="12" height="14" rx="0.5" fill="url(#ei-abp)" stroke="#a09078" stroke-width="0.4"/><path d="M3 2 Q3 1.5 3.5 1.5 L16.5 1.5 Q17 1.5 17 2 L17 18 Q17 18.5 16.5 18.5 L3.5 18.5 Q3 18.5 3 18 Z" fill="url(#ei-ab)" stroke="#402808" stroke-width="0.5" opacity="0.85"/><line x1="5" y1="1.5" x2="5" y2="18.5" stroke="#402808" stroke-width="0.5"/><rect x="6.5" y="5" width="9" height="3.5" rx="0.5" fill="#f0e0c0" stroke="#a08050" stroke-width="0.3" opacity="0.9"/><text x="11" y="7.5" text-anchor="middle" font-size="2.5" font-family="serif" fill="#402808" font-weight="bold">ARCHIVE</text><line x1="7" y1="10.5" x2="16" y2="10.5" stroke="#a08050" stroke-width="0.3" opacity="0.6"/><line x1="7" y1="12" x2="16" y2="12" stroke="#a08050" stroke-width="0.3" opacity="0.6"/><line x1="7" y1="13.5" x2="13" y2="13.5" stroke="#a08050" stroke-width="0.3" opacity="0.6"/><ellipse cx="8.5" cy="4" rx="4.5" ry="2" fill="white" opacity="0.15"/>',
    'Fish of the Day': '<defs><linearGradient id="ei-fd" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#b0f0d0"/><stop offset="30%" stop-color="#70c898"/><stop offset="70%" stop-color="#40a068"/><stop offset="100%" stop-color="#2a8858"/></linearGradient></defs><path d="M1 7 Q3 10 1 14 L4 11 Z" fill="url(#ei-fd)" stroke="#1a5c42" stroke-width="0.6"/><ellipse cx="10" cy="11" rx="8" ry="5" fill="url(#ei-fd)" stroke="#1a5c42" stroke-width="0.8"/><ellipse cx="9" cy="9.5" rx="5" ry="2" fill="white" opacity="0.3"/><circle cx="15" cy="10" r="1" fill="#1a5c42"/><circle cx="15.3" cy="9.7" r="0.3" fill="white"/>',
    'Fish Finder': '<defs><radialGradient id="ei-ff" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="30%" stop-color="#d8ecff"/><stop offset="60%" stop-color="#a8d0f0"/><stop offset="100%" stop-color="#78b0d8"/></radialGradient><linearGradient id="ei-ffh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4d0c8"/><stop offset="50%" stop-color="#a0a098"/><stop offset="100%" stop-color="#787870"/></linearGradient></defs><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="url(#ei-ffh)" stroke-width="3" stroke-linecap="round"/><circle cx="9" cy="9" r="6" fill="url(#ei-ff)" stroke="#1a4a6e" stroke-width="1.2"/><circle cx="9" cy="9" r="4.5" fill="none" stroke="#1a4a6e" stroke-width="0.4" opacity="0.3"/><ellipse cx="7" cy="7" rx="3.5" ry="2.5" fill="white" opacity="0.4"/>',
    'On Target': '<defs><radialGradient id="ei-ot" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ff8a8a"/><stop offset="40%" stop-color="#ef5350"/><stop offset="100%" stop-color="#b71c1c"/></radialGradient><radialGradient id="ei-otw" cx="0.4" cy="0.4" r="0.6"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8e0e0"/></radialGradient></defs><circle cx="10" cy="10" r="9" fill="url(#ei-ot)" stroke="#8b1a1a" stroke-width="0.8"/><circle cx="10" cy="10" r="7" fill="url(#ei-otw)" stroke="#c62828" stroke-width="0.3"/><circle cx="10" cy="10" r="5" fill="url(#ei-ot)" stroke="#8b1a1a" stroke-width="0.3"/><circle cx="10" cy="10" r="3" fill="url(#ei-otw)" stroke="#c62828" stroke-width="0.3"/><circle cx="10" cy="10" r="1.5" fill="url(#ei-ot)"/><ellipse cx="7.5" cy="6" rx="4" ry="2.5" fill="white" opacity="0.25"/>',
    'Virtual Aquarium': '<defs><linearGradient id="ei-va" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#d0e8ff"/><stop offset="30%" stop-color="#6aafe0"/><stop offset="70%" stop-color="#3a8ac0"/><stop offset="100%" stop-color="#1a4a6e"/></linearGradient><linearGradient id="ei-vw" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a8aaa"/><stop offset="40%" stop-color="#0d5a76"/><stop offset="100%" stop-color="#082a3e"/></linearGradient></defs><rect x="1" y="3" width="18" height="12" rx="2" fill="url(#ei-va)" stroke="#1a4a6e" stroke-width="0.8"/><line x1="2" y1="4" x2="18" y2="4" stroke="white" stroke-width="0.5" opacity="0.4"/><rect x="3" y="5" width="14" height="8" rx="1" fill="url(#ei-vw)"/><ellipse cx="7" cy="9" rx="3" ry="1.5" fill="#ffa000" opacity="0.7"/><ellipse cx="12" cy="10" rx="2" ry="1" fill="#ffa000" opacity="0.6"/><path d="M4 7 Q6 6 8 7" stroke="#5ac8e0" stroke-width="0.4" opacity="0.4" fill="none"/><rect x="7" y="15.5" width="6" height="2" rx="0.5" fill="#a0a098" stroke="#8a8680" stroke-width="0.4"/>',
    'Chicken Fingers': '<defs><radialGradient id="ei-cf" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#fffde0"/><stop offset="30%" stop-color="#ffe68a"/><stop offset="70%" stop-color="#ffc840"/><stop offset="100%" stop-color="#e8a010"/></radialGradient></defs><ellipse cx="10" cy="12" rx="6" ry="5" fill="url(#ei-cf)" stroke="#c49000" stroke-width="0.7"/><ellipse cx="8.5" cy="11" rx="3.5" ry="2" fill="white" opacity="0.2"/><circle cx="10" cy="6" r="4" fill="url(#ei-cf)" stroke="#c49000" stroke-width="0.7"/><ellipse cx="9" cy="5" rx="2.5" ry="1.5" fill="white" opacity="0.25"/><circle cx="8.5" cy="5.5" r="0.8" fill="#5d4037"/><circle cx="8.8" cy="5.2" r="0.2" fill="white"/><circle cx="11.5" cy="5.5" r="0.8" fill="#5d4037"/><circle cx="11.8" cy="5.2" r="0.2" fill="white"/><path d="M9 7.5 L10 8.5 L11 7.5" stroke="#d45500" stroke-width="0.8" fill="#e67e22"/><path d="M5 4 Q7 2 9 3" stroke="#c49000" stroke-width="0.6" fill="none"/><path d="M11 3 Q13 2 15 4" stroke="#c49000" stroke-width="0.6" fill="none"/><path d="M7 19 L8 17 L9 19" stroke="#d45500" stroke-width="0.8" fill="none" stroke-linecap="round"/><path d="M11 19 L12 17 L13 19" stroke="#d45500" stroke-width="0.8" fill="none" stroke-linecap="round"/>',
    'Notepad': '<defs><linearGradient id="ei-np" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="30%" stop-color="#f0f4ff"/><stop offset="70%" stop-color="#c8d8f0"/><stop offset="100%" stop-color="#a0b8d8"/></linearGradient></defs><path d="M3 1 L13 1 L17 5 L17 19 L3 19 Z" fill="url(#ei-np)" stroke="#4a6a8e" stroke-width="0.8"/><path d="M13 1 L13 5 L17 5" fill="#c8d8f0" stroke="#4a6a8e" stroke-width="0.5"/><rect x="3.5" y="1.5" width="9" height="2.5" fill="#4a8abe" rx="0.3"/><line x1="5.5" y1="6.5" x2="5.5" y2="18" stroke="#ef5350" stroke-width="0.4" opacity="0.6"/><line x1="6" y1="8" x2="14" y2="8" stroke="#8a9ab8" stroke-width="0.5"/><line x1="6" y1="11" x2="14" y2="11" stroke="#8a9ab8" stroke-width="0.5"/><line x1="6" y1="14" x2="11" y2="14" stroke="#8a9ab8" stroke-width="0.5"/>',
    'Calendar': '<defs><linearGradient id="ei-cl" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#d8d8d8"/></linearGradient><linearGradient id="ei-clb" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ef5350"/><stop offset="50%" stop-color="#d32f2f"/><stop offset="100%" stop-color="#b71c1c"/></linearGradient></defs><rect x="3" y="3" width="14" height="16" rx="1" fill="url(#ei-cl)" stroke="#8a8680" stroke-width="0.8"/><rect x="3" y="3" width="14" height="3.5" rx="1" fill="url(#ei-clb)"/><line x1="4" y1="3.8" x2="10" y2="3.8" stroke="white" stroke-width="0.5" opacity="0.4"/><rect x="6.5" y="1" width="1" height="3.5" rx="0.5" fill="none" stroke="#a09890" stroke-width="0.8"/><rect x="12.5" y="1" width="1" height="3.5" rx="0.5" fill="none" stroke="#a09890" stroke-width="0.8"/><circle cx="7" cy="10" r="0.6" fill="#808080"/><circle cx="10" cy="10" r="0.6" fill="#808080"/><circle cx="13" cy="10" r="0.6" fill="#808080"/><circle cx="7" cy="13" r="0.6" fill="#808080"/><circle cx="10" cy="13" r="0.6" fill="#808080"/><circle cx="13" cy="13" r="0.6" fill="#808080"/><circle cx="7" cy="16" r="0.6" fill="#808080"/><circle cx="10" cy="16" r="0.6" fill="#808080"/>',
    'Calculator': '<defs><linearGradient id="ei-ca" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#f0ece4"/><stop offset="30%" stop-color="#d8d4cc"/><stop offset="70%" stop-color="#b8b4ac"/><stop offset="100%" stop-color="#98948c"/></linearGradient><linearGradient id="ei-cal" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0f0d0"/><stop offset="100%" stop-color="#b0d098"/></linearGradient></defs><rect x="3" y="1" width="14" height="18" rx="1.5" fill="url(#ei-ca)" stroke="#787470" stroke-width="0.8"/><line x1="4" y1="2" x2="16" y2="2" stroke="white" stroke-width="0.5" opacity="0.5"/><rect x="5" y="3" width="10" height="3" rx="0.5" fill="url(#ei-cal)" stroke="#6a8a5a" stroke-width="0.5"/><rect x="10.5" y="3.3" width="4" height="0.8" rx="0.2" fill="#1a2a3a" opacity="0.6"/><rect x="5" y="8" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="9" y="8" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="13" y="8" width="2" height="2" rx="0.3" fill="#c8d8e8" stroke="#6a8a9e" stroke-width="0.4"/><rect x="5" y="12" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="9" y="12" width="2" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="13" y="12" width="2" height="2" rx="0.3" fill="#c8d8e8" stroke="#6a8a9e" stroke-width="0.4"/><rect x="5" y="16" width="6" height="2" rx="0.3" fill="#fff" stroke="#8a8680" stroke-width="0.4"/><rect x="13" y="16" width="2" height="2" rx="0.3" fill="#c8d8e8" stroke="#6a8a9e" stroke-width="0.4"/>',
    'Time Zone': '<defs><linearGradient id="ei-tz" x1="0.3" y1="0.1" x2="0.7" y2="0.9"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="50%" stop-color="#d8e8f8"/><stop offset="100%" stop-color="#a0c0e0"/></linearGradient><linearGradient id="ei-tzr" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#c8d8e8"/><stop offset="50%" stop-color="#8aa8c8"/><stop offset="100%" stop-color="#4a6a8e"/></linearGradient></defs><circle cx="10" cy="10" r="8.5" fill="url(#ei-tzr)" stroke="#2a4a6e" stroke-width="0.8"/><circle cx="10" cy="10" r="7" fill="url(#ei-tz)"/><line x1="10" y1="3.5" x2="10" y2="4.8" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><line x1="16.5" y1="10" x2="15.2" y2="10" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><line x1="10" y1="16.5" x2="10" y2="15.2" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><line x1="3.5" y1="10" x2="4.8" y2="10" stroke="#2a4a6e" stroke-width="0.7" stroke-linecap="round"/><ellipse cx="8.5" cy="7" rx="4" ry="3" fill="white" opacity="0.3"/><line x1="10" y1="10" x2="10" y2="5" stroke="#2a4a6e" stroke-width="1.2" stroke-linecap="round"/><line x1="10" y1="10" x2="14" y2="10" stroke="#2a4a6e" stroke-width="0.9" stroke-linecap="round"/><line x1="10" y1="10" x2="12.5" y2="5.5" stroke="#ef5350" stroke-width="0.5" stroke-linecap="round"/><circle cx="10" cy="10" r="0.8" fill="#2a4a6e"/><path d="M3.5 13 Q10 15.5 16.5 13" fill="none" stroke="#4a8abe" stroke-width="0.5" opacity="0.6"/><path d="M3.5 7 Q10 4.5 16.5 7" fill="none" stroke="#4a8abe" stroke-width="0.5" opacity="0.6"/>',
    'Weather': '<defs><radialGradient id="ei-we" cx="0.3" cy="0.3" r="0.7"><stop offset="0%" stop-color="#fffde0"/><stop offset="40%" stop-color="#ffe082"/><stop offset="100%" stop-color="#f9a825"/></radialGradient><radialGradient id="ei-wec" cx="0.4" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#e8e4dc"/><stop offset="100%" stop-color="#c8c4bc"/></radialGradient></defs><line x1="7" y1="1" x2="7" y2="3" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><line x1="2" y1="3" x2="3.5" y2="4.5" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><line x1="12" y1="3" x2="10.5" y2="4.5" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><line x1="1" y1="7" x2="3" y2="7" stroke="#f9a825" stroke-width="0.8" stroke-linecap="round"/><circle cx="7" cy="7" r="3.5" fill="url(#ei-we)" stroke="#c49000" stroke-width="0.7"/><ellipse cx="6" cy="5.5" rx="2" ry="1.5" fill="white" opacity="0.35"/><path d="M5 16 Q4.5 13 8 12.5 Q8 10 11 10 Q14 10 14.5 12.5 Q17.5 12.5 17.5 15 Q17.5 17.5 15 17.5 L7 17.5 Q4.5 17.5 5 16Z" fill="url(#ei-wec)" stroke="#8a8680" stroke-width="0.6"/><ellipse cx="10" cy="14" rx="4" ry="1.5" fill="white" opacity="0.3"/>',
    'Disk Usage': '<defs><linearGradient id="ei-du" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#e0dcd4"/><stop offset="30%" stop-color="#c8c4bc"/><stop offset="70%" stop-color="#a8a49c"/><stop offset="100%" stop-color="#8a8680"/></linearGradient><linearGradient id="ei-dup" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a3a3a"/><stop offset="100%" stop-color="#1a1a1a"/></linearGradient></defs><rect x="2" y="6" width="16" height="10" rx="1.5" fill="url(#ei-du)" stroke="#6a6660" stroke-width="0.8"/><line x1="3" y1="7" x2="17" y2="7" stroke="white" stroke-width="0.5" opacity="0.4"/><rect x="4" y="8" width="8" height="5" rx="0.5" fill="url(#ei-dup)" stroke="#4a4a4a" stroke-width="0.5"/><circle cx="8" cy="10.5" r="1.8" fill="none" stroke="#555" stroke-width="0.4"/><circle cx="8" cy="10.5" r="3.2" fill="none" stroke="#555" stroke-width="0.3"/><line x1="8.3" y1="10.5" x2="11.5" y2="8.5" stroke="#888" stroke-width="0.5" stroke-linecap="round"/><circle cx="8" cy="10.5" r="0.5" fill="#888"/><circle cx="15" cy="13" r="0.8" fill="#5aaa80" stroke="#2a7a52" stroke-width="0.3"/><ellipse cx="7" cy="8.5" rx="3" ry="1.5" fill="white" opacity="0.15"/>',
    'Brick Breaker': '<defs><radialGradient id="ei-bb-red" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ff8a80"/><stop offset="50%" stop-color="#ef5350"/><stop offset="100%" stop-color="#c62828"/></radialGradient><radialGradient id="ei-bb-yellow" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#ffd54f"/><stop offset="50%" stop-color="#ffc107"/><stop offset="100%" stop-color="#e8a000"/></radialGradient><radialGradient id="ei-bb-green" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#9ccc9c"/><stop offset="50%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#2e7d32"/></radialGradient><linearGradient id="ei-bb-paddle" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c8e0f8"/><stop offset="100%" stop-color="#4a8abe"/></linearGradient><radialGradient id="ei-bb-ball" cx="0.3" cy="0.3" r="0.7"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#e8e8e8"/></radialGradient></defs><rect x="2" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="7" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="12" y="2.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-red)" stroke="#b71c1c" stroke-width="0.6"/><rect x="2" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="7" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="12" y="5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-yellow)" stroke="#c67c00" stroke-width="0.6"/><rect x="2" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><rect x="7" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><rect x="12" y="7.5" width="4.5" height="2" rx="0.4" fill="url(#ei-bb-green)" stroke="#1b5e20" stroke-width="0.6"/><circle cx="10" cy="13" r="1.8" fill="url(#ei-bb-ball)" stroke="#bdbdbd" stroke-width="0.6"/><rect x="6.5" y="16" width="7" height="1.8" rx="0.5" fill="url(#ei-bb-paddle)" stroke="#1a4a6e" stroke-width="0.7"/><ellipse cx="3.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="8.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="13.5" cy="3" rx="1.5" ry="0.6" fill="white" opacity="0.35"/><ellipse cx="9.3" cy="12.3" rx="0.9" ry="0.7" fill="white" opacity="0.5"/><ellipse cx="8.5" cy="16.4" rx="2.5" ry="0.5" fill="white" opacity="0.3"/>',
    'Paint': '<defs><linearGradient id="ei-pt" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#fff3c4"/><stop offset="30%" stop-color="#ffe082"/><stop offset="70%" stop-color="#f0c050"/><stop offset="100%" stop-color="#c49000"/></linearGradient></defs><ellipse cx="10" cy="11" rx="8" ry="7" fill="url(#ei-pt)" stroke="#a07000" stroke-width="0.8"/><ellipse cx="9" cy="8" rx="5" ry="3" fill="white" opacity="0.25"/><circle cx="6" cy="9" r="1.5" fill="#ef5350"/><circle cx="9" cy="7" r="1.3" fill="#4a8abe"/><circle cx="13" cy="8" r="1.4" fill="#5aaa80"/><circle cx="14" cy="11" r="1.3" fill="#ffc107"/><circle cx="6" cy="13" r="1.2" fill="#9c27b0"/><ellipse cx="11" cy="14" rx="1" ry="0.8" fill="#ff9800"/><circle cx="5.5" cy="8.3" r="0.5" fill="white" opacity="0.5"/><circle cx="8.5" cy="6.3" r="0.4" fill="white" opacity="0.5"/><circle cx="12.5" cy="7.3" r="0.45" fill="white" opacity="0.5"/><circle cx="13.5" cy="10.3" r="0.4" fill="white" opacity="0.5"/><circle cx="5.5" cy="12.3" r="0.4" fill="white" opacity="0.5"/><circle cx="10.5" cy="13.4" r="0.35" fill="white" opacity="0.5"/><path d="M15 5 Q16 3 17 2 Q18 1.5 18 3 Q17 4 16 6 Q15 7 15 5Z" fill="#a07000" stroke="#785000" stroke-width="0.5"/>',
    'Help': '<defs><linearGradient id="ei-hp" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stop-color="#fff3c4"/><stop offset="30%" stop-color="#ffc107"/><stop offset="70%" stop-color="#e8a010"/><stop offset="100%" stop-color="#c49000"/></linearGradient><linearGradient id="ei-hpp" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="50%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#d8d8d8"/></linearGradient></defs><rect x="2" y="3" width="3" height="14" rx="0.5" fill="url(#ei-hp)" stroke="#c49000" stroke-width="0.6"/><rect x="5" y="4" width="11" height="12" rx="1" fill="url(#ei-hpp)" stroke="#8a8680" stroke-width="0.6"/><path d="M14 4 L14 8 L13.5 7 L13 8 L13 4" fill="#ef5350" stroke="#c62828" stroke-width="0.2"/><line x1="6" y1="4.5" x2="15" y2="4.5" stroke="white" stroke-width="0.5" opacity="0.5"/><path d="M9.5 8 Q9.5 6.5 11 6.5 Q12.5 6.5 12.5 8 Q12.5 9 11 9.5 L11 10.5" fill="none" stroke="#4a8abe" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11" cy="12.5" r="0.7" fill="#4a8abe"/>',
    'Search': '<defs><radialGradient id="ei-sr-lens" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="30%" stop-color="#d8ecff"/><stop offset="60%" stop-color="#a8d0f0"/><stop offset="100%" stop-color="#78b0d8"/></radialGradient><linearGradient id="ei-sr-handle" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d4d0c8"/><stop offset="50%" stop-color="#a0a098"/><stop offset="100%" stop-color="#787870"/></linearGradient></defs><line x1="13.5" y1="13.5" x2="18" y2="18" stroke="url(#ei-sr-handle)" stroke-width="3" stroke-linecap="round"/><circle cx="9" cy="9" r="6" fill="url(#ei-sr-lens)" stroke="#1a4a6e" stroke-width="1.2"/><circle cx="9" cy="9" r="4.5" fill="none" stroke="#1a4a6e" stroke-width="0.4" opacity="0.3"/><ellipse cx="7" cy="7" rx="3.5" ry="2.5" fill="white" opacity="0.4"/>',
    'Visitor Map': '<defs><radialGradient id="ei-vm" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#e0f4ff"/><stop offset="25%" stop-color="#80c8f0"/><stop offset="55%" stop-color="#4a8abe"/><stop offset="100%" stop-color="#2a6898"/></radialGradient><clipPath id="ei-vmc"><circle cx="10" cy="10" r="7.5"/></clipPath></defs><circle cx="10" cy="10" r="8" fill="url(#ei-vm)" stroke="#1a4a6e" stroke-width="1"/><g clip-path="url(#ei-vmc)" opacity="0.45"><ellipse cx="6" cy="8" rx="4" ry="3" fill="#5aaa80"/><ellipse cx="14" cy="7" rx="3" ry="2.5" fill="#5aaa80"/><ellipse cx="10" cy="14" rx="5" ry="2" fill="#5aaa80"/></g><ellipse cx="10" cy="10" rx="3.5" ry="8" fill="none" stroke="#1a4a6e" stroke-width="0.6"/><line x1="2" y1="10" x2="18" y2="10" stroke="#1a4a6e" stroke-width="0.6"/><path d="M3.5 6.5 Q10 5.5 16.5 6.5" fill="none" stroke="#1a4a6e" stroke-width="0.4"/><path d="M3.5 13.5 Q10 14.5 16.5 13.5" fill="none" stroke="#1a4a6e" stroke-width="0.4"/><ellipse cx="7.5" cy="7" rx="4" ry="3" fill="white" opacity="0.3"/><circle cx="14" cy="6" r="2" fill="#ef5350" opacity="0.8"/><path d="M14 4 L14 6.5" stroke="#c62828" stroke-width="0.8" stroke-linecap="round"/><circle cx="14" cy="4" r="0.6" fill="#c62828"/><circle cx="13.7" cy="3.8" r="0.2" fill="white" opacity="0.7"/>',
    'Stopwatch': '<defs><linearGradient id="ei-sw-rim" x1="0" y1="0" x2="0.8" y2="1"><stop offset="0%" stop-color="#c8d8e8"/><stop offset="50%" stop-color="#8aa8c8"/><stop offset="100%" stop-color="#4a6a8e"/></linearGradient><linearGradient id="ei-sw-face" x1="0.3" y1="0.1" x2="0.7" y2="0.9"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="50%" stop-color="#d8e8f8"/><stop offset="100%" stop-color="#a0c0e0"/></linearGradient></defs><rect x="8.5" y="0.5" width="3" height="2.5" rx="0.5" fill="#8aa8c8" stroke="#4a6a8e" stroke-width="0.5"/><circle cx="10" cy="11" r="7.5" fill="url(#ei-sw-rim)" stroke="#2a4a6e" stroke-width="0.8"/><circle cx="10" cy="11" r="6" fill="url(#ei-sw-face)"/><ellipse cx="8.5" cy="8" rx="3.5" ry="2.5" fill="white" opacity="0.3"/><line x1="10" y1="5.5" x2="10" y2="6.5" stroke="#2a4a6e" stroke-width="0.6" stroke-linecap="round"/><line x1="15.5" y1="11" x2="14.5" y2="11" stroke="#2a4a6e" stroke-width="0.6" stroke-linecap="round"/><line x1="10" y1="16.5" x2="10" y2="15.5" stroke="#2a4a6e" stroke-width="0.6" stroke-linecap="round"/><line x1="4.5" y1="11" x2="5.5" y2="11" stroke="#2a4a6e" stroke-width="0.6" stroke-linecap="round"/><line x1="10" y1="11" x2="10" y2="6.8" stroke="#2a4a6e" stroke-width="1" stroke-linecap="round"/><line x1="10" y1="11" x2="13.5" y2="11" stroke="#ef5350" stroke-width="0.6" stroke-linecap="round"/><circle cx="10" cy="11" r="0.7" fill="#2a4a6e"/>',
    'Sticky Notes': '<defs><linearGradient id="ei-sn" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#fff9b1"/><stop offset="50%" stop-color="#f5e87b"/><stop offset="100%" stop-color="#e8d44d"/></linearGradient></defs><rect x="2" y="2" width="14" height="14" fill="url(#ei-sn)" stroke="#c4a82b" stroke-width="0.7"/><path d="M16 2 L16 9 L12 2 Z" fill="#e8d44d" stroke="#c4a82b" stroke-width="0.5"/><path d="M16 9 Q14 10 12 9 L12 2 Z" fill="#d4c43b" stroke="#c4a82b" stroke-width="0.5" opacity="0.6"/><line x1="4" y1="6" x2="11" y2="6" stroke="#c4a82b" stroke-width="0.6" opacity="0.4"/><line x1="4" y1="9" x2="11" y2="9" stroke="#c4a82b" stroke-width="0.6" opacity="0.4"/><line x1="4" y1="12" x2="9" y2="12" stroke="#c4a82b" stroke-width="0.6" opacity="0.4"/>',
    'Voice Commands': '<rect x="7.5" y="2" width="5" height="9" rx="2.5" fill="#444"/><path d="M5.5 9v1.5a4.5 4.5 0 0 0 9 0V9" stroke="#444" stroke-width="1.2" fill="none"/><line x1="10" y1="15" x2="10" y2="18" stroke="#444" stroke-width="1.2"/><line x1="7.5" y1="18" x2="12.5" y2="18" stroke="#444" stroke-width="1.2"/>',
    'Tuning Fork': '<defs><linearGradient id="ei-tf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#d0d0d0"/><stop offset="50%" stop-color="#a0a0a0"/><stop offset="100%" stop-color="#707070"/></linearGradient></defs><path d="M7 2 L7 11 Q7 14 10 14 Q13 14 13 11 L13 2" fill="none" stroke="url(#ei-tf)" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="14" x2="10" y2="19" stroke="url(#ei-tf)" stroke-width="2" stroke-linecap="round"/><ellipse cx="7" cy="3" rx="1" ry="0.5" fill="white" opacity="0.4"/><ellipse cx="13" cy="3" rx="1" ry="0.5" fill="white" opacity="0.4"/>',
    'NEO Tracker': '<defs><radialGradient id="ei-neo" cx="0.35" cy="0.35" r="0.65"><stop offset="0%" stop-color="#d0c8b8"/><stop offset="50%" stop-color="#a09080"/><stop offset="100%" stop-color="#706050"/></radialGradient></defs><circle cx="10" cy="10" r="4.5" fill="url(#ei-neo)" stroke="#504030" stroke-width="0.8"/><ellipse cx="8.5" cy="8" rx="2.5" ry="1.5" fill="white" opacity="0.3"/><circle cx="12" cy="8.5" r="0.8" fill="#504030" opacity="0.5"/><circle cx="8" cy="11" r="0.6" fill="#504030" opacity="0.4"/><line x1="5" y1="5" x2="3" y2="3" stroke="#a08060" stroke-width="0.6" stroke-linecap="round"/><line x1="15" y1="5" x2="17" y2="3" stroke="#a08060" stroke-width="0.6" stroke-linecap="round"/><line x1="5" y1="15" x2="3" y2="17" stroke="#a08060" stroke-width="0.6" stroke-linecap="round"/><line x1="15" y1="15" x2="17" y2="17" stroke="#a08060" stroke-width="0.6" stroke-linecap="round"/><circle cx="3" cy="3" r="0.5" fill="#c0a080"/><circle cx="17" cy="3" r="0.4" fill="#c0a080"/><circle cx="3" cy="17" r="0.3" fill="#c0a080"/><circle cx="17" cy="17" r="0.4" fill="#c0a080"/>',
    'Fractal Explorer': '<defs><radialGradient id="ei-fr" cx="0.4" cy="0.4" r="0.65"><stop offset="0%" stop-color="#a0d0ff"/><stop offset="40%" stop-color="#4a8abe"/><stop offset="70%" stop-color="#2a5a8e"/><stop offset="100%" stop-color="#1a2a4e"/></radialGradient></defs><circle cx="10" cy="10" r="8.5" fill="url(#ei-fr)" stroke="#1a2a4e" stroke-width="0.8"/><ellipse cx="8" cy="7.5" rx="4" ry="3" fill="white" opacity="0.2"/><path d="M10 10 Q12 6 10 4 Q8 6 10 10 Q14 8 16 10 Q14 12 10 10 Q8 14 10 16 Q12 14 10 10 Q6 12 4 10 Q6 8 10 10Z" fill="none" stroke="#c0e0ff" stroke-width="0.7" opacity="0.8"/><circle cx="10" cy="10" r="2.5" fill="none" stroke="#80b0e0" stroke-width="0.5"/><circle cx="10" cy="10" r="5" fill="none" stroke="#6090c0" stroke-width="0.4" opacity="0.6"/><circle cx="10" cy="10" r="1" fill="#e0f0ff"/>',
    'Slot Machine': '<defs><linearGradient id="ei-sm" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#e8d060"/><stop offset="30%" stop-color="#c8a030"/><stop offset="70%" stop-color="#a08020"/><stop offset="100%" stop-color="#806010"/></linearGradient><linearGradient id="ei-smf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f0f8ff"/><stop offset="100%" stop-color="#d8e8f8"/></linearGradient></defs><rect x="2" y="1" width="16" height="18" rx="2" fill="url(#ei-sm)" stroke="#604800" stroke-width="0.8"/><line x1="3" y1="2" x2="17" y2="2" stroke="white" stroke-width="0.5" opacity="0.4"/><rect x="4" y="4" width="4" height="6" rx="0.5" fill="url(#ei-smf)" stroke="#604800" stroke-width="0.5"/><rect x="8.5" y="4" width="4" height="6" rx="0.5" fill="url(#ei-smf)" stroke="#604800" stroke-width="0.5"/><rect x="13" y="4" width="4" height="6" rx="0.5" fill="url(#ei-smf)" stroke="#604800" stroke-width="0.5"/><text x="6" y="8.5" font-size="4" font-weight="bold" fill="#ef5350" text-anchor="middle" font-family="sans-serif">7</text><text x="10.5" y="8.5" font-size="4" font-weight="bold" fill="#ef5350" text-anchor="middle" font-family="sans-serif">7</text><text x="15" y="8.5" font-size="4" font-weight="bold" fill="#ef5350" text-anchor="middle" font-family="sans-serif">7</text><rect x="7" y="13" width="6" height="3" rx="1" fill="#ef5350" stroke="#b71c1c" stroke-width="0.5"/><ellipse cx="10" cy="14.5" rx="2" ry="0.8" fill="white" opacity="0.3"/>',
    'Cryptography': '<defs><linearGradient id="ei-cr" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#f0ece4"/><stop offset="30%" stop-color="#d8d4cc"/><stop offset="70%" stop-color="#b0ac9c"/><stop offset="100%" stop-color="#908878"/></linearGradient></defs><rect x="3" y="5" width="14" height="12" rx="1.5" fill="url(#ei-cr)" stroke="#6a6050" stroke-width="0.8"/><rect x="5" y="8" width="10" height="7" rx="1" fill="#f8f4e8" stroke="#8a8070" stroke-width="0.5"/><line x1="6" y1="10" x2="14" y2="10" stroke="#c0b8a0" stroke-width="0.5"/><line x1="6" y1="12" x2="12" y2="12" stroke="#c0b8a0" stroke-width="0.5"/><circle cx="10" cy="4" r="3" fill="none" stroke="#8a8070" stroke-width="1.5"/><rect x="9" y="4" width="2" height="4" rx="0.5" fill="#b0a890" stroke="#8a8070" stroke-width="0.5"/><circle cx="10" cy="6.5" r="0.8" fill="#6a6050"/>',
    'Reverb': '<defs><linearGradient id="ei-rv" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#4a4a5a"/><stop offset="30%" stop-color="#2a2a3a"/><stop offset="100%" stop-color="#1a1a2a"/></linearGradient></defs><rect x="1" y="4" width="18" height="14" rx="1" fill="url(#ei-rv)" stroke="#505068" stroke-width="0.7"/><line x1="2" y1="5" x2="18" y2="5" stroke="white" stroke-width="0.4" opacity="0.15"/><path d="M3 11 Q5 7 7 11 Q9 15 11 11 Q13 7 15 11 Q17 15 18 11" fill="none" stroke="#8888ff" stroke-width="1.2" opacity="0.8"/><circle cx="5" cy="15" r="1.2" fill="#c8a840" stroke="#6a5010" stroke-width="0.5"/><circle cx="15" cy="15" r="1.2" fill="#c8a840" stroke="#6a5010" stroke-width="0.5"/>',
    'Sound Producer': '<defs><linearGradient id="ei-sp" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#3a4a5a"/><stop offset="30%" stop-color="#2a3a4a"/><stop offset="100%" stop-color="#1a2a3a"/></linearGradient></defs><rect x="1" y="4" width="18" height="14" rx="1" fill="url(#ei-sp)" stroke="#405060" stroke-width="0.7"/><line x1="2" y1="5" x2="18" y2="5" stroke="white" stroke-width="0.4" opacity="0.15"/><path d="M3 11 L5 8 L7 13 L9 9 L11 12 L13 7 L15 14 L17 11" fill="none" stroke="#66bbff" stroke-width="1" opacity="0.9"/><circle cx="5" cy="15.5" r="1" fill="#66bb6a" stroke="#2e7d32" stroke-width="0.4"/><circle cx="10" cy="15.5" r="1" fill="#ef5350" stroke="#b71c1c" stroke-width="0.4"/><circle cx="15" cy="15.5" r="1" fill="#ffc107" stroke="#c49000" stroke-width="0.4"/>',
    'Photo Booth': '<defs><linearGradient id="ei-pb" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#e0dcd4"/><stop offset="30%" stop-color="#c8c4bc"/><stop offset="70%" stop-color="#a8a49c"/><stop offset="100%" stop-color="#8a8680"/></linearGradient><radialGradient id="ei-pbl" cx="0.5" cy="0.5" r="0.5"><stop offset="0%" stop-color="#a0d0ff"/><stop offset="50%" stop-color="#4a8abe"/><stop offset="100%" stop-color="#1a4a6e"/></radialGradient></defs><rect x="2" y="4" width="16" height="12" rx="1.5" fill="url(#ei-pb)" stroke="#6a6660" stroke-width="0.8"/><line x1="3" y1="5" x2="17" y2="5" stroke="white" stroke-width="0.5" opacity="0.4"/><circle cx="10" cy="10.5" r="4" fill="url(#ei-pbl)" stroke="#1a4a6e" stroke-width="0.8"/><circle cx="10" cy="10.5" r="2.5" fill="none" stroke="#1a4a6e" stroke-width="0.4" opacity="0.5"/><circle cx="10" cy="10.5" r="1.2" fill="#a0d0ff" opacity="0.6"/><ellipse cx="8.5" cy="8.5" rx="2" ry="1.2" fill="white" opacity="0.3"/><rect x="14" y="5.5" width="2" height="1.5" rx="0.3" fill="#333" opacity="0.5"/>',
    'White Noise Mixer': '<defs><linearGradient id="ei-nm" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stop-color="#484848"/><stop offset="30%" stop-color="#2a2a2a"/><stop offset="100%" stop-color="#1a1a1a"/></linearGradient><linearGradient id="ei-nmf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#e0e0e0"/><stop offset="100%" stop-color="#a0a0a0"/></linearGradient></defs><rect x="1" y="4" width="18" height="14" rx="1" fill="url(#ei-nm)" stroke="#606060" stroke-width="0.7"/><line x1="2" y1="5" x2="18" y2="5" stroke="white" stroke-width="0.4" opacity="0.15"/><rect x="3" y="7" width="1.5" height="8" rx="0.3" fill="#333" stroke="#555" stroke-width="0.3"/><rect x="3.2" y="8" width="1.1" height="1.2" rx="0.2" fill="url(#ei-nmf)"/><rect x="3" y="14" width="1.5" height="1" rx="0.2" fill="#4caf50"/><rect x="6.5" y="7" width="1.5" height="8" rx="0.3" fill="#333" stroke="#555" stroke-width="0.3"/><rect x="6.7" y="10" width="1.1" height="1.2" rx="0.2" fill="url(#ei-nmf)"/><rect x="6.5" y="14" width="1.5" height="1" rx="0.2" fill="#4caf50" opacity="0.7"/><rect x="10" y="7" width="1.5" height="8" rx="0.3" fill="#333" stroke="#555" stroke-width="0.3"/><rect x="10.2" y="11" width="1.1" height="1.2" rx="0.2" fill="url(#ei-nmf)"/><rect x="10" y="14" width="1.5" height="1" rx="0.2" fill="#4caf50" opacity="0.5"/><rect x="13.5" y="7" width="1.5" height="8" rx="0.3" fill="#333" stroke="#555" stroke-width="0.3"/><rect x="13.7" y="9" width="1.1" height="1.2" rx="0.2" fill="url(#ei-nmf)"/><rect x="13.5" y="14" width="1.5" height="1" rx="0.2" fill="#4caf50" opacity="0.8"/>'
  };
  return icons[name] || '';
}

/* ── Formatting helpers ── */
function padTwo(n) { return n < 10 ? '0' + n : String(n); }

/* Cached format settings — refreshed via mpRefreshFormatCache() */
let cachedDateFmt = localStorage.getItem('mp-datefmt') || 'mdy';
let cachedTempUnit = localStorage.getItem('mp-tempunit') || 'C';
function mpRefreshFormatCache() {
  cachedDateFmt = localStorage.getItem('mp-datefmt') || 'mdy';
  cachedTempUnit = localStorage.getItem('mp-tempunit') || 'C';
}
window.mpRefreshFormatCache = mpRefreshFormatCache;

function mpFormatDate(date) {
  const mm = padTwo(date.getMonth() + 1);
  const dd = padTwo(date.getDate());
  const yyyy = date.getFullYear();
  if (cachedDateFmt === 'dmy') return `${dd}/${mm}/${yyyy}`;
  if (cachedDateFmt === 'ymd') return `${yyyy}-${mm}-${dd}`;
  return `${mm}/${dd}/${yyyy}`;
}

function mpFormatTemp(celsius) {
  if (cachedTempUnit === 'F') {
    return Math.round(celsius * 9 / 5 + 32) + '\u00b0F';
  }
  return Math.round(celsius) + '\u00b0C';
}

function mpFormatTempShort(celsius) {
  if (cachedTempUnit === 'F') {
    return Math.round(celsius * 9 / 5 + 32) + '\u00b0';
  }
  return Math.round(celsius) + '\u00b0';
}

/* ── Data-file lazy loader ── */
const dataScripts = {};
function loadDataScript(src) {
  if (!dataScripts[src]) {
    dataScripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return dataScripts[src];
}

/* ── YouTube API lazy loader ── */
function loadYouTubeAPI() {
  return new Promise(resolve => {
    if (window.YT && window.YT.Player) { resolve(); return; }
    window.onYouTubeIframeAPIReady = resolve;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
}

/* ── Loading message helper ── */
function showLoadingMessage(container, text) {
  container.textContent = '';
  const msg = document.createElement('div');
  msg.className = 'loading-msg';
  msg.textContent = text;
  container.appendChild(msg);
}

/* ── Version ── */
let MPOS_VERSION = '2.4';
(async () => {
  try {
    const r = await fetch('version.json');
    const d = await r.json();
    if (d?.version) MPOS_VERSION = d.version;
  } catch { /* version.json unavailable */ }
})();

/* ── Button click sound ── */
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn, .start-btn, .titlebar-btn, .project-list li')) {
    if (window.mpAudio) window.mpAudio.playSound('click');
  }
});

/* ── Export public API ── */
window.openWindow = openWindow;
window.closeStartMenu = closeStartMenu;
window.mpConfirm = mpConfirm;
window.alertTriangleSVG = alertTriangleSVG;
window.showErrorPanel = showErrorPanel;
window.getLocation = getLocation;
window.itemName = itemName;
window.itemDesc = itemDesc;
window.getItemIcon = getItemIcon;
window.padTwo = padTwo;
window.mpFormatDate = mpFormatDate;
window.mpFormatTemp = mpFormatTemp;
window.mpFormatTempShort = mpFormatTempShort;
window.loadDataScript = loadDataScript;
window.loadYouTubeAPI = loadYouTubeAPI;
window.showLoadingMessage = showLoadingMessage;
window.MPOS_VERSION = MPOS_VERSION;
// Make MPOS_VERSION stay in sync after fetch
Object.defineProperty(window, 'MPOS_VERSION', {
  get: () => MPOS_VERSION,
  set: (v) => { MPOS_VERSION = v; },
  configurable: true
});

/* ── Global tooltip system (Win2000 style) ── */
const tipEl = document.createElement('div');
tipEl.id = 'mpTooltip';
document.body.appendChild(tipEl);

let tipTarget = null;
let tipTimer = null;

document.addEventListener('mouseover', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  tipTarget = el;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    tipEl.textContent = text;
    tipEl.style.display = 'block';
    const x = Math.min(e.clientX + 12, window.innerWidth - tipEl.offsetWidth - 4);
    const y = e.clientY + 20;
    tipEl.style.left = x + 'px';
    tipEl.style.top = (y + tipEl.offsetHeight > window.innerHeight ? e.clientY - tipEl.offsetHeight - 4 : y) + 'px';
  }, 400);
}, true);

document.addEventListener('mousemove', (e) => {
  if (tipEl.style.display !== 'block') return;
  const x = Math.min(e.clientX + 12, window.innerWidth - tipEl.offsetWidth - 4);
  const y = e.clientY + 20;
  tipEl.style.left = x + 'px';
  tipEl.style.top = (y + tipEl.offsetHeight > window.innerHeight ? e.clientY - tipEl.offsetHeight - 4 : y) + 'px';
}, true);

document.addEventListener('mouseout', (e) => {
  if (!tipTarget) return;
  if (tipTarget.contains(e.relatedTarget)) return;
  clearTimeout(tipTimer);
  tipEl.style.display = 'none';
  tipTarget = null;
}, true);

})();
