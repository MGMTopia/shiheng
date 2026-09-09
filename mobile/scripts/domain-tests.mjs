import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
closeTo(nutrition.foodGroupServes([{ id: 'f', foodId: 'apple', servings: 1, meal: 'snack', recordedAt: '' }], foodsById).fruitServes, 1, '苹果计入水果份');
assert.deepEqual(nutrition.frequentFoodIds([
  { id: '1', foodId: 'apple', servings: 1, meal: 'snack', recordedAt: '' },
  { id: '2', foodId: 'apple', servings: 1, meal: 'snack', recordedAt: '' },
  { id: '3', foodId: 'banana', servings: 1, meal: 'snack', recordedAt: '' },
], 1), ['apple']);
assert.equal(nutrition.servingMassUnit(foodsById['black-coffee']), 'ml');
assert.equal(nutrition.servingsFromMass(foodsById.apple, 360), 2);
assert.match(nutrition.nextMealSuggestion({ ...nutrition.emptyNutrients(), fibreG: 20, proteinG: 60 }, targets, { vegetableServes: 5, grainServes: 2, proteinServes: 2, fruitServes: 0 }), /水果/);

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
  assert.equal(valid.food.nutrientsPer100g.sugarG, null);
}

assert.ok(foods.length >= 4000, '导入后的随包目录应包含 FSANZ 与 USDA 对照');
assert.ok(foodsById['ausnut-29101001'], '应包含 AUSNUT 官方条目');
assert.ok(foods.some((food) => food.source.dataset === 'fsanz-afcd'), '应包含 AFCD 补充条目');
assert.ok(foods.some((food) => food.source.dataset === 'usda-fdc'), '应包含 USDA 海外对照');
assert.ok(foods.filter((food) => food.tags.includes('overseas')).length >= 800, 'USDA 对照应包含 Foundation、SR Legacy 与筛选后的 FNDDS');
assert.ok(foods.some((food) => food.tags.includes('usda-sr-legacy')), '应包含 USDA SR Legacy');
assert.ok(foods.some((food) => food.tags.includes('usda-fndds')), '应包含筛选后的 USDA FNDDS');
assert.ok(foodsById['ausnut-29101001'].nutrientsPer100g.fibreG < 5, '啤酒纤维不应被能量列误映射');
assert.ok(catalog.searchCatalog({}).length < 200, '空白搜索只应返回常用食物');
assert.ok(catalog.searchCatalog({ officialOnly: true }).length <= 30, '官方库搜索应分页');
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
assert.ok(catalog.searchCatalog({ query: '酱油' }).some((food) => food.id === 'soy-sauce' || food.alternateSources?.some((item) => item.foodId === 'soy-sauce')), '酱油应能搜到生抽');
assert.ok(catalog.searchCatalog({ query: '方便面' }).some((food) => food.id === 'instant-noodles-cooked' || food.alternateSources?.some((item) => item.foodId === 'instant-noodles-cooked')), '方便面应能搜到煮熟方便面');
const weetBarcodeHits = catalog.searchCatalog({ query: '9300652010794' });
assert.ok(weetBarcodeHits[0]?.id === 'off-weet-bix' || weetBarcodeHits[0]?.alternateSources?.some((item) => item.foodId === 'off-weet-bix'), '条码应把对应包装食品排到前面');
assert.ok(foods.filter((food) => food.source.dataset === 'open-food-facts').length >= 15, '应包含超市包装食品');
assert.ok(foods.filter((food) => food.id.startsWith('off-gen-')).length >= 500, '应导入一批澳洲 Open Food Facts 包装食品');
assert.ok(!foods.some((food) => food.source.dataset === 'user-entry' && food.tags.includes('fsanz')), '用户录入不得并进官方来源标记');

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

