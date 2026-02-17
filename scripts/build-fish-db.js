#!/usr/bin/env node

/**
 * Build Fish of the Day Database
 *
 * Fetches Wikipedia thumbnail URLs for the fish species in js/fish-data.js
 * and bakes them into the dataset so the page needs zero API calls at runtime.
 *
 * Usage:
 *   node scripts/build-fish-db.js
 *
 * Requires: Node.js 14+, internet access
 * Runtime:  ~1-2 minutes
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const WIKI_MEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/media-list/";
const DATA_PATH = path.join(__dirname, "..", "js", "fish-data.js");
const CONCURRENCY = 4;
const DELAY = 250;
const MAX_RETRIES = 2;

/* ── HTTP helper with retries ──────────────────────────── */

function get(url, retries) {
  if (retries === undefined) retries = MAX_RETRIES;
  return new Promise((resolve) => {
    https.get(url, {
      headers: { "User-Agent": "FishOfTheDay/1.0 (matthewpritchard.com)" },
      timeout: 10000
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location, retries).then(resolve);
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      var body = "";
      res.on("data", function (c) { body += c; });
      res.on("end", function () {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
      });
    }).on("error", function () {
      if (retries > 0) {
        setTimeout(function () {
          get(url, retries - 1).then(resolve);
        }, 1000);
      } else {
        resolve(null);
      }
    }).on("timeout", function () {
      if (retries > 0) {
        setTimeout(function () {
          get(url, retries - 1).then(resolve);
        }, 1000);
      } else {
        resolve(null);
      }
    });
  });
}

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/* ── Range-map detection ──────────────────────────────── */

var MAP_KEYWORDS = [
  "distmap", "distribution", "distribut", "range_map", "_range.", "_map.",
  "iucn", "status_iucn", "conservation", "cypron-range"
];

function isLikelyMap(url) {
  var lower = url.toLowerCase();
  if (lower.endsWith(".svg")) return true;
  for (var i = 0; i < MAP_KEYWORDS.length; i++) {
    if (lower.indexOf(MAP_KEYWORDS[i]) !== -1) return true;
  }
  return false;
}

function pickBestImage(items) {
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.type !== "image") continue;
    if (!item.srcset || !item.srcset[0] || !item.srcset[0].src) continue;
    var title = (item.title || "").toLowerCase();
    if (title.endsWith(".svg")) continue;
    var src = item.srcset[0].src;
    if (isLikelyMap(src)) continue;
    /* Ensure https and resize to 480px */
    if (src.indexOf("//") === 0) src = "https:" + src;
    return src.replace(/\/\d+px-/, "/480px-");
  }
  return null;
}

/* ── Wikipedia thumbnail fetch ─────────────────────────── */

async function fetchWikiThumb(genus, species, commonName) {
  var titles = [genus + "_" + species, commonName.replace(/ /g, "_")];
  for (var t of titles) {
    var data = await get(WIKI_API + encodeURIComponent(t));
    if (data && data.thumbnail && data.thumbnail.source) {
      var thumb = data.thumbnail.source.replace(/\/\d+px-/, "/480px-");
      if (isLikelyMap(thumb)) {
        /* Thumbnail is a range map — try media-list for a better image */
        var media = await get(WIKI_MEDIA_API + encodeURIComponent(t));
        if (media && media.items) {
          var pick = pickBestImage(media.items);
          if (pick) return pick;
        }
      }
      return thumb;
    }
  }
  return "";
}

/* ── Main ──────────────────────────────────────────────── */

async function main() {
  var src = fs.readFileSync(DATA_PATH, "utf8");

  /* Extract the FISH array from fish-data.js */
  var arrayMatch = src.match(/var FISH = \[([\s\S]*?)\];/);
  if (!arrayMatch) {
    console.error("Could not find FISH array in " + DATA_PATH);
    process.exit(1);
  }

  /* Parse each entry */
  var entries = [];
  var lineRe = /\[([^\]]+)\]/g;
  var m;
  while ((m = lineRe.exec(arrayMatch[1])) !== null) {
    try {
      var fixed = m[1].replace(/\\u([0-9a-fA-F]{4})/g, function (_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      });
      entries.push(JSON.parse("[" + fixed + "]"));
    } catch (e) {
      console.warn("  Skipping unparseable entry");
    }
  }

  console.log("Found " + entries.length + " fish in dataset");
  console.log("Fetching Wikipedia thumbnails...\n");

  var found = 0;
  var failed = 0;
  for (var i = 0; i < entries.length; i += CONCURRENCY) {
    var batch = entries.slice(i, i + CONCURRENCY);
    var results = await Promise.all(
      batch.map(function (e) { return fetchWikiThumb(e[1], e[2], e[0]); })
    );
    for (var j = 0; j < results.length; j++) {
      var idx = i + j;
      /* Ensure entry has 9 slots */
      while (entries[idx].length < 9) entries[idx].push("");
      if (results[j]) {
        entries[idx][8] = results[j];
        found++;
      } else {
        entries[idx][8] = "";
        failed++;
      }
    }
    process.stdout.write("\r  " + Math.min(i + CONCURRENCY, entries.length) +
      " / " + entries.length + "  (" + found + " images, " + failed + " missing)");
    await sleep(DELAY);
  }
  console.log("\n\nImages found: " + found + " / " + entries.length);

  if (found === 0) {
    console.error("No images fetched — Wikipedia API may be unreachable. Aborting.");
    process.exit(1);
  }

  /* Rebuild the FISH array */
  var lines = entries.map(function (e) {
    return "  " + JSON.stringify(e);
  });
  var newArray = "var FISH = [\n" + lines.join(",\n") + "\n];";

  var patched = src.replace(/var FISH = \[[\s\S]*?\];/, newArray);
  fs.writeFileSync(DATA_PATH, patched);
  console.log("\nUpdated " + DATA_PATH);

  console.log(found + " species now have pre-baked images — zero API calls at runtime.");
}

main().catch(function (err) {
  console.error("Error: " + err.message);
  process.exit(1);
});
