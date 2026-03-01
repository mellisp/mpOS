/* Service Worker — Cache shell resources, network-first for APIs */
(function () {
'use strict';

var CACHE_PREFIX = 'mpos-';
var currentVersion = null;

var SHELL_FILES = [
  './',
  'css/theme.css',
  'css/page.css',
  'js/i18n.js',
  'lang/pt.js',
  'js/audio.js',
  'js/taskbar.js',
  'js/core.js',
  'js/storage.js',
  'js/net.js',
  'js/audio-bus.js',
  'js/explorer.js',
  'js/system.js',
  'js/notepad.js',
  'js/calculator.js',
  'js/paint.js',
  'js/terminal.js',
  'js/calendar.js',
  'js/weather.js',
  'js/games.js',
  'js/fish.js',
  'js/browser.js',
  'js/media.js',
  'js/reverb.js',
  'js/sound-producer.js',
  'js/synth.js',
  'js/chat.js',
  'js/photobooth.js',
  'js/utilities.js',
  'js/data-apps.js',
  'js/search.js',
  'js/desktop.js',
  'favicon.svg'
];

var DATA_FILES = [
  'js/world-map-data.js',
  'js/aquarium-data.js',
  'js/help-data.js'
];

/* Hosts that must always go to network (never cache) */
var NEVER_CACHE_HOSTS = ['mpos-chat.matthewpritchard.workers.dev'];

/* External API endpoints — network-first with stale fallback */
var API_TIMEOUTS = {
  'api.open-meteo.com': 8000,
  'api.nasa.gov': 15000,
  'en.wikipedia.org': 5000,
  'en.m.wikipedia.org': 5000,
  'visitor-map.matthewpritchard.workers.dev': 8000
};

function shellCacheName(ver) { return CACHE_PREFIX + 'shell-v' + ver; }
function dataCacheName(ver) { return CACHE_PREFIX + 'data-v' + ver; }
function apiCacheName() { return CACHE_PREFIX + 'api'; }

/* ── Install ── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    fetch('version.json')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        currentVersion = d.version || '0';
        return Promise.all([
          caches.open(shellCacheName(currentVersion)).then(function (cache) {
            return cache.addAll(SHELL_FILES);
          }),
          caches.open(dataCacheName(currentVersion)).then(function (cache) {
            return cache.addAll(DATA_FILES);
          })
        ]);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

/* ── Activate — clean old caches ── */
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) {
          if (k.indexOf(CACHE_PREFIX) !== 0) return false;
          if (currentVersion && (k === shellCacheName(currentVersion) || k === dataCacheName(currentVersion) || k === apiCacheName())) return false;
          return true;
        }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* ── Fetch handler ── */
self.addEventListener('fetch', function (event) {
  var request = event.request;
  var url = new URL(request.url);

  /* POST requests — always network */
  if (request.method !== 'GET') return;

  /* Never-cache hosts (chat) — passthrough */
  for (var i = 0; i < NEVER_CACHE_HOSTS.length; i++) {
    if (url.hostname === NEVER_CACHE_HOSTS[i]) return;
  }

  /* Cache-bust URLs (version.json?_=*) — always network */
  if (url.searchParams.has('_')) return;

  /* Same-origin resources — cache-first with background update */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        /* Background update: fetch fresh copy and update cache */
        var fetchPromise = fetch(request).then(function (response) {
          if (response.ok) {
            caches.open(shellCacheName(currentVersion || '0')).then(function (cache) {
              cache.put(request, response);
            });
          }
          return response.clone();
        }).catch(function () { return cached; });

        return cached || fetchPromise;
      })
    );
    return;
  }

  /* External API — network-first with timeout, stale cache fallback */
  var timeout = API_TIMEOUTS[url.hostname];
  if (timeout) {
    event.respondWith(
      networkFirstWithTimeout(request, timeout)
    );
    return;
  }

  /* Everything else — network only (ipapi.co, etc.) */
});

function networkFirstWithTimeout(request, timeoutMs) {
  return new Promise(function (resolve) {
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      caches.match(request).then(function (cached) {
        resolve(cached || new Response('Network timeout', { status: 504, statusText: 'Gateway Timeout' }));
      });
    }, timeoutMs);

    fetch(request).then(function (response) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (response.ok) {
        var clone = response.clone();
        caches.open(apiCacheName()).then(function (cache) {
          cache.put(request, clone);
        });
      }
      resolve(response);
    }).catch(function () {
      if (done) return;
      done = true;
      clearTimeout(timer);
      caches.match(request).then(function (cached) {
        resolve(cached || new Response('Network error', { status: 503, statusText: 'Service Unavailable' }));
      });
    });
  });
}

/* ── Version check message from core.js ── */
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'VERSION_CHECK') {
    var newVersion = event.data.version;
    if (currentVersion && newVersion && newVersion !== currentVersion) {
      currentVersion = newVersion;
      /* Re-cache shell with new version */
      caches.open(shellCacheName(newVersion)).then(function (cache) {
        return cache.addAll(SHELL_FILES.concat(DATA_FILES));
      }).then(function () {
        /* Clean old caches */
        return caches.keys();
      }).then(function (keys) {
        return Promise.all(
          keys.filter(function (k) {
            return k.indexOf(CACHE_PREFIX) === 0 &&
                   k !== shellCacheName(newVersion) &&
                   k !== dataCacheName(newVersion) &&
                   k !== apiCacheName();
          }).map(function (k) { return caches.delete(k); })
        );
      });
    }
  }
});
})();