const fuji = foods.find((food) => /apple, fuji/i.test(food.nameEn));
assert.ok(fuji, '应保留富士苹果官方条目');
assert.equal(groups.familyKey(foodsById.apple), groups.familyKey(fuji), '富士苹果应与苹果同类');
assert.equal(fuji.nameZh, '苹果', '富士苹果应显示中文名苹果');
assert.ok(catalog.foodCluster('apple').some((food) => /fuji/i.test(food.nameEn)), '苹果详情应能切换到富士苹果来源');
assert.ok(!catalog.foodCluster('apple').some((food) => /juice/i.test(food.nameEn)), '苹果汁不得并进苹果');
const appleHits = catalog.searchCatalog({ query: '苹果' });
assert.equal(appleHits.filter((food) => food.nameZh === '苹果' || food.id === 'apple' || food.alternateSources?.some((item) => item.foodId === 'apple')).length, 1, '苹果同类品种应合并为一条');
assert.equal(nutrition.displayFoodName(appleHits[0]), '苹果', '预览标题应使用中文');
assert.ok(appleHits[0].nameEn !== appleHits[0].nameZh, '预览副标题应保留英文');

const englishOnly = foods.filter((food) => food.source.dataset !== 'open-food-facts' && food.source.dataset !== 'usda-fdc' && food.nameEn.includes(',') && (!/[\u4e00-\u9fff]/.test(food.nameZh) || food.nameZh === food.nameEn));
assert.ok(englishOnly.length < 450, `官方条目应补中文名，当前纯英文 ${englishOnly.length} 条`);
for (const query of ['chicken', 'beef', 'bread', 'apple', 'milk']) {
  const untitled = catalog.searchCatalog({ query }).filter((food) => !/[\u4e00-\u9fff]/.test(food.nameZh) && food.source.dataset !== 'open-food-facts' && food.source.dataset !== 'usda-fdc');
  assert.ok(untitled.length <= 2, `${query} 搜索不应出现一堆纯英文标题，当前 ${untitled.length} 条`);
}
const chickenStir = foods.find((food) => /stir-fry, commercial, chicken$/i.test(food.nameEn));
assert.ok(/[\u4e00-\u9fff]/.test(chickenStir.nameZh), '鸡炒应有中文名');
assert.notEqual(chickenStir.nameZh, '番茄炒蛋', '鸡炒中文名不得写成番茄炒蛋');
const appleJuice = foods.find((food) => /^apple juice/i.test(food.nameEn) && food.source.dataset !== 'open-food-facts');
assert.ok(appleJuice && /苹果/.test(appleJuice.nameZh), '苹果汁应显示中文');
const custardApple = foods.find((food) => /^custard apple/i.test(food.nameEn) && food.source.dataset !== 'open-food-facts');
assert.ok(custardApple && custardApple.nameZh.includes('番荔枝'), '番荔枝不得显示成苹果');

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
assert.ok(compositionIds.length >= 80, '应收录一批高频复合菜构成');
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
assert.ok(catalog.searchCatalog({ source: 'official' }).length <= 30, '来源筛选澳洲官方应分页');
assert.ok(catalog.searchCatalog({ source: 'common' }).length < 200, '常用来源空白搜索只返回常用食物');

