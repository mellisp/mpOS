#!/usr/bin/env node

/**
 * Pre-fetch Wikipedia thumbnail URLs for all fish in the dataset.
 *
 * Queries the Wikipedia REST API for each species, extracts the
 * thumbnail URL, and writes the updated FISH array back into
 * fish-of-the-day.html so the page needs zero API calls at runtime.
 *
 * Usage:
 *   node scripts/fetch-wiki-images.js
 *
 * Run this periodically to refresh image URLs or after editing the
 * FISH array in fish-of-the-day.html.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const HTML_PATH = path.join(__dirname, "..", "fish-of-the-day.html");
const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const CONCURRENCY = 4;
const DELAY = 200; // ms between batches to be polite

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "FishOfTheDay/1.0 (matthewpritchard.com)" } }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return get(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchImage(genus, species, commonName) {
  /* Try scientific name first, then common name */
  const titles = [
    genus + "_" + species,
    commonName.replace(/ /g, "_")
  ];
  for (const title of titles) {
    const data = await get(WIKI_API + encodeURIComponent(title));
    if (data && data.thumbnail && data.thumbnail.source) {
      return data.thumbnail.source.replace(/\/\d+px-/, "/480px-");
    }
  }
  return "";
}

async function main() {
  const html = fs.readFileSync(HTML_PATH, "utf8");

  /* Extract the FISH array from the HTML */
  const arrayMatch = html.match(/var FISH = \[([\s\S]*?)\];/);
  if (!arrayMatch) {
    console.error("Could not find FISH array in", HTML_PATH);
    process.exit(1);
  }

  /* Parse each entry — they look like: ["Name","Genus","species",...] */
  const entries = [];
  const lineRe = /\[([^\]]+)\]/g;
  let m;
  while ((m = lineRe.exec(arrayMatch[1])) !== null) {
    /* Use indirect eval to parse the array literal safely */
    try {
      entries.push(JSON.parse("[" + m[1] + "]"));
    } catch (e) {
      /* Handle unicode escapes: replace \uXXXX with actual chars for JSON */
      const fixed = m[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)));
      try {
        entries.push(JSON.parse("[" + fixed + "]"));
      } catch (e2) {
        console.warn("  Skipping unparseable entry:", m[1].slice(0, 60));
      }
    }
  }

  console.log("Found %d fish entries", entries.length);

  /* Fetch image URLs in batches */
  let found = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((e) => fetchImage(e[1], e[2], e[0]))
    );
    for (let j = 0; j < results.length; j++) {
      const idx = i + j;
      if (results[j]) {
        /* Ensure entry has 9 elements: [name, genus, species, family, order, length, habitat, depth, imageURL] */
        while (entries[idx].length < 8) entries[idx].push("");
        entries[idx][8] = results[j];
        found++;
      } else {
        while (entries[idx].length < 8) entries[idx].push("");
        entries[idx][8] = "";
      }
    }
    process.stdout.write("\r  " + Math.min(i + CONCURRENCY, entries.length) + " / " + entries.length + " (" + found + " images found)");
    await sleep(DELAY);
  }
  console.log("\n  Total images found: %d / %d", found, entries.length);

  /* Rebuild the FISH array string */
  const lines = entries.map((e) => {
    const parts = e.map((v) => JSON.stringify(v));
    return "      [" + parts.join(",") + "]";
  });
  const newArray = "var FISH = [\n" + lines.join(",\n") + "\n    ];";

  /* Replace in HTML */
  const newHtml = html.replace(/var FISH = \[[\s\S]*?\];/, newArray);
  fs.writeFileSync(HTML_PATH, newHtml);
  console.log("Updated %s with image URLs", HTML_PATH);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
