import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FoodRow } from '@/components/food-row';
import { Card, PrimaryButton, Screen, SectionTitle } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { catalogMeta, catalogSourceFilters, createFoodIndex, foodCategories, loggedFoodIds, SEARCH_MAX_RESULTS, SEARCH_PAGE_SIZE, searchCatalog, statusForFood } from '@/data/catalog';
import { mergedRecipes } from '@/data/recipes';
import { formatEnergyPair, mealItemNames, recipeEnergyPerServe } from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import { incrementLocalMetric } from '@/services/local-metrics';
import type { CatalogSourceFilter, Food, FoodCategory } from '@/types/nutrition';

const SEARCH_DEBOUNCE_MS = 250;

const quickAdds = [
  { id: 'white-rice-cooked', label: '米饭' },
  { id: 'egg-boiled', label: '鸡蛋' },
  { id: 'tofu-firm', label: '豆腐' },
  { id: 'apple', label: '苹果' },
];

export default function SearchScreen() {
  const { customFoods, favouriteFoodIds, entries, verifiedFoodIds, recipes } = useNutrition();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [category, setCategory] = useState<'all' | FoodCategory>('all');
  const [source, setSource] = useState<CatalogSourceFilter>('common');
  const [limit, setLimit] = useState(SEARCH_PAGE_SIZE);
  const searchKey = `${debouncedQuery}\0${category}\0${source}`;
  const [limitKey, setLimitKey] = useState(searchKey);
  if (limitKey !== searchKey) {
    setLimitKey(searchKey);
    setLimit(SEARCH_PAGE_SIZE);
  }
  const loggedCount = loggedFoodIds(entries).length;
  const foodIndex = createFoodIndex(customFoods);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => searchCatalog({
    customFoods, query: debouncedQuery, category, favouriteFoodIds, entries, verifiedFoodIds, source, limit,
  }), [category, customFoods, entries, favouriteFoodIds, debouncedQuery, source, verifiedFoodIds, limit]);
  const suggested = mergedRecipes(recipes).slice(0, 3);
  const recentIds = [...new Set([...entries].reverse().map((entry) => entry.foodId))].slice(0, 4);
  const recentFoods = recentIds.map((id) => foodIndex[id]).filter(Boolean);
  const showBrowse = query.trim().length > 0 || source !== 'common' || category !== 'all';
  const canLoadMore = (debouncedQuery.trim().length > 0 || source !== 'common' || category !== 'all')
    && results.length === limit
    && limit < SEARCH_MAX_RESULTS;

  const openFood = useCallback((foodId: string) => {
    incrementLocalMetric('food_opened').catch(() => undefined);
    router.push({ pathname: '/food/[id]', params: { id: foodId } });
  }, []);

  const submitSearch = () => incrementLocalMetric(results.length ? 'search_used' : 'search_empty').catch(() => undefined);
  const loadMore = () => {
    if (!canLoadMore) return;
    setLimit((current) => Math.min(current + SEARCH_PAGE_SIZE, SEARCH_MAX_RESULTS));
  };

  const renderItem = useCallback(({ item }: { item: Food }) => (
    <View style={styles.itemWrap}>
      <FoodRow food={item} catalogStatus={statusForFood(item.id, entries, verifiedFoodIds)} onPress={openFood} />
    </View>
  ), [entries, openFood, verifiedFoodIds]);

  const listHeader = (
    <View style={styles.header}>
      <View><Text style={styles.title}>记这一餐</Text><Text style={styles.subtitle}>合菜、油量和份量在下一步确认。空白搜索显示常吃食物，输入后可搜澳洲官方库。</Text></View>
      <View style={styles.searchBox}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} onSubmitEditing={submitSearch} placeholder="青菜、bok choy、叉烧饭、9300652010794…" placeholderTextColor={colors.inkMuted} style={styles.input} autoCapitalize="none" returnKeyType="search" /></View>

      <Text style={styles.sectionLabel}>快速添加</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {quickAdds.map((item) => <Pressable key={item.id} onPress={() => openFood(item.id)} style={styles.quickChip}><Text style={styles.quickText}>{item.label}</Text></Pressable>)}
        <Pressable onPress={() => router.push('/custom-food')} style={[styles.quickChip, styles.quickCustom]}><Text style={styles.quickCustomText}>自定义</Text></Pressable>
      </ScrollView>

      {!showBrowse && <>
        <SectionTitle action={<Pressable onPress={() => router.push('/recipes')}><Text style={styles.link}>全部菜谱</Text></Pressable>}>常吃套餐</SectionTitle>
        {suggested.map((recipe) => <Pressable key={recipe.id} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })} style={styles.recipeCard}>
          <View style={styles.recipeMain}>
            <Text style={styles.recipeName}>{recipe.nameZh}</Text>
            <Text style={styles.recipeMeta}>{mealItemNames(recipe.items.map((item) => ({ id: item.foodId, foodId: item.foodId, servings: item.servings, meal: 'dinner', recordedAt: '' })), foodIndex)} · {recipe.prepMinutes ?? 15} 分钟</Text>
          </View>
          <Text style={styles.recipeEnergy}>{formatEnergyPair(recipeEnergyPerServe(recipe, foodIndex))}</Text>
        </Pressable>)}
        {recentFoods.length > 0 && <>
          <SectionTitle>最近吃过</SectionTitle>
          <Card style={styles.resultsCard}>
            {recentFoods.map((food) => <FoodRow key={food.id} food={food} catalogStatus={statusForFood(food.id, entries, verifiedFoodIds)} onPress={openFood} />)}
          </Card>
        </>}
      </>}

      <Text style={styles.filterLabel}>来源</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {catalogSourceFilters.map((item) => {
          const active = source === item.id;
          const label = item.id === 'logged' ? `${item.label} ${loggedCount}` : item.label;
          return <Pressable key={item.id} onPress={() => setSource(item.id)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
          </Pressable>;
        })}
      </ScrollView>
      <Text style={styles.filterLabel}>分类</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {foodCategories.map((item) => <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.chipActive]}>
          <Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>{item.label}</Text>
        </Pressable>)}
      </ScrollView>
      <View style={styles.resultHeader}><Text style={styles.resultCount}>{results.length} 个结果</Text><Text style={styles.resultMeta}>{catalogueHint(catalogMeta.version)}</Text></View>
    </View>
  );

  return <Screen scroll={false}>
    <FlatList
      style={styles.list}
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>{emptyTitle(source)}</Text><Text style={styles.emptyText}>{emptyText(source)}</Text></View>}
      ListFooterComponent={<View style={styles.footer}>
        {canLoadMore ? <Pressable onPress={loadMore} style={styles.moreButton}><Text style={styles.moreText}>显示更多</Text></Pressable> : null}
        <PrimaryButton label="＋ 创建自定义食品" onPress={() => router.push('/custom-food')} />
      </View>}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={12}
      maxToRenderPerBatch={8}
      windowSize={7}
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
    />
  </Screen>;
}

