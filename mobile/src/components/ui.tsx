import { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import type { FoodSource } from '@/types/nutrition';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = <View style={[styles.screenContent, !scroll && styles.fill]}>{children}</View>;
  return <SafeAreaView edges={['top']} style={styles.safeArea}>{scroll
    ? <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>{content}</ScrollView>
    : content}</SafeAreaView>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: ReactNode }>) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{children}</Text>{action}</View>;
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, disabled && styles.disabled]}>
    <Text style={styles.primaryButtonText}>{label}</Text>
  </Pressable>;
}

export function TextButton({ label, onPress, tone = 'brand' }: { label: string; onPress: () => void; tone?: 'brand' | 'danger' }) {
  return <Pressable onPress={onPress} hitSlop={8}><Text style={[styles.textButton, tone === 'danger' && styles.textButtonDanger]}>{label}</Text></Pressable>;
}

export function LoadingScreen() {
  return <SafeAreaView style={styles.loading}><ActivityIndicator color={colors.brand} size="large" /><Text style={styles.muted}>正在读取你的记录…</Text></SafeAreaView>;
}

export function SourceBadge({ confidence, dataset }: { confidence: FoodSource['confidence']; dataset?: FoodSource['dataset'] }) {
  const label = confidence === 'high' ? '高可信'
    : confidence === 'medium' ? '参考数据'
    : dataset === 'recipe-estimate' ? '配方估算'
    : dataset === 'open-food-facts' ? '包装标签'
    : dataset === 'user-entry' ? '我录入'
    : '估算';
  return <View style={[styles.badge, confidence === 'estimate' && styles.badgeEstimate]}><Text style={styles.badgeText}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, scrollContent: { paddingBottom: 120 },
  screenContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },
  fill: { flex: 1, minHeight: 0, paddingBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 0, padding: spacing.lg, ...shadows.card },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, letterSpacing: -0.3 },
  primaryButton: { minHeight: 54, backgroundColor: colors.brand, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '700' }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.45 },
  textButton: { color: colors.brand, fontSize: 14, fontWeight: '700' }, textButtonDanger: { color: colors.red },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: spacing.md }, muted: { color: colors.inkMuted, fontSize: 14 },
  badge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: colors.brandSoft }, badgeEstimate: { backgroundColor: colors.amberSoft },
  badgeText: { color: colors.brandDark, fontSize: 11, fontWeight: '700' },
});
