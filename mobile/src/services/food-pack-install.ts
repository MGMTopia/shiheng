import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import * as Network from 'expo-network';
import { defaultDatabaseDirectory, deleteDatabaseAsync } from 'expo-sqlite';
import {
  FOOD_PACKS_STATE_KEY,
  emptyFoodPackInstallState,
  parseFoodPackInstallState,
  parseFoodPackManifest,
  removePackRecord,
  resolvePackAssetUrl,
  setPackEnabled,
  acceptPackEnable,
  assertHttpUrl,
  toAbsoluteFileUri,
  upsertPackRecord,
  type FoodPackInstallRecord,
  type FoodPackInstallState,
  type FoodPackManifest,
} from '@/domain/food-pack';
import { findAvailableFoodPack } from '@/data/available-food-packs';
import { replaceFoodPackInstallSnapshot } from '@/data/food-pack-install-store';

export function packDatabaseName(packId: string): string {
  return `food-pack-${packId}.db`;
}

function packsMetaRoot(): Directory {
  return new Directory(Paths.document, 'food-packs');
}

/** SQLite DB directory as an expo-file-system Directory with an absolute file:// URI. */
export function packDbDirectory(): Directory {
  try {
    if (typeof defaultDatabaseDirectory === 'string' && defaultDatabaseDirectory) {
      return new Directory(toAbsoluteFileUri(defaultDatabaseDirectory));
    }
  } catch {
    // Web / relative defaults (e.g. ".") cannot feed expo-file-system File URIs.
  }
  // Same location expo-sqlite uses on Android/iOS: <documentDirectory>/SQLite
  return new Directory(Paths.document, 'SQLite');
}

export function packManifestFile(packId: string): File {
  return new File(packsMetaRoot(), packId, 'manifest.json');
}

export function packDbFile(packId: string): File {
  return new File(packDbDirectory(), packDatabaseName(packId));
}

/** `.exists` on a non-absolute File URI throws on Android; never let that crash UI. */
export function safeFileExists(file: File | Directory): boolean {
  try {
    return file.exists;
  } catch {
    return false;
  }
}

export async function loadFoodPackInstallState(): Promise<FoodPackInstallState> {
  try {
    const raw = await AsyncStorage.getItem(FOOD_PACKS_STATE_KEY);
    return parseFoodPackInstallState(raw);
  } catch {
    return emptyFoodPackInstallState();
  }
}

async function saveFoodPackInstallState(state: FoodPackInstallState): Promise<void> {
  await AsyncStorage.setItem(FOOD_PACKS_STATE_KEY, JSON.stringify(state));
  replaceFoodPackInstallSnapshot(state);
}

export async function assertWifiForPackDownload(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('食品资料包下载仅支持手机应用，网页版请使用随包底库。');
  }
  const state = await Network.getNetworkStateAsync();
  if (state.type === Network.NetworkStateType.WIFI || state.type === Network.NetworkStateType.ETHERNET) {
    return;
  }
  throw new Error('请连接 Wi‑Fi 后再下载食品资料包（不使用移动数据）。');
}

async function sha256OfFile(file: File): Promise<string> {
  const bytes = await file.bytes();
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`下载失败（HTTP ${response.status}）。`);
  return response.text();
}

function candidateUrls(manifest: FoodPackManifest, asset: string): string[] {
  const primary = assertHttpUrl(resolvePackAssetUrl(manifest, asset));
  const fallback = assertHttpUrl(
    `https://raw.githubusercontent.com/MGMTopia/shiheng/main/mobile/packs/${manifest.id}/${asset}`,
  );
  return primary === fallback ? [primary] : [primary, fallback];
}

function ensureParentDirectory(file: File): void {
  file.parentDirectory.create({ intermediates: true, idempotent: true });
}

