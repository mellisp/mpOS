#!/usr/bin/env node

/**
 * Build Fish of the Day Database
 *
 * Pulls species data from FishBase, fetches Wikipedia thumbnail URLs,
 * and writes the complete dataset directly into fish-of-the-day.html.
 * After running, the page is fully static — zero API calls at runtime.
 *
 * Usage:
 *   node scripts/build-fish-db.js [--limit N]
 *
 * Options:
 *   --limit N   Max species to include (default: 400, enough for a
 *               unique fish every day for over a year)
 *
 * Requires: Node.js 14+, internet access
 * Runtime:  ~5 minutes depending on connection speed
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const FB_API = "https://fishbase.ropensci.org";
const WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const HTML_PATH = path.join(__dirname, "..", "fish-of-the-day.html");
const BATCH = 500;
const WIKI_CONCURRENCY = 4;
const WIKI_DELAY = 250; // ms between batches

const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i !== -1 ? parseInt(process.argv[i + 1], 10) || 400 : 400;
})();

/* ── HTTP helpers ──────────────────────────────────────── */

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { "User-Agent": "FishOfTheDay/1.0 (matthewpritchard.com)" }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      let body = "";
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve(null); }
      });
    }).on("error", () => resolve(null));
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/* ── FishBase data ─────────────────────────────────────── */

async function fetchFBAll(endpoint, fields) {
  const first = await get(FB_API + "/" + endpoint + "?limit=1&fields=" + fields);
  if (!first || !first.count) throw new Error("FishBase " + endpoint + " returned no data");
  const total = first.count;
  console.log("  %s: %d records", endpoint, total);

  const all = [];
  for (let offset = 0; offset < total; offset += BATCH) {
    const page = await get(
      FB_API + "/" + endpoint + "?limit=" + BATCH + "&offset=" + offset + "&fields=" + fields
    );
    if (page && page.data) all.push(...page.data);
    process.stdout.write("\r  fetched " + all.length + " / " + total);
    if (offset > 0) await sleep(100);
  }
  console.log();
  return all;
}

/* ── Wikipedia images ──────────────────────────────────── */

async function fetchWikiThumb(genus, species, commonName) {
  const titles = [genus + "_" + species, commonName.replace(/ /g, "_")];
  for (const t of titles) {
    const data = await get(WIKI_API + encodeURIComponent(t));
    if (data && data.thumbnail && data.thumbnail.source) {
      return {
        img: data.thumbnail.source.replace(/\/\d+px-/, "/480px-"),
        desc: data.extract || ""
      };
    }
  }
  return null;
}

/* ── Main ──────────────────────────────────────────────── */

async function main() {
  console.log("Step 1/3: Fetching FishBase photo index...");
  const photos = await fetchFBAll("picturesmain", "SpecCode,PicName");

  const photoMap = new Map();
  for (const p of photos) {
    if (p.PicName && !photoMap.has(p.SpecCode)) {
      photoMap.set(p.SpecCode, p.PicName);
    }
  }
  console.log("  Species with photos: %d\n", photoMap.size);

  console.log("Step 2/3: Fetching FishBase species data...");
  const species = await fetchFBAll(
    "species",
    "SpecCode,Genus,Species,FBname,Family,Order,Length,Fresh,Brack,Saltwater," +
    "DemersPelag,DepthRangeShallow,DepthRangeDeep,Vulnerability,Dangerous,Comments"
  );

  /* Join species with photos, filter to those with common names */
  let candidates = [];
  for (const sp of species) {
    const pic = photoMap.get(sp.SpecCode);
    if (!pic || !sp.FBname) continue;

    const hab = [];
    if (sp.Fresh === -1) hab.push("Freshwater");
    if (sp.Brack === -1) hab.push("Brackish");
    if (sp.Saltwater === -1) hab.push("Marine");

    let depth = null;
    if (sp.DepthRangeShallow != null && sp.DepthRangeDeep != null)
      depth = sp.DepthRangeShallow + "\u2013" + sp.DepthRangeDeep + " m";
    else if (sp.DepthRangeDeep != null)
      depth = "0\u2013" + sp.DepthRangeDeep + " m";

    candidates.push({
      name: sp.FBname, genus: sp.Genus, species: sp.Species,
      family: sp.Family, order: sp.Order, len: sp.Length,
      hab: hab.join(", ") || null, depth,
      fbImg: "https://www.fishbase.se/images/species/" + pic
    });
  }
  console.log("  Species with photos + common names: %d", candidates.length);

  /* Shuffle deterministically and take LIMIT entries */
  candidates.sort((a, b) => {
    const ka = a.genus + a.species;
    const kb = b.genus + b.species;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  if (candidates.length > LIMIT) {
    /* Pick evenly spaced entries for taxonomic diversity */
    const step = candidates.length / LIMIT;
    const picked = [];
    for (let i = 0; i < LIMIT; i++) {
      picked.push(candidates[Math.floor(i * step)]);
    }
    candidates = picked;
  }
  console.log("  Selected: %d entries\n", candidates.length);

  console.log("Step 3/3: Fetching Wikipedia thumbnails...");
  let imgCount = 0;
  for (let i = 0; i < candidates.length; i += WIKI_CONCURRENCY) {
    const batch = candidates.slice(i, i + WIKI_CONCURRENCY);
    const results = await Promise.all(
      batch.map((c) => fetchWikiThumb(c.genus, c.species, c.name))
    );
    for (let j = 0; j < results.length; j++) {
      if (results[j]) {
        candidates[i + j].wikiImg = results[j].img;
        if (results[j].desc) candidates[i + j].desc = results[j].desc;
        imgCount++;
      }
    }
    process.stdout.write("\r  " + Math.min(i + WIKI_CONCURRENCY, candidates.length) +
      " / " + candidates.length + " (" + imgCount + " images)");
    await sleep(WIKI_DELAY);
  }
  console.log();

  /* Filter to only entries with at least one image */
  const final = candidates.filter((c) => c.wikiImg || c.fbImg);
  console.log("\n  Final dataset: %d species with images", final.length);

  /* Build FISH array entries:
     [name, genus, species, family, order, length, habitat, depth, imageURL] */
  const lines = final.map((c) => {
    const img = c.wikiImg || c.fbImg || "";
    const entry = [c.name, c.genus, c.species, c.family, c.order,
                   c.len || 0, c.hab || "", c.depth || "", img];
    return "      " + JSON.stringify(entry);
  });
  const newArray = "var FISH = [\n" + lines.join(",\n") + "\n    ];";

  /* Patch into HTML */
  const html = fs.readFileSync(HTML_PATH, "utf8");
  if (!html.includes("var FISH = [")) {
    console.error("Could not find FISH array in", HTML_PATH);
    process.exit(1);
  }
  const patched = html.replace(/var FISH = \[[\s\S]*?\];/, newArray);
  fs.writeFileSync(HTML_PATH, patched);

  const sizeKB = (Buffer.byteLength(patched) / 1024).toFixed(0);
  console.log("\nDone! Updated %s (%s KB total)", HTML_PATH, sizeKB);
  console.log("The page now requires zero API calls at runtime.");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  console.error("Make sure you have internet access and FishBase API is reachable.");
  process.exit(1);
});
