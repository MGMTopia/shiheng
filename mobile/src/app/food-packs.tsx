import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, LoadingScreen, PrimaryButton, Screen, SectionTitle, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useFoodPacks } from '@/data/food-pack-provider';
import { useSession } from '@/store/nutrition-store';

export default function FoodPacksScreen() {
  const { hydrated } = useSession();
  const { available, state, busy, message, download, enable, disable, uninstall } = useFoodPacks();
  if (!hydrated) return <LoadingScreen />;

  const installedIds = new Set(state.packs.map((pack) => pack.id));
  const enabledAttribution = state.packs.filter((pack) => pack.enabled && pack.attribution);

  return <Screen>
    <View>
      <Text style={styles.title}>食品资料包</Text>
      <Text style={styles.subtitle}>可选离线包装食品库。仅在 Wi‑Fi 下手动下载，校验通过后才启用。不会写入 APK，也不会自动更新。</Text>
    </View>

    {Platform.OS === 'web' ? (
      <Card style={styles.notice}>
        <Text style={styles.noticeTitle}>网页版不可用</Text>
        <Text style={styles.noticeText}>资料包下载与启用仅支持手机应用。网页仍使用随包底库。</Text>
      </Card>
    ) : null}

    <SectionTitle>可下载</SectionTitle>
    {available.map((pack) => {
      const installed = state.packs.find((row) => row.id === pack.id);
      const manifest = pack.manifest;
      return <Card key={pack.id} style={styles.packCard}>
        <Text style={styles.packTitle}>{manifest.title}</Text>
        {manifest.titleEn ? <Text style={styles.packTitleEn}>{manifest.titleEn}</Text> : null}
        <Text style={styles.packBody}>{manifest.description}</Text>
        <Text style={styles.packMeta}>
          {manifest.foodCount} 条 · v{manifest.version} · {manifest.licence}
          {installed ? ` · 本机${installed.enabled ? '已启用' : '已停用'}` : ' · 未安装'}
        </Text>
        <View style={styles.actions}>
          {!installed ? (
            <PrimaryButton
              label={busy ? '处理中…' : 'Wi‑Fi 下载并启用'}
              onPress={() => {
                Alert.alert(
                  '下载食品资料包？',
                  '请确认已连接 Wi‑Fi。下载后会校验 SHA-256，不符则拒绝启用。数据来自 Open Food Facts（ODbL）。',
                  [
                    { text: '取消', style: 'cancel' },
                    { text: '下载', onPress: () => { void download(pack.id); } },
                  ],
                );
              }}
              disabled={busy || Platform.OS === 'web'}
            />
          ) : (
            <>
              {installed.enabled ? (
                <Pressable disabled={busy} onPress={() => { void disable(pack.id); }} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>停用</Text>
                </Pressable>
              ) : (
                <PrimaryButton label={busy ? '处理中…' : '重新启用'} onPress={() => { void enable(pack.id); }} disabled={busy} />
              )}
              <TextButton
                label="卸载"
                tone="danger"
                onPress={() => Alert.alert(
                  '卸载资料包？',
                  '会删除本机资料包文件。日记记录不会删除；之后新查找只使用底库和自定义食品。',
                  [
                    { text: '取消', style: 'cancel' },
                    { text: '卸载', style: 'destructive', onPress: () => { void uninstall(pack.id); } },
                  ],
                )}
              />
            </>
          )}
        </View>
      </Card>;
    })}

    {enabledAttribution.length ? (
      <>
        <SectionTitle>数据署名（ODbL）</SectionTitle>
        <Card style={styles.attribution}>
          {enabledAttribution.map((pack) => (
            <View key={pack.id} style={styles.attrBlock}>
              <Text style={styles.attrTitle}>{pack.title}</Text>
              <Text style={styles.attrBody}>{pack.attribution}</Text>
            </View>
          ))}
        </Card>
      </>
    ) : null}

    {!installedIds.size ? (
      <Card>
        <Text style={styles.packBody}>未安装任何资料包时，搜索与条码行为与现在一致，只使用随包底库和自定义食品。</Text>
      </Card>
    ) : null}

    {message ? <Text style={styles.message}>{message}</Text> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  notice: { backgroundColor: colors.amberSoft, borderColor: '#E9CF9E' },
  noticeTitle: { color: colors.amber, fontSize: 14, fontWeight: '800', marginBottom: spacing.sm },
  noticeText: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  packCard: { gap: spacing.sm },
  packTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  packTitleEn: { color: colors.inkMuted, fontSize: 12 },
  packBody: { color: colors.inkMuted, fontSize: 13, lineHeight: 20 },
  packMeta: { color: colors.inkMuted, fontSize: 12 },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  secondaryBtn: {
    minHeight: 44, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg,
  },
  secondaryBtnText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  attribution: { gap: spacing.md, backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' },
  attrBlock: { gap: 4 },
  attrTitle: { color: colors.brandDark, fontSize: 13, fontWeight: '800' },
  attrBody: { color: colors.ink, fontSize: 12, lineHeight: 19 },
  message: { color: colors.brandDark, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
