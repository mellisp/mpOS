/* Net — Fetch wrapper with timeout and deduplication */
(function () {
'use strict';

var inflight = new Map();

/**
 * mpFetch(url, opts) — drop-in fetch() replacement
 *
 * opts.timeout  — ms before AbortController fires (default 10000)
 * opts.dedup    — coalesce concurrent GETs to same URL (default false)
 *
 * All other opts pass through to fetch(). Returns a Response.
 */
function mpFetch(url, opts) {
  if (!opts) opts = {};
  var method = (opts.method || 'GET').toUpperCase();
  var canDedup = opts.dedup && method === 'GET';

  if (canDedup && inflight.has(url)) {
    return inflight.get(url).then(function (r) { return r.clone(); });
  }

  var controller = new AbortController();
  var timeoutMs = opts.timeout != null ? opts.timeout : 10000;
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs);

  if (opts.signal) {
    opts.signal.addEventListener('abort', function () { controller.abort(); });
  }

  var fetchOpts = { signal: controller.signal };
  if (opts.method) fetchOpts.method = opts.method;
  if (opts.body) fetchOpts.body = opts.body;
  if (opts.headers) fetchOpts.headers = opts.headers;
  if (opts.mode) fetchOpts.mode = opts.mode;
  if (opts.cache) fetchOpts.cache = opts.cache;

  var promise = fetch(url, fetchOpts)
    .then(function (r) { clearTimeout(timer); return r; })
    .catch(function (e) { clearTimeout(timer); throw e; })
    .finally(function () { if (canDedup) inflight.delete(url); });

  if (canDedup) inflight.set(url, promise);
  return promise;
}

window.mpFetch = mpFetch;
})();
