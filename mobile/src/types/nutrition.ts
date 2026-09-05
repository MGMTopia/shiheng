export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodCategory = 'staple' | 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'mixed' | 'snack';
export type EnergyUnit = 'kj' | 'kcal';
export type OilLevel = 'light' | 'normal' | 'restaurant';

export type Nutrients = {
  energyKcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number;
  sodiumMg: number; saturatedFatG: number; sugarG: number;
};

export type CatalogStatus = 'unseen' | 'logged' | 'verified';
export type FoodSourceDataset = 'seed-pending-afcd' | 'recipe-estimate' | 'user-entry' | 'open-food-facts' | 'fsanz-afcd' | 'fsanz-ausnut' | 'usda-fdc';
export type Supermarket = 'woolworths' | 'coles';

export type FoodSource = {
  type: 'official' | 'label' | 'recipe' | 'demo'; label: string; region: 'AU' | 'CN' | 'AU/CN' | 'US';
  confidence: 'high' | 'medium' | 'estimate'; updatedAt: string;
  dataset?: FoodSourceDataset; externalId?: string;
};

export type OverseasReference = {
  dataset: 'usda-fdc'; nameEn: string; externalId: string; label: string; nutrientsPer100g: Nutrients;
};

/** One ingredient in a mixed-dish composition. Resolved against the catalog at estimate time. */
export type DishIngredient = {
  foodId: string;
  grams: number;
};

/** Home-style mixed dish: ingredients, oil (as an ingredient), and cooked yield. Not a multi-dish 套餐. */
export type DishComposition = {
  ingredients: DishIngredient[];
  yieldGrams: number;
  note?: string;
};

export type CatalogSourceFilter = 'common' | 'logged' | 'supermarket' | 'official' | 'overseas';

export type AlternateSource = {
  foodId: string;
  nameZh: string;
  nameEn: string;
  source: FoodSource;
  servingLabel: string;
  servingGrams: number;
  nutrientsPer100g: Nutrients;
  brand?: string;
  barcode?: string;
  stores?: Supermarket[];
};

export type Food = {
  id: string; nameZh: string; nameEn: string; aliases: string[]; category: FoodCategory;
  servingLabel: string; servingGrams: number; nutrientsPer100g: Nutrients; source: FoodSource; tags: string[];
  barcode?: string; brand?: string; stores?: Supermarket[]; overseasReference?: OverseasReference;
  composition?: DishComposition;
  alternateSources?: AlternateSource[];
};

/** A single catalog item the user typed in. Not a multi-dish recipe. */
export type CustomFoodDraft = Omit<Food, 'id' | 'source'>;
export type CustomFood = Food & { custom: true; createdAt: string };

export type FoodLogEntry = {
  id: string;
  foodId: string;
  servings: number;
  meal: MealType;
  recordedAt: string;
  oilLevel?: OilLevel;
  sharedWith?: number;
  portionShare?: number;
  mealGroupId?: string;
  recipeId?: string;
};

export type RecipeItem = {
  foodId: string;
  servings: number;
  oilLevel?: OilLevel;
};

/** Persistent meal template. Distinct from CustomFood: a recipe points at foods, it is not itself a Food. */
export type Recipe = {
  id: string;
  nameZh: string;
  nameEn: string;
  items: RecipeItem[];
  prepMinutes?: number;
  createdAt: string;
  loggedCount: number;
  source: FoodSource;
  kind: 'household';
};

export type NutritionTargets = {
  energyKcal: number;
  proteinG: number;
  fibreG: number;
  sodiumMg: number;
  vegetableServes: number;
  grainServes: number;
  proteinServes: number;
};

export type UserProfile = {
  firstName: string;
  targets: NutritionTargets;
  energyUnit: EnergyUnit;
};

export type FoodGroupTotals = {
  vegetableServes: number;
  grainServes: number;
  proteinServes: number;
};

export type MealCard = {
  id: string;
  meal: MealType;
  recordedAt: string;
  entries: FoodLogEntry[];
  recipeId?: string;
};
