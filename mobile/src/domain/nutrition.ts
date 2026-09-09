import type {
  CatalogStatus, DishComposition, EnergyUnit, Food, FoodGroupTotals, FoodLogEntry, FoodSource, MealCard, MealType,
  Nutrients, NutritionTargets, OilLevel, Recipe,
} from '@/types/nutrition';

export { catalogSearchScore, bestCatalogSearchScore, matchesFoodQuery, normalizeFoodQuery, queryMatchRank } from '@/domain/search';

export const KJ_PER_KCAL = 4.184;

export const emptyNutrients = (): Nutrients => ({
  energyKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0, sodiumMg: 0, saturatedFatG: 0, sugarG: 0,
});

export function nutrientNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function hasNutrientValue(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function addNullable(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  return nutrientNumber(a) + nutrientNumber(b);
}

function mapNutrients(nutrients: Nutrients, map: (value: number | null, key: keyof Nutrients) => number | null): Nutrients {
  return {
    energyKcal: map(nutrients.energyKcal, 'energyKcal') ?? 0,
    proteinG: map(nutrients.proteinG, 'proteinG'),
    carbsG: map(nutrients.carbsG, 'carbsG'),
    fatG: map(nutrients.fatG, 'fatG'),
    fibreG: map(nutrients.fibreG, 'fibreG'),
    sodiumMg: map(nutrients.sodiumMg, 'sodiumMg'),
    saturatedFatG: map(nutrients.saturatedFatG, 'saturatedFatG'),
    sugarG: map(nutrients.sugarG, 'sugarG'),
  };
}

export const oilLevelFactors: Record<OilLevel, { energy: number; fat: number; sodium: number }> = {
  light: { energy: 0.88, fat: 0.72, sodium: 0.9 },
  normal: { energy: 1, fat: 1, sodium: 1 },
  restaurant: { energy: 1.22, fat: 1.45, sodium: 1.3 },
};

export const oilLevelLabels: Record<OilLevel, string> = { light: '少油', normal: '家常', restaurant: '餐馆' };
export const mealLabels: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
export const catalogStatusLabels: Record<CatalogStatus, string> = { unseen: '未记录', logged: '已记入图鉴', verified: '已本机核对' };
export const regionLabels: Record<FoodSource['region'], string> = { AU: '澳洲', CN: '中国', 'AU/CN': '中澳常见', US: '美国对照' };
export const confidenceLabels: Record<FoodSource['confidence'], string> = { high: '较准', medium: '参考', estimate: '估算' };

export function displayFoodName(food: Pick<Food, 'nameZh' | 'nameEn'>): string {
  return /[\u4e00-\u9fff]/.test(food.nameZh) ? food.nameZh : food.nameEn;
}

export function displaySourceLabel(source: FoodSource): string {
  switch (source.dataset) {
    case 'fsanz-ausnut':
    case 'fsanz-afcd':
      return '澳洲官方食物成分，供日常参考，不是医疗诊断。';
    case 'usda-fdc':
      return '美国对照数据，不替代澳洲官方值。';
    case 'open-food-facts':
      return '超市包装摘录，购买时请以标签为准。';
    case 'user-entry':
      return '你自己录入的，仅供参考。';
    case 'recipe-estimate':
      return '家常做法估算，油和酱会明显影响结果。';
    case 'seed-pending-afcd':
      return '常见食物参考值。';
    default:
      return source.label;
  }
}
export const portionChoices: { label: string; value: number }[] = [
  { label: '1/4', value: 0.25 },
  { label: '1/3', value: 1 / 3 },
  { label: '1/2', value: 0.5 },
  { label: '2/3', value: 2 / 3 },
  { label: '3/4', value: 0.75 },
  { label: '整份', value: 1 },
];

export function nutrientsForServing(food: Food, servings = 1): Nutrients {
  const multiplier = (food.servingGrams / 100) * servings;
  return mapNutrients(food.nutrientsPer100g, (value) => value == null ? null : value * multiplier);
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return {
    energyKcal: nutrientNumber(a.energyKcal) + nutrientNumber(b.energyKcal),
    proteinG: addNullable(a.proteinG, b.proteinG),
    carbsG: addNullable(a.carbsG, b.carbsG),
    fatG: addNullable(a.fatG, b.fatG),
    fibreG: addNullable(a.fibreG, b.fibreG),
    sodiumMg: addNullable(a.sodiumMg, b.sodiumMg),
    saturatedFatG: addNullable(a.saturatedFatG, b.saturatedFatG),
    sugarG: addNullable(a.sugarG, b.sugarG),
  };
}

export function scaleNutrients(nutrients: Nutrients, factor: number): Nutrients {
  return mapNutrients(nutrients, (value) => value == null ? null : value * factor);
}

export function foodSupportsOilLevel(food: Food): boolean {
  if (food.tags.includes('drink') || food.category === 'fruit' || food.category === 'dairy') return false;
  if (food.tags.includes('supermarket') || food.tags.includes('packaged')) return false;
  if (food.composition) {
    return food.composition.ingredients.some((item) => item.foodId === 'cooking-oil' && item.grams > 0);
  }
  return food.category === 'mixed' || (food.tags.includes('chinese') && food.category !== 'snack' && food.category !== 'staple');
}

export function applyOilLevel(nutrients: Nutrients, oilLevel: OilLevel, applicable: boolean): Nutrients {
  if (!applicable || oilLevel === 'normal') return nutrients;
  const factor = oilLevelFactors[oilLevel];
  return {
    ...nutrients,
    energyKcal: nutrientNumber(nutrients.energyKcal) * factor.energy,
    fatG: nutrients.fatG == null ? null : nutrients.fatG * factor.fat,
    saturatedFatG: nutrients.saturatedFatG == null ? null : nutrients.saturatedFatG * factor.fat,
    sodiumMg: nutrients.sodiumMg == null ? null : nutrients.sodiumMg * factor.sodium,
  };
}

export function clampPortionShare(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0.05, value));
}

