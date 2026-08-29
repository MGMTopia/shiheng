export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodCategory = 'staple' | 'protein' | 'vegetable' | 'fruit' | 'dairy' | 'mixed' | 'snack';

export type Nutrients = {
  energyKcal: number; proteinG: number; carbsG: number; fatG: number; fibreG: number;
  sodiumMg: number; saturatedFatG: number; sugarG: number;
};

export type FoodSource = {
  type: 'official' | 'label' | 'recipe' | 'demo'; label: string; region: 'AU' | 'CN' | 'AU/CN';
  confidence: 'high' | 'medium' | 'estimate'; updatedAt: string;
};

export type Food = {
  id: string; nameZh: string; nameEn: string; aliases: string[]; category: FoodCategory;
  servingLabel: string; servingGrams: number; nutrientsPer100g: Nutrients; source: FoodSource; tags: string[];
};

export type FoodLogEntry = { id: string; foodId: string; servings: number; meal: MealType; recordedAt: string };
export type NutritionTargets = { energyKcal: number; proteinG: number; fibreG: number; sodiumMg: number };
export type UserProfile = { firstName: string; targets: NutritionTargets };
