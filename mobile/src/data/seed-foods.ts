import type { Food, FoodCategory, FoodSource, Nutrients } from '@/types/nutrition';

export const foodCategories: { id: 'all' | FoodCategory; label: string }[] = [
  { id: 'all', label: '全部' }, { id: 'mixed', label: '中餐/混合餐' }, { id: 'protein', label: '蛋白质' },
  { id: 'staple', label: '主食' }, { id: 'vegetable', label: '蔬菜' }, { id: 'fruit', label: '水果' },
  { id: 'dairy', label: '奶类' }, { id: 'snack', label: '零食' },
];

const UPDATED = '2026-09-04';

function n(
  energyKcal: number, proteinG: number, carbsG: number, fatG: number,
  fibreG: number, sodiumMg: number, saturatedFatG = 0, sugarG = 0,
): Nutrients {
  return { energyKcal, proteinG, carbsG, fatG, fibreG, sodiumMg, saturatedFatG, sugarG };
}

function source(type: FoodSource['type'], label: string, region: FoodSource['region'], confidence: FoodSource['confidence'], dataset: NonNullable<FoodSource['dataset']>): FoodSource {
  return { type, label, region, confidence, updatedAt: UPDATED, dataset };
}

const pending = (label: string, region: FoodSource['region'] = 'AU', confidence: FoodSource['confidence'] = 'medium') =>
  source('demo', label, region, confidence, 'seed-pending-afcd');
const recipe = (label: string, region: FoodSource['region'] = 'CN') =>
  source('recipe', label, region, 'estimate', 'recipe-estimate');
const labelSrc = (label: string, region: FoodSource['region'] = 'AU') =>
  source('label', label, region, 'estimate', 'seed-pending-afcd');

function item(
  id: string, nameZh: string, nameEn: string, aliases: string[], category: FoodCategory,
  servingLabel: string, servingGrams: number, nutrients: Nutrients, foodSource: FoodSource, tags: string[],
): Food {
  return { id, nameZh, nameEn, aliases, category, servingLabel, servingGrams, nutrientsPer100g: nutrients, source: foodSource, tags };
}

const pendingAu = pending('待核验的澳洲常用食物结构，正式导入 AFCD 前仅供流程验证');
const pendingMix = pending('待核验的中澳常见食物结构，正式导入 AFCD 前仅供流程验证', 'AU/CN');
const homeRecipe = recipe('家常配方估算；用油、酱汁和份量会显著影响结果');
const lightRecipe = recipe('少油家常配方估算');
const brandLabel = labelSrc('包装中位示例，购买时以标签为准');
const brandMix = labelSrc('包装中位示例，购买时以标签为准', 'AU/CN');

