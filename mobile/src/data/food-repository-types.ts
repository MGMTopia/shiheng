import type { CatalogSourceFilter, Food, FoodCategory, FoodLogEntry } from '@/types/nutrition';

export type FoodSearchQuery = {
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
};

export type FoodRepository = {
  search(query: FoodSearchQuery): Food[];
  getById(id: string, customFoods?: Food[]): Food | undefined;
  getByIds(ids: string[], customFoods?: Food[]): Record<string, Food>;
  cluster(foodId: string, customFoods?: Food[]): Food[];
  listCompositeDishes(customFoods?: Food[]): Food[];
};
