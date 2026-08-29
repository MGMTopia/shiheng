import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, PrimaryButton, Screen, SectionTitle, TextButton } from '@/components/ui';
import { NutrientProgress } from '@/components/nutrient-progress';
import { colors, spacing } from '@/constants/theme';
import { foodsById } from '@/data/foods';
import { entriesForDate, formatNumber, mealLabels, totalForEntries } from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import { MealType } from '@/types/nutrition';

const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function LogScreen() {
  const { entries, profile, hydrated, deleteEntry } = useNutrition();
  if (!hydrated) return <LoadingScreen />;
  const today = entriesForDate(entries);
  const total = totalForEntries(today);

  return <Screen>
    <View><Text style={styles.title}>今天的饮食</Text><Text style={styles.subtitle}>按餐次检查记录，也可以随时修正或移除。</Text></View>
    <Card style={styles.summary}>
      <View style={styles.energyHeader}><View><Text style={styles.summaryLabel}>总能量</Text><Text style={styles.summaryEnergy}>{formatNumber(total.energyKcal)} <Text style={styles.unit}>kcal</Text></Text></View><Text style={styles.itemCount}>{today.length} 项</Text></View>
      <NutrientProgress label="蛋白质" value={total.proteinG} target={profile.targets.proteinG} unit="g" />
      <NutrientProgress label="膳食纤维" value={total.fibreG} target={profile.targets.fibreG} unit="g" tone="blue" />
      <NutrientProgress label="钠" value={total.sodiumMg} target={profile.targets.sodiumMg} unit="mg" tone="amber" />
    </Card>

    {meals.map((meal) => {
      const mealEntries = today.filter((entry) => entry.meal === meal);
      const mealTotal = totalForEntries(mealEntries);
      return <View key={meal} style={styles.mealSection}>
        <SectionTitle action={<Text style={styles.mealEnergy}>{formatNumber(mealTotal.energyKcal)} kcal</Text>}>{mealLabels[meal]}</SectionTitle>
        <Card style={styles.mealCard}>
          {mealEntries.length === 0 ? <Text style={styles.empty}>尚未记录</Text> : mealEntries.map((entry, index) => {
            const food = foodsById[entry.foodId];
            if (!food) return null;
            return <View key={entry.id} style={[styles.entryRow, index < mealEntries.length - 1 && styles.entryBorder]}>
              <View style={styles.entryMain}><Text style={styles.entryName}>{food.nameZh}</Text><Text style={styles.entryMeta}>{food.servingLabel} × {entry.servings}</Text></View>
              <TextButton label="删除" tone="danger" onPress={() => deleteEntry(entry.id)} />
            </View>;
          })}
        </Card>
      </View>;
    })}
    <PrimaryButton label="继续添加食物" onPress={() => router.push('/(tabs)/search')} />
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5 },
  summary: { gap: spacing.lg }, energyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, summaryLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  summaryEnergy: { color: colors.ink, fontSize: 32, fontWeight: '800', marginTop: 2 }, unit: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' }, itemCount: { color: colors.brand, fontSize: 12, fontWeight: '700', backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  mealSection: { gap: spacing.sm }, mealEnergy: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' }, mealCard: { paddingVertical: 3 },
  entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }, entryBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, entryMain: { flex: 1, gap: 3 },
  entryName: { color: colors.ink, fontSize: 15, fontWeight: '700' }, entryMeta: { color: colors.inkMuted, fontSize: 12 }, empty: { color: colors.inkMuted, fontSize: 13, textAlign: 'center', paddingVertical: spacing.lg },
});
