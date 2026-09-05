import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const sourceRoot = pathToFileURL(`${process.cwd()}/src/`).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return { shortCircuit: true, url: `${sourceRoot}${specifier.slice(2)}.ts` };
    }
    return nextResolve(specifier, context);
  },
});

const nutrition = await import('../src/domain/nutrition.ts');
const validation = await import('../src/domain/food-validation.ts');
const { foods, foodsById } = await import('../src/data/foods.ts');
const catalog = await import('../src/data/catalog.ts');

function closeTo(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.0001, `${message}: expected ${expected}, received ${actual}`);
}

const tomatoEgg = foodsById['tomato-egg'];
assert.ok(tomatoEgg, '番茄炒蛋样例应存在');

const serving = nutrition.nutrientsForServing(tomatoEgg, 1.5);
closeTo(serving.energyKcal, 393.75, '份量能量计算');
closeTo(serving.proteinG, 20.25, '份量蛋白质计算');

const combined = nutrition.addNutrients(nutrition.emptyNutrients(), serving);
assert.deepEqual(combined, serving, '空营养值相加不应改变结果');
assert.equal(nutrition.percent(50, 100), 50, '目标进度计算');
assert.equal(nutrition.percent(200, 100), 100, '目标进度应封顶');
assert.equal(nutrition.percent(5, 0), 0, '无效目标应返回零');

const targets = { energyKcal: 2000, proteinG: 90, fibreG: 30, sodiumMg: 2000, vegetableServes: 5, grainServes: 6, proteinServes: 3 };
assert.match(nutrition.nextMealSuggestion({ ...nutrition.emptyNutrients(), fibreG: 5 }, targets), /膳食纤维/);
assert.match(nutrition.nextMealSuggestion({ ...nutrition.emptyNutrients(), fibreG: 20, proteinG: 20 }, targets), /蛋白质/);
assert.match(nutrition.nextMealSuggestion({ ...nutrition.emptyNutrients(), fibreG: 20, proteinG: 60, sodiumMg: 1800 }, targets), /钠/);
assert.match(nutrition.nextMealSuggestion({ ...nutrition.emptyNutrients(), fibreG: 20, proteinG: 60 }, targets, { vegetableServes: 1, grainServes: 2, proteinServes: 2 }), /蔬菜/);

const sharedEntry = { id: '1', foodId: 'tomato-egg', servings: 1, meal: 'dinner', recordedAt: '2026-09-03T10:00:00.000Z', sharedWith: 3, portionShare: 1 / 3 };
const wholeDish = nutrition.nutrientsForServing(tomatoEgg, 1);
const myShare = nutrition.entryIntake(tomatoEgg, sharedEntry);
closeTo(myShare.energyKcal, wholeDish.energyKcal / 3, '合菜三分之一应按整盘折算，而不是记整盘');
assert.ok(Math.abs(myShare.energyKcal - wholeDish.energyKcal) > 10, '个人份额必须明显小于整盘');

const restaurant = nutrition.entryIntake(tomatoEgg, { ...sharedEntry, oilLevel: 'restaurant', portionShare: 1, sharedWith: 1 });
assert.ok(restaurant.energyKcal > wholeDish.energyKcal, '餐馆用油应提高能量');
assert.ok(restaurant.fatG > wholeDish.fatG, '餐馆用油应提高脂肪');

const apple = foodsById.apple;
const appleOiled = nutrition.entryIntake(apple, { id: '2', foodId: 'apple', servings: 1, meal: 'snack', recordedAt: '', oilLevel: 'restaurant', portionShare: 1 });
closeTo(appleOiled.energyKcal, nutrition.nutrientsForServing(apple, 1).energyKcal, '水果不应套用油量系数');
assert.equal(nutrition.foodSupportsOilLevel(tomatoEgg), true);
assert.equal(nutrition.foodSupportsOilLevel(apple), false);
assert.equal(nutrition.foodSupportsOilLevel(foodsById['milk-tea']), false, '珍珠奶茶不应出现用油选项');
assert.equal(nutrition.foodSupportsOilLevel(foodsById['flat-white']), false, '咖啡不应出现用油选项');
assert.equal(nutrition.foodSupportsOilLevel(foodsById['steamed-egg']), false, '蒸蛋构成不含食用油');

const mealTotal = nutrition.totalForEntries([
  { id: 'a', foodId: 'tomato-egg', servings: 1, meal: 'dinner', recordedAt: '2026-09-03T10:00:00.000Z', portionShare: 0.5, mealGroupId: 'g1' },
  { id: 'b', foodId: 'white-rice-cooked', servings: 1, meal: 'dinner', recordedAt: '2026-09-03T10:00:00.000Z', mealGroupId: 'g1' },
], foodsById);
const expectedMeal = nutrition.addNutrients(
  nutrition.scaleNutrients(nutrition.nutrientsForServing(tomatoEgg, 1), 0.5),
  nutrition.nutrientsForServing(foodsById['white-rice-cooked'], 1),
);
closeTo(mealTotal.energyKcal, expectedMeal.energyKcal, '一餐等于各道菜个人份额之和');

