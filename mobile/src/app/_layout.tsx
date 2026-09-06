import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { colors } from '@/constants/theme';
import { AndroidUpdateGate } from '@/components/android-update-gate';
import { AppErrorBoundary } from '@/components/error-boundary';
import { NutritionProvider } from '@/store/nutrition-store';
import { incrementLocalMetric } from '@/services/local-metrics';

const ONBOARDING_KEY = '@shiheng/onboarding-complete/v1';

const appTheme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, primary: colors.brand, background: colors.background, card: colors.surface, text: colors.ink, border: colors.border, notification: colors.amber },
};

function FirstUseGate() {
  const segments = useSegments();
  const router = useRouter();
  const currentRoute = segments[0];
  const publicRoute = currentRoute === 'onboarding' || currentRoute === 'privacy' || currentRoute === 'feedback';

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_KEY).catch(() => null).then((value) => {
      if (!active) return;
      if (value !== 'done' && !publicRoute) router.replace('/onboarding');
    });
    return () => { active = false; };
  }, [publicRoute, router]);
  return null;
}

function AppOpenMetric() {
  useEffect(() => { incrementLocalMetric('app_opened').catch(() => undefined); }, []);
  return null;
}

export default function RootLayout() {
  return <AppErrorBoundary>
    <NutritionProvider>
      <ThemeProvider value={appTheme}>
        <StatusBar style="dark" />
        <AppOpenMetric />
        <AndroidUpdateGate />
        <FirstUseGate />
        <Stack screenOptions={{ headerTintColor: colors.ink, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="custom-food" options={{ title: '自定义食品', presentation: 'modal' }} />
          <Stack.Screen name="recipe/[id]" options={{ title: '套餐' }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="privacy" options={{ title: '隐私与数据' }} />
          <Stack.Screen name="feedback" options={{ title: '反馈' }} />
          <Stack.Screen name="metrics" options={{ title: '本地测试指标' }} />
        </Stack>
      </ThemeProvider>
    </NutritionProvider>
  </AppErrorBoundary>;
}
