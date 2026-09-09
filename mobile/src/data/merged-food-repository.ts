import type { FoodRepository, FoodSearchQuery } from '@/data/food-repository-types';
import type { Food } from '@/types/nutrition';

/**
 * Merge main catalog + enabled pack repositories.
 * Precedence for getById / getByBarcode / getByIds: custom > packs (in order) > main.
 * Search unions results; first occurrence wins (packs before main).
 */
export function createMergedFoodRepository(
  main: FoodRepository,
  packs: FoodRepository[],
): FoodRepository {
  const catalogs = [...packs, main];

  const firstCatalogHit = (
    lookup: (repo: FoodRepository) => Food | undefined,
  ): Food | undefined => {
    for (const repo of catalogs) {
      const hit = lookup(repo);
      if (hit) return hit;
    }
    return undefined;
  };

  return {
    search(query: FoodSearchQuery) {
      const seen = new Set<string>();
      const merged: Food[] = [];
      for (const repo of catalogs) {
        for (const food of repo.search(query)) {
          if (seen.has(food.id)) continue;
          seen.add(food.id);
          merged.push(food);
        }
      }
      return merged;
    },

    getById(id, customFoods = []) {
      const custom = customFoods.find((food) => food.id === id);
      if (custom) return custom;
      return firstCatalogHit((repo) => repo.getById(id, []));
    },

    getByIds(ids, customFoods = []) {
      const result: Record<string, Food> = {};
      for (const food of customFoods) {
        if (ids.includes(food.id)) result[food.id] = food;
      }
      for (const repo of catalogs) {
        const missing = ids.filter((id) => !result[id]);
        if (!missing.length) break;
        Object.assign(result, repo.getByIds(missing, []));
      }
      return result;
    },

    getByBarcode(barcode, customFoods = []) {
      const code = barcode.replace(/\D/g, '');
      if (code.length < 8) return undefined;
      const custom = customFoods.find((food) => (food.barcode ?? '').replace(/\D/g, '') === code);
      if (custom) return custom;
      return firstCatalogHit((repo) => repo.getByBarcode(code, []));
    },

    cluster(foodId, customFoods = []) {
      const custom = customFoods.find((food) => food.id === foodId);
      for (const repo of catalogs) {
        const members = repo.cluster(foodId, []);
        if (members.length) {
          if (custom && !members.some((food) => food.id === custom.id)) return [custom, ...members];
          return members;
        }
      }
      return custom ? [custom] : [];
    },

    listCompositeDishes(customFoods = []) {
      const seen = new Set<string>();
      const dishes: Food[] = [];
      for (const food of customFoods.filter((item) => item.composition)) {
        seen.add(food.id);
        dishes.push(food);
      }
      for (const repo of catalogs) {
        for (const food of repo.listCompositeDishes([])) {
          if (seen.has(food.id)) continue;
          seen.add(food.id);
          dishes.push(food);
        }
      }
      return dishes;
    },
  };
}
