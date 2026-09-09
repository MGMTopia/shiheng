import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FOOD_PACKS_STATE_KEY,
  emptyFoodPackInstallState,
  parseFoodPackInstallState,
  type FoodPackInstallState,
} from '@/domain/food-pack';

let snapshot = emptyFoodPackInstallState();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function getFoodPackInstallSnapshot(): FoodPackInstallState {
  return snapshot;
}

export function subscribeFoodPackInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function reloadFoodPackInstallSnapshot(): Promise<FoodPackInstallState> {
  try {
    const raw = await AsyncStorage.getItem(FOOD_PACKS_STATE_KEY);
    snapshot = parseFoodPackInstallState(raw);
  } catch {
    snapshot = emptyFoodPackInstallState();
  }
  emit();
  return snapshot;
}

export function replaceFoodPackInstallSnapshot(next: FoodPackInstallState): void {
  snapshot = next;
  emit();
}
