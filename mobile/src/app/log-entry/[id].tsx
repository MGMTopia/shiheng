import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, PrimaryButton, Screen, TextButton } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useFoodRepository } from '@/data/food-repository-context';
import {
  dateKeyToRecordedAt, defaultPortionShare, displayFoodName, foodSupportsOilLevel, formatEnergyPair, localDateKey,
  mealLabels, oilLevelLabels, portionChoices, shiftDateKey,
} from '@/domain/nutrition';
import { useNutrition } from '@/store/nutrition-store';
import type { MealType, OilLevel } from '@/types/nutrition';

const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const oilLevels: OilLevel[] = ['light', 'normal', 'restaurant'];

export default function LogEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, customFoods, updateEntry, deleteEntry } = useNutrition();
  const foods = useFoodRepository();
  const entry = entries.find((item) => item.id === id);
  const foodIndex = foods.getByIds(entry ? [entry.foodId] : [], customFoods);
  const food = entry ? foodIndex[entry.foodId] : undefined;
  const [servings, setServings] = useState(entry?.servings ?? 1);
  const [meal, setMeal] = useState<MealType>(entry?.meal ?? 'lunch');
  const [dateKey, setDateKey] = useState(entry ? localDateKey(new Date(entry.recordedAt)) : localDateKey());
  const [oilLevel, setOilLevel] = useState<OilLevel>(entry?.oilLevel ?? 'normal');
  const [sharedWith, setSharedWith] = useState(entry?.sharedWith ?? 1);
  const [portionShare, setPortionShare] = useState(entry?.portionShare ?? 1);
  const showOil = food ? foodSupportsOilLevel(food) : false;
  const todayKey = localDateKey();

  const save = () => {
    if (!entry) return;
    updateEntry(entry.id, {
      servings,
      meal,
      recordedAt: dateKeyToRecordedAt(dateKey, new Date(entry.recordedAt)),
      oilLevel: showOil ? oilLevel : undefined,
      sharedWith,
      portionShare,
    });
    router.back();
  };

  if (!entry || !food) {
    return <Screen><Card><Text style={styles.missing}>找不到这条记录。</Text></Card></Screen>;
  }

  return <Screen>
    <View><Text style={styles.title}>修改记录</Text><Text style={styles.subtitle}>{displayFoodName(food)}</Text></View>
    <View style={styles.section}><Text style={styles.label}>日期</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setDateKey(shiftDateKey(dateKey, -1))} style={styles.step}><Text style={styles.stepText}>前一天</Text></Pressable>
        <Text style={styles.date}>{dateKey}{dateKey === todayKey ? ' · 今天' : dateKey < todayKey ? ' · 补记' : ''}</Text>
        <Pressable onPress={() => setDateKey(shiftDateKey(dateKey, 1))} style={styles.step}><Text style={styles.stepText}>后一天</Text></Pressable>
      </View>
    </View>
    <View style={styles.section}><Text style={styles.label}>份量</Text>
      <View style={styles.row}>
        <Pressable onPress={() => setServings((value) => Math.max(0.5, value - 0.5))} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable>
        <Text style={styles.date}>{servings} × {food.servingLabel}</Text>
        <Pressable onPress={() => setServings((value) => Math.min(5, value + 0.5))} style={styles.step}><Text style={styles.stepText}>＋</Text></Pressable>
      </View>
    </View>
    {showOil ? <View style={styles.section}><Text style={styles.label}>用油</Text><View style={styles.chips}>{oilLevels.map((level) => <Pressable key={level} onPress={() => setOilLevel(level)} style={[styles.chip, oilLevel === level && styles.chipActive]}><Text style={[styles.chipText, oilLevel === level && styles.chipTextActive]}>{oilLevelLabels[level]}</Text></Pressable>)}</View></View> : null}
    <View style={styles.section}><Text style={styles.label}>合菜</Text>
      <View style={styles.row}>
        <Pressable onPress={() => { const people = Math.max(1, sharedWith - 1); setSharedWith(people); setPortionShare(defaultPortionShare(people)); }} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable>
        <Text style={styles.date}>{sharedWith} 人</Text>
        <Pressable onPress={() => { const people = Math.min(8, sharedWith + 1); setSharedWith(people); setPortionShare(defaultPortionShare(people)); }} style={styles.step}><Text style={styles.stepText}>＋</Text></Pressable>
      </View>
      <View style={styles.chips}>{portionChoices.map((choice) => <Pressable key={choice.label} onPress={() => setPortionShare(choice.value)} style={[styles.chip, Math.abs(portionShare - choice.value) < 0.02 && styles.chipActive]}><Text style={[styles.chipText, Math.abs(portionShare - choice.value) < 0.02 && styles.chipTextActive]}>{choice.label}</Text></Pressable>)}</View>
    </View>
    <View style={styles.section}><Text style={styles.label}>餐次</Text><View style={styles.chips}>{meals.map((item) => <Pressable key={item} onPress={() => setMeal(item)} style={[styles.chip, meal === item && styles.chipActive]}><Text style={[styles.chipText, meal === item && styles.chipTextActive]}>{mealLabels[item]}</Text></Pressable>)}</View></View>
    <Text style={styles.hint}>{formatEnergyPair(food.nutrientsPer100g.energyKcal)} / 100g。更换食物可返回搜索后重新添加，再删除这条。</Text>
    <PrimaryButton label="保存修改" onPress={save} />
    <TextButton label="删除这条" tone="danger" onPress={() => { deleteEntry(entry.id); router.back(); }} />
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800' }, subtitle: { color: colors.inkMuted, fontSize: 14, marginTop: 4 },
  section: { gap: spacing.sm }, label: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  date: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  step: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.brandSoft },
  stepText: { color: colors.brand, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' }, chipTextActive: { color: colors.white },
  hint: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 }, missing: { color: colors.red, textAlign: 'center' },
});
