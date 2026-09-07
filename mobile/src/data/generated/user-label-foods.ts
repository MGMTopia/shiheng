import type { Food, FoodCategory, Supermarket } from '@/types/nutrition';

const UPDATED = new Date().toISOString().slice(0, 10);
const LABEL = '用户根据包装标签批量录入，尚未独立核验。包装优先，缺失营养素不是 0。';

function userLabel(
  id: string, nameZh: string, nameEn: string, brand: string, barcode: string, category: FoodCategory,
  servingLabel: string, servingGrams: number, energyKcal: number, proteinG: number | null, carbsG: number | null,
  fatG: number | null, fibreG: number | null, sodiumMg: number | null, saturatedFatG: number | null, sugarG: number | null,
  stores: Supermarket[], channel: string,
): Food {
  return {
    id, nameZh, nameEn, aliases: [barcode, brand, channel].filter(Boolean), category, servingLabel, servingGrams,
    nutrientsPer100g: { energyKcal, proteinG, carbsG, fatG, fibreG, sodiumMg, saturatedFatG, sugarG },
    source: { type: 'label', label: LABEL, region: 'AU/CN', confidence: 'estimate', updatedAt: UPDATED, dataset: 'user-entry', externalId: barcode || id },
    tags: ['custom', 'user-label', ...stores], barcode: barcode || undefined, brand: brand || undefined, stores,
  };
}

export const userLabelFoods: Food[] = [

];
