import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandMarkTile } from '@/components/brand-mark';
import { RingStat } from '@/components/ring-stat';
import { StorageRecoveryBanner } from '@/components/storage-recovery-banner';
import { Card, LoadingScreen, PrimaryButton, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useFoodRepository } from '@/data/food-repository-context';
import { FRUIT_SERVE_TARGET, closestPortionLabel, displayFoodName, entriesForDate, foodGroupServes, formatEnergy, formatNumber,
  frequentFoodIds, kcalToKj, latestMealBefore, mealCardsForDate, mealItemNames, mealLabels, nextMealSuggestion, nutrientNumber,
  oilLevelLabels, percent, recentFoodIds, suggestedMealSlot, totalForEntries,
} from '@/domain/nutrition';
import { completenessHint, periodSummary } from '@/domain/trends';
import { useDiary, usePersonalFoods, useProfile, useSession } from '@/store/nutrition-store';
import type { MealType } from '@/types/nutrition';

export default function TodayScreen() {
  const { entries, copyMeal, portionMemory } = useDiary();
  const { profile } = useProfile();
  const { customFoods, favouriteFoodIds } = usePersonalFoods();
  const { hydrated } = useSession();
  const foods = useFoodRepository();
  if (!hydrated) return <LoadingScreen />;
  const todayEntries = entriesForDate(entries);
  const foodIndex = foods.getByIds([...entries.map((entry) => entry.foodId), ...favouriteFoodIds], customFoods);
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
  const week = periodSummary(entries, foodIndex, profile.targets, 7);

  return <Screen>
    <StorageRecoveryBanner />
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
        <RingStat label="蛋白质" value={nutrientNumber(total.proteinG)} target={profile.targets.proteinG} unit="%" />
        <RingStat label="碳水" value={nutrientNumber(total.carbsG)} target={carbTarget} unit="%" tone="blue" />
        <RingStat label="脂肪" value={nutrientNumber(total.fatG)} target={fatTarget} unit="%" tone="amber" />
      </View>
    </Card>

    <Card style={styles.suggestionCard}>
      <Text style={styles.suggestionKicker}>今日结构</Text>
      <Text style={styles.suggestion}>{todayEntries.length === 0
        ? '还没有记录。记下一餐后，这里会提示蛋白质、纤维、钠和蔬菜是否明显偏离。'
        : [
          nutrientNumber(total.proteinG) < profile.targets.proteinG * 0.5 ? '蛋白质明显不足' : null,
          nutrientNumber(total.fibreG) < profile.targets.fibreG * 0.45 ? '膳食纤维不足' : null,
          nutrientNumber(total.sodiumMg) > profile.targets.sodiumMg * 0.8 ? '钠偏高' : null,
          groups.vegetableServes < profile.targets.vegetableServes * 0.45 ? '蔬菜偏少' : null,
          groups.fruitServes < FRUIT_SERVE_TARGET * 0.45 ? '水果偏少' : null,
        ].filter(Boolean).join(' · ') || '目前没有突出的结构偏差。'}</Text>
      {todayEntries.length > 0 ? <Text style={styles.suggestion}>{nextMealSuggestion(total, profile.targets, groups)}</Text> : null}
      {todayEntries.length > 0 ? <Text style={styles.groupLine}>蔬菜 {formatNumber(groups.vegetableServes, 1)}/{profile.targets.vegetableServes} · 水果 {formatNumber(groups.fruitServes, 1)}/{FRUIT_SERVE_TARGET} · 主食 {formatNumber(groups.grainServes, 1)}/{profile.targets.grainServes} · 蛋白质 {formatNumber(groups.proteinServes, 1)}/{profile.targets.proteinServes}</Text> : null}
      <Text style={styles.disclaimer}>家常菜和合菜是估算。不完整记录时，统计只反映已记下的食物。</Text>
    </Card>

    <Pressable onPress={() => router.push('/trends')}>
      <Card style={styles.repeatCard}>
        <Text style={styles.repeatTitle}>近 7 天趋势</Text>
        <Text style={styles.repeatMeta}>{completenessHint(week)}{week.averageEnergyKcal != null ? ` 日均 ${formatEnergy(week.averageEnergyKcal, profile.energyUnit)}。` : ''}</Text>
        <Text style={styles.repeatMeta}>查看 7/30 天平均、完整度和可执行建议。</Text>
      </Card>
    </Pressable>

    {(() => {
      const shortcuts = favouriteFoodIds.slice(0, 12).map((foodId) => foodIndex[foodId]).filter(Boolean);
      if (!shortcuts.length) return null;
      return <Card style={styles.repeatCard}>
        <Text style={styles.repeatTitle}>个人快捷</Text>
        <Text style={styles.repeatMeta}>收藏的食物会出现在这里，最多 12 个，直接用上次份量和餐次。</Text>
        {shortcuts.map((food) => {
          const remembered = portionMemory[food.id];
          return <TextButton key={food.id} label={`${displayFoodName(food)}${remembered ? ` · ${remembered.servings} 份` : ' · 再用上次份量'}`} onPress={() => router.push({ pathname: '/food/[id]', params: { id: food.id } })} />;
        })}
      </Card>;
    })()}

    {(() => {
      const recent = recentFoodIds(entries, 6).map((foodId) => foodIndex[foodId]).filter(Boolean);
      if (!recent.length) return null;
      return <Card style={styles.repeatCard}>
        <Text style={styles.repeatTitle}>最近吃过</Text>
        {recent.map((food) => (
          <TextButton key={food.id} label={`${displayFoodName(food)} · 再用上次份量`} onPress={() => router.push({ pathname: '/food/[id]', params: { id: food.id } })} />
        ))}
      </Card>;
    })()}

    {(() => {
      const recentSet = new Set(recentFoodIds(entries, 6));
      const shortcutSet = new Set(favouriteFoodIds.slice(0, 12));
      const frequent = frequentFoodIds(entries, 8)
        .filter((id) => !recentSet.has(id) && !shortcutSet.has(id))
        .map((foodId) => foodIndex[foodId])
        .filter(Boolean)
        .slice(0, 6);
      if (!frequent.length) return null;
      return <Card style={styles.repeatCard}>
        <Text style={styles.repeatTitle}>最常吃</Text>
        {frequent.map((food) => (
          <TextButton key={food.id} label={`${displayFoodName(food)} · ${entries.filter((entry) => entry.foodId === food.id).length} 次`} onPress={() => router.push({ pathname: '/food/[id]', params: { id: food.id } })} />
        ))}
      </Card>;
    })()}

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
  groupLine: { color: colors.inkMuted, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
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
