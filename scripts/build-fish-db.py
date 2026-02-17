#!/usr/bin/env python3
"""
Build Fish of the Day Database (Python version)

Fetches Wikipedia thumbnail URLs for fish species in js/fish-data.js
and bakes them into the dataset. Fish with only range-map images get
an empty URL so they are excluded from the daily selection pool.

Usage:  python3 scripts/build-fish-db.py
"""

import asyncio
import json
import os
import re
import ssl
import urllib.parse
import urllib.request

WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/"
WIKI_MEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/media-list/"
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "js", "fish-data.js")
CONCURRENCY = 4
DELAY = 0.25
MAX_RETRIES = 2
HEADERS = {"User-Agent": "FishOfTheDay/1.0 (matthewpritchard.com)"}

MAP_KEYWORDS = [
    "distmap", "distribution", "distribut", "range_map", "_range.", "_map.",
    "iucn", "status_iucn", "conservation", "cypron-range"
]

# Allow unverified SSL for environments without certs
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def fetch_json(url, retries=MAX_RETRIES):
    """Synchronous HTTP GET with retries, returns parsed JSON or None."""
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
                if resp.status != 200:
                    return None
                return json.loads(resp.read().decode("utf-8"))
        except Exception:
            if attempt < retries:
                import time
                time.sleep(1)
    return None


def is_likely_map(url):
    lower = url.lower()
    if lower.endswith(".svg"):
        return True
    for kw in MAP_KEYWORDS:
        if kw in lower:
            return True
    return False


def pick_best_image(items):
    for item in items:
        if item.get("type") != "image":
            continue
        srcset = item.get("srcset")
        if not srcset or not srcset[0].get("src"):
            continue
        title = (item.get("title") or "").lower()
        if title.endswith(".svg"):
            continue
        src = srcset[0]["src"]
        if is_likely_map(src):
            continue
        if src.startswith("//"):
            src = "https:" + src
        src = re.sub(r"/\d+px-", "/480px-", src)
        return src
    return None


def fetch_wiki_thumb(genus, species, common_name):
    """Try to get a non-map thumbnail for a fish species."""
    titles = [
        genus + "_" + species,
        common_name.replace(" ", "_")
    ]
    for t in titles:
        encoded = urllib.parse.quote(t, safe="")
        data = fetch_json(WIKI_API + encoded)
        if data and data.get("thumbnail", {}).get("source"):
            thumb = re.sub(r"/\d+px-", "/480px-", data["thumbnail"]["source"])
            if is_likely_map(thumb):
                # Thumbnail is a map — try media-list for a real photo
                media = fetch_json(WIKI_MEDIA_API + encoded)
                if media and media.get("items"):
                    pick = pick_best_image(media["items"])
                    if pick:
                        return pick
                # No better image found — this fish only has a map
                continue
            return thumb
    return ""


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    # Extract the FISH array
    array_match = re.search(r"const FISH = \[([\s\S]*?)\];", src)
    if not array_match:
        print("Could not find FISH array in " + DATA_PATH)
        raise SystemExit(1)

    # Parse each entry
    entries = []
    for m in re.finditer(r"\[([^\]]+)\]", array_match.group(1)):
        try:
            raw = m.group(1)
            # Handle unicode escapes
            raw = re.sub(
                r"\\u([0-9a-fA-F]{4})",
                lambda x: chr(int(x.group(1), 16)),
                raw
            )
            entries.append(json.loads("[" + raw + "]"))
        except (json.JSONDecodeError, ValueError):
            print("  Skipping unparseable entry")

    print(f"Found {len(entries)} fish in dataset")
    print("Fetching Wikipedia thumbnails...\n")

    found = 0
    failed = 0
    import time

    for i in range(0, len(entries), CONCURRENCY):
        batch = entries[i:i + CONCURRENCY]
        results = []
        for e in batch:
            results.append(fetch_wiki_thumb(e[1], e[2], e[0]))

        for j, result in enumerate(results):
            idx = i + j
            # Ensure entry has 9 slots
            while len(entries[idx]) < 9:
                entries[idx].append("")
            if result:
                entries[idx][8] = result
                found += 1
            else:
                entries[idx][8] = ""
                failed += 1

        done = min(i + CONCURRENCY, len(entries))
        print(f"\r  {done} / {len(entries)}  ({found} images, {failed} missing)", end="", flush=True)
        time.sleep(DELAY)

    print(f"\n\nImages found: {found} / {len(entries)}")

    if found == 0:
        print("No images fetched — Wikipedia API may be unreachable. Aborting.")
        raise SystemExit(1)

    # Rebuild the FISH array
    lines = []
    for e in entries:
        lines.append("  " + json.dumps(e, ensure_ascii=False))
    new_array = "const FISH = [\n" + ",\n".join(lines) + "\n];"

    patched = re.sub(r"const FISH = \[[\s\S]*?\];", new_array, src)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        f.write(patched)

    print(f"\nUpdated {DATA_PATH}")
    print(f"{found} species now have pre-baked images — zero API calls at runtime.")


if __name__ == "__main__":
    main()
