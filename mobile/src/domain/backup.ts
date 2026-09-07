import type { Food, FoodLogEntry } from '@/types/nutrition';
import {
  emptySnapshot,
  parsePersistedState,
  serializePersistedState,
  STATE_VERSION,
  type PersistedSnapshot,
  type RestoreResult,
} from '@/domain/persisted-state';
import { displayFoodName, entryIntake, localDateKey, mealLabels } from '@/domain/nutrition';

export const BACKUP_KIND = 'shiheng-personal-backup';
export const BACKUP_FORMAT_VERSION = 1;

export type BackupFile = {
  kind: typeof BACKUP_KIND;
  formatVersion: number;
  exportedAt: string;
  stateVersion: number;
  snapshot: PersistedSnapshot;
};

export type BackupPreview = {
  exportedAt: string;
  formatVersion: number;
  stateVersion: number;
  entries: number;
  customFoods: number;
  recipes: number;
  favouriteFoodIds: number;
  verifiedFoodIds: number;
  dateStart: string | null;
  dateEnd: string | null;
  warnings: string[];
  dropped: RestoreResult['dropped'];
  migratedFrom: number | null;
};

export type BackupInspectResult =
  | { ok: true; backup: BackupFile; snapshot: PersistedSnapshot; preview: BackupPreview }
  | { ok: false; error: string };

export function createBackupFile(snapshot: PersistedSnapshot, exportedAt = new Date().toISOString()): BackupFile {
  return {
    kind: BACKUP_KIND,
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    stateVersion: STATE_VERSION,
    snapshot: JSON.parse(serializePersistedState(snapshot)) as PersistedSnapshot,
  };
}

export function serializeBackupFile(snapshot: PersistedSnapshot, exportedAt = new Date().toISOString()): string {
  return JSON.stringify(createBackupFile(snapshot, exportedAt), null, 2);
}

export function inspectBackup(raw: string | null | undefined): BackupInspectResult {
  if (raw == null || raw.trim() === '') {
    return { ok: false, error: '备份文件是空的。' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: '备份文件不是有效的 JSON。' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: '备份文件格式不正确。' };
  }

  const payload = parsed as Record<string, unknown>;
  const nested = payload.snapshot && typeof payload.snapshot === 'object' && !Array.isArray(payload.snapshot)
    ? payload.snapshot
    : payload;
  const restored = parsePersistedState(JSON.stringify(nested));
  if (restored.status === 'error') {
    return { ok: false, error: restored.error === 'invalid-json' ? '备份文件已损坏。' : '备份文件不是食衡记录格式。' };
  }

  const dates = restored.snapshot.entries.map((entry) => localDateKey(new Date(entry.recordedAt))).sort();
  const warnings: string[] = [];
  if (payload.kind != null && payload.kind !== BACKUP_KIND) {
    warnings.push('文件不是标准食衡备份，已按本机记录格式尝试读取。');
  }
  if (restored.dropped.entries || restored.dropped.customFoods || restored.dropped.recipes || restored.dropped.ids) {
    warnings.push('部分条目无法通过校验，恢复时会被跳过。');
  }
  if (!restored.snapshot.entries.length && !restored.snapshot.customFoods.length && !restored.snapshot.recipes.length) {
    warnings.push('这个备份几乎是空的。');
  }

  const snapshot = restored.snapshot;
  const exportedAt = typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString();
  const preview: BackupPreview = {
    exportedAt,
    formatVersion: typeof payload.formatVersion === 'number' ? payload.formatVersion : BACKUP_FORMAT_VERSION,
    stateVersion: snapshot.stateVersion,
    entries: snapshot.entries.length,
    customFoods: snapshot.customFoods.length,
    recipes: snapshot.recipes.length,
    favouriteFoodIds: snapshot.favouriteFoodIds.length,
    verifiedFoodIds: snapshot.verifiedFoodIds.length,
    dateStart: dates[0] ?? null,
    dateEnd: dates.at(-1) ?? null,
    warnings,
    dropped: restored.dropped,
    migratedFrom: restored.migratedFrom,
  };

  return {
    ok: true,
    backup: {
      kind: BACKUP_KIND,
      formatVersion: preview.formatVersion,
      exportedAt,
      stateVersion: snapshot.stateVersion,
      snapshot,
    },
    snapshot,
    preview,
  };
}

export function describeBackupPreview(preview: BackupPreview): string {
  const range = preview.dateStart && preview.dateEnd
    ? preview.dateStart === preview.dateEnd ? preview.dateStart : `${preview.dateStart} 至 ${preview.dateEnd}`
    : '暂无饮食记录日期';
  return [
    `饮食记录 ${preview.entries} 条（${range}）`,
    `自定义食品 ${preview.customFoods} 条`,
    `家庭菜谱 ${preview.recipes} 条`,
    `收藏 ${preview.favouriteFoodIds} 条，本机核对 ${preview.verifiedFoodIds} 条`,
  ].join('\n');
}

export function diaryToCsv(entries: FoodLogEntry[], foodsById: Record<string, Food>): string {
  const header = [
    'date', 'meal', 'foodId', 'nameZh', 'nameEn', 'servings', 'servingGrams',
    'portionShare', 'sharedWith', 'oilLevel', 'energyKcal', 'proteinG', 'fatG', 'carbsG', 'fibreG', 'sodiumMg', 'source',
  ];
  const rows = [...entries]
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
    .map((entry) => {
      const food = foodsById[entry.foodId];
      const intake = food ? entryIntake(food, entry) : null;
      return [
        localDateKey(new Date(entry.recordedAt)),
        mealLabels[entry.meal] ?? entry.meal,
        entry.foodId,
        csvCell(food ? displayFoodName(food) : entry.foodId),
        csvCell(food?.nameEn ?? ''),
        entry.servings,
        food ? food.servingGrams * entry.servings : '',
        entry.portionShare ?? '',
        entry.sharedWith ?? '',
        entry.oilLevel ?? '',
        intake?.energyKcal ?? '',
        intake?.proteinG ?? '',
        intake?.fatG ?? '',
        intake?.carbsG ?? '',
        intake?.fibreG ?? '',
        intake?.sodiumMg ?? '',
        csvCell(food?.source.dataset ?? ''),
      ].join(',');
    });
  return [header.join(','), ...rows].join('\n');
}

export function emptyPersonalSnapshot(): PersistedSnapshot {
  return emptySnapshot();
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
