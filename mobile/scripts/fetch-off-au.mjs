/**
 * Computer-side Open Food Facts extract for Australia.
 * Saves JSONL for `pnpm import:off`. Does not call the search API from the app.
 *
 * Prefers the public JSONL dump when the live search API is rate-limited.
 * Licence: ODbL 1.0
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = dirname(fileURLToPath(import.meta.url));
const outDir = join(root, '..', 'data-raw');
const outPath = join(outDir, 'openfoodfacts-au.jsonl');
const USER_AGENT = 'ShihengCatalogImport/1.0 (personal offline diet tracker)';
const PAGE_SIZE = 100;
const MAX_PAGES = 30;
const TARGET = 2500;
const DUMP_URL = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';

function isAustralia(product) {
  const tags = [...(product.countries_tags ?? []), ...(product.countries_hierarchy ?? [])].map((tag) => String(tag).toLowerCase());
  const text = `${product.countries ?? ''} ${product.purchase_places ?? ''}`.toLowerCase();
  const code = String(product.code ?? product._id ?? '').replace(/\D/g, '');
  return tags.some((tag) => tag.includes('australia')) || text.includes('australia') || code.startsWith('93');
}

async function fetchApiPage(page) {
  const url = new URL('https://world.openfoodfacts.org/api/v2/search');
  url.searchParams.set('countries_tags', 'en:australia');
  url.searchParams.set('sort_by', 'unique_scans_n');
  url.searchParams.set('page_size', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('fields', [
    'code', '_id', 'product_name', 'product_name_en', 'brands', 'nutriments',
    'serving_quantity', 'stores', 'countries_tags', 'countries', 'countries_hierarchy',
    'purchase_places', 'nutrient_levels', 'categories_tags',
  ].join(','));
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!response.ok) throw new Error(`OFF HTTP ${response.status} on page ${page}`);
  return response.json();
}

async function tryApi() {
  const products = [];
  const seen = new Set();
  for (let page = 1; page <= MAX_PAGES && products.length < TARGET; page += 1) {
    const payload = await fetchApiPage(page);
    const rows = Array.isArray(payload.products) ? payload.products : [];
    if (!rows.length) break;
    for (const product of rows) {
      const code = String(product.code ?? product._id ?? '').replace(/\D/g, '');
      if (!code || seen.has(code)) continue;
      seen.add(code);
      products.push(product);
      if (products.length >= TARGET) break;
    }
    console.log(`api page ${page}: ${rows.length} rows, kept ${products.length}`);
    if (rows.length < PAGE_SIZE) break;
    await sleep(400);
  }
  return products;
}

async function streamDump() {
  const controller = new AbortController();
  const response = await fetch(DUMP_URL, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
  if (!response.ok || !response.body) throw new Error(`OFF dump HTTP ${response.status}`);
  const gunzip = createGunzip();
  const nodeStream = Readable.fromWeb(response.body);
  nodeStream.pipe(gunzip);
  const lines = createInterface({ input: gunzip, crlfDelay: Infinity });
  const products = [];
  const seen = new Set();
  let scanned = 0;
  try {
    for await (const line of lines) {
      scanned += 1;
      if (scanned % 20000 === 0) console.log(`dump scanned ${scanned} lines, kept ${products.length}`);
      if (!line || (!/australia/i.test(line) && !/"code"\s*:\s*"93/.test(line))) continue;
      let product;
      try { product = JSON.parse(line); } catch { continue; }
      if (!isAustralia(product)) continue;
      const code = String(product.code ?? product._id ?? '').replace(/\D/g, '');
      const name = String(product.product_name ?? product.product_name_en ?? '').trim();
      if (!code || code.length < 8 || !name || seen.has(code)) continue;
      seen.add(code);
      products.push({
        code,
        _id: code,
        product_name: product.product_name,
        product_name_en: product.product_name_en,
        brands: product.brands,
        nutriments: product.nutriments,
        serving_quantity: product.serving_quantity,
        stores: product.stores,
        countries_tags: product.countries_tags,
        countries: product.countries,
        countries_hierarchy: product.countries_hierarchy,
        purchase_places: product.purchase_places,
        nutrient_levels: product.nutrient_levels,
        categories_tags: product.categories_tags,
      });
      if (products.length >= TARGET) break;
    }
  } finally {
    controller.abort();
    nodeStream.destroy();
    gunzip.destroy();
    lines.close();
  }
  console.log(`dump finished: scanned ${scanned}, kept ${products.length}`);
  return products;
}

mkdirSync(outDir, { recursive: true });
let products = [];
try {
  products = await tryApi();
} catch (error) {
  console.warn(`Search API unavailable (${error instanceof Error ? error.message : error}); streaming dump instead.`);
}

if (products.length < TARGET) {
  const dumped = await streamDump();
  const seen = new Set(products.map((product) => String(product.code ?? product._id ?? '')));
  for (const product of dumped) {
    const code = String(product.code ?? product._id ?? '');
    if (seen.has(code)) continue;
    seen.add(code);
    products.push(product);
    if (products.length >= TARGET) break;
  }
}

if (!products.length) {
  throw new Error('No Australian products collected from API or dump.');
}

writeFileSync(outPath, products.map((product) => JSON.stringify(product)).join('\n') + '\n');
writeFileSync(join(outDir, 'SOURCE.txt'), [
  `source: Open Food Facts dump/API, Australia or GTIN 93`,
  `downloadedAt: ${new Date().toISOString()}`,
  `licence: ODbL 1.0 https://opendatacommons.org/licenses/odbl/1-0/`,
  `count: ${products.length}`,
  `note: Community-contributed labels. Packaging is authoritative. Missing nutrients are not zero.`,
  '',
].join('\n'));
console.log(`Wrote ${products.length} products to ${outPath}`);
