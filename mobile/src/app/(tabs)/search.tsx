import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FoodRow } from '@/components/food-row';
import { Card, Screen } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { foodCategories, foods } from '@/data/foods';
import { FoodCategory } from '@/types/nutrition';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | FoodCategory>('all');
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return foods.filter((food) => (category === 'all' || food.category === category) && (!needle ||
      food.nameZh.includes(needle) || food.nameEn.toLowerCase().includes(needle) || food.aliases.some((alias) => alias.toLowerCase().includes(needle))));
  }, [category, query]);

  return <Screen>
    <View><Text style={styles.title}>查食物</Text><Text style={styles.subtitle}>支持中英文名称，首批数据用于验证记录流程。</Text></View>
    <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="米饭、salmon、番茄炒蛋…" placeholderTextColor={colors.inkMuted} style={styles.input} autoCapitalize="none" returnKeyType="search" /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {foodCategories.map((item) => <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.chipActive]}>
        <Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>{item.label}</Text>
      </Pressable>)}
    </ScrollView>
    <Card style={styles.resultsCard}>
      <View style={styles.resultHeader}><Text style={styles.resultCount}>{results.length} 个结果</Text><Text style={styles.resultMeta}>点击查看份量与来源</Text></View>
      {results.map((food) => <FoodRow key={food.id} food={food} onPress={() => router.push({ pathname: '/food/[id]', params: { id: food.id } })} />)}
      {results.length === 0 && <View style={styles.empty}><Text style={styles.emptyTitle}>暂时没有找到</Text><Text style={styles.emptyText}>后续将加入标签OCR和用户提交审核流程。</Text></View>}
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5 },
  searchBox: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  searchIcon: { fontSize: 25, color: colors.brand }, input: { flex: 1, color: colors.ink, fontSize: 15 }, chips: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' }, chipTextActive: { color: colors.white }, resultsCard: { paddingTop: spacing.md, paddingBottom: 4 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: spacing.sm }, resultCount: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  resultMeta: { color: colors.inkMuted, fontSize: 11 }, empty: { paddingVertical: 42, alignItems: 'center', gap: spacing.sm }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' }, emptyText: { color: colors.inkMuted, fontSize: 13 },
});
