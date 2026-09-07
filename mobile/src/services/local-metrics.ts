import AsyncStorage from '@react-native-async-storage/async-storage';

const METRICS_KEY = '@shiheng/local-metrics/v1';
let writeQueue: Promise<void> = Promise.resolve();

export type LocalMetricName =
  | 'app_opened'
  | 'search_used'
  | 'search_empty'
  | 'food_opened'
  | 'entry_added'
  | 'entry_updated'
  | 'entry_deleted'
  | 'entry_copied'
  | 'meal_copied'
  | 'recipe_saved'
  | 'recipe_logged'
  | 'custom_food_created'
  | 'favourite_toggled'
  | 'onboarding_completed'
  | 'feedback_saved'
  | 'storage_recovery'
  | 'storage_write_failed'
  | 'food_verified';

export type LocalMetrics = {
  schemaVersion: 1;
  counters: Partial<Record<LocalMetricName, number>>;
  lastUpdatedAt: string | null;
};

const emptyMetrics = (): LocalMetrics => ({ schemaVersion: 1, counters: {}, lastUpdatedAt: null });

function parseMetrics(raw: string | null): LocalMetrics {
  if (!raw) return emptyMetrics();

  try {
    const parsed = JSON.parse(raw) as Partial<LocalMetrics>;
    if (parsed.schemaVersion !== 1 || !parsed.counters || typeof parsed.counters !== 'object') return emptyMetrics();
    return {
      schemaVersion: 1,
      counters: parsed.counters,
      lastUpdatedAt: typeof parsed.lastUpdatedAt === 'string' ? parsed.lastUpdatedAt : null,
    };
  } catch {
    return emptyMetrics();
  }
}

export async function incrementLocalMetric(name: LocalMetricName, amount = 1): Promise<void> {
  const operation = writeQueue.catch(() => undefined).then(async () => {
    const current = parseMetrics(await AsyncStorage.getItem(METRICS_KEY));
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    const next: LocalMetrics = {
      schemaVersion: 1,
      counters: { ...current.counters, [name]: (current.counters[name] ?? 0) + safeAmount },
      lastUpdatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(METRICS_KEY, JSON.stringify(next));
  });
  writeQueue = operation.catch(() => undefined);
  await operation;
}

export async function readLocalMetrics(): Promise<LocalMetrics> {
  return parseMetrics(await AsyncStorage.getItem(METRICS_KEY));
}

export async function clearLocalMetrics(): Promise<void> {
  await AsyncStorage.removeItem(METRICS_KEY);
}
