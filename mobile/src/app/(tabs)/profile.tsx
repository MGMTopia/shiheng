import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useNutrition } from '@/store/nutrition-store';
import { NutritionTargets } from '@/types/nutrition';

const presets: { id: string; label: string; description: string; targets: NutritionTargets }[] = [
  { id: 'balanced', label: '均衡日常', description: '一般成年人日常记录示例', targets: { energyKcal: 2000, proteinG: 90, fibreG: 30, sodiumMg: 2000 } },
  { id: 'active', label: '活跃增肌', description: '提高能量和蛋白质目标', targets: { energyKcal: 2400, proteinG: 130, fibreG: 32, sodiumMg: 2000 } },
  { id: 'lighter', label: '轻量管理', description: '温和降低能量目标的示例', targets: { energyKcal: 1700, proteinG: 95, fibreG: 30, sodiumMg: 2000 } },
];

export default function ProfileScreen() {
  const { profile, hydrated, updateProfile, clearEntries } = useNutrition();
  if (!hydrated) return <LoadingScreen />;
  const activeId = presets.find((preset) => preset.targets.energyKcal === profile.targets.energyKcal && preset.targets.proteinG === profile.targets.proteinG)?.id;
  const confirmClear = () => Alert.alert('清除饮食记录？', '该操作只清除本机记录，无法撤销。', [
    { text: '取消', style: 'cancel' }, { text: '清除', style: 'destructive', onPress: clearEntries },
  ]);

  return <Screen>
    <View><Text style={styles.title}>我的目标</Text><Text style={styles.subtitle}>先用预设验证体验，后续再加入专业个性化计算。</Text></View>
    <Card style={styles.notice}>
      <Text style={styles.noticeTitle}>一般健康模式</Text><Text style={styles.noticeText}>当前功能不根据疾病、药物、孕期或化验结果提供治疗建议。特殊需求请咨询澳洲APD或医生。</Text>
    </Card>

    <SectionTitle>每日目标预设</SectionTitle>
    <View style={styles.presetList}>{presets.map((preset) => {
      const active = activeId === preset.id;
      return <Pressable key={preset.id} onPress={() => updateProfile({ ...profile, targets: preset.targets })} style={[styles.preset, active && styles.presetActive]}>
        <View style={styles.presetMain}><Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{preset.label}</Text><Text style={styles.presetDescription}>{preset.description}</Text></View>
        <View style={styles.presetValues}><Text style={styles.presetEnergy}>{preset.targets.energyKcal} kcal</Text><Text style={styles.presetProtein}>蛋白质 {preset.targets.proteinG}g</Text></View>
      </Pressable>;
    })}</View>

    <SectionTitle>数据原则</SectionTitle>
    <Card style={styles.principles}>
      {['显示每条食物的数据来源和可信等级', '复杂菜肴明确标记为配方估算', '用户记录仅保存在本机，未来接云服务前重新征求同意', '不把健康数据用于广告画像'].map((item) => <View key={item} style={styles.principleRow}><Text style={styles.check}>✓</Text><Text style={styles.principleText}>{item}</Text></View>)}
    </Card>

    <Card style={styles.dataCard}><View style={styles.dataText}><Text style={styles.dataTitle}>本机数据</Text><Text style={styles.dataDescription}>清除所有饮食记录，保留当前目标。</Text></View><TextButton label="清除记录" tone="danger" onPress={confirmClear} /></Card>
    <Text style={styles.version}>食衡 MVP · 0.1.0 · 数据为开发验证样例</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5 },
  notice: { backgroundColor: colors.amberSoft, borderColor: '#E9CF9E' }, noticeTitle: { color: colors.amber, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm }, noticeText: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  presetList: { gap: spacing.md }, preset: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  presetActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft }, presetMain: { flex: 1, gap: 4 }, presetLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' }, presetLabelActive: { color: colors.brandDark },
  presetDescription: { color: colors.inkMuted, fontSize: 12 }, presetValues: { alignItems: 'flex-end', gap: 4 }, presetEnergy: { color: colors.ink, fontSize: 13, fontWeight: '700' }, presetProtein: { color: colors.inkMuted, fontSize: 11 },
  principles: { gap: spacing.md }, principleRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }, check: { color: colors.brand, fontSize: 16, fontWeight: '800' }, principleText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 20 },
  dataCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, dataText: { flex: 1, gap: 3 }, dataTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' }, dataDescription: { color: colors.inkMuted, fontSize: 12 },
  version: { color: colors.inkMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
