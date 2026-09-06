import type { CustomFood, FoodLogEntry, MealType, OilLevel, Recipe, UserProfile } from '@/types/nutrition';

export const STORAGE_KEY = '@shiheng/state/v1';
export const STATE_VERSION = 4;

export const defaultProfile: UserProfile = {
  firstName: '朋友',
  energyUnit: 'kj',
  targets: { energyKcal: 2000, proteinG: 90, fibreG: 30, sodiumMg: 2000, vegetableServes: 5, grainServes: 6, proteinServes: 3 },
};

export type PersistedSnapshot = {
  stateVersion: number;
  entries: FoodLogEntry[];
  profile: UserProfile;
  customFoods: CustomFood[];
  favouriteFoodIds: string[];
  verifiedFoodIds: string[];
  recipes: Recipe[];
};

export type RestoreError = 'invalid-json' | 'not-object';

export type RestoreResult = {
  snapshot: PersistedSnapshot;
  migratedFrom: number | null;
  dropped: { entries: number; customFoods: number; recipes: number; ids: number };
  error?: RestoreError;
};

type UnknownRecord = Record<string, unknown>;

const MEALS: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const OIL_LEVELS: readonly OilLevel[] = ['light', 'normal', 'restaurant'];

export function emptySnapshot(): PersistedSnapshot {
  return {
    stateVersion: STATE_VERSION,
    entries: [],
    profile: defaultProfile,
    customFoods: [],
    favouriteFoodIds: [],
    verifiedFoodIds: [],
    recipes: [],
  };
}

export function serializePersistedState(snapshot: PersistedSnapshot): string {
  return JSON.stringify({
    ...snapshot,
    stateVersion: STATE_VERSION,
  });
}

export function parsePersistedState(raw: string | null | undefined): RestoreResult {
  if (raw == null || raw === '') {
    return { snapshot: emptySnapshot(), migratedFrom: null, dropped: emptyDropped() };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { snapshot: emptySnapshot(), migratedFrom: null, dropped: emptyDropped(), error: 'invalid-json' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { snapshot: emptySnapshot(), migratedFrom: null, dropped: emptyDropped(), error: 'not-object' };
  }

  const payload = parsed as UnknownRecord;
  const migratedFrom = typeof payload.stateVersion === 'number' && Number.isFinite(payload.stateVersion)
    ? payload.stateVersion
    : 0;
  return normalizePayload(migratePayload(payload, migratedFrom), migratedFrom);
}

function migratePayload(payload: UnknownRecord, version: number): UnknownRecord {
  const next: UnknownRecord = { ...payload };

  if (version < 1) {
    next.entries = Array.isArray(next.entries) ? next.entries : [];
  }
  if (version < 2) {
    next.profile = next.profile && typeof next.profile === 'object' ? next.profile : {};
  }
  if (version < 3) {
    next.customFoods = Array.isArray(next.customFoods) ? next.customFoods : [];
    next.favouriteFoodIds = Array.isArray(next.favouriteFoodIds) ? next.favouriteFoodIds : [];
  }
  if (version < 4) {
    next.verifiedFoodIds = Array.isArray(next.verifiedFoodIds) ? next.verifiedFoodIds : [];
    next.recipes = Array.isArray(next.recipes) ? next.recipes : [];
    if (next.profile && typeof next.profile === 'object' && !Array.isArray(next.profile)) {
      const profile = next.profile as UnknownRecord;
      if (profile.energyUnit !== 'kcal') profile.energyUnit = 'kj';
    }
  }

  return next;
}

function normalizePayload(payload: UnknownRecord, migratedFrom: number): RestoreResult {
  const dropped = emptyDropped();
  const entries = filterItems(payload.entries, isFoodLogEntry, () => { dropped.entries += 1; });
  const customFoods = filterItems(payload.customFoods, isCustomFood, () => { dropped.customFoods += 1; });
  const recipes = filterItems(payload.recipes, isRecipe, () => { dropped.recipes += 1; });
  const favouriteFoodIds = filterIds(payload.favouriteFoodIds, () => { dropped.ids += 1; });
  const verifiedFoodIds = filterIds(payload.verifiedFoodIds, () => { dropped.ids += 1; });

  return {
    snapshot: {
      stateVersion: STATE_VERSION,
      entries,
      profile: migrateProfile(payload.profile),
      customFoods,
      favouriteFoodIds,
      verifiedFoodIds,
      recipes,
    },
    migratedFrom: migratedFrom === STATE_VERSION ? STATE_VERSION : migratedFrom,
    dropped,
  };
}

export function migrateProfile(profile: unknown): UserProfile {
  const input = profile && typeof profile === 'object' && !Array.isArray(profile)
    ? profile as { firstName?: unknown; energyUnit?: unknown; targets?: Record<string, unknown> }
    : {};
  const targets = input.targets && typeof input.targets === 'object' ? input.targets : {};
  return {
    firstName: typeof input.firstName === 'string' && input.firstName.trim() ? input.firstName.trim() : defaultProfile.firstName,
    energyUnit: input.energyUnit === 'kcal' ? 'kcal' : 'kj',
    targets: {
      energyKcal: finitePositive(targets.energyKcal, defaultProfile.targets.energyKcal),
      proteinG: finitePositive(targets.proteinG, defaultProfile.targets.proteinG),
      fibreG: finitePositive(targets.fibreG, defaultProfile.targets.fibreG),
      sodiumMg: finitePositive(targets.sodiumMg, defaultProfile.targets.sodiumMg),
      vegetableServes: finitePositive(targets.vegetableServes, defaultProfile.targets.vegetableServes),
      grainServes: finitePositive(targets.grainServes, defaultProfile.targets.grainServes),
      proteinServes: finitePositive(targets.proteinServes, defaultProfile.targets.proteinServes),
    },
  };
}

export function createSerialWriter(write: (value: string) => Promise<void>) {
  let chain = Promise.resolve();
  let pending: string | null = null;
  let scheduled = false;

  const flush = async () => {
    scheduled = false;
    while (pending != null) {
      const value = pending;
      pending = null;
      await write(value);
    }
  };

  return {
    enqueue(value: string): Promise<void> {
      pending = value;
      if (!scheduled) {
        scheduled = true;
        chain = chain.then(flush, flush);
      }
      return chain;
    },
  };
}

function emptyDropped() {
  return { entries: 0, customFoods: 0, recipes: 0, ids: 0 };
}

function filterItems<T>(value: unknown, guard: (item: unknown) => item is T, onDrop: () => void): T[] {
  if (!Array.isArray(value)) return [];
  const kept: T[] = [];
  for (const item of value) {
    if (guard(item)) kept.push(item);
    else onDrop();
  }
  return kept;
}

function filterIds(value: unknown, onDrop: () => void): string[] {
  if (!Array.isArray(value)) return [];
  const kept: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.trim()) kept.push(item);
    else onDrop();
  }
  return kept;
}

