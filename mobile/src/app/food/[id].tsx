import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, PrimaryButton, Screen, SourceBadge, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { packagedFoods } from '@/data/packaged-foods';
import { foods as seedFoods } from '@/data/seed-foods';
import { useFoodRepository } from '@/data/food-repository-context';
import { statusForFood } from '@/data/catalog-constants';
import { pickRepresentative, shortSourceTitle, sourcePriority } from '@/domain/catalog-groups';
import {
  applyOilLevel, catalogStatusLabels, compositionEstimate, confidenceLabels, dateKeyToRecordedAt, defaultPortionShare, displayFoodName, displaySourceLabel,
  foodSupportsOilLevel, formatEnergyPair, formatNumber, massFromServings, mealLabels, nutrientsForServing, oilLevelLabels,
  portionChoices, regionLabels, scaleNutrients, servingMassUnit, servingsFromMass, suggestedMealSlot,
} from '@/domain/nutrition';
import { useDiary, usePersonalFoods } from '@/store/nutrition-store';
import type { MealType, OilLevel } from '@/types/nutrition';

const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const oilLevels: OilLevel[] = ['light', 'normal', 'restaurant'];

export function generateStaticParams() {
  return [...seedFoods, ...packagedFoods].map((food) => ({ id: food.id }));
}

