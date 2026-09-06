import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SourceBadge } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { catalogStatusLabels, displayFoodName, formatEnergyPair, formatNumber, nutrientsForServing } from '@/domain/nutrition';
import type { CatalogStatus, Food } from '@/types/nutrition';

export function FoodRow({ food, onPress, catalogStatus = 'unseen' }: { food: Food; onPress: () => void; catalogStatus?: CatalogStatus }) {
  const serving = nutrientsForServing(food);
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <View style={styles.main}>
      <View style={styles.titleRow}><Text style={styles.title}>{displayFoodName(food)}</Text><SourceBadge confidence={food.source.confidence} />{catalogStatus !== 'unseen' && <Text style={styles.dex}>{catalogStatusLabels[catalogStatus]}</Text>}</View>
      <Text style={styles.subtitle}>{[displayFoodName(food) !== food.nameEn ? food.nameEn : null, food.brand, food.source.region === 'US' ? '美国对照' : null, `${food.servingLabel}（${food.servingGrams}克）`, (food.alternateSources?.length ?? 0) > 0 ? `${(food.alternateSources?.length ?? 0) + 1} 个来源` : null].filter(Boolean).join(' · ')}</Text>
      <Text style={styles.meta}>{formatEnergyPair(serving.energyKcal)} · 蛋白质 {formatNumber(serving.proteinG, 1)}g</Text>
    </View><View style={styles.add}><Text style={styles.addText}>＋</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { opacity: 0.6 }, main: { flex: 1, gap: 4 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700' }, subtitle: { color: colors.inkMuted, fontSize: 12 }, meta: { color: colors.brandDark, fontSize: 12, fontWeight: '600' },
  dex: { color: colors.brand, fontSize: 11, fontWeight: '700' },
  add: { width: 36, height: 36, borderRadius: radii.pill, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }, addText: { color: colors.brand, fontSize: 23, lineHeight: 25 },
});
