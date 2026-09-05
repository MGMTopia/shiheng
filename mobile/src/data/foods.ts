export { foodCategories } from '@/data/seed-foods';
import { dishCompositions } from '@/data/dish-compositions';
import { importedFoods } from '@/data/generated/imported-foods';
import { packagedFoods } from '@/data/packaged-foods';
import { foods as seedFoods } from '@/data/seed-foods';
import { sanitizeInheritedNames } from '@/domain/catalog-groups';
import type { Food } from '@/types/nutrition';

function withComposition(food: Food): Food {
  const composition = dishCompositions[food.id];
  return composition ? { ...food, composition } : food;
}

export const foods: Food[] = sanitizeInheritedNames(
  [...seedFoods, ...packagedFoods, ...(importedFoods as Food[])].map(withComposition),
);
export const foodsById = Object.fromEntries(foods.map((food) => [food.id, food])) as Record<string, Food>;
export const featuredFoods: Food[] = [...seedFoods, ...packagedFoods].map(withComposition);
export const compositeDishes: Food[] = featuredFoods.filter((food) => food.composition);
