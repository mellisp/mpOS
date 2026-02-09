#!/usr/bin/env node

/**
 * Fetch Fish Data from FishBase API
 *
 * Queries the FishBase API for all species that have a main photo,
 * then writes a curated JSON file to data/fish.json.
 *
 * Usage:
 *   node scripts/fetch-fish-data.js
 *
 * The generated JSON can be used as a static fallback for fish-of-the-day.html
 * if the runtime API calls fail (e.g. due to CORS restrictions).
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API = "https://fishbase.ropensci.org";
const BATCH = 500;
const OUT = path.join(__dirname, "..", "data", "fish.json");

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error("HTTP " + res.statusCode + " for " + url));
        res.resume();
        return;
      }
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchAll(endpoint, fields) {
  const url = API + "/" + endpoint + "?limit=1&fields=" + fields;
  const first = await get(url);
  const total = first.count;
  console.log("  %s: %d records", endpoint, total);

  const all = first.data || [];
  for (let offset = BATCH; offset < total; offset += BATCH) {
    const page = await get(
      API + "/" + endpoint + "?limit=" + BATCH + "&offset=" + offset + "&fields=" + fields
    );
    if (page.data) all.push(...page.data);
    process.stdout.write("\r  fetched " + all.length + " / " + total);
    await sleep(100);
  }
  // Fetch first batch properly (first call only got 1 record)
  const firstBatch = await get(
    API + "/" + endpoint + "?limit=" + BATCH + "&offset=0&fields=" + fields
  );
  all.splice(0, 1, ...(firstBatch.data || []));
  console.log("\r  fetched %d / %d", all.length, total);
  return all;
}

async function main() {
  console.log("Fetching photo index from FishBase...");
  const photos = await fetchAll("picturesmain", "SpecCode,PicName");

  // Build a map: SpecCode -> PicName (first photo wins)
  const photoMap = new Map();
  for (const p of photos) {
    if (p.PicName && !photoMap.has(p.SpecCode)) {
      photoMap.set(p.SpecCode, p.PicName);
    }
  }
  console.log("Species with photos: %d", photoMap.size);

  console.log("Fetching species data...");
  const species = await fetchAll(
    "species",
    "SpecCode,Genus,Species,FBname,Family,Order,Length,Fresh,Brack,Saltwater," +
    "DemersPelag,DepthRangeShallow,DepthRangeDeep,Vulnerability,Dangerous,Comments"
  );

  // Join species with photos
  const result = [];
  for (const sp of species) {
    const pic = photoMap.get(sp.SpecCode);
    if (!pic) continue;

    const habitat = [];
    if (sp.Fresh === -1) habitat.push("Freshwater");
    if (sp.Brack === -1) habitat.push("Brackish");
    if (sp.Saltwater === -1) habitat.push("Marine");

    let depth = null;
    if (sp.DepthRangeShallow != null && sp.DepthRangeDeep != null)
      depth = sp.DepthRangeShallow + "\u2013" + sp.DepthRangeDeep + " m";
    else if (sp.DepthRangeDeep != null)
      depth = "0\u2013" + sp.DepthRangeDeep + " m";

    result.push({
      specCode: sp.SpecCode,
      name: sp.FBname || "",
      genus: sp.Genus,
      species: sp.Species,
      family: sp.Family,
      order: sp.Order,
      maxLength: sp.Length,
      habitat: habitat.join(", ") || null,
      depth: depth,
      dempiag: sp.DemersPelag,
      dangerous: sp.Dangerous,
      vulnerability: sp.Vulnerability,
      comments: sp.Comments ? sp.Comments.slice(0, 250) : null,
      image: "https://www.fishbase.se/images/species/" + pic
    });
  }

  console.log("Fish with photos and data: %d", result.length);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(result));
  const sizeMB = (fs.statSync(OUT).size / 1048576).toFixed(1);
  console.log("Written to %s (%s MB)", OUT, sizeMB);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