const { existsSync, readFileSync } = await import('node:fs');
const { DatabaseSync } = await import('node:sqlite');
const { createHash } = await import('node:crypto');
const { createSqliteFoodRepository } = await import('../src/data/sqlite-food-repository.ts');
const catalogDbPath = fileURLToPath(new URL('../assets/catalog/foods.db', import.meta.url));
assert.ok(existsSync(catalogDbPath), '应生成预计算 SQLite 目录库');
const catalogDb = new DatabaseSync(catalogDbPath, { readOnly: true });
const sqliteFoods = createSqliteFoodRepository({
  all: (sql, params = []) => {
    const statement = catalogDb.prepare(sql);
    return params.length ? statement.all(...params) : statement.all();
  },
  first: (sql, params = []) => {
    const statement = catalogDb.prepare(sql);
    return params.length ? statement.get(...params) : statement.get();
  },
});
assert.ok(sqliteFoods.search({}).length < 200, 'SQLite 空白搜索只应返回常用食物');
assert.ok(sqliteFoods.search({ officialOnly: true }).length <= 30, 'SQLite 官方库搜索应分页');
assert.ok(sqliteFoods.search({ query: 'milk' }).some((food) => food.tags.includes('fsanz')), 'SQLite milk 应命中 FSANZ 条目');
const sqliteEggHits = sqliteFoods.search({ query: '水煮蛋' });
assert.ok(sqliteEggHits.some((food) => food.id === 'egg-boiled' || food.alternateSources?.some((item) => item.foodId === 'egg-boiled')), 'SQLite 水煮蛋搜索应覆盖家常条目');
assert.equal(sqliteEggHits.filter((food) => food.id === 'egg-boiled' || food.alternateSources?.some((item) => item.foodId === 'egg-boiled')).length, 1, 'SQLite 水煮蛋同类来源应合并为一条');
assert.equal(sqliteEggHits[0].id, eggHits[0].id, 'SQLite 与内存目录的水煮蛋预览应一致');
const sqliteMilkHits = sqliteFoods.search({ query: '全脂牛奶' });
assert.ok(sqliteMilkHits[0].source.dataset === 'fsanz-ausnut' || sqliteMilkHits[0].source.dataset === 'fsanz-afcd', 'SQLite 全脂牛奶预览应优先澳洲官方');
const sqliteAppleHits = sqliteFoods.search({ query: '苹果' });
assert.equal(sqliteAppleHits.filter((food) => food.nameZh === '苹果' || food.id === 'apple' || food.alternateSources?.some((item) => item.foodId === 'apple')).length, 1, 'SQLite 苹果同类品种应合并为一条');
assert.ok(sqliteFoods.cluster('apple').some((food) => /fuji/i.test(food.nameEn)), 'SQLite 苹果详情应能切换到富士苹果来源');
assert.ok(sqliteFoods.search({ query: '酱油' }).some((food) => food.id === 'soy-sauce' || food.alternateSources?.some((item) => item.foodId === 'soy-sauce')), 'SQLite 酱油应能搜到生抽');
assert.ok(sqliteFoods.search({ query: '方便面' }).some((food) => food.id === 'instant-noodles-cooked' || food.alternateSources?.some((item) => item.foodId === 'instant-noodles-cooked')), 'SQLite 方便面应能搜到煮熟方便面');
assert.ok(sqliteFoods.search({ query: '9300652010794' })[0]?.id === 'off-weet-bix' || sqliteFoods.search({ query: '9300652010794' })[0]?.alternateSources?.some((item) => item.foodId === 'off-weet-bix'), 'SQLite 条码应优先对应包装食品');
assert.ok(sqliteFoods.getById('egg-boiled')?.nameZh, 'SQLite 应按 id 取食物');
assert.equal(sqliteFoods.getByBarcode('9300652010794')?.id, 'off-weet-bix', 'SQLite 应按条码取包装食品');
assert.ok(sqliteFoods.search({ query: '番茄炒蛋' })[0]?.id === 'tomato-egg', 'SQLite 精确中文名应优先命中家常菜');
assert.ok(sqliteFoods.search({ query: 'milk', source: 'supermarket' }).length > 0, 'SQLite 超市筛选应在候选阶段生效');
assert.ok(sqliteFoods.search({ query: 'milk', source: 'supermarket' }).every((food) => food.tags.includes('supermarket') || (food.alternateSources?.length ?? 0) > 0), '超市筛选结果应是包装或同类来源');
assert.ok(sqliteFoods.listCompositeDishes().some((food) => food.id === 'tomato-egg'), 'SQLite 应列出复合菜');
assert.ok(sqliteFoods.listCompositeDishes().some((food) => food.id === 'prawn-fried-rice'), 'SQLite 应包含新增家常菜');

