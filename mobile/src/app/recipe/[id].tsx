import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton, Screen, SourceBadge } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { createFoodIndex } from '@/data/catalog';
import { findRecipe, starterRecipes } from '@/data/recipes';
import {
  defaultPortionShare, displayFoodName, displaySourceLabel, formatEnergyPair, formatNumber, mealItemNames, mealLabels, oilLevelLabels,
  portionChoices, recipeEnergyPerServe, suggestedMealSlot, totalForEntries,
} from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import type { FoodLogEntry, MealType } from '@/types/nutrition';

const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function generateStaticParams() {
  return starterRecipes.map((recipe) => ({ id: recipe.id }));
}

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, customFoods, logRecipe } = useNutrition();
  const recipe = findRecipe(id, recipes);
  const foodIndex = createFoodIndex(customFoods);
  const [meal, setMeal] = useState<MealType>(() => suggestedMealSlot());
  const [sharedWith, setSharedWith] = useState(1);
  const [portionShare, setPortionShare] = useState(1);

  const previewEntries = useMemo<FoodLogEntry[]>(() => recipe ? recipe.items.map((item) => ({
    id: item.foodId, foodId: item.foodId, servings: item.servings, meal, recordedAt: '', oilLevel: item.oilLevel, sharedWith, portionShare,
  })) : [], [meal, portionShare, recipe, sharedWith]);
  const nutrients = totalForEntries(previewEntries, foodIndex);

  if (!recipe) return <Screen><Card><Text style={styles.notFound}>找不到这套家庭菜谱。</Text></Card></Screen>;

  const changePeople = (next: number) => {
    const people = Math.min(8, Math.max(1, next));
    setSharedWith(people);
    setPortionShare(defaultPortionShare(people));
  };

  return <Screen>
    <View style={styles.heading}>
      <View style={styles.titleRow}><Text style={styles.title}>{recipe.nameZh}</Text><SourceBadge confidence={recipe.source.confidence} /></View>
      <Text style={styles.subtitle}>{recipe.nameEn} · 家庭菜谱，不是自定义单品</Text>
    </View>
    <Card style={styles.sourceCard}>
      <Text style={styles.sourceLabel}>数据来源</Text>
      <Text style={styles.sourceText}>{displaySourceLabel(recipe.source)}</Text>
      <Text style={styles.meta}>{recipe.prepMinutes ? `${recipe.prepMinutes} 分钟 · ` : ''}已记录 {recipe.loggedCount} 次 · 置信度：估算</Text>
    </Card>
    <Card>
      {recipe.items.map((item) => {
        const food = foodIndex[item.foodId];
        if (!food) return null;
        return <View key={`${item.foodId}-${item.servings}`} style={styles.itemRow}>
          <View style={styles.itemMain}><Text style={styles.itemName}>{displayFoodName(food)}</Text><Text style={styles.itemMeta}>{food.servingLabel} × {item.servings}{item.oilLevel ? ` · ${oilLevelLabels[item.oilLevel]}` : ''}</Text></View>
        </View>;
      })}
    </Card>

    <View style={styles.section}><Text style={styles.sectionLabel}>合菜分食</Text><Card style={styles.shareCard}>
      <View style={styles.servingCard}>
        <View style={styles.servingCopy}><Text style={styles.servingName}>几个人吃</Text></View>
        <View style={styles.stepper}><Pressable onPress={() => changePeople(sharedWith - 1)} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.servingValue}>{sharedWith}</Text><Pressable onPress={() => changePeople(sharedWith + 1)} style={styles.stepButton}><Text style={styles.stepText}>＋</Text></Pressable></View>
      </View>
      <Text style={styles.shareHint}>默认按人数均分，也可改成你实际吃到的份额。</Text>
      <Text style={styles.shareHint}>我吃了大约</Text>
      <View style={styles.portionGrid}>{portionChoices.map((choice) => <Pressable key={choice.label} onPress={() => setPortionShare(choice.value)} style={[styles.portionChip, Math.abs(portionShare - choice.value) < 0.02 && styles.chipActive]}><Text style={[styles.chipText, Math.abs(portionShare - choice.value) < 0.02 && styles.chipTextActive]}>{choice.label}</Text></Pressable>)}</View>
    </Card></View>

    <View style={styles.section}><Text style={styles.sectionLabel}>记录到</Text><View style={styles.meals}>{meals.map((item) => <Pressable key={item} onPress={() => setMeal(item)} style={[styles.meal, meal === item && styles.mealActive]}><Text style={[styles.mealText, meal === item && styles.mealTextActive]}>{mealLabels[item]}</Text></Pressable>)}</View></View>

    <Card>
      <Text style={styles.sectionLabel}>我的份额估算</Text>
      <Text style={styles.meta}>{mealItemNames(previewEntries, foodIndex)}</Text>
      <Text style={styles.energy}>{formatEnergyPair(nutrients.energyKcal)}</Text>
      <Text style={styles.meta}>蛋白质 {formatNumber(nutrients.proteinG, 1)}g · 脂肪 {formatNumber(nutrients.fatG, 1)}g · 钠 {formatNumber(nutrients.sodiumMg)}mg</Text>
      <Text style={styles.meta}>整盘参考 {formatEnergyPair(recipeEnergyPerServe(recipe, foodIndex))}，以上已按你的份额折算。</Text>
    </Card>
    <PrimaryButton label={`整餐加入${mealLabels[meal]}`} onPress={() => { logRecipe(recipe.id, meal, sharedWith, portionShare); router.replace('/(tabs)'); }} />
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { gap: 5 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 14 },
  sourceCard: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8', gap: 6 }, sourceLabel: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  sourceText: { color: colors.ink, fontSize: 13, lineHeight: 20 }, meta: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  itemRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  itemMain: { gap: 3 }, itemName: { color: colors.ink, fontSize: 15, fontWeight: '700' }, itemMeta: { color: colors.inkMuted, fontSize: 12 },
  section: { gap: spacing.sm }, sectionLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  servingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  shareCard: { gap: spacing.md },
  servingCopy: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  servingName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 0 },
  stepButton: { width: 38, height: 38, borderRadius: radii.pill, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.brand, fontSize: 20, fontWeight: '700' }, servingValue: { minWidth: 28, color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  shareHint: { color: colors.inkMuted, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  portionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  portionChip: { width: '31%', paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand }, chipText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' }, chipTextActive: { color: colors.white },
  meals: { flexDirection: 'row', gap: spacing.sm }, meal: { flex: 1, paddingVertical: 11, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  mealActive: { backgroundColor: colors.brand, borderColor: colors.brand }, mealText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' }, mealTextActive: { color: colors.white },
  energy: { color: colors.ink, fontSize: 20, fontWeight: '800', marginTop: spacing.sm }, notFound: { color: colors.red, fontSize: 14, textAlign: 'center' },
});
