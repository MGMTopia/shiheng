import {
  SEARCH_MAX_RESULTS,
  SEARCH_PAGE_SIZE,
  catalogMeta,
  catalogSourceFilters,
  foodCategories,
  loggedFoodIds,
  resolveSource,
} from '@/data/catalog-constants';
import { featuredFoods, foods } from '@/data/foods';
import { attachCustomSources, buildClusterIndex, clusterMembers, collapseSearchHits, presentCluster } from '@/domain/catalog-groups';
import { catalogSearchScore, catalogStatus, matchesFoodQuery } from '@/domain/nutrition';
import type { CatalogSourceFilter, CatalogStatus, Food, FoodCategory, FoodLogEntry } from '@/types/nutrition';

export {
  SEARCH_MAX_RESULTS,
  SEARCH_PAGE_SIZE,
  catalogMeta,
  catalogSourceFilters,
  foodCategories,
  foods,
};

const clusterOf = buildClusterIndex(foods);
const catalogFoodIndex: Record<string, Food> = Object.fromEntries(foods.map((food) => [food.id, food]));
const foodIndexCache = new WeakMap<Food[], Record<string, Food>>();

export function createFoodIndex(customFoods: Food[] = []): Record<string, Food> {
  if (!customFoods.length) return catalogFoodIndex;
  const cached = foodIndexCache.get(customFoods);
  if (cached) return cached;
  const index = { ...catalogFoodIndex };
  for (const food of customFoods) index[food.id] = food;
  foodIndexCache.set(customFoods, index);
  return index;
}

export function mergedFoodCatalog(customFoods: Food[] = []): Food[] {
  return [...customFoods, ...foods];
}

export { loggedFoodIds, resolveSource };

export function foodCluster(foodId: string, customFoods: Food[] = []): Food[] {
  const official = clusterMembers(foods, clusterOf, foodId);
  const officialMembers = official.length ? official : (catalogFoodIndex[foodId] ? [catalogFoodIndex[foodId]] : []);
  const custom = customFoods.find((food) => food.id === foodId);
  if (officialMembers.length) {
    const members = attachCustomSources(officialMembers, customFoods);
    if (custom && !members.some((food) => food.id === custom.id)) return [custom, ...members];
    return members;
  }
  return custom ? attachCustomSources([custom], customFoods.filter((food) => food.id !== custom.id)) : [];
}

export function presentedFood(foodId: string, customFoods: Food[] = [], source?: CatalogSourceFilter): Food | undefined {
  const members = foodCluster(foodId, customFoods);
  if (!members.length) return undefined;
  return presentCluster(members, source);
}

export function searchCatalog(options: {
  customFoods?: Food[];
  query?: string;
  category?: 'all' | FoodCategory;
  favouriteFoodIds?: string[];
  entries?: FoodLogEntry[];
  verifiedFoodIds?: string[];
  source?: CatalogSourceFilter;
  dexOnly?: boolean;
  supermarketOnly?: boolean;
  officialOnly?: boolean;
  overseasOnly?: boolean;
  limit?: number;
}): Food[] {
  const {
    customFoods = [], query = '', category = 'all', favouriteFoodIds = [],
    entries = [], verifiedFoodIds = [], limit = SEARCH_PAGE_SIZE,
  } = options;
  const source = resolveSource(options);
  const logged = new Set(loggedFoodIds(entries));
  const verified = new Set(verifiedFoodIds);
  const customIds = new Set(customFoods.map((food) => food.id));
  const needle = query.trim();
  const featuredIds = new Set(featuredFoods.map((food) => food.id));
  const browseAll = source === 'official' || source === 'overseas' || source === 'supermarket' || source === 'logged';
  const catalog = mergedFoodCatalog(customFoods);
  const index = customFoods.length ? buildClusterIndex(catalog) : clusterOf;

  const matches = catalog
    .filter((food) => (category === 'all' || food.category === category) && matchesFoodQuery(food, query))
    .filter((food) => {
      switch (source) {
        case 'logged': return logged.has(food.id) || verified.has(food.id);
        case 'supermarket': return food.tags.includes('supermarket');
        case 'official': return food.tags.includes('fsanz');
        case 'overseas': return food.tags.includes('overseas');
        default: return true;
      }
    })
    .filter((food) => needle.length > 0 || browseAll || featuredIds.has(food.id) || customIds.has(food.id));

  const collapsed = collapseSearchHits(matches, catalog, index, source === 'common' ? undefined : source);
  const results = collapsed.sort((a, b) => {
    const score = (food: Food) => {
      const members = [food, ...(food.alternateSources ?? []).map((item) => catalog.find((entry) => entry.id === item.foodId)).filter(Boolean)] as Food[];
      return Math.max(...members.map((member) => catalogSearchScore(member, query, { favouriteFoodIds, logged, featuredIds, customIds })));
    };
    const delta = score(b) - score(a);
    return delta !== 0 ? delta : a.nameEn.localeCompare(b.nameEn);
  });

  const pageSize = Math.min(Math.max(1, limit), SEARCH_MAX_RESULTS);
  return needle.length > 0 || browseAll ? results.slice(0, pageSize) : results;
}

export function statusForFood(foodId: string, entries: FoodLogEntry[], verifiedFoodIds: string[]): CatalogStatus {
  return catalogStatus(foodId, loggedFoodIds(entries), verifiedFoodIds);
}
