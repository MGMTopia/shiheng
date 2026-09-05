import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { formatNumber, percent } from '@/domain/nutrition';

export function RingStat({ label, value, target, unit, tone = 'green' }: {
  label: string; value: number; target: number; unit: string; tone?: 'green' | 'blue' | 'amber';
}) {
  const progress = percent(value, target);
  const ring = tone === 'blue' ? colors.blue : tone === 'amber' ? colors.amber : colors.brand;
  const digits = unit === '%' ? 0 : unit === 'mg' || unit === 'serves' ? (unit === 'mg' ? 0 : 1) : 1;
  return <View style={styles.item}>
    <View style={[styles.circle, { borderColor: ring }]}>
      {unit === '%'
        ? <Text style={[styles.percent, { color: ring }]}>{formatNumber(progress, 0)}%</Text>
        : <>
          <Text style={[styles.value, { color: ring }]}>{formatNumber(value, digits)}</Text>
          <Text style={styles.target}>/{formatNumber(target, unit === 'mg' ? 0 : 0)}</Text>
        </>}
    </View>
    <View style={styles.track}><View style={[styles.fill, { width: `${progress}%`, backgroundColor: ring }]} /></View>
    <Text style={styles.label}>{label}</Text>
    {unit !== '%' ? <Text style={styles.unit}>{unit === 'serves' ? '份' : unit}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  item: { flex: 1, alignItems: 'center', gap: 6 },
  circle: { width: 72, height: 72, borderRadius: 36, borderWidth: 6, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  percent: { fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  target: { color: colors.inkMuted, fontSize: 10, fontWeight: '600' },
  track: { width: 56, height: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  unit: { color: colors.inkMuted, fontSize: 10, marginTop: -spacing.xs },
});
