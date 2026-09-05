import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton, Screen } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { incrementLocalMetric } from '@/services/local-metrics';
import { useNutrition } from '@/store/nutrition-store';
import type { EnergyUnit } from '@/types/nutrition';

const ONBOARDING_KEY = '@shiheng/onboarding-complete/v1';

const principles = [
  ['记录优先', '一顿家常饭按整餐来记：合菜能拆、油和酱能确认、昨天那顿可以复用。'],
  ['来源透明', '每项食物都标注数据来源与可信等级；复杂菜肴会标记为估算。'],
  ['本机优先', '当前记录只保存在本机，不上传、不用于广告画像。卸载后会删除，也不会通过系统备份还原。'],
] as const;

export default function OnboardingScreen() {
  const { hydrated, profile, updateProfile } = useNutrition();
  const [saving, setSaving] = useState(false);
  const [energyUnit, setEnergyUnit] = useState<EnergyUnit>(profile.energyUnit);
  useEffect(() => {
    if (hydrated) setEnergyUnit(profile.energyUnit);
  }, [hydrated, profile.energyUnit]);

  const start = async () => {
    if (!hydrated) return;
    setSaving(true);
    try {
      updateProfile({ ...profile, energyUnit });
      await AsyncStorage.setItem(ONBOARDING_KEY, 'done');
      await incrementLocalMetric('onboarding_completed');
      router.replace('/(tabs)');
    } catch {
      Alert.alert('暂时无法保存', '请检查设备存储空间后重试。');
    } finally {
      setSaving(false);
    }
  };

  return <Screen>
    <View style={styles.hero}>
      <View style={styles.logo}><Text style={styles.logoText}>食衡</Text></View>
      <Text style={styles.kicker}>封闭测试安装包</Text>
      <Text style={styles.title}>一顿真实的家常饭，20–30 秒记清楚。</Text>
      <Text style={styles.subtitle}>这是可直接安装的封闭测试版，用来验证合菜、用油和复用。不替代医生、营养师或其他专业建议，也不用于商店公开发布。</Text>
    </View>

    <Card style={styles.principles}>
      {principles.map(([label, description], index) => <View key={label} style={[styles.principle, index < principles.length - 1 && styles.principleBorder]}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <View style={styles.principleText}><Text style={styles.principleLabel}>{label}</Text><Text style={styles.principleDescription}>{description}</Text></View>
      </View>)}
    </Card>

    <Card style={styles.unitCard}>
      <Text style={styles.unitTitle}>你更习惯哪种能量单位？</Text>
      <Text style={styles.unitHint}>澳洲包装常用 kJ，习惯卡路里也可以。之后可在「我的」里改。</Text>
      <View style={styles.unitRow}>
        <Pressable onPress={() => setEnergyUnit('kj')} style={[styles.unitChip, energyUnit === 'kj' && styles.unitChipActive]}><Text style={[styles.unitChipText, energyUnit === 'kj' && styles.unitChipTextActive]}>kJ（推荐）</Text></Pressable>
        <Pressable onPress={() => setEnergyUnit('kcal')} style={[styles.unitChip, energyUnit === 'kcal' && styles.unitChipActive]}><Text style={[styles.unitChipText, energyUnit === 'kcal' && styles.unitChipTextActive]}>kcal</Text></Pressable>
      </View>
    </Card>

    <View style={styles.footer}>
      <PrimaryButton label={saving ? '正在准备…' : '开始使用'} onPress={start} disabled={saving || !hydrated} />
      <Pressable onPress={() => router.push('/privacy')} hitSlop={8}><Text style={styles.link}>先查看隐私与数据说明</Text></Pressable>
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.md },
  logo: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.brand, marginBottom: spacing.xl },
  logoText: { color: colors.white, fontSize: 18, fontWeight: '800' },
  kicker: { color: colors.brand, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  title: { color: colors.ink, maxWidth: 320, marginTop: spacing.sm, fontSize: 28, fontWeight: '800', lineHeight: 36, letterSpacing: -0.7, textAlign: 'center' },
  subtitle: { color: colors.inkMuted, maxWidth: 330, marginTop: spacing.md, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  principles: { gap: 0 },
  principle: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.md },
  principleBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  number: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.brandSoft },
  numberText: { color: colors.brandDark, fontSize: 13, fontWeight: '800' },
  principleText: { flex: 1, gap: 3 }, principleLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' }, principleDescription: { color: colors.inkMuted, fontSize: 12, lineHeight: 19 },
  unitCard: { gap: spacing.sm }, unitTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' }, unitHint: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  unitRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  unitChip: { flex: 1, paddingVertical: 12, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  unitChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  unitChipText: { color: colors.inkMuted, fontSize: 14, fontWeight: '700' }, unitChipTextActive: { color: colors.white },
  footer: { gap: spacing.lg, paddingBottom: spacing.xl }, link: { color: colors.brand, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
