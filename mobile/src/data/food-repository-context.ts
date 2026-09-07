import { createContext, useContext } from 'react';
import type { FoodRepository } from '@/data/food-repository-types';

export const FoodRepositoryContext = createContext<FoodRepository | null>(null);

export function useFoodRepository(): FoodRepository {
  const value = useContext(FoodRepositoryContext);
  if (!value) throw new Error('useFoodRepository must be used within CatalogProvider');
  return value;
}