const cards = nutrition.mealCardsForDate([
  { id: 'a', foodId: 'tomato-egg', servings: 1, meal: 'dinner', recordedAt: '2026-09-03T10:00:00.000Z', mealGroupId: 'g1' },
  { id: 'b', foodId: 'white-rice-cooked', servings: 1, meal: 'dinner', recordedAt: '2026-09-03T10:00:00.000Z', mealGroupId: 'g1' },
], '2026-09-03');
assert.equal(cards.length, 1, '同一 mealGroup 应合成一餐');
assert.equal(cards[0].entries.length, 2, '一餐可包含多道菜');

closeTo(nutrition.kcalToKj(100), 418.4, 'kcal 转 kJ');
assert.match(nutrition.formatEnergy(100, 'kj'), /kJ/);
assert.equal(tomatoEgg.source.type, 'recipe');
assert.equal(tomatoEgg.source.confidence, 'estimate');
assert.ok(foodsById['ausnut-29101001'].source.dataset === 'fsanz-ausnut', 'FSANZ 来源应写在 Food.source.dataset');

const recipes = await import('../src/data/recipes.ts');
const homeDinner = recipes.findRecipe('recipe-home-dinner');
assert.ok(homeDinner, '应有家常晚饭套餐');
assert.ok(homeDinner.items.length >= 3, '菜谱是多道菜模板');
assert.equal('nutrientsPer100g' in homeDinner, false, '菜谱不是自定义食品模型');
assert.ok('nutrientsPer100g' in tomatoEgg, '目录食品才有每100g营养');
assert.ok(nutrition.recipeEnergyPerServe(homeDinner, foodsById) > 200, '套餐应能汇总能量');
closeTo(nutrition.foodGroupServes([{ id: 'v', foodId: 'bok-choy-stir-fry', servings: 1, meal: 'dinner', recordedAt: '' }], foodsById).vegetableServes, 1, '青菜计入蔬菜份');

const invalid = validation.validateFoodDraft({
  nameZh: '', category: 'mixed', servingLabel: '', servingGrams: -1, nutrientsPer100g: { energyKcal: -2 },
});
assert.equal(invalid.valid, false, '无效自定义食品应被拒绝');

const valid = validation.validateFoodDraft({
  nameZh: '测试食品', nameEn: 'Test food', category: 'mixed', servingLabel: '1份', servingGrams: 100,
  nutrientsPer100g: { energyKcal: 120, proteinG: 5, carbsG: 20, fatG: 3, fibreG: 2, sodiumMg: 100 },
});
assert.equal(valid.valid, true, '有效自定义食品应通过');
if (valid.valid) {
  assert.equal(valid.food.source.confidence, 'estimate');
  assert.equal(valid.food.nutrientsPer100g.sugarG, 0);
}

assert.ok(foods.length >= 4000, '导入后的随包目录应包含 FSANZ 与 USDA 对照');
assert.ok(foodsById['ausnut-29101001'], '应包含 AUSNUT 官方条目');
assert.ok(foods.some((food) => food.source.dataset === 'fsanz-afcd'), '应包含 AFCD 补充条目');
assert.ok(foods.some((food) => food.source.dataset === 'usda-fdc'), '应包含 USDA 海外对照');
assert.ok(foodsById['ausnut-29101001'].nutrientsPer100g.fibreG < 5, '啤酒纤维不应被能量列误映射');
assert.ok(catalog.searchCatalog({}).length < 200, '空白搜索只应返回常用食物');
assert.ok(catalog.searchCatalog({ officialOnly: true }).length <= 80, '官方库搜索应分页');
assert.ok(catalog.searchCatalog({ query: 'milk' }).some((food) => food.tags.includes('fsanz')), 'milk 应命中 FSANZ 条目');
assert.ok(foodsById['char-siu-rice'], '应包含叉烧饭');
assert.ok(foodsById['egg-boiled'], '应包含水煮蛋');
assert.ok(foodsById['milk-full-cream'], '应包含全脂牛奶');
assert.ok(nutrition.matchesFoodQuery(foodsById['char-siu-rice'], '叉烧'), '中文别名应可搜索');
assert.ok(foodsById['off-woolworths-milk'], '应包含 Woolworths 包装牛奶');
assert.ok(foodsById['off-coles-milk'], '应包含 Coles 包装牛奶');
assert.ok(nutrition.matchesFoodQuery(foodsById['off-weet-bix'], '9300652010794'), '条码应可搜索');
assert.ok(nutrition.matchesFoodQuery(foodsById['off-coles-almond-butter'], 'coles'), '超市品牌应可搜索');
assert.ok(nutrition.matchesFoodQuery(foodsById['off-woolworths-milk'], 'woolies'), 'Woolies 别称应可搜索');
assert.ok(!nutrition.matchesFoodQuery(foodsById['off-woolworths-milk'], 'coles'), 'Woolworths 自有品牌不应被 Coles 关键词命中');
assert.ok(nutrition.matchesFoodQuery(foodsById['off-weet-bix'], '超市'), '超市关键词应命中包装食品');
assert.ok(foods.filter((food) => food.tags.includes('supermarket')).length >= 15, '应包含一小批超市包装食品');

