import { compositeDishes } from '@/data/foods';
import { createFoodIndex, findByBarcode, foodCluster, searchCatalog } from '@/data/catalog';
import type { FoodRepository, FoodSearchQuery } from '@/data/food-repository-types';

export function createMemoryFoodRepository(): FoodRepository {
  return {
    search(query: FoodSearchQuery) {
      return searchCatalog(query);
    },
    getById(id, customFoods = []) {
      return createFoodIndex(customFoods)[id];
    },
    getByIds(ids, customFoods = []) {
      const index = createFoodIndex(customFoods);
      return Object.fromEntries(ids.filter((id) => index[id]).map((id) => [id, index[id]]));
    },
    getByBarcode(barcode, customFoods = []) {
      return findByBarcode(barcode, customFoods);
    },
    cluster(foodId, customFoods = []) {
      return foodCluster(foodId, customFoods);
    },
    listCompositeDishes(customFoods = []) {
      return [...customFoods.filter((food) => food.composition), ...compositeDishes];
    },
  };
}

const memoryRepository = createMemoryFoodRepository();

export function getMemoryFoodRepository(): FoodRepository {
  return memoryRepository;
}