async function downloadFirstAvailable(urls: string[], dest: File): Promise<void> {
  ensureParentDirectory(dest);
  let lastError: Error | null = null;
  for (const rawUrl of urls) {
    const url = assertHttpUrl(rawUrl);
    try {
      if (safeFileExists(dest)) dest.delete();
      // Expo 57: (httpsUrl: string, destination: File | Directory, options?)
      await File.downloadFileAsync(url, dest, { idempotent: true });
      if (safeFileExists(dest)) return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError ?? new Error('下载失败。');
}

export type DownloadPackResult =
  | { ok: true; record: FoodPackInstallRecord; manifest: FoodPackManifest }
  | { ok: false; error: string };

export async function downloadAndInstallFoodPack(packId: string): Promise<DownloadPackResult> {
  try {
    await assertWifiForPackDownload();
    const available = findAvailableFoodPack(packId);
    if (!available) return { ok: false, error: '未知资料包。' };

    const localHint = available.manifest;
    let manifest = localHint;
    for (const url of candidateUrls(localHint, localHint.assets.manifest || 'manifest.json')) {
      try {
        const remote = parseFoodPackManifest(await fetchText(url));
        if (remote && remote.id === packId) {
          manifest = remote;
          break;
        }
      } catch {
        // try next candidate / keep bundled manifest
      }
    }

    const expected = manifest.sha256['foods.db'];
    const dest = packDbFile(packId);
    await downloadFirstAvailable(candidateUrls(manifest, manifest.assets.foodsDb || 'foods.db'), dest);
    if (!safeFileExists(dest)) return { ok: false, error: '下载后未找到 foods.db。' };

    const actual = await sha256OfFile(dest);
    const verified = acceptPackEnable(actual, expected);
    if (!verified.ok) {
      try { dest.delete(); } catch { /* ignore */ }
      return {
        ok: false,
        error: verified.reason === 'sha256-mismatch'
          ? '校验失败：文件 SHA-256 与清单不符，已拒绝启用。'
          : '校验失败：清单缺少 foods.db 的 SHA-256。',
      };
    }

    const metaDir = new Directory(packsMetaRoot(), packId);
    metaDir.create({ intermediates: true, idempotent: true });
    const manifestFile = packManifestFile(packId);
    if (safeFileExists(manifestFile)) {
      try { manifestFile.delete(); } catch { /* ignore */ }
    }
    manifestFile.create();
    manifestFile.write(JSON.stringify(manifest, null, 2));

    const record: FoodPackInstallRecord = {
      id: packId,
      version: manifest.version,
      enabled: true,
      installedAt: new Date().toISOString(),
      foodsDbSha256: actual,
      foodCount: manifest.foodCount,
      attribution: manifest.attribution,
      licence: manifest.licence,
      title: manifest.title,
      titleEn: manifest.titleEn,
    };
    const state = upsertPackRecord(await loadFoodPackInstallState(), record);
    await saveFoodPackInstallState(state);
    return { ok: true, record, manifest };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '下载失败。' };
  }
}

/** Enable a previously installed pack only if on-disk sha256 still matches. */
export async function enableFoodPack(packId: string): Promise<DownloadPackResult> {
  try {
    const state = await loadFoodPackInstallState();
    const record = state.packs.find((pack) => pack.id === packId);
    if (!record) return { ok: false, error: '尚未安装该资料包。' };
    const db = packDbFile(packId);
    if (!safeFileExists(db)) return { ok: false, error: '本地 foods.db 已丢失，请重新下载。' };
    const actual = await sha256OfFile(db);
    const verified = acceptPackEnable(actual, record.foodsDbSha256);
    if (!verified.ok) {
      await saveFoodPackInstallState(setPackEnabled(state, packId, false));
      return { ok: false, error: '校验失败：文件 SHA-256 与记录不符，已拒绝启用。' };
    }
    const next = setPackEnabled(state, packId, true);
    await saveFoodPackInstallState(next);
    const available = findAvailableFoodPack(packId);
    return { ok: true, record: { ...record, enabled: true }, manifest: available!.manifest };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : '启用失败。' };
  }
}

export async function disableFoodPack(packId: string): Promise<void> {
  const state = await loadFoodPackInstallState();
  await saveFoodPackInstallState(setPackEnabled(state, packId, false));
}

/** Removes pack files and install record. Does not touch diary entries. */
export async function uninstallFoodPack(packId: string): Promise<void> {
  const state = await loadFoodPackInstallState();
  await saveFoodPackInstallState(removePackRecord(state, packId));
  try {
    await deleteDatabaseAsync(packDatabaseName(packId));
  } catch {
    const db = packDbFile(packId);
    if (safeFileExists(db)) {
      try { db.delete(); } catch { /* ignore */ }
    }
  }
  const manifest = packManifestFile(packId);
  if (safeFileExists(manifest)) {
    try { manifest.delete(); } catch { /* ignore */ }
  }
  const metaDir = new Directory(packsMetaRoot(), packId);
  if (safeFileExists(metaDir)) {
    try { metaDir.delete(); } catch { /* ignore */ }
  }
}
