import type { Food, FoodCategory, Nutrients, Supermarket } from '@/types/nutrition';

const UPDATED = '2026-09-04';
const OFF_LABEL = 'Open Food Facts 社区标签摘录；在 Woolworths/Coles 有售记录，但不是零售商官方商品库。购买时以包装为准。';

function n(
  energyKcal: number, proteinG: number, carbsG: number, fatG: number,
  fibreG: number, sodiumMg: number, saturatedFatG = 0, sugarG = 0,
): Nutrients {
  return { energyKcal, proteinG, carbsG, fatG, fibreG, sodiumMg, saturatedFatG, sugarG };
}

function packaged(
  id: string, nameZh: string, nameEn: string, aliases: string[], category: FoodCategory,
  servingLabel: string, servingGrams: number, nutrients: Nutrients,
  barcode: string, brand: string, stores: Supermarket[], extraTags: string[] = [],
): Food {
  return {
    id, nameZh, nameEn, aliases: [...aliases, barcode, brand], category, servingLabel, servingGrams,
    nutrientsPer100g: nutrients,
    source: {
      type: 'label', label: OFF_LABEL, region: 'AU', confidence: 'estimate', updatedAt: UPDATED,
      dataset: 'open-food-facts', externalId: barcode,
    },
    tags: ['supermarket', 'packaged', ...stores, ...extraTags],
    barcode, brand, stores,
  };
}

