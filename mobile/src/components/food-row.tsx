import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SourceBadge } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { formatNumber, nutrientsForServing } from '@/domain/nutrition';
import { Food } from '@/types/nutrition';

export function FoodRow({ food, onPress }: { food: Food; onPress: () => void }) {
  const serving = nutrientsForServing(food);
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <View style={styles.main}>
      <View style={styles.titleRow}><Text style={styles.title}>{food.nameZh}</Text><SourceBadge confidence={food.source.confidence} /></View>
      <Text style={styles.subtitle}>{food.nameEn} · {food.servingLabel} ({food.servingGrams}g)</Text>
      <Text style={styles.meta}>{formatNumber(serving.energyKcal)} kcal · 蛋白质 {formatNumber(serving.proteinG, 1)}g</Text>
    </View><View style={styles.add}><Text style={styles.addText}>＋</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { opacity: 0.6 }, main: { flex: 1, gap: 4 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  title: { color: colors.ink, fontSize: 16, fontWeight: '700' }, subtitle: { color: colors.inkMuted, fontSize: 12 }, meta: { color: colors.brandDark, fontSize: 12, fontWeight: '600' },
  add: { width: 36, height: 36, borderRadius: radii.pill, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }, addText: { color: colors.brand, fontSize: 23, lineHeight: 25 },
});
