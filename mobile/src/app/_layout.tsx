import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';
import { NutritionProvider } from '@/store/nutrition-store';

const appTheme = {
  ...DefaultTheme,
  dark: false,
  colors: { ...DefaultTheme.colors, primary: colors.brand, background: colors.background, card: colors.surface, text: colors.ink, border: colors.border, notification: colors.amber },
};

export default function RootLayout() {
  return <NutritionProvider>
    <ThemeProvider value={appTheme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerTintColor: colors.ink, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="food/[id]" options={{ title: '添加食物', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  </NutritionProvider>;
}
