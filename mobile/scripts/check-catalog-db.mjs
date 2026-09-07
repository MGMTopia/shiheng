/**
 * Verify assets/catalog/foods.db matches the current TypeScript catalog.
 * Run after imports: pnpm catalog:check
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const mobileRoot = join(root, '..');
const sourceRoot = pathToFileURL(`${mobileRoot}/src/`).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return { shortCircuit: true, url: `${sourceRoot}${specifier.slice(2)}.ts` };
    }
    return nextResolve(specifier, context);
  },
});

const { foods, featuredFoods } = await import('../src/data/foods.ts');
const { catalogMeta } = await import('../src/data/catalog-meta.ts');

const sourceHash = createHash('sha256')
  .update(foods.map((food) => `${food.id}|${food.source.dataset}|${food.nutrientsPer100g.energyKcal}|${food.nameZh}`).join('\n'))
  .digest('hex');
const dbPath = join(mobileRoot, 'assets', 'catalog', 'foods.db');
assert.ok(existsSync(dbPath), '缺少 assets/catalog/foods.db，请运行 pnpm catalog:build');

const db = new DatabaseSync(dbPath, { readOnly: true });
const metaRows = db.prepare('SELECT key, value FROM catalog_meta').all();
const meta = Object.fromEntries(metaRows.map((row) => [row.key, row.value]));
const foodCount = db.prepare('SELECT COUNT(*) AS n FROM foods').get().n;
db.close();

assert.equal(meta.version, catalogMeta.version, '数据库 version 应与 catalogMeta 一致');
assert.equal(Number(meta.total), foods.length, '数据库食品总数应与 TypeScript 目录一致');
assert.equal(foodCount, foods.length, 'foods 表行数应与源数据一致');
assert.equal(meta.sourceHash, sourceHash, '数据库 sourceHash 应与当前源数据一致；请运行 pnpm catalog:build');
assert.equal(Number(meta.featured), featuredFoods.length, '常用条目数量应一致');
assert.ok(meta.builtAt, '应记录生成时间');

console.log(`Catalog check passed: ${foods.length} foods, ${catalogMeta.version}, ${sourceHash.slice(0, 12)}…`);
