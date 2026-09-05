import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import type { CustomFood, CustomFoodDraft, FoodLogEntry, MealType, OilLevel, Recipe, UserProfile } from '@/types/nutrition';
import { findRecipe } from '@/data/recipes';
import { localDateKey } from '@/domain/nutrition';
import { incrementLocalMetric } from '@/services/local-metrics';

const STORAGE_KEY = '@shiheng/state/v1';
const STATE_VERSION = 4;

export const defaultProfile: UserProfile = {
  firstName: '朋友',
  energyUnit: 'kj',
  targets: { energyKcal: 2000, proteinG: 90, fibreG: 30, sodiumMg: 2000, vegetableServes: 5, grainServes: 6, proteinServes: 3 },
};

type PersistedPayload = {
  stateVersion?: number;
  entries?: FoodLogEntry[];
  profile?: Partial<UserProfile> & { targets?: Partial<UserProfile['targets']> };
  customFoods?: CustomFood[];
  favouriteFoodIds?: string[];
  verifiedFoodIds?: string[];
  recipes?: Recipe[];
};

export type AddEntryInput = {
  foodId: string;
  servings: number;
  meal: MealType;
  oilLevel?: OilLevel;
  sharedWith?: number;
  portionShare?: number;
  mealGroupId?: string;
  recipeId?: string;
};

type NutritionStore = {
  entries: FoodLogEntry[];
  profile: UserProfile;
  customFoods: CustomFood[];
  favouriteFoodIds: string[];
  verifiedFoodIds: string[];
  recipes: Recipe[];
  hydrated: boolean;
  addEntry: (input: AddEntryInput) => void;
  deleteEntry: (id: string) => void;
  copyEntry: (id: string) => void;
  copyMeal: (meal: MealType, dateKey?: string) => void;
  logRecipe: (recipeId: string, meal: MealType, sharedWith?: number, portionShare?: number) => void;
  saveRecipeFromMeal: (meal: MealType, dateKey?: string, nameZh?: string) => Recipe | null;
  createCustomFood: (draft: CustomFoodDraft) => void;
  toggleFavourite: (foodId: string) => void;
  toggleVerified: (foodId: string) => void;
  updateProfile: (profile: UserProfile) => void;
  clearEntries: () => void;
};

const NutritionContext = createContext<NutritionStore | null>(null);

function newId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function migrateProfile(profile?: PersistedPayload['profile']): UserProfile {
  return {
    firstName: profile?.firstName?.trim() || defaultProfile.firstName,
    energyUnit: profile?.energyUnit === 'kcal' ? 'kcal' : 'kj',
    targets: {
      ...defaultProfile.targets,
      ...profile?.targets,
      vegetableServes: profile?.targets?.vegetableServes ?? defaultProfile.targets.vegetableServes,
      grainServes: profile?.targets?.grainServes ?? defaultProfile.targets.grainServes,
      proteinServes: profile?.targets?.proteinServes ?? defaultProfile.targets.proteinServes,
    },
  };
}

