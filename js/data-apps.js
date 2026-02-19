/* Data Apps — NEO Tracker, Visitor Map, Task Manager */
(function () {
'use strict';

/* ═══════════════════════════════════════════════════════════
   NEO Tracker — Near-Earth Object approach data from NASA
   ═══════════════════════════════════════════════════════════ */

const neoState = { data: null, sortCol: 2, sortAsc: true, selectedIdx: -1 };

function openNeoTracker() {
  openWindow('neotracker');
  if (!neoState.data) fetchNeoData();
}

async function fetchNeoData(force) {
  if (force) { neoState.data = null; neoState.selectedIdx = -1; }
  const body = document.getElementById('neotrackerBody');
  const status = document.getElementById('neotrackerStatus');
  showLoadingMessage(body, t('neo.loading'));

  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 7);
  const startStr = today.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  try {
    const r = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${startStr}&end_date=${endStr}&api_key=DEMO_KEY`);
    if (!r.ok) throw new Error('API error');
    const data = await r.json();
    neoState.data = flattenNeoData(data);
    neoState.selectedIdx = -1;
    sortNeoData(neoState.data, neoState.sortCol, neoState.sortAsc);
    renderNeoData(body, neoState.data);
    status.textContent = t('neo.poweredBy');
  } catch {
    showErrorPanel(body, t('neo.error'), 'al-tri-neo');
  }
}

function flattenNeoData(apiResponse) {
  const neosByDate = apiResponse.near_earth_objects;
  if (!neosByDate) return [];
  const allNeos = [];
  for (const date in neosByDate) {
    const dayNeos = neosByDate[date];
    for (let i = 0; i < dayNeos.length; i++) {
      const neo = dayNeos[i];
      const approach = neo.close_approach_data && neo.close_approach_data[0];
      if (approach) allNeos.push({ neo, approach });
    }
  }
  return allNeos;
}

function sortNeoData(allNeos, colIdx, asc) {
  const keys = [
    a => (a.neo.name || '').toLowerCase(),
    a => a.approach.close_approach_date_full || a.approach.close_approach_date || '',
    a => parseFloat(a.approach.miss_distance.kilometers) || 0,
    a => parseFloat(a.approach.relative_velocity.kilometers_per_second) || 0,
    a => {
      const d = a.neo.estimated_diameter && a.neo.estimated_diameter.meters;
      return d ? (d.estimated_diameter_min + d.estimated_diameter_max) / 2 : 0;
    },
    a => a.neo.absolute_magnitude_h || 0
  ];
  const fn = keys[colIdx] || keys[2];
  allNeos.sort((a, b) => {
    const va = fn(a), vb = fn(b);
    const cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
    return asc ? cmp : -cmp;
  });
}

function neoFormatDist(d) {
  if (d >= 1e6) return (d / 1e6).toFixed(2) + 'M';
  if (d >= 1e3) return (d / 1e3).toFixed(1) + 'K';
  return d.toFixed(1);
}

function renderNeoData(body, allNeos) {
  body.textContent = '';
  if (!allNeos || !allNeos.length) {
    showErrorPanel(body, t('neo.error'), 'al-tri-neo');
    return;
  }

  const useMiles = localStorage.getItem('mp-tempunit') === 'F';
  const KM_MI = 1.60934;

  const wrap = document.createElement('div');
  wrap.className = 'neo-wrap';

  /* -- Toolbar -- */
  const toolbar = document.createElement('div');
  toolbar.className = 'neo-toolbar';
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'raised';
  refreshBtn.textContent = t('neo.refresh');
  refreshBtn.onclick = () => { fetchNeoData(true); };
  toolbar.appendChild(refreshBtn);
  const countLabel = document.createElement('span');
  countLabel.className = 'neo-count-label';
  countLabel.textContent = t('neo.objectCount', { count: allNeos.length });
  toolbar.appendChild(countLabel);
  wrap.appendChild(toolbar);

  /* -- Summary stats -- */
  let phaCount = 0;
  let closestIdx = 0;
  let closestDist = Infinity;
  for (let s = 0; s < allNeos.length; s++) {
    if (allNeos[s].neo.is_potentially_hazardous_asteroid) phaCount++;
    const dd = parseFloat(allNeos[s].approach.miss_distance.kilometers);
    if (dd < closestDist) { closestDist = dd; closestIdx = s; }
  }

  const statsRow = document.createElement('div');
  statsRow.className = 'neo-stats-row';

  const statTotal = document.createElement('div');
  statTotal.className = 'neo-stat-box sunken';
  statTotal.innerHTML = `<div class="neo-stat-val">${allNeos.length}</div><div class="neo-stat-lbl">${t('neo.totalObjects')}</div>`;
  statsRow.appendChild(statTotal);

  const statPha = document.createElement('div');
  statPha.className = 'neo-stat-box sunken';
  statPha.title = t('neo.tip.pha');
  statPha.innerHTML = `<div class="neo-stat-val${phaCount > 0 ? ' neo-pha' : ''}">${phaCount}</div><div class="neo-stat-lbl">${t('neo.phaCount')}</div>`;
  statsRow.appendChild(statPha);

  const closestName = allNeos[closestIdx].neo.name || '\u2014';
  const closestLunar = parseFloat(allNeos[closestIdx].approach.miss_distance.lunar) || 0;
  const statClosest = document.createElement('div');
  statClosest.className = 'neo-stat-box sunken';
  statClosest.title = t('neo.tip.lunar');
  statClosest.innerHTML = `<div class="neo-stat-val">${closestLunar.toFixed(1)} LD</div><div class="neo-stat-lbl">${t('neo.closestApproach')}: ${closestName}</div>`;
  statsRow.appendChild(statClosest);

  wrap.appendChild(statsRow);

  /* -- SVG distance gauge -- */
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const gaugeWrap = document.createElement('div');
  gaugeWrap.className = 'neo-gauge-wrap sunken';
  const gaugeTitle = document.createElement('div');
  gaugeTitle.className = 'neo-gauge-title';
  gaugeTitle.textContent = t('neo.gaugeTitle');
  gaugeTitle.title = t('neo.tip.gauge');
  gaugeWrap.appendChild(gaugeTitle);

  const gW = 700, gH = 80;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${gW} ${gH}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', gH);
  svg.style.display = 'block';

  // Background line
  const axis = document.createElementNS(SVG_NS, 'line');
  axis.setAttribute('x1', 40); axis.setAttribute('y1', gH / 2);
  axis.setAttribute('x2', gW - 10); axis.setAttribute('y2', gH / 2);
  axis.setAttribute('stroke', '#808080'); axis.setAttribute('stroke-width', '1');
  svg.appendChild(axis);

  // Earth marker
  const earth = document.createElementNS(SVG_NS, 'circle');
  earth.setAttribute('cx', 30); earth.setAttribute('cy', gH / 2);
  earth.setAttribute('r', 8); earth.setAttribute('fill', '#2196f3');
  svg.appendChild(earth);
  const earthLbl = document.createElementNS(SVG_NS, 'text');
  earthLbl.setAttribute('x', 30); earthLbl.setAttribute('y', gH / 2 + 4);
  earthLbl.setAttribute('text-anchor', 'middle');
  earthLbl.setAttribute('font-size', '9'); earthLbl.setAttribute('fill', '#fff');
  earthLbl.textContent = '\u{1F30D}';
  svg.appendChild(earthLbl);

  // Log scale ticks: 0.1, 1, 10, 100 LD
  const tickVals = [0.1, 1, 10, 100];
  const tickLabels = ['0.1', '1 LD', '10 LD', '100 LD'];
  const plotLeft = 50, plotRight = gW - 20;
  const logMin = Math.log10(0.05), logMax = Math.log10(200);

  const ldToX = (ld) => {
    if (ld <= 0) ld = 0.01;
    const logVal = Math.log10(ld);
    const frac = (logVal - logMin) / (logMax - logMin);
    return plotLeft + frac * (plotRight - plotLeft);
  };

  for (let ti = 0; ti < tickVals.length; ti++) {
    const tx = ldToX(tickVals[ti]);
    const tick = document.createElementNS(SVG_NS, 'line');
    tick.setAttribute('x1', tx); tick.setAttribute('y1', gH / 2 - 6);
    tick.setAttribute('x2', tx); tick.setAttribute('y2', gH / 2 + 6);
    tick.setAttribute('stroke', '#808080'); tick.setAttribute('stroke-width', '1');
    svg.appendChild(tick);
    const tl = document.createElementNS(SVG_NS, 'text');
    tl.setAttribute('x', tx); tl.setAttribute('y', gH / 2 + 18);
    tl.setAttribute('text-anchor', 'middle');
    tl.setAttribute('font-size', '9'); tl.setAttribute('fill', '#606060');
    tl.textContent = tickLabels[ti];
    svg.appendChild(tl);
  }

  // NEO dots
  const neoTooltip = document.createElement('div');
  neoTooltip.className = 'neo-tooltip';
  gaugeWrap.appendChild(neoTooltip);

  // Deterministic jitter based on index
  for (let di = 0; di < allNeos.length; di++) {
    const lunarDist = parseFloat(allNeos[di].approach.miss_distance.lunar) || 0;
    const dx = ldToX(lunarDist);
    const jitter = ((di * 7 + 3) % 11 - 5) * 2.5;
    const dy = gH / 2 + jitter;
    const isPha = allNeos[di].neo.is_potentially_hazardous_asteroid;

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', dx);
    dot.setAttribute('cy', dy);
    dot.setAttribute('r', isPha ? 5 : 3.5);
    dot.setAttribute('fill', isPha ? '#c62828' : '#1565c0');
    dot.setAttribute('fill-opacity', '0.75');
    dot.setAttribute('stroke', isPha ? '#b71c1c' : '#0d47a1');
    dot.setAttribute('stroke-width', '0.5');
    dot.setAttribute('data-idx', di);
    dot.style.cursor = 'pointer';
    svg.appendChild(dot);
  }

  // Gauge interactivity
  svg.addEventListener('mousemove', (e) => {
    const target = e.target;
    if (target.tagName !== 'circle' || !target.hasAttribute('data-idx')) {
      neoTooltip.style.display = 'none';
      return;
    }
    const idx = parseInt(target.getAttribute('data-idx'));
    neoTooltip.textContent = allNeos[idx].neo.name;
    neoTooltip.style.display = 'block';
    const rect = gaugeWrap.getBoundingClientRect();
    neoTooltip.style.left = (e.clientX - rect.left + 10) + 'px';
    neoTooltip.style.top = (e.clientY - rect.top - 28) + 'px';
  });
  svg.addEventListener('mouseleave', () => { neoTooltip.style.display = 'none'; });
  svg.addEventListener('click', (e) => {
    const target = e.target;
    if (target.tagName !== 'circle' || !target.hasAttribute('data-idx')) return;
    const idx = parseInt(target.getAttribute('data-idx'));
    neoState.selectedIdx = idx;
    showNeoDetail(wrap, allNeos, idx, useMiles, KM_MI);
    highlightNeoRow(wrap, idx);
  });

  gaugeWrap.appendChild(svg);
  wrap.appendChild(gaugeWrap);

  /* -- Sortable table -- */
  const tableWrap = document.createElement('div');
  tableWrap.className = 'neo-table-wrap sunken';

  const table = document.createElement('table');
  table.className = 'neo-table';

  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  const colKeys = ['neo.name', 'neo.date', 'neo.distance', 'neo.velocity', 'neo.diameter', 'neo.hMag'];
  const colTips = [null, null, 'neo.tip.distance', 'neo.tip.velocity', 'neo.tip.diameter', 'neo.tip.hMag'];
  for (let c = 0; c < colKeys.length; c++) {
    const th = document.createElement('th');
    th.className = 'neo-th-sortable';
    th.setAttribute('data-col', c);
    if (colTips[c]) th.title = t(colTips[c]);
    const thText = document.createElement('span');
    thText.textContent = t(colKeys[c]);
    th.appendChild(thText);
    if (c === neoState.sortCol) {
      const arrow = document.createElement('span');
      arrow.className = 'neo-sort-arrow';
      arrow.textContent = neoState.sortAsc ? ' \u25B2' : ' \u25BC';
      th.appendChild(arrow);
    }
    th.onclick = ((ci) => () => {
      if (neoState.sortCol === ci) {
        neoState.sortAsc = !neoState.sortAsc;
      } else {
        neoState.sortCol = ci;
        neoState.sortAsc = true;
      }
      neoState.selectedIdx = -1;
      sortNeoData(allNeos, neoState.sortCol, neoState.sortAsc);
      const bdy = document.getElementById('neotrackerBody');
      renderNeoData(bdy, allNeos);
    })(c);
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (let r = 0; r < allNeos.length; r++) {
    const item = allNeos[r];
    const neo = item.neo;
    const approach = item.approach;
    const isPhaRow = neo.is_potentially_hazardous_asteroid;
    const tr = document.createElement('tr');
    tr.className = (isPhaRow ? 'neo-row-pha' : '') + (r === neoState.selectedIdx ? ' neo-row-selected' : '');
    tr.setAttribute('data-idx', r);
    tr.onclick = ((ri) => () => {
      if (neoState.selectedIdx === ri) {
        neoState.selectedIdx = -1;
        showNeoDetail(wrap, allNeos, -1, useMiles, KM_MI);
        highlightNeoRow(wrap, -1);
      } else {
        neoState.selectedIdx = ri;
        showNeoDetail(wrap, allNeos, ri, useMiles, KM_MI);
        highlightNeoRow(wrap, ri);
      }
    })(r);

    // Name
    const tdName = document.createElement('td');
    tdName.className = 'neo-name';
    if (isPhaRow) {
      const badge = document.createElement('span');
      badge.className = 'neo-pha-badge';
      badge.title = t('neo.phaTooltip');
      badge.textContent = '\u26A0 ';
      tdName.appendChild(badge);
    }
    tdName.appendChild(document.createTextNode(neo.name || '\u2014'));
    tr.appendChild(tdName);

    // Date
    const tdDate = document.createElement('td');
    const dateStr = approach.close_approach_date_full || approach.close_approach_date || '\u2014';
    tdDate.textContent = dateStr.length > 16 ? dateStr.slice(0, 16) : dateStr;
    tr.appendChild(tdDate);

    // Distance
    const tdDist = document.createElement('td');
    const distKm = parseFloat(approach.miss_distance.kilometers);
    if (!isNaN(distKm)) {
      const distMi = distKm / KM_MI;
      tdDist.textContent = useMiles ? neoFormatDist(distMi) + ' mi' : neoFormatDist(distKm) + ' km';
    } else {
      tdDist.textContent = '\u2014';
    }
    tr.appendChild(tdDist);

    // Velocity
    const tdVel = document.createElement('td');
    const vel = parseFloat(approach.relative_velocity.kilometers_per_second);
    tdVel.textContent = !isNaN(vel) ? vel.toFixed(2) + ' km/s' : '\u2014';
    tr.appendChild(tdVel);

    // Diameter
    const tdDiam = document.createElement('td');
    const diamM = neo.estimated_diameter && neo.estimated_diameter.meters;
    if (diamM && !isNaN(diamM.estimated_diameter_min) && !isNaN(diamM.estimated_diameter_max)) {
      const avgDiam = (diamM.estimated_diameter_min + diamM.estimated_diameter_max) / 2;
      tdDiam.textContent = avgDiam.toFixed(0) + ' m';
    } else {
      tdDiam.textContent = t('neo.unknown');
      tdDiam.className = 'neo-unknown';
    }
    tr.appendChild(tdDiam);

    // H magnitude
    const tdH = document.createElement('td');
    const hVal = neo.absolute_magnitude_h;
    if (hVal != null && !isNaN(hVal)) {
      tdH.textContent = hVal.toFixed(1);
      if (isPhaRow) { tdH.className = 'neo-pha'; tdH.title = t('neo.phaTooltip'); }
    } else {
      tdH.textContent = '\u2014';
    }
    tr.appendChild(tdH);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  wrap.appendChild(tableWrap);

  /* -- Detail panel (hidden by default) -- */
  const detailPanel = document.createElement('div');
  detailPanel.className = 'neo-detail sunken';
  detailPanel.style.display = 'none';
  wrap.appendChild(detailPanel);

  if (neoState.selectedIdx >= 0) {
    showNeoDetail(wrap, allNeos, neoState.selectedIdx, useMiles, KM_MI);
  }

  body.appendChild(wrap);
}

function highlightNeoRow(wrap, idx) {
  const rows = wrap.querySelectorAll('.neo-table tbody tr');
  for (let i = 0; i < rows.length; i++) {
    if (i === idx) {
      rows[i].classList.add('neo-row-selected');
    } else {
      rows[i].classList.remove('neo-row-selected');
    }
  }
}

function showNeoDetail(wrap, allNeos, idx, useMiles, KM_MI) {
  const panel = wrap.querySelector('.neo-detail');
  if (!panel) return;
  if (idx < 0 || idx >= allNeos.length) {
    panel.style.display = 'none';
    return;
  }

  const item = allNeos[idx];
  const neo = item.neo;
  const approach = item.approach;
  const isPha = neo.is_potentially_hazardous_asteroid;

  panel.textContent = '';
  panel.style.display = '';

  // Title row
  const titleRow = document.createElement('div');
  titleRow.className = 'neo-detail-title';
  let titleText = neo.name || '\u2014';
  if (isPha) titleText = '\u26A0 ' + titleText;
  titleRow.textContent = titleText;
  if (isPha) {
    const phaBadge = document.createElement('span');
    phaBadge.className = 'neo-pha-badge-detail';
    phaBadge.textContent = ' ' + t('neo.phaLabel');
    titleRow.appendChild(phaBadge);
  }
  panel.appendChild(titleRow);

  // Detail grid
  const grid = document.createElement('div');
  grid.className = 'neo-detail-grid';

  const distKm = parseFloat(approach.miss_distance.kilometers) || 0;
  const distMi = distKm / KM_MI;
  const lunarD = parseFloat(approach.miss_distance.lunar) || 0;
  const auD = parseFloat(approach.miss_distance.astronomical) || 0;
  const velKms = parseFloat(approach.relative_velocity.kilometers_per_second) || 0;
  const diamM = neo.estimated_diameter && neo.estimated_diameter.meters;
  let diamStr = '\u2014';
  if (diamM && !isNaN(diamM.estimated_diameter_min) && !isNaN(diamM.estimated_diameter_max)) {
    diamStr = diamM.estimated_diameter_min.toFixed(0) + ' \u2013 ' + diamM.estimated_diameter_max.toFixed(0) + ' m';
  }

  const pairs = [
    [t('neo.detailId'), neo.neo_reference_id || '\u2014', null],
    [t('neo.detailApproach'), approach.close_approach_date_full || approach.close_approach_date || '\u2014', null],
    [t('neo.detailDistKm'), neoFormatDist(distKm) + ' km', 'neo.tip.distance'],
    [t('neo.detailDistMi'), neoFormatDist(distMi) + ' mi', 'neo.tip.distance'],
    [t('neo.detailLunar'), lunarD.toFixed(2) + ' LD', 'neo.tip.lunar'],
    [t('neo.detailAu'), auD.toFixed(6) + ' AU', 'neo.tip.au'],
    [t('neo.detailVelocity'), velKms.toFixed(2) + ' km/s', 'neo.tip.velocity'],
    [t('neo.detailDiameter'), diamStr, 'neo.tip.diameter'],
    [t('neo.detailHmag'), neo.absolute_magnitude_h != null ? neo.absolute_magnitude_h.toFixed(1) : '\u2014', 'neo.tip.hMag'],
    [t('neo.detailOrbit'), approach.orbiting_body || '\u2014', null],
    [t('neo.detailPha'), isPha ? t('neo.detailYes') : t('neo.detailNo'), 'neo.tip.pha'],
    [t('neo.detailSentry'), neo.is_sentry_object ? t('neo.detailYes') : t('neo.detailNo'), 'neo.tip.sentry']
  ];

  for (let p = 0; p < pairs.length; p++) {
    const lbl = document.createElement('div');
    lbl.className = 'neo-detail-lbl';
    lbl.textContent = pairs[p][0];
    if (pairs[p][2]) lbl.title = t(pairs[p][2]);
    grid.appendChild(lbl);
    const val = document.createElement('div');
    val.className = 'neo-detail-val';
    val.textContent = pairs[p][1];
    if (pairs[p][2]) val.title = t(pairs[p][2]);
    if (pairs[p][0] === t('neo.detailPha') && isPha) val.className += ' neo-pha';
    grid.appendChild(val);
  }
  panel.appendChild(grid);

  // JPL link
  if (neo.nasa_jpl_url) {
    const jplLink = document.createElement('a');
    jplLink.className = 'neo-jpl-link';
    jplLink.href = neo.nasa_jpl_url;
    jplLink.target = '_blank';
    jplLink.rel = 'noopener';
    jplLink.textContent = t('neo.detailJpl') + ' \u2197';
    panel.appendChild(jplLink);
  }

  // Scroll detail into view
  setTimeout(() => { panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
}


/* ═══════════════════════════════════════════════════════════
   Visitor Map — World map with visitor data from Cloudflare Worker
   ═══════════════════════════════════════════════════════════ */

const VM_WORKER = 'https://visitor-map.matthewpritchard.workers.dev';
let vmPopulated = false;

// Register visit on page load (fire-and-forget)
if (!sessionStorage.getItem('vm-visited')) {
  sessionStorage.setItem('vm-visited', '1');
  (async () => { try { await fetch(VM_WORKER + '/visit', { method: 'POST' }); } catch {} })();
}

function openVisitorMap() {
  openWindow('visitormap');
  if (!vmPopulated) {
    vmPopulated = true;
    fetchVisitorData();
  }
}

async function fetchVisitorData() {
  const body = document.getElementById('visitorMapBody');
  try {
    const fetchCounts = async () => {
      const r = await fetch(VM_WORKER + '/visit', { method: 'GET' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    };
    const [, counts] = await Promise.all([
      loadDataScript('js/world-map-data.js'),
      fetchCounts()
    ]);
    renderVisitorMap(body, counts);
  } catch {
    showErrorPanel(body, t('vm.loadError'), 'vm-err');
    vmPopulated = false;
  }
}

function renderVisitorMap(body, counts) {
  body.textContent = '';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Compute max for color scale (log)
  let maxCount = 0;
  // let totalVisitors = 0;
  let countryCount = 0;
  const entries = [];
  let code;
  for (code in counts) {
    if (counts.hasOwnProperty(code)) {
      const c = counts[code];
      // totalVisitors += c;
      countryCount++;
      if (c > maxCount) maxCount = c;
      const name = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[code]) || code;
      entries.push({ code, name, count: c });
    }
  }
  // entries.sort((a, b) => b.count - a.count);
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  const logMax = Math.log(maxCount + 1);

  const countToColor = (n) => {
    if (n === 0) return '#e0e0e0';
    const t = Math.log(n + 1) / logMax;
    // hsl(210, 55-80%, 80% -> 30%)  blue gradient
    const sat = 55 + t * 25;
    const light = 80 - t * 50;
    return `hsl(210, ${sat.toFixed(0)}%, ${light.toFixed(0)}%)`;
  };

  // Build map SVG
  const mapWrap = document.createElement('div');
  mapWrap.className = 'vm-map-wrap';

  if (typeof WORLD_MAP_PATHS !== 'undefined' && WORLD_MAP_PATHS.countries) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', WORLD_MAP_PATHS.viewBox);
    svg.setAttribute('xmlns', SVG_NS);
    svg.style.background = '#f0f4f8';

    const countryKeys = Object.keys(WORLD_MAP_PATHS.countries);
    for (let i = 0; i < countryKeys.length; i++) {
      code = countryKeys[i];
      const pathData = WORLD_MAP_PATHS.countries[code];
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('data-code', code);
      path.classList.add('vm-country');
      const cnt = counts[code] || 0;
      path.style.fill = countToColor(cnt);
      if (cnt > 0) {
        path.classList.add('vm-has-visitors');
      }
      svg.appendChild(path);
    }

    mapWrap.appendChild(svg);

    // Tooltip (desktop only, hover:hover)
    if (window.matchMedia('(hover: hover)').matches) {
      const tooltip = document.createElement('div');
      tooltip.className = 'vm-tooltip';
      mapWrap.appendChild(tooltip);

      svg.addEventListener('mousemove', (e) => {
        const target = e.target;
        if (!target.classList || !target.classList.contains('vm-country')) {
          tooltip.style.display = 'none';
          return;
        }
        const cc = target.getAttribute('data-code');
        const cName = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[cc]) || cc;
        // const cCount = counts[cc] || 0;
        // tooltip.textContent = cName + ': ' + cCount + ' visit' + (cCount !== 1 ? 's' : '');
        tooltip.textContent = cName;
        tooltip.style.display = 'block';
        const rect = mapWrap.getBoundingClientRect();
        let tx = e.clientX - rect.left + 12;
        let ty = e.clientY - rect.top - 24;
        if (tx + 150 > rect.width) tx = e.clientX - rect.left - 150;
        if (ty < 0) ty = e.clientY - rect.top + 12;
        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
      });

      svg.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
      });
    }

    // Click country -> open in WikiBrowser
    svg.addEventListener('click', (e) => {
      const target = e.target;
      if (!target.classList || !target.classList.contains('vm-has-visitors')) return;
      const cc = target.getAttribute('data-code');
      const cName = (typeof COUNTRY_NAMES !== 'undefined' && COUNTRY_NAMES[cc]) || cc;
      openBrowser();
      browserNavigate('https://en.wikipedia.org/wiki/' + encodeURIComponent(cName));
    });
  } else {
    const noMap = document.createElement('div');
    noMap.className = 'folder-empty';
    noMap.textContent = t('vm.mapUnavailable');
    mapWrap.appendChild(noMap);
  }

  body.appendChild(mapWrap);

  // Build country list
  const list = document.createElement('div');
  list.className = 'vm-list';

  const listHeader = document.createElement('div');
  listHeader.className = 'vm-list-header';
  listHeader.textContent = t('vm.countries');
  list.appendChild(listHeader);

  for (let j = 0; j < entries.length; j++) {
    const entry = entries[j];
    const row = document.createElement('div');
    row.className = 'vm-list-row';

    const chip = document.createElement('span');
    chip.className = 'vm-list-chip';
    chip.style.background = countToColor(entry.count);
    row.appendChild(chip);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'vm-list-name';
    nameSpan.textContent = entry.name;
    row.appendChild(nameSpan);

    row.style.cursor = 'pointer';
    row.dataset.country = entry.name;
    row.addEventListener('click', function () {
      openBrowser();
      browserNavigate('https://en.wikipedia.org/wiki/' + encodeURIComponent(this.dataset.country));
    });

    // const countSpan = document.createElement('span');
    // countSpan.className = 'vm-list-count';
    // countSpan.textContent = String(entry.count);
    // row.appendChild(countSpan);

    list.appendChild(row);
  }

  body.appendChild(list);

  // Status bar
  const status = document.getElementById('visitorMapStatus');
  if (status) {
    // status.textContent = countryCount + ' countr' + (countryCount !== 1 ? 'ies' : 'y') + ', ' + totalVisitors + ' total visitor' + (totalVisitors !== 1 ? 's' : '');
    status.textContent = tPlural('vm.countryCount', countryCount);
  }
}


/* ═══════════════════════════════════════════════════════════
   Task Manager (Ctrl+Alt+Del) — Open windows list + perf graphs
   ═══════════════════════════════════════════════════════════ */

let tmInterval = null;
let tmSelectedId = null;
let tmFpsHistory = [];
let tmMemHistory = [];
let tmFrameCount = 0;
let tmCurrentFps = 0;
let tmRafId = null;
let tmBuilt = false;
let tmLastFrameTime = 0;
let tmActiveTab = 'apps';
const tmMonoFont = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim();

/* Cached TM DOM elements (set after tmBuildUI) */
let tmCpuCanvasEl = null;
let tmMemCanvasEl = null;
let tmCpuStatusEl = null;
let tmMemStatusEl = null;
let tmPerfStatsEl = null;
let tmCpuCachedW = 0;
let tmCpuCachedH = 0;
let tmMemCachedW = 0;
let tmMemCachedH = 0;

function tmFpsLoop(now) {
  tmFrameCount++;
  tmRafId = requestAnimationFrame(tmFpsLoop);
}

function openTaskManager() {
  if (!tmBuilt) {
    tmBuildUI();
    tmBuilt = true;
  }
  openWindow('taskmanager');
  if (!tmRafId) {
    tmFrameCount = 0;
    tmLastFrameTime = performance.now();
    tmRafId = requestAnimationFrame(tmFpsLoop);
  }
  if (!tmInterval) {
    tmRefreshApps();
    tmRefreshPerf();
    tmInterval = setInterval(() => {
      tmRefreshApps();
      tmRefreshPerf();
    }, 1000);
  }
}

function closeTaskManager() {
  if (tmInterval) { clearInterval(tmInterval); tmInterval = null; }
  if (tmRafId) { cancelAnimationFrame(tmRafId); tmRafId = null; }
  mpTaskbar.closeWindow('taskmanager');
}

function tmBuildUI() {
  const body = document.getElementById('taskmanagerBody');

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.className = 'mycomputer-tabs';

  const tabApps = document.createElement('button');
  tabApps.className = 'mycomputer-tab active';
  tabApps.textContent = t('tm.tab.apps');
  tabApps.onclick = () => { tmSwitchTab('apps'); };

  const tabPerf = document.createElement('button');
  tabPerf.className = 'mycomputer-tab';
  tabPerf.textContent = t('tm.tab.perf');
  tabPerf.onclick = () => { tmSwitchTab('perf'); };

  tabBar.appendChild(tabApps);
  tabBar.appendChild(tabPerf);
  body.appendChild(tabBar);

  // Tab body container
  const tabBody = document.createElement('div');
  tabBody.className = 'mycomputer-tab-body';
  tabBody.style.padding = '0';
  tabBody.style.flex = '1';
  tabBody.style.display = 'flex';
  tabBody.style.flexDirection = 'column';
  tabBody.style.minHeight = '0';
  body.appendChild(tabBody);

  // Applications content
  const appsContent = document.createElement('div');
  appsContent.id = 'tmAppsContent';
  appsContent.style.display = 'flex';
  appsContent.style.flexDirection = 'column';
  appsContent.style.flex = '1';
  appsContent.style.minHeight = '0';

  const appList = document.createElement('div');
  appList.className = 'tm-app-list';
  appList.id = 'tmAppList';
  appsContent.appendChild(appList);

  const btnRow = document.createElement('div');
  btnRow.className = 'tm-btn-row';

  const endBtn = document.createElement('button');
  endBtn.className = 'btn';
  endBtn.textContent = t('tm.endTask');
  endBtn.style.fontSize = '12px';
  endBtn.style.padding = '2px 12px';
  endBtn.onclick = () => { tmEndTask(); };

  const switchBtn = document.createElement('button');
  switchBtn.className = 'btn';
  switchBtn.textContent = t('tm.switchTo');
  switchBtn.style.fontSize = '12px';
  switchBtn.style.padding = '2px 12px';
  switchBtn.onclick = () => { tmSwitchTo(); };

  btnRow.appendChild(endBtn);
  btnRow.appendChild(switchBtn);
  appsContent.appendChild(btnRow);
  tabBody.appendChild(appsContent);

  // Performance content
  const perfContent = document.createElement('div');
  perfContent.id = 'tmPerfContent';
  perfContent.className = 'tm-perf-wrap';
  perfContent.style.display = 'none';

  // CPU section
  const cpuSection = document.createElement('div');
  cpuSection.className = 'tm-graph-section';
  const cpuLabel = document.createElement('div');
  cpuLabel.className = 'tm-graph-label';
  cpuLabel.textContent = t('tm.cpuUsage');
  cpuSection.appendChild(cpuLabel);
  const cpuCanvas = document.createElement('canvas');
  cpuCanvas.className = 'tm-graph-canvas';
  cpuCanvas.id = 'tmCpuCanvas';
  cpuSection.appendChild(cpuCanvas);
  perfContent.appendChild(cpuSection);

  // Memory section
  const memSection = document.createElement('div');
  memSection.className = 'tm-graph-section';
  const memLabel = document.createElement('div');
  memLabel.className = 'tm-graph-label';
  memLabel.textContent = t('tm.memUsage');
  memSection.appendChild(memLabel);
  const memCanvas = document.createElement('canvas');
  memCanvas.className = 'tm-graph-canvas';
  memCanvas.id = 'tmMemCanvas';
  memSection.appendChild(memCanvas);
  perfContent.appendChild(memSection);

  // Stats row
  const statsRow = document.createElement('div');
  statsRow.className = 'tm-perf-stats';
  statsRow.id = 'tmPerfStats';
  perfContent.appendChild(statsRow);

  tabBody.appendChild(perfContent);

  // Store tab refs
  body._tmTabApps = tabApps;
  body._tmTabPerf = tabPerf;
  body._tmAppsContent = appsContent;
  body._tmPerfContent = perfContent;

  // Cache perf DOM elements
  tmCpuCanvasEl = cpuCanvas;
  tmMemCanvasEl = memCanvas;
  tmPerfStatsEl = statsRow;
  tmCpuStatusEl = null;
  tmMemStatusEl = null;
  tmCpuCachedW = 0;
  tmCpuCachedH = 0;
  tmMemCachedW = 0;
  tmMemCachedH = 0;
}

function tmSwitchTab(tab) {
  tmActiveTab = tab;
  const body = document.getElementById('taskmanagerBody');
  const tabApps = body._tmTabApps;
  const tabPerf = body._tmTabPerf;
  const appsContent = body._tmAppsContent;
  const perfContent = body._tmPerfContent;

  if (tab === 'apps') {
    tabApps.classList.add('active');
    tabPerf.classList.remove('active');
    appsContent.style.display = 'flex';
    perfContent.style.display = 'none';
  } else {
    tabApps.classList.remove('active');
    tabPerf.classList.add('active');
    appsContent.style.display = 'none';
    perfContent.style.display = '';
  }
}

function tmRefreshApps() {
  const list = document.getElementById('tmAppList');
  if (!list) return;
  list.textContent = '';
  let count = 0;
  const names = Object.keys(WINDOW_NAMES);
  for (let i = 0; i < names.length; i++) {
    const id = names[i];
    if (id === 'taskmanager') continue;
    const el = document.getElementById(id);
    if (!el || el.style.display === 'none') continue;
    count++;
    const row = document.createElement('div');
    row.className = 'tm-app-row';
    if (id === tmSelectedId) row.classList.add('selected');
    row.dataset.winId = id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tm-app-name';
    nameSpan.textContent = t('win.' + id);
    row.appendChild(nameSpan);

    const statusSpan = document.createElement('span');
    statusSpan.className = 'tm-app-status';
    statusSpan.textContent = t('tm.running');
    row.appendChild(statusSpan);

    row.onclick = ((winId) => () => { tmSelectRow(winId); })(id);

    list.appendChild(row);
  }

  // Clear selection if the selected window is no longer open
  if (tmSelectedId) {
    const selEl = document.getElementById(tmSelectedId);
    if (!selEl || selEl.style.display === 'none') tmSelectedId = null;
  }

  const statusEl = document.getElementById('tmStatus');
  if (statusEl) statusEl.textContent = t('tm.processes', { count });
}

function tmSelectRow(winId) {
  tmSelectedId = winId;
  const list = document.getElementById('tmAppList');
  if (!list) return;
  const rows = list.children;
  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.toggle('selected', rows[i].dataset.winId === winId);
  }
}

function tmEndTask() {
  if (!tmSelectedId) return;
  mpTaskbar.closeWindow(tmSelectedId);
  tmSelectedId = null;
  tmRefreshApps();
}

function tmSwitchTo() {
  if (!tmSelectedId) return;
  const win = document.getElementById(tmSelectedId);
  if (win) mpTaskbar.bringToFront(win);
}

function tmRefreshPerf() {
  const now = performance.now();
  const elapsed = (now - tmLastFrameTime) / 1000;
  if (elapsed > 0) {
    tmCurrentFps = Math.round(tmFrameCount / elapsed);
  }
  tmFrameCount = 0;
  tmLastFrameTime = now;

  tmFpsHistory.push(tmCurrentFps);
  if (tmFpsHistory.length > 60) tmFpsHistory.shift();

  let mem = null;
  if (performance.memory) {
    mem = performance.memory.usedJSHeapSize / 1048576;
    tmMemHistory.push(mem);
    if (tmMemHistory.length > 60) tmMemHistory.shift();
  }

  // Skip drawing when Performance tab is hidden
  if (tmActiveTab !== 'perf') return;

  // Draw graphs (use cached elements)
  if (tmCpuCanvasEl) tmDrawGraph(tmCpuCanvasEl, tmFpsHistory, 80, 'FPS');
  if (tmMemCanvasEl) {
    if (performance.memory) {
      tmDrawGraph(tmMemCanvasEl, tmMemHistory, performance.memory.jsHeapSizeLimit / 1048576, 'MB');
    } else {
      tmDrawUnavailable(tmMemCanvasEl);
    }
  }

  // Update statusbar
  const cpuPct = Math.min(100, Math.round(tmCurrentFps / 60 * 100));
  if (!tmCpuStatusEl) tmCpuStatusEl = document.getElementById('tmCpuStatus');
  if (tmCpuStatusEl) tmCpuStatusEl.textContent = t('tm.cpuStatus', { pct: cpuPct });

  if (!tmMemStatusEl) tmMemStatusEl = document.getElementById('tmMemStatus');
  if (tmMemStatusEl) tmMemStatusEl.textContent = t('tm.memStatus', { value: mem !== null ? Math.round(mem) + ' MB' : '\u2014' });

  // Update stats row (use cached element)
  if (tmPerfStatsEl) {
    tmPerfStatsEl.textContent = '';
    const fpsStat = document.createElement('span');
    fpsStat.textContent = 'FPS: ' + tmCurrentFps;
    tmPerfStatsEl.appendChild(fpsStat);
    if (mem !== null) {
      const memStat = document.createElement('span');
      memStat.textContent = 'Heap: ' + Math.round(mem) + ' MB';
      tmPerfStatsEl.appendChild(memStat);
    }
  }
}

function tmDrawGraph(canvas, data, maxVal, unit) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  // Only resize (which clears) when dimensions actually change
  const isCpu = canvas === tmCpuCanvasEl;
  const cachedW = isCpu ? tmCpuCachedW : tmMemCachedW;
  const cachedH = isCpu ? tmCpuCachedH : tmMemCachedH;
  if (w !== cachedW || h !== cachedH) {
    canvas.width = w;
    canvas.height = h;
    if (isCpu) { tmCpuCachedW = w; tmCpuCachedH = h; }
    else { tmMemCachedW = w; tmMemCachedH = h; }
  }
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // Grid
  ctx.strokeStyle = '#003300';
  ctx.lineWidth = 1;
  const gridRows = 4;
  for (let r = 1; r < gridRows; r++) {
    const y = Math.round(h * r / gridRows) + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const gridCols = 8;
  for (let c = 1; c < gridCols; c++) {
    const x = Math.round(w * c / gridCols) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  // Data line
  if (data.length > 1) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const len = data.length;
    const stepX = w / 59;
    const startX = w - (len - 1) * stepX;
    for (let i = 0; i < len; i++) {
      const px = startX + i * stepX;
      const val = Math.min(data[i], maxVal);
      const py = h - (val / maxVal) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Current value text
  if (data.length > 0) {
    const current = data[data.length - 1];
    ctx.fillStyle = '#00ff00';
    ctx.font = '10px ' + tmMonoFont;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(current) + ' ' + unit, w - 4, 12);
  }
}

function tmDrawUnavailable(canvas) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#003300';
  ctx.font = '11px ' + tmMonoFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t('tm.notAvailable'), w / 2, h / 2);
}


/* ═══════════════════════════════════════════════════════════
   Registration — hook into core maps
   ═══════════════════════════════════════════════════════════ */

mpRegisterActions({
  openNeoTracker,
  openVisitorMap,
  openTaskManager
});

mpRegisterWindows({
  neotracker: 'NEO Tracker',
  visitormap: 'Visitor Map',
  taskmanager: 'Task Manager'
});

mpRegisterCloseHandlers({
  taskmanager: closeTaskManager
});

/* ── Language change refresh ── */
const tmRefreshOnLangChange = () => {
  const el = document.getElementById('taskmanager');
  if (el && el.style.display !== 'none') {
    tmBuilt = false;
    document.getElementById('taskmanagerBody').textContent = '';
    tmBuildUI();
    tmRefreshApps();
  }
};

/* ── Exports to window (for inline onclick handlers) ── */
window.openNeoTracker = openNeoTracker;
window.openVisitorMap = openVisitorMap;
window.openTaskManager = openTaskManager;
window.closeTaskManager = closeTaskManager;
window.tmRefreshOnLangChange = tmRefreshOnLangChange;

})();
