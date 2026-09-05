import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, Screen, SectionTitle } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { readLocalMetrics } from '@/services/local-metrics';
import type { LocalMetricName, LocalMetrics } from '@/services/local-metrics';

const labels: Record<LocalMetricName, string> = {
  app_opened: '应用打开', search_used: '完成搜索', search_empty: '搜索无结果', food_opened: '查看食物', entry_added: '添加记录',
  entry_deleted: '删除记录', entry_copied: '复制记录', meal_copied: '复制整餐', recipe_saved: '保存家庭菜谱', recipe_logged: '记录套餐', custom_food_created: '创建自定义食品', favourite_toggled: '切换收藏',
  onboarding_completed: '完成首次引导', feedback_saved: '保存反馈', storage_recovery: '存储恢复', food_verified: '本机核对食物',
};

export default function MetricsScreen() {
  const [metrics, setMetrics] = useState<LocalMetrics | null>(null);

  useEffect(() => {
    readLocalMetrics().then(setMetrics).catch(() => setMetrics({ schemaVersion: 1, counters: {}, lastUpdatedAt: null }));
  }, []);

  if (!metrics) return <LoadingScreen />;
  const rows = (Object.entries(labels) as [LocalMetricName, string][]).filter(([name]) => (metrics.counters[name] ?? 0) > 0);

  return <Screen>
    <View style={styles.header}><Text style={styles.title}>本地测试指标</Text><Text style={styles.subtitle}>用于封闭测试判断记录流程是否顺畅。</Text></View>
    <Card style={styles.notice}><Text style={styles.noticeTitle}>不上传、不追踪内容</Text><Text style={styles.noticeBody}>这里只统计动作次数，不保存搜索词、食物名称、反馈正文或联系方式。卸载应用会移除这些计数。</Text></Card>
    <SectionTitle>累计动作</SectionTitle>
    <Card style={styles.table}>
      {rows.length ? rows.map(([name, label], index) => <View key={name} style={[styles.row, index < rows.length - 1 && styles.border]}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{metrics.counters[name] ?? 0}</Text></View>) : <Text style={styles.empty}>还没有测试动作。完成一次搜索或记录后再回来查看。</Text>}
    </Card>
    <Text style={styles.updated}>最近更新：{metrics.lastUpdatedAt ? new Date(metrics.lastUpdatedAt).toLocaleString('zh-CN') : '暂无'}</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { gap: 5 }, title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13 },
  notice: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' }, noticeTitle: { color: colors.brandDark, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm }, noticeBody: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  table: { paddingVertical: 4 }, row: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.ink, fontSize: 14, fontWeight: '600' }, value: { color: colors.brand, fontSize: 18, fontWeight: '800' }, empty: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, paddingVertical: spacing.lg, textAlign: 'center' }, updated: { color: colors.inkMuted, fontSize: 11, textAlign: 'center' },
});
