import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { useNutrition } from '@/store/nutrition-store';

export function StorageRecoveryBanner() {
  const { loadState, loadError, startFreshAfterFailure, retryLoad } = useNutrition();
  if (loadState !== 'failed') return null;

  const reason = loadError === 'invalid-json'
    ? '本机记录文件已损坏'
    : loadError === 'not-object'
      ? '本机记录格式无法识别'
      : '读取本机记录失败';

  return <View style={styles.banner}>
    <Text style={styles.title}>{reason}</Text>
    <Text style={styles.body}>已暂停自动保存，避免把空数据写回覆盖原内容。可以重试读取；若确认这是首次使用，再开始空白记录。</Text>
    <View style={styles.actions}>
      <Pressable onPress={retryLoad} style={styles.button}><Text style={styles.buttonText}>重试读取</Text></Pressable>
      <Pressable onPress={() => { void startFreshAfterFailure(); }} style={styles.ghost}>
        <Text style={styles.ghostText}>开始空白记录</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.amberSoft, borderRadius: radii.md, padding: spacing.lg, gap: spacing.sm, borderWidth: 1, borderColor: '#E9CF9E' },
  title: { color: colors.amber, fontSize: 14, fontWeight: '800' },
  body: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' },
  button: { backgroundColor: colors.brand, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8 },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: '700' },
  ghost: { paddingHorizontal: 10, paddingVertical: 8 },
  ghostText: { color: colors.amber, fontSize: 13, fontWeight: '700' },
});
