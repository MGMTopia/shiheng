import type { Food, FoodCategory, Nutrients } from '@/types/nutrition';

export type FoodDraft = {
  nameZh: string;
  nameEn?: string;
  category: FoodCategory;
  servingLabel: string;
  servingGrams: number;
  nutrientsPer100g: Partial<Nutrients>;
};

export type FoodValidationResult = { valid: true; food: Food } | { valid: false; errors: string[] };

const nutrientKeys: (keyof Nutrients)[] = [
  'energyKcal', 'proteinG', 'carbsG', 'fatG', 'fibreG', 'sodiumMg', 'saturatedFatG', 'sugarG',
];

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function slugForCustomFood(name: string): string {
  const latin = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `custom-${latin || Date.now().toString(36)}`;
}

export function validateFoodDraft(draft: FoodDraft): FoodValidationResult {
  const errors: string[] = [];
  const nameZh = draft.nameZh.trim();
  const nameEn = draft.nameEn?.trim() ?? '';
  const servingLabel = draft.servingLabel.trim();

  if (!nameZh) errors.push('请输入食物名称。');
  if (!servingLabel) errors.push('请输入默认份量名称。');
  if (!finiteNonNegative(draft.servingGrams) || draft.servingGrams <= 0 || draft.servingGrams > 5000) {
    errors.push('份量克重应在0到5000克之间。');
  }

  const nutrients = Object.fromEntries(nutrientKeys.map((key) => {
    const raw = draft.nutrientsPer100g[key];
    if (key === 'energyKcal') {
      if (!finiteNonNegative(raw) || raw <= 0) errors.push('请填写每100克能量。');
      return [key, finiteNonNegative(raw) ? raw : 0];
    }
    if (raw == null || raw === ('' as unknown)) return [key, null];
    if (!finiteNonNegative(raw)) errors.push(`${key}必须是非负数。`);
    return [key, finiteNonNegative(raw) ? raw : null];
  })) as Nutrients;

  if (nutrients.energyKcal > 1000) errors.push('每100克能量不能超过1000千卡。');
  if (nutrients.proteinG != null && nutrients.proteinG > 100
    || nutrients.carbsG != null && nutrients.carbsG > 100
    || nutrients.fatG != null && nutrients.fatG > 100
    || nutrients.fibreG != null && nutrients.fibreG > 100) {
    errors.push('每100克宏量营养素不能超过100克。');
  }

  if (errors.length) return { valid: false, errors };

  return {
    valid: true,
    food: {
      id: slugForCustomFood(nameZh || nameEn),
      nameZh,
      nameEn,
      aliases: nameEn ? [nameEn] : [],
      category: draft.category,
      servingLabel,
      servingGrams: draft.servingGrams,
      nutrientsPer100g: nutrients,
      source: {
        type: 'label',
        label: '用户根据包装或配方录入，尚未独立核验',
        region: 'AU/CN',
        confidence: 'estimate',
        updatedAt: new Date().toISOString().slice(0, 10),
        dataset: 'user-entry',
      },
      tags: ['custom'],
    },
  };
}

export function validateFoodCatalog(foods: Food[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const barcodes = new Set<string>();

  if (foods.length < 80) errors.push(`随包底库至少需要80条，当前${foods.length}条。`);
  const officialDatasets: ReadonlySet<string> = new Set(['fsanz-afcd', 'fsanz-ausnut', 'usda-fdc']);

  foods.forEach((food, index) => {
    if (ids.has(food.id)) errors.push(`第${index + 1}条食品ID重复：${food.id}`);
    ids.add(food.id);
    if (!food.nameZh.trim() && !food.nameEn.trim()) errors.push(`食品${food.id}缺少名称。`);
    if (!finiteNonNegative(food.servingGrams) || food.servingGrams <= 0) errors.push(`食品${food.id}份量无效。`);
    if (food.source.type === 'official' && !officialDatasets.has(food.source.dataset ?? '')) {
      errors.push(`食品${food.id}在正式导入核验前不能标记为official。`);
    }
    if (food.source.type === 'recipe' && food.source.confidence !== 'estimate') {
      errors.push(`食品${food.id}的配方估算必须使用estimate可信等级。`);
    }
    if (food.source.dataset === 'open-food-facts' && !food.barcode) {
      errors.push(`食品${food.id}缺少条码。`);
    }
    if (food.barcode) {
      if (barcodes.has(food.barcode)) errors.push(`条码重复：${food.barcode}`);
      barcodes.add(food.barcode);
    }
    nutrientKeys.forEach((key) => {
      const value = food.nutrientsPer100g[key];
      if (key === 'energyKcal') {
        if (!finiteNonNegative(value)) errors.push(`食品${food.id}的能量无效。`);
        return;
      }
      if (value != null && !finiteNonNegative(value)) errors.push(`食品${food.id}的${key}无效。`);
    });
  });

  return errors;
}
