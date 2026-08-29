import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { formatNumber, percent } from '@/domain/nutrition';

export function NutrientProgress({ label, value, target, unit, tone = 'green' }: {
  label: string; value: number; target: number; unit: string; tone?: 'green' | 'blue' | 'amber';
}) {
  const progress = percent(value, target);
  const fill = tone === 'blue' ? colors.blue : tone === 'amber' ? colors.amber : colors.brand;
  return <View style={styles.container}>
    <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{formatNumber(value, unit === 'g' ? 1 : 0)} / {formatNumber(target)} {unit}</Text></View>
    <View style={styles.track}><View style={[styles.fill, { width: `${progress}%`, backgroundColor: fill }]} /></View>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' }, value: { color: colors.inkMuted, fontSize: 12 },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }, fill: { height: '100%', borderRadius: radii.pill },
});
