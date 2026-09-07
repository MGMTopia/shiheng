import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CustomFood, CustomFoodDraft, FoodLogEntry, MealType, OilLevel, PortionMemory, Recipe, UserProfile } from '@/types/nutrition';
import { findRecipe } from '@/data/recipes';
import { dateKeyToRecordedAt, localDateKey } from '@/domain/nutrition';
import {
  CORRUPT_STORAGE_KEY,
  LAST_BACKUP_KEY,
  STORAGE_KEY,
  createSerialWriter,
  defaultProfile,
  emptySnapshot,
  parsePersistedState,
  serializePersistedState,
  type PersistedSnapshot,
  type RestoreError,
} from '@/domain/persisted-state';
import { incrementLocalMetric } from '@/services/local-metrics';

export { defaultProfile };

const UNDO_MS = 8000;

export type AddEntryInput = {
  foodId: string;
  servings: number;
  meal: MealType;
  oilLevel?: OilLevel;
  sharedWith?: number;
  portionShare?: number;
  mealGroupId?: string;
  recipeId?: string;
  recordedAt?: string;
  dateKey?: string;
};

export type EntryPatch = Partial<Pick<FoodLogEntry, 'foodId' | 'servings' | 'meal' | 'recordedAt' | 'oilLevel' | 'sharedWith' | 'portionShare'>>;

export type LoadState = 'loading' | 'ready' | 'failed';

type NutritionStore = {
  entries: FoodLogEntry[];
  profile: UserProfile;
  customFoods: CustomFood[];
  favouriteFoodIds: string[];
  verifiedFoodIds: string[];
  recipes: Recipe[];
  portionMemory: Record<string, PortionMemory>;
  hydrated: boolean;
  loadState: LoadState;
  loadError: RestoreError | 'read-failed' | null;
  lastBackupAt: string | null;
  undoLabel: string | null;
  addEntry: (input: AddEntryInput) => void;
  updateEntry: (id: string, patch: EntryPatch) => void;
  deleteEntry: (id: string) => void;
  undoDelete: () => void;
  copyEntry: (id: string, dateKey?: string) => void;
  copyMeal: (meal: MealType, fromDateKey?: string, toDateKey?: string) => void;
  logRecipe: (recipeId: string, meal: MealType, sharedWith?: number, portionShare?: number, dateKey?: string) => void;
  saveRecipeFromMeal: (meal: MealType, dateKey?: string, nameZh?: string) => Recipe | null;
  createCustomFood: (draft: CustomFoodDraft) => void;
  toggleFavourite: (foodId: string) => void;
  toggleVerified: (foodId: string) => void;
  updateProfile: (profile: UserProfile) => void;
  clearEntries: () => void;
  clearAllPersonalData: () => void;
  replaceSnapshot: (snapshot: PersistedSnapshot) => void;
  currentSnapshot: () => PersistedSnapshot;
  markBackupSaved: (exportedAt: string) => void;
  startFreshAfterFailure: () => Promise<void>;
  retryLoad: () => void;
};

const NutritionContext = createContext<NutritionStore | null>(null);

function newId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function recordedAtFor(input: { recordedAt?: string; dateKey?: string }): string {
  if (input.recordedAt) return input.recordedAt;
  if (input.dateKey) return dateKeyToRecordedAt(input.dateKey);
  return new Date().toISOString();
}