const groups = await import('../src/domain/catalog-groups.ts');
assert.equal(groups.sameCatalogItem(foodsById['egg-boiled'], foodsById['ausnut-17101003']), true, '水煮蛋应与澳洲官方硬煮蛋合并');
assert.equal(groups.sameCatalogItem(foodsById['egg-boiled'], foods.find((food) => /wheat with egg, boiled/i.test(food.nameEn))), false, '水煮蛋不得与蛋面合并');
assert.equal(groups.sameCatalogItem(foodsById['milk-full-cream'], foodsById['ausnut-19101002']), true, '全脂牛奶应与澳洲官方常规脂肪牛奶合并');
assert.ok(!groups.sameCatalogItem(foodsById['milk-full-cream'], foods.find((food) => /coconut, milk/i.test(food.nameEn))), '全脂牛奶不得与椰奶合并');
assert.ok(!foods.some((food) => food.id.startsWith('ausnut-') && food.nameZh === '低脂牛奶' && /coconut/i.test(food.nameEn)), '椰奶不得继承低脂牛奶中文名');
assert.ok(!foods.some((food) => /wheat with egg, boiled/i.test(food.nameEn) && food.nameZh === '水煮蛋'), '蛋面不得继承水煮蛋中文名');

const eggHits = catalog.searchCatalog({ query: '水煮蛋' });
assert.ok(eggHits.some((food) => food.id === 'egg-boiled' || food.alternateSources?.some((item) => item.foodId === 'egg-boiled')), '水煮蛋搜索应覆盖家常条目');
assert.equal(eggHits.filter((food) => food.id === 'egg-boiled' || food.alternateSources?.some((item) => item.foodId === 'egg-boiled')).length, 1, '水煮蛋同类来源应合并为一条');
assert.equal(eggHits[0].source.confidence, 'high', '水煮蛋预览应优先最高可信度');
assert.ok((eggHits[0].alternateSources?.length ?? 0) >= 1, '点进前预览应能看出有多个来源');

const weetHits = catalog.searchCatalog({ query: 'Weet-Bix' });
assert.equal(weetHits.length, 1, 'Weet-Bix 家常与超市包装应合并');
assert.ok(weetHits[0].id === 'weet-bix' || weetHits[0].alternateSources?.some((item) => item.foodId === 'weet-bix'), 'Weet-Bix 合并后仍能回到原条目');

const milkHits = catalog.searchCatalog({ query: '全脂牛奶' });
assert.ok(milkHits[0].source.dataset === 'fsanz-ausnut' || milkHits[0].source.dataset === 'fsanz-afcd', '全脂牛奶预览应优先澳洲官方');
assert.ok(milkHits[0].alternateSources?.some((item) => item.foodId === 'off-coles-milk') || milkHits[0].id === 'off-coles-milk', '全脂牛奶详情应能看到超市包装来源');

const tomatoEggHits = catalog.searchCatalog({ query: '番茄炒蛋' });
assert.ok(tomatoEggHits.some((food) => food.id === 'tomato-egg'), '番茄炒蛋应命中家常条目');
assert.equal(foods.filter((food) => food.nameZh === '番茄炒蛋').length, 1, '官方库不得把炒菜批量标成番茄炒蛋');
assert.ok(tomatoEggHits.every((food) => food.id === 'tomato-egg' || (/tomato/i.test(food.nameEn) && /egg/i.test(food.nameEn))), '番茄炒蛋搜索不得带出鸡炒、鱼炒等无关菜');
const chickenStirFry = foods.find((food) => /stir-fry, commercial, chicken$/i.test(food.nameEn));
assert.ok(chickenStirFry, '应保留澳洲商业鸡炒条目');
assert.notEqual(chickenStirFry.nameZh, '番茄炒蛋', '鸡炒不得借用番茄炒蛋中文名');
assert.ok(!nutrition.matchesFoodQuery(chickenStirFry, '番茄炒蛋'), '鸡炒不应被番茄炒蛋关键词命中');

