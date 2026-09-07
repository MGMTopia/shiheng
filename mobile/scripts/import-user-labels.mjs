/**
 * Convert a local user-label CSV into generated catalog rows.
 * These stay marked as user-entry estimates and are not merged with official foods.
 *
 * CSV columns:
 * nameZh,nameEn,brand,barcode,category,servingLabel,servingGrams,energyKcal,proteinG,carbsG,fatG,fibreG,sodiumMg,saturatedFatG,sugarG,channel,unit
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const csvPath = join(root, '..', 'data-raw', 'user-labels.csv');
const templatePath = join(root, '..', 'src', 'data', 'generated', 'user-labels.template.csv');
const outPath = join(root, '..', 'src', 'data', 'generated', 'user-label-foods.ts');

const HEADER = 'nameZh,nameEn,brand,barcode,category,servingLabel,servingGrams,energyKcal,proteinG,carbsG,fatG,fibreG,sodiumMg,saturatedFatG,sugarG,channel,unit';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const pushCell = () => { row.push(cell); cell = ''; };
  const pushRow = () => {
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') pushCell();
    else if (ch === '\n') { pushCell(); pushRow(); }
    else if (ch !== '\r') cell += ch;
  }
  if (cell.length || row.length) { pushCell(); pushRow(); }
  return rows;
}

function number(value) {
  const parsed = Number(String(value ?? '').replace(',', '.').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function slug(name, barcode) {
  const latin = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const code = String(barcode ?? '').replace(/\D/g, '');
  return `user-${code || latin || 'label'}`;
}

const sourceText = existsSync(csvPath) ? readFileSync(csvPath, 'utf8') : '';
mkdirSync(dirname(templatePath), { recursive: true });
if (!existsSync(templatePath)) {
  writeFileSync(templatePath, `${HEADER}\n`);
}

const table = parseCsv(sourceText || `${HEADER}\n`);
const header = (table[0] ?? []).map((value) => value.trim());
const foods = [];
const seen = new Set();
for (const raw of table.slice(1)) {
  const rec = Object.fromEntries(header.map((key, index) => [key, raw[index] ?? '']));
  const nameZh = String(rec.nameZh ?? '').trim();
  const nameEn = String(rec.nameEn ?? '').trim() || nameZh;
  const energyKcal = number(rec.energyKcal);
  const servingGrams = number(rec.servingGrams) ?? 100;
  if (!nameZh || energyKcal == null || energyKcal <= 0 || energyKcal > 1000) continue;
  const barcode = String(rec.barcode ?? '').replace(/\D/g, '');
  const id = slug(nameEn || nameZh, barcode);
  if (seen.has(id)) continue;
  seen.add(id);
  const brand = String(rec.brand ?? '').trim();
  const channel = String(rec.channel ?? '').trim().toLowerCase();
  const stores = [channel.includes('woolworth') ? 'woolworths' : null, channel.includes('coles') ? 'coles' : null].filter(Boolean);
  const n = (key) => number(rec[key]);
  foods.push({
    id,
    nameZh,
    nameEn,
    brand,
    barcode,
    category: ['staple', 'protein', 'vegetable', 'fruit', 'dairy', 'mixed', 'snack'].includes(rec.category) ? rec.category : 'snack',
    servingLabel: String(rec.servingLabel ?? '').trim() || (String(rec.unit ?? '').trim() === 'ml' ? '100ml' : '100g'),
    servingGrams: servingGrams > 0 && servingGrams <= 1000 ? servingGrams : 100,
    energyKcal,
    proteinG: n('proteinG'),
    carbsG: n('carbsG'),
    fatG: n('fatG'),
    fibreG: n('fibreG'),
    sodiumMg: n('sodiumMg'),
    saturatedFatG: n('saturatedFatG'),
    sugarG: n('sugarG'),
    stores,
    channel,
  });
}

const body = foods.map((row) => {
  const n = (value) => (value == null ? 'null' : String(value));
  const storeLit = row.stores.length ? `[${row.stores.map((store) => `'${store}'`).join(', ')}]` : '[]';
  return `  userLabel(${JSON.stringify(row.id)}, ${JSON.stringify(row.nameZh)}, ${JSON.stringify(row.nameEn)}, ${JSON.stringify(row.brand)}, ${JSON.stringify(row.barcode)}, ${JSON.stringify(row.category)}, ${JSON.stringify(row.servingLabel)}, ${row.servingGrams}, ${row.energyKcal}, ${n(row.proteinG)}, ${n(row.carbsG)}, ${n(row.fatG)}, ${n(row.fibreG)}, ${n(row.sodiumMg)}, ${n(row.saturatedFatG)}, ${n(row.sugarG)}, ${storeLit}, ${JSON.stringify(row.channel)})`;
}).join(',\n');

writeFileSync(outPath, `import type { Food, FoodCategory, Supermarket } from '@/types/nutrition';

const UPDATED = new Date().toISOString().slice(0, 10);
const LABEL = '用户根据包装标签批量录入，尚未独立核验。包装优先，缺失营养素不是 0。';

function userLabel(
  id: string, nameZh: string, nameEn: string, brand: string, barcode: string, category: FoodCategory,
  servingLabel: string, servingGrams: number, energyKcal: number, proteinG: number | null, carbsG: number | null,
  fatG: number | null, fibreG: number | null, sodiumMg: number | null, saturatedFatG: number | null, sugarG: number | null,
  stores: Supermarket[], channel: string,
): Food {
  return {
    id, nameZh, nameEn, aliases: [barcode, brand, channel].filter(Boolean), category, servingLabel, servingGrams,
    nutrientsPer100g: { energyKcal, proteinG, carbsG, fatG, fibreG, sodiumMg, saturatedFatG, sugarG },
    source: { type: 'label', label: LABEL, region: 'AU/CN', confidence: 'estimate', updatedAt: UPDATED, dataset: 'user-entry', externalId: barcode || id },
    tags: ['custom', 'user-label', ...stores], barcode: barcode || undefined, brand: brand || undefined, stores,
  };
}

export const userLabelFoods: Food[] = [
${body}
];
`);
console.log(`Wrote ${foods.length} user-label foods to ${outPath}`);
