import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton, Screen, SourceBadge, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { featuredFoods } from '@/data/foods';
import { createFoodIndex, foodCluster, statusForFood } from '@/data/catalog';
import { pickRepresentative, shortSourceTitle, sourcePriority } from '@/domain/catalog-groups';
import {
  applyOilLevel, catalogStatusLabels, compositionEstimate, confidenceLabels, defaultPortionShare, displayFoodName, displaySourceLabel,
  foodSupportsOilLevel, formatEnergyPair, formatNumber, mealLabels, nutrientsForServing, oilLevelLabels,
  portionChoices, regionLabels, scaleNutrients, suggestedMealSlot,
} from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import type { MealType, OilLevel } from '@/types/nutrition';

const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const oilLevels: OilLevel[] = ['light', 'normal', 'restaurant'];

export function generateStaticParams() {
  return featuredFoods.map((food) => ({ id: food.id }));
}

export default function FoodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addEntry, customFoods, favouriteFoodIds, entries, verifiedFoodIds, toggleFavourite, toggleVerified } = useNutrition();
  const foodIndex = createFoodIndex(customFoods);
  const members = useMemo(() => foodCluster(id, customFoods), [customFoods, id]);
  const defaultId = useMemo(() => (members.length ? pickRepresentative(members).id : id), [id, members]);
  const [activeId, setActiveId] = useState(defaultId);
  const [seenDefaultId, setSeenDefaultId] = useState(defaultId);
  if (seenDefaultId !== defaultId) {
    setSeenDefaultId(defaultId);
    setActiveId(defaultId);
  }
  const food = foodIndex[activeId] ?? foodIndex[id];
  const [servings, setServings] = useState(1);
  const [meal, setMeal] = useState<MealType>(() => suggestedMealSlot());
  const [oilLevel, setOilLevel] = useState<OilLevel>('normal');
  const [sharedWith, setSharedWith] = useState(1);
  const [portionShare, setPortionShare] = useState(1);
  const showOil = food ? foodSupportsOilLevel(food) : false;
  const titleFood = members.find((item) => /[\u4e00-\u9fff]/.test(item.nameZh) && item.nameZh !== item.nameEn) ?? food;
  const sources = useMemo(() => members.slice().sort((a, b) => sourcePriority(b) - sourcePriority(a)), [members]);
  const nutrients = food
    ? scaleNutrients(applyOilLevel(nutrientsForServing(food, servings), oilLevel, showOil), portionShare)
    : null;

  if (!food || !nutrients) return <Screen><Card><Text style={styles.notFound}>找不到这条食物记录。</Text></Card></Screen>;
  const status = statusForFood(food.id, entries, verifiedFoodIds);
  const estimate = compositionEstimate(food, foodIndex);
  const catalogServing = nutrientsForServing(food, 1);
  const save = () => {
    addEntry({ foodId: food.id, servings, meal, oilLevel: showOil ? oilLevel : undefined, sharedWith, portionShare });
    router.replace('/(tabs)');
  };
  const changePeople = (next: number) => {
    const people = Math.min(8, Math.max(1, next));
    setSharedWith(people);
    setPortionShare(defaultPortionShare(people));
  };

  return <Screen>
    <View style={styles.heading}><View style={styles.titleRow}><Text style={styles.title}>{displayFoodName(titleFood ?? food)}</Text><SourceBadge confidence={food.source.confidence} /><Pressable onPress={() => toggleFavourite(food.id)} style={styles.favoriteButton}><Text style={styles.favoriteText}>{favouriteFoodIds.includes(food.id) ? '★ 已收藏' : '☆ 收藏'}</Text></Pressable></View><Text style={styles.subtitle}>{[food.nameEn, food.category === 'mixed' ? '家常菜' : food.source.region === 'US' ? '美国对照' : '澳洲食物'].join(' · ')}</Text></View>
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>资料来源</Text>
      {sources.map((item) => {
        const active = item.id === food.id;
        const per100 = item.nutrientsPer100g;
        return <Pressable key={item.id} onPress={() => setActiveId(item.id)} style={[styles.sourceChoice, active && styles.sourceChoiceActive]}>
          <View style={styles.sourceHeader}><Text style={styles.sourceLabel}>{shortSourceTitle(item)}</Text><SourceBadge confidence={item.source.confidence} /></View>
          <Text style={styles.sourceText}>{displayFoodName(item) !== item.nameEn ? `${displayFoodName(item)} · ${item.nameEn}` : item.nameEn}</Text>
          <Text style={styles.sourceDate}>每100g：{formatEnergyPair(per100.energyKcal)} · 蛋白质 {formatNumber(per100.proteinG, 1)}g · 钠 {formatNumber(per100.sodiumMg)}mg</Text>
          {item.brand ? <Text style={styles.sourceDate}>品牌：{item.brand}{item.stores?.length ? ` · 有售：${item.stores.map((store) => store === 'woolworths' ? 'Woolworths' : 'Coles').join(' / ')}` : ''}</Text> : null}
          {item.barcode ? <Text style={styles.sourceDate}>条码：{item.barcode}</Text> : null}
          {active ? <Text style={styles.sourceDate}>{displaySourceLabel(item.source)} · {regionLabels[item.source.region]} · {confidenceLabels[item.source.confidence]}{status !== 'unseen' && item.id === food.id ? ` · ${catalogStatusLabels[status]}` : ''}</Text> : null}
        </Pressable>;
      })}
      {sources.length > 1 ? <Text style={styles.shareHint}>预览和记餐使用选中来源。默认选最高可信度；美国对照不替代澳洲官方值。</Text> : null}
    </View>
    {estimate ? <Card style={styles.estimateCard}>
      <Text style={styles.sectionLabel}>按食材估算</Text>
      <Text style={styles.sourceText}>{estimate.ingredients.map((item) => `${item.nameZh} ${item.grams}g`).join(' · ')}</Text>
      <Text style={styles.sourceDate}>出锅约 {estimate.yieldGrams}g{estimate.oilGrams ? ` · 用油 ${estimate.oilGrams}g` : ''}</Text>
      <Text style={styles.estimateEnergy}>{formatEnergyPair(estimate.wholeDish.energyKcal)} · 蛋白质 {formatNumber(estimate.wholeDish.proteinG, 1)}g · 脂肪 {formatNumber(estimate.wholeDish.fatG, 1)}g</Text>
      <Text style={styles.sourceDate}>目录记录值 {formatEnergyPair(catalogServing.energyKcal)}，记餐仍用此值。食材估算仅供对照。</Text>
      {estimate.note ? <Text style={styles.sourceDate}>{estimate.note}</Text> : null}
    </Card> : null}

    <View style={styles.section}><Text style={styles.sectionLabel}>份量</Text><Card style={styles.servingCard}>
      <View style={styles.servingCopy}><Text style={styles.servingName} numberOfLines={2}>{food.servingLabel}</Text><Text style={styles.servingGrams}>{food.servingGrams}g × {servings}</Text></View>
      <View style={styles.stepper}><Pressable onPress={() => setServings((value) => Math.max(0.5, value - 0.5))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.servingValue}>{servings}</Text><Pressable onPress={() => setServings((value) => Math.min(5, value + 0.5))} style={styles.stepButton}><Text style={styles.stepText}>＋</Text></Pressable></View>
    </Card></View>

    {showOil ? <View style={styles.section}><Text style={styles.sectionLabel}>用油</Text><View style={styles.chips}>{oilLevels.map((level) => <Pressable key={level} onPress={() => setOilLevel(level)} style={[styles.chip, oilLevel === level && styles.chipActive]}><Text style={[styles.chipText, oilLevel === level && styles.chipTextActive]}>{oilLevelLabels[level]}</Text></Pressable>)}</View></View> : null}

    <View style={styles.section}><Text style={styles.sectionLabel}>合菜分食</Text><Card style={styles.shareCard}>
      <View style={styles.servingCard}>
        <View style={styles.servingCopy}><Text style={styles.servingName}>几个人吃</Text></View>
        <View style={styles.stepper}><Pressable onPress={() => changePeople(sharedWith - 1)} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.servingValue}>{sharedWith}</Text><Pressable onPress={() => changePeople(sharedWith + 1)} style={styles.stepButton}><Text style={styles.stepText}>＋</Text></Pressable></View>
      </View>
      <Text style={styles.shareHint}>默认按人数均分，也可改成你实际吃到的份额。</Text>
      <Text style={styles.shareHint}>我吃了大约</Text>
      <View style={styles.portionGrid}>{portionChoices.map((choice) => <Pressable key={choice.label} onPress={() => setPortionShare(choice.value)} style={[styles.portionChip, Math.abs(portionShare - choice.value) < 0.02 && styles.chipActive]}><Text style={[styles.chipText, Math.abs(portionShare - choice.value) < 0.02 && styles.chipTextActive]}>{choice.label}</Text></Pressable>)}</View>
    </Card></View>

    <View style={styles.section}><Text style={styles.sectionLabel}>记录到</Text><View style={styles.meals}>{meals.map((item) => <Pressable key={item} onPress={() => setMeal(item)} style={[styles.meal, meal === item && styles.mealActive]}><Text style={[styles.mealText, meal === item && styles.mealTextActive]}>{mealLabels[item]}</Text></Pressable>)}</View></View>

    <Card><Text style={styles.sectionLabel}>我的份额估算</Text><Text style={styles.shareHint}>{formatEnergyPair(nutrients.energyKcal)}</Text><View style={styles.nutrientGrid}>
      {[['能量 kJ', formatNumber(nutrients.energyKcal * 4.184), ''], ['能量 kcal', formatNumber(nutrients.energyKcal), ''], ['蛋白质', formatNumber(nutrients.proteinG, 1), 'g'], ['脂肪', formatNumber(nutrients.fatG, 1), 'g'], ['碳水', formatNumber(nutrients.carbsG, 1), 'g'], ['钠', formatNumber(nutrients.sodiumMg), 'mg']].map(([label, value, unit]) => <View key={label} style={styles.nutrient}><Text style={styles.nutrientLabel}>{label}</Text><Text style={styles.nutrientValue}>{value}<Text style={styles.nutrientUnit}>{unit ? ` ${unit}` : ''}</Text></Text></View>)}
    </View></Card>
    {(food.source.confidence === 'estimate' || showOil) && <Text style={styles.estimateNote}>这是个人摄入估算，不是整盘菜热量。用油、酱汁和实际夹取量都会改变结果。</Text>}
    {status !== 'unseen' && <TextButton label={status === 'verified' ? '取消本机核对' : '标记为已核对（本机确认，不是官方审核）'} onPress={() => toggleVerified(food.id)} />}
    <PrimaryButton label={`添加到${mealLabels[meal]}`} onPress={save} />
  </Screen>;
}