const customMilk = {
  ...foodsById['milk-full-cream'],
  id: 'custom-test-milk',
  nameZh: '我手抄的牛奶',
  custom: true,
  tags: ['custom'],
  source: { ...foodsById['milk-full-cream'].source, dataset: 'user-entry', confidence: 'estimate', type: 'label', label: '用户录入' },
};
for (const id of ['milk-full-cream', 'apple', 'egg-boiled']) {
  const members = sqliteFoods.cluster(id, [customMilk]);
  assert.ok(members.some((food) => food.id === id), `有自定义食品时 ${id} 官方聚类仍应包含自身`);
  assert.ok(members.filter((food) => food.tags.includes('fsanz') || food.id === id).length >= 1, `有自定义食品时 ${id} 应保留官方条目`);
}
assert.ok(sqliteFoods.cluster('milk-full-cream', [customMilk]).some((food) => food.id === 'custom-test-milk' || food.id === 'milk-full-cream'), '自定义牛奶只应作为额外来源');
const appleCluster = sqliteFoods.cluster('apple', [customMilk]);
assert.ok(appleCluster.every((food) => food.id !== 'custom-test-milk') || appleCluster.some((food) => food.id === 'apple'), '不相关自定义食品不得挤掉苹果官方条目');
assert.ok(appleCluster.some((food) => food.id === 'apple'), '苹果官方条目必须保留');
assert.ok(!appleCluster.some((food) => food.id === 'custom-test-milk'), '不相关自定义食品不得并进苹果');
assert.ok(catalog.foodCluster('milk-full-cream', [customMilk]).some((food) => food.id === 'milk-full-cream'), '内存目录在有自定义食品时仍应保留官方牛奶');
assert.ok(catalog.foodCluster('egg-boiled', [customMilk]).some((food) => food.id === 'egg-boiled'), '内存目录在有自定义食品时仍应保留官方鸡蛋');

const bulkUserMilk = {
  ...foodsById['milk-full-cream'],
  id: 'user-bulk-milk',
  barcode: '11111111111119',
  tags: ['custom', 'user-label'],
  source: { ...foodsById['milk-full-cream'].source, dataset: 'user-entry', type: 'label', label: '用户录入', confidence: 'estimate' },
};
const withUserLabel = [...foods, bulkUserMilk];
const userLabelIndex = groups.buildClusterIndex(withUserLabel);
assert.ok(!groups.clusterMembers(withUserLabel, userLabelIndex, 'milk-full-cream').some((food) => food.id === 'user-bulk-milk'), '用户批量标签不得自动并进官方牛奶');
assert.ok(groups.clusterMembers(withUserLabel, userLabelIndex, 'user-bulk-milk').every((food) => food.id === 'user-bulk-milk' || food.source.dataset === 'user-entry'), '用户批量标签应保持独立来源');
// catalogDb stays open for food-pack merge tests below

const bokChoyNamed = foods.filter((food) => food.nameZh === '清炒小白菜');
assert.ok(bokChoyNamed.length >= 1 && bokChoyNamed.length <= 8, '清炒小白菜应只覆盖小白菜/bok choy');
assert.ok(bokChoyNamed.every((food) => food.id === 'bok-choy-stir-fry' || /bok choy|pak choy/i.test(food.nameEn)), '清炒小白菜不得套到普通蔬菜炒菜');
assert.equal(nutrition.catalogStatus('apple', ['apple'], []), 'logged');
assert.equal(nutrition.catalogStatus('apple', ['apple'], ['apple']), 'verified');
assert.equal(nutrition.catalogStatus('banana', ['apple'], []), 'unseen');

assert.deepEqual(validation.validateFoodCatalog(foods), [], '开发食品目录应通过基础质量检查');

