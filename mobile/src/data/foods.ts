import { dishCompositions } from '@/data/dish-compositions';
import { importedFoods } from '@/data/generated/imported-foods';
import { generatedOffFoods } from '@/data/generated/off-packaged-foods';
import { userLabelFoods } from '@/data/generated/user-label-foods';
import { packagedFoods } from '@/data/packaged-foods';
import { foods as seedFoods } from '@/data/seed-foods';
import { inferChineseNames, sanitizeInheritedNames } from '@/domain/catalog-groups';
import type { Food } from '@/types/nutrition';

export { foodCategories } from '@/data/seed-foods';

function withComposition(food: Food): Food {
  const composition = dishCompositions[food.id];
  return composition ? { ...food, composition } : food;
}

function uniqueByBarcode(list: Food[]): Food[] {
  const seen = new Set<string>();
  return list.filter((food) => {
    if (!food.barcode) return true;
    if (seen.has(food.barcode)) return false;
    seen.add(food.barcode);
    return true;
  });
}

export const foods: Food[] = inferChineseNames(sanitizeInheritedNames(
  uniqueByBarcode([...seedFoods, ...packagedFoods, ...generatedOffFoods, ...userLabelFoods, ...(importedFoods as Food[])]).map(withComposition),
));
export const foodsById = Object.fromEntries(foods.map((food) => [food.id, food])) as Record<string, Food>;
export const featuredFoods: Food[] = [...seedFoods, ...packagedFoods].map(withComposition);
export const compositeDishes: Food[] = featuredFoods.filter((food) => food.composition);
