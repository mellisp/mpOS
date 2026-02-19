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
    { city: 'London',      zone: 'Europe/London' },
    { city: 'New York',    zone: 'America/New_York' },
    { city: 'Los Angeles', zone: 'America/Los_Angeles' },
    { city: 'Tokyo',       zone: 'Asia/Tokyo' },
    { city: 'Sydney',      zone: 'Australia/Sydney' },
    { city: 'Dubai',       zone: 'Asia/Dubai' },
    { city: 'Paris',       zone: 'Europe/Paris' },
    { city: 'Singapore',   zone: 'Asia/Singapore' }
  ];

  let tzGridEl = null;
  let tzAnalog = true;
  let tzTimer = null;
  let tzBuilt = false;
  const tzRefs = { h: [], m: [], s: [], d: [], o: [] };

  const openTimeZone = () => {
    openWindow('timezone');
    if (!tzGridEl) tzGridEl = document.getElementById('tzGrid');
    if (!tzBuilt) { tzBuildGrid(); tzBuilt = true; }
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
      const sHand = svgEl('line', { id: `tzS${i}`, x1: '32', y1: '38', x2: '32', y2: '8', stroke: 'var(--error)', 'stroke-width': '0.7', 'stroke-linecap': 'round' });
      svg.appendChild(sHand);
      // Center dot
      svg.appendChild(svgEl('circle', { cx: '32', cy: '32', r: '1.5', fill: 'var(--dk-shadow)' }));

      face.appendChild(svg);
      tile.appendChild(face);

      const digital = document.createElement('span');
      digital.className = 'tz-digital';
      digital.id = `tzD${i}`;
      tile.appendChild(digital);

      const cityEl = document.createElement('div');
      cityEl.className = 'tz-city';
      cityEl.textContent = c.city;
      tile.appendChild(cityEl);

      const offsetEl = document.createElement('div');
      offsetEl.className = 'tz-offset';
      offsetEl.id = `tzO${i}`;
      tile.appendChild(offsetEl);

      // Cache element refs for tzTick() hot path
      tzRefs.h[i] = hHand;
      tzRefs.m[i] = mHand;
      tzRefs.s[i] = sHand;
      tzRefs.d[i] = digital;
      tzRefs.o[i] = offsetEl;

      frag.appendChild(tile);
    }

    tzGridEl.textContent = '';
    tzGridEl.appendChild(frag);
  };

  const tzUtcOpts = { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false };
  const tzCityOpts = TZ_CITIES.map((c) => ({
    timeZone: c.zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }));

  const tzTick = () => {
    const now = new Date();
    // Compute UTC time once outside the loop
    const utcStr = now.toLocaleString('en-GB', tzUtcOpts);
    const utcParts = utcStr.split(':');
    const utcH = parseInt(utcParts[0], 10);
    const utcM = parseInt(utcParts[1], 10);
    const utcTotal = utcH * 60 + utcM;

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
      tzRefs.o[i].textContent = `UTC${sign}${offH}${offM ? `:${String(offM).padStart(2, '0')}` : ''}`;
    }
  };

  const tzToggleView = () => {
    tzAnalog = !tzAnalog;
    tzGridEl.classList.toggle('tz-digital-mode', !tzAnalog);
    const btn = document.querySelector('.tz-toggle');
    btn.textContent = tzAnalog ? 'Digital' : 'Analog';
    tzTick();
  };

  /* ── Registration ── */

  window.mpRegisterActions({ openCalendar, openTimeZone });
  window.mpRegisterWindows({ calendar: 'Calendar', timezone: 'Time Zone' });
  window.mpRegisterCloseHandlers({ timezone: closeTimeZone });

  /* ── Language change refresh ── */
  const calendarRefreshOnLangChange = () => {
    const el = document.getElementById('calendar');
    if (el && el.style.display !== 'none') calendarRender();
  };

  /* ── Global exports (for inline onclick handlers) ── */

  window.openCalendar = openCalendar;
  window.calendarPrev = calendarPrev;
  window.calendarNext = calendarNext;
  window.calendarToday = calendarToday;
  window.openTimeZone = openTimeZone;
  window.closeTimeZone = closeTimeZone;
  window.tzToggleView = tzToggleView;
  window.calendarRefreshOnLangChange = calendarRefreshOnLangChange;

})();
