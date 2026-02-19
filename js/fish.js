/* Fish of the Day & Fish Finder */
(function () {
'use strict';

/* ── Globals from other modules ── */
const { openWindow, getLocation, loadDataScript, showErrorPanel, showLoadingMessage, t } = window;

/* ── Internal state ── */
let fishPopulated = false;

/* ── Haversine distance (km) ── */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* ── Format distance in km and mi ── */
const formatFinderDistance = (km) => {
  const mi = km * 0.621371;
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km (${mi.toLocaleString(undefined, { maximumFractionDigits: 0 })} mi)`;
};

/* ── Fish of the Day ── */

function populateFish() {
  if (fishPopulated) return;
  fishPopulated = true;

  const f = FISH_TODAY;
  const fishPhoto = document.getElementById('fishPhoto');
  const photoPlaceholder = document.getElementById('photoPlaceholder');
  const fishName = document.getElementById('fishName');
  const fishScientific = document.getElementById('fishScientific');
  const fishDetails = document.getElementById('fishDetails');
  const fishDateText = document.getElementById('fishDateText');

  /* Reset UI for day-change re-population (harmless on first run) */
  fishDetails.textContent = '';
  fishPhoto.style.display = 'none';
  fishPhoto.removeAttribute('src');
  photoPlaceholder.textContent = t('fish.loadingImage');
  photoPlaceholder.style.display = '';
  fishName.onclick = null;
  fishName.classList.remove('linked');
  delete fishName.dataset.linked;

  const sciName = `${f[1]} ${f[2]}`;
  fishName.textContent = f[0];
  fishScientific.textContent = sciName;

  const now = new Date();
  fishDateText.textContent = now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

  const addDetail = (label, value) => {
    if (!value && value !== 0) return;
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    fishDetails.appendChild(dt);
    fishDetails.appendChild(dd);
  };

  addDetail(t('fish.family'), f[3]);
  addDetail(t('fish.order'), f[4]);
  if (f[5]) addDetail(t('fish.maxSize'), `${f[5]} cm`);
  addDetail(t('fish.habitat'), f[6]);
  addDetail(t('fish.depth'), f[7]);

  const wikiTitle = `${f[1]}_${f[2]}`;

  const linkFishName = (title) => {
    if (fishName.dataset.linked) return;
    fishName.dataset.linked = '1';
    fishName.classList.add('linked');
    fishName.title = t('fish.openInBrowser');
    fishName.onclick = () => {
      window.openBrowser();
      window.browserNavigate(`https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`);
    };
  };

  // todayKey() and FISH_TODAY are defined in fish-data.js (loaded via <script defer>)
  const fishId = `${f[1]}_${f[2]}`;
  const wikiLinkKey = `fotd-wiki-${todayKey()}-${fishId}`;

  const cachedWikiLink = localStorage.getItem(wikiLinkKey);
  if (cachedWikiLink) linkFishName(cachedWikiLink);

  /* Check wiki page for clickable link to WikiBrowser */
  const fetchWikiLink = async (title) => {
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
    if (!r.ok) throw 0;
    await r.json();
    localStorage.setItem(wikiLinkKey, title);
    linkFishName(title);
  };

  const showFishImage = (src) => {
    fishPhoto.alt = `${f[0]} (${sciName})`;
    /* Route through wsrv.nl image proxy to bypass iOS ITP blocking
       of upload.wikimedia.org (Wikimedia sets SameSite=None cookies
       that cause WebKit to reject the entire resource load). */
    const proxied = src.indexOf('upload.wikimedia.org') !== -1
      ? `https://wsrv.nl/?url=${encodeURIComponent(src)}`
      : src;
    fishPhoto.onload = () => {
      fishPhoto.style.display = 'block';
      photoPlaceholder.style.display = 'none';
    };
    fishPhoto.onerror = () => {
      photoPlaceholder.textContent = t('fish.photoUnavailable');
    };
    fishPhoto.src = proxied;
  };

  /* f[8] is guaranteed non-empty by FISH_WITH_PHOTOS filter in fish-data.js */
  if (f[8]) {
    showFishImage(f[8]);
  } else {
    photoPlaceholder.textContent = t('fish.noPhoto');
  }
  if (!cachedWikiLink) fetchWikiLink(wikiTitle)
    .catch(() => fetchWikiLink(f[0].replace(/ /g, '_')))
    .catch(() => {});
}

async function openFishOfDay() {
  openWindow('fishofday');
  await loadDataScript('js/fish-data.js?v=2');
  if (checkFishDay()) fishPopulated = false;
  populateFish();
}

/* ── Fish Finder ── */

function populateFishFinder() {
  const body = document.getElementById('fishFinderBody');
  const status = document.getElementById('fishFinderStatus');

  showLoadingMessage(body, t('finder.locating'));
  status.textContent = '';

  getLocation(
    (lat, lon) => {
      let nearest = null;
      let furthest = null;
      let minDist = Infinity;
      let maxDist = -1;

      for (let i = 0; i < AQUARIUMS.length; i++) {
        const d = haversineDistance(lat, lon, AQUARIUMS[i][2], AQUARIUMS[i][3]);
        if (d < minDist) { minDist = d; nearest = AQUARIUMS[i]; }
        if (d > maxDist) { maxDist = d; furthest = AQUARIUMS[i]; }
      }

      const finderCard = (aq, dist) => {
        const card = document.createElement('div');
        card.className = 'sunken finder-card';
        const nameEl = document.createElement('div');
        nameEl.className = 'finder-name';
        if (aq[4]) {
          const link = document.createElement('a');
          link.href = aq[4];
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = aq[0];
          nameEl.appendChild(link);
        } else {
          nameEl.textContent = aq[0];
        }
        card.appendChild(nameEl);
        const locEl = document.createElement('div');
        locEl.className = 'finder-location';
        locEl.textContent = aq[1];
        card.appendChild(locEl);
        const distEl = document.createElement('div');
        distEl.className = 'finder-distance';
        distEl.textContent = formatFinderDistance(dist);
        card.appendChild(distEl);
        return card;
      };

      body.textContent = '';
      const wrap = document.createElement('div');
      wrap.className = 'finder-wrap';
      const nearLabel = document.createElement('div');
      nearLabel.className = 'finder-label';
      nearLabel.textContent = t('finder.nearest');
      wrap.appendChild(nearLabel);
      wrap.appendChild(finderCard(nearest, minDist));
      const farLabel = document.createElement('div');
      farLabel.className = 'finder-label';
      farLabel.textContent = t('finder.furthest');
      wrap.appendChild(farLabel);
      wrap.appendChild(finderCard(furthest, maxDist));
      body.appendChild(wrap);

      status.textContent = t('finder.dbCount', { count: AQUARIUMS.length });
    },
    (msg) => {
      showErrorPanel(body, msg, 'al-tri-ff');
    }
  );
}

async function openFishFinder() {
  openWindow('fishfinder');
  await loadDataScript('js/aquarium-data.js');
  populateFishFinder();
}

/* ── Register with core ── */
mpRegisterActions({ openFishOfDay, openFishFinder });
mpRegisterWindows({ fishofday: 'Fish of the Day', fishfinder: 'Fish Finder' });

/* ── Export to window ── */
window.openFishOfDay = openFishOfDay;
window.openFishFinder = openFishFinder;

})();
