import { Tabs } from 'expo-router';
import { ColorValue, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';

function TabIcon({ color, focused, icon, activeIcon }: { color: ColorValue; focused: boolean; icon: string; activeIcon: string }) {
  return <Text style={[styles.icon, { color }]}>{focused ? activeIcon : icon}</Text>;
}

export default function TabLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.brand,
    tabBarInactiveTintColor: colors.inkMuted,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 78, paddingTop: 8, paddingBottom: 12, elevation: 0 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
  }}>
    <Tabs.Screen name="index" options={{ title: '今天', tabBarIcon: (props) => <TabIcon {...props} icon="⌂" activeIcon="⌂" /> }} />
    <Tabs.Screen name="search" options={{ title: '记餐', tabBarIcon: (props) => <TabIcon {...props} icon="⌕" activeIcon="⌕" /> }} />
    <Tabs.Screen name="recipes" options={{ title: '菜谱', tabBarIcon: (props) => <TabIcon {...props} icon="▣" activeIcon="▣" /> }} />
    <Tabs.Screen name="log" options={{ title: '日志', tabBarIcon: (props) => <TabIcon {...props} icon="▤" activeIcon="▥" /> }} />
    <Tabs.Screen name="profile" options={{ title: '我的', tabBarIcon: (props) => <TabIcon {...props} icon="♙" activeIcon="♟" /> }} />
  </Tabs>;
}

const styles = StyleSheet.create({ icon: { fontSize: 21, lineHeight: 23, fontWeight: '700' } });
