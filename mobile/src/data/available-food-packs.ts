import type { FoodPackManifest } from '@/domain/food-pack';
import { FOOD_PACK_AU_SUPERMARKET_ID } from '@/domain/food-pack';
import auSupermarketManifest from '../../packs/pack-au-supermarket/manifest.json';

/**
 * Known optional packs. Hashes and download URLs come from the committed
 * packs/<id>/manifest.json (independent of the APK main catalog version).
 * The app still re-fetches the remote manifest when possible and verifies sha256 before enable.
 */
export type AvailableFoodPack = {
  id: string;
  /** Bundled copy of the latest known manifest for offline UI / expected hashes. */
  manifest: FoodPackManifest;
};

export const AVAILABLE_FOOD_PACKS: AvailableFoodPack[] = [
  {
    id: FOOD_PACK_AU_SUPERMARKET_ID,
    manifest: auSupermarketManifest as FoodPackManifest,
  },
];

export function findAvailableFoodPack(packId: string): AvailableFoodPack | undefined {
  return AVAILABLE_FOOD_PACKS.find((pack) => pack.id === packId);
}
