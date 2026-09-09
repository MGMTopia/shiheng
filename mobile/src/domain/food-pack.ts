export type FoodPackSha256 = {
  'foods.db': string;
  /** Optional gzip/zip asset name → hash */
  [asset: string]: string;
};

export type FoodPackManifest = {
  id: string;
  version: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  foodCount: number;
  sha256: FoodPackSha256;
  licence: string;
  attribution: string;
  downloadUrlPattern: string;
  createdAt: string;
  assets: {
    foodsDb: string;
    manifest: string;
    archive?: string;
  };
  source?: {
    name: string;
    url: string;
    region?: string;
  };
  schema?: string;
  notes?: string[];
};

export type FoodPackInstallRecord = {
  id: string;
  version: string;
  enabled: boolean;
  installedAt: string;
  foodsDbSha256: string;
  foodCount: number;
  attribution: string;
  licence: string;
  title: string;
  titleEn?: string;
};

export type FoodPackInstallState = {
  packs: FoodPackInstallRecord[];
};

export type FoodPackVerifyResult =
  | { ok: true }
  | { ok: false; reason: 'sha256-mismatch' | 'missing-hash' };

export const FOOD_PACKS_STATE_KEY = '@shiheng/food-packs/v1';
export const FOOD_PACK_AU_SUPERMARKET_ID = 'pack-au-supermarket';

export function resolvePackAssetUrl(manifest: FoodPackManifest, asset: string): string {
  return manifest.downloadUrlPattern
    .replaceAll('{version}', manifest.version)
    .replaceAll('{asset}', asset);
}

/**
 * expo-sqlite's `defaultDatabaseDirectory` is a bare absolute path on Android/iOS
 * (e.g. `/data/.../files/SQLite`), while expo-file-system's `File`/`Directory`
 * require a scheme like `file://`. Passing the bare path makes `.exists` throw
 * `IllegalArgumentException: URI is not absolute`.
 */
export function toAbsoluteFileUri(pathOrUri: string): string {
  const trimmed = pathOrUri.trim();
  if (!trimmed) {
    throw new Error('Empty filesystem path');
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `file://${trimmed}`;
  }
  throw new Error(`Filesystem path is not absolute: ${trimmed}`);
}

/** Ensures download targets are plain http(s) strings, never objects. */
export function assertHttpUrl(url: unknown): string {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    const preview = typeof url === 'string' ? url : Object.prototype.toString.call(url);
    throw new Error(`资料包下载地址无效（需要 http(s) 字符串）。Provided: ${preview}`);
  }
  return url.trim();
}

export function verifyPackSha256(actualHex: string, expectedHex: string | undefined): FoodPackVerifyResult {
  if (!expectedHex || !expectedHex.trim()) return { ok: false, reason: 'missing-hash' };
  if (actualHex.toLowerCase() !== expectedHex.toLowerCase()) return { ok: false, reason: 'sha256-mismatch' };
  return { ok: true };
}

export function emptyFoodPackInstallState(): FoodPackInstallState {
  return { packs: [] };
}

export function upsertPackRecord(state: FoodPackInstallState, record: FoodPackInstallRecord): FoodPackInstallState {
  const others = state.packs.filter((pack) => pack.id !== record.id);
  return { packs: [...others, record] };
}

export function removePackRecord(state: FoodPackInstallState, packId: string): FoodPackInstallState {
  return { packs: state.packs.filter((pack) => pack.id !== packId) };
}

export function setPackEnabled(state: FoodPackInstallState, packId: string, enabled: boolean): FoodPackInstallState {
  return {
    packs: state.packs.map((pack) => (pack.id === packId ? { ...pack, enabled } : pack)),
  };
}

export function enabledPackIds(state: FoodPackInstallState): string[] {
  return state.packs.filter((pack) => pack.enabled).map((pack) => pack.id);
}

/** Attribution rows shown in Settings when packs are enabled (ODbL / Open Food Facts). */
export function enabledPackAttributions(state: FoodPackInstallState): FoodPackInstallRecord[] {
  return state.packs.filter((pack) => pack.enabled && Boolean(pack.attribution?.trim()));
}

/**
 * Gate used before enable: wrong or missing sha256 must reject.
 * Install/enable services call this after hashing the on-disk foods.db.
 */
export function acceptPackEnable(actualFoodsDbSha256: string, expectedFoodsDbSha256: string | undefined): FoodPackVerifyResult {
  return verifyPackSha256(actualFoodsDbSha256, expectedFoodsDbSha256);
}

export function parseFoodPackInstallState(raw: string | null | undefined): FoodPackInstallState {
  if (!raw) return emptyFoodPackInstallState();
  try {
    const parsed = JSON.parse(raw) as { packs?: unknown };
    if (!parsed || !Array.isArray(parsed.packs)) return emptyFoodPackInstallState();
    const packs: FoodPackInstallRecord[] = [];
    for (const item of parsed.packs) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      if (typeof row.id !== 'string' || !row.id) continue;
      if (typeof row.version !== 'string' || !row.version) continue;
      if (typeof row.foodsDbSha256 !== 'string' || !row.foodsDbSha256) continue;
      packs.push({
        id: row.id,
        version: row.version,
        enabled: row.enabled === true,
        installedAt: typeof row.installedAt === 'string' ? row.installedAt : new Date(0).toISOString(),
        foodsDbSha256: row.foodsDbSha256,
        foodCount: typeof row.foodCount === 'number' && Number.isFinite(row.foodCount) ? row.foodCount : 0,
        attribution: typeof row.attribution === 'string' ? row.attribution : '',
        licence: typeof row.licence === 'string' ? row.licence : 'ODbL-1.0',
        title: typeof row.title === 'string' ? row.title : row.id,
        titleEn: typeof row.titleEn === 'string' ? row.titleEn : undefined,
      });
    }
    return { packs };
  } catch {
    return emptyFoodPackInstallState();
  }
}

export function parseFoodPackManifest(raw: string): FoodPackManifest | null {
  try {
    const parsed = JSON.parse(raw) as FoodPackManifest;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.id !== 'string' || typeof parsed.version !== 'string') return null;
    if (!parsed.sha256 || typeof parsed.sha256['foods.db'] !== 'string') return null;
    if (typeof parsed.downloadUrlPattern !== 'string') return null;
    if (typeof parsed.attribution !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}
