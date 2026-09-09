import { PropsWithChildren, Suspense, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SQLiteProvider, deleteDatabaseAsync, useSQLiteContext } from 'expo-sqlite';
import { LoadingScreen } from '@/components/ui';
import { CATALOG_DB_NAME } from '@/data/catalog-constants';
import { FoodPackProvider } from '@/data/food-pack-provider';
import { FoodRepositoryContext } from '@/data/food-repository-context';
import { createSqliteFoodRepository } from '@/data/sqlite-food-repository';
import { CATALOG_DB_NAME_KEY } from '@/domain/persisted-state';

const catalogAsset = require('../../assets/catalog/foods.db') as number;

function SqliteCatalog({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createSqliteFoodRepository({
    all: (sql, params = []) => (params.length ? db.getAllSync(sql, params) : db.getAllSync(sql)),
    first: (sql, params = []) => (params.length ? db.getFirstSync(sql, params) : db.getFirstSync(sql)) ?? undefined,
  }), [db]);
  return (
    <FoodRepositoryContext.Provider value={repository}>
      <FoodPackProvider>{children}</FoodPackProvider>
    </FoodRepositoryContext.Provider>
  );
}

export function CatalogProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    AsyncStorage.getItem(CATALOG_DB_NAME_KEY).then(async (previous) => {
      if (previous && previous !== CATALOG_DB_NAME) {
        try { await deleteDatabaseAsync(previous); } catch { /* leftover catalog copies are safe to ignore */ }
      }
      await AsyncStorage.setItem(CATALOG_DB_NAME_KEY, CATALOG_DB_NAME);
    }).catch(() => undefined);
  }, []);
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SQLiteProvider databaseName={CATALOG_DB_NAME} assetSource={{ assetId: catalogAsset }} useSuspense>
        <SqliteCatalog>{children}</SqliteCatalog>
      </SQLiteProvider>
    </Suspense>
  );
}
