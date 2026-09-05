import React, { ErrorInfo, PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

type ErrorBoundaryState = { error: Error | null };

/**
 * Keeps a rendering failure inside a recoverable, plain-language screen.
 * The boundary intentionally does not report anything remotely.
 */
export class AppErrorBoundary extends React.Component<PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics local and out of the UI; a future opt-in reporter can hook here.
    if (__DEV__) console.error('食衡界面错误', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return <View style={styles.screen}>
      <View style={styles.mark}><Text style={styles.markText}>食衡</Text></View>
      <Text style={styles.title}>页面暂时出错了</Text>
      <Text style={styles.body}>你的本机饮食记录仍保留在设备上。可以先重试；如果问题持续，请通过“我的”页反馈。</Text>
      <Pressable onPress={this.reset} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>重新加载页面</Text>
      </Pressable>
    </View>;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: colors.background },
  mark: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.brand, marginBottom: spacing.lg },
  markText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  body: { maxWidth: 320, marginTop: spacing.md, color: colors.inkMuted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  button: { minHeight: 50, minWidth: 180, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.brand, marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.78 },
});
