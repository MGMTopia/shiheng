import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, PrimaryButton, Screen } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { validateFoodDraft } from '@/domain/food-validation';
import { useNutrition } from '@/store/nutrition-store';
import type { CustomFoodDraft, FoodCategory } from '@/types/nutrition';

const categories: { id: FoodCategory; label: string }[] = [
  { id: 'staple', label: '主食' }, { id: 'protein', label: '蛋白质' }, { id: 'vegetable', label: '蔬菜' },
  { id: 'fruit', label: '水果' }, { id: 'dairy', label: '奶类' }, { id: 'mixed', label: '混合餐' }, { id: 'snack', label: '零食' },
];

const initial = {
  nameZh: '', nameEn: '', servingLabel: '1 份', servingGrams: '100', energyKcal: '', proteinG: '', carbsG: '', fatG: '', fibreG: '', sodiumMg: '', saturatedFatG: '', sugarG: '', brand: '', barcode: '',
};

function numeric(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export default function CustomFoodScreen() {
  const { createCustomFood } = useNutrition();
  const [form, setForm] = useState(initial);
  const [category, setCategory] = useState<FoodCategory>('mixed');
  const [error, setError] = useState('');
  const set = (key: keyof typeof initial, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const canSave = useMemo(() => form.nameZh.trim().length > 0 && numeric(form.servingGrams) > 0 && form.energyKcal.trim().length > 0, [form]);

  const save = () => {
    if (!canSave) {
      setError('请至少填写食品名称、份量克数和能量。');
      return;
    }
    const optional = (value: string) => value.trim() === '' ? null : numeric(value);
    const draft: CustomFoodDraft = {
      nameZh: form.nameZh.trim(), nameEn: form.nameEn.trim() || form.nameZh.trim(), aliases: form.barcode.trim() ? [form.barcode.trim()] : [], category,
      servingLabel: form.servingLabel.trim() || '1 份', servingGrams: numeric(form.servingGrams), tags: ['custom'],
      brand: form.brand.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      nutrientsPer100g: {
        energyKcal: numeric(form.energyKcal),
        proteinG: optional(form.proteinG),
        carbsG: optional(form.carbsG),
        fatG: optional(form.fatG),
        fibreG: optional(form.fibreG),
        sodiumMg: optional(form.sodiumMg),
        saturatedFatG: optional(form.saturatedFatG),
        sugarG: optional(form.sugarG),
      },
    };
    const validation = validateFoodDraft(draft);
    if (!validation.valid) {
      setError(validation.errors.join(' '));
      return;
    }
    createCustomFood({
      nameZh: validation.food.nameZh, nameEn: validation.food.nameEn,
      aliases: [...new Set([
        ...validation.food.aliases,
        ...(draft.brand ? [draft.brand] : []),
        ...(draft.barcode ? [draft.barcode] : []),
      ])],
      category: validation.food.category,
      servingLabel: validation.food.servingLabel, servingGrams: validation.food.servingGrams, nutrientsPer100g: validation.food.nutrientsPer100g, tags: validation.food.tags,
      brand: draft.brand, barcode: draft.barcode,
    });
    router.back();
  };

  return <Screen>
    <View style={styles.heading}><Text style={styles.title}>创建自定义食品</Text><Text style={styles.subtitle}>数据只保存在本机，营养值请以包装或可靠来源为准。</Text></View>
    <Card style={styles.form}>
      <Field label="中文名称 *" value={form.nameZh} onChangeText={(value) => set('nameZh', value)} placeholder="例如：自制牛肉饭" />
      <Field label="英文名称" value={form.nameEn} onChangeText={(value) => set('nameEn', value)} placeholder="选填" />
      <View style={styles.twoColumns}><View style={styles.column}><Field label="每份名称" value={form.servingLabel} onChangeText={(value) => set('servingLabel', value)} placeholder="1 份" /></View><View style={styles.column}><Field label="每份克数 *" value={form.servingGrams} onChangeText={(value) => set('servingGrams', value)} placeholder="100" keyboardType="decimal-pad" /></View></View>
      <Text style={styles.label}>分类</Text><View style={styles.chips}>{categories.map((item) => <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.chipActive]}><Text style={[styles.chipText, category === item.id && styles.chipTextActive]}>{item.label}</Text></Pressable>)}</View>
      <Field label="品牌" value={form.brand} onChangeText={(value) => set('brand', value)} placeholder="选填，例如 Coles" />
      <Field label="条码" value={form.barcode} onChangeText={(value) => set('barcode', value)} placeholder="选填 GTIN" keyboardType="decimal-pad" />
      <Text style={styles.label}>每 100g 营养值</Text>
      <Text style={styles.hint}>空着的营养素会显示为“暂无数据”，不会当成 0。</Text>
      <View style={styles.twoColumns}><View style={styles.column}><Field label="能量 kcal *" value={form.energyKcal} onChangeText={(value) => set('energyKcal', value)} placeholder="必填" keyboardType="decimal-pad" /><Field label="蛋白质 g" value={form.proteinG} onChangeText={(value) => set('proteinG', value)} placeholder="暂无数据" keyboardType="decimal-pad" /><Field label="碳水 g" value={form.carbsG} onChangeText={(value) => set('carbsG', value)} placeholder="暂无数据" keyboardType="decimal-pad" /><Field label="糖 g" value={form.sugarG} onChangeText={(value) => set('sugarG', value)} placeholder="暂无数据" keyboardType="decimal-pad" /></View><View style={styles.column}><Field label="脂肪 g" value={form.fatG} onChangeText={(value) => set('fatG', value)} placeholder="暂无数据" keyboardType="decimal-pad" /><Field label="饱和脂肪 g" value={form.saturatedFatG} onChangeText={(value) => set('saturatedFatG', value)} placeholder="暂无数据" keyboardType="decimal-pad" /><Field label="纤维 g" value={form.fibreG} onChangeText={(value) => set('fibreG', value)} placeholder="暂无数据" keyboardType="decimal-pad" /><Field label="钠 mg" value={form.sodiumMg} onChangeText={(value) => set('sodiumMg', value)} placeholder="暂无数据" keyboardType="decimal-pad" /></View></View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="保存到本机" onPress={save} disabled={!canSave} />
    </Card>
  </Screen>;
}

function Field({ label, ...props }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad' }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} style={styles.input} placeholderTextColor={colors.inkMuted} autoCapitalize="none" /></View>;
}

const styles = StyleSheet.create({
  heading: { gap: 5 }, title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 }, subtitle: { color: colors.inkMuted, fontSize: 13, lineHeight: 19 },
  form: { gap: spacing.md }, field: { gap: 6 }, label: { color: colors.ink, fontSize: 12, fontWeight: '700' }, hint: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 }, input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, color: colors.ink, backgroundColor: colors.surfaceMuted },
  twoColumns: { flexDirection: 'row', gap: spacing.md }, column: { flex: 1, gap: spacing.md }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }, chipActive: { backgroundColor: colors.brand, borderColor: colors.brand }, chipText: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' }, chipTextActive: { color: colors.white }, error: { color: colors.red, fontSize: 12 },
});
