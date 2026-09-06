import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import * as Updates from 'expo-updates';
import { Card, PrimaryButton, SectionTitle } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { androidUpdatesEnabled, checkFetchAndReloadAndroidUpdate } from '@/services/android-updates';

export function AndroidUpdateCard() {
  const { currentlyRunning, isUpdateAvailable, isDownloading } = Updates.useUpdates();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (Platform.OS !== 'android') return null;

  const enabled = androidUpdatesEnabled();
  const status = !enabled
    ? '当前会话未启用远程更新。网页不会拉取更新；正式安卓包会在启动时自动检查。'
    : currentlyRunning.isEmbeddedLaunch
      ? '正在使用安装包内的程序。启动时会自动检查更新，下载完成后会重启应用。'
      : '正在使用已下载的更新。饮食记录仍只保存在本机，不会随更新上传。';

  const check = async () => {
    setBusy(true);
    setNotice(null);
    const result = await checkFetchAndReloadAndroidUpdate();
    setBusy(false);
    if (result.status === 'disabled') setNotice('此构建未启用远程更新。');
    if (result.status === 'up-to-date') setNotice('已是最新版本。');
    if (result.status === 'error') setNotice('暂时无法检查更新，请稍后再试。');
  };

  return <>
    <SectionTitle>安卓更新</SectionTitle>
    <Card style={styles.card}>
      <Text style={styles.status}>{status}</Text>
      {enabled && currentlyRunning.runtimeVersion ? <Text style={styles.meta}>运行时 {currentlyRunning.runtimeVersion}{currentlyRunning.channel ? ` · ${currentlyRunning.channel}` : ''}</Text> : null}
      {isUpdateAvailable ? <Text style={styles.meta}>发现新版本，正在准备应用…</Text> : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <View style={styles.action}>
        <PrimaryButton label={busy || isDownloading ? '正在检查…' : '检查更新'} onPress={check} disabled={busy || isDownloading || !enabled} />
      </View>
    </Card>
  </>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  status: { color: colors.ink, fontSize: 13, lineHeight: 21 },
  meta: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  notice: { color: colors.brandDark, fontSize: 12, lineHeight: 18 },
  action: { marginTop: spacing.xs },
});