const styles = StyleSheet.create({
  heading: { gap: 5 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }, title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 14 }, favoriteButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.amberSoft }, favoriteText: { color: colors.amber, fontSize: 12, fontWeight: '700' },
  sourceChoice: { backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.lg, gap: 4, borderWidth: 1, borderColor: colors.border },
  sourceChoiceActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  estimateCard: { backgroundColor: colors.surface, gap: 6 }, estimateEnergy: { color: colors.brandDark, fontSize: 13, fontWeight: '700', marginTop: 2 }, sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm }, sourceLabel: { color: colors.brandDark, fontSize: 12, fontWeight: '800', flex: 1 },
  region: { color: colors.brand, fontSize: 11, fontWeight: '800' }, sourceText: { color: colors.ink, fontSize: 13, lineHeight: 20 }, sourceDate: { color: colors.inkMuted, fontSize: 10, marginTop: spacing.sm },
  section: { gap: spacing.sm }, sectionLabel: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  servingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  shareCard: { gap: spacing.md },
  servingCopy: { flex: 1, minWidth: 0, paddingRight: spacing.sm },
  servingName: { color: colors.ink, fontSize: 16, fontWeight: '700' }, servingGrams: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 0 },
  stepButton: { width: 38, height: 38, borderRadius: radii.pill, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.brand, fontSize: 20, fontWeight: '700' }, servingValue: { minWidth: 28, color: colors.ink, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  portionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  portionChip: { width: '31%', paddingVertical: 10, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' }, chipTextActive: { color: colors.white },
  shareHint: { color: colors.inkMuted, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  meals: { flexDirection: 'row', gap: spacing.sm }, meal: { flex: 1, paddingVertical: 11, borderRadius: radii.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }, mealActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  mealText: { color: colors.inkMuted, fontSize: 13, fontWeight: '600' }, mealTextActive: { color: colors.white }, nutrientGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, rowGap: spacing.lg },
  nutrient: { width: '33.333%', gap: 4 }, nutrientLabel: { color: colors.inkMuted, fontSize: 11 }, nutrientValue: { color: colors.ink, fontSize: 18, fontWeight: '800' }, nutrientUnit: { color: colors.inkMuted, fontSize: 10, fontWeight: '500' },
  estimateNote: { color: colors.amber, fontSize: 12, lineHeight: 19, backgroundColor: colors.amberSoft, padding: spacing.md, borderRadius: radii.sm }, notFound: { color: colors.red, fontSize: 14, textAlign: 'center' },
});