export function defaultPortionShare(sharedWith = 1): number {
  const people = Math.max(1, Math.round(sharedWith));
  return clampPortionShare(1 / people);
}

export function entryPortionShare(entry: Pick<FoodLogEntry, 'portionShare' | 'sharedWith'>): number {
  if (entry.portionShare != null) return clampPortionShare(entry.portionShare);
  if (entry.sharedWith != null) return defaultPortionShare(entry.sharedWith);
  return 1;
}

export function entryIntake(food: Food, entry: FoodLogEntry): Nutrients {
  const base = nutrientsForServing(food, entry.servings);
  const oiled = applyOilLevel(base, entry.oilLevel ?? 'normal', foodSupportsOilLevel(food));
  return scaleNutrients(oiled, entryPortionShare(entry));
}

export function totalForEntries(entries: FoodLogEntry[], foodIndex: Record<string, Food>): Nutrients {
  return entries.reduce((total, entry) => {
    const food = foodIndex[entry.foodId];
    return food ? addNutrients(total, entryIntake(food, entry)) : total;
  }, emptyNutrients());
}

export const FRUIT_SERVE_TARGET = 2;

export function emptyFoodGroups(): FoodGroupTotals {
  return { vegetableServes: 0, grainServes: 0, proteinServes: 0, fruitServes: 0 };
}

export function groupContribution(food: Food): FoodGroupTotals {
  switch (food.category) {
    case 'vegetable': return { vegetableServes: 1, grainServes: 0, proteinServes: 0, fruitServes: 0 };
    case 'staple': return { vegetableServes: 0, grainServes: 1, proteinServes: 0, fruitServes: 0 };
    case 'protein': return { vegetableServes: 0, grainServes: 0, proteinServes: 1, fruitServes: 0 };
    case 'dairy': return { vegetableServes: 0, grainServes: 0, proteinServes: 0.3, fruitServes: 0 };
    case 'mixed': return { vegetableServes: 0.4, grainServes: 0.35, proteinServes: 0.5, fruitServes: 0 };
    case 'fruit': return { vegetableServes: 0, grainServes: 0, proteinServes: 0, fruitServes: 1 };
    case 'snack': return { vegetableServes: 0, grainServes: 0.2, proteinServes: 0, fruitServes: 0 };
  }
}

export function foodGroupServes(entries: FoodLogEntry[], foodIndex: Record<string, Food>): FoodGroupTotals {
  return entries.reduce((total, entry) => {
    const food = foodIndex[entry.foodId];
    if (!food) return total;
    const qty = entry.servings * entryPortionShare(entry);
    const add = groupContribution(food);
    return {
      vegetableServes: total.vegetableServes + add.vegetableServes * qty,
      grainServes: total.grainServes + add.grainServes * qty,
      proteinServes: total.proteinServes + add.proteinServes * qty,
      fruitServes: total.fruitServes + add.fruitServes * qty,
    };
  }, emptyFoodGroups());
}

export function servingMassUnit(food: Food): 'g' | 'ml' {
  if (food.tags.includes('drink')) return 'ml';
  if (/ml|毫升/.test(food.servingLabel)) return 'ml';
  return 'g';
}

