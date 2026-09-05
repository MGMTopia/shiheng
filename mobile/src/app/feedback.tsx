import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, PrimaryButton, Screen, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { incrementLocalMetric } from '@/services/local-metrics';

const FEEDBACK_KEY = '@shiheng/feedback/v1';
const categories = [
  { id: 'bug', label: '遇到问题' }, { id: 'food', label: '找不到食物' }, { id: 'idea', label: '功能建议' }, { id: 'other', label: '其他' },
] as const;

type FeedbackCategory = typeof categories[number]['id'];
type FeedbackItem = { id: string; category: FeedbackCategory; message: string; contact: string; createdAt: string };

export default function FeedbackScreen() {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    AsyncStorage.getItem(FEEDBACK_KEY).then((raw) => {
      if (!raw) return;
      const items = JSON.parse(raw) as unknown;
      if (Array.isArray(items)) setSavedCount(items.length);
    }).catch(() => undefined);
  }, []);

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('还差一点', '请先写下你的问题或建议。');
      return;
    }
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem(FEEDBACK_KEY);
      const previous = raw ? JSON.parse(raw) as FeedbackItem[] : [];
      const item: FeedbackItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, category, message: trimmed, contact: contact.trim(), createdAt: new Date().toISOString() };
      await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify([...previous, item]));
      await incrementLocalMetric('feedback_saved');
      setMessage('');
      setContact('');
      setSavedCount(previous.length + 1);
      setSuccess('已保存在本机，当前版本不会自动上传。');
    } catch {
      Alert.alert('保存失败', '反馈没有离开本机，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  const clearSavedFeedback = () => Alert.alert('清除本机反馈？', `将删除这台设备上的${savedCount}条反馈，无法撤销。`, [
    { text: '取消', style: 'cancel' },
    { text: '清除', style: 'destructive', onPress: () => AsyncStorage.removeItem(FEEDBACK_KEY).then(() => { setSavedCount(0); setSuccess('本机反馈已清除。'); }).catch(() => Alert.alert('清除失败', '请稍后再试。')) },
  ]);

  return <Screen>
    <View style={styles.header}><Text style={styles.title}>给我们反馈</Text><Text style={styles.subtitle}>帮助我们把澳洲日常饮食记录做得更好。</Text></View>
    <Card style={styles.localNotice}><Text style={styles.localTitle}>本地保存提示</Text><Text style={styles.localBody}>反馈会先保存在本机，不会自动上传。请不要填写病历、身份证号或其他敏感信息。</Text></Card>

    <View style={styles.field}><Text style={styles.label}>反馈类型</Text><View style={styles.categoryList}>{categories.map((item) => <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.category, category === item.id && styles.categoryActive]}><Text style={[styles.categoryText, category === item.id && styles.categoryTextActive]}>{item.label}</Text></Pressable>)}</View></View>
    <View style={styles.field}><Text style={styles.label}>具体内容</Text><TextInput value={message} onChangeText={(value) => { setMessage(value); setSuccess(''); }} multiline numberOfLines={6} textAlignVertical="top" placeholder="例如：搜索某种食物时没有结果，或记录流程哪里不顺手…" placeholderTextColor={colors.inkMuted} style={[styles.input, styles.messageInput]} maxLength={1000} /><Text style={styles.counter}>{message.length}/1000</Text></View>
    <View style={styles.field}><Text style={styles.label}>联系方式（可选）</Text><TextInput value={contact} onChangeText={setContact} placeholder="邮箱或其他方便联系的方式" placeholderTextColor={colors.inkMuted} style={styles.input} autoCapitalize="none" maxLength={120} /></View>
    <PrimaryButton label={saving ? '正在保存…' : '保存反馈'} onPress={submit} disabled={saving} />
    {success ? <Card style={styles.successCard}><Text style={styles.successText}>{success}</Text></Card> : null}
    <View style={styles.savedRow}><Text style={styles.savedText}>本机已保存 {savedCount} 条反馈</Text>{savedCount > 0 ? <TextButton label="清除本机反馈" tone="danger" onPress={clearSavedFeedback} /> : null}</View>
    <Text style={styles.footer}>当前版本不会把反馈发送给第三方；你可以在这里清除反馈，或卸载应用移除全部本机数据。</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { gap: 5 }, title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13 },
  localNotice: { backgroundColor: colors.amberSoft, borderColor: '#E9CF9E' }, localTitle: { color: colors.amber, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm }, localBody: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  field: { gap: spacing.sm }, label: { color: colors.ink, fontSize: 14, fontWeight: '700' }, categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, category: { paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, categoryActive: { backgroundColor: colors.brand, borderColor: colors.brand }, categoryText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' }, categoryTextActive: { color: colors.white },
  input: { minHeight: 50, paddingHorizontal: spacing.md, paddingVertical: spacing.md, color: colors.ink, fontSize: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md }, messageInput: { minHeight: 140 }, counter: { color: colors.inkMuted, fontSize: 11, textAlign: 'right', marginTop: -4 }, successCard: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' }, successText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' }, savedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md }, savedText: { color: colors.inkMuted, fontSize: 12 }, footer: { color: colors.inkMuted, fontSize: 11, lineHeight: 18, textAlign: 'center', marginBottom: spacing.lg },
});