export default function FoodDetailScreen() {
  const { id, dateKey, replaceEntryId } = useLocalSearchParams<{ id: string; dateKey?: string; replaceEntryId?: string }>();
  const { addEntry, updateEntry, portionMemory, entries } = useDiary();
  const { customFoods, favouriteFoodIds, verifiedFoodIds, toggleFavourite, toggleVerified } = usePersonalFoods();
  const foods = useFoodRepository();
  const members = useMemo(() => foods.cluster(id, customFoods), [customFoods, foods, id]);
  const foodIndex = useMemo(() => foods.getByIds([
    id,
    ...members.flatMap((food) => [food.id, ...(food.composition?.ingredients.map((item) => item.foodId) ?? [])]),
  ], customFoods), [customFoods, foods, id, members]);
  const defaultId = useMemo(() => (members.length ? pickRepresentative(members).id : id), [id, members]);
  const [activeId, setActiveId] = useState(defaultId);
  const [seenDefaultId, setSeenDefaultId] = useState(defaultId);
  if (seenDefaultId !== defaultId) {
    setSeenDefaultId(defaultId);
    setActiveId(defaultId);
  }
  const food = foodIndex[activeId] ?? foodIndex[id];
  const remembered = food ? portionMemory[food.id] : undefined;
  const [servings, setServings] = useState(remembered?.servings ?? 1);
  const [meal, setMeal] = useState<MealType>(() => remembered?.meal ?? suggestedMealSlot());
  const [oilLevel, setOilLevel] = useState<OilLevel>(remembered?.oilLevel ?? 'normal');
  const [sharedWith, setSharedWith] = useState(remembered?.sharedWith ?? 1);
  const [portionShare, setPortionShare] = useState(remembered?.portionShare ?? 1);
  const [per100, setPer100] = useState(false);
  const [massText, setMassText] = useState<string | null>(null);
  const showOil = food ? foodSupportsOilLevel(food) : false;
  const massUnit = food ? servingMassUnit(food) : 'g';
  const titleFood = members.find((item) => /[\u4e00-\u9fff]/.test(item.nameZh) && item.nameZh !== item.nameEn) ?? food;
  const sources = useMemo(() => members.slice().sort((a, b) => sourcePriority(b) - sourcePriority(a)), [members]);
  const nutrients = food
    ? scaleNutrients(applyOilLevel(nutrientsForServing(food, servings), oilLevel, showOil), portionShare)
    : null;
  const displayNutrients = food
    ? (per100 ? food.nutrientsPer100g : nutrients)
    : null;

  if (!food || !nutrients || !displayNutrients) return <Screen><Card><Text style={styles.notFound}>找不到这条食物记录。</Text></Card></Screen>;
  const status = statusForFood(food.id, entries, verifiedFoodIds);
  const estimate = compositionEstimate(food, foodIndex);
  const catalogServing = nutrientsForServing(food, 1);
  const save = () => {
    const payload = {
      foodId: food.id,
      servings,
      meal,
      oilLevel: showOil ? oilLevel : undefined,
      sharedWith,
      portionShare,
      recordedAt: dateKey ? dateKeyToRecordedAt(Array.isArray(dateKey) ? dateKey[0] : dateKey) : undefined,
    };
    const replaceId = Array.isArray(replaceEntryId) ? replaceEntryId[0] : replaceEntryId;
    if (replaceId) updateEntry(replaceId, payload);
    else addEntry({ ...payload, dateKey: Array.isArray(dateKey) ? dateKey[0] : dateKey });
    router.replace(dateKey ? '/(tabs)/log' : '/(tabs)');
  };
  const changePeople = (next: number) => {
    const people = Math.min(8, Math.max(1, next));
    setSharedWith(people);
    setPortionShare(defaultPortionShare(people));
  };

  return <Screen>
    <View style={styles.heading}><View style={styles.titleRow}><Text style={styles.title}>{displayFoodName(titleFood ?? food)}</Text><SourceBadge confidence={food.source.confidence} dataset={food.source.dataset} /><Pressable onPress={() => toggleFavourite(food.id)} style={styles.favoriteButton}><Text style={styles.favoriteText}>{favouriteFoodIds.includes(food.id) ? '★ 已收藏' : '☆ 收藏'}</Text></Pressable></View><Text style={styles.subtitle}>{[food.nameEn, food.category === 'mixed' ? '家常菜' : food.source.region === 'US' ? '美国对照' : '澳洲食物'].join(' · ')}</Text></View>
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>资料来源</Text>
      {sources.map((item) => {
        const active = item.id === food.id;
        const per100 = item.nutrientsPer100g;
        return <Pressable key={item.id} onPress={() => setActiveId(item.id)} style={[styles.sourceChoice, active && styles.sourceChoiceActive]}>
          <View style={styles.sourceHeader}><Text style={styles.sourceLabel}>{shortSourceTitle(item)}</Text><SourceBadge confidence={item.source.confidence} dataset={item.source.dataset} /></View>
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
      <View style={styles.servingCopy}><Text style={styles.servingName} numberOfLines={2}>{food.servingLabel}</Text><Text style={styles.servingGrams}>{food.servingGrams}{massUnit} × {servings}{remembered ? ' · 上次份量' : ''}</Text></View>
      <View style={styles.stepper}><Pressable onPress={() => { setMassText(null); setServings((value) => Math.max(0.5, value - 0.5)); }} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable><Text style={styles.servingValue}>{servings}</Text><Pressable onPress={() => { setMassText(null); setServings((value) => Math.min(5, value + 0.5)); }} style={styles.stepButton}><Text style={styles.stepText}>＋</Text></Pressable></View>
    </Card>
    <View style={styles.massRow}>
      <TextInput
        value={massText ?? String(massFromServings(food, servings))}
        onFocus={() => setMassText(String(massFromServings(food, servings)))}
        onBlur={() => setMassText(null)}
        onChangeText={(value) => {
          setMassText(value);
          const parsed = Number(value.replace(',', '.'));
          if (Number.isFinite(parsed) && parsed > 0) setServings(servingsFromMass(food, parsed));
        }}
        keyboardType="decimal-pad"
        style={styles.massInput}
        accessibilityLabel={massUnit === 'ml' ? '毫升' : '克数'}
      />
      <Text style={styles.massUnit}>{massUnit === 'ml' ? '毫升' : '克'}</Text>
      <Text style={styles.shareHint}>约 {servings} 份</Text>
    </View>
    <View style={styles.chips}>{[0.5, 1, 1.5, 2].map((value) => <Pressable key={value} onPress={() => { setMassText(null); setServings(value); }} style={[styles.chip, servings === value && styles.chipActive]}><Text style={[styles.chipText, servings === value && styles.chipTextActive]}>{value} 份</Text></Pressable>)}</View>
    </View>

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

    <Card><View style={styles.sourceHeader}><Text style={styles.sectionLabel}>营养成分</Text><Pressable onPress={() => setPer100((value) => !value)}><Text style={styles.sourceLabel}>{per100 ? (massUnit === 'ml' ? '每100ml' : '每100g') : '当前份量'}</Text></Pressable></View>
      <Text style={styles.shareHint}>{formatEnergyPair(displayNutrients.energyKcal)}</Text>
      <View style={styles.nutrientGrid}>
        {([
          ['能量 kJ', displayNutrients.energyKcal == null ? null : displayNutrients.energyKcal * 4.184, ''],
          ['能量 kcal', displayNutrients.energyKcal, ''],
          ['蛋白质', displayNutrients.proteinG, 'g'],
          ['脂肪', displayNutrients.fatG, 'g'],
          ['饱和脂肪', displayNutrients.saturatedFatG, 'g'],
          ['碳水', displayNutrients.carbsG, 'g'],
          ['糖', displayNutrients.sugarG, 'g'],
          ['膳食纤维', displayNutrients.fibreG, 'g'],
          ['钠', displayNutrients.sodiumMg, 'mg'],
        ] as const).map(([label, value, unit]) => <View key={label} style={styles.nutrient}><Text style={styles.nutrientLabel}>{label}</Text><Text style={styles.nutrientValue}>{value == null ? '暂无数据' : <>{formatNumber(value, label.includes('能量') ? 0 : 1)}{unit ? <Text style={styles.nutrientUnit}>{` ${unit}`}</Text> : null}</>}</Text></View>)}
      </View>
      <Text style={styles.sourceDate}>{displaySourceLabel(food.source)} · {regionLabels[food.source.region]} · 更新 {food.source.updatedAt}</Text>
    </Card>
    {(food.source.confidence === 'estimate' || showOil) && <Text style={styles.estimateNote}>这是个人摄入估算，不是整盘菜热量。用油、酱汁和实际夹取量都会改变结果。</Text>}
    {status !== 'unseen' && <TextButton label={status === 'verified' ? '取消本机核对' : '标记为已核对（本机确认，不是官方审核）'} onPress={() => toggleVerified(food.id)} />}
    <PrimaryButton label={replaceEntryId ? `替换为${mealLabels[meal]}` : `添加到${mealLabels[meal]}`} onPress={save} />
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
  massRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  massInput: { minHeight: 44, minWidth: 96, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, color: colors.ink, backgroundColor: colors.surface, fontSize: 16, fontWeight: '700' },
  massUnit: { color: colors.ink, fontSize: 14, fontWeight: '700' },
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