const persist = await import('../src/domain/persisted-state.ts');
assert.equal(persist.parsePersistedState(null).snapshot.entries.length, 0, '空存储应得到默认快照');
assert.equal(persist.parsePersistedState(null).status, 'empty', '没有历史数据应标记为空');
assert.equal(persist.parsePersistedState(null).writable, true, '首次使用允许写入');
assert.equal(persist.parsePersistedState('{').error, 'invalid-json', '损坏 JSON 应标记恢复');
assert.equal(persist.parsePersistedState('{').writable, false, '读取失败时不得写入空状态');
assert.equal(persist.parsePersistedState('[]').error, 'not-object', '非对象 JSON 应标记恢复');
assert.equal(persist.parsePersistedState('[]').writable, false, '非对象 JSON 不得覆盖原存储');

const legacy = persist.parsePersistedState(JSON.stringify({
  entries: [
    { id: 'ok', foodId: 'apple', servings: 1, meal: 'lunch', recordedAt: '2026-09-06T00:00:00.000Z' },
    { id: 'bad', foodId: 'apple', servings: '1', meal: 'lunch' },
  ],
  profile: { firstName: ' 李 ', energyUnit: 'kcal', targets: { energyKcal: 1800 } },
  favouriteFoodIds: ['apple', '', 3],
}));
assert.equal(legacy.migratedFrom, 0, '缺版本号应按 v0 迁移');
assert.equal(legacy.snapshot.stateVersion, persist.STATE_VERSION, '恢复后应写成当前版本');
assert.equal(legacy.snapshot.entries.length, 1, '无效日记条目应丢弃');
assert.equal(legacy.dropped.entries, 1, '应记录丢弃的日记条数');
assert.equal(legacy.snapshot.profile.firstName, '李', '资料应清洗空白');
assert.equal(legacy.snapshot.profile.energyUnit, 'kcal', '旧资料能量单位应保留');
assert.equal(legacy.snapshot.profile.targets.vegetableServes, 5, '缺份数目标应补默认值');
assert.deepEqual(legacy.snapshot.favouriteFoodIds, ['apple'], '无效收藏 id 应丢弃');
assert.equal(legacy.dropped.ids, 2, '应记录丢弃的 id 数量');

const current = persist.parsePersistedState(persist.serializePersistedState(legacy.snapshot));
assert.equal(current.migratedFrom, persist.STATE_VERSION, '当前版本再读不应当旧数据迁移');
assert.equal(current.snapshot.entries[0].foodId, 'apple');

let released;
const gate = new Promise((resolve) => { released = resolve; });
let startedFirst;
const started = new Promise((resolve) => { startedFirst = resolve; });
const writes = [];
const writer = persist.createSerialWriter(async (value) => {
  if (value === 'one') {
    startedFirst();
    await gate;
  }
  writes.push(value);
  if (value === 'fail') throw new Error('disk full');
});
const firstWrite = writer.enqueue('one');
await started;
void writer.enqueue('two');
const lastWrite = writer.enqueue('three');
released();
await lastWrite;
await firstWrite;
assert.deepEqual(writes, ['one', 'three'], '连续写入应串行且只保留最新快照');

await assert.rejects(() => writer.enqueue('fail'), /disk full/, '写入失败应暴露给调用方');
await writer.enqueue('recovered');
assert.equal(writes.at(-1), 'recovered', '失败后队列应能继续写入');

const split = persist.parseSplitPersistedState({
  diary: persist.serializePersistedSlices(legacy.snapshot).diary,
  profile: persist.serializePersistedSlices(legacy.snapshot).profile,
  personalFoods: persist.serializePersistedSlices(legacy.snapshot).personalFoods,
  recipes: persist.serializePersistedSlices(legacy.snapshot).recipes,
});
assert.equal(split.snapshot.entries[0].foodId, 'apple', '拆分存储应能读回日记');
assert.equal(split.snapshot.profile.firstName, '李', '拆分存储应能读回资料');
assert.deepEqual(split.snapshot.favouriteFoodIds, ['apple'], '拆分存储应能读回收藏');
assert.equal(persist.parseSplitPersistedState({
  legacy: persist.serializePersistedState(legacy.snapshot),
}).snapshot.entries[0].foodId, 'apple', '没有拆分键时应回退到旧单键');
assert.equal(persist.parseSplitPersistedState({ diary: '{' }).writable, false, '拆分键损坏时不得覆盖');