function isFoodLogEntry(value: unknown): value is FoodLogEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as UnknownRecord;
  return typeof entry.id === 'string' && entry.id.length > 0
    && typeof entry.foodId === 'string' && entry.foodId.length > 0
    && finitePositive(entry.servings, 0) > 0
    && isMeal(entry.meal)
    && typeof entry.recordedAt === 'string'
    && (entry.oilLevel == null || isOilLevel(entry.oilLevel))
    && (entry.sharedWith == null || finitePositive(entry.sharedWith, 0) > 0)
    && (entry.portionShare == null || (typeof entry.portionShare === 'number' && Number.isFinite(entry.portionShare) && entry.portionShare > 0 && entry.portionShare <= 1))
    && (entry.mealGroupId == null || typeof entry.mealGroupId === 'string')
    && (entry.recipeId == null || typeof entry.recipeId === 'string');
}

function isCustomFood(value: unknown): value is CustomFood {
  if (!value || typeof value !== 'object') return false;
  const food = value as UnknownRecord;
  const nutrients = food.nutrientsPer100g;
  return food.custom === true
    && typeof food.id === 'string' && food.id.length > 0
    && typeof food.nameZh === 'string' && food.nameZh.trim().length > 0
    && typeof food.servingLabel === 'string'
    && finitePositive(food.servingGrams, 0) > 0
    && !!nutrients && typeof nutrients === 'object'
    && Number.isFinite((nutrients as UnknownRecord).energyKcal);
}

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== 'object') return false;
  const recipe = value as UnknownRecord;
  return typeof recipe.id === 'string' && recipe.id.length > 0
    && typeof recipe.nameZh === 'string' && recipe.nameZh.trim().length > 0
    && Array.isArray(recipe.items)
    && recipe.items.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const row = item as UnknownRecord;
      return typeof row.foodId === 'string' && row.foodId.length > 0 && finitePositive(row.servings, 0) > 0;
    })
    && recipe.kind === 'household';
}

function isMeal(value: unknown): value is MealType {
  return typeof value === 'string' && (MEALS as readonly string[]).includes(value);
}

function isOilLevel(value: unknown): value is OilLevel {
  return typeof value === 'string' && (OIL_LEVELS as readonly string[]).includes(value);
}

function finitePositive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}