assert.ok(nutrition.matchesFoodQuery(tomatoEgg, '西红柿鸡蛋'), '同义词西红柿鸡蛋应命中番茄炒蛋');
assert.ok(nutrition.matchesFoodQuery(tomatoEgg, '鸡蛋西红柿'), '食材顺序不同仍应命中番茄炒蛋');
assert.ok(!nutrition.matchesFoodQuery(chickenStirFry, '西红柿鸡蛋'), '鸡炒不应被西红柿鸡蛋命中');
const tomatoAliasHits = catalog.searchCatalog({ query: '西红柿鸡蛋' });
assert.ok(tomatoAliasHits.some((food) => food.id === 'tomato-egg'), '西红柿鸡蛋应搜到番茄炒蛋');
assert.equal(tomatoAliasHits[0].id, 'tomato-egg', '西红柿鸡蛋应优先返回番茄炒蛋');
assert.ok(tomatoAliasHits.every((food) => food.id === 'tomato-egg' || (/tomato/i.test(food.nameEn) && /egg/i.test(food.nameEn))), '同义词搜索不得带出鸡炒等无关菜');

const tomatoEstimate = nutrition.compositionEstimate(tomatoEgg, foodsById);
assert.ok(tomatoEstimate, '番茄炒蛋应有按食材估算');
assert.ok(tomatoEstimate.ingredients.some((item) => item.foodId === 'tomato-raw'), '番茄炒蛋构成应含番茄');
assert.ok(tomatoEstimate.ingredients.some((item) => item.foodId === 'egg-boiled'), '番茄炒蛋构成应含蛋');
assert.ok(tomatoEstimate.oilGrams >= 8, '番茄炒蛋构成应含用油');
assert.equal(tomatoEstimate.yieldGrams, 250, '番茄炒蛋出锅重量应与家常份一致');
assert.ok(tomatoEstimate.wholeDish.energyKcal > 180 && tomatoEstimate.wholeDish.energyKcal < 400, '按食材估算能量应落在家常份合理范围');
assert.ok(tomatoEstimate.wholeDish.fatG > 8, '按食材估算应计入用油脂肪');

const compositions = await import('../src/data/dish-compositions.ts');
const compositionIds = Object.keys(compositions.dishCompositions);
assert.ok(compositionIds.length >= 20, '应收录一批高频复合菜构成');
for (const [id, composition] of Object.entries(compositions.dishCompositions)) {
  assert.ok(foodsById[id], `复合菜 ${id} 应存在于目录`);
  assert.ok(foodsById[id].composition, `复合菜 ${id} 应挂上构成`);
  for (const ingredient of composition.ingredients) {
    assert.ok(foodsById[ingredient.foodId], `${id} 的食材 ${ingredient.foodId} 应存在于目录`);
    assert.notEqual(ingredient.foodId, id, `${id} 构成不得自引用`);
  }
  const estimate = nutrition.compositionEstimate(foodsById[id], foodsById);
  assert.ok(estimate && estimate.wholeDish.energyKcal > 0, `${id} 应能按食材估算`);
}

assert.ok(recipes.starterRecipes.every((recipe) => recipe.items.length >= 2), '套餐应包含不止一道菜');
assert.ok(!('composition' in recipes.starterRecipes[0]), '套餐不是单道复合菜');
assert.ok(catalog.searchCatalog({ source: 'official' }).length <= 80, '来源筛选澳洲官方应分页');
assert.ok(catalog.searchCatalog({ source: 'common' }).length < 200, '常用来源空白搜索只返回常用食物');
const bokChoyNamed = foods.filter((food) => food.nameZh === '清炒小白菜');
assert.ok(bokChoyNamed.length >= 1 && bokChoyNamed.length <= 8, '清炒小白菜应只覆盖小白菜/bok choy');
assert.ok(bokChoyNamed.every((food) => food.id === 'bok-choy-stir-fry' || /bok choy|pak choy/i.test(food.nameEn)), '清炒小白菜不得套到普通蔬菜炒菜');
assert.equal(nutrition.catalogStatus('apple', ['apple'], []), 'logged');
assert.equal(nutrition.catalogStatus('apple', ['apple'], ['apple']), 'verified');
assert.equal(nutrition.catalogStatus('banana', ['apple'], []), 'unseen');

assert.deepEqual(validation.validateFoodCatalog(foods), [], '开发食品目录应通过基础质量检查');

console.log('Domain checks passed: nutrition math, shared meals, recipes vs foods, sources, and catalog quality.');