export const foods: Food[] = [
  item('brown-rice-cooked', '糙米饭', 'Cooked brown rice', ['brown rice', '糙米'], 'staple', '1 小碗', 150, n(123, 2.7, 25.6, 1, 1.6, 4, 0.2, 0.2), pendingAu, ['wholegrain', 'high-fibre']),
  item('white-rice-cooked', '白米饭', 'Cooked white rice', ['rice', '米饭'], 'staple', '1 小碗', 150, n(130, 2.4, 28.6, 0.2, 0.4, 1, 0.1, 0.1), pendingMix, ['staple']),
  item('oats-porridge', '燕麦粥', 'Oat porridge', ['oats', 'porridge', '燕麦'], 'staple', '1 碗', 250, n(71, 2.5, 12, 1.5, 1.7, 35, 0.3, 0.4), recipe('标准配方估算', 'AU/CN'), ['breakfast', 'wholegrain']),
  item('chicken-breast-grilled', '烤鸡胸肉', 'Grilled chicken breast', ['chicken', '鸡胸'], 'protein', '1 掌心份', 120, n(165, 31, 0, 3.6, 0, 74, 1, 0), pendingAu, ['lean-protein']),
  item('salmon-baked', '烤三文鱼', 'Baked salmon', ['salmon', '三文鱼', '鲑鱼'], 'protein', '1 鱼排', 130, n(206, 22, 0, 12, 0, 60, 2.5, 0), pendingAu, ['omega-3', 'protein']),
  item('tofu-firm', '硬豆腐', 'Firm tofu', ['tofu', '豆腐'], 'protein', '半盒', 150, n(126, 13, 2.8, 7.2, 1.2, 14, 1, 0.7), brandMix, ['plant-protein']),
  item('tomato-egg', '番茄炒蛋', 'Tomato and egg stir-fry', ['西红柿炒鸡蛋', '西红柿鸡蛋', '番茄鸡蛋', 'tomato egg', 'tomato and egg'], 'mixed', '1 家常份', 250, n(105, 5.4, 4.5, 7.4, 0.8, 260, 1.5, 2.5), homeRecipe, ['chinese', 'home-style']),
  item('beef-broccoli', '西兰花炒牛肉', 'Beef and broccoli stir-fry', ['牛肉炒西兰花', 'beef broccoli'], 'mixed', '1 家常份', 280, n(118, 10.5, 5.5, 6.2, 1.5, 330, 1.8, 2.1), homeRecipe, ['chinese', 'mixed-meal']),
  item('bok-choy-stir-fry', '清炒小白菜', 'Stir-fried bok choy', ['青菜', 'bok choy', '小白菜'], 'vegetable', '1 碟', 180, n(45, 1.8, 3.4, 2.9, 1.5, 190, 0.4, 1.3), lightRecipe, ['vegetable', 'chinese']),
  item('broccoli-steamed', '蒸西兰花', 'Steamed broccoli', ['broccoli', '西兰花'], 'vegetable', '1 碗', 150, n(35, 2.4, 7.2, 0.4, 3.3, 41, 0.1, 1.4), pendingAu, ['vegetable', 'high-fibre']),
  item('apple', '苹果', 'Apple', ['apple'], 'fruit', '1 个中等', 180, n(52, 0.3, 13.8, 0.2, 2.4, 1, 0, 10.4), pending('待核验的常见水果结构', 'AU', 'high'), ['fruit']),
  item('banana', '香蕉', 'Banana', ['banana'], 'fruit', '1 根中等', 120, n(89, 1.1, 22.8, 0.3, 2.6, 1, 0.1, 12.2), pending('待核验的常见水果结构', 'AU', 'high'), ['fruit']),
  item('greek-yoghurt', '原味希腊酸奶', 'Plain Greek yoghurt', ['yogurt', 'yoghurt', '酸奶'], 'dairy', '1 小杯', 170, n(73, 9, 4, 2.2, 0, 36, 1.4, 3.8), brandLabel, ['dairy', 'protein']),
  item('almonds', '原味杏仁', 'Unsalted almonds', ['almonds', '杏仁'], 'snack', '1 小把', 30, n(579, 21.2, 21.6, 49.9, 12.5, 1, 3.8, 4.4), pending('待核验的常见坚果结构', 'AU', 'high'), ['nuts', 'healthy-fat']),

  item('congee-plain', '白粥', 'Plain rice congee', ['porridge', '粥', 'rice porridge'], 'staple', '1 碗', 250, n(46, 0.8, 10.2, 0.1, 0.1, 2, 0, 0), lightRecipe, ['breakfast', 'chinese']),
  item('steamed-bun', '馒头', 'Steamed bun', ['mantou', '包子皮'], 'staple', '1 个', 80, n(223, 6.1, 47, 1.1, 1.3, 240, 0.2, 2.1), homeRecipe, ['breakfast', 'chinese']),
  item('white-bread', '白面包', 'White bread', ['bread', 'toast', '吐司'], 'staple', '1 片', 35, n(265, 9, 49, 3.2, 2.7, 490, 0.6, 4.5), pendingAu, ['breakfast']),
  item('wholemeal-bread', '全麦面包', 'Wholemeal bread', ['wholegrain bread', '全麦吐司'], 'staple', '1 片', 40, n(247, 10, 41, 3.4, 6.8, 430, 0.6, 3.8), pendingAu, ['wholegrain']),
  item('wheat-noodles-cooked', '煮麦面', 'Cooked wheat noodles', ['noodles', '面条', '拉面'], 'staple', '1 碗', 200, n(138, 4.5, 25, 2.1, 1.2, 5, 0.3, 0.6), pendingMix, ['staple']),
  item('rice-noodles-cooked', '煮河粉', 'Cooked rice noodles', ['ho fun', '河粉', '米粉'], 'staple', '1 碗', 200, n(109, 1.8, 24.9, 0.2, 0.9, 19, 0, 0.1), pendingMix, ['staple']),
  item('potato-boiled', '煮土豆', 'Boiled potato', ['potato', '土豆', '马铃薯'], 'staple', '1 个中等', 170, n(87, 1.9, 20.1, 0.1, 1.8, 5, 0, 0.8), pendingAu, ['staple']),
  item('sweet-potato-baked', '烤红薯', 'Baked sweet potato', ['kumara', '番薯', '地瓜'], 'staple', '1 个中等', 180, n(90, 1.6, 20.7, 0.2, 3.3, 36, 0, 6.5), pendingAu, ['high-fibre']),
  item('weet-bix', 'Weet-Bix', 'Weet-Bix', ['weetbix', '麦片饼干'], 'staple', '2 片', 30, n(355, 12, 67, 1.4, 11, 290, 0.3, 2.8), brandLabel, ['breakfast', 'wholegrain']),
  item('rolled-oats', '生燕麦片', 'Rolled oats', ['oats', '燕麦片'], 'staple', '1 小碗干', 40, n(379, 13.2, 67.7, 6.5, 10.1, 6, 1.1, 1), pendingAu, ['breakfast', 'wholegrain']),

  item('egg-boiled', '水煮蛋', 'Boiled egg', ['egg', '鸡蛋', '白煮蛋'], 'protein', '1 个', 50, n(143, 12.6, 1.1, 9.5, 0, 124, 2.6, 1.1), pendingMix, ['breakfast', 'protein']),
  item('egg-fried', '煎蛋', 'Fried egg', ['sunny egg', '荷包蛋'], 'protein', '1 个', 55, n(196, 13.6, 0.8, 15, 0, 207, 4.3, 0.8), homeRecipe, ['breakfast']),
  item('egg-scrambled', '炒蛋', 'Scrambled egg', ['scrambled', '滑蛋'], 'protein', '2 个份', 120, n(148, 10, 1.6, 11, 0, 290, 3.3, 1.2), homeRecipe, ['breakfast']),
  item('chicken-thigh-cooked', '熟鸡腿肉', 'Cooked chicken thigh', ['chicken thigh', '鸡腿'], 'protein', '1 块去皮', 130, n(209, 26, 0, 10.9, 0, 84, 3, 0), pendingAu, ['protein']),
  item('pork-loin-cooked', '熟猪里脊', 'Cooked pork loin', ['pork', '里脊', '猪肉'], 'protein', '1 掌心份', 120, n(171, 27, 0, 6.1, 0, 54, 2.1, 0), pendingAu, ['protein']),
  item('beef-mince-cooked', '熟牛肉末', 'Cooked beef mince', ['mince', '牛肉末', '绞肉'], 'protein', '1 掌心份', 110, n(212, 26, 0, 11.6, 0, 75, 4.6, 0), pendingAu, ['protein']),
  item('lamb-grilled', '烤羊肉', 'Grilled lamb', ['lamb', '羊肉'], 'protein', '1 掌心份', 120, n(250, 25, 0, 16.5, 0, 72, 7.2, 0), pendingAu, ['protein']),
  item('prawns-cooked', '熟虾', 'Cooked prawns', ['shrimp', '虾', '大虾'], 'protein', '1 小碗', 100, n(99, 24, 0.2, 0.3, 0, 119, 0.1, 0), pendingAu, ['protein']),
  item('canned-tuna', '罐头金枪鱼（水浸）', 'Canned tuna in spring water', ['tuna', '金枪鱼'], 'protein', '1 小罐可食', 95, n(116, 26, 0, 1, 0, 320, 0.3, 0), brandLabel, ['protein']),
  item('tempeh', '豆豉饼', 'Tempeh', ['tempeh', '天贝'], 'protein', '1 块', 80, n(193, 19, 9, 11, 5, 9, 2.5, 0), pendingMix, ['plant-protein']),

  item('milk-full-cream', '全脂牛奶', 'Full-cream milk', ['milk', '牛奶', 'full cream'], 'dairy', '1 杯', 250, n(64, 3.3, 4.7, 3.6, 0, 44, 2.3, 4.7), pendingAu, ['breakfast', 'dairy']),
  item('milk-reduced-fat', '低脂牛奶', 'Reduced-fat milk', ['lite milk', '低脂奶'], 'dairy', '1 杯', 250, n(47, 3.5, 4.9, 1.5, 0, 45, 1, 4.9), pendingAu, ['dairy']),
  item('soy-milk', '原味豆奶', 'Soy milk', ['soymilk', '豆奶', '豆浆盒装'], 'dairy', '1 杯', 250, n(54, 3.2, 5.2, 1.8, 0.6, 45, 0.3, 3.8), brandMix, ['plant-protein']),
  item('cheddar-cheese', '切达奶酪', 'Cheddar cheese', ['cheese', '芝士', '车达'], 'dairy', '1 小片', 20, n(402, 25, 1.3, 33, 0, 621, 21, 0.5), pendingAu, ['dairy']),

  item('orange', '橙子', 'Orange', ['orange', '橘'], 'fruit', '1 个中等', 150, n(47, 0.9, 11.8, 0.1, 2.4, 0, 0, 9.4), pendingAu, ['fruit']),
  item('grapes', '葡萄', 'Grapes', ['grape', '提子'], 'fruit', '1 小把', 100, n(67, 0.6, 17, 0.2, 0.9, 2, 0.1, 16), pendingAu, ['fruit']),
  item('pear', '梨', 'Pear', ['pear', '雪梨'], 'fruit', '1 个中等', 170, n(57, 0.4, 15.2, 0.1, 3.1, 1, 0, 9.8), pendingAu, ['fruit']),
  item('mango', '芒果', 'Mango', ['mango', '芒果肉'], 'fruit', '1 个可食', 150, n(60, 0.8, 15, 0.4, 1.6, 1, 0.1, 13.7), pendingAu, ['fruit']),
  item('strawberries', '草莓', 'Strawberries', ['strawberry', '士多啤梨'], 'fruit', '1 小碗', 120, n(32, 0.7, 7.7, 0.3, 2, 1, 0, 4.9), pendingAu, ['fruit']),
  item('watermelon', '西瓜', 'Watermelon', ['watermelon'], 'fruit', '1 三角块', 200, n(30, 0.6, 7.6, 0.2, 0.4, 1, 0, 6.2), pendingAu, ['fruit']),
  item('blueberries', '蓝莓', 'Blueberries', ['blueberry', '蓝莓'], 'fruit', '1 小把', 80, n(57, 0.7, 14.5, 0.3, 2.4, 1, 0, 10), pendingAu, ['fruit']),

  item('spinach-cooked', '熟菠菜', 'Cooked spinach', ['spinach', '菠菜'], 'vegetable', '1 碟', 100, n(23, 3, 3.6, 0.3, 2.4, 79, 0.1, 0.4), pendingAu, ['vegetable']),
  item('tomato-raw', '番茄', 'Tomato', ['tomato', '西红柿'], 'vegetable', '1 个中等', 120, n(18, 0.9, 3.9, 0.2, 1.2, 5, 0, 2.6), pendingAu, ['vegetable']),
  item('cucumber', '黄瓜', 'Cucumber', ['cucumber', '青瓜'], 'vegetable', '1 根', 150, n(15, 0.7, 3.6, 0.1, 0.5, 2, 0, 1.7), pendingAu, ['vegetable']),
  item('carrot', '胡萝卜', 'Carrot', ['carrot', '红萝卜'], 'vegetable', '1 根', 80, n(41, 0.9, 9.6, 0.2, 2.8, 69, 0, 4.7), pendingAu, ['vegetable']),
  item('cabbage', '卷心菜', 'Cabbage', ['cabbage', '包菜', '高丽菜'], 'vegetable', '1 碟生', 100, n(25, 1.3, 5.8, 0.1, 2.5, 18, 0, 3.2), pendingAu, ['vegetable']),
  item('mushrooms', '蘑菇', 'Mushrooms', ['mushroom', '蘑菇', '香菇'], 'vegetable', '1 碟', 80, n(22, 3.1, 3.3, 0.3, 1, 5, 0.1, 2), pendingAu, ['vegetable']),
  item('corn-cob', '玉米', 'Corn cob', ['corn', '玉米棒'], 'vegetable', '1 根可食', 90, n(96, 3.4, 21, 1.5, 2.4, 15, 0.2, 6.3), pendingAu, ['vegetable']),
  item('avocado', '牛油果', 'Avocado', ['avocado', '鳄梨'], 'vegetable', '1/2 个', 70, n(160, 2, 8.5, 14.7, 6.7, 7, 2.1, 0.7), pendingAu, ['healthy-fat']),
  item('lettuce', '生菜', 'Lettuce', ['lettuce', '油麦菜'], 'vegetable', '1 小碗', 80, n(15, 1.4, 2.9, 0.2, 1.3, 28, 0, 0.8), pendingAu, ['vegetable']),
  item('edamame', '毛豆', 'Edamame', ['edamame', '枝豆'], 'vegetable', '1 小碗', 80, n(121, 11.9, 8.9, 5.2, 5.2, 6, 0.6, 2.2), pendingMix, ['plant-protein']),
  item('eggplant', '茄子', 'Eggplant', ['aubergine', 'eggplant'], 'vegetable', '1 根', 200, n(25, 1, 5.9, 0.2, 3, 2, 0, 3.5), pendingMix, ['vegetable']),
  item('capsicum', '青椒', 'Green capsicum', ['green pepper', '辣椒', '灯笼椒'], 'vegetable', '1 个', 120, n(20, 0.9, 4.6, 0.2, 1.7, 3, 0, 2.4), pendingAu, ['vegetable']),
  item('garlic', '蒜', 'Garlic', ['garlic', '大蒜'], 'vegetable', '2 瓣', 10, n(149, 6.4, 33, 0.5, 2.1, 17, 0.1, 1), pendingAu, ['vegetable']),
  item('cooking-oil', '食用油', 'Vegetable oil', ['oil', '菜油', '花生油'], 'snack', '1 汤匙', 12, n(884, 0, 0, 100, 0, 0, 14, 0), pending('常见食用油参考值', 'AU/CN', 'high'), ['pantry']),
  item('soy-sauce', '生抽', 'Soy sauce', ['soy sauce', '酱油', '豉油'], 'snack', '1 汤匙', 15, n(53, 8.1, 4.9, 0.1, 0.8, 5490, 0, 0.4), brandMix, ['pantry']),
  item('white-sugar', '白砂糖', 'White sugar', ['sugar', '糖'], 'snack', '1 茶匙', 5, n(387, 0, 100, 0, 0, 1, 0, 100), pendingAu, ['pantry']),
  item('dumpling-wrapper', '饺子皮', 'Dumpling wrapper', ['wonton wrapper', '云吞皮'], 'staple', '8 张', 80, n(270, 8, 56, 1.2, 2, 320, 0.2, 1), homeRecipe, ['staple', 'chinese']),

  item('egg-fried-rice', '蛋炒饭', 'Egg fried rice', ['fried rice', '炒饭'], 'mixed', '1 盘', 320, n(168, 5.2, 25, 5.1, 0.7, 380, 1.2, 1.1), homeRecipe, ['chinese', 'mixed-meal']),
  item('yangzhou-fried-rice', '扬州炒饭', 'Yangzhou fried rice', ['yeung chow', '扬州炒饭'], 'mixed', '1 盘', 350, n(175, 6.8, 23, 6.2, 0.8, 420, 1.5, 1.4), homeRecipe, ['chinese']),
  item('chow-mein', '炒面', 'Chow mein', ['stir-fried noodles', '炒面'], 'mixed', '1 盘', 350, n(162, 6.1, 21, 6.4, 1.4, 480, 1.3, 1.8), homeRecipe, ['chinese']),
  item('beef-ho-fun', '干炒牛河', 'Beef ho fun', ['chow ho fun', '牛河'], 'mixed', '1 盘', 380, n(158, 7.4, 20, 5.8, 1.1, 510, 1.6, 1.6), homeRecipe, ['cantonese']),
  item('wonton-noodles', '云吞面', 'Wonton noodles', ['wonton mein', '馄饨面'], 'mixed', '1 碗', 420, n(92, 5.4, 12.2, 2.4, 0.6, 390, 0.7, 0.8), homeRecipe, ['cantonese']),
  item('dumplings-boiled', '水饺', 'Boiled dumplings', ['jiaozi', '饺子', '锅贴'], 'mixed', '8 个', 240, n(186, 8.2, 22, 7.1, 1.2, 420, 2.1, 1.3), homeRecipe, ['chinese']),
  item('xiaolongbao', '小笼包', 'Xiaolongbao', ['soup dumpling', '灌汤包'], 'mixed', '6 个', 180, n(205, 9.1, 22, 8.6, 0.8, 390, 2.6, 1.2), homeRecipe, ['shanghai']),
  item('char-siu-rice', '叉烧饭', 'Char siu rice', ['barbecue pork rice', '叉烧'], 'mixed', '1 盒', 450, n(186, 9.4, 24, 5.9, 0.6, 520, 1.8, 6.2), homeRecipe, ['cantonese']),
  item('roast-duck-rice', '烧鸭饭', 'Roast duck rice', ['siu aap rice', '烤鸭饭'], 'mixed', '1 盒', 480, n(198, 10.2, 21, 8.4, 0.7, 490, 2.4, 2.2), homeRecipe, ['cantonese']),
  item('hainan-chicken-rice', '海南鸡饭', 'Hainanese chicken rice', ['chicken rice', '白切鸡饭'], 'mixed', '1 份', 500, n(176, 9.8, 20, 6.6, 0.5, 410, 1.9, 1.1), homeRecipe, ['southeast-asian']),
  item('claypot-rice', '煲仔饭', 'Claypot rice', ['bao zai fan'], 'mixed', '1 煲', 480, n(168, 8.1, 23, 5.4, 0.8, 470, 1.5, 1.6), homeRecipe, ['cantonese']),
  item('mapo-tofu', '麻婆豆腐', 'Mapo tofu', ['mapo', '麻婆'], 'mixed', '1 家常份', 280, n(112, 6.8, 5.2, 7.4, 0.9, 480, 1.4, 1.8), homeRecipe, ['sichuan']),
  item('yuxiang-eggplant', '鱼香茄子', 'Fish-fragrant eggplant', ['茄子', 'yu xiang qie zi'], 'mixed', '1 家常份', 260, n(118, 2.1, 9.4, 8.2, 2.4, 430, 1.3, 4.6), homeRecipe, ['sichuan']),
  item('kung-pao-chicken', '宫保鸡丁', 'Kung pao chicken', ['gong bao', '宫保鸡'], 'mixed', '1 家常份', 280, n(168, 13.2, 8.4, 9.1, 1.3, 510, 2, 4.8), homeRecipe, ['sichuan']),
  item('sweet-sour-pork', '糖醋里脊', 'Sweet and sour pork', ['gurkha pork', '咕噜肉'], 'mixed', '1 家常份', 260, n(212, 10.4, 18, 10.8, 0.7, 390, 2.8, 10.5), homeRecipe, ['chinese']),
  item('steamed-fish', '清蒸鱼', 'Steamed fish', ['steamed barramundi', '蒸鱼'], 'mixed', '1 份', 220, n(112, 18.4, 1.2, 3.8, 0.2, 310, 0.8, 0.6), homeRecipe, ['cantonese']),
  item('garlic-broccoli', '蒜蓉西兰花', 'Garlic broccoli', ['蒜蓉炒西兰花'], 'vegetable', '1 碟', 180, n(58, 2.6, 6.4, 2.8, 2.6, 240, 0.4, 1.6), lightRecipe, ['chinese', 'vegetable']),
  item('shredded-potato', '醋溜土豆丝', 'Vinegar shredded potato', ['土豆丝'], 'vegetable', '1 碟', 160, n(82, 1.4, 14.2, 2.4, 1.6, 280, 0.3, 1.2), lightRecipe, ['chinese']),
  item('pepper-pork', '青椒肉丝', 'Pork and green pepper', ['青椒炒肉'], 'mixed', '1 家常份', 250, n(142, 11.6, 4.8, 8.4, 1.1, 390, 2.2, 2.1), homeRecipe, ['chinese']),
  item('tomato-beef-brisket', '番茄牛腩', 'Tomato beef brisket', ['牛腩', '西红柿牛腩'], 'mixed', '1 家常份', 320, n(128, 11.4, 5.6, 6.8, 1, 420, 2.6, 3.2), homeRecipe, ['chinese']),
  item('curry-chicken', '咖喱鸡', 'Chicken curry', ['curry', '咖喱'], 'mixed', '1 家常份', 300, n(148, 11.2, 6.4, 8.6, 1.4, 440, 3.4, 2.8), homeRecipe, ['southeast-asian']),
  item('pho-beef', '牛肉河粉汤', 'Beef pho', ['pho', '越南粉'], 'mixed', '1 碗', 550, n(54, 4.2, 7.1, 1.1, 0.5, 360, 0.4, 1.2), homeRecipe, ['vietnamese']),
  item('soy-milk-fresh', '热豆浆', 'Fresh soy milk', ['豆浆', 'soy milk drink'], 'dairy', '1 碗', 250, n(33, 2.8, 1.8, 1.4, 0.4, 12, 0.2, 0.6), lightRecipe, ['breakfast', 'chinese']),
  item('youtiao', '油条', 'Youtiao', ['fried dough', '油炸鬼'], 'snack', '1 根', 70, n(386, 7.2, 40, 21.6, 1.3, 480, 4.8, 1.1), homeRecipe, ['breakfast', 'chinese']),
  item('steamed-egg', '蒸蛋', 'Steamed egg custard', ['水蒸蛋', '蛋羹'], 'protein', '1 碗', 180, n(72, 6.4, 1.8, 4.4, 0, 210, 1.3, 1.2), lightRecipe, ['chinese']),
  item('red-braised-pork', '红烧肉', 'Red-braised pork', ['hong shao rou', '东坡肉'], 'mixed', '1 家常份', 180, n(286, 13.4, 6.2, 23.1, 0.2, 430, 8.1, 4.4), homeRecipe, ['chinese']),
  item('congee-pork-egg', '皮蛋瘦肉粥', 'Pork and century-egg congee', ['pork congee', '瘦肉粥'], 'mixed', '1 碗', 320, n(58, 3.4, 8.2, 1.3, 0.2, 290, 0.4, 0.3), homeRecipe, ['cantonese']),
  item('spring-roll', '春卷', 'Spring roll', ['lumpia', '春卷'], 'snack', '2 条', 80, n(250, 5.4, 26, 13.6, 1.6, 410, 2.4, 2.2), homeRecipe, ['chinese']),
  item('siu-mai', '烧卖', 'Siu mai', ['shumai', '烧麦'], 'mixed', '4 个', 120, n(198, 10.6, 16, 10.2, 0.7, 430, 2.8, 1.4), homeRecipe, ['cantonese']),
  item('rice-roll', '肠粉', 'Rice noodle roll', ['cheung fun', '布拉肠'], 'mixed', '1 碟', 220, n(112, 3.1, 19.4, 2.6, 0.4, 360, 0.6, 1.1), homeRecipe, ['cantonese']),

  item('peanuts-unsalted', '原味花生', 'Unsalted peanuts', ['peanut', '花生'], 'snack', '1 小把', 30, n(567, 25.8, 16.1, 49.2, 8.5, 18, 6.3, 4.7), pendingAu, ['nuts']),
  item('black-coffee', '黑咖啡', 'Black coffee', ['coffee', '美式', 'espresso'], 'snack', '1 杯', 240, n(2, 0.1, 0, 0, 0, 5, 0, 0), pendingAu, ['drink']),
  item('green-tea', '绿茶', 'Green tea', ['tea', '绿茶', '茉莉花茶'], 'snack', '1 杯', 240, n(1, 0, 0.2, 0, 0, 1, 0, 0), pendingMix, ['drink']),
  item('flat-white', 'Flat white', 'Flat white', ['latte', '拿铁', '咖啡牛奶'], 'snack', '1 杯', 220, n(54, 2.8, 4.2, 2.9, 0, 38, 1.8, 4.2), recipe('咖啡店常见配方估算', 'AU'), ['drink']),
  item('milk-tea', '珍珠奶茶', 'Bubble milk tea', ['boba', '奶茶'], 'snack', '1 杯', 500, n(72, 1.1, 14.6, 1.4, 0.2, 48, 0.8, 12.4), recipe('甜度中等的配方估算', 'AU/CN'), ['drink']),
  item('potato-chips', '薯片', 'Potato chips', ['chips', 'crisps', '薯片'], 'snack', '1 小包', 30, n(536, 6.6, 51, 35, 4.4, 525, 8.6, 0.6), brandLabel, ['snack']),
  item('vegemite-toast', '维吉麦烤面包', 'Vegemite on toast', ['vegemite', '酵母酱吐司'], 'snack', '1 片', 45, n(248, 10.4, 38, 4.2, 3.1, 620, 0.8, 3.2), recipe('一片全麦吐司加薄酱的估算', 'AU'), ['breakfast']),
  item('meat-pie', '肉馅饼', 'Meat pie', ['pie', '澳式肉派'], 'mixed', '1 个', 180, n(271, 9.4, 24, 15.2, 1.3, 480, 7.1, 1.8), recipe('烘焙店常见配方估算', 'AU'), ['australian']),
  item('oyster-sauce', '蚝油', 'Oyster sauce', ['oyster sauce', '蚝油'], 'snack', '1 汤匙', 18, n(102, 3.2, 20, 0.3, 0.3, 4100, 0, 16), brandMix, ['pantry']),
  item('chilli-sauce', '辣椒酱', 'Chilli sauce', ['sambal', '辣椒酱', '蒜蓉辣椒'], 'snack', '1 茶匙', 8, n(93, 1.8, 20, 0.8, 1.2, 1800, 0.1, 15), brandMix, ['pantry']),
  item('sesame-oil', '香油', 'Sesame oil', ['sesame oil', '麻油'], 'snack', '1 茶匙', 5, n(884, 0, 0, 100, 0, 0, 14, 0), pending('常见香油参考值', 'AU/CN', 'high'), ['pantry']),
  item('instant-noodles-cooked', '方便面（煮熟）', 'Instant noodles, cooked', ['instant noodles', '方便面', '泡面'], 'staple', '1 包连汤', 400, n(92, 2.1, 12.4, 3.6, 0.6, 430, 1.6, 0.8), homeRecipe, ['staple', 'chinese']),
  item('cucumber-salad', '凉拌黄瓜', 'Smashed cucumber salad', ['拍黄瓜'], 'vegetable', '1 碟', 160, n(28, 0.8, 4.2, 1.1, 0.6, 290, 0.2, 1.8), lightRecipe, ['chinese', 'vegetable']),
  item('garlic-lettuce', '蚝油生菜', 'Oyster-sauce lettuce', ['蚝油生菜'], 'vegetable', '1 碟', 160, n(42, 1.5, 4.1, 2.4, 1.2, 380, 0.3, 1.4), lightRecipe, ['chinese', 'vegetable']),
  item('spinach-garlic', '蒜蓉菠菜', 'Garlic spinach', ['蒜蓉菠菜'], 'vegetable', '1 碟', 150, n(48, 3.1, 4.2, 2.6, 2.2, 310, 0.4, 0.8), lightRecipe, ['chinese', 'vegetable']),
  item('tomato-egg-soup', '番茄蛋汤', 'Tomato and egg soup', ['西红柿蛋汤'], 'mixed', '1 碗', 350, n(32, 2.4, 2.6, 1.5, 0.4, 290, 0.4, 1.6), lightRecipe, ['chinese']),
  item('egg-drop-soup', '蛋花汤', 'Egg drop soup', ['蛋花汤'], 'mixed', '1 碗', 300, n(24, 2.1, 1.1, 1.3, 0.1, 320, 0.4, 0.4), lightRecipe, ['chinese']),
  item('cold-tofu', '皮蛋豆腐', 'Century egg tofu', ['皮蛋豆腐'], 'protein', '1 份', 220, n(78, 7.2, 2.4, 4.4, 0.4, 310, 1.1, 1.2), lightRecipe, ['chinese']),
  item('capsicum-egg', '青椒炒蛋', 'Green pepper and egg', ['青椒炒蛋'], 'mixed', '1 家常份', 220, n(118, 7.4, 4.2, 8.1, 1.1, 340, 2.1, 2.2), homeRecipe, ['chinese']),
  item('prawn-egg', '虾仁炒蛋', 'Prawn and egg stir-fry', ['虾仁炒蛋'], 'mixed', '1 家常份', 240, n(132, 12.4, 2.1, 8.2, 0.3, 360, 2.2, 1.1), homeRecipe, ['chinese']),
  item('mu-shu-pork', '木须肉', 'Moo shu pork', ['木须肉', '木樨肉'], 'mixed', '1 家常份', 260, n(148, 11.2, 5.4, 9.1, 1.2, 410, 2.4, 2.2), homeRecipe, ['chinese']),
  item('yuxiang-pork', '鱼香肉丝', 'Fish-fragrant shredded pork', ['鱼香肉丝'], 'mixed', '1 家常份', 250, n(156, 12.1, 7.2, 8.8, 1.1, 430, 2.3, 3.6), homeRecipe, ['sichuan']),
  item('twice-cooked-pork', '回锅肉', 'Twice-cooked pork', ['回锅肉'], 'mixed', '1 家常份', 240, n(198, 11.8, 5.6, 14.2, 1, 470, 4.6, 2.8), homeRecipe, ['sichuan']),
  item('garlic-pork', '蒜泥白肉', 'Pork with garlic sauce', ['蒜泥白肉'], 'mixed', '1 家常份', 180, n(168, 16.2, 2.4, 10.4, 0.3, 390, 3.4, 1.2), homeRecipe, ['sichuan']),
  item('soy-chicken', '豉油鸡', 'Soy sauce chicken', ['豉油鸡', '卤鸡'], 'protein', '1 份', 200, n(176, 18.4, 3.2, 9.6, 0.2, 520, 2.6, 2.1), homeRecipe, ['cantonese']),
  item('white-cut-chicken', '白切鸡', 'White-cut chicken', ['白切鸡'], 'protein', '1 份', 200, n(162, 19.2, 0.8, 8.8, 0, 310, 2.4, 0.4), lightRecipe, ['cantonese']),
  item('sweet-sour-ribs', '糖醋排骨', 'Sweet and sour ribs', ['糖醋排骨'], 'mixed', '1 家常份', 220, n(228, 13.2, 14.6, 12.8, 0.4, 410, 4.1, 9.8), homeRecipe, ['chinese']),
  item('potato-beef-stew', '土豆炖牛肉', 'Potato beef stew', ['土豆炖牛肉'], 'mixed', '1 家常份', 320, n(126, 10.8, 8.2, 5.8, 1.2, 390, 2.2, 2.4), homeRecipe, ['chinese']),
  item('mapo-eggplant', '麻婆茄子', 'Mapo eggplant', ['麻婆茄子'], 'mixed', '1 家常份', 260, n(108, 3.4, 8.6, 7.1, 2.2, 420, 1.2, 3.8), homeRecipe, ['sichuan']),
  item('red-braised-eggplant', '红烧茄子', 'Red-braised eggplant', ['红烧茄子'], 'vegetable', '1 家常份', 240, n(96, 1.4, 8.2, 6.8, 2.4, 360, 1, 3.2), homeRecipe, ['chinese']),
  item('di-san-xian', '地三鲜', 'Di san xian', ['地三鲜'], 'vegetable', '1 家常份', 260, n(112, 2.1, 14.2, 5.6, 2.6, 340, 0.8, 3.8), homeRecipe, ['northeastern']),
  item('cabbage-stir', '醋溜白菜', 'Vinegar cabbage', ['醋溜白菜', '手撕包菜'], 'vegetable', '1 碟', 180, n(52, 1.4, 6.1, 2.6, 1.8, 320, 0.4, 3.1), lightRecipe, ['chinese']),
  item('tofu-mince', '肉末豆腐', 'Minced pork tofu', ['肉末豆腐'], 'mixed', '1 家常份', 280, n(118, 8.4, 4.2, 7.6, 0.8, 390, 1.8, 1.6), homeRecipe, ['chinese']),
  item('chicken-mushroom', '香菇鸡', 'Chicken with mushrooms', ['香菇鸡'], 'mixed', '1 家常份', 280, n(138, 14.2, 4.6, 7.1, 1.1, 380, 1.9, 1.8), homeRecipe, ['chinese']),
  item('pork-cabbage', '包菜炒肉', 'Pork and cabbage', ['包菜炒肉'], 'mixed', '1 家常份', 250, n(128, 10.4, 5.2, 7.4, 1.4, 360, 2.1, 2.4), homeRecipe, ['chinese']),
  item('beef-tomato-stir', '番茄炒牛肉', 'Tomato beef stir-fry', ['西红柿炒牛肉'], 'mixed', '1 家常份', 260, n(132, 12.6, 5.1, 6.8, 1, 370, 2.4, 2.8), homeRecipe, ['chinese']),
  item('scallion-oil-noodles', '葱油拌面', 'Scallion oil noodles', ['葱油面'], 'mixed', '1 碗', 320, n(168, 5.2, 26, 5.4, 1.1, 420, 0.9, 1.2), homeRecipe, ['shanghai']),
  item('zhajiang-noodles', '炸酱面', 'Zhajiangmian', ['炸酱面'], 'mixed', '1 碗', 380, n(154, 7.8, 22, 4.8, 1.4, 480, 1.4, 2.1), homeRecipe, ['chinese']),
  item('dandan-noodles', '担担面', 'Dan dan noodles', ['担担面'], 'mixed', '1 碗', 360, n(162, 7.2, 21, 6.1, 1.3, 510, 1.5, 2.4), homeRecipe, ['sichuan']),
  item('tomato-egg-noodles', '番茄鸡蛋面', 'Tomato egg noodles', ['西红柿鸡蛋面'], 'mixed', '1 碗', 400, n(96, 4.8, 14.2, 2.6, 0.8, 360, 0.7, 2.1), homeRecipe, ['chinese']),
  item('fried-ho-fun-veg', '蔬菜炒河粉', 'Vegetable fried ho fun', ['菜河粉'], 'mixed', '1 盘', 360, n(138, 3.8, 22, 4.2, 1.4, 390, 0.7, 2.2), homeRecipe, ['cantonese']),
  item('chicken-congee', '鸡肉粥', 'Chicken congee', ['鸡粥'], 'mixed', '1 碗', 320, n(54, 4.2, 7.4, 1.1, 0.2, 280, 0.3, 0.3), lightRecipe, ['cantonese']),
  item('tuna-rice', '金枪鱼拌饭', 'Tuna rice bowl', ['金枪鱼饭'], 'mixed', '1 碗', 350, n(132, 9.8, 18.4, 2.6, 0.6, 310, 0.6, 0.8), homeRecipe, ['mixed-meal']),
  item('chicken-rice-bowl', '鸡胸盖饭', 'Chicken rice bowl', ['鸡胸盖饭'], 'mixed', '1 碗', 380, n(142, 12.6, 16.8, 3.2, 0.6, 240, 0.7, 0.8), homeRecipe, ['mixed-meal']),
  item('egg-rice-bowl', '鸡蛋盖饭', 'Egg rice bowl', ['鸡蛋盖饭'], 'mixed', '1 碗', 320, n(148, 7.2, 20, 4.6, 0.5, 280, 1.2, 1.1), homeRecipe, ['chinese']),
  item('tofu-cabbage-soup', '白菜豆腐汤', 'Cabbage tofu soup', ['白菜豆腐汤'], 'mixed', '1 碗', 350, n(28, 2.4, 2.2, 1.2, 0.7, 290, 0.2, 1.1), lightRecipe, ['chinese']),
  item('prawn-fried-rice', '虾仁炒饭', 'Prawn fried rice', ['虾仁炒饭', 'shrimp fried rice'], 'mixed', '1 盘', 350, n(158, 8.4, 22, 4.6, 0.7, 390, 1.1, 1.2), homeRecipe, ['chinese', 'mixed-meal']),
  item('garlic-prawns', '蒜蓉虾', 'Garlic prawns', ['蒜蓉虾', '蒜香虾'], 'protein', '1 家常份', 180, n(118, 18.6, 2.1, 3.8, 0.2, 420, 0.6, 0.8), homeRecipe, ['cantonese']),
  item('oyster-mushrooms', '蚝油香菇', 'Oyster-sauce mushrooms', ['蚝油香菇'], 'vegetable', '1 碟', 160, n(62, 3.2, 6.4, 3.1, 1.4, 480, 0.4, 2.4), lightRecipe, ['chinese', 'vegetable']),
  item('edamame-stir', '清炒毛豆', 'Stir-fried edamame', ['清炒毛豆', '炒毛豆'], 'vegetable', '1 碟', 140, n(96, 9.2, 7.4, 4.6, 4.1, 210, 0.6, 1.8), lightRecipe, ['chinese', 'vegetable']),
  item('mushroom-greens', '香菇青菜', 'Mushroom greens', ['香菇青菜'], 'vegetable', '1 碟', 180, n(48, 2.6, 4.8, 2.8, 1.6, 280, 0.4, 1.4), lightRecipe, ['chinese', 'vegetable']),
  item('avocado-toast', '牛油果吐司', 'Avocado toast', ['avocado toast', '牛油果面包'], 'mixed', '1 片', 110, n(198, 5.4, 18.2, 11.6, 4.8, 320, 2.2, 1.6), homeRecipe, ['breakfast']),
  item('salmon-rice-bowl', '三文鱼盖饭', 'Salmon rice bowl', ['三文鱼饭', '鲑鱼盖饭'], 'mixed', '1 碗', 400, n(168, 12.4, 16.8, 6.2, 0.6, 260, 1.4, 0.8), homeRecipe, ['mixed-meal']),
  item('tofu-mushroom', '香菇豆腐', 'Tofu with mushrooms', ['香菇豆腐'], 'mixed', '1 家常份', 260, n(96, 7.8, 4.6, 5.4, 1.2, 340, 0.9, 1.4), homeRecipe, ['chinese']),
  item('lamb-rice', '羊肉盖饭', 'Lamb rice bowl', ['羊肉盖饭'], 'mixed', '1 碗', 380, n(176, 12.8, 16.4, 7.2, 0.6, 280, 2.8, 0.8), homeRecipe, ['mixed-meal']),
  item('corn-egg-soup', '玉米蛋汤', 'Corn and egg soup', ['玉米蛋汤'], 'mixed', '1 碗', 350, n(38, 2.6, 5.1, 1.4, 0.6, 280, 0.4, 2.1), lightRecipe, ['chinese']),
  item('steamed-bun-egg', '馒头夹蛋', 'Steamed bun with egg', ['馒头夹蛋', '鸡蛋馒头'], 'mixed', '1 个', 140, n(186, 8.4, 24, 6.2, 0.8, 310, 1.8, 1.6), homeRecipe, ['breakfast', 'chinese']),
  item('yoghurt-oats', '酸奶燕麦', 'Yoghurt oats', ['酸奶燕麦', 'overnight oats'], 'mixed', '1 碗', 280, n(92, 6.4, 12.8, 2.4, 1.8, 48, 1.1, 4.2), homeRecipe, ['breakfast']),
  item('chicken-salad', '鸡胸沙拉', 'Chicken salad', ['鸡胸沙拉'], 'mixed', '1 碗', 280, n(86, 12.4, 4.2, 2.6, 1.8, 180, 0.6, 2.1), lightRecipe, ['mixed-meal']),
  item('tuna-sandwich', '金枪鱼三明治', 'Tuna sandwich', ['金枪鱼三明治'], 'mixed', '1 个', 170, n(168, 12.6, 18.4, 4.8, 1.6, 420, 1.1, 2.2), homeRecipe, ['breakfast']),
  item('cheese-toast', '芝士吐司', 'Cheese toast', ['芝士吐司', '奶酪烤面包'], 'mixed', '1 片', 55, n(286, 13.2, 28, 13.6, 1.8, 540, 7.4, 3.1), homeRecipe, ['breakfast']),
  item('banana-oats', '香蕉燕麦', 'Banana oats', ['香蕉燕麦'], 'mixed', '1 碗', 280, n(98, 3.8, 18.6, 1.8, 2.2, 28, 0.4, 7.4), homeRecipe, ['breakfast']),
  item('lamb-potato', '土豆炖羊肉', 'Lamb and potato stew', ['土豆炖羊肉'], 'mixed', '1 家常份', 320, n(148, 12.4, 8.6, 6.8, 1.2, 360, 3.1, 1.8), homeRecipe, ['chinese']),
  item('peanut-noodles', '花生酱拌面', 'Peanut noodles', ['花生酱拌面', '凉面'], 'mixed', '1 碗', 340, n(176, 7.6, 24, 6.2, 2.1, 410, 1.2, 2.4), homeRecipe, ['chinese']),
  item('mango-yoghurt', '芒果酸奶', 'Mango yoghurt', ['芒果酸奶'], 'dairy', '1 杯', 250, n(78, 6.4, 10.8, 1.8, 0.8, 42, 1.2, 9.6), homeRecipe, ['breakfast', 'fruit']),
  item('bibimbap', '简易拌饭', 'Simple bibimbap', ['拌饭', '石锅拌饭'], 'mixed', '1 碗', 420, n(132, 8.6, 18.2, 3.8, 1.4, 340, 1.1, 2.2), homeRecipe, ['mixed-meal']),
];

export const foodsById = Object.fromEntries(foods.map((food) => [food.id, food])) as Record<string, Food>;