const backup = await import('../src/domain/backup.ts');
const exported = backup.serializeBackupFile(legacy.snapshot, '2026-09-06T00:00:00.000Z');
const inspected = backup.inspectBackup(exported);
assert.equal(inspected.ok, true, '当前快照应能做成备份');
if (inspected.ok) {
  assert.equal(inspected.snapshot.entries[0].foodId, 'apple');
  assert.match(backup.describeBackupPreview(inspected.preview), /饮食记录 1 条/);
  const csv = backup.diaryToCsv(inspected.snapshot.entries, foodsById);
  assert.match(csv, /apple/);
  assert.match(csv, /date,meal,foodId/);
}
assert.equal(backup.inspectBackup('{').ok, false, '损坏备份应被拒绝');
assert.equal(backup.inspectBackup('[]').ok, false, '非对象备份应被拒绝');

const trends = await import('../src/domain/trends.ts');
const emptyWeek = trends.periodSummary([], foodsById, targets, 7, '2026-09-06');
assert.equal(emptyWeek.loggedDays, 0, '没有记录时 7 天完整度应为 0');
assert.equal(trends.actionableAdvice(nutrition.emptyNutrients(), nutrition.emptyFoodGroups(), emptyWeek, targets, false).length, 1, '无记录时仍给一条提示');
const sodiumEntries = [];
for (let i = 0; i < 4; i++) {
  const key = nutrition.shiftDateKey('2026-09-06', -i);
  sodiumEntries.push(
    { id: `l${i}`, foodId: 'instant-noodles-cooked', servings: 2, meal: 'lunch', recordedAt: nutrition.dateKeyToRecordedAt(key) },
    { id: `d${i}`, foodId: 'soy-sauce', servings: 1, meal: 'dinner', recordedAt: nutrition.dateKeyToRecordedAt(key) },
  );
}
const saltyWeek = trends.periodSummary(sodiumEntries, foodsById, targets, 7, '2026-09-06');
assert.equal(saltyWeek.loggedDays, 4, '应统计有记录的天数');
assert.ok(saltyWeek.completeDays >= 4, '两顿正餐应算较完整');
assert.ok(saltyWeek.highSodiumDays >= 3, '应识别重复高钠天');
assert.ok(trends.actionableAdvice(nutrition.emptyNutrients(), nutrition.emptyFoodGroups(), saltyWeek, targets, false).some((item) => /钠/.test(item.title)), '应给出减少高钠食物的建议');
assert.match(trends.weekSummaryCsv(sodiumEntries, foodsById, 7, '2026-09-06'), /date,logged,complete/);

const foodPack = await import('../src/domain/food-pack.ts');
const { createMergedFoodRepository } = await import('../src/data/merged-food-repository.ts');

// --- Acceptance criteria for optional food packs (AC1–AC7) ---

// AC4: Wrong sha256 → enable rejected
assert.equal(foodPack.acceptPackEnable('abc', 'abc').ok, true, 'AC4: 相同 sha256 允许启用');
assert.equal(foodPack.acceptPackEnable('abc', 'ABC').ok, true, 'AC4: sha256 比较忽略大小写');
assert.equal(foodPack.acceptPackEnable('abc', 'def').ok, false, 'AC4: sha256 不符应拒绝启用');
assert.equal(foodPack.acceptPackEnable('abc', 'def').reason, 'sha256-mismatch');
assert.equal(foodPack.acceptPackEnable('abc', '').ok, false, 'AC4: 缺少 hash 应拒绝启用');
assert.equal(foodPack.acceptPackEnable('abc', undefined).reason, 'missing-hash');

