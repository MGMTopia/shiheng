import { Tabs } from 'expo-router';
import { ColorValue, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';

const tabIcon = (icon: string, activeIcon: string) => ({ color, focused }: { color: ColorValue; focused: boolean }) =>
  <Text style={[styles.icon, { color }]}>{focused ? activeIcon : icon}</Text>;

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.inkMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 78, paddingTop: 8, paddingBottom: 12, elevation: 0 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  }}>
    <Tabs.Screen name="index" options={{ title: '今天', tabBarIcon: tabIcon('⌂', '⌂') }} />
    <Tabs.Screen name="search" options={{ title: '记餐', tabBarIcon: tabIcon('⌕', '⌕') }} />
    <Tabs.Screen name="recipes" options={{ title: '菜谱', tabBarIcon: tabIcon('▣', '▣') }} />
    <Tabs.Screen name="log" options={{ title: '日志', tabBarIcon: tabIcon('▤', '▥') }} />
    <Tabs.Screen name="profile" options={{ title: '我的', tabBarIcon: tabIcon('♙', '♟') }} />
  </Tabs>;
}

const styles = StyleSheet.create({ icon: { fontSize: 21, lineHeight: 23, fontWeight: '700' } });
