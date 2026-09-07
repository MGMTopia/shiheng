import { importStats } from '@/data/generated/import-stats';

export const catalogMeta = {
  version: 'official-0.6.0',
  updatedAt: '2026-09-06',
  intendedUse: 'closed-trial-offline',
  officialImport: 'afcd-r3-ausnut-2023',
  counts: {
    featured: 158,
    ausnut: importStats.ausnut,
    afcdExtra: importStats.afcdExtra,
    usdaFoundation: importStats.usdaFoundation,
    imported: importStats.totalImported,
  },
  attribution: '澳洲主库来自 FSANZ AUSNUT 2023 与 AFCD Release 3，按 Data User Licence（CC BY-SA 3.0 Australia）署名使用。海外对照来自 USDA FoodData Central Foundation Foods（CC0）。中餐家常菜仍为配方估算。超市包装摘录来自 Open Food Facts（ODbL），不是 Woolworths 或 Coles 官方商品库。',
  licenceNote: 'FSANZ 数据须署名、ShareAlike，并附数据局限性声明；不得暗示 FSANZ 背书或使用 FSANZ 标志。USDA 数据为公有领域，须标明美国样品、仅作对照。Open Food Facts 摘录按 ODbL 署名。',
  limitationOfData: importStats.licence.limitationOfData,
  licenceUrl: 'https://www.foodstandards.gov.au/science-data/monitoringnutrients/afcd/datauserlicenceagreement',
  afcdHomeUrl: 'https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd',
  ausnutHomeUrl: 'https://www.foodstandards.gov.au/science-data/food-nutrient-databases/ausnut',
  usdaHomeUrl: 'https://fdc.nal.usda.gov',
  openFoodFactsUrl: 'https://world.openfoodfacts.org',
  openFoodFactsLicence: 'https://opendatacommons.org/licenses/odbl/1-0/',
} as const;
