import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, PrimaryButton, Screen } from '@/components/ui';
import { colors, radii, spacing } from '@/constants/theme';
import { useFoodRepository } from '@/data/food-repository-context';
import { usePersonalFoods } from '@/store/nutrition-store';

export default function ScanScreen() {
  const { dateKey } = useLocalSearchParams<{ dateKey?: string }>();
  const { customFoods } = usePersonalFoods();
  const foods = useFoodRepository();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [message, setMessage] = useState('');
  const locked = useRef(false);
  const date = Array.isArray(dateKey) ? dateKey[0] : dateKey;

  const lookup = (raw: string) => {
    const code = raw.replace(/\D/g, '');
    if (code.length < 8) {
      setMessage('请输入至少 8 位数字条码。');
      return;
    }
    const hit = foods.getByBarcode(code, customFoods);
    if (hit) {
      router.replace({ pathname: '/food/[id]', params: { id: hit.id, ...(date ? { dateKey: date } : {}) } });
      return;
    }
    router.replace({ pathname: '/custom-food', params: { barcode: code } });
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (locked.current) return;
    locked.current = true;
    lookup(data);
  };

  const showCamera = Platform.OS !== 'web' && permission?.granted;

  return <Screen>
    <View><Text style={styles.title}>扫描条码</Text><Text style={styles.subtitle}>只在本机目录查找。找不到时可以按包装标签创建自定义食品。</Text></View>
    {Platform.OS !== 'web' && !permission?.granted ? (
      <Card>
        <Text style={styles.body}>扫描需要相机权限，只用于读取包装条码。</Text>
        <PrimaryButton label={permission?.canAskAgain === false ? '请在系统设置中打开相机' : '允许使用相机'} onPress={() => { void requestPermission(); }} />
      </Card>
    ) : null}
    {showCamera ? (
      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
      </View>
    ) : null}
    <Card>
      <Text style={styles.label}>手动输入条码</Text>
      <TextInput
        value={manual}
        onChangeText={setManual}
        placeholder="例如 9300652010794"
        placeholderTextColor={colors.inkMuted}
        keyboardType="number-pad"
        style={styles.input}
        autoCapitalize="none"
        onSubmitEditing={() => lookup(manual)}
      />
      <Pressable onPress={() => lookup(manual)} style={styles.lookup}><Text style={styles.lookupText}>查找</Text></Pressable>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 5, lineHeight: 19 },
  body: { color: colors.ink, fontSize: 14, lineHeight: 22, marginBottom: spacing.md },
  cameraWrap: { height: 280, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.ink },
  camera: { flex: 1 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700', marginBottom: spacing.sm },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, color: colors.ink, backgroundColor: colors.surfaceMuted },
  lookup: { marginTop: spacing.md, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  lookupText: { color: colors.brand, fontSize: 15, fontWeight: '800' },
  message: { color: colors.red, fontSize: 12, marginTop: spacing.sm },
});
