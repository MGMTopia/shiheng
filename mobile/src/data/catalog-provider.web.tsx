import { PropsWithChildren, useMemo } from 'react';
import { getMemoryFoodRepository } from '@/data/memory-food-repository';
import { FoodRepositoryContext } from '@/data/food-repository-context';

export function CatalogProvider({ children }: PropsWithChildren) {
  const repository = useMemo(() => getMemoryFoodRepository(), []);
  return <FoodRepositoryContext.Provider value={repository}>{children}</FoodRepositoryContext.Provider>;
}
