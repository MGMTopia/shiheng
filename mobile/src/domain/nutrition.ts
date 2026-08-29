import { foodsById } from '@/data/foods';
import { Food, FoodLogEntry, MealType, Nutrients, NutritionTargets } from '@/types/nutrition';

export const emptyNutrients = (): Nutrients => ({
  energyKcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0, sodiumMg: 0, saturatedFatG: 0, sugarG: 0,
});

export function nutrientsForServing(food: Food, servings = 1): Nutrients {
  const multiplier = (food.servingGrams / 100) * servings;
  return Object.fromEntries(Object.entries(food.nutrientsPer100g).map(([key, value]) => [key, value * multiplier])) as Nutrients;
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return Object.fromEntries(Object.keys(a).map((key) => [key, a[key as keyof Nutrients] + b[key as keyof Nutrients]])) as Nutrients;
}

export function totalForEntries(entries: FoodLogEntry[]): Nutrients {
  return entries.reduce((total, entry) => {
    const food = foodsById[entry.foodId];
    return food ? addNutrients(total, nutrientsForServing(food, entry.servings)) : total;
  }, emptyNutrients());
}

export function localDateKey(date = new Date()): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function entriesForDate(entries: FoodLogEntry[], dateKey = localDateKey()): FoodLogEntry[] {
  return entries.filter((entry) => localDateKey(new Date(entry.recordedAt)) === dateKey);
}

export function percent(value: number, target: number): number {
  return target <= 0 ? 0 : Math.max(0, Math.min(100, (value / target) * 100));
}

export function nextMealSuggestion(total: Nutrients, targets: NutritionTargets): string {
  if (total.fibreG < targets.fibreG * 0.45) return '下一餐优先加入两种蔬菜或一份全谷物，补足今天偏低的膳食纤维。';
  if (total.proteinG < targets.proteinG * 0.5) return '下一餐加入一掌心鱼、鸡肉、豆腐或豆类，让蛋白质分布更均衡。';
  if (total.sodiumMg > targets.sodiumMg * 0.8) return '今天钠摄入已较高，下一餐尽量少酱汁、少加工食品，并搭配清淡蔬菜。';
  return '今天的结构整体均衡。下一餐继续保持半盘蔬菜、四分之一蛋白质和四分之一主食。';
}

export const mealLabels: Record<MealType, string> = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '加餐' };
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits }).format(value);
}
