import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandMarkTile } from '@/components/brand-mark';
import { RingStat } from '@/components/ring-stat';
import { Card, LoadingScreen, PrimaryButton, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { createFoodIndex } from '@/data/catalog';
import {
  closestPortionLabel, displayFoodName, entriesForDate, foodGroupServes, formatEnergy, formatNumber,
  kcalToKj, latestMealBefore, mealCardsForDate, mealItemNames, mealLabels, nextMealSuggestion, oilLevelLabels,
  percent, suggestedMealSlot, totalForEntries,
} from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import type { MealType } from '@/types/nutrition';

export default function TodayScreen() {
  const { entries, profile, customFoods, hydrated, copyMeal } = useNutrition();
  if (!hydrated) return <LoadingScreen />;
  const todayEntries = entriesForDate(entries);
  const foodIndex = createFoodIndex(customFoods);
  const total = totalForEntries(todayEntries, foodIndex);
  const groups = foodGroupServes(todayEntries, foodIndex);
  const cards = mealCardsForDate(todayEntries);
  const slot = suggestedMealSlot();
  const lastMeal = latestMealBefore(entries, slot);
  const now = new Date();
  const hour = now.getHours();
  const hello = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
  const date = new Intl.DateTimeFormat('en-AU', { weekday: 'short', month: 'short', day: 'numeric' }).format(now);
  const energyShare = percent(total.energyKcal, profile.targets.energyKcal);
  const carbTarget = Math.round(profile.targets.energyKcal * 0.5 / 4);
  const fatTarget = Math.round(profile.targets.energyKcal * 0.3 / 9);

  return <Screen>
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{hello}，{profile.firstName.trim() || '朋友'}</Text>
        <Text style={styles.eyebrow}>{date}</Text>
      </View>
      <Pressable onPress={() => router.push('/recipes')} accessibilityLabel="家庭菜谱"><BrandMarkTile size={40} /></Pressable>
    </View>

    <Card style={styles.heroCard}>
      <Text style={styles.heroLabel}>能量</Text>
      <View style={styles.energyRow}>
        <View>
          <Text style={styles.energy}>{formatNumber(kcalToKj(total.energyKcal))}</Text>
          <Text style={styles.energyUnit}>kJ</Text>
        </View>
        <View style={styles.heroShare}><Text style={styles.heroShareValue}>{formatNumber(energyShare, 0)}%</Text><Text style={styles.heroShareLabel}>今日目标</Text></View>
      </View>
      <Text style={styles.heroMeta}>{formatNumber(total.energyKcal)} kcal · 目标 {formatEnergy(profile.targets.energyKcal, profile.energyUnit)}</Text>
      <View style={styles.rings}>
        <RingStat label="蛋白质" value={total.proteinG} target={profile.targets.proteinG} unit="%" />
        <RingStat label="碳水" value={total.carbsG} target={carbTarget} unit="%" tone="blue" />
        <RingStat label="脂肪" value={total.fatG} target={fatTarget} unit="%" tone="amber" />
      </View>
    </Card>

    <Card style={styles.suggestionCard}>
      <Text style={styles.suggestionKicker}>下一餐建议</Text>
      <Text style={styles.suggestion}>{nextMealSuggestion(total, profile.targets, groups)}</Text>
      <Text style={styles.disclaimer}>估算值，仅供日常参考，不用于疾病诊断或治疗。</Text>
    </Card>

    {lastMeal ? <Card style={styles.repeatCard}>
      <Text style={styles.repeatTitle}>再记上次{mealLabels[slot]}</Text>
      <Text style={styles.repeatMeta}>{mealItemNames(lastMeal.entries, foodIndex) || '上次这顿'} · {lastMeal.dateKey}</Text>
      <TextButton label="10 秒复用到今天" onPress={() => copyMeal(slot, lastMeal.dateKey)} />
    </Card> : null}

    <PrimaryButton label="＋ 记录这一餐" onPress={() => router.push('/(tabs)/search')} />

    <SectionTitle action={<TextButton label="查看全部" onPress={() => router.push('/(tabs)/log')} />}>今日餐次</SectionTitle>
    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((meal) => {
      const mealCards = cards.filter((card) => card.meal === meal);
      const mealEntries = todayEntries.filter((entry) => entry.meal === meal);
      const mealTotal = totalForEntries(mealEntries, foodIndex);
      return <Card key={meal} style={styles.mealCard}>
        <View style={styles.mealHeader}>
          <Text style={styles.mealTitle}>{mealLabels[meal]}</Text>
          <Text style={styles.mealEnergy}>{mealEntries.length ? formatEnergy(mealTotal.energyKcal, profile.energyUnit) : '未记录'}</Text>
        </View>
        {mealCards.length === 0 ? <Text style={styles.emptyText}>还没有记录</Text> : mealCards.map((card) => (
          <Text key={card.id} style={styles.mealFoods}>{mealItemNames(card.entries, foodIndex)}</Text>
        ))}
        {mealEntries.some((entry) => (entry.sharedWith ?? 1) > 1) ? (
          <Text style={styles.shareNote}>
            {mealEntries.filter((entry) => (entry.sharedWith ?? 1) > 1).map((entry) => {
              const food = foodIndex[entry.foodId];
              const people = entry.sharedWith ?? 1;
              return food ? `${displayFoodName(food)} ${people}人 · ${closestPortionLabel(entry.portionShare ?? 1 / people)}` : null;
            }).filter(Boolean).join('；')}
          </Text>
        ) : null}
        {mealEntries.some((entry) => entry.oilLevel && entry.oilLevel !== 'normal') ? (
          <Text style={styles.shareNote}>
            {mealEntries.filter((entry) => entry.oilLevel && entry.oilLevel !== 'normal').map((entry) => {
              const food = foodIndex[entry.foodId];
              return food && entry.oilLevel ? `${displayFoodName(food)} · ${oilLevelLabels[entry.oilLevel]}` : null;
            }).filter(Boolean).join('；')}
          </Text>
        ) : null}
      </Card>;
    })}
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  eyebrow: { color: colors.inkMuted, fontSize: 13, marginTop: 4 },
  heroCard: { gap: spacing.md },
  heroLabel: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' },
  energyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  energy: { color: colors.ink, fontSize: 40, fontWeight: '800', letterSpacing: -1.4 },
  energyUnit: { color: colors.inkMuted, fontSize: 16, fontWeight: '700', marginTop: 2 },
  heroShare: { alignItems: 'flex-end', gap: 2 },
  heroShareValue: { color: colors.brand, fontSize: 22, fontWeight: '800' },
  heroShareLabel: { color: colors.inkMuted, fontSize: 11 },
  heroMeta: { color: colors.inkMuted, fontSize: 12 },
  rings: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  suggestionCard: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' },
  suggestionKicker: { color: colors.brand, fontSize: 12, fontWeight: '800', marginBottom: spacing.sm },
  suggestion: { color: colors.ink, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  disclaimer: { color: colors.inkMuted, fontSize: 11, lineHeight: 17, marginTop: spacing.md },
  repeatCard: { backgroundColor: colors.amberSoft, borderColor: '#E9CF9E', gap: spacing.sm },
  repeatTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  repeatMeta: { color: colors.inkMuted, fontSize: 13, lineHeight: 20 },
  mealCard: { gap: 6 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  mealTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  mealEnergy: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  mealFoods: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  shareNote: { color: colors.inkMuted, fontSize: 11, lineHeight: 17 },
  emptyText: { color: colors.inkMuted, fontSize: 13 },
});