export function NutritionProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [favouriteFoodIds, setFavouriteFoodIds] = useState<string[]>([]);
  const [verifiedFoodIds, setVerifiedFoodIds] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [portionMemory, setPortionMemory] = useState<Record<string, PortionMemory>>({});
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<RestoreError | 'read-failed' | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const writable = useRef(false);
  const pendingUndo = useRef<FoodLogEntry[] | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writer = useRef(createSerialWriter((value) => AsyncStorage.setItem(STORAGE_KEY, value)));

  const applySnapshot = (snapshot: PersistedSnapshot) => {
    setEntries(snapshot.entries);
    setProfile(snapshot.profile);
    setCustomFoods(snapshot.customFoods);
    setFavouriteFoodIds(snapshot.favouriteFoodIds);
    setVerifiedFoodIds(snapshot.verifiedFoodIds);
    setRecipes(snapshot.recipes);
    setPortionMemory(snapshot.portionMemory ?? {});
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LAST_BACKUP_KEY),
    ]).then(([raw, backupAt]) => {
      if (!active) return;
      const restored = parsePersistedState(raw);
      if (!restored.writable) {
        writable.current = false;
        setLoadError(restored.error ?? 'read-failed');
        setLoadState('failed');
        incrementLocalMetric('storage_recovery').catch(() => undefined);
        return;
      }
      applySnapshot(restored.snapshot);
      setLastBackupAt(backupAt);
      writable.current = true;
      setLoadError(null);
      setLoadState('ready');
      if (restored.dropped.entries || restored.dropped.customFoods || restored.dropped.recipes) {
        incrementLocalMetric('storage_recovery').catch(() => undefined);
      }
    }).catch(() => {
      if (!active) return;
      writable.current = false;
      setLoadError('read-failed');
      setLoadState('failed');
      incrementLocalMetric('storage_recovery').catch(() => undefined);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loadState !== 'ready' || !writable.current) return;
    writer.current.enqueue(serializePersistedState({
      ...emptySnapshot(),
      entries,
      profile,
      customFoods,
      favouriteFoodIds,
      verifiedFoodIds,
      recipes,
      portionMemory,
    })).catch(() => {
      incrementLocalMetric('storage_write_failed').catch(() => undefined);
    });
  }, [entries, profile, customFoods, favouriteFoodIds, verifiedFoodIds, recipes, portionMemory, loadState]);

  const rememberPortion = (foodId: string, memory: PortionMemory) => {
    setPortionMemory((current) => ({ ...current, [foodId]: memory }));
  };

  const queueUndo = (removed: FoodLogEntry[]) => {
    pendingUndo.current = removed;
    setUndoLabel(removed.length > 1 ? `已删除 ${removed.length} 条，可撤销` : '已删除，可撤销');
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => {
      pendingUndo.current = null;
      setUndoLabel(null);
    }, UNDO_MS);
  };

  const value = useMemo<NutritionStore>(() => ({
    entries, profile, customFoods, favouriteFoodIds, verifiedFoodIds, recipes, portionMemory,
    hydrated: loadState !== 'loading', loadState, loadError, lastBackupAt, undoLabel,
    addEntry: (input) => {
      const recordedAt = recordedAtFor(input);
      setEntries((current) => [...current, {
        id: newId(),
        foodId: input.foodId,
        servings: input.servings,
        meal: input.meal,
        recordedAt,
        oilLevel: input.oilLevel,
        sharedWith: input.sharedWith,
        portionShare: input.portionShare,
        mealGroupId: input.mealGroupId,
        recipeId: input.recipeId,
      }]);
      rememberPortion(input.foodId, {
        servings: input.servings,
        meal: input.meal,
        oilLevel: input.oilLevel,
        sharedWith: input.sharedWith,
        portionShare: input.portionShare,
      });
      incrementLocalMetric('entry_added').catch(() => undefined);
    },
    updateEntry: (id, patch) => {
      setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, ...patch } : entry));
      incrementLocalMetric('entry_updated').catch(() => undefined);
    },
    deleteEntry: (id) => {
      setEntries((current) => {
        const removed = current.filter((entry) => entry.id === id);
        if (removed.length) queueUndo(removed);
        incrementLocalMetric('entry_deleted').catch(() => undefined);
        return current.filter((entry) => entry.id !== id);
      });
    },
    undoDelete: () => {
      const removed = pendingUndo.current;
      if (!removed?.length) return;
      pendingUndo.current = null;
      setUndoLabel(null);
      if (undoTimer.current) clearTimeout(undoTimer.current);
      setEntries((current) => [...current, ...removed]);
    },
    copyEntry: (id, dateKey) => setEntries((current) => {
      const source = current.find((entry) => entry.id === id);
      if (!source) return current;
      incrementLocalMetric('entry_copied').catch(() => undefined);
      return [...current, {
        ...source,
        id: newId(),
        recordedAt: dateKey ? dateKeyToRecordedAt(dateKey) : new Date().toISOString(),
        mealGroupId: undefined,
      }];
    }),
    copyMeal: (meal, fromDateKey = localDateKey(), toDateKey = localDateKey()) => setEntries((current) => {
      const sourceEntries = current.filter((entry) => entry.meal === meal && localDateKey(new Date(entry.recordedAt)) === fromDateKey);
      if (!sourceEntries.length) return current;
      const mealGroupId = newId('meal-');
      const recordedAt = dateKeyToRecordedAt(toDateKey);
      const copied = sourceEntries.map((source) => ({
        ...source,
        id: newId(),
        recordedAt,
        mealGroupId,
      }));
      incrementLocalMetric('meal_copied', copied.length).catch(() => undefined);
      return [...current, ...copied];
    }),
    logRecipe: (recipeId, meal, sharedWith, portionShare, dateKey) => {
      const recipe = findRecipe(recipeId, recipes);
      if (!recipe?.items.length) return;
      const people = sharedWith ?? recipe.defaultSharedWith ?? 1;
      const share = portionShare ?? recipe.defaultPortionShare ?? 1;
      const mealGroupId = newId('meal-');
      const recordedAt = dateKey ? dateKeyToRecordedAt(dateKey) : new Date().toISOString();
      setEntries((current) => [
        ...current,
        ...recipe.items.map((item) => ({
          id: newId(),
          foodId: item.foodId,
          servings: item.servings,
          meal,
          recordedAt,
          oilLevel: item.oilLevel,
          sharedWith: people,
          portionShare: share,
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
        defaultSharedWith: sourceEntries[0]?.sharedWith,
        defaultPortionShare: sourceEntries[0]?.portionShare,
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
    clearAllPersonalData: () => applySnapshot(emptySnapshot()),
    replaceSnapshot: (snapshot) => {
      applySnapshot(snapshot);
      writable.current = true;
      setLoadError(null);
      setLoadState('ready');
    },
    currentSnapshot: () => ({
      ...emptySnapshot(),
      entries,
      profile,
      customFoods,
      favouriteFoodIds,
      verifiedFoodIds,
      recipes,
      portionMemory,
    }),
    markBackupSaved: (exportedAt) => {
      setLastBackupAt(exportedAt);
      AsyncStorage.setItem(LAST_BACKUP_KEY, exportedAt).catch(() => undefined);
    },
    startFreshAfterFailure: async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (raw) await AsyncStorage.setItem(CORRUPT_STORAGE_KEY, raw).catch(() => undefined);
      applySnapshot(emptySnapshot());
      writable.current = true;
      setLoadError(null);
      setLoadState('ready');
    },
    retryLoad: () => {
      setLoadState('loading');
      Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(LAST_BACKUP_KEY),
      ]).then(([raw, backupAt]) => {
        const restored = parsePersistedState(raw);
        if (!restored.writable) {
          writable.current = false;
          setLoadError(restored.error ?? 'read-failed');
          setLoadState('failed');
          return;
        }
        applySnapshot(restored.snapshot);
        setLastBackupAt(backupAt);
        writable.current = true;
        setLoadError(null);
        setLoadState('ready');
      }).catch(() => {
        writable.current = false;
        setLoadError('read-failed');
        setLoadState('failed');
      });
    },
  }), [entries, profile, customFoods, favouriteFoodIds, verifiedFoodIds, recipes, portionMemory, loadState, loadError, lastBackupAt, undoLabel]);

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
}

export function useNutrition() {
  const value = useContext(NutritionContext);
  if (!value) throw new Error('useNutrition must be used within NutritionProvider');
  return value;
}
