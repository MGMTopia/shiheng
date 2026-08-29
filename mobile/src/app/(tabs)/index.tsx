import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, PrimaryButton, Screen, SectionTitle, TextButton } from '@/components/ui';
import { NutrientProgress } from '@/components/nutrient-progress';
import { colors, radii, spacing } from '@/constants/theme';
import { foodsById } from '@/data/foods';
import { entriesForDate, formatNumber, mealLabels, nextMealSuggestion, totalForEntries } from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';

export default function TodayScreen() {
  const { entries, profile, hydrated, deleteEntry } = useNutrition();
  if (!hydrated) return <LoadingScreen />;
  const todayEntries = entriesForDate(entries);
  const total = totalForEntries(todayEntries);
  const remaining = Math.max(0, profile.targets.energyKcal - total.energyKcal);
  const recent = [...todayEntries].reverse().slice(0, 3);
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());

  return <Screen>
    <View style={styles.header}>
      <View><Text style={styles.eyebrow}>{date}</Text><Text style={styles.title}>你好，{profile.firstName}</Text></View>
      <View style={styles.logo}><Text style={styles.logoText}>食衡</Text></View>
    </View>

    <Card style={styles.heroCard}>
      <Text style={styles.heroLabel}>今日还可安排</Text>
      <View style={styles.energyRow}><Text style={styles.energy}>{formatNumber(remaining)}</Text><Text style={styles.energyUnit}>kcal</Text></View>
      <Text style={styles.heroMeta}>已记录 {formatNumber(total.energyKcal)} / {formatNumber(profile.targets.energyKcal)} kcal</Text>
      <View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${Math.min(100, total.energyKcal / profile.targets.energyKcal * 100)}%` }]} /></View>
    </Card>

    <Card style={styles.progressCard}>
      <NutrientProgress label="蛋白质" value={total.proteinG} target={profile.targets.proteinG} unit="g" />
      <NutrientProgress label="膳食纤维" value={total.fibreG} target={profile.targets.fibreG} unit="g" tone="blue" />
      <NutrientProgress label="钠" value={total.sodiumMg} target={profile.targets.sodiumMg} unit="mg" tone="amber" />
    </Card>

    <Card style={styles.suggestionCard}>
      <Text style={styles.suggestionKicker}>下一餐建议</Text>
      <Text style={styles.suggestion}>{nextMealSuggestion(total, profile.targets)}</Text>
      <Text style={styles.disclaimer}>基于一般健康目标，仅供日常参考，不用于疾病诊断或治疗。</Text>
    </Card>

    <PrimaryButton label="＋ 记录这一餐" onPress={() => router.push('/(tabs)/search')} />

    <SectionTitle action={<TextButton label="查看全部" onPress={() => router.push('/(tabs)/log')} />}>最近记录</SectionTitle>
    <Card style={styles.recentCard}>
      {recent.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>今天还没有记录</Text><Text style={styles.emptyText}>从搜索常吃食物开始，首版目标是在30秒内记完一餐。</Text></View> : recent.map((entry, index) => {
        const food = foodsById[entry.foodId];
        if (!food) return null;
        return <View key={entry.id} style={[styles.recentRow, index < recent.length - 1 && styles.recentBorder]}>
          <View style={styles.recentMain}><Text style={styles.recentName}>{food.nameZh}</Text><Text style={styles.recentMeta}>{mealLabels[entry.meal]} · {entry.servings}份</Text></View>
          <TextButton label="移除" tone="danger" onPress={() => deleteEntry(entry.id)} />
        </View>;
      })}
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: colors.inkMuted, fontSize: 13, marginBottom: 4 },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, logo: { backgroundColor: colors.brand, borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 9 },
  logoText: { color: colors.white, fontSize: 13, fontWeight: '800' }, heroCard: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  heroLabel: { color: '#CDE4D6', fontSize: 13, fontWeight: '600' }, energyRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 2 },
  energy: { color: colors.white, fontSize: 44, fontWeight: '800', letterSpacing: -1.5 }, energyUnit: { color: '#CDE4D6', fontSize: 15, fontWeight: '700' },
  heroMeta: { color: '#CDE4D6', fontSize: 12 }, heroTrack: { height: 7, borderRadius: radii.pill, backgroundColor: '#356D54', overflow: 'hidden', marginTop: spacing.md },
  heroFill: { height: '100%', backgroundColor: '#A8D5B8', borderRadius: radii.pill }, progressCard: { gap: spacing.lg }, suggestionCard: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' },
  suggestionKicker: { color: colors.brand, fontSize: 12, fontWeight: '800', marginBottom: spacing.sm }, suggestion: { color: colors.ink, fontSize: 17, lineHeight: 26, fontWeight: '600' },
  disclaimer: { color: colors.inkMuted, fontSize: 11, lineHeight: 17, marginTop: spacing.md }, recentCard: { paddingVertical: 4 }, recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  recentBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, recentMain: { flex: 1, gap: 3 }, recentName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  recentMeta: { color: colors.inkMuted, fontSize: 12 }, empty: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyText: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 280 },
});
