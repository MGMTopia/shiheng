import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, Screen, SectionTitle } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useFoodRepository } from '@/data/food-repository-context';
import { mergedRecipes } from '@/data/recipes';
import { compositionEstimate, formatEnergyPair, mealItemNames, nutrientsForServing, recipeEnergyPerServe } from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';

export default function RecipesScreen() {
  const { recipes, customFoods, hydrated } = useNutrition();
  const foods = useFoodRepository();
  if (!hydrated) return <LoadingScreen />;
  const meals = mergedRecipes(recipes);
  const compositeDishes = foods.listCompositeDishes(customFoods);
  const foodIndex = foods.getByIds([
    ...meals.flatMap((recipe) => recipe.items.map((item) => item.foodId)),
    ...compositeDishes.flatMap((food) => [food.id, ...(food.composition?.ingredients.map((item) => item.foodId) ?? [])]),
  ], customFoods);

  return <Screen>
    <View><Text style={styles.title}>家庭菜谱</Text><Text style={styles.subtitle}>套餐是一整餐；单道复合菜可查看食材、用油和出锅重量。</Text></View>

    <SectionTitle>推荐套餐</SectionTitle>
    {meals.map((recipe) => {
      const names = mealItemNames(recipe.items.map((item) => ({ id: item.foodId, foodId: item.foodId, servings: item.servings, meal: 'dinner', recordedAt: '' })), foodIndex);
      return <Pressable key={recipe.id} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })} style={styles.card}>
        <View style={styles.badge}><Text style={styles.badgeText}>{recipe.id.startsWith('household-') ? '我家的菜谱' : '推荐套餐'}</Text></View>
        <Text style={styles.name}>{recipe.nameZh}</Text>
        <Text style={styles.meta}>{names}</Text>
        <View style={styles.footer}>
          <Text style={styles.energy}>{formatEnergyPair(recipeEnergyPerServe(recipe, foodIndex))}/份</Text>
          <Text style={styles.count}>{recipe.prepMinutes ? `${recipe.prepMinutes} 分钟 · ` : ''}已记 {recipe.loggedCount} 次</Text>
        </View>
      </Pressable>;
    })}

    <SectionTitle>家常复合菜</SectionTitle>
    {compositeDishes.map((food) => {
      const estimate = compositionEstimate(food, foodIndex);
      return <Pressable key={food.id} onPress={() => router.push({ pathname: '/food/[id]', params: { id: food.id } })} style={styles.card}>
        <View style={styles.badge}><Text style={styles.badgeText}>单道</Text></View>
        <Text style={styles.name}>{food.nameZh}</Text>
        <Text style={styles.meta}>{estimate ? estimate.ingredients.map((item) => item.nameZh).join('、') : food.nameEn}</Text>
        <View style={styles.footer}>
          <Text style={styles.energy}>{formatEnergyPair(estimate ? estimate.wholeDish.energyKcal : nutrientsForServing(food).energyKcal)}/份</Text>
          <Text style={styles.count}>{food.servingLabel}{estimate?.oilGrams ? ` · 油 ${estimate.oilGrams}g` : ''}</Text>
        </View>
      </Pressable>;
    })}
    <Card><Text style={styles.hint}>在日志里把今天某餐点「存成家庭菜谱」，就会出现在套餐里。不会发到社区，只留在本机。</Text></Card>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, gap: 6 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.brandSoft, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: colors.brandDark, fontSize: 11, fontWeight: '800' },
  name: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  meta: { color: colors.inkMuted, fontSize: 13, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginTop: 4 },
  energy: { color: colors.brandDark, fontSize: 12, fontWeight: '700', flex: 1 },
  count: { color: colors.inkMuted, fontSize: 12 },
  hint: { color: colors.inkMuted, fontSize: 13, lineHeight: 20 },
});
