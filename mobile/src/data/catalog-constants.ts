import { catalogMeta } from '@/data/catalog-meta';
import { foodCategories } from '@/data/seed-foods';
import { catalogStatus } from '@/domain/nutrition';
import type { CatalogSourceFilter, CatalogStatus, FoodLogEntry } from '@/types/nutrition';

export { catalogMeta, foodCategories };

export const catalogSourceFilters: { id: CatalogSourceFilter; label: string }[] = [
  { id: 'common', label: '常用' },
  { id: 'logged', label: '吃过' },
  { id: 'supermarket', label: '超市' },
  { id: 'official', label: '澳洲官方' },
  { id: 'overseas', label: '海外' },
];

export const SEARCH_PAGE_SIZE = 30;
export const SEARCH_MAX_RESULTS = 80;
export const CATALOG_DB_NAME = `shiheng-foods-${catalogMeta.version}.db`;

export function loggedFoodIds(entries: FoodLogEntry[]): string[] {
  return [...new Set(entries.map((entry) => entry.foodId))];
}

export function resolveSource(options: {
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

export function statusForFood(foodId: string, entries: FoodLogEntry[], verifiedFoodIds: string[]): CatalogStatus {
  return catalogStatus(foodId, loggedFoodIds(entries), verifiedFoodIds);
}
