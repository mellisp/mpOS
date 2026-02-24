(function () {
  'use strict';

  let weatherLoaded = false;
  let _wn = 0;

  // ── Cool Palette ──────────────────────────────────────────────
  const C = {
    sun:    ['#f0b824','#d49408','#e2a616'],
    moon:   ['#86c3db','#5eafcf','#72b9d5'],
    cloud:  ['#dce4ee','#c8d4e4','#d0dae8'],
    dkcloud:['#9ca3af','#6b7280','#848b98'],
    rain:   ['#6aabe0','#4a90cc','#5a9dd8'],
    snow:   ['#86c3db','#6eb0ca','#78b9d3'],
    hail:   ['#86c3db','#5eafcf','#72b9d5'],
    bolt:   ['#f7b23b','#f59e0b','#f6a823'],
    fog:    ['#d0d8e2','#c2ccd8','#c8d0da'],
  };

  // ── SVG Helpers ────────────────────────────────────────────────
  const gr = (p, id, x1, y1, x2, y2, c, mid) =>
    `<linearGradient id="${p}${id}" x1="${x1}" x2="${x2}" y1="${y1}" y2="${y2}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="${c[0]}"/><stop offset=".5" stop-color="${mid || c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient>`;

  const svgToEl = (str) => {
    const doc = new DOMParser().parseFromString(str, 'image/svg+xml');
    return document.importNode(doc.documentElement, true);
  };

  // ── Gradient Definitions ──────────────────────────────────────
  const WG = {
    sunLg:    (p) => gr(p,'sg', 150,119.2, 234,264.8, C.sun),
    sun:      (p) => gr(p,'sg', 73.5,55.6, 122.5,140.5, C.sun),
    moonLg:   (p) => gr(p,'mg', 54.3,29, 187.2,259.1, C.moon),
    fullMoon: (p) => gr(p,'fm', 73.5,55.6, 122.5,140.5, C.moon),
    cloud:    (p) => gr(p,'cg', 99.5,30.7, 232.6,261.4, C.cloud),
    dkcloud:  (p) => gr(p,'dg', 99.5,30.7, 232.6,261.4, C.dkcloud),
    bkcloud:  (p) => gr(p,'bkg', 52.7,9.6, 133.4,149.3, C.dkcloud),
    rain:     (p) => gr(p,'r1', 0.5,8.5, 16.5,56.5, C.rain, C.rain[2]) + gr(p,'r2', 56.5,8.5, 72.5,56.5, C.rain, C.rain[2]) + gr(p,'r3', 112.5,8.5, 128.5,56.5, C.rain, C.rain[2]),
    drizzle:  (p) => gr(p,'d1', 0.5,0.5, 16.5,28.5, C.rain, C.rain[2]) + gr(p,'d2', 56.5,0.5, 72.5,28.5, C.rain, C.rain[2]) + gr(p,'d3', 112.5,0.5, 128.5,28.5, C.rain, C.rain[2]),
    flake:    (p) => gr(p,'f1', 11.4,5.9, 32.8,43.1, C.snow) + gr(p,'f2', 67.4,5.9, 88.8,43.1, C.snow) + gr(p,'f3', 123.4,5.9, 144.8,43.1, C.snow),
    hail:     (p) => gr(p,'h1', 6.5,2.1, 18.5,22.9, C.hail) + gr(p,'h2', 62.5,2.1, 74.5,22.9, C.hail) + gr(p,'h3', 118.5,2.1, 130.5,22.9, C.hail),
    sleetDrop:(p) => gr(p,'sr1', 14.1,0.5, 30.1,28.5, C.rain, C.rain[2]) + gr(p,'sr2', 70.1,0.5, 86.1,28.5, C.rain, C.rain[2]) + gr(p,'sr3', 126.1,0.5, 142.1,28.5, C.rain, C.rain[2]),
    bolt:     (p) => gr(p,'bl', 8.7,17.1, 80.9,142.1, C.bolt),
    fog:      (p) => gr(p,'fg1', 96,-2.4, 168,122.3, C.fog) + gr(p,'fg2', 96,-50.4, 168,74.3, C.fog),
  };

  // ── Animated Symbol Definitions ───────────────────────────────
  const WS = {
    sunLg: (p) =>
      `<symbol id="${p}SL" viewBox="0 0 384 384">` +
      `<circle cx="192" cy="192" r="84" fill="url(#${p}sg)" stroke="${C.sun[2]}" stroke-miterlimit="10" stroke-width="6"/>` +
      `<path fill="none" stroke="${C.sun[0]}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="24" d="M192 61.7V12m0 360v-49.7m92.2-222.5 35-35M64.8 319.2l35.1-35.1m0-184.4-35-35m254.5 254.5-35.1-35.1M61.7 192H12m360 0h-49.7">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 192 192; 45 192 192"/>` +
      `</path></symbol>`,

    sun: (p) =>
      `<symbol id="${p}s" viewBox="0 0 196 196">` +
      `<circle cx="98" cy="98" r="49" fill="url(#${p}sg)" stroke="${C.sun[2]}" stroke-miterlimit="10" stroke-width="4"/>` +
      `<path fill="none" stroke="${C.sun[0]}" stroke-linecap="round" stroke-miterlimit="10" stroke-width="12" d="M98 24.3V6m0 184v-18.3M150.1 45.9l13-13M45.9 150.1l-13 13M45.9 45.9 33 33m130.1 130.1-13-13M6 98h18.3M190 98h-18.3">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 98 98; 45 98 98"/>` +
      `</path></symbol>`,

    moonLg: (p) =>
      `<symbol id="${p}ML" overflow="visible" viewBox="0 0 270 270">` +
      `<path fill="url(#${p}mg)" stroke="${C.moon[2]}" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" d="M252.3 168.6A133.4 133.4 0 01118 36.2 130.5 130.5 0 01122.5 3 133 133 0 003 134.6C3 207.7 63 267 137.2 267c62.5 0 114.8-42.2 129.8-99.2a135.6 135.6 0 01-14.8.8Z">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="-15 135 135; 9 135 135; -15 135 135"/>` +
      `</path></symbol>`,

    fullMoon: (p) =>
      `<symbol id="${p}fM" viewBox="0 0 196 196">` +
      `<circle cx="98" cy="98" r="49" fill="url(#${p}fm)" stroke="${C.moon[2]}" stroke-miterlimit="10" stroke-width="4"/>` +
      `</symbol>`,

    cloud: (p) =>
      `<symbol id="${p}c" viewBox="0 0 350 222">` +
      `<path fill="url(#${p}cg)" stroke="${C.cloud[2]}" stroke-miterlimit="10" stroke-width="6" d="m291 107-2.5.1A83.9 83.9 0 00135.6 43 56 56 0 0051 91a56.6 56.6 0 00.8 9A60 60 0 0063 219l4-.2v.2h224a56 56 0 000-112Z"/>` +
      `</symbol>`,

    dkcloud: (p) =>
      `<symbol id="${p}dc" viewBox="0 0 350 222">` +
      `<path fill="url(#${p}dg)" stroke="${C.dkcloud[2]}" stroke-miterlimit="10" stroke-width="6" d="m291 107-2.5.1A83.9 83.9 0 00135.6 43 56 56 0 0051 91a56.6 56.6 0 00.8 9A60 60 0 0063 219l4-.2v.2h224a56 56 0 000-112Z"/>` +
      `</symbol>`,

    bkcloud: (p) =>
      `<symbol id="${p}bc" viewBox="0 0 200.3 126.1">` +
      `<path fill="url(#${p}bkg)" stroke="${C.dkcloud[2]}" stroke-miterlimit="10" d="M.5 93.2a32.4 32.4 0 0032.4 32.4h129.8v-.1l2.3.1a34.8 34.8 0 006.5-68.9 32.4 32.4 0 00-48.5-33 48.6 48.6 0 00-88.6 37.1h-1.5A32.4 32.4 0 00.5 93.1Z"/>` +
      `</symbol>`,

    rain: (p) =>
      `<symbol id="${p}r" overflow="visible" viewBox="0 0 129 57">` +
      `<path fill="url(#${p}r1)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M8.5 56.5a8 8 0 01-8-8v-40a8 8 0 0116 0v40a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}rx1" additive="sum" attributeName="transform" begin="0s; ${p}rx1.end+.33s" dur=".67s" type="translate" values="0 -60; 0 60"/>` +
      `<animate id="${p}ry1" attributeName="opacity" begin="0s; ${p}ry1.end+.33s" dur=".67s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}r2)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M64.5 56.5a8 8 0 01-8-8v-40a8 8 0 0116 0v40a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}rx2" additive="sum" attributeName="transform" begin=".33s; ${p}rx2.end+.33s" dur=".67s" type="translate" values="0 -60; 0 60"/>` +
      `<animate id="${p}ry2" attributeName="opacity" begin=".33s; ${p}ry2.end+.33s" dur=".67s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}r3)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M120.5 56.5a8 8 0 01-8-8v-40a8 8 0 0116 0v40a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}rx3" additive="sum" attributeName="transform" begin="-.33s; ${p}rx3.end+.33s" dur=".67s" type="translate" values="0 -60; 0 60"/>` +
      `<animate id="${p}ry3" attributeName="opacity" begin="-.33s; ${p}ry3.end+.33s" dur=".67s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path></symbol>`,

    drizzle: (p) =>
      `<symbol id="${p}dz" overflow="visible" viewBox="0 0 129 29">` +
      `<path fill="url(#${p}d1)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M8.5 28.5a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}dx1" additive="sum" attributeName="transform" begin="0s; ${p}dx1.end+1s" dur="1s" keyTimes="0; .25; 1" type="translate" values="0 -32; 0 -32; 0 120"/>` +
      `<animate id="${p}dy1" attributeName="opacity" begin="0s; ${p}dy1.end+1s" dur="1s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}d2)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M64.5 28.5a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}dx2" additive="sum" attributeName="transform" begin="1.34s; ${p}dx2.end+1s" dur="1s" keyTimes="0; .25; 1" type="translate" values="0 -32; 0 -32; 0 120"/>` +
      `<animate id="${p}dy2" attributeName="opacity" begin="1.34s; ${p}dy2.end+1s" dur="1s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}d3)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M120.5 28.5a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}dx3" additive="sum" attributeName="transform" begin=".67s; ${p}dx3.end+1s" dur="1s" keyTimes="0; .25; 1" type="translate" values="0 -32; 0 -32; 0 120"/>` +
      `<animate id="${p}dy3" attributeName="opacity" begin=".67s; ${p}dy3.end+1s" dur="1s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path></symbol>`,

    flake: (p) =>
      `<symbol id="${p}f" overflow="visible" viewBox="0 0 156.2 49">` +
      `<g><path fill="url(#${p}f1)" stroke="${C.snow[2]}" stroke-miterlimit="10" d="m41.7 31-5.8-3.3a13.7 13.7 0 000-6.5l5.8-3.2a4 4 0 001.5-5.5 4 4 0 00-5.6-1.5l-5.8 3.3a13.6 13.6 0 00-2.6-2 13.8 13.8 0 00-3-1.3V4.5a4 4 0 00-8.1 0v6.6a14.3 14.3 0 00-5.7 3.2L6.6 11A4 4 0 001 12.5 4 4 0 002.5 18l5.8 3.3a13.7 13.7 0 000 6.5L2.5 31A4 4 0 001 36.5a4 4 0 003.5 2 4 4 0 002-.5l5.8-3.3a13.6 13.6 0 002.6 2 13.8 13.8 0 003 1.2v6.6a4 4 0 008.2 0v-6.6a14.2 14.2 0 005.6-3.2l6 3.3a4 4 0 002 .5 4 4 0 003.4-2 4 4 0 00-1.4-5.5ZM19 29.7a6 6 0 01-2.3-8.2 6.1 6.1 0 015.3-3 6.2 6.2 0 013 .8 6 6 0 012.2 8.2 6.1 6.1 0 01-8.2 2.2Z" opacity="0">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 24 24; 360 24 24"/>` +
      `<animate id="${p}t1" attributeName="opacity" begin="0s; ${p}t1.end+1s" dur="2s" keyTimes="0; .17; .83; 1" values="0; 1; 1; 0"/>` +
      `</path><animateTransform id="${p}s1" additive="sum" attributeName="transform" begin="0s; ${p}s1.end+1s" dur="2s" type="translate" values="0 -36; 0 92"/></g>` +
      `<g><path fill="url(#${p}f2)" stroke="${C.snow[2]}" stroke-miterlimit="10" d="m97.7 31-5.8-3.3a13.7 13.7 0 000-6.5l5.8-3.2a4 4 0 001.5-5.5 4 4 0 00-5.6-1.5l-5.8 3.3a13.6 13.6 0 00-2.6-2 13.8 13.8 0 00-3-1.3V4.5a4 4 0 00-8.1 0v6.6a14.3 14.3 0 00-5.7 3.2L62.6 11a4 4 0 00-5.6 1.5 4 4 0 001.5 5.5l5.8 3.3a13.7 13.7 0 000 6.5L58.5 31a4 4 0 00-1.5 5.5 4 4 0 003.5 2 4 4 0 002-.5l5.8-3.3a13.6 13.6 0 002.7 2 13.8 13.8 0 003 1.2v6.6a4 4 0 008 0v-6.6a14.2 14.2 0 005.7-3.2l6 3.3a4 4 0 002 .5 4 4 0 003.4-2 4 4 0 00-1.4-5.5ZM75 29.7a6 6 0 01-2.3-8.2 6.1 6.1 0 015.3-3 6.2 6.2 0 013 .8 6 6 0 012.2 8.2 6.1 6.1 0 01-8.2 2.2Z" opacity="0">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 80 24; 360 80 24"/>` +
      `<animate id="${p}t2" attributeName="opacity" begin="-.83s; ${p}t2.end+1s" dur="2s" keyTimes="0; .17; .83; 1" values="0; 1; 1; 0"/>` +
      `</path><animateTransform id="${p}s2" additive="sum" attributeName="transform" begin="-.83s; ${p}s2.end+1s" dur="2s" type="translate" values="0 -36; 0 92"/></g>` +
      `<g><path fill="url(#${p}f3)" stroke="${C.snow[2]}" stroke-miterlimit="10" d="m153.7 31-5.8-3.3a13.7 13.7 0 000-6.5l5.8-3.2a4 4 0 001.5-5.5 4 4 0 00-5.6-1.5l-5.8 3.3a13.6 13.6 0 00-2.6-2 13.8 13.8 0 00-3-1.3V4.5a4 4 0 00-8.1 0v6.6a14.3 14.3 0 00-5.7 3.2l-5.8-3.3a4 4 0 00-5.6 1.5 4 4 0 001.5 5.5l5.8 3.3a13.7 13.7 0 000 6.5l-5.8 3.2a4 4 0 00-1.5 5.5 4 4 0 003.5 2 4 4 0 002-.5l5.8-3.3a13.6 13.6 0 002.7 2 13.8 13.8 0 003 1.2v6.6a4 4 0 008 0v-6.6a14.2 14.2 0 005.7-3.2l5.8 3.3a4 4 0 002 .5 4 4 0 003.5-2 4 4 0 00-1.3-5.5ZM131 29.7a6 6 0 01-2.3-8.2 6.1 6.1 0 015.3-3 6.2 6.2 0 013 .8 6 6 0 012.2 8.2 6.1 6.1 0 01-8.2 2.2Z" opacity="0">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 136 24; 360 136 24"/>` +
      `<animate id="${p}t3" attributeName="opacity" begin=".83s; ${p}t3.end+1s" dur="2s" keyTimes="0; .17; .83; 1" values="0; 1; 1; 0"/>` +
      `</path><animateTransform id="${p}s3" additive="sum" attributeName="transform" begin=".83s; ${p}s3.end+1s" dur="2s" type="translate" values="0 -36; 0 92"/></g>` +
      `</symbol>`,

    hail: (p) =>
      `<symbol id="${p}ha" overflow="visible" viewBox="0 0 137 25">` +
      `<path fill="url(#${p}h1)" stroke="${C.hail[2]}" stroke-miterlimit="10" d="M12.5.5a12 12 0 1012 12 12 12 0 00-12-12Z" opacity="0">` +
      `<animateTransform id="${p}hx1" additive="sum" attributeName="transform" begin="0s; ${p}hx1.end+.42s" dur=".58s" keyTimes="0; .71; 1" type="translate" values="0 -46; 0 86; -18 74"/>` +
      `<animate id="${p}hy1" attributeName="opacity" begin="0s; ${p}hy1.end+.42s" dur=".58s" keyTimes="0; .14; .71; 1" values="0; 1; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}h2)" stroke="${C.hail[2]}" stroke-miterlimit="10" d="M68.5.5a12 12 0 1012 12 12 12 0 00-12-12Z" opacity="0">` +
      `<animateTransform id="${p}hx2" additive="sum" attributeName="transform" begin=".67s; ${p}hx2.end+.42s" dur=".58s" keyTimes="0; .71; 1" type="translate" values="0 -46; 0 86; 0 74"/>` +
      `<animate id="${p}hy2" attributeName="opacity" begin=".67s; ${p}hy2.end+.42s" dur=".58s" keyTimes="0; .14; .71; 1" values="0; 1; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}h3)" stroke="${C.hail[2]}" stroke-miterlimit="10" d="M124.5.5a12 12 0 1012 12 12 12 0 00-12-12Z" opacity="0">` +
      `<animateTransform id="${p}hx3" additive="sum" attributeName="transform" begin=".33s; ${p}hx3.end+.42s" dur=".58s" keyTimes="0; .71; 1" type="translate" values="0 -46; 0 86; 18 74"/>` +
      `<animate id="${p}hy3" attributeName="opacity" begin=".33s; ${p}hy3.end+.42s" dur=".58s" keyTimes="0; .14; .71; 1" values="0; 1; 1; 0"/>` +
      `</path></symbol>`,

    sleet: (p) =>
      `<symbol id="${p}st" overflow="visible" viewBox="0 0 156.2 49">` +
      `<g><path fill="url(#${p}f1)" stroke="${C.snow[2]}" stroke-miterlimit="10" d="m41.7 31-5.8-3.3a13.7 13.7 0 000-6.5l5.8-3.2a4 4 0 001.5-5.5 4 4 0 00-5.6-1.5l-5.8 3.3a13.6 13.6 0 00-2.6-2 13.8 13.8 0 00-3-1.3V4.5a4 4 0 00-8.1 0v6.6a14.3 14.3 0 00-5.7 3.2L6.6 11A4 4 0 001 12.5 4 4 0 002.5 18l5.8 3.3a13.7 13.7 0 000 6.5L2.5 31A4 4 0 001 36.5a4 4 0 003.5 2 4 4 0 002-.5l5.8-3.3a13.6 13.6 0 002.6 2 13.8 13.8 0 003 1.2v6.6a4 4 0 008.2 0v-6.6a14.2 14.2 0 005.6-3.2l6 3.3a4 4 0 002 .5 4 4 0 003.4-2 4 4 0 00-1.4-5.5ZM19 29.7a6 6 0 01-2.3-8.2 6.1 6.1 0 015.3-3 6.2 6.2 0 013 .8 6 6 0 012.2 8.2 6.1 6.1 0 01-8.2 2.2Z" opacity="0">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 24 24; 360 24 24"/>` +
      `<animate id="${p}u1" attributeName="opacity" begin="0s; ${p}u1.end+1s" dur="2s" keyTimes="0; .17; .83; 1" values="0; 1; 1; 0"/>` +
      `</path><animateTransform id="${p}v1" additive="sum" attributeName="transform" begin="0s; ${p}v1.end+1s" dur="2s" type="translate" values="0 -36; 0 92"/></g>` +
      `<g><path fill="url(#${p}f2)" stroke="${C.snow[2]}" stroke-miterlimit="10" d="m97.7 31-5.8-3.3a13.7 13.7 0 000-6.5l5.8-3.2a4 4 0 001.5-5.5 4 4 0 00-5.6-1.5l-5.8 3.3a13.6 13.6 0 00-2.6-2 13.8 13.8 0 00-3-1.3V4.5a4 4 0 00-8.1 0v6.6a14.3 14.3 0 00-5.7 3.2L62.6 11a4 4 0 00-5.6 1.5 4 4 0 001.5 5.5l5.8 3.3a13.7 13.7 0 000 6.5L58.5 31a4 4 0 00-1.5 5.5 4 4 0 003.5 2 4 4 0 002-.5l5.8-3.3a13.6 13.6 0 002.7 2 13.8 13.8 0 003 1.2v6.6a4 4 0 008 0v-6.6a14.2 14.2 0 005.7-3.2l6 3.3a4 4 0 002 .5 4 4 0 003.4-2 4 4 0 00-1.4-5.5ZM75 29.7a6 6 0 01-2.3-8.2 6.1 6.1 0 015.3-3 6.2 6.2 0 013 .8 6 6 0 012.2 8.2 6.1 6.1 0 01-8.2 2.2Z" opacity="0">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 80 24; 360 80 24"/>` +
      `<animate id="${p}u2" attributeName="opacity" begin="-.83s; ${p}u2.end+1s" dur="2s" keyTimes="0; .17; .83; 1" values="0; 1; 1; 0"/>` +
      `</path><animateTransform id="${p}v2" additive="sum" attributeName="transform" begin="-.83s; ${p}v2.end+1s" dur="2s" type="translate" values="0 -36; 0 92"/></g>` +
      `<g><path fill="url(#${p}f3)" stroke="${C.snow[2]}" stroke-miterlimit="10" d="m153.7 31-5.8-3.3a13.7 13.7 0 000-6.5l5.8-3.2a4 4 0 001.5-5.5 4 4 0 00-5.6-1.5l-5.8 3.3a13.6 13.6 0 00-2.6-2 13.8 13.8 0 00-3-1.3V4.5a4 4 0 00-8.1 0v6.6a14.3 14.3 0 00-5.7 3.2l-5.8-3.3a4 4 0 00-5.6 1.5 4 4 0 001.5 5.5l5.8 3.3a13.7 13.7 0 000 6.5l-5.8 3.2a4 4 0 00-1.5 5.5 4 4 0 003.5 2 4 4 0 002-.5l5.8-3.3a13.6 13.6 0 002.7 2 13.8 13.8 0 003 1.2v6.6a4 4 0 008 0v-6.6a14.2 14.2 0 005.7-3.2l5.8 3.3a4 4 0 002 .5 4 4 0 003.5-2 4 4 0 00-1.3-5.5ZM131 29.7a6 6 0 01-2.3-8.2 6.1 6.1 0 015.3-3 6.2 6.2 0 013 .8 6 6 0 012.2 8.2 6.1 6.1 0 01-8.2 2.2Z" opacity="0">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="rotate" values="0 136 24; 360 136 24"/>` +
      `<animate id="${p}u3" attributeName="opacity" begin=".83s; ${p}u3.end+1s" dur="2s" keyTimes="0; .17; .83; 1" values="0; 1; 1; 0"/>` +
      `</path><animateTransform id="${p}v3" additive="sum" attributeName="transform" begin=".83s; ${p}v3.end+1s" dur="2s" type="translate" values="0 -36; 0 92"/></g>` +
      `<path fill="url(#${p}sr1)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M22.1 28.5a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}sdx1" additive="sum" attributeName="transform" begin=".5s; ${p}sdx1.end+1s" dur="1s" keyTimes="0; .25; 1" type="translate" values="0 -32; 0 -32; 0 120"/>` +
      `<animate id="${p}sdy1" attributeName="opacity" begin=".5s; ${p}sdy1.end+1s" dur="1s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}sr2)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M78.1 28.5a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}sdx2" additive="sum" attributeName="transform" begin="1.5s; ${p}sdx2.end+1s" dur="1s" keyTimes="0; .25; 1" type="translate" values="0 -32; 0 -32; 0 120"/>` +
      `<animate id="${p}sdy2" attributeName="opacity" begin="1.5s; ${p}sdy2.end+1s" dur="1s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path>` +
      `<path fill="url(#${p}sr3)" stroke="${C.rain[2]}" stroke-miterlimit="10" d="M134.1 28.5a8 8 0 01-8-8v-12a8 8 0 0116 0v12a8 8 0 01-8 8Z" opacity="0">` +
      `<animateTransform id="${p}sdx3" additive="sum" attributeName="transform" begin="1s; ${p}sdx3.end+1s" dur="1s" keyTimes="0; .25; 1" type="translate" values="0 -32; 0 -32; 0 120"/>` +
      `<animate id="${p}sdy3" attributeName="opacity" begin="1s; ${p}sdy3.end+1s" dur="1s" keyTimes="0; .25; 1" values="0; 1; 0"/>` +
      `</path></symbol>`,

    bolt: (p) =>
      `<symbol id="${p}b" viewBox="0 0 102.7 186.8">` +
      `<path fill="url(#${p}bl)" stroke="${C.bolt[2]}" stroke-miterlimit="10" stroke-width="4" d="m34.8 2-32 96h32l-16 80 80-112h-48l32-64h-48z">` +
      `<animate id="${p}bk" attributeName="opacity" begin="0s; ${p}bk.end+.67s" dur="1.33s" keyTimes="0; .38; .5; .63; .75; .86; .94; 1" values="1; 1; 0; 1; 0; 1; 0; 1"/>` +
      `</path></symbol>`,

    fog: (p) =>
      `<symbol id="${p}fg" overflow="visible" viewBox="0 0 264 72">` +
      `<path fill="none" stroke="url(#${p}fg1)" stroke-linecap="round" stroke-miterlimit="10" stroke-width="24" d="M12 60h240">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="translate" values="-24 0; 24 0; -24 0"/>` +
      `</path>` +
      `<path fill="none" stroke="url(#${p}fg2)" stroke-linecap="round" stroke-miterlimit="10" stroke-width="24" d="M12 12h240">` +
      `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="translate" values="24 0; -24 0; 24 0"/>` +
      `</path></symbol>`,
  };

  // ── Weather Compositions (512×512, golden ratio) ──────────────
  const WEATHER = {
    'clear-day': {
      defs: ['sunLg'], syms: ['sunLg'],
      body: (p) => `<use href="#${p}SL" width="350" height="350" transform="translate(81 81)"/>`
    },
    'clear-night': {
      defs: ['moonLg'], syms: ['moonLg'],
      body: (p) => `<use href="#${p}ML" width="282" height="282" transform="translate(115 115)"/>`
    },
    'partly-cloudy-day': {
      defs: ['sun', 'cloud'], syms: ['sun', 'cloud'],
      body: (p) =>
        `<use href="#${p}s" width="216" height="216" transform="translate(58 99)"/>` +
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>`
    },
    'partly-cloudy-night': {
      defs: ['fullMoon', 'cloud'], syms: ['fullMoon', 'cloud'],
      body: (p) =>
        `<use href="#${p}fM" width="256" height="256" transform="translate(38 79)"/>` +
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>`
    },
    'overcast': {
      defs: ['cloud', 'bkcloud'], syms: ['cloud', 'bkcloud'],
      body: (p) =>
        `<use href="#${p}bc" width="216" height="136" transform="translate(271 172)">` +
        `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="translate" values="-9 0; 9 0; -9 0"/>` +
        `</use>` +
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)">` +
        `<animateTransform additive="sum" attributeName="transform" dur="6s" repeatCount="indefinite" type="translate" values="-18 0; 18 0; -18 0"/>` +
        `</use>`
    },
    'fog': {
      defs: ['cloud', 'fog'], syms: ['cloud', 'fog'],
      body: (p) =>
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}fg" width="216" height="59" transform="translate(148 402)"/>`
    },
    'drizzle': {
      defs: ['cloud', 'drizzle'], syms: ['cloud', 'drizzle'],
      body: (p) =>
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}dz" width="134" height="30.1" transform="translate(189 347.5)"/>`
    },
    'rain': {
      defs: ['cloud', 'rain'], syms: ['cloud', 'rain'],
      body: (p) =>
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}r" width="134" height="59.2" transform="translate(189 343.5)"/>`
    },
    'sleet': {
      defs: ['cloud', 'flake', 'sleetDrop'], syms: ['cloud', 'sleet'],
      body: (p) =>
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}st" width="134" height="42" transform="translate(189 337.5)"/>`
    },
    'snow': {
      defs: ['cloud', 'flake'], syms: ['cloud', 'flake'],
      body: (p) =>
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}f" width="134" height="42" transform="translate(189 337.5)"/>`
    },
    'hail': {
      defs: ['cloud', 'hail'], syms: ['cloud', 'hail'],
      body: (p) =>
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}ha" width="134" height="24.5" transform="translate(189 349.5)"/>`
    },
    'thunderstorm': {
      defs: ['dkcloud', 'bolt'], syms: ['dkcloud', 'bolt'],
      body: (p) =>
        `<use href="#${p}dc" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}b" width="92.5" height="168.2" transform="translate(209.75 291)"/>`
    },
    'thunderstorm-rain': {
      defs: ['cloud', 'rain', 'bolt'], syms: ['cloud', 'rain', 'bolt'],
      body: (p) =>
        `<use href="#${p}c" width="350" height="222" transform="translate(81 145)"/>` +
        `<use href="#${p}r" width="134" height="59.2" transform="translate(189 343.5)"/>` +
        `<use href="#${p}b" width="92.5" height="168.2" transform="translate(209.75 291)"/>`
    },
  };

  // ── WMO Code → Icon Key ───────────────────────────────────────
  const weatherCodeToKey = (code, isDay) => {
    if (code <= 1) return isDay ? 'clear-day' : 'clear-night';
    if (code === 2) return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
    if (code === 3) return 'overcast';
    if (code === 45 || code === 48) return 'fog';
    if (code >= 51 && code <= 55) return 'drizzle';
    if (code === 56 || code === 57 || code === 66 || code === 67) return 'sleet';
    if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if (code === 96) return 'hail';
    if (code === 95 || code === 99) return 'thunderstorm';
    return 'overcast';
  };

  // ── Icon Factory ──────────────────────────────────────────────
  const makeWeatherIcon = (code, isDay) => {
    const p = 'w' + (_wn++) + '_';
    const key = weatherCodeToKey(code, isDay);
    const w = WEATHER[key];
    const defs = w.defs.map(k => WG[k](p)).join('') + w.syms.map(k => WS[k](p)).join('');
    const str = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" class="weather-icon"><defs>${defs}</defs>${w.body(p)}</svg>`;
    return svgToEl(str);
  };

  // ── Animation Control ─────────────────────────────────────────
  const pauseWeatherAnimations = (container) => {
    container.querySelectorAll('svg').forEach(svg => {
      if (typeof svg.animationsPaused === 'function' && !svg.animationsPaused()) svg.pauseAnimations();
    });
  };

  const resumeWeatherAnimations = (container) => {
    container.querySelectorAll('svg').forEach(svg => {
      if (typeof svg.animationsPaused === 'function' && svg.animationsPaused()) svg.unpauseAnimations();
    });
  };

  const observeWeatherVisibility = (container) => {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) resumeWeatherAnimations(entry.target);
        else pauseWeatherAnimations(entry.target);
      }
    }, { threshold: 0 });
    observer.observe(container);
    return observer;
  };

  // ── i18n ──────────────────────────────────────────────────────
  const weatherCodeToDesc = (code) => {
    const key = `weather.code.${code}`;
    const val = t(key);
    return val !== key ? val : t('weather.unknown');
  };

  // ── Condition Tinting ────────────────────────────────────────
  // ── Temperature Color ────────────────────────────────────────
  // Derived from the illustration palette C, darkened for text
  // contrast on white (all pass WCAG 3:1 for large bold text).
  //   Freezing: C.rain[1] #4a90cc darkened (H:210, L:55→38)
  //   Cold:     C.rain[1] #4a90cc direct
  //   Mild:     C.snow[1] #6eb0ca darkened (H:197, L:61→44)
  //   Warm:     C.sun[1]  #d49408 darkened (H:41,  L:43→34)
  //   Hot:      C.bolt[1] #f59e0b hue-shifted to H:15, darkened
  const tempColor = (celsius) => {
    if (celsius <= 0)  return '#2c6a99';  // freezing — darkened rain blue
    if (celsius <= 10) return '#4a90cc';  // cold — rain blue direct
    if (celsius <= 20) return '#3d8a9e';  // mild — darkened snow blue
    if (celsius <= 30) return '#a07208';  // warm — darkened sun gold
    return '#b04210';                      // hot — bolt hue → red, darkened
  };

  // ── Rendering ─────────────────────────────────────────────────
  const renderWeather = (body, data) => {
    const current = data.current_weather;
    const daily = data.daily;
    body.textContent = '';

    // Hero: current conditions (horizontal layout)
    const curDiv = document.createElement('div');
    curDiv.className = 'weather-current';
    curDiv.appendChild(makeWeatherIcon(current.weathercode, current.is_day));

    const info = document.createElement('div');
    info.className = 'weather-info';

    const tempEl = document.createElement('div');
    tempEl.className = 'weather-temp';
    tempEl.style.color = tempColor(current.temperature);
    tempEl.textContent = mpFormatTemp(current.temperature);
    info.appendChild(tempEl);

    const descEl = document.createElement('div');
    descEl.className = 'weather-desc';
    descEl.textContent = weatherCodeToDesc(current.weathercode);
    info.appendChild(descEl);

    if (daily.time.length > 0) {
      const hiloEl = document.createElement('div');
      hiloEl.className = 'weather-hilo';
      hiloEl.textContent = `H: ${mpFormatTempShort(daily.temperature_2m_max[0])}  L: ${mpFormatTempShort(daily.temperature_2m_min[0])}`;
      info.appendChild(hiloEl);
    }
    curDiv.appendChild(info);
    body.appendChild(curDiv);

    // Forecast strip — future days only (hero is today)
    const forecast = document.createElement('div');
    forecast.className = 'weather-forecast';
    for (let i = 1; i < daily.time.length; i++) {
      const date = new Date(daily.time[i] + 'T00:00:00');
      const dayName = date.toLocaleDateString(undefined, { weekday: 'short' });

      const dayDiv = document.createElement('div');
      dayDiv.className = 'weather-day';

      const nameEl = document.createElement('div');
      nameEl.className = 'weather-day-name';
      nameEl.textContent = dayName;
      dayDiv.appendChild(nameEl);

      dayDiv.appendChild(makeWeatherIcon(daily.weathercode[i], 1));

      const dayHiEl = document.createElement('div');
      dayHiEl.className = 'weather-day-temp';
      dayHiEl.style.color = tempColor(daily.temperature_2m_max[i]);
      dayHiEl.textContent = mpFormatTempShort(daily.temperature_2m_max[i]);
      dayDiv.appendChild(dayHiEl);

      const dayLoEl = document.createElement('div');
      dayLoEl.className = 'weather-day-low';
      dayLoEl.textContent = mpFormatTempShort(daily.temperature_2m_min[i]);
      dayDiv.appendChild(dayLoEl);

      forecast.appendChild(dayDiv);
    }
    body.appendChild(forecast);

    // Auto-pause animations when weather window is not visible
    observeWeatherVisibility(body);
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
          const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${flatLat}&longitude=${flatLon}&daily=temperature_2m_max,temperature_2m_min,weathercode&current_weather=true&timezone=auto&forecast_days=4`);
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
