import { Food, FoodCategory } from '@/types/nutrition';

export const foodCategories: { id: 'all' | FoodCategory; label: string }[] = [
  { id: 'all', label: '全部' }, { id: 'mixed', label: '中餐/混合餐' }, { id: 'protein', label: '蛋白质' },
  { id: 'staple', label: '主食' }, { id: 'vegetable', label: '蔬菜' }, { id: 'fruit', label: '水果' },
  { id: 'dairy', label: '奶类' }, { id: 'snack', label: '零食' },
];

export const foods: Food[] = [
  {
    id: 'brown-rice-cooked', nameZh: '糙米饭', nameEn: 'Cooked brown rice', aliases: ['brown rice', '糙米'],
    category: 'staple', servingLabel: '1 小碗', servingGrams: 150,
    nutrientsPer100g: { energyKcal: 123, proteinG: 2.7, carbsG: 25.6, fatG: 1, fibreG: 1.6, sodiumMg: 4, saturatedFatG: 0.2, sugarG: 0.2 },
    source: { type: 'demo', label: 'AFCD结构示例（待正式导入核验）', region: 'AU', confidence: 'medium', updatedAt: '2026-08-29' }, tags: ['wholegrain', 'high-fibre'],
  },
  {
    id: 'white-rice-cooked', nameZh: '白米饭', nameEn: 'Cooked white rice', aliases: ['rice', '米饭'],
    category: 'staple', servingLabel: '1 小碗', servingGrams: 150,
    nutrientsPer100g: { energyKcal: 130, proteinG: 2.4, carbsG: 28.6, fatG: 0.2, fibreG: 0.4, sodiumMg: 1, saturatedFatG: 0.1, sugarG: 0.1 },
    source: { type: 'demo', label: '澳洲通用食物数据示例', region: 'AU/CN', confidence: 'medium', updatedAt: '2026-08-29' }, tags: ['staple'],
  },
  {
    id: 'oats-porridge', nameZh: '燕麦粥', nameEn: 'Oat porridge', aliases: ['oats', 'porridge', '燕麦'],
    category: 'staple', servingLabel: '1 碗', servingGrams: 250,
    nutrientsPer100g: { energyKcal: 71, proteinG: 2.5, carbsG: 12, fatG: 1.5, fibreG: 1.7, sodiumMg: 35, saturatedFatG: 0.3, sugarG: 0.4 },
    source: { type: 'recipe', label: '标准配方估算', region: 'AU/CN', confidence: 'estimate', updatedAt: '2026-08-29' }, tags: ['breakfast', 'wholegrain'],
  },
  {
    id: 'chicken-breast-grilled', nameZh: '烤鸡胸肉', nameEn: 'Grilled chicken breast', aliases: ['chicken', '鸡胸'],
    category: 'protein', servingLabel: '1 掌心份', servingGrams: 120,
    nutrientsPer100g: { energyKcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fibreG: 0, sodiumMg: 74, saturatedFatG: 1, sugarG: 0 },
    source: { type: 'demo', label: '澳洲通用食物数据示例', region: 'AU', confidence: 'medium', updatedAt: '2026-08-29' }, tags: ['lean-protein'],
  },
  {
    id: 'salmon-baked', nameZh: '烤三文鱼', nameEn: 'Baked salmon', aliases: ['salmon', '三文鱼', '鲑鱼'],
    category: 'protein', servingLabel: '1 鱼排', servingGrams: 130,
    nutrientsPer100g: { energyKcal: 206, proteinG: 22, carbsG: 0, fatG: 12, fibreG: 0, sodiumMg: 60, saturatedFatG: 2.5, sugarG: 0 },
    source: { type: 'demo', label: '澳洲通用食物数据示例', region: 'AU', confidence: 'medium', updatedAt: '2026-08-29' }, tags: ['omega-3', 'protein'],
  },
  {
    id: 'tofu-firm', nameZh: '硬豆腐', nameEn: 'Firm tofu', aliases: ['tofu', '豆腐'], category: 'protein', servingLabel: '半盒', servingGrams: 150,
    nutrientsPer100g: { energyKcal: 126, proteinG: 13, carbsG: 2.8, fatG: 7.2, fibreG: 1.2, sodiumMg: 14, saturatedFatG: 1, sugarG: 0.7 },
    source: { type: 'label', label: '品牌标签中位示例，购买时以包装为准', region: 'AU/CN', confidence: 'estimate', updatedAt: '2026-08-29' }, tags: ['plant-protein'],
  },
  {
    id: 'tomato-egg', nameZh: '番茄炒蛋', nameEn: 'Tomato and egg stir-fry', aliases: ['西红柿炒鸡蛋', 'tomato egg'], category: 'mixed', servingLabel: '1 家常份', servingGrams: 250,
    nutrientsPer100g: { energyKcal: 105, proteinG: 5.4, carbsG: 4.5, fatG: 7.4, fibreG: 0.8, sodiumMg: 260, saturatedFatG: 1.5, sugarG: 2.5 },
    source: { type: 'recipe', label: '家常配方估算；用油和盐会显著影响结果', region: 'CN', confidence: 'estimate', updatedAt: '2026-08-29' }, tags: ['chinese', 'home-style'],
  },
  {
    id: 'beef-broccoli', nameZh: '西兰花炒牛肉', nameEn: 'Beef and broccoli stir-fry', aliases: ['牛肉炒西兰花', 'beef broccoli'], category: 'mixed', servingLabel: '1 家常份', servingGrams: 280,
    nutrientsPer100g: { energyKcal: 118, proteinG: 10.5, carbsG: 5.5, fatG: 6.2, fibreG: 1.5, sodiumMg: 330, saturatedFatG: 1.8, sugarG: 2.1 },
    source: { type: 'recipe', label: '家常配方估算；酱汁和用油需确认', region: 'CN', confidence: 'estimate', updatedAt: '2026-08-29' }, tags: ['chinese', 'mixed-meal'],
  },
  {
    id: 'bok-choy-stir-fry', nameZh: '清炒小白菜', nameEn: 'Stir-fried bok choy', aliases: ['青菜', 'bok choy', '小白菜'], category: 'vegetable', servingLabel: '1 碟', servingGrams: 180,
    nutrientsPer100g: { energyKcal: 45, proteinG: 1.8, carbsG: 3.4, fatG: 2.9, fibreG: 1.5, sodiumMg: 190, saturatedFatG: 0.4, sugarG: 1.3 },
    source: { type: 'recipe', label: '少油家常配方估算', region: 'CN', confidence: 'estimate', updatedAt: '2026-08-29' }, tags: ['vegetable', 'chinese'],
  },
  {
    id: 'broccoli-steamed', nameZh: '蒸西兰花', nameEn: 'Steamed broccoli', aliases: ['broccoli', '西兰花'], category: 'vegetable', servingLabel: '1 碗', servingGrams: 150,
    nutrientsPer100g: { energyKcal: 35, proteinG: 2.4, carbsG: 7.2, fatG: 0.4, fibreG: 3.3, sodiumMg: 41, saturatedFatG: 0.1, sugarG: 1.4 },
    source: { type: 'demo', label: '澳洲通用食物数据示例', region: 'AU', confidence: 'medium', updatedAt: '2026-08-29' }, tags: ['vegetable', 'high-fibre'],
  },
  {
    id: 'apple', nameZh: '苹果', nameEn: 'Apple', aliases: ['apple'], category: 'fruit', servingLabel: '1 个中等', servingGrams: 180,
    nutrientsPer100g: { energyKcal: 52, proteinG: 0.3, carbsG: 13.8, fatG: 0.2, fibreG: 2.4, sodiumMg: 1, saturatedFatG: 0, sugarG: 10.4 },
    source: { type: 'demo', label: '澳洲通用食物数据示例', region: 'AU', confidence: 'high', updatedAt: '2026-08-29' }, tags: ['fruit'],
  },
  {
    id: 'banana', nameZh: '香蕉', nameEn: 'Banana', aliases: ['banana'], category: 'fruit', servingLabel: '1 根中等', servingGrams: 120,
    nutrientsPer100g: { energyKcal: 89, proteinG: 1.1, carbsG: 22.8, fatG: 0.3, fibreG: 2.6, sodiumMg: 1, saturatedFatG: 0.1, sugarG: 12.2 },
    source: { type: 'demo', label: '澳洲通用食物数据示例', region: 'AU', confidence: 'high', updatedAt: '2026-08-29' }, tags: ['fruit'],
  },
  {
    id: 'greek-yoghurt', nameZh: '原味希腊酸奶', nameEn: 'Plain Greek yoghurt', aliases: ['yogurt', 'yoghurt', '酸奶'], category: 'dairy', servingLabel: '1 小杯', servingGrams: 170,
    nutrientsPer100g: { energyKcal: 73, proteinG: 9, carbsG: 4, fatG: 2.2, fibreG: 0, sodiumMg: 36, saturatedFatG: 1.4, sugarG: 3.8 },
    source: { type: 'label', label: '品牌标签中位示例，购买时以包装为准', region: 'AU', confidence: 'estimate', updatedAt: '2026-08-29' }, tags: ['dairy', 'protein'],
  },
  {
    id: 'almonds', nameZh: '原味杏仁', nameEn: 'Unsalted almonds', aliases: ['almonds', '杏仁'], category: 'snack', servingLabel: '1 小把', servingGrams: 30,
    nutrientsPer100g: { energyKcal: 579, proteinG: 21.2, carbsG: 21.6, fatG: 49.9, fibreG: 12.5, sodiumMg: 1, saturatedFatG: 3.8, sugarG: 4.4 },
    source: { type: 'demo', label: '澳洲通用食物数据示例', region: 'AU', confidence: 'high', updatedAt: '2026-08-29' }, tags: ['nuts', 'healthy-fat'],
  },
];

export const foodsById = Object.fromEntries(foods.map((food) => [food.id, food])) as Record<string, Food>;