export const packagedFoods: Food[] = [
  packaged('off-weet-bix', 'Weet-Bix', 'Sanitarium Weet-Bix', ['weetbix', '维他麦'], 'staple', '2 片', 33, n(353, 12.4, 65.9, 1.3, 12.9, 270, 0.3, 3), '9300652010794', 'Sanitarium', ['woolworths', 'coles'], ['breakfast']),
  packaged('off-vegemite', 'Vegemite', 'Vegemite', ['维吉麦', '酵母酱'], 'snack', '1 薄涂', 5, n(174, 25.9, 11.1, 1, 8.4, 3300, 1, 2.4), '9352042000328', 'Vegemite', ['woolworths', 'coles'], ['breakfast']),
  packaged('off-corn-thins', '玉米薄饼', 'Corn Thins Original', ['corn thins'], 'staple', '3 片', 18, n(382, 10.2, 70.9, 3.4, 7.3, 259, 0.5, 0.4), '9322969000015', 'Real Foods', ['woolworths', 'coles']),
  packaged('off-vita-weat', 'Vita-Weat 九谷', 'Vita-Weat 9 Grains', ['vitaweat', '全麦薄脆'], 'staple', '4 片', 24, n(411, 11.8, 62.6, 9.2, 13.4, 424, 1.3, 1.7), '9310072014753', "Arnott's", ['woolworths', 'coles']),
  packaged('off-cruskits', '脆面包片', "Arnott's Cruskits Original", ['cruskits', '苏打脆饼'], 'staple', '2 片', 13, n(388, 10.4, 72.8, 6.4, 4.8, 368, 4, 4), '9310072000831', "Arnott's", ['woolworths', 'coles']),
  packaged('off-john-west-tuna', '约翰韦斯特金枪鱼（橄榄油）', 'John West tuna in olive oil blend', ['john west', '金枪鱼罐头'], 'protein', '1 小罐可食', 72, n(126, 18, 1, 7.7, 0, 214, 1.2, 1), '9300462348575', 'John West', ['woolworths', 'coles']),
  packaged('off-jalna-yoghurt', 'Jalna 原味酸奶', 'Jalna Natural Yoghurt', ['jalna'], 'dairy', '1 小碗', 100, n(115, 3.3, 3.8, 9.5, 0, 32, 6.6, 3), '9310354980516', 'Jalna', ['woolworths', 'coles']),
  packaged('off-so-good-oat', 'So Good 燕麦奶', 'So Good Oat', ['so good', '燕麦奶'], 'dairy', '1 杯', 250, n(46, 0.8, 6.3, 1.9, 0.4, 45, 0.2, 2), '9300652809985', 'Sanitarium So Good', ['woolworths', 'coles']),
  packaged('off-pure-harvest-almond', 'Pure Harvest 无糖杏仁奶', 'Pure Harvest Organic Almond Unsweetened', ['pure harvest', '杏仁奶'], 'dairy', '1 杯', 250, n(29, 0.6, 2.9, 1.7, 0.4, 45, 0.2, 1.4), '9312231001215', 'Pure Harvest', ['woolworths', 'coles']),
  packaged('off-red-rock-chips', 'Red Rock Deli 甜辣酸奶油薯片', 'Red Rock Deli Sweet Chilli & Sour Cream', ['red rock deli', '薯片'], 'snack', '1 小把', 28, n(488, 7.9, 60, 23.2, 3.6, 607, 1.8, 7.1), '9310015240645', 'Red Rock Deli', ['woolworths', 'coles']),
  packaged('off-woolworths-milk', 'Woolworths 全脂鲜奶', 'Woolworths Full Cream Fresh Milk', ['woolies milk', 'woolworths milk'], 'dairy', '1 杯', 250, n(63, 3.3, 4.8, 3.4, 0, 44, 2.2, 4.8), '9300633556143', 'Woolworths', ['woolworths']),
  packaged('off-woolworths-coconut-water', 'Woolworths 椰子水', 'Woolworths 100% Pure Coconut Water', ['coconut water', '椰子水'], 'snack', '1 杯', 250, n(15, 0.2, 3.6, 0, 0, 32, 0, 2.4), '9300633626211', 'Woolworths', ['woolworths']),
  packaged('off-woolworths-crackers', 'Woolworths 苏打饼干', 'Woolworths Plain Water Crackers', ['water crackers'], 'snack', '4 片', 12, n(425, 8.7, 76.2, 8.3, 3.5, 505, 3.9, 2.3), '9300633777401', 'Woolworths', ['woolworths']),
  packaged('off-woolworths-sourdough', 'Woolworths 全麦酸种面包', 'Woolworths Wholemeal Sourdough Loaf', ['sourdough', '酸种面包'], 'staple', '1 片', 47, n(247, 7.8, 40.5, 1.9, 5.7, 6, 0.5, 1.5), '9339687405145', 'Woolworths', ['woolworths']),
  packaged('off-woolworths-sour-cream', 'Woolworths 酸奶油', 'Woolworths Sour Cream', ['sour cream', '酸奶油'], 'dairy', '1 汤匙', 30, n(335, 1.9, 2.2, 36, 0, 24, 24, 2.2), '9339687256594', 'Woolworths', ['woolworths']),
  packaged('off-coles-milk', 'Coles 全脂牛奶', 'Coles Full Cream Milk', ['coles milk'], 'dairy', '1 杯', 250, n(62, 3.4, 4.4, 3.4, 0.4, 44, 2.3, 4.4), '9300601186945', 'Coles', ['coles']),
  packaged('off-coles-almond-butter', 'Coles 杏仁酱', 'Coles Australian Almond Butter', ['almond butter', '杏仁酱'], 'snack', '1 汤匙', 20, n(665, 19, 7, 61.5, 7, 25, 5, 5), '9310645206219', 'Coles', ['coles']),
  packaged('off-coles-greek-yoghurt', 'Coles 希腊风味酸奶', 'Coles Greek style natural yoghurt', ['coles yoghurt', 'coles yogurt'], 'dairy', '1 小杯', 125, n(69, 4.8, 5.1, 9.3, 0.8, 56, 6.6, 4.6), '9310645103341', 'Coles', ['coles']),
  packaged('off-coles-chickpeas', 'Coles 鹰嘴豆罐头', 'Coles Chick Peas', ['chickpeas', '鹰嘴豆'], 'protein', '半罐可食', 63, n(137, 6.6, 15.8, 2.6, 4.8, 180, 1, 1), '9310645269993', 'Coles', ['coles']),
  packaged('off-coles-coconut-cream', 'Coles 椰浆', 'Coles Coconut Cream', ['coconut cream', '椰奶', '椰浆'], 'dairy', '1 汤匙', 40, n(180, 1, 4.3, 18, 1, 33, 15.5, 1), '9300601000692', 'Coles', ['coles']),
];