export function massFromServings(food: Food, servings: number): number {
  return Math.round(food.servingGrams * servings * 10) / 10;
}

export function servingsFromMass(food: Food, mass: number): number {
  if (food.servingGrams <= 0) return 1;
  const servings = mass / food.servingGrams;
  return Math.min(20, Math.max(0.1, Math.round(servings * 100) / 100));
}

export function kcalToKj(kcal: number): number {
  return kcal * KJ_PER_KCAL;
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
  if (!hasNutrientValue(value)) return '暂无数据';
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits }).format(value);
}

export function formatNutrient(value: number | null | undefined, maximumFractionDigits = 1, unit = ''): string {
  if (!hasNutrientValue(value)) return '暂无数据';
  return `${formatNumber(value, maximumFractionDigits)}${unit ? ` ${unit}` : ''}`;
}

export function formatEnergy(kcal: number | null | undefined, unit: EnergyUnit, maximumFractionDigits = 0): string {
  if (!hasNutrientValue(kcal)) return '暂无数据';
  return unit === 'kj'
    ? `${formatNumber(kcalToKj(kcal), maximumFractionDigits)} kJ`
    : `${formatNumber(kcal, maximumFractionDigits)} kcal`;
}

export function formatEnergyPair(kcal: number | null | undefined): string {
  if (!hasNutrientValue(kcal)) return '暂无数据';
  return `${formatNumber(kcalToKj(kcal))} kJ · ${formatNumber(kcal)} kcal`;
}

export function localDateKey(date = new Date()): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function dateKeyToRecordedAt(dateKey: string, template = new Date()): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const next = new Date(template.getTime());
  next.setFullYear(year, month - 1, day);
  return next.toISOString();
}

export function recentFoodIds(entries: FoodLogEntry[], limit = 8): string[] {
  return [...new Set([...entries].reverse().map((entry) => entry.foodId))].slice(0, limit);
}

