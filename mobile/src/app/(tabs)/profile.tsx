import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { AndroidUpdateCard } from '@/components/android-update-card';
import { Card, LoadingScreen, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import Constants from 'expo-constants';
import { catalogMeta, loggedFoodIds } from '@/data/catalog';
import { formatEnergy } from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import type { EnergyUnit, NutritionTargets } from '@/types/nutrition';

const foodGroups = { vegetableServes: 5, grainServes: 6, proteinServes: 3 };
const presets: { id: string; label: string; description: string; targets: NutritionTargets }[] = [
  { id: 'balanced', label: '均衡日常', description: '一般成年人日常记录示例', targets: { energyKcal: 2000, proteinG: 90, fibreG: 30, sodiumMg: 2000, ...foodGroups } },
  { id: 'active', label: '活跃增肌', description: '提高能量和蛋白质目标', targets: { energyKcal: 2400, proteinG: 130, fibreG: 32, sodiumMg: 2000, ...foodGroups } },
  { id: 'lighter', label: '轻量管理', description: '温和降低能量目标的示例', targets: { energyKcal: 1700, proteinG: 95, fibreG: 30, sodiumMg: 2000, ...foodGroups } },
];

export default function ProfileScreen() {
  const { profile, hydrated, updateProfile, clearEntries, entries, verifiedFoodIds } = useNutrition();
  if (!hydrated) return <LoadingScreen />;
  const activeId = presets.find((preset) => preset.targets.energyKcal === profile.targets.energyKcal && preset.targets.proteinG === profile.targets.proteinG)?.id;
  const confirmClear = () => Alert.alert('清除饮食记录？', '该操作只清除本机记录，无法撤销。', [
    { text: '取消', style: 'cancel' }, { text: '清除', style: 'destructive', onPress: clearEntries },
  ]);
  const dexCount = loggedFoodIds(entries).length;

  return <Screen>
    <View><Text style={styles.title}>我的</Text><Text style={styles.subtitle}>设置只保存在本机，没有账号。</Text></View>
    <Card style={styles.notice}>
      <Text style={styles.noticeTitle}>一般健康模式</Text><Text style={styles.noticeText}>当前功能不根据疾病、药物、孕期或化验结果提供治疗建议。特殊需求请咨询澳洲注册营养师（APD）或医生。</Text>
    </Card>

    <SectionTitle>称呼</SectionTitle>
    <Card>
      <TextInput
        value={profile.firstName}
        onChangeText={(value) => updateProfile({ ...profile, firstName: value })}
        placeholder="今天页问候用的名字"
        placeholderTextColor={colors.inkMuted}
        style={styles.nameInput}
        autoCapitalize="words"
      />
    </Card>

    <Card>
      <Text style={styles.presetLabel}>个人图鉴</Text>
      <Text style={styles.presetDescription}>已记录 {dexCount} 种。随包常用 {catalogMeta.counts.featured} 条，另有澳洲官方 {catalogMeta.counts.ausnut + catalogMeta.counts.afcdExtra} 条和 USDA 对照 {catalogMeta.counts.usdaFoundation} 条可搜索。其中 {verifiedFoodIds.length} 种已本机核对，核对不是官方审核。</Text>
    </Card>

    <SectionTitle>显示单位</SectionTitle>
    <View style={styles.unitRow}>
      {(['kj', 'kcal'] as EnergyUnit[]).map((unit) => {
        const active = profile.energyUnit === unit;
        return <Pressable key={unit} onPress={() => updateProfile({ ...profile, energyUnit: unit })} style={[styles.unitChip, active && styles.unitChipActive]}>
          <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>{unit === 'kj' ? 'kJ' : 'kcal'}</Text>
        </Pressable>;
      })}
    </View>

    <SectionTitle>每日目标预设</SectionTitle>
    <View style={styles.presetList}>{presets.map((preset) => {
      const active = activeId === preset.id;
      return <Pressable key={preset.id} onPress={() => updateProfile({ ...profile, targets: preset.targets })} style={[styles.preset, active && styles.presetActive]}>
        <View style={styles.presetMain}><Text style={[styles.presetLabel, active && styles.presetLabelActive]}>{preset.label}</Text><Text style={styles.presetDescription}>{preset.description}</Text></View>
        <View style={styles.presetValues}><Text style={styles.presetEnergy}>{formatEnergy(preset.targets.energyKcal, profile.energyUnit)}</Text><Text style={styles.presetProtein}>蛋白质 {preset.targets.proteinG}g</Text></View>
      </Pressable>;
    })}</View>

    <SectionTitle>设置</SectionTitle>
    <View style={styles.actionList}>
      <Pressable onPress={() => router.push('/privacy')} style={styles.actionRow}>
        <View style={styles.actionMain}><Text style={styles.actionTitle}>隐私与数据说明</Text><Text style={styles.actionDescription}>查看本机保存内容和你的控制方式。</Text></View><Text style={styles.actionArrow}>›</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/onboarding')} style={styles.actionRow}>
        <View style={styles.actionMain}><Text style={styles.actionTitle}>重新查看使用指南</Text><Text style={styles.actionDescription}>了解记录方式、数据来源和使用边界。</Text></View><Text style={styles.actionArrow}>›</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/feedback')} style={styles.actionRow}>
        <View style={styles.actionMain}><Text style={styles.actionTitle}>提交本地反馈</Text><Text style={styles.actionDescription}>反馈先保存在本机，不会自动上传。</Text></View><Text style={styles.actionArrow}>›</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/metrics')} style={styles.actionRow}>
        <View style={styles.actionMain}><Text style={styles.actionTitle}>查看本地测试指标</Text><Text style={styles.actionDescription}>只显示动作次数，不记录具体搜索或反馈内容。</Text></View><Text style={styles.actionArrow}>›</Text>
      </Pressable>
    </View>

    <SectionTitle>数据原则</SectionTitle>
    <Card style={styles.principles}>
      {['显示每条食物的数据来源和可信等级', '复杂菜肴明确标记为配方估算', '用户记录仅保存在本机，未来接云服务前重新征求同意', '不把健康数据用于广告画像'].map((item) => <View key={item} style={styles.principleRow}><Text style={styles.check}>✓</Text><Text style={styles.principleText}>{item}</Text></View>)}
    </Card>

    <AndroidUpdateCard />

    <Card style={styles.dataCard}><View style={styles.dataText}><Text style={styles.dataTitle}>本机数据</Text><Text style={styles.dataDescription}>清除饮食记录，保留当前目标和称呼。卸载应用会删除记录、反馈和指标；已关闭系统备份，避免重装后被还原。</Text></View><TextButton label="清除记录" tone="danger" onPress={confirmClear} /></Card>

    <SectionTitle>关于</SectionTitle>
    <Card>
      <Text style={styles.presetLabel}>食衡封闭测试</Text>
      <Text style={styles.presetDescription}>版本 {Constants.expoConfig?.version ?? '1.0.0'} · 底库 {catalogMeta.version}</Text>
      <Text style={styles.aboutBody}>记录只留在这台设备，没有账号和云同步。食品数据来源见隐私说明；中餐家常菜为配方估算，不是实验室实测。</Text>
    </Card>
    <Text style={styles.version}>食衡封闭测试 {Constants.expoConfig?.version ?? '1.0.0'} · {catalogMeta.version}</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5 },
  notice: { backgroundColor: colors.amberSoft, borderColor: '#E9CF9E' }, noticeTitle: { color: colors.amber, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm }, noticeText: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  nameInput: { minHeight: 44, color: colors.ink, fontSize: 16, fontWeight: '600', padding: 0 },
  aboutBody: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },
  presetList: { gap: spacing.md }, preset: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  presetActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft }, presetMain: { flex: 1, gap: 4 }, presetLabel: { color: colors.ink, fontSize: 16, fontWeight: '700' }, presetLabelActive: { color: colors.brandDark },
  presetDescription: { color: colors.inkMuted, fontSize: 12 }, presetValues: { alignItems: 'flex-end', gap: 4 }, presetEnergy: { color: colors.ink, fontSize: 13, fontWeight: '700' }, presetProtein: { color: colors.inkMuted, fontSize: 11 },
  unitRow: { flexDirection: 'row', gap: spacing.sm }, unitChip: { flex: 1, paddingVertical: 12, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  unitChipActive: { backgroundColor: colors.brand, borderColor: colors.brand }, unitChipText: { color: colors.inkMuted, fontSize: 14, fontWeight: '700' }, unitChipTextActive: { color: colors.white },
  principles: { gap: spacing.md }, principleRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }, check: { color: colors.brand, fontSize: 16, fontWeight: '800' }, principleText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 20 },
  actionList: { overflow: 'hidden', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border }, actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, actionMain: { flex: 1, gap: 3 }, actionTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' }, actionDescription: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 }, actionArrow: { color: colors.brand, fontSize: 25, fontWeight: '300' },
  dataCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, dataText: { flex: 1, gap: 3 }, dataTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' }, dataDescription: { color: colors.inkMuted, fontSize: 12 },
  version: { color: colors.inkMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