const packManifestPath = fileURLToPath(new URL('../packs/pack-au-supermarket/manifest.json', import.meta.url));
assert.ok(existsSync(packManifestPath), '应提交 pack-au-supermarket/manifest.json');
const packManifest = foodPack.parseFoodPackManifest(readFileSync(packManifestPath, 'utf8'));
assert.ok(packManifest, 'manifest 应可解析');
assert.equal(packManifest.id, 'pack-au-supermarket');
assert.ok(packManifest.foodCount >= 500 && packManifest.foodCount <= 2000, '资料包规模应在 500–2000');
assert.ok(packManifest.sha256['foods.db'], 'manifest 应含 foods.db sha256');
assert.match(packManifest.licence, /ODbL/i);
assert.match(packManifest.attribution, /Open Food Facts/i);
assert.match(packManifest.downloadUrlPattern, /releases\/download/);

const packDbPath = fileURLToPath(new URL('../packs/pack-au-supermarket/foods.db', import.meta.url));
assert.ok(existsSync(packDbPath), '应提交 pack foods.db 产物');
const actualPackSha = createHash('sha256').update(readFileSync(packDbPath)).digest('hex');
assert.equal(actualPackSha, packManifest.sha256['foods.db'], '提交的 foods.db 应与 manifest sha256 一致');
assert.equal(foodPack.acceptPackEnable('0'.repeat(64), packManifest.sha256['foods.db']).ok, false, 'AC4: 错误 foods.db 哈希不得启用');

const packDb = new DatabaseSync(packDbPath, { readOnly: true });
const packRepo = createSqliteFoodRepository({
  all: (sql, params = []) => {
    const statement = packDb.prepare(sql);
    return params.length ? statement.all(...params) : statement.all();
  },
  first: (sql, params = []) => {
    const statement = packDb.prepare(sql);
    return params.length ? statement.get(...params) : statement.get();
  },
});
const packSample = packDb.prepare('SELECT id, json FROM foods LIMIT 1').get();
assert.match(packSample.id, /^au:gtin:\d{8,}$/, '资料包食品 id 应为 au:gtin:<barcode>');
const packFood = JSON.parse(packSample.json);
assert.ok(packFood.barcode, '资料包行应含条码');

// AC1: No pack installed → behavior unchanged vs main catalog
const mainOnly = createMergedFoodRepository(sqliteFoods, []);
assert.equal(mainOnly.getByBarcode('9300652010794')?.id, sqliteFoods.getByBarcode('9300652010794')?.id, 'AC1: 无资料包时条码查找与主库一致');
assert.equal(mainOnly.getById('egg-boiled')?.id, sqliteFoods.getById('egg-boiled')?.id, 'AC1: 无资料包时 getById 与主库一致');
assert.deepEqual(
  mainOnly.search({ query: '番茄炒蛋' }).map((food) => food.id),
  sqliteFoods.search({ query: '番茄炒蛋' }).map((food) => food.id),
  'AC1: 无资料包时搜索结果与主库一致',
);

// AC2: After install+enable, in-pack barcode resolves to pack food (scan → /food/[id])
const merged = createMergedFoodRepository(sqliteFoods, [packRepo]);
const scanHit = merged.getByBarcode(packFood.barcode);
assert.equal(scanHit?.id, packFood.id, 'AC2: 启用后资料包条码应命中资料包食品（打开详情用该 id）');
assert.equal(merged.getById(scanHit.id)?.barcode, packFood.barcode, 'AC2: 详情页按 id 可取回同一条包装食品');

// AC3: Search/scan fully offline after install (local SQLite merge only)
assert.ok(
  merged.search({ query: packFood.barcode }).some((food) => food.id === packFood.id),
  'AC3: 启用后离线条码搜索应命中资料包',
);
assert.ok(
  merged.search({ query: packFood.nameEn.slice(0, Math.min(16, packFood.nameEn.length)) }).some((food) => food.id === packFood.id)
    || merged.search({ query: packFood.barcode, source: 'supermarket' }).some((food) => food.id === packFood.id),
  'AC3: 启用后离线名称/超市筛选搜索应能命中资料包',
);
assert.equal(merged.getById('egg-boiled')?.id, 'egg-boiled', 'AC3: 启用资料包后主库仍可离线查询');

