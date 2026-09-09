import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, Screen, SectionTitle } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useFoodRepository } from '@/data/food-repository-context';
import { FRUIT_SERVE_TARGET, entriesForDate, foodGroupServes, formatEnergy, formatNumber, localDateKey, totalForEntries } from '@/domain/nutrition';
import { actionableAdvice, completenessHint, periodSummary, type PeriodLength } from '@/domain/trends';
import { useDiary, usePersonalFoods, useProfile, useSession } from '@/store/nutrition-store';

export default function TrendsScreen() {
  const { entries } = useDiary();
  const { profile } = useProfile();
  const { customFoods } = usePersonalFoods();
  const { hydrated } = useSession();
  const foods = useFoodRepository();
  const [days, setDays] = useState<PeriodLength>(7);
  const [completeOnly, setCompleteOnly] = useState(false);
  if (!hydrated) return <LoadingScreen />;

  const todayKey = localDateKey();
  const foodIndex = foods.getByIds(entries.map((entry) => entry.foodId), customFoods);
  const todayEntries = entriesForDate(entries, todayKey);
  const todayTotal = totalForEntries(todayEntries, foodIndex);
  const todayGroups = foodGroupServes(todayEntries, foodIndex);
  const week = periodSummary(entries, foodIndex, profile.targets, days, todayKey, completeOnly);
  const advice = actionableAdvice(todayTotal, todayGroups, week, profile.targets, todayEntries.length > 0);

  return <Screen>
    <View><Text style={styles.title}>饮食趋势</Text><Text style={styles.subtitle}>平均值只反映已记下的日子，不是健康评分。</Text></View>
    <View style={styles.chips}>
      {([7, 30] as PeriodLength[]).map((value) => (
        <Pressable key={value} onPress={() => setDays(value)} style={[styles.chip, days === value && styles.chipActive]}>
          <Text style={[styles.chipText, days === value && styles.chipTextActive]}>近 {value} 天</Text>
        </Pressable>
      ))}
      <Pressable onPress={() => setCompleteOnly((value) => !value)} style={[styles.chip, completeOnly && styles.chipActive]}>
        <Text style={[styles.chipText, completeOnly && styles.chipTextActive]}>{completeOnly ? '只看较完整的天' : '含不完整记录'}</Text>
      </Pressable>
    </View>
    <Card>
      <Text style={styles.kicker}>记录完整度</Text>
      <Text style={styles.body}>{completenessHint(week)}</Text>
    </Card>
    <Card>
      <Text style={styles.kicker}>平均摄入</Text>
      {week.loggedDays === 0 ? <Text style={styles.body}>还没有足够记录计算平均值。</Text> : <>
        <Text style={styles.stat}>{formatEnergy(week.averageEnergyKcal, profile.energyUnit)}</Text>
        <Text style={styles.body}>蛋白质 {formatNumber(week.averageProteinG, 1)} g · 纤维 {formatNumber(week.averageFibreG, 1)} g · 钠 {formatNumber(week.averageSodiumMg)} mg</Text>
        <Text style={styles.body}>蔬菜 {formatNumber(week.groupsAverage.vegetableServes, 1)}/{profile.targets.vegetableServes} · 水果 {formatNumber(week.groupsAverage.fruitServes, 1)}/{FRUIT_SERVE_TARGET} · 主食 {formatNumber(week.groupsAverage.grainServes, 1)}/{profile.targets.grainServes} · 蛋白质类 {formatNumber(week.groupsAverage.proteinServes, 1)}/{profile.targets.proteinServes}</Text>
      </>}
    </Card>
    <Card>
      <Text style={styles.kicker}>重复模式</Text>
      <Text style={styles.body}>高钠 {week.highSodiumDays} 天 · 低纤维 {week.lowFibreDays} 天 · 蔬菜少 {week.lowVegDays} 天 · 水果少 {week.lowFruitDays} 天</Text>
    </Card>
    <SectionTitle>可以怎么调整</SectionTitle>
    {advice.map((item) => (
      <Card key={item.title} style={styles.advice}>
        <Text style={styles.adviceTitle}>{item.title}</Text>
        <Text style={styles.reason}>{item.reason}</Text>
      </Card>
    ))}
    <Text style={styles.disclaimer}>建议只针对一般饮食结构，不是疾病诊断或治疗方案。</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  kicker: { color: colors.brand, fontSize: 12, fontWeight: '800', marginBottom: spacing.sm },
  body: { color: colors.ink, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  stat: { color: colors.ink, fontSize: 28, fontWeight: '800', marginBottom: spacing.sm },
  advice: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8', gap: spacing.sm },
  adviceTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 24 },
  reason: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  disclaimer: { color: colors.inkMuted, fontSize: 11, lineHeight: 17 },
});