function catalogueHint(version: string) {
  return `底库 ${version}`;
}

function emptyTitle(source: CatalogSourceFilter) {
  switch (source) {
    case 'logged': return '图鉴还是空的';
    case 'supermarket': return '没有超市包装结果';
    case 'official':
    case 'overseas': return '没有匹配结果';
    default: return '暂时没有找到';
  }
}

function emptyText(source: CatalogSourceFilter) {
  switch (source) {
    case 'logged': return '先记录一餐，对应食物会自动进入图鉴。';
    case 'supermarket': return '可以搜条码、品牌，或改回来源为“常用”。';
    case 'official':
    case 'overseas': return '输入英文名、AFCD 编号或 USDA 关键词。';
    default: return '可以换个关键词，或创建自定义食品。空白搜索只显示常用食物。';
  }
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  header: { gap: spacing.lg, paddingBottom: spacing.md },
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  searchBox: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  searchIcon: { fontSize: 25, color: colors.brand }, input: { flex: 1, color: colors.ink, fontSize: 15 },
  sectionLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  filterLabel: { color: colors.inkMuted, fontSize: 12, fontWeight: '700' },
  quickRow: { gap: spacing.sm, paddingRight: spacing.lg },
  quickChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  quickText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  quickCustom: { backgroundColor: colors.brandSoft, borderColor: '#C1DBC8' },
  quickCustomText: { color: colors.brandDark, fontSize: 14, fontWeight: '800' },
  recipeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  recipeMain: { flex: 1, gap: 4 }, recipeName: { color: colors.ink, fontSize: 16, fontWeight: '800' }, recipeMeta: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  recipeEnergy: { color: colors.brandDark, fontSize: 11, fontWeight: '700', maxWidth: 108, textAlign: 'right' },
  link: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' }, chipTextActive: { color: colors.white }, resultsCard: { paddingTop: spacing.md, paddingBottom: 4 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, resultCount: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  resultMeta: { color: colors.inkMuted, fontSize: 11 }, empty: { paddingVertical: 42, alignItems: 'center', gap: spacing.sm }, emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' }, emptyText: { color: colors.inkMuted, fontSize: 13 },
  itemWrap: { backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  footer: { gap: spacing.lg, paddingTop: spacing.md, paddingBottom: 48 },
  moreButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreText: { color: colors.brand, fontSize: 14, fontWeight: '700' },
});
