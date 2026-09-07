import { Alert, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Card, LoadingScreen, PrimaryButton, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useFoodRepository } from '@/data/food-repository-context';
import { describeBackupPreview, diaryToCsv, inspectBackup, serializeBackupFile } from '@/domain/backup';
import { pickTextFile, shareTextFile } from '@/services/backup-files';
import { useNutrition } from '@/store/nutrition-store';

export default function DataScreen() {
  const { hydrated, currentSnapshot, replaceSnapshot, markBackupSaved, lastBackupAt, customFoods } = useNutrition();
  const foods = useFoodRepository();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  if (!hydrated) return <LoadingScreen />;

  const exportJson = async () => {
    setBusy(true);
    setMessage('');
    try {
      const snapshot = currentSnapshot();
      const exportedAt = new Date().toISOString();
      const preview = inspectBackup(serializeBackupFile(snapshot, exportedAt));
      const summary = preview.ok ? describeBackupPreview(preview.preview) : '将导出当前本机记录。';
      Alert.alert('导出 JSON 备份', `${summary}\n\n文件只保存在你选择的位置，不会上传。`, [
        { text: '取消', style: 'cancel' },
        { text: '导出', onPress: () => { void (async () => {
          try {
            await shareTextFile(`shiheng-backup-${exportedAt.slice(0, 10)}.json`, serializeBackupFile(snapshot, exportedAt), 'application/json');
            markBackupSaved(exportedAt);
            setMessage('备份已交给系统分享。');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : '导出失败。');
          } finally {
            setBusy(false);
          }
        })(); } },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    setBusy(true);
    setMessage('');
    try {
      const snapshot = currentSnapshot();
      const foodIndex = foods.getByIds(snapshot.entries.map((entry) => entry.foodId), customFoods);
      const csv = diaryToCsv(snapshot.entries, foodIndex);
      await shareTextFile(`shiheng-diary-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv');
      setMessage('CSV 已交给系统分享。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导出失败。');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setMessage('');
    try {
      const picked = await pickTextFile();
      if (!picked) return;
      const inspected = inspectBackup(picked.contents);
      if (!inspected.ok) {
        setMessage(inspected.error);
        return;
      }
      const { preview, snapshot } = inspected;
      Alert.alert(
        '恢复前确认',
        `${describeBackupPreview(preview)}${preview.warnings.length ? `\n\n${preview.warnings.join('\n')}` : ''}\n\n恢复会替换当前本机记录，可先取消并导出当前数据。`,
        [
          { text: '取消', style: 'cancel' },
          { text: '恢复', style: 'destructive', onPress: () => {
            replaceSnapshot(snapshot);
            setMessage('已从备份恢复。');
          } },
        ],
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法读取备份文件。');
    } finally {
      setBusy(false);
    }
  };

  return <Screen>
    <View><Text style={styles.title}>备份与导出</Text><Text style={styles.subtitle}>记录只留在本机。备份文件由你自己保存和恢复。</Text></View>
    <Card>
      <Text style={styles.label}>最近一次备份</Text>
      <Text style={styles.body}>{lastBackupAt ? new Date(lastBackupAt).toLocaleString('zh-CN') : '尚未备份'}</Text>
    </Card>
    <SectionTitle>备份内容</SectionTitle>
    <Card>
      <Text style={styles.body}>JSON 备份包含饮食记录、个人资料、收藏、自定义食品和家庭菜谱，恢复时会执行版本迁移。</Text>
      <Text style={styles.body}>CSV 只导出饮食日志，方便自己做表分析，不能用于完整恢复。</Text>
    </Card>
    <PrimaryButton label={busy ? '处理中…' : '导出 JSON 备份'} onPress={() => { void exportJson(); }} disabled={busy} />
    <TextButton label="导出 CSV 饮食日志" onPress={() => { void exportCsv(); }} />
    <TextButton label="从 JSON 备份恢复" onPress={() => { void restore(); }} />
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '700', marginBottom: spacing.sm },
  body: { color: colors.inkMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.sm },
  message: { color: colors.brandDark, fontSize: 13, lineHeight: 20 },
});
