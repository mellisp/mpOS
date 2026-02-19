/**
 * Build script for world-map-data.js
 *
 * Uses d3-geo for proper antimeridian clipping (fixes Russia/Fiji distortion).
 * Reads Natural Earth 110m data from world-atlas and outputs SVG paths with
 * ISO 3166-1 alpha-2 country codes.
 *
 * Usage: node scripts/build-world-map.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { feature } from 'topojson-client';
import { geoEquirectangular, geoPath } from 'd3-geo';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Load TopoJSON from world-atlas
const topoPath = resolve(ROOT, 'node_modules/world-atlas/countries-110m.json');
const topo = JSON.parse(readFileSync(topoPath, 'utf8'));
const geo = feature(topo, topo.objects.countries);

// Equirectangular projection matching viewBox 0 0 1000 500
// x = (lon + 180) * (1000/360)  =>  scale = 1000/(2*PI) ≈ 159.155
// y = (90 - lat)  * (500/180)
const projection = geoEquirectangular()
  .scale(1000 / (2 * Math.PI))
  .translate([500, 250])
  .precision(0.1);

const pathGen = geoPath(projection);

// ISO 3166-1 numeric → alpha-2 lookup
const NUM_TO_ALPHA2 = {
  '004': 'AF', '008': 'AL', '010': 'AQ', '012': 'DZ', '016': 'AS',
  '020': 'AD', '024': 'AO', '028': 'AG', '031': 'AZ', '032': 'AR',
  '036': 'AU', '040': 'AT', '044': 'BS', '048': 'BH', '050': 'BD',
  '051': 'AM', '052': 'BB', '056': 'BE', '060': 'BM', '064': 'BT',
  '068': 'BO', '070': 'BA', '072': 'BW', '076': 'BR', '084': 'BZ',
  '090': 'SB', '092': 'VG', '096': 'BN', '100': 'BG', '104': 'MM',
  '108': 'BI', '112': 'BY', '116': 'KH', '120': 'CM', '124': 'CA',
  '132': 'CV', '140': 'CF', '144': 'LK', '148': 'TD', '152': 'CL',
  '156': 'CN', '158': 'TW', '170': 'CO', '174': 'KM', '178': 'CG',
  '180': 'CD', '188': 'CR', '191': 'HR', '192': 'CU', '196': 'CY',
  '203': 'CZ', '204': 'BJ', '208': 'DK', '212': 'DM', '214': 'DO',
  '218': 'EC', '222': 'SV', '226': 'GQ', '231': 'ET', '232': 'ER',
  '233': 'EE', '234': 'FO', '238': 'FK', '242': 'FJ', '246': 'FI',
  '250': 'FR', '254': 'GF', '258': 'PF', '260': 'TF', '262': 'DJ',
  '266': 'GA', '268': 'GE', '270': 'GM', '275': 'PS', '276': 'DE',
  '288': 'GH', '296': 'KI', '300': 'GR', '304': 'GL', '308': 'GD',
  '312': 'GP', '316': 'GU', '320': 'GT', '324': 'GN', '328': 'GY',
  '332': 'HT', '336': 'VA', '340': 'HN', '348': 'HU', '352': 'IS',
  '356': 'IN', '360': 'ID', '364': 'IR', '368': 'IQ', '372': 'IE',
  '376': 'IL', '380': 'IT', '384': 'CI', '388': 'JM', '392': 'JP',
  '398': 'KZ', '400': 'JO', '404': 'KE', '408': 'KP', '410': 'KR',
  '414': 'KW', '417': 'KG', '418': 'LA', '422': 'LB', '426': 'LS',
  '428': 'LV', '430': 'LR', '434': 'LY', '440': 'LT', '442': 'LU',
  '450': 'MG', '454': 'MW', '458': 'MY', '462': 'MV', '466': 'ML',
  '470': 'MT', '474': 'MQ', '478': 'MR', '480': 'MU', '484': 'MX',
  '496': 'MN', '498': 'MD', '499': 'ME', '504': 'MA', '508': 'MZ',
  '512': 'OM', '516': 'NA', '520': 'NR', '524': 'NP', '528': 'NL',
  '531': 'CW', '533': 'AW', '534': 'SX', '540': 'NC', '548': 'VU',
  '554': 'NZ', '558': 'NI', '562': 'NE', '566': 'NG', '570': 'NU',
  '580': 'MP', '583': 'FM', '584': 'MH', '585': 'PW', '586': 'PK',
  '591': 'PA', '598': 'PG', '600': 'PY', '604': 'PE', '608': 'PH',
  '612': 'PN', '616': 'PL', '620': 'PT', '624': 'GW', '626': 'TL',
  '630': 'PR', '634': 'QA', '638': 'RE', '642': 'RO', '643': 'RU',
  '646': 'RW', '652': 'BL', '654': 'SH', '659': 'KN', '660': 'AI',
  '662': 'LC', '666': 'PM', '670': 'VC', '674': 'SM', '678': 'ST',
  '682': 'SA', '686': 'SN', '688': 'RS', '690': 'SC', '694': 'SL',
  '702': 'SG', '703': 'SK', '704': 'VN', '705': 'SI', '706': 'SO',
  '710': 'ZA', '716': 'ZW', '724': 'ES', '728': 'SS', '729': 'SD',
  '732': 'EH', '740': 'SR', '748': 'SZ', '752': 'SE', '756': 'CH',
  '760': 'SY', '762': 'TJ', '764': 'TH', '768': 'TG', '776': 'TO',
  '780': 'TT', '784': 'AE', '788': 'TN', '792': 'TR', '795': 'TM',
  '800': 'UG', '804': 'UA', '807': 'MK', '818': 'EG', '826': 'GB',
  '834': 'TZ', '840': 'US', '854': 'BF', '858': 'UY', '860': 'UZ',
  '578': 'NO',
  '862': 'VE', '876': 'WF', '882': 'WS', '887': 'YE', '894': 'ZM',
  // Kosovo (user-assigned code used by Natural Earth / world-atlas)
  '-99': 'XK',
};

// Fallback: map by feature name for entries with no numeric ID
const NAME_TO_ALPHA2 = {
  'Kosovo': 'XK',
  'N. Cyprus': 'CY',    // merge into Cyprus
  'Somaliland': 'SO',   // merge into Somalia
};

// Read existing COUNTRY_NAMES from current file
const existingFile = readFileSync(resolve(ROOT, 'js/world-map-data.js'), 'utf8');
const namesMatch = existingFile.match(/const COUNTRY_NAMES\s*=\s*(\{[\s\S]*?\n\});/);
let countryNamesBlock = '';
if (namesMatch) {
  countryNamesBlock = 'const COUNTRY_NAMES = ' + namesMatch[1] + ';\n';
}

// Round path coordinates to 1 decimal place to keep file small
function roundPath(d) {
  if (!d) return '';
  return d.replace(/(\d+\.\d{2,})/g, (m) => parseFloat(m).toFixed(1));
}

// Generate country paths
const countries = {};
for (const feat of geo.features) {
  const numCode = String(feat.id);
  let alpha2 = NUM_TO_ALPHA2[numCode];
  if (!alpha2) {
    const name = feat.properties?.name;
    alpha2 = name && NAME_TO_ALPHA2[name];
  }
  if (!alpha2) {
    console.warn(`No alpha-2 mapping for numeric code ${numCode} (${feat.properties?.name || 'unknown'})`);
    continue;
  }
  const d = pathGen(feat);
  if (!d) continue;
  // Merge multiple features with the same code (e.g. N. Cyprus into CY)
  if (countries[alpha2]) {
    countries[alpha2] += ' ' + roundPath(d);
  } else {
    countries[alpha2] = roundPath(d);
  }
}

// Sort by alpha-2 code
const sorted = Object.keys(countries).sort();

// Build output
let out = `/**
 * World map SVG path data — Equirectangular projection (Natural Earth 110m).
 * Projection: x = (longitude + 180) * (1000 / 360)
 *             y = (90 - latitude)  * (500 / 180)
 * ViewBox 0 0 1000 500  (2 : 1 aspect ratio)
 * Source: Natural Earth via world-atlas (public domain)
 *
 * Generated by scripts/build-world-map.mjs — do not edit manually.
 * Uses d3-geo for proper antimeridian clipping.
 */

const WORLD_MAP_PATHS = {
  viewBox: "0 0 1000 500",
  countries: {\n`;

for (const code of sorted) {
  out += `    ${code}: "${countries[code]}",\n`;
}

out += `  }
};

${countryNamesBlock}`;

writeFileSync(resolve(ROOT, 'js/world-map-data.js'), out);
console.log(`Wrote ${sorted.length} countries to js/world-map-data.js`);

// Verify key countries
const checks = ['RU', 'FJ', 'US', 'NZ', 'JP'];
for (const c of checks) {
  if (countries[c]) {
    const parts = countries[c].split(/[Mm]/).length - 1;
    console.log(`  ${c}: ${countries[c].length} chars, ${parts} subpaths`);
  } else {
    console.warn(`  ${c}: MISSING!`);
  }
}
