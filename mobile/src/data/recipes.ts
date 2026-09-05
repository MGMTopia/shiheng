import type { Recipe } from '@/types/nutrition';

const UPDATED = '2026-09-04';
const householdSource = {
  type: 'recipe' as const,
  label: '食衡家常套餐模板，油量和份量仍为估算',
  region: 'AU/CN' as const,
  confidence: 'estimate' as const,
  updatedAt: UPDATED,
  dataset: 'recipe-estimate' as const,
};

export const starterRecipes: Recipe[] = [
  {
    id: 'recipe-home-dinner',
    nameZh: '家常晚饭',
    nameEn: 'Home-style dinner',
    items: [
      { foodId: 'tomato-egg', servings: 1, oilLevel: 'normal' },
      { foodId: 'white-rice-cooked', servings: 1 },
      { foodId: 'bok-choy-stir-fry', servings: 1, oilLevel: 'light' },
    ],
    prepMinutes: 20,
    createdAt: `${UPDATED}T00:00:00.000Z`,
    loggedCount: 0,
    source: householdSource,
    kind: 'household',
  },
  {
    id: 'recipe-congee-breakfast',
    nameZh: '粥小菜',
    nameEn: 'Congee breakfast',
    items: [
      { foodId: 'congee-plain', servings: 1 },
      { foodId: 'egg-boiled', servings: 1 },
      { foodId: 'cucumber', servings: 0.5 },
    ],
    prepMinutes: 10,
    createdAt: `${UPDATED}T00:00:00.000Z`,
    loggedCount: 0,
    source: householdSource,
    kind: 'household',
  },
  {
    id: 'recipe-braised-pork-dinner',
    nameZh: '红烧肉晚饭',
    nameEn: 'Red-braised pork dinner',
    items: [
      { foodId: 'red-braised-pork', servings: 1, oilLevel: 'normal' },
      { foodId: 'white-rice-cooked', servings: 1 },
      { foodId: 'garlic-broccoli', servings: 1, oilLevel: 'light' },
    ],
    prepMinutes: 35,
    createdAt: `${UPDATED}T00:00:00.000Z`,
    loggedCount: 0,
    source: householdSource,
    kind: 'household',
  },
  {
    id: 'recipe-mapo-dinner',
    nameZh: '麻婆豆腐晚饭',
    nameEn: 'Mapo tofu dinner',
    items: [
      { foodId: 'mapo-tofu', servings: 1, oilLevel: 'normal' },
      { foodId: 'white-rice-cooked', servings: 1 },
      { foodId: 'bok-choy-stir-fry', servings: 1, oilLevel: 'light' },
    ],
    prepMinutes: 25,
    createdAt: `${UPDATED}T00:00:00.000Z`,
    loggedCount: 0,
    source: householdSource,
    kind: 'household',
  },
  {
    id: 'recipe-dumpling-dinner',
    nameZh: '水饺晚饭',
    nameEn: 'Dumpling dinner',
    items: [
      { foodId: 'dumplings-boiled', servings: 1 },
      { foodId: 'garlic-broccoli', servings: 1, oilLevel: 'light' },
    ],
    prepMinutes: 20,
    createdAt: `${UPDATED}T00:00:00.000Z`,
    loggedCount: 0,
    source: householdSource,
    kind: 'household',
  },
];

export const starterRecipesById = Object.fromEntries(starterRecipes.map((recipe) => [recipe.id, recipe])) as Record<string, Recipe>;

export function mergedRecipes(userRecipes: Recipe[] = []): Recipe[] {
  const overrides = new Set(userRecipes.map((recipe) => recipe.id));
  return [...userRecipes, ...starterRecipes.filter((recipe) => !overrides.has(recipe.id))];
}

export function findRecipe(id: string, userRecipes: Recipe[] = []): Recipe | undefined {
  return mergedRecipes(userRecipes).find((recipe) => recipe.id === id);
}
