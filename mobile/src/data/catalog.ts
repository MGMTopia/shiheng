import { catalogMeta } from '@/data/catalog-meta';
import { featuredFoods, foodCategories, foods } from '@/data/foods';
import { buildClusterIndex, clusterMembers, collapseSearchHits, presentCluster } from '@/domain/catalog-groups';
import { catalogSearchScore, catalogStatus, matchesFoodQuery } from '@/domain/nutrition';
import type { CatalogSourceFilter, CatalogStatus, Food, FoodCategory, FoodLogEntry } from '@/types/nutrition';

export { catalogMeta, foodCategories, foods };

export const catalogSourceFilters: { id: CatalogSourceFilter; label: string }[] = [
  { id: 'common', label: '常用' },
  { id: 'logged', label: '吃过' },
  { id: 'supermarket', label: '超市' },
  { id: 'official', label: '澳洲官方' },
  { id: 'overseas', label: '海外' },
];

const clusterOf = buildClusterIndex(foods);

export function createFoodIndex(customFoods: Food[] = []): Record<string, Food> {
  return Object.fromEntries([...foods, ...customFoods].map((food) => [food.id, food]));
}

export function mergedFoodCatalog(customFoods: Food[] = []): Food[] {
  return [...customFoods, ...foods];
}

export function loggedFoodIds(entries: FoodLogEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.foodId))];
}

function resolveSource(options: {
  source?: CatalogSourceFilter;
  dexOnly?: boolean;
  supermarketOnly?: boolean;
  officialOnly?: boolean;
  overseasOnly?: boolean;
}): CatalogSourceFilter {
  if (options.source) return options.source;
  if (options.officialOnly) return 'official';
  if (options.overseasOnly) return 'overseas';
  if (options.supermarketOnly) return 'supermarket';
  if (options.dexOnly) return 'logged';
  return 'common';
}

export function foodCluster(foodId: string, customFoods: Food[] = []): Food[] {
  const catalog = mergedFoodCatalog(customFoods);
  const index = customFoods.length ? buildClusterIndex(catalog) : clusterOf;
  const members = clusterMembers(catalog, index, foodId);
  return members.length ? members : catalog.filter((food) => food.id === foodId);
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
}): Food[] {
  const {
    customFoods = [], query = '', category = 'all', favouriteFoodIds = [],
    entries = [], verifiedFoodIds = [],
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

  return needle.length > 0 || browseAll ? results.slice(0, 80) : results;
}

export function statusForFood(foodId: string, entries: FoodLogEntry[], verifiedFoodIds: string[]): CatalogStatus {
  return catalogStatus(foodId, loggedFoodIds(entries), verifiedFoodIds);
}
