(function () {
  'use strict';

  let weatherLoaded = false;

  const darkenHex = (hex, factor) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return '#' + ((1 << 24) + (Math.round(r * factor) << 16) +
      (Math.round(g * factor) << 8) + Math.round(b * factor)).toString(16).slice(1);
  };

  const weatherCodeToDesc = (code) => {
    const key = `weather.code.${code}`;
    const val = t(key);
    return val !== key ? val : t('weather.unknown');
  };

  const weatherIconType = (code) => {
    if (code <= 1) return 'sun';
    if (code === 2) return 'partcloud';
    if (code === 3) return 'cloud';
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
    return 'thunder';
  };

  const renderWeather = (body, data) => {
    const current = data.current_weather;
    const daily = data.daily;
    body.textContent = '';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const el = (tag, attrs) => {
      const e = document.createElementNS(SVG_NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };

    // Shared gradient defs (injected once, referenced by all icons)
    const defsSvg = el('svg', { width: '0', height: '0' });
    defsSvg.style.position = 'absolute';
    const defs = el('defs', {});

    const sunG = el('radialGradient', { id: 'wi-sun', cx: '0.35', cy: '0.35', r: '0.65' });
    sunG.appendChild(el('stop', { offset: '0%', 'stop-color': '#fffde0' }));
    sunG.appendChild(el('stop', { offset: '100%', 'stop-color': '#f9a825' }));
    defs.appendChild(sunG);

    const cloudG = el('linearGradient', { id: 'wi-cloud', x1: '0', y1: '0', x2: '1', y2: '1' });
    cloudG.appendChild(el('stop', { offset: '0%', 'stop-color': '#f0eeea' }));
    cloudG.appendChild(el('stop', { offset: '100%', 'stop-color': '#d0ccc4' }));
    defs.appendChild(cloudG);

    const dkG = el('linearGradient', { id: 'wi-dkcloud', x1: '0', y1: '0', x2: '1', y2: '1' });
    dkG.appendChild(el('stop', { offset: '0%', 'stop-color': '#b0aca4' }));
    dkG.appendChild(el('stop', { offset: '100%', 'stop-color': '#7a7670' }));
    defs.appendChild(dkG);

    const dropG = el('linearGradient', { id: 'wi-drop', x1: '0', y1: '0', x2: '0', y2: '1' });
    dropG.appendChild(el('stop', { offset: '0%', 'stop-color': '#c8e0f8' }));
    dropG.appendChild(el('stop', { offset: '100%', 'stop-color': '#4a8abe' }));
    defs.appendChild(dropG);

    const boltG = el('linearGradient', { id: 'wi-bolt', x1: '0', y1: '0', x2: '0', y2: '1' });
    boltG.appendChild(el('stop', { offset: '0%', 'stop-color': '#fff3c4' }));
    boltG.appendChild(el('stop', { offset: '100%', 'stop-color': '#ffc107' }));
    defs.appendChild(boltG);

    defsSvg.appendChild(defs);
    body.appendChild(defsSvg);

    // Cloud paths (Q-curve style matching explorer icon)
    const CLOUD = 'M10 30 Q10 23 17 23 Q18 18 24 18 Q32 18 33 23 Q39 23 39 28 Q39 32 34 32 L15 32 Q10 32 10 30 Z';
    const CLOUD_HI = 'M10 22 Q10 15 17 15 Q18 10 24 10 Q32 10 33 15 Q39 15 39 20 Q39 24 34 24 L15 24 Q10 24 10 22 Z';
    const CLOUD_PC = 'M6 34 Q6 27 13 27 Q14 22 20 22 Q28 22 29 27 Q35 27 35 32 Q35 36 30 36 L11 36 Q6 36 6 34 Z';

    const addSun = (svg, cx, cy, r) => {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        svg.appendChild(el('line', {
          x1: (cx + (r + 3) * Math.cos(a)).toFixed(1),
          y1: (cy + (r + 3) * Math.sin(a)).toFixed(1),
          x2: (cx + (r + 7) * Math.cos(a)).toFixed(1),
          y2: (cy + (r + 7) * Math.sin(a)).toFixed(1),
          stroke: '#f9a825', 'stroke-width': '2.5', 'stroke-linecap': 'round'
        }));
      }
      svg.appendChild(el('circle', { cx, cy, r, fill: 'url(#wi-sun)', stroke: '#c49000', 'stroke-width': '1' }));
      svg.appendChild(el('ellipse', { cx: cx - r * 0.25, cy: cy - r * 0.25, rx: r * 0.35, ry: r * 0.3, fill: 'rgba(255,255,255,0.4)' }));
    };

    const addCloud = (svg, path, dark) => {
      svg.appendChild(el('path', {
        d: path,
        fill: `url(#${dark ? 'wi-dkcloud' : 'wi-cloud'})`,
        stroke: dark ? '#5a5650' : '#8a8680',
        'stroke-width': '0.8'
      }));
    };

    const makeIcon = (code) => {
      const svg = el('svg', { viewBox: '0 0 48 48', 'class': 'weather-icon' });
      const type = weatherIconType(code);

      switch (type) {
        case 'sun':
          addSun(svg, 24, 24, 10);
          break;
        case 'partcloud':
          addSun(svg, 33, 14, 9);
          addCloud(svg, CLOUD_PC, false);
          svg.appendChild(el('ellipse', { cx: 15, cy: 25, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
          break;
        case 'cloud':
          addCloud(svg, CLOUD, false);
          svg.appendChild(el('ellipse', { cx: 20, cy: 21, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
          break;
        case 'fog':
          addCloud(svg, CLOUD_HI, false);
          svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
          svg.appendChild(el('line', { x1: 8, y1: 30, x2: 40, y2: 30, stroke: '#b0aca4', 'stroke-width': '2', 'stroke-linecap': 'round' }));
          svg.appendChild(el('line', { x1: 12, y1: 35, x2: 36, y2: 35, stroke: '#c8c4bc', 'stroke-width': '2', 'stroke-linecap': 'round' }));
          svg.appendChild(el('line', { x1: 10, y1: 40, x2: 38, y2: 40, stroke: '#d8d4cc', 'stroke-width': '2', 'stroke-linecap': 'round' }));
          break;
        case 'rain':
          addCloud(svg, CLOUD_HI, false);
          svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
          svg.appendChild(el('ellipse', { cx: 16, cy: 32, rx: 1.5, ry: 2.5, fill: 'url(#wi-drop)' }));
          svg.appendChild(el('ellipse', { cx: 24, cy: 36, rx: 1.5, ry: 2.5, fill: 'url(#wi-drop)' }));
          svg.appendChild(el('ellipse', { cx: 32, cy: 32, rx: 1.5, ry: 2.5, fill: 'url(#wi-drop)' }));
          break;
        case 'snow':
          addCloud(svg, CLOUD_HI, false);
          svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.3)' }));
          svg.appendChild(el('circle', { cx: 16, cy: 32, r: 2.5, fill: '#e8eef4', stroke: '#a0b8cc', 'stroke-width': '0.5' }));
          svg.appendChild(el('circle', { cx: 24, cy: 37, r: 2.5, fill: '#e8eef4', stroke: '#a0b8cc', 'stroke-width': '0.5' }));
          svg.appendChild(el('circle', { cx: 32, cy: 32, r: 2.5, fill: '#e8eef4', stroke: '#a0b8cc', 'stroke-width': '0.5' }));
          break;
        case 'thunder':
          addCloud(svg, CLOUD_HI, true);
          svg.appendChild(el('ellipse', { cx: 20, cy: 13, rx: 5, ry: 3, fill: 'rgba(255,255,255,0.2)' }));
          svg.appendChild(el('path', {
            d: 'M26 26 L22 33 L26 33 L21 42 L29 32 L25 32 L29 26 Z',
            fill: 'url(#wi-bolt)', stroke: '#c49000', 'stroke-width': '0.7', 'stroke-linejoin': 'round'
          }));
          break;
      }
      return svg;
    };

    // Current weather
    const curDiv = document.createElement('div');
    curDiv.className = 'weather-current';
    curDiv.appendChild(makeIcon(current.weathercode));
    const tempEl = document.createElement('div');
    tempEl.className = 'weather-temp';
    tempEl.textContent = mpFormatTemp(current.temperature);
    curDiv.appendChild(tempEl);
    const descEl = document.createElement('div');
    descEl.className = 'weather-desc';
    descEl.textContent = weatherCodeToDesc(current.weathercode);
    curDiv.appendChild(descEl);
    body.appendChild(curDiv);

    const sep = document.createElement('div');
    sep.className = 'separator';
    body.appendChild(sep);

    // Forecast
    const forecast = document.createElement('div');
    forecast.className = 'weather-forecast';
    for (let i = 0; i < daily.time.length; i++) {
      const date = new Date(daily.time[i] + 'T00:00:00');
      const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });
      const dayDiv = document.createElement('div');
      dayDiv.className = 'weather-day';
      const nameEl = document.createElement('div');
      nameEl.className = 'weather-day-name';
      nameEl.textContent = dayName;
      dayDiv.appendChild(nameEl);
      dayDiv.appendChild(makeIcon(daily.weathercode[i]));
      const dayHiEl = document.createElement('div');
      dayHiEl.className = 'weather-day-temp';
      dayHiEl.textContent = mpFormatTempShort(daily.temperature_2m_max[i]);
      dayDiv.appendChild(dayHiEl);
      const dayLoEl = document.createElement('div');
      dayLoEl.className = 'weather-day-low';
      dayLoEl.textContent = mpFormatTempShort(daily.temperature_2m_min[i]);
      dayDiv.appendChild(dayLoEl);
      forecast.appendChild(dayDiv);
    }
    body.appendChild(forecast);
  };

  const fetchWeather = () => {
    if (weatherLoaded) return;
    const body = document.getElementById('weatherBody');
    const status = document.getElementById('weatherStatus');
    showLoadingMessage(body, t('weather.loading'));

    getLocation(
      async (lat, lon) => {
        showLoadingMessage(body, t('weather.loading'));
        const flatLat = lat.toFixed(2);
        const flatLon = lon.toFixed(2);
        try {
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${flatLat}&longitude=${flatLon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=auto&forecast_days=3`);
          if (!r.ok) throw new Error('API error');
          const data = await r.json();
          weatherLoaded = true;
          renderWeather(body, data);
          status.textContent = t('weather.poweredBy');
        } catch {
          showErrorPanel(body, 'Failed to fetch weather data. Please try again later.', 'al-tri-we');
        }
      },
      (msg) => {
        showErrorPanel(body, msg, 'al-tri-we');
      }
    );
  };

  const openWeather = () => {
    openWindow('weather');
    fetchWeather();
  };

  // Exports
  window.openWeather = openWeather;
  window.mpRegisterActions({ openWeather });
  window.mpRegisterWindows({ weather: 'Weather' });
})();
