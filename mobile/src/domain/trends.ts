import type { Food, FoodGroupTotals, FoodLogEntry, Nutrients, NutritionTargets } from '@/types/nutrition';
import {
  FRUIT_SERVE_TARGET,
  emptyFoodGroups,
  entriesForDate,
  foodGroupServes,
  localDateKey,
  nutrientNumber,
  nextMealSuggestion,
  shiftDateKey,
  totalForEntries,
} from '@/domain/nutrition';

export const COMPLETE_MEAL_MIN = 2;

export type PeriodLength = 7 | 30;

export type DayTrend = {
  dateKey: string;
  logged: boolean;
  complete: boolean;
  mealCount: number;
  energyKcal: number;
  proteinG: number;
  fibreG: number;
  sodiumMg: number;
  groups: FoodGroupTotals;
};

export type PeriodSummary = {
  days: number;
  loggedDays: number;
  completeDays: number;
  averageEnergyKcal: number | null;
  averageProteinG: number | null;
  averageFibreG: number | null;
  averageSodiumMg: number | null;
  groupsAverage: FoodGroupTotals;
  highSodiumDays: number;
  lowFibreDays: number;
  lowVegDays: number;
  lowFruitDays: number;
};

export type TrendAdvice = {
  title: string;
  reason: string;
};

export function dateKeysInRange(days: number, end = localDateKey()): string[] {
  return Array.from({ length: days }, (_, index) => shiftDateKey(end, -(days - 1 - index)));
}

export function mealsLoggedCount(entries: FoodLogEntry[]): number {
  return new Set(entries.map((entry) => entry.meal)).size;
}

export function dayIsCompleteEnough(entries: FoodLogEntry[]): boolean {
  const meals = new Set(entries.map((entry) => entry.meal));
  return (['breakfast', 'lunch', 'dinner'] as const).filter((meal) => meals.has(meal)).length >= COMPLETE_MEAL_MIN;
}

export function dayTrend(entries: FoodLogEntry[], foodIndex: Record<string, Food>, dateKey: string): DayTrend {
  const dayEntries = entriesForDate(entries, dateKey);
  const total = totalForEntries(dayEntries, foodIndex);
  return {
    dateKey,
    logged: dayEntries.length > 0,
    complete: dayIsCompleteEnough(dayEntries),
    mealCount: mealsLoggedCount(dayEntries),
    energyKcal: total.energyKcal,
    proteinG: nutrientNumber(total.proteinG),
    fibreG: nutrientNumber(total.fibreG),
    sodiumMg: nutrientNumber(total.sodiumMg),
    groups: foodGroupServes(dayEntries, foodIndex),
  };
}