// AC7: Same barcode — custom food wins over pack
const customOverride = {
  ...packFood,
  id: packFood.id,
  nameZh: '我手抄的同条码食品',
  custom: true,
  tags: ['custom'],
  source: { ...packFood.source, dataset: 'user-entry', type: 'label', label: '用户录入', confidence: 'estimate' },
};
assert.equal(merged.getById(packFood.id, [customOverride])?.nameZh, '我手抄的同条码食品', 'AC7: 自定义同 id 覆盖资料包');
assert.equal(merged.getByBarcode(packFood.barcode, [customOverride])?.nameZh, '我手抄的同条码食品', 'AC7: 自定义同条码覆盖资料包');

// AC5: Uninstall → only main + custom for lookups; diary entries untouched
const diaryBeforeUninstall = [
  { id: 'd1', foodId: packFood.id, servings: 1, meal: 'snack', recordedAt: '2026-09-09T00:00:00.000Z' },
  { id: 'd2', foodId: 'egg-boiled', servings: 1, meal: 'breakfast', recordedAt: '2026-09-09T01:00:00.000Z' },
];
const diarySnapshot = JSON.stringify(diaryBeforeUninstall);
const afterUninstall = createMergedFoodRepository(sqliteFoods, []);
assert.equal(afterUninstall.getById(packFood.id), undefined, 'AC5: 卸载后资料包 id 不再可查');
assert.notEqual(afterUninstall.getByBarcode(packFood.barcode)?.id, packFood.id, 'AC5: 卸载后条码不再走资料包');
assert.equal(afterUninstall.getById('egg-boiled')?.id, 'egg-boiled', 'AC5: 卸载后主库仍可查');
assert.equal(afterUninstall.getById(packFood.id, [customOverride])?.nameZh, '我手抄的同条码食品', 'AC5: 卸载后自定义仍可查');
assert.equal(JSON.stringify(diaryBeforeUninstall), diarySnapshot, 'AC5: 卸载资料包不得改动日记条目数组');
assert.equal(diaryBeforeUninstall[0].foodId, packFood.id, 'AC5: 日记仍可保留已卸载资料包的 foodId 引用');

packDb.close();
catalogDb.close();

// AC6: ODbL / Open Food Facts attribution visible when pack enabled
let packState = foodPack.emptyFoodPackInstallState();
assert.deepEqual(foodPack.enabledPackAttributions(packState), [], 'AC6: 未启用时不展示署名');
packState = foodPack.upsertPackRecord(packState, {
  id: 'pack-au-supermarket',
  version: '1.0.0',
  enabled: true,
  installedAt: '2026-09-09T00:00:00.000Z',
  foodsDbSha256: actualPackSha,
  foodCount: packManifest.foodCount,
  attribution: packManifest.attribution,
  licence: packManifest.licence,
  title: packManifest.title,
});
const attrs = foodPack.enabledPackAttributions(packState);
assert.equal(attrs.length, 1, 'AC6: 启用后应展示署名');
assert.match(attrs[0].attribution, /Open Food Facts/i, 'AC6: 署名含 Open Food Facts');
assert.match(attrs[0].licence, /ODbL/i, 'AC6: 署名含 ODbL');
assert.match(attrs[0].attribution, /ODbL/i, 'AC6: 署名正文含 ODbL');
packState = foodPack.setPackEnabled(packState, 'pack-au-supermarket', false);
assert.deepEqual(foodPack.enabledPackAttributions(packState), [], 'AC6: 停用后隐藏署名');
assert.deepEqual(foodPack.enabledPackIds(packState), []);
packState = foodPack.removePackRecord(packState, 'pack-au-supermarket');
assert.equal(packState.packs.length, 0, '卸载应移除安装记录');

console.log('Domain checks passed: nutrition math, shared meals, recipes vs foods, sources, catalog quality, persistence, backup, trends, and food packs (AC1–AC7).');