export function NutritionProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [favouriteFoodIds, setFavouriteFoodIds] = useState<string[]>([]);
  const [verifiedFoodIds, setVerifiedFoodIds] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedPayload;
      if (Array.isArray(parsed.entries)) setEntries(parsed.entries);
      if (parsed.profile) setProfile(migrateProfile(parsed.profile));
      if (Array.isArray(parsed.customFoods)) setCustomFoods(parsed.customFoods);
      if (Array.isArray(parsed.favouriteFoodIds)) setFavouriteFoodIds(parsed.favouriteFoodIds);
      if (Array.isArray(parsed.verifiedFoodIds)) setVerifiedFoodIds(parsed.verifiedFoodIds);
      if (Array.isArray(parsed.recipes)) setRecipes(parsed.recipes);
    }).catch(() => { incrementLocalMetric('storage_recovery').catch(() => undefined); }).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      stateVersion: STATE_VERSION, entries, profile, customFoods, favouriteFoodIds, verifiedFoodIds, recipes,
    })).catch(() => undefined);
  }, [entries, profile, customFoods, favouriteFoodIds, verifiedFoodIds, recipes, hydrated]);

  const value = useMemo<NutritionStore>(() => ({
    entries, profile, customFoods, favouriteFoodIds, verifiedFoodIds, recipes, hydrated,
    addEntry: (input) => {
      setEntries((current) => [...current, {
        id: newId(),
        foodId: input.foodId,
        servings: input.servings,
        meal: input.meal,
        recordedAt: new Date().toISOString(),
        oilLevel: input.oilLevel,
        sharedWith: input.sharedWith,
        portionShare: input.portionShare,
        mealGroupId: input.mealGroupId,
        recipeId: input.recipeId,
      }]);
      incrementLocalMetric('entry_added').catch(() => undefined);
    },
    deleteEntry: (id) => { setEntries((current) => current.filter((entry) => entry.id !== id)); incrementLocalMetric('entry_deleted').catch(() => undefined); },
    copyEntry: (id) => setEntries((current) => {
      const source = current.find((entry) => entry.id === id);
      if (!source) return current;
      incrementLocalMetric('entry_copied').catch(() => undefined);
      return [...current, { ...source, id: newId(), recordedAt: new Date().toISOString(), mealGroupId: undefined }];
    }),
    copyMeal: (meal, dateKey = localDateKey()) => setEntries((current) => {
      const sourceEntries = current.filter((entry) => entry.meal === meal && localDateKey(new Date(entry.recordedAt)) === dateKey);
      if (!sourceEntries.length) return current;
      const mealGroupId = newId('meal-');
      const copied = sourceEntries.map((source) => ({
        ...source,
        id: newId(),
        recordedAt: new Date().toISOString(),
        mealGroupId,
      }));
      incrementLocalMetric('meal_copied', copied.length).catch(() => undefined);
      return [...current, ...copied];
    }),
    logRecipe: (recipeId, meal, sharedWith = 1, portionShare = 1) => {
      const recipe = findRecipe(recipeId, recipes);
      if (!recipe?.items.length) return;
      const mealGroupId = newId('meal-');
      const recordedAt = new Date().toISOString();
      setEntries((current) => [
        ...current,
        ...recipe.items.map((item) => ({
          id: newId(),
          foodId: item.foodId,
          servings: item.servings,
          meal,
          recordedAt,
          oilLevel: item.oilLevel,
          sharedWith,
          portionShare,
          mealGroupId,
          recipeId: recipe.id,
        })),
      ]);
      setRecipes((current) => {
        const existing = current.find((item) => item.id === recipe.id);
        if (existing) {
          return current.map((item) => item.id === recipe.id ? { ...item, loggedCount: item.loggedCount + 1 } : item);
        }
        if (recipe.id.startsWith('recipe-')) {
          return [...current, { ...recipe, loggedCount: 1 }];
        }
        return current;
      });
      incrementLocalMetric('recipe_logged').catch(() => undefined);
    },
    saveRecipeFromMeal: (meal, dateKey = localDateKey(), nameZh) => {
      const sourceEntries = entries.filter((entry) => entry.meal === meal && localDateKey(new Date(entry.recordedAt)) === dateKey);
      if (!sourceEntries.length) return null;
      const recipe: Recipe = {
        id: newId('household-'),
        nameZh: nameZh?.trim() || `我家的${meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : meal === 'dinner' ? '晚餐' : '加餐'}`,
        nameEn: 'Our recipe',
        items: sourceEntries.map((entry) => ({ foodId: entry.foodId, servings: entry.servings, oilLevel: entry.oilLevel })),
        createdAt: new Date().toISOString(),
        loggedCount: 1,
        kind: 'household',
        source: {
          type: 'recipe',
          label: '用户保存的家庭菜谱，来自本机记录',
          region: 'AU/CN',
          confidence: 'estimate',
          updatedAt: new Date().toISOString().slice(0, 10),
          dataset: 'recipe-estimate',
        },
      };
      setRecipes((current) => [...current, recipe]);
      incrementLocalMetric('recipe_saved').catch(() => undefined);
      return recipe;
    },
    createCustomFood: (draft) => { setCustomFoods((current) => [...current, {
      ...draft,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      custom: true,
      createdAt: new Date().toISOString(),
      source: {
        type: 'label', label: '用户根据包装或配方录入，尚未独立核验', region: 'AU/CN',
        confidence: 'estimate', updatedAt: new Date().toISOString().slice(0, 10), dataset: 'user-entry',
      },
    }]); incrementLocalMetric('custom_food_created').catch(() => undefined); },
    toggleFavourite: (foodId) => { setFavouriteFoodIds((current) => current.includes(foodId) ? current.filter((id) => id !== foodId) : [...current, foodId]); incrementLocalMetric('favourite_toggled').catch(() => undefined); },
    toggleVerified: (foodId) => { setVerifiedFoodIds((current) => {
      const next = current.includes(foodId) ? current.filter((id) => id !== foodId) : [...current, foodId];
      incrementLocalMetric('food_verified').catch(() => undefined);
      return next;
    }); },
    updateProfile: setProfile,
    clearEntries: () => setEntries([]),
  }), [entries, profile, customFoods, favouriteFoodIds, verifiedFoodIds, recipes, hydrated]);

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
}

export function useNutrition() {
  const value = useContext(NutritionContext);
  if (!value) throw new Error('useNutrition must be used within NutritionProvider');
  return value;
}