export function frequentFoodIds(entries: FoodLogEntry[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.foodId, (counts.get(entry.foodId) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => id)
    .slice(0, limit);
}

export function lastPortionForFood(entries: FoodLogEntry[], foodId: string): FoodLogEntry | undefined {
  return [...entries].reverse().find((entry) => entry.foodId === foodId);
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return localDateKey(new Date(year, month - 1, day + days));
}

export function entriesForDate(entries: FoodLogEntry[], dateKey = localDateKey()): FoodLogEntry[] {
  return entries.filter((entry) => localDateKey(new Date(entry.recordedAt)) === dateKey);
}

export function mealCardsForDate(entries: FoodLogEntry[], dateKey = localDateKey()): MealCard[] {
  const dayEntries = entriesForDate(entries, dateKey);
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  const cards: MealCard[] = [];

  meals.forEach((meal) => {
    const mealEntries = dayEntries.filter((entry) => entry.meal === meal);
    const grouped = new Map<string, FoodLogEntry[]>();
    const ungrouped: FoodLogEntry[] = [];
    mealEntries.forEach((entry) => {
      if (entry.mealGroupId) {
        const list = grouped.get(entry.mealGroupId) ?? [];
        list.push(entry);
        grouped.set(entry.mealGroupId, list);
      } else {
        ungrouped.push(entry);
      }
    });
    if (ungrouped.length) {
      cards.push({
        id: `loose-${dateKey}-${meal}`,
        meal,
        recordedAt: ungrouped[0].recordedAt,
        entries: ungrouped,
      });
    }
    grouped.forEach((groupEntries, id) => {
      cards.push({
        id,
        meal,
        recordedAt: groupEntries[0].recordedAt,
        entries: groupEntries,
        recipeId: groupEntries.find((entry) => entry.recipeId)?.recipeId,
      });
    });
  });

  return cards;
}

export function mealItemNames(entries: FoodLogEntry[], foodIndex: Record<string, Food>): string {
  return entries.map((entry) => {
    const food = foodIndex[entry.foodId];
    return food ? displayFoodName(food) : null;
  }).filter(Boolean).join('、');
}

export function latestMealBefore(entries: FoodLogEntry[], meal: MealType, beforeDateKey = localDateKey()): { dateKey: string; entries: FoodLogEntry[] } | null {
  const dateKeys = [...new Set(entries.filter((entry) => entry.meal === meal).map((entry) => localDateKey(new Date(entry.recordedAt))))]
    .filter((dateKey) => dateKey < beforeDateKey)
    .sort();
  const dateKey = dateKeys.at(-1);
  if (!dateKey) return null;
  return { dateKey, entries: entries.filter((entry) => entry.meal === meal && localDateKey(new Date(entry.recordedAt)) === dateKey) };
}

export function suggestedMealSlot(date = new Date()): MealType {
  const hour = date.getHours();
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export function recipeEnergyPerServe(recipe: Recipe, foodIndex: Record<string, Food>): number {
  return recipe.items.reduce((total, item) => {
    const food = foodIndex[item.foodId];
    if (!food) return total;
    const fakeEntry: FoodLogEntry = {
      id: item.foodId, foodId: item.foodId, servings: item.servings, meal: 'dinner', recordedAt: '', oilLevel: item.oilLevel,
    };
    return total + entryIntake(food, fakeEntry).energyKcal;
  }, 0);
}

export function percent(value: number, target: number): number {
  return target <= 0 ? 0 : Math.max(0, Math.min(100, (value / target) * 100));
}

export function nextMealSuggestion(total: Nutrients, targets: NutritionTargets, groups?: FoodGroupTotals): string {
  if (groups && groups.vegetableServes < targets.vegetableServes * 0.45) return '下一餐优先加一碟青菜或菌菇，把蔬菜份量补上来。';
  if (groups && groups.fruitServes < FRUIT_SERVE_TARGET * 0.45) return '下一餐可以加一份水果，例如苹果、橙子或一份浆果。';
  if (nutrientNumber(total.fibreG) < targets.fibreG * 0.45) return '下一餐优先加入两种蔬菜或一份全谷物，补足今天偏低的膳食纤维。';
  if (groups && groups.proteinServes < targets.proteinServes * 0.5) return '下一餐加入一掌心鱼、鸡肉、豆腐或豆类，让蛋白质分布更均衡。';
  if (nutrientNumber(total.proteinG) < targets.proteinG * 0.5) return '下一餐加入一掌心鱼、鸡肉、豆腐或豆类，让蛋白质分布更均衡。';
  if (nutrientNumber(total.sodiumMg) > targets.sodiumMg * 0.8) return '今天钠摄入已较高，下一餐尽量少酱汁、少加工食品，并搭配清淡蔬菜。';
  return '今天的结构整体均衡。下一餐继续保持半盘蔬菜、四分之一蛋白质和四分之一主食。';
}

export function nutrientsFromComposition(composition: DishComposition, foodIndex: Record<string, Food>): Nutrients | null {
  if (!composition.ingredients.length || composition.yieldGrams <= 0) return null;
  let used = 0;
  const total = composition.ingredients.reduce((sum, ingredient) => {
    const item = foodIndex[ingredient.foodId];
    if (!item || ingredient.grams <= 0) return sum;
    used += 1;
    return addNutrients(sum, scaleNutrients(item.nutrientsPer100g, ingredient.grams / 100));
  }, emptyNutrients());
  return used > 0 ? total : null;
}

export type CompositionEstimate = {
  yieldGrams: number;
  note?: string;
  oilGrams: number;
  ingredients: { foodId: string; grams: number; nameZh: string }[];
  wholeDish: Nutrients;
  per100g: Nutrients;
};

export function compositionEstimate(food: Food, foodIndex: Record<string, Food>): CompositionEstimate | null {
  const composition = food.composition;
  if (!composition) return null;
  const wholeDish = nutrientsFromComposition(composition, foodIndex);
  if (!wholeDish) return null;
  return {
    yieldGrams: composition.yieldGrams,
    note: composition.note,
    oilGrams: composition.ingredients
      .filter((ingredient) => ingredient.foodId === 'cooking-oil')
      .reduce((sum, ingredient) => sum + ingredient.grams, 0),
    ingredients: composition.ingredients.map((ingredient) => ({
      foodId: ingredient.foodId,
      grams: ingredient.grams,
      nameZh: foodIndex[ingredient.foodId] ? displayFoodName(foodIndex[ingredient.foodId]) : ingredient.foodId,
    })),
    wholeDish,
    per100g: scaleNutrients(wholeDish, 100 / composition.yieldGrams),
  };
}

export function catalogStatus(foodId: string, loggedIds: string[], verifiedIds: string[]): CatalogStatus {
  if (verifiedIds.includes(foodId)) return 'verified';
  if (loggedIds.includes(foodId)) return 'logged';
  return 'unseen';
}

export function closestPortionLabel(value: number): string {
  const match = portionChoices.reduce((best, choice) => (
    Math.abs(choice.value - value) < Math.abs(best.value - value) ? choice : best
  ), portionChoices[0]);
  return Math.abs(match.value - value) < 0.04 ? match.label : `${Math.round(value * 100)}%`;
}
