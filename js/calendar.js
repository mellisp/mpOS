(function () {
  'use strict';

  const { openWindow, t, mpTaskbar } = window;

  /* ── Calendar ── */

  let calYear, calMonth, calTitleEl, calGridEl;

  const openCalendar = () => {
    openWindow('calendar');
    if (!calTitleEl) {
      calTitleEl = document.getElementById('calTitle');
      calGridEl = document.getElementById('calGrid');
      const now = new Date();
      calYear = now.getFullYear();
      calMonth = now.getMonth();
    }
    calendarRender();
  };

  const calendarRender = () => {
    calTitleEl.textContent = `${t(`cal.months.${calMonth}`)} ${calYear}`;

    const frag = document.createDocumentFragment();
    const dayNames = [];
    for (let di = 0; di < 7; di++) dayNames.push(t(`cal.days.${di}`));
    for (let i = 0; i < 7; i++) {
      const hdr = document.createElement('div');
      hdr.className = 'cal-day-header';
      hdr.textContent = dayNames[i];
      frag.appendChild(hdr);
    }

    const firstOfMonth = new Date(calYear, calMonth, 1);
    const dow = firstOfMonth.getDay();
    const startOffset = (dow + 6) % 7;
    const startDate = new Date(calYear, calMonth, 1 - startOffset);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 7; c++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + r * 7 + c);
        const cell = document.createElement('div');
        cell.className = 'cal-day';
        if (d.getMonth() !== calMonth) cell.className += ' other-month';
        if (`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayStr) cell.className += ' today';
        cell.textContent = d.getDate();
        cell.dataset.date = d.toISOString().slice(0, 10);
        cell.tabIndex = 0;
        cell.setAttribute('role', 'gridcell');
        cell.style.cursor = 'pointer';
        frag.appendChild(cell);
      }
    }

    calGridEl.textContent = '';
    calGridEl.appendChild(frag);
  };

  const calendarPrev = () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    calendarRender();
  };

  const calendarNext = () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    calendarRender();
  };

  const calendarToday = () => {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    calendarRender();
  };

  /* ── Time Zone ── */

  const TZ_CITIES = [
    { city: 'London',      short: 'LON', zone: 'Europe/London' },
    { city: 'New York',    short: 'NYC', zone: 'America/New_York' },
    { city: 'Los Angeles', short: 'LAX', zone: 'America/Los_Angeles' },
    { city: 'Tokyo',       short: 'TYO', zone: 'Asia/Tokyo' },
    { city: 'Sydney',      short: 'SYD', zone: 'Australia/Sydney' },
    { city: 'Dubai',       short: 'DXB', zone: 'Asia/Dubai' },
    { city: 'Paris',       short: 'PAR', zone: 'Europe/Paris' },
    { city: 'Singapore',   short: 'SIN', zone: 'Asia/Singapore' }
  ];

  const TZ_DOT_COLORS = {
    day: '#b08020', night: '#6878a0'
  };

  let tzGridEl = null;
  let tzAnalog = true;
  let tzTimer = null;
  let tzBuilt = false;
  const tzRefs = { h: [], m: [], s: [], d: [], o: [], date: [], ind: [], tlDot: [] };
  let tzLocalEl = null;
  let tzTimelineEl = null;
  let tzStatusEl = null;

  const tzGetPhase = (hour) => {
    if (hour >= 6 && hour <= 17) return 'day';
    return 'night';
  };

  const openTimeZone = () => {
    openWindow('timezone');
    if (!tzGridEl) {
      tzGridEl = document.getElementById('tzGrid');
      tzLocalEl = document.getElementById('tzLocal');
      tzTimelineEl = document.getElementById('tzTimeline');
      tzStatusEl = document.getElementById('tzStatus');
    }
    if (!tzBuilt) { tzBuildGrid(); tzBuildTimeline(); tzBuilt = true; }
    if (!tzTimer) tzTimer = setInterval(tzTick, 1000);
    tzTick();
  };

  const closeTimeZone = () => {
    if (tzTimer) { clearInterval(tzTimer); tzTimer = null; }
    mpTaskbar.closeWindow('timezone');
  };

  const tzBuildGrid = () => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const frag = document.createDocumentFragment();

    const svgEl = (tag, attrs) => {
      const el = document.createElementNS(SVG_NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    };

    for (let i = 0; i < TZ_CITIES.length; i++) {
      const c = TZ_CITIES[i];

      const tile = document.createElement('div');
      tile.className = 'tz-tile';

      const face = document.createElement('div');
      face.className = 'tz-clock-face';

      const svg = svgEl('svg', { viewBox: '0 0 64 64' });
      svg.appendChild(svgEl('circle', { cx: '32', cy: '32', r: '31', fill: '#fff' }));

      // Tick marks
      for (let h = 0; h < 12; h++) {
        const rad = h * 30 * Math.PI / 180;
        const isQuarter = h % 3 === 0;
        const inner = isQuarter ? 24 : 26;
        svg.appendChild(svgEl('line', {
          x1: String(32 + inner * Math.sin(rad)),
          y1: String(32 - inner * Math.cos(rad)),
          x2: String(32 + 29 * Math.sin(rad)),
          y2: String(32 - 29 * Math.cos(rad)),
          stroke: 'var(--dk-shadow)', 'stroke-width': isQuarter ? '1.5' : '0.7'
        }));
      }

      // Hour hand
      const hHand = svgEl('line', { id: `tzH${i}`, x1: '32', y1: '32', x2: '32', y2: '16', stroke: 'var(--dk-shadow)', 'stroke-width': '2', 'stroke-linecap': 'round' });
      svg.appendChild(hHand);
      // Minute hand
      const mHand = svgEl('line', { id: `tzM${i}`, x1: '32', y1: '32', x2: '32', y2: '10', stroke: 'var(--dk-shadow)', 'stroke-width': '1.2', 'stroke-linecap': 'round' });
      svg.appendChild(mHand);
      // Second hand
      const sHand = svgEl('line', { id: `tzS${i}`, x1: '32', y1: '38', x2: '32', y2: '8', stroke: '#c03020', 'stroke-width': '0.7', 'stroke-linecap': 'round' });
      svg.appendChild(sHand);
      // Center dot
      svg.appendChild(svgEl('circle', { cx: '32', cy: '32', r: '1.5', fill: 'var(--dk-shadow)' }));

      face.appendChild(svg);
      tile.appendChild(face);

      const digital = document.createElement('span');
      digital.className = 'tz-digital';
      digital.id = `tzD${i}`;
      tile.appendChild(digital);

      /* Day/night indicator dot (inline with city name) */
      const indicator = document.createElement('span');
      indicator.className = 'tz-indicator';

      const cityEl = document.createElement('div');
      cityEl.className = 'tz-city';
      cityEl.appendChild(indicator);
      cityEl.appendChild(document.createTextNode(c.city));
      tile.appendChild(cityEl);

      const offsetEl = document.createElement('div');
      offsetEl.className = 'tz-offset';
      offsetEl.id = `tzO${i}`;
      tile.appendChild(offsetEl);

      const dateEl = document.createElement('div');
      dateEl.className = 'tz-date';
      tile.appendChild(dateEl);

      // Cache element refs for tzTick() hot path
      tzRefs.h[i] = hHand;
      tzRefs.m[i] = mHand;
      tzRefs.s[i] = sHand;
      tzRefs.d[i] = digital;
      tzRefs.o[i] = offsetEl;
      tzRefs.date[i] = dateEl;
      tzRefs.ind[i] = indicator;

      frag.appendChild(tile);
    }

    tzGridEl.textContent = '';
    tzGridEl.appendChild(frag);
    tzStatusEl.textContent = t('tz.cities', { count: TZ_CITIES.length });
  };

  const tzBuildTimeline = () => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < TZ_CITIES.length; i++) {
      const marker = document.createElement('div');
      marker.className = 'tz-tl-marker';

      const dot = document.createElement('div');
      dot.className = 'tz-tl-dot';
      marker.appendChild(dot);

      const label = document.createElement('div');
      label.className = 'tz-tl-label';
      label.textContent = TZ_CITIES[i].short;
      marker.appendChild(label);

      tzRefs.tlDot[i] = dot;
      frag.appendChild(marker);
    }
    tzTimelineEl.appendChild(frag);
  };

  const tzLocalOpts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZoneName: 'short' };
  const tzUtcOpts = { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false };
  const tzCityOpts = TZ_CITIES.map((c) => ({
    timeZone: c.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }));
  const tzDateOpts = TZ_CITIES.map((c) => ({
    timeZone: c.zone, year: 'numeric', month: '2-digit', day: '2-digit'
  }));
  const tzLocalDateOpts = { year: 'numeric', month: '2-digit', day: '2-digit' };

  const tzTick = () => {
    const now = new Date();

    // Update local time header
    tzLocalEl.textContent = now.toLocaleString('en-GB', tzLocalOpts);

    // Compute UTC time once outside the loop
    const utcStr = now.toLocaleString('en-GB', tzUtcOpts);
    const utcParts = utcStr.split(':');
    const utcH = parseInt(utcParts[0], 10);
    const utcM = parseInt(utcParts[1], 10);
    const utcTotal = utcH * 60 + utcM;

    // Local date for comparison
    const localDateStr = now.toLocaleString('en-GB', tzLocalDateOpts);

    // Track offsets for timeline positioning
    const offsets = [];

    for (let i = 0; i < TZ_CITIES.length; i++) {
      const parts = now.toLocaleString('en-GB', tzCityOpts[i]).split(':');
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const s = parseInt(parts[2], 10);

      // Analog hands
      tzRefs.h[i].style.transform = `rotate(${(h % 12) * 30 + m * 0.5}deg)`;
      tzRefs.m[i].style.transform = `rotate(${m * 6 + s * 0.1}deg)`;
      tzRefs.s[i].style.transform = `rotate(${s * 6}deg)`;

      // Digital
      tzRefs.d[i].textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      // Offset
      let diff = (h * 60 + m) - utcTotal;
      if (diff > 720) diff -= 1440;
      if (diff < -720) diff += 1440;
      const sign = diff >= 0 ? '+' : '-';
      const absDiff = Math.abs(diff);
      const offH = Math.floor(absDiff / 60);
      const offM = absDiff % 60;
      const offsetHours = diff / 60;
      offsets.push(offsetHours);
      tzRefs.o[i].textContent = `UTC${sign}${offH}${offM ? `:${String(offM).padStart(2, '0')}` : ''}`;

      // Day/night indicator dot
      const phase = tzGetPhase(h);
      tzRefs.ind[i].style.background = TZ_DOT_COLORS[phase];

      // Timeline dot color
      if (tzRefs.tlDot[i]) tzRefs.tlDot[i].style.background = TZ_DOT_COLORS[phase];

      // Date comparison
      const cityDateStr = now.toLocaleString('en-GB', tzDateOpts[i]);
      const dateEl = tzRefs.date[i];
      if (cityDateStr !== localDateStr) {
        // Determine if tomorrow or yesterday by comparing date parts
        const [ld, lm, ly] = localDateStr.split('/').map(Number);
        const [cd, cm, cy] = cityDateStr.split('/').map(Number);
        const localD = new Date(ly, lm - 1, ld);
        const cityD = new Date(cy, cm - 1, cd);
        if (cityD > localD) {
          dateEl.textContent = t('tz.tomorrow');
          dateEl.className = 'tz-date tz-date-tomorrow';
        } else {
          dateEl.textContent = t('tz.yesterday');
          dateEl.className = 'tz-date tz-date-yesterday';
        }
      } else {
        dateEl.textContent = '';
        dateEl.className = 'tz-date';
      }
    }

    // Position timeline markers
    tzUpdateTimeline(offsets);
  };

  const tzUpdateTimeline = (offsets) => {
    const markers = tzTimelineEl.querySelectorAll('.tz-tl-marker');
    const minOff = Math.min(...offsets);
    const maxOff = Math.max(...offsets);
    const range = maxOff - minOff || 1;
    for (let i = 0; i < offsets.length; i++) {
      const pct = ((offsets[i] - minOff) / range) * 90 + 5; // 5-95% range
      markers[i].style.left = `${pct}%`;
    }
  };

  const tzToggleView = () => {
    tzAnalog = !tzAnalog;
    tzGridEl.classList.toggle('tz-digital-mode', !tzAnalog);
    const btn = document.querySelector('.tz-toggle');
    btn.textContent = tzAnalog ? t('tz.digital') : t('tz.analog');
    tzTick();
  };

  /* ── Click date to open Notepad ── */
  const calClickDate = (cell) => {
    const dateStr = cell.dataset.date;
    if (!dateStr || !window.notepadOpenWithContent) return;
    window.notepadOpenWithContent(dateStr, '');
  };

  /* ── Delegated listeners ── */
  document.getElementById('calendar').addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]');
    if (act) {
      const actions = { calendarPrev, calendarNext, calendarToday };
      const fn = actions[act.dataset.action];
      if (fn) fn();
      return;
    }
    const dayCell = e.target.closest('.cal-day');
    if (dayCell) calClickDate(dayCell);
  });

  /* ── Keyboard navigation ── */
  document.getElementById('calendar').addEventListener('keydown', (e) => {
    const cells = calGridEl ? [...calGridEl.querySelectorAll('.cal-day')] : [];
    if (!cells.length) return;
    const idx = cells.indexOf(document.activeElement);
    if (idx === -1) return;
    let next = -1;
    if (e.key === 'ArrowRight') next = idx + 1;
    else if (e.key === 'ArrowLeft') next = idx - 1;
    else if (e.key === 'ArrowDown') next = idx + 7;
    else if (e.key === 'ArrowUp') next = idx - 7;
    else if (e.key === 'Enter') { calClickDate(cells[idx]); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    if (next >= 0 && next < cells.length) cells[next].focus();
    else if (next < 0) { calendarPrev(); setTimeout(() => { const c = [...calGridEl.querySelectorAll('.cal-day')]; if (c.length) c[c.length - 1].focus(); }, 50); }
    else { calendarNext(); setTimeout(() => { const c = [...calGridEl.querySelectorAll('.cal-day')]; if (c.length) c[0].focus(); }, 50); }
  });

  document.getElementById('timezone').addEventListener('click', (e) => {
    const act = e.target.closest('[data-action]');
    if (act && act.dataset.action === 'tzToggleView') tzToggleView();
  });

  /* ── Registration ── */

  window.mpRegisterActions({ openCalendar, openTimeZone });
  window.mpRegisterWindows({ calendar: 'Calendar', timezone: 'Time Zone' });
  window.mpRegisterCloseHandlers({ timezone: closeTimeZone });

  /* ── Language change refresh ── */
  const calendarRefreshOnLangChange = () => {
    const el = document.getElementById('calendar');
    if (el && el.style.display !== 'none') calendarRender();
    const tzEl = document.getElementById('timezone');
    if (tzEl && tzEl.style.display !== 'none') {
      const btn = document.querySelector('.tz-toggle');
      if (btn) btn.textContent = tzAnalog ? t('tz.digital') : t('tz.analog');
      if (tzStatusEl) tzStatusEl.textContent = t('tz.cities', { count: TZ_CITIES.length });
    }
  };

  /* ── Exports ── */
  window.openCalendar = openCalendar;
  window.openTimeZone = openTimeZone;
  window.calendarRefreshOnLangChange = calendarRefreshOnLangChange;

})();
