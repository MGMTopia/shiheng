import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { AVAILABLE_FOOD_PACKS } from '@/data/available-food-packs';
import {
  getFoodPackInstallSnapshot,
  reloadFoodPackInstallSnapshot,
  subscribeFoodPackInstall,
} from '@/data/food-pack-install-store';
import { FoodRepositoryContext, useFoodRepository } from '@/data/food-repository-context';
import { createMergedFoodRepository } from '@/data/merged-food-repository';
import { createSqliteFoodRepository, type SqlQuery } from '@/data/sqlite-food-repository';
import type { FoodPackInstallRecord } from '@/domain/food-pack';
import {
  disableFoodPack,
  downloadAndInstallFoodPack,
  enableFoodPack,
  packDatabaseName,
  packDbFile,
  uninstallFoodPack,
} from '@/services/food-pack-install';

type FoodPackContextValue = {
  state: ReturnType<typeof getFoodPackInstallSnapshot>;
  available: typeof AVAILABLE_FOOD_PACKS;
  busy: boolean;
  message: string;
  refresh: () => Promise<void>;
  download: (packId: string) => Promise<boolean>;
  enable: (packId: string) => Promise<boolean>;
  disable: (packId: string) => Promise<void>;
  uninstall: (packId: string) => Promise<void>;
};

const FoodPackContext = createContext<FoodPackContextValue | null>(null);

function sqlFromDb(db: SQLiteDatabase): SqlQuery {
  return {
    all: (sql, params = []) => (params.length ? db.getAllSync(sql, params) : db.getAllSync(sql)),
    first: (sql, params = []) => (params.length ? db.getFirstSync(sql, params) : db.getFirstSync(sql)) ?? undefined,
  };
}

function openEnabledPackRepositories(records: FoodPackInstallRecord[]) {
  const opened: { id: string; db: SQLiteDatabase }[] = [];
  const repositories = [];
  for (const record of records.filter((pack) => pack.enabled)) {
    const file = packDbFile(record.id);
    if (!file.exists) continue;
    try {
      const db = openDatabaseSync(packDatabaseName(record.id), { useNewConnection: true });
      opened.push({ id: record.id, db });
      repositories.push(createSqliteFoodRepository(sqlFromDb(db)));
    } catch {
      // Corrupt / unreadable pack DBs are skipped; user can re-download.
    }
  }
  return { repositories, opened };
}

export function FoodPackProvider({ children }: PropsWithChildren) {
  const main = useFoodRepository();
  const state = useSyncExternalStore(subscribeFoodPackInstall, getFoodPackInstallSnapshot, getFoodPackInstallSnapshot);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void reloadFoodPackInstallSnapshot();
  }, []);

  const refresh = useCallback(async () => {
    await reloadFoodPackInstallSnapshot();
  }, []);

  const { repository, opened } = useMemo(() => {
    if (Platform.OS === 'web') {
      return { repository: main, opened: [] as { id: string; db: SQLiteDatabase }[] };
    }
    const result = openEnabledPackRepositories(state.packs);
    return {
      repository: result.repositories.length ? createMergedFoodRepository(main, result.repositories) : main,
      opened: result.opened,
    };
  }, [main, state.packs]);

  useEffect(() => () => {
    for (const item of opened) {
      try { item.db.closeSync(); } catch { /* ignore */ }
    }
  }, [opened]);

  const download = useCallback(async (packId: string) => {
    setBusy(true);
    setMessage('');
    const result = await downloadAndInstallFoodPack(packId);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      return false;
    }
    setMessage(`已安装并启用「${result.record.title}」（${result.record.foodCount} 条）。`);
    await refresh();
    return true;
  }, [refresh]);

  const enable = useCallback(async (packId: string) => {
    setBusy(true);
    setMessage('');
    const result = await enableFoodPack(packId);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.error);
      await refresh();
      return false;
    }
    setMessage(`已启用「${result.record.title}」。`);
    await refresh();
    return true;
  }, [refresh]);

  const disable = useCallback(async (packId: string) => {
    setBusy(true);
    await disableFoodPack(packId);
    setBusy(false);
    setMessage('已停用资料包。日记记录仍保留。');
    await refresh();
  }, [refresh]);

  const uninstall = useCallback(async (packId: string) => {
    setBusy(true);
    await uninstallFoodPack(packId);
    setBusy(false);
    setMessage('已卸载资料包。日记记录不会删除。');
    await refresh();
  }, [refresh]);

  const value = useMemo<FoodPackContextValue>(() => ({
    state,
    available: AVAILABLE_FOOD_PACKS,
    busy,
    message,
    refresh,
    download,
    enable,
    disable,
    uninstall,
  }), [state, busy, message, refresh, download, enable, disable, uninstall]);

  return (
    <FoodPackContext.Provider value={value}>
      <FoodRepositoryContext.Provider value={repository}>
        {children}
      </FoodRepositoryContext.Provider>
    </FoodPackContext.Provider>
  );
}

export function useFoodPacks(): FoodPackContextValue {
  const value = useContext(FoodPackContext);
  if (!value) throw new Error('useFoodPacks must be used within FoodPackProvider');
  return value;
}
