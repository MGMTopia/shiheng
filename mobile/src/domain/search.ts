import type { Food } from '@/types/nutrition';

/** Cooking verbs strip to empty; ingredient aliases map to a canonical form. Sorted longest-first at init. */
const REPLACEMENTS: [string, string][] = ([
  ['stir-fried', ''],
  ['stir fried', ''],
  ['stir-fry', ''],
  ['stir fry', ''],
  ['pan-fried', ''],
  ['deep-fried', ''],
  ['deep fried', ''],
  ['home-style', ''],
  ['bok choy', '小白菜'],
  ['pak choy', '小白菜'],
  ['sweet potato', '红薯'],
  ['green pepper', '青椒'],
  ['bell pepper', '青椒'],
  ['char siu', '叉烧'],
  ['ho fun', '河粉'],
  ['chow mein', '面条'],
  ['fried rice', '炒饭'],
  ['commercial', ''],
  ['homemade', ''],
  ['homestyle', ''],
  ['steamed', ''],
  ['boiled', ''],
  ['grilled', ''],
  ['baked', ''],
  ['roasted', ''],
  ['capsicum', '青椒'],
  ['eggplant', '茄子'],
  ['aubergine', '茄子'],
  ['broccoli', '西兰花'],
  ['chicken', '鸡'],
  ['tomato', '番茄'],
  ['noodles', '面条'],
  ['potato', '土豆'],
  ['prawn', '虾'],
  ['shrimp', '虾'],
  ['peanut', '花生'],
  ['dumplings', '饺子'],
  ['dumpling', '饺子'],
  ['wonton', '云吞'],
  ['beef', '牛肉'],
  ['pork', '猪肉'],
  ['lamb', '羊肉'],
  ['fish', '鱼'],
  ['tofu', '豆腐'],
  ['rice', '饭'],
  ['eggs', '蛋'],
  ['egg', '蛋'],
  ['and', ''],
  ['with', ''],
  ['西红柿', '番茄'],
  ['马铃薯', '土豆'],
  ['番薯', '红薯'],
  ['地瓜', '红薯'],
  ['小白菜', '小白菜'],
  ['青菜', '小白菜'],
  ['鸡蛋', '蛋'],
  ['鸡胸', '鸡'],
  ['鸡腿', '鸡'],
  ['鸡肉', '鸡'],
  ['里脊', '猪肉'],
  ['牛腩', '牛肉'],
  ['清炒', ''],
  ['干炒', ''],
  ['爆炒', ''],
  ['清蒸', ''],
  ['水煮', ''],
  ['蒜蓉', ''],
  ['醋溜', ''],
  ['炒', ''],
  ['煮', ''],
  ['蒸', ''],
  ['煎', ''],
  ['炸', ''],
  ['溜', ''],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length);

const INGREDIENT_TOKENS = [
  '小白菜', '西兰花', '西红柿', '马铃薯', '牛肉', '猪肉', '羊肉', '豆腐', '茄子', '青椒',
  '土豆', '红薯', '面条', '河粉', '叉烧', '饺子', '云吞', '花生', '番茄', '米饭',
  '鸡', '蛋', '虾', '鱼', '饭',
].sort((a, b) => b.length - a.length);

function compact(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

export function normalizeFoodQuery(text: string): string {
  let value = ` ${text.toLowerCase()} `;
  for (const [from, to] of REPLACEMENTS) {
    if (!from) continue;
    value = value.split(from).join(to);
  }
  return compact(value);
}

export function extractIngredientTokens(normalized: string): string[] {
  if (!normalized) return [];
  return INGREDIENT_TOKENS.filter((token) => normalized.includes(token));
}

function fieldHaystacks(food: Food): string[] {
  return [food.nameZh, food.nameEn, ...food.aliases].map(normalizeFoodQuery).filter((value) => value.length > 0);
}

function tokensMatchField(haystack: string, tokens: string[]): boolean {
  return tokens.every((token) => haystack.includes(token));
}

function legacyMatch(food: Food, needle: string): boolean {
  const compactNeedle = needle.replace(/\s/g, '');
  return food.nameZh.toLowerCase().includes(needle)
    || food.nameEn.toLowerCase().includes(needle)
    || food.aliases.some((alias) => alias.toLowerCase().includes(needle))
    || (food.barcode != null && food.barcode.includes(compactNeedle))
    || (food.brand != null && food.brand.toLowerCase().includes(needle))
    || (food.stores ?? []).some((store) => store.includes(needle) || (needle === 'woolies' && store === 'woolworths'))
    || (needle === '超市' && (food.tags.includes('supermarket') || (food.stores?.length ?? 0) > 0))
    || ((needle === '美国' || needle === 'usda' || needle === 'overseas') && food.tags.includes('overseas'))
    || ((needle === 'fsanz' || needle === 'afcd' || needle === 'ausnut') && food.tags.includes('fsanz'));
}

export function matchesFoodQuery(food: Food, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (legacyMatch(food, needle)) return true;
  const normalizedQuery = normalizeFoodQuery(query);
  if (normalizedQuery.length < 2) return false;
  const fields = fieldHaystacks(food);
  const tokens = extractIngredientTokens(normalizedQuery);
  if (tokens.length >= 2) return fields.some((haystack) => tokensMatchField(haystack, tokens));
  return fields.some((haystack) => haystack.includes(normalizedQuery));
}

export function queryMatchRank(food: Food, query: string): number {
  const raw = query.trim();
  if (!raw) return 0;
  const needle = raw.toLowerCase();
  const compactQuery = compact(raw);
  const normalizedQuery = normalizeFoodQuery(raw);
  const nameZh = food.nameZh.toLowerCase();
  const nameEn = food.nameEn.toLowerCase();
  if (nameZh === needle || nameEn === needle || compact(food.nameZh) === compactQuery || compact(food.nameEn) === compactQuery) return 1000;
  if (food.aliases.some((alias) => alias.toLowerCase() === needle || compact(alias) === compactQuery)) return 900;
  const normalizedZh = normalizeFoodQuery(food.nameZh);
  const normalizedEn = normalizeFoodQuery(food.nameEn);
  if (normalizedQuery && (normalizedZh === normalizedQuery || normalizedEn === normalizedQuery)) return 800;
  if (normalizedQuery.length >= 2 && (normalizedZh.includes(normalizedQuery) || normalizedEn.includes(normalizedQuery))) return 700;
  if (normalizedQuery.length >= 2 && food.aliases.some((alias) => normalizeFoodQuery(alias).includes(normalizedQuery))) return 600;
  const tokens = extractIngredientTokens(normalizedQuery);
  if (tokens.length >= 2 && fieldHaystacks(food).some((haystack) => tokensMatchField(haystack, tokens))) return 500;
  if (nameZh.includes(needle) || nameEn.includes(needle)) return 400;
  if (food.aliases.some((alias) => alias.toLowerCase().includes(needle))) return 350;
  return 100;
}

export function catalogSearchScore(food: Food, query: string, ctx: {
  favouriteFoodIds: string[];
  logged: Set<string>;
  featuredIds: Set<string>;
  customIds: Set<string>;
}): number {
  return queryMatchRank(food, query)
    + Number(ctx.favouriteFoodIds.includes(food.id)) * 50
    + Number(ctx.logged.has(food.id)) * 25
    + Number(ctx.featuredIds.has(food.id)) * 10
    + Number(ctx.customIds.has(food.id)) * 8;
}
