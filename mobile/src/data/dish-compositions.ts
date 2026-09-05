import type { DishComposition, DishIngredient } from '@/types/nutrition';

function mix(pairs: [string, number][], yieldGrams: number, note?: string): DishComposition {
  const ingredients: DishIngredient[] = pairs.map(([foodId, grams]) => ({ foodId, grams }));
  return note ? { ingredients, yieldGrams, note } : { ingredients, yieldGrams };
}

/** High-frequency Chinese mixed dishes. 套餐 stay in recipes.ts; these are single dishes. */
export const dishCompositions: Record<string, DishComposition> = {
  'tomato-egg': mix([['tomato-raw', 200], ['egg-boiled', 100], ['cooking-oil', 12]], 250),
  'beef-broccoli': mix([['beef-mince-cooked', 120], ['broccoli-steamed', 120], ['cooking-oil', 12], ['soy-sauce', 10]], 280),
  'bok-choy-stir-fry': mix([['cabbage', 160], ['cooking-oil', 8], ['soy-sauce', 6]], 180, '小白菜以卷心菜营养近似'),
  'egg-fried-rice': mix([['white-rice-cooked', 220], ['egg-boiled', 50], ['cooking-oil', 12], ['soy-sauce', 8]], 320),
  'yangzhou-fried-rice': mix([['white-rice-cooked', 220], ['egg-boiled', 50], ['prawns-cooked', 40], ['pork-loin-cooked', 30], ['cooking-oil', 14], ['soy-sauce', 10]], 350),
  'chow-mein': mix([['wheat-noodles-cooked', 220], ['cabbage', 50], ['carrot', 30], ['cooking-oil', 15], ['soy-sauce', 12]], 350),
  'beef-ho-fun': mix([['rice-noodles-cooked', 220], ['beef-mince-cooked', 80], ['cooking-oil', 18], ['soy-sauce', 12]], 380),
  'wonton-noodles': mix([['wheat-noodles-cooked', 180], ['pork-loin-cooked', 50], ['dumpling-wrapper', 40], ['soy-sauce', 10]], 420, '汤水按无能量计'),
  'dumplings-boiled': mix([['dumpling-wrapper', 80], ['pork-loin-cooked', 80], ['cabbage', 40], ['cooking-oil', 8]], 240),
  'xiaolongbao': mix([['dumpling-wrapper', 60], ['pork-loin-cooked', 80], ['soy-sauce', 8]], 180),
  'char-siu-rice': mix([['white-rice-cooked', 250], ['pork-loin-cooked', 120], ['soy-sauce', 12], ['white-sugar', 8]], 450),
  'roast-duck-rice': mix([['white-rice-cooked', 250], ['chicken-thigh-cooked', 140], ['soy-sauce', 10]], 480, '烧鸭以熟鸡腿肉近似，不是鸭肉实测'),
  'hainan-chicken-rice': mix([['white-rice-cooked', 250], ['chicken-thigh-cooked', 160], ['cucumber', 40], ['cooking-oil', 10]], 500),
  'claypot-rice': mix([['white-rice-cooked', 250], ['chicken-thigh-cooked', 100], ['soy-sauce', 12], ['cooking-oil', 10]], 480),
  'mapo-tofu': mix([['tofu-firm', 180], ['beef-mince-cooked', 40], ['cooking-oil', 12], ['soy-sauce', 12]], 280),
  'yuxiang-eggplant': mix([['eggplant', 200], ['cooking-oil', 18], ['soy-sauce', 10], ['white-sugar', 6]], 260),
  'kung-pao-chicken': mix([['chicken-thigh-cooked', 150], ['peanuts-unsalted', 20], ['cooking-oil', 12], ['soy-sauce', 10], ['white-sugar', 6]], 280),
  'sweet-sour-pork': mix([['pork-loin-cooked', 140], ['cooking-oil', 16], ['white-sugar', 18], ['soy-sauce', 6]], 260),
  'steamed-fish': mix([['salmon-baked', 180], ['soy-sauce', 12], ['cooking-oil', 6]], 220, '白肉鱼以三文鱼营养近似'),
  'garlic-broccoli': mix([['broccoli-steamed', 150], ['garlic', 8], ['cooking-oil', 8], ['soy-sauce', 6]], 180),
  'shredded-potato': mix([['potato-boiled', 140], ['cooking-oil', 8], ['soy-sauce', 4]], 160),
  'pepper-pork': mix([['pork-loin-cooked', 120], ['capsicum', 80], ['cooking-oil', 12], ['soy-sauce', 8]], 250),
  'tomato-beef-brisket': mix([['beef-mince-cooked', 140], ['tomato-raw', 120], ['potato-boiled', 40], ['cooking-oil', 10], ['soy-sauce', 10]], 320, '牛腩以熟牛肉末近似'),
  'curry-chicken': mix([['chicken-thigh-cooked', 140], ['potato-boiled', 80], ['cooking-oil', 14], ['soy-sauce', 6]], 300),
  'pho-beef': mix([['rice-noodles-cooked', 200], ['beef-mince-cooked', 80], ['soy-sauce', 8]], 550, '汤水按无能量计'),
  'red-braised-pork': mix([['pork-loin-cooked', 140], ['soy-sauce', 15], ['white-sugar', 10], ['cooking-oil', 8]], 180),
  'congee-pork-egg': mix([['congee-plain', 250], ['pork-loin-cooked', 40], ['egg-boiled', 30], ['soy-sauce', 6]], 320),
  'spring-roll': mix([['dumpling-wrapper', 30], ['cabbage', 20], ['pork-loin-cooked', 15], ['cooking-oil', 12]], 80),
  'siu-mai': mix([['dumpling-wrapper', 40], ['pork-loin-cooked', 60], ['prawns-cooked', 15], ['soy-sauce', 5]], 120),
  'rice-roll': mix([['rice-noodles-cooked', 180], ['soy-sauce', 12], ['cooking-oil', 6]], 220),
  'steamed-egg': mix([['egg-boiled', 100], ['soy-sauce', 4]], 180, '蒸蛋含水分，出锅重量大于蛋液'),
};
