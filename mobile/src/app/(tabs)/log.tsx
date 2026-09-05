import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, PrimaryButton, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { createFoodIndex } from '@/data/catalog';
import {
  closestPortionLabel, displayFoodName, entriesForDate, foodGroupServes, formatEnergy, formatEnergyPair, formatNumber,
  latestMealBefore, localDateKey, mealCardsForDate, mealItemNames, mealLabels, oilLevelLabels, shiftDateKey, totalForEntries,
} from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import type { MealType } from '@/types/nutrition';

const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function LogScreen() {
  const { entries, profile, customFoods, hydrated, deleteEntry, copyEntry, copyMeal, saveRecipeFromMeal } = useNutrition();
  if (!hydrated) return <LoadingScreen />;
  const todayKey = localDateKey();
  const yesterdayKey = shiftDateKey(todayKey, -1);
  const today = entriesForDate(entries, todayKey);
  const foodIndex = createFoodIndex(customFoods);
  const total = totalForEntries(today, foodIndex);
  const groups = foodGroupServes(today, foodIndex);
  const cards = mealCardsForDate(entries, todayKey);

  return <Screen>
    <View><Text style={styles.title}>今天的饮食</Text><Text style={styles.subtitle}>一餐可以包含多道菜。合菜份额和用油会算进个人摄入，而不是整盘热量。</Text></View>
    <Card style={styles.summary}>
      <View style={styles.energyHeader}><View><Text style={styles.summaryLabel}>总能量</Text><Text style={styles.summaryEnergy}>{formatEnergy(total.energyKcal, profile.energyUnit)}</Text></View><Text style={styles.itemCount}>{today.length} 项</Text></View>
      <Text style={styles.pair}>{formatEnergyPair(total.energyKcal)}</Text>
      <Text style={styles.groupLine}>蔬菜 {formatNumber(groups.vegetableServes, 1)}/{profile.targets.vegetableServes} · 主食 {formatNumber(groups.grainServes, 1)}/{profile.targets.grainServes} · 蛋白质 {formatNumber(groups.proteinServes, 1)}/{profile.targets.proteinServes} · 钠 {formatNumber(total.sodiumMg)} mg</Text>
    </Card>

    {meals.map((meal) => {
      const previous = latestMealBefore(entries, meal, todayKey);
      const mealCards = cards.filter((card) => card.meal === meal);
      const mealEntries = today.filter((entry) => entry.meal === meal);
      const mealTotal = totalForEntries(mealEntries, foodIndex);
      return <View key={meal} style={styles.mealSection}>
        <SectionTitle action={<View style={styles.mealActions}><Text style={styles.mealEnergy}>{mealEntries.length ? formatEnergy(mealTotal.energyKcal, profile.energyUnit) : ''}</Text>{mealEntries.length > 0 && <TextButton label="复制本餐" onPress={() => copyMeal(meal, todayKey)} />}</View>}>{mealLabels[meal]}</SectionTitle>
        {previous && localDateKey(new Date(previous.entries[0].recordedAt)) === yesterdayKey ? (
          <Card style={styles.yesterdayCard}>
            <Text style={styles.yesterdayTitle}>昨天：{mealItemNames(previous.entries, foodIndex)}</Text>
            <TextButton label="整餐复制到今天" onPress={() => copyMeal(meal, previous.dateKey)} />
          </Card>
        ) : null}
        <Card style={styles.mealCard}>
          {mealEntries.length === 0 ? <Text style={styles.empty}>尚未记录</Text> : mealCards.map((card, cardIndex) => (
            <View key={card.id} style={cardIndex < mealCards.length - 1 ? styles.cardBlock : undefined}>
              {card.entries.map((entry, index) => {
                const food = foodIndex[entry.foodId];
                if (!food) return null;
                const share = entry.portionShare ?? 1;
                const people = entry.sharedWith ?? 1;
                const oil = entry.oilLevel && entry.oilLevel !== 'normal' ? oilLevelLabels[entry.oilLevel] : null;
                return <View key={entry.id} style={[styles.entryRow, index < card.entries.length - 1 && styles.entryBorder]}>
                  <View style={styles.entryMain}>
                    <Text style={styles.entryName}>{displayFoodName(food)}</Text>
                    <Text style={styles.entryMeta}>
                      {food.servingLabel} × {entry.servings}
                      {people > 1 ? ` · ${people}人合菜 · 我吃了 ${closestPortionLabel(share)}` : ''}
                      {oil ? ` · ${oil}` : ''}
                    </Text>
                  </View>
                  <View style={styles.entryActions}><TextButton label="复制" onPress={() => copyEntry(entry.id)} /><TextButton label="删除" tone="danger" onPress={() => deleteEntry(entry.id)} /></View>
                </View>;
              })}
            </View>
          ))}
        </Card>
        {mealEntries.length > 0 ? <TextButton label="存成家庭菜谱" onPress={() => {
          const recipe = saveRecipeFromMeal(meal, todayKey);
          if (recipe) Alert.alert('已保存', `${recipe.nameZh} 已加入家庭菜谱，下次可以整餐复用。`);
        }} /> : null}
      </View>;
    })}
    <PrimaryButton label="继续添加食物" onPress={() => router.push('/(tabs)/search')} />
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  summary: { gap: spacing.sm }, energyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, summaryLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  summaryEnergy: { color: colors.ink, fontSize: 32, fontWeight: '800', marginTop: 2 }, pair: { color: colors.inkMuted, fontSize: 12 },
  groupLine: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  itemCount: { color: colors.brand, fontSize: 12, fontWeight: '700', backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mealSection: { gap: spacing.sm }, mealActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, mealEnergy: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' }, mealCard: { paddingVertical: 3 },
  yesterdayCard: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  yesterdayTitle: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600' },
  cardBlock: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, marginBottom: spacing.sm, paddingBottom: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }, entryBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, entryMain: { flex: 1, gap: 3 },
  entryName: { color: colors.ink, fontSize: 15, fontWeight: '700' }, entryMeta: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 }, entryActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, empty: { color: colors.inkMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg },
});
