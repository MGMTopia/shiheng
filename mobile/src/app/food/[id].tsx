import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton, Screen, SourceBadge } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { foods, foodsById } from '@/data/foods';
import { formatNumber, mealLabels, nutrientsForServing } from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import { MealType } from '@/types/nutrition';

const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function generateStaticParams() {
  return foods.map((food) => ({ id: food.id }));
}

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const food = foodsById[id];
  const { addEntry } = useNutrition();
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<MealType>(() => {
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 15) return 'lunch';
    if (hour < 21) return 'dinner';
    return 'snack';
  });
  const nutrients = useMemo(() => food ? nutrientsForServing(food, servings) : null, [food, servings]);

  if (!food || !nutrients) return <Screen><Card><Text style={styles.notFound}>找不到这条食物记录。</Text></Card></Screen>;
  const save = () => { addEntry(food.id, servings, meal); router.replace('/(tabs)'); };

  return <Screen>
    <View style={styles.heading}><View style={styles.titleRow}><Text style={styles.title}>{food.nameZh}</Text><SourceBadge confidence={food.source.confidence} /></View><Text style={styles.subtitle}>{food.nameEn}</Text></View>
    <Card style={styles.sourceCard}><View style={styles.sourceHeader}><Text style={styles.sourceLabel}>数据来源</Text><Text style={styles.region}>{food.source.region}</Text></View><Text style={styles.sourceText}>{food.source.label}</Text><Text style={styles.sourceDate}>更新：{food.source.updatedAt}</Text></Card>

    <View style={styles.section}><Text style={styles.sectionLabel}>份量</Text><Card style={styles.servingCard}>
      <View><Text style={styles.servingName}>{food.servingLabel}</Text><Text style={styles.servingGrams}>{food.servingGrams}g × {servings}</Text></View>
      <View style={styles.stepper}><Pressable onPress={() => setServings((value) => Math.max(0.5, value - 0.5))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.servingValue}>{servings}</Text><Pressable onPress={() => setServings((value) => Math.min(5, value + 0.5))} style={styles.stepButton}><Text style={styles.stepText}>＋</Text></Pressable></View>
    </Card></View>

    <View style={styles.section}><Text style={styles.sectionLabel}>记录到</Text><View style={styles.meals}>{meals.map((item) => <Pressable key={item} onPress={() => setMeal(item)} style={[styles.meal, meal === item && styles.mealActive]}><Text style={[styles.mealText, meal === item && styles.mealTextActive]}>{mealLabels[item]}</Text></Pressable>)}</View></View>

    <Card><Text style={styles.sectionLabel}>本次营养估算</Text><View style={styles.nutrientGrid}>
      {[['能量', formatNumber(nutrients.energyKcal), 'kcal'], ['蛋白质', formatNumber(nutrients.proteinG, 1), 'g'], ['碳水', formatNumber(nutrients.carbsG, 1), 'g'], ['脂肪', formatNumber(nutrients.fatG, 1), 'g'], ['纤维', formatNumber(nutrients.fibreG, 1), 'g'], ['钠', formatNumber(nutrients.sodiumMg), 'mg']].map(([label, value, unit]) => <View key={label} style={styles.nutrient}><Text style={styles.nutrientLabel}>{label}</Text><Text style={styles.nutrientValue}>{value}<Text style={styles.nutrientUnit}> {unit}</Text></Text></View>)}
    </View></Card>
    {food.source.confidence === 'estimate' && <Text style={styles.estimateNote}>复合菜肴会受份量、用油和酱汁影响；后续版本将增加快速确认步骤。</Text>}
    <PrimaryButton label={`添加到${mealLabels[meal]}`} onPress={save} />
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { gap: 5 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }, title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 14 },
  sourceCard: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' }, sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }, sourceLabel: { color: colors.brandDark, fontSize: 12, fontWeight: '800' },
  region: { color: colors.brand, fontSize: 11, fontWeight: '800' }, sourceText: { color: colors.ink, fontSize: 13, lineHeight: 20 }, sourceDate: { color: colors.inkMuted, fontSize: 10, marginTop: spacing.sm },
  section: { gap: spacing.sm }, sectionLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' }, servingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servingName: { color: colors.ink, fontSize: 16, fontWeight: '700' }, servingGrams: { color: colors.inkMuted, fontSize: 12, marginTop: 3 }, stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepButton: { width: 38, height: 38, borderRadius: radii.pill, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.brand, fontSize: 20, fontWeight: '700' }, servingValue: { minWidth: 28, color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  meals: { flexDirection: 'row', gap: spacing.sm }, meal: { flex: 1, paddingVertical: 11, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }, mealActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  mealText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' }, mealTextActive: { color: colors.white }, nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, rowGap: spacing.lg },
  nutrient: { width: '33.333%', gap: 4 }, nutrientLabel: { color: colors.inkMuted, fontSize: 11 }, nutrientValue: { color: colors.ink, fontSize: 18, fontWeight: '800' }, nutrientUnit: { color: colors.inkMuted, fontSize: 10, fontWeight: '500' },
  estimateNote: { color: colors.amber, fontSize: 12, lineHeight: 19, backgroundColor: colors.amberSoft, padding: spacing.md, borderRadius: radii.sm }, notFound: { color: colors.red, fontSize: 14, textAlign: 'center' },
});
