import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { FoodLogEntry, MealType, UserProfile } from '@/types/nutrition';

const STORAGE_KEY = '@shiheng/state/v1';
const defaultProfile: UserProfile = { firstName: '朋友', targets: { energyKcal: 2000, proteinG: 90, fibreG: 30, sodiumMg: 2000 } };
type PersistedState = { entries: FoodLogEntry[]; profile: UserProfile };
type NutritionStore = PersistedState & {
  hydrated: boolean;
  addEntry: (foodId: string, servings: number, meal: MealType) => void;
  deleteEntry: (id: string) => void;
  updateProfile: (profile: UserProfile) => void;
  clearEntries: () => void;
};

const NutritionContext = createContext<NutritionStore | null>(null);

export function NutritionProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<FoodLogEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedState;
      if (Array.isArray(parsed.entries)) setEntries(parsed.entries);
      if (parsed.profile?.targets) setProfile(parsed.profile);
    }).catch(() => undefined).finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, profile })).catch(() => undefined);
  }, [entries, profile, hydrated]);

  const value = useMemo<NutritionStore>(() => ({
    entries, profile, hydrated,
    addEntry: (foodId, servings, meal) => setEntries((current) => [...current, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, foodId, servings, meal, recordedAt: new Date().toISOString(),
    }]),
    deleteEntry: (id) => setEntries((current) => current.filter((entry) => entry.id !== id)),
    updateProfile: setProfile,
    clearEntries: () => setEntries([]),
  }), [entries, profile, hydrated]);

  return <NutritionContext.Provider value={value}>{children}</NutritionContext.Provider>;
}

export function useNutrition() {
  const value = useContext(NutritionContext);
  if (!value) throw new Error('useNutrition must be used within NutritionProvider');
  return value;
}