export function periodDays(
  entries: FoodLogEntry[],
  foodIndex: Record<string, Food>,
  days: PeriodLength,
  end = localDateKey(),
): DayTrend[] {
  return dateKeysInRange(days, end).map((dateKey) => dayTrend(entries, foodIndex, dateKey));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function addGroups(a: FoodGroupTotals, b: FoodGroupTotals): FoodGroupTotals {
  return {
    vegetableServes: a.vegetableServes + b.vegetableServes,
    grainServes: a.grainServes + b.grainServes,
    proteinServes: a.proteinServes + b.proteinServes,
    fruitServes: a.fruitServes + b.fruitServes,
  };
}

function scaleGroups(groups: FoodGroupTotals, factor: number): FoodGroupTotals {
  return {
    vegetableServes: groups.vegetableServes * factor,
    grainServes: groups.grainServes * factor,
    proteinServes: groups.proteinServes * factor,
    fruitServes: groups.fruitServes * factor,
  };
}

export function periodSummary(
  entries: FoodLogEntry[],
  foodIndex: Record<string, Food>,
  targets: NutritionTargets,
  days: PeriodLength,
  end = localDateKey(),
  completeOnly = false,
): PeriodSummary {
  const all = periodDays(entries, foodIndex, days, end);
  const logged = all.filter((day) => day.logged);
  const sample = completeOnly ? logged.filter((day) => day.complete) : logged;
  const groupsAverage = sample.length
    ? scaleGroups(sample.reduce((sum, day) => addGroups(sum, day.groups), emptyFoodGroups()), 1 / sample.length)
    : emptyFoodGroups();
  return {
    days,
    loggedDays: logged.length,
    completeDays: logged.filter((day) => day.complete).length,
    averageEnergyKcal: average(sample.map((day) => day.energyKcal)),
    averageProteinG: average(sample.map((day) => day.proteinG)),
    averageFibreG: average(sample.map((day) => day.fibreG)),
    averageSodiumMg: average(sample.map((day) => day.sodiumMg)),
    groupsAverage,
    highSodiumDays: sample.filter((day) => day.sodiumMg > targets.sodiumMg * 0.8).length,
    lowFibreDays: sample.filter((day) => day.fibreG < targets.fibreG * 0.45).length,
    lowVegDays: sample.filter((day) => day.groups.vegetableServes < targets.vegetableServes * 0.45).length,
    lowFruitDays: sample.filter((day) => day.groups.fruitServes < FRUIT_SERVE_TARGET * 0.45).length,
  };
}

export function actionableAdvice(
  todayTotal: Nutrients,
  todayGroups: FoodGroupTotals,
  week: PeriodSummary,
  targets: NutritionTargets,
  todayLogged: boolean,
): TrendAdvice[] {
  const items: TrendAdvice[] = [];
  if (todayLogged) {
    items.push({
      title: nextMealSuggestion(todayTotal, targets, todayGroups),
      reason: '根据今天已记下的蛋白质、纤维、钠和食物组估算。',
    });
  } else {
    items.push({
      title: '先记下这一餐，趋势和建议会按已记录的日子计算。',
      reason: '没有记录时不会用空白日去平均，以免把没记当成吃得很少。',
    });
  }

  if (week.loggedDays >= 3 && week.highSodiumDays >= 3) {
    items.push({
      title: '本周多天钠偏高，可用清蒸、少酱或少方便面代替蚝油和泡面。',
      reason: `在已统计的 ${week.loggedDays} 天里，有 ${week.highSodiumDays} 天钠明显高于日常目标。`,
    });
  }
  if (week.loggedDays >= 3 && week.lowFibreDays >= 3) {
    items.push({
      title: '本周纤维偏低，可用糙米、燕麦或两份蔬菜替换精白主食。',
      reason: `已统计日子里有 ${week.lowFibreDays} 天膳食纤维明显不足。`,
    });
  }
  if (week.loggedDays >= 3 && week.lowVegDays >= 3) {
    items.push({
      title: '本周蔬菜出现偏少，下一餐先加一碟青菜、菌菇或毛豆。',
      reason: `已统计日子里有 ${week.lowVegDays} 天蔬菜份数明显偏低。`,
    });
  }
  if (week.loggedDays >= 3 && week.lowFruitDays >= 3) {
    items.push({
      title: '本周水果偏少，可用一份苹果、橙子或酸奶配水果补上。',
      reason: `已统计日子里有 ${week.lowFruitDays} 天几乎没有水果。`,
    });
  }
  if (week.loggedDays >= 3 && (week.averageProteinG ?? 0) < targets.proteinG * 0.5) {
    items.push({
      title: '本周蛋白质整体偏低，可用鸡蛋、豆腐、鱼或鸡胸替换一部分主食。',
      reason: '平均值只反映已记下的餐次，不是医疗评估。',
    });
  }

  const unique = items.filter((item, index, list) => list.findIndex((other) => other.title === item.title) === index);
  return unique.slice(0, 3);
}

export function weekSummaryCsv(
  entries: FoodLogEntry[],
  foodIndex: Record<string, Food>,
  days: PeriodLength = 7,
  end = localDateKey(),
): string {
  const header = ['date', 'logged', 'complete', 'meals', 'energyKcal', 'proteinG', 'fibreG', 'sodiumMg', 'vegetableServes', 'fruitServes', 'grainServes', 'proteinServes'];
  const rows = periodDays(entries, foodIndex, days, end).map((day) => [
    day.dateKey,
    day.logged ? 1 : 0,
    day.complete ? 1 : 0,
    day.mealCount,
    day.logged ? Math.round(day.energyKcal) : '',
    day.logged ? Math.round(day.proteinG * 10) / 10 : '',
    day.logged ? Math.round(day.fibreG * 10) / 10 : '',
    day.logged ? Math.round(day.sodiumMg) : '',
    day.logged ? Math.round(day.groups.vegetableServes * 10) / 10 : '',
    day.logged ? Math.round(day.groups.fruitServes * 10) / 10 : '',
    day.logged ? Math.round(day.groups.grainServes * 10) / 10 : '',
    day.logged ? Math.round(day.groups.proteinServes * 10) / 10 : '',
  ].join(','));
  return [header.join(','), ...rows].join('\n');
}

export function completenessHint(summary: PeriodSummary): string {
  if (summary.loggedDays === 0) return '这几天还没有记录。统计只反映已记下的日子。';
  return `最近 ${summary.days} 天记了 ${summary.loggedDays} 天，其中 ${summary.completeDays} 天至少有两顿正餐。不完整的日子不会被当成“吃得很少”。`;
}
